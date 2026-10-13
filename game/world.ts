import { FEEL } from './feel';
import type { DisplaySide } from './response';

export type Point = { x: number; y: number };
export const WORLD = {
  width: 360, height: 1184, margin: 28, spawn: { x: 180, y: 1104 },
  stops: [944, 624, 304], exit: { x: 180, y: 72 },
  gateBeforeAnswer: 45, residentX: { left: 103, right: 257 },
} as const;

export const THEMES = [
  { grass: 0xb5cda2, path: 0xe4d9bd, accent: 0x426d58, water: false, roof: 0 },
  { grass: 0xc4d3a3, path: 0xe8dcb6, accent: 0x526b38, water: false, roof: 4 },
  { grass: 0xbcbea4, path: 0xdad3c1, accent: 0x75654d, water: false, roof: 0 },
  { grass: 0xc1cc98, path: 0xe9d8af, accent: 0x5c7045, water: false, roof: 4 },
  { grass: 0xafc8a4, path: 0xe0d8b7, accent: 0x426f72, water: true, roof: 4 },
] as const;

export function residentPosition(index: number, side: DisplaySide): Point {
  return { x: WORLD.residentX[side], y: WORLD.stops[index] };
}

export function movePlayer(point: Point, vector: Point, deltaMs: number, questionIndex: number): Point {
  if (![vector.x, vector.y, deltaMs].every(Number.isFinite) || deltaMs <= 0) return { ...point };
  const magnitude = Math.hypot(vector.x, vector.y);
  if (!magnitude) return { ...point };
  const distance = FEEL.walkSpeed * Math.min(deltaMs, FEEL.maxDeltaMs) / 1000;
  const top = questionIndex < WORLD.stops.length ? WORLD.stops[questionIndex] - WORLD.gateBeforeAnswer : WORLD.exit.y;
  return {
    x: Math.max(WORLD.margin, Math.min(WORLD.width - WORLD.margin, point.x + vector.x / Math.max(1, magnitude) * distance)),
    y: Math.max(top, Math.min(WORLD.height - WORLD.margin, point.y + vector.y / Math.max(1, magnitude) * distance)),
  };
}
