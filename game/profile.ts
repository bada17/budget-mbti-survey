/*
  나·내 이웃·친구 초대 코드. 화면이나 Phaser 없이 시험된다.

  · 나(이름·모습)와 내 이웃은 이 기기 브라우저에만 남는다(localStorage). 서버로 가지 않는다.
  · 친구 초대 코드는 링크(?with=)에 들어간다 — 이름·모습 번호·유형, 그리고 그 친구가 지은 동네(고른 쪽 열다섯 자).
    받은 코드는 남이 만든 값이라 다 검사한다.
  · 내 동네 = 이번 판에 고른 열다섯 가지. 다시 하면 새로 지어지고, 지난번과 달라진 곳을 표시한다(사용자 10-14).
  · 다시 올 이유(기획 3차, 10-14) — 답장(링크에 「누구에게 답하는지」 를 같이 싣는다)·방명록 집 번호·
    시민증 도장·우리 지역도 이 기기에 남는다.
  · 로그인(카카오·구글, 10-14 「로그인 넣어야 새로 들어올 때 기록될 듯」)하면 이것들을 한 묶음(Save)으로 서버에도 둔다 —
    카톡 안 브라우저와 크롬은 저장소가 따로라, 로그인 없이는 같은 사람이 다시 와도 처음 온 사람이 된다. 규칙은 login.ts·api.ts.
*/
import { TYPES, COMMON_QUESTIONS, FIELD_QUESTIONS, ROUTE, type TypeCode } from './content';
import { isPick, fullPick, randomPick, DEFAULT_PICK, REWARDS, type Pick } from './look';

/** at = 사람이 직접 고르거나 이름을 쓴 때 — 로그인해 합칠 때 더 나중에 고른 쪽이 이긴다(importSave). 손 안 댄 기본 모습엔 없다. */
export type Me = { name: string; pick: Pick; at?: number };
export type Neighbor = { questionId: string; key: 'a' | 'b'; seed: string; name: string; at: number };
/** 링크에 실려 오가는 한 사람 — 이름·모습·유형·지은 동네. */
export type Friend = { name: string; pick: Pick; type: TypeCode; town?: Town };
/**
 * 친구 초대 링크(?with=). home = 보낸 사람의 방명록 집 번호(끝까지 걸으면 거기에 다녀간 기록이 남는다).
 * replyTo = 답장일 때 — 이 링크가 답하는 사람(처음에 나를 부른 친구). 그 사람이 열면 걷지 않고 두 동네를 바로 본다.
 */
export type Invite = Friend & { home?: string; replyTo?: Friend };
/** 내 동네 — 길 순서(ROUTE)대로 고른 쪽을 열다섯 자로('a'·'b'). */
export type Town = string;

const NAME_MAX = 10;
const QUESTION_IDS = new Set([...COMMON_QUESTIONS, ...FIELD_QUESTIONS].map(q => q.id));

/** 이름: 앞뒤 빈칸·제어 문자를 빼고 10자까지. 비면 ''. */
export function cleanName(value: unknown) {
  if (typeof value !== 'string') return '';
  return [...value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim()].slice(0, NAME_MAX).join('');
}

/** 끝 글자 받침이 있으면 a(이·을), 없으면 b(가·를). 닫는 괄호·따옴표는 건너뛰고 본다. */
export function josa(word: string, a: string, b: string) {
  const last = word.replace(/[」』"'”’)\]\s]+$/, '').slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 ? a : b);
}

const isType = (value: unknown): value is TypeCode => typeof value === 'string' && value in TYPES;

// ── 내 동네 ──
export const TOWN_IDS = ROUTE.flatMap(stage => stage.ids);
const TOWN_RE = new RegExp(`^[ab]{${TOWN_IDS.length}}$`);
export const isTown = (value: unknown): value is Town => typeof value === 'string' && TOWN_RE.test(value);
/** 답(1~6)에서 동네로 — 1~3 은 a 쪽, 4~6 은 b 쪽(response.ts 와 같은 갈림). 다 답하지 않았으면 undefined. */
export function townFrom(answers: Record<string, number>): Town | undefined {
  if (!TOWN_IDS.every(id => answers[id] >= 1 && answers[id] <= 6)) return undefined;
  return TOWN_IDS.map(id => (answers[id] <= 3 ? 'a' : 'b')).join('');
}

// ── 친구 초대 코드 (base64url JSON) ──
const toBase64Url = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (code: string) => new TextDecoder().decode(Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));

const HOME_RE = /^[A-Za-z0-9]{12,32}$/;
const packFriend = (f: Friend) => ({ n: cleanName(f.name), p: f.pick, t: f.type, ...(isTown(f.town) ? { w: f.town } : {}) });
function unpackFriend(raw: { n?: unknown; p?: unknown; t?: unknown; w?: unknown } | null | undefined): Friend | undefined {
  if (!raw || !isPick(raw.p) || !isType(raw.t)) return undefined;
  // 동네(w)는 10-14 에 더했다 — 없거나 이상하면 동네만 빼고 받는다(옛 링크도 그대로 된다).
  return { name: cleanName(raw.n) || '친구', pick: raw.p, type: raw.t, ...(isTown(raw.w) ? { town: raw.w } : {}) };
}

export function encodeInvite(invite: Invite) {
  return toBase64Url(JSON.stringify({
    v: 1, ...packFriend(invite),
    ...(invite.home && HOME_RE.test(invite.home) ? { h: invite.home } : {}),
    ...(invite.replyTo ? { r: packFriend(invite.replyTo) } : {}),
  }));
}

/** 링크에서 받은 코드. 하나라도 이상하면 undefined — 그때는 혼자 걷는 판이 된다. 집 번호·답장만 이상하면 그것만 뺀다. */
export function decodeInvite(code: string | null): Invite | undefined {
  if (!code || code.length > 600 || !/^[A-Za-z0-9_-]+$/.test(code)) return undefined;
  try {
    const raw = JSON.parse(fromBase64Url(code));
    const friend = raw?.v === 1 ? unpackFriend(raw) : undefined;
    if (!friend) return undefined;
    const replyTo = unpackFriend(raw.r);
    return { ...friend, ...(typeof raw.h === 'string' && HOME_RE.test(raw.h) ? { home: raw.h } : {}), ...(replyTo ? { replyTo } : {}) };
  } catch { return undefined; }
}

/**
 * 이웃 편지 링크(?letter=…&nb=…)의 이웃 — 「문항~쪽~생김새~이름」. 단체가 메일을 보낼 때 시트 수식으로
 * 사람마다 만들 수 있게 base64 를 쓰지 않는다(README 「이웃의 편지」).
 */
export const neighborParam = (n: Neighbor) => [n.questionId, n.key, n.seed, cleanName(n.name)].join('~');
export function readNeighborParam(value: string | null): Neighbor | undefined {
  if (!value || value.length > 120) return undefined;
  const [questionId, key, seed, ...rest] = value.split('~');
  return cleanNeighbor({ questionId, key: key as Neighbor['key'], seed, name: rest.join('~'), at: 0 });
}
/** 남이 보낸 이웃 값 검사(링크·서버 공통). */
export function cleanNeighbor(raw: Partial<Neighbor> | null | undefined): Neighbor | undefined {
  if (!raw || !QUESTION_IDS.has(raw.questionId as string) || (raw.key !== 'a' && raw.key !== 'b') || typeof raw.seed !== 'string' || !raw.seed) return undefined;
  return { questionId: raw.questionId!, key: raw.key, seed: raw.seed.slice(0, 80), name: cleanName(raw.name) || '이웃', at: Number(raw.at) || 0 };
}

// ── 내 동네 — 시·군·구 하나(사용자 10-15 「시군구 단위로」, 처음엔 시·도 열일곱이었다). 지방재정365 지자체 코드 7자리(시·도 전체는 끝이 00000).
//    지방정부 예산·우리 지역 수입·내 기록의 「우리 동네」 가 같이 쓴다(town.ts placeChooser). 고르는 칸의 시·도 열일곱이 REGIONS. ──
export const REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'] as const;
export type Sido = (typeof REGIONS)[number];
export type Region = string;
export const isRegion = (value: unknown): value is Region => typeof value === 'string' && /^\d{7}$/.test(value);

// ── 이 기기에 남기는 것 ──
const ME_KEY = 'budget-game-me', NEIGHBOR_KEY = 'budget-game-neighbor', TOWN_KEY = 'budget-game-town';
const HOME_KEY = 'budget-game-home', STAMP_KEY = 'budget-game-stamps', REGION_KEY = 'budget-game-region';
function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}
const writeHooks = new Set<() => void>();
/** 기록이 바뀔 때마다 — 로그인했으면 main.ts 가 이걸로 서버에 다시 올린다. */
export const onWrite = (hook: () => void) => { writeHooks.add(hook); };
/** 다른 파일이 기록 묶음에 실리는 칸(주머니 — places.ts savePocket)을 고쳤을 때 알린다. */
export const touched = () => writeHooks.forEach(hook => hook());
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장소가 막힌 창 — 이번 판만 기억 */ }
  touched();
}

/** 주머니(동전·주운 나무, places.ts loadPocket) — 칸 이름만 여기. 로그인 묶음에 동전이 실린다(Save.coins). */
export const POCKET_KEY = 'budget-game-pocket';
const OWNED_KEY = 'budget-game-owned';
/** 동전으로 산 액세서리(look.ts REWARDS 번호) — 사용자 10-19 「동전 100개 = 액세서리 하나」. 지금 쓰는 것과 따로 남겨, 벗었다 다시 끼게(모습 판은 GPT 몫). */
export function loadOwned(): number[] {
  const raw = read(OWNED_KEY);
  return Array.isArray(raw) ? [...new Set(raw.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < REWARDS.length))] : [];
}
export const saveOwned = (owned: number[]) => write(OWNED_KEY, [...new Set(owned)].sort());

/**
 * 처음 온 사람(남긴 게 없으면)은 첫 모습을 무작위로 — 다들 고르지 않고 「이 모습으로 걷기」 를 누르면 마을 광장이 같은 모습으로 찬다(기획 4차).
 * random 은 시험에서 바꿔 끼운다.
 */
export function loadMe(random = Math.random): Me {
  const raw = read(ME_KEY) as Partial<Me> | null;
  const at = Number(raw?.at);
  return { name: cleanName(raw?.name), pick: isPick(raw?.pick) ? fullPick(raw.pick) : raw ? [...DEFAULT_PICK] as Pick : randomPick(random), ...(at > 0 ? { at } : {}) }; // 옛 넷·다섯 칸은 열 칸으로 펴서(10-15 저녁)
}
export const saveMe = (me: Me) => write(ME_KEY, { name: cleanName(me.name), pick: me.pick, ...(me.at ? { at: me.at } : {}) });

export const loadNeighbor = () => cleanNeighbor(read(NEIGHBOR_KEY) as Partial<Neighbor> | null);
export const saveNeighbor = (neighbor: Neighbor) => write(NEIGHBOR_KEY, { ...neighbor, name: cleanName(neighbor.name) });

/**
 * 지난번 판 — 지은 동네, 그리고 유형·세션(10-14 더함: 다시 온 사람이 걷지 않고 「지난번 내 동네」 를 열려면 유형이,
 * 그 판으로 우리 지역에 지으려면 세션이 있어야 한다). 옛 기록엔 동네만 있다.
 */
export type Last = { town: Town; type?: TypeCode; sessionId?: string };
export function loadLast(): Last | undefined {
  const raw = read(TOWN_KEY) as { town?: unknown; type?: unknown; sessionId?: unknown } | null;
  if (!isTown(raw?.town)) return undefined;
  return { town: raw.town, ...(isType(raw.type) ? { type: raw.type } : {}), ...(typeof raw.sessionId === 'string' && raw.sessionId.length <= 64 ? { sessionId: raw.sessionId } : {}) };
}
export const saveTown = (town: Town, extra: { type?: TypeCode; sessionId?: string } = {}) => write(TOWN_KEY, { town, ...extra, at: Date.now() });

/** 방명록 집 — 번호(id)는 초대 링크에 실리고, 열쇠(key)는 이 기기에만 있어 방명록은 나만 읽는다. */
export type Home = { id: string; key: string };
export function loadHome(): Home | undefined {
  const raw = read(HOME_KEY) as Partial<Home> | null;
  return raw && typeof raw.id === 'string' && HOME_RE.test(raw.id) && typeof raw.key === 'string' && raw.key.length <= 64 ? { id: raw.id, key: raw.key } : undefined;
}
export const saveHome = (home: Home) => write(HOME_KEY, home);

/** 시민증 도장 — 도장 이름 → 처음 받은 시각. 답이 아니라 한 일에 찍힌다(stamps.ts). */
export function loadStamps(): Record<string, number> {
  const raw = read(STAMP_KEY);
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, at]) => /^[a-z0-9:-]{2,40}$/.test(id) && Number.isFinite(at))) as Record<string, number>;
}
/** 도장 찍기. 처음 받는 도장이면 true. */
export function addStamp(id: string, now = Date.now()) {
  const stamps = loadStamps();
  if (stamps[id]) return false;
  write(STAMP_KEY, { ...stamps, [id]: now });
  return true;
}

// ── 문제 카드 — 이 기기의 투표 번호(반응은 기기마다 하나), 본 카드(새 카드 알림용), 내 반응 ──
const CARD_KEY = 'budget-game-cards';
export type CardMemo = { voter: string; seen: string[]; mine: Record<string, string> };
export function loadCardMemo(): CardMemo {
  const raw = read(CARD_KEY) as Partial<CardMemo> | null;
  const voter = typeof raw?.voter === 'string' && /^[A-Za-z0-9]{20}$/.test(raw.voter) ? raw.voter
    : Array.from(crypto.getRandomValues(new Uint8Array(20)), b => TABLE_CHARS[b % TABLE_CHARS.length]).join(''); // http 엔 randomUUID 가 없다
  const memo = { voter, seen: Array.isArray(raw?.seen) ? raw.seen.filter(x => typeof x === 'string').slice(-60) : [], mine: raw?.mine && typeof raw.mine === 'object' ? raw.mine : {} };
  if (memo.voter !== raw?.voter) write(CARD_KEY, memo);
  return memo;
}
export const saveCardMemo = (memo: CardMemo) => write(CARD_KEY, memo);

export const loadRegion = () => { const raw = read(REGION_KEY); return isRegion(raw) ? raw : undefined; };
export const saveRegion = (region: Region) => write(REGION_KEY, region);

/** 테이블 코드: 헷갈리는 글자(0·O·1·I) 없이 네 자. */
export const TABLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function cleanTableCode(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return code.length === 4 && [...code].every(c => TABLE_CHARS.includes(c)) ? code : undefined;
}

// ── 로그인하면 서버에 두는 한 묶음(Save) — 이 기기의 기록 그대로. 서버도 받을 때 이걸로 검사한다(api.ts). ──
/** 주머니 동전(사용자 10-19 「동전 로그인 저장」) — n 남은 동전, at 마지막으로 바뀐 때(더 나중 것이 이긴다), day·taken 그날 주운 나무(두 기기로 같은 나무를 두 번 줍지 않게). */
export type Coins = { n: number; at: number; day: number; taken: number[] };
export type Save = { me?: Me; neighbor?: Neighbor; last?: Last & { at: number }; home?: Home; stamps?: Record<string, number>; region?: Region; coins?: Coins; owned?: number[] };
export const SAVE_MAX = 4000; // JSON 글자 수 — 이보다 크면 이상한 값

/** 남이 보낸(또는 서버에서 온) 묶음 검사 — 이상한 칸은 그 칸만 버린다. */
export function cleanSave(raw: unknown): Save | undefined {
  if (!raw || typeof raw !== 'object' || JSON.stringify(raw).length > SAVE_MAX) return undefined;
  const r = raw as Record<string, any>;
  const save: Save = {};
  if (r.me && isPick(r.me.pick)) save.me = { name: cleanName(r.me.name), pick: r.me.pick, ...(Number(r.me.at) > 0 ? { at: Number(r.me.at) } : {}) };
  const neighbor = cleanNeighbor(r.neighbor);
  if (neighbor) save.neighbor = neighbor;
  if (r.last && isTown(r.last.town) && Number.isFinite(r.last.at)) {
    save.last = { town: r.last.town, at: r.last.at, ...(isType(r.last.type) ? { type: r.last.type } : {}), ...(typeof r.last.sessionId === 'string' && r.last.sessionId.length <= 64 ? { sessionId: r.last.sessionId } : {}) };
  }
  if (r.home && typeof r.home.id === 'string' && HOME_RE.test(r.home.id) && typeof r.home.key === 'string' && r.home.key.length <= 64) save.home = { id: r.home.id, key: r.home.key };
  if (r.stamps && typeof r.stamps === 'object') {
    const stamps = Object.fromEntries(Object.entries(r.stamps).filter(([id, at]) => /^[a-z0-9:-]{2,40}$/.test(id) && Number.isFinite(at))) as Record<string, number>;
    if (Object.keys(stamps).length) save.stamps = stamps;
  }
  if (isRegion(r.region)) save.region = r.region;
  const c = r.coins, whole = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
  if (c && whole(c.n, 1e6) && Number.isFinite(c.at) && c.at > 0 && whole(c.day, 1e7) && Array.isArray(c.taken)) save.coins = { n: c.n, at: c.at, day: c.day, taken: c.taken.filter((t: unknown) => whole(t, 999)).slice(0, 200) };
  if (Array.isArray(r.owned)) { const owned = r.owned.filter((i: unknown) => whole(i, REWARDS.length - 1)); if (owned.length) save.owned = [...new Set<number>(owned)]; }
  return save;
}

/** 이 기기의 기록을 한 묶음으로. */
export function exportSave(): Save {
  const rawTown = read(TOWN_KEY) as { at?: unknown } | null, last = loadLast();
  const pocket = read(POCKET_KEY) as Partial<Coins> & { coins?: unknown } | null;
  return cleanSave({
    me: read(ME_KEY) ? loadMe() : undefined, neighbor: loadNeighbor(),
    last: last ? { ...last, at: Number(rawTown?.at) || 0 } : undefined,
    home: loadHome(), stamps: loadStamps(), region: loadRegion(),
    coins: pocket?.at ? { n: pocket.coins, at: pocket.at, day: pocket.day, taken: pocket.taken ?? [] } : undefined, owned: loadOwned(),
  }) ?? {};
}

/**
 * 서버 묶음을 이 기기에 합친다 — 이름·모습·이웃·방명록 집·지역은 서버에 있으면 서버 것, 없으면 이 기기 것 그대로.
 * 지난번 판은 더 나중 것으로, 도장은 둘 다(먼저 받은 시각).
 * 서버가 이긴다(10-16) — 예전엔 이 기기가 이겨서, 새 브라우저의 기본 모습이 로그인하자마자 서버의 진짜 모습을 덮고
 * 두 브라우저를 번갈아 쓰면 옛 브라우저가 옛 기록을 다시 올렸다. 이 기기에서 고친 것은 1.5초 안에 서버로 가니(keepSynced) 서버가 늘 최신이다.
 */
export function importSave(remote: Save) {
  const here = exportSave();
  // 모습은 더 나중에 직접 고른 쪽(10-16) — 서버만 이기면 이 기기에서 방금 고른 모습이 계정의 옛 모습에 덮였다(헤드리스로 확인).
  // 손 안 댄 기본 모습(at 없음)은 늘 서버에 진다 — 새 브라우저 기본 모습이 진짜 모습을 덮던 일(2658071) 그대로 막힌다.
  if (remote.me && (remote.me.at ?? 0) >= (here.me?.at ?? 0)) saveMe(remote.me);
  if (remote.neighbor) saveNeighbor(remote.neighbor);
  if (remote.last && (!here.last || remote.last.at > here.last.at)) write(TOWN_KEY, remote.last);
  if (remote.home) saveHome(remote.home);
  if (remote.region) saveRegion(remote.region);
  // 동전은 더 나중에 바뀐 쪽(at) — 열매·넣은 동전 같은 이 기기 칸은 그대로 두고 동전·오늘 주운 나무만 갈아 끼운다.
  if (remote.coins && remote.coins.at > (here.coins?.at ?? 0)) {
    const pocket = (read(POCKET_KEY) as Record<string, unknown> | null) ?? {};
    write(POCKET_KEY, { ...pocket, coins: remote.coins.n, at: remote.coins.at, day: remote.coins.day, taken: remote.coins.taken });
  }
  if (remote.owned?.some(i => !here.owned?.includes(i))) saveOwned([...(here.owned ?? []), ...remote.owned]); // 산 것은 둘 다
  if (remote.stamps) {
    const mine = loadStamps(), merged = { ...remote.stamps, ...mine };
    for (const [id, at] of Object.entries(remote.stamps)) if (mine[id]) merged[id] = Math.min(mine[id], at);
    if (Object.keys(merged).length !== Object.keys(mine).length || Object.entries(merged).some(([id, at]) => mine[id] !== at)) write(STAMP_KEY, merged);
  }
}

/** 로그인 열쇠 — 서버가 준 것. 이 기기에만. */
export type Login = { key: string; provider: 'kakao' | 'google'; admin?: true };
const LOGIN_KEY = 'budget-game-login';
export function loadLogin(): Login | undefined {
  const raw = read(LOGIN_KEY) as Partial<Login> | null;
  return raw && typeof raw.key === 'string' && /^[A-Za-z0-9]{24,64}$/.test(raw.key) && (raw.provider === 'kakao' || raw.provider === 'google') ? { key: raw.key, provider: raw.provider, ...(raw.admin === true ? { admin: true as const } : {}) } : undefined;
}
export const saveLogin = (login: Login) => { try { localStorage.setItem(LOGIN_KEY, JSON.stringify(login)); } catch { /* 막힌 창 */ } };
export const clearLogin = () => { try { localStorage.removeItem(LOGIN_KEY); } catch { /* 막힌 창 */ } };
/** 로그아웃 때 — 이 기기의 Save 칸(서버에 올린 그 기록)을 비운다. 안 비우면 다음에 이 기기로 로그인한 다른 사람 계정에 섞인다(10-16). */
export const clearSave = () => { for (const key of [ME_KEY, NEIGHBOR_KEY, TOWN_KEY, HOME_KEY, STAMP_KEY, REGION_KEY, POCKET_KEY, OWNED_KEY]) try { localStorage.removeItem(key); } catch { /* 막힌 창 */ } };
