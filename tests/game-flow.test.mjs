import assert from 'node:assert/strict';
import test from 'node:test';
import { createJourney, transition, currentQuestion } from '../game/flow.ts';
import { displayOptions, answerFor, buildGameResponse, orderedQuestions } from '../game/response.ts';
import { buildResponseMeta } from '../app/survey-response.ts';
import { scoreAnswers, typeCode } from '../game/score.ts';

function play(code, sessionId) {
  let state = createJourney(sessionId, 1000);
  const events = [];
  let at = 1100;
  const act = (command) => {
    const result = transition(state, { ...command, at: at += 100 });
    state = result.state;
    events.push(...result.events);
  };
  act({ type: 'start' });
  for (let stage = 0; stage < 5; stage++) {
    for (let q = 0; q < 3; q++) {
      const question = currentQuestion(state);
      const choice = code[['hands', 'time', 'reach'].indexOf(question.axis)] === '1' ? 'b' : 'a';
      const side = displayOptions(sessionId, question).find(option => option.key === choice).side;
      act({ type: 'visible', questionId: question.id });
      act({ type: 'approach', questionId: question.id, side });
      act({ type: 'answer', questionId: question.id, level: 2 });
    }
    act({ type: 'exit', stageIndex: stage });
  }
  return { state, events };
}

test('every question: left/right display maps all six answers to original A/B', () => {
  for (const question of orderedQuestions) {
    const orders = new Set();
    for (const session of ['person-0', 'person-1']) {
      const options = displayOptions(session, question);
      orders.add(options.map(option => option.key).join(''));
      for (const { key, side } of options) {
        assert.deepEqual([0, 1, 2].map(level => answerFor(session, question, side, level)), key === 'a' ? [3, 2, 1] : [4, 5, 6]);
      }
    }
    assert.equal(orders.size, 2);
  }
});

test('both display orders complete all eight types through the actual flow', () => {
  for (const code of ['000', '001', '010', '011', '100', '101', '110', '111']) {
    const a = play(code, 'person-0');
    const b = play(code, 'person-1');
    assert.equal(a.state.phase, 'arrived');
    assert.equal(a.state.result, code);
    assert.equal(typeCode(scoreAnswers(orderedQuestions, a.state.answers)), code);
    assert.deepEqual(a.state.answers, b.state.answers);
    assert.equal(Object.keys(a.state.answers).length, 15);
    assert.equal(a.events.filter(event => event.type === 'question.answered').length, 15);
    assert.equal(a.events.filter(event => event.type === 'stage.completed').length, 5);
    assert.equal(a.events.filter(event => event.type === 'journey.arrived').length, 1);
  }
});

test('no answer before display or approach; no early exit or stale question input', () => {
  let state = transition(createJourney('person-0', 1000), { type: 'start', at: 1100 }).state;
  const questionId = currentQuestion(state).id;
  for (const command of [
    { type: 'answer', questionId, level: 0 },
    { type: 'approach', questionId, side: 'left' },
    { type: 'exit', stageIndex: 0 },
    { type: 'visible', questionId: 'C-T1' },
  ]) assert.equal(transition(state, { ...command, at: 1200 }).state, state);
  state = transition(state, { type: 'visible', questionId, at: 1300 }).state;
  assert.equal(transition(state, { type: 'answer', questionId, level: 0, at: 1400 }).state, state);
  state = transition(state, { type: 'approach', questionId, side: 'left', at: 1400 }).state;
  for (const level of [-1, 3, 0.5, NaN, Infinity]) {
    assert.equal(transition(state, { type: 'answer', questionId, level, at: 1500 }).state, state);
  }
  const confirmed = transition(state, { type: 'answer', questionId, level: 0, at: 1500 });
  assert.notEqual(confirmed.state, state);
  assert.equal(transition(confirmed.state, { type: 'answer', questionId, level: 0, at: 1600 }).state, confirmed.state);
  assert.equal(Object.keys(confirmed.state.answers).length, 1);
});

test('first display time survives leaving and returning; duplicate arrival is ignored', () => {
  let state = transition(createJourney('s', 1000), { type: 'start', at: 1100 }).state;
  const questionId = currentQuestion(state).id;
  for (const command of [
    { type: 'visible', questionId, at: 1200 },
    { type: 'approach', questionId, side: 'left', at: 1300 },
    { type: 'leave', at: 1400 },
    { type: 'visible', questionId, at: 1500 },
    { type: 'approach', questionId, side: 'right', at: 1600 },
    { type: 'answer', questionId, level: 1, at: 1900 },
  ]) state = transition(state, command).state;
  assert.deepEqual(state.timing[questionId], { firstVisibleAt: 1200, firstAnsweredAt: 1900 });
  assert.equal(buildGameResponse(state).responseMeta[questionId].responseTimeMs, 700);
  const done = play('111', 's').state;
  assert.equal(transition(done, { type: 'exit', stageIndex: 4, at: 99000 }).state, done);
});

test('pause blocks input and resume retains answers, current question and elapsed time', () => {
  let state = transition(createJourney('s', 1000), { type: 'start', at: 1100 }).state;
  const questionId = currentQuestion(state).id;
  state = transition(state, { type: 'visible', questionId, at: 1200 }).state;
  state = transition(state, { type: 'approach', questionId, side: 'left', at: 1300 }).state;
  const paused = transition(state, { type: 'pause', at: 1400 }).state;
  assert.equal(transition(paused, { type: 'answer', questionId, level: 1, at: 1500 }).state, paused);
  const resumed = transition(paused, { type: 'resume', at: 5000 }).state;
  assert.equal(resumed.phase, 'reply');
  const answered = transition(resumed, { type: 'answer', questionId, level: 1, at: 5300 }).state;
  assert.equal(buildGameResponse(answered).responseMeta[questionId].responseTimeMs, 4100);
});

test('invalid timestamps never corrupt the response clock', () => {
  const state = createJourney('s', 1000);
  for (const at of [NaN, Infinity, -1, 999]) assert.equal(transition(state, { type: 'start', at }).state, state);
});

test('response snapshot is isolated; legacy metadata only accesses question IDs', () => {
  const state = play('101', 's').state;
  const snapshot = buildGameResponse(state);
  const id = orderedQuestions[0].id;
  snapshot.answers[id] = 2;
  snapshot.timing[id].firstVisibleAt = 0;
  assert.equal(state.answers[id], 6);
  assert.ok(state.timing[id].firstVisibleAt > 0);
  const ids = orderedQuestions.map(q => new Proxy({ id: q.id }, {
    get(target, property) {
      assert.equal(property, 'id', 'legacy helper no longer has the ID-only contract');
      return target.id;
    },
  }));
  const meta = buildResponseMeta({ questions: ids, sessionId: state.sessionId, answers: state.answers, timing: state.timing });
  assert.deepEqual(meta, buildGameResponse(state).responseMeta);
});
