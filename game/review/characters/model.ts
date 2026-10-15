import { FEEL } from '../../feel';

export const HAIR_NAMES = ['가르마 웨이브', '앞머리 단발', '짧은 파마', '어깨 웨이브', '짧은 앞머리', '올림머리', '낮은 묶음', '긴 생머리'];
export const TOP_NAMES = ['줄무늬 맨투맨', '가디건', '니트 조끼', '집업 점퍼', '후드', '블라우스', '둥근 니트', '겉셔츠'];
export const BOTTOM_NAMES = ['와이드 청바지', '일자 바지', 'A라인 치마', '편한 바지'];
export const SHOE_NAMES = ['운동화', '로퍼', '메리제인', '편한 신발'];
export const FACE_NAMES = ['다정한 미소', '밝은 미소', '차분한 눈'];
export const COLORS = {
  skin: [0xffdbbc, 0xf4c49e, 0xdba67f, 0xb98260, 0x956444],
  hairTone: [0x71666b, 0x9b7765, 0xc6a078, 0xe2ded8, 0xc98872, 0x95809f],
  topTone: [0x93babb, 0xedb6a2, 0xc3a6c5, 0xb9cfad, 0xe8d8b9, 0xa8bfd5, 0xbdaecf, 0xf0d5ba],
  bottomTone: [0x9bafc6, 0xd7c2a4, 0xdca48d, 0x8f96a2, 0xada097, 0xbdafa2],
  shoeTone: [0xffffff, 0xc7b39e, 0x9b8d87, 0xa6b4c1],
};
export type Look = {hair:number;top:number;bottom:number;shoe:number;face:number;glasses:boolean;skin:number;hairTone:number;topTone:number;bottomTone:number;shoeTone:number};
const LIMITS = {hair:8,top:8,bottom:4,shoe:4,face:3,skin:5,hairTone:6,topTone:8,bottomTone:6,shoeTone:4};
export function isLook(value: unknown): value is Look {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const look = value as Record<string, unknown>;
  return typeof look.glasses === 'boolean' && Object.entries(LIMITS).every(([key,max]) => Number.isInteger(look[key]) && Number(look[key]) >= 0 && Number(look[key]) < max);
}
export function readLook(json: string | null): Look | undefined {
  try { const value: unknown = JSON.parse(json ?? 'null'); return isLook(value) ? {...value} : undefined; } catch { return undefined; }
}
const shapes = [
  [0,0,0,0,0,0,0,0,0], [1,1,1,1,0,1,0,1,1], [2,2,3,3,0,1,3,2,4],
  [3,3,0,0,1,0,1,3,0], [4,4,3,0,1,2,0,5,3], [5,5,2,2,2,0,1,7,2],
  [6,6,1,1,2,1,2,4,1], [7,7,2,2,0,0,0,6,4], [0,5,1,2,2,2,4,1,1],
  [1,4,0,0,1,3,1,6,0], [2,7,3,3,0,2,3,4,5], [6,1,2,1,1,1,0,3,2],
];
export const PRESETS: Look[] = shapes.map(([hair,top,bottom,shoe,face,skin,hairTone,topTone,bottomTone], i) => ({hair,top,bottom,shoe,face,skin,hairTone,topTone,bottomTone,shoeTone:i%4,glasses:i===2 || i===10}));
export function poseAt(time: number, moving: boolean, reduced: boolean) {
  const phase = time / FEEL.stepMs * Math.PI * 2;
  const wave = reduced || !moving ? 0 : Math.sin(phase);
  const breath = reduced || moving ? 0 : Math.sin(time / 520) * .025;
  return {
    leftFoot:wave>0 ? -wave*3 : 0,
    rightFoot:wave<0 ? wave*3 : 0,
    bob:-Math.abs(wave)*FEEL.bobPx,
    arm:0,
    scaleX:moving && !reduced ? 1+Math.cos(phase*2)*FEEL.squash*.5 : 1-breath*.5,
    scaleY:1+breath,
  };
}
