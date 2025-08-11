const isDev = (import.meta as any).env?.DEV;

let debugEnabled = false;
try {
  const params = new URLSearchParams(location.search);
  debugEnabled = params.get('debug') === '1' || localStorage.getItem('ub_debug') === '1';
} catch {}

const lastByKey = new Map<string, number>();

export function setDebugEnabled(on: boolean) {
  debugEnabled = !!on;
  try { localStorage.setItem('ub_debug', on ? '1' : '0'); } catch {}
}

export function isDebug(): boolean { return !!isDev && !!debugEnabled; }

export function debugLog(event: string, data?: unknown) {
  if (!isDebug()) return;
  try { console.log(`[DBG] ${event}`, data ?? ''); } catch {}
}

export function debugLogThrottled(key: string, event: string, data: unknown, intervalMs = 150) {
  if (!isDebug()) return;
  const now = performance.now();
  const last = lastByKey.get(key) || 0;
  if (now - last >= intervalMs) {
    lastByKey.set(key, now);
    debugLog(event, data);
  }
}

export function controlsToString(c: { left:boolean; right:boolean; up?:boolean; down?:boolean; fire?:boolean }): string {
  const bit = (b: boolean | undefined) => (b ? '1' : '0');
  return `L:${bit(c.left)} R:${bit(c.right)} U:${bit(c.up)} D:${bit(c.down)} F:${bit(c.fire)}`;
}


