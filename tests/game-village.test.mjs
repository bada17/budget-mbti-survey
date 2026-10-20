// 마을(기획 4차) — 지도·걷기·쪽지 규칙·서버(다녀간 사람·쪽지·나도·신고)·시트 숨김 칸·지방재정 자료. 화면 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  PLACES, SPAWN, VILLAGE_W, VILLAGE_H, blocked, walkVillage, findPath, placeAt, wanderSpot, checkNote, kstDayStart,
  NOTE_MAX, NOTE_GAP_MS, NOTE_DAY_MAX, REPORT_HIDE, CROWD_SHOW,
} from '../game/village.ts';
import { createStore, handle, login } from '../game/api.ts';
import { serve } from '../server/gas.ts';
import { orderedQuestions } from '../game/response.ts';
import { CONTENT_VERSION } from '../game/content.ts';
import { fakeBook } from './fake-sheet.mjs';

const answers = Object.fromEntries(orderedQuestions.map(q => [q.id, 2]));
const finish = (store, sessionId, now = 1000) => handle(store, 'POST', '/finish', { sessionId, contentVersion: CONTENT_VERSION, answers }, now);
const walkTo = (from, to, steps = 600) => { let p = { ...from }; for (let i = 0; i < steps; i++) p = walkVillage(p, { x: to.x - p.x, y: to.y - p.y }, Math.min(4, Math.hypot(to.x - p.x, to.y - p.y))); return p; };

test('지도: 들어오는 곳·문 앞은 디딜 수 있고, 건물마다 문이 하나, 문끼리 겹치지 않는다', () => {
  assert.equal(new Set(PLACES.map(p => p.id)).size, PLACES.length);
  for (const at of [SPAWN.gate, SPAWN.plaza, ...PLACES.map(p => p.door)]) assert.equal(blocked(at), false, JSON.stringify(at));
  for (const place of PLACES) {
    assert.equal(blocked({ x: place.box.x + place.box.w / 2, y: place.box.y + place.box.h / 2 }), true, `${place.name} 벽 안`);
    assert.equal(placeAt(place.door, 24)?.id, place.id);
  }
  for (const a of PLACES) for (const b of PLACES) if (a !== b) assert.ok(Math.hypot(a.door.x - b.door.x, a.door.y - b.door.y) > 60, `${a.name}·${b.name}`);
  assert.equal(blocked({ x: -1, y: 500 }), true);
  assert.equal(blocked({ x: 500, y: VILLAGE_H + 1 }), true);
});

test('걷기: 남쪽 문에서 모든 문 앞까지 걸어서 닿고(8px 칸 훑기), 벽을 뚫지 않고 미끄러진다', () => {
  const key = p => `${p.x},${p.y}`;
  const start = { x: SPAWN.gate.x, y: SPAWN.gate.y };
  const seen = new Set([key(start)]), queue = [start];
  while (queue.length) {
    const p = queue.shift();
    for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (!seen.has(key(n)) && !blocked(n)) { seen.add(key(n)); queue.push(n); }
    }
  }
  for (const place of PLACES) {
    const near = [...seen].map(k => k.split(',').map(Number)).some(([x, y]) => Math.hypot(x - place.door.x, y - place.door.y) < 8);
    assert.ok(near, `${place.name} 문 앞에 못 닿는다`);
  }
  assert.ok([...seen].some(k => { const [x, y] = k.split(',').map(Number); return Math.hypot(x - SPAWN.plaza.x, y - SPAWN.plaza.y) < 8; }), '광장');
  // 큰길을 따라 곧장 걸으면 광장까지 닿는다
  const walked = walkTo(SPAWN.gate, SPAWN.plaza);
  assert.ok(Math.hypot(walked.x - SPAWN.plaza.x, walked.y - SPAWN.plaza.y) < 2, JSON.stringify(walked));
  // 벽에 비스듬히 밀면 벽을 따라 옆으로 간다(멈추지 않는다), 아무리 밀어도 벽 안에 들지 않는다
  const hub = PLACES.find(p => p.id === 'hub');
  const below = { x: hub.box.x + 20, y: hub.box.y + hub.box.h + 9 };
  const slid = walkVillage(below, { x: 1, y: -1 }, 5);
  assert.ok(slid.x > below.x && slid.y === below.y, JSON.stringify(slid));
  let p = { ...below };
  for (let i = 0; i < 300; i++) { p = walkVillage(p, { x: 0.2, y: -1 }, 3); assert.equal(blocked(p), false); }
  assert.deepEqual(walkVillage(below, { x: 0, y: 0 }, 5), below);
  assert.deepEqual(walkVillage(below, { x: NaN, y: 1 }, 5), below);
});

test('길찾기: 남쪽 문·광장·아무 데서나 모든 문 앞까지 길을 따라 걸으면 닿고, 못 디디는 곳을 누르면 가장 가까이까지', () => {
  const follow = (from, route) => {
    let p = { ...from };
    for (const spot of route) for (let i = 0; i < 400 && Math.hypot(spot.x - p.x, spot.y - p.y) > 0.5; i++) {
      const d = Math.hypot(spot.x - p.x, spot.y - p.y);
      p = walkVillage(p, { x: spot.x - p.x, y: spot.y - p.y }, Math.min(4, d));
    }
    return p;
  };
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const starts = [SPAWN.gate, SPAWN.plaza, ...Array.from({ length: 12 }, () => wanderSpot(random))];
  let slowest = 0;
  for (const from of starts) for (const place of PLACES) {
    const t = performance.now();
    const route = findPath(from, place.door);
    slowest = Math.max(slowest, performance.now() - t);
    const end = follow(from, route);
    assert.ok(Math.hypot(end.x - place.door.x, end.y - place.door.y) < 3, `${JSON.stringify(from)} → ${place.name}: ${JSON.stringify(end)}`);
    assert.ok(route.length <= 8, `${place.name} 꺾는 곳 ${route.length}`);
  }
  assert.ok(slowest < 60, `가장 느린 길찾기 ${slowest.toFixed(1)}ms`);
  // 분수 한가운데를 누르면 — 분수 가장자리 근처에 선다
  const end = follow(SPAWN.gate, findPath(SPAWN.gate, { x: 520, y: 796 }));
  assert.equal(blocked(end), false);
  assert.ok(Math.hypot(end.x - 520, end.y - 796) < 60, JSON.stringify(end));
  // 곧장 보이면 한 번에
  assert.deepEqual(findPath(SPAWN.plaza, { x: SPAWN.plaza.x, y: SPAWN.plaza.y + 100 }), [{ x: SPAWN.plaza.x, y: SPAWN.plaza.y + 100 }]);
});

test('서성이는 자리는 늘 디딜 수 있는 곳', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) { const spot = wanderSpot(random); assert.equal(blocked(spot), false, JSON.stringify(spot)); assert.ok(spot.x > 0 && spot.x < VILLAGE_W); }
});

test('쪽지 글: 다듬고, 짧은·긴·링크·연락처·거친 말을 막는다', () => {
  assert.deepEqual(checkNote('  오늘   처음 와 봤어요 \n'), { ok: true, text: '오늘 처음 와 봤어요' });
  assert.equal(checkNote('가').why, 'short');
  assert.equal(checkNote('<>').why, 'short');
  assert.equal(checkNote(123).why, 'short');
  assert.equal(checkNote('가'.repeat(NOTE_MAX)).ok, true);
  assert.equal(checkNote('가'.repeat(NOTE_MAX + 1)).why, 'long');
  for (const bad of ['여기로 와요 http://x.y', 'www.abc 가 봐', 'naver.com 에', '메일 me@x', '010-1234-5678 연락', '계좌 110 123 456789', '오픈채팅 들어와']) assert.equal(checkNote(bad).why, 'link', bad);
  for (const bad of ['시 발 진짜', '이 병1신아', 'ㅅㅂ', 'FUCK']) assert.equal(checkNote(bad).why, 'word', bad);
  for (const fine of ['2026년 예산 3조', '시바견이 귀여워요', '나도 수리공!', '홍어 삼합 먹고 싶다']) assert.equal(checkNote(fine).ok, true, fine);
});

test('한국 날짜 0시', () => {
  assert.equal(kstDayStart(Date.UTC(2026, 9, 14, 14, 59)), Date.UTC(2026, 9, 13, 15));
  assert.equal(kstDayStart(Date.UTC(2026, 9, 14, 15, 0)), Date.UTC(2026, 9, 14, 15));
});

test('마을 서버: 끝낸 판만 들르고, 최근 이레 안에 들른 사람만 많아도 여섯, 보는 사람 자신은 광장에 안 세우고, 세션 id 는 안 돌려준다', () => {
  const store = createStore();
  const now = Date.UTC(2026, 9, 14, 3);
  assert.equal(CROWD_SHOW, 6, '사용자 10-19 「많아도 6명」');
  assert.equal(handle(store, 'POST', '/village/here', { sessionId: 'session-none', pick: [0, 0, 0, 0] }, now).status, 400);
  finish(store, 'session-aaaa'); finish(store, 'session-bbbb'); finish(store, 'session-old0');
  assert.equal(handle(store, 'POST', '/village/here', { sessionId: 'session-aaaa', pick: [9, 9, 9, 9] }, now).status, 400);
  handle(store, 'POST', '/village/here', { sessionId: 'session-aaaa', pick: [1, 1, 1, 1] }, now - 86_400_000); // 어제
  handle(store, 'POST', '/village/here', { sessionId: 'session-old0', pick: [3, 3, 3, 3] }, now - 8 * 86_400_000); // 여드레 전 — 안 선다
  const view = handle(store, 'POST', '/village/here', { sessionId: 'session-bbbb', pick: [2, 2, 2, 2] }, now).body;
  assert.equal(view.people, 0, '위 띠 누계는 로그인한 사람만');
  assert.deepEqual(view.crowd, [[1, 1, 1, 1]], '나(bbbb)는 빼고, 이레 넘은 사람도 빼고');
  assert.deepEqual(handle(store, 'GET', '/village', null, now).body.crowd, [[2, 2, 2, 2], [1, 1, 1, 1]], '최근 들른 순');
  for (let i = 0; i < CROWD_SHOW + 4; i++) { finish(store, `session-c${String(i).padStart(4, '0')}`); handle(store, 'POST', '/village/here', { sessionId: `session-c${String(i).padStart(4, '0')}`, pick: [0, 0, 0, 0] }, now + i); }
  assert.equal(handle(store, 'GET', '/village', null, now).body.crowd.length, CROWD_SHOW);
  assert.ok(!JSON.stringify(handle(store, 'GET', '/village', null, now).body).includes('session-'));
});

/** 로그인한 주민 — 열쇠. admin 이면 관리자(로그인 때 서버가 확인된 이메일로 가린다). */
const keyOf = (store, n, admin = false) => login(store, `kakao:${String(n).padStart(64, '0')}`, 0, Math.random, admin).body.key;

test('쪽지: 로그인한 사람만 쓰고, 10분에 하나·하루 셋(계정마다), 나도·신고는 한 판에 한 번, 신고가 모이면 숨는다', () => {
  const store = createStore();
  let now = Date.UTC(2026, 9, 14, 3);
  const key = keyOf(store, 1);
  const post = (text, extra = {}) => handle(store, 'POST', '/village/notes', { key, name: '민지', pick: [1, 2, 3, 4], text, ...extra }, now);
  assert.equal(handle(store, 'POST', '/village/notes', { sessionId: 'session-aaaa', name: '민지', pick: [1, 2, 3, 4], text: '안녕하세요' }, now).status, 403, '로그인 안 하면 못 쓴다(사용자 10-19)');
  assert.equal(post('안녕하세요', { key: 'x'.repeat(32) }).status, 403, '모르는 열쇠');
  finish(store, 'session-aaaa');
  assert.equal(post('http://spam.kr').body.why, 'link');
  assert.equal(post('안녕하세요', { pick: [9, 9, 9, 9] }).status, 400);
  const made = post('  처음 와 봤어요  ', { region: '1144000' });
  assert.equal(made.status, 201);
  assert.deepEqual(Object.keys(made.body.note).sort(), ['at', 'id', 'likes', 'name', 'pick', 'text'], '쓴 계정·동네는 밖으로 안 낸다');
  assert.equal(made.body.note.text, '처음 와 봤어요');
  assert.equal(made.body.view.notes[0].id, made.body.note.id);
  assert.equal(post('또 왔어요').status, 429, '10분 안');
  now += NOTE_GAP_MS; assert.equal(post('두 번째').status, 201);
  now += NOTE_GAP_MS; assert.equal(post('세 번째').status, 201);
  now += NOTE_GAP_MS; assert.equal(post('네 번째').status, 429, `하루 ${NOTE_DAY_MAX}개`);
  assert.equal(handle(store, 'POST', '/village/notes', { key: keyOf(store, 2), name: '다른 사람', pick: [0, 0, 0, 0], text: '저는 처음' }, now).status, 201, '하루 몇 장은 계정마다');
  assert.equal(handle(store, 'POST', '/village/notes', { key, name: '씨발', pick: [0, 0, 0, 0], text: '내일 또' }, now + 86_400_000).body.note.name, '', '거친 별명은 비운다');
  // 동네 한마디 — 그 동네 쪽지만, 우리 동네 판에
  const region = handle(store, 'GET', '/regions/1144000', null, now).body;
  assert.deepEqual(region.notes.map(n => n.text), ['처음 와 봤어요']);
  assert.equal(handle(store, 'GET', '/regions/2600000', null, now).body.notes.length, 0);

  const id = made.body.note.id;
  const like = sessionId => handle(store, 'POST', `/village/notes/${id}/like`, { sessionId }, now);
  const report = sessionId => handle(store, 'POST', `/village/notes/${id}/report`, { sessionId }, now);
  assert.equal(like('session-none').status, 400);
  for (let i = 0; i < REPORT_HIDE + 1; i++) finish(store, `session-r${i}000`);
  assert.equal(like('session-r0000').body.likes, 1);
  assert.equal(like('session-r0000').body.likes, 1, '두 번 눌러도 한 번');
  assert.equal(like('session-r1000').body.likes, 2);
  report('session-r0000'); report('session-r0000');
  assert.ok(handle(store, 'GET', '/village', null, now).body.notes.some(n => n.id === id), '같은 판 신고는 한 번만 센다');
  for (let i = 1; i < REPORT_HIDE; i++) report(`session-r${i}000`);
  assert.ok(!handle(store, 'GET', '/village', null, now).body.notes.some(n => n.id === id), `신고 ${REPORT_HIDE}번이면 숨는다`);
  assert.equal(like('session-r3000').status, 404, '숨은 쪽지엔 못 누른다');
  assert.equal(handle(store, 'POST', '/village/notes/NOPE/like', { sessionId: 'session-r0000' }, now).status, 404);
});

/** 시트 「주민」 탭에 로그인한 주민 한 줄을 미리 넣는다(로그인 확인은 game-login 시험이 따로 본다). */
const KEY = 'K'.repeat(32), ADMIN_KEY = 'A'.repeat(32);
function seedResidents(book) {
  serve('GET', { parameter: { p: '/stats' } }, book, 0); // 탭을 만든다
  const rows = book.sheets.get('주민').rows;
  rows.push([`kakao:${'1'.padStart(64, '0')}`, JSON.stringify({ key: KEY, save: {}, at: 0 }), '']);
  rows.push([`google:${'2'.padStart(64, '0')}`, JSON.stringify({ key: ADMIN_KEY, save: {}, at: 0, admin: true }), '']);
}

test('시트의 쪽지 탭: 사람이 읽는 칸, 숨김 칸에 적으면 숨고, 서버는 숨김 칸을 덮어쓰지 않는다', () => {
  const book = fakeBook();
  seedResidents(book);
  const post = (p, body, now) => serve('POST', { parameter: { p }, postData: { contents: JSON.stringify(body) } }, book, now);
  const now = Date.UTC(2026, 9, 14, 3);
  post('/finish', { sessionId: 'session-aaaa', contentVersion: CONTENT_VERSION, answers }, now);
  post('/finish', { sessionId: 'session-bbbb', contentVersion: CONTENT_VERSION, answers }, now);
  post('/village/here', { sessionId: 'session-aaaa', pick: [1, 1, 1, 1] }, now);
  const { id } = post('/village/notes', { key: KEY, sessionId: 'session-aaaa', name: '민지', pick: [1, 1, 1, 1], text: '반가워요', region: '1144000' }, now).body.note;
  const rows = book.sheets.get('쪽지').rows;
  assert.deepEqual(rows[0], ['번호', '남긴 시각', '별명', '글', '나도', '신고', '숨김(사람이 적음)', '기록']);
  assert.deepEqual(rows[1].slice(0, 6), [id, new Date(now).toISOString(), "'민지", "'반가워요", 0, 0], "사람이 쓴 칸은 ' 를 붙여 글자로만");
  assert.equal(JSON.parse(rows[1][7]).region, '1144000', '쓴 사람의 동네는 기록 칸에');
  assert.equal(post(`/village/notes/${id}/like`, { sessionId: 'session-bbbb' }, now).body.likes, 1);
  assert.equal(rows.length, 2, '고친 쪽지는 제자리');
  assert.equal(rows[1][4], 1);
  const get = () => serve('GET', { parameter: { p: '/village' } }, book, now).body;
  assert.equal(get().notes.length, 1);
  assert.equal(get().notes[0].text, '반가워요', "읽을 땐 ' 없이");
  assert.equal(serve('GET', { parameter: { p: '/regions/1144000' } }, book, now).body.notes.length, 1, '다음 요청이 시트에서 동네를 다시 읽는다');
  rows[1][6] = '광고'; // 지우는 사람이 시트에 적는다
  assert.equal(get().notes.length, 0);
  post(`/village/notes/${id}/report`, { sessionId: 'session-bbbb' }, now); // 숨은 쪽지 — 404, 아무것도 안 쓴다
  rows[1][6] = '';
  post(`/village/notes/${id}/report`, { sessionId: 'session-bbbb' }, now);
  rows[1][6] = '확인함';
  post(`/village/notes/${id}/like`, { sessionId: 'session-aaaa' }, now);
  assert.equal(rows[1][6], '확인함', '서버가 숨김 칸을 덮어쓰지 않는다');
  assert.equal(rows[1][5], 1);
});

test('관리자 「숨기기」: 서버가 열쇠로 관리자인지 다시 보고, 시트 숨김 칸에 「관리자」, 칸을 지우면 되살아난다', () => {
  const book = fakeBook();
  seedResidents(book);
  const post = (p, body, now = 1000) => serve('POST', { parameter: { p }, postData: { contents: JSON.stringify(body) } }, book, now);
  const { id } = post('/village/notes', { key: KEY, name: '민지', pick: [1, 1, 1, 1], text: '반가워요' }).body.note;
  assert.equal(post(`/village/notes/${id}/hide`, { key: KEY }).status, 403, '보통 주민은 못 숨긴다');
  assert.equal(post(`/village/notes/${id}/hide`, {}).status, 403);
  assert.equal(post(`/village/notes/${id}/hide`, { key: ADMIN_KEY }).status, 200);
  const rows = book.sheets.get('쪽지').rows, get = () => serve('GET', { parameter: { p: '/village' } }, book, 1000).body;
  assert.equal(rows[1][6], '관리자');
  assert.equal(get().notes.length, 0);
  assert.equal(post(`/village/notes/${id}/hide`, { key: ADMIN_KEY }).status, 404, '숨은 쪽지는 또 못 숨긴다');
  rows[1][6] = ''; // 되살리기 — 시트에서 칸을 지운다
  assert.equal(get().notes.length, 1);
  // 관리자 표시는 로그인할 때마다 다시 가린다
  const store = createStore();
  assert.equal(handle(store, 'POST', '/village/notes/x/hide', { key: keyOf(store, 9, true) }, 0).status, 404, '관리자면 통과(없는 쪽지라 404)');
  keyOf(store, 9, false);
  assert.equal(handle(store, 'POST', '/village/notes/x/hide', { key: keyOf(store, 9, false) }, 0).status, 403, '다음 로그인에 관리자가 아니면 표시가 지워진다');
});

test("시트의 쪽지 탭: 「=」 로 시작하는 쪽지도 수식이 아니라 글자로 쓴다(10-16 — 다른 탭 값을 읽어 오지 않게)", () => {
  const book = fakeBook();
  seedResidents(book);
  const post = (p, body, now) => serve('POST', { parameter: { p }, postData: { contents: JSON.stringify(body) } }, book, now);
  const now = Date.UTC(2026, 9, 14, 3);
  post('/village/notes', { key: KEY, name: '민지', pick: [1, 1, 1, 1], text: '=연락처!C2' }, now);
  const cell = book.sheets.get('쪽지').rows[1][3];
  assert.equal(cell, "'=연락처!C2");
});

test('지방재정 자료(구운 것): 243곳, 시·도 열일곱, 숫자 넷이 다 있고 순위·등급은 없다', () => {
  const data = JSON.parse(readFileSync(new URL('../game/data/local-finance.json', import.meta.url), 'utf8'));
  assert.equal(data.places.length, 243);
  assert.equal(new Set(data.places.map(p => p.s)).size, 17);
  assert.equal(data.places.filter(p => p.n.endsWith('(시·도)')).length, 17);
  for (const p of data.places) {
    assert.match(p.c, /^\d{7}$/);
    for (const key of ['p', 'b', 'pp', 'w', 'i']) assert.ok(Number.isFinite(p[key]) && p[key] > 0, `${p.n} ${key}`);
    assert.deepEqual(Object.keys(p).sort(), ['b', 'c', 'i', 'n', 'p', 'pp', 's', 'w']);
  }
  assert.equal(data.places.find(p => p.n === '마포구').b, 992_099_535_000, '망원동 시험 자료와 같은 숫자');
});

test('마을 공사·나무: 동전이 앞 공사부터 채우고, 하루 떨어지는 동전은 정해진 수, 서버는 하루 한도까지만 받는다', async () => {
  const { worksAt, dropsOn, COIN_DAY_MAX, COIN_HIDDEN, WORKS } = await import('../game/village.ts');
  assert.ok(COIN_DAY_MAX >= WORKS[0].goal, '하루에 다리 하나를 혼자 채울 수 있다(10-15)');
  assert.ok(COIN_HIDDEN > COIN_DAY_MAX, '숨긴 동전이 넣을 수 있는 수보다 많다 — 쉽게 찾게(10-15)');
  assert.deepEqual(worksAt(0), { done: [], now: { id: 'bridge', name: '연못 다리', have: 0, goal: WORKS[0].goal } });
  assert.deepEqual(worksAt(WORKS[0].goal + 7).done, ['bridge']);
  assert.equal(worksAt(WORKS[0].goal + 7).now.have, 7);
  assert.deepEqual(worksAt(1e9), { done: ['bridge', 'pavilion'] });
  const a = dropsOn(20000, 80), b = dropsOn(20000, 80), c = dropsOn(20001, 80);
  assert.deepEqual([...a], [...b], '같은 날엔 누구에게나 같다');
  assert.notDeepEqual([...a], [...c], '날마다 바뀐다');
  assert.equal([...a.values()].filter(k => k === 'coin').length, COIN_HIDDEN);
  assert.equal(dropsOn(1, 0).size, 0);
  // 서버 — 끝낸 판만, 하루 COIN_DAY_MAX 까지, 합이 마을 모습에 실린다
  const store = createStore(), t0 = Date.UTC(2026, 9, 14, 3);
  const answers = Object.fromEntries(orderedQuestions.map(q => [q.id, 3]));
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 1 }, t0).status, 400, '안 끝낸 판');
  handle(store, 'POST', '/finish', { sessionId: 'session-coin-1', contentVersion: CONTENT_VERSION, answers }, t0);
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 0 }, t0).status, 400);
  const first = handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 3 }, t0);
  assert.equal(first.body.took, 3);
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: COIN_DAY_MAX }, t0 + 1000).body.took, COIN_DAY_MAX - 3, '남은 만큼만');
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 1 }, t0 + 2000).status, 429);
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 2 }, t0 + 24 * 3600e3).body.took, 2, '다음 날 다시');
  assert.equal(handle(store, 'GET', '/village', undefined, t0 + 24 * 3600e3).body.coins, COIN_DAY_MAX + 2);
});

test('작은 운동장(10-15): 골대는 운동장 안, 운동장은 건물·연못·길과 안 겹치고 지도 안, 골 판정은 상자 안만', async () => {
  const { PITCH, GOAL, PLACES, POND, ROADS, VILLAGE_W, VILLAGE_H, scored, blocked } = await import('../game/village.ts');
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  assert.ok(GOAL.x >= PITCH.x && GOAL.x + GOAL.w <= PITCH.x + PITCH.w && GOAL.y >= PITCH.y && GOAL.y + GOAL.h <= PITCH.y + PITCH.h);
  for (const box of [...PLACES.map(p => p.box), POND, ...ROADS]) assert.ok(!overlap(PITCH, box), JSON.stringify(box));
  assert.ok(PITCH.x + PITCH.w <= VILLAGE_W && PITCH.y + PITCH.h <= VILLAGE_H);
  assert.ok(!blocked({ x: PITCH.x + PITCH.w / 2, y: PITCH.y + PITCH.h / 2 }), '걸어 들어갈 수 있다');
  assert.equal(scored({ x: GOAL.x + 5, y: GOAL.y + 5 }, GOAL), true);
  assert.equal(scored({ x: GOAL.x - 5, y: GOAL.y + 5 }, GOAL), false);
});

test('마을 배경 가락: 여덟 마디가 늘 같고, 낮·밤이 다르며, 음은 들리는 높이 안에', async () => {
  const { villageTune } = await import('../game/sfx.ts');
  const day = villageTune(false), again = villageTune(false), night = villageTune(true);
  assert.deepEqual(day, again, '같은 마을은 늘 같은 노래');
  assert.notDeepEqual(day.notes, night.notes);
  assert.ok(night.bpm < day.bpm, '밤엔 느리게');
  for (const tune of [day, night]) {
    assert.equal(tune.steps, 64);
    assert.ok(tune.notes.some(n => n.kind === 'tune') && tune.notes.some(n => n.kind === 'bass'));
    for (const n of tune.notes) {
      assert.ok(n.step >= 0 && n.step < 64);
      const hz = 440 * 2 ** ((n.midi - 69) / 12);
      assert.ok(hz > 60 && hz < 2100, `${n.kind} ${hz}`);
    }
  }
});

test('고르면 방이 바뀐다: 열다섯 문항 모두 두 대답에 일이 있고, 한마디는 세기 셋', async () => {
  const { OUTCOMES, THANKS } = await import('../game/outcomes.ts');
  const kinds = new Set(['build', 'rain', 'visit', 'grow', 'spread', 'focus', 'drive']);
  assert.equal(Object.keys(OUTCOMES).length, orderedQuestions.length);
  for (const q of orderedQuestions) {
    const o = OUTCOMES[q.id];
    assert.ok(o, q.id);
    for (const key of ['a', 'b']) assert.ok(kinds.has(o[key].kind) && o[key].icon, `${q.id} ${key}`);
  }
  assert.equal(THANKS.length, 3);
});

test('버스 예산 퀴즈: 정답이 보기에 꼭 있고, 판마다 버스 넷이 서로 다른 문제', async () => {
  const { QUIZ, quizFor } = await import('../game/quiz.ts');
  for (const q of QUIZ) assert.equal(new Set([q.answer, ...q.wrong]).size, 3, q.q);
  for (const sid of ['session-a', 'session-b']) {
    const seen = new Set();
    for (const stage of [1, 2, 3, 4]) {
      const { quiz, choices } = quizFor(sid, stage);
      assert.ok(choices.includes(quiz.answer) && choices.length === 3);
      assert.deepEqual(quizFor(sid, stage).choices, choices, '같은 판엔 늘 같게');
      seen.add(quiz.q);
    }
    assert.equal(seen.size, 4);
  }
});

test('방마다 다른 길: 개울은 돌을 밟아 건널 수 있고, 돌 밖은 젖는다 · 고양이 자리는 방 안 · 문을 잠그는 놀이는 없다(10-15)', async () => {
  const { streamOf, wet, keepDry, catOf, TWISTS } = await import('../game/twists.ts');
  const { layoutRoom, step } = await import('../game/room.ts');
  for (const [w, h] of [[360, 640], [360, 560], [412, 915]]) {
    const room = layoutRoom(w, h), s = streamOf(room);
    assert.ok(s.y0 > room.residents.left.y && s.y1 < room.spawn.y, `${w}×${h} 개울이 주민과 들어온 자리 사이`);
    // 돌이 서로 겹쳐 아래 끝에서 위 끝까지 이어진다
    for (let i = 1; i < s.stones.length; i++) assert.ok(Math.hypot(s.stones[i].x - s.stones[i - 1].x, s.stones[i].y - s.stones[i - 1].y) < s.r * 2 - 4);
    assert.ok(s.stones[0].y + s.r > s.y1 && s.stones[s.stones.length - 1].y - s.r < s.y0);
    assert.ok(wet({ x: 20, y: (s.y0 + s.y1) / 2 }, s), '돌 밖 물은 젖는다');
    // 걸어서 건너 보기 — 돌을 차례로 겨냥해 걷는다(조이스틱으로 하는 것처럼)
    let p = { ...room.spawn };
    for (const target of [...s.stones, { x: room.w / 2, y: room.residents.left.y + 40 }]) {
      for (let t = 0; t < 200 && Math.hypot(target.x - p.x, target.y - p.y) > 3; t++) {
        const d = Math.hypot(target.x - p.x, target.y - p.y), dir = { x: (target.x - p.x) / d, y: (target.y - p.y) / d };
        p = keepDry(p, step(p, dir, 150, 16, room, false), s);
        assert.ok(!wet(p, s));
      }
    }
    assert.ok(p.y < s.y0, `${w}×${h} 개울 건넘`);
    const at = catOf(room);
    assert.ok(at.x > 0 && at.x < w && at.y > room.wallY && at.y <= room.floor);
  }
  assert.deepEqual(Object.values(TWISTS).sort(), ['cat', 'stream', 'stream'], '열쇠·골은 걷었다(골은 마을 운동장으로)');
});

test('마을 부탁(10-17): 하루 셋, 그날 셋을 다 해야 다음 날 열리고, 하루치를 다 하면 그 날 번호(보상)', async () => {
  const { ERRAND_DAYS, ERRANDS, errandDay, errandsShown, finishErrand } = await import('../game/quests.ts');
  const { REWARDS } = await import('../game/look.ts');
  assert.equal(ERRAND_DAYS.length, 5, '닷새');
  for (const day of ERRAND_DAYS) assert.ok(day.length === 0 || day.length === 3, '하루 셋(아직 안 만든 날은 비움)');
  assert.equal(new Set(ERRANDS.map(e => e.id)).size, ERRANDS.length);
  for (const e of ERRANDS) {
    assert.equal(blocked(e.at), false, `${e.id} 주민이 디딜 수 있는 곳에`);
    assert.ok(e.choices.filter(c => c.right).length <= 1, `${e.id} 맞는 답은 하나까지`);
  }
  assert.ok(REWARDS.length >= ERRAND_DAYS.filter(d => d.length).length, '만든 날마다 보상이 있다');

  let memo = { done: [], cleared: [] };
  const [a, b, c] = ERRAND_DAYS[0];
  assert.deepEqual(errandDay(memo, 100).list.map(e => e.id), [a.id, b.id, c.id]);
  assert.equal(finishErrand(memo, 'nope', 100).memo, memo, '열리지 않은 부탁은 그대로');
  memo = finishErrand(memo, a.id, 100).memo;
  memo = finishErrand(memo, b.id, 100).memo;
  assert.equal(finishErrand(memo, b.id, 100).memo, memo, '한 번 한 부탁은 또 안 센다');
  const last = finishErrand(memo, c.id, 100);
  assert.equal(last.cleared, 0, '셋째를 하면 첫날 끝 — 보상 0번');
  memo = last.memo;
  assert.deepEqual(memo.cleared, [100]);
  assert.ok(errandsShown(memo, 100).every(e => !e.open), '다 한 날 주민은 「!」 없이 남는다');
  // 둘째 날은 아직 비어 있어 「준비 중」 — 채우면 다음 날(101)에야 열린다
  assert.equal(errandDay(memo, 101).wait, ERRAND_DAYS[1].length ? undefined : 'soon');
  const filled = [[...ERRAND_DAYS[0]], [{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }]];
  ERRAND_DAYS.splice(1, 1, filled[1]);
  try {
    assert.equal(errandDay(memo, 100).wait, 'tomorrow', '같은 날엔 다음 셋이 안 열린다');
    assert.deepEqual(errandDay(memo, 101).list.map(e => e.id), ['x1', 'x2', 'x3'], '다음 날 열린다');
  } finally { ERRAND_DAYS.splice(1, 1, []); }
});

test('예산 오락실(10-17): 비쌀까 두 쪽은 늘 다르고, 금고는 딱 맞게 채울 수 있고, 독에는 새는 돈과 필요한 돈이 둘 다', async () => {
  const { PRICIER, PRICIER_WIN, VAULT_CAP, VAULT_BLOCKS, vaultUsed, vaultFits, LEAKS } = await import('../game/village.ts');
  assert.equal(PRICIER.length, 5);
  for (const [a, b] of PRICIER) assert.notEqual(a.won, b.won, `${a.name}·${b.name}`);
  assert.ok(PRICIER_WIN <= PRICIER.length);
  assert.ok(VAULT_BLOCKS.reduce((x, y) => x + y, 0) > VAULT_CAP, '다 넣을 수는 없어야 고른다');
  assert.equal(vaultUsed([0, 1, 2]), 10);
  assert.ok(vaultFits([0, 1], 2) && !vaultFits([0, 1, 2], 5), '칸을 넘으면 못 넣는다');
  assert.ok(LEAKS.some(x => x.leak) && LEAKS.some(x => !x.leak));
  // assert.ok(PLACES.some(p => p.id === 'arcade'), '마을에 오락실'); // [나중에 살림: 오락실·부탁]
});

test('문제 카드: 시트에 사람이 적은 줄(보이기 O)만 뜨고, 반응은 기기마다 하나(바꿀 수 있음), 서버는 사람 칸을 안 건드린다', () => {
  const book = fakeBook();
  const get = () => serve('GET', { parameter: { p: '/cards' } }, book, 0).body.cards;
  const react = (id, voter, kind) => serve('POST', { parameter: { p: `/cards/${id}/react` }, postData: { contents: JSON.stringify({ voter, kind }) } }, book, 0);
  assert.deepEqual(get(), [], '처음엔 보기 줄 하나뿐 — 보이기 칸이 비어 안 뜬다');
  const rows = book.sheets.get('문제 카드').rows;
  assert.equal(rows.length, 2, '머리 줄 + 보기 줄');
  rows.push(['2026-10-06', '지난달 카드', '설명', '전국', '12억 원', 'javascript:alert(1)', 'O']);
  rows.push([new Date(Date.UTC(2026, 9, 12, 15)), '이번 카드', '설명 둘', '서울 마포구', '4억 원', 'https://dok.action.or.kr/', 'o']); // 시트가 날짜로 바꾼 칸(한국 13일 0시)
  rows.push(['2026-10-14', '안 보이는 카드', '', '', '', '', '']);
  const cards = get();
  assert.deepEqual(cards.map(c => c.title), ['이번 카드', '지난달 카드'], '보이기 한 것만, 새것부터');
  assert.equal(cards[0].date, '2026-10-13');
  assert.equal(cards[1].link, '', 'http 가 아닌 링크는 버린다');
  assert.deepEqual(cards[0].counts, { problem: 0, unsure: 0, fine: 0 });
  const id = cards[0].id;
  assert.equal(react(id, 'voter-aaaaaaaa', 'problem').status, 200);
  assert.equal(react(id, 'voter-bbbbbbbb', 'problem').status, 200);
  assert.deepEqual(react(id, 'voter-aaaaaaaa', 'fine').body.card.counts, { problem: 1, unsure: 0, fine: 1 }, '바꾸면 옮겨 간다');
  assert.equal(react(id, 'x', 'problem').status, 400);
  assert.equal(react(id, 'voter-cccccccc', 'love').status, 400);
  assert.equal(react('c-nope', 'voter-cccccccc', 'problem').status, 404);
  const row = rows.find(r => r[1] === '이번 카드');
  assert.deepEqual(row.slice(7, 10), [1, 0, 1], '반응 수는 사람이 보는 칸에');
  assert.deepEqual(row.slice(1, 7), ['이번 카드', '설명 둘', '서울 마포구', '4억 원', 'https://dok.action.or.kr/', 'o'], '사람 칸은 그대로');
  assert.ok(!JSON.stringify(get()).includes('voter-'), '누가 눌렀는지는 안 나간다');
  rows.splice(rows.indexOf(rows.find(r => r[1] === '지난달 카드')), 1); // 사람이 줄을 지워도
  assert.deepEqual(get()[0].counts, { problem: 1, unsure: 0, fine: 1 }, '번호가 그대로라 반응이 남는다');
});

test('다 지은 것은 쓸 수 있다: 다리를 지으면 연못을 건너고, 정자를 지으면 평상까지 걸어 들어간다(사용자 10-19)', async () => {
  const { POND, BRIDGE_Y, PAVILION_SEAT, setBuilt, blocked, findPath, walkVillage } = await import('../game/village.ts');
  const left = { x: POND.x - 20, y: BRIDGE_Y }, right = { x: POND.x + POND.w + 20, y: BRIDGE_Y }, middle = { x: POND.x + POND.w / 2, y: BRIDGE_Y };
  const door = PLACES.find(p => p.id === 'works').door;
  const walk = (from, dir, steps = 120) => { let p = from; for (let i = 0; i < steps; i++) p = walkVillage(p, dir, 3); return p; };
  try {
    setBuilt([]);
    assert.equal(blocked(middle), true, '짓기 전엔 연못');
    assert.ok(walk(left, { x: 1, y: 0 }).x < POND.x, '연못 앞에서 멈춘다');
    assert.equal(blocked(PAVILION_SEAT), true, '공사 울타리 안');
    setBuilt(['bridge']);
    assert.equal(blocked(middle), false, '다리 위');
    assert.equal(blocked({ x: middle.x, y: POND.y + 20 }), true, '다리 밖은 그대로 연못');
    assert.ok(walk(left, { x: 1, y: 0 }).x > POND.x + POND.w, '건너간다');
    assert.ok(findPath(left, right).every(p => !blocked(p)), '길찾기도 다리로');
    assert.equal(blocked(PAVILION_SEAT), true, '정자는 아직');
    setBuilt(['bridge', 'pavilion']);
    assert.equal(blocked(PAVILION_SEAT), false, '평상 자리');
    const route = findPath(door, PAVILION_SEAT);
    assert.deepEqual(route[route.length - 1], PAVILION_SEAT, '문 앞에서 평상까지');
    assert.equal(blocked({ x: PAVILION_SEAT.x, y: PAVILION_SEAT.y - 40 }), true, '지붕 밑 뒤쪽은 막혀 있다');
  } finally { setBuilt([]); }
});

test('캔버스 글씨: 다 textRes 로 적어도 2배 촘촘하게 — PC 1배·윈도 125% 화면에서 뭉개지지 않게(사용자 10-20 「글씨체가 또렷하지 않으면 안 돼」)', async () => {
  const { readdirSync } = await import('node:fs');
  const files = [...readdirSync('game').filter(f => f.endsWith('.ts')).map(f => `game/${f}`), ...readdirSync('game/scenes').map(f => `game/scenes/${f}`)];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const texts = src.match(/\.add\.text\([^\n]*/g) ?? [];
    for (const line of texts) assert.match(line, /resolution: textRes\(/, `${file}: 캔버스 글씨는 resolution: textRes(…) 로 — ${line.slice(0, 80)}`);
  }
  // draw.ts 는 Phaser 를 불러 node 에서 못 연다 — 식을 그대로 꺼내 돌린다.
  const body = readFileSync('game/draw.ts', 'utf8').match(/export const textRes = \(dpr: number\) => ([^;]+);/)?.[1];
  assert.ok(body, 'draw.ts 에 textRes 가 있다');
  const textRes = new Function('dpr', `return ${body}`);
  for (const [dpr, want] of [[1, 2], [1.25, 2], [1.5, 2], [2, 2], [2.625, 3], [3, 3]]) assert.equal(textRes(dpr), want, `dpr ${dpr}`);
});
