/*
  둥근 도형·파스텔·납작한 그림자. 승인된 귀여움 시안을 열다섯 장소·버스로 확장(README 디테일 차례).
  그림을 바꿀 때는 이 파일만 바꾼다. 장면(JourneyScene)은 여기 있는 함수 이름과
  돌려주는 모양(Dude·RoomArt)만 쓴다.
*/
import Phaser from 'phaser';
import { FEEL } from './feel';
import { ROUTE } from './content';
import type { Point, Room } from './room';
import { ERRANDS } from './quests';
import { PLACES, PLAZA, FOUNTAIN, POND, BRIDGE_Y, PITCH, GOAL, ROADS, WORKS, VILLAGE_W, VILLAGE_H, GATE_Y, VILLAGE_NAME, type Place, type PlaceId, type WorksState, type WorkId } from './village';

type Scene = Phaser.Scene;
type Container = Phaser.GameObjects.Container;

import { rng, lookFrom as seedLook, hairColor, BROW, type Look } from './look';
import { sfx } from './sfx';
import type { Outcome } from './outcomes';
import { streamOf, catOf, type TwistKind } from './twists';
import { Pet } from './pets';
export { lookFrom, toLook, type Look } from './look';

/**
 * 사람 그림 — GPT 검토판 game/review/round/avatar.ts(10-15 사용자 승인)의 둥근 몸·짧은 다리·머리 열 가지·옷 아홉 가지·
 * 머리색 넣는 방식(전체 단색·앞머리 한 줄·고루 섞기·양옆만, 섞는 색은 따로)·안경·머리 장식(머리띠·머리핀·작은 리본)을 그대로 옮겼다.
 * 머리 모양·옷·안경·장식은 고른 대로(look.style·top·glasses·accessory), 바지·신발·눈썹·수염·미소선은 기본 조합(look.form) 것.
 * 검토판은 머리 끝이 64px 이라 56/64 로 줄여 예전 사람 키에 맞춘다 — 말풍선·하트·이름표 자리가 그대로다.
 */
const FIGURE_SCALE = 56 / 64;
/** bakeAt — 머리·옷 그림을 몇 배 화소로 구울지(bake). 0 이면 굽지 않는다(크게 당겨 보는 내 모습·시민증 사진). */
function figure(scene: Scene, look: Look, bakeAt: number) {
  const s = scene.add, f = look.form, style = look.style, top = look.top, pattern = look.pattern, accent = look.accent;
  const hair = hairColor(look), skin = look.skin, coat = look.coat;
  const path = (x: number, y: number) => new Phaser.Curves.Path(x, y);
  const back = s.graphics().fillStyle(hair);
  if (style === 'bob') back.fillPoints(path(-17, -43).cubicBezierTo(0, -61, -18, -56, -10, -61).cubicBezierTo(18, -42, 13, -61, 18, -53).lineTo(18, -32)
    .cubicBezierTo(8, -28, 18, -26, 12, -25).lineTo(-9, -28).cubicBezierTo(-18, -35, -16, -25, -19, -28).closePath().getPoints(18), true);
  if (style === 'bun') back.fillCircle(2, -62, 7.5).fillEllipse(0, -49, 31, 23);
  if (style === 'cloud') back.fillCircle(-13, -43, 6).fillCircle(13, -43, 6).fillCircle(-10, -35, 5).fillCircle(10, -35, 5);
  if (style === 'shoulder') back.fillPoints(path(-17, -43).cubicBezierTo(0, -61, -18, -57, -10, -61).cubicBezierTo(18, -42, 13, -61, 18, -53).lineTo(19, -30)
    .cubicBezierTo(10, -26, 21, -25, 14, -24).lineTo(-11, -26).cubicBezierTo(-19, -31, -17, -24, -21, -26).closePath().getPoints(18), true);
  if (style === 'lowTie') back.fillEllipse(0, -49, 31, 24).fillEllipse(13, -31, 12, 11).fillCircle(16, -33, 4);
  const legs = [-6, 6].map(x => s.container(x, -6, [
    s.rectangle(0, 0, 10.5, 8, f.pants).setRounded(4),
    s.ellipse(0, 5.5, 12, 5, f.shoes ?? 0xfff8e8),
    s.rectangle(0, 6.6, 9, 1.2, 0xd3c2a9).setRounded(0.6),
  ]));
  const sleeveColor = top === 'apron' ? 0xfff8e8 : top === 'vest' ? 0xf1c7bd : coat;
  const sleeves = [-1, 1].map(sign => s.container(sign * 12, -25, [
    s.ellipse(sign * 2, 6.5, 10, 18, sleeveColor).setAngle(-sign * 23),
    s.circle(sign * 5, 15, 3.5, skin),
  ]));
  const torso = s.ellipse(0, -18, 32, 26, top === 'apron' ? 0xfff8e8 : coat);
  const wear = s.graphics();
  if (top === 'cardigan') {
    wear.fillStyle(0xfff8e8).fillPoints(path(-4, -30).cubicBezierTo(-4, -9, -5, -24, -4, -17).lineTo(4, -9).cubicBezierTo(4, -30, 4, -17, 5, -24).closePath().getPoints(12), true);
    wear.fillStyle(0xb56e5e, 0.65);
    for (const cy of [-24, -18, -12]) wear.fillCircle(7, cy, 1.25);
    wear.fillStyle(0x755548, 0.09).fillEllipse(-7, -8, 11, 2).fillEllipse(9, -8, 9, 2);
  }
  if (top === 'stripes') {
    wear.fillStyle(0xfff8e8, 0.95);
    for (const [y, width] of [[-26, 24], [-20, 31], [-14, 26]]) wear.fillRoundedRect(-width / 2, y, width, 3.3, 1.1);
  }
  if (top === 'hoodie') {
    wear.fillStyle(0xfff8e8, 0.75).fillEllipse(0, -28, 17, 8);
    wear.fillStyle(coat).fillEllipse(0, -27, 11, 5);
    wear.lineStyle(1, 0xfff8e8, 0.8).lineBetween(-3, -25, -3, -20).lineBetween(3, -25, 3, -20);
    wear.fillStyle(0xffffff, 0.18).fillRoundedRect(-8, -16, 16, 7, 3);
    wear.lineStyle(0.8, 0xffffff, 0.4).lineBetween(-5, -15, -7, -12).lineBetween(5, -15, 7, -12);
  }
  if (top === 'apron') {
    wear.fillStyle(coat).fillEllipse(0, -15, 27, 21).fillRoundedRect(-7, -28, 14, 17, 3);
    wear.lineStyle(2, 0xf5e8d0).lineBetween(-6, -29, -10, -17).lineBetween(6, -29, 10, -17);
    wear.fillStyle(0xffffff, 0.3).fillRoundedRect(-5, -17, 10, 6, 2);
  }
  if (top === 'jacket') {
    wear.fillStyle(0xfff8e8, 0.85).fillTriangle(-8, -30, 0, -26, -4, -22).fillTriangle(8, -30, 0, -26, 4, -22);
    wear.lineStyle(1.25, 0xfff8e8, 0.85).lineBetween(0, -27, 0, -7);
    wear.lineStyle(1.1, 0x5d7f79, 0.45).lineBetween(-8, -18, -10, -12).lineBetween(8, -18, 10, -12);
    wear.fillStyle(0xf8e8cb).fillCircle(0, -22, 1.3);
  }
  if (top === 'vest') {
    wear.fillStyle(0xfff8e8).fillTriangle(-7, -30, 7, -30, 0, -21);
    wear.fillStyle(0xf1c7bd).fillTriangle(-6, -30, 0, -26, -3, -24).fillTriangle(6, -30, 0, -26, 3, -24);
    wear.fillStyle(0x8e697d, 0.7).fillCircle(0, -18, 1.5).fillCircle(0, -12, 1.5);
  }
  if (top === 'shirt') {
    wear.fillStyle(0xfff8e8, 0.9).fillTriangle(-8, -30, 0, -25, -4, -21).fillTriangle(8, -30, 0, -25, 4, -21);
    wear.lineStyle(0.8, 0x8a725d, 0.4).lineBetween(0, -25, 0, -7);
    wear.fillStyle(0x8a725d, 0.65);
    for (const cy of [-21, -16, -11]) wear.fillCircle(0, cy, 0.9);
    wear.lineStyle(0.8, 0x8a725d, 0.35).strokeRoundedRect(5, -21, 6, 5, 1);
  }
  if (top === 'blazer') {
    wear.fillStyle(0xfff8e8).fillTriangle(-4, -30, 4, -30, 0, -8);
    wear.fillStyle(0xffffff, 0.25).fillTriangle(-10, -28, -4, -30, -2, -15).fillTriangle(10, -28, 4, -30, 2, -15);
    wear.fillStyle(0x5b6574, 0.55).fillCircle(3, -18, 1.2).fillCircle(3, -12, 1.2);
    wear.lineStyle(1, 0x5b6574, 0.35).lineBetween(-11, -13, -6, -13).lineBetween(6, -13, 11, -13);
  }
  if (top === 'knit') {
    wear.lineStyle(2, 0xfff8e8, 0.75).beginPath().arc(0, -31, 6, 0, Math.PI).strokePath();
    wear.lineStyle(1.2, 0xfff8e8, 0.4).lineBetween(-8, -8, 8, -8);
  }
  const neck = s.ellipse(0, -30, 8, 5, skin);
  const ears = [-14, 14].map(x => s.circle(x, -40, 3.5, skin));
  const head = s.ellipse(0, -42, 29, 26, skin);
  const fringe = s.graphics().fillStyle(hair);
  const fill = (p: Phaser.Curves.Path) => fringe.fillPoints(p.closePath().getPoints(18), true);
  if (style === 'bob') fill(path(-17, -43).cubicBezierTo(0, -61, -17, -56, -10, -61).cubicBezierTo(17, -43, 12, -61, 17, -53).lineTo(14, -38)
    .cubicBezierTo(8, -48, 13, -42, 10, -43).cubicBezierTo(2, -42, 8, -41, 5, -40)
    .cubicBezierTo(-3, -50, 0, -43, -2, -47).cubicBezierTo(-12, -42, -5, -45, -9, -44).lineTo(-14, -38));
  if (style === 'wave') fill(path(-16, -44).cubicBezierTo(-9, -57, -19, -51, -14, -57).cubicBezierTo(4, -61, -10, -62, -2, -64)
    .cubicBezierTo(15, -54, 9, -65, 17, -59).cubicBezierTo(13, -41, 21, -49, 17, -42).lineTo(11, -47)
    .cubicBezierTo(2, -48, 7, -51, 5, -52).cubicBezierTo(-8, -47, -1, -44, -6, -45).lineTo(-12, -41));
  if (style === 'curls') {
    for (const [cx, cy, r] of [[-14, -47, 5], [-14, -54, 5.5], [-8, -59, 6], [0, -60, 6], [8, -58, 6], [14, -53, 5.5], [14, -46, 4.5]]) fringe.fillCircle(cx, cy, r);
    fringe.fillEllipse(0, -52, 28, 14).fillCircle(-5, -47.5, 3).fillCircle(5, -47.5, 3);
  }
  if (style === 'bun') fill(path(-15, -43).cubicBezierTo(0, -59, -16, -55, -8, -60).cubicBezierTo(15, -44, 12, -59, 17, -51).lineTo(12, -43)
    .cubicBezierTo(-7, -48, 9, -50, 2, -54).lineTo(-13, -41));
  if (style === 'part') fill(path(-16, -43).cubicBezierTo(4, -60, -16, -56, -8, -62).cubicBezierTo(15, -42, 17, -60, 18, -48).lineTo(12, -46)
    .cubicBezierTo(8, -54, 10, -48, 8, -51).cubicBezierTo(-12, -44, 4, -48, -5, -45).lineTo(-14, -39));
  if (style === 'cloud') {
    for (const [cx, cy, r] of [[-14, -49, 6], [-10, -56, 6.5], [-3, -59, 6.5], [5, -58, 6.5], [12, -54, 6.5], [15, -47, 5.5]]) fringe.fillCircle(cx, cy, r);
    fringe.fillEllipse(0, -52, 26, 14);
  }
  if (style === 'forehead') fill(path(-16, -42).cubicBezierTo(-12, -55, -18, -47, -17, -53).cubicBezierTo(11, -56, -7, -60, 5, -60)
    .cubicBezierTo(16, -42, 17, -54, 18, -47).lineTo(12, -45).cubicBezierTo(-12, -45, 12, -57, -10, -57));
  if (style === 'shoulder') fill(path(-17, -43).cubicBezierTo(5, -60, -18, -56, -8, -63).cubicBezierTo(17, -42, 16, -59, 19, -50).lineTo(13, -40)
    .cubicBezierTo(8, -54, 13, -46, 11, -51).cubicBezierTo(-13, -43, 4, -49, -8, -46).lineTo(-15, -38));
  if (style === 'crop') fill(path(-16, -43).cubicBezierTo(-10, -57, -17, -51, -15, -56).cubicBezierTo(10, -57, -5, -60, 5, -60)
    .cubicBezierTo(16, -43, 16, -55, 18, -49).lineTo(12, -44).lineTo(10, -51).cubicBezierTo(-11, -51, 4, -53, -5, -53).lineTo(-13, -42));
  if (style === 'lowTie') fill(path(-16, -44).cubicBezierTo(2, -60, -17, -55, -7, -62).cubicBezierTo(16, -43, 15, -59, 19, -50).lineTo(13, -39).lineTo(10, -49)
    .cubicBezierTo(-12, -46, 4, -52, -4, -48).lineTo(-14, -39));
  // 섞는 색 — 부분(앞머리 한 줄·양옆)은 헤어라인에 맞추고, 고루 섞기는 hairColor 가 앞뒤 머리를 섞고 가는 머릿결을 더한다.
  const openHairline = style === 'forehead' || style === 'crop', curly = style === 'curls' || style === 'cloud';
  if (pattern === 'streak') {
    const sidePart = style === 'part' || style === 'shoulder' || style === 'lowTie';
    const x = sidePart ? 5 : 0, y = curly ? -64 : style === 'wave' ? -61 : -59;
    const endX = sidePart ? -9 : -6, endY = openHairline ? -53 : style === 'bob' ? -47 : -49;
    fringe.fillStyle(accent).fillPoints(path(x - 1.5, y).lineTo(x + 1.8, y + 0.4).cubicBezierTo(endX + 1.4, endY, x + 1, y + 5, endX + 3, endY - 3)
      .lineTo(endX - 1.3, endY - 1).cubicBezierTo(x - 1.5, y, endX, endY - 5, x - 2, y + 4).closePath().getPoints(16), true);
  }
  if (pattern === 'mixed') {
    const y = openHairline ? -56.5 : curly ? -61 : -57, length = openHairline ? 1.7 : 4.5;
    fringe.lineStyle(1.15, accent, 0.75);
    for (const [x, dy] of [[-11, 2], [-6, 0], [0, -1], [6, 0], [11, 2]])
      fringe.strokePoints(path(x, y + dy).cubicBezierTo(x - 2, y + dy + length, x - 0.2, y + dy + 1, x - 1, y + dy + length - 1).getPoints(8), false);
    if (!openHairline) for (const x of [-8, 1, 9]) fringe.lineBetween(x, -53, x - 1.2, -50.5);
    if (style === 'bob' || style === 'shoulder') back.lineStyle(1.3, accent, 0.8).lineBetween(-16, -39, -15, -33).lineBetween(16, -37, 15, -31);
    if (style === 'bun') back.lineStyle(1.4, accent, 0.8).lineBetween(1, -67, -1, -63).lineBetween(6, -65, 4, -61);
    if (style === 'lowTie') back.lineStyle(1.4, accent, 0.8).lineBetween(13, -35, 16, -31);
  }
  if (pattern === 'temples') for (const sign of [-1, 1])
    fringe.fillStyle(accent).fillPoints(path(sign * 14.5, -48).lineTo(sign * 12, -47).cubicBezierTo(sign * 13, -41, sign * 12, -44, sign * 12, -42)
      .lineTo(sign * 15, -43).closePath().getPoints(10), true);
  const eyes = [-4.8, 4.8].map(x => f.smileEyes
    ? s.arc(x, -41.5, 2.5, 200, 340).setClosePath(false).setStrokeStyle(1.6, 0x39313b)
    : s.circle(x, -41.5, 1.75, 0x39313b));
  const face = s.graphics();
  face.fillStyle(0xee9b90, 0.7).fillEllipse(-9.5, -37.4, 6, 4.5).fillEllipse(9.5, -37.4, 6, 4.5);
  face.fillStyle(0xe7a384, 0.7).fillCircle(0, -38.8, 1);
  if (f.wideSmile) {
    face.fillStyle(0x85554b).fillPoints(path(-4.2, -36.5).lineTo(4.2, -36.5)
      .cubicBezierTo(-4.2, -36.5, 3.8, -29.8, -3.8, -29.8).closePath().getPoints(12), true);
    face.fillStyle(0xfff8e8).fillRoundedRect(-3.1, -36.3, 6.2, 1.8, 0.7);
  } else face.lineStyle(1.1, 0x85554b).beginPath().arc(0, -36.2, 2.3, 0.15, Math.PI - 0.15).strokePath();
  // 눈썹·수염은 늘 같은 색(BROW) — 머리색을 바꿔도 따라 바뀌지 않는다(승인 기준).
  if (f.brows) face.lineStyle(1.25, BROW, 0.8).lineBetween(-8, -46, -3.5, -46.4).lineBetween(3.5, -46.4, 8, -46);
  // 폰에서도 눈썹만 있는 얼굴과 구별되도록 미소선을 또렷하게(10-19).
  if (f.smileLines) face.lineStyle(1.1, 0x98745f, 0.75).lineBetween(-9.2, -36.3, -7.8, -33.3).lineBetween(7.8, -33.3, 9.2, -36.3);
  if (f.beard) face.fillStyle(BROW, 0.65).fillPoints(path(-9, -34.7).cubicBezierTo(9, -34.7, -5, -31, 5, -31)
    .cubicBezierTo(0, -29.3, 7, -30.5, 3, -29).cubicBezierTo(-9, -34.7, -3, -29, -7, -30.5).closePath().getPoints(12), true);
  if (look.glasses) face.lineStyle(0.85, 0x8b796a).strokeCircle(-4.8, -41.5, 3.5).strokeCircle(4.8, -41.5, 3.5).lineBetween(-1.3, -41.5, 1.3, -41.5);
  // 머리 장식 — 하나만, 머리 꼭대기 높이에 맞춰(검토판 그대로). 모자는 없다.
  const deco = s.graphics(), crown = curly ? -64 : style === 'wave' ? -63 : style === 'bun' ? -62 : -60;
  if (look.accessory === 'headband') deco.fillStyle(0xce8c91).fillPoints(path(-16, crown + 13).cubicBezierTo(16, crown + 13, -15, crown - 3, 15, crown - 3).lineTo(13, crown + 15)
    .cubicBezierTo(-13, crown + 15, 13, crown + 1, -13, crown + 1).closePath().getPoints(18), true);
  if (look.accessory === 'hairpin') {
    deco.fillStyle(0xe2b561).fillRoundedRect(8, crown + 10, 9, 3.5, 1.75);
    deco.lineStyle(0.7, 0xfff2cb).lineBetween(10, crown + 11.3, 15, crown + 11.3);
  }
  if (look.accessory === 'ribbon') {
    deco.fillStyle(0xc98591).fillTriangle(-12, crown + 3, -9, crown + 4, -14, crown + 9).fillTriangle(-9, crown + 4, -7, crown + 3, -5, crown + 9);
    deco.fillStyle(0xe5a5ac).fillEllipse(-13, crown + 2, 8, 7).fillEllipse(-6, crown + 2, 8, 7);
    deco.fillStyle(0xc98591).fillRoundedRect(-11, crown, 4, 4, 1.4);
  }
  const scarf = s.graphics();
  if (look.accessory === 'scarf') {
    scarf.fillStyle(0x507d73).fillRoundedRect(-14, -34, 28, 9, 4);
    scarf.fillStyle(0x3c665e).fillRoundedRect(4, -28, 8, 19, 3);
    scarf.fillStyle(0xecc68e, 0.9).fillRoundedRect(-12, -32, 24, 2, 1);
    scarf.fillStyle(0xecc68e, 0.75).fillRoundedRect(5, -20, 6, 2, 1).fillRoundedRect(5, -14, 6, 2, 1);
  }
  // 승인한 도구 넷(review/1020-options.ts). 몸통에 함께 구워 걷기·앉기·폴짝에도 같은 자리를 지킨다.
  const gear = s.graphics();
  if (look.accessory === 'magnifier') {
    gear.lineStyle(6, 0x765b45).lineBetween(20, -23, 29, -10);
    gear.fillStyle(0xc8e8ed).fillCircle(18, -30, 10);
    gear.lineStyle(3, 0x557b7c).strokeCircle(18, -30, 10);
    gear.lineStyle(2, 0xffffff).lineBetween(14, -34, 18, -37);
    gear.fillStyle(skin).fillCircle(23, -18, 3.5);
  }
  if (look.accessory === 'badge') {
    gear.fillStyle(0x008ebd).fillTriangle(2, -18, 7, -18, 2, -9).fillTriangle(6, -18, 11, -18, 12, -9);
    gear.fillStyle(0xfffcf3).fillCircle(7, -23, 7);
    gear.fillStyle(0x00afec).fillCircle(7, -23, 5.5);
    gear.fillStyle(0xfffcf3).fillCircle(7, -23, 2);
  }
  if (look.accessory === 'fieldBag') {
    gear.lineStyle(3, 0x8c6650).lineBetween(-10, -29, 12, -9);
    gear.fillStyle(0x9b7156).fillRoundedRect(5, -19, 19, 17, 4);
    gear.fillStyle(0xe8c790).fillRoundedRect(6, -20, 19, 9, 3);
    gear.fillStyle(0x6d5746).fillRoundedRect(13, -13, 4, 4, 1);
  }
  if (look.accessory === 'clipboard') {
    gear.fillStyle(0xa87e56).fillRoundedRect(12, -31, 18, 25, 2);
    gear.fillStyle(0xfffcf3).fillRoundedRect(14, -28, 14, 19, 1);
    gear.fillStyle(0x708b86).fillRoundedRect(17, -33, 8, 6, 2);
    gear.lineStyle(2.2, 0x638b61).beginPath().moveTo(17, -19).lineTo(20, -16).lineTo(25, -22).strokePath();
    gear.lineStyle(1.3, 0xb7c7c1).lineBetween(17, -12, 25, -12);
    gear.fillStyle(skin).fillCircle(13, -16, 3.5);
  }
  // 안 움직이는 덩어리(뒷머리 · 몸통~얼굴 · 다리 하나 · 팔 하나)를 마을 그림처럼 한 장씩 굽는다(bake) — 도형이 사람마다 스무 개 넘고
  // Graphics 는 장마다 다시 쪼개 그려서, 주민이 열 명 넘게 서면 느린 폰(CPU 4배)에서 초당 16~24장까지 떨어졌다(10-19, 마지막 방·언덕).
  // 그릇(container)째 구워 그릇의 자리·각도는 그대로 — 걷기(다리)·앉기·손 흔들기(오른팔 숨김) 움직임은 안 바뀐다. 눈만 따로(보는 쪽으로 움직임).
  // ponytail: 칸이 고정 — 그림이 FIG_BOX·LEG_BOX·SLEEVE_BOX 밖으로 나가면 잘린다. 더 크게 그리면 칸을 넓힐 것.
  if (bakeAt) { legs.forEach(leg => freeze(scene, leg, LEG_BOX, bakeAt)); sleeves.forEach(arm => freeze(scene, arm, SLEEVE_BOX, bakeAt)); }
  const lump = (parts: Phaser.GameObjects.GameObject[]) => { const c = s.container(0, 0, parts); return bakeAt ? freeze(scene, c, FIG_BOX, bakeAt) : c; };
  const hasBack = back.commandBuffer.length > 3; // 색 정하기 하나뿐이면 그린 게 없다
  const fig = s.container(0, 0, [hasBack ? lump([back]) : back, ...legs, ...sleeves, lump([torso, wear, neck, ...ears, head, scarf, fringe, deco, face, gear]), ...eyes]).setScale(FIGURE_SCALE);
  return { fig, legs, eyes, rightArm: sleeves[1], sleeveColor };
}
const FIG_BOX = { x0: -28, y0: -76, x1: 33, y1: 0 }, LEG_BOX = { x0: -7, y0: -5, x1: 7, y1: 9 }, SLEEVE_BOX = { x0: -10, y0: -4, x1: 10, y1: 20 };
let figBakes = 0;
/** 그릇 c 속 도형을 그 자리 그대로 그림 한 장으로(bake) 바꿔 c 에 다시 넣는다. 사람이 사라지면 그림도 지운다. */
function freeze(scene: Scene, c: Phaser.GameObjects.Container, b: Bounds, res: number) {
  const key = `fig-${figBakes++}`;
  c.add(bake(scene, key, () => scene.add.container(0, 0, [...c.list]), b, res).once('destroy', () => scene.textures.remove(key)));
  return c;
}

export class Dude {
  readonly root: Container;
  private body: Container;
  private fig: Container;
  private legs: Container[];
  private eyes: Phaser.GameObjects.Arc[];
  private rightArm: Container;
  private arm: { color: number; skin: number };
  private walkClock = 0;
  private idleClock = Math.random() * 4000;
  private hopping = false;
  private sitting = false;
  /** bakeAt — 화면 배율(dpr 3까지) 에 맞춘 3배. 모습 고르기처럼 크게 당겨 볼 사람은 0(굽지 않음). */
  constructor(private scene: Scene, look: Look, x: number, y: number, scale = 1, bakeAt = 3) {
    const art = figure(scene, look, bakeAt);
    this.fig = art.fig; this.legs = art.legs; this.eyes = art.eyes; this.rightArm = art.rightArm;
    this.arm = { color: art.sleeveColor, skin: look.skin };
    this.body = scene.add.container(0, 0, [art.fig]);
    this.root = scene.add.container(x, y, [scene.add.ellipse(0, 0, 28, 6, 0x756956, 0.17), this.body]).setScale(scale);
  }
  get x() { return this.root.x; }
  get y() { return this.root.y; }
  place(p: Point) { this.root.setPosition(p.x, p.y).setDepth(p.y); return this; }
  /** 눈을 가는 쪽(또는 보는 쪽)으로. */
  look(dx: number, dy: number) {
    const len = Math.hypot(dx, dy) || 1;
    this.eyes.forEach((eye, i) => eye.setPosition((i ? 4.8 : -4.8) + dx / len * 2.2, -41.5 + dy / len * 1.4));
  }
  /** 평상에 걸터앉은 모습 — 다리를 앞으로 내고 몸을 낮춘다. */
  sit(on: boolean) {
    if (on === this.sitting) return;
    this.sitting = on;
    this.walkClock = 0;
    this.legs.forEach((leg, i) => leg.setPosition(i ? 9 : -9, on ? -2 : -6).setAngle(on ? (i ? 24 : -24) : 0));
    this.body.setY(on ? 5 : 0).setScale(on ? 1.07 : 1, on ? 0.88 : 1);
  }
  /** 걷는 모습: 다리 번갈아, 몸 통통. 팔은 가만히(검토판과 같게). */
  walk(dtMs: number, moving: boolean, reduced: boolean) {
    if (this.hopping || this.sitting) return;
    if (!moving || reduced) {
      this.walkClock = 0;
      this.legs.forEach(leg => leg.setY(-6));
      // 서 있을 때 숨쉬기
      const breath = reduced ? 0 : Math.sin((this.idleClock += dtMs) / 520) * 0.025;
      this.body.setY(0).setScale(1 - breath * 0.5, 1 + breath);
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
    const arm = s.container(12, -25, [s.rectangle(0, -8, 8, 17, this.arm.color).setRounded(4), s.circle(0, -17, 3.5, this.arm.skin)]).setAngle(25);
    this.rightArm.setVisible(false);
    this.fig.add(arm);
    this.scene.tweens.add({ targets: arm, angle: -10, duration: 160, ease: 'Sine.easeInOut', yoyo: true, repeat: times - 1, onComplete: () => {
      arm.destroy();
      this.rightArm.setVisible(true);
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
export function confetti(scene: Scene, w: number, top: number, reduced: boolean, left = 0) {
  if (reduced) return;
  const colors = [0xff6b57, 0xffc74d, 0x6ad1a3, 0x6aa6d9, 0xd98cb3];
  for (let i = 0; i < 60; i++) {
    const piece = scene.add.rectangle(left + Math.random() * w, top - 20 - Math.random() * 80, 6, 9, colors[i % colors.length]).setDepth(9500);
    scene.tweens.add({
      targets: piece, y: piece.y + 260 + Math.random() * 260, x: piece.x + (Math.random() - 0.5) * 80,
      angle: Math.random() * 720 - 360, alpha: { from: 1, to: 0 }, duration: 1600 + Math.random() * 900, ease: 'Sine.easeIn',
      onComplete: () => piece.destroy(),
    });
  }
}

/**
 * 「이어칠하다」 등불 줄 — 후원주점판 마을 들머리(사용자 10-26 「폭죽 말고 이어칠하다 느낌」, 27주년 말장난: 27 + 이어).
 * 보이는 화면(left·top·w·h, 장면 좌표)에 전구 14+13개를 두 줄로 건다. 위에서 아래로 빛이 이어지고 작은 주점 간판이 내려앉는다.
 * 밤빛 덮개(60000·60001) 위. 광장에 계속 걸려 있고, 움직임 줄이기면 처음부터 켜진 모습으로 둔다.
 */
export function stringLights(scene: Scene, left: number, top: number, w: number, h: number, dpr: number, reduced: boolean) {
  const root = scene.add.container(left + w / 2, top + Math.min(h * 0.09, 64)).setDepth(60002).setName('pub-string-lights');
  const span = w - 48, step = 52, colors = [0xffd580, 0xffc064, 0xed9e7d, 0xffe4a3, 0xbad2ad];
  const wire = scene.add.graphics().lineStyle(1.7, 0x695340, 0.85);
  root.add(wire);
  let index = 0;
  for (const [row, count] of [14, 13].entries()) {
    const at = (t: number) => ({ x: (t - 0.5) * span, y: row * 124 + (row ? 20 : 26) * 4 * t * (1 - t) });
    wire.beginPath(); wire.moveTo(-span / 2, row * 124);
    for (let j = 1; j <= 32; j++) { const p = at(j / 32); wire.lineTo(p.x, p.y); }
    wire.strokePath();
    for (let i = 0; i < count; i++, index++) {
      const p = at(row ? 1 - i / (count - 1) : i / (count - 1));
      const color = colors[index % colors.length], radius = Math.min(5.5, span / 65);
      const glow = scene.add.circle(0, 10, radius * 3, color, 0.16).setAlpha(0);
      const glass = scene.add.ellipse(0, 10, radius * 1.65, radius * 2.15, color).setAlpha(0.18);
      const shine = scene.add.ellipse(-1, 8, 2, 4, 0xfffbeb, 0.9).setAlpha(0);
      const bulb = scene.add.container(p.x, p.y, [glow, scene.add.rectangle(0, 3, 4, 7, 0x695340), glass, shine]).setName('pub-bulb');
      root.add(bulb);
      if (reduced) [glow, glass, shine].forEach(bit => bit.setAlpha(1));
      else scene.tweens.add({ targets: [glow, glass, shine], alpha: 1, delay: index * step, duration: 260, ease: 'Sine.easeOut' });
    }
  }
  const signW = Math.min(320, w - 72);
  wire.lineStyle(1.2, 0x8d7154).lineBetween(-signW * 0.32, 24, -signW * 0.32, 51).lineBetween(signW * 0.32, 24, signW * 0.32, 51);
  const sign = scene.add.container(0, 76).setAlpha(0).setName('pub-welcome');
  const board = scene.add.graphics().fillStyle(0x513b2c, 0.12).fillRoundedRect(-signW / 2 + 2, -28, signW, 66, 9)
    .fillStyle(0xfff4db).fillRoundedRect(-signW / 2, -32, signW, 64, 8)
    .lineStyle(1.5, 0xa77b54).strokeRoundedRect(-signW / 2, -32, signW, 64, 8);
  const badgeX = -signW / 2 + 36;
  const badge = scene.add.circle(badgeX, 0, 22, 0xad503d);
  const number = scene.add.text(badgeX, 0, '27', { fontFamily: FONT, fontSize: '25px', color: '#fff6df', resolution: textRes(dpr) }).setOrigin(0.5);
  const title = scene.add.text(27, 0, '이어칠하다', { fontFamily: FONT, fontSize: `${Math.min(33, (signW - 86) / 5)}px`, color: '#654733', resolution: textRes(dpr) }).setOrigin(0.5);
  sign.add([board, badge, number, title]); root.add(sign);
  if (reduced) sign.setAlpha(1).setY(82);
  else scene.tweens.add({ targets: sign, alpha: 1, y: 82, delay: 27 * step + 80, duration: 420, ease: 'Sine.easeOut' });
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
export type Cat = { pet: Pet; root: Container; at: Point; near: boolean };
export type RoomArt = { box: Container; openDoor: (reduced: boolean) => void; pigeons: Pigeon[]; ball?: Ball; cat?: Cat; destroy: () => void };

/** 축구공 — 흰 바탕에 검은 점 여섯. 굴러가는 게 보이게 무늬가 돈다(spin). */
export function ball(scene: Scene, x: number, y: number): Ball {
  const s = scene.add;
  const dots = [0, 72, 144, 216, 288].map(a => s.circle(Math.cos(a * Math.PI / 180) * 6.4, Math.sin(a * Math.PI / 180) * 6.4, 1.8, 0x2d2a32));
  const spin = s.container(0, -9, [s.circle(0, 0, 9, 0xfffdf2).setStrokeStyle(1, 0x807e8c), s.circle(0, 0, 3, 0x596579), ...dots, s.ellipse(-3, -4, 4, 2, 0xffffff, 0.7)]);
  const root = s.container(x, y, [s.ellipse(0, 0, 18, 5, 0x2d3a2e, 0.18), spin]);
  return { root, spin, at: { x, y }, v: { x: 0, y: 0 } };
}

/**
 * 시민증 사진 — 내 모습(Dude) 얼굴·어깨만 한 장 그림으로(사용자 10-15 「시민증엔 자기 캐릭터 얼굴이 들어가야지」). size 는 그림 화소(정사각).
 * 화면 어디에도 안 보이게 그림 판(DynamicTexture)에만 그리고 바로 치운다.
 */
export function facePhoto(scene: Scene, look: Look, size: number): Promise<string | undefined> {
  return new Promise(resolve => {
    const key = 'face-photo';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.addDynamicTexture(key, size, size);
    if (!tex) { resolve(undefined); return; }
    const dude = new Dude(scene, look, 0, 0, 1, 0), k = size / 50; // 머리 위 끝에서 어깨까지 50px 쯤이 한 장에
    dude.root.setScale(k).setPosition(size / 2, size / 2 + 34 * k); // 얼굴(발에서 41px 위) 조금 아래가 가운데
    tex.draw(dude.root);
    tex.render();
    dude.root.destroy();
    tex.snapshot(img => { resolve((img as HTMLImageElement).src); scene.textures.remove(key); });
  });
}

/** 방 고양이도 승인된 Pet — 바깥 root 가 폴짝·비켜 걷기를 맡아 제자리 모션과 겹치지 않는다. */
export function cat(scene: Scene, x: number, y: number, fur: number): Cat {
  const pet = new Pet(scene, 'cat', { x: 0, y: 0 }, 1, fur);
  const root = scene.add.container(x, y, [pet.root]).setDepth(y);
  return { pet, root, at: { x, y }, near: false };
}

/** 다가가면 야옹 — 폴짝, 하트 하나. */
export function meow(scene: Scene, kitty: Cat, reduced: boolean) {
  hearts(scene, kitty.at.x - 4, kitty.at.y - 26, 1, reduced);
  if (!reduced) scene.tweens.add({ targets: kitty.root, y: kitty.at.y - 7, duration: 130, ease: 'Quad.easeOut', yoyo: true });
}

export function tree(scene: Scene, x: number, y: number, color: number, snow = false) {
  return scene.add.container(x, y, [
    scene.add.ellipse(0, 0, 30, 9, 0x2d3a2e, 0.14),
    scene.add.rectangle(0, -8, 7, 16, 0x9a7356).setRounded(3),
    scene.add.circle(0, -30, 18, color), scene.add.circle(-9, -22, 11, color), scene.add.circle(9, -23, 12, color),
    scene.add.circle(-5, -36, 6, 0xffffff, 0.18),
    ...(snow ? [scene.add.ellipse(0, -43, 26, 10, 0xfbfdff), scene.add.ellipse(-10, -31, 12, 6, 0xfbfdff), scene.add.ellipse(10, -32, 13, 6, 0xfbfdff)] : []),
  ]).setDepth(y);
}

/** 철 — 실제 달로(사용자 10-14 동물의 숲 ⓒ). 개발판은 ?season= 으로 바꿔 본다. */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const seasonOf = (month: number): Season => (month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter');
const SEASON_LOOK: Record<Season, { trees: number[]; grass: number }> = {
  spring: { trees: [0x8cc07a, 0xf2b8c6, 0x9cba8a, 0xf7cfd8], grass: 0xd6e6b6 },
  summer: { trees: [0x8cc07a, 0x6fae6a, 0x9cba8a, 0x5fa585], grass: 0xd3e3b4 },
  autumn: { trees: [0xe9a04f, 0xd9744a, 0xe8c25a, 0x9cba8a], grass: 0xdcdcaa },
  winter: { trees: [0x8faf9a, 0x7fa08c, 0xa9bcae, 0x6f9a86], grass: 0xe6ece2 },
};
/** 하루 빛 — 실제 시각으로 마을에 곱하는 색(흰색이면 그대로). 밤엔 가로등이 켜진다(VillageScene). */
export function skyAt(hour: number) {
  if (hour >= 21 || hour < 5) return { tint: 0x9ca4d4, night: true };
  if (hour < 7) return { tint: 0xf3d6cf, night: false };
  if (hour >= 18) return { tint: 0xc9b3c9, night: true };
  if (hour >= 16) return { tint: 0xfbe3c4, night: false };
  return { tint: 0xffffff, night: false };
}

/**
 * 마을 공사(사용자 10-14 동물의 숲 ⓑ) — 공사터 자리의 울타리·간판(지금 공사와 모인 동전), 다 지은 것(연못 다리·쉼터 정자).
 * 동전이 모이는 대로 바뀌어서 굽지 않고 따로 세운다. set 을 부르면 다시 그린다.
 */
function worksArt(scene: Scene, dpr: number) {
  const site = PLACES.find(p => p.id === 'works')!.box;
  const root = scene.add.container(site.x, site.y).setDepth(site.y + site.h);
  // 정자 지붕은 따로 — 평상에 앉은 나보다 앞에(처마 밑에 앉은 것처럼). 바닥·기둥·평상(root)은 나보다 뒤에(10-19 「쉴 수 있게」).
  const roof = scene.add.container(site.x, site.y).setDepth(site.y + site.h + 60);
  // 다리는 그 위를 걷는 나보다 뒤에 깐다(village.ts 가 다 지으면 판자 길을 걸을 수 있게 연다).
  const bridge = scene.add.container(POND.x + POND.w / 2, BRIDGE_Y).setDepth(BRIDGE_Y - 16).setVisible(false);
  { // 연못 다리 — 나무 판자 아치, 양 끝 기둥
    const g = scene.add.graphics(), half = POND.w / 2 + 14;
    g.fillStyle(0x756956, 0.18).fillEllipse(0, 14, half * 2, 12);
    g.fillStyle(0xb07a52).fillRoundedRect(-half, -6, half * 2, 16, 8);
    for (let x = -half + 6; x < half - 4; x += 12) g.fillStyle(0xc99464).fillRoundedRect(x, -4, 9, 12, 2);
    g.fillStyle(0xe0b27c).fillRoundedRect(-half + 3, -5, half * 2 - 6, 2, 1);
    g.fillStyle(0x8a5e40).fillRoundedRect(-half + 2, 8, half * 2 - 4, 3, 1.5);
    g.lineStyle(3, 0x8a5e40).beginPath().arc(0, 40, half + 4, Math.PI * 1.18, Math.PI * 1.82, false).strokePath();
    for (const x of [-half, half]) g.fillStyle(0x8a5e40).fillRoundedRect(x - 3, -22, 6, 26, 2);
    bridge.add(g);
  }
  const name = (id: WorkId) => WORKS.find(w => w.id === id)!.name;
  return {
    objs: [root, roof, bridge],
    /** 다 지은 것이 서는 자리 — 장면이 카메라를 여기로 옮긴다. */
    builtAt: (id: WorkId): Point => (id === 'bridge' ? { x: bridge.x, y: bridge.y } : { x: site.x + site.w / 2, y: site.y + site.h - 40 }),
    /**
     * 공사가 막 끝났다 — 그 자리에서 뚝딱 서는 연출(사용자 10-15 「다리가 만들어지면 그곳에 시점이 갔다가 돌아오게, 만드는 연출도」).
     * 망치질 먼지 셋 → 다리는 이쪽 끝에서 건너편으로 뻗고(정자는 위에서 내려앉고) → 반짝·색종이·「○○ 완성!」. 2.4초쯤. set 으로 다 지은 모습을 먼저 그려 둔 뒤 부른다.
     */
    built(id: WorkId, dpr: number) {
      const at = id === 'bridge' ? { x: bridge.x, y: bridge.y } : { x: site.x + site.w / 2, y: site.y + site.h - 40 };
      [0, 220, 440].forEach((ms, i) => scene.time.delayedCall(ms, () => { puff(scene, at.x + (i - 1) * 46, at.y + 14, false); sfx.build(); }));
      if (id === 'bridge') {
        bridge.setScale(0.03, 1);
        scene.tweens.add({ targets: bridge, scaleX: 1, duration: 1000, delay: 520, ease: 'Cubic.easeOut' });
      } else {
        for (const part of [root, roof]) part.setAlpha(0).setY(site.y - 70);
        scene.tweens.add({ targets: [root, roof], y: site.y, alpha: 1, duration: 760, delay: 520, ease: 'Bounce.easeOut' });
      }
      scene.time.delayedCall(1560, () => {
        sfx.fanfare(); sparkle(scene, at.x, at.y - 20, false); confetti(scene, 260, at.y - 60, false, at.x - 130);
        const title = label(scene, at.x, at.y - 46, `${name(id)} 완성!`, 16, dpr, '#b8573f').setDepth(9600).setScale(0);
        scene.tweens.add({ targets: title, scale: 1, duration: 380, ease: 'Back.easeOut' });
        scene.tweens.add({ targets: title, y: title.y - 18, alpha: 0, duration: 500, delay: 1300, onComplete: () => title.destroy() });
      });
    },
    set(state: WorksState) {
      root.removeAll(true); roof.removeAll(true);
      bridge.setVisible(state.done.includes('bridge'));
      const g = scene.add.graphics(), { w, h } = site;
      const open = state.done.includes('pavilion');
      root.setDepth(open ? site.y + 30 : site.y + site.h);
      if (open) { // 쉼터 정자 — 기와 지붕, 기둥 넷, 가운데 평상
        g.fillStyle(0x756956, 0.16).fillEllipse(w / 2, h + 2, w + 10, 16);
        g.fillStyle(0xd8c6a2).fillRoundedRect(14, h - 24, w - 28, 22, 6);
        g.fillStyle(0xf0dfbc, 0.8).fillRoundedRect(18, h - 24, w - 36, 5, 2);
        for (const x of [48, w - 54]) g.fillStyle(0x9a6a48).fillRoundedRect(x, h - 90, 6, 70, 2);
        g.fillStyle(0xb07a52).fillRoundedRect(w / 2 - 22, h - 34, 44, 8, 3);
        const top = scene.add.graphics(), lip = scene.add.graphics();
        for (const x of [22, w - 28]) top.fillStyle(0x9a6a48).fillRoundedRect(x, h - 90, 6, 70, 2);
        top.fillStyle(0x6f8a7e).fillTriangle(-6, h - 88, w / 2, h - 130, w + 6, h - 88).fillRoundedRect(-10, h - 94, w + 20, 12, 6);
        top.fillStyle(0xffffff, 0.2).fillRoundedRect(0, h - 92, w, 4, 2);
        lip.fillStyle(0xbe9c74).fillRoundedRect(14, h - 12, w - 28, 7, 3);
        lip.fillStyle(0xf5e4c5, 0.55).fillRoundedRect(18, h - 11, w - 36, 2, 1);
        // 평상 앞선은 발보다 뒤, 앞 기둥과 지붕만 사람보다 앞. 앉은 발을 가리지 않는다.
        root.add([g, lip]);
        roof.add([top, label(scene, w / 2, h - 108, '쉼터 정자', 12, dpr, '#ffffff')]);
        return;
      }
      // 공사 중 — 바닥, 울타리, 벽돌 더미, 간판(곳 이름 · 지금 공사와 모인 만큼). 이름을 늘 보이게(사용자 10-15 「직관적으로」)
      g.fillStyle(0xe2d6b8).fillRoundedRect(0, 0, w, h, 12);
      for (let x = 0; x <= w; x += 20) g.fillStyle(0xe7a24f).fillRoundedRect(x - 3, h - 22, 6, 24, 2);
      g.fillStyle(0xf2c661).fillRect(0, h - 16, w, 5).fillStyle(0x51423e).fillRect(8, h - 16, 10, 5).fillRect(38, h - 16, 10, 5).fillRect(68, h - 16, 10, 5).fillRect(98, h - 16, 10, 5).fillRect(128, h - 16, 10, 5);
      for (const [bx, by] of [[22, 30], [34, 30], [28, 22]]) g.fillStyle(0xd9785f).fillRoundedRect(bx, by, 11, 7, 2);
      g.fillStyle(0x6d5444).fillRect(w / 2 - 2, 20, 4, 34).fillStyle(0xfffaf0).fillRoundedRect(w / 2 - 76, -32, 152, 56, 8);
      g.lineStyle(1.5, 0xd9c3a1).strokeRoundedRect(w / 2 - 76, -32, 152, 56, 8);
      const now = state.now;
      const items: Phaser.GameObjects.GameObject[] = [g];
      if (now) {
        const k = Math.min(1, now.have / now.goal);
        g.fillStyle(0xefe2c9).fillRoundedRect(w / 2 - 52, -4, 104, 8, 4).fillStyle(0xf2c661).fillRoundedRect(w / 2 - 52, -4, Math.max(8, 104 * k), 8, 4);
      }
      items.push(label(scene, w / 2, -18, PLACES.find(p => p.id === 'works')!.name, 12, dpr),
        label(scene, w / 2, 13, now ? `${now.name} · 동전 ${now.have} / ${now.goal}` : '다음 공사 준비 중', 10, dpr, '#8a7563'));
      root.add(items);
    },
  };
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

/** 빛 아치의 안쪽 폭 반·높이 — 장면이 「문」 폭으로 쓴다(이 안으로만 지나간다). */
export const PORTAL = { half: 30, height: 82 };

/**
 * 언덕의 빛 아치 — 걸어서 지나면 마을(사용자 10-14 「눌러서 말고 포탈을 통과해서」). 꽃·덩굴 감긴 둥근 아치, 안은 빛이 일렁인다.
 * (x, base) 는 아치 발밑 가운데. 깊이를 발밑에 둬서, 아치를 지나 위로 가면 빛 뒤로 가려진다 — 빨려 들어가는 것처럼.
 */
export function drawPortal(scene: Scene, x: number, base: number, reduced: boolean) {
  const { half, height } = PORTAL, R = half + 7, top = height - half; // 기둥 높이(둥근 머리 아래까지)
  const arch = (g: Phaser.GameObjects.Graphics, r: number) => {
    g.beginPath().moveTo(-r, 0).lineTo(-r, -top).arc(0, -top, r, Math.PI, 0, false).lineTo(r, 0);
  };
  const back = scene.add.graphics();
  back.fillStyle(0x756956, 0.16).fillEllipse(0, 3, R * 2 + 30, 16);
  // 빛 — 겹 타원으로 가운데가 밝게(그래디언트는 사각형에만 먹는다).
  back.fillStyle(0xcfeff0); arch(back, half); back.closePath().fillPath();
  back.fillStyle(0xe6dcfa, 0.8).fillEllipse(0, -top + 4, half * 1.7, height * 0.95);
  back.fillStyle(0xfff6dc, 0.9).fillEllipse(0, -top + 10, half * 1.05, height * 0.6);
  back.fillStyle(0xffffff, 0.85).fillEllipse(0, -top + 14, half * 0.45, height * 0.3);
  const swirl = scene.add.graphics();
  swirl.lineStyle(2, 0xffffff, 0.55);
  for (const k of [0.45, 0.75]) swirl.strokeEllipse(0, 0, half * 2 * k, height * 0.7 * k);
  swirl.setPosition(0, -top + 10);
  const front = scene.add.graphics();
  front.lineStyle(13, 0x9a7a5c); arch(front, R); front.strokePath(); // 나무 테
  front.lineStyle(7, 0x8fbf7c); arch(front, R); front.strokePath(); // 덩굴
  for (const s of [-1, 1]) front.fillStyle(0x7c6048).fillRoundedRect(s * R - 9, -8, 18, 10, 4); // 받침돌
  // 덩굴 잎과 꽃 — 테를 따라 고르게.
  const along = (t: number) => {
    const straight = top / (top + Math.PI * R / 2); // 한쪽 기둥이 차지하는 몫
    if (t < straight) return { x: -R, y: -t / straight * top };
    if (t > 2 - straight) return { x: R, y: -(2 - t) / straight * top };
    const a = Math.PI + (t - straight) / (2 - 2 * straight) * Math.PI;
    return { x: Math.cos(a) * R, y: -top + Math.sin(a) * R };
  };
  for (let i = 0; i < 14; i++) {
    const p = along(0.08 + i * 0.13);
    front.fillStyle(i % 2 ? 0x6fa865 : 0xa6d08c).fillEllipse(p.x + (i % 3 - 1) * 4, p.y + 3, 9, 5);
  }
  [0.25, 0.62, 0.86, 1.0, 1.14, 1.38, 1.75].forEach((t, i) => {
    const p = along(t), petal = [0xf6b3bf, 0xfff8e4, 0xf7d391][i % 3];
    front.fillStyle(petal);
    for (let k = 0; k < 5; k++) front.fillCircle(p.x + Math.cos(k * Math.PI * 0.4) * 3.2, p.y + Math.sin(k * Math.PI * 0.4) * 3.2, 2.7);
    front.fillStyle(0xe6a85e).fillCircle(p.x, p.y, 2.2);
  });
  const root = scene.add.container(x, base, [back, swirl, front]).setDepth(base);
  if (reduced) return root;
  root.setScale(0.2).setAlpha(0);
  scene.tweens.add({ targets: root, scale: 1, alpha: 1, duration: 520, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: swirl, angle: 360, duration: 5200, repeat: -1 });
  scene.tweens.add({ targets: back, alpha: 0.82, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  // 빛 알갱이가 안에서 피어오른다.
  scene.time.addEvent({
    delay: 260, loop: true, callback: () => {
      if (!root.active) return;
      const dot = scene.add.circle((Math.random() - 0.5) * half * 1.4, -6, 1.6 + Math.random() * 1.4, Math.random() < 0.5 ? 0xffffff : 0xfff0b8, 0.9);
      root.addAt(dot, 2);
      scene.tweens.add({ targets: dot, y: -height * (0.55 + Math.random() * 0.4), alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => dot.destroy() });
    },
  });
  return root;
}

// ───────────────────────── 마을(기획 4차) ─────────────────────────
// Claude 의 임시 그림 — 같은 화풍(둥근 도형·파스텔·납작한 그림자). 장소마다 알아보게 다듬는 건 GPT 몫.
// 배치(어디에 무엇이)는 village.ts 가 정한다 — 여기서 자리를 옮기면 부딪힘과 어긋난다.

const FONT = '"Jua","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif'; // 화면 글과 같은 둥근 글꼴(main 이 장면 전에 불러 둔다)
/**
 * 캔버스(간판·공사판·완성 글자)에 쓰는 글자 전부 — main 이 장면을 띄우기 전에 이 글자들이 든 주아 조각을 다 받아 둔다.
 * 주아는 글자 묶음(조각)마다 따로 받는데 간판은 한 번 구워 두므로, 안 받은 조각의 글자만 기본 글꼴로 굳었다
 * (10-15 「상담소·독상 간판 한 글자가 볼드 처리가 안 된 듯」 — 「시민참여」 의 「참」. 전엔 「마을」 두 글자의 조각만 받았다).
 * 간판에 새 글자를 쓰면 여기에도 넣는다 — 개발판은 빠진 글자를 콘솔에 알린다(label).
 */
export const CANVAS_TEXT = [...PLACES.map(p => p.name + (p.keeper ?? '')), ...WORKS.map(w => w.name), VILLAGE_NAME, '버스 작은 운동장 동전 다음 공사 준비 중 완성! 이어칠하다 ? 0123456789·/'].join('');
/** 사람 이름표 — 발밑에 작게, 밝은 테두리를 둘러 바닥 위에서도 읽히게(문 앞을 맡은 시민행동 사람, 10-15). */
export const nameTag = (scene: Scene, x: number, y: number, text: string, dpr: number) =>
  label(scene, x, y, text, 11, dpr, '#5b402e').setStroke('#fffaf0', 4).setDepth(y + 2);
/**
 * 캔버스 글씨를 그리는 촘촘함 — 기기 화소 배수를 올림하되 2 아래로는 안 내린다. 캔버스 글씨는 다 이걸 쓴다(시험 game-village 「캔버스 글씨」 가 지킨다).
 * 전엔 dpr 그대로라 PC(1배)·윈도 125%·150% 화면에서 적은 화소로 그린 글씨가 반 칸씩 어긋나 뭉개졌다(10-20 사용자 「글씨체가 또렷하지 않으면 안 돼」).
 */
export const textRes = (dpr: number) => Math.max(2, Math.ceil(dpr));
/** 글씨 — 카메라가 기기 화소만큼 키우므로 글자 그림도 그만큼(적어도 2배) 촘촘하게 만든다. */
function label(scene: Scene, x: number, y: number, text: string, size: number, dpr: number, color = '#51423e') {
  if (import.meta.env?.DEV) for (const ch of text) if (ch.trim() && !CANVAS_TEXT.includes(ch)) console.warn(`간판 글자 「${ch}」 가 CANVAS_TEXT 에 없다 — 주아 조각을 미리 안 받아 기본 글꼴로 굳을 수 있다`);
  const made = scene.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, resolution: textRes(dpr) }).setOrigin(0.5);
  labelsMade++; labels.add(made); made.once('destroy', () => labels.delete(made));
  return made;
}
/**
 * 주아 조각이 장면보다 늦게 오면(main 의 4초 기다림을 넘긴 기기) 간판·이름표가 기본 글꼴(윈도는 더 넓은 맑은 고딕)로 굳는다 →
 * 조각이 올 때마다 다시 굽는다 — 떠 있는 글씨(labels)는 다시 그리고, 건물 그림에 구워 넣은 간판은 그림째(rebakes, bake).
 * 10-20 사용자 공개판 「폰트 상태가 너무 별로」(간판이 넓은 기본 글꼴) — 이 PC 에선 재현 못 해 주아 파일을 9초 늦춰 흉내 냄.
 */
const labels = new Set<Phaser.GameObjects.Text>();
let labelsMade = 0;
const rebakes = new Set<() => boolean>();
const juaReady = () => globalThis.document?.fonts?.check('13px Jua', CANVAS_TEXT) ?? true;
globalThis.document?.fonts?.addEventListener('loadingdone', () => {
  // 크롬 캔버스는 같은 font 글자를 다시 넣으면 그냥 넘겨 예전에 고른 기본 글꼴을 계속 쓴다 — 한 번 다른 값을 넣었다가 updateText 가 되돌리게.
  labels.forEach(t => { t.context.font = '1px serif'; t.updateText(); });
  rebakes.forEach(again => { if (!again()) rebakes.delete(again); });
  if (juaReady()) rebakes.clear();
});

const PLACE_LOOK: Record<PlaceId, { wall: number; roof: number }> = {
  hub: { wall: 0xbfd5c6, roof: 0x80aa9d },
  house: { wall: 0xf6d9c6, roof: 0xd9785f },
  counsel: { wall: 0xf5e3a3, roof: 0x7aa86a },
  finance: { wall: 0xadcbdb, roof: 0x5f8aa6 },
  dok: { wall: 0xe6dad4, roof: 0x8f5f6a },
  bus: { wall: 0xd2e9d9, roof: 0x4f8f7a },
  tax: { wall: 0xf3e2b8, roof: 0xc9973f },
  works: { wall: 0xe8d6b5, roof: 0xb07a52 }, // 공사터는 house 로 안 그린다(worksArt) — 자리만
  board: { wall: 0xd8b48c, roof: 0x9a7356 },
  cards: { wall: 0xd8b48c, roof: 0xd9785f },
  cheer: { wall: 0xd8b48c, roof: 0xd9785f }, // 창립행사 응원판 — 후원주점판에만(겉모습은 GPT)
  arcade: { wall: 0xe9d8f0, roof: 0x8a6fb3 }, // 겉모습은 GPT 가 다듬는다(10-17 Claude 임시)
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
  const plate = label(scene, w / 2, top - 12, place.name, globalThis.matchMedia?.('(pointer: fine)').matches ? 16 : 13, dpr);
  const plateH = Math.max(24, plate.height + 8);
  g.fillStyle(0xfffaf0).fillRoundedRect(w / 2 - plate.width / 2 - 10, top - 12 - plateH / 2, plate.width + 20, plateH, 8);
  g.lineStyle(1.5, 0xd9c3a1).strokeRoundedRect(w / 2 - plate.width / 2 - 10, top - 12 - plateH / 2, plate.width + 20, plateH, 8);
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
  } else if (place.id === 'tax') { // 금고 — 둥근 다이얼, 옆에 동전 셋
    mark.fillStyle(0x6f8a7e).fillRoundedRect(w / 2 - 18, -66, 36, 32, 7).fillStyle(0x8fa99c).fillRoundedRect(w / 2 - 15, -63, 30, 26, 5);
    mark.fillStyle(0xfffaf0).fillCircle(w / 2 - 3, -50, 7).fillStyle(0x6f8a7e).fillCircle(w / 2 - 3, -50, 2.5).fillStyle(0xf2c661).fillRoundedRect(w / 2 + 7, -56, 4, 12, 2);
    for (const [i, cx] of [[0, w / 2 + 30], [1, w / 2 + 30], [2, w / 2 + 30]] as const) mark.fillStyle(i % 2 ? 0xe2ae45 : 0xf2c661).fillEllipse(cx, -38 - i * 5, 16, 6);
  } else if (place.id === 'arcade') { // 오락기 — 화면에 동전, 옆에 조이스틱
    mark.fillStyle(0x5d4a7a).fillRoundedRect(w / 2 - 20, -72, 40, 40, 8).fillStyle(0xbfe6d8).fillRoundedRect(w / 2 - 15, -67, 30, 20, 4);
    mark.fillStyle(0x806994).fillRoundedRect(w / 2 - 17, -70, 34, 3, 1.5);
    mark.fillStyle(0x403746).fillRoundedRect(w / 2 - 13, -43, 26, 8, 3);
    mark.fillStyle(0xf2c661).fillCircle(w / 2 + 8, -39, 2).fillStyle(0xe79b81).fillCircle(w / 2 + 1, -39, 2);
    mark.fillStyle(0xf2c661).fillCircle(w / 2, -57, 5).fillStyle(0xffffff, 0.6).fillCircle(w / 2 - 2, -59, 1.5);
    mark.lineStyle(3, 0x5d4a7a).lineBetween(w / 2 + 34, -34, w / 2 + 34, -50).fillStyle(0xff6b57).fillCircle(w / 2 + 34, -52, 5);
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

/** 나무에서 떨어진 것 — 동전(가운데 구멍 대신 반짝)·열매(철 열매 하나로: 빨간 사과꼴). */
export function dropArt(scene: Scene, kind: 'coin' | 'fruit') {
  const g = scene.add.graphics();
  g.fillStyle(0x756956, 0.18).fillEllipse(0, 4, 14, 4);
  if (kind === 'coin') {
    g.fillStyle(0xd9a53c).fillCircle(0, -4, 7).fillStyle(0xf2c661).fillCircle(0, -4, 5.5);
    g.lineStyle(1.2, 0xd9a53c).strokeCircle(0, -4, 3.2).fillStyle(0xffffff, 0.7).fillCircle(-2.5, -6.5, 1.4);
  } else {
    g.fillStyle(0xd9574a).fillCircle(-2, -4, 5.5).fillCircle(2, -4, 5.5).fillStyle(0xffffff, 0.35).fillCircle(-3, -6.5, 1.6);
    g.fillStyle(0x7a5a3e).fillRect(-0.6, -12, 1.4, 4).fillStyle(0x79a96a).fillEllipse(3, -11, 6, 3);
  }
  return scene.add.container(0, 0, [g]);
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
  const { x, y, w, h } = place.box, cards = place.id === 'cards';
  const g = scene.add.graphics();
  g.fillStyle(0x756956, 0.16).fillEllipse(w / 2, h + 2, w + 16, 10);
  g.fillStyle(0x6d5444).fillRect(8, -40, 6, h + 40).fillRect(w - 14, -40, 6, h + 40);
  g.fillStyle(PLACE_LOOK[place.id].roof).fillRoundedRect(-4, -60, w + 8, 12, 5);
  g.fillStyle(0xd8b48c).fillRoundedRect(0, -48, w, 44, 6);
  // 두 줄 간판 — 후원주점판의 쪽지판(게임 의견)과 창립행사 응원판
  const sign = place.id === 'cheer' ? '창립행사\n응원판' : place.id === 'board' && place.name !== '쪽지판' ? '게임에 대해\n한마디 남겨주세요' : '';
  if (sign) g.fillStyle(PLACE_LOOK[place.id].roof).fillRoundedRect(-24, -82, w + 48, 34, 6);
  const items: Phaser.GameObjects.GameObject[] = [g, label(scene, w / 2, sign ? -65 : -54, sign || place.name, 11, dpr, '#ffffff').setAlign('center')];
  if (cards) { // 문제 카드 — 큰 종이 한 장에 붉은 「!」
    g.fillStyle(0xfffaf0).fillRect(w / 2 - 22, -45, 44, 38).fillStyle(0xd9785f).fillRect(w / 2 - 22, -45, 44, 6);
    items.push(label(scene, w / 2, -21, '!', 20, dpr, '#d9785f'));
  } else {
    const colors = [0xfff3b0, 0xffd6d0, 0xd6ecff, 0xdff3d0, 0xfffaf0];
    for (let i = 0; i < 7; i++) g.fillStyle(colors[i % colors.length]).fillRect(6 + (i % 4) * 21 + (i > 3 ? 10 : 0), -44 + (i > 3 ? 20 : 0), 16, 14);
  }
  return scene.add.container(x, y, items).setDepth(y + h);
}

/**
 * 마을 그림은 안 움직이는 것을 **처음에 한 번 그림 한 장으로 굽는다**(bake). Graphics 는 Phaser 가 장면마다 다시 계산해서,
 * 지도 한 장을 다 그리면 느린 폰에서 끊겼다(CPU 4배 느리게: 초당 9장 → 굽고 나서 아래 README 「지금 상태」).
 * 그림을 고칠 때는 house·busStop·noteBoard·tree 같은 그리는 함수만 고치면 된다 — 굽기는 저절로 따라간다.
 * 움직이는 것(분수 물방울·독에서 새는 물·고양이·비둘기)은 굽지 않는다. 새 물건은 bake 로 굽고 keep 에 자리 상자와 함께 넣는다.
 * cull(화면) — 화면(+여유) 밖의 것은 그리지 않는다.
 */
export type VillageArt = {
  pigeons: Pigeon[];
  /** 앉아 있는 동물(pets.ts) — 곁에 가면 하트, 고양이는 야옹(오늘의 부탁 「고양이에게 인사」). */
  pets: { pet: Pet; near: boolean }[];
  /** 나무 — 흔들 수 있게(그림 한 장씩). at 은 밑동. */
  trees: { at: Point; img: Phaser.GameObjects.Image }[];
  /** 가로등 불 자리 — 밤에 장면이 빛을 켠다. */
  lamps: Point[];
  setWorks: (state: WorksState) => void;
  builtAt: (id: WorkId) => Point;
  built: (id: WorkId, dpr: number) => void;
  cull: (view: { x: number; y: number; width: number; height: number }) => void; destroy: () => void;
};
type Bounds = { x0: number; y0: number; x1: number; y1: number };
type Bakeable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;

/**
 * obj 를 b(지도 자리 상자) 크기 그림 한 장으로 굽고 obj 는 버린다. res = 촘촘함(기기 화소 배수) — 카메라가 그만큼 키워 보이므로 맞춰 굽는다.
 * 같은 key 를 다시 쓰면(나무처럼) 한 번만 굽는다.
 */
function bake(scene: Scene, key: string, make: () => Bakeable, b: Bounds, res: number, at = { x: b.x0, y: b.y0 }) {
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.addDynamicTexture(key, Math.ceil((b.x1 - b.x0) * res), Math.ceil((b.y1 - b.y0) * res))!;
    /** 굽기 — 글씨가 들었으면 true. */
    const paint = () => {
      const before = labelsMade, obj = make();
      // 자리는 직접 옮기고 draw 엔 자리를 주지 않는다 — Phaser 4 의 draw(x, y) 는 WebGL 에선 원래 자리에 더하고 캔버스에선 덮어써서,
      // 지도 위 제자리(0,0 이 아닌)에 있던 건물이 그림 밖으로 밀려 빈 그림이 됐다(10-14).
      obj.setPosition((obj.x - b.x0) * res, (obj.y - b.y0) * res).setScale(res);
      tex.clear();
      tex.draw(obj);
      tex.render();
      obj.destroy();
      return labelsMade > before;
    };
    // 글씨 든 그림을 주아가 오기 전에 구웠으면 조각이 올 때 다시 굽는다(label 아래 loadingdone). 그림이 지워졌으면 그만.
    // 사람 그림(fig-)은 글씨가 없어 안 걸린다 — make 를 다시 부르면 깨지는 그림이라 다행.
    if (paint() && !juaReady()) rebakes.add(() => scene.textures.get(key) === tex && paint());
  }
  return scene.add.image(at.x, at.y, key).setOrigin(0).setScale(1 / res);
}

/** 마을 한 장 — 바닥(풀·길·광장·연못)과 건물·나무·장난감. 사람(Dude)은 장면이 세운다. */
export function drawVillage(scene: Scene, dpr: number, season: Season = seasonOf(new Date().getMonth() + 1)): VillageArt {
  const look = SEASON_LOOK[season];
  const r = rng('village');
  const W = VILLAGE_W, H = VILLAGE_H;
  // 지난번에 구운 그림이 남아 있으면(장면을 다시 열면) 지우고 다시 굽는다.
  for (const key of scene.textures.getTextureKeys()) if (key.startsWith('village-')) scene.textures.remove(key);
  const sharp = textRes(Math.min(dpr, 3)), soft = Math.min(dpr, 2); // 글씨 든 건물은 또렷하게(PC 1배에서도 2배로 굽는다), 넓은 바닥은 메모리를 아껴(바닥 다섯 장 ≈ 25MB)
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
  bands.forEach((g, i) => { const top = Math.max(100, i * BAND); g.fillStyle(look.grass).fillRect(0, top, W, Math.min(H, (i + 1) * BAND) - top); });
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
  // 작은 운동장(village.ts PITCH) — 줄무늬 잔디와 흰 선. 골대는 서 있는 것이라 아래에 따로, 공은 장면이 세운다.
  paint(PITCH.y, PITCH.y + PITCH.h, g => {
    const { x, y, w, h } = PITCH;
    g.fillStyle(0xa9cf86).fillRoundedRect(x, y, w, h, 16);
    for (let i = 0; 12 + (i + 1) * 26 < w - 12; i += 2) g.fillStyle(0xb7d995).fillRect(x + 12 + i * 26, y + 8, 26, h - 16);
    g.lineStyle(2.5, 0xffffff, 0.85).strokeRoundedRect(x + 10, y + 8, w - 20, h - 16, 8);
    g.lineBetween(x + w / 2, y + 8, x + w / 2, y + h - 8).strokeCircle(x + w / 2, y + h / 2, 22);
  });
  // 꽃 — 길·운동장 위는 비운다
  const onPitch = (x: number, y: number, m: number) => x > PITCH.x - m && x < PITCH.x + PITCH.w + m && y > PITCH.y - m && y < PITCH.y + PITCH.h + m;
  for (let i = 0; i < 90; i++) {
    const fx = r() * W, fy = 130 + r() * (H - 160);
    if (ROADS.some(b => fx > b.x - 6 && fx < b.x + b.w + 6 && fy > b.y - 6 && fy < b.y + b.h + 6) || onPitch(fx, fy, 6)) continue;
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
  // 건물 · 남쪽 문
  const live: Phaser.GameObjects.GameObject[] = [...spray];
  for (const place of PLACES) {
    const { x, y, w, h } = place.box, b = { x0: x - 24, x1: x + w + 36, y0: y - 92, y1: y + h + 12 };
    if (place.id === 'works') continue; // 공사터는 동전이 모이는 대로 바뀐다 — 아래 worksArt
    const make = () => (place.id === 'bus' ? busStop(scene, place, dpr) : place.id === 'board' || place.id === 'cards' || place.id === 'cheer' ? noteBoard(scene, place, dpr) : house(scene, place, dpr));
    keep(bake(scene, `village-${place.id}`, make, b, sharp).setDepth(y + h), b);
    if (place.id === 'dok') {
      const drop = scene.add.circle(x + DOK_DRIP.x, y + h + DOK_DRIP.y, 2.2, 0x9fd3e6).setDepth(y + h + 1);
      scene.tweens.add({ targets: drop, y: y + h - 2, alpha: 0, duration: 900, repeat: -1, ease: 'Quad.easeIn' });
      live.push(drop);
    }
  }
  const gb = { x0: 440, x1: 600, y0: GATE_Y - 70, y1: GATE_Y + 34 };
  keep(bake(scene, 'village-gate', () => {
    const gate = scene.add.graphics();
    gate.fillStyle(0x9a7356).fillRoundedRect(-62, -70, 10, 70, 4).fillRoundedRect(52, -70, 10, 70, 4).fillStyle(0xd9785f).fillRoundedRect(-74, -88, 148, 24, 10);
    return scene.add.container(520, GATE_Y + 26, [gate, label(scene, 0, -76, VILLAGE_NAME, 12, dpr, '#ffffff')]);
  }, gb, sharp).setDepth(GATE_Y + 26), gb);
  // 나무 — 색 넷을 한 번씩 굽고 그림을 여러 번 쓴다. 길·건물·광장을 비워 가장자리와 빈 풀밭에.
  const near = (at: Point, b: { x: number; y: number; w: number; h: number }, m: number) => at.x > b.x - m && at.x < b.x + b.w + m && at.y > b.y - m && at.y < b.y + b.h + m + 40;
  const TREE = { x0: -30, x1: 30, y0: -60, y1: 8 };
  const trees: VillageArt['trees'] = [];
  for (let ty = 150; ty < H - 10; ty += 64) for (let tx = 24; tx < W; tx += 64) {
    const at = { x: tx + (r() - 0.5) * 30, y: ty + (r() - 0.5) * 24 };
    if (r() < 0.45) continue;
    if (ROADS.some(b => near(at, b, 18)) || PLACES.some(p => near(at, p.box, 34)) || near(at, POND, 20) || onPitch(at.x, at.y, 26)) continue;
    if (ERRANDS.some(e => Math.abs(at.x - e.at.x) < 50 && at.y > e.at.y - 30 && at.y < e.at.y + 70)) continue; // 부탁하는 주민 자리는 비운다(나무가 가리지 않게)
    if (((at.x - PLAZA.x) / (PLAZA.r * 1.25)) ** 2 + ((at.y - PLAZA.y) / (PLAZA.r * 1.05)) ** 2 < 1) continue;
    const color = look.trees[Math.floor(r() * 4)];
    const b = { x0: at.x + TREE.x0, x1: at.x + TREE.x1, y0: at.y + TREE.y0, y1: at.y + TREE.y1 };
    trees.push({ at, img: keep(bake(scene, `village-tree-${color}`, () => tree(scene, 0, 0, color, season === 'winter'), TREE, sharp, { x: b.x0, y: b.y0 }).setDepth(at.y), b) });
  }
  // 골대 — 오른쪽 끝, 왼쪽으로 열린 그물(기둥·가로대·그물 눈). 간판 「작은 운동장」.
  const goalBox = { x0: GOAL.x - 8, x1: GOAL.x + GOAL.w + 10, y0: GOAL.y - 34, y1: GOAL.y + GOAL.h + 10 };
  keep(bake(scene, 'village-goal', () => {
    const n = scene.add.graphics(), { x, y, w, h } = GOAL, up = 24;
    n.fillStyle(0x756956, 0.14).fillEllipse(x + w / 2, y + h + 3, w + 18, 10);
    n.fillStyle(0xffffff, 0.22).fillRect(x, y - up, w, h + up);
    n.lineStyle(1, 0xffffff, 0.75);
    for (let gx = x + 7; gx < x + w; gx += 7) n.lineBetween(gx, y - up, gx, y + h);
    for (let gy = y - up + 7; gy < y + h; gy += 7) n.lineBetween(x, gy, x + w, gy);
    n.lineStyle(4, 0xfffaf0).lineBetween(x, y - up, x, y + h).lineBetween(x, y - up, x + w, y - up + 6).lineBetween(x + w, y - up + 6, x + w, y + h);
    return n;
  }, goalBox, sharp).setDepth(GOAL.y + GOAL.h), goalBox);
  const sb = { x0: PITCH.x, x1: PITCH.x + 120, y0: PITCH.y - 26, y1: PITCH.y + 4 };
  keep(bake(scene, 'village-pitch-sign', () => label(scene, PITCH.x + 60, PITCH.y - 10, '작은 운동장', 11, dpr), sb, sharp).setDepth(PITCH.y), sb);
  // 광장 벤치·가로등 — 하나씩 굽고 여러 번
  const BENCH = { x0: -24, x1: 24, y0: -22, y1: 4 }, LAMP = { x0: -12, x1: 12, y0: -66, y1: 4 };
  for (const [bx, by] of [[PLAZA.x - 118, PLAZA.y + 70], [PLAZA.x + 118, PLAZA.y + 70]]) {
    keep(bake(scene, 'village-bench', () => scene.add.container(0, 0, [
      scene.add.rectangle(0, -8, 40, 6, 0xb07a52).setRounded(2), scene.add.rectangle(0, -16, 40, 5, 0xb07a52).setRounded(2),
      scene.add.rectangle(-15, -2, 4, 10, 0x6d5444), scene.add.rectangle(15, -2, 4, 10, 0x6d5444),
    ]), BENCH, sharp, { x: bx + BENCH.x0, y: by + BENCH.y0 }).setDepth(by), { x0: bx - 24, x1: bx + 24, y0: by - 22, y1: by + 4 });
  }
  const LAMPS = [[PLAZA.x - 150, PLAZA.y - 40], [PLAZA.x + 150, PLAZA.y - 40], [PLAZA.x - 60, PLAZA.y + 130], [PLAZA.x + 60, PLAZA.y + 130]];
  for (const [lx, ly] of LAMPS) {
    keep(bake(scene, 'village-lamp', () => scene.add.container(0, 0, [scene.add.ellipse(0, 0, 14, 5, 0x2d3a2e, 0.15), scene.add.rectangle(0, -26, 4, 52, 0x6d6a73).setRounded(2), scene.add.circle(0, -54, 7, 0xfff3c4), scene.add.circle(0, -54, 11, 0xfff3c4, 0.25)]),
      LAMP, sharp, { x: lx + LAMP.x0, y: ly + LAMP.y0 }).setDepth(ly), { x0: lx - 12, x1: lx + 12, y0: ly - 66, y1: ly + 4 });
  }
  // 동물 — 광장 왼쪽 벤치 곁 고양이, 오른쪽 벤치 곁 강아지, 윗길 회색 고양이(GPT 승인 10-15). 나무·분수와 겹치지 않는 자리(나무는 광장·길엔 안 선다).
  const pets = [new Pet(scene, 'cat', { x: PLAZA.x - 92, y: PLAZA.y + 72 }), new Pet(scene, 'dog', { x: PLAZA.x + 92, y: PLAZA.y + 72 }), new Pet(scene, 'cat', { x: 300, y: 372 }, 1, 0x8f8f96)]
    .map(pet => ({ pet, near: false }));
  const pigeons = [[PLAZA.x + 40, PLAZA.y + 90], [PLAZA.x + 70, PLAZA.y + 100], [PLAZA.x - 50, PLAZA.y - 66], [560, 1200]].map(([px, py]) => pigeon(scene, px, py));
  const works = worksArt(scene, dpr);
  const MARGIN = 90; // 화면 밖 이만큼까지는 그려 둔다(걸어가며 들어올 때 갑자기 나타나지 않게)
  return {
    pigeons, pets, trees,
    lamps: LAMPS.map(([x, y]) => ({ x, y: y - 54 })),
    setWorks: works.set, builtAt: works.builtAt, built: works.built,
    cull(view) {
      const x0 = view.x - MARGIN, x1 = view.x + view.width + MARGIN, y0 = view.y - MARGIN, y1 = view.y + view.height + MARGIN;
      for (const { obj, b } of culled) obj.setVisible(b.x1 > x0 && b.x0 < x1 && b.y1 > y0 && b.y0 < y1);
    },
    destroy() {
      [...culled.map(c => c.obj), ...live, ...works.objs, ...pets.map(p => p.pet.root), ...pigeons.filter(p => !p.fled).map(p => p.root)].forEach(t => t.destroy());
    },
  };
}

// ───────────────────────── 고르면 방이 바뀐다(outcomes.ts 의 목록을 그린다) ─────────────────────────
type Obj = Phaser.GameObjects.GameObject;

/** 이모지 한 글자 — 카메라가 기기 화소만큼 키우므로 글자 그림도 그만큼 촘촘하게. */
function emoji(scene: Scene, x: number, y: number, icon: string, size: number, dpr: number) {
  return scene.add.text(x, y, icon, { fontSize: `${size}px`, resolution: textRes(dpr), padding: { x: 4, y: 4 } }).setOrigin(0.5, 1).setDepth(y);
}
function puff(scene: Scene, x: number, y: number, reduced: boolean) {
  if (reduced) return;
  for (let i = 0; i < 5; i++) {
    const c = scene.add.circle(x + (i - 2) * 7, y, 5 + (i % 2) * 2, 0xf3ead6, 0.9).setDepth(y + 1);
    scene.tweens.add({ targets: c, y: y - 10 - (i % 3) * 5, alpha: 0, scale: 1.8, duration: 520, delay: i * 30, onComplete: () => c.destroy() });
  }
}
const pop = (scene: Scene, target: Phaser.GameObjects.Text, reduced: boolean, delay = 0, to = 1) => {
  target.setScale(reduced ? to : 0);
  if (!reduced) scene.tweens.add({ targets: target, scale: to, duration: 420, delay, ease: 'Back.easeOut' });
};

/**
 * 일을 벌인다. spot = 고른 주민이 서 있던 자리. 남는 것(지어진 것·찾아온 사람)을 돌려준다 — 방을 떠날 때 지운다.
 * 기다리는 시간은 문이 열리는 것(260ms)과 겹쳐도 된다 — 걸어 나가는 것을 막지 않는다.
 */
export function playOutcome(scene: Scene, o: Outcome, at: { spot: Point; room: Room; dpr: number; reduced: boolean; seed: string }): Obj[] {
  const { spot, room, dpr, reduced } = at;
  const left: Obj[] = [];
  // 고른 쪽 벽 앞 — 내 뒤에 줄 선 주민들(아래쪽)에 가리지 않는 자리
  const anchor = { x: spot.x + (room.w / 2 - spot.x) * 0.1, y: room.wallY + 66 };
  const floorY = (k: number) => room.residents.left.y + 30 + (room.floor - room.residents.left.y - 70) * k;
  switch (o.kind) {
    case 'build': {
      puff(scene, anchor.x, anchor.y, reduced);
      const frame = scene.add.graphics().setDepth(anchor.y - 1);
      frame.lineStyle(3, 0xb07a52).strokeRect(anchor.x - 24, anchor.y - 48, 48, 48).lineBetween(anchor.x - 24, anchor.y - 24, anchor.x + 24, anchor.y - 24).lineBetween(anchor.x - 24, anchor.y - 48, anchor.x + 24, anchor.y);
      frame.setScale(1, reduced ? 1 : 0).setY(reduced ? 0 : anchor.y);
      const thing = emoji(scene, anchor.x, anchor.y, o.icon, 52, dpr);
      left.push(thing);
      if (reduced) { frame.destroy(); break; }
      thing.setScale(0);
      scene.tweens.add({ targets: frame, scaleY: 1, y: 0, duration: 320, ease: 'Sine.easeOut' });
      scene.time.delayedCall(260, () => sfx.build());
      scene.time.delayedCall(560, () => { frame.destroy(); puff(scene, anchor.x, anchor.y, false); sparkle(scene, anchor.x, anchor.y - 24, false); });
      pop(scene, thing, false, 560);
      break;
    }
    case 'rain': {
      sfx.rain();
      for (let i = 0; i < 12; i++) {
        const x = 30 + ((i * 53) % (room.w - 60)), y = floorY(((i * 37) % 10) / 10);
        const drop = emoji(scene, x, room.wallY - 10, o.icon, 22, dpr).setDepth(y);
        if (reduced) { drop.setY(y); left.push(drop); continue; }
        scene.tweens.add({ targets: drop, y, duration: 520 + (i % 4) * 90, delay: i * 55, ease: 'Bounce.easeOut' });
        scene.tweens.add({ targets: drop, alpha: 0, delay: 2200 + i * 40, duration: 500, onComplete: () => drop.destroy() });
      }
      break;
    }
    case 'visit': {
      const fromX = spot.x < room.w / 2 ? -30 : room.w + 30;
      const helper = new Dude(scene, seedLook(`helper:${at.seed}`), fromX, anchor.y, 0.95).place({ x: fromX, y: anchor.y });
      const held = emoji(scene, fromX, anchor.y - 52, o.icon, 24, dpr).setDepth(9000);
      left.push(helper.root, held);
      const to = { x: anchor.x, y: anchor.y };
      helper.look(to.x - fromX, 0);
      const done = () => { helper.walk(16, false, reduced); helper.look(0, 1); helper.hop(12, 2, reduced); sparkle(scene, to.x, to.y - 30, reduced); sfx.meet(); };
      if (reduced) { helper.place(to); held.setPosition(to.x, to.y - 52); done(); break; }
      scene.tweens.addCounter({
        from: 0, to: 1, duration: 1100, ease: 'Sine.easeInOut',
        onUpdate: tw => { const k = tw.getValue() ?? 1, x = fromX + (to.x - fromX) * k; helper.place({ x, y: to.y }).walk(16, true, false); held.setPosition(x, to.y - 52 + Math.sin(k * 20) * 1.5); },
        onComplete: done,
      });
      break;
    }
    case 'grow': {
      const sprout = emoji(scene, anchor.x, anchor.y, '🌱', 22, dpr);
      const grown = emoji(scene, anchor.x, anchor.y, o.icon, 54, dpr).setVisible(false);
      left.push(sprout, grown);
      if (reduced) { sprout.setVisible(false); grown.setVisible(true); break; }
      pop(scene, sprout, false);
      sfx.grow();
      scene.tweens.add({ targets: sprout, scale: 1.6, duration: 420, delay: 480, ease: 'Sine.easeIn', onComplete: () => {
        sprout.setVisible(false); grown.setVisible(true); pop(scene, grown, false); sparkle(scene, anchor.x, anchor.y - 30, false);
        for (let i = 0; i < 6; i++) { const leaf = scene.add.ellipse(anchor.x, anchor.y - 30, 6, 3, 0x8cc07a).setDepth(9000); scene.tweens.add({ targets: leaf, x: anchor.x + (i - 2.5) * 16, y: anchor.y - 6, alpha: 0, angle: 200, duration: 700, onComplete: () => leaf.destroy() }); }
      } });
      break;
    }
    case 'spread': {
      const spots = [0.12, 0.3, 0.5, 0.7, 0.88].map((kx, i) => ({ x: room.w * kx, y: floorY([0.15, 0.6, 0.35, 0.65, 0.2][i]) }));
      spots.forEach((p, i) => {
        const thing = emoji(scene, p.x, p.y, o.icon, 24, dpr);
        left.push(thing);
        pop(scene, thing, reduced, i * 130);
        if (!reduced) scene.time.delayedCall(i * 130, () => { sfx.bubble(i); sparkle(scene, p.x, p.y - 14, false); });
      });
      break;
    }
    case 'focus': {
      const ring = scene.add.circle(anchor.x, anchor.y - 28, 38, 0xffe39a, 0.45).setDepth(anchor.y - 2);
      const thing = emoji(scene, anchor.x, anchor.y, o.icon, 58, dpr);
      left.push(ring, thing);
      pop(scene, thing, reduced, 120);
      if (!reduced) {
        ring.setScale(0.2);
        scene.tweens.add({ targets: ring, scale: 1.4, duration: 520, ease: 'Back.easeOut' });
        scene.tweens.add({ targets: ring, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, delay: 520 });
        scene.time.delayedCall(140, () => { sfx.focus(); sparkle(scene, anchor.x, anchor.y - 30, false); });
      }
      break;
    }
    case 'drive': {
      const y = room.wallY + 44, from = room.w + 40, to = -40;
      const car = emoji(scene, from, y, o.icon, 36, dpr).setDepth(y);
      left.push(car);
      sfx.honk();
      if (reduced) { car.destroy(); left.pop(); break; }
      scene.tweens.add({
        targets: car, x: to, duration: 1500, ease: 'Sine.easeInOut',
        onUpdate: () => { car.y = y + Math.sin(car.x / 9) * 1.2; },
        onComplete: () => car.destroy(),
      });
      scene.time.addEvent({ delay: 140, repeat: 9, callback: () => { if (car.active) puff(scene, car.x + 20, y, false); } });
      break;
    }
  }
  return left;
}

// ───────────────────────── 방마다 다른 길(twists.ts) ─────────────────────────
export type TwistArt = {
  objs: Phaser.GameObjects.GameObject[];
  /** 졸린 고양이(깨면 옆으로 비켜 걷는다) */ cat?: Cat; zz?: Phaser.GameObjects.Text;
};
/** 놀이 그림 — 개울(물·물결·징검돌), 문 앞 졸린 고양이(Zz). 깊이는 바닥 위·사람 아래. 골대는 마을 작은 운동장으로 옮겼다(drawVillage). */
export function drawTwist(scene: Scene, kind: TwistKind, room: Room, dpr: number, reduced: boolean): TwistArt {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const text = (x: number, y: number, t: string, size: number) => scene.add.text(x, y, t, { fontSize: `${size}px`, resolution: textRes(dpr), padding: { x: 4, y: 4 } }).setOrigin(0.5, 1);
  if (kind === 'stream') {
    const s = streamOf(room), g = scene.add.graphics().setDepth(s.y0 - 200);
    g.fillStyle(0x8fc6d8).fillRoundedRect(-10, s.y0, room.w + 20, s.y1 - s.y0, 18);
    g.fillStyle(0xb5dceb).fillRoundedRect(-10, s.y0 + 6, room.w + 20, s.y1 - s.y0 - 12, 14);
    g.fillStyle(0xe8dcbc).fillRect(-10, s.y0 - 3, room.w + 20, 4).fillRect(-10, s.y1 - 1, room.w + 20, 4);
    for (let x = 14; x < room.w; x += 46) g.lineStyle(2, 0xffffff, 0.55).lineBetween(x, s.y0 + 18 + (x % 3) * 6, x + 14, s.y0 + 18 + (x % 3) * 6);
    for (const t of s.stones) g.fillStyle(0x756956, 0.18).fillEllipse(t.x, t.y + 4, s.r * 1.9, 12).fillStyle(0xcfc6b4).fillEllipse(t.x, t.y, s.r * 1.85, s.r * 1.25).fillStyle(0xe4ddcf).fillEllipse(t.x - 3, t.y - 3, s.r * 1.2, s.r * 0.6);
    objs.push(g);
    if (!reduced) { // 물결이 흐른다
      const ripple = scene.add.graphics().setDepth(s.y0 - 199);
      ripple.lineStyle(2, 0xffffff, 0.4);
      for (let x = -20; x < room.w + 40; x += 60) ripple.lineBetween(x, s.y1 - 14, x + 18, s.y1 - 14);
      scene.tweens.add({ targets: ripple, x: 60, duration: 2400, repeat: -1 });
      objs.push(ripple);
    }
    return { objs };
  }
  {
    const at = catOf(room), kitty = cat(scene, at.x, at.y, 0xc9a27e);
    kitty.root.setDepth(at.y).setScale(1.25);
    kitty.pet.step(0, reduced, true);
    const zz = text(at.x + 16, at.y - 26, 'Zz', 15).setColor('#7a6655').setDepth(at.y + 1);
    if (!reduced) scene.tweens.add({ targets: zz, y: zz.y - 6, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    objs.push(kitty.root, zz);
    return { objs, cat: kitty, zz };
  }
}
