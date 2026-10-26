/*
  시민증 도장판 — 다시 올 이유 ⑤(기획 3차, 2026-10-14).

  도장은 **답이 아니라 한 일**에 찍는다. 답에 도장을 붙이면 도장을 받으려고 일부러 다르게 답해
  「남들 생각」 이 흐려진다(동네를 쌓지 않기로 한 것과 같은 이유).
  경품은 붙이지 않는다 — 붙이면 위조·공정성·개인정보 일이 커진다. 기록은 이 기기에만(profile.ts 의 loadStamps).

  철 도장(season:2026-dec)·현장 도장(event:…)은 여러 개 받을 수 있고, 판에는 한 칸으로 모여 몇 개인지 보인다.

  10-15 열 칸 → 일곱 칸(사용자 「주석처리한게 있으니 도장 개수를 조정해. 한 6~7개만」). 지금 받을 수 없는 것을 막았다 —
  소식 받는 주민(연락처 칸이 개발판에만)·정주민(회원 확인을 못 해 늘 빔). 받은 기록은 기기에 그대로 남는다.
  시민증은 도장을 ISSUE_AT 개 모으면 발급된다(town.ts).
*/
export type StampDef = { id: string; name: string; how: string };

export const STAMPS: StampDef[] = [
  { id: 'walk', name: '한 바퀴', how: '언덕까지 걸으면' },
  // [나중에 살림: 내 이웃] 끝 화면 「내 이웃 정하기」 를 숨긴 동안(10-19) — 살리면 ISSUE_AT 도 4 로
  // { id: 'neighbor', name: '내 이웃', how: '언덕에서 이웃을 정하면' },
  { id: 'invite', name: '친구 부름', how: '친구에게 보내거나 답장하면' },
  { id: 'guest', name: '손님 맞이', how: '친구가 답장하거나 내 동네에 다녀가면' },
  { id: 'region', name: '내 동네', how: '로그인하고 내 동네(시·군·구)를 정하면' }, // 저장은 로그인한 사람만(10-20)
  // [나중에 살림: 철·현장 도장] 사용자 10-19 「일단 빼봐」 — 받을 수 없는 달이 많아 빈 칸으로 보였다. 찍는 기록(main.ts ?stamp=·철)은 그대로라 살리면 받은 게 보인다. 12월에 철 도장 살릴지 그때.
  // { id: 'season', name: '철 도장', how: '예산철(9월·12월)에 걸으면' },
  // { id: 'event', name: '현장 도장', how: '시민행동 행사에서 QR 을 찍으면' },
  // [나중에 살림: 도장 셋] 연락처 칸이 공개판에 켜지면(main.ts contactReady) · 회원 확인 길이 생기면
  // { id: 'news', name: '소식 받는 주민', how: '이웃 소식을 받으면' },
  // { id: 'member', name: '정주민', how: '함께하는 시민행동 회원이 되면' },
];

/**
 * 시민증 발급 — 도장을 이만큼 모으면(사용자 10-15 「도장 찍어야 시민증이 발급되게」).
 * 셋 = 혼자 한 번에 다 받을 수 있는 한 바퀴·내 동네·친구 부름([나중에 살림: 내 이웃] 동안 내 이웃이 빠져 넷 → 셋). 판은 넷(10-19 철·현장 도장을 뺌) —
 * 손님 맞이는 발급 뒤에 더 모으는 칸.
 */
export const ISSUE_AT = 3;
/** 처음 발급된 때를 적어 두는 표(도장판 칸은 아니다 — STAMPS 에 없어 판에는 안 보인다). */
export const ISSUED = 'card';

/**
 * 현장 도장 코드(?stamp=코드) → 행사 이름. 행사 QR 주소 끝에 붙인다. 목록에 없는 코드는 도장을 안 찍는다.
 * 이름은 Claude 가 붙인 임시 — 행사가 정해지면 단체가 덧붙인다.
 */
export const EVENTS: Record<string, string> = {
  'pub-2026': '2026 후원주점',
};

export const seasonStamp = (seasonId: string) => `season:${seasonId}`;
export const eventStamp = (code: string | null) => (code && Object.hasOwn(EVENTS, code) ? `event:${code}` : undefined);

/** 판의 한 칸 — 받았나, 몇 개인가(철·현장). */
export function board(stamps: Record<string, number>) {
  return STAMPS.map(def => {
    const count = def.id === 'season' || def.id === 'event'
      ? Object.keys(stamps).filter(id => id.startsWith(`${def.id}:`)).length
      : stamps[def.id] ? 1 : 0;
    return { ...def, on: count > 0, count };
  });
}
