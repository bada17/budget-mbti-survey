/*
  게임 서버 규칙 — 「다른 사람들 마음」(응답 모으기)·「테이블」(같이 걷기),
  그리고 다시 올 이유(기획 3차, 10-14) — 「방명록」(내 링크로 들어와 끝낸 사람)·「우리 지역 동네」·「연락처」(이웃의 편지).
  저장소(Store)만 바꿔 끼우면 어느 서버에나 붙는다 — 개발 서버 메모리(vite.game.config.ts), 구글 시트(server/gas.ts).
  구글 시트에는 테이블을 붙이지 않는다(4초마다 묻는 테이블은 앱스 스크립트 한도에 걸린다 — net.ts 의 TABLES).

  받는 값은 남이 보낸 것이라 다 검사하고, 유형·동네는 서버가 답으로 다시 계산한다(보낸 유형을 믿지 않는다).
  응답·방명록·지역에는 개인정보가 없다(무작위 세션 id, 사람이 적은 별명, 모습 번호, 시·도). 연락처만 개인정보다 — 그래서
  연락처는 읽는 길이 없다(받아 쌓기만, 읽는 건 시트를 여는 사람).
  쓰는 곳은 모두 Map.set / 배열 push 로만 바꾼다 — 시트 저장소가 바뀐 줄만 골라 쓰기 때문이다(server/gas.ts).

  로그인(10-14) — 「주민」 기록. 카카오·구글이 「이 사람 맞다」고 확인하는 일은 서버 입구가 한다(그쪽에 물어야 해서 —
  server/gas.ts 의 verify, 개발 서버는 가짜). 여기는 그 뒤 — 확인된 계정(account, 회원번호를 해시로 바꾼 값)에 열쇠를 주고,
  열쇠로 기록 묶음(Save, profile.ts)을 읽고 쓰고 지운다. 회원번호 그 자체는 어디에도 남기지 않는다.
*/
import { ROUTE, CONTENT_VERSION, TYPES, type TypeCode } from './content';
import { scoreAnswers, typeCode } from './score';
import { orderedQuestions } from './response';
import { cleanName, cleanTableCode, cleanNeighbor, cleanSave, isRegion, townFrom, TABLE_CHARS, type Neighbor, type Region, type Save } from './profile';
import { validPayload, type ContactPayload } from './contact';
import { isPick, type Pick } from './look';

export type Member = { id: string; name: string; pick: Pick; stage: number; type?: TypeCode; at: number };
export type Finished = { answers: Record<string, number>; type: TypeCode; at: number; region?: Region; pick?: Pick };
/** 방명록 한 줄 — 내 링크로 들어와 끝까지 걸은 사람. 동네·유형은 그 사람이 끝낸 답에서 서버가 만든다. */
export type Visit = { sessionId: string; name: string; pick: Pick; type: TypeCode; town: string; at: number };
/** 연락처 한 줄 — 동의 화면의 항목(주소, 내 이웃·유형 결과)만. 지역은 항목에 없어 받지 않는다. */
export type Contact = ContactPayload & { neighbor?: Neighbor; type?: TypeCode; receivedAt: number };
export type Store = {
  finished: Map<string, Finished>;
  tables: Map<string, { createdAt: number; members: Member[] }>;
  /** 방명록 집 — 번호 → 열쇠. 번호는 초대 링크에 실리고 열쇠는 주인 기기에만 있다. */
  homes: Map<string, { key: string; at: number }>;
  /** 집 번호 → 다녀간 사람들(최근 BOOK_MAX 명). */
  books: Map<string, Visit[]>;
  /** 받아 쌓기만 한다. 시트 저장소는 새로 들어온 것만 덧붙인다. */
  contacts: Contact[];
  /** 로그인한 주민 — 계정(해시) → 열쇠·기록 묶음. */
  residents: Map<string, Resident>;
};
export type Resident = { key: string; save: Save; at: number };
export type ApiResult = { status: number; body: unknown };

export const TABLE_TTL_MS = 6 * 60 * 60 * 1000;
export const TABLE_MAX = 12;
export const BOOK_MAX = 50;
/** 비율을 보여 주는 최소 인원 — 두세 명 비율은 뜻이 없고, 지역은 적으면 누가 무엇을 골랐는지 드러난다. */
export const SHOW_MIN = 5;
export const CROWD_MAX = 30;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const HOME_ID = /^[A-Za-z0-9]{12,32}$/;
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const createStore = (): Store => ({ finished: new Map(), tables: new Map(), homes: new Map(), books: new Map(), contacts: [], residents: new Map() });
const ACCOUNT = /^(kakao|google):[0-9a-f]{64}$/;
const LOGIN_KEY = /^[A-Za-z0-9]{32}$/;

/**
 * 확인된 계정에 열쇠를 준다 — 처음이면 새로 만들고, 다시 오면 같은 열쇠(기기마다 같은 기록을 본다).
 * random 은 서버 입구가 넣는다 — 시트는 Utilities.getUuid, 개발 서버는 crypto(이 열쇠로 기록을 읽으니 Math.random 은 안 쓴다).
 */
export function login(store: Store, account: string, now: number, random: () => number) {
  if (!ACCOUNT.test(account)) return { status: 400, body: { error: 'bad-account' } };
  const known = store.residents.get(account);
  const resident = known?.key ? known : { key: randomText(32, KEY_CHARS, random), save: {}, at: now }; // 지운 계정(열쇠 빈칸)은 새로
  store.residents.set(account, { ...resident, at: now });
  return { status: 200, body: { key: resident.key, save: resident.save } };
}
// ponytail: 열쇠로 찾을 때 주민 전부를 훑는다 — 수천 명을 넘으면 열쇠 → 계정 표를 따로 둔다.
const byKey = (store: Store, key: unknown) => (typeof key === 'string' && LOGIN_KEY.test(key) ? [...store.residents].find(([, r]) => r.key === key) : undefined);

/** 문항마다 a·b 쪽을 고른 사람 수, 유형별 사람 수. 답 1~3 은 a, 4~6 은 b. */
export function stats(store: Store) {
  const questions: Record<string, { a: number; b: number }> = {};
  for (const q of orderedQuestions) questions[q.id] = { a: 0, b: 0 };
  const types = Object.fromEntries(Object.keys(TYPES).map(code => [code, 0])) as Record<TypeCode, number>;
  for (const { answers, type } of store.finished.values()) {
    for (const [id, value] of Object.entries(answers)) questions[id][value <= 3 ? 'a' : 'b']++;
    types[type]++;
  }
  return { total: store.finished.size, questions, types };
}

/**
 * 우리 지역 동네 — 그 지역에 한 채 지은 사람 수, 최근 주민 모습(CROWD_MAX), 문항마다 두 쪽 사람 수(SHOW_MIN 명부터).
 * **유형 분포는 내지 않는다** — 「○○는 수리공 동네」 처럼 지역에 딱지가 붙는다(지자체에 유형 딱지를 안 붙이기로 한 것과 같은 이유).
 */
export function regionView(store: Store, region: Region) {
  const people = [...store.finished.values()].filter(f => f.region === region).sort((x, y) => x.at - y.at);
  const enough = people.length >= SHOW_MIN;
  const questions: Record<string, { a: number; b: number }> = {};
  if (enough) {
    for (const q of orderedQuestions) questions[q.id] = { a: 0, b: 0 };
    for (const { answers } of people) for (const [id, value] of Object.entries(answers)) questions[id][value <= 3 ? 'a' : 'b']++;
  }
  return { region, total: people.length, crowd: people.slice(-CROWD_MAX).map(f => f.pick ?? [0, 0, 0, 0]) as Pick[], ...(enough ? { questions } : {}) };
}

function validAnswers(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const answers: Record<string, number> = {};
  for (const q of orderedQuestions) {
    const value = (raw as Record<string, unknown>)[q.id];
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 6) return undefined;
    answers[q.id] = value as number;
  }
  return Object.keys(raw).length === orderedQuestions.length ? answers : undefined;
}

function liveTable(store: Store, code: string | undefined, now: number) {
  const table = code ? store.tables.get(code) : undefined;
  if (!table) return undefined;
  if (now - table.createdAt > TABLE_TTL_MS) { store.tables.delete(code!); return undefined; }
  return table;
}

export type Stats = ReturnType<typeof stats>;
export type TableView = ReturnType<typeof tableView>;
export type RegionView = ReturnType<typeof regionView>;

const tableView = (code: string, table: { members: Member[] }) => ({
  code, members: table.members.map(({ id, name, pick, stage, type }) => ({ id, name, pick, stage, type })),
});
const randomText = (length: number, chars: string, random: () => number) => Array.from({ length }, () => chars[Math.floor(random() * chars.length)]).join('');
const decode = (part: string | undefined) => { try { return decodeURIComponent(part ?? ''); } catch { return ''; } };

/** path 는 /api/game 뒤쪽(예: /stats, /tables/ABCD/members). body 는 이미 JSON 으로 읽은 값. */
export function handle(store: Store, method: string, path: string, body: unknown, now: number, random = Math.random): ApiResult {
  const parts = path.split('/').filter(Boolean);
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  if (method === 'GET' && path === '/stats') return { status: 200, body: stats(store) };

  if (method === 'POST' && path === '/finish') {
    const answers = validAnswers(input.answers);
    if (typeof input.sessionId !== 'string' || !ID.test(input.sessionId) || input.contentVersion !== CONTENT_VERSION || !answers) {
      return { status: 400, body: { error: 'bad-finish' } };
    }
    // 같은 판을 두 번 보내도 한 번만 센다(먼저 온 것).
    if (!store.finished.has(input.sessionId)) {
      store.finished.set(input.sessionId, { answers, type: typeCode(scoreAnswers(orderedQuestions, answers)), at: now });
    }
    return { status: 200, body: stats(store) };
  }

  // ── 방명록 ──
  if (parts[0] === 'homes') {
    if (method === 'POST' && parts.length === 1) {
      // ponytail: Math.random 열쇠 — 별명·유형만 든 방명록이라 이 정도. 연락처 같은 걸 담게 되면 crypto 로.
      for (let tries = 0; tries < 5; tries++) {
        const id = randomText(16, KEY_CHARS.replace(/[a-z]/g, ''), random);
        if (store.homes.has(id)) continue;
        const key = randomText(24, KEY_CHARS, random);
        store.homes.set(id, { key, at: now });
        return { status: 201, body: { id, key } };
      }
      return { status: 503, body: { error: 'busy' } };
    }
    const id = parts[1];
    const home = id && HOME_ID.test(id) ? store.homes.get(id) : undefined;
    if (!home) return { status: 404, body: { error: 'no-home' } };
    if (method === 'POST' && parts[2] === 'visits' && parts.length === 3) {
      const done = typeof input.sessionId === 'string' ? store.finished.get(input.sessionId) : undefined;
      if (!done || !isPick(input.pick)) return { status: 400, body: { error: 'bad-visit' } };
      const book = store.books.get(id) ?? [];
      if (!book.some(v => v.sessionId === input.sessionId)) {
        const visit: Visit = { sessionId: input.sessionId as string, name: cleanName(input.name) || '이름 없음', pick: input.pick, type: done.type, town: townFrom(done.answers)!, at: now };
        store.books.set(id, [...book, visit].slice(-BOOK_MAX));
      }
      return { status: 200, body: { ok: true } };
    }
    if (method === 'POST' && parts[2] === 'book' && parts.length === 3) {
      if (input.key !== home.key) return { status: 403, body: { error: 'bad-key' } };
      // 세션 id 는 돌려주지 않는다 — 남의 판을 대신 고칠 수 있는 값이다.
      return { status: 200, body: { visits: (store.books.get(id) ?? []).map(({ name, pick, type, town, at }) => ({ name, pick, type, town, at })).reverse() } };
    }
    return { status: 404, body: { error: 'not-found' } };
  }

  // ── 우리 지역 동네 ──
  if (method === 'POST' && path === '/region') {
    const done = typeof input.sessionId === 'string' ? store.finished.get(input.sessionId) : undefined;
    if (!done || !isRegion(input.region) || !isPick(input.pick)) return { status: 400, body: { error: 'bad-region' } };
    // 한 판은 한 지역에 한 채(먼저 지은 곳). 다시 걸으면 새 판이라 새로 짓는다.
    if (!done.region) store.finished.set(input.sessionId as string, { ...done, region: input.region, pick: input.pick });
    return { status: 200, body: regionView(store, store.finished.get(input.sessionId as string)!.region!) };
  }
  if (method === 'GET' && parts[0] === 'regions' && parts.length === 2) {
    const region = decode(parts[1]);
    return isRegion(region) ? { status: 200, body: regionView(store, region) } : { status: 404, body: { error: 'no-region' } };
  }

  // ── 로그인한 주민 — 열쇠로 기록 묶음 읽기·쓰기·지우기(로그인 자체는 login(), 서버 입구가 부른다) ──
  if (method === 'POST' && parts[0] === 'me' && parts.length <= 2) {
    const found = byKey(store, input.key);
    if (!found) return { status: 403, body: { error: 'bad-key' } };
    const [account, resident] = found;
    if (parts.length === 1) return { status: 200, body: { save: resident.save } };
    if (parts[1] === 'save') {
      const save = cleanSave(input.save);
      if (!save) return { status: 400, body: { error: 'bad-save' } };
      store.residents.set(account, { ...resident, save, at: now });
      return { status: 200, body: { ok: true } };
    }
    // 지우기 — 열쇠·기록을 비운다(delete 가 아니라 set: 시트는 바뀐 줄만 다시 쓴다). 남는 건 해시 한 칸뿐.
    if (parts[1] === 'forget') { store.residents.set(account, { key: '', save: {}, at: now }); return { status: 200, body: { ok: true } }; }
  }

  // ── 연락처(이웃 소식) — 받아 쌓기만 ──
  if (method === 'POST' && path === '/contact') {
    const payload = validPayload(input.payload);
    if (!payload) return { status: 400, body: { error: 'bad-contact' } };
    const neighbor = cleanNeighbor(input.neighbor as Partial<Neighbor>);
    const type = typeof input.type === 'string' && input.type in TYPES ? input.type as TypeCode : undefined;
    store.contacts.push({ ...payload, ...(neighbor ? { neighbor } : {}), ...(type ? { type } : {}), receivedAt: now });
    return { status: 200, body: { ok: true } };
  }

  if (parts[0] !== 'tables') return { status: 404, body: { error: 'not-found' } };

  if (method === 'POST' && parts.length === 1) {
    for (let tries = 0; tries < 20; tries++) {
      const code = randomText(4, TABLE_CHARS, random);
      if (!liveTable(store, code, now)) {
        store.tables.set(code, { createdAt: now, members: [] });
        return { status: 201, body: { code } };
      }
    }
    return { status: 503, body: { error: 'busy' } };
  }

  const code = cleanTableCode(parts[1]);
  const table = liveTable(store, code, now);
  if (!table) return { status: 404, body: { error: 'no-table' } };

  if (method === 'GET' && parts.length === 2) return { status: 200, body: tableView(code!, table) };

  if (method === 'POST' && parts.length === 3 && parts[2] === 'members') {
    if (typeof input.id !== 'string' || !ID.test(input.id) || !isPick(input.pick)) return { status: 400, body: { error: 'bad-member' } };
    const known = table.members.find(m => m.id === input.id);
    if (!known && table.members.length >= TABLE_MAX) return { status: 409, body: { error: 'full' } };
    const member: Member = { id: input.id, name: cleanName(input.name) || '이름 없음', pick: input.pick, stage: known?.stage ?? 0, type: known?.type, at: now };
    table.members = known ? table.members.map(m => (m.id === member.id ? member : m)) : [...table.members, member];
    return { status: 200, body: tableView(code!, table) };
  }

  if (method === 'POST' && parts.length === 4 && parts[2] === 'members') {
    const member = table.members.find(m => m.id === parts[3]);
    if (!member) return { status: 404, body: { error: 'no-member' } };
    const stage = input.stage;
    if (stage !== undefined && (!Number.isInteger(stage) || (stage as number) < 0 || (stage as number) > ROUTE.length)) return { status: 400, body: { error: 'bad-stage' } };
    if (input.type !== undefined && !(typeof input.type === 'string' && input.type in TYPES)) return { status: 400, body: { error: 'bad-type' } };
    if (stage !== undefined) member.stage = Math.max(member.stage, stage as number); // 뒤로 가지 않는다
    if (input.type !== undefined) member.type = input.type as TypeCode;
    member.at = now;
    return { status: 200, body: tableView(code!, table) };
  }

  return { status: 404, body: { error: 'not-found' } };
}
