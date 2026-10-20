import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// DOM·Phaser 렌더러만 대신한다. 실제 화면 함수와 장면의 배치·닫기·도장 갱신을 실행한다.
class Node {
  constructor(tag = '', text = '') { this.tagName = tag; this.children = []; this.text = text; this.className = ''; this.style = { setProperty() {} }; this.attrs = {}; this.hidden = false; this.dataset = {}; }
  get classList() { return { contains: c => this.className.split(/\s+/).includes(c), add: (...cs) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...cs])].join(' '); }, remove: (...cs) => { this.className = this.className.split(/\s+/).filter(c => !cs.includes(c)).join(' '); }, toggle: (c, force) => { const on = force ?? !this.classList.contains(c); this.classList[on ? 'add' : 'remove'](c); return on; } }; }
  append(...nodes) { for (const n of nodes) { const child = typeof n === 'string' ? new Node('', n) : n; child.remove(); child.parentElement = this; this.children.push(child); } }
  replaceChildren(...nodes) { this.children.forEach(n => { n.parentElement = undefined; }); this.children = []; this.text = ''; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = undefined; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = v; }
  getAttribute(k) { return k === 'class' ? this.className : this.attrs[k] ?? null; }
  get textContent() { return this.text + this.children.map(n => n.textContent).join(''); }
  set textContent(text) { this.replaceChildren(); this.text = String(text); }
  set innerHTML(html) {
    this.replaceChildren(); const stack = [this];
    for (const part of html.matchAll(/<\/?[\w-]+[^>]*>|[^<]+/g)) {
      const s = part[0]; if (s.startsWith('</')) { stack.pop(); continue; }
      if (!s.startsWith('<')) { stack.at(-1).append(new Node('', s)); continue; }
      const tag = /^<([\w-]+)/.exec(s)[1], n = new Node(tag);
      for (const a of s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) { if (a.index === 1) continue; n.setAttribute(a[1], a[2] ?? ''); if (a[1] === 'hidden') n.hidden = true; }
      stack.at(-1).append(n); if (!['input', 'br', 'img', 'hr', 'path'].includes(tag) && !s.endsWith('/>')) stack.push(n);
    }
  }
  matches(selector) { const tag = selector.match(/^[\w-]+/)?.[0]; return (!tag || this.tagName === tag) && [...selector.matchAll(/\.([\w-]+)/g)].every(m => this.classList.contains(m[1])) && [...selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)].every(m => m[2] === undefined ? this.getAttribute(m[1]) !== null : this.getAttribute(m[1]) === m[2]); }
  querySelectorAll(selector) { const nodes = this.children.flatMap(n => [n, ...n.querySelectorAll('*')]); return nodes.filter(n => selector === '*' || n.matches(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  focus() {}
  getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, width: 360, height: 760, bottom: 760, right: 360 }; }
}

const bundled = await build({
  stdin: { contents: 'export { createUI } from "./game/ui.ts"; export { openTown, loginBox } from "./game/town.ts"; export { openWorks, openCounsel } from "./game/places.ts"; export { JourneyScene } from "./game/scenes/JourneyScene.ts"; export * as profile from "./game/profile.ts"; export { orderedQuestions } from "./game/response.ts"; export { setMuted } from "./game/sfx.ts"; export { useInspectionStorage } from "./game/storage.ts";', resolveDir: fileURLToPath(new URL('..', import.meta.url)) },
  bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env': '{"DEV":true}' },
  plugins: [{ name: 'renderer-boundaries', setup(b) {
    b.onResolve({ filter: /\.css$|\?raw$|^phaser$|^html-to-image$|^\.\.\/draw$/ }, a => ({ path: a.path, namespace: 'runtime-boundary' }));
    b.onLoad({ filter: /.*/, namespace: 'runtime-boundary' }, a => {
      if (a.path === 'phaser') return { contents: 'export default {Scene:class {constructor(){Object.assign(this,globalThis.sceneRenderer)}}};' };
      if (a.path === '../draw') return { contents: 'export const {textRes,Dude,lookFrom,toLook,drawRoom,drawHill,drawPortal,PORTAL,drawBus,playOutcome,drawTwist,ball,hearts,dust,tapRing,confetti,flee,meow,sparkle,DAYLIGHT}=globalThis.testDraw;' };
      if (a.path === 'html-to-image') return { contents: 'export const toBlob=globalThis.captureCard;' };
      return { contents: 'export default "";' };
    });
  } }],
});

function browser(capture) {
  const values = new Map(), events = new Map(), timers = [];
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };
  const document = { createElement: tag => new Node(tag), createTextNode: s => new Node('', s), body: new Node('body'), fonts: { ready: Promise.resolve() } };
  const captures = [], shared = [], requests = [], runtimeModule = { exports: {} };
  const history = { length: 2, pushState() { this.length++; }, back() { this.length--; for (const fn of events.get('popstate') ?? []) fn(); } };
  const obj = (x = 0, y = 0) => ({ x, y, active: true, setPosition(x, y) { this.x = x; this.y = y; return this; }, setScale() { return this; }, setSize() { return this; }, setZoom() { return this; }, setDepth() { return this; }, setAlpha() { return this; }, destroy() { this.active = false; } });
  const context = { module: runtimeModule, exports: runtimeModule.exports, console, URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa, File, Blob, structuredClone, AbortController,
    localStorage: storage, sessionStorage: storage, document, history,
    navigator: { canShare: () => true, share: async ({ files }) => shared.push(await files[0].text()) },
    matchMedia: () => ({ matches: true }),
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {},
    captureCard: async card => { const text = card.textContent; captures.push(text); return capture ? capture(text) : new Blob([text], { type: 'image/png' }); },
    fetch: async (url, options = {}) => { requests.push({ url, method: options.method ?? 'GET' }); return { ok: false, text: async () => '', json: async () => ({ ok: false }) }; },
    FormData: class extends Map { constructor() { super([['pb-q', '점검용 질문'], ['pb-agree', 'on']]); } },
    testDraw: { PORTAL: { half: 30, height: 82 }, drawHill: (_scene, w, h) => ({ box: obj(), top: { x: w / 2, y: Math.round(h * .68) } }), DAYLIGHT: Array.from({ length: 6 }, () => [0, 0, 0]) },
    sceneRenderer: { cameras: { main: obj() } },
  };
  context.window = { addEventListener: (name, fn) => events.set(name, [...events.get(name) ?? [], fn]), setTimeout: context.setTimeout };
  vm.runInNewContext(bundled.outputFiles[0].text, context);
  const root = new Node('main'); document.body.append(root);
  return { ...runtimeModule.exports, context, root, history, captures, shared, requests, obj, flushTimers: () => { const pending = timers.splice(0); pending.forEach(fn => fn()); } };
}

test('마을 재방문 준비 실패는 소개판의 늦은 숨김 뒤에도 재시도 단추를 보여 준다', () => {
  const b = browser(), ui = b.createUI(b.root, {});
  ui.hideIntro(); ui.loadError(); b.flushTimers();
  const intro = b.root.querySelector('.g-intro');
  assert.equal(intro.hidden, false);
  assert.equal(intro.classList.contains('gone'), false);
  assert.equal(b.root.querySelector('.g-retry').hidden, false);
});

test('결과 설명과 다른 사람들 판은 뒤로 가기로 닫히며 닫기 단추의 기록도 남지 않는다', () => {
  const b = browser(), ui = b.createUI(b.root, {}), start = b.history.length;
  for (const open of [() => ui.others(undefined, {}), () => ui.why(Object.fromEntries(b.orderedQuestions.map(q => [q.id, 2])), { hands: 0, time: 0, reach: 0 })]) {
    open(); assert.equal(b.history.length, start + 1);
    b.history.back(); assert.equal(b.root.querySelector('.g-panel').hidden, true);
    open(); b.root.querySelector('.g-panel').querySelector('button').onclick();
    assert.equal(b.root.querySelector('.g-panel').hidden, true);
    assert.equal(b.history.length, start);
  }
});

test('늦게 받은 손님 도장이 발급 상태와 저장할 시민증 그림에 바로 반영된다', async () => {
  const b = browser(); b.profile.addStamp('walk', 100); b.profile.addStamp('invite', 200);
  let guests; const book = new Promise(resolve => { guests = resolve; });
  b.openTown(b.root, { me: { name: '나', pick: [0, 0, 0, 0], type: '000', town: Array(15).fill('a') }, book: () => book }, () => {});
  b.flushTimers(); await new Promise(setImmediate);
  assert.equal(b.root.querySelector('.t-card').classList.contains('pending'), true);
  guests([{ name: '친구', pick: [0, 0, 0, 0], type: '000', at: 300 }]);
  await new Promise(setImmediate); b.flushTimers(); await new Promise(setImmediate);
  const card = b.root.querySelector('.t-card');
  assert.equal(card.classList.contains('pending'), false);
  assert.equal(card.querySelector('.t-seal').textContent, '발급');
  assert.ok(card.querySelector('.t-issued').textContent.includes('3/4'));
  const save = b.root.querySelectorAll('button').find(n => n.textContent === '시민증 저장·보내기');
  assert.equal(save.hidden, false); await save.onclick();
  assert.ok(b.shared[0].includes('3/4'), '처음 찍은 발급 전 그림을 보내면 안 된다');
});

test('언덕 화면을 회전하면 캐릭터·출구·안내자와 충돌 영역이 새 화면 안에 남는다', () => {
  const b = browser(); const view = { w: 480, h: 328, dpr: 2 };
  const dude = (x, y) => ({ root: b.obj(x, y), x, y, place(p) { this.x = this.root.x = p.x; this.y = this.root.y = p.y; return this; }, look() {}, walk() {} });
  const ui = { endFree: () => ({ top: 114, bottom: 266 }), tags() {}, made() {} };
  const s = new b.JourneyScene({ view: () => view, ui, controls: { clear() {} }, name: () => '나' });
  Object.assign(s, { mode: 'hill', player: dude(180, 517), pos: { x: 180, y: 517 }, light: b.obj(), hillTop: { x: 180, y: 517 }, hillRoom: { w: 360, h: 760, wallY: 415, floor: 618, door: { x: 180, half: 30 } }, hillArt: b.obj(), hillSize: { w: 360, h: 760 }, portal: b.obj(180, 415), portalGlow: b.obj(180, 370), guide: { dude: dude(250, 425), tag: { text: '안내자', x: 250, y: 367 }, near: false }, tweens: { killTweensOf() {}, add() {} }, time: { delayedCall() {} } });
  s.relayout();
  assert.equal(s.hillRoom.w, 480); assert.equal(s.hillRoom.h, 328);
  assert.ok(s.pos.y > s.hillRoom.wallY && s.pos.y < 266);
  assert.ok(s.hillRoom.wallY - 82 >= 114 && s.hillRoom.wallY < s.pos.y);
  assert.equal(s.portal.x, s.hillRoom.door.x); assert.equal(s.portal.y, s.hillRoom.wallY);
  assert.ok(s.guide.dude.x < 480 && s.guide.dude.y < 266);
  assert.equal(s.guide.near, true, '회전 때문에 곁에 놓인 안내자가 갑자기 말을 걸어 이동을 막으면 안 된다');
});

test('점검 중 소리 설정은 실제 게임의 저장된 설정을 바꾸지 않는다', () => {
  const b = browser(); b.context.localStorage.setItem('budget-game-muted', '0');
  b.useInspectionStorage(); b.setMuted(true);
  assert.equal(b.context.localStorage.getItem('budget-game-muted'), '0');
});

test('공사터 동전 전송 중에는 같은 주머니의 액세서리를 살 수 없다', async () => {
  const b = browser(); let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const pocket = { day: '2026-10-20', taken: [], coins: 100, fruits: 0, given: 0, told: false, arcade: [] };
  b.openWorks(b.root, { total: 0, pocket, online: true, loggedIn: true, owned: () => [], pick: () => [0, 0, 0, 0], buy: () => true, give: () => pending, toTax() {} }, () => {});
  const find = text => b.root.querySelectorAll('button').find(n => n.textContent === text);
  const sending = find('동전 10개 넣기').onclick();
  try { assert.equal(find('동전 100개로 사기').disabled, true); }
  finally { finish({ failed: 'network' }); await sending; }
  assert.equal(find('동전 100개로 사기').disabled, false, '실패 후에는 다시 선택할 수 있다');
});

test('점검 상담소 질문은 외부 접수처에 POST하지 않는다', async () => {
  const b = browser(); b.useInspectionStorage(); b.openCounsel(b.root, () => {});
  await b.root.querySelector('form').onsubmit({ preventDefault() {} });
  assert.equal(b.requests.filter(r => r.method === 'POST').length, 0);
  assert.ok(b.root.querySelector('.g-result').textContent.includes('점검'));
});

test('점검에서 막힌 계정 전환은 점검을 끝낸 뒤 로그인하라고 안내한다', () => {
  const b = browser(); b.useInspectionStorage();
  const box = b.loginBox({ providers: ['google'], current() {}, admin: () => true, start: () => false }, '로그인');
  box.querySelector('.t-google').onclick();
  assert.ok(box.querySelector('[role="status"]').textContent.includes('점검을 끝낸 뒤 로그인'));
});

test('이전 시민증 그림이 늦게 완성돼도 새 발급 그림을 덮어쓰지 않는다', async () => {
  const done = [], b = browser(text => new Promise(resolve => done.push(() => resolve(new Blob([text])))));
  b.profile.addStamp('walk', 100); b.profile.addStamp('invite', 200);
  let guests; const book = new Promise(resolve => { guests = resolve; });
  b.openTown(b.root, { me: { name: '나', pick: [0, 0, 0, 0], type: '000', town: Array(15).fill('a') }, book: () => book }, () => {});
  b.flushTimers(); await new Promise(setImmediate);
  guests([{ name: '친구', pick: [0, 0, 0, 0], type: '000', at: 300 }]); await new Promise(setImmediate);
  done[1](); await new Promise(setImmediate);
  done[0](); await new Promise(setImmediate);
  await b.root.querySelectorAll('button').find(n => n.textContent === '시민증 저장·보내기').onclick();
  assert.ok(b.shared[0].includes('3/4'), '늦게 완성된 발급 전 2/4 그림을 보내면 안 된다');
});
