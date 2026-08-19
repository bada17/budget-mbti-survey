import { AXES, TYPE_MAP } from "./budget-data";

export type TypeCode = keyof typeof TYPE_MAP;

/*
  유형 궁합은 지어내지 않고 축에서 바로 나옵니다.

  MBTI 궁합표는 대개 사람이 손으로 짠 것이라 근거를 물으면 답할 수 없습니다.
  여기서는 그럴 필요가 없습니다. 유형이 세 축의 방향 조합일 뿐이라, 몇 개
  축이 갈리는지가 곧 얼마나 다른지입니다.

  - 세 축이 모두 반대  → 예산을 두고 정면으로 부딪히는 유형
  - 한 축만 다름       → 대체로 같은 편에 서는 유형 (셋 있습니다)

  참여자 분포는 보지 않습니다. 실제 응답이 쌓이기 전이기도 하고, 분포로
  궁합을 정하면 사람이 늘어날 때마다 어제의 결과가 오늘 달라집니다.
*/

const isTypeCode = (code: string): code is TypeCode => code in TYPE_MAP;

const flip = (code: string, index: number) =>
  code
    .split("")
    .map((bit, i) => (i === index ? (bit === "1" ? "0" : "1") : bit))
    .join("");

/** 세 축이 모두 반대인 유형. 언제나 정확히 하나입니다. */
export function oppositeType(code: TypeCode) {
  const flipped = code
    .split("")
    .map((bit) => (bit === "1" ? "0" : "1"))
    .join("");
  if (!isTypeCode(flipped)) {
    throw new Error(`유형 코드가 아닙니다: ${flipped}`);
  }
  return { code: flipped, type: TYPE_MAP[flipped] };
}

/**
 * 한 축만 다른 유형 셋. 어느 축이 갈렸는지도 함께 돌려줍니다.
 *
 * "무엇이 같은가"보다 "무엇 하나가 다른가"를 보여주는 편이 읽는 재미가
 * 있습니다. 거의 같은 사람인데 딱 한 가지에서 갈린다는 것이 눈에 들어오니까요.
 */
export function neighbourTypes(code: TypeCode) {
  return AXES.map((axis, index) => {
    const neighbour = flip(code, index);
    if (!isTypeCode(neighbour)) {
      throw new Error(`유형 코드가 아닙니다: ${neighbour}`);
    }
    const mineIsPositive = code[index] === "1";
    return {
      code: neighbour,
      type: TYPE_MAP[neighbour],
      axisKey: axis.key,
      /** 나는 이쪽, 상대는 저쪽. */
      mine: mineIsPositive ? axis.positive : axis.negative,
      theirs: mineIsPositive ? axis.negative : axis.positive,
    };
  });
}
