/*
  마을(기획 4차, 2026-10-14) — 한 바퀴를 끝내면 나오는 곳. 그림·Phaser 없이 시험되는 것만 둔다: 지도 배치, 걷기(부딪힘), 쪽지 규칙.

  · 사용자 「일단 크게 자유롭게, 다른 요소들도 집어넣을 수 있게」 — 지도는 화면 서너 개 크기, 건물은 PLACES 에 한 줄을 더하면 생긴다.
    (그림은 draw.ts 의 drawVillage, 판은 places.ts, 들어갔을 때 무엇을 여는지는 main.ts 의 openPlace.)
  · 사용자 「커뮤니티 기능보다는 혼자가 아니다는 느낌」 — 그래서 대화방이 아니라 쪽지(한 줄)와 다녀간 사람들의 모습이다.
    쪽지는 답글이 없고, 「나도」 와 「신고」 만 있다.
  · 이름 「시민마을」(사용자 10-15). 건물 이름은 하는 일 그대로(사용자 10-15 「이쁘게 말고 직관적으로 — 지방정부 예산, 세금 보는 곳 이런 식」).
    상담소·독상은 실제 사업 이름이라 그대로. 주민 한마디는 Claude 임시.
*/
import type { Point } from './room';
import { rng, nameFrom } from './look';

export type Box = { x: number; y: number; w: number; h: number };
export type PlaceId = 'bus' | 'hub' | 'counsel' | 'dok' | 'finance' | 'board' | 'house' | 'tax' | 'works' | 'cards';
/**
 * 들어가는 곳 — box 는 부딪히는 앞벽(그림은 이 위로 지붕이 솟는다), door 는 문 앞에 서는 자리(여기 닿으면 판이 열린다).
 * keeper 는 문 앞 주민의 이름 — 시민행동 사람이 맡은 건물은 그 사람 이름(사용자 10-15), 없으면 순우리말 이름(keeperName).
 */
export type Place = { id: PlaceId; name: string; line: string; box: Box; door: Point; keeper?: string };

export const VILLAGE_NAME = '시민마을';
export const VILLAGE_W = 1040;
export const VILLAGE_H = 1500;
/** 광장 — 가운데 분수. 다녀간 주민들이 여기서 서성인다. */
export const PLAZA = { x: 520, y: 800, r: 150 };
export const FOUNTAIN: Box = { x: 486, y: 770, w: 68, h: 52 };

// [나중에 살림: 쪽지판·문제 카드] 사용자 10-15 「문제카드, 쪽지판은 주석처리해줘. 지금 할 수 없어. 나중에 코드 살려서 할 수 있게」.
// 두 건물 줄을 주석으로 막았다 — 건물·문·판이 다 사라진다. 코드(판·서버·시험)는 그대로 두었다.
// 살릴 땐 저장소에서 「[나중에 살림: 쪽지판·문제 카드]」 를 찾아 그 자리를 다 푼다(README 「숨겨 둔 것」).
export const PLACES: Place[] = [
  { id: 'hub', name: '내 기록 보는 곳', line: '주민증과 도장, 방명록은 여기서 봐요.', box: { x: 420, y: 230, w: 200, h: 100 }, door: { x: 520, y: 352 } },
  // 세금 보는 곳 — 비워 둔 「빈 터」 에 세웠다(사용자 10-14 「내 동네가 어떻게 돈을 걷고, 나는 어떻게 세금을 내는지 알 수 있는 곳」). 판은 places.ts openTax.
  // 이름은 사용자 10-14 「세금 보는 곳이라고 바꾸고 나머지 상세 이름은 나중에」(처음엔 Claude 임시 「마을 금고」).
  { id: 'tax', name: '세금 보는 곳', line: '우리가 낸 세금이 어디로 가는지 보여 줄게요.', box: { x: 790, y: 232, w: 160, h: 96 }, door: { x: 870, y: 350 } },
  // 시민행동 사람이 문 앞을 지킨다(사용자 10-15 「밑빠진독상은 정남진, 시민참여 상담소는 김민철, 시민행동의 집은 채연하, 지방정부예산은 유종웅」).
  { id: 'house', name: '시민행동 소개', line: '이 마을을 만든 함께하는 시민행동이에요.', box: { x: 96, y: 236, w: 150, h: 90 }, door: { x: 171, y: 348 }, keeper: '채연하' },
  { id: 'counsel', name: '시민참여 상담소', line: '참여예산이 궁금하면 여기 물어보세요.', box: { x: 84, y: 500, w: 190, h: 96 }, door: { x: 179, y: 618 }, keeper: '김민철' },
  { id: 'finance', name: '지방정부 예산', line: '우리 지역 지방정부의 한 해 예산을 볼 수 있어요.', box: { x: 766, y: 500, w: 190, h: 96 }, door: { x: 861, y: 618 }, keeper: '유종웅' },
  // { id: 'board', name: '쪽지판', line: '지나간 주민들이 한 줄씩 남기고 가요.', box: { x: 474, y: 656, w: 92, h: 22 }, door: { x: 520, y: 702 } },
  { id: 'dok', name: '밑 빠진 독상', line: '예산이 새는 사업에 주는 상이에요.', box: { x: 84, y: 980, w: 190, h: 96 }, door: { x: 179, y: 1098 }, keeper: '정남진' },
  // 마을 공사터 — 나무에서 주운 동전을 넣으면 모두의 동전이 모여 다리·정자가 선다(사용자 10-14 동물의 숲 ⓑ). 판은 places.ts openWorks.
  { id: 'works', name: '동전 모으는 곳', line: '동전이 모이면 마을에 새것이 생겨요.', box: { x: 150, y: 1236, w: 170, h: 84 }, door: { x: 235, y: 1342 } },
  // 문제 카드 — 활동가가 매주·매달 올리는 사업 한 건에 반응하기(사용자 10-15 「한 달에 한 번이라도 들어올 명분」). 남쪽 문에서 광장 가는 큰길 옆이라 들어오자마자 보인다.
  // { id: 'cards', name: '문제 카드', line: '활동가가 고른 우리 세금 이야기예요. 어떻게 보세요?', box: { x: 586, y: 1150, w: 92, h: 22 }, door: { x: 632, y: 1196 } },
  { id: 'bus', name: '게임 다시 하기', line: '버스 타고 열다섯 동네를 다시 걸어요.', box: { x: 776, y: 1000, w: 170, h: 40 }, door: { x: 861, y: 1064 } },
];

/** 문 앞 주민 이름 — 맡은 사람이 있으면 그 이름, 없으면 건물마다 정해진 순우리말 이름. 판의 이름표·말 상자·부탁 목록이 같이 쓴다. */
export const keeperName = (id: PlaceId) => PLACES.find(p => p.id === id)?.keeper ?? nameFrom(`npc:${id}`);

export const POND: Box = { x: 740, y: 1210, w: 170, h: 100 };
/**
 * 작은 운동장 — 남동쪽 구석, 연못 아래(사용자 10-15 「골대에 골 넣는 건 마을 한 구석에」 — 걷기 판의 골 놀이를 옮겨 왔다).
 * 공은 이 안에서만 구르고(울타리), 오른쪽 끝 골대(GOAL)에 들어가면 골. 막는 벽은 아니라 걸어 들어간다.
 */
export const PITCH: Box = { x: 700, y: 1352, w: 316, h: 120 };
export const GOAL: Box = { x: 970, y: 1384, w: 40, h: 56 };
/** 공(발자리)이 골대 상자 안에 들어왔나. */
export const scored = (ball: Point, g: Box) => ball.x > g.x && ball.x < g.x + g.w && ball.y > g.y && ball.y < g.y + g.h;
/** 길 — 그림과 서성이는 주민의 갈 곳에 쓴다. 걷기는 길 밖(풀밭)도 된다. */
export const ROADS: Box[] = [
  { x: 470, y: 330, w: 100, h: 1170 }, // 남북 큰길 — 언덕에서 내려와 주민센터까지
  { x: 0, y: 760, w: VILLAGE_W, h: 80 }, // 동서 큰길 — 광장을 지난다
  { x: 120, y: 340, w: 800, h: 50 }, // 윗길 — 시민행동 집·주민센터·세금 보는 곳
  { x: 144, y: 596, w: 70, h: 170 }, { x: 826, y: 596, w: 70, h: 170 }, // 상담소·창고로(문이 큰길 쪽)
  { x: 290, y: 836, w: 60, h: 300 }, { x: 110, y: 1086, w: 240, h: 50 }, // 독상으로 — 건물 옆을 돌아 앞으로
  { x: 690, y: 836, w: 60, h: 250 }, { x: 690, y: 1052, w: 250, h: 50 }, // 정류장으로
];
/** 처음 온 사람은 언덕에서 내려오는 남쪽 문, 다시 온 사람은 광장 아래. */
export const SPAWN = { gate: { x: 520, y: 1372 }, plaza: { x: 520, y: 900 } }; // 문 안쪽 — 문 간판이 얼굴을 가리지 않게
export const GATE_Y = 1462;

const SOLID: Box[] = [...PLACES.map(p => p.box), POND, FOUNTAIN];
const EDGE = 16, TOP = 120; // 맨 위 띠는 하늘·지붕 자리
const BODY_X = 10, BODY_UP = 4, BODY_DOWN = 8; // 발 둘레 — 앞벽 바로 밑에 설 수 있고, 옆으로는 몸 반쯤 떨어진다

/** 이 자리에 발을 디딜 수 없나 — 지도 밖이거나 벽·울타리·연못·분수 안. */
export function blocked(p: Point, solid: Box[] = SOLID) {
  if (p.x < EDGE || p.x > VILLAGE_W - EDGE || p.y < TOP || p.y > VILLAGE_H - EDGE) return true;
  return solid.some(b => p.x > b.x - BODY_X && p.x < b.x + b.w + BODY_X && p.y > b.y - BODY_UP && p.y < b.y + b.h + BODY_DOWN);
}

/**
 * 한 프레임 걷기 — 가로·세로를 따로 옮겨, 벽에 비스듬히 부딪히면 벽을 따라 미끄러진다.
 * 꾹 누르고 끄는 걷기(손가락 쪽으로)는 이것만 쓴다. 톡 친 곳으로 갈 때는 findPath 가 돌아갈 길을 먼저 짠다.
 */
export function walkVillage(p: Point, dir: Point, distance: number): Point {
  const len = Math.hypot(dir.x, dir.y);
  if (!len || !(distance > 0) || !Number.isFinite(p.x + p.y + dir.x + dir.y)) return { ...p };
  const dx = dir.x / Math.max(1, len) * distance, dy = dir.y / Math.max(1, len) * distance;
  let next = { ...p };
  if (!blocked({ x: next.x + dx, y: next.y })) next = { x: next.x + dx, y: next.y };
  if (!blocked({ x: next.x, y: next.y + dy })) next = { x: next.x, y: next.y + dy };
  return next;
}

/** a 에서 b 까지 곧장 걸어도 아무것에도 안 걸리나(6px 마다 디뎌 본다). */
export function clearLine(a: Point, b: Point) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
  for (let i = 1; i <= steps; i++) if (blocked({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps })) return false;
  return true;
}

const CELL = 16;
const GW = Math.ceil(VILLAGE_W / CELL), GH = Math.ceil(VILLAGE_H / CELL);
const cellAt = (p: Point) => Math.min(GH - 1, Math.max(0, Math.floor(p.y / CELL))) * GW + Math.min(GW - 1, Math.max(0, Math.floor(p.x / CELL)));
const center = (i: number): Point => ({ x: (i % GW) * CELL + CELL / 2, y: Math.floor(i / GW) * CELL + CELL / 2 });
let open: Uint8Array | undefined; // 디딜 수 있는 칸 — 처음 한 번만 잰다(지도는 안 바뀐다)

/**
 * 톡 친 곳까지 돌아갈 길 — 16px 칸을 넓게 훑어(BFS, 여덟 방향, 모서리는 못 자름) 가장 가까이 닿는 칸까지 가고,
 * 곧장 보이는 데까지 건너뛰어 꺾는 곳만 남긴다. 닿을 수 없는 곳(분수 안·연못)을 누르면 가장 가까운 데까지.
 * 돌려주는 건 거쳐 갈 자리들(끝이 목적지). 지도 한 장 6천 칸이라 누를 때마다 훑어도 폰에서 가볍다.
 */
export function findPath(from: Point, to: Point): Point[] {
  if (clearLine(from, to)) return [{ ...to }];
  open ??= Uint8Array.from({ length: GW * GH }, (_, i) => (blocked(center(i)) ? 0 : 1));
  const start = cellAt(from), prev = new Int32Array(GW * GH).fill(-1);
  prev[start] = start;
  const queue = [start];
  let best = start, bestD = Infinity;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], c = center(i), d = Math.hypot(c.x - to.x, c.y - to.y);
    if (d < bestD) { best = i; bestD = d; if (d < CELL) break; }
    const x = i % GW, y = Math.floor(i / GW);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const n = ny * GW + nx;
      if (prev[n] !== -1 || !open[n]) continue;
      if (dx && dy && (!open[y * GW + nx] || !open[ny * GW + x])) continue; // 모서리를 비스듬히 자르지 않는다
      prev[n] = i; queue.push(n);
    }
  }
  const cells: Point[] = [];
  for (let i = best; i !== start; i = prev[i]) cells.unshift(center(i));
  const end = blocked(to) ? cells[cells.length - 1] ?? { ...from } : { ...to };
  cells.push(end);
  // 곧장 보이는 가장 먼 칸으로 건너뛴다 — 칸마다 꺾으면 계단처럼 걷는다.
  const route: Point[] = [];
  let at = from;
  for (let k = 0; k < cells.length;) {
    let far = k;
    for (let j = cells.length - 1; j > k; j--) if (clearLine(at, cells[j])) { far = j; break; }
    route.push(cells[far]); at = cells[far]; k = far + 1;
  }
  return route;
}

/** 문 앞 radius 안의 곳. */
export function placeAt(p: Point, radius: number) {
  let best: Place | undefined, bestD = radius;
  for (const place of PLACES) {
    const d = Math.hypot(place.door.x - p.x, place.door.y - p.y);
    if (d < bestD) { best = place; bestD = d; }
  }
  return best;
}

/** 서성이는 주민이 다음에 갈 곳 — 광장 둘레나 길 위의 디딜 수 있는 자리. random 은 0~1. */
export function wanderSpot(random: () => number): Point {
  for (let tries = 0; tries < 30; tries++) {
    const spot = random() < 0.6
      ? (() => { const a = random() * Math.PI * 2, r = 50 + random() * (PLAZA.r - 30); return { x: PLAZA.x + Math.cos(a) * r, y: PLAZA.y + Math.sin(a) * r * 0.8 }; })()
      : (() => { const road = ROADS[Math.floor(random() * ROADS.length)]; return { x: road.x + 12 + random() * (road.w - 24), y: road.y + 12 + random() * (road.h - 24) }; })();
    if (!blocked(spot)) return spot;
  }
  return { ...SPAWN.plaza };
}

// ───────────────────────── 쪽지 — 화면과 서버가 같은 규칙으로 본다 ─────────────────────────
export const NOTE_MAX = 40;
/** 같은 판(세션)이 다시 쓰려면 이만큼 기다린다, 하루(한국 날짜)에 이만큼까지. */
export const NOTE_GAP_MS = 10 * 60 * 1000;
export const NOTE_DAY_MAX = 3;
/** 신고가 이만큼 모이면 사람이 보기 전이라도 숨긴다. 시트의 「숨김」 칸에 무엇이든 적으면 바로 숨는다. */
export const REPORT_HIDE = 3;
export const NOTES_SHOW = 30;
export const CROWD_SHOW = 16;

/**
 * 거친 말 — 띄어쓰기·기호를 빼고 찾는다. 단체가 고칠 목록(한 줄 더하면 된다).
 * 넓게 잡으면 멀쩡한 말이 막히니 뜻이 하나인 것만 — 「홍어」 처럼 먹는 것과 겹치는 말은 넣지 않았다.
 */
export const BLOCKED_WORDS = [
  '시발', '씨발', '씨바', '씨빨', 'ㅅㅂ', 'ㅆㅂ', '병신', '븅신', 'ㅂㅅ', '좆', '존나', '졸라', '개새', '새끼', 'ㅅㄲ', '지랄', 'ㅈㄹ',
  '미친놈', '미친년', '엠창', '느금', '니애미', '니미', '꺼져', '닥쳐', '썅', '쌍년', '걸레', '한남충', '김치녀', '틀딱', '급식충', '맘충',
  'fuck', 'shit', 'bitch',
];
const LINKISH = /https?:|www\.|\.(com|net|org|kr|io|me|ly|co|xyz|site)\b|@|open\.kakao|오픈\s*채팅|카톡\s*(아이디|id)/i;
const PHONEISH = /\d(?:[\s.-]*\d){6,}/; // 숫자 일곱 개 넘게 이어지면(전화번호·계좌)

const compact = (text: string) => text.toLowerCase().replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z]/g, '');
export const rude = (text: string) => { const c = compact(text); return BLOCKED_WORDS.some(word => c.includes(word)); };

export type NoteCheck = { ok: true; text: string } | { ok: false; why: 'short' | 'long' | 'link' | 'word' };
/** 쪽지 글 다듬기 + 검사. 링크·연락처·숫자 줄은 막는다(광고와 개인정보), 거친 말도. */
export function checkNote(raw: unknown): NoteCheck {
  const text = typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const length = [...text].length;
  if (length < 2) return { ok: false, why: 'short' };
  if (length > NOTE_MAX) return { ok: false, why: 'long' };
  if (LINKISH.test(text) || PHONEISH.test(text)) return { ok: false, why: 'link' };
  if (rude(text)) return { ok: false, why: 'word' };
  return { ok: true, text };
}
export const NOTE_WHY = {
  short: '두 글자 넘게 적어 주세요.',
  long: `${NOTE_MAX}자까지 남길 수 있어요.`,
  link: '링크·연락처·긴 숫자는 남길 수 없어요.',
  word: '거친 말은 남길 수 없어요.',
} as const;

/** 한국 날짜로 오늘 0시(밀리초). */
export function kstDayStart(now: number) {
  const day = 24 * 60 * 60 * 1000, kst = 9 * 60 * 60 * 1000;
  return Math.floor((now + kst) / day) * day - kst;
}

// ───────────────────────── 마을 공사·나무 흔들기(사용자 10-14 동물의 숲 ⓑⓕ) ─────────────────────────
/**
 * 공사 차례 — 모두가 넣은 동전이 앞 공사부터 채운다. 다 차면 그 공사가 마을에 선다(다리는 연못 위, 정자는 공사터 자리).
 * 목표 동전 수는 다녀가는 사람 수를 보고 고친다(한 판이 하루에 COIN_DAY_MAX 개까지).
 */
export const WORKS = [
  { id: 'bridge', name: '연못 다리', goal: 10 },
  { id: 'pavilion', name: '쉼터 정자', goal: 10 }, // 사용자 10-14 「300개는 에바」 → 「30개도 많아, 10개만」 — 다리도 같이
] as const;
export type WorkId = (typeof WORKS)[number]['id'];
export type WorksState = { done: WorkId[]; now?: { id: WorkId; name: string; have: number; goal: number } };
export function worksAt(total: number): WorksState {
  let left = Math.max(0, Math.floor(Number(total) || 0));
  const done: WorkId[] = [];
  for (const work of WORKS) {
    if (left < work.goal) return { done, now: { id: work.id, name: work.name, have: left, goal: work.goal } };
    done.push(work.id); left -= work.goal;
  }
  return { done };
}

/**
 * 한 판이 하루에 넣을 수 있는 동전(서버도 이 수로 막는다) — 사용자 10-15 「한 번에 다 10개를 모을 수 있게」: 하루에 다리 하나(10)를 혼자 채울 수 있다.
 * 나무에 숨기는 건 이보다 많이(COIN_HIDDEN) — 「10개 이상 숨겨놔. 그래야 사람들이 쉽게 찾지」. 더 주운 동전은 그날 주머니에만 남는다.
 */
export const COIN_DAY_MAX = 10;
export const COIN_HIDDEN = 15;
export type Drop = 'coin' | 'fruit';
/** 한국 날짜 번호(하루에 하나씩 늘어난다). */
export const kstDay = (now: number) => Math.round(kstDayStart(now) / (24 * 60 * 60 * 1000));
/**
 * 오늘 떨어지는 것 — 나무 번호 → 동전·열매. 날마다 바뀌고, 같은 날엔 누구에게나 같다. 동전은 COIN_HIDDEN 그루, 열매는 다섯 그루에 한 그루쯤.
 * 주운 것은 이 기기에만 적는다(places.ts loadPocket).
 */
export function dropsOn(day: number, trees: number) {
  const r = rng(`drop:${day}`), drops = new Map<number, Drop>();
  if (trees <= 0) return drops;
  for (let tries = 0; drops.size < Math.min(COIN_HIDDEN, trees) && tries < 200; tries++) drops.set(Math.floor(r() * trees), 'coin');
  for (let i = 0; i < trees; i++) if (!drops.has(i) && r() < 0.2) drops.set(i, 'fruit');
  return drops;
}
