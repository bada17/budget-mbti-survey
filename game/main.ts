import '@fontsource/jua/400.css'; // 조각 판 — 「korean-400」 은 한글 통째 한 파일(360KB)이라 첫 화면이 무거웠다
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './ui.css';
import { createJourney, transition, currentQuestion, type Command } from './flow';
import { buildGameResponse, orderedQuestions, displayOptions, type GameResponse } from './response';
import { scoreAnswers, typeCode } from './score';
import { ROUTE, TYPES, REPLIES, AXES, type TypeCode } from './content';
import { createEvents, type GameEvent } from './events';
import { Controls } from './input';
import { createUI, GAME_URL } from './ui';
import { attachEffects } from './effects';
import { unlockAudio, isMuted, setMuted, playVillageMusic, sfx } from './sfx';
import {
  loadMe, saveMe, loadNeighbor, saveNeighbor, decodeInvite, encodeInvite, josa, townFrom, saveTown,
  loadHome, saveHome, addStamp, loadRegion, saveRegion, readNeighborParam, loadLast, loadOwned, saveOwned, type Me, type Town, type Neighbor, type Region,
  loadLogin, saveLogin,
} from './profile';
import { openTown, openReply, openLetter, openLogin, openLoggedIn, openCompare, loginBox, type Person, type LoginOpts } from './town';
import { openBus, openCounsel, openDok, openFinance, openHouse, openBoard, openTax, openWorks, openCuts, noteCard, noteView, loadMarks, rememberMine, loadPocket, savePocket, ACCESSORY_PRICE, HOME_LINK, type NoteActions } from './places';
import { openArcade } from './arcade';
import { PLACES, keeperName, placeName, dropsOn, kstDay, worksAt, NOTE_GAP_MS, type PlaceId, type Drop } from './village';
import { seasonOf, skyAt, CANVAS_TEXT, type Season } from './draw';
import { providers, start as startLogin, finish as finishLogin, returning as returningFromLogin, arrivedFromKakao, justLoggedIn, takeLoginEmail, takeUnsaved, takeFresh, takeBack, keepSynced, syncNow, loginKey, current as loginNow, admin as loginAdmin, logout, PROVIDER_NAME } from './login';
import { seasonAt, nextSeason, seasonById } from './seasons';
import { seasonStamp, eventStamp } from './stamps';
import { checkContact, type ContactForm } from './contact';
// import { quizFor } from './quiz'; // [나중에 살림: 버스 퀴즈]
import { ERRANDS, ERRAND_COIN, errandDay, errandsShown, finishErrand, loadErrands, saveErrands, type Choice } from './quests';
import { REWARDS, wearing, nameFrom } from './look';
import { net, lastFailure } from './net';
import type { Stats, VillageView } from './api';
import type { JourneyScene, SceneCommand, Guest } from './scenes/JourneyScene';
import type { VillageScene } from './scenes/VillageScene';
import { gameStorage, useInspectionStorage, useTemporaryStorage } from './storage';
import { createCompletionQueue } from './completion';
import { arrival } from './source';
import { mountInspectionTools } from './inspection';
import { PUB } from './pub';
import { feedbackGate, feedbackSent } from './pub-feedback';
import { openCheerBoard } from './cheer-board';

const root = document.querySelector<HTMLElement>('#game-root')!;
const params = new URLSearchParams(location.search);
if (PUB) useTemporaryStorage();
const realLogin = loadLogin();
if (params.has('inspect')) root.textContent = '관리자 권한을 확인하고 있어요…';
const inspecting = Boolean(params.has('inspect') && realLogin && await net.startInspection(realLogin.key).catch(() => false));
if (inspecting) {
  useInspectionStorage();
  saveLogin({ ...realLogin!, admin: true });
  saveMe({ name: '점검하는 주민', pick: loadMe().pick });
  savePocket({ ...loadPocket(kstDay(Date.now())), coins: 300 });
}
const completion = createCompletionQueue(net.finish);
const arrivedPlain = !location.search && !location.hash; // 소개 페이지용 — 아무것도 안 붙은 주소로 왔나(로그인 길이 주소를 지우기 전에 잰다)
const invite = decodeInvite(params.get('with')); // 나를 부른 친구 — 끝에 언덕에서 만난다. replyTo 가 있으면 답장(걷기 전에 두 동네를 본다)
// 이웃의 편지(?letter=2026-dec&nb=…) — 이 기기에 이웃이 없으면 편지 쓴 이웃을 내 이웃으로 들인다(그래야 같이 걷는다).
const letterSeason = seasonById(params.get('letter'));
const cardLink = /^[A-Za-z0-9-]{2,40}$/.test(params.get('card') ?? '') ? params.get('card')! : undefined; // 친구가 보낸 문제 카드
const letterNeighbor = readNeighborParam(params.get('nb'));
if (letterSeason && letterNeighbor && !loadNeighbor()) saveNeighbor({ ...letterNeighbor, at: Date.now() });
const returning = loadNeighbor(); // 지난번 내 이웃 — 편지에 쓴다. 걷기 판엔 데려가지 않는다(사용자 10-14 「처음 시작할 때 애가 한 명 이미 따라다니네」 → 빼기, 마을에선 따라다닌다)
const eventCode = params.get('stamp');
// 현장 도장(?stamp=) — 기록은 조용히 그대로 찍는다(살리면 받은 게 보인다). 알림·도장판 칸은 [나중에 살림: 철·현장 도장](사용자 10-19 「일단 빼봐」).
{ const id = eventStamp(eventCode); if (id) addStamp(id); }
let home = loadHome(); // 내 방명록 집 — 끝까지 걸으면 서버에서 받아 둔다
let me: Me = loadMe();
// randomUUID 는 https(또는 이 컴퓨터)에서만 있다 — 와이파이 주소(http)로 폰에서 여는 개발판 시험에서 멈췄다. getRandomValues 는 어디서나 된다.
const newSessionId = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? '-' : '') + b.toString(16).padStart(2, '0')).join('');
let state = createJourney(newSessionId(), Date.now());
// 유입(10-21, game/source.ts) — 이 브라우저에 처음 왔으면 「들어옴」 한 줄. 점검 중엔 안 센다. 끝까지는 finish 가, 보냄은 sendLink 가 싣는다.
if (!inspecting && !PUB) { const { src, fresh } = arrival(); if (fresh) void net.hit('arrive', state.sessionId, src); }
let sharedOnce = false;
let response: GameResponse | undefined;
let stats: Stats | undefined;
let scene: JourneyScene | undefined;
let game: import('phaser').Game | undefined;
let pendingReveal: string | undefined;
let frame = 0;
let card: File | undefined; // 공유 그림 — 미리 만들어 둔다(아래 prepareCard)
let town: Town | undefined; // 이번에 지은 동네(링크·지난번 판에 싣는다)
let cardFor: string | undefined;
const bus = createEvents();
const abort = new AbortController();
const view = { w: 360, h: 640, dpr: 1 };
const here = () => `${location.origin}${location.pathname}`;
const shareAt = () => (import.meta.env.PROD ? GAME_URL : here()); // 남에게 보내는 링크 — 옛 주소(github.io)로 들어와 있어도 새 주소로 나간다
/** 연락처 칸은 보유 기간이 정해지기 전까지 이 컴퓨터의 개발판에서만 보인다(README 「연락처 — 켜기 전에」). */
const contactReady = import.meta.env.DEV || inspecting;
/** 게임 서버(다른 사람들 마음·방명록·우리 지역)가 있나. 서버 없는 시험판엔 없다 — 그때는 그 단추들을 숨긴다. */
let online = false;
/** 지난번 판 — 유형이 남은 판(10-14 뒤)이면 다시 온 사람이다. */
let lastPlay = loadLast();
/** 걸으러 온 링크(?walk·친구 초대, 개발판 ?end) — 다시 온 사람이어도 걷기 화면에서 시작한다. */
const walkLink = params.has('walk') || PUB || Boolean(invite) || ((import.meta.env.DEV || inspecting) && params.has('end'));
/** 걷지 않고 마을로 — 걸으러 왔지만 지난번 판이 있는 사람(시작 화면 단추, 불러온 뒤 묻기). */
const goVillage = () => { location.href = inspecting ? `${here()}?inspect=1&village=1` : here(); };
/** 마을(기획 4차) — 지금 어디(걷기 판 / 마을), 마을에 어디서 나타나나, 판이 열려 있나(그동안 나는 멈춘다). */
let where: 'walk' | 'village' = 'walk';
let villageGuiding = false;
let villageStart: 'gate' | 'plaza' = 'plaza';
let village: VillageScene | undefined;
let villageView: VillageView | undefined;
let panelOpen = false;
let pocketBusy = false;
/** 끝낸 판을 서버에 알린 뒤에야 마을에 들를 수 있다(서버는 끝낸 판만 받는다). */
let finishing: Promise<void> = Promise.resolve();
/** 소개 페이지 「게임 하러 가기」 는 시작 화면 「출발」 을 건너뛴다(사용자 10-20 「이중으로 시작하기를 누르게 돼」). 아직 준비 중이면 준비되자마자 출발. */
let walkReady = false, walkOnReady = false;
const walkFromLanding = () => { unlockAudio(); if (walkReady) startWalk(); else walkOnReady = true; };
function startWalk() {
  walkOnReady = false;
  unlockAudio();
  ui.hideIntro();
  ui.dresser(me, {
    change: next => { me = next; scene?.setLook(next.pick); },
    done: next => { me = next; saveMe(next); send({ type: 'start' }); },
  });
  scene?.dress(); // 판을 먼저 열어야 판 위에 남은 자리를 잴 수 있다
}

const ui = createUI(root, {
  start: startWalk,
  retry: () => location.reload(),
  sound: () => { setMuted(!isMuted()); ui.setSound(isMuted()); if (!isMuted()) unlockAudio(); },
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
  // [나중에 살림: 철·현장 도장] 「지금은 ○○ — 이번 철에 걸으면 철 도장」 · 「「행사」 현장 도장을 받았어요」 두 줄(seasonAt·EVENTS)
  ui.notes(lines);
}
notes();
// 후원주점판은 서버 없는 판처럼 돈다(online 이 안 켜져 마을의 서버 단추가 숨는다) — 남기는 판이 없어 서버가 이 판을 모른다.
const statsReady = (PUB ? Promise.resolve(undefined) : net.stats()).then(found => {
  online = Boolean(found);
  stats = found;
  notes();
});

const shell = root.querySelector<HTMLElement>('.g')!;
if (inspecting || realLogin?.admin) mountInspectionTools(shell, inspecting);
if (params.has('inspect') && !inspecting) ui.toast('관리자 권한을 확인하지 못했어요. 관리자 계정으로 다시 로그인해 주세요.');

// 로그인(login.ts) — 단추는 늘 보이고 키가 없으면 「곧 열려요」. 카카오·구글에서 돌아왔으면 확인하고 다시 연다. 마을에선 주민센터 안내(hubGuide).
const loginOpts: LoginOpts = { providers: providers(), current: loginNow, admin: loginAdmin, start: startLogin, logout, news: contactReady };
keepSynced();
arrivedFromKakao(); // 카톡 안에서 구글을 눌러 밖 브라우저로 나왔으면 실어 온 기록을 합치고 바로 구글로
// 카카오·구글에서 돌아왔으면 확인이 끝날 때까지(서버 한 번 3~5초) 기다림 판으로 덮고 게임은 안 띄운다 — 끝나면 어차피 다시 연다(10-20 사용자 「작동했는지 모르겠어」).
const signingIn = returningFromLogin();
const unwait = signingIn ? ui.wait(`${PROVIDER_NAME[signingIn]}로 로그인하는 중이에요`, '시민증을 가져오고 있어요. 잠깐만 기다려 주세요.') : undefined;
const loginResult = finishLogin().then(result => {
  if (result !== 'done') unwait?.();
  if (result === 'failed') ui.toast('로그인하지 못했어요. 조금 뒤에 다시 해 주세요'); // 진단용 괄호는 뺐다(사용자 10-19 「실패했다고 뜨는 게 맞다」)
  if (result === 'cancelled') ui.toast('로그인을 그만뒀어요');
  return result;
});
const loggedIn = justLoggedIn();
// 로그인 칸에서 [선택] 소식 받기를 켰고 확인된 이메일이 있으면 「이 이메일로 소식 받기」 칸을 로그인 판 안에(openLoggedIn) — 연락처 칸이 켜진 판에서만.
const loginEmail = takeLoginEmail(), loginUnsaved = takeUnsaved(), loginFresh = takeFresh();
const offerNews = Boolean(loggedIn && loginEmail && contactReady && !loginUnsaved);
/** 로그인하러 가기 전에 보던 판(쪽지판·시민센터·우리 동네) — 됐다는 판을 닫으면 그리로(사용자 10-19, 다녀오면 페이지를 새로 여니 광장에서 다시 걸어가지 않게). */
let backTo = loggedIn ? takeBack() : undefined;
const unpause = () => { panelOpen = false; village?.setPaused(false); goBack(); };
// 됐다는 판(예전엔 2초 알림). 걸으러 온 링크에서 불러와 지난번 판이 생겼으면 「마을로 갈까요?」 도 묻는다(10-26 사용자 「불러오기 하면 마을로 갈까요? 물어보면」).
// 소식 받기 칸도 이 판 안에(10-26 — 전엔 판이 둘 이어 떴다).
if (loggedIn) { panelOpen = true; openLoggedIn(shell, loggedIn, { unsaved: loginUnsaved, fresh: loginFresh }, unpause, lastPlay?.type && walkLink ? goVillage : undefined, offerNews ? { email: loginEmail!, send: sendContact } : undefined); }
/** 판이 닫혔고 마을이 섰으면 돌아갈 판을 연다(어느 쪽이 나중이든 한 번). */
function goBack() {
  if (!backTo || panelOpen || where !== 'village') return;
  const to = backTo; backTo = undefined;
  const id: PlaceId = to === 'board' ? 'board' : 'hub';
  village?.jump(id, () => openPlace(id, to === 'hub:region' ? 'region' : undefined));
}
const loginLabel = loginNow() && `✓ ${PROVIDER_NAME[loginNow()!]}로 로그인됨`;
// 시작 화면 작은 단추는 하나만(10-26 사용자 ⓑ) — 지난번 판이 있으면 아래 「걷지 않고 마을로 가기」, 없으면 이 「내 시민증 불러오기」.
if (!lastPlay?.type && !PUB) ui.loginOpen(() => openLogin(shell, loginOpts, () => {}), loginLabel || undefined);

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

// ── 끝낸 판 — 서버에 알리기·다른 사람들 마음 ──
bus.subscribe(event => {
  if (event.type === 'journey.arrived' && !PUB) { // 후원주점판은 서버에도 이 기기에도 남기지 않는다(pub.ts)
    if (!completion.enqueue(state.sessionId, state.answers)) ui.toast('미저장 기록이 많아요. 연결을 복구한 뒤 화면을 닫아 주세요.');
    // 도장은 한 일에 찍는다(stamps.ts) — 한 바퀴, 그 철에 걸었으면 철 도장.
    addStamp('walk');
    const season = seasonAt(Date.now());
    if (season) addStamp(seasonStamp(season.id));
    // 처음 서버 부르기(/stats)가 실패했어도 끝낸 판은 다시 알린다 — 안 그러면 서버에 판이 없어 마을에서 동전·쪽지가 막힌다(10-20).
    // 그때는 마을 들어가기를 붙잡지 않고 뒤에서 — 닿으면 그때부터 온라인.
    finishing = statsReady.then(() => (online ? afterFinish() : void afterFinish()));
  }
});

/**
 * 끝낸 판을 서버에 알리고, 그다음에 — 나를 부른 친구의 방명록에 남기, 내 방명록 집 받기.
 * 우리 동네는 따로 짓지 않는다 — 로그인했으면 이번 판이 기록 묶음의 지난번 판이 되어(saveTown → keepSynced) 내 동네에 저절로 함께한다(api.ts regionView).
 */
async function afterFinish() {
  if (PUB) return;
  const result = await completion.flush();
  if (!result) return;
  stats = result.value;
  online = true; // 응답이 없으면 방명록도 못 남긴다(서버가 끝낸 답으로 동네를 만든다)
  if (invite?.home) void net.visit(invite.home, { sessionId: result.sessionId, name: me.name, pick: me.pick });
  if (!home) { const made = await net.newHome(); if (made) { home = made; saveHome(made); } }
}
window.addEventListener('online', () => { void afterFinish(); }, { signal: abort.signal });
void statsReady.then(() => afterFinish());

function guests(): Guest[] {
  const list: Guest[] = [];
  if (invite) list.push({ id: 'invite', name: invite.name, pick: invite.pick, label: `${invite.name} · ${TYPES[invite.type].name}` });
  return list;
}
function endLines() {
  const lines: string[] = [];
  if (invite) lines.push(`나를 부른 ${invite.name}님은 「${TYPES[invite.type].name}」`);
  return lines;
}
const mine = () => Object.fromEntries(Object.entries(state.answers).map(([id, value]) => [id, value <= 3 ? 'a' : 'b'])) as Record<string, 'a' | 'b'>;

/**
 * 공유 그림을 미리 찍어 둔다. 누른 뒤에 찍으면 아이폰 사파리가 「누른 직후」가 지났다며 공유창을 막는다.
 * 끝 화면 줄이 바뀌면 다시 찍는다.
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
function share(reply = false, copy = false) {
  if (inspecting) { ui.toast('점검 중에는 실제 공유를 보내지 않아요.'); return; }
  const files = card && navigator.canShare?.({ files: [card] }) ? [card] : undefined;
  // 후원주점판은 동네(열다섯 가지)가 없어 친구 링크 대신 본편 주소만
  if (PUB) { sendLink(copy, '함께해요 시민의 숲', `함께해요 시민의 숲 — 나는 ${josa(`「${TYPES[state.result!].name}」`, '이래요', '래요')}. 너도 걸어 봐!`, shareAt(), files); return; }
  // 방금 걸었으면 이번 판, 마을(시민센터 방명록, 10-20)에서 다시 온 사람이면 지난번 판(villageMe)
  const mine = villageMe()?.person;
  if (!mine) return;
  const to = reply ? invite : undefined;
  const url = `${shareAt()}?with=${encodeInvite({
    name: me.name, pick: me.pick, type: mine.type, town: mine.town, home: home?.id,
    ...(to ? { replyTo: { name: to.name, pick: to.pick, type: to.type, town: to.town } } : {}),
  })}`;
  addStamp('invite');
  ui.toast(to ? `답장 링크에는 ${to.name}님과 내가 지은 동네가 담겨요` : '보내는 링크에 내가 지은 동네(고른 열다섯 가지)가 담겨요');
  const text = to
    ? `${to.name}님, 답장이에요! 나는 ${josa(`「${TYPES[mine.type].name}」`, '이래요', '래요')}. 우리 동네 나란히 놓고 봐요.`
    : `함께해요 시민의 숲 — 나는 ${josa(`「${TYPES[mine.type].name}」`, '이래요', '래요')}. 너도 걸어 봐!`;
  // 그림이 준비됐고 받는 쪽이 파일을 받으면 그림 + 글(링크 포함), 아니면 지금처럼 링크만.
  sendLink(copy, '함께해요 시민의 숲', text, url, files);
}
/** 공유 창(폰 — 카톡이 그 안에) 또는 링크 복사(ui.ts shareButtons). 공유·복사가 다 없는 곳(https 가 아닌 주소)은 주소라도 보인다. */
function sendLink(copy: boolean, title: string, text: string, url: string, files?: File[]) {
  if (!inspecting && !PUB && !sharedOnce) { sharedOnce = true; void net.hit('share', villageMe()?.sessionId || state.sessionId); } // 「보냄」 은 한 페이지에 한 번(공유·복사 둘 다 눌러도)
  if (!copy && typeof navigator.share === 'function') { navigator.share(files ? { files, text: `${text}\n${url}` } : { title, text, url }).catch(() => {}); return; }
  if (navigator.clipboard) void navigator.clipboard.writeText(`${text} ${url}`).then(() => ui.toast('링크를 복사했어요'), () => ui.toast(url));
  else ui.toast(url);
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
    contact: contactReady ? sendContact : undefined,
    close: () => ui.endActions(true),
  });
}

/** 소식 받기 보내기 — 내 이웃 판과 로그인 직후 판(openLoggedIn)이 같이 쓴다. */
async function sendContact(form: ContactForm) {
  const checked = checkContact(form, Date.now());
  if (!checked.ok) return { ok: false, text: checked.error };
  const sent = await net.contact(checked.payload, { neighbor: loadNeighbor(), type: state.result ?? lastPlay?.type } /* 지역은 동의 항목에 없어 안 보낸다 */);
  if (!sent) return { ok: false, text: '지금은 받을 수 없어요. 조금 뒤에 다시 눌러 주세요.' };
  addStamp('news');
  return { ok: true, text: loadNeighbor() ? `고마워요! ${nextSeason(Date.now()).month}월에 이웃 편지를 보내 드릴게요.` : '고마워요! 소식이 생기면 보내 드릴게요.' };
}

/**
 * 「내 동네」 판(town.ts) — 끝 화면에서, 그리고 다시 온 사람은 시작 화면에서 걷지 않고(지난번 판으로) 연다.
 * 서버가 있을 때만 방명록·우리 지역이 붙는다. sessionId 는 우리 지역에 「그 판」으로 한 채 짓는 데 쓴다.
 */
function openHub(person: Person, extra: { photo?: string; tab?: 'region' } = {}, backText?: string, onClose = () => {}) {
  const now = Date.now();
  openTown(shell, {
    me: person, ...extra, neighbor: loadNeighbor(),
    season: seasonAt(now), next: nextSeason(now),
    book: online && home ? async () => (await net.book(home!.id, home!.key))?.visits : undefined,
    regionView: online ? region => net.regionView(region) : undefined,
    // 내 동네에 함께 — 기록 묶음(내 동네)을 바로 올리고 다시 본다. 1.5초 뒤 올리기를 기다리면 방금 고른 내가 그 동네에 안 보인다.
    joinRegion: online ? async region => { saveRegion(region); await syncNow(); return net.regionView(region); } : undefined,
    notes: online ? { item: note => noteView(note, noteActions()), post: (text, region) => postNote(text, region) } : undefined,
    subscribe: contactReady ? () => { const n = loadNeighbor(); if (n) { ui.endActions(false); neighborSheet(n, n.name); } } : undefined,
    share: copy => share(false, copy),
    login: PUB ? undefined : loginOpts, home: PUB ? HOME_LINK : undefined,
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
const reportNote = async (id: string) => { const key = loginKey(); if (!key) { ui.toast('로그인하면 신고할 수 있어요.'); return false; } return Boolean(await net.report(key, id)); };
/** 쪽지 한 장에 붙는 일 — 관리자면 「숨기기」 도(사용자 10-19, 서버가 열쇠로 다시 확인한다). */
const noteActions = (): NoteActions => ({
  like: likeNote, report: reportNote,
  ...(loginAdmin() ? { hide: async (id: string) => { const key = loginKey(); return Boolean(key && (await net.hide(key, id))); } } : {}),
});
const notesCard = noteCard(shell, noteActions());
/**
 * 쪽지 남기기 — 쪽지판과 우리 동네의 동네 한마디가 같이 쓴다. 로그인한 사람만(서버가 열쇠로 확인), 내 동네가 있으면 쪽지에 붙는다
 * (region — 우리 동네 탭에서 쓰면 그 동네, 쪽지판에서 쓰면 내 동네). 10분에 하나는 이 기기에서도 먼저 본다(서버도 막는다).
 */
async function postNote(text: string, region: Region | undefined = loadRegion()) {
  if (PUB) {
    const gate = feedbackGate();
    if (gate.wait > 0) return { ok: false, text: '10분에 한 번 남길 수 있어요. ' + Math.ceil(gate.wait / 60000) + '분 뒤에 다시 해 주세요.' };
    const sent = await net.pubNote({ device: gate.device, name: me.name, pick: me.pick, text });
    if (!sent) {
      if (lastFailure() === 'note-wait') { feedbackSent(); return { ok: false, text: '10분에 한 번 남길 수 있어요. 잠시 뒤에 다시 해 주세요.' }; }
      return { ok: false, text: '지금은 남기지 못했어요. 조금 뒤에 다시 눌러 주세요.' };
    }
    feedbackSent();
    return { ok: true, text: '고마워요. 남긴 글은 모아 두었어요.' };
  }
  const key = loginKey();
  if (!key) return { ok: false, text: '로그인하면 쪽지를 남길 수 있어요.' };
  const wait = loadMarks().lastAt + NOTE_GAP_MS - Date.now();
  if (wait > 0) return { ok: false, text: `쪽지는 10분에 하나씩 남길 수 있어요. ${Math.ceil(wait / 60000)}분 뒤에 다시 해 주세요.` };
  const made = await net.note(key, { sessionId: villageMe()?.sessionId, name: me.name, pick: me.pick, text, region });
  if (!made) return { ok: false, text: '지금은 남길 수 없어요. 조금 뒤에 다시 해 주세요(하루에 세 장까지예요).' };
  rememberMine(made.note.id); showVillage(made.view);
  return { ok: true, text: '남겼어요. 쪽지판을 지나는 사람들이 읽어요.', view: made.view };
}

/** 언덕의 빛 아치를 지났다(화면 읽기 도구는 숨은 단추로) — 언덕이 하얗게 바래고, 마을 남쪽 문에서 나타난다. */
function toVillage() {
  if (where === 'village' || !game) return;
  ui.villageNotice(); // 안내하는 사람 말 상자가 열린 채 아치를 지났으면 닫는다
  villageStart = 'gate';
  scene?.leave(() => { game!.scene.stop('journey'); game!.scene.start('village'); });
}

/** 마을 장면이 섰다 — 위 띠를 마을 것으로, 서버에 「들렀다」 알리고 다녀간 사람들을 세운다. */
function enteredVillage() {
  where = 'village';
  ui.village({ phone: openPhone });
  playVillageMusic(skyAt(clock().hour).night); // 마을에만 잔잔한 오르골(소리 단추로 같이 꺼진다)
  ui.villagePocket(loadPocket(kstDay(Date.now())), toWorks);
  // showErrands(); // [나중에 살림: 오락실·부탁] 사용자 10-19 「필드에 부탁도 일단 주석처리해놔」 — 부탁하는 주민이 안 선다(규칙 quests.ts·시험은 그대로)
  // 주점 환영 → 시민센터 → 동쪽 지방재정 → 서쪽 상담소·독상. 게임 기록은 남기지 않는다.
  if (PUB) village?.celebrate();
  hubGuide();
  // 개발판 ?go=건물 — 마을에 들어오자마자 그 건물 판을 연다(오락실 같은 판을 바로 보려고, 10-17). 공개판엔 없다.
  const go = (import.meta.env.DEV || inspecting) ? PLACES.find(p => p.id === params.get(inspecting ? 'place' : 'go')) : undefined;
  if (go) village?.jump(go.id, () => openPlace(go.id));
  if (!online) village?.setWorks(loadPocket(kstDay(Date.now())).given); // 서버 없는 시험판 — 내가 넣은 동전만
  // [나중에 살림: 철·현장 도장] 광장에서 시작하면 「현장 도장을 받았어요」 알림
  goBack();
  void meetVillage();
}

/**
 * 마을 둘러보기(사용자 10-16 시민센터 안내 → 10-26 「집들도 시점 이동해서 설명」 — 두 곳만, 한 곳에 말 상자 하나·집마다 한 줄).
 * 걷기를 끝내고 언덕 아치로 처음 들어온 사람에게 한 번: 시민센터 → 동쪽 지방정부 셋 → 서쪽 상담소·독상. 말은 시민센터의 채연하(keeperName('hub')).
 * 후원주점판은 창립행사 환영 말부터. 주점판은 시민증이 안 나오니(기록을 안 남긴다) 시민센터 대신 홈페이지 본편을 알린다(사용자 10-26).
 * 예전 「마을 입구 로그인 판」(들어오자마자 로그인 요구)은 지웠다 — 사용자 「마을 입구 로그인판은 그럼 지워」, 같은 말을 두 번 하게 돼서.
 */
const TOUR_LINE: Partial<Record<PlaceId, string>> = { // 글은 사용자 10-26 확정(따져 볼 지방정부만 사용자 글, 나머지는 Claude 초안 그대로)
  finance: '우리 동네가 한 해 돈을 어디에 쓰는지 봐요.',
  tax: '그 돈이 어디서 들어오는지 봐요.',
  cards: '우리 동네 예산이 어디로 새고 있는지 함께 따져 봐요.',
  counsel: '예산에 참여하는 길이 궁금하면 물어보세요.',
  dok: '예산이 새는 사업을 시민이 함께 감시해요.',
};
function hubGuide() {
  if (villageStart !== 'gate' || shell.querySelector('.t-panel')) return;
  try { if (gameStorage.getItem(HUB_GUIDE)) return; gameStorage.setItem(HUB_GUIDE, '1'); } catch { /* 다음 입장에 다시 안내 */ }
  villageGuiding = true;
  const guide = keeperName('hub');
  const groups: PlaceId[][] = [['hub'], ['finance', 'tax', 'cards'], ['counsel', 'dok']];
  const stop = (i: number) => {
    ui.villageNotice();
    village?.showPlaces(groups[i], () => {
      const text = i > 0 ? groups[i].map(id => `${placeName(id)} — ${TOUR_LINE[id]}`).join('\n')
        : PUB ? '오늘은 짧은 판이라 시민증이 나오지 않아요. 시민증을 받고 기록을 이어 가려면 시민행동 홈페이지에서 본편을 해 보세요.'
          : loginNow() ? `${placeName('hub')}에서 내 시민증과 도장을 볼 수 있어요.` // 이미 로그인한 사람에게 「로그인하면」 은 틀린 말(10-26)
            : `${placeName('hub')}에서 로그인하면 기록이 남고 다른 기기에서도 이어할 수 있어요.`; // 문구 사용자 10-20
      const next = () => { if (i < 2) stop(i + 1); else { villageGuiding = false; village?.endTour(); } };
      ui.villageNotice(guide, text, [{ label: i < 2 ? '다음' : '둘러보기 마치기', run: next },
        ...(PUB && i === 0 ? [{ label: '홈페이지 가기', run: () => { window.open(HOME_LINK, '_blank', 'noopener'); next(); } }] : [])]);
    });
  };
  if (PUB) {
    village?.setPaused(true);
    ui.villageNotice(guide, '함께하는 시민행동 창립행사에 오신 걸 환영해요!', [{ label: '고마워요', run: () => stop(0) }]);
  } else stop(0);
}
function cancelVillageGuide() {
  if (!villageGuiding) return;
  villageGuiding = false; ui.villageNotice(); village?.endTour(true);
}
const HUB_GUIDE = 'budget-game-village-guide-1026';

async function meetVillage() {
  await statsReady; await finishing;
  await afterFinish();
  if (!online) return;
  const sid = villageMe()?.sessionId;
  const view = (sid ? await net.here(sid, me.pick) : undefined) ?? (await net.village(sid || undefined));
  if (view) showVillage(view);
}

function showVillage(view: VillageView) {
  villageView = view;
  // 쪽지 든 주민은 세우지 않는다 — 쪽지는 쪽지판과 우리 동네 탭에서만(사용자 10-19 「npc처럼 마을에 남겨놨어? 그러면 안 되지. 각 게시판에서만」).
  village?.setCrowd({ ...view, notes: [] });
  village?.setWorks(view.coins ?? 0);
  ui.villagePeople(view.people);
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
  ui.villagePocket(pocket, toWorks);
  // 첫 동전 — 공사터 주민이 넣는 곳을 알려 준다(한 번만). 「나중에」 해도 위 띠 동전을 누르면 공사터로 간다.
  if (first) ui.villageNotice(keeperName('works'), `동전을 주웠네요! 「동전 모으는 곳」 에 넣으면 모두의 동전과 모여 ${josa(worksAt(villageView?.coins ?? pocket.given).now?.name ?? '새것', '이', '가')} 지어져요.`,
    [{ label: '넣으러 가기', run: toWorks }, { label: '나중에' }]);
}
// ── 마을 부탁(10-17) — quests.ts 규칙(하루 셋·닷새, 그날 셋을 다 해야 다음 날), 해낸 것은 이 기기에. 하루치를 다 하면 액세서리(look.ts REWARDS) ──
if (import.meta.env.DEV && params.has('errands')) saveErrands({ done: [], cleared: [] }); // 개발판 ?errands — 부탁을 처음부터(공개판엔 없다)
const errandName = (id: string) => nameFrom(`errand:${id}`);
function showErrands() { village?.setErrands(errandsShown(loadErrands(), kstDay(Date.now()))); }
/** 부탁하는 주민 곁 — 말 상자에 부탁과 보기(다 같은 모양). 이미 들어줬으면 한마디만. */
function openErrand(id: string) {
  const errand = ERRANDS.find(e => e.id === id);
  if (!errand || panelOpen) return;
  const who = errandName(id);
  if (loadErrands().done.includes(id)) { ui.say(who, '저번엔 고마웠어요!'); return; }
  ui.villageNotice(who, errand.ask, errand.choices.map(choice => ({ label: choice.text, run: () => answerErrand(id, choice) })), true);
}
/** 골랐다 — 맞는 답이 있는 부탁은 틀리면 까닭을 듣고 다시 고른다. 들어주면 동전, 그날 셋을 다 하면 dayDone. */
function answerErrand(id: string, choice: Choice) {
  const errand = ERRANDS.find(e => e.id === id)!, who = errandName(id);
  if (errand.choices.some(c => c.right) && !choice.right) { ui.villageNotice(who, choice.reply, [{ label: '다시 골라 볼게요', run: () => openErrand(id) }]); return; }
  const today = kstDay(Date.now()), { memo, cleared } = finishErrand(loadErrands(), id, today);
  saveErrands(memo);
  const pocket = loadPocket(today);
  pocket.coins += ERRAND_COIN; savePocket(pocket);
  ui.villagePocket(pocket, toWorks); sfx.coin();
  showErrands();
  ui.villageNotice(who, `${choice.reply} 고마워요! 동전 ${ERRAND_COIN}개 드릴게요.`, [{ label: '좋아요', run: () => { if (cleared !== undefined) dayDone(who, cleared); } }]);
}
/** 그날 셋을 다 들어줬다 — 액세서리를 받아 바로 쓰고(옷장은 아직 없음), 다음 부탁은 언제인지. */
function dayDone(who: string, day: number) {
  const reward = REWARDS[day];
  if (reward) { me = { ...me, pick: wearing(me.pick, reward), at: Date.now() }; saveMe(me); village?.setLook(me.pick); }
  const wait = errandDay(loadErrands(), kstDay(Date.now())).wait;
  const next = wait === 'all' ? '부탁 열다섯을 다 들어줬어요!' : wait === 'soon' ? '다음 부탁은 아직 준비 중이에요.' : '내일 새 부탁 셋이 열려요.';
  ui.villageNotice(who, `오늘 부탁을 다 들어줬어요! ${reward ? `선물로 ${josa(reward.name, '을', '를')} 드려요. 지금 쓰고 있어요. ` : ''}${next}`, [{ label: '고마워요' }]);
}
/** 주민 폰 「오늘의 부탁」 — 오늘 셋과 들어줬는지. 누르면 그 주민 곁으로. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- [나중에 살림: 오락실·부탁]
function openErrandList() {
  const memo = loadErrands(), { day, list, wait } = errandDay(memo, kstDay(Date.now()));
  if (!list.length) { ui.placeList([], wait === 'tomorrow' ? '오늘 부탁은 다 했어요 — 내일 셋이 더 열려요' : wait === 'all' ? '부탁 열다섯을 다 들어줬어요' : '다음 부탁은 준비 중이에요'); return; }
  ui.placeList(list.map(e => ({
    name: `${memo.done.includes(e.id) ? '✓ ' : ''}${errandName(e.id)}`,
    line: memo.done.includes(e.id) ? '들어줬어요.' : e.ask,
    run: () => village?.jumpToErrand(e.id),
  })), `오늘의 부탁 · ${day + 1}일째`);
}

/** 공사터 문 앞으로 가서 판을 연다. */
function toWorks() { cancelVillageGuide(); if (!panelOpen) village?.jump('works', () => openPlace('works')); }
/** 주민 폰 — 날짜·시각·철과 앱 여섯. 건물 앱은 그 문 앞으로 옮겨 가서 연다(지도와 같은 길). */
function openPhone() {
  if (panelOpen) return;
  cancelVillageGuide();
  const { season, now } = clock(), pocket = loadPocket(kstDay(Date.now()));
  const head = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })} · ${SEASON_NAME[season]} · 동전 ${pocket.coins} · 사과 ${pocket.fruits}`;
  const go = (id: PlaceId) => () => village?.jump(id, () => openPlace(id));
  // 앱 이름 = 간판 이름(사용자 10-19 「다른 글에도 안 들어가게 해」 — 글마다 이름을 적지 않고 PLACES 에서)
  const app = (icon: string, id: PlaceId) => ({ icon, name: placeName(id), run: go(id) });
  ui.phone(head, [
    { icon: '🗺️', name: '지도', run: openMap },
    // [나중에 살림: 오락실·부탁]
    // { icon: '📝', name: '오늘의 부탁', run: openErrandList },
    // { icon: '🕹️', name: '오락실', run: go('arcade') },
    app('🪪', 'hub'), app('💰', 'tax'), app('🏗️', 'works'), app('📌', 'board'),
    app('📢', 'cards'), // 10-20 살림
    ...(PUB ? [app('📣', 'cheer')] : []), // 창립행사 응원판 — 후원주점판에만
    app('🚌', 'bus'),
  ]);
}

/** 지도 — 건물 목록. 고르면 그 문 앞으로 옮겨 가서 연다. */
function openMap() {
  if (panelOpen) return;
  cancelVillageGuide();
  ui.placeList(PLACES.map(p => ({ name: placeName(p.id), line: p.line, run: () => village?.jump(p.id, () => openPlace(p.id)) })));
}

/** 문 앞에 닿았다 — 그 건물의 판. 판이 열린 동안 나는 멈추고, 닫으면 다시 걷는다. tab = 시민센터를 우리 동네 탭으로(로그인하고 돌아왔을 때). */
function openPlace(id: PlaceId, tab?: 'region') {
  cancelVillageGuide();
  const who = villageMe();
  ui.villageNotice();
  panelOpen = true; village?.setPaused(true); notesCard.hide(); ui.closeSheet();
  const done = () => { panelOpen = false; village?.setPaused(false); };
  if (id === 'hub') { if (who) void (village?.portrait() ?? Promise.resolve(undefined)).then(photo => openHub(who.person, { photo, tab }, '← 마을로', done)); else done(); } // 사진 = 내 모습 얼굴(10-15)
  else if (id === 'bus') openBus(shell, loadNeighbor(), () => { location.href = `${here()}?${inspecting ? 'inspect=1&' : ''}walk`; }, done);
  else if (id === 'counsel') openCounsel(shell, done);
  else if (id === 'dok') openDok(shell, done);
  else if (id === 'finance') openFinance(shell, done);
  else if (id === 'tax') openTax(shell, done);
  else if (id === 'works') {
    const sid = who?.sessionId, pocket = loadPocket(kstDay(Date.now()));
    openWorks(shell, {
      total: online ? villageView?.coins ?? 0 : pocket.given, pocket, online,
      // 지금 쓰는 액세서리도 가진 것으로(부탁 보상으로 받았던 것 — 다시 사지 않게)
      owned: () => [...new Set([...loadOwned(), ...REWARDS.flatMap((r, i) => (me.pick[r.slot] === r.value ? [i] : []))])],
      pick: () => me.pick,
      preview: village ? pick => village!.portrait(pick, 120) : undefined,
      // 동전이나 사과로(사용자 10-26 「동전또는 사과로 — 사과는 무제한이잖아」, 값은 같은 100)
      buy: (i, pay) => {
        if (pocketBusy) return false;
        const fresh = loadPocket(kstDay(Date.now()));
        if (fresh[pay] < ACCESSORY_PRICE) return false;
        fresh[pay] -= ACCESSORY_PRICE; savePocket(fresh);
        pocket.coins = fresh.coins; pocket.fruits = fresh.fruits; ui.villagePocket(fresh, toWorks);
        saveOwned([...loadOwned(), i]);
        me = { ...me, pick: wearing(me.pick, REWARDS[i]), at: Date.now() }; saveMe(me); village?.setLook(me.pick);
        sfx.coin();
        return true;
      },
      give: async n => {
        if (pocketBusy) return { failed: 'busy' };
        pocketBusy = true;
        try {
        const fresh = loadPocket(kstDay(Date.now()));
        n = Math.min(n, fresh.coins);
        if (!n) return { failed: 'balance' };
        let took = n, total: number;
        if (online) {
          await afterFinish();
          const done = sid ? await net.coins(sid, n) : undefined;
          if (!done) return { failed: sid ? lastFailure() : 'not-finished' };
          took = done.took; total = done.view.coins; showVillage(done.view);
        } else total = fresh.given + n;
        const latest = loadPocket(kstDay(Date.now()));
        latest.coins = Math.max(0, latest.coins - took); latest.given += took; savePocket(latest);
        pocket.coins = latest.coins; ui.villagePocket(latest, toWorks);
        if (!online) village?.setWorks(latest.given);
        return { took, total };
        } finally { pocketBusy = false; }
      },
    }, done);
  }
  else if (id === 'house') openHouse(shell, to => village?.jump(to, () => openPlace(to)), done);
  else if (id === 'arcade') openArcade(shell, {
    paid: game => loadPocket(kstDay(Date.now())).arcade.includes(game),
    earn: game => { // 놀이마다 하루 한 번 동전 하나
      const pocket = loadPocket(kstDay(Date.now()));
      if (pocket.arcade.includes(game)) return false;
      pocket.arcade.push(game); pocket.coins++; savePocket(pocket);
      ui.villagePocket(pocket, toWorks); sfx.coin();
      return true;
    },
  }, done);
  else if (id === 'cards') openCuts(shell, done);
  else if (id === 'cheer') openCheerBoard(shell, () => me, done);
  else openBoard(shell, {
    ...noteActions(), view: villageView, online, pub: PUB, login: loginOpts, post: text => postNote(text), me: () => me,
    refresh: async () => { const fresh = await net.village(who?.sessionId || undefined); if (fresh) showVillage(fresh); return fresh; },
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
  const room = Math.max(0, Math.min(orderedQuestions.length - 1, Number.isFinite(n) ? Math.floor(n) : 0));
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

/*
  언덕 안내하는 사람(사용자 10-19 「이 게임이 무엇이고 예산이 어려운 이유를 알려주고, 마을로 가 보라고」).
  아치 옆에 서 있다가 다가가면(아치로 가는 길목이라 마을로 가는 사람은 다 지난다) 말 상자. 쪽마다 「다음」, 마지막 쪽은 「마을로 가기」·「조금 더 있을게요」.
  이름은 안 단다(10-20 사용자 「안내 하는 사람 이름 삭제해」) — 말 상자도 이름표 없이.
  글은 사용자 최종안(10-20 「웅 그렇게하자」, 10-26 넷째 쪽부터 다시 — 「응 이렇게 수정할거야」) 일곱 쪽. 셋째 쪽 두 유형은 그 사람 결과로 — 가까운 유형 = 0 에 가장 가까운 축 하나만 뒤집은 것(score.ts 는 읽기만).
*/
const HILL_GUIDE = {
  pages: (mine: string, near: string) => [
    '여기까지 오신 걸 축하해요! 걸어오면서 몇 번이나 멈칫했나요?',
    '둘 다 필요한 것 중에 하나만 고르라니, 질문이 얄궂었죠? 이 게임은 줄다리기 같아요. 고른 것들을 모아 어느 쪽으로 기울었는지 봐요.',
    `그래서 몇 번만 달리 골랐어도 「${mine}」 대신 ${josa(`「${near}」`, '이', '가')} 나왔을 수 있어요. 예산에는 딱 떨어지는 정답이 없거든요. (물론 새는 돈은 있어요 😊)`,
    '이처럼 예산에는 많은 논쟁과 깊은 숙의가 필요해요. 그 시작이 오늘 당신이 멈칫한 순간이라고 생각해요.',
    '하지만 그 순간을 함께 나누지 않으면 금세 잊혀요. 시민의 숲에는 더 나은 사회를 고민하는 사람들이 모여요.',
    '우리 동네 예산부터, 지방정부가 보여 주지 않는 자료까지 볼 수 있어요. 그것들은 가로등, 감시카메라 등 우리 삶과 밀접하게 이어져 있답니다.',
    '이제 저 아치를 지나면 시민의 숲이에요. 마을을 천천히 둘러보시길 바라요. 그럼 안녕~',
  ],
  next: '다음', go: '마을로 가기', stay: '조금 더 있을게요',
};
/** 내 유형과 가까운 유형 이름 — 가장 덜 기운 축(0 에 가장 가까운 것) 하나만 뒤집는다. */
function guideTypes(): [string, string] {
  const scores = scoreAnswers(orderedQuestions, state.answers), code = typeCode(scores);
  const i = AXES.reduce((best, { key }, k) => (Math.abs(scores[key]) < Math.abs(scores[AXES[best].key]) ? k : best), 0);
  const near = (code.slice(0, i) + (code[i] === '1' ? '0' : '1') + code.slice(i + 1)) as TypeCode;
  return [TYPES[code].name, TYPES[near].name];
}
let guideOpen = false;
function guideTalk(page = 0) {
  if (where === 'village') return;
  guideOpen = true;
  ui.endActions(false); // 말 상자가 아래 단추 자리에 뜬다
  const pages = HILL_GUIDE.pages(...guideTypes());
  const back = () => { guideOpen = false; ui.endActions(true); }, last = page >= pages.length - 1;
  ui.villageNotice('', pages[page], last
    ? [{ label: HILL_GUIDE.go, run: () => { back(); scene?.toArch(); } }, { label: HILL_GUIDE.stay, run: back }]
    : [{ label: HILL_GUIDE.next, run: () => guideTalk(page + 1) }]);
}
/** 말 상자를 연 채 멀리 걸어가면 닫고 아래 단추를 돌려놓는다. 다시 다가가면 처음 쪽부터. */
function guideBye() {
  if (!guideOpen) return;
  guideOpen = false;
  ui.villageNotice();
  ui.endActions(true);
}

/** 언덕에서 다 같이 폴짝 뛴 뒤 — 끝 화면과 할 수 있는 것들. */
function showEnd() {
  if (!state.result) return;
  scene?.setGuests(guests());
  town = townFrom(state.answers);
  if (town && !PUB) saveTown(town, { type: state.result, sessionId: state.sessionId });
  const friendTown = invite?.town, myTown = town;
  ui.end({ code: state.result, scores: scoreAnswers(orderedQuestions, state.answers), answers: state.answers, lines: endLines() }, {
    neighbor: () => {
      ui.endActions(false);
      ui.hint('이웃으로 삼을 주민을 눌러요');
      scene?.pickNeighbor(follower => { ui.hint(); neighborSheet(follower); });
    },
    others: online ? async () => ui.others((await net.stats()) ?? stats, mine()) : undefined,
    share: copy => share(false, copy),
    reply: invite ? { label: `${invite.name}님에게 답장`, run: () => share(true) } : undefined,
    // 링크 받은 친구도 서로 고른 것을 나란히(사용자 10-19) — 초대 링크에 실려 온 그 친구의 열다섯 가지
    compare: invite && friendTown && myTown ? { label: `${invite.name}님과 고른 것 보기`, run: () => openCompare(shell, { name: me.name, pick: me.pick, type: state.result!, town: myTown }, { ...invite, town: friendTown }, () => {}) } : undefined,
    village: toVillage,
  });
  setTimeout(prepareCard, 1600); // 카드가 내려앉고 손님이 언덕에 다 올라온 뒤
}

function measure() {
  const rect = ui.surface.getBoundingClientRect();
  view.w = Math.max(1, Math.round(rect.width));
  view.h = Math.max(1, Math.round(rect.height));
  // 마우스로 하는 PC 는 화면이 1배여도 2배로 그린다 — 그림·글씨가 또렷하고, 공유 그림 바탕(장면 스냅숏)도 2배로 찍힌다(10-20, 전엔 PC 에서 보낸 그림이 흐렸다).
  // 폰(손가락)은 기기 배수 그대로 — 느린 폰에 화소를 더 지우지 않는다.
  const pc = window.matchMedia?.('(pointer: fine)').matches ?? false;
  view.dpr = Math.min(3, Math.max(window.devicePixelRatio || 1, pc ? 2 : 1));
}

async function boot() {
  try {
    measure();
    // 마을 간판은 캔버스에 구워 두므로 둥근 글꼴이 먼저 와 있어야 한다(늦으면 기본 글꼴로 굳는다) — 간판에 쓰는 글자가 든 조각을 다(draw.ts CANVAS_TEXT).
    // 글꼴을 먼저 부르고 Phaser 와 같이 받는다. 전엔 1.5초만 기다리고 넘어가 느린 폰망에서 간판이 글자마다 섞였다(10-19 「배포판 글씨체가 이상」, 1.6Mbps 흉내로 재현).
    // ponytail: Phaser 가 온 뒤로도 글꼴이 4초 넘게 안 오면 그대로 굳는다 — 더 느린 망까지 막으려면 글꼴이 온 뒤 간판을 다시 굽는다.
    const fonts = Promise.all([document.fonts?.load('16px Jua', CANVAS_TEXT), document.fonts?.load('600 16px "Pretendard Variable"', '마을')]).catch(() => {});
    const [{ default: Phaser }, { JourneyScene }, { VillageScene }] = await Promise.all([import('phaser'), import('./scenes/JourneyScene'), import('./scenes/VillageScene')]);
    await Promise.race([fonts, new Promise(r => setTimeout(r, 4000))]);
    const journey = new JourneyScene({
      state: () => state, send, visible, subscribe: listener => bus.subscribe(listener),
      view: () => view, controls, ui, ready: () => { ui.ready(); walkReady = true; if (walkOnReady) startWalk(); if ((import.meta.env.DEV || inspecting) && params.has('end')) skipToEnd(); else if ((import.meta.env.DEV || inspecting) && params.has('room')) skipToRoom(Number(params.get('room'))); },
      pick: () => me.pick, name: () => me.name, arrived: showEnd, enter: toVillage, guide: { meet: () => guideTalk(), leave: guideBye },
      busCaption: (stage, skip) => {
        if (stage < 0) { ui.busCaption(); return; }
        ui.busCaption(ROUTE[stage].area, skip);
      },
      // [나중에 살림: 버스 퀴즈] 사용자 10-19 「이 문제 나오는 건 삭제하라고 했던 것 같은데」 — 버스는 서지 않고 떠난다(false = 퀴즈 없음, JourneyScene toBus).
      // 살리면: const { quiz, choices } = quizFor(state.sessionId, stage); ui.busQuiz(ROUTE[stage].area, quiz, choices, correct => { if (correct) { 동전 하나 } done(); }); return true;
      busQuiz: () => false,
    });
    scene = journey;
    const villageScene = new VillageScene({
      view: () => view, controls, pick: () => me.pick, neighbor: loadNeighbor, start: () => villageStart,
      enter: openPlace, near: note => (note ? notesCard.show(note) : notesCard.hide()), ready: enteredVillage,
      clock, drops: todaysDrops, picked, errand: openErrand,
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
// ── 시작 — 다시 온 사람은 걷지 않고 마을에서(사용자 10-14, 2ⓐ). 걸으러 온 링크(?walk·친구 초대)면 걷기 화면. ──
if ((import.meta.env.DEV || inspecting) && params.has('village') && !lastPlay?.type) {
  // 개발판 ?village — 아직 한 판도 안 끝낸 브라우저면 아무렇게나 한 판을 끝낸 셈 치고 마을로.
  bus.emit(autoAnswer().arrived);
  town = townFrom(state.answers);
  saveTown(town!, { type: state.result, sessionId: state.sessionId });
  lastPlay = loadLast();
}
const villagePreview = (import.meta.env.DEV || inspecting) && params.has('village');
if (villagePreview && (PUB || params.has('tour'))) villageStart = 'gate';
const startInVillage = Boolean(lastPlay?.type) && (!walkLink || villagePreview);
// 소개 페이지(landing.ts, 10-16) — 처음 온 사람이 맨 주소로 왔을 때만 게임 위에 덮는다. ?about 이면 늘(보기용). 따로 불러와 첫 화면을 무겁게 하지 않는다.
// 첫 칸에 「전에 해 봤어요 — 내 시민증 불러오기」(사용자 10-19) — 다른 기기·카톡 브라우저로 다시 온 사람도 이 브라우저에선 처음 온 사람이라 소개 페이지를 본다.
// 불러오면 로그인 길이 페이지를 새로 열고, 지난번 판이 생겼으니 소개 페이지 없이 마을에서 시작한다(startInVillage).
// 한 번도 안 걸은 사람이 불러오면 지난번 판이 없어 걷기부터 — 그때도 소개 페이지는 다시 안 띄운다(10-20, 덮으면 「로그인했어요」 판이 가려졌다).
if (params.has('about') || (arrivedPlain && !lastPlay?.type && !loggedIn)) void Promise.all([import('./landing'), import('./landing.css')]).then(([m]) => m.openLanding(startInVillage ? () => {} : walkFromLanding, () => loginBox(loginOpts, '불러오기')));
if (startInVillage) { ui.hideIntro(); window.addEventListener('pointerdown', unlockAudio, { once: true }); } // 「출발」 을 안 누르니 첫 손길에 소리를 푼다
else if (lastPlay?.type && !PUB) ui.homeOpen(goVillage); // 걸으러 왔지만 마을로 갈 수도
// 링크로 들어온 사람에게 먼저 보이는 판 — 답장(두 동네 나란히), 이웃의 편지. 마을에서 연 편지의 「같이 걷기」 는 걸으러 간다.
if (invite?.replyTo) openReply(shell, invite.replyTo, invite, () => {});
else if (cardLink) void statsReady.then(() => openCuts(shell, () => {})); // 친구가 보낸 ?card= 링크(10-20 살림)
else if (letterSeason) openLetter(shell, letterSeason, returning, me.name, () => {}, startInVillage ? () => { location.href = `${here()}?${inspecting ? 'inspect=1&' : ''}walk`; } : undefined);
if (signingIn) void loginResult.then(result => { if (result !== 'done') void boot(); }); // 로그인 확인 중엔 게임을 안 받는다 — 망을 서버 확인에 양보
else void boot();
// 진단 판(game/diag.ts) — 주소에 ?diag 가 있을 때만 받는다. 아이패드 원인 찾으면 지운다(10-19).
if (params.has('diag')) void import('./diag').then(m => m.startDiag({ surface: ui.surface, scene: () => (game?.scene.isActive('village') ? village : scene), vector: () => controls.keyVector() }));

// 저장 단계에서 붙일 자리. 답은 「다른 사람들 마음」 서버로만 간다(개인정보 없음).
export function getPendingResponse() { return response ? structuredClone(response) : undefined; }

if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frame); abort.abort(); stopEffects(); bus.clear(); controls.destroy(); game?.destroy(true); ui.destroy();
});
