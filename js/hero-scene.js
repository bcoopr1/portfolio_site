/* =========================================
   HERO-SCENE.JS — ASCII river valley (home hero)

   Eye level, standing on the river, looking up-valley
   through a fisheye lens. The terrain is ray-marched once
   into an angular panorama (heightfield + pines + meadow),
   then each character cell samples it through an
   equidistant fisheye. Sky, clouds, water reflections and
   fliers (geese, swallows/bats, a hawk, a heron, a drone)
   animate on top with depth-tested occlusion.
   ========================================= */
(() => {
'use strict';

const hero = document.querySelector('.hero');
const el   = document.querySelector('.hero__ascii');
if (!hero || !el) return;

const STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Tunables ─────────────────────────────
const CAM_Y     = 1.7;     // eye height above the water (m)
const PITCH     = 0.13;    // tilt up into the valley (rad)
const T_MAX     = 9000;    // view distance (m)
const MAX_H     = 2800;    // tallest possible terrain (m) — ray early-out
const FOG_DAY   = 2600;
const FOG_NIGHT = 1700;
const TREELINE  = 820;
const NEAR_TREE = 650;     // beyond this, forest is a canopy texture
const TREE_CELL = 8;
const FPS       = 15;
const CYCLE     = 360;     // seconds for a full 24 h day

// Density ramps (sparse → dense). Light glyphs on a dark hero.
const RAMP  = " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const WRAMP = " .-~:=+*#%@";
const BLADES = ",;'|/\\\"`";

const T_SKY = 0, T_WATER = 1, T_GRASS = 2, T_ROCK = 3, T_TREE = 4, T_SNOW = 5;

// Fresh valley every visit
const rnd = Math.random;
const SX = rnd() * 900, SZ = rnd() * 900;
const RP1 = rnd() * 6.283, RP2 = rnd() * 6.283, RP3 = rnd() * 6.283;

// ── Noise ────────────────────────────────
function hash2(x, y) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, oct) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, y); n += a;
    const nx = 1.6 * x - 1.2 * y + 17.3;
    y = 1.2 * x + 1.6 * y + 9.1; x = nx;
    a *= 0.5;
  }
  return s / n;
}

function ridged(x, y, oct) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    let v = 1 - Math.abs(2 * vnoise(x, y) - 1);
    s += a * v * v; n += a;
    const nx = 1.6 * x - 1.2 * y + 5.7;
    y = 1.2 * x + 1.6 * y + 3.3; x = nx;
    a *= 0.5;
  }
  return s / n;
}

const clamp  = (v, a, b) => (v < a ? a : v > b ? b : v);
const sstep  = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ── World ────────────────────────────────
// x: right, y: up, z: up-valley. Camera sits on the river at x=0,z=0.
const vx0 = 70 * Math.sin(RP2);
const rx0 = 26 * Math.sin(RP1) + 10 * Math.sin(RP3);
const valleyX = (z) => 70 * Math.sin(z / 1300 + RP2) - vx0;
const riverX  = (z) => valleyX(z) + 26 * Math.sin(z / 230 + RP1) + 10 * Math.sin(z / 71 + RP3) - rx0;
const riverW  = (z) => 15 + 5 * Math.sin(z / 97 + RP3);

let gBank = 0;  // distance past the river bank from the last ground() call

function ground(x, z) {
  const bank = Math.abs(x - riverX(z)) - riverW(z);
  gBank = bank;
  if (bank < 0) return Math.max(bank * 0.3, -2.5) - 0.2;

  // Floodplain meadow
  let h = 0.35 + Math.min(bank, 60) * 0.03 + 0.8 * vnoise(x / 9 + SX, z / 9);

  // U-shaped glacial walls with ridged crests
  const w = Math.max(0, Math.abs(x - valleyX(z)) - 95);
  if (w > 0) {
    const q = w / 340;
    h += (400 + 300 * vnoise(z / 1100 + SZ, 7.7)) * (1 - Math.exp(-q * q));
    const s = Math.min(1, w / 280);
    h += s * 330 * (ridged(x / 430 + SX, z / 430 + SZ, 6) - 0.35);
  }

  // Peaks closing off the head of the valley
  const head = sstep(1500, 4800, z);
  if (head > 0) h += head * (600 + 1100 * ridged(x / 950 + SX + 40, z / 950 + SZ, 5));
  return h;
}

function forestDensity(x, z, g, bank) {
  if (bank < 3 || g > TREELINE) return 0;
  const n = fbm(x / 260 + SX + 11, z / 260 + SZ, 3);
  let d = sstep(0.40, 0.60, n) * (1 - sstep(TREELINE - 220, TREELINE, g));
  if (bank < 40) d = Math.max(d, 0.45 * sstep(3, 9, bank) * sstep(0.3, 0.55, n));  // riverside stands
  return d;
}

let hitType = T_GRASS;

// Surface height incl. water plane and trees; sets hitType.
function height(x, z, t) {
  const g = ground(x, z);
  if (g < 0) { hitType = T_WATER; return 0; }
  hitType = T_GRASS;
  const d = forestDensity(x, z, g, gBank);
  if (d <= 0) return g;

  if (t > NEAR_TREE) {
    const c = d * 14 * (0.5 + 0.5 * vnoise(x / 5, z / 5));
    if (c > 2) hitType = T_TREE;
    return g + c;
  }

  const i = Math.floor(x / TREE_CELL), j = Math.floor(z / TREE_CELL);
  if (hash2(i + 7919, j + 104729) > d) return g;
  const cx = (i + 0.3 + 0.4 * hash2(i * 3 + 1, j * 5 + 2)) * TREE_CELL;
  const cz = (j + 0.3 + 0.4 * hash2(i * 7 + 3, j * 11 + 5)) * TREE_CELL;
  const H = 8 + 16 * hash2(i + 31, j + 17);
  const R = Math.min(0.3 * H, 3.4);
  const r = Math.hypot(x - cx, z - cz);
  if (r >= R) return g;
  const k = 1 - r / R;
  // Stacked branch tiers give the pine its ragged silhouette
  const tier = 1 - 0.35 * ((k * H / 2.3) % 1) * (1 - k);
  hitType = T_TREE;
  return g + 1.2 + H * k * tier;
}

// ── Scene state (rebuilt on resize) ──────
let cols = 0, rows = 0, cw = 0, lh = 0, F = 0;
let PW = 0, PH = 0, PHI0 = 0, A0 = 0, DPHI = 0, DA = 0;
let pType, pB, pD;                 // panorama: type, brightness (current light), distance
let pBN, pNX, pNY, pNZ, pJ, pFog, pEdge; // night brightness, normal, jitter, day fog, ridge ink
let cP, cPhi, cA, cDepth, cStatic; // per cell
let buf;                           // char codes
let reveal;                        // per-column reveal time (ms)
let startT = 0;

// ── Day / night cycle ────────────────────
// Starts from the visitor's clock and runs a full day every CYCLE seconds.
// Night (20:00–06:00) is held fixed under a still moon; dusk and dawn
// blend the daylight scene into it. env.n is the night amount, 0..1.
const HOUR0 = (() => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; })();
const MOON_NIGHT = { phi: -0.62, a: 0.52 };

function body(phi, a) {
  return { phi, a, x: Math.sin(phi) * Math.cos(a), y: Math.sin(a), z: Math.cos(phi) * Math.cos(a) };
}
const MOON_VEC = body(MOON_NIGHT.phi, MOON_NIGHT.a);
const env = { hour: HOUR0, n: 1, sun: MOON_VEC, moon: MOON_VEC };

function setClock(h) {
  env.hour = h;
  const night = h >= 20 || h < 6;
  env.n = night ? 1 : h >= 12 ? sstep(17.5, 20, h) : 1 - sstep(6, 8.5, h);
  // Sun rises behind the left wall, arcs over the valley, sets on the right
  const s = clamp((h - 6) / 14, 0, 1);
  env.sun = body(-1.35 + 2.7 * s, -0.10 + 0.80 * Math.sin(Math.PI * s));
  // Moon climbs into its night spot at dusk and slides away at dawn
  if (night) env.moon = MOON_VEC;
  else if (h >= 12) { const u = sstep(17.5, 20, h); env.moon = body(-1.25 + 0.63 * u, -0.08 + 0.60 * u); }
  else { const v = sstep(6, 8.5, h); env.moon = body(-0.62 + 0.9 * v, 0.52 - 0.62 * v); }
}
setClock(HOUR0);
const isNight = () => env.n >= 0.5;

function baseLight(type, lam, j) {
  switch (type) {
    case T_TREE: return 0.16 + 0.42 * lam + 0.16 * j;
    case T_ROCK: return 0.20 + 0.62 * lam + 0.06 * j;
    case T_SNOW: return 0.58 + 0.42 * lam;
    default:     return 0.26 + 0.40 * lam + 0.10 * j;
  }
}

// Classifies the surface and records its normal + jitter (sN*, sJ) so it
// can be relit as the sun moves. Returns the fixed moonlit night brightness.
let sNX = 0, sNY = 1, sNZ = 0, sJ = 0;
function surface(x, z, t, h, type) {
  const e = Math.max(0.25, t * 0.004);
  const hx = height(x + e, z, t) - height(x - e, z, t);
  const hz = height(x, z + e, t) - height(x, z - e, t);
  let nx = -hx, ny = 2 * e, nz = -hz;
  const nl = Math.hypot(nx, ny, nz);
  nx /= nl; ny /= nl; nz /= nl;
  const lam = Math.max(0, nx * MOON_VEC.x + ny * MOON_VEC.y + nz * MOON_VEC.z);

  if (type === T_GRASS) {
    if (ny < 0.72) type = T_ROCK;
    if (h > 1250 + 250 * vnoise(x / 300, z / 300) && ny > 0.45) type = T_SNOW;
  }
  const j = hash2(Math.floor(x * 3), Math.floor(z * 3)) - 0.5;
  sNX = nx; sNY = ny; sNZ = nz; sJ = j;
  let b = baseLight(type, lam, j);
  const fog = 1 - Math.exp(-t / FOG_NIGHT);
  b = b + (0.24 - b) * fog;
  b *= 0.62;
  hitType = type;
  return b;
}

function buildPanorama() {
  const N = PW * PH;
  pType = new Uint8Array(N);
  pB    = new Float32Array(N);
  pBN   = new Float32Array(N);
  pD    = new Float32Array(N);
  pNX = new Float32Array(N); pNY = new Float32Array(N); pNZ = new Float32Array(N);
  pJ = new Float32Array(N); pFog = new Float32Array(N); pEdge = new Uint8Array(N);

  for (let i = 0; i < PW; i++) {
    const phi = PHI0 + (i + 0.5) * DPHI;
    const dx = Math.sin(phi), dz = Math.cos(phi);
    let row = 0, t = 0.3;
    while (t < T_MAX && row < PH) {
      const x = dx * t, z = dz * t;
      const h = height(x, z, t);
      let r = Math.floor((Math.atan2(h - CAM_Y, t) - A0) / DA);
      if (r >= row) {
        if (r >= PH) r = PH - 1;
        let type = hitType, b = 0;
        if (type !== T_WATER) { b = surface(x, z, t, h, type); type = hitType; }
        const fog = 1 - Math.exp(-t / FOG_DAY);
        for (let k = row; k <= r; k++) {
          const idx = k * PW + i;
          pType[idx] = type; pBN[idx] = b; pD[idx] = t;
          pNX[idx] = sNX; pNY[idx] = sNY; pNZ[idx] = sNZ; pJ[idx] = sJ; pFog[idx] = fog;
        }
        row = r + 1;
      }
      if (A0 + row * DA > Math.atan2(MAX_H - CAM_Y, t)) break;
      t += Math.max(0.2, t * DPHI * 0.7);
    }
    for (let k = row; k < PH; k++) {
      const idx = k * PW + i;
      pType[idx] = T_SKY; pD[idx] = Infinity;
    }
    // Ink the silhouettes: ridge lines against sky or farther ridges
    for (let k = 0; k < PH - 1; k++) {
      const idx = k * PW + i, up = idx + PW;
      if (pType[idx] === T_SKY || pType[idx] === T_WATER) continue;
      if (pType[up] === T_SKY || pD[up] > pD[idx] * 1.5 + 40) { pBN[idx] = Math.min(1, pBN[idx] + 0.2); pEdge[idx] = 1; }
    }
  }
}

// Camera-space ↔ world direction through an equidistant fisheye
function cellDir(c, r) {
  const sx = (c + 0.5 - cols / 2) * cw;
  const sy = (rows / 2 - r - 0.5) * lh;
  const rr = Math.hypot(sx, sy) || 1e-6;
  const th = rr / F;
  const s = Math.sin(th);
  const x = s * sx / rr, y = s * sy / rr, z = Math.cos(th);
  const wy = y * Math.cos(PITCH) + z * Math.sin(PITCH);
  const wz = -y * Math.sin(PITCH) + z * Math.cos(PITCH);
  return [Math.atan2(x, wz), Math.asin(clamp(wy, -1, 1))];
}

function project(x, y, z) {
  const wy = y - CAM_Y;
  const cy = wy * Math.cos(PITCH) - z * Math.sin(PITCH);
  const cz = wy * Math.sin(PITCH) + z * Math.cos(PITCH);
  const len = Math.hypot(x, cy, cz);
  const th = Math.acos(clamp(cz / len, -1, 1));
  const rxy = Math.hypot(x, cy) || 1e-6;
  const rr = F * th;
  return {
    c: Math.floor((rr * x / rxy) / cw + cols / 2),
    r: Math.floor(rows / 2 - (rr * cy / rxy) / lh),
    d: Math.hypot(x, z),
    px: F / len,            // screen px per metre at that range
  };
}

function build() {
  const W = hero.clientWidth, H = hero.clientHeight;
  const probe = document.createElement('span');
  probe.textContent = 'M'.repeat(100);
  el.textContent = '';
  el.appendChild(probe);
  cw = probe.getBoundingClientRect().width / 100 || 4;
  el.removeChild(probe);
  const cs = getComputedStyle(el);
  lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15 || 7;

  cols = Math.max(20, Math.floor(W / cw));
  rows = Math.max(10, Math.floor(H / lh));
  const Wp = cols * cw, Hp = rows * lh;
  F = Wp >= Hp ? (Wp / 2) / 1.30 : (Wp / 2) / 1.0;

  const n = cols * rows;
  cPhi = new Float32Array(n); cA = new Float32Array(n);
  let pmin = 9, pmax = -9, amin = 9, amax = -9;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const [phi, a] = cellDir(c, r);
    const i = r * cols + c;
    cPhi[i] = phi; cA[i] = a;
    if (phi < pmin) pmin = phi; if (phi > pmax) pmax = phi;
    if (a < amin) amin = a;     if (a > amax) amax = a;
  }

  DPHI = cw / F;
  DA   = lh / F / 2;
  PHI0 = pmin - DPHI;  A0 = amin - DA;
  PW = Math.ceil((pmax - PHI0) / DPHI) + 2;
  PH = Math.ceil((amax - A0) / DA) + 2;
  buildPanorama();

  cP = new Int32Array(n); cDepth = new Float32Array(n); cStatic = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const pc = clamp(Math.floor((cPhi[i] - PHI0) / DPHI), 0, PW - 1);
    const pr = clamp(Math.floor((cA[i] - A0) / DA), 0, PH - 1);
    const pi = pr * PW + pc;
    cP[i] = pi;
    cDepth[i] = pD[pi];
  }
  relight(true);

  buf = new Uint16Array(n);
  reveal = new Float32Array(cols);
  const order = Array.from({ length: cols }, (_, i) => i).sort(() => rnd() - 0.5);
  order.forEach((c, k) => { reveal[c] = 450 + (k / cols) * 1300; });
}

// Re-shade the terrain for the current sun / moon. Night is fixed, so it
// is only recomputed while the light is actually changing.
let litHour = -1, litN = -1;
function relight(force) {
  const n = env.n;
  if (!force && ((n >= 1 && litN >= 1) || Math.abs(env.hour - litHour) < 0.05)) return;
  litHour = env.hour; litN = n;

  if (n >= 1) pB.set(pBN);
  else {
    const sun = env.sun, la = Math.max(sun.a, 0.04);
    const Lx = Math.sin(sun.phi) * Math.cos(la), Ly = Math.sin(la), Lz = Math.cos(sun.phi) * Math.cos(la);
    const dl = 0.45 + 0.55 * sstep(-0.05, 0.4, sun.a);   // dimmer, flatter light at golden hour
    for (let pi = 0; pi < pB.length; pi++) {
      const ty = pType[pi];
      if (ty === T_SKY || ty === T_WATER) continue;
      const lam = Math.max(0, pNX[pi] * Lx + pNY[pi] * Ly + pNZ[pi] * Lz);
      let b = baseLight(ty, lam, pJ[pi]);
      b = (b + (0.24 - b) * pFog[pi]) * dl;
      if (pEdge[pi]) b = Math.min(1, b + 0.2);
      pB[pi] = n <= 0 ? b : b + (pBN[pi] - b) * n;
    }
  }

  for (let i = 0; i < cP.length; i++) {
    const pi = cP[i], type = pType[pi];
    if (type === T_SKY || type === T_WATER) continue;
    const b = pB[pi];
    let ch;
    if (type === T_GRASS && pD[pi] < 45 && b > 0.18) ch = BLADES[Math.floor(hash2(pi, 3) * BLADES.length)];
    else ch = RAMP[clamp(Math.round(b * (RAMP.length - 1)), 0, RAMP.length - 1)];
    cStatic[i] = ch.charCodeAt(0);
  }
}

// ── Sky & water ──────────────────────────
function sky(phi, a, time, seed) {
  const ca = Math.cos(a);
  const x = Math.sin(phi) * ca, y = Math.sin(a), z = Math.cos(phi) * ca;
  const up = Math.max(a, 0);
  const N = env.n;

  let cn = 0, cover = 0;
  if (a > 0.012) {
    const t = 1900 / y;
    cn = fbm((x * t + time * 9) / 1500 + SX, (z * t) / 1500 + SZ, 4);
    cover = sstep(0.50, 0.74, cn) * sstep(0.012, 0.10, a);
  }

  let bn = 0, bd = 0;
  if (N > 0) {
    const m = env.moon;
    let b = 0.04 + 0.10 * Math.exp(-up * 7);
    const sd = x * m.x + y * m.y + z * m.z;
    if (a > 0.012) b += (0.12 + 0.12 * cn - b) * cover;
    // Moon: crescent disc plus soft halo
    if (sd > 0.99955) {
      const off = x * Math.cos(m.phi + 0.02) - z * Math.sin(m.phi + 0.02);
      b = off < 0.012 ? 0.95 : 0.35;
    } else b += 0.18 * Math.max(0, sd) ** 400 * (1 - cover);
    if (a > 0.03 && cover < 0.35) {
      const s = hash2(seed, 91);
      if (s > 0.9935) b = Math.max(b, 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(time * (1 + 3 * s) + s * 300)));
    }
    bn = b;
  }
  if (N < 1) {
    const sun = env.sun;
    let b = 0.08 + 0.24 * Math.exp(-up * 5);
    const sd = x * sun.x + y * sun.y + z * sun.z;
    if (a > 0.012) b += (0.34 + 0.55 * (cn - 0.45) + 0.25 * Math.max(0, sd) ** 6 - b) * cover;
    if (sd > 0.99965) b = 1;
    else b += (0.5 * Math.max(0, sd) ** 90 + 0.12 * Math.max(0, sd) ** 8) * (1 - 0.6 * cover);
    // Sky dims as the sun drops toward the ridges
    if (sd <= 0.99965) b *= 0.6 + 0.4 * sstep(-0.08, 0.25, sun.a);
    bd = b;
  }
  return N >= 1 ? bn : N <= 0 ? bd : bd + (bn - bd) * N;
}

function water(i, time) {
  const phi = cPhi[i], a = cA[i], tw = cDepth[i];
  const x = Math.sin(phi) * tw, z = Math.cos(phi) * tw;

  // Wind ripples bend the reflected ray, mostly vertically
  const amp = 0.012 + 0.03 * Math.min(1, 30 / tw);
  const rip = (vnoise(phi * 9 + 3, z * 0.6 - time * 1.4) - 0.5) * 2 * amp;
  const ar = -a + rip;
  const pr = Math.floor((ar - A0) / DA);
  const pc = clamp(Math.floor((phi + rip * 0.3 - PHI0) / DPHI), 0, PW - 1);
  let refl;
  if (pr >= PH) refl = sky(phi, ar, time, i);
  else if (pr < 0) refl = 0.06;
  else {
    const pi = pr * PW + pc, ty = pType[pi];
    refl = ty === T_SKY ? sky(phi, ar, time, pi) : ty === T_WATER ? 0.06 : pB[pi];
  }

  // Fresnel: glassy toward the horizon, darker at our feet
  const g = clamp(-a * 2.4, 0, 1);
  const fr = 0.18 + 0.82 * (1 - g) ** 3;
  const deep = env.n >= 1 ? 0.03 : 0.07 - 0.04 * env.n;
  let b = refl * fr * 0.92 + (1 - fr) * deep;

  // Current lines drifting downstream toward the camera
  const cur = vnoise(x / 2.2 + 40, (z + time * 1.3) / 0.7);
  if (cur > 0.8 && tw < 400) b += 0.14;

  // Glitter path under the sun / moon
  const night = isNight(), lamp = night ? env.moon : env.sun;
  const dp = phi - lamp.phi, da = ar - lamp.a;
  const spread = 0.05 + 0.10 * Math.min(1, 40 / tw);
  if (lamp.a > 0.02 && Math.abs(dp) < spread && Math.abs(da) < 0.30 && hash2(i, (time * 8) | 0) > 0.78) {
    return night ? 43 : 42;  // '+' / '*'
  }
  const k = clamp(Math.round(b * (WRAMP.length - 1) * 1.15), 0, WRAMP.length - 1);
  return WRAMP.charCodeAt(k);
}

// ── Fliers ───────────────────────────────
const fliers = [];
const FLIP = { v: '^', '^': 'v', '/': '\\', '\\': '/', w: 'm' };

function stamp(str, c, r, depth) {
  if (r < 0 || r >= rows) return;
  const x0 = c - (str.length >> 1);
  for (let k = 0; k < str.length; k++) {
    const cc = x0 + k;
    if (cc < 0 || cc >= cols || str[k] === ' ') continue;
    const i = r * cols + cc;
    if (cDepth[i] > depth) buf[i] = str.charCodeAt(k);
  }
}

// Mirror image on the water, broken up by ripples
function stampReflection(str, x, y, z, time) {
  if (y < 0.3) return;
  const p = project(x, -y, z);
  if (p.r < 0 || p.r >= rows) return;
  const x0 = p.c - (str.length >> 1);
  for (let k = 0; k < str.length; k++) {
    const cc = x0 + k;
    if (cc < 0 || cc >= cols || str[k] === ' ') continue;
    const i = p.r * cols + cc;
    if (pType[cP[i]] !== T_WATER || cDepth[i] < p.d * 0.9) continue;
    if (vnoise(cc * 0.7, time * 3 + p.r) > 0.62) continue;
    buf[i] = (FLIP[str[k]] || str[k]).charCodeAt(0);
  }
}

function birdGlyph(w, wing, body) {
  const p = wing > 0.35 ? 0 : wing < -0.35 ? 2 : 1;
  if (w < 0.55) return p === 1 ? '-' : '.';
  if (w < 1.7)  return ['v', '-', '^'][p];
  if (w < 3.8)  return ['\\' + body + '/', '-' + body + '-', '/' + body + '\\'][p];
  return ['\\\\' + body + '//', '--' + body + '--', '//' + body + '\\\\'][p];
}

function drawBird(b, time) {
  const p = project(b.x, b.y, b.z);
  const w = b.span * p.px / cw;
  const g = birdGlyph(w, b.wing, b.body || 'v');
  stamp(g, p.c, p.r, p.d);
  if (b.y < 60) stampReflection(g, b.x, b.y, b.z, time);
}

// Wing position: flap cycles with glides mixed in
function flap(b, dt, freq, glideOdds) {
  b.gl -= dt;
  if (b.gl <= 0) {
    b.gliding = rnd() < glideOdds;
    b.gl = b.gliding ? 0.6 + rnd() * 1.8 : 0.5 + rnd() * 1.5;
  }
  b.ph += dt * freq * Math.PI * 2;
  b.wing = b.gliding ? 0 : Math.sin(b.ph);
}

function spawnGeese() {
  const side = rnd() < 0.5 ? -1 : 1;
  const z0 = 180 + rnd() * 380;
  const n = 5 + Math.floor(rnd() * 8);
  let hx = -side * (0.75 + rnd() * 0.2), hz = 0.35 + rnd() * 0.4;
  const hl = Math.hypot(hx, hz); hx /= hl; hz /= hl;
  const lead = { x: side * z0 * 3.2, y: 110 + rnd() * 220, z: z0 };
  const flock = [];
  for (let k = 0; k < n; k++) {
    const rank = Math.ceil(k / 2), sgn = k % 2 ? 1 : -1;
    flock.push({ rank, sgn, span: 1.6, ph: rnd() * 6, gl: 0, gliding: false, wing: 0, j: rnd() * 6, x: 0, y: 0, z: 0 });
  }
  fliers.push({
    kind: 'geese', age: 0, life: 140,
    update(dt, time) {
      this.age += dt;
      lead.x += hx * 17 * dt; lead.z += hz * 17 * dt;
      lead.y += Math.sin(time * 0.3) * 0.4 * dt;
      for (const g of flock) {
        const back = g.rank * 3.2, lat = g.sgn * g.rank * 2.6;
        g.x = lead.x - hx * back + hz * lat + Math.sin(time * 0.8 + g.j) * 0.6;
        g.z = lead.z - hz * back - hx * lat + Math.cos(time * 0.6 + g.j) * 0.6;
        g.y = lead.y + Math.sin(time * 1.1 + g.j) * 0.5;
        flap(g, dt, 2.7, 0.2);
      }
      if (Math.abs(lead.x) > lead.z * 4.5 && this.age > 20) this.age = this.life;
    },
    draw(time) { for (const g of flock) drawBird(g, time); },
  });
}

function spawnSwifts() {
  const bats = isNight();
  const n = 3 + Math.floor(rnd() * 4);
  const flock = [];
  for (let k = 0; k < n; k++) {
    const z = 25 + rnd() * 110;
    flock.push({
      x: riverX(z) + (rnd() - 0.5) * 30, y: 1.5 + rnd() * 6, z,
      hd: rnd() * 6.28, turn: 0, tt: 0, sp: 9 + rnd() * 5,
      span: bats ? 0.3 : 0.33, body: bats ? 'w' : 'v',
      ph: rnd() * 6, gl: 0, gliding: false, wing: 0,
    });
  }
  fliers.push({
    kind: 'swifts', age: 0, life: 26 + rnd() * 16,
    update(dt) {
      this.age += dt;
      const leaving = this.age > this.life - 5;
      for (const b of flock) {
        b.tt -= dt;
        if (b.tt <= 0) { b.turn = (rnd() - 0.5) * (bats ? 7 : 4.5); b.tt = 0.3 + rnd() * 1.1; }
        // Stay over the river corridor
        const cx = riverX(b.z) - b.x;
        if (!leaving && (Math.abs(cx) > 30 || b.z < 18 || b.z > 160)) {
          const want = Math.atan2(cx, 80 - b.z);
          let dh = want - b.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
          b.turn = dh * 2.5;
        }
        b.hd += b.turn * dt;
        b.x += Math.sin(b.hd) * b.sp * dt;
        b.z += Math.cos(b.hd) * b.sp * dt;
        b.y = leaving ? b.y + 6 * dt : clamp(b.y + Math.sin(b.hd * 3 + this.age) * 2 * dt, 0.8, 9);
        flap(b, dt, bats ? 11 : 8, bats ? 0.1 : 0.35);
      }
    },
    draw(time) { for (const b of flock) drawBird(b, time); },
  });
}

function spawnHawk() {
  const side = rnd() < 0.5 ? -1 : 1;
  const z = 320 + rnd() * 600;
  const c = { x: valleyX(z) + side * (140 + rnd() * 220), y: 160 + rnd() * 220, z };
  const rad = 45 + rnd() * 45;
  const b = { span: 1.3, wing: 0, ph: 0, gl: 0, gliding: true, x: 0, y: 0, z: 0 };
  let ang = rnd() * 6.28, exitHd = rnd() * 6.28;
  fliers.push({
    kind: 'hawk', age: 0, life: 55 + rnd() * 40,
    update(dt) {
      this.age += dt;
      if (this.age < this.life - 12) {
        ang += (9 / rad) * dt;
        c.x += 1.8 * dt; c.y += 0.9 * dt;       // riding a drifting thermal
        b.x = c.x + Math.cos(ang) * rad; b.z = c.z + Math.sin(ang) * rad; b.y = c.y;
      } else {
        b.x += Math.sin(exitHd) * 14 * dt; b.z += Math.cos(exitHd) * 14 * dt; b.y += 2 * dt;
      }
      flap(b, dt, 2.4, 0.9);
      // Banked on a circle the wings read flat or as a shallow V
      if (b.gliding) b.wing = Math.sin(ang) > 0.3 ? 0.5 : 0;
    },
    draw(time) { drawBird(b, time); },
  });
}

function spawnHeron() {
  const z0 = 45 + rnd() * 30;
  const off = (rnd() - 0.5) * 10;
  const b = { span: 1.8, x: riverX(z0) + off, y: 2.5 + rnd() * 2, z: z0, ph: 0, gl: 0, gliding: false, wing: 0 };
  fliers.push({
    kind: 'heron', age: 0, life: 90,
    update(dt) {
      this.age += dt;
      b.z += 8 * dt;
      b.x += (riverX(b.z) + off - b.x) * Math.min(1, dt * 0.6);
      b.y += 0.15 * dt;
      flap(b, dt, 2, 0.25);
      if (b.z > 900) this.age = this.life;
    },
    draw(time) { drawBird(b, time); },
  });
}

// Quadcopter art by apparent size. '~' marks prop discs (animated),
// '*' marks nav lights (blink). All rows in a tier share one width.
const DRONE_M = [
  "-~-   -~-",
  " '\\[o]/' ",
  "  /   \\  ",
];
const DRONE_L = [
  "  ~~~~~     ~~~~~  ",
  "  *_|_________|_*  ",
  "     \\_[(O)]_/     ",
  "      _/   \\_      ",
];
const DRONE_XL = [
  " ~~~~~~~~~         ~~~~~~~~~ ",
  "    [=]               [=]    ",
  "    *\\======[###]======/*    ",
  "            [(O)]            ",
  "        __/       \\__        ",
];
const PROP = "~-=";

// Multi-row sprite centred on (c, r) with an optional lean (shear)
function stampArt(art, c, r, depth, lean) {
  const mid = (art.length - 1) / 2;
  art.forEach((row, k) => stamp(row, c + Math.round(lean * (mid - k) * 0.5), r + k - Math.round(mid), depth));
}

function stampArtReflection(art, x, y, z, time) {
  const p = project(x, -y, z);
  const mid = (art.length - 1) / 2;
  for (let k = 0; k < art.length; k++) {
    const row = art[art.length - 1 - k], rr = p.r + k - Math.round(mid);
    if (rr < 0 || rr >= rows) continue;
    const x0 = p.c - (row.length >> 1);
    for (let j = 0; j < row.length; j++) {
      const cc = x0 + j;
      if (cc < 0 || cc >= cols || row[j] === ' ') continue;
      const i = rr * cols + cc;
      if (pType[cP[i]] !== T_WATER || cDepth[i] < p.d * 0.9) continue;
      if (vnoise(cc * 0.7, time * 3 + rr) > 0.55) continue;
      buf[i] = (FLIP[row[j]] || row[j]).charCodeAt(0);
    }
  }
}

function spawnDrone() {
  // Enter from the edge of the frame, mid-valley
  const side = rnd() < 0.5 ? -1 : 1, z0 = 60 + rnd() * 100;
  const d = { x: valleyX(z0) + side * z0 * 1.8, y: 15 + rnd() * 30, z: z0, vx: 0, vy: 0, vz: 0 };
  let hover = 0, leaving = false, inspecting = false;

  const roam = () => {
    const z = 35 + rnd() * 260, low = rnd() < 0.35;
    return { x: riverX(z) + (rnd() - 0.5) * (low ? 20 : 180), y: low ? 3 + rnd() * 4 : 15 + rnd() * 90, z };
  };
  // Close pass: sweeps by a few metres off the camera without stopping
  const pass = () => ({ x: (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 7), y: 2.5 + rnd() * 5, z: 10 + rnd() * 12, pass: true });
  // Inspection: comes up to the camera and hangs there, gimbal on us
  const inspect = () => ({ x: (rnd() - 0.5) * 5, y: 2.5 + rnd() * 2.5, z: 7 + rnd() * 5, inspect: true });

  const plan = [roam()];
  plan.push(rnd() < 0.5 ? inspect() : pass());
  plan.push(roam());
  if (rnd() < 0.6) plan.push(rnd() < 0.5 ? pass() : inspect());
  plan.push(roam());
  let tgt = plan.shift();

  const next = () => {
    inspecting = false;
    if (plan.length) tgt = plan.shift();
    else { leaving = true; tgt = { x: riverX(1600) + (rnd() - 0.5) * 300, y: 220, z: 1600 }; }
  };

  fliers.push({
    kind: 'drone', age: 0, life: 400,
    update(dt, time) {
      this.age += dt;
      if (hover > 0) {
        hover -= dt;
        d.vx *= 0.9; d.vy *= 0.9; d.vz *= 0.9;
        d.y += Math.sin(time * 2.1) * 0.25 * dt;
        d.x += Math.sin(time * 1.3) * 0.15 * dt;
        if (hover <= 0) next();
      } else {
        // Steer toward the waypoint with capped speed and accel
        const ex = tgt.x - d.x, ey = tgt.y - d.y, ez = tgt.z - d.z;
        const dist = Math.hypot(ex, ey, ez);
        const vmax = tgt.pass ? 13 : Math.min(18, dist * 0.4);
        const ax = (ex / dist) * vmax - d.vx, ay = (ey / dist) * vmax - d.vy, az = (ez / dist) * vmax - d.vz;
        const al = Math.hypot(ax, ay, az), cap = (tgt.pass ? 6 : 4) * dt;
        const s = al > cap ? cap / al : 1;
        d.vx += ax * s; d.vy += ay * s; d.vz += az * s;
        if (tgt.pass && dist < 4) next();
        else if (dist < 1.5) {
          if (leaving) this.age = this.life;
          else if (tgt.inspect) { inspecting = true; hover = 3 + rnd() * 3; }
          else hover = 2 + rnd() * 5;
        }
      }
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    },
    draw(time) {
      const p = project(d.x, d.y, d.z);
      const w = 0.9 * p.px / cw;
      const blink = (time % 1.2) < 0.15;
      const frame = (time * 15) | 0;
      if (w < 5) {
        let g;
        if (isNight() && w < 3) g = w < 1.8 ? (blink ? '*' : '.') : (blink ? '.*.' : '. .');
        else if (w < 1.2) g = blink ? '*' : '+';
        else if (w < 3) g = blink ? '-*-' : (frame & 1 ? '-o-' : '=o=');
        else g = (frame & 1 ? 'x=' : '+=') + (blink ? '*' : 'o') + (frame & 1 ? '=x' : '=+');
        stamp(g, p.c, p.r, p.d);
        if (d.y < 60) stampReflection(g, d.x, d.y, d.z, time);
        return;
      }
      const base = w < 10 ? DRONE_M : w < 17 ? DRONE_L : DRONE_XL;
      const art = base.map((row) => {
        let out = '';
        for (let j = 0; j < row.length; j++) {
          const ch = row[j];
          if (ch === '~') out += PROP[(j + frame) % 3];
          else if (ch === '*') out += blink ? '*' : ' ';
          else if (ch === 'O' && inspecting) out += '@';
          else out += ch;
        }
        return out;
      });
      // Lean into the direction of travel, as a quad pitches to move
      const lean = clamp(d.vx / 12, -1, 1) * (base.length - 1);
      stampArt(art, p.c, p.r, p.d, lean);
      if (d.y < 60) stampArtReflection(art, d.x, d.y, d.z, time);
    },
  });
}

// F/A-18 low-level run down the valley, trailing wingtip vapor
const JET_SPAN  = 12.3;  // m
const JET_TRAIL = 4.5;   // s a vapor trail lingers

// Hug the valley floor, then climb out over the peaks at its head
function jetX(z, off) { return valleyX(z) + off * Math.sin(z / 600); }
function jetY(z, alt) { return alt + sstep(1100, 4200, z) * 1700; }

function trailChar(dc, dr, fade) {
  if (fade > 0.6) return '.';
  if (fade > 0.3) return Math.abs(dr) > Math.abs(dc) ? ':' : '~';
  const ac = Math.abs(dc), ar = Math.abs(dr);
  if (ar < ac * 0.4) return '=';
  if (ac < ar * 0.4) return '|';
  return (dc > 0) === (dr > 0) ? '\\' : '/';
}

function spawnJet() {
  const away = rnd() < 0.6;   // from behind us up-valley, or head-on at us
  const alt = 70 + rnd() * 90, off = (rnd() - 0.5) * 160, v = 230;
  let z = away ? -500 : 5200, bank = 0;
  const jet = { x: 0, y: 0, z: 0 };
  const trail = [];           // wingtip samples: centre, half-span offset, time, vapor strength

  fliers.push({
    kind: 'jet', age: 0, life: 90,
    update(dt, time) {
      this.age += dt;
      while (trail.length && time - trail[0].t > JET_TRAIL) trail.shift();
      if (away ? z > 5600 : z < -600) {
        if (!trail.length) this.age = this.life;
        return;
      }
      z += (away ? v : -v) * dt;
      jet.x = jetX(z, off); jet.y = jetY(z, alt); jet.z = z;

      // Heading from the path; bank from lateral acceleration (v² · x'')
      let hx = (jetX(z + 5, off) - jet.x) / 5, hz = 1;
      const hl = Math.hypot(hx, hz); hx /= hl; hz /= hl;
      const x2 = (jetX(z + 20, off) - 2 * jet.x + jetX(z - 20, off)) / 400;
      bank = clamp(Math.atan(v * v * x2 / 9.8), -1.3, 1.3);

      // Vortices condense hardest when pulling G in a turn
      const half = JET_SPAN / 2;
      trail.push({
        x: jet.x, y: jet.y, z: jet.z, t: time,
        ox: hz * half * Math.cos(bank), oy: half * Math.sin(bank), oz: -hx * half * Math.cos(bank),
        s: 0.8 + 0.2 * Math.min(1, Math.abs(bank) * 1.5),
      });
    },
    draw(time) {
      // Vapor first so the airframe paints over it
      for (const side of [-1, 1]) {
        let prev = null;
        for (const s of trail) {
          const age = time - s.t, fade = age / JET_TRAIL;
          const spread = 1 + age * 0.5;
          const p = project(s.x + side * s.ox * spread, s.y + side * s.oy * spread - age * 0.8, s.z + side * s.oz * spread);
          if (prev) {
            const dc = p.c - prev.c, dr = p.r - prev.r;
            const steps = Math.max(Math.abs(dc), Math.abs(dr));
            if (steps > 0 && steps < cols) {
              const ch = trailChar(dc, dr, fade).charCodeAt(0);
              for (let k = 0; k <= steps; k++) {
                const c = Math.round(prev.c + dc * k / steps), r = Math.round(prev.r + dr * k / steps);
                if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
                // Dissipating vapor thins out unevenly
                if (hash2(c * 7 + r, (s.t * 15) | 0) > s.s * (1 - fade * 0.85)) continue;
                const i = r * cols + c;
                if (cDepth[i] > p.d) buf[i] = ch;
              }
            }
          }
          prev = p;
        }
      }

      if (away ? z > 5600 : z < -600) return;
      const p = project(jet.x, jet.y, jet.z);
      const w = JET_SPAN * p.px / cw;
      const banked = Math.abs(bank) > 0.35, right = bank > 0;
      if (w < 1.5) stamp('+', p.c, p.r, p.d);
      else if (w < 4) stamp(banked ? (right ? '.o\'' : '\'o.') : '-o-', p.c, p.r, p.d);
      else if (w < 9) stamp(banked ? (right ? '_.o\'`' : '`\'o._') : '=-o-=', p.c, p.r, p.d);
      else {
        // Rear/front view: canted twin tails over wings and twin engines
        stamp('\\ /', p.c, p.r - 1, p.d);
        stamp(banked ? (right ? '._.(o_o)\'`' : '`\'(o_o)._.') : '==(o_o)==', p.c, p.r, p.d);
      }
      if (jet.y < 250) stampReflection(w < 4 ? '-o-' : '=-o-=', jet.x, jet.y, jet.z, time);
    },
  });
}

// Spawn schedule — each kind waits for its predecessor to leave
const kinds = [
  { kind: 'swifts', fn: spawnSwifts, first: [1.5, 4],  gap: [18, 40] },
  { kind: 'geese',  fn: spawnGeese,  first: [5, 10],   gap: [30, 60] },
  { kind: 'hawk',   fn: spawnHawk,   first: [0, 3],    gap: [15, 35], dayOnly: true },
  { kind: 'heron',  fn: spawnHeron,  first: [18, 35],  gap: [60, 110], dayOnly: true },
  { kind: 'drone',  fn: spawnDrone,  first: [7, 12],   gap: [12, 25] },
  { kind: 'jet',    fn: spawnJet,    first: [15, 30],  gap: [45, 100] },
];
kinds.forEach(k => { k.next = k.first[0] + rnd() * (k.first[1] - k.first[0]); });

function stepFliers(dt, time) {
  for (const k of kinds) {
    if (fliers.some(f => f.kind === k.kind)) continue;
    if (k.dayOnly && isNight()) continue;
    k.next -= dt;
    if (k.next <= 0) { k.fn(); k.next = k.gap[0] + rnd() * (k.gap[1] - k.gap[0]); }
  }
  for (let i = fliers.length - 1; i >= 0; i--) {
    const f = fliers[i];
    f.update(dt, time);
    if (f.age >= f.life) fliers.splice(i, 1);
  }
}

// ── Frame ────────────────────────────────
const NOISE = " .'`,-:";
function render(now) {
  const ms = now - startT;
  const time = ms / 1000;
  const n = cols * rows;
  for (let i = 0; i < n; i++) {
    const ty = pType[cP[i]];
    if (ty === T_SKY) {
      const b = sky(cPhi[i], cA[i], time, cP[i]);
      buf[i] = RAMP.charCodeAt(clamp(Math.round(b * (RAMP.length - 1)), 0, RAMP.length - 1));
    } else if (ty === T_WATER) buf[i] = water(i, time);
    else buf[i] = cStatic[i];
  }
  for (const f of fliers) f.draw(time);

  if (ms < 1900) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (ms < reveal[c]) buf[r * cols + c] = NOISE.charCodeAt((rnd() * NOISE.length) | 0);
    }
  }

  const lines = new Array(rows);
  for (let r = 0; r < rows; r++) lines[r] = String.fromCharCode.apply(null, buf.subarray(r * cols, (r + 1) * cols));
  el.textContent = lines.join('\n');
}

// ── Loop ─────────────────────────────────
let visible = true, last = 0, lastW = 0, lastH = 0;

// ── Sky mode: auto cycle, or pinned to day / night ──
// Pinning fast-forwards the clock through dusk / dawn, then holds.
const SKY_MODES = ['auto', 'day', 'night'];
const SKY_PIN   = { day: 13, night: 23 };
const SKY_FF    = 5;   // fast-forward speed, game hours per second
let skyMode = 'auto', hourNow = HOUR0;
try { const m = localStorage.getItem('heroSky'); if (SKY_MODES.includes(m)) skyMode = m; } catch (e) {}

function advanceClock(dt) {
  if (skyMode === 'auto') hourNow = (hourNow + dt * 24 / CYCLE) % 24;
  else {
    const gap = (SKY_PIN[skyMode] - hourNow + 24) % 24;
    hourNow = (hourNow + Math.min(gap, dt * SKY_FF)) % 24;
  }
  setClock(hourNow);
}

// 9×9 pixel icons, one string per row
const SKY_ICONS = {
  auto:  ['...###...', '..#..##..', '.#...###.', '.#...###.', '.#...###.', '.#...###.', '.#...###.', '..#..##..', '...###...'],
  day:   ['....#....', '.#.....#.', '...###...', '..#####..', '#.#####.#', '..#####..', '...###...', '.#.....#.', '....#....'],
  night: ['..####...', '.###.....', '###......', '###......', '###......', '###......', '###......', '.###.....', '..####...'],
};

function initSkyToggle() {
  const btn = hero.querySelector('.hero__sky');
  if (!btn) return;
  const paint = () => {
    let rects = '';
    SKY_ICONS[skyMode].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    });
    btn.innerHTML = `<svg viewBox="0 0 9 9" fill="currentColor" aria-hidden="true">${rects}</svg>`;
    btn.dataset.label = skyMode;
    btn.setAttribute('aria-label', `Sky: ${skyMode}`);
    btn.title = `Sky: ${skyMode}`;
  };
  paint();
  btn.addEventListener('click', () => {
    skyMode = SKY_MODES[(SKY_MODES.indexOf(skyMode) + 1) % SKY_MODES.length];
    try { localStorage.setItem('heroSky', skyMode); } catch (e) {}
    paint();
    if (STILL) {
      // No animation: jump straight there and redraw once
      if (skyMode !== 'auto') hourNow = SKY_PIN[skyMode];
      setClock(hourNow);
      relight(true);
      syncTheme(performance.now());
      render(performance.now());
    }
  });
}
let themeNight = null, shownOpacity = null;

// Hero background / ink follow the cycle (CSS cross-fades them)
function syncTheme(now) {
  const night = isNight();
  if (night !== themeNight) { hero.classList.toggle('hero--night', night); themeNight = night; }
  const want = night ? 0.85 : 0.78;
  if (now - startT > 2500 && want !== shownOpacity && window.gsap) {
    gsap.to(el, { opacity: want, duration: 4, ease: 'sine.inOut' });
    shownOpacity = want;
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!visible || now - last < 1000 / FPS) return;
  const dt = Math.min(0.2, (now - (last || now)) / 1000);
  last = now;
  advanceClock(dt);
  relight(false);
  syncTheme(now);
  stepFliers(dt, (now - startT) / 1000);
  render(now);
}

function start() {
  lastW = hero.clientWidth; lastH = hero.clientHeight;
  // A pinned mode starts already there rather than fast-forwarding on load
  if (skyMode !== 'auto') hourNow = SKY_PIN[skyMode];
  setClock(hourNow);
  build();
  startT = performance.now();
  syncTheme(startT);
  initSkyToggle();
  setTimeout(() => hero.classList.add('hero--cycle'), 100);
  if (STILL) {
    startT -= 5000;   // skip the intro, draw one settled frame
    render(performance.now());
    return;
  }
  requestAnimationFrame(loop);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  }

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const w = hero.clientWidth, h = hero.clientHeight;
      // Ignore mobile toolbar jitter
      if (w === lastW && Math.abs(h - lastH) < lastH * 0.15) return;
      lastW = w; lastH = h;
      build();
      startT = performance.now() - 5000;
      if (STILL) render(performance.now());
    }, 250);
  });
}

// Wait for JetBrains Mono so the cell metrics are right
const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
Promise.race([fontsReady, new Promise(r => setTimeout(r, 800))]).then(start);
})();
