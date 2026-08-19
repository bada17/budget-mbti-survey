import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
  이 사이트는 모두에게 같은 문항을 냅니다.

  분야를 고르게 하던 옛 방식에서는 사람마다 문항이 달라 결과를 나란히 놓고
  볼 수 없었습니다. 아래 검사는 그 약속이 깨지지 않는지, 그리고 문항을
  갈아 끼우다 축 하나가 조용히 얇아지지 않는지를 지킵니다.

  소스를 직접 읽어서 봅니다. 이 저장소의 다른 검사(verify-extraction)와 같은
  방식인데, `.ts`를 그대로 불러오려면 확장자까지 적은 import로 바꿔야 하고
  그건 빌드 쪽 설정을 건드리는 일이라 검사 하나를 위해 하지 않았습니다.
*/

const readSource = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const SURVEY_QUESTIONS = JSON.parse(
  readSource("app/survey-v3-data.ts").match(
    /export const SURVEY_QUESTIONS[^=]*=\s*(\[[\s\S]*?\n\]);/,
  )[1],
);

const FIXED_IDS = [
  ...readSource("app/survey-selection.ts")
    .match(/FIXED_SURVEY_QUESTION_IDS = \[([\s\S]*?)\] as const;/)[1]
    .matchAll(/"([^"]+)"/g),
].map(([, id]) => id);

const questionById = new Map(
  SURVEY_QUESTIONS.map((question) => [question.id, question]),
);
const fixedQuestions = FIXED_IDS.map((id) => questionById.get(id));

test("문항 원본 99개는 그대로 남아 있다", () => {
  assert.equal(SURVEY_QUESTIONS.length, 99);
  const field = SURVEY_QUESTIONS.filter((q) => q.kind === "field").length;
  const anchor = SURVEY_QUESTIONS.filter((q) => q.kind === "anchor").length;
  assert.equal(field, 90, "분야 문항 90개(15분야 × 6)가 그대로여야 합니다");
  assert.equal(anchor, 9, "공통 문항 9개가 그대로여야 합니다");
});

test("고정 문항 15개가 모두 실제로 있는 문항이다", () => {
  assert.equal(FIXED_IDS.length, 15);
  assert.equal(new Set(FIXED_IDS).size, 15, "같은 문항을 두 번 넣지 않습니다");
  const missing = FIXED_IDS.filter((id) => !questionById.has(id));
  assert.deepEqual(missing, [], "원본에 없는 문항 id가 목록에 있습니다");
});

test("세 축에 5문항씩 고르게 걸린다", () => {
  const counts = { future: 0, growth: 0, universal: 0 };
  for (const question of fixedQuestions) counts[question.axis] += 1;
  assert.deepEqual(counts, { future: 5, growth: 5, universal: 5 });
});

test("공통 9문항이 모두 들어가고, 분야 문항은 서로 다른 분야에서 온다", () => {
  const anchors = fixedQuestions.filter((q) => q.kind === "anchor");
  assert.equal(anchors.length, 9);

  const fields = fixedQuestions
    .filter((q) => q.kind === "field")
    .map((q) => q.fieldId);
  assert.equal(fields.length, 6);
  assert.equal(
    new Set(fields).size,
    6,
    "같은 분야에서 두 문항을 뽑으면 그 분야에 답이 쏠립니다",
  );
});

test("고른 문항은 변별도가 낮지 않다", () => {
  const weak = fixedQuestions.filter((q) => q.discrimination < 4);
  assert.deepEqual(
    weak.map((q) => q.id),
    [],
    "변별도 4 미만 문항은 답이 갈리지 않아 판정을 흐립니다",
  );
});

test("분야를 고르게 하던 옛 방식도 지우지 않았다", () => {
  const source = readSource("app/survey-selection.ts");
  assert.match(source, /getSurveyQuestions/);
  assert.match(readSource("app/survey-v3-data.ts"), /export function getSurveyQuestions/);
});
