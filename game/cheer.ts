/*
  창립행사 응원판(사용자 10-26 「주점판에만」「광장 오른쪽에 글 남기는 곳 새로 판 세워서」) — 후원주점판 `?pub` 에만 서는 판.
  응원은 두 곳에서 온다 —
  · 행사 페이지(event.action.or.kr) 「이 사업을 응원해요」 의 구글 폼 응답 시트 — 서버가 읽기만 한다(server/gas.ts readFormCheers).
  · 이 판에서 바로 적은 글 — 쪽지 탭에 출처 cheer 로(api.ts /cheers). 게임 의견(쪽지판, 출처 pub)과는 따로.
  폼과 같게 세 사업 중 하나를 고르고 300자까지, 판에는 다 보인다(사용자 「길이는 다 보여줄거야」 「세 사업 중 고름」).
  숨기기는 시트에서 — 바로 적은 글은 쪽지 탭 숨김 칸, 폼 응원은 응답 시트 맨 오른쪽에 머리글 「숨김」 칸을 더해 거기에 아무거나.
  이 파일은 서버도 부른다 — 화면 것(DOM)은 cheer-board.ts.
*/
import type { Pick } from './look';

/** 폼의 선택지 글과 똑같아야 한다 — 응답 시트에서 이 이름으로 사업을 찾는다(fundraising-pub-page tools/create-cheer-form.js). */
export const CHEER_PROJECTS = { award: '밑빠진 독상', local: '우리동네 예산 지킴이', future: '우리사회 미래대응' } as const;
export type CheerProject = keyof typeof CHEER_PROJECTS;
export const isCheerProject = (v: unknown): v is CheerProject => typeof v === 'string' && Object.hasOwn(CHEER_PROJECTS, v);
export const CHEER_MAX = 300;
/** 행사장에서 세 사업을 다 응원할 수 있게 쪽지(10분)보다 짧게 — 도배만 막는다. */
export const CHEER_GAP_MS = 60 * 1000;
// ponytail: 판에 새것부터 이만큼만 — 행사 하루 치는 넉넉하다. 넘치면 「더 보기」.
export const CHEERS_SHOW = 200;
/** 판에 보이는 응원 한 장. pick 이 없으면 폼에서 온 것(화면이 번호로 모습을 지어 준다). */
export type PublicCheer = { id: string; at: number; name: string; pick?: Pick; project: CheerProject; text: string };
