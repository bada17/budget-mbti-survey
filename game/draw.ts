/*
  둥근 도형·파스텔·납작한 그림자. 승인된 귀여움 시안을 열다섯 장소·버스로 확장(README 디테일 차례).
  그림을 바꿀 때는 이 파일만 바꾼다. 장면(JourneyScene)은 여기 있는 함수 이름과
  돌려주는 모양(Dude·RoomArt)만 쓴다.
*/
import Phaser from 'phaser';
import { FEEL } from './feel';
import { ROUTE } from './content';
import type { Point, Room } from './room';
import { PLACES, PLAZA, FOUNTAIN, LOT, POND, ROADS, VILLAGE_W, VILLAGE_H, GATE_Y, VILLAGE_NAME, type Place, type PlaceId } from './village';

type Scene = Phaser.Scene;
type Container = Phaser.GameObjects.Container;

import { rng, type Look } from './look';
export { lookFrom, toLook, type Look } from './look';

type DudeLeg = Phaser.GameObjects.Rectangle | Container;
type DudeParts = {
  body: Container;
  legs: DudeLeg[];
  eyes: Phaser.GameObjects.Arc[];
  rightArm: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc)[];
};

/** 주민 시안의 첫 줄무늬 옷. 머리·색은 기존 선택 값을 그대로 쓴다. */
function characterPreview(scene: Scene, look: Look): DudeParts {
  const s = scene.add;
  const legs = [-5.5, 5.5].map(x => s.container(x, -6, [
    s.rectangle(0, 0, 9, 13, 0x707c8b).setRounded(3),
    s.ellipse(0, 6, 11, 5, 0xfff8e8), s.rectangle(0, 5, 5, 1, 0xc9bdad).setRounded(0.5),
  ]));
  const sleeves = [-12.5, 12.5].map(x => s.rectangle(x, -20, 8, 15, look.coat).setRounded(4).setAngle(x < 0 ? 15 : -15));
  const hands = [-14, 14].map(x => s.circle(x, -12.5, 3.8, look.skin));
  const torso = s.rectangle(0, -20, 26, 24, look.coat).setRounded(9);
  const shirt = s.graphics();
  shirt.fillStyle(0xfffaed, 0.86);
  for (const y of [-28, -22, -16]) shirt.fillRoundedRect(-11, y, 22, 3, 1.2);
  for (const x of [-15.5, 10]) shirt.fillRoundedRect(x, -22, 5.5, 3, 1);
  shirt.fillStyle(0xfffaed).fillRoundedRect(-8, -10, 16, 2, 1);
  const neck = s.ellipse(0, -29, 9, 6, look.skin);
  const backHair = s.graphics().fillStyle(look.hair);
  if (look.style === 2) backHair.fillRoundedRect(-18, -47, 36, 25, 10);
  const ears = [-16.5, 16.5].map(x => s.circle(x, -37, 3.7, look.skin));
  const head = s.ellipse(0, -38, 35, 29, look.skin);
  const hair = s.graphics().fillStyle(look.hair);
  if (look.style === 9) {
    hair.fillStyle(look.coat).slice(0, -42, 17, Math.PI, 0, false).fillPath().fillRoundedRect(-2, -46, 22, 6, 3);
    hair.fillStyle(0xfffaed, 0.65).fillCircle(-8, -49, 2);
  } else {
    hair.slice(0, -42, 17.5, Math.PI, 0, false).fillPath();
    hair.fillCircle(-12, -45, 5).fillCircle(-6, -48, 6).fillCircle(1, -47, 5).fillCircle(9, -46, 6);
    hair.fillTriangle(-17, -43, -12, -43, -15, -35).fillTriangle(12, -43, 17, -43, 15, -35);
    if (look.style === 1) hair.fillCircle(2, -54, 6);
    if (look.style === 2) hair.fillRoundedRect(-18, -43, 5, 14, 2.5).fillRoundedRect(13, -43, 5, 14, 2.5);
    if (look.style === 3) hair.fillStyle(look.coat).fillRoundedRect(-14, -53, 28, 3, 1.5);
  }
  const eyes = [-4.5, 4.5].map(x => s.circle(x, -39, 1.65, 0x37333b));
  const cheeks = [-10, 10].map(x => s.ellipse(x, -35.5, 6.5, 4.5, 0xf09b90, 0.58));
  const smile = s.graphics().fillStyle(0xea997e, 0.6).fillCircle(0, -36.8, 1.1);
  smile.lineStyle(1.2, 0x705044).beginPath().arc(0, -34, 2.3, 0.12, Math.PI - 0.12, false).strokePath();
  const body = s.container(0, 0, [...legs, ...sleeves, ...hands, torso, shirt, neck, backHair, ...ears, head, hair, ...eyes, ...cheeks, smile]);
  return { body, legs, eyes, rightArm: [sleeves[1], hands[1]] };
}

export class Dude {
  readonly root: Container;
  private body: Container;
  private legs: DudeLeg[];
  private eyes: Phaser.GameObjects.Arc[];
  private normal?: DudeParts;
  private walkClock = 0;
  private idleClock = Math.random() * 4000;
  private hopping = false;
  private tall: number;
  private arm: { coat: number; skin: number };
  private restingRightArm: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc)[];
  constructor(private scene: Scene, look: Look, x: number, y: number, scale = 1) {
    const s = scene.add;
    this.tall = look.tall;
    this.arm = { coat: look.coat, skin: look.skin };
    // 머리 끝과 발 위치는 그대로. 작은 손·볼·옷깃으로 표정을 보탠다.
    const shadow = s.ellipse(0, 0, 29, 7, 0x756956, 0.17);
    this.legs = [-5, 5].map(lx => s.rectangle(lx, -5, 7, 11, 0x555363).setRounded(3.5));
    const sleeves = [-12, 12].map(x => s.rectangle(x, -21, 8, 13, look.coat).setRounded(4).setAngle(x < 0 ? 12 : -12));
    const hands = [-13, 13].map(x => s.circle(x, -14, 3.6, look.skin));
    this.restingRightArm = [sleeves[1], hands[1]];
    const torso = s.rectangle(0, -19, 25, 24, look.coat).setRounded(11);
    const seams = s.graphics();
    seams.fillStyle(0xffffff, 0.55).fillTriangle(-6, -31, 0, -26, 0, -30).fillTriangle(6, -31, 0, -26, 0, -30);
    seams.fillStyle(0xffffff, 0.3).fillRoundedRect(3, -21, 6, 5, 2);
    seams.fillStyle(0x684c42, 0.12).fillRoundedRect(-8, -10, 16, 2, 1);
    const ears = [-13, 13].map(x => s.circle(x, -39, 3.4, look.skin));
    const head = s.ellipse(0, -39, 29, 27, look.skin);
    const hair = s.graphics().fillStyle(look.hair);
    if (look.style === 9) {
      hair.fillStyle(look.coat).slice(0, -43, 14, Math.PI, 0, false).fillPath().fillRoundedRect(-1, -46, 20, 6, 3);
      hair.lineStyle(1, 0xffffff, 0.3).lineBetween(0, -54, 0, -48);
      hair.fillStyle(0xffffff, 0.45).fillCircle(-7, -48, 2);
    } else {
      hair.slice(0, -41, 14.5, Math.PI * 1.03, -Math.PI * 0.03, false).fillPath();
      hair.fillCircle(-9, -45, 4.5).fillCircle(-3, -47, 4.2).fillCircle(4, -46, 4.5);
      if (look.style === 1) hair.fillCircle(1, -54, 6.5).fillStyle(0xffffff, 0.25).fillEllipse(-1, -56, 5, 2);
      if (look.style === 2) hair.fillStyle(look.hair).fillRoundedRect(-15, -45, 7, 20, 3.5).fillRoundedRect(8, -45, 7, 20, 3.5);
      if (look.style === 3) hair.fillStyle(look.coat).fillRoundedRect(-11, -53, 22, 4, 2);
      hair.fillStyle(0xffffff, 0.12).fillEllipse(-5, -51, 10, 3);
    }
    this.eyes = [-4.5, 4.5].map(ex => s.circle(ex, -39, 1.8, 0x39313b));
    const cheeks = [-9, 9].map(cx => s.ellipse(cx, -35, 6, 3.5, 0xed9294, 0.58));
    const smile = s.graphics().lineStyle(1.1, 0x85554b, 0.8);
    smile.beginPath().arc(0, -34.5, 2.1, 0.15, Math.PI - 0.15, false).strokePath();
    this.body = s.container(0, 0, [...this.legs, ...sleeves, ...hands, torso, seams, ...ears, head, hair, ...this.eyes, ...cheeks, smile]).setScale(1, look.tall);
    this.root = s.container(x, y, [shadow, this.body]).setScale(scale);
    // 첫 방의 나만 비교한다. 주민은 무작위 키, 동행은 작은 scale을 쓰므로 제외된다.
    if (scene.sys.settings.key === 'journey' && scene.data.get('character-preview-room')?.active && look.tall === 1 && scale === 1) {
      this.normal = { body: this.body, legs: this.legs, eyes: this.eyes, rightArm: this.restingRightArm };
      const preview = characterPreview(scene, look);
      this.body.setVisible(false);
      this.body = preview.body; this.legs = preview.legs; this.eyes = preview.eyes; this.restingRightArm = preview.rightArm;
      this.root.add(this.body);
    }
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
    if (this.normal && !this.scene.data.get('character-preview-room')?.active) {
      this.scene.tweens.killTweensOf(this.body);
      this.body.destroy();
      this.body = this.normal.body; this.legs = this.normal.legs; this.eyes = this.normal.eyes; this.restingRightArm = this.normal.rightArm;
      this.body.setVisible(true); this.normal = undefined; this.hopping = false;
    }
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
  /** 손 흔들기 — 어깨에서 동그란 손을 들어 인사한다. */
  wave(times: number, reduced: boolean) {
    if (reduced || !times) return;
    const s = this.scene.add;
    const arm = s.container(11, -24, [s.rectangle(0, -7, 5, 14, this.arm.coat).setRounded(2.5), s.circle(0, -15, 3.6, this.arm.skin)]).setAngle(25);
    this.restingRightArm.forEach(part => part.setVisible(false));
    this.body.add(arm);
    this.scene.tweens.add({ targets: arm, angle: -10, duration: 160, ease: 'Sine.easeInOut', yoyo: true, repeat: times - 1, onComplete: () => {
      arm.destroy();
      this.restingRightArm.forEach(part => part.setVisible(true));
    } });
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

/** 동네 사이 버스 — 둥근 차체와 창마다 작은 여행자 얼굴. */
export function drawBus(scene: Scene, w: number, h: number, stage: number, me: Look, riders: number) {
  const sky = DAYLIGHT[stage] ?? DAYLIGHT[0];
  const g = scene.add.graphics();
  g.fillGradientStyle(sky[0], sky[0], sky[1], sky[1]).fillRect(0, 0, w, h * 0.6);
  g.fillStyle(0xb2cda0).fillEllipse(w * 0.25, h * 0.6, w * 0.9, 120).fillEllipse(w * 0.85, h * 0.6, w * 0.8, 90);
  g.fillStyle(0xe0e6c1).fillRect(0, h * 0.6, w, h * 0.4);
  g.fillStyle(0xb2aaa0).fillRect(0, h * 0.62, w, 64);
  g.fillStyle(0xfaf1d9).fillRect(0, h * 0.62, w, 3).fillRect(0, h * 0.62 + 61, w, 3);
  for (let x = 0; x < w; x += 44) g.fillStyle(0xfff8e4).fillRoundedRect(x, h * 0.62 + 30, 24, 3, 1.5);
  const face = new Dude(scene, me, -46, 4, 0.5);
  const passengers = scene.add.graphics();
  for (let i = 0; i < Math.min(3, riders); i++) {
    const x = -16 + i * 30;
    passengers.fillStyle([0xf0c39f, 0xd9a07a, 0xf8dcc2][i]).fillEllipse(x, -16, 14, 15);
    passengers.fillStyle([0x655047, 0x463f43, 0x88705e][i]).fillRoundedRect(x - 7, -24, 14, 5, 2.5);
    passengers.fillStyle(0x58463f).fillCircle(x - 2.5, -16, 0.8).fillCircle(x + 2.5, -16, 0.8);
    passengers.fillStyle(0xe99e94, 0.8).fillEllipse(x - 5, -13, 3, 2).fillEllipse(x + 5, -13, 3, 2);
  }
  const trim = scene.add.graphics();
  trim.fillStyle(0xe3ad67).fillRoundedRect(-80, -5, 160, 21, 7);
  trim.fillStyle(0xffedbc).fillRoundedRect(-76, -4, 141, 4, 2);
  trim.fillStyle(0xf6d296).fillRoundedRect(66, -32, 13, 44, 4);
  trim.fillStyle(0xbdd5d0).fillRoundedRect(69, -28, 7, 21, 3);
  trim.fillStyle(0xfffae7).fillRoundedRect(77, -4, 7, 8, 3);
  trim.fillStyle(0xd48874).fillRoundedRect(-84, -3, 6, 7, 2);
  trim.fillStyle(0x9d8979).fillRoundedRect(-88, 9, 12, 6, 3).fillRoundedRect(76, 9, 12, 6, 3);
  const bus = scene.add.container(-120, h * 0.62 + 18, [
    scene.add.ellipse(0, 27, 180, 12, 0x63584e, 0.12),
    scene.add.rectangle(0, -14, 168, 62, 0xf4ce82).setRounded(17),
    scene.add.rectangle(-3, -41, 135, 5, 0xffe9b6).setRounded(2.5),
    ...[-46, -16, 14, 44].map(x => scene.add.rectangle(x, -24, 26, 25, 0xd7e8df).setRounded(7).setStrokeStyle(2, 0xffefcf)),
    face.root, passengers, trim,
    ...[-50, 50].flatMap(x => [scene.add.circle(x, 18, 11, 0x665b58), scene.add.circle(x, 18, 5, 0xe7d7bd), scene.add.circle(x, 18, 2, 0xa49383)]),
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
export type Ball = { root: Container; spin: Container; at: Point; v: Point };
export type Cat = { root: Container; at: Point; near: boolean };
export type RoomArt = { box: Container; openDoor: (reduced: boolean) => void; pigeons: Pigeon[]; ball?: Ball; cat?: Cat; destroy: () => void };

/** 축구공 — 흰 바탕에 검은 점 여섯. 굴러가는 게 보이게 무늬가 돈다(spin). */
function ball(scene: Scene, x: number, y: number): Ball {
  const s = scene.add;
  const dots = [0, 72, 144, 216, 288].map(a => s.circle(Math.cos(a * Math.PI / 180) * 6.4, Math.sin(a * Math.PI / 180) * 6.4, 1.8, 0x2d2a32));
  const spin = s.container(0, -9, [s.circle(0, 0, 9, 0xfffdf2).setStrokeStyle(1, 0x807e8c), s.circle(0, 0, 3, 0x596579), ...dots, s.ellipse(-3, -4, 4, 2, 0xffffff, 0.7)]);
  const root = s.container(x, y, [s.ellipse(0, 0, 18, 5, 0x2d3a2e, 0.18), spin]);
  return { root, spin, at: { x, y }, v: { x: 0, y: 0 } };
}

/** 고양이 — 앉아서 꼬리를 살랑. 털색은 방마다 다르다. */
function cat(scene: Scene, x: number, y: number, fur: number): Cat {
  const s = scene.add;
  const tail = s.rectangle(10, -3, 5, 16, fur).setRounded(2.5).setOrigin(0.5, 1).setAngle(20);
  const face = s.graphics();
  face.fillStyle(fur).fillTriangle(-13, -19, -12, -29, -5, -23).fillTriangle(3, -23, 10, -29, 11, -18);
  face.fillStyle(0xe9a4a1).fillTriangle(-11, -22, -11, -26, -8, -23).fillTriangle(5, -23, 9, -26, 9, -22);
  face.fillStyle(0x514651, 0.4).fillRoundedRect(-5, -25, 2, 4, 1).fillRoundedRect(-1, -25, 2, 4, 1);
  face.lineStyle(1, 0x514651, 0.7).lineBetween(-12, -15, -8, -14).lineBetween(5, -14, 9, -15);
  face.lineBetween(-2, -13, -4, -12).lineBetween(-2, -13, 0, -12);
  const root = s.container(x, y, [
    s.ellipse(0, 1, 27, 7, 0x756956, 0.15), tail,
    s.ellipse(1, -8, 22, 18, fur), s.ellipse(0, -7, 12, 12, 0xfff5e6, 0.7),
    s.ellipse(-2, -18, 24, 20, fur), face,
    s.ellipse(-7, -2, 7, 4, 0xfff5e6, 0.9), s.ellipse(5, -2, 7, 4, 0xfff5e6, 0.9),
    s.circle(-6.5, -18, 1.2, 0x332e38), s.circle(2.5, -18, 1.2, 0x332e38),
    s.ellipse(-10, -15, 4, 2.5, 0xef9d99, 0.7), s.ellipse(7, -15, 4, 2.5, 0xef9d99, 0.7),
    s.triangle(-2, -14, 0, 0, 3, 0, 1.5, 2, 0xb96f76),
  ]);
  scene.tweens.add({ targets: tail, angle: -15, duration: 700, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: Math.random() * 700 });
  return { root, at: { x, y }, near: false };
}

/** 다가가면 야옹 — 폴짝, 하트 하나. */
export function meow(scene: Scene, kitty: Cat, reduced: boolean) {
  hearts(scene, kitty.at.x - 4, kitty.at.y - 26, 1, reduced);
  if (!reduced) scene.tweens.add({ targets: kitty.root, y: kitty.at.y - 7, duration: 130, ease: 'Quad.easeOut', yoyo: true });
}

function tree(scene: Scene, x: number, y: number, color: number) {
  return scene.add.container(x, y, [
    scene.add.ellipse(0, 0, 30, 9, 0x2d3a2e, 0.14),
    scene.add.rectangle(0, -8, 7, 16, 0x9a7356).setRounded(3),
    scene.add.circle(0, -30, 18, color), scene.add.circle(-9, -22, 11, color), scene.add.circle(9, -23, 12, color),
    scene.add.circle(-5, -36, 6, 0xffffff, 0.18),
  ]).setDepth(y);
}

function pigeon(scene: Scene, x: number, y: number): Pigeon {
  const s = scene.add;
  const head = s.container(6, -11, [
    s.circle(0, 0, 5.5, 0x929aad), s.ellipse(0, 3, 7, 3, 0xb7d1c5),
    s.triangle(5, 1, 0, -1.5, 0, 1.5, 4, 0, 0xe5b171),
    s.circle(1.8, -1, 1.1, 0x383746), s.ellipse(0, 1.7, 3, 1.5, 0xe8adad, 0.6),
  ]);
  const root = s.container(x, y, [
    s.ellipse(0, 1, 21, 5, 0x756956, 0.13),
    s.rectangle(-3, -0.5, 2, 4, 0xcf8b79), s.rectangle(3, -0.5, 2, 4, 0xcf8b79),
    s.ellipse(0, -6, 19, 14, 0xb6bfce), s.ellipse(2, -4, 12, 7, 0xe7e5df),
    s.ellipse(-4, -7, 10, 7, 0x929aad), s.ellipse(-5, -8, 5, 2, 0xd5dce5), head,
  ]).setDepth(y);
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
 * 기존 장소 표시를 둥근 건물 디테일·바닥 무늬로 다듬는다. 새 장난감은 추가하지 않는다.
 * 질문 칸이 화면 위쪽(작은 폰은 벽 윗부분까지)을 덮으므로 표시는 벽 아래쪽·문 둘레·마당에 둔다.
 */
function placeMark(g: Phaser.GameObjects.Graphics, room: Room, place: string, wall: number) {
  const { w, h, wallY, door, residents } = room;
  const meetY = residents.left.y, low = wallY - 31;
  // 공통 창 대신 장소별 외벽을 그릴 때, 문 바깥만 지운다.
  const wings = (color = wall) => {
    g.fillStyle(color).fillRect(0, wallY - 108, door.x - 48, 108).fillRect(door.x + 48, wallY - 108, w - door.x - 48, 108);
  };
  const window = (x: number, y: number, ww: number, hh: number, glass = 0xc4dcda) => {
    g.fillStyle(0xfff8e7).fillRoundedRect(x - ww / 2 - 3, y - hh / 2 - 3, ww + 6, hh + 6, 8);
    g.fillStyle(glass).fillRoundedRect(x - ww / 2, y - hh / 2, ww, hh, 6);
    g.lineStyle(2, 0xfff8e7).lineBetween(x, y - hh / 2, x, y + hh / 2);
    g.fillStyle(0xffffff, 0.42).fillRoundedRect(x - ww / 2 + 4, y - hh / 2 + 4, 6, Math.min(12, hh - 8), 3);
  };
  const flag = (x: number) => { g.fillStyle(0x9f9b8d).fillRoundedRect(x - 1, wallY - 70, 3, 55, 1.5); g.fillStyle(0xfffcf1).fillRoundedRect(x + 2, wallY - 70, 21, 13, 3); };
  switch (place) {
    case '광장': {
      // 분수는 마당 옆. 중앙 길과 주민 발밑에 물건을 놓지 않는다.
      const x = w * 0.17, y = meetY + 84;
      g.fillStyle(0xbcae98, 0.2).fillEllipse(x + 3, y + 13, 84, 23);
      g.fillStyle(0xcbbda6).fillEllipse(x, y + 5, 82, 29);
      g.fillStyle(0xf6eee0).fillEllipse(x, y, 82, 28);
      g.fillStyle(0x90c7d3).fillEllipse(x, y, 67, 19);
      g.lineStyle(1.6, 0xe4f7f4, 0.85).strokeEllipse(x, y, 52, 11);
      g.fillStyle(0xf4ebd9).fillRoundedRect(x - 5, y - 27, 10, 28, 4);
      g.fillStyle(0xfaf4e6).fillEllipse(x, y - 24, 29, 9);
      g.fillStyle(0x98cfdb).fillEllipse(x, y - 26, 24, 6);
      g.lineStyle(2.5, 0xd2f0ed).lineBetween(x, y - 28, x, y - 41);
      g.fillStyle(0xb6e5e8).fillEllipse(x, y - 43, 5, 7).fillEllipse(x - 10, y - 29, 3, 6).fillEllipse(x + 11, y - 27, 3, 6);
      break;
    }
    case '큰길': {
      const y = h - 170;
      g.fillStyle(0xe4d8c1).fillRect(0, y - 13, w, 80);
      g.fillStyle(0xfff7e8).fillRect(0, y - 10, w, 7).fillRect(0, y + 56, w, 7);
      g.fillStyle(0xa6abb5).fillRect(0, y, w, 54);
      for (let x = 12; x < w; x += 40) {
        if (Math.abs(x - door.x) > 58) g.fillStyle(0xf7efdc).fillRoundedRect(x, y + 25, 21, 3, 1.5);
      }
      for (let x = door.x - 37; x < door.x + 40; x += 15) g.fillStyle(0xfffcf2).fillRoundedRect(x, y + 5, 9, 44, 2);
      for (let x = 5; x < w; x += 26) {
        if (Math.abs(x - door.x) > 49) g.lineStyle(1, 0xcbbda8).lineBetween(x, y - 12, x, y - 4).lineBetween(x, y + 57, x, y + 65);
      }
      break;
    }
    case '주민센터': {
      // 낮은 창·둥근 기둥·넓은 현관. 문 가운데는 비워 둔다.
      g.fillStyle(wall).fillRect(0, wallY - 100, door.x - 72, 100).fillRect(door.x + 72, wallY - 100, w - door.x - 72, 100);
      for (const x of [door.x - 57, door.x + 57]) {
        g.fillStyle(0xfaf4df).fillRoundedRect(x - 7, wallY - 94, 14, 90, 5);
        g.fillStyle(0xe4d8bd).fillRoundedRect(x - 12, wallY - 10, 24, 9, 3);
        g.fillStyle(0xfff8e8).fillRoundedRect(x - 11, wallY - 94, 22, 9, 3);
      }
      for (const x of [w * 0.16, w * 0.84]) {
        g.fillStyle(0xfff9e9).fillRoundedRect(x - 30, wallY - 64, 60, 51, 12);
        g.fillStyle(0xa8c9ca).fillRoundedRect(x - 25, wallY - 59, 50, 40, 9);
        g.lineStyle(3, 0xfaf5e5).lineBetween(x, wallY - 57, x, wallY - 20).lineBetween(x - 24, wallY - 37, x + 24, wallY - 37);
        g.fillStyle(0xffffff, 0.4).fillRoundedRect(x - 19, wallY - 54, 9, 11, 3);
        g.fillStyle(0xd9b992).fillRoundedRect(x - 30, wallY - 17, 60, 6, 3);
      }
      g.fillStyle(0xeddbc2).fillRoundedRect(door.x - 61, wallY + 2, 122, 9, 4);
      g.fillStyle(0xfcf3df).fillRoundedRect(door.x - 54, wallY - 1, 108, 7, 3);
      flag(w * 0.86);
      break;
    }
    case '학교': {
      wings(0xf1dba5);
      for (const x of [w * 0.27, w * 0.72, w * 0.9]) {
        window(x, wallY - 45, 29, 55, 0xbad4c8);
        g.lineStyle(2, 0xfff8e7).lineBetween(x - 14, wallY - 41, x + 14, wallY - 41);
      }
      const x = w * 0.1, y = wallY - 28;
      g.fillStyle(0x9cba98).fillCircle(x, y + 2, 23);
      g.fillStyle(0xfff9e7).fillCircle(x, y, 20);
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        g.fillStyle(0xbda783).fillCircle(x + Math.sin(a) * 16, y + Math.cos(a) * 16, i % 3 ? 1 : 1.7);
      }
      g.lineStyle(2.5, 0x7a6756).lineBetween(x, y, x, y - 10).lineBetween(x, y, x + 8, y + 3);
      g.fillStyle(0xc18d70).fillCircle(x, y, 2.5);
      flag(w * 0.79);
      // 운동장 가장자리의 트랙 선: 길·대화 자리는 평평하게 둔다.
      g.lineStyle(2, 0xffffff, 0.4).strokeRoundedRect(7, meetY + 65, 52, Math.max(30, h - meetY - 100), 25);
      break;
    }
    case '공원': {
      wings(0xb5cfa1);
      for (const x of [0, w]) {
        g.fillStyle(0x8db78c).fillEllipse(x, wallY - 27, 142, 75);
        g.fillStyle(0xa2c699).fillEllipse(x + (x ? -33 : 33), wallY - 33, 78, 69);
      }
      g.fillStyle(0xe5d7b8).fillRoundedRect(door.x - 53, wallY - 86, 106, 13, 6);
      for (const x of [door.x - 57, door.x + 50]) g.fillStyle(0xf1e5c9).fillRoundedRect(x, wallY - 82, 7, 84, 3);
      const x = w * 0.19, y = h - 105;
      g.fillStyle(0xbdcba0).fillEllipse(x + 2, y + 5, 97, 49);
      g.fillStyle(0xe8dec0).fillEllipse(x, y, 94, 45);
      g.fillStyle(0x9cced4).fillEllipse(x, y - 2, 82, 33);
      g.lineStyle(1.5, 0xe9f8e9, 0.8).strokeEllipse(x, y - 2, 60, 20);
      break;
    }
    case '공연장': {
      wings(0xe7c3bd);
      for (const x of [w * 0.18, w * 0.82]) {
        g.fillStyle(0xa97680).fillRoundedRect(x - 43, wallY - 78, 86, 76, 12);
        g.fillStyle(0x775d68).fillRoundedRect(x - 35, wallY - 66, 70, 60, 6);
        g.fillStyle(0xc77d88).fillRoundedRect(x - 37, wallY - 75, 25, 62, 10).fillRoundedRect(x + 12, wallY - 75, 25, 62, 10);
        g.fillStyle(0xe3a4a6).fillEllipse(x - 20, wallY - 71, 41, 20).fillEllipse(x + 20, wallY - 71, 41, 20);
        g.lineStyle(2, 0xefd0b0).lineBetween(x - 35, wallY - 31, x - 18, wallY - 27).lineBetween(x + 18, wallY - 27, x + 35, wallY - 31);
        g.fillStyle(0xe2bd8f).fillRoundedRect(x - 42, wallY - 6, 84, 9, 3);
      }
      for (let y = wallY - 77; y < wallY - 5; y += 16) g.fillStyle(0xffe9a8).fillCircle(door.x - 46, y, 3).fillCircle(door.x + 46, y, 3);
      break;
    }
    case '경로당': {
      wings(0xe6d4b8);
      for (const x of [w * 0.18, w * 0.82]) {
        g.fillStyle(0xba9976).fillRoundedRect(x - 41, wallY - 64, 82, 62, 4);
        g.fillStyle(0xfff0d2).fillRect(x - 35, wallY - 56, 70, 48);
        for (let dx = -23; dx <= 23; dx += 12) g.lineStyle(2, 0xc5aa86).lineBetween(x + dx, wallY - 56, x + dx, wallY - 8);
        for (let dy = -44; dy <= -12; dy += 12) g.lineStyle(2, 0xc5aa86).lineBetween(x - 35, wallY + dy, x + 35, wallY + dy);
        g.fillStyle(0x7e9092).fillRoundedRect(x - 48, wallY - 76, 96, 16, 7);
        for (let dx = -41; dx < 45; dx += 12) {
          g.fillStyle(0x98aaab).fillRoundedRect(x + dx, wallY - 79, 9, 16, 4);
          g.fillStyle(0xc1cfbf, 0.6).fillCircle(x + dx + 4.5, wallY - 65, 3);
        }
        g.fillStyle(0xd0b18c).fillRoundedRect(x - 44, wallY - 1, 88, 14, 3);
        for (let dx = -33; dx < 40; dx += 14) g.lineStyle(1, 0xb99b77).lineBetween(x + dx, wallY + 1, x + dx, wallY + 11);
      }
      break;
    }
    case '청년 자취방': {
      wings(0xe0c9c6);
      window(w * 0.17, wallY - 42, 68, 58, 0xeedab3);
      g.fillStyle(0xb89ea8).fillRoundedRect(w * 0.17 - 41, wallY - 12, 82, 9, 3);
      const x = w * 0.81;
      window(x, wallY - 66, 56, 30, 0xc7d5db);
      g.lineStyle(1.5, 0x9c8790).lineBetween(x - 43, wallY - 37, x + 43, wallY - 37);
      [0xd7989a, 0x9bb8c9, 0xe1c480].forEach((c, i) => {
        const tx = x - 29 + i * 28;
        g.fillStyle(c).fillRoundedRect(tx - 7, wallY - 35, 14, 24, 3);
        g.fillStyle(c).fillTriangle(tx - 7, wallY - 35, tx - 13, wallY - 24, tx - 5, wallY - 23).fillTriangle(tx + 7, wallY - 35, tx + 13, wallY - 24, tx + 5, wallY - 23);
        g.fillStyle(0xfff4de).fillEllipse(tx, wallY - 34, 6, 3);
        g.fillStyle(0xc2a68b).fillRoundedRect(tx - 4, wallY - 39, 2, 7, 1).fillRoundedRect(tx + 3, wallY - 39, 2, 7, 1);
      });
      break;
    }
    case '주민센터 창구': {
      wings(0xe8d9bd);
      for (const x of [w * 0.18, w * 0.82]) {
        window(x, wallY - 43, 79, 56, 0xb5d3cf);
        g.fillStyle(0xfaf4df).fillRoundedRect(x - 13, wallY - 22, 26, 15, 7);
        g.fillStyle(0xb89b79).fillRoundedRect(x - 44, wallY - 18, 88, 19, 4);
        g.fillStyle(0xe0c49d).fillRoundedRect(x - 47, wallY - 24, 94, 9, 4);
        g.fillStyle(0xf1dec0).fillRoundedRect(x - 24, wallY - 12, 48, 4, 2);
      }
      break;
    }
    case '보건소': {
      wings(0xc6ddd5);
      for (const x of [w * 0.18, w * 0.82]) {
        window(x, wallY - 39, 78, 61, 0xb1d1d6);
        g.fillStyle(0xfffcf1).fillCircle(x, low, 22);
        g.fillStyle(0x7ca78d).fillRoundedRect(x - 5, low - 14, 10, 28, 2).fillRoundedRect(x - 14, low - 5, 28, 10, 2);
      }
      g.fillStyle(0xf1ebd5).fillRoundedRect(door.x - 49, wallY + 1, 98, 8, 3);
      break;
    }
    case '소방서': {
      wings(0xd78e81);
      for (const x of [w * 0.18, w * 0.82]) {
        g.fillStyle(0xf8ddbc).fillRoundedRect(x - 47, wallY - 76, 94, 78, 12);
        g.fillStyle(0xaabac0).fillRoundedRect(x - 40, wallY - 67, 80, 66, 8);
        for (let y = wallY - 56; y < wallY - 3; y += 10) g.fillStyle(0xdce0d6).fillRoundedRect(x - 38, y, 76, 3, 1.5);
        g.fillStyle(0xe6b775).fillRoundedRect(x - 46, wallY - 5, 92, 6, 2);
        for (let dx = -40; dx < 40; dx += 16) g.lineStyle(3, 0x9c8671).lineBetween(x + dx, wallY - 4, x + dx + 4, wallY);
      }
      // 차고의 붉은 테두리와 셔터가 표식. 새 차량은 넣지 않는다.
      break;
    }
    case '군청': {
      wings(0xc5d4cf);
      for (const x of [w * 0.16, w * 0.84]) {
        window(x, wallY - 47, 43, 62, 0xa8c5c9);
        for (const dx of [-36, 29]) {
          g.fillStyle(0xf7eddb).fillRoundedRect(x + dx, wallY - 78, 8, 77, 3);
          g.fillStyle(0xe7d6b6).fillRoundedRect(x + dx - 4, wallY - 8, 16, 9, 2);
        }
        g.fillStyle(0xfff4df).fillTriangle(x - 46, wallY - 76, x, wallY - 95, x + 46, wallY - 76);
        g.fillStyle(0xe9dbc2).fillRoundedRect(x - 46, wallY - 77, 92, 7, 2);
      }
      for (let i = 0; i < 3; i++) g.fillStyle([0xe0d1b7, 0xece0c7, 0xf8ecd5][i]).fillRoundedRect(door.x - 62 + i * 5, wallY + 11 - i * 5, 124 - i * 10, 5, 2);
      flag(w * 0.92);
      break;
    }
    case '버스 정류장': {
      wings(0xcadbc1);
      const x = w * 0.79, y = wallY - 47;
      g.fillStyle(0xa3c1c4).fillRoundedRect(x - 44, y + 5, 88, 48, 5);
      g.fillStyle(0xe1efdf, 0.8).fillRoundedRect(x - 39, y + 9, 78, 35, 4);
      g.lineStyle(2, 0xb1ccc7).lineBetween(x, y + 10, x, y + 43);
      g.fillStyle(0x799b9c).fillRoundedRect(x - 49, y - 5, 98, 13, 6);
      g.fillStyle(0xb2c9b9).fillRoundedRect(x - 45, y - 7, 90, 5, 2);
      for (const dx of [-43, 39]) g.fillStyle(0x789697).fillRoundedRect(x + dx, y + 6, 4, 51, 2);
      g.fillStyle(0xc29977).fillRoundedRect(x - 34, y + 35, 68, 6, 3);
      g.fillStyle(0x957e67).fillRect(x - 27, y + 41, 4, 12).fillRect(x + 23, y + 41, 4, 12);
      const sx = w * 0.16, sy = wallY - 30;
      g.fillStyle(0x8b9c96).fillRoundedRect(sx - 2, sy + 10, 4, 38, 2);
      g.fillStyle(0x769fac).fillCircle(sx, sy, 21);
      // 기존 정류장 표지 안의 버스 그림.
      g.fillStyle(0xfff4d4).fillRoundedRect(sx - 10, sy - 11, 20, 20, 5);
      g.fillStyle(0xa9cacc).fillRoundedRect(sx - 7, sy - 8, 14, 9, 3);
      g.fillStyle(0xfff5dc).fillCircle(sx - 5, sy + 5, 2).fillCircle(sx + 5, sy + 5, 2);
      g.fillStyle(0x5a7580).fillRoundedRect(sx - 8, sy + 9, 4, 4, 2).fillRoundedRect(sx + 4, sy + 9, 4, 4, 2);
      break;
    }
    case '둑': {
      wings(0xa9cdd0);
      for (const [x0, x1] of [[0, door.x - 48], [door.x + 48, w]]) {
        for (let y = wallY - 72; y < wallY - 35; y += 15) {
          for (let x = x0 + 9; x < x1 - 16; x += 36) g.fillStyle(0xeaf4dc, 0.65).fillRoundedRect(x, y, 17, 2, 1);
        }
        g.fillStyle(0xc5d4ae).fillRect(x0, wallY - 26, x1 - x0, 32);
        for (let row = 0; row < 2; row++) {
          for (let x = x0 + 2; x < x1 - 16; x += 24) g.fillStyle(row ? 0xc8c7b1 : 0xdde0c8).fillRoundedRect(x, wallY - 30 + row * 11, 21, 9, 4);
        }
        g.fillStyle(0xb2c99c).fillRoundedRect(x0, wallY - 37, x1 - x0, 7, 3);
      }
      for (let y = wallY - 72; y < wallY; y += 14) g.fillStyle(0xe8dfc7).fillRoundedRect(door.x - door.half, y, door.half * 2, 5, 2);
      break;
    }
    case '체육관': {
      wings(0xc8cfc4);
      for (const x of [w * 0.18, w * 0.82]) {
        window(x, wallY - 43, 80, 58, 0xacc6c9);
        g.fillStyle(0xf3ca8e).fillCircle(x, low, 20);
        g.lineStyle(1.7, 0xb28561).strokeCircle(x, low, 20).lineBetween(x - 20, low, x + 20, low).lineBetween(x, low - 20, x, low + 20);
        g.strokeEllipse(x, low, 16, 39);
      }
      // 마당의 코트 선은 바닥 그림이라 서는 자리·동선을 가리지 않는다.
      g.lineStyle(2, 0xfffaf0, 0.55).strokeRoundedRect(w * 0.14, meetY - 10, w * 0.72, 100, 16);
      g.strokeCircle(w / 2, meetY + 40, 25).lineBetween(w * 0.14, meetY + 40, w * 0.86, meetY + 40);
      break;
    }
  }
}

export function drawRoom(scene: Scene, room: Room, stage: number, seed: string, offsetY = 0, place = ''): RoomArt {
  const base = THEMES[stage] ?? THEMES[0];
  const first = stage === 0;
  const t = first ? { ...base, ground: 0xe4e5ca, path: 0xfff6df,
    wall: place === '주민센터' ? 0xbfd5c6 : place === '큰길' ? 0xebc6af : 0xf2c9ba,
    roof: place === '주민센터' ? 0x80aa9d : 0xd8927d, tree: 0x95bb8b } : base;
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
  // 옅은 길 이음새만 넣어 빈 동선을 지킨다.
  {
    for (let y = wallY + 26; y < h; y += 38) {
      g.lineStyle(1, 0xddcdae, 0.34).lineBetween(door.x - 39, y, door.x + 39, y);
      g.lineBetween(door.x + (Math.round(y / 38) % 2 ? -14 : 14), y, door.x + (Math.round(y / 38) % 2 ? -14 : 14), y + 35);
    }
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
  {
    // 벽 아랫부분에 작은 줄눈과 창틀. 장식은 사람·문 바깥에만.
    for (const x of [w * 0.1, w * 0.27, w * 0.73, w * 0.9]) {
      g.lineStyle(2, 0xfff7e8, 0.85).lineBetween(x, wallY - 86, x, wallY - 53);
      g.fillStyle(0xffffff, 0.4).fillRoundedRect(x - 12, wallY - 84, 7, 12, 3);
      g.fillStyle(t.roof, 0.5).fillRoundedRect(x - 23, wallY - 48, 46, 5, 2.5);
    }
    for (let x = 8; x < w; x += 32) {
      if (Math.abs(x - door.x) > 58) g.lineStyle(1, 0xffffff, 0.22).lineBetween(x, wallY - 19, x + 18, wallY - 19);
    }
  }
  placeMark(g, room, place, t.wall);
  g.fillStyle(0x000000, 0.08).fillRect(0, wallY - 6, w, 6);
  g.fillStyle(t.roof).fillRoundedRect(door.x - door.half - 12, wallY - 92, door.half * 2 + 24, 14, 6);
  g.fillStyle(0x4a3a33).fillRect(door.x - door.half, wallY - 78, door.half * 2, 78);
  const light = scene.add.rectangle(door.x, wallY - 39, door.half * 2 - 6, 74, 0xfff3c4).setAlpha(0);
  const panels = [-1, 1].map(side => {
    const x = door.x + side * door.half / 2;
    if (place !== '공원' && place !== '둑') return scene.add.rectangle(x, wallY - 39, door.half - 2, 76, 0xbf9878).setStrokeStyle(2, 0xa57d60);
    const gate = scene.add.graphics();
    gate.fillStyle(0x90aa88).fillRoundedRect(-18, -38, 36, 76, 5);
    for (const dx of [-10, 0, 10]) gate.fillStyle(0xe8e8ca).fillRoundedRect(dx - 2, -32, 4, 64, 2);
    gate.fillStyle(0xb3c3a0).fillRoundedRect(-18, -21, 36, 6, 2).fillRoundedRect(-18, 23, 36, 6, 2);
    return scene.add.container(x, wallY - 39, [gate]);
  });
  const knobs = [-1, 1].map(side => scene.add.circle(door.x + side * 5, wallY - 38, 2.4, 0xf2d27a));
  items.push(light, ...panels, ...knobs);
  // 옆쪽 나무·벤치 (사람 서는 곳과 길은 비운다)
  const sideXs = t.water ? [44, w - 22] : [22, w - 22];
  for (let y = wallY + 46; y < h - 20; y += 92 + r() * 40) {
    for (const x of sideXs) if (r() > 0.25) {
      const treeX = x + (r() - 0.5) * 8;
      // 큰길의 차도·보도에는 나무 그림이 걸치지 않게 한다. 난수 순서는 유지.
      const overRoad = place === '큰길' && y >= h - 184 && y - 48 <= h - 103;
      const overPond = place === '공원' && treeX < w * 0.34 && y >= h - 132 && y - 48 <= h - 78;
      const overFront = ['학교', '경로당', '군청', '버스 정류장', '둑'].includes(place) && y - 48 < wallY + 14;
      if (!overRoad && !overPond && !overFront) items.push(tree(scene, treeX, y, t.tree));
    }
  }
  const benchX = r() > 0.5 ? w * 0.2 : w * 0.8, benchY = Math.min(h - 40, residents.left.y + 110);
  items.push(scene.add.container(benchX, benchY, [
    scene.add.rectangle(0, -8, 40, 6, 0xb07a52).setRounded(2), scene.add.rectangle(0, -16, 40, 5, 0xb07a52).setRounded(2),
    scene.add.rectangle(-15, -2, 4, 10, 0x6d5444), scene.add.rectangle(15, -2, 4, 10, 0x6d5444),
  ]).setDepth(benchY));
  // 동네 장난감 — 방마다 공·고양이·비둘기를 섞는다. 고양이는 벤치 옆, 공은 벤치 반대쪽 마당 아래.
  const hasBall = r() < 0.6, hasCat = r() < 0.55;
  const kitty = hasCat ? cat(scene, benchX + (benchX < w / 2 ? 34 : -34), benchY, [0xf0a04b, 0x8f8f96, 0x3d3a40, 0xf3ece0][Math.floor(r() * 4)]) : undefined;
  const toy = hasBall ? ball(scene, benchX < w / 2 ? w * 0.7 : w * 0.3, Math.min(h - 60, residents.left.y + 90 + r() * 50)) : undefined;
  if (kitty) items.push(kitty.root);
  if (toy) items.push(toy.root);
  const pigeons: Pigeon[] = [];
  for (let i = 0; i < (hasBall && hasCat ? 0 : hasBall || hasCat ? 1 : 2); i++) {
    const at = { x: w * (0.22 + r() * 0.56), y: residents.left.y + 70 + r() * Math.max(10, h - residents.left.y - 170) };
    if (Math.abs(at.x - w / 2) < 30) at.x += 50;
    const bird = pigeon(scene, at.x, at.y);
    pigeons.push(bird); items.push(bird.root);
  }
  // 방 그림은 늘 사람들 밑에 깔린다(컨테이너 안의 깊이는 그리는 차례를 바꾸지 않는다).
  const box = scene.add.container(0, offsetY, items).setDepth(-100000);
  if (seed === ROUTE[0].ids[0]) scene.data.set('character-preview-room', box);
  return {
    box, pigeons, ball: toy, cat: kitty,
    destroy() {
      for (const bird of pigeons) { scene.tweens.killTweensOf(bird.root); scene.tweens.killTweensOf(bird.root.list); }
      if (kitty) { scene.tweens.killTweensOf(kitty.root); scene.tweens.killTweensOf(kitty.root.list); }
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
  scene.data.remove('character-preview-room');
  const g = scene.add.graphics();
  g.fillGradientStyle(0xe7acb3, 0xe7acb3, 0xffd6b4, 0xffd6b4).fillRect(0, 0, w, h * 0.32);
  g.fillStyle(0xffe7b1).fillCircle(w * 0.76, h * 0.23, 30);
  g.fillStyle(0xfff0cf, 0.4).fillEllipse(w * 0.76, h * 0.265, 85, 8);
  for (const [x, y, k] of [[w * 0.16, h * 0.2, 1], [w * 0.56, h * 0.15, 0.7]]) {
    g.fillStyle(0xfff4df, 0.75).fillEllipse(x, y, 64 * k, 13 * k).fillCircle(x - 10 * k, y - 7 * k, 12 * k).fillCircle(x + 10 * k, y - 5 * k, 9 * k);
  }
  g.fillStyle(0xb8bea0).fillEllipse(w * 0.1, h * 0.32, w, h * 0.13).fillEllipse(w * 0.88, h * 0.315, w * 0.85, h * 0.1);
  g.fillStyle(0xa4c8c6).fillRect(0, h * 0.3, w, h * 0.12);
  g.fillStyle(0xffe5b9, 0.65).fillRoundedRect(w * 0.76 - 20, h * 0.32, 40, 4, 2).fillRoundedRect(w * 0.76 - 29, h * 0.34, 58, 3, 1.5);
  for (let i = 0; i < 9; i++) g.fillStyle(0xf3f0d6, 0.5).fillRoundedRect((i * 47) % w, h * 0.325 + (i % 3) * 12, 13 + (i % 2) * 7, 2, 1);
  // 언덕 풀밭 — 따라온 주민들이 둘러서는 곳. 끝 화면 뒤 「마을로 들어가기」 로 마을(drawVillage)에 간다(기획 4차).
  g.fillStyle(0xcdddab).fillRect(0, h * 0.42, w, h * 0.58);
  g.fillStyle(0xbdd19c).fillRect(0, h * 0.42, w, 5);
  g.fillStyle(0xe2dcb4).fillEllipse(w / 2, h * 0.68, w * 1.16, h * 0.46);
  g.fillStyle(0xece6c4).fillEllipse(w / 2, h * 0.67, w * 0.96, h * 0.38);
  for (let i = 0; i < 14; i++) g.fillStyle(0xd8d1a6, 0.7).fillEllipse((i * 89 + 23) % w, h * 0.5 + ((i * 53) % Math.round(h * 0.36)), 7 + (i % 3) * 3, 3);
  for (let i = 0; i < 26; i++) {
    const fx = (i * 73) % w, fy = h * 0.44 + ((i * 37) % Math.round(h * 0.54));
    if (((fx - w / 2) / (w * 0.6)) ** 2 + ((fy - h * 0.68) / (h * 0.24)) ** 2 < 1) continue; // 가운데는 비운다
    g.fillStyle([0xfff8e4, 0xf7d391, 0xeeb1b8][i % 3]);
    for (let p = 0; p < 5; p++) g.fillCircle(fx + Math.cos(p * Math.PI * 0.4) * 2.4, fy + Math.sin(p * Math.PI * 0.4) * 2.4, 2);
    g.fillStyle(0xe6b368).fillCircle(fx, fy, 1.7);
  }
  const box = scene.add.container(0, offsetY, [g]).setDepth(-100000);
  return { box, top: { x: w / 2, y: Math.round(h * 0.68) } };
}

// ───────────────────────── 마을(기획 4차) ─────────────────────────
// Claude 의 임시 그림 — 같은 화풍(둥근 도형·파스텔·납작한 그림자). 장소마다 알아보게 다듬는 건 GPT 몫.
// 배치(어디에 무엇이)는 village.ts 가 정한다 — 여기서 자리를 옮기면 부딪힘과 어긋난다.

const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif';
/** 글씨 — 카메라가 기기 화소만큼 키우므로 글자 그림도 그만큼 촘촘하게 만든다. */
function label(scene: Scene, x: number, y: number, text: string, size: number, dpr: number, color = '#51423e') {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, resolution: dpr }).setOrigin(0.5);
}

const PLACE_LOOK: Record<PlaceId, { wall: number; roof: number }> = {
  hub: { wall: 0xbfd5c6, roof: 0x80aa9d },
  house: { wall: 0xf6d9c6, roof: 0xd9785f },
  counsel: { wall: 0xf5e3a3, roof: 0x7aa86a },
  finance: { wall: 0xadcbdb, roof: 0x5f8aa6 },
  dok: { wall: 0xe6dad4, roof: 0x8f5f6a },
  bus: { wall: 0xd2e9d9, roof: 0x4f8f7a },
  board: { wall: 0xd8b48c, roof: 0x9a7356 },
};

/** 집 한 채 — box 가 앞벽 발자리. 지붕이 그 위로 솟고, 문은 앞벽 가운데 아래. 깊이는 앞벽 아랫선(그 아래 선 사람이 앞에 보인다). */
function house(scene: Scene, place: Place, dpr: number) {
  const { x, y, w, h } = place.box, look = PLACE_LOOK[place.id];
  const g = scene.add.graphics();
  const items: Phaser.GameObjects.GameObject[] = [g];
  const face = Math.min(62, h), top = h - face;
  g.fillStyle(0x756956, 0.16).fillEllipse(w / 2, h + 2, w + 26, 16);
  // 지붕(발자리 뒤쪽 + 위로 솟음)
  g.fillStyle(look.roof).fillRoundedRect(-8, -44, w + 16, top + 54, 14);
  g.fillStyle(0xffffff, 0.16).fillRoundedRect(0, -36, w, 8, 4);
  for (let rx = 10; rx < w; rx += 22) g.fillStyle(0x000000, 0.06).fillRoundedRect(rx, -24, 12, top + 24, 4);
  // 앞벽
  g.fillStyle(look.wall).fillRect(0, top, w, face);
  g.fillStyle(0xffffff, 0.22).fillRect(0, top, w, 5);
  g.fillStyle(0x000000, 0.06).fillRect(0, h - 5, w, 5);
  for (const wx of [w * 0.18, w * 0.82]) {
    g.fillStyle(0xffffff, 0.55).fillRoundedRect(wx - 17, top + 12, 34, 28, 6);
    g.fillStyle(0xcfe8f2).fillRoundedRect(wx - 14, top + 15, 28, 22, 5);
    g.lineStyle(2, 0xfff7e8, 0.9).lineBetween(wx, top + 15, wx, top + 37);
    g.fillStyle(look.roof, 0.45).fillRoundedRect(wx - 19, top + 41, 38, 4, 2);
  }
  // 문 — 불이 켜져 「들어갈 수 있다」 를 보인다
  g.fillStyle(look.roof).fillRoundedRect(w / 2 - 22, h - 48, 44, 10, 5);
  g.fillStyle(0x4a3a33).fillRoundedRect(w / 2 - 17, h - 40, 34, 40, { tl: 8, tr: 8, bl: 0, br: 0 });
  g.fillStyle(0xfff3c4, 0.85).fillRoundedRect(w / 2 - 13, h - 36, 26, 36, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(0xf2d27a).fillCircle(w / 2 + 7, h - 18, 2.2);
  // 간판
  const plate = label(scene, w / 2, top - 12, place.name, 13, dpr);
  g.fillStyle(0xfffaf0).fillRoundedRect(w / 2 - plate.width / 2 - 10, top - 24, plate.width + 20, 24, 8);
  g.lineStyle(1.5, 0xd9c3a1).strokeRoundedRect(w / 2 - plate.width / 2 - 10, top - 24, plate.width + 20, 24, 8);
  items.push(plate);
  // 장소마다 하나씩 알아볼 거리
  const mark = scene.add.graphics();
  items.push(mark);
  if (place.id === 'hub') { // 깃발과 빨간 도장
    mark.lineStyle(2, 0x6d5444).lineBetween(w - 18, -44, w - 18, -78);
    mark.fillStyle(0xff8a73).fillTriangle(w - 17, -78, w + 8, -71, w - 17, -64);
    mark.fillStyle(0xd8584b).fillRoundedRect(14, top - 20, 14, 10, 3).fillRoundedRect(18, top - 30, 6, 12, 3).fillCircle(21, top - 32, 5);
  } else if (place.id === 'house') { // 하트
    mark.fillStyle(0xff6b57).fillCircle(w / 2 - 7, -30, 8).fillCircle(w / 2 + 7, -30, 8).fillTriangle(w / 2 - 15, -27, w / 2 + 15, -27, w / 2, -10);
    mark.fillStyle(0xffffff, 0.45).fillCircle(w / 2 - 9, -33, 2.5);
  } else if (place.id === 'counsel') { // 말풍선 「?」
    mark.fillStyle(0xfffaf0).fillRoundedRect(w / 2 - 20, -62, 40, 28, 10).fillTriangle(w / 2 - 6, -36, w / 2 + 6, -36, w / 2 - 8, -26);
    mark.lineStyle(1.5, 0xd9c3a1).strokeRoundedRect(w / 2 - 20, -62, 40, 28, 10);
    items.push(label(scene, w / 2, -48, '?', 17, dpr, '#7aa86a'));
  } else if (place.id === 'finance') { // 막대 셋과 동전
    for (const [i, bh, c] of [[0, 14, 0xf6b9a8], [1, 24, 0xfffaf0], [2, 18, 0xb9d79d]] as const) mark.fillStyle(c).fillRoundedRect(w / 2 - 24 + i * 14, -30 - bh, 10, bh, 3);
    mark.fillStyle(0xf2c661).fillCircle(w / 2 + 30, -42, 9).fillStyle(0xffffff, 0.5).fillCircle(w / 2 + 27, -45, 2.5);
  } else if (place.id === 'dok') { // 밑 빠진 독 — 금 간 항아리에서 물이 샌다
    const jx = 22, jy = h - 2;
    mark.fillStyle(0x756956, 0.18).fillEllipse(jx, jy + 2, 34, 8);
    mark.fillStyle(0xa0674b).fillEllipse(jx, jy - 18, 32, 36).fillStyle(0x8a5640).fillRoundedRect(jx - 11, jy - 40, 22, 7, 3);
    mark.fillStyle(0xffffff, 0.2).fillEllipse(jx - 6, jy - 24, 6, 14);
    mark.lineStyle(1.5, 0x5c3a2c).lineBetween(jx + 4, jy - 30, jx + 1, jy - 20).lineBetween(jx + 1, jy - 20, jx + 6, jy - 12);
    mark.fillStyle(0x9fd3e6, 0.8).fillEllipse(jx + 14, jy + 1, 18, 5);
    // 새는 물방울은 움직여서 굽지 않는다 — drawVillage 가 따로 세운다(DOK_DRIP 자리).
  }
  return scene.add.container(x, y, items).setDepth(y + h);
}

/** 쪽지 든 주민 머리 위 쪽지 — 작은 종이에 점 셋, 둥실. 장면이 주민 머리 위(오른쪽)로 따라 옮긴다. */
export function noteTag(scene: Scene, reduced: boolean) {
  const g = scene.add.graphics();
  g.fillStyle(0x756956, 0.18).fillRoundedRect(-11, -7, 24, 18, 4);
  g.fillStyle(0xfff3b0).fillRoundedRect(-12, -9, 24, 18, 4);
  g.lineStyle(1, 0xd9c3a1).strokeRoundedRect(-12, -9, 24, 18, 4);
  g.fillStyle(0x9a7356).fillCircle(-6, 0, 1.6).fillCircle(0, 0, 1.6).fillCircle(6, 0, 1.6);
  if (!reduced) scene.tweens.add({ targets: g, y: -3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return scene.add.container(0, 0, [g]);
}

/** 독상 항아리에서 새는 물방울 자리(건물 왼쪽 아래 기준) — 굽지 않고 따로 움직인다. */
const DOK_DRIP = { x: 28, y: -10 };

/** 버스 정류장 — 지붕 얹은 쉼터와 동그란 표지판. */
function busStop(scene: Scene, place: Place, dpr: number) {
  const { x, y, w, h } = place.box, look = PLACE_LOOK.bus;
  const g = scene.add.graphics();
  g.fillStyle(0x756956, 0.16).fillEllipse(w / 2, h + 2, w + 20, 14);
  g.fillStyle(0xcfe8f2, 0.75).fillRoundedRect(6, -46, w - 12, h + 30, 6);
  g.lineStyle(2, 0xffffff, 0.6).lineBetween(w / 3, -44, w / 3, h - 18).lineBetween(w * 2 / 3, -44, w * 2 / 3, h - 18);
  g.fillStyle(0x6d5444).fillRect(4, -50, 5, h + 50).fillRect(w - 9, -50, 5, h + 50);
  g.fillStyle(look.roof).fillRoundedRect(-6, -62, w + 12, 16, 7);
  g.fillStyle(0xb07a52).fillRoundedRect(20, h - 18, w - 40, 7, 3).fillRect(26, h - 11, 4, 10).fillRect(w - 30, h - 11, 4, 10);
  g.lineStyle(3, 0x6d5444).lineBetween(w + 14, h, w + 14, -66);
  g.fillStyle(look.roof).fillCircle(w + 14, -72, 15);
  const sign = label(scene, w + 14, -72, '버스', 11, dpr, '#ffffff');
  const name = label(scene, w / 2, -54, place.name, 12, dpr, '#ffffff');
  return scene.add.container(x, y, [g, sign, name]).setDepth(y + h);
}

/** 쪽지판 — 기둥 둘에 코르크 판, 색종이 쪽지들. */
function noteBoard(scene: Scene, place: Place, dpr: number) {
  const { x, y, w, h } = place.box;
  const g = scene.add.graphics();
  g.fillStyle(0x756956, 0.16).fillEllipse(w / 2, h + 2, w + 16, 10);
  g.fillStyle(0x6d5444).fillRect(8, -40, 6, h + 40).fillRect(w - 14, -40, 6, h + 40);
  g.fillStyle(0x9a7356).fillRoundedRect(-4, -60, w + 8, 12, 5);
  g.fillStyle(0xd8b48c).fillRoundedRect(0, -48, w, 44, 6);
  const colors = [0xfff3b0, 0xffd6d0, 0xd6ecff, 0xdff3d0, 0xfffaf0];
  for (let i = 0; i < 7; i++) g.fillStyle(colors[i % colors.length]).fillRect(6 + (i % 4) * 21 + (i > 3 ? 10 : 0), -44 + (i > 3 ? 20 : 0), 16, 14);
  const name = label(scene, w / 2, -54, place.name, 11, dpr, '#ffffff');
  return scene.add.container(x, y, [g, name]).setDepth(y + h);
}

/**
 * 마을 그림은 안 움직이는 것을 **처음에 한 번 그림 한 장으로 굽는다**(bake). Graphics 는 Phaser 가 장면마다 다시 계산해서,
 * 지도 한 장을 다 그리면 느린 폰에서 끊겼다(CPU 4배 느리게: 초당 9장 → 굽고 나서 아래 README 「지금 상태」).
 * 그림을 고칠 때는 house·busStop·noteBoard·tree 같은 그리는 함수만 고치면 된다 — 굽기는 저절로 따라간다.
 * 움직이는 것(분수 물방울·독에서 새는 물·고양이·비둘기)은 굽지 않는다. 새 물건은 bake 로 굽고 keep 에 자리 상자와 함께 넣는다.
 * cull(화면) — 화면(+여유) 밖의 것은 그리지 않는다.
 */
export type VillageArt = { pigeons: Pigeon[]; cats: Cat[]; cull: (view: { x: number; y: number; width: number; height: number }) => void; destroy: () => void };
type Bounds = { x0: number; y0: number; x1: number; y1: number };
type Bakeable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/**
 * obj 를 b(지도 자리 상자) 크기 그림 한 장으로 굽고 obj 는 버린다. res = 촘촘함(기기 화소 배수) — 카메라가 그만큼 키워 보이므로 맞춰 굽는다.
 * 같은 key 를 다시 쓰면(나무처럼) 한 번만 굽는다.
 */
function bake(scene: Scene, key: string, make: () => Bakeable, b: Bounds, res: number, at = { x: b.x0, y: b.y0 }) {
  if (!scene.textures.exists(key)) {
    const obj = make();
    const tex = scene.textures.addDynamicTexture(key, Math.ceil((b.x1 - b.x0) * res), Math.ceil((b.y1 - b.y0) * res))!;
    // 자리는 직접 옮기고 draw 엔 자리를 주지 않는다 — Phaser 4 의 draw(x, y) 는 WebGL 에선 원래 자리에 더하고 캔버스에선 덮어써서,
    // 지도 위 제자리(0,0 이 아닌)에 있던 건물이 그림 밖으로 밀려 빈 그림이 됐다(10-14).
    obj.setPosition((obj.x - b.x0) * res, (obj.y - b.y0) * res).setScale(res);
    tex.draw(obj);
    tex.render();
    obj.destroy();
  }
  return scene.add.image(at.x, at.y, key).setOrigin(0).setScale(1 / res);
}

/** 마을 한 장 — 바닥(풀·길·광장·연못)과 건물·나무·장난감. 사람(Dude)은 장면이 세운다. */
export function drawVillage(scene: Scene, dpr: number): VillageArt {
  const r = rng('village');
  const W = VILLAGE_W, H = VILLAGE_H;
  // 지난번에 구운 그림이 남아 있으면(장면을 다시 열면) 지우고 다시 굽는다.
  for (const key of scene.textures.getTextureKeys()) if (key.startsWith('village-')) scene.textures.remove(key);
  const sharp = Math.min(dpr, 3), soft = Math.min(dpr, 2); // 글씨 든 건물은 또렷하게, 넓은 바닥은 메모리를 아껴(바닥 다섯 장 ≈ 25MB)
  const culled: { obj: Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject; b: Bounds }[] = [];
  const keep = <T extends Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject>(obj: T, b: Bounds) => { culled.push({ obj, b }); return obj; };
  // 바닥은 300px 띠마다 따로 굽는다 — 띠를 걸치는 것은 걸친 띠마다 그리고, 구울 때 띠 밖은 잘려서 이음매 없이 이어진다.
  const BAND = 300;
  const bands = Array.from({ length: Math.ceil(H / BAND) }, () => scene.add.graphics());
  const paint = (y0: number, y1: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    for (let i = Math.max(0, Math.floor(y0 / BAND)); i <= Math.min(bands.length - 1, Math.floor(y1 / BAND)); i++) draw(bands[i]);
  };
  // 풀밭 — 맨 위 띠는 언덕과 노을
  paint(0, 131, g => {
    g.fillGradientStyle(0xf6c9a8, 0xf6c9a8, 0xfbe4c6, 0xfbe4c6).fillRect(0, 0, W, 90);
    g.fillStyle(0xb8cf9b).fillEllipse(W * 0.2, 96, W * 0.7, 70).fillEllipse(W * 0.78, 92, W * 0.8, 60);
  });
  bands.forEach((g, i) => { const top = Math.max(100, i * BAND); g.fillStyle(0xd3e3b4).fillRect(0, top, W, Math.min(H, (i + 1) * BAND) - top); });
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = 110 + r() * (H - 110), w = 30 + r() * 60, h = 8 + r() * 10;
    paint(y - h, y + h, g => g.fillStyle(0xffffff, 0.16).fillEllipse(x, y, w, h));
  }
  // 길
  for (const road of ROADS) paint(road.y, road.y + road.h, g => g.fillStyle(0xf1e8cf).fillRoundedRect(road.x, road.y, road.w, road.h, 18));
  for (const road of ROADS) paint(road.y, road.y + road.h, g => g.lineStyle(1, 0xddcdae, 0.5).strokeRoundedRect(road.x + 4, road.y + 4, road.w - 8, road.h - 8, 14));
  // 광장
  paint(PLAZA.y - PLAZA.r, PLAZA.y + PLAZA.r, g => {
    g.fillStyle(0xe7dcc0).fillEllipse(PLAZA.x, PLAZA.y, PLAZA.r * 2.3, PLAZA.r * 1.9);
    g.fillStyle(0xf3ead2).fillEllipse(PLAZA.x, PLAZA.y, PLAZA.r * 2.1, PLAZA.r * 1.72);
    for (const k of [0.45, 0.72]) g.lineStyle(1.5, 0xe0d2b2, 0.8).strokeEllipse(PLAZA.x, PLAZA.y, PLAZA.r * 2.1 * k, PLAZA.r * 1.72 * k);
  });
  // 연못
  paint(POND.y - 4, POND.y + POND.h + 8, g => {
    g.fillStyle(0x7fbcd2).fillEllipse(POND.x + POND.w / 2, POND.y + POND.h / 2 + 3, POND.w + 10, POND.h + 6);
    g.fillStyle(0x9fd3e6).fillEllipse(POND.x + POND.w / 2, POND.y + POND.h / 2, POND.w, POND.h);
    for (const [px, py] of [[0.3, 0.35], [0.62, 0.6], [0.45, 0.72]]) g.fillStyle(0x8cc07a).fillCircle(POND.x + POND.w * px, POND.y + POND.h * py, 7).fillStyle(0xf7c6cf).fillCircle(POND.x + POND.w * px + 3, POND.y + POND.h * py - 2, 2.5);
    for (let i = 0; i < 4; i++) g.lineStyle(2, 0xffffff, 0.45).lineBetween(POND.x + 30 + i * 28, POND.y + 30 + (i % 2) * 22, POND.x + 44 + i * 28, POND.y + 30 + (i % 2) * 22);
  });
  // 꽃 — 길 위는 비운다
  for (let i = 0; i < 90; i++) {
    const fx = r() * W, fy = 130 + r() * (H - 160);
    if (ROADS.some(b => fx > b.x - 6 && fx < b.x + b.w + 6 && fy > b.y - 6 && fy < b.y + b.h + 6)) continue;
    paint(fy - 6, fy + 6, g => {
      g.fillStyle([0xfff8e4, 0xf7d391, 0xeeb1b8, 0xc9b6e8][i % 4]);
      for (let p = 0; p < 5; p++) g.fillCircle(fx + Math.cos(p * Math.PI * 0.4) * 2.4, fy + Math.sin(p * Math.PI * 0.4) * 2.4, 2);
      g.fillStyle(0xe6b368).fillCircle(fx, fy, 1.6);
    });
  }
  bands.forEach((g, i) => {
    const b = { x0: 0, x1: W, y0: i * BAND, y1: Math.min(H, (i + 1) * BAND) };
    keep(bake(scene, `village-ground-${i}`, () => g, b, soft).setDepth(-100000), b);
  });
  // 분수 — 돌은 굽고 물방울은 움직인다
  const cx = FOUNTAIN.x + FOUNTAIN.w / 2, cy = FOUNTAIN.y + FOUNTAIN.h / 2;
  const fb = { x0: FOUNTAIN.x - 30, x1: FOUNTAIN.x + FOUNTAIN.w + 30, y0: FOUNTAIN.y - 50, y1: FOUNTAIN.y + FOUNTAIN.h + 34 };
  keep(bake(scene, 'village-fountain', () => {
    const f = scene.add.graphics();
    f.fillStyle(0x756956, 0.15).fillEllipse(cx, cy + 22, FOUNTAIN.w + 20, 18);
    f.fillStyle(0xd6d2c4).fillEllipse(cx, cy + 8, FOUNTAIN.w + 8, 40).fillStyle(0x9fd3e6).fillEllipse(cx, cy + 4, FOUNTAIN.w - 6, 28);
    f.fillStyle(0xd6d2c4).fillRoundedRect(cx - 7, cy - 34, 14, 40, 5).fillEllipse(cx, cy - 34, 30, 10);
    f.fillStyle(0x9fd3e6).fillEllipse(cx, cy - 36, 22, 6);
    return f;
  }, fb, sharp).setDepth(FOUNTAIN.y + FOUNTAIN.h), fb);
  const spray = [-1, 1, 0].map(k => scene.add.circle(cx + k * 6, cy - 40, 2.6, 0xd9f1fa).setDepth(FOUNTAIN.y + FOUNTAIN.h + 1));
  spray.forEach((drop, i) => scene.tweens.add({ targets: drop, x: cx + (i - 1) * 22, y: cy, alpha: 0.2, duration: 800, delay: i * 260, repeat: -1, ease: 'Quad.easeIn' }));
  // 건물 · 빈 터 · 남쪽 문
  const live: Phaser.GameObjects.GameObject[] = [...spray];
  for (const place of PLACES) {
    const { x, y, w, h } = place.box, b = { x0: x - 24, x1: x + w + 36, y0: y - 92, y1: y + h + 12 };
    const make = () => (place.id === 'bus' ? busStop(scene, place, dpr) : place.id === 'board' ? noteBoard(scene, place, dpr) : house(scene, place, dpr));
    keep(bake(scene, `village-${place.id}`, make, b, sharp).setDepth(y + h), b);
    if (place.id === 'dok') {
      const drop = scene.add.circle(x + DOK_DRIP.x, y + h + DOK_DRIP.y, 2.2, 0x9fd3e6).setDepth(y + h + 1);
      scene.tweens.add({ targets: drop, y: y + h - 2, alpha: 0, duration: 900, repeat: -1, ease: 'Quad.easeIn' });
      live.push(drop);
    }
  }
  const lb = { x0: LOT.x - 8, x1: LOT.x + LOT.w + 8, y0: LOT.y - 30, y1: LOT.y + LOT.h + 8 };
  keep(bake(scene, 'village-lot', () => {
    const lot = scene.add.graphics();
    lot.fillStyle(0xe2d6b8).fillRoundedRect(0, -10, LOT.w, LOT.h + 10, 10);
    for (let px = 0; px <= LOT.w; px += 20) lot.fillStyle(0xc9a27e).fillRoundedRect(px - 3, LOT.h - 22, 6, 24, 2).fillRoundedRect(px - 3, -24, 6, 24, 2);
    lot.fillStyle(0xd8b48c).fillRect(0, LOT.h - 16, LOT.w, 4).fillRect(0, -18, LOT.w, 4);
    lot.fillStyle(0x6d5444).fillRect(LOT.w / 2 - 2, 20, 4, 40).fillStyle(0xfffaf0).fillRoundedRect(LOT.w / 2 - 62, 6, 124, 24, 6);
    return scene.add.container(LOT.x, LOT.y, [lot, label(scene, LOT.w / 2, 18, '빈 터 · 새 가게 자리', 11, dpr)]);
  }, lb, sharp).setDepth(LOT.y + LOT.h), lb);
  const gb = { x0: 440, x1: 600, y0: GATE_Y - 70, y1: GATE_Y + 34 };
  keep(bake(scene, 'village-gate', () => {
    const gate = scene.add.graphics();
    gate.fillStyle(0x9a7356).fillRoundedRect(-62, -70, 10, 70, 4).fillRoundedRect(52, -70, 10, 70, 4).fillStyle(0xd9785f).fillRoundedRect(-74, -88, 148, 24, 10);
    return scene.add.container(520, GATE_Y + 26, [gate, label(scene, 0, -76, VILLAGE_NAME, 12, dpr, '#ffffff')]);
  }, gb, sharp).setDepth(GATE_Y + 26), gb);
  // 나무 — 색 넷을 한 번씩 굽고 그림을 여러 번 쓴다. 길·건물·광장을 비워 가장자리와 빈 풀밭에.
  const near = (at: Point, b: { x: number; y: number; w: number; h: number }, m: number) => at.x > b.x - m && at.x < b.x + b.w + m && at.y > b.y - m && at.y < b.y + b.h + m + 40;
  const TREE = { x0: -30, x1: 30, y0: -60, y1: 8 };
  for (let ty = 150; ty < H - 10; ty += 64) for (let tx = 24; tx < W; tx += 64) {
    const at = { x: tx + (r() - 0.5) * 30, y: ty + (r() - 0.5) * 24 };
    if (r() < 0.45) continue;
    if (ROADS.some(b => near(at, b, 18)) || PLACES.some(p => near(at, p.box, 34)) || near(at, LOT, 30) || near(at, POND, 20)) continue;
    if (((at.x - PLAZA.x) / (PLAZA.r * 1.25)) ** 2 + ((at.y - PLAZA.y) / (PLAZA.r * 1.05)) ** 2 < 1) continue;
    const color = [0x8cc07a, 0x6fae6a, 0x9cba8a, 0x5fa585][Math.floor(r() * 4)];
    const b = { x0: at.x + TREE.x0, x1: at.x + TREE.x1, y0: at.y + TREE.y0, y1: at.y + TREE.y1 };
    keep(bake(scene, `village-tree-${color}`, () => tree(scene, 0, 0, color), TREE, sharp, { x: b.x0, y: b.y0 }).setDepth(at.y), b);
  }
  // 광장 벤치·가로등 — 하나씩 굽고 여러 번
  const BENCH = { x0: -24, x1: 24, y0: -22, y1: 4 }, LAMP = { x0: -12, x1: 12, y0: -66, y1: 4 };
  for (const [bx, by] of [[PLAZA.x - 118, PLAZA.y + 70], [PLAZA.x + 118, PLAZA.y + 70]]) {
    keep(bake(scene, 'village-bench', () => scene.add.container(0, 0, [
      scene.add.rectangle(0, -8, 40, 6, 0xb07a52).setRounded(2), scene.add.rectangle(0, -16, 40, 5, 0xb07a52).setRounded(2),
      scene.add.rectangle(-15, -2, 4, 10, 0x6d5444), scene.add.rectangle(15, -2, 4, 10, 0x6d5444),
    ]), BENCH, sharp, { x: bx + BENCH.x0, y: by + BENCH.y0 }).setDepth(by), { x0: bx - 24, x1: bx + 24, y0: by - 22, y1: by + 4 });
  }
  for (const [lx, ly] of [[PLAZA.x - 150, PLAZA.y - 40], [PLAZA.x + 150, PLAZA.y - 40], [PLAZA.x - 60, PLAZA.y + 130], [PLAZA.x + 60, PLAZA.y + 130]]) {
    keep(bake(scene, 'village-lamp', () => scene.add.container(0, 0, [scene.add.ellipse(0, 0, 14, 5, 0x2d3a2e, 0.15), scene.add.rectangle(0, -26, 4, 52, 0x6d6a73).setRounded(2), scene.add.circle(0, -54, 7, 0xfff3c4), scene.add.circle(0, -54, 11, 0xfff3c4, 0.25)]),
      LAMP, sharp, { x: lx + LAMP.x0, y: ly + LAMP.y0 }).setDepth(ly), { x0: lx - 12, x1: lx + 12, y0: ly - 66, y1: ly + 4 });
  }
  const cats = [cat(scene, PLAZA.x - 92, PLAZA.y + 72, 0xf0a04b), cat(scene, 300, 372, 0x8f8f96)];
  for (const kitty of cats) kitty.root.setDepth(kitty.at.y);
  const pigeons = [[PLAZA.x + 40, PLAZA.y + 90], [PLAZA.x + 70, PLAZA.y + 100], [PLAZA.x - 50, PLAZA.y - 66], [560, 1200]].map(([px, py]) => pigeon(scene, px, py));
  const MARGIN = 90; // 화면 밖 이만큼까지는 그려 둔다(걸어가며 들어올 때 갑자기 나타나지 않게)
  return {
    pigeons, cats,
    cull(view) {
      const x0 = view.x - MARGIN, x1 = view.x + view.width + MARGIN, y0 = view.y - MARGIN, y1 = view.y + view.height + MARGIN;
      for (const { obj, b } of culled) obj.setVisible(b.x1 > x0 && b.x0 < x1 && b.y1 > y0 && b.y0 < y1);
    },
    destroy() {
      [...culled.map(c => c.obj), ...live, ...cats.map(c => c.root), ...pigeons.filter(p => !p.fled).map(p => p.root)].forEach(t => t.destroy());
    },
  };
}
