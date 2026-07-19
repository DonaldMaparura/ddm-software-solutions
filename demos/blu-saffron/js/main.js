/* ============================================================
   Blu Saffron — shared UI behaviour
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close the menu when a link is tapped
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Current year in footer ---------- */
  var yearEls = document.querySelectorAll("[data-year]");
  yearEls.forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Hero background slideshow ---------- */
  document.querySelectorAll("[data-hero-slideshow]").forEach(function (bg) {
    var imgs = Array.prototype.slice.call(bg.querySelectorAll("img"));
    if (imgs.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var i = 0;
    imgs[0].classList.add("is-active");
    window.setInterval(function () {
      imgs[i].classList.remove("is-active");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("is-active");
    }, 4500);
  });

  /* ---------- Carousel ---------- */
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".carousel__track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".carousel__slide"));
    var dotsWrap = root.querySelector(".carousel__dots");
    if (!track || slides.length === 0) return;

    var index = 0;
    var timer = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var dots = slides.map(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Go to slide " + (i + 1));
      b.addEventListener("click", function () { go(i); restart(); });
      if (dotsWrap) dotsWrap.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (d, di) {
        d.setAttribute("aria-current", di === index ? "true" : "false");
      });
    }
    function next() { go(index + 1); }
    function prev() { go(index - 1); }
    function start() { if (!reduce) timer = window.setInterval(next, 5000); }
    function stop() { window.clearInterval(timer); }
    function restart() { stop(); start(); }

    var prevBtn = root.querySelector(".carousel__btn--prev");
    var nextBtn = root.querySelector(".carousel__btn--next");
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    // Basic touch swipe
    var x0 = null;
    root.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); restart(); }
      x0 = null;
    });

    go(0);
    start();
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
