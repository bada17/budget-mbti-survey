/*
  게임 서버 규칙 — 「다른 사람들 마음」(응답 모으기)과 「테이블」(같이 걷기).
  저장소(Store)만 바꿔 끼우면 어느 서버에나 붙는다. 지금은 개발 서버의 메모리(vite.game.config.ts)에만
  붙어 있다 — 진짜 서버(클라우드플레어 D1 / 구글 시트 …)는 배포 때 정한다(README 정할 것 10).

  개인정보는 받지 않는다. 응답은 세션 id(무작위)와 답뿐이고, 테이블 이름은 사람이 적은 별명이다.
  받는 값은 남이 보낸 것이라 다 검사하고, 유형은 서버가 답으로 다시 계산한다(보낸 유형을 믿지 않는다).
*/
import { ROUTE, CONTENT_VERSION, TYPES, type TypeCode } from './content';
import { scoreAnswers, typeCode } from './score';
import { orderedQuestions } from './response';
import { cleanName, cleanTableCode, TABLE_CHARS } from './profile';
import { isPick, type Pick } from './look';

export type Member = { id: string; name: string; pick: Pick; stage: number; type?: TypeCode; at: number };
export type Store = {
  finished: Map<string, { answers: Record<string, number>; type: TypeCode; at: number }>;
  tables: Map<string, { createdAt: number; members: Member[] }>;
};
export type ApiResult = { status: number; body: unknown };

export const TABLE_TTL_MS = 6 * 60 * 60 * 1000;
export const TABLE_MAX = 12;
const ID = /^[A-Za-z0-9-]{8,64}$/;

export const createStore = (): Store => ({ finished: new Map(), tables: new Map() });

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

const tableView = (code: string, table: { members: Member[] }) => ({
  code, members: table.members.map(({ id, name, pick, stage, type }) => ({ id, name, pick, stage, type })),
});

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

  if (parts[0] !== 'tables') return { status: 404, body: { error: 'not-found' } };

  if (method === 'POST' && parts.length === 1) {
    for (let tries = 0; tries < 20; tries++) {
      const code = Array.from({ length: 4 }, () => TABLE_CHARS[Math.floor(random() * TABLE_CHARS.length)]).join('');
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
