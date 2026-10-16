// 로그인(10-14) — 열쇠 규칙, 기록 묶음 검사·합치기, 카카오·구글 확인(가짜 응답), 시트에 회원번호가 그대로 남지 않는지. 화면 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createStore, handle, login, isAdmin } from '../game/api.ts';
import { verifyLogin, accountOf, serve } from '../server/gas.ts';

// 기록 묶음은 localStorage 를 읽고 쓴다 — 시험에선 가짜로.
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const { cleanSave, exportSave, importSave, saveMe, addStamp, loadStamps, loadLast, saveTown, TOWN_IDS } = await import('../game/profile.ts');

const ACCOUNT = `kakao:${'a'.repeat(64)}`;
let n = 0;
const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280);

test('열쇠: 같은 계정은 같은 열쇠, 열쇠로만 읽고 쓰고, 지우면 다시 로그인해도 빈 기록', () => {
  const store = createStore();
  assert.equal(login(store, 'kakao:12345', 1, random).status, 400, '해시가 아닌 계정은 안 받는다');
  const first = login(store, ACCOUNT, 1, random).body;
  assert.match(first.key, /^[A-Za-z0-9]{32}$/);
  assert.equal(login(store, ACCOUNT, 2, random).body.key, first.key, '다른 기기에서 로그인해도 같은 열쇠');
  assert.equal(handle(store, 'POST', '/me', { key: 'x'.repeat(32) }, 3).status, 403);
  const save = { me: { name: '민지', pick: [1, 2, 3, 0] }, stamps: { walk: 5 }, region: '1124000' };
  assert.equal(handle(store, 'POST', '/me/save', { key: first.key, save }, 4).status, 200);
  assert.deepEqual(handle(store, 'POST', '/me', { key: first.key }, 5).body.save, save);
  assert.equal(handle(store, 'POST', '/me/save', { key: first.key, save: 'x'.repeat(5000) }, 6).status, 400);
  assert.equal(handle(store, 'POST', '/me/forget', { key: first.key }, 7).status, 200);
  assert.equal(handle(store, 'POST', '/me', { key: first.key }, 8).status, 403, '지운 열쇠는 안 통한다');
  const again = login(store, ACCOUNT, 9, random).body;
  assert.notEqual(again.key, first.key);
  assert.deepEqual(again.save, {});
});

test('기록 묶음: 이상한 칸은 그 칸만 버리고, 합칠 땐 없는 칸만 채우고 지난번 판은 나중 것, 도장은 둘 다', () => {
  assert.deepEqual(cleanSave({ me: { name: '<b>민지</b>', pick: [9, 9] }, region: '화성', stamps: { walk: 1, 'BAD ID': 2 } }), { stamps: { walk: 1 } });
  assert.equal(cleanSave(null), undefined);
  memory.clear();
  saveMe({ name: '이 기기', pick: [0, 0, 0, 0] });
  addStamp('walk', 100);
  saveTown('a'.repeat(TOWN_IDS.length), { type: '101' });
  const older = { at: 1, town: 'b'.repeat(TOWN_IDS.length), type: '000' };
  importSave({ me: { name: '서버', pick: [1, 1, 1, 1] }, stamps: { walk: 50, table: 60 }, last: older, region: '2600000' });
  const here = exportSave();
  assert.equal(here.me.name, '이 기기', '이 기기 이름이 그대로');
  assert.deepEqual(loadStamps(), { walk: 50, table: 60 }, '도장은 둘 다, 먼저 받은 시각');
  assert.equal(loadLast().type, '101', '지난번 판은 나중 것(이 기기)');
  assert.equal(here.region, '2600000', '없던 칸은 서버 것으로');
});

const props = { LOGIN_REDIRECTS: 'https://bada17.github.io/budget-mbti-survey/game/', KAKAO_REST_KEY: 'rest', GOOGLE_CLIENT_ID: 'gid', ACCOUNT_SALT: 'salt' };
const fakeDeps = (answers, extra = {}) => ({
  prop: name => ({ ...props, ...extra })[name] ?? null,
  sha256: text => createHash('sha256').update(text).digest('hex'),
  random,
  fetch: (url, options = {}) => { const hit = answers.find(([match]) => url.startsWith(match)); return hit ? hit[1](url, options) : { status: 404, text: '' }; },
});
const kakaoOk = [
  ['https://kauth.kakao.com/oauth/token', (_, o) => (o.payload.code === 'good' && o.payload.client_id === 'rest' ? { status: 200, text: '{"access_token":"t"}' } : { status: 400, text: '{}' })],
  ['https://kapi.kakao.com/v2/user/me', (_, o) => (o.headers.Authorization === 'Bearer t' ? { status: 200, text: '{"id":4242}' } : { status: 401, text: '' })],
];
const redirectUri = props.LOGIN_REDIRECTS;

test('카카오·구글 확인: 맞는 길만 통과, 주소·키·aud·nonce·만료가 틀리면 안 된다', () => {
  assert.deepEqual(verifyLogin({ provider: 'kakao', code: 'good', redirectUri }, fakeDeps(kakaoOk), 0), { provider: 'kakao', subject: '4242' });
  assert.equal(verifyLogin({ provider: 'kakao', code: 'bad', redirectUri }, fakeDeps(kakaoOk), 0), undefined);
  assert.equal(verifyLogin({ provider: 'kakao', code: 'good', redirectUri: 'https://evil.example/' }, fakeDeps(kakaoOk), 0), undefined, '등록 안 한 주소');
  assert.equal(verifyLogin({ provider: 'kakao', code: 'good', redirectUri }, fakeDeps(kakaoOk, { KAKAO_REST_KEY: null }), 0), undefined, '키가 없으면 꺼짐');
  const google = info => [['https://oauth2.googleapis.com/tokeninfo', () => ({ status: 200, text: JSON.stringify(info) })]];
  const good = { aud: 'gid', iss: 'https://accounts.google.com', exp: '2000', sub: 'g-1', nonce: 'n1' };
  assert.deepEqual(verifyLogin({ provider: 'google', idToken: 'x', nonce: 'n1', redirectUri }, fakeDeps(google(good)), 1000), { provider: 'google', subject: 'g-1' });
  for (const bad of [{ aud: 'other' }, { nonce: 'n2' }, { exp: '1' }, { iss: 'evil' }]) {
    assert.equal(verifyLogin({ provider: 'google', idToken: 'x', nonce: 'n1', redirectUri }, fakeDeps(google({ ...good, ...bad })), 1000 * 1000 + 1 > 0 ? 1000 : 0), undefined, JSON.stringify(bad));
  }
  assert.equal(accountOf({ provider: 'kakao', subject: '4242' }, fakeDeps([], { ACCOUNT_SALT: null })), undefined, '소금이 없으면 로그인하지 않는다');
});

// 10-15 「이메일 정도는 받을 수 있잖아」 — 확인된 이메일만 돌려주고, 시트엔 안 남긴다(동의하면 /contact 가 따로 받는다).
const kakaoWith = account => [kakaoOk[0], ['https://kapi.kakao.com/v2/user/me', () => ({ status: 200, text: JSON.stringify({ id: 4242, kakao_account: account }) })]];
test('로그인 이메일: 카카오·구글이 확인한 것만, 소문자로', () => {
  const kakao = account => verifyLogin({ provider: 'kakao', code: 'good', redirectUri }, fakeDeps(kakaoWith(account)), 0);
  assert.equal(kakao({ email: 'Me@Mail.com', is_email_valid: true, is_email_verified: true }).email, 'me@mail.com');
  assert.equal(kakao({ email: 'me@mail.com', is_email_valid: true, is_email_verified: false }).email, undefined, '확인 안 된 이메일');
  assert.equal(kakao({ email_needs_agreement: true }).email, undefined, '동의 안 함 — 회원번호만');
  assert.equal(kakao(undefined).subject, '4242');
  const google = info => verifyLogin({ provider: 'google', idToken: 'x', nonce: 'n1', redirectUri },
    fakeDeps([['https://oauth2.googleapis.com/tokeninfo', () => ({ status: 200, text: JSON.stringify({ aud: 'gid', iss: 'accounts.google.com', exp: '2000', sub: 'g-1', nonce: 'n1', ...info }) })]]), 1000);
  assert.equal(google({ email: 'a@gmail.com', email_verified: 'true' }).email, 'a@gmail.com');
  assert.equal(google({ email: 'a@gmail.com', email_verified: 'false' }).email, undefined);
});

test('관리자(10-15): 단체 주소와 따로 적은 메일만, 대소문자·띄어쓰기 무시, 비슷한 주소는 아니다', () => {
  assert.equal(isAdmin('kim@action.or.kr'), true);
  assert.equal(isAdmin('Kim@Action.or.kr '), true);
  assert.equal(isAdmin('kim@notaction.or.kr'), false);
  assert.equal(isAdmin('kim@action.or.kr.evil.com'), false);
  assert.equal(isAdmin('me@gmail.com'), false);
  assert.equal(isAdmin('me@gmail.com', ' other@x.com , ME@gmail.com'), true);
  assert.equal(isAdmin(undefined, 'me@gmail.com'), false);
  assert.equal(isAdmin('', ''), false);
});

test('시트 로그인 이메일: 응답엔 오고 시트 어디에도 없다', () => {
  const sheets = new Map();
  const sheetOf = () => { const rows = []; return { rows, getLastRow: () => rows.length, appendRow: r => rows.push([...r]),
    getRange: (row, col, nr = 1, nc = 1) => ({ getValues: () => rows.slice(row - 1, row - 1 + nr).map(r => r.slice(col - 1, col - 1 + nc)),
      setValues: v => v.forEach((x, i) => { rows[row - 1 + i] = [...(rows[row - 1 + i] ?? []).slice(0, col - 1), ...x]; }) }) }; };
  const book = { getSheetByName: name => sheets.get(name) ?? null, insertSheet: name => { const s = sheetOf(); sheets.set(name, s); return s; } };
  const deps = fakeDeps(kakaoWith({ email: 'me@mail.com', is_email_valid: true, is_email_verified: true }));
  const body = serve('POST', { parameter: { p: '/login' }, postData: { contents: JSON.stringify({ provider: 'kakao', code: 'good', redirectUri }) } }, book, 1000, deps).body;
  assert.equal(body.email, 'me@mail.com');
  assert.equal(body.admin, undefined, '보통 주민');
  assert.match(body.key, /^[A-Za-z0-9]{32}$/);
  const staff = fakeDeps(kakaoWith({ email: 'kim@action.or.kr', is_email_valid: true, is_email_verified: true }));
  assert.equal(serve('POST', { parameter: { p: '/login' }, postData: { contents: JSON.stringify({ provider: 'kakao', code: 'good', redirectUri }) } }, book, 1000, staff).body.admin, true, '단체 주소');
  const mine = fakeDeps(kakaoWith({ email: 'me@mail.com', is_email_valid: true, is_email_verified: true }), { ADMIN_EMAILS: 'me@mail.com' });
  assert.equal(serve('POST', { parameter: { p: '/login' }, postData: { contents: JSON.stringify({ provider: 'kakao', code: 'good', redirectUri }) } }, book, 1000, mine).body.admin, true, '따로 적은 메일');
  const unverified = fakeDeps(kakaoWith({ email: 'kim@action.or.kr', is_email_valid: true, is_email_verified: false }));
  assert.equal(serve('POST', { parameter: { p: '/login' }, postData: { contents: JSON.stringify({ provider: 'kakao', code: 'good', redirectUri }) } }, book, 1000, unverified).body.admin, undefined, '확인 안 된 이메일은 관리자 아님');
  assert.ok(!JSON.stringify([...sheets.values()].map(s => s.rows)).includes('me@mail.com'), '이메일이 시트에 없다');
});

test('시트 로그인: 「주민」 탭엔 해시만 — 회원번호는 어디에도 안 남고, 열쇠로 기록이 오간다', () => {
  const sheets = new Map();
  const sheetOf = () => { const rows = []; return { rows, getLastRow: () => rows.length, appendRow: r => rows.push([...r]),
    getRange: (row, col, nr = 1, nc = 1) => ({ getValues: () => rows.slice(row - 1, row - 1 + nr).map(r => r.slice(col - 1, col - 1 + nc)),
      setValues: v => v.forEach((x, i) => { rows[row - 1 + i] = [...(rows[row - 1 + i] ?? []).slice(0, col - 1), ...x]; }) }) }; };
  const book = { getSheetByName: name => sheets.get(name) ?? null, insertSheet: name => { const s = sheetOf(); sheets.set(name, s); return s; } };
  const post = (p, body, deps) => serve('POST', { parameter: { p }, postData: { contents: JSON.stringify(body) } }, book, 1000, deps);
  assert.equal(post('/login', { provider: 'kakao', code: 'good', redirectUri }).status, 401, 'deps 가 없으면(옛 Code.js) 로그인 안 됨');
  const { key } = post('/login', { provider: 'kakao', code: 'good', redirectUri }, fakeDeps(kakaoOk)).body;
  assert.equal(post('/me/save', { key, save: { region: '1100000' } }).status, 200);
  assert.deepEqual(post('/me', { key }).body.save, { region: '1100000' });
  const rows = JSON.stringify(sheets.get('주민').rows);
  assert.ok(!rows.includes('4242'), '회원번호가 시트에 없다');
  assert.match(sheets.get('주민').rows[1][0], /^kakao:[0-9a-f]{64}$/);
  assert.equal(post('/login', { provider: 'kakao', code: 'good', redirectUri }, fakeDeps(kakaoOk)).body.key, key, '다시 로그인해도 같은 열쇠');
});

test('카톡 밖으로 실어 보내는 기록: 한글 이름까지 그대로 돌아오고, 깨진 글자는 버린다', async () => {
  const { packCarry, unpackCarry } = await import('../game/login.ts');
  memory.clear();
  saveMe({ name: '한빛', pick: [0, 0, 0, 0] });
  addStamp(TOWN_IDS[0]);
  const save = exportSave();
  assert.deepEqual(unpackCarry(packCarry(save)), cleanSave(save));
  assert.equal(unpackCarry('%%%'), undefined);
  assert.equal(unpackCarry(btoa('{"me":{"name":1}}'))?.me, undefined);
});
