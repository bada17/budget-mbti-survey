/*
  게임 서버 부르기. 서버가 없거나 늦으면 조용히 undefined — 그때는 혼자 걷는 판으로 그대로 돈다.
  규칙은 api.ts 에 있다.

  두 가지 서버 —
  · 개발 서버(npm run dev:game): ./api/game/… 그대로.
  · 구글 시트(앱스 스크립트 웹 앱): 빌드할 때 VITE_GAME_API 에 웹 앱 주소(…/exec)를 주면 그리로 간다(README 「구글 시트 서버」).
    앱스 스크립트는 주소 뒤 길을 못 받아서 ?p=/stats 처럼 넘기고, 응답 코드도 못 정해서 { status, body } 로 싸서 온다.
    POST 는 text/plain 으로 보낸다 — application/json 이면 브라우저가 먼저 OPTIONS 를 묻는데 앱스 스크립트는 그걸 못 받는다.
*/
import { CONTENT_VERSION } from './content';
import type { Stats, RegionView, Visit, VillageView, PublicNote, PublicCard, CardKind } from './api';
import type { ContactPayload } from './contact';
import type { Neighbor, Region, Save } from './profile';
import type { Pick } from './look';
import type { CheerProject, PublicCheer } from './cheer';
import type { Store, HitKind } from './api';
import { source, type Source } from './source';

const GAS: string | undefined = import.meta.env?.VITE_GAME_API || undefined;

/**
 * 마지막 요청이 실패한 까닭 — 서버가 준 error(「not-finished」·「coin-day」…), 닿지 못했으면 'network'. 실패를 그 까닭대로 알리려고(10-20 동전 —
 * 무슨 까닭이든 「하루 10개까지」 라고 떠서 서버에 판이 없는 사람이 헤맸다). ponytail: 하나뿐이라 겹친 요청이 덮을 수 있다 — 기다린 바로 뒤에 읽을 것.
 */
let failed = '';
export const lastFailure = () => failed;
let inspection: { store: Store; handle: typeof import('./api').handle } | undefined;

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T | undefined> {
  failed = '';
  if (inspection) {
    const result = inspection.handle(inspection.store, method, path, body, Date.now());
    if (result.status < 400) return result.body as T;
    failed = String((result.body as { error?: string }).error ?? result.status);
    return undefined;
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), GAS ? 12000 : 4000); // 앱스 스크립트는 처음 깨어날 때 몇 초 걸린다
  try {
    const response = await fetch(GAS ? `${GAS}?p=${encodeURIComponent(path)}` : `./api/game${path}`, {
      method, signal: abort.signal,
      headers: body === undefined ? undefined : { 'content-type': GAS ? 'text/plain;charset=utf-8' : 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!GAS) {
      const json = await response.json().catch(() => undefined);
      if (response.ok) return json as T;
      failed = String((json as { error?: unknown } | undefined)?.error ?? response.status);
      return undefined;
    }
    if (!response.ok) { failed = String(response.status); return undefined; }
    const wrapped = await response.json() as { status: number; body: T };
    if (wrapped.status < 400) return wrapped.body;
    failed = String((wrapped.body as { error?: unknown } | undefined)?.error ?? wrapped.status);
    return undefined;
  } catch { failed = 'network'; return undefined; } finally { clearTimeout(timer); }
}

export const net = {
  pubNote: (input: { device: string; name: string; pick: Pick; text: string }) => call<{ ok: true }>('POST', '/village/pub-notes', input),
  // 창립행사 응원판(후원주점판) — 로그인 없이 보기·쓰기. 쓰면 새 목록이 돌아온다.
  cheers: () => call<{ cheers: PublicCheer[] }>('GET', '/cheers'),
  cheer: (input: { device: string; project: CheerProject; name: string; pick: Pick; text: string }) => call<{ cheers: PublicCheer[] }>('POST', '/cheers', input),
  /** 실제 서버에서 확인한 관리자만 점검을 연다. 그 뒤의 요청은 이 페이지 메모리에서만 처리한다. */
  startInspection: async (key: string) => {
    const resident = await call<{ save: Save; admin: boolean }>('POST', '/me', { key });
    if (!resident?.admin) return false;
    const { createStore, handle } = await import('./api');
    const store = createStore();
    store.residents.set(`google:${'0'.repeat(64)}`, { key, save: {}, at: Date.now(), admin: true });
    inspection = { store, handle };
    return true;
  },
  stats: () => call<Stats>('GET', '/stats'),
  finish: (sessionId: string, answers: Record<string, number>) => call<Stats>('POST', '/finish', { sessionId, contentVersion: CONTENT_VERSION, answers, src: source() }),
  /** 유입 한 줄(들어옴·보냄) — 실패해도 조용히. 끝까지는 finish 가 싣는다. */
  hit: (kind: Exclude<HitKind, 'finish'>, sessionId: string, src: Source = source()) =>
    call<{ ok: true }>('GET', `/hit/${kind}/${sessionId}/${[src.source, src.medium, src.campaign].map(t => encodeURIComponent(t || '-')).join('/')}`),
  // 다시 올 이유(10-14)
  newHome: () => call<{ id: string; key: string }>('POST', '/homes', {}),
  visit: (home: string, visitor: { sessionId: string; name: string; pick: Pick }) => call<{ ok: true }>('POST', `/homes/${home}/visits`, visitor),
  book: (home: string, key: string) => call<{ visits: Omit<Visit, 'sessionId'>[] }>('POST', `/homes/${home}/book`, { key }),
  regionView: (region: Region) => call<RegionView>('GET', `/regions/${encodeURIComponent(region)}`),
  contact: (payload: ContactPayload, extra: { neighbor?: Neighbor; type?: string }) => call<{ ok: true }>('POST', '/contact', { payload, ...extra }),
  // 마을(기획 4차) — 들르기(끝낸 판만, 보기와 같은 값을 돌려준다)·쪽지(로그인 열쇠로, 10-19)·나도·신고·숨기기(관리자)
  village: (sessionId?: string) => call<VillageView>('GET', sessionId ? `/village/${sessionId}` : '/village'),
  here: (sessionId: string, pick: Pick) => call<VillageView>('POST', '/village/here', { sessionId, pick }),
  note: (key: string, note: { sessionId?: string; name: string; pick: Pick; text: string; region?: Region }) => call<{ note: PublicNote; view: VillageView }>('POST', '/village/notes', { key, ...note }),
  hide: (key: string, id: string) => call<{ ok: true }>('POST', `/village/notes/${id}/hide`, { key }),
  like: (sessionId: string, id: string) => call<{ likes: number }>('POST', `/village/notes/${id}/like`, { sessionId }),
  report: (key: string, id: string) => call<{ ok: true }>('POST', `/village/notes/${id}/report`, { key }),
  cards: () => call<{ cards: PublicCard[] }>('GET', '/cards'),
  react: (id: string, voter: string, kind: CardKind) => call<{ card: PublicCard }>('POST', `/cards/${encodeURIComponent(id)}/react`, { voter, kind }),
  coins: (sessionId: string, n: number) => call<{ took: number; view: VillageView }>('POST', '/village/coins', { sessionId, n }),
  // 로그인(10-14) — 확인은 서버가 카카오·구글에 묻는다. 그다음은 열쇠로.
  login: (proof: { provider: string; redirectUri: string; code?: string; idToken?: string; nonce?: string }) => call<{ key: string; save: Save; email?: string; admin?: boolean }>('POST', '/login', proof),
  me: (key: string) => call<{ save: Save; admin: boolean }>('POST', '/me', { key }),
  saveMe: (key: string, save: Save) => call<{ ok: true }>('POST', '/me/save', { key, save }),
  forget: (key: string) => call<{ ok: true }>('POST', '/me/forget', { key }),
};
