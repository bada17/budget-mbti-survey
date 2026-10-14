/*
  마을 건물 안 판(기획 4차, 2026-10-14) — 버스 정류장·상담소·독상·나라살림 창고·쪽지판·시민행동 집. 주민센터는 town.ts 의 openTown.
  사용자(5ⓐ) 「주민이 한마디 하고, 그 사이트의 최신 것 하나를 보여 주고, 들어가기 링크」. 자료는 각 사이트가 이미 내놓은 것을 읽어 오기만 한다 —
  상담소 첫 화면에 담긴 글 목록(#pb-post-data)·자주 묻는 문답, 독상 data/campaigns.json·awards.json, 지방재정은 구워 둔 data/local-finance.json.
  못 불러오면 링크만 남는다 — 남의 사이트가 바뀌어도 마을은 멈추지 않게.
  쪽지판·쪽지 카드 — 사용자 「커뮤니티 기능보다는 혼자가 아니다는 느낌」: 답글 없이 한 줄, 「나도」·「신고」 만.
  모양은 town.css(꾸미기는 GPT, 클래스 이름은 지킴).
*/
import { panelShell, avatar, el, btn } from './town';
import { DONATE_URL, typeOut } from './ui';
import { PLACES, NOTE_MAX, NOTE_WHY, NOTE_GAP_MS, COIN_DAY_MAX, WORKS, checkNote, worksAt, type PlaceId } from './village';
import { SCENES, FLOWS, VAULTS, kindOf, splitTax, type Vault } from './taxes';
import { toLook, lookFrom, nameFrom } from './look';
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

/** 건물마다 같은 머리 — 이름, 문 앞 주민(마을 장면의 그 주민과 같은 생김새)이 말 상자로 한마디(이름표 + 한 자씩). */
/**
 * 오늘의 부탁(quests.ts)과 잇는 고리 — main 이 채운다. line = 이 건물 주민의 오늘 부탁(없으면 undefined), fire = 「이걸 해냈다」 알리기.
 * places.ts 는 부탁 규칙을 모르고 일만 알린다(세금 도감 장면을 눌렀다, 동네 금고를 골랐다 …).
 */
export const questHook: { line(id: PlaceId): string | undefined; fire(event: string): void } = { line: () => undefined, fire: () => {} };

function placePanel(shell: HTMLElement, id: PlaceId, onClose: () => void) {
  const place = PLACES.find(p => p.id === id)!;
  const { panel, close } = panelShell(shell, onClose, '마을로');
  const ask = questHook.line(id), line = ask ?? place.line;
  const npc = el('div', ask ? 'v-npc v-ask' : 'v-npc'), said = el('p', 'v-said');
  npc.append(avatar(lookFrom(`npc:${id}`)), el('span', 'g-name', nameFrom(`npc:${id}`)), said);
  npc.onclick = () => typeOut(said, line); // 다시 누르면 한 번 더 말한다
  panel.append(el('h2', '', place.name), npc);
  typeOut(said, line);
  return { panel, close };
}
/** 출처·기준 — 접어 둔다(사용자 10-14). */
const source = (text: string) => { const d = el('details', 't-source'); d.append(el('summary', '', '출처'), el('p', '', text)); return d; };

// ───────────────────────── 버스 정류장 — 한 바퀴 다시 ─────────────────────────
export function openBus(shell: HTMLElement, neighbor: Neighbor | undefined, walk: () => void, onClose: () => void) {
  const { panel } = placePanel(shell, 'bus', onClose);
  panel.append(
    el('p', 't-lead', '「동네 한 바퀴」 열다섯 동네를 다시 걸어요. 지난번과 다르게 골라도 괜찮아요.'),
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
  panel.append(body, status, link('상담소 들어가기', out(PB_URL)));
  void fetchText(PB_URL).then(html => {
    const found = html ? readCounsel(html) : undefined;
    if (!found || (!found.qa && !found.posts.length)) { status.textContent = '지금은 소식을 불러오지 못했어요. 상담소에서 바로 볼 수 있어요.'; return; }
    status.remove();
    if (found.qa) {
      const qa = el('div', 'v-qa');
      qa.append(el('p', 'v-q', found.qa.q), el('p', 'v-a', found.qa.a));
      body.append(qa);
    }
    if (found.posts.length) {
      const list = el('ul', 'v-list');
      for (const post of found.posts) {
        const item = el('li'), a = link(post.title, out(PB_URL, `post-${post.id}`), 'v-item');
        a.append(el('small', '', `${post.by} · ${post.date}`));
        item.append(a); list.append(item);
      }
      body.append(list);
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
  panel.append(body, status, link('밑 빠진 독상 보러 가기', out(DOK_URL)));
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
      body.append(items);
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
/** 시·도 → 시·군·구 고르기(창고·금고가 같이 쓴다). 시·도를 바꾸면 onSido, 곳을 고르면 onPick. */
function regionPicker(all: FinancePlace[], region: Region | undefined, onPick: (place: FinancePlace) => void, onSido: () => void) {
  const sidos = el('div', 't-regions'), towns = el('div', 't-regions');
  const showSido = (sido: Region) => {
    sidos.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === sido));
    towns.replaceChildren(...all.filter(p => p.s === sido).map(p => {
      const b = btn('t-chip', p.n, () => { towns.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); onPick(p); });
      b.dataset.c = p.c; return b;
    }));
    onSido();
  };
  sidos.append(...REGIONS.map(sido => btn('t-chip', sido, () => showSido(sido))));
  if (region) showSido(region);
  return [sidos, towns];
}
/** 「서울 마포구」 / 「서울」 — 카드 머리에. */
const placeTitle = (place: FinancePlace) => (place.n.endsWith('(시·도)') ? place.s : `${place.s} ${place.n}`);

export function openFinance(shell: HTMLElement, region: Region | undefined, onClose: () => void) {
  const { panel } = placePanel(shell, 'finance', onClose);
  const status = el('p', 't-small', '불러오는 중…');
  const card = el('div');
  panel.append(card, status);
  void import('./data/local-finance.json').then(({ default: data }) => {
    status.remove();
    const all = data.places as FinancePlace[];
    const showTown = (place: FinancePlace) => {
      questHook.fire('finance:pick');
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
      card.replaceChildren(box, link('지방재정 감시 사이트에서 더 보기', out(FINANCE_URL, place.c)),
        source('지방재정365(2026년 당초 예산). 한 사람 몫과 스스로 거두는 돈은 일반회계 기준이에요.'));
      // 칩 목록이 길어 카드가 화면 밖에 생긴다 — 판만 내린다(scrollIntoView 는 게임 화면까지 밀어 숨겨 둔 판이 삐져나왔다).
      panel.scrollTo({ top: card.offsetTop - 12, behavior: 'smooth' });
    };
    card.before(...regionPicker(all, region, showTown, () => card.replaceChildren()));
  }, () => { status.textContent = '자료를 불러오지 못했어요.'; });
}

// ───────────────────────── 세금 보는 곳 — 세금 도감 · 우리 동네 금고 ─────────────────────────
const vaultChip = (vault: Vault, extra = '', name = VAULTS[vault].name) => {
  const chip = el('span', 'x-vault', `${name} 금고${extra}`);
  chip.style.setProperty('--c', VAULTS[vault].color);
  return chip;
};
/** 몫만큼 칸을 나란히 — 칸마다 색. */
function stack(parts: { share: number; color: string; label: string }[]) {
  const bar = el('div', 'x-stack');
  for (const part of parts) {
    const seg = el('i'); seg.style.flex = `${Math.max(part.share, 0.4)} 0 0`; seg.style.background = part.color; seg.title = `${part.label} ${part.share}%`;
    bar.append(seg);
  }
  bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', parts.map(p => `${p.label} ${p.share}%`).join(', '));
  return bar;
}

/**
 * 세금 보는 곳(사용자 10-14) — 갈래 둘. ① 세금 도감: 생활 장면을 누르면 붙는 세금과 들어가는 금고, 아래엔 나라·시·도 금고에서 다시 내려오는 길.
 * ② 우리 동네 금고: 곳을 고르면 그 금고가 무엇으로 채워지는지(2026 예산)와, 그 동네에서 걷힌 지방세가 어느 금고로 갔는지(2024).
 * 금액은 묻지 않는다. 자료(140KB)는 ② 를 처음 열 때 불러온다.
 */
export function openTax(shell: HTMLElement, region: Region | undefined, onClose: () => void) {
  const { panel } = placePanel(shell, 'tax', onClose);
  const tabs = el('div', 't-tabs'); tabs.setAttribute('role', 'tablist');
  const book = el('div', 't-pane'), vault = el('div', 't-pane');
  let loaded = false;
  const show = (i: number) => {
    [book, vault].forEach((pane, j) => { pane.hidden = i !== j; tabs.children[j].classList.toggle('on', i === j); tabs.children[j].setAttribute('aria-selected', String(i === j)); });
    if (i === 1 && !loaded) { loaded = true; fillVault(vault, region); }
  };
  ['세금 도감', '우리 동네 금고'].forEach((label, i) => { const b = btn('t-tab', label, () => show(i)); b.setAttribute('role', 'tab'); tabs.append(b); });
  panel.append(tabs, book, vault);

  // ① 세금 도감 — 장면 타일(넷씩 두 줄), 고른 장면의 세금, 다시 내려오는 길
  const grid = el('div', 'x-scenes'), detail = el('div', 'x-detail');
  const pick = (i: number) => {
    grid.querySelectorAll('button').forEach((b, j) => { b.classList.toggle('on', i === j); b.setAttribute('aria-pressed', String(i === j)); });
    const scene = SCENES[i];
    detail.replaceChildren(el('h3', '', `${scene.icon} ${scene.title}`), ...scene.taxes.map(tax => {
      const row = el('div', 'x-tax');
      const to = el('div', 'x-to');
      for (const { vault: v, share, note } of tax.to) {
        const line = el('p', 'x-flow');
        line.append(el('span', 'x-arrow', '→'), vaultChip(v, share ? ` ${share}` : ''), ...(note ? [el('small', '', note)] : []));
        to.append(line);
      }
      row.append(el('b', '', tax.name), el('p', 'x-line', tax.line), to);
      return row;
    }));
  };
  grid.append(...SCENES.map((scene, i) => { const b = btn('x-scene', '', () => { pick(i); questHook.fire(`tax:${scene.id}`); }); b.append(el('span', 'x-icon', scene.icon), el('span', '', scene.title)); return b; }));
  const flows = el('ul', 'x-flows');
  for (const flow of FLOWS) {
    const li = el('li'), head = el('p', 'x-flow');
    head.append(vaultChip(flow.from), el('span', 'x-arrow', '→'), ...flow.to.map(v => vaultChip(v)));
    li.append(el('b', '', flow.name), head, el('p', 'x-line', flow.line));
    flows.append(li);
  }
  book.append(grid, detail, el('h3', 'x-h', '나라·시·도 금고에서 다시 내려와요'), flows,
    source('지방세기본법 제8·9·11조의2, 지방세법(부가가치세의 25.3%·담배소비세 1,007원 등), 지방교부세법 제4조, 지방교육재정교부금법 제3조. 특별·광역시와 도는 시·군·구 몫이 달라요 — 세종·제주는 한 금고로 모여요.'));
  pick(0);
  show(0);
}

type RevenuePlace = { f: [string, number, number][]; t?: [string, number, number][] };
/** 억 원 → 「1,844억 원」·「1.2조 원」 */
const eokWon = (eok: number) => (eok >= 10000 ? `${(Math.round(eok / 1000) / 10).toLocaleString('ko-KR')}조 원` : `${Math.round(eok).toLocaleString('ko-KR')}억 원`);

function fillVault(pane: HTMLElement, region: Region | undefined) {
  const status = el('p', 't-small', '불러오는 중…'), card = el('div');
  pane.append(card, status);
  void Promise.all([import('./data/local-finance.json'), import('./data/local-revenue.json')]).then(([{ default: finance }, { default: revenue }]) => {
    status.remove();
    const all = finance.places as FinancePlace[], data = revenue.places as unknown as Record<string, RevenuePlace>; // JSON 이라 튜플 모양을 못 읽는다
    const showPlace = (place: FinancePlace) => {
      questHook.fire('vault:pick');
      const rev = data[place.c];
      if (!rev) { card.replaceChildren(el('p', 't-small', '이 곳 자료는 아직 없어요.')); return; }
      const total = rev.f.reduce((a, [, eok]) => a + eok, 0);
      const fund = el('div', 't-bigcard');
      const list = el('ul', 'x-kinds');
      for (const [name, eok, share] of rev.f) {
        const kind = kindOf(name), li = el('li'), dot = el('i');
        dot.style.background = kind.color;
        li.append(dot, el('b', '', kind.label), el('span', 'x-num', `${eokWon(eok)} · ${share}%`), ...(kind.from ? [el('small', '', kind.from)] : []));
        list.append(li);
      }
      fund.append(el('p', 't-small', `${placeTitle(place)} 금고, ${revenue.fy}년에 채울 돈`), el('p', 't-big', eokWon(total)),
        stack(rev.f.map(([name, , share]) => ({ share, color: kindOf(name).color, label: kindOf(name).label }))), list);
      const parts: Node[] = [fund];
      if (rev.t) {
        const rows = rev.t.map(([row, eok, share]) => ({ ...splitTax(row, place.n), eok, share }));
        const own = rows.filter(r => r.own), up = rows.filter(r => !r.own);
        const sum = (list: typeof rows) => list.reduce((a, r) => a + r.eok, 0);
        const ownShare = Math.round(own.reduce((a, r) => a + r.share, 0));
        const upper: Vault = 'sido', mine: Vault = 'sigungu';
        const taxes = el('div', 't-bigcard');
        const items = el('ul', 'x-kinds');
        for (const r of rows) {
          const li = el('li'), dot = el('i');
          dot.style.background = VAULTS[r.own ? mine : upper].color;
          li.append(dot, el('b', '', r.name), el('span', 'x-num', `${eokWon(r.eok)} · ${r.share}%`));
          items.append(li);
        }
        taxes.append(el('p', 't-small', `${revenue.ty}년 ${place.n}에서 걷힌 지방세`), el('p', 't-big', eokWon(sum(rows))),
          stack([{ share: ownShare, color: VAULTS[mine].color, label: `${place.n} 금고` }, { share: 100 - ownShare, color: VAULTS[upper].color, label: `${place.s} 금고` }]),
          (() => { const legend = el('p', 'x-flow'); legend.append(vaultChip(mine, ` ${ownShare}%`, place.n), vaultChip(upper, ` ${100 - ownShare}%`, place.s)); return legend; })(),
          items,
          el('p', 't-small', `${place.s} 금고로 간 것도 조정교부금·보조금이 되어 일부가 다시 ${place.n}에 내려와요.`));
        parts.push(taxes);
      } else if (!place.n.endsWith('(시·도)')) parts.push(el('p', 't-small', '이 곳은 세목별로 걷힌 자료가 없어요.'));
      card.replaceChildren(...parts, source(revenue._출처));
      pane.closest('.t-panel')?.scrollTo({ top: card.offsetTop - 12, behavior: 'smooth' });
    };
    card.before(...regionPicker(all, region, showPlace, () => card.replaceChildren()));
  }, () => { status.textContent = '자료를 불러오지 못했어요.'; });
}

// ───────────────────────── 시민행동 집 ─────────────────────────
export function openHouse(shell: HTMLElement, onClose: () => void) {
  const { panel } = placePanel(shell, 'house', onClose);
  panel.append(
    el('p', 't-lead', '함께하는 시민행동은 「동네 한 바퀴」와 이 마을을 만든 시민단체예요. 예산 감시, 밑 빠진 독상, 시민참여 상담소를 꾸려 가요.'),
    link('회원 되기 — 정기후원', `${DONATE_URL}&utm_content=village-house`),
    link('홈페이지 가 보기', out(HOME_URL), 'g-link'),
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
/** 내가 붙인 쪽지 — 광장을 다시 그리기 **전에** 적어야 내 모습을 한 주민이 하나 더 서지 않는다(main.ts 의 post). */
export function rememberMine(id: string, now = Date.now()) { const marks = loadMarks(); marks.mine = [...marks.mine, id].slice(-200); marks.lastAt = now; saveMarks(marks); }

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
  form.append(input, send, result);
  input.title = `${opts.myName ? josa(`「${opts.myName}」`, '으로', '로') : '이름 없이'} 붙어요. 링크·연락처는 못 남겨요.`;
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
      card.replaceChildren(noteView(note, on));
      card.hidden = false;
    },
    hide() { showing = undefined; card.hidden = true; },
  };
}

// ───────────────────────── 주머니·마을 공사터(동물의 숲 ⓑⓕ) ─────────────────────────
/**
 * 주머니 — 이 기기에만. taken = 오늘 주운 나무(날이 바뀌면 비운다), given = 공사터에 넣은 동전(서버 없는 시험판은 이 수로 공사를 채운다).
 */
export type Pocket = {
  day: number; taken: number[]; coins: number; fruits: number; given: number; /** 공사터를 알려 줬나(첫 동전에 한 번) */ told: boolean;
  /** 오늘 해낸 부탁(quests.ts)과 모으는 중인 수 — 날이 바뀌면 비운다. */ quests: string[]; progress: Record<string, number>;
};
const POCKET_KEY = 'budget-game-pocket';
export function loadPocket(day: number): Pocket {
  try {
    const raw = JSON.parse(localStorage.getItem(POCKET_KEY) ?? 'null');
    const num = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
    const sameDay = raw?.day === day;
    const progress: Record<string, number> = {};
    if (sameDay && raw.progress && typeof raw.progress === 'object') for (const [k, v] of Object.entries(raw.progress)) if (Number.isInteger(v)) progress[k] = v as number;
    return {
      day, taken: sameDay && Array.isArray(raw.taken) ? raw.taken.filter(Number.isInteger).slice(0, 200) : [], coins: num(raw?.coins), fruits: num(raw?.fruits), given: num(raw?.given), told: raw?.told === true,
      quests: sameDay && Array.isArray(raw.quests) ? raw.quests.filter((x: unknown) => typeof x === 'string').slice(0, 20) : [], progress,
    };
  } catch { return { day, taken: [], coins: 0, fruits: 0, given: 0, told: false, quests: [], progress: {} }; }
}
export const savePocket = (pocket: Pocket) => { try { localStorage.setItem(POCKET_KEY, JSON.stringify(pocket)); } catch { /* 막힌 창 */ } };

export type WorksOpts = {
  /** 모두가 넣은 동전(서버 없으면 내가 넣은 것만). */
  total: number;
  pocket: Pocket;
  online: boolean;
  /** 넣기 — 서버가 받은 수와 새 합계. 못 넣었으면 undefined(하루 한도 등). */
  give(n: number): Promise<{ took: number; total: number } | undefined>;
  toTax(): void;
};

/** 마을 공사터 — 지금 공사·모인 동전·다 지은 것, 내 주머니 동전 넣기, 그리고 진짜 마을의 세금과 잇는 한마디. */
export function openWorks(shell: HTMLElement, opts: WorksOpts, onClose: () => void) {
  const { panel, close } = placePanel(shell, 'works', onClose);
  const card = el('div', 't-bigcard'), status = el('p', 't-small'); status.setAttribute('role', 'status');
  const give = btn('g-primary', '', async () => {
    const n = Math.min(opts.pocket.coins, COIN_DAY_MAX);
    if (!n) return;
    give.disabled = true; status.textContent = '넣는 중…';
    const done = await opts.give(n);
    if (!done) { status.textContent = `동전은 하루에 ${COIN_DAY_MAX}개까지 넣을 수 있어요. 내일 또 와요.`; draw(); return; }
    opts.total = done.total;
    status.textContent = `동전 ${done.took}개를 넣었어요.`;
    draw();
  });
  const draw = () => {
    const state = worksAt(opts.total);
    const parts: Node[] = [];
    if (state.now) {
      const k = Math.min(100, Math.round((state.now.have / state.now.goal) * 100));
      const bar = el('div', 'x-stack'), fill = el('i'), rest = el('i');
      fill.style.cssText = `flex:${k} 0 0;background:#f2c661`; rest.style.cssText = `flex:${100 - k} 0 0;background:#efe2c9`;
      bar.append(fill, rest); bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', `${k}% 모임`);
      parts.push(el('p', 't-small', '공사 중'), el('p', 't-big', state.now.name), bar, el('p', 't-small', `동전 ${state.now.have} / ${state.now.goal}${opts.online ? ' · 다녀간 사람 모두가 모은 것' : ' · 시험판이라 내가 넣은 것만'}`));
    } else parts.push(el('p', 't-big', '공사 다 끝!'), el('p', 't-small', '다음 공사를 준비하고 있어요.'));
    if (state.done.length) {
      const built = el('p', 'x-flow');
      built.append(el('span', 't-small', '다 지은 것 '), ...state.done.map(id => el('span', 'x-built', WORKS.find(w => w.id === id)!.name)));
      parts.push(built);
    }
    card.replaceChildren(...parts);
    give.textContent = opts.pocket.coins ? `내 동전 ${opts.pocket.coins}개 넣기` : '주머니에 동전이 없어요';
    give.disabled = !opts.pocket.coins || !state.now;
  };
  const real = el('div', 'v-qa');
  real.append(el('p', 'v-q', '진짜 마을도 이렇게 지어요'), el('p', 'v-a', '주민이 낸 세금이 금고에 모여 길·다리·쉼터가 돼요. 어떤 세금이 어느 금고로 가는지 「세금 보는 곳」 에서 볼 수 있어요.'));
  panel.append(card, give, status, el('p', 't-small x-hint', '나무 밑동에 부딪혀 보세요. 날마다 몇 그루에서 동전이 떨어져요.'), real, btn('g-ghost', '세금 보는 곳에 가 보기', () => { close(); opts.toTax(); }));
  draw();
}
