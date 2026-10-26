/** 지방재정365 감액 원본을 이 저장소에 고정한다. 서버·외부 사이트 없이 주점판에서도 읽는다. */
type RawCuts = { 받은날: string; 출처: string; 건: [number, string, number, string, string, number][]; 이름: Record<string, [string, string]>; 지금번호: Record<string, string> };
export const CUT_ARTICLE = {
  title: '춘천시 행정위반에 교부금 39억원 깎였다', publisher: '강원도민일보', date: '2026-10-20',
  url: 'https://www.kado.net/news/articleView.html?idxno=2079091',
};
/** 2020년부터만 보인다(사용자 10-26 「2020년 이후 자료로」 — 원본은 2012년부터지만 오래된 일은 지금 지방정부와 멀다). 원본 파일은 그대로 둔다. */
export const CUT_FROM = 2020;
export type Cut = { year: number; code: string; name: string; amount: number; reason: string; project: string; link?: string };
export async function loadCuts() {
  const raw = (await import('./data/cuts.json')).default as unknown as RawCuts;
  return { received: raw.받은날, source: raw.출처, rows: raw.건.filter(([year]) => year >= CUT_FROM).map(([year, code, amount, reason, project]): Cut => ({
    year, code: raw.지금번호[code] ?? code, name: raw.이름[code]?.[0] ?? code, amount, reason, project,
    ...(year === 2026 && code === '4211000' && amount === 3909000000 && project === '실시협약과 다르게 생태탐방로 조성사업 추진 부적정 등' ? { link: CUT_ARTICLE.url } : {}),
  })) };
}
const compact = (text: string) => text.replace(/\s/g, '').toLocaleLowerCase();
export function findCuts(data: Awaited<ReturnType<typeof loadCuts>>, query = '', region?: string) {
  const q = compact(query);
  return data.rows.filter(row => !q || compact(row.name + row.project).includes(q))
    .sort((a, b) => Number(b.code === region) - Number(a.code === region) || b.amount - a.amount || b.year - a.year);
}
export const cutMoney = (amount: number) => amount >= 1e8 ? (amount / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 4 }) + '억 원' : amount.toLocaleString('ko-KR') + '원';
