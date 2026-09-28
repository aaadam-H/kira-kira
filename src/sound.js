// Bunyi dijana guna Web Audio, jadi tak perlu fail audio.
let ctx = null;
let enabled = true;

export function setEnabled(value) {
  enabled = value;
}

function getCtx() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function tap() {
  if (enabled) tone(620, 0, 0.07, 'triangle', 0.08);
}
export function correct() {
  if (!enabled) return;
  tone(660, 0, 0.15);
  tone(880, 0.12, 0.25);
}
export function wrong() {
  if (!enabled) return;
  tone(262, 0, 0.18, 'triangle');
  tone(196, 0.16, 0.3, 'triangle');
}
export function fanfare() {
  if (!enabled) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.3));
}
export function levelUp() {
  if (!enabled) return;
  [392, 523, 659, 784].forEach((f, i) => tone(f, 0.25 + i * 0.07, 0.18, 'square', 0.07));
}

// Senyapkan bunyi bila app ke background (contoh: tekan butang home)
export function suspend() {
  try {
    ctx?.suspend();
  } catch {
    /* abaikan */
  }
}
