import { gameStorage } from './storage';

const KEY = 'budget-game-pending-finish';
type Pending = { sessionId: string; answers: Record<string, number> };
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** 답을 잃지 않고 재전송한다. 마을 진입과 온라인 복구가 겹쳐도 한 번만 보낸다. */
export function createCompletionQueue<T>(send: (id: string, answers: Record<string, number>) => Promise<T | undefined>, storage: StorageLike = gameStorage) {
  let pending: Pending[] = [];
  try {
    const raw = JSON.parse(storage.getItem(KEY) ?? 'null');
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    pending = items.filter(item => typeof item?.sessionId === 'string' && item.answers && typeof item.answers === 'object').slice(0, 50);
  } catch { /* 막힌 저장소 */ }
  let flight: Promise<{ sessionId: string; value: T } | undefined> | undefined;
  let saved: { sessionId: string; value: T } | undefined;
  const persist = () => {
    try { if (pending.length) storage.setItem(KEY, JSON.stringify(pending)); else storage.removeItem(KEY); } catch { /* 이번 페이지에서는 재시도 가능 */ }
  };
  const queue = {
    enqueue(sessionId: string, answers: Record<string, number>) {
      if (pending.some(item => item.sessionId === sessionId)) return true;
      if (pending.length >= 50) return false;
      pending.push({ sessionId, answers: { ...answers } }); saved = undefined; persist();
      return true;
    },
    flush(): Promise<{ sessionId: string; value: T } | undefined> {
      if (flight) return flight;
      if (!pending.length) return Promise.resolve(saved);
      flight = (async () => {
        try {
          let result: { sessionId: string; value: T } | undefined;
          while (pending.length) {
            const item = pending[0];
            const value = await send(item.sessionId, item.answers);
            if (value === undefined) break;
            result = { sessionId: item.sessionId, value }; saved = result;
            pending.shift(); persist();
          }
          return result;
        } finally { flight = undefined; }
      })();
      return flight;
    },
  };
  return queue;
}
