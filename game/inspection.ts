import { PLACES } from './village';
import { orderedQuestions } from './response';
import './inspection.css';

/** 입구 표시는 편의를 위한 것. 실제 점검 진입 권한은 net.startInspection이 서버에 확인한다. */
export function mountInspectionTools(shell: HTMLElement, active: boolean) {
  const tools = document.createElement('details'); tools.className = 'g-inspector';
  const summary = document.createElement('summary'); summary.textContent = active ? '관리자 점검 중' : '관리자 점검';
  tools.append(summary);
  const note = document.createElement('p');
  note.textContent = active ? '임시 기록으로 확인 중이에요. 실제 통계·연락처·시민증에는 저장되지 않아요. 이동하면 점검 기록은 초기화돼요.' : '게임을 끝내지 않고 원하는 화면을 확인해요. 관리자 권한을 서버에서 확인한 뒤 열어요.';
  tools.append(note);
  const link = (label: string, params: Record<string, string>) => {
    const a = document.createElement('a'); a.textContent = label; a.className = 'g-ghost';
    a.href = `${location.origin}${location.pathname}?${new URLSearchParams({ inspect: '1', ...params })}`;
    tools.append(a);
  };
  link('마을 둘러보기', { village: '1' });
  link('결과 화면', { end: '1' });
  const rooms = document.createElement('label'); rooms.textContent = '문항·방 바로 가기';
  const select = document.createElement('select');
  select.append(new Option('방을 골라 주세요', ''));
  orderedQuestions.forEach((q, i) => select.append(new Option(`${i + 1}. ${q.place}`, String(i))));
  select.onchange = () => { if (select.value !== '') location.href = `${location.origin}${location.pathname}?${new URLSearchParams({ inspect: '1', room: select.value })}`; };
  rooms.append(select); tools.append(rooms);
  for (const place of PLACES) link(place.name, { village: '1', place: place.id });
  const exit = document.createElement('a'); exit.textContent = active ? '점검 끝내기' : '닫기'; exit.className = 'g-link';
  if (active) exit.href = `${location.origin}${location.pathname}`;
  else exit.onclick = () => { tools.open = false; };
  tools.append(exit); shell.append(tools);
}
