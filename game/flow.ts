import { ROUTE, CONTENT_VERSION, REPLIES, type TypeCode } from './content';
import { scoreAnswers, typeCode, type Answers } from './score';
import { orderedQuestions, answerFor, type DisplaySide } from './response';
import type { SurveyTiming } from '../app/survey-response';
import type { GameEvent } from './events';

export type JourneyState = {
  phase: 'intro' | 'walking' | 'question' | 'reply' | 'arrived';
  sessionId: string; startedAt: number; lastAt: number; completedAt?: number;
  stageIndex: number; questionIndex: number; paused: boolean;
  candidate?: DisplaySide; answers: Answers; timing: SurveyTiming; result?: TypeCode;
};
export type Command = (
  | { type: 'start' | 'pause' | 'resume' | 'leave' }
  | { type: 'visible'; questionId: string }
  | { type: 'approach'; questionId: string; side: DisplaySide }
  | { type: 'answer'; questionId: string; level: number }
  | { type: 'exit'; stageIndex: number }
) & { at: number };

export function createJourney(sessionId: string, at: number): JourneyState {
  if (!sessionId || !Number.isFinite(at) || at <= 0) throw new Error('Invalid session');
  return { phase: 'intro', sessionId, startedAt: at, lastAt: at, stageIndex: 0, questionIndex: 0, paused: false, answers: {}, timing: {} };
}

export function currentQuestion(state: JourneyState) {
  const id = ROUTE[state.stageIndex]?.ids[state.questionIndex];
  return orderedQuestions.find(question => question.id === id);
}

export function transition(state: JourneyState, command: Command): { state: JourneyState; events: GameEvent[] } {
  const unchanged = { state, events: [] as GameEvent[] };
  const { at } = command;
  if (!Number.isFinite(at) || at < state.lastAt || state.phase === 'arrived') return unchanged;
  const finish = (patch: Partial<JourneyState>, events: GameEvent[]) => ({ state: { ...state, ...patch, lastAt: at }, events });
  if (command.type === 'pause' || command.type === 'resume') {
    const paused = command.type === 'pause';
    return state.paused === paused ? unchanged : finish({ paused }, [{ type: paused ? 'journey.paused' : 'journey.resumed', reason: 'visibility-or-focus', at }]);
  }
  if (state.paused) return unchanged;
  if (command.type === 'start') {
    return state.phase !== 'intro' ? unchanged : finish({ phase: 'walking', startedAt: at }, [
      { type: 'journey.started', sessionId: state.sessionId, contentVersion: CONTENT_VERSION, at },
      { type: 'stage.entered', stageId: ROUTE[0].stage, area: ROUTE[0].area },
    ]);
  }
  if (state.phase === 'intro') return unchanged;
  if (command.type === 'exit') {
    const stage = ROUTE[state.stageIndex];
    if (command.stageIndex !== state.stageIndex || state.questionIndex !== stage.ids.length || !stage.ids.every(id => state.answers[id] !== undefined)) return unchanged;
    const events: GameEvent[] = [{ type: 'stage.completed', stageId: stage.stage, answeredCount: Object.keys(state.answers).length, at }];
    if (state.stageIndex === ROUTE.length - 1) {
      if (!orderedQuestions.every(q => state.answers[q.id] !== undefined)) return unchanged;
      const result = typeCode(scoreAnswers(orderedQuestions, state.answers));
      return finish({ phase: 'arrived', result, completedAt: at }, [...events, { type: 'journey.arrived', typeCode: result, at }]);
    }
    const next = ROUTE[state.stageIndex + 1];
    return finish({ stageIndex: state.stageIndex + 1, questionIndex: 0, phase: 'walking', candidate: undefined }, [...events, { type: 'stage.entered', stageId: next.stage, area: next.area }]);
  }
  const question = currentQuestion(state);
  if (!question) return unchanged;
  if ('questionId' in command && command.questionId !== question.id) return unchanged;
  if (command.type === 'visible' && state.phase === 'walking') {
    return finish({ phase: 'question', timing: { ...state.timing, [question.id]: { firstVisibleAt: at } } }, [
      { type: 'question.visible', questionId: question.id, stageId: ROUTE[state.stageIndex].stage, at },
    ]);
  }
  if (command.type === 'approach' && state.phase === 'question' && ['left', 'right'].includes(command.side)) {
    return finish({ phase: 'reply', candidate: command.side }, [{ type: 'resident.approached', questionId: question.id, displaySide: command.side }]);
  }
  if (command.type === 'leave' && state.phase === 'reply' && state.candidate) {
    return finish({ phase: 'question', candidate: undefined }, [{ type: 'resident.left', questionId: question.id, displaySide: state.candidate }]);
  }
  if (command.type === 'answer' && state.phase === 'reply' && state.candidate && Number.isInteger(command.level) && REPLIES[command.level]) {
    if (state.answers[question.id] !== undefined || !state.timing[question.id]) return unchanged;
    return finish({
      phase: 'walking', questionIndex: state.questionIndex + 1, candidate: undefined,
      answers: { ...state.answers, [question.id]: answerFor(state.sessionId, question, state.candidate, command.level) },
      timing: { ...state.timing, [question.id]: { ...state.timing[question.id], firstAnsweredAt: at } },
    }, [{ type: 'question.answered', questionId: question.id, stageId: ROUTE[state.stageIndex].stage, displaySide: state.candidate, at }]);
  }
  return unchanged;
}
