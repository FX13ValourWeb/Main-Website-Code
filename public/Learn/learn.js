/* =====================================================
   FX-13 VALOUR · LEARN — Microcontrollers 101 (ESP32)
   Scroll engine, 3D choreography, labs, checkpoints
   ===================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone = () => window.innerWidth < 760;
// Course accent colours come from CSS (body.theme-*), so canvases match the theme.
const cssVar = (name, fallback) =>
  getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
let accentCache = null;
const accent2 = () => (accentCache ??= cssVar("--accent-2", "#3d9bff"));

/* =====================================================
   CHECKPOINT QUESTIONS
   ===================================================== */
const QUESTIONS = [
  {
    q: "Which description fits a microcontroller best?",
    options: [
      ["A tiny computer on one chip that runs a program to control a device", "Exactly. Processor, memory and input/output pins — all on one chip."],
      ["A battery that stores power for robots", "Not quite — it needs power, but it doesn't store it. It's the part that makes decisions."],
      ["A screen that shows information", "Some devices have screens, but the microcontroller is the brain behind them, not the display."],
      ["A Wi-Fi router for your home", "The ESP32 can use Wi-Fi, but a microcontroller is really a tiny computer that controls things."],
    ],
    answer: 0,
  },
  {
    q: "On the ESP32 DevKit, what does the voltage regulator do?",
    options: [
      ["Stores your program", "That's the flash memory's job. The regulator deals with power."],
      ["Turns the 5 V from USB into the steady 3.3 V the chip needs", "Correct! Too much voltage would damage the ESP32, so the regulator steps it down."],
      ["Sends Wi-Fi signals", "That's the antenna. The regulator is all about power."],
      ["Restarts the board", "That's the EN button. The regulator keeps the voltage steady."],
    ],
    answer: 1,
  },
  {
    q: "The ESP32 runs at 240 MHz. What does that mean?",
    options: [
      ["It can store 240 million programs", "MHz measures speed, not storage."],
      ["Its Wi-Fi reaches 240 metres", "MHz isn't a distance — it means \"million times per second\"."],
      ["Its clock ticks up to 240 million times every second", "Yes! Each tick lets the processor take one small step."],
      ["It uses 240 milliwatts of power", "Close guess, but MHz (megahertz) is a frequency — ticks per second."],
    ],
    answer: 2,
  },
  {
    q: "analogRead() on an ESP32 gives a number from 0 to 4095. A knob sets the pin to about half of 3.3 V. Roughly what will you read?",
    options: [
      ["About 2048", "Spot on. Half of 3.3 V is about half of 4095."],
      ["About 1.65", "That's the voltage. analogRead() turns it into a number from 0 to 4095."],
      ["HIGH", "HIGH/LOW is what digitalRead() gives. analogRead() gives a number."],
      ["About 255", "255 is the top of analogWrite(). analogRead() goes up to 4095."],
    ],
    answer: 0,
  },
  {
    q: "What happens to the code inside loop()?",
    options: [
      ["It runs once when the board starts", "That's setup(). loop() is the part that repeats."],
      ["It runs over and over, forever, after setup()", "Correct! When loop() reaches the end, it simply starts again."],
      ["It only runs when you press the BOOT button", "No — loop() runs on its own, again and again."],
      ["It runs on your computer, not the ESP32", "Everything runs on the ESP32 once it's uploaded."],
    ],
    answer: 1,
  },
  {
    q: "What does this program do to the LED on pin 2?",
    code: "void loop() {\n  digitalWrite(2, HIGH);\n  delay(500);\n  digitalWrite(2, LOW);\n  delay(500);\n}",
    options: [
      ["Turns it on and leaves it on", "It turns on, but 500 ms later the next line turns it off again."],
      ["Blinks it: half a second on, half a second off, forever", "That's it — one full blink every second. You're ready to code!"],
      ["Makes it glow at half brightness", "That would need analogWrite(). Here it fully switches on and off."],
      ["Blinks it once, then stops", "loop() repeats forever, so it keeps blinking."],
    ],
    answer: 1,
  },
];

const STORE_KEY = "fx13-learn-esp32-v1";
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || { done: [], first: [] };
  } catch (e) {
    return { done: [], first: [] };
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(p));
  } catch (e) {}
}
let progress = loadProgress();

/* =====================================================
   SCENES + STEP REVEALS
   ===================================================== */
const scenes = $$(".scene").map((el) => ({
  el,
  name: el.dataset.scene,
  pin: $(".pin", el),
  steps: $$("[data-step]", el).map((s) => {
    const [a, b] = s.dataset.step.split(" ").map(Number);
    return { el: s, a, b };
  }),
  p: -1,
}));

function sceneProgress(sc) {
  const r = sc.el.getBoundingClientRect();
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
  const total = r.height - (window.innerHeight - navH);
  // clamp at 0 so the first scene is "on" even if the page starts a pixel short
  return clamp((navH - r.top) / Math.max(1, total), 0, 1.001);
}

function sceneOnScreen(sc) {
  const r = sc.el.getBoundingClientRect();
  return r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
}

function updateSteps(sc) {
  const p = sc.p;
  for (const s of sc.steps) {
    const on = p >= s.a && p < s.b;
    s.el.classList.toggle("is-on", on);
    s.el.classList.toggle("is-after", !on && p >= s.b);
  }
}

/* ---------- scroll-lit paragraphs ---------- */
const scrubs = $$(".scrub-text").map((el) => {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  const spans = words.map((w, i) => {
    const s = document.createElement("span");
    s.className = "w";
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    return s;
  });
  return { el, spans };
});
function updateScrubs() {
  const vh = window.innerHeight;
  for (const s of scrubs) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -100 || r.top > vh + 100) continue;
    const t = reduceMotion ? 1 : clamp((vh * 0.88 - r.top) / (vh * 0.55 + r.height * 0.5));
    const n = Math.round(t * s.spans.length);
    s.spans.forEach((w, i) => w.classList.toggle("lit", i < n));
  }
}

/* =====================================================
   3D BOARD
   ===================================================== */
let board = null;
const canvas3d = $("#board3d");
const hotspotLayer = $("#hotspots");
const ANATOMY = ["module", "antenna", "usb", "usbuart", "regulator", "en", "boot", "led", "pins", null];
const LABELS = { module: "Module", antenna: "Antenna", usb: "USB", usbuart: "USB-UART", regulator: "Regulator", en: "EN", boot: "BOOT", led: "LEDs", pins: "Pins" };
const PART_ANCHOR = {
  // world-space centres (board unrotated) used for camera framing
  module: [10.4, 2.8, 0],
  antenna: [23.6, 1.3, 0],
  usb: [-24.6, 2.1, 0],
  usbuart: [-11.4, 1.2, 0],
  regulator: [-4.8, 1.6, 7.2],
  en: [-20.2, 1.6, -9.6],
  boot: [-20.2, 1.6, 9.6],
  led: [-3.3, 1.0, -10.6],
  pins: [0, -2, 0],
  soc: [10.5, 2.0, -1.2],
  flash: [4.6, 2.2, 3.2],
  crystal: [16.2, 1.9, 3.6],
};

let hotspots = {};
let anatomyActive = false;
let heroBlink = null;

async function initBoard() {
  try {
    if (!window.WebGLRenderingContext) throw new Error("no webgl");
    const mod = await import("./board3d.js?v=20261106");
    board = await mod.createBoard(canvas3d, { accent: cssVar("--accent-rgb", "0, 123, 255") });
  } catch (e) {
    console.warn("3D view unavailable, using the static image instead.", e);
    document.documentElement.classList.add("no-webgl");
    canvas3d.remove();
    return;
  }
  for (const sc of scenes) {
    if (sc.name === "hero" || sc.name === "anatomy") board.enableDrag(sc.pin);
  }
  // hotspot buttons for the anatomy tour
  for (const id of ANATOMY.filter(Boolean)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hotspot";
    b.setAttribute("aria-label", LABELS[id]);
    b.innerHTML = `<span class="hotspot-label">${LABELS[id]}</span>`;
    b.addEventListener("click", () => jumpToPart(id));
    hotspotLayer.appendChild(b);
    hotspots[id] = b;
  }
  hotspotLayer.removeAttribute("aria-hidden");
  requestAnimationFrame(tickHotspots);
  onScroll();
}

function jumpToPart(id) {
  const sc = scenes.find((s) => s.name === "anatomy");
  const i = ANATOMY.indexOf(id);
  const r = sc.el.getBoundingClientRect();
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
  const total = r.height - (window.innerHeight - navH);
  const target = window.scrollY + r.top - navH + total * ((i + 0.5) / ANATOMY.length);
  window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
}

function tickHotspots() {
  if (board && anatomyActive) {
    // dots that would sit on top of the open info card are hidden
    const card = $(".part-card.is-on");
    const cr = card ? card.getBoundingClientRect() : null;
    for (const [id, b] of Object.entries(hotspots)) {
      const p = board.screenPos(id);
      if (!p) continue;
      b.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      const under = cr && p.x > cr.left - 16 && p.x < cr.right + 16 && p.y > cr.top - 16 && p.y < cr.bottom + 16;
      const offscreen = p.y < 70 || p.y > window.innerHeight - 10 || p.x < 0 || p.x > window.innerWidth;
      b.classList.toggle("is-hidden", !!under || offscreen || !p.visible);
    }
  }
  requestAnimationFrame(tickHotspots);
}

/* camera presets: offset from the part, and how far to push the part left on wide screens */
function anatomyPreset(id) {
  const a = PART_ANCHOR[id] || [0, 0, 0];
  const wide = !isPhone();
  const shift = wide ? 1 : 0;
  const presets = {
    module: { o: [-8, 58, 70], s: 12 },
    antenna: { o: [10, 46, 54], s: 10 },
    usb: { o: [-30, 34, 48], s: 9 },
    usbuart: { o: [-6, 44, 50], s: 9 },
    regulator: { o: [-6, 42, 50], s: 9 },
    en: { o: [-16, 38, 44], s: 8 },
    boot: { o: [-16, 38, 48], s: 8 },
    led: { o: [-8, 38, 44], s: 8 },
    pins: { o: [0, 8, 112], s: 16, ty: -4 },
    explore: { o: [0, 70, 108], s: 14 },
  };
  const P = presets[id || "explore"];
  const tx = a[0] + P.s * shift;
  const ty = (P.ty ?? a[1]) - (wide ? 0 : P.s * 0.6);
  return { camX: a[0] + P.o[0], camY: a[1] + P.o[1], camZ: a[2] + P.o[2], tx, ty, tz: a[2], rotY: 0, rotX: 0, rotZ: 0, lift: 0, posX: 0, posY: 0, scale: 1 };
}

function mix(A, B, t) {
  const o = {};
  for (const k of Object.keys(A)) o[k] = lerp(A[k], B[k], t);
  return o;
}

function heroState(p) {
  const wide = !isPhone();
  const a = { camX: 0, camY: 62, camZ: wide ? 132 : 150, tx: wide ? -22 : 0, ty: wide ? 2 : -30, tz: 0, rotY: -0.75, rotX: 0.1, rotZ: 0.05, lift: 0, posX: 0, posY: 0, scale: 1 };
  const b = { camX: 0, camY: 50, camZ: wide ? 132 : 185, tx: 0, ty: wide ? 9 : 1, tz: 0, rotY: 0.28, rotX: 0.18, rotZ: 0, lift: 0, posX: 0, posY: 0, scale: 1 };
  return mix(a, b, smooth(0.38, 0.62, p));
}
function whatState(p) {
  const wide = !isPhone();
  return { camX: 0, camY: 64, camZ: 124, tx: wide ? -26 : 0, ty: wide ? 0 : -18, tz: 0, rotY: lerp(-0.9, 0.9, p), rotX: 0.12, rotZ: 0, lift: 0, posX: 0, posY: 0, scale: 1 };
}
function anatomyState(p) {
  const n = ANATOMY.length;
  const f = clamp(p) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const local = f - i;
  const cur = anatomyPreset(ANATOMY[i]);
  if (i === 0) return { state: cur, part: ANATOMY[i], i };
  const prev = anatomyPreset(ANATOMY[i - 1]);
  return { state: mix(prev, cur, smooth(0, 0.35, local)), part: ANATOMY[i], i };
}
function insideState(p) {
  const wide = !isPhone();
  const focus = p < 0.45 ? "soc" : p < 0.7 ? "flash" : "crystal";
  const a = PART_ANCHOR[focus];
  const intro = { camX: 6, camY: 78, camZ: 86, tx: 10 - (wide ? 12 : 0), ty: wide ? 4 : -12, tz: 0, rotY: 0, rotX: 0, rotZ: 0, lift: 0, posX: 0, posY: 0, scale: 1 };
  const close = { camX: a[0] + 2, camY: 74, camZ: a[2] + 58, tx: a[0] - (wide ? 9 : 0), ty: wide ? 6 : -8, tz: a[2] - 2, rotY: 0, rotX: 0, rotZ: 0, lift: 1, posX: 0, posY: 0, scale: 1 };
  const s = mix(intro, close, smooth(0.05, 0.22, p));
  s.lift = smooth(0.04, 0.18, p);
  return { state: s, part: p > 0.18 ? focus : "module" };
}

function update3D() {
  if (!board) return;
  const byName = Object.fromEntries(scenes.map((s) => [s.name, s]));
  const order = ["hero", "what", "anatomy", "inside"];
  const active = order.map((n) => byName[n]).find((s) => s && sceneOnScreen(s));
  canvas3d.classList.toggle("is-visible", !!active);
  board.setActive(!!active);
  anatomyActive = active?.name === "anatomy";
  let highlight = null;
  let drag = false;

  if (active) {
    const p = clamp(active.p);
    if (active.name === "hero") {
      board.setTarget(heroState(p));
      board.setIdleSpin(p < 0.35);
      drag = true;
    } else if (active.name === "what") {
      board.setTarget(whatState(p));
      board.setIdleSpin(false);
    } else if (active.name === "anatomy") {
      const { state, part, i } = anatomyState(p);
      board.setTarget(state);
      board.setIdleSpin(false);
      highlight = part;
      drag = part === null;
      for (const [id, b] of Object.entries(hotspots)) {
        b.classList.add("is-shown");
        b.classList.toggle("is-current", id === part);
      }
      const bar = $(".anatomy-progress span", active.el);
      if (bar) bar.style.height = `${((i + 1) / ANATOMY.length) * 100}%`;
      active.pin.classList.toggle("can-drag", drag);
    } else if (active.name === "inside") {
      const { state, part } = insideState(p);
      board.setTarget(state);
      board.setIdleSpin(false);
      highlight = part;
    }
  }
  if (!anatomyActive) for (const b of Object.values(hotspots)) b.classList.remove("is-shown");
  board.setHighlight(highlight);
  board.setDragAllowed(drag);

  // hero: the blue LED blinks while the opening plays
  const heroOn = active?.name === "hero";
  if (heroOn && !heroBlink && !reduceMotion) {
    let on = false;
    heroBlink = setInterval(() => board.setLed((on = !on)), 600);
  } else if (!heroOn && heroBlink) {
    clearInterval(heroBlink);
    heroBlink = null;
    board.setLed(false);
  }
}

/* =====================================================
   CHAPTER RAIL
   ===================================================== */
const rail = $(".chapter-rail");
const railItems = $$(".rail-list li");
function updateRail() {
  const mid = window.innerHeight * 0.35;
  let current = railItems[0];
  for (const li of railItems) {
    const target = document.getElementById(li.dataset.for);
    if (!target || target.classList.contains("is-locked")) continue;
    if (target.getBoundingClientRect().top <= mid) current = li;
  }
  railItems.forEach((li) => {
    li.classList.toggle("is-now", li === current);
    const t = document.getElementById(li.dataset.for);
    li.classList.toggle("is-locked", !!t && t.classList.contains("is-locked"));
  });
  $(".rail-now-num", rail).textContent = $("b", current).textContent;
  $(".rail-now-title", rail).textContent = $("span", current).textContent;
}
$(".rail-toggle", rail).addEventListener("click", () => {
  const open = !rail.classList.contains("is-open");
  rail.classList.toggle("is-open", open);
  $(".rail-toggle", rail).setAttribute("aria-expanded", String(open));
});
$$(".rail-list a").forEach((a) => a.addEventListener("click", () => rail.classList.remove("is-open")));

/* =====================================================
   CHECKPOINTS + LOCKING
   ===================================================== */
const chapters = $$(".chapter");
function applyLocks() {
  const nextQ = QUESTIONS.findIndex((_, i) => !progress.done.includes(i));
  const unlockedUpTo = nextQ === -1 ? 99 : nextQ + 1; // chapter number still allowed
  for (const ch of chapters) {
    const n = Number(ch.dataset.chapter);
    ch.classList.toggle("is-locked", n > unlockedUpTo);
  }
}

function buildCheckpoint(el) {
  const qi = Number(el.dataset.q);
  const Q = QUESTIONS[qi];
  const nextCh = chapters.find((c) => Number(c.dataset.chapter) === qi + 2);
  el.innerHTML = `
    <div class="checkpoint-card" role="group" aria-labelledby="cpq${qi}">
      <div class="cp-meta">
        <p class="eyebrow">Checkpoint ${qi + 1} of ${QUESTIONS.length}</p>
        <div class="cp-steps">${QUESTIONS.map((_, i) => `<i class="${progress.done.includes(i) ? "done" : ""}"></i>`).join("")}</div>
      </div>
      <h3 id="cpq${qi}">${Q.q}</h3>
      ${Q.code ? `<pre class="code-card cp-code"><code></code></pre>` : ""}
      <div class="cp-options">
        ${Q.options.map(([t], i) => `<button type="button" class="cp-option" data-i="${i}"><b>${"ABCD"[i]}</b><span></span></button>`).join("")}
      </div>
      <p class="cp-feedback" aria-live="polite"></p>
      <button type="button" class="btn-solid cp-next">${nextCh && nextCh.id === "finale" ? "Finish the lesson" : "Continue"} <i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>
    </div>
    <p class="cp-locked">Answer to unlock the next chapter</p>`;
  // text set separately so nothing is parsed as HTML
  $$(".cp-option span", el).forEach((s, i) => (s.textContent = Q.options[i][0]));
  if (Q.code) $(".cp-code code", el).textContent = Q.code;

  let wrong = 0;
  const fb = $(".cp-feedback", el);
  const opts = $$(".cp-option", el);
  const finish = (firstTry) => {
    opts.forEach((o) => (o.disabled = true));
    opts[Q.answer].classList.add("is-right");
    el.classList.add("is-done");
    if (!progress.done.includes(qi)) {
      progress.done.push(qi);
      if (firstTry) progress.first.push(qi);
      saveProgress(progress);
      applyLocks();
      if (nextCh) {
        nextCh.classList.add("just-unlocked");
        setTimeout(() => nextCh.classList.remove("just-unlocked"), 1200);
      }
      $$(".cp-steps").forEach((bar) => $$("i", bar).forEach((i, k) => i.classList.toggle("done", progress.done.includes(k))));
      updateFinale();
      onScroll();
    }
  };
  opts.forEach((o) =>
    o.addEventListener("click", () => {
      const i = Number(o.dataset.i);
      if (i === Q.answer) {
        fb.className = "cp-feedback good";
        fb.textContent = Q.options[i][1];
        finish(wrong === 0);
      } else {
        wrong++;
        o.classList.remove("is-wrong");
        void o.offsetWidth;
        o.classList.add("is-wrong");
        o.disabled = true;
        fb.className = "cp-feedback bad";
        fb.textContent = Q.options[i][1] + (wrong >= 2 ? " The right answer is highlighted below." : " Try again!");
        if (wrong >= 2) {
          finish(false);
          fb.className = "cp-feedback bad";
        }
      }
    }),
  );
  $(".cp-next", el).addEventListener("click", () => {
    if (!nextCh) return;
    const head = $(".chapter-head", nextCh) || nextCh;
    head.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  // already answered on an earlier visit
  if (progress.done.includes(qi)) {
    opts.forEach((o) => (o.disabled = true));
    opts[Q.answer].classList.add("is-right");
    fb.className = "cp-feedback good";
    fb.textContent = Q.options[Q.answer][1];
    el.classList.add("is-done");
  }
}

function updateFinale() {
  const score = progress.first.length;
  const el = $(".finale-score");
  if (el) {
    el.textContent =
      score === QUESTIONS.length
        ? `Perfect score — all ${QUESTIONS.length} checkpoints right on the first try.`
        : `You got ${score} of ${QUESTIONS.length} checkpoints right on the first try. Every one is unlocked — scroll back anytime to explore again.`;
  }
}

$(".restart")?.addEventListener("click", () => {
  progress = { done: [], first: [] };
  saveProgress(progress);
  location.href = location.pathname + "#intro";
  location.reload();
});

/* =====================================================
   CHAPTER 1 · devices
   ===================================================== */
const jobOut = $(".device-job");
$$(".device").forEach((d) =>
  d.addEventListener("click", () => {
    $$(".device").forEach((x) => x.classList.toggle("is-active", x === d));
    jobOut.textContent = d.dataset.job;
  }),
);

/* anatomy: "blink the blue LED" button */
$$('[data-action="blink"]').forEach((b) =>
  b.addEventListener("click", () => {
    if (!board) return;
    let n = 0;
    const t = setInterval(() => {
      board.setLed(n % 2 === 0);
      if (++n > 7) {
        clearInterval(t);
        board.setLed(false);
      }
    }, 280);
  }),
);

/* =====================================================
   CHAPTER 3 · floorplan, clock, CPU
   ===================================================== */
(function floorplan() {
  const svg = $(".floorplan");
  if (!svg) return;
  const pads = $(".pads", svg);
  const ns = "http://www.w3.org/2000/svg";
  for (let i = 0; i < 24; i++) {
    const p = 40 + i * 21.5;
    for (const [x, y, w, h] of [[p, 14, 10, 8], [p, 578, 10, 8], [14, p, 8, 10], [578, p, 8, 10]]) {
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", x);
      r.setAttribute("y", y);
      r.setAttribute("width", w);
      r.setAttribute("height", h);
      pads.appendChild(r);
    }
  }
  const name = $(".block-name");
  const text = $(".block-text");
  $$(".block", svg).forEach((b) => {
    const pick = () => {
      $$(".block", svg).forEach((x) => x.classList.toggle("is-active", x === b));
      name.textContent = b.dataset.name;
      text.textContent = b.dataset.text;
    };
    b.addEventListener("click", pick);
    b.addEventListener("mouseenter", pick);
    b.setAttribute("tabindex", "0");
    b.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && pick());
  });
  new IntersectionObserver(
    ([e], o) => {
      if (e.isIntersecting) {
        svg.classList.add("is-drawn");
        o.disconnect();
      }
    },
    { threshold: 0.3 },
  ).observe(svg);
})();

function setFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty("--fill", pct + "%");
}

function fitCanvas(c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h };
}

function onVisible(el, cb) {
  let vis = false;
  new IntersectionObserver(([e]) => {
    vis = e.isIntersecting;
    if (vis) cb();
  }).observe(el);
  return () => vis;
}

(function clockLab() {
  const lab = $("#clockLab");
  if (!lab) return;
  const range = $(".clock-range", lab);
  const freqOut = $(".clock-freq", lab);
  const blinkOut = $(".clock-blink", lab);
  const fact = $(".clock-fact", lab);
  const led = $(".clock-led", lab);
  const wave = $(".clock-wave", lab);
  const MAX = 240e6;
  let hz = 1;
  let phase = 0;
  let last = 0;
  const fmt = (f) => (f >= 1e6 ? `${(f / 1e6).toFixed(f >= 1e8 ? 0 : 1)} MHz` : f >= 1e3 ? `${(f / 1e3).toFixed(1)} kHz` : `${f.toFixed(f < 10 ? 1 : 0)} Hz`);
  const facts = [
    [2, "One tick every second. You could count along."],
    [30, "Faster than you can count — but you can still see each blink."],
    [1e3, "Now the light flickers too fast for your eyes to follow."],
    [1e6, "Thousands of ticks a second — like an old 1970s computer."],
    [1e8, "Millions of ticks a second. Early home computers ran at this speed."],
    [Infinity, "240 million ticks a second. In one tick, light travels just 1.25 metres!"],
  ];
  function update() {
    const v = Number(range.value);
    hz = Math.round(Math.pow(MAX, v / 100) * 10) / 10;
    if (v >= 99.9) hz = MAX;
    freqOut.textContent = fmt(hz);
    blinkOut.textContent = Math.round(hz * 0.3).toLocaleString();
    fact.textContent = facts.find(([lim]) => hz < lim)[1];
    setFill(range);
  }
  range.addEventListener("input", update);
  update();
  const visible = onVisible(lab, () => requestAnimationFrame(draw));
  function draw(now) {
    if (!visible()) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    const { g, w, h } = fitCanvas(wave);
    g.clearRect(0, 0, w, h);
    // draw the square wave; its visual speed is capped so it stays readable
    const visHz = Math.min(hz, 6);
    phase += dt * visHz;
    const cycles = clamp(Math.log10(hz + 1) * 3 + 2, 2, 60);
    g.strokeStyle = accent2();
    g.lineWidth = 1.6;
    g.beginPath();
    const hi = h * 0.25;
    const lo = h * 0.75;
    for (let x = 0; x <= w; x += 1) {
      const t = (x / w) * cycles + phase;
      const y = t % 1 < 0.5 ? hi : lo;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    led.classList.toggle("on", hz <= 30 && (phase % 1) < 0.5);
    led.classList.toggle("blur", hz > 30);
    requestAnimationFrame(draw);
  }
})();

(function cpuLab() {
  const lab = $("#cpuLab");
  if (!lab) return;
  const PROGRAM = [
    ["LOAD", "R1, 1", "put 1 (on) into register R1"],
    ["WRITE", "GPIO2, R1", "send R1 to the LED pin"],
    ["WAIT", "500 ms", "pause for half a second"],
    ["LOAD", "R1, 0", "put 0 (off) into R1"],
    ["WRITE", "GPIO2, R1", "send R1 to the LED pin"],
    ["WAIT", "500 ms", "pause for half a second"],
    ["JUMP", "0", "go back to the start"],
  ];
  const list = $(".cpu-program", lab);
  list.innerHTML = PROGRAM.map(([op, arg, cmt], i) => `<li><span class="addr">${String(i).padStart(2, "0")}</span><span class="op">${op} ${arg}</span><span class="cmt">; ${cmt}</span></li>`).join("");
  const rows = $$("li", list);
  const stages = $$(".cpu-stages span", lab);
  const explain = $(".cpu-explain", lab);
  const pcOut = $(".reg-pc", lab);
  const r1Out = $(".reg-r1", lab);
  const ledOut = $(".reg-led", lab);
  const led = $(".cpu-led", lab);
  const runBtn = $('[data-cpu="run"]', lab);
  let pc = 0;
  let r1 = 0;
  let pin = 0;
  let stage = -1;
  let timer = null;

  function render() {
    rows.forEach((r, i) => r.classList.toggle("is-pc", i === pc));
    stages.forEach((s, i) => s.classList.toggle("is-on", i === stage));
    pcOut.textContent = pc;
    r1Out.textContent = r1;
    ledOut.textContent = pin ? "HIGH" : "LOW";
    led.classList.toggle("on", !!pin);
  }
  function step() {
    stage = (stage + 1) % 3;
    const [op, arg] = PROGRAM[pc];
    if (stage === 0) explain.innerHTML = `<b>Fetch:</b> read instruction ${pc} from memory → <code>${op} ${arg}</code>`;
    if (stage === 1) {
      const meaning = {
        LOAD: `put the number ${arg.split(", ")[1]} into register R1`,
        WRITE: "copy R1 to the LED pin",
        WAIT: "do nothing for 500 ms",
        JUMP: "change the PC so the next instruction is 0",
      }[op];
      explain.innerHTML = `<b>Decode:</b> work out what it means — ${meaning}.`;
    }
    if (stage === 2) {
      if (op === "LOAD") r1 = Number(arg.split(", ")[1]);
      if (op === "WRITE") pin = r1;
      explain.innerHTML = `<b>Execute:</b> ${op === "LOAD" ? `R1 is now ${r1}.` : op === "WRITE" ? `the LED is now ${pin ? "ON" : "OFF"}.` : op === "WAIT" ? "waiting…" : "jumping back to the start."}`;
      pc = op === "JUMP" ? 0 : pc + 1;
    }
    render();
  }
  $('[data-cpu="step"]', lab).addEventListener("click", () => {
    stopRun();
    step();
  });
  function stopRun() {
    clearInterval(timer);
    timer = null;
    runBtn.textContent = "Run";
  }
  runBtn.addEventListener("click", () => {
    if (timer) return stopRun();
    runBtn.textContent = "Pause";
    timer = setInterval(step, 260);
  });
  $('[data-cpu="reset"]', lab).addEventListener("click", () => {
    stopRun();
    pc = r1 = pin = 0;
    stage = -1;
    explain.innerHTML = "Press <b>Step</b> to fetch the first instruction.";
    render();
  });
  render();
})();

/* =====================================================
   CHAPTER 4 · pin labs
   ===================================================== */
(function outLab() {
  const lab = $("#labOut");
  if (!lab) return;
  const sw = $(".switch", lab);
  const code = $(".code-line b", lab);
  const v = $(".v", lab);
  const scope = $(".scope", lab);
  const hist = new Array(120).fill(0);
  let level = 0;
  sw.addEventListener("click", () => {
    level = level ? 0 : 1;
    sw.setAttribute("aria-checked", String(!!level));
    lab.classList.toggle("is-high", !!level);
    code.textContent = level ? "HIGH" : "LOW";
    v.textContent = level ? "3.3 V" : "0.0 V";
  });
  const visible = onVisible(lab, () => requestAnimationFrame(draw));
  let acc = 0;
  let last = 0;
  function draw(now) {
    if (!visible()) return;
    acc += last ? now - last : 0;
    last = now;
    while (acc > 30) {
      hist.push(level);
      hist.shift();
      acc -= 30;
    }
    const { g, w, h } = fitCanvas(scope);
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.font = '10px Consolas, "SFMono-Regular", Menlo, monospace';
    g.fillText("3.3V", 4, 14);
    g.fillText("0V", 4, h - 6);
    g.strokeStyle = accent2();
    g.lineWidth = 1.6;
    g.beginPath();
    hist.forEach((l, i) => {
      const x = 34 + (i / (hist.length - 1)) * (w - 40);
      const y = l ? 14 : h - 10;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
    requestAnimationFrame(draw);
  }
})();

(function inLab() {
  const lab = $("#labIn");
  if (!lab) return;
  const btn = $(".push", lab);
  const code = $(".code-line b", lab);
  const v = $(".v", lab);
  const set = (down) => {
    btn.classList.toggle("is-down", down);
    lab.classList.toggle("is-pressed", down);
    code.textContent = down ? "LOW" : "HIGH";
    v.textContent = down ? "0.0 V" : "3.3 V";
  };
  btn.addEventListener("pointerdown", (e) => {
    btn.setPointerCapture?.(e.pointerId);
    set(true);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => btn.addEventListener(t, () => set(false)));
  btn.addEventListener("keydown", (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), set(true)));
  btn.addEventListener("keyup", () => set(false));
})();

(function adcLab() {
  const lab = $("#labAdc");
  if (!lab) return;
  const knob = $(".knob", lab);
  const mark = $(".knob-mark", lab);
  const vOut = $(".adc-v", lab);
  const nOut = $(".adc-n", lab);
  const bits = $(".bits", lab);
  const bar = $(".adc-bar span", lab);
  bits.innerHTML = "<span></span>".repeat(12);
  const cells = $$("span", bits);
  let val = 2048;
  function set(n) {
    val = Math.round(clamp(n, 0, 4095));
    const deg = -135 + (val / 4095) * 270;
    mark.style.setProperty("--rot", deg + "deg");
    vOut.textContent = ((val / 4095) * 3.3).toFixed(2) + " V";
    nOut.textContent = val;
    const b = val.toString(2).padStart(12, "0");
    cells.forEach((c, i) => {
      c.textContent = b[i];
      c.classList.toggle("one", b[i] === "1");
    });
    bar.style.width = (val / 4095) * 100 + "%";
    knob.setAttribute("aria-valuenow", val);
  }
  let drag = false;
  const fromPointer = (e) => {
    const r = knob.getBoundingClientRect();
    const ang = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    let a = ang > 180 ? ang - 360 : ang;
    a = clamp(a, -135, 135);
    set(((a + 135) / 270) * 4095);
  };
  knob.addEventListener("pointerdown", (e) => {
    drag = true;
    knob.setPointerCapture?.(e.pointerId);
    fromPointer(e);
  });
  knob.addEventListener("pointermove", (e) => drag && fromPointer(e));
  ["pointerup", "pointercancel"].forEach((t) => knob.addEventListener(t, () => (drag = false)));
  knob.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 400 : 100;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") (e.preventDefault(), set(val + step));
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") (e.preventDefault(), set(val - step));
  });
  set(2048);
})();

(function pwmLab() {
  const lab = $("#labPwm");
  if (!lab) return;
  const range = $(".pwm-range", lab);
  const n = $(".pwm-n", lab);
  const led = $(".pwm-led", lab);
  const duty = $(".pwm-duty", lab);
  const wave = $(".pwm-wave", lab);
  let phase = 0;
  let last = 0;
  function update() {
    const v = Number(range.value);
    n.textContent = v;
    led.style.setProperty("--b", (v / 255).toFixed(3));
    duty.textContent = `On ${Math.round((v / 255) * 100)}% of the time · switching 5,000 times a second`;
    setFill(range);
  }
  range.addEventListener("input", update);
  update();
  const visible = onVisible(lab, () => requestAnimationFrame(draw));
  function draw(now) {
    if (!visible()) return;
    phase += last ? (now - last) / 1000 : 0;
    last = now;
    const { g, w, h } = fitCanvas(wave);
    g.clearRect(0, 0, w, h);
    const d = Number(range.value) / 255;
    const cycles = 6;
    g.strokeStyle = accent2();
    g.lineWidth = 1.6;
    g.beginPath();
    for (let x = 0; x <= w; x++) {
      const t = ((x / w) * cycles + phase * 0.6) % 1;
      const y = t < d ? h * 0.22 : h * 0.8;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    requestAnimationFrame(draw);
  }
})();

/* =====================================================
   CHAPTER 5 · pipeline
   ===================================================== */
const pipe = (function pipeline() {
  const sc = scenes.find((s) => s.name === "pipeline");
  if (!sc) return null;
  const fill = $(".track-fill", sc.el);
  const stations = $$(".pipe-stations li", sc.el);
  const bin = $(".binary", sc.el);
  const cells = $(".flash-cells", sc.el);
  // pseudo machine code for the blink program
  let bits = "";
  const seed = "void setup(){pinMode(2,OUTPUT);}void loop(){digitalWrite(2,HIGH);delay(500);digitalWrite(2,LOW);delay(500);}";
  for (let i = 0; i < 160; i++) bits += (seed.charCodeAt(i % seed.length) * (i + 7)).toString(2).slice(-8) + " ";
  bin.textContent = bits;
  cells.innerHTML = "<i></i>".repeat(32 * 6);
  const cellEls = $$("i", cells);
  return (p) => {
    const len = 920;
    fill.style.strokeDashoffset = String(len - len * clamp(p * 1.04));
    const idx = Math.min(5, Math.floor(clamp(p) * 6));
    stations.forEach((s, i) => {
      s.classList.toggle("is-done", i < idx);
      s.classList.toggle("is-now", i === idx);
    });
    const flashT = smooth(0.5, 0.64, p);
    const on = Math.round(flashT * cellEls.length);
    cellEls.forEach((c, i) => c.classList.toggle("on", i < on));
    const shown = Math.round(smooth(0.17, 0.3, p) * bits.length);
    bin.style.setProperty("--shown", shown);
    bin.textContent = bits.slice(0, Math.max(0, shown));
  };
})();

/* =====================================================
   FINALE
   ===================================================== */
const finale = $("#finale");
if (finale) {
  new IntersectionObserver(([e]) => e.isIntersecting && finale.classList.add("is-in"), { threshold: 0.3 }).observe(finale);
}

/* =====================================================
   MAIN LOOP
   ===================================================== */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    for (const sc of scenes) {
      sc.p = sceneProgress(sc);
      updateSteps(sc);
      if (sc.name === "pipeline" && pipe) pipe(clamp(sc.p));
    }
    updateScrubs();
    update3D();
    updateRail();
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  board?.resize();
  onScroll();
});

/* ---------- boot ---------- */
$$(".checkpoint").forEach(buildCheckpoint);
applyLocks();
updateFinale();
onScroll();
initBoard().finally(() => {
  window.__courseReady = true;
  window.dispatchEvent(new Event("course:ready"));
});
import("./sandbox.js?v=20261106").then((m) => m.initSandbox($("#sandbox"))).catch((e) => console.error("Sandbox failed to load", e));
