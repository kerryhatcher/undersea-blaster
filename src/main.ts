import { createInitialState, hardReset, resetPlayer, GameState } from './game/state';
import { getSpawnIntervalMs, getSpeedScale, shouldLevelUp, applyLevelUp } from './game/systems/difficulty';
import { circlesOverlap, approximatePlayerRadius } from './game/systems/collision';
import { nextUpgradeScore, shouldSpawnUpgrade, getExplosionHitIndices, processUpgradePickups } from './game/systems/upgrades';
import { shouldPlayAlternate } from './game/systems/audio';
import { computePads, shouldStartDrag } from './game/systems/input';
import { computeHintBottomOffset } from './game/systems/layout';
import { shouldRicochet, randomRicochetVelocity } from './game/systems/laser';
import { installClientLogger } from './dev/client-logger';
import { installAudioActivation, playGunshot, playMissile, playExplosion, startAmbience, stopAmbience, playImpact } from './game/audio';
import { computeUpgradeHud } from './game/hud';

installClientLogger();

const canvas = document.getElementById('game') as HTMLCanvasElement;
// Prevent iOS Safari page scroll on touch when interacting with canvas
document.addEventListener('gesturestart', (e)=> e.preventDefault());
document.addEventListener('touchmove', (e)=> {
  if (e.target === canvas) e.preventDefault();
}, { passive: false });
const ctx = canvas.getContext('2d')!;
const pauseLinkEl = document.getElementById('pause-link') as HTMLAnchorElement | null;

const focusGame = () => canvas.focus({ preventScroll: true });
setTimeout(focusGame, 0);
canvas.addEventListener('pointerdown', focusGame);
canvas.addEventListener('mouseenter', focusGame);

function resize() {
  const dpr = Math.max(1, (window.devicePixelRatio || 1));
  canvas.width  = Math.floor(innerWidth  * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();
installAudioActivation(canvas);
startAmbience();

// SVG assets (define before using)
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

const state: GameState = createInitialState(() => canvas.clientWidth, () => canvas.clientHeight);
resetPlayer(state);
// Expose minimal test handle in dev for Playwright-driven scenarios
if ((import.meta as any).env?.DEV) {
  (window as any).__game = { state };
}

const controls = { left:false, right:false, fire:false };

addPointerListeners(canvas);

const KEYMAP: Record<string, 'left'|'right'> = { ArrowLeft:'left', ArrowRight:'right', KeyA:'left', KeyD:'right' };
function handleKeyDown(e: KeyboardEvent){
  if (state.gameOver) {
    if (e.code === 'KeyR' || e.code === 'Space' || e.key === 'Enter') { hardReset(state); e.preventDefault(); }
    return;
  }
  if (document.activeElement !== canvas) return;
  if ((e as any).repeat) return;
  // Allow keyboard to unpause
  if (state.paused && (e.code === 'Space' || e.key === 'Enter')) { state.paused = false; e.preventDefault(); return; }
  if (e.code === 'Space' || e.key === 'Enter') { controls.fire = true; e.preventDefault(); return; }
  const dir = KEYMAP[e.code];
  if (dir){ (controls as any)[dir] = true; e.preventDefault(); }
}
function handleKeyUp(e: KeyboardEvent){
  if (document.activeElement !== canvas) return;
  if (e.code === 'Space' || e.key === 'Enter') { controls.fire = false; e.preventDefault(); return; }
  const dir = KEYMAP[e.code];
  if (dir){ (controls as any)[dir] = false; e.preventDefault(); }
}
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', ()=>{ controls.left = controls.right = controls.fire = false; state.paused = true; });
canvas.addEventListener('blur', ()=>{ controls.left = controls.right = controls.fire = false; state.paused = true; });
window.addEventListener('focus', ()=>{ /* keep paused, user resumes via input */ });

let last = performance.now();
function loop(now: number){
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Register service worker for PWA install (skip in Electron/file://)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isFileProto = location.protocol === 'file:';
  const isElectron = !!(navigator.userAgent || '').toLowerCase().includes('electron');
  if (!isFileProto && !isElectron) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

function update(dt: number, nowMs: number){
  const w = state.w(), h = state.h();
  const p = state.player;

  if (state.paused) {
    // Even while paused, decay overlay timer so it can disappear if desired
    if (state.levelUpTimer > 0) state.levelUpTimer = Math.max(0, state.levelUpTimer - dt);
    return;
  }

  if (!state.gameOver) {
    if (controls.left && !controls.right) p.x -= p.speed*dt;
    if (controls.right && !controls.left) p.x += p.speed*dt;
  }
  p.x = Math.max(28, Math.min(w-28, p.x));

  if (p.invuln > 0) p.invuln -= dt;

  state._cooldown -= dt;
  if (!state.gameOver) {
    if (controls.fire && state._cooldown <= 0){
      if (state.bazookaActive) {
        state._cooldown = 0.4; // fire slower
          state.bullets.push({ x:p.x, y:p.y-24, vy:-260, vx: 0, r:6, kind: 'missile', trail: [] });
          const alt = shouldPlayAlternate(state.missileSoundIndex);
          state.missileSoundIndex = alt.nextIndex;
          if (alt.play) playMissile();
      } else if (state.shotgunActive) {
        state._cooldown = 0.36; // slightly slower
        const speed = -460; // faster bullets
        const spread = 0.28; // radians total spread
        const count = 5;
        for (let i=0;i<count;i++){
          const t = (i - (count-1)/2) / ((count-1)/2);
          const angle = t * (spread/2);
          const vx = Math.sin(angle) * Math.abs(speed);
          const vy = Math.cos(angle) * speed;
          state.bullets.push({ x:p.x, y:p.y-24, vy, vx, r:5, kind: 'bubble' });
        }
        playGunshot();
      } else if (state.laserActive) {
        state._cooldown = 0.06; // slightly faster rate
        const speed = -1200; // extremely fast
        // 50% of shots are bouncy (deterministic alternation)
        // 70% chance to ricochet
        const bouncy = shouldRicochet();
        state.laserShotIndex += 1;
        state.bullets.push({ x:p.x, y:p.y-24, vy:speed, vx: 0, r:6, kind: 'laser', len: 24, thickness: 4, bouncy });
        playGunshot(); // reuse small shot sound for laser
      } else {
        state._cooldown = 0.18;
        state.bullets.push({ x:p.x, y:p.y-24, vy:-380, r:5, kind: 'bubble' });
        playGunshot();
      }
    }
  }

  // bullets update (position + trails)
  for (const b of state.bullets){
    if (b.kind === 'missile') {
      // leave smoke trail
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y, life: 0.6 });
      // simple straight missile (could add slight homing wobble)
    }
    b.y += b.vy * dt;
    if (b.vx) b.x += b.vx * dt;
  }
  // decay trails and cull old segments
  for (const b of state.bullets){
    if (b.trail) {
      for (const seg of b.trail) seg.life -= dt;
      b.trail = b.trail.filter(seg => seg.life > 0);
      if (b.trail.length > 30) b.trail.splice(0, b.trail.length - 30);
    }
  }
  state.bullets = state.bullets.filter(b=> b.y > -40 && b.y < state.h()+40 && b.x > -40 && b.x < state.w()+40);
  if (state.bullets.length > 160) state.bullets.splice(0, state.bullets.length - 160);

  // upgrades: spawn every +200 points, two choices if allowed, but only one bubble visible at once
      if (!state.gameOver && !state.bazookaActive && !state.shotgunActive && !state.laserActive && state.bazookaCooldown <= 0 && state.upgrades.length === 0) {
    if (shouldSpawnUpgrade(state.score, state.nextUpgradeAt)){
      const xCenter = w * (0.25 + Math.random()*0.5);
      const spread = 240 + Math.random()*240; // drastically larger separation
      const baseVy = 42 + Math.random()*10;  // similar vertical speed
      const jitter = () => (Math.random()*2-1) * 18; // mild horizontal drift
      // 30% larger bubbles (r ~ 21) with horizontal drift, include laser
      state.upgrades.push({ x: xCenter - spread, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'bazooka' });
      state.upgrades.push({ x: xCenter, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'laser' });
      state.upgrades.push({ x: xCenter + spread, y: -24, r: 21, vy: baseVy, vx: jitter(), kind: 'shotgun' });
      state.nextUpgradeAt = nextUpgradeScore(state.nextUpgradeAt);
    }
  }

  const speedScale = getSpeedScale(state.level);
  if (nowMs - state.lastSpawn > getSpawnIntervalMs(state.level)) {
    spawnPatty(state, speedScale);
    state.lastSpawn = nowMs;
  }
  for (const a of state.patties){
    a.x += a.vx*dt; a.y += a.vy*dt;
  }
  state.patties = state.patties.filter(a=> a.y < h + 80);
  if (state.patties.length > 80) state.patties.splice(0, state.patties.length - 80);

  // bullet-patty collisions
  for (let i = state.patties.length-1; i>=0; i--){
    const a = state.patties[i];
    for (let j = state.bullets.length-1; j>=0; j--){
      const b = state.bullets[j];
      const ar = a.size*0.46, br = b.r;
      if (circlesOverlap(a.x, a.y, ar, b.x, b.y, br)){
        // Primary hit
        state.patties.splice(i,1);
        state.bullets.splice(j,1);
        state.score += 50;
        // Regular bullet impact flair (small puff) and soft pop when not bazooka/shotgun splash
        if (!state.bazookaActive && !state.shotgunActive && b.kind !== 'missile') {
          state.impacts.push({ x: a.x, y: a.y, life: 0, duration: 0.22 });
          playImpact();
        }
        // Splash damage: bazooka/missile (medium radius) or shotgun (small radius)
      if (state.bazookaActive || b.kind === 'missile' || state.shotgunActive) {
          const splashR = (state.shotgunActive && b.kind !== 'missile') ? 28 : 60;
          // Collect indices then remove from back to front
          const hitIdx = getExplosionHitIndices(state.patties, a.x, a.y, splashR);
          hitIdx.sort((x,y)=>y-x);
          for (const idx of hitIdx){
            if (idx >= 0 && idx < state.patties.length) {
              state.patties.splice(idx,1);
              state.score += 50;
            }
          }
          // explosion visual
          if (!(state as any).explosions) (state as any).explosions = [];
          state.explosions.push({ x: a.x, y: a.y, life: 0, duration: 0.35 });
          playExplosion();
        }
        // Laser bounce: random chance may bounce off at an angle and continue (no extra damage for first target)
        if (b.kind === 'laser' && b.bouncy && !b.bounced) {
          const vel = randomRicochetVelocity(900);
          state.bullets.push({ x: a.x, y: a.y, vy: vel.vy, vx: vel.vx, r: 6, kind: 'laser', len: 22, thickness: 5, bouncy: false, bounced: true });
        }
        break;
      }
    }
  }

  // level-up
  if (!state.gameOver && shouldLevelUp(state.score, state.scoreAtLevelStart)){
    applyLevelUp(state);
  }

  // decay level-up overlay timer using dt
  if (state.levelUpTimer > 0) {
    state.levelUpTimer = Math.max(0, state.levelUpTimer - dt);
  }

  // player damage
  if (!state.gameOver) {
    for (let i = state.patties.length-1; i>=0; i--) {
      const a = state.patties[i];
      const playerR = approximatePlayerRadius(p.w, p.h);
      const ar = a.size*0.46;
      if (circlesOverlap(a.x, a.y, ar, p.x, p.y, playerR)){
        if (p.invuln <= 0){
          p.hits += 1;
          p.invuln = 1.2;
          state.patties.splice(i,1);
          if (p.hits >= p.maxHits){
            state.gameOver = true;
            controls.left = controls.right = controls.fire = false;
            // Trigger a big cartoon death explosion once
            if (!state.deathExplosionPlayed) {
              state.deathExplosionPlayed = true;
              state.explosions.push({ x: p.x, y: p.y, life: 0, duration: 0.6 });
              // Add a few offset puffs for extra oomph
              state.explosions.push({ x: p.x+18, y: p.y-10, life: 0, duration: 0.5 });
              state.explosions.push({ x: p.x-16, y: p.y+6, life: 0, duration: 0.5 });
              playExplosion();
            }
          }
        }
        break;
      }
    }
    // ricochet laser can harm player
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (b.kind !== 'laser') continue;
      // only consider bounced lasers (with vx and bounced flag)
      if (!b.bounced) continue;
      const playerR = approximatePlayerRadius(p.w, p.h);
      if (circlesOverlap(b.x, b.y, Math.max(6, (b.thickness || 4)), p.x, p.y, playerR)) {
        if (p.invuln <= 0) {
          p.hits += 1;
          p.invuln = 1.2;
          // remove laser on hit
          state.bullets.splice(j,1);
          if (p.hits >= p.maxHits) {
            state.gameOver = true;
            controls.left = controls.right = controls.fire = false;
            if (!state.deathExplosionPlayed) {
              state.deathExplosionPlayed = true;
              state.explosions.push({ x: p.x, y: p.y, life: 0, duration: 0.6 });
              state.explosions.push({ x: p.x+18, y: p.y-10, life: 0, duration: 0.5 });
              state.explosions.push({ x: p.x-16, y: p.y+6, life: 0, duration: 0.5 });
              playExplosion();
            }
          }
        }
        break;
      }
    }
  }

  // upgrades movement and pickup
  for (const u of state.upgrades) { u.y += u.vy * dt; if (u.vx) u.x += u.vx * dt; }
  state.upgrades = state.upgrades.filter(u => u.y < h + 40);
  // pickup by bullet or player (safe helper)
  processUpgradePickups(state);

  // bazooka/shotgun timers and shared cooldown
      if (state.bazookaActive) {
    state.bazookaTimer -= dt;
    if (state.bazookaTimer <= 0) { state.bazookaActive = false; state.bazookaTimer = 0; state.bazookaCooldown = 10; }
  }
      if (state.shotgunActive) {
    state.shotgunTimer -= dt;
    if (state.shotgunTimer <= 0) { state.shotgunActive = false; state.shotgunTimer = 0; state.bazookaCooldown = 10; }
  }
      if (state.laserActive) {
        state.laserTimer -= dt;
        if (state.laserTimer <= 0) { state.laserActive = false; state.laserTimer = 0; state.bazookaCooldown = 10; }
      }
      if (!state.bazookaActive && !state.shotgunActive && !state.laserActive && state.bazookaCooldown > 0) {
    state.bazookaCooldown -= dt;
    if (state.bazookaCooldown < 0) state.bazookaCooldown = 0;
  }

  // explosions life update
  if ((state as any).explosions) {
    for (let i = state.explosions.length - 1; i >= 0; i--) {
      const ex = state.explosions[i];
      ex.life += dt;
      if (ex.life >= ex.duration) state.explosions.splice(i,1);
    }
    if (state.explosions.length > 32) state.explosions.splice(0, state.explosions.length - 32);
  }
  // impacts life update
  for (let i = state.impacts.length - 1; i >= 0; i--) {
    const im = state.impacts[i];
    im.life += dt;
    if (im.life >= im.duration) state.impacts.splice(i,1);
  }
  if (state.impacts.length > 64) state.impacts.splice(0, state.impacts.length - 64);
}

function draw(nowMs: number){
  const w = state.w(), h = state.h();
  // Toggle external pause link visibility and position above pads
  if (pauseLinkEl) {
    pauseLinkEl.style.display = (state.paused && !state.gameOver) ? 'block' : 'none';
    if (state.paused && !state.gameOver) {
      const sa = getSafeAreaInsets();
      const pads = computePads(w, h, sa.bottom);
      const bottomPx = computeHintBottomOffset(pads, sa.bottom);
      (pauseLinkEl as HTMLElement).style.bottom = `${bottomPx}px`;
    }
  }
  // bg
  const g = ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0e6ab0');
  g.addColorStop(1,'#083a66');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);

  // bubbles
  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i=0;i<30;i++){
    const x = (i*97 % w);
    const y = (i*173 + ((nowMs||0)*0.03)%h) % h;
    ctx.beginPath(); ctx.arc(x,y, (i%7)+2, 0, Math.PI*2); ctx.fillStyle='#d0f0ff'; ctx.fill();
  }
  ctx.restore();

  // patties
  for (const a of state.patties){
    const s = a.size/72;
    const drawW = 72*s, drawH = 56*s;
    ctx.drawImage(pattyImg, a.x-drawW/2, a.y-drawH/2, drawW, drawH);
  }

  // player (hidden on game over so only explosion is seen)
  if (!state.gameOver) {
    const pw = state.player.w, ph = state.player.h;
    ctx.save();
    if (state.player.invuln > 0) {
      const blink = (Math.floor((nowMs||0) * 0.02) % 2) === 0;
      ctx.globalAlpha = blink ? 0.45 : 1;
    }
    ctx.drawImage(playerImg, state.player.x - pw/2, state.player.y - ph/2, pw, ph);
    if (state.player.hits > 0) {
      const damageAlpha = Math.min(0.6, state.player.hits / state.player.maxHits * 0.6);
      ctx.fillStyle = `rgba(255, 59, 48, ${damageAlpha.toFixed(3)})`;
      ctx.fillRect(state.player.x - pw/2, state.player.y - ph/2, pw, ph);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      for (let i=0; i<state.player.hits; i++) {
        const t = i / state.player.maxHits;
        const x1 = state.player.x - pw/2 + (pw * (0.2 + t * 0.6));
        const y1 = state.player.y - ph/2 + (ph * (0.2 + (1-t) * 0.6));
        const x2 = state.player.x - pw/2 + (pw * (0.8 - t * 0.4));
        const y2 = state.player.y - ph/2 + (ph * (0.2 + t * 0.6));
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // bullets
  for (const b of state.bullets){
    if (b.kind === 'missile') {
      // trail
      if (b.trail) {
        ctx.save();
        for (const seg of b.trail){
          const alpha = Math.max(0, Math.min(1, seg.life / 0.6));
          // smoke
          ctx.globalAlpha = alpha * 0.4;
          ctx.fillStyle = '#bbbbbb';
          ctx.beginPath(); ctx.arc(seg.x, seg.y, 5, 0, Math.PI*2); ctx.fill();
          // fire core
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillStyle = '#ff7f00';
          ctx.beginPath(); ctx.arc(seg.x, seg.y+2, 2.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }
      // missile body oriented upward (no rotation)
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = '#444';
      ctx.fillRect(-3, -12, 6, 24);
      ctx.fillStyle = '#d22';
      ctx.fillRect(-4, 8, 8, 4);
      ctx.restore();
    } else if (b.kind === 'laser') {
      // Draw laser as a longer, thicker streak
      const len = b.len ?? 24; const thick = b.thickness ?? 4;
      ctx.save();
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + (b.vx || 0) * 0.04, b.y - Math.abs(b.vy) * 0.04 - len);
      ctx.stroke();
      ctx.restore();
    } else {
      // bubble bullet
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fillStyle = '#b3ecff'; ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  // explosions (big cartoon clouds + shockwave)
  for (const ex of state.explosions) {
    const t = Math.min(1, ex.life / ex.duration); // 0..1
    const alpha = 1 - t;
    const baseR = 10 + t * 36;
    // Flash at start
    if (t < 0.12) {
      ctx.save();
      ctx.globalAlpha = 0.9 * (0.12 - t) / 0.12;
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(ex.x, ex.y, 18, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Puffs around center
    const offsets = [
      [0, 0], [1.1, 0.15], [-1.1, 0.15], [0.35, -1.05], [-0.35, -1.05], [0.5, 1.1], [-0.5, 1.1], [1.0, -0.8], [-1.0, 0.8]
    ];
    ctx.save();
    ctx.globalAlpha = 0.85 * alpha;
    for (let i=0;i<offsets.length;i++){
      const [ox, oy] = offsets[i];
      const cx = ex.x + ox * (baseR * 0.7);
      const cy = ex.y + oy * (baseR * 0.7);
      const r = baseR * (0.6 + (i%4)*0.12);
      // outer light
      ctx.fillStyle = '#fff2cc';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
      // inner orange
      ctx.globalAlpha = 0.7 * alpha;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(cx, cy, r*0.55, 0, Math.PI*2); ctx.fill();
      // core red
      ctx.globalAlpha = 0.6 * alpha;
      ctx.fillStyle = '#ff6b3a';
      ctx.beginPath(); ctx.arc(cx, cy, r*0.28, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.85 * alpha;
    }
    ctx.restore();

    // Shockwave ring
    ctx.save();
    ctx.globalAlpha = 0.9 * alpha;
    const ringR = baseR * 1.35;
    const grad = ctx.createRadialGradient(ex.x, ex.y, ringR*0.7, ex.x, ex.y, ringR);
    grad.addColorStop(0, 'rgba(255,255,255,0.0)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.strokeStyle = grad as any;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ex.x, ex.y, ringR, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // small impact puffs for regular bullets
  for (const im of state.impacts) {
    const t = Math.min(1, im.life / im.duration);
    const alpha = 1 - t;
    const r = 6 + t * 10;
    ctx.save();
    ctx.globalAlpha = 0.7 * alpha;
    ctx.fillStyle = '#d0f0ff';
    ctx.beginPath(); ctx.arc(im.x, im.y, r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(im.x + 4, im.y - 2, r*0.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // HUD: score, level, health
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(String(state.score), 12, 34);
  ctx.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillText(`Lv ${state.level}`, 12, 56);
  const hpX = w - 12, hpY = 22, r = 6;
  for (let i=0;i<state.player.maxHits;i++){
    ctx.beginPath();
    ctx.arc(hpX - i*18, hpY, r, 0, Math.PI*2);
    ctx.fillStyle = (i < (state.player.maxHits - state.player.hits)) ? '#b3ecff' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Upgrades: draw bazooka pickups (bubble with bazooka icon)
  for (const u of state.upgrades){
    ctx.save();
    ctx.beginPath(); ctx.arc(u.x, u.y, u.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(179,236,255,0.85)'; ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
    ctx.translate(u.x, u.y);
    if (u.kind === 'bazooka') {
      // bazooka glyph
      ctx.rotate( -0.2 );
      ctx.fillStyle = '#2f2f2f';
      ctx.fillRect(-7, -3, 20, 6);
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(-12, -2, 9, 4);
    } else if (u.kind === 'shotgun') {
      // shotgun glyph: stock + 5 barrels
      ctx.fillStyle = '#2e2e2e';
      ctx.fillRect(-12, -3, 24, 6);
      ctx.fillStyle = '#c0c0c0';
      for (let i=0;i<5;i++){
        const bx = -12 + i*6;
        ctx.fillRect(bx, -4, 2.5, 8);
      }
    } else {
      // laser glyph: bright vertical rod with glow
      ctx.save();
      const grad = ctx.createLinearGradient(0, -10, 0, 10);
      grad.addColorStop(0, '#9ff1ff');
      grad.addColorStop(1, '#56d0ff');
      ctx.fillStyle = grad as any;
      ctx.shadowColor = 'rgba(159, 241, 255, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillRect(-2, -10, 4, 20);
      ctx.restore();
    }
    ctx.restore();
  }

  // Upgrade HUD (active or cooldown)
  {
    const hud = computeUpgradeHud(state);
    if (hud.mode !== 'none') {
      const barW = Math.min(260, w * 0.5), barH = 10;
      const bx = (w - barW)/2, by = 14;
      ctx.save();
      ctx.fillStyle = hud.mode === 'active' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = hud.mode === 'active' ? '#ff3b30' : '#888';
      ctx.fillRect(bx, by, barW * hud.pct, barH);
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.strokeRect(bx, by, barW, barH);
      ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      const secs = Math.ceil(hud.remain);
      const label = hud.mode === 'active' ? `${hud.label} ${secs}s` : `${hud.label} ${secs}s`;
      ctx.fillText(label, w/2, by + barH + 12);
      ctx.textAlign = 'start';
      ctx.restore();
    }
  }

  // level up overlay (render only; timer decays in update)
  if (state.levelUpTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.levelUpTimer / 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${state.level}`, w/2, h*0.28);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  // game over overlay
  if (state.gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', w/2, h/2 - 10);
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Press R/Space/Enter or tap to restart', w/2, h/2 + 20);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  // pause overlay
  if (state.paused && !state.gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('Undersea Blaster', w/2, h*0.34);
    ctx.font = '18px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Click or tap to start', w/2, h*0.42);

    // basic instructions
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto';
    const lines = [
      'Move: 844/846 or A/D   •   Shoot: Space/Enter',
      'Mobile: use on-screen pads',
    ];
    // normalize arrow glyphs for display
    lines[0] = 'Move: ◀/▶ or A/D   •   Shoot: Space/Enter';
    let y = h * 0.52;
    for (const line of lines) { ctx.fillText(line, w/2, y); y += 22; }

    // author link is provided as a DOM element (#pause-link) layered above the canvas
    // audio attribution
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const attribution = [
      'Audio sources:',
      'Kenney (CC0) — gun/shotgun/missile',
      'Pixabay — ambience (Underwater Ambience, DRAGON-STUDIO)'
    ];
    let ay = h * 0.62;
    for (const line of attribution) { ctx.fillText(line, w/2, ay); ay += 16; }
    ctx.textAlign = 'start';
    ctx.restore();
  }

  // on-screen pads
  const sa = getSafeAreaInsets();
  // Nudge right pad left if centerline is near hint text area to avoid overlap
  const pads = computePads(w, h, sa.bottom);
  if (pads.rightCx + pads.padR > (w - 120)) {
    pads.rightCx = Math.max(pads.rightCx - 40, pads.padR + 12);
  }
  ctx.globalAlpha = 0.25;
  drawCircle(pads.leftCx,pads.leftCy,pads.padR, controls.left);
  drawTriangle(pads.leftCx,pads.leftCy,pads.padR*0.5, 'left');
  drawCircle(pads.rightCx,pads.rightCy,pads.padR, controls.right);
  drawTriangle(pads.rightCx,pads.rightCy,pads.padR*0.5, 'right');
  drawCircle(pads.fireCx, pads.fireCy, pads.fireR, controls.fire, '#ff3b30');
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(pads.fireCx, pads.fireCy, pads.fireR*0.45, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
  ctx.globalAlpha = 1;

  // version string at bottom center
  ctx.save();
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'center';
  {
    const saVer = getSafeAreaInsets();
    const yVer = h - (6 + saVer.bottom);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - injected at build time via define
    const ver = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : 'dev';
    ctx.fillText(`v${ver}`, w/2, yVer);
  }
  ctx.textAlign = 'start';
  ctx.restore();

  function drawCircle(x:number,y:number,r:number,active:boolean,color='#000'){
    ctx.save();
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle = (color === '#000') ? 'rgba(0,0,0,0.35)' : color;
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
    if(active){ ctx.beginPath(); ctx.arc(x,y,r*0.7,0,Math.PI*2); ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.stroke(); }
    ctx.restore();
  }
  function drawTriangle(x:number,y:number,s:number,dir:'left'|'right'){
    ctx.save();
    ctx.fillStyle='white';
    ctx.beginPath();
    if(dir==='left'){
      ctx.moveTo(x - s*0.6, y);
      ctx.lineTo(x + s*0.4, y - s);
      ctx.lineTo(x + s*0.4, y + s);
    } else {
      ctx.moveTo(x + s*0.6, y);
      ctx.lineTo(x - s*0.4, y - s);
      ctx.lineTo(x - s*0.4, y + s);
    }
    ctx.closePath();
    ctx.globalAlpha = .9; ctx.fill(); ctx.restore();
  }
}

function addPointerListeners(el: HTMLElement){
  let mouseHeld = false;
  let dragging = false;
  let dragOffsetX = 0;
  const clearControls = () => { controls.left = controls.right = controls.fire = false; };
  function onDown(e: any){
    if (state.gameOver) { hardReset(state); return; }
    if (state.paused) { state.paused = false; }
    mouseHeld = true;
    const list = e.touches || e.changedTouches || [e];
    // Shooting anywhere near the player starts firing and drag control
    controls.fire = true;
    const t = list[0];
    const px = t.clientX, py = t.clientY;
    if (shouldStartDrag(py, state.player.y)) {
      dragging = true;
      dragOffsetX = state.player.x - px;
    } else {
      // fallback to virtual pads classification
      inputAt(px, py, true);
    }
    e.preventDefault();
  }
  function onMove(e: any){
    const list = e.touches || e.changedTouches;
    if (list) {
      const t = list[0];
      if (dragging) {
        state.player.x = t.clientX + dragOffsetX;
      } else if (mouseHeld) {
        inputAt(t.clientX, t.clientY, true);
      }
    } else if (mouseHeld) {
      inputAt((e as MouseEvent).clientX, (e as MouseEvent).clientY, true);
    }
    e.preventDefault();
  }
  function onUp(e: any){
    mouseHeld = false;
    dragging = false;
    clearControls();
    e.preventDefault();
  }
  el.addEventListener('touchstart', onDown as any, {passive:false});
  el.addEventListener('touchmove',  onMove as any, {passive:false});
  el.addEventListener('touchend',   onUp as any,   {passive:false});
  el.addEventListener('touchcancel',onUp as any,   {passive:false});
  el.addEventListener('mousedown', onDown as any);
  el.addEventListener('mousemove', onMove as any);
  addEventListener('mouseup', onUp as any);
  el.addEventListener('mouseleave', onUp as any);
  addEventListener('blur', onUp as any);
}

function inputAt(clientX: number, clientY: number, isDown: boolean){
  const x = clientX; const y = clientY;
  const w = state.w(); const h = state.h();
  const sa = getSafeAreaInsets();
  const pads = computePads(w, h, sa.bottom);
  if (hitCircle(x,y,pads.leftCx,pads.leftCy,pads.padR)) { controls.left = isDown; return; }
  if (hitCircle(x,y,pads.rightCx,pads.rightCy,pads.padR)) { controls.right = isDown; return; }
  if (hitCircle(x,y,pads.fireCx,pads.fireCy,pads.fireR)) { controls.fire = isDown; return; }
}

function hitCircle(px: number, py: number, cx: number, cy: number, r: number){
  const dx = px - cx, dy = py - cy; return (dx*dx + dy*dy) <= r*r;
}

function getSafeAreaInsets(){
  // Read CSS env(safe-area-inset-*) via a temp element
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:0;bottom:0;z-index:-1;visibility:hidden;padding-bottom:env(safe-area-inset-bottom);padding-top:env(safe-area-inset-top);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)';
  document.body.appendChild(div);
  const styles = getComputedStyle(div);
  const parse = (v: string) => parseFloat(v) || 0;
  const insets = {
    top: parse(styles.paddingTop),
    right: parse(styles.paddingRight),
    bottom: parse(styles.paddingBottom),
    left: parse(styles.paddingLeft),
  };
  div.remove();
  return insets;
}

function spawnPatty(state: GameState, speedScale: number){
  const w = state.w();
  const size = 42 + Math.random()*26;
  const vxBase = (Math.random()*2-1)*40 * speedScale;
  const vyBase = (40 + Math.random()*60) * speedScale;
  state.patties.push({ x: Math.random()*w, y: -size, vx: vxBase, vy: vyBase, size });
}
