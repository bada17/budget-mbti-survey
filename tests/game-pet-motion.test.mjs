import test from 'node:test';
import assert from 'node:assert/strict';
const motion=await import('../game/review/round/pet-motion.ts').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return undefined;throw error;
});
test('pets rest between grooming and a short walk that returns home',()=>{
  assert.ok(motion,'pet motion is not implemented yet');
  for(const kind of ['cat','dog']){
    assert.equal(motion.petPoseAt(0,kind,false).action,'idle');
    assert.equal(motion.petPoseAt(6000,kind,false).action,'groom');
    assert.equal(motion.petPoseAt(9000,kind,false).action,'idle');
    assert.equal(motion.petPoseAt(12000,kind,false).action,'walk');
    assert.equal(motion.petPoseAt(15000,kind,false).dx,0);
    const peak=motion.petPoseAt(13000,kind,false);
    assert.equal(peak.dx,kind==='cat'?14:-14);
    for(let time=0;time<36000;time+=83)assert.ok(Math.abs(motion.petPoseAt(time,kind,false).dx)<=14);
  }
});
test('grooming lifts a paw, walking alternates feet, reduced motion stays still',()=>{
  assert.ok(motion,'pet motion is not implemented yet');
  for(const kind of ['cat','dog']){
    const groom=motion.petPoseAt(6000,kind,false);
    assert.ok(groom.groom>.9);assert.ok(groom.pawY < -15);
    const walk=motion.petPoseAt(12090,kind,false);
    assert.notEqual(walk.leftFoot,walk.rightFoot);
    for(const time of [0,6000,12090,19000]){
      assert.deepEqual(motion.petPoseAt(time,kind,true),motion.petPoseAt(0,kind,true));
    }
  }
});
