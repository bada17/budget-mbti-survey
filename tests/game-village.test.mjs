// 마을(기획 4차) — 지도·걷기·쪽지 규칙·서버(다녀간 사람·쪽지·나도·신고)·시트 숨김 칸·지방재정 자료. 화면 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  PLACES, SPAWN, VILLAGE_W, VILLAGE_H, blocked, walkVillage, findPath, placeAt, wanderSpot, checkNote, kstDayStart,
  NOTE_MAX, NOTE_GAP_MS, NOTE_DAY_MAX, REPORT_HIDE, CROWD_SHOW,
} from '../game/village.ts';
import { createStore, handle } from '../game/api.ts';
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

test('마을 서버: 끝낸 판만 들르고 쓰고, 보는 사람 자신은 광장에 안 세우고, 세션 id 는 안 돌려준다', () => {
  const store = createStore();
  const now = Date.UTC(2026, 9, 14, 3);
  assert.equal(handle(store, 'POST', '/village/here', { sessionId: 'session-none', pick: [0, 0, 0, 0] }, now).status, 400);
  finish(store, 'session-aaaa'); finish(store, 'session-bbbb');
  assert.equal(handle(store, 'POST', '/village/here', { sessionId: 'session-aaaa', pick: [9, 9, 9, 9] }, now).status, 400);
  handle(store, 'POST', '/village/here', { sessionId: 'session-aaaa', pick: [1, 1, 1, 1] }, now - 86_400_000); // 어제
  const view = handle(store, 'POST', '/village/here', { sessionId: 'session-bbbb', pick: [2, 2, 2, 2] }, now).body;
  assert.equal(view.today, 1, '어제 들른 사람은 오늘 수에 안 든다');
  assert.deepEqual(view.crowd, [[1, 1, 1, 1]], '나(bbbb)는 빼고');
  assert.deepEqual(handle(store, 'GET', '/village', null, now).body.crowd, [[2, 2, 2, 2], [1, 1, 1, 1]], '최근 들른 순');
  for (let i = 0; i < CROWD_SHOW + 4; i++) { finish(store, `session-c${String(i).padStart(4, '0')}`); handle(store, 'POST', '/village/here', { sessionId: `session-c${String(i).padStart(4, '0')}`, pick: [0, 0, 0, 0] }, now + i); }
  assert.equal(handle(store, 'GET', '/village', null, now).body.crowd.length, CROWD_SHOW);
  assert.ok(!JSON.stringify(handle(store, 'GET', '/village', null, now).body).includes('session-'));
});

test('쪽지: 끝낸 판만, 10분에 하나·하루 셋, 나도·신고는 한 판에 한 번, 신고가 모이면 숨는다', () => {
  const store = createStore();
  let now = Date.UTC(2026, 9, 14, 3);
  const post = (sessionId, text, extra = {}) => handle(store, 'POST', '/village/notes', { sessionId, name: '민지', pick: [1, 2, 3, 4], text, ...extra }, now);
  assert.equal(post('session-none', '안녕하세요').status, 400);
  finish(store, 'session-aaaa');
  assert.equal(post('session-aaaa', 'http://spam.kr').body.why, 'link');
  assert.equal(post('session-aaaa', '안녕하세요', { pick: [9, 9, 9, 9] }).status, 400);
  const made = post('session-aaaa', '  처음 와 봤어요  ');
  assert.equal(made.status, 201);
  assert.deepEqual(Object.keys(made.body.note).sort(), ['at', 'id', 'likes', 'name', 'pick', 'text']);
  assert.equal(made.body.note.text, '처음 와 봤어요');
  assert.equal(made.body.view.notes[0].id, made.body.note.id);
  assert.equal(post('session-aaaa', '또 왔어요').status, 429, '10분 안');
  now += NOTE_GAP_MS; assert.equal(post('session-aaaa', '두 번째').status, 201);
  now += NOTE_GAP_MS; assert.equal(post('session-aaaa', '세 번째').status, 201);
  now += NOTE_GAP_MS; assert.equal(post('session-aaaa', '네 번째').status, 429, `하루 ${NOTE_DAY_MAX}개`);
  assert.equal(handle(store, 'POST', '/village/notes', { sessionId: 'session-aaaa', name: '씨발', pick: [0, 0, 0, 0], text: '내일 또' }, now + 86_400_000).body.note.name, '', '거친 별명은 비운다');

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

test('시트의 쪽지 탭: 사람이 읽는 칸, 숨김 칸에 적으면 숨고, 서버는 숨김 칸을 덮어쓰지 않는다', () => {
  const book = fakeBook();
  const post = (p, body, now) => serve('POST', { parameter: { p }, postData: { contents: JSON.stringify(body) } }, book, now);
  const now = Date.UTC(2026, 9, 14, 3);
  post('/finish', { sessionId: 'session-aaaa', contentVersion: CONTENT_VERSION, answers }, now);
  post('/finish', { sessionId: 'session-bbbb', contentVersion: CONTENT_VERSION, answers }, now);
  post('/village/here', { sessionId: 'session-aaaa', pick: [1, 1, 1, 1] }, now);
  const { id } = post('/village/notes', { sessionId: 'session-aaaa', name: '민지', pick: [1, 1, 1, 1], text: '반가워요' }, now).body.note;
  const rows = book.sheets.get('쪽지').rows;
  assert.deepEqual(rows[0], ['번호', '남긴 시각', '별명', '글', '나도', '신고', '숨김(사람이 적음)', '기록']);
  assert.deepEqual(rows[1].slice(0, 6), [id, new Date(now).toISOString(), '민지', '반가워요', 0, 0]);
  assert.equal(JSON.parse(rows[1][7]).sessionId, 'session-aaaa');
  assert.equal(post(`/village/notes/${id}/like`, { sessionId: 'session-bbbb' }, now).body.likes, 1);
  assert.equal(rows.length, 2, '고친 쪽지는 제자리');
  assert.equal(rows[1][4], 1);
  const get = () => serve('GET', { parameter: { p: '/village' } }, book, now).body;
  assert.equal(get().notes.length, 1);
  assert.equal(get().today, 1);
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

test('마을 금고: 세금 도감은 금고 넷 안에서만, 동네 금고 자료는 창고의 모든 곳에 있고 몫이 100% 안팎', async () => {
  const { SCENES, FLOWS, VAULTS, KIND, splitTax } = await import('../game/taxes.ts');
  for (const scene of SCENES) for (const tax of scene.taxes) {
    assert.ok(tax.to.length, `${scene.title} ${tax.name}`);
    for (const to of tax.to) assert.ok(VAULTS[to.vault], `${tax.name} → ${to.vault}`);
  }
  for (const flow of FLOWS) for (const v of [flow.from, ...flow.to]) assert.ok(VAULTS[v]);
  assert.ok(PLACES.some(p => p.id === 'tax'), '빈 터에 마을 금고');
  const finance = JSON.parse(readFileSync(new URL('../game/data/local-finance.json', import.meta.url), 'utf8'));
  const revenue = JSON.parse(readFileSync(new URL('../game/data/local-revenue.json', import.meta.url), 'utf8'));
  assert.equal(revenue.fy, finance.year, '창고와 같은 해 예산');
  for (const p of finance.places) {
    const r = revenue.places[p.c];
    assert.ok(r, p.n);
    const share = r.f.reduce((a, [, , s]) => a + s, 0);
    assert.ok(Math.abs(share - 100) < 1.5, `${p.n} 금고 몫 ${share}`);
    for (const [name] of r.f) assert.ok(KIND[name], `모르는 금고 칸 ${name}`);
    if (r.t) for (const [, eok] of r.t) assert.ok(eok >= 0, p.n);
  }
  // 우리 몫 가르기 — 자치구는 구세, 도 안의 시는 시세가 우리 것
  assert.deepEqual(splitTax('구세·재산세', '마포구'), { name: '재산세', own: true });
  assert.deepEqual(splitTax('시세·취득세', '마포구'), { name: '취득세', own: false });
  assert.deepEqual(splitTax('시세·지방소득세', '수원시'), { name: '지방소득세', own: true });
  assert.deepEqual(splitTax('도세·취득세', '수원시'), { name: '취득세', own: false });
  assert.equal(splitTax('시세·특별시재산세', '마포구').name, '재산세(서울시가 모아 구에 나눔)');
});

test('마을 공사·나무: 동전이 앞 공사부터 채우고, 하루 떨어지는 동전은 정해진 수, 서버는 하루 한도까지만 받는다', async () => {
  const { worksAt, dropsOn, COIN_DAY_MAX, WORKS } = await import('../game/village.ts');
  assert.deepEqual(worksAt(0), { done: [], now: { id: 'bridge', name: '연못 다리', have: 0, goal: WORKS[0].goal } });
  assert.deepEqual(worksAt(WORKS[0].goal + 7).done, ['bridge']);
  assert.equal(worksAt(WORKS[0].goal + 7).now.have, 7);
  assert.deepEqual(worksAt(1e9), { done: ['bridge', 'pavilion'] });
  const a = dropsOn(20000, 80), b = dropsOn(20000, 80), c = dropsOn(20001, 80);
  assert.deepEqual([...a], [...b], '같은 날엔 누구에게나 같다');
  assert.notDeepEqual([...a], [...c], '날마다 바뀐다');
  assert.equal([...a.values()].filter(k => k === 'coin').length, COIN_DAY_MAX);
  assert.equal(dropsOn(1, 0).size, 0);
  // 서버 — 끝낸 판만, 하루 COIN_DAY_MAX 까지, 합이 마을 모습에 실린다
  const store = createStore(), t0 = Date.UTC(2026, 9, 14, 3);
  const answers = Object.fromEntries(orderedQuestions.map(q => [q.id, 3]));
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 1 }, t0).status, 400, '안 끝낸 판');
  handle(store, 'POST', '/finish', { sessionId: 'session-coin-1', contentVersion: CONTENT_VERSION, answers }, t0);
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 0 }, t0).status, 400);
  const first = handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 3 }, t0);
  assert.equal(first.body.took, 3);
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 5 }, t0 + 1000).body.took, COIN_DAY_MAX - 3, '남은 만큼만');
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 1 }, t0 + 2000).status, 429);
  assert.equal(handle(store, 'POST', '/village/coins', { sessionId: 'session-coin-1', n: 2 }, t0 + 24 * 3600e3).body.took, 2, '다음 날 다시');
  assert.equal(handle(store, 'GET', '/village', undefined, t0 + 24 * 3600e3).body.coins, COIN_DAY_MAX + 2);
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
