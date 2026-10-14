/*
  마을 「마을 금고」 판의 「우리 동네 금고」 자료를 굽는다 — local-finance 저장소가 이미 만든 세입 판 자료를 빌려 오기만 한다.
  쓰는 법: node scripts/bake-local-revenue.mjs <local-finance 폴더>   → game/data/local-revenue.json
  원본: <local-finance>/site/data/revenue/<자치단체코드>.json (지방재정365 재원별 세입예산, 행정안전부 지방세통계연감 — 공공누리 1유형).
  넣는 것 — 곳마다 ① 금고가 무엇으로 채워지나(재원별 세입예산, 당초) ② 그 동네에서 걷힌 지방세가 세목·금고별로(시세·도세·구세…).
  ②는 시·도 본청엔 넣지 않는다 — 본청 자료는 시·도 전체가 아니라 본청 장부라 「동네에서 걷힌 것」 으로 읽히면 틀린다(취득세가 음수로 나온다).
  ②에서 과년도수입(지난해 못 걷은 것)·도시계획세(없어진 세금, 환급으로 음수)는 뺀다 — 「어떤 세금이 어느 금고로」 를 보려는 것이라.
  창고(game/data/local-finance.json)에 있는 곳만, 금고 채움이 창고와 같은 해인 곳만 — 없어진 군(양주군 등)의 옛 자료는 거른다.
  금액은 억 원(소수 첫째), 몫은 % 그대로. 순위·등급은 넣지 않는다(README 「기획 2차」).
*/
import fs from 'node:fs';
import path from 'node:path';

const from = process.argv[2];
if (!from) { console.error('local-finance 폴더를 주세요'); process.exit(1); }
const dir = path.join(from, 'site/data/revenue');
const finance = JSON.parse(fs.readFileSync(new URL('../game/data/local-finance.json', import.meta.url), 'utf8'));
const wanted = new Set(finance.places.map(p => p.c)), fy = finance.year;
const SKIP = /과년도수입|도시계획세/;
const eok = (won, unit = 1) => Math.round((won * unit) / 1e7) / 10;
const places = {};
let ty;
for (const file of fs.readdirSync(dir).filter(f => /^\d{7}\.json$/.test(f))) {
  const row = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const fund = row.재원예산;
  if (!wanted.has(row.laf_cd) || fund?.해 !== fy || !fund.칸?.length) continue;
  const place = { f: fund.칸.map(c => [c.이름, eok(c.금액), c.몫]) };
  const wide = row.laf_cd.endsWith('00000');
  const tax = row.세목;
  const rows = (tax?.칸 ?? []).filter(c => !SKIP.test(c.이름));
  if (!wide && rows.length && !tax.이곳것아님 && rows.every(c => c.금액 >= 0)) {
    ty ??= tax.해;
    const sum = rows.reduce((a, c) => a + c.금액, 0);
    place.t = rows.map(c => [c.이름, eok(c.금액, tax.천원단위 ? 1000 : 1), Math.round(c.금액 / sum * 1000) / 10]);
  }
  places[row.laf_cd] = place;
}
const out = {
  _출처: `local-finance 저장소 site/data/revenue 에서 구움(${new Date().toISOString().slice(0, 10)}). 금고 채움 = 지방재정365 재원별 세입예산 ${fy}년 당초, 걷힌 지방세 = 행정안전부 지방세통계연감 ${ty}년. 금액 억 원.`,
  fy, ty, places,
};
fs.writeFileSync(new URL('../game/data/local-revenue.json', import.meta.url), `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(places).length}곳 → game/data/local-revenue.json (금고 ${fy}, 세목 ${ty})`);
