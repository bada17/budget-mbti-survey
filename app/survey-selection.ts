import {
  SURVEY_QUESTIONS,
  getSurveyQuestions,
  type SurveyQuestion,
} from "./survey-v3-data";

/*
  문항은 하나도 지우지 않았습니다.

  `survey-v3-data.ts`의 99문항(분야별 6문항 × 15분야 + 공통 9문항)은 원본
  그대로 남아 있고, 이 파일은 그중 무엇을 낼지 "고르기만" 합니다. 계획이
  바뀌면 아래 목록만 갈아 끼우면 되고, 분야를 먼저 고르게 하는 옛 방식도
  `getSurveyQuestions`가 그대로 살아 있어 언제든 되돌릴 수 있습니다.

  왜 분야 선택을 뺐나. 예산 게임 뒤에 붙어 있을 때는 앞에서 고른 분야가
  있었지만, 설문만 하는 사이트에는 그 단계가 없습니다. 분야를 새로 묻자니
  단계가 하나 늘고, 무엇보다 사람마다 다른 문항을 받으면 결과를 서로 비교할
  수 없습니다. 그래서 모두에게 같은 15문항을 냅니다.

  되돌리는 법: 화면에서 `getFixedSurveyQuestions()` 대신
  `getSurveyQuestions(선택한분야들)`을 부르면 옛 방식으로 돌아갑니다.
*/

/**
 * 모두에게 내는 고정 15문항. 세 축에 5문항씩 균등하게 걸립니다.
 *
 * - 공통 9문항(ANC-*): 분야에 기대지 않고 가치만 묻는 문항입니다. 변별도가
 *   가장 높아(5) 판정의 뼈대가 됩니다. 축마다 3개씩.
 * - 분야 6문항: 축마다 2개씩, **서로 다른 6개 분야**에서 골랐습니다. 가치를
 *   추상적으로만 묻지 않고 실제 예산 항목으로 물어야 답이 흔들리지 않기
 *   때문입니다. 변별도 4 이상인 것 중에서, 국방·외교처럼 답이 진영으로
 *   갈리기 쉬운 분야는 뺐습니다.
 */
export const FIXED_SURVEY_QUESTION_IDS = [
  // ── 축 1. 점진적 미래설계 ↔ 적극적 미래설계
  "ANC-F1",
  "ANC-F2",
  "ANC-F3",
  "복지-미래설계-a", // 빈곤층 최저생활 ↔ 저출산 대응
  "보건-미래설계-a", // 감염병 대응 ↔ 보건산업·연구

  // ── 축 2. 분배 ↔ 성장
  "ANC-G1",
  "ANC-G2",
  "ANC-G3",
  "교육-성장분배-a", // 학비 지원 ↔ 대학 연구 경쟁력
  "환경-성장분배-a", // 대기질 개선 ↔ 친환경 산업 육성

  // ── 축 3. 선별 ↔ 보편
  "ANC-U1",
  "ANC-U2",
  "ANC-U3",
  "과학-보편선별-a", // 대형 프로젝트 집중 ↔ 전국 과학관에 고르게
  "문화-보편선별-b", // 예술가 집중 지원 ↔ 도서관·박물관
] as const;

const questionById = new Map(
  SURVEY_QUESTIONS.map((question) => [question.id, question]),
);

/**
 * 고정 문항을 목록 순서대로 돌려줍니다.
 *
 * 순서를 섞지 않는 이유: 공통 문항과 분야 문항이 번갈아 나오면 "같은 걸 또
 * 묻는다"는 인상을 줍니다. 축별로 묶어 두면 답하는 사람은 눈치채지 못하고
 * 넘어가고, 나중에 문항을 갈아 끼울 때도 어느 축이 비는지 바로 보입니다.
 *
 * 선택지 좌우는 여기서 섞지 않습니다. 세션마다 뒤집는 처리가 화면 쪽
 * (`shouldSwapSurveyOptions`)에 이미 있고, 서버도 그 순서를 검증합니다.
 */
export function getFixedSurveyQuestions(): SurveyQuestion[] {
  return FIXED_SURVEY_QUESTION_IDS.map((id) => {
    const question = questionById.get(id);
    if (!question) {
      // 문항 목록을 손보다 오타가 나면 조용히 문항 수가 줄어드는 대신
      // 빌드·테스트에서 바로 걸리도록 합니다.
      throw new Error(`고정 문항 목록에 없는 문항 id입니다: ${id}`);
    }
    return question;
  });
}

/** 옛 방식(분야를 먼저 고르고 그 분야 문항을 내는 것)도 그대로 둡니다. */
export { getSurveyQuestions };
