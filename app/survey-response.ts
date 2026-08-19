import type {
  SurveyAnswers,
  SurveyQuestion,
  SurveyResponseMeta,
} from "./survey-v3-data";

/**
 * 선택지 좌우를 세션마다 뒤집습니다.
 *
 * 사람은 왼쪽에 있는 것을 조금 더 고르는 버릇이 있어서, 순서를 고정하면 그
 * 버릇이 그대로 점수에 실립니다. 세션과 문항 id를 섞어 해시로 정하므로 같은
 * 사람에게는 늘 같은 순서로 보이고(새로고침해도 안 바뀝니다), 사람마다는
 * 다릅니다.
 *
 * 원본(`BudgetGame.tsx`)의 계산을 그대로 가져왔습니다. 저장 API가 화면에
 * 보인 순서를 이 방식으로 되짚어 검증하므로, 여기 계산이 바뀌면 저장이
 * 통째로 거부됩니다.
 */
export function shouldSwapSurveyOptions(session: string, questionId: string) {
  let hash = 0;
  for (const character of `${session}:${questionId}`) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % 2 === 1;
}

export type SurveyTiming = Record<
  string,
  { firstVisibleAt: number; firstAnsweredAt?: number }
>;

/*
  "얼마나 뚜렷한가"를 말하는 기준입니다.

  원래 기준은 65 이상이면 "선명합니다", 35 미만이면 "경계에 있습니다"였는데,
  실제로는 65에 닿는 사람이 거의 없었습니다. 20만 건을 돌려보니 무작위로 답한
  경우 65 이상은 0.1%, 35 미만이 82%였습니다. 유형 이름을 크게 띄워 놓고 바로
  밑에서 "당신은 경계에 있습니다"라고 말하는 화면이 됐던 것입니다. 문항 수를
  줄여서 생긴 일이 아니라 옛 방식(분야별 15~21문항)에서도 똑같았습니다.

  그래서 답하는 사람이 얼마나 한쪽으로 기우는지에 따라 점수가 어떻게 나오는지
  다시 재고 기준을 잡았습니다. 한 방향으로 60%쯤 일관되게 답하면 중앙값이 55,
  거의 찍듯이 답하면 24가 나옵니다. 45와 20은 그 사이를 가르는 자리입니다.
*/
export const CLEAR_SCORE = 45;
export const LEANING_SCORE = 20;

/** 축 하나가 얼마나 한쪽으로 기울었는지. 화면 문구가 여기서 나옵니다. */
export function readAxisStrength(score: number) {
  const distance = Math.abs(score);
  if (distance >= CLEAR_SCORE) return "clear" as const;
  if (distance >= LEANING_SCORE) return "leaning" as const;
  return "even" as const;
}

/**
 * 저장할 때 응답과 함께 보낼 값입니다.
 *
 * 아직 보내는 곳이 없지만 처음부터 같이 굴러가야 하는 값입니다. 화면에 실제로
 * 보인 순서(`displayOrder`)와 그 순서대로 누른 점수(`displayResponse`), 문항이
 * 눈에 들어온 뒤 답하기까지 걸린 시간(`responseTimeMs`)이 없으면, 대충 찍은
 * 응답을 나중에 걸러낼 방법이 사라집니다.
 *
 * `answers`에 담기는 점수는 화면 순서가 아니라 **문항 원본 기준**입니다.
 * 좌우가 뒤집힌 문항은 화면에서 누른 값을 7에서 뺀 값이 들어갑니다.
 */
export function buildResponseMeta({
  questions,
  answers,
  timing,
  sessionId,
}: {
  questions: SurveyQuestion[];
  answers: SurveyAnswers;
  timing: SurveyTiming;
  sessionId: string;
}): SurveyResponseMeta {
  return Object.fromEntries(
    questions
      .filter((question) => answers[question.id] !== undefined)
      .map((question) => {
        const response = answers[question.id];
        const swapped = shouldSwapSurveyOptions(sessionId, question.id);
        const entry = timing[question.id];
        return [
          question.id,
          {
            displayResponse: swapped ? 7 - response : response,
            displayOrder: swapped ? ("BA" as const) : ("AB" as const),
            responseTimeMs:
              entry?.firstVisibleAt && entry.firstAnsweredAt
                ? Math.max(0, entry.firstAnsweredAt - entry.firstVisibleAt)
                : 0,
          },
        ];
      }),
  );
}
