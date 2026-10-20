// 유입 재기(10-21) — 출처 고르기, 서버가 들어옴·끝까지·보냄을 쌓기, 시트 「유입」 에 한 줄씩.
import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceFrom } from '../game/source.ts';
import { createStore, handle } from '../game/api.ts';
import { serve } from '../server/gas.ts';
import { orderedQuestions } from '../game/response.ts';
import { CONTENT_VERSION } from '../game/content.ts';
import { fakeBook } from './fake-sheet.mjs';

const answers = Object.fromEntries(orderedQuestions.map(q => [q.id, 2]));
const host = 'forest.action.or.kr';

test('출처 — 꼬리표 → 친구 링크 → 들어온 사이트 → (direct)', () => {
  assert.deepEqual(sourceFrom('?utm_source=Newsletter&utm_medium=email&utm_campaign=1021', '', host), { source: 'newsletter', medium: 'email', campaign: '1021' });
  assert.deepEqual(sourceFrom('?with=abc', 'https://www.action.or.kr/', host), { source: 'friend', medium: 'invite', campaign: '' });
  assert.deepEqual(sourceFrom('?card=c1', '', host), { source: 'friend', medium: 'card', campaign: '' });
  assert.deepEqual(sourceFrom('', 'https://www.action.or.kr/74', host), { source: 'action.or.kr', medium: 'referral', campaign: '' });
  assert.deepEqual(sourceFrom('', `https://${host}/game/`, host), { source: '(direct)', medium: '', campaign: '' }, '우리 주소에서 넘어온 건 direct');
  assert.equal(sourceFrom('?utm_source==HYPERLINK("x")', '', host).source, 'hyperlinkx', '이상한 글자는 뺀다');
});

test('서버 — 들어옴·보냄은 GET /hit, 끝까지는 처음 받은 판에서만', () => {
  const store = createStore();
  assert.equal(handle(store, 'GET', '/hit/arrive/session-aaaa/kakao/-/-', null, 1).status, 200);
  assert.equal(handle(store, 'GET', '/hit/finish/session-aaaa/kakao/-/-', null, 1).status, 400, '끝까지는 hit 로 못 보낸다');
  assert.equal(handle(store, 'GET', '/hit/arrive/bad/kakao/-/-', null, 1).status, 400);
  const finish = () => handle(store, 'POST', '/finish', { sessionId: 'session-aaaa', contentVersion: CONTENT_VERSION, answers, src: { source: 'kakao' } }, 2);
  finish(); finish();
  handle(store, 'GET', '/hit/share/session-aaaa/kakao/-/-', null, 3);
  assert.deepEqual(store.hits.map(h => `${h.kind}:${h.source}`), ['arrive:kakao', 'finish:kakao', 'share:kakao']);
});

test('시트 — 「유입」 에 덧붙이고, 처음엔 「유입 요약」 수식', () => {
  const book = fakeBook();
  assert.equal(serve('GET', { parameter: { p: '/hit/arrive/session-aaaa/news%20letter/email/-' } }, book, 1000).status, 200);
  serve('POST', { parameter: { p: '/finish' }, postData: { contents: JSON.stringify({ sessionId: 'session-aaaa', contentVersion: CONTENT_VERSION, answers, src: { source: 'news letter' } }) } }, book, 2000);
  const rows = book.sheets.get('유입').rows.slice(1);
  assert.deepEqual(rows.map(r => [r[1], r[2]]), [['들어옴', "'news letter"], ['끝까지', "'news letter"]]);
  assert.match(String(book.sheets.get('유입 요약').rows[0][0]), /^=QUERY\('유입'/);
});
