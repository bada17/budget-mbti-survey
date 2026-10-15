/*
  방마다 다른 길(사용자 10-14 「게임으로 역할을 못 한다」 진단 ①③ 「열다섯 방이 똑같다·걷는 이유가 없다」 → ⓒ).
  세 방에만 작은 놀이 — 질문·판정·문 열리는 차례(대답한 뒤)는 그대로 두고, 나가는 길에 하나를 더한다.
  · stream — 들어온 자리와 주민 사이를 개울이 가로지른다. 징검돌 위로만 건넌다.
  · cat    — 졸린 고양이가 문 앞에서 잔다. 곁에 가면 깨서 비켜 준다(그 전엔 지나갈 수 없다).
  열쇠 찾기·골 넣기(문을 잠그던 둘)는 10-15 걷었다 — 사용자 「재미있는데 거기서 그런 요소까지 있으니 집중력이 분산돼. 열쇠찾기는 없애고
  골대는 마을 한 구석에」. 골은 마을 작은 운동장(village.ts PITCH)으로 옮겼다.
  자리 계산·젖는 곳은 여기서(그림 없이 시험), 그림·연출은 draw.ts 의 drawTwist, 차례는 JourneyScene.
*/
import type { Point, Room } from './room';

export type TwistKind = 'stream' | 'cat';
/** 방 번호(0부터, orderedQuestions 차례) → 놀이. 나머지 열두 방은 그대로. */
export const TWISTS: Record<number, TwistKind> = { 4: 'stream', 6: 'cat', 13: 'stream' };

export type Stream = { y0: number; y1: number; r: number; stones: Point[] };
/** 개울 — 주민 줄과 들어온 자리 사이. 돌 셋이 지그재그로 겹쳐 이어진다(발이 돌 위에 있으면 마른 땅). */
export function streamOf(room: Room): Stream {
  const top = room.residents.left.y + 34, y0 = Math.round(top + (room.spawn.y - top) * 0.3), y1 = y0 + 54, cx = room.w / 2;
  return { y0, y1, r: 22, stones: [{ x: cx - 18, y: y1 - 6 }, { x: cx + 14, y: y0 + 27 }, { x: cx - 14, y: y0 + 6 }] };
}
export const wet = (p: Point, s: Stream) => p.y > s.y0 && p.y < s.y1 && !s.stones.some(t => Math.hypot(p.x - t.x, p.y - t.y) < s.r);
/** 젖는 자리로는 못 간다 — 가로·세로를 따로 해 봐서 돌 가장자리를 따라 미끄러진다. */
export function keepDry(prev: Point, next: Point, s: Stream): Point {
  if (!wet(next, s)) return next;
  const xOnly = { x: next.x, y: prev.y };
  if (!wet(xOnly, s)) return xOnly;
  const yOnly = { x: prev.x, y: next.y };
  return wet(yOnly, s) ? prev : yOnly;
}

/** 졸린 고양이 — 문 바로 앞. 깨기 전엔 부딪히는 자리(사람과 같은 거리로 비켜 간다). */
export const catOf = (room: Room): Point => ({ x: room.door.x, y: room.wallY + 22 });
export const CAT_WAKE = 46;
