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
    clearNotice();
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

/* ---------------------------------------------
   Inline messages (instead of browser pop-ups)
--------------------------------------------- */
function noticeBox() {
  let box = document.querySelector("#form .auth-alert");
  if (!box) {
    box = document.createElement("div");
    box.className = "auth-alert";
    box.setAttribute("role", "alert");
    box.setAttribute("aria-live", "assertive");
    box.hidden = true;
    const primary = document.querySelector("#form .auth-btn:not(.ghost)");
    if (primary) primary.insertAdjacentElement("beforebegin", box);
    else document.getElementById("form")?.appendChild(box);
  }
  return box;
}

export function clearNotice() {
  const box = document.querySelector("#form .auth-alert");
  if (box) box.hidden = true;
  document
    .querySelectorAll("#form .field.is-invalid")
    .forEach((f) => f.classList.remove("is-invalid"));
}

/**
 * Shows a message in the form. `fieldIds` (optional) highlights the
 * inputs the message is about.
 */
export function notify(message, fieldIds = []) {
  const box = noticeBox();
  box.innerHTML = "";
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-circle-exclamation";
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.textContent = message;
  box.append(icon, text);
  box.hidden = false;
  // restart the entrance animation
  box.style.animation = "none";
  void box.offsetWidth;
  box.style.animation = "";

  fieldIds.forEach((id) => {
    const field = document.getElementById(id)?.closest(".field");
    if (field) field.classList.add("is-invalid");
  });

  const shell = document.querySelector(".auth-shell");
  if (shell) {
    shell.classList.remove("auth-shake");
    void shell.offsetWidth;
    shell.classList.add("auth-shake");
    setTimeout(() => shell.classList.remove("auth-shake"), 500);
  }

  // make sure the message is visible on small screens
  if (box.getBoundingClientRect().top < 80 || box.getBoundingClientRect().bottom > window.innerHeight) {
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/* ---------------------------------------------
   Show / hide password buttons + clear errors while typing
--------------------------------------------- */
function enhanceForm() {
  document.querySelectorAll('#form input[type="password"]').forEach((input) => {
    const wrap = input.closest(".input-wrap");
    if (!wrap || wrap.querySelector(".pw-toggle")) return;
    wrap.classList.add("has-toggle");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle";
    btn.setAttribute("aria-label", "Show password");
    btn.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i>';
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.innerHTML = `<i class="fa-regular ${show ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
      input.focus({ preventScroll: true });
    });
    wrap.appendChild(btn);
  });

  document.querySelectorAll("#form input, #form select").forEach((el) => {
    el.addEventListener("input", () => el.closest(".field")?.classList.remove("is-invalid"));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceForm);
} else {
  enhanceForm();
}

/* ---------------------------------------------
   Validation + friendlier Firebase error messages
--------------------------------------------- */
const LABELS = {
  email: "email",
  fullName: "full name",
  phoneNumber: "phone number",
  password: "password",
  confirmPassword: "password confirmation",
};

/** Returns false (and shows a message) if any of the given inputs are empty. */
export function checkRequired(ids) {
  const missing = ids.filter((id) => {
    const el = document.getElementById(id);
    return el && !el.value.trim();
  });
  if (!missing.length) return true;
  const names = missing.map((id) => LABELS[id] || id);
  const list =
    names.length === 1
      ? names[0]
      : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  notify("Please fill in your " + list + ".", missing);
  document.getElementById(missing[0])?.focus({ preventScroll: true });
  return false;
}

export function friendlyError(error) {
  const code = (error && error.code) || "";
  const messages = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
    "auth/weak-password": "Please choose a stronger password (at least 6 characters).",
    "auth/missing-password": "Please enter your password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Can't reach the server. Check your internet connection and try again.",
    "auth/user-disabled": "This account has been disabled. Please contact the club.",
    "auth/invalid-credential": "Incorrect email or password. Please try again.",
  };
  return messages[code] || "Error: " + ((error && error.message) || "Something went wrong.");
}
