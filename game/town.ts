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
import { TOWN_IDS, REGIONS, josa, loadStamps, addStamp, type Town, type Neighbor, type Region, type Friend } from './profile';
import { toLook, lookFrom, type Look, type Pick } from './look';
import { board } from './stamps';
import { letterFor, type Season } from './seasons';
import { DONATE_URL } from './ui';
import { PRIVACY_URL } from './contact';
import { PROVIDER_NAME, type Provider } from './login';
import type { RegionView, Visit } from './api';

export type Person = { name: string; pick: Pick; type: TypeCode; town: Town };
type Guest = Omit<Visit, 'sessionId'>;
export type HubData = {
  me: Person; neighbor?: Neighbor; photo?: string;
  /** 지금이 예산철이면 그 철, 그리고 다음 철(편지 미리 보기). */
  season?: Season; next: Season;
  /** 서버가 있을 때만 — 방명록 읽기(집이 있을 때), 우리 지역 보기·짓기. */
  book?: () => Promise<Guest[] | undefined>;
  region?: Region;
  regionView?: (region: Region) => Promise<RegionView | undefined>;
  buildRegion?: (region: Region) => Promise<RegionView | undefined>;
  /** 이웃 편지 받기(= 소식 받기 판 열기). 연락처 칸이 켜진 판에서만. */
  subscribe?: () => void;
  /** 로그인(login.ts) — 단추가 없는 판(키를 넣기 전)엔 안 보인다. */
  login?: LoginOpts;
};
export type LoginOpts = { providers: Provider[]; current(): Provider | undefined; start(provider: Provider): void; logout(): void; forget(): Promise<boolean> };

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
const today = () => { const d = new Date(); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };
const nim = (name: string) => (name ? `${name}님` : '이름 없는 주민');

/** 작은 사람 — 판 안 목록·지역 동네·편지에 쓴다(게임 그림 draw.ts 의 Dude 를 HTML 로 줄인 것). */
export function avatar(look: Look, label = '') {
  const a = el('span', 't-ava');
  a.style.setProperty('--skin', hex(look.skin));
  a.style.setProperty('--hair', hex(look.style === 9 ? look.coat : look.hair));
  a.style.setProperty('--coat', hex(look.coat));
  a.dataset.style = String(look.style);
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
  const close = () => { panel.remove(); onClose(); };
  const back = btn('t-back', backText, close);
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
  const facts = el('dl', 't-facts');
  facts.append(el('dt', '', '이름'), el('dd', '', me.name || '동네 주민'), el('dt', '', '유형'), el('dd', '', TYPES[me.type].name),
    el('dt', '', '내 이웃'), el('dd', '', data.neighbor?.name || '아직'), el('dt', '', '우리 지역'), el('dd', '', data.region || '아직'));
  const body = el('div', 't-card-body'); body.append(photo, facts);
  const grid = el('div', 't-stamps');
  const tip = el('p', 't-tip', '도장을 누르면 받는 법이 보여요');
  for (const s of stamps) {
    const mark = btn(`t-stamp${s.on ? ' on' : ''}`, s.name, () => {
      tip.textContent = s.on ? `${s.name} — 받았어요` : `${s.name} — ${s.how}`;
      grid.querySelectorAll('.t-stamp').forEach(m => m.classList.toggle('sel', m === mark));
    });
    if (s.count > 1) mark.append(el('sup', '', `×${s.count}`));
    grid.append(mark);
  }
  const got = stamps.filter(s => s.on).length;
  card.append(el('div', 't-card-top', '동네 한 바퀴 주민증'), body, grid, el('p', 't-issued', `도장 ${got}/${stamps.length} · ${today()} 발급 · 함께하는 시민행동`));
  const save = btn('g-primary', '주민증 저장·보내기', () => {});
  const join = el('a', 'g-link t-join', '정주민 도장 — 시민행동 회원 되기 →');
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
  if (data.regionView && data.buildRegion) tab('우리 지역', regionSection(data));
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
      try { await navigator.share({ files: [ready], text: '동네 한 바퀴 — 내 주민증' }); return; } catch (error) { if ((error as Error).name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(ready), a = el('a'); a.href = url; a.download = ready.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // 아이폰은 바로 지우면 저장을 놓친다(예산게임에서 겪음)
    status.textContent = '주민증 그림을 저장했어요.';
  };
}

/**
 * 로그인 자리 — 안 했으면 「카카오로 지키기」 단추와 받는 것 안내, 했으면 「지키는 중」 과 끊기·지우기.
 * 안내는 실제로 받는 것 그대로(login.ts·server/gas.ts): 회원번호 하나(해시로 바꿔 둠) + 이 기기의 게임 기록.
 */
function loginBox(opts: LoginOpts, verb: '지키기' | '불러오기') {
  const box = el('section', 't-login');
  const status = el('p', 't-small'); status.setAttribute('role', 'status');
  const draw = () => {
    const now = opts.current();
    box.replaceChildren();
    if (now) {
      const links = el('div', 't-login-links');
      links.append(
        btn('g-link', '이 기기에서 로그아웃', () => { opts.logout(); draw(); }),
        btn('g-link', '서버 기록 지우기', async () => {
          if (!confirm('서버에 둔 주민증 기록을 지울까요? 이 기기의 기록은 그대로 남아요.')) return;
          const ok = await opts.forget();
          draw(); status.textContent = ok ? '서버 기록을 지웠어요.' : '지금은 지울 수 없어요. 조금 뒤에 다시 해 주세요.';
        }),
      );
      box.append(el('p', 't-login-on', `${PROVIDER_NAME[now]}로 지키는 중이에요. 다른 폰·브라우저에서 같은 ${PROVIDER_NAME[now]} 계정으로 들어오면 이 주민증이 이어져요.`), links, status);
      return;
    }
    box.append(el('p', 't-login-title', verb === '지키기' ? '주민증 지키기' : '전에 해 봤다면'),
      el('p', 't-small', verb === '지키기' ? '로그인해 두면 다른 폰·브라우저에서도 이 주민증과 도장이 이어져요. 안 해도 괜찮아요.' : '전에 로그인해 둔 주민증과 도장을 불러와요.'));
    for (const provider of opts.providers) box.append(btn(`t-login-btn t-${provider}`, `${PROVIDER_NAME[provider]}로 ${verb}`, () => opts.start(provider)));
    const note = el('p', 't-small t-login-note',
      `받는 건 ${opts.providers.map(p => PROVIDER_NAME[p]).join('·')} 회원번호 하나예요. 서버에는 알아볼 수 없게 바꿔서, 게임 기록(별명·모습·유형·도장·내 이웃·지역)과 함께 둬요. 이메일·이름·사진은 받지 않아요. `);
    const policy = el('a', '', '개인정보처리방침'); policy.href = PRIVACY_URL; policy.target = '_blank'; policy.rel = 'noopener';
    note.append(policy);
    box.append(note, status);
  };
  draw();
  return box;
}

/** 시작 화면 「전에 해 봤어요」 — 다른 기기에서 지켜 둔 주민증 불러오기. */
export function openLogin(shell: HTMLElement, opts: LoginOpts, onClose: () => void) {
  const { panel } = panelShell(shell, onClose, '← 처음 화면으로');
  panel.append(el('h2', '', '내 주민증 불러오기'), loginBox(opts, '불러오기'));
}

/** 우리 지역 동네 — 시·도를 고르면 한 채 짓고, 같은 지역 사람들이 지은 동네를 본다. */
function regionSection(data: HubData) {
  const box = el('section', 't-region');
  const status = el('p', 't-small'); status.setAttribute('role', 'status');
  const show = (view: RegionView | undefined) => {
    if (!view) { status.textContent = '지금은 우리 지역 동네를 불러올 수 없어요.'; return; }
    box.replaceChildren(el('h2', '', `${view.region} 동네`), regionView(view, data.me.town));
  };
  if (data.region) {
    box.append(el('h2', '', `${data.region} 동네`), status);
    status.textContent = '불러오는 중…';
    void data.regionView!(data.region).then(show);
    return box;
  }
  const pick = el('div', 't-regions');
  for (const region of REGIONS) {
    pick.append(btn('t-chip', region, async () => {
      pick.querySelectorAll('button').forEach(b => { b.disabled = true; });
      status.textContent = `${region}에 집을 짓는 중…`;
      const view = await data.buildRegion!(region);
      if (view) { addStamp('region'); show(view); } else { status.textContent = '지금은 지을 수 없어요. 조금 뒤에 다시 해 주세요.'; pick.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
    }));
  }
  box.append(
    el('p', 't-lead', '사는 곳에 이번에 지은 집을 한 채 세워요. 같은 지역 사람들이 지은 동네를 같이 볼 수 있어요.'),
    pick, el('p', 't-small', '시·도까지만 받아요. 다른 사람에게는 모습만 보이고 이름은 안 보여요.'), status);
  return box;
}

function regionView(view: RegionView, mine: Town) {
  const wrap = el('div');
  const crowd = el('div', 't-crowd');
  view.crowd.forEach(pick => crowd.append(avatar(toLook(pick))));
  wrap.append(el('p', 't-lead', `주민 ${view.total}명이 한 채씩 지었어요.`), crowd);
  if (!view.questions) {
    wrap.append(el('p', 't-small', `다섯 명이 넘으면 이 동네 사람들이 어떻게 골랐는지 보여 줘요. 친구를 부르면 동네가 빨리 차요.`));
    return wrap;
  }
  wrap.append(el('p', 't-small', '자리마다 이 지역 사람들 생각이 어떻게 갈렸는지예요. 굵은 쪽이 내가 고른 쪽이에요.'));
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
