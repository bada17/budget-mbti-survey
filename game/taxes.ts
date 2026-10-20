/*
  세금 보는 곳 — 세금 도감(사용자 10-14 「금액 입력은 별로, 어떤 세금들이 있는지, 그게 어떤 돈이랑 연계되는지」).
  생활 장면마다 붙는 세금과, 그 세금이 들어가는 금고(나라·시·도·시·군·구·교육청), 나라 금고에서 다시 내려오는 길.
  금액을 묻지 않는다. 숫자는 법이 정한 비율·정액만 — 확인한 곳:
  · 세목 나눔(도세/시·군세, 특별·광역시세/구세): 지방세기본법 제8조, 여수시 「2026 알아두면 유익한 지방세 안내」 3쪽.
    실제 자치구 자료(지방세통계연감 2024, 서울 마포구)도 시세=취득·지방소득·주민·자동차·지방교육·담배, 구세=재산·등록면허로 같다.
  · 지방소비세 = 부가가치세의 25.3%(지방세법 제69조, 1000분의 253), 일부는 시·군·구 몫(지방세기본법 제11조의2).
  · 지방소득세 세율 = 소득세 세율의 10분의 1(과세표준 1,400만 원 이하 0.6% ↔ 소득세 6%). 담배소비세 궐련 20개비 1,007원,
    지방교육세 = 담배소비세의 43.99%·재산세의 20%, 주행분 자동차세 = 교통·에너지·환경세의 26%, 주민세 개인분 1만 원 이하(지방세법, 위 안내 4~5쪽).
  · 서울 재산세 공동과세: 구 재산세의 절반을 특별시분으로 걷어 25개 구에 똑같이 나눈다(지방세기본법 제9조).
  · 지방교부세 = 내국세의 19.24% + 종합부동산세 전부 + 담배 개별소비세의 45%(지방교부세법 제4조).
    지방교육재정교부금 = 내국세의 20.79% + 교육세 일부(지방교육재정교부금법 제3조).
  법이 바뀌면 여기만 고친다. 장면·문구를 더하려면 SCENES 에 한 줄.
*/

export type Vault = 'nara' | 'sido' | 'sigungu' | 'edu';
export const VAULTS: Record<Vault, { name: string; color: string }> = {
  nara: { name: '나라', color: '#6a9fc9' },
  sido: { name: '시·도', color: '#79a96a' },
  sigungu: { name: '시·군·구', color: '#e07a5f' },
  edu: { name: '교육청', color: '#d9a53c' },
};

/** 세금 하나 — 이름, 한 줄, 들어가는 금고(몫이 갈리면 여럿). */
export type Tax = { name: string; line: string; to: { vault: Vault; share?: string; note?: string }[] };
export type Scene = { id: string; icon: string; title: string; taxes: Tax[] };

const LOCAL = '특별·광역시에 살면 시 금고로';

export const SCENES: Scene[] = [
  {
    id: 'coffee', icon: '☕', title: '커피 한 잔 살 때',
    taxes: [{
      name: '부가가치세', line: '물건값·밥값에 11분의 1쯤 들어 있어요.',
      to: [{ vault: 'nara', share: '74.7%' }, { vault: 'sido', share: '25.3%', note: '지방소비세 — 일부는 시·군·구로' }],
    }],
  },
  {
    id: 'pay', icon: '💼', title: '월급 받을 때',
    taxes: [
      { name: '소득세', line: '버는 만큼 다르게, 많이 벌수록 높은 비율로.', to: [{ vault: 'nara' }] },
      { name: '지방소득세', line: '소득세의 10분의 1만큼 같이 떼요.', to: [{ vault: 'sigungu', note: LOCAL }] },
    ],
  },
  {
    id: 'home', icon: '🏠', title: '집이 있으면',
    taxes: [
      { name: '재산세', line: '7월·9월에 나눠 내요.', to: [{ vault: 'sigungu', note: '서울은 절반을 시가 모아 25개 구에 똑같이 나눠요' }] },
      { name: '지방교육세', line: '재산세의 20%가 같이 붙어요.', to: [{ vault: 'edu', note: '시·도를 거쳐 교육청으로' }] },
      { name: '종합부동산세', line: '비싼 집·땅이 있으면 12월에.', to: [{ vault: 'nara', note: '나라가 걷지만 전부 지방에 나눠요(부동산교부세)' }] },
    ],
  },
  {
    id: 'buy', icon: '🔑', title: '집을 살 때',
    taxes: [
      { name: '취득세', line: '샀을 때 한 번, 60일 안에.', to: [{ vault: 'sido' }] },
      { name: '지방교육세', line: '취득세에 조금 더 붙어요.', to: [{ vault: 'edu', note: '시·도를 거쳐 교육청으로' }] },
    ],
  },
  {
    id: 'car', icon: '🚗', title: '차가 있으면',
    taxes: [{ name: '자동차세', line: '6월·12월, 배기량만큼.', to: [{ vault: 'sigungu', note: LOCAL }] }],
  },
  {
    id: 'fuel', icon: '⛽', title: '기름 넣을 때',
    taxes: [
      { name: '교통·에너지·환경세', line: '기름값에 들어 있어요.', to: [{ vault: 'nara' }] },
      { name: '자동차세(주행분)', line: '위 세금의 26%만큼 더 붙어요.', to: [{ vault: 'sigungu', note: LOCAL }] },
    ],
  },
  {
    id: 'smoke', icon: '🚬', title: '담배 한 갑 살 때',
    taxes: [
      { name: '담배소비세', line: '한 갑(20개비)에 1,007원.', to: [{ vault: 'sigungu', note: LOCAL }] },
      { name: '지방교육세', line: '담배소비세의 43.99%만큼.', to: [{ vault: 'edu', note: '시·도를 거쳐 교육청으로' }] },
      { name: '개별소비세', line: '나라 세금이에요.', to: [{ vault: 'nara', note: '그중 45%는 소방안전교부세로 지방에' }] },
    ],
  },
  {
    id: 'resident', icon: '📮', title: '8월, 동네에 사는 값',
    taxes: [{ name: '주민세(개인분)', line: '세대주가 한 해 1만 원 넘지 않게.', to: [{ vault: 'sigungu', note: LOCAL }] }],
  },
];

/** 나라·시·도 금고에서 다시 내려오는 길 — 동네 금고의 「밖에서 온 돈」 칸과 이어진다(KIND 의 같은 이름). */
export const FLOWS: { from: Vault; to: Vault[]; name: string; line: string }[] = [
  { from: 'nara', to: ['sido', 'sigungu'], name: '지방교부세', line: '나라 세금(내국세)의 19.24%, 종합부동산세 전부, 담배 개별소비세의 45%. 살림이 빠듯한 곳에 더 가요.' },
  { from: 'nara', to: ['sido', 'sigungu'], name: '보조금', line: '나라·시·도가 일을 맡기며 쓰임을 정해 주는 돈.' },
  { from: 'sido', to: ['sigungu'], name: '조정교부금', line: '시·도가 걷은 세금 일부를 시·군·구에 나눠요.' },
  { from: 'nara', to: ['edu'], name: '교육재정교부금', line: '나라 세금(내국세)의 20.79%와 교육세 일부. 학교 살림이 돼요.' },
];
