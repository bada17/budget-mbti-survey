/*
  마을 건물 안 판(기획 4차, 2026-10-14) — 버스 정류장·상담소·독상·나라살림 창고·쪽지판·시민행동 집. 주민센터는 town.ts 의 openTown.
  사용자(5ⓐ) 「주민이 한마디 하고, 그 사이트의 최신 것 하나를 보여 주고, 들어가기 링크」. 자료는 각 사이트가 이미 내놓은 것을 읽어 오기만 한다 —
  상담소 첫 화면에 담긴 글 목록(#pb-post-data)·자주 묻는 문답, 독상 data/campaigns.json·awards.json, 지방재정은 구워 둔 data/local-finance.json.
  못 불러오면 링크만 남는다 — 남의 사이트가 바뀌어도 마을은 멈추지 않게.
  쪽지판·쪽지 카드 — 사용자 「커뮤니티 기능보다는 혼자가 아니다는 느낌」: 답글 없이 한 줄, 「나도」·「신고」 만.
  모양은 town.css(꾸미기는 GPT, 클래스 이름은 지킴).
*/
import { panelShell, avatar, el, btn } from './town';
import { DONATE_URL } from './ui';
import { PLACES, NOTE_MAX, NOTE_WHY, NOTE_GAP_MS, checkNote, type PlaceId } from './village';
import { toLook, lookFrom } from './look';
import { josa, REGIONS, type Neighbor, type Region } from './profile';
import type { PublicNote, VillageView } from './api';

const PB_URL = 'https://pb.action.or.kr/';
const DOK_URL = 'https://dok.action.or.kr/';
const FINANCE_URL = 'https://bada17.github.io/local-finance/';
const HOME_URL = 'https://action.or.kr/';
const UTM = 'utm_source=dongne-game&utm_medium=game&utm_campaign=village';
/** 바깥 주소에 utm 을 붙인다(# 앞에). */
const out = (base: string, hash = '') => `${base}?${UTM}${hash ? `#${hash}` : ''}`;

const link = (text: string, href: string, className = 'g-primary v-go') => {
  const a = el('a', className, text); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a;
};

async function fetchText(url: string, ms = 8000) {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), ms);
  try { const r = await fetch(url, { signal: abort.signal }); return r.ok ? await r.text() : undefined; } catch { return undefined; } finally { clearTimeout(timer); }
}
const fetchJson = async <T>(url: string) => { const text = await fetchText(url); try { return text ? JSON.parse(text) as T : undefined; } catch { return undefined; } };

/** 건물마다 같은 머리 — 이름, 문 앞 주민(마을 장면의 그 주민과 같은 생김새)의 한마디. */
function placePanel(shell: HTMLElement, id: PlaceId, onClose: () => void) {
  const place = PLACES.find(p => p.id === id)!;
  const { panel, close } = panelShell(shell, onClose, '← 마을로');
  const npc = el('div', 'v-npc');
  npc.append(avatar(lookFrom(`npc:${id}`)), el('p', '', place.line));
  panel.append(el('h2', '', place.name), npc);
  return { panel, close };
}

// ───────────────────────── 버스 정류장 — 한 바퀴 다시 ─────────────────────────
export function openBus(shell: HTMLElement, neighbor: Neighbor | undefined, walk: () => void, onClose: () => void) {
  const { panel } = placePanel(shell, 'bus', onClose);
  panel.append(
    el('p', 't-lead', '「동네 한 바퀴」 열다섯 동네를 다시 걸어요. 지난번과 다르게 골라도 괜찮아요.'),
    ...(neighbor ? [el('p', 't-lead', `내 이웃 ${josa(`「${neighbor.name}」`, '이', '가')} 같이 걸어요.`)] : []),
    btn('g-primary', '한 바퀴 걷기', walk),
  );
}

// ───────────────────────── 시민참여 상담소 ─────────────────────────
/** 상담소 첫 화면(HTML)에서 — 전문위원 글 목록(#pb-post-data)과 자주 묻는 문답(#pb-qa 의 details). */
function readCounsel(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let posts: { id: string; title: string; by: string; date: string }[] = [];
  try { posts = (JSON.parse(doc.querySelector('#pb-post-data')?.textContent ?? '{}').items ?? []).slice(0, 3); } catch { /* 모양이 바뀌었으면 글은 건너뛴다 */ }
  const qas = [...doc.querySelectorAll('#pb-qa details')].map(d => ({
    q: d.querySelector('summary > span:not(.mark):not(.tail)')?.textContent?.trim() ?? '',
    a: d.querySelector('.ans .body')?.textContent?.trim() ?? '',
  })).filter(x => x.q && x.a);
  return { posts, qa: qas[Math.floor(Math.random() * qas.length)] };
}

export function openCounsel(shell: HTMLElement, onClose: () => void) {
  const { panel } = placePanel(shell, 'counsel', onClose);
  const status = el('p', 't-small', '상담소 소식을 불러오는 중…'); status.setAttribute('role', 'status');
  const body = el('div');
  panel.append(body, status, link('상담소 들어가기 →', out(PB_URL)));
  void fetchText(PB_URL).then(html => {
    const found = html ? readCounsel(html) : undefined;
    if (!found || (!found.qa && !found.posts.length)) { status.textContent = '지금은 소식을 불러오지 못했어요. 상담소에서 바로 볼 수 있어요.'; return; }
    status.remove();
    if (found.qa) {
      const qa = el('div', 'v-qa');
      qa.append(el('p', 'v-q', found.qa.q), el('p', 'v-a', found.qa.a));
      body.append(el('p', 't-kicker', '상담소에 자주 오는 질문'), qa);
    }
    if (found.posts.length) {
      const list = el('ul', 'v-list');
      for (const post of found.posts) {
        const item = el('li'), a = link(post.title, out(PB_URL, `post-${post.id}`), 'v-item');
        a.append(el('small', '', `${post.by} · ${post.date}`));
        item.append(a); list.append(item);
      }
      body.append(el('p', 't-kicker', '전문위원의 글'), list);
    }
  });
}

// ───────────────────────── 밑 빠진 독상 ─────────────────────────
type Campaign = { id: string; title: string; summary?: string; status: string; period?: string };
type Award = { date: string; awardee: string; project: string };

export function openDok(shell: HTMLElement, onClose: () => void) {
  const { panel } = placePanel(shell, 'dok', onClose);
  const status = el('p', 't-small', '독상 소식을 불러오는 중…'); status.setAttribute('role', 'status');
  const body = el('div');
  panel.append(body, status, link('밑 빠진 독상 보러 가기 →', out(DOK_URL)));
  void Promise.all([
    fetchJson<{ campaigns?: Campaign[] }>(`${DOK_URL}data/campaigns.json`),
    fetchJson<{ awards?: Award[] }>(`${DOK_URL}data/awards.json`),
  ]).then(([camps, awards]) => {
    const live = (camps?.campaigns ?? []).filter(c => c.status === 'ongoing');
    const list = awards?.awards ?? [];
    if (!live.length && !list.length) { status.textContent = '지금은 소식을 불러오지 못했어요. 독상 사이트에서 바로 볼 수 있어요.'; return; }
    status.remove();
    if (list.length) {
      const last = list[list.length - 1], since = list[0].date.slice(0, 4);
      body.append(el('p', 't-lead', `${since}년부터 ${list.length}번 상을 줬어요. 가장 최근은 ${last.date} ${last.awardee} 「${last.project}」.`));
    }
    if (live.length) {
      const items = el('ul', 'v-list');
      for (const c of live) {
        const a = link(c.title, out(DOK_URL, `camp-${c.id}`), 'v-item');
        if (c.summary) a.append(el('span', 'v-sum', c.summary));
        if (c.period) a.append(el('small', '', c.period));
        const li = el('li'); li.append(a); items.append(li);
      }
      body.append(el('p', 't-kicker', '지금 들여다보는 예산'), items);
    }
  });
}

// ───────────────────────── 나라살림 창고 — 우리 지역 한 해 살림 ─────────────────────────
type FinancePlace = { c: string; n: string; s: string; p: number; b: number; pp: number; w: number; i: number };
export function won(n: number) {
  if (n >= 1e12) return `${(Math.round(n / 1e11) / 10).toLocaleString('ko-KR')}조 원`;
  if (n >= 1e11) return `${Math.round(n / 1e8).toLocaleString('ko-KR')}억 원`;
  if (n >= 1e8) return `${(Math.round(n / 1e7) / 10).toLocaleString('ko-KR')}억 원`;
  return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만 원`;
}

/**
 * 시·도를 고르고 그 안의 시·군·구를 고르면 한 해 살림 카드. 판정·순위는 내지 않는다(지자체에 딱지를 안 붙이기로 함, README 「기획 2차」).
 * 자료는 누를 때 따로 불러온다(25KB) — 마을을 처음 열 때 무겁지 않게.
 */
export function openFinance(shell: HTMLElement, region: Region | undefined, onClose: () => void) {
  const { panel } = placePanel(shell, 'finance', onClose);
  const status = el('p', 't-small', '불러오는 중…');
  const sidos = el('div', 't-regions'), towns = el('div', 't-regions'), card = el('div');
  panel.append(el('p', 't-lead', '시·도를 고르고, 사는 곳을 골라 보세요.'), sidos, towns, card, status);
  void import('./data/local-finance.json').then(({ default: data }) => {
    status.remove();
    const all = data.places as FinancePlace[];
    const showTown = (place: FinancePlace) => {
      towns.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === place.c));
      const share = el('div', 't-share'); share.style.setProperty('--a', `${place.w}%`);
      share.append(el('span', '', `사회복지 ${place.w}%`), el('span', '', '그 밖'));
      const box = el('div', 't-bigcard');
      box.append(
        el('p', 't-small', `${place.s === place.n.replace(' (시·도)', '') ? '' : `${place.s} `}${place.n}의 ${data.year}년 살림(당초 예산)`),
        el('p', 't-big', won(place.b)),
        el('p', 't-small', `주민 ${place.p.toLocaleString('ko-KR')}명 · 한 사람에 ${Math.round(place.pp / 10).toLocaleString('ko-KR')}만 원꼴`),
        share,
        el('p', 't-small', `스스로 거두는 돈(지방세·세외수입)이 살림의 ${place.i}%`),
      );
      card.replaceChildren(box, link('지방재정 감시 사이트에서 더 보기 →', out(FINANCE_URL, place.c)),
        el('p', 't-small t-source', '출처: 지방재정365(2026년 당초 예산). 한 사람 몫과 스스로 거두는 돈은 일반회계 기준이에요.'));
      // 칩 목록이 길어 카드가 화면 밖에 생긴다 — 판만 내린다(scrollIntoView 는 게임 화면까지 밀어 숨겨 둔 판이 삐져나왔다).
      panel.scrollTo({ top: card.offsetTop - 12, behavior: 'smooth' });
    };
    const showSido = (sido: Region) => {
      sidos.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === sido));
      towns.replaceChildren(...all.filter(p => p.s === sido).map(p => { const b = btn('t-chip', p.n, () => showTown(p)); b.dataset.c = p.c; return b; }));
      card.replaceChildren();
    };
    sidos.append(...REGIONS.map(sido => btn('t-chip', sido, () => showSido(sido))));
    if (region) showSido(region);
  }, () => { status.textContent = '자료를 불러오지 못했어요.'; });
}

// ───────────────────────── 시민행동 집 ─────────────────────────
export function openHouse(shell: HTMLElement, onClose: () => void) {
  const { panel } = placePanel(shell, 'house', onClose);
  panel.append(
    el('p', 't-lead', '함께하는 시민행동은 「동네 한 바퀴」와 이 마을을 만든 시민단체예요. 예산 감시, 밑 빠진 독상, 시민참여 상담소를 꾸려 가요.'),
    link('회원 되기 — 정기후원 →', `${DONATE_URL}&utm_content=village-house`),
    link('홈페이지 가 보기 →', out(HOME_URL), 'g-link'),
  );
}

// ───────────────────────── 쪽지 — 쪽지판·광장에서 마주친 쪽지 카드 ─────────────────────────
/** 이 기기에만 — 내가 붙인 쪽지, 「나도」·「신고」 누른 쪽지, 마지막으로 붙인 시각. */
type Marks = { mine: string[]; liked: string[]; reported: string[]; lastAt: number };
const MARKS_KEY = 'budget-game-village';
export function loadMarks(): Marks {
  try {
    const raw = JSON.parse(localStorage.getItem(MARKS_KEY) ?? 'null');
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-200) : []);
    return { mine: ids(raw?.mine), liked: ids(raw?.liked), reported: ids(raw?.reported), lastAt: Number(raw?.lastAt) || 0 };
  } catch { return { mine: [], liked: [], reported: [], lastAt: 0 }; }
}
const saveMarks = (marks: Marks) => { try { localStorage.setItem(MARKS_KEY, JSON.stringify(marks)); } catch { /* 막힌 창 */ } };

export function ago(at: number, now = Date.now()) {
  const m = Math.floor((now - at) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}시간 전`;
  if (m < 60 * 24 * 30) return `${Math.floor(m / 60 / 24)}일 전`;
  const d = new Date(at); return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export type NoteActions = {
  like(id: string): Promise<number | undefined>;
  report(id: string): Promise<boolean>;
};

/** 쪽지 한 장 — 모습·별명·언제·글, 그리고 「나도」·「신고」. 판과 카드가 같이 쓴다. */
function noteView(note: PublicNote, on: NoteActions, onChange?: () => void) {
  const marks = loadMarks();
  const item = el('div', 'v-note');
  const who = el('div', 'v-who');
  who.append(avatar(toLook(note.pick)), el('b', '', note.name || '이름 없는 주민'), el('small', '', ago(note.at)));
  if (marks.mine.includes(note.id)) who.append(el('em', 'v-mine', '내 쪽지'));
  const like = btn('v-like', '', async () => {
    like.disabled = true;
    const count = await on.like(note.id);
    if (count === undefined) { like.disabled = false; return; }
    const m = loadMarks(); m.liked = [...new Set([...m.liked, note.id])]; saveMarks(m);
    note.likes = count; draw(); onChange?.();
  });
  const report = btn('v-report', '신고', async () => {
    if (!confirm('이 쪽지를 신고할까요? 신고가 모이면 숨겨져요.')) return;
    report.disabled = true;
    if (!(await on.report(note.id))) { report.disabled = false; return; }
    const m = loadMarks(); m.reported = [...new Set([...m.reported, note.id])]; saveMarks(m);
    report.textContent = '신고했어요';
  });
  const mine = marks.mine.includes(note.id);
  const draw = () => {
    const liked = loadMarks().liked.includes(note.id);
    like.textContent = mine ? `♥ 나도 ${note.likes}명` : `${liked ? '♥' : '♡'} 나도${note.likes ? ` ${note.likes}` : ''}`;
    like.disabled = liked || mine; // 내 쪽지엔 숫자만
    like.setAttribute('aria-label', `나도 — 지금 ${note.likes}명`);
  };
  draw();
  if (marks.reported.includes(note.id)) { report.disabled = true; report.textContent = '신고했어요'; }
  const row = el('div', 'v-acts');
  row.append(like, ...(mine ? [] : [report]));
  item.append(who, el('p', 'v-text', note.text), row);
  return item;
}

export type BoardOpts = NoteActions & {
  /** 지난번에 받아 둔 마을 모습 — 먼저 그리고, refresh 가 오면 갈아 끼운다(남이 누른 「나도」 가 보이게). */
  view?: VillageView;
  refresh(): Promise<VillageView | undefined>;
  online: boolean;
  myName: string;
  /** 붙이기 — 됐으면 붙인 쪽지와 새 마을 모습, 못 했으면 undefined. */
  post(text: string): Promise<{ note: PublicNote; view: VillageView } | undefined>;
};

export function openBoard(shell: HTMLElement, opts: BoardOpts, onClose: () => void) {
  const { panel } = placePanel(shell, 'board', onClose);
  if (!opts.online) { panel.append(el('p', 't-lead', '서버가 없는 시험판이라 쪽지판이 비어 있어요.')); return; }
  let view = opts.view;
  const today = el('p', 't-lead');
  const list = el('div', 'v-notes');
  const draw = () => {
    today.textContent = view ? `오늘 이 마을에 ${view.today}명이 들렀어요.` : '';
    list.replaceChildren(...(view?.notes.length ? view.notes.map(n => noteView(n, opts)) : [el('p', 't-small', view ? '아직 쪽지가 없어요. 첫 쪽지를 붙여 보세요.' : '지금은 쪽지를 불러오지 못했어요.')]));
  };
  const form = el('form', 'v-write');
  const input = el('input', 'g-input'); input.maxLength = NOTE_MAX; input.placeholder = `지나가는 주민에게 한 줄 (${NOTE_MAX}자까지)`; input.enterKeyHint = 'send';
  const send = el('button', 'g-primary', '붙이기'); send.type = 'submit';
  const result = el('p', 't-small'); result.setAttribute('role', 'status');
  form.append(input, el('p', 't-small', `${opts.myName ? josa(`「${opts.myName}」`, '으로', '로') : '이름 없이'} 붙어요 · 답글은 없고 「나도」만 있어요 · 링크·연락처는 못 남겨요`), send, result);
  form.onsubmit = async event => {
    event.preventDefault();
    const checked = checkNote(input.value);
    if (!checked.ok) { result.textContent = NOTE_WHY[checked.why]; return; }
    const wait = loadMarks().lastAt + NOTE_GAP_MS - Date.now();
    if (wait > 0) { result.textContent = `쪽지는 10분에 하나씩 붙일 수 있어요. ${Math.ceil(wait / 60000)}분 뒤에 다시 해 주세요.`; return; }
    send.disabled = true; result.textContent = '붙이는 중…';
    const made = await opts.post(checked.text);
    send.disabled = false;
    if (!made) { result.textContent = '지금은 붙일 수 없어요. 조금 뒤에 다시 해 주세요(하루에 세 장까지예요).'; return; }
    const marks = loadMarks(); marks.mine = [...marks.mine, made.note.id]; marks.lastAt = Date.now(); saveMarks(marks);
    input.value = ''; result.textContent = '붙였어요. 광장을 지나는 사람들이 읽어요.';
    view = made.view; draw();
  };
  panel.append(today, form, list);
  draw();
  void opts.refresh().then(fresh => { if (fresh) { view = fresh; draw(); } });
}

/** 광장에서 쪽지 든 주민 곁에 서면 아래에 뜨는 카드. 멀어지면 장면이 hide 를 부른다. */
export function noteCard(shell: HTMLElement, on: NoteActions) {
  const card = el('section', 'v-card'); card.hidden = true; card.setAttribute('aria-live', 'polite');
  shell.append(card);
  let showing: string | undefined;
  return {
    show(note: PublicNote) {
      if (showing === note.id) return;
      showing = note.id;
      card.replaceChildren(el('p', 'v-card-title', '지나가던 주민의 쪽지'), noteView(note, on));
      card.hidden = false;
    },
    hide() { showing = undefined; card.hidden = true; },
  };
}
