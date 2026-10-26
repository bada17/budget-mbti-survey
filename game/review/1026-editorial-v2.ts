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
empty(page.querySelector('.lp-hero-art')!, 'lp-hero-art', '가로 마을 그림');
const features = [
  ['walk', '걷기 · 두 말풍선'],
  ['budget', '우리 동네 돈 · 숫자와 막대'],
  ['cards', '함께 따져 볼 문제 카드'],
];
page.querySelectorAll<HTMLElement>('.lp-what').forEach((section, i) => {
  section.dataset.feature = features[i][0];
  empty(section.querySelector('.lp-phone')!, 'lp-feature-art', features[i][1]);
});
// 글과 맞지 않는 첫 활동 사진도 Claude가 교체할 자리로 둔다.
empty(page.querySelector('.lp-story .lp-photo')!, 'lp-photo', '생활 가까운 동네 예산 · 사진');
document.body.dataset.preview = 'editorial-v2';
