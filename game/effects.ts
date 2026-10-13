import type { createEvents } from './events';
import { FEEL } from './feel';
import { sfx, vibrate } from './sfx';

/** 진행 신호에 소리·떨림을 붙인다. 여기서는 진행을 바꾸는 명령을 보내지 않는다. */
export function attachEffects(bus: ReturnType<typeof createEvents>) {
  return bus.subscribe(event => {
    if (event.type === 'resident.approached') sfx.meet();
    if (event.type === 'question.answered') { sfx.answer(event.level); vibrate(FEEL.vibrateMs[event.level] ?? 0); }
  });
}
