import test from 'node:test';
import assert from 'node:assert/strict';
import {petPoseAt} from '../game/review/round/pet-motion.ts';

test('pets groom and rest without leaving their original spot',()=>{
  for(const kind of ['cat','dog']){
    assert.equal(petPoseAt(0,kind,false).action,'idle');
    assert.equal(petPoseAt(6000,kind,false).action,'groom');
    assert.equal(petPoseAt(9000,kind,false).action,'idle');
    for(let time=0;time<36000;time+=83)assert.equal(petPoseAt(time,kind,false).dx,0);
  }
});
test('grooming lifts a paw and reduced motion holds a neutral seated pose',()=>{
  for(const kind of ['cat','dog']){
    const groom=petPoseAt(6000,kind,false);
    assert.ok(groom.groom>.9);assert.ok(groom.pawY < -9);
    assert.notEqual(petPoseAt(0,kind,false).tailAngle,petPoseAt(1000,kind,false).tailAngle);
    for(const time of [0,6000,12090,19000]){
      assert.deepEqual(petPoseAt(time,kind,true),petPoseAt(0,kind,true));
    }
  }
});
