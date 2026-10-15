import '@fontsource/jua/400.css'; // 조각 판 — 「korean-400」 은 한글 통째 한 파일(360KB)이라 첫 화면이 무거웠다
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './ui.css';
import { createJourney, transition, currentQuestion, type Command } from './flow';
import { buildGameResponse, orderedQuestions, displayOptions, type GameResponse } from './response';
import { scoreAnswers } from './score';
import { ROUTE, TYPES, REPLIES } from './content';
import { createEvents, type GameEvent } from './events';
import { Controls } from './input';
import { createUI } from './ui';
import { attachEffects } from './effects';
import { unlockAudio, isMuted, setMuted, playVillageMusic, sfx } from './sfx';
import {
  loadMe, saveMe, loadNeighbor, saveNeighbor, decodeInvite, encodeInvite, cleanTableCode, josa, townFrom, saveTown,
  loadHome, saveHome, addStamp, loadRegion, saveRegion, readNeighborParam, loadLast, type Me, type Town, type Neighbor,
} from './profile';
import { openTown, openReply, openLetter, openLogin, type Person, type LoginOpts } from './town';
import { openBus, openCounsel, openDok, openFinance, openHouse, openBoard, openTax, openWorks, noteCard, loadMarks, rememberMine, loadPocket, savePocket, questHook } from './places';
import { PLACES, dropsOn, kstDay, worksAt, type PlaceId, type Drop } from './village';
import { nameFrom } from './look';
import { seasonOf, skyAt, type Season } from './draw';
import { providers, start as startLogin, finish as finishLogin, justLoggedIn, keepSynced, current as loginNow, logout, forget, PROVIDER_NAME } from './login';
import { seasonAt, nextSeason, seasonById } from './seasons';
import { seasonStamp, eventStamp, EVENTS } from './stamps';
import { checkContact } from './contact';
import { quizFor } from './quiz';
import { questsOn, QUEST_REWARD } from './quests';
import { net, TABLES } from './net';
import type { Stats, TableView, VillageView } from './api';
import type { JourneyScene, SceneCommand, Guest } from './scenes/JourneyScene';
import type { VillageScene } from './scenes/VillageScene';

const root = document.querySelector<HTMLElement>('#game-root')!;
const params = new URLSearchParams(location.search);
const invite = decodeInvite(params.get('with')); // 나를 부른 친구 — 끝에 언덕에서 만난다. replyTo 가 있으면 답장(걷기 전에 두 동네를 본다)
// 이웃의 편지(?letter=2026-dec&nb=…) — 이 기기에 이웃이 없으면 편지 쓴 이웃을 내 이웃으로 들인다(그래야 같이 걷는다).
const letterSeason = seasonById(params.get('letter'));
const letterNeighbor = readNeighborParam(params.get('nb'));
if (letterSeason && letterNeighbor && !loadNeighbor()) saveNeighbor({ ...letterNeighbor, at: Date.now() });
const returning = loadNeighbor(); // 지난번 내 이웃 — 편지에 쓴다. 걷기 판엔 데려가지 않는다(사용자 10-14 「처음 시작할 때 애가 한 명 이미 따라다니네」 → 빼기, 마을에선 따라다닌다)
const eventCode = params.get('stamp');
const gotEvent = (() => { const id = eventStamp(eventCode); return id && addStamp(id) ? EVENTS[eventCode!] : undefined; })(); // 현장 도장(?stamp=)
let home = loadHome(); // 내 방명록 집 — 끝까지 걸으면 서버에서 받아 둔다
let tableCode = cleanTableCode(params.get('table'));
let table: TableView | undefined;
let me: Me = loadMe();
// randomUUID 는 https(또는 이 컴퓨터)에서만 있다 — 와이파이 주소(http)로 폰에서 여는 개발판 시험에서 멈췄다. getRandomValues 는 어디서나 된다.
const newSessionId = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? '-' : '') + b.toString(16).padStart(2, '0')).join('');
let state = createJourney(newSessionId(), Date.now());
let response: GameResponse | undefined;
let stats: Stats | undefined;
let scene: JourneyScene | undefined;
let game: import('phaser').Game | undefined;
let pendingReveal: string | undefined;
let frame = 0;
let poll: ReturnType<typeof setInterval> | undefined;
let card: File | undefined; // 공유 그림 — 미리 만들어 둔다(아래 prepareCard)
let photo: string | undefined; // 주민증 증명사진 — 내 모습 고르기 끝에 찍는다
let town: Town | undefined; // 이번에 지은 동네(링크·지난번 판에 싣는다)
let cardFor: string | undefined;
const bus = createEvents();
const abort = new AbortController();
const view = { w: 360, h: 640, dpr: 1 };
const here = () => `${location.origin}${location.pathname}`;
/** 연락처 칸은 보유 기간이 정해지기 전까지 이 컴퓨터의 개발판에서만 보인다(README 「연락처 — 켜기 전에」). */
const contactReady = import.meta.env.DEV;
/** 게임 서버(다른 사람들 마음·방명록·우리 지역, 테이블은 TABLES 일 때만)가 있나. 서버 없는 시험판엔 없다 — 그때는 그 단추들을 숨긴다. */
let online = false;
/** 지난번 판 — 유형이 남은 판(10-14 뒤)이면 다시 온 사람이다. */
let lastPlay = loadLast();
/** 마을(기획 4차) — 지금 어디(걷기 판 / 마을), 마을에 어디서 나타나나, 판이 열려 있나(그동안 나는 멈춘다). */
let where: 'walk' | 'village' = 'walk';
let villageStart: 'gate' | 'plaza' = 'plaza';
let village: VillageScene | undefined;
let villageView: VillageView | undefined;
let panelOpen = false;
/** 끝낸 판을 서버에 알린 뒤에야 마을에 들를 수 있다(서버는 끝낸 판만 받는다). */
let finishing: Promise<void> = Promise.resolve();

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
const controls = new Controls(ui.surface, () => {
  if (where === 'village') return !panelOpen;
  if (state.phase === 'arrived') return Boolean(scene?.hillOpen()) && !ui.busy(); // 언덕 — 빛 아치가 핀 뒤, 판이 덮지 않았을 때
  return !state.paused && ['walking', 'question', 'reply'].includes(state.phase);
});
const stopEffects = attachEffects(bus);

function notes() {
  const lines: string[] = [];
  if (invite) lines.push(`${invite.name}님이 이 동네로 불렀어요. 끝에 언덕에서 만나요.`);
  if (invite?.home && online) lines.push(`끝까지 걸으면 ${invite.name}님 동네 방명록에 내 이름·모습·유형이 남아요.`);
  if (tableCode) lines.push(`테이블 ${tableCode} 에 앉았어요. 끝에 다 같이 모여요.`);
  const season = seasonAt(Date.now());
  if (season) lines.push(`지금은 ${season.name} — 이번 철에 걸으면 주민증에 철 도장이 찍혀요.`);
  if (gotEvent) lines.push(`「${gotEvent}」 현장 도장을 받았어요. 주민증에 찍혀 있어요.`);
  ui.notes(lines);
}
notes();
const statsReady = net.stats().then(found => {
  online = Boolean(found);
  stats = found;
  if (!online || !TABLES) tableCode = undefined;
  ui.online(online && TABLES);
  notes();
});

const shell = root.querySelector<HTMLElement>('.g')!;

// 로그인(login.ts) — 키를 넣기 전 공개판엔 단추가 없다. 카카오·구글에서 돌아왔으면 확인하고 다시 연다.
const loginOpts: LoginOpts = { providers: providers(), current: loginNow, start: startLogin, logout, forget };
keepSynced();
void finishLogin().then(result => {
  if (result === 'failed') ui.toast('로그인하지 못했어요. 조금 뒤에 다시 해 주세요');
  if (result === 'cancelled') ui.toast('로그인을 그만뒀어요');
});
const loggedIn = justLoggedIn();
if (loggedIn) ui.toast(`${PROVIDER_NAME[loggedIn]}로 주민증을 지켰어요`); // 마을이 열리면 주민센터를 바로 연다(enteredVillage)
else if (loginOpts.providers.length && !loginNow()) ui.loginOpen(() => openLogin(shell, loginOpts, () => {}));

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
    finishing = statsReady.then(() => (online ? afterFinish() : undefined));
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
    : `모여봐요 시민의 숲 — 나는 ${josa(`「${TYPES[state.result].name}」`, '이래요', '래요')}. 너도 걸어 봐!`;
  // 그림이 준비됐고 받는 쪽이 파일을 받으면 그림 + 글(링크 포함), 아니면 지금처럼 링크만.
  const files = card && navigator.canShare?.({ files: [card] }) ? [card] : undefined;
  if (navigator.share) navigator.share(files ? { files, text: `${text}\n${url}` } : { title: '모여봐요 시민의 숲', text, url }).catch(() => {});
  else if (navigator.clipboard) void navigator.clipboard.writeText(`${text} ${url}`).then(() => ui.toast('링크를 복사했어요'), () => ui.toast(url));
  else ui.toast(url); // 공유·복사가 다 없는 곳(https 가 아닌 주소) — 주소라도 보인다
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
      ui.toast(`${josa(`「${name}」`, '이', '가')} 내 이웃이 됐어요. 마을에서 같이 다니고, 예산철엔 편지를 보내요.`);
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
function openHub(person: Person, sessionId: string, extra: { photo?: string } = {}, backText?: string, onClose = () => {}) {
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
    login: loginOpts,
  }, onClose, backText);
}

// ───────────────────────── 마을(기획 4차) ─────────────────────────
/** 마을에서 「나」 — 방금 걸었으면 이번 판, 아니면 지난번 판. */
function villageMe(): { sessionId: string; person: Person } | undefined {
  if (state.result && town) return { sessionId: state.sessionId, person: { name: me.name, pick: me.pick, type: state.result, town } };
  if (lastPlay?.type) return { sessionId: lastPlay.sessionId ?? '', person: { name: me.name, pick: me.pick, type: lastPlay.type, town: lastPlay.town } };
  return undefined;
}

const likeNote = async (id: string) => { const sid = villageMe()?.sessionId; return sid ? (await net.like(sid, id))?.likes : undefined; };
const reportNote = async (id: string) => { const sid = villageMe()?.sessionId; return Boolean(sid && (await net.report(sid, id))); };
const notesCard = noteCard(shell, { like: likeNote, report: reportNote });

/** 언덕의 빛 아치를 지났다(화면 읽기 도구는 숨은 단추로) — 언덕이 하얗게 바래고, 마을 남쪽 문에서 나타난다. */
function toVillage() {
  if (where === 'village' || !game) return;
  clearInterval(poll);
  villageStart = 'gate';
  scene?.leave(() => { game!.scene.stop('journey'); game!.scene.start('village'); });
}

/** 마을 장면이 섰다 — 위 띠를 마을 것으로, 서버에 「들렀다」 알리고 다녀간 사람들을 세운다. */
function enteredVillage() {
  where = 'village';
  ui.village({ phone: openPhone });
  playVillageMusic(skyAt(clock().hour).night); // 마을에만 잔잔한 오르골(소리 단추로 같이 꺼진다)
  ui.villagePocket(loadPocket(kstDay(Date.now())).coins, toWorks);
  village?.setQuestMarks(openQuests().map(q => q.place));
  if (!online) village?.setWorks(loadPocket(kstDay(Date.now())).given); // 서버 없는 시험판 — 내가 넣은 동전만
  if (villageStart === 'plaza') {
    if (gotEvent) ui.toast(`「${gotEvent}」 현장 도장을 받았어요. 주민센터 주민증에 찍혀 있어요.`);
    if (loggedIn) openPlace('hub');
  }
  void meetVillage();
}

async function meetVillage() {
  await statsReady; await finishing;
  if (!online) return;
  const sid = villageMe()?.sessionId;
  const view = (sid ? await net.here(sid, me.pick) : undefined) ?? (await net.village(sid || undefined));
  if (view) showVillage(view);
}

function showVillage(view: VillageView) {
  villageView = view;
  // 내 쪽지는 광장에 세우지 않는다 — 내 모습을 한 주민이 하나 더 서성이면 내가 둘로 보인다(쪽지판 목록엔 있다).
  const mine = new Set(loadMarks().mine);
  village?.setCrowd({ ...view, notes: view.notes.filter(n => !mine.has(n.id)) });
  village?.setWorks(view.coins ?? 0);
  ui.villageToday(view.today);
}

// ── 동물의 숲에서 빌린 것(10-14) — 실제 시각·철, 나무에서 줍기, 주민 폰 ──
const SEASON_NAME: Record<Season, string> = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
/** 지금 철·시각. 개발판은 ?season=winter&hour=22 처럼 바꿔 본다(공개판엔 없다). */
function clock() {
  const now = new Date();
  const dev = import.meta.env.DEV ? params : undefined;
  const season = (['spring', 'summer', 'autumn', 'winter'] as const).find(s => s === dev?.get('season')) ?? seasonOf(now.getMonth() + 1);
  const hour = dev?.has('hour') ? Number(dev.get('hour')) % 24 : now.getHours();
  return { season, hour, now };
}
/** 오늘 떨어지는 것에서 이 기기가 이미 주운 나무를 뺀다. */
function todaysDrops(trees: number) {
  const pocket = loadPocket(kstDay(Date.now())), drops = dropsOn(kstDay(Date.now()), trees);
  for (const tree of pocket.taken) drops.delete(tree);
  return drops;
}
function picked(tree: number, kind: Drop) {
  const pocket = loadPocket(kstDay(Date.now()));
  if (pocket.taken.includes(tree)) return;
  pocket.taken.push(tree);
  if (kind === 'coin') pocket.coins++; else pocket.fruits++;
  const first = kind === 'coin' && !pocket.told;
  if (first) pocket.told = true;
  savePocket(pocket);
  ui.villagePocket(pocket.coins, toWorks);
  // 첫 동전 — 공사터 주민이 넣는 곳을 알려 준다(한 번만). 「나중에」 해도 위 띠 동전을 누르면 공사터로 간다.
  if (first) ui.villageNotice(nameFrom('npc:works'), `동전을 주웠네요! 마을 공사터에 넣으면 모두의 동전과 모여 ${josa(worksAt(villageView?.coins ?? pocket.given).now?.name ?? '새것', '이', '가')} 지어져요.`,
    [{ label: '공사터로 가기', run: toWorks }, { label: '나중에' }]);
}
// ── 오늘의 부탁(10-14 ⓓ) — quests.ts 규칙, 해낸 것은 주머니에 ──
const todaysQuests = () => questsOn(kstDay(Date.now()));
/** 아직 안 들어준 부탁이 있는 건물 — 마을 「!」. */
const openQuests = () => { const done = loadPocket(kstDay(Date.now())).quests; return todaysQuests().filter(q => !done.includes(q.id)); };
questHook.line = id => openQuests().find(q => q.place === id)?.ask;
questHook.fire = questEvent;
function questEvent(event: string) {
  const pocket = loadPocket(kstDay(Date.now()));
  for (const q of todaysQuests()) {
    if (q.event !== event || pocket.quests.includes(q.id)) continue;
    const n = (pocket.progress[q.id] ?? 0) + 1;
    if (q.count && n < q.count) { pocket.progress[q.id] = n; savePocket(pocket); continue; }
    pocket.quests.push(q.id); pocket.coins += QUEST_REWARD; savePocket(pocket);
    ui.villagePocket(pocket.coins, toWorks);
    sfx.coin();
    ui.say(nameFrom(`npc:${q.place}`), `부탁 들어줘서 고마워요! 동전 ${QUEST_REWARD}개 드릴게요.`, 2800);
    village?.setQuestMarks(openQuests().map(x => x.place));
  }
}
/** 주민 폰 「오늘의 부탁」 — 셋과 해냈는지. 누르면 그 건물로. */
function openQuestList() {
  const done = loadPocket(kstDay(Date.now())).quests;
  ui.placeList(todaysQuests().map(q => ({
    name: `${done.includes(q.id) ? '✓ ' : ''}${PLACES.find(p => p.id === q.place)!.name} · ${nameFrom(`npc:${q.place}`)}`,
    line: done.includes(q.id) ? '들어줬어요. 내일 또 부탁할게요.' : q.ask,
    run: () => village?.jump(q.place, () => openPlace(q.place)),
  })), '오늘의 부탁');
}

/** 공사터 문 앞으로 가서 판을 연다. */
function toWorks() { if (!panelOpen) village?.jump('works', () => openPlace('works')); }
/** 주민 폰 — 날짜·시각·철과 앱 여섯. 건물 앱은 그 문 앞으로 옮겨 가서 연다(지도와 같은 길). */
function openPhone() {
  if (panelOpen) return;
  const { season, now } = clock(), pocket = loadPocket(kstDay(Date.now()));
  const head = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })} · ${SEASON_NAME[season]} · 동전 ${pocket.coins} · 열매 ${pocket.fruits}`;
  const go = (id: PlaceId) => () => village?.jump(id, () => openPlace(id));
  ui.phone(head, [
    { icon: '🗺️', name: '지도', run: openMap },
    { icon: '📝', name: '오늘의 부탁', run: openQuestList },
    { icon: '🪪', name: '주민증', run: go('hub') },
    { icon: '💰', name: '세금 도감', run: go('tax') },
    { icon: '🏗️', name: '마을 공사', run: go('works') },
    { icon: '📌', name: '쪽지판', run: go('board') },
    { icon: '🚌', name: '한 바퀴 더', run: go('bus') },
  ]);
}

/** 지도 — 건물 목록. 고르면 그 문 앞으로 옮겨 가서 연다. */
function openMap() {
  if (panelOpen) return;
  ui.placeList(PLACES.map(p => ({ name: p.name, line: p.line, run: () => village?.jump(p.id, () => openPlace(p.id)) })));
}

/** 문 앞에 닿았다 — 그 건물의 판. 판이 열린 동안 나는 멈추고, 닫으면 다시 걷는다. */
function openPlace(id: PlaceId) {
  const who = villageMe();
  ui.villageNotice();
  setTimeout(() => questEvent(`open:${id}`), 1600); // 판을 열고 주민 말을 들은 뒤에
  panelOpen = true; village?.setPaused(true); notesCard.hide(); ui.closeSheet();
  const done = () => { panelOpen = false; village?.setPaused(false); };
  if (id === 'hub') { if (who) openHub(who.person, who.sessionId, { photo }, '← 마을로', done); else done(); }
  else if (id === 'bus') openBus(shell, loadNeighbor(), () => { location.href = `${here()}?walk`; }, done);
  else if (id === 'counsel') openCounsel(shell, done);
  else if (id === 'dok') openDok(shell, done);
  else if (id === 'finance') openFinance(shell, loadRegion(), done);
  else if (id === 'tax') openTax(shell, loadRegion(), done);
  else if (id === 'works') {
    const sid = who?.sessionId, pocket = loadPocket(kstDay(Date.now()));
    openWorks(shell, {
      total: online ? villageView?.coins ?? 0 : pocket.given, pocket, online,
      give: async n => {
        const fresh = loadPocket(kstDay(Date.now()));
        let took = n, total: number;
        if (online) {
          const done = sid ? await net.coins(sid, n) : undefined;
          if (!done) return undefined;
          took = done.took; total = done.view.coins; showVillage(done.view);
        } else total = fresh.given + n;
        fresh.coins -= took; fresh.given += took; savePocket(fresh);
        questEvent('give');
        pocket.coins = fresh.coins; ui.villagePocket(fresh.coins);
        if (!online) village?.setWorks(fresh.given);
        return { took, total };
      },
      toTax: () => village?.jump('tax', () => openPlace('tax')),
    }, done);
  }
  else if (id === 'house') openHouse(shell, done);
  else openBoard(shell, {
    view: villageView, online, myName: me.name, like: likeNote, report: reportNote,
    refresh: async () => { const fresh = await net.village(who?.sessionId || undefined); if (fresh) showVillage(fresh); return fresh; },
    post: async text => {
      const sid = who?.sessionId;
      const made = sid ? await net.note(sid, me.name, me.pick, text) : undefined;
      if (made) { rememberMine(made.note.id); showVillage(made.view); }
      return made;
    },
  }, done);
}

/**
 * 개발판 전용 지름길 `?end` — 열다섯 방을 건너뛰고 언덕(끝 화면)부터, `?village` — 마을부터(사용자 10-14 「처음부터 말고 마지막만」).
 * 답은 아무렇게나 골라 flow.ts 규칙 그대로 끝까지 돌리고, 장면에는 따라온 주민만 세워 언덕으로 보낸다. 공개판(빌드)에는 없다.
 */
function autoAnswer(upTo = orderedQuestions.length) {
  let at = Math.max(Date.now(), state.lastAt);
  const arrived: GameEvent[] = [];
  const go = (command: UntimedCommand) => { const next = transition(state, { ...command, at: at++ } as Command); state = next.state; arrived.push(...next.events.filter(e => e.type === 'journey.arrived')); };
  const picked: { questionId: string; side: 'left' | 'right'; key: 'a' | 'b' }[] = [];
  go({ type: 'start' });
  ROUTE.forEach((stage, stageIndex) => {
    if (picked.length >= upTo) return;
    for (const id of stage.ids) {
      if (picked.length >= upTo) return;
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const question = orderedQuestions.find(q => q.id === id)!;
      picked.push({ questionId: id, side, key: displayOptions(state.sessionId, question).find(o => o.side === side)!.key });
      go({ type: 'visible', questionId: id }); go({ type: 'approach', questionId: id, side }); go({ type: 'answer', questionId: id, level: Math.floor(Math.random() * REPLIES.length) });
    }
    go({ type: 'exit', stageIndex });
  });
  response = buildGameResponse(state);
  return { picked, arrived };
}
/** 개발판 전용 `?room=번호`(0부터) — 앞 방들은 아무렇게나 답한 셈 치고 그 방부터(놀이 방을 바로 보려고, 10-14). 공개판엔 없다. */
function skipToRoom(n: number) {
  ui.hideIntro();
  const room = Math.max(0, Math.min(orderedQuestions.length - 1, Math.floor(n)));
  const { picked } = autoAnswer(room - room % 3); // 동네 첫 방까지는 정식으로(버스 넘기는 차례가 맞게)
  for (let i = room - room % 3; i < room; i++) { // 같은 동네 앞 방들
    const q = orderedQuestions[i], side = Math.random() < 0.5 ? 'left' : 'right';
    picked.push({ questionId: q.id, side, key: displayOptions(state.sessionId, q).find(o => o.side === side)!.key });
    let at = Math.max(Date.now(), state.lastAt);
    for (const command of [{ type: 'visible', questionId: q.id }, { type: 'approach', questionId: q.id, side }, { type: 'answer', questionId: q.id, level: 1 }] as UntimedCommand[]) state = transition(state, { ...command, at: at++ } as Command).state;
  }
  ui.render(state);
  scene?.skipToRoom(room, picked);
}
function skipToEnd() {
  ui.hideIntro();
  const { picked, arrived } = autoAnswer();
  ui.render(state);
  bus.emit(arrived); // 도장·서버 알리기는 평소처럼
  scene?.skipToEnd(picked);
}

/** 언덕에서 다 같이 폴짝 뛴 뒤 — 끝 화면과 할 수 있는 것들. */
function showEnd() {
  if (!state.result) return;
  scene?.setGuests(guests());
  town = townFrom(state.answers);
  if (town) saveTown(town, { type: state.result, sessionId: state.sessionId });
  ui.end({ code: state.result, scores: scoreAnswers(orderedQuestions, state.answers), lines: endLines() }, {
    neighbor: () => {
      ui.endActions(false);
      ui.hint('이웃으로 삼을 주민을 눌러요');
      scene?.pickNeighbor(follower => { ui.hint(); neighborSheet(follower); });
    },
    others: online ? async () => ui.others((await net.stats()) ?? stats, mine()) : undefined,
    share: () => share(),
    reply: invite ? { label: `${invite.name}님에게 답장`, run: () => share(true) } : undefined,
    village: toVillage,
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
    // 마을 간판은 캔버스에 구워 두므로 둥근 글꼴이 먼저 와 있어야 한다(늦으면 기본 글꼴로 굳는다). 1.5초까지만 기다린다.
    await Promise.race([Promise.all(['16px Jua', '600 16px "Pretendard Variable"'].map(f => document.fonts?.load(f, '마을'))), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
    const [{ default: Phaser }, { JourneyScene }, { VillageScene }] = await Promise.all([import('phaser'), import('./scenes/JourneyScene'), import('./scenes/VillageScene')]);
    const journey = new JourneyScene({
      state: () => state, send, visible, subscribe: listener => bus.subscribe(listener),
      view: () => view, controls, ui, ready: () => { ui.ready(); if (import.meta.env.DEV && params.has('end')) skipToEnd(); else if (import.meta.env.DEV && params.has('room')) skipToRoom(Number(params.get('room'))); },
      pick: () => me.pick, name: () => me.name, arrived: showEnd, enter: toVillage,
      busCaption: (stage, skip) => {
        if (stage < 0) { ui.busCaption(); return; }
        ui.busCaption(ROUTE[stage].area, tablemates().map(m => `${m.name} — ${whereIs(m.stage)}`), skip);
      },
      // 버스 예산 퀴즈(10-14 ⓑ) — 맞히면 동전 하나(마을 공사터에 넣는 그 동전). stage 는 버스가 가는 다음 동네 번호(busCaption 과 같다).
      busQuiz: (stage, done) => {
        const { quiz, choices } = quizFor(state.sessionId, stage);
        ui.busQuiz(ROUTE[stage].area, quiz, choices, correct => {
          if (correct) { const pocket = loadPocket(kstDay(Date.now())); pocket.coins++; savePocket(pocket); }
          done();
        });
        return true;
      },
    });
    scene = journey;
    const villageScene = new VillageScene({
      view: () => view, controls, pick: () => me.pick, neighbor: loadNeighbor, start: () => villageStart,
      enter: openPlace, near: note => (note ? notesCard.show(note) : notesCard.hide()), ready: enteredVillage,
      clock, drops: todaysDrops, picked, event: questEvent,
    });
    village = villageScene;
    if (import.meta.env.DEV) Object.assign(window, { __village: villageScene, __journey: journey }); // 개발판 봇이 장면 안 자리를 읽는다(공개판엔 없다)
    // 폰 화면이 흐려지지 않게 캔버스는 기기 화소로 만들고, 화면에는 CSS 크기로 줄여 보인다.
    const phaser = new Phaser.Game({
      type: Phaser.AUTO, parent: ui.surface, backgroundColor: '#fffaf0',
      width: view.w * view.dpr, height: view.h * view.dpr,
      scale: { mode: Phaser.Scale.NONE, zoom: 1 / view.dpr },
      render: { antialias: true }, audio: { noAudio: true }, banner: false,
      scene: startInVillage ? [villageScene, journey] : [journey, villageScene], // 맨 앞 장면만 바로 선다
    });
    game = phaser;
    const resize = new ResizeObserver(() => {
      measure();
      phaser.scale.resize(view.w * view.dpr, view.h * view.dpr);
      phaser.scale.setZoom(1 / view.dpr);
      if (phaser.scene.isActive('journey')) journey.relayout(); // 마을로 넘어간 뒤엔 걷기 장면이 닫혀 있다
      if (phaser.scene.isActive('village')) villageScene.relayout();
    });
    resize.observe(ui.surface);
    abort.signal.addEventListener('abort', () => resize.disconnect());
  } catch (error) { console.error(error); ui.loadError(); }
}
// ── 시작 — 다시 온 사람은 걷지 않고 마을에서(사용자 10-14, 2ⓐ). 걸으러 온 링크(?walk·친구 초대·테이블)면 걷기 화면. ──
if (import.meta.env.DEV && params.has('village') && !lastPlay?.type) {
  // 개발판 ?village — 아직 한 판도 안 끝낸 브라우저면 아무렇게나 한 판을 끝낸 셈 치고 마을로.
  bus.emit(autoAnswer().arrived);
  town = townFrom(state.answers);
  saveTown(town!, { type: state.result, sessionId: state.sessionId });
  lastPlay = loadLast();
}
const startInVillage = Boolean(lastPlay?.type) && !params.has('walk') && !invite && !tableCode && !(import.meta.env.DEV && params.has('end'));
if (startInVillage) { ui.hideIntro(); window.addEventListener('pointerdown', unlockAudio, { once: true }); } // 「출발」 을 안 누르니 첫 손길에 소리를 푼다
else if (lastPlay?.type) ui.homeOpen(() => { location.href = here(); }); // 걸으러 왔지만 마을로 갈 수도
// 링크로 들어온 사람에게 먼저 보이는 판 — 답장(두 동네 나란히), 이웃의 편지. 마을에서 연 편지의 「같이 걷기」 는 걸으러 간다.
if (invite?.replyTo) openReply(shell, invite.replyTo, invite, () => {});
else if (letterSeason) openLetter(shell, letterSeason, returning, me.name, () => {}, startInVillage ? () => { location.href = `${here()}?walk`; } : undefined);
void boot();

// 저장 단계에서 붙일 자리. 답은 「다른 사람들 마음」 서버로만 간다(개인정보 없음).
export function getPendingResponse() { return response ? structuredClone(response) : undefined; }

if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frame); clearInterval(poll); abort.abort(); stopEffects(); bus.clear(); controls.destroy(); game?.destroy(true); ui.destroy();
});
