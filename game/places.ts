/*
  마을 건물 안 판(기획 4차, 2026-10-14) — 버스 정류장·상담소·독상·나라살림 창고·쪽지판·시민행동 집. 주민센터는 town.ts 의 openTown.
  사용자(5ⓐ) 「주민이 한마디 하고, 그 사이트의 최신 것 하나를 보여 주고, 들어가기 링크」. 자료는 각 사이트가 이미 내놓은 것을 읽어 오기만 한다 —
  상담소 첫 화면에 담긴 글 목록(#pb-post-data)·오간 질문, 독상 data/campaigns.json·awards.json, 지방재정은 우리 동네 페이지를 그대로 띄운다(townFrame).
  상담소·독상은 사이트처럼 그 사본을 먼저 펴고, 두 사이트가 읽는 구글 시트 접수처의 최신 것이 오면 갈아 끼운다(사용자 10-15 「새 업데이트가 되어도 잘 연계되게」) —
  그래서 시트에 새 글·새 사업을 올리면 그쪽 사이트를 다시 굽지 않아도 마을에 뜬다.
  못 불러오면 링크만 남는다 — 남의 사이트가 바뀌어도 마을은 멈추지 않게.
  쪽지판·쪽지 카드 — 사용자 「커뮤니티 기능보다는 혼자가 아니다는 느낌」: 답글 없이 한 줄, 「나도」·「신고」 만.
  모양은 town.css(꾸미기는 GPT, 클래스 이름은 지킴).
*/
import { panelShell, avatar, el, btn, placeChooser, loadPlaces, placeTitle, loginInvite, noteForm, type LoginOpts } from './town';
import { DONATE_URL, typeOut, shareButtons } from './ui';
import { PLACES, keeperName, placeName, COIN_DAY_MAX, WORKS, worksAt, type PlaceId } from './village';
import { toLook, lookFrom, REWARDS, fullPick, type Pick } from './look';
import { josa, loadRegion, touched, POCKET_KEY, type Neighbor } from './profile';
import { PRIVACY_URL, CONTACT } from './contact';
import type { PublicNote, VillageView, PublicCard, CardKind } from './api';
import { gameStorage, isInspectionMode } from './storage';

const PB_URL = 'https://pb.action.or.kr/';
const DOK_URL = 'https://dok.action.or.kr/';
/**
 * 두 사이트가 읽는 구글 시트 접수처(앱스 스크립트) — 상담소 pb.html 의 EP, 독상 index.html 의 DOK_SHEET_ENDPOINT 와 같은 주소.
 * 그쪽이 접수처를 새로 배포해 주소가 바뀌면 여기도 바꾼다 — 안 바꿔도 멈추지 않고 사본(구워 둔 것)만 읽는다.
 */
const PB_SHEET = 'https://script.google.com/macros/s/AKfycbwq7mMwn0lgthl-aIj7UaDtR-yW1xSaF_ZBOK2Fj21DrEOIvakBXM9LzNiOYLCivwuZ/exec';
const DOK_SHEET = 'https://script.google.com/macros/s/AKfycbxI7UMptIhxwMR7mPtqP72EDQ1z871zJNhBcJeaVBeP5KdIcDhCT4_3CpGSnxPMYgE8hg/exec';
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
const fetchJson = async <T>(url: string, ms?: number) => { const text = await fetchText(url, ms); try { return text ? JSON.parse(text) as T : undefined; } catch { return undefined; } };

/** 건물마다 같은 머리 — 이름, 문 앞 주민(마을 장면의 그 주민과 같은 생김새)이 말 상자로 한마디(이름표 + 한 자씩). 오락실(arcade.ts)도 쓴다. */
export function placePanel(shell: HTMLElement, id: PlaceId, onClose: () => void) {
  const place = PLACES.find(p => p.id === id)!;
  const { panel, close } = panelShell(shell, onClose, '마을로');
  const line = place.line;
  const npc = el('div', 'v-npc'), said = el('p', 'v-said');
  npc.append(avatar(lookFrom(`npc:${id}`)), el('span', 'g-name', keeperName(id)), said);
  npc.onclick = () => typeOut(said, line); // 다시 누르면 한 번 더 말한다
  panel.append(el('h2', '', place.name), npc);
  typeOut(said, line);
  return { panel, close };
}

// ───────────────────────── 버스 정류장 — 한 바퀴 다시 ─────────────────────────
export function openBus(shell: HTMLElement, neighbor: Neighbor | undefined, walk: () => void, onClose: () => void) {
  const { panel } = placePanel(shell, 'bus', onClose);
  panel.append(
    el('p', 't-lead', '열다섯 동네를 다시 걸어요. 지난번과 다르게 골라도 괜찮아요.'),
    btn('g-primary', '한 바퀴 걷기', walk),
  );
}

// ───────────────────────── 시민참여 상담소 ─────────────────────────
type Post = { id: string; title: string; by?: string; date?: string };
type Qa = { q: string; a: string; by?: string };

/**
 * 상담소 첫 화면(HTML)에 구워 둔 사본 — 전문위원의 글(#pb-post-data 의 items)과 오간 질문(구운 qa, 없으면 마크업의 씨앗 문답 #pb-qa).
 * 상담소도 이 사본을 먼저 펴고 시트 것이 오면 갈아 끼운다(pb.html) — 마을도 같은 순서(openCounsel).
 */
function readCounsel(html: string): { posts: Post[]; qas: Qa[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let data: { items?: Post[]; qa?: Qa[] } = {};
  try { data = JSON.parse(doc.querySelector('#pb-post-data')?.textContent ?? '{}'); } catch { /* 모양이 바뀌었으면 글은 건너뛴다 */ }
  const seeds = [...doc.querySelectorAll('#pb-qa details')].map(d => ({
    q: d.querySelector('summary > span:not(.mark):not(.tail)')?.textContent?.trim() ?? '',
    a: d.querySelector('.ans .body')?.textContent?.trim() ?? '',
  }));
  return { posts: data.items ?? [], qas: data.qa?.length ? data.qa : seeds };
}
/** 칸 하나 — 제목·한 줄을 달아 「오간 질문」 과 「전문위원의 글」 이 섞여 보이지 않게(사용자 10-15 「함께 있으니 헷갈려」). 칸 이름은 상담소 화면 그대로. */
const section = (title: string, sub: string, ...children: Node[]) => {
  const box = el('section', 'v-sec'); box.append(el('h3', 'v-head', title), el('p', 't-small', sub), ...children); return box;
};

/**
 * 마을에서 바로 묻기(사용자 10-19 ⓐ) — 상담소 질문 폼(pb.html #pb-ask)과 같은 접수처·같은 칸 이름으로 보낸다 → 시트 「질문」 탭·알림 메일.
 * ⚠️ 같이 고칠 자리: 칸 이름·주제 값·동의 문구는 participatory-budget 의 pb.html #pb-ask 와 intake/Code.gs SHEETS['pb-ask'] 를 따른다. 그쪽이 바뀌면 여기도.
 * text/plain 으로 보낸다 — application/json 이면 브라우저가 사전 요청을 보내는데 앱스 스크립트가 답하지 않아 막힌다(상담소 build.py setupIntake 와 같다).
 */
function askForm() {
  const form = el('form', 'g-contact v-ask');
  form.hidden = true;
  form.innerHTML = `<h3>전문위원에게 묻기</h3>
    <div class="g-radio" role="group" aria-label="무엇에 대해 묻나요">
      <label><input type="radio" name="pb-topic" value="budget" checked> 참여예산</label>
      <label><input type="radio" name="pb-topic" value="jachi"> 주민자치회</label>
      <label><input type="radio" name="pb-topic" value="policy"> 시민참여정책</label></div>
    <textarea class="g-input" name="pb-q" rows="4" required aria-label="궁금한 것" placeholder="궁금한 것을 편하게 적어 주세요. 짧아도 괜찮습니다."></textarea>
    <input class="g-input" name="pb-name" autocomplete="name" aria-label="이름" placeholder="이름">
    <input class="g-input" name="pb-mail" type="email" autocomplete="email" aria-label="답이 올라오면 알려 드릴 이메일" placeholder="답 올라오면 알려 드릴 이메일">
    <input class="g-trap" name="pb-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label class="g-check"><input type="checkbox" name="pb-agree" required> <span>개인정보 수집·이용에 동의합니다 <b>(필수)</b></span></label>
    <details><summary>개인정보 수집·이용 동의 내용</summary><p>
      <b>이름 · 이메일</b>을 받아 답변과 알림에만 쓰고 <b>5년</b> 뒤 지웁니다.
      동의하지 않아도 되지만, 그러면 답을 보내 드릴 길이 없습니다.<br>
      <b>누가 읽나</b> <b>함께하는 시민행동</b> 시민참여정책위원회 전문위원이 읽고 답합니다.<br>
      <b>답</b> 상담소 '오간 질문'에 올라갑니다 — 보통 5일 안입니다.
      올라오면 알려 드립니다. 질문 내용만 올라가고 이름·연락처는 화면에 올리지 않습니다.<br>
      <b>보유기간</b> 수집일로부터 5년
      (소식 받기에 동의하신 경우, 수신을 그만두실 때까지)<br>
      <b>보관</b> 받은 내용은 구글 스프레드시트(Google LLC)에 저장합니다.
      처리 주체는 <b>함께하는 시민행동</b>, 개인정보관리책임자는 정남진 사무처장입니다.
      자세한 것은 <a href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보처리방침</a>에 있습니다.</p></details>
    <label class="g-check"><input type="checkbox" name="pb-news"> <span>함께하는 시민행동 소식도 받겠습니다 (선택)</span></label>
    <button class="g-primary" type="submit">질문 보내기</button>
    <p class="g-small g-result" role="status"></p>`;
  const go = form.querySelector<HTMLButtonElement>('[type=submit]')!, said = form.querySelector('.g-result')!;
  form.onsubmit = async event => {
    event.preventDefault();
    if (isInspectionMode()) { said.textContent = '점검용으로 확인했어요. 실제 상담소에는 접수하지 않았어요.'; return; }
    const data = new FormData(form);
    // 체크 칸은 켜짐/꺼짐으로 — FormData 는 켠 것만 'on' 으로 담아, 끈 것이 아예 빠진다(받는 쪽은 === true 로 본다).
    const body = { ...Object.fromEntries(data), form: 'pb-ask', 'pb-agree': data.has('pb-agree'), 'pb-news': data.has('pb-news') };
    go.disabled = true; said.textContent = '보내는 중…';
    const ok = await fetch(PB_SHEET, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(r => r.json()).then((r: { ok?: boolean }) => r.ok === true, () => false);
    go.disabled = false;
    said.textContent = ok ? '보냈어요. 답이 상담소 「오간 질문」에 올라오면 알려 드릴게요.' : '보내지 못했어요. 잠시 뒤 다시 하시거나 action@action.or.kr 로 보내 주세요.';
    if (ok) form.reset();
  };
  const open = btn('g-primary', '전문위원에게 질문하기', () => { open.remove(); form.hidden = false; form.querySelector('textarea')!.focus(); });
  return [open, form];
}

export function openCounsel(shell: HTMLElement, onClose: () => void) {
  const { panel } = placePanel(shell, 'counsel', onClose);
  const status = el('p', 't-small', '상담소 소식을 불러오는 중…'); status.setAttribute('role', 'status');
  const body = el('div');
  panel.append(...askForm(), body, status, link('상담소 들어가기', out(PB_URL)));
  let posts: Post[] = [], qas: Qa[] = [];
  const pick = Math.random(); // 문답은 하나만 — 시트 것으로 갈아 끼워도 같은 자리를 고른다
  const paint = () => {
    const ready = qas.filter(x => x.q && x.a), qa = ready[Math.floor(pick * ready.length)];
    const shown = posts.filter(p => p.id && p.title); // 다(10-20 사용자 「전체가 4개인데 왜 3개만」 — 처음 만들 때 셋으로 자른 까닭은 없었다)
    if (!qa && !shown.length) return;
    status.remove();
    body.replaceChildren();
    if (qa) {
      const box = el('div', 'v-qa');
      box.append(el('p', 'v-q', qa.q), el('p', 'v-a', qa.a));
      if (qa.by) box.append(el('p', 'v-by', `${qa.by} 전문위원`));
      body.append(section('오간 질문', '상담소에 들어온 질문과 그 답이에요.', box));
    }
    if (shown.length) {
      const list = el('ul', 'v-list');
      for (const post of shown) {
        const item = el('li'), a = link(post.title, out(PB_URL, `post-${post.id}`), 'v-item');
        a.append(el('small', '', [post.by, post.date].filter(Boolean).join(' · ')));
        item.append(a); list.append(item);
      }
      body.append(section('전문위원의 글', '참여예산 전문위원이 쓴 글이에요. 누르면 상담소에서 읽어요.', list));
    }
  };
  // 사본(상담소 첫 화면) 먼저, 시트(상담소가 읽는 그 접수처)가 오면 갈아 끼운다 — 시트에 새 글을 올리면 상담소를 다시 굽지 않아도 마을에 뜬다.
  // 못 받거나 0건이면 사본 그대로(상담소도 같다 — 시트에 「올림」 문답이 아직 없어 지금은 씨앗 문답이 보인다).
  const sheet = <T>(what: string) => fetchJson<{ ok?: boolean; items?: T[] }>(`${PB_SHEET}?what=${what}`, 12000).then(r => (r?.ok && r.items?.length ? r.items : undefined));
  const copy = fetchText(PB_URL).then(html => { if (html) ({ posts, qas } = readCounsel(html)); paint(); });
  void Promise.all([copy, sheet<Post>('posts'), sheet<Qa>('qa')]).then(([, livePosts, liveQas]) => {
    if (livePosts) posts = livePosts;
    if (liveQas) qas = liveQas;
    paint();
    if (!posts.length && !qas.length) status.textContent = '지금은 소식을 불러오지 못했어요. 상담소에서 바로 볼 수 있어요.';
  });
}

// ───────────────────────── 밑 빠진 독상 ─────────────────────────
type Campaign = { id: string; title: string; summary?: string; status: string; period?: string };
type Award = { date: string; awardee: string; project: string };

export function openDok(shell: HTMLElement, onClose: () => void) {
  const { panel } = placePanel(shell, 'dok', onClose);
  const status = el('p', 't-small', '독상 소식을 불러오는 중…'); status.setAttribute('role', 'status');
  const body = el('div');
  const away = link('밑 빠진 독상 보러 가기', out(DOK_URL));
  panel.append(body, status, away);
  let camps: Campaign[] = [], awards: Award[] = [];
  /*
    서명 칸은 판 안 창으로(10-20 사용자 「독상 서명 칸을 게임 안 창으로」) — 독상 ?embed#join-<id> 가 서명 칸만 창을 꽉 채워 연다.
    서명 칸은 독상 한 벌(도너스 연동·동의·서명 수) — 게임은 이름·전화번호를 받지 않는다. 독상 서명 칸을 닫으면(독상이 postMessage) 목록으로.
  */
  const join = (c: Campaign) => {
    const frame = el('iframe', 't-frame');
    frame.title = `${c.title} — 이 감시에 참여하기`;
    frame.src = `${DOK_URL}?embed&${UTM}#join-${c.id}`;
    const back = () => { removeEventListener('message', onMessage); frame.remove(); backBtn.remove(); body.hidden = false; away.hidden = false; };
    const onMessage = (e: MessageEvent) => { if (e.source === frame.contentWindow && e.data?.dok === 'join-closed') back(); };
    const backBtn = btn('g-ghost', '← 사업 목록으로', back);
    addEventListener('message', onMessage);
    body.hidden = true; away.hidden = true;
    panel.append(backBtn, frame);
    panel.scrollTo({ top: 0 });
  };
  const paint = () => {
    const live = camps.filter(c => c.status === 'ongoing' && c.id && c.title);
    if (!live.length && !awards.length) return;
    status.remove();
    body.replaceChildren();
    if (awards.length) {
      const last = awards[awards.length - 1], since = awards[0].date.slice(0, 4);
      body.append(el('p', 't-lead', `${since}년부터 ${awards.length}번 상을 줬어요. 가장 최근은 ${last.date} ${last.awardee} 「${last.project}」.`));
    }
    if (live.length) {
      const items = el('ul', 'v-list');
      for (const c of live) {
        const a = link(c.title, out(DOK_URL, `camp-${c.id}`), 'v-item'); // 독상이 #camp-<id> 로 그 사업 팝업을 연다
        if (c.summary) a.append(el('span', 'v-sum', c.summary));
        if (c.period) a.append(el('small', '', c.period));
        // 서명 칸 바로 열기(10-20 사용자 「서명은 왜 바로 안되게」) — 위 join 이 판 안 창으로 독상 서명 칸을 연다.
        const li = el('li'); li.append(a, btn('g-ghost v-join', '이 감시에 참여하기', () => join(c))); items.append(li);
      }
      body.append(items);
    }
  };
  // 사업도 사본(data/campaigns.json) 먼저, 시트(독상이 읽는 접수처 ?action=campaigns — 담당자가 설문지로 올린 것)가 오면 갈아 끼운다.
  // 시트가 받아지면 0건이어도 그게 맞다(독상도 그렇게 걷는다). 못 받으면 사본 그대로. 상 목록(awards.json)은 시트가 없다.
  const copy = Promise.all([
    fetchJson<{ campaigns?: Campaign[] }>(`${DOK_URL}data/campaigns.json`).then(r => { if (r?.campaigns) camps = r.campaigns; }),
    fetchJson<{ awards?: Award[] }>(`${DOK_URL}data/awards.json`).then(r => { if (r?.awards) awards = r.awards; }),
  ]).then(paint);
  void Promise.all([copy, fetchJson<Campaign[]>(`${DOK_SHEET}?action=campaigns`, 12000)]).then(([, fromSheet]) => {
    if (Array.isArray(fromSheet)) camps = fromSheet;
    paint();
    if (!camps.length && !awards.length) status.textContent = '지금은 소식을 불러오지 못했어요. 독상 사이트에서 바로 볼 수 있어요.';
  });
}

// ───────────────────────── 나라살림 창고 — 우리 지역 한 해 살림 ─────────────────────────
export function won(n: number) {
  if (n >= 1e12) return `${(Math.round(n / 1e11) / 10).toLocaleString('ko-KR')}조 원`;
  if (n >= 1e11) return `${Math.round(n / 1e8).toLocaleString('ko-KR')}억 원`;
  if (n >= 1e8) return `${(Math.round(n / 1e7) / 10).toLocaleString('ko-KR')}억 원`;
  return `${Math.round(n / 1e4).toLocaleString('ko-KR')}만 원`;
}

/**
 * 우리 동네 페이지(local-finance site/index.html)의 한 쪽을 판 안에 띄운다 — 「오나」 들어오는 쪽(지방정부 곳간), 「쓰나」 쓰는 쪽(지방정부 예산).
 * 마을은 플랫폼 것을 그대로 보여 주는 창이다(사용자 10-19) — 숫자를 여기서 따로 굽지 않는다. ?part= 면 그 페이지가 머리·하단·다른 쪽을 감춘다.
 * 높이는 그 페이지가 postMessage 로 알려 준다(주소가 달라 직접 못 잰다). 소식이 안 오면 판 높이만큼 두고 창 안에서 내린다.
 */
function townFrame(code: string, part: '오나' | '쓰나') {
  const frame = el('iframe', 't-frame');
  frame.title = part === '오나' ? '우리 동네 돈이 어디서 오나' : '우리 동네 돈을 어디에 쓰나';
  frame.src = `${FINANCE_URL}?cd=${code}&part=${encodeURIComponent(part)}&${UTM}`;
  const onMessage = (e: MessageEvent) => {
    if (!frame.isConnected) { removeEventListener('message', onMessage); return; }
    if (e.source === frame.contentWindow && typeof e.data?.lfHeight === 'number') frame.style.height = `${Math.ceil(e.data.lfHeight)}px`;
  };
  addEventListener('message', onMessage);
  return [frame, link('우리 동네 살림 전체 보기', `${FINANCE_URL}?cd=${code}&${UTM}`, 'g-link')];
}

/** 동네를 고르면(저장한 곳이 있으면 바로 그 곳, town.ts placeChooser) 그 동네 페이지의 한 쪽을 띄운다. */
function townPane(pane: HTMLElement, part: '오나' | '쓰나') {
  const status = el('p', 't-small', '불러오는 중…'), card = el('div');
  pane.append(card, status);
  void loadPlaces().then(({ places }) => {
    status.remove();
    card.before(...placeChooser(places, place => {
      card.replaceChildren(...(place ? townFrame(place.c, part) : []));
      // 칩 목록이 길어 창이 화면 밖에 생긴다 — 판만 내린다(scrollIntoView 는 게임 화면까지 밀어 숨겨 둔 판이 삐져나왔다).
      if (place) pane.closest('.t-panel')?.scrollTo({ top: card.offsetTop - 12, behavior: 'smooth' });
    }));
  }, () => { status.textContent = '자료를 불러오지 못했어요.'; });
}

/** 지방정부 예산 — 우리 동네 페이지의 「돈을 어디에 쓰나」 쪽. */
export function openFinance(shell: HTMLElement, onClose: () => void) {
  townPane(placePanel(shell, 'finance', onClose).panel, '쓰나');
}

/**
 * 지방정부 곳간(10-26 까지 「마을 곳간」) — 우리 동네 페이지의 「돈이 어디서 오나」 쪽(townPane). 지방정부 예산(쓰나) 바로 옆 집이다.
 * 10-20 사용자 「마을 곳간에서 세금 종류 부분은 빼자」 — 세금 도감 탭(생활 장면 → 세금 → 금고, taxes.ts)을 걷었다. 되살리려면 커밋 6b9d043 의 openTax·taxes.ts.
 */
export function openTax(shell: HTMLElement, onClose: () => void) {
  townPane(placePanel(shell, 'tax', onClose).panel, '오나');
}

// ───────────────────────── 시민행동의 집 ─────────────────────────
/**
 * 시민행동의 집 — 마을의 세 건물이 다 시민행동 일이라는 걸 보여 주고, 누르면 그 문 앞으로(사용자 10-19 ⓐ, 소식·행사는 안 함).
 * 후원은 판의 첫 단추(사용자 10-19 「시민센터, 시민행동의 집을 좀 키우자」), 결제 대신 정기후원 안내(/74).
 * 맨 아래 문의하기 — 메일·전화 두 줄, 폼은 안 만든다(사용자 10-19 「웅」 — 새 개인정보를 받지 않게). 판 바닥에 붙여 가운데로(10-20, town.css .v-house).
 */
export function openHouse(shell: HTMLElement, go: (id: PlaceId) => void, onClose: () => void) {
  const { panel, close } = placePanel(shell, 'house', onClose);
  panel.classList.add('v-house');
  const ours = (['counsel', 'dok', 'finance'] as const).map(id => btn('g-ghost', placeName(id), () => { close(); go(id); }));
  const ask = el('section', 'v-sec v-ask');
  const mail = link(`메일 ${CONTACT.mail}`, `mailto:${CONTACT.mail}`, 'g-link'), tel = link(`전화 ${CONTACT.tel}`, `tel:${CONTACT.tel.replace(/-/g, '')}`, 'g-link');
  mail.removeAttribute('target'); tel.removeAttribute('target'); // 메일 앱·전화는 새 창이 아니라 그대로
  ask.append(el('h3', 'v-head', '문의하기'), mail, tel);
  panel.append(
    el('p', 't-lead', '함께하는 시민행동은 「함께해요 시민의 숲」을 만든 시민단체예요.'),
    link('정기후원 안내', `${DONATE_URL}&utm_content=village-house`),
    el('p', 't-lead', '상담소·독상·지방정부 예산, 다 시민행동이 하는 일이에요.'),
    ...ours,
    link('홈페이지 가 보기', out(HOME_URL), 'g-link'),
    ask,
  );
}

// ───────────────────────── 문제 카드 — 활동가가 올린 사업 한 건, 보는 사람이 반응 ─────────────────────────
/**
 * 사용자 10-15 「헐 진짜 문제다, 저런 식으로 하면 안 돼 — 그런 식의 상호작용」 「이름은 문제 카드」 「활동가가 매주 혹은 매달 업데이트」.
 * 한 번에 한 장(새것이 크게), 지난 카드는 접어서. 반응 수는 반응한 뒤에만 보인다(먼저 보이면 끌려간다). 카드엔 판단을 안 쓰고 묻는다.
 */
const CARD_KINDS: CardKind[] = ['problem', 'unsure', 'fine']; // api.ts 와 같은 차례(값을 끌어오면 서버 규칙이 화면 묶음에 딸려 온다)
export const CARD_KIND_NAME: Record<CardKind, string> = { problem: '이건 문제다', unsure: '잘 모르겠다', fine: '그럴 수 있다' };
export type CardsOpts = {
  online: boolean;
  load(): Promise<PublicCard[] | undefined>;
  react(id: string, kind: CardKind): Promise<PublicCard | undefined>;
  mine(): Record<string, string>;
  /** file = 카드 그림(미리 찍어 둔 것, 없으면 링크만). */
  share(card: PublicCard, copy: boolean, file?: File): void;
  /** 링크(?card=)로 온 카드 — 이걸 맨 위에 크게. */
  focus?: string;
};
const dayLabel = (date: string) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(date); return m ? `${Number(m[2])}월 ${Number(m[3])}일` : date; };
const squash = (text: string) => text.replace(/\s/g, '');

export function openCards(shell: HTMLElement, opts: CardsOpts, onClose: () => void) {
  const { panel } = placePanel(shell, 'cards', onClose);
  const status = el('p', 't-small', '불러오는 중…'); status.setAttribute('role', 'status');
  panel.append(status);
  void Promise.all([opts.load(), loadPlaces().catch(() => undefined)]).then(([cards, places]) => {
    if (!cards) { status.textContent = opts.online ? '지금은 카드를 불러올 수 없어요. 조금 뒤에 다시 와 주세요.' : '시험판이라 아직 카드가 없어요. 활동가가 올리면 여기에 떠요.'; return; }
    if (!cards.length) { status.textContent = '첫 이야기를 준비하고 있어요. 곧 올라와요.'; return; } // 0장일 때(10-20 사용자 「아직 준비중이라는 문구 띄우고」)
    status.remove();
    const myPlace = places?.places.find(p => p.c === loadRegion());
    const ours = (card: PublicCard) => Boolean(myPlace && !myPlace.n.endsWith('(시·도)') && squash(card.region).includes(squash(placeTitle(myPlace))));
    const first = cards.find(c => c.id === opts.focus) ?? cards[0], rest = cards.filter(c => c !== first);
    const top = cardView(first, ours(first), opts);
    panel.append(el('p', 'c-kicker', first === cards[0] ? '이번 이야기' : '친구가 보낸 이야기'), top.box);
    setTimeout(top.prepare, 600); // 판이 열리는 움직임이 끝난 뒤
    if (!rest.length) return;
    panel.append(el('h3', 'x-h', '지난 이야기'));
    for (const card of rest) {
      const fold = el('details', 'c-fold'), mine = opts.mine()[card.id] as CardKind | undefined, view = cardView(card, ours(card), opts);
      fold.append(el('summary', '', `${dayLabel(card.date)} · ${card.title}${mine ? ` — 내 반응: ${CARD_KIND_NAME[mine]}` : ''}`), view.box);
      fold.addEventListener('toggle', () => { if (fold.open) setTimeout(view.prepare, 300); }); // 접힌 카드는 크기가 없어 펼친 뒤에 찍는다
      panel.append(fold);
    }
  });
}

function cardView(card: PublicCard, ours: boolean, opts: CardsOpts) {
  const box = el('article', 'c-card'), meta = el('p', 'c-meta', `${dayLabel(card.date)} · ${card.region || '전국'}`);
  if (ours) meta.append(el('span', 'c-ours', '우리 동네 일이에요'));
  box.append(meta, el('h3', 'c-title', card.title));
  if (card.amount) box.append(el('p', 't-big', card.amount));
  if (card.text) box.append(el('p', 'c-text', card.text));
  const area = el('div', 'c-react');
  const ask = () => {
    const list = el('div', 'c-kinds');
    for (const kind of CARD_KINDS) list.append(btn(`c-kind c-${kind}`, CARD_KIND_NAME[kind], async () => {
      list.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const got = await opts.react(card.id, kind);
      if (got) { card = got; result(kind); } else { list.querySelectorAll('button').forEach(b => { b.disabled = false; }); area.append(el('p', 't-small', '지금은 반응을 남길 수 없어요. 조금 뒤에 다시 해 주세요.')); }
    }));
    area.replaceChildren(el('p', 'c-q', '이 돈, 어떻게 보세요?'), list);
  };
  const result = (mine: CardKind) => {
    const total = CARD_KINDS.reduce((a, k) => a + card.counts[k], 0) || 1;
    const rows = el('div', 'c-result');
    for (const kind of CARD_KINDS) {
      const pct = Math.round((card.counts[kind] / total) * 100), row = el('div', `c-row c-${kind}${kind === mine ? ' mine' : ''}`);
      row.style.setProperty('--p', `${pct}%`);
      row.append(el('span', '', CARD_KIND_NAME[kind]), el('b', '', `${pct}%`));
      rows.append(row);
    }
    area.replaceChildren(el('p', 'c-q', `${total}명이 반응했어요`), rows, btn('g-link c-again', '반응 바꾸기', ask));
  };
  const mine = opts.mine()[card.id] as CardKind | undefined;
  if (mine && CARD_KINDS.includes(mine)) result(mine); else ask();
  const more = el('div', 'c-more');
  more.append(...shareButtons('g-ghost', copy => opts.share(card, copy, file))); // 「밑 빠진 독상 보기」 는 걷었다(10-26 — 카드와 상관없이 독상 첫 화면이었고, 마을에 독상 집이 따로 있다)
  if (card.link) more.append(link('출처 보기', card.link, 'g-link'));
  box.append(area, more);
  /*
    공유 그림(10-21 유입 2번 — 단톡방에선 링크만 가면 안 보이고, 카톡 미리보기는 깃허브 페이지라 늘 같은 og.jpg) — 카드 위쪽(날짜·제목·금액·설명)만 찍는다.
    미리 찍어 둔다 — 누른 뒤에 찍으면 아이폰이 공유창을 막는다(main.ts·town.ts 와 같은 까닭). 못 찍었으면 링크만.
  */
  let file: File | undefined;
  const prepare = async () => {
    if (file || !box.getClientRects().length) return;
    try {
      const { toBlob } = await import('html-to-image');
      await document.fonts?.ready;
      const blob = await toBlob(box, { pixelRatio: 2, backgroundColor: '#fffaf0', filter: node => node !== area && node !== more });
      if (blob) file = new File([blob], `forest-card-${card.id}.png`, { type: 'image/png' });
    } catch (error) { console.warn(error); }
  };
  return { box, prepare };
}

// ───────────────────────── 쪽지 — 쪽지판·광장에서 마주친 쪽지 카드 ─────────────────────────
/** 이 기기에만 — 내가 붙인 쪽지, 「나도」·「신고」 누른 쪽지, 마지막으로 붙인 시각. */
type Marks = { mine: string[]; liked: string[]; reported: string[]; lastAt: number };
const MARKS_KEY = 'budget-game-village';
export function loadMarks(): Marks {
  try {
    const raw = JSON.parse(gameStorage.getItem(MARKS_KEY) ?? 'null');
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-200) : []);
    return { mine: ids(raw?.mine), liked: ids(raw?.liked), reported: ids(raw?.reported), lastAt: Number(raw?.lastAt) || 0 };
  } catch { return { mine: [], liked: [], reported: [], lastAt: 0 }; }
}
const saveMarks = (marks: Marks) => { try { gameStorage.setItem(MARKS_KEY, JSON.stringify(marks)); } catch { /* 막힌 창 */ } };
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
  /** 관리자일 때만 — 쪽지 숨기기(서버가 열쇠로 다시 확인한다, 사용자 10-19). */
  hide?: (id: string) => Promise<boolean>;
};

/** 쪽지 한 장 — 모습·별명·언제·글, 그리고 「나도」·「신고」(관리자면 「숨기기」). 쪽지판과 우리 동네의 동네 한마디가 같이 쓴다. */
export function noteView(note: PublicNote, on: NoteActions, onChange?: () => void) {
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
  if (on.hide) {
    const hide = btn('v-report', '숨기기', async () => {
      if (!confirm('이 쪽지를 숨길까요? 시트 「숨김」 칸에 「관리자」 가 적혀요. 되살리려면 그 칸을 지우면 돼요.')) return;
      hide.disabled = true;
      if (await on.hide!(note.id)) { item.replaceChildren(el('p', 't-small', '숨겼어요.')); onChange?.(); } else { hide.disabled = false; hide.textContent = '숨기지 못했어요'; }
    });
    row.append(hide);
  }
  item.append(who, el('p', 'v-text', note.text), row);
  return item;
}

export type BoardOpts = NoteActions & {
  /** 지난번에 받아 둔 마을 모습 — 먼저 그리고, refresh 가 오면 갈아 끼운다(남이 누른 「나도」 가 보이게). */
  view?: VillageView;
  refresh(): Promise<VillageView | undefined>;
  online: boolean;
  /** 쓰기는 로그인한 사람만(사용자 10-19) — 안 했으면 그 자리에 「로그인하면 쪽지를 남길 수 있어요」. */
  login: LoginOpts;
  /** 붙이기 — 됐나와 알릴 말, 됐으면 서버가 같이 돌려준 마을 모습(main 이 우리 동네 탭과 같이 쓴다). */
  post(text: string): Promise<{ ok: boolean; text: string; view?: VillageView }>;
  /** 붙이는 동안 먼저 그려 둘 내 모습·이름. */
  me(): { name: string; pick: Pick };
};

/** 쪽지판(10-19 살림) — 다녀간 사람들의 한 줄, 새것부터. 내 동네를 정한 사람의 쪽지는 우리 동네 탭 「동네 한마디」 에도 뜬다. */
export function openBoard(shell: HTMLElement, opts: BoardOpts, onClose: () => void) {
  const { panel } = placePanel(shell, 'board', onClose);
  if (!opts.online) { panel.append(el('p', 't-lead', '서버가 없는 시험판이라 쪽지판이 비어 있어요.')); return; }
  let view = opts.view;
  const list = el('div', 'v-notes');
  const draw = () => {
    list.replaceChildren(...(view?.notes.length ? view.notes.map(n => noteView(n, opts)) : [el('p', 't-small', view ? '아직 쪽지가 없어요. 첫 쪽지를 붙여 보세요.' : '지금은 쪽지를 불러오지 못했어요.')]));
  };
  const refresh = () => opts.refresh().then(fresh => { if (fresh) { view = fresh; draw(); } });
  // 붙이기 — 누르는 순간 내 쪽지를 맨 위에 먼저 그리고(「붙이는 중」), 서버 답에 실려 온 마을 모습으로 갈아 끼운다.
  // 10-20 사용자 「쪽지판에 글 남길 때 느려」 — 전엔 붙인 뒤 마을 모습을 한 번 더 받아(서버 두 번, 3~4초) 그제야 보였다.
  const post = async (text: string) => {
    const me = opts.me(), mine = el('div', 'v-note v-pending'), who = el('div', 'v-who');
    who.append(avatar(toLook(me.pick)), el('b', '', me.name || '이름 없는 주민'), el('small', '', '붙이는 중…'));
    mine.append(who, el('p', 'v-text', text));
    list.querySelector(':scope > p.t-small')?.remove(); // 「아직 쪽지가 없어요」
    list.prepend(mine);
    const got = await opts.post(text);
    if (got.ok && got.view) view = got.view;
    draw(); // 못 붙였으면 먼저 그린 것을 거둔다
    return got;
  };
  panel.append(opts.login.current() ? noteForm(post) : loginInvite('로그인하면 쪽지를 남길 수 있어요', opts.login, 'board'), list);
  draw();
  void refresh();
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
  /** 오늘 동전을 받은 오락실 놀이(arcade.ts) — 놀이마다 하루 한 번. 날이 바뀌면 비운다. */ arcade: string[];
};
/**
 * 동전·오늘 주운 나무는 로그인하면 기록 묶음에도 실린다(사용자 10-19 — 100개를 모으는 사이 기기가 바뀌면 날아가서, profile.ts exportSave 의 coins).
 * 그래서 저장할 때마다 고친 때(at)를 찍고 로그인 동기화를 깨운다(touched).
 */
export function loadPocket(day: number): Pocket {
  try {
    const raw = JSON.parse(gameStorage.getItem(POCKET_KEY) ?? 'null');
    const num = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0);
    const sameDay = raw?.day === day;
    return {
      day, taken: sameDay && Array.isArray(raw.taken) ? raw.taken.filter(Number.isInteger).slice(0, 200) : [], coins: num(raw?.coins), fruits: num(raw?.fruits), given: num(raw?.given), told: raw?.told === true,
      arcade: sameDay && Array.isArray(raw.arcade) ? raw.arcade.filter((x: unknown) => typeof x === 'string').slice(0, 10) : [],
    };
  } catch { return { day, taken: [], coins: 0, fruits: 0, given: 0, told: false, arcade: [] }; }
}
export const savePocket = (pocket: Pocket) => { try { gameStorage.setItem(POCKET_KEY, JSON.stringify({ ...pocket, at: Date.now() })); } catch { /* 막힌 창 */ } touched(); };

export type WorksOpts = {
  /** 모두가 넣은 동전(서버 없으면 내가 넣은 것만). */
  total: number;
  pocket: Pocket;
  online: boolean;
  /** 로그인했나 — 안 했으면 「동전은 이 기기에만」 한 줄. */
  loggedIn: boolean;
  /** 넣기 — 서버가 받은 수와 새 합계. 못 넣었으면 undefined(하루 한도 등). */
  /** 넣었으면 넣은 수와 모인 수, 못 넣었으면 그 까닭(net.ts lastFailure — 「not-finished」·「coin-day」…). */
  give(n: number): Promise<{ took: number; total: number } | { failed: string }>;
  /** 액세서리 — 이미 가진 것(REWARDS 번호)·지금 쓰는 모습, 사기(동전 ACCESSORY_PRICE 개, 산 것은 바로 쓴다). */
  owned(): number[];
  pick(): Pick;
  buy(i: number): boolean;
  /** 그 모습을 쓴 내 얼굴 그림(시민증 사진과 같은 것) — 사기 전에 미리 보기. 장면이 없으면 undefined. */
  preview?(pick: Pick): Promise<string | undefined>;
};

/**
 * 동전으로 액세서리 하나(사용자 10-19 「웅 그렇게 하자」) — 나무에서 하루 15개까지 줍고 공사엔 하루 10개까지라, 100개면 적어도 이레(다시 올 까닭).
 * 액세서리를 받을 길이 마을 부탁(숨김)뿐이던 것을 이걸로 연다. 벗고 끼기(모습 판)는 GPT 몫 — 산 것은 지금은 바로 쓰기만.
 */
export const ACCESSORY_PRICE = 100;
/** 동전을 못 넣은 까닭마다 한 줄(api.ts /village/coins). 서버에 판이 없는 사람 = 10-16 서버를 옮기기 전에 걸었거나 끝낼 때 서버에 못 닿은 사람. */
const COIN_FAILED: Record<string, string> = {
  'coin-day': `동전은 하루에 ${COIN_DAY_MAX}개까지 넣을 수 있어요. 내일 또 와요.`,
  'not-finished': '지난 한 바퀴가 서버에 남아 있지 않아요. 한 바퀴 다시 걸으면 동전을 넣을 수 있어요.',
};

/**
 * 마을 공사터 — 지금 공사·모인 동전·다 지은 것, 내 주머니 동전 넣기, 액세서리 사기.
 * 다 채우는 순간 판에서 「○○ 완성!」 과 「보러 가기」(사용자 10-19 「동전 넣었는데 변화가 없는데?」 — 전엔 바로 다음 공사 0/10 으로 넘어갔다).
 * 보러 가기 = 판을 닫는 것 — 판이 닫히면 장면이 카메라를 그리로 보내 뚝딱 서는 걸 보여 준다(VillageScene showBuilt). 다음 공사는 그 뒤.
 */
export function openWorks(shell: HTMLElement, opts: WorksOpts, onClose: () => void) {
  const { panel, close } = placePanel(shell, 'works', onClose);
  const card = el('div', 't-bigcard'), status = el('p', 't-small'); status.setAttribute('role', 'status');
  let justBuilt: string | undefined, busy = false;
  const give = btn('g-primary', '', async () => {
    const n = Math.min(opts.pocket.coins, COIN_DAY_MAX);
    if (!n || busy) return;
    const total = opts.total, coins = opts.pocket.coins, before = worksAt(total).done.length;
    // 누르는 순간 막대·주머니를 먼저 채운다(10-20 사용자 「동전을 넣을 때 느려」 — 서버 한 번 1.5~2초). 못 넣었으면 되돌린다.
    // 공사 하나를 다 채우는 동전이면 먼저 채우지 않는다 — 다음 공사 0칸이 먼저 보였다가 「완성!」 이 뜨게 된다.
    // 넣는 동안(busy) 넣기·사기 단추는 잠근다(GPT 10-20 — 두 번 눌러 두 번 보내던 것).
    const early = worksAt(total + n).done.length === before;
    const undo = (text: string) => { opts.total = total; opts.pocket.coins = coins; status.textContent = text; };
    busy = true;
    if (early) { opts.total = total + n; opts.pocket.coins = coins - n; status.textContent = `동전 ${n}개를 넣었어요.`; } else status.textContent = '넣는 중…';
    draw(); drawShop();
    try {
      const done = await opts.give(n);
      if ('failed' in done) { undo(COIN_FAILED[done.failed] ?? '지금은 넣지 못했어요. 조금 뒤에 다시 해 주세요.'); return; }
      opts.total = done.total;
      const after = worksAt(opts.total).done;
      if (after.length > before) justBuilt = WORKS.find(w => w.id === after[after.length - 1])!.name;
      status.textContent = `동전 ${done.took}개를 넣었어요.`;
    } catch { undo('지금은 넣지 못했어요. 조금 뒤에 다시 해 주세요.'); }
    finally { busy = false; draw(); drawShop(); }
  });
  const draw = () => {
    const state = worksAt(opts.total);
    const parts: Node[] = [];
    if (justBuilt) {
      parts.push(el('p', 't-big', `${justBuilt} 완성!`), el('p', 't-small', opts.online ? '다녀간 사람들이 모은 동전으로 지었어요.' : '모은 동전으로 지었어요.'), btn('g-primary', '보러 가기', close));
      card.replaceChildren(...parts);
      give.hidden = true;
      return;
    }
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
    const n = Math.min(opts.pocket.coins, COIN_DAY_MAX);
    give.textContent = !opts.pocket.coins ? '주머니에 동전이 없어요' : !state.now ? '지금 짓는 것이 없어요' : `동전 ${n}개 넣기`;
    give.disabled = busy || !opts.pocket.coins || !state.now;
  };
  // 액세서리 사기 — 가진 것은 「갖고 있어요」, 지금 쓰는 것은 「쓰는 중」.
  // 살 것 옆엔 그걸 쓴 내 얼굴(10-20 사용자 「100개 옆에 모습 그려 줘」). 그림 판 하나를 같이 써서 한 장씩 차례로 그린다.
  const shop = el('section', 'v-sec'), wares = el('ul', 'v-list');
  const looks = new Map<string, Promise<string | undefined>>();
  let queue: Promise<unknown> = Promise.resolve();
  const lookOf = (pick: Pick) => {
    const key = pick.join();
    if (!looks.has(key)) { const next = queue.then(() => opts.preview!(pick)).catch(() => undefined); queue = next; looks.set(key, next); }
    return looks.get(key)!;
  };
  const drawShop = () => {
    const owned = opts.owned(), pick = fullPick(opts.pick());
    wares.replaceChildren(...REWARDS.map((reward, i) => {
      const li = el('li', 'v-ware'), wearing = pick[reward.slot] === reward.value;
      if (opts.preview && !wearing && !owned.includes(i)) {
        const img = el('img', 'v-ware-look'); img.alt = `${josa(reward.name, '을', '를')} 쓴 내 모습`; img.hidden = true;
        const worn = [...pick] as Pick; worn[reward.slot] = reward.value;
        void lookOf(worn).then(src => { if (src) { img.src = src; img.hidden = false; } });
        li.append(img);
      }
      li.append(el('b', '', reward.name));
      if (wearing) li.append(el('span', 't-small', '쓰는 중'));
      else if (owned.includes(i)) li.append(el('span', 't-small', '갖고 있어요'));
      else {
        const buy = btn('g-ghost', `동전 ${ACCESSORY_PRICE}개로 사기`, () => {
          if (busy) return;
          if (!opts.buy(i)) { status.textContent = `동전이 ${ACCESSORY_PRICE - opts.pocket.coins}개 더 있어야 해요.`; return; }
          status.textContent = `${josa(reward.name, '을', '를')} 샀어요. 지금 쓰고 있어요.`;
          draw(); drawShop();
        });
        buy.disabled = busy || opts.pocket.coins < ACCESSORY_PRICE;
        li.append(buy);
      }
      return li;
    }));
  };
  shop.append(el('h3', 'v-head', '액세서리 사기'), el('p', 't-small', `동전 ${ACCESSORY_PRICE}개에 하나씩 살 수 있어요. 산 것은 바로 써요.`), wares);
  // 「진짜 마을도 이렇게 지어요」 한마디와 「마을 곳간에 가 보기」 단추는 걷었다(10-20 사용자 「그 버튼은 삭제해도 되지 않아?」 — 곳간에서 세금 종류도 빠져 그 말이 틀리게 됐다).
  panel.append(card, give, status, el('p', 't-small x-hint', `나무 밑동에 부딪혀 보세요. 날마다 몇 그루에서 동전이 떨어져요.${opts.loggedIn ? '' : ' 동전은 이 기기에만 모여요 — 로그인하면 다른 기기에서도 이어져요.'}`),
    shop);
  draw(); drawShop();
}
