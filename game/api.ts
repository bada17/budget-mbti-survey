/*
  게임 서버 규칙 — 「다른 사람들 마음」(응답 모으기)·「테이블」(같이 걷기),
  그리고 다시 올 이유(기획 3차, 10-14) — 「방명록」(내 링크로 들어와 끝낸 사람)·「우리 지역 동네」·「연락처」(이웃의 편지).
  저장소(Store)만 바꿔 끼우면 어느 서버에나 붙는다 — 개발 서버 메모리(vite.game.config.ts), 구글 시트(server/gas.ts).
  구글 시트에는 테이블을 붙이지 않는다(4초마다 묻는 테이블은 앱스 스크립트 한도에 걸린다 — net.ts 의 TABLES).

  받는 값은 남이 보낸 것이라 다 검사하고, 유형·동네는 서버가 답으로 다시 계산한다(보낸 유형을 믿지 않는다).
  응답·방명록·지역에는 개인정보가 없다(무작위 세션 id, 사람이 적은 별명, 모습 번호, 시·도). 연락처만 개인정보다 — 그래서
  연락처는 읽는 길이 없다(받아 쌓기만, 읽는 건 시트를 여는 사람).
  쓰는 곳은 모두 Map.set / 배열 push 로만 바꾼다 — 시트 저장소가 바뀐 줄만 골라 쓰기 때문이다(server/gas.ts).

  마을(기획 4차, 10-14) — 「다녀간 사람」(끝낸 판에 마을에 들른 시각·모습을 붙인다)·「쪽지」(한 줄, 나도·신고). 끝낸 판만 쓸 수 있다.
  쪽지는 누구나 읽는 글이라 규칙(village.ts checkNote)을 서버가 다시 보고, 세션 id 는 돌려주지 않는다.

  로그인(10-14) — 「주민」 기록. 카카오·구글이 「이 사람 맞다」고 확인하는 일은 서버 입구가 한다(그쪽에 물어야 해서 —
  server/gas.ts 의 verify, 개발 서버는 가짜). 여기는 그 뒤 — 확인된 계정(account, 회원번호를 해시로 바꾼 값)에 열쇠를 주고,
  열쇠로 기록 묶음(Save, profile.ts)을 읽고 쓰고 지운다. 회원번호 그 자체는 어디에도 남기지 않는다.
*/
import { ROUTE, CONTENT_VERSION, TYPES, type TypeCode } from './content';
import { scoreAnswers, typeCode } from './score';
import { orderedQuestions } from './response';
import { cleanName, cleanTableCode, cleanNeighbor, cleanSave, isRegion, townFrom, TABLE_CHARS, type Neighbor, type Region, type Save } from './profile';
import { validPayload, type ContactPayload } from './contact';
import { isPick, DEFAULT_PICK, type Pick } from './look';
import { checkNote, rude, kstDayStart, NOTE_GAP_MS, NOTE_DAY_MAX, REPORT_HIDE, NOTES_SHOW, CROWD_SHOW, COIN_DAY_MAX } from './village';

export type Member = { id: string; name: string; pick: Pick; stage: number; type?: TypeCode; at: number };
export type Finished = {
  answers: Record<string, number>; type: TypeCode; at: number; region?: Region; pick?: Pick; /** 마을에 마지막으로 들른 시각 */ seenAt?: number;
  /** 마을 공사터에 넣은 동전 — 모두의 합이 공사를 채운다. coinDay 는 마지막으로 넣은 날(한국 날짜 시작 시각), coinsDay 는 그날 넣은 수. */
  coins?: number; coinDay?: number; coinsDay?: number;
};
/** 쪽지 한 장. likes·reports 는 누른 판(세션)들 — 한 판에 한 번. hidden 은 시트의 「숨김」 칸(사람이 적는다)에서만 온다. */
export type Note = { id: string; at: number; name: string; text: string; pick: Pick; sessionId: string; likes: string[]; reports: string[]; hidden?: boolean };
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
  /** 마을 쪽지 — 번호 → 쪽지. */
  notes: Map<string, Note>;
  /** 문제 카드 — 번호 → 카드(시트 「문제 카드」 탭). */
  cards: Map<string, Card>;
};
export type Resident = { key: string; save: Save; at: number };
/**
 * 문제 카드(사용자 10-15 「활동가가 매주 혹은 매달 업데이트」) — 시트에 사람이 적는 사업 한 건. 판단(「낭비」)은 카드에 안 쓰고 보는 사람이 반응한다.
 * votes = 기기(투표 번호) → 반응. 기기마다 하나, 바꿀 수 있다. shown 은 시트 「보이기」 칸에 O 를 적었을 때만.
 */
export type CardKind = 'problem' | 'unsure' | 'fine';
export const CARD_KINDS: CardKind[] = ['problem', 'unsure', 'fine'];
export type Card = { id: string; date: string; title: string; text: string; region: string; amount: string; link: string; shown: boolean; votes: Record<string, CardKind> };
export const CARDS_SHOW = 12;
export type ApiResult = { status: number; body: unknown };

export const TABLE_TTL_MS = 6 * 60 * 60 * 1000;
export const TABLE_MAX = 12;
export const BOOK_MAX = 50;
/** 비율을 보여 주는 최소 인원 — 두세 명 비율은 뜻이 없고, 지역은 적으면 누가 무엇을 골랐는지 드러난다. */
export const CROWD_MAX = 30;
const ID = /^[A-Za-z0-9-]{8,64}$/;
const HOME_ID = /^[A-Za-z0-9]{12,32}$/;
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const createStore = (): Store => ({ finished: new Map(), tables: new Map(), homes: new Map(), books: new Map(), contacts: [], residents: new Map(), notes: new Map(), cards: new Map() });
/**
 * 관리자 — 로그인으로 확인된 이메일이 단체 주소(@action.or.kr)이거나 따로 적은 메일(extra, 쉼표로)이면(사용자 10-15 「@action.or.kr 메일은 다 관리자로 하고 내 개인 계정도」).
 * 따로 적는 메일은 공개 저장소에 두지 않는다 — 앱스 스크립트 속성 또는 깃 무시 Secret.js 의 ADMIN_EMAILS.
 * ⚠️ 지금 관리자가 하는 일은 화면 쪽뿐이다. 서버가 들어줄 관리자 일(쪽지 숨기기·카드 올리기 같은)을 만들면 그때 서버가 다시 확인해야 한다.
 */
export const ADMIN_DOMAIN = 'action.or.kr';
export function isAdmin(email: string | undefined, extra = '') {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return e.endsWith(`@${ADMIN_DOMAIN}`) || extra.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).includes(e);
}

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

/** 밖으로 내는 카드 — 누가 무엇을 눌렀는지는 빼고 수만. */
export function publicCard({ votes, shown: _shown, ...card }: Card) {
  const counts = { problem: 0, unsure: 0, fine: 0 } as Record<CardKind, number>;
  for (const kind of Object.values(votes)) if (kind in counts) counts[kind]++;
  return { ...card, counts };
}
export type PublicCard = ReturnType<typeof publicCard>;
/** 보이기 한 카드, 올린 날 새것부터 CARDS_SHOW 장(같은 날이면 시트 아래 줄이 먼저). */
export const shownCards = (store: Store) => [...store.cards.values()].filter(c => c.shown).reverse()
  .sort((a, b) => b.date.localeCompare(a.date)).slice(0, CARDS_SHOW).map(publicCard);

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
 * 우리 동네(시·군·구) — 그 곳에 한 채 지은 사람 수, 최근 주민 모습(CROWD_MAX), 문항마다 두 쪽 사람 수.
 * 한 사람부터 바로 보인다(사용자 10-15 「다섯 명 채워지면 보여지는 거 별로, 바로」 — 전엔 다섯 명부터). 이름은 안 낸다.
 * **유형 분포는 내지 않는다** — 「○○는 수리공 동네」 처럼 지역에 딱지가 붙는다(지자체에 유형 딱지를 안 붙이기로 한 것과 같은 이유).
 */
export function regionView(store: Store, region: Region) {
  const people = [...store.finished.values()].filter(f => f.region === region).sort((x, y) => x.at - y.at);
  const questions: Record<string, { a: number; b: number }> = {};
  for (const q of orderedQuestions) questions[q.id] = { a: 0, b: 0 };
  for (const { answers } of people) for (const [id, value] of Object.entries(answers)) if (questions[id]) questions[id][value <= 3 ? 'a' : 'b']++;
  return { region, total: people.length, crowd: people.slice(-CROWD_MAX).map(f => f.pick ?? [0, 0, 0, 0]) as Pick[], questions };
}

/**
 * 마을 — 오늘(한국 날짜) 들른 판 수, 최근에 들른 주민 모습(CROWD_SHOW, 이름 없이), 보이는 쪽지(NOTES_SHOW, 새것부터).
 * exclude = 보는 사람 자신의 판(자기 모습이 광장에 하나 더 서지 않게).
 */
export function villageView(store: Store, now: number, exclude?: string) {
  const seen = [...store.finished].filter(([, f]) => f.seenAt).sort((x, y) => y[1].seenAt! - x[1].seenAt!);
  const today = seen.filter(([, f]) => f.seenAt! >= kstDayStart(now)).length;
  const crowd = seen.filter(([id]) => id !== exclude).slice(0, CROWD_SHOW).map(([, f]) => f.pick ?? DEFAULT_PICK) as Pick[];
  const notes = [...store.notes.values()].filter(shown).sort((x, y) => y.at - x.at).slice(0, NOTES_SHOW).map(publicNote);
  let coins = 0;
  for (const f of store.finished.values()) coins += f.coins ?? 0;
  return { today, crowd, notes, coins };
}
const shown = (note: Note) => !note.hidden && note.reports.length < REPORT_HIDE;
const publicNote = ({ id, at, name, text, pick, likes }: Note) => ({ id, at, name, text, pick, likes: likes.length });

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
export type VillageView = ReturnType<typeof villageView>;
export type PublicNote = ReturnType<typeof publicNote>;

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

  // ── 마을 — 들르기·쪽지·나도·신고(끝낸 판만), 보기(누구나) ──
  if (parts[0] === 'village') {
    if (method === 'GET' && parts.length <= 2) return { status: 200, body: villageView(store, now, parts[1]) };
    if (method !== 'POST') return { status: 404, body: { error: 'not-found' } };
    const sessionId = typeof input.sessionId === 'string' ? input.sessionId : '';
    const done = store.finished.get(sessionId);
    if (!done) return { status: 400, body: { error: 'not-finished' } };
    if (path === '/village/here') {
      if (!isPick(input.pick)) return { status: 400, body: { error: 'bad-pick' } };
      store.finished.set(sessionId, { ...done, pick: input.pick, seenAt: now });
      return { status: 200, body: villageView(store, now, sessionId) };
    }
    if (path === '/village/coins') {
      // 공사터에 동전 넣기 — 하루에 COIN_DAY_MAX 개까지(나무에서 하루에 떨어지는 수). 넘치면 넣을 수 있는 만큼만.
      const n = input.n;
      if (!Number.isInteger(n) || (n as number) < 1 || (n as number) > COIN_DAY_MAX) return { status: 400, body: { error: 'bad-coins' } };
      const day = kstDayStart(now), already = done.coinDay === day ? done.coinsDay ?? 0 : 0;
      const take = Math.min(n as number, COIN_DAY_MAX - already);
      if (take <= 0) return { status: 429, body: { error: 'coin-day' } };
      store.finished.set(sessionId, { ...done, coins: (done.coins ?? 0) + take, coinDay: day, coinsDay: already + take });
      return { status: 200, body: { took: take, view: villageView(store, now, sessionId) } };
    }
    if (path === '/village/notes') {
      const checked = checkNote(input.text);
      if (!checked.ok || !isPick(input.pick)) return { status: 400, body: { error: 'bad-note', why: checked.ok ? 'pick' : checked.why } };
      const mine = [...store.notes.values()].filter(n => n.sessionId === sessionId);
      if (mine.some(n => now - n.at < NOTE_GAP_MS)) return { status: 429, body: { error: 'note-wait' } };
      if (mine.filter(n => n.at >= kstDayStart(now)).length >= NOTE_DAY_MAX) return { status: 429, body: { error: 'note-day' } };
      const name = cleanName(input.name);
      let id = '';
      for (let tries = 0; tries < 5 && (!id || store.notes.has(id)); tries++) id = randomText(10, KEY_CHARS, random);
      const note: Note = { id, at: now, name: rude(name) ? '' : name, text: checked.text, pick: input.pick, sessionId, likes: [], reports: [] };
      store.notes.set(id, note);
      return { status: 201, body: { note: publicNote(note), view: villageView(store, now, sessionId) } };
    }
    const note = parts[1] === 'notes' && parts.length === 4 ? store.notes.get(parts[2]) : undefined;
    if (!note || !shown(note)) return { status: 404, body: { error: 'no-note' } };
    // 한 판에 한 번. 쓰는 곳은 set 으로만(시트가 바뀐 줄만 다시 쓴다).
    if (parts[3] === 'like') {
      if (!note.likes.includes(sessionId)) store.notes.set(note.id, { ...note, likes: [...note.likes, sessionId].slice(-300) });
      return { status: 200, body: { likes: store.notes.get(note.id)!.likes.length } };
    }
    if (parts[3] === 'report') {
      if (!note.reports.includes(sessionId)) store.notes.set(note.id, { ...note, reports: [...note.reports, sessionId] });
      return { status: 200, body: { ok: true } };
    }
    return { status: 404, body: { error: 'not-found' } };
  }

  // ── 문제 카드 — 보이기 한 것만, 새것부터. 반응 수는 반응한 뒤에 화면이 보인다(먼저 보이면 끌려간다). ──
  if (method === 'GET' && path === '/cards') return { status: 200, body: { cards: shownCards(store) } };
  if (method === 'POST' && parts[0] === 'cards' && parts.length === 3 && parts[2] === 'react') {
    const card = store.cards.get(decode(parts[1]));
    if (!card?.shown) return { status: 404, body: { error: 'no-card' } };
    const voter = input.voter, kind = input.kind as CardKind;
    if (typeof voter !== 'string' || !ID.test(voter) || !CARD_KINDS.includes(kind)) return { status: 400, body: { error: 'bad-react' } };
    store.cards.set(card.id, { ...card, votes: { ...card.votes, [voter]: kind } });
    return { status: 200, body: { card: publicCard(store.cards.get(card.id)!) } };
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
