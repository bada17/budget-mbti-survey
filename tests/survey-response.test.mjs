import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResponseMeta,
  shouldSwapSurveyOptions,
} from "../app/survey-response.ts";

/*
  선택지 좌우 뒤집기는 저장 API와 짝을 이룹니다.

  서버는 "화면에 보인 순서"와 "그 순서대로 누른 점수"가 저장된 응답과 앞뒤가
  맞는지 되짚어 검증합니다. 그래서 이 계산이 조용히 바뀌면 화면은 멀쩡한데
  저장만 전부 거부되는, 찾기 어려운 고장이 납니다.
*/

const question = (id, axis = "future") => ({
  id,
  kind: "anchor",
  fieldId: null,
  axis,
  prompt: "질문",
  optionA: { text: "왼쪽", group: null, score: -2 },
  optionB: { text: "오른쪽", group: null, score: 2 },
  discrimination: 5,
});

test("같은 사람에게는 순서가 늘 같고, 사람마다는 갈린다", () => {
  assert.equal(
    shouldSwapSurveyOptions("세션-가", "ANC-F1"),
    shouldSwapSurveyOptions("세션-가", "ANC-F1"),
    "새로고침할 때마다 순서가 바뀌면 앞서 누른 답이 뒤집힙니다",
  );

  const sessions = Array.from({ length: 200 }, (_, index) => `세션-${index}`);
  const swapped = sessions.filter((session) =>
    shouldSwapSurveyOptions(session, "ANC-F1"),
  ).length;
  assert.ok(
    swapped > 40 && swapped < 160,
    `한쪽으로 쏠리면 좌우를 섞는 의미가 없습니다 (200명 중 ${swapped}명 뒤집힘)`,
  );
});

test("뒤집힌 문항은 화면 점수와 저장 점수가 서로 뒤집혀 있다", () => {
  const questions = [question("ANC-F1"), question("ANC-G1", "growth")];
  const answers = { "ANC-F1": 2, "ANC-G1": 5 };
  const meta = buildResponseMeta({
    questions,
    answers,
    timing: {},
    sessionId: "세션-가",
  });

  for (const item of questions) {
    const swapped = shouldSwapSurveyOptions("세션-가", item.id);
    const entry = meta[item.id];
    assert.equal(entry.displayOrder, swapped ? "BA" : "AB");
    assert.equal(
      entry.displayResponse,
      swapped ? 7 - answers[item.id] : answers[item.id],
    );
    assert.ok(entry.displayResponse >= 1 && entry.displayResponse <= 6);
  }
});

test("답하지 않은 문항은 담기지 않는다", () => {
  const meta = buildResponseMeta({
    questions: [question("ANC-F1"), question("ANC-F2")],
    answers: { "ANC-F1": 3 },
    timing: {},
    sessionId: "세션-가",
  });
  assert.deepEqual(Object.keys(meta), ["ANC-F1"]);
});

test("응답 시간은 문항이 보인 뒤 답하기까지로 잰다", () => {
  const meta = buildResponseMeta({
    questions: [question("ANC-F1"), question("ANC-F2")],
    answers: { "ANC-F1": 3, "ANC-F2": 4 },
    timing: {
      "ANC-F1": { firstVisibleAt: 1_000, firstAnsweredAt: 4_500 },
      // 보이기만 하고 답한 시각이 없으면 0으로 둡니다(잰 적 없음).
      "ANC-F2": { firstVisibleAt: 1_000 },
    },
    sessionId: "세션-가",
  });
  assert.equal(meta["ANC-F1"].responseTimeMs, 3_500);
  assert.equal(meta["ANC-F2"].responseTimeMs, 0);
});

test("축이 얼마나 기울었는지 세 단계로 가른다", async () => {
  const { readAxisStrength, CLEAR_SCORE, LEANING_SCORE } = await import(
    "../app/survey-response.ts"
  );

  assert.equal(readAxisStrength(0), "even");
  assert.equal(readAxisStrength(LEANING_SCORE - 0.1), "even");
  assert.equal(readAxisStrength(LEANING_SCORE), "leaning");
  assert.equal(readAxisStrength(CLEAR_SCORE), "clear");
  assert.equal(readAxisStrength(100), "clear");

  // 어느 쪽으로 기울었는지는 여기서 보지 않습니다. 거리만 봅니다.
  assert.equal(readAxisStrength(-CLEAR_SCORE), "clear");
  assert.equal(readAxisStrength(-LEANING_SCORE), "leaning");
});

/*
  기준을 올려 두면 화면이 사실상 한 가지 말만 하게 됩니다. 옛 기준(65)에서는
  무작위로 답한 응답 중 0.1%만 "선명하다"에 닿았습니다.
*/
test("한쪽으로 꾸준히 답한 사람은 뚜렷하다고 나온다", async () => {
  const { readAxisStrength } = await import("../app/survey-response.ts");
  // 6점 척도에서 5~6쪽으로만 답하면 축 점수가 60~100 사이에 놓입니다.
  assert.equal(readAxisStrength(60), "clear");
  // 반대로 3~4를 오가면 가운데에 머뭅니다.
  assert.equal(readAxisStrength(10), "even");
});
