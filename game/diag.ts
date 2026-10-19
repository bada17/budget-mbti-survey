/*
  진단 판 — 공개판에서도 주소 끝에 ?diag 를 붙이면 왼쪽 위에 뜬다(10-19 아이패드 「화살표가 미친 듯이 움직임·움직임이 부자연스러움」).
  웹킷 흉내로는 iOS 의 진짜 손가락·키보드·화면 크기 변화를 못 만들어서, 기기에서 숫자를 찍어 받으려고 만들었다.
  사람이 화면을 찍어 보내는 용도라 저장·전송은 없다. 원인을 고치고 나면 지운다.
*/
type Pos = { x: number; y: number };

export function startDiag(o: { surface: HTMLElement; scene: () => unknown; vector: () => Pos }) {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:4px;top:4px;z-index:9999;margin:0;padding:6px 8px;max-width:calc(100vw - 8px);font:11px/1.35 ui-monospace,Menlo,monospace;color:#fff;background:#000c;border-radius:8px;pointer-events:none;white-space:pre-wrap';
  document.body.append(box);
  const count: Record<string, number> = {};
  const bump = (k: string) => { count[k] = (count[k] ?? 0) + 1; };
  const recent: string[] = [];
  const note = (line: string) => { recent.unshift(line); recent.length = Math.min(recent.length, 6); };
  const short = (t: EventTarget | null) => (t instanceof Element ? `${t.tagName.toLowerCase()}${t.className && typeof t.className === 'string' ? '.' + t.className.split(' ')[0] : ''}` : String(t));

  // 손가락 — 걷기 판(surface)에 닿는 것을 잡는 단계에서 다 센다(캔버스에 닿은 것도 여길 지난다). 창 쪽 취소도 따로.
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'gotpointercapture', 'lostpointercapture', 'touchstart', 'touchend', 'touchcancel'])
    o.surface.addEventListener(type, e => {
      bump(type);
      if (type !== 'pointermove' && type !== 'touchstart' && type !== 'touchend') {
        const p = e as PointerEvent;
        note(`${type} ${p.pointerType ?? ''}#${p.pointerId ?? ''} ${Math.round(p.clientX ?? 0)},${Math.round(p.clientY ?? 0)} @${short(e.target)}`);
      }
    }, { capture: true, passive: true });
  window.addEventListener('pointercancel', e => { if (!o.surface.contains(e.target as Node)) { bump('창 pointercancel'); note(`창 pointercancel @${short(e.target)}`); } }, { capture: true, passive: true });
  // 키 — 방향키를 누르고 뗄 때 이름(key/code)이 같게 오는지.
  for (const type of ['keydown', 'keyup'] as const)
    window.addEventListener(type, e => { bump(type); note(`${type} ${e.key}/${e.code}${e.repeat ? ' 반복' : ''}`); }, { capture: true });
  // 크기 — 걷기 판·창·보이는 창(키보드·주소창)이 몇 번 바뀌나.
  new ResizeObserver(() => bump('판 크기')).observe(o.surface);
  window.addEventListener('resize', () => bump('창 크기'));
  visualViewport?.addEventListener('resize', () => bump('보이는 창 크기'));
  visualViewport?.addEventListener('scroll', () => bump('보이는 창 밀림'));

  // 장마다 — 장 간격, 내 걸음(한 장에 몇 px), 문 화살표가 한 장에 얼마나 튀나. 1초씩 모아 보인다.
  let frames = 0, worst = 0, last = performance.now(), second = last;
  let lastPos: Pos | undefined, steps: number[] = [], lastDoor: DOMRect | undefined, doorJump = 0;
  let shown = { fps: 0, worst: 0, step: '-', door: '-' };
  const tick = (now: number) => {
    frames++; worst = Math.max(worst, now - last); last = now;
    const pos = (o.scene() as { pos?: Pos } | undefined)?.pos;
    if (pos && lastPos) { const d = Math.hypot(pos.x - lastPos.x, pos.y - lastPos.y); if (d > 0.05) steps.push(d); }
    lastPos = pos ? { ...pos } : undefined;
    const door = document.querySelector<HTMLElement>('.g-door');
    const rect = door && !door.hidden ? door.getBoundingClientRect() : undefined;
    if (rect && lastDoor) doorJump = Math.max(doorJump, Math.hypot(rect.left - lastDoor.left, rect.top - lastDoor.top));
    lastDoor = rect;
    if (now - second >= 1000) {
      const s = [...steps].sort((a, b) => a - b);
      shown = {
        fps: Math.round(frames * 1000 / (now - second)), worst: Math.round(worst),
        step: s.length ? `${s[0].toFixed(1)}~${s[s.length - 1].toFixed(1)}px (${s.length}장)` : '-',
        door: lastDoor ? `${Math.round(lastDoor.left)},${Math.round(lastDoor.top)} 한 장 최대 ${doorJump.toFixed(1)}px` : '-',
      };
      frames = 0; worst = 0; second = now; steps = []; doorJump = 0;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  setInterval(() => {
    const r = o.surface.getBoundingClientRect(), v = visualViewport, canvas = o.surface.querySelector('canvas'), vec = o.vector();
    box.textContent = [
      `${/iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1 ? '아이패드' : /iPhone/.test(navigator.userAgent) ? '아이폰' : /Android/.test(navigator.userAgent) ? '안드로이드' : '기타'} dpr ${devicePixelRatio} 손가락 ${matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine'} 터치점 ${navigator.maxTouchPoints}`,
      `창 ${innerWidth}×${innerHeight} 밀림 ${Math.round(scrollY)} · 보이는 창 ${v ? `${Math.round(v.width)}×${Math.round(v.height)} 위 ${Math.round(v.offsetTop)}` : '-'}`,
      `판 ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} · 캔버스 ${canvas?.width}×${canvas?.height}`,
      `초당 ${shown.fps}장 · 가장 긴 장 ${shown.worst}ms`,
      `내 걸음 한 장에 ${shown.step} · 방향 ${vec.x.toFixed(2)},${vec.y.toFixed(2)}`,
      `문 화살표 ${shown.door}`,
      Object.entries(count).map(([k, n]) => `${k} ${n}`).join(' · '),
      ...recent,
    ].join('\n');
  }, 250);
}
