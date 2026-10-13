import assert from 'node:assert/strict';
import test from 'node:test';
import { movePlayer, WORLD, residentPosition } from '../game/world.ts';
import { createEvents } from '../game/events.ts';
import { FEEL } from '../game/feel.ts';

test('movement normalizes diagonals, clamps long frames, and cannot skip a meeting', () => {
  const start = { x: 180, y: 1000 };
  const straight = movePlayer(start, { x: 1, y: 0 }, 16, 0);
  const diagonal = movePlayer(start, { x: 1, y: 1 }, 16, 0);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 180, diagonal.y - 1000) - (straight.x - 180)) < 1e-8);
  const resumed = movePlayer(start, { x: 0, y: -1 }, 60000, 0);
  assert.ok(start.y - resumed.y <= FEEL.walkSpeed * FEEL.maxDeltaMs / 1000 + 1e-8);
  let player = start;
  for (let i = 0; i < 1000; i++) player = movePlayer(player, { x: -1, y: -1 }, 16, 0);
  assert.ok(player.x >= WORLD.margin);
  assert.ok(player.y >= WORLD.stops[0] - WORLD.gateBeforeAnswer);
  assert.ok(residentPosition(0, 'left').x < residentPosition(0, 'right').x);
});

test('zero, non-finite, and backward frame input cannot corrupt position', () => {
  const start = { x: 180, y: 1000 };
  assert.deepEqual(movePlayer(start, { x: 0, y: 0 }, 16, 0), start);
  assert.deepEqual(movePlayer(start, { x: NaN, y: 0 }, 16, 0), start);
  assert.deepEqual(movePlayer(start, { x: 1, y: 0 }, -1, 0), start);
});

test('effects can fail or unsubscribe without suppressing other progress notifications', () => {
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
  bus.clear();
  bus.emit([{ type: 'stage.entered', stageId: 3, area: '골목' }]);
  assert.equal(errors.length, 2);
});
