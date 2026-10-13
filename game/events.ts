import type { TypeCode } from './content';
import type { DisplaySide } from './response';

export type GameEvent = Readonly<
  | { type: 'journey.started'; sessionId: string; contentVersion: string; at: number }
  | { type: 'stage.entered'; stageId: number; area: string }
  | { type: 'question.visible'; questionId: string; stageId: number; at: number }
  | { type: 'resident.approached' | 'resident.left'; questionId: string; displaySide: DisplaySide }
  | { type: 'question.answered'; questionId: string; stageId: number; displaySide: DisplaySide; level: number; at: number }
  | { type: 'stage.completed'; stageId: number; answeredCount: number; at: number }
  | { type: 'journey.arrived'; typeCode: TypeCode; at: number }
  | { type: 'journey.paused' | 'journey.resumed'; reason: string; at: number }
>;

/** Effects cannot cancel a committed answer. A broken listener is reported and isolated. */
export function createEvents(onError: (error: unknown) => void = console.error) {
  const listeners = new Set<(event: GameEvent) => void>();
  return {
    subscribe(listener: (event: GameEvent) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    emit(events: GameEvent[]) {
      for (const event of events) for (const listener of [...listeners]) {
        try { listener(Object.freeze(event)); } catch (error) { onError(error); }
      }
    },
    clear() { listeners.clear(); },
  };
}
