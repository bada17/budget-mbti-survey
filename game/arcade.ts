/*
  예산 오락실(사용자 10-17) — 사는 집이 아니라 들어가서 짧게 노는 집. 놀이 셋, 한 판 30초~1분, 어른도 아이도 같은 판(나이로 나누지 않는다).
  · 어느 게 더 비쌀까 — 둘 중 비싼 쪽. 지금은 예시 다섯 문제(나라장터를 붙이면 바꾼다, 사용자 「느낌만 보게 5개만」).
  · 금고 채우기 — 금고 칸에 사업 블록을 끼워 딱 맞게 채우기. 블록 이름·크기는 빈칸(사용자 「내용 채우지 말고 구조만」).
  · 밑빠진 독 막기 — 독 구멍에 뜨는 사업 가운데 새는 돈만 톡. 예시 한 판(사용자 「예시로 하나만」, 꼭 독상 수상 사례가 아니어도 된다).
  깨면 동전 하나 — 놀이마다 하루 한 번(주머니 arcade). 공사터에 넣는 그 동전이라 넣는 쪽 하루 한도(COIN_DAY_MAX)에 같이 걸린다.
  모양은 town.css 의 a-*(꾸미기는 GPT). 규칙(숫자·판정)은 village.ts 「예산 오락실」 — 그림 없이 시험한다.
*/
import { el, btn } from './town';
import { placePanel } from './places';
import { PRICIER, PRICIER_WIN, VAULT_CAP, VAULT_BLOCKS, vaultUsed, vaultFits, LEAKS, DOK_MS, DOK_HOLES, DOK_WIN, type GameId } from './village';

export type ArcadeOpts = {
  /** 이 놀이로 오늘 동전을 받았나. */ paid(game: GameId): boolean;
  /** 깼다 — 오늘 처음이면 동전 하나를 주고 true. */ earn(game: GameId): boolean;
};

const won = (n: number) => (n >= 1e8 ? `${(n / 1e8).toLocaleString('ko-KR')}억 원` : `${(n / 1e4).toLocaleString('ko-KR')}만 원`);

// ───────────────────────── 판 ─────────────────────────
const GAMES: { id: GameId; name: string; line: string; play: (stage: HTMLElement, end: (ok: boolean, line: string) => void) => void }[] = [
  { id: 'pricier', name: '어느 게 더 비쌀까', line: '둘 중 더 비싼 쪽을 골라요. 다섯 문제.', play: playPricier },
  { id: 'vault', name: '금고 채우기', line: '사업 블록을 금고에 딱 맞게 넣어요.', play: playVault },
  { id: 'dok', name: '밑빠진 독 막기', line: '30초 동안 새는 돈만 골라 막아요.', play: playDok },
];

export function openArcade(shell: HTMLElement, opts: ArcadeOpts, onClose: () => void) {
  const { panel } = placePanel(shell, 'arcade', onClose);
  const stage = el('div', 'a-stage');
  panel.append(stage);
  const home = () => {
    stage.dataset.run = '';
    stage.replaceChildren(...GAMES.map(game => {
      const b = btn('a-game', '', () => play(game.id));
      b.append(el('b', '', game.name), el('small', '', game.line), el('span', 'a-paid', opts.paid(game.id) ? '오늘 동전 받음' : '깨면 동전 1개'));
      return b;
    }));
  };
  const play = (id: GameId) => {
    const game = GAMES.find(g => g.id === id)!;
    stage.dataset.run = `${id}:${Date.now()}`;
    stage.replaceChildren();
    game.play(stage, (ok, line) => {
      const got = ok && opts.earn(id);
      stage.dataset.run = '';
      stage.replaceChildren(
        el('p', 'a-big', ok ? '성공!' : '아쉬워요'), el('p', 't-lead', line),
        el('p', 't-small', got ? '동전 1개를 받았어요. 「동전 모으는 곳」 에 넣을 수 있어요.' : ok ? '오늘은 이 놀이로 동전을 이미 받았어요. 내일 또 와요.' : '한 번 더 해 봐요.'),
        btn('g-primary', '다시 하기', () => play(id)), btn('g-ghost', '다른 놀이', home),
      );
    });
    stage.append(btn('g-link a-back', '← 다른 놀이', home));
  };
  home();
}

/** 판이 닫혔거나 다른 놀이로 갔으면 멈춘다(타이머가 남아 돌지 않게). */
const alive = (stage: HTMLElement, run: string) => stage.isConnected && stage.dataset.run === run;

function playPricier(stage: HTMLElement, end: (ok: boolean, line: string) => void) {
  let i = 0, right = 0;
  const box = el('div');
  stage.append(el('p', 'a-note', '예시 금액이에요 — 나라장터 계약 금액으로 바꿀 거예요.'), box);
  const round = () => {
    const [a, b] = PRICIER[i], status = el('p', 't-small a-status');
    status.setAttribute('role', 'status');
    const cards = [a, b].map(item => {
      const card = btn('a-item', '', () => pick(item));
      card.append(el('b', '', item.name), el('span', 'a-price', '?'));
      return card;
    });
    const pick = (chosen: (typeof PRICIER)[number][number]) => {
      const ok = chosen.won === Math.max(a.won, b.won);
      if (ok) right++;
      cards.forEach((card, k) => {
        const item = [a, b][k];
        card.disabled = true;
        card.querySelector('.a-price')!.textContent = won(item.won);
        card.classList.toggle('pricier', item.won > [a, b][1 - k].won);
        card.classList.toggle('picked', item === chosen);
      });
      status.textContent = ok ? '맞혔어요!' : '아까워요!';
      const last = i === PRICIER.length - 1;
      box.append(btn('g-primary', last ? '결과 보기' : '다음', () => { if (last) end(right >= PRICIER_WIN, `다섯 문제 중 ${right}개 맞혔어요.`); else { i++; round(); } }));
    };
    const pair = el('div', 'a-pair');
    pair.append(...cards);
    box.replaceChildren(el('p', 'a-q', `${i + 1} / ${PRICIER.length} · 어느 게 더 비쌀까요?`), pair, status);
  };
  round();
}

function playVault(stage: HTMLElement, end: (ok: boolean, line: string) => void) {
  const run = stage.dataset.run!, placed: number[] = [];
  const vault = el('div', 'a-vault'), tray = el('div', 'a-tray'), meter = el('p', 'a-q'), status = el('p', 't-small a-status');
  status.setAttribute('role', 'status');
  const name = (i: number) => `사업 ${i + 1}`;
  const draw = () => {
    const used = vaultUsed(placed);
    meter.textContent = `금고 ${used} / ${VAULT_CAP}칸`;
    vault.replaceChildren(...placed.map(i => {
      const b = btn('a-block in', name(i), () => { placed.splice(placed.indexOf(i), 1); status.textContent = ''; draw(); });
      b.style.flexGrow = String(VAULT_BLOCKS[i]); return b;
    }));
    for (let k = used; k < VAULT_CAP; k++) vault.append(el('span', 'a-empty')); // 빈 칸 하나에 하나씩
    tray.replaceChildren(...VAULT_BLOCKS.map((size, i) => i).filter(i => !placed.includes(i)).map(i => btn('a-block', `${name(i)} · ${VAULT_BLOCKS[i]}칸`, () => {
      if (!vaultFits(placed, i)) { status.textContent = '금고에 자리가 모자라요. 넣은 걸 눌러 빼 보세요.'; return; }
      placed.push(i); status.textContent = ''; draw();
    })));
    if (used === VAULT_CAP) { tray.querySelectorAll('button').forEach(b => { b.disabled = true; }); setTimeout(() => { if (alive(stage, run) && vaultUsed(placed) === VAULT_CAP) end(true, '금고를 딱 맞게 채웠어요. 못 넣은 사업은 내년을 기다려요.'); }, 700); }
  };
  stage.append(
    el('p', 'a-note', '블록 이름·크기는 아직 빈칸이에요 — 지방재정 자료로 채울 거예요.'),
    el('p', 't-small', '사업을 눌러 금고에 넣어요. 넣은 걸 누르면 빠져요. 금고를 딱 맞게 채우면 성공!'),
    meter, vault, tray, status,
  );
  draw();
}

function playDok(stage: HTMLElement, end: (ok: boolean, line: string) => void) {
  const run = stage.dataset.run!;
  const jar = el('div', 'a-jar'), water = el('div', 'a-water'), clock = el('p', 'a-q'), status = el('p', 't-small a-status');
  status.setAttribute('role', 'status');
  let blocked = 0, missed = 0, left = DOK_MS;
  const holes = Array.from({ length: DOK_HOLES }, (_, k) => {
    const hole = btn('a-hole', '', () => {
      const item = shown.get(k);
      if (!item) return;
      shown.delete(k); hole.textContent = ''; hole.classList.remove('up', 'leak');
      if (item.leak) { blocked++; status.textContent = '막았어요!'; } else { blocked = Math.max(0, blocked - 1); status.textContent = '그건 필요한 돈이에요!'; }
      draw();
    });
    hole.setAttribute('aria-label', `구멍 ${k + 1}`);
    return hole;
  });
  const shown = new Map<number, (typeof LEAKS)[number]>();
  jar.append(water, ...holes);
  const draw = () => {
    clock.textContent = `남은 시간 ${Math.ceil(left / 1000)}초 · 막은 것 ${blocked}`;
    water.style.height = `${Math.max(8, 50 - missed * 6)}%`; // 놓친 만큼 물이 샌다
  };
  const pop = () => {
    const free = holes.map((_, k) => k).filter(k => !shown.has(k));
    if (!free.length) return;
    const fresh = LEAKS.filter(x => ![...shown.values()].includes(x)); // 같은 사업이 두 구멍에 동시에 뜨지 않게
    const k = free[Math.floor(Math.random() * free.length)], item = fresh[Math.floor(Math.random() * fresh.length)];
    shown.set(k, item);
    holes[k].textContent = item.name; holes[k].classList.add('up');
    setTimeout(() => {
      if (!alive(stage, run) || shown.get(k) !== item) return;
      shown.delete(k); holes[k].textContent = ''; holes[k].classList.remove('up');
      if (item.leak) { missed++; draw(); } // 못 막은 새는 돈 — 물이 줄어든다
    }, 1500);
  };
  stage.append(el('p', 'a-note', '예시 사업이에요.'), el('p', 't-small', '구멍에 사업이 떠요. 새는 돈만 눌러 막고, 필요한 돈은 두세요.'), clock, jar, status);
  draw();
  const started = Date.now();
  const tick = setInterval(() => {
    if (!alive(stage, run)) { clearInterval(tick); return; }
    left = DOK_MS - (Date.now() - started);
    if (left <= 0) { clearInterval(tick); end(blocked >= DOK_WIN, `새는 돈 ${blocked}개를 막고, ${missed}개는 놓쳤어요.`); return; }
    pop(); draw();
  }, 850);
}
