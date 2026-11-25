// Ember & Thyme — game state: one plain object holding everything the loop
// needs, plus the small helpers that create and reset it.

import { CHEF_START, LAYOUT, SHIFT_SECONDS } from './config.js';

// A carried item or a plate slot's contents: { id, prep }.
// prep is 'raw', 'chopped', 'cooked' or 'burnt'.
export function makeItem(id, prep = 'raw') {
  return { id, prep };
}

export function createGameState() {
  return {
    mode: 'menu', // 'menu' | 'playing' | 'over'
    frozen: false, // true in screenshot staging: clocks stop, scene holds still
    elapsed: 0, // seconds since the shift started
    animTime: 0, // wall-clock for menu pulses and idle animation
    timeLeft: SHIFT_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    orders: [], // order tickets, see orders.js
    nextOrderId: 1,
    spawnTimer: 2.0, // first order arrives quickly
    firstOrderDone: false,
    chef: {
      x: CHEF_START.x, y: CHEF_START.y,
      tx: CHEF_START.x, ty: CHEF_START.y, // walk target
      path: null, // A* waypoints to the target
      walking: false, facing: 1, // 1 right, -1 left
      carry: null, // null | { kind: 'item', item } | { kind: 'plate', plate }
      bob: 0, // walk-cycle phase for the little bounce
    },
    pendingAction: null, // { run: (state) => void } fired when the chef arrives
    boards: [
      { item: null, progress: 0, state: 'empty' },
      { item: null, progress: 0, state: 'empty' },
    ],
    burners: [
      { item: null, progress: 0, state: 'empty' },
      { item: null, progress: 0, state: 'empty' },
    ],
    plates: [
      { id: 0, items: [], slot: 0 },
      { id: 1, items: [], slot: 1 },
      { id: 2, items: [], slot: 2 },
    ],
    particles: [], // { x, y, vx, vy, life, maxLife, kind, color }
    toasts: [], // { text, life, maxLife, tone }
    shakePlate: 0, // plate id shaking after a refused serve, or -1
    shakeTime: 0,
    flashServe: 0, // timer for the serve-window glow after a delivery
    mouse: { x: -1, y: -1, inside: false },
    hover: null, // hovered station key, for the highlight
    keys: new Set(),
  };
}

export function resetShift(state) {
  const fresh = createGameState();
  fresh.mode = 'playing';
  Object.assign(state, fresh);
  state.mode = 'playing';
}

export function chefCarrying(state) {
  return state.chef.carry;
}

export function chefHandsEmpty(state) {
  return state.chef.carry === null;
}

export function plateOnPass(state, slot) {
  return state.plates.find((p) => p.slot === slot) || null;
}

export function addToast(state, text, tone = 'info') {
  state.toasts.push({ text, tone, life: 2.6, maxLife: 2.6 });
  if (state.toasts.length > 3) state.toasts.shift();
}

export function addParticles(state, x, y, kind, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 90;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.6 + Math.random() * 0.5,
      maxLife: 1.1,
      kind, color,
    });
  }
  if (state.particles.length > 220) state.particles.splice(0, state.particles.length - 220);
}

export function shiftProgress(state) {
  return 1 - state.timeLeft / SHIFT_SECONDS;
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

export function floorBounds() {
  return LAYOUT.floor;
}
