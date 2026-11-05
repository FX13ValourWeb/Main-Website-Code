/* FX-13 VALOUR · LEARN HUB */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // progress on each course card (saved by the course page)
  document.querySelectorAll("[data-progress-key]").forEach((card) => {
    let done = 0;
    const total = Number(card.dataset.total) || 1;
    try {
      const saved = JSON.parse(localStorage.getItem(card.dataset.progressKey) || "null");
      if (saved && Array.isArray(saved.done)) done = new Set(saved.done).size;
    } catch (e) {}
    done = Math.min(done, total);
    const label = card.querySelector(".cc-progress span:last-child");
    const cta = card.querySelector(".cc-cta span");
    card.style.setProperty("--done", String(done / total));
    if (done >= total) {
      label.textContent = "Completed";
      cta.textContent = "Review course";
    } else if (done > 0) {
      label.textContent = `${done} of ${total} chapters`;
      cta.textContent = "Continue";
    }
  });

  // draw the card circuits when they come into view
  const cards = document.querySelectorAll(".course-card");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.35 },
    );
    cards.forEach((c) => io.observe(c));
  } else {
    cards.forEach((c) => c.classList.add("is-in"));
  }

  // gentle tilt toward the pointer
  if (finePointer && !reduce) {
    document.querySelectorAll("a.course-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--tilt-y", `${(x * 3).toFixed(2)}deg`);
        card.style.setProperty("--tilt-x", `${(-y * 3).toFixed(2)}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  // fade to dark before opening a course, so its intro picks up seamlessly
  document.querySelectorAll("a.course-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduce) return;
      e.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(() => { window.location.href = card.href; }, 430);
    });
  });
  // coming back with the back button: lift the veil again
  window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
})();
