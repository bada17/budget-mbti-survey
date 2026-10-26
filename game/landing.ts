/*
  소개 페이지(10-16, 사용자 「시티트리클럽처럼 설명과 이야기를 웹에서 보고 게임으로 접속」 — seoulkfem.or.kr/citytreeclub).
  10-19 다시 짬(사용자 「동물의 숲 디자인 말고 웹페이지 디자인으로」「시티트리클럽 흐름으로, 똑같이 말고」「하단은 홈페이지랑 같은 형태」):
    위 띠(로고·한 줄) → ① 첫 화면(마을 그림·제목·게임 단추) → ② 「○○은」 한 줄 → ③ 무엇을 하나요(폰 틀 속 게임 화면)
    → ④ 왜 만들었나요(사진·글 번갈아) → ⑥ 소식 받기(스티비) → 홈페이지 공통 하단(landing-footer.html).
  ⑤ 어떻게 하나요(단계 카드 넷)는 10-26 뺐다 — ③ 을 짧게 다시 말할 뿐이라(사용자 「추천대로」). 밑 글(가입 없이…)은 ③ 끝으로.
  ⑥ 함께한 사람들의 시선 · ⑦ 함께해요(회원·후원·수업자료·문의) · ⑧ 지금 일어나는 일들 은 만들지 않는다(사용자 「일단 만들지 말고 기억만」).
  게임과 잇는 고리는 셋뿐 — ① 마을 그림, ③ 폰 속 게임 화면, 「게임 하러 가기」 단추(게임 색·둥근 글꼴). 나머지(글꼴·색 면·여백)는 웹 쪽.

  글·사진은 느낌 보기 초안(10-19 「내용 대충 넣어 봐」) — 정해지면 아래 PAGE 만 고친다 — 그림은 game/public/ 에 넣은 이름(예: 'landing/hero.jpg'), 비어 있으면 자리 이름이 적힌 빈 칸.
  구조·움직임은 Claude, 겉모습(landing.css)은 GPT(README 「GPT 에게 — 겉모습」).

  언제 보이나 — main.ts: 처음 온 사람이 아무것도 안 붙은 주소로 왔을 때만. 친구 초대·테이블·로그인 돌아옴·
  다시 온 사람(바로 마을)은 건너뛴다. ?about 이면 늘 보인다(보기용). 주소는 10-20 부터 첫 주소(forest.action.or.kr/) — 옛 /game/ 은 첫 주소로 넘어온다.
*/
import footerHtml from './landing-footer.html?raw'; // 홈페이지 하단 — scripts/port-footer.mjs 가 만든다
import { placeName } from './village'; // 건물 이름은 간판에서(글에 박아 두지 않는다)
import { CONTACT, PRIVACY_URL } from './contact';

type Words = { title: string; text: string };
// 10-19 느낌 보기용 초안(사용자 「내용 대충 한 번 만들어봐, 느낌만 보게」) — 글은 Claude 초안, 그림은 게임 화면·action-landing 활동 사진. 정해지면 갈아 끼운다.
const PAGE = {
  top: { logo: 'landing/logo.svg', line: '혼자 읽는 예산서 말고, 함께 걷는 우리 동네 살림' },
  hero: { title: '함께해요 시민의 숲', text: '우리 동네 살림, 같이 들여다볼 이웃을 찾아요', photo: 'landing/hero.jpg' },
  intro: { title: '시민의 숲은', text: '우리 동네 살림을 이웃과 함께 들여다보는 마을이에요. 걷기 게임에서 예산 고민을 먼저 해 보고, 마을에서는 우리 동네 예산부터 지방정부가 잘 보여 주지 않는 자료까지 함께 살펴봐요.', photo: 'landing/intro.jpg' },
  what: { title: '시민의 숲에서는 무엇을 하나요?', items: [
    { title: '걸으며 고민해요', text: '둘 다 필요한데 하나만 골라야 한다면? 숲길에서 주민들의 바람을 듣고 열다섯 번 골라요. 다 걸으면 나의 예산 성향이 나와요.', shot: 'landing/phone-room.jpg', icon: '' },
    { title: '우리 동네 살림을 펼쳐 봐요', text: `시·군·구를 고르면 우리 동네 돈이 어디서 와서 어디에 쓰이는지 보여요. ${placeName('tax')}과 ${placeName('finance')}에서 전국 243개 지방정부를 다 볼 수 있어요.`, shot: 'landing/phone-village.jpg', icon: '' },
    { title: '이웃과 함께 따져 봐요', text: `활동가가 올린 ${placeName('cards')}에 내 생각을 남기고, 궁금한 건 ${placeName('counsel')}에 바로 물어요. 예산이 새는 사업은 ${placeName('dok')}에서 함께 지켜봐요.`, shot: 'landing/phone-end.jpg', icon: '' },
  ], note: '가입 없이 바로 시작해요. 로그인하면 내 동네를 저장하고 다른 기기에서도 이어 할 수 있어요.' },
  why: { title: '왜 만들었나요?', stories: [
    { title: '가장 가까운 돈인데, 가장 멀리 있어요', text: '놀이터, 마을버스, 동네 도서관. 우리 생활에 닿는 많은 돈이 동네 예산에서 나와요. 조금 어려워 보여도 결국 우리 삶과 바로 이어져 있어요. 그런데 들여다보는 사람은 많지 않아요.', photo: 'landing/why-1.jpg' },
    { title: '예산에는 정답이 없어요', text: '둘 다 필요한 것 중에 하나를 골라야 하는 게 예산이에요. 몇 번만 달리 골라도 답이 달라져요. 그래서 예산에는 많은 논쟁과 깊은 숙의가 필요해요. (물론 새는 돈은 있어요)', photo: '' },
    { title: '멈칫한 순간을 함께 나눠요', text: '걷다 보면 몇 번이나 멈칫하게 될 거예요. 그 순간을 혼자 갖고 있으면 금세 잊혀요. 27년 동안 정부와 기업의 돈을 감시해 온 함께하는 시민행동이 그 고민을 이웃과 나눌 마을을 만들었어요.', photo: 'landing/why-2.jpg' },
  ] },
  news: { title: '소식 받기', text: '시민의 숲과 함께하는 시민행동의 예산 감시 소식을 메일로 보내 드려요.' },
  play: '게임 하러 가기',
};
/*
  소식 받기 = 스티비(10-21 사용자 「스티비 둘 다 작동해. 일단 넣어둬」). 예산게임(budget-mbti app/stibee.ts STIBEE_LIST_ACTION) 첫 화면이 쓰는 주소록에 브라우저가 바로 보낸다 — 새 창에 스티비 결과가 뜬다.
  receiveMarketingMailAgreed 는 스티비 스크립트가 ad_agreement 를 바꿔 보내는 이름(budget-mbti 에서 확인) — 우리는 그 스크립트를 안 써서 직접 싣는다. 두 동의는 필수(브라우저가 막는다).
*/
const STIBEE_LIST = 'https://stibee.com/api/v1.0/lists/Iua2ta5S9VZbLfF-KD5oSdBTLiQu2g==/public/subscribers';

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
  const logo = el('img', 'lp-logo'); logo.src = PAGE.top.logo; logo.alt = '함께해요 시민의 숲'; // 로고 A안(10-26) — game/review/1020-logo-a.svg
  top.append(PAGE.top.logo ? logo : el('b', 'lp-brand', '함께해요 시민의 숲'), el('p', 'lp-top-line', PAGE.top.line));

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
    if (i === PAGE.what.items.length - 1) inner.append(el('p', 'lp-text lp-how-note', PAGE.what.note));
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

  // ⑥ 소식 받기(스티비) — 위 STIBEE_LIST
  const news = section('lp-news', PAGE.news.title);
  const form = el('form', 'lp-news-form lp-up'), sent = el('p', 'lp-text lp-news-sent');
  form.action = STIBEE_LIST; form.method = 'post'; form.target = '_blank'; form.acceptCharset = 'utf-8';
  const field = (name: string, type: string, label: string, required: boolean) => {
    const input = el('input'); input.name = name; input.type = type; input.required = required; input.setAttribute('aria-label', label); input.placeholder = label;
    if (type === 'email') input.autocomplete = 'email'; else input.autocomplete = 'name';
    return input;
  };
  const agree = (text: string, href?: string) => {
    const label = el('label', 'lp-news-agree'), box = el('input'); box.type = 'checkbox'; box.required = true;
    label.append(box, ` ${text}`);
    if (href) { const a = el('a', '', '처리방침 보기'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; label.append(' ', a); }
    return label;
  };
  const agreed = el('input'); agreed.type = 'hidden'; agreed.name = 'receiveMarketingMailAgreed'; agreed.value = 'true';
  const submit = el('button', 'lp-news-go', '구독하기'); submit.type = 'submit';
  form.append(field('email', 'email', '이메일 주소', true), field('name', 'text', '이름(선택)', false), agreed,
    agree('(필수) 이메일·이름을 소식 보내는 데 쓰는 것에 동의해요.', PRIVACY_URL), agree('(필수) 시민행동의 활동·후원 소식을 받는 데 동의해요.'), submit);
  form.addEventListener('submit', () => { sent.textContent = '새 창에서 구독을 마무리해 주세요. 메일함도 한 번 봐 주세요.'; });
  news.inner.append(el('p', 'lp-text lp-up', PAGE.news.text), form, sent);

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

  page.append(top, hero, intro, ...what, why.sec, news.sec, foot, bar);
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
