/*
  예산철 — 다시 올 이유 ③ 이웃의 편지 · ④ 철마다 새 판(기획 3차, 2026-10-14).

  나라 살림에는 철이 있다 —
  · 9월: 정부가 내년 예산안을 국회에 낸다(국가재정법 33조, 회계연도 120일 전).
  · 12월: 국회가 의결한다(헌법 54조, 30일 전), 지방의회도 이달에 우리 지역 예산을 정한다(지방자치법 142조).
  이 철마다 내 이웃이 편지를 보내고(연락처를 남긴 사람에게 단체가 보낸다), 그 철에 걸으면 시민증에 철 도장이 찍힌다.

  문항은 철마다 바꾸지 않는다 — 문항은 유형 판정용이라 철마다 바뀌면 뼈대가 무너진다(README 설문 v4 ③).
  철마다 새로 생기는 건 편지·도장·안내 한 줄이다. 철의 「새 판」(새로 걸을 거리)의 내용은 아직 정하지 않았다 — README 「기획 3차」.
  편지 글은 Claude 가 붙인 임시 — 단체가 고친다. **결과가 어디에 쓰인다는 약속은 넣지 않는다**(모인 답은 어디에 쓰지 않음, 10-14).
*/
import { COMMON_QUESTIONS, FIELD_QUESTIONS } from './content';
import { josa, type Neighbor } from './profile';

type Kind = 'sep' | 'dec';
export type Season = { id: string; kind: Kind; year: number; month: number; name: string; line: string };

const KINDS: Record<Kind, { month: number; name: string; line: string }> = {
  sep: { month: 9, name: '내년 살림 안이 나오는 철', line: '9월 — 정부가 내년 나라 살림 안을 국회에 내는 철이에요.' },
  dec: { month: 12, name: '내년 살림이 정해지는 철', line: '12월 — 국회가 나라 살림을, 지방의회가 우리 지역 살림을 정하는 철이에요.' },
};
const make = (year: number, kind: Kind): Season => ({ id: `${year}-${kind}`, kind, year, ...KINDS[kind] });

/** 지금이 예산철이면 그 철, 아니면 undefined. 한국 시간 기준. */
export function seasonAt(now: number): Season | undefined {
  const { year, month } = korea(now);
  if (month === 9) return make(year, 'sep');
  if (month === 12) return make(year, 'dec');
  return undefined;
}

/** 다음에 올 철(지금이 철이면 그다음). 「12월에 편지가 가요」 에 쓴다. */
export function nextSeason(now: number): Season {
  const { year, month } = korea(now);
  if (month < 9) return make(year, 'sep');
  if (month < 12) return make(year, 'dec');
  return make(year + 1, 'sep');
}

export function seasonById(id: string | null): Season | undefined {
  const m = id?.match(/^(20\d\d)-(sep|dec)$/);
  return m ? make(Number(m[1]), m[2] as Kind) : undefined;
}

function korea(now: number) {
  const d = new Date(now + 9 * 60 * 60 * 1000); // 서버·폰이 어느 시간대든 한국 날짜로
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

const byId = new Map([...COMMON_QUESTIONS, ...FIELD_QUESTIONS].map(q => [q.id, q]));

/** 이웃의 편지 — 내가 이름 지어 준 이웃이 그 철에 보내는 글. 이웃이 없으면 「동네 주민」 이 보낸다. */
export function letterFor(season: Season, neighbor: Neighbor | undefined, myName: string) {
  const q = neighbor ? byId.get(neighbor.questionId) : undefined;
  const from = neighbor?.name || '동네 주민';
  const to = myName ? `${myName}님` : '주민님';
  const lines = [
    `${to}, 저 ${josa(from, '이에요', '예요')}.`,
    q && neighbor ? `지난번 ${q.place}에서 「${q[neighbor.key].text}」 이야기를 들어 줘서 고마웠어요.` : '지난번 동네를 같이 걸어 줘서 고마웠어요.',
    KINDS[season.kind].line.replace(/^\d+월 — /, `${season.month}월은 `),
    season.kind === 'dec' ? '올해도 여러 바람이 부딪히며 살림이 정해지겠죠.' : '여러 바람이 그 안에 어떻게 담겼을지 궁금해요.',
    '이번 철에 동네를 한 바퀴 같이 걸어요. 이번 철에 걸으면 시민증에 철 도장이 찍혀요.',
  ];
  return { title: `${from}의 편지 — ${season.year}년 ${season.month}월`, from, lines };
}
