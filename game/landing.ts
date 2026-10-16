/*
  소개 페이지(10-16, 사용자 「시티트리클럽처럼 설명과 이야기를 웹에서 보고 게임으로 접속」 — seoulkfem.or.kr/citytreeclub).
  그 페이지 뼈대: 큰 사진+게임 단추 → 이야기(사진·글) 여러 칸 → 고정 배경 사진 → 카드 목록 → 끝 단추 줄(게임·신청·후원).

  **글·사진은 아직 비워 둔다**(사용자 「지금은 내용을 하나도 채워넣지 마. 제목, 내용, 사진 이런 식으로만」).
  채울 때는 아래 PAGE 만 고친다 — photo 는 game/public/ 에 넣은 그림 이름(예: 'landing/hero.jpg'), 비어 있으면 「사진」 자리.
  구조·움직임은 Claude, 겉모습(landing.css)은 GPT(README 「GPT 에게 — 소개 페이지·모습 고르기」).

  언제 보이나 — main.ts shouldShowLanding: 처음 온 사람이 아무것도 안 붙은 주소로 왔을 때만. 친구 초대·테이블·로그인 돌아옴·
  다시 온 사람(바로 마을)은 건너뛴다. ?about 이면 늘 보인다(보기용). 주소는 /game/ 그대로 — 로그인 돌아오는 주소를 안 바꾸려고.
*/
type Block = { title: string; text: string; photo: string };
type Link = { label: string; href: string };

const BLANK: Block = { title: '제목', text: '내용', photo: '' };
const PAGE = {
  hero: { ...BLANK },
  /** 이야기 칸 — 사진과 글이 번갈아 좌우로. 늘리거나 줄여도 된다. */
  stories: [{ ...BLANK }, { ...BLANK }, { ...BLANK }],
  /** 고정 배경 사진 위 한 줄(스크롤해도 사진은 멈춰 있다). */
  band: { ...BLANK },
  /** 카드 묶음 — 게임 방법·소식·함께하는 곳 등 무엇이든. href 가 있으면 카드가 링크가 된다. */
  cards: { title: '제목', items: [{ ...BLANK, href: '' }, { ...BLANK, href: '' }, { ...BLANK, href: '' }] },
  /** 끝 — 게임 단추 + 다른 단추들(신청·후원 등, href 를 채우면 보인다). */
  end: { title: '제목', text: '내용', links: [{ label: '단추', href: '' }, { label: '단추', href: '' }] as Link[] },
  play: '게임 하러 가기',
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
/** 사진 자리 — 그림이 없으면 「사진」 이라 적힌 빈 칸. */
function photo(src: string, className = 'lp-photo') {
  if (!src) { const box = el('div', `${className} lp-empty`, '사진'); box.setAttribute('aria-hidden', 'true'); return box; }
  const img = el('img', className); img.src = src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
  return img;
}
const words = (b: Pick<Block, 'title' | 'text'>, level: 'h1' | 'h2' | 'h3' = 'h2') => [el(level, 'lp-title', b.title), el('p', 'lp-text', b.text)];

/** 소개 페이지를 덮어 띄운다. 「게임 하러 가기」 → 페이지가 걷히고 그 밑 게임 시작 화면이 보인다(play). */
export function openLanding(play: () => void) {
  const page = el('div', 'lp');
  page.tabIndex = -1; page.setAttribute('role', 'region'); page.setAttribute('aria-label', '소개');
  const go = (className: string) => { const b = el('button', className, PAGE.play); b.type = 'button'; b.onclick = leave; return b; };

  const hero = el('header', 'lp-hero');
  const heroWords = el('div', 'lp-hero-words lp-up');
  heroWords.append(...words(PAGE.hero, 'h1'), go('lp-play'));
  hero.append(photo(PAGE.hero.photo, 'lp-hero-photo'), heroWords, el('span', 'lp-scroll-hint'));

  const stories = PAGE.stories.map((s, i) => {
    const sec = el('section', `lp-story lp-up${i % 2 ? ' lp-flip' : ''}`);
    const body = el('div', 'lp-story-words'); body.append(...words(s));
    sec.append(photo(s.photo), body);
    return sec;
  });

  const band = el('section', 'lp-band');
  if (PAGE.band.photo) band.style.backgroundImage = `url("${PAGE.band.photo}")`; else band.classList.add('lp-empty');
  const bandWords = el('div', 'lp-band-words lp-up'); bandWords.append(...words(PAGE.band));
  band.append(bandWords);

  const cards = el('section', 'lp-cards');
  const list = el('div', 'lp-card-list');
  list.append(...PAGE.cards.items.map(c => {
    const card = c.href ? Object.assign(el('a', 'lp-card lp-up'), { href: c.href, target: '_blank', rel: 'noopener' }) : el('div', 'lp-card lp-up');
    const body = el('div', 'lp-card-words'); body.append(...words(c, 'h3'));
    card.append(photo(c.photo), body);
    return card;
  }));
  cards.append(el('h2', 'lp-title lp-up', PAGE.cards.title), list);

  const end = el('footer', 'lp-end');
  const endBox = el('div', 'lp-up'); endBox.append(...words(PAGE.end), go('lp-play'));
  const links = el('div', 'lp-links');
  for (const l of PAGE.end.links) {
    const a = el('a', 'lp-link', l.label);
    if (l.href) Object.assign(a, { href: l.href, target: '_blank', rel: 'noopener' }); else a.classList.add('lp-empty'); // 링크 정하기 전엔 자리만
    links.append(a);
  }
  endBox.append(links);
  end.append(endBox);

  // 첫 화면을 지나면 아래에 늘 떠 있는 게임 단추(참고 페이지가 단추를 여러 번 둔 것을 하나로).
  const bar = el('div', 'lp-bar'); bar.append(go('lp-play'));

  page.append(hero, ...stories, band, cards, end, bar);
  document.body.append(page);
  page.focus({ preventScroll: true });

  // 움직임 — 칸이 화면에 들어오면 떠오르고(.in), 첫 화면을 지나면 아래 단추가 나온다. 움직임 줄이기 설정이면 CSS 가 끈다.
  const seen = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } }), { root: page, threshold: 0.15 });
  page.querySelectorAll('.lp-up').forEach(x => seen.observe(x));
  // 첫 화면·끝 칸이 보이면 그 안에 단추가 있으니 떠 있는 단추는 숨긴다.
  const showing = new Set<Element>();
  const pastHero = new IntersectionObserver(entries => {
    entries.forEach(e => (e.isIntersecting ? showing.add(e.target) : showing.delete(e.target)));
    bar.classList.toggle('on', showing.size === 0);
  }, { root: page, threshold: 0.1 });
  pastHero.observe(hero); pastHero.observe(end);

  function leave() {
    seen.disconnect(); pastHero.disconnect();
    page.classList.add('out');
    setTimeout(() => page.remove(), 400);
    play();
  }
}
