import { AXES, COMMON_QUESTIONS, FIELD_QUESTIONS, ROUTE, REPLIES, CONTENT_VERSION, type Question } from './content';
import { buildResponseMeta, shouldSwapSurveyOptions, type SurveyTiming } from './survey-response';
import type { Answers } from './score';

export type DisplaySide = 'left' | 'right';
const byId = new Map([...COMMON_QUESTIONS, ...FIELD_QUESTIONS].map(q => [q.id, q]));
export const orderedQuestions = ROUTE.flatMap(stage => stage.ids.map(id => {
  const question = byId.get(id);
  if (!question) throw new Error(`Unknown route question: ${id}`);
  return question;
}));

export function displayOptions(sessionId: string, question: Question) {
  const keys: ('a' | 'b')[] = shouldSwapSurveyOptions(sessionId, question.id) ? ['b', 'a'] : ['a', 'b'];
  return keys.map((key, index) => ({ key, side: (index === 0 ? 'left' : 'right') as DisplaySide, ...question[key] }));
}

/**
 * 「왜 이 유형?」(사용자 10-19 「내가 이래서 이런 걸 골랐고 이런 결과가 나왔구나」) — 축마다 내 다섯 선택이 어느 쪽으로 얼마나 당겼나.
 * 판정은 score.ts 그대로 — 여기선 답(1~6)을 읽어 쪽(a=왼쪽, b=오른쪽)과 세기(0 조금·1 많이·2 훨씬, REPLIES 차례)로 풀어 줄 뿐이다.
 * 숫자(칸·점수)는 내지 않는다(사용자 「숫자 없이 방향만」). close = 반반 근처 — 축 점수가 한 칸(4점) 안이면 하나만 반대로 골랐어도 뒤집힌다.
 */
export function pullsOf(answers: Answers, scores: Record<string, number>) {
  return AXES.map(axis => ({
    axis, right: scores[axis.key] > 0, close: Math.abs(scores[axis.key]) <= 4,
    pulls: orderedQuestions.filter(q => q.axis === axis.key && answers[q.id]).map(question => {
      const value = answers[question.id], key = value <= 3 ? 'a' as const : 'b' as const;
      return { question, key, level: key === 'a' ? 3 - value : value - 4 };
    }),
  }));
}

export function answerFor(sessionId: string, question: Question, side: DisplaySide, level: number) {
  if (!Number.isInteger(level) || !REPLIES[level] || !['left', 'right'].includes(side)) throw new RangeError('Invalid reply');
  const key = displayOptions(sessionId, question).find(option => option.side === side)!.key;
  return key === 'a' ? REPLIES[level].aValue : REPLIES[level].bValue;
}

export function buildGameResponse(state: {
  sessionId: string; startedAt: number; completedAt?: number; answers: Answers; timing: SurveyTiming;
}) {
  const answers = { ...state.answers };
  const timing = Object.fromEntries(Object.entries(state.timing).map(([id, entry]) => [id, { ...entry }]));
  // Legacy helper reads only id. A contract test fails if it starts using other v3 fields.
  // This assertion is isolated here; v4 scoring never uses v3 question types or axes.
  const questions = orderedQuestions.map(({ id }) => ({ id })) as Parameters<typeof buildResponseMeta>[0]['questions'];
  return {
    gameId: 'budget-tendency', contentVersion: CONTENT_VERSION,
    sessionId: state.sessionId, startedAt: state.startedAt, completedAt: state.completedAt,
    answers, timing, responseMeta: buildResponseMeta({ questions, answers, timing, sessionId: state.sessionId }),
  };
}

export type GameResponse = ReturnType<typeof buildGameResponse>;
