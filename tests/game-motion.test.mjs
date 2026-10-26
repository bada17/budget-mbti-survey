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
  stdin: { contents: 'export { playOutcome } from "./game/draw.ts"; export { JourneyScene } from "./game/scenes/JourneyScene.ts"; export { VillageScene } from "./game/scenes/VillageScene.ts";', resolveDir: fileURLToPath(new URL('..', import.meta.url)) },
  bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'motion-renderer', setup(b) {
    b.onResolve({ filter: /^phaser$|\/sfx$/ }, a => ({ path: a.path, namespace: 'motion-renderer' }));
    b.onLoad({ filter: /.*/, namespace: 'motion-renderer' }, a => ({ contents: a.path === 'phaser' ? 'export default {Scene:class {},Cameras:{Scene2D:{Events:{FADE_OUT_COMPLETE:"camerafadeoutcomplete",FADE_IN_COMPLETE:"camerafadeincomplete"}}}};' : 'export const sfx=new Proxy({},{get:()=>()=>{}});' }));
  } }],
});

function renderer() {
  const media = { matches: false }, exports = {}, texts = [];
  const context = { module: { exports }, exports, matchMedia: () => media, console };
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

test('rain은 고른 자리 안에서만 내려오고 두 아이콘 모두 방을 나갈 때 지울 수 있다', () => {
  clock(advance => {
    for (const [id, key] of [['C-H1', 'b'], ['C-T2', 'a']]) {
      const r = renderer(), room = layoutRoom(375, 635), spot = room.residents.left;
      const made = r.playOutcome(r.scene, OUTCOMES[id][key], { spot, room, dpr: 3, reduced: false, seed: id });
      assert.equal(made.length, 4, '방 전체에 열두 개를 흩뿌리지 않는다');
      const previous = new Map(made.map(o => [o, o.y]));
      const start = new Map(previous), intermediate = new Set();
      for (let t = 0; t < 1200; t += 16) {
        advance(16); r.scene.tweens.tick();
        for (const drop of made) {
          assert.ok(drop.y >= previous.get(drop) - 0.001, '착지 후 위로 튀지 않는다');
          assert.ok(drop.y - start.get(drop) <= 48, '짧은 거리만 내려온다');
          if (drop.y > start.get(drop) && drop.y < start.get(drop) + 36) intermediate.add(drop);
          previous.set(drop, drop.y);
        }
      }
      assert.equal(intermediate.size, made.length, '모두 중간 위치를 거친다 — 1ms 순간 이동도 잡는다');
      assert.ok(made.every(drop => Math.abs(drop.x - spot.x) <= 40 && drop.y < room.residents.left.y), '효과는 고른 쪽 벽 앞에 모인다');
      made.forEach(drop => drop.destroy());
      assert.ok(r.texts.every(drop => !drop.active), '남은 돈주머니·편지가 없어야 한다');
    }
  });
});

test('rain의 정지 모습은 build와 비슷한 그림 면적이고 축소 모드에서 트윈이 없다', () => {
  const r = renderer(), room = layoutRoom(375, 635), at = { spot: room.residents.right, room, dpr: 3, reduced: true, seed: 'still' };
  const rain = r.playOutcome(r.scene, OUTCOMES['C-H1'].b, at);
  const built = r.playOutcome(r.scene, OUTCOMES['C-H1'].a, at);
  const area = rain.reduce((sum, o) => sum + o.size ** 2, 0), buildArea = built[0].size ** 2;
  assert.ok(area >= buildArea * 0.9 && area <= buildArea * 1.1, '한쪽만 크게 보이지 않게 한다');
  assert.equal(r.scene.tweens.getTweens().length, 0);
  assert.ok(rain.every(o => o.active && o.alpha === 1));
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
