import { NOTE_GAP_MS } from './village';
const KEY = 'budget-game-pub-feedback';
type Gate = { device: string; at: number };
let memory: Gate | undefined;
/** 게임 기록과 별개인 도배 제한 정보만. 저장소가 막혀도 현재 페이지에선 유지한다. */
export function feedbackGate(now = Date.now()) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Gate | null;
    if (saved && /^[a-f0-9]{32}$/.test(saved.device) && Number.isFinite(saved.at)) memory = saved;
  } catch { /* 저장소가 막힌 브라우저는 메모리로 */ }
  memory ??= { device: Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''), at: 0 };
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* 메모리 유지 */ }
  return { ...memory, wait: Math.max(0, memory.at + NOTE_GAP_MS - now) };
}
export function feedbackSent(now = Date.now()) {
  const gate = feedbackGate(now); memory = { device: gate.device, at: now };
  try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* 메모리 유지 */ }
}
