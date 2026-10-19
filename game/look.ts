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
/**
 * 머리색 — 앞 여섯은 10-15 저녁 전부터 쓰던 것(옛 번호를 지키려고 그대로), 뒤 아홉은 승인한 색(GPT 검토판 roster.ts, 10-15 승인).
 * 고르는 칸에는 승인한 열셋만 그 차례로(HAIR_MENU) — 옛 회색·주황 갈색은 옛 링크·옛 저장으로만 보인다.
 */
export const HAIRS = [0x3b2b25, 0x6b4a32, 0x2e2e3a, 0xc9c4bd, 0xc7843f, 0x8a3d2e, 0xa67b55, 0xcaa665, 0x80465b, 0xd69aaa, 0xa795c8, 0x7393bf, 0x86b9a5, 0xb9beca, 0xeee9df];
export const HAIR_MENU: { i: number; name: string }[] = [
  { i: 2, name: '검정' }, { i: 0, name: '흑갈색' }, { i: 1, name: '갈색' }, { i: 6, name: '밝은갈색' }, { i: 7, name: '금색' }, { i: 5, name: '적갈색' },
  { i: 8, name: '버건디' }, { i: 9, name: '분홍' }, { i: 10, name: '보라' }, { i: 11, name: '파랑' }, { i: 12, name: '민트' }, { i: 13, name: '은색' }, { i: 14, name: '흰색' },
];
const SILVER = 13, WHITE = 14;
/** 눈썹·수염 색 — 머리색을 바꿔도 따라 바뀌지 않는다(승인 기준 「머리색을 바꿔도 눈썹·수염·미소선이 자동으로 바뀌지 않는다」). */
export const BROW = 0x4b3a33;

/*
  성인 열두 모습 — GPT 검토판(game/review/round, 10-15 승인). 어린이 없음, 성별·나이 값 없음.
  열두 「기본 조합」은 무작위·주민 모습·옛 기록에서 그대로 쓴다.
  고르는 판은 얼굴·머리·옷을 각각 따로 고른다(10-19). 눈썹·수염·미소선·바지·신발은 기본 조합 번호에서 읽는다.
  안경·머리 장식(액세서리)은 처음에 고르지 않고 마을 부탁의 보상으로만 받는다(사용자 10-17 「악세사리는 다 보상으로」, 안경도 액세서리로) —
  그래서 기본 조합은 안경을 정하지 않는다. 안경 쓴 기본 조합(FORMS 의 glasses)은 마을 주민(lookFrom)·옛 링크(fullPick)만 그대로 쓴다.
*/
export type HairStyle = 'bob' | 'wave' | 'curls' | 'bun' | 'part' | 'cloud' | 'forehead' | 'shoulder' | 'crop' | 'lowTie';
export type Top = 'cardigan' | 'stripes' | 'hoodie' | 'apron' | 'jacket' | 'vest' | 'shirt' | 'blazer' | 'knit';
export const HAIR_STYLES: { value: HairStyle; name: string }[] = [
  { value: 'bob', name: '단발' }, { value: 'wave', name: '웨이브' }, { value: 'curls', name: '곱슬' }, { value: 'bun', name: '올림머리' }, { value: 'part', name: '가르마' },
  { value: 'cloud', name: '둥근 파마' }, { value: 'forehead', name: '넓은 이마' }, { value: 'shoulder', name: '어깨 단발' }, { value: 'crop', name: '짧은 머리' }, { value: 'lowTie', name: '낮은 묶음' },
];
export const TOPS: { value: Top; name: string }[] = [
  { value: 'cardigan', name: '가디건' }, { value: 'stripes', name: '줄무늬' }, { value: 'hoodie', name: '후드' }, { value: 'apron', name: '앞치마' }, { value: 'jacket', name: '점퍼' },
  { value: 'vest', name: '조끼' }, { value: 'shirt', name: '셔츠' }, { value: 'blazer', name: '정장 재킷' }, { value: 'knit', name: '니트' },
];
/** 머리색 넣는 방식 — 섞는 색(포인트)은 단색이 아닐 때만 쓴다. */
export type HairPattern = 'solid' | 'streak' | 'mixed' | 'temples';
export const PATTERNS: { value: HairPattern; name: string }[] = [
  { value: 'solid', name: '전체 단색' }, { value: 'streak', name: '앞머리 한 줄' }, { value: 'mixed', name: '고루 섞기' }, { value: 'temples', name: '양옆만' },
];
/** 머리 장식 — 하나만, 안경과는 같이 쓴다. 모자는 승인에서 뺐다. */
export type Accessory = 'none' | 'headband' | 'hairpin' | 'ribbon';
export const ACCESSORIES: { value: Accessory; name: string }[] = [
  { value: 'none', name: '없음' }, { value: 'headband', name: '머리띠' }, { value: 'hairpin', name: '머리핀' }, { value: 'ribbon', name: '작은 리본' },
];
export const GLASSES = ['없음', '둥근 안경'];

export type Form = { name: string; hair: HairStyle; top: Top; pants: number; shoes?: number; glasses?: boolean; brows?: boolean; beard?: boolean; smileLines?: boolean; smileEyes?: boolean; wideSmile?: boolean };
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
  // 새 표정은 끝에만 덧붙인다 — 앞 열두 번호와 옛 기록은 그대로(10-19).
  { name: '웃는 눈', hair: 'bob', top: 'cardigan', pants: 0x9e8574, smileEyes: true },
  { name: '활짝 미소', hair: 'bob', top: 'cardigan', pants: 0x9e8574, wideSmile: true },
];
/** 무작위·주민은 기존 열두 조합에서만 골라 같은 씨앗의 생김새를 유지한다. */
const BASE_FORM_COUNT = 12;

/** 얼굴 단추 — 저장에는 기본 모습 번호만 쓴다. 머리·옷·안경·장식과는 독립(10-19). */
export const FACES = [
  { i: 0, name: '기본' }, { i: 12, name: '웃는 눈' }, { i: 13, name: '활짝 미소' }, { i: 5, name: '또렷한 눈썹' }, { i: 6, name: '웃음 주름' }, { i: 9, name: '짧은 수염' },
];
/** 옛 기본 모습도 눈썹·미소선·수염으로 같은 얼굴 단추를 켠다. */
export function faceOf(form: number): number {
  const f = FORMS[form];
  return f.smileEyes ? 12 : f.wideSmile ? 13 : f.beard ? 9 : f.smileLines ? 6 : f.brows ? 5 : 0;
}

export type Look = {
  coat: number; skin: number; hair: number; accent: number; pattern: HairPattern;
  style: HairStyle; top: Top; glasses: boolean; accessory: Accessory;
  /** 기본 조합 — 바지·신발·눈썹·수염·미소선은 여기서. */
  form: Form;
};
/**
 * 고른 번호 열 칸 — [기본 조합, 머리색, 옷 색, 피부, 색 넣기, 머리 모양, 옷, 안경, 머리 장식, 섞는 색].
 * 10-15 저녁 전의 넷·다섯 칸([모습, 머리 색, 옷 색, 피부, 흰머리])도 받는다 — 옛 링크·옛 저장·서버에 남은 다녀간 사람.
 * 넷·다섯 칸이면 늘 옛 뜻으로 읽고(fullPick), 쓰는 곳은 fullPick 으로 열 칸으로 펴서 쓴다.
 */
export type Pick = [form: number, hair: number, coat: number, skin: number, pattern?: number, style?: number, top?: number, glasses?: number, accessory?: number, accent?: number];
export const PICK_SIZES = [FORMS.length, HAIRS.length, COATS.length, SKINS.length, PATTERNS.length, HAIR_STYLES.length, TOPS.length, GLASSES.length, ACCESSORIES.length, HAIRS.length];
/** 옛 다섯 칸의 크기 — 머리 색 여섯, 흰머리 여섯(원래 색·앞머리 한 줄·고루 섞기·양옆만·은발·백발). */
const LEGACY_SIZES = [FORMS.length, 6, COATS.length, SKINS.length, 6];

const inRange = (value: unknown[], sizes: number[]) => value.every((n, i) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < sizes[i]);
export const isPick = (value: unknown): value is Pick => Array.isArray(value)
  && ((value.length === 4 || value.length === 5) ? inRange(value, LEGACY_SIZES) : value.length === PICK_SIZES.length && inRange(value, PICK_SIZES));

/** 옛 흰머리 → [색 넣기, 섞는 색, 바꿀 머리색]. 은발·백발은 이제 머리색이다. */
const LEGACY_TONE: [number, number, number?][] = [[0, WHITE], [1, WHITE], [2, SILVER], [3, WHITE], [0, WHITE, SILVER], [0, WHITE, WHITE]];
const styleOf = (form: Form) => HAIR_STYLES.findIndex(s => s.value === form.hair);
const topOf = (form: Form) => TOPS.findIndex(t => t.value === form.top);
/** 어떤 꼴이든 열 칸으로(옛 넷·다섯 칸은 그 모습의 머리 모양·옷·안경으로 채운다). */
export function fullPick(pick: Pick): Required<Pick> {
  if (pick.length === PICK_SIZES.length) return [...pick] as Required<Pick>;
  const [form, hair, coat, skin, tone = 0] = pick, f = FORMS[form];
  const [pattern, accent, hairOverride] = LEGACY_TONE[tone];
  return [form, hairOverride ?? hair, coat, skin, pattern, styleOf(f), topOf(f), f.glasses ? 1 : 0, 0, accent];
}
/** 기본 조합을 고르면 — 머리 모양·옷을 그 모습으로 맞춘다(색·피부·안경·장식은 그대로 — 안경·장식은 보상으로 받은 것). */
export function withForm(pick: Pick, form: number): Required<Pick> {
  const p = fullPick(pick), f = FORMS[form];
  p[0] = form; p[5] = styleOf(f); p[6] = topOf(f);
  return p;
}
export const DEFAULT_PICK: Pick = fullPick([0, 0, 0, 0]);

export const toLook = (pick: Pick): Look => {
  const [form, hair, coat, skin, pattern, style, top, glasses, accessory, accent] = fullPick(pick);
  return { form: FORMS[form], hair: HAIRS[hair], coat: COATS[coat], skin: SKINS[skin], pattern: PATTERNS[pattern].value, style: HAIR_STYLES[style].value,
    top: TOPS[top].value, glasses: glasses === 1, accessory: ACCESSORIES[accessory].value, accent: HAIRS[accent] };
};

/** 「어떤 모습이 나올까?」 — 기본 조합 하나에 색·색 넣기를 무작위로(머리 모양·옷은 그 조합대로). 안경·장식은 keep 것 그대로(보상으로 받은 것이라). */
export function randomPick(random = Math.random, keep?: Pick): Required<Pick> {
  const at = (n: number) => Math.floor(random() * n);
  const p = withForm([0, 0, 0, 0], at(BASE_FORM_COUNT)), kept = keep ? fullPick(keep) : undefined;
  p[1] = HAIR_MENU[at(HAIR_MENU.length)].i; p[2] = at(COATS.length); p[3] = at(SKINS.length);
  p[4] = random() < 0.65 ? 0 : 1 + at(PATTERNS.length - 1); p[9] = HAIR_MENU[at(HAIR_MENU.length)].i;
  p[7] = kept?.[7] ?? 0; p[8] = kept?.[8] ?? 0;
  return p;
}

/**
 * 부탁 보상 — 날마다(부탁 셋을 다 들어주면) 하나씩, 이 차례로. 받으면 바로 쓴다(옷장에서 갈아입기는 아직 안 만듦 — 사용자 10-17 「일단 구현하지 말고」).
 * 다섯째 날 것은 새 액세서리 — 그림은 GPT 몫(README 「GPT 에게 — 새 액세서리」), 그리기 전까지는 비워 둔다.
 */
export const REWARDS: { name: string; slot: 7 | 8; value: number }[] = [
  { name: '머리핀', slot: 8, value: 2 }, { name: '머리띠', slot: 8, value: 1 }, { name: '작은 리본', slot: 8, value: 3 }, { name: '둥근 안경', slot: 7, value: 1 },
];
/** 받은 액세서리를 쓴 모습. */
export function wearing(pick: Pick, reward: (typeof REWARDS)[number]): Required<Pick> {
  const p = fullPick(pick); p[reward.slot] = reward.value; return p;
}

/**
 * 주민 모습 — 문항 id 와 화면 쪽으로 정한다(답의 a·b 와 엮이지 않게). 첫 옷 색(나의 기본색)은 쓰지 않는다.
 * 머리색은 자연색 여섯 중에서, 은색·흰색 섞기는 셋 중 하나쯤, 머리 장식은 다섯 중 하나쯤.
 */
export function lookFrom(seed: string): Look {
  const r = rng(seed);
  const at = <T>(list: readonly T[], from = 0) => list[from + Math.floor(r() * (list.length - from))];
  const form = Math.floor(r() * BASE_FORM_COUNT), coat = Math.floor(1 + r() * (COATS.length - 1)), skin = Math.floor(r() * SKINS.length);
  const p = withForm([form, 0, coat, skin], form);
  p[7] = FORMS[form].glasses ? 1 : 0; // 주민은 기본 조합대로 안경을 쓴다 — 받을 수 있는 걸 마을에서 미리 보게
  p[1] = at(HAIR_MENU.slice(0, 6)).i;
  if (r() < 0.35) { p[4] = 1 + Math.floor(r() * (PATTERNS.length - 1)); p[9] = r() < 0.5 ? SILVER : WHITE; }
  if (r() < 0.2) p[8] = 1 + Math.floor(r() * (ACCESSORIES.length - 1));
  return toLook(p);
}

/** 머리에 칠할 색 — 고루 섞기는 바탕색에 섞는 색을 조금(38%), 나머지는 바탕색(앞머리 한 줄·양옆은 그림이 섞는 색으로 따로 그린다). */
export function hairColor(look: Look) {
  if (look.pattern !== 'mixed') return look.hair;
  const mix = (shift: number) => Math.round(((look.hair >> shift) & 255) * 0.62 + ((look.accent >> shift) & 255) * 0.38) << shift;
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
