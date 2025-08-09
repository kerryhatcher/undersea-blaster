import { defineConfig, Plugin } from 'vite';

function remoteConsolePlugin(): Plugin {
  return {
    name: 'remote-console',
    configureServer(server) {
      server.middlewares.use('/__log', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method Not Allowed'); }
        try {
          const chunks: Uint8Array[] = [];
          for await (const c of req) chunks.push(c as Uint8Array);
          const body = Buffer.concat(chunks).toString('utf8');
          const data = JSON.parse(body);
          const { level = 'log', message = '', args = [], url, ua, time } = data || {};
          const prefix = `[client:${level}]`;
          const ts = time ? new Date(time).toISOString() : new Date().toISOString();
          const where = url ? ` @ ${url}` : '';
          const meta = ua ? `\n  ua: ${ua}` : '';
          const formatted = `${prefix} ${ts}${where}\n  ${message}\n  args: ${JSON.stringify(args).slice(0, 2000)}${meta}`;
          const printer = (console as any)[level] || console.log;
          printer(formatted);
          res.statusCode = 204; res.end();
        } catch (e) {
          console.error('[client:log] failed to parse', e);
          res.statusCode = 400; res.end('Bad Request');
        }
      });
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/undersea-blaster/' : '/',
  plugins: [remoteConsolePlugin()],
  test: {
    environment: 'jsdom',
    reporters: 'default',
    include: ['test/**/*.test.ts'],
    exclude: ['tests-e2e/**'],
  },
});
