// 방 배치·걷기 규칙(game/room.ts)과 진행 신호(game/events.ts). 그림 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutRoom, step, passedDoor, nearest, alongTrail, rollBall, roomFence } from '../game/room.ts';
import { createEvents } from '../game/events.ts';
import { FEEL } from '../game/feel.ts';

const walk = (room, from, dir, open, frames = 400, solid = []) => {
  let p = from;
  for (let i = 0; i < frames && !passedDoor(p, room); i++) p = step(p, dir, FEEL.walkSpeed, 16, room, open, solid);
  return p;
};

test('배치: 작은 폰부터 큰 폰까지 주민·입구가 벽 아래 화면 안에 있다', () => {
  for (const [w, h] of [[360, 560], [360, 640], [390, 844], [430, 932], [480, 900]]) {
    const room = layoutRoom(w, h);
    for (const side of ['left', 'right']) {
      const r = room.residents[side];
      assert.ok(r.y - 56 - 90 > room.wallY - 60, `${w}x${h} 말풍선 자리`);
      assert.ok(r.x > 40 && r.x < w - 40);
    }
    assert.ok(room.residents.left.x < room.residents.right.x);
    assert.ok(room.spawn.y > room.residents.left.y + FEEL.leaveRadius, `${w}x${h} 들어오자마자 대화가 열리면 안 됨`);
    assert.ok(room.spawn.y < room.floor);
  }
});

test('문: 닫혀 있으면 못 나가고, 열리면 한가운데로든 옆에서 밀든 나간다', () => {
  const room = layoutRoom(360, 640);
  const closed = walk(room, room.spawn, { x: 0, y: -1 }, false);
  assert.ok(!passedDoor(closed, room) && closed.y >= room.wallY);
  assert.ok(passedDoor(walk(room, room.spawn, { x: 0, y: -1 }, true), room));
  // GPT 판에서 걸렸던 자리: 문 옆 벽에 붙어 위로만 밀면 문으로 미끄러져 나가야 한다.
  for (const x of [20, 90, 270, 340]) {
    const p = walk(room, { x, y: room.wallY + 40 }, { x: 0, y: -1 }, true);
    assert.ok(passedDoor(p, room), `x=${x} 에서 위로 밀었는데 못 나감`);
  }
  // 문 옆 벽 위쪽을 손가락으로 누르고 있을 때(위로 비스듬히): 문틀에서 들락날락하지 않고 나간다.
  for (const sx of [-1, 1]) {
    const p = walk(room, { x: room.door.x + sx * 60, y: room.wallY + 30 }, { x: sx * 0.9, y: -0.43 }, true);
    assert.ok(passedDoor(p, room), `비스듬히 ${sx} 쪽으로 밀었는데 못 나감`);
  }
});

test('걷기: 대각선도 같은 속도, 긴 프레임은 잘리고, 이상한 값은 무시', () => {
  const room = layoutRoom(360, 640), at = { x: 180, y: 500 };
  const straight = step(at, { x: 1, y: 0 }, 100, 16, room, false);
  const diagonal = step(at, { x: 1, y: 1 }, 100, 16, room, false);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 180, diagonal.y - 500) - (straight.x - 180)) < 1e-9);
  assert.ok(500 - step(at, { x: 0, y: -1 }, 100, 60000, room, false).y <= 100 * FEEL.maxDeltaMs / 1000 + 1e-9);
  for (const bad of [{ x: NaN, y: 0 }, { x: 0, y: 0 }]) assert.deepEqual(step(at, bad, 100, 16, room, false), at);
  assert.deepEqual(step(at, { x: 1, y: 0 }, 100, -5, room, false), at);
  const edge = walk(room, at, { x: -1, y: 1 }, false);
  assert.ok(edge.x >= 16 && edge.y <= room.floor);
});

test('주민: 몸을 뚫고 지나가지 않고, 가까이 간 쪽이 골라진다', () => {
  const room = layoutRoom(360, 640), r = room.residents.left;
  const p = walk(room, { x: r.x, y: r.y + 80 }, { x: 0, y: -1 }, false, 60, [r]);
  assert.ok(Math.hypot(p.x - r.x, p.y - r.y) >= 25.99);
  assert.equal(nearest(p, room, FEEL.meetRadius), 'left');
  assert.equal(nearest(room.spawn, room, FEEL.meetRadius), undefined);
  assert.equal(nearest(p, room, FEEL.meetRadius, ['right']), undefined);
});

test('따라오기: 지나온 길을 따라 정해진 간격만큼 뒤에 선다', () => {
  const trail = [{ x: 0, y: 100 }, { x: 0, y: 50 }, { x: 0, y: 0 }];
  assert.deepEqual(alongTrail(trail, 20), { x: 0, y: 20 });
  assert.deepEqual(alongTrail(trail, 70), { x: 0, y: 70 });
  assert.deepEqual(alongTrail(trail, 500), { x: 0, y: 100 });
  assert.equal(alongTrail([], 10), undefined);
});

test('신호: 연출 하나가 깨져도 다른 구독은 계속 받는다', () => {
  const errors = [];
  const bus = createEvents(error => errors.push(error));
  bus.subscribe(() => { throw new Error('effect failed'); });
  let count = 0;
  const stop = bus.subscribe(event => { assert.ok(Object.isFrozen(event)); count++; });
  bus.emit([{ type: 'stage.entered', stageId: 1, area: '동네 입구' }]);
  assert.equal(count, 1);
  assert.equal(errors.length, 1);
  stop();
  bus.emit([{ type: 'stage.entered', stageId: 2, area: '학교 가는 길' }]);
  assert.equal(count, 1);
});

test('공: 발에 닿으면 반대쪽으로 차이고, 방 밖으로 안 나가고, 결국 선다', () => {
  const room = layoutRoom(360, 640);
  const ball = { at: { x: 100, y: room.floor - 40 }, v: { x: 0, y: 0 } };
  assert.equal(rollBall(ball, { x: 90, y: ball.at.y }, 16, roomFence(room)), true, '닿으면 찬다');
  assert.ok(ball.v.x > 0, '발 반대쪽(오른쪽)으로');
  assert.equal(rollBall(ball, { x: 90, y: ball.at.y }, 16, roomFence(room)), false, '멀어지는 공은 또 차지 않는다');
  // 벽 쪽으로 세게 차도 방 안에 남고, 몇 초 뒤엔 멈춘다.
  const wall = { at: { x: room.w - 30, y: room.wallY + 30 }, v: { x: 0, y: 0 } };
  rollBall(wall, { x: room.w - 40, y: room.wallY + 40 }, 16, roomFence(room));
  for (let i = 0; i < 400; i++) {
    rollBall(wall, { x: -999, y: -999 }, 16, roomFence(room));
    assert.ok(wall.at.x >= 16 && wall.at.x <= room.w - 16 && wall.at.y >= room.wallY && wall.at.y <= room.floor, `방 안 (${i})`);
  }
  assert.deepEqual(wall.v, { x: 0, y: 0 }, '멈춘다');
});
