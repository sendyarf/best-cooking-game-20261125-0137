// Ember & Thyme — input: mouse clicks (walk to a station, then use it) and
// keyboard (WASD/arrows to move, E/Space to use the nearest station, 1-6 to
// grab a pantry ingredient). The chef walks on a grid A* path so it routes
// around counters instead of getting stuck on them.

import { CHEF_SPEED, INTERACT_RANGE, LAYOUT, PANTRY_ORDER } from './config.js';
import { hitAt, interactWith, nearestHit, takeFromCrate } from './kitchen.js';
import { resetShift } from './state.js';

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

const CHEF_RADIUS = 14;

// Station rects the chef cannot walk through.
function solidRects() {
  return [
    LAYOUT.pantry,
    LAYOUT.stove, LAYOUT.island, LAYOUT.pass, LAYOUT.serve, LAYOUT.bin,
  ];
}

// Push a point out of every solid rect (smallest penetration wins).
export function resolveCollisions(x, y, radius) {
  const floor = LAYOUT.floor;
  x = Math.max(floor.x + radius, Math.min(floor.x + floor.w - radius, x));
  y = Math.max(floor.y + radius, Math.min(floor.y + floor.h - radius, y));
  for (const r of solidRects()) {
    const left = r.x - radius;
    const right = r.x + r.w + radius;
    const top = r.y - radius;
    const bottom = r.y + r.h + radius;
    if (x > left && x < right && y > top && y < bottom) {
      const dl = x - left;
      const dr = right - x;
      const dt = y - top;
      const db = bottom - y;
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) x = left;
      else if (m === dr) x = right;
      else if (m === dt) y = top;
      else y = bottom;
    }
  }
  return { x, y };
}

// --- A* over the floor grid -----------------------------------------------

const CELL = 32;
const GRID_X0 = LAYOUT.floor.x;
const GRID_Y0 = LAYOUT.floor.y;
const COLS = Math.ceil(LAYOUT.floor.w / CELL);
const ROWS = Math.ceil(LAYOUT.floor.h / CELL);

function cellCenter(col, row) {
  return { x: GRID_X0 + col * CELL + CELL / 2, y: GRID_Y0 + row * CELL + CELL / 2 };
}

function cellOf(x, y) {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.floor((x - GRID_X0) / CELL))),
    row: Math.max(0, Math.min(ROWS - 1, Math.floor((y - GRID_Y0) / CELL))),
  };
}

function cellBlocked(col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  const c = cellCenter(col, row);
  for (const r of solidRects()) {
    if (c.x > r.x - CHEF_RADIUS && c.x < r.x + r.w + CHEF_RADIUS
      && c.y > r.y - CHEF_RADIUS && c.y < r.y + r.h + CHEF_RADIUS) return true;
  }
  return false;
}

// A* from (sx, sy) to (tx, ty). Returns waypoints (cell centres, then the
// exact target) or null when no route exists.
export function findPath(sx, sy, tx, ty) {
  const start = cellOf(sx, sy);
  const goal = cellOf(tx, ty);
  const key = (c, r) => r * COLS + c;
  const startKey = key(start.col, start.row);
  const goalKey = key(goal.col, goal.row);
  const open = [{ col: start.col, row: start.row, g: 0, f: 0 }];
  const came = new Map();
  const gScore = new Map([[startKey, 0]]);
  const closed = new Set();
  const heuristic = (c, r) => Math.hypot(c - goal.col, r - goal.row);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    const ck = key(cur.col, cur.row);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (ck === goalKey) {
      const cells = [];
      let node = cur;
      while (node) {
        cells.unshift(node);
        node = came.get(key(node.col, node.row));
      }
      return cells.map((n) => cellCenter(n.col, n.row)).concat([{ x: tx, y: ty }]);
    }
    for (const [dc, dr] of DIRS) {
      const nc = cur.col + dc;
      const nr = cur.row + dr;
      if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
      const nk = key(nc, nr);
      if (closed.has(nk)) continue;
      const isGoal = nk === goalKey;
      const isStart = nk === startKey;
      if (!isGoal && !isStart && cellBlocked(nc, nr)) continue;
      if (dc !== 0 && dr !== 0) {
        // No cutting corners around a counter.
        if (cellBlocked(cur.col + dc, cur.row) || cellBlocked(cur.col, cur.row + dr)) continue;
      }
      const ng = cur.g + (dc !== 0 && dr !== 0 ? 1.414 : 1);
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        came.set(nk, cur);
        open.push({ col: nc, row: nr, g: ng, f: ng + heuristic(nc, nr) });
      }
    }
  }
  return null;
}

export function startWalk(state, tx, ty) {
  const path = findPath(state.chef.x, state.chef.y, tx, ty);
  state.chef.tx = tx;
  state.chef.ty = ty;
  state.chef.path = path || [{ x: tx, y: ty }];
  state.chef.walking = true;
}

// Follow the path one waypoint at a time; returns true on arrival.
export function walkChef(state, dt) {
  const c = state.chef;
  if (!c.path || c.path.length === 0) {
    c.walking = false;
    return true;
  }
  const wp = c.path[0];
  const dx = wp.x - c.x;
  const dy = wp.y - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) {
    c.path.shift();
    if (c.path.length === 0) {
      c.x = c.tx;
      c.y = c.ty;
      c.walking = false;
      return true;
    }
    return false;
  }
  const step = Math.min(dist, CHEF_SPEED * dt);
  const nx = c.x + (dx / dist) * step;
  const ny = c.y + (dy / dist) * step;
  const fixed = resolveCollisions(nx, ny, CHEF_RADIUS);
  c.x = fixed.x;
  c.y = fixed.y;
  if (Math.abs(dx) > 2) c.facing = dx > 0 ? 1 : -1;
  c.walking = true;
  c.bob += dt * 11;
  return false;
}

// Keyboard movement, applied every frame while keys are held.
export function moveChefByKeys(state, dt) {
  const c = state.chef;
  let mx = 0;
  let my = 0;
  for (const code of state.keys) {
    const dir = MOVE_KEYS[code];
    if (dir) { mx += dir[0]; my += dir[1]; }
  }
  if (mx === 0 && my === 0) return false;
  const len = Math.hypot(mx, my);
  const nx = c.x + (mx / len) * CHEF_SPEED * dt;
  const ny = c.y + (my / len) * CHEF_SPEED * dt;
  const fixed = resolveCollisions(nx, ny, CHEF_RADIUS);
  c.x = fixed.x;
  c.y = fixed.y;
  // Keyboard movement cancels any click-to-walk.
  c.tx = c.x;
  c.ty = c.y;
  c.path = null;
  c.walking = true;
  c.bob += dt * 11;
  if (mx !== 0) c.facing = mx > 0 ? 1 : -1;
  state.pendingAction = null;
  return true;
}

// Use the nearest station to the chef (keyboard E / Space).
export function interactNearest(state) {
  if (state.mode !== 'playing') return;
  const hit = nearestHit(state, INTERACT_RANGE);
  if (hit) interactWith(state, hit);
}

// A click: in menus it starts/restarts; in play it walks the chef to the
// station and uses it on arrival (or just walks to empty floor).
export function handleClick(state, x, y) {
  if (state.mode === 'menu') {
    resetShift(state);
    return;
  }
  if (state.mode === 'over') {
    resetShift(state);
    return;
  }
  const hit = hitAt(x, y);
  if (hit) {
    startWalk(state, hit.stand.x, hit.stand.y);
    state.pendingAction = { hit };
  } else {
    const fixed = resolveCollisions(x, y, CHEF_RADIUS);
    startWalk(state, fixed.x, fixed.y);
    state.pendingAction = null;
  }
}

// Wire DOM events to the state. Returns a cleanup function.
export function bindInput(canvas, state, onFirstGesture) {
  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onMouseMove(e) {
    const p = toCanvas(e);
    state.mouse.x = p.x;
    state.mouse.y = p.y;
    state.mouse.inside = true;
    const hit = hitAt(p.x, p.y);
    state.hover = hit ? hit.key : null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
  }

  function onMouseLeave() {
    state.mouse.inside = false;
    state.hover = null;
  }

  function onClick(e) {
    if (onFirstGesture) onFirstGesture();
    const p = toCanvas(e);
    handleClick(state, p.x, p.y);
  }

  function onKeyDown(e) {
    if (onFirstGesture) onFirstGesture();
    if (e.code === 'Enter' && state.mode === 'menu') {
      resetShift(state);
      return;
    }
    if (e.code === 'KeyR' && (state.mode === 'over' || state.mode === 'playing')) {
      resetShift(state);
      return;
    }
    if (e.code === 'KeyE' || e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) interactNearest(state);
      return;
    }
    // Keys 1-6 grab an ingredient from the pantry (hands must be empty).
    if (/^Digit[1-6]$/.test(e.code) && state.mode === 'playing' && !e.repeat) {
      const id = PANTRY_ORDER[Number(e.code.slice(5)) - 1];
      takeFromCrate(state, id);
      return;
    }
    if (MOVE_KEYS[e.code]) {
      e.preventDefault();
      state.keys.add(e.code);
    }
  }

  function onKeyUp(e) {
    state.keys.delete(e.code);
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
