// Shared grand piano for the site: the notes trainer and the sheet-music pages.
// Salamander Grand Piano samples (Alexander Holm, CC BY 3.0) in public/sounds/piano/,
// one recording every three semitones; notes in between are the nearest sample slightly re-pitched.
// They load after the first tap on the page; until a sample is ready a simple synth plays.
// @ts-nocheck — kept as plain JS, like the trainer it came from.

let ac = null;
export function ctx() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}

const PIANO_FILES = ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6', 'C7'];
const pianoBuf = new Map();
let pianoLoading = false, master = null;
const active = new Set();
const fileMidi = (n) => { const m = n.match(/^([A-G])(s?)(\d)$/); return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); };

export function loadPiano() {
  const a = ctx(); if (!a || pianoLoading) return;
  pianoLoading = true;
  PIANO_FILES.forEach(async (n) => {
    try {
      const res = await fetch(`/sounds/piano/${n}.mp3`);
      const buf = await new Promise((ok, fail) => res.arrayBuffer().then((ab) => a.decodeAudioData(ab, ok, fail)));
      pianoBuf.set(fileMidi(n), buf);
    } catch {}
  });
}
function out() {
  // a gentle compressor so chords and both-hand scales don't clip
  if (!master) { master = ac.createDynamicsCompressor(); master.threshold.value = -14; master.ratio.value = 4; master.connect(ac.destination); }
  return master;
}
function track(src, g) {
  const n = { src, g }; active.add(n);
  src.onended = () => active.delete(n);
}
/** Play a MIDI note `when` seconds from now for `dur` seconds. */
export function tone(midi, when = 0, dur = 1.1) {
  const a = ctx(); if (!a) return;
  loadPiano();
  let near = null, nd = 99;
  pianoBuf.forEach((buf, m) => { const d = Math.abs(m - midi); if (d < nd) { nd = d; near = [m, buf]; } });
  if (!near || nd > 2) return synthTone(midi, when, dur);
  const t = a.currentTime + when + 0.005, end = t + Math.max(dur, 0.3);
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = near[1]; src.playbackRate.value = Math.pow(2, (midi - near[0]) / 12);
  g.gain.setValueAtTime(0.75, t); g.gain.setValueAtTime(0.75, end); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.45);
  src.connect(g).connect(out()); src.start(t); src.stop(end + 0.5);
  track(src, g);
}
function synthTone(midi, when = 0, dur = 1.1) {
  const a = ctx(); if (!a) return;
  const f = 440 * Math.pow(2, (midi - 69) / 12), t = a.currentTime + when + 0.02;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(a.destination);
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([m, type, gv]) => {
    const o = a.createOscillator(), gg = a.createGain(); o.type = type; o.frequency.value = f * m; gg.gain.value = gv;
    o.connect(gg).connect(g); o.start(t); o.stop(t + dur + 0.05);
    track(o, g);
  });
}
/** Silence everything that is playing or scheduled (a quick fade, no clicks). */
export function stopAll() {
  if (!ac) return;
  const now = ac.currentTime;
  active.forEach(({ src, g }) => {
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value || 0.0001, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08); src.stop(now + 0.1); } catch {}
  });
  active.clear();
}
// Start loading on the first touch anywhere, so the first note already sounds like a piano.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => loadPiano(), { once: true });
  document.addEventListener('keydown', () => loadPiano(), { once: true });
}
