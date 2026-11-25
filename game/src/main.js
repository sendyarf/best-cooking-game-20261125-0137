// Ember & Thyme — main: the game loop. Wires state, input, kitchen,
// orders and rendering together, and applies ?shot= staging for screenshots.

import { SHIFT_SECONDS } from './config.js';
import { createGameState } from './state.js';
import { spawnGap, spawnOrder, tickOrders } from './orders.js';
import { interactWith, tickStations } from './kitchen.js';
import { bindInput, moveChefByKeys, walkChef } from './input.js';
import { render } from './render.js';
import { applyShotParam } from './shots.js';
import { ensureAudio, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createGameState();

// Exposed for playtesting and debugging from the browser console.
window.emberThyme = { state };

applyShotParam(state);
bindInput(canvas, state, () => ensureAudio());

let lastTime = performance.now();

function updateParticles(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function updateToasts(dt) {
  for (const t of state.toasts) t.life -= dt;
  state.toasts = state.toasts.filter((t) => t.life > 0);
}

function updatePlaying(dt) {
  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.mode = 'over';
    state.chef.carry = null;
    state.pendingAction = null;
    return;
  }
  // New orders arrive on a shrinking gap as the shift heats up.
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    if (!state.firstOrderDone) {
      spawnOrder(state, 'garden-salad');
      state.firstOrderDone = true;
    } else {
      spawnOrder(state);
    }
    state.spawnTimer = spawnGap(state.elapsed);
  }
  const missed = tickOrders(state, dt);
  if (missed.length > 0) sfx.miss();
  tickStations(state, dt);
}

function updateChef(dt) {
  // Keyboard movement takes priority; otherwise walk to the click target.
  const movedByKeys = moveChefByKeys(state, dt);
  if (!movedByKeys && state.chef.walking) {
    const arrived = walkChef(state, dt);
    if (arrived && state.pendingAction) {
      const action = state.pendingAction;
      state.pendingAction = null;
      interactWith(state, action.hit);
      if (action.hit.kind === 'crate') sfx.pickup();
      if (action.hit.kind === 'board') sfx.chop();
      if (action.hit.kind === 'burner') sfx.sizzle();
      if (action.hit.kind === 'plate') sfx.plate();
      if (action.hit.kind === 'serve') sfx.serve();
    }
  }
  if (!state.chef.walking && !movedByKeys) {
    state.chef.walking = false;
  }
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  state.animTime += dt;

  if (state.mode === 'playing') {
    if (!state.frozen) {
      updatePlaying(dt);
      updateChef(dt);
    }
    updateParticles(dt);
    updateToasts(dt);
    if (state.shakeTime > 0) state.shakeTime -= dt;
    if (state.flashServe > 0) state.flashServe -= dt;
  } else if (state.mode === 'over' || state.mode === 'menu') {
    updateParticles(dt);
    updateToasts(dt);
  }

  render(ctx, state);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Keep the shift length honest: the dossier lists SHIFT_SECONDS as used.
export { SHIFT_SECONDS };
