// 같이 노는 규칙 — 친구 초대 코드, 연락처 확인, 서버 규칙(다른 사람들 마음·테이블). 화면 없이 돈다.
import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeInvite, decodeInvite, cleanName, cleanTableCode, josa, townFrom, isTown, TOWN_IDS } from '../game/profile.ts';
import { checkContact } from '../game/contact.ts';
import { createStore, handle, TABLE_TTL_MS, TABLE_MAX } from '../game/api.ts';
import { orderedQuestions } from '../game/response.ts';
import { CONTENT_VERSION } from '../game/content.ts';

test('초대 코드: 한글 이름·모습·유형이 그대로 오가고, 이상한 코드는 버린다', () => {
  const invite = { name: '민지', pick: [2, 1, 3, 0], type: '101' };
  assert.deepEqual(decodeInvite(encodeInvite(invite)), invite);
  assert.equal(decodeInvite(encodeInvite({ ...invite, name: '' })).name, '친구');
  for (const bad of [null, '', '!!!', 'x'.repeat(300), btoa('{"v":1,"n":"a","p":[9,9,9,9],"t":"101"}'), btoa('{"v":1,"n":"a","p":[0,0,0,0],"t":"999"}')]) {
    assert.equal(decodeInvite(bad), undefined, String(bad).slice(0, 20));
  }
  assert.equal(cleanName('  <b>민지</b> '), 'b민지/b');
  assert.equal(cleanName(42), '');
  assert.equal(josa('「도서관 이웃」', '이', '가'), '「도서관 이웃」이');
  assert.equal(josa('「민지」', '이', '가'), '「민지」가');
  assert.equal(josa('「꼭 필요한 사람에게만」', '을', '를'), '「꼭 필요한 사람에게만」을');
  assert.equal(josa('「모두 고르게 돕는다」', '을', '를'), '「모두 고르게 돕는다」를');
  assert.equal([...cleanName('가'.repeat(30))].length, 10);
});

test('연락처: 필수 동의·형식·봇 막이를 지키고, 선택 동의는 따로 남는다', () => {
  const base = { channel: 'email', address: ' Me@Example.com ', age14: true, collect: true, marketing: false, website: '', openedAt: 0 };
  const ok = checkContact(base, 5000);
  assert.equal(ok.ok, true);
  assert.equal(ok.payload.address, 'me@example.com');
  assert.deepEqual(ok.payload.consents, { age14: true, collect: true, marketing: false });
  assert.equal(checkContact({ ...base, marketing: true }, 5000).payload.consents.marketing, true);
  assert.equal(checkContact({ ...base, channel: 'sms', address: '010-1234-5678' }, 5000).payload.address, '01012345678');
  for (const bad of [
    { address: 'nope' }, { channel: 'sms', address: '02-123-4567' }, { age14: false }, { collect: false },
    { website: 'http://spam' }, { openedAt: 4000 },
  ]) assert.equal(checkContact({ ...base, ...bad }, 5000).ok, false, JSON.stringify(bad));
});

const answersFor = value => Object.fromEntries(orderedQuestions.map(q => [q.id, value]));

test('다른 사람들 마음: 끝낸 판만 세고, 같은 판은 한 번, 유형은 서버가 다시 계산한다', () => {
  const store = createStore();
  const finish = (sessionId, answers) => handle(store, 'POST', '/finish', { sessionId, contentVersion: CONTENT_VERSION, answers }, 1000);
  assert.equal(finish('session-aaaa', answersFor(1)).status, 200);
  assert.equal(finish('session-aaaa', answersFor(6)).status, 200); // 두 번째는 무시
  finish('session-bbbb', answersFor(6));
  const { body } = handle(store, 'GET', '/stats', null, 2000);
  assert.equal(body.total, 2);
  assert.deepEqual(body.questions[orderedQuestions[0].id], { a: 1, b: 1 });
  assert.equal(body.types['000'], 1);
  assert.equal(body.types['111'], 1);
  for (const bad of [
    { sessionId: 'x', contentVersion: CONTENT_VERSION, answers: answersFor(1) },
    { sessionId: 'session-cccc', contentVersion: 'old', answers: answersFor(1) },
    { sessionId: 'session-cccc', contentVersion: CONTENT_VERSION, answers: { ...answersFor(1), [orderedQuestions[3].id]: 7 } },
    { sessionId: 'session-cccc', contentVersion: CONTENT_VERSION, answers: { ...answersFor(1), extra: 1 } },
  ]) assert.equal(handle(store, 'POST', '/finish', bad, 1000).status, 400);
  assert.equal(handle(store, 'GET', '/stats', null, 2000).body.total, 2);
});

test('테이블: 만들고 들어가고 진행을 알리고, 꽉 차거나 오래되면 막힌다', () => {
  const store = createStore();
  const code = handle(store, 'POST', '/tables', {}, 0, () => 0.1).body.code;
  assert.equal(cleanTableCode(code), code);
  const join = (id, now = 10) => handle(store, 'POST', `/tables/${code}/members`, { id, name: '민지', pick: [0, 0, 0, 0] }, now);
  assert.equal(join('member-0001').status, 200);
  assert.equal(join('member-0001').body.members.length, 1); // 다시 들어와도 한 사람
  assert.equal(handle(store, 'POST', `/tables/${code}/members/member-0001`, { stage: 3 }, 20).body.members[0].stage, 3);
  assert.equal(handle(store, 'POST', `/tables/${code}/members/member-0001`, { stage: 1 }, 30).body.members[0].stage, 3); // 뒤로 안 감
  assert.equal(handle(store, 'POST', `/tables/${code}/members/member-0001`, { type: '010' }, 40).body.members[0].type, '010');
  assert.equal(handle(store, 'POST', `/tables/${code}/members/member-0001`, { type: '999' }, 40).status, 400);
  assert.equal(handle(store, 'POST', `/tables/${code}/members`, { id: 'member-0002', pick: [9, 9, 9, 9] }, 10).status, 400);
  for (let i = 2; i <= TABLE_MAX; i++) join(`member-${String(i).padStart(4, '0')}`);
  assert.equal(join('member-9999').status, 409);
  assert.equal(handle(store, 'GET', `/tables/${code}`, null, TABLE_TTL_MS + 1).status, 404);
  assert.equal(handle(store, 'GET', '/tables/abcd', null, 0).status, 404);
});

test('내 동네: 답에서 열다섯 자로, 친구 링크에 실려 오가고, 이상한 동네는 동네만 버린다', () => {
  const answers = Object.fromEntries(TOWN_IDS.map((id, i) => [id, i % 2 ? 5 : 2]));
  const town = townFrom(answers);
  assert.equal(town, TOWN_IDS.map((_, i) => (i % 2 ? 'b' : 'a')).join(''));
  assert.equal(townFrom({ ...answers, [TOWN_IDS[3]]: undefined }), undefined, '다 답하지 않으면 동네 없음');
  // 친구 링크 — 이름이 가장 길어도 코드 길이 한도(200자) 안
  const invite = { name: '가나다라마바사아자차', pick: [2, 1, 3, 0], type: '101', town };
  const code = encodeInvite(invite);
  assert.ok(code.length <= 200, `코드 ${code.length}자`);
  assert.deepEqual(decodeInvite(code), invite);
  // 옛 링크(동네 없음)도, 동네만 이상한 링크도 받는다 — 동네만 빼고
  const odd = btoa(JSON.stringify({ v: 1, n: 'a', p: [0, 0, 0, 0], t: '101', w: 'abc' })).replace(/=+$/, '');
  assert.deepEqual(decodeInvite(odd), { name: 'a', pick: [0, 0, 0, 0], type: '101' });
  assert.equal(isTown('a'.repeat(15)), true);
  assert.equal(isTown('a'.repeat(14) + 'c'), false);
});
