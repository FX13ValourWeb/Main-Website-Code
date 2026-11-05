/* =====================================================
   FX-13 VALOUR · LEARN — course welcome intro
   Captions drift toward you out of a starfield while the
   colour turns from Valour blue to the course colour.
   Runs only when <html> has .intro-on (set in <head>).
   ===================================================== */
(function () {
  const root = document.documentElement;
  const el = document.getElementById("course-intro");
  if (!el) return;
  if (!root.classList.contains("intro-on")) {
    el.remove();
    return;
  }
  // Everything page-specific comes from data-* attributes on #course-intro
  const num = (v, d) => (v || d).split(",").map(Number);
  try {
    sessionStorage.setItem(el.dataset.seenKey || "fx13-course-intro-seen", "1");
  } catch (e) {}

  const FROM = num(el.dataset.from, "0, 123, 255");
  const TO = num(el.dataset.to, "31, 209, 122");
  const BG_FROM = num(el.dataset.bgFrom, "3, 9, 22");
  const BG_TO = num(el.dataset.bgTo, "3, 16, 10");

  // [text, size, x%, y%] — consecutive captions sit far apart
  let CAPTIONS = [
    ["Loading assets", 1.0, 32, 34],
    ["Unboxing your ESP32", 1.3, 66, 64],
    ["Soldering 38 pins", 0.85, 70, 26],
    ["Starting the 240 MHz clock", 1.15, 34, 70],
    ["Waking up both cores", 0.9, 30, 22],
    ["Warming up the Wi-Fi radio", 1.2, 64, 42],
    ["Flashing the firmware", 0.9, 36, 54],
    ["Almost ready", 1.35, 62, 76],
  ];
  try {
    if (el.dataset.captions) CAPTIONS = JSON.parse(el.dataset.captions);
  } catch (e) {}
  const STEP = 0.78; // seconds between captions
  const LIFE = 2.5; // seconds each caption lives
  const CAPTIONS_END = (CAPTIONS.length - 1) * STEP + LIFE * 0.55;
  const MAX_WAIT = 5; // extra seconds we'll wait for the 3D model

  const words = el.querySelector(".ci-words");
  const finale = el.querySelector(".ci-finale");
  const bar = el.querySelector(".ci-bar i");
  const pct = el.querySelector(".ci-pct");
  const status = el.querySelector(".ci-status");
  const cv = el.querySelector(".ci-stars");
  const g = cv.getContext("2d");

  let ready = !!(window.__courseReady || window.__introReady);
  window.addEventListener(el.dataset.readyEvent || "course:ready", () => (ready = true), { once: true });

  /* ---- starfield flying toward the viewer ---- */
  let W = 0, H = 0, dpr = 1;
  const stars = [];
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener("resize", size);
  const N = W < 700 ? 140 : 260;
  for (let i = 0; i < N; i++) stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() });

  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  const narrow = window.innerWidth < 700;
  /* ---- captions (timed by CSS so a busy main thread can't bunch them up) ---- */
  CAPTIONS.forEach(([text, scale, x, y], i) => {
    const s = document.createElement("span");
    s.className = "ci-word";
    s.textContent = text;
    s.style.setProperty("--s", narrow ? Math.min(scale, 1.05) : scale);
    // narrow screens: keep captions near the middle so they never run off the edge
    s.style.left = (narrow ? 50 + (x - 50) * 0.25 : x) + "%";
    s.style.top = y + "%";
    s.style.animationDuration = LIFE + "s";
    s.style.animationDelay = i * STEP + "s";
    words.appendChild(s);
  });

  /* ---- timeline ---- */
  const t0 = performance.now();
  let phase = "captions"; // captions → waiting → finale → leaving
  let finaleAt = 0;
  let done = false;
  let shown = 0; // displayed progress 0..1
  let lastIdx = -1;

  function frame(now) {
    if (done) return;
    const t = (now - t0) / 1000;

    const idx = Math.min(CAPTIONS.length - 1, Math.floor(t / STEP));
    if (phase === "captions" && idx !== lastIdx) {
      lastIdx = idx;
      status.textContent = CAPTIONS[idx][0] + "…";
    }

    if (phase === "captions" && t >= CAPTIONS_END) phase = "waiting";
    if (phase === "waiting" && (ready || t >= CAPTIONS_END + MAX_WAIT)) {
      phase = "finale";
      finaleAt = t;
      status.textContent = "Ready";
      el.classList.add("is-finale");
    }
    if (phase === "finale" && t - finaleAt >= 2.3) leave();

    // colour: blue → course colour across the captions
    const u = smooth(Math.min(1, t / (CAPTIONS_END + 0.4)));
    const c = mix(FROM, TO, u);
    const bg = mix(BG_FROM, BG_TO, u);
    el.style.setProperty("--ci-rgb", c.join(", "));
    el.style.backgroundColor = `rgb(${bg.join(",")})`;

    // progress: time-based, held at 92% until the 3D model is ready
    const target = phase === "finale" ? 1 : Math.min(ready ? 1 : 0.92, t / CAPTIONS_END);
    shown += (target - shown) * 0.08;
    bar.style.transform = `scaleX(${shown.toFixed(4)})`;
    pct.textContent = Math.round(shown * 100) + "%";

    // stars
    g.clearRect(0, 0, W, H);
    const speed = phase === "finale" ? 0.0042 : 0.0022;
    const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5;
    for (const st of stars) {
      st.z -= speed;
      if (st.z <= 0.02) {
        st.x = Math.random() * 2 - 1;
        st.y = Math.random() * 2 - 1;
        st.z = 1;
      }
      const px = cx + (st.x / st.z) * f * 0.5;
      const py = cy + (st.y / st.z) * f * 0.5;
      if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
      const k = 1 - st.z;
      g.fillStyle = `rgba(${k > 0.6 ? c.join(",") : "235,240,245"}, ${(k * 0.85).toFixed(3)})`;
      const r = 0.4 + k * 1.5;
      g.fillRect(px - r / 2, py - r / 2, r, r);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function leave() {
    if (phase === "leaving") return;
    phase = "leaving";
    el.classList.add("is-leaving");
    root.classList.remove("intro-on");
    window.scrollTo(0, 0);
    setTimeout(() => {
      done = true;
      el.remove();
      window.removeEventListener("resize", size);
    }, 1200);
  }

  window.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape" || e.key === "Enter") {
      window.removeEventListener("keydown", onKey);
      leave();
    }
  });
})();
