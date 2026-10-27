import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore, handle } from '../game/api.ts';
import { DEFAULT_PICK } from '../game/look.ts';
import { NOTE_GAP_MS } from '../game/village.ts';
import { serve } from '../server/gas.ts';
import { fakeBook } from './fake-sheet.mjs';

const NOW = 1800000000000;
const input = { device: 'a'.repeat(32), name: '이웃', pick: DEFAULT_PICK, text: '골라 보니 어려웠어요' };
test('주점 의견은 로그인 없이 받아 그 판에 바로 보이고, 마을 쪽지판에는 섞지 않는다', () => {
  const store = createStore();
  const sent = handle(store, 'POST', '/village/pub-notes', input, NOW);
  assert.equal(sent.status, 201);
  assert.deepEqual(sent.body.notes.map(n => n.text), [input.text]);
  assert.equal([...store.notes.values()][0].source, 'pub');
  handle(store, 'POST', '/village/pub-notes', { ...input, device: 'b'.repeat(32), text: '두 번째' }, NOW + 1);
  assert.deepEqual(handle(store, 'GET', '/village/pub-notes', null, NOW).body.notes.map(n => n.text), ['두 번째', input.text]);
  const [first] = store.notes.values(); store.notes.set(first.id, { ...first, hidden: true });
  assert.deepEqual(handle(store, 'GET', '/village/pub-notes', null, NOW).body.notes.map(n => n.text), ['두 번째']);
  assert.equal(handle(store, 'GET', '/village', null, NOW).body.notes.length, 0);
  assert.equal(handle(store, 'GET', '/regions/4211000', null, NOW).body.notes.length, 0);
  assert.equal(store.finished.size, 0);
  assert.equal(store.residents.size, 0);
});
test('서버는 같은 기기의 10분 내 중복과 잘못된 글을 막고 본편 인증은 유지한다', () => {
  const store = createStore();
  assert.equal(handle(store, 'POST', '/village/pub-notes', input, NOW).status, 201);
  assert.equal(handle(store, 'POST', '/village/pub-notes', input, NOW + NOTE_GAP_MS - 1).status, 429);
  assert.equal(handle(store, 'POST', '/village/pub-notes', input, NOW + NOTE_GAP_MS).status, 201);
  assert.equal(handle(store, 'POST', '/village/pub-notes', { ...input, device: 'b'.repeat(32) }, NOW).status, 201);
  assert.equal(handle(store, 'POST', '/village/pub-notes', { ...input, device: '' }, NOW).status, 400);
  assert.equal(handle(store, 'POST', '/village/pub-notes', { ...input, text: 'https://example.com' }, NOW).status, 400);
  assert.equal(handle(store, 'POST', '/village/notes', input, NOW).status, 403);
});
test('GAS는 pub 출처와 기기 제한을 시트에 남겨 다음 요청에서도 막으며 수식을 글자로 저장한다', () => {
  const book = fakeBook();
  const post = (value, at) => serve('POST', { parameter: { p: '/village/pub-notes' }, postData: { contents: JSON.stringify(value) } }, book, at);
  assert.equal(post({ ...input, text: '=한번더걷기' }, NOW).status, 201);
  const row = book.sheets.get('쪽지').rows[1];
  assert.equal(row[3], "'=한번더걷기");
  assert.equal(JSON.parse(row[7]).source, 'pub');
  assert.equal(row[8], 'pub');
  assert.equal(post(input, NOW + 1000).status, 429);
  assert.equal(serve('GET', { parameter: { p: '/village' } }, book, NOW).body.notes.length, 0);
});


test('주점 게임 저장은 메모리에만, 의견 제한 토큰과 시각은 별도로 보존한다', async () => {
  const disk = new Map([['budget-game-login', 'existing-user']]);
  globalThis.localStorage = { getItem:k => disk.get(k) ?? null, setItem:(k,v) => disk.set(k,v), removeItem:k => disk.delete(k) };
  const { gameStorage, useTemporaryStorage, isInspectionMode } = await import('../game/storage.ts');
  useTemporaryStorage();
  assert.equal(gameStorage.getItem('budget-game-login'), null);
  gameStorage.setItem('budget-game-me', 'pub-person');
  assert.equal(disk.has('budget-game-me'), false);
  assert.equal(disk.get('budget-game-login'), 'existing-user');
  assert.equal(isInspectionMode(), false);
  const { feedbackGate, feedbackSent } = await import('../game/pub-feedback.ts');
  const gate = feedbackGate(NOW);
  assert.equal(gate.wait, 0);
  feedbackSent(NOW);
  assert.equal(feedbackGate(NOW + 1).wait, NOTE_GAP_MS - 1);
  assert.equal(JSON.parse(disk.get('budget-game-pub-feedback')).device, gate.device);
  assert.equal(feedbackGate(NOW + NOTE_GAP_MS).wait, 0);
  delete globalThis.localStorage;
});
