// Core game update logic shared between web and desktop versions

import type { GameState, Bullet, Patty, UpgradePickup } from './state';
import type { UpdateContext, GameAudio } from './types';
import { circlesOverlap } from './systems/collision';
import { 
  getSpeedScale, 
  getSpawnIntervalMs, 
  shouldLevelUp, 
  applyLevelUp
} from './systems/difficulty';
import { 
  processUpgradePickups,
  shouldSpawnUpgrade,
  nextUpgradeScore
} from './systems/upgrades';

// Helper functions
function approximatePlayerRadius(pw: number, ph: number): number {
  return Math.min(pw, ph) * 0.36;
}

function spawnPatty(state: GameState, speedScale: number) {
  const w = state.w();
  const x = Math.random() * (w - 60) + 30;
  const vy = (80 + Math.random() * 40) * speedScale;
  const size = 48 + Math.random() * 30;
  state.patties.push({ x, y: -50, vx: 0, vy, size });
}

function shouldPlayAlternate(index: number): { play: boolean; nextIndex: number } {
  const play = index % 4 === 0;
  return { play, nextIndex: index + 1 };
}

function shouldRicochet(): boolean {
  return Math.random() < 0.7;
}

function randomRicochetVelocity(speed: number): { vx: number; vy: number } {
  const angle = (Math.random() - 0.5) * Math.PI * 0.8;
  return {
    vx: Math.sin(angle) * speed,
    vy: Math.cos(angle) * Math.abs(speed) * 0.6
  };
}

function getExplosionHitIndices(patties: Patty[], x: number, y: number, radius: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < patties.length; i++) {
    const p = patties[i];
    const pr = p.size * 0.46;
    if (circlesOverlap(x, y, radius, p.x, p.y, pr)) {
      indices.push(i);
    }
  }
  return indices;
}

// Main update function
export function updateGameLogic(
  state: GameState, 
  context: UpdateContext,
  audio: GameAudio
): void {
  const { dt, controls, platform, timestamp } = context;
  const nowMs = timestamp;
  
  // Handle pause state
  if (state.paused) {
    if (state.levelUpTimer > 0) {
      state.levelUpTimer = Math.max(0, state.levelUpTimer - dt);
    }
    return;
  }

  // Update all game systems
  updatePlayer(state, context);
  updateWeapons(state, context, audio);
  updateBullets(state, context);
  updateEnemies(state, context, timestamp);
  updateCollisions(state, context, audio);
  updateUpgrades(state, context);
  updateVisualEffects(state, context);
  updateTimers(state, context);
}

// Player movement and boundaries
export function updatePlayer(state: GameState, context: UpdateContext): void {
  const { dt, controls, platform } = context;
  const p = state.player;
  const w = platform.width;

  if (!state.gameOver) {
    if (controls.left && !controls.right) p.x -= p.speed * dt;
    if (controls.right && !controls.left) p.x += p.speed * dt;
  }
  
  p.x = Math.max(28, Math.min(w - 28, p.x));
  
  if (p.invuln > 0) p.invuln -= dt;
}

// Weapon firing logic
export function updateWeapons(state: GameState, context: UpdateContext, audio: GameAudio): void {
  const { dt, controls } = context;
  const p = state.player;
  
  state._cooldown -= dt;
  
  if (!state.gameOver && controls.fire && state._cooldown <= 0) {
    if (state.bazookaActive) {
      state._cooldown = 0.4;
      state.bullets.push({ 
        x: p.x, 
        y: p.y - 24, 
        vy: -260, 
        vx: 0, 
        r: 6, 
        kind: 'missile', 
        trail: [] 
      });
      const alt = shouldPlayAlternate(state.missileSoundIndex);
      state.missileSoundIndex = alt.nextIndex;
      if (alt.play && audio.playMissile) {
        audio.playMissile(state.missileSoundIndex);
      }
    } else if (state.shotgunActive) {
      state._cooldown = 0.36;
      const speed = -460;
      const spread = 0.28;
      const count = 5;
      for (let i = 0; i < count; i++) {
        const t = (i - (count - 1) / 2) / ((count - 1) / 2);
        const angle = t * (spread / 2);
        const vx = Math.sin(angle) * Math.abs(speed);
        const vy = Math.cos(angle) * speed;
        state.bullets.push({ 
          x: p.x, 
          y: p.y - 24, 
          vy, 
          vx, 
          r: 5, 
          kind: 'bubble' 
        });
      }
      if (audio.playShotgun) audio.playShotgun();
      else audio.playGunshot();
    } else if (state.laserActive) {
      state._cooldown = 0.06;
      const speed = -1200;
      const bouncy = shouldRicochet();
      state.laserShotIndex += 1;
      state.bullets.push({ 
        x: p.x, 
        y: p.y - 24, 
        vy: speed, 
        vx: 0, 
        r: 6, 
        kind: 'laser', 
        len: 24, 
        thickness: 4, 
        bouncy 
      });
      if (audio.playLaser) {
        audio.playLaser(state.laserShotIndex);
      } else {
        audio.playGunshot();
      }
    } else {
      state._cooldown = 0.18;
      state.bullets.push({ 
        x: p.x, 
        y: p.y - 24, 
        vy: -380, 
        vx: 0,
        r: 5, 
        kind: 'bubble' 
      });
      audio.playGunshot();
    }
  }
}

// Bullet position and trail updates
export function updateBullets(state: GameState, context: UpdateContext): void {
  const { dt, platform } = context;
  const w = platform.width;
  const h = platform.height;
  
  // Update positions and trails
  for (const b of state.bullets) {
    if (b.kind === 'missile') {
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y, life: 0.6 });
    }
    b.y += b.vy * dt;
    if (b.vx) b.x += b.vx * dt;
  }
  
  // Decay trails
  for (const b of state.bullets) {
    if (b.trail) {
      for (const seg of b.trail) seg.life -= dt;
      b.trail = b.trail.filter(seg => seg.life > 0);
      if (b.trail.length > 30) b.trail.splice(0, b.trail.length - 30);
    }
  }
  
  // Remove off-screen bullets
  state.bullets = state.bullets.filter(b => 
    b.y > -40 && b.y < h + 40 && 
    b.x > -40 && b.x < w + 40
  );
  
  if (state.bullets.length > 160) {
    state.bullets.splice(0, state.bullets.length - 160);
  }
}

// Enemy movement and spawning
export function updateEnemies(state: GameState, context: UpdateContext, nowMs: number): void {
  const { dt, platform } = context;
  const h = platform.height;
  
  const speedScale = getSpeedScale(state.level);
  
  if (nowMs - state.lastSpawn > getSpawnIntervalMs(state.level)) {
    spawnPatty(state, speedScale);
    state.lastSpawn = nowMs;
  }
  
  for (const a of state.patties) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
  }
  
  state.patties = state.patties.filter(a => a.y < h + 80);
  
  if (state.patties.length > 80) {
    state.patties.splice(0, state.patties.length - 80);
  }
}

// Collision detection and damage
export function updateCollisions(state: GameState, context: UpdateContext, audio: GameAudio): void {
  const { controls } = context;
  const p = state.player;
  
  // Bullet-enemy collisions
  for (let i = state.patties.length - 1; i >= 0; i--) {
    const a = state.patties[i];
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      const ar = a.size * 0.46;
      const br = b.r;
      
      if (circlesOverlap(a.x, a.y, ar, b.x, b.y, br)) {
        // Primary hit
        state.patties.splice(i, 1);
        state.bullets.splice(j, 1);
        state.score += 50;
        
        // Impact effect for regular bullets
        if (!state.bazookaActive && !state.shotgunActive && b.kind !== 'missile') {
          state.impacts.push({ x: a.x, y: a.y, life: 0, duration: 0.22 });
          if (audio.playHit) audio.playHit();
        }
        
        // Splash damage
        if (state.bazookaActive || b.kind === 'missile' || state.shotgunActive) {
          const splashR = (state.shotgunActive && b.kind !== 'missile') ? 28 : 60;
          const hitIdx = getExplosionHitIndices(state.patties, a.x, a.y, splashR);
          hitIdx.sort((x, y) => y - x);
          
          for (const idx of hitIdx) {
            if (idx >= 0 && idx < state.patties.length) {
              state.patties.splice(idx, 1);
              state.score += 50;
            }
          }
          
          state.explosions.push({ x: a.x, y: a.y, life: 0, duration: 0.35 });
          audio.playExplosion();
        }
        
        // Laser bounce
        if (b.kind === 'laser' && b.bouncy && !b.bounced) {
          const vel = randomRicochetVelocity(900);
          state.bullets.push({ 
            x: a.x, 
            y: a.y, 
            vy: vel.vy, 
            vx: vel.vx, 
            r: 6, 
            kind: 'laser', 
            len: 22, 
            thickness: 5, 
            bouncy: false, 
            bounced: true 
          });
        }
        break;
      }
    }
  }
  
  // Player-enemy collisions
  if (!state.gameOver) {
    for (let i = state.patties.length - 1; i >= 0; i--) {
      const a = state.patties[i];
      const playerR = approximatePlayerRadius(p.w, p.h);
      const ar = a.size * 0.46;
      
      if (circlesOverlap(a.x, a.y, ar, p.x, p.y, playerR)) {
        if (p.invuln <= 0) {
          p.hits += 1;
          p.invuln = 1.2;
          state.patties.splice(i, 1);
          
          if (p.hits >= p.maxHits) {
            state.gameOver = true;
            controls.left = controls.right = controls.fire = false;
            
            if (!state.deathExplosionPlayed) {
              state.deathExplosionPlayed = true;
              state.explosions.push({ x: p.x, y: p.y, life: 0, duration: 0.6 });
              state.explosions.push({ x: p.x + 18, y: p.y - 10, life: 0, duration: 0.5 });
              state.explosions.push({ x: p.x - 16, y: p.y + 6, life: 0, duration: 0.5 });
              audio.playExplosion();
            }
          }
        }
        break;
      }
    }
    
    // Ricochet laser can harm player
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (b.kind !== 'laser' || !b.bounced) continue;
      
      const playerR = approximatePlayerRadius(p.w, p.h);
      if (circlesOverlap(b.x, b.y, Math.max(6, b.thickness || 4), p.x, p.y, playerR)) {
        if (p.invuln <= 0) {
          p.hits += 1;
          p.invuln = 1.2;
          state.bullets.splice(j, 1);
          
          if (p.hits >= p.maxHits) {
            state.gameOver = true;
            controls.left = controls.right = controls.fire = false;
            
            if (!state.deathExplosionPlayed) {
              state.deathExplosionPlayed = true;
              state.explosions.push({ x: p.x, y: p.y, life: 0, duration: 0.6 });
              state.explosions.push({ x: p.x + 18, y: p.y - 10, life: 0, duration: 0.5 });
              state.explosions.push({ x: p.x - 16, y: p.y + 6, life: 0, duration: 0.5 });
              audio.playExplosion();
            }
          }
        }
        break;
      }
    }
  }
  
  // Level up check
  if (!state.gameOver && shouldLevelUp(state.score, state.scoreAtLevelStart)) {
    applyLevelUp(state);
    if (audio.playLevelUp) audio.playLevelUp();
  }
}

// Upgrade spawning and movement
export function updateUpgrades(state: GameState, context: UpdateContext): void {
  const { dt, platform } = context;
  const w = platform.width;
  const h = platform.height;
  
  // Spawn upgrades
  if (!state.gameOver && !state.bazookaActive && !state.shotgunActive && 
      !state.laserActive && state.bazookaCooldown <= 0 && state.upgrades.length === 0) {
    if (shouldSpawnUpgrade(state.score, state.nextUpgradeAt)) {
      const xCenter = w * (0.25 + Math.random() * 0.5);
      const spread = 240 + Math.random() * 240;
      const baseVy = 42 + Math.random() * 10;
      const jitter = () => (Math.random() * 2 - 1) * 18;
      
      state.upgrades.push({ 
        x: xCenter - spread, 
        y: -24, 
        r: 21, 
        vy: baseVy, 
        vx: jitter(), 
        kind: 'bazooka' 
      });
      state.upgrades.push({ 
        x: xCenter, 
        y: -24, 
        r: 21, 
        vy: baseVy, 
        vx: jitter(), 
        kind: 'laser' 
      });
      state.upgrades.push({ 
        x: xCenter + spread, 
        y: -24, 
        r: 21, 
        vy: baseVy, 
        vx: jitter(), 
        kind: 'shotgun' 
      });
      
      state.nextUpgradeAt = nextUpgradeScore(state.nextUpgradeAt);
    }
  }
  
  // Move upgrades
  for (const u of state.upgrades) {
    u.y += u.vy * dt;
    if (u.vx) u.x += u.vx * dt;
  }
  
  state.upgrades = state.upgrades.filter(u => u.y < h + 40);
  
  // Process pickups
  processUpgradePickups(state);
}

// Visual effects (explosions, impacts)
export function updateVisualEffects(state: GameState, context: UpdateContext): void {
  const { dt } = context;
  
  // Update explosions
  for (let i = state.explosions.length - 1; i >= 0; i--) {
    const ex = state.explosions[i];
    ex.life += dt;
    if (ex.life >= ex.duration) {
      state.explosions.splice(i, 1);
    }
  }
  
  if (state.explosions.length > 32) {
    state.explosions.splice(0, state.explosions.length - 32);
  }
  
  // Update impacts
  for (let i = state.impacts.length - 1; i >= 0; i--) {
    const im = state.impacts[i];
    im.life += dt;
    if (im.life >= im.duration) {
      state.impacts.splice(i, 1);
    }
  }
  
  if (state.impacts.length > 64) {
    state.impacts.splice(0, state.impacts.length - 64);
  }
}

// Weapon and game timers
export function updateTimers(state: GameState, context: UpdateContext): void {
  const { dt } = context;
  
  // Level-up overlay timer
  if (state.levelUpTimer > 0) {
    state.levelUpTimer = Math.max(0, state.levelUpTimer - dt);
  }
  
  // Weapon timers
  if (state.bazookaActive) {
    state.bazookaTimer -= dt;
    if (state.bazookaTimer <= 0) {
      state.bazookaActive = false;
      state.bazookaTimer = 0;
      state.bazookaCooldown = 10;
    }
  }
  
  if (state.shotgunActive) {
    state.shotgunTimer -= dt;
    if (state.shotgunTimer <= 0) {
      state.shotgunActive = false;
      state.shotgunTimer = 0;
      state.bazookaCooldown = 10;
    }
  }
  
  if (state.laserActive) {
    state.laserTimer -= dt;
    if (state.laserTimer <= 0) {
      state.laserActive = false;
      state.laserTimer = 0;
      state.bazookaCooldown = 10;
    }
  }
  
  // Shared cooldown
  if (!state.bazookaActive && !state.shotgunActive && !state.laserActive && state.bazookaCooldown > 0) {
    state.bazookaCooldown -= dt;
    if (state.bazookaCooldown < 0) state.bazookaCooldown = 0;
  }
}