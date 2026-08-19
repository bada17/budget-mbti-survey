import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) =>
  readFileSync(resolve(root, path), "utf8").replaceAll("\r\n", "\n");
/*
  해시를 내기 전에 줄바꿈을 맞춥니다.

  윈도우에서 저장소를 받으면 git이 줄바꿈을 CRLF로 바꿔 놓습니다. 내용은 한
  글자도 다르지 않은데 파일을 통째로 바이트로 읽어 해시를 내면 값이 달라져,
  멀쩡한 파일이 "원본과 다르다"고 걸립니다. 실제로 이 검사는 윈도우에서 첫
  항목부터 실패했습니다. read()가 쓰는 것과 같은 기준으로 맞춰 둡니다.
*/
const digest = (path) =>
  createHash("sha256").update(read(path), "utf8").digest("hex").toUpperCase();

function sliceBetween(text, start, end) {
  const startIndex = text.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = end ? text.indexOf(end, startIndex) : text.length;
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return text.slice(startIndex, endIndex).trim();
}

assert.equal(
  digest("app/survey-v3-data.ts"),
  "AB09E0F478B532AB975E9F10E616CFD69AA5DF66252D01A7B2F3ECE75458E1D7",
  "survey-v3-data.ts changed from the handoff base",
);
assert.equal(
  digest("app/scoring.ts"),
  "BA6ED25C71A3FE1BA0BA09EAD4C9BDEA73F3C3FF3968F779E025AE9A73EC7FC8",
  "scoring.ts changed from the handoff base",
);
assert.equal(
  digest("handoff/locked/api-responses-route.ts.txt"),
  "83679128D8B57CB592B69760457505559AE664FCB4A534745412AC213DB5B8CB",
  "locked /api/responses source changed",
);

const questionCount = (read("app/survey-v3-data.ts").match(/^\s+"id":/gm) ?? [])
  .length;
assert.equal(questionCount, 99, "survey question count must remain 99");

const sourceBudgetData = read("handoff/locked/budget-data.ts.txt");
const targetBudgetData = read("app/budget-data.ts");
assert.equal(
  sliceBetween(sourceBudgetData, "export const TYPE_MAP", "export const formatWon"),
  sliceBetween(targetBudgetData, "export const TYPE_MAP"),
  "TYPE_MAP or AXES changed during extraction",
);

const sourceExperience = read("handoff/locked/experience-data.ts.txt");
const targetExperience = read("app/experience-data.ts");
assert.equal(
  sliceBetween(sourceExperience, "export const TYPE_HIGHLIGHTS", "const SIGNAL_LABELS"),
  sliceBetween(targetExperience, "export const TYPE_HIGHLIGHTS"),
  "TYPE_HIGHLIGHTS changed during extraction",
);

const sourceSchema = read("handoff/locked/schema.ts.txt");
const targetSchema = read("db/schema.ts");
assert.equal(
  sliceBetween(sourceSchema, "export const responses", "export const budgetProposals"),
  sliceBetween(targetSchema, "export const responses", "export const validationResponses"),
  "responses schema changed during extraction",
);
assert.equal(
  sliceBetween(sourceSchema, "export const validationResponses", "export const events"),
  sliceBetween(targetSchema, "export const validationResponses"),
  "validation_responses schema changed during extraction",
);

/*
  떼어 온 5·6부 JSX는 `handoff/extracted-step5-step6.tsx.txt`에 그대로 둡니다.

  원래는 `app/BudgetGame.tsx`였는데, 그 파일은 화면이 쓰는 부품(선택지를
  뒤집는 함수, 분야 이름표 등)이 빠진 조각이라 그대로는 컴파일되지 않습니다.
  그래서 타입 검사에서 파일 하나를 통째로 빼 두는 설정이 붙어 있었습니다.
  검사에서 빼는 대신 실행 대상 밖으로 옮겼습니다. 내용은 한 글자도 바꾸지
  않았고, 아래 대조도 계속 돕니다. 실제로 돌아가는 화면은 SurveyApp.tsx에
  새로 짰습니다.
*/
const sourceBudgetGame = read("handoff/locked/BudgetGame.tsx.txt");
const targetBudgetGame = read("handoff/extracted-step5-step6.tsx.txt");
assert.equal(
  sliceBetween(sourceBudgetGame, "function SurveyQuestionCard", "type BudgetCatalogResult"),
  sliceBetween(targetBudgetGame, "function SurveyQuestionCard", "export default function BudgetGame"),
  "SurveyQuestionCard changed during extraction",
);
assert.equal(
  sliceBetween(sourceBudgetGame, "      {step === 5 && (", "\n\n      {fieldGuideRevealed"),
  sliceBetween(targetBudgetGame, "      {step === 5 && (", "\n    </main>"),
  "step 5/6 JSX changed during extraction",
);

console.log("Verified: 99 questions, locked source hashes, JSX, constants, and D1 schemas.");
