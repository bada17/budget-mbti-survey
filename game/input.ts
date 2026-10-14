/*
  조작 — 한 손 엄지로(사용자 10-14 「엄지손가락만으로 움직일 수 있게, 지금은 화면 전체를 눌러야 해」 → 떠다니는 조이스틱).
  · 화면 아무 데나 엄지를 대고 밀면, 댄 자리에 손잡이가 생기고 미는 쪽으로 걷는다. 조금 밀면 천천히, 끝까지 밀면 제 걸음.
    너무 멀리 끌면 손잡이 바탕이 엄지를 따라온다(방향을 바꾸기 쉽게). 떼면 선다. 엄지를 아래쪽에 둔 채로 위로 갈 수 있다.
  · 톡 치면 그 자리까지 걸어간다(그대로).
  · 예전 「꾹 누르면 손가락 쪽으로」 는 뺐다 — 조이스틱과 겹친다(누른 채 가만있으면 선다).
  · 컴퓨터에서는 방향키·WASD, 마우스로 끌어도 같다.
  target 은 장면이 직접 넣기도 한다(말풍선·문 단추를 누르면 그리로 걸어가기).
*/
import { FEEL } from './feel';
import type { Point } from './room';

const KEYS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
};

const STICK = 46; // 손잡이가 움직이는 반지름(CSS px) — 이만큼 밀면 제 걸음
const DEAD = 5; // 이보다 덜 밀면 서 있는다

export class Controls {
  target?: Point;
  /** 방금 톡 친 자리 — 장면이 동그라미를 한 번 그리고 비운다. */
  tapped?: Point;
  private keys = new Set<string>();
  /** start = 손잡이 바탕 자리(멀리 끌면 따라온다), stick = 바탕에서 엄지까지(STICK 안으로 자른 것). */
  private touch?: { id: number; start: Point; down: Point; at: number; moved: boolean; stick: Point };
  private abort = new AbortController();
  private pad?: HTMLElement;

  constructor(private surface: HTMLElement, private enabled: () => boolean) {
    const on = { signal: this.abort.signal };
    window.addEventListener('keydown', e => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!KEYS[key] || !this.enabled() || (e.target as HTMLElement)?.closest?.('button')) return;
      e.preventDefault(); this.keys.add(key); this.target = undefined;
    }, on);
    window.addEventListener('keyup', e => this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key), on);
    window.addEventListener('blur', () => this.clear(), on);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); }, on);
    surface.addEventListener('pointerdown', e => {
      if (!this.enabled() || this.touch || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault();
      surface.setPointerCapture(e.pointerId);
      const p = this.point(e);
      this.touch = { id: e.pointerId, start: p, down: p, at: performance.now(), moved: false, stick: { x: 0, y: 0 } };
      this.target = undefined;
    }, on);
    surface.addEventListener('pointermove', e => {
      const t = this.touch;
      if (t?.id !== e.pointerId) return;
      const p = this.point(e);
      if (!t.moved && Math.hypot(p.x - t.down.x, p.y - t.down.y) > FEEL.tapSlop) { t.moved = true; this.target = undefined; }
      if (!t.moved) return;
      let dx = p.x - t.start.x, dy = p.y - t.start.y;
      const len = Math.hypot(dx, dy);
      if (len > STICK) { t.start = { x: p.x - dx / len * STICK, y: p.y - dy / len * STICK }; dx = dx / len * STICK; dy = dy / len * STICK; } // 바탕이 엄지를 따라온다
      t.stick = { x: dx, y: dy };
      this.drawPad();
    }, on);
    surface.addEventListener('pointerup', e => {
      const t = this.touch;
      if (t?.id !== e.pointerId) return;
      if (!t.moved && performance.now() - t.at < FEEL.tapMs) { this.target = t.down; this.tapped = t.down; } // 톡 — 그 자리까지
      this.touch = undefined;
      this.drawPad();
    }, on);
    for (const name of ['pointercancel', 'lostpointercapture'] as const) {
      surface.addEventListener(name, e => { if (this.touch?.id === e.pointerId) { this.touch = undefined; this.target = undefined; this.drawPad(); } }, on);
    }
  }

  /** 손잡이 그림 — 바탕 동그라미와 엄지 쪽 작은 동그라미. 밀고 있을 때만 보인다. */
  private drawPad() {
    const t = this.touch;
    if (!t?.moved) { if (this.pad) this.pad.hidden = true; return; }
    if (!this.pad) {
      this.pad = document.createElement('div');
      this.pad.className = 'g-stick';
      this.pad.setAttribute('aria-hidden', 'true');
      this.pad.append(document.createElement('i'));
      this.surface.parentElement?.append(this.pad);
    }
    this.pad.hidden = false;
    this.pad.style.left = `${t.start.x}px`; this.pad.style.top = `${t.start.y}px`;
    (this.pad.firstElementChild as HTMLElement).style.transform = `translate(${t.stick.x}px, ${t.stick.y}px)`;
  }

  private point(e: PointerEvent): Point {
    const r = this.surface.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** 방향키·조이스틱으로 가는 방향. 조이스틱은 민 만큼(0~1) — 조금 밀면 천천히. 없으면 {0,0}. */
  keyVector(): Point {
    if (!this.enabled()) return { x: 0, y: 0 };
    const v = { x: 0, y: 0 };
    for (const key of this.keys) { v.x += KEYS[key].x; v.y += KEYS[key].y; }
    const s = this.touch?.moved ? this.touch.stick : undefined;
    if (s && Math.hypot(s.x, s.y) > DEAD) { v.x += s.x / STICK; v.y += s.y / STICK; }
    return v;
  }

  get holding() { return Boolean(this.touch); }

  clear() {
    this.keys.clear(); this.target = undefined; this.tapped = undefined;
    if (this.touch && this.surface.hasPointerCapture(this.touch.id)) this.surface.releasePointerCapture(this.touch.id);
    this.touch = undefined;
    this.drawPad();
  }

  destroy() { this.clear(); this.pad?.remove(); this.abort.abort(); }
}
