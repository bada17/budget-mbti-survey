/*
  마을 「오늘의 부탁」(사용자 10-14 「게임으로 역할을 못 한다」 진단 ⑥ 「마을은 웹 메뉴, 다시 올 이유가 약하다」 → ⓓ).
  날마다 문 앞 주민 셋이 부탁을 한다(머리 위 「!」). 들어주면 동전 둘(마을 공사터에 넣는 그 동전).
  부탁은 건물 판을 「읽으러 갈 이유」 가 되게 — 세금 도감 장면 찾기, 상담소 문답, 동네 금고 고르기 같은 것.
  같은 날엔 누구에게나 같고 날마다 바뀐다. 해낸 것은 이 기기에만(places.ts 주머니). 그림 없이 시험되는 것만 여기.
*/
import { rng } from './look';
import type { PlaceId } from './village';

/** event = 해냈다고 보는 일(main·places·마을 장면이 알린다). count 가 있으면 그만큼 모아야. */
export type Quest = { id: string; place: PlaceId; ask: string; event: string; count?: number };

export const QUESTS: Quest[] = [
  { id: 'tax-smoke', place: 'tax', ask: '세금 도감에서 「담배 한 갑 살 때」 를 찾아 줄래요? 세금이 세 군데로 나뉘어요.', event: 'tax:smoke' },
  { id: 'tax-home', place: 'tax', ask: '세금 도감에서 「집이 있으면」 을 찾아 줄래요? 서울은 재산세를 나눠 쓴대요.', event: 'tax:home' },
  { id: 'tax-fuel', place: 'tax', ask: '세금 도감에서 「기름 넣을 때」 를 찾아 줄래요?', event: 'tax:fuel' },
  { id: 'vault', place: 'tax', ask: '「우리 동네 금고」 에서 사는 곳을 골라 봐요. 금고가 뭘로 채워지는지 보여요.', event: 'vault:pick' },
  { id: 'counsel', place: 'counsel', ask: '상담소에 자주 오는 질문 하나 읽고 가 줄래요?', event: 'open:counsel' },
  { id: 'finance', place: 'finance', ask: '아무 동네나 한 해 살림을 봐 줄래요? 한 사람 몫이 얼마인지 나와요.', event: 'finance:pick' },
  { id: 'dok', place: 'dok', ask: '요즘 들여다보는 예산 소식 한번 봐 줄래요?', event: 'open:dok' },
  { id: 'hub', place: 'hub', ask: '주민증에 찍힌 도장 좀 봐 줘요. 몇 개 모았어요?', event: 'open:hub' },
  { id: 'cat', place: 'hub', ask: '광장 고양이한테 인사 좀 해 줄래요? 요즘 심심한가 봐요.', event: 'cat' },
  { id: 'board', place: 'board', ask: '쪽지판에 들러 지나간 주민들 쪽지를 읽어 봐요.', event: 'open:board' },
  { id: 'trees', place: 'works', ask: '나무를 세 그루 흔들어 봐요. 동전이 숨어 있을지도 몰라요!', event: 'shake', count: 3 },
  { id: 'give', place: 'works', ask: '공사터에 동전을 넣어 줄래요? 다리가 조금씩 올라가요.', event: 'give' },
];
export const QUEST_PER_DAY = 3;
export const QUEST_REWARD = 2;

/** 오늘(한국 날짜 번호)의 부탁 셋 — 서로 다른 건물에서(「!」 가 세 주민에게 하나씩). 같은 날엔 누구에게나 같다. */
export function questsOn(day: number): Quest[] {
  const r = rng(`quest:${day}`), pool = [...QUESTS], picked: Quest[] = [];
  while (picked.length < QUEST_PER_DAY && pool.length) {
    const q = pool.splice(Math.floor(r() * pool.length), 1)[0];
    if (!picked.some(p => p.place === q.place)) picked.push(q);
  }
  return picked;
}
