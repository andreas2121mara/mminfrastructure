/* =========================================================
   M&M — Διαχείριση · πυρήνας
   Σύνδεση, κέλυφος, πλοήγηση, γραφήματα και οι σελίδες
   στατιστικών (Επισκόπηση, Ζωντανά, Επισκέψεις, Μηνύματα).
   Οι σελίδες διαχείρισης του site βρίσκονται στο admin-site.js.
   ========================================================= */
(() => {
  "use strict";

  /* ---------- Βοηθητικά ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mm." + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("mm." + k, JSON.stringify(v)); } catch { /* ιδιωτική περιήγηση κ.λπ. */ } },
  };
  const NF = new Intl.NumberFormat("el-GR");
  const nf = (n) => NF.format(Math.round(+n || 0));
  const compact = (n) => (Math.abs(n) >= 10000 ? new Intl.NumberFormat("el-GR", { notation: "compact", maximumFractionDigits: 1 }).format(n) : nf(n));
  const pct = (n, d = 0) => `${(+n || 0).toFixed(d).replace(".", ",")}%`;
  const dur = (s) => {
    s = Math.max(0, Math.round(+s || 0));
    if (s < 60) return `${s}″`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}′ ${String(s % 60).padStart(2, "0")}″`;
    return `${Math.floor(m / 60)}ω ${m % 60}′`;
  };
  const D = (ts) => new Date(ts * 1000);
  const fDate = (ts, o = { day: "numeric", month: "short", year: "numeric" }) => D(ts).toLocaleDateString("el-GR", o);
  const fTime = (ts) => D(ts).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
  const fDT = (ts) => `${fDate(ts, { day: "numeric", month: "short" })}, ${fTime(ts)}`;
  const ago = (ts) => {
    const s = Math.max(0, Math.round(Date.now() / 1000 - ts));
    if (s < 45) return "μόλις τώρα";
    if (s < 3600) return `πριν ${Math.round(s / 60)}′`;
    if (s < 86400) return `πριν ${Math.round(s / 3600)} ώρ.`;
    if (s < 7 * 86400) return `πριν ${Math.round(s / 86400)} μέρ.`;
    return fDate(ts);
  };
  const bytes = (b) => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1).replace(".", ",")} MB`);
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const REGION = (() => { try { return new Intl.DisplayNames(["el"], { type: "region" }); } catch { return null; } })();
  const LANGN = (() => { try { return new Intl.DisplayNames(["el"], { type: "language" }); } catch { return null; } })();
  const country = (cc, fb) => {
    if (!cc) return "Άγνωστη τοποθεσία";
    if (cc === "LO") return "Τοπικό δίκτυο";
    try { return (REGION && REGION.of(cc)) || fb || cc; } catch { return fb || cc; }
  };
  const language = (l) => { try { return (LANGN && LANGN.of(l)) || l; } catch { return l; } };
  const flag = (cc) => (/^[A-Z]{2}$/.test(cc || "") && cc !== "LO"
    ? `<img class="flag" src="https://flagcdn.com/w40/${cc.toLowerCase()}.png" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
    : `<span class="flag flag--x">${cc === "LO" ? "⌂" : "·"}</span>`);

  const ic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    overview: ic('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
    live: ic('<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>'),
    visits: ic('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
    messages: ic('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>'),
    content: ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    projects: ic('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
    media: ic('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
    company: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M6 16h6"/>'),
    seo: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    history: ic('<path d="M3 3v5h5"/><path d="M3.1 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>'),
    settings: ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    desktop: ic('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    mobile: ic('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>'),
    tablet: ic('<rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M11 18h2"/>'),
    logout: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
    external: ic('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>'),
    edit: ic('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    trash: ic('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    star: ic('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
    archive: ic('<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>'),
    mail: ic('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>'),
    phone: ic('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
    download: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>'),
    upload: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    grip: ic('<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>'),
    chev: ic('<path d="M6 9l6 6 6-6"/>'),
    up: ic('<path d="M18 15l-6-6-6 6"/>'),
    down: ic('<path d="M6 9l6 6 6-6"/>'),
    close: ic('<path d="M18 6L6 18M6 6l12 12"/>'),
    check: ic('<path d="M20 6L9 17l-5-5"/>'),
    eye: ic('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
    copy: ic('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    globe: ic('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    pointer: ic('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
    home: ic('<path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
    building: ic('<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'),
    tool: ic('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'),
    grid: ic('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
    compare: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M8 12l-2 0M18 12h-2"/>'),
    steps: ic('<path d="M3 18h4v-4h4v-4h4V6h6"/>'),
    truck: ic('<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
    menu: ic('<path d="M3 12h18M3 6h18M3 18h18"/>'),
    footer: ic('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16h18"/>'),
    id: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M6 16h6"/>'),
    marquee: ic('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>'),
    refresh: ic('<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    shield: ic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    bell: ic('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
    database: ic('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>'),
    alert: ic('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
    cursor: ic('<path d="M3 3l7.1 17 2.5-7.4L20 10z"/>'),
    calendar: ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
    sparkle: ic('<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>'),
  };

  const SECTIONS = { hero: "Αρχή", about: "Η Εταιρεία", services: "Υπηρεσίες", projects: "Έργα", compare: "Πριν/Μετά", process: "Μέθοδος", fleet: "Εξοπλισμός", contact: "Επικοινωνία" };
  const SEC_KEYS = Object.keys(SECTIONS);
  const DEVICES = { desktop: "Υπολογιστής", mobile: "Κινητό", tablet: "Tablet" };
  const EVENTS = {
    cta: "Πάτησε κουμπί", phone: "Πάτησε το τηλέφωνο", email: "Πάτησε το email", form: "Έστειλε μήνυμα", project: "Άνοιξε έργο",
    filter: "Φίλτραρε τα έργα", compare: "Δοκίμασε το Πριν/Μετά", nav: "Πάτησε στο μενού", social: "Άνοιξε social", outbound: "Βγήκε προς", arrive: "Μπήκε στη σελίδα",
  };
  const EV_ICON = { cta: "cursor", phone: "phone", email: "mail", form: "messages", project: "projects", filter: "grid", compare: "compare", nav: "menu", social: "globe", outbound: "external", arrive: "pointer" };
  const MEDIUM = { direct: "Άμεση", search: "Αναζήτηση", social: "Social", referral: "Παραπομπή", campaign: "Καμπάνια", ai: "AI βοηθός" };

  /* ---------- Επικοινωνία με τον server ---------- */
  const API = "api.php";
  let CSRF = ($('meta[name="csrf"]') || {}).content || "";
  async function api(a, { params, body, form } = {}) {
    const url = new URL(API, location.href);
    url.searchParams.set("a", a);
    if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    const opt = { method: body || form ? "POST" : "GET", headers: { "X-CSRF": CSRF, Accept: "application/json" }, credentials: "same-origin" };
    if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    if (form) opt.body = form;
    let res;
    try { res = await fetch(url, opt); } catch { throw new Error("Δεν υπάρχει σύνδεση με τον server."); }
    let data = {};
    try { data = await res.json(); } catch { /* κενή απάντηση */ }
    if (res.status === 401 && data.auth === false && document.body.classList.contains("view-app")) {
      toast("Η σύνδεση έληξε — συνδεθείτε ξανά.", "err");
      setTimeout(() => location.reload(), 1200);
    }
    if (!res.ok) { const e = new Error(data.error || `Σφάλμα ${res.status}`); e.data = data; e.status = res.status; throw e; }
    return data;
  }
  const exportUrl = (a, params) => {
    const u = new URL(API, location.href);
    u.searchParams.set("a", a);
    for (const [k, v] of Object.entries(params || {})) if (v !== undefined && v !== "" && v !== null) u.searchParams.set(k, v);
    return u.toString();
  };

  /* ---------- Ειδοποιήσεις, παράθυρα, tooltip ---------- */
  function toast(msg, type = "ok") {
    const box = $("#toasts");
    if (!box) return;
    const t = document.createElement("div");
    t.className = `toast toast--${type}`;
    t.innerHTML = `<i>${type === "ok" ? "✓" : type === "err" ? "!" : "i"}</i><span>${esc(msg)}</span>`;
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 320); }, type === "err" ? 5200 : 3200);
  }

  function modal({ title, body, foot, wide = false, onClose } = {}) {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="modal${wide ? " modal--wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal__head"><h3>${esc(title)}</h3><button class="iconbtn" data-x aria-label="Κλείσιμο">${ICON.close}</button></div>
      <div class="modal__body"></div>${foot ? '<div class="modal__foot"></div>' : ""}</div>`;
    const b = $(".modal__body", ov);
    if (typeof body === "string") b.innerHTML = body; else if (body) b.append(body);
    const f = $(".modal__foot", ov);
    if (f) { if (typeof foot === "string") f.innerHTML = foot; else f.append(foot); }
    let closed = false;
    const key = (e) => { if (e.key === "Escape") close(); };
    function close() {
      if (closed) return;
      closed = true;
      ov.remove();
      document.removeEventListener("keydown", key);
      if (onClose) onClose();
    }
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    $("[data-x]", ov).onclick = close;
    document.addEventListener("keydown", key);
    document.body.append(ov);
    setTimeout(() => { const first = $("input, textarea, select", b); if (first) first.focus(); }, 60);
    return { el: ov, body: b, foot: f, close };
  }

  function confirmBox(title, text, { ok = "Επιβεβαίωση", danger = false } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal({
        title, body: `<p class="muted" style="margin:0;line-height:1.7">${text}</p>`,
        foot: `<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn ${danger ? "btn--danger" : "btn--gold"}" data-ok>${esc(ok)}</button>`,
        onClose: () => { if (!done) resolve(false); },
      });
      $("[data-no]", m.el).onclick = () => m.close();
      $("[data-ok]", m.el).onclick = () => { done = true; resolve(true); m.close(); };
      setTimeout(() => $("[data-ok]", m.el).focus(), 60);
    });
  }

  const tip = {
    el: null,
    show(html, x, y) {
      const t = this.el || (this.el = $("#tip"));
      if (!t) return;
      t.innerHTML = html;
      t.classList.add("on");
      const r = t.getBoundingClientRect();
      let left = x + 16, top = y + 16;
      if (left + r.width > innerWidth - 8) left = x - r.width - 16;
      if (top + r.height > innerHeight - 8) top = y - r.height - 16;
      t.style.left = Math.max(8, left) + "px";
      t.style.top = Math.max(8, top) + "px";
    },
    hide() { if (this.el) this.el.classList.remove("on"); },
  };
  document.addEventListener("mousemove", (e) => {
    const t = e.target.closest && e.target.closest("[data-tip]");
    if (t) tip.show(t.getAttribute("data-tip"), e.clientX, e.clientY);
    else if (!e.target.closest || !e.target.closest(".hit")) tip.hide();
  });

  function countUp(node, to, fmt = nf, ms = 1100) {
    if (!node) return;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 4);
      node.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const empty = (msg, icon = "sparkle") => `<div class="empty">${ICON[icon] || ""}${esc(msg)}</div>`;

  /* ---------- Γραφήματα ---------- */
  let uid = 0;
  const cleanups = [];
  function observe(el, fn) {
    if (!window.ResizeObserver) return;
    let w = el.clientWidth, t;
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - w) < 4) return;
      w = el.clientWidth;
      clearTimeout(t);
      t = setTimeout(fn, 120);
    });
    ro.observe(el);
    cleanups.push(() => ro.disconnect());
  }

  function niceTicks(max, count = 4) {
    const raw = Math.max(1, max) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag);
    const out = [];
    for (let v = 0; v < max + step; v += step) out.push(v);
    if (out.length < 2) out.push(step);
    return out;
  }

  /** Ομαλή καμπύλη χωρίς «υπερβάσεις» (monotone cubic). */
  function smoothPath(p) {
    const n = p.length;
    if (!n) return "";
    if (n === 1) return `M${p[0][0]},${p[0][1]}`;
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; m[i] = (p[i + 1][1] - p[i][1]) / (dx[i] || 1); }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    const f = (v) => v.toFixed(1);
    let d = `M${f(p[0][0])},${f(p[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${f(p[i][0] + h)},${f(p[i][1] + t[i] * h)} ${f(p[i + 1][0] - h)},${f(p[i + 1][1] - t[i + 1] * h)} ${f(p[i + 1][0])},${f(p[i + 1][1])}`;
    }
    return d;
  }

  /** Γράφημα περιοχής/γραμμής με σταυρόνημα και tooltip. series: [{name, color, values, area}] */
  function areaChart(el, { labels, series, height = 260, tipTitle }) {
    let first = true;
    const id = ++uid;
    const draw = () => {
      const W = Math.max(280, el.clientWidth), H = height;
      const m = { t: 14, r: 14, b: 28, l: 44 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b, n = labels.length;
      const ticks = niceTicks(Math.max(1, ...series.flatMap((s) => s.values)), 4);
      const top = ticks[ticks.length - 1];
      const x = (i) => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
      const y = (v) => m.t + ih - (v / top) * ih;
      let g = ticks.map((t) => `<line class="${t === 0 ? "baseline" : "gridline"}" x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${m.l - 10}" y="${y(t) + 4}" text-anchor="end">${compact(t)}</text>`).join("");
      const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
      for (let i = 0; i < n; i += every) g += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(labels[i])}</text>`;
      const paths = series.map((s, si) => {
        const d = smoothPath(s.values.map((v, i) => [x(i), y(v)]));
        const area = s.area ? `<path class="${first ? "fadein" : ""}" d="${d}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z" fill="url(#ag${id}-${si})"/>` : "";
        return `<defs><linearGradient id="ag${id}-${si}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".26"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>${area}
          <path class="line${first ? " draw" : ""}" d="${d}" stroke="${s.color}" pathLength="1000" style="stroke-dasharray:${first ? 1000 : "none"};--len:1000"/>`;
      }).join("");
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(series.map((s) => s.name).join(", "))}">${g}${paths}
        <g class="hov" style="display:none"><line class="cross" y1="${m.t}" y2="${m.t + ih}"/>${series.map((s) => `<circle class="dot" r="4.5" fill="${s.color}"/>`).join("")}</g>
        <rect class="hit" x="${m.l - 8}" y="${m.t}" width="${iw + 16}" height="${ih}"/></svg>`;
      first = false;
      const svg = $("svg", el), hov = $(".hov", svg), line = $("line", hov), dots = $$("circle", hov);
      $$(".draw", svg).forEach((p) => p.addEventListener("animationend", () => { p.style.strokeDasharray = "none"; p.classList.remove("draw"); }, { once: true }));
      const move = (e) => {
        const r = svg.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const i = Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1))));
        hov.style.display = "";
        line.setAttribute("x1", x(i)); line.setAttribute("x2", x(i));
        dots.forEach((c, si) => { c.setAttribute("cx", x(i)); c.setAttribute("cy", y(series[si].values[i])); });
        tip.show(`<div class="tip__t">${esc(tipTitle ? tipTitle(i) : labels[i])}</div>${series.map((s) => `<div class="tip__r"><span><i style="--c:${s.color}"></i>${esc(s.name)}</span><b>${nf(s.values[i])}</b></div>`).join("")}`, e.clientX, e.clientY);
      };
      const hit = $(".hit", svg);
      hit.addEventListener("mousemove", move);
      hit.addEventListener("mouseleave", () => { hov.style.display = "none"; tip.hide(); });
    };
    draw();
    observe(el, draw);
  }

  function spark(values, color = "var(--s1)", h = 34) {
    const n = values.length;
    if (n < 2 || values.every((v) => !v)) return `<svg class="spark" viewBox="0 0 100 ${h}" preserveAspectRatio="none" height="${h}"><path d="M0,${h - 3}H100" stroke="var(--grid)" vector-effect="non-scaling-stroke"/></svg>`;
    const max = Math.max(1, ...values);
    const d = smoothPath(values.map((v, i) => [(i / (n - 1)) * 100, h - 3 - (v / max) * (h - 8)]));
    return `<svg class="spark" viewBox="0 0 100 ${h}" preserveAspectRatio="none" height="${h}"><path d="${d}" stroke="${color}" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function barList(rows, { total } = {}) {
    if (!rows.length) return empty("Δεν υπάρχουν δεδομένα ακόμα");
    const max = Math.max(...rows.map((r) => +r.n));
    const sum = total ?? rows.reduce((a, r) => a + +r.n, 0);
    return `<div class="bars">${rows.map((r, i) => `<div class="bar" style="--w:${Math.max(3, (r.n / max) * 100)}%;animation-delay:${i * 0.04}s">
      <span class="bar__label">${r.html ?? esc(r.label)}</span><span class="bar__val">${nf(r.n)}</span><span class="bar__pct">${sum ? Math.round((r.n / sum) * 100) : 0}%</span></div>`).join("")}</div>`;
  }

  function segBar(parts) {
    const sum = parts.reduce((a, p) => a + p.n, 0);
    if (!sum) return empty("Δεν υπάρχουν δεδομένα ακόμα");
    return `<div class="segbar" role="img" aria-label="${esc(parts.map((p) => `${p.label} ${Math.round((p.n / sum) * 100)}%`).join(", "))}">${parts.filter((p) => p.n > 0).map((p) => {
      const w = (p.n / sum) * 100;
      return `<div style="flex:${p.n};background:${p.color}" data-tip="${esc(`<b>${esc(p.label)}</b><br>${nf(p.n)} επισκέπτες · ${Math.round(w)}%`)}">${w >= 14 ? Math.round(w) + "%" : ""}</div>`;
    }).join("")}</div><div class="seglegend">${parts.map((p) => `<div><i style="--c:${p.color}"></i><span>${p.icon || ""}${esc(p.label)}</span><b>${nf(p.n)}</b><small>${Math.round((p.n / sum) * 100)}%</small></div>`).join("")}</div>`;
  }

  function heatmap(heat) {
    const days = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];
    const full = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];
    const max = Math.max(1, ...heat.flat());
    let h = `<div class="heat"><span></span>${Array.from({ length: 24 }, (_, i) => `<span class="heat__h">${i % 6 === 0 ? String(i).padStart(2, "0") : ""}</span>`).join("")}`;
    heat.forEach((row, d) => {
      h += `<span class="heat__d">${days[d]}</span>` + row.map((v, hr) => `<span class="heat__c${v ? "" : " z"}" style="--a:${v ? (0.2 + (0.8 * v) / max).toFixed(2) : 0}" data-tip="${esc(`<b>${full[d]}, ${hr}:00–${hr + 1}:00</b><br>${nf(v)} ${v === 1 ? "προβολή" : "προβολές"}`)}"></span>`).join("");
    });
    return h + `</div><div class="heat__scale">Λιγότερες ${[0.2, 0.47, 0.73, 1].map((a) => `<i style="background:rgba(179,138,46,${a})"></i>`).join("")} Περισσότερες</div>`;
  }

  const landCache = {};
  function mapSVG(mode, points, { live = false } = {}) {
    const M = window.MM_MAP && window.MM_MAP[mode];
    if (!M) return empty("Ο χάρτης δεν φορτώθηκε");
    const cell = 10, r = 3.3, W = M.cols * cell, H = M.rows * cell;
    if (!landCache[mode]) {
      const bit = (row, c) => { const ch = row ? row[c >> 2] : ""; return ch ? (parseInt(ch, 16) >> (3 - (c & 3))) & 1 : 0; };
      let a = "", b = "";
      for (let y = 0; y < M.rows; y++) for (let x = 0; x < M.cols; x++) {
        if (!bit(M.land[y], x)) continue;
        const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
        const seg = `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
        if (M.gr && bit(M.gr[y], x)) b += seg; else a += seg;
      }
      landCache[mode] = `<path class="land" d="${a}"/>${b ? `<path class="gr" d="${b}"/>` : ""}`;
    }
    const proj = (lat, lon) => [((lon - M.lon0) / M.step) * cell + cell / 2, ((M.lat1 - lat) / M.step) * cell + cell / 2];
    const pts = points.filter((p) => p.lat !== null && p.lat !== undefined && p.lat !== "" && p.lon !== null && p.lon !== undefined);
    const max = Math.max(1, ...pts.map((p) => +p.n || 1));
    let outside = 0;
    const circles = pts.map((p) => {
      const [x, y] = proj(+p.lat, +p.lon);
      if (x < 0 || y < 0 || x > W || y > H) { outside += +p.n || 1; return ""; }
      const base = mode === "world" ? 6 : 9, extra = mode === "world" ? 14 : 22;
      const rr = base + Math.sqrt((+p.n || 1) / max) * extra;
      const label = p.city || country(p.cc);
      return `<circle class="pt${live ? " pt--live" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" data-tip="${esc(`<b>${esc(label)}</b>${p.city ? " · " + esc(country(p.cc)) : ""}<br>${nf(p.n || 1)} ${(+p.n || 1) === 1 ? "επισκέπτης" : "επισκέπτες"}`)}"/>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Χάρτης επισκεπτών">${landCache[mode]}${circles}</svg>${outside ? `<div class="map__legend">+${nf(outside)} εκτός χάρτη</div>` : ""}`;
  }

  function delta(cur, prev, invert = false) {
    if (!prev && !cur) return `<span class="delta">— <small>όπως πριν</small></span>`;
    if (!prev) return `<span class="delta ${invert ? "down" : "up"}">▲ νέο <small>vs πριν</small></span>`;
    const ch = ((cur - prev) / prev) * 100;
    if (Math.abs(ch) < 0.5) return `<span class="delta">0% <small>vs προηγ. περίοδο</small></span>`;
    const up = ch > 0, good = invert ? !up : up;
    return `<span class="delta ${good ? "up" : "down"}" title="Πριν: ${esc(String(Math.round(prev * 10) / 10))}">${up ? "▲" : "▼"} ${Math.abs(ch) >= 1000 ? "999+" : Math.abs(ch).toFixed(0)}% <small>vs προηγ. περίοδο</small></span>`;
  }

  /* ---------- Επιλογή χρονικού διαστήματος ---------- */
  const RANGES = [["today", "Σήμερα"], ["yesterday", "Χθες"], ["7d", "7 μέρες"], ["30d", "30 μέρες"], ["90d", "90 μέρες"], ["12m", "12 μήνες"]];
  let RANGE = store.get("range", "30d");
  const rangeParams = () => (typeof RANGE === "object" && RANGE ? { range: "custom", from: RANGE.from, to: RANGE.to } : { range: RANGE });
  const rangeLabel = () => {
    if (typeof RANGE === "object" && RANGE) return `${fDate(Date.parse(RANGE.from) / 1000, { day: "numeric", month: "short" })} – ${fDate(Date.parse(RANGE.to) / 1000)}`;
    const r = RANGES.find((x) => x[0] === RANGE);
    return r ? r[1] : "30 μέρες";
  };
  function rangePicker() {
    const wrap = document.createElement("div");
    wrap.className = "seg";
    wrap.innerHTML = RANGES.map(([k, l]) => `<button data-r="${k}" class="${RANGE === k ? "on" : ""}">${l}</button>`).join("") +
      `<button data-r="custom" class="${typeof RANGE === "object" ? "on" : ""}" title="Επιλογή ημερομηνιών">${ICON.calendar.replace("<svg", '<svg style="width:15px;height:15px;vertical-align:-3px"')}</button>`;
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.r === "custom") {
        const today = new Date().toISOString().slice(0, 10);
        const m = modal({
          title: "Επιλογή διαστήματος",
          body: `<div class="row"><div class="fld grow"><label>Από</label><input type="date" class="input" id="rFrom" max="${today}"></div><div class="fld grow"><label>Έως</label><input type="date" class="input" id="rTo" max="${today}" value="${today}"></div></div>`,
          foot: `<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--gold" data-ok>Εφαρμογή</button>`,
        });
        $("[data-no]", m.el).onclick = m.close;
        $("[data-ok]", m.el).onclick = () => {
          const from = $("#rFrom", m.el).value, to = $("#rTo", m.el).value;
          if (!from || !to || from > to) { toast("Διαλέξτε σωστές ημερομηνίες.", "err"); return; }
          RANGE = { from, to }; store.set("range", RANGE); m.close(); route();
        };
        return;
      }
      RANGE = b.dataset.r; store.set("range", RANGE); route();
    });
    return wrap;
  }

  /* ---------- Κέλυφος εφαρμογής ---------- */
  const NAV = [
    ["Ανάλυση"],
    ["overview", "Επισκόπηση"], ["live", "Ζωντανά", "badgeLive"], ["visits", "Επισκέψεις"], ["messages", "Μηνύματα", "badgeMsg"],
    ["Ιστοσελίδα"],
    ["content", "Περιεχόμενο"], ["projects", "Έργα"], ["media", "Πολυμέσα"], ["company", "Στοιχεία εταιρείας"], ["seo", "SEO & Κοινοποίηση"], ["history", "Ιστορικό αλλαγών"],
    ["Σύστημα"],
    ["settings", "Ρυθμίσεις"],
  ];
  const TITLES = Object.fromEntries(NAV.filter((n) => n.length > 1).map((n) => [n[0], n[1]]));
  const USER = ($('meta[name="user"]') || {}).content || "admin";

  function buildShell() {
    const app = $("#app");
    app.className = "app";
    app.innerHTML = `
      <aside class="side" id="side">
        <a class="side__brand" href="#overview"><img src="../assets/logo/logo-mark.svg" alt=""><div><b>M&amp;M</b><span>Διαχείριση</span></div></a>
        <a class="side__live" href="#live"><span class="pulse"></span><span><b id="liveN">–</b> online τώρα</span></a>
        <nav class="side__nav" aria-label="Κύριο μενού">${NAV.map((n) => n.length === 1 ? `<p class="side__label">${n[0]}</p>` :
          `<a href="#${n[0]}" data-r="${n[0]}">${ICON[n[0]]}<span>${n[1]}</span>${n[2] ? `<span class="badge${n[2] === "badgeMsg" ? " badge--gold" : " badge--good"}" id="${n[2]}"></span>` : ""}</a>`).join("")}</nav>
        <div class="side__foot">
          <a class="btn btn--block" href="../?edit=1" target="_blank" rel="noopener">${ICON.edit} Επεξεργασία στη σελίδα</a>
          <div class="side__user"><span class="avatar">${esc(USER.slice(0, 1))}</span><div><b>${esc(USER)}</b><small>Διαχειριστής</small></div>
            <button class="iconbtn" id="logout" title="Αποσύνδεση" aria-label="Αποσύνδεση">${ICON.logout}</button></div>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <button class="iconbtn burger" id="burger" aria-label="Μενού">${ICON.menu}</button>
          <div class="top__title"><h1 id="vTitle"></h1><p id="vSub"></p></div>
          <div class="top__actions" id="vActions"></div>
          <button class="btn btn--ghost" id="cmdkBtn" title="Γρήγορη αναζήτηση">${ICON.search}<span class="kbd">Ctrl K</span></button>
          <a class="btn" href="../" target="_blank" rel="noopener">${ICON.external} Ιστοσελίδα</a>
        </header>
        <div id="view"></div>
      </div>`;
    const t = document.createElement("div"); t.className = "toasts"; t.id = "toasts"; document.body.append(t);
    const tp = document.createElement("div"); tp.className = "tip"; tp.id = "tip"; document.body.append(tp);
    $("#burger").onclick = () => $("#side").classList.toggle("open");
    $("#side").addEventListener("click", (e) => { if (e.target.closest("a")) $("#side").classList.remove("open"); });
    $("#logout").onclick = async () => {
      if (!(await guardLeave())) return;
      try { await api("logout", { body: {} }); } catch { /* ήδη εκτός */ }
      location.reload();
    };
    addEventListener("hashchange", route);
    addEventListener("beforeunload", (e) => { if (MMA.dirty) { e.preventDefault(); e.returnValue = ""; } });
    addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); MMA.palette && MMA.palette(); }
    });
    $("#cmdkBtn").onclick = () => MMA.palette && MMA.palette();
    pollBadges();
    setInterval(pollBadges, 15000);
  }

  let unread = 0, liveCount = 0;
  async function pollBadges() {
    try {
      const b = await api("badge");
      setBadges(b.live, b.unread);
    } catch { /* σιωπηλά */ }
  }
  function setBadges(live, un) {
    live = live === null ? liveCount : live;
    liveCount = live;
    const L = $("#liveN"); if (L) L.textContent = nf(live);
    const bl = $("#badgeLive"); if (bl) bl.textContent = live ? nf(live) : "";
    const bm = $("#badgeMsg"); if (bm) bm.textContent = un ? nf(un) : "";
    if (un > unread && unread !== 0) toast(`Νέο μήνυμα από τη φόρμα επικοινωνίας`, "info");
    unread = un;
    document.title = `${un ? `(${un}) ` : ""}Διαχείριση · M&M`;
  }

  function setTop(title, sub = "", ...actions) {
    $("#vTitle").textContent = title;
    $("#vSub").textContent = sub;
    const a = $("#vActions");
    a.innerHTML = "";
    actions.filter(Boolean).forEach((x) => (typeof x === "string" ? a.insertAdjacentHTML("beforeend", x) : a.append(x)));
  }

  /* ---------- Πλοήγηση ---------- */
  const VIEWS = {};
  let current = null, ignoreHash = false, lastHash = "";
  async function guardLeave() {
    if (!MMA.dirty) return true;
    const ok = await confirmBox("Μη αποθηκευμένες αλλαγές", "Έχετε αλλαγές που δεν αποθηκεύτηκαν. Να χαθούν;", { ok: "Απόρριψη αλλαγών", danger: true });
    if (ok && MMA.discard) MMA.discard();
    return ok;
  }
  async function route() {
    if (ignoreHash) { ignoreHash = false; return; }
    const parts = decodeURIComponent(location.hash.slice(1) || "overview").split("/");
    const name = VIEWS[parts[0]] ? parts[0] : "overview";
    const family = ["content", "company", "seo"];
    if (current && MMA.dirty && !(family.includes(current) && family.includes(name))) {
      if (!(await guardLeave())) { ignoreHash = true; location.hash = lastHash; return; }
    }
    lastHash = location.hash || "#overview";
    while (cleanups.length) { try { cleanups.pop()(); } catch { /* */ } }
    tip.hide();
    current = name;
    $$(".side__nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === name));
    const view = $("#view");
    view.className = "view";
    void view.offsetWidth;
    view.innerHTML = `<div class="grid">${[8, 4, 3, 3, 3, 3, 6, 6].map((s) => `<div class="skel span-${s}" style="height:${s > 4 ? 300 : 130}px"></div>`).join("")}</div>`;
    setTop(TITLES[name] || "", "");
    try {
      const c = await VIEWS[name](view, parts.slice(1));
      if (typeof c === "function") cleanups.push(c);
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="card">${empty(e.message || "Κάτι πήγε στραβά.", "alert")}<div class="row" style="justify-content:center"><button class="btn" onclick="location.reload()">${ICON.refresh} Ξαναδοκιμάστε</button></div></div>`;
    }
  }

  /* =========================================================
     ΕΠΙΣΚΟΠΗΣΗ
     ========================================================= */
  VIEWS.overview = async (el) => {
    setTop("Επισκόπηση", `Στατιστικά · ${rangeLabel()}`, rangePicker());
    const [d, lv] = await Promise.all([api("overview", { params: rangeParams() }), api("live")]);
    const k = d.kpis, p = d.prev, S = d.series;
    setBadges(lv.count, lv.unread);
    const tiles = [
      { label: "Προβολές σελίδας", icon: "eye", v: k.pageviews, pv: p.pageviews, s: S.map((x) => x.pageviews) },
      { label: "Μέσος ενεργός χρόνος", icon: "clock", v: k.duration, pv: p.duration, fmt: dur, s: S.map((x) => x.duration), help: "Χρόνος που η σελίδα ήταν ανοιχτή και ο επισκέπτης ενεργός" },
      { label: "Γρήγορες αποχωρήσεις", icon: "logout", v: k.bounce, pv: p.bounce, fmt: (v) => pct(v), invert: true, s: S.map((x) => x.bounce), help: "Έφυγαν σε λιγότερο από 10″ χωρίς scroll ή κλικ" },
      { label: "Μέσο scroll", icon: "pointer", v: k.scroll, pv: p.scroll, fmt: (v) => pct(v), s: S.map((x) => x.scroll), help: "Πόσο βαθιά στη σελίδα κατέβηκαν κατά μέσο όρο" },
      { label: "Επαφές", icon: "phone", v: k.contacts, pv: p.contacts, s: S.map((x) => x.contacts), help: "Κλικ σε τηλέφωνο ή email και αποστολές φόρμας" },
      { label: "Μηνύματα φόρμας", icon: "mail", v: k.messages, pv: p.messages, href: "#messages" },
    ];
    const ev = d.events || [];
    const evTotals = {};
    ev.forEach((e) => { evTotals[e.name] = (evTotals[e.name] || 0) + +e.n; });
    const projects = ev.filter((e) => e.name === "project" && e.label).map((e) => ({ label: e.label, n: +e.n }));
    const ctas = ev.filter((e) => e.name === "cta" && e.label).map((e) => ({ label: e.label, n: +e.n }));
    const greeceFirst = d.countries[0] && d.countries[0].cc === "GR";
    let mapMode = store.get("mapMode", greeceFirst ? "greece" : "world");
    const secTotal = +d.sections.total || 0;

    el.innerHTML = `
      ${k.pageviews === 0 ? `<div class="card span-12" style="margin-bottom:16px;border-color:rgba(var(--gold-rgb),.3)"><div class="row">${ICON.sparkle.replace("<svg", '<svg style="width:22px;height:22px;color:var(--gold)"')}<div class="grow"><b style="font-weight:500">Δεν υπάρχουν ακόμα επισκέψεις σε αυτό το διάστημα.</b><div class="muted small">Τα στατιστικά γεμίζουν αυτόματα μόλις μπαίνουν επισκέπτες στη σελίδα. Οι δικές σας επισκέψεις ως διαχειριστής δεν μετράνε.</div></div></div></div>` : ""}
      <div class="grid">
        <div class="card span-8">
          <div class="hero-card__head">
            <div><p class="eyebrow">Μοναδικοί επισκέπτες · ${esc(rangeLabel())}</p><div class="hero-num" id="hn">0</div>${delta(k.visitors, p.visitors)}</div>
            <div class="legend"><span><i style="--c:var(--s1)"></i>Επισκέπτες</span><span><i class="line" style="--c:var(--s2)"></i>Προβολές σελίδας</span></div>
          </div>
          <div class="chart" id="cMain"></div>
        </div>
        <a class="card span-4 livebox" href="#live">
          <div class="card__head"><h3 class="card__title">Αυτή τη στιγμή</h3><span class="card__act chip"><span class="pulse"></span>Live</span></div>
          <div class="livebox__n"><span id="ovLive">${nf(lv.count)}</span></div>
          <p class="muted small" style="margin:6px 0 16px">${lv.count === 1 ? "επισκέπτης βλέπει" : "επισκέπτες βλέπουν"} τη σελίδα τώρα · σήμερα ${nf(lv.today.visitors)} συνολικά</p>
          <div class="livebox__bars" id="ovBars"></div>
          <div class="livebox__axis"><span>πριν 30′</span><span>τώρα</span></div>
        </a>
        ${tiles.map((t, i) => `<${t.href ? `a href="${t.href}"` : "div"} class="card span-2 tile" ${t.help ? `title="${esc(t.help)}"` : ""}>
            <span class="tile__label">${ICON[t.icon]}${esc(t.label)}</span>
            <span class="tile__value" data-i="${i}">0</span>
            ${delta(t.v, t.pv, t.invert)}
            ${t.s ? spark(t.s, "var(--s1)") : ""}
          </${t.href ? "a" : "div"}>`).join("")}
        <div class="card span-7">
          <div class="card__head"><h3 class="card__title">Από πού μας επισκέπτονται</h3>
            <div class="tabs" id="mapTabs"><button data-m="greece" class="${mapMode === "greece" ? "on" : ""}">Ελλάδα</button><button data-m="world" class="${mapMode === "world" ? "on" : ""}">Κόσμος</button></div></div>
          <div class="map" id="ovMap"></div>
        </div>
        <div class="card span-5">
          <div class="card__head"><h3 class="card__title">Τοποθεσίες</h3><div class="tabs" id="locTabs"><button data-t="cities" class="on">Πόλεις</button><button data-t="countries">Χώρες</button></div></div>
          <div id="locList"></div>
        </div>
        <div class="card span-4">
          <div class="card__head"><h3 class="card__title">Πηγές επισκεψιμότητας</h3><div class="tabs" id="srcTabs"><button data-t="sources" class="on">Πηγές</button><button data-t="referrers">Ιστότοποι</button><button data-t="campaigns">Καμπάνιες</button></div></div>
          <div id="srcList"></div>
        </div>
        <div class="card span-4">
          <div class="card__head"><h3 class="card__title">Συσκευές</h3></div>
          ${segBar(["desktop", "mobile", "tablet"].map((key, i) => ({ label: DEVICES[key], icon: ICON[key], n: +((d.devices.find((x) => x.k === key) || {}).n || 0), color: ["var(--s1)", "var(--s2)", "var(--s3)"][i] })))}
          <div class="card__head" style="margin:18px 0 8px"><div class="tabs" style="margin-left:0" id="techTabs"><button data-t="browsers" class="on">Browser</button><button data-t="os">Σύστημα</button><button data-t="languages">Γλώσσα</button></div></div>
          <div id="techList"></div>
        </div>
        <div class="card span-4">
          <div class="card__head"><h3 class="card__title">Μέχρι πού έφτασαν</h3><p class="card__sub" style="width:100%">Ποσοστό επισκέψεων που είδαν κάθε ενότητα</p></div>
          <div class="funnel">${SEC_KEYS.map((s, i) => { const v = secTotal ? (+d.sections[s] / secTotal) * 100 : 0; return `<div class="funnel__row"><span>${SECTIONS[s]}</span><div class="funnel__track"><i style="--w:${v}%;animation-delay:${i * 0.05}s"></i></div><b>${Math.round(v)}%</b></div>`; }).join("")}</div>
        </div>
        <div class="card span-6">
          <div class="card__head"><h3 class="card__title">Ποια έργα κοιτάνε</h3><p class="card__sub" style="width:100%">Φορές που άνοιξε η φωτογραφία κάθε έργου</p></div>
          ${barList(projects.slice(0, 8))}
        </div>
        <div class="card span-6">
          <div class="card__head"><h3 class="card__title">Τι κάνουν στη σελίδα</h3></div>
          ${barList(Object.entries(evTotals).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ html: `${ICON[EV_ICON[name]] ? ICON[EV_ICON[name]].replace("<svg", '<svg style="width:15px;height:15px;opacity:.7"') : ""}${esc(EVENTS[name] || name)}`, n })))}
          ${ctas.length ? `<div class="chiprow" style="margin-top:12px">${ctas.slice(0, 6).map((c) => `<span class="chip">«${esc(c.label)}» <b>${nf(c.n)}</b></span>`).join("")}</div>` : ""}
        </div>
        <div class="card span-6">
          <div class="card__head"><h3 class="card__title">Πότε μας επισκέπτονται</h3><p class="card__sub" style="width:100%">Προβολές ανά ημέρα και ώρα</p></div>
          ${heatmap(d.heat)}
        </div>
        <div class="card span-6">
          <div class="card__head"><h3 class="card__title">Τελευταία μηνύματα</h3><a class="card__act btn btn--sm" href="#messages">Όλα τα μηνύματα</a></div>
          ${d.messages.length ? `<div>${d.messages.map((m) => `<a class="mail${+m.is_read ? "" : " unread"}" href="#messages/${m.id}" style="border-radius:10px"><div class="mail__top"><b>${esc(m.name)}</b><time>${esc(ago(+m.ts))}</time></div><div class="mail__ex">${esc(m.excerpt)}</div></a>`).join("")}</div>` : empty("Δεν έχουν έρθει μηνύματα ακόμα", "messages")}
        </div>
      </div>`;

    countUp($("#hn", el), k.visitors);
    $$(".tile__value", el).forEach((n) => { const t = tiles[+n.dataset.i]; countUp(n, t.v, t.fmt || nf); });
    areaChart($("#cMain", el), {
      labels: S.map((x) => x.label),
      series: [{ name: "Επισκέπτες", color: "var(--s1)", values: S.map((x) => x.visitors), area: true }, { name: "Προβολές σελίδας", color: "var(--s2)", values: S.map((x) => x.pageviews) }],
      height: 270,
      tipTitle: (i) => (d.range.gran === "hour" ? `${S[i].label} – ${String((+S[i].label.slice(0, 2) + 1) % 24).padStart(2, "0")}:00` : S[i].label),
    });
    const bars = $("#ovBars", el), mx = Math.max(1, ...lv.minutes);
    bars.innerHTML = lv.minutes.map((v, i) => `<i class="${v ? "" : "zero"}" style="height:${v ? Math.max(8, (v / mx) * 100) : 3}%" data-tip="${esc(`<b>${29 - i === 0 ? "Τώρα" : `πριν ${29 - i}′`}</b><br>${v} online`)}"></i>`).join("");

    const drawMap = () => { $("#ovMap", el).innerHTML = mapSVG(mapMode, d.points); };
    drawMap();
    $("#mapTabs", el).onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      mapMode = b.dataset.m; store.set("mapMode", mapMode);
      $$("#mapTabs button", el).forEach((x) => x.classList.toggle("on", x === b)); drawMap();
    };
    const tabs = (sel, target, render) => {
      const box = $(sel, el);
      const show = (t) => { $$("button", box).forEach((x) => x.classList.toggle("on", x.dataset.t === t)); $(target, el).innerHTML = render(t); };
      box.onclick = (e) => { const b = e.target.closest("button"); if (b) show(b.dataset.t); };
      show($("button.on", box).dataset.t);
    };
    const total = k.visitors;
    tabs("#locTabs", "#locList", (t) => t === "cities"
      ? barList(d.cities.map((c) => ({ html: `${flag(c.cc)}<span>${esc(c.city)}</span>`, n: +c.n })), { total })
      : barList(d.countries.map((c) => ({ html: `${flag(c.cc)}<span>${esc(country(c.cc, c.country))}</span>`, n: +c.n })), { total }));
    tabs("#srcTabs", "#srcList", (t) => {
      if (t === "sources") return barList(d.sources.map((s) => ({ html: `<span>${esc(s.k || "Άμεση")}</span><small>${esc(MEDIUM[s.medium] || "")}</small>`, n: +s.n })), { total });
      if (t === "referrers") return barList(d.referrers.map((s) => ({ label: s.k, n: +s.n })), { total });
      return d.campaigns.length ? barList(d.campaigns.map((s) => ({ label: s.k, n: +s.n })), { total }) : empty("Δεν υπάρχουν καμπάνιες. Προσθέστε ?utm_campaign=όνομα στα links που μοιράζεστε.");
    });
    tabs("#techTabs", "#techList", (t) => barList((d[t] || []).slice(0, 6).map((s) => ({ label: t === "languages" ? language(s.k) : s.k, n: +s.n })), { total }));
  };

  /* =========================================================
     ΖΩΝΤΑΝΑ
     ========================================================= */
  VIEWS.live = async (el) => {
    setTop("Ζωντανά", "Ανανεώνεται αυτόματα κάθε 5 δευτερόλεπτα");
    let mapMode = store.get("liveMap", "greece");
    el.innerHTML = `
      <div class="grid">
        <div class="card span-12"><div class="livehead">
          <div class="livehead__n" id="lvN">0</div>
          <div><p class="eyebrow" style="display:flex;align-items:center;gap:8px"><span class="pulse"></span>Online αυτή τη στιγμή</p><div class="chiprow" id="lvChips"></div></div>
          <div class="grow"></div>
          <div style="width:min(440px,100%)"><div class="livebox__bars" id="lvBars"></div><div class="livebox__axis"><span>πριν 30′</span><span>πριν 15′</span><span>τώρα</span></div></div>
        </div></div>
        <div class="card span-7"><div class="card__head"><h3 class="card__title">Επισκέπτες στη σελίδα</h3><p class="card__sub card__act">Σε ποια ενότητα βρίσκονται και πόση ώρα</p></div><div class="livelist" id="lvList"></div></div>
        <div class="span-5" style="display:grid;gap:16px;align-content:start">
          <div class="card"><div class="card__head"><h3 class="card__title">Πού βρίσκονται</h3><div class="tabs" id="lvTabs"><button data-m="greece" class="${mapMode === "greece" ? "on" : ""}">Ελλάδα</button><button data-m="world" class="${mapMode === "world" ? "on" : ""}">Κόσμος</button></div></div><div class="map" id="lvMap"></div></div>
          <div class="card"><div class="card__head"><h3 class="card__title">Δραστηριότητα</h3><p class="card__sub card__act">Τελευταίες 3 ώρες</p></div><div class="feed" id="lvFeed"></div></div>
        </div>
      </div>`;
    let last = null;
    const render = (d) => {
      last = d;
      $("#lvN", el).textContent = nf(d.count);
      $("#lvChips", el).innerHTML = `<span class="chip">Σήμερα <b>${nf(d.today.visitors)}</b> επισκέπτες</span><span class="chip"><b>${nf(d.today.pageviews)}</b> προβολές</span>${d.unread ? `<a class="chip chip--gold" href="#messages">${nf(d.unread)} αδιάβαστα μηνύματα</a>` : ""}`;
      const mx = Math.max(1, ...d.minutes);
      $("#lvBars", el).innerHTML = d.minutes.map((v, i) => `<i class="${v ? "" : "zero"}" style="height:${v ? Math.max(8, (v / mx) * 100) : 3}%" data-tip="${esc(`<b>${29 - i === 0 ? "Τώρα" : `πριν ${29 - i}′`}</b><br>${v} online`)}"></i>`).join("");
      $("#lvList", el).innerHTML = d.active.length ? d.active.map((v) => {
        const sec = SECTIONS[v.section] || "Αρχή";
        return `<div class="visitor">
          <div class="visitor__flag">${flag(v.cc)}</div>
          <div class="visitor__main"><b>${esc(v.city || country(v.cc, v.country))}</b>${v.city ? ` <span class="muted small">${esc(country(v.cc, v.country))}</span>` : ""}
            <div class="visitor__meta"><span>${ICON[v.device] || ""}${esc(DEVICES[v.device] || v.device)} · ${esc(v.browser)}</span><span>${ICON.globe}${esc(v.source || "Άμεση")}</span>${+v.events ? `<span>${ICON.cursor}${nf(v.events)} ενέργειες</span>` : ""}</div></div>
          <div class="visitor__side"><div class="visitor__time" data-since="${v.ts}">${dur(d.now - v.ts)}</div><div class="visitor__sec">● ${esc(sec)}</div></div>
          <div class="progress" title="Scroll ${v.scroll}%"><i style="--w:${Math.max(2, +v.scroll)}%"></i></div>
        </div>`;
      }).join("") : empty("Κανείς online αυτή τη στιγμή. Η λίστα ανανεώνεται μόνη της.", "live");
      $("#lvMap", el).innerHTML = mapSVG(mapMode, d.active.map((v) => ({ lat: v.lat, lon: v.lon, city: v.city, cc: v.cc, n: 1 })), { live: true });
      $("#lvFeed", el).innerHTML = d.feed.length ? d.feed.map((f) => {
        const where = f.city || country(f.cc);
        const what = f.name === "arrive" ? `Νέος επισκέπτης από <b>${esc(where)}</b>${f.label && f.label !== "Άμεση" ? ` μέσω ${esc(f.label)}` : ""}` : `<b>${esc(where)}</b> · ${esc(EVENTS[f.name] || f.name)}${f.label ? ` «${esc(f.label)}»` : ""}`;
        return `<div class="feed__i"><span class="feed__ic k-${esc(f.name)}">${ICON[EV_ICON[f.name]] || ICON.cursor}</span><span class="feed__t">${what}</span><span class="feed__when">${esc(ago(+f.ts))}</span></div>`;
      }).join("") : empty("Καμία δραστηριότητα τις τελευταίες ώρες", "sparkle");
      setBadges(d.count, d.unread);
    };
    render(await api("live"));
    $("#lvTabs", el).onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      mapMode = b.dataset.m; store.set("liveMap", mapMode);
      $$("#lvTabs button", el).forEach((x) => x.classList.toggle("on", x === b));
      if (last) render(last);
    };
    const poll = setInterval(async () => { try { render(await api("live")); } catch { /* επόμενη φορά */ } }, 5000);
    const clock = setInterval(() => {
      const now = Date.now() / 1000;
      $$("[data-since]", el).forEach((n) => { n.textContent = dur(now - +n.dataset.since); });
    }, 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  };

  /* =========================================================
     ΕΠΙΣΚΕΨΕΙΣ
     ========================================================= */
  VIEWS.visits = async (el) => {
    const st = { page: 1, q: "", device: "", source: "", cc: "", engaged: "" };
    const params = () => ({ ...rangeParams(), ...st });
    const exp = document.createElement("a");
    exp.className = "btn";
    exp.innerHTML = `${ICON.download} Εξαγωγή CSV`;
    exp.onclick = () => { exp.href = exportUrl("export", params()); };
    exp.setAttribute("download", "");
    setTop("Επισκέψεις", `Κάθε επίσκεψη ξεχωριστά · ${rangeLabel()}`, rangePicker(), exp);
    el.innerHTML = `<div class="card card--pad0">
      <div class="row" style="padding:14px">
        <div class="search grow" style="min-width:200px">${ICON.search}<input class="input" id="vQ" placeholder="Αναζήτηση πόλης, πηγής, browser…"></div>
        <select class="select" id="vDev" style="width:auto"><option value="">Όλες οι συσκευές</option>${Object.entries(DEVICES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
        <select class="select" id="vSrc" style="width:auto"><option value="">Όλες οι πηγές</option></select>
        <select class="select" id="vCc" style="width:auto"><option value="">Όλες οι χώρες</option></select>
        <label class="switch"><input type="checkbox" id="vEng"><i></i><span class="small">Μόνο ουσιαστικές</span></label>
      </div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Πότε</th><th>Τοποθεσία</th><th>Πηγή</th><th>Συσκευή</th><th class="num">Χρόνος</th><th class="num">Scroll</th><th>Ενότητες</th><th class="num">Ενέργειες</th></tr></thead><tbody id="vRows"></tbody></table></div>
      <div class="pager" style="padding:12px 16px 14px" id="vPager"></div>
    </div>`;
    let filtersLoaded = false, timer;
    const load = async () => {
      const d = await api("visits", { params: params() });
      if (!filtersLoaded) {
        $("#vSrc", el).insertAdjacentHTML("beforeend", d.sources.map((s) => `<option value="${esc(s.k)}">${esc(s.k)} (${nf(s.n)})</option>`).join(""));
        $("#vCc", el).insertAdjacentHTML("beforeend", d.countries.map((s) => `<option value="${esc(s.k)}">${esc(country(s.k, s.country))} (${nf(s.n)})</option>`).join(""));
        filtersLoaded = true;
      }
      $("#vRows", el).innerHTML = d.rows.length ? d.rows.map((r) => {
        const secs = String(r.sections || "").split(",");
        return `<tr data-pid="${esc(r.pid)}">
          <td><b style="font-weight:500">${esc(fTime(+r.ts))}</b><div class="muted small">${esc(fDate(+r.ts, { day: "numeric", month: "short" }))}</div></td>
          <td><div class="loc">${flag(r.cc)}<div><b>${esc(r.city || country(r.cc, r.country))}</b><small>${r.city ? esc(country(r.cc, r.country)) : ""}</small></div></div></td>
          <td>${esc(r.source || "Άμεση")}<div class="muted small">${esc(r.utm_campaign || MEDIUM[r.medium] || "")}</div></td>
          <td><span class="dev">${ICON[r.device] || ""}${esc(r.browser)}</span><div class="muted small">${esc(r.os)}</div></td>
          <td class="num">${dur(r.dur)}</td><td class="num">${+r.scroll}%</td>
          <td><div class="secdots" title="${esc(SEC_KEYS.filter((s) => secs.includes(s)).map((s) => SECTIONS[s]).join(", "))}">${SEC_KEYS.map((s) => `<i class="${secs.includes(s) ? "on" : ""}"></i>`).join("")}</div></td>
          <td class="num">${+r.events ? nf(r.events) : "—"}</td></tr>`;
      }).join("") : `<tr><td colspan="8">${empty("Δεν βρέθηκαν επισκέψεις με αυτά τα φίλτρα", "visits")}</td></tr>`;
      $("#vPager", el).innerHTML = `<span>${nf(d.total)} επισκέψεις</span><span class="row"><button class="btn btn--sm" data-p="${d.page - 1}" ${d.page <= 1 ? "disabled" : ""}>‹ Προηγούμενες</button><span>Σελίδα ${d.page} / ${d.pages}</span><button class="btn btn--sm" data-p="${d.page + 1}" ${d.page >= d.pages ? "disabled" : ""}>Επόμενες ›</button></span>`;
    };
    $("#vQ", el).oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300); };
    $("#vDev", el).onchange = (e) => { st.device = e.target.value; st.page = 1; load(); };
    $("#vSrc", el).onchange = (e) => { st.source = e.target.value; st.page = 1; load(); };
    $("#vCc", el).onchange = (e) => { st.cc = e.target.value; st.page = 1; load(); };
    $("#vEng", el).onchange = (e) => { st.engaged = e.target.checked ? "1" : ""; st.page = 1; load(); };
    $("#vPager", el).onclick = (e) => { const b = e.target.closest("[data-p]"); if (b) { st.page = +b.dataset.p; load(); el.scrollIntoView({ behavior: "smooth" }); } };
    $("#vRows", el).onclick = (e) => { const tr = e.target.closest("tr[data-pid]"); if (tr) visitDrawer(tr.dataset.pid); };
    await load();
  };

  async function visitDrawer(pid) {
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.style.placeItems = "stretch end";
    ov.innerHTML = `<aside class="drawer"><div class="modal__head"><h3>Λεπτομέρειες επίσκεψης</h3><button class="iconbtn" data-x aria-label="Κλείσιμο">${ICON.close}</button></div><div class="modal__body"><div class="skel" style="height:200px"></div></div></aside>`;
    const close = () => { ov.remove(); document.removeEventListener("keydown", key); };
    const key = (e) => { if (e.key === "Escape") close(); };
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    $("[data-x]", ov).onclick = close;
    document.addEventListener("keydown", key);
    document.body.append(ov);
    try {
      const d = await api("visit", { params: { pid } });
      const v = d.visit, secs = String(v.sections || "").split(",");
      $(".modal__body", ov).innerHTML = `
        <div class="row" style="margin-bottom:18px"><div class="visitor__flag">${flag(v.cc)}</div><div><b style="font-size:17px;font-weight:500">${esc(v.city || country(v.cc, v.country))}</b><div class="muted small">${esc([v.region, country(v.cc, v.country)].filter(Boolean).join(", "))}</div></div></div>
        <dl class="kv">
          <dt>Ώρα</dt><dd>${esc(fDate(+v.ts))}, ${esc(fTime(+v.ts))}</dd>
          <dt>Ενεργός χρόνος</dt><dd>${dur(v.dur)}</dd>
          <dt>Scroll</dt><dd>${+v.scroll}%</dd>
          <dt>Πηγή</dt><dd>${esc(v.source || "Άμεση")}${v.ref ? `<div class="muted small">${esc(v.ref)}</div>` : ""}</dd>
          ${v.utm_campaign ? `<dt>Καμπάνια</dt><dd>${esc(v.utm_campaign)}</dd>` : ""}
          <dt>Συσκευή</dt><dd>${esc(DEVICES[v.device] || v.device)} · ${esc(v.browser)} · ${esc(v.os)}</dd>
          <dt>Οθόνη</dt><dd>${+v.sw ? `${v.sw}×${v.sh}` : "—"}</dd>
          <dt>Γλώσσα</dt><dd>${esc(v.lang ? language(v.lang) : "—")}</dd>
          <dt>Ζώνη ώρας</dt><dd>${esc(v.tz || "—")}</dd>
          <dt>Φόρτωση</dt><dd>${+v.load_ms ? `${(v.load_ms / 1000).toFixed(1).replace(".", ",")}″` : "—"}</dd>
        </dl>
        <h4 style="font-weight:500;margin:22px 0 10px">Ενότητες που είδε</h4>
        <div class="chiprow">${SEC_KEYS.map((s) => `<span class="chip${secs.includes(s) ? " chip--gold" : ""}">${secs.includes(s) ? "✓" : "–"} ${SECTIONS[s]}</span>`).join("")}</div>
        <h4 style="font-weight:500;margin:22px 0 6px">Τι έκανε</h4>
        <div class="feed" style="max-height:none">
          <div class="feed__i"><span class="feed__ic k-arrive">${ICON.pointer}</span><span class="feed__t">Μπήκε στη σελίδα</span><span class="feed__when">${esc(fTime(+v.ts))}</span></div>
          ${d.events.map((e) => `<div class="feed__i"><span class="feed__ic k-${esc(e.name)}">${ICON[EV_ICON[e.name]] || ICON.cursor}</span><span class="feed__t">${esc(EVENTS[e.name] || e.name)}${e.label ? ` «${esc(e.label)}»` : ""}</span><span class="feed__when">${esc(fTime(+e.ts))}</span></div>`).join("")}
          <div class="feed__i"><span class="feed__ic">${ICON.logout}</span><span class="feed__t">Τελευταία δραστηριότητα</span><span class="feed__when">${esc(fTime(+v.last_ts))}</span></div>
        </div>
        ${d.session.length ? `<p class="muted small" style="margin-top:16px">Στην ίδια συνεδρία έκανε ακόμη ${d.session.length} ${d.session.length === 1 ? "προβολή" : "προβολές"}.</p>` : ""}`;
    } catch (e) {
      $(".modal__body", ov).innerHTML = empty(e.message, "alert");
    }
  }

  /* =========================================================
     ΜΗΝΥΜΑΤΑ
     ========================================================= */
  VIEWS.messages = async (el, args) => {
    const st = { filter: "inbox", q: "", open: args[0] ? +args[0] : 0 };
    const exp = document.createElement("a");
    exp.className = "btn";
    exp.innerHTML = `${ICON.download} Εξαγωγή`;
    exp.setAttribute("download", "");
    exp.onclick = () => { exp.href = exportUrl("messages.export", { filter: st.filter, q: st.q }); };
    setTop("Μηνύματα", "Ό,τι στάλθηκε από τη φόρμα επικοινωνίας", exp);
    el.innerHTML = `<div class="card card--pad0"><div class="inbox" id="ibx">
      <div class="inbox__list">
        <div class="inbox__tools">
          <div class="tabs" id="mTabs" style="flex-wrap:wrap"></div>
          <div class="search">${ICON.search}<input class="input" id="mQ" placeholder="Αναζήτηση…"></div>
        </div>
        <div class="inbox__items" id="mList"></div>
      </div>
      <div class="reader" id="mRead">${empty("Διαλέξτε ένα μήνυμα από τη λίστα", "messages")}</div>
    </div></div>`;
    let rows = [], timer;
    const FILTERS = [["inbox", "Εισερχόμενα"], ["unread", "Αδιάβαστα"], ["starred", "Με αστέρι"], ["archived", "Αρχείο"]];
    const load = async () => {
      const d = await api("messages.list", { params: { filter: st.filter, q: st.q } });
      rows = d.rows;
      $("#mTabs", el).innerHTML = FILTERS.map(([k, l]) => `<button data-f="${k}" class="${st.filter === k ? "on" : ""}">${l}${d.counts[k] ? ` <span class="muted">${nf(d.counts[k])}</span>` : ""}</button>`).join("");
      $("#mList", el).innerHTML = rows.length ? rows.map((m) => `<div class="mail${+m.is_read ? "" : " unread"}${+m.id === st.open ? " on" : ""}" data-id="${m.id}">
          <div class="mail__top"><b>${+m.starred ? '<span class="mail__star">★</span> ' : ""}${esc(m.name)}</b><time>${esc(ago(+m.ts))}</time></div>
          <div class="mail__ex">${esc(m.excerpt)}</div></div>`).join("") : empty(st.q ? "Δεν βρέθηκαν μηνύματα" : "Δεν υπάρχουν μηνύματα εδώ", "messages");
      setBadges(null, d.counts.unread || 0);
    };
    const open = async (id) => {
      st.open = id;
      $$(".mail", el).forEach((x) => x.classList.toggle("on", +x.dataset.id === id));
      $("#ibx", el).classList.add("reading");
      const box = $("#mRead", el);
      box.innerHTML = `<div class="skel" style="height:240px"></div>`;
      try {
        const { message: m } = await api("messages.get", { params: { id } });
        const row = $(`.mail[data-id="${id}"]`, el); if (row) row.classList.remove("unread");
        const subj = encodeURIComponent("Απάντηση στο μήνυμά σας — M&M Τεχνικά Έργα");
        const quote = encodeURIComponent(`\n\n---\nΣτις ${fDT(+m.ts)} γράψατε:\n${m.message}`);
        box.innerHTML = `
          <button class="btn btn--sm burger-back" id="mBack" style="margin-bottom:14px">‹ Πίσω</button>
          <div class="reader__head">
            <div class="reader__who"><h2>${esc(m.name)}</h2><a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.phone ? ` · <a href="tel:${esc(m.phone.replace(/[^+\d]/g, ""))}">${esc(m.phone)}</a>` : ""}
              <div class="reader__facts"><span class="chip">${ICON.clock.replace("<svg", '<svg style="width:13px;height:13px"')} ${esc(fDate(+m.ts))}, ${esc(fTime(+m.ts))}</span>${m.city || m.cc ? `<span class="chip">${flag(m.cc)} ${esc(m.city || country(m.cc))}</span>` : ""}</div></div>
            <div class="row">
              <a class="btn btn--gold" href="mailto:${esc(m.email)}?subject=${subj}&body=${quote}">${ICON.mail} Απάντηση</a>
              ${m.phone ? `<a class="btn" href="tel:${esc(m.phone.replace(/[^+\d]/g, ""))}">${ICON.phone} Κλήση</a>` : ""}
            </div>
          </div>
          <div class="reader__body">${esc(m.message)}</div>
          <div class="row" style="margin-top:26px;padding-top:16px;border-top:1px solid var(--line)">
            <button class="btn btn--sm" data-act="star">${ICON.star} ${+m.starred ? "Αφαίρεση αστεριού" : "Αστέρι"}</button>
            <button class="btn btn--sm" data-act="archive">${ICON.archive} ${+m.archived ? "Επαναφορά" : "Αρχειοθέτηση"}</button>
            <button class="btn btn--sm" data-act="unread">${ICON.eye} Σήμανση ως αδιάβαστο</button>
            <button class="btn btn--sm btn--danger" data-act="delete" style="margin-left:auto">${ICON.trash} Διαγραφή</button>
          </div>`;
        $("#mBack", box).onclick = () => $("#ibx", el).classList.remove("reading");
        box.onclick = async (e) => {
          const b = e.target.closest("[data-act]"); if (!b) return;
          const act = b.dataset.act;
          try {
            if (act === "delete") {
              if (!(await confirmBox("Διαγραφή μηνύματος", `Το μήνυμα από «${esc(m.name)}» θα διαγραφεί οριστικά.`, { ok: "Διαγραφή", danger: true }))) return;
              await api("messages.delete", { body: { ids: [m.id] } });
              toast("Το μήνυμα διαγράφηκε");
              box.innerHTML = empty("Διαλέξτε ένα μήνυμα από τη λίστα", "messages");
              $("#ibx", el).classList.remove("reading");
            } else {
              const body = { ids: [m.id] };
              if (act === "star") body.starred = !+m.starred;
              if (act === "archive") body.archived = !+m.archived;
              if (act === "unread") body.is_read = false;
              await api("messages.update", { body });
              toast(act === "star" ? (body.starred ? "Προστέθηκε αστέρι" : "Αφαιρέθηκε το αστέρι") : act === "archive" ? (body.archived ? "Αρχειοθετήθηκε" : "Επέστρεψε στα εισερχόμενα") : "Σημάνθηκε ως αδιάβαστο");
              if (act !== "unread") await open(m.id);
            }
            await load();
          } catch (err) { toast(err.message, "err"); }
        };
      } catch (err) { box.innerHTML = empty(err.message, "alert"); }
    };
    $("#mTabs", el).onclick = (e) => { const b = e.target.closest("[data-f]"); if (b) { st.filter = b.dataset.f; load(); } };
    $("#mQ", el).oninput = (e) => { clearTimeout(timer); timer = setTimeout(() => { st.q = e.target.value.trim(); load(); }, 300); };
    $("#mList", el).onclick = (e) => { const r = e.target.closest(".mail[data-id]"); if (r) { history.replaceState(null, "", `#messages/${r.dataset.id}`); open(+r.dataset.id); } };
    await load();
    if (st.open) open(st.open);
  };

  /* =========================================================
     Σύνδεση / πρώτη εκκίνηση
     ========================================================= */
  function authBg() {
    const cv = $("#authBg");
    if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = cv.getContext("2d");
    let w, h, t = 0;
    const GAP = 34;
    const size = () => { const r = Math.min(devicePixelRatio || 1, 2); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * r; cv.height = h * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
    size(); addEventListener("resize", size);
    (function draw() {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);
      for (let x = GAP / 2; x < w; x += GAP) for (let y = GAP / 2; y < h; y += GAP) {
        const dx = x - w / 2, dy = y - h / 2, d = Math.hypot(dx, dy);
        const wave = (Math.sin(d * 0.012 - t * 2.4) + 1) / 2;
        const a = 0.04 + wave * 0.22 * Math.max(0, 1 - d / Math.max(w, h));
        ctx.fillStyle = `rgba(200,179,120,${a})`;
        const s = 1 + wave * 1.4;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      requestAnimationFrame(draw);
    })();
  }

  function authScreen() {
    authBg();
    $$(".pw__eye").forEach((b) => b.addEventListener("click", () => {
      const i = b.previousElementSibling;
      i.type = i.type === "password" ? "text" : "password";
      b.style.opacity = i.type === "text" ? 1 : "";
    }));
    const err = (id, msg) => {
      const e = $(id); if (!e) return;
      e.textContent = msg;
      const card = $(".auth__card"); card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    };
    const busy = (form, on) => { const b = $("button[type=submit]", form); b.disabled = on; b.classList.toggle("loading", on); };

    const setup = $("#setupForm");
    if (setup) {
      const pass = setup.elements.pass, meter = $("#meter"), txt = $("#meterTxt");
      pass.addEventListener("input", () => {
        const v = pass.value;
        let s = 0;
        if (v.length >= 10) s++; if (v.length >= 14) s++;
        if (/[a-zα-ω]/.test(v) && /[A-ZΑ-Ω]/.test(v)) s++;
        if (/\d/.test(v)) s++; if (/[^\w\s]/.test(v)) s++;
        const lv = [["Πολύ αδύναμος", "#d03b3b"], ["Αδύναμος", "#ec835a"], ["Μέτριος", "#fab219"], ["Καλός", "#9bc53d"], ["Πολύ καλός", "#0ca30c"], ["Εξαιρετικός", "#0ca30c"]][s];
        meter.style.width = `${Math.max(8, (s / 5) * 100)}%`; meter.style.background = lv[1]; txt.textContent = v ? lv[0] : "";
      });
      setup.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = setup.elements;
        if (f.pass.value.length < 10) return err("#authErr", "Ο κωδικός θέλει τουλάχιστον 10 χαρακτήρες.");
        if (f.pass.value !== f.pass2.value) return err("#authErr", "Οι δύο κωδικοί δεν ταιριάζουν.");
        busy(setup, true);
        try { await api("setup", { body: { user: f.user.value.trim(), pass: f.pass.value } }); location.reload(); }
        catch (x) { err("#authErr", x.message); busy(setup, false); }
      });
    }

    const login = $("#loginForm"), tfa = $("#tfaForm");
    if (login) {
      login.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = login.elements;
        busy(login, true);
        try {
          const r = await api("login", { body: { user: f.user.value.trim(), pass: f.pass.value, remember: f.remember.checked } });
          if (r.need2fa) { login.hidden = true; tfa.hidden = false; tfa.elements.code.focus(); busy(login, false); return; }
          location.reload();
        } catch (x) { err("#authErr", x.message); busy(login, false); f.pass.select(); }
      });
      tfa.addEventListener("submit", async (e) => {
        e.preventDefault();
        busy(tfa, true);
        try { await api("login2fa", { body: { code: tfa.elements.code.value } }); location.reload(); }
        catch (x) {
          busy(tfa, false);
          if (x.data && x.data.restart) { tfa.hidden = true; login.hidden = false; err("#authErr", x.message); return; }
          err("#tfaErr", x.message); tfa.elements.code.select();
        }
      });
      tfa.elements.code.addEventListener("input", (e) => { if (e.target.value.replace(/\D/g, "").length === 6) tfa.requestSubmit(); });
    }
  }

  /* ---------- Κοινόχρηστα για το admin-site.js ---------- */
  const MMA = {
    $, $$, esc, clone, store, nf, compact, pct, dur, fDate, fTime, fDT, ago, bytes, norm, country, flag, ICON, SECTIONS, EVENTS,
    api, exportUrl, toast, modal, confirmBox, tip, countUp, empty, spark, barList, setTop, route, guardLeave, VIEWS, TITLES, NAV,
    get csrf() { return CSRF; }, set csrf(v) { CSRF = v; },
    dirty: false, discard: null, palette: null,
    start() {
      if (!document.body.classList.contains("view-app")) return;
      buildShell();
      route();
    },
  };
  window.MMA = MMA;

  if (!document.body.classList.contains("view-app")) authScreen();
})();
