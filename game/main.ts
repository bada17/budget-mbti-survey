import './ui.css';
import { createJourney, transition, currentQuestion, type Command } from './flow';
import { buildGameResponse, type GameResponse } from './response';
import { createEvents } from './events';
import { MovementInput } from './input';
import { createUI } from './ui';
import { attachEffects } from './effects';
import type { JourneyScene } from './scenes/JourneyScene';

const root = document.querySelector<HTMLElement>('#game-root')!;
let state = createJourney(crypto.randomUUID(), Date.now());
let response: GameResponse | undefined;
let scene: JourneyScene | undefined;
let game: import('phaser').Game | undefined;
let pendingReveal: string | undefined;
let frame = 0;
const bus = createEvents();
const abort = new AbortController();
const ui = createUI(root, {
  start: () => { send({ type: 'start' }); ui.focusWorld(); },
  retry: () => { location.reload(); },
  reply: (questionId, level) => { send({ type: 'answer', questionId, level }); ui.focusWorld(); },
  leave: () => { scene?.releaseResident(); send({ type: 'leave' }); ui.focusWorld(); },
  approach: side => scene?.moveToResident(side),
});
const input = new MovementInput(ui.pad, () => !state.paused && ['walking', 'question'].includes(state.phase));
const stopEffects = attachEffects(bus, ui);

type UntimedCommand = Command extends infer T ? T extends { at: number } ? Omit<T, 'at'> : never : never;
function send(command: UntimedCommand) {
  const next = transition(state, { ...command, at: Math.max(Date.now(), state.lastAt) } as Command);
  if (next.state === state) return;
  state = next.state;
  if (state.phase === 'reply' || state.paused) input.reset();
  if (state.phase === 'arrived') response = buildGameResponse(state);
  ui.render(state);
  bus.emit(next.events);
}

function visible(id: string) {
  if (pendingReveal || document.hidden || state.paused || state.phase !== 'walking') return;
  pendingReveal = id;
  ui.render(state, id);
  // Two frames allow the HTML wishes to paint before the response clock begins.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      pendingReveal = undefined;
      if (!document.hidden && !state.paused && currentQuestion(state)?.id === id) send({ type: 'visible', questionId: id });
    });
  });
}

function pause() {
  cancelAnimationFrame(frame); pendingReveal = undefined; input.reset(); send({ type: 'pause' });
}
function resume() { if (!document.hidden) send({ type: 'resume' }); }
window.addEventListener('blur', pause, { signal: abort.signal });
window.addEventListener('focus', resume, { signal: abort.signal });
document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume(), { signal: abort.signal });
window.addEventListener('pagehide', pause, { signal: abort.signal });
window.addEventListener('pageshow', resume, { signal: abort.signal });
ui.render(state);

async function boot() {
  try {
    const [{ default: Phaser }, { BootScene }, { JourneyScene }] = await Promise.all([
      import('phaser'), import('./scenes/BootScene'), import('./scenes/JourneyScene'),
    ]);
    const runtime = { state: () => state, send: (command: Record<string, unknown>) => send(command as UntimedCommand), input, visible, onReady: () => ui.ready(), onError: () => ui.loadingError() };
    scene = new JourneyScene(runtime);
    game = new Phaser.Game({
      type: Phaser.AUTO, parent: 'game-canvas', backgroundColor: '#b5cda2',
      scale: { mode: Phaser.Scale.RESIZE, width: 360, height: 440 },
      render: { pixelArt: true, antialias: false, roundPixels: true },
      audio: { noAudio: true }, banner: false,
      scene: [new BootScene(runtime), scene],
    });
  } catch (error) { console.error(error); ui.loadingError(); }
}
void boot();

// Memory-only integration point for the future storage phase. Nothing is sent or persisted.
export function getPendingResponse() { return response ? structuredClone(response) : undefined; }

if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frame); abort.abort(); stopEffects(); bus.clear(); input.destroy(); game?.destroy(true); ui.destroy();
});
