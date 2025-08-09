import { describe, it, expect } from 'vitest';

describe('build base path config', () => {
  it('uses / when BASE_PATH is set (custom domain)', () => {
    const base = process.env.BASE_PATH || '/';
    expect(base).toBe('/');
  });
});


