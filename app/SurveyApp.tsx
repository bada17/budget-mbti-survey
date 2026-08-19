"use client";

import {
  useCallback,
  useEffect,
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
  한 번 튑니다. 그래서 서버 쪽에는 빈 값을 주고(아래 useSyncExternalStore의
  세 번째 인자), 브라우저에서 처음 물어볼 때 한 번만 만들어 계속 씁니다.

  다시 하기를 누르면 새로 발급합니다. 세션이 그대로면 선택지 좌우 배치도
  그대로라, 두 번째 시도에서 아까 본 것과 똑같은 화면을 마주하게 됩니다.
  같은 배치를 다시 보면 앞서 누른 자리가 기억나 그대로 따라 누르기 쉽습니다.
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

function describeAxisScore(score: number, axis: (typeof AXES)[number]) {
  if (Math.abs(score) < 0.05) return "가운데 0";
  return `${axisSide(score, axis)} ${Math.round(Math.abs(score) * 10) / 10}`;
}

function SurveyQuestionCard({
  question,
  index,
  sessionId,
  answer,
  onAnswer,
  onVisible,
}: {
  question: SurveyQuestion;
  index: number;
  sessionId: string;
  answer: number | undefined;
  onAnswer: (value: number) => void;
  onVisible: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const visibilityRecorded = useRef(false);
  const swapped = shouldSwapSurveyOptions(sessionId, question.id);
  const leftOption = swapped ? question.optionB : question.optionA;
  const rightOption = swapped ? question.optionA : question.optionB;
  const displayedAnswer =
    answer === undefined ? undefined : swapped ? 7 - answer : answer;
  const fieldName = question.fieldId
    ? FIELD_NAMES[question.fieldId]
    : "모두에게 묻는 공통 질문";

  useEffect(() => {
    const card = cardRef.current;
    if (!card || visibilityRecorded.current) return;
    if (!("IntersectionObserver" in window)) {
      visibilityRecorded.current = true;
      onVisible();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || visibilityRecorded.current) return;
        visibilityRecorded.current = true;
        onVisible();
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [onVisible]);

  return (
    <article
      ref={cardRef}
      className={`survey-question-card ${answer !== undefined ? "is-answered" : ""}`}
      id={`survey-question-${question.id}`}
    >
      <header>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <small>{fieldName}</small>
          <h2>{question.prompt}</h2>
        </div>
      </header>
      <div className="survey-option-poles">
        <div>
          <span>왼쪽 선택</span>
          <strong>{leftOption.text}</strong>
          {leftOption.group && <small>{leftOption.group}</small>}
        </div>
        <div>
          <span>오른쪽 선택</span>
          <strong>{rightOption.text}</strong>
          {rightOption.group && <small>{rightOption.group}</small>}
        </div>
      </div>
      <div
        className="likert-scale"
        role="radiogroup"
        aria-label={`${question.prompt} 응답`}
      >
        <small>왼쪽에 가까움</small>
        {[1, 2, 3, 4, 5, 6].map((value) => (
          <button
            type="button"
            key={value}
            className={displayedAnswer === value ? "is-selected" : ""}
            onClick={() => onAnswer(swapped ? 7 - value : value)}
            role="radio"
            aria-checked={displayedAnswer === value}
            aria-label={`${value}점`}
          >
            {value}
          </button>
        ))}
        <small>오른쪽에 가까움</small>
      </div>
    </article>
  );
}

export default function SurveyApp() {
  const [step, setStep] = useState<"intro" | "survey" | "result">("intro");
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [timing, setTiming] = useState<SurveyTiming>({});

  const questions = useMemo(() => getFixedSurveyQuestions(), []);

  const sessionId = useSyncExternalStore(
    subscribeToSession,
    readClientSessionId,
    () => "",
  );

  const recordVisible = useCallback((questionId: string) => {
    setTiming((current) =>
      current[questionId]
        ? current
        : { ...current, [questionId]: { firstVisibleAt: Date.now() } },
    );
  }, []);

  const answerQuestion = useCallback((questionId: string, value: number) => {
    const answeredAt = Date.now();
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setTiming((current) => {
      const entry = current[questionId];
      if (!entry || entry.firstAnsweredAt) return current;
      return {
        ...current,
        [questionId]: { ...entry, firstAnsweredAt: answeredAt },
      };
    });
  }, []);

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
  const resultKeywords = AXES.map((axis) =>
    axisSide(scoreResult.score[axis.key], axis),
  );
  const axisStrengths = AXES.map((axis) =>
    readAxisStrength(scoreResult.score[axis.key]),
  );
  const clearAxisCount = axisStrengths.filter(
    (strength) => strength === "clear",
  ).length;
  const evenAxisCount = axisStrengths.filter(
    (strength) => strength === "even",
  ).length;

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

  const startSurvey = () => {
    setStep("survey");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finishSurvey = () => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restart = () => {
    setAnswers({});
    setTiming({});
    pendingSubmission.current = null;
    startNewSession();
    setStep("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (step === "intro") {
    return (
      <main className="game-shell">
        <section className="stage validation-stage">
          <div className="validation-heading">
            <div>
              <h1>
                당신은 예산을
                <br />
                어떻게 쓰는 사람입니까?
              </h1>
            </div>
            <div className="validation-explainer">
              <b>15개 질문, 2분이면 끝납니다.</b>
              <p>
                정답이 있는 질문은 하나도 없습니다. 나라 살림에서 무엇을 먼저
                할지 고르다 보면, 당신이 예산을 보는 세 가지 기준이 드러납니다.
              </p>
            </div>
          </div>

          <div className="action-dock validation-dock">
            <div>
              <span>문항</span>
              <strong>{questions.length}문항</strong>
            </div>
            <div className="survey-dock-actions">
              <button
                type="button"
                className="primary-button"
                onClick={startSurvey}
              >
                시작하기
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (step === "survey") {
    return (
      <main className="game-shell">
        <section className="stage validation-stage">
          <div className="validation-heading">
            <div>
              <h1>
                질문을 천천히 읽고
                <br />
                한 번에 답해주세요.
              </h1>
            </div>
            <div className="validation-explainer">
              <b>1부터 6까지, 더 가까운 쪽을 골라주세요.</b>
              <p>
                가운데 선택지가 없는 6점 척도입니다. 어느 쪽도 아니라고 답할 수
                없게 한 것은, 애매한 답이 쌓이면 아무것도 읽어낼 수 없기
                때문입니다.
              </p>
            </div>
          </div>

          <div className="validation-progress">
            <span>응답 완료</span>
            <strong>
              {answeredCount} / {questions.length}
            </strong>
            <i>
              <em
                style={{
                  width: `${(answeredCount / questions.length) * 100}%`,
                }}
              />
            </i>
          </div>

          <div className="validation-questions">
            {questions.map((question, index) => (
              <SurveyQuestionCard
                key={question.id}
                question={question}
                index={index}
                sessionId={sessionId}
                answer={answers[question.id]}
                onVisible={() => recordVisible(question.id)}
                onAnswer={(value) => answerQuestion(question.id, value)}
              />
            ))}
          </div>

          <div className="action-dock validation-dock">
            <div>
              <span>전체 응답</span>
              <strong>
                {complete
                  ? `${questions.length}문항 완료`
                  : `${questions.length - answeredCount}문항 남음`}
              </strong>
            </div>
            <div className="survey-dock-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!complete}
                onClick={finishSurvey}
              >
                {complete ? "결과 보기" : "모든 질문에 답해주세요"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      <section className={`result-screen result-type-${scoreResult.code}`}>
        <div className="result-halo halo-left" />
        <div className="result-halo halo-right" />
        <div className="result-topline">
          <span className="wordmark light">
            <span className="wordmark-dot" />
            예산 성향 설문
          </span>
          <span>SCORING · {SCORING_VERSION.toUpperCase()}</span>
        </div>

        <div className="result-main">
          <span className="result-for">당신의 예산 성향 유형</span>
          <div className="result-code">{scoreResult.code}</div>
          <h1>{scoreResult.type.nickname}</h1>
          <p>{scoreResult.type.description}</p>
          <div className="result-personality-line">
            <span aria-hidden="true">{resultHighlight.symbol}</span>
            <strong>{resultHighlight.line}</strong>
          </div>
          <div className="result-label">{scoreResult.type.label}</div>
          <div className="result-keywords" aria-label="나의 핵심 예산 성향">
            {resultKeywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </div>

        <div className="result-card-grid">
          <article className="axis-card">
            <span className="card-eyebrow">당신의 세 가지 기준</span>
            <div className="axis-list">
              {AXES.map((axis) => {
                const raw = scoreResult.score[axis.key];
                const position = Math.max(4, Math.min(96, 50 + raw / 2));
                const strength = readAxisStrength(raw);
                return (
                  <div className="axis-row" key={axis.key}>
                    <div className="axis-labels">
                      <span className={raw < 0 ? "is-strong" : ""}>
                        {axis.negative}
                      </span>
                      <strong>
                        {strength === "even"
                          ? "반반"
                          : `${raw >= 0 ? axis.positive : axis.negative} ${Math.round(Math.abs(raw))}`}
                      </strong>
                      <span className={raw >= 0 ? "is-strong" : ""}>
                        {axis.positive}
                      </span>
                    </div>
                    <div className="axis-track">
                      <i />
                      <b style={{ left: `${position}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="story-card">
            <span className="card-eyebrow">이번 판정이 만들어진 방식</span>
            <ol>
              <li>
                <span>자료</span>
                <p>
                  모두에게 동일한{" "}
                  <strong>{questions.length}개 설문 응답</strong>만
                  사용했습니다.
                </p>
              </li>
              <li>
                <span>기준</span>
                <p>
                  참여자 분포로 줄을 세우지 않습니다. 기준선은 <strong>0에
                  고정</strong>이라 어제 받은 결과가 오늘 달라지지 않습니다.
                </p>
              </li>
              <li>
                <span>결과</span>
                <p>
                  세 가치축으로 환산해 <strong>{scoreResult.code}</strong> 유형을
                  찾았습니다.
                </p>
              </li>
            </ol>
          </article>
        </div>

        {/*
          숫자보다 축별 이야기를 앞에 둡니다. "신뢰도 24"는 그 자체로 아무
          뜻이 아니고, 어느 축이 뚜렷하고 어느 축이 반반이었는지가 실제로
          읽을 수 있는 정보입니다. 기준은 survey-response.ts에 근거와 함께
          적어 두었습니다.
        */}
        <div className="confidence-pill">
          판정 신뢰도 <strong>{scoreResult.confidence}</strong>
          <span>
            {clearAxisCount === 3
              ? "세 축 모두 방향이 뚜렷합니다"
              : clearAxisCount > 0
                ? `${clearAxisCount}개 축은 뚜렷하고, 나머지는 가운데에 가깝습니다`
                : evenAxisCount === 3
                  ? "세 축 모두 가운데에 가깝습니다. 유형 경계에 있는 결과입니다"
                  : "어느 축도 강하게 기울지 않았습니다"}
          </span>
        </div>

        <article className="validation-result-card">
          <div>
            <span>설문 기반 세 가치축</span>
            <strong>100%</strong>
            <p>아래 점수는 오직 설문 응답으로만 계산됩니다.</p>
          </div>
          <div className="validation-axis-compare">
            {AXES.map((axis) => (
              <div key={axis.key}>
                <span>
                  {axis.negative} ↔ {axis.positive}
                </span>
                <b>설문 {describeAxisScore(scoreResult.score[axis.key], axis)} / 100</b>
              </div>
            ))}
          </div>
        </article>

        <div className="result-actions">
          <button type="button" className="restart-button" onClick={restart}>
            다시 해보기
          </button>
        </div>
      </section>
    </main>
  );
}
