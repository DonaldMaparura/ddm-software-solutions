/**
 * Pretoria North Animal Clinic - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initHeroCarousel();
  initScrollReveal();
  initSmoothScroll();
  initGalleryLightbox();
  initContactForm();
  initActiveNavLink();
  setCurrentYear();
});

/* ─── Navbar scroll effect ─── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const alwaysSolid = navbar.dataset.alwaysSolid === 'true';

  const onScroll = () => {
    if (alwaysSolid) {
      navbar.classList.add('navbar-scrolled');
      return;
    }
    navbar.classList.toggle('navbar-scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ─── Mobile menu ─── */
function initMobileMenu() {
  const toggle = document.getElementById('mobile-toggle');
  const menu = document.getElementById('mobile-menu');
  const close = document.getElementById('mobile-close');
  const links = menu?.querySelectorAll('a');

  if (!toggle || !menu) return;

  const openMenu = () => {
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', openMenu);
  close?.addEventListener('click', closeMenu);
  links?.forEach((link) => link.addEventListener('click', closeMenu));
}

/* ─── Hero Carousel ─── */
function initHeroCarousel() {
  const carousel = document.getElementById('hero-carousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.carousel-dot');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const pauseBtn = document.getElementById('carousel-pause');

  let current = 0;
  let interval = null;
  let isPaused = false;
  const AUTOPLAY_MS = 4500;

  restartKenBurns(slides[0]);

  function restartKenBurns(slide) {
    const img = slide?.querySelector('.hero-slide-img');
    if (!img) return;
    img.style.animation = 'none';
    void img.offsetHeight;
    img.style.animation = '';
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    restartKenBurns(slides[current]);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAutoplay() {
    stopAutoplay();
    if (!isPaused) {
      interval = setInterval(next, AUTOPLAY_MS);
    }
  }

  function stopAutoplay() {
    if (interval) clearInterval(interval);
  }

  prevBtn?.addEventListener('click', () => { prev(); startAutoplay(); });
  nextBtn?.addEventListener('click', () => { next(); startAutoplay(); });
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startAutoplay(); });
  });

  pauseBtn?.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.setAttribute('aria-pressed', isPaused);
    pauseBtn.innerHTML = isPaused
      ? '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>';
    if (isPaused) stopAutoplay();
    else startAutoplay();
  });

  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  startAutoplay();
}

/* ─── Scroll reveal animations ─── */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ─── Smooth scroll for anchor links ─── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* ─── Gallery lightbox ─── */
function initGalleryLightbox() {
  const items = document.querySelectorAll('[data-lightbox]');
  if (!items.length) return;

  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = `
    <button class="absolute top-6 right-6 text-white text-3xl hover:text-gold transition-colors z-10" aria-label="Close">&times;</button>
    <img src="" alt="Gallery image" class="lightbox-img">
  `;
  document.body.appendChild(lightbox);

  const img = lightbox.querySelector('.lightbox-img');
  const closeBtn = lightbox.querySelector('button');

  const open = (src, alt) => {
    img.src = src;
    img.alt = alt || 'Gallery image';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const imgEl = item.querySelector('img');
      const src = imgEl?.currentSrc || imgEl?.src || item.dataset.lightbox;
      const alt = imgEl?.alt;
      if (src) open(src, alt);
    });
  });

  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ─── Contact / booking form ─── */
function initContactForm() {
  const forms = document.querySelectorAll('.booking-form');
  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin w-5 h-5 mr-2 inline" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        Sending...
      `;

      setTimeout(() => {
        form.reset();
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast('Thank you! We\'ll contact you shortly to confirm your appointment.');
      }, 1500);
    });
  });
}

function showToast(message) {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification fixed bottom-24 left-1/2 -translate-x-1/2 bg-charcoal text-white px-6 py-4 rounded-2xl shadow-2xl z-[9998] text-sm font-medium flex items-center gap-3';
  toast.style.animation = 'fadeUp 0.4s ease both';
  toast.innerHTML = `
    <svg class="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
    </svg>
    ${message}
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}

/* ─── Active nav link highlighting ─── */
function initActiveNavLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html') || (path === 'index.html' && href === 'index.html')) {
      link.classList.add('active', 'text-teal-600');
    }
  });
}

function setCurrentYear() {
  document.querySelectorAll('.current-year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}
