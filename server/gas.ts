/*
  구글 시트 서버 — 앱스 스크립트 웹 앱에서 game/api.ts 규칙을 그대로 돌린다(사용자 10-14: 「모으는 게 필요해지면 구글 시트 +
  앱스 스크립트로 가볍게 시작하고 나중에 옮긴다」). 빌드: npm run build:gas → server/gas/server.js. 올리는 법은 README 「구글 시트 서버」.

  탭 —
  · 응답·방명록집·방명록: 열쇠 | 값(JSON) | 고친 시각. 요청마다 읽어 Map 으로 만들고, 바뀐 줄만 다시 쓴다.
  · 연락처: 사람이 읽는 칸으로 한 줄씩 덧붙이기만(읽어 들이지 않는다 — 게임이 연락처를 읽을 일이 없다).
  · 주민(로그인, 10-14): 계정(회원번호를 소금 친 해시로) | {열쇠, 기록 묶음} | 고친 시각.
  테이블은 안 붙인다(net.ts 의 TABLES).

  로그인 확인(verifyLogin) — 카카오는 받은 code 를 토큰으로 바꿔 회원번호를 묻고, 구글은 id_token 을 tokeninfo 로 확인한다.
  바깥에 묻는 건 Code.js 가 넣어 주는 deps(UrlFetchApp·스크립트 속성·해시·난수)로만 — 시험에서는 가짜로 바꿔 끼운다.
  스크립트 속성: KAKAO_REST_KEY(·KAKAO_SECRET, 켰을 때만) · GOOGLE_CLIENT_ID · LOGIN_REDIRECTS(쉼표로, 게임 주소) · ACCOUNT_SALT(setup 이 만든다).
  키가 없는 쪽은 로그인이 안 된다(401) — 그래서 키를 넣기 전까지 로그인은 저절로 꺼져 있다.

  ponytail: 요청마다 탭 전체를 읽는다 — 응답이 수천 건을 넘어 느려지면 진짜 서버(README 정할 것 10)로 옮긴다.
*/
import { handle, login, type Store, type Contact, type Finished, type Visit, type Resident } from '../game/api';
import { TYPES } from '../game/content';

/** 쓰는 곳(set)을 기억하는 Map — 시트에는 이것만 다시 쓴다. */
class Tracked<V> extends Map<string, V> {
  dirty = new Set<string>();
  rows = new Map<string, number>();
  override set(key: string, value: V) { this.dirty?.add(key); return super.set(key, value); }
  load(key: string, value: V, row: number) { super.set(key, value); this.rows.set(key, row); }
}

// 앱스 스크립트 시트의 쓰는 부분만(시험에서는 가짜로 바꿔 끼운다).
export type Range = { getValues(): unknown[][]; setValues(values: unknown[][]): unknown };
export type Sheet = { getLastRow(): number; getRange(row: number, column: number, rows?: number, columns?: number): Range; appendRow(row: unknown[]): unknown };
export type Book = { getSheetByName(name: string): Sheet | null; insertSheet(name: string): Sheet };

const KV = { finished: '응답', homes: '방명록집', books: '방명록', residents: '주민' } as const;
const CONTACT_TAB = '연락처';
const CONTACT_HEAD = ['받은 시각', '받을 방법', '주소', '만14세', '수집·이용', '활동·후원 소식(선택)', '동의 판', '이웃 이름', '이웃 문항', '이웃 쪽', '이웃 생김새', '유형'];

function tab(book: Book, name: string, head: string[]) {
  const found = book.getSheetByName(name);
  if (found) return found;
  const made = book.insertSheet(name);
  made.appendRow(head);
  return made;
}

function readKV<V>(sheet: Sheet) {
  const map = new Tracked<V>();
  const last = sheet.getLastRow();
  if (last < 2) return map;
  sheet.getRange(2, 1, last - 1, 2).getValues().forEach(([key, json], i) => {
    try { if (key) map.load(String(key), JSON.parse(String(json)) as V, i + 2); } catch { /* 사람이 손으로 망친 줄은 건너뛴다 */ }
  });
  return map;
}

function writeKV<V>(sheet: Sheet, map: Tracked<V>, now: number) {
  const fresh: unknown[][] = [];
  for (const key of map.dirty) {
    const row = [key, JSON.stringify(map.get(key)), new Date(now).toISOString()];
    const at = map.rows.get(key);
    if (at) sheet.getRange(at, 1, 1, 3).setValues([row]);
    else fresh.push(row);
  }
  if (fresh.length) sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, 3).setValues(fresh);
}

const contactRow = (c: Contact) => [
  new Date(c.receivedAt).toISOString(), c.channel === 'sms' ? '문자' : '이메일', c.address, '예', '예', c.consents.marketing ? '예' : '아니오', c.consentVersion,
  c.neighbor?.name ?? '', c.neighbor?.questionId ?? '', c.neighbor?.key ?? '', c.neighbor?.seed ?? '', c.type ? `${c.type} ${TYPES[c.type].name}` : '',
];

export type GasEvent = { parameter?: Record<string, string>; postData?: { contents: string } };

/** 바깥에 묻는 것들 — Code.js 가 앱스 스크립트 것으로 채운다. */
export type Deps = {
  fetch(url: string, options?: { method?: 'get' | 'post'; payload?: Record<string, string>; headers?: Record<string, string> }): { status: number; text: string };
  prop(name: string): string | null;
  sha256(text: string): string;
  /** 0~1, 안전한 난수(Utilities.getUuid 에서) */
  random(): number;
};

const json = (text: string): any => { try { return JSON.parse(text); } catch { return undefined; } };

/** 카카오·구글이 「이 사람 맞다」 고 하면 그 회원번호(subject). 아니면 undefined. */
export function verifyLogin(input: Record<string, unknown>, deps: Deps, now: number): { provider: 'kakao' | 'google'; subject: string } | undefined {
  const allowed = (deps.prop('LOGIN_REDIRECTS') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (typeof input.redirectUri !== 'string' || !allowed.includes(input.redirectUri)) return undefined;
  if (input.provider === 'kakao' && typeof input.code === 'string' && input.code.length < 512) {
    const client = deps.prop('KAKAO_REST_KEY'), secret = deps.prop('KAKAO_SECRET');
    if (!client) return undefined;
    const token = deps.fetch('https://kauth.kakao.com/oauth/token', {
      method: 'post', payload: { grant_type: 'authorization_code', client_id: client, redirect_uri: input.redirectUri, code: input.code, ...(secret ? { client_secret: secret } : {}) },
    });
    const access = token.status === 200 ? json(token.text)?.access_token : undefined;
    if (typeof access !== 'string') return undefined;
    const me = deps.fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${access}` } });
    const id = me.status === 200 ? json(me.text)?.id : undefined;
    return typeof id === 'number' || typeof id === 'string' ? { provider: 'kakao', subject: String(id) } : undefined;
  }
  if (input.provider === 'google' && typeof input.idToken === 'string' && input.idToken.length < 4096) {
    const client = deps.prop('GOOGLE_CLIENT_ID');
    if (!client) return undefined;
    const info = deps.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.idToken)}`);
    const t = info.status === 200 ? json(info.text) : undefined;
    const ok = t && t.aud === client && ['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) && Number(t.exp) * 1000 > now
      && typeof t.sub === 'string' && typeof input.nonce === 'string' && t.nonce === input.nonce;
    return ok ? { provider: 'google', subject: t.sub } : undefined;
  }
  return undefined;
}

/** 회원번호는 남기지 않는다 — 소금 친 해시로만. 소금이 없으면 로그인하지 않는다(setup 이 만든다). */
export function accountOf(who: { provider: 'kakao' | 'google'; subject: string }, deps: Deps) {
  const salt = deps.prop('ACCOUNT_SALT');
  return salt ? `${who.provider}:${deps.sha256(`${who.provider}:${who.subject}:${salt}`)}` : undefined;
}

/** 웹 앱 한 번 — doGet/doPost(Code.js)가 부른다. 쓰는 요청(POST)은 Code.js 가 잠금을 잡고 부른다. */
export function serve(method: 'GET' | 'POST', event: GasEvent, book: Book, now = Date.now(), deps?: Deps) {
  const path = String(event.parameter?.p ?? '/');
  if (!path.startsWith('/') || path.startsWith('/tables')) return { status: 404, body: { error: 'not-found' } };
  let body: unknown = null;
  try { body = event.postData?.contents ? JSON.parse(event.postData.contents) : null; } catch { body = null; }

  const sheets = {
    finished: tab(book, KV.finished, ['세션', '값', '고친 시각']), homes: tab(book, KV.homes, ['집 번호', '값', '고친 시각']), books: tab(book, KV.books, ['집 번호', '값', '고친 시각']),
    residents: tab(book, KV.residents, ['계정(해시)', '값', '고친 시각']),
  };
  const store: Store = {
    finished: readKV<Finished>(sheets.finished), homes: readKV<{ key: string; at: number }>(sheets.homes), books: readKV<Visit[]>(sheets.books),
    residents: readKV<Resident>(sheets.residents), tables: new Map(), contacts: [],
  };
  let result;
  if (method === 'POST' && path === '/login') {
    const who = deps ? verifyLogin((body ?? {}) as Record<string, unknown>, deps, now) : undefined;
    const account = who && deps ? accountOf(who, deps) : undefined;
    result = account ? login(store, account, now, deps!.random) : { status: 401, body: { error: 'login-failed' } };
  } else result = handle(store, method, path, body, now);
  if (method === 'POST' && result.status < 400) {
    for (const name of ['finished', 'homes', 'books', 'residents'] as const) writeKV(sheets[name], store[name] as Tracked<unknown>, now);
    if (store.contacts.length) {
      const sheet = tab(book, CONTACT_TAB, CONTACT_HEAD);
      store.contacts.forEach(c => sheet.appendRow(contactRow(c)));
    }
  }
  return result;
}
