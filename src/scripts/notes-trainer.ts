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
const cfg = Object.assign({ mode: 'read', clef: 'treble', range: 'staff', oct: 'exact', hand: 'R', ctask: 'name', ctypes: ['triad'], piece: 'C', bpm: 80, sub: '1', rtask: 'value', rlevel: '1' }, store.get('nt-cfg', {}));
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
  $('sum').hidden = true; $('game').hidden = false; ['keys', 'piano', 'rkeys', 'tapBox'].forEach((id) => ($(id).style.visibility = ''));
  next();
}
function next() {
  if (cfg.mode === 'chords') return nextChord();
  if (cfg.mode === 'scales') return startSeq();
  if (cfg.mode === 'rhythm') return cfg.rtask === 'tap' ? nextTapBar() : nextRhythmValue();
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
  if (cfg.mode === 'rhythm') return playRhythm();
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
  const timed = cfg.mode === 'scales' ? seqTimes.filter(Boolean) : [];
  const lowTempo = timed.length >= seq.length / 2 && timed.filter((r) => r.ok).length / seq.length < 0.8;
  const extra = cfg.mode === 'scales' ? tempoSummary() : '';
  if (cfg.mode === 'scales') stopMetro();
  rClear();
  const msg = cfg.mode === 'rhythm' ? (pct === 1 ? L.rhPerfect : L.rhMore)
    : cfg.mode === 'scales' ? (lowTempo ? L.seqTempoLow : pct === 1 ? L.seqDonePerfect : L.seqDone)
    : pct === 1 ? (cfg.mode === 'chords' ? L.donePerfectChords : L.donePerfect) : pct >= 0.8 ? L.doneGood : L.doneMore;
  const uniq = [...new Map(round.misses.map((n) => [n.label || key(n), n])).values()];
  $('sum').innerHTML = `<div class="result">${round.right}<small> / ${ROUND}</small></div>
    <p>${msg}</p>${extra}
    ${uniq.length ? `<div class="misses">${uniq.map((n) => `<span>${n.label ? n.label : fullName(n) + (cfg.clef === 'both' ? (n.clef === 'bass' ? L.bassMark : L.trebleMark) : '')}</span>`).join('')}</div>` : ''}
    <button class="tool primary" type="button" id="again">${L.again}</button>`;
  $('sum').hidden = false; $('game').hidden = true; ['keys', 'piano', 'rkeys', 'tapBox'].forEach((id) => ($(id).style.visibility = 'hidden'));
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
  if (cfg.mode === 'rhythm') return 'rh-' + cfg.rtask + '-' + cfg.rlevel;
  if (cfg.mode === 'chords') return 'chords-' + cfg.hand + '-' + cfg.ctask + '-' + [...cfg.ctypes].sort().join('');
  return cfg.mode + '-' + cfg.clef + '-' + cfg.range;
}
function showHint() {
  const h = $('hint');
  if (cfg.mode === 'rhythm') { h.innerHTML = cfg.rtask === 'tap' ? L.hintRhTap : L.hintRhValue; return; }
  if (cfg.mode === 'scales') {
    h.innerHTML = (cfg.piece[0] === 'h' ? L.hintHanon : cfg.piece === 'F' ? L.hintScaleF : L.hintScale) + (cfg.hand === 'B' ? ' ' + L.hintBoth : '');
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
  $('pianoSvg').setAttribute('viewBox', '0 0 300 100');
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
// A step is one note per playing hand: [{d, alt, f, hand}], right hand first.
let seq = [], seqErr = [], seqHit = new Set(), seqLast = new Set(), seqFlash = null, seqTimer, seqDone = false;

function handLine(right) {
  const shift = right ? 0 : -7, out = [];
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
function buildSeq() {
  const hands = cfg.hand === 'B' ? ['R', 'L'] : [cfg.hand === 'L' ? 'L' : 'R'];
  const lines = hands.map((h) => handLine(h === 'R').map((n) => ({ ...n, hand: h })));
  return lines[0].map((_, i) => lines.map((l) => l[i]));
}
const stepNames = (step) => step.map(nm).join(' + ');
function startSeq() {
  clearTimeout(seqTimer); clearTimeout(timer);
  locked = false; seqDone = false; seqHit = new Set(); seqLast = new Set(); seqFlash = null;
  seq = buildSeq(); seqErr = seq.map(() => false); seqTimes = []; seqAnchor = null;
  ROUND = seq.length;
  $('task').innerHTML = `<b>${L.pieces[cfg.piece] || L.pieces.C}</b><span>${cfg.piece[0] === 'h' ? L.hanonSub : L.scaleSub} · ${L.handSub(cfg.hand)}</span>`;
  $('check').hidden = true; $('clear').hidden = true; $('nextBtn').hidden = true;
  const fb = $('fb'); fb.className = 'feedback idle';
  fb.textContent = metro.run ? L.metroGo : midiAccess && midiAccess.inputs.size ? L.seqAskMidi : cfg.hand === 'B' ? L.seqAskBoth : L.seqAsk;
  renderSeq();
  updateHUD();
  if (!$('hint').hidden) showHint();
}
// One staff of the current bar: notes, accidentals and fingers (above for the right hand, below for the left).
function seqStaff(clef, notes, start, above) {
  const X0 = 82, DX = 27;
  let h = staffBase(clef);
  notes.forEach((n, j) => {
    const idx = start + j, x = X0 + j * DX, p = n.d - BASE[clef], y = BOT - (p * S) / 2;
    const now = idx === round.i && !seqDone, hit = now && seqHit.has(midiN(n));
    const state = idx < round.i || hit ? 'ok' : now ? 'cur' : '';
    if (now) h += `<rect class="cur-mark" x="${x - 12}" y="${Math.min(y, BOT - 4 * S) - 30}" width="24" height="${Math.max(y, BOT) - Math.min(y, BOT - 4 * S) + 60}" rx="6"/>`;
    h += noteAt(x, p, 'note ' + state);
    if (n.alt) h += `<text class="acc sm" x="${x - 13}" y="${y + (n.alt > 0 ? 5 : 3)}" text-anchor="middle">${n.alt > 0 ? '♯' : '♭'}</text>`;
    const fy = above ? Math.min(y - 13, BOT - 4 * S - 8) : Math.max(y + 22, BOT + 20);
    const fc = idx < round.i ? ' done' : now ? ' now' : '';
    h += `<text class="fing${fc}" x="${x}" y="${fy}" text-anchor="middle">${n.f}</text>`;
  });
  return h;
}
const GRAND = 96; // distance between the treble and bass staves in two-hand mode
function renderSeq() {
  const i = Math.min(round.i, seq.length - 1), start = Math.floor(i / BAR) * BAR, bar = seq.slice(start, start + BAR);
  if (cfg.hand === 'B') {
    staff.setAttribute('viewBox', `0 -30 300 ${206 + GRAND}`);
    staff.innerHTML =
      seqStaff('treble', bar.map((st) => st[0]), start, true) +
      `<g transform="translate(0 ${GRAND})">${seqStaff('bass', bar.map((st) => st[1]), start, false)}</g>` +
      `<line class="line" x1="8" x2="8" y1="${BOT - 4 * S}" y2="${BOT + GRAND}"/>`;
  } else {
    staff.setAttribute('viewBox', '0 -30 300 206');
    staff.innerHTML = seqStaff(cfg.hand === 'L' ? 'bass' : 'treble', bar.map((st) => st[0]), start, cfg.hand !== 'L');
  }
  const cur = seq[round.i];
  $('finger').innerHTML = cur && !seqDone ? L.seqFinger(cur.map((n) => [n.hand, n.f])) : '';
  drawSeqPiano();
}
function drawSeqPiano() {
  const both = cfg.hand === 'B', lo = cfg.hand === 'R' ? 60 : 48, hi = lo + (both ? 36 : 24), W = 20;
  const cur = !seqDone && seq[round.i];
  const target = new Map(cur ? cur.filter((n) => !seqHit.has(midiN(n))).map((n) => [midiN(n), n.f]) : []);
  let wx = 0, whites = '', blacks = '';
  for (let m = lo; m <= hi; m++) {
    const isW = WHITE.includes(m % 12), x = isW ? wx * W : wx * W - 6;
    let cls = 'pk ' + (isW ? 'w' : 'b');
    if (m === seqFlash) cls += ' wrong';
    else if (target.has(m)) cls += ' sel';
    else if (seqLast.has(m) || seqHit.has(m)) cls += ' good';
    const rect = isW
      ? `<rect class="${cls}" data-m="${m}" x="${x + 0.5}" y=".5" width="${W - 1}" height="99" rx="3"/>`
      : `<rect class="${cls}" data-m="${m}" x="${x}" y=".5" width="12" height="60" rx="2"/>`;
    let lab = '';
    if (target.has(m)) {
      const cx = isW ? x + W / 2 : x + 6, cy = isW ? 84 : 48, r = isW ? 7.5 : 5.8;
      lab = `<circle class="fc" cx="${cx}" cy="${cy}" r="${r}"/><text class="ft" x="${cx}" y="${cy + 3.6}" text-anchor="middle">${target.get(m)}</text>`;
    } else if (m === 60 && isW) lab = `<text class="c4" x="${x + W / 2}" y="93" text-anchor="middle">${L.middleC}</text>`;
    if (isW) { whites += rect + lab; wx++; } else blacks += rect + lab;
  }
  const svg = $('pianoSvg');
  svg.setAttribute('viewBox', `0 0 ${wx * W} 100`);
  svg.innerHTML = whites + blacks;
}
function seqPress(m) {
  if (seqDone || $('game').hidden || !seq.length) return;
  tone(m, 0, 0.6);
  const cur = seq[round.i], fb = $('fb');
  if (seqHit.has(m)) return;
  if (cur.some((n) => midiN(n) === m)) {
    if (!seqHit.size) seqTimes[round.i] = seqTiming(round.i, nowT());
    seqHit.add(m); seqFlash = null;
    if (seqHit.size < cur.length) { renderSeq(); return; }
    if (!seqErr[round.i]) round.right++;
    seqLast = new Set(seqHit); seqHit = new Set(); round.i++;
    const tm = seqTimes[round.i - 1];
    fb.className = 'feedback ok'; fb.innerHTML = `<span>${L.seqOk(cur.map((n) => [n.hand, nm(n), n.f]))}${tm ? `<span class="timing">${timingText(tm)}</span>` : ''}</span>`;
    if (round.i >= seq.length) { seqDone = true; renderSeq(); updateHUD(); timer = setTimeout(finish, 900); return; }
  } else {
    if (!seqErr[round.i]) round.misses.push({ label: stepNames(cur) });
    seqErr[round.i] = true; seqFlash = m;
    fb.className = 'feedback bad'; fb.innerHTML = `<span>${L.seqBad(cur.map((n) => [n.hand, nm(n), n.f]))}</span>`;
    clearTimeout(seqTimer); seqTimer = setTimeout(() => { seqFlash = null; drawSeqPiano(); }, 500);
  }
  renderSeq(); updateHUD();
}
function playBar() {
  if (!seq.length) return;
  const from = Math.min(round.i, seq.length - 1), end = Math.floor(from / BAR) * BAR + BAR;
  seq.slice(from, end).forEach((step, k) => step.forEach((n) => tone(midiN(n), k * 0.32, 0.5)));
}

// ---------- metronome (scales and Hanon) ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const latency = () => (ac && (ac.outputLatency || ac.baseLatency)) || 0;
const nowT = () => ctx().currentTime - latency();
const scheduled = [];
function click(t, accent = false, soft = false) {
  const a = ctx(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = accent ? 1760 : 1320;
  const peak = soft ? 0.12 : accent ? 0.4 : 0.26;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.06);
  scheduled.push(o);
}
function flashDot(delay, accent) {
  setTimeout(() => {
    const d = $('beatDot'); d.classList.add('on'); d.classList.toggle('accent', accent);
    setTimeout(() => d.classList.remove('on', 'accent'), 90);
  }, Math.max(0, delay * 1000));
}
const metro = { run: false, timer: null, next: 0, n: 0, origin: 0 };
function schedMetro() {
  const a = ac, beat = 60 / cfg.bpm;
  while (metro.next < a.currentTime + 0.12) {
    const accent = metro.n % 4 === 0;
    click(metro.next, accent); flashDot(metro.next - a.currentTime, accent);
    metro.next += beat; metro.n++;
  }
}
function startMetro() {
  const a = ctx(); if (!a) return;
  clearInterval(metro.timer);
  metro.run = true; metro.origin = a.currentTime + 0.12; metro.next = metro.origin; metro.n = 0;
  metro.timer = setInterval(schedMetro, 25); schedMetro();
  $('metroBtn').setAttribute('aria-pressed', 'true');
  seqAnchor = null;
  if (cfg.mode === 'scales' && round.i === 0) { const fb = $('fb'); fb.className = 'feedback idle'; fb.textContent = L.metroGo; }
}
function stopMetro() {
  clearInterval(metro.timer); metro.run = false; seqAnchor = null;
  $('metroBtn').setAttribute('aria-pressed', 'false');
}
// Timing of a scale step against the metronome grid. Returns {dev, ok, off} or null without the metronome.
let seqAnchor = null, seqTimes = [];
function seqTiming(i, t) {
  if (!metro.run) return null;
  const step = 60 / cfg.bpm / Number(cfg.sub), grid = (x) => metro.origin + Math.round((x - metro.origin) / step) * step;
  const tol = clamp(0.15 * step, 0.05, 0.12);
  if (!seqAnchor) seqAnchor = { t: grid(t), i };
  let dev = t - (seqAnchor.t + (i - seqAnchor.i) * step), off = false;
  if (Math.abs(dev) > 0.75 * step) { seqAnchor = { t: grid(t), i }; dev = t - seqAnchor.t; off = true; }
  return { dev, ok: !off && Math.abs(dev) <= tol, off };
}
const timingText = (r) => (r.off ? L.offBeat : r.ok ? L.onBeat : r.dev < 0 ? L.early(Math.round(-r.dev * 1000)) : L.late(Math.round(r.dev * 1000)));
function tempoSummary() {
  const done = seqTimes.filter(Boolean);
  if (done.length < seq.length / 2) return '';
  const ok = done.filter((r) => r.ok).length, pct = Math.round((ok / seq.length) * 100), sub = Number(cfg.sub);
  const all = store.get('nt-tempo', {}), k = cfg.piece + '-' + cfg.hand, list = all[k] || [];
  list.push({ d: Date.now(), bpm: cfg.bpm, sub, pct });
  all[k] = list.slice(-30); store.set('nt-tempo', all);
  const fmt = (d) => new Date(d).toLocaleDateString(document.documentElement.lang, { day: 'numeric', month: 'short' });
  const good = list.filter((r) => r.pct >= 80).sort((a, b) => b.bpm * b.sub - a.bpm * a.sub)[0];
  const past = list.slice(0, -1).slice(-5).reverse();
  return `<p class="tempo-sum">${L.tempoLine(ok, seq.length, pct, cfg.bpm, sub)}</p>
    ${good ? `<p>${L.bestTempo(good.bpm * good.sub / sub)}</p>` : ''}
    ${past.length ? `<p>${L.historyH}</p><ul class="history">${past.map((r) => `<li>${L.histRow(fmt(r.d), r.bpm, r.sub, r.pct)}</li>`).join('')}</ul>` : ''}`;
}
function setBpm(v) {
  cfg.bpm = clamp(v, 40, 200); store.set('nt-cfg', cfg); $('bpmOut').textContent = cfg.bpm;
  if (metro.run) startMetro();
}
$('bpmDown').onclick = () => setBpm(cfg.bpm - 5);
$('bpmUp').onclick = () => setBpm(cfg.bpm + 5);
$('metroBtn').onclick = () => (metro.run ? stopMetro() : startMetro());

// ---------- rhythm ----------
// Durations in sixteenths. Kinds starting with r are rests.
const LEN = { w: 16, h: 8, q: 4, e: 2, s: 1, hd: 12, qd: 6, rw: 16, rh: 8, rq: 4, re: 2 };
const MID = BOT - 2 * S, STEM = 36;
function head(x, kind) {
  if (kind === 'w') return `<path class="note" fill-rule="evenodd" d="${ell(x, MID, 8.6, 6, 0)}${ell(x, MID, 3.1, 5.2, -32)}"/>`;
  const hollow = kind === 'h' || kind === 'hd';
  return `<path class="note" fill-rule="evenodd" d="${ell(x, MID, 7, 5, -20)}${hollow ? ell(x, MID, 5, 2.4, -20) : ''}"/>`;
}
const flagPath = (sx, top) => `<path class="flag" d="M${sx} ${top} c 1 7 10 9 9 20 c 2 -9 -3 -14 -9 -15 z"/>`;
// One symbol on the middle line. stemTop overrides the stem end (for beams); flags=false when beamed.
function glyph(kind, x, stemTop = MID - STEM, flags = true) {
  let h = '';
  if (kind[0] === 'r') {
    if (kind === 'rw') h = `<rect class="rest-box" x="${x - 7}" y="${BOT - 3 * S}" width="14" height="6"/>`;
    else if (kind === 'rh') h = `<rect class="rest-box" x="${x - 7}" y="${MID - 6}" width="14" height="6"/>`;
    else if (kind === 'rq') h = `<path class="rest-line" d="M${x - 2} ${MID - 17} L${x + 4} ${MID - 9} L${x - 2} ${MID - 2} L${x + 4} ${MID + 5} Q${x - 5} ${MID + 2} ${x + 1} ${MID + 13}"/>`;
    else h = `<circle class="rest-box" cx="${x - 3}" cy="${MID - 7}" r="3"/><path class="rest-line" style="stroke-width:2" d="M${x - 2} ${MID - 5} Q${x + 2} ${MID - 5} ${x + 5} ${MID - 10} L${x - 1} ${MID + 10}"/>`;
    return h;
  }
  h += head(x, kind);
  if (kind !== 'w') h += `<line class="stem" x1="${x + 6.4}" x2="${x + 6.4}" y1="${MID - 1}" y2="${stemTop}"/>`;
  if (flags && (kind === 'e' || kind === 's')) {
    h += flagPath(x + 6.4, stemTop);
    if (kind === 's') h += flagPath(x + 6.4, stemTop + 7);
  }
  if (kind === 'hd' || kind === 'qd') h += `<circle class="dot" cx="${x + 14}" cy="${MID - 5}" r="2.3"/>`;
  return h;
}
function rhythmStaff(W, ts = true) {
  let h = '';
  for (let i = 0; i < 5; i++) { const y = BOT - i * S; h += `<line class="line" x1="8" x2="${W - 8}" y1="${y}" y2="${y}"/>`; }
  h += `<line class="line" x1="8" x2="8" y1="${BOT - 4 * S}" y2="${BOT}"/><rect class="ts" x="${W - 12}" y="${BOT - 4 * S}" width="4" height="${4 * S}"/><line class="line" x1="${W - 16}" x2="${W - 16}" y1="${BOT - 4 * S}" y2="${BOT}"/>`;
  if (ts) h += `<text class="ts" x="30" y="${MID - 2}" text-anchor="middle">4</text><text class="ts" x="30" y="${BOT - 2}" text-anchor="middle">4</text>`;
  return h;
}
// cells: k = symbols, at = allowed start positions (default: on any beat), lvl = first level that uses it
const CELLS = [
  { k: ['w'], at: [0], lvl: 1, w: 0.4 }, { k: ['h'], at: [0, 8], lvl: 1 }, { k: ['q'], lvl: 1, w: 1.6 },
  { k: ['rq'], lvl: 1, w: 0.6 }, { k: ['rh'], at: [0, 8], lvl: 1, w: 0.4 },
  { k: ['e', 'e'], lvl: 2, w: 1.6 }, { k: ['hd'], at: [0, 4], lvl: 2 }, { k: ['re', 'e'], lvl: 2, w: 0.6 },
  { k: ['s', 's', 's', 's'], lvl: 3 }, { k: ['e', 's', 's'], lvl: 3 }, { k: ['s', 's', 'e'], lvl: 3 }, { k: ['qd', 'e'], at: [0, 8], lvl: 3 },
];
function genBar() {
  const lvl = Number(cfg.rlevel);
  for (let tries = 0; tries < 50; tries++) {
    const items = []; let pos = 0, cid = 0;
    while (pos < 16) {
      const c = CELLS.filter((c) => c.lvl <= lvl).map((c) => ({ ...c, len: c.k.reduce((a, k) => a + LEN[k], 0) }))
        .filter((c) => c.len <= 16 - pos && (c.at ? c.at.includes(pos) : true));
      const w = c.map((x) => (x.w || 1) * (x.lvl === lvl && lvl > 1 ? 2 : 1));
      let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = c[c.length - 1];
      for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) { pick = c[i]; break; } }
      let t = pos;
      pick.k.forEach((k) => { items.push({ k, t, cell: cid, beam: pick.k.length > 1 && pick.k.every((x) => x === 'e' || x === 's') }); t += LEN[k]; });
      pos += pick.len; cid++;
    }
    const notes = items.filter((it) => it.k[0] !== 'r').length;
    const sig = items.map((i) => i.k).join();
    if (notes >= 2 && sig !== rState.sig) { rState.sig = sig; return items; }
  }
  return [{ k: 'q', t: 0 }, { k: 'q', t: 4 }, { k: 'h', t: 8 }];
}
const RW = 350, RX0 = 62, RSPAN = 262;
const rx = (t) => RX0 + (t / 16) * RSPAN + 10;
function drawBar(items, results) {
  staff.setAttribute('viewBox', `0 22 ${RW} ${results ? 146 : 128}`);
  let h = rhythmStaff(RW);
  // beat numbers under the staff, so it's clear where each note falls
  for (let k = 0; k < 4; k++) h += `<text class="beatnum" x="${rx(k * 4) + 3}" y="${BOT + 18}" text-anchor="middle">${k + 1}</text>`;
  const groups = {};
  items.forEach((it) => { if (it.beam) (groups[it.cell] = groups[it.cell] || []).push(it); });
  items.forEach((it, idx) => {
    const res = results && results[idx], cls = res ? (res === 'ok' ? 'ok' : 'bad') : '';
    h += `<g class="${cls}" data-idx="${idx}">${glyph(it.k, rx(it.t), MID - STEM, !it.beam)}</g>`;
    if (res) h += `<text class="rmark ${res === 'ok' ? 'ok' : 'bad'}" x="${rx(it.t) + 3}" y="${BOT + 36}" text-anchor="middle">${L.marks[res]}</text>`;
  });
  Object.values(groups).forEach((g) => {
    const top = MID - STEM, xs = g.map((it) => rx(it.t) + 6.4);
    const bad = results && g.some((it) => results[items.indexOf(it)] !== 'ok'), ok = results && !bad;
    const cls = results ? (ok ? 'ok' : 'bad') : '';
    h += `<g class="${cls}"><rect class="beam" x="${xs[0] - 0.7}" y="${top}" width="${xs[xs.length - 1] - xs[0] + 1.4}" height="4.5"/>`;
    g.forEach((it, j) => {
      if (it.k !== 's') return;
      const nx = g[j + 1] && g[j + 1].k === 's', px = g[j - 1] && g[j - 1].k === 's';
      if (nx) h += `<rect class="beam" x="${xs[j] - 0.7}" y="${top + 7}" width="${xs[j + 1] - xs[j] + 1.4}" height="4.5"/>`;
      else if (!px) { const dir = j > 0 ? -1 : 1; h += `<rect class="beam" x="${dir > 0 ? xs[j] : xs[j] - 8}" y="${top + 7}" width="8" height="4.5"/>`; }
    });
    h += '</g>';
  });
  h += `<line class="playhead" id="rhPlayhead" x1="0" x2="0" y1="${BOT - 4 * S - 6}" y2="${BOT + 6}" visibility="hidden"/>`;
  staff.innerHTML = h;
}
const rState = { items: [], phase: 'idle', B: 0, beat: 0.75, taps: [], scored: false, timers: [], sig: '', kind: null, raf: 0, results: null };
// A line that runs through the bar in time; with light=true each note lights up as it sounds.
function runPlayhead(B, beat, light) {
  cancelAnimationFrame(rState.raf);
  const ph = $('rhPlayhead'); if (!ph) return;
  const lit = new Set();
  const frame = () => {
    const pos = (ac.currentTime - latency() - B) / (4 * beat);
    if (pos > 1.02) { ph.setAttribute('visibility', 'hidden'); staff.querySelectorAll('g.now').forEach((g) => g.classList.remove('now')); return; }
    if (pos >= 0) {
      const x = rx(16 * Math.min(pos, 1)) + 3;
      ph.setAttribute('x1', x); ph.setAttribute('x2', x); ph.setAttribute('visibility', 'visible');
      if (light) rState.items.forEach((it, idx) => {
        if (it.k[0] === 'r' || lit.has(idx) || pos * 16 < it.t) return;
        lit.add(idx); staff.querySelectorAll('g.now').forEach((g) => g.classList.remove('now'));
        const g = staff.querySelector(`g[data-idx="${idx}"]`); if (g) g.classList.add('now');
      });
    }
    rState.raf = requestAnimationFrame(frame);
  };
  rState.raf = requestAnimationFrame(frame);
}
function rClear() {
  cancelAnimationFrame(rState.raf);
  rState.timers.forEach(clearTimeout); rState.timers = [];
  scheduled.forEach((o) => { try { o.stop(); } catch {} }); scheduled.length = 0;
  if (metro.run) { /* the scales metronome is stopped outside scales mode */ }
}
function nextTapBar() {
  rClear(); clearTimeout(timer);
  rState.items = genBar(); rState.phase = 'idle'; rState.scored = false; rState.taps = []; rState.results = null;
  drawBar(rState.items);
  const fb = $('fb'); fb.className = 'feedback idle'; fb.textContent = L.tapIdle;
  $('rStart').hidden = false; $('rListen').hidden = false; $('rRetry').hidden = true; $('rNext').hidden = true;
  updateHUD();
  if (!$('hint').hidden) showHint();
}
function rStart() {
  if (rState.phase === 'count' || rState.phase === 'play') return;
  const a = ctx(); if (!a) return;
  rClear(); rState.results = null; drawBar(rState.items);
  const beat = 60 / cfg.bpm, t0 = a.currentTime + 0.25;
  rState.beat = beat; rState.B = t0 + 4 * beat; rState.taps = []; rState.phase = 'count';
  runPlayhead(rState.B, beat, false);
  for (let k = 0; k < 8; k++) click(t0 + k * beat, k % 4 === 0, k >= 4);
  const fb = $('fb'); fb.className = 'feedback idle';
  for (let k = 0; k < 4; k++) rState.timers.push(setTimeout(() => (fb.innerHTML = `<span class="big">${k + 1}</span>`), (t0 + k * beat - a.currentTime) * 1000));
  rState.timers.push(setTimeout(() => { rState.phase = 'play'; fb.innerHTML = `<span class="big">${L.tapNow}</span>`; }, (rState.B - a.currentTime - 0.05) * 1000));
  rState.timers.push(setTimeout(rEvaluate, (rState.B + 4 * beat + 0.35 * beat - a.currentTime) * 1000));
  $('rStart').hidden = true; $('rListen').hidden = true; $('rRetry').hidden = true; $('rNext').hidden = true;
}
function rTap() {
  const b = $('tapBtn'); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 90);
  if (rState.phase !== 'count' && rState.phase !== 'play') return;
  const a = ctx(), t = a.currentTime - latency();
  const o = a.createOscillator(), g = a.createGain(); o.type = 'triangle'; o.frequency.value = 660;
  g.gain.setValueAtTime(0.2, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.08);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.1);
  if (t >= rState.B - 0.5 * rState.beat) rState.taps.push(t);
}
function rEvaluate() {
  rState.phase = 'done';
  const { items, B, beat, taps } = rState, sx = beat / 4;
  const exp = items.map((it, idx) => ({ idx, t: B + it.t * sx, rest: it.k[0] === 'r' })).filter((e) => !e.rest);
  const onsets = [...exp.map((e) => e.t), B + 16 * sx];
  const minGap = Math.min(...onsets.slice(1).map((t, i) => t - onsets[i]));
  const win = Math.min(0.45 * minGap, 0.35 * beat), tol = Math.min(win, clamp(0.13 * beat, 0.07, 0.12));
  const used = new Set(), results = items.map(() => null);
  exp.forEach((e) => {
    let best = -1, bd = Infinity;
    taps.forEach((t, j) => { const d = Math.abs(t - e.t); if (!used.has(j) && d <= win && d < bd) { bd = d; best = j; } });
    if (best < 0) { results[e.idx] = 'miss'; return; }
    used.add(best); const dev = taps[best] - e.t;
    results[e.idx] = Math.abs(dev) <= tol ? 'ok' : dev < 0 ? 'early' : 'late';
  });
  const ok = exp.filter((e) => results[e.idx] === 'ok').length, extra = taps.length - used.size;
  const perfect = ok === exp.length && extra === 0;
  rState.results = results; drawBar(items, results);
  const fb = $('fb'); fb.className = 'feedback ' + (perfect ? 'ok' : 'bad'); fb.innerHTML = `<span>${L.tapResult(ok, exp.length, extra)}</span>`;
  if (!rState.scored) {
    rState.scored = true; round.i++;
    if (perfect) round.right++;
    const s = stats['r:tap' + cfg.rlevel] || { n: 0, e: 0 }; s.n++; if (!perfect) s.e++; stats['r:tap' + cfg.rlevel] = s; store.set('nt-stats', stats);
  }
  $('rRetry').hidden = false; $('rNext').hidden = false; $('rListen').hidden = false;
  updateHUD();
}
function rNext() { if (round.i >= ROUND) finish(); else nextTapBar(); }
function playRhythm() {
  const a = ctx(); if (!a) return;
  rClear();
  const beat = 60 / cfg.bpm, t0 = a.currentTime + 0.2;
  if (cfg.rtask === 'tap') {
    if (rState.phase === 'count' || rState.phase === 'play') return;
    const was = rState.phase; rState.phase = 'listen';
    drawBar(rState.items, rState.results);
    for (let k = 0; k < 8; k++) click(t0 + k * beat, k % 4 === 0, k >= 4);
    const B = t0 + 4 * beat;
    rState.items.forEach((it) => { if (it.k[0] !== 'r') tone(71, B + (it.t * beat) / 4 - a.currentTime, Math.max(0.12, (LEN[it.k] * beat) / 4 * 0.9)); });
    runPlayhead(B, beat, true);
    const fb = $('fb'), before = fb.innerHTML, beforeCls = fb.className; fb.className = 'feedback idle';
    for (let k = 0; k < 4; k++) rState.timers.push(setTimeout(() => (fb.innerHTML = `<span class="big">${k + 1}</span>`), (t0 + k * beat - a.currentTime) * 1000));
    rState.timers.push(setTimeout(() => (fb.innerHTML = `<span class="big">${L.listening}</span>`), (B - a.currentTime) * 1000));
    rState.timers.push(setTimeout(() => { rState.phase = was; fb.className = beforeCls; fb.innerHTML = before; }, (B + 4 * beat + 0.3 - a.currentTime) * 1000));
  } else if (rState.kind) {
    const b = 60 / 80, len = LEN[rState.kind];
    for (let k = 0; k < Math.max(4, Math.ceil(len / 4)); k++) click(t0 + k * b, k % 4 === 0, true);
    if (rState.kind[0] !== 'r') tone(71, t0 - a.currentTime, (len * b) / 4 * 0.95);
  }
}
// "How many beats" quiz
const RVALS = [[16, '4'], [12, '3'], [8, '2'], [6, '1½'], [4, '1'], [2, '½'], [1, '¼']];
const RPOOL = { 1: ['w', 'h', 'q', 'rw', 'rh', 'rq'], 2: ['w', 'h', 'q', 'e', 'hd', 'rw', 'rh', 'rq', 're'], 3: ['w', 'h', 'q', 'e', 's', 'hd', 'qd', 'rw', 'rh', 'rq', 're'] };
function rValues() { const lens = new Set(RPOOL[cfg.rlevel].map((k) => LEN[k])); return RVALS.filter(([v]) => lens.has(v)); }
function buildRKeys() {
  const box = $('rkeys'), vals = rValues();
  box.innerHTML = ''; box.style.gridTemplateColumns = `repeat(${vals.length}, minmax(0, 1fr))`;
  vals.forEach(([v, lab]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.dataset.v = v; b.onclick = () => rAnswer(v, b); box.appendChild(b); });
}
function drawSingle(kind, cls = '') {
  staff.setAttribute('viewBox', '0 22 300 112');
  staff.innerHTML = rhythmStaff(300) + `<g class="${cls}">${glyph(kind, 170)}</g>`;
}
function nextRhythmValue() {
  locked = false;
  const pool = RPOOL[cfg.rlevel].filter((k) => k !== rState.kind);
  const w = pool.map((k) => { const s = stats['r:' + k]; return s ? 1 + (4 * s.e) / s.n : 1.6; });
  let r = Math.random() * w.reduce((a, b) => a + b, 0), kind = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { kind = pool[i]; break; } }
  rState.kind = kind;
  if ($('rkeys').children.length !== rValues().length) buildRKeys();
  [...$('rkeys').children].forEach((b) => { b.className = ''; b.disabled = false; });
  drawSingle(kind);
  const fb = $('fb'); fb.className = 'feedback idle'; fb.textContent = L.rhAsk;
  updateHUD();
  if (!$('hint').hidden) showHint();
}
function rAnswer(v, btn) {
  if (locked || $('game').hidden || cfg.rtask !== 'value') return; locked = true;
  const kind = rState.kind, len = LEN[kind], ok = v === len;
  const s = stats['r:' + kind] || { n: 0, e: 0 }; s.n++; if (!ok) s.e++;
  if (s.n > 12) { s.n = Math.round(s.n * 0.75); s.e = Math.round(s.e * 0.75); }
  stats['r:' + kind] = s; store.set('nt-stats', stats);
  const btns = [...$('rkeys').children]; btns.forEach((b) => (b.disabled = true));
  const right = btns.find((b) => Number(b.dataset.v) === len); if (right) right.className = 'ok';
  if (!ok && btn) btn.className = 'bad';
  drawSingle(kind, ok ? 'ok' : 'bad');
  const fb = $('fb');
  if (ok) { round.right++; fb.className = 'feedback ok'; fb.innerHTML = `<span>${L.rhOk(L.durs[kind], L.beats(len))}</span>`; }
  else { round.misses.push({ label: L.durs[kind] }); fb.className = 'feedback bad'; fb.innerHTML = `<span>${L.rhBad(L.durs[kind], L.beats(len))}</span>`; }
  round.i++; updateHUD();
  timer = setTimeout(() => (round.i >= ROUND ? finish() : nextRhythmValue()), ok ? 1100 : 2400);
}
function buildMemo() {
  $('memoGrid').innerHTML = ['w', 'h', 'q', 'e', 's', 'hd', 'qd', 'rw', 'rh', 'rq', 're'].map((k) => {
    let lines = ''; for (let i = 0; i < 5; i++) lines += `<line class="line" x1="0" x2="36" y1="${BOT - i * S}" y2="${BOT - i * S}"/>`;
    return `<div class="memo-item"><svg class="staff" viewBox="-2 38 40 72" aria-hidden="true">${lines}${glyph(k, 15)}</svg><div><b>${L.durs[k]}</b><span>${L.beats(LEN[k])}</span></div></div>`;
  }).join('');
}
$('rStart').onclick = rStart;
$('rListen').onclick = playRhythm;
$('rRetry').onclick = () => { rState.phase = 'idle'; rStart(); };
$('rNext').onclick = rNext;
$('tapBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); rTap(); });
buildMemo();

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
  const ear = cfg.mode === 'ear', ch = cfg.mode === 'chords', sc = cfg.mode === 'scales', rh = cfg.mode === 'rhythm', tap = rh && cfg.rtask === 'tap';
  $('row-clef').hidden = ear || ch || sc || rh; $('row-range').hidden = ear || ch || sc || rh;
  $('row-rtask').hidden = !rh; $('row-rlevel').hidden = !rh;
  $('row-tempo').hidden = !(sc || tap); $('metroBtn').hidden = !sc; $('row-sub').hidden = !sc;
  $('rkeys').hidden = !rh || tap; $('tapBox').hidden = !tap; $('memo').hidden = !rh;
  if (!sc) stopMetro();
  rClear();
  if (rh && !tap) buildRKeys();
  ['row-ctype', 'row-task'].forEach((id) => ($(id).hidden = !ch));
  $('row-hand').hidden = !(ch || sc); $('row-piece').hidden = !sc;
  $('h-both').hidden = !sc;
  if (!sc && cfg.hand === 'B') {
    cfg.hand = 'R'; store.set('nt-cfg', cfg);
    $('seg-hand').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === 'R')));
  }
  $('keys').hidden = ch || sc || rh; $('piano').hidden = !(ch || sc);
  $('task').hidden = !(ch || sc); $('finger').hidden = !(ch || sc);
  ROUND = ch ? 10 : tap ? 8 : 20;
}
bindSeg('seg-mode', 'mode'); bindSeg('seg-clef', 'clef'); bindSeg('seg-range', 'range'); bindSeg('seg-oct', 'oct');
bindSeg('seg-hand', 'hand'); bindSeg('seg-task', 'ctask'); bindSeg('seg-piece', 'piece');
bindSeg('seg-rtask', 'rtask'); bindSeg('seg-rlevel', 'rlevel'); bindSeg('seg-sub', 'sub');
$('bpmOut').textContent = cfg.bpm;
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
  if (cfg.mode === 'rhythm') { if (on && cfg.rtask === 'tap') rTap(); return; }
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
  if (cfg.mode === 'rhythm') {
    if (cfg.rtask === 'tap') {
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); rTap(); }
      else if (e.key === 'Enter' && !e.target.closest('button, summary, a')) { if (!$('rNext').hidden) rNext(); else rStart(); }
    } else {
      const i = '1234567'.indexOf(e.key), b = $('rkeys').children[i];
      if (b && !$('game').hidden) rAnswer(Number(b.dataset.v), b);
    }
    return;
  }
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
else if (cfg.mode === 'rhythm') next();
else {
  drawStaff(cur.clef, cur.pos, '', cfg.mode === 'ear');
  $('fb').textContent = cfg.mode === 'ear' ? L.askEarStart : L.ask;
  updateHUD();
}
