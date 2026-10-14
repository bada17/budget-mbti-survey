/*
  끝에서 여는 판 — 「내가 지은 동네」와 「주민증」(사용자 10-14 기획 ①·②).

  · 내 동네 = 이번 판에 고른 열다섯 가지. 지난번과 달라진 곳엔 「바뀜」과 지난번 것을 적는다.
    나를 부른 친구가 있으면 그 친구가 지은 것도 같은 자리에 선다(같으면 「○○님도」). 점수로 견주지 않는다.
  · 주민증 = 누구나 받는다. 증명사진은 내 모습 고르기 화면에서 찍은 것.
    「소식 받는 주민」 도장은 소식 받기를 하면, 「정주민」 도장은 회원이 되면 — 회원 확인은 아직 못 해서 비워 두고 길만 낸다.
  · 우리 동네 예산(지방재정 자료) — **자리만 잡아 둔다**(아래 `t-local`). 사용자 10-14: 「아직 만들지 마, 어떤 형태가 될지 몰라」.
  · 게임 화면(ui.ts)과 따로 둔 파일이다 — GPT 가 ui.ts 를 꾸미는 동안 겹치지 않게(10-14). 모양은 town.css.
*/
import './town.css';
import { ROUTE, TYPES, COMMON_QUESTIONS, FIELD_QUESTIONS, type TypeCode } from './content';
import { TOWN_IDS, changedLots, type Town } from './profile';
import { DONATE_URL } from './ui';

export type TownData = {
  name: string; type: TypeCode; town: Town; last?: Town;
  friend?: { name: string; town: Town };
  neighbor?: string; photo?: string; news: boolean;
};

const byId = new Map([...COMMON_QUESTIONS, ...FIELD_QUESTIONS].map(q => [q.id, q]));
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const today = () => { const d = new Date(); return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`; };

export function openTown(shell: HTMLElement, data: TownData, onClose: () => void) {
  const panel = el('section', 't-panel');
  const back = el('button', 't-back', '← 끝 화면으로'); back.type = 'button';
  back.onclick = () => { panel.remove(); onClose(); };

  // ── 내가 지은 동네 ──
  const changed = new Set(changedLots(data.town, data.last));
  const title = el('h2', '', data.name ? `${data.name}님이 지은 동네` : '내가 지은 동네');
  const lead = el('p', 't-lead', '이번에 고른 열다섯 가지로 지었어요.');
  if (data.last) lead.textContent += changed.size ? ` 지난번과 달라진 곳이 ${changed.size}군데예요.` : ' 지난번과 똑같이 지었어요.';
  if (data.friend) lead.textContent += ` 나를 부른 ${data.friend.name}님이 지은 것도 함께 섰어요.`;
  const town = el('div', 't-town');
  for (const stage of ROUTE) {
    const block = el('section', 't-area');
    const lots = el('ul', 't-lots');
    for (const id of stage.ids) {
      const i = TOWN_IDS.indexOf(id), q = byId.get(id)!, mine = data.town[i] as 'a' | 'b';
      const lot = el('li', 't-lot');
      lot.append(el('span', 't-house', q[mine].short), el('small', 't-place', q.place));
      if (changed.has(id)) lot.append(el('b', 't-new', `바뀜 · 지난번 ${q[data.last![i] as 'a' | 'b'].short}`));
      if (data.friend) {
        const theirs = data.friend.town[i] as 'a' | 'b';
        if (theirs === mine) lot.append(el('span', 't-with', `${data.friend.name}님도`));
        else { const house = el('span', 't-house t-friend', q[theirs].short); house.append(el('em', '', data.friend.name)); lot.append(house); }
      }
      lots.append(lot);
    }
    block.append(el('h3', '', stage.area), lots);
    town.append(block);
  }

  // ── 주민증 ──
  const card = el('div', 't-card');
  const photo = el('div', 't-photo');
  if (data.photo) { const img = el('img'); img.src = data.photo; img.alt = '내 모습'; photo.append(img); }
  const facts = el('dl', 't-facts');
  facts.append(el('dt', '', '이름'), el('dd', '', data.name || '동네 주민'), el('dt', '', '유형'), el('dd', '', TYPES[data.type].name),
    el('dt', '', '내 이웃'), el('dd', '', data.neighbor || '아직'));
  const body = el('div', 't-card-body'); body.append(photo, facts);
  const stamps = el('div', 't-stamps');
  stamps.append(el('span', `t-stamp${data.news ? ' on' : ''}`, '소식 받는 주민'), el('span', 't-stamp', '정주민'));
  card.append(el('div', 't-card-top', '동네 한 바퀴 주민증'), body, stamps, el('p', 't-issued', `${today()} 발급 · 함께하는 시민행동`));

  // 우리 동네 예산 — 자리만. 형태(무엇을·어떻게 보일지)가 정해지면 여기에 채운다. 그 전에는 화면에 내지 않는다.
  const local = el('section', 't-local'); local.hidden = true;

  const save = el('button', 'g-primary', '주민증 저장·보내기'); save.type = 'button';
  const join = el('a', 'g-link t-join', '정주민 도장 받기 — 함께하는 시민행동 회원 되기 →');
  join.href = `${DONATE_URL}&utm_content=resident-card`; join.target = '_blank'; join.rel = 'noopener';
  const note = el('p', 't-small', '그림에는 이름·모습·유형·내 이웃이 들어가요.');
  const status = el('p', 't-small'); status.setAttribute('role', 'status');

  panel.append(back, title, lead, town, el('h2', 't-card-title', '주민증'), card, local, save, join, note, status);
  shell.append(panel);
  back.focus({ preventScroll: true });

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
