/*
  버스 예산 퀴즈(사용자 10-14 「게임으로 역할을 못 한다」 진단 ⑤ 「버스는 그냥 기다리는 시간」 → ⓑ).
  동네 사이 버스가 서 있는 동안 세 고르기 문제 하나 — 맞히면 동전 하나(마을 공사터에 넣는 그 동전).
  숫자는 세금 보는 곳(taxes.ts)과 같은 근거로 확인한 것만 — 법이 바뀌면 taxes.ts 와 같이 고친다.
  판마다 여덟 문제 중 넷을 다른 차례로(같은 판엔 늘 같게). 유형 판정과는 상관없다.
*/
import { rng } from './look';

export type Quiz = { q: string; answer: string; wrong: [string, string]; why: string };

export const QUIZ: Quiz[] = [
  { q: '커피 한 잔 값에 부가가치세는 얼마나 들어 있을까요?', answer: '11분의 1쯤', wrong: ['3분의 1쯤', '하나도 없어요'], why: '값에 10%를 얹은 거라, 낸 돈의 11분의 1쯤이 부가가치세예요.' },
  { q: '부가가치세 가운데 지방(시·도) 금고로 가는 몫은?', answer: '25.3%', wrong: ['5%', '50%'], why: '「지방소비세」 라는 이름으로 25.3%가 시·도로 가요.' },
  { q: '월급에서 소득세와 같이 떼는 지방소득세는 소득세의 얼마만큼?', answer: '10분의 1', wrong: ['2분의 1', '똑같이'], why: '세율이 소득세의 10분의 1이에요. 이 돈은 사는 동네 금고로 가요.' },
  { q: '담배 한 갑(20개비)에 붙는 담배소비세는?', answer: '1,007원', wrong: ['100원', '3,000원'], why: '한 갑에 1,007원 — 시·군(특별·광역시는 시) 금고로 가요.' },
  { q: '나라 세금(내국세)의 몇 %가 지방교부세로 지방에 나뉠까요?', answer: '19.24%', wrong: ['1%', '50%'], why: '살림이 빠듯한 곳에 더 가도록 나눠요.' },
  { q: '비싼 집에 붙는 종합부동산세는 누가 쓸까요?', answer: '전부 지방에 나눠 줘요', wrong: ['전부 나라가 써요', '집주인이 돌려받아요'], why: '나라가 걷지만 전부 「부동산교부세」 로 지방에 가요.' },
  { q: '서울 자치구에서 걷은 재산세의 절반은 어떻게 될까요?', answer: '서울시가 모아 25개 구에 똑같이 나눠요', wrong: ['나라 금고로 가요', '걷은 구가 다 써요'], why: '구마다 살림 차이가 너무 벌어지지 않게 하려는 「공동과세」 예요.' },
  { q: '교육청 살림이 되는 돈은 나라 세금(내국세)의 몇 %?', answer: '20.79%', wrong: ['2%', '60%'], why: '「지방교육재정교부금」 으로 학교 살림이 돼요.' },
];

/** 이번 판(sessionId)의 stage 번째 버스 문제와 보기 차례. 같은 판엔 늘 같게, 판마다 다르게. */
export function quizFor(sessionId: string, stage: number) {
  const r = rng(`quiz:${sessionId}`);
  const order = shuffle(QUIZ.map((_, i) => i), r);
  const quiz = QUIZ[order[stage % order.length]];
  return { quiz, choices: shuffle([quiz.answer, ...quiz.wrong], rng(`quiz:${sessionId}:${stage}`)) }; // 버스마다 따로 섞어야 정답 자리가 늘 같지 않다
}
/** 고르게 섞기(피셔–예이츠) — sort 에 무작위를 주면 치우친다. */
function shuffle<T>(list: T[], r: () => number) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
