/*
  나·내 이웃·친구 초대 코드. 화면이나 Phaser 없이 시험된다.

  · 나(이름·모습)와 내 이웃은 이 기기 브라우저에만 남는다(localStorage). 서버로 가지 않는다.
  · 친구 초대 코드는 링크(?with=)에 들어간다 — 이름·모습 번호·유형, 그리고 그 친구가 지은 동네(고른 쪽 열다섯 자).
    받은 코드는 남이 만든 값이라 다 검사한다.
  · 내 동네 = 이번 판에 고른 열다섯 가지. 다시 하면 새로 지어지고, 지난번과 달라진 곳을 표시한다(사용자 10-14).
  · 다시 올 이유(기획 3차, 10-14) — 답장(링크에 「누구에게 답하는지」 를 같이 싣는다)·방명록 집 번호·
    주민증 도장·우리 지역도 이 기기에 남는다. 기기를 바꾸면 사라진다(로그인이 없어서).
*/
import { TYPES, COMMON_QUESTIONS, FIELD_QUESTIONS, ROUTE, type TypeCode } from './content';
import { isPick, DEFAULT_PICK, type Pick } from './look';

export type Me = { name: string; pick: Pick };
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
/** 지난번 동네와 달라진 자리(문항 id). 지난번이 없으면 빈 목록. */
export const changedLots = (now: Town, last?: Town) => (last ? TOWN_IDS.filter((_, i) => now[i] !== last[i]) : []);

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

// ── 우리 지역 — 처음엔 시·도 열일곱(사람이 흩어져 동네가 비지 않게). 구까지 내려가는 건 사람이 모인 뒤. ──
export const REGIONS = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'] as const;
export type Region = (typeof REGIONS)[number];
export const isRegion = (value: unknown): value is Region => typeof value === 'string' && (REGIONS as readonly string[]).includes(value);

// ── 이 기기에 남기는 것 ──
const ME_KEY = 'budget-game-me', NEIGHBOR_KEY = 'budget-game-neighbor', TOWN_KEY = 'budget-game-town';
const HOME_KEY = 'budget-game-home', STAMP_KEY = 'budget-game-stamps', REGION_KEY = 'budget-game-region';
function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장소가 막힌 창 — 이번 판만 기억 */ }
}

export function loadMe(): Me {
  const raw = read(ME_KEY) as Partial<Me> | null;
  return { name: cleanName(raw?.name), pick: isPick(raw?.pick) ? raw.pick : [...DEFAULT_PICK] };
}
export const saveMe = (me: Me) => write(ME_KEY, { name: cleanName(me.name), pick: me.pick });

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
export const loadTown = () => loadLast()?.town;
export const saveTown = (town: Town, extra: { type?: TypeCode; sessionId?: string } = {}) => write(TOWN_KEY, { town, ...extra, at: Date.now() });

/** 방명록 집 — 번호(id)는 초대 링크에 실리고, 열쇠(key)는 이 기기에만 있어 방명록은 나만 읽는다. */
export type Home = { id: string; key: string };
export function loadHome(): Home | undefined {
  const raw = read(HOME_KEY) as Partial<Home> | null;
  return raw && typeof raw.id === 'string' && HOME_RE.test(raw.id) && typeof raw.key === 'string' && raw.key.length <= 64 ? { id: raw.id, key: raw.key } : undefined;
}
export const saveHome = (home: Home) => write(HOME_KEY, home);

/** 주민증 도장 — 도장 이름 → 처음 받은 시각. 답이 아니라 한 일에 찍힌다(stamps.ts). */
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

export const loadRegion = () => { const raw = read(REGION_KEY); return isRegion(raw) ? raw : undefined; };
export const saveRegion = (region: Region) => write(REGION_KEY, region);

/** 테이블 코드: 헷갈리는 글자(0·O·1·I) 없이 네 자. */
export const TABLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function cleanTableCode(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return code.length === 4 && [...code].every(c => TABLE_CHARS.includes(c)) ? code : undefined;
}
