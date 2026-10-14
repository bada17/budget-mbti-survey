/*
  로그인 — 카카오·구글 두 가지(사용자 10-14 「로그인 넣어야 새로 들어올 때 기록될 듯」 「카카오톡, 지메일로만」). 네이버는 안 넣는다(README 「로그인」).

  · 왜 — 카톡 안 브라우저와 크롬은 저장소가 따로라, 로그인 없이는 같은 사람이 다시 와도 처음 온 사람이 된다.
  · 카톡 안 브라우저에서는 구글 단추를 안 보인다 — 구글이 앱 속 브라우저 로그인을 막는다.
  · 처음엔 묻지 않는다 — 끝 공터 도장 주민 판(「주민증 지키기」)과 시작 화면(「전에 해 봤어요」)에서만. 안 해도 끝까지 한다.
  · 받는 것 = 회원번호 하나(서버가 소금 친 해시로 바꿔 둔다). 이메일·이름·사진은 받지 않는다 — 동의 항목(scope)을 열지 않는다.
  · **켜짐은 키로** — VITE_KAKAO_REST_KEY · VITE_GOOGLE_CLIENT_ID 가 빌드에 들어가야 단추가 보인다. 개인정보처리방침에 넣기 전엔 키를 안 넣는다.
    개발판(npm run dev:game)은 키가 없으면 가짜 카카오·구글(vite.game.config.ts 의 /fake-login)로 끝까지 돈다.

  가서 돌아오는 길: start() → 카카오/구글 화면 → 게임 주소로 돌아옴(카카오 ?code=, 구글 #id_token=) → finish() 가 서버(/login)에 확인
  → 열쇠·서버 기록을 받아 이 기기 것과 합침(profile.ts importSave) → 다시 연다(합친 기록으로 처음부터 읽게).
*/
import { net } from './net';
import { saveLogin, loadLogin, clearLogin, importSave, exportSave, onWrite, type Login } from './profile';

export type Provider = Login['provider'];
const KAKAO: string | undefined = import.meta.env?.VITE_KAKAO_REST_KEY || undefined;
const GOOGLE: string | undefined = import.meta.env?.VITE_GOOGLE_CLIENT_ID || undefined;
const FAKE = Boolean(import.meta.env?.DEV);
const PENDING = 'budget-game-login-pending';
const DONE = 'budget-game-login-done';
export const PROVIDER_NAME: Record<Provider, string> = { kakao: '카카오', google: '구글' };

/** 카톡 안 브라우저 — 구글 로그인이 막힌다. */
export const inKakao = () => /KAKAOTALK/i.test(navigator.userAgent);

/** 지금 보여 줄 로그인 단추. 비면 로그인 자리를 아예 안 낸다(키를 넣기 전 공개판). */
export function providers(): Provider[] {
  const list: Provider[] = [];
  if (KAKAO || FAKE) list.push('kakao');
  if ((GOOGLE || FAKE) && !inKakao()) list.push('google');
  return list;
}

const here = () => `${location.origin}${location.pathname}`;
const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
const query = (o: Record<string, string>) => new URLSearchParams(o).toString();

/** 카카오·구글 화면으로 간다. 돌아오면 finish(). */
export function start(provider: Provider) {
  const state = randomHex();
  try { sessionStorage.setItem(PENDING, JSON.stringify({ provider, state })); } catch { return; }
  const back = here();
  const real = provider === 'kakao' ? KAKAO : GOOGLE;
  location.href = !real
    ? `./api/game/fake-login?${query({ provider, redirect_uri: back, state })}`
    : provider === 'kakao'
      ? `https://kauth.kakao.com/oauth/authorize?${query({ response_type: 'code', client_id: real, redirect_uri: back, state })}`
      : `https://accounts.google.com/o/oauth2/v2/auth?${query({ response_type: 'id_token', client_id: real, redirect_uri: back, scope: 'openid', nonce: state, state, prompt: 'select_account' })}`;
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
  let pending: { provider?: Provider; state?: string } | null = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING) ?? 'null'); sessionStorage.removeItem(PENDING); } catch { pending = null; }
  if (!pending?.provider || pending.state !== state) return 'failed'; // 내가 보낸 길이 아니다
  if (error) return 'cancelled';
  const proof = pending.provider === 'kakao' ? { code: code ?? '' } : { idToken: idToken ?? '', nonce: state };
  const result = await net.login({ provider: pending.provider, redirectUri: here(), ...proof });
  if (!result) return 'failed';
  saveLogin({ key: result.key, provider: pending.provider });
  importSave(result.save);
  await net.saveMe(result.key, exportSave());
  try { sessionStorage.setItem(DONE, pending.provider); } catch { /* 알림만 못 띄운다 */ }
  location.reload();
  return 'done';
}

/** 다시 연 뒤 한 번 — 방금 로그인했으면 그 쪽 이름. */
export function justLoggedIn(): Provider | undefined {
  try { const p = sessionStorage.getItem(DONE) as Provider | null; sessionStorage.removeItem(DONE); return p ?? undefined; } catch { return undefined; }
}

/**
 * 로그인했으면 기록이 바뀔 때마다(1.5초 모아서) 서버에 올리고, 열 때 한 번 서버 것을 받아 합친다.
 * ponytail: 받은 것은 다음에 열 때 보인다(이번 판은 이미 읽었다) — 두 기기를 동시에 쓰는 일은 드물어서.
 */
export function keepSynced() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  onWrite(() => {
    if (!loadLogin()) return;
    clearTimeout(timer);
    timer = setTimeout(() => { const login = loadLogin(); if (login) void net.saveMe(login.key, exportSave()); }, 1500);
  });
  const login = loadLogin();
  if (login) void net.me(login.key).then(result => { if (result) importSave(result.save); });
}

export const current = () => loadLogin()?.provider;
/** 이 기기에서만 끊는다 — 서버 기록은 남아서 다시 로그인하면 그대로. */
export const logout = () => clearLogin();
/** 서버 기록을 지우고 끊는다. */
export async function forget() {
  const login = loadLogin();
  if (!login) return false;
  const ok = await net.forget(login.key);
  if (ok) clearLogin();
  return Boolean(ok);
}
