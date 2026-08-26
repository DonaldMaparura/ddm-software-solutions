(function () {
  'use strict';

  var THEME_KEY = 'ddm-theme';
  var themeToggle = document.getElementById('themeToggle');

  function getPreferredTheme() {
    var stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }

  applyTheme(getPreferredTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(THEME_KEY)) applyTheme(e.matches ? 'dark' : 'light');
  });

  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Mobile menu — Escape, focus trap, body scroll lock */
  var menuButton = document.getElementById('menuButton');
  var mobileMenu = document.getElementById('mobileMenu');
  var lastFocusBeforeMenu = null;

  function getMenuFocusables() {
    if (!mobileMenu) return [];
    return Array.prototype.slice.call(
      mobileMenu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) {
      return !el.hasAttribute('hidden') && el.offsetParent !== null;
    });
  }

  function setMenuOpen(open) {
    if (!mobileMenu || !menuButton) return;
    if (open) {
      lastFocusBeforeMenu = document.activeElement;
      mobileMenu.hidden = false;
      document.body.classList.add('menu-open');
      var focusables = getMenuFocusables();
      if (focusables.length) focusables[0].focus();
    } else {
      mobileMenu.hidden = true;
      document.body.classList.remove('menu-open');
      if (lastFocusBeforeMenu && typeof lastFocusBeforeMenu.focus === 'function') {
        lastFocusBeforeMenu.focus();
      } else {
        menuButton.focus();
      }
    }
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', function () {
      setMenuOpen(mobileMenu.hidden);
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenuOpen(false); });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setMenuOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (mobileMenu.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      var focusables = getMenuFocusables();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* Nav elevation */
  var siteNav = document.querySelector('.site-nav');
  if (siteNav) {
    var onScroll = function () {
      siteNav.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Active nav by current page */
  var path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (!path || path === '') path = 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function (link) {
    var href = (link.getAttribute('href') || '').toLowerCase();
    var isActive = href === path || (path === 'index.html' && (href === './' || href === '/'));
    link.classList.toggle('active', isActive);
  });

  /* Same-page smooth scroll only */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 72;
      var top = target.getBoundingClientRect().top + window.scrollY - navH + 1;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* Optional entrance motion — content stays visible without JS */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motionEls = document.querySelectorAll('[data-motion]');
  if (motionEls.length && !prefersReducedMotion) {
    document.documentElement.classList.add('js-motion');
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-shown');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    motionEls.forEach(function (el) { observer.observe(el); });
  } else {
    motionEls.forEach(function (el) { el.classList.add('is-shown'); });
  }

  /* Prefill contact form from query string */
  var params = new URLSearchParams(window.location.search);
  var serviceField = document.getElementById('fservice');
  var messageField = document.getElementById('fmessage');
  if (serviceField && params.get('service')) {
    serviceField.value = params.get('service');
  }
  if (messageField && params.get('message')) {
    messageField.value = params.get('message');
  }

  /* Contact form — Formspree https://formspree.io/f/xzdelned */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('formStatus');
  var btn = document.getElementById('submitBtn');
  var FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzdelned';
  var isSubmitting = false;

  if (form && status && btn) {
    var errors = {
      name: document.getElementById('err-name'),
      email: document.getElementById('err-email'),
      service: document.getElementById('err-service'),
      message: document.getElementById('err-message')
    };

    function clearErrors() {
      Object.keys(errors).forEach(function (key) {
        if (errors[key]) errors[key].textContent = '';
      });
      var fields = form.querySelectorAll('[aria-invalid]');
      fields.forEach(function (field) { field.removeAttribute('aria-invalid'); });
    }

    function setError(key, message) {
      if (errors[key]) errors[key].textContent = message;
      var fieldMap = {
        name: 'fname',
        email: 'femail',
        service: 'fservice',
        message: 'fmessage'
      };
      var field = document.getElementById(fieldMap[key]);
      if (field) field.setAttribute('aria-invalid', 'true');
    }

    function validate() {
      clearErrors();
      status.style.display = 'none';
      status.className = '';
      status.textContent = '';
      var valid = true;
      var name = document.getElementById('fname').value.trim();
      var email = document.getElementById('femail').value.trim();
      var service = document.getElementById('fservice').value;
      var message = document.getElementById('fmessage').value.trim();
      var honeypot = document.getElementById('fcompany_url');

      if (honeypot && honeypot.value) {
        return false;
      }

      if (!name) { setError('name', 'Please enter your name.'); valid = false; }
      if (!email) {
        setError('email', 'Please enter your work email address.');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('email', 'Please enter a valid email address.');
        valid = false;
      }
      if (!service) { setError('service', 'Please select a project type.'); valid = false; }
      if (message.length < 20) {
        setError('message', 'Please add a bit more detail so we can respond properly.');
        valid = false;
      }
      return valid;
    }

    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', function () {
        if (status.className === 'error') return;
        clearErrors();
      });
      field.addEventListener('change', function () {
        if (status.className === 'error') return;
        clearErrors();
      });
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (isSubmitting) return;
      if (!validate()) {
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      isSubmitting = true;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = 'Sending enquiry…';
      status.style.display = 'none';
      status.className = '';

      try {
        var response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        var payload = null;
        try {
          payload = await response.json();
        } catch (parseErr) {
          payload = null;
        }

        if (!response.ok) {
          throw new Error((payload && payload.error) || 'Form submission failed');
        }

        status.className = 'success';
        status.textContent = 'Thank you. Your enquiry has been received. We will respond within one business day.';
        status.style.display = 'block';
        form.reset();
        clearErrors();
      } catch (err) {
        status.className = 'error';
        status.innerHTML = 'Something went wrong sending your enquiry. Please try again, email <a href="mailto:hello@ddm-software-solutions.co.za">hello@ddm-software-solutions.co.za</a>, or contact DDM on <a href="https://wa.me/27638885279" target="_blank" rel="noopener noreferrer">WhatsApp</a>.';
        status.style.display = 'block';
      } finally {
        isSubmitting = false;
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        btn.textContent = 'Send Enquiry';
      }
    });
  }
})();
