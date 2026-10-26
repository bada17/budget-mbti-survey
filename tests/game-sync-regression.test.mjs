import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { build } from 'esbuild';

// 실제 두 모듈을 메모리에서 실행한다. 서버 요청만 대체하며 파일은 굽지 않는다.
const bundled = await build({
  stdin: {
    contents: 'import * as profile from "./game/profile.ts"; import * as login from "./game/login.ts"; export { profile, login }; export { useInspectionStorage } from "./game/storage.ts";',
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
    sourcefile: 'sync-regression-entry.ts',
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'cjs',
  define: { 'import.meta.env': '{"DEV":true}' },
  plugins: [{
    name: 'offline-game-server',
    setup(builder) {
      builder.onResolve({ filter: /^\.\/net$/ }, () => ({ path: 'game-net', namespace: 'offline' }));
      builder.onLoad({ filter: /.*/, namespace: 'offline' }, () => ({ contents: 'export const net = globalThis.testNet;', loader: 'js' }));
    },
  }],
});

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
};

test('점검에서는 OAuth 제공자로 이동하거나 실제 로그인 대기를 만들지 않는다', () => {
  const runtime = browser();
  runtime.useInspectionStorage();
  const before = runtime.location.href;
  assert.equal(runtime.login.start('google'), false);
  assert.equal(runtime.location.href, before);
  assert.equal(runtime.context.sessionStorage.getItem('budget-game-login-pending'), null);
});

function browser(userAgent = 'Regression browser') {
  const location = { origin: 'https://forest.action.or.kr', pathname: '/game/', search: '', hash: '', href: 'https://forest.action.or.kr/game/', reload() {} };
  const timers = new Map(), events = new EventTarget(), document = new EventTarget();
  document.hidden = false;
  let clock = 0, timerId = 0;
  const module = { exports: {} };
  const context = {
    module, exports: module.exports,
    console, URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa, structuredClone,
    crypto: webcrypto, navigator: { userAgent }, location,
    localStorage: memoryStorage(), sessionStorage: memoryStorage(),
    setTimeout: (run, delay) => { const id = ++timerId; timers.set(id, { run, at: clock + delay }); return id; },
    clearTimeout: id => timers.delete(id), document,
    addEventListener: events.addEventListener.bind(events),
    history: { replaceState: (_state, _title, url) => {
      const next = new URL(url, location.origin);
      location.pathname = next.pathname; location.search = next.search; location.hash = next.hash;
    } },
    testNet: {},
  };
  vm.runInNewContext(bundled.outputFiles[0].text, context);
  const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const advance = async ms => {
    const until = clock + ms;
    for (let turns = 0; turns < 100; turns++) {
      const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) { clock = until; return; }
      timers.delete(due[0]); clock = due[1].at; due[1].run(); await settle();
    }
    assert.fail('동기화 재시도가 끝나지 않는다');
  };
  return { ...module.exports, location, context, advance, settle, events, document, timers };
}

test('다른 브라우저에서 온 URL의 carry는 현재 기록을 자동으로 바꾸지 않는다', () => {
  const { profile, login, location } = browser();
  profile.saveMe({ name: '내 기록', pick: [0, 0, 0, 0], at: 100 });
  const payload = { me: { name: '링크가 넣은 기록', pick: [1, 1, 1, 1], at: 200 }, home: { id: 'AttackerHome1', key: 'attacker-key' } };
  location.hash = `#${new URLSearchParams({ go: 'google', carry: login.packCarry(payload) })}`;

  login.arrivedFromKakao();

  assert.equal(profile.exportSave().me.name, '내 기록');
  assert.equal(profile.loadHome(), undefined, '주소에 든 개인 방명록 열쇠를 받아들이지 않는다');
});

test('카톡 밖으로 이어갈 진행을 보내되 로그인·방명록 열쇠는 URL에 싣지 않는다', () => {
  const { profile, login, location } = browser('KAKAOTALK');
  profile.saveHome({ id: 'PrivateHome1', key: 'private-key' });
  profile.saveLogin({ provider: 'kakao', key: 'a'.repeat(32) });
  profile.saveMe({ name: '카톡 이름', pick: [0, 0, 0, 0], at: 100 });
  profile.saveTown('a'.repeat(profile.TOWN_IDS.length), { type: '101' });

  assert.equal(login.start('google', { back: 'hub:region' }), true);

  const external = new URL(location.href).searchParams.get('url');
  const hash = new URLSearchParams(new URL(external).hash.slice(1));
  assert.equal(hash.get('go'), 'google');
  assert.equal(hash.has('carry'), true);
  const carried = JSON.parse(Buffer.from(hash.get('carry'), 'base64').toString('utf8'));
  assert.equal(carried.me.name, '카톡 이름');
  assert.equal(carried.last.type, '101');
  assert.equal(carried.home, undefined);
  assert.equal(carried.login, undefined);
  assert.equal(carried.key, undefined);
});

function arriveWithProgress(runtime) {
  const { profile, login, context, location } = runtime;
  const future = Date.now() + 86_400_000;
  const carried = {
    me: { name: '카톡 이름', pick: [1, 1, 1, 1], at: future },
    last: { town: 'a'.repeat(profile.TOWN_IDS.length), type: '101', at: future },
    region: '1124000', regionAt: future, stamps: { walk: future },
    coins: { n: 123, at: future, day: 7, taken: [1] },
    home: { id: 'UntrustedHome1', key: 'untrusted-key' },
  };
  location.hash = `#${new URLSearchParams({ go: 'google', carry: login.packCarry(carried) })}`;
  assert.equal(login.arrivedFromKakao(), true);
  assert.equal(profile.loadLast(), undefined, '확인 전에 전달된 게임 결과가 기기에 들어오지 않는다');
  assert.equal(profile.loadHome(), undefined);
  const pending = JSON.parse(context.sessionStorage.getItem('budget-game-login-pending'));
  location.hash = `#id_token=proof&state=${pending.state}`;
  context.testNet.login = async proof => {
    assert.equal(proof.nonce, pending.state, '서버가 원래 요청의 nonce를 검증할 수 있게 넘긴다');
    return { key: 'a'.repeat(32), save: { me: { name: '서버 이름', pick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], at: 100 } }, admin: false };
  };
  return carried;
}

test('정상 로그인 뒤 가져온 이름·결과를 확인하고 승인하면 처음 끝낸 판을 이어간다', async () => {
  const runtime = browser();
  const { profile, login, context } = runtime;
  arriveWithProgress(runtime);
  const prompts = [];
  context.confirm = message => {
    prompts.push(message);
    assert.equal(profile.loadLast(), undefined, '확인창을 보이는 동안에도 합치지 않는다');
    return true;
  };
  let sent;
  context.testNet.saveMe = async (_key, save) => { sent = structuredClone(save); return { ok: true }; };

  assert.equal(await login.finish(), 'done');

  assert.equal(prompts.length, 1);
  assert.ok(prompts[0].includes('카톡 이름') && prompts[0].includes('결과'), '확인창에서 누구의 어떤 기록인지 알 수 있다');
  assert.equal(profile.loadLast()?.type, '101');
  assert.equal(profile.exportSave().me.name, '카톡 이름');
  assert.equal(sent.last.type, '101');
  assert.equal(sent.coins.n, 123);
  assert.equal(sent.home, undefined, '승인해도 주소로 받은 방명록 접근 열쇠는 합치지 않는다');
  for (const at of [sent.me.at, sent.last.at, sent.regionAt, sent.stamps.walk, sent.coins.at]) assert.ok(at <= Date.now(), '미래 시각은 진행 기록에 남기지 않는다');
});

for (const confirmation of [false, undefined]) test(`가져온 기록을 ${confirmation === false ? '거절하거나' : '확인할 수 없으면'} 계정에 합치지 않는다`, async () => {
  const runtime = browser();
  const { profile, login, context } = runtime;
  arriveWithProgress(runtime);
  if (confirmation === false) context.confirm = () => false;
  const sent = [];
  context.testNet.saveMe = async (_key, save) => { sent.push(structuredClone(save)); return { ok: true }; };

  assert.equal(await login.finish(), 'done');

  assert.equal(profile.exportSave().me.name, '서버 이름');
  assert.equal(profile.loadLast(), undefined);
  assert.ok(sent.every(save => !save.last && !save.coins && !save.home), '거절한 기록을 서버에 보내지 않는다');
});

test('로그인 검증이 실패하면 전달 기록을 확인하거나 합치지 않는다', async () => {
  const runtime = browser();
  const { profile, login, context } = runtime;
  arriveWithProgress(runtime);
  context.testNet.login = async () => undefined;
  let asked = false;
  context.confirm = () => { asked = true; return true; };

  assert.equal(await login.finish(), 'failed');

  assert.equal(asked, false);
  assert.equal(profile.loadLast(), undefined);
  assert.equal(profile.loadLogin(), undefined);
});

test('서버 저장에 실패한 최신 지역 선택은 이전 서버 기록을 합쳐도 남는다', () => {
  const { profile } = browser();
  profile.saveRegion('1124000');

  profile.importSave({ region: '2600000', regionAt: 100 });

  assert.equal(profile.loadRegion(), '1124000');
});

test('같은 서버 기록을 다시 합쳐도 변경 알림이 생기지 않는다', () => {
  const { profile } = browser();
  profile.saveMe({ name: '내 기록', pick: [0, 0, 0, 0], at: 100 });
  profile.saveHome({ id: 'PrivateHome1', key: 'private-key' });
  const snapshot = profile.exportSave();
  let changes = 0;
  profile.onWrite(() => changes++);

  profile.importSave(snapshot);

  assert.equal(changes, 0);
});

test('실패한 자동 저장은 추가 조작 없이 다시 보내 지역 선택을 보존한다', async () => {
  const { profile, login, context, settle, advance } = browser();
  profile.saveLogin({ provider: 'kakao', key: 'a'.repeat(32) });
  context.testNet.me = async () => ({ save: profile.exportSave(), admin: false });
  let calls = 0, remote;
  context.testNet.saveMe = async (_key, save) => {
    if (++calls === 1) return undefined;
    remote = structuredClone(save); return { ok: true };
  };
  login.keepSynced(); await settle();

  profile.saveRegion('1124000');
  await advance(60_000);

  assert.equal(remote?.region, '1124000');
});

test('연결 실패의 자동 재시도는 멈추고 온라인 복구 때 최신 기록을 다시 보낸다', async () => {
  const { profile, login, context, settle, advance, events, timers } = browser();
  profile.saveLogin({ provider: 'kakao', key: 'a'.repeat(32) });
  context.testNet.me = async () => ({ save: profile.exportSave(), admin: false });
  let calls = 0, reachable = false, remote;
  context.testNet.saveMe = async (_key, save) => {
    calls++;
    if (!reachable) return undefined;
    remote = structuredClone(save); return { ok: true };
  };
  login.keepSynced(); await settle(); profile.saveRegion('1124000');
  await advance(600_000);
  assert.ok(calls >= 2 && calls <= 4, `실패 호출 ${calls}회`);
  assert.equal(timers.size, 0, '자동 재시도 한도 뒤에는 타이머를 남기지 않는다');

  reachable = true; events.dispatchEvent(new Event('online')); await settle();

  assert.equal(remote?.region, '1124000');
});

test('저장 요청 중 새 선택과 즉시 저장이 겹쳐도 요청을 겹치지 않고 최신 선택을 보낸다', async () => {
  const { profile, login, context, settle, advance } = browser();
  profile.saveLogin({ provider: 'kakao', key: 'a'.repeat(32) });
  context.testNet.me = async () => ({ save: profile.exportSave(), admin: false });
  const pending = [];
  let active = 0, maxActive = 0, remote;
  context.testNet.saveMe = (_key, save) => {
    active++; maxActive = Math.max(maxActive, active);
    return new Promise(resolve => pending.push(() => { active--; remote = structuredClone(save); resolve({ ok: true }); }));
  };
  login.keepSynced(); await settle(); profile.saveRegion('1124000'); await advance(1500);
  profile.saveRegion('2600000');
  const immediate = login.syncNow(); await settle();
  assert.equal(maxActive, 1);
  pending.shift()(); await settle();
  assert.equal(pending.length, 1, '앞선 저장이 끝난 뒤 최신 기록을 보낸다');
  pending.shift()(); await immediate; await advance(60_000);

  assert.equal(remote.region, '2600000');
  assert.equal(active, 0);
});

test('기존 로그인도 서버가 확인한 관리자 여부를 새로 반영한다', async () => {
  const { profile, login, context, settle } = browser();
  profile.saveLogin({ provider: 'kakao', key: 'a'.repeat(32), admin: true });
  context.testNet.me = async () => ({ save: {}, admin: false });
  login.keepSynced(); await settle();

  assert.equal(login.admin(), false);
  assert.equal(profile.exportSave().admin, undefined, '권한은 게임 기록에 넣지 않는다');
});

test('로그인 직후 기록을 올리는 동안 자동 저장이 중복으로 전송되지 않는다', async () => {
  const { profile, login, context, location, settle, advance } = browser();
  profile.saveMe({ name: '이 기기 기록', pick: [0, 0, 0, 0], at: 100 });
  profile.addStamp('walk', 100);
  context.testNet.login = async () => ({ key: 'a'.repeat(32), save: { me: { name: '서버 기록', pick: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], at: 200 } }, admin: false });
  const pending = [];
  context.testNet.saveMe = () => new Promise(resolve => pending.push(resolve));
  login.keepSynced();
  context.sessionStorage.setItem('budget-game-login-pending', JSON.stringify({ provider: 'google', state: 'login-state' }));
  location.hash = '#id_token=proof&state=login-state';

  const finishing = login.finish(); await settle(); await advance(1500);

  assert.equal(pending.length, 1);
  pending.shift()({ ok: true });
  assert.equal(await finishing, 'done');
});
