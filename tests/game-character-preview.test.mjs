import test from 'node:test';
import assert from 'node:assert/strict';
import { FEEL } from '../game/feel.ts';
const model = await import('../game/review/characters/model.ts').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return undefined;
  throw error;
});
test('12 examples vary haircut and garment shapes independently', () => {
  assert.ok(model, 'character preview model is not implemented yet');
  assert.equal(model.PRESETS.length, 12);
  assert.ok(model.PRESETS.every(model.isLook));
  assert.equal(new Set(model.PRESETS.map(look => look.hair)).size, 8);
  assert.equal(new Set(model.PRESETS.map(look => look.top)).size, 8);
  assert.equal(new Set(model.PRESETS.map(look => `${look.hair}:${look.top}:${look.bottom}`)).size, 12);
});
test('corrupted saved choices cannot select nonexistent parts', () => {
  assert.ok(model, 'character preview model is not implemented yet');
  const good = model.PRESETS[0];
  for (const value of [null, [], {...good,hair:8}, {...good,top:-1}, {...good,skin:NaN}, {...good,face:'1'}, {...good,glasses:'false'}]) {
    assert.equal(model.isLook(value), false);
  }
  assert.equal(model.readLook('bad json'), undefined);
  assert.deepEqual(model.readLook(JSON.stringify(good)), good);
});
test('motion gives alternating feet and leaves reduced-motion characters still', () => {
  assert.ok(model, 'character preview model is not implemented yet');
  const first = model.poseAt(0, true, false), next = model.poseAt(130, true, false);
  assert.notDeepEqual(first, next);
  assert.notEqual(next.leftFoot, next.rightFoot);
  assert.deepEqual(model.poseAt(0, true, true), model.poseAt(130, true, true));
});
test('walking keeps arms still and uses the original game step and bounce', () => {
  assert.ok(model);
  const pose=model.poseAt(FEEL.stepMs/4,true,false);
  assert.equal(pose.arm,0);
  assert.equal(pose.leftFoot,-3);
  assert.equal(pose.rightFoot,0);
  assert.equal(pose.bob,-FEEL.bobPx);
});
