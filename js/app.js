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

  /* Reveal */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
      );
      revealEls.forEach(function (el) { observer.observe(el); });
    }
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* Hero slideshow */
  var slides = document.querySelectorAll('.hero-slide');
  var dots = document.querySelectorAll('#heroDots button');
  var urlEl = document.getElementById('heroUrl');
  var slideIndex = 0;
  var slideTimer;

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
    });
    if (urlEl && slides[slideIndex]) {
      urlEl.textContent = slides[slideIndex].getAttribute('data-url') || '';
    }
  }

  function startSlideshow() {
    if (prefersReducedMotion || slides.length < 2) return;
    stopSlideshow();
    slideTimer = window.setInterval(function () {
      goToSlide(slideIndex + 1);
    }, 4500);
  }

  function stopSlideshow() {
    if (slideTimer) window.clearInterval(slideTimer);
  }

  if (slides.length) {
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        goToSlide(i);
        startSlideshow();
      });
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

  /* Contact form */
  var form = document.getElementById('contact-form');
  var status = document.getElementById('formStatus');
  var btn = document.getElementById('submitBtn');

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
      status.style.display = 'none';
      status.className = '';
    }

    function setError(key, message) {
      if (errors[key]) errors[key].textContent = message;
    }

    function validate() {
      clearErrors();
      var valid = true;
      var name = document.getElementById('fname').value.trim();
      var email = document.getElementById('femail').value.trim();
      var service = document.getElementById('fservice').value;
      var message = document.getElementById('fmessage').value.trim();

      if (!name) { setError('name', 'Please enter your name.'); valid = false; }
      if (!email) {
        setError('email', 'Please enter your email address.');
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('email', 'Please enter a valid email address.');
        valid = false;
      }
      if (!service) { setError('service', 'Please select what you need.'); valid = false; }
      if (message.length < 20) {
        setError('message', 'Please add a bit more detail so we can respond properly.');
        valid = false;
      }
      return valid;
    }

    form.querySelectorAll('input, select, textarea').forEach(function (field) {
      field.addEventListener('input', clearErrors);
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!validate()) return;

      btn.disabled = true;
      btn.textContent = 'Sending…';

      try {
        var response = await fetch('https://formspree.io/f/xzdelned', {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) throw new Error('Form submission failed');

        status.className = 'success';
        status.textContent = 'Thank you. Your enquiry has been received. We will respond within one business day.';
        status.style.display = 'block';
        form.reset();
      } catch (err) {
        status.className = 'error';
        status.innerHTML = 'Something went wrong. Please try again or contact us on <a href="https://wa.me/27715431166" target="_blank" rel="noopener noreferrer">WhatsApp</a>.';
        status.style.display = 'block';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Enquiry';
      }
    });
  }
})();
