/* =========================================================
   HERO PREVIEW — "The Valley"
   A living five-layer parallax ASCII landscape.

   Layers (back → front):
     0 sky    — stars / milky way / Big Dipper / clouds / haze
     1 far    — distant ridge
     2 mid    — middle ridge
     3 near   — near ridge, pines, cabin
     4 fore   — valley grass, river with current + glints

   Features:
     • 5 time-of-day scenes (auto from clock, manual via HUD)
     • mouse + scroll parallax across all layers
     • procedural ridgelines — new mountains every visit
     • crystallize-in intro
     • sprites: birds / flocks, drone, shooting stars,
       fireflies, chimney smoke, sun & moon
     • honors prefers-reduced-motion, pauses when tab hidden
   ========================================================= */

(() => {
'use strict';

// ── Config ────────────────────────────────────────────────
const PAD    = 8;   // extra columns each side (parallax travel)
const ROWPAD = 2;   // extra rows top/bottom

const LAYER_IDS = ['sky', 'far', 'mid', 'near', 'fore'];
const PARA_X    = { sky: .12, far: .28, mid: .50, near: .80, fore: 1.10 };
const PARA_SCR  = { sky: .32, far: .22, mid: .13, near: .06, fore: 0    };

const PHASES = {
  dawn: {
    bg: ['#e9d8e4', '#f3e6da', '#f5f2eb'], ink: '#33283f', muted: '#8d7f96',
    op: { sky: .50, far: .26, mid: .38, near: .50, fore: .55 },
    stars: { bright: .002, dim: .006 }, haze: .14, clouds: 1,
    sun: { x: .16, y: .34 }, moon: null,
    fireflies: false, shooting: false, glint: .003, moonglade: false,
  },
  day: {
    bg: ['#dbeaf7', '#e8f2f9', '#f5f2eb'], ink: '#1a1a1a', muted: '#6b6b6b',
    op: { sky: .55, far: .30, mid: .42, near: .55, fore: .60 },
    stars: null, haze: 0, clouds: 2,
    sun: { x: .72, y: .09 }, moon: null,
    fireflies: false, shooting: false, glint: .004, moonglade: false,
  },
  golden: {
    bg: ['#f6ddb4', '#f7ecd8', '#f5f2eb'], ink: '#43301c', muted: '#9a7d55',
    op: { sky: .60, far: .34, mid: .46, near: .60, fore: .65 },
    stars: null, haze: .18, clouds: 1,
    sun: { x: .80, y: .30 }, moon: null,
    fireflies: false, shooting: false, glint: .007, moonglade: false,
  },
  dusk: {
    bg: ['#b9b3cf', '#d7cdd4', '#efe9e0'], ink: '#2e2740', muted: '#7a7090',
    op: { sky: .65, far: .38, mid: .50, near: .62, fore: .66 },
    stars: { bright: .004, dim: .012 }, haze: .14, clouds: 1,
    sun: null, moon: { x: .24, y: .16 },
    fireflies: true, shooting: false, glint: .002, moonglade: false,
  },
  night: {
    bg: ['#070b16', '#0d1020', '#131228'], ink: '#cdc7e0', muted: '#8a82ab',
    op: { sky: .80, far: .35, mid: .50, near: .68, fore: .60 },
    stars: { bright: .009, dim: .026 }, haze: 0, clouds: 0,
    sun: null, moon: { x: .20, y: .09 },
    fireflies: true, shooting: true, glint: 0, moonglade: true,
  },
};

const SUN_ROWS  = ['  \\ | /', '-- ( ) --', '  / | \\'];
const MOON_ROWS = ['   .--.', "  /  .'", ' |  |', "  \\  '.", "   '--'"];

const CLOUD_SHAPES = [
  ['   .--~~--.', '  ( ~  ~   )~'],
  [' .-~~-.', '(  ~   )'],
  ['    .-~~~-.', ' ~(  ~  ~   )', '   ~~--~~'],
];

// Big Dipper: [colOffset, rowOffset, char]
const DIPPER = [
  [0, 0, '*'], [4, 1, '*'], [8, 1, '*'],           // handle
  [12, 2, '*'], [17, 3, '+'], [18, 6, '*'], [12, 6, '+'], // bowl
];

const GRASS_CHARS = [',', '.', "'", '`'];
const GRASS_ALT   = { ',': '.', '.': ',', "'": '`', '`': "'" };
const NOISE       = "/\\^.~-'`:*";

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── State ─────────────────────────────────────────────────
const S = {
  charW: 8, lineH: 12, W: 0, R: 0, rows: 0, vw: 0, vh: 0,
  far: [], mid: [], near: [], valleyTop: 0, riverTop: 0,
  cabin: null, riverBase: [], clouds: [],
  phase: 'day', mode: 'auto',
  live: { sky: false, fore: false },
  px: 0, py: 0, tx: 0, ty: 0,        // parallax current / target
  timers: [], bgFlip: false,
};

const hero   = document.getElementById('hero');
const layers = {};
LAYER_IDS.forEach(id => layers[id] = document.getElementById('layer-' + id));
const bgA = document.getElementById('bgA');
const bgB = document.getElementById('bgB');

// ── Utils ─────────────────────────────────────────────────
function hash(x, y) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const hash3 = (x, y, z) => hash(x * 31 + z * 7, y * 17 - z * 3);
const rand  = (a, b) => a + Math.random() * (b - a);

const blank = () => Array.from({ length: S.rows }, () => new Array(S.W).fill(' '));
const paint = (id, g) => { layers[id].textContent = g.map(r => r.join('')).join('\n'); };

function later(fn, ms) { const id = setTimeout(fn, ms); S.timers.push(id); return id; }
function every(fn, ms) { const id = setInterval(fn, ms); S.timers.push(id); return id; }

function cellToPx(c, r) {
  return { x: (c - PAD) * S.charW, y: (r - ROWPAD) * S.lineH };
}

// ── Terrain generation ────────────────────────────────────
function makeRidge(nHarm, yMin, ySpan) {
  const harm = Array.from({ length: nHarm }, (_, i) => [
    1.6 + i * i * 1.9 + Math.random() * 1.2,      // frequency
    0.42 / (i + 1),                                // amplitude
    Math.random() * Math.PI * 2,                   // phase
  ]);
  const raw = [];
  for (let c = 0; c < S.W; c++) {
    const t = c / Math.max(S.W - 1, 1);
    raw.push(harm.reduce((s, [f, a, p]) => s + a * Math.sin(Math.PI * f * t + p), 0));
  }
  const lo = Math.min(...raw), range = (Math.max(...raw) - lo) || 1;
  return raw.map(v => ROWPAD + Math.round((yMin + (1 - (v - lo) / range) * ySpan) * S.R));
}

function slopeChar(ridge, c, flat) {
  const m = ridge[c], l = ridge[c - 1] ?? m, r = ridge[c + 1] ?? m;
  if (l > m && r > m) return '^';
  if (l > m) return '/';
  if (r > m) return '\\';
  return flat;
}

// ── Layer builders ────────────────────────────────────────
function buildFar() {
  const g = blank();
  for (let c = 0; c < S.W; c++) {
    for (let r = 0; r < S.rows; r++) {
      if (r >= S.mid[c]) break;                    // occluded by mid ridge
      if (r === S.far[c]) g[r][c] = slopeChar(S.far, c, '-');
      else if (r > S.far[c] && hash(c, r) < 0.04) g[r][c] = "'";
    }
  }
  return g;
}

function buildMid() {
  const g = blank();
  for (let c = 0; c < S.W; c++) {
    for (let r = 0; r < S.rows; r++) {
      if (r >= S.near[c]) break;                   // occluded by near ridge
      if (r === S.mid[c]) g[r][c] = slopeChar(S.mid, c, '-');
      else if (r > S.mid[c]) {
        const h = hash(c + 1000, r);
        if (h < 0.02) g[r][c] = '"';
        else if (h < 0.08) g[r][c] = ':';
      }
    }
  }
  return g;
}

function buildNear() {
  const g = blank();
  for (let c = 0; c < S.W; c++) {
    for (let r = 0; r < S.rows && r <= S.valleyTop; r++) {
      if (r === S.near[c]) g[r][c] = slopeChar(S.near, c, '_');
      else if (r > S.near[c]) {
        const depth = (r - S.near[c]) / Math.max(S.valleyTop - S.near[c], 1);
        const h = hash(c + 2000, r);
        const p = 0.07 + 0.11 * depth;
        if (h < p * 0.10) g[r][c] = '+';
        else if (h < p) g[r][c] = '.';
      }
    }
    // scattered pines on the ridgeline
    const l = S.near[c - 1] ?? S.near[c], rr = S.near[c + 1] ?? S.near[c];
    if (hash(c, 999) < 0.035 && Math.abs(l - rr) <= 1 && S.near[c] - 1 > S.mid[c]) {
      g[S.near[c] - 1][c] = '^';
    }
  }
  drawCabin(g);
  return g;
}

function drawCabin(g) {
  // find the flattest 7-column window on the near ridge, middle-ish
  let best = null;
  const from = Math.floor(S.W * 0.30), to = Math.floor(S.W * 0.72) - 7;
  for (let c = from; c < to; c++) {
    const win = S.near.slice(c, c + 7);
    const spread = Math.max(...win) - Math.min(...win);
    if (!best || spread < best.spread) best = { c, spread, base: Math.min(...win) };
  }
  if (!best || best.spread > 3) { S.cabin = null; return; }

  const { c, base } = best;
  const put = (r, cc, s) => {
    for (let i = 0; i < s.length; i++)
      if (r >= 0 && r < S.rows && cc + i >= 0 && cc + i < S.W && s[i] !== ' ')
        g[r][cc + i] = s[i];
  };
  put(base - 3, c + 2, '/\\');
  put(base - 2, c + 1, '/--\\');
  put(base - 1, c + 1, '|[]|');
  // clear a little breathing room above the roof
  for (let cc = c; cc < c + 7; cc++)
    for (let r = Math.max(0, base - 6); r < base - 3; r++)
      if (g[r][cc] === '.' || g[r][cc] === '+') g[r][cc] = ' ';

  S.cabin = { chimney: cellToPx(c + 5, base - 3) };
}

// draw ASCII art into the sky grid, occluded by the far ridge
// (this is what makes the sun/moon set *behind* the mountains)
function drawCelestial(g, art, pos) {
  const c0 = Math.round(pos.x * S.W);
  const r0 = ROWPAD + Math.round(pos.y * S.R);
  art.forEach((row, dy) => {
    const r = r0 + dy;
    if (r < 0 || r >= S.rows) return;
    for (let i = 0; i < row.length; i++) {
      const c = c0 + i;
      if (c < 0 || c >= S.W || row[i] === ' ') continue;
      if (r < S.far[c] - 1) g[r][c] = row[i];
    }
  });
}

function buildSky(t) {
  const g = blank();
  const P = PHASES[S.phase];
  const tIdx = Math.floor(t / 450);
  const minFar = Math.min(...S.far);

  if (P.stars) {
    for (let c = 0; c < S.W; c++) {
      const lim = S.far[c] - 1;
      for (let r = 0; r < lim; r++) {
        const h = hash(c + 31, r + 57);
        if (h < P.stars.bright) {
          g[r][c] = hash3(c, r, tIdx) < 0.22 ? '+' : '*';
        } else if (h < P.stars.dim) {
          if (hash3(c, r, tIdx) > 0.10) g[r][c] = '.';
        }
      }
    }
    if (S.phase === 'night') {
      const dc = Math.floor(S.W * 0.60), dr = ROWPAD + Math.floor(S.R * 0.08);
      for (const [dx, dy, ch] of DIPPER) {
        const r = dr + dy, c = dc + dx;
        if (r >= 0 && r < S.rows && c >= 0 && c < S.W && r < S.far[c] - 1) g[r][c] = ch;
      }
    }
  }

  if (P.haze > 0) {
    for (let r = Math.max(0, minFar - 4); r < minFar; r++) {
      const fade = 1 - (minFar - 1 - r) / 4;
      for (let c = 0; c < S.W; c++) {
        if (r >= S.far[c] - 1 || g[r][c] !== ' ') continue;
        const h = hash(c + 777, r + 777);
        if (h < P.haze * fade) g[r][c] = h < P.haze * fade * 0.3 ? '=' : '-';
      }
    }
  }

  if (P.sun) drawCelestial(g, SUN_ROWS, P.sun);
  if (P.moon) drawCelestial(g, MOON_ROWS, P.moon);

  for (const cl of S.clouds) {
    const cx = Math.floor(cl.x);
    cl.shape.forEach((row, dy) => {
      const r = cl.y + dy;
      if (r < 0 || r >= S.rows) return;
      for (let i = 0; i < row.length; i++) {
        const c = cx + i;
        if (c < 0 || c >= S.W || row[i] === ' ') continue;
        if (r < S.far[c] - 1) g[r][c] = row[i];
      }
    });
  }
  return g;
}

function buildFore(t) {
  const g = blank();
  const P = PHASES[S.phase];
  const off1 = Math.floor(t / 140) % S.W;
  const off2 = Math.floor(t / 300) % S.W;
  const glintIdx = Math.floor(t / 480);
  const moonCol = P.moonglade && P.moon
    ? Math.round(P.moon.x * S.W) + 3 : -99;

  for (let r = S.valleyTop; r < S.rows; r++) {
    for (let c = 0; c < S.W; c++) {
      const h = hash(c + 3000, r);

      if (r === S.riverTop || r === S.riverTop + 1) {
        // flowing river — two counter-drifting rows
        const off = r === S.riverTop ? off1 : S.W - off2;
        const src = S.riverBase[r - S.riverTop][(c + off) % S.W];
        let ch = src;
        if (Math.abs(c - moonCol) < 3 && src === ' ') ch = '~';       // moonglade
        if (P.glint && hash3(c, r, glintIdx) < P.glint) ch = '*';     // glints
        g[r][c] = ch;
      } else if (r === S.riverTop - 1) {
        if (h < 0.65) g[r][c] = '_';                                   // bank
      } else {
        const dense = r > S.riverTop + 1 ? 0.30 : 0.16;                // grass
        if (h < dense) {
          let ch = GRASS_CHARS[Math.floor(h * 1e4) % 4];
          if (!REDUCED && Math.sin(t * 0.0028 - c * 0.24 + r * 0.9) > 0.88)
            ch = GRASS_ALT[ch] || ch;                                  // wind gust
          g[r][c] = ch;
        }
      }
    }
  }
  return g;
}

// ── Clouds ────────────────────────────────────────────────
function seedClouds() {
  S.clouds = [];
  const n = PHASES[S.phase].clouds;
  const minFar = Math.min(...S.far);
  for (let i = 0; i < n; i++) {
    const shape = CLOUD_SHAPES[i % CLOUD_SHAPES.length];
    S.clouds.push({
      shape,
      x: rand(0, S.W),
      y: ROWPAD + 1 + Math.floor(rand(0, Math.max(minFar - shape.length - 4, 1))),
      v: rand(0.5, 1.1) * (Math.random() < 0.5 ? 1 : -1),
    });
  }
}

// ── Sprites ───────────────────────────────────────────────
function sprite(cls, text) {
  const d = document.createElement('div');
  d.className = 'sprite ' + cls;
  d.textContent = text;
  hero.appendChild(d);
  return d;
}

function tween(dur, step, done) {
  const t0 = performance.now();
  (function frame(now) {
    const p = Math.min((now - t0) / dur, 1);
    step(p);
    if (p < 1) requestAnimationFrame(frame);
    else if (done) done();
  })(t0);
}

function launchBird(y0, dir, delay, dxPx, dyPx) {
  later(() => {
    const framesR = ['\\o/', '-o-', '/o\\'];
    const frames = dir > 0 ? framesR : [...framesR].reverse();
    const b = sprite('bird', frames[0]);
    const dur = rand(14000, 20000);
    const x0 = dir > 0 ? -50 + dxPx : S.vw + 50 + dxPx;
    const x1 = dir > 0 ? S.vw + 50 + dxPx : -50 + dxPx;
    const ph = Math.random() * 6;
    let fi = 0;
    const flap = every(() => { fi = (fi + 1) % 3; b.textContent = frames[fi]; }, 240);
    tween(dur, p => {
      const x = x0 + (x1 - x0) * p;
      const y = y0 + dyPx + Math.sin(p * 9 + ph) * 12;
      b.style.transform = `translate(${x}px, ${y}px)`;
      b.style.opacity = Math.min(p * 8, (1 - p) * 8, 0.55);
    }, () => { clearInterval(flap); b.remove(); });
  }, delay);
}

function spawnFlock(yBase) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const flock = Math.random() < 0.3;
  const n = flock ? 5 : 1;
  const V = [[0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]];
  for (let i = 0; i < n; i++) {
    const [vx, vy] = V[i];
    launchBird(yBase, dir, i * 90, -dir * Math.abs(vx) * S.charW * 4, vy * S.lineH * 1.6);
  }
}

function birdLoop() {
  if (PHASES[S.phase].sun) spawnFlock(S.vh * rand(0.08, 0.30));
  later(birdLoop, rand(28000, 50000));
}

function droneLoop() {
  const spin = ['-(=)-', '\\(=)/', '|(=)|', '/(=)\\'];
  const d = sprite('drone', spin[0]);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const dur = rand(20000, 30000);
  const groundY = S.vh * rand(0.60, 0.72), peakY = S.vh * rand(0.06, 0.18);
  const x0 = dir > 0 ? -60 : S.vw + 60;
  const x1 = dir > 0 ? S.vw + 60 : -60;
  let fi = 0;
  const spinId = every(() => { fi = (fi + 1) % 4; d.textContent = spin[fi]; }, 130);
  tween(dur, p => {
    const x = x0 + (x1 - x0) * p;
    const y = groundY - (groundY - peakY) * Math.sin(Math.PI * p);
    d.style.transform = `translate(${x}px, ${y}px)`;
    d.style.opacity = Math.min(p * 6, (1 - p) * 4, 0.55);
  }, () => { clearInterval(spinId); d.remove(); });
  later(droneLoop, rand(55000, 90000));
}

function shootingStar(x0, y0) {
  const head = sprite('star-head', '*');
  const ang = rand(0.4, 0.65);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const speed = rand(500, 800) / 1000;               // px per ms
  const dur = rand(700, 1100);
  let lastTrail = 0;
  tween(dur, p => {
    const t = p * dur;
    const x = x0 + dir * Math.cos(ang) * speed * t;
    const y = y0 + Math.sin(ang) * speed * t;
    head.style.transform = `translate(${x}px, ${y}px)`;
    head.style.opacity = Math.min(p * 10, (1 - p) * 3, 0.8);
    if (t - lastTrail > 30) {
      lastTrail = t;
      const dot = sprite('star-trail', '.');
      dot.style.transform = `translate(${x}px, ${y}px)`;
      dot.animate([{ opacity: 0.5 }, { opacity: 0 }], { duration: 550 })
        .onfinish = () => dot.remove();
    }
  }, () => head.remove());
}

function shootingLoop() {
  if (PHASES[S.phase].shooting && !document.hidden)
    shootingStar(S.vw * rand(0.1, 0.8), S.vh * rand(0.04, 0.22));
  later(shootingLoop, rand(14000, 30000));
}

function smokeLoop() {
  if (S.cabin && !document.hidden) {
    const { x, y } = S.cabin.chimney;
    const puff = sprite('smoke', '~');
    puff.style.transform = `translate(${x}px, ${y}px)`;
    puff.animate([
      { transform: `translate(${x}px, ${y}px)`, opacity: 0 },
      { opacity: 0.4, offset: 0.25 },
      { transform: `translate(${x + rand(8, 20)}px, ${y - rand(36, 60)}px)`, opacity: 0 },
    ], { duration: 3800, easing: 'ease-out' }).onfinish = () => puff.remove();
  }
  later(smokeLoop, 2400);
}

// ── Fireflies ─────────────────────────────────────────────
const fireflies = [];
function initFireflies() {
  const box = document.getElementById('fireflies');
  for (let i = 0; i < 4; i++) {
    const f = document.createElement('div');
    f.className = 'firefly';
    f.textContent = '*';
    const move = () => {
      f.style.transitionDuration = rand(2800, 4600) + 'ms';
      f.style.left = rand(4, 94) + '%';
      f.style.top = rand(62, 90) + '%';
    };
    f.style.left = rand(4, 94) + '%';
    f.style.top = rand(62, 90) + '%';
    box.appendChild(f);
    every(move, rand(3000, 5000));
    let bi = 0;
    const seq = ['', '.', '*', '.'];
    every(() => { bi = (bi + 1) % 4; f.textContent = seq[bi]; }, rand(700, 1300));
    fireflies.push(f);
  }
}

// ── Phase handling ────────────────────────────────────────
function phaseFromHour() {
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'golden';
  if (h >= 19 && h < 21) return 'dusk';
  return 'night';
}

function setPhase(name, instant) {
  S.phase = name;
  const P = PHASES[name];

  // crossfade background gradients
  const grad = `linear-gradient(175deg, ${P.bg[0]} 0%, ${P.bg[1]} 55%, ${P.bg[2]} 100%)`;
  const show = S.bgFlip ? bgA : bgB;
  const hide = S.bgFlip ? bgB : bgA;
  show.style.background = grad;
  show.style.opacity = 1;
  hide.style.opacity = 0;
  S.bgFlip = !S.bgFlip;

  hero.style.setProperty('--ink', P.ink);
  hero.style.setProperty('--ink-muted', P.muted);
  LAYER_IDS.forEach(id => layers[id].style.opacity = P.op[id]);

  seedClouds();
  if (S.live.sky) paint('sky', buildSky(performance.now()));
  if (S.live.fore) paint('fore', buildFore(performance.now()));

  document.getElementById('fireflies').style.opacity = P.fireflies ? 1 : 0;
  document.querySelectorAll('.hud button').forEach(b =>
    b.classList.toggle('active', b.dataset.phase === (S.mode === 'auto' ? 'auto' : name)));

  if (instant) { bgA.style.transitionDuration = '0s'; bgB.style.transitionDuration = '0s';
    requestAnimationFrame(() => { bgA.style.transitionDuration = ''; bgB.style.transitionDuration = ''; }); }
}

// ── Intro: crystallize each layer, back to front ──────────
function crystallize(id, target, delay, dur) {
  const cur = target.map(row => row.map(ch =>
    ch === ' ' ? ' ' : NOISE[Math.floor(Math.random() * NOISE.length)]));
  const order = Array.from({ length: S.W }, (_, i) => i).sort(() => Math.random() - 0.5);
  paint(id, []);
  later(() => {
    paint(id, cur);
    const steps = 22, chunk = Math.ceil(S.W / steps);
    let step = 0;
    const iv = every(() => {
      for (let k = step * chunk; k < Math.min((step + 1) * chunk, S.W); k++) {
        const c = order[k];
        for (let r = 0; r < S.rows; r++) cur[r][c] = target[r][c];
      }
      paint(id, cur);
      if (++step >= steps) {
        clearInterval(iv);
        if (id === 'sky') S.live.sky = true;
        if (id === 'fore') S.live.fore = true;
      }
    }, dur / steps);
  }, delay);
}

// ── Parallax loop ─────────────────────────────────────────
function parallaxLoop() {
  S.px += (S.tx - S.px) * 0.06;
  S.py += (S.ty - S.py) * 0.06;
  const scroll = window.scrollY || 0;
  const maxX = PAD * S.charW * 0.55;
  const maxY = S.lineH * 1.7;
  LAYER_IDS.forEach(id => {
    const f = PARA_X[id];
    const x = -S.px * f * maxX;
    const y = -S.py * f * maxY + scroll * PARA_SCR[id];
    layers[id].style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  });
  requestAnimationFrame(parallaxLoop);
}

// ── Build / rebuild scene ─────────────────────────────────
function measure() {
  const probe = document.createElement('span');
  probe.textContent = '0'.repeat(100);
  layers.sky.appendChild(probe);
  S.charW = probe.getBoundingClientRect().width / 100 || 8;
  probe.remove();
  S.lineH = parseFloat(getComputedStyle(layers.sky).lineHeight) || 12;
  S.vw = hero.clientWidth;
  S.vh = hero.clientHeight;
  S.W = Math.ceil(S.vw / S.charW) + PAD * 2;
  S.R = Math.ceil(S.vh / S.lineH);
  S.rows = S.R + ROWPAD * 2;
  LAYER_IDS.forEach(id => {
    layers[id].style.left = -PAD * S.charW + 'px';
    layers[id].style.top = -ROWPAD * S.lineH + 'px';
  });
}

function generate() {
  S.far = makeRidge(4, 0.26, 0.16);
  S.mid = makeRidge(4, 0.38, 0.20);
  S.near = makeRidge(5, 0.52, 0.26);
  S.valleyTop = ROWPAD + Math.round(S.R * 0.85);
  S.riverTop = ROWPAD + Math.round(S.R * 0.905);
  S.riverBase = [0, 1].map(r => Array.from({ length: S.W }, (_, c) => {
    const h = hash(c + 4000, r);
    return h < 0.48 ? '~' : h < 0.72 ? '-' : ' ';
  }));
}

function renderAll(t) {
  paint('sky', buildSky(t));
  paint('far', buildFar());
  paint('mid', buildMid());
  paint('near', buildNear());
  paint('fore', buildFore(t));
}

// ── Init ──────────────────────────────────────────────────
function init() {
  measure();
  generate();
  S.mode = 'auto';
  setPhase(phaseFromHour(), true);

  const targets = {
    sky: buildSky(0), far: buildFar(), mid: buildMid(),
    near: buildNear(), fore: buildFore(0),
  };

  if (REDUCED) {
    Object.entries(targets).forEach(([id, g]) => paint(id, g));
    S.live.sky = S.live.fore = true;
    document.querySelector('.hv-headline-inner').classList.add('in');
    document.querySelector('.hv-cue').classList.add('in');
    return; // no motion
  }

  crystallize('sky',  targets.sky,  300, 900);
  crystallize('far',  targets.far,  550, 900);
  crystallize('mid',  targets.mid,  800, 900);
  crystallize('near', targets.near, 1050, 900);
  crystallize('fore', targets.fore, 1300, 900);

  later(() => document.querySelector('.hv-headline-inner').classList.add('in'), 350);
  later(() => document.querySelector('.hv-cue').classList.add('in'), 2200);

  // dynamic layer ticks
  every(() => {
    if (document.hidden || !S.live.sky) return;
    const dt = 0.16;
    const minFar = Math.min(...S.far);
    for (const cl of S.clouds) {
      cl.x += cl.v * dt;
      const w = cl.shape[0].length;
      if (cl.v > 0 && cl.x > S.W + 2) { cl.x = -w - 2; cl.y = ROWPAD + 1 + Math.floor(rand(0, Math.max(minFar - cl.shape.length - 4, 1))); }
      if (cl.v < 0 && cl.x < -w - 2) { cl.x = S.W + 2; }
    }
    paint('sky', buildSky(performance.now()));
  }, 160);

  every(() => {
    if (document.hidden || !S.live.fore) return;
    paint('fore', buildFore(performance.now()));
  }, 140);

  // sprites
  initFireflies();
  document.getElementById('fireflies').style.opacity =
    PHASES[S.phase].fireflies ? 1 : 0;
  later(birdLoop, 5000);
  later(droneLoop, 11000);
  later(shootingLoop, 4000);
  later(smokeLoop, 2500);

  // auto phase re-check
  every(() => {
    if (S.mode === 'auto' && phaseFromHour() !== S.phase) setPhase(phaseFromHour());
  }, 60000);

  // parallax
  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    S.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    S.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  hero.addEventListener('mouseleave', () => { S.tx = 0; S.ty = 0; });
  parallaxLoop();

  // click easter eggs
  hero.addEventListener('click', e => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (PHASES[S.phase].stars) shootingStar(x, y);
    else spawnFlock(y);
  });

  // resize → regenerate (keep phase, skip intro)
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      measure(); generate(); seedClouds();
      renderAll(performance.now());
    }, 250);
  });
}

// HUD
document.querySelectorAll('.hud button').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.phase;
    S.mode = p === 'auto' ? 'auto' : 'manual';
    setPhase(p === 'auto' ? phaseFromHour() : p);
  });
});

document.fonts.ready.then(init);

})();
