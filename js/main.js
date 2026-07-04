/* =========================================
   MAIN.JS — Portfolio Site
   Lenis smooth scroll + GSAP animations
   ========================================= */

// ── Lenis smooth scroll ──────────────────
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Wire Lenis into ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

// ── Nav: active link + hamburger ─────────
function initNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (
      href === currentPath ||
      (currentPath === '' && href === 'index.html') ||
      (currentPath === 'index.html' && href === 'index.html')
    ) {
      link.classList.add('active');
    }
  });

  const hamburger = document.querySelector('.nav__hamburger');
  const overlay = document.querySelector('.nav__overlay');
  if (!hamburger || !overlay) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    overlay.classList.toggle('open');
    document.body.style.overflow = overlay.classList.contains('open') ? 'hidden' : '';
  });

  overlay.querySelectorAll('.nav__overlay-link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── Time of day helpers ───────────────────
function getIsNight() {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

function applyHeroTheme() {
  const hero = document.querySelector('.hero');
  if (hero && getIsNight()) hero.classList.add('hero--night');
}

// ── ASCII mountain background (hero) ──────
function initAsciiMountains() {
  const el = document.querySelector('.hero__ascii');
  if (!el) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Match CSS: clamp(0.55rem, 1vw, 0.85rem), line-height 1.25
  const fs = Math.min(Math.max(vw * 0.01, 8.8), 13.6);
  const cols = Math.floor(vw / (fs * 0.62));
  const rows = Math.floor(vh / (fs * 1.25));

  function wave(c, harmonics) {
    const t = c / Math.max(cols - 1, 1);
    return harmonics.reduce((s, [f, a, p]) => s + a * Math.sin(Math.PI * f * t + p), 0);
  }

  function makeRidge(harmonics, yStart, ySpan) {
    const raw = Array.from({ length: cols }, (_, c) => wave(c, harmonics));
    const lo = Math.min(...raw);
    const range = Math.max(...raw) - lo || 1;
    return raw.map(v =>
      Math.round(yStart * rows + (1 - (v - lo) / range) * ySpan * rows)
    );
  }

  // Near ridgeline: dominant foreground peaks
  const near = makeRidge(
    [[2.0, 0.40, 0.5], [4.5, 0.25, 1.8], [8.5, 0.15, 0.9], [15, 0.10, 2.4], [25, 0.05, 1.1]],
    0.38, 0.45
  );

  // Far ridgeline: distant background peaks
  const far = makeRidge(
    [[1.6, 0.32, 1.3], [3.8, 0.20, 0.2], [7.0, 0.12, 2.0], [12, 0.07, 1.6]],
    0.25, 0.28
  );

  function slopeChar(ridge, c, flat) {
    const m = ridge[c];
    const l = ridge[c - 1] ?? m;
    const r = ridge[c + 1] ?? m;
    if (l > m && r > m) return '^';
    if (l > m) return '/';
    if (r > m) return '\\';
    return flat;
  }

  // Build target character grid
  const isNight = getIsNight();

  const target = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const n = near[c], f = far[c];

      // Near mountain body / ground line
      if (r > n) return r >= rows - 1 ? '_' : (isNight ? ' ' : '.');
      // Near ridgeline
      if (r === n) return slopeChar(near, c, '_');
      // Far mountain body — dark silhouette at night
      if (r > f) return isNight ? ' ' : '`';
      // Far ridgeline
      if (r === f) return slopeChar(far, c, '.');

      // Sky: sprinkle stars at night
      if (isNight) {
        const p = Math.random();
        if (p < 0.022) return '*';
        if (p < 0.050) return '.';
      }
      return ' ';
    })
  );

  // Initialize with mountain-ish noise so the transition feels organic
  const noiseChars = "/\\^._-~'`.";
  const current = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => noiseChars[Math.floor(Math.random() * noiseChars.length)])
  );

  let dirty = false;
  let running = true;

  const tick = () => {
    if (dirty) { el.textContent = current.map(r => r.join('')).join('\n'); dirty = false; }
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Columns crystallize in random order over ~1.3s, starting at 0.5s
  const colOrder = Array.from({ length: cols }, (_, i) => i).sort(() => Math.random() - 0.5);
  colOrder.forEach((c, i) => {
    setTimeout(() => {
      for (let r = 0; r < rows; r++) current[r][c] = target[r][c];
      dirty = true;
    }, 500 + (i / cols) * 1300);
  });

  setTimeout(() => {
    running = false;
    el.textContent = current.map(r => r.join('')).join('\n');
  }, 1950);
}

// ── ASCII bird flyby ──────────────────────
function initBird() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const framesR = ['\\o/', '-o-', '/o\\'];
  const framesL = ['/o\\', '-o-', '\\o/'];

  function launch() {
    const bird = document.createElement('div');
    bird.className = 'hero__bird';
    bird.setAttribute('aria-hidden', 'true');
    hero.appendChild(bird);
    bird.style.top = '0px';
    bird.style.left = '0px';

    const goRight = Math.random() > 0.5;
    const frames = goRight ? framesR : framesL;
    const dur = 14 + Math.random() * 8;
    const vw = window.innerWidth;
    const heroH = hero.clientHeight;
    const startX = goRight ? -40 : vw + 40;
    const endX   = goRight ? vw + 40 : -40;

    // Base altitude in sky zone (8–30% from top), then 2–4 drift waypoints
    const baseY = heroH * (0.08 + Math.random() * 0.22);
    const numPts = 2 + Math.floor(Math.random() * 3);
    const yPath = Array.from({ length: numPts }, () =>
      baseY + (Math.random() - 0.5) * heroH * 0.10
    );

    gsap.set(bird, { x: startX, y: baseY, opacity: 0 });
    bird.textContent = frames[0];

    let fi = 0;
    const flapId = setInterval(() => {
      fi = (fi + 1) % frames.length;
      bird.textContent = frames[fi];
    }, 260);

    const tl = gsap.timeline({
      onComplete: () => { clearInterval(flapId); bird.remove(); }
    });

    // Linear x, undulating y through waypoints
    tl.to(bird, { x: endX, duration: dur, ease: 'none' }, 0);
    const segDur = dur / numPts;
    yPath.forEach((y, i) => {
      tl.to(bird, { y, duration: segDur, ease: 'sine.inOut' }, i * segDur);
    });

    tl.to(bird, { opacity: 0.55, duration: 1.5 }, 0);
    tl.to(bird, { opacity: 0, duration: 2 }, dur - 2);
  }

  setTimeout(launch, 4000 + Math.random() * 4000);
  setInterval(() => setTimeout(launch, Math.random() * 3000), 14000);
}

// ── ASCII drone arc ───────────────────────
function initDrone() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Four-frame spinning propeller cycle
  const spinFrames = ['-(=)-', '\\(=)/', '|(=)|', '/(=)\\'];

  function launch() {
    const drone = document.createElement('div');
    drone.className = 'hero__drone';
    drone.setAttribute('aria-hidden', 'true');
    hero.appendChild(drone);
    drone.style.top = '0px';
    drone.style.left = '0px';

    const heroH = hero.clientHeight;
    const vw = window.innerWidth;
    const goRight = Math.random() > 0.5;

    // Start/end near mountain tops, peak high in sky
    const groundY = heroH * (0.62 + Math.random() * 0.12);
    const peakY   = heroH * (0.05 + Math.random() * 0.14);
    const dur = 20 + Math.random() * 10;
    const startX = goRight ? -60 : vw + 60;
    const endX   = goRight ? vw + 60 : -60;

    gsap.set(drone, { x: startX, y: groundY, opacity: 0 });
    drone.textContent = spinFrames[0];

    let fi = 0;
    const spinId = setInterval(() => {
      fi = (fi + 1) % spinFrames.length;
      drone.textContent = spinFrames[fi];
    }, 130);

    const tl = gsap.timeline({
      onComplete: () => { clearInterval(spinId); drone.remove(); }
    });

    // Linear horizontal travel
    tl.to(drone, { x: endX, duration: dur, ease: 'none' }, 0);

    // Arc: rise to sky, then descend back behind mountain ridge
    tl.to(drone, { y: peakY, duration: dur * 0.38, ease: 'power2.out' }, 0);
    tl.to(drone, { y: groundY + heroH * 0.05, duration: dur * 0.62, ease: 'power2.in' }, dur * 0.38);

    // Fade in, then fade out as it descends behind the peaks
    tl.to(drone, { opacity: 0.60, duration: 1.8 }, 0);
    tl.to(drone, { opacity: 0, duration: dur * 0.28 }, dur * 0.70);
  }

  // First drone after 12–20 s, then every ~28 s
  setTimeout(launch, 12000 + Math.random() * 8000);
  setInterval(() => setTimeout(launch, Math.random() * 5000), 28000);
}

// ── Sun / moon / clouds ───────────────────
function initSky() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const isNight = getIsNight();

  if (isNight) {
    // Crescent moon — static, fades in with the scene
    const moon = document.createElement('div');
    moon.className = 'hero__celestial';
    moon.setAttribute('aria-hidden', 'true');
    moon.textContent = [
      "         _.._",
      "       .' .-'`",
      "      /  /",
      "      |  |",
      "      \\  \\",
      "       '._'-._",
      "          `\`\`",
    ].join('\n');
    moon.style.top  = (6 + Math.random() * 10) + '%';
    moon.style.left = (14 + Math.random() * 45) + '%';
    hero.appendChild(moon);
    setTimeout(() => gsap.to(moon, { opacity: 0.55, duration: 2.5 }), 900);

  } else {
    // Sun — static upper-right
    const sun = document.createElement('div');
    sun.className = 'hero__celestial';
    sun.setAttribute('aria-hidden', 'true');
    sun.textContent = "\\|/\n-O-\n/|\\";
    sun.style.top   = (8 + Math.random() * 5) + '%';
    sun.style.right = (14 + Math.random() * 8) + '%';
    hero.appendChild(sun);
    setTimeout(() => gsap.to(sun, { opacity: 0.32, duration: 2.5 }), 900);

    // Drifting clouds
    const cloudShapes = ['(   )', '( ~~ )', '(  ~~  )', '(~~~~~)', '( ~ ~ )'];

    function spawnCloud() {
      const cloud = document.createElement('div');
      cloud.className = 'hero__cloud';
      cloud.setAttribute('aria-hidden', 'true');
      cloud.textContent = cloudShapes[Math.floor(Math.random() * cloudShapes.length)];

      const goRight = Math.random() > 0.5;
      const dur = 55 + Math.random() * 45;
      const vw = window.innerWidth;

      cloud.style.top  = (8 + Math.random() * 24) + '%';
      cloud.style.left = '0px';
      hero.appendChild(cloud);

      gsap.set(cloud, { x: goRight ? -140 : vw + 140 });
      gsap.to(cloud, { x: goRight ? vw + 140 : -140, duration: dur, ease: 'none',
        onComplete: () => cloud.remove() });
      gsap.to(cloud, { opacity: 0.24, duration: 5 });
      gsap.to(cloud, { opacity: 0, duration: 6, delay: dur - 6 });
    }

    // First cloud almost immediately, then every ~35 s
    setTimeout(spawnCloud, 500 + Math.random() * 2000);
    setInterval(() => setTimeout(spawnCloud, Math.random() * 5000), 35000);
  }
}

// ── Hero entrance animation ───────────────
function initHeroAnimation() {
  const inner = document.querySelector('.hero__headline-inner');
  const role = document.querySelector('.hero__role');
  const ascii = document.querySelector('.hero__ascii');

  if (!inner) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  const asciiOpacity = getIsNight() ? 0.58 : 0.44;

  tl.to(inner, { y: '0%', duration: 1.1, delay: 0.1 })
    .to(ascii, { opacity: asciiOpacity, duration: 0.6 }, '-=0.4');
  if (role) tl.to(role, { opacity: 1, y: 0, duration: 0.7 }, '-=0.3');
}

// ── Scroll-triggered reveals ──────────────
function initScrollReveal() {
  // Generic up-reveal
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
      },
    });
  });

  // Clip-reveal (headline inner spans)
  gsap.utils.toArray('.reveal-clip__inner').forEach((el) => {
    gsap.to(el, {
      y: '0%',
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el.parentElement,
        start: 'top 88%',
        once: true,
      },
    });
  });

  // Staggered project list rows
  const rows = gsap.utils.toArray('.project-list__row');
  if (rows.length) {
    gsap.from(rows, {
      opacity: 0,
      y: 18,
      duration: 0.55,
      ease: 'power2.out',
      stagger: 0.055,
      scrollTrigger: {
        trigger: rows[0].parentElement,
        start: 'top 85%',
        once: true,
      },
    });
  }

  // Timeline / resume entries
  gsap.utils.toArray('.timeline__entry, .resume-entry').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 16,
      duration: 0.55,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
      },
    });
  });

  // Contact methods
  const methods = gsap.utils.toArray('.contact-method');
  if (methods.length) {
    gsap.from(methods, {
      opacity: 0,
      y: 12,
      duration: 0.45,
      ease: 'power2.out',
      stagger: 0.07,
      scrollTrigger: {
        trigger: methods[0].closest('.contact-methods'),
        start: 'top 85%',
        once: true,
      },
    });
  }
}

// ── Stats row subtle fade ─────────────────
function initStats() {
  const stats = document.querySelector('.stats');
  if (!stats) return;
  gsap.from(stats, {
    opacity: 0,
    duration: 0.9,
    ease: 'power2.out',
    scrollTrigger: { trigger: stats, start: 'top 88%', once: true },
  });
}

// ── Page header reveal ────────────────────
function initPageHeader() {
  const title = document.querySelector('.page-header__title');
  const sub = document.querySelector('.page-header__subtitle');
  if (!title) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(title, { opacity: 0, y: 28, duration: 0.8, delay: 0.05 });
  if (sub) tl.from(sub, { opacity: 0, y: 12, duration: 0.5 }, '-=0.4');
}

// ── Project detail entrance ───────────────
function initProjectFolders() {
  document.querySelectorAll('.project-folder__header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.project-folder').classList.toggle('project-folder--open');
    });
  });
}

function initProjectDetail() {
  const title = document.querySelector('.project-detail__title');
  if (!title) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.project-detail__back', { opacity: 0, x: -10, duration: 0.5, delay: 0.1 })
    .from(title, { opacity: 0, y: 24, duration: 0.8 }, '-=0.2')
    .from('.project-detail__meta', { opacity: 0, y: 10, duration: 0.5 }, '-=0.4');

  gsap.utils.toArray('.project-detail__desc p').forEach((p, i) => {
    gsap.from(p, {
      opacity: 0,
      y: 16,
      duration: 0.55,
      ease: 'power2.out',
      delay: i * 0.08,
      scrollTrigger: { trigger: p, start: 'top 88%', once: true },
    });
  });

  gsap.utils.toArray('.project-detail__fact').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      x: -10,
      duration: 0.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}


// ── Node mesh animation (Argus page) ──────
function initNodeAnimation() {
  const el = document.querySelector('.argus-nodes');
  if (!el) return;

  const W = 55, H = 28;

  // Three LoRa towers spread wide in a triangle.
  // Tower (5w x 5h):  *  /  \|/  |  /|\  /   \
  const TOWERS = [
    { tr: 0,  tc: 25 },
    { tr: 21, tc:  2 },
    { tr: 21, tc: 48 },
  ];

  function line(r1, c1, r2, c2, n) {
    return Array.from({ length: n }, (_, i) => [
      Math.round(r1 + (r2 - r1) * i / (n - 1)),
      Math.round(c1 + (c2 - c1) * i / (n - 1)),
    ]);
  }

  // Invisible paths — only packets appear, flying through open space
  const PATHS = [
    { pts: line(5, 27, 21, 5,  17) },
    { pts: line(5, 27, 21, 51, 17) },
    { pts: line(23, 8, 23, 50, 20) },
  ];

  // Grass — deterministic seeded positions across the full canvas
  const GRASS = [];
  const GCHARS = [',', "'", '.', '`', ','];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const h = (r * 71 + c * 37) % 100;
      if (h < 18) GRASS.push([r, c, GCHARS[h % 5]]);
    }
  }

  const signals = [
    { pi: 0, pct: 0.00, spd:  0.044, chr: '*' },
    { pi: 0, pct: 0.55, spd: -0.040, chr: 'o' },
    { pi: 1, pct: 0.15, spd:  0.041, chr: '*' },
    { pi: 1, pct: 0.65, spd: -0.038, chr: 'o' },
    { pi: 2, pct: 0.25, spd:  0.030, chr: '*' },
    { pi: 2, pct: 0.72, spd: -0.028, chr: 'o' },
  ];

  const makeGrid = () => Array.from({ length: H }, () => Array(W).fill(' '));

  function put(g, r, c, s) {
    for (let i = 0; i < s.length; i++)
      if (r >= 0 && r < H && c + i >= 0 && c + i < W) g[r][c + i] = s[i];
  }

  const render = g => g.map(r => r.join('')).join('\n');

  function drawTower(g, tr, tc) {
    put(g, tr,     tc + 2, '*');
    put(g, tr + 1, tc + 1, '\\|/');
    put(g, tr + 2, tc + 2, '|');
    put(g, tr + 3, tc + 1, '/|\\');
    put(g, tr + 4, tc,     '/   \\');
  }

  let tick = 0;

  function step() {
    tick++;

    for (const s of signals) {
      s.pct += s.spd;
      if (s.pct >= 1.0) s.pct -= 1.0;
      if (s.pct <  0.0) s.pct += 1.0;
    }

    const g = makeGrid();
    for (const [r, c, ch] of GRASS) put(g, r, c, ch);
    for (const t of TOWERS) drawTower(g, t.tr, t.tc);
    for (const s of signals) {
      const pts = PATHS[s.pi].pts;
      const [r, c] = pts[Math.min(Math.floor(s.pct * pts.length), pts.length - 1)];
      put(g, r, c, s.chr);
    }
    el.textContent = render(g);
  }

  const ig = makeGrid();
  for (const [r, c, ch] of GRASS) put(ig, r, c, ch);
  for (const t of TOWERS) drawTower(ig, t.tr, t.tc);
  el.textContent = render(ig);

  const tid = setInterval(step, 130);
  window.addEventListener('pagehide', () => clearInterval(tid), { once: true });
}
// ── Mail animation (Shepherd page) ────────
function initMailAnimation() {
  const el = document.querySelector('.shepherd-mail');
  if (!el) return;

  const W = 50, H = 15;
  const EX = 17, EY = 9;   // envelope top-left
  const LX = EX + 2;        // letter left col

  const LETTER = [
    '.--------.',
    '| ~~~~~~ |',
    '| ~~~~~~ |',
    '| ~~~~~~ |',
    "'--------'",
  ];

  const grid = () => Array.from({ length: H }, () => Array(W).fill(' '));

  function put(g, r, c, s) {
    for (let i = 0; i < s.length; i++)
      if (r >= 0 && r < H && c + i >= 0 && c + i < W) g[r][c + i] = s[i];
  }

  const render = g => g.map(r => r.join('')).join('\n');

  function drawFlap(g, ex, ey) {
    put(g, ey - 2, ex + 3, '   /\\   ');
    put(g, ey - 1, ex + 3, '  /  \\  ');
  }

  function drawBody(g, ex, ey) {
    put(g, ey,     ex, '.------------.');
    put(g, ey + 1, ex, '|            |');
    put(g, ey + 2, ex, '|            |');
    put(g, ey + 3, ex, '|            |');
    put(g, ey + 4, ex, "'------------'");
  }

  function drawClosing(g, ex, ey) {
    put(g, ey - 1, ex, '.\\__________/.');
    drawBody(g, ex, ey);
  }

  function drawSealed(g, ex, ey) {
    put(g, ey,     ex, '.------------.');
    put(g, ey + 1, ex, '|\\ -------- /|');
    put(g, ey + 2, ex, "| '--------' |");
    put(g, ey + 3, ex, '|            |');
    put(g, ey + 4, ex, "'------------'");
  }

  function drawLetter(g, ly) {
    LETTER.forEach((row, i) => put(g, ly + i, LX, row));
  }

  const seq = [];

  // Phase 1: letter descends toward open envelope
  for (let ly = -3; ly < EY - LETTER.length; ly++) {
    const g = grid();
    drawFlap(g, EX, EY);
    drawBody(g, EX, EY);
    drawLetter(g, ly);
    seq.push(render(g));
  }

  // Phase 2: letter enters envelope (flap behind, body in front)
  for (let step = 0; step < 6; step++) {
    const g = grid();
    const ly = EY - LETTER.length + step;
    drawFlap(g, EX, EY);
    drawLetter(g, ly);
    drawBody(g, EX, EY);
    seq.push(render(g));
  }

  // Phase 3: flap closes
  { const g = grid(); drawClosing(g, EX, EY); seq.push(render(g)); seq.push(render(g)); }

  // Phase 4: sealed — hold
  { const g = grid(); drawSealed(g, EX, EY); seq.push(render(g)); seq.push(render(g)); seq.push(render(g)); }

  // Phase 5: fly right with motion trail
  for (let dx = 1; dx <= 11; dx++) {
    const g = grid();
    put(g, EY + 2, EX, '-->'.repeat(20).substring(0, dx * 3));
    drawSealed(g, EX + dx * 3, EY);
    seq.push(render(g));
  }

  // Phase 6: blank pause
  for (let i = 0; i < 4; i++) seq.push(render(grid()));

  let idx = 0;
  const tid = setInterval(() => { el.textContent = seq[idx]; idx = (idx + 1) % seq.length; }, 120);
  window.addEventListener('pagehide', () => clearInterval(tid), { once: true });
}

// ── Chatbot robot animation ────────────────
function initChatbotRobot() {
  const el = document.querySelector('.chatbot-robot');
  if (!el) return;

  const msgs = ['Hello! :)', 'Beep boop!', 'How can I help?', 'Processing...', 'Ready!'];
  let mi = 0, eyeOpen = true, tick = 0;

  function draw() {
    const eyes = eyeOpen ? 'o     o' : '-     -';
    const msg  = msgs[mi];
    const bw   = Math.max(msg.length, 13);
    const pad  = ' '.repeat(bw - msg.length);
    const dash = '-'.repeat(bw + 2);
    el.textContent = [
      `  .${dash}.`,
      `  | ${msg}${pad} |`,
      `  '${dash}'`,
      `            /`,
      `     .------'`,
      `     | ${eyes} |`,
      `     |   ---   |`,
      `     '---------'`,
      `    .-----------.`,
      `    | [=======] |`,
      `    '-----------'`,
      `        |     |`,
      `       [_]   [_]`,
    ].join('\n');
  }

  draw();
  setInterval(() => {
    tick++;
    if (tick % 50 === 0) {
      mi = (mi + 1) % msgs.length;
    }
    if (tick % 35 === 0) {
      eyeOpen = false;
      draw();
      setTimeout(() => { eyeOpen = true; draw(); }, 200);
      return;
    }
    draw();
  }, 100);
}

// ── SkillSwap campus chat animation ───────
function initSkillSwapArt() {
  const el = document.querySelector('.skillswap-art');
  if (!el) return;

  const offersA = ['teach Python', 'teach guitar', 'teach design'];
  const offersB = ['teach Spanish', 'teach chess', 'teach drawing'];
  let phase = 0, phaseTick = 0, idx = 0;

  const W = 52, H = 7;
  const MAX_LEN = 19; // longest: "I can teach Spanish"
  const PA = 4;       // person A head col
  const PB = 44;      // person B head col
  const BA = 0;       // bubble A start col
  const BB = 29;      // bubble B start col

  function drawBubble(g, text, startCol, tailCol) {
    const padded = (text + ' '.repeat(MAX_LEN)).slice(0, MAX_LEN);
    g[0][startCol] = '.';
    for (let i = 1; i <= MAX_LEN + 2; i++) g[0][startCol + i] = '-';
    g[0][startCol + MAX_LEN + 3] = '.';
    g[1][startCol] = '|'; g[1][startCol + 1] = ' ';
    for (let i = 0; i < MAX_LEN; i++) g[1][startCol + 2 + i] = padded[i];
    g[1][startCol + MAX_LEN + 2] = ' '; g[1][startCol + MAX_LEN + 3] = '|';
    g[2][startCol] = "'";
    for (let i = 1; i <= MAX_LEN + 2; i++) g[2][startCol + i] = '-';
    g[2][startCol + MAX_LEN + 3] = "'";
    g[3][tailCol] = '\\';
  }

  function draw() {
    const g = Array.from({length: H}, () => new Array(W).fill(' '));

    g[4][PA] = 'O';
    g[5][PA-1] = '/'; g[5][PA] = '|'; g[5][PA+1] = '\\';
    g[6][PA-1] = '/'; g[6][PA+1] = '\\';

    g[4][PB] = 'O';
    g[5][PB-1] = '/'; g[5][PB] = '|'; g[5][PB+1] = '\\';
    g[6][PB-1] = '/'; g[6][PB+1] = '\\';

    const showA = phase === 1 || phase === 3 || phase === 4;
    const showB = phase === 2 || phase === 3 || phase === 4;

    if (showA) drawBubble(g, 'I can ' + offersA[idx], BA, PA);
    if (showB) drawBubble(g, 'I can ' + offersB[idx], BB, PB);

    el.textContent = g.map(r => r.join('')).join('\n');
  }

  draw();
  setInterval(() => {
    phaseTick++;
    const durations = [18, 22, 22, 22, 12, 20];
    if (phaseTick >= durations[phase]) {
      phaseTick = 0;
      phase = (phase + 1) % durations.length;
      if (phase === 0) idx = (idx + 1) % offersA.length;
    }
    draw();
  }, 100);
}

// ── ML pattern recognition animation ─────
function initMLArt() {
  const el = document.querySelector('.ml-art');
  if (!el) return;

  const W = 34, H = 13;
  let tick = 0;

  // class A (o) upper-left cluster, class B (x) lower-right
  const ptA = [[2,1],[4,2],[3,3],[6,1],[5,3],[7,2],[4,4],[8,2],[6,4],[3,5],[9,1],[5,5],[7,4],[10,2],[8,5]];
  const ptB = [[22,7],[24,8],[23,9],[25,7],[26,9],[21,8],[24,10],[27,8],[22,10],[25,10],[26,7],[28,9],[27,10],[23,7],[29,8]];

  function draw() {
    const TOTAL = 160;
    const t = tick % TOTAL;
    const g = Array.from({length: H}, () => new Array(W).fill('.'));

    // Phase 1: scatter points appear (t 0-59)
    const nA = Math.min(ptA.length, Math.floor(t / 2));
    const nB = Math.min(ptB.length, Math.floor(Math.max(0, t - 10) / 2));
    for (let i = 0; i < nA; i++) { const [c, r] = ptA[i]; if (r < H && c < W) g[r][c] = 'o'; }
    for (let i = 0; i < nB; i++) { const [c, r] = ptB[i]; if (r < H && c < W) g[r][c] = 'x'; }

    // Phase 2: decision boundary sweeps in (t 60-85)
    if (t > 55) {
      const pct = Math.min(1, (t - 55) / 22);
      const maxR = Math.floor(H * pct);
      for (let r = 0; r < maxR; r++) {
        const c = Math.round(13 + r * 0.55);
        if (c >= 0 && c < W && g[r][c] === '.') g[r][c] = '/';
      }
    }

    const lines = g.map(row => row.join(' ')).join('\n');

    // Phase 3: accuracy counter climbs (t 85+)
    let footer;
    if (t < 55) {
      footer = '\n  training...';
    } else if (t < 90) {
      footer = '\n  fitting boundary...';
    } else {
      const acc = Math.min(94, Math.floor((t - 90) * 2.8));
      footer = `\n  accuracy: ${acc}%    o class-A   x class-B`;
    }

    el.textContent = lines + footer;
    tick++;
  }

  draw();
  setInterval(draw, 90);
}

// ── LangChain agent packet animation ──────
function initLangchainArt() {
  const el = document.querySelector('.langchain-art');
  if (!el) return;

  const W = 50, H = 7;
  let tick = 0;

  const BOXES = [
    { c: 1,  r: 1, l1: ' EMAIL  ', l2: '  TOOL  ' },
    { c: 20, r: 1, l1: ' AGENT  ', l2: '  CORE  ' },
    { c: 39, r: 1, l1: ' CAL.   ', l2: '  TOOL  ' },
  ];
  const ARROWS = [
    { r: 3, c1: 11, c2: 20 },
    { r: 3, c1: 30, c2: 39 },
  ];
  const CYCLE = 18;

  function draw() {
    const g = Array.from({length: H}, () => new Array(W).fill(' '));

    for (const b of BOXES) {
      const { c, r, l1, l2 } = b;
      const w = l1.length;
      g[r][c] = '.'; for (let i = 1; i <= w; i++) g[r][c+i] = '-'; g[r][c+w+1] = '.';
      g[r+1][c] = '|'; for (let i = 0; i < w; i++) g[r+1][c+1+i] = l1[i]; g[r+1][c+w+1] = '|';
      g[r+2][c] = '|'; for (let i = 0; i < w; i++) g[r+2][c+1+i] = l2[i]; g[r+2][c+w+1] = '|';
      g[r+3][c] = "'"; for (let i = 1; i <= w; i++) g[r+3][c+i] = '-'; g[r+3][c+w+1] = "'";
    }

    for (let ai = 0; ai < ARROWS.length; ai++) {
      const { r, c1, c2 } = ARROWS[ai];
      const len = c2 - c1;
      for (let i = 0; i < len; i++) g[r][c1+i] = '-';
      g[r][c2-1] = '>';
      const phase = Math.floor((tick + ai * 9) / 2) % CYCLE;
      if (phase < len) g[r][c1 + phase] = 'o';
    }

    const labels = [' email tool', '  agent core', '  cal. tool'];
    const lCols  = [1, 20, 39];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < labels[i].length; j++) g[5][lCols[i]+j] = labels[i][j];
    }

    el.textContent = g.map(r => r.join('')).join('\n');
    tick++;
  }

  draw();
  setInterval(draw, 80);
}

// ── Homelab server rack animation ─────────
function initHomelabAnimation() {
  const el = document.querySelector('.homelab-art');
  if (!el) return;

  // Large server rack with monitor on top.
  // Cables run DOWN from the rack bottom and along the floor.

  const W = 65, H = 33;
  const RC = 4, RW = 22;  // rack/monitor left col, width (. + 20 content + .)

  // Monitor screen interior: rows 1-4, cols RC+1 to RC+20
  const SCR_R = 1, SCR_C = RC + 1, SCR_W = 20, SCR_H = 4;
  const WELCOME_TEXT = 'Welcome!';
  const WELCOME = [
    '                    ',
    '      Welcome!      ',  // 6+8+6 = 20
    '                    ',
    '                    ',
  ];

  const MCHARS = '01!@#$%^ABCDabcd/\\|=+-:;1100';
  const mc = () => MCHARS[Math.floor(Math.random() * MCHARS.length)];

  // LED state: 5 rows x 6 LEDs
  let leds = Array.from({length: 5}, () =>
    Array.from({length: 6}, () => Math.random() > 0.5)
  );

  let phase = -1, phaseTick = 0, typedLen = 0;
  let rainHeads = new Array(SCR_W).fill(-1);
  let matrixFill = Array.from({length: SCR_H}, () => new Array(SCR_W).fill(' '));

  // Cable drop columns (within the rack footprint)
  const CABLE_COLS = [RC + 3, RC + 7, RC + 13, RC + 18]; // cols 7,11,17,22

  const makeGrid = () => Array.from({length: H}, () => Array(W).fill(' '));

  function put(g, r, c, s) {
    for (let i = 0; i < s.length; i++)
      if (r >= 0 && r < H && c + i >= 0 && c + i < W) g[r][c + i] = s[i];
  }

  const render = g => g.map(r => r.join('')).join('\n');

  function drawStructure(g) {
    // Monitor (rows 0-6)
    put(g, 0, RC, '.--------------------.'); // . + 20- + . = 22
    put(g, 1, RC, '|                    |');
    put(g, 2, RC, '|                    |');
    put(g, 3, RC, '|                    |');
    put(g, 4, RC, '|                    |');
    put(g, 5, RC, "'--------------------'");
    put(g, 6, RC + 9, '| |'); // stand

    // Rack (rows 7-27)
    put(g,  7, RC, '.--------------------.'); // rack top
    for (const r of [9, 11, 13, 15, 17, 19, 21, 23, 25]) put(g, r, RC, '|--------------------|');
    for (const r of [10, 14, 18, 22, 26]) put(g, r, RC, '| [======]  [======] |');
    put(g, 27, RC, "'===================='"); // rack base
    // Left/right walls for LED rows
    for (const r of [8, 12, 16, 20, 24]) { put(g, r, RC, '|'); put(g, r, RC + 21, '|'); }

    // Cable drops from rack bottom down to floor
    for (const c of CABLE_COLS) {
      put(g, 28, c, '|');
      put(g, 29, c, '|');
    }

    // Floor cable tray — goes edge to edge with T-junctions at cable cols
    const floor1 = Array(W).fill('=');
    floor1[0] = '<';
    floor1[W - 1] = '>';
    for (const c of CABLE_COLS) floor1[c] = '+';
    put(g, 30, 0, floor1.join(''));

    // Second floor cable (fiber / thin cable)
    const floor2 = Array(W).fill('~');
    floor2[0] = '<';
    floor2[W - 1] = '>';
    put(g, 31, 0, floor2.join(''));
  }

  function drawLeds(g) {
    const ledRows = [8, 12, 16, 20, 24];
    const ledCols = [RC+2, RC+5, RC+8, RC+11, RC+14, RC+17];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 6; c++)
        put(g, ledRows[r], ledCols[c], leds[r][c] ? '*' : 'o');
  }

  function drawScreen(g) {
    for (let sr = 0; sr < SCR_H; sr++) {
      let row;
      if (phase === -1) {
        row = new Array(SCR_W).fill(' ');
        if (sr === 1) {
          const typed = '      ' + WELCOME_TEXT.slice(0, typedLen);
          for (let i = 0; i < SCR_W; i++) row[i] = typed[i] || ' ';
        }
      } else {
        row = WELCOME[sr].split('');
        if (phase >= 1) {
          for (let sc = 0; sc < SCR_W; sc++) {
            const h = rainHeads[sc];
            if (h < 0) continue;
            if (sr < h) row[sc] = matrixFill[sr][sc];
            else if (sr === h && h < SCR_H) row[sc] = mc();
          }
        }
      }
      put(g, SCR_R + sr, SCR_C, row.join(''));
    }
  }

  let tick = 0;

  function step() {
    tick++; phaseTick++;

    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 6; c++)
        if (Math.random() < 0.04) leds[r][c] = !leds[r][c];

    if (phase === -1) {
      if (phaseTick % 4 === 0 && typedLen < WELCOME_TEXT.length) typedLen++;
      if (typedLen >= WELCOME_TEXT.length && phaseTick > 24) { phase = 0; phaseTick = 0; }

    } else if (phase === 0) {
      if (phaseTick > 38) { phase = 1; phaseTick = 0; }

    } else if (phase === 1) {
      for (let sc = 0; sc < SCR_W; sc++)
        if (rainHeads[sc] === -1 && phaseTick >= sc * 2) rainHeads[sc] = 0;
      if (phaseTick % 5 === 0) {
        for (let sc = 0; sc < SCR_W; sc++) {
          if (rainHeads[sc] >= 0 && rainHeads[sc] < SCR_H) {
            matrixFill[rainHeads[sc]][sc] = mc();
            rainHeads[sc]++;
          }
        }
      }
      if (rainHeads.every(h => h >= SCR_H)) { phase = 2; phaseTick = 0; }

    } else if (phase === 2) {
      if (phaseTick % 2 === 0)
        matrixFill[Math.floor(Math.random()*SCR_H)][Math.floor(Math.random()*SCR_W)] = mc();
      if (phaseTick > 25) { phase = 3; phaseTick = 0; }

    } else if (phase === 3) {
      // Scroll matrix rows off the bottom — one row every 2 ticks
      if (phaseTick % 2 === 0 && phaseTick <= SCR_H * 2) {
        matrixFill.pop();
        matrixFill.unshift(new Array(SCR_W).fill(' '));
      }
      // Brief blank pause then restart typewriter
      if (phaseTick > SCR_H * 2 + 10) {
        phase = -1; phaseTick = 0; typedLen = 0;
        rainHeads = new Array(SCR_W).fill(-1);
        matrixFill = Array.from({length: SCR_H}, () => new Array(SCR_W).fill(' '));
      }
    }

    const g = makeGrid();
    drawStructure(g);
    drawLeds(g);
    drawScreen(g);
    el.textContent = render(g);
  }

  const ig = makeGrid();
  drawStructure(ig);
  drawLeds(ig);
  el.textContent = render(ig);

  const tid = setInterval(step, 130);
  window.addEventListener('pagehide', () => clearInterval(tid), { once: true });
}
// ── Init ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Only init Lenis if the library is loaded
  if (typeof Lenis !== 'undefined') initLenis();

  applyHeroTheme();
  initNav();
  initAsciiMountains();
  initBird();
  initDrone();
  initSky();
  initHeroAnimation();
  initNodeAnimation();
  initMailAnimation();
  initHomelabAnimation();
  initChatbotRobot();
  initLangchainArt();
  initMLArt();
  initSkillSwapArt();
  initPageHeader();
  initProjectFolders();
  initScrollReveal();
  initStats();
  initProjectDetail();
});
