/*
  마을 부탁(사용자 10-17) — 필드에 선 주민이 예산 부탁을 한다(머리 위 「!」). 어른도 아이도 같은 부탁 — 나이로 나누지 않고 단계로 어려워진다.
  · 하루 셋씩 닷새(열다섯). 그날 셋을 다 들어줘야 다음 날 셋이 열린다(사용자 「3개를 다 깨야 다음날 3개가 오픈」).
  · 하루치를 다 들어주면 액세서리 하나(look.ts REWARDS, 받으면 바로 쓴다). 부탁 하나마다 동전.
  · 지금은 느낌을 보려고 첫날 셋만(사용자 「지금은 느낌만 보게 3개만」) — 종류를 달리했다: 누가 고쳐요 · 얼마예요 · 다 못 들어줘요.
    둘째 날부터는 비워 둔다(「준비 중」). 단계 초안: 누가 고쳐요 → 얼마예요 → 돈은 어디서 → 다 못 들어줘요 → 우리 동네(README 「마을 부탁」).
  · 금액은 아직 예시 — 나라장터 자료를 붙이면 바꾼다(부탁 글에 「예시」 라고 적어 둔다).
  예전 「오늘의 부탁」(건물 문 앞 주민 셋이 날마다 돌림, 10-14 ⓓ)은 이걸로 갈아 끼웠다. 해낸 것은 이 기기에만. 그림 없이 시험되는 것만 여기.
*/
import type { Point } from './room';
import { gameStorage } from './storage';

export type Choice = { text: string; /** 맞는 답 — 하나라도 있으면 틀린 걸 고르면 다시 고른다. 없으면(다 못 들어줘요) 무엇을 골라도 된다. */ right?: boolean; reply: string };
export type Errand = { id: string; /** 주민이 서 있는 자리(마을 지도) */ at: Point; ask: string; choices: Choice[] };

/** 날마다 셋 — 닷새. 빈 날은 「준비 중」. */
export const ERRAND_DAYS: Errand[][] = [
  [
    {
      id: 'lamp', at: { x: 340, y: 806 },
      ask: '밤마다 이 골목 가로등이 깜빡여요. 누구한테 말하면 고쳐 줄까요?',
      choices: [
        { text: '구청(시·군·구청)', right: true, reply: '맞아요! 골목 가로등(보안등)은 시·군·구가 맡아요. 구청 누리집이나 민원 전화로 알리면 돼요.' },
        { text: '교육청', reply: '교육청은 학교 살림을 맡아요. 골목 가로등은 다른 곳이에요.' },
        { text: '나라(중앙정부)', reply: '나라는 큰 살림을 맡아요. 동네 골목은 더 가까운 곳이 맡아요.' },
      ],
    },
    {
      id: 'bench', at: { x: 672, y: 908 },
      ask: '광장에 벤치 하나를 새로 놓으려면 얼마쯤 들까요? (예시 금액이에요)',
      choices: [
        { text: '3만 원쯤', reply: '그보다는 훨씬 들어요. 여럿이 오래 쓰게 튼튼하게 만들거든요.' },
        { text: '300만 원쯤', right: true, reply: '맞아요! 공공 벤치는 집에서 쓰는 것보다 튼튼해서 비싸요. (예시 금액 — 실제 계약 금액으로 바꿀 거예요)' },
        { text: '3억 원쯤', reply: '그렇게까진 아니에요. 3억 원이면 작은 놀이터를 만들 수 있어요.' },
      ],
    },
    {
      id: 'pick', at: { x: 630, y: 1150 },
      ask: '금고에 남은 돈으로 하나만 할 수 있대요. 운동장 그늘막이랑 광장 화장실 고치기, 뭘 먼저 할까요?',
      choices: [
        { text: '운동장 그늘막 세우기', reply: '그늘막을 세웠어요! 운동장 주민들은 웃고, 화장실을 기다린 주민들은 내년을 기다려요. 예산은 늘 모자라서, 뭘 먼저 할지 고르는 게 예산이에요.' },
        { text: '광장 화장실 고치기', reply: '화장실을 고쳤어요! 광장 주민들은 웃고, 그늘막을 바란 주민들은 내년을 기다려요. 예산은 늘 모자라서, 뭘 먼저 할지 고르는 게 예산이에요.' },
      ],
    },
  ],
  [], [], [], [],
];
export const ERRANDS = ERRAND_DAYS.flat();
/** 부탁 하나 들어주면 받는 동전(공사터에 넣는 그 동전). */
export const ERRAND_COIN = 2;

/** 이 기기의 기록 — 들어준 부탁, 그리고 날(0부터)마다 셋을 다 들어준 한국 날짜 번호(village.ts kstDay). */
export type ErrandMemo = { done: string[]; cleared: number[] };

/**
 * 지금 열린 날 — 다 들어준 날 수가 곧 지금 날(0부터). 막혔으면 wait:
 * all = 열다섯을 다 했다, soon = 그날 부탁을 아직 안 만들었다, tomorrow = 어제 것을 오늘 다 해서 내일 열린다.
 */
export function errandDay(memo: ErrandMemo, today: number): { day: number; list: Errand[]; wait?: 'all' | 'soon' | 'tomorrow' } {
  const day = memo.cleared.length;
  if (day >= ERRAND_DAYS.length) return { day, list: [], wait: 'all' };
  if (!ERRAND_DAYS[day].length) return { day, list: [], wait: 'soon' };
  if (day > 0 && today <= memo.cleared[day - 1]) return { day, list: [], wait: 'tomorrow' };
  return { day, list: ERRAND_DAYS[day] };
}

/** 마을에 세울 주민 — 열린 날 셋(「!」 는 아직 안 들어준 것), 막혔으면 마지막으로 다 한 날 셋(「!」 없이). */
export function errandsShown(memo: ErrandMemo, today: number) {
  const { day, list } = errandDay(memo, today);
  const shown = list.length ? list : ERRAND_DAYS[day - 1] ?? [];
  return shown.map(e => ({ id: e.id, at: e.at, open: !memo.done.includes(e.id) }));
}

/** 들어줬다 — 그날 셋을 다 했으면 cleared 에 오늘을 적고 그 날 번호를 돌려준다(보상). 열리지 않은 부탁·이미 한 부탁은 그대로. */
export function finishErrand(memo: ErrandMemo, id: string, today: number): { memo: ErrandMemo; cleared?: number } {
  const { day, list } = errandDay(memo, today);
  if (!list.some(e => e.id === id) || memo.done.includes(id)) return { memo };
  const done = [...memo.done, id];
  if (!list.every(e => done.includes(e.id))) return { memo: { ...memo, done } };
  return { memo: { done, cleared: [...memo.cleared, today] }, cleared: day };
}

const KEY = 'budget-game-errands';
export function loadErrands(): ErrandMemo {
  try {
    const raw = JSON.parse(gameStorage.getItem(KEY) ?? 'null');
    return {
      done: Array.isArray(raw?.done) ? raw.done.filter((x: unknown) => typeof x === 'string').slice(0, 40) : [],
      cleared: Array.isArray(raw?.cleared) ? raw.cleared.filter(Number.isInteger).slice(0, ERRAND_DAYS.length) : [],
    };
  } catch { return { done: [], cleared: [] }; }
}
export const saveErrands = (memo: ErrandMemo) => { try { gameStorage.setItem(KEY, JSON.stringify(memo)); } catch { /* 막힌 창 */ } };
