/*
  화면 위에 얹는 HTML — 글은 캔버스에 그리지 않는다(읽기 쉽고, 화면 읽기 도구가 읽고, 글자가 또렷하다).
  게임 진행은 여기서 정하지 않는다. 단추를 누르면 받은 콜백을 부르기만 한다.
  모양은 대충 잡아 둔 자리다 — 꾸미기는 GPT 몫(README 「게임 뼈대」).
*/
import { AXES, ROUTE, REPLIES, TYPES, DESTINATION, type Question, type TypeCode } from './content';
import type { AxisScores } from './score';
import { currentQuestion, type JourneyState } from './flow';
import { displayOptions, orderedQuestions, type DisplaySide } from './response';
import { COATS, HAIRS, SKINS, STYLE_NAMES, PICK_SIZES, randomPick, type Pick } from './look';
import { cleanName, josa, type Me } from './profile';
import { PRIVACY_URL, type Channel, type ContactForm } from './contact';
import type { Stats } from './api';
import type { Point } from './room';

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
const SIDES: DisplaySide[] = ['left', 'right'];
/** 도너스 정기후원. utm 은 도너스 약정에 남아 「게임에서 온 후원」을 가를 수 있다. */
export const DONATE_URL = 'https://secure.donus.org/withaction0909/pay/step1?utm_source=dongne-game&utm_medium=game&utm_campaign=budget-game';

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
  const place = el('span', 'g-place'), prompt = el('h2', 'g-prompt');
  ask.append(place, prompt);
  const door = button('g-door', '', actions.goDoor); door.hidden = true;
  const hint = el('p', 'g-hint'); hint.hidden = true;
  const replies = el('section', 'g-replies'); replies.setAttribute('aria-label', '대답 고르기');
  const quote = el('p', 'g-quote'), replyList = el('div', 'g-reply-list');
  replies.append(el('p', 'g-reply-title', '뭐라고 말해 줄까요?'), quote, replyList);
  const intro = el('section', 'g-intro');
  intro.innerHTML = `<div class="g-intro-card"><span class="g-kicker">함께하는 시민행동 · 예산 성향 게임</span>
    <h1>동네 한 바퀴</h1>
    <p>주민 열다섯 명이 바라는 게 서로 달라요.<br>마음 가는 사람에게 걸어가 이야기를 들어 주세요.</p>
    <ul class="g-notes"></ul>
    <button class="g-primary g-start" type="button" disabled>준비하고 있어요…</button>
    <button class="g-link g-table-open" type="button" hidden>테이블에서 같이 하기</button>
    <button class="g-link g-home-open" type="button" hidden>지난번 내 동네 · 주민증</button>
    <p class="g-small">화면을 꾹 누르면 그쪽으로 걸어가요 · 2~3분</p>
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
    /** 다시 온 사람 — 걷지 않고 지난번 내 동네·방명록·주민증을 본다(기획 3차). */
    homeOpen(run: () => void) { const b = intro.querySelector<HTMLButtonElement>('.g-home-open')!; b.hidden = false; b.onclick = run; },
    /** 시작 화면 아래 한 줄씩 — 초대한 친구, 지난번 이웃, 테이블. */
    notes(lines: string[]) { intro.querySelector('.g-notes')!.replaceChildren(...lines.map(line => el('li', '', line))); },

    render(state: JourneyState) {
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
          quote.textContent = `「${displayOptions(state.sessionId, question).find(o => o.side === state.candidate)!.text}」`;
          replyList.replaceChildren(...REPLIES.map((reply, level) => {
            const b = button('g-reply', '', () => actions.reply(question.id, level));
            b.append(el('span', 'g-dots', '●'.repeat(level + 1) + '○'.repeat(2 - level)), el('span', '', reply.line));
            return b;
          }));
          live.textContent = `${quote.textContent} 쪽 주민 앞이에요. 대답을 골라 주세요.`;
        }
      } else replyKey = '';
    },

    /** 방에 들어서면 질문과 두 주민의 말풍선을 띄운다. 다 뜰 때까지 걸리는 ms 를 돌려준다. */
    ask(question: Question, sessionId: string, anchors: Record<DisplaySide, Point>, onBubble: (i: number) => void) {
      askId++;
      place.textContent = question.place; prompt.textContent = question.prompt;
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
    door(label?: string, at?: Point) {
      door.hidden = !label;
      if (label && at) { door.textContent = `${label} ↑`; door.style.left = `${at.x}px`; door.style.top = `${at.y}px`; }
    },
    hint(text = '') { hint.hidden = !text; hint.textContent = text; },
    toast(text: string) { toast.textContent = text; toast.hidden = false; later(2200, () => { toast.hidden = true; }); },
    setSound(muted: boolean) { sound.classList.toggle('muted', muted); sound.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); },

    /** 내 모습 고르기 — 이름(선택)과 머리 모양·머리 색·옷 색·피부. 고를 때마다 change, 다 고르면 done. */
    /** 아래 판의 윗선(게임 화면 위에서부터 CSS px). 판이 닫혀 있으면 화면 맨 아래. */
    sheetTop() {
      const box = shell.getBoundingClientRect();
      return sheet.hidden ? box.height : sheet.getBoundingClientRect().top - box.top;
    },
    dresser(me: Me, on: { change(me: Me): void; done(me: Me): void }) {
      const current: Me = { name: me.name, pick: [...me.pick] as Pick };
      const name = el('input', 'g-input'); name.maxLength = 10; name.value = me.name; name.placeholder = '이름이나 별명 (안 써도 돼요)';
      name.oninput = () => { current.name = cleanName(name.value); };
      const rows = el('div', 'g-rows');
      const labels = ['머리 모양', '머리 색', '옷 색', '피부'];
      const changed = () => { draw(); on.change({ ...current, pick: [...current.pick] as Pick }); };
      const swatch = (row: number, i: number) => {
        const b = button(row === 0 ? 'g-chip' : 'g-swatch', row === 0 ? STYLE_NAMES[i] : '', () => { current.pick[row] = i; changed(); });
        if (row) { b.style.background = hex([HAIRS, COATS, SKINS][row - 1][i]); b.setAttribute('aria-label', `${labels[row]} ${i + 1}`); }
        b.dataset.row = String(row); b.dataset.i = String(i);
        return b;
      };
      const draw = () => rows.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.classList.toggle('on', current.pick[+b.dataset.row!] === +b.dataset.i!));
      labels.forEach((label, row) => {
        const line = el('div', 'g-row');
        line.append(el('span', 'g-row-label', label), ...Array.from({ length: PICK_SIZES[row] }, (_, i) => swatch(row, i)));
        rows.append(line);
      });
      draw();
      const random = button('g-link', '아무거나', () => { current.pick = randomPick(); changed(); });
      const done = button('g-primary', '이 모습으로 걷기', () => { closeSheet(); on.done({ name: cleanName(name.value), pick: [...current.pick] as Pick }); });
      openSheet(el('p', 'g-kicker', '내 모습 고르기'), name, rows, random, done);
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

    /** 버스 장면 글 — 다음 동네 이름과 테이블 사람들이 어디쯤인지. 누르면 넘긴다. area 없이 부르면 치운다. */
    busCaption(areaName?: string, others: string[] = [], skip?: () => void) {
      caption.hidden = !areaName;
      if (!areaName) return;
      caption.replaceChildren(el('span', 'g-kicker', '버스 타고 다음 동네로'), el('h2', '', areaName), ...others.map(text => el('p', 'g-small', text)), el('p', 'g-small', '눌러서 넘기기'));
      caption.onclick = () => skip?.();
      live.textContent = `다음 동네, ${areaName}`;
    },

    /** 언덕 끝 화면 — 유형 이름·한 줄, 초대한 친구·테이블, 그리고 할 수 있는 것들. */
    end(info: { code: TypeCode; scores: AxisScores; lines: string[] }, on: { neighbor(): void; others?: () => void; share(): void; reply?: { label: string; run(): void }; town(): void; again(): void }) {
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
      card.append(el('span', 'g-kicker', `${DESTINATION.name}에 닿았어요`), el('p', 'g-you', '당신은'), el('h1', '', TYPES[info.code].name), el('p', 'g-line', TYPES[info.code].line), axes);
      const give = el('a', 'g-link g-give', '이 게임을 만든 함께하는 시민행동 후원하기 →');
      give.href = DONATE_URL; give.target = '_blank'; give.rel = 'noopener';
      const bar = el('div', 'g-end-actions');
      bar.append(
        button('g-primary', '함께 온 주민 중 내 이웃 정하기', on.neighbor),
        ...(on.others ? [button('g-ghost', '다른 사람들은 어떻게 골랐을까?', on.others)] : []),
        button('g-ghost', '친구에게 보내기', on.share),
        ...(on.reply ? [button('g-ghost', on.reply.label, on.reply.run)] : []), // 나를 부른 친구에게 답장(기획 3차 ①)
        button('g-ghost', '내 동네 · 주민증', on.town),
        button('g-link', '한 번 더 걷기', on.again),
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
      const skip = new Set<Node | null>([stage, hud, sheet, panel, toast, hint, end.querySelector('.g-end-actions')]);
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
      let openedAt = Date.now();
      const name = el('input', 'g-input'); name.maxLength = 10; name.placeholder = '이웃 이름 지어 주기 (10자까지)';
      const contact = el('form', 'g-contact'); contact.hidden = true;
      const save = button('g-primary', '내 이웃으로 삼기', () => {
        on.save(cleanName(name.value));
        save.hidden = true; name.disabled = true;
        if (on.contact) { contact.hidden = false; openedAt = Date.now(); }
      });
      contact.innerHTML = `<h3>이웃 소식 받기 <small>(안 받아도 돼요)</small></h3>
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
      contact.querySelectorAll<HTMLInputElement>('[name=channel]').forEach(radio => { radio.onchange = () => {
        if (!radio.checked) return;
        const sms = radio.value === 'sms';
        address.type = sms ? 'tel' : 'email'; address.autocomplete = sms ? 'tel' : 'email';
        address.placeholder = sms ? '휴대전화 번호' : '이메일 주소'; address.inputMode = sms ? 'numeric' : 'email';
      }; });
      contact.onsubmit = async event => {
        event.preventDefault();
        const data = new FormData(contact);
        const result = await on.contact!({
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
      openSheet(el('p', 'g-kicker', '내 이웃'), el('p', 'g-quote', `${josa(`「${wish}」`, '을', '를')} 바라던 주민`), name, save, ...(on.contact ? [contact] : []), button('g-link', '닫기', () => { closeSheet(); on.close(); }));
    },
    closeSheet,

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
