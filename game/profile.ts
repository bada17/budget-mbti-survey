/*
  나·내 이웃·친구 초대 코드. 화면이나 Phaser 없이 시험된다.

  · 나(이름·모습)와 내 이웃은 이 기기 브라우저에만 남는다(localStorage). 서버로 가지 않는다.
  · 친구 초대 코드는 링크(?with=)에 들어간다 — 이름·모습 번호·유형, 그리고 그 친구가 지은 동네(고른 쪽 열다섯 자).
    받은 코드는 남이 만든 값이라 다 검사한다.
  · 내 동네 = 이번 판에 고른 열다섯 가지. 다시 하면 새로 지어지고, 지난번과 달라진 곳을 표시한다(사용자 10-14).
*/
import { TYPES, COMMON_QUESTIONS, FIELD_QUESTIONS, ROUTE, type TypeCode } from './content';
import { isPick, DEFAULT_PICK, type Pick } from './look';

export type Me = { name: string; pick: Pick };
export type Neighbor = { questionId: string; key: 'a' | 'b'; seed: string; name: string; at: number };
export type Invite = { name: string; pick: Pick; type: TypeCode; town?: Town };
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

export function encodeInvite(invite: Invite) {
  return toBase64Url(JSON.stringify({ v: 1, n: cleanName(invite.name), p: invite.pick, t: invite.type, ...(isTown(invite.town) ? { w: invite.town } : {}) }));
}

/** 링크에서 받은 코드. 하나라도 이상하면 undefined — 그때는 혼자 걷는 판이 된다. */
export function decodeInvite(code: string | null): Invite | undefined {
  if (!code || code.length > 200 || !/^[A-Za-z0-9_-]+$/.test(code)) return undefined;
  try {
    const raw = JSON.parse(fromBase64Url(code));
    if (raw?.v !== 1 || !isPick(raw.p) || !isType(raw.t)) return undefined;
    // 동네(w)는 10-14 에 더했다 — 없거나 이상하면 동네만 빼고 받는다(옛 링크도 그대로 된다).
    return { name: cleanName(raw.n) || '친구', pick: raw.p, type: raw.t, ...(isTown(raw.w) ? { town: raw.w } : {}) };
  } catch { return undefined; }
}

// ── 이 기기에 남기는 것 ──
const ME_KEY = 'budget-game-me', NEIGHBOR_KEY = 'budget-game-neighbor', TOWN_KEY = 'budget-game-town';
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

export function loadNeighbor(): Neighbor | undefined {
  const raw = read(NEIGHBOR_KEY) as Partial<Neighbor> | null;
  if (!raw || !QUESTION_IDS.has(raw.questionId as string) || (raw.key !== 'a' && raw.key !== 'b') || typeof raw.seed !== 'string') return undefined;
  return { questionId: raw.questionId!, key: raw.key, seed: raw.seed.slice(0, 80), name: cleanName(raw.name) || '이웃', at: Number(raw.at) || 0 };
}
export const saveNeighbor = (neighbor: Neighbor) => write(NEIGHBOR_KEY, { ...neighbor, name: cleanName(neighbor.name) });

/** 지난번에 지은 동네. */
export function loadTown(): Town | undefined {
  const raw = read(TOWN_KEY) as { town?: unknown } | null;
  return isTown(raw?.town) ? raw.town : undefined;
}
export const saveTown = (town: Town) => write(TOWN_KEY, { town, at: Date.now() });

/** 테이블 코드: 헷갈리는 글자(0·O·1·I) 없이 네 자. */
export const TABLE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function cleanTableCode(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const code = value.trim().toUpperCase();
  return code.length === 4 && [...code].every(c => TABLE_CHARS.includes(c)) ? code : undefined;
}
