import { FEEL } from './feel';
import type { Point } from './world';

export class MovementInput {
  private keys = new Set<string>();
  private stick: Point = { x: 0, y: 0 };
  private pointer?: number;
  private abort = new AbortController();
  constructor(private pad: HTMLElement, private enabled: () => boolean) {
    const options = { signal: this.abort.signal };
    const directions = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
    window.addEventListener('keydown', event => {
      if (!this.enabled() || !directions.includes(event.key)) return;
      event.preventDefault();
      this.keys.add(event.key);
    }, options);
    window.addEventListener('keyup', event => this.keys.delete(event.key), options);
    window.addEventListener('blur', () => this.reset(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.reset(); }, options);
    pad.addEventListener('pointerdown', event => {
      if (!this.enabled() || this.pointer !== undefined) return;
      event.preventDefault();
      this.pointer = event.pointerId;
      pad.setPointerCapture(event.pointerId);
      this.setStick(event);
    }, options);
    pad.addEventListener('pointermove', event => { if (this.pointer === event.pointerId) this.setStick(event); }, options);
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      pad.addEventListener(name, event => { if (this.pointer === event.pointerId) this.reset(); }, options);
    }
  }
  private setStick(event: PointerEvent) {
    const rect = this.pad.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / FEEL.joystickRadius;
    const y = (event.clientY - rect.top - rect.height / 2) / FEEL.joystickRadius;
    const magnitude = Math.hypot(x, y);
    this.stick = magnitude < FEEL.joystickDeadzone ? { x: 0, y: 0 } : { x: x / Math.max(1, magnitude), y: y / Math.max(1, magnitude) };
    this.pad.style.setProperty('--stick-x', `${this.stick.x * FEEL.joystickRadius}px`);
    this.pad.style.setProperty('--stick-y', `${this.stick.y * FEEL.joystickRadius}px`);
  }
  read(): Point {
    if (!this.enabled()) return { x: 0, y: 0 };
    const key = (a: string, b: string) => Number(this.keys.has(a) || this.keys.has(b));
    const keyboard = { x: key('ArrowRight', 'd') - key('ArrowLeft', 'a'), y: key('ArrowDown', 's') - key('ArrowUp', 'w') };
    return keyboard.x || keyboard.y ? keyboard : { ...this.stick };
  }
  reset() {
    this.keys.clear(); this.stick = { x: 0, y: 0 };
    const pointer = this.pointer; this.pointer = undefined;
    if (pointer !== undefined && this.pad.hasPointerCapture(pointer)) this.pad.releasePointerCapture(pointer);
    this.pad.style.setProperty('--stick-x', '0px'); this.pad.style.setProperty('--stick-y', '0px');
  }
  destroy() { this.reset(); this.abort.abort(); }
}
