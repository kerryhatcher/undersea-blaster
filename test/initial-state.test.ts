import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/game/state';

describe('initial game state', () => {
  it('starts paused', () => {
    const s = createInitialState(() => 800, () => 600);
    expect(s.paused).toBe(true);
  });
});


