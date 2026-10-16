/*
  마을 주민센터의 판 「주민증」 — 기획 2차(주민증)와 기획 3차(다시 올 이유, 10-14).
  그리고 링크로 들어왔을 때 걷기 전에 뜨는 판 둘 — 답장(openReply)·이웃의 편지(openLetter).

  · 마을(기획 4차) 주민센터 문 앞에 서면 연다 — openTown(주민증 먼저). 다른 건물의 판은 places.ts(여기 panelShell 을 같이 쓴다).
  · 우리 동네 예산은 마을 「나라살림 창고」 로 옮겼다(places.ts openFinance — 망원동 시험 자료를 243곳으로 넓힘).
  · 「내가 지은 동네」(고른 열다섯 가지 판)는 10-14 걷었다 — 사용자 「어차피 안 봐」. 답장 판에만 두 사람 것을 나란히 남겼다.
  · 방명록 — 내가 보낸 링크로 들어와 끝까지 걸은 사람(서버가 있을 때만). 열쇠가 이 기기에만 있어 나만 본다.
  · 우리 지역 동네 — 시·도에 한 채 짓고 같은 지역 사람들이 어떻게 골랐는지 본다(다섯 명부터). **지역에 유형 딱지는 안 붙인다.**
  · 이웃의 편지 — 예산철(9·12월)에 내 이웃이 보내는 편지 미리 보기와 받기(소식 받기, seasons.ts).
  · 주민증 + 도장판 — 한 일에 찍히는 도장 열 칸(stamps.ts). 그림으로 저장·보내기.
  게임 화면(ui.ts)과 따로 둔 파일 — GPT 가 ui.ts 를 꾸미는 동안 겹치지 않게. 모양은 town.css(꾸미기는 GPT, 클래스 이름은 지킴).
*/
import './town.css';
import { ROUTE, TYPES, COMMON_QUESTIONS, FIELD_QUESTIONS, type TypeCode } from './content';
import { TOWN_IDS, REGIONS, josa, loadStamps, addStamp, loadRegion, saveRegion, type Town, type Neighbor, type Region, type Friend } from './profile';
import { toLook, lookFrom, hairColor, type Look, type Pick } from './look';
import { board, ISSUE_AT, ISSUED } from './stamps';
import { letterFor, type Season } from './seasons';
import { DONATE_URL, backCloses, ICONS, contactForm } from './ui';
import { PRIVACY_URL, type ContactForm } from './contact';
import { PROVIDER_NAME, type Provider } from './login';
import type { RegionView, Visit } from './api';
import { VILLAGE_NAME } from './village';

export type Person = { name: string; pick: Pick; type: TypeCode; town: Town };
type Guest = Omit<Visit, 'sessionId'>;
export type HubData = {
  me: Person; neighbor?: Neighbor; photo?: string;
  /** 지금이 예산철이면 그 철, 그리고 다음 철(편지 미리 보기). */
  season?: Season; next: Season;
  /** 서버가 있을 때만 — 방명록 읽기(집이 있을 때), 우리 동네 보기·짓기(내 동네는 profile 의 loadRegion — 시·군·구 코드). */
  book?: () => Promise<Guest[] | undefined>;
  regionView?: (region: Region) => Promise<RegionView | undefined>;
  buildRegion?: (region: Region) => Promise<RegionView | undefined>;
  /** 이웃 편지 받기(= 소식 받기 판 열기). 연락처 칸이 켜진 판에서만. */
  subscribe?: () => void;
  /** 로그인(login.ts) — 단추가 없는 판(키를 넣기 전)엔 안 보인다. */
  login?: LoginOpts;
};
/** start 가 false 면 아직 못 간다(키를 넣기 전) — 판이 「준비 중」 이라 알린다. */
export type LoginOpts = { providers: Provider[]; current(): Provider | undefined; admin(): boolean; start(provider: Provider): boolean; logout(): Promise<boolean>; forget(): Promise<boolean> };

const byId = new Map([...COMMON_QUESTIONS, ...FIELD_QUESTIONS].map(q => [q.id, q]));
export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
export const btn = (className: string, text: string, onClick: () => void) => {
  const b = el('button', className, text); b.type = 'button'; b.onclick = onClick; return b;
};
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
const today = (at = Date.now()) => { const d = new Date(at); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };
const nim = (name: string) => (name ? `${name}님` : '이름 없는 주민');

/** 작은 사람 — 판 안 목록·지역 동네·편지에 쓴다(게임 그림 draw.ts 의 Dude 를 HTML 로 줄인 것). */
export function avatar(look: Look, label = '') {
  const a = el('span', 't-ava');
  a.style.setProperty('--skin', hex(look.skin));
  a.style.setProperty('--hair', hex(hairColor(look)));
  a.style.setProperty('--coat', hex(look.coat));
  a.dataset.hair = look.style;
  a.append(el('i', 't-ava-body'), el('i', 't-ava-head'), el('i', 't-ava-hair'));
  if (label) { a.setAttribute('role', 'img'); a.setAttribute('aria-label', label); } else a.setAttribute('aria-hidden', 'true');
  return a;
}

/** 열다섯 자리 — 내 집, 옆에 세운 사람의 집(답장에서만 쓴다). */
function lotsView(mine: Town, beside?: { name: string; town?: Town }) {
  const wrap = el('div', 't-town');
  for (const stage of ROUTE) {
    const block = el('section', 't-area');
    const lots = el('ul', 't-lots');
    for (const id of stage.ids) {
      const i = TOWN_IDS.indexOf(id), q = byId.get(id)!, key = mine[i] as 'a' | 'b';
      const lot = el('li', 't-lot');
      lot.append(el('span', 't-house', q[key].short), el('small', 't-place', q.place));
      if (beside?.town) {
        const theirs = beside.town[i] as 'a' | 'b';
        if (theirs === key) lot.append(el('span', 't-with', `${beside.name}님도`));
        else { const house = el('span', 't-house t-friend', q[theirs].short); house.append(el('em', '', beside.name)); lot.append(house); }
      }
      lots.append(lot);
    }
    block.append(el('h3', '', stage.area), lots);
    wrap.append(block);
  }
  return wrap;
}

export function panelShell(shell: HTMLElement, onClose: () => void, backText = '← 마을로') {
  const panel = el('section', 't-panel');
  let closed = false;
  const finish = () => { if (closed) return; closed = true; panel.remove(); onClose(); };
  const leave = backCloses(finish); // 폰 「뒤로」 = 이 판 닫기
  const close = () => { leave(); finish(); };
  // 닫기는 오른쪽 위 ✕ 하나(사용자 10-14 「← 마을로」 같은 글은 빼기). 어디로 가는지는 화면 읽기 도구에만.
  const back = btn('t-back', '', close);
  back.innerHTML = ICONS.close; back.setAttribute('aria-label', backText.replace(/^←\s*/, ''));
  panel.append(back);
  shell.append(panel);
  back.focus({ preventScroll: true });
  return { panel, close };
}

// ───────────────────────── 주민센터 — 주민증·도장판, 그리고 방명록·우리 지역·이웃의 편지 ─────────────────────────
export function openTown(shell: HTMLElement, data: HubData, onClose: () => void, backText?: string) {
  const { panel, close } = panelShell(shell, onClose, backText);
  const { me } = data;

  // 위 갈래(탭)로 한 번에 하나만 — 사용자 10-14 「주민 도장 받기 보여주는 게 난잡해, 깔끔하게」. 처음엔 주민증.
  const tabs = el('div', 't-tabs'); tabs.setAttribute('role', 'tablist');
  const panes: HTMLElement[] = [];
  const show = (i: number) => panes.forEach((pane, j) => {
    pane.hidden = i !== j;
    tabs.children[j].classList.toggle('on', i === j);
    tabs.children[j].setAttribute('aria-selected', String(i === j));
  });
  const tab = (label: string, pane: HTMLElement) => {
    const i = panes.push(pane) - 1;
    pane.classList.add('t-pane');
    const b = btn('t-tab', label, () => show(i)); b.setAttribute('role', 'tab');
    tabs.append(b);
  };

  // ── 주민증 + 도장판 — 도장을 누르면 받는 법이 아래 한 줄로 ──
  const stamps = board(loadStamps());
  const card = el('div', 't-card');
  const photo = el('div', 't-photo');
  if (data.photo) { const img = el('img'); img.src = data.photo; img.alt = '내 모습'; photo.append(img); }
  else photo.append(avatar(toLook(me.pick)));
  const facts = el('dl', 't-facts'), where = el('dd', '', '아직');
  if (loadRegion()) void loadPlaces().then(({ places }) => { const p = places.find(x => x.c === loadRegion()); if (p) where.textContent = placeTitle(p); });
  facts.append(el('dt', '', '이름'), el('dd', '', me.name || '동네 주민'), el('dt', '', '유형'), el('dd', '', TYPES[me.type].name),
    el('dt', '', '내 이웃'), el('dd', '', data.neighbor?.name || '아직'), el('dt', '', '내 동네'), where);
  const body = el('div', 't-card-body'); body.append(photo, facts);
  const grid = el('div', 't-stamps');
  const tip = el('p', 't-tip');
  for (const s of stamps) {
    const mark = btn(`t-stamp${s.on ? ' on' : ''}`, s.name, () => {
      tip.textContent = s.on ? `${s.name} — 받았어요` : `${s.name} — ${s.how}`;
      grid.querySelectorAll('.t-stamp').forEach(m => m.classList.toggle('sel', m === mark));
    });
    if (s.count > 1) mark.append(el('sup', '', `×${s.count}`));
    grid.append(mark);
  }
  // 발급 — 도장 ISSUE_AT 개부터(사용자 10-15 「도장 찍어야 주민증이 발급되게」). 처음 발급된 날을 적어 두고 그날을 찍는다. 그 전엔 「발급 전」 도장과 남은 수.
  const got = stamps.filter(s => s.on).length, issued = got >= ISSUE_AT;
  if (issued) addStamp(ISSUED);
  const issuedAt = loadStamps()[ISSUED];
  card.classList.toggle('pending', !issued);
  card.append(el('div', 't-card-top', '시민의 숲 주민증'), body, el('span', 't-seal', issued ? '발급' : '발급 전'), grid,
    el('p', 't-issued', issued && issuedAt ? `도장 ${got}/${stamps.length} · ${today(issuedAt)} 발급 · 함께하는 시민행동` : `도장 ${got}/${stamps.length} · ${ISSUE_AT - got}개를 더 모으면 발급돼요`));
  const save = btn('g-primary', '주민증 저장·보내기', () => {});
  save.hidden = !issued; // 발급 전 주민증은 보내지 않는다
  const join = el('a', 'g-link t-join', '함께하는 시민행동 회원 되기 →');
  join.href = `${DONATE_URL}&utm_content=resident-card`; join.target = '_blank'; join.rel = 'noopener';
  const status = el('p', 't-small'); status.setAttribute('role', 'status');
  const mine = el('div'); mine.append(card, tip, save, join, status);
  if (data.login && (data.login.providers.length || data.login.current())) mine.append(loginBox(data.login, '지키기'));
  tab('주민증', mine);

  // ── 방명록 ──
  if (data.book) {
    const book = el('section');
    const list = el('ul', 't-guests');
    const status = el('p', 't-small', '불러오는 중…');
    book.append(status, list);
    tab('방명록', book);
    void data.book().then(guests => {
      if (!guests) { status.textContent = '지금은 방명록을 불러올 수 없어요.'; return; }
      if (!guests.length) { status.textContent = '아직 없어요. 「친구에게 보내기」 로 링크를 보내면, 그 링크로 끝까지 걸은 친구가 여기에 남아요.'; return; }
      addStamp('guest');
      status.textContent = `${guests.length}명이 내 링크로 들어와 끝까지 걸었어요.`;
      for (const g of guests) {
        const item = el('li', 't-guest');
        item.append(avatar(toLook(g.pick)), el('b', '', g.name), el('span', 't-small', `「${TYPES[g.type].name}」 · ${new Date(g.at).getMonth() + 1}월 ${new Date(g.at).getDate()}일`));
        list.append(item);
      }
    });
  }

  // ── 우리 지역 동네 · 이웃의 편지 ──
  if (data.regionView && data.buildRegion) tab('우리 동네', regionSection(data));
  tab('이웃 편지', letterSection(data, close));
  panel.append(tabs, ...panes);
  show(0);

  // ── 그림 — 미리 찍어 둔다(누른 뒤에 찍으면 아이폰이 공유창을 막는다, main.ts 와 같은 까닭) ──
  let file: File | undefined;
  async function prepare() {
    try {
      const { toBlob } = await import('html-to-image');
      await document.fonts?.ready;
      const blob = await toBlob(card, { pixelRatio: 3, backgroundColor: '#fffaf0' });
      if (blob) file = new File([blob], 'dongne-resident.png', { type: 'image/png' });
    } catch (error) { console.warn(error); }
  }
  setTimeout(prepare, 400); // 판이 열리는 움직임이 끝난 뒤
  save.onclick = async () => {
    const ready = file ?? (await prepare(), file);
    if (!ready) { status.textContent = '그림을 만들지 못했어요. 화면을 찍어 주세요.'; return; }
    if (navigator.canShare?.({ files: [ready] })) {
      try { await navigator.share({ files: [ready], text: '함께해요 시민의 숲 — 내 주민증' }); return; } catch (error) { if ((error as Error).name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(ready), a = el('a'); a.href = url; a.download = ready.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // 아이폰은 바로 지우면 저장을 놓친다(예산게임에서 겪음)
    status.textContent = '주민증 그림을 저장했어요.';
  };
}

/**
 * 로그인 자리 — 안 했으면 「카카오로 지키기」 단추와 받는 것 안내, 했으면 「지키는 중」 과 끊기·지우기.
 * 안내는 실제로 받는 것 그대로(login.ts·server/gas.ts): 회원번호(해시로 바꿔 둠) + 이 기기의 게임 기록, 그리고 이메일(남기지 않고 로그인 직후 소식 받기 칸에만 — openNews).
 */
function loginBox(opts: LoginOpts, verb: '지키기' | '불러오기' | '로그인') {
  const box = el('section', 't-login');
  const status = el('p', 't-small'); status.setAttribute('role', 'status');
  const draw = () => {
    const now = opts.current();
    box.replaceChildren();
    if (now) {
      const links = el('div', 't-login-links');
      links.append(
        btn('g-link', '이 기기에서 로그아웃', async () => {
          status.textContent = '기록을 올리는 중…';
          if (await opts.logout()) location.reload(); // 이 기기 기록도 비웠으니 처음 화면부터
          else status.textContent = '기록을 서버에 못 올려서 로그아웃하지 않았어요. 조금 뒤에 다시 해 주세요.';
        }),
        btn('g-link', '서버 기록 지우기', async () => {
          if (!confirm('서버에 둔 주민증 기록을 지울까요? 이 기기의 기록은 그대로 남아요.')) return;
          const ok = await opts.forget();
          draw(); status.textContent = ok ? '서버 기록을 지웠어요.' : '지금은 지울 수 없어요. 조금 뒤에 다시 해 주세요.';
        }),
      );
      box.append(el('p', 't-login-on', `${PROVIDER_NAME[now]}로 지키는 중이에요${opts.admin() ? ' · 관리자 계정' : ''}. 다른 폰·브라우저에서 같은 ${PROVIDER_NAME[now]} 계정으로 들어오면 이 주민증이 이어져요.`), links, status);
      return;
    }
    if (verb !== '로그인') box.append(el('p', 't-login-title', verb === '지키기' ? '주민증 지키기' : '전에 해 봤다면'),
      el('p', 't-small', verb === '지키기' ? '로그인해 두면 다른 폰·브라우저에서도 이 주민증과 도장이 이어져요. 안 해도 괜찮아요.' : '전에 로그인해 둔 주민증과 도장을 불러와요.'));
    for (const provider of opts.providers) box.append(btn(`t-login-btn t-${provider}`, `${PROVIDER_NAME[provider]}로 ${verb}`, () => {
      if (!opts.start(provider)) status.textContent = `${PROVIDER_NAME[provider]} 로그인은 곧 열려요. 지금은 로그인 없이 둘러봐 주세요 — 기록은 이 기기에 남아요.`;
    }));
    const note = el('p', 't-small t-login-note',
      `받는 건 ${opts.providers.map(p => PROVIDER_NAME[p]).join('·')} 회원번호와 이메일이에요. 서버에는 회원번호만 알아볼 수 없게 바꿔서, 게임 기록(별명·모습·유형·도장·내 이웃·지역)과 함께 둬요. 이메일은 로그인 뒤 「소식 받기」에 동의할 때만 남기고, 이름·사진은 받지 않아요. `);
    const policy = el('a', '', '개인정보처리방침'); policy.href = PRIVACY_URL; policy.target = '_blank'; policy.rel = 'noopener';
    note.append(policy);
    box.append(status, note); // 알림(「곧 열려요」)은 단추 바로 밑에
  };
  draw();
  return box;
}

/** 시작 화면 「전에 해 봤어요」 — 다른 기기에서 지켜 둔 주민증 불러오기. */
export function openLogin(shell: HTMLElement, opts: LoginOpts, onClose: () => void) {
  const { panel } = panelShell(shell, onClose, '← 처음 화면으로');
  panel.append(el('h2', '', '내 주민증 불러오기'), loginBox(opts, '불러오기'));
}

/**
 * 마을 입구 로그인(사용자 10-15 「기록을 위해서는 로그인을 해 주세요 — 카카오톡·구글, 마을 입구에서, 안 해도 돌아볼 수 있게」).
 * 로그인 안 한 사람이 마을에 들어올 때 한 번(main 이 판마다 한 번만 부른다). 「로그인 없이 둘러보기」 로 닫는다.
 */
export function openGateLogin(shell: HTMLElement, opts: LoginOpts, onClose: () => void) {
  const { panel, close } = panelShell(shell, onClose, '로그인 없이 둘러보기');
  panel.classList.add('t-gate');
  panel.append(el('p', 'g-kicker', VILLAGE_NAME), el('h2', '', '기록을 남기려면 로그인해 주세요'),
    el('p', 't-lead', '로그인하면 내 주민증·도장이 다른 폰과 브라우저에서도 이어져요.'), // 동전은 이 기기에만(Save 에 없음)
    loginBox(opts, '로그인'), btn('g-ghost', '로그인 없이 둘러보기', close),
    el('p', 't-small', '로그인하지 않아도 마을을 다 돌아볼 수 있어요. 기록은 이 기기에만 남아요.'));
}

/**
 * 로그인 직후 한 번 — 됐다는 걸 판으로 확실히(사용자 10-16 「된 건지 안 된 건지 모르겠다」, 예전엔 2초 알림 한 줄).
 * 기록을 서버에 못 올렸으면(unsaved) 그렇게 말한다 — 다음에 열 때 keepSynced 가 다시 올린다.
 */
export function openLoggedIn(shell: HTMLElement, provider: Provider, unsaved: boolean, onClose: () => void) {
  const { panel, close } = panelShell(shell, onClose, '확인');
  panel.classList.add('t-gate');
  panel.append(el('p', 'g-kicker', VILLAGE_NAME), el('h2', '', `✓ ${PROVIDER_NAME[provider]}로 로그인했어요`),
    el('p', 't-lead', unsaved
      ? '로그인은 됐지만 기록을 서버에 아직 못 올렸어요. 이 기기에는 그대로 있고, 다음에 열 때 다시 올려요.'
      : `내 주민증과 도장을 ${PROVIDER_NAME[provider]} 계정에 지켜 뒀어요. 다른 폰·브라우저에서 같은 계정으로 들어오면 그대로 이어져요.`),
    btn('g-primary', '확인', close));
}

/**
 * 로그인 직후 한 번 — 카카오·구글이 확인해 준 이메일로 소식 받기(사용자 10-15 「이메일 정도는 받을 수 있잖아 — 준비해놔」).
 * 그 주소는 이 칸을 채우는 데만 쓴다. 동의 칸은 내 이웃 판과 같은 것(contactForm) — 「소식 받기」 를 누르기 전엔 어디에도 안 남는다.
 */
export function openNews(shell: HTMLElement, provider: Provider, email: string, send: (form: ContactForm) => Promise<{ ok: boolean; text: string }>, onClose: () => void) {
  const { panel, close } = panelShell(shell, onClose, '닫기');
  panel.classList.add('t-gate');
  panel.append(el('p', 'g-kicker', VILLAGE_NAME), el('h2', '', `${PROVIDER_NAME[provider]}로 주민증을 지켰어요`),
    el('p', 't-lead', '이 이메일로 소식도 받아 볼래요? 안 받아도 기록은 그대로 이어져요.'),
    contactForm(send, '이메일로 소식 받기', email).form, btn('g-ghost', '괜찮아요', close));
}

// ───────────────────────── 내 동네 고르기 — 지방정부 예산·우리 지역 수입·우리 동네가 같이 쓴다 ─────────────────────────
/** 지방재정365 한 곳 — c 코드 7자리, n 이름, s 시·도, p 주민, b 예산, pp 한 사람 몫(천 원), w 사회복지 %, i 스스로 거두는 돈 %. */
export type FinancePlace = { c: string; n: string; s: string; p: number; b: number; pp: number; w: number; i: number };
/** 243곳(시·도 17 + 시·군·구 226) — 누를 때 불러온다(25KB, 마을을 처음 열 때 무겁지 않게). */
export const loadPlaces = () => import('./data/local-finance.json').then(m => m.default as { year: number; places: FinancePlace[] });
/** 「서울 마포구」 / 「서울」 */
export const placeTitle = (place: FinancePlace) => (place.n.endsWith('(시·도)') ? place.s : `${place.s} ${place.n}`);

/**
 * 사용자 10-15 「처음에 입력할 때 내 동네를 저장할 수 있고, 그다음에 들어가면 자동으로 내 동네만, 다른 동네 보기도」.
 * 저장한 곳이 있으면 고르는 칸은 접고 그 곳을 바로 연다(머리 줄에 「다른 동네 보기」). 없으면 시·도 → 시·군·구 고르기.
 * 고른 곳이 내 동네가 아니면 「여기를 내 동네로 저장」. show(곳) 가 내용을 그리고(곳이 없으면 비움), 저장하면 onSave.
 * 돌려주는 둘(고르는 칸, 머리 줄)을 내용 칸 앞에 붙인다.
 */
export function placeChooser(all: FinancePlace[], show: (place?: FinancePlace) => void, onSave?: (place: FinancePlace) => void) {
  const picker = el('div', 't-picker'), sidos = el('div', 't-regions'), towns = el('div', 't-regions'), head = el('div', 't-mine');
  // 내 동네가 없으면 맨 위에서 묻고, 처음 고른 곳을 바로 내 동네로(사용자 10-16 「설정하는 것을 쉽게 해야 볼 수 있지」 — 작은 저장 단추는 눈에 안 띄었다).
  const ask = el('div', 't-mine-ask');
  ask.append(el('p', 't-mine-q', '내 동네는 어디예요?'), el('p', 't-small', '시·도를 누르고 사는 시·군·구를 고르면 내 동네로 저장되고 「내 동네」 도장이 찍혀요. 나중에 바꿀 수 있어요.'));
  picker.append(sidos, towns);
  const mine = () => all.find(p => p.c === loadRegion());
  const showSido = (sido: string) => {
    sidos.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === sido));
    towns.replaceChildren(...all.filter(p => p.s === sido).map(p => { const b = btn('t-chip', p.n, () => open(p)); b.dataset.c = p.c; return b; }));
  };
  /** 내 동네로 — 어디서 정하든 「내 동네」 도장(10-16, 예전엔 주민센터 우리 동네 탭을 열어야만). */
  const save = (place: FinancePlace) => {
    saveRegion(place.c);
    const got = addStamp('region');
    ask.hidden = true; picker.hidden = true;
    drawHead(place, got ? '내 동네로 저장했어요 · 「내 동네」 도장을 받았어요' : '내 동네로 저장했어요');
  };
  const open = (place: FinancePlace) => {
    towns.querySelectorAll<HTMLElement>('button').forEach(b => b.classList.toggle('on', b.dataset.c === place.c));
    if (!loadRegion()) save(place); else drawHead(place);
    show(place);
  };
  const drawHead = (place?: FinancePlace, note?: string) => {
    const my = mine();
    head.replaceChildren();
    if (!place) return;
    if (my?.c === place.c) {
      head.append(el('span', 't-mine-tag', '내 동네'), el('b', '', placeTitle(place)));
      if (picker.hidden) head.append(btn('g-link', '다른 동네 보기', () => { picker.hidden = false; drawHead(place); }));
      if (note) { const done = el('p', 't-mine-done', note); done.setAttribute('role', 'status'); head.append(done); }
      return;
    }
    head.append(el('b', '', placeTitle(place)), btn('t-chip t-save', '여기를 내 동네로 저장', () => { save(place); onSave?.(place); }));
    if (my) head.append(btn('g-link', '내 동네로', () => { picker.hidden = true; showSido(my.s); open(my); }));
  };
  sidos.append(...REGIONS.map(sido => btn('t-chip', sido, () => { showSido(sido); drawHead(); show(); })));
  const my = mine();
  if (my) { ask.hidden = true; picker.hidden = true; showSido(my.s); open(my); } else drawHead();
  return [ask, picker, head];
}

/** 우리 동네 — 내 동네(시·군·구)에 이번 판 집을 한 채 세우고, 그 동네 사람들이 고른 것을 본다. 다른 동네는 보기만. */
function regionSection(data: HubData) {
  const box = el('section', 't-region'), view = el('div');
  const status = el('p', 't-small'); status.setAttribute('role', 'status');
  box.append(el('h2', '', '우리 동네 사람들'), status);
  status.textContent = '불러오는 중…';
  let asked = 0; // 빨리 여러 곳을 누르면 마지막 것만 그린다
  const show = async (place?: FinancePlace) => {
    const n = ++asked;
    view.replaceChildren();
    if (!place) { status.textContent = ''; return; }
    const mineNow = place.c === loadRegion();
    status.textContent = '불러오는 중…';
    const got = mineNow ? await data.buildRegion!(place.c) : await data.regionView!(place.c);
    if (n !== asked) return;
    status.textContent = got ? '' : '지금은 불러올 수 없어요. 조금 뒤에 다시 해 주세요.';
    if (got) { if (mineNow) addStamp('region'); view.replaceChildren(regionView(got, data.me.town)); }
  };
  void loadPlaces().then(({ places }) => {
    status.textContent = '';
    box.append(...placeChooser(places, place => void show(place), place => void show(place)), view,
      el('p', 't-small', '내 동네에는 이번 판 집이 한 채 서요. 다른 사람에게는 모습만 보이고 이름은 안 보여요.'));
  }, () => { status.textContent = '자료를 불러오지 못했어요.'; });
  return box;
}

function regionView(view: RegionView, mine: Town) {
  const wrap = el('div');
  const crowd = el('div', 't-crowd');
  view.crowd.forEach(pick => crowd.append(avatar(toLook(pick))));
  wrap.append(el('p', 't-lead', view.total ? `주민 ${view.total}명이 한 채씩 지었어요.` : '아직 이 동네에 집을 지은 사람이 없어요.'), crowd);
  if (!view.questions || !view.total) return wrap;
  wrap.append(el('p', 't-small', '자리마다 이 동네 사람들 생각이 어떻게 갈렸는지예요. 굵은 쪽이 내가 고른 쪽이에요.'));
  const list = el('ol', 'g-split');
  for (const id of TOWN_IDS) {
    const q = byId.get(id)!, count = view.questions[id], key = mine[TOWN_IDS.indexOf(id)];
    const sum = count.a + count.b || 1, a = Math.round((count.a / sum) * 100);
    const bar = el('div', 'g-bar');
    bar.style.setProperty('--a', `${a}%`);
    bar.append(el('span', key === 'a' ? 'mine' : '', `${q.a.short} ${a}%`), el('span', key === 'b' ? 'mine' : '', `${q.b.short} ${100 - a}%`));
    const item = el('li');
    item.append(el('p', 't-small', q.place), bar);
    list.append(item);
  }
  wrap.append(list);
  return wrap;
}

/** 이웃의 편지 — 다음 철에 올 편지 미리 보기와 받기. */
function letterSection(data: HubData, closeHub: () => void) {
  const box = el('section', 't-letter-box');
  if (data.season) box.append(el('p', 't-season', `지금은 ${data.season.name}이에요. 이번 철에 걸어서 철 도장을 받았어요.`));
  if (!data.neighbor) {
    box.append(el('p', 't-lead', '언덕에서 「내 이웃 정하기」 를 하면, 예산철(9월·12월)마다 그 이웃이 편지를 보내요.'));
    return box;
  }
  const letter = letterFor(data.next, data.neighbor, data.me.name);
  box.append(el('p', 't-lead', `${data.next.month}월, ${data.next.name}에 ${josa(`「${data.neighbor.name}」`, '이', '가')} 편지를 보내요.`));
  const paper = el('blockquote', 't-letter t-letter-peek');
  paper.append(avatar(lookFrom(data.neighbor.seed), data.neighbor.name), ...letter.lines.slice(0, 3).map(line => el('p', '', line)), el('p', 't-small', '…'));
  box.append(paper);
  if (loadStamps().news) box.append(el('p', 't-small', '소식을 받기로 했어요. 편지 속 링크를 누르면 이웃이 기다리는 동네로 와요.'));
  else if (data.subscribe) box.append(btn('g-ghost', '편지 받기 — 소식 받기', () => { closeHub(); data.subscribe!(); })); // 판을 닫아야 아래 판(소식 받기)이 보인다
  else box.append(el('p', 't-small', '편지 받기는 곧 열려요.'));
  return box;
}

// ───────────────────────── 답장(?with= 에 r 이 있을 때) ─────────────────────────
/** 처음에 친구를 부른 사람이 친구의 답장을 열었을 때 — 걷지 않고 바로 두 동네를 나란히. */
export function openReply(shell: HTMLElement, me: Friend, friend: Friend, onWalk: () => void) {
  addStamp('guest');
  const { panel, close } = panelShell(shell, onWalk, '← 처음 화면으로');
  const who = (pick: Pick, name: string) => { const f = el('span', 't-who'); f.append(avatar(toLook(pick)), el('small', '', name)); return f; };
  const pair = el('div', 't-pair');
  pair.append(who(me.pick, me.name ? `${me.name}(나)` : '나'), who(friend.pick, nim(friend.name)));
  panel.append(
    el('p', 't-kicker', '답장이 왔어요'),
    el('h2', '', `${friend.name}님이 답장을 보냈어요`),
    pair,
    el('p', 't-lead', `${friend.name}님은 「${TYPES[friend.type].name}」. ${me.town && friend.town ? `내가 지은 동네 옆에 ${friend.name}님이 지은 집을 세웠어요.` : ''}`),
  );
  if (me.town) panel.append(lotsView(me.town, friend.town ? { name: friend.name, town: friend.town } : undefined));
  panel.append(
    btn('g-primary', `${friend.name}님이랑 한 바퀴 더 걷기`, close),
    el('p', 't-small', '답장 링크에는 두 사람이 지은 동네가 담겨 있어요. 둘 사이에서만 나눠 주세요.'),
  );
}

// ───────────────────────── 이웃의 편지(?letter= 로 들어왔을 때) ─────────────────────────
/** walk 가 있으면(마을에서 연 편지) 「같이 걷기」 는 걸으러 가고, 뒤로는 그냥 닫힌다. 없으면 닫으면 처음 화면(걷기 전). */
export function openLetter(shell: HTMLElement, season: Season, neighbor: Neighbor | undefined, myName: string, onWalk: () => void, walk?: () => void) {
  const letter = letterFor(season, neighbor, myName);
  const { panel, close } = panelShell(shell, onWalk, walk ? '← 마을로' : '← 처음 화면으로');
  const paper = el('blockquote', 't-letter');
  paper.append(avatar(neighbor ? lookFrom(neighbor.seed) : lookFrom('letter'), letter.from), ...letter.lines.map(line => el('p', '', line)));
  panel.append(
    el('p', 't-kicker', '편지가 왔어요'),
    el('h2', '', letter.title),
    paper,
    btn('g-primary', neighbor ? `${josa(`「${neighbor.name}」`, '이랑', '랑')} 한 바퀴 걷기` : '동네 한 바퀴 걷기', walk ?? close),
  );
}
