/*
  고양이·강아지 — GPT 검토판(game/review/round/pets.ts, 10-15 사용자 승인)을 본편으로 옮겼다.
  공개판 고양이의 비율(작은 눈·짧은 몸·귀·볼·수염·줄무늬·앉은 모습)을 기준으로, 강아지도 같은 표현에 맞췄다.
  걷지 않는다 — 한자리에 앉아 숨쉬기·깜빡임·꼬리, 가끔 고양이 세수·강아지 귀 긁기(pet-motion.ts). 마을 광장·길에 둔다(draw.ts drawVillage).
*/
import Phaser from 'phaser';
import { petPoseAt, type PetKind } from './pet-motion';

/** 공개판 고양이 얼굴을 그대로 — 작은 눈, 짧은 머리, 수염과 줄무늬. 강아지는 늘어진 귀와 흰 입가. */
function petHead(scene: Phaser.Scene, kind: PetKind, fur: number) {
  const s = scene.add, cat = kind === 'cat', face = s.graphics();
  if (cat) {
    face.fillStyle(fur).fillTriangle(-11, -1, -10, -11, -3, -5).fillTriangle(5, -5, 12, -11, 13, 0);
    face.fillStyle(0xe9a4a1).fillTriangle(-9, -4, -9, -8, -6, -5).fillTriangle(7, -5, 11, -8, 11, -4);
    face.fillStyle(0x514651, 0.4).fillRoundedRect(-3, -7, 2, 4, 1).fillRoundedRect(1, -7, 2, 4, 1);
    face.lineStyle(1, 0x514651, 0.7).lineBetween(-10, 3, -6, 4).lineBetween(7, 4, 11, 3);
  }
  face.lineStyle(1, 0x514651, 0.7).lineBetween(0, 5, -2, 6).lineBetween(0, 5, 2, 6);
  const eyes = [-4.5, 4.5].map(x => s.circle(x, 0, 1.2, 0x332e38));
  const tongue = s.ellipse(0, 6.5, 1.6, 1.5, 0xe5959e).setVisible(false);
  const ears = cat ? [] : [s.ellipse(-11.5, 0, 8, 15, 0xa38167), s.ellipse(11.5, 0, 8, 15, 0xa38167)];
  const root = s.container(0, 0, [...ears, s.ellipse(0, 0, 24, 20, fur),
    ...(cat ? [] : [s.ellipse(0, 4, 11, 7, 0xfff5e6, 0.8)]), face, ...eyes,
    s.ellipse(-8, 3, 4, 2.5, 0xef9d99, 0.7), s.ellipse(9, 3, 4, 2.5, 0xef9d99, 0.7),
    cat ? s.triangle(0, 4, 0, 0, 3, 0, 1.5, 2, 0xb96f76) : s.ellipse(0, 3.4, 3.2, 2.5, 0x665047), tongue]);
  return { root, eyes, tongue };
}

/** 앉은 동물 하나 — 무엇을 하든 처음 자리(anchor)에서 움직이지 않는다. fur 를 주면 그 털색(고양이 회색 같은). */
export class Pet {
  readonly root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private head: ReturnType<typeof petHead>;
  private tail: Phaser.GameObjects.Rectangle;
  private paw: Phaser.GameObjects.Ellipse;
  private feet: Phaser.GameObjects.Ellipse[];
  private clock = 0;
  constructor(scene: Phaser.Scene, readonly kind: PetKind, readonly anchor: { x: number; y: number }, scale = 1, fur = kind === 'cat' ? 0xf0a04b : 0xc9a27c) {
    const s = scene.add, cat = kind === 'cat', cream = 0xfff5e6;
    this.tail = s.rectangle(10, -3, 5, cat ? 16 : 11, fur).setRounded(2.5).setOrigin(0.5, 1);
    this.feet = [-7, 5].map(x => s.ellipse(x, -2, 7, 4, cream, 0.9));
    this.head = petHead(scene, kind, fur);
    this.paw = s.ellipse(-7, -2, 5, 4, cream, 0.9).setVisible(false);
    this.body = s.container(0, 0, [this.tail, s.ellipse(1, -8, 22, 18, fur), s.ellipse(0, -7, 12, 12, cream, 0.7), this.head.root, ...this.feet, this.paw]);
    this.root = s.container(anchor.x, anchor.y, [s.ellipse(0, 1, 27, 7, 0x756956, 0.15), this.body]).setScale(scale).setDepth(anchor.y);
    this.reset();
  }
  /** 둘이 같은 박자로 세수하지 않게 강아지는 9초 앞에서 시작한다. */
  reset(time = this.kind === 'cat' ? 0 : 9000) { this.clock = time; this.step(0, false); }
  /** 한 프레임 — 쉬고 있으면(모션 줄이기·일시정지) 기본 자세로 멈춘다. sleeping 이면 눈을 감고 세수하지 않는다. */
  step(deltaMs: number, resting: boolean, sleeping = false) {
    if (!resting && Number.isFinite(deltaMs)) this.clock += Math.max(0, Math.min(deltaMs, 50));
    const pose = petPoseAt(this.clock, this.kind, resting, sleeping);
    this.root.setPosition(this.anchor.x, this.anchor.y);
    this.body.setScale(1 - pose.breath * 0.4, 1 + pose.breath);
    this.head.root.setPosition(-2, -18 + pose.headY).setAngle(pose.headAngle);
    this.tail.setAngle(pose.tailAngle);
    this.feet.forEach((foot, i) => foot.setAlpha(i === (this.kind === 'cat' ? 0 : 1) ? 0.9 * (1 - pose.groom) : 0.9));
    this.paw.setVisible(pose.groom > 0).setAlpha(pose.groom * 0.9).setPosition(pose.pawX, pose.pawY).setAngle(pose.pawAngle);
    this.head.tongue.setVisible(this.kind === 'cat' && pose.groom > 0.5);
    this.head.eyes.forEach(eye => eye.setScale(1, pose.eyes));
  }
}
