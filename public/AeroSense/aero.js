/* =====================================================
   FX-13 VALOUR · AEROSENSE AQ-1
   Map, location details, charts and raw data.
   ===================================================== */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const cssVar = (n, f) => getComputedStyle(document.body).getPropertyValue(n).trim() || f;
  const COLORS = {
    pm1: cssVar("--s-pm1", "#2f9fc4"),
    pm25: cssVar("--s-pm25", "#e8474f"),
    pm10: cssVar("--s-pm10", "#9a7bf0"),
    accent: cssVar("--accent", "#e8474f"),
  };
  const fmt = (v, d = 0) =>
    Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  const METRICS = {
    pm1: { label: "PM1.0", unit: "µg/m³", d: 0 },
    pm25: { label: "PM2.5", unit: "µg/m³", d: 0 },
    pm10: { label: "PM10", unit: "µg/m³", d: 0 },
    co: { label: "Carbon monoxide (CO)", short: "CO", unit: "ppm", d: 2 },
    no2: { label: "Nitrogen dioxide (NO₂)", short: "NO₂", unit: "ppm", d: 3 },
    temp: { label: "Temperature", unit: "°C", d: 1 },
    hum: { label: "Humidity", unit: "%", d: 1 },
    pres: { label: "Air pressure", unit: "hPa", d: 1 },
  };
  const FIG_TITLES = {
    timeseries_log_2026714: "Readings over the flight",
    pm_distribution: "How the particle readings are spread",
    relationship_PM10_vs_PM25: "PM10 vs PM2.5",
    relationship_PM25_vs_Humidity_pct: "PM2.5 vs humidity",
    relationship_NO2_ppm_vs_Temp_C: "NO₂ vs temperature",
    correlation_log_2026714: "How every reading relates to the others",
  };

  let DATA = null;
  let current = null;
  let map = null;
  const pins = {};

  /* ---------------- helpers ---------------- */
  const secs = (t) => {
    const [h, m, s] = t.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  function niceTicks(min, max, count = 5) {
    const span = max - min || Math.abs(max) || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo, hi, ticks, step };
  }
  const decimalsFor = (step) => (step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step))));
  const col = (L, key) => L.rows.map((r) => r[L.columns.indexOf(key)]);
  const stdMult = (v, std) => v / std;

  /* ---------------- line chart (one axis) ---------------- */
  function lineChart(host, { x, series, unit, refs = [], digits = 0 }) {
    host.innerHTML = "";
    const tip = document.createElement("div");
    tip.className = "chart-tip";
    host.appendChild(tip);
    const W = Math.max(300, host.clientWidth);
    const H = W < 560 ? 240 : 300;
    const m = { t: 30, r: W < 560 ? 54 : 70, b: 34, l: 46 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    let lo = Infinity;
    let hi = -Infinity;
    series.forEach((s) => s.values.forEach((v) => ((lo = Math.min(lo, v)), (hi = Math.max(hi, v)))));
    refs.forEach((r) => {
      // only stretch the axis to a reference line if it is reasonably close
      if (r.value <= hi * 1.6 && r.value >= lo * 0.4) ((lo = Math.min(lo, r.value)), (hi = Math.max(hi, r.value)));
    });
    const pad = (hi - lo) * 0.08 || 1;
    const yt = niceTicks(lo - pad, hi + pad, 5);
    const xMax = x[x.length - 1] || 1;
    const sx = (v) => m.l + (v / xMax) * iw;
    const sy = (v) => m.t + ih - ((v - yt.lo) / (yt.hi - yt.lo)) * ih;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": series.map((s) => s.name).join(", ") + " over the flight" }, host);
    const g = el("g", { class: "grid" }, svg);
    const ax = el("g", { class: "axis" }, svg);
    const yd = decimalsFor(yt.step);
    yt.ticks.forEach((v) => {
      el("line", { x1: m.l, x2: m.l + iw, y1: sy(v), y2: sy(v) }, g);
      const t = el("text", { x: m.l - 8, y: sy(v) + 4, "text-anchor": "end" }, ax);
      t.textContent = fmt(v, yd);
    });
    const xt = niceTicks(0, xMax / 60, W < 560 ? 4 : 6);
    xt.ticks.filter((v) => v * 60 <= xMax + 1).forEach((v) => {
      const t = el("text", { x: sx(v * 60), y: H - 12, "text-anchor": "middle" }, ax);
      t.textContent = fmt(v, decimalsFor(xt.step)) + (v === 0 ? " min" : "");
    });
    const ut = el("text", { class: "axis-title", x: 0, y: 12, "text-anchor": "start" }, svg);
    ut.textContent = unit;

    refs.forEach((r) => {
      if (r.value < yt.lo || r.value > yt.hi) return;
      const rg = el("g", { class: "ref " + r.cls }, svg);
      el("line", { x1: m.l, x2: m.l + iw, y1: sy(r.value), y2: sy(r.value) }, rg);
      const t = el("text", { x: m.l + iw + 6, y: sy(r.value) + 4 }, rg);
      t.textContent = r.short;
    });

    const sg = el("g", { class: "series" }, svg);
    series.forEach((s) => {
      const d = s.values.map((v, i) => (i ? "L" : "M") + sx(x[i]).toFixed(1) + " " + sy(v).toFixed(1)).join("");
      const p = el("path", { d, stroke: s.color }, sg);
      if (!reduceMotion) {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = "stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)";
        p.style.strokeDashoffset = 0;
      }
      if (series.length > 1 && !refs.some((r) => Math.abs(sy(r.value) - sy(s.values[s.values.length - 1])) < 12)) {
        const t = el("text", { class: "end-label", x: m.l + iw + 6, y: sy(s.values[s.values.length - 1]) + 4 }, svg);
        t.textContent = s.name;
      }
    });

    // hover: crosshair + tooltip
    const cross = el("line", { class: "cross", y1: m.t, y2: m.t + ih, opacity: 0 }, svg);
    const dots = series.map((s) => el("circle", { class: "dot", r: 4.5, fill: s.color, opacity: 0 }, svg));
    const hit = el("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent" }, svg);
    const show = (cx) => {
      const scale = host.clientWidth / W;
      const vx = cx / scale;
      const tSec = ((vx - m.l) / iw) * xMax;
      let i = 0;
      let best = Infinity;
      x.forEach((xv, k) => {
        const dd = Math.abs(xv - tSec);
        if (dd < best) ((best = dd), (i = k));
      });
      cross.setAttribute("x1", sx(x[i]));
      cross.setAttribute("x2", sx(x[i]));
      cross.setAttribute("opacity", 1);
      dots.forEach((d, k) => {
        d.setAttribute("cx", sx(x[i]));
        d.setAttribute("cy", sy(series[k].values[i]));
        d.setAttribute("opacity", 1);
      });
      const mm = Math.floor(x[i] / 60);
      const ss = String(Math.round(x[i] % 60)).padStart(2, "0");
      tip.innerHTML =
        `<div class="t">${current.rows[i][0]} · ${mm}:${ss} into the flight</div>` +
        series.map((s) => `<div class="r"><span><i style="background:${s.color}"></i>${s.name}</span><b>${fmt(s.values[i], digits)} ${unit}</b></div>`).join("");
      const tx = sx(x[i]) * scale;
      const left = tx + 160 > host.clientWidth ? tx - 156 : tx + 14;
      tip.style.left = Math.max(0, left) + "px";
      tip.style.top = Math.max(0, sy(series[0].values[i]) * scale - 40) + "px";
      tip.classList.add("is-on");
    };
    const hide = () => {
      cross.setAttribute("opacity", 0);
      dots.forEach((d) => d.setAttribute("opacity", 0));
      tip.classList.remove("is-on");
    };
    hit.addEventListener("pointermove", (e) => show(e.clientX - host.getBoundingClientRect().left));
    hit.addEventListener("pointerdown", (e) => show(e.clientX - host.getBoundingClientRect().left));
    hit.addEventListener("pointerleave", hide);
  }

  /* ---------------- bar chart: one value per location ---------------- */
  function barChart(host, { items, unit, refs, onPick }) {
    host.innerHTML = "";
    const tip = document.createElement("div");
    tip.className = "chart-tip";
    host.appendChild(tip);
    const W = Math.max(300, host.clientWidth);
    const rowH = 54;
    const m = { t: 22, r: 24, b: 30, l: W < 560 ? 112 : 170 };
    const H = m.t + m.b + items.length * rowH;
    const iw = W - m.l - m.r;
    const max = Math.max(...items.map((d) => d.value), ...refs.map((r) => r.value));
    const xt = niceTicks(0, max * 1.05, W < 560 ? 4 : 6);
    const sx = (v) => m.l + (v / xt.hi) * iw;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Average by location" }, host);
    const g = el("g", { class: "grid" }, svg);
    const ax = el("g", { class: "axis" }, svg);
    xt.ticks.forEach((v) => {
      el("line", { x1: sx(v), x2: sx(v), y1: m.t - 6, y2: H - m.b }, g);
      const t = el("text", { x: sx(v), y: H - 10, "text-anchor": "middle" }, ax);
      t.textContent = fmt(v);
    });
    items.forEach((d, i) => {
      const y = m.t + i * rowH + 10;
      const bh = 24;
      const name = el("text", { class: "bar-name", x: m.l - 12, y: y + bh / 2 + 4, "text-anchor": "end" }, svg);
      name.textContent = d.name;
      const w = Math.max(4, sx(d.value) - m.l);
      const bar = el("rect", { class: "bar", x: m.l, y, height: bh, rx: 4, width: reduceMotion ? w : 0, fill: COLORS.pm25 }, svg);
      if (!reduceMotion) {
        bar.style.transition = `width 1.1s cubic-bezier(.16,1,.3,1) ${0.08 * i}s`;
        requestAnimationFrame(() => requestAnimationFrame(() => bar.setAttribute("width", w)));
      }
      // square off the baseline end; round only the data end
      el("rect", { x: m.l, y, height: bh, width: Math.min(4, w), fill: COLORS.pm25 }, svg);
      const val = el("text", { class: "bar-val", x: m.l + w + 8, y: y + bh / 2 + 4 }, svg);
      val.textContent = fmt(d.value, 1);
      const hit = el("rect", { class: "bar-hit", x: 0, y: y - 12, width: W, height: rowH }, svg);
      hit.addEventListener("pointermove", (e) => {
        const r = host.getBoundingClientRect();
        tip.innerHTML = `<div class="t">${d.name}</div><div class="r"><span>Average</span><b>${fmt(d.value, 1)} ${unit}</b></div>` +
          refs.map((rf) => `<div class="r"><span>× ${rf.short}</span><b>${fmt(d.value / rf.value, 1)}×</b></div>`).join("");
        tip.style.left = Math.min(r.width - 170, e.clientX - r.left + 12) + "px";
        tip.style.top = (y * (r.width / W) - 10) + "px";
        tip.classList.add("is-on");
      });
      hit.addEventListener("pointerleave", () => tip.classList.remove("is-on"));
      hit.addEventListener("click", () => onPick && onPick(d.id));
    });
    refs.forEach((rf) => {
      const rg = el("g", { class: "ref " + rf.cls }, svg);
      el("line", { x1: sx(rf.value), x2: sx(rf.value), y1: m.t - 8, y2: H - m.b }, rg);
      const t = el("text", { x: sx(rf.value) + 4, y: m.t - 10 }, rg);
      t.textContent = rf.short;
    });
  }

  /* ---------------- map ---------------- */
  function initMap() {
    const host = $("#aeroMap");
    if (!window.L) {
      host.innerHTML = '<div class="map-offline">The map couldn’t load. You can still pick a location from the list.</div>';
      return;
    }
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    map = L.map(host, {
      maxZoom: 16,
      zoomControl: true,
      scrollWheelZoom: false,
      dragging: !coarse,
      tap: true,
      attributionControl: true,
    });
    // Basemap: Esri's dark grey canvas (no key needed). If its tiles fail,
    // fall back to OpenStreetMap, darkened with a CSS filter.
    const esriBase = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 16, attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors" },
    );
    const esriLabels = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 16 },
    );
    let failed = 0;
    let swapped = false;
    esriBase.on("tileerror", () => {
      if (swapped || ++failed < 4) return;
      swapped = true;
      map.removeLayer(esriBase);
      map.removeLayer(esriLabels);
      host.classList.add("map-light");
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
    });
    esriBase.addTo(map);
    esriLabels.addTo(map);

    const pts = DATA.locations.map((Lc) => [Lc.lat, Lc.lng]);
    // the day's route, in flight order
    L.polyline(pts, { color: COLORS.accent, weight: 2, opacity: 0.55, dashArray: "6 8", interactive: false }).addTo(map);

    const maxPm = Math.max(...DATA.locations.map((Lc) => Lc.stats.pm25.mean));
    DATA.locations.forEach((Lc, i) => {
      const size = Math.round(36 + 26 * Math.sqrt(Lc.stats.pm25.mean / maxPm));
      const icon = L.divIcon({
        className: "",
        html: `<div class="aq-pin" style="--size:${size}px" data-id="${Lc.id}" role="button" tabindex="0" aria-label="${Lc.name}: PM2.5 average ${fmt(Lc.stats.pm25.mean, 1)} micrograms per cubic metre">${Math.round(Lc.stats.pm25.mean)}<span class="aq-pin-label">${i + 1}. ${Lc.name}</span></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const mk = L.marker([Lc.lat, Lc.lng], { icon, keyboard: true, riseOnHover: true }).addTo(map);
      mk.on("click", () => select(Lc.id, { from: "map" }));
      pins[Lc.id] = mk;
    });
    map.fitBounds(L.latLngBounds(pts).pad(0.35));

    // wheel zoom only after the visitor engages with the map
    map.on("click focus", () => {
      map.scrollWheelZoom.enable();
      $(".map-hint")?.classList.add("is-hidden");
    });
    host.addEventListener("mouseleave", () => map.scrollWheelZoom.disable());
    host.addEventListener("keydown", (e) => {
      const pin = e.target.closest && e.target.closest(".aq-pin");
      if (pin && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        select(pin.dataset.id, { from: "map" });
      }
    });
    if (coarse) $(".map-hint").textContent = "Tap a pin · use + / − to zoom";
  }

  /* ---------------- list ---------------- */
  function buildList() {
    const ul = $("#locList");
    const maxPm = Math.max(...DATA.locations.map((Lc) => Lc.stats.pm25.mean));
    DATA.locations.forEach((Lc, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <button type="button" class="loc-btn" data-id="${Lc.id}">
          <span class="loc-order">${i + 1}</span>
          <span><span class="loc-name">${Lc.name}</span><span class="loc-sub">${Lc.area} · ${Lc.start.slice(0, 5)}</span></span>
          <span class="loc-val"><b>${fmt(Lc.stats.pm25.mean, 0)}</b><small>µg/m³</small></span>
          <span class="loc-bar"><i style="--w:${((Lc.stats.pm25.mean / maxPm) * 100).toFixed(1)}%"></i></span>
        </button>`;
      li.firstElementChild.addEventListener("click", () => select(Lc.id, { from: "list" }));
      ul.appendChild(li);
    });
  }

  /* ---------------- comparison ---------------- */
  let compareKey = "pm25";
  function drawCompare() {
    const S = DATA.standards[compareKey];
    barChart($("#compareChart"), {
      items: DATA.locations.map((Lc) => ({ id: Lc.id, name: Lc.name, value: Lc.stats[compareKey].mean })),
      unit: "µg/m³",
      refs: [
        { value: S.who, short: "WHO", cls: "who" },
        { value: S.bd, short: "BD std", cls: "bd" },
      ],
      onPick: (id) => {
        select(id, { from: "chart" });
        $("#details").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      },
    });
    $("#compareTitle").textContent = (compareKey === "pm25" ? "PM2.5" : "PM10") + " average at each location";
    $("#compareLegend").innerHTML =
      `<span><i style="background:${COLORS.pm25}"></i>Flight average (µg/m³)</span>` +
      `<span><i class="dash" style="border-color:rgba(242,244,247,.55)"></i>WHO 24-hour guideline · ${S.who}</span>` +
      `<span><i class="dash" style="border-color:#d9a441"></i>Bangladesh 24-hour standard · ${S.bd}</span>`;
  }

  /* ---------------- detail ---------------- */
  let chartKey = "pm";
  function drawDetailChart() {
    const Lc = current;
    const t0 = secs(Lc.rows[0][0]);
    const x = Lc.rows.map((r) => secs(r[0]) - t0);
    const host = $("#detailChart");
    const S = DATA.standards;
    if (chartKey === "pm") {
      lineChart(host, {
        x,
        unit: "µg/m³",
        digits: 0,
        series: [
          { name: "PM10", color: COLORS.pm10, values: col(Lc, "pm10") },
          { name: "PM2.5", color: COLORS.pm25, values: col(Lc, "pm25") },
          { name: "PM1.0", color: COLORS.pm1, values: col(Lc, "pm1") },
        ],
        refs: [
          { value: S.pm25.bd, short: "BD", cls: "bd" },
          { value: S.pm25.who, short: "WHO", cls: "who" },
        ],
      });
      $("#chartLegend").innerHTML =
        ["pm10", "pm25", "pm1"].map((k) => `<span><i style="background:${COLORS[k]}"></i>${METRICS[k].label}</span>`).join("") +
        `<span><i class="dash" style="border-color:#d9a441"></i>BD PM2.5 24-h standard (${S.pm25.bd})</span>` +
        `<span><i class="dash" style="border-color:rgba(242,244,247,.55)"></i>WHO PM2.5 24-h guideline (${S.pm25.who})</span>`;
    } else {
      const M = METRICS[chartKey];
      lineChart(host, {
        x,
        unit: M.unit,
        digits: M.d,
        series: [{ name: M.short || M.label, color: COLORS.accent, values: col(Lc, chartKey) }],
      });
      $("#chartLegend").innerHTML = "";
    }
  }

  function renderDetail() {
    const Lc = current;
    const S = DATA.standards;
    const st = Lc.stats;
    const idx = DATA.locations.indexOf(Lc) + 1;
    const mins = Math.round((secs(Lc.end) - secs(Lc.start)) / 60);
    $("#dName").textContent = Lc.name;
    $("#dMeta").innerHTML = `
      <span>Flight ${idx} of ${DATA.locations.length}</span>
      <span>${Lc.area}</span>
      <span>25 Oct 2026 · ${Lc.start.slice(0, 5)}–${Lc.end.slice(0, 5)} (${mins} min)</span>
      <span>${st.pm25.count} readings, every 5 s</span>
      <span>${Lc.lat.toFixed(4)}° N, ${Lc.lng.toFixed(4)}° E</span>`;
    $("#dHeadline").innerHTML = `
      <b>${fmt(st.pm25.mean, 1)}</b>
      <span>µg/m³ average PM2.5</span>
      <span><em>${fmt(st.pm25.mean / S.pm25.who, 1)}×</em> the WHO 24-hour guideline</span>`;

    const order = ["pm25", "pm10", "pm1", "co", "no2", "temp", "hum", "pres"];
    $("#dStats").innerHTML = order
      .map((k) => {
        const M = METRICS[k];
        const s = st[k];
        return `<div class="stat${k === "pm25" ? " is-key" : ""}">
          <h4>${M.label}</h4>
          <b>${fmt(s.mean, M.d)}<small>${M.unit}</small></b>
          <p>Range ${fmt(s.min, M.d)}–${fmt(s.max, M.d)} · median ${fmt(s.median, M.d)}</p>
        </div>`;
      })
      .join("");

    const ex = Lc.exceed;
    const rows = [
      [`PM2.5 above the WHO guideline (${S.pm25.who} µg/m³)`, ex.pm25_who],
      [`PM2.5 above the Bangladesh standard (${S.pm25.bd} µg/m³)`, ex.pm25_bd],
      [`PM10 above the WHO guideline (${S.pm10.who} µg/m³)`, ex.pm10_who],
      [`PM10 above the Bangladesh standard (${S.pm10.bd} µg/m³)`, ex.pm10_bd],
    ];
    $("#dExceed").innerHTML = rows
      .map(([label, v]) => `<li><div class="row"><span>${label}</span><b>${fmt(v, 0)}%</b></div><div class="bar"><i class="${v ? "" : "is-zero"}" style="--w:0%" data-w="${v}%"></i></div></li>`)
      .join("");
    requestAnimationFrame(() => requestAnimationFrame(() => $$("#dExceed .bar i").forEach((i) => (i.style.width = i.dataset.w))));

    $("#dFigs").innerHTML = Lc.figures
      .map((f) => {
        const wide = f.key.startsWith("timeseries");
        return `<button type="button" class="fig${wide ? " is-wide" : ""}" data-src="${f.file}" data-cap="${FIG_TITLES[f.key] || f.key}">
          <img src="${f.file}" alt="${FIG_TITLES[f.key] || f.key} — ${Lc.name}" width="${f.w}" height="${f.h}" loading="lazy" decoding="async" />
          <span>${FIG_TITLES[f.key] || f.key}</span>
        </button>`;
      })
      .join("");

    // raw data
    const head = ["Time", "PM1.0", "PM2.5", "PM10", "Temp °C", "Humidity %", "Pressure hPa", "CO ppm", "NO₂ ppm", "CO raw", "NO₂ raw"];
    const digits = [null, 0, 0, 0, 2, 2, 2, 2, 3, 0, 0];
    $("#dRaw").innerHTML =
      `<thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>` +
      Lc.rows
        .map((r) => "<tr>" + r.map((v, i) => (i === 0 ? `<td>${v}</td>` : `<td${i === 2 && v > S.pm25.bd ? ' class="hot"' : ""}>${fmt(v, digits[i])}</td>`)).join("") + "</tr>")
        .join("") +
      "</tbody>";
    $("#dRawFoot").textContent = `${Lc.rows.length} readings · ${Lc.start}–${Lc.end} · PM2.5 above the Bangladesh standard is highlighted`;

    $$("#locTabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.id === Lc.id)));
    drawDetailChart();
  }

  function select(id, { from } = {}) {
    const Lc = DATA.locations.find((l) => l.id === id);
    if (!Lc || Lc === current) return;
    const first = !current;
    current = Lc;
    $$(".loc-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.id === id));
    $$(".aq-pin").forEach((p) => p.classList.toggle("is-active", p.dataset.id === id));
    if (map && from !== "init") map.flyTo([Lc.lat, Lc.lng], Math.min(16, Math.max(map.getZoom(), 15)), { duration: reduceMotion ? 0 : 0.9 });
    const d = $("#detail");
    if (first || reduceMotion) renderDetail();
    else {
      d.classList.add("is-swapping");
      setTimeout(() => {
        renderDetail();
        d.classList.remove("is-swapping");
      }, 260);
    }
    const S = DATA.standards;
    $("#selSummary").innerHTML = `
      <p class="sel-kicker">Selected · flight ${DATA.locations.indexOf(Lc) + 1}</p>
      <h3>${Lc.name}</h3>
      <dl class="sel-grid">
        <div><dt>PM2.5</dt><dd>${fmt(Lc.stats.pm25.mean, 1)} <small>µg/m³</small></dd></div>
        <div><dt>PM10</dt><dd>${fmt(Lc.stats.pm10.mean, 1)} <small>µg/m³</small></dd></div>
        <div><dt>CO</dt><dd>${fmt(Lc.stats.co.mean, 2)} <small>ppm</small></dd></div>
        <div><dt>Temp</dt><dd>${fmt(Lc.stats.temp.mean, 1)} <small>°C</small></dd></div>
      </dl>
      <p class="sel-note">${fmt(Lc.stats.pm25.mean / S.pm25.who, 1)}× the WHO PM2.5 guideline</p>
      <a class="sel-btn" href="#details">See all the data <span aria-hidden="true">↓</span></a>`;
    try {
      if (from !== "init") history.replaceState(null, "", "#" + id);
    } catch (e) {}
  }

  /* ---------------- figure lightbox ---------------- */
  function initLightbox() {
    const dlg = $("#lightbox");
    document.addEventListener("click", (e) => {
      const f = e.target.closest && e.target.closest(".fig");
      if (!f) return;
      $("img", dlg).src = f.dataset.src;
      $("img", dlg).alt = f.dataset.cap;
      $("p", dlg).textContent = `${f.dataset.cap} — ${current.name}`;
      if (dlg.showModal) dlg.showModal();
    });
    $(".lb-close", dlg).addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg) dlg.close();
    });
  }

  /* ---------------- leaving: red → blue wash ---------------- */
  function initExitWash() {
    if (reduceMotion) return;
    const wash = document.createElement("div");
    wash.className = "exit-wash";
    wash.setAttribute("aria-hidden", "true");
    document.body.appendChild(wash);
    document.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.closest(".leaflet-container")) return;
      let url;
      try {
        url = new URL(a.href, location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      wash.classList.add("is-on");
      setTimeout(() => (window.location.href = url.href), 650);
    });
    window.addEventListener("pageshow", () => wash.classList.remove("is-on"));
  }

  /* ---------------- boot ---------------- */
  function ready() {
    window.__introReady = true;
    window.dispatchEvent(new Event("aero:ready"));
  }

  async function boot() {
    initExitWash();
    try {
      const res = await fetch("AeroSense/aerosense-data.json?v=20261109");
      DATA = await res.json();
    } catch (e) {
      $("#details").insertAdjacentHTML("afterbegin", '<p class="note">The data couldn’t load. Please refresh the page.</p>');
      ready();
      return;
    }
    // hero facts
    const all = DATA.locations;
    const worst = all.reduce((a, b) => (b.stats.pm25.mean > a.stats.pm25.mean ? b : a));
    $("#fLocations").textContent = all.length;
    $("#fReadings").textContent = fmt(all.reduce((n, l) => n + l.rows.length, 0));
    $("#fWorst").innerHTML = `${fmt(worst.stats.pm25.mean, 0)}<small>µg/m³</small>`;
    $("#fWorstLabel").textContent = `Highest PM2.5 average, at ${worst.name} — ${fmt(worst.stats.pm25.mean / DATA.standards.pm25.who, 0)}× the WHO guideline`;

    buildList();
    const tabs = $("#locTabs");
    tabs.innerHTML = all.map((l) => `<button type="button" role="tab" data-id="${l.id}" aria-selected="false">${l.name}</button>`).join("");
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) select(b.dataset.id, { from: "tabs" });
    });
    $("#chartTabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      chartKey = b.dataset.k;
      $$("#chartTabs button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      drawDetailChart();
    });
    $("#compareTabs").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      compareKey = b.dataset.k;
      $$("#compareTabs button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      drawCompare();
    });

    initMap();
    initLightbox();
    const fromHash = all.find((l) => "#" + l.id === location.hash);
    select((fromHash || worst).id, { from: "init" });
    drawCompare();

    let rt = 0;
    let lastW = window.innerWidth;
    window.addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        drawCompare();
        drawDetailChart();
        if (map) map.invalidateSize();
      }, 200);
    });
    ready();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
