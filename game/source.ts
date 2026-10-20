/*
  어디서 들어왔나(10-21 유입 재기 — 사용자 10-15 「기억해 둬」 의 1번). 시트 「유입」 에 「들어옴 → 끝까지 → 보냄」 을 출처별로 남긴다.
  출처 = 홍보 링크 꼬리표(utm_source·utm_medium·utm_campaign, UTM 링크 시트에서 만든 것) → 없으면 친구 링크(?with=)·문제 카드(?card=) → 없으면 들어온 사이트 → (direct).
  이 브라우저에 처음 온 때 것 하나만 둔다(첫 손길) — 다시 오거나 로그인하고 돌아와도 처음 출처로 센다. 개인정보는 없다(무작위 세션 id 만 같이 간다).
*/
import { gameStorage } from './storage';

export type Source = { source: string; medium: string; campaign: string };
const KEY = 'forest-source';
const MAX = 40;
/** 시트·주소에 그대로 들어가도 되는 글자만(꼬리표는 사람이 적은 것이라 이상한 글자가 올 수 있다). */
export const cleanTag = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase().replace(/[^\w.\-가-힣 ]/gu, '').slice(0, MAX) : '');

export function sourceFrom(search: string, referrer: string, ownHost: string): Source {
  const q = new URLSearchParams(search);
  const tag = cleanTag(q.get('utm_source'));
  if (tag) return { source: tag, medium: cleanTag(q.get('utm_medium')), campaign: cleanTag(q.get('utm_campaign')) };
  if (q.has('with')) return { source: 'friend', medium: 'invite', campaign: '' };
  if (q.has('card')) return { source: 'friend', medium: 'card', campaign: '' };
  let host = '';
  try { host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; } catch { /* 이상한 referrer */ }
  if (host && host !== ownHost) return { source: cleanTag(host), medium: 'referral', campaign: '' };
  return { source: '(direct)', medium: '', campaign: '' };
}

/** 처음 온 때 출처를 두고 돌려준다. fresh = 지금 처음 왔다(「들어옴」 을 셀 때). */
export function arrival(): { src: Source; fresh: boolean } {
  try {
    const saved = JSON.parse(gameStorage.getItem(KEY) ?? 'null') as Source | null;
    if (saved && typeof saved.source === 'string') return { src: { source: cleanTag(saved.source), medium: cleanTag(saved.medium), campaign: cleanTag(saved.campaign) }, fresh: false };
  } catch { /* 망가진 값은 새로 */ }
  const src = sourceFrom(globalThis.location?.search ?? '', globalThis.document?.referrer ?? '', globalThis.location?.hostname ?? ''); // 시험(노드)엔 주소가 없다
  try { gameStorage.setItem(KEY, JSON.stringify(src)); } catch { /* 막힌 저장소 — 이번 페이지만 */ }
  return { src, fresh: true };
}

let current: Source | undefined;
/** 끝낸 판·보냄에 같이 싣는 출처. */
export const source = () => (current ??= arrival().src);
