// 홈페이지(action.or.kr) 공통 하단을 소개 페이지에 옮겨 넣는다 — 사용자 10-19 「하단은 홈페이지랑 같은 형태로」.
//
//   node scripts/port-footer.mjs
//
// 읽는 것 : 개편 저장소의 하단 원본 tools/parts/footer.html (공개 저장소라 깃허브에서 바로 받는다).
//           AH_FOOTER 에 파일 경로를 주면 그 파일을 읽는다(손으로 고친 것을 미리 볼 때).
// 쓰는 것 : game/landing-footer.html — landing.ts 가 ?raw 로 읽어 페이지 끝에 붙인다. 손으로 고치지 말 것.
// 손으로 베끼지 않는 까닭 — 하단은 홈페이지·상담소·독상·지방재정이 같이 쓴다(local-finance scripts/port_footer.py 와 같은 방식).
// 홈페이지 하단이 바뀌면 이걸 다시 돌리고 굽는다.
//
// 옮기면서 바꾸는 것(port_footer.py 와 같음)
//   1. 캠페이너스 전용 표시와 기본 푸터 감추는 규칙을 걷어낸다
//   2. 안쪽 주소(/34 · /37 · /8)를 action.or.kr 절대 주소로
//   3. 전체 폭으로 펼치는 음수 여백을 끈다(소개 페이지는 이미 전체 폭이라 가로 스크롤만 생긴다)
//   4. 게임 쪽 전역 규칙(h1~h3 에 둥근 글꼴)이 하단에 새지 않게 막는 줄을 덧붙인다
//   GmarketSans 는 부르지 않는다 — 이 사이트는 글꼴을 외부 서버에서 받지 않는다(ui.ts). 후원 띠 제목만 Pretendard 로 보인다.
import { readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://raw.githubusercontent.com/bada17/action-home-renewal/main/tools/parts/footer.html';
const OUT = new globalThis.URL('../game/landing-footer.html', import.meta.url);
const LINKS = { '/34': 'https://action.or.kr/34', '/37': 'https://action.or.kr/37', '/8': 'https://action.or.kr/8' };
const GUARD = `
  /* ── 여기부터 시민의 숲이 덧붙임(scripts/port-footer.mjs) — 게임의 h1~h3 둥근 글꼴이 하단에 새지 않게 ── */
  #ah-foot h2,#ah-foot h3{font-family:inherit}
  #ah-foot .give h2{font-family:GmarketSans,'Pretendard Variable',Pretendard,sans-serif}
</style>`;

const src = process.env.AH_FOOTER ? readFileSync(process.env.AH_FOOTER, 'utf8') : await (await fetch(URL)).text();
let body = src
  .replace(/<!-- CAMPAIGNERS:COMMON-FOOTER START -->\s*/, '')
  .replace(/<!-- 이 파일 전체를 캠페이너스 하단 반복 섹션[^>]*-->\s*/, '')
  .replace(/\s*<!-- CAMPAIGNERS:COMMON-FOOTER END -->\s*$/, '\n')
  .replace(/\s*\/\* 캠페이너스 기본 푸터는[^*]*\*\/\s*\n\s*#doz_footer_wrap[^\n]*\n/, '\n');
for (const [rel, abs] of Object.entries(LINKS)) body = body.replaceAll(`href="${rel}"`, `href="${abs}"`);
const left = [...new Set(body.match(/href="\/[^"]*"/g) ?? [])];
if (left.length) throw new Error(`안쪽 주소가 남았다 — LINKS 에 넣을 것: ${left.join(', ')}`);
const wide = /\s*\/\* 전체 폭으로 펼치기[^*]*\*\/\s*\n\s*margin-left:calc\([^\n]*\n\s*margin-right:calc\([^\n]*\n/;
if (!wide.test(body)) console.warn('  ! 전체 폭 음수 여백을 못 찾았다 — 원본이 바뀌었나 볼 것(가로 스크롤이 생길 수 있다)');
body = body.replace(wide, '\n');
if (body.split('</style>').length !== 2) throw new Error('원본의 <style> 이 하나가 아니다 — 막는 줄을 어디에 넣을지 다시 볼 것');
if (!body.includes('id="ah-foot"')) throw new Error('원본에 #ah-foot 이 없다 — 모양이 바뀌었다');
body = body.replace('</style>', GUARD);
writeFileSync(OUT, `<!-- 홈페이지 공통 하단 — scripts/port-footer.mjs 가 만든다. 손으로 고치지 말 것 -->\n${body.trim()}\n`);
console.log(`읽음: ${process.env.AH_FOOTER ?? URL}\n씀: game/landing-footer.html`);
