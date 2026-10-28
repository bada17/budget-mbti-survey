/*
  창립행사 응원판 화면 — 후원주점판 `?pub` 광장 오른쪽의 새 판(규칙·출처는 cheer.ts). 로그인 없이 보고 쓴다.
  위: 세 사업 중 하나 + 응원 한마디(300자) · 아래: 응원 목록(폼 응원과 여기 적은 응원, 새것부터, 글은 다 보인다).
  기기 번호는 주점 의견과 같은 것(pub-feedback.ts) — 서버가 같은 기기의 1분 안 거듭 쓰기를 막는다.
*/
import { placePanel } from './places';
import { el, avatar } from './town';
import { toLook, lookFrom, type Pick } from './look';
import { net, lastFailure } from './net';
import { feedbackGate } from './pub-feedback';
import { checkNote, NOTE_WHY } from './village';
import { CHEER_PROJECTS, CHEER_MAX, type CheerProject, type PublicCheer } from './cheer';

export function openCheerBoard(shell: HTMLElement, me: () => { name: string; pick: Pick }, onClose: () => void) {
  const { panel } = placePanel(shell, 'cheer', onClose);
  const list = el('div', 'v-notes');
  const draw = (cheers?: PublicCheer[]) => list.replaceChildren(...(cheers?.length ? cheers.map(cheerItem)
    : [el('p', 't-small', cheers ? '아직 응원이 없어요. 첫 응원을 남겨 주세요.' : '지금은 응원을 불러오지 못했어요.')]));
  list.append(el('p', 't-small', '응원을 불러오는 중…'));
  panel.append(cheerForm(me, draw), list);
  void net.cheers().then(got => { if (panel.isConnected) draw(got?.cheers); });
}

function cheerForm(me: () => { name: string; pick: Pick }, draw: (cheers: PublicCheer[]) => void) {
  const form = el('form', 'v-write v-cheer');
  const picks = el('fieldset', 'v-cheer-picks');
  picks.append(el('legend', 't-small', '응원할 사업'));
  for (const [id, name] of Object.entries(CHEER_PROJECTS)) {
    const label = el('label', 'v-cheer-pick'), radio = el('input');
    radio.type = 'radio'; radio.name = 'cheer-project'; radio.value = id;
    label.append(radio, el('span', '', name));
    picks.append(label);
  }
  const text = el('textarea', 'g-input');
  text.maxLength = CHEER_MAX; text.rows = 4; text.placeholder = `응원 한마디 (${CHEER_MAX}자까지)`; text.setAttribute('aria-label', '응원 한마디');
  const send = el('button', 'g-primary', '응원 남기기'); send.type = 'submit';
  const result = el('p', 't-small'); result.setAttribute('role', 'status');
  form.append(picks, text, el('p', 't-small', '남긴 응원은 이 판에 바로 보여요. 이름·연락처 같은 개인정보는 적지 말아 주세요.'), send, result);
  form.onsubmit = async event => {
    event.preventDefault();
    const project = form.querySelector<HTMLInputElement>('input[name="cheer-project"]:checked')?.value as CheerProject | undefined;
    if (!project) { result.textContent = '응원할 사업을 골라 주세요.'; return; }
    const checked = checkNote(text.value, CHEER_MAX);
    if (!checked.ok) { result.textContent = checked.why === 'long' ? `${CHEER_MAX}자까지 남길 수 있어요.` : NOTE_WHY[checked.why]; return; }
    send.disabled = true; result.textContent = '남기는 중…';
    const who = me();
    const got = await net.cheer({ device: feedbackGate().device, project, name: who.name, pick: who.pick, text: checked.text });
    send.disabled = false;
    if (got) { text.value = ''; result.textContent = '고마워요. 응원판에 붙였어요.'; draw(got.cheers); return; }
    result.textContent = lastFailure() === 'note-wait' ? '1분에 한 번 남길 수 있어요. 잠시 뒤에 다시 해 주세요.' : '지금은 남기지 못했어요. 조금 뒤에 다시 눌러 주세요.';
  };
  return form;
}

/** 응원 한 장 — 모습·이름·사업·어디서·글. 폼 응원은 이름·모습이 없어 번호로 모습을 지어 준다. 모습(pick)이 없으면 폼(QR)에서 온 것(사용자 10-28 「게임한 거랑 큐알로 한 거 구분」). */
function cheerItem(cheer: PublicCheer) {
  const item = el('div', 'v-note'), who = el('div', 'v-who');
  who.append(avatar(cheer.pick ? toLook(cheer.pick) : lookFrom(`cheer:${cheer.id}`)), el('b', '', cheer.name || '이름 없는 주민'), el('small', 'v-cheer-tag', CHEER_PROJECTS[cheer.project]), el('small', 'v-cheer-tag', cheer.pick ? '게임에서' : 'QR로'));
  item.append(who, el('p', 'v-text', cheer.text));
  return item;
}
