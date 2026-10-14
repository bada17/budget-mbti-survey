/*
  고르면 방이 바로 바뀐다(사용자 10-14 「게임으로 역할을 못 한다」 → 진단 ② 「골라도 세상이 안 바뀐다」 → ⓐ).
  대답 서른(문항 열다섯 × 둘)마다 일어나는 일 하나 — 짓기·내리기·찾아오기·자라기·여기저기·한 곳에 크게·지나가기.
  ⚠️ 기울기를 드러내지 않는다(설문 v4 ③) — 두 대답 모두 같은 크기로 신나게. 「좋은 쪽」 처럼 보이는 연출(한쪽만 크게·한쪽만 빛)을 주지 않는다.
  그림은 이모지 하나 + 움직임(파일 없음) — draw.ts 의 playOutcome. 방을 떠나면 다 지운다(장면이 drop 을 부른다).
  여기는 그림 없이 시험되는 목록만 둔다.
*/

export type Outcome =
  | { kind: 'build'; icon: string } // 먼지·비계 → 짠
  | { kind: 'rain'; icon: string } // 하늘에서 내린다
  | { kind: 'visit'; icon: string } // 도우미가 걸어 들어온다(머리 위에 든 것)
  | { kind: 'grow'; icon: string } // 싹 → 다 자람
  | { kind: 'spread'; icon: string } // 방 여기저기 작은 것
  | { kind: 'focus'; icon: string } // 한 곳에 크게(빛 고리)
  | { kind: 'drive'; icon: string }; // 탈것이 지나간다

/** 문항 id → a·b 대답의 일. 문항을 고치면 여기도 본다(시험이 빠진 것을 잡는다). */
export const OUTCOMES: Record<string, { a: Outcome; b: Outcome }> = {
  'C-H1': { a: { kind: 'build', icon: '📚' }, b: { kind: 'rain', icon: '💰' } },
  'C-T1': { a: { kind: 'build', icon: '🚧' }, b: { kind: 'build', icon: '🛣️' } },
  'C-R1': { a: { kind: 'focus', icon: '🎁' }, b: { kind: 'spread', icon: '🎁' } },
  'C-H2': { a: { kind: 'build', icon: '🏠' }, b: { kind: 'visit', icon: '🧺' } },
  'C-T2': { a: { kind: 'rain', icon: '💌' }, b: { kind: 'grow', icon: '🛠️' } },
  'C-R2': { a: { kind: 'focus', icon: '📋' }, b: { kind: 'spread', icon: '💌' } },
  'C-H3': { a: { kind: 'drive', icon: '🚌' }, b: { kind: 'drive', icon: '🚕' } },
  'C-T3': { a: { kind: 'build', icon: '🚧' }, b: { kind: 'build', icon: '🧱' } },
  'C-R3': { a: { kind: 'focus', icon: '🏟️' }, b: { kind: 'spread', icon: '🏀' } },
  'F-H1': { a: { kind: 'build', icon: '🏫' }, b: { kind: 'visit', icon: '📘' } },
  'F-T1': { a: { kind: 'build', icon: '⛱️' }, b: { kind: 'grow', icon: '🌳' } },
  'F-R1': { a: { kind: 'focus', icon: '🎻' }, b: { kind: 'spread', icon: '🎨' } },
  'F-H2': { a: { kind: 'build', icon: '🩺' }, b: { kind: 'visit', icon: '🩺' } },
  'F-T2': { a: { kind: 'spread', icon: '🔔' }, b: { kind: 'build', icon: '📡' } },
  'F-R2': { a: { kind: 'focus', icon: '🏘️' }, b: { kind: 'spread', icon: '🏡' } },
};

/** 고른 주민의 한마디 — 대답 세기(조금·많이·훨씬)마다. */
export const THANKS = ['그래도 마음 써 줘서 고마워요.', '고마워요! 같이 해 봐요.', '정말요? 너무 고마워요!'];
