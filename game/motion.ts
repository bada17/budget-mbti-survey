import { gameStorage } from './storage';

const media = matchMedia('(prefers-reduced-motion: reduce)');
const params = typeof location === 'undefined' ? undefined : new URLSearchParams(location.search);
export const fullMotionProbe = Boolean(params?.has('motiontrace') && params.get('motionprobe') === 'full');
type Preference = 'system' | 'full';
let choice: Preference | undefined;
const apply = (value: Preference) => {
  if (!globalThis.document?.documentElement) return;
  if (fullMotionProbe || value === 'full') document.documentElement.dataset.motion = 'full';
  else delete document.documentElement.dataset.motion;
};
export function motionPreference(): Preference {
  if (choice === undefined) {
    try { choice = gameStorage.getItem('budget-game-motion') === 'full' ? 'full' : 'system'; } catch { choice = 'system'; }
    apply(choice);
  }
  return choice;
}
export function setMotionPreference(value: Preference) {
  choice = value;
  try { if (value === 'system') gameStorage.removeItem('budget-game-motion'); else gameStorage.setItem('budget-game-motion', value); } catch { /* 저장이 막혀도 이번 페이지의 선택은 적용한다. */ }
  apply(value);
}
export const deviceRequestsReducedMotion = () => media.matches;
export const prefersReducedMotion = () => !(fullMotionProbe || motionPreference() === 'full') && media.matches;
