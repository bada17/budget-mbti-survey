/*
  마을(기획 4차, 2026-10-14) — 한 바퀴를 끝낸 뒤 나오는 곳, 다시 온 사람은 여기서 시작한다.

  · 화면 서너 개 크기의 지도를 걸어 다닌다. 카메라가 나를 따라간다. 조작은 걷기 판과 같다(꾹 누르면 손가락 쪽으로, 톡 치면 거기까지).
    건물을 톡 치면 그 문 앞까지 걸어간다. 문 앞에 닿으면 그 판이 열린다(runtime.enter) — 멀어졌다 와야 또 열린다.
  · 혼자가 아니다(사용자 6번) — 최근에 들른 주민들(이름 없이 모습만)이 광장과 길을 서성이고, 쪽지를 붙인 사람은 머리 위에 쪽지를 든다.
    곁에 서면 그 쪽지가 아래 카드로 뜬다(runtime.near). 지나가면 손을 흔든다.
  · 내 이웃(언덕에서 이름 지어 준 주민)이 있으면 내 뒤를 따라온다.
  배치·부딪힘은 village.ts, 그림은 draw.ts 의 drawVillage. 여기서는 위치·연출만.
*/
import Phaser from 'phaser';
import { FEEL } from '../feel';
import { alongTrail, distance, type Point } from '../room';
import { PLACES, SPAWN, VILLAGE_W, VILLAGE_H, CROWD_SHOW, walkVillage, findPath, placeAt, wanderSpot, type PlaceId } from '../village';
import { Dude, lookFrom, toLook, drawVillage, noteTag, dust, tapRing, flee, meow, sparkle, type VillageArt } from '../draw';
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
  private keepers: { dude: Dude; at: Point }[] = [];
  private folks = new Map<string, Folk>();
  private inside?: PlaceId;
  private reading?: Folk;
  private paused = false;
  private dustClock = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private runtime: VillageRuntime) { super('village'); }

  create() {
    const { dpr } = this.runtime.view();
    const cam = this.cameras.main;
    cam.setZoom(dpr).setBounds(0, 0, VILLAGE_W, VILLAGE_H);
    this.art = drawVillage(this, dpr);
    this.pos = { ...SPAWN[this.runtime.start()] };
    this.player = new Dude(this, toLook(this.runtime.pick()), this.pos.x, this.pos.y).place(this.pos);
    this.trail = [{ x: this.pos.x, y: this.pos.y + 60 }, { ...this.pos }];
    const neighbor = this.runtime.neighbor();
    if (neighbor) this.buddy = new Dude(this, lookFrom(neighbor.seed), this.pos.x, this.pos.y + 30, FEEL.followerScale).place({ x: this.pos.x, y: this.pos.y + 30 });
    // 문 앞 주민 — 문 오른쪽에 서서 나를 본다(쪽지판엔 없다). 판 안의 한마디와 같은 생김새(npc:<id>).
    for (const place of PLACES) if (place.id !== 'board') {
      const at = { x: place.door.x + 38, y: place.door.y - 6 };
      this.keepers.push({ dude: new Dude(this, lookFrom(`npc:${place.id}`), at.x, at.y).place(at), at });
    }
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
  }

  /** 지도에서 고른 곳 — 잠깐 어두워졌다가 그 문 앞에 선다. 문이 열리는 건 다음 판이 한다(main 이 연다). */
  jump(id: PlaceId, done: () => void) {
    const place = PLACES.find(p => p.id === id)!;
    const go = () => {
      this.goal = undefined; this.route = [];
      this.pos = { x: place.door.x, y: place.door.y + 4 };
      this.trail = [{ x: this.pos.x, y: this.pos.y + 40 }, { ...this.pos }];
      this.buddy?.place({ x: this.pos.x, y: this.pos.y + 30 });
      this.player.place(this.pos);
      this.cameras.main.centerOn(this.pos.x, this.pos.y - 40);
      this.inside = id; // 도착하자마자 또 열리지 않게
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
      const board = PLACES.find(p => p.id === 'board')!.door;
      const at = note && Date.now() - note.at < 60_000 ? { x: board.x + 20, y: board.y + 10 } : wanderSpot(random);
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

  /** 톡 친 곳이 건물(지붕 포함)이면 그 문 앞으로. */
  private tapGoal(p: Point): Point {
    const hit = PLACES.find(({ box }) => p.x > box.x - 8 && p.x < box.x + box.w + 8 && p.y > box.y - 64 && p.y < box.y + box.h + 4);
    return hit ? { x: hit.door.x, y: hit.door.y } : p;
  }

  update(_time: number, delta: number) {
    if (!this.player) return;
    const dt = Math.min(delta, FEEL.maxDeltaMs);
    const before = { ...this.pos };
    if (!this.paused) this.walk(dt);
    const moving = distance(before, this.pos) > 0.05;
    if (moving) this.player.look(this.pos.x - before.x, this.pos.y - before.y);
    this.player.place(this.pos).walk(dt, moving, this.reduced);
    if (moving && !this.reduced && (this.dustClock += dt) > FEEL.dustEveryMs) { this.dustClock = 0; dust(this, this.pos.x - 6, this.pos.y); }
    this.follow(dt);
    this.wander(dt);
    for (const { dude, at } of this.keepers) { dude.look(this.pos.x - at.x, this.pos.y - at.y); dude.walk(dt, false, this.reduced); }
    this.toys();
    this.cull(); // 화면 밖은 안 그린다 — 느린 폰에서 끊기지 않게
    if (this.paused) return;
    this.doors();
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
    for (const { dude, at } of this.keepers) dude.root.setVisible(seen(at.x, at.y));
    for (const folk of this.folks.values()) { const on = seen(folk.at.x, folk.at.y); folk.dude.root.setVisible(on); folk.mark?.setVisible(on); }
    for (const kitty of this.art.cats) kitty.root.setVisible(seen(kitty.at.x, kitty.at.y));
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

  private toys() {
    for (const bird of this.art.pigeons) if (!bird.fled && distance(this.pos, bird.at) < FEEL.pigeonFleeRadius) { flee(this, bird, this.pos); sfx.flutter(); }
    for (const kitty of this.art.cats) {
      const d = distance(this.pos, kitty.at);
      if (!kitty.near && d < FEEL.catRadius) { kitty.near = true; meow(this, kitty, this.reduced); sfx.meow(); }
      else if (kitty.near && d > FEEL.catRadius + 30) kitty.near = false;
    }
  }

  relayout() { if (this.player) this.cameras.main.setZoom(this.runtime.view().dpr); }
}
