/**
 * Desktop-enhanced version of the game
 * Integrates Electron features while maintaining web compatibility
 */

import { createInitialState, hardReset, resetPlayer, GameState } from './game/state';
import { getSpawnIntervalMs, getSpeedScale, shouldLevelUp, applyLevelUp } from './game/systems/difficulty';
import { circlesOverlap, approximatePlayerRadius } from './game/systems/collision';
import { nextUpgradeScore, shouldSpawnUpgrade, getExplosionHitIndices, processUpgradePickups } from './game/systems/upgrades';
import { installClientLogger } from './dev/client-logger';
import { 
  installAudioActivation, 
  playGunshot, 
  playMissile, 
  playExplosion, 
  playShotgun,
  playLaser,
  playHit,
  playPickup,
  playLevelUp,
  startAmbience, 
  stopAmbience 
} from './game/audio';
import { updateGameLogic } from './game/core-update';
import type { UpdateContext, GameAudio, PlatformInfo } from './game/types';
import { desktopIntegration, isElectron } from './game/desktop-integration';
import { InputManager } from './game/input-manager';
import { createGameAssets } from './game/assets';
import { 
  renderBullets, 
  renderExplosions, 
  renderUpgrades,
  renderBackground,
  renderBackgroundBubbles,
  renderHealthHUD,
  renderScoreHUD,
  renderWeaponHUD
} from './game/render-helpers';

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

// Load game assets from shared module
const assets = createGameAssets();
const { playerImg, pattyImg } = assets;

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
  
  // Create platform info
  const platformInfo: PlatformInfo = {
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    isMobile: false,
    isDesktop: true
  };
  
  // Create update context
  const updateContext: UpdateContext = {
    dt,
    controls,
    platform: platformInfo,
    timestamp: now
  };
  
  // Create audio interface
  const gameAudio: GameAudio = {
    playGunshot,
    playMissile: (index: number) => playMissile(),
    playExplosion,
    playShotgun,
    playLaser,
    playHit,
    playPickup,
    playLevelUp,
    playGameOver: playExplosion
  };
  
  // Handle game over state change
  const wasGameOver = state.gameOver;
  
  // Use shared core update logic
  updateGameLogic(state, updateContext, gameAudio);
  
  // Handle new game over state
  if (!wasGameOver && state.gameOver) {
    inputManager.reset();
    if (isElectron() && state.score > 0) {
      desktopIntegration.saveHighScore(state.score, 'Player');
    }
  }
}

// Render game
function render(){
  const nowMs = performance.now();
  const w = state.w();
  const h = state.h();
  
  // Toggle external pause link visibility and position above pads
  if (pauseLinkEl) {
    pauseLinkEl.style.display = (state.paused && !state.gameOver) ? 'block' : 'none';
  }
  
  // Background using shared helpers
  renderBackground(ctx, w, h);
  renderBackgroundBubbles(ctx, w, h, nowMs);
  
  // Draw enemies (patties)
  for (const a of state.patties){
    const s = a.size / 72;
    const drawW = 72 * s;
    const drawH = 56 * s;
    ctx.drawImage(pattyImg, a.x - drawW/2, a.y - drawH/2, drawW, drawH);
  }
  
  // Draw player (hidden on game over so only explosion is seen)
  if (!state.gameOver) {
    const pw = state.player.w;
    const ph = state.player.h;
    ctx.save();
    if (state.player.invuln > 0) {
      const blink = (Math.floor(nowMs * 0.02) % 2) === 0;
      ctx.globalAlpha = blink ? 0.45 : 1;
    }
    ctx.drawImage(playerImg, state.player.x - pw/2, state.player.y - ph/2, pw, ph);
    if (state.player.hits > 0) {
      const damageAlpha = Math.min(0.6, state.player.hits / state.player.maxHits * 0.6);
      ctx.fillStyle = `rgba(255, 59, 48, ${damageAlpha.toFixed(3)})`;
      ctx.fillRect(state.player.x - pw/2, state.player.y - ph/2, pw, ph);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      for (let i = 0; i < state.player.hits; i++) {
        const t = i / state.player.maxHits;
        const x1 = state.player.x - pw/2 + (pw * (0.2 + t * 0.6));
        const y1 = state.player.y - ph/2 + (ph * (0.2 + (1-t) * 0.6));
        const x2 = state.player.x - pw/2 + (pw * (0.8 - t * 0.4));
        const y2 = state.player.y - ph/2 + (ph * (0.2 + t * 0.6));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  
  // Draw bullets using shared helper
  renderBullets(ctx, state.bullets);
  
  // Draw upgrades using shared helper
  renderUpgrades(ctx, state.upgrades);
  
  // Draw explosions using shared helper
  renderExplosions(ctx, state.explosions);
  
  // HUD using shared helpers
  renderScoreHUD(ctx, state.score, state.level);
  renderHealthHUD(ctx, w - 12, 22, state.player.maxHits - state.player.hits, state.player.maxHits);
  renderWeaponHUD(ctx, state, 12, 70);
  
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