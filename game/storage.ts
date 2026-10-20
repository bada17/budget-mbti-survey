// 관리자 점검은 페이지를 닫으면 사라지는 저장소를 쓴다. 실제 계정·시민증을 건드리지 않는다.
let inspection: Map<string, string> | undefined;
export function useInspectionStorage() { inspection = new Map(); }
export const isInspectionMode = () => inspection !== undefined;
export const gameStorage = {
  getItem(key: string): string | null { return inspection ? inspection.get(key) ?? null : localStorage.getItem(key); },
  setItem(key: string, value: string) { if (inspection) inspection.set(key, value); else localStorage.setItem(key, value); },
  removeItem(key: string) { if (inspection) inspection.delete(key); else localStorage.removeItem(key); },
};
