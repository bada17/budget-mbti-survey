/*
  구글 시트 서버 — 앱스 스크립트 웹 앱에서 game/api.ts 규칙을 그대로 돌린다(사용자 10-14: 「모으는 게 필요해지면 구글 시트 +
  앱스 스크립트로 가볍게 시작하고 나중에 옮긴다」). 빌드: npm run build:gas → server/gas/server.js. 올리는 법은 README 「구글 시트 서버」.

  탭 —
  · 응답·방명록집·방명록: 열쇠 | 값(JSON) | 고친 시각. 요청마다 읽어 Map 으로 만들고, 바뀐 줄만 다시 쓴다.
  · 연락처: 사람이 읽는 칸으로 한 줄씩 덧붙이기만(읽어 들이지 않는다 — 게임이 연락처를 읽을 일이 없다).
  테이블은 안 붙인다(net.ts 의 TABLES).

  ponytail: 요청마다 탭 전체를 읽는다 — 응답이 수천 건을 넘어 느려지면 진짜 서버(README 정할 것 10)로 옮긴다.
*/
import { handle, type Store, type Contact, type Finished, type Visit } from '../game/api';
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

const KV = { finished: '응답', homes: '방명록집', books: '방명록' } as const;
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

/** 웹 앱 한 번 — doGet/doPost(Code.js)가 부른다. 쓰는 요청(POST)은 Code.js 가 잠금을 잡고 부른다. */
export function serve(method: 'GET' | 'POST', event: GasEvent, book: Book, now = Date.now()) {
  const path = String(event.parameter?.p ?? '/');
  if (!path.startsWith('/') || path.startsWith('/tables')) return { status: 404, body: { error: 'not-found' } };
  let body: unknown = null;
  try { body = event.postData?.contents ? JSON.parse(event.postData.contents) : null; } catch { body = null; }

  const sheets = { finished: tab(book, KV.finished, ['세션', '값', '고친 시각']), homes: tab(book, KV.homes, ['집 번호', '값', '고친 시각']), books: tab(book, KV.books, ['집 번호', '값', '고친 시각']) };
  const store: Store = {
    finished: readKV<Finished>(sheets.finished), homes: readKV<{ key: string; at: number }>(sheets.homes), books: readKV<Visit[]>(sheets.books),
    tables: new Map(), contacts: [],
  };
  const result = handle(store, method, path, body, now);
  if (method === 'POST' && result.status < 400) {
    for (const name of ['finished', 'homes', 'books'] as const) writeKV(sheets[name], store[name] as Tracked<unknown>, now);
    if (store.contacts.length) {
      const sheet = tab(book, CONTACT_TAB, CONTACT_HEAD);
      store.contacts.forEach(c => sheet.appendRow(contactRow(c)));
    }
  }
  return result;
}
