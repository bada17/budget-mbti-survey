/*
  화면 위에 얹는 HTML — 글은 캔버스에 그리지 않는다(읽기 쉽고, 화면 읽기 도구가 읽고, 글자가 또렷하다).
  게임 진행은 여기서 정하지 않는다. 단추를 누르면 받은 콜백을 부르기만 한다.
  말 상자(이름표 + 한 자씩 + 웅얼 소리)는 동물의 숲에서 빌린 방식이다(사용자 10-14) — 이름·그림·소리는 베끼지 않고 우리 것으로.
  모양은 ui.css — 둥근 글꼴 「주아」(제목·이름표·단추)와 「Pretendard」(읽는 글)를 이 사이트에서 직접 내보낸다(외부 글꼴 서버에 방문 기록이 안 가게).
*/
import { AXES, ROUTE, REPLIES, TYPES, DESTINATION, type Question, type TypeCode } from './content';
import type { AxisScores } from './score';
import { currentQuestion, type JourneyState } from './flow';
import { displayOptions, orderedQuestions, type DisplaySide } from './response';
import { COATS, HAIRS, SKINS, FORMS, HAIR_MENU, HAIR_STYLES, TOPS, PATTERNS, ACCESSORIES, GLASSES, fullPick, withForm, randomPick, nameFrom, type Pick } from './look';
import { sfx } from './sfx';
import { cleanName, josa, type Me } from './profile';
import { PRIVACY_URL, type Channel, type ContactForm } from './contact';
import type { Stats } from './api';
import type { Point } from './room';
import { VILLAGE_NAME } from './village';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const button = (className: string, text: string, onClick: () => void) => {
  const b = el('button', className, text); b.type = 'button'; b.onclick = onClick; return b;
};
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
const icon = (node: HTMLElement, svg: string, label: string) => { node.innerHTML = svg; node.setAttribute('aria-label', label); return node; };
export const ICONS = {
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2" class="i"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.8" width="12" height="18.4" rx="3.2"/><rect x="8.2" y="5.6" width="7.6" height="10.6" rx="1.2" class="i"/><circle cx="12" cy="18.6" r="1" class="i"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.4 2.8-5.2 5.5-5.2s4.9 1.8 5.5 5.2z"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.2 13.9c2.6-.4 4.7 1.2 5.3 4.6h-4.4"/></svg>',
  hand: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 5.5a2.2 2.2 0 0 1 4.4 0v8.2l5.1 1.1a3 3 0 0 1 2.3 3.4l-1.2 6.6A3.5 3.5 0 0 1 20.2 28h-5.6a3.5 3.5 0 0 1-2.8-1.4l-4.6-6.1a2.1 2.1 0 0 1 3.1-2.8l2.7 2.4z"/></svg>',
};

/**
 * 말 상자 — 글자가 한 자씩 웅얼 소리와 함께 나오고, 끝나면 ▼. 누르면(finish) 바로 다 나온다. 움직임 줄이기를 켠 사람에겐 한 번에.
 * 같은 칸에 다시 부르면 앞의 것은 그냥 멈춘다(done 을 부르지 않는다).
 */
const typers = new WeakMap<HTMLElement, { cancel(): void; finish(): void }>();
export function typeOut(node: HTMLElement, text: string, done = () => {}, pitch = 0) {
  typers.get(node)?.cancel();
  const shown = document.createTextNode(''), next = el('span', 'g-next', '▼');
  next.setAttribute('aria-hidden', 'true');
  node.replaceChildren(shown);
  let i = 0, timer = 0, over = false;
  const finish = () => { if (over) return; over = true; clearTimeout(timer); typers.delete(node); shown.data = text; node.append(next); done(); };
  const tick = () => {
    const ch = text[i++] ?? '';
    shown.data = text.slice(0, i);
    sfx.babble(ch, pitch);
    if (i >= text.length) finish(); else timer = window.setTimeout(tick, /[,.…!?]/.test(ch) ? 170 : 36);
  };
  typers.set(node, { cancel: () => { over = true; clearTimeout(timer); typers.delete(node); }, finish });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish(); else timer = window.setTimeout(tick, 140);
  return finish;
}
export const finishTyping = (node: HTMLElement) => typers.get(node)?.finish();
const SIDES: DisplaySide[] = ['left', 'right'];
/**
 * 폰의 「뒤로」 가 화면을 덮은 판만 닫게(기획 4차 — 판을 닫으려고 뒤로를 누르면 게임 밖으로 나가 버렸다).
 * 판을 열 때 기록을 하나 쌓고, 뒤로(popstate)면 맨 위 판을 닫는다. 단추로 닫으면 돌려준 함수가 쌓은 기록을 되돌린다(그 뒤로는 무시).
 */
const backStack: (() => void)[] = [];
let skipPop = 0;
if (typeof window !== 'undefined') window.addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } backStack.pop()?.(); });
export function backCloses(close: () => void) {
  backStack.push(close);
  history.pushState({ dongne: backStack.length }, '');
  return () => {
    const i = backStack.lastIndexOf(close);
    if (i < 0) return;
    backStack.splice(i, 1); skipPop++; history.back();
  };
}

/** 도너스 정기후원. utm 은 도너스 약정에 남아 「게임에서 온 후원」을 가를 수 있다. */
export const DONATE_URL = 'https://secure.donus.org/withaction0909/pay/step1?utm_source=dongne-game&utm_medium=game&utm_campaign=budget-game';

/**
 * 소식 받기 칸(연락처) — 내 이웃 판(neighborSheet)과 로그인 직후 판(town.ts openNews)이 같이 쓴다.
 * 동의 칸·문구는 하나뿐이다(뜻은 contact.ts 를 지킨다). email 을 주면 로그인으로 받은 그 주소를 채워 둔다 — 고쳐 쓸 수 있다.
 * 봇 막이는 칸이 보인 때부터 잰다 — 숨겼다 보이면 shown() 을 부른다.
 */
export function contactForm(send: (form: ContactForm) => Promise<{ ok: boolean; text: string }>, title: string, email = '') {
  let openedAt = Date.now();
  const contact = el('form', 'g-contact');
  contact.innerHTML = `<h3>${title} <small>(안 받아도 돼요)</small></h3>
    <p class="g-small">시험판이라 아직 저장하지 않아요. 받을 방법만 미리 만들어 두었어요.</p>
    <div class="g-radio"><label><input type="radio" name="channel" value="email" checked> 이메일</label><label><input type="radio" name="channel" value="sms"> 문자</label></div>
    <input class="g-input" name="address" type="email" autocomplete="email" placeholder="이메일 주소">
    <input class="g-trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label class="g-check"><input type="checkbox" name="age14"> <span>만 14세 이상이에요 <b>(필수)</b></span></label>
    <label class="g-check"><input type="checkbox" name="collect"> <span>개인정보 수집·이용에 동의해요 <b>(필수)</b></span></label>
    <details><summary>무엇을 왜 받나요</summary><ul>
      <li>목적: 내 이웃 소식과 예산 게임 안내 보내기</li>
      <li>항목: 이메일 주소 또는 휴대전화 번호(고른 하나), 내 이웃·유형 결과</li>
      <li>보유·이용 기간: [단체가 정할 것] — 그 전이라도 거두시면 바로 지워요</li>
      <li>동의하지 않을 수 있어요. 그래도 게임과 결과는 그대로이고, 소식만 받지 못해요.</li></ul></details>
    <label class="g-check"><input type="checkbox" name="marketing"> <span>시민행동 활동·후원 소식도 받을래요 (선택)</span></label>
    <details><summary>선택 동의 자세히</summary><ul>
      <li>뉴스레터·문자로 시민행동 활동과 후원 안내를 보내요(광고성 정보).</li>
      <li>언제든 그만 받을 수 있어요. 동의하지 않아도 이웃 소식은 받을 수 있어요.</li></ul></details>
    <p class="g-small"><a target="_blank" rel="noopener"></a></p>
    <button class="g-primary" type="submit">소식 받기</button>
    <p class="g-small g-result" role="status"></p>`;
  const link = contact.querySelector('a')!; link.href = PRIVACY_URL; link.textContent = '개인정보처리방침 보기';
  const address = contact.querySelector<HTMLInputElement>('[name=address]')!;
  address.value = email;
  contact.querySelectorAll<HTMLInputElement>('[name=channel]').forEach(radio => { radio.onchange = () => {
    if (!radio.checked) return;
    const sms = radio.value === 'sms';
    address.type = sms ? 'tel' : 'email'; address.autocomplete = sms ? 'tel' : 'email';
    address.placeholder = sms ? '휴대전화 번호' : '이메일 주소'; address.inputMode = sms ? 'numeric' : 'email';
  }; });
  contact.onsubmit = async event => {
    event.preventDefault();
    const data = new FormData(contact);
    const result = await send({
      channel: data.get('channel') as Channel, address: String(data.get('address') ?? ''),
      age14: data.has('age14'), collect: data.has('collect'), marketing: data.has('marketing'),
      website: String(data.get('website') ?? ''), openedAt,
    });
    contact.querySelector('.g-result')!.textContent = result.text;
    if (!result.ok || contact.querySelector('.g-join')) return;
    // 소식 받기와 회원 권유를 묶는다(사용자 10-14). 회원 = 도너스 정기후원(일반·후원회원).
    const join = el('a', 'g-link g-give g-join', '소식에서 한 걸음 더 — 함께하는 시민행동 회원 되기 →');
    join.href = `${DONATE_URL}&utm_content=after-news`; join.target = '_blank'; join.rel = 'noopener';
    contact.append(join);
  };
  return { form: contact, shown: () => { openedAt = Date.now(); } };
}

export function createUI(root: HTMLElement, actions: {
  start(): void; retry(): void; sound(): void; openTable(): void;
  reply(questionId: string, level: number): void;
  goTo(side: DisplaySide): void; goDoor(): void;
}) {
  root.replaceChildren();
  const shell = el('div', 'g');
  const stage = el('div', 'g-stage'); stage.id = 'game-canvas';
  const bubbles = el('div', 'g-bubbles');
  const marks = el('div', 'g-marks');
  const hud = el('header', 'g-hud');
  const area = el('b', 'g-area');
  const where = el('div', 'g-where'); where.append(area);
  const progress = el('ol', 'g-progress'); progress.setAttribute('aria-label', '진행');
  const pips = Array.from({ length: 15 }, (_, i) => { const li = el('li'); if (i % 3 === 2) li.className = 'gap'; return li; });
  progress.append(...pips);
  const sound = button('g-sound', '', actions.sound);
  sound.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="w" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg>';
  hud.append(where, progress, sound);
  const ask = el('section', 'g-ask'); ask.hidden = true;
  const prompt = el('h2', 'g-prompt');
  ask.append(prompt);
  const door = button('g-door', '', actions.goDoor); door.hidden = true;
  const hint = el('p', 'g-hint'); hint.hidden = true;
  const replies = el('section', 'g-replies'); replies.setAttribute('aria-label', '대답 고르기');
  // 말 상자 — 이름표 + 주민의 말(한 자씩). 다 나오면 위에 내 대답이 뜬다.
  const talk = el('div', 'g-talk'), speaker = el('span', 'g-name'), quote = el('p', 'g-quote'), replyList = el('div', 'g-reply-list');
  talk.append(speaker, quote);
  talk.onclick = () => finishTyping(quote);
  replies.append(replyList, talk);
  const intro = el('section', 'g-intro');
  intro.innerHTML = `<div class="g-intro-card"><span class="g-kicker">함께하는 시민행동 · 예산 성향 게임 · 3분</span>
    <h1>함께해요<br>시민의 숲</h1>
    <p>주민 열다섯 명이 바라는 게 서로 달라요.<br>마음 가는 사람에게 걸어가 이야기를 들어 주세요.</p>
    <ul class="g-notes"></ul>
    <button class="g-primary g-start" type="button" disabled>준비하고 있어요…</button>
    <button class="g-link g-table-open" type="button" hidden>테이블에서 같이 하기</button>
    <button class="g-link g-home-open" type="button" hidden>걷지 않고 마을로 가기</button>
    <button class="g-link g-login-open" type="button" hidden>전에 해 봤어요 — 내 주민증 불러오기</button>
    <button class="g-retry" type="button" hidden>다시 불러오기</button></div>`;
  const sheet = el('section', 'g-sheet'); sheet.hidden = true; // 내 모습·테이블·이웃이 번갈아 쓰는 아래 판
  const panel = el('section', 'g-panel'); panel.hidden = true; // 화면을 덮는 판(다른 사람들 마음)
  const caption = el('section', 'g-caption'); caption.hidden = true; // 버스 장면 글
  const end = el('section', 'g-end'); end.hidden = true;
  const toast = el('p', 'g-toast'); toast.hidden = true;
  const live = el('div', 'g-sr'); live.setAttribute('aria-live', 'polite');
  shell.append(stage, bubbles, marks, hud, ask, door, hint, replies, intro, end, sheet, caption, panel, toast, live);
  root.append(shell);
  const start = intro.querySelector<HTMLButtonElement>('.g-start')!;
  const retry = intro.querySelector<HTMLButtonElement>('.g-retry')!;
  start.onclick = actions.start; retry.onclick = actions.retry;
  intro.querySelector<HTMLButtonElement>('.g-table-open')!.onclick = actions.openTable;

  let bubbleEls: Partial<Record<DisplaySide, HTMLButtonElement>> = {};
  let replyKey = '';
  let askId = 0; // 늦게 도착한 「말풍선 치우기」 가 다음 방의 말풍선을 지우지 않게
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (ms: number, fn: () => void) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const openSheet = (...children: Node[]) => { sheet.replaceChildren(...children); sheet.hidden = false; };
  const closeSheet = () => { sheet.hidden = true; sheet.replaceChildren(); };

  return {
    surface: stage,
    ready() { start.disabled = false; start.textContent = '출발'; retry.hidden = true; },
    loadError() { start.disabled = true; start.textContent = '불러오지 못했어요'; retry.hidden = false; },
    hideIntro() { intro.classList.add('gone'); later(400, () => { intro.hidden = true; }); },
    /** 게임 서버가 있을 때만 「테이블에서 같이 하기」 를 보인다. */
    online(on: boolean) { intro.querySelector<HTMLElement>('.g-table-open')!.hidden = !on; },
    /** 다시 온 사람이 링크로 걷기 화면에 왔을 때 — 걷지 않고 마을로(기획 4차). */
    homeOpen(run: () => void) { const b = intro.querySelector<HTMLButtonElement>('.g-home-open')!; b.hidden = false; b.onclick = run; },
    /** 로그인 안 한 사람 — 다른 기기에서 지켜 둔 주민증 불러오기(login.ts). */
    /** 시작 화면 로그인 단추 — 로그인했으면 label(「✓ 카카오로 로그인됨」)로 늘 보인다(사용자 10-16 「된 건지 모르겠다」). */
    loginOpen(run: () => void, label?: string) { const b = intro.querySelector<HTMLButtonElement>('.g-login-open')!; b.hidden = false; b.onclick = run; if (label) b.textContent = label; },
    /** 시작 화면 아래 한 줄씩 — 초대한 친구, 지난번 이웃, 테이블. */
    notes(lines: string[]) { intro.querySelector('.g-notes')!.replaceChildren(...lines.map(line => el('li', '', line))); },

    render(state: JourneyState) {
      if (shell.dataset.phase === 'village') return; // 마을에선 걷기 진행을 그리지 않는다
      shell.dataset.phase = state.phase;
      const answered = Object.keys(state.answers).length;
      area.textContent = state.phase === 'arrived' ? DESTINATION.name : ROUTE[Math.min(state.stageIndex, 4)].area;
      pips.forEach((pip, i) => pip.classList.toggle('on', i < answered));
      const question = currentQuestion(state);
      for (const side of SIDES) {
        bubbleEls[side]?.classList.toggle('chosen', state.phase === 'reply' && state.candidate === side);
        bubbleEls[side]?.classList.toggle('dim', state.phase === 'reply' && state.candidate !== side);
      }
      const open = state.phase === 'reply' && Boolean(state.candidate) && Boolean(question) && !state.paused;
      replies.classList.toggle('open', open);
      replies.inert = !open;
      if (open && question) {
        const key = `${question.id}:${state.candidate}`;
        if (key !== replyKey) {
          replyKey = key;
          const wish = displayOptions(state.sessionId, question).find(o => o.side === state.candidate)!.text;
          speaker.textContent = nameFrom(`${question.id}:${state.candidate}`);
          replies.classList.remove('typed');
          typeOut(quote, wish, () => replies.classList.add('typed'), state.candidate === 'left' ? -40 : 40);
          replyList.replaceChildren(...REPLIES.map((reply, level) => {
            const b = button('g-reply', '', () => actions.reply(question.id, level));
            b.append(el('span', 'g-dots', '●'.repeat(level + 1) + '○'.repeat(2 - level)), el('span', '', reply.line));
            return b;
          }));
          live.textContent = `${speaker.textContent}: ${wish}. 대답을 골라 주세요.`;
        }
      } else replyKey = '';
    },

    /** 방에 들어서면 질문과 두 주민의 말풍선을 띄운다. 다 뜰 때까지 걸리는 ms 를 돌려준다. */
    ask(question: Question, sessionId: string, anchors: Record<DisplaySide, Point>, onBubble: (i: number) => void) {
      askId++;
      prompt.textContent = question.prompt;
      ask.hidden = false; ask.classList.remove('pop'); void ask.offsetWidth; ask.classList.add('pop');
      bubbles.replaceChildren(); bubbleEls = {};
      displayOptions(sessionId, question).forEach((option, i) => {
        const bubble = button('g-bubble', option.text, () => actions.goTo(option.side));
        bubble.dataset.side = option.side;
        bubble.style.left = `${anchors[option.side].x}px`;
        bubble.style.top = `${anchors[option.side].y}px`;
        bubble.style.animationDelay = `${120 + i * 140}ms`;
        bubble.setAttribute('aria-label', `${option.side === 'left' ? '왼쪽' : '오른쪽'} 주민: ${option.text}. 누르면 이 주민에게 걸어가요.`);
        bubbleEls[option.side] = bubble;
        bubbles.append(bubble);
        later(120 + i * 140, () => onBubble(i));
      });
      live.textContent = `${question.place}. ${question.prompt}`;
      return 120 + 140 + 260;
    },
    /** 고른 주민의 말풍선만 잠깐 남겼다가 질문과 함께 걷는다. */
    clearAsk(chosen?: DisplaySide) {
      if (!chosen) { ask.hidden = true; bubbles.replaceChildren(); bubbleEls = {}; return; }
      for (const side of SIDES) if (side !== chosen) bubbleEls[side]?.classList.add('bye');
      bubbleEls[chosen]?.classList.add('thanks');
      ask.classList.add('done');
      const id = askId;
      later(650, () => { if (id !== askId) return; ask.hidden = true; ask.classList.remove('done'); bubbles.replaceChildren(); bubbleEls = {}; });
    },
    /** 고른 주민이 서 있던 자리에 생긴 것 — 문항의 짧은 이름. 인자 없이 부르면 치운다. */
    made(text?: string, at?: Point) {
      marks.querySelector('.g-made')?.remove();
      if (!text || !at) return;
      const sign = el('div', 'g-made', text);
      sign.style.left = `${at.x}px`; sign.style.top = `${at.y}px`;
      marks.append(sign);
      live.textContent = `${text}, 생겼어요.`;
    },
    /** 언덕에 선 사람들 이름표. */
    tags(list: { text: string; x: number; y: number }[]) {
      marks.querySelectorAll('.g-tag').forEach(tag => tag.remove());
      for (const { text, x, y } of list) {
        const tag = el('span', 'g-tag', text);
        tag.style.left = `${x}px`; tag.style.top = `${y}px`;
        marks.append(tag);
      }
    },
    /** 열린 문 위 화살표 — 누르면 문으로 걸어간다. 글은 화면 읽기 도구에만. */
    door(label?: string, at?: Point) {
      door.hidden = !label;
      if (label && at) { icon(door, ICONS.up, label); door.style.left = `${at.x}px`; door.style.top = `${at.y}px`; }
    },
    hint(text = '') { hint.hidden = !text; hint.className = 'g-hint'; hint.textContent = text; },
    /** 첫 방 — 글 대신 꾹 누르는 손(사용자 10-14 「필요 없는 글은 빼」). */
    walkHint(label: string) { hint.hidden = false; hint.className = 'g-hint g-hint-hand'; icon(hint, ICONS.hand, label); live.textContent = label; },
    toast(text: string) { toast.textContent = text; toast.hidden = false; later(2200, () => { toast.hidden = true; }); },
    setSound(muted: boolean) { sound.classList.toggle('muted', muted); sound.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); },

    /** 내 모습 고르기 — 이름(선택)과 머리 모양·머리 색·옷 색·피부. 고를 때마다 change, 다 고르면 done. */
    /** 아래 판의 윗선(게임 화면 위에서부터 CSS px). 판이 닫혀 있으면 화면 맨 아래. */
    sheetTop() {
      const box = shell.getBoundingClientRect();
      return sheet.hidden ? box.height : sheet.getBoundingClientRect().top - box.top;
    },
    /** 아래 판이나 화면을 덮는 판이 열려 있나 — 그동안은 걷지 않는다. */
    busy() { return !sheet.hidden || !panel.hidden; },
    /** 끝 화면에서 카드와 아래 단추 사이에 남은 풀밭(게임 화면 위에서부터 CSS px). */
    endFree() {
      const box = shell.getBoundingClientRect();
      const card = end.querySelector('.g-end-card')?.getBoundingClientRect(), bar = end.querySelector<HTMLElement>('.g-end-actions');
      const barBox = bar && !bar.hidden ? bar.getBoundingClientRect() : undefined;
      return { top: card ? card.bottom - box.top : 0, bottom: barBox ? barBox.top - box.top : box.height };
    },
    /**
     * 내 모습 고르기 — 승인한 기준(GPT 검토판 roster.ts, 10-15): 기본 모습 열둘을 고른 뒤 머리 모양·머리색(바탕색·색 넣기·섞는 색)·옷·안경·머리 장식을 하나씩 따로.
     * 줄이 열 개라 탭 셋(모습·머리·옷과 꾸미기)으로 나눈다. 탭은 겹쳐 두고 안 보이는 탭은 자리만 차지해서 판 높이가 늘 같다 —
     * 판 위에 크게 보이는 내 모습이 탭을 바꿔도 가려지지 않게(JourneyScene 의 dressView 가 처음 판 높이로 자리를 잡는다).
     */
    dresser(me: Me, on: { change(me: Me): void; done(me: Me): void }) {
      const current = { name: me.name, pick: fullPick(me.pick), at: me.at }; // at = 직접 고른 때(손대면 지금으로)
      const name = el('input', 'g-input'); name.maxLength = 10; name.value = me.name; name.placeholder = '이름이나 별명 (안 써도 돼요)';
      name.oninput = () => { current.name = cleanName(name.value); current.at = Date.now(); };
      const menu = HAIR_MENU.map(c => c.i), menuColors = HAIR_MENU.map(c => HAIRS[c.i]), menuNames = HAIR_MENU.map(c => c.name);
      // 줄마다 [이름, 고른 번호의 자리(Pick), 글 단추면 이름들 · 색 단추면 색들, 단추 → 넣을 번호(없으면 차례 그대로), 색 이름].
      type Line = [string, number, string[] | number[], number[]?, string[]?];
      const tabs: [string, Line[]][] = [
        ['모습', [['기본 모습', 0, FORMS.map(f => f.name)], ['피부', 3, SKINS]]],
        ['머리', [['머리 모양', 5, HAIR_STYLES.map(h => h.name)], ['머리색', 1, menuColors, menu, menuNames], ['색 넣기', 4, PATTERNS.map(p => p.name)], ['섞는 색', 9, menuColors, menu, menuNames]]],
        ['옷과 꾸미기', [['옷', 6, TOPS.map(t => t.name)], ['옷 색', 2, COATS], ['안경', 7, GLASSES], ['머리 장식', 8, ACCESSORIES.map(a => a.name)]]],
      ];
      const changed = () => { current.at = Date.now(); draw(); on.change({ ...current, pick: [...current.pick] as Pick }); };
      const swatch = ([label, slot, , ids, names]: Line, value: string | number, i: number) => {
        const stored = ids?.[i] ?? i;
        // 기본 모습을 고르면 머리 모양·옷·안경이 그 모습으로 맞춰진다(색·피부·장식은 그대로).
        const b = button(typeof value === 'string' ? 'g-chip' : 'g-swatch', typeof value === 'string' ? value : '', () => { current.pick = slot === 0 ? withForm(current.pick, stored) : Object.assign(current.pick, { [slot]: stored }); changed(); });
        if (typeof value === 'number') { b.style.background = hex(value); b.setAttribute('aria-label', `${label} ${names?.[i] ?? i + 1}`); if (names) b.title = names[i]; }
        b.dataset.row = String(slot); b.dataset.i = String(stored);
        return b;
      };
      const bar = el('div', 'g-tabs'), panes = el('div', 'g-panes'), mixRow: HTMLElement[] = [];
      tabs.forEach(([title, lines], t) => {
        const rows = el('div', `g-rows${t ? ' off' : ''}`);
        const tab = button(`g-tab${t ? '' : ' on'}`, title, () => {
          panes.querySelectorAll<HTMLElement>('.g-rows').forEach((pane, j) => pane.classList.toggle('off', j !== t));
          bar.querySelectorAll('.g-tab').forEach((x, j) => x.classList.toggle('on', j === t));
          draw();
        });
        bar.append(tab);
        for (const line of lines) {
          const [label, slot, values] = line;
          // 줄은 모두 한 줄 옆 스크롤(사용자 10-16 「글자가 잘리고 난잡해」) — 감싸는 줄·미는 줄이 섞여 있던 것을 하나로.
          const row = el('div', 'g-row g-row-scroll');
          row.append(...values.map((value, i) => swatch(line, value, i)));
          const head = el('span', 'g-row-label', label);
          if (slot === 9) mixRow.push(head, row);
          rows.append(head, row);
        }
        panes.append(rows);
      });
      const draw = () => {
        panes.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', (current.pick[+b.dataset.row!] ?? 0) === +b.dataset.i!));
        // 섞는 색은 전체 단색이면 쓸 일이 없다 — 자리는 그대로 두고 안 보이게(판 높이가 흔들리지 않게).
        mixRow.forEach(x => { x.style.visibility = current.pick[4] === 0 ? 'hidden' : ''; });
        // 옆으로 미는 줄 — 고른 단추가 가려져 있으면 가운데로(처음 열 때·탭을 바꿀 때·「어떤 모습이 나올까?」).
        panes.querySelectorAll<HTMLElement>('.g-row-scroll').forEach(row => {
          const on = row.querySelector<HTMLElement>('.on');
          if (on && (on.offsetLeft < row.scrollLeft || on.offsetLeft + on.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2;
        });
      };
      draw();
      const random = button('g-link', '어떤 모습이 나올까?', () => { current.pick = randomPick(); changed(); });
      const done = button('g-primary', '이 모습으로 걷기', () => { closeSheet(); on.done({ name: cleanName(name.value), pick: [...current.pick] as Pick, ...(current.at ? { at: current.at } : {}) }); });
      openSheet(el('p', 'g-kicker', '오늘은 이 모습으로'), name, bar, panes, random, done);
      draw(); // 판이 열린 뒤에야 단추 자리를 잴 수 있다
    },

    /** 테이블에서 같이 하기 — 새로 만들거나 코드로 들어간다. */
    tablePanel(code: string | undefined, on: { create(): Promise<string | undefined>; enter(code: string): Promise<boolean>; link(code: string): string; close(): void }) {
      const status = el('p', 'g-small');
      const showCode = (c: string) => {
        const link = on.link(c);
        const copy = button('g-primary', '링크 복사하기', () => { void navigator.clipboard?.writeText(link).then(() => { copy.textContent = '복사했어요'; }, () => { status.textContent = link; }); });
        openSheet(el('p', 'g-kicker', '우리 테이블'), el('p', 'g-code', c), el('p', 'g-small', '같은 테이블 사람들이 이 링크로 들어오면, 끝에 다 같이 언덕에 모여요.'), copy, status, button('g-link', '닫기', () => { closeSheet(); on.close(); }));
      };
      if (code) { showCode(code); return; }
      const input = el('input', 'g-input'); input.maxLength = 4; input.placeholder = '코드 네 자리'; input.autocapitalize = 'characters';
      openSheet(
        el('p', 'g-kicker', '테이블에서 같이 하기'),
        el('p', 'g-small', '한 테이블이 같은 코드로 들어오면, 각자 걷고 끝에 같은 언덕에서 만나요.'),
        button('g-primary', '새 테이블 만들기', async () => { status.textContent = '만드는 중…'; const c = await on.create(); if (c) showCode(c); else status.textContent = '지금은 같이 하기를 쓸 수 없어요.'; }),
        input,
        button('g-ghost', '코드로 들어가기', async () => { if (await on.enter(input.value)) { closeSheet(); on.close(); } else status.textContent = '그런 테이블이 없어요. 코드를 다시 봐 주세요.'; }),
        status, button('g-link', '닫기', () => { closeSheet(); on.close(); }),
      );
    },

    /**
     * 버스 예산 퀴즈 — 버스 글 칸을 문제 카드로 바꾼다(위엔 다음 동네 이름). 고르면 맞았는지·까닭을 보여 주고 잠시 뒤 done(맞았나).
     * 「넘기기」 는 바로 done(undefined).
     */
    busQuiz(areaName: string, quiz: { q: string; answer: string; why: string }, choices: string[], done: (correct?: boolean) => void) {
      let over = false;
      const finish = (correct?: boolean) => { if (over) return; over = true; done(correct); };
      const why = el('p', 'g-quiz-why'); why.setAttribute('role', 'status');
      const list = el('div', 'g-quiz-choices');
      list.append(...choices.map(choice => button('g-quiz-choice', choice, () => {
        if (list.classList.contains('done')) return;
        list.classList.add('done');
        const correct = choice === quiz.answer;
        list.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.disabled = true; b.classList.toggle('right', b.textContent === quiz.answer); b.classList.toggle('wrong', b.textContent === choice && !correct); });
        why.textContent = correct ? `정답! 동전 하나 받았어요. ${quiz.why}` : `정답은 「${quiz.answer}」. ${quiz.why}`;
        sfx[correct ? 'coin' : 'bubble'](0);
        later(correct ? 2600 : 3200, () => finish(correct));
      })));
      caption.onclick = null;
      caption.classList.add('g-quiz');
      caption.replaceChildren(el('span', 'g-quiz-area', areaName), el('p', 'g-quiz-q', quiz.q), list, why, button('g-link g-quiz-skip', '넘기기', () => finish()));
      caption.hidden = false;
      live.textContent = `${areaName}로 가는 버스 퀴즈. ${quiz.q}`;
    },
    /** 버스 장면 글 — 다음 동네 이름과 테이블 사람들이 어디쯤인지. 누르면 넘긴다. area 없이 부르면 치운다. */
    busCaption(areaName?: string, others: string[] = [], skip?: () => void) {
      caption.hidden = !areaName;
      caption.classList.remove('g-quiz');
      if (!areaName) return;
      caption.replaceChildren(el('h2', '', areaName), ...others.map(text => el('p', 'g-small', text)));
      caption.onclick = () => skip?.();
      live.textContent = `다음 동네, ${areaName}`;
    },

    /**
     * 언덕 끝 화면 — 유형 이름·한 줄, 초대한 친구·테이블, 그리고 할 수 있는 것들.
     * 주민증·우리 동네 예산·한 번 더 걷기는 마을 건물이 맡는다(기획 4차). 마을로는 언덕의 빛 아치를 걸어서 지난다(10-14).
     */
    end(info: { code: TypeCode; scores: AxisScores; lines: string[] }, on: { neighbor(): void; others?: () => void; share(): void; reply?: { label: string; run(): void }; village(): void }) {
      const card = el('div', 'g-end-card');
      // 세 축 — 왜 이 유형인지. 점은 -100~+100 을 막대 위 자리로, 가운데 금이 갈림길.
      const axes = el('ul', 'g-axes');
      for (const axis of AXES) {
        const score = info.scores[axis.key], right = score > 0;
        const track = el('span', 'g-track'), dot = el('i');
        dot.style.left = `${(score + 100) / 2}%`; track.append(dot); track.setAttribute('aria-hidden', 'true');
        const row = el('li');
        row.append(el('span', `g-ax-l${right ? '' : ' on'}`, axis.left), track, el('span', `g-ax-r${right ? ' on' : ''}`, axis.right), el('span', 'g-sr', ` — ${right ? axis.right : axis.left} 쪽`));
        axes.append(row);
      }
      card.append(el('h1', '', TYPES[info.code].name), el('p', 'g-line', TYPES[info.code].line), axes);
      const give = el('a', 'g-link g-give', '함께하는 시민행동 후원하기');
      give.href = DONATE_URL; give.target = '_blank'; give.rel = 'noopener';
      const bar = el('div', 'g-end-actions');
      const row = el('div', 'g-end-row'), links = el('div', 'g-end-links');
      row.append(button('g-primary', '친구에게 보내기', on.share), button('g-ghost', '내 이웃 정하기', on.neighbor));
      links.append(...(on.others ? [button('g-link', '다른 사람들은?', on.others)] : []));
      bar.append(
        row,
        ...(on.reply ? [button('g-ghost', on.reply.label, on.reply.run)] : []), // 나를 부른 친구에게 답장(기획 3차 ①)
        button('g-sr', `${VILLAGE_NAME}로 들어가기`, on.village), // 눈으로는 빛 아치를 걸어서 지난다 — 화면 읽기 도구·키보드만 쓰는 사람의 길
        links,
        give,
      );
      end.replaceChildren(card, bar);
      end.hidden = false;
      this.endLines(info.lines);
      live.textContent = `당신은 ${TYPES[info.code].name}. ${TYPES[info.code].line}`;
    },
    /**
     * 공유 그림 — 끝 화면을 보이는 그대로 찍는다(위 띠·누를 것은 빼고). 화면과 그림을 한 벌로 두려는 것(예산게임에서 두 벌로 그리다 어긋났다).
     * 게임 캔버스(WebGL)는 html-to-image 가 바로 못 찍어서, 장면 스냅숏(`scene`, data URL)을 바탕에 깔고 캔버스는 뺀다.
     */
    async picture(scene: string) {
      const { toBlob } = await import('html-to-image');
      await document.fonts?.ready;
      const skip = new Set<Node | null>([stage, bubbles, hud, sheet, panel, toast, hint, end.querySelector('.g-end-actions')]);
      shell.classList.add('shooting'); // 움직임을 멈춰야 복사본이 첫 장면(투명)으로 찍히지 않는다
      try {
        return await toBlob(shell, { pixelRatio: 2, filter: node => !skip.has(node), style: { backgroundImage: `url(${scene})`, backgroundSize: '100% 100%' } });
      } finally { shell.classList.remove('shooting'); }
    },
    endActions(show: boolean) { const bar = end.querySelector<HTMLElement>('.g-end-actions'); if (bar) bar.hidden = !show; },
    /** 끝 화면 카드 아래 줄 — 초대한 친구와 테이블 사람들(새로 온 사람이 있으면 다시 부른다). */
    endLines(lines: string[]) {
      const card = end.querySelector('.g-end-card');
      if (!card) return;
      card.querySelector('.g-notes')?.remove();
      if (lines.length) { const list = el('ul', 'g-notes'); list.append(...lines.map(line => el('li', '', line))); card.append(list); }
    },

    /** 내 이웃 — 이름 지어 주기, 그리고 소식 받기(연락처). */
    neighborSheet(wish: string, on: { save(name: string): void; contact?: (form: ContactForm) => Promise<{ ok: boolean; text: string }>; close(): void }) {
      const name = el('input', 'g-input'); name.maxLength = 10; name.placeholder = '이웃 이름 지어 주기 (10자까지)';
      const contact = on.contact && contactForm(on.contact, '이웃 소식 받기');
      if (contact) contact.form.hidden = true;
      const save = button('g-primary', '내 이웃으로 삼기', () => {
        on.save(cleanName(name.value));
        save.hidden = true; name.disabled = true;
        if (contact) { contact.form.hidden = false; contact.shown(); }
      });
      openSheet(el('p', 'g-kicker', '내 이웃'), el('p', 'g-quote', `${josa(`「${wish}」`, '을', '를')} 바라던 주민`), name, save, ...(contact ? [contact.form] : []), button('g-link', '닫기', () => { closeSheet(); on.close(); }));
    },
    closeSheet,

    /**
     * 마을(기획 4차) — 위 띠를 마을 것으로(이름·오늘 몇 명·지도 단추), 걷기 판의 글은 다 치운다.
     * 지도 단추 = 건물 목록. 누르면 그 문 앞으로 간다 — 손이 불편하거나 화면 읽기 도구로도 모든 건물에 들어갈 수 있게.
     */
    village(on: { phone(): void }) {
      shell.dataset.phase = 'village';
      for (const node of [end, ask, door, hint, intro, caption, panel]) node.hidden = true;
      closeSheet(); bubbles.replaceChildren(); marks.replaceChildren(); replies.classList.remove('open');
      area.textContent = VILLAGE_NAME;
      if (!hud.querySelector('.g-map')) hud.insertBefore(icon(button('g-map', '', on.phone), ICONS.phone, '주민 폰 — 지도와 건물'), sound);
      live.textContent = `${VILLAGE_NAME}에 들어왔어요. 주민 폰 단추로 건물을 고를 수 있어요.`;
    },
    /** 위 띠 이름 옆 — 사람 그림 + 오늘 들른 수. 서버가 없으면 비운다. */
    villageToday(count?: number) {
      where.querySelector('.g-today')?.remove();
      if (count === undefined) return;
      const today = icon(el('small', 'g-today'), ICONS.people, `오늘 ${count}명이 들렀어요`);
      today.setAttribute('role', 'img');
      today.append(String(count));
      where.append(today);
    },
    /** 위 띠 — 주머니 동전(0이면 숨김). 늘면 톡 튄다. */
    villagePocket(coins: number, open?: () => void) {
      let chip = where.querySelector<HTMLElement>('.g-pocket');
      if (!coins) { chip?.remove(); return; }
      // 누르면 공사터로 — 넣을 곳을 찾아 헤매지 않게(사용자 10-14 「동전을 어디에 넣는데?」)
      if (!chip) { chip = icon(button('g-today g-pocket', '', () => open?.()), ICONS.coin, ''); chip.append(el('span')); where.append(chip); }
      chip.setAttribute('aria-label', `주머니 동전 ${coins}개 — 동전 모으는 곳에 넣으러 가기`);
      chip.lastElementChild!.textContent = String(coins);
      chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    },
    /**
     * 주민 폰(동물의 숲 ⓖ) — 위엔 날짜·시각·철, 아래엔 앱. 앱을 누르면 판을 닫고 run.
     */
    phone(head: string, apps: { icon: string; name: string; run(): void }[]) {
      const screen = el('div', 'g-phone');
      const top = el('p', 'g-phone-top', head);
      const grid = el('div', 'g-apps');
      grid.append(...apps.map(app => { const b = button('g-app', '', () => { closeSheet(); app.run(); }); b.append(el('span', 'g-app-icon', app.icon), el('span', '', app.name)); return b; }));
      screen.append(top, grid);
      openSheet(screen, button('g-link', '닫기', closeSheet));
    },
    /**
     * 마을 아래 말 상자 — 이름표 + 한 자씩, 아래 단추(누르면 닫고 run). 첫 동전을 주웠을 때 공사터를 알려 준다.
     * 다시 부르면 갈아 끼우고, 인자 없이 부르면 닫는다.
     */
    villageNotice(who?: string, text = '', acts: { label: string; run?(): void }[] = []) {
      shell.querySelector('.g-notice')?.remove();
      if (!who) return;
      const box = el('section', 'g-notice'), talk = el('div', 'g-talk'), said = el('p', 'g-quote'), row = el('div', 'g-notice-acts');
      talk.append(el('span', 'g-name', who), said);
      talk.onclick = () => finishTyping(said);
      row.append(...acts.map((act, i) => button(i ? 'g-ghost' : 'g-primary', act.label, () => { box.remove(); act.run?.(); })));
      box.append(talk, row);
      shell.append(box);
      typeOut(said, text);
      live.textContent = `${who}: ${text}`;
    },
    /** 짧은 한마디 — 이름표 얹은 말 상자가 아래에 잠깐 떴다 사라진다(누를 것 없음, 조작을 막지 않는다). */
    say(who: string, text: string, ms = 1900) {
      shell.querySelector('.g-notice')?.remove();
      const box = el('section', 'g-notice g-say'), talk = el('div', 'g-talk'), said = el('p', 'g-quote');
      talk.append(...(who ? [el('span', 'g-name', who)] : []), said);
      box.append(talk);
      shell.append(box);
      typeOut(said, text);
      live.textContent = who ? `${who}: ${text}` : text;
      later(ms, () => { box.classList.add('bye'); later(250, () => box.remove()); });
    },
    /** 지도 — 건물 목록. */
    placeList(list: { name: string; line: string; run(): void }[], title = '어디로 갈까요?') {
      openSheet(
        el('p', 'g-kicker', title),
        ...list.map(({ name, line, run }) => { const b = button('g-place-row', '', () => { closeSheet(); run(); }); b.append(el('b', '', name), el('small', '', line)); return b; }),
        button('g-link', '닫기', closeSheet),
      );
    },

    /** 다른 사람들은 어떻게 골랐을까 — 문항마다 두 쪽 비율. 편 수가 아니라 생각이 갈린 모양을 보여 준다. */
    others(stats: Stats | undefined, mine: Record<string, 'a' | 'b'>) {
      const list = el('ol', 'g-split');
      const enough = (stats?.total ?? 0) >= 5;
      for (const q of orderedQuestions) {
        const count = stats?.questions[q.id] ?? { a: 0, b: 0 };
        const sum = count.a + count.b || 1, a = Math.round((count.a / sum) * 100);
        const bar = el('div', 'g-bar');
        bar.style.setProperty('--a', `${enough ? a : 50}%`);
        bar.append(
          el('span', mine[q.id] === 'a' ? 'mine' : '', `${q.a.short}${enough ? ` ${a}%` : ''}`),
          el('span', mine[q.id] === 'b' ? 'mine' : '', `${q.b.short}${enough ? ` ${100 - a}%` : ''}`),
        );
        const item = el('li');
        item.append(el('p', 'g-small', `${q.place} · ${q.prompt}`), bar);
        list.append(item);
      }
      panel.replaceChildren(
        el('h2', '', '다른 사람들은 어떻게 골랐을까?'),
        el('p', 'g-small', stats ? `이 길을 걸은 사람 ${stats.total}명` : '지금은 다른 사람들 답을 불러올 수 없어요.'),
        el('p', 'g-small', enough ? '굵은 쪽이 내가 고른 쪽이에요. 사람마다 생각이 달라요.' : '다섯 명이 넘으면 비율을 보여 줘요. 굵은 쪽이 내가 고른 쪽이에요.'),
        list,
        button('g-primary', '닫기', () => { panel.hidden = true; }),
      );
      panel.hidden = false;
      panel.scrollTop = 0;
    },

    destroy() { timers.forEach(clearTimeout); root.replaceChildren(); },
  };
}

export type GameUI = ReturnType<typeof createUI>;
