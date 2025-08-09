const isDev = import.meta.env?.DEV;

function postLog(payload: Record<string, unknown>) {
  if (!isDev) return;
  try {
    navigator.sendBeacon?.('/__log', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      || fetch('/__log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
  } catch {}
}

function wrapConsole(level: 'log'|'info'|'warn'|'error') {
  const orig = console[level];
  console[level] = function (...args: unknown[]) {
    try {
      postLog({ level, message: String(args[0] ?? ''), args: args.slice(1), url: location.href, ua: navigator.userAgent, time: Date.now() });
    } catch {}
    return orig.apply(console, args as any);
  } as any;
}

export function installClientLogger() {
  if (!isDev) return;
  try {
    wrapConsole('log');
    wrapConsole('info');
    wrapConsole('warn');
    wrapConsole('error');

    window.addEventListener('error', (e) => {
      postLog({ level: 'error', message: e.message, args: [{ filename: e.filename, lineno: e.lineno, colno: e.colno, stack: (e.error && (e.error as any).stack) || '' }], url: location.href, ua: navigator.userAgent, time: Date.now() });
    });
    window.addEventListener('unhandledrejection', (e) => {
      postLog({ level: 'error', message: 'Unhandled promise rejection', args: [{ reason: (e as any).reason }], url: location.href, ua: navigator.userAgent, time: Date.now() });
    });
  } catch {}
}
