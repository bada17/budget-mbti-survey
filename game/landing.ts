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
  다시 온 사람(바로 마을)은 건너뛴다. ?about 이면 늘 보인다(보기용). 주소는 10-20 부터 첫 주소(forest.action.or.kr/) — 옛 /game/ 은 첫 주소로 넘어온다.
*/
import footerHtml from './landing-footer.html?raw'; // 홈페이지 하단 — scripts/port-footer.mjs 가 만든다
import { placeName } from './village'; // 건물 이름은 간판에서(글에 박아 두지 않는다)
import { CONTACT } from './contact';

type Words = { title: string; text: string };
// 10-19 느낌 보기용 초안(사용자 「내용 대충 한 번 만들어봐, 느낌만 보게」) — 글은 Claude 초안, 그림은 게임 화면·action-landing 활동 사진. 정해지면 갈아 끼운다.
const PAGE = {
  top: { logo: '', line: '혼자 읽는 예산서 말고, 함께 걷는 우리 동네 살림' },
  hero: { title: '함께해요 시민의 숲', text: '우리 동네 살림, 같이 들여다볼 이웃을 찾아요', photo: 'landing/hero.jpg' },
  intro: { title: '시민의 숲은', text: '우리가 낸 세금이 어디에 쓰이면 좋을지, 걸으며 고르는 작은 게임이에요. 다 걸으면 시민의 숲에서 우리 동네 예산과 세금을 볼 수 있어요.', photo: 'landing/intro.jpg' },
  what: { title: '시민의 숲에서는 무엇을 하나요?', items: [
    { title: '걸으며 고민해요', text: '둘 다 필요한데 하나만 골라야 한다면? 숲길에서 주민들의 바람을 듣고 열다섯 번 골라요. 다 걸으면 나의 예산 성향이 나와요.', shot: 'landing/phone-room.jpg', icon: '' },
    { title: '우리 동네 살림을 펼쳐 봐요', text: `시·군·구를 고르면 우리 동네 돈이 어디서 와서 어디에 쓰이는지 보여요. ${placeName('tax')}과 ${placeName('finance')}에서 전국 243개 지방정부를 다 볼 수 있어요.`, shot: 'landing/phone-village.jpg', icon: '' },
    { title: '이웃과 함께 따져 봐요', text: `활동가가 올린 ${placeName('cards')}에 내 생각을 남기고, 궁금한 건 ${placeName('counsel')}에 바로 물어요. 예산이 새는 사업은 ${placeName('dok')}에서 함께 지켜봐요.`, shot: 'landing/phone-end.jpg', icon: '' },
  ] },
  why: { title: '왜 만들었나요?', stories: [
    { title: '가장 가까운 돈인데, 가장 멀리 있어요', text: '놀이터, 마을버스, 동네 도서관. 우리 생활에 닿는 많은 돈이 동네 예산에서 나와요. 그런데 동네 예산을 들여다보는 사람은 많지 않아요.', photo: 'landing/why-1.jpg' },
    { title: '예산에는 정답이 없어요', text: '둘 다 필요한 것 중에 하나를 골라야 하는 게 예산이에요. 그래서 한 사람이 정하기보다 여럿이 따져 볼수록 나아져요. 시민의 숲은 그 고민을 나누는 자리예요.', photo: '' },
    { title: '혼자보다 함께 지켜보면 달라져요', text: '27년 동안 정부와 기업의 돈을 감시해 온 함께하는 시민행동이 만들었어요. 시민의 숲은 그 일에 이웃을 초대하는 마을이에요.', photo: 'landing/why-2.jpg' },
  ] },
  how: { title: '어떻게 하나요?', steps: [
    { title: '걷기 게임하기', text: '숲길에서 주민들의 바람을 듣고 열다섯 번 골라요.', shot: '' }, { title: '내 동네 살림 살펴보기', text: '시·군·구를 고르면 그 동네 예산이 열려요.', shot: '' },
    { title: '이웃·활동가와 이야기하기', text: '문제 카드, 쪽지판, 상담소 질문으로 생각을 나눠요.', shot: '' }, { title: '직접 나서기', text: '예산이 새는 사업 감시에 이름을 보태요.', shot: '' },
  ], note: '가입 없이 바로 시작해요. 로그인하면 내 동네를 저장하고 다른 기기에서도 이어 할 수 있어요.' },
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
    li.append(photo(s.shot, 'lp-step-shot', '게임 화면'), el('h3', 'lp-step-title', s.title), el('p', 'lp-text', s.text));
    return li;
  }));
  how.inner.append(steps, el('p', 'lp-text lp-how-note', PAGE.how.note));

  // 홈페이지 공통 하단(손으로 고치지 않는다 — scripts/port-footer.mjs)
  const foot = el('div', 'lp-foot');
  foot.innerHTML = footerHtml;

  // 오류 알리기 — 게임 밖(소개 페이지) 하단, 저작권 줄 바로 위(사용자 10-20 「하단에 넣어야지」): 게임이 안 열리는 사람도 알릴 수 있게.
  // 하단 원본은 공통이라 고치지 않고 여기서 끼워 넣는다. 받는 곳은 아직 메일 — 정하면 href 만 바꾼다.
  // ponytail: 메일 본문에 기기 정보를 미리 적어 둔다(서버 없이). 게임 안 칸 + 시트 서버(수정 목록)로 옮기면 화면 상태까지 받는다.
  const device = `

---
기기 정보(지우지 말아 주세요)
${navigator.userAgent}
화면 ${screen.width}×${screen.height} · 창 ${innerWidth}×${innerHeight}
${location.href}`;
  const report = el('p', 'lp-report', '게임이 안 열리거나 이상하게 움직이나요? '), reportLink = el('a', '', '오류 알리기');
  reportLink.href = `mailto:${CONTACT.mail}?subject=${encodeURIComponent('[시민의 숲 오류]')}&body=${encodeURIComponent('어떤 일이 있었나요?' + device)}`;
  report.append(reportLink);
  const copy = foot.querySelector('.ft-copy');
  if (copy) copy.before(report); else foot.append(report);

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
