import type { createEvents } from './events';
import type { GameUI } from './ui';
import { FEEL } from './feel';

/** Add sounds/tweens here. Never dispatch progress commands from this listener. */
export function attachEffects(bus: ReturnType<typeof createEvents>, ui: GameUI) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = bus.subscribe(event => {
    if (!FEEL.effectsEnabled) return;
    if (event.type === 'question.answered') {
      clearTimeout(timeout);
      ui.feedback.textContent = '마음을 전했어요. 다음 이웃을 만나러 가요.';
      timeout = setTimeout(() => { ui.feedback.textContent = ''; }, FEEL.replyFeedbackMs);
    }
  });
  return () => { unsubscribe(); clearTimeout(timeout); };
}
