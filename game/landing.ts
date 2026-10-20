/*
  소개 페이지(10-16, 사용자 「시티트리클럽처럼 설명과 이야기를 웹에서 보고 게임으로 접속」 — seoulkfem.or.kr/citytreeclub).
  10-19 다시 짬(사용자 「동물의 숲 디자인 말고 웹페이지 디자인으로」「시티트리클럽 흐름으로, 똑같이 말고」「하단은 홈페이지랑 같은 형태」):
    위 띠(로고·한 줄) → ① 첫 화면(마을 그림·제목·게임 단추) → ② 「○○은」 한 줄 → ③ 무엇을 하나요(폰 틀 속 게임 화면)
    → ④ 왜 만들었나요(사진·글 번갈아) → ⑤ 어떻게 하나요(단계 카드 넷) → 홈페이지 공통 하단(landing-footer.html).
  ⑥ 함께한 사람들의 시선 · ⑦ 함께해요(회원·후원·수업자료·문의) · ⑧ 지금 일어나는 일들 은 만들지 않는다(사용자 「일단 만들지 말고 기억만」).
  게임과 잇는 고리는 셋뿐 — ① 마을 그림, ③ 폰 속 게임 화면, 「게임 하러 가기」 단추(게임 색·둥근 글꼴). 나머지(글꼴·색 면·여백)는 웹 쪽.

  글·사진은 느낌 보기 초안(10-19 「내용 대충 넣어 봐」) — 정해지면 아래 PAGE 만 고친다 — 그림은 game/public/ 에 넣은 이름(예: 'landing/hero.jpg'), 비어 있으면 자리 이름이 적힌 빈 칸.
  구조·움직임은 Claude, 겉모습(landing.css)은 GPT(README 「GPT 에게 — 겉모습」).

  언제 보이나 — main.ts: 처음 온 사람이 아무것도 안 붙은 주소로 왔을 때만. 친구 초대·테이블·로그인 돌아옴·
  다시 온 사람(바로 마을)은 건너뛴다. ?about 이면 늘 보인다(보기용). 주소는 /game/ 그대로 — 로그인 돌아오는 주소를 안 바꾸려고.
*/
import footerHtml from './landing-footer.html?raw'; // 홈페이지 하단 — scripts/port-footer.mjs 가 만든다
import { placeName } from './village'; // 건물 이름은 간판에서(글에 박아 두지 않는다)

type Words = { title: string; text: string };
type Block = Words & { photo: string };

const W: Words = { title: '제목', text: '내용' };
// 10-19 느낌 보기용 초안(사용자 「내용 대충 한 번 만들어봐, 느낌만 보게」) — 글은 Claude 초안, 그림은 게임 화면·action-landing 활동 사진. 정해지면 갈아 끼운다.
const PAGE = {
  top: { logo: '', line: '함께하는 시민행동이 만든 예산 게임' },
  hero: { title: '함께해요 시민의 숲', text: '주민 열다섯 명의 바람을 듣고 걷다 보면, 나의 예산 성향이 보여요.', photo: 'landing/hero.jpg' },
  intro: { title: '시민의 숲은', text: '우리가 낸 세금이 어디에 쓰이면 좋을지, 걸으며 고르는 작은 게임이에요. 다 걸으면 시민마을에서 우리 동네 예산과 세금을 볼 수 있어요.', photo: 'landing/intro.jpg' },
  what: { title: '시민의 숲에서는 무엇을 하나요?', items: [
    { title: '주민의 바람을 들어요', text: '동네를 걷다 만나는 주민들이 저마다 바라는 걸 말해요. 마음 가는 쪽으로 다가가 대답하면 돼요.', shot: 'landing/phone-room.jpg', icon: '' },
    { title: '나의 예산 성향을 알아봐요', text: '열다섯 번 고르고 나면, 여덟 유형 가운데 나는 어디인지 보여 줘요. 친구에게 보내 서로 견줘 볼 수도 있어요.', shot: 'landing/phone-end.jpg', icon: '' },
    { title: '시민마을에 들러요', text: `${placeName('hub')}, ${placeName('tax')}, ${placeName('finance')}, ${placeName('counsel')}, ${placeName('dok')}까지. 마을 곳곳에서 우리 세금 이야기를 만나요.`, shot: 'landing/phone-village.jpg', icon: '' },
  ] },
  why: { title: '왜 만들었나요?', stories: [
    { title: '세금은 냈는데, 어디에 쓰이는지는 멀어요', text: '예산서는 두껍고 숫자는 어려워요. 그래서 걷고 고르는 놀이로 먼저 만나 보기로 했어요.', photo: 'landing/why-1.jpg' },
    { title: '혼자보다 함께 지켜보면 달라져요', text: '정부와 기업의 돈을 감시해 온 함께하는 시민행동이 만들었어요. 이 게임은 그 일에 시민을 초대하는 문이에요.', photo: 'landing/why-2.jpg' },
  ] },
  how: { title: '어떻게 하나요?', steps: [
    { title: '주민을 만나요', shot: 'landing/step-1.jpg' }, { title: '마음 가는 쪽을 골라요', shot: 'landing/step-2.jpg' },
    { title: '내 유형을 받아요', shot: 'landing/step-3.jpg' }, { title: '시민마을에 들러요', shot: 'landing/step-4.jpg' },
  ] },
  play: '게임 하러 가기',
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
/** 그림 자리 — 그림이 없으면 자리 이름(「사진」「게임 화면」…)이 적힌 빈 칸. */
function photo(src: string, className: string, slot = '사진') {
  if (!src) { const box = el('div', `${className} lp-empty`, slot); box.setAttribute('aria-hidden', 'true'); return box; }
  const img = el('img', className); img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  return img;
}
/** 폰 틀 — 그 안에 게임 화면. */
function phone(shot: string) {
  const frame = el('div', 'lp-phone');
  frame.append(photo(shot, 'lp-screen', '게임 화면'));
  return frame;
}
const words = (b: Words, level: 'h1' | 'h2' | 'h3' = 'h2') => [el(level, `lp-title lp-${level}`, b.title), el('p', 'lp-text', b.text)];
const section = (className: string, title?: string) => {
  const sec = el('section', `lp-sec ${className}`), inner = el('div', 'lp-wrap');
  if (title) inner.append(el('h2', 'lp-title lp-h2 lp-up', title));
  sec.append(inner);
  return { sec, inner };
};

/**
 * 소개 페이지를 덮어 띄운다. 「게임 하러 가기」 → 페이지가 걷히고 play — main 이 시작 화면 「출발」 을 건너뛰고 바로 출발시킨다(10-20).
 * recall = 첫 칸 「전에 해 봤어요 — 내 시민증 불러오기」 를 누르면 그 자리에 펼칠 로그인 칸(main 이 town.ts loginBox 를 준다 — 이 파일은 게임 묶음을 안 부른다).
 * 큰 단추 하나 + 그 밑 작은 글 링크(시작 화면과 같은 꼴), 아래 고정 단추는 하나 그대로(사용자 10-19 「버튼이 2개 생기는데 괜찮나?」 → 크기를 달리).
 */
export function openLanding(play: () => void, recall?: () => HTMLElement) {
  const page = el('div', 'lp');
  page.tabIndex = -1; page.setAttribute('role', 'region'); page.setAttribute('aria-label', '소개');
  const go = (className: string) => { const b = el('button', className, PAGE.play); b.type = 'button'; b.onclick = leave; return b; };

  const top = el('div', 'lp-top');
  top.append(PAGE.top.logo ? photo(PAGE.top.logo, 'lp-logo') : el('b', 'lp-brand', '함께해요 시민의 숲'), el('p', 'lp-top-line', PAGE.top.line));

  // ① 첫 화면
  const hero = el('header', 'lp-sec lp-hero');
  const heroIn = el('div', 'lp-wrap lp-hero-in'), heroWords = el('div', 'lp-hero-words lp-up');
  heroWords.append(...words(PAGE.hero, 'h1'), go('lp-play'));
  if (recall) {
    const again = el('button', 'lp-recall', '전에 해 봤어요 — 내 시민증 불러오기'); again.type = 'button';
    again.onclick = () => again.replaceWith(recall());
    heroWords.append(again);
  }
  heroIn.append(photo(PAGE.hero.photo, 'lp-hero-art', '마을 그림'), heroWords);
  hero.append(heroIn);

  // ② 「○○은」
  const intro = el('section', 'lp-intro');
  const introWords = el('div', 'lp-intro-words lp-up'); introWords.append(...words(PAGE.intro));
  intro.append(photo(PAGE.intro.photo, 'lp-intro-art', '그림'), introWords);

  // ③ 무엇을 하나요 — 칸마다 바탕색이 바뀐다
  const what = PAGE.what.items.map((item, i) => {
    const { sec, inner } = section(`lp-what${i % 2 ? ' lp-alt' : ''}`, i === 0 ? PAGE.what.title : undefined);
    const row = el('div', `lp-what-row lp-up${i % 2 ? ' lp-flip' : ''}`), body = el('div', 'lp-what-words');
    if (item.icon) body.append(photo(item.icon, 'lp-icon'));
    body.append(...words(item, 'h3'));
    row.append(phone(item.shot), body);
    inner.append(row);
    return sec;
  });

  // ④ 왜 만들었나요
  const why = section('lp-why', PAGE.why.title);
  why.inner.append(...PAGE.why.stories.map((s, i) => {
    const row = el('div', `lp-story lp-up${i % 2 ? ' lp-flip' : ''}`), body = el('div', 'lp-story-words');
    body.append(...words(s, 'h3'));
    row.append(photo(s.photo, 'lp-photo'), body);
    return row;
  }));

  // ⑤ 어떻게 하나요
  const how = section('lp-how', PAGE.how.title);
  const steps = el('ol', 'lp-steps');
  steps.append(...PAGE.how.steps.map(s => {
    const li = el('li', 'lp-step lp-up');
    li.append(photo(s.shot, 'lp-step-shot', '게임 화면'), el('h3', 'lp-step-title', s.title));
    return li;
  }));
  how.inner.append(steps);

  // 홈페이지 공통 하단(손으로 고치지 않는다 — scripts/port-footer.mjs)
  const foot = el('div', 'lp-foot');
  foot.innerHTML = footerHtml;

  // 첫 화면을 지나면 아래에 늘 떠 있는 게임 단추
  const bar = el('div', 'lp-bar'); bar.append(go('lp-play'));

  page.append(top, hero, intro, ...what, why.sec, how.sec, foot, bar);
  document.body.append(page);
  page.focus({ preventScroll: true });

  // 움직임 — 칸이 화면에 들어오면 떠오르고(.in), 첫 화면을 지나면 아래 단추가 나온다. 움직임 줄이기 설정이면 CSS 가 끈다.
  const seen = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } }), { root: page, threshold: 0.15 });
  page.querySelectorAll('.lp-up').forEach(x => seen.observe(x));
  const pastHero = new IntersectionObserver(([e]) => bar.classList.toggle('on', !e.isIntersecting), { root: page, threshold: 0.1 });
  pastHero.observe(hero);

  function leave() {
    seen.disconnect(); pastHero.disconnect();
    page.classList.add('out');
    setTimeout(() => page.remove(), 400);
    play();
  }
}
