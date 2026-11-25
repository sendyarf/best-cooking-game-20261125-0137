// Ember & Thyme — food drawing: every ingredient and plated dish is drawn
// from layered canvas shapes with a highlight, so it reads as appetizing
// food at a glance even when shrunk.

import { INGREDIENTS, PALETTE } from './config.js';

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Draw one ingredient centred at (x, y), fitting in a box of size `s`.
// prep changes the look: chopped = slices, cooked = seared, burnt = charred.
export function drawIngredient(ctx, x, y, s, id, prep = 'raw') {
  const ing = INGREDIENTS[id];
  const r = s / 2;
  ctx.save();
  ctx.translate(x, y);
  if (prep === 'burnt') {
    circle(ctx, 0, 0, r * 0.92, '#2e2118');
    circle(ctx, -r * 0.25, -r * 0.25, r * 0.35, '#453023');
    circle(ctx, r * 0.3, r * 0.2, r * 0.22, '#1c130d');
    ctx.restore();
    return;
  }
  switch (id) {
    case 'tomato': {
      if (prep === 'chopped') {
        // Three juicy slices, fanned.
        for (let i = -1; i <= 1; i++) {
          ctx.save();
          ctx.translate(i * r * 0.55, Math.abs(i) * r * 0.12);
          ctx.rotate(i * 0.35);
          ellipse(ctx, 0, 0, r * 0.5, r * 0.42, PALETTE.tomato);
          ellipse(ctx, 0, 0, r * 0.34, r * 0.28, '#e8705f');
          circle(ctx, 0, 0, r * 0.1, '#f6b8ad');
          ctx.restore();
        }
      } else {
        circle(ctx, 0, r * 0.05, r * 0.88, PALETTE.tomato);
        circle(ctx, -r * 0.3, -r * 0.3, r * 0.28, '#e8705f');
        // Calyx star on top.
        ctx.fillStyle = PALETTE.basilDark;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const a2 = a + Math.PI / 5;
          ctx.lineTo(Math.cos(a) * r * 0.3, -r * 0.72 + Math.sin(a) * r * 0.18);
          ctx.lineTo(Math.cos(a2) * r * 0.12, -r * 0.72 + Math.sin(a2) * r * 0.1);
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      if (prep === 'chopped') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ellipse(ctx, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.42, r * 0.26, i % 2 ? PALETTE.lettuce : '#8fbf7a');
        }
        circle(ctx, 0, 0, r * 0.22, '#a8d18f');
      } else {
        circle(ctx, 0, 0, r * 0.9, PALETTE.lettuceDark);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          ellipse(ctx, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.5, r * 0.34, PALETTE.lettuce);
        }
        circle(ctx, 0, 0, r * 0.4, '#8fbf7a');
        circle(ctx, -r * 0.12, -r * 0.12, r * 0.18, '#b7dc9f');
      }
      break;
    }
    case 'onion': {
      if (prep === 'chopped') {
        ctx.strokeStyle = '#d9c8e8';
        ctx.lineWidth = Math.max(2, r * 0.14);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(i * r * 0.3 - r * 0.3, 0, r * (0.55 - i * 0.12), Math.PI * 0.9, Math.PI * 2.1);
          ctx.stroke();
        }
        circle(ctx, r * 0.35, r * 0.3, r * 0.16, '#efe6f7');
      } else {
        circle(ctx, 0, r * 0.05, r * 0.85, PALETTE.onion);
        ctx.strokeStyle = PALETTE.onionDark;
        ctx.lineWidth = Math.max(1.5, r * 0.07);
        for (const rr of [0.6, 0.38]) {
          ctx.beginPath();
          ctx.arc(0, r * 0.05, r * rr, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Sprout.
        ctx.strokeStyle = PALETTE.basil;
        ctx.lineWidth = Math.max(2, r * 0.12);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.75);
        ctx.quadraticCurveTo(r * 0.1, -r * 1.05, r * 0.3, -r * 1.1);
        ctx.stroke();
      }
      break;
    }
    case 'patty': {
      const seared = prep === 'cooked';
      ellipse(ctx, 0, r * 0.08, r * 0.95, r * 0.72, seared ? '#8a5a33' : PALETTE.patty);
      ellipse(ctx, 0, -r * 0.05, r * 0.85, r * 0.6, seared ? '#9c6a3e' : '#8a5a33');
      if (seared) {
        ctx.strokeStyle = '#5d3419';
        ctx.lineWidth = Math.max(2, r * 0.1);
        for (const dx of [-0.35, 0.05, 0.4]) {
          ctx.beginPath();
          ctx.moveTo(dx * r - r * 0.12, -r * 0.4);
          ctx.lineTo(dx * r + r * 0.12, r * 0.35);
          ctx.stroke();
        }
      } else {
        circle(ctx, -r * 0.3, -r * 0.15, r * 0.14, '#93603a');
        circle(ctx, r * 0.25, r * 0.1, r * 0.11, '#93603a');
      }
      break;
    }
    case 'bun': {
      // A bun: domed top half with sesame, flat base.
      ellipse(ctx, 0, r * 0.18, r * 0.92, r * 0.5, PALETTE.bunDark);
      ctx.fillStyle = PALETTE.bun;
      ctx.beginPath();
      ctx.arc(0, r * 0.18, r * 0.92, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f7e3b0';
      for (const [sx, sy] of [[-0.45, -0.25], [0, -0.45], [0.45, -0.22], [-0.2, -0.05], [0.25, -0.02]]) {
        ellipse(ctx, sx * r, sy * r, r * 0.09, r * 0.06, '#f7e3b0');
      }
      break;
    }
    case 'cheese': {
      // A folded cheese slice: golden diamond with a drip.
      ctx.fillStyle = PALETTE.cheese;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r * 0.8);
      ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.cheeseDark;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r * 0.25);
      ctx.closePath();
      ctx.fill();
      circle(ctx, -r * 0.3, -r * 0.1, r * 0.08, '#f8cd6d');
      circle(ctx, r * 0.2, r * 0.35, r * 0.07, '#f8cd6d');
      break;
    }
    default:
      circle(ctx, 0, 0, r * 0.8, ing ? ing.color : '#999');
  }
  ctx.restore();
}

// Draw a plate (white dish + rim) with its items stacked on top.
export function drawPlate(ctx, x, y, radius, items, highlight = false) {
  ctx.save();
  ctx.translate(x, y);
  // Soft shadow.
  ellipse(ctx, 0, radius * 0.18, radius * 1.05, radius * 0.28, 'rgba(43,38,34,0.18)');
  circle(ctx, 0, 0, radius, '#fdfdf8');
  ctx.strokeStyle = highlight ? PALETTE.gold : '#d8cfc0';
  ctx.lineWidth = highlight ? 4 : 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
  ctx.stroke();
  circle(ctx, 0, 0, radius * 0.78, '#f4ecdc');
  // Items: arranged in a small cluster, last item on top.
  const n = items.length;
  if (n > 0) {
    const spots = [
      [0, 0], [-0.34, -0.18], [0.34, -0.18], [-0.3, 0.28], [0.3, 0.28],
    ];
    items.forEach((item, i) => {
      const spot = spots[Math.min(i, spots.length - 1)];
      const s = radius * (n === 1 ? 1.15 : 0.78);
      drawIngredient(ctx, spot[0] * radius, spot[1] * radius, s, item.id, item.prep);
    });
  }
  ctx.restore();
}

// A tiny icon of an ingredient for order tickets (a filled disc + the food).
export function drawTicketIcon(ctx, x, y, size, id, prep) {
  ctx.save();
  ctx.translate(x, y);
  circle(ctx, 0, 0, size / 2, '#fffdf6');
  ctx.strokeStyle = '#d9c39a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2 - 1, 0, Math.PI * 2);
  ctx.stroke();
  drawIngredient(ctx, 0, 0, size * 0.78, id, prep);
  ctx.restore();
}
