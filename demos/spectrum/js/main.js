(function () {
  "use strict";

  /* Mobile navigation */
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (navToggle && siteNav) {
    function setNavOpen(isOpen) {
      navToggle.setAttribute("aria-expanded", String(isOpen));
      siteNav.classList.toggle("is-open", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    }

    navToggle.addEventListener("click", function () {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setNavOpen(!isOpen);
    });

    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setNavOpen(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    window.matchMedia("(min-width: 768px)").addEventListener("change", function (event) {
      if (event.matches) setNavOpen(false);
    });
  }

  /* Gallery expand / collapse */
  const galleryWrapper = document.getElementById("gallery-wrapper");
  const galleryStack = document.getElementById("gallery-stack");
  const galleryPanel = document.getElementById("gallery-panel");
  const galleryCollapse = document.getElementById("gallery-collapse");

  if (galleryWrapper && galleryStack && galleryPanel && galleryCollapse) {
    function expandGallery() {
      galleryWrapper.classList.add("is-expanded");
      galleryStack.setAttribute("aria-expanded", "true");
      galleryPanel.hidden = false;
      galleryPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function collapseGallery() {
      galleryWrapper.classList.remove("is-expanded");
      galleryStack.setAttribute("aria-expanded", "false");
      galleryPanel.hidden = true;
      galleryStack.focus();
    }

    galleryStack.addEventListener("click", expandGallery);

    galleryCollapse.addEventListener("click", collapseGallery);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && galleryWrapper.classList.contains("is-expanded")) {
        collapseGallery();
      }
    });
  }
})();
