(function () {
  "use strict";

  /* Header scroll state */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Keep active nav chip in view */
  const nav = document.querySelector(".site-nav");
  if (nav) {
    const active = nav.querySelector("[aria-current='page'], .is-active");
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }
})();
