import test from 'node:test';
import assert from 'node:assert/strict';
import { net } from '../game/net.ts';
import { orderedQuestions } from '../game/response.ts';

test('점검 모드: 서버가 확인한 관리자만 열고 이후 게임 요청은 실제 서버에 쓰지 않는다', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  let admin = false;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return Response.json({ save: {}, admin });
  };
  try {
    assert.equal(typeof net.startInspection, 'function', '서버 권한을 확인하는 점검 시작 경로');
    assert.equal(await net.startInspection('A'.repeat(32)), false);
    admin = true;
    assert.equal(await net.startInspection('A'.repeat(32)), true);
    const answers = Object.fromEntries(orderedQuestions.map(q => [q.id, 1]));
    assert.ok(await net.finish('inspection-session', answers));
    assert.ok(await net.newHome());
    assert.ok(await net.saveMe('A'.repeat(32), { region: '1144000' }));
    assert.equal((await net.me('A'.repeat(32))).save.region, '1144000');
    assert.equal(requests.length, 2, '관리자 확인 두 번 이외에는 통계·게임 기록 서버 요청이 없어야 한다');
    assert.ok(requests.every(r => r.url.endsWith('/me')));
  } finally { globalThis.fetch = originalFetch; }
});

test('점검 저장소: 실제 시민증·주머니·로그인 기록을 덮어쓰지 않는다', async () => {
  const originalStorage = globalThis.localStorage;
  const actual = new Map([['budget-game-me', 'original'], ['budget-game-login', 'real-account']]);
  globalThis.localStorage = {
    getItem: key => actual.get(key) ?? null,
    setItem: (key, value) => actual.set(key, value),
    removeItem: key => actual.delete(key),
  };
  try {
    const storage = await import('../game/storage.ts').catch(() => ({}));
    assert.equal(typeof storage.useInspectionStorage, 'function', '점검 기록을 분리하는 저장소');
    storage.useInspectionStorage();
    assert.equal(storage.gameStorage.getItem('budget-game-me'), null);
    storage.gameStorage.setItem('budget-game-me', 'preview');
    storage.gameStorage.removeItem('budget-game-login');
    assert.equal(storage.gameStorage.getItem('budget-game-me'), 'preview');
    assert.equal(actual.get('budget-game-me'), 'original');
    assert.equal(actual.get('budget-game-login'), 'real-account');
  } finally { globalThis.localStorage = originalStorage; }
});
