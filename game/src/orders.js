// Ember & Thyme — order tickets: spawning, patience, matching plates to
// orders, and the score a delivery earns.

import {
  MAX_ORDERS, ORDER_PATIENCE, RECIPES, RECIPE_ORDER,
  SHIFT_SECONDS, SPAWN_END, SPAWN_START,
} from './config.js';
import { addToast } from './state.js';

export function patienceFor(recipe) {
  return ORDER_PATIENCE + Math.max(0, recipe.needs.length - 2) * 4;
}

export function unlockedRecipes(elapsed) {
  return RECIPE_ORDER
    .map((id) => RECIPES[id])
    .filter((r) => elapsed >= r.unlockAt);
}

export function spawnGap(elapsed) {
  const t = Math.min(1, elapsed / SHIFT_SECONDS);
  return SPAWN_START + (SPAWN_END - SPAWN_START) * t;
}

export function spawnOrder(state, recipeId) {
  if (state.orders.length >= MAX_ORDERS) return null;
  let recipe = recipeId ? RECIPES[recipeId] : null;
  if (!recipe) {
    const pool = unlockedRecipes(state.elapsed);
    recipe = pool[Math.floor(Math.random() * pool.length)];
  }
  const order = {
    id: state.nextOrderId++,
    recipeId: recipe.id,
    patience: patienceFor(recipe),
    maxPatience: patienceFor(recipe),
  };
  state.orders.push(order);
  return order;
}

// Tick patience; returns the orders that just ran out.
export function tickOrders(state, dt) {
  const expired = [];
  for (const order of state.orders) {
    order.patience -= dt;
    if (order.patience <= 0) expired.push(order);
  }
  if (expired.length > 0) {
    state.orders = state.orders.filter((o) => o.patience > 0);
    for (const order of expired) {
      state.missed += 1;
      state.combo = 0;
      addToast(state, `Missed a ${RECIPES[order.recipeId].name}! Combo lost.`, 'bad');
    }
  }
  return expired;
}

export function patienceFraction(order) {
  return Math.max(0, Math.min(1, order.patience / order.maxPatience));
}

// Do the plate's items match the recipe exactly (same multiset)?
export function plateMatchesRecipe(items, recipe) {
  if (items.length !== recipe.needs.length) return false;
  const have = items.map((i) => `${i.id}:${i.prep}`).sort().join('|');
  const want = recipe.needs.map((n) => `${n.id}:${n.prep}`).sort().join('|');
  return have === want;
}

// Find an open order this plate can complete, or null.
export function findMatchingOrder(state, items) {
  for (const order of state.orders) {
    if (plateMatchesRecipe(items, RECIPES[order.recipeId])) return order;
  }
  return null;
}

// True when some plate on the pass (or carried) already completes this order.
export function orderHasReadyPlate(state, order) {
  const recipe = RECIPES[order.recipeId];
  const plates = [...state.plates];
  if (state.chef.carry && state.chef.carry.kind === 'plate') {
    plates.push(state.chef.carry.plate);
  }
  return plates.some((p) => plateMatchesRecipe(p.items, recipe));
}

export function scoreForDelivery(order, combo) {
  const recipe = RECIPES[order.recipeId];
  const patienceBonus = Math.round(50 * patienceFraction(order));
  const comboBonus = Math.min(combo, 8) * 15;
  return recipe.base + patienceBonus + comboBonus;
}

export function completeOrder(state, order) {
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const points = scoreForDelivery(order, state.combo - 1);
  state.score += points;
  state.served += 1;
  return points;
}
