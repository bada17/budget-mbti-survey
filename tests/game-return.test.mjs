// 다시 올 이유(기획 3차, 10-14) — 답장·방명록·우리 지역·이웃의 편지·철·도장, 그리고 구글 시트 저장소. 화면 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeInvite, decodeInvite, neighborParam, readNeighborParam, TOWN_IDS, REGIONS } from '../game/profile.ts';
import { createStore, handle, BOOK_MAX } from '../game/api.ts';
import { serve } from '../server/gas.ts';
import { seasonAt, nextSeason, seasonById, letterFor } from '../game/seasons.ts';
import { board, eventStamp, seasonStamp, STAMPS, ISSUE_AT } from '../game/stamps.ts';
import { orderedQuestions } from '../game/response.ts';
import { CONTENT_VERSION } from '../game/content.ts';
import { CONSENT_VERSION } from '../game/contact.ts';
import { fakeBook } from './fake-sheet.mjs';

const answersFor = value => Object.fromEntries(orderedQuestions.map(q => [q.id, value]));
const finish = (store, sessionId, value = 2, now = 1000) => handle(store, 'POST', '/finish', { sessionId, contentVersion: CONTENT_VERSION, answers: answersFor(value) }, now);
const kst = (y, m, d) => Date.UTC(y, m - 1, d, 3); // 한국 시간 낮 12시

test('답장 링크: 두 사람 동네가 다 실리고, 길이 한도 안, 이상한 답장·집 번호는 그것만 버린다', () => {
  const town = 'ab'.repeat(7) + 'a';
  const minji = { name: '가나다라마바사아자차', pick: [2, 1, 3, 0], type: '101', town };
  const reply = { name: '하늘하늘하늘하늘하늘', pick: [1, 1, 1, 1], type: '010', town: 'b'.repeat(15), home: 'ABCDEFGHJKLM2345', replyTo: minji };
  const code = encodeInvite(reply);
  assert.ok(code.length <= 600, `코드 ${code.length}자`);
  assert.deepEqual(decodeInvite(code), reply);
  // 옛 링크 그대로
  assert.deepEqual(decodeInvite(encodeInvite({ name: '민지', pick: [0, 0, 0, 0], type: '111' })), { name: '민지', pick: [0, 0, 0, 0], type: '111' });
  const raw = { v: 1, n: 'a', p: [0, 0, 0, 0], t: '101', h: 'short', r: { n: 'b', p: [9, 9, 9, 9], t: '101' } };
  const odd = Buffer.from(JSON.stringify(raw)).toString('base64url');
  assert.deepEqual(decodeInvite(odd), { name: 'a', pick: [0, 0, 0, 0], type: '101' });
});

test('편지 링크의 이웃: 시트 수식으로도 만들 수 있는 꼴, 이상하면 버린다', () => {
  const n = { questionId: orderedQuestions[4].id, key: 'b', seed: `${orderedQuestions[4].id}:left`, name: '도서관 이웃', at: 0 };
  assert.deepEqual(readNeighborParam(neighborParam(n)), n);
  assert.equal(readNeighborParam('X-1~a~seed~이름'), undefined);
  assert.equal(readNeighborParam(`${n.questionId}~c~seed~이름`), undefined);
  assert.equal(readNeighborParam(null), undefined);
  assert.equal(readNeighborParam(`${n.questionId}~a~seed~`).name, '이웃');
});

test('예산철: 9월·12월(한국 날짜)만 철이고, 다음 철과 편지가 맞게 나온다', () => {
  assert.equal(seasonAt(kst(2026, 10, 14)), undefined);
  assert.equal(seasonAt(kst(2026, 12, 2)).id, '2026-dec');
  assert.equal(seasonAt(kst(2027, 9, 3)).id, '2027-sep');
  assert.equal(seasonAt(Date.UTC(2026, 10, 30, 16)).id, '2026-dec', '11월 30일 밤 UTC = 한국 12월 1일');
  assert.equal(nextSeason(kst(2026, 10, 14)).id, '2026-dec');
  assert.equal(nextSeason(kst(2026, 12, 20)).id, '2027-sep');
  assert.equal(nextSeason(kst(2027, 3, 1)).id, '2027-sep');
  assert.equal(seasonById('2026-dec').month, 12);
  assert.equal(seasonById('2026-jan'), undefined);
  const q = orderedQuestions[0];
  const letter = letterFor(seasonById('2026-dec'), { questionId: q.id, key: 'a', seed: 's', name: '민지', at: 0 }, '하늘');
  assert.equal(letter.lines[0], '하늘님, 저 민지예요.');
  assert.ok(letter.lines[1].includes(q.a.text) && letter.lines[1].includes(q.place));
  assert.ok(letter.lines.join(' ').includes('12월은 국회가'));
  assert.equal(letterFor(seasonById('2027-sep'), undefined, '').lines[0], '주민님, 저 동네 주민이에요.');
  // 결과가 어디에 쓰인다는 약속은 넣지 않는다(10-14 「어디에 쓸 게 아님」)
  assert.ok(!/전달|반영|제출|모아서/.test(letter.lines.join(' ')));
});

test('도장판: 일곱 칸, 철·현장 도장은 한 칸에 모여 세고, 목록에 없는 현장 코드는 안 찍힌다', () => {
  assert.equal(STAMPS.length, 7, '10-15 「6~7개만」');
  assert.equal(new Set(STAMPS.map(s => s.id)).size, 7);
  // 주민증 발급 — 혼자 한 번에 받을 수 있는 도장만으로 발급까지 닿는다(철·현장·손님은 혼자 못 받는다)
  const solo = STAMPS.filter(s => !['season', 'event', 'guest'].includes(s.id));
  assert.ok(solo.length >= ISSUE_AT && ISSUE_AT <= STAMPS.length);
  assert.equal(board(Object.fromEntries(solo.map(s => [s.id, 1]))).filter(c => c.on).length >= ISSUE_AT, true);
  const cells = board({ walk: 1, [seasonStamp('2026-dec')]: 2, [seasonStamp('2027-sep')]: 3, 'event:pub-2026': 4 });
  assert.deepEqual(cells.filter(c => c.on).map(c => [c.id, c.count]), [['walk', 1], ['season', 2], ['event', 1]]);
  assert.equal(eventStamp('pub-2026'), 'event:pub-2026');
  assert.equal(eventStamp('toString'), undefined);
  assert.equal(eventStamp(null), undefined);
});

test('방명록: 끝낸 사람만, 한 판에 한 번, 동네·유형은 서버가 만들고, 열쇠가 있어야 읽는다', () => {
  const store = createStore();
  const made = handle(store, 'POST', '/homes', {}, 0);
  assert.equal(made.status, 201);
  const { id, key } = made.body;
  assert.match(id, /^[A-Z0-9]{16}$/);
  const visit = (sessionId, extra = {}) => handle(store, 'POST', `/homes/${id}/visits`, { sessionId, name: '하늘', pick: [1, 2, 3, 4], ...extra }, 2000);
  assert.equal(visit('session-none').status, 400, '끝내지 않은 판은 못 남긴다');
  finish(store, 'session-1111', 5);
  assert.equal(visit('session-1111').status, 200);
  assert.equal(visit('session-1111').status, 200);
  assert.equal(visit('session-1111', { pick: [9, 9, 9, 9] }).status, 400);
  assert.equal(handle(store, 'POST', `/homes/${id}/book`, { key: 'nope' }, 3000).status, 403);
  const book = handle(store, 'POST', `/homes/${id}/book`, { key }, 3000).body.visits;
  assert.equal(book.length, 1);
  assert.deepEqual(book[0], { name: '하늘', pick: [1, 2, 3, 4], type: '111', town: 'b'.repeat(TOWN_IDS.length), at: 2000 });
  assert.equal(handle(store, 'POST', '/homes/ABCDEFGHJKLM2345/visits', { sessionId: 'session-1111', pick: [0, 0, 0, 0] }, 0).status, 404);
  for (let i = 0; i < BOOK_MAX + 5; i++) { finish(store, `session-x${String(i).padStart(4, '0')}`); visit(`session-x${String(i).padStart(4, '0')}`); }
  assert.equal(handle(store, 'POST', `/homes/${id}/book`, { key }, 3000).body.visits.length, BOOK_MAX);
});

test('우리 동네(시·군·구 코드): 끝낸 판만 한 번 짓고, 한 명부터 갈림을 보이고, 유형 분포는 안 낸다', () => {
  const store = createStore();
  const build = (sessionId, region = '1124000') => handle(store, 'POST', '/region', { sessionId, region, pick: [0, 1, 2, 3] }, 5000);
  assert.equal(build('session-none').status, 400);
  finish(store, 'session-0001', 1);
  assert.equal(build('session-0001', '서울').status, 400, '시·도 이름은 이제 안 받는다');
  assert.equal(build('session-0001', '112400').status, 400);
  let view = build('session-0001').body;
  assert.equal(view.total, 1);
  assert.deepEqual(view.questions[orderedQuestions[0].id], { a: 1, b: 0 }, '한 명이어도 바로 보인다');
  assert.equal(view.types, undefined);
  assert.deepEqual(view.crowd, [[0, 1, 2, 3]]);
  build('session-0001', '2600000'); // 다시 지어도 처음 지은 곳
  assert.equal(handle(store, 'GET', `/regions/2600000`, null, 0).body.total, 0);
  for (let i = 2; i <= 3; i++) { finish(store, `session-000${i}`, 6); build(`session-000${i}`); }
  view = handle(store, 'GET', `/regions/1124000`, null, 0).body;
  assert.equal(view.total, 3);
  assert.deepEqual(view.questions[orderedQuestions[0].id], { a: 1, b: 2 });
  assert.equal(handle(store, 'GET', '/regions/%E0%A4%A', null, 0).status, 404, '깨진 주소');
  assert.equal(REGIONS.length, 17);
});

test('연락처: 동의·형식을 서버가 다시 보고, 이웃·유형은 깨끗한 것만, 지역은 받지 않는다(동의 항목에 없음)', () => {
  const store = createStore();
  const payload = { consentVersion: CONSENT_VERSION, channel: 'email', address: 'me@example.com', consents: { age14: true, collect: true, marketing: false }, at: 1 };
  const neighbor = { questionId: orderedQuestions[0].id, key: 'a', seed: 'x', name: '민지' };
  assert.equal(handle(store, 'POST', '/contact', { payload, neighbor, type: '101', region: '제주' }, 7000).status, 200);
  assert.equal(store.contacts[0].neighbor.name, '민지');
  assert.equal(store.contacts[0].region, undefined);
  assert.equal(store.contacts[0].receivedAt, 7000);
  for (const bad of [{ ...payload, consents: { ...payload.consents, collect: false } }, { ...payload, address: 'nope' }, { ...payload, consentVersion: 'old' }, { ...payload, channel: 'fax' }]) {
    assert.equal(handle(store, 'POST', '/contact', { payload: bad }, 0).status, 400, JSON.stringify(bad));
  }
  handle(store, 'POST', '/contact', { payload, neighbor: { questionId: 'nope' }, type: '999', region: '평양' }, 0);
  assert.deepEqual(Object.keys(store.contacts[1]).filter(k => ['neighbor', 'type', 'region'].includes(k)), []);
});

// ── 구글 시트 저장소 — 앱스 스크립트의 시트를 흉내 낸 가짜로(fake-sheet.mjs) ──
test('구글 시트 저장소: 요청마다 읽고 바뀐 줄만 쓴다, 연락처는 사람이 읽는 칸으로, 테이블은 없다', () => {
  const book = fakeBook();
  const post = (p, body, now = 1000) => serve('POST', { parameter: { p }, postData: { contents: JSON.stringify(body) } }, book, now);
  const get = p => serve('GET', { parameter: { p } }, book, 2000);
  assert.equal(post('/finish', { sessionId: 'session-aaaa', contentVersion: CONTENT_VERSION, answers: answersFor(1) }).status, 200);
  assert.equal(post('/finish', { sessionId: 'session-bbbb', contentVersion: CONTENT_VERSION, answers: answersFor(6) }).status, 200);
  assert.equal(book.sheets.get('응답').rows.length, 3, '머리 줄 + 두 판');
  assert.equal(get('/stats').body.total, 2, '다음 요청이 시트에서 다시 읽는다');
  // 고친 줄은 제자리에서 고친다(줄이 늘지 않는다)
  post('/region', { sessionId: 'session-aaaa', region: '1100000', pick: [0, 0, 0, 0] }, 3000);
  assert.equal(book.sheets.get('응답').rows.length, 3);
  assert.equal(JSON.parse(book.sheets.get('응답').rows[1][1]).region, '1100000');
  // 방명록
  const { id, key } = post('/homes', {}).body;
  post(`/homes/${id}/visits`, { sessionId: 'session-bbbb', name: '하늘', pick: [1, 1, 1, 1] });
  assert.equal(post(`/homes/${id}/book`, { key }).body.visits[0].name, '하늘');
  // 연락처
  const payload = { consentVersion: CONSENT_VERSION, channel: 'sms', address: '01012345678', consents: { age14: true, collect: true, marketing: true }, at: 1 };
  post('/contact', { payload, type: '101', region: '서울' }, Date.UTC(2026, 9, 14));
  const contacts = book.sheets.get('연락처').rows;
  assert.equal(contacts[0][0], '받은 시각');
  assert.deepEqual(contacts[1].slice(1, 7), ['문자', '01012345678', '예', '예', '예', CONSENT_VERSION]);
  assert.equal(contacts[1][11], '101 밥 짓는 이웃');
  assert.equal(contacts[1].length, 12, '지역 칸 없음');
  // 테이블·이상한 길은 없다, 깨진 몸통은 400
  assert.equal(post('/tables', {}).status, 404);
  assert.equal(serve('POST', { parameter: { p: '/finish' }, postData: { contents: '{깨짐' } }, book).status, 400);
  assert.equal(get('nope').status, 404);
  // 사람이 손으로 망친 줄은 건너뛴다
  book.sheets.get('응답').rows.push(['session-hand', '{망침']);
  assert.equal(get('/stats').body.total, 2);
});
