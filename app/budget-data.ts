/**
 * The survey/scoring modules still import these shapes from budget-data.
 * Only the fields used by scoring are retained in this separated scaffold.
 */
export type AxisKey = "future" | "growth" | "universal";

export type AxisProfile = Record<AxisKey, number>;

export type BudgetField = {
  id: string;
  profile: AxisProfile;
};

export type BudgetProgram = {
  id: string;
  fieldId: string;
  tags: AxisProfile;
};

export const TYPE_MAP = {
  "111": {
    label: "적극적 미래설계·성장·보편",
    nickname: "내일을 여는 설계자",
    description: "모두가 누릴 미래에 과감하게 투자합니다.",
  },
  "110": {
    label: "적극적 미래설계·성장·선별",
    nickname: "전략적 미래투자가",
    description: "효과가 큰 곳을 골라 다음 성장에 베팅합니다.",
  },
  "101": {
    label: "적극적 미래설계·분배·보편",
    nickname: "미래의 토대 건축가",
    description: "누구도 뒤처지지 않는 내일의 기반을 만듭니다.",
  },
  "100": {
    label: "적극적 미래설계·분배·선별",
    nickname: "다음 세대의 돌봄가",
    description: "미래의 가장 약한 고리부터 단단히 보살핍니다.",
  },
  "011": {
    label: "점진적 미래설계·성장·보편",
    nickname: "오늘의 활력 촉진자",
    description: "지금 모두의 경제에 활력을 불어넣습니다.",
  },
  "010": {
    label: "점진적 미래설계·성장·선별",
    nickname: "현실적인 해결사",
    description: "당장 효과가 필요한 곳에 자원을 집중합니다.",
  },
  "001": {
    label: "점진적 미래설계·분배·보편",
    nickname: "일상의 안전망 수호자",
    description: "오늘을 살아가는 모두의 삶을 함께 받칩니다.",
  },
  "000": {
    label: "점진적 미래설계·분배·선별",
    nickname: "가장 가까운 돌봄가",
    description: "지금 가장 절실한 사람과 문제부터 지킵니다.",
  },
} as const;

export const AXES = [
  {
    key: "future" as const,
    negative: "점진적 미래설계",
    positive: "적극적 미래설계",
  },
  { key: "growth" as const, negative: "분배", positive: "성장" },
  { key: "universal" as const, negative: "선별", positive: "보편" },
];
