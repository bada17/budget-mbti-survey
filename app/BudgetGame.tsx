// This file is a mechanical extraction for the Claude handoff. It is not
// mounted by app/page.tsx until the pending survey-entry and API rules are set.
"use client";

import { useEffect, useRef } from "react";
import type { SurveyQuestion } from "./survey-v3-data";
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
  const displayedAnswer = answer === undefined ? undefined : swapped ? 7 - answer : answer;
  const fieldName = question.fieldId
    ? fieldById.get(question.fieldId)?.name
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
export default function BudgetGame() {
  return (
    <main>
      {step === 5 && (
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
                가운데 선택지가 없는 6점 척도입니다. 앞에서 만든 예산 편성표는
                유형 점수에 넣지 않고, 아래 설문 응답만으로 유형을 정합니다.
              </p>
              <a href="/methodology">판정 방법 자세히 보기 →</a>
            </div>
          </div>

          <div className="validation-progress">
            <span>응답 완료</span>
            <strong>{answeredSurveyCount} / {surveyQuestions.length}</strong>
            <i>
              <em
                style={{
                  width: `${(answeredSurveyCount / surveyQuestions.length) * 100}%`,
                }}
              />
            </i>
          </div>

          <section className="survey-section">
            <header className="survey-section-heading">
              <span>SECTION 01 · 선택 분야</span>
              <h2>내가 고른 분야에 관한 질문</h2>
              <p>
                {selectedFieldObjects.map((field) => field.name).join(" · ")}에서
                무엇을 우선할지 선택해주세요. 총 {selectedFieldSurveyQuestions.length}문항입니다.
              </p>
            </header>
            <div className="validation-questions">
              {selectedFieldSurveyQuestions.map((question, index) => (
                <SurveyQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  sessionId={sessionId}
                  answer={validationAnswers[question.id]}
                  onVisible={() => recordSurveyQuestionVisible(question.id)}
                  onAnswer={(value) => answerSurveyQuestion(question.id, value)}
                />
              ))}
            </div>
          </section>

          <section className="survey-section survey-anchor-section">
            <header className="survey-section-heading">
              <span>SECTION 02 · 공통 질문</span>
              <h2>모두에게 묻는 공통 질문</h2>
              <p>선택 분야와 관계없이 모든 참여자가 답하는 9문항입니다.</p>
            </header>
            <div className="validation-questions">
              {anchorSurveyQuestions.map((question, index) => (
                <SurveyQuestionCard
                  key={question.id}
                  question={question}
                  index={selectedFieldSurveyQuestions.length + index}
                  sessionId={sessionId}
                  answer={validationAnswers[question.id]}
                  onVisible={() => recordSurveyQuestionVisible(question.id)}
                  onAnswer={(value) => answerSurveyQuestion(question.id, value)}
                />
              ))}
            </div>
          </section>

          {/*
            결과 저장 직전 마지막 관문. 첫 화면에서 인증 메일을 요청하지 않고
            여기까지 온 사람에게만 보입니다. 이미 설문까지 마친 시점이라
            첫 화면에서 요구할 때보다 인증까지 이어질 가능성이 큽니다.
          */}
          {!emailConsent && !newsletterRequested && (
            <aside className="verify-recall">
              <span className="verify-recall-icon" aria-hidden="true">
                ✉
              </span>
              <div>
                <strong>이 선택이 국회로 갈 때 알려드릴까요?</strong>
                <p>
                  여기 모인 편성을 함께하는 시민행동이 분석해 국회와 소통할
                  때, 그 결과를 이메일로 보내드립니다.
                  {email ? ` ${email} 으로 보내면 될까요?` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailDraft(email);
                  setEmailModalOpen(true);
                }}
              >
                소식 받기
              </button>
            </aside>
          )}

          <div className="action-dock validation-dock">
            <div>
              <span>전체 응답</span>
              <strong>
                {validationComplete
                  ? `${surveyQuestions.length}문항 완료`
                  : `${surveyQuestions.length - answeredSurveyCount}문항 남음`}
              </strong>
            </div>
            <div className="survey-dock-actions">
              <button
                type="button"
                className="primary-button"
                disabled={!validationComplete}
                onClick={finishValidation}
              >
                {validationComplete
                  ? "설문을 반영해 결과 보기"
                  : "모든 질문에 답해주세요"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 6 && (
        <section className={`result-screen result-type-${scoreResult.code}`}>
          <div className="result-halo halo-left" />
          <div className="result-halo halo-right" />
          <div className="result-topline">
            <a
              className="wordmark light"
              href="#"
              onClick={(event) => event.preventDefault()}
            >
              <span className="wordmark-dot" />
              10만원 예산 편성 투표
            </a>
            <span>SCORING · {SCORING_VERSION.toUpperCase()}</span>
          </div>

          <div className="result-main">
            <div className="result-unlocked">
              <i />
              예산 유형 해금
            </div>
            <span className="result-for">{displayName}님의 설문 기반 예산 성향 유형</span>
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
            <div className="result-choice-evidence">
              <article>
                <i aria-hidden="true">✓</i>
                <div>
                  <small>판정 기준</small>
                  <strong>성향 설문 응답 100%</strong>
                  <span>1부 초과세수 편성 결과와 독립적으로 계산</span>
                </div>
              </article>
            </div>
          </div>

          <section className="result-share-panel result-share-primary">
            <div>
              <span>나의 예산 성향을 한 장으로</span>
              <strong>결과 카드를 이미지로 저장해보세요.</strong>
              <small>이름과 유형, 세 가지 핵심 기준만 카드에 담깁니다.</small>
            </div>
            <div className="result-share-buttons">
              <button
                type="button"
                className="share-save-button"
                onClick={downloadResultCard}
                disabled={shareStatus === "working"}
              >
                <span aria-hidden="true">↓</span>
                이미지 저장
              </button>
            </div>
            <p className={`share-status is-${shareStatus}`} role="status">
              {shareStatus === "working" && "결과 카드를 만드는 중이에요…"}
              {shareStatus === "requested" &&
                "다운로드를 요청했어요. 휴대폰 알림이나 다운로드 폴더를 확인해 주세요."}
              {shareStatus === "saved" && "결과 이미지를 저장했어요."}
              {shareStatus === "error" &&
                "이미지를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요."}
            </p>
          </section>

          <details
            className="result-deep-dive"
            onToggle={(event) => {
              if (event.currentTarget.open) {
                trackEvent("result_details_opened", 5, {
                  resultType: scoreResult.code,
                });
              }
            }}
          >
            <summary>
              <span>
                <small>선택 과정과 점수가 궁금하다면</small>
                <strong>내 예산 성향 자세히 보기</strong>
              </span>
              <b aria-hidden="true">+</b>
            </summary>
            <div className="result-deep-content">
              <div className="confidence-pill">
                판정 신뢰도 <strong>{scoreResult.confidence}</strong>
                <span>
                  {scoreResult.confidence >= 65
                    ? "선택 방향이 비교적 선명합니다"
                    : scoreResult.confidence >= 35
                      ? "서로 다른 가치가 함께 나타났습니다"
                      : "축 중앙에 가까워 유형 경계에 있습니다"}
                </span>
              </div>

              <div className="result-card-grid">
            <article className="axis-card">
              <span className="card-eyebrow">당신의 세 가지 기준</span>
              <div className="axis-list">
                {AXES.map((axis) => {
                  const raw = scoreResult.score[axis.key];
                  const position = Math.max(4, Math.min(96, 50 + raw / 2));
                  return (
                    <div className="axis-row" key={axis.key}>
                      <div className="axis-labels">
                        <span className={raw < 0 ? "is-strong" : ""}>
                          {axis.negative}
                        </span>
                        <strong>
                          {raw >= 0 ? axis.positive : axis.negative}{" "}
                          {Math.round(Math.abs(raw))}
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
                    모두에게 동일한 <strong>{surveyQuestions.length}개 설문 응답</strong>만
                    사용했습니다.
                  </p>
                </li>
                <li>
                  <span>분리</span>
                  <p>
                    1부의 분야·금액·직접 제안은 <strong>유형 점수에 넣지 않았습니다.</strong>
                  </p>
                </li>
                <li>
                  <span>결과</span>
                  <p>
                    설문을 세 가치축으로 환산해 <strong>{scoreResult.code}</strong> 유형을
                    찾았습니다.
                  </p>
                </li>
              </ol>
            </article>
          </div>

              {/*
                보류: 편성 원칙 문항을 다시 쓸 때 1부 원칙과 2부 설문 결과를
                비교하는 principle-card도 함께 복원합니다.
              */}

              <article className="validation-result-card">
            <div>
              <span>설문 기반 세 가치축</span>
              <strong>100%</strong>
              <p>
                초과세수 편성은 별도의 시민 선택 기록으로 남고, 아래 점수는
                오직 설문 응답으로만 계산됩니다.
              </p>
            </div>
            <div className="validation-axis-compare">
              {AXES.map((axis) => {
                const surveyScore = scoreResult.score[axis.key];
                return (
                  <div key={axis.key}>
                    <span>
                      {axis.negative} ↔ {axis.positive}
                    </span>
                    <b>
                      설문 {describeAxisScore(surveyScore, axis)} / 100
                    </b>
                  </div>
                );
              })}
            </div>
              </article>
            </div>
          </details>

          <button
            type="button"
            className="community-reveal"
            hidden
            onClick={toggleCommunity}
            aria-expanded={showCommunity}
          >
            <div>
              <span>다른 사람들은 어떻게 편성했을까?</span>
              <strong>
                비교 데이터 보기{" "}
                <small>
                  {communityLoading
                    ? "불러오는 중"
                    : communityIsLive
                      ? `${activeCommunity.participantCount.toLocaleString()}명 실제 집계`
                      : "공동 표본 확인"}
                </small>
              </strong>
            </div>
            <b>{showCommunity ? "−" : "+"}</b>
          </button>

          {showCommunity && (
            <section className="community-panel" hidden>
              <header>
                <div>
                  <span className="card-eyebrow">COMMUNITY BUDGET PULSE</span>
                  <h2>사람들의 예산은 어디로 움직였을까요?</h2>
                </div>
                <div className="demo-badge">
                  <span>{communityIsLive ? "LIVE" : "DEMO"}</span>
                  {activeCommunity.sampleLabel}
                </div>
              </header>

              <div className="community-summary">
                <div className="same-type-stat">
                  <span>나와 같은 유형</span>
                  <strong>{sameTypePercent}%</strong>
                  <p>
                    데모 참여자 100명 중 약 {sameTypePercent}명이{" "}
                    <b>{scoreResult.type.nickname}</b> 유형입니다.
                  </p>
                </div>
                <div className="community-axis">
                  <span>나와 전체의 성향 비교</span>
                  {AXES.map((axis) => {
                    const mine = Math.round(scoreResult.score[axis.key]);
                    const average = activeCommunity.axisAverages[axis.key];
                    return (
                      <div key={axis.key}>
                        <strong>
                          {axis.negative} ↔ {axis.positive}
                        </strong>
                        <span>나 {describeAxisScore(mine, axis)}</span>
                        <span>
                          전체 {describeAxisScore(average, axis)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="community-grid">
                <article>
                  <span className="card-eyebrow">처음 선택한 분야 TOP 3</span>
                  <div className="field-ranking">
                    {activeCommunity.topFields.map((item, index) => {
                      const field = fieldById.get(item.fieldId);
                      return (
                        <div key={item.fieldId}>
                          <b>{index + 1}</b>
                          <span>{field?.name}</span>
                          <i>
                            <em style={{ width: `${item.share * 4.4}%` }} />
                          </i>
                          <strong>{item.share}%</strong>
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="movement-lists">
                  <div>
                    <span>끝까지 지킨 예산 묶음</span>
                    <ol>
                      {activeCommunity.mostProtected.map((program) => (
                        <li key={program}>{program}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <span>가장 먼저 줄인 예산 묶음</span>
                    <ol>
                      {activeCommunity.mostCut.map((program) => (
                        <li key={program}>{program}</li>
                      ))}
                    </ol>
                  </div>
                </article>
              </div>

              <p className="community-note">
                {communityIsLive ? (
                  <>
                    개인을 추론하기 어렵도록 완료 응답 20건 이상일 때만
                    공개되는 공동 집계입니다. 이름과 이메일은 포함되지
                    않습니다.
                  </>
                ) : (
                  <>
                    로컬 미리보기이거나 실제 완료 응답이 20건 미만이라 화면
                    검토용 데모를 보여줍니다. 현재 이 기기에는 완료 기록이{" "}
                    <strong>{localParticipationCount}건</strong> 있습니다.
                  </>
                )}
              </p>
            </section>
          )}

          <section className="result-feedback">
            <div>
              <span>결과 개선에 한 표 더해주세요</span>
              <h2>결과가 나와 얼마나 비슷한가요?</h2>
              <p>이 평가는 다음 판정식의 가중치와 예산 묶음 태그를 검증하는 데 씁니다.</p>
            </div>
            <div className="feedback-controls">
              <div className="rating-buttons" aria-label="결과 정확도 1점에서 5점">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    type="button"
                    key={rating}
                    className={accuracyRating === rating ? "is-selected" : ""}
                    onClick={() => setAccuracyRating(rating)}
                    disabled={feedbackSaved}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <input
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value)}
                placeholder="다르게 느껴진 점이 있다면 적어주세요 (선택)"
                maxLength={1000}
                disabled={feedbackSaved}
              />
              <button
                type="button"
                onClick={saveFeedback}
                disabled={!accuracyRating || feedbackSaved}
              >
                {feedbackSaved ? "의견 저장됨 ✓" : "의견 저장"}
              </button>
            </div>
          </section>

          <div className="result-actions">
            {!emailConsent && !newsletterRequested && (
              <button
                type="button"
                className="result-email-button"
                onClick={() => {
                  setEmailDraft(email);
                  setEmailModalOpen(true);
                }}
              >
                <span>✉</span>
                <div>
                  <strong>다음 예산 실험 소식 받기</strong>
                  <small>이메일은 선택 사항이에요</small>
                </div>
                <b>→</b>
              </button>
            )}
            {(emailConsent || newsletterRequested) && email && (
              <div className="email-saved">
                <span>✓</span>
                <div>
                  <strong>
                    {newsletterRequested
                      ? "예산 소식 및 예산 테스트 받기를 신청했습니다"
                      : "소식 신청이 기록되었습니다"}
                  </strong>
                  <small>{email}</small>
                </div>
              </div>
            )}
            <button type="button" className="restart-button" onClick={restart}>
              다른 선택으로 다시 해보기
            </button>
          </div>

          <ResultOrgCard />

          <div className={`storage-status is-${storageStatus}`}>
            <span>
              {storageStatus === "saving" && "공동 데이터베이스에 저장 중"}
              {storageStatus === "shared" && "공동 데이터베이스에 안전하게 저장됨"}
              {storageStatus === "test" &&
                "모바일 테스트 결과 · 공동 집계에서 제외"}
              {storageStatus === "chemistry-only" &&
                "친구 케미용 응답 · 공식 투표 집계에서 제외"}
              {storageStatus === "local-only" &&
                "로컬 미리보기: 이 기기에만 임시 저장됨"}
              {storageStatus === "error" &&
                "공동 저장 실패: 이 기기의 임시 기록은 유지됨"}
              {storageStatus === "idle" && "응답 저장 준비 중"}
            </span>
            <button type="button" onClick={deleteMyResponse}>
              내 응답 삭제
            </button>
          </div>

          <ResultShare
            title="10만원 예산 편성 투표 — 예산 MBTI"
            description={`${displayName}님의 예산 유형은 ${scoreResult.type.nickname}(${scoreResult.code})! 당신은 어떤 유형인가요?`}
            onShared={(channel) =>
              trackEvent("result_shared", 6, {
                channel,
                resultType: scoreResult.code,
              })
            }
          />

          <footer className="result-trust-footer">
            <a href="/methodology" onClick={openAdminOnlyPage}>판정 공식·한계</a>
            <a href="/privacy" onClick={openAdminOnlyPage}>개인정보·삭제 안내</a>
            <a href="/admin" onClick={openAdminOnlyPage}>공동 데이터 분석</a>
          </footer>
        </section>
      )}
    </main>
  );
}
