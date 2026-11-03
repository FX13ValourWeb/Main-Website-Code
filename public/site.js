/* =====================================================
   SHARED SITE BEHAVIOUR (all public pages)
   - Scroll-reveal animations   ([data-reveal], [data-reveal-stagger])
   - Navbar "scrolled" state + nav height CSS variable
   - Mobile menu: open/close, close on link tap / Escape / outside tap,
     page scroll lock while open
   - Mobile accordions
===================================================== */
(function () {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ---------------------------------------------
     SCROLL REVEAL
  --------------------------------------------- */
  function initReveal() {
    // Give children of a stagger group an increasing delay
    document.querySelectorAll("[data-reveal-stagger]").forEach((group) => {
      const step = parseFloat(group.dataset.revealStagger) || 0.08;
      let i = 0;
      Array.from(group.children).forEach((child) => {
        if (!child.hasAttribute("data-reveal")) return;
        if (!child.style.getPropertyValue("--reveal-delay")) {
          child.style.setProperty("--reveal-delay", (i * step).toFixed(2) + "s");
        }
        i++;
      });
    });

    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    // Once revealed, drop the reveal styles so the element's own hover
    // transitions are not slowed down by the reveal transition/delay.
    function settle(el) {
      el.removeAttribute("data-reveal");
      el.classList.remove("is-revealed");
      el.style.removeProperty("--reveal-delay");
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(settle);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          io.unobserve(el);
          el.classList.add("is-revealed");

          // Clean up once the (longest) reveal transition has finished
          const cs = getComputedStyle(el);
          const delay = parseFloat(cs.getPropertyValue("--reveal-delay")) || 0;
          const duration = Math.max.apply(
            null,
            cs.transitionDuration.split(",").map((t) => parseFloat(t) || 0),
          );
          setTimeout(() => settle(el), (delay + duration) * 1000 + 150);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    items.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------
     NAVBAR
  --------------------------------------------- */
  function initNav() {
    const nav = document.querySelector(".main-navigation-bar");
    if (!nav) return;

    // Keep anchor jumps clear of the sticky navbar
    function setNavHeight() {
      root.style.setProperty("--nav-h", nav.offsetHeight + "px");
    }
    setNavHeight();
    window.addEventListener("resize", setNavHeight, { passive: true });

    // Subtle "lifted" state once the page has scrolled
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        nav.classList.toggle("is-scrolled", window.scrollY > 12);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* Mobile menu */
    const toggle = document.getElementById("mobileToggle");
    const menu = document.getElementById("mobileMenu");
    const icon = document.getElementById("mobileIcon");
    if (!toggle || !menu) return;

    let open = false;
    function setOpen(next) {
      open = next;
      menu.classList.toggle("open", open);
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
      if (icon) icon.className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
    }

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!open);
    });

    // Close after choosing a link
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setOpen(false)),
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", (e) => {
      if (open && !menu.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });

    // If the window grows past the hamburger breakpoint, reset
    const desktop = window.matchMedia("(min-width: 861px)");
    const onBp = () => desktop.matches && open && setOpen(false);
    if (desktop.addEventListener) desktop.addEventListener("change", onBp);

    /* Mobile accordions */
    menu.querySelectorAll(".mobile-dropdown-trigger").forEach((trigger) => {
      const inner = trigger.nextElementSibling;
      if (!inner) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", () => {
        const isOpen = inner.classList.toggle("open");
        trigger.classList.toggle("active", isOpen);
        trigger.setAttribute("aria-expanded", String(isOpen));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initNav();
      initReveal();
    });
  } else {
    initNav();
    initReveal();
  }
})();
