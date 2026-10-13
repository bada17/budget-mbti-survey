/*
  게임 서버 부르기. 서버가 없거나 늦으면 조용히 undefined — 그때는 혼자 걷는 판으로 그대로 돈다.
  규칙은 api.ts 에 있다.
*/
import { CONTENT_VERSION } from './content';
import type { Stats, TableView } from './api';
import type { Pick } from './look';

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T | undefined> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 4000);
  try {
    const response = await fetch(`./api/game${path}`, {
      method, signal: abort.signal,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return response.ok ? await response.json() as T : undefined;
  } catch { return undefined; } finally { clearTimeout(timer); }
}

export const net = {
  stats: () => call<Stats>('GET', '/stats'),
  finish: (sessionId: string, answers: Record<string, number>) => call<Stats>('POST', '/finish', { sessionId, contentVersion: CONTENT_VERSION, answers }),
  newTable: () => call<{ code: string }>('POST', '/tables', {}),
  table: (code: string) => call<TableView>('GET', `/tables/${code}`),
  join: (code: string, member: { id: string; name: string; pick: Pick }) => call<TableView>('POST', `/tables/${code}/members`, member),
  progress: (code: string, id: string, patch: { stage?: number; type?: string }) => call<TableView>('POST', `/tables/${code}/members/${id}`, patch),
};
