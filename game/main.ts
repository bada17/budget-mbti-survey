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
import {
  loadMe, saveMe, loadNeighbor, saveNeighbor, decodeInvite, encodeInvite, cleanTableCode, josa, townFrom, loadTown, saveTown,
  loadHome, saveHome, addStamp, loadRegion, saveRegion, readNeighborParam, loadLast, type Me, type Town, type Neighbor, type Friend,
} from './profile';
import { openTown, openReply, openLetter, type Person } from './town';
import { seasonAt, nextSeason, seasonById } from './seasons';
import { seasonStamp, eventStamp, EVENTS } from './stamps';
import { checkContact } from './contact';
import { net, TABLES } from './net';
import type { Stats, TableView } from './api';
import type { JourneyScene, SceneCommand, Guest } from './scenes/JourneyScene';

const root = document.querySelector<HTMLElement>('#game-root')!;
const params = new URLSearchParams(location.search);
const invite = decodeInvite(params.get('with')); // 나를 부른 친구 — 끝에 언덕에서 만난다. replyTo 가 있으면 답장(걷기 전에 두 동네를 본다)
// 이웃의 편지(?letter=2026-dec&nb=…) — 이 기기에 이웃이 없으면 편지 쓴 이웃을 내 이웃으로 들인다(그래야 같이 걷는다).
const letterSeason = seasonById(params.get('letter'));
const letterNeighbor = readNeighborParam(params.get('nb'));
if (letterSeason && letterNeighbor && !loadNeighbor()) saveNeighbor({ ...letterNeighbor, at: Date.now() });
const returning = loadNeighbor(); // 지난번 내 이웃 — 이번엔 처음부터 같이 걷는다
const eventCode = params.get('stamp');
const gotEvent = (() => { const id = eventStamp(eventCode); return id && addStamp(id) ? EVENTS[eventCode!] : undefined; })(); // 현장 도장(?stamp=)
let home = loadHome(); // 내 방명록 집 — 끝까지 걸으면 서버에서 받아 둔다
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
let photo: string | undefined; // 주민증 증명사진 — 내 모습 고르기 끝에 찍는다
let town: Town | undefined, lastTown: Town | undefined; // 이번에 지은 동네 · 지난번 동네
let cardFor: string | undefined;
const bus = createEvents();
const abort = new AbortController();
const view = { w: 360, h: 640, dpr: 1 };
const here = () => `${location.origin}${location.pathname}`;
/** 연락처 칸은 보유 기간이 정해지기 전까지 이 컴퓨터의 개발판에서만 보인다(README 「연락처 — 켜기 전에」). */
const contactReady = import.meta.env.DEV;
/** 게임 서버(다른 사람들 마음·방명록·우리 지역, 테이블은 TABLES 일 때만)가 있나. 서버 없는 시험판엔 없다 — 그때는 그 단추들을 숨긴다. */
let online = false;

const ui = createUI(root, {
  start: () => {
    unlockAudio();
    ui.hideIntro();
    ui.dresser(me, {
      change: next => { me = next; scene?.setLook(next.pick); },
      done: async next => { me = next; saveMe(next); photo = await scene?.portrait(); send({ type: 'start' }); void joinTable(); },
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
  if (invite?.home && online) lines.push(`끝까지 걸으면 ${invite.name}님 동네 방명록에 내 이름·모습·유형이 남아요.`);
  if (returning) lines.push(`지난번 내 이웃 ${josa(`「${returning.name}」`, '이', '가')} 이번에도 같이 걸어요.`);
  if (tableCode) lines.push(`테이블 ${tableCode} 에 앉았어요. 끝에 다 같이 모여요.`);
  const season = seasonAt(Date.now());
  if (season) lines.push(`지금은 ${season.name} — 이번 철에 걸으면 주민증에 철 도장이 찍혀요.`);
  if (gotEvent) lines.push(`「${gotEvent}」 현장 도장을 받았어요. 주민증에 찍혀 있어요.`);
  ui.notes(lines);
}
notes();
void net.stats().then(found => {
  online = Boolean(found);
  stats = found;
  if (!online || !TABLES) tableCode = undefined;
  ui.online(online && TABLES);
  notes();
});

// 링크로 들어온 사람에게 걷기 전에 먼저 보이는 판 — 답장(두 동네 나란히), 이웃의 편지. 닫으면 처음 화면.
const shell = root.querySelector<HTMLElement>('.g')!;
// 다시 온 사람 — 걷지 않고 지난번 내 동네·방명록·주민증(기획 3차: 「보러 오는」 길). 유형이 남은 판(10-14 뒤)만.
const lastPlay = loadLast();
if (lastPlay?.type) ui.homeOpen(() => openHub({ name: me.name, pick: me.pick, type: lastPlay.type!, town: lastPlay.town }, lastPlay.sessionId ?? '', {}, '← 처음 화면으로'));
if (invite?.replyTo) openReply(shell, invite.replyTo, invite, () => {});
else if (letterSeason) openLetter(shell, letterSeason, returning, me.name, () => {});

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
    // 도장은 한 일에 찍는다(stamps.ts) — 한 바퀴, 테이블, 그 철에 걸었으면 철 도장.
    addStamp('walk');
    if (tableCode) addStamp('table');
    const season = seasonAt(Date.now());
    if (season) addStamp(seasonStamp(season.id));
    if (online) void afterFinish();
    if (tableCode) void net.progress(tableCode, state.sessionId, { stage: ROUTE.length, type: event.typeCode }).then(view => { table = view ?? table; });
  }
});

/** 끝낸 판을 서버에 알리고, 그다음에 — 나를 부른 친구의 방명록에 남기, 지난번 고른 지역에 한 채, 내 방명록 집 받기. */
async function afterFinish() {
  const result = await net.finish(state.sessionId, state.answers);
  stats = result ?? stats;
  if (!result) return; // 응답이 없으면 방명록·지역도 못 남긴다(서버가 끝낸 답으로 동네를 만든다)
  if (invite?.home) void net.visit(invite.home, { sessionId: state.sessionId, name: me.name, pick: me.pick });
  const region = loadRegion();
  if (region) void net.region(state.sessionId, region, me.pick);
  if (!home) { const made = await net.newHome(); if (made) { home = made; saveHome(made); } }
}

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

/**
 * 친구에게 보내기 / 답장. 링크에 내가 지은 동네(고른 열다섯 가지)가 담긴다 — 받은 친구의 동네에 함께 선다(사용자 10-14).
 * 방명록 집 번호도 담긴다 — 그 링크로 끝까지 걸은 사람이 내 방명록에 남는다.
 * 답장(reply)이면 나를 부른 친구(invite)도 같이 담는다 — 그 친구가 열면 걷지 않고 두 동네를 바로 본다(town.ts 의 openReply).
 * 카톡 안 브라우저는 저장 칸이 따로라 「지난번 내 동네」 를 못 읽을 수 있어서, 친구 동네를 링크에 다시 싣는다.
 */
function share(reply = false) {
  if (!state.result) return;
  const to = reply ? invite : undefined;
  const url = `${here()}?with=${encodeInvite({
    name: me.name, pick: me.pick, type: state.result, town, home: home?.id,
    ...(to ? { replyTo: { name: to.name, pick: to.pick, type: to.type, town: to.town } } : {}),
  })}`;
  addStamp('invite');
  ui.toast(to ? `답장 링크에는 ${to.name}님과 내가 지은 동네가 담겨요` : '보내는 링크에 내가 지은 동네(고른 열다섯 가지)가 담겨요');
  const text = to
    ? `${to.name}님, 답장이에요! 나는 ${josa(`「${TYPES[state.result].name}」`, '이래요', '래요')}. 우리 동네 나란히 놓고 봐요.`
    : `동네 한 바퀴 — 나는 ${josa(`「${TYPES[state.result].name}」`, '이래요', '래요')}. 너도 걸어 봐!`;
  // 그림이 준비됐고 받는 쪽이 파일을 받으면 그림 + 글(링크 포함), 아니면 지금처럼 링크만.
  const files = card && navigator.canShare?.({ files: [card] }) ? [card] : undefined;
  if (navigator.share) navigator.share(files ? { files, text: `${text}\n${url}` } : { title: '동네 한 바퀴', text, url }).catch(() => {});
  else void navigator.clipboard?.writeText(`${text} ${url}`).then(() => ui.toast('링크를 복사했어요'), () => ui.toast(url));
}

/**
 * 내 이웃 — 이름 지어 주기, 그리고 이웃 소식 받기(예산철 편지, seasons.ts).
 * 언덕에서 고를 때와 「내 동네」 판의 「편지 받기」 에서 연다. 이름 칸을 비우고 저장하면 지금 이름(keepName)을 지킨다.
 */
function neighborSheet(who: Pick<Neighbor, 'questionId' | 'key' | 'seed'>, keepName?: string) {
  const question = orderedQuestions.find(q => q.id === who.questionId)!;
  ui.neighborSheet(question[who.key].text, {
    save: typed => {
      const name = typed || keepName || '이웃';
      saveNeighbor({ questionId: who.questionId, key: who.key, seed: who.seed, name, at: Date.now() });
      addStamp('neighbor');
      ui.toast(`${josa(`「${name}」`, '이', '가')} 내 이웃이 됐어요. 다음에 오면 같이 걷고, 예산철엔 편지를 보내요.`);
    },
    contact: contactReady ? async form => {
      const checked = checkContact(form, Date.now());
      if (!checked.ok) return { ok: false, text: checked.error };
      const sent = await net.contact(checked.payload, { neighbor: loadNeighbor(), type: state.result ?? lastPlay?.type } /* 지역은 동의 항목에 없어 안 보낸다 */);
      if (!sent) return { ok: false, text: '지금은 받을 수 없어요. 조금 뒤에 다시 눌러 주세요.' };
      addStamp('news');
      return { ok: true, text: `고마워요! ${nextSeason(Date.now()).month}월에 이웃 편지를 보내 드릴게요.` };
    } : undefined,
    close: () => ui.endActions(true),
  });
}

/**
 * 「내 동네」 판(town.ts) — 끝 화면에서, 그리고 다시 온 사람은 시작 화면에서 걷지 않고(지난번 판으로) 연다.
 * 서버가 있을 때만 방명록·우리 지역이 붙는다. sessionId 는 우리 지역에 「그 판」으로 한 채 짓는 데 쓴다.
 */
function openHub(person: Person, sessionId: string, extra: { last?: Town; photo?: string; friend?: Friend } = {}, backText?: string) {
  const now = Date.now();
  openTown(shell, {
    me: person, ...extra, neighbor: loadNeighbor(),
    season: seasonAt(now), next: nextSeason(now),
    book: online && home ? async () => (await net.book(home!.id, home!.key))?.visits : undefined,
    region: loadRegion(),
    regionView: online ? region => net.regionView(region) : undefined,
    buildRegion: online ? async region => {
      const view = await net.region(sessionId, region, person.pick);
      if (view) saveRegion(region);
      return view;
    } : undefined,
    subscribe: contactReady ? () => { const n = loadNeighbor(); if (n) { ui.endActions(false); neighborSheet(n, n.name); } } : undefined,
  }, () => {}, backText);
}

/** 언덕에서 다 같이 폴짝 뛴 뒤 — 끝 화면과 할 수 있는 것들. */
function showEnd() {
  if (!state.result) return;
  scene?.setGuests(guests());
  lastTown = loadTown(); town = townFrom(state.answers);
  if (town) saveTown(town, { type: state.result, sessionId: state.sessionId });
  ui.end({ code: state.result, scores: scoreAnswers(orderedQuestions, state.answers), lines: endLines() }, {
    neighbor: () => {
      ui.endActions(false);
      ui.hint('언덕에서 한 명을 눌러 내 이웃으로 삼으세요');
      scene?.pickNeighbor(follower => { ui.hint(); neighborSheet(follower); });
    },
    others: online ? async () => ui.others((await net.stats()) ?? stats, mine()) : undefined,
    share: () => share(),
    reply: invite ? { label: `${invite.name}님에게 답장`, run: () => share(true) } : undefined,
    town: () => { if (town && state.result) openHub({ name: me.name, pick: me.pick, type: state.result, town }, state.sessionId, { last: lastTown, photo, friend: invite?.town ? invite : undefined }); },
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
