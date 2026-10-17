/*
  마을(기획 4차, 2026-10-14) — 한 바퀴를 끝낸 뒤 나오는 곳, 다시 온 사람은 여기서 시작한다.

  · 화면 서너 개 크기의 지도를 걸어 다닌다. 카메라가 나를 따라간다. 조작은 걷기 판과 같다(꾹 누르면 손가락 쪽으로, 톡 치면 거기까지).
    건물을 톡 치면 그 문 앞까지 걸어간다. 문 앞에 닿으면 그 판이 열린다(runtime.enter) — 멀어졌다 와야 또 열린다.
  · 혼자가 아니다(사용자 6번) — 최근에 들른 주민들(이름 없이 모습만)이 광장과 길을 서성이고, 쪽지를 붙인 사람은 머리 위에 쪽지를 든다.
    곁에 서면 그 쪽지가 아래 카드로 뜬다(runtime.near). 지나가면 손을 흔든다.
  · 내 이웃(언덕에서 이름 지어 준 주민)이 있으면 내 뒤를 따라온다.
  · 동물의 숲에서 빌린 것(사용자 10-14) — 실제 시각·철로 빛과 나무 색이 바뀌고 밤엔 가로등이 켜진다(ⓒ). 나무 밑동에 부딪히면 흔들리고,
    그날 정해진 나무에선 동전·열매가 떨어진다 — 걸어가 주우면 주머니에(ⓕ). 동전은 공사터에 넣어 모두의 공사를 채운다(ⓑ, places.ts openWorks).
    공사가 끝나면 카메라가 그곳에 갔다가(뚝딱 서는 연출) 돌아온다(10-15).
  · 남동쪽 구석 작은 운동장 — 공을 차서 골대에 넣는다(10-15, 걷기 판의 골 놀이를 옮겨 옴).
  · 마을 부탁(10-17) — 필드에 선 주민 머리 위 「!」. 곁에 가면 부탁을 듣는다(runtime.errand). 규칙은 quests.ts.
  배치·부딪힘은 village.ts, 그림은 draw.ts 의 drawVillage. 여기서는 위치·연출만.
*/
import Phaser from 'phaser';
import { FEEL } from '../feel';
import { alongTrail, distance, rollBall, type Point } from '../room';
import { PLACES, SPAWN, PITCH, GOAL, VILLAGE_W, VILLAGE_H, CROWD_SHOW, walkVillage, findPath, placeAt, wanderSpot, worksAt, scored, type PlaceId, type Drop, type WorkId, type WorksState } from '../village';
import { Dude, lookFrom, toLook, nameTag, drawVillage, noteTag, dust, tapRing, flee, hearts, sparkle, confetti, dropArt, skyAt, facePhoto, ball as makeBall, type Ball, type VillageArt, type Season } from '../draw';
import { rng, type Pick } from '../look';
import type { Neighbor } from '../profile';
import type { PublicNote, VillageView } from '../api';
import type { Controls } from '../input';
import { sfx } from '../sfx';

export type VillageRuntime = {
  view(): { w: number; h: number; dpr: number };
  controls: Controls;
  pick(): Pick;
  neighbor(): Neighbor | undefined;
  /** 어디서 나타나나 — 언덕에서 내려온 사람은 남쪽 문, 다시 온 사람은 광장. */
  start(): 'gate' | 'plaza';
  /** 문 앞에 닿았다 — main 이 그 판을 연다. */
  enter(id: PlaceId): void;
  /** 쪽지 든 주민 곁 — 그 쪽지(카드를 띄운다), 멀어지면 undefined. */
  near(note: PublicNote | undefined): void;
  ready(): void;
  /** 지금 철·시각(개발판은 ?season=·?hour= 로 바꿔 본다). */
  clock(): { season: Season; hour: number };
  /** 오늘 아직 안 주운 것 — 나무 번호 → 동전·열매(village.ts dropsOn 에서 이 기기가 주운 것을 뺀 것). */
  drops(trees: number): Map<number, Drop>;
  /** 주웠다 — main 이 주머니에 넣는다. */
  picked(tree: number, kind: Drop): void;
  /** 부탁하는 주민 곁에 닿았다 — main 이 말 상자를 연다(멀어졌다 와야 또 연다). */
  errand(id: string): void;
};

/** 서성이는 주민 — 최근에 들른 사람의 모습. 쪽지를 붙였으면 쪽지를 든다. */
type Folk = { dude: Dude; at: Point; to?: Point; wait: number; note?: PublicNote; mark?: Phaser.GameObjects.Container; random: () => number; wavedAt: number };

const FOLK_SPEED = 52; // 서성이는 걸음(px/초) — 내 걸음의 3분의 1쯤
const ENTER_RADIUS = 22, LEAVE_RADIUS = 56; // 문 앞 — 이 안이면 열리고, 이만큼 멀어져야 다시 열린다
const NOTE_RADIUS = 44, NOTE_LEAVE = 72;

export class VillageScene extends Phaser.Scene {
  private player!: Dude;
  private pos: Point = { ...SPAWN.plaza };
  private goal?: Point;
  /** 톡 친 곳까지 거쳐 갈 자리들(findPath) — goal 에 닿으면 다음 것. */
  private route: Point[] = [];
  private wasHolding = false;
  private speed = 0;
  private art!: VillageArt;
  private buddy?: Dude;
  private trail: Point[] = [];
  private keepers: { dude: Dude; at: Point; tag?: Phaser.GameObjects.Text }[] = [];
  /** 부탁하는 주민(quests.ts) — 「!」 는 아직 안 들어준 부탁만. talking = 지금 말 건 주민(멀어져야 또 연다). */
  private errands = new Map<string, { dude: Dude; at: Point; mark?: Phaser.GameObjects.Container }>();
  private talking?: string;
  private folks = new Map<string, Folk>();
  private inside?: PlaceId;
  private reading?: Folk;
  private paused = false;
  private drops = new Map<number, Drop>();
  private shaken = new Map<number, number>();
  /** 땅에 떨어진 것 — 걸어가 닿으면 줍는다. */
  private items: { kind: Drop; tree: number; at: Point; obj: Phaser.GameObjects.Container }[] = [];
  private dustClock = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** 작은 운동장 공 — 골이 나면 잠깐 기뻐하다가(cheering) 가운데로 돌아온다. */
  private ball?: Ball;
  private cheering = false;
  /** 공사 — 지금 그려 둔 모습, 막 끝나 연출을 기다리는 것, 연출 중인가(그동안 나는 멈춘다). */
  private works?: WorksState;
  private pendingBuilt?: WorkId;
  private showing = false;

  constructor(private runtime: VillageRuntime) { super('village'); }

  create() {
    const { dpr } = this.runtime.view();
    const cam = this.cameras.main;
    cam.setZoom(dpr).setBounds(0, 0, VILLAGE_W, VILLAGE_H);
    const clock = this.runtime.clock();
    this.art = drawVillage(this, dpr, clock.season);
    this.drops = this.runtime.drops(this.art.trees.length);
    this.daylight(clock.hour, clock.season);
    this.pos = { ...SPAWN[this.runtime.start()] };
    this.player = new Dude(this, toLook(this.runtime.pick()), this.pos.x, this.pos.y).place(this.pos);
    this.trail = [{ x: this.pos.x, y: this.pos.y + 60 }, { ...this.pos }];
    const neighbor = this.runtime.neighbor();
    if (neighbor) this.buddy = new Dude(this, lookFrom(neighbor.seed), this.pos.x, this.pos.y + 30, FEEL.followerScale).place({ x: this.pos.x, y: this.pos.y + 30 });
    // 문 앞 주민 — 문 오른쪽에 서서 나를 본다(쪽지판엔 없다). 판 안의 한마디와 같은 생김새(npc:<id>).
    for (const place of PLACES) if (place.id !== 'board') {
      const at = { x: place.door.x + 38, y: place.door.y - 6 };
      const tag = place.keeper ? nameTag(this, at.x, at.y + 14, place.keeper, dpr) : undefined; // 맡은 사람 이름(10-15)
      this.keepers.push({ dude: new Dude(this, lookFrom(`npc:${place.id}`), at.x, at.y).place(at), at, tag });
    }
    this.ball = makeBall(this, PITCH.x + PITCH.w / 2, PITCH.y + PITCH.h / 2);
    cam.startFollow(this.player.root, true, 0.14, 0.14);
    cam.centerOn(this.pos.x, this.pos.y - 40);
    if (!this.reduced) cam.fadeIn(260, 255, 250, 240);
    if (this.runtime.start() === 'gate' && !this.reduced) { // 언덕의 빛 아치를 막 지나왔다 — 빛에서 톡 튀어나온다
      this.player.root.setScale(0.25).setAlpha(0);
      this.tweens.add({ targets: this.player.root, scale: 1, alpha: 1, duration: 420, delay: 160, ease: 'Back.easeOut' });
      this.time.delayedCall(160, () => sparkle(this, this.pos.x, this.pos.y - 28, false));
    }
    this.runtime.ready();
  }

  /** 판이 열려 있는 동안은 나는 멈추고(주민들은 서성인다). */
  setPaused(paused: boolean) {
    this.paused = paused;
    this.runtime.controls.clear();
    this.goal = undefined; this.route = [];
    if (!paused && this.pendingBuilt) this.time.delayedCall(250, () => this.showBuilt()); // 동전을 넣은 판을 닫으면
  }

  /** 시민증 사진 — 내 모습 얼굴(draw.ts facePhoto). */
  portrait() { return facePhoto(this, toLook(this.runtime.pick()), 240); }

  /** 지도에서 고른 곳 — 잠깐 어두워졌다가 그 문 앞에 선다. 문이 열리는 건 다음 판이 한다(main 이 연다). */
  jump(id: PlaceId, done: () => void) {
    const place = PLACES.find(p => p.id === id)!;
    this.jumpTo({ x: place.door.x, y: place.door.y + 4 }, () => { this.inside = id; done(); }); // 도착하자마자 또 열리지 않게
  }

  /** 부탁하는 주민 곁으로(주민 폰 「부탁」) — 왼쪽 옆에 선다(겹쳐 서지 않게). 닿았으니 talk 가 곧 말을 건다. */
  jumpToErrand(id: string) {
    const npc = this.errands.get(id);
    if (npc) this.jumpTo({ x: npc.at.x - 28, y: npc.at.y + 2 }, () => {});
  }

  private jumpTo(at: Point, done: () => void) {
    const go = () => {
      this.goal = undefined; this.route = [];
      this.pos = { ...at };
      this.trail = [{ x: this.pos.x, y: this.pos.y + 40 }, { ...this.pos }];
      this.buddy?.place({ x: this.pos.x, y: this.pos.y + 30 });
      this.player.place(this.pos);
      this.cameras.main.centerOn(this.pos.x, this.pos.y - 40);
      done();
      if (!this.reduced) this.cameras.main.fadeIn(200, 255, 250, 240);
    };
    if (this.reduced) { go(); return; }
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
    this.cameras.main.fadeOut(160, 255, 250, 240);
  }

  /** 서버에서 온 마을 모습 — 쪽지(새것 여덟)를 든 주민과 최근에 들른 주민. 이미 서 있는 사람은 그대로 두고 새로 온 사람만 들인다. */
  setCrowd(view: VillageView) {
    const want = new Map<string, { pick: Pick; note?: PublicNote }>();
    for (const note of view.notes.slice(0, 8)) want.set(`n:${note.id}`, { pick: note.pick, note });
    // 모습 + 같은 모습 몇째로 이름을 붙인다 — 새 사람이 와서 순서가 밀려도 서 있던 사람은 그대로 둔다.
    const seen = new Map<string, number>();
    for (const pick of view.crowd.slice(0, CROWD_SHOW - want.size)) { const k = pick.join(''), n = seen.get(k) ?? 0; seen.set(k, n + 1); want.set(`c:${k}:${n}`, { pick }); }
    for (const [key, folk] of this.folks) if (!want.has(key)) {
      if (folk === this.reading) { this.reading = undefined; this.runtime.near(undefined); }
      folk.dude.destroy(); folk.mark?.destroy(); this.folks.delete(key);
    }
    for (const [key, { pick, note }] of want) {
      const known = this.folks.get(key);
      if (known) { if (note) known.note = note; continue; }
      const random = rng(key);
      // 새 쪽지는 쪽지판 앞에서 나타난다(방금 붙인 사람처럼), 나머지는 아무 데나.
      const board = PLACES.find(p => p.id === 'board')?.door; // 쪽지판은 숨겨 둘 수 있다([나중에 살림]) — 없으면 아무 데나
      const at = board && note && Date.now() - note.at < 60_000 ? { x: board.x + 20, y: board.y + 10 } : wanderSpot(random);
      const dude = new Dude(this, toLook(pick), at.x, at.y, 0.92).place(at);
      if (!this.reduced) { dude.root.setAlpha(0); this.tweens.add({ targets: dude.root, alpha: 1, duration: 500 }); }
      const folk: Folk = { dude, at, wait: random() * 2000, note, random, wavedAt: 0 };
      if (note) folk.mark = noteTag(this, this.reduced);
      this.folks.set(key, folk);
    }
  }

  /** 화면(CSS px) → 지도 자리. */
  private world(p: Point): Point {
    const { dpr } = this.runtime.view();
    const at = this.cameras.main.getWorldPoint(p.x * dpr, p.y * dpr);
    return { x: at.x, y: at.y };
  }

  /** 톡 친 곳이 건물(지붕 포함)이면 그 문 앞으로, 부탁하는 주민(몸 둘레)이면 그 발밑으로. */
  private tapGoal(p: Point): Point {
    const hit = PLACES.find(({ box }) => p.x > box.x - 8 && p.x < box.x + box.w + 8 && p.y > box.y - 64 && p.y < box.y + box.h + 4);
    if (hit) return { x: hit.door.x, y: hit.door.y };
    for (const { at } of this.errands.values()) if (Math.abs(p.x - at.x) < 22 && p.y > at.y - 60 && p.y < at.y + 10) return { ...at }; // 곁(talk 거리)에 닿으면 말을 걸며 멈춘다
    return p;
  }

  update(_time: number, delta: number) {
    if (!this.player) return;
    const dt = Math.min(delta, FEEL.maxDeltaMs);
    const before = { ...this.pos };
    if (!this.paused && !this.showing) this.walk(dt);
    const moving = distance(before, this.pos) > 0.05;
    if (moving) this.player.look(this.pos.x - before.x, this.pos.y - before.y);
    this.player.place(this.pos).walk(dt, moving, this.reduced);
    if (moving && !this.reduced && (this.dustClock += dt) > FEEL.dustEveryMs) { this.dustClock = 0; dust(this, this.pos.x - 6, this.pos.y); }
    this.follow(dt);
    this.wander(dt);
    for (const { dude, at } of [...this.keepers, ...this.errands.values()]) { dude.look(this.pos.x - at.x, this.pos.y - at.y); dude.walk(dt, false, this.reduced); }
    this.toys(dt);
    this.kickAbout(dt);
    if (!this.paused) { this.shakeTrees(); this.pickUp(); }
    this.cull(); // 화면 밖은 안 그린다 — 느린 폰에서 끊기지 않게
    if (this.paused) return;
    this.doors();
    this.talk();
    this.notes();
  }

  private walk(dt: number) {
    const c = this.runtime.controls;
    if (c.tapped) { const at = this.world(c.tapped); tapRing(this, at.x, at.y); c.tapped = undefined; }
    let dir = c.keyVector(), cap = Infinity;
    if (dir.x || dir.y) { this.goal = undefined; this.route = []; c.target = undefined; }
    else if (c.holding && c.target) { this.route = []; this.goal = this.world(c.target); } // 꾹 — 손가락 밑 자리를 매번 다시 잰다(화면이 따라 움직이니까)
    else if (c.target) { this.route = findPath(this.pos, this.tapGoal(this.world(c.target))); this.goal = this.route.shift(); c.target = undefined; } // 톡 — 돌아갈 길을 한 번 짠다
    else if (this.wasHolding) { this.goal = undefined; this.route = []; } // 끌다가 뗐다
    this.wasHolding = c.holding;
    if (!dir.x && !dir.y && this.goal) {
      let d = distance(this.goal, this.pos);
      if (d < 3) { this.goal = this.route.shift(); d = this.goal ? distance(this.goal, this.pos) : 0; }
      if (this.goal && d >= 3) { dir = { x: (this.goal.x - this.pos.x) / d, y: (this.goal.y - this.pos.y) / d }; cap = d; }
    }
    if (!dir.x && !dir.y) { this.speed = 0; return; }
    this.speed = Math.min(FEEL.walkSpeed, this.speed + FEEL.walkSpeed * dt / FEEL.accelMs);
    const next = walkVillage(this.pos, dir, Math.min(this.speed * dt / 1000, cap));
    if (distance(next, this.pos) < 0.05 && !c.holding) { this.goal = undefined; this.route = []; } // 그래도 막혔다 — 선다
    this.pos = next;
  }

  /** 화면(+여유) 밖의 그림·사람은 숨긴다. 걷기·서성이기는 그대로 돈다(보이기만 끈다). */
  private cull() {
    const view = this.cameras.main.worldView, m = 90;
    this.art.cull(view);
    const seen = (x: number, y: number) => x > view.x - m && x < view.right + m && y > view.y - m && y < view.bottom + m + 60;
    for (const { dude, at, tag } of this.keepers) { const on = seen(at.x, at.y); dude.root.setVisible(on); tag?.setVisible(on); }
    for (const { dude, at, mark } of this.errands.values()) { const on = seen(at.x, at.y); dude.root.setVisible(on); mark?.setVisible(on); }
    for (const folk of this.folks.values()) { const on = seen(folk.at.x, folk.at.y); folk.dude.root.setVisible(on); folk.mark?.setVisible(on); }
    for (const { pet } of this.art.pets) pet.root.setVisible(seen(pet.anchor.x, pet.anchor.y));
    for (const bird of this.art.pigeons) if (!bird.fled) bird.root.setVisible(seen(bird.at.x, bird.at.y));
  }

  /** 내 이웃이 지나온 길을 따라온다(걷기 판의 줄과 같은 식). */
  private follow(dt: number) {
    const last = this.trail[this.trail.length - 1];
    if (!last || distance(last, this.pos) >= 3) { this.trail.push({ ...this.pos }); if (this.trail.length > 60) this.trail.shift(); }
    if (!this.buddy) return;
    const want = alongTrail(this.trail, FEEL.followGap);
    if (!want) return;
    const dx = want.x - this.buddy.x, dy = want.y - this.buddy.y, d = Math.hypot(dx, dy);
    const k = d > 0.5 ? Math.min(1, Math.max(FEEL.walkSpeed * FEEL.followerCatchUp, d * 4) * dt / 1000 / d) : 0;
    this.buddy.place({ x: this.buddy.x + dx * k, y: this.buddy.y + dy * k }).walk(dt, k > 0, this.reduced);
    if (k > 0) this.buddy.look(dx, dy);
  }

  /** 주민들이 서성인다 — 갈 곳을 골라 천천히 걷고, 닿으면 잠깐 선다. 내가 곁을 지나가면 손을 흔든다(15초에 한 번). */
  private wander(dt: number) {
    const now = this.time.now;
    for (const folk of this.folks.values()) {
      const d = distance(folk.at, this.pos);
      if (folk === this.reading) { folk.dude.look(this.pos.x - folk.at.x, this.pos.y - folk.at.y); folk.dude.walk(dt, false, this.reduced); }
      else if (folk.wait > 0) {
        folk.wait -= dt;
        if (d < 120) folk.dude.look(this.pos.x - folk.at.x, this.pos.y - folk.at.y);
        folk.dude.walk(dt, false, this.reduced);
      } else {
        folk.to ??= wanderSpot(folk.random);
        const gap = distance(folk.to, folk.at);
        const next = gap < 2 ? folk.at : walkVillage(folk.at, { x: folk.to.x - folk.at.x, y: folk.to.y - folk.at.y }, Math.min(gap, FOLK_SPEED * dt / 1000));
        if (gap < 2 || distance(next, folk.at) < 0.01) { folk.to = undefined; folk.wait = 1200 + folk.random() * 4000; }
        else { folk.dude.look(next.x - folk.at.x, next.y - folk.at.y); folk.at = next; }
        folk.dude.place(folk.at).walk(dt, gap >= 2, this.reduced);
      }
      if (d < 64 && !folk.note && now - folk.wavedAt > 15000 && !this.paused) { folk.wavedAt = now; folk.dude.wave(1, this.reduced); }
      folk.mark?.setPosition(folk.at.x + 14, folk.at.y - 66).setDepth(folk.at.y + 1);
    }
  }

  /** 문 앞에 닿으면 그 판 — 한 번 열고 나면 멀어졌다 와야 또 연다. */
  private doors() {
    const at = placeAt(this.pos, ENTER_RADIUS);
    if (at && at.id !== this.inside) {
      this.inside = at.id;
      this.runtime.controls.clear(); this.goal = undefined; this.route = [];
      sfx.door();
      this.runtime.enter(at.id);
    } else if (this.inside) {
      const door = PLACES.find(p => p.id === this.inside)!.door;
      if (distance(this.pos, door) > LEAVE_RADIUS) this.inside = undefined;
    }
  }

  /** 부탁하는 주민 곁에 닿으면 말을 건다 — 한 번 걸고 나면 멀어졌다 와야 또. */
  private talk() {
    if (this.talking) {
      const npc = this.errands.get(this.talking);
      if (!npc || distance(npc.at, this.pos) > LEAVE_RADIUS) this.talking = undefined;
      return;
    }
    for (const [id, npc] of this.errands) if (distance(npc.at, this.pos) < ENTER_RADIUS + 8) {
      this.talking = id;
      this.runtime.controls.clear(); this.goal = undefined; this.route = [];
      npc.dude.hop(8, 1, this.reduced);
      sfx.meet();
      this.runtime.errand(id);
      return;
    }
  }

  /** 부탁하는 주민 — 오늘 세울 주민(quests.ts errandsShown). 이미 선 사람은 그대로 두고 「!」 만 고친다. */
  setErrands(list: { id: string; at: Point; open: boolean }[]) {
    for (const [id, npc] of this.errands) if (!list.some(e => e.id === id)) { npc.dude.destroy(); npc.mark?.destroy(); this.errands.delete(id); }
    for (const { id, at, open } of list) {
      let npc = this.errands.get(id);
      if (!npc) { npc = { dude: new Dude(this, lookFrom(`errand:${id}`), at.x, at.y).place(at), at }; this.errands.set(id, npc); }
      if (open && !npc.mark) npc.mark = this.bubble({ x: at.x, y: at.y - 70 });
      if (!open && npc.mark) { npc.mark.destroy(); npc.mark = undefined; }
    }
  }

  /** 받은 액세서리를 쓰면 — 내 모습을 다시 그리고 폴짝, 반짝. */
  setLook(pick: Pick) {
    this.player.destroy();
    this.player = new Dude(this, toLook(pick), this.pos.x, this.pos.y).place(this.pos);
    if (!this.showing) this.cameras.main.startFollow(this.player.root, true, 0.14, 0.14);
    this.player.hop(12, 2, this.reduced);
    sparkle(this, this.pos.x, this.pos.y - 40, this.reduced);
  }

  /** 쪽지 든 주민 곁에 서면 그 주민이 멈춰 나를 보고, 아래에 쪽지가 뜬다. */
  private notes() {
    if (this.reading && distance(this.reading.at, this.pos) > NOTE_LEAVE) { this.reading.wait = 600; this.reading = undefined; this.runtime.near(undefined); }
    if (this.reading) return;
    let best: Folk | undefined, bestD = NOTE_RADIUS;
    for (const folk of this.folks.values()) if (folk.note) { const d = distance(folk.at, this.pos); if (d < bestD) { best = folk; bestD = d; } }
    if (!best) return;
    this.reading = best;
    best.to = undefined;
    best.dude.hop(8, 1, this.reduced);
    sfx.meet();
    this.runtime.near(best.note);
  }

  private toys(dt: number) {
    for (const bird of this.art.pigeons) if (!bird.fled && distance(this.pos, bird.at) < FEEL.pigeonFleeRadius) { flee(this, bird, this.pos); sfx.flutter(); }
    // 앉은 동물 — 곁에 가면 하트, 고양이는 야옹(오늘의 부탁 「고양이에게 인사」). 판이 열려 있거나 모션 줄이기면 기본 자세로 멈춘다(승인 기준).
    for (const p of this.art.pets) {
      p.pet.step(dt, this.reduced || this.paused);
      const d = distance(this.pos, p.pet.anchor);
      if (!p.near && d < FEEL.catRadius) {
        p.near = true; hearts(this, p.pet.anchor.x - 4, p.pet.anchor.y - 26, 1, this.reduced);
        if (p.pet.kind === 'cat') sfx.meow();
      } else if (p.near && d > FEEL.catRadius + 30) p.near = false;
    }
  }

  /** 작은 운동장 — 발에 닿으면 차이고 울타리(운동장)에 튕긴다. 골대에 들어가면 골 — 기뻐한 뒤 공이 가운데로 돌아온다. */
  private kickAbout(dt: number) {
    const ball = this.ball;
    if (!ball) return;
    const fence = { x0: PITCH.x + 12, x1: PITCH.x + PITCH.w - 4, y0: PITCH.y + 12, y1: PITCH.y + PITCH.h - 6 };
    if (rollBall(ball, this.paused ? { x: -999, y: -999 } : this.pos, dt, fence)) sfx.kick();
    ball.root.setPosition(ball.at.x, ball.at.y).setDepth(ball.at.y);
    ball.spin.angle += (Math.hypot(ball.v.x, ball.v.y) * dt / 1000 / 9) * (180 / Math.PI) * (ball.v.x < 0 ? -1 : 1);
    if (this.cheering || !scored(ball.at, GOAL)) return;
    this.cheering = true;
    sfx.focus(); sparkle(this, GOAL.x + GOAL.w / 2, GOAL.y, this.reduced); confetti(this, 220, GOAL.y - 20, this.reduced, GOAL.x - 160);
    this.player.hop(12, 1, this.reduced); this.buddy?.hop(12, 1, this.reduced);
    this.time.delayedCall(this.reduced ? 300 : 1500, () => {
      ball.at = { x: PITCH.x + PITCH.w / 2, y: PITCH.y + PITCH.h / 2 }; ball.v = { x: 0, y: 0 };
      if (!this.reduced) dust(this, ball.at.x, ball.at.y);
      this.cheering = false;
    });
  }

  relayout() { if (this.player) this.cameras.main.setZoom(this.runtime.view().dpr); }

  private marks = new Map<PlaceId, Phaser.GameObjects.Container>();
  /** 「!」 를 띄울 건물 — 지금은 새 문제 카드뿐([나중에 살림]), 쪽지판·문제 카드는 판 위. */
  setQuestMarks(places: PlaceId[]) {
    for (const [id, mark] of this.marks) if (!places.includes(id)) { mark.destroy(); this.marks.delete(id); }
    for (const id of places) {
      if (this.marks.has(id)) continue;
      const place = PLACES.find(p => p.id === id)!;
      const at = id === 'board' || id === 'cards' ? { x: place.box.x + place.box.w + 16, y: place.box.y - 54 } /* 판 이름 옆 — 위에 얹으면 「쪽지판」 을 가린다 */ : { x: place.door.x + 38, y: place.door.y - 70 };
      this.marks.set(id, this.bubble(at));
    }
  }

  /** 머리 위 「!」 — 둥실. */
  private bubble(at: Point) {
    const bubble = this.add.container(at.x, at.y, [
      this.add.circle(0, 0, 13, 0xf5c55c).setStrokeStyle(2, 0xcf9b37),
      this.add.text(0, 1, '!', { fontFamily: '"Jua", sans-serif', fontSize: '18px', color: '#6a4716', resolution: this.runtime.view().dpr }).setOrigin(0.5),
    ]).setDepth(at.y + 200);
    if (!this.reduced) this.tweens.add({ targets: bubble, y: at.y - 5, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return bubble;
  }

  /**
   * 모두가 넣은 동전 수 — 공사터 간판과 다 지은 것(다리·정자)을 다시 그린다.
   * 마을에 있는 동안 공사가 막 끝났으면 바로 그리지 않고 연출로(showBuilt) — 동전을 넣은 판이 닫힐 때. 처음 그릴 땐 연출 없이.
   */
  setWorks(total: number) {
    const next = worksAt(total), was = this.works;
    this.works = next;
    const fresh = was ? next.done.filter(id => !was.done.includes(id)) : [];
    if (!fresh.length || this.reduced || !this.art) { this.art?.setWorks(next); return; }
    this.pendingBuilt = fresh[fresh.length - 1];
    if (!this.paused) this.showBuilt();
  }

  /** 공사가 끝났다 — 카메라가 그곳으로 가서 뚝딱 서는 걸 보여 주고(draw.ts built) 나에게 돌아온다. 그동안 나는 멈춘다(사용자 10-15). */
  private showBuilt() {
    const id = this.pendingBuilt;
    if (!id || this.showing || !this.works) return;
    this.pendingBuilt = undefined; this.showing = true;
    this.runtime.controls.clear(); this.goal = undefined; this.route = [];
    const at = this.art.builtAt(id);
    this.tour(at.x, at.y - 20, 2700, () => { this.art.setWorks(this.works!); this.art.built(id, this.runtime.view().dpr); });
  }

  /** 마을에 처음 들어온 사람에게 그 건물을 보여 준다(10-16 주민센터 안내) — 카메라가 문 앞에 갔다가 나에게 돌아온다. 움직임 줄이기면 안 간다. */
  showPlace(id: PlaceId) {
    if (this.reduced || this.showing) return;
    const place = PLACES.find(p => p.id === id)!;
    this.showing = true;
    this.runtime.controls.clear(); this.goal = undefined; this.route = [];
    this.tour(place.door.x, place.door.y - 60, 2400);
  }

  /** 카메라가 (x, y)로 가서 hold 만큼 머물고 나에게 돌아온다 — 그동안 나는 멈춘다(showing). 닿으면 arrive. */
  private tour(x: number, y: number, hold: number, arrive?: () => void) {
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(x, y, 900, 'Sine.easeInOut', true, (_cam, t) => {
      if (t < 1) return;
      arrive?.();
      this.time.delayedCall(hold, () => cam.pan(this.pos.x, this.pos.y - 40, 800, 'Sine.easeInOut', true, (_c, back) => {
        if (back < 1) return;
        cam.startFollow(this.player.root, true, 0.14, 0.14);
        this.showing = false;
      }));
    });
  }

  /** 실제 시각의 빛 — 마을 전체에 색을 곱하고, 밤이면 가로등 불을 켠다. 철마다 잎·꽃잎·눈이 조금씩 내린다. */
  private daylight(hour: number, season: Season) {
    const sky = skyAt(hour);
    if (sky.tint !== 0xffffff) this.add.rectangle(0, 0, VILLAGE_W, VILLAGE_H, sky.tint).setOrigin(0).setDepth(60000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    if (sky.night) for (const lamp of this.art.lamps) {
      // 불빛 — 겹 동그라미로 가운데만 밝게(한 겹이면 허연 원으로 보였다), 땅에도 둥근 빛
      const glow = this.add.container(lamp.x, lamp.y, [
        this.add.circle(0, 0, 26, 0xffb85c, 0.07), this.add.circle(0, 0, 14, 0xffc86b, 0.13), this.add.circle(0, 0, 6, 0xfff1c4, 0.5),
        this.add.ellipse(0, 54, 60, 14, 0xffb85c, 0.07),
      ].map(c => c.setBlendMode(Phaser.BlendModes.ADD))).setDepth(60001); // 더하기 빛은 낱낱에(컨테이너엔 안 먹는다)
      if (!this.reduced) this.tweens.add({ targets: glow, alpha: 0.75, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (this.reduced || season === 'summer') return;
    const look = { spring: [0xf7cfd8, 0xffffff], autumn: [0xe9a04f, 0xd9744a, 0xe8c25a], winter: [0xffffff, 0xf0f6ff] }[season];
    this.time.addEvent({
      delay: 520, loop: true, callback: () => {
        const view = this.cameras.main.worldView, x = view.x + Math.random() * view.width, y = view.y - 10;
        const bit = season === 'winter' ? this.add.circle(x, y, 1.6 + Math.random() * 1.4, look[0], 0.9) : this.add.ellipse(x, y, 6, 3.5, look[Math.floor(Math.random() * look.length)], 0.9);
        bit.setDepth(59000);
        this.tweens.add({ targets: bit, y: y + view.height + 20, x: x + (Math.random() - 0.5) * 80, angle: 360, duration: 5000 + Math.random() * 2500, onComplete: () => bit.destroy() });
      },
    });
  }

  /** 나무 밑동에 부딪히면 흔들린다. 오늘 정해진 나무면 동전·열매가 떨어진다(한 번만). */
  private shakeTrees() {
    const now = this.time.now;
    this.art.trees.forEach((t, i) => {
      if (distance(this.pos, t.at) > 17 || now - (this.shaken.get(i) ?? -1e9) < 1500) return;
      this.shaken.set(i, now);
      if (!this.reduced) { const x0 = t.img.x; this.tweens.add({ targets: t.img, x: x0 + 2.5, duration: 55, yoyo: true, repeat: 3, onComplete: () => t.img.setX(x0) }); }
      sfx.rustle();
      const kind = this.drops.get(i);
      if (!kind) return;
      this.drops.delete(i);
      const land = { x: t.at.x + (this.pos.x < t.at.x ? 18 : -18), y: t.at.y + 12 };
      const obj = dropArt(this, kind).setPosition(land.x, t.at.y - 36).setDepth(land.y);
      this.tweens.add({ targets: obj, y: land.y, duration: this.reduced ? 1 : 460, ease: 'Bounce.easeOut' });
      this.items.push({ kind, tree: i, at: land, obj });
    });
  }

  /** 떨어진 것에 닿으면 줍는다 — 위로 톡 올라가며 사라지고 주머니로. */
  private pickUp() {
    this.items = this.items.filter(item => {
      if (distance(this.pos, item.at) > 16) return true;
      if (item.kind === 'coin') sfx.coin(); else sfx.fruit();
      this.tweens.add({ targets: item.obj, y: item.at.y - 34, alpha: 0, scale: 1.4, duration: this.reduced ? 1 : 360, ease: 'Cubic.easeOut', onComplete: () => item.obj.destroy() });
      sparkle(this, item.at.x, item.at.y - 10, this.reduced);
      this.runtime.picked(item.tree, item.kind);
      return false;
    });
  }
}
