/*
  동물 제자리 동작 — GPT 검토판(game/review/round/pet-motion.ts, 10-15 사용자 승인)을 본편으로 옮겼다. 그림 없이 시험된다(tests/game-pet-motion).
  늘 한자리에 앉아 있다(dx 는 늘 0): 작은 숨쉬기·눈 깜빡임·꼬리, 14초마다 3초쯤 고양이 앞발 세수·강아지 귀 긁기.
  모션 줄이기·일시정지면 기본 자세로 멈춘다.
*/
export type PetKind = 'cat' | 'dog';

export function petPoseAt(timeMs: number, kind: PetKind, reduced: boolean, sleeping = false) {
  const time = reduced ? 0 : Math.max(0, Number.isFinite(timeMs) ? timeMs : 0), phase = time % 14000;
  const action = sleeping ? 'sleep' : phase >= 5000 && phase < 8000 ? 'groom' : 'idle';
  const groom = action === 'groom' ? Math.max(0, Math.min(1, (phase - 5000) / 350, (8000 - phase) / 350)) : 0;
  const cat = kind === 'cat', wash = Math.sin(time / (cat ? 120 : 85));
  return {
    action, groom, dx: 0,
    breath: reduced ? 0 : Math.sin(time / 950) * 0.012,
    headAngle: groom * ((cat ? -10 : 7) + wash * 2), headY: groom * (cat ? 1 : 0),
    pawX: (cat ? -7 : 5) + groom * (cat ? 3 : 6),
    pawY: -2 + groom * (-10 + wash * (cat ? 1 : 2)),
    pawAngle: groom * ((cat ? -20 : 20) + wash * 10),
    tailAngle: cat ? (reduced ? 20 : 2.5 + Math.cos(time / 650) * 17.5) : (reduced ? 25 : 25 + Math.sin(time / 240) * 15),
    eyes: sleeping ? 0.15 : reduced ? 1 : groom > 0 ? 1 - groom * 0.6 : time % 4200 > 4050 ? 0.2 : 1,
  };
}
