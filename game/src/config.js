// Ember & Thyme — configuration: palette, recipes, timings and kitchen layout.
// Every tunable number lives here so the other modules stay small and focused.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// One warm bistro palette: cream walls, warm wood, tomato red, basil green,
// dark charcoal text. No gradients, no neon.
export const PALETTE = {
  wall: '#f7ead7',
  wallShadow: '#ecd9b8',
  floorA: '#e3c99b',
  floorB: '#d9bc87',
  floorLine: '#c8a76e',
  woodTop: '#a9713f',
  woodEdge: '#7d4f27',
  woodDark: '#5f3a1c',
  boardDark: '#4a3220',
  ticket: '#fff8ea',
  ticketEdge: '#d9c39a',
  tomato: '#d94f3d',
  tomatoDark: '#b23a2b',
  basil: '#4e8a4a',
  basilDark: '#356b33',
  cheese: '#f2b234',
  cheeseDark: '#d18f1d',
  bun: '#e8a85c',
  bunDark: '#c9833c',
  patty: '#7a4a2b',
  pattyDark: '#5d3419',
  onion: '#e9dff2',
  onionDark: '#b9a4cc',
  lettuce: '#7fb069',
  lettuceDark: '#5d8a4c',
  cream: '#fff6e3',
  ink: '#2b2622',
  inkSoft: '#5c534a',
  paper: '#fdf3dc',
  steel: '#b8bcc0',
  steelDark: '#8f959a',
  flame: '#f08a24',
  gold: '#e9a13b',
  danger: '#c0392b',
  ok: '#3d8b4f',
};

// Ingredients the pantry stocks. prepAction: null (serve as-is), 'chop' or 'cook'.
export const INGREDIENTS = {
  tomato: { id: 'tomato', name: 'Tomato', prepAction: 'chop', color: '#d94f3d', dark: '#b23a2b' },
  lettuce: { id: 'lettuce', name: 'Lettuce', prepAction: 'chop', color: '#7fb069', dark: '#5d8a4c' },
  onion: { id: 'onion', name: 'Onion', prepAction: 'chop', color: '#e9dff2', dark: '#b9a4cc' },
  patty: { id: 'patty', name: 'Patty', prepAction: 'cook', color: '#7a4a2b', dark: '#5d3419' },
  bun: { id: 'bun', name: 'Bun', prepAction: null, color: '#e8a85c', dark: '#c9833c' },
  cheese: { id: 'cheese', name: 'Cheese', prepAction: null, color: '#f2b234', dark: '#d18f1d' },
};

export const PANTRY_ORDER = ['tomato', 'lettuce', 'onion', 'patty', 'bun', 'cheese'];

// A recipe is a list of prepared items. An item matches when id and prep match.
export const RECIPES = {
  'garden-salad': {
    id: 'garden-salad', name: 'Garden Salad', base: 100, unlockAt: 0,
    needs: [
      { id: 'tomato', prep: 'chopped' },
      { id: 'lettuce', prep: 'chopped' },
    ],
  },
  'cheese-melt': {
    id: 'cheese-melt', name: 'Cheese Melt', base: 140, unlockAt: 0,
    needs: [
      { id: 'bun', prep: 'raw' },
      { id: 'cheese', prep: 'raw' },
      { id: 'patty', prep: 'cooked' },
    ],
  },
  'classic-burger': {
    id: 'classic-burger', name: 'Classic Burger', base: 150, unlockAt: 35,
    needs: [
      { id: 'bun', prep: 'raw' },
      { id: 'patty', prep: 'cooked' },
      { id: 'tomato', prep: 'chopped' },
    ],
  },
  'hearty-salad': {
    id: 'hearty-salad', name: 'Hearty Salad', base: 170, unlockAt: 70,
    needs: [
      { id: 'lettuce', prep: 'chopped' },
      { id: 'tomato', prep: 'chopped' },
      { id: 'onion', prep: 'chopped' },
      { id: 'cheese', prep: 'raw' },
    ],
  },
  'deluxe-burger': {
    id: 'deluxe-burger', name: 'Deluxe Burger', base: 210, unlockAt: 105,
    needs: [
      { id: 'bun', prep: 'raw' },
      { id: 'patty', prep: 'cooked' },
      { id: 'tomato', prep: 'chopped' },
      { id: 'onion', prep: 'chopped' },
      { id: 'cheese', prep: 'raw' },
    ],
  },
};

export const RECIPE_ORDER = ['garden-salad', 'cheese-melt', 'classic-burger', 'hearty-salad', 'deluxe-burger'];

// Timings (seconds).
export const SHIFT_SECONDS = 180;
export const CHOP_SECONDS = 2.4;
export const COOK_SECONDS = 4.0;
export const BURN_SECONDS = 6.0; // cooked patty burns this long after it is done
export const ORDER_PATIENCE = 52; // base patience, +4s per item beyond the second
export const SPAWN_START = 13; // first gap between orders
export const SPAWN_END = 7.5; // gap once the rush is on
export const MAX_ORDERS = 4;
export const CHEF_SPEED = 300; // px per second
export const INTERACT_RANGE = 140; // px from a station's stand point, for keyboard interaction

// Layout rectangles. The canvas is 1280x720: order board on top, pantry on the
// left, stove top-centre, chopping island centre, plates + serve window right.
export const LAYOUT = {
  orderBoard: { x: 0, y: 0, w: 1280, h: 118 },
  ticket: { w: 168, h: 98, x0: 14, gap: 10, y: 10 },
  hud: { x: 1010, y: 0, w: 270, h: 118 },
  pantry: { x: 12, y: 132, w: 196, h: 492 },
  crate: { w: 86, h: 138, gapX: 10, gapY: 12, x0: 20, y0: 168 },
  stove: { x: 268, y: 132, w: 420, h: 128 },
  burner: { w: 150, h: 84, gapX: 24, x0: 316, y0: 158 },
  island: { x: 268, y: 300, w: 420, h: 150 },
  board: { w: 150, h: 104, gapX: 24, x0: 316, y0: 330 },
  pass: { x: 740, y: 132, w: 340, h: 318 },
  plate: { w: 100, h: 100, gapX: 10, x0: 758, y0: 210 },
  serve: { x: 1090, y: 132, w: 178, h: 318 },
  bin: { x: 1190, y: 545, w: 70, h: 85 },
  helpBar: { x: 0, y: 640, w: 1280, h: 80 },
  floor: { x: 220, y: 130, w: 1040, h: 500 },
};

// Where the chef stands to use each station (walk targets).
export const STAND = {
  pantry: { x: 238, y: 380 },
  stove: { x: 478, y: 280 },
  island: { x: 478, y: 480 },
  pass: { x: 830, y: 470 },
  serve: { x: 1140, y: 480 },
  bin: { x: 1140, y: 585 },
};

export const CHEF_START = { x: 600, y: 560 };

// Deterministic pseudo-random generator for screenshot staging.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
