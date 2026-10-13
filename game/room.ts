/*
  방 하나(문항 하나)의 배치와 걷기 규칙. 그림·Phaser 없이 시험할 수 있게 숫자만 다룬다.

  화면 하나가 방 하나다. 아래에서 들어와, 양쪽 주민 중 한 사람에게 가서 대답하고,
  위쪽 건물의 문으로 나간다. 문은 대답하기 전에는 닫혀 있다.
*/
import { FEEL } from './feel';

export type Point = { x: number; y: number };
export type Room = {
  w: number; h: number;
  /** 위쪽 건물 벽의 아랫선. 이 위로는 열린 문으로만 지나간다. */
  wallY: number;
  door: { x: number; half: number };
  residents: { left: Point; right: Point };
  /** 방에 들어와 서는 곳. */
  spawn: Point;
  /** 걸을 수 있는 가장 아랫줄. */
  floor: number;
};

const EDGE = 16; // 화면 옆 가장자리
const WALL_GAP = 10; // 발이 벽에서 떨어져 서는 거리
const BODY = 9; // 문틀에 몸이 걸리지 않게 문 폭에서 빼는 값
const SOLID = 26; // 주민과 겹치지 않는 거리

/** 화면 크기(CSS px)로 방 배치를 정한다. 위쪽 120px 쯤은 질문 칸이 덮는다. */
export function layoutRoom(w: number, h: number): Room {
  const wallY = Math.round(Math.max(150, h * 0.3));
  const meetY = Math.round(wallY + (h - wallY) * 0.34);
  return {
    w, h, wallY,
    door: { x: Math.round(w / 2), half: 38 },
    residents: { left: { x: Math.round(w * 0.25), y: meetY }, right: { x: Math.round(w * 0.75), y: meetY } },
    spawn: { x: Math.round(w / 2), y: h - 64 },
    floor: h - 22,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const inDoor = (room: Room, x: number) => Math.abs(x - room.door.x) <= room.door.half - BODY;

/**
 * 한 프레임 걷기. dir 은 가고 싶은 방향(길이 1 이하). solid 는 비켜 가야 할 사람들.
 * 문이 열렸을 때 벽에 붙어 위로 밀면 문 쪽으로 미끄러진다 — 옆에서 올라가도 걸리지 않는다.
 */
export function step(p: Point, dir: Point, speed: number, dtMs: number, room: Room, doorOpen: boolean, solid: Point[] = []): Point {
  if (![p.x, p.y, dir.x, dir.y, speed, dtMs].every(Number.isFinite) || dtMs <= 0 || speed <= 0) return { ...p };
  let dx = dir.x, dy = dir.y;
  if (!Math.hypot(dx, dy)) return { ...p };
  if (doorOpen && dy < -0.3 && p.y <= room.wallY + WALL_GAP + 2 && !inDoor(room, p.x)) {
    dx += Math.sign(room.door.x - p.x) * FEEL.doorAssist;
  }
  const len = Math.hypot(dx, dy);
  if (len > 1) { dx /= len; dy /= len; }
  const dist = speed * Math.min(dtMs, FEEL.maxDeltaMs) / 1000;
  let x = clamp(p.x + dx * dist, EDGE, room.w - EDGE);
  // 이미 문간에 들어섰으면 옆으로는 문틀 안에서만 — 문틀에 걸려 들락날락하지 않게.
  if (doorOpen && p.y < room.wallY + WALL_GAP - 0.5) x = clamp(x, room.door.x - room.door.half + BODY, room.door.x + room.door.half - BODY);
  const top = doorOpen && inDoor(room, x) ? -Infinity : room.wallY + WALL_GAP;
  let next = { x, y: clamp(p.y + dy * dist, top, room.floor) };
  for (const s of solid) {
    const ox = next.x - s.x, oy = next.y - s.y, d = Math.hypot(ox, oy);
    if (d < SOLID) next = d ? { x: s.x + ox / d * SOLID, y: s.y + oy / d * SOLID } : { x: next.x, y: s.y + SOLID };
  }
  return next;
}

/** 열린 문을 지나 벽 위로 올라섰나. */
export const passedDoor = (p: Point, room: Room) => p.y < room.wallY - 6;

/** 두 주민 중 가까이 있는 쪽. 없으면 undefined. */
export function nearest(p: Point, room: Room, radius: number, sides: ('left' | 'right')[] = ['left', 'right']) {
  let best: 'left' | 'right' | undefined, bestD = radius;
  for (const side of sides) {
    const r = room.residents[side], d = Math.hypot(r.x - p.x, r.y - p.y);
    if (d < bestD) { best = side; bestD = d; }
  }
  return best;
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** 지나온 길(최근 점이 끝)에서 뒤로 gap 만큼 떨어진 자리. 길이 짧으면 맨 처음 점. */
export function alongTrail(trail: Point[], gap: number): Point | undefined {
  let left = gap;
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i], b = trail[i - 1], d = distance(a, b);
    if (d >= left) return { x: a.x + (b.x - a.x) * left / d, y: a.y + (b.y - a.y) * left / d };
    left -= d;
  }
  return trail[0] && { ...trail[0] };
}
