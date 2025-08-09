export type Bullet = { x: number; y: number; vy: number; r: number };
export type Patty = { x: number; y: number; vx: number; vy: number; size: number };

export type Player = {
  x: number;
  y: number;
  speed: number;
  w: number;
  h: number;
  hits: number;
  maxHits: number;
  invuln: number;
};

export type GameState = {
  w: () => number;
  h: () => number;
  player: Player;
  bullets: Bullet[];
  patties: Patty[];
  score: number;
  level: number;
  scoreAtLevelStart: number;
  levelUpTimer: number;
  lastSpawn: number;
  _cooldown: number;
  gameOver: boolean;
  paused: boolean;
};

export function createInitialState(getW: () => number, getH: () => number): GameState {
  return {
    w: getW,
    h: getH,
    player: { x: 0, y: 0, speed: 260, w: 56, h: 56, hits: 0, maxHits: 5, invuln: 0 },
    bullets: [],
    patties: [],
    score: 0,
    level: 1,
    scoreAtLevelStart: 0,
    levelUpTimer: 0,
    lastSpawn: 0,
    _cooldown: 0,
    gameOver: false,
    paused: false,
  };
}

export function resetPlayer(state: GameState) {
  state.player.x = state.w() * 0.5;
  state.player.y = state.h() * 0.78;
}

export function hardReset(state: GameState) {
  state.bullets.length = 0;
  state.patties.length = 0;
  state.score = 0;
  state.level = 1;
  state.scoreAtLevelStart = 0;
  state.levelUpTimer = 0;
  state.lastSpawn = 0;
  state._cooldown = 0;
  state.gameOver = false;
  state.paused = false;
  state.player.hits = 0;
  state.player.invuln = 0;
  resetPlayer(state);
}
