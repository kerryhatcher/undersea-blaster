import { createInitialState, hardReset, resetPlayer, GameState } from './game/state';
import { getSpawnIntervalMs, getSpeedScale, shouldLevelUp } from './game/systems/difficulty';
import { circlesOverlap, approximatePlayerRadius } from './game/systems/collision';
import { installClientLogger } from './dev/client-logger';

installClientLogger();

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

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
      state._cooldown = 0.18;
      state.bullets.push({ x:p.x, y:p.y-24, vy:-380, r:5 });
    }
  }

  state.bullets = state.bullets.filter(b=> (b.y += b.vy*dt) > -20);

  const speedScale = getSpeedScale(state.level);
  if (nowMs - state.lastSpawn > getSpawnIntervalMs(state.level)) {
    spawnPatty(state, speedScale);
    state.lastSpawn = nowMs;
  }
  for (const a of state.patties){
    a.x += a.vx*dt; a.y += a.vy*dt;
  }
  state.patties = state.patties.filter(a=> a.y < h + 80);

  // bullet-patty collisions
  for (let i = state.patties.length-1; i>=0; i--){
    const a = state.patties[i];
    for (let j = state.bullets.length-1; j>=0; j--){
      const b = state.bullets[j];
      const ar = a.size*0.46, br = b.r;
      if (circlesOverlap(a.x, a.y, ar, b.x, b.y, br)){
        state.patties.splice(i,1);
        state.bullets.splice(j,1);
        state.score += 50;
        break;
      }
    }
  }

  // level-up
  if (!state.gameOver && shouldLevelUp(state.score, state.scoreAtLevelStart)){
    state.level += 1;
    state.scoreAtLevelStart = state.score;
    state.levelUpTimer = 2.0;
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
          }
        }
        break;
      }
    }
  }
}

function draw(nowMs: number){
  const w = state.w(), h = state.h();
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

  // player
  const pw = state.player.w, ph = state.player.h;
  ctx.save();
  if (state.player.invuln > 0 && !state.gameOver) {
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

  // bullets
  for (const b of state.bullets){
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fillStyle = '#b3ecff'; ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 1; ctx.stroke();
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
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', w/2, h/2 - 10);
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('Click/tap to resume', w/2, h/2 + 20);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  // on-screen pads
  const padR = Math.min(56, Math.min(w, h) * 0.065);
  const leftCx = 24 + padR, leftCy = h - (24 + padR);
  const rightCx = leftCx + (padR * 2.6), rightCy = leftCy;
  const fireR = padR * 1.6; const fireCx = w - (24 + fireR), fireCy = h - (24 + fireR);
  ctx.globalAlpha = 0.25;
  drawCircle(leftCx,leftCy,padR, controls.left);
  drawTriangle(leftCx,leftCy,padR*0.5, 'left');
  drawCircle(rightCx,rightCy,padR, controls.right);
  drawTriangle(rightCx,rightCy,padR*0.5, 'right');
  drawCircle(fireCx, fireCy, fireR, controls.fire, '#ff3b30');
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(fireCx, fireCy, fireR*0.45, 0, Math.PI*2); ctx.fillStyle='#ffffff'; ctx.fill();
  ctx.globalAlpha = 1;

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
  const clearControls = () => { controls.left = controls.right = controls.fire = false; };
  function onDown(e: any){
    if (state.gameOver) { hardReset(state); return; }
    if (state.paused) { state.paused = false; }
    mouseHeld = true;
    const list = e.changedTouches || [e];
    for (const t of list){ inputAt(t.clientX, t.clientY, true); }
    e.preventDefault();
  }
  function onMove(e: any){
    const list = e.changedTouches;
    if (list) {
      for (const t of list){ inputAt(t.clientX, t.clientY, true); }
    } else if (mouseHeld) {
      inputAt((e as MouseEvent).clientX, (e as MouseEvent).clientY, true);
    }
    e.preventDefault();
  }
  function onUp(e: any){
    mouseHeld = false;
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
  const padR = Math.min(56, Math.min(w, h) * 0.065);
  const leftCx = 24 + padR, leftCy = h - (24 + padR);
  const rightCx = leftCx + (padR * 2.6), rightCy = leftCy;
  const fireR = padR * 1.6; const fireCx = w - (24 + fireR), fireCy = h - (24 + fireR);
  if (hitCircle(x,y,leftCx,leftCy,padR)) { controls.left = isDown; return; }
  if (hitCircle(x,y,rightCx,rightCy,padR)) { controls.right = isDown; return; }
  if (hitCircle(x,y,fireCx,fireCy,fireR)) { controls.fire = isDown; return; }
}

function hitCircle(px: number, py: number, cx: number, cy: number, r: number){
  const dx = px - cx, dy = py - cy; return (dx*dx + dy*dy) <= r*r;
}

function spawnPatty(state: GameState, speedScale: number){
  const w = state.w();
  const size = 42 + Math.random()*26;
  const vxBase = (Math.random()*2-1)*40 * speedScale;
  const vyBase = (40 + Math.random()*60) * speedScale;
  state.patties.push({ x: Math.random()*w, y: -size, vx: vxBase, vy: vyBase, size });
}
