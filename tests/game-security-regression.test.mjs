// 확정된 보안 회귀만 검사한다. 외부 OAuth·실제 시트에는 연결하지 않는다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as api from '../game/api.ts';
const { createStore, handle, login } = api;
import { CONSENT_VERSION } from '../game/contact.ts';
import { CONTENT_VERSION } from '../game/content.ts';
import { orderedQuestions } from '../game/response.ts';
import { DEFAULT_PICK } from '../game/look.ts';
import { serve } from '../server/gas.ts';

const NOW = 1800000000000;
const random = () => randomInt(2 ** 32) / 2 ** 32;
const contact = () => ({ payload: {
  consentVersion: CONSENT_VERSION, channel: 'email', address: 'person@example.com',
  consents: { age14: true, collect: true, marketing: false }, at: NOW,
} });

function fakeBook() {
  const sheets = new Map();
  return { sheets, getSheetByName: name => sheets.get(name) ?? null, insertSheet(name) {
    const rows = [];
    const sheet = { rows, getLastRow: () => rows.length, appendRow: row => rows.push([...row]),
      getRange: (row, col, nr = 1, nc = 1) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => rows[row - 1 + i]?.[col - 1 + j] ?? '')),
        setValues: values => values.forEach((valuesRow, i) => {
          const target = rows[row - 1 + i] ??= [];
          valuesRow.forEach((value, j) => { target[col - 1 + j] = value; });
        }),
      }),
    };
    sheets.set(name, sheet); return sheet;
  } };
}

const deps = props => ({
  prop: name => props[name] ?? null, random,
  sha256: text => createHash('sha256').update(text).digest('hex'),
  fetch() { throw new Error('이 회귀 테스트는 외부 요청을 하지 않는다'); },
});
const post = (book, path, body, properties = {}, extra = {}) => serve('POST', {
  parameter: { p: path }, postData: { contents: JSON.stringify(body) },
}, book, NOW, { ...deps(properties), ...extra });
const resident = (store, id, admin = false) => login(store, `google:${String(id).padStart(64, '0')}`, NOW, random, admin).body.key;
const noteFor = store => {
  const result = handle(store, 'POST', '/village/notes', {
    key: resident(store, 1), name: '주민', text: '우리 동네에 나무를 심어요', pick: DEFAULT_PICK,
  }, NOW, random);
  assert.equal(result.status, 201);
  return result.body.note.id;
};

test('연락처 시트: 이웃 생김새 seed를 수식으로 실행할 수 없다', () => {
  const book = fakeBook();
  const result = post(book, '/contact', { ...contact(), neighbor: {
    questionId: orderedQuestions[0].id, key: 'a', name: '이웃', seed: '=1+1', at: NOW,
  } }, { CONTACT_ENABLED: 'true' });
  assert.equal(result.status, 200);
  assert.equal(book.sheets.get('연락처').rows[1][10], "'=1+1", '외부 문자열은 시트에서 수식 대신 글자로 저장한다');
});

test('연락처 수집: GAS 설정이 없거나 false이면 시트를 만들거나 쓰지 않는다', () => {
  for (const properties of [{}, { CONTACT_ENABLED: 'false' }]) {
    const book = fakeBook();
    const result = post(book, '/contact', contact(), properties);
    assert.ok(result.status >= 400, '공개 수집은 CONTACT_ENABLED=true로 명시적으로 켠 뒤에만 허용한다');
    assert.equal(book.sheets.has('연락처'), false);
  }
});

test('쪽지 신고: 익명 완료 세션 세 개로 다른 주민의 글을 숨길 수 없다', () => {
  const store = createStore(), id = noteFor(store);
  const answers = Object.fromEntries(orderedQuestions.map(question => [question.id, 2]));
  const statuses = [];
  for (let i = 0; i < 3; i++) {
    const sessionId = `anonymous-report-${i}`;
    assert.equal(handle(store, 'POST', '/finish', { sessionId, contentVersion: CONTENT_VERSION, answers }, NOW + i).status, 200);
    statuses.push(handle(store, 'POST', `/village/notes/${id}/report`, { sessionId }, NOW + i).status);
  }
  assert.deepEqual(statuses, [403, 403, 403], '완료 세션은 로그인 권한을 대신할 수 없다');
  assert.equal(handle(store, 'GET', '/village', null, NOW).body.notes.length, 1);
});

test('쪽지 신고: 로그인한 주민 한 명의 신고는 판을 바꿔도 한 번만 센다', () => {
  const store = createStore(), id = noteFor(store), key = resident(store, 2);
  for (const body of [{ key }, { key, sessionId: 'another-session-1' }, { key, sessionId: 'another-session-2' }]) {
    assert.equal(handle(store, 'POST', `/village/notes/${id}/report`, body, NOW).status, 200);
  }
  assert.equal(store.notes.get(id).reports.length, 1);
  assert.equal(handle(store, 'GET', '/village', null, NOW).body.notes.length, 1);
});

test('/me: 현재 서버 관리자 권한을 true 또는 false로 돌려준다', () => {
  const store = createStore(), key = resident(store, 3);
  const me = () => handle(store, 'POST', '/me', { key, admin: true }, NOW).body;
  assert.equal(me().admin, false, '클라이언트의 관리자 주장을 믿지 않는다');
  resident(store, 3, true);
  assert.equal(me().admin, true);
  resident(store, 3, false);
  assert.equal(me().admin, false, '다시 로그인하여 서버 권한이 내려가면 즉시 반영한다');
});

test('GAS: 큰 요청은 파싱하거나 영구 저장소를 열기 전에 거부한다', () => {
  const book = fakeBook();
  assert.equal(post(book, '/homes', { padding: 'x'.repeat(20000) }).status, 413);
  assert.equal(book.sheets.size, 0);
});

test('GAS: 서버 변경요청 한도를 넘으면 새 집을 저장하지 않는다', () => {
  const book = fakeBook();
  assert.equal(post(book, '/homes', {}, {}, { quota: () => false }).status, 429);
  assert.equal(book.sheets.size, 0);
});

const cacheQuota = () => {
  const counts = new Map();
  return (bucket, limit) => {
    const n = counts.get(bucket) ?? 0;
    if (n >= limit) return false;
    counts.set(bucket, n + 1); return true;
  };
};
const fakeCache = () => {
  const values = new Map();
  return { get: key => values.get(key) ?? null, put: (key, value) => values.set(key, value) };
};

test('연락처 수집: 주소의 대소문자·빈칸으로 중복 저장을 우회할 수 없다', () => {
  const book = fakeBook(), extra = { quota: cacheQuota(), cache: fakeCache() }, properties = { CONTACT_ENABLED: 'true' };
  assert.equal(post(book, '/contact', contact(), properties, extra).status, 200);
  const second = contact(); second.payload.address = ' Person@Example.com ';
  assert.equal(post(book, '/contact', second, properties, extra).status, 200);
  assert.equal(book.sheets.get('연락처').rows.length, 2, '헤더와 최초 신청 한 줄만 남긴다');
});

test('연락처 수집: 서로 다른 주소로 요청해도 서버 분당 한도를 적용한다', () => {
  const book = fakeBook(), extra = { quota: cacheQuota() }, properties = { CONTACT_ENABLED: 'true' };
  let result;
  for (let i = 0; i < 11; i++) {
    const body = contact(); body.payload.address = `person${i}@example.com`;
    result = post(book, '/contact', body, properties, extra);
    if (i < 10) assert.equal(result.status, 200);
  }
  assert.equal(result.status, 429);
  assert.equal(book.sheets.get('연락처').rows.length, 11);
});

test('완료 기록: 저장 한도에서는 새 익명 판만 거부하고 기존 판은 보존한다', () => {
  const store = createStore(), answers = Object.fromEntries(orderedQuestions.map(q => [q.id, 2]));
  const count = api.FINISHED_MAX ?? 10000;
  for (let i = 0; i < count; i++) store.finished.set(`existing-${i}`, { answers, type: '000', at: NOW });
  const body = { sessionId: 'new-anonymous-run', contentVersion: CONTENT_VERSION, answers };
  assert.equal(handle(store, 'POST', '/finish', body, NOW).status, 503);
  assert.equal(store.finished.size, count);
  assert.equal(handle(store, 'POST', '/finish', { ...body, sessionId: 'existing-0' }, NOW).status, 200);
});

test('방명록 집: 저장 한도에서는 새 집만 거부하고 기존 열쇠는 보존한다', () => {
  const store = createStore(), count = api.HOMES_MAX ?? 5000;
  for (let i = 0; i < count; i++) store.homes.set(`H${String(i).padStart(15, '0')}`, { key: 'old-key', at: NOW });
  assert.equal(handle(store, 'POST', '/homes', {}, NOW).status, 503);
  assert.equal(store.homes.size, count);
  assert.equal(handle(store, 'POST', '/homes/H000000000000000/book', { key: 'old-key' }, NOW).status, 200);
});

test('연락처 수집: 시트 쓰기가 실패한 주소는 재시도할 때 저장할 수 있다', () => {
  const book = fakeBook(), extra = { quota: cacheQuota(), cache: fakeCache() };
  const insert = book.insertSheet.bind(book);
  let failOnce = true;
  book.insertSheet = name => {
    const sheet = insert(name), append = sheet.appendRow;
    if (name === '연락처') sheet.appendRow = row => {
      if (failOnce && sheet.rows.length > 0) { failOnce = false; throw new Error('simulated-sheet-write-failure'); }
      return append(row);
    };
    return sheet;
  };
  assert.throws(() => post(book, '/contact', contact(), { CONTACT_ENABLED: 'true' }, extra), /simulated-sheet-write-failure/);
  assert.equal(post(book, '/contact', contact(), { CONTACT_ENABLED: 'true' }, extra).status, 200);
  assert.equal(book.sheets.get('연락처').rows.length, 2);
});

test('Code.js: ScriptCache가 같은 버킷의 변경요청 한도를 센다', () => {
  const cache = fakeCache();
  const context = { CacheService: { getScriptCache: () => cache }, PropertiesService: {
    getScriptProperties: () => ({ getProperty: name => name === 'ACCOUNT_SALT' ? 'test-salt' : null }),
  } };
  runInNewContext(readFileSync(new URL('../server/gas/Code.js', import.meta.url), 'utf8'), context);
  const boundary = context.deps_();
  assert.deepEqual([boundary.quota('same-minute', 2, 60), boundary.quota('same-minute', 2, 60), boundary.quota('same-minute', 2, 60)], [true, true, false]);
  assert.equal(boundary.quota('next-minute', 2, 60), true);
});
