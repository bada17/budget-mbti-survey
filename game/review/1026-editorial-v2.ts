// 검토 주소에서만 실제 소개 페이지를 재배치한다. 글·로그인·출발·구독은 본편 그대로.
import '../main';

await new Promise<void>(resolve => {
  if (document.querySelector('.lp')) { resolve(); return; }
  const observer = new MutationObserver(() => {
    if (document.querySelector('.lp')) { observer.disconnect(); resolve(); }
  });
  observer.observe(document.body, { childList: true });
});
await import('./1026-editorial-v2.css');
const page = document.querySelector<HTMLElement>('.lp')!;
const heroText = page.querySelector('.lp-hero-words .lp-text')!;
page.querySelector('.lp-h1')!.textContent = heroText.textContent;
heroText.remove(); // 이름은 위 띠의 로고에 맡긴다. PAGE의 핵심 문장을 유일한 h1으로.

function empty(target: Element, className: string, label: string) {
  const slot = document.createElement('div');
  slot.className = `${className} lp-empty`;
  slot.textContent = label;
  slot.setAttribute('aria-hidden', 'true');
  target.replaceWith(slot);
}
/** 그림 자리 — Claude 가 찍어 둔 그림이 있으면 그림, 없으면 빈 칸. 클래스·비율은 같다(10-26). */
function art(target: Element, className: string, label: string, src: string) {
  if (!src) { empty(target, className, label); return; }
  const img = document.createElement('img');
  img.className = className; img.src = src; img.alt = ''; img.decoding = 'async';
  img.style.objectFit = 'cover';
  target.replaceWith(img);
}
art(page.querySelector('.lp-hero-art')!, 'lp-hero-art', '가로 마을 그림', 'landing/hero-wide.jpg'); // 14:5
// 문제 카드는 진짜 첫 카드가 올라온 뒤 — 개발판 예시 카드는 실제 동네 이름에 지어낸 금액이라 쓰지 않는다.
const features = [
  ['walk', '걷기 · 두 말풍선', 'landing/what-walk.jpg'], // 4:3
  ['budget', '우리 동네 돈 · 숫자와 막대', 'landing/what-money.jpg'], // 8:5, 지방재정 서울 종로구 「돈을 어디에 쓰나」
  ['cards', '함께 따져 볼 문제 카드', ''],
];
page.querySelectorAll<HTMLElement>('.lp-what').forEach((section, i) => {
  section.dataset.feature = features[i][0];
  art(section.querySelector('.lp-phone')!, 'lp-feature-art', features[i][1], features[i][2]);
});
// 글과 맞지 않는 첫 활동 사진도 Claude가 교체할 자리로 둔다.
empty(page.querySelector('.lp-story .lp-photo')!, 'lp-photo', '생활 가까운 동네 예산 · 사진');
document.body.dataset.preview = 'editorial-v2';
