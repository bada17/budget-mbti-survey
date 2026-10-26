/*
  구글 시트 서버 — 앱스 스크립트 웹 앱에서 game/api.ts 규칙을 그대로 돌린다(사용자 10-14: 「모으는 게 필요해지면 구글 시트 +
  앱스 스크립트로 가볍게 시작하고 나중에 옮긴다」). 빌드: npm run build:gas → server/gas/server.js. 올리는 법은 README 「구글 시트 서버」.

  탭 —
  · 응답·방명록집·방명록: 열쇠 | 값(JSON) | 고친 시각. 요청마다 읽어 Map 으로 만들고, 바뀐 줄만 다시 쓴다.
  · 연락처: 사람이 읽는 칸으로 한 줄씩 덧붙이기만(읽어 들이지 않는다 — 게임이 연락처를 읽을 일이 없다).
  · 주민(로그인, 10-14): 계정(회원번호를 소금 친 해시로) | {열쇠, 기록 묶음} | 고친 시각.
  · 쪽지(마을, 기획 4차): 사람이 읽는 칸 + 「숨김」 칸 + 기록(JSON). **숨김 칸에 무엇이든 적으면 그 쪽지는 바로 안 보인다** — 지우는 사람이 시트에서 하는 일.
    서버는 숨김 칸을 읽기만 하고 쓰지 않는다(사람이 적는 사이 요청이 와도 지워지지 않게). 창립행사 응원판에 바로 적은 응원도 여기(출처 cheer).
  · 창립행사 응원 폼 응답(다른 스프레드시트, 사용자 개인 계정 — 이 스크립트 계정에 보기 권한만): Code.js cheerRows_ 가 읽어 넘긴다(readFormCheers).

  로그인 확인(verifyLogin) — 카카오는 받은 code 를 토큰으로 바꿔 회원번호를 묻고, 구글은 id_token 을 tokeninfo 로 확인한다.
  바깥에 묻는 건 Code.js 가 넣어 주는 deps(UrlFetchApp·스크립트 속성·해시·난수)로만 — 시험에서는 가짜로 바꿔 끼운다.
  스크립트 속성: KAKAO_REST_KEY(·KAKAO_SECRET, 켰을 때만) · GOOGLE_CLIENT_ID · LOGIN_REDIRECTS(쉼표로, 게임 주소) · ACCOUNT_SALT(처음 로그인 때 Code.js 가 만든다). 키 둘·LOGIN_REDIRECTS 는 속성이 비면 Code.js 의 LOGIN_ 을 쓴다.
  키가 없는 쪽은 로그인이 안 된다(401) — 그래서 키를 넣기 전까지 로그인은 저절로 꺼져 있다.

  ponytail: 요청마다 탭 전체를 읽는다 — 응답이 수천 건을 넘어 느려지면 진짜 서버(README 정할 것 10)로 옮긴다.
*/
import { handle, login, isAdmin, BODY_MAX, type Store, type Hit, type Contact, type Finished, type Visit, type Resident, type Note, type Card, type CardKind } from '../game/api';
import { TYPES } from '../game/content';
import { validPayload } from '../game/contact';
import { checkNote } from '../game/village';
import { CHEER_PROJECTS, CHEER_MAX, type CheerProject, type PublicCheer } from '../game/cheer';

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

/**
 * 사람이 쓴 글은 시트에 글자로만 — 앞에 ' 를 붙이면 시트가 수식·숫자로 읽지 않는다(값에는 ' 가 안 남는다).
 * 안 붙이면 「=연락처!C2」 같은 쪽지가 수식으로 돌아 다른 탭 값을 공개 쪽지로 읽어 오고, 010… 번호는 숫자로 바뀌어 0 이 빠진다(10-16 GPT 검토).
 */
const plain = (text: string) => `'${text}`;

const NOTE_TAB = '쪽지';
const NOTE_HEAD = ['번호', '남긴 시각', '별명', '글', '나도', '신고', '숨김(사람이 적음)', '기록', '출처'];
function readNotes(sheet: Sheet) {
  const map = new Tracked<Note>();
  const last = sheet.getLastRow();
  if (last < 2) return map;
  sheet.getRange(2, 1, last - 1, NOTE_HEAD.length).getValues().forEach((row, i) => {
    try {
      const [id, , name, text, , , hide, json] = row;
      const rest = JSON.parse(String(json)) as Pick<Note, 'at' | 'pick' | 'sessionId' | 'account' | 'region' | 'likes' | 'reports' | 'source' | 'device' | 'project'>;
      if (id) map.load(String(id), { ...rest, id: String(id), name: String(name ?? ''), text: String(text ?? ''), hidden: String(hide ?? '').trim() !== '' }, i + 2);
    } catch { /* 사람이 손으로 망친 줄은 건너뛴다 */ }
  });
  return map;
}
function writeNotes(sheet: Sheet, map: Tracked<Note>) {
  for (const id of map.dirty) {
    const n = map.get(id)!;
    const shown = [n.id, new Date(n.at).toISOString(), plain(n.name), plain(n.text), n.likes.length, n.reports.length];
    const record = JSON.stringify({ at: n.at, pick: n.pick, sessionId: n.sessionId, account: n.account, region: n.region, likes: n.likes, reports: n.reports, source: n.source, device: n.device, project: n.project });
    const at = map.rows.get(id) ?? sheet.getLastRow() + 1;
    sheet.getRange(at, 1, 1, shown.length).setValues([shown]); // 숨김 칸(7)은 사람 몫 — 관리자 「숨기기」 일 때만 「관리자」 를 적는다(그땐 칸이 비어 있었다 — 숨은 쪽지는 숨길 수 없다)
    if (n.hiddenBy) sheet.getRange(at, 7, 1, 1).setValues([[n.hiddenBy]]);
    sheet.getRange(at, 8, 1, 1).setValues([[record]]);
    sheet.getRange(1, 9, 1, 1).setValues([['출처']]);
    sheet.getRange(at, 9, 1, 1).setValues([[n.source ?? '']]);
    map.rows.set(id, at);
  }
}

/**
 * 창립행사 응원 폼 응답 시트(getDataRange 그대로, 첫 줄 머리글) — 머리글로 칸을 찾는다: 「응원할 사업」, 「<사업>에 응원 한마디」 셋, 「숨김」(사람이 더한 칸).
 * 폼은 300자까지만 받지만 링크·연락처·거친 말은 쪽지와 같은 규칙으로 거른다. 번호는 줄 번호 — 응답을 지우면 바뀌지만 이 판엔 나도·신고가 없어 상관없다.
 */
export function readFormCheers(rows: unknown[][]): PublicCheer[] {
  const [head = [], ...body] = rows;
  const col = (name: string) => head.findIndex(h => String(h ?? '').trim() === name);
  const which = col('응원할 사업'), hide = col('숨김');
  if (which < 0) return [];
  const byName = new Map<string, CheerProject>(Object.entries(CHEER_PROJECTS).map(([id, name]) => [name, id as CheerProject]));
  return body.flatMap((row, i) => {
    const project = byName.get(String(row[which] ?? '').trim());
    if (!project || (hide >= 0 && String(row[hide] ?? '').trim())) return [];
    const checked = checkNote(row[col(`${CHEER_PROJECTS[project]}에 응원 한마디`)], CHEER_MAX);
    const at = row[0] instanceof Date ? row[0].getTime() : Date.parse(String(row[0] ?? ''));
    return checked.ok && Number.isFinite(at) ? [{ id: `f${i + 2}`, at, name: '', project, text: checked.text }] : [];
  });
}

/**
 * 문제 카드 탭 — 1~7 칸은 활동가가 적고(서버는 안 건드림), 8~11 칸은 서버가 적는다(반응 수·누른 기기).
 * 번호는 올린 날+제목으로 만든다(줄을 지우거나 옮겨도 그대로). ponytail: 제목을 고치면 반응이 처음부터 — 드문 일이라 그대로.
 * ponytail: 누른 기기 목록은 칸 하나(JSON, 시트 한 칸 5만 자)에 — 한 카드에 2천 명쯤 넘으면 반응을 탭 따로.
 */
const CARD_TAB = '문제 카드';
const CARD_HEAD = ['올린 날', '제목(한 줄)', '설명(두세 줄 — 판단 말고 사실·숫자)', '지역(예: 서울 마포구, 전국)', '금액(예: 4억 8천만 원)', '출처 링크', '보이기(O 를 적으면 마을에 뜸)', '이건 문제다', '잘 모르겠다', '그럴 수 있다', '기록(서버가 적음)'];
const CARD_EXAMPLE = ['2026-10-20', '[예시] ○○구, 청사 앞 조형물 바꾸는 데 4억 원', '이 줄은 보기예요. 보이기 칸이 비어 있어 마을에 안 떠요. 새 카드는 아래 줄에 적고 보이기 칸에 O.', '서울 ○○구', '4억 원', 'https://dok.action.or.kr/', ''];
const cardId = (date: string, title: string) => { let h = 2166136261; for (const ch of `${date}|${title}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return `c${h.toString(36)}`; };
const dayText = (v: unknown) => (v instanceof Date ? new Date(v.getTime() + 9 * 3600e3).toISOString().slice(0, 10) : String(v ?? '').trim()); // 시트가 날짜로 바꾼 칸은 한국 날짜로
function cardSheet(book: Book) {
  const found = book.getSheetByName(CARD_TAB);
  if (found) return found;
  const made = tab(book, CARD_TAB, CARD_HEAD);
  made.appendRow(CARD_EXAMPLE);
  return made;
}
function readCards(sheet: Sheet) {
  const map = new Tracked<Card>();
  const last = sheet.getLastRow();
  if (last < 2) return map;
  sheet.getRange(2, 1, last - 1, CARD_HEAD.length).getValues().forEach((row, i) => {
    const [date, title, text, region, amount, link, show, , , , json] = row.map((v, j) => (j === 0 ? dayText(v) : v));
    if (!String(title ?? '').trim()) return;
    let votes: Record<string, CardKind> = {};
    try { votes = json ? JSON.parse(String(json)) : {}; } catch { /* 손으로 망친 칸은 비운 셈 */ }
    const id = cardId(String(date), String(title).trim());
    map.load(id, { id, date: String(date), title: String(title).trim(), text: String(text ?? '').trim(), region: String(region ?? '').trim(), amount: String(amount ?? '').trim(),
      link: /^https?:\/\//.test(String(link ?? '').trim()) ? String(link).trim() : '', shown: /^[oO○ㅇ예]$/.test(String(show ?? '').trim()), votes }, i + 2);
  });
  return map;
}
function writeCards(sheet: Sheet, map: Tracked<Card>) {
  for (const id of map.dirty) {
    const card = map.get(id)!, at = map.rows.get(id);
    if (!at) continue; // 카드는 사람만 만든다
    const kinds = Object.values(card.votes);
    sheet.getRange(at, 8, 1, 4).setValues([[...(['problem', 'unsure', 'fine'] as const).map(k => kinds.filter(x => x === k).length), JSON.stringify(card.votes)]]);
  }
}

/**
 * 유입 탭 — 한 줄씩 덧붙이기만. 「유입 요약」 탭은 처음 만들 때 수식 한 칸(출처별 들어옴·끝까지·보냄)을 넣어 두면 시트가 알아서 센다.
 * 출처·매체·캠페인은 사람이 적은 꼬리표라 plain 으로(수식으로 안 돌게).
 */
const HIT_TAB = '유입', HIT_SUM_TAB = '유입 요약';
const HIT_HEAD = ['시각', '무엇', '출처', '매체', '캠페인', '세션'];
const HIT_WORD = { arrive: '들어옴', finish: '끝까지', share: '보냄' } as const;
const HIT_SUM = `=QUERY('${HIT_TAB}'!A:F, "select C, count(A) where A is not null group by C pivot B label C '출처'", 1)`;
const hitRow = (h: Hit) => [new Date(h.at).toISOString(), HIT_WORD[h.kind], plain(h.source), plain(h.medium), plain(h.campaign), h.sessionId];
function hitSheet(book: Book) {
  const found = book.getSheetByName(HIT_TAB);
  if (found) return found;
  const made = tab(book, HIT_TAB, HIT_HEAD);
  if (!book.getSheetByName(HIT_SUM_TAB)) book.insertSheet(HIT_SUM_TAB).getRange(1, 1, 1, 1).setValues([[HIT_SUM]]);
  return made;
}

const contactRow = (c: Contact) => [
  new Date(c.receivedAt).toISOString(), c.channel === 'sms' ? '문자' : '이메일', c.address, '예', '예', c.consents.marketing ? '예' : '아니오', c.consentVersion,
  c.neighbor?.name ?? '', c.neighbor?.questionId ?? '', c.neighbor?.key ?? '', c.neighbor?.seed ?? '', c.type ? `${c.type} ${TYPES[c.type].name}` : '',
].map(plain);

export type GasEvent = { parameter?: Record<string, string>; postData?: { contents: string } };

/** 바깥에 묻는 것들 — Code.js 가 앱스 스크립트 것으로 채운다. */
export type Deps = {
  fetch(url: string, options?: { method?: 'get' | 'post'; payload?: Record<string, string>; headers?: Record<string, string> }): { status: number; text: string };
  prop(name: string): string | null;
  sha256(text: string): string;
  /** 0~1, 안전한 난수(Utilities.getUuid 에서) */
  random(): number;
  /** Code.js의 ScriptCache. doPost 잠금 안에서만 읽고 쓴다. 테스트·로컬 저장소에는 없어도 된다. */
  quota?(bucket: string, limit: number, seconds: number): boolean;
  cache?: { get(key: string): string | null; put(key: string, value: string, seconds: number): void };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 받은 JSON, 쓰는 곳에서 검사
const json = (text: string): any => { try { return JSON.parse(text); } catch { return undefined; } };

/** 카카오·구글이 「이 사람 맞다」 고 하면 그 회원번호(subject). 아니면 undefined. */
/**
 * 카카오·구글이 확인해 준 이메일만 — 로그인 직후 「소식 받기」 칸을 채우는 데만 쓰고 시트엔 안 남긴다
 * (동의하면 /contact 가 따로 받는다, 사용자 10-15 「이메일 정도는 받을 수 있잖아」).
 */
const verifiedEmail = (email: unknown, verified: unknown) =>
  (verified === true || verified === 'true') && typeof email === 'string' && email.length <= 254 && email.includes('@') ? { email: email.toLowerCase() } : {};

export function verifyLogin(input: Record<string, unknown>, deps: Deps, now: number): { provider: 'kakao' | 'google'; subject: string; email?: string } | undefined {
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
    const user = me.status === 200 ? json(me.text) : undefined, id = user?.id, account = user?.kakao_account;
    // 이메일은 카카오 「동의 항목」 에 카카오계정(이메일)을 켰을 때만 온다 — 안 켜면 회원번호만.
    return typeof id === 'number' || typeof id === 'string'
      ? { provider: 'kakao', subject: String(id), ...verifiedEmail(account?.email, account?.is_email_valid && account?.is_email_verified) } : undefined;
  }
  if (input.provider === 'google' && typeof input.idToken === 'string' && input.idToken.length < 4096) {
    const client = deps.prop('GOOGLE_CLIENT_ID');
    if (!client) return undefined;
    const info = deps.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(input.idToken)}`);
    const t = info.status === 200 ? json(info.text) : undefined;
    const ok = t && t.aud === client && ['accounts.google.com', 'https://accounts.google.com'].includes(t.iss) && Number(t.exp) * 1000 > now
      && typeof t.sub === 'string' && typeof input.nonce === 'string' && t.nonce === input.nonce;
    return ok ? { provider: 'google', subject: t.sub, ...verifiedEmail(t.email, t.email_verified) } : undefined;
  }
  return undefined;
}

/** 회원번호는 남기지 않는다 — 소금 친 해시로만. 소금이 없으면 로그인하지 않는다(setup 이 만든다). */
export function accountOf(who: { provider: 'kakao' | 'google'; subject: string }, deps: Deps) {
  const salt = deps.prop('ACCOUNT_SALT');
  return salt ? `${who.provider}:${deps.sha256(`${who.provider}:${who.subject}:${salt}`)}` : undefined;
}

/**
 * 웹 앱 한 번 — doGet/doPost(Code.js)가 부른다. 쓰는 요청(POST)은 Code.js 가 잠금을 잡고 부른다.
 * cheerRows = 창립행사 응원 폼 응답 시트 읽기(Code.js cheerRows_) — 응원판 요청에서만 부른다(다른 스프레드시트라 열면 느리다).
 */
export function serve(method: 'GET' | 'POST', event: GasEvent, book: Book, now = Date.now(), deps?: Deps, cheerRows?: () => unknown[][]) {
  const path = String(event.parameter?.p ?? '/');
  if (!path.startsWith('/')) return { status: 404, body: { error: 'not-found' } };
  const contents = event.postData?.contents ?? '';
  if (contents.length > BODY_MAX) return { status: 413, body: { error: 'body-too-large' } };
  // 유입은 GET(잠금 없이) — 따로 분당 한도. 넘으면 그 줄만 버린다(끝낸 판·쓰기 한도는 건드리지 않는다).
  if (method === 'GET' && path.startsWith('/hit/') && deps?.quota && !deps.quota(`hits:${Math.floor(now / 60000)}`, 600, 60)) return { status: 429, body: { error: 'hit-limit' } };
  if (method === 'POST' && path === '/contact' && deps?.prop('CONTACT_ENABLED') !== 'true') return { status: 403, body: { error: 'contact-disabled' } };
  let body: unknown = null;
  try { body = contents ? JSON.parse(contents) : null; } catch { return { status: 400, body: { error: 'bad-json' } }; }
  let contactCacheKey: string | undefined;
  if (method === 'POST') {
    const minute = Math.floor(now / 60000);
    const reading = path === '/me' || /^\/homes\/[A-Za-z0-9]{12,32}\/book$/.test(path);
    if (!reading && deps?.quota && !deps.quota(`writes:${minute}`, 90, 60)) return { status: 429, body: { error: 'request-limit' } };
    if (path === '/contact') {
      const payload = validPayload((body as { payload?: unknown } | null)?.payload);
      if (!payload) return { status: 400, body: { error: 'bad-contact' } };
      if (deps?.quota && !deps.quota(`contact:${minute}`, 10, 60)) return { status: 429, body: { error: 'contact-limit' } };
      contactCacheKey = `game-contact:${deps!.sha256(`${payload.channel}:${payload.address}`)}`;
      if (deps?.cache?.get(contactCacheKey)) return { status: 200, body: { ok: true } };
    }
  }

  // 탭은 그 요청이 처음 건드릴 때만 연다 — 예전엔 무엇을 하든 여섯 탭을 다 읽어 한 번에 3~6초(10-20 잼, 사용자 「로그인 너무 늦어」).
  // 응답 탭은 사람이 할수록 길어지니 특히. 안 읽은 탭은 고친 것도 없으니 쓰지도 않는다.
  const open = {
    finished: () => tab(book, KV.finished, ['세션', '값', '고친 시각']), homes: () => tab(book, KV.homes, ['집 번호', '값', '고친 시각']), books: () => tab(book, KV.books, ['집 번호', '값', '고친 시각']),
    residents: () => tab(book, KV.residents, ['계정(해시)', '값', '고친 시각']),
    notes: () => tab(book, NOTE_TAB, NOTE_HEAD), cards: () => cardSheet(book),
  };
  type Lazy = keyof typeof open;
  const sheets: Partial<Record<Lazy, Sheet>> = {}, loaded: Partial<Store> = {};
  const sheet = (name: Lazy) => (sheets[name] ??= open[name]());
  const read: { [K in Lazy]: () => Store[K] } = {
    finished: () => readKV<Finished>(sheet('finished')), homes: () => readKV<{ key: string; at: number }>(sheet('homes')), books: () => readKV<Visit[]>(sheet('books')),
    residents: () => readKV<Resident>(sheet('residents')), notes: () => readNotes(sheet('notes')), cards: () => readCards(sheet('cards')),
  };
  const store = { contacts: [], hits: [] } as unknown as Store;
  for (const name of Object.keys(read) as Lazy[]) {
    Object.defineProperty(store, name, { enumerable: true, get: () => (loaded[name] ??= read[name]() as never) });
  }
  let formCheers: PublicCheer[] | undefined;
  Object.defineProperty(store, 'formCheers', { enumerable: true, get: () => (formCheers ??= readFormCheers(cheerRows?.() ?? [])) });
  let result;
  if (method === 'POST' && path === '/login') {
    const who = deps ? verifyLogin((body ?? {}) as Record<string, unknown>, deps, now) : undefined;
    const account = who && deps ? accountOf(who, deps) : undefined;
    // 관리자인지 여기서 가린다 — 단체 주소 또는 ADMIN_EMAILS(속성·Secret.js). 주민 기록엔 표시만 남는다(쪽지 숨기기를 서버가 다시 확인할 때).
    const admin = Boolean(who?.email && isAdmin(who.email, deps!.prop('ADMIN_EMAILS') ?? ''));
    result = account ? login(store, account, now, deps!.random, admin) : { status: 401, body: { error: 'login-failed' } };
    // 이메일은 돌려주기만(저장 안 함).
    if (who?.email && result.status === 200) result = { ...result, body: { ...result.body, email: who.email, ...(admin ? { admin: true } : {}) } };
  } else result = handle(store, method, path, body, now);
  // 유입은 GET 으로도 온다 — 쓰기 묶음 밖에서 덧붙인다. appendRow 는 한 줄씩이라 잠금 없이 겹쳐도 줄이 섞이지 않는다.
  if (result.status < 400 && store.hits.length) { const sheet = hitSheet(book); store.hits.forEach(h => sheet.appendRow(hitRow(h))); }
  if (method === 'POST' && result.status < 400) {
    for (const name of ['finished', 'homes', 'books', 'residents'] as const) if (loaded[name]) writeKV(sheet(name), loaded[name] as Tracked<unknown>, now);
    if (loaded.notes) writeNotes(sheet('notes'), loaded.notes as Tracked<Note>);
    if (loaded.cards) writeCards(sheet('cards'), loaded.cards as Tracked<Card>);
    if (store.contacts.length) {
      const sheet = tab(book, CONTACT_TAB, CONTACT_HEAD);
      store.contacts.forEach(c => sheet.appendRow(contactRow(c)));
      // 실제로 저장한 주소만 기억한다. 쓰기가 실패한 신청은 다음 시도에서 다시 저장할 수 있어야 한다.
      if (contactCacheKey) deps?.cache?.put(contactCacheKey, '1', 21600);
    }
  }
  return result;
}
