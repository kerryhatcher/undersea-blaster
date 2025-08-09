/**
 * Desktop-enhanced version of the game
 * Integrates Electron features while maintaining web compatibility
 */

import { createInitialState, hardReset, resetPlayer, GameState } from './game/state';
import { getSpawnIntervalMs, getSpeedScale, shouldLevelUp, applyLevelUp } from './game/systems/difficulty';
import { circlesOverlap, approximatePlayerRadius } from './game/systems/collision';
import { nextUpgradeScore, shouldSpawnUpgrade, getExplosionHitIndices, processUpgradePickups } from './game/systems/upgrades';
import { installClientLogger } from './dev/client-logger';
import { installAudioActivation, playGunshot, playMissile, playExplosion, startAmbience, stopAmbience } from './game/audio';
import { desktopIntegration, isElectron } from './game/desktop-integration';
import { InputManager } from './game/input-manager';

// Install client logger
installClientLogger();

// Get canvas and context
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const pauseLinkEl = document.getElementById('pause-link') as HTMLAnchorElement | null;

// Initialize input manager
const inputManager = new InputManager(canvas);

// Focus game on start
const focusGame = () => canvas.focus({ preventScroll: true });
setTimeout(focusGame, 0);
canvas.addEventListener('pointerdown', focusGame);
canvas.addEventListener('mouseenter', focusGame);

// Canvas resize handler
function resize() {
  const dpr = Math.max(1, (window.devicePixelRatio || 1));
  canvas.width  = Math.floor(innerWidth  * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

// Audio setup
installAudioActivation(canvas);
startAmbience();

// SVG assets
function svgToImage(svg: string) {
  const img = new Image();
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  return img;
}

const svgSponge = `<?xml version='1.0'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>
    <defs>
      <radialGradient id='g' cx='50%' cy='40%' r='70%'>
        <stop offset='0%' stop-color='#ffd94d'/>
        <stop offset='100%' stop-color='#f2b800'/>
      </radialGradient>
    </defs>
    <rect x='6' y='10' rx='12' ry='12' width='68' height='58' fill='url(#g)' stroke='#9c7a00' stroke-width='3'/>
    <g fill='#d89e00' opacity='0.6'>
      <circle cx='18' cy='24' r='3'/>
      <circle cx='32' cy='18' r='2.5'/>
      <circle cx='52' cy='22' r='3'/>
      <circle cx='44' cy='34' r='2.8'/>
      <circle cx='22' cy='42' r='3'/>
      <circle cx='60' cy='46' r='2.4'/>
      <circle cx='36' cy='54' r='2.8'/>
    </g>
  </svg>`;

const svgPatty = `<?xml version='1.0'?>
  <svg xmlns='http://www.w3.org/2000/svg' width='72' height='56' viewBox='0 0 72 56'>
    <g>
      <ellipse cx='36' cy='16' rx='32' ry='14' fill='#f9c46b' stroke='#b67a2b' stroke-width='3'/>
      <rect x='8' y='24' width='56' height='10' rx='5' fill='#6d3b19'/>
      <ellipse cx='36' cy='40' rx='32' ry='12' fill='#eaa84f' stroke='#a36724' stroke-width='3'/>
      <path d='M10 28 Q 20 35 30 28 T 62 28' stroke='#3a8f2e' stroke-width='6' fill='none'/>
    </g>
  </svg>`;

const playerImg = svgToImage(svgSponge);
const pattyImg  = svgToImage(svgPatty);

// Initialize game state
const state: GameState = createInitialState(() => canvas.clientWidth, () => canvas.clientHeight);
resetPlayer(state);

// Set up desktop integration if running in Electron
if (isElectron()) {
  console.log('Running in Electron - Desktop features enabled');
  
  // Set game state reference
  desktopIntegration.setGameState(state);
  
  // Register desktop callbacks
  desktopIntegration.onPauseToggle(() => {
    state.paused = !state.paused;
    inputManager.setPaused(state.paused);
    console.log('Game paused:', state.paused);
  });
  
  desktopIntegration.onNewGame(() => {
    hardReset(state);
    console.log('New game started');
  });
  
  desktopIntegration.onSave(() => {
    console.log('Game save triggered');
  });
}

// Main game loop
let last = performance.now();
function loop(now: number){
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt, now);
  render();
  requestAnimationFrame(loop);
}

// Update game logic
function update(dt: number, now: number){
  // Get input state
  const controls = inputManager.getState();
  
  // Handle desktop shortcuts
  if (isElectron()) {
    if (inputManager.justPressed('screenshot')) {
      desktopIntegration.takeScreenshot();
    }
    if (inputManager.justPressed('fullscreen')) {
      desktopIntegration.toggleFullscreen();
    }
    if (inputManager.justPressed('quickSave')) {
      desktopIntegration.saveGame();
    }
    if (inputManager.justPressed('quickLoad')) {
      desktopIntegration.loadGame();
    }
  }
  
  // Handle pause
  if (inputManager.justPressed('pause')) {
    state.paused = !state.paused;
    inputManager.setPaused(state.paused);
  }
  
  // Handle new game/restart
  if (state.gameOver && inputManager.justPressed('newGame')) {
    hardReset(state);
  }
  
  // Update previous input state
  inputManager.updatePreviousState();
  
  // Skip update if paused
  if (state.paused) return;
  
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  
  // Player movement
  const p = state;
  if (!state.gameOver) {
    if (controls.left && !controls.right) p.playerX -= p.speed * dt;
    if (controls.right && !controls.left) p.playerX += p.speed * dt;
  }
  p.playerX = Math.max(28, Math.min(w-28, p.playerX));
  
  // Fire bullets
  state._cooldown -= dt;
  if (!state.gameOver) {
    if (controls.fire && state._cooldown <= 0){
      if (state.bazookaActive) {
        state._cooldown = 0.4; // fire slower
        state.bullets.push(
          { x:p.playerX-4, y:p.playerY-10, vx:0, vy:-500 },
          { x:p.playerX+4, y:p.playerY-10, vx:0, vy:-500 }
        );
        playMissile();
      } else {
        state._cooldown = 0.2;
        state.bullets.push({ x:p.playerX, y:p.playerY-10, vx:0, vy:-450 });
        playGunshot();
      }
    }
  }
  
  // Update bullets
  for (let i = state.bullets.length - 1; i >= 0; i--){
    const b = state.bullets[i];
    b.y += b.vy * dt;
    b.x += b.vx * dt;
    if (b.y < -20 || b.x < -20 || b.x > w + 20){
      state.bullets.splice(i, 1);
    }
  }
  
  // Spawn enemies
  state._enemyTimer -= dt;
  if (state._enemyTimer <= 0 && state.enemies.length < 12 && !state.gameOver){
    const spawnMs = getSpawnIntervalMs(state.level, state.score);
    state._enemyTimer = spawnMs / 1000;
    
    const startX = 20 + Math.random() * (w - 40);
    const speedScale = getSpeedScale(state.level, state.score);
    const vx = (Math.random() - 0.5) * 25 * speedScale;
    const vy = (30 + Math.random() * 40) * speedScale;
    const radius = 15 + Math.random() * 10;
    
    state.enemies.push({ x:startX, y:-30, vx, vy, radius, health:1 });
  }
  
  // Update enemies
  for (let i = state.enemies.length - 1; i >= 0; i--){
    const e = state.enemies[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    
    if (e.x - e.radius < 0 || e.x + e.radius > w){
      e.vx = -e.vx;
      e.x = Math.max(e.radius, Math.min(w - e.radius, e.x));
    }
    
    if (e.y > h + 30){
      state.enemies.splice(i, 1);
    }
  }
  
  // Collision detection
  const playerRadius = approximatePlayerRadius();
  
  // Bullet-enemy collisions
  for (let i = state.bullets.length - 1; i >= 0; i--){
    const b = state.bullets[i];
    for (let j = state.enemies.length - 1; j >= 0; j--){
      const e = state.enemies[j];
      if (circlesOverlap(b.x, b.y, 3, e.x, e.y, e.radius)){
        e.health--;
        state.bullets.splice(i, 1);
        
        if (e.health <= 0){
          state.score += 10;
          state.enemies.splice(j, 1);
          state.explosions.push({ x:e.x, y:e.y, age:0, radius:e.radius*2.5 });
          playExplosion();
          
          // Check for chain explosions
          const hitIndices = getExplosionHitIndices(e.x, e.y, e.radius*2.5, state.enemies);
          for (let k = hitIndices.length - 1; k >= 0; k--){
            const hitEnemy = state.enemies[hitIndices[k]];
            state.score += 5;
            state.explosions.push({ x:hitEnemy.x, y:hitEnemy.y, age:0, radius:hitEnemy.radius*2 });
            state.enemies.splice(hitIndices[k], 1);
          }
        }
        break;
      }
    }
  }
  
  // Player-enemy collisions
  if (!state.gameOver && state.invulnTimer <= 0){
    for (const e of state.enemies){
      if (circlesOverlap(p.playerX, p.playerY, playerRadius, e.x, e.y, e.radius)){
        p.hits++;
        state.invulnTimer = 1.5;
        state.explosions.push({ x:p.playerX, y:p.playerY, age:0, radius:30 });
        playExplosion();
        
        if (p.hits >= p.maxHits){
          state.gameOver = true;
          inputManager.reset();
          
          // Death explosion
          if (!state.deathExplosionPlayed) {
            state.explosions.push({ x:p.playerX, y:p.playerY, age:0, radius:100 });
            state.deathExplosionPlayed = true;
            
            // Check for high score
            if (isElectron() && state.score > 0) {
              // In a real implementation, show a dialog to enter name
              desktopIntegration.saveHighScore(state.score, 'Player');
            }
          }
        }
        break;
      }
    }
  }
  
  // Update invulnerability
  if (state.invulnTimer > 0){
    state.invulnTimer -= dt;
  }
  
  // Update explosions
  for (let i = state.explosions.length - 1; i >= 0; i--){
    const ex = state.explosions[i];
    ex.age += dt;
    if (ex.age > 0.5){
      state.explosions.splice(i, 1);
    }
  }
  
  // Level progression
  if (shouldLevelUp(state.level, state.score)){
    applyLevelUp(state);
  }
  
  // Spawn upgrades
  if (shouldSpawnUpgrade(state.score, state._lastUpgradeScore)){
    const upgradeX = 30 + Math.random() * (w - 60);
    state.upgrades.push({ x:upgradeX, y:-20, type:'bazooka', vy:50 });
    state._lastUpgradeScore = state.score;
  }
  
  // Update upgrades
  for (let i = state.upgrades.length - 1; i >= 0; i--){
    const u = state.upgrades[i];
    u.y += u.vy * dt;
    
    if (u.y > h + 30){
      state.upgrades.splice(i, 1);
    }
  }
  
  // Pickup upgrades
  processUpgradePickups(state, p.playerX, p.playerY, playerRadius);
  
  // Update bazooka timer
  if (state.bazookaTimer > 0){
    state.bazookaTimer -= dt;
    if (state.bazookaTimer <= 0){
      state.bazookaActive = false;
    }
  }
}

// Render game
function render(){
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  
  // Clear canvas
  ctx.fillStyle = '#062b4f';
  ctx.fillRect(0, 0, w, h);
  
  // Draw player
  if (!state.gameOver || state.invulnTimer > 0){
    const blinking = state.invulnTimer > 0 && Math.floor(state.invulnTimer * 10) % 2 === 0;
    if (!blinking){
      ctx.save();
      ctx.translate(state.playerX, state.playerY);
      const scale = state.bazookaActive ? 1.2 : 1;
      ctx.scale(scale, scale);
      ctx.drawImage(playerImg, -28, -28, 56, 56);
      ctx.restore();
    }
  }
  
  // Draw enemies
  for (const e of state.enemies){
    ctx.save();
    ctx.translate(e.x, e.y);
    const scale = e.radius / 20;
    ctx.scale(scale, scale);
    ctx.drawImage(pattyImg, -36, -28, 72, 56);
    ctx.restore();
  }
  
  // Draw bullets
  ctx.fillStyle = state.bazookaActive ? '#ff6b6b' : '#ffeb3b';
  for (const b of state.bullets){
    ctx.beginPath();
    ctx.arc(b.x, b.y, state.bazookaActive ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw upgrades
  for (const u of state.upgrades){
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(u.x - 10, u.y - 10, 20, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText('B', u.x - 4, u.y + 4);
  }
  
  // Draw explosions
  for (const ex of state.explosions){
    const progress = ex.age / 0.5;
    const radius = ex.radius * (1 + progress * 0.5);
    const alpha = 1 - progress;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Draw UI
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`Score: ${state.score}`, 10, 30);
  ctx.fillText(`Level: ${state.level}`, 10, 55);
  
  // Health
  const hearts = '❤️'.repeat(Math.max(0, state.maxHits - state.hits));
  ctx.font = '24px serif';
  ctx.fillText(hearts, 10, 85);
  
  // Bazooka indicator
  if (state.bazookaActive){
    ctx.fillStyle = '#4caf50';
    ctx.fillText(`BAZOOKA: ${Math.ceil(state.bazookaTimer)}s`, 10, 115);
  }
  
  // Draw on-screen controls for mobile
  const isMobile = 'ontouchstart' in window;
  if (isMobile){
    const controls = inputManager.getState();
    const padR = 40;
    const leftCx = 24 + padR, leftCy = h - (24 + padR);
    const rightCx = leftCx + (padR * 2.6), rightCy = leftCy;
    const fireR = padR * 1.6;
    const fireCx = w - (24 + fireR), fireCy = h - (24 + fireR);
    
    ctx.globalAlpha = 0.25;
    
    // Left button
    ctx.beginPath();
    ctx.arc(leftCx, leftCy, padR, 0, Math.PI * 2);
    ctx.fillStyle = controls.left ? '#ffffff' : '#000000';
    ctx.fill();
    
    // Right button
    ctx.beginPath();
    ctx.arc(rightCx, rightCy, padR, 0, Math.PI * 2);
    ctx.fillStyle = controls.right ? '#ffffff' : '#000000';
    ctx.fill();
    
    // Fire button
    ctx.beginPath();
    ctx.arc(fireCx, fireCy, fireR, 0, Math.PI * 2);
    ctx.fillStyle = controls.fire ? '#ff3b30' : '#000000';
    ctx.fill();
    
    ctx.globalAlpha = 1;
  }
  
  // Pause overlay
  if (state.paused){
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', w/2, h/2);
    
    ctx.font = '24px monospace';
    ctx.fillText('Press P or ESC to resume', w/2, h/2 + 40);
    
    if (isElectron()) {
      ctx.font = '16px monospace';
      ctx.fillText('Ctrl+S: Save | Ctrl+L: Load | F11: Fullscreen', w/2, h/2 + 80);
    }
    
    ctx.textAlign = 'left';
  }
  
  // Game over screen
  if (state.gameOver){
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', w/2, h/2 - 40);
    
    ctx.font = '32px monospace';
    ctx.fillText(`Final Score: ${state.score}`, w/2, h/2 + 10);
    
    ctx.font = '24px monospace';
    ctx.fillText('Press R or Ctrl+N to play again', w/2, h/2 + 50);
    
    ctx.textAlign = 'left';
  }
}

// Start game loop
requestAnimationFrame(loop);