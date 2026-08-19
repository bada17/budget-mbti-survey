# budget-mbti-survey

`budget-mbti`의 5·6부 성향 설문을 별도 사이트로 분리하기 위한 로컬
스캐폴드입니다. 현재 단계는 디자인이나 제품 규칙을 정하는 작업이 아니라,
원문 보존과 독립 빌드·D1 준비까지만 담당합니다.

## 현재 상태

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

## Claude가 이어서 결정할 사항

1. 설문 진입 전에 분야를 받을지, 다른 문항 선택 규칙을 둘지
2. `/api/responses`의 예산 합계·필수 필드 검증을 어떻게 바꿀지
3. 구독을 설문 응답과 어떤 키로 연결할지
4. 5·6부 화면 전체 문구와 별도 사이트의 이름·도메인

원문과 추출 결과의 대조 정보는 `handoff/SOURCE-MANIFEST.md`에 있습니다.
