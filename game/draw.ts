/*
  임시 그림 — 모양만 잡아 둔 자리. 최종 그림체는 아직 안 정했다(README 정할 것 7).
  그림을 바꿀 때는 이 파일만 바꾼다. 장면(JourneyScene)은 여기 있는 함수 이름과
  돌려주는 모양(Dude·RoomArt)만 쓴다.
*/
import Phaser from 'phaser';
import { FEEL } from './feel';
import type { Point, Room } from './room';

type Scene = Phaser.Scene;
type Container = Phaser.GameObjects.Container;

import { rng, type Look } from './look';
export { lookFrom, toLook, type Look } from './look';

export class Dude {
  readonly root: Container;
  private body: Container;
  private legs: Phaser.GameObjects.Rectangle[];
  private eyes: Phaser.GameObjects.Arc[];
  private walkClock = 0;
  private idleClock = Math.random() * 4000;
  private hopping = false;
  private tall: number;
  constructor(private scene: Scene, look: Look, x: number, y: number, scale = 1) {
    const s = scene.add;
    this.tall = look.tall;
    const shadow = s.ellipse(0, 0, 26, 8, 0x2d3a2e, 0.16);
    this.legs = [-5, 5].map(lx => s.rectangle(lx, -6, 6, 12, 0x3d4250).setRounded(3));
    const torso = s.rectangle(0, -20, 24, 24, look.coat).setRounded(10);
    const head = s.circle(0, -40, 12, look.skin);
    const hair = s.graphics().fillStyle(look.hair);
    if (look.style === 9) { // 나: 앞챙 모자
      hair.fillStyle(look.coat).slice(0, -42, 12.5, Math.PI, 0, false).fillPath().fillRoundedRect(-2, -45, 17, 5, 2.5);
    } else {
      hair.slice(0, -41, 12.5, Math.PI * 1.05, -Math.PI * 0.05, false).fillPath();
      if (look.style === 1) hair.fillCircle(0, -55, 6);
      if (look.style === 2) hair.fillRoundedRect(-13, -43, 6, 16, 3).fillRoundedRect(7, -43, 6, 16, 3);
      if (look.style === 3) hair.fillRoundedRect(-9, -54, 18, 6, 3);
    }
    this.eyes = [-4.5, 4.5].map(ex => s.circle(ex, -39, 1.9, 0x2a2a33));
    const cheeks = [-7, 7].map(cx => s.circle(cx, -34.5, 2.4, 0xff8f8f, 0.45));
    this.body = s.container(0, 0, [...this.legs, torso, head, hair, ...this.eyes, ...cheeks]).setScale(1, look.tall);
    this.root = s.container(x, y, [shadow, this.body]).setScale(scale);
  }
  get x() { return this.root.x; }
  get y() { return this.root.y; }
  place(p: Point) { this.root.setPosition(p.x, p.y).setDepth(p.y); return this; }
  /** 눈을 가는 쪽(또는 보는 쪽)으로. */
  look(dx: number, dy: number) {
    const len = Math.hypot(dx, dy) || 1;
    this.eyes.forEach((eye, i) => eye.setPosition((i ? 4.5 : -4.5) + dx / len * 2.2, -39 + dy / len * 1.4));
  }
  /** 걷는 모습: 다리 번갈아, 몸 통통. */
  walk(dtMs: number, moving: boolean, reduced: boolean) {
    if (this.hopping) return;
    if (!moving || reduced) {
      this.walkClock = 0;
      this.legs.forEach(leg => leg.setY(-6));
      // 서 있을 때 숨쉬기
      const breath = reduced ? 0 : Math.sin((this.idleClock += dtMs) / 520) * 0.025;
      this.body.setY(0).setScale(1 - breath * 0.5, this.tall * (1 + breath));
      return;
    }
    this.walkClock += dtMs;
    const t = (this.walkClock / FEEL.stepMs) * Math.PI * 2;
    this.legs[0].setY(-6 - Math.max(0, Math.sin(t)) * 3);
    this.legs[1].setY(-6 - Math.max(0, -Math.sin(t)) * 3);
    this.body.setY(-Math.abs(Math.sin(t)) * FEEL.bobPx);
    this.body.scaleX = 1 + Math.cos(t * 2) * FEEL.squash * 0.5;
  }
  /** 폴짝. 대답의 세기에 따라 높이·횟수가 다르다. */
  hop(height: number, times: number, reduced: boolean) {
    if (reduced || !times) return;
    this.hopping = true;
    this.scene.tweens.add({
      targets: this.body, y: -height, duration: 150, ease: 'Quad.easeOut', yoyo: true, repeat: times - 1,
      onComplete: () => { this.hopping = false; this.body.setY(0); },
    });
  }
  destroy() { this.root.destroy(); }
}

// ── 하트·먼지·찍은 자리·색종이 ──
export function hearts(scene: Scene, x: number, y: number, count: number, reduced: boolean) {
  for (let i = 0; i < count; i++) {
    const g = scene.add.graphics({ x, y }).setDepth(9000);
    g.fillStyle(0xff5d7a).fillCircle(-3, 0, 3.6).fillCircle(3, 0, 3.6).fillTriangle(-6.6, 1.2, 6.6, 1.2, 0, 9);
    const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.35;
    const dist = 26 + (i % 3) * 10;
    scene.tweens.add({
      targets: g, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist - 10, alpha: 0, scale: { from: 0.6, to: 1.3 },
      duration: reduced ? 1 : 700 + i * 30, ease: 'Cubic.easeOut', onComplete: () => g.destroy(),
    });
  }
}
/** 고른 게 생길 때 반짝. */
export function sparkle(scene: Scene, x: number, y: number, reduced: boolean) {
  if (reduced) return;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const dot = scene.add.circle(x, y, 3, i % 2 ? 0xffd34d : 0xffffff).setDepth(9000);
    scene.tweens.add({ targets: dot, x: x + Math.cos(a) * 34, y: y + Math.sin(a) * 22, alpha: 0, scale: 0.4, duration: 520, ease: 'Cubic.easeOut', onComplete: () => dot.destroy() });
  }
}

/** 동네 사이 버스 — 길·하늘·버스(창에 내 얼굴). 버스 컨테이너를 돌려준다. 대충 모양만. */
export function drawBus(scene: Scene, w: number, h: number, stage: number, me: Look, riders: number) {
  const sky = DAYLIGHT[stage] ?? DAYLIGHT[0];
  const g = scene.add.graphics();
  g.fillGradientStyle(sky[0], sky[0], sky[1], sky[1]).fillRect(0, 0, w, h * 0.6);
  g.fillStyle(0xa9d39a).fillEllipse(w * 0.25, h * 0.6, w * 0.9, 120).fillEllipse(w * 0.85, h * 0.6, w * 0.8, 90);
  g.fillStyle(0xd6ecbf).fillRect(0, h * 0.6, w, h * 0.4);
  g.fillStyle(0x9e9e9e).fillRect(0, h * 0.62, w, 64);
  for (let x = 0; x < w; x += 44) g.fillStyle(0xffffff).fillRect(x, h * 0.62 + 30, 24, 4);
  const face = new Dude(scene, me, -46, 4, 0.5);
  const heads = Array.from({ length: Math.min(3, riders) }, (_, i) => scene.add.circle(-6 + i * 26, -8, 7, [0xf0c39f, 0xd9a07a, 0xf8dcc2][i]));
  const bus = scene.add.container(-120, h * 0.62 + 18, [
    scene.add.rectangle(0, -14, 168, 62, 0xffc94d).setRounded(14),
    ...[-46, -16, 14, 44].map(x => scene.add.rectangle(x, -24, 24, 22, 0xd8f0fb).setRounded(4)),
    face.root, ...heads,
    scene.add.rectangle(72, -12, 12, 40, 0xf0b02f).setRounded(3),
    ...[-50, 50].map(x => scene.add.circle(x, 18, 11, 0x3b3b44)),
  ]);
  const box = scene.add.container(0, 0, [g, bus]).setDepth(-50000);
  return { box, bus };
}

export function dust(scene: Scene, x: number, y: number) {
  const puff = scene.add.circle(x, y, 3.5, 0xffffff, 0.55).setDepth(y - 1);
  scene.tweens.add({ targets: puff, scale: 2.2, alpha: 0, y: y - 4, duration: 380, onComplete: () => puff.destroy() });
}
export function tapRing(scene: Scene, x: number, y: number) {
  const ring = scene.add.circle(x, y, 9).setStrokeStyle(2, 0xffffff, 0.9).setDepth(8000);
  scene.tweens.add({ targets: ring, scale: 2, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
}
export function confetti(scene: Scene, w: number, top: number, reduced: boolean) {
  if (reduced) return;
  const colors = [0xff6b57, 0xffc74d, 0x6ad1a3, 0x6aa6d9, 0xd98cb3];
  for (let i = 0; i < 60; i++) {
    const piece = scene.add.rectangle(Math.random() * w, top - 20 - Math.random() * 80, 6, 9, colors[i % colors.length]).setDepth(9500);
    scene.tweens.add({
      targets: piece, y: piece.y + 260 + Math.random() * 260, x: piece.x + (Math.random() - 0.5) * 80,
      angle: Math.random() * 720 - 360, alpha: { from: 1, to: 0 }, duration: 1600 + Math.random() * 900, ease: 'Sine.easeIn',
      onComplete: () => piece.destroy(),
    });
  }
}

// ── 방 ──
export const THEMES = [
  { ground: 0xeee5d0, path: 0xfbf6e9, wall: 0xf3bfa9, roof: 0xd9785f, window: 0xcfe8f2, tree: 0x8cc07a, water: 0 }, // 동네 입구
  { ground: 0xd3e6b8, path: 0xf3ecd2, wall: 0xf5e3a3, roof: 0x7aa86a, window: 0xd8f0e6, tree: 0x6fae6a, water: 0 }, // 학교 가는 길
  { ground: 0xe6dad4, path: 0xf6efea, wall: 0xcfa6a2, roof: 0x8f5f6a, window: 0xf0e6d8, tree: 0x9cba8a, water: 0 }, // 골목
  { ground: 0xece0b8, path: 0xf8f1d9, wall: 0xadcbdb, roof: 0x5f8aa6, window: 0xf2f8fb, tree: 0x8fb46e, water: 0 }, // 읍내
  { ground: 0xd2e9d9, path: 0xf0f6ea, wall: 0xbadbc6, roof: 0x4f8f7a, window: 0xe6f6f8, tree: 0x5fa585, water: 0x8cc9e0 }, // 강가
] as const;

/** 동네를 지날수록 아침 → 노을. [하늘 위, 하늘 아래, 화면 전체에 곱하는 빛]. 다섯째 뒤는 언덕(노을). */
export const DAYLIGHT = [
  [0xcfe9ff, 0xeef7ff, 0xf7fbff],
  [0xb9e0f7, 0xe3f3fb, 0xffffff],
  [0xc9dcef, 0xf6e8cf, 0xfff3e2],
  [0xeec39a, 0xfbe1c0, 0xffe4c9],
  [0xe39ba3, 0xf7c79c, 0xf8d2c6],
  [0xd98a9a, 0xf6c08f, 0xf8d6c8],
] as const;

export type Pigeon = { root: Container; at: Point; fled: boolean };
export type RoomArt = { box: Container; openDoor: (reduced: boolean) => void; pigeons: Pigeon[]; destroy: () => void };

function tree(scene: Scene, x: number, y: number, color: number) {
  return scene.add.container(x, y, [
    scene.add.ellipse(0, 0, 30, 9, 0x2d3a2e, 0.14),
    scene.add.rectangle(0, -8, 7, 16, 0x9a7356).setRounded(3),
    scene.add.circle(0, -30, 18, color), scene.add.circle(-9, -22, 11, color), scene.add.circle(9, -23, 12, color),
    scene.add.circle(-5, -36, 6, 0xffffff, 0.18),
  ]).setDepth(y);
}

function pigeon(scene: Scene, x: number, y: number): Pigeon {
  const head = scene.add.container(6, -9, [scene.add.circle(0, 0, 4, 0x8b93a3), scene.add.triangle(4, 1, 0, -1.5, 0, 1.5, 3.5, 0, 0xf2a65a), scene.add.circle(1.5, -1, 0.9, 0x222222)]);
  const root = scene.add.container(x, y, [scene.add.ellipse(0, 1, 16, 5, 0x2d3a2e, 0.12), scene.add.ellipse(0, -5, 15, 10, 0xa3abb9), scene.add.ellipse(-4, -5, 8, 6, 0x8b93a3), head]).setDepth(y);
  scene.tweens.add({ targets: head, y: -5, angle: 25, duration: 160, yoyo: true, repeat: -1, repeatDelay: 500 + Math.random() * 1400, delay: Math.random() * 900 });
  return { root, at: { x, y }, fled: false };
}

/** 비둘기가 날아간다. */
export function flee(scene: Scene, bird: Pigeon, from: Point) {
  bird.fled = true;
  const dir = Math.sign(bird.at.x - from.x) || 1;
  scene.tweens.killTweensOf(bird.root.list);
  bird.root.setScale(dir, 1);
  scene.tweens.add({ targets: bird.root, x: bird.at.x + dir * 220, y: bird.at.y - 260, duration: 900, ease: 'Quad.easeIn', onComplete: () => bird.root.destroy() });
  scene.tweens.add({ targets: bird.root, scaleY: 0.55, duration: 70, yoyo: true, repeat: 6 });
}

/**
 * 장소를 알아보게 하는 표시 하나둘. 대충 모양만 — 꾸미기는 GPT 몫.
 * 질문 칸이 화면 위쪽(작은 폰은 벽 윗부분까지)을 덮으므로 표시는 벽 아래쪽·문 둘레·마당에 둔다.
 */
function placeMark(g: Phaser.GameObjects.Graphics, room: Room, place: string, wall: number) {
  const { w, h, wallY, door, residents } = room;
  const meetY = residents.left.y, low = wallY - 62;
  /** 창 하나를 지우고 그 자리 가운데 x 를 돌려준다. */
  const slot = (wx: number) => { g.fillStyle(wall).fillRect(w * wx - 23, wallY - 96, 46, 56); return w * wx; };
  const flag = (x: number) => { g.fillStyle(0x6d6d6d).fillRect(x - 1, wallY - 92, 3, 58); g.fillStyle(0xffffff).fillRect(x + 2, wallY - 92, 22, 14).lineStyle(1, 0x999999).strokeRect(x + 2, wallY - 92, 22, 14); };
  const columns = () => { for (const dx of [-62, -50, 50, 62]) g.fillStyle(0xffffff, 0.75).fillRect(door.x + dx - 4, wallY - 100, 8, 100); };
  switch (place) {
    case '광장':
      g.fillStyle(0xcfd8dc).fillEllipse(w / 2, meetY + 46, 74, 26); g.fillStyle(0x9fd3e6).fillEllipse(w / 2, meetY + 44, 58, 16);
      g.fillStyle(0x9fd3e6).fillCircle(w / 2, meetY + 30, 5); break;
    case '큰길':
      g.fillStyle(0xbdbdbd).fillRect(0, h - 170, w, 54);
      for (let x = 10; x < w; x += 40) g.fillStyle(0xffffff).fillRect(x, h - 145, 22, 4);
      for (let x = door.x - 40; x < door.x + 40; x += 14) g.fillStyle(0xffffff).fillRect(x, h - 168, 8, 50); break;
    case '주민센터': case '주민센터 창구': case '군청':
      columns(); flag(slot(0.73));
      if (place === '주민센터 창구') { g.fillStyle(0xd9c3a5).fillRoundedRect(16, wallY - 40, w - 32, 22, 6); g.fillStyle(0x4a3a33).fillRect(door.x - door.half, wallY - 40, door.half * 2, 22); }
      break;
    case '학교': {
      const x = slot(0.27);
      g.fillStyle(0xffffff).fillCircle(x, low, 18); g.lineStyle(3, 0x444444).strokeCircle(x, low, 18);
      g.lineStyle(3, 0x444444).lineBetween(x, low, x, low - 12).lineBetween(x, low, x + 9, low);
      flag(slot(0.73)); break;
    }
    case '공원':
      g.fillStyle(0x86bf73).fillRect(0, wallY - 120, w, 120);
      g.fillStyle(0xe8dcc0).fillRoundedRect(door.x - door.half - 10, wallY - 96, door.half * 2 + 20, 18, 9);
      g.fillStyle(0x9fd3e6).fillEllipse(w * 0.2, h - 120, 80, 34); break;
    case '공연장':
      for (let y = wallY - 92; y < wallY; y += 12) g.fillStyle(0xffd34d).fillCircle(door.x - door.half - 9, y, 3.5).fillCircle(door.x + door.half + 9, y, 3.5);
      g.fillStyle(0xb2324a).fillRect(w * 0.27 - 22, wallY - 96, 44, 56).fillRect(w * 0.73 - 22, wallY - 96, 44, 56); break;
    case '경로당': // 담장 기와
      for (const [x0, x1] of [[0, door.x - door.half - 6], [door.x + door.half + 6, w]]) {
        g.fillStyle(0x5d5f66).fillRect(x0, wallY - 40, x1 - x0, 12);
        for (let x = x0 + 6; x < x1; x += 12) g.fillStyle(0x777a82).fillCircle(x, wallY - 40, 6);
      }
      break;
    case '청년 자취방':
      g.lineStyle(1, 0x777777).lineBetween(w * 0.62, wallY - 30, w * 0.95, wallY - 30);
      [0xe58f8f, 0x6aa6d9, 0xf0d35e].forEach((c, i) => g.fillStyle(c).fillRect(w * 0.66 + i * 26, wallY - 30, 14, 16)); break;
    case '보건소':
      for (const x of [slot(0.27), slot(0.73)]) {
        g.fillStyle(0xffffff).fillCircle(x, low, 20);
        g.fillStyle(0x3fa36b).fillRect(x - 5, low - 14, 10, 28).fillRect(x - 14, low - 5, 28, 10);
      }
      break;
    case '소방서':
      g.fillStyle(0xd9534f).fillRect(0, wallY - 120, w, 120);
      for (const gx of [w * 0.06, w * 0.66]) for (let y = wallY - 86; y < wallY; y += 10) g.fillStyle(0xeeeeee).fillRect(gx, y, w * 0.28, 6);
      break;
    case '버스 정류장': {
      const sx = w * 0.78;
      g.fillStyle(0x6d8fa8).fillRect(sx - 40, wallY + 4, 80, 8).fillRect(sx - 36, wallY + 12, 4, 40).fillRect(sx + 32, wallY + 12, 4, 40);
      g.fillStyle(0xb07a52).fillRect(sx - 30, wallY + 36, 60, 6);
      g.fillStyle(0x3b82c4).fillCircle(w * 0.2, wallY + 10, 12); g.fillStyle(0x777777).fillRect(w * 0.2 - 2, wallY + 20, 4, 40);
      break;
    }
    case '둑':
      g.fillStyle(0x9ccf8a).fillRect(0, wallY - 120, w, 120);
      g.fillStyle(0x8cc9e0).fillRect(0, wallY - 120, w, 70);
      for (let x = 8; x < w; x += 46) g.lineStyle(2, 0xffffff, 0.6).lineBetween(x, wallY - 62, x + 18, wallY - 62);
      for (let y = wallY - 76; y < wallY; y += 12) g.fillStyle(0xd8d2c0).fillRect(door.x - door.half, y, door.half * 2, 6);
      break;
    case '체육관': // 창 자리에 공 둘
      for (const x of [slot(0.27), slot(0.73)]) {
        g.fillStyle(0xf08a3c).fillCircle(x, low, 16);
        g.lineStyle(2, 0x7a3b12).strokeCircle(x, low, 16).lineBetween(x - 16, low, x + 16, low).lineBetween(x, low - 16, x, low + 16);
      }
      break;
  }
}

export function drawRoom(scene: Scene, room: Room, stage: number, seed: string, offsetY = 0, place = ''): RoomArt {
  const t = THEMES[stage] ?? THEMES[0];
  const r = rng(seed);
  const { w, h, wallY, door, residents } = room;
  const g = scene.add.graphics();
  const items: Phaser.GameObjects.GameObject[] = [g];
  // 바닥, 길, 만나는 마당
  g.fillStyle(t.ground).fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) g.fillStyle(0xffffff, 0.22).fillCircle(r() * w, wallY + r() * (h - wallY), 1.5 + r() * 1.5);
  g.fillStyle(t.path).fillRoundedRect(door.x - 48, wallY - 4, 96, h - wallY + 10, 18);
  g.fillStyle(t.path).fillEllipse(w / 2, residents.left.y + 6, w * 0.86, 104);
  if (t.water) {
    g.fillStyle(t.water).fillRect(0, wallY, 30, h - wallY);
    for (let y = wallY + 12; y < h; y += 26) g.lineStyle(2, 0xffffff, 0.45).lineBetween(6, y, 20, y);
  }
  // 위쪽 건물
  const sky = DAYLIGHT[stage] ?? DAYLIGHT[0];
  g.fillGradientStyle(sky[0], sky[0], sky[1], sky[1]).fillRect(0, -40, w, wallY - 120 + 40);
  g.fillStyle(t.wall).fillRect(0, wallY - 120, w, 120);
  g.fillStyle(t.roof).fillRect(0, wallY - 120, w, 12);
  for (const wx of [0.1, 0.27, 0.73, 0.9]) {
    g.fillStyle(0xffffff, 0.5).fillRoundedRect(w * wx - 20, wallY - 92, 40, 46, 6);
    g.fillStyle(t.window).fillRoundedRect(w * wx - 17, wallY - 89, 34, 40, 5);
  }
  placeMark(g, room, place, t.wall);
  g.fillStyle(0x000000, 0.08).fillRect(0, wallY - 6, w, 6);
  g.fillStyle(t.roof).fillRoundedRect(door.x - door.half - 12, wallY - 92, door.half * 2 + 24, 14, 6);
  g.fillStyle(0x4a3a33).fillRect(door.x - door.half, wallY - 78, door.half * 2, 78);
  const light = scene.add.rectangle(door.x, wallY - 39, door.half * 2 - 6, 74, 0xfff3c4).setAlpha(0);
  const panels = [-1, 1].map(side => scene.add.rectangle(door.x + side * door.half / 2, wallY - 39, door.half - 2, 76, 0xa8754f).setStrokeStyle(2, 0x7d5338));
  const knobs = [-1, 1].map(side => scene.add.circle(door.x + side * 5, wallY - 38, 2.4, 0xf2d27a));
  items.push(light, ...panels, ...knobs);
  // 옆쪽 나무·벤치 (사람 서는 곳과 길은 비운다)
  const sideXs = t.water ? [44, w - 22] : [22, w - 22];
  for (let y = wallY + 46; y < h - 20; y += 92 + r() * 40) {
    for (const x of sideXs) if (r() > 0.25) items.push(tree(scene, x + (r() - 0.5) * 8, y, t.tree));
  }
  const benchX = r() > 0.5 ? w * 0.2 : w * 0.8, benchY = Math.min(h - 40, residents.left.y + 110);
  items.push(scene.add.container(benchX, benchY, [
    scene.add.rectangle(0, -8, 40, 6, 0xb07a52).setRounded(2), scene.add.rectangle(0, -16, 40, 5, 0xb07a52).setRounded(2),
    scene.add.rectangle(-15, -2, 4, 10, 0x6d5444), scene.add.rectangle(15, -2, 4, 10, 0x6d5444),
  ]).setDepth(benchY));
  const pigeons: Pigeon[] = [];
  for (let i = 0; i < 2; i++) {
    const at = { x: w * (0.22 + r() * 0.56), y: residents.left.y + 70 + r() * Math.max(10, h - residents.left.y - 170) };
    if (Math.abs(at.x - w / 2) < 30) at.x += 50;
    const bird = pigeon(scene, at.x, at.y);
    pigeons.push(bird); items.push(bird.root);
  }
  // 방 그림은 늘 사람들 밑에 깔린다(컨테이너 안의 깊이는 그리는 차례를 바꾸지 않는다).
  const box = scene.add.container(0, offsetY, items).setDepth(-100000);
  return {
    box, pigeons,
    destroy() {
      for (const bird of pigeons) { scene.tweens.killTweensOf(bird.root); scene.tweens.killTweensOf(bird.root.list); }
      scene.tweens.killTweensOf([...panels, light]);
      box.destroy();
    },
    openDoor(reduced) {
      const ms = reduced ? 1 : 380;
      panels.forEach((panel, i) => scene.tweens.add({ targets: panel, scaleX: 0.15, x: door.x + (i ? 1 : -1) * (door.half - 4), duration: ms, ease: 'Back.easeOut' }));
      knobs.forEach(knob => knob.setVisible(false));
      scene.tweens.add({ targets: light, alpha: 1, duration: ms });
    },
  };
}

/** 강 건너 언덕 — 도착하는 곳. 언덕 꼭대기 자리를 돌려준다. */
export function drawHill(scene: Scene, w: number, h: number, offsetY: number) {
  const g = scene.add.graphics();
  const sky = DAYLIGHT[5];
  g.fillGradientStyle(sky[0], sky[0], sky[1], sky[1]).fillRect(0, 0, w, h * 0.43);
  g.fillStyle(0xffe08a, 0.9).fillCircle(w * 0.72, h * 0.36, 28);
  g.fillStyle(0xffffff, 0.55).fillEllipse(w * 0.25, h * 0.16, 70, 22).fillEllipse(w * 0.3, h * 0.14, 46, 22).fillEllipse(w * 0.78, h * 0.24, 60, 18);
  g.fillStyle(0xa9d39a).fillEllipse(w * 0.2, h * 0.43, w * 0.9, 90).fillEllipse(w * 0.85, h * 0.43, w * 0.8, 70);
  g.fillStyle(0x8cc9e0).fillRect(0, h * 0.42, w, h * 0.1);
  for (let i = 0; i < 9; i++) g.lineStyle(2, 0xffffff, 0.5).lineBetween((i * 47) % w, h * 0.45 + (i % 3) * 9, (i * 47) % w + 16, h * 0.45 + (i % 3) * 9);
  g.fillStyle(0xd6ecbf).fillRect(0, h * 0.52, w, h * 0.48);
  g.fillStyle(0x9fd08a).fillEllipse(w / 2, h * 0.86, w * 1.5, h * 0.62);
  g.fillStyle(0xb4dc9e).fillEllipse(w / 2, h * 0.8, w * 0.9, h * 0.34);
  for (let i = 0; i < 30; i++) {
    const fx = (i * 73) % w, fy = h * 0.66 + ((i * 37) % Math.round(h * 0.3));
    g.fillStyle([0xffffff, 0xffd166, 0xff8fab][i % 3]).fillCircle(fx, fy, 2.2);
  }
  const box = scene.add.container(0, offsetY, [g]).setDepth(-100000);
  return { box, top: { x: w / 2, y: h * 0.66 } };
}
