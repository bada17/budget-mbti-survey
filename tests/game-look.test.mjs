// 모습 값(10-15 저녁, GPT 승인 기준 본편 반영) — 열 칸 고른 번호, 옛 넷·다섯 칸 읽기, 기본 모습 고르기, 무작위·주민 모습. 화면 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { isPick, fullPick, withForm, toLook, randomPick, lookFrom, hairColor, wearing, PICK_SIZES, FORMS, HAIRS, HAIR_MENU, TOPS, REWARDS } from '../game/look.ts';

test('고른 번호: 열 칸과 옛 넷·다섯 칸만 받고, 칸마다 범위 안이어야 한다', () => {
  assert.equal(PICK_SIZES.length, 10);
  assert.ok(isPick([0, 0, 0, 0]) && isPick([11, 5, 10, 4, 5]), '옛 링크·옛 저장');
  assert.ok(!isPick([0, 6, 0, 0]), '옛 꼴의 머리 색은 여섯까지');
  assert.ok(isPick(fullPick([3, 1, 2, 1])));
  assert.ok(!isPick([0, 0, 0, 0, 0, 0]), '여섯 칸 같은 어중간한 꼴은 안 받는다');
  assert.ok(!isPick([...fullPick([0, 0, 0, 0]).slice(0, 9), HAIRS.length]), '섞는 색도 범위 안');
});

test('옛 꼴 읽기: 머리 모양·옷·안경은 그 모습 것, 흰머리는 색 넣기·섞는 색으로, 은발·백발은 머리색으로', () => {
  const look = toLook([5, 1, 3, 2]); // 둥근 파마·조끼(안경)
  assert.equal(look.style, FORMS[5].hair); assert.equal(look.top, FORMS[5].top); assert.equal(look.glasses, true);
  assert.equal(look.hair, HAIRS[1]); assert.equal(look.pattern, 'solid'); assert.equal(look.accessory, 'none');
  assert.equal(toLook([0, 0, 0, 0, 1]).pattern, 'streak');
  assert.equal(toLook([0, 0, 0, 0, 2]).pattern, 'mixed');
  assert.equal(toLook([0, 0, 0, 0, 4]).hair, 0xb9beca, '은발 → 은색');
  assert.equal(toLook([0, 0, 0, 0, 5]).hair, 0xeee9df, '백발 → 흰색');
  assert.equal(toLook([0, 0, 0, 0, 5]).pattern, 'solid');
});

test('기본 모습을 고르면 머리 모양·옷만 그 모습으로, 색·피부·안경·장식은 그대로(안경·장식은 보상, 10-17)', () => {
  const mine = fullPick([0, 9, 4, 3]);
  mine[8] = 2; mine[4] = 1; mine[9] = 13;
  const next = withForm(mine, 8); // 웨이브·니트(예전엔 안경을 씌웠다)
  assert.equal(TOPS[next[6]].value, 'knit'); assert.equal(next[7], 0, '안경은 기본 조합이 정하지 않는다');
  assert.deepEqual([next[1], next[2], next[3], next[4], next[8], next[9]], [9, 4, 3, 1, 2, 13]);
  assert.equal(withForm(wearing(mine, REWARDS[3]), 0)[7], 1, '받은 안경은 모습을 바꿔도 남는다');
});

test('무작위·주민 모습: 늘 받을 수 있는 열 칸, 주민은 같은 씨앗이면 같은 모습, 고루 섞기는 섞는 색이 조금', () => {
  let n = 1;
  const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 200; i++) { const p = randomPick(random); assert.ok(isPick(p)); assert.equal(p[7] + p[8], 0, '무작위는 액세서리를 주지 않는다'); }
  const owned = wearing(wearing(fullPick([0, 0, 0, 0]), REWARDS[0]), REWARDS[3]);
  assert.deepEqual(randomPick(random, owned).slice(7, 9), [1, REWARDS[0].value], '받은 건 무작위에도 남는다');
  assert.ok(HAIR_MENU.every(c => c.i < HAIRS.length));
  assert.deepEqual(lookFrom('q1:left'), lookFrom('q1:left'));
  const mixed = { ...toLook(fullPick([0, 2, 0, 0])), pattern: 'mixed', accent: 0xffffff };
  assert.ok(hairColor(mixed) !== mixed.hair && hairColor({ ...mixed, pattern: 'solid' }) === mixed.hair);
});
