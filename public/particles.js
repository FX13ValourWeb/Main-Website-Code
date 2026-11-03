/* =====================================================
   SHARED INTERACTIVE STAR BACKGROUND
   Used by every page that has <canvas id="bg-canvas">.

   - Frame-rate independent (same speed on 60Hz / 120Hz screens)
   - Crisp on high-DPI screens (DPR capped for performance)
   - Batched drawing: a handful of canvas calls per frame instead of hundreds
   - Smooth, eased pointer interaction (no sudden jumps)
   - No re-seeding / flashing when a phone's address bar shows or hides
   - Pauses when the tab is hidden, static frame for reduced-motion users
===================================================== */
(function () {
  "use strict";

  const canvas = document.getElementById("bg-canvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  const LINK_DIST = 100;
  const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
  const POINTER_RADIUS = 150;
  const POINTER_RADIUS_SQ = POINTER_RADIUS * POINTER_RADIUS;
  const ALPHA_BUCKETS = 6;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];

  /* Pointer: target position + an eased position + an eased strength,
     so the blue "web" fades in/out instead of popping. */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false, strength: 0 };

  function targetCount() {
    const divisor = coarsePointer ? 13000 : 9000;
    const max = coarsePointer ? 70 : 170;
    return Math.max(24, Math.min(max, Math.round((width * height) / divisor)));
  }

  function makeParticle(x, y) {
    const dx = (Math.random() - 0.5) * 0.5;
    const dy = (Math.random() - 0.5) * 0.5;
    return {
      x: x,
      y: y,
      bx: dx, // base drift velocity
      by: dy,
      vx: dx,
      vy: dy,
      size: Math.random() * 1.5 + 0.5,
    };
  }

  function syncCount() {
    const wanted = targetCount();
    while (particles.length < wanted) {
      particles.push(
        makeParticle(Math.random() * width, Math.random() * height),
      );
    }
    if (particles.length > wanted) particles.length = wanted;
  }

  function resize() {
    const newW = window.innerWidth;
    const newH = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    // Re-scale existing stars instead of re-seeding (prevents flashing
    // when a mobile browser's address bar slides in/out).
    if (width && height && particles.length) {
      const sx = newW / width;
      const sy = newH / height;
      for (let i = 0; i < particles.length; i++) {
        particles[i].x *= sx;
        particles[i].y *= sy;
      }
    }

    width = newW;
    height = newH;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    syncCount();
    if (reduceMotion) draw();
  }

  let resizeTimer = 0;
  window.addEventListener(
    "resize",
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    },
    { passive: true },
  );

  /* ---------- Pointer input ---------- */
  function setPointer(x, y) {
    pointer.tx = x;
    pointer.ty = y;
    if (!pointer.active) {
      // Start the eased position at the pointer so lines don't sweep in
      pointer.x = x;
      pointer.y = y;
    }
    pointer.active = true;
  }

  if (!reduceMotion) {
    window.addEventListener(
      "pointermove",
      function (e) {
        setPointer(e.clientX, e.clientY);
      },
      { passive: true },
    );
    window.addEventListener(
      "pointerdown",
      function (e) {
        setPointer(e.clientX, e.clientY);
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      function (e) {
        if (e.touches.length) {
          setPointer(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true },
    );
    const release = function () {
      pointer.active = false;
    };
    window.addEventListener("touchend", release, { passive: true });
    window.addEventListener("touchcancel", release, { passive: true });
    document.addEventListener("mouseleave", release);
    window.addEventListener("blur", release);
  }

  /* ---------- Simulation ---------- */
  function step(dt) {
    // Ease pointer position and strength
    // (1 - (1 - rate)^dt keeps the easing identical at any frame rate)
    const follow = 1 - Math.pow(1 - 0.35, dt);
    pointer.x += (pointer.tx - pointer.x) * follow;
    pointer.y += (pointer.ty - pointer.y) * follow;
    const targetStrength = pointer.active ? 1 : 0;
    pointer.strength +=
      (targetStrength - pointer.strength) * (1 - Math.pow(1 - 0.1, dt));

    const damp = 1 - Math.pow(1 - 0.04, dt);
    const usePointer = pointer.strength > 0.01;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Gentle repel: nudges velocity, which then eases back to the drift
      if (usePointer) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_RADIUS_SQ && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force =
            ((POINTER_RADIUS - d) / POINTER_RADIUS) * 0.12 * pointer.strength;
          p.vx += (dx / d) * force * dt;
          p.vy += (dy / d) * force * dt;
        }
      }

      p.vx += (p.bx - p.vx) * damp;
      p.vy += (p.by - p.vy) * damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Soft bounce at the edges
      if (p.x < 0) {
        p.x = 0;
        p.bx = Math.abs(p.bx);
        p.vx = Math.abs(p.vx);
      } else if (p.x > width) {
        p.x = width;
        p.bx = -Math.abs(p.bx);
        p.vx = -Math.abs(p.vx);
      }
      if (p.y < 0) {
        p.y = 0;
        p.by = Math.abs(p.by);
        p.vy = Math.abs(p.vy);
      } else if (p.y > height) {
        p.y = height;
        p.by = -Math.abs(p.by);
        p.vy = -Math.abs(p.vy);
      }
    }
  }

  /* ---------- Rendering (batched) ---------- */
  const buckets = [];
  for (let b = 0; b < ALPHA_BUCKETS; b++) buckets.push([]);

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // 1. Faint white web between nearby stars, grouped by opacity
    for (let b = 0; b < ALPHA_BUCKETS; b++) buckets[b].length = 0;
    const n = particles.length;
    for (let a = 0; a < n; a++) {
      const pa = particles[a];
      for (let c = a + 1; c < n; c++) {
        const pc = particles[c];
        const dx = pa.x - pc.x;
        const dy = pa.y - pc.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST_SQ) {
          const k = Math.min(
            ALPHA_BUCKETS - 1,
            Math.floor((1 - d2 / LINK_DIST_SQ) * ALPHA_BUCKETS),
          );
          buckets[k].push(pa.x, pa.y, pc.x, pc.y);
        }
      }
    }
    ctx.lineWidth = 0.5;
    for (let b = 0; b < ALPHA_BUCKETS; b++) {
      const segs = buckets[b];
      if (!segs.length) continue;
      ctx.strokeStyle =
        "rgba(232, 232, 232, " + (((b + 0.5) / ALPHA_BUCKETS) * 0.15) + ")";
      ctx.beginPath();
      for (let s = 0; s < segs.length; s += 4) {
        ctx.moveTo(segs[s], segs[s + 1]);
        ctx.lineTo(segs[s + 2], segs[s + 3]);
      }
      ctx.stroke();
    }

    // 2. Blue lines to the pointer (fade with pointer strength)
    if (pointer.strength > 0.01) {
      for (let b = 0; b < ALPHA_BUCKETS; b++) buckets[b].length = 0;
      for (let a = 0; a < n; a++) {
        const p = particles[a];
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_RADIUS_SQ) {
          const k = Math.min(
            ALPHA_BUCKETS - 1,
            Math.floor((1 - d2 / POINTER_RADIUS_SQ) * ALPHA_BUCKETS),
          );
          buckets[k].push(p.x, p.y);
        }
      }
      ctx.lineWidth = 1.2;
      for (let b = 0; b < ALPHA_BUCKETS; b++) {
        const pts = buckets[b];
        if (!pts.length) continue;
        const alpha =
          ((b + 0.5) / ALPHA_BUCKETS) * 0.9 * pointer.strength;
        ctx.strokeStyle = "rgba(0, 123, 255, " + alpha + ")";
        ctx.beginPath();
        for (let s = 0; s < pts.length; s += 2) {
          ctx.moveTo(pts[s], pts[s + 1]);
          ctx.lineTo(pointer.x, pointer.y);
        }
        ctx.stroke();
      }
    }

    // 3. Stars, all in a single path
    ctx.fillStyle = "rgba(232, 232, 232, 0.8)";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      ctx.moveTo(p.x + p.size, p.y);
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  /* ---------- Loop ---------- */
  let last = 0;
  function frame(now) {
    // dt is in "60fps frames": 1 at 60Hz, 0.5 at 120Hz. Clamped so a
    // long pause (tab switch) doesn't make stars jump.
    const dt = last ? Math.min(3, Math.max(0.25, (now - last) / 16.667)) : 1;
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    last = 0; // reset the clock when coming back to the tab
  });

  resize();
  canvas.classList.add("is-ready");
  if (reduceMotion) {
    draw();
  } else {
    requestAnimationFrame(frame);
  }
})();
