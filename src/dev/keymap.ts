export type KeyConfig = {
  left: string[];
  right: string[];
  up: string[];
  down: string[];
  fire: string[];
};

export const defaultKeyConfig: KeyConfig = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  fire: ['Space', 'Enter', 'ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyK'],
};

const STORAGE_KEY = 'ub_key_config_v1';

export function loadKeyConfig(): KeyConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultKeyConfig };
    const parsed = JSON.parse(raw);
    const cfg: KeyConfig = { ...defaultKeyConfig, ...parsed };
    for (const k of ['left','right','up','down','fire'] as const) {
      if (!Array.isArray((cfg as any)[k])) (cfg as any)[k] = (defaultKeyConfig as any)[k];
    }
    return cfg;
  } catch {
    return { ...defaultKeyConfig };
  }
}

export function saveKeyConfig(cfg: KeyConfig) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
}

export function keyConfigToSets(cfg: KeyConfig): { movementMap: Map<string,'left'|'right'|'up'|'down'>; fireSet: Set<string> } {
  const map = new Map<string, 'left'|'right'|'up'|'down'>();
  for (const code of cfg.left) map.set(code, 'left');
  for (const code of cfg.right) map.set(code, 'right');
  for (const code of cfg.up) map.set(code, 'up');
  for (const code of cfg.down) map.set(code, 'down');
  const fire = new Set<string>(cfg.fire);
  return { movementMap: map, fireSet: fire };
}


