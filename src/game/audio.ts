let audioCtx: AudioContext | null = null;
let unlocked = false;
let ambienceTimer: number | null = null;
let lastExplosionAt = 0;

type SampleKey = 'gun_basic' | 'shotgun' | 'missile_launch' | 'explosion_big' | 'explosion_small' | 'amb_bubbles';
const sampleBuffers: Partial<Record<SampleKey, AudioBuffer[]>> = {};
const defaultManifest: Record<SampleKey, string[]> = {
  // Use relative paths so they work with file:// packaging (Electron/AppImage) and Vite dev
  gun_basic: [ 'audio/gun_basic_01.ogg' ],
  shotgun: [ 'audio/shotgun_01.ogg' ],
  missile_launch: [ 'audio/missile_launch_01.ogg' ],
  explosion_big: [ 'audio/explosion_big_01.ogg' ],
  explosion_small: [ 'audio/explosion_small_01.ogg' ],
  amb_bubbles: [ 'audio/amb_bubbles_01.mp3' ],
};

function getCtx(): AudioContext | null {
  return audioCtx;
}

export function installAudioActivation(target: HTMLElement) {
  const tryUnlock = async () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch {}
    }
    unlocked = audioCtx.state === 'running';
    if (unlocked) { void loadSamples(defaultManifest); }
  };
  const onFirst = async () => {
    await tryUnlock();
    target.removeEventListener('pointerdown', onFirst);
    window.removeEventListener('keydown', onFirst);
    if (unlocked) startAmbience();
  };
  target.addEventListener('pointerdown', onFirst, { once: true });
  window.addEventListener('keydown', onFirst, { once: true });
}

export async function loadSamples(manifest: Record<string, string[]>) {
  if (!audioCtx) return;
  const entries = Object.entries(manifest) as [SampleKey, string[]][];
  await Promise.all(entries.map(async ([key, urls]) => {
    const buffers: AudioBuffer[] = [];
    for (const url of urls) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const arr = await resp.arrayBuffer();
        const buf = await audioCtx!.decodeAudioData(arr.slice(0));
        buffers.push(buf);
      } catch {}
    }
    if (buffers.length) sampleBuffers[key] = buffers;
  }));
}

function envGain(ctx: AudioContext, duration: number, peak = 0.25, attack = 0.005, decay = 0.1): GainNode {
  const g = ctx.createGain();
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + Math.max(attack + decay, duration));
  return g;
}

export function playGunshot() {
  const ctx = getCtx(); if (!unlocked || !ctx) return;
  if (sampleBuffers.gun_basic?.length) {
    const src = ctx.createBufferSource();
    const list = sampleBuffers.gun_basic;
    src.buffer = list![Math.floor(Math.random() * list!.length)];
    const g = ctx.createGain(); g.gain.value = 0.8;
    src.connect(g).connect(ctx.destination);
    src.start();
    return;
  }
  // Fallback synth
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const g = envGain(ctx, 0.12, 0.2, 0.002, 0.08);
  const t = ctx.currentTime;
  osc.frequency.setValueAtTime(640, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);
  osc.connect(g).connect(ctx.destination);
  osc.start(); osc.stop(t + 0.15);
}

export function playMissile() {
  const ctx = getCtx(); if (!unlocked || !ctx) return;
  if (sampleBuffers.missile_launch?.length) {
    const src = ctx.createBufferSource();
    const list = sampleBuffers.missile_launch;
    src.buffer = list![Math.floor(Math.random() * list!.length)];
    const g = ctx.createGain(); g.gain.value = 0.8;
    src.connect(g).connect(ctx.destination);
    src.start();
    return;
  }
  // Fallback whoosh (noise)
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = false;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  const g = envGain(ctx, 0.25, 0.18, 0.005, 0.22);
  src.connect(lp).connect(g).connect(ctx.destination);
  src.start();
}

export function playExplosion() {
  const ctx = getCtx(); if (!unlocked || !ctx) return;
  const now = ctx.currentTime;
  if (now - lastExplosionAt < 0.05) return; // rate-limit
  lastExplosionAt = now;
  // Prefer big explosion sample if available
  const list = sampleBuffers.explosion_big?.length ? sampleBuffers.explosion_big : sampleBuffers.explosion_small;
  if (list?.length) {
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    const g = ctx.createGain(); g.gain.value = 0.9;
    src.connect(g).connect(ctx.destination);
    src.start();
    return;
  }
  const duration = 0.5;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const amp = (1 - t) * (1 - t);
    data[i] = (Math.random() * 2 - 1) * amp;
  }
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 220; bp.Q.value = 0.6;
  const g = envGain(ctx, duration, 0.5, 0.002, 0.45);
  src.connect(bp).connect(g).connect(ctx.destination);
  src.start();
}

export function playImpact() {
  const ctx = getCtx(); if (!unlocked || !ctx) return;
  // Prefer smaller explosion sample at lower gain
  if (sampleBuffers.explosion_small?.length) {
    const src = ctx.createBufferSource();
    const list = sampleBuffers.explosion_small;
    src.buffer = list[Math.floor(Math.random() * list.length)];
    const g = ctx.createGain(); g.gain.value = 0.6;
    src.connect(g).connect(ctx.destination);
    src.start();
    return;
  }
  // Fallback quick pop
  const duration = 0.12;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const amp = (1 - t);
    data[i] = (Math.random() * 2 - 1) * amp * 0.7;
  }
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
  const g = envGain(ctx, duration, 0.25, 0.002, 0.1);
  src.connect(hp).connect(g).connect(ctx.destination);
  src.start();
}

export function startAmbience() {
  if (!unlocked || !audioCtx) return;
  if (ambienceTimer) return;
  ambienceTimer = window.setInterval(() => {
    if (!unlocked || !audioCtx) return;
    // randomly play 0..2 small plops
    const count = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 1 : 2);
    for (let i = 0; i < count; i++) {
      setTimeout(() => playPlop(), Math.random() * 800);
    }
  }, 3000);
}

export function stopAmbience() {
  if (ambienceTimer) { clearInterval(ambienceTimer); ambienceTimer = null; }
}

function playPlop() {
  const ctx = getCtx(); if (!unlocked || !ctx) return;
  const osc = ctx.createOscillator(); osc.type = 'sine';
  const g = envGain(ctx, 0.25, 0.08, 0.005, 0.22);
  const t = ctx.currentTime;
  const base = 180 + Math.random() * 40;
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.6, t + 0.25);
  osc.connect(g).connect(ctx.destination);
  osc.start(); osc.stop(t + 0.28);
}

export function isAudioReady() { return unlocked; }


