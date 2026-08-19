"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AXES } from "./budget-data";
import { TYPE_HIGHLIGHTS } from "./experience-data";
import { calculateSurveyResult, SCORING_VERSION } from "./scoring";
import {
  calculateSurveyScore,
  SURVEY_DATASET_VERSION,
  type SurveyAnswers,
  type SurveyQuestion,
  type SurveyResponseMeta,
} from "./survey-v3-data";
import { getFixedSurveyQuestions } from "./survey-selection";
import {
  buildResponseMeta,
  readAxisStrength,
  shouldSwapSurveyOptions,
  type SurveyTiming,
} from "./survey-response";
import { neighbourTypes, oppositeType, type TypeCode } from "./type-match";

/*
  분야 이름표는 문항 카드 머리에만 씁니다.

  원본에는 분야마다 사업 목록과 축 값이 딸린 큰 표가 있지만, 이 사이트는
  분야를 고르게 하지 않으므로 이름만 있으면 됩니다. 표 전체를 들고 오면
  쓰지도 않는 486개 사업이 따라옵니다.
*/
const FIELD_NAMES: Record<string, string> = {
  safety: "공공질서및안전",
  science: "과학기술",
  education: "교육",
  transport: "교통및물류",
  defense: "국방",
  land: "국토및지역개발",
  agriculture: "농림수산",
  culture: "문화및관광",
  health: "보건",
  welfare: "사회복지",
  industry: "산업·중소기업및에너지",
  reserve: "예비비",
  administration: "일반·지방행정",
  communication: "통신",
  diplomacy: "통일·외교",
  environment: "환경",
};

/*
  세션 아이디는 브라우저에서만 만듭니다.

  서버가 미리 만들어 두면 서버가 그린 화면과 브라우저가 그린 화면이 달라져
  한 번 튑니다. 그래서 서버 쪽에는 빈 값을 주고(useSyncExternalStore의 세
  번째 인자), 브라우저에서 처음 물어볼 때 한 번만 만들어 계속 씁니다.

  다시 하기를 누르면 새로 발급합니다. 세션이 그대로면 선택지 좌우 배치도
  그대로라, 두 번째 시도에서 아까 누른 자리를 그대로 따라 누르게 됩니다.
*/
let clientSessionId = "";
const sessionListeners = new Set<() => void>();

const readClientSessionId = () => {
  if (!clientSessionId) {
    clientSessionId =
      globalThis.crypto?.randomUUID?.() ??
      `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return clientSessionId;
};

const subscribeToSession = (listener: () => void) => {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
};

const startNewSession = () => {
  clientSessionId = "";
  readClientSessionId();
  for (const listener of sessionListeners) listener();
};

function axisSide(score: number, axis: (typeof AXES)[number]) {
  return score >= 0 ? axis.positive : axis.negative;
}

/*
  6점 척도를 두 번에 나눠 묻습니다.

  점수는 그대로 1~6으로 남습니다. 다만 한 번에 여섯 개 중 하나를 고르라고
  하면, 왼쪽 글과 오른쪽 글을 읽고 → 어느 쪽인지 정하고 → 얼마나인지 정하고
  → 그걸 숫자로 환산하는 네 단계를 머릿속에서 해야 합니다. 편을 먼저 고르게
  하고 세기를 따로 물으면 같은 답을 두 번의 가벼운 선택으로 얻습니다.

  가운데가 없는 것은 그대로입니다. 어느 쪽도 아니라고 답할 수 있게 하면
  그 답이 쌓여 아무것도 읽어낼 수 없게 됩니다.
*/
const INTENSITY_STEPS = [
  { label: "조금", nearer: 3 },
  { label: "많이", nearer: 2 },
  { label: "훨씬", nearer: 1 },
] as const;

/** 왼쪽을 골랐으면 1~3, 오른쪽을 골랐으면 4~6이 됩니다(화면 기준). */
const displayValueFor = (side: "left" | "right", nearer: number) =>
  side === "left" ? nearer : 7 - nearer;

function QuestionCard({
  question,
  index,
  total,
  sessionId,
  answer,
  onAnswer,
}: {
  question: SurveyQuestion;
  index: number;
  total: number;
  sessionId: string;
  answer: number | undefined;
  onAnswer: (value: number) => void;
}) {
  const swapped = shouldSwapSurveyOptions(sessionId, question.id);
  const leftOption = swapped ? question.optionB : question.optionA;
  const rightOption = swapped ? question.optionA : question.optionB;
  const displayedAnswer =
    answer === undefined ? undefined : swapped ? 7 - answer : answer;

  /** 편만 고르고 아직 세기를 안 고른 상태. */
  const [pendingSide, setPendingSide] = useState<"left" | "right" | null>(null);
  const answeredSide =
    displayedAnswer === undefined
      ? null
      : displayedAnswer <= 3
        ? ("left" as const)
        : ("right" as const);
  const side = pendingSide ?? answeredSide;

  const fieldName = question.fieldId ? FIELD_NAMES[question.fieldId] : null;

  const chooseSide = (next: "left" | "right") => {
    setPendingSide(next);
  };

  const chooseIntensity = (nearer: number) => {
    if (!side) return;
    const display = displayValueFor(side, nearer);
    setPendingSide(null);
    onAnswer(swapped ? 7 - display : display);
  };

  const chosenNearer =
    displayedAnswer === undefined
      ? null
      : displayedAnswer <= 3
        ? displayedAnswer
        : 7 - displayedAnswer;

  return (
    <article className="quiz-card">
      <header className="quiz-card-head">
        <span className="quiz-count">
          {index + 1} <i>/ {total}</i>
        </span>
        {fieldName && <span className="quiz-field">{fieldName}</span>}
      </header>

      <h1 className="quiz-prompt">{question.prompt}</h1>

      <div className="quiz-options" role="group" aria-label="선택지">
        {(["left", "right"] as const).map((position) => {
          const option = position === "left" ? leftOption : rightOption;
          return (
            <button
              type="button"
              key={position}
              className={`quiz-option ${side === position ? "is-picked" : ""} ${
                side && side !== position ? "is-dimmed" : ""
              }`}
              onClick={() => chooseSide(position)}
              aria-pressed={side === position}
            >
              <strong>{option.text}</strong>
              {option.group && <small>{option.group}</small>}
            </button>
          );
        })}
      </div>

      {/*
        편을 고르기 전에는 세기를 묻지 않습니다. 두 줄이 한꺼번에 뜨면
        여섯 개 중 하나를 고르는 것과 같아져서, 나눈 의미가 없어집니다.
      */}
      {side && (
        <div className="quiz-intensity">
          <span className="quiz-intensity-label">얼마나 그런가요?</span>
          <div role="group" aria-label="선택의 세기">
            {INTENSITY_STEPS.map((step) => (
              <button
                type="button"
                key={step.label}
                className={
                  chosenNearer === step.nearer && !pendingSide
                    ? "is-selected"
                    : ""
                }
                onClick={() => chooseIntensity(step.nearer)}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function SurveyApp() {
  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [timing, setTiming] = useState<SurveyTiming>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const shownAt = useRef<number>(0);

  const questions = useMemo(() => getFixedSurveyQuestions(), []);

  const sessionId = useSyncExternalStore(
    subscribeToSession,
    readClientSessionId,
    () => "",
  );

  const current = questions[index];

  const answerQuestion = useCallback(
    (questionId: string, value: number) => {
      const answeredAt = Date.now();
      setAnswers((existing) => ({ ...existing, [questionId]: value }));
      setTiming((existing) =>
        existing[questionId]
          ? existing
          : {
              ...existing,
              [questionId]: {
                firstVisibleAt: shownAt.current || answeredAt,
                firstAnsweredAt: answeredAt,
              },
            },
      );
      shownAt.current = answeredAt;
      setIndex((at) => Math.min(at + 1, questions.length));
    },
    [questions.length],
  );

  const answeredCount = questions.filter(
    (question) => answers[question.id] !== undefined,
  ).length;
  const complete = answeredCount === questions.length;

  const surveyScores = useMemo(
    () => calculateSurveyScore(questions, answers),
    [questions, answers],
  );
  const scoreResult = useMemo(
    () => calculateSurveyResult(surveyScores),
    [surveyScores],
  );
  const resultHighlight = TYPE_HIGHLIGHTS[scoreResult.code];
  const opposite = useMemo(
    () => oppositeType(scoreResult.code as TypeCode),
    [scoreResult.code],
  );
  const neighbours = useMemo(
    () => neighbourTypes(scoreResult.code as TypeCode),
    [scoreResult.code],
  );

  /*
    보낼 준비가 끝난 응답. 아직 보내지는 않습니다.

    저장을 나중에 붙이더라도 payload는 지금부터 같이 굴러가야 합니다. 특히
    응답 시간은 "답을 다 한 순간"에 확정되는 값이라, 나중에 저장 코드를
    붙이면서 새로 만들 수가 없습니다.
  */
  const pendingSubmission = useRef<{
    sessionId: string;
    answers: SurveyAnswers;
    responseMeta: SurveyResponseMeta;
    resultType: string;
    axisScores: typeof scoreResult.score;
    confidence: number;
    scoringVersion: string;
    surveyDatasetVersion: string;
  } | null>(null);

  const startQuiz = () => {
    shownAt.current = Date.now();
    setIndex(0);
    setStep("quiz");
    window.scrollTo({ top: 0 });
  };

  const showResult = () => {
    if (!complete) return;
    pendingSubmission.current = {
      sessionId,
      answers,
      responseMeta: buildResponseMeta({
        questions,
        answers,
        timing,
        sessionId,
      }),
      resultType: scoreResult.code,
      axisScores: scoreResult.score,
      confidence: scoreResult.confidence,
      scoringVersion: SCORING_VERSION,
      surveyDatasetVersion: SURVEY_DATASET_VERSION,
    };
    /*
      여기가 저장이 붙을 자리입니다. 위 payload를 그대로 보내면 됩니다.
      다만 지금 `/api/responses`는 배분 합계 9만/1만/10만 원을 강제로
      검증하므로 그대로는 못 씁니다. 그 검증을 걷어내는 것이 다음 작업입니다.
    */
    setStep("result");
    window.scrollTo({ top: 0 });
  };

  const goBack = () => {
    setIndex((at) => Math.max(0, at - 1));
    shownAt.current = Date.now();
  };

  const restart = () => {
    setAnswers({});
    setTiming({});
    setIndex(0);
    setDetailsOpen(false);
    pendingSubmission.current = null;
    startNewSession();
    setStep("intro");
    window.scrollTo({ top: 0 });
  };

  if (step === "intro") {
    return (
      <main className="quiz-shell">
        <section className="quiz-intro">
          <span className="quiz-kicker">예산 성향 테스트</span>
          <h1>
            당신은 나라 살림을
            <br />
            어떻게 쓰는 사람일까요?
          </h1>
          <p>
            정답이 있는 질문은 하나도 없습니다. {questions.length}개 질문에
            답하다 보면 당신이 예산을 보는 세 가지 기준이 드러납니다.
          </p>
          <button type="button" className="quiz-primary" onClick={startQuiz}>
            시작하기
          </button>
          <small className="quiz-note">
            약 2분 · 이름도 이메일도 묻지 않습니다
          </small>
        </section>
      </main>
    );
  }

  if (step === "quiz") {
    const progress = (answeredCount / questions.length) * 100;
    return (
      <main className="quiz-shell">
        <div className="quiz-progress" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>

        {current ? (
          <QuestionCard
            /*
              key에 문항 id를 두는 이유: 다음 문항으로 넘어갈 때 카드 안의
              "편만 고른 상태"가 남아 있으면, 새 질문에 이미 한쪽이 눌린
              것처럼 보입니다.
            */
            key={current.id}
            question={current}
            index={index}
            total={questions.length}
            sessionId={sessionId}
            answer={answers[current.id]}
            onAnswer={(value) => answerQuestion(current.id, value)}
          />
        ) : (
          <section className="quiz-done">
            <h1>{questions.length}개 질문에 모두 답했습니다.</h1>
            <p>이제 당신의 예산 성향을 볼 차례입니다.</p>
            <button type="button" className="quiz-primary" onClick={showResult}>
              결과 보기
            </button>
          </section>
        )}

        <div className="quiz-foot">
          {index > 0 && (
            <button type="button" className="quiz-back" onClick={goBack}>
              ← 이전 질문
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="quiz-shell">
      <section className="type-card">
        <span className="quiz-kicker">당신의 예산 성향</span>
        <div className="type-symbol" aria-hidden="true">
          {resultHighlight.symbol}
        </div>
        <h1 className="type-name">{scoreResult.type.nickname}</h1>
        <p className="type-line">{resultHighlight.line}</p>
        <p className="type-desc">{scoreResult.type.description}</p>
        <div className="type-keywords">
          {AXES.map((axis) => (
            <span key={axis.key}>
              {axisSide(scoreResult.score[axis.key], axis)}
            </span>
          ))}
        </div>
      </section>

      <section className="match-grid">
        <article className="match-card is-opposite">
          <span className="match-eyebrow">예산을 두고 부딪히는 유형</span>
          <strong>{opposite.type.nickname}</strong>
          <p>세 가지 기준이 모두 반대입니다.</p>
        </article>
        <article className="match-card">
          <span className="match-eyebrow">말이 잘 통할 유형</span>
          <ul>
            {neighbours.map((neighbour) => (
              <li key={neighbour.code}>
                <b>{neighbour.type.nickname}</b>
                <small>
                  {neighbour.mine} 대신 {neighbour.theirs}
                </small>
              </li>
            ))}
          </ul>
          <p>딱 한 가지 기준만 갈립니다.</p>
        </article>
      </section>

      {/*
        코드와 점수는 접어 둡니다. 궁금한 사람만 열어 보면 되는 것이지,
        결과를 받자마자 마주할 것은 아닙니다.
      */}
      <details
        className="type-details"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary>점수와 판정 방법 보기</summary>
        <div className="type-details-body">
          <div className="type-axes">
            {AXES.map((axis) => {
              const raw = scoreResult.score[axis.key];
              const strength = readAxisStrength(raw);
              const position = Math.max(4, Math.min(96, 50 + raw / 2));
              return (
                <div className="type-axis" key={axis.key}>
                  <div className="type-axis-labels">
                    <span className={raw < 0 ? "is-strong" : ""}>
                      {axis.negative}
                    </span>
                    <b>
                      {strength === "even"
                        ? "반반"
                        : `${axisSide(raw, axis)} ${Math.round(Math.abs(raw))}`}
                    </b>
                    <span className={raw >= 0 ? "is-strong" : ""}>
                      {axis.positive}
                    </span>
                  </div>
                  <div className="type-axis-track">
                    <i style={{ left: `${position}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <dl className="type-facts">
            <div>
              <dt>유형 코드</dt>
              <dd>{scoreResult.code}</dd>
            </div>
            <div>
              <dt>쓴 문항</dt>
              <dd>{questions.length}개 (모두에게 같음)</dd>
            </div>
            <div>
              <dt>판정 기준</dt>
              <dd>가운데 0 고정 · 참여자 분포를 보지 않음</dd>
            </div>
            <div>
              <dt>판정식</dt>
              <dd>{SCORING_VERSION}</dd>
            </div>
          </dl>
        </div>
      </details>

      <div className="quiz-foot">
        <button type="button" className="quiz-back" onClick={restart}>
          다시 해보기
        </button>
      </div>
    </main>
  );
}
