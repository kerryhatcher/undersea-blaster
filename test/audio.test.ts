import { describe, it, expect } from 'vitest';
import { shouldPlayAlternate } from '../src/game/systems/audio';

describe('audio alternation', () => {
  it('plays on even indices and skips on odd', () => {
    let idx = 0;
    let r = shouldPlayAlternate(idx);
    expect(r.play).toBe(true);
    idx = r.nextIndex;
    r = shouldPlayAlternate(idx);
    expect(r.play).toBe(false);
    idx = r.nextIndex;
    r = shouldPlayAlternate(idx);
    expect(r.play).toBe(true);
  });
});


