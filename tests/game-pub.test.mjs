import assert from 'node:assert/strict';
import test from 'node:test';

// 후원주점판(game/pub.ts) — 주소에 ?pub 이 있으면 다른 파일이 문항 목록을 만들기 전에 길이 줄어야 한다. 시험 파일마다 따로 돌아서 다른 시험엔 안 번진다.
globalThis.location = { search: '?pub' };
await import('../game/pub.ts');
const { createJourney, transition, currentQuestion } = await import('../game/flow.ts');
const { displayOptions, orderedQuestions } = await import('../game/response.ts');

test('후원주점판 — 동네 입구·골목 여섯 문항, 축마다 둘', () => {
  assert.deepEqual(orderedQuestions.map(q => q.id), ['C-H1', 'C-T1', 'C-R1', 'C-H2', 'C-T2', 'C-R2']);
});

test('후원주점판 — 여섯 문항 답하면 언덕에 닿고, 고른 쪽대로 유형이 나온다', () => {
  for (const code of ['000', '101', '111']) {
    let state = createJourney(`pub-${code}`, 1000), at = 1100;
    const act = command => { state = transition(state, { ...command, at: at += 100 }).state; };
    act({ type: 'start' });
    for (let stage = 0; stage < 2; stage++) {
      for (let q = 0; q < 3; q++) {
        const question = currentQuestion(state);
        const choice = code[['hands', 'time', 'reach'].indexOf(question.axis)] === '1' ? 'b' : 'a';
        const side = displayOptions(state.sessionId, question).find(option => option.key === choice).side;
        act({ type: 'visible', questionId: question.id });
        act({ type: 'approach', questionId: question.id, side });
        act({ type: 'answer', questionId: question.id, level: 1 });
      }
      act({ type: 'exit', stageIndex: stage });
    }
    assert.equal(state.phase, 'arrived');
    assert.equal(state.result, code);
  }
});
