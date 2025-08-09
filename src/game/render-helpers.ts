// Shared rendering helper functions

import type { Bullet, Explosion, Impact, UpgradePickup, GameState } from './state';
import type { RenderContext } from './types';

// Render a single bullet with type-specific visuals
export function renderBullet(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  if (bullet.kind === 'missile') {
    // Draw missile trail
    if (bullet.trail) {
      ctx.save();
      for (const seg of bullet.trail) {
        const alpha = Math.max(0, Math.min(1, seg.life / 0.6));
        // Smoke
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#bbbbbb';
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, 5, 0, Math.PI * 2);
        ctx.fill();
        // Fire core
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = '#ff7f00';
        ctx.beginPath();
        ctx.arc(seg.x, seg.y + 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Draw missile body
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    const angle = Math.atan2(bullet.vy, bullet.vx || 0) + Math.PI / 2;
    ctx.rotate(angle);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-3, -8, 6, 16);
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(-2, -10, 4, 4);
    ctx.fillStyle = '#ff7f00';
    ctx.fillRect(-4, 8, 8, 4);
    ctx.restore();
  } else if (bullet.kind === 'laser') {
    // Draw laser as a streak
    const len = bullet.len ?? 24;
    const thick = bullet.thickness ?? 4;
    ctx.save();
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x + (bullet.vx || 0) * 0.04, bullet.y - Math.abs(bullet.vy) * 0.04 - len);
    ctx.stroke();
    ctx.restore();
  } else {
    // Bubble bullet
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fillStyle = '#b3ecff';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Render all bullets
export function renderBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]) {
  for (const bullet of bullets) {
    renderBullet(ctx, bullet);
  }
}

// Render a single explosion
export function renderExplosion(ctx: CanvasRenderingContext2D, explosion: Explosion) {
  const t = Math.min(1, explosion.life / explosion.duration);
  const alpha = 1 - t;
  const baseR = 10 + t * 36;
  
  // Flash at start
  if (t < 0.12) {
    ctx.save();
    ctx.globalAlpha = 0.9 * (0.12 - t) / 0.12;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Puffs around center
  const offsets = [
    { x: 0, y: 0, r: 1 },
    { x: -8, y: -6, r: 0.7 },
    { x: 10, y: -4, r: 0.6 },
    { x: -6, y: 8, r: 0.65 },
    { x: 7, y: 6, r: 0.55 }
  ];
  
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  for (const off of offsets) {
    const puffR = baseR * off.r;
    const grad = ctx.createRadialGradient(
      explosion.x + off.x, explosion.y + off.y, 0,
      explosion.x + off.x, explosion.y + off.y, puffR
    );
    grad.addColorStop(0, '#fff4e6');
    grad.addColorStop(0.4, '#ffc994');
    grad.addColorStop(1, 'rgba(255,138,61,0.1)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(explosion.x + off.x, explosion.y + off.y, puffR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  
  // Shockwave ring
  if (t < 0.5) {
    const ringR = t * 80;
    ctx.save();
    ctx.globalAlpha = (1 - t * 2) * 0.4;
    const grad = ctx.createRadialGradient(
      explosion.x, explosion.y, ringR * 0.9,
      explosion.x, explosion.y, ringR
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Render all explosions
export function renderExplosions(ctx: CanvasRenderingContext2D, explosions: Explosion[]) {
  for (const explosion of explosions) {
    renderExplosion(ctx, explosion);
  }
}

// Render impact effect (small puff)
export function renderImpact(ctx: CanvasRenderingContext2D, impact: Impact) {
  const t = Math.min(1, impact.life / impact.duration);
  const alpha = 1 - t;
  const r = 6 + t * 10;
  
  ctx.save();
  ctx.globalAlpha = 0.7 * alpha;
  ctx.fillStyle = '#d0f0ff';
  ctx.beginPath();
  ctx.arc(impact.x, impact.y, r, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = 0.6 * alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(impact.x + 4, impact.y - 2, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Render all impacts
export function renderImpacts(ctx: CanvasRenderingContext2D, impacts: Impact[]) {
  for (const impact of impacts) {
    renderImpact(ctx, impact);
  }
}

// Render upgrade bubble with weapon icon
export function renderUpgrade(ctx: CanvasRenderingContext2D, upgrade: UpgradePickup) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(upgrade.x, upgrade.y, upgrade.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(179,236,255,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.translate(upgrade.x, upgrade.y);
  if (upgrade.kind === 'bazooka') {
    // Bazooka icon
    ctx.rotate(-0.2);
    ctx.fillStyle = '#2f2f2f';
    ctx.fillRect(-7, -3, 20, 6);
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(-12, -2, 9, 4);
  } else if (upgrade.kind === 'shotgun') {
    // Shotgun icon - 5 barrels
    ctx.fillStyle = '#2e2e2e';
    ctx.fillRect(-12, -3, 24, 6);
    ctx.fillStyle = '#c0c0c0';
    for (let i = 0; i < 5; i++) {
      const bx = -12 + i * 6;
      ctx.fillRect(bx, -4, 2.5, 8);
    }
  } else if (upgrade.kind === 'laser') {
    // Laser icon - glowing rod
    const grad = ctx.createLinearGradient(0, -10, 0, 10);
    grad.addColorStop(0, '#9ff1ff');
    grad.addColorStop(1, '#56d0ff');
    ctx.fillStyle = grad;
    ctx.fillRect(-3, -10, 6, 20);
    // Glow effect
    ctx.shadowColor = '#56d0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(-2, -8, 4, 16);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

// Render all upgrades
export function renderUpgrades(ctx: CanvasRenderingContext2D, upgrades: UpgradePickup[]) {
  for (const upgrade of upgrades) {
    renderUpgrade(ctx, upgrade);
  }
}

// Render background gradient
export function renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#0e6ab0');
  g.addColorStop(1, '#083a66');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

// Render animated background bubbles
export function renderBackgroundBubbles(ctx: CanvasRenderingContext2D, width: number, height: number, timestamp: number) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 30; i++) {
    const x = (i * 97 % width);
    const y = (i * 173 + ((timestamp || 0) * 0.03) % height) % height;
    ctx.beginPath();
    ctx.arc(x, y, (i % 7) + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#d0f0ff';
    ctx.fill();
  }
  ctx.restore();
}

// Render health hearts
export function renderHealthHUD(ctx: CanvasRenderingContext2D, x: number, y: number, current: number, max: number) {
  const r = 6;
  for (let i = 0; i < max; i++) {
    ctx.beginPath();
    ctx.arc(x - i * 18, y, r, 0, Math.PI * 2);
    ctx.fillStyle = (i < current) ? '#b3ecff' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Render score and level
export function renderScoreHUD(ctx: CanvasRenderingContext2D, score: number, level: number) {
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(String(score), 12, 34);
  ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(`Lv ${level}`, 12, 56);
}

// Render weapon timer bar
export function renderWeaponTimer(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  progress: number, // 0-1
  color: string,
  label: string
) {
  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x, y, width, height);
  
  // Progress bar
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * progress, height);
  
  // Border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Label
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px system-ui';
  ctx.fillText(label, x + 4, y + height - 4);
}

// Render active weapon HUD
export function renderWeaponHUD(ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number) {
  if (state.bazookaActive && state.bazookaTimer > 0) {
    const progress = state.bazookaTimer / 10; // Assuming 10 second duration
    renderWeaponTimer(ctx, x, y, 100, 20, progress, '#ff6b6b', 'BAZOOKA');
  } else if (state.shotgunActive && state.shotgunTimer > 0) {
    const progress = state.shotgunTimer / 10;
    renderWeaponTimer(ctx, x, y, 100, 20, progress, '#4caf50', 'SHOTGUN');
  } else if (state.laserActive && state.laserTimer > 0) {
    const progress = state.laserTimer / 10;
    renderWeaponTimer(ctx, x, y, 100, 20, progress, '#56d0ff', 'LASER');
  }
}