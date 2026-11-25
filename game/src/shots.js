// Ember & Thyme — screenshot staging: ?shot=<name>&seed=<n> deterministically
// stages a scene so screenshots are real renders of the game's own code.
// Without a query param the game plays normally from the menu.
// The staged scene is frozen (clocks stop) so the render is stable.

import { RECIPES, SHIFT_SECONDS } from './config.js';
import { makeItem } from './state.js';

function setOrder(state, id, recipeId, patienceFrac) {
  const recipe = RECIPES[recipeId];
  const max = 52 + Math.max(0, recipe.needs.length - 2) * 4;
  state.orders.push({
    id,
    recipeId,
    patience: max * patienceFrac,
    maxPatience: max,
  });
  state.nextOrderId = Math.max(state.nextOrderId, id + 1);
}

function placeChef(state, x, y, carry) {
  state.chef.x = x;
  state.chef.y = y;
  state.chef.tx = x;
  state.chef.ty = y;
  state.chef.walking = false;
  state.chef.carry = carry || null;
}

function freeze(state) {
  state.mode = 'playing';
  state.frozen = true;
}

// Cover: mid-shift, 3 tickets, ingredients out, a dish mid-assembly, the
// timer running, one finished plate ready to serve.
function stageCover(state) {
  state.elapsed = 74;
  state.timeLeft = 106;
  state.score = 845;
  state.combo = 3;
  state.bestCombo = 4;
  state.served = 6;
  state.missed = 1;
  setOrder(state, 1, 'classic-burger', 0.72);
  setOrder(state, 2, 'garden-salad', 0.45);
  setOrder(state, 3, 'deluxe-burger', 0.85);
  // Board 0: tomato mid-chop. Burner 0: patty mid-cook.
  state.boards[0] = { item: makeItem('tomato', 'raw'), progress: 0.55, state: 'chopping' };
  state.burners[0] = { item: makeItem('patty', 'raw'), progress: 0.6, state: 'cooking', burnTimer: 0 };
  // Plate 0: finished Classic Burger, ready to serve.
  state.plates[0].items = [
    makeItem('bun', 'raw'),
    makeItem('patty', 'cooked'),
    makeItem('tomato', 'chopped'),
  ];
  // Plate 1: Garden Salad mid-assembly (one item on, one to go).
  state.plates[1].items = [makeItem('tomato', 'chopped')];
  // Plate 2: empty.
  // Chef carries a chopped lettuce toward the pass.
  placeChef(state, 700, 520, { kind: 'item', item: makeItem('lettuce', 'chopped') });
  freeze(state);
}

// Orders rush: four tickets, one nearly out of patience, timer nearly done.
function stageOrders(state) {
  state.elapsed = 132;
  state.timeLeft = 48;
  state.score = 1420;
  state.combo = 5;
  state.bestCombo = 6;
  state.served = 11;
  state.missed = 2;
  setOrder(state, 1, 'garden-salad', 0.12);
  setOrder(state, 2, 'deluxe-burger', 0.4);
  setOrder(state, 3, 'hearty-salad', 0.62);
  setOrder(state, 4, 'cheese-melt', 0.9);
  state.boards[0] = { item: makeItem('onion', 'raw'), progress: 0.8, state: 'chopping' };
  state.boards[1] = { item: makeItem('tomato', 'chopped'), progress: 1, state: 'done' };
  state.burners[1] = { item: makeItem('patty', 'cooked'), progress: 1, state: 'done', burnTimer: 2 };
  state.plates[0].items = [makeItem('lettuce', 'chopped'), makeItem('tomato', 'chopped')];
  state.plates[2].items = [makeItem('bun', 'raw')];
  placeChef(state, 480, 480, null);
  freeze(state);
}

// Cooking in progress: both burners sizzling, both boards chopping.
function stageCooking(state) {
  state.elapsed = 58;
  state.timeLeft = 122;
  state.score = 620;
  state.combo = 2;
  state.bestCombo = 3;
  state.served = 4;
  state.missed = 0;
  setOrder(state, 1, 'classic-burger', 0.66);
  setOrder(state, 2, 'cheese-melt', 0.8);
  state.boards[0] = { item: makeItem('tomato', 'raw'), progress: 0.4, state: 'chopping' };
  state.boards[1] = { item: makeItem('lettuce', 'raw'), progress: 0.75, state: 'chopping' };
  state.burners[0] = { item: makeItem('patty', 'raw'), progress: 0.35, state: 'cooking', burnTimer: 0 };
  state.burners[1] = { item: makeItem('patty', 'cooked'), progress: 1, state: 'done', burnTimer: 1 };
  state.plates[0].items = [makeItem('bun', 'raw'), makeItem('cheese', 'raw')];
  placeChef(state, 478, 280, { kind: 'item', item: makeItem('patty', 'raw') });
  freeze(state);
}

// Serving moment: chef carries a finished Deluxe Burger to the window.
function stageServe(state) {
  state.elapsed = 118;
  state.timeLeft = 62;
  state.score = 1290;
  state.combo = 4;
  state.bestCombo = 5;
  state.served = 9;
  state.missed = 1;
  setOrder(state, 1, 'deluxe-burger', 0.55);
  setOrder(state, 2, 'garden-salad', 0.75);
  // The carried plate is the finished Deluxe Burger; its slot is empty.
  const plate = state.plates[0];
  state.plates = state.plates.filter((p) => p.slot !== 0);
  plate.items = [
    makeItem('bun', 'raw'),
    makeItem('patty', 'cooked'),
    makeItem('tomato', 'chopped'),
    makeItem('onion', 'chopped'),
    makeItem('cheese', 'raw'),
  ];
  state.plates[0].items = [makeItem('tomato', 'chopped')];
  placeChef(state, 1060, 500, { kind: 'plate', plate });
  state.flashServe = 0.8;
  freeze(state);
}

const STAGES = {
  cover: stageCover,
  orders: stageOrders,
  cooking: stageCooking,
  serve: stageServe,
};

// Apply the ?shot= stage if one is requested. Returns the stage name or null.
export function applyShotParam(state) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const stage = STAGES[shot];
  if (!stage) return null;
  stage(state);
  return shot;
}

export { SHIFT_SECONDS };
