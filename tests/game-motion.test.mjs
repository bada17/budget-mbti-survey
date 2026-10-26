import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import EventEmitter from 'eventemitter3';
import TweenManager from '../node_modules/phaser/src/tweens/TweenManager.js';
import Fade from '../node_modules/phaser/src/cameras/2d/effects/Fade.js';
import { layoutRoom } from '../game/room.ts';
import { OUTCOMES } from '../game/outcomes.ts';

// 그림·소리만 대신하고 playOutcome·카메라 전환·Phaser 트윈은 실제로 실행한다.
const bundled = await build({
  stdin: { contents: 'export * from "./game/motion.ts"; export { playOutcome } from "./game/draw.ts"; export { JourneyScene } from "./game/scenes/JourneyScene.ts"; export { VillageScene } from "./game/scenes/VillageScene.ts";', resolveDir: fileURLToPath(new URL('..', import.meta.url)) },
  bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'motion-renderer', setup(b) {
    b.onResolve({ filter: /^phaser$|\/sfx$/ }, a => ({ path: a.path, namespace: 'motion-renderer' }));
    b.onLoad({ filter: /.*/, namespace: 'motion-renderer' }, a => ({ contents: a.path === 'phaser' ? 'export default {Scene:class {},Cameras:{Scene2D:{Events:{FADE_OUT_COMPLETE:"camerafadeoutcomplete",FADE_IN_COMPLETE:"camerafadeincomplete"}}}};' : 'export const sfx=new Proxy({},{get:()=>()=>{}});' }));
  } }],
});

function renderer(search = '', values = new Map()) {
  const media = { matches: false }, exports = {}, texts = [];
  const context = { module: { exports }, exports, matchMedia: () => media, location: { search }, URLSearchParams, console, localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } };
  vm.runInNewContext(bundled.outputFiles[0].text, context);
  const obj = (x = 0, y = 0) => ({
    x, y, alpha: 1, scale: 1, active: true,
    setOrigin() { return this; }, setDepth() { return this; }, setY(y) { this.y = y; return this; },
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
    lineStyle() { return this; }, strokeRect() { return this; }, lineBetween() { return this; },
    destroy() { this.active = false; },
  });
  const scene = { sys: { events: new EventEmitter() }, add: {
    text(x, y, text, style) { const made = { ...obj(x, y), text, size: parseFloat(style.fontSize) }; texts.push(made); return made; },
    graphics: () => obj(),
  } };
  scene.tweens = new TweenManager(scene); scene.tweens.start();
  return { ...context.module.exports, scene, media, texts };
}

function clock(run) {
  const realNow = Date.now;
  let now = 0;
  Date.now = () => now;
  try { run(ms => { now += ms; }); } finally { Date.now = realNow; }
}

test('rain은 원래 열두 개의 낙하·반동을 재생하고 정상 시간이 지난 뒤 사라진다', () => {
  clock(advance => {
    for (const [id, key] of [['C-H1', 'b'], ['C-T2', 'a']]) {
      const r = renderer(), room = layoutRoom(375, 635), spot = room.residents.left;
      const made = r.playOutcome(r.scene, OUTCOMES[id][key], { spot, room, dpr: 3, reduced: false, seed: id });
      assert.equal(made.length, 12, '애니메이션을 줄여 해결하지 않는다');
      const start = new Map(made.map(o => [o, o.y])), intermediate = new Set();
      for (let t = 0; t < 3500; t += 16) {
        advance(16); r.scene.tweens.tick();
        for (const drop of made) {
          if (drop.y > start.get(drop) && drop.y < room.residents.left.y) intermediate.add(drop);
        }
      }
      assert.equal(intermediate.size, made.length, '모두 중간 위치를 거친다 — 1ms 순간 이동도 잡는다');
      assert.ok(Math.max(...made.map(o => o.x)) - Math.min(...made.map(o => o.x)) > room.w * 0.6);
      assert.ok(made.every(drop => !drop.active), '원래의 페이드아웃까지 실제 실행한다');
    }
  });
});

test('명시적인 움직임 줄이기에서는 열두 개의 정지 모습과 정리 경로를 유지한다', () => {
  const r = renderer(), room = layoutRoom(375, 635), at = { spot: room.residents.right, room, dpr: 3, reduced: true, seed: 'still' };
  const rain = r.playOutcome(r.scene, OUTCOMES['C-H1'].b, at);
  assert.equal(rain.length, 12);
  assert.equal(r.scene.tweens.getTweens().length, 0);
  assert.ok(rain.every(o => o.active && o.alpha === 1 && o.y > room.wallY));
  rain.forEach(o => o.destroy());
  assert.ok(r.texts.every(o => !o.active));
});

test('걷기 장면은 페이지를 다시 열지 않아도 현재 움직임 설정으로 전환한다', () => {
  clock(advance => {
    const r = renderer(); r.media.matches = true;
    const s = new r.JourneyScene({ view: () => ({ dpr: 1 }) });
    const cam = { zoom: 1, scrollX: 0, scrollY: 0, setZoom(z) { this.zoom = z; } };
    s.cameras = { main: cam }; s.tweens = r.scene.tweens;
    r.media.matches = false;
    s.zoomTo({ z: 2, x: 0, y: 0 });
    for (let t = 0; t < 200; t += 16) { advance(16); s.tweens.tick(); }
    assert.ok(cam.zoom > 1 && cam.zoom < 2, '꺼진 설정을 예전 true로 기억해 즉시 끝내면 안 된다');
    for (let t = 0; t < 600; t += 16) { advance(16); s.tweens.tick(); }
    r.media.matches = true;
    s.zoomTo({ z: 3, x: 0, y: 0 });
    for (let t = 0; t < 64; t += 16) { advance(16); s.tweens.tick(); }
    assert.equal(cam.zoom, 3, '다시 켜면 큰 이동을 생략한다');
  });
});

test('방을 떠나거나 다시 깔면 남은 결과의 트윈도 더 움직이지 않는다', () => {
  clock(advance => {
    const r = renderer(), s = new r.JourneyScene({});
    const drop = { y: 0, active: true, destroy() { this.active = false; } };
    s.art = { destroy() {} }; s.tweens = r.scene.tweens; s.outcome = [drop];
    s.tweens.add({ targets: drop, y: 100, duration: 620 });
    for (let t = 0; t < 160; t += 16) { advance(16); s.tweens.tick(); }
    assert.ok(drop.y > 0 && drop.y < 100);
    s.dropRoom();
    const stopped = drop.y;
    for (let t = 0; t < 160; t += 16) { advance(16); s.tweens.tick(); }
    assert.equal(drop.active, false);
    assert.equal(drop.y, stopped, '지운 그림을 대상으로 트윈이 계속 실행되면 안 된다');
  });
});

test('페이드아웃 도중 움직임 줄이기를 켜도 두 장면의 화면 덮개가 남지 않는다', () => {
  for (const kind of ['JourneyScene', 'VillageScene']) {
    const r = renderer(), s = new r[kind]({});
    const cam = new EventEmitter();
    cam.fadeEffect = new Fade(cam);
    cam.fadeOut = ms => cam.fadeEffect.start(true, ms);
    cam.fadeIn = ms => cam.fadeEffect.start(false, ms);
    cam.centerOn = () => {};
    s.cameras = { main: cam }; s.player = { place() {} };
    let done = 0;
    if (kind === 'JourneyScene') s.fade(true, () => s.fade(false, () => done++));
    else s.jumpTo({ x: 100, y: 200 }, () => done++);
    cam.fadeEffect.update(80, 80);
    r.media.matches = true;
    cam.fadeEffect.update(330, 250);
    assert.equal(done, 1, `${kind}: 전환 완료는 한 번만`);
    assert.equal(cam.fadeEffect.postRenderWebGL(), false, `${kind}: 화면을 계속 덮으면 안 된다`);
  }
});

test('진단용 전체 모션 시험은 축소 신호에서도 원래 시간으로 재생하고 일반 주소에는 적용되지 않는다', () => {
  for (const [search, full] of [['?motiontrace=test&motionprobe=full', true], ['?motionprobe=full', false]]) {
    clock(advance => {
      const r = renderer(search); r.media.matches = true;
      const s = new r.JourneyScene({ view: () => ({ dpr: 1 }) });
      const cam = { zoom: 1, scrollX: 0, scrollY: 0, setZoom(z) { this.zoom = z; } };
      s.cameras = { main: cam }; s.tweens = r.scene.tweens;
      s.zoomTo({ z: 2, x: 0, y: 0 });
      for (let t = 0; t < 200; t += 16) { advance(16); s.tweens.tick(); }
      if (full) assert.ok(cam.zoom > 1 && cam.zoom < 2, '진단 대조판은 실제 중간 프레임을 만든다');
      else assert.equal(cam.zoom, 2, '일반 접속에서는 기기의 축소 선호를 보존한다');
    });
  }
});

test('사용자가 애니메이션 켜기를 고르면 기기의 true 신호보다 우선하며 다시 자동으로 돌아갈 수 있다', () => {
  const values = new Map(), r = renderer('', values); r.media.matches = true;
  assert.equal(typeof r.setMotionPreference, 'function');
  assert.equal(r.prefersReducedMotion(), true);
  r.setMotionPreference('full');
  assert.equal(r.prefersReducedMotion(), false);
  const reopened = renderer('', values); reopened.media.matches = true;
  assert.equal(reopened.prefersReducedMotion(), false, '다시 방문해도 명시한 선택을 기억한다');
  reopened.setMotionPreference('system');
  assert.equal(reopened.prefersReducedMotion(), true, '기기의 축소 선호를 다시 따를 수 있다');
  reopened.media.matches = false;
  assert.equal(reopened.prefersReducedMotion(), false);
});
