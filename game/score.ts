/*
  게임판 판정 — v3 와 같은 식을 v4 축에 씁니다.

  답은 문항마다 1~6 (1 = a 쪽으로 가장 강하게, 6 = b 쪽으로 가장 강하게, 가운데 없음).
  문항 점수 = -2 + (답-1)/5 × 4  → -2 ~ +2.
  축 점수 = 그 축 문항들의 무게(weight) 가중 평균 × 50 → -100 ~ +100.
  유형 코드 = hands·time·reach 순서로 점수가 0 보다 크면 "1", 아니면 "0".
  0 을 왼쪽으로 세는 것은 예산게임(budget-type.ts)과 같은 규칙입니다.
  (v3 설문은 0 을 오른쪽으로 셌습니다 — 게임판은 예산게임 쪽에 맞춥니다.)
*/
import { AXES, type AxisKey, type Question, type TypeCode } from "./content";

export type Answers = Record<string, number>;
export type AxisScores = Record<AxisKey, number>;

export function scoreAnswers(questions: Question[], answers: Answers): AxisScores {
  const out = { hands: 0, time: 0, reach: 0 } as AxisScores;
  for (const { key } of AXES) {
    let sum = 0, weights = 0;
    for (const q of questions) {
      const r = answers[q.id];
      if (q.axis !== key || r === undefined) continue;
      sum += (-2 + ((r - 1) / 5) * 4) * q.weight;
      weights += q.weight;
    }
    out[key] = weights ? Math.round((sum / weights) * 50 * 10) / 10 : 0;
  }
  return out;
}

export function typeCode(scores: AxisScores): TypeCode {
  return AXES.map(({ key }) => (scores[key] > 0 ? "1" : "0")).join("") as TypeCode;
}
