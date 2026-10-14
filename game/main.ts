import './ui.css';
import { createJourney, transition, currentQuestion, type Command } from './flow';
import { buildGameResponse, orderedQuestions, type GameResponse } from './response';
import { scoreAnswers } from './score';
import { ROUTE, TYPES } from './content';
import { createEvents } from './events';
import { Controls } from './input';
import { createUI } from './ui';
import { attachEffects } from './effects';
import { unlockAudio, isMuted, setMuted } from './sfx';
import { loadMe, saveMe, loadNeighbor, saveNeighbor, decodeInvite, encodeInvite, cleanTableCode, josa, type Me } from './profile';
import { checkContact, sendContact } from './contact';
import { net } from './net';
import type { Stats, TableView } from './api';
import type { JourneyScene, SceneCommand, Guest } from './scenes/JourneyScene';

const root = document.querySelector<HTMLElement>('#game-root')!;
const params = new URLSearchParams(location.search);
const invite = decodeInvite(params.get('with')); // 나를 부른 친구 — 끝에 언덕에서 만난다
const returning = loadNeighbor(); // 지난번 내 이웃 — 이번엔 처음부터 같이 걷는다
let tableCode = cleanTableCode(params.get('table'));
let table: TableView | undefined;
let me: Me = loadMe();
let state = createJourney(crypto.randomUUID(), Date.now());
let response: GameResponse | undefined;
let stats: Stats | undefined;
let scene: JourneyScene | undefined;
let game: import('phaser').Game | undefined;
let pendingReveal: string | undefined;
let frame = 0;
let poll: ReturnType<typeof setInterval> | undefined;
let card: File | undefined; // 공유 그림 — 미리 만들어 둔다(아래 prepareCard)
let cardFor: string | undefined;
const bus = createEvents();
const abort = new AbortController();
const view = { w: 360, h: 640, dpr: 1 };
const here = () => `${location.origin}${location.pathname}`;
/** 연락처 칸은 보낼 곳(contact.ts 의 sendContact)이 생기기 전까지 이 컴퓨터의 개발판에서만 보인다. */
const contactReady = import.meta.env.DEV;
/** 게임 서버(테이블·다른 사람들 마음)가 있나. 깃허브 페이지 시험판엔 없다 — 그때는 그 단추들을 숨긴다. */
let online = false;

const ui = createUI(root, {
  start: () => {
    unlockAudio();
    ui.hideIntro();
    ui.dresser(me, {
      change: next => { me = next; scene?.setLook(next.pick); },
      done: next => { me = next; saveMe(next); send({ type: 'start' }); void joinTable(); },
    });
    scene?.dress(); // 판을 먼저 열어야 판 위에 남은 자리를 잴 수 있다
  },
  retry: () => location.reload(),
  sound: () => { setMuted(!isMuted()); ui.setSound(isMuted()); if (!isMuted()) unlockAudio(); },
  openTable: () => ui.tablePanel(tableCode, {
    create: async () => { const made = await net.newTable(); if (made) { tableCode = made.code; notes(); } return made?.code; },
    enter: async value => {
      const code = cleanTableCode(value);
      if (!code || !(await net.table(code))) return false;
      tableCode = code; notes(); return true;
    },
    link: code => `${here()}?table=${code}`,
    close: () => {},
  }),
  reply: (questionId, level) => send({ type: 'answer', questionId, level }),
  goTo: side => scene?.goTo(side),
  goDoor: () => scene?.goDoor(),
});
ui.setSound(isMuted());
const controls = new Controls(ui.surface, () => !state.paused && ['walking', 'question', 'reply'].includes(state.phase));
const stopEffects = attachEffects(bus);

function notes() {
  const lines: string[] = [];
  if (invite) lines.push(`${invite.name}님이 이 동네로 불렀어요. 끝에 언덕에서 만나요.`);
  if (returning) lines.push(`지난번 내 이웃 ${josa(`「${returning.name}」`, '이', '가')} 이번에도 같이 걸어요.`);
  if (tableCode) lines.push(`테이블 ${tableCode} 에 앉았어요. 끝에 다 같이 모여요.`);
  ui.notes(lines);
}
notes();
void net.stats().then(found => {
  online = Boolean(found);
  stats = found;
  if (!online) tableCode = undefined;
  ui.online(online);
  notes();
});

type UntimedCommand = Command extends infer T ? T extends { at: number } ? Omit<T, 'at'> : never : never;
function send(command: UntimedCommand | SceneCommand) {
  const next = transition(state, { ...command, at: Math.max(Date.now(), state.lastAt) } as Command);
  if (next.state === state) return;
  state = next.state;
  if (state.phase === 'arrived') response = buildGameResponse(state);
  ui.render(state);
  bus.emit(next.events);
}

/** 질문과 말풍선이 화면에 그려진 뒤(두 프레임 뒤)에 응답 시계를 시작한다. */
function visible(id: string) {
  if (pendingReveal || document.hidden || state.paused || state.phase !== 'walking') return;
  pendingReveal = id;
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      pendingReveal = undefined;
      if (!document.hidden && !state.paused && currentQuestion(state)?.id === id) send({ type: 'visible', questionId: id });
    });
  });
}

function pause() { cancelAnimationFrame(frame); pendingReveal = undefined; controls.clear(); send({ type: 'pause' }); }
function resume() { if (!document.hidden) send({ type: 'resume' }); }
document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()), { signal: abort.signal });
window.addEventListener('pagehide', pause, { signal: abort.signal });
window.addEventListener('pageshow', resume, { signal: abort.signal });
ui.render(state);

// ── 같이 걷기: 테이블·다른 사람들 마음 ──
async function joinTable() {
  if (!tableCode) return;
  table = await net.join(tableCode, { id: state.sessionId, name: me.name, pick: me.pick }) ?? table;
}
async function refreshTable() {
  if (tableCode) table = await net.table(tableCode) ?? table;
}
const tablemates = () => table?.members.filter(member => member.id !== state.sessionId) ?? [];
const whereIs = (stage: number) => (stage >= ROUTE.length ? '언덕에 닿음' : `${ROUTE[stage].area} 걷는 중`);

bus.subscribe(event => {
  if (event.type === 'stage.entered' && tableCode) {
    void net.progress(tableCode, state.sessionId, { stage: event.stageId - 1 }).then(view => { table = view ?? table; });
  }
  if (event.type === 'journey.arrived') {
    if (online) void net.finish(state.sessionId, state.answers).then(result => { stats = result ?? stats; });
    if (tableCode) void net.progress(tableCode, state.sessionId, { stage: ROUTE.length, type: event.typeCode }).then(view => { table = view ?? table; });
  }
});

function guests(): Guest[] {
  const list: Guest[] = [];
  if (invite) list.push({ id: 'invite', name: invite.name, pick: invite.pick, label: `${invite.name} · ${TYPES[invite.type].name}` });
  for (const mate of tablemates()) if (mate.type) list.push({ id: mate.id, name: mate.name, pick: mate.pick, label: `${mate.name} · ${TYPES[mate.type].name}` });
  return list;
}
function endLines() {
  const lines: string[] = [];
  if (invite) lines.push(`나를 부른 ${invite.name}님은 「${TYPES[invite.type].name}」`);
  const mates = tablemates();
  if (tableCode) lines.push(mates.length ? `우리 테이블 — ${mates.map(m => `${m.name} ${m.type ? `「${TYPES[m.type].name}」` : `(${whereIs(m.stage)})`}`).join(' · ')}` : `테이블 ${tableCode} — 아직 다른 사람이 없어요`);
  return lines;
}
const mine = () => Object.fromEntries(Object.entries(state.answers).map(([id, value]) => [id, value <= 3 ? 'a' : 'b'])) as Record<string, 'a' | 'b'>;

/**
 * 공유 그림을 미리 찍어 둔다. 누른 뒤에 찍으면 아이폰 사파리가 「누른 직후」가 지났다며 공유창을 막는다.
 * 언덕에 테이블 사람이 새로 서면(끝 화면 줄이 바뀌면) 다시 찍는다.
 */
async function prepareCard() {
  const key = endLines().join('|');
  if (!game || !state.result || key === cardFor) return;
  cardFor = key;
  try {
    const scene = await new Promise<string>(resolve => game!.renderer.snapshot(shot => resolve((shot as HTMLImageElement).src)));
    const blob = await ui.picture(scene);
    if (blob && cardFor === key) card = new File([blob], `dongne-${state.result}.png`, { type: 'image/png' });
  } catch (error) { console.warn(error); cardFor = undefined; }
}

function share() {
  if (!state.result) return;
  const url = `${here()}?with=${encodeInvite({ name: me.name, pick: me.pick, type: state.result })}`;
  const text = `동네 한 바퀴 — 나는 「${TYPES[state.result].name}」래요. 너도 걸어 봐!`;
  // 그림이 준비됐고 받는 쪽이 파일을 받으면 그림 + 글(링크 포함), 아니면 지금처럼 링크만.
  const files = card && navigator.canShare?.({ files: [card] }) ? [card] : undefined;
  if (navigator.share) navigator.share(files ? { files, text: `${text}\n${url}` } : { title: '동네 한 바퀴', text, url }).catch(() => {});
  else void navigator.clipboard?.writeText(`${text} ${url}`).then(() => ui.toast('링크를 복사했어요'), () => ui.toast(url));
}

/** 언덕에서 다 같이 폴짝 뛴 뒤 — 끝 화면과 할 수 있는 것들. */
function showEnd() {
  if (!state.result) return;
  scene?.setGuests(guests());
  ui.end({ code: state.result, scores: scoreAnswers(orderedQuestions, state.answers), lines: endLines() }, {
    neighbor: () => {
      ui.endActions(false);
      ui.hint('언덕에서 한 명을 눌러 내 이웃으로 삼으세요');
      scene?.pickNeighbor(follower => {
        ui.hint();
        const question = orderedQuestions.find(q => q.id === follower.questionId)!;
        ui.neighborSheet(question[follower.key].text, {
          save: name => {
            saveNeighbor({ questionId: follower.questionId, key: follower.key, seed: follower.seed, name: name || '이웃', at: Date.now() });
            ui.toast(`${josa(`「${name || '이웃'}」`, '이', '가')} 내 이웃이 됐어요. 다음에 오면 같이 걸어요.`);
          },
          contact: contactReady ? async form => {
            const checked = checkContact(form, Date.now());
            if (!checked.ok) return { ok: false, text: checked.error };
            return { ok: true, text: (await sendContact(checked.payload)) === 'sent' ? '고마워요! 소식이 생기면 보내 드릴게요.' : '고마워요! 다만 시험판이라 아직 저장하지 않았어요.' };
          } : undefined,
          close: () => ui.endActions(true),
        });
      });
    },
    others: online ? async () => ui.others((await net.stats()) ?? stats, mine()) : undefined,
    share,
    again: () => { location.href = here(); },
  });
  // 테이블 사람들이 하나둘 언덕에 닿으면 그때그때 세운다.
  if (tableCode) poll = setInterval(async () => { await refreshTable(); scene?.setGuests(guests()); ui.endLines(endLines()); setTimeout(prepareCard, 1600); }, 4000);
  setTimeout(prepareCard, 1600); // 카드가 내려앉고 손님이 언덕에 다 올라온 뒤
}

function measure() {
  const rect = ui.surface.getBoundingClientRect();
  view.w = Math.max(1, Math.round(rect.width));
  view.h = Math.max(1, Math.round(rect.height));
  view.dpr = Math.min(3, window.devicePixelRatio || 1);
}

async function boot() {
  try {
    measure();
    const [{ default: Phaser }, { JourneyScene }] = await Promise.all([import('phaser'), import('./scenes/JourneyScene')]);
    const journey = new JourneyScene({
      state: () => state, send, visible, subscribe: listener => bus.subscribe(listener),
      view: () => view, controls, ui, ready: () => ui.ready(),
      pick: () => me.pick, name: () => me.name, returning, arrived: showEnd,
      busCaption: (stage, skip) => {
        if (stage < 0) { ui.busCaption(); return; }
        ui.busCaption(ROUTE[stage].area, tablemates().map(m => `${m.name} — ${whereIs(m.stage)}`), skip);
      },
    });
    scene = journey;
    // 폰 화면이 흐려지지 않게 캔버스는 기기 화소로 만들고, 화면에는 CSS 크기로 줄여 보인다.
    const phaser = new Phaser.Game({
      type: Phaser.AUTO, parent: ui.surface, backgroundColor: '#fffaf0',
      width: view.w * view.dpr, height: view.h * view.dpr,
      scale: { mode: Phaser.Scale.NONE, zoom: 1 / view.dpr },
      render: { antialias: true }, audio: { noAudio: true }, banner: false,
      scene: [journey],
    });
    game = phaser;
    const resize = new ResizeObserver(() => {
      measure();
      phaser.scale.resize(view.w * view.dpr, view.h * view.dpr);
      phaser.scale.setZoom(1 / view.dpr);
      journey.relayout();
    });
    resize.observe(ui.surface);
    abort.signal.addEventListener('abort', () => resize.disconnect());
  } catch (error) { console.error(error); ui.loadError(); }
}
void boot();

// 저장 단계에서 붙일 자리. 답은 「다른 사람들 마음」 서버로만 간다(개인정보 없음).
export function getPendingResponse() { return response ? structuredClone(response) : undefined; }

if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frame); clearInterval(poll); abort.abort(); stopEffects(); bus.clear(); controls.destroy(); game?.destroy(true); ui.destroy();
});
