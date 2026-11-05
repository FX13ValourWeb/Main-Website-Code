/* =====================================================
   FX-13 VALOUR · LEARN — ESP32 code sandbox
   Runs a beginner-friendly subset of Arduino C++ in the browser
   on a virtual ESP32 + breadboard.
   ===================================================== */

const LESSONS = [
  {
    title: "Blink",
    task: "<b>Your first program.</b> It switches the blue LED on pin 2 on and off. Press <b>Run</b>.",
    challenge: "Challenge: make it blink twice as fast.",
    code: `// Lesson 1: Blink
// The blue LED on the board is connected to pin 2.

void setup() {
  pinMode(2, OUTPUT);      // pin 2 will send power out
}

void loop() {
  digitalWrite(2, HIGH);   // LED on
  delay(500);              // wait 500 milliseconds
  digitalWrite(2, LOW);    // LED off
  delay(500);
}
`,
  },
  {
    title: "Button",
    task: "<b>Read an input.</b> The button on pin 15 lights the red LED on pin 4. Run it, then hold the button.",
    challenge: "Challenge: make the LED turn OFF while the button is held.",
    code: `// Lesson 2: Button
// Button on pin 15, red LED on pin 4.

void setup() {
  pinMode(15, INPUT_PULLUP);  // reads HIGH until pressed
  pinMode(4, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int state = digitalRead(15);

  if (state == LOW) {         // pressed
    digitalWrite(4, HIGH);
  } else {
    digitalWrite(4, LOW);
  }
  delay(20);
}
`,
  },
  {
    title: "Knob dimmer",
    task: "<b>Analog in, PWM out.</b> Turn the knob (pin 34) to set the red LED's brightness. Watch the numbers in the Serial monitor.",
    challenge: "Challenge: print the voltage too — it's value × 3.3 / 4095.",
    code: `// Lesson 3: Knob dimmer
// Knob on pin 34 (0–4095) controls the LED on pin 4 (0–255).

void setup() {
  pinMode(4, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int value = analogRead(34);
  int brightness = map(value, 0, 4095, 0, 255);

  analogWrite(4, brightness);

  Serial.print("knob: ");
  Serial.print(value);
  Serial.print("  brightness: ");
  Serial.println(brightness);
  delay(200);
}
`,
  },
  {
    title: "Free play",
    task: "<b>Build anything.</b> Both LEDs, the button and the knob are yours. Try a reaction game or a light show.",
    challenge: "Idea: blink faster the further you turn the knob.",
    code: `// Free play
// Pins: 2 = blue LED, 4 = red LED, 15 = button, 34 = knob

void setup() {
  pinMode(2, OUTPUT);
  pinMode(4, OUTPUT);
  pinMode(15, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.println("Hello from the ESP32!");
}

void loop() {
  int speed = map(analogRead(34), 0, 4095, 50, 600);

  digitalWrite(2, HIGH);
  digitalWrite(4, LOW);
  delay(speed);
  digitalWrite(2, LOW);
  digitalWrite(4, HIGH);
  delay(speed);
}
`,
  },
];

/* ---------- syntax highlighting ---------- */
const KW = /\b(void|int|long|float|double|bool|boolean|byte|char|String|unsigned|const|if|else|for|while|do|return|break|continue|true|false|switch|case|default)\b/;
const CONST = /\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN)\b/;
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function highlight(src) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    const [t, com, str, num, fn, word] = m;
    if (com) out += `<span class="c">${esc(com)}</span>`;
    else if (str) out += `<span class="s">${esc(str)}</span>`;
    else if (num) out += `<span class="n">${num}</span>`;
    else if (fn) out += KW.test(fn) ? `<span class="k">${fn}</span>` : `<span class="f">${fn}</span>`;
    else if (word) out += KW.test(word) ? `<span class="k">${word}</span>` : CONST.test(word) ? `<span class="n">${word}</span>` : esc(word);
    last = m.index + t.length;
  }
  return out + esc(src.slice(last));
}

/* =====================================================
   ARDUINO-SUBSET → ASYNC JAVASCRIPT
   ===================================================== */
class CodeError extends Error {
  constructor(msg, line) {
    super(msg);
    this.line = line;
  }
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

function checkBalance(src) {
  // ignores brackets inside strings/comments
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const re = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[()[\]{}]/g;
  let m;
  while ((m = re.exec(src))) {
    const c = m[0];
    if (c.length > 1) continue;
    if ("([{".includes(c)) stack.push([c, m.index]);
    else {
      const top = stack.pop();
      if (!top || top[0] !== pairs[c]) throw new CodeError(`There's an extra "${c}" here, or a bracket before it was never closed.`, lineOf(src, m.index));
    }
  }
  if (stack.length) {
    const [c, i] = stack.pop();
    throw new CodeError(`This "${c}" is never closed. Every "${c}" needs a matching "${{ "(": ")", "[": "]", "{": "}" }[c]}".`, lineOf(src, i));
  }
}

const TYPES = "(?:unsigned\\s+(?:int|long|char)|long\\s+long|int|long|float|double|bool|boolean|byte|char|String|uint8_t|uint16_t|uint32_t|int8_t|int16_t|int32_t|size_t|word)";

// C++ needs a ";" after every statement (JavaScript would quietly accept it)
function checkSemicolons(src) {
  const clean = src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
  const L = clean.split("\n");
  for (let i = 0; i < L.length; i++) {
    const line = L[i].trim();
    if (!line || line.startsWith("#")) continue;
    // "...) }" on one line, e.g.  void loop(){ digitalWrite(2, HIGH) }
    if (!/=\s*\{/.test(line) && /[\w)\]"']\s*\}/.test(line.replace(/^\s*\}/, ""))) {
      throw new CodeError('Missing ";" before the "}" on this line. In C++ every statement ends with a semicolon.', i + 1);
    }
    if (/^(if|else|for|while|do|switch|case|default)\b/.test(line) && !/;\s*$/.test(line)) continue;
    if (/[;{},:(+\-*/%&|=<>!?]$/.test(line)) continue;
    if (!/[\w)\]"']$/.test(line)) continue;
    // the next meaningful character decides it
    let next = "";
    for (let j = i + 1; j < L.length && !next; j++) next = L[j].trim()[0] || "";
    if (next === "{" || next === "." || next === "+" || next === "-" || next === "*" || next === "/" || next === "?" || next === ":" || next === "&" || next === "|" || next === ")") continue;
    if (/^(void|int|long|float|double|bool|boolean|byte|char|String|unsigned)\b.*\)$/.test(line)) continue; // function header before "{"
    throw new CodeError('Missing ";" at the end of this line. In C++ every statement ends with a semicolon.', i + 1);
  }
}

function transpile(src) {
  checkBalance(src);
  checkSemicolons(src);
  if (!/\bvoid\s+setup\s*\(\s*\)/.test(src)) throw new CodeError("Your program needs a  void setup() { … }  function.", 1);
  if (!/\bvoid\s+loop\s*\(\s*\)/.test(src)) throw new CodeError("Your program needs a  void loop() { … }  function.", 1);

  // keep line numbers: blank out comments, protect strings
  let code = src
    .replace(/^[ \t]*#include[^\n]*/gm, "")
    .replace(/^[ \t]*#define[ \t]+([A-Za-z_]\w*)[ \t]+([^\n]+)/gm, (m, name, val) => `const ${name} = ${val.replace(/\/\/.*$/, "").trim()};`).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, "");
  const strings = [];
  code = code.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])'/g, (s) => {
    strings.push(s.startsWith("'") ? JSON.stringify(s.slice(1, -1)) : s);
    return `__S${strings.length - 1}__`;
  });

  // user functions → async functions (parameter types removed)
  const userFns = [];
  code = code.replace(new RegExp(`\\b(?:void|${TYPES})\\s+([A-Za-z_]\\w*)\\s*\\(([^)]*)\\)\\s*\\{`, "g"), (m, name, params) => {
    userFns.push(name);
    const names = params
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && p !== "void")
      .map((p) => p.replace(/=.*$/, "").trim().split(/[\s*&]+/).pop());
    return `async function ${name}(${names.join(", ")}) {`;
  });

  // declarations → let
  code = code.replace(new RegExp(`\\b(?:static\\s+)?(?:const\\s+)?${TYPES}\\s+(?=[A-Za-z_])`, "g"), "let ");
  code = code.replace(/\blet\s+([A-Za-z_]\w*)\s*\[\s*\d*\s*\]\s*=\s*\{([^}]*)\}/g, "let $1 = [$2]");
  code = code.replace(/\blet\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]\s*;/g, "let $1 = new Array($2).fill(0);");
  // C-style casts like (int) x
  code = code.replace(new RegExp(`\\(\\s*${TYPES}\\s*\\)`, "g"), "");

  // Serial + timing
  code = code.replace(/\bSerial\s*\./g, "__serial.");
  code = code.replace(/\bdelay\s*\(/g, "await __delay(");
  code = code.replace(/\bdelayMicroseconds\s*\(/g, "await __delayUs(");

  // calls to the user's own functions must be awaited
  for (const fn of userFns) {
    code = code.replace(new RegExp(`(^|[^\\w.])(?<!function\\s)(${fn})\\s*\\(`, "g"), (m, pre, name) => `${pre}await ${name}(`);
  }

  // make every loop body yield to the browser so pages never freeze
  let out = "";
  let i = 0;
  const loopRe = /\b(while|for)\s*\(/g;
  let lm;
  while ((lm = loopRe.exec(code))) {
    let j = lm.index + lm[0].length;
    let depth = 1;
    while (j < code.length && depth) {
      if (code[j] === "(") depth++;
      else if (code[j] === ")") depth--;
      j++;
    }
    let k = j;
    while (k < code.length && /\s/.test(code[k])) k++;
    if (code[k] === "{") {
      out += code.slice(i, k + 1) + " await __yield();";
      i = k + 1;
    } else if (code[k] === ";") {
      // e.g. while (digitalRead(15) == HIGH);  → wait in a loop
      out += code.slice(i, k) + "{ await __yield(); }";
      i = k + 1;
    }
    loopRe.lastIndex = Math.max(loopRe.lastIndex, k);
  }
  code = out + code.slice(i);

  code = code.replace(/__S(\d+)__/g, (m, n) => strings[Number(n)]);
  return code;
}

/* =====================================================
   VIRTUAL BENCH (SVG)
   ===================================================== */
const TOP_ROW = ["5V", "CMD", "D3", "D2", "13", "GND", "12", "14", "27", "26", "25", "33", "32", "35", "34", "VN", "VP", "EN", "3V3"];
const BOT_ROW = ["CLK", "D0", "D1", "15", "2", "0", "4", "16", "17", "5", "18", "19", "GND", "21", "RX", "TX", "22", "23", "GND"];

function buildBench(svg) {
  const accent = getComputedStyle(document.body).getPropertyValue("--accent-2").trim() || "#3d9bff";
  const ns = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent = svg, text) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    parent.appendChild(e);
    return e;
  };
  const defs = el("defs", {});
  const glow = (id, color) => {
    const g = el("radialGradient", { id }, defs);
    el("stop", { offset: "0%", "stop-color": color, "stop-opacity": "0.55" }, g);
    el("stop", { offset: "100%", "stop-color": color, "stop-opacity": "0" }, g);
  };
  glow("gBlue", "#3d9bff");
  glow("gRed", "#ff4545");

  // breadboard
  el("rect", { class: "bb", x: 14, y: 190, width: 492, height: 156, rx: 6 });
  for (const [y, neg] of [[200, false], [206, true], [330, false], [336, true]]) el("line", { class: `bb-rail${neg ? " neg" : ""}`, x1: 26, y1: y, x2: 494, y2: y });
  el("rect", { x: 14, y: 263, width: 492, height: 10, fill: "#d9d2c2" });
  for (let r = 0; r < 10; r++)
    for (let c = 0; c < 38; c++) {
      const y = 218 + r * 12 + (r >= 5 ? 14 : 0);
      el("rect", { class: "bb-hole", x: 28 + c * 12.4, y, width: 4, height: 4, rx: 0.8 });
    }

  // ESP32 board (top view, horizontal; antenna on the right)
  const bx = 34;
  const by = 30;
  const bw = 300;
  const bh = 128;
  el("rect", { class: "pcb", x: bx, y: by, width: bw, height: bh, rx: 4 });
  el("rect", { x: bx + bw - 108, y: by + 18, width: 118, height: bh - 36, rx: 2, fill: "#14181d" });
  el("rect", { class: "can", x: bx + bw - 102, y: by + 26, width: 82, height: bh - 52, rx: 2 });
  el("text", { class: "can-text", x: bx + bw - 94, y: by + 58 }, svg, "ESP32-WROOM-32");
  el("text", { class: "can-text", x: bx + bw - 94, y: by + 72, style: "font-weight:400" }, svg, "240 MHz · Wi-Fi");
  // antenna meander
  el("path", { d: `M${bx + bw - 12} ${by + 30} h10 v8 h-10 v8 h10 v8 h-10 v8 h10 v8 h-10 v8 h10 v8 h-10`, fill: "none", stroke: "#d8b25a", "stroke-width": 2 });
  // USB
  el("rect", { x: bx - 10, y: by + bh / 2 - 16, width: 26, height: 32, rx: 2, fill: "#b8bec6" });
  // chips
  el("rect", { x: bx + 60, y: by + 46, width: 30, height: 30, rx: 2, fill: "#1b1e23" });
  el("text", { class: "silk", x: bx + 62, y: by + 64 }, svg, "CP2102");
  el("rect", { x: bx + 110, y: by + 82, width: 36, height: 20, rx: 2, fill: "#1b1e23" });
  el("text", { class: "silk", x: bx + 113, y: by + 95 }, svg, "AMS1117");
  // buttons
  for (const [y, t] of [[by + 22, "EN"], [by + bh - 40, "BOOT"]]) {
    el("rect", { x: bx + 24, y, width: 22, height: 18, rx: 2, fill: "#d9dde2" });
    el("circle", { cx: bx + 35, cy: y + 9, r: 5, fill: "#1b1d21" });
    el("text", { class: "silk", x: bx + 50, y: y + 12 }, svg, t);
  }
  // on-board LEDs
  el("rect", { x: bx + 110, y: by + 34, width: 10, height: 6, fill: "#ff3b3b" });
  el("text", { class: "silk", x: bx + 106, y: by + 30 }, svg, "PWR");
  const ledG2 = el("circle", { class: "led-glow", cx: bx + 145, cy: by + 37, r: 16, fill: "url(#gBlue)", opacity: 0 });
  const led2 = el("rect", { class: "led-body", x: bx + 140, y: by + 34, width: 10, height: 6, fill: "#1d3350" });
  el("text", { class: "silk", x: bx + 139, y: by + 30 }, svg, "IO2");

  // header pads + labels
  const padX = (i) => bx + 22 + i * 14.4;
  const pinPos = {};
  TOP_ROW.forEach((name, i) => {
    el("circle", { class: "pin-pad", cx: padX(i), cy: by + 8, r: 3.2 });
    el("text", { class: "silk", x: padX(i), y: by + 20, "text-anchor": "middle", style: "font-size:6px" }, svg, name);
    pinPos["T" + name + (name === "GND" ? i : "")] = [padX(i), by + 8];
  });
  BOT_ROW.forEach((name, i) => {
    el("circle", { class: "pin-pad", cx: padX(i), cy: by + bh - 8, r: 3.2 });
    el("text", { class: "silk", x: padX(i), y: by + bh - 15, "text-anchor": "middle", style: "font-size:6px" }, svg, name);
    pinPos["B" + name + (name === "GND" ? i : "")] = [padX(i), by + bh - 8];
  });

  // wires
  const wire = (pts, color) => el("polyline", { class: "wire-j", points: pts.map((p) => p.join(",")).join(" "), stroke: color });
  const [p4x, p4y] = pinPos.B4;
  const [p15x, p15y] = pinPos.B15;
  const [pgx, pgy] = pinPos.BGND12;
  const [p34x, p34y] = pinPos.T34;
  const [p3x, p3y] = pinPos.T3V3;
  wire([[p4x, p4y], [p4x, 176], [150, 176], [150, 230]], "#f5b84a");
  wire([[p15x, p15y], [p15x, 172], [96, 172], [96, 288], [270, 288]], accent);
  wire([[pgx, pgy], [pgx, 180], [470, 180], [470, 206]], "#2a2f37");
  wire([[p34x, p34y], [p34x, 14], [478, 14], [478, 236], [420, 236]], "#31d07f");
  wire([[p3x, p3y], [p3x, 22], [490, 22], [490, 200]], "#e04848");

  // resistor + red LED (GPIO 4)
  el("rect", { x: 144, y: 230, width: 12, height: 34, rx: 4, fill: "#d8c3a0", stroke: "#9b8562" });
  for (const [y, c] of [[236, "#7a4a2a"], [242, "#111"], [248, "#c0392b"], [256, "#c8a24a"]]) el("rect", { x: 144, y, width: 12, height: 3, fill: c });
  el("line", { x1: 150, y1: 264, x2: 150, y2: 300, stroke: "#9aa0a8", "stroke-width": 2 });
  const ledG4 = el("circle", { class: "led-glow", cx: 186, cy: 300, r: 30, fill: "url(#gRed)", opacity: 0 });
  el("line", { x1: 150, y1: 300, x2: 178, y2: 300, stroke: "#9aa0a8", "stroke-width": 2 });
  el("line", { x1: 194, y1: 300, x2: 210, y2: 300, stroke: "#9aa0a8", "stroke-width": 2 });
  el("line", { x1: 210, y1: 300, x2: 210, y2: 336, stroke: "#9aa0a8", "stroke-width": 2 });
  const led4 = el("circle", { class: "led-body", cx: 186, cy: 300, r: 10, fill: "#5a1d1d", stroke: "#2a0d0d" });
  el("text", { class: "silk", x: 172, y: 324, style: "fill:#4a4438" }, svg, "LED · 4");

  // push button (GPIO 15)
  el("rect", { x: 270, y: 272, width: 34, height: 34, rx: 3, fill: "#2a2d33" });
  const btnCap = el("circle", { cx: 287, cy: 289, r: 10, fill: "#cfd3d8" });
  el("line", { x1: 304, y1: 300, x2: 330, y2: 300, stroke: "#9aa0a8", "stroke-width": 2 });
  el("line", { x1: 330, y1: 300, x2: 330, y2: 336, stroke: "#9aa0a8", "stroke-width": 2 });
  el("text", { class: "silk", x: 264, y: 324, style: "fill:#4a4438" }, svg, "BTN · 15");

  // potentiometer (GPIO 34)
  el("rect", { x: 396, y: 222, width: 52, height: 52, rx: 4, fill: "#2f6fd6" });
  const knob = el("g", { transform: "rotate(0 422 248)" });
  el("circle", { cx: 422, cy: 248, r: 18, fill: "#e8ecf1" }, knob);
  el("line", { x1: 422, y1: 248, x2: 422, y2: 233, stroke: "#1b1d21", "stroke-width": 3, "stroke-linecap": "round" }, knob);
  el("text", { class: "silk", x: 396, y: 290, style: "fill:#4a4438" }, svg, "KNOB · 34");

  return {
    setLed(pin, level) {
      const b = Math.max(0, Math.min(1, level / 255));
      if (pin === 2) {
        led2.setAttribute("fill", b > 0.02 ? `rgba(61,155,255,${0.35 + b * 0.65})` : "#1d3350");
        ledG2.setAttribute("opacity", (b * 0.9).toFixed(2));
      }
      if (pin === 4) {
        led4.setAttribute("fill", b > 0.02 ? `rgb(${120 + b * 135},${30 + b * 40},${30 + b * 30})` : "#5a1d1d");
        ledG4.setAttribute("opacity", (b * 0.95).toFixed(2));
      }
    },
    setButton(down) {
      btnCap.setAttribute("r", down ? 8.5 : 10);
      btnCap.setAttribute("fill", down ? accent : "#cfd3d8");
    },
    setKnob(v) {
      knob.setAttribute("transform", `rotate(${-135 + (v / 4095) * 270} 422 248)`);
    },
  };
}

/* =====================================================
   RUNTIME
   ===================================================== */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
class StopSignal extends Error {}

export function initSandbox(root) {
  if (!root) return;
  const tabs = root.querySelector(".sb-lessons");
  const taskEl = root.querySelector(".sb-task");
  const ta = root.querySelector(".sb-code");
  const hl = root.querySelector(".sb-highlight code");
  const lines = root.querySelector(".sb-lines");
  const runBtn = root.querySelector(".run");
  const stopBtn = root.querySelector(".stop");
  const resetBtn = root.querySelector(".reset");
  const serialOut = root.querySelector(".sb-serial-out");
  const pushBtn = root.querySelector(".sb-push");
  const pot = root.querySelector(".sb-pot input");
  const bench = buildBench(root.querySelector(".bench"));

  const STORE = "fx13-learn-esp32-code";
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORE)) || {};
  } catch (e) {}
  let lesson = 0;

  /* ----- editor ----- */
  function refresh(errLine) {
    const src = ta.value;
    let html = highlight(src);
    if (errLine) {
      const parts = html.split("\n");
      if (parts[errLine - 1] != null) parts[errLine - 1] = `<span class="err-line">${parts[errLine - 1] || " "}</span>`;
      html = parts.join("\n");
    }
    hl.innerHTML = html + "\n";
    const n = src.split("\n").length;
    lines.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  }
  ta.addEventListener("input", () => {
    refresh();
    saved[lesson] = ta.value;
    try {
      localStorage.setItem(STORE, JSON.stringify(saved));
    } catch (e) {}
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = ta.selectionStart;
      ta.setRangeText("  ", s, ta.selectionEnd, "end");
      ta.dispatchEvent(new Event("input"));
    }
    if (e.key === "Enter") {
      // keep indentation
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
      const indent = ta.value.slice(lineStart).match(/^\s*/)[0];
      const extra = ta.value[s - 1] === "{" ? "  " : "";
      e.preventDefault();
      ta.setRangeText("\n" + indent + extra, s, ta.selectionEnd, "end");
      ta.dispatchEvent(new Event("input"));
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });

  function selectLesson(i) {
    stop();
    lesson = i;
    [...tabs.children].forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
    const L = LESSONS[i];
    taskEl.innerHTML = `${L.task}<br><span class="challenge">${L.challenge}</span>`;
    ta.value = saved[i] ?? L.code;
    refresh();
  }
  LESSONS.forEach((L, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.innerHTML = `<b>LESSON ${String(i + 1).padStart(2, "0")}</b>${L.title}`;
    b.addEventListener("click", () => selectLesson(i));
    tabs.appendChild(b);
  });
  resetBtn.addEventListener("click", () => {
    stop();
    delete saved[lesson];
    try {
      localStorage.setItem(STORE, JSON.stringify(saved));
    } catch (e) {}
    ta.value = LESSONS[lesson].code;
    refresh();
  });

  /* ----- serial ----- */
  let serialLines = 0;
  function serialWrite(text, cls) {
    const atBottom = serialOut.scrollTop + serialOut.clientHeight >= serialOut.scrollHeight - 4;
    if (cls) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      serialOut.appendChild(s);
    } else serialOut.appendChild(document.createTextNode(text));
    serialLines += (text.match(/\n/g) || []).length;
    // keep the monitor light
    while (serialOut.childNodes.length > 400) serialOut.removeChild(serialOut.firstChild);
    if (atBottom) serialOut.scrollTop = serialOut.scrollHeight;
  }
  root.querySelector(".sb-clear").addEventListener("click", () => (serialOut.textContent = ""));

  /* ----- inputs ----- */
  let buttonDown = false;
  const setBtn = (d) => {
    buttonDown = d;
    pushBtn.classList.toggle("is-down", d);
    bench.setButton(d);
  };
  pushBtn.addEventListener("pointerdown", (e) => {
    pushBtn.setPointerCapture?.(e.pointerId);
    setBtn(true);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => pushBtn.addEventListener(t, () => setBtn(false)));
  pushBtn.addEventListener("keydown", (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), setBtn(true)));
  pushBtn.addEventListener("keyup", () => setBtn(false));
  const potFill = () => pot.style.setProperty("--fill", (pot.value / 4095) * 100 + "%");
  pot.addEventListener("input", () => {
    bench.setKnob(Number(pot.value));
    potFill();
  });
  bench.setKnob(Number(pot.value));
  potFill();

  /* ----- execution ----- */
  let running = false;
  let runId = 0;

  function resetPins() {
    for (const p of [2, 4]) bench.setLed(p, 0);
  }

  function makeApi(id) {
    const modes = {};
    const tips = new Set();
    let serialOn = false;
    const t0 = performance.now();
    let lastYield = performance.now();
    const alive = () => running && id === runId;
    const tip = (key, msg) => {
      if (tips.has(key)) return;
      tips.add(key);
      serialWrite(msg + "\n", "sys");
    };
    const num = (v, name) => {
      if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`${name} needs a number, but got "${v}".`);
      return v;
    };
    const fmt = (v, digits) => {
      if (typeof v === "number" && !Number.isInteger(v)) return v.toFixed(digits ?? 2);
      if (typeof v === "boolean") return v ? "1" : "0";
      return String(v);
    };
    const KNOWN = [2, 4, 15, 34];
    const api = {
      HIGH: 1,
      LOW: 0,
      INPUT: "INPUT",
      OUTPUT: "OUTPUT",
      INPUT_PULLUP: "INPUT_PULLUP",
      LED_BUILTIN: 2,
      pinMode(pin, mode) {
        num(pin, "pinMode()");
        modes[pin] = mode;
        if (!KNOWN.includes(pin)) tip("pin" + pin, `[tip] Pin ${pin} isn't connected to anything on this bench. Try 2, 4, 15 or 34.`);
        if (pin === 34 && mode === "OUTPUT") tip("in34", "[tip] On a real ESP32, pins 34–39 are input-only, so pin 34 can't be an OUTPUT.");
      },
      digitalWrite(pin, val) {
        num(pin, "digitalWrite()");
        if (modes[pin] !== "OUTPUT") tip("mode" + pin, `[tip] Call pinMode(${pin}, OUTPUT) in setup() before writing to pin ${pin}.`);
        bench.setLed(pin, val ? 255 : 0);
      },
      analogWrite(pin, val) {
        num(pin, "analogWrite()");
        num(val, "analogWrite()");
        bench.setLed(pin, Math.max(0, Math.min(255, Math.round(val))));
      },
      digitalRead(pin) {
        num(pin, "digitalRead()");
        if (pin === 15) {
          if (buttonDown) return 0;
          if (modes[15] === "INPUT_PULLUP") return 1;
          tip("float15", "[tip] Without INPUT_PULLUP, an unpressed button 'floats' and reads random values. Use pinMode(15, INPUT_PULLUP).");
          return Math.random() > 0.5 ? 1 : 0;
        }
        if (pin === 34) return Number(pot.value) > 2048 ? 1 : 0;
        return 0;
      },
      analogRead(pin) {
        num(pin, "analogRead()");
        if (pin !== 34) {
          tip("adc" + pin, `[tip] Only pin 34 has a knob attached on this bench.`);
          return 0;
        }
        const noise = Math.round((Math.random() - 0.5) * 6);
        return Math.max(0, Math.min(4095, Number(pot.value) + noise));
      },
      millis: () => Math.floor(performance.now() - t0),
      micros: () => Math.floor((performance.now() - t0) * 1000),
      map: (x, a, b, c, d) => Math.trunc(((x - a) * (d - c)) / (b - a) + c),
      constrain: (x, a, b) => Math.min(b, Math.max(a, x)),
      random: (a, b) => (b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a))),
      randomSeed() {},
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      pow: Math.pow,
      sqrt: Math.sqrt,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,
      sin: Math.sin,
      cos: Math.cos,
      String: (v) => String(v),
      __serial: {
        begin() {
          serialOn = true;
        },
        print(v, d) {
          if (!serialOn) tip("serial", "[tip] Call Serial.begin(115200) in setup() first.");
          serialWrite(fmt(v, d));
        },
        println(v = "", d) {
          if (!serialOn) tip("serial", "[tip] Call Serial.begin(115200) in setup() first.");
          serialWrite(fmt(v, d) + "\n");
        },
        available: () => 0,
      },
      async __delay(ms) {
        num(ms, "delay()");
        const end = performance.now() + Math.max(0, ms);
        while (performance.now() < end) {
          if (!alive()) throw new StopSignal();
          await new Promise((r) => setTimeout(r, Math.min(30, end - performance.now())));
        }
        lastYield = performance.now();
        if (!alive()) throw new StopSignal();
      },
      async __delayUs(us) {
        await api.__delay(us / 1000);
      },
      async __yield() {
        if (!alive()) throw new StopSignal();
        if (performance.now() - lastYield > 12) {
          await new Promise((r) => setTimeout(r, 0));
          lastYield = performance.now();
          if (!alive()) throw new StopSignal();
        }
      },
    };
    return api;
  }

  async function run() {
    stop();
    refresh();
    let js;
    try {
      js = transpile(ta.value);
    } catch (e) {
      serialWrite(`✖ Line ${e.line ?? "?"}: ${e.message}\n`, "err");
      refresh(e.line);
      return;
    }
    const id = ++runId;
    const api = makeApi(id);
    const names = Object.keys(api);
    let program;
    try {
      const factory = new AsyncFunction(...names, `"use strict";\n${js}\nreturn { setup, loop };`);
      program = await factory(...names.map((n) => api[n]));
    } catch (e) {
      serialWrite(`✖ The code couldn't be understood: ${e.message}. Check for a missing ";" or a typo.\n`, "err");
      return;
    }
    running = true;
    runBtn.disabled = true;
    stopBtn.disabled = false;
    root.classList.add("is-running");
    serialWrite(`— running ${LESSONS[lesson].title.toLowerCase()} —\n`, "sys");
    try {
      await program.setup();
      let n = 0;
      while (running && id === runId) {
        await program.loop();
        if (++n % 20 === 0) await new Promise((r) => setTimeout(r, 0));
        else await api.__yield();
      }
    } catch (e) {
      if (!(e instanceof StopSignal)) {
        const msg = e instanceof ReferenceError ? `${e.message.replace(" is not defined", "")} isn't defined. Did you spell it right, and declare it (e.g. int ${e.message.split(" ")[0]} = 0;)?` : e.message;
        serialWrite(`✖ ${msg}\n`, "err");
      }
    } finally {
      if (id === runId) stop();
    }
  }

  function stop() {
    if (running) serialWrite("— stopped —\n", "sys");
    running = false;
    runId++;
    runBtn.disabled = false;
    stopBtn.disabled = true;
    root.classList.remove("is-running");
    resetPins();
  }

  runBtn.addEventListener("click", run);
  stopBtn.addEventListener("click", stop);

  // pause the program when the sandbox scrolls far out of view (saves battery)
  new IntersectionObserver(([e]) => !e.isIntersecting && running && stop(), { rootMargin: "400px 0px" }).observe(root);

  selectLesson(0);
}

// exposed for testing
export { transpile };
