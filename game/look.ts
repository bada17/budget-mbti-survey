/*
  사람 모습의 값 — 색 목록과 고른 번호. 그림(draw.ts)과 친구 초대 코드(profile.ts)가 같이 쓴다.
  초대 코드에는 색이 아니라 번호가 들어가므로, 색을 바꿔도 예전 링크가 깨지지 않는다.
  목록 끝에 덧붙이는 건 괜찮고, 순서를 바꾸면 예전 링크의 모습이 달라진다.
*/

/** 시드 난수: 같은 방·같은 주민은 늘 같은 모습. */
export function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const COATS = [0xff6b57, 0x6aa6d9, 0xf0a35e, 0x8cc084, 0xd98cb3, 0xb59ad9, 0xe6c35c, 0x7fc4c0, 0xe58f8f, 0x9db0c9, 0xc4a77d];
export const SKINS = [0xf8dcc2, 0xf0c39f, 0xd9a07a, 0xb57b55, 0x8a5a3c];
export const HAIRS = [0x3b2b25, 0x6b4a32, 0x2e2e3a, 0xc9c4bd, 0xc7843f, 0x8a3d2e];

/**
 * 성인 열두 모습 — GPT 검토판(game/review/round, 10-15 사용자 승인)을 본편에 옮겼다. 어린이 없음, 성별·나이 값 없음.
 * 머리 모양·옷·바지는 모습마다 정해져 있고, 머리 색·흰머리·옷 색·피부는 따로 고른다.
 * 눈썹·수염·미소선은 모습에 붙어 있어 머리 색을 바꿔도 그대로다.
 */
export type HairStyle = 'bob' | 'wave' | 'curls' | 'bun' | 'part' | 'cloud' | 'forehead' | 'shoulder' | 'crop' | 'lowTie';
export type Top = 'cardigan' | 'stripes' | 'hoodie' | 'apron' | 'jacket' | 'vest' | 'shirt' | 'blazer' | 'knit';
export type Form = { name: string; hair: HairStyle; top: Top; pants: number; shoes?: number; glasses?: boolean; brows?: boolean; beard?: boolean; smileLines?: boolean };
export const FORMS: Form[] = [
  { name: '단발·가디건', hair: 'bob', top: 'cardigan', pants: 0x9e8574 },
  { name: '웨이브·줄무늬', hair: 'wave', top: 'stripes', pants: 0x718397 },
  { name: '곱슬·후드', hair: 'curls', top: 'hoodie', pants: 0x747c89 },
  { name: '올림머리·앞치마', hair: 'bun', top: 'apron', pants: 0x9a8c79 },
  { name: '가르마·점퍼', hair: 'part', top: 'jacket', pants: 0x677580 },
  { name: '둥근 파마·조끼', hair: 'cloud', top: 'vest', pants: 0x82756f, shoes: 0x756159, glasses: true, brows: true },
  { name: '넓은 이마·셔츠', hair: 'forehead', top: 'shirt', pants: 0x777b83, brows: true, smileLines: true },
  { name: '어깨 단발·재킷', hair: 'shoulder', top: 'blazer', pants: 0x767584, brows: true, smileLines: true },
  { name: '웨이브·니트', hair: 'wave', top: 'knit', pants: 0x7f7c76, glasses: true, brows: true, smileLines: true },
  { name: '짧은 수염·점퍼', hair: 'crop', top: 'jacket', pants: 0x737987, brows: true, beard: true },
  { name: '낮은 묶음·앞치마', hair: 'lowTie', top: 'apron', pants: 0x8e8074, brows: true, smileLines: true },
  { name: '짧은 파마·가디건', hair: 'curls', top: 'cardigan', pants: 0x81766c, glasses: true, brows: true, smileLines: true },
];
/** 흰머리 — 나이와 상관없이 누구나 고른다. */
export const TONES = ['natural', 'streak', 'mixed', 'temples', 'silver', 'white'] as const;
export type HairTone = typeof TONES[number];
export const TONE_NAMES = ['원래 색', '앞머리 한 줄', '고루 섞기', '양옆만', '은발', '백발'];

export type Look = { coat: number; skin: number; hair: number; form: Form; tone: HairTone };
/**
 * 고른 번호 — [모습, 머리 색, 옷 색, 피부, 흰머리]. 흰머리는 10-15 에 덧붙여 없어도 된다(옛 링크·옛 저장).
 * 10-15 전의 첫 칸은 머리 모양 다섯이었다 — 옛 번호는 앞의 다섯 모습으로 읽힌다.
 */
export type Pick = [form: number, hair: number, coat: number, skin: number, tone?: number];
export const PICK_SIZES = [FORMS.length, HAIRS.length, COATS.length, SKINS.length, TONES.length];
export const DEFAULT_PICK: Pick = [0, 0, 0, 0, 0];

export const isPick = (value: unknown): value is Pick =>
  Array.isArray(value) && (value.length === 4 || value.length === 5) && value.every((n, i) => Number.isInteger(n) && n >= 0 && n < PICK_SIZES[i]);

export const toLook = ([form, hair, coat, skin, tone = 0]: Pick): Look =>
  ({ form: FORMS[form], hair: HAIRS[hair], coat: COATS[coat], skin: SKINS[skin], tone: TONES[tone] });

export function randomPick(random = Math.random): Pick {
  return PICK_SIZES.map(size => Math.floor(random() * size)) as Pick;
}

/** 주민 모습 — 문항 id 와 화면 쪽으로 정한다(답의 a·b 와 엮이지 않게). 첫 옷 색(나의 기본색)은 쓰지 않는다. 흰머리는 셋 중 하나쯤. */
export function lookFrom(seed: string): Look {
  const r = rng(seed);
  const at = <T>(list: readonly T[], from = 0) => list[from + Math.floor(r() * (list.length - from))];
  const form = at(FORMS), coat = at(COATS, 1), skin = at(SKINS), hair = at(HAIRS);
  return { form, coat, skin, hair, tone: r() < 0.65 ? 'natural' : at(TONES, 1) };
}

/** 흰머리를 입힌 머리 색 — 섞기는 바탕색에 회색을 조금(눈썹·수염은 바탕색 그대로). */
export function hairColor(look: Look) {
  if (look.tone === 'silver') return 0xb9beca;
  if (look.tone === 'white') return 0xeee9df;
  if (look.tone !== 'mixed') return look.hair;
  const mix = (shift: number) => Math.round(((look.hair >> shift) & 255) * 0.62 + ((0xa5a6a8 >> shift) & 255) * 0.38) << shift;
  return mix(16) | mix(8) | mix(0);
}

/**
 * 주민 이름 — 말 상자의 이름표(10-14 사용자 「동물의 숲처럼」). 같은 주민은 늘 같은 이름. 순우리말로, 성별을 가리지 않는 것만.
 * 끝에 덧붙이는 건 괜찮고, 순서를 바꾸면 주민 이름이 바뀐다.
 */
export const NAMES = [
  '하늘', '바다', '솔', '봄', '별', '다온', '하람', '이든', '나래', '가람', '누리', '단비', '미르', '보람', '새롬', '슬기', '아라', '여름', '온유', '윤슬',
  '은솔', '초롱', '한결', '해솔', '라온', '시내', '도담', '마루', '빛나', '그루', '다솜', '가온', '늘봄', '새벽', '찬솔', '푸름', '한별', '이슬', '노을', '구름',
];
export const nameFrom = (seed: string) => NAMES[Math.floor(rng(`${seed}#name`)() * NAMES.length)];
