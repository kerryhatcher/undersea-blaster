import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
// @ts-ignore - Vite supports JSON imports
import pkg from './package.json';

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

const computedBase = process.env.BASE_PATH ?? (process.env.GITHUB_PAGES ? '/undersea-blaster/' : '/');
const computedVersion = process.env.VERSION_STRING || pkg.version || '0.0.0-dev';

export default defineConfig({
  base: computedBase,
  plugins: [
    remoteConsolePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      manifest: false
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(computedVersion),
  },
  test: {
    environment: 'jsdom',
    reporters: 'default',
    include: ['test/**/*.test.ts'],
    exclude: ['tests-e2e/**'],
  },
});
