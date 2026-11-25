// Ember & Thyme — tiny sound effects, synthesized with WebAudio oscillators.
// No audio files, no network: every sound is a few sine/triangle blips.
// The context starts on the first user gesture (browser autoplay policy).

let ctx = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  } catch (e) {
    ctx = null;
  }
}

function blip(freq, dur, type, gain, when = 0) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (e) {
    // Sound is garnish: never let it break the game.
  }
}

export const sfx = {
  pickup() { blip(520, 0.08, 'sine', 0.12); },
  chop() { blip(220, 0.06, 'triangle', 0.14); blip(180, 0.06, 'triangle', 0.12, 0.07); },
  sizzle() { blip(880, 0.12, 'sine', 0.05); },
  plate() { blip(660, 0.09, 'sine', 0.12); blip(880, 0.1, 'sine', 0.1, 0.08); },
  serve() {
    blip(523, 0.12, 'triangle', 0.14);
    blip(659, 0.12, 'triangle', 0.14, 0.1);
    blip(784, 0.2, 'triangle', 0.14, 0.2);
  },
  miss() { blip(196, 0.25, 'sawtooth', 0.08); blip(147, 0.3, 'sawtooth', 0.08, 0.15); },
  burn() { blip(110, 0.3, 'sawtooth', 0.1); },
};
