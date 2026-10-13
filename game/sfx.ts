/*
  효과음 — 파일 없이 브라우저에서 바로 만든 임시 소리. 진짜 소리로 바꿀 때는 이 파일만 바꾼다.
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
  osc.start(at); osc.stop(at + dur + 0.02);
}

export const sfx = {
  bubble: (i = 0) => tone(520 + i * 140, 0.09, { type: 'triangle', slide: 260, gain: 0.07 }),
  meet: () => tone(700, 0.1, { type: 'triangle', slide: 300, gain: 0.09 }),
  answer: (level: number) => [523, 659, 784, 1047].slice(0, level + 2).forEach((f, i) => tone(f, 0.2, { type: 'triangle', delay: i * 0.07, gain: 0.09 })),
  door: () => { tone(196, 0.14, { type: 'square', gain: 0.03 }); tone(294, 0.16, { type: 'square', gain: 0.03, delay: 0.09 }); },
  whoosh: () => tone(420, 0.3, { slide: -260, gain: 0.05 }),
  flutter: () => { for (let i = 0; i < 6; i++) tone(820 + (i % 2) * 260, 0.03, { type: 'square', gain: 0.018, delay: i * 0.035 }); },
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, { type: 'triangle', delay: i * 0.12, gain: 0.09 })),
};

export function vibrate(ms: number) {
  try { navigator.vibrate?.(ms); } catch { /* 지원 안 하는 기기 */ }
}
