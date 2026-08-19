# Source manifest

원본 저장소: `https://github.com/bada17/budget-mbti.git`
원본 커밋: `e0ae3048b0d7e69cdd9b7960422a200d94faff52`

## 원본 SHA-256

| 원본 경로 | SHA-256 |
| --- | --- |
| `app/survey-v3-data.ts` | `AB09E0F478B532AB975E9F10E616CFD69AA5DF66252D01A7B2F3ECE75458E1D7` |
| `app/scoring.ts` | `BA6ED25C71A3FE1BA0BA09EAD4C9BDEA73F3C3FF3968F779E025AE9A73EC7FC8` |
| `app/budget-data.ts` | `6A7C3896DD255BBC87990010F3CD1A6878651DCB0918AC621D85152D12438110` |
| `app/experience-data.ts` | `7FFDE739D81D1074DA2C21B93C9D01C5C2741CBEAD3728083F46F971CAC5AE87` |
| `app/BudgetGame.tsx` | `0FF2C1DD38BB47D18A88214691831B5326D52F834D837C9D5765342EF064DC14` |
| `db/schema.ts` | `EEA0AA0DE5A5FAC649CF45547BD7EF76DFFF677553A37A3AEBF982826B9A9B57` |
| `app/api/responses/route.ts` | `83679128D8B57CB592B69760457505559AE664FCB4A534745412AC213DB5B8CB` |

## 이동 방식

- `app/survey-v3-data.ts`, `app/scoring.ts`: 전체 파일 복사
- `app/budget-data.ts`: 필요한 타입 배선 뒤 `TYPE_MAP`, `AXES` 원문 삽입
- `app/experience-data.ts`: `TYPE_HIGHLIGHTS` 원문 삽입
- `app/BudgetGame.tsx`: `SurveyQuestionCard`와 5·6부 JSX 원문을 래퍼 안에 삽입
- `db/schema.ts`: `responses`, `validationResponses` 원문 삽입
- `handoff/locked/*.txt`: 원본 전체를 실행 대상 밖에 보존

`npm run verify:extraction`은 99문항 수, 전체 파일 해시, 추출된 상수·JSX·
스키마를 위 원본과 대조합니다.
