// Sheet-music pages: renders the ABC source with abcjs (loaded as a global from /vendor/)
// and plays it on the site's piano, lighting up each note as it sounds.
// @ts-nocheck — abcjs is a plain global here.
import { stopAll, tone } from './piano';

const box = document.querySelector('[data-sheet]');
if (box && window.ABCJS) {
  const ABCJS = window.ABCJS;
  const src = box.querySelector('[data-abc]').textContent;
  const scoreEl = box.querySelector('[data-score]');
  const playBtn = box.querySelector('[data-play]');
  const trOut = box.querySelector('[data-tr-out]');
  let transpose = 0, vo = null, timing = null, endTimer = null, playing = false;

  // The page already shows the title and composer, so they're left out of the drawn score.
  const drawSrc = src.split('\n').filter((l) => !/^\s*[TC]:/.test(l)).join('\n');
  // Narrow screens get two bars per line, so the notes stay readable on a phone.
  const narrow = () => scoreEl.clientWidth < 560;
  let wasNarrow = narrow();
  const render = () => {
    const w = Math.max(280, scoreEl.clientWidth);
    vo = ABCJS.renderAbc(scoreEl, drawSrc, {
      add_classes: true, responsive: 'resize', visualTranspose: transpose, paddingleft: 0, paddingright: 0, paddingtop: 0,
      staffwidth: w - 10, scale: narrow() ? 0.9 : 1,
      wrap: { minSpacing: 1.6, maxSpacing: 2.8, preferredMeasuresPerLine: narrow() ? 2 : 4 },
    })[0];
  };
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!playing) render(); wasNarrow = narrow(); }, 200);
  });
  const clearLit = () => scoreEl.querySelectorAll('.playing').forEach((el) => el.classList.remove('playing'));
  const stop = () => {
    playing = false; stopAll(); clearTimeout(endTimer);
    if (timing) { timing.stop(); timing = null; }
    clearLit(); playBtn.textContent = playBtn.dataset.playLabel;
  };
  const play = () => {
    stop();
    const audio = vo.setUpAudio();
    const spw = 60 / vo.getBpm() / vo.getBeatLength(); // seconds per whole note
    const lead = 0.15;
    let end = 0;
    audio.tracks.forEach((track) => track.forEach((e) => {
      if (e.cmd !== 'note') return;
      // abcjs moves the notes on the staff but not the sound, so the transposition is added here
      tone(e.pitch + transpose, lead + e.start * spw, Math.max(0.15, e.duration * spw * 0.95));
      end = Math.max(end, e.start + e.duration);
    }));
    timing = new ABCJS.TimingCallbacks(vo, {
      eventCallback: (ev) => {
        clearLit();
        if (!ev) return;
        (ev.elements || []).flat().forEach((el) => el.classList && el.classList.add('playing'));
      },
    });
    setTimeout(() => timing && timing.start(), lead * 1000);
    endTimer = setTimeout(stop, (lead + end * spw + 0.6) * 1000);
    playing = true; playBtn.textContent = playBtn.dataset.stopLabel;
  };

  render();
  playBtn.addEventListener('click', () => (playing ? stop() : play()));
  box.querySelectorAll('[data-tr]').forEach((b) =>
    b.addEventListener('click', () => {
      stop();
      transpose = Math.max(-12, Math.min(12, transpose + Number(b.dataset.tr)));
      trOut.textContent = (transpose > 0 ? '+' : '') + transpose;
      render();
    }),
  );
}
