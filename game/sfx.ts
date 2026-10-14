/*
  효과음 — 파일 없이 합성하는 작고 둥근 소리. 이름과 호출 시점은 그대로 둔다.
  소리는 첫 터치(「출발」) 뒤에만 난다(브라우저 규칙).
*/
let ctx: AudioContext | undefined;
let muted = false;
try { muted = localStorage.getItem('budget-game-muted') === '1'; } catch { /* 저장소가 막힌 창 */ }

export function unlockAudio() {
  try { ctx ??= new AudioContext(); void ctx.resume(); } catch { ctx = undefined; }
}
export const isMuted = () => muted;
export function setMuted(value: boolean) {
  muted = value;
  try { localStorage.setItem('budget-game-muted', value ? '1' : '0'); } catch { /* 무시 */ }
}

function tone(freq: number, dur: number, { type = 'sine' as OscillatorType, gain = 0.1, slide = 0, delay = 0 } = {}) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const at = ctx.currentTime + delay;
  const osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), at + dur);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.onended = () => { osc.disconnect(); amp.disconnect(); };
  osc.start(at); osc.stop(at + dur + 0.02);
}

export const sfx = {
  bubble: (i = 0) => tone(580 + i * 70, 0.105, { slide: 130, gain: 0.055 }),
  meet: () => { tone(660, 0.13, { gain: 0.065, slide: 100 }); tone(880, 0.16, { gain: 0.035, delay: 0.07 }); },
  answer: (level: number) => [523, 659, 784, 1047].slice(0, level + 2).forEach((f, i) => tone(f, 0.2, { delay: i * 0.075, gain: 0.065 })),
  door: () => { tone(294, 0.13, { type: 'triangle', gain: 0.035 }); tone(440, 0.19, { gain: 0.045, delay: 0.09 }); },
  whoosh: () => tone(420, 0.3, { slide: -260, gain: 0.05 }),
  flutter: () => { for (let i = 0; i < 6; i++) tone(600 + (i % 2) * 140, 0.045, { type: 'triangle', gain: 0.02, delay: i * 0.04 }); },
  kick: () => tone(190, 0.12, { slide: -95, gain: 0.12 }),
  meow: () => { tone(620, 0.14, { type: 'triangle', slide: 210, gain: 0.045 }); tone(830, 0.27, { slide: -400, gain: 0.055, delay: 0.11 }); },
  /** 빛 아치 — 생길 때는 짧게 반짝, 들어갈 때는 위로 쓸려 올라가는 소리. */
  portal: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.22, { delay: i * 0.06, gain: 0.04 })),
  warp: () => { tone(330, 0.55, { slide: 900, gain: 0.05 }); [1047, 1319, 1568].forEach((f, i) => tone(f, 0.25, { delay: 0.25 + i * 0.07, gain: 0.035 })); },
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, { delay: i * 0.13, gain: 0.065 })),
};

export function vibrate(ms: number) {
  try { navigator.vibrate?.(ms); } catch { /* 지원 안 하는 기기 */ }
}
