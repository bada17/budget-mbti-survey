import type { AxisKey, AxisProfile } from "./budget-data";

export type SurveyOption = {
  text: string;
  group: string | null;
  score: number;
};

export type SurveyQuestion = {
  id: string;
  kind: "field" | "anchor";
  fieldId: string | null;
  axis: AxisKey;
  prompt: string;
  optionA: SurveyOption;
  optionB: SurveyOption;
  discrimination: number;
};

export type SurveyAnswers = Record<string, number>;
export type SurveyDisplayOrder = "AB" | "BA";

export type SurveyResponseMeta = Record<
  string,
  {
    displayResponse: number;
    displayOrder: SurveyDisplayOrder;
    responseTimeMs: number;
  }
>;

export const SURVEY_SCORE_TOTAL = 100;
export const SURVEY_DATASET_VERSION = "survey-v3-2026-08-01";

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    "id": "공공-미래설계-a",
    "kind": "field",
    "fieldId": "safety",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "눈앞의 화재·사고에 즉시 출동",
      "group": "소방·구조",
      "score": -2
    },
    "optionB": {
      "text": "대형 재난 사전 대비·안전기술 개발",
      "group": "재난관리",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "공공-미래설계-b",
    "kind": "field",
    "fieldId": "safety",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 벌어진 범죄를 기소·처리",
      "group": "검찰·법무·교정",
      "score": -1
    },
    "optionB": {
      "text": "첨단 과학수사 기술 개발",
      "group": "수사·과학수사",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "공공-성장분배-a",
    "kind": "field",
    "fieldId": "safety",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "범죄 피해자와 약자를 직접 돕는 데 쓰기",
      "group": "인권·약자보호",
      "score": -2
    },
    "optionB": {
      "text": "경찰 인력과 장비를 늘려 치안 역량 키우기",
      "group": "경찰·치안",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "공공-성장분배-b",
    "kind": "field",
    "fieldId": "safety",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "교정·재사회화로 사람을 다시 세우기",
      "group": "검찰·법무·교정",
      "score": -2
    },
    "optionB": {
      "text": "법 집행 시스템의 효율을 높이기",
      "group": "검찰·법무·교정",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "공공-보편선별-a",
    "kind": "field",
    "fieldId": "safety",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "특정 사건 겨냥한 특별수사",
      "group": "수사·과학수사",
      "score": -2
    },
    "optionB": {
      "text": "누구나 이용하는 법원 기본 서비스",
      "group": "법원·재판",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "공공-보편선별-b",
    "kind": "field",
    "fieldId": "safety",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "도움이 절실한 약자를 골라 지원",
      "group": "인권·약자보호",
      "score": -2
    },
    "optionB": {
      "text": "누구에게나 닥칠 재난에 대비",
      "group": "소방·구조",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "과학-미래설계-a",
    "kind": "field",
    "fieldId": "science",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 시민이 과학 접하는 과학관 운영",
      "group": "과학문화·과학관",
      "score": -2
    },
    "optionB": {
      "text": "먼 미래를 바꿀 기초·원천 연구",
      "group": "기초·원천연구",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "과학-미래설계-b",
    "kind": "field",
    "fieldId": "science",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "이미 가동 중인 원전의 안전 관리",
      "group": "원자력(진흥·안전)",
      "score": -1
    },
    "optionB": {
      "text": "아직 수익 없는 우주 개발·탐사",
      "group": "우주·항공",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "과학-성장분배-a",
    "kind": "field",
    "fieldId": "science",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "국민 누구나 쓰는 기상·과학 서비스",
      "group": "기상·기후과학",
      "score": -2
    },
    "optionB": {
      "text": "돈이 되는 전략기술에 집중 투자",
      "group": "미래유망기술",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "과학-성장분배-b",
    "kind": "field",
    "fieldId": "science",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "국민이 과학을 배우고 누릴 기회 넓히기",
      "group": "과학문화·과학관",
      "score": -2
    },
    "optionB": {
      "text": "세계와 경쟁할 연구 성과를 내기",
      "group": "기초·원천연구",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "과학-보편선별-a",
    "kind": "field",
    "fieldId": "science",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "소수 대형 프로젝트에 집중",
      "group": "우주·항공",
      "score": -2
    },
    "optionB": {
      "text": "전국 과학관·과학교육에 고르게",
      "group": "과학문화·과학관",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "과학-보편선별-b",
    "kind": "field",
    "fieldId": "science",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "선정된 연구단에 집중 지원",
      "group": "기초·원천연구",
      "score": -2
    },
    "optionB": {
      "text": "모든 국민이 받는 기상 서비스",
      "group": "기상·기후과학",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "교육-미래설계-a",
    "kind": "field",
    "fieldId": "education",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 학비로 힘든 학생 장학금",
      "group": "국가장학·학생지원",
      "score": -2
    },
    "optionB": {
      "text": "10년 뒤 산업 이끌 연구인재 양성",
      "group": "산학연·연구성과",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교육-미래설계-b",
    "kind": "field",
    "fieldId": "education",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "이미 일하는 성인의 재교육·직업훈련",
      "group": "평생·직업교육",
      "score": -2
    },
    "optionB": {
      "text": "다음 세대가 자랄 초중고 교육 기반",
      "group": "초중등 학교교육",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "교육-성장분배-a",
    "kind": "field",
    "fieldId": "education",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "형편 어려운 학생 학비를 대주기",
      "group": "국가장학·학생지원",
      "score": -2
    },
    "optionB": {
      "text": "대학 연구 경쟁력을 키우기",
      "group": "대학·고등교육",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교육-성장분배-b",
    "kind": "field",
    "fieldId": "education",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "지역 간 교육 격차를 줄이기",
      "group": "지방교육재정",
      "score": -2
    },
    "optionB": {
      "text": "성과 내는 대학·연구단에 힘 싣기",
      "group": "산학연·연구성과",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교육-보편선별-a",
    "kind": "field",
    "fieldId": "education",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "검증된 소수 대학·연구단에 집중",
      "group": "산학연·연구성과",
      "score": -2
    },
    "optionB": {
      "text": "전국 모든 학교에 고르게",
      "group": "초중등 학교교육",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교육-보편선별-b",
    "kind": "field",
    "fieldId": "education",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "소득 기준으로 선발해 장학금 집중",
      "group": "국가장학·학생지원",
      "score": -2
    },
    "optionB": {
      "text": "원하는 누구나 참여하는 평생교육",
      "group": "평생·직업교육",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "교통-미래설계-a",
    "kind": "field",
    "fieldId": "transport",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 막히는 도로 넓히고 보수",
      "group": "도로건설·관리",
      "score": -2
    },
    "optionB": {
      "text": "미래 교통 연구개발·인재 양성",
      "group": "국토교통 연구·인재",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교통-미래설계-b",
    "kind": "field",
    "fieldId": "transport",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 출퇴근 시민의 교통비·버스 노선",
      "group": "대중·광역교통",
      "score": -2
    },
    "optionB": {
      "text": "수십 년 쓸 철도망 새로 건설",
      "group": "철도(고속·일반·도시)",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "교통-성장분배-a",
    "kind": "field",
    "fieldId": "transport",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "서민 교통비 덜어주는 대중교통",
      "group": "대중·광역교통",
      "score": -2
    },
    "optionB": {
      "text": "민간 자본 끌어 개발 사업 키우기",
      "group": "민자·경제자유구역",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교통-성장분배-b",
    "kind": "field",
    "fieldId": "transport",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "교통이 불편한 지역의 발을 만들어주기",
      "group": "대중·광역교통",
      "score": -2
    },
    "optionB": {
      "text": "물류·산업 경쟁력을 높이는 데 쓰기",
      "group": "물류정책",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교통-보편선별-a",
    "kind": "field",
    "fieldId": "transport",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "잠재력 큰 특정 지역에 집중 투자",
      "group": "민자·경제자유구역",
      "score": -2
    },
    "optionB": {
      "text": "전국이 함께 쓰는 기본 교통망",
      "group": "도로건설·관리",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "교통-보편선별-b",
    "kind": "field",
    "fieldId": "transport",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "이용자가 정해진 공항·항공 노선",
      "group": "항공·공항",
      "score": -2
    },
    "optionB": {
      "text": "더 많은 시민이 타는 철도 노선",
      "group": "철도(고속·일반·도시)",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "국방-미래설계-a",
    "kind": "field",
    "fieldId": "defense",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 복무 중인 장병 급식·피복·급여",
      "group": "장병복지·급식피복",
      "score": -2
    },
    "optionB": {
      "text": "앞으로의 안보를 좌우할 첨단 전력",
      "group": "무기체계 획득",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국방-미래설계-b",
    "kind": "field",
    "fieldId": "defense",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "당장 부족한 병력 확보와 관리",
      "group": "병역자원 충원·선발",
      "score": -2
    },
    "optionB": {
      "text": "차세대 유도무기·함정·항공기 개발",
      "group": "무기체계 획득",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "국방-성장분배-a",
    "kind": "field",
    "fieldId": "defense",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "군인 개인의 처우와 복지를 올리기",
      "group": "장병복지·급식피복",
      "score": -2
    },
    "optionB": {
      "text": "무기를 수출하는 방위산업으로 키우기",
      "group": "군수·방위사업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국방-성장분배-b",
    "kind": "field",
    "fieldId": "defense",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "복무하는 사람의 생활 여건을 챙기기",
      "group": "장병복지·급식피복",
      "score": -2
    },
    "optionB": {
      "text": "전력 성능을 높여 국방력 자체를 키우기",
      "group": "무기체계 획득",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국방-보편선별-a",
    "kind": "field",
    "fieldId": "defense",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "선정된 방위산업체·전략사업에 집중",
      "group": "군수·방위사업",
      "score": -2
    },
    "optionB": {
      "text": "모든 복무 인력에 돌아가는 지원",
      "group": "병역자원 충원·선발",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "국방-보편선별-b",
    "kind": "field",
    "fieldId": "defense",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "핵심 전력에 예산 몰아주기",
      "group": "무기체계 획득",
      "score": -2
    },
    "optionB": {
      "text": "전 장병이 체감하는 급식·의료·복지",
      "group": "장병복지·급식피복",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국토-미래설계-a",
    "kind": "field",
    "fieldId": "land",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "당장의 홍수 피해를 막는 하천·댐 관리",
      "group": "하천·댐관리",
      "score": -2
    },
    "optionB": {
      "text": "수십 년을 내다보는 대형 개발",
      "group": "지역개발",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국토-미래설계-b",
    "kind": "field",
    "fieldId": "land",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 낙후된 도시를 재정비",
      "group": "도시·건축정책",
      "score": -2
    },
    "optionB": {
      "text": "앞으로의 관리 기반이 될 디지털 국토정보",
      "group": "국토정보·지리",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "국토-성장분배-a",
    "kind": "field",
    "fieldId": "land",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "모든 가정에 깨끗한 물을 공급하기",
      "group": "상수도(맑은물)",
      "score": -2
    },
    "optionB": {
      "text": "산업단지를 지어 성장 거점 만들기",
      "group": "산업단지",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국토-성장분배-b",
    "kind": "field",
    "fieldId": "land",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "어디 살든 기본 인프라를 보장하기",
      "group": "수자원·홍수관리",
      "score": -2
    },
    "optionB": {
      "text": "개발로 지역의 가치를 끌어올리기",
      "group": "지역개발",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국토-보편선별-a",
    "kind": "field",
    "fieldId": "land",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "잠재력 큰 특정 지역에 집중",
      "group": "지역개발",
      "score": -2
    },
    "optionB": {
      "text": "전국 가정에 고르게 맑은 물",
      "group": "상수도(맑은물)",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "국토-보편선별-b",
    "kind": "field",
    "fieldId": "land",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "특정 도시(세종)에 집중 건설",
      "group": "행정도시건설",
      "score": -2
    },
    "optionB": {
      "text": "전국 하천·댐을 두루 관리",
      "group": "하천·댐관리",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "농림-미래설계-a",
    "kind": "field",
    "fieldId": "agriculture",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 농어가의 소득을 직접 지원",
      "group": "농가경영·소득안정",
      "score": -2
    },
    "optionB": {
      "text": "미래 농업을 바꿀 기술개발·보급",
      "group": "농업 기술개발·보급",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "농림-미래설계-b",
    "kind": "field",
    "fieldId": "agriculture",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 농산물 수급과 가격 안정",
      "group": "농산물 수급·유통",
      "score": -2
    },
    "optionB": {
      "text": "앞으로의 생산 기반과 신산업 육성",
      "group": "농업 기술개발·보급",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "농림-성장분배-a",
    "kind": "field",
    "fieldId": "agriculture",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "농어민의 소득을 직접 뒷받침하기",
      "group": "농가경영·소득안정",
      "score": -2
    },
    "optionB": {
      "text": "식품·외식을 수출 산업으로 키우기",
      "group": "식품산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "농림-성장분배-b",
    "kind": "field",
    "fieldId": "agriculture",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "어려운 농어촌의 생활을 떠받치기",
      "group": "농림수산 인력·교육",
      "score": -2
    },
    "optionB": {
      "text": "임업·수산업을 돈 되는 산업으로 키우기",
      "group": "산림자원·산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "농림-보편선별-a",
    "kind": "field",
    "fieldId": "agriculture",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "선정된 선도 농가에 집중 지원",
      "group": "농업 기술개발·보급",
      "score": -2
    },
    "optionB": {
      "text": "전 국민 먹거리 안전을 지키는 방역",
      "group": "축산·방역",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "농림-보편선별-b",
    "kind": "field",
    "fieldId": "agriculture",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "특정 어촌·수산 지역 대상 지원",
      "group": "수산업·어촌",
      "score": -2
    },
    "optionB": {
      "text": "모든 국민의 밥상 물가 안정",
      "group": "농산물 수급·유통",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "문화-미래설계-a",
    "kind": "field",
    "fieldId": "culture",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "물려받은 문화유산을 보존·관리",
      "group": "문화유산·궁능(+종교)",
      "score": -2
    },
    "optionB": {
      "text": "미래 먹거리가 될 콘텐츠 산업",
      "group": "콘텐츠·미디어산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "문화-미래설계-b",
    "kind": "field",
    "fieldId": "culture",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 운영 중인 문화기관 유지",
      "group": "박물관·도서관·미술관",
      "score": -2
    },
    "optionB": {
      "text": "새로운 창작과 예술을 키우기",
      "group": "예술창작·진흥",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "문화-성장분배-a",
    "kind": "field",
    "fieldId": "culture",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "순수예술·지역문화의 저변을 넓히기",
      "group": "예술창작·진흥",
      "score": -2
    },
    "optionB": {
      "text": "K콘텐츠를 수출 산업으로 키우기",
      "group": "콘텐츠·미디어산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "문화-성장분배-b",
    "kind": "field",
    "fieldId": "culture",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "누구나 문화를 누릴 기회를 늘리기",
      "group": "예술창작·진흥",
      "score": -2
    },
    "optionB": {
      "text": "관광을 돈 버는 산업으로 키우기",
      "group": "관광진흥",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "문화-보편선별-a",
    "kind": "field",
    "fieldId": "culture",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "소수 전문 예술기관에 집중",
      "group": "공연예술(국악·극장)",
      "score": -2
    },
    "optionB": {
      "text": "전 국민 생활체육에 고르게",
      "group": "체육(생활·전문·장애인)",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "문화-보편선별-b",
    "kind": "field",
    "fieldId": "culture",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "선정된 예술가·단체를 집중 지원",
      "group": "예술창작·진흥",
      "score": -2
    },
    "optionB": {
      "text": "누구나 가는 도서관·박물관",
      "group": "박물관·도서관·미술관",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "보건-미래설계-a",
    "kind": "field",
    "fieldId": "health",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 닥친 감염병 위기에 대응",
      "group": "감염병 대응",
      "score": -2
    },
    "optionB": {
      "text": "미래 의료를 바꿀 보건산업·연구",
      "group": "보건산업·연구",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "보건-미래설계-b",
    "kind": "field",
    "fieldId": "health",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 국민 의료비 부담을 덜기",
      "group": "건강보험·의료보장",
      "score": -2
    },
    "optionB": {
      "text": "앞으로 병을 줄일 예방·건강증진",
      "group": "국민건강증진·만성질환",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "보건-성장분배-a",
    "kind": "field",
    "fieldId": "health",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "전 국민 의료비 부담을 낮추기",
      "group": "건강보험·의료보장",
      "score": -2
    },
    "optionB": {
      "text": "바이오·의료를 성장 산업으로 키우기",
      "group": "보건산업·연구",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "보건-성장분배-b",
    "kind": "field",
    "fieldId": "health",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "취약층이 갈 공공·정신의료를 늘리기",
      "group": "공공·정신의료(국립병원)",
      "score": -2
    },
    "optionB": {
      "text": "의료 연구·산업 경쟁력을 높이기",
      "group": "보건산업·연구",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "보건-보편선별-a",
    "kind": "field",
    "fieldId": "health",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "특정 취약층 대상 공공의료",
      "group": "공공·정신의료(국립병원)",
      "score": -2
    },
    "optionB": {
      "text": "전 국민 의료보장",
      "group": "건강보험·의료보장",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "보건-보편선별-b",
    "kind": "field",
    "fieldId": "health",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "특정 위해 요소를 집중 관리",
      "group": "마약·위해관리",
      "score": -2
    },
    "optionB": {
      "text": "모든 국민의 먹거리 안전",
      "group": "식품안전",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "복지-미래설계-a",
    "kind": "field",
    "fieldId": "welfare",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 빈곤층의 최저 생활을 보장",
      "group": "기초생활보장",
      "score": -2
    },
    "optionB": {
      "text": "다음 세대를 위한 저출산 대응",
      "group": "아동·가족·저출산",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "복지-미래설계-b",
    "kind": "field",
    "fieldId": "welfare",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 노인의 생활 안정과 의료 보장",
      "group": "노인복지",
      "score": -2
    },
    "optionB": {
      "text": "미래 세대인 아동·양육을 지원",
      "group": "아동·가족·저출산",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "복지-성장분배-a",
    "kind": "field",
    "fieldId": "welfare",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "어려운 사람에게 직접 지원하기",
      "group": "기초생활보장",
      "score": -2
    },
    "optionB": {
      "text": "일자리를 만들어 스스로 벌게 하기",
      "group": "고용·일자리",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "복지-성장분배-b",
    "kind": "field",
    "fieldId": "welfare",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "취약층의 집과 주거를 보장하기",
      "group": "주거지원",
      "score": -2
    },
    "optionB": {
      "text": "직업 능력을 키워 일자리로 연결",
      "group": "고용·일자리",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "복지-보편선별-a",
    "kind": "field",
    "fieldId": "welfare",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "자격을 심사해 꼭 필요한 이에게",
      "group": "기초생활보장",
      "score": -2
    },
    "optionB": {
      "text": "모든 노인에게 기초연금",
      "group": "노인복지",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "복지-보편선별-b",
    "kind": "field",
    "fieldId": "welfare",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "장애인 등 특정 대상에 집중",
      "group": "장애인",
      "score": -2
    },
    "optionB": {
      "text": "모든 가정에 양육·돌봄 지원",
      "group": "아동·가족·저출산",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "산업-미래설계-a",
    "kind": "field",
    "fieldId": "industry",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금의 안정적인 전력 공급",
      "group": "에너지 공급·수급",
      "score": -2
    },
    "optionB": {
      "text": "미래 에너지 전환과 신산업",
      "group": "신재생에너지",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "산업-미래설계-b",
    "kind": "field",
    "fieldId": "industry",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 어려운 소상공인·전통시장",
      "group": "소상공인·전통시장",
      "score": -2
    },
    "optionB": {
      "text": "미래를 이끌 창업·벤처 육성",
      "group": "창업·벤처",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "산업-성장분배-a",
    "kind": "field",
    "fieldId": "industry",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "소상공인의 생계를 받쳐주기",
      "group": "소상공인·전통시장",
      "score": -2
    },
    "optionB": {
      "text": "주력 산업의 경쟁력을 키우기",
      "group": "산업기술·경쟁력",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "산업-성장분배-b",
    "kind": "field",
    "fieldId": "industry",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "뒤처진 지역 경제를 살리기",
      "group": "지역경제",
      "score": -2
    },
    "optionB": {
      "text": "신산업·벤처로 성장 동력 만들기",
      "group": "창업·벤처",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "산업-보편선별-a",
    "kind": "field",
    "fieldId": "industry",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "선정된 주력 산업에 집중",
      "group": "산업기술·경쟁력",
      "score": -2
    },
    "optionB": {
      "text": "전국 소상공인에 고르게",
      "group": "소상공인·전통시장",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "산업-보편선별-b",
    "kind": "field",
    "fieldId": "industry",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "대형 투자 유치에 집중",
      "group": "외국인투자유치",
      "score": -2
    },
    "optionB": {
      "text": "전국 골목상권에 고르게",
      "group": "소상공인·전통시장",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "행정-미래설계-a",
    "kind": "field",
    "fieldId": "administration",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 재정을 안정적으로 관리",
      "group": "재정·국고관리",
      "score": -2
    },
    "optionB": {
      "text": "앞으로의 기반이 될 디지털 정부",
      "group": "전자정부·개인정보",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "행정-미래설계-b",
    "kind": "field",
    "fieldId": "administration",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 세금을 제대로 걷기",
      "group": "조세·징수",
      "score": -2
    },
    "optionB": {
      "text": "앞으로의 정책 근거가 될 통계",
      "group": "통계",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "행정-성장분배-a",
    "kind": "field",
    "fieldId": "administration",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "억울한 국민의 권익을 구제",
      "group": "과거사·인권·권익",
      "score": -2
    },
    "optionB": {
      "text": "경제가 잘 돌게 금융·산업을 뒷받침",
      "group": "금융정책·감독",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "행정-성장분배-b",
    "kind": "field",
    "fieldId": "administration",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "지방에 재정을 나눠 격차를 줄이기",
      "group": "지방재정·분권",
      "score": -2
    },
    "optionB": {
      "text": "세원을 넓혀 나라 곳간을 키우기",
      "group": "조세·징수",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "행정-보편선별-a",
    "kind": "field",
    "fieldId": "administration",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "특정 사안·대상의 권익 구제",
      "group": "과거사·인권·권익",
      "score": -2
    },
    "optionB": {
      "text": "모든 국민이 쓰는 전자정부",
      "group": "전자정부·개인정보",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "행정-보편선별-b",
    "kind": "field",
    "fieldId": "administration",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "중앙 정부 기능에 집중",
      "group": "국정운영·정책조정(+선거)",
      "score": -2
    },
    "optionB": {
      "text": "전국 지방에 고르게",
      "group": "지방재정·분권",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "통신-미래설계-a",
    "kind": "field",
    "fieldId": "communication",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 전국 우체국 서비스 유지",
      "group": "우정·우체국금융",
      "score": -2
    },
    "optionB": {
      "text": "미래 SW·AI 산업 육성",
      "group": "SW·AI산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통신-미래설계-b",
    "kind": "field",
    "fieldId": "communication",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 인터넷을 안전하게 지키기",
      "group": "정보보호·인터넷안전",
      "score": -2
    },
    "optionB": {
      "text": "미래 AI·데이터 산업 육성",
      "group": "데이터진흥",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "통신-성장분배-a",
    "kind": "field",
    "fieldId": "communication",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "국민이 안전하게 쓰도록 정보보호",
      "group": "정보보호·인터넷안전",
      "score": -2
    },
    "optionB": {
      "text": "AI·SW를 돈 되는 산업으로 키우기",
      "group": "SW·AI산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통신-성장분배-b",
    "kind": "field",
    "fieldId": "communication",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "어디 살든 우편·통신 기본을 보장",
      "group": "우정·우체국금융",
      "score": -2
    },
    "optionB": {
      "text": "융합 산업으로 새 시장을 만들기",
      "group": "정보통신융합산업",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통신-보편선별-a",
    "kind": "field",
    "fieldId": "communication",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "선도 AI·데이터 기업에 집중",
      "group": "데이터진흥",
      "score": -2
    },
    "optionB": {
      "text": "전국 어디서나 우체국 서비스",
      "group": "우정·우체국금융",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통신-보편선별-b",
    "kind": "field",
    "fieldId": "communication",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "특정 방송 사업을 지원",
      "group": "전파·방송서비스",
      "score": -2
    },
    "optionB": {
      "text": "모든 국민의 인터넷 안전",
      "group": "정보보호·인터넷안전",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "통일-미래설계-a",
    "kind": "field",
    "fieldId": "diplomacy",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 재외국민 보호와 영사 서비스",
      "group": "재외국민·영사",
      "score": -2
    },
    "optionB": {
      "text": "앞으로의 통일을 준비하는 정책·교육",
      "group": "통일정책·교육",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통일-미래설계-b",
    "kind": "field",
    "fieldId": "diplomacy",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 실리를 챙기는 경제외교",
      "group": "경제·양자외교",
      "score": -2
    },
    "optionB": {
      "text": "장기적 국제 신뢰를 쌓는 개발협력",
      "group": "개발협력(ODA)",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "통일-성장분배-a",
    "kind": "field",
    "fieldId": "diplomacy",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "어려운 나라를 돕는 인도적 지원",
      "group": "개발협력(ODA)",
      "score": -2
    },
    "optionB": {
      "text": "수출과 경제를 키우는 경제외교",
      "group": "경제·양자외교",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통일-성장분배-b",
    "kind": "field",
    "fieldId": "diplomacy",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "탈북민 정착을 직접 지원하기",
      "group": "북한이탈주민",
      "score": -2
    },
    "optionB": {
      "text": "국익을 앞세운 실리 외교",
      "group": "경제·양자외교",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "통일-보편선별-a",
    "kind": "field",
    "fieldId": "diplomacy",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "소수 탈북민에 집중 정착 지원",
      "group": "북한이탈주민",
      "score": -2
    },
    "optionB": {
      "text": "국가 전체에 영향 주는 다자·안보",
      "group": "다자·국제기구",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "통일-보편선별-b",
    "kind": "field",
    "fieldId": "diplomacy",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "재외동포 등 특정 대상 지원",
      "group": "재외동포",
      "score": -2
    },
    "optionB": {
      "text": "국민 전체에 영향 주는 남북 관계",
      "group": "남북관계·협력기금",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "환경-미래설계-a",
    "kind": "field",
    "fieldId": "environment",
    "axis": "future",
    "prompt": "이 분야 예산을 딱 한 곳만 늘릴 수 있다면?",
    "optionA": {
      "text": "지금 쓰고 버린 물의 오염 관리",
      "group": "물환경(수질·수생태)",
      "score": -2
    },
    "optionB": {
      "text": "다음 세대를 위한 온실가스 감축",
      "group": "기후·탄소중립",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "환경-미래설계-b",
    "kind": "field",
    "fieldId": "environment",
    "axis": "future",
    "prompt": "예산이 줄어 하나를 포기해야 한다면?",
    "optionA": {
      "text": "지금 발생한 화학 피해를 관리",
      "group": "화학물질·환경보건",
      "score": -2
    },
    "optionB": {
      "text": "수십 년을 내다본 생태 보전",
      "group": "자연생태보전",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "환경-성장분배-a",
    "kind": "field",
    "fieldId": "environment",
    "axis": "growth",
    "prompt": "같은 돈이라면 어느 쪽에 쓰는 게 낫습니까?",
    "optionA": {
      "text": "국민이 매일 숨쉬는 대기질을 개선",
      "group": "대기환경",
      "score": -2
    },
    "optionB": {
      "text": "친환경 산업을 키워 성장으로 잇기",
      "group": "자원순환",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "환경-성장분배-b",
    "kind": "field",
    "fieldId": "environment",
    "axis": "growth",
    "prompt": "이 분야에서 정부가 먼저 해야 할 일은?",
    "optionA": {
      "text": "오염 피해를 입은 사람을 직접 돕기",
      "group": "화학물질·환경보건",
      "score": -2
    },
    "optionB": {
      "text": "환경 기술·국제 협력으로 경쟁력 얻기",
      "group": "환경연구·국제협력",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "환경-보편선별-a",
    "kind": "field",
    "fieldId": "environment",
    "axis": "universal",
    "prompt": "예산을 어떻게 쓰는 게 더 공정합니까?",
    "optionA": {
      "text": "피해가 확인된 지역·집단을 선별 지원",
      "group": "화학물질·환경보건",
      "score": -2
    },
    "optionB": {
      "text": "전 국민·전 산업의 탄소중립 전환",
      "group": "기후·탄소중립",
      "score": 2
    },
    "discrimination": 4
  },
  {
    "id": "환경-보편선별-b",
    "kind": "field",
    "fieldId": "environment",
    "axis": "universal",
    "prompt": "한정된 예산의 우선순위는?",
    "optionA": {
      "text": "특정 국제 사업에 배분",
      "group": "환경연구·국제협력",
      "score": -2
    },
    "optionB": {
      "text": "전국 어디서나 체감하는 대기질",
      "group": "대기환경",
      "score": 2
    },
    "discrimination": 3
  },
  {
    "id": "ANC-F1",
    "kind": "anchor",
    "fieldId": null,
    "axis": "future",
    "prompt": "정부 예산에 여유가 생겼습니다. 어디에 먼저 쓰시겠습니까?",
    "optionA": {
      "text": "지금 당장 어려운 사람들의 생활을 돕는 데",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "20년 뒤를 준비하는 시설과 연구에",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-F2",
    "kind": "anchor",
    "fieldId": null,
    "axis": "future",
    "prompt": "둘 중 하나만 할 수 있다면?",
    "optionA": {
      "text": "낡은 시설을 고쳐 지금의 불편을 없앤다",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "새 기술·인프라에 투자해 앞날을 바꾼다",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-F3",
    "kind": "anchor",
    "fieldId": null,
    "axis": "future",
    "prompt": "나라가 빚을 내야 할 때, 더 납득이 가는 쪽은?",
    "optionA": {
      "text": "지금 국민이 겪는 어려움을 막기 위해",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "다음 세대가 쓸 기반을 미리 만들기 위해",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-G1",
    "kind": "anchor",
    "fieldId": null,
    "axis": "growth",
    "prompt": "정부가 국민 삶을 나아지게 하는 더 좋은 방법은?",
    "optionA": {
      "text": "소득이 적은 가구에 직접 지원한다",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "일자리를 만드는 기업과 산업을 지원한다",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-G2",
    "kind": "anchor",
    "fieldId": null,
    "axis": "growth",
    "prompt": "세금이 1조 원 더 걷혔습니다. 어떻게 하시겠습니까?",
    "optionA": {
      "text": "그 돈으로 공공 서비스를 늘린다",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "세금을 줄여 국민이 직접 쓸 돈을 늘린다",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-G3",
    "kind": "anchor",
    "fieldId": null,
    "axis": "growth",
    "prompt": "격차 문제를 푸는 더 나은 길은?",
    "optionA": {
      "text": "가진 쪽에서 걷어 부족한 쪽에 나눈다",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "전체 파이를 키워 모두의 몫을 늘린다",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-U1",
    "kind": "anchor",
    "fieldId": null,
    "axis": "universal",
    "prompt": "복지 예산을 쓰는 더 나은 방식은?",
    "optionA": {
      "text": "도움이 절실한 사람을 골라 두텁게 지원",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "모든 국민에게 조금씩 고르게 지원",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-U2",
    "kind": "anchor",
    "fieldId": null,
    "axis": "universal",
    "prompt": "지원 대상을 정하는 방식은?",
    "optionA": {
      "text": "자격을 심사해 꼭 필요한 사람에게만",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "심사 없이 누구나 받을 수 있게",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  },
  {
    "id": "ANC-U3",
    "kind": "anchor",
    "fieldId": null,
    "axis": "universal",
    "prompt": "예산이 한정돼 있을 때 더 공정한 쪽은?",
    "optionA": {
      "text": "가장 어려운 사람에게 몰아주는 것",
      "group": null,
      "score": -2
    },
    "optionB": {
      "text": "모두가 똑같이 나눠 갖는 것",
      "group": null,
      "score": 2
    },
    "discrimination": 5
  }
];

export const FIELD_SURVEY_QUESTIONS = SURVEY_QUESTIONS.filter(
  (question) => question.kind === "field",
);

export const COMMON_ANCHOR_QUESTIONS = SURVEY_QUESTIONS.filter(
  (question) => question.kind === "anchor",
);

export function getSurveyQuestions(selectedFieldIds: string[]) {
  return [
    ...selectedFieldIds.flatMap((fieldId) =>
      FIELD_SURVEY_QUESTIONS.filter((question) => question.fieldId === fieldId),
    ),
    ...COMMON_ANCHOR_QUESTIONS,
  ];
}

export function calculateQuestionScore(
  question: SurveyQuestion,
  response: number,
) {
  const ratio = (response - 1) / 5;
  return (
    question.optionA.score +
    ratio * (question.optionB.score - question.optionA.score)
  );
}

export function calculateSurveyScore(
  questions: SurveyQuestion[],
  answers: SurveyAnswers,
): AxisProfile {
  const result: AxisProfile = { future: 0, growth: 0, universal: 0 };

  for (const axis of ["future", "growth", "universal"] as AxisKey[]) {
    const answered = questions
      .filter((question) => question.axis === axis)
      .map((question) => {
        const response = answers[question.id];
        if (response === undefined) return null;
        return {
          score: calculateQuestionScore(question, response),
          weight: question.discrimination,
        };
      })
      .filter(
        (
          item,
        ): item is {
          score: number;
          weight: number;
        } => item !== null,
      );

    const weightTotal = answered.reduce(
      (total, item) => total + item.weight,
      0,
    );
    const weightedTotal = answered.reduce(
      (total, item) => total + item.score * item.weight,
      0,
    );
    const rawScore = weightTotal ? weightedTotal / weightTotal : 0;
    result[axis] = Math.round((rawScore / 2) * 1000) / 10;
  }

  return result;
}

export function getWeakAxes(scores: AxisProfile) {
  return (["future", "growth", "universal"] as AxisKey[]).filter(
    (axis) => Math.abs(scores[axis]) < 5,
  );
}

