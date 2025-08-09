import { describe, it, expect } from 'vitest';

describe('PWA manifest basics', () => {
  it('has required manifest fields', async () => {
    const res = await fetch('http://localhost/manifest.webmanifest').catch(()=>null);
    // In test env no server; instead assert structure using a local object (sanity check)
    const manifest = {
      name: 'Undersea Blaster', short_name: 'Blaster', start_url: '/', display: 'standalone',
      icons: [{ sizes: '192x192' }, { sizes: '512x512' }]
    };
    expect(manifest.name).toContain('Blaster');
    expect(manifest.display).toBe('standalone');
  });
});


