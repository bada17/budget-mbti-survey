// Actual game code at a controlled rAF ceiling; not an iOS power-mode emulator.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this function expression.
async page => {
  const results = [];
  for (const reduced of [false, true]) {
    const context = await page.context().browser().newContext({ viewport: { width: 375, height: 635 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    try {
      await context.addInitScript(() => {
        const native = window.requestAnimationFrame.bind(window), pending = new Map();
        let id = 0, scheduled = false, last = -Infinity;
        const tick = now => {
          scheduled = false;
          if (now - last >= 30) {
            last = now;
            for (const [key, callback] of [...pending]) {
              if (!pending.has(key)) continue;
              pending.delete(key); callback(now);
            }
          }
          if (pending.size && !scheduled) { scheduled = true; native(tick); }
        };
        window.requestAnimationFrame = callback => {
          const key = ++id; pending.set(key, callback);
          if (!scheduled) { scheduled = true; native(tick); }
          return key;
        };
        window.cancelAnimationFrame = key => pending.delete(key);
      });
      const p = await context.newPage(), errors = [];
      p.on('pageerror', error => errors.push(String(error)));
      await p.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:5173/') ? route.continue() : route.abort());
      await p.goto('http://127.0.0.1:5173/?walk&pub');
      await p.waitForFunction(() => window.__journey?.player);
      const result = await p.evaluate(async () => {
        const { setMotionPreference } = await import('/motion.ts');
        const { typeOut } = await import('/ui.ts');
        setMotionPreference('full');
        const s = window.__journey, resident = s.residents.left;
        document.querySelector('.g-intro').hidden = true;
        s.runtime.ui.door('다음 장소', { x: s.room.door.x, y: s.room.wallY - 104 });
        const door = document.querySelector('.g-door'), quote = document.createElement('p');
        document.body.append(quote);
        const times = [], tops = [], zooms = [], updates = [];
        const original = s.sys.sceneUpdate;
        s.sys.sceneUpdate = function (...args) {
          const before = performance.now(); original.apply(this, args);
          updates.push(performance.now() - before);
        };
        const start = performance.now(); let textDone;
        typeOut(quote, '가나다라마바사아자차', () => { textDone = performance.now() - start; });
        s.walkTo(resident, { x: resident.x + 40, y: resident.y }, 1100, { x: resident.x + 40, y: resident.y + 1 });
        s.zoomTo({ z: 1.1, x: 0, y: 0 });
        await new Promise(resolve => {
          const tick = now => {
            times.push(now); tops.push(door.getBoundingClientRect().top); zooms.push(s.cameras.main.zoom);
            if (now - start < 650) requestAnimationFrame(tick); else resolve();
          };
          requestAnimationFrame(tick);
        });
        s.sys.sceneUpdate = original;
        const intervals = times.slice(1).map((time, i) => time - times[i]);
        const sorted = [...updates].sort((a, b) => a - b), phase = resident.walkClock;
        const delta = s.game.loop.delta, rawDelta = s.game.loop.rawDelta, firstElapsed = performance.now() - start;
        s.hillWalks.get(resident)?.stop();
        resident.walkClock = 0;
        s.game.loop.resetDelta(); // Same clock reset performed on startup/focus recovery.
        s.walkTo(resident, { x: resident.x + 40, y: resident.y }, 1100, { x: resident.x + 40, y: resident.y + 1 });
        const focusStart = performance.now();
        await new Promise(resolve => {
          const tick = now => { if (now - focusStart < 650) requestAnimationFrame(tick); else resolve(); };
          requestAnimationFrame(tick);
        });
        const focusPhase = resident.walkClock;
        quote.remove();
        return {
          nativeReduced: matchMedia('(prefers-reduced-motion: reduce)').matches, sceneReduced: s.reduced,
          rendererType: s.game.renderer.type, webgl: Boolean(s.game.renderer.gl),
          fps: (times.length - 1) * 1000 / (times.at(-1) - times[0]), maxGap: Math.max(...intervals),
          doorRange: Math.max(...tops) - Math.min(...tops), doorAnimation: getComputedStyle(door).animationName,
          textDoneMs: textDone, elapsedMs: firstElapsed, walkingPhaseMs: phase,
          deltaMs: delta, rawDeltaMs: rawDelta, focusWalkingPhaseMs: focusPhase,
          cameraIntermediate: zooms.some(z => z > 3.01 && z < 3.29),
          updateP95: sorted[Math.floor(sorted.length * 0.95)], updateMax: Math.max(...updates),
        };
      });
      const rateHeld = result.fps >= 24 && result.fps <= 34;
      if (result.nativeReduced !== reduced || result.sceneReduced || result.doorRange < 4 || result.doorAnimation !== 'door-bob' || !result.cameraIntermediate) throw new Error(JSON.stringify(result));
      if (!rateHeld) throw new Error('30fps 조건을 재현하지 못했다: ' + JSON.stringify(result));
      if (!result.textDoneMs || result.textDoneMs > 600 || result.walkingPhaseMs < 550 || result.walkingPhaseMs > 750 || result.focusWalkingPhaseMs < 550 || result.focusWalkingPhaseMs > 750) throw new Error('Timing regression: ' + JSON.stringify(result));
      if (errors.length) throw new Error(errors.join('\n'));
      results.push({ reducedSignal: reduced, rateHeld, ...result, errors });
    } finally { await context.close(); }
  }
  return { engine: page.context().browser().browserType().name(), scope: 'Desktop low-rate reproduction only', results };
}
