/*
  조작 — 한 손 엄지로.
  · 화면을 꾹 누르고 있으면 손가락 쪽으로 걷는다(누른 채 끌면 따라온다). 떼면 선다.
  · 톡 치면 그 자리까지 걸어간다.
  · 컴퓨터에서는 방향키·WASD.
  target 은 장면이 직접 넣기도 한다(말풍선·문 단추를 누르면 그리로 걸어가기).
*/
import { FEEL } from './feel';
import type { Point } from './room';

const KEYS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
};

export class Controls {
  target?: Point;
  /** 방금 톡 친 자리 — 장면이 동그라미를 한 번 그리고 비운다. */
  tapped?: Point;
  private keys = new Set<string>();
  private touch?: { id: number; start: Point; at: number; moved: boolean };
  private abort = new AbortController();

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
      this.touch = { id: e.pointerId, start: p, at: performance.now(), moved: false };
      this.target = p;
    }, on);
    surface.addEventListener('pointermove', e => {
      if (this.touch?.id !== e.pointerId) return;
      const p = this.point(e);
      if (Math.hypot(p.x - this.touch.start.x, p.y - this.touch.start.y) > FEEL.tapSlop) this.touch.moved = true;
      this.target = p;
    }, on);
    surface.addEventListener('pointerup', e => {
      if (this.touch?.id !== e.pointerId) return;
      const tap = !this.touch.moved && performance.now() - this.touch.at < FEEL.tapMs;
      if (tap) this.tapped = this.target; else this.target = undefined;
      this.touch = undefined;
    }, on);
    for (const name of ['pointercancel', 'lostpointercapture'] as const) {
      surface.addEventListener(name, e => { if (this.touch?.id === e.pointerId) { this.touch = undefined; this.target = undefined; } }, on);
    }
  }

  private point(e: PointerEvent): Point {
    const r = this.surface.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** 방향키로 가는 방향. 없으면 {0,0}. */
  keyVector(): Point {
    if (!this.enabled()) return { x: 0, y: 0 };
    const v = { x: 0, y: 0 };
    for (const key of this.keys) { v.x += KEYS[key].x; v.y += KEYS[key].y; }
    return v;
  }

  get holding() { return Boolean(this.touch); }

  clear() {
    this.keys.clear(); this.target = undefined; this.tapped = undefined;
    if (this.touch && this.surface.hasPointerCapture(this.touch.id)) this.surface.releasePointerCapture(this.touch.id);
    this.touch = undefined;
  }

  destroy() { this.clear(); this.abort.abort(); }
}
