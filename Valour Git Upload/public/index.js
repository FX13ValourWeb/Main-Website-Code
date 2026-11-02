/* =====================================================
   HOME PAGE JS — MOBILE OPTIMIZED 
   ===================================================== */

/* ---------------------------
   Firebase 
---------------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

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

/* ---------------------------
   DEVICE FLAGS
---------------------------- */
const isMobile = window.matchMedia("(max-width: 768px)").matches;
const isSmallPhone = window.matchMedia("(max-width: 480px)").matches;

/* ---------------------------
   SAFE DOM HELPERS 
---------------------------- */
const $ = (id) => document.getElementById(id);

/* =====================================================
   AUTH UI 
===================================================== */
const signInBtn = $("Sign-in-Button");
const profileBtn = $("Profile-Button");

if (signInBtn && profileBtn) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      signInBtn.style.display = "none";
      profileBtn.style.display = "flex";
    } else {
      signInBtn.style.display = "flex";
      profileBtn.style.display = "none";
    }
  });

  profileBtn.addEventListener("click", () => {
    window.location.href = "Auth/profile.html";
  });
}

/* =====================================================
   MOBILE MENU 
===================================================== */
const toggle = $("mobileToggle");
const menu = $("mobileMenu");
const icon = $("mobileIcon");

if (toggle && menu && icon) {
  let menuOpen = false;

  toggle.addEventListener("click", () => {
    menuOpen = !menuOpen;
    menu.classList.toggle("open", menuOpen);
    toggle.setAttribute("aria-expanded", menuOpen);
    icon.className = menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
  });
}

/* =====================================================
   ACCORDIONS (basically UI)
===================================================== */
function setupAccordion(triggerId, innerId) {
  const t = $(triggerId);
  const i = $(innerId);
  if (!t || !i) return;

  t.addEventListener("click", () => {
    const open = i.classList.toggle("open");
    t.classList.toggle("active", open);
  });
}

setupAccordion("mdTrigger1", "mdInner1");
setupAccordion("mdTrigger2", "mdInner2");

/* =====================================================
   TYPEWRITER 
===================================================== */
const textElement = $("typewriter-text");

if (textElement) {
  const phrases = [
    "creativity meets talent",
    "we are learning robotics in a new way",
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typeSpeed = 100;

  function typeEffect() {
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      textElement.textContent = currentPhrase.substring(0, charIndex - 1);
      charIndex--;
      typeSpeed = 50;
    } else {
      textElement.textContent = currentPhrase.substring(0, charIndex + 1);
      charIndex++;
      typeSpeed = 100;
    }

    if (!isDeleting && charIndex === currentPhrase.length) {
      isDeleting = true;
      typeSpeed = 2000;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typeSpeed = 500;
    }

    setTimeout(typeEffect, typeSpeed);
  }

  document.addEventListener("DOMContentLoaded", typeEffect);
}

/* =====================================================
   PATHFINDERS MODAL 
===================================================== */
const pathFindersCards = $("pathFindersEventCard");
const pathFindersModal = $("pathFinders-modal-conatiner");
const modalBackground = $("modalBackground");
const closeModal = $("closeModal");

if (pathFindersCards && pathFindersModal && modalBackground && closeModal) {
  // Open Modal
  pathFindersCards.addEventListener("click", () => {
    pathFindersModal.style.display = "flex";
    modalBackground.style.display = "flex";
  });

  // Close Modal via Close Button
  closeModal.addEventListener("click", () => {
    pathFindersModal.style.display = "none";
    modalBackground.style.display = "none";
  });

  // Close Modal when clicking the background backdrop
  modalBackground.addEventListener("click", (event) => {
    if (event.target === modalBackground) {
      pathFindersModal.style.display = "none";
      modalBackground.style.display = "none";
    }
  });
}

/* =====================================================
   GALLERY 
===================================================== */
const galleryImages = document.querySelectorAll(".gallery-img");
const nextBtn = document.querySelector(".next-btn");
const prevBtn = document.querySelector(".prev-btn");

let currentImageIndex = 0;

function updateGallery() {
  galleryImages.forEach((img) => img.classList.remove("active"));
  if (galleryImages[currentImageIndex]) {
    galleryImages[currentImageIndex].classList.add("active");
  }
}

if (nextBtn && prevBtn && galleryImages.length) {
  nextBtn.addEventListener("click", () => {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    updateGallery();
  });

  prevBtn.addEventListener("click", () => {
    currentImageIndex =
      (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    updateGallery();
  });
}

/* =====================================================
   SMOOTH SCROLL 
===================================================== */
document.querySelectorAll(".nav-item-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    const targetId = link.getAttribute("href");
    if (!targetId || targetId[0] !== "#") return;

    const targetSection = document.querySelector(targetId);
    if (!targetSection) return;

    e.preventDefault();

    window.scrollTo({
      top: targetSection.offsetTop - 120,
      behavior: "smooth",
    });
  });
});

/* =====================================================
   LENIS (MOBILE ONLY OPTIMIZATION - NO CHANGE ELSE)
===================================================== */
if (typeof Lenis !== "undefined" && !isMobile) {
  const lenis = new Lenis({
    duration: 1.2,
    smooth: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

/* =====================================================
   COUNTDOWN (SAFE ONLY)
===================================================== */
// const countdownElement = $("upcoming-event-countdown");
// const statusElement = $("event-status");

// // PLEASE US 24 HOUR CLOCK FORMAT FOR RELIABILITY ACROSS TIMEZONES
// const targetDate = new Date("June 13, 2026 21:45:00").getTime();

// if (countdownElement && statusElement) {
//   setInterval(() => {
//     const now = Date.now();
//     const distance = targetDate - now;

//     if (distance < 0) {
//       countdownElement.textContent = "EVENT STARTED";
//       statusElement.textContent = "ONGOING";
//       statusElement.style.color = "#3b604b";
//       return;
//     }

//     const days = Math.floor(distance / 86400000);
//     const hours = Math.floor((distance % 86400000) / 3600000);
//     const minutes = Math.floor((distance % 3600000) / 60000);
//     const seconds = Math.floor((distance % 60000) / 1000);

//     countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
//     statusElement.textContent = "TIME LEFT";
//   }, 1000);
// }

/* =====================================================
   EVENT BUTTONS (UNCHANGED)
===================================================== */
document.querySelectorAll(".event-participate-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    window.location.href = "Upcoming-Event.html";
  });
});

/* =====================================================
   PARTICLE SYSTEM (
==================================================== */
// --- Interactive Star Particle Background ---
const canvas = document.getElementById("bg-canvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  let width, height;
  let particles = [];

  // Mouse interaction
  const mouse = { x: null, y: null, radius: 150 };

  window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX; // Changed to clientX for cleaner viewport space tracking
    mouse.y = event.clientY; // Changed to clientY
  });

  window.addEventListener("mouseout", () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Touch interaction support for mobile devices
  window.addEventListener("touchstart", (event) => {
    if (event.touches.length > 0) {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
    }
  });

  window.addEventListener("touchmove", (event) => {
    if (event.touches.length > 0) {
      mouse.x = event.touches[0].clientX;
      mouse.y = event.touches[0].clientY;
    }
  });

  window.addEventListener("touchend", () => {
    mouse.x = null;
    mouse.y = null;
  });

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initParticles();
  }
  window.addEventListener("resize", resize);

  class Particle {
    constructor(x, y, dx, dy, size) {
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.size = size;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = "rgba(232, 232, 232, 0.8)";
      ctx.fill();
    }
    update() {
      if (this.x > width || this.x < 0) this.dx = -this.dx;
      if (this.y > height || this.y < 0) this.dy = -this.dy;

      // Interaction with mouse (repel slightly)
      if (mouse.x != null && mouse.y != null) {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;
          this.x -= forceDirectionX * force * 1.5;
          this.y -= forceDirectionY * force * 1.5;
        }
      }

      this.x += this.dx;
      this.y += this.dy;
      this.draw();
    }
  }

  function initParticles() {
    particles = [];
    let numberOfParticles = (width * height) / 9000;
    for (let i = 0; i < numberOfParticles; i++) {
      let size = Math.random() * 1.5 + 0.5;
      let x = Math.random() * (width - size * 2) + size * 2;
      let y = Math.random() * (height - size * 2) + size * 2;
      let dx = (Math.random() - 0.5) * 0.5;
      let dy = (Math.random() - 0.5) * 0.5;
      particles.push(new Particle(x, y, dx, dy, size));
    }
  }

  function animateParticles() {
    requestAnimationFrame(animateParticles);
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
    }
    connectParticles();
  }

  function connectParticles() {
    let maxDistance = 100;
    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        let dx = particles[a].x - particles[b].x;
        let dy = particles[a].y - particles[b].y;
        let distance = dx * dx + dy * dy;

        if (distance < maxDistance * maxDistance) {
          let opacity = 1 - distance / (maxDistance * maxDistance);
          ctx.strokeStyle = `rgba(232, 232, 232, ${opacity * 0.15})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }

      if (mouse.x != null && mouse.y != null) {
        let dx = particles[a].x - mouse.x;
        let dy = particles[a].y - mouse.y;
        let distance = dx * dx + dy * dy;
        if (distance < mouse.radius * mouse.radius) {
          let opacity = 1 - distance / (mouse.radius * mouse.radius);
          ctx.strokeStyle = `rgba(0, 123, 255, ${opacity * 0.9})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }
  }

  // Run setup smoothly
  resize();
  animateParticles();
}

//EXECUTIVES CAROUSEL (UNCHANGED)

const nodes = document.querySelectorAll(".exec-node");
const btnPrev = document.querySelector(".carousel-prev");
const btnNext = document.querySelector(".carousel-next");

let currentIndex = 0;

function updateCoverflow() {
  nodes.forEach((node, i) => {
    node.classList.remove("active", "prev", "prev-2", "next", "next-2");

    if (i === currentIndex) node.classList.add("active");
    else if (i === (currentIndex - 1 + nodes.length) % nodes.length)
      node.classList.add("prev");
    else if (i === (currentIndex - 2 + nodes.length) % nodes.length)
      node.classList.add("prev-2");
    else if (i === (currentIndex + 1) % nodes.length)
      node.classList.add("next");
    else if (i === (currentIndex + 2) % nodes.length)
      node.classList.add("next-2");
  });
}

if (nodes.length && btnNext && btnPrev) {
  btnNext.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % nodes.length;
    updateCoverflow();
  });

  btnPrev.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + nodes.length) % nodes.length;
    updateCoverflow();
  });

  nodes.forEach((node, index) => {
    node.addEventListener("click", () => {
      currentIndex = index;
      updateCoverflow();
    });
  });

  updateCoverflow();
}

/* =====================================================
   PROJECT MODAL (UNCHANGED)
===================================================== */
const eventModal = document.getElementById("event-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const projectContainer1 = document.getElementById("project-container1");

if (eventModal && closeModalBtn) {
  // Open Modal
  if (projectContainer1) {
    projectContainer1.addEventListener("click", () => {
      eventModal.style.display = "flex";
      setTimeout(() => eventModal.classList.add("active"), 10);
    });
  }

  // Close Modal Helper function
  const closeModal = () => {
    eventModal.classList.remove("active");
    setTimeout(() => {
      eventModal.style.display = "none";
    }, 300); // Matches CSS transition duration
  };

  // Close via Close Button
  closeModalBtn.addEventListener("click", closeModal);

  // Close when clicking the background overlay backdrop
  eventModal.addEventListener("click", (event) => {
    if (event.target === eventModal) {
      closeModal();
    }
  });
}

// SENATE PAGE REDIRECT BUTTON

const SenatePageRedirectBtn = document.getElementById(
  "viewAllExecutivesButton",
);

SenatePageRedirectBtn.addEventListener("click", () => {
  window.location.href = "SenatePage.html";
});

// CURRENT EVENT CONTAINER COLLAPSING AND UPFOLDING CODE

const cecContent = document.getElementById("CECcontent");
const cecToggle = document.getElementById("CECtoggle");

if (cecContent && cecToggle) {
  const VISIBLE_RATIO = 0.4; // show 30% when collapsed
  let expanded = false;

  // Set max-height to the right pixel value for the current state
  function applyHeight() {
    const fullHeight = cecContent.scrollHeight; // the real, full height of the content
    cecContent.style.maxHeight = expanded
      ? fullHeight + "px"
      : Math.round(fullHeight * VISIBLE_RATIO) + "px";
  }

  cecToggle.addEventListener("click", () => {
    expanded = !expanded;

    cecContent.classList.toggle("is-collapsed", !expanded);
    cecToggle.setAttribute("aria-expanded", expanded);
    cecToggle.firstChild.textContent = expanded
      ? "Show less "
      : "See full details ";
    applyHeight();

    // when collapsing, bring the top of the card back into view
    if (!expanded) {
      cecContent.parentElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });

  applyHeight(); // initial state
  window.addEventListener("load", applyHeight); // re-measure once images/fonts load
  window.addEventListener("resize", applyHeight); // text wraps differently on resize
}

// =====================================================
//   EVENTS SECTION INTERSECTION OBSERVER ANIMATION
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  const eventsSection = document.getElementById("events-page-section");

  if (eventsSection) {
    const observerOptions = {
      root: null, // uses the browser viewport
      threshold: 0.15, // Triggers when 15% of the section is visible
    };

    const observer = new IntersectionObserver((entries, observerInstance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Add the animation trigger class
          entry.target.classList.add("animate-in");
          // Stop observing once animated so it doesn't re-trigger on scroll up/down
          observerInstance.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observer.observe(eventsSection);
  }
});
