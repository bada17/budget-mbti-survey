/*
  마을 「나라살림 창고」(지방재정) 판에 쓰는 자료를 굽는다 — local-finance 저장소에서 빌려 오기만 한다(README 「기획 4차」).
  쓰는 법: node scripts/bake-local-finance.mjs <local-finance 폴더>   → game/data/local-finance.json
  원본: <local-finance>/data/indicators/2024-2026.json (지방재정365, 공공누리 1유형). 한 해에 한 번(예산이 확정되면) 다시 굽는다.
  넣는 것 — 243곳마다 이름·시도·인구와 숫자 넷(세출예산 총액, 1인당 세출예산액(천원, 일반회계), 사회복지비중 %, 재정자립도[당초] %).
  순위·등급은 넣지 않는다 — 지자체에 딱지를 붙이지 않기로 했다(README 「기획 2차」).
*/
import fs from 'node:fs';
import path from 'node:path';

const from = process.argv[2];
if (!from) { console.error('local-finance 폴더를 주세요'); process.exit(1); }
const src = JSON.parse(fs.readFileSync(path.join(from, 'data/indicators/2024-2026.json'), 'utf8'));
const pick = (row, name, field) => row.지표?.[name]?.[field] ?? null;

const places = src.자치단체.map(row => {
  const sido = row.wa_laf_hg_nm;
  const wide = row.laf_cd === row.wa_laf_cd;
  return {
    c: row.laf_cd,
    // 광역은 「서울본청」 → 「서울 (시·도)」, 기초는 「서울광진구」 → 「광진구」
    n: wide ? `${sido} (시·도)` : row.laf_hg_nm.startsWith(sido) ? row.laf_hg_nm.slice(sido.length) : row.laf_hg_nm,
    s: sido,
    p: row.인구,
    b: pick(row, '세출예산 총액', '금액'),
    pp: pick(row, '1인당 세출예산액', '비율'),
    w: pick(row, '사회복지비중', '비율'),
    i: pick(row, '재정자립도[당초]', '비율'),
  };
});

const out = {
  _출처: `지방재정365 — local-finance 저장소 data/indicators/2024-2026.json(만든 날 ${src.만든날})에서 구움. 세출예산 ${src.예산연도}년 당초.`,
  year: Number(src.예산연도),
  places,
};
fs.writeFileSync(new URL('../game/data/local-finance.json', import.meta.url), `${JSON.stringify(out)}\n`);
console.log(`${places.length}곳 → game/data/local-finance.json`);
