// 게임판 내용(game/content.ts)이 루트·축·유형 규칙을 지키는지. 문구를 고친 뒤에도 이것만 통과하면 된다.
import assert from "node:assert/strict";
import test from "node:test";
import { AXES, COMMON_QUESTIONS, FIELD_QUESTIONS, REPLIES, ROUTE, TYPES } from "../game/content.ts";
import { scoreAnswers, typeCode } from "../game/score.ts";

const all = [...COMMON_QUESTIONS, ...FIELD_QUESTIONS];
const byId = new Map(all.map((q) => [q.id, q]));

test("루트: 구간 다섯 × 3문항, 구간마다 세 축이 하나씩, 공통 9 + 분야 6(서로 다른 분야)", () => {
  assert.equal(ROUTE.length, 5);
  const ids = ROUTE.flatMap((s) => s.ids);
  assert.equal(new Set(ids).size, 15);
  for (const stage of ROUTE) {
    const qs = stage.ids.map((id) => byId.get(id));
    assert.ok(qs.every(Boolean), `없는 문항: 구간 ${stage.stage}`);
    assert.deepEqual(qs.map((q) => q.axis).sort(), AXES.map((a) => a.key).sort());
    assert.ok(qs.every((q) => q.kind === stage.kind));
  }
  assert.equal(ids.filter((id) => byId.get(id).kind === "공통").length, 9);
  assert.ok(ROUTE.every((s) => s.area) && new Set(ROUTE.map((s) => s.area)).size === 5, "구간마다 다른 동네");
  assert.ok(ids.every((id) => byId.get(id).place), "문항마다 장소");
  const fields = FIELD_QUESTIONS.map((q) => q.field);
  assert.ok(fields.every(Boolean) && new Set(fields).size === 6, "분야 문항은 서로 다른 여섯 분야");
});

test("문항: 자기 축은 holds 에 없고, 짧은 이름은 8자 안쪽", () => {
  for (const q of all) {
    assert.ok(!(q.axis in q.holds), `${q.id} 가 자기 축을 묶어 둠`);
    for (const side of [q.a, q.b]) assert.ok(side.short.length <= 8, `${q.id}: ${side.short}`);
  }
});

test("판정: 모두 a 끝이면 000, 모두 b 끝이면 111, 여덟 코드 모두 이름이 있다", () => {
  const route = ROUTE.flatMap((s) => s.ids).map((id) => byId.get(id));
  const allA = Object.fromEntries(route.map((q) => [q.id, 1]));
  const allB = Object.fromEntries(route.map((q) => [q.id, 6]));
  assert.deepEqual(scoreAnswers(route, allA), { hands: -100, time: -100, reach: -100 });
  assert.equal(typeCode(scoreAnswers(route, allA)), "000");
  assert.equal(typeCode(scoreAnswers(route, allB)), "111");
  assert.equal(typeCode({ hands: 0, time: 0.1, reach: 0 }), "010"); // 0 은 왼쪽
  assert.equal(Object.keys(TYPES).length, 8);
});

test("세기: 대답 셋이 a 쪽 1·2·3, b 쪽 4·5·6 을 빠짐없이 덮는다", () => {
  assert.deepEqual(REPLIES.map((r) => r.aValue).sort(), [1, 2, 3]);
  assert.deepEqual(REPLIES.map((r) => r.bValue).sort(), [4, 5, 6]);
  for (const r of REPLIES) assert.equal(r.aValue + r.bValue, 7); // 좌우 섞기(7 - 값)와 맞물림
});
