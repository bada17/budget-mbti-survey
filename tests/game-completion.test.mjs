import test from 'node:test';
import assert from 'node:assert/strict';

test('완료 저장: 실패한 답을 다시 연 페이지에서도 보내고 성공한 뒤에만 보류 기록을 지운다', async () => {
  const module = await import('../game/completion.ts').catch(() => ({}));
  assert.equal(typeof module.createCompletionQueue, 'function');
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const queue = module.createCompletionQueue(async () => undefined, storage);
  queue.enqueue('finished-session', { Q1: 2 });
  assert.equal(await queue.flush(), undefined);
  assert.equal(data.size, 1);
  const sent = [];
  const reopened = module.createCompletionQueue(async (id, answers) => { sent.push({ id, answers }); return { total: 1 }; }, storage);
  assert.deepEqual(await reopened.flush(), { sessionId: 'finished-session', value: { total: 1 } });
  assert.deepEqual(sent, [{ id: 'finished-session', answers: { Q1: 2 } }]);
  assert.equal(data.size, 0);
  await reopened.flush();
  assert.equal(sent.length, 1, '같은 완료를 다시 저장하지 않는다');
});

test('완료 저장: 겹친 마을 진입·온라인 복구 요청은 하나로 합친다', async () => {
  const module = await import('../game/completion.ts').catch(() => ({}));
  assert.equal(typeof module.createCompletionQueue, 'function');
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  let sendCount = 0, resolve;
  const queue = module.createCompletionQueue(() => { sendCount++; return new Promise(r => { resolve = r; }); }, storage);
  queue.enqueue('finished-session', { Q1: 2 });
  const first = queue.flush(), second = queue.flush();
  resolve({ total: 1 });
  assert.deepEqual(await first, await second);
  assert.equal(sendCount, 1);
});

test('완료 저장: 오프라인에서 두 번 걸어도 앞 판의 보류 답을 덮어쓰지 않는다', async () => {
  const { createCompletionQueue } = await import('../game/completion.ts');
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const queue = createCompletionQueue(async () => undefined, storage);
  queue.enqueue('first-session', { Q1: 1 }); await queue.flush();
  queue.enqueue('second-session', { Q1: 6 }); await queue.flush();
  const sent = [];
  const reopened = createCompletionQueue(async (id, answers) => { sent.push({ id, answers }); return { total: sent.length }; }, storage);
  await reopened.flush();
  assert.deepEqual(sent, [{ id: 'first-session', answers: { Q1: 1 } }, { id: 'second-session', answers: { Q1: 6 } }]);
  assert.equal(data.size, 0);
});
