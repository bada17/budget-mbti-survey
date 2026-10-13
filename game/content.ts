/*
  게임판 설문 내용 — v4 초안 (Claude 판단, 2026-10-13). 사람 검토 전입니다.

  이 파일은 "무엇을 묻고 무엇이라 부르나"만 담습니다. 화면·조작·연출은 여기 없습니다.
  GPT 는 게임을 이 데이터 위에 짓고, 문구를 고칠 때는 이 파일만 고칩니다.
  왜 이렇게 정했는지는 README 「설문 v4 — 축·용어·루트」에 있습니다.

  옛 설문(v3, app/survey-v3-data.ts 99문항)은 지우지 않습니다. 지금 사이트와 정적판은
  그대로 v3 로 돕니다. 이 파일은 게임판에서만 씁니다.
*/

export const CONTENT_VERSION = "survey-v4-draft-2026-10-13";

/** 검토 상태. 사람이 보고 확정하면 "확정" 으로 바꿉니다. */
export type Status = "초안" | "확정";

/*
  세 축 — 예산게임(budget-mbti)의 편성 축과 같은 이름·같은 방향입니다.
  두 사업이 같은 말을 쓰게 하려는 것입니다.
  각 축은 0 쪽(left) 과 1 쪽(right). 유형 코드는 hands·time·reach 순서로 0/1 을 붙입니다.
*/
export const AXES = [
  {
    key: "hands",
    question: "어디에",
    left: "시설·제도",
    right: "사람에게",
    leftMeans: "건물·길·장비·제도처럼 모두가 함께 쓰는 바탕을 만든다",
    rightMeans: "돈이나 돌봄이 사람에게 바로 닿는다",
  },
  {
    key: "time",
    question: "언제",
    left: "당장",
    right: "두고두고",
    leftMeans: "올해 안에 효과가 난다",
    rightMeans: "몇 년 뒤부터 오래 효과가 난다",
  },
  {
    key: "reach",
    question: "누구에게",
    left: "좁고 깊게",
    right: "넓고 고르게",
    leftMeans: "꼭 필요한 곳을 골라 몰아준다",
    rightMeans: "많은 사람에게 고르게 나눈다",
  },
] as const;

export type AxisKey = (typeof AXES)[number]["key"];
export type Side = "left" | "right";

/*
  문항. 선택지 a 는 늘 그 축의 left 쪽, b 는 right 쪽입니다.
  화면에서는 사람마다 좌우를 섞지만(shouldSwapSurveyOptions), 데이터는 이 방향으로 고정합니다.

  holds — 이 문항이 "움직이지 않게 묶어 둔" 나머지 두 축. 두 선택지가 그 두 축에서는
  같은 자리에 있어야 합니다. 검토하는 사람은 이 칸을 보고 한 문항이 한 축만 재는지 확인합니다.
  (v3 의 가장 큰 문제가 「지금」 쪽에만 「어려운 사람」 이 붙어 축이 섞인 것이었습니다.)

  short — 게임 안 표지판·버튼에 쓰는 짧은 이름. 8자 안쪽.
*/
export type Question = {
  id: string;
  kind: "공통" | "분야";
  axis: AxisKey;
  /** 분야 문항만. v3 의 fieldId 와 같은 이름(education, safety …). */
  field?: string;
  /** 이 문항을 만나는 장소(구간 안의 한 곳). */
  place: string;
  prompt: string;
  a: { text: string; short: string };
  b: { text: string; short: string };
  holds: Partial<Record<AxisKey, string>>;
  /** 검증 전에는 모두 1 (같은 무게). 응답이 쌓여 구분력을 재면 고칩니다. */
  weight: number;
  status: Status;
};

/*
  모든 문항은 유형(세 축) 판정을 위해서만 있습니다(사용자, 2026-10-13).
  판정과 상관없는 문항(철마다 바뀌는 문항 같은 것)을 섞지 않습니다.
  15문항 = 공통 9(분야 없이 가치만) + 분야 6(실제 예산 항목으로, 서로 다른 여섯 분야) — v3 와 같은 뼈대.
*/

/* 공통 9문항 — 분야 없이 가치만 묻습니다. 축마다 3개. */
export const COMMON_QUESTIONS: Question[] = [
  {
    id: "C-H1", kind: "공통", axis: "hands",
    place: "광장",
    prompt: "동네에 1억 원이 생겼습니다. 어떻게 쓸까요?",
    a: { text: "주민 모두가 쓰는 도서관과 공원을 고친다", short: "도서관·공원" },
    b: { text: "주민 모두에게 지역화폐로 나눈다", short: "지역화폐" },
    holds: { time: "당장", reach: "넓고 고르게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-T1", kind: "공통", axis: "time",
    place: "큰길",
    prompt: "예산에 여유가 생겼습니다. 어디에 먼저 쓸까요?",
    a: { text: "올해 갈라지고 낡은 도로를 고친다", short: "낡은 길 고치기" },
    b: { text: "10년 뒤 늘어날 교통에 맞춰 새 길을 낸다", short: "10년 뒤 길" },
    holds: { hands: "시설·제도", reach: "넓고 고르게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-R1", kind: "공통", axis: "reach",
    place: "주민센터",
    prompt: "복지 예산을 쓰는 더 나은 방식은?",
    a: { text: "형편이 가장 어려운 가구를 골라 두텁게 돕는다", short: "골라서 두텁게" },
    b: { text: "모든 가구를 조금씩 고르게 돕는다", short: "모두 고르게" },
    holds: { hands: "사람에게", time: "당장" },
    weight: 1, status: "초안",
  },
  {
    id: "C-H2", kind: "공통", axis: "hands",
    place: "경로당",
    prompt: "돌봄이 필요한 어르신을 돕는다면?",
    a: { text: "빈 건물을 돌봄센터로 바꿔 올해 문을 연다", short: "동네 돌봄센터" },
    b: { text: "어르신 댁으로 돌보미를 보낸다", short: "찾아가는 돌보미" },
    holds: { time: "당장", reach: "좁고 깊게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-T2", kind: "공통", axis: "time",
    place: "청년 자취방",
    prompt: "청년 예산을 쓴다면?",
    a: { text: "올해 청년의 월세를 돕는다", short: "올해 월세" },
    b: { text: "청년이 오래 쓸 기술을 배우게 돕는다", short: "오래 쓸 기술" },
    holds: { hands: "사람에게", reach: "넓고 고르게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-R2", kind: "공통", axis: "reach",
    place: "주민센터 창구",
    prompt: "지원 대상을 정하는 방식은?",
    a: { text: "심사를 거쳐 꼭 필요한 사람에게만", short: "심사해서" },
    b: { text: "심사 없이 누구나 받을 수 있게", short: "누구나" },
    holds: { hands: "사람에게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-H3", kind: "공통", axis: "hands",
    place: "버스 정류장",
    prompt: "버스가 잘 안 다니는 동네라면?",
    a: { text: "마을버스 노선을 새로 낸다", short: "마을버스" },
    b: { text: "주민에게 택시비를 돌려준다", short: "택시비 지원" },
    holds: { time: "당장", reach: "넓고 고르게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-T3", kind: "공통", axis: "time",
    place: "둑",
    prompt: "나라가 빚을 내야 한다면, 더 납득이 가는 쪽은?",
    a: { text: "올해 무너진 둑과 도로를 복구하려고", short: "올해 복구" },
    b: { text: "앞으로 30년 쓸 홍수 방어 시설을 지으려고", short: "30년 대비" },
    holds: { hands: "시설·제도", reach: "넓고 고르게" },
    weight: 1, status: "초안",
  },
  {
    id: "C-R3", kind: "공통", axis: "reach",
    place: "체육관",
    prompt: "체육 시설 예산이 있습니다. 어떻게 쓸까요?",
    a: { text: "장애인이 마음껏 쓰는 전용 체육관을 하나 제대로 짓는다", short: "전용 체육관" },
    b: { text: "동네마다 누구나 쓰는 작은 운동 기구를 놓는다", short: "동네마다 기구" },
    holds: { hands: "시설·제도" },
    weight: 1, status: "초안",
  },
];

/*
  분야 문항 6개 — 축마다 2개, 서로 다른 여섯 분야에서 하나씩.
  가치를 추상적으로만 묻지 않고 실제 예산 항목으로 물어야 답이 흔들리지 않습니다(v3 와 같은 이유).
  v3 처럼 진영으로 갈리기 쉬운 분야(국방·외교)는 뺍니다.
*/
export const FIELD_QUESTIONS: Question[] = [
    {
      id: "F-H1", kind: "분야", field: "education", axis: "hands",
      place: "학교",
      prompt: "학교 예산이 늘었습니다. 어디에 쓸까요?",
      a: { text: "낡은 교실과 급식실을 고친다", short: "교실 고치기" },
      b: { text: "상담 선생님을 더 뽑는다", short: "선생님 더" },
      holds: { time: "당장", reach: "넓고 고르게" },
      weight: 1, status: "초안",
    },
    {
      id: "F-T1", kind: "분야", field: "environment", axis: "time",
      place: "공원",
      prompt: "기후 예산을 쓴다면?",
      a: { text: "올여름 폭염 쉼터와 그늘막을 늘린다", short: "올여름 쉼터" },
      b: { text: "20년 뒤를 보고 도시 숲을 가꾼다", short: "20년 숲" },
      holds: { hands: "시설·제도", reach: "넓고 고르게" },
      weight: 1, status: "초안",
    },
    {
      id: "F-R1", kind: "분야", field: "culture", axis: "reach",
      place: "공연장",
      prompt: "문화 예산을 쓴다면?",
      a: { text: "눈에 띄는 예술가 몇 명을 골라 크게 지원한다", short: "몇 명 크게" },
      b: { text: "많은 예술가에게 작게 고르게 지원한다", short: "많이 고르게" },
      holds: { hands: "사람에게", time: "당장" },
      weight: 1, status: "초안",
    },
    {
      id: "F-H2", kind: "분야", field: "health", axis: "hands",
      place: "보건소",
      prompt: "동네 의료를 챙긴다면?",
      a: { text: "보건소에 진료 장비를 들인다", short: "보건소 장비" },
      b: { text: "방문 간호사가 집으로 찾아간다", short: "찾아가는 간호" },
      holds: { time: "당장", reach: "넓고 고르게" },
      weight: 1, status: "초안",
    },
    {
      id: "F-T2", kind: "분야", field: "safety", axis: "time",
      place: "소방서",
      prompt: "안전 예산을 쓴다면?",
      a: { text: "올해 동네마다 낡은 소화기와 비상벨을 바꾼다", short: "올해 비상벨" },
      b: { text: "앞으로 오래 쓸 재난 예보 체계를 만든다", short: "재난 예보" },
      holds: { hands: "시설·제도", reach: "넓고 고르게" },
      weight: 1, status: "초안",
    },
    {
      id: "F-R2", kind: "분야", field: "land", axis: "reach",
      place: "군청",
      prompt: "지역을 살리는 예산이라면?",
      a: { text: "사람이 가장 빨리 줄어드는 군 몇 곳에 몰아준다", short: "가장 급한 곳" },
      b: { text: "모든 시·군에 고르게 나눈다", short: "모든 곳 고르게" },
      holds: {},
      weight: 1, status: "초안",
    },
];

/*
  루트 — 문항이 나오는 길. 구간 다섯 × 3문항, 구간마다 세 축이 하나씩.
  모두가 같은 순서로 답합니다(앞 문항이 뒤 답에 주는 영향을 모두에게 같게).
  비슷한 질문(같은 축)은 최소 세 칸 떨어집니다.
  1·3·5 구간은 공통, 2·4 구간은 분야 문항입니다.

  구간마다 동네(area)가 있고, 문항마다 그 동네 안의 장소(Question.place)에서 만납니다.
  도시에서 출발해 읍내를 지나 강가에서 끝나는 한 줄기 여행입니다(사용자, 2026-10-13).
*/
export const ROUTE: { stage: number; kind: "공통" | "분야"; area: string; ids: string[] }[] = [
  { stage: 1, kind: "공통", area: "동네 입구", ids: ["C-H1", "C-T1", "C-R1"] },
  { stage: 2, kind: "분야", area: "학교 가는 길", ids: ["F-H1", "F-T1", "F-R1"] },
  { stage: 3, kind: "공통", area: "골목", ids: ["C-H2", "C-T2", "C-R2"] },
  { stage: 4, kind: "분야", area: "읍내", ids: ["F-H2", "F-T2", "F-R2"] },
  { stage: 5, kind: "공통", area: "강가", ids: ["C-H3", "C-T3", "C-R3"] },
];

/*
  세기 — 주민에게 다가가면 내가 할 말 세 개 중 하나를 고릅니다(사용자, 2026-10-13).
  말은 **모든 문항에서 같습니다.** 문항마다 말을 바꾸면 같은 「많이」 라도 사람마다 세기를 다르게
  읽어 판정이 흔들립니다. 고친다면 여기 한 곳만 고칩니다.
  answer — 고른 주민이 a 쪽이면 aValue, b 쪽이면 bValue 가 그 문항의 답(1~6)입니다.
*/
export const REPLIES = [
  { level: "조금", line: "음… 그쪽이 조금 나을 것 같아요", aValue: 3, bValue: 4 },
  { level: "많이", line: "네, 그게 맞아요", aValue: 2, bValue: 5 },
  { level: "훨씬", line: "무조건 그거죠!", aValue: 1, bValue: 6 },
] as const;

/** 다섯 구간을 지나 닿는 곳 — 여기서 유형이 드러납니다. (초안) */
export const DESTINATION = { name: "강 건너 언덕", status: "초안" as Status };

/*
  여덟 유형 — 코드는 hands·time·reach 순서, 1 이 right 쪽.
  name 은 게임에서 캐릭터로 그릴 수 있는 이름(초안). budgetGame 은 예산게임에서 같은 코드에
  붙어 있는 이름 — 하나로 맞출지 사용자가 정합니다.
*/
export const TYPES = {
  "111": { name: "선생님", line: "모두의 내일을 사람에게 심어요.", budgetGame: "함께 여는 내일" },
  "110": { name: "코치", line: "꼭 키워야 할 사람을 골라 오래 곁에 있어요.", budgetGame: "다음 세대의 돌봄" },
  "101": { name: "밥 짓는 이웃", line: "오늘, 모두에게 따뜻한 한 끼를 나눠요.", budgetGame: "일상의 받침대" },
  "100": { name: "구조대원", line: "가장 급한 사람에게 지금 바로 달려가요.", budgetGame: "가장 가까운 돌봄" },
  "011": { name: "다리 놓는 사람", line: "모두가 오래 건널 길을 놓아요.", budgetGame: "모두의 바탕" },
  "010": { name: "연구원", line: "될 곳을 골라 먼 미래에 걸어요.", budgetGame: "미래를 겨눈 한 수" },
  "001": { name: "가로등지기", line: "오늘 밤, 모든 골목에 불을 켜요.", budgetGame: "오늘을 굴리는 힘" },
  "000": { name: "수리공", line: "가장 망가진 곳부터 오늘 고쳐요.", budgetGame: "급한 현장 먼저" },
} as const;

export type TypeCode = keyof typeof TYPES;
