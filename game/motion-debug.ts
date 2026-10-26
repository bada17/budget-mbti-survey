/** ?motiontrace=<로컬 시험 키>에서만 읽기용 기록을 만든다. 답·이름·판정 저장소는 읽거나 바꾸지 않는다(좌표·진행은 기록한다). */
type Target = { type?: string; x?: number; y?: number; alpha?: number };
type Tween = { duration?: number; elapsed?: number; progress?: number; state?: number; targets?: Target[]; data?: { key?: string; current?: number; start?: number; end?: number; duration?: number; elapsed?: number; targetIndex?: number }[] };
type Manager = { add: (...args: unknown[]) => Tween; addCounter: (...args: unknown[]) => Tween; getTweens: () => Tween[]; timeScale?: number; paused?: boolean; time?: number };
type Scene = { reduced?: boolean; mode?: string; roomIndex?: number; tweens?: Manager; cameras?: { main?: { scrollY?: number; fadeEffect?: { alpha?: number; isRunning?: boolean } } } };

export function startMotionDebug(scene: () => unknown) {
  const start = performance.now(), media = matchMedia('(prefers-reduced-motion: reduce)');
  const frames: unknown[] = [], created: unknown[] = [], samples: unknown[] = [], changes: unknown[] = [];
  const hooked = new WeakSet<Manager>(), seen = new WeakSet<Tween>();
  const at = () => Math.round(performance.now() - start);
  const ui = document.createElement('div'), status = document.createElement('span'), send = document.createElement('button');
  ui.style.cssText = 'position:fixed;z-index:10001;right:4px;bottom:4px;display:flex;align-items:center;gap:6px;padding:5px 8px;background:#fff;color:#202020;border:1px solid #666;border-radius:8px;font:12px system-ui;max-width:calc(100vw - 8px)';
  send.textContent = '진단 보내기'; send.type = 'button'; send.style.cssText = 'padding:8px;border-radius:6px;background:#245e40;color:white;font:inherit';
  ui.append(status, send); document.body.append(ui);
  const recordTween = (t: Tween, method: string) => {
    if (!t || seen.has(t)) return;
    seen.add(t);
    created.push({ ms: at(), method, reduced: (scene() as Scene | undefined)?.reduced, duration: t.duration,
      data: t.data?.slice(0, 8).map(d => ({ key: d.key, duration: d.duration, type: t.targets?.[d.targetIndex ?? 0]?.type })) });
    if (created.length > 300) created.shift();
  };
  const initial = { reduced: media.matches, userAgent: navigator.userAgent, dpr: devicePixelRatio, width: innerWidth, height: innerHeight };
  media.addEventListener('change', e => changes.push({ ms: at(), reduced: e.matches }));
  document.addEventListener('visibilitychange', () => changes.push({ ms: at(), visibility: document.visibilityState }));
  let previous = performance.now(), lastSample = -200, sent = false;
  const tick = (now: number) => {
    const delta = now - previous; previous = now;
    if (delta > 80) { frames.push({ ms: at(), delta: Math.round(delta) }); if (frames.length > 80) frames.shift(); }
    const s = scene() as Scene | undefined, manager = s?.tweens;
    if (manager && !hooked.has(manager)) {
      hooked.add(manager);
      for (const method of ['add', 'addCounter'] as const) {
        const original = manager[method];
        manager[method] = function (...args: unknown[]) { const t = original.apply(this, args); recordTween(t, method); return t; };
      }
    }
    if (now - lastSample >= 100) {
      lastSample = now;
      const door = document.querySelector<HTMLElement>('.g-door'), css = door && getComputedStyle(door);
      const rect = door && !door.hidden ? door.getBoundingClientRect() : undefined;
      const reduced = media.matches;
      if (!sent) status.textContent = `기기축소 ${reduced} · 게임 ${s?.reduced ?? '-'} · 문 ${css?.animationDuration ?? '-'}`;
      samples.push({ ms: at(), reduced, sceneReduced: s?.reduced, mode: s?.mode, room: s?.roomIndex,
        door: { visible: Boolean(rect), top: rect?.top, animation: css?.animationName, duration: css?.animationDuration, iterations: css?.animationIterationCount, state: css?.animationPlayState, transform: css?.transform, translate: css?.translate },
        camera: { scrollY: s?.cameras?.main?.scrollY, fadeAlpha: s?.cameras?.main?.fadeEffect?.alpha },
        manager: { timeScale: manager?.timeScale, paused: manager?.paused, time: manager?.time },
        tweens: manager?.getTweens().slice(0, 12).map(t => ({ duration: t.duration, elapsed: t.elapsed, progress: t.progress, state: t.state,
          data: t.data?.slice(0, 3).map(d => { const target = t.targets?.[d.targetIndex ?? 0]; return { key: d.key, current: d.current, start: d.start, end: d.end, duration: d.duration, elapsed: d.elapsed, x: target?.x, y: target?.y, alpha: target?.alpha }; }) })) });
      if (samples.length > 350) samples.shift();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  send.onclick = async () => {
    send.disabled = true; sent = true;
    try {
      const response = await fetch(`/__motion_trace?key=${encodeURIComponent(new URLSearchParams(location.search).get('motiontrace') ?? '')}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: 'ios-motion-2', initial, currentReduced: media.matches, changes, frames, created, samples }),
      });
      if (!response.ok) throw new Error(String(response.status));
      sent = true; status.textContent = '보냈어요. 채팅에 알려주세요.';
    } catch { status.textContent = '전송 실패. 채팅에 알려주세요.'; }
    finally { send.disabled = false; }
  };
}
