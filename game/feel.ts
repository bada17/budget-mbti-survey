/**
 * 손맛 조절 값 — 숫자만 바꿔 느낌을 고친다. 진행·판정 코드는 여기를 읽기만 한다.
 * 거리는 화면 px(CSS), 시간은 ms.
 */
export const FEEL = {
  // 걷기
  walkSpeed: 190,
  accelMs: 90, // 서 있다가 최고 속도까지
  maxDeltaMs: 40, // 화면이 멈췄다 돌아와도 한 번에 이만큼만 움직인다
  tapMs: 240, // 이보다 짧게 톡 치면 「거기까지 걸어가기」, 길게 누르면 「손가락 따라가기」
  tapSlop: 12,

  // 주민 만나기
  meetRadius: 48, // 주민 발밑에서 이 안이면 대답 창이 열린다
  leaveRadius: 70, // 대답 창이 열린 뒤 이만큼 멀어져야 닫힌다(경계에서 깜빡이지 않게)
  talkGap: 34, // 말풍선을 눌러 다가갈 때 주민 아래 이만큼에 선다
  bubbleStaggerMs: 140,
  bubblePopMs: 260,

  // 문
  doorAssist: 1.1, // 문이 열렸을 때 벽에 붙어 위로 밀면 문 쪽으로 미끄러지는 세기
  roomScrollMs: 560,
  enterMs: 420,

  // 걷는 모습
  stepMs: 270,
  squash: 0.07,
  bobPx: 2.4,
  dustEveryMs: 210,

  // 대답했을 때 — [조금, 많이, 훨씬]
  hearts: [2, 4, 8],
  jumpPx: [10, 20, 34],
  jumps: [1, 2, 3],
  shake: [0, 0, 0.006],
  vibrateMs: [8, 14, 30],
  joinDelayMs: 420,

  // 따라오는 주민
  followGap: 30, // 지나온 길을 따라 이만큼씩 떨어져 선다
  followerScale: 0.82,
  followerCatchUp: 1.35, // 줄에서 처지면 걷기 속도의 이 배로 따라붙는다

  // 동네 장난감
  pigeonFleeRadius: 70,

  // 도착
  gatherMs: 900,
  cheerGapMs: 70,
  revealDelayMs: 900,
} as const;
