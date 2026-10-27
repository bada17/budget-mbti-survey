/*
  한 판 전체를 돌리는 장면. 방(문항) 열다섯 개를 차례로 지난다.

  시작:    내 모습 고르기(카메라가 나에게 다가감) → 출발
  방 안:   두 주민이 말풍선으로 바람을 말함 → 한 사람에게 걸어감 → 대답 고르기(HTML)
           → 그 주민이 하트를 날리며 내 뒤에 줄 섬, 그 자리에 고른 것의 표지판이 섬 → 문이 열림 → 위로 나감
  방 사이: 화면이 위로 밀려 다음 방(같은 동네), 세 방마다 버스를 타고 다음 동네. 동네를 지날수록 아침 → 노을.
  끝:      강 건너 언덕 — 따라온 주민·초대한 친구가 모이고, 한 명을 내 이웃으로 고른다.
           끝 카드가 내려앉으면 언덕 위에 빛 아치가 피어난다 — 걸어서 지나면 마을(VillageScene)로 간다(10-14).

  답·진행은 runtime.send 로 flow.ts 에 맡긴다. 여기서는 위치·그림·연출만 다룬다.
*/
import Phaser from 'phaser';
import { DESTINATION } from '../content';
import { currentQuestion, type JourneyState } from '../flow';
import { orderedQuestions, displayOptions, type DisplaySide } from '../response';
import { FEEL } from '../feel';
import { layoutRoom, step, passedDoor, nearest, distance, alongTrail, rollBall, roomFence, type Point, type Room } from '../room';
import { OUTCOMES, THANKS } from '../outcomes';
import { nameFrom } from '../look';
import { TWISTS, streamOf, keepDry, catOf, CAT_WAKE, type TwistKind } from '../twists';
import { textRes, Dude, lookFrom, toLook, drawRoom, drawHill, drawPortal, PORTAL, drawBus, playOutcome, drawTwist, type TwistArt, hearts, dust, tapRing, confetti, flee, meow, sparkle, DAYLIGHT, type RoomArt, type Cat } from '../draw';
import type { Pick } from '../look';
import { sfx } from '../sfx';
import { prefersReducedMotion } from '../motion';
import type { Controls } from '../input';
import type { GameUI } from '../ui';
import type { GameEvent } from '../events';

export type SceneCommand =
  | { type: 'approach'; questionId: string; side: DisplaySide }
  | { type: 'leave' }
  | { type: 'exit'; stageIndex: number };

/** 언덕에 함께 서는 사람 — 초대한 친구. */
export type Guest = { id: string; name: string; pick: Pick; label: string };
/** 내 뒤를 따라오는 주민. 이웃으로 고르면 이 정보가 남는다. */
export type Follower = { dude: Dude; questionId: string; key: 'a' | 'b'; seed: string };

export type Runtime = {
  state(): JourneyState;
  send(command: SceneCommand): void;
  visible(questionId: string): void;
  subscribe(listener: (event: GameEvent) => void): () => void;
  view(): { w: number; h: number; dpr: number };
  controls: Controls;
  ui: GameUI;
  ready(): void;
  pick(): Pick;
  /** 내 이름(안 썼으면 빈 칸) — 언덕에서 내 머리 위 이름표. */
  name(): string;
  /** 언덕에서 다 같이 폴짝 뛴 뒤. 끝 화면은 main 이 띄운다. */
  arrived(): void;
  /** 언덕의 빛 아치를 지났다 — main 이 마을을 연다. */
  enter(): void;
  /** 언덕 안내하는 사람(사용자 10-19) — 아치 옆에 서 있다가 다가가면 meet(main 이 말 상자를 연다), 멀어지면 leave(닫는다). 이름은 머리 위 이름표. */
  guide: { meet(): void; leave(): void };
  busCaption(stage: number, skip: () => void): void;
  /** 버스가 서면 예산 퀴즈(quiz.ts) — 답하거나 넘기면 done. 퀴즈를 안 내면 false(그냥 잠깐 섰다 간다). */
  busQuiz(stage: number, done: () => void): boolean;
};

type Mode = 'intro' | 'dress' | 'enter' | 'play' | 'moving' | 'bus' | 'hill';
const SIDES: DisplaySide[] = ['left', 'right'];
const other = (side: DisplaySide): DisplaySide => (side === 'left' ? 'right' : 'left');
const lerp = (a: Point, b: Point, k: number) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const touchScreen = matchMedia('(pointer: coarse)').matches;

export class JourneyScene extends Phaser.Scene {
  private mode: Mode = 'intro';
  private roomIndex = 0;
  private room!: Room;
  private art!: RoomArt;
  /** 넘어오는 방도 매 프레임 숨쉰다. 좌표는 각 방 컨테이너 안의 at 그대로. */
  private roomCats = new Set<Cat>();
  private residents: Partial<Record<DisplaySide, Dude>> = {};
  private chosen?: DisplaySide;
  private doorOpen = false;
  private player!: Dude;
  private pos: Point = { x: 0, y: 0 };
  private speed = 0;
  private autoMoving = false;
  private trail: Point[] = [];
  private followers: Follower[] = [];
  private guests = new Map<string, Dude>();
  private hillTop?: Point;
  private hillArt?: Phaser.GameObjects.Container;
  private portal?: Phaser.GameObjects.Container;
  private portalScale = 1;
  private hillWalks = new Map<Dude, Phaser.Tweens.Tween>();
  /** 언덕을 방처럼 걷는다 — 빛 아치가 「문」(wallY 가 아치 발밑). 아치가 피기 전엔 없다. */
  private hillRoom?: Room;
  /** 빛 아치 뒤의 빛무리 — 가까이 갈수록 밝아진다(사용자 10-19 「텍스트로 들어가게 하는 건 너무 강제적」 → 아치가 들어가고 싶게). */
  private portalGlow?: Phaser.GameObjects.Container;
  /** 언덕 안내하는 사람 — 아치가 필 때 아치 옆에 선다. near 는 고양이처럼 멀어졌다 다시 오면 또 말을 건다. */
  private guide?: { dude: Dude; near: boolean; dots?: Phaser.GameObjects.Container };
  private warping = false;
  private tagsShown?: { text: string; x: number; y: number }[];
  private guestTags: { text: string; x: number; y: number }[] = [];
  private picking?: (follower: Follower) => void;
  private light!: Phaser.GameObjects.Rectangle;
  private busDone?: () => void;
  private dustClock = 0;
  private hintStep = 0;
  /** 방을 넘어갈 때 건물 속을 지나는 띠 — 이 안에 든 사람은 감춘다(문으로 들어가 다음 방 아래로 나오는 것처럼). */
  private insideBand?: { top: number; bottom: number };
  private sizeBuilt = { w: 0, h: 0 };
  // 브라우저로 돌아온 뒤 바뀐 설정도 읽는다 — 생성 때의 true/false를 붙잡지 않는다.
  private get reduced() { return prefersReducedMotion(); }

  constructor(private runtime: Runtime) { super('journey'); }

  create() {
    const { w, h, dpr } = this.runtime.view();
    this.cameras.main.setOrigin(0, 0).setZoom(dpr);
    // 동네마다 빛(아침 → 노을)을 화면 전체에 곱한다.
    this.light = this.add.rectangle(0, 0, w * 3, h * 3, DAYLIGHT[0][2]).setOrigin(0).setScrollFactor(0).setDepth(60000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.setRoom(this.buildRoom(0, 0));
    this.pos = { ...this.room.spawn };
    this.player = new Dude(this, toLook(this.runtime.pick()), this.pos.x, this.pos.y, 1, 0).place(this.pos); // 모습 고르기에서 2.4배로 당겨 보니 굽지 않는다
    this.trail = [{ x: this.pos.x, y: this.pos.y + 80 }, { ...this.pos }];
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapHill(p.worldX, p.worldY));
    const stop = this.runtime.subscribe(event => this.onEvent(event));
    this.events.once('shutdown', () => { stop(); this.roomCats.clear(); });
    this.runtime.ready();
  }

  // ── 내 모습 고르기: 카메라가 나에게 다가간다 ──
  dress() {
    if (this.mode !== 'intro') return;
    this.mode = 'dress';
    this.zoomTo(this.dressView());
  }

  /**
   * 내 모습 고르기 — 아래 고르는 판 위에 남은 자리 가운데에 나를 둔다. 판 높이는 폰마다 달라서
   * 자리를 재서 맞춘다(작은 폰에서 판이 나를 가리던 것, 10-14).
   */
  private dressView() {
    const { w } = this.runtime.view();
    const top = FEEL.dressTopPx, room = Math.max(40, this.runtime.ui.sheetTop() - top);
    const k = Math.min(FEEL.dressZoom, room / FEEL.dressBodyPx);
    return { z: k, x: this.pos.x - w / 2 / k, y: this.pos.y - 28 - (top + room / 2) / k };
  }
  setLook(pick: Pick) {
    this.player.destroy();
    this.player = new Dude(this, toLook(pick), this.pos.x, this.pos.y, 1, 0).place(this.pos);
    this.player.hop(10, 1, this.reduced);
  }

  private zoomTo(to: { z: number; x: number; y: number }, done?: () => void) {
    const cam = this.cameras.main, { dpr } = this.runtime.view();
    const from = { z: cam.zoom / dpr, x: cam.scrollX, y: cam.scrollY };
    this.tweens.addCounter({
      from: 0, to: 1, duration: this.reduced ? 1 : 480, ease: 'Sine.easeInOut',
      onUpdate: tween => {
        const t = tween.getValue() ?? 1;
        cam.setZoom(dpr * (from.z + (to.z - from.z) * t));
        cam.scrollX = from.x + (to.x - from.x) * t; cam.scrollY = from.y + (to.y - from.y) * t;
      },
      onComplete: () => done?.(),
    });
  }

  // ── 방 만들기 ──
  private buildRoom(index: number, offsetY: number) {
    const { w, h } = this.runtime.view();
    const question = orderedQuestions[index];
    const room = layoutRoom(w, h);
    const art = drawRoom(this, room, Math.floor(index / 3), question.id, offsetY, question.place);
    if (art.cat) this.roomCats.add(art.cat);
    const residents: Partial<Record<DisplaySide, Dude>> = {};
    for (const side of SIDES) {
      const at = room.residents[side];
      residents[side] = new Dude(this, lookFrom(`${question.id}:${side}`), at.x, at.y + offsetY).place({ x: at.x, y: at.y + offsetY });
    }
    return { index, room, art, residents };
  }

  private setRoom(built: ReturnType<JourneyScene['buildRoom']>) {
    this.roomIndex = built.index; this.room = built.room; this.art = built.art; this.residents = built.residents;
    this.chosen = undefined; this.doorOpen = false;
    this.sizeBuilt = { w: built.room.w, h: built.room.h };
  }

  private dropRoom() {
    if (this.art.cat) this.roomCats.delete(this.art.cat);
    this.art.destroy();
    this.dropTwist();
    this.dropResidents();
    this.tweens.killTweensOf(this.outcome);
    this.outcome.forEach(o => o.destroy());
    this.outcome = [];
  }
  /** 고른 대답으로 방에 생긴 것(outcomes.ts) — 방을 떠나면 지운다. */
  private outcome: Phaser.GameObjects.GameObject[] = [];
  /** 이 방의 놀이(twists.ts) — 개울·고양이 깼나. 방을 떠나면 지운다. */
  private twist?: { room: number; kind: TwistKind; art: TwistArt; done: boolean };

  /** 방에 놀이가 있으면 그린다(질문이 뜰 때, 한 방에 한 번). */
  private ensureTwist() {
    const kind = TWISTS[this.roomIndex];
    if (!kind || this.twist?.room === this.roomIndex) return;
    this.twist = { room: this.roomIndex, kind, art: drawTwist(this, kind, this.room, this.runtime.view().dpr, this.reduced), done: false };
  }
  /** 톡으로 가는 길이 개울을 건너면 — 지금 밟고 선 돌 다음 돌을 겨냥한다(마지막 돌 뒤엔 원래 자리). */
  private aimAround(target: Point): Point {
    if (this.twist?.kind !== 'stream') return target;
    const s = streamOf(this.room);
    const up = target.y < s.y0 && this.pos.y > s.y0, down = target.y > s.y1 && this.pos.y < s.y1;
    if (!up && !down) return target;
    const order = up ? s.stones : [...s.stones].reverse();
    // 밟고 선 돌 = 반지름 안에서 가장 가까운 돌(「가장 먼 돌」 로 재면 경계에서 앞뒤 돌을 번갈아 겨냥해 멈췄다)
    let on = -1, best = s.r;
    order.forEach((stone, i) => { const d = distance(this.pos, stone); if (d < best) { best = d; on = i; } });
    // 마지막 돌에선 먼저 곧장 물 밖으로 한 걸음 — 비스듬히 나가면 돌 가장자리 물에 걸렸다
    const last = order[order.length - 1], exit = { x: last.x, y: up ? s.y0 - 10 : s.y1 + 10 };
    return [...order, exit][on + 1];
  }
  private dropTwist() { this.twist?.art.objs.forEach(o => o.destroy()); this.twist = undefined; }

  /** 매 프레임 — 고양이 깨우기. */
  private playTwist() {
    const t = this.twist;
    if (!t || t.done || this.mode !== 'play') return;
    if (t.kind === 'cat' && t.art.cat && distance(this.pos, catOf(this.room)) < CAT_WAKE) {
      const kitty = t.art.cat;
      meow(this, kitty, this.reduced); sfx.meow();
      t.art.zz?.setVisible(false);
      const to = { x: kitty.at.x + (this.pos.x < kitty.at.x ? 70 : -70), y: kitty.at.y + 26 };
      this.tweens.add({ targets: kitty.root, x: to.x, y: to.y, duration: this.reduced ? 1 : 700, delay: this.reduced ? 0 : 450, ease: 'Sine.easeInOut', onComplete: () => { kitty.at = to; kitty.root.setDepth(to.y); } });
      t.done = true;
    }
  }
  private dropResidents() {
    for (const side of SIDES) this.residents[side]?.destroy();
    this.residents = {};
  }

  /** 아래에서 걸어 들어와 서면 질문을 띄운다. */
  private enterRoom() {
    this.mode = 'enter';
    const from = { ...this.pos }, to = { ...this.room.spawn };
    this.autoMoving = true;
    this.tweens.addCounter({
      from: 0, to: 1, duration: this.reduced ? 1 : FEEL.enterMs, ease: 'Sine.easeOut',
      onUpdate: tween => { this.pos = lerp(from, to, tween.getValue() ?? 1); },
      onComplete: () => { this.autoMoving = false; this.mode = 'play'; this.showAsk(); },
    });
  }

  private showAsk() {
    this.ensureTwist();
    const question = orderedQuestions[this.roomIndex];
    const anchors = Object.fromEntries(SIDES.map(side => [side, { x: this.room.residents[side].x, y: this.room.residents[side].y - 56 }])) as Record<DisplaySide, Point>;
    const ms = this.runtime.ui.ask(question, this.runtime.state().sessionId, anchors, i => sfx.bubble(i));
    this.time.delayedCall(ms, () => { if (this.mode === 'play' && !this.chosen) this.runtime.visible(question.id); });
    if (this.hintStep === 0) this.runtime.ui.walkHint(touchScreen ? '엄지를 대고 밀면 그쪽으로 걸어가요' : '방향키나 마우스로 끌어서 걸어가요');
  }

  // ── 매 프레임 ──
  update(_time: number, delta: number) {
    if (!this.player) return;
    const dt = Math.min(delta, FEEL.maxDeltaMs);
    const state = this.runtime.state();
    const resting = this.reduced || state.paused;
    for (const kitty of this.roomCats) kitty.pet.step(dt, resting);
    this.twist?.art.cat?.pet.step(dt, resting, !this.twist.done);
    const before = { ...this.pos };
    if (this.mode === 'play' && !state.paused) this.walk(dt);
    else if (this.hillRoom && !this.warping) this.walk(dt, this.hillRoom, [], true);
    const moving = this.autoMoving || distance(before, this.pos) > 0.05;
    if (moving) this.player.look(this.pos.x - before.x, this.pos.y - before.y);
    if (moving && this.hintStep === 0 && this.mode === 'play') { this.hintStep = 1; this.runtime.ui.hint(); } // 걷기 시작하면 손 안내는 치운다
    if (moving && this.hillRoom && this.guestTags !== this.tagsShown) { this.tagsShown = this.guestTags; this.runtime.ui.tags(this.guestTags); } // 걷기 시작하면 「나」 이름표는 떼어 둔다(글이라 따라오지 못한다)
    if (!this.warping) this.player.place(this.pos).walk(dt, moving, this.reduced); // 빨려 들어가는 동안은 트윈이 옮긴다
    if (moving && !this.reduced && this.mode !== 'bus' && (this.dustClock += dt) > FEEL.dustEveryMs) { this.dustClock = 0; dust(this, this.pos.x - 6, this.pos.y); }
    this.recordTrail();
    if (this.mode !== 'hill') this.follow(dt);
    if (this.hillRoom && !this.warping && passedDoor(this.pos, this.hillRoom)) this.warp();
    if (this.portalGlow && this.hillRoom) { // 아치에 다가갈수록 빛무리가 밝고 크게
      const near = 1 - Math.min(1, distance(this.pos, { x: this.hillRoom.door.x, y: this.hillRoom.wallY }) / 220);
      this.portalGlow.setAlpha(0.45 + near * 0.55);
    }
    if (this.guide && this.hillRoom && !this.warping) {
      const { dude } = this.guide, d = distance(this.pos, dude);
      dude.look(this.pos.x - dude.x, this.pos.y - dude.y);
      if (!this.guide.near && d < FEEL.guideRadius) {
        this.guide.near = true;
        this.runtime.controls.clear();
        dude.hop(12, 1, this.reduced);
        sfx.meet();
        if (this.guide.dots) { this.tweens.killTweensOf(this.guide.dots); this.guide.dots.destroy(); this.guide.dots = undefined; } // 한 번 말을 들으면 「...」 은 거둔다
        this.runtime.guide.meet();
      }
      else if (this.guide.near && d > FEEL.guideRadius + 30) { this.guide.near = false; this.runtime.guide.leave(); }
    }
    if (this.insideBand) for (const dude of [this.player, ...this.followers.map(f => f.dude)]) dude.root.setVisible(dude.y < this.insideBand.top || dude.y > this.insideBand.bottom);
    if (this.mode !== 'play') return;
    // 고른 뒤엔 남은 주민이 손 흔들고 나가는 중이라 여기서 붙잡지 않는다.
    if (!this.chosen) for (const side of SIDES) {
      this.residents[side]?.look(this.pos.x - this.room.residents[side].x, this.pos.y - this.room.residents[side].y);
      this.residents[side]?.walk(dt, false, this.reduced);
    }
    this.meet(state);
    for (const bird of this.art.pigeons) {
      if (!bird.fled && distance(this.pos, bird.at) < FEEL.pigeonFleeRadius) { flee(this, bird, this.pos); sfx.flutter(); }
    }
    const toy = this.art.ball;
    if (toy) {
      if (rollBall(toy, this.pos, dt, roomFence(this.room))) sfx.kick();
      toy.root.setPosition(toy.at.x, toy.at.y);
      toy.spin.angle += (Math.hypot(toy.v.x, toy.v.y) * dt / 1000 / 9) * (180 / Math.PI) * (toy.v.x < 0 ? -1 : 1);
    }
    const kitty = this.art.cat;
    if (kitty) {
      const d = distance(this.pos, kitty.at);
      if (!kitty.near && d < FEEL.catRadius) { kitty.near = true; meow(this, kitty, this.reduced); sfx.meow(); }
      else if (kitty.near && d > FEEL.catRadius + 30) kitty.near = false; // 멀어졌다 다시 오면 또 야옹
    }
    this.playTwist();
    if (this.doorOpen && passedDoor(this.pos, this.room)) this.leaveRoom();
  }

  /** 언덕에서 걸을 수 있나 — 빛 아치가 피었고, 이웃을 고르는 중이 아닐 때(main 의 조작 켜기가 묻는다). */
  hillOpen() { return Boolean(this.hillRoom) && !this.warping && !this.picking; }

  /** 끝 카드 아래 남은 풀밭에 빛 아치를 세운다. 나는 그 아래 몇 걸음 떨어져 있다. */
  private openPortal() {
    if (!this.hillTop || this.mode !== 'hill' || this.hillRoom) return;
    this.relayoutHill(); // 결과 카드가 뜬 뒤 실제 남은 풀밭으로 맞춘다(짧은 가로 화면 포함).
    const { top, base, floor, scale } = this.hillLayout();
    const { w, h } = this.runtime.view();
    this.portal = drawPortal(this, top.x, base, this.reduced);
    if (scale < 1) { this.tweens.killTweensOf(this.portal); this.portal.setScale(scale).setAlpha(1); }
    this.glowPortal(top.x, base);
    sparkle(this, top.x, base - PORTAL.height / 2, this.reduced);
    sfx.portal();
    const far = { x: -999, y: -999 };
    this.hillRoom = { w, h, wallY: base, door: { x: top.x, half: PORTAL.half * scale }, residents: { left: far, right: far }, spawn: { ...top }, floor };
    this.player.look(0, -1);
    this.standGuide(top, base);
  }

  /**
   * 안내하는 사람을 아치 발치 오른쪽에 세운다 — 처음 선 자리에선 말을 걸지 않고(끝 화면을 먼저 보게), 아치로 걸어 올라가면 들어가기 전에 말을 건다(FEEL.guideRadius).
   * 모습은 주민 씨앗 하나(lookFrom) — 따로 그린 모습·서는 자리 다듬기는 GPT 몫.
   */
  private standGuide(top: Point, base: number) {
    const spot = { x: top.x + FEEL.guideSidePx, y: base + 10 };
    const dude = new Dude(this, { ...lookFrom('hill-guide'), top: 'jacket', coat: 0x608c81, accessory: 'scarf' }, spot.x, spot.y).place(spot);
    dude.look(-1, 1);
    dude.hop(14, 2, this.reduced);
    sparkle(this, spot.x, spot.y - 30, this.reduced);
    // 머리 위 「...」 말풍선 — 할 말이 있다는 표시라 가 보고 싶게(사용자 10-19). 둥실. 모양 다듬기는 GPT 몫.
    const dotsAt = { x: spot.x, y: spot.y - 90 };
    // 결과 카드 아래의 좁은 틈에서도 보이게 머리 오른쪽 위에 둔다. 바깥 기준점은 회전 재배치와 같다.
    const dots = this.add.container(dotsAt.x, dotsAt.y, [this.add.container(36, 34, [
      this.add.ellipse(1, 3, 44, 29, 0xc5ab80, 0.45),
      this.add.triangle(-5, 14, -5, 0, 5, 0, 0, 7, 0xd6bf98),
      this.add.triangle(-5, 12, -4, 0, 4, 0, 0, 6, 0xfffcf3),
      this.add.ellipse(0, 0, 44, 29, 0xfffcf3).setStrokeStyle(1.5, 0xd6bf98),
      this.add.text(0, -4, '...', { fontFamily: '"Jua", sans-serif', fontSize: '22px', color: '#55754c', resolution: textRes(this.runtime.view().dpr) }).setOrigin(0.5),
    ])]).setDepth(spot.y + 200);
    if (!this.reduced) this.tweens.add({ targets: dots, y: dotsAt.y - 5, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.guide = { dude, near: false, dots }; // 이름표는 안 단다(10-20 사용자 「안내하는 사람 이름 삭제해」)
    this.runtime.ui.tags([{ text: this.runtime.name() || '나', x: this.player.x, y: this.player.y - 58 }, ...this.guestTags]);
  }

  /** 안내하는 사람의 「마을로 가기」 — 나를 아치로 걸어 들어가게(지나면 warp). */
  toArch() {
    if (!this.hillRoom || this.warping) return;
    this.runtime.controls.target = { x: this.hillRoom.door.x, y: this.hillRoom.wallY - 20 };
  }

  /**
   * 아치가 핀 뒤 — 뒤에서 빛이 숨 쉬듯 부풀고(맥박), 테 둘레로 반짝이가 올라간다. 글·단추는 더하지 않는다(사용자 10-19).
   * 밝기는 update 가 나와의 거리로 바꾼다. 움직임 줄이기면 빛무리만 가만히. 느낌 다듬기는 GPT 몫.
   */
  private glowPortal(x: number, base: number) {
    const { half, height } = PORTAL, mid = base - height * this.portalScale * 0.55;
    const glow = this.add.container(x, mid, [
      this.add.ellipse(0, 0, half * 3.8, height * 1.55, 0xffdea9, 0.12),
      this.add.ellipse(0, 4, half * 2, height, 0xfff6df, 0.27),
    ]).setDepth(base - 1).setAlpha(0.58);
    this.portalGlow = glow;
    glow.setScale(this.portalScale);
    if (this.reduced) return;
    this.tweens.add({ targets: glow, scale: this.portalScale * 1.08, duration: 1450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({
      delay: 520, loop: true, callback: () => {
        if (!glow.active || this.warping) return;
        const side = Math.random() < 0.5 ? -1 : 1, room = this.hillRoom;
        const sx = (room?.door.x ?? x) + side * (half + 4 + Math.random() * 11) * this.portalScale, sy = (room?.wallY ?? base) - 9 - Math.random() * height * this.portalScale * 0.73;
        const star = this.add.star(sx, sy, 4, 0.9, 3.2 + Math.random() * 1.5, Math.random() < 0.45 ? 0xfff9dd : 0xffdc99, 0.84).setDepth(base + 2);
        this.tweens.add({ targets: star, y: sy - 25 - Math.random() * 20, angle: 75, alpha: 0, scale: 0.35, duration: 1100, ease: 'Sine.easeOut', onComplete: () => star.destroy() });
      },
    });
  }

  /** 빛 아치를 지났다 — 작아지며 빛 속으로, 그다음 main 이 마을을 연다. */
  private warp() {
    this.warping = true;
    this.runtime.controls.clear();
    const room = this.hillRoom!, into = { x: room.door.x, y: room.wallY - PORTAL.height * 0.45 };
    sfx.warp();
    sparkle(this, into.x, into.y, this.reduced);
    this.followers.forEach(({ dude }, i) => this.time.delayedCall(i * FEEL.cheerGapMs, () => dude.hop(12, 1, this.reduced)));
    this.tweens.add({ targets: this.player.root, x: into.x, y: into.y, scale: 0.25, alpha: 0, duration: this.reduced ? 1 : FEEL.warpMs, ease: 'Cubic.easeIn' });
    this.time.delayedCall(this.reduced ? 0 : FEEL.warpMs, () => this.runtime.enter());
  }

  private walk(dt: number, room = this.room, solid = SIDES.filter(side => this.residents[side]).map(side => this.room.residents[side]), doorOpen = this.doorOpen) {
    const controls = this.runtime.controls;
    if (controls.tapped) { tapRing(this, controls.tapped.x, controls.tapped.y); controls.tapped = undefined; }
    let dir = controls.keyVector();
    let speedCap = Infinity;
    if (dir.x || dir.y) controls.target = undefined;
    else if (controls.target) {
      const aim = room === this.room ? this.aimAround(controls.target) : controls.target; // 개울 건너편이면 징검돌을 차례로
      const d = distance(aim, this.pos);
      if (d < 3 && aim === controls.target) { if (!controls.holding) controls.target = undefined; dir = { x: 0, y: 0 }; }
      else if (d >= 0.5) { dir = { x: (aim.x - this.pos.x) / d, y: (aim.y - this.pos.y) / d }; speedCap = d * 1000 / dt; }
    }
    if (!dir.x && !dir.y) { this.speed = 0; return; }
    this.speed = Math.min(FEEL.walkSpeed, this.speed + FEEL.walkSpeed * dt / FEEL.accelMs);
    const t = room === this.room ? this.twist : undefined;
    const blockers = t?.kind === 'cat' && !t.done ? [...solid, catOf(room)] : solid;
    let next = step(this.pos, dir, Math.min(this.speed, speedCap), dt, room, doorOpen, blockers);
    if (t?.kind === 'stream') next = keepDry(this.pos, next, streamOf(room));
    if (distance(next, this.pos) < 0.05 && controls.target && !controls.holding) controls.target = undefined;
    this.pos = next;
  }

  /** 주민 곁에 가면 대답 창이 열리고, 멀어지면 닫힌다. */
  private meet(state: JourneyState) {
    const question = orderedQuestions[this.roomIndex];
    if (this.chosen || currentQuestion(state)?.id !== question.id || state.paused) return;
    if (state.phase === 'question') {
      const side = nearest(this.pos, this.room, FEEL.meetRadius);
      if (!side) return;
      if (!this.runtime.controls.holding) this.runtime.controls.target = undefined;
      this.runtime.send({ type: 'approach', questionId: question.id, side });
    } else if (state.phase === 'reply' && state.candidate) {
      const switched = nearest(this.pos, this.room, FEEL.meetRadius, [other(state.candidate)]);
      if (switched || distance(this.pos, this.room.residents[state.candidate]) > FEEL.leaveRadius) this.runtime.send({ type: 'leave' });
    }
  }

  // ── 따라오는 주민 ──
  private recordTrail() {
    const last = this.trail[this.trail.length - 1];
    if (last && distance(last, this.pos) < 3) return;
    this.trail.push({ ...this.pos });
    const keep = Math.ceil(((this.followers.length + 2) * FEEL.followGap) / 3) + 40;
    if (this.trail.length > keep) this.trail.splice(0, this.trail.length - keep);
  }

  private follow(dt: number) {
    this.followers.forEach(({ dude }, i) => {
      const want = alongTrail(this.trail, (i + 1) * FEEL.followGap);
      if (!want) return;
      const dx = want.x - dude.x, dy = want.y - dude.y, d = Math.hypot(dx, dy);
      const reach = Math.max(FEEL.walkSpeed * FEEL.followerCatchUp, d * 4) * dt / 1000;
      const k = d > 0.5 ? Math.min(1, reach / d) : 0;
      dude.place({ x: dude.x + dx * k, y: dude.y + dy * k }).walk(dt, k > 0, this.reduced);
      if (k > 0) dude.look(dx, dy);
    });
  }

  // ── 신호에 붙는 연출 ──
  private onEvent(event: GameEvent) {
    if (event.type === 'journey.started') this.zoomTo({ z: 1, x: 0, y: 0 }, () => { this.mode = 'play'; this.showAsk(); });
    if (event.type === 'resident.approached') {
      this.residents[event.displaySide]?.hop(5, 1, this.reduced);
      if (this.hintStep === 0) { this.hintStep = 1; this.runtime.ui.hint(); }
    }
    if (event.type === 'question.answered') this.answered(event.displaySide, event.level);
  }

  private answered(side: DisplaySide, level: number) {
    const dude = this.residents[side];
    if (!dude || this.chosen) return;
    this.chosen = side;
    // 방에서 바로 빼 둔다 — 줄에 서기 전에 방을 다시 깔아도(화면 회전) 이 사람은 지워지지 않게.
    delete this.residents[side];
    const question = orderedQuestions[this.roomIndex];
    const option = displayOptions(this.runtime.state().sessionId, question).find(o => o.side === side)!;
    const spot = { ...this.room.residents[side] };
    this.runtime.ui.clearAsk(side);
    // 고르면 방이 바로 바뀐다 + 고른 주민의 한마디(10-14 「게임으로 역할을 못 한다」 ⓐ)
    const seed = `${question.id}:${side}`, roomAt = this.roomIndex;
    this.runtime.ui.say(nameFrom(seed), THANKS[level] ?? THANKS[1]);
    const plan = OUTCOMES[question.id]?.[option.key];
    if (plan) this.time.delayedCall(this.reduced ? 0 : 300, () => {
      if (this.mode !== 'play' || this.roomIndex !== roomAt) return;
      this.outcome.push(...playOutcome(this, plan, { spot, room: this.room, dpr: this.runtime.view().dpr, reduced: this.reduced, seed }));
    });
    dude.hop(FEEL.jumpPx[level], FEEL.jumps[level], this.reduced);
    hearts(this, dude.x, dude.y - 44, FEEL.hearts[level], this.reduced);
    if (FEEL.shake[level] && !this.reduced) this.cameras.main.shake(160, FEEL.shake[level]);
    // 안 고른 주민은 손 흔들고 옆으로 걸어 나간다 — 시무룩하면 미안해서 다음 답이 끌린다(사용자 10-14).
    const passed = this.residents[other(side)];
    if (passed) {
      const outX = other(side) === 'left' ? -40 : this.room.w + 40;
      passed.look(this.pos.x - passed.x, this.pos.y - passed.y);
      passed.wave(2, this.reduced);
      if (this.reduced) passed.root.setVisible(false);
      else this.tweens.add({
        targets: passed.root, x: outX, delay: FEEL.waveMs, duration: FEEL.walkOffMs, ease: 'Sine.easeIn',
        onStart: () => passed.look(outX - passed.x, 0),
        onUpdate: () => { if (passed.root.active) passed.walk(Math.min(this.game.loop.delta, FEEL.maxDeltaMs), true, false); },
      });
    }
    this.time.delayedCall(FEEL.joinDelayMs, () => {
      // 새 사람이 줄에 서면 먼저 온 사람들이 차례로 폴짝 반긴다.
      this.followers.forEach((friend, i) => this.time.delayedCall(i * 45, () => friend.dude.hop(7, 1, this.reduced)));
      this.followers.push({ dude, questionId: question.id, key: option.key, seed: `${question.id}:${side}` });
      this.tweens.add({ targets: dude.root, scale: FEEL.followerScale, duration: 200 });
      // 그 주민이 서 있던 자리에 고른 것이 생긴다 — 문항의 짧은 이름 그대로(새 문구를 짓지 않는다).
      if (this.mode === 'play' && this.roomIndex === orderedQuestions.indexOf(question)) {
        sparkle(this, spot.x, spot.y - 20, this.reduced);
        this.runtime.ui.made(option.short, { x: spot.x, y: spot.y - 6 });
      }
    });
    this.time.delayedCall(260, () => this.openDoorNow());
  }

  private openDoorNow() {
    if (this.mode !== 'play' || this.doorOpen) return;
    this.doorOpen = true;
    this.art.openDoor(this.reduced);
    sfx.door();
    this.showDoor();
    if (this.hintStep === 1) this.hintStep = 2; // 문 위 화살표가 알려 준다
  }

  private showDoor() {
    const label = this.roomIndex === orderedQuestions.length - 1 ? DESTINATION.name : this.roomIndex % 3 === 2 ? '버스 타러' : '다음 장소';
    this.runtime.ui.door(label, { x: this.room.door.x, y: this.room.wallY - 104 });
  }

  /** 말풍선을 누르면 그 주민 앞까지 걸어간다. */
  goTo(side: DisplaySide) {
    if (this.mode !== 'play' || this.chosen) return;
    const at = this.room.residents[side];
    this.runtime.controls.target = { x: at.x, y: at.y + FEEL.talkGap };
  }

  /** 문 단추를 누르면 문으로 걸어 나간다. */
  goDoor() {
    if (this.mode === 'play' && this.doorOpen) this.runtime.controls.target = { x: this.room.door.x, y: this.room.wallY - 30 };
  }

  // ── 방을 나서기 ──
  private leaveRoom() {
    const stageIndex = Math.floor(this.roomIndex / 3);
    const last = this.roomIndex === orderedQuestions.length - 1;
    const stageEnd = this.roomIndex % 3 === 2;
    this.mode = 'moving';
    this.insideBand = undefined;
    for (const dude of [this.player, ...this.followers.map(f => f.dude)]) dude.root.setVisible(true);
    this.runtime.controls.clear();
    this.runtime.ui.door(); this.runtime.ui.hint(); this.runtime.ui.clearAsk(); this.runtime.ui.made();
    if (stageEnd) {
      this.runtime.send({ type: 'exit', stageIndex });
      const state = this.runtime.state();
      if (last ? state.phase !== 'arrived' : state.stageIndex !== stageIndex + 1) { this.mode = 'play'; return; }
    }
    if (last) this.toHill();
    else if (stageEnd) this.toBus(stageIndex + 1);
    else {
      const built = this.buildRoom(this.roomIndex + 1, -this.room.h);
      this.scrollUp(built.art.box, built.room.spawn, () => {
        this.setRoom(built);
        for (const side of SIDES) built.residents[side]!.place(built.room.residents[side]);
      });
    }
  }

  /** 화면이 위로 밀리며 다음 칸으로. 다 밀리면 좌표를 제자리(0)로 되돌린다. */
  private scrollUp(box: Phaser.GameObjects.Container, spawn: Point, arrive: () => void) {
    const H = this.room.h, cam = this.cameras.main;
    const from = { ...this.pos }, to = { x: spawn.x, y: spawn.y - H };
    this.insideBand = { top: -14, bottom: this.room.wallY - 8 };
    sfx.whoosh();
    this.autoMoving = true;
    this.tweens.addCounter({
      from: 0, to: 1, duration: this.reduced ? 1 : FEEL.roomScrollMs, ease: 'Sine.easeInOut',
      onUpdate: tween => { const k = tween.getValue() ?? 1; this.pos = lerp(from, to, k); cam.scrollY = -H * k; },
      onComplete: () => {
        this.dropRoom();
        const shift = (p: Point) => { p.y += H; };
        shift(this.pos); this.trail.forEach(shift);
        this.insideBand = { top: this.insideBand!.top + H, bottom: this.insideBand!.bottom + H };
        for (const { dude } of this.followers) dude.place({ x: dude.x, y: dude.y + H });
        cam.scrollY = 0;
        box.setY(0);
        arrive();
        this.autoMoving = false;
        if (this.mode === 'moving') { this.mode = 'play'; this.showAsk(); }
      },
    });
  }

  private fade(out: boolean, done: () => void) {
    const cam = this.cameras.main;
    // 페이드아웃 도중 설정이 바뀌면, 생략한 페이드인의 덮개도 걷는다.
    if (this.reduced) { if (!out) cam.fadeEffect.reset(); done(); return; }
    cam.once(out ? Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE : Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, done);
    if (out) cam.fadeOut(200, 255, 250, 240); else cam.fadeIn(220, 255, 250, 240);
  }

  /** 세 방마다 버스를 타고 다음 동네로. 버스 창에 내 얼굴. 눌러서 넘길 수 있다. */
  private toBus(stage: number) {
    this.mode = 'bus';
    const people = [this.player, ...this.followers.map(f => f.dude)];
    this.fade(true, () => {
      this.dropRoom();
      people.forEach(dude => dude.root.setVisible(false));
      const { w, h } = this.runtime.view();
      const { box, bus } = drawBus(this, w, h, stage, toLook(this.runtime.pick()), this.followers.length);
      this.light.setFillStyle(DAYLIGHT[stage][2]);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        this.busDone = undefined;
        this.tweens.killTweensOf(bus);
        this.runtime.busCaption(-1, () => {});
        this.fade(true, () => {
          box.destroy();
          this.setRoom(this.buildRoom(this.roomIndex + 1, 0));
          this.pos = { x: this.room.spawn.x, y: this.room.h + 40 };
          this.trail = [{ x: this.pos.x, y: this.pos.y + (this.followers.length + 2) * FEEL.followGap }, { ...this.pos }];
          this.followers.forEach(({ dude }, i) => dude.place(alongTrail(this.trail, (i + 1) * FEEL.followGap)!));
          people.forEach(dude => dude.root.setVisible(true));
          this.fade(false, () => {});
          this.enterRoom();
        });
      };
      this.busDone = finish;
      this.fade(false, () => {});
      sfx.whoosh();
      this.runtime.busCaption(stage, finish);
      // 들어와 서고 → 퀴즈에 답하면(넘기면) 떠난다. 서 있는 동안은 통통.
      const leave = () => {
        if (finished) return;
        this.tweens.killTweensOf(bus);
        this.tweens.add({ targets: bus, x: w + 160, duration: this.reduced ? 1 : 650, ease: 'Cubic.easeIn', onComplete: finish });
      };
      this.tweens.add({
        targets: bus, x: w / 2, duration: this.reduced ? 1 : 800, ease: 'Cubic.easeOut',
        onComplete: () => {
          if (finished) return;
          if (!this.runtime.busQuiz(stage, leave)) { this.time.delayedCall(this.reduced ? 0 : 700, leave); return; }
          if (!this.reduced) this.tweens.add({ targets: bus, y: bus.y - 2, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        },
      });
    });
  }

  skipBus() { this.busDone?.(); }

  /** 점검 지름길(main.ts skipToEnd) — 고른 주민들을 내 뒤에 세우고 바로 언덕으로. */
  skipToEnd(picked: { questionId: string; side: DisplaySide; key: 'a' | 'b' }[]) {
    this.dropResidents();
    for (const { questionId, side, key } of picked) {
      const at = { x: this.pos.x, y: this.pos.y + 34 };
      this.followers.push({ dude: new Dude(this, lookFrom(`${questionId}:${side}`), at.x, at.y, FEEL.followerScale).place(at), questionId, key, seed: `${questionId}:${side}` });
    }
    this.roomIndex = orderedQuestions.length - 1;
    this.mode = 'moving';
    this.toHill();
  }

  /** 점검 지름길 ?room= — 고른 주민들을 줄 세우고 그 방에서 바로 시작(main.ts skipToRoom). */
  skipToRoom(index: number, picked: { questionId: string; side: DisplaySide; key: 'a' | 'b' }[]) {
    this.dropRoom();
    this.setRoom(this.buildRoom(index, 0));
    this.pos = { ...this.room.spawn };
    this.trail = [{ x: this.pos.x, y: this.pos.y + 80 }, { ...this.pos }];
    for (const { questionId, side, key } of picked) {
      const at = { x: this.pos.x, y: this.pos.y + 34 };
      this.followers.push({ dude: new Dude(this, lookFrom(`${questionId}:${side}`), at.x, at.y, FEEL.followerScale).place(at), questionId, key, seed: `${questionId}:${side}` });
    }
    this.light.setFillStyle(DAYLIGHT[Math.floor(index / 3)][2]);
    this.player.place(this.pos);
    this.mode = 'play';
    this.showAsk();
  }

  private toHill() {
    const { w, h } = this.runtime.view();
    const hill = drawHill(this, w, h, -h);
    this.hillArt = hill.box;
    this.sizeBuilt = { w, h };
    this.light.setFillStyle(DAYLIGHT[5][2]);
    this.scrollUp(hill.box, hill.top, () => { this.mode = 'hill'; this.hillTop = hill.top; this.gather(hill.top); });
  }

  /** 마을로 — 화면이 어두워진 뒤 done(main 이 마을 장면을 연다). */
  leave(done: () => void) {
    this.runtime.controls.clear();
    this.fade(true, done);
  }

  /** 언덕 꼭대기에 서면 따라온 주민들이 둘러서고, 다 같이 폴짝. */
  private gather(top: Point) {
    const n = this.followers.length;
    this.followers.forEach(({ dude }, i) => {
      const spot = this.gatherSpot(i, n, top);
      this.walkTo(dude, spot, FEEL.gatherMs + i * 30, top);
    });
    this.player.look(0, 1);
    const cheerAt = this.reduced ? 0 : FEEL.gatherMs + n * 30 + 100;
    this.time.delayedCall(cheerAt, () => {
      sfx.fanfare();
      confetti(this, this.runtime.view().w, 0, this.reduced);
      this.player.hop(26, 2, this.reduced);
      this.followers.forEach(({ dude }, i) => this.time.delayedCall(i * FEEL.cheerGapMs, () => dude.hop(16, 2, this.reduced)));
      this.time.delayedCall(FEEL.revealDelayMs, () => {
        this.runtime.arrived();
        this.time.delayedCall(this.reduced ? 0 : FEEL.portalDelayMs, () => this.openPortal());
      });
    });
  }

  private walkTo(dude: Dude, spot: Point, ms: number, face: Point) {
    const start = { x: dude.x, y: dude.y };
    const tween = this.tweens.addCounter({
      from: 0, to: 1, duration: this.reduced ? 1 : ms, ease: 'Sine.easeInOut',
      onUpdate: tween => { const p = lerp(start, spot, tween.getValue() ?? 1); dude.look(p.x - dude.x, p.y - dude.y); dude.place(p).walk(Math.min(this.game.loop.delta, FEEL.maxDeltaMs), true, this.reduced); },
      onComplete: () => { this.hillWalks.delete(dude); dude.walk(16, false, this.reduced); dude.look(face.x - spot.x, face.y - spot.y); },
    });
    this.hillWalks.set(dude, tween);
  }

  private gatherSpot(i: number, n: number, top: Point) {
    const inner = i < 6, j = inner ? i : i - 6, count = inner ? Math.min(6, n) : n - 6;
    const spread = Math.PI * 1.15, angle = Math.PI / 2 - spread / 2 + spread * (j + 0.5) / Math.max(1, count), radius = inner ? 60 : 100;
    return { x: top.x - Math.cos(angle) * radius, y: top.y + Math.sin(angle) * radius * 0.55 - (inner ? 0 : 6) };
  }

  private hillLayout() {
    const { w, h } = this.runtime.view(), free = this.runtime.ui.endFree();
    const floor = Math.min(h - 22, free.bottom - 8), nominal = Math.round(h * 0.68);
    const scale = Math.min(1, Math.max(1, floor - free.top - 8) / (PORTAL.height + FEEL.portalGapPx));
    const base = Math.round(Math.min(floor - FEEL.portalGapPx * scale, Math.max(free.top + PORTAL.height * scale + 8, nominal - FEEL.portalGapPx * 1.6 * scale)));
    return { top: { x: w / 2, y: Math.min(floor, Math.max(base + FEEL.portalGapPx * scale, nominal)) }, base, floor, scale };
  }

  private relayoutHill() {
    if (!this.hillTop || this.warping) return;
    const { w, h } = this.runtime.view(), old = this.hillRoom;
    const { top, base, floor, scale } = this.hillLayout();
    this.runtime.controls.clear();
    this.hillWalks.forEach(t => t.stop()); this.hillWalks.clear();
    this.hillArt?.destroy(); this.hillArt = drawHill(this, w, h, 0).box;
    this.hillTop = top; this.sizeBuilt = { w, h }; this.portalScale = scale;
    const progress = old ? Math.max(0, Math.min(1, (this.pos.y - old.wallY) / Math.max(1, old.floor - old.wallY))) : 1;
    this.pos = old ? { x: Math.max(16, Math.min(w - 16, this.pos.x * w / old.w)), y: Math.max(base + 2, Math.min(floor, base + progress * (floor - base))) } : { ...top };
    this.player.place(this.pos);
    this.followers.forEach(({ dude }, i) => dude.place(this.gatherSpot(i, this.followers.length, top)));
    const tags: { text: string; x: number; y: number }[] = [];
    [...this.guests.values()].forEach((dude, i) => {
      const at = { x: top.x + (i % 2 ? 1 : -1) * (34 + Math.floor(i / 2) * 40), y: top.y - 26 - Math.floor(i / 2) * 4 };
      dude.place(at); tags.push({ text: this.guestTags[i]?.text ?? '', x: at.x, y: at.y - 58 });
    });
    if (old) {
      this.hillRoom = { ...old, w, h, wallY: base, floor, door: { x: top.x, half: PORTAL.half * scale }, spawn: { ...top } };
      if (this.portal) { this.tweens.killTweensOf(this.portal); this.portal.setPosition(top.x, base).setDepth(base).setScale(scale).setAlpha(1); }
      if (this.portalGlow) {
        this.tweens.killTweensOf(this.portalGlow);
        this.portalGlow.setPosition(top.x, base - PORTAL.height * scale * 0.55).setDepth(base - 1).setScale(scale);
        if (!this.reduced) this.tweens.add({ targets: this.portalGlow, scale: scale * 1.08, duration: 1450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    if (this.guide) {
      const spot = { x: Math.min(w - 28, top.x + FEEL.guideSidePx), y: base + 10 };
      this.guide.dude.place(spot);
      this.guide.near ||= distance(this.pos, spot) < FEEL.guideRadius; // 재배치만으로 새 만남을 만들지 않는다.
      if (this.guide.dots) {
        this.tweens.killTweensOf(this.guide.dots); this.guide.dots.setPosition(spot.x, spot.y - 90).setDepth(spot.y + 200);
        if (!this.reduced) this.tweens.add({ targets: this.guide.dots, y: spot.y - 95, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    this.guestTags = tags; this.tagsShown = undefined;
    this.runtime.ui.tags([{ text: this.runtime.name() || '나', x: this.pos.x, y: this.pos.y - 58 }, ...tags]);
  }

  /** 초대한 친구를 언덕에 세운다. 새로 온 사람만 아래에서 걸어 올라온다. */
  setGuests(guests: Guest[]) {
    const top = this.hillTop;
    if (!top || this.mode !== 'hill') return;
    const { h } = this.runtime.view();
    const spots = guests.map((_, i) => ({ x: top.x + (i % 2 ? 1 : -1) * (34 + Math.floor(i / 2) * 40), y: top.y - 26 - Math.floor(i / 2) * 4 }));
    guests.forEach((guest, i) => {
      if (this.guests.has(guest.id)) return;
      const dude = new Dude(this, toLook(guest.pick), spots[i].x, h + 40).place({ x: spots[i].x, y: h + 40 });
      this.guests.set(guest.id, dude);
      this.walkTo(dude, spots[i], 900, { x: top.x, y: top.y + 40 });
      this.time.delayedCall(this.reduced ? 0 : 950, () => dude.hop(14, 2, this.reduced));
    });
    const mine = { text: this.runtime.name() || '나', x: this.player.x, y: this.player.y - 58 };
    this.guestTags = guests.map((guest, i) => ({ text: guest.label, x: spots[i].x, y: spots[i].y - 58 }));
    this.time.delayedCall(this.reduced ? 0 : 960, () => this.runtime.ui.tags([mine, ...this.guestTags]));
  }

  /** 언덕에서 한 명을 눌러 내 이웃으로. */
  pickNeighbor(onPick: (follower: Follower) => void) { this.picking = onPick; }

  private tapHill(x: number, y: number) {
    if (this.mode !== 'hill' || !this.picking) return;
    let best: Follower | undefined, bestD = 36;
    for (const follower of this.followers) {
      const d = distance({ x, y }, { x: follower.dude.x, y: follower.dude.y - 22 });
      if (d < bestD) { best = follower; bestD = d; }
    }
    if (!best) return;
    best.dude.hop(14, 1, this.reduced);
    tapRing(this, best.dude.x, best.dude.y);
    sfx.meet();
    const picked = this.picking;
    this.picking = undefined; // 고른 뒤엔 다시 걸을 수 있다
    picked(best);
  }

  /** 화면 크기가 크게 바뀌면(회전 등) 지금 방을 새 크기로 다시 깐다. 주소창이 들고 나는 정도는 넘긴다. */
  relayout() {
    if (!this.player) return;
    const { w, h, dpr } = this.runtime.view();
    if (this.mode === 'dress') this.zoomTo(this.dressView());
    else this.cameras.main.setZoom(dpr);
    this.light.setSize(w * 3, h * 3);
    if (this.mode === 'hill') { if (w !== this.sizeBuilt.w || h !== this.sizeBuilt.h) this.relayoutHill(); return; }
    if (this.mode !== 'play' || (w === this.sizeBuilt.w && Math.abs(h - this.sizeBuilt.h) < 80)) return;
    const chosen = this.chosen, doorOpen = this.doorOpen;
    this.dropRoom();
    this.setRoom(this.buildRoom(this.roomIndex, 0));
    // 고른 뒤라면 두 주민 다 이 방에 없다 — 고른 쪽은 줄에, 안 고른 쪽은 손 흔들고 나갔다.
    if (chosen) { this.dropResidents(); this.chosen = chosen; this.runtime.ui.made(); }
    if (doorOpen) { this.doorOpen = true; this.art.openDoor(true); this.showDoor(); }
    this.pos = { x: Math.min(Math.max(this.pos.x, 16), w - 16), y: Math.min(Math.max(this.pos.y, this.room.wallY + 10), this.room.floor) };
    if (!chosen) this.showAsk();
  }
}
