/*
  응답에 같이 싣는 값 — 좌우 뒤집기와 응답 시간(옛 설문 app/survey-response.ts 에서 게임이 쓰던 것만 옮김, 10-20 옛 설문을 지우며).
  계산은 그대로다(저장 쪽이 화면 순서를 되짚어 보므로 바뀌면 안 된다).
*/
type Answers = Record<string, number>;
type ResponseMeta = Record<string, { displayResponse: number; displayOrder: 'AB' | 'BA'; responseTimeMs: number }>;

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
  questions: { id: string }[];
  answers: Answers;
  timing: SurveyTiming;
  sessionId: string;
}): ResponseMeta {
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
