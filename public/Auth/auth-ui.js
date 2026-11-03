/* =====================================================
   Small UI helpers shared by the sign-in / sign-up pages
   ===================================================== */

/**
 * Wraps an async click handler so the button shows a loading state,
 * can't be double-clicked while the request is running, and always
 * resets afterwards (even if the handler returns early or throws).
 */
export function withLoading(button, handler) {
  return async (event) => {
    if (button.classList.contains("is-loading")) return;
    button.classList.add("is-loading");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      await handler(event);
    } finally {
      button.classList.remove("is-loading");
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };
}

/** Pressing Enter in any input on the form triggers the main button. */
export function submitOnEnter(button) {
  document.querySelectorAll("#form input").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        button.click();
      }
    });
  });
}
