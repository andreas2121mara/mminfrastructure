/* =========================================================
   M&M — Ανώνυμα στατιστικά επισκεψιμότητας
   Χωρίς cookies και χωρίς αποθήκευση στη συσκευή του επισκέπτη.
   Καταγράφει: προβολή, ενεργό χρόνο, scroll, ενότητες που είδε,
   και κλικ σε τηλέφωνο / email / έργα / κουμπιά.
   ========================================================= */
(() => {
  const me = document.currentScript;
  const dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  if (me && me.dataset.dnt === "1" && dnt) return;
  if (navigator.webdriver || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;

  const EP = new URL("api/track.php", document.baseURI).href;
  const rnd = () => {
    try { return [...crypto.getRandomValues(new Uint8Array(10))].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 18); }
    catch { return (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 18); }
  };
  const pid = rnd();
  window.mmPid = pid;

  const send = (d, beacon = false) => {
    d.pid = pid;
    const body = JSON.stringify(d);
    if (beacon && navigator.sendBeacon) {
      try { if (navigator.sendBeacon(EP, new Blob([body], { type: "text/plain" }))) return; } catch { /* */ }
    }
    try { fetch(EP, { method: "POST", body, keepalive: true, credentials: "same-origin", headers: { "Content-Type": "text/plain" } }).catch(() => {}); } catch { /* */ }
  };

  /* ---------- Προβολή σελίδας ---------- */
  const q = new URLSearchParams(location.search);
  let sentPv = false;
  const pageview = () => {
    if (sentPv) return;
    sentPv = true;
    const nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    send({
      t: "pv",
      path: location.pathname,
      ref: document.referrer,
      sw: screen.width, sh: screen.height,
      lang: navigator.language || "",
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
      us: q.get("utm_source") || (q.has("fbclid") ? "facebook" : q.has("gclid") ? "google" : ""),
      um: q.get("utm_medium") || "",
      uc: q.get("utm_campaign") || "",
      load: nav ? Math.round(nav.loadEventStart || nav.domContentLoadedEventEnd || 0) : 0,
    });
  };
  if (document.readyState === "complete") pageview();
  else { addEventListener("load", () => setTimeout(pageview, 0)); setTimeout(pageview, 2500); }

  /* ---------- Ενότητες, scroll, ενεργός χρόνος ---------- */
  const SECS = ["hero", "about", "services", "projects", "compare", "process", "fleet", "contact"];
  const seen = new Set(["hero"]);
  const vis = {};
  let cur = "hero";
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        const h = e.isIntersecting ? e.intersectionRect.height : 0;
        vis[e.target.id] = h;
        if (h > innerHeight * 0.4 || e.intersectionRatio > 0.6) seen.add(e.target.id);
      });
      cur = Object.keys(vis).reduce((a, b) => ((vis[b] || 0) > (vis[a] || 0) ? b : a), cur);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    SECS.forEach((id) => { const n = document.getElementById(id); if (n) io.observe(n); });
  }

  let active = 0, lastAct = Date.now(), maxSc = 0;
  const act = () => { lastAct = Date.now(); };
  ["mousemove", "keydown", "touchstart", "click", "wheel"].forEach((t) => addEventListener(t, act, { passive: true }));
  addEventListener("scroll", () => {
    act();
    const h = document.documentElement.scrollHeight;
    maxSc = Math.max(maxSc, Math.min(100, Math.round(((scrollY + innerHeight) / Math.max(1, h)) * 100)));
  }, { passive: true });
  setInterval(() => { if (document.visibilityState === "visible" && Date.now() - lastAct < 30000) active++; }, 1000);

  const t0 = Date.now();
  const beat = (beacon = false) => { if (sentPv) send({ t: "hb", s: cur, seen: [...seen], sc: maxSc, a: active }, beacon); };
  setInterval(() => { if (document.visibilityState === "visible" && Date.now() - t0 < 4 * 3600e3) beat(); }, 15000);
  addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") beat(true); else beat(); });
  addEventListener("pagehide", () => beat(true));

  /* ---------- Ενέργειες ---------- */
  const ev = (n, l = "") => { if (sentPv) send({ t: "ev", n, l: String(l).trim().slice(0, 140) }); };
  window.mmTrack = ev;
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("mm-editing")) return;
    const p = e.target.closest(".project");
    if (p) { ev("project", (p.querySelector("h3") || {}).textContent || ""); return; }
    const a = e.target.closest("a, button");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("tel:")) return ev("phone", href.slice(4));
    if (href.startsWith("mailto:")) return ev("email", href.slice(7));
    if (a.closest("#filters")) return ev("filter", a.textContent);
    if (a.dataset.track === "social") return ev("social", a.textContent.replace("↗", ""));
    if (a.dataset.track === "cta" || a.classList.contains("nav__cta")) return ev("cta", a.textContent);
    if (a.closest("#nav")) return ev("nav", a.textContent);
    if (/^https?:/i.test(href) && a.host && a.host !== location.host) return ev("outbound", a.host);
  }, true);
  const ba = document.getElementById("ba");
  if (ba) ba.addEventListener("pointerdown", () => ev("compare"), { once: true });
})();
