/* =====================================================
   FX-13 VALOUR · LEARN
   Procedural 3D model of an ESP32 DevKit (38-pin), built in code.
   Units: 1 = 1 mm.  x = board length (antenna end is +x),
   z = board width, y = up.
   ===================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const BLUE = 0x007bff;

/* Real 38-pin ESP32-DevKitC pin order, starting at the antenna end */
const PINS_LEFT = ["3V3", "EN", "VP", "VN", "34", "35", "32", "33", "25", "26", "27", "14", "12", "GND", "13", "D2", "D3", "CMD", "5V"];
const PINS_RIGHT = ["GND", "23", "22", "TX", "RX", "21", "GND", "19", "18", "5", "17", "16", "4", "0", "2", "15", "D1", "D0", "CLK"];

const BOARD = { L: 54, W: 28, T: 1.6 };
const PITCH = 2.54;
const ROW_Z = 12.7;
const PIN0_X = 22.86; // first pin (antenna end)

/* ---------- small helpers ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTexture(w, h, draw, { anisotropy = 8 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

const MONO = '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const SANS = '"Inter", "Segoe UI", Arial, sans-serif';

/* ---------- textures ---------- */
function pcbTexture() {
  const S = 40; // px per mm
  const W = Math.round(BOARD.L * S);
  const H = Math.round(BOARD.W * S);
  const mm = (x, z) => [(x + BOARD.L / 2) * S, (z + BOARD.W / 2) * S];
  return canvasTexture(W, H, (g) => {
    // solder mask
    g.fillStyle = "#0a0c10";
    g.fillRect(0, 0, W, H);

    // copper pour hatch (barely visible under the mask)
    g.strokeStyle = "rgba(60, 90, 130, 0.07)";
    g.lineWidth = 2;
    for (let i = -H; i < W; i += 22) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + H, H);
      g.stroke();
    }

    // routed traces: orthogonal + 45° runs between random points
    const r = rng(1307);
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 0; i < 70; i++) {
      let x = r() * W;
      let y = r() * H;
      g.strokeStyle = r() > 0.85 ? "rgba(0, 123, 255, 0.28)" : "rgba(120, 150, 190, 0.16)";
      g.lineWidth = 3 + Math.floor(r() * 3) * 2;
      g.beginPath();
      g.moveTo(x, y);
      const segs = 2 + Math.floor(r() * 4);
      for (let k = 0; k < segs; k++) {
        const dir = Math.floor(r() * 4);
        const len = 60 + r() * 260;
        if (dir === 0) x += len;
        else if (dir === 1) y += (r() > 0.5 ? 1 : -1) * len * 0.6;
        else if (dir === 2) {
          x += len * 0.7;
          y += (r() > 0.5 ? 1 : -1) * len * 0.7;
        } else x -= len;
        g.lineTo(x, y);
      }
      g.stroke();
      // via at the end
      g.fillStyle = "rgba(170, 180, 190, 0.45)";
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#0a0c10";
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }

    // header pads + pin labels
    g.textAlign = "center";
    g.textBaseline = "middle";
    const label = (txt, x, z, rot) => {
      const [px, py] = mm(x, z);
      g.save();
      g.translate(px, py);
      g.rotate(rot);
      g.fillStyle = "#e9edf2";
      g.font = `600 ${txt.length > 2 ? 30 : 34}px ${MONO}`;
      g.fillText(txt, 0, 0);
      g.restore();
    };
    for (let i = 0; i < 19; i++) {
      const x = PIN0_X - i * PITCH;
      for (const side of [-1, 1]) {
        const [px, py] = mm(x, side * ROW_Z);
        g.fillStyle = "#c9a24a";
        g.beginPath();
        g.arc(px, py, 0.95 * S, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#e6c46c";
        g.beginPath();
        g.arc(px, py, 0.8 * S, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#2a2116";
        g.beginPath();
        g.arc(px, py, 0.42 * S, 0, Math.PI * 2);
        g.fill();
        if (i === 0 && side === -1) {
          // square pad marks pin 1
          g.strokeStyle = "#e9edf2";
          g.lineWidth = 3;
          g.strokeRect(px - 1.05 * S, py - 1.05 * S, 2.1 * S, 2.1 * S);
        }
      }
      label(PINS_LEFT[i], x, -ROW_Z + 2.2, -Math.PI / 2);
      label(PINS_RIGHT[i], x, ROW_Z - 2.2, -Math.PI / 2);
    }

    // silkscreen outlines + text
    g.strokeStyle = "#e9edf2";
    g.lineWidth = 3;
    const box = (x0, z0, x1, z1) => {
      const [a, b] = mm(x0, z0);
      const [c, d] = mm(x1, z1);
      g.strokeRect(a, b, c - a, d - b);
    };
    box(-22.6, -4.4, -17.2, 4.4); // usb
    box(-14.2, -3.2, -8.6, 3.2); // cp2102
    box(-8, 5.4, -1.6, 9.6); // regulator
    box(-25.4 + 0.6, -BOARD.W / 2 + 0.6, BOARD.L / 2 - 0.6, BOARD.W / 2 - 0.6);

    g.fillStyle = "#e9edf2";
    g.textAlign = "left";
    g.font = `700 46px ${SANS}`;
    let [tx, ty] = mm(-15, -6.6);
    g.fillText("ESP32-DevKitC", tx, ty);
    g.font = `500 28px ${MONO}`;
    [tx, ty] = mm(-15, -5.1);
    g.fillText("38-PIN · 3V3 LOGIC", tx, ty);
    [tx, ty] = mm(-15, 6.1);
    g.fillStyle = "rgba(0, 123, 255, 0.95)";
    g.font = `700 30px ${MONO}`;
    g.fillText("FX-13 VALOUR · LEARN", tx, ty);
    g.fillStyle = "#e9edf2";
    g.font = `600 30px ${MONO}`;
    [tx, ty] = mm(-21.4, -7.3);
    g.fillText("EN", tx, ty);
    [tx, ty] = mm(-21.8, 8.9);
    g.fillText("BOOT", tx, ty);
    [tx, ty] = mm(-4.6, -9.2);
    g.fillText("PWR", tx, ty);
    [tx, ty] = mm(-0.4, -9.2);
    g.fillText("IO2", tx, ty);
  });
}

function shieldTexture() {
  return canvasTexture(1024, 1024, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#c9ced6");
    grad.addColorStop(0.5, "#eef1f5");
    grad.addColorStop(1, "#b9bfc8");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // brushed lines
    const r = rng(77);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.12})`;
      g.fillRect(0, y, w, 1);
      g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      g.fillRect(0, y + 1, w, 1);
    }
    // laser etching
    g.fillStyle = "rgba(40, 46, 56, 0.85)";
    g.textAlign = "left";
    g.font = `700 74px ${SANS}`;
    g.fillText("ESP32-WROOM-32", 80, 250);
    g.font = `500 44px ${MONO}`;
    g.fillText("Xtensa® LX6 ×2 · 240 MHz", 80, 340);
    g.fillText("Wi-Fi 802.11 b/g/n", 80, 410);
    g.fillText("Bluetooth · BLE", 80, 480);
    g.fillText("4 MB FLASH · 520 KB SRAM", 80, 550);
    g.strokeStyle = "rgba(40, 46, 56, 0.6)";
    g.lineWidth = 4;
    g.strokeRect(80, 640, 300, 300);
    // tiny 2D matrix code
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++)
        if (r() > 0.5) {
          g.fillStyle = "rgba(40,46,56,0.85)";
          g.fillRect(96 + x * 22, 656 + y * 22, 20, 20);
        }
    g.font = `500 36px ${MONO}`;
    g.fillText("FX13-LRN-001", 440, 800);
    g.fillText("3.3V · 80 mA", 440, 860);
  });
}

function chipTexture(lines, { bg = "#15171b", fg = "rgba(210,215,222,0.85)", dot = true } = {}) {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const r = rng(lines.join("").length * 31);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.03})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.fillStyle = fg;
    g.textAlign = "center";
    lines.forEach((t, i) => {
      g.font = i === 0 ? `700 72px ${SANS}` : `500 44px ${MONO}`;
      g.fillText(t, w / 2, h / 2 - (lines.length - 1) * 34 + i * 72);
    });
    if (dot) {
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.beginPath();
      g.arc(60, 60, 22, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/* =====================================================
   MODEL
   ===================================================== */
function buildBoard() {
  const root = new THREE.Group();
  const parts = {}; // id -> { group, anchor: Vector3 (local) }

  const mat = {
    mask: new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.55, metalness: 0.1 }),
    edge: new THREE.MeshStandardMaterial({ color: 0x1c2a22, roughness: 0.8 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.28, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.25, metalness: 1 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.65 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.45 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.6 }),
    tin: new THREE.MeshStandardMaterial({ color: 0xbfc4ca, roughness: 0.3, metalness: 1 }),
    button: new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.4, metalness: 0.6 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.5 }),
    modulePcb: new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.55 }),
  };

  const add = (parent, geo, material, x, y, z) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const part = (id, anchor) => {
    const g = new THREE.Group();
    g.name = id;
    root.add(g);
    parts[id] = { group: g, anchor: new THREE.Vector3(...anchor) };
    return g;
  };
  const top = BOARD.T / 2;

  /* PCB */
  const pcbTex = pcbTexture();
  const pcbMats = [mat.edge, mat.edge, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.5, metalness: 0.15 }), mat.mask, mat.edge, mat.edge];
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(BOARD.L, BOARD.T, BOARD.W), pcbMats);
  pcb.receiveShadow = true;
  pcb.castShadow = true;
  root.add(pcb);

  /* Header pins (under the board) */
  const pins = part("pins", [PIN0_X - 9 * PITCH, top + 0.2, ROW_Z]);
  const pinGeo = new THREE.BoxGeometry(0.64, 8.4, 0.64);
  const spacerGeo = new THREE.BoxGeometry(19 * PITCH, 2.5, 2.5);
  for (const side of [-1, 1]) {
    add(pins, spacerGeo, mat.plastic, PIN0_X - 9 * PITCH, -top - 1.25, side * ROW_Z);
    for (let i = 0; i < 19; i++) {
      add(pins, pinGeo, mat.gold, PIN0_X - i * PITCH, -top - 2.6, side * ROW_Z);
      // solder fillet on top
      add(pins, new THREE.CylinderGeometry(0.55, 0.85, 0.5, 12), mat.tin, PIN0_X - i * PITCH, top + 0.2, side * ROW_Z);
    }
  }

  /* ESP32-WROOM-32 module: its own PCB, antenna, shield can */
  const modX0 = 1.0;
  const modLen = 25.5;
  const modCx = modX0 + modLen / 2;
  const modPcb = add(root, new THREE.BoxGeometry(modLen, 0.8, 18), mat.modulePcb, modCx, top + 0.4, 0);
  modPcb.name = "modulePcb";

  // castellated gold pads along the module edges
  const padGeo = new THREE.BoxGeometry(0.9, 0.82, 0.5);
  for (let i = 0; i < 14; i++) {
    for (const side of [-1, 1]) add(root, padGeo, mat.gold, modX0 + 1.5 + i * 1.27, top + 0.4, side * 9);
  }

  // PCB antenna (meander trace on the module's end)
  const antenna = part("antenna", [modX0 + modLen - 3, top + 0.9, 0]);
  const antPath = [];
  const ax0 = modX0 + modLen - 5.6;
  for (let k = 0; k < 7; k++) {
    const z = -7 + k * 2.1;
    antPath.push([ax0, z], [ax0 + 4.6, z]);
    if (k < 6) antPath.push([ax0 + 4.6, z], [ax0 + 4.6, z + 2.1]);
  }
  for (let k = 0; k < antPath.length; k += 2) {
    const [x1, z1] = antPath[k];
    const [x2, z2] = antPath[k + 1];
    const len = Math.hypot(x2 - x1, z2 - z1) + 0.5;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(x1 === x2 ? 0.5 : len, 0.06, x1 === x2 ? len : 0.5), mat.gold);
    seg.position.set((x1 + x2) / 2, top + 0.83, (z1 + z2) / 2);
    antenna.add(seg);
  }

  // Inside the module (visible when the shield lifts): three selectable parts
  const socP = part("soc", [modX0 + 9.5, top + 2.0, -1.2]);
  add(socP, new THREE.BoxGeometry(5, 0.9, 5), [mat.chip, mat.chip, new THREE.MeshStandardMaterial({ map: chipTexture(["ESP32", "D0WDQ6", "Xtensa ×2"]), roughness: 0.45 }), mat.chip, mat.chip, mat.chip], modX0 + 9.5, top + 1.25, -1.2);
  const flashP = part("flash", [modX0 + 3.6, top + 2.2, 3.2]);
  add(flashP, new THREE.BoxGeometry(5.2, 1.1, 5.6), [mat.chip, mat.chip, new THREE.MeshStandardMaterial({ map: chipTexture(["FLASH", "4 MB · SPI"]), roughness: 0.45 }), mat.chip, mat.chip, mat.chip], modX0 + 3.6, top + 1.35, 3.2);
  const xtalP = part("crystal", [modX0 + 15.2, top + 1.9, 3.6]);
  add(xtalP, new THREE.BoxGeometry(3.2, 0.8, 2.5), [mat.steel, mat.steel, new THREE.MeshStandardMaterial({ map: chipTexture(["40.000", "MHz"], { bg: "#cfd3d8", fg: "rgba(40,44,52,0.9)", dot: false }), roughness: 0.25, metalness: 0.8 }), mat.steel, mat.steel, mat.steel], modX0 + 15.2, top + 1.2, 3.6);
  const rI = rng(42);
  for (let i = 0; i < 40 && root.children.length < 9999; i++) {
    const x = modX0 + 2 + rI() * 15;
    const z = -7 + rI() * 14;
    // keep passives off the three chips
    if ((Math.abs(x - (modX0 + 9.5)) < 3.4 && Math.abs(z + 1.2) < 3.4) || (Math.abs(x - (modX0 + 3.6)) < 3.6 && Math.abs(z - 3.2) < 3.8) || (Math.abs(x - (modX0 + 15.2)) < 2.6 && Math.abs(z - 3.6) < 2.2)) continue;
    const big = rI() > 0.6;
    add(root, new THREE.BoxGeometry(big ? 1.6 : 1.0, 0.6, big ? 0.8 : 0.5), mat.ceramic, x, top + 1.1, z);
  }

  // Shield can (the "module" part)
  const module = part("module", [modCx - 3, top + 3.4, 0]);
  const canMats = [mat.steel, mat.steel, new THREE.MeshStandardMaterial({ map: shieldTexture(), roughness: 0.3, metalness: 0.95 }), mat.steel, mat.steel, mat.steel];
  const shield = add(module, new THREE.BoxGeometry(17.6, 2.4, 16), canMats, modX0 + 0.6 + 8.8, top + 0.8 + 1.2, 0);
  shield.name = "shield";
  parts.module.lift = shield;
  parts.module.liftBase = shield.position.y;

  /* Micro-USB connector */
  const usb = part("usb", [-BOARD.L / 2 + 2.4, top + 2.8, 0]);
  const usbShell = add(usb, new THREE.BoxGeometry(5.6, 2.6, 7.6), mat.steel, -BOARD.L / 2 + 2.3, top + 1.3, 0);
  usbShell.name = "usbShell";
  add(usb, new THREE.BoxGeometry(0.4, 1.6, 6.2), mat.plastic, -BOARD.L / 2 - 0.45, top + 1.3, 0);
  add(usb, new THREE.BoxGeometry(1.4, 0.3, 9.6), mat.steel, -BOARD.L / 2 + 4.6, top + 0.15, 0);

  /* CP2102 USB-to-UART bridge */
  const usbuart = part("usbuart", [-11.4, top + 1.3, 0]);
  add(usbuart, new THREE.BoxGeometry(5, 0.9, 5), [mat.chip, mat.chip, new THREE.MeshStandardMaterial({ map: chipTexture(["CP2102", "USB ⇄ UART"]), roughness: 0.45 }), mat.chip, mat.chip, mat.chip], -11.4, top + 0.45, 0);
  for (let i = 0; i < 6; i++)
    for (const s of [-1, 1]) {
      add(usbuart, new THREE.BoxGeometry(0.25, 0.12, 0.55), mat.tin, -13.1 + i * 0.68, top + 0.06, s * 2.75);
      add(usbuart, new THREE.BoxGeometry(0.55, 0.12, 0.25), mat.tin, -11.4 + s * 2.75, top + 0.06, -1.7 + i * 0.68);
    }

  /* AMS1117-3.3 voltage regulator (SOT-223) */
  const regulator = part("regulator", [-4.8, top + 2.2, 7.5]);
  add(regulator, new THREE.BoxGeometry(6.4, 1.6, 3.4), [mat.chip, mat.chip, new THREE.MeshStandardMaterial({ map: chipTexture(["AMS1117", "3.3"], { dot: false }), roughness: 0.45 }), mat.chip, mat.chip, mat.chip], -4.8, top + 0.8, 7.0);
  add(regulator, new THREE.BoxGeometry(3, 0.2, 1.8), mat.tin, -4.8, top + 0.1, 9.4);
  for (let i = -1; i <= 1; i++) add(regulator, new THREE.BoxGeometry(0.7, 0.2, 1.6), mat.tin, -4.8 + i * 2.3, top + 0.1, 4.6);

  /* EN + BOOT buttons */
  const mkButton = (id, x, z) => {
    const b = part(id, [x, top + 2.6, z]);
    add(b, new THREE.BoxGeometry(4.2, 1.4, 3.2), mat.button, x, top + 0.7, z);
    const cap = add(b, new THREE.CylinderGeometry(0.85, 0.85, 1.0, 20), mat.cap, x, top + 1.9, z);
    b.userData.cap = cap;
    b.userData.capY = cap.position.y;
    return b;
  };
  mkButton("en", -20.2, -9.6);
  mkButton("boot", -20.2, 9.6);

  /* LEDs: power (red) and GPIO2 (blue) */
  const led = part("led", [-1.4, top + 1.2, -10.6]);
  const ledGeo = new THREE.BoxGeometry(1.6, 0.6, 0.8);
  const pwrMat = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff2020, emissiveIntensity: 1.6, roughness: 0.3 });
  const io2Mat = new THREE.MeshStandardMaterial({ color: 0x2f7dff, emissive: BLUE, emissiveIntensity: 0.1, roughness: 0.3 });
  add(led, ledGeo, pwrMat, -5.2, top + 0.3, -10.6);
  add(led, ledGeo, io2Mat, -1.4, top + 0.3, -10.6);
  parts.led.io2Mat = io2Mat;

  /* Scattered SMD resistors / capacitors on the main board */
  const r = rng(2024);
  const keepOut = [
    [-25, -5, -16.8, 5], [-14.6, -3.6, -8.2, 3.6], [-8.4, 4.8, -1, 10], [-23, -11.5, -17.5, -7.5], [-23, 7.5, -17.5, 11.5],
    [0.6, -9.6, 27, 9.6], [-6.4, -11.4, 0, -9.8],
  ];
  let placed = 0;
  for (let i = 0; i < 400 && placed < 26; i++) {
    const x = -23 + r() * 23;
    const z = -10 + r() * 20;
    if (keepOut.some(([a, b, c, d]) => x > a && x < c && z > b && z < d)) continue;
    const rot = r() > 0.5;
    const res = r() > 0.5;
    const g = new THREE.Group();
    g.position.set(x, top, z);
    g.rotation.y = rot ? Math.PI / 2 : 0;
    add(g, new THREE.BoxGeometry(1.0, 0.45, 0.5), res ? mat.cap : mat.ceramic, 0, 0.23, 0);
    add(g, new THREE.BoxGeometry(0.22, 0.47, 0.52), mat.tin, -0.5, 0.23, 0);
    add(g, new THREE.BoxGeometry(0.22, 0.47, 0.52), mat.tin, 0.5, 0.23, 0);
    root.add(g);
    placed++;
  }

  return { root, parts, mat };
}

/* Corner-bracket selection marker (crisp strips, no glow).
   Built as a unit square (-1..1) and scaled to each part. */
function bracketMarker() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0, depthTest: false });
  g.userData.mat = m;
  const arm = 0.32;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    a.rotation.x = -Math.PI / 2;
    a.userData = { kind: "x", sx, sz, arm };
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    b.rotation.x = -Math.PI / 2;
    b.userData = { kind: "z", sx, sz, arm };
    a.renderOrder = b.renderOrder = 10;
    g.add(a, b);
  }
  // lay the strips out for a given half-size (keeps stroke width constant in mm)
  g.userData.layout = (hx, hz, w = 0.35) => {
    for (const s of g.children) {
      const { kind, sx, sz, arm } = s.userData;
      const L = (kind === "x" ? hx : hz) * arm * 2;
      if (kind === "x") {
        s.scale.set(L, w, 1);
        s.position.set(sx * (hx - L / 2), 0, sz * hz);
      } else {
        s.scale.set(w, L, 1);
        s.position.set(sx * hx, 0, sz * (hz - L / 2));
      }
    }
  };
  return g;
}

/* =====================================================
   CONTROLLER
   ===================================================== */
const lerp = (a, b, t) => a + (b - a) * t;

export async function createBoard(canvas) {
  // Make sure the label fonts are ready before drawing textures
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`700 40px Inter`), document.fonts.load(`600 30px "JetBrains Mono"`)]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) {}

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 1, 2000);

  // lights: key, cool rim, soft fill
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x0b0d10, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(40, 90, 50);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -60;
  key.shadow.camera.right = 60;
  key.shadow.camera.top = 60;
  key.shadow.camera.bottom = -60;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4d8dff, 1.4);
  rim.position.set(-70, 30, -60);
  scene.add(rim);

  const { root, parts } = buildBoard();
  const pivot = new THREE.Group();
  pivot.add(root);
  scene.add(pivot);

  // ground shadow catcher (invisible except for the shadow)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -13;
  ground.receiveShadow = true;
  pivot.add(ground);

  // selection brackets per part
  const markers = {};
  const box = new THREE.Box3();
  for (const [id, p] of Object.entries(parts)) {
    const m = bracketMarker();
    box.setFromObject(p.group);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    m.position.set(center.x, box.max.y + 0.4, center.z);
    m.userData.layout(size.x / 2 + 1.2, size.z / 2 + 1.2);
    root.add(m);
    markers[id] = m;
  }

  /* ---------- state (targets are set from scroll; current eases toward them) ---------- */
  const cur = { camX: 0, camY: 60, camZ: 110, tx: 0, ty: 0, tz: 0, rotY: -0.5, rotX: 0, rotZ: 0, lift: 0, posX: 0, posY: 0, scale: 1 };
  const tgt = { ...cur };
  const user = { yaw: 0, pitch: 0, vYaw: 0 };
  let highlight = null;
  let ledOn = false;
  let pressed = null;
  let idleSpin = 0;
  let idleSpinOn = false;
  let dragAllowed = false;

  function setTarget(s) {
    Object.assign(tgt, s);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- drag to rotate ---------- */
  function enableDrag(el) {
    let down = false;
    let lx = 0;
    let ly = 0;
    el.addEventListener("pointerdown", (e) => {
      if (!dragAllowed || e.target.closest("button, a, input, .no-drag")) return;
      down = true;
      lx = e.clientX;
      ly = e.clientY;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add("is-dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      user.vYaw = dx * 0.006;
      user.yaw += dx * 0.006;
      user.pitch = Math.max(-0.6, Math.min(0.6, user.pitch + dy * 0.004));
    });
    const up = () => {
      down = false;
      el.classList.remove("is-dragging");
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  /* ---------- project a part's anchor to screen coordinates ---------- */
  const v = new THREE.Vector3();
  function screenPos(id) {
    const p = parts[id];
    if (!p) return null;
    v.copy(p.anchor);
    if (id === "module" && p.lift) v.y += p.lift.position.y - p.liftBase;
    root.localToWorld(v);
    v.project(camera);
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height, visible: v.z < 1 };
  }

  /* ---------- render loop (runs only while visible) ---------- */
  let running = false;
  let last = 0;
  let t = 0;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame(now) {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    t += dt;
    const k = reduce ? 1 : 1 - Math.pow(0.0009, dt); // smooth, frame-rate independent easing
    for (const key of Object.keys(cur)) cur[key] = lerp(cur[key], tgt[key], k);

    // user rotation: momentum then gently settle
    if (Math.abs(user.vYaw) > 0.0001) {
      user.yaw += user.vYaw;
      user.vYaw *= 0.9;
    }
    if (idleSpinOn && !reduce) idleSpin += dt * 0.12;
    if (!dragAllowed) {
      // ease any user rotation back when leaving an interactive scene
      user.yaw = lerp(user.yaw, 0, k);
      user.pitch = lerp(user.pitch, 0, k);
      idleSpin = lerp(idleSpin, Math.round(idleSpin / (Math.PI * 2)) * Math.PI * 2, k);
      user.vYaw = 0;
    }

    camera.position.set(cur.camX, cur.camY, cur.camZ);
    camera.lookAt(cur.tx, cur.ty, cur.tz);
    pivot.position.set(cur.posX, cur.posY, 0);
    pivot.scale.setScalar(cur.scale);
    pivot.rotation.set(cur.rotX + user.pitch, cur.rotY + user.yaw + idleSpin, cur.rotZ);

    // shield lift
    const P = parts.module;
    P.lift.position.y = P.liftBase + cur.lift * 16;
    P.lift.rotation.z = cur.lift * 0.18;
    P.lift.position.x = 10.4 + cur.lift * 3;

    // highlight brackets
    for (const [id, m] of Object.entries(markers)) {
      const on = id === highlight;
      m.userData.mat.opacity = lerp(m.userData.mat.opacity, on ? 1 : 0, Math.min(1, k * 1.4));
      if (id === "module") m.position.y = P.liftBase + 1.6 + cur.lift * 16;
      const pulse = on ? 1 + Math.sin(t * 3) * 0.025 : 1;
      m.scale.set(pulse, 1, pulse);
    }

    // GPIO2 LED (used by the hero "blink")
    parts.led.io2Mat.emissiveIntensity = lerp(parts.led.io2Mat.emissiveIntensity, ledOn ? 3.2 : 0.08, 0.35);

    // pressed button animation
    for (const id of ["en", "boot"]) {
      const b = parts[id].group.userData;
      b.cap.position.y = lerp(b.cap.position.y, b.capY - (pressed === id ? 0.45 : 0), 0.4);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function setActive(on) {
    if (on && !running) {
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    } else if (!on) running = false;
  }

  return {
    setTarget,
    snap() {
      Object.assign(cur, tgt);
    },
    setHighlight(id) {
      highlight = id;
    },
    setLed(on) {
      ledOn = on;
    },
    press(id) {
      pressed = id;
      setTimeout(() => (pressed = null), 180);
    },
    setIdleSpin(on) {
      idleSpinOn = on;
    },
    resetUser() {
      user.yaw = 0;
      user.pitch = 0;
      user.vYaw = 0;
      idleSpin = 0;
    },
    enableDrag,
    setDragAllowed(on) {
      dragAllowed = on;
    },
    screenPos,
    resize,
    setActive,
    renderOnce() {
      renderer.render(scene, camera);
    },
    partIds: Object.keys(parts),
  };
}
