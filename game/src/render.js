// Ember & Thyme — rendering: every pixel of the kitchen, drawn on one canvas.
// The layout is built so a single 1280x720 frame shows the order board, the
// pantry, the stove, the chopping boards, the plating pass, the serve window,
// the timer and the chef at once.

import { INGREDIENTS, LAYOUT, PALETTE, PANTRY_ORDER, RECIPES } from './config.js';
import { formatClock } from './state.js';
import { orderHasReadyPlate, patienceFraction } from './orders.js';
import { drawIngredient, drawPlate, drawTicketIcon } from './food.js';
import { hitRects } from './kitchen.js';

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Trebuchet MS", Verdana, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, font, color, align = 'left', baseline = 'alphabetic') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
}

// --- Kitchen shell ---------------------------------------------------------

function drawFloorAndWalls(ctx) {
  // Cream wall band behind the order board is the board itself; below it,
  // warm wooden floorboards.
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, LAYOUT.orderBoard.h, 1280, 720 - LAYOUT.orderBoard.h);
  ctx.fillStyle = PALETTE.floorB;
  for (let y = LAYOUT.orderBoard.h + 42; y < 720; y += 84) {
    ctx.fillRect(0, y, 1280, 42);
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 2;
  for (let y = LAYOUT.orderBoard.h; y < 720; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(1280, y + 0.5);
    ctx.stroke();
  }
  // A warm rug under the chef's working area.
  ctx.fillStyle = '#d9a05b';
  rr(ctx, 300, 480, 620, 140, 18);
  ctx.fill();
  ctx.strokeStyle = '#b57e3e';
  ctx.lineWidth = 3;
  rr(ctx, 312, 492, 596, 116, 12);
  ctx.stroke();
}

function drawCounter(ctx, rect, label) {
  ctx.fillStyle = 'rgba(43,38,34,0.16)';
  rr(ctx, rect.x + 4, rect.y + 8, rect.w, rect.h, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.woodEdge;
  rr(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.woodTop;
  rr(ctx, rect.x, rect.y, rect.w, rect.h - 14, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, rect.x + 6, rect.y + 4, rect.w - 12, 10, 5);
  ctx.fill();
  if (label) {
    text(ctx, label, rect.x + 14, rect.y + 16, `700 13px ${SANS}`, '#f3dfba', 'left', 'middle');
  }
}

// --- Order board + HUD -----------------------------------------------------

function drawTicket(ctx, state, order, index) {
  const t = LAYOUT.ticket;
  const x = t.x0 + index * (t.w + t.gap);
  const y = t.y;
  const recipe = RECIPES[order.recipeId];
  const ready = orderHasReadyPlate(state, order);
  const frac = patienceFraction(order);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  rr(ctx, x + 3, y + 4, t.w, t.h, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.ticket;
  rr(ctx, x, y, t.w, t.h, 8);
  ctx.fill();
  ctx.strokeStyle = ready ? PALETTE.gold : PALETTE.ticketEdge;
  ctx.lineWidth = ready ? 3 : 1.5;
  rr(ctx, x + 1, y + 1, t.w - 2, t.h - 2, 7);
  ctx.stroke();

  text(ctx, recipe.name, x + 10, y + 20, `700 15px ${SERIF}`, PALETTE.ink);
  if (ready) {
    text(ctx, 'READY ✓', x + t.w - 8, y + 20, `700 11px ${SANS}`, PALETTE.ok, 'right');
  }
  // Needed ingredients as icons (tighter spacing for big recipes).
  const step = recipe.needs.length > 3 ? 30 : 34;
  recipe.needs.forEach((need, i) => {
    const ix = x + 22 + i * step;
    drawTicketIcon(ctx, ix, y + 50, 28, need.id, need.prep);
  });
  // Patience bar.
  const bw = t.w - 20;
  ctx.fillStyle = '#e5d6b8';
  rr(ctx, x + 10, y + t.h - 16, bw, 8, 4);
  ctx.fill();
  const barColor = frac > 0.5 ? PALETTE.basil : frac > 0.25 ? PALETTE.cheeseDark : PALETTE.danger;
  ctx.fillStyle = barColor;
  rr(ctx, x + 10, y + t.h - 16, Math.max(8, bw * frac), 8, 4);
  ctx.fill();
}

function drawOrderBoard(ctx, state) {
  const b = LAYOUT.orderBoard;
  ctx.fillStyle = PALETTE.boardDark;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(b.x, b.y + b.h - 6, b.w, 6);
  state.orders.forEach((order, i) => drawTicket(ctx, state, order, i));
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet — the lunch rush is coming…', 24, 60, `italic 16px ${SERIF}`, '#d9c39a');
  }
  // Bistro wordmark in the middle gap.
  text(ctx, 'EMBER & THYME', 850, 34, `700 21px ${SERIF}`, '#f3dfba', 'center');
  text(ctx, 'BISTRO RUSH', 850, 56, `700 11px ${SANS}`, '#c9a878', 'center');
  if (state.combo >= 2) {
    ctx.fillStyle = PALETTE.gold;
    rr(ctx, 800, 68, 100, 30, 15);
    ctx.fill();
    text(ctx, `COMBO x${state.combo}`, 850, 89, `700 14px ${SANS}`, PALETTE.ink, 'center', 'middle');
  }
  // HUD: timer + score, top right.
  const hx = 1030;
  const lowTime = state.timeLeft <= 30 && state.mode === 'playing';
  text(ctx, 'SHIFT', hx + 110, 24, `700 12px ${SANS}`, '#c9a878', 'center');
  text(ctx, formatClock(state.timeLeft), hx + 110, 62, `700 34px ${SERIF}`, lowTime ? '#ff8a7a' : '#fff6e3', 'center');
  text(ctx, `SCORE  ${state.score}`, hx + 110, 92, `700 16px ${SANS}`, '#f3dfba', 'center');
  text(ctx, `served ${state.served}   missed ${state.missed}`, hx + 110, 110, `12px ${SANS}`, '#c9a878', 'center');
}

// --- Stations ---------------------------------------------------------------

function drawPantry(ctx, state) {
  const p = LAYOUT.pantry;
  drawCounter(ctx, p, 'PANTRY');
  const c = LAYOUT.crate;
  PANTRY_ORDER.forEach((id, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = c.x0 + col * (c.w + c.gapX);
    const y = c.y0 + row * (c.h + c.gapY);
    const hovered = state.hover === `crate-${id}`;
    ctx.fillStyle = hovered ? '#8a5a2e' : PALETTE.woodDark;
    rr(ctx, x, y, c.w, c.h, 10);
    ctx.fill();
    ctx.fillStyle = '#6b4423';
    rr(ctx, x + 5, y + 5, c.w - 10, c.h - 10, 8);
    ctx.fill();
    // Crate contents: a little pile of the ingredient.
    drawIngredient(ctx, x + c.w / 2 - 12, y + 52, 52, id, 'raw');
    drawIngredient(ctx, x + c.w / 2 + 14, y + 58, 46, id, 'raw');
    drawIngredient(ctx, x + c.w / 2, y + 78, 54, id, 'raw');
    text(ctx, INGREDIENTS[id].name, x + c.w / 2, y + c.h - 26, `700 14px ${SANS}`, '#f3dfba', 'center');
    const action = INGREDIENTS[id].prepAction;
    text(ctx, action === 'chop' ? 'chop it' : action === 'cook' ? 'grill it' : 'ready to plate', x + c.w / 2, y + c.h - 9, `11px ${SANS}`, '#c9a878', 'center');
  });
}

function drawProgressRing(ctx, x, y, r, frac, color) {
  ctx.strokeStyle = 'rgba(43,38,34,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
}

function drawStove(ctx, state) {
  const s = LAYOUT.stove;
  // Steel stove body.
  ctx.fillStyle = 'rgba(43,38,34,0.16)';
  rr(ctx, s.x + 4, s.y + 8, s.w, s.h, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.steelDark;
  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.steel;
  rr(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 18, 10);
  ctx.fill();
  text(ctx, 'STOVE', s.x + 14, s.y + 15, `700 13px ${SANS}`, PALETTE.inkSoft, 'left', 'middle');
  const b = LAYOUT.burner;
  state.burners.forEach((burner, i) => {
    const x = b.x0 + i * (b.w + b.gapX);
    const y = b.y0;
    const cx = x + b.w / 2;
    const cy = y + b.h / 2;
    const hovered = state.hover === `burner-${i}`;
    // Burner ring.
    ctx.fillStyle = hovered ? '#3a3f45' : '#2f3338';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 62, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22262a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 54, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    if (burner.state === 'cooking') {
      // Flame licks.
      ctx.fillStyle = PALETTE.flame;
      for (const dx of [-34, -12, 10, 30]) {
        const h = 10 + ((state.elapsed * 30 + dx * 7) % 8);
        ctx.beginPath();
        ctx.ellipse(cx + dx, cy + 18 - h / 2, 7, h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (burner.item) {
      drawIngredient(ctx, cx, cy - 4, 58, burner.item.id, burner.item.prep);
      if (burner.state === 'cooking') {
        drawProgressRing(ctx, cx + 52, cy - 26, 12, burner.progress, PALETTE.flame);
      } else if (burner.state === 'done') {
        const burnFrac = Math.min(1, (burner.burnTimer || 0) / 6);
        ctx.fillStyle = burnFrac > 0.6 ? PALETTE.danger : PALETTE.ok;
        ctx.beginPath();
        ctx.arc(cx + 52, cy - 26, 12, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, '✓', cx + 52, cy - 26, `700 13px ${SANS}`, '#fff', 'center', 'middle');
        if (burnFrac > 0.25) {
          ctx.fillStyle = PALETTE.danger;
          rr(ctx, cx - 30, cy + 30, 60 * burnFrac, 5, 2);
          ctx.fill();
        }
      } else if (burner.state === 'burnt') {
        text(ctx, 'BURNT!', cx, cy + 34, `700 12px ${SANS}`, PALETTE.danger, 'center');
      }
    } else {
      text(ctx, 'empty burner', cx, cy + 6, `12px ${SANS}`, '#6d7276', 'center', 'middle');
    }
  });
}

function drawIsland(ctx, state) {
  const isl = LAYOUT.island;
  drawCounter(ctx, isl, 'CHOPPING');
  const bd = LAYOUT.board;
  state.boards.forEach((board, i) => {
    const x = bd.x0 + i * (bd.w + bd.gapX);
    const y = bd.y0;
    const hovered = state.hover === `board-${i}`;
    ctx.fillStyle = hovered ? '#c89a5e' : '#b98a4e';
    rr(ctx, x, y, bd.w, bd.h, 10);
    ctx.fill();
    ctx.fillStyle = '#a87a3e';
    rr(ctx, x + 6, y + 6, bd.w - 12, bd.h - 12, 8);
    ctx.fill();
    const cx = x + bd.w / 2;
    const cy = y + bd.h / 2;
    if (board.item) {
      const jiggle = board.state === 'chopping' ? Math.sin(state.elapsed * 28) * 2 : 0;
      drawIngredient(ctx, cx + jiggle, cy, 62, board.item.id, board.state === 'done' ? 'chopped' : 'raw');
      if (board.state === 'chopping') {
        // Knife chopping above the food.
        const ky = cy - 34 + Math.abs(Math.sin(state.elapsed * 14)) * 14;
        ctx.fillStyle = '#d7dade';
        rr(ctx, cx + 26, ky - 6, 34, 10, 3);
        ctx.fill();
        ctx.fillStyle = PALETTE.woodDark;
        rr(ctx, cx + 58, ky - 4, 16, 7, 3);
        ctx.fill();
        drawProgressRing(ctx, cx + 56, cy - 34, 12, board.progress, PALETTE.basil);
      } else if (board.state === 'done') {
        ctx.fillStyle = PALETTE.ok;
        ctx.beginPath();
        ctx.arc(cx + 56, cy - 34, 12, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, '✓', cx + 56, cy - 34, `700 13px ${SANS}`, '#fff', 'center', 'middle');
      }
    } else {
      text(ctx, 'board', cx, cy, `13px ${SANS}`, '#7d5a30', 'center', 'middle');
    }
  });
}

function drawPass(ctx, state) {
  const p = LAYOUT.pass;
  drawCounter(ctx, p, 'PLATING PASS');
  const pl = LAYOUT.plate;
  for (let slot = 0; slot < 3; slot++) {
    const x = pl.x0 + slot * (pl.w + pl.gapX);
    const y = pl.y0;
    const cx = x + pl.w / 2;
    const cy = y + pl.h / 2;
    const hovered = state.hover === `plate-${slot}`;
    const plate = state.plates.find((pp) => pp.slot === slot);
    if (hovered) {
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      rr(ctx, x - 4, y - 4, pl.w + 8, pl.h + 8, 12);
      ctx.stroke();
    }
    if (plate) {
      const ready = plate.items.length > 0 && state.orders.some(
        (o) => JSON.stringify([...plate.items].map((i) => `${i.id}:${i.prep}`).sort())
          === JSON.stringify([...RECIPES[o.recipeId].needs].map((n) => `${n.id}:${n.prep}`).sort()),
      );
      drawPlate(ctx, cx, cy, 44, plate.items, ready);
      if (plate.items.length === 0) {
        text(ctx, 'empty plate', cx, cy + 60, `12px ${SANS}`, '#c9a878', 'center');
      } else if (ready) {
        text(ctx, 'READY TO SERVE', cx, cy + 60, `700 12px ${SANS}`, PALETTE.ok, 'center');
      } else {
        text(ctx, `${plate.items.length} item${plate.items.length > 1 ? 's' : ''} on plate`, cx, cy + 60, `12px ${SANS}`, '#f3dfba', 'center');
      }
    } else {
      ctx.strokeStyle = 'rgba(243,223,186,0.5)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'plate out', cx, cy + 60, `12px ${SANS}`, '#c9a878', 'center');
    }
  }
}

function drawServe(ctx, state) {
  const s = LAYOUT.serve;
  const glow = state.flashServe > 0;
  ctx.fillStyle = 'rgba(43,38,34,0.16)';
  rr(ctx, s.x + 4, s.y + 8, s.w, s.h, 12);
  ctx.fill();
  ctx.fillStyle = glow ? '#8a5a2e' : PALETTE.woodEdge;
  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.wall;
  rr(ctx, s.x + 10, s.y + 10, s.w - 20, s.h - 60, 8);
  ctx.fill();
  // Window: a glimpse of the dining room.
  ctx.fillStyle = '#f3e3c2';
  rr(ctx, s.x + 18, s.y + 18, s.w - 36, 130, 6);
  ctx.fill();
  text(ctx, 'DINING ROOM', s.x + s.w / 2, s.y + 40, `700 12px ${SANS}`, PALETTE.inkSoft, 'center');
  // Two little diners waiting.
  for (const [dx, skin, shirt] of [[-38, '#e8b98a', PALETTE.tomato], [38, '#c98d5f', PALETTE.basil]]) {
    const cx = s.x + s.w / 2 + dx;
    const cy = s.y + 100;
    ctx.fillStyle = shirt;
    rr(ctx, cx - 22, cy + 6, 44, 34, 10);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 16, Math.PI, 0);
    ctx.fill();
  }
  // Service bell.
  const bx = s.x + s.w / 2;
  const by = s.y + 196;
  const hovered = state.hover === 'serve';
  ctx.fillStyle = hovered || glow ? '#f8cd6d' : PALETTE.gold;
  ctx.beginPath();
  ctx.arc(bx, by, 30, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(bx - 32, by - 2, 64, 6);
  ctx.fillStyle = PALETTE.cheeseDark;
  ctx.beginPath();
  ctx.arc(bx, by - 30, 6, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'SERVE', bx, s.y + s.h - 26, `700 20px ${SERIF}`, '#f3dfba', 'center');
  text(ctx, 'bring a finished plate', bx, s.y + s.h - 8, `11px ${SANS}`, '#c9a878', 'center');
}

function drawBin(ctx, state) {
  const b = LAYOUT.bin;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2 + 8;
  const hovered = state.hover === 'bin';
  // Floor shadow, then a steel bin can.
  ctx.fillStyle = 'rgba(43,38,34,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 38, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hovered ? '#5a636b' : '#4a525a';
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy - 30);
  ctx.lineTo(cx + 28, cy - 30);
  ctx.lineTo(cx + 22, cy + 32);
  ctx.lineTo(cx - 22, cy + 32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#394047';
  rr(ctx, cx - 32, cy - 38, 64, 11, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(cx - 20, cy - 26, 5, 52);
  text(ctx, 'BIN', cx, b.y - 8, `700 13px ${SANS}`, '#8a6f4d', 'center');
}

// --- Chef -------------------------------------------------------------------

function drawChef(ctx, state) {
  const c = state.chef;
  const bob = c.walking ? Math.abs(Math.sin(c.bob)) * 3 : 0;
  const x = c.x;
  const y = c.y - bob;
  // Shadow.
  ctx.fillStyle = 'rgba(43,38,34,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, c.y + 30, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  const step = c.walking ? Math.sin(c.bob) * 6 : 0;
  ctx.fillStyle = '#3a3330';
  rr(ctx, x - 14 + step, y + 12, 11, 18, 4);
  ctx.fill();
  rr(ctx, x + 3 - step, y + 12, 11, 18, 4);
  ctx.fill();
  // Body: white coat + red neckerchief.
  ctx.fillStyle = '#fdfdf8';
  rr(ctx, x - 20, y - 14, 40, 30, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.tomato;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 12);
  ctx.lineTo(x + 8, y - 12);
  ctx.lineTo(x, y + 2);
  ctx.closePath();
  ctx.fill();
  // Arms.
  ctx.strokeStyle = '#fdfdf8';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 6);
  ctx.lineTo(x - 26, y + 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 6);
  ctx.lineTo(x + 26, y + 8);
  ctx.stroke();
  // Head.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(x, y - 28, 15, 0, Math.PI * 2);
  ctx.fill();
  // Eyes look toward the facing direction.
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(x - 5 + c.facing * 2, y - 30, 2, 0, Math.PI * 2);
  ctx.arc(x + 5 + c.facing * 2, y - 30, 2, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 9, y - 44, 9, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 44, 9, 0, Math.PI * 2);
  ctx.arc(x, y - 48, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 14, y - 46, 28, 8);
  // Carried item or plate, held up front.
  const carry = c.carry;
  if (carry) {
    const shake = state.shakePlate === (carry.kind === 'plate' ? carry.plate.id : -1)
      ? Math.sin(state.shakeTime * 40) * 4 : 0;
    if (carry.kind === 'item') {
      drawIngredient(ctx, x + shake, y - 62, 40, carry.item.id, carry.item.prep);
    } else {
      drawPlate(ctx, x + shake, y - 62, 30, carry.plate.items, true);
    }
  }
}

// --- Particles, toasts, help -------------------------------------------------

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a;
    if (p.kind === 'star') {
      ctx.fillStyle = p.color;
      const r = 7;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        const ang2 = ang + Math.PI / 5;
        ctx.lineTo(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r);
        ctx.lineTo(p.x + Math.cos(ang2) * r * 0.45, p.y + Math.sin(ang2) * r * 0.45);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawToasts(ctx, state) {
  state.toasts.forEach((toast, i) => {
    const a = Math.min(1, toast.life / 0.5);
    const y = 622 - i * 30;
    ctx.globalAlpha = a;
    ctx.font = `700 15px ${SANS}`;
    const w = ctx.measureText(toast.text).width + 28;
    const x = 640 - w / 2;
    ctx.fillStyle = toast.tone === 'bad' ? '#7d2a1e' : toast.tone === 'good' ? '#2f5d33' : '#4a3220';
    rr(ctx, x, y - 20, w, 26, 13);
    ctx.fill();
    text(ctx, toast.text, 640, y - 2, `700 15px ${SANS}`, '#fff6e3', 'center', 'middle');
    ctx.globalAlpha = 1;
  });
}

function drawHelpBar(ctx, state) {
  const h = LAYOUT.helpBar;
  ctx.fillStyle = PALETTE.boardDark;
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(h.x, h.y, h.w, 4);
  text(ctx, 'CLICK a station to use it  ·  WASD / ARROWS move the chef  ·  E / SPACE interact  ·  1-6 grab ingredient  ·  R restart',
    640, h.y + 26, `700 14px ${SANS}`, '#f3dfba', 'center');
  const hint = hintFor(state);
  text(ctx, hint, 640, h.y + 56, `italic 15px ${SERIF}`, '#c9a878', 'center');
}

function hintFor(state) {
  if (state.mode === 'menu') return 'Cook the tickets before their patience runs out — serve fast for combo bonuses.';
  if (state.mode === 'over') return 'Shift over! Press R or click to run another shift.';
  const carry = state.chef.carry;
  if (carry && carry.kind === 'plate') {
    return carry.plate.items.length === 0
      ? 'Empty plate — add ingredients from the pass, or put it back down.'
      : 'Carrying a plate — take it to the SERVE window when it matches a ticket.';
  }
  if (carry && carry.kind === 'item') {
    const ing = INGREDIENTS[carry.item.id];
    if (carry.item.prep === 'burnt') return 'Burnt! Drop it in the BIN.';
    if (ing.prepAction === 'chop' && carry.item.prep === 'raw') return `Chop the ${ing.name.toLowerCase()} on a chopping board.`;
    if (ing.prepAction === 'cook' && carry.item.prep === 'raw') return 'Grill the patty on the stove — watch it, it burns!';
    return 'Add it to a plate on the pass.';
  }
  const order = state.orders[0];
  if (!order) return 'No tickets yet — grab ingredients and get ready.';
  const recipe = RECIPES[order.recipeId];
  const missing = recipe.needs.map((n) => INGREDIENTS[n.id].name).join(', ');
  return `Next up: ${recipe.name} — needs ${missing}.`;
}

// --- Overlays -----------------------------------------------------------------

function drawMenu(ctx, state) {
  ctx.fillStyle = 'rgba(43,38,34,0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = PALETTE.paper;
  rr(ctx, 290, 110, 700, 470, 20);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  rr(ctx, 290, 110, 700, 470, 20);
  ctx.stroke();
  text(ctx, 'EMBER & THYME', 640, 185, `700 52px ${SERIF}`, PALETTE.ink, 'center');
  text(ctx, '— BISTRO RUSH —', 640, 222, `700 18px ${SANS}`, PALETTE.tomato, 'center');
  text(ctx, 'Run the kitchen for one 3-minute lunch shift.', 640, 268, `18px ${SERIF}`, PALETTE.inkSoft, 'center');
  text(ctx, 'Grab ingredients, chop and grill, build each dish on a plate,', 640, 296, `18px ${SERIF}`, PALETTE.inkSoft, 'center');
  text(ctx, 'and serve it before the ticket runs out of patience.', 640, 324, `18px ${SERIF}`, PALETTE.inkSoft, 'center');
  // Mini recipe cards.
  const cards = ['garden-salad', 'classic-burger', 'deluxe-burger'];
  cards.forEach((id, i) => {
    const recipe = RECIPES[id];
    const x = 350 + i * 190;
    const y = 360;
    ctx.fillStyle = PALETTE.ticket;
    rr(ctx, x, y, 170, 86, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ticketEdge;
    ctx.lineWidth = 1.5;
    rr(ctx, x, y, 170, 86, 10);
    ctx.stroke();
    text(ctx, recipe.name, x + 85, y + 24, `700 14px ${SERIF}`, PALETTE.ink, 'center');
    recipe.needs.forEach((need, j) => {
      drawTicketIcon(ctx, x + 30 + j * 30, y + 56, 24, need.id, need.prep);
    });
  });
  const pulse = 0.75 + Math.sin(state.animTime * 4) * 0.25;
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK or press ENTER to start the shift', 640, 520, `700 20px ${SANS}`, PALETTE.tomato, 'center');
  ctx.globalAlpha = 1;
  text(ctx, 'Mouse: click stations  ·  Keyboard: WASD move, E interact, 1-6 grab ingredient', 640, 552, `14px ${SANS}`, PALETTE.inkSoft, 'center');
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(43,38,34,0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = PALETTE.paper;
  rr(ctx, 330, 120, 620, 440, 20);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  rr(ctx, 330, 120, 620, 440, 20);
  ctx.stroke();
  text(ctx, 'SHIFT COMPLETE', 640, 190, `700 40px ${SERIF}`, PALETTE.ink, 'center');
  const stars = state.served >= 12 ? 3 : state.served >= 8 ? 2 : state.served >= 4 ? 1 : 0;
  const title = stars === 3 ? 'Bistro Legend!' : stars === 2 ? 'Head Chef!' : stars === 1 ? 'Solid Line Cook' : 'A tough shift…';
  for (let i = 0; i < 3; i++) {
    const x = 590 + i * 50;
    const y = 235;
    ctx.fillStyle = i < stars ? PALETTE.gold : '#d9c39a';
    const r = 18;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  }
  text(ctx, title, 640, 285, `700 24px ${SERIF}`, PALETTE.tomato, 'center');
  text(ctx, `FINAL SCORE   ${state.score}`, 640, 340, `700 30px ${SERIF}`, PALETTE.ink, 'center');
  text(ctx, `Dishes served: ${state.served}    ·    Orders missed: ${state.missed}    ·    Best combo: x${state.bestCombo}`,
    640, 385, `17px ${SANS}`, PALETTE.inkSoft, 'center');
  const pulse = 0.75 + Math.sin(state.animTime * 4) * 0.25;
  ctx.globalAlpha = pulse;
  text(ctx, 'Press R or CLICK to cook another shift', 640, 470, `700 19px ${SANS}`, PALETTE.tomato, 'center');
  ctx.globalAlpha = 1;
  text(ctx, 'Tip: chop ahead while a patty grills — the rush rewards a full pass.', 640, 510, `italic 15px ${SERIF}`, PALETTE.inkSoft, 'center');
}

// --- Hover highlight -----------------------------------------------------------

function drawHover(ctx, state) {
  if (!state.hover || state.mode !== 'playing') return;
  const rect = hitRects().find((r) => r.key === state.hover);
  if (!rect) return;
  ctx.strokeStyle = 'rgba(233,161,59,0.9)';
  ctx.lineWidth = 3;
  rr(ctx, rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6, 12);
  ctx.stroke();
}

// --- Main entry ------------------------------------------------------------------

export function render(ctx, state) {
  ctx.clearRect(0, 0, 1280, 720);
  drawFloorAndWalls(ctx);
  drawPantry(ctx, state);
  drawStove(ctx, state);
  drawIsland(ctx, state);
  drawPass(ctx, state);
  drawServe(ctx, state);
  drawBin(ctx, state);
  drawHover(ctx, state);
  drawChef(ctx, state);
  drawParticles(ctx, state);
  drawOrderBoard(ctx, state);
  drawToasts(ctx, state);
  drawHelpBar(ctx, state);
  if (state.mode === 'menu') drawMenu(ctx, state);
  if (state.mode === 'over') drawGameOver(ctx, state);
}
