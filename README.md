# budget-mbti-survey

`budget-mbti`의 5·6부 성향 설문을 별도 사이트로 분리하기 위한 로컬
스캐폴드입니다. 현재 단계는 디자인이나 제품 규칙을 정하는 작업이 아니라,
원문 보존과 독립 빌드·D1 준비까지만 담당합니다.

## 현재 상태 (2026-08-19, Claude 작업분)

- **설문이 실제로 돌아갑니다.** 첫 화면 → 15문항 → 유형 결과까지 이어집니다.
- 모두에게 **같은 15문항**을 냅니다(`app/survey-selection.ts`). 축마다 5문항씩,
  공통 9문항 + 서로 다른 6개 분야에서 뽑은 6문항입니다.
- **문항은 하나도 지우지 않았습니다.** 원본 99문항은 `survey-v3-data.ts`에
  그대로 있고, 분야를 먼저 고르게 하던 옛 방식(`getSurveyQuestions`)도
  살아 있습니다. 계획이 바뀌면 고정 목록만 갈아 끼우면 됩니다.
- 떼어 온 5·6부 JSX 원문은 `handoff/extracted-step5-step6.tsx.txt`에 그대로
  보존하고, 실행되는 화면은 `app/SurveyApp.tsx`에 새로 짰습니다.
- 원본 `globals.css`에서 설문·결과 화면에 쓰는 규칙만 떠 왔습니다(2,227줄).

### 인계 시점 상태

- 원본 저장소 기준: `e0ae3048b0d7e69cdd9b7960422a200d94faff52`
- `survey-v3-data.ts`의 99문항과 `scoring.ts`를 바이트 단위로 복사했습니다.
- `TYPE_MAP`, `AXES`, `TYPE_HIGHLIGHTS`를 원문 그대로 추출했습니다.
- `BudgetGame.tsx`에는 `SurveyQuestionCard`와 `step === 5`, `step === 6`
  JSX만 기계적으로 추출했습니다.
- D1에는 `responses`, `validation_responses` 두 테이블만 선언하고 새 초기
  마이그레이션을 생성했습니다.
- 기존 Cloudflare 프로젝트, 기존 D1, 기존 도메인에는 아무 작업도 하지
  않았습니다.

## 의도적으로 비워 둔 부분

- `.openai/hosting.json`에는 논리 D1 바인딩 `DB`만 있고 `project_id`가 없습니다.
- 도메인, Sites 프로젝트, 실제 D1 리소스, 배포는 생성하지 않았습니다.
- `/api/responses`는 아직 라우트로 마운트하지 않았습니다. 원문은
  `handoff/locked/api-responses-route.ts.txt`에 잠가 두었습니다.
- `/api/subscriptions`도 만들지 않았으므로 현재 404가 맞습니다.
- `getSurveyQuestions`의 선택 분야 종속 규칙은 그대로입니다.
- 5·6부 화면 문구는 수정하지 않았습니다.
- `app/BudgetGame.tsx`는 Claude가 진입 규칙과 API 규칙을 정할 때까지
  `app/page.tsx`에서 마운트하지 않습니다.
  → **해소됨.** 실행 대상 밖(`handoff/extracted-step5-step6.tsx.txt`)으로
  옮기고, 타입 검사에서 파일 하나를 빼 두던 `tsconfig.json`의 예외도
  없앴습니다. 이제 모든 소스가 검사를 받습니다.

## 로컬 실행

Node.js `22.13.0` 이상이 필요합니다.

```bash
npm ci
npm run verify:extraction
npm run dev
```

검증 명령:

```bash
npm run build
npm test
npx tsc --noEmit
```

스키마를 바꾼 경우에만 `npm run db:generate`로 새 마이그레이션을
생성합니다.

## 남은 일

1. ~~설문 진입 전에 분야를 받을지~~ → 분야 없이 고정 15문항으로 정했습니다.
2. **`/api/responses`의 예산 합계·필수 필드 검증** — 아직 그대로입니다. 배분
   합계 9만/1만/10만 원을 강제하므로 설문만으로는 저장할 수 없습니다. 응답을
   보낼 payload는 `SurveyApp.tsx`의 `pendingSubmission`에 이미 준비돼 있습니다.
3. `responses` 테이블에서 배분 컬럼 걷어내기 (2번과 함께)
4. 구독을 설문 응답과 어떤 키로 연결할지
5. 결과 화면 공유·결과 이미지 (원본의 이미지 저장 버튼은 예산 편성표를 찍던
   것이라 그대로 못 씁니다)

원문과 추출 결과의 대조 정보는 `handoff/SOURCE-MANIFEST.md`에 있습니다.
