/* =====================================================
   HOME PAGE JS
   (Navbar / mobile menu / scroll reveal live in site.js,
    the star background lives in particles.js)
   ===================================================== */

/* ---------------------------
   Firebase
---------------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getAnalytics,
  isSupported as analyticsSupported,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0fYgeJM4CDQCgFCv9jK1lObbtSQ8VyqA",
  authDomain: "fx-13-valour-robotics-club-web.firebaseapp.com",
  projectId: "fx-13-valour-robotics-club-web",
  storageBucket: "fx-13-valour-robotics-club-web.firebasestorage.app",
  messagingSenderId: "720455152690",
  appId: "1:720455152690:web:d19e18da770a2eb970782b",
  measurementId: "G-GCS4EENQ9R",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

analyticsSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {});

/* ---------------------------
   HELPERS
---------------------------- */
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
  .matches;

/* =====================================================
   AUTH UI (desktop + mobile buttons)
===================================================== */
const signInBtns = ["Sign-in-Button", "Sign-in-Button-Mobile"]
  .map($)
  .filter(Boolean);
const profileBtns = ["Profile-Button", "Profile-Button-Mobile"]
  .map($)
  .filter(Boolean);

if (signInBtns.length || profileBtns.length) {
  onAuthStateChanged(auth, (user) => {
    signInBtns.forEach((b) => (b.style.display = user ? "none" : "flex"));
    profileBtns.forEach((b) => (b.style.display = user ? "flex" : "none"));
  });

  profileBtns.forEach((b) =>
    b.addEventListener("click", () => {
      window.location.href = "Auth/profile.html";
    }),
  );
}

const contactBtn = $("Contact-Button");
if (contactBtn) {
  contactBtn.addEventListener("click", () => {
    window.location.href = "/contactus.html";
  });
}

/* =====================================================
   TYPEWRITER
   Slightly varied key timing feels like real typing;
   the cursor stays solid while typing and blinks when idle.
===================================================== */
const textElement = $("typewriter-text");
const cursorEl = document.querySelector("#home-page-text1 .cursor");

if (textElement) {
  const phrases = [
    "creativity meets talent",
    "we are learning robotics in a new way",
  ];

  if (reduceMotion) {
    textElement.textContent = phrases[0];
  } else {
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeEffect = () => {
      const currentPhrase = phrases[phraseIndex];
      let delay;

      if (isDeleting) {
        charIndex--;
        delay = 28 + Math.random() * 22;
      } else {
        charIndex++;
        delay = 55 + Math.random() * 70;
      }
      textElement.textContent = currentPhrase.substring(0, charIndex);
      if (cursorEl) cursorEl.classList.add("is-typing");

      if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        delay = 2200;
        if (cursorEl) cursorEl.classList.remove("is-typing");
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        delay = 450;
        if (cursorEl) cursorEl.classList.remove("is-typing");
      }

      setTimeout(typeEffect, delay);
    };

    // Start once the hero entrance animation has played
    setTimeout(typeEffect, 900);
  }
}

/* =====================================================
   MODAL HELPER
   Animated open/close, Escape to close, backdrop click,
   page scroll lock, focus moved in and restored on close.
===================================================== */
let openModals = 0;
function lockScroll(lock) {
  openModals += lock ? 1 : -1;
  const shouldLock = openModals > 0;
  const sbw = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = shouldLock && sbw > 0 ? sbw + "px" : "";
  document.body.classList.toggle("modal-open", shouldLock);
}

function createModal({ panel, backdrop, closeBtn, duration = 380 }) {
  let isOpen = false;
  let lastFocus = null;
  let hideTimer = 0;
  const parts = [panel, backdrop].filter(Boolean);

  function open() {
    if (isOpen) return;
    isOpen = true;
    clearTimeout(hideTimer);
    lastFocus = document.activeElement;
    parts.forEach((el) => {
      el.classList.remove("is-closing");
      el.style.display = "flex";
    });
    // next frame → let the browser paint the start state, then animate
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        parts.forEach((el) => el.classList.add("is-open")),
      ),
    );
    lockScroll(true);
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    parts.forEach((el) => {
      el.classList.remove("is-open");
      el.classList.add("is-closing");
    });
    hideTimer = setTimeout(
      () => {
        parts.forEach((el) => {
          el.style.display = "none";
          el.classList.remove("is-closing");
        });
      },
      reduceMotion ? 0 : duration,
    );
    lockScroll(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
  };
}

// Open on click or Enter/Space (cards are role="button")
function onActivate(el, fn) {
  if (!el) return;
  el.addEventListener("click", (e) => {
    // Let real buttons/links inside the card do their own thing
    if (e.target.closest("button, a") && e.target.closest("button, a") !== el)
      return;
    fn();
  });
  el.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target === el) {
      e.preventDefault();
      fn();
    }
  });
}

/* =====================================================
   PATHFINDERS MODAL + GALLERY
===================================================== */
const pathFindersCard = $("pathFindersEventCard");
const pathFindersPanel = $("pathFinders-modal-conatiner");
const modalBackground = $("modalBackground");
const closeModalBtn = $("closeModal");

let pathFindersModal = null;
if (pathFindersCard && pathFindersPanel && modalBackground) {
  pathFindersModal = createModal({
    panel: pathFindersPanel,
    backdrop: modalBackground,
    closeBtn: closeModalBtn,
  });
  onActivate(pathFindersCard, pathFindersModal.open);
  modalBackground.addEventListener("click", pathFindersModal.close);
}

const galleryImages = Array.from(document.querySelectorAll(".gallery-img"));
const galleryViewport = $("pathFinders-gallery-viewport");
const dotsWrap = document.querySelector(".gallery-dots");
const nextBtn = document.querySelector(".next-btn");
const prevBtn = document.querySelector(".prev-btn");
let currentImageIndex = 0;

if (galleryImages.length && nextBtn && prevBtn) {
  const dots = galleryImages.map((_, i) => {
    if (!dotsWrap) return null;
    const d = document.createElement("span");
    d.className = "gallery-dot" + (i === 0 ? " active" : "");
    dotsWrap.appendChild(d);
    return d;
  });

  function showImage(index, dir) {
    const prev = galleryImages[currentImageIndex];
    currentImageIndex = (index + galleryImages.length) % galleryImages.length;
    const next = galleryImages[currentImageIndex];
    if (prev === next) return;

    // Direction-aware slide + crossfade
    galleryImages.forEach((img) =>
      img.classList.remove("from-left", "from-right", "leaving-left", "leaving-right"),
    );
    prev.classList.remove("active");
    prev.classList.add(dir > 0 ? "leaving-left" : "leaving-right");
    next.classList.add(dir > 0 ? "from-right" : "from-left");
    // force a reflow so the "from" position is applied before animating
    void next.offsetWidth;
    next.classList.add("active");
    next.classList.remove("from-left", "from-right");

    dots.forEach((d, i) => d && d.classList.toggle("active", i === currentImageIndex));
  }

  nextBtn.addEventListener("click", () => showImage(currentImageIndex + 1, 1));
  prevBtn.addEventListener("click", () => showImage(currentImageIndex - 1, -1));

  document.addEventListener("keydown", (e) => {
    if (!pathFindersModal || !pathFindersModal.isOpen) return;
    if (e.key === "ArrowRight") showImage(currentImageIndex + 1, 1);
    if (e.key === "ArrowLeft") showImage(currentImageIndex - 1, -1);
  });

  // Swipe on touch screens
  if (galleryViewport) {
    let startX = 0;
    let startY = 0;
    galleryViewport.addEventListener(
      "touchstart",
      (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true },
    );
    galleryViewport.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          showImage(currentImageIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
        }
      },
      { passive: true },
    );
  }
}

/* =====================================================
   PROJECT MODAL (AeroSense)
===================================================== */
const eventModal = $("event-modal");
const projectContainer1 = $("project-container1");

if (eventModal) {
  const projectModal = createModal({
    panel: eventModal,
    closeBtn: $("close-modal-btn"),
    duration: 350,
  });
  onActivate(projectContainer1, projectModal.open);
  eventModal.addEventListener("click", (e) => {
    if (e.target === eventModal) projectModal.close();
  });
}

/* =====================================================
   EVENT BUTTONS
===================================================== */
document.querySelectorAll(".event-participate-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    window.location.href = "Upcoming-Event.html";
  });
});

/* =====================================================
   EXECUTIVES 3D CAROUSEL
   Buttons, click on side cards, arrow keys, swipe, and a gentle
   autoplay that pauses on hover/focus/touch and when off-screen.
===================================================== */
const carouselWrap = $("executives-carousel-wrapper");
const nodes = document.querySelectorAll(".exec-node");
const btnPrev = document.querySelector(".carousel-prev");
const btnNext = document.querySelector(".carousel-next");
let currentIndex = 0;
let restartCarousel = () => {};

function updateCoverflow() {
  const n = nodes.length;
  nodes.forEach((node, i) => {
    node.classList.remove("active", "prev", "prev-2", "next", "next-2");
    const offset = (i - currentIndex + n) % n;
    if (offset === 0) node.classList.add("active");
    else if (offset === n - 1) node.classList.add("prev");
    else if (offset === n - 2) node.classList.add("prev-2");
    else if (offset === 1) node.classList.add("next");
    else if (offset === 2) node.classList.add("next-2");
    node.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
  });
  carouselDots.forEach((d, i) => {
    d.classList.toggle("active", i === currentIndex);
    d.setAttribute("aria-current", i === currentIndex ? "true" : "false");
  });
}

// Position dots under the carousel (also clickable)
const carouselDots = [];
if (carouselWrap && nodes.length) {
  const dotsWrap = document.createElement("div");
  dotsWrap.className = "carousel-dots";
  nodes.forEach((node, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "carousel-dot";
    const name = node.querySelector(".exec-name");
    dot.setAttribute("aria-label", "Show " + (name ? name.textContent : "executive " + (i + 1)));
    dot.addEventListener("click", () => {
      currentIndex = i;
      updateCoverflow();
      restartCarousel();
    });
    dotsWrap.appendChild(dot);
    carouselDots.push(dot);
  });
  carouselWrap.insertAdjacentElement("afterend", dotsWrap);
}

if (nodes.length && btnNext && btnPrev) {
  const go = (delta) => {
    currentIndex = (currentIndex + delta + nodes.length) % nodes.length;
    updateCoverflow();
  };

  btnNext.addEventListener("click", () => {
    go(1);
    restartAutoplay();
  });
  btnPrev.addEventListener("click", () => {
    go(-1);
    restartAutoplay();
  });

  nodes.forEach((node, index) => {
    node.addEventListener("click", () => {
      if (index === currentIndex) return;
      currentIndex = index;
      updateCoverflow();
      restartAutoplay();
    });
  });

  if (carouselWrap) {
    carouselWrap.setAttribute("tabindex", "0");
    carouselWrap.setAttribute("aria-roledescription", "carousel");
    carouselWrap.setAttribute("aria-label", "Moderators and executives");
    carouselWrap.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        go(1);
        restartAutoplay();
      } else if (e.key === "ArrowLeft") {
        go(-1);
        restartAutoplay();
      }
    });

    // Swipe
    let sx = 0;
    let sy = 0;
    carouselWrap.addEventListener(
      "touchstart",
      (e) => {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
        paused.touch = true;
      },
      { passive: true },
    );
    carouselWrap.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          go(dx < 0 ? 1 : -1);
        }
        restartAutoplay();
        setTimeout(() => (paused.touch = false), 4000);
      },
      { passive: true },
    );
  }

  /* Autoplay */
  const AUTOPLAY_MS = 4500;
  const paused = { hover: false, focus: false, touch: false, offscreen: true };
  let timer = 0;

  function tick() {
    if (!Object.values(paused).some(Boolean) && !document.hidden) go(1);
  }
  function restartAutoplay() {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(tick, AUTOPLAY_MS);
  }

  if (carouselWrap) {
    carouselWrap.addEventListener("mouseenter", () => (paused.hover = true));
    carouselWrap.addEventListener("mouseleave", () => (paused.hover = false));
    carouselWrap.addEventListener("focusin", () => (paused.focus = true));
    carouselWrap.addEventListener("focusout", () => (paused.focus = false));
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => (paused.offscreen = !entry.isIntersecting),
        { threshold: 0.35 },
      ).observe(carouselWrap);
    } else {
      paused.offscreen = false;
    }
  }

  restartCarousel = restartAutoplay;
  updateCoverflow();
  restartAutoplay();
}

/* SENATE PAGE REDIRECT BUTTON */
const senateBtn = $("viewAllExecutivesButton");
if (senateBtn) {
  senateBtn.addEventListener("click", () => {
    window.location.href = "SenatePage.html";
  });
}

/* =====================================================
   LATEST EVENT CARD — collapse / expand
===================================================== */
const cecContent = $("CECcontent");
const cecToggle = $("CECtoggle");

if (cecContent && cecToggle) {
  const VISIBLE_RATIO = 0.4; // share of the content shown when collapsed
  const MAX_COLLAPSED = 420; // ...but never taller than this (long on phones)
  let expanded = false;

  function collapsedHeight(full) {
    return Math.min(Math.round(full * VISIBLE_RATIO), MAX_COLLAPSED);
  }

  function applyHeight() {
    const full = cecContent.scrollHeight;
    cecContent.style.maxHeight =
      (expanded ? full : collapsedHeight(full)) + "px";
  }

  cecToggle.addEventListener("click", () => {
    expanded = !expanded;

    cecContent.classList.toggle("is-collapsed", !expanded);
    cecToggle.setAttribute("aria-expanded", String(expanded));
    cecToggle.firstChild.textContent = expanded
      ? "Show less "
      : "See full details ";
    applyHeight();

    // When collapsing, bring the card back into view (only if needed)
    if (!expanded) {
      const card = cecContent.parentElement;
      if (card.getBoundingClientRect().top < 0) {
        card.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    }
  });

  applyHeight();
  window.addEventListener("load", applyHeight);
  let rt = 0;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(rt);
      rt = setTimeout(applyHeight, 100);
    },
    { passive: true },
  );
}

/* =====================================================
   SUBTLE POINTER EFFECTS (mouse/trackpad only)
   - Cursor-following glow on cards
   - Gentle 3D tilt on the hero logo
   Everything is rAF-throttled and only writes CSS variables.
===================================================== */
if (finePointer && !reduceMotion) {
  // Spotlight glow
  document
    .querySelectorAll(".event-container, .project-container, #currentEventContainer")
    .forEach((card) => {
      card.classList.add("has-spotlight");
      let raf = 0;
      card.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = card.getBoundingClientRect();
          card.style.setProperty("--mx", e.clientX - r.left + "px");
          card.style.setProperty("--my", e.clientY - r.top + "px");
        });
      });
    });

  // Hero logo tilt
  const heroCard = $("home-page-image");
  const heroImg = heroCard && heroCard.querySelector("img");
  if (heroCard && heroImg) {
    let raf = 0;
    heroCard.addEventListener("pointermove", (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = heroCard.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        heroImg.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) scale(1.03)`;
      });
    });
    heroCard.addEventListener("pointerleave", () => {
      heroImg.style.transform = "";
    });
  }
}
