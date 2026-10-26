/*
  로그인 — 카카오·구글 두 가지(사용자 10-14 「로그인 넣어야 새로 들어올 때 기록될 듯」 「카카오톡, 지메일로만」). 네이버는 안 넣는다(README 「로그인」).

  · 왜 — 카톡 안 브라우저와 크롬은 저장소가 따로라, 로그인 없이는 같은 사람이 다시 와도 처음 온 사람이 된다.
  · 카톡 안 브라우저에서 구글을 누르면 카톡 밖 브라우저(크롬·사파리·삼성)로 같은 주소를 열고 거기서 구글로 간다 — 구글이 앱 속 브라우저 로그인을 막는다
    (사용자 10-16 「단톡방에서 열어도 구글로그인되게」). 이어갈 진행은 밖으로 보내되, 로그인 확인 뒤 본인 기록인지 물어보고 승인할 때만 합친다. 카카오는 카톡 안에서 그대로.
  · 처음엔 묻지 않는다 — 시민센터 시민증 탭(「로그인하고 함께해요」)·시작 화면과 소개 페이지(「전에 해 봤어요」)·로그인해야 하는 자리
    (쪽지 쓰기·우리 동네 함께 — 「로그인하면 ~할 수 있어요」, 사용자 10-19)에서만. 안 해도 끝까지 한다. 그 자리에서 갔으면 돌아와 그 판을 다시 연다(Intent.back).
  · 받는 것 = 회원번호(서버가 소금 친 해시로 바꿔 둔다) + 확인된 이메일(사용자 10-15 「이메일 정도는 받을 수 있잖아」).
    이메일은 서버가 돌려주기만 하고 남기지 않는다 — 로그인 칸의 [선택] 소식 받기를 켰을 때만 로그인 직후 「소식 받기」 칸을 채우는 데 쓰고,
    동의해야 /contact 로 간다(main.ts offerNews). 그 [선택] 칸과 소식 받기 판은 연락처 칸이 켜진 판에서만 보인다(contactReady).
    구글은 scope 에 email, 카카오는 scope 없이 — 콘솔 「동의 항목」 에 켠 것만 묻는다(이메일을 안 켜면 회원번호만). 이름·사진은 안 받는다.
  · 단추는 키가 없어도 늘 보인다(사용자 10-15 「안 되더라도 집어넣어 놓으라니까」) — 키가 없을 때 누르면 start() 가 false 를 돌려주고 판이 「준비 중」 이라 알린다.
    키는 VITE_KAKAO_REST_KEY · VITE_GOOGLE_CLIENT_ID(빌드). 개발판(npm run dev:game)은 키가 없으면 가짜 카카오·구글(vite.game.config.ts 의 /fake-login)로 끝까지 돈다.

  가서 돌아오는 길: start() → 카카오/구글 화면 → 게임 주소로 돌아옴(카카오 ?code=, 구글 #id_token=) → finish() 가 서버(/login)에 확인
  → 열쇠·서버 기록을 받아 이 기기 것과 합침(profile.ts importSave) → 다시 연다(합친 기록으로 처음부터 읽게).
*/
import { net } from './net';
import { isInspectionMode } from './storage';
import { saveLogin, loadLogin, clearLogin, clearSave, importSave, exportSave, cleanSave, onWrite, type Login, type Save } from './profile';
import { TYPES } from './content';

export type Provider = Login['provider'];
const KAKAO: string | undefined = import.meta.env?.VITE_KAKAO_REST_KEY || undefined;
const GOOGLE: string | undefined = import.meta.env?.VITE_GOOGLE_CLIENT_ID || undefined;
const FAKE = Boolean(import.meta.env?.DEV);
const PENDING = 'budget-game-login-pending';
const DONE = 'budget-game-login-done';
const EMAIL = 'budget-game-login-email';
const UNSAVED = 'budget-game-login-unsaved';
const FRESH = 'budget-game-login-fresh';
const BACK = 'budget-game-login-back';
/**
 * 로그인하러 가며 남기는 것 — back = 돌아오면 다시 열 판(사용자 10-19 「로그인하면 ~할 수 있어요」 자리에서 로그인했으면 그 판으로 — 'board'·'hub'·'hub:region'),
 * news = 로그인 칸의 [선택] 소식 받기를 켰나(연락처 칸이 켜진 판에서만 보인다).
 */
export type Intent = { back?: string; news?: boolean };
export const PROVIDER_NAME: Record<Provider, string> = { kakao: '카카오', google: '구글' };

/** 카톡 안 브라우저 — 구글 로그인이 막혀서 밖으로 내보낸다(escapeKakao). */
export const inKakao = () => /KAKAOTALK/i.test(navigator.userAgent);

/** 보여 줄 로그인 단추 — 어디서든 둘 다. */
export const providers = (): Provider[] => ['kakao', 'google'];

/** 기록 코드 호환 도구. URL에서 받은 코드를 자동으로 합치는 데 쓰지 않는다. */
export const packCarry = (save: Save) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(save))));
export function unpackCarry(text: string): Save | undefined {
  try { return cleanSave(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text), c => c.charCodeAt(0))))); } catch { return undefined; }
}

/** 이어갈 진행만. 개인 방명록 열쇠는 보내거나 받아들이지 않고, 미래 시각은 현재까지만 허용한다. */
function carryProgress(raw: unknown, now = Date.now()): Save | undefined {
  const save = cleanSave(raw);
  if (!save) return undefined;
  delete save.home;
  for (const entry of [save.me, save.neighbor, save.last, save.coins]) {
    if (entry?.at !== undefined) entry.at = Number.isFinite(entry.at) ? Math.max(0, Math.min(now, entry.at)) : 0;
  }
  if (save.regionAt !== undefined) save.regionAt = Math.min(now, save.regionAt);
  if (save.stamps) save.stamps = Object.fromEntries(Object.entries(save.stamps).map(([id, at]) => [id, Math.max(0, Math.min(now, at))]));
  return Object.keys(save).length ? save : undefined;
}

/** 카톡 안에서 구글 — 이어갈 진행과 돌아와 열 판을 전달한다. 로그인 열쇠·개인 방명록 열쇠는 싣지 않는다. */
function escapeKakao(intent: Intent) {
  const carry = carryProgress(exportSave());
  const url = `${here()}#${query({ go: 'google', ...(carry ? { carry: packCarry(carry) } : {}), ...(intent.back ? { back: intent.back } : {}), ...(intent.news ? { news: '1' } : {}) })}`;
  location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  return true;
}

/** 카톡에서 밖으로 나왔으면 진행을 로그인 요청에만 대기시킨다. 인증과 본인 확인이 끝나기 전에는 합치지 않는다. */
export function arrivedFromKakao(): boolean {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.get('go') !== 'google') return false;
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  return start('google', { back: hash.get('back') ?? undefined, news: hash.get('news') === '1' }, carryProgress(unpackCarry(hash.get('carry') ?? '')));
}

/** 이 빌드에서 실제로 되나 — 키가 들어갔거나 개발판(가짜 로그인). */
const ready = (provider: Provider) => Boolean(FAKE || (provider === 'kakao' ? KAKAO : GOOGLE));

const here = () => `${location.origin}${location.pathname}`;
const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
const query = (o: Record<string, string>) => new URLSearchParams(o).toString();

/** 카카오·구글 화면으로 간다. 돌아오면 finish(). 아직 못 가면(키 없음·저장소 막힘) false. */
export function start(provider: Provider, intent: Intent = {}, carry?: Save): boolean {
  if (isInspectionMode()) return false;
  if (!ready(provider)) return false;
  if (provider === 'google' && inKakao()) return escapeKakao(intent);
  const state = randomHex();
  try { sessionStorage.setItem(PENDING, JSON.stringify({ provider, state, back: intent.back, news: intent.news === true, carry })); } catch { return false; }
  const back = here();
  const real = provider === 'kakao' ? KAKAO : GOOGLE;
  location.href = !real
    ? `./api/game/fake-login?${query({ provider, redirect_uri: back, state })}`
    : provider === 'kakao'
      ? `https://kauth.kakao.com/oauth/authorize?${query({ response_type: 'code', client_id: real, redirect_uri: back, state })}`
      : `https://accounts.google.com/o/oauth2/v2/auth?${query({ response_type: 'id_token', client_id: real, redirect_uri: back, scope: 'openid email', nonce: state, state, prompt: 'select_account' })}`;
  return true;
}

/** 카카오·구글에서 막 돌아왔으면 그 쪽 — finish() 가 주소를 지우기 전에 본다. main 이 확인하는 동안 기다림 판을 띄운다(10-20). */
export function returning(): Provider | undefined {
  if (!new URLSearchParams(location.search).has('state') && !new URLSearchParams(location.hash.slice(1)).has('state')) return undefined;
  try { return (JSON.parse(sessionStorage.getItem(PENDING) ?? 'null') as { provider?: Provider } | null)?.provider; } catch { return undefined; }
}

/**
 * 돌아왔을 때 — 주소에 state 가 있으면 로그인 길이다. 서버에 확인하고 기록을 합친 뒤 다시 연다.
 * 결과: undefined = 로그인 길 아님, 'failed' · 'cancelled' 는 main 이 한 줄 알린다. 'done' 이면 이미 다시 여는 중.
 */
export async function finish(): Promise<'done' | 'failed' | 'cancelled' | undefined> {
  const search = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
  const state = search.get('state') ?? hash.get('state');
  if (!state) return undefined;
  const error = search.get('error') ?? hash.get('error'), code = search.get('code'), idToken = hash.get('id_token');
  // 주소에서 code·토큰을 지운다 — 새로고침·공유에 남지 않게.
  for (const name of ['code', 'state', 'error', 'error_description', 'error_code']) search.delete(name);
  history.replaceState(null, '', `${location.pathname}${search.toString() ? `?${search}` : ''}`);
  let pending: { provider?: Provider; state?: string; back?: unknown; news?: unknown; carry?: unknown } | null = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING) ?? 'null'); sessionStorage.removeItem(PENDING); } catch { pending = null; }
  if (!pending?.provider || pending.state !== state) return 'failed'; // 내가 보낸 길이 아니다
  if (error) return 'cancelled';
  const proof = pending.provider === 'kakao' ? { code: code ?? '' } : { idToken: idToken ?? '', nonce: state };
  const result = await net.login({ provider: pending.provider, redirectUri: here(), ...proof });
  if (!result) return 'failed';
  saveLogin({ key: result.key, provider: pending.provider, ...(result.admin ? { admin: true as const } : {}) });
  const fresh = !Object.keys(cleanSave(result.save) ?? {}).length; // 처음 로그인한 계정 — 불러올 게 없었다(10-26, 「불러오기」 를 눌렀는데 그냥 「로그인했어요」 만 떴다)
  confirmed = { key: result.key, text: JSON.stringify(cleanSave(result.save) ?? {}) };
  importSave(result.save);
  const carried = carryProgress(pending.carry);
  if (carried && typeof globalThis.confirm === 'function') {
    const name = carried.me?.name || '이름 없는 주민';
    const resultName = carried.last?.type ? TYPES[carried.last.type].name : '아직 걷는 중';
    let accepted = false;
    try { accepted = globalThis.confirm(`카카오톡에서 가져온 게임 기록이에요.\n이름: ${name}\n결과: ${resultName}\n\n본인 기록이면 지금 로그인한 계정에 합칠까요? 취소하면 이 기록은 합치지 않아요.`); } catch { /* 확인할 수 없으면 합치지 않는다 */ }
    if (accepted) importSave(carried);
  }
  // 못 올렸으면 알린다(다음에 열 때 keepSynced 가 다시 올린다) — 예전엔 실패해도 「지켰어요」 였다(10-16).
  // 이 기기에 보탤 게 없으면(새 기기에서 「전에 해 봤어요」 — 대개 이 길) 올리지 않는다. 서버 한 번이 3~5초라(10-20 사용자 「너무 늦어」).
  const mine = exportSave();
  const needsSave = JSON.stringify(mine) !== confirmed.text;
  const saved = needsSave ? await syncNow() : true;
  if (!needsSave) { clearTimeout(timer); timer = undefined; dirty = false; }
  try {
    sessionStorage.setItem(DONE, pending.provider);
    if (result.email && pending.news === true) sessionStorage.setItem(EMAIL, result.email); // 소식 받기를 켰을 때만 그 판에 채운다
    if (!saved) sessionStorage.setItem(UNSAVED, '1');
    if (fresh) sessionStorage.setItem(FRESH, '1');
    if (typeof pending.back === 'string' && /^[a-z:]{2,20}$/.test(pending.back)) sessionStorage.setItem(BACK, pending.back);
  } catch { /* 알림만 못 띄운다 */ }
  location.reload();
  return 'done';
}

/** 다시 연 뒤 한 번 — 로그인하러 가기 전에 보던 판('board'·'hub'·'hub:region'). 꺼내면 지운다. */
export function takeBack(): string | undefined {
  try { const b = sessionStorage.getItem(BACK); sessionStorage.removeItem(BACK); return b ?? undefined; } catch { return undefined; }
}

let syncStarted = false, dirty = false, retries = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<boolean> | undefined;
let confirmed: { key: string; text: string } | undefined;
const RETRY_MS = [1500, 3000, 6000];
const queueSave = (ms: number) => { clearTimeout(timer); timer = setTimeout(() => { timer = undefined; void pushSave(); }, ms); };

/** 저장은 한 번에 하나씩. 실패한 변경은 남겨 두고 세 번까지만 늦춰 다시 보낸다. */
function pushSave(): Promise<boolean> {
  clearTimeout(timer); timer = undefined;
  if (inFlight) return inFlight.then(ok => ok ? pushSave() : false);
  const login = loadLogin();
  if (!login) return Promise.resolve(false);
  const save = exportSave(), text = JSON.stringify(save);
  if (confirmed?.key === login.key && confirmed.text === text) { dirty = false; return Promise.resolve(true); }
  dirty = false;
  let succeeded = false;
  const flight = Promise.resolve().then(() => net.saveMe(login.key, save)).then(Boolean, () => false).then(ok => {
    if (loadLogin()?.key !== login.key) return false;
    if (ok) {
      confirmed = { key: login.key, text }; retries = 0; succeeded = true;
      dirty = JSON.stringify(exportSave()) !== text;
    } else {
      dirty = true;
      const delay = RETRY_MS[retries++];
      if (delay !== undefined) queueSave(delay);
    }
    return ok;
  }).finally(() => {
    if (inFlight === flight) inFlight = undefined;
    if (succeeded && dirty) queueSave(1500);
  });
  inFlight = flight;
  return flight;
}

/** 지금 기록을 바로 올린다. 진행 중인 저장이 있으면 그 뒤에 최신 기록을 보낸다. */
export function syncNow() { dirty = true; retries = 0; return pushSave(); }
/** 로그인 열쇠(서버에 쪽지를 쓸 때) — 로그인 안 했으면 undefined. */
export const loginKey = () => loadLogin()?.key;

/** 다시 연 뒤 한 번 — 방금 로그인했으면 그 쪽 이름. */
export function justLoggedIn(): Provider | undefined {
  try { const p = sessionStorage.getItem(DONE) as Provider | null; sessionStorage.removeItem(DONE); return p ?? undefined; } catch { return undefined; }
}
/** 다시 연 뒤 한 번 — 방금 로그인은 됐는데 기록을 서버에 못 올렸나. */
export function takeUnsaved(): boolean {
  try { const u = sessionStorage.getItem(UNSAVED); sessionStorage.removeItem(UNSAVED); return u === '1'; } catch { return false; }
}
/** 다시 연 뒤 한 번 — 방금 로그인한 계정이 처음 만든 것인가(서버에 기록이 없었다). */
export function takeFresh(): boolean {
  try { const f = sessionStorage.getItem(FRESH); sessionStorage.removeItem(FRESH); return f === '1'; } catch { return false; }
}
/** 다시 연 뒤 한 번 — 방금 로그인으로 받은 이메일(카카오에서 이메일을 안 켰으면 없음). 꺼내면 지운다. */
export function takeLoginEmail(): string | undefined {
  try { const e = sessionStorage.getItem(EMAIL); sessionStorage.removeItem(EMAIL); return e ?? undefined; } catch { return undefined; }
}

/**
 * 로그인했으면 기록이 바뀔 때마다(1.5초 모아서) 서버에 올리고, 열 때 한 번 서버 것을 받아 합친다.
 * ponytail: 받은 것은 다음에 열 때 보인다(이번 판은 이미 읽었다) — 두 기기를 동시에 쓰는 일은 드물어서.
 */
export function keepSynced() {
  if (syncStarted) return;
  syncStarted = true;
  onWrite(() => {
    if (!loadLogin()) return;
    dirty = true; retries = 0; queueSave(1500);
  });
  const flush = () => { if (dirty) void syncNow(); };
  globalThis.addEventListener?.('online', flush);
  globalThis.addEventListener?.('pagehide', flush);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  const login = loadLogin();
  if (!login) return;
  // 열 때 한 번 받고, 합친 것이 서버 것과 다르면 올린다 — 지난번에 못 올린 것(로그인 직후 실패 등)이 여기서 다시 간다.
  void net.me(login.key).then(result => {
    if (!result || loadLogin()?.key !== login.key) return;
    if (typeof result.admin === 'boolean') saveLogin({ key: login.key, provider: login.provider, ...(result.admin ? { admin: true as const } : {}) });
    confirmed = { key: login.key, text: JSON.stringify(cleanSave(result.save) ?? {}) };
    importSave(result.save);
    dirty = JSON.stringify(exportSave()) !== confirmed.text;
    if (dirty) queueSave(1500); else { clearTimeout(timer); timer = undefined; }
  }).catch(() => { dirty = true; queueSave(1500); });
}

export const current = () => loadLogin()?.provider;
/** 관리자로 로그인했나 — 서버가 로그인 때 가려 준다(api.ts isAdmin). 화면 쪽 일에만 쓴다. */
export const admin = () => loadLogin()?.admin === true;
/**
 * 이 기기에서 끊는다 — 마지막 기록을 서버에 올린 뒤 이 기기의 기록도 비운다(서버 기록은 남아서 다시 로그인하면 그대로).
 * 안 비우면 같은 기기로 다음에 로그인한 사람 계정에 앞사람 기록이 섞인다(10-16). 못 올렸으면 끊지 않는다(false) — 기록을 잃지 않게.
 */
export async function logout() {
  const login = loadLogin();
  if (login && !(await syncNow())) return false;
  clearLogin(); clearSave();
  clearTimeout(timer); timer = undefined; dirty = false; confirmed = undefined;
  return true;
}
