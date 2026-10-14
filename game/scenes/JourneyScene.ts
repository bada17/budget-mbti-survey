/*
  한 판 전체를 돌리는 장면. 방(문항) 열다섯 개를 차례로 지난다.

  시작:    내 모습 고르기(카메라가 나에게 다가감) → 출발
  방 안:   두 주민이 말풍선으로 바람을 말함 → 한 사람에게 걸어감 → 대답 고르기(HTML)
           → 그 주민이 하트를 날리며 내 뒤에 줄 섬, 그 자리에 고른 것의 표지판이 섬 → 문이 열림 → 위로 나감
  방 사이: 화면이 위로 밀려 다음 방(같은 동네), 세 방마다 버스를 타고 다음 동네. 동네를 지날수록 아침 → 노을.
  끝:      강 건너 언덕 — 따라온 주민·초대한 친구·같은 테이블 사람들이 모이고, 한 명을 내 이웃으로 고른다.
           끝 카드가 내려앉으면 언덕 위에 빛 아치가 피어난다 — 걸어서 지나면 마을(VillageScene)로 간다(10-14).

  답·진행은 runtime.send 로 flow.ts 에 맡긴다. 여기서는 위치·그림·연출만 다룬다.
*/
import Phaser from 'phaser';
import { DESTINATION } from '../content';
import { currentQuestion, type JourneyState } from '../flow';
import { orderedQuestions, displayOptions, type DisplaySide } from '../response';
import { FEEL } from '../feel';
import { layoutRoom, step, passedDoor, nearest, distance, alongTrail, rollBall, type Point, type Room } from '../room';
import { OUTCOMES, THANKS } from '../outcomes';
import { nameFrom } from '../look';
import { Dude, lookFrom, toLook, drawRoom, drawHill, drawPortal, PORTAL, drawBus, playOutcome, hearts, dust, tapRing, confetti, flee, meow, sparkle, DAYLIGHT, type RoomArt } from '../draw';
import type { Pick } from '../look';
import type { Neighbor } from '../profile';
import { sfx } from '../sfx';
import type { Controls } from '../input';
import type { GameUI } from '../ui';
import type { GameEvent } from '../events';

export type SceneCommand =
  | { type: 'approach'; questionId: string; side: DisplaySide }
  | { type: 'leave' }
  | { type: 'exit'; stageIndex: number };

/** 언덕에 함께 서는 사람 — 초대한 친구, 같은 테이블 사람. */
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
  busCaption(stage: number, skip: () => void): void;
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
  /** 언덕을 방처럼 걷는다 — 빛 아치가 「문」(wallY 가 아치 발밑). 아치가 피기 전엔 없다. */
  private hillRoom?: Room;
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
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private runtime: Runtime) { super('journey'); }

  create() {
    const { w, h, dpr } = this.runtime.view();
    this.cameras.main.setOrigin(0, 0).setZoom(dpr);
    // 동네마다 빛(아침 → 노을)을 화면 전체에 곱한다.
    this.light = this.add.rectangle(0, 0, w * 3, h * 3, DAYLIGHT[0][2]).setOrigin(0).setScrollFactor(0).setDepth(60000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.setRoom(this.buildRoom(0, 0));
    this.pos = { ...this.room.spawn };
    this.player = new Dude(this, toLook(this.runtime.pick()), this.pos.x, this.pos.y).place(this.pos);
    this.trail = [{ x: this.pos.x, y: this.pos.y + 80 }, { ...this.pos }];
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tapHill(p.worldX, p.worldY));
    const stop = this.runtime.subscribe(event => this.onEvent(event));
    this.events.once('shutdown', stop);
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
    this.dressFrame = { cx: w / 2, cy: top + room / 2, k }; // 몸 가운데가 화면 이 자리(CSS px)에 온다
    return { z: k, x: this.pos.x - w / 2 / k, y: this.pos.y - 28 - (top + room / 2) / k };
  }
  private dressFrame?: { cx: number; cy: number; k: number };

  /** 증명사진 — 내 모습 고르기에서 크게 보이는 나를 그대로 찍는다(주민증용). 그 화면이 아니면 없음. */
  portrait() {
    return new Promise<string | undefined>(resolve => {
      const frame = this.dressFrame, { dpr } = this.runtime.view();
      if (this.mode !== 'dress' || !frame) return resolve(undefined);
      const half = 38 * frame.k * dpr; // 몸 가운데에서 모자 끝·발까지 28px + 여유
      const x = frame.cx * dpr - half, y = frame.cy * dpr - half;
      this.game.renderer.snapshotArea(Math.round(x), Math.round(y), Math.round(half * 2), Math.round(half * 2), shot => resolve((shot as HTMLImageElement).src));
    });
  }

  setLook(pick: Pick) {
    this.player.destroy();
    this.player = new Dude(this, toLook(pick), this.pos.x, this.pos.y).place(this.pos);
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
    this.art.destroy();
    this.dropResidents();
    this.outcome.forEach(o => o.destroy());
    this.outcome = [];
  }
  /** 고른 대답으로 방에 생긴 것(outcomes.ts) — 방을 떠나면 지운다. */
  private outcome: Phaser.GameObjects.GameObject[] = [];
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
      if (rollBall(toy, this.pos, dt, this.room)) sfx.kick();
      toy.root.setPosition(toy.at.x, toy.at.y);
      toy.spin.angle += (Math.hypot(toy.v.x, toy.v.y) * dt / 1000 / 9) * (180 / Math.PI) * (toy.v.x < 0 ? -1 : 1);
    }
    const kitty = this.art.cat;
    if (kitty) {
      const d = distance(this.pos, kitty.at);
      if (!kitty.near && d < FEEL.catRadius) { kitty.near = true; meow(this, kitty, this.reduced); sfx.meow(); }
      else if (kitty.near && d > FEEL.catRadius + 30) kitty.near = false; // 멀어졌다 다시 오면 또 야옹
    }
    if (this.doorOpen && passedDoor(this.pos, this.room)) this.leaveRoom();
  }

  /** 언덕에서 걸을 수 있나 — 빛 아치가 피었고, 이웃을 고르는 중이 아닐 때(main 의 조작 켜기가 묻는다). */
  hillOpen() { return Boolean(this.hillRoom) && !this.warping && !this.picking; }

  /** 끝 카드 아래 남은 풀밭에 빛 아치를 세운다. 나는 그 아래 몇 걸음 떨어져 있다. */
  private openPortal() {
    const top = this.hillTop;
    if (!top || this.mode !== 'hill' || this.hillRoom) return;
    const { w, h } = this.runtime.view();
    const free = this.runtime.ui.endFree();
    const base = Math.round(Math.min(top.y - FEEL.portalGapPx, Math.max(free.top + PORTAL.height + 16, top.y - FEEL.portalGapPx * 1.6)));
    drawPortal(this, top.x, base, this.reduced);
    sparkle(this, top.x, base - PORTAL.height / 2, this.reduced);
    sfx.portal();
    const far = { x: -999, y: -999 };
    this.hillRoom = { w, h, wallY: base, door: { x: top.x, half: PORTAL.half }, residents: { left: far, right: far }, spawn: { ...top }, floor: Math.min(h - 22, free.bottom - 8) };
    this.player.look(0, -1);
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
      const d = distance(controls.target, this.pos);
      if (d < 3) { if (!controls.holding) controls.target = undefined; dir = { x: 0, y: 0 }; }
      else { dir = { x: (controls.target.x - this.pos.x) / d, y: (controls.target.y - this.pos.y) / d }; speedCap = d * 1000 / dt; }
    }
    if (!dir.x && !dir.y) { this.speed = 0; return; }
    this.speed = Math.min(FEEL.walkSpeed, this.speed + FEEL.walkSpeed * dt / FEEL.accelMs);
    const next = step(this.pos, dir, Math.min(this.speed, speedCap), dt, room, doorOpen, solid);
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
        onUpdate: () => { if (passed.root.active) passed.walk(16, true, false); },
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
    this.time.delayedCall(260, () => {
      if (this.mode !== 'play') return;
      this.doorOpen = true;
      this.art.openDoor(this.reduced);
      sfx.door();
      this.showDoor();
      if (this.hintStep === 1) this.hintStep = 2; // 문 위 화살표가 알려 준다
    });
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
    if (this.reduced) { done(); return; }
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
      this.tweens.chain({
        targets: bus,
        tweens: [
          { x: w / 2, duration: this.reduced ? 1 : 800, ease: 'Cubic.easeOut' },
          { x: w / 2, duration: this.reduced ? 1 : 700 },
          { x: w + 160, duration: this.reduced ? 1 : 650, ease: 'Cubic.easeIn' },
        ],
        onComplete: finish,
      });
    });
  }

  skipBus() { this.busDone?.(); }

  /** 개발판 지름길(main.ts skipToEnd) — 고른 주민들을 내 뒤에 세우고 바로 언덕으로. */
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

  private toHill() {
    const { w, h } = this.runtime.view();
    const hill = drawHill(this, w, h, -h);
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
      const inner = i < 6, j = inner ? i : i - 6, count = inner ? Math.min(6, n) : n - 6;
      const spread = Math.PI * 1.15, angle = Math.PI / 2 - spread / 2 + spread * (j + 0.5) / Math.max(1, count);
      const radius = inner ? 60 : 100; // 아래쪽으로만 둘러선다(위는 끝 카드가 덮는다)
      const spot = { x: top.x - Math.cos(angle) * radius, y: top.y + Math.sin(angle) * radius * 0.55 - (inner ? 0 : 6) };
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
    this.tweens.addCounter({
      from: 0, to: 1, duration: this.reduced ? 1 : ms, ease: 'Sine.easeInOut',
      onUpdate: tween => { const p = lerp(start, spot, tween.getValue() ?? 1); dude.look(p.x - dude.x, p.y - dude.y); dude.place(p).walk(16, true, this.reduced); },
      onComplete: () => { dude.walk(16, false, this.reduced); dude.look(face.x - spot.x, face.y - spot.y); },
    });
  }

  /** 초대한 친구·같은 테이블 사람을 언덕에 세운다. 새로 온 사람만 아래에서 걸어 올라온다. */
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
