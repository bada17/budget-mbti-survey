import { ROUTE, REPLIES, TYPES, DESTINATION, type Question } from './content';
import { currentQuestion, type JourneyState } from './flow';
import { displayOptions, type DisplaySide } from './response';

function text<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, value = '') {
  const element = document.createElement(tag); element.className = className; element.textContent = value; return element;
}

export function createUI(root: HTMLElement, actions: {
  start: () => void; retry: () => void; reply: (questionId: string, level: number) => void;
  leave: () => void; approach: (side: DisplaySide) => void;
}) {
  // Static shell only; all content/dynamic data is assigned through textContent.
  root.innerHTML = `<div class="game-shell">
    <header class="game-header"><span class="brand">함께하는 시민행동</span><span class="journey-count"></span></header>
    <section class="intro"><span class="intro-kicker">당신의 선택을 따라 걷는</span><h1>예산 성향<br>동네 여행</h1><p>주민들의 바람을 듣고,<br>마음이 가는 쪽으로 걸어 보세요.</p></section>
    <section class="route-heading" hidden><span class="route-number"></span><h1 class="area-name"></h1><ol class="route-dots" aria-label="동네 진행"></ol></section>
    <section class="conversation" aria-label="주민들의 바람" hidden></section>
    <div class="world-viewport" tabindex="0" role="group" aria-label="동네 길. 방향키 또는 아래 이동 패드로 걸어가세요."><div id="game-canvas"></div><div class="world-caption"></div></div>
    <div class="feedback" role="status" aria-live="polite"></div>
    <footer class="game-controls"><div class="start-controls"><button class="primary start" disabled>동네를 준비하고 있어요</button><p>다섯 동네 · 열다섯 번의 선택</p><button class="retry" hidden>다시 불러오기</button></div>
      <div class="walking-controls" hidden><div class="walk-hint"><strong>마음이 가는 곳으로</strong><span>패드를 누르고 끌어 걸어요</span><span class="keyboard-hint">방향키로도 걸을 수 있어요</span></div><div class="movement-pad" role="group" aria-label="이동 패드"><span class="pad-arrow up">↑</span><span class="pad-arrow right">→</span><span class="pad-arrow down">↓</span><span class="pad-arrow left">←</span><span class="pad-knob"></span></div></div>
      <section class="replies" aria-label="주민에게 대답하기" hidden></section>
    </footer>
    <section class="arrival" hidden><span class="arrival-place"></span><h1 class="type-name"></h1><p class="type-line"></p></section>
    <div class="pause-screen" hidden><p>잠시 쉬어 가요</p><span>돌아오면 걷던 곳에서 이어져요.</span></div>
  </div>`;
  const get = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const start = get<HTMLButtonElement>('.start');
  const conversation = get('.conversation');
  const replies = get('.replies');
  const pad = get('.movement-pad');
  let conversationKey = '';
  let replyKey = '';
  start.onclick = actions.start;
  get('.retry').onclick = actions.retry;
  const feedback = get('.feedback');

  function showQuestion(state: JourneyState, question: Question) {
    const key = `${state.sessionId}:${question.id}`;
    if (conversationKey === key) return;
    conversationKey = key;
    conversation.replaceChildren();
    conversation.append(text('h2', 'question-prompt', question.prompt));
    const options = text('div', 'resident-wishes');
    for (const option of displayOptions(state.sessionId, question)) {
      const button = text('button', 'resident-wish');
      button.dataset.side = option.side;
      button.setAttribute('aria-label', `${option.side === 'left' ? '왼쪽' : '오른쪽'} 주민에게 다가가기: ${option.text}`);
      button.append(text('span', 'resident-label', option.side === 'left' ? '왼쪽 주민' : '오른쪽 주민'), text('span', 'wish-text', option.text));
      button.onclick = () => actions.approach(option.side);
      options.append(button);
    }
    conversation.append(options);
  }

  return {
    pad, feedback,
    ready() { start.disabled = false; start.textContent = '길 떠나기'; get('.retry').hidden = true; },
    loadingError() { start.disabled = true; start.textContent = '그림을 불러오지 못했어요'; get('.retry').hidden = false; },
    render(state: JourneyState, revealingId?: string) {
      const intro = state.phase === 'intro'; const arrived = state.phase === 'arrived';
      root.dataset.phase = state.phase; root.dataset.stage = String(state.stageIndex + 1);
      root.dataset.question = currentQuestion(state)?.id ?? '';
      root.dataset.answered = String(Object.keys(state.answers).length);
      get('.intro').hidden = !intro; get('.start-controls').hidden = !intro;
      get('.route-heading').hidden = intro || arrived;
      get('.game-header').hidden = arrived;
      get('.world-viewport').hidden = arrived;
      get('.game-controls').hidden = arrived;
      get('.arrival').hidden = !arrived;
      get('.pause-screen').hidden = !state.paused || intro || arrived;
      get('.journey-count').textContent = intro ? '예산 성향 게임' : `${Object.keys(state.answers).length} / 15`;
      get('.route-number').textContent = `동네 ${state.stageIndex + 1}`;
      get('.area-name').textContent = ROUTE[state.stageIndex].area;
      get('.route-dots').replaceChildren(...ROUTE.map((stage, i) => {
        const item = text('li', i <= state.stageIndex ? 'reached' : '');
        item.setAttribute('aria-label', `${stage.area}${i === state.stageIndex ? ', 현재 동네' : ''}`); return item;
      }));
      const question = currentQuestion(state);
      const visible = Boolean(question && (state.phase === 'question' || state.phase === 'reply' || revealingId === question.id));
      conversation.hidden = !visible;
      if (visible && question) showQuestion(state, question);
      for (const wish of conversation.querySelectorAll<HTMLButtonElement>('.resident-wish')) {
        wish.classList.toggle('chosen', state.candidate === wish.dataset.side);
        wish.disabled = state.phase === 'reply' || state.paused;
      }
      const replying = state.phase === 'reply';
      replies.hidden = !replying;
      get('.walking-controls').hidden = intro || arrived || replying;
      if (replying && question) {
        const key = `${question.id}:${state.candidate}`;
        if (replyKey !== key) {
          replyKey = key; replies.replaceChildren();
          replies.append(text('p', 'reply-title', '어떤 마음으로 대답할까요?'));
          REPLIES.forEach((reply, level) => {
            const button = text('button', 'reply-button', reply.line);
            button.dataset.level = String(level);
            button.onclick = () => actions.reply(question.id, level);
            replies.append(button);
          });
          const back = text('button', 'back-to-path', '다른 주민에게 가 볼래요');
          back.onclick = actions.leave; replies.append(back);
          replies.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
        }
      } else replyKey = '';
      get('.world-caption').textContent = intro ? '한 걸음, 한 사람, 하나의 선택' : question ? `${question.place}${visible ? ' · 주민에게 가까이 가 보세요' : ' 쪽으로 걸어가 보세요'}` : state.stageIndex === 4 ? `${DESTINATION.name}으로 걸어가세요` : '위쪽 길을 따라 다음 동네로';
      if (arrived && state.result) {
        get('.arrival-place').textContent = DESTINATION.name;
        get('.type-name').textContent = TYPES[state.result].name;
        get('.type-line').textContent = TYPES[state.result].line;
      }
    },
    focusWorld() { get('.world-viewport').focus({ preventScroll: true }); },
    destroy() { root.replaceChildren(); },
  };
}

export type GameUI = ReturnType<typeof createUI>;
