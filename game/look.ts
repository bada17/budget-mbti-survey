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
/** 머리 모양. 9 는 앞챙 모자(옷 색). */
export const STYLES = [9, 0, 1, 2, 3];
export const STYLE_NAMES = ['모자', '짧은 머리', '올림머리', '긴 머리', '머리띠'];

export type Look = { coat: number; skin: number; hair: number; style: number; tall: number };
/** 고른 번호 — [머리 모양, 머리 색, 옷 색, 피부]. */
export type Pick = [style: number, hair: number, coat: number, skin: number];
export const PICK_SIZES = [STYLES.length, HAIRS.length, COATS.length, SKINS.length];
export const DEFAULT_PICK: Pick = [0, 0, 0, 0];

export const isPick = (value: unknown): value is Pick =>
  Array.isArray(value) && value.length === 4 && value.every((n, i) => Number.isInteger(n) && n >= 0 && n < PICK_SIZES[i]);

export const toLook = ([style, hair, coat, skin]: Pick): Look =>
  ({ style: STYLES[style], hair: HAIRS[hair], coat: COATS[coat], skin: SKINS[skin], tall: 1 });

export function randomPick(random = Math.random): Pick {
  return PICK_SIZES.map(size => Math.floor(random() * size)) as Pick;
}

/** 주민 모습 — 문항 id 와 화면 쪽으로 정한다(답의 a·b 와 엮이지 않게). 첫 옷 색(나의 기본색)은 쓰지 않는다. */
export function lookFrom(seed: string): Look {
  const r = rng(seed);
  const at = <T>(list: readonly T[], from = 0) => list[from + Math.floor(r() * (list.length - from))];
  return { coat: at(COATS, 1), skin: at(SKINS), hair: at(HAIRS), style: Math.floor(r() * 4), tall: 0.9 + r() * 0.2 };
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
