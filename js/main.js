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

// ── ASCII glitch animation (hero) ─────────
function initAsciiGlitch() {
  const el = document.querySelector('.hero__ascii');
  if (!el) return;

  const chars = '░▒▓█▒░▓█░▒▓';
  const rows = 3;
  const cols = Math.floor(window.innerWidth / 11);

  function makeRow() {
    return Array.from({ length: cols }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  function buildBlock() {
    return Array.from({ length: rows }, makeRow).join('\n');
  }

  el.textContent = buildBlock();

  // Slow random character swap
  setInterval(() => {
    const lines = el.textContent.split('\n');
    const lineIdx = Math.floor(Math.random() * lines.length);
    const line = lines[lineIdx];
    const charIdx = Math.floor(Math.random() * line.length);
    const newChar = chars[Math.floor(Math.random() * chars.length)];
    lines[lineIdx] =
      line.substring(0, charIdx) + newChar + line.substring(charIdx + 1);
    el.textContent = lines.join('\n');
  }, 80);
}

// ── Hero entrance animation ───────────────
function initHeroAnimation() {
  const inner = document.querySelector('.hero__headline-inner');
  const role = document.querySelector('.hero__role');
  const ascii = document.querySelector('.hero__ascii');

  if (!inner) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.to(inner, { y: '0%', duration: 1.1, delay: 0.1 })
    .to(ascii, { opacity: 0.18, duration: 0.6 }, '-=0.4')
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

  initNav();
  initAsciiGlitch();
  initHeroAnimation();
  initPageHeader();
  initScrollReveal();
  initStats();
  initProjectDetail();
});
