import { COMMON_QUESTIONS, FIELD_QUESTIONS, ROUTE, REPLIES, CONTENT_VERSION, type Question } from './content';
import { buildResponseMeta, shouldSwapSurveyOptions, type SurveyTiming } from '../app/survey-response';
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
