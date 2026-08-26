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

  /* Mobile menu */
  var menuButton = document.getElementById('menuButton');
  var mobileMenu = document.getElementById('mobileMenu');

  function setMenuOpen(open) {
    if (!mobileMenu || !menuButton) return;
    if (open) {
      mobileMenu.hidden = false;
      document.body.classList.add('menu-open');
    } else {
      mobileMenu.hidden = true;
      document.body.classList.remove('menu-open');
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
      if (window.innerWidth > 760) setMenuOpen(false);
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
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 64;
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

  /* Hero slideshow — Hona Marketplace first; pause on hover/focus/reduced-motion */
  var slides = document.querySelectorAll('.hero-slide');
  var dots = document.querySelectorAll('#heroDots button');
  var urlEl = document.getElementById('heroUrl');
  var heroShowcase = document.getElementById('heroShowcase');
  var heroDots = document.getElementById('heroDots');
  var slideIndex = 0;
  var slideTimer;
  var heroPaused = false;

  function goToSlide(index) {
    if (!slides.length) return;
    slideIndex = (index + slides.length) % slides.length;
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === slideIndex);
    });
    dots.forEach(function (dot, i) {
      var active = i === slideIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
      dot.setAttribute('tabindex', active ? '0' : '-1');
    });
    if (urlEl && slides[slideIndex]) {
      urlEl.textContent = slides[slideIndex].getAttribute('data-url') || '';
    }
  }

  function stopSlideshow() {
    if (slideTimer) {
      window.clearInterval(slideTimer);
      slideTimer = null;
    }
  }

  function startSlideshow() {
    if (prefersReducedMotion || heroPaused || slides.length < 2) return;
    stopSlideshow();
    slideTimer = window.setInterval(function () {
      goToSlide(slideIndex + 1);
    }, 5500);
  }

  function pauseHero() {
    heroPaused = true;
    stopSlideshow();
  }

  function resumeHero() {
    heroPaused = false;
    startSlideshow();
  }

  if (slides.length) {
    goToSlide(0);
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        goToSlide(i);
        startSlideshow();
      });
      dot.addEventListener('keydown', function (event) {
        var next = slideIndex;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = slideIndex + 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = slideIndex - 1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = slides.length - 1;
        else return;
        event.preventDefault();
        goToSlide(next);
        dots[slideIndex].focus();
        startSlideshow();
      });
    });

    if (heroShowcase) {
      heroShowcase.addEventListener('mouseenter', pauseHero);
      heroShowcase.addEventListener('mouseleave', resumeHero);
      heroShowcase.addEventListener('focusin', pauseHero);
      heroShowcase.addEventListener('focusout', function (event) {
        if (!heroShowcase.contains(event.relatedTarget)) resumeHero();
      });
    }
    if (heroDots) {
      heroDots.addEventListener('mouseenter', pauseHero);
      heroDots.addEventListener('mouseleave', resumeHero);
      heroDots.addEventListener('focusin', pauseHero);
      heroDots.addEventListener('focusout', function (event) {
        if (!heroDots.contains(event.relatedTarget)) resumeHero();
      });
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopSlideshow();
      else startSlideshow();
    });

    startSlideshow();
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
        status.innerHTML = 'Something went wrong sending your enquiry. Please try again, email <a href="mailto:hello@ddm-software-solutions.co.za">hello@ddm-software-solutions.co.za</a>, or contact DDM on <a href="https://wa.me/27715431166" target="_blank" rel="noopener noreferrer">WhatsApp</a>.';
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
