import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore, handle } from '../game/api.ts';
import { DEFAULT_PICK } from '../game/look.ts';
import { CHEER_GAP_MS, CHEER_MAX } from '../game/cheer.ts';
import { serve, readFormCheers } from '../server/gas.ts';
import { fakeBook } from './fake-sheet.mjs';

const NOW = 1800000000000;
const input = { device: 'c'.repeat(32), project: 'local', name: '이웃', pick: DEFAULT_PICK, text: '예산 지킴이 늘 응원해요' };
const FORM_HEAD = ['타임스탬프', '응원할 사업', '밑빠진 독상에 응원 한마디', '우리동네 예산 지킴이에 응원 한마디', '우리사회 미래대응에 응원 한마디'];

test('응원판은 로그인 없이 쓰고, 300자까지 받으며, 마을 쪽지판·게임 의견에는 섞지 않는다', () => {
  const store = createStore();
  const sent = handle(store, 'POST', '/cheers', input, NOW);
  assert.equal(sent.status, 201);
  assert.equal(sent.body.cheers.length, 1);
  assert.equal(sent.body.cheers[0].project, 'local');
  assert.equal(sent.body.cheers[0].device, undefined); // 기기 번호는 밖으로 안 낸다
  assert.equal(handle(store, 'GET', '/village', null, NOW).body.notes.length, 0);
  const long = '가'.repeat(CHEER_MAX);
  assert.equal(handle(store, 'POST', '/cheers', { ...input, device: 'd'.repeat(32), text: long }, NOW + 1).status, 201);
  assert.equal(handle(store, 'GET', '/cheers', null, NOW + 1).body.cheers[0].text, long); // 새것부터, 자르지 않는다
  assert.equal(handle(store, 'POST', '/cheers', { ...input, device: 'e'.repeat(32), text: long + '가' }, NOW).status, 400);
});

test('응원판은 사업·기기·글을 다시 보고, 같은 기기는 1분에 한 번', () => {
  const store = createStore();
  assert.equal(handle(store, 'POST', '/cheers', { ...input, project: 'nope' }, NOW).status, 400);
  assert.equal(handle(store, 'POST', '/cheers', { ...input, device: '' }, NOW).status, 400);
  assert.equal(handle(store, 'POST', '/cheers', { ...input, text: '연락 주세요 010-1234-5678' }, NOW).status, 400);
  assert.equal(handle(store, 'POST', '/cheers', input, NOW).status, 201);
  assert.equal(handle(store, 'POST', '/cheers', input, NOW + CHEER_GAP_MS - 1).status, 429);
  assert.equal(handle(store, 'POST', '/cheers', input, NOW + CHEER_GAP_MS).status, 201);
  // 게임 의견(pub-notes, 10분)과 응원은 서로 막지 않는다
  assert.equal(handle(store, 'POST', '/village/pub-notes', { device: input.device, name: '', pick: DEFAULT_PICK, text: '재밌어요' }, NOW + CHEER_GAP_MS).status, 201);
});

test('폼 응답은 머리글로 칸을 찾고, 숨김 칸·모르는 사업·링크는 거른다', () => {
  const rows = [
    [...FORM_HEAD, '숨김'],
    [new Date(NOW - 3000), '밑빠진 독상', '독상 최고', '', '', ''],
    [new Date(NOW - 2000), '우리사회 미래대응', '', '', '미래를 같이 준비해요', ''],
    [new Date(NOW - 1000), '밑빠진 독상', '연결 확인용 테스트입니다.', '', '', 'O'],
    [new Date(NOW), '없는 사업', '???', '', '', ''],
    [new Date(NOW), '우리동네 예산 지킴이', '', 'www.example.com 오세요', '', ''],
  ];
  const got = readFormCheers(rows);
  assert.deepEqual(got.map(c => [c.project, c.text, c.id]), [['award', '독상 최고', 'f2'], ['future', '미래를 같이 준비해요', 'f3']]);
  assert.deepEqual(readFormCheers([]), []);
  assert.deepEqual(readFormCheers([['다른 시트']]), []);
});

test('GAS — 응원판은 폼 응원과 바로 적은 응원을 새것부터 섞고, 바로 적은 응원은 쪽지 탭에 사업과 함께 남는다', () => {
  const book = fakeBook();
  const formRows = [FORM_HEAD, [new Date(NOW - 5000), '밑빠진 독상', '폼에서 응원', '', '']];
  let opened = 0;
  const cheerRows = () => { opened++; return formRows; };
  assert.equal(serve('GET', { parameter: { p: '/village' } }, book, NOW, undefined, cheerRows).status, 200);
  assert.equal(opened, 0); // 응원판 요청이 아니면 다른 스프레드시트를 열지 않는다
  const post = serve('POST', { parameter: { p: '/cheers' }, postData: { contents: JSON.stringify({ ...input, text: '=바로 적은 응원' }) } }, book, NOW, undefined, cheerRows);
  assert.equal(post.status, 201);
  const row = book.sheets.get('쪽지').rows[1];
  assert.equal(row[3], "'=바로 적은 응원"); // 수식으로 안 돈다
  assert.equal(row[8], 'cheer');
  const got = serve('GET', { parameter: { p: '/cheers' } }, book, NOW + 1, undefined, cheerRows).body.cheers;
  assert.deepEqual(got.map(c => [c.project, c.text]), [['local', '=바로 적은 응원'], ['award', '폼에서 응원']]);
  // 시트 숨김 칸에 적으면 응원판에서 빠진다
  book.sheets.get('쪽지').rows[1][6] = '숨김';
  assert.deepEqual(serve('GET', { parameter: { p: '/cheers' } }, book, NOW + 2, undefined, cheerRows).body.cheers.map(c => c.text), ['폼에서 응원']);
  // 같은 기기 1분 제한은 시트를 다시 읽어도 지켜진다
  assert.equal(serve('POST', { parameter: { p: '/cheers' }, postData: { contents: JSON.stringify(input) } }, book, NOW + 1000, undefined, cheerRows).status, 429);
});
