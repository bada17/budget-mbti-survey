/*
  후원주점판 `?pub`(사용자 10-26 「소개 페이지 말고 바로 게임으로, 6문항만」) — 테이블 QR 로 들어온다.
  길을 동네 입구·골목(공통 두 구간, 축마다 두 문항)으로 줄인다 — 10-27 오전 네 문항으로 줄였다가 오후에 사용자 「다시 6개로」.
  문항·판정(content.ts·score.ts)은 그대로 — 길 목록만 이 페이지에서 짧게.
  ⚠️ ROUTE 로 목록을 미리 만들어 두는 파일(response.ts orderedQuestions·profile.ts TOWN_IDS)이 직접 이 파일을 부른다.
  main.ts 맨 앞에서 부르는 걸로는 안 됐다 — 개발판은 됐지만 구운 판은 파일을 묶으며 차례가 바뀌어 15문항 그대로였다(10-26).
  저장은 안 한다(main.ts 의 PUB 자리) — 한 방에서 같이 끝내면 서버 잠금에 걸리고, 짧은 판이 본편 「지난번 판」 이 되면 본편을 안 걷게 된다.
*/
import { ROUTE } from './content';

export const PUB = typeof location !== 'undefined' && new URLSearchParams(location.search).has('pub');
if (PUB) ROUTE.splice(0, ROUTE.length, ...ROUTE.filter(stage => stage.area === '동네 입구' || stage.area === '골목'));
