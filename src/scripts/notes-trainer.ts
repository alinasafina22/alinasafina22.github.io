// The notes trainer: reading notes, ear training and chords, with optional MIDI input.
// All visible text comes from src/i18n/notes-trainer.ts, picked by the page language.
// @ts-nocheck — a straight port of the standalone trainer; kept untyped on purpose.
import { NT } from '../i18n/notes-trainer';

const L = NT[document.documentElement.lang === 'ru' ? 'ru' : 'en'];
const NAMES = L.names;
const SEMI = [0, 2, 4, 5, 7, 9, 11];
let ROUND = 20;
// diatonic number d = octave*7 + step; bottom staff line per clef
const BASE = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 }; // E4, G2
const S = 12, BOT = 103, NX = 190; // staff space, bottom line y, note x
const G_PATH = "M434 2Q464 -103 464 -170Q464 -223 427 -257Q390 -291 337 -291Q287 -291 250 -262Q213 -232 213 -190Q213 -160 234 -134Q254 -107 284 -107Q313 -107 332 -128Q350 -150 350 -178Q350 -240 280 -240Q298 -268 338 -268Q353 -268 368 -264Q384 -259 401 -248Q418 -237 428 -214Q439 -190 439 -157Q439 -136 411 -6Q389 -12 356 -12Q259 -12 190 60Q120 132 120 232Q120 267 132 303Q143 339 158 366Q172 394 200 428Q229 463 248 484Q268 504 303 539Q280 621 280 689Q280 779 313 840Q346 900 379 900Q389 900 402 887Q414 874 426 851Q438 828 446 790Q455 753 455 710Q455 551 342 447L368 329Q384 332 397 332Q458 332 500 282Q542 233 542 162Q542 44 434 2ZM426 746Q426 801 394 801Q358 801 333 748Q308 695 308 630Q308 588 321 557Q359 580 392 640Q426 699 426 746ZM498 128Q498 183 466 216Q434 249 383 249L428 23Q498 52 498 128ZM407 17 361 247Q334 241 312 214Q289 187 289 158Q289 143 295 128Q301 114 310 104Q318 94 327 86Q336 78 342 74Q348 71 348 71L340 66Q307 75 278 106Q248 137 248 184Q248 231 278 270Q307 310 343 323L325 430Q168 299 168 177Q168 104 223 55Q278 6 348 6Q365 6 407 17Z";
const F_PATH = "M564 704Q582 704 594 691Q607 678 607 661Q607 644 593 631Q579 618 563 618Q521 618 521 663Q521 681 534 692Q547 704 564 704ZM607 469Q607 450 594 437Q581 424 564 424Q521 424 521 469Q521 485 534 498Q546 511 564 511Q582 511 594 497Q607 483 607 469ZM285 757Q366 757 421 702Q476 646 476 569Q476 531 466 495Q455 459 432 426Q409 394 386 367Q363 340 326 313Q289 286 264 268Q239 249 196 226Q154 203 136 194Q117 184 80 166L75 182Q76 183 102 200Q128 217 144 228Q160 238 192 263Q223 288 244 310Q265 331 292 364Q318 396 334 427Q350 458 362 498Q373 538 373 578Q373 735 262 735Q225 735 199 726Q173 716 162 702Q150 688 145 678Q140 667 140 659Q140 644 160 644Q168 644 179 648Q190 651 194 651Q221 651 239 634Q257 617 257 592Q257 563 235 544Q213 525 183 525Q144 525 119 548Q94 571 94 607Q94 673 150 715Q207 757 285 757Z";

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const cfg = Object.assign({ mode: 'read', clef: 'treble', range: 'staff', oct: 'exact', hand: 'R', ctask: 'name', ctypes: ['triad'], piece: 'C' }, store.get('nt-cfg', {}));
if (!Array.isArray(cfg.ctypes) || !cfg.ctypes.length) cfg.ctypes = ['triad'];
let stats = store.get('nt-stats', {});
let best = store.get('nt-best', {});

let round, cur, locked, timer;
const $ = (id) => document.getElementById(id);
const staff = $('staff');

// ---------- drawing ----------
function noteAt(x, pos, cls) {
  let h = '';
  const y = BOT - (pos * S) / 2, lc = cls.includes('ghost') ? 'ledger ghost' : 'ledger';
  for (let p = -2; p >= pos; p -= 2) { const ly = BOT - (p * S) / 2; h += `<line class="${lc}" x1="${x - 14}" x2="${x + 14}" y1="${ly}" y2="${ly}"/>`; }
  for (let p = 10; p <= pos; p += 2) { const ly = BOT - (p * S) / 2; h += `<line class="${lc}" x1="${x - 14}" x2="${x + 14}" y1="${ly}" y2="${ly}"/>`; }
  return h + `<path class="${cls}" fill-rule="evenodd" d="${ell(x, y, 8.6, 6, 0)}${ell(x, y, 3.1, 5.2, -32)}"/>`;
}
function staffBase(clef, W = 300) {
  let h = '';
  for (let i = 0; i < 5; i++) { const y = BOT - i * S; h += `<line class="line" x1="8" x2="${W - 8}" y1="${y}" y2="${y}"/>`; }
  h += `<line class="line" x1="8" x2="8" y1="${BOT - 4 * S}" y2="${BOT}"/><line class="line" x1="${W - 8}" x2="${W - 8}" y1="${BOT - 4 * S}" y2="${BOT}"/>`;
  const k = S / 170;
  if (clef === 'treble') h += `<path class="clef" transform="translate(14 ${BOT - S}) scale(${k} ${-k}) translate(-120 -180)" d="${G_PATH}"/>`;
  else h += `<path class="clef" transform="translate(16 ${BOT - 3 * S}) scale(${k} ${-k}) translate(-75 -532)" d="${F_PATH}"/>`;
  return h;
}
function drawCrib(id, clef) {
  const lo = -4, hi = 12, X0 = 66, DX = 30, W = X0 + (hi - lo) * DX + 28;
  let h = staffBase(clef, W), groups = [];
  for (let p = lo; p <= hi; p++) {
    const x = X0 + (p - lo) * DX, d = BASE[clef] + p, oc = Math.floor(d / 7), t = p % 2 === 0 ? 'ln' : 'sp';
    const anchor = (clef === 'treble' && p === 2) || (clef === 'bass' && p === 6) || d === 28;
    if (anchor) h += `<circle class="halo" cx="${x}" cy="${BOT - (p * S) / 2}" r="12"/>`;
    h += noteAt(x, p, 'note ' + t);
    h += `<text class="cn ${t}" x="${x}" y="152" text-anchor="middle">${NAMES[d % 7]}</text>`;
    const g = groups[groups.length - 1];
    if (g && g.oc === oc) { g.x2 = x; g.n++; } else groups.push({ oc, x1: x, x2: x, n: 1 });
  }
  groups.forEach((g) => {
    h += `<path class="br" d="M${g.x1 - 11} 159 v4 H${g.x2 + 11} v-4"/>`;
    h += `<text class="co" x="${(g.x1 + g.x2) / 2}" y="176" text-anchor="middle">${L.cribOct(g.oc, g.n >= 3)}</text>`;
  });
  const svg = $(id); svg.setAttribute('viewBox', `0 14 ${W} 168`); svg.innerHTML = h;
}
function drawStaff(clef, pos, state, hideNote, ghost) {
  staff.setAttribute('viewBox', '0 0 300 150');
  let h = staffBase(clef);
  if (hideNote) {
    h += `<text class="ask" x="${NX}" y="${BOT - 2 * S + 10}" text-anchor="middle">?</text>`;
  } else {
    h += noteAt(NX, pos, 'note ' + (state || ''));
    if (ghost != null) h += noteAt(NX + 46, ghost, 'note ghost');
  }
  staff.innerHTML = h;
}
function ell(cx, cy, rx, ry, deg) {
  const a = (deg * Math.PI) / 180, pts = [];
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * 2 * Math.PI, x = rx * Math.cos(t), y = ry * Math.sin(t);
    pts.push((cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(2) + ' ' + (cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(2));
  }
  return 'M' + pts.join(' L') + 'Z';
}

// ---------- sound ----------
let ac;
function ctx() { if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
function tone(midi, when = 0, dur = 1.1) {
  const a = ctx(); if (!a) return;
  const f = 440 * Math.pow(2, (midi - 69) / 12), t = a.currentTime + when + 0.02;
  const out = a.createGain(); out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.32, t + 0.012); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(a.destination);
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([m, type, g]) => {
    const o = a.createOscillator(), gg = a.createGain(); o.type = type; o.frequency.value = f * m; gg.gain.value = g;
    o.connect(gg).connect(out); o.start(t); o.stop(t + dur + 0.05);
  });
}
const midiOf = (d) => 12 * (Math.floor(d / 7) + 1) + SEMI[d % 7];

// ---------- note choice ----------
function pool() {
  if (cfg.mode === 'ear') { const r = []; for (let p = -2; p <= 5; p++) r.push({ clef: 'treble', pos: p }); return r; }
  const clefs = cfg.clef === 'both' ? ['treble', 'bass'] : [cfg.clef];
  const [lo, hi] = cfg.range === 'ledger' ? [-4, 12] : [-1, 9];
  const r = []; clefs.forEach((c) => { for (let p = lo; p <= hi; p++) r.push({ clef: c, pos: p }); });
  return r;
}
const key = (n) => n.clef[0] + n.pos;
function pick(prev) {
  const items = pool().filter((n) => !prev || key(n) !== key(prev));
  const w = items.map((n) => { const s = stats[key(n)]; return s ? 1 + 4 * (s.e / s.n) : 1.6; });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const dOf = (n) => BASE[n.clef] + n.pos;
const fullName = (n) => { const d = dOf(n); return L.full(NAMES[d % 7], Math.floor(d / 7)); };

// ---------- flow ----------
function newRound() {
  clearTimeout(timer);
  round = { i: 0, right: 0, misses: [] };
  $('sum').hidden = true; $('game').hidden = false; $('keys').style.visibility = ''; $('piano').style.visibility = '';
  next();
}
function next() {
  if (cfg.mode === 'chords') return nextChord();
  if (cfg.mode === 'scales') return startSeq();
  locked = false;
  cur = pick(cur);
  document.querySelectorAll('#keys button').forEach((b) => { b.className = ''; b.disabled = false; });
  const fb = $('fb'); fb.className = 'feedback idle';
  fb.textContent = cfg.mode === 'ear' ? L.askEar : L.ask;
  drawStaff(cur.clef, cur.pos, '', cfg.mode === 'ear');
  if (cfg.mode === 'ear') playCur();
  updateHUD();
  if (!$('hint').hidden) showHint();
}
function playCur() {
  if (cfg.mode === 'scales') return playBar();
  if (cfg.mode === 'chords') {
    if (!chord) return;
    const ms = chord.notes.map(midiN);
    ms.forEach((m, i) => tone(m, i * 0.2, 0.8));
    ms.forEach((m) => tone(m, ms.length * 0.2 + 0.15, 1.5));
    return;
  }
  if (cfg.mode === 'ear') { tone(60, 0, 0.8); tone(midiOf(dOf(cur)), 0.85); }
  else tone(midiOf(dOf(cur)));
}
function answer(step, btn) { submit({ step, btn }); }
function submit({ step, btn, midi }) {
  if (locked || $('game').hidden) return; locked = true;
  const d = dOf(cur), k = key(cur), target = midiOf(d);
  let ok, ghost = null, note = '';
  if (midi != null) {
    const st = SEMI.indexOf(midi % 12), oc = Math.floor(midi / 12) - 1;
    if (st < 0) { ok = false; note = L.pressedBlack(L.black[midi % 12]); }
    else {
      const nameOk = st === d % 7;
      ok = cfg.oct === 'exact' ? midi === target : nameOk;
      if (!ok) {
        const gp = oc * 7 + st - BASE[cur.clef];
        if (cfg.mode === 'read' && gp >= -6 && gp <= 15) ghost = gp;
        note = nameOk ? L.wrongOctave(L.full(NAMES[st], oc)) : L.played(L.full(NAMES[st], oc));
      }
      btn = $('keys').children[st];
    }
  } else ok = step === d % 7;
  const s = stats[k] || { n: 0, e: 0 }; s.n++; if (!ok) s.e++;
  // decay old data so progress shows
  if (s.n > 12) { s.n = Math.round(s.n * 0.75); s.e = Math.round(s.e * 0.75); }
  stats[k] = s; store.set('nt-stats', stats);
  document.querySelectorAll('#keys button').forEach((b) => (b.disabled = true));
  const right = $('keys').children[d % 7];
  right.className = 'ok'; if (!ok && btn && btn !== right) btn.className = 'bad';
  drawStaff(cur.clef, cur.pos, ok ? 'ok' : 'bad', false, ghost);
  const fb = $('fb'), o = Math.floor(d / 7);
  if (ok) { round.right++; fb.className = 'feedback ok'; fb.innerHTML = `<span>${L.okLine(NAMES[d % 7], o)}</span>`; }
  else { round.misses.push(cur); fb.className = 'feedback bad'; fb.innerHTML = `<span>${L.badLine(NAMES[d % 7], o)}${note ? `<small>${note}</small>` : ''}</span>`; }
  if (cfg.mode === 'read' && midi == null) tone(target);
  round.i++; updateHUD();
  timer = setTimeout(() => (round.i >= ROUND ? finish() : next()), ok ? 900 : note ? 2800 : 2200);
}
function finish() {
  const bk = bkey();
  const prev = best[bk] || 0;
  if (round.right > prev) { best[bk] = round.right; store.set('nt-best', best); }
  const pct = round.right / ROUND;
  const msg = cfg.mode === 'scales' ? (pct === 1 ? L.seqDonePerfect : L.seqDone)
    : pct === 1 ? (cfg.mode === 'chords' ? L.donePerfectChords : L.donePerfect) : pct >= 0.8 ? L.doneGood : L.doneMore;
  const uniq = [...new Map(round.misses.map((n) => [n.label || key(n), n])).values()];
  $('sum').innerHTML = `<div class="result">${round.right}<small> / ${ROUND}</small></div>
    <p>${msg}</p>
    ${uniq.length ? `<div class="misses">${uniq.map((n) => `<span>${n.label ? n.label : fullName(n) + (cfg.clef === 'both' ? (n.clef === 'bass' ? L.bassMark : L.trebleMark) : '')}</span>`).join('')}</div>` : ''}
    <button class="tool primary" type="button" id="again">${L.again}</button>`;
  $('sum').hidden = false; $('game').hidden = true; $('keys').style.visibility = 'hidden'; $('piano').style.visibility = 'hidden';
  $('again').onclick = newRound;
  updateHUD();
}
function updateHUD() {
  $('count').textContent = Math.min(round.i + 1, ROUND) + ' / ' + ROUND;
  $('bar').style.width = (round.i / ROUND) * 100 + '%';
  $('right').textContent = round.right + ' ✓';
  const bk = bkey();
  $('best').innerHTML = best[bk] ? `${L.best} <b>${best[bk]} / ${ROUND}</b>` : '';
}
function bkey() {
  if (cfg.mode === 'ear') return 'ear';
  if (cfg.mode === 'scales') return 'sc-' + cfg.piece + '-' + cfg.hand;
  if (cfg.mode === 'chords') return 'chords-' + cfg.hand + '-' + cfg.ctask + '-' + [...cfg.ctypes].sort().join('');
  return cfg.mode + '-' + cfg.clef + '-' + cfg.range;
}
function showHint() {
  const h = $('hint');
  if (cfg.mode === 'scales') {
    h.innerHTML = cfg.piece[0] === 'h' ? L.hintHanon : cfg.piece === 'F' ? L.hintScaleF : L.hintScale;
    return;
  }
  if (cfg.mode === 'chords') {
    h.innerHTML = chord ? L.hintChord(chord.sym, chord.hint, cfg.hand === 'R', chord.fingers.join(' – ')) : '';
    return;
  }
  if (cfg.mode === 'ear') h.innerHTML = L.hintEar;
  else h.innerHTML = cur.clef === 'treble' ? L.hintTreble : L.hintBass;
}

// ---------- chords ----------
// a spelled note is {d: diatonic number (octave*7 + step), alt: -1 | 0 | 1}
const ACC = { '-1': '♭', '0': '', '1': '♯' };
const nm = (n) => NAMES[n.d % 7] + ACC[n.alt];
const midiN = (n) => midiOf(n.d) + n.alt;
const up = (n, steps, semis) => { const d = n.d + steps; return { d, alt: n.alt + semis - (midiOf(d) - midiOf(n.d)) }; };
const odd = (n) => Math.abs(n.alt) > 1 || (n.alt === 1 && (n.d % 7 === 2 || n.d % 7 === 6)) || (n.alt === -1 && (n.d % 7 === 3 || n.d % 7 === 0));
const TRI = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };
const SEV = { bM: [0, 4, 7, 11], mM: [0, 4, 7, 10], mm: [0, 3, 7, 10], bm: [0, 3, 7, 11], hd: [0, 3, 6, 10], dd: [0, 3, 6, 9], ba: [0, 4, 8, 11] };
const TONICS = [
  ...[[0, 0], [4, 0], [1, 0], [5, 0], [2, 0], [3, 0], [6, -1], [2, -1], [5, -1]].map(([d, alt]) => ({ t: { d, alt }, minor: false })),
  ...[[5, 0], [2, 0], [6, 0], [3, 1], [0, 1], [1, 0], [4, 0], [0, 0], [3, 0]].map(([d, alt]) => ({ t: { d, alt }, minor: true })),
];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
let chord = null, chordTimer;
const sel = new Set(), held = new Set();

function kinds() {
  const k = [], c = cfg.ctypes;
  if (c.includes('triad')) k.push('maj-0', 'min-0');
  if (c.includes('inv')) k.push('maj-1', 'maj-2', 'min-1', 'min-2');
  if (c.includes('dimaug')) k.push('dim-0', 'aug-0');
  if (c.includes('sev')) Object.keys(SEV).forEach((s) => k.push('sev-' + s));
  if (c.includes('d7')) [0, 1, 2, 3].forEach((i) => k.push('d7-' + i));
  return k;
}
function buildChord(kind) {
  const [a, b] = kind.split('-');
  for (let tries = 0; tries < 80; tries++) {
    let notes, label, sym, hint;
    if (a === 'd7') {
      const k = rnd(TONICS), inv = +b, dom = up(k.t, 4, 7);
      notes = [0, 4, 7, 10].map((s, i) => up(dom, i * 2, s));
      if ([k.t, ...notes].some(odd)) continue;
      for (let i = 0; i < inv; i++) notes[i] = { d: notes[i].d + 7, alt: notes[i].alt };
      const [dsym, dhint] = L.d7[inv];
      label = L.inKey(dsym, nm(k.t), k.minor); sym = dsym;
      hint = `${dsym} ${dhint}${k.minor ? L.minorHint : ''}`;
    } else {
      const root = { d: Math.floor(Math.random() * 7), alt: rnd([0, 0, 0, 1, -1]) };
      if (a === 'sev') { notes = SEV[b].map((s, i) => up(root, i * 2, s)); label = L.sev[b].n; sym = L.sevSym; hint = L.sev[b].h; }
      else {
        const t = L.tri[a], inv = +b; notes = TRI[a].map((s, i) => up(root, i * 2, s));
        for (let i = 0; i < inv; i++) notes[i] = { d: notes[i].d + 7, alt: notes[i].alt };
        label = t.f[inv]; sym = t.sym + L.inv3[inv][0]; hint = `${t.h}. ${L.inv3[inv][1]}`;
      }
      if (notes.some(odd)) continue;
      notes.sort((x, y) => midiN(x) - midiN(y));
      label = L.chordName(label, nm(root), nm(notes[0]));
    }
    notes.sort((x, y) => midiN(x) - midiN(y));
    const shift = (cfg.hand === 'L' ? 3 : 4) - Math.floor(notes[0].d / 7);
    notes = notes.map((n) => ({ d: n.d + 7 * shift, alt: n.alt }));
    const g = notes.slice(1).map((n, i) => n.d - notes[i].d);
    let fingers;
    if (notes.length === 3) fingers = cfg.hand === 'R' ? (g[1] > g[0] ? [1, 2, 5] : [1, 3, 5]) : g[0] > g[1] ? [5, 2, 1] : [5, 3, 1];
    else fingers = cfg.hand === 'R' ? (g[2] === 1 ? [1, 2, 4, 5] : [1, 2, 3, 5]) : g[0] === 1 ? [5, 4, 2, 1] : [5, 3, 2, 1];
    return { kind, notes, label, sym, hint, fingers };
  }
  return null;
}
function nextChord() {
  clearTimeout(chordTimer); locked = false; sel.clear();
  const ks = kinds(), w = ks.map((k) => { const s = stats['c:' + k]; return s ? 1 + (4 * s.e) / s.n : 1.6; });
  let r = Math.random() * w.reduce((x, y) => x + y, 0), kind = ks[ks.length - 1];
  for (let i = 0; i < ks.length; i++) { r -= w[i]; if (r <= 0) { kind = ks[i]; break; } }
  if (chord && ks.length > 1 && kind === chord.kind && Math.random() < 0.6) kind = rnd(ks.filter((k) => k !== chord.kind));
  chord = buildChord(kind) || buildChord('maj-0');
  const byName = cfg.ctask === 'name';
  $('task').innerHTML = byName ? `<b>${chord.label}</b><span>${chord.sym}</span>` : L.sightTask;
  $('finger').innerHTML = L.fingerLine(cfg.hand === 'R', chord.fingers.join(' – '));
  drawChord(!byName, '');
  const fb = $('fb'); fb.className = 'feedback idle';
  fb.textContent = midiAccess && midiAccess.inputs.size ? L.chordAskMidi : L.chordAsk;
  $('nextBtn').hidden = true; $('check').hidden = false; $('clear').hidden = false;
  drawPiano(false);
  updateHUD();
  if (!$('hint').hidden) showHint();
}
function drawChord(show, state) {
  const clef = cfg.hand === 'L' ? 'bass' : 'treble';
  staff.setAttribute('viewBox', '0 -24 300 196');
  let h = staffBase(clef);
  if (!show) { staff.innerHTML = h + `<text class="ask" x="${NX}" y="${BOT - 2 * S + 10}" text-anchor="middle">?</text>`; return; }
  const ps = chord.notes.map((n) => n.d - BASE[clef]);
  let prevShift = false;
  ps.forEach((p, i) => {
    const sh = i > 0 && p - ps[i - 1] === 1 && !prevShift; prevShift = sh;
    h += noteAt(NX + (sh ? 17 : 0), p, 'note ' + state);
  });
  let lastAcc = null, col = 0;
  for (let i = ps.length - 1; i >= 0; i--) {
    const a = chord.notes[i].alt; if (!a) continue;
    col = lastAcc != null && lastAcc - ps[i] < 6 ? col + 1 : 0; lastAcc = ps[i];
    h += `<text class="acc" x="${NX - 19 - col * 12}" y="${BOT - (ps[i] * S) / 2 + (a > 0 ? 6 : 4)}" text-anchor="middle">${a > 0 ? '♯' : '♭'}</text>`;
  }
  const n = ps.length, ys = ps.map((p) => BOT - (p * S) / 2);
  chord.fingers.forEach((f, i) => {
    const y = cfg.hand === 'R' ? Math.min(ys[n - 1] - 14, BOT - 4 * S - 8) - i * 12 : Math.max(ys[0] + 22, BOT + 20) + (n - 1 - i) * 12;
    h += `<text class="fing" x="${NX + 4}" y="${y}" text-anchor="middle">${f}</text>`;
  });
  staff.innerHTML = h;
}
const WHITE = [0, 2, 4, 5, 7, 9, 11];
function drawPiano(reveal, played) {
  const lo = cfg.hand === 'L' ? 48 : 60, hi = lo + 24, W = 20;
  const target = new Map(chord.notes.map((n, i) => [midiN(n), chord.fingers[i]]));
  const pressed = reveal ? new Set(played) : new Set([...sel, ...held]);
  let wx = 0, whites = '', blacks = '';
  for (let m = lo; m <= hi; m++) {
    const isW = WHITE.includes(m % 12), x = isW ? wx * W : wx * W - 6;
    let cls = 'pk ' + (isW ? 'w' : 'b');
    if (pressed.has(m)) cls += reveal ? (target.has(m) ? ' good' : ' wrong') : ' sel';
    else if (reveal && target.has(m)) cls += ' miss';
    const rect = isW
      ? `<rect class="${cls}" data-m="${m}" x="${x + 0.5}" y=".5" width="${W - 1}" height="99" rx="3"/>`
      : `<rect class="${cls}" data-m="${m}" x="${x}" y=".5" width="12" height="60" rx="2"/>`;
    let lab = '';
    if (reveal && target.has(m)) {
      const cx = isW ? x + W / 2 : x + 6, cy = isW ? 84 : 48, r = isW ? 7.5 : 5.8;
      lab = `<circle class="fc" cx="${cx}" cy="${cy}" r="${r}"/><text class="ft" x="${cx}" y="${cy + 3.6}" text-anchor="middle">${target.get(m)}</text>`;
    } else if (m === 60 && isW) lab = `<text class="c4" x="${x + W / 2}" y="93" text-anchor="middle">${L.middleC}</text>`;
    if (isW) { whites += rect + lab; wx++; } else blacks += rect + lab;
  }
  $('pianoSvg').innerHTML = whites + blacks;
}
function checkChord(list, fromMidi) {
  if (locked || !chord || $('game').hidden) return;
  const played = [...new Set(list)].sort((a, b) => a - b);
  if (!played.length) return;
  locked = true; clearTimeout(chordTimer);
  const tgt = chord.notes.map(midiN), n = tgt.length, tpc = tgt.map((m) => m % 12), ppc = played.map((m) => m % 12);
  const ok = played.length === n && ppc.every((p, i) => p === tpc[i]) && played[n - 1] - played[0] === tgt[n - 1] - tgt[0];
  let why = '';
  if (!ok) {
    const miss = chord.notes.filter((x) => !ppc.includes(midiN(x) % 12)).map(nm);
    const extra = [...new Set(ppc.filter((p) => !tpc.includes(p)))].map((p) => L.pcn[p]);
    if (miss.length || extra.length) why = [miss.length ? L.missing + miss.join(', ') : '', extra.length ? L.extra + extra.join(', ') : ''].filter(Boolean).join('. ');
    else if (played.length !== n) why = L.count(n, played.length);
    else if (ppc[0] !== tpc[0]) why = L.bassWrong(nm(chord.notes[0]));
    else why = L.spread;
  }
  const k = 'c:' + chord.kind, s = stats[k] || { n: 0, e: 0 }; s.n++; if (!ok) s.e++;
  if (s.n > 12) { s.n = Math.round(s.n * 0.75); s.e = Math.round(s.e * 0.75); }
  stats[k] = s; store.set('nt-stats', stats);
  if (ok) round.right++; else round.misses.push(chord);
  round.i++;
  $('task').innerHTML = `<b>${chord.label}</b><span>${chord.sym}</span>`;
  drawChord(true, ok ? 'ok' : 'bad');
  drawPiano(true, played);
  const names = chord.notes.map(nm).join(' – '), fb = $('fb');
  if (ok) { fb.className = 'feedback ok'; fb.innerHTML = `<span>${L.chordOk(names)}</span>`; }
  else { fb.className = 'feedback bad'; fb.innerHTML = `<span>${L.chordBad(names, why)}</span>`; }
  if (!fromMidi) playCur();
  $('check').hidden = true; $('clear').hidden = true; $('nextBtn').hidden = false;
  updateHUD();
  if (ok) timer = setTimeout(goNext, 1800);
}
function goNext() { clearTimeout(timer); if (round.i >= ROUND) finish(); else nextChord(); }
function chordMidi(on, m) {
  if (on) held.add(m); else held.delete(m);
  if (locked || !chord || $('game').hidden) return;
  drawPiano(false);
  clearTimeout(chordTimer);
  if (on && held.size >= chord.notes.length) chordTimer = setTimeout(() => checkChord([...held], true), 160);
}
$('pianoSvg').addEventListener('pointerdown', (e) => {
  const k = e.target.closest('[data-m]'); if (!k) return;
  const m = +k.dataset.m;
  if (cfg.mode === 'scales') return seqPress(m);
  if (locked) return;
  if (sel.has(m)) sel.delete(m); else { sel.add(m); tone(m, 0, 0.6); }
  drawPiano(false);
});
$('check').onclick = () => checkChord([...sel], false);
$('clear').onclick = () => { sel.clear(); drawPiano(false); };
$('nextBtn').onclick = goNext;


// ---------- scales and Hanon ----------
// One octave up and down for scales; Hanon 1–2 shortened to one octave up and back.
// Fingering is the standard one; descending Hanon uses the mirror rule
// (right hand plays the left hand's ascending fingers and vice versa).
const SCALES = {
  C: { t: { d: 28, alt: 0 }, s: [0, 2, 4, 5, 7, 9, 11, 12] },
  G: { t: { d: 32, alt: 0 }, s: [0, 2, 4, 5, 7, 9, 11, 12] },
  D: { t: { d: 29, alt: 0 }, s: [0, 2, 4, 5, 7, 9, 11, 12] },
  F: { t: { d: 31, alt: 0 }, s: [0, 2, 4, 5, 7, 9, 11, 12], rh: [1, 2, 3, 4, 1, 2, 3, 4] },
  Am: { t: { d: 33, alt: 0 }, s: [0, 2, 3, 5, 7, 8, 11, 12] },
};
const HANON = {
  h1: { o: [0, 2, 3, 4, 5, 4, 3, 2], rh: [1, 2, 3, 4, 5, 4, 3, 2], lh: [5, 4, 3, 2, 1, 2, 3, 4] },
  h2: { o: [0, 2, 5, 4, 3, 4, 3, 2], rh: [1, 2, 5, 4, 3, 4, 3, 2], lh: [5, 3, 1, 2, 3, 2, 3, 4] },
};
const BAR = 8;
let seq = [], seqErr = [], seqLast = null, seqFlash = null, seqTimer, seqDone = false;

function buildSeq() {
  const right = cfg.hand === 'R', shift = right ? 0 : -7, out = [];
  if (HANON[cfg.piece]) {
    const h = HANON[cfg.piece], d0 = 28 + shift;
    for (let k = 0; k < 7; k++) h.o.forEach((o, j) => out.push({ d: d0 + k + o, alt: 0, f: (right ? h.rh : h.lh)[j] }));
    for (let k = 0; k < 7; k++) h.o.forEach((o, j) => out.push({ d: d0 + 11 - k - o, alt: 0, f: (right ? h.lh : h.rh)[j] }));
    return out;
  }
  const sc = SCALES[cfg.piece] || SCALES.C, t = { d: sc.t.d + shift, alt: 0 };
  const fu = right ? sc.rh || [1, 2, 3, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 3, 2, 1];
  const upNotes = sc.s.map((semi, k) => ({ ...up(t, k, semi), f: fu[k] }));
  return [...upNotes, ...upNotes.slice(0, 7).reverse()];
}
function startSeq() {
  clearTimeout(seqTimer); clearTimeout(timer);
  locked = false; seqDone = false; seqLast = null; seqFlash = null;
  seq = buildSeq(); seqErr = seq.map(() => false);
  ROUND = seq.length;
  $('task').innerHTML = `<b>${L.pieces[cfg.piece] || L.pieces.C}</b><span>${cfg.piece[0] === 'h' ? L.hanonSub : L.scaleSub} · ${L.handSub(cfg.hand === 'R')}</span>`;
  $('check').hidden = true; $('clear').hidden = true; $('nextBtn').hidden = true;
  const fb = $('fb'); fb.className = 'feedback idle';
  fb.textContent = midiAccess && midiAccess.inputs.size ? L.seqAskMidi : L.seqAsk;
  renderSeq();
  updateHUD();
  if (!$('hint').hidden) showHint();
}
function renderSeq() {
  const i = Math.min(round.i, seq.length - 1), start = Math.floor(i / BAR) * BAR, bar = seq.slice(start, start + BAR);
  const clef = cfg.hand === 'L' ? 'bass' : 'treble', X0 = 82, DX = 27;
  staff.setAttribute('viewBox', '0 -30 300 206');
  let h = staffBase(clef);
  bar.forEach((n, j) => {
    const idx = start + j, x = X0 + j * DX, p = n.d - BASE[clef], y = BOT - (p * S) / 2;
    const state = idx < round.i ? 'ok' : idx === round.i && !seqDone ? 'cur' : '';
    if (state === 'cur') h += `<rect class="cur-mark" x="${x - 12}" y="${Math.min(y, BOT - 4 * S) - 30}" width="24" height="${Math.max(y, BOT) - Math.min(y, BOT - 4 * S) + 60}" rx="6"/>`;
    h += noteAt(x, p, 'note ' + state);
    if (n.alt) h += `<text class="acc sm" x="${x - 13}" y="${y + (n.alt > 0 ? 5 : 3)}" text-anchor="middle">${n.alt > 0 ? '♯' : '♭'}</text>`;
    const fy = cfg.hand === 'R' ? Math.min(y - 13, BOT - 4 * S - 8) : Math.max(y + 22, BOT + 20);
    const fc = idx < round.i ? ' done' : idx === round.i ? ' now' : '';
    h += `<text class="fing${fc}" x="${x}" y="${fy}" text-anchor="middle">${n.f}</text>`;
  });
  staff.innerHTML = h;
  const cur = seq[round.i];
  $('finger').innerHTML = cur && !seqDone ? L.seqFinger(cur.f) : '';
  drawSeqPiano();
}
function drawSeqPiano() {
  const lo = cfg.hand === 'L' ? 48 : 60, hi = lo + 24, W = 20, cur = !seqDone && seq[round.i];
  const tm = cur ? midiN(cur) : null;
  let wx = 0, whites = '', blacks = '';
  for (let m = lo; m <= hi; m++) {
    const isW = WHITE.includes(m % 12), x = isW ? wx * W : wx * W - 6;
    let cls = 'pk ' + (isW ? 'w' : 'b');
    if (m === seqFlash) cls += ' wrong';
    else if (m === tm) cls += ' sel';
    else if (m === seqLast) cls += ' good';
    const rect = isW
      ? `<rect class="${cls}" data-m="${m}" x="${x + 0.5}" y=".5" width="${W - 1}" height="99" rx="3"/>`
      : `<rect class="${cls}" data-m="${m}" x="${x}" y=".5" width="12" height="60" rx="2"/>`;
    let lab = '';
    if (m === tm) {
      const cx = isW ? x + W / 2 : x + 6, cy = isW ? 84 : 48, r = isW ? 7.5 : 5.8;
      lab = `<circle class="fc" cx="${cx}" cy="${cy}" r="${r}"/><text class="ft" x="${cx}" y="${cy + 3.6}" text-anchor="middle">${cur.f}</text>`;
    } else if (m === 60 && isW) lab = `<text class="c4" x="${x + W / 2}" y="93" text-anchor="middle">${L.middleC}</text>`;
    if (isW) { whites += rect + lab; wx++; } else blacks += rect + lab;
  }
  $('pianoSvg').innerHTML = whites + blacks;
}
function seqPress(m) {
  if (seqDone || $('game').hidden || !seq.length) return;
  tone(m, 0, 0.6);
  const cur = seq[round.i], fb = $('fb');
  if (m === midiN(cur)) {
    if (!seqErr[round.i]) round.right++;
    seqLast = m; seqFlash = null; round.i++;
    fb.className = 'feedback ok'; fb.innerHTML = `<span>${L.seqOk(nm(cur), cur.f)}</span>`;
    if (round.i >= seq.length) { seqDone = true; renderSeq(); updateHUD(); timer = setTimeout(finish, 900); return; }
  } else {
    if (!seqErr[round.i]) round.misses.push({ label: nm(cur) });
    seqErr[round.i] = true; seqFlash = m;
    fb.className = 'feedback bad'; fb.innerHTML = `<span>${L.seqBad(nm(cur), cur.f)}</span>`;
    clearTimeout(seqTimer); seqTimer = setTimeout(() => { seqFlash = null; drawSeqPiano(); }, 500);
  }
  renderSeq(); updateHUD();
}
function playBar() {
  if (!seq.length) return;
  const from = Math.min(round.i, seq.length - 1), end = Math.floor(from / BAR) * BAR + BAR;
  seq.slice(from, end).forEach((n, k) => tone(midiN(n), k * 0.32, 0.5));
}

// ---------- controls ----------
NAMES.forEach((n, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.id = 'k-' + i; b.textContent = n;
  b.onclick = () => answer(i, b); $('keys').appendChild(b);
});
function bindSeg(id, prop) {
  const seg = $(id);
  const sync = () => seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cfg[prop])));
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || cfg[prop] === b.dataset.v) return;
    cfg[prop] = b.dataset.v; store.set('nt-cfg', cfg); sync(); applyMode(); newRound();
  });
  sync();
}
function applyMode() {
  const ear = cfg.mode === 'ear', ch = cfg.mode === 'chords', sc = cfg.mode === 'scales';
  $('row-clef').hidden = ear || ch || sc; $('row-range').hidden = ear || ch || sc;
  ['row-ctype', 'row-task'].forEach((id) => ($(id).hidden = !ch));
  $('row-hand').hidden = !(ch || sc); $('row-piece').hidden = !sc;
  $('keys').hidden = ch || sc; $('piano').hidden = !(ch || sc);
  $('task').hidden = !(ch || sc); $('finger').hidden = !(ch || sc);
  ROUND = ch ? 10 : 20;
}
bindSeg('seg-mode', 'mode'); bindSeg('seg-clef', 'clef'); bindSeg('seg-range', 'range'); bindSeg('seg-oct', 'oct');
bindSeg('seg-hand', 'hand'); bindSeg('seg-task', 'ctask'); bindSeg('seg-piece', 'piece');
(() => {
  const seg = $('seg-ctype');
  const sync = () => seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(cfg.ctypes.includes(b.dataset.v))));
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const v = b.dataset.v, on = cfg.ctypes.includes(v);
    if (on && cfg.ctypes.length === 1) return;
    cfg.ctypes = on ? cfg.ctypes.filter((x) => x !== v) : [...cfg.ctypes, v];
    store.set('nt-cfg', cfg); sync(); newRound();
  });
  sync();
})();
applyMode();
drawCrib('cribTreble', 'treble'); drawCrib('cribBass', 'bass');

// ---------- MIDI ----------
let midiAccess = null;
async function connectMidi(quiet) {
  const st = $('midiStatus');
  if (!navigator.requestMIDIAccess) {
    if (!quiet) { st.hidden = false; st.textContent = L.midiNoSupport; }
    return;
  }
  try { midiAccess = await navigator.requestMIDIAccess(); }
  catch {
    if (!quiet) { st.hidden = false; st.textContent = L.midiDenied; }
    return;
  }
  store.set('nt-midi', true);
  midiAccess.onstatechange = wireInputs; wireInputs();
}
function wireInputs() {
  const names = [];
  midiAccess.inputs.forEach((inp) => { inp.onmidimessage = onMidi; names.push(inp.name); });
  const st = $('midiStatus'), b = $('midiBtn');
  st.hidden = false;
  b.classList.toggle('on', names.length > 0);
  b.textContent = names.length ? L.midiOn : L.ui.connect;
  $('seg-oct').hidden = !names.length;
  st.textContent = names.length ? L.midiReady(names.join(', ')) : L.midiNone;
}
function onMidi(e) {
  const [s, n, v] = e.data, cmd = s & 0xf0;
  const on = cmd === 0x90 && v > 0, off = cmd === 0x80 || (cmd === 0x90 && v === 0);
  if (cfg.mode === 'scales') { if (on) seqPress(n); return; }
  if (cfg.mode === 'chords') { if (on || off) chordMidi(on, n); return; }
  if (on) submit({ midi: n });
}
$('midiBtn').onclick = () => connectMidi(false);
if (store.get('nt-midi', false)) connectMidi(true);
$('play').onclick = () => cur && playCur();
$('hintBtn').onclick = () => { const h = $('hint'); h.hidden = !h.hidden; if (!h.hidden) showHint(); };
$('restart').onclick = newRound;
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (cfg.mode === 'chords') {
    if (e.key === 'Enter' && !e.target.closest('button, summary, a')) { if (!$('nextBtn').hidden) goNext(); else checkChord([...sel], false); }
    return;
  }
  const i = '1234567'.indexOf(e.key); if (i >= 0 && !$('game').hidden) answer(i, $('keys').children[i]);
});

// first screen: show a note, but don't autoplay sound (audio needs a tap)
round = { i: 0, right: 0, misses: [] };
cur = pick(null); locked = false;
if (cfg.mode === 'chords') nextChord();
else if (cfg.mode === 'scales') startSeq();
else {
  drawStaff(cur.clef, cur.pos, '', cfg.mode === 'ear');
  $('fb').textContent = cfg.mode === 'ear' ? L.askEarStart : L.ask;
  updateHUD();
}
