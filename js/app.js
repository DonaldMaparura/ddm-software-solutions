(function () {
  'use strict';

  /* Theme */
  const THEME_KEY = 'ddm-theme';
  const themeToggle = document.getElementById('themeToggle');

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  applyTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  /* Footer year */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Mobile menu */
  const menuButton = document.getElementById('menuButton');
  const mobileMenu = document.getElementById('mobileMenu');

  function setMenuOpen(open) {
    if (!mobileMenu || !menuButton) return;
    mobileMenu.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      setMenuOpen(!mobileMenu.classList.contains('open'));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 760) setMenuOpen(false);
    });
  }

  /* Fixed nav: elevation on scroll */
  const siteNav = document.querySelector('.site-nav');
  if (siteNav) {
    const onScroll = () => {
      siteNav.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Smooth scroll */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - navH + 1;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* Scroll reveal */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
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
      revealEls.forEach((el) => observer.observe(el));
    }
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
  }

  /* Active nav on scroll */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');

  if (sections.length && navLinks.length) {
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach((link) => {
              const href = link.getAttribute('href');
              link.classList.toggle('active', href === `#${id}`);
            });
          }
        });
      },
      { threshold: 0.25, rootMargin: `-${navH}px 0px -55% 0px` }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* Contact form */
  const form = document.getElementById('contact-form');
  const status = document.getElementById('formStatus');
  const btn = document.getElementById('submitBtn');

  if (form && status && btn) {
    const errors = {
      name: document.getElementById('err-name'),
      email: document.getElementById('err-email'),
      service: document.getElementById('err-service'),
      message: document.getElementById('err-message')
    };

    function clearErrors() {
      Object.values(errors).forEach((el) => { if (el) el.textContent = ''; });
      status.style.display = 'none';
      status.className = '';
    }

    function setError(key, message) {
      if (errors[key]) errors[key].textContent = message;
    }

    function validate() {
      clearErrors();
      let valid = true;
      const name = document.getElementById('fname').value.trim();
      const email = document.getElementById('femail').value.trim();
      const service = document.getElementById('fservice').value;
      const message = document.getElementById('fmessage').value.trim();

      if (!name) { setError('name', 'Please enter your name.'); valid = false; }
      if (!email) {
        setError('email', 'Please enter your email address.');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('email', 'Please enter a valid email address.');
        valid = false;
      }
      if (!service) { setError('service', 'Please select what you need.'); valid = false; }
      if (message.length < 30) {
        setError('message', 'Please add more context so we can respond properly.');
        valid = false;
      }
      return valid;
    }

    form.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', clearErrors);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate()) return;

      btn.disabled = true;
      btn.textContent = 'Sending…';

      try {
        const response = await fetch('https://formspree.io/f/xzdelned', {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) throw new Error('Form submission failed');

        status.className = 'success';
        status.textContent = 'Thank you. Your enquiry has been received. We will respond within one business day.';
        status.style.display = 'block';
        form.reset();
      } catch {
        status.className = 'error';
        status.innerHTML = 'Something went wrong. Please try again or contact us on <a href="https://wa.me/27715431166" target="_blank" rel="noopener">WhatsApp</a>.';
        status.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Enquiry';
      }
    });
  }
})();
