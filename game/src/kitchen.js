// Ember & Thyme — the kitchen: stations, chopping, cooking, plating and
// serving. Every player action funnels through interactWith(), which the
// mouse and keyboard handlers both call.

import {
  BURN_SECONDS, CHOP_SECONDS, COOK_SECONDS, INGREDIENTS, LAYOUT, STAND,
} from './config.js';
import {
  addParticles, addToast, chefHandsEmpty, makeItem, plateOnPass,
} from './state.js';
import { completeOrder, findMatchingOrder } from './orders.js';

// Hit rectangles for every clickable thing, in canvas coordinates.
export function hitRects() {
  const rects = [];
  const c = LAYOUT.crate;
  const pantryIds = ['tomato', 'lettuce', 'onion', 'patty', 'bun', 'cheese'];
  pantryIds.forEach((id, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    rects.push({
      key: `crate-${id}`, kind: 'crate', id,
      x: c.x0 + col * (c.w + c.gapX), y: c.y0 + row * (c.h + c.gapY),
      w: c.w, h: c.h, stand: STAND.pantry,
    });
  });
  const b = LAYOUT.burner;
  for (let i = 0; i < 2; i++) {
    rects.push({
      key: `burner-${i}`, kind: 'burner', index: i,
      x: b.x0 + i * (b.w + b.gapX), y: b.y0, w: b.w, h: b.h, stand: STAND.stove,
    });
  }
  const bd = LAYOUT.board;
  for (let i = 0; i < 2; i++) {
    rects.push({
      key: `board-${i}`, kind: 'board', index: i,
      x: bd.x0 + i * (bd.w + bd.gapX), y: bd.y0, w: bd.w, h: bd.h, stand: STAND.island,
    });
  }
  const p = LAYOUT.plate;
  for (let i = 0; i < 3; i++) {
    rects.push({
      key: `plate-${i}`, kind: 'plate', index: i,
      x: p.x0 + i * (p.w + p.gapX), y: p.y0, w: p.w, h: p.h, stand: STAND.pass,
    });
  }
  rects.push({
    key: 'serve', kind: 'serve',
    x: LAYOUT.serve.x, y: LAYOUT.serve.y, w: LAYOUT.serve.w, h: LAYOUT.serve.h,
    stand: STAND.serve,
  });
  rects.push({
    key: 'bin', kind: 'bin',
    x: LAYOUT.bin.x, y: LAYOUT.bin.y, w: LAYOUT.bin.w, h: LAYOUT.bin.h,
    stand: STAND.bin,
  });
  return rects;
}

export function hitAt(x, y) {
  const rects = hitRects();
  for (const r of rects) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r;
  }
  return null;
}

// The nearest station to the chef, measured to each station's stand point
// (where the chef stops when walking there), for keyboard interaction.
// Crates are skipped: the pantry is grabbed with keys 1-6 (see input.js).
export function nearestHit(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const r of hitRects()) {
    if (r.kind === 'crate') continue;
    const d = Math.hypot(state.chef.x - r.stand.x, state.chef.y - r.stand.y);
    if (d < bestD) { best = r; bestD = d; }
  }
  return best;
}

function plateCenter(slot) {
  const p = LAYOUT.plate;
  return {
    x: p.x0 + slot * (p.w + p.gapX) + p.w / 2,
    y: p.y0 + p.h / 2,
  };
}

function boardCenter(index) {
  const bd = LAYOUT.board;
  return { x: bd.x0 + index * (bd.w + bd.gapX) + bd.w / 2, y: bd.y0 + bd.h / 2 };
}

function burnerCenter(index) {
  const b = LAYOUT.burner;
  return { x: b.x0 + index * (b.w + b.gapX) + b.w / 2, y: b.y0 + b.h / 2 };
}

// --- Station ticks ---------------------------------------------------------

export function tickStations(state, dt) {
  for (const board of state.boards) {
    if (board.state === 'chopping') {
      board.progress += dt / CHOP_SECONDS;
      if (board.progress >= 1) {
        board.progress = 1;
        board.state = 'done';
        board.item.prep = 'chopped';
        addToast(state, `${INGREDIENTS[board.item.id].name} chopped!`, 'good');
      }
    }
  }
  for (const burner of state.burners) {
    if (burner.state === 'cooking') {
      burner.progress += dt / COOK_SECONDS;
      if (burner.progress >= 1) {
        burner.progress = 1;
        burner.state = 'done';
        burner.item.prep = 'cooked';
        addToast(state, 'Patty cooked — grab it before it burns!', 'good');
      }
    } else if (burner.state === 'done') {
      burner.burnTimer = (burner.burnTimer || 0) + dt;
      if (burner.burnTimer >= BURN_SECONDS) {
        burner.state = 'burnt';
        burner.item.prep = 'burnt';
        addToast(state, 'The patty burnt! Bin it.', 'bad');
      }
    }
  }
}

// --- Interactions ----------------------------------------------------------

function takeFromCrate(state, id) {
  if (!chefHandsEmpty(state)) {
    addToast(state, 'Hands full — plate it or bin it first.', 'bad');
    return;
  }
  state.chef.carry = { kind: 'item', item: makeItem(id, 'raw') };
}

export { takeFromCrate };

function useBoard(state, index) {
  const board = state.boards[index];
  const carry = state.chef.carry;
  if (board.state === 'empty') {
    if (!carry || carry.kind !== 'item') return;
    const ing = INGREDIENTS[carry.item.id];
    if (ing.prepAction !== 'chop' || carry.item.prep !== 'raw') {
      addToast(state, `No need to chop the ${ing.name.toLowerCase()}.`, 'bad');
      return;
    }
    board.item = carry.item;
    board.progress = 0;
    board.state = 'chopping';
    state.chef.carry = null;
    return;
  }
  if (board.state === 'chopping') {
    addToast(state, 'Still chopping…', 'info');
    return;
  }
  // done: pick the chopped item up
  if (!chefHandsEmpty(state)) {
    addToast(state, 'Hands full!', 'bad');
    return;
  }
  state.chef.carry = { kind: 'item', item: board.item };
  board.item = null;
  board.progress = 0;
  board.state = 'empty';
}

function useBurner(state, index) {
  const burner = state.burners[index];
  const carry = state.chef.carry;
  if (burner.state === 'empty') {
    if (!carry || carry.kind !== 'item') return;
    const ing = INGREDIENTS[carry.item.id];
    if (ing.prepAction !== 'cook' || carry.item.prep !== 'raw') {
      addToast(state, `The ${ing.name.toLowerCase()} doesn't go on the stove.`, 'bad');
      return;
    }
    burner.item = carry.item;
    burner.progress = 0;
    burner.burnTimer = 0;
    burner.state = 'cooking';
    state.chef.carry = null;
    return;
  }
  if (burner.state === 'cooking') {
    addToast(state, 'Still sizzling…', 'info');
    return;
  }
  // done or burnt: pick it up
  if (!chefHandsEmpty(state)) {
    addToast(state, 'Hands full!', 'bad');
    return;
  }
  state.chef.carry = { kind: 'item', item: burner.item };
  burner.item = null;
  burner.progress = 0;
  burner.burnTimer = 0;
  burner.state = 'empty';
}

function usePlate(state, slot) {
  const carry = state.chef.carry;
  const plate = plateOnPass(state, slot);
  if (carry && carry.kind === 'item') {
    if (!plate) {
      addToast(state, 'No plate in this spot.', 'bad');
      return;
    }
    if (carry.item.prep === 'burnt') {
      addToast(state, "It's burnt — bin it, don't serve it!", 'bad');
      return;
    }
    plate.items.push(carry.item);
    state.chef.carry = null;
    const c = plateCenter(slot);
    addParticles(state, c.x, c.y, 'dot', '#e9a13b', 6);
    return;
  }
  if (carry && carry.kind === 'plate') {
    // Put the carried plate back down in an empty slot.
    if (plate) {
      addToast(state, 'That spot already has a plate.', 'bad');
      return;
    }
    carry.plate.slot = slot;
    state.plates.push(carry.plate);
    state.chef.carry = null;
    return;
  }
  // Empty hands: pick the plate up.
  if (!plate) return;
  state.plates = state.plates.filter((p) => p.slot !== slot);
  state.chef.carry = { kind: 'plate', plate };
}

function useServe(state) {
  const carry = state.chef.carry;
  if (!carry || carry.kind !== 'plate') {
    addToast(state, 'Bring a finished plate to the window.', 'info');
    return;
  }
  const order = findMatchingOrder(state, carry.plate.items);
  if (!order) {
    state.shakePlate = carry.plate.id;
    state.shakeTime = 0.5;
    addToast(state, 'No order matches this dish yet.', 'bad');
    return;
  }
  const points = completeOrder(state, order);
  const c = { x: LAYOUT.serve.x + LAYOUT.serve.w / 2, y: LAYOUT.serve.y + 120 };
  addParticles(state, c.x, c.y, 'star', '#e9a13b', 18);
  addParticles(state, c.x, c.y, 'dot', '#4e8a4a', 10);
  addToast(state, `Served! +${points}  (combo x${state.combo})`, 'good');
  state.flashServe = 0.8;
  // The empty plate returns to its slot on the pass.
  carry.plate.items = [];
  state.plates.push(carry.plate);
  state.chef.carry = null;
}

function useBin(state) {
  const carry = state.chef.carry;
  if (!carry) {
    addToast(state, 'Nothing to throw away.', 'info');
    return;
  }
  if (carry.kind === 'plate') {
    carry.plate.items = [];
    state.plates.push(carry.plate);
    addToast(state, 'Plate cleared.', 'info');
  } else {
    addToast(state, `${INGREDIENTS[carry.item.id].name} binned.`, 'info');
  }
  state.chef.carry = null;
}

// The single entry point for every player action on a station.
export function interactWith(state, hit) {
  if (!hit || state.mode !== 'playing') return;
  switch (hit.kind) {
    case 'crate': takeFromCrate(state, hit.id); break;
    case 'board': useBoard(state, hit.index); break;
    case 'burner': useBurner(state, hit.index); break;
    case 'plate': usePlate(state, hit.index); break;
    case 'serve': useServe(state); break;
    case 'bin': useBin(state); break;
    default: break;
  }
}

export { boardCenter, burnerCenter, plateCenter };
