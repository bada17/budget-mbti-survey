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
  /** 말 상자 웅얼거림 — 글자마다 짧은 톡. 높이는 글자로 정해서 같은 말은 늘 같은 가락(누구 목소리를 흉내 내지 않은 합성음). */
  babble: (ch: string, pitch = 0) => {
    if (!/[가-힣a-z0-9]/i.test(ch)) return;
    const code = ch.charCodeAt(0);
    tone(430 + pitch + (code % 9) * 38, 0.055, { type: 'triangle', gain: 0.032, slide: (code % 3 - 1) * 60 });
  },
  /** 나무 흔들기·줍기(동물의 숲 ⓕ) — 잎 사락, 동전 딸랑, 열매 톡. */
  rustle: () => { for (let i = 0; i < 4; i++) tone(900 + (i % 2) * 180, 0.05, { type: 'triangle', gain: 0.012, delay: i * 0.035, slide: -300 }); },
  coin: () => { tone(1319, 0.09, { gain: 0.05 }); tone(1760, 0.22, { gain: 0.045, delay: 0.07 }); },
  fruit: () => tone(520, 0.12, { slide: 180, gain: 0.05 }),
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.16, { delay: i * 0.13, gain: 0.065 })),
};

export function vibrate(ms: number) {
  try { navigator.vibrate?.(ms); } catch { /* 지원 안 하는 기기 */ }
}

// ───────────────────────── 마을 배경 가락(사용자 10-14 「그래도 한번 만들어서 넣어봐」) ─────────────────────────
/*
  오르골처럼 짧고 잔잔한 가락 — 파일 없이 코드로 만든다(용량 0). 마을에서만, 효과음보다 작게. 소리 단추로 같이 꺼진다.
  여덟 마디가 되풀이된다: 화음 넷(낮은 음 한 번 + 오르골 분산화음) 위에 시드로 정한 가락(같은 마을은 늘 같은 노래).
  밤엔 느리고 낮게, 다른 화음. 누구의 노래도 흉내 내지 않은 진행(흔한 Ⅰ–ⅵ–Ⅱ–Ⅴ 꼴).
*/
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
/** 한 마디 = 8분음표 여덟 칸. 음은 MIDI 번호. */
type Note = { step: number; midi: number; len: number; kind: 'bass' | 'arp' | 'tune' };
const DAY = { bpm: 84, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]] }; // Cmaj7 · Am7 · Dm7 · G7
const NIGHT = { bpm: 68, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]] }; // Fmaj7 · Em7 · Dm7 · Cmaj7
const ARP = [0, 1, 2, 3, 2, 1, 2, 1];

/** 여덟 마디 노래 — 시험되게 순수 함수로. step 은 8분음표 칸(0~63). */
export function villageTune(night: boolean, seed = 'village-tune'): { bpm: number; steps: number; notes: Note[] } {
  const { bpm, chords } = night ? NIGHT : DAY;
  let h = 2166136261;
  for (const c of seed + night) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const r = () => { h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const notes: Note[] = [];
  let last = chords[0][2] + 12;
  for (let bar = 0; bar < 8; bar++) {
    const chord = chords[bar % 4], at = bar * 8;
    notes.push({ step: at, midi: chord[0] - 12, len: 3, kind: 'bass' });
    if (bar % 2) notes.push({ step: at + 4, midi: chord[0] - 12 + 7, len: 2, kind: 'bass' });
    ARP.forEach((k, i) => { if (i % 2 === 0 || r() < 0.5) notes.push({ step: at + i, midi: chord[k], len: 1.2, kind: 'arp' }); });
    // 가락 — 마디마다 두세 음, 화음 음(한 옥타브 위) 중 앞 음에서 가까운 것으로 걷는다. 넷째·여덟째 마디 끝은 쉰다.
    for (const slot of bar % 4 === 3 ? [0, 3] : [0, 3, 6]) {
      if (slot && r() < 0.25) continue;
      const pool = chord.map(n => n + 12).concat(chord[0] + 24);
      pool.sort((a, b) => Math.abs(a - last) - Math.abs(b - last));
      last = pool[Math.min(pool.length - 1, Math.floor(r() * 2.2))];
      notes.push({ step: at + slot, midi: last, len: slot === 6 ? 2 : 3, kind: 'tune' });
    }
  }
  return { bpm, steps: 64, notes };
}

let music: { stop(): void } | undefined;
let musicBus: GainNode | undefined;
const MUSIC_GAIN = { bass: 0.032, arp: 0.014, tune: 0.03 };

/** 오르골 한 음 — 사인파 두 겹(제 음 + 네 배 음을 조금), 짧게 튕기고 길게 사라진다. */
function pluck(c: AudioContext, out: AudioNode, freq: number, at: number, len: number, gain: number) {
  const body = c.createOscillator(), shine = c.createOscillator(), g = c.createGain(), gs = c.createGain();
  body.frequency.value = freq; shine.frequency.value = freq * 4;
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  gs.gain.setValueAtTime(0.0001, at); gs.gain.exponentialRampToValueAtTime(gain * 0.18, at + 0.005); gs.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
  body.connect(g).connect(out); shine.connect(gs).connect(out);
  for (const o of [body, shine]) { o.start(at); o.stop(at + len + 0.05); o.onended = () => o.disconnect(); }
}

/**
 * 마을 배경 가락 켜기 — 소리가 풀리기 전(첫 손길 전)이면 풀릴 때까지 기다렸다 시작한다. 탭을 숨기면 쉰다.
 * 다시 부르면 앞의 것을 끄고 새로(낮·밤이 바뀌었을 때).
 */
export function playVillageMusic(night: boolean) {
  music?.stop();
  const tune = villageTune(night), eighth = 60 / tune.bpm / 2;
  const byStep = new Map<number, Note[]>();
  for (const n of tune.notes) byStep.set(n.step, [...(byStep.get(n.step) ?? []), n]);
  let step = 0, nextAt = 0, started = false, lastTarget = 1;
  const timer = setInterval(() => {
    const c = ctx;
    if (!c || c.state !== 'running' || document.hidden) { started = false; return; }
    if (!musicBus || musicBus.context !== c) {
      // 오르골 상자 울림 — 짧은 메아리 한 번, 높은 소리는 조금 깎는다
      musicBus = c.createGain();
      const tone = c.createBiquadFilter(), echo = c.createDelay(1), back = c.createGain();
      tone.type = 'lowpass'; tone.frequency.value = 3200; echo.delayTime.value = 0.27; back.gain.value = 0.22;
      musicBus.connect(tone).connect(c.destination); tone.connect(echo).connect(back).connect(echo); back.connect(c.destination);
    }
    const target = muted ? 0 : 1;
    if (!started) { // 처음(또는 탭에서 돌아왔을 때) — 2초쯤에 걸쳐 살며시
      started = true; nextAt = c.currentTime + 0.1; lastTarget = target;
      musicBus.gain.cancelScheduledValues(c.currentTime); musicBus.gain.setValueAtTime(0, c.currentTime); musicBus.gain.setTargetAtTime(target, c.currentTime, 0.8);
    } else if (target !== lastTarget) { lastTarget = target; musicBus.gain.setTargetAtTime(target, c.currentTime, 0.3); }
    while (nextAt < c.currentTime + 0.3) {
      if (!muted) for (const n of byStep.get(step) ?? []) pluck(c, musicBus, midi(n.midi), nextAt, n.len * eighth * 2.2, MUSIC_GAIN[n.kind]);
      nextAt += eighth; step = (step + 1) % tune.steps;
    }
  }, 90);
  music = { stop: () => { clearInterval(timer); if (musicBus && ctx) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.2); } };
}
export const stopVillageMusic = () => { music?.stop(); music = undefined; };
