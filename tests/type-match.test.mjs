import assert from "node:assert/strict";
import test from "node:test";

import { neighbourTypes, oppositeType } from "../app/type-match.ts";
import { TYPE_MAP } from "../app/budget-data.ts";

const ALL_CODES = Object.keys(TYPE_MAP);

/*
  궁합은 손으로 짠 표가 아니라 축에서 바로 나옵니다. 그래서 여덟 유형 전부를
  돌려 가며 규칙이 깨지지 않는지 볼 수 있습니다.
*/

test("여덟 유형 모두 정반대 유형이 정확히 하나 있다", () => {
  for (const code of ALL_CODES) {
    const { code: other } = oppositeType(code);
    assert.ok(TYPE_MAP[other], `${code}의 반대 ${other}가 유형 목록에 없습니다`);
    assert.notEqual(other, code);
    for (let i = 0; i < 3; i += 1) {
      assert.notEqual(other[i], code[i], `${i}번째 축이 반대가 아닙니다`);
    }
  }
});

test("정반대의 정반대는 자기 자신이다", () => {
  for (const code of ALL_CODES) {
    assert.equal(oppositeType(oppositeType(code).code).code, code);
  }
});

test("한 축만 다른 유형이 축마다 하나씩, 모두 셋이다", () => {
  for (const code of ALL_CODES) {
    const neighbours = neighbourTypes(code);
    assert.equal(neighbours.length, 3);
    assert.equal(new Set(neighbours.map((n) => n.code)).size, 3);

    for (const neighbour of neighbours) {
      const differing = [...neighbour.code].filter(
        (bit, i) => bit !== code[i],
      ).length;
      assert.equal(
        differing,
        1,
        `${code}와 ${neighbour.code}는 ${differing}개 축이 다릅니다`,
      );
      assert.ok(TYPE_MAP[neighbour.code]);
    }
  }
});

test("이웃과 정반대는 겹치지 않는다", () => {
  for (const code of ALL_CODES) {
    const opposite = oppositeType(code).code;
    const neighbours = neighbourTypes(code).map((n) => n.code);
    assert.ok(
      !neighbours.includes(opposite),
      "한 축만 다른 유형이 정반대일 수는 없습니다",
    );
  }
});

/*
  "나는 이쪽, 상대는 저쪽"을 화면에 그대로 씁니다. 뒤집혀 나오면 남의 성향을
  자기 것으로 읽게 됩니다.
*/
test("갈리는 축에서 내 쪽과 상대 쪽이 서로 반대로 적힌다", () => {
  for (const code of ALL_CODES) {
    for (const neighbour of neighbourTypes(code)) {
      assert.notEqual(neighbour.mine, neighbour.theirs);
      assert.ok(neighbour.mine.length > 0 && neighbour.theirs.length > 0);
    }
  }
});
