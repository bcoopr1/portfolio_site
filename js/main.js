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
    moon.textContent = " _\n/ )\n\\_)";
    moon.style.top  = (10 + Math.random() * 8) + '%';
    moon.style.left = (18 + Math.random() * 50) + '%';
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
    .to(ascii, { opacity: asciiOpacity, duration: 0.6 }, '-=0.4')
    .to(role, { opacity: 1, y: 0, duration: 0.7 }, '-=0.3');
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

  // Skills tags stagger
  const tags = gsap.utils.toArray('.skills-tag');
  if (tags.length) {
    gsap.from(tags, {
      opacity: 0,
      y: 10,
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0.03,
      scrollTrigger: {
        trigger: tags[0].closest('.skills-section'),
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
  initPageHeader();
  initScrollReveal();
  initStats();
  initProjectDetail();
});
