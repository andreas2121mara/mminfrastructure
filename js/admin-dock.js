/* =========================================================
   M&M — Μπάρα διαχειριστή & επεξεργασία πάνω στη σελίδα
   • Χωρίς σύνδεση: παράθυρο σύνδεσης (από το κουμπάκι 🔒 στο footer)
   • Με σύνδεση: πλωτή μπάρα (online τώρα, μηνύματα, Διαχείριση)
     και λειτουργία «Επεξεργασία»: κλικ σε κείμενο ή φωτογραφία → αλλαγή.
   ========================================================= */
(() => {
  if (window.MMDock) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ADMIN = window.MM_ADMIN || null;
  const API = new URL("admin/api.php", document.baseURI).href;

  async function api(a, { params, body, form } = {}) {
    const url = new URL(API);
    url.searchParams.set("a", a);
    for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
    const opt = { method: body || form ? "POST" : "GET", credentials: "same-origin", headers: { Accept: "application/json", "X-CSRF": ADMIN ? ADMIN.csrf : "" } };
    if (body) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    if (form) opt.body = form;
    const res = await fetch(url, opt);
    let d = {};
    try { d = await res.json(); } catch { /* */ }
    if (!res.ok) { const e = new Error(d.error || `Σφάλμα ${res.status}`); e.data = d; e.status = res.status; throw e; }
    return d;
  }

  function toast(msg, err = false) {
    let box = $(".mmd-toasts");
    if (!box) { box = document.createElement("div"); box.className = "mmd-toasts"; document.body.append(box); }
    const t = document.createElement("div");
    t.className = `mmd-toast${err ? " mmd-toast--err" : ""}`;
    t.textContent = msg;
    box.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, err ? 5000 : 2600);
  }

  function overlay(html, cls = "") {
    const ov = document.createElement("div");
    ov.className = `mmd-ov ${cls}`;
    ov.innerHTML = html;
    const close = () => { ov.remove(); removeEventListener("keydown", key, true); };
    const key = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    addEventListener("keydown", key, true);
    document.body.append(ov);
    return { ov, close };
  }

  /* =========================================================
     Σύνδεση (για επισκέπτη που δεν είναι συνδεδεμένος)
     ========================================================= */
  function login() {
    if ($(".mmd-login")) return;
    const { ov, close } = overlay(`<form class="mmd-card mmd-login" autocomplete="on">
      <button type="button" class="mmd-x" aria-label="Κλείσιμο">×</button>
      <img src="assets/logo/logo-mark.svg" alt="" class="mmd-login__logo">
      <h3>Σύνδεση διαχειριστή</h3>
      <div class="mmd-step1">
        <label>Όνομα χρήστη<input name="user" autocomplete="username" required></label>
        <label>Κωδικός<input name="pass" type="password" autocomplete="current-password" required></label>
        <label class="mmd-chk"><input type="checkbox" name="remember"> Να με θυμάσαι (30 μέρες)</label>
      </div>
      <div class="mmd-step2" hidden>
        <p class="mmd-muted">Γράψτε τον 6ψήφιο κωδικό από την εφαρμογή επαλήθευσης.</p>
        <label>Κωδικός επαλήθευσης<input name="code" inputmode="numeric" maxlength="7" autocomplete="one-time-code" class="mmd-otp"></label>
      </div>
      <p class="mmd-err" role="alert"></p>
      <button class="mmd-btn mmd-btn--gold mmd-btn--block" type="submit">Σύνδεση</button>
      <a class="mmd-link" href="admin/">Άνοιγμα πλήρους σελίδας διαχείρισης →</a>
    </form>`, "mmd-ov--center");
    const f = $("form", ov), err = $(".mmd-err", f), btn = $("button[type=submit]", f);
    let step = 1;
    $(".mmd-x", f).onclick = close;
    setTimeout(() => f.elements.user.focus(), 50);
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      btn.disabled = true;
      try {
        if (step === 1) {
          const r = await api("login", { body: { user: f.elements.user.value.trim(), pass: f.elements.pass.value, remember: f.elements.remember.checked } });
          if (r.need2fa) {
            step = 2; $(".mmd-step1", f).hidden = true; $(".mmd-step2", f).hidden = false; btn.textContent = "Επιβεβαίωση";
            f.elements.code.focus(); btn.disabled = false; return;
          }
        } else {
          await api("login2fa", { body: { code: f.elements.code.value } });
        }
        btn.textContent = "✓";
        location.reload();
      } catch (x) {
        if (x.data && x.data.setup) { location.href = "admin/"; return; }
        if (x.data && x.data.restart) { step = 1; $(".mmd-step1", f).hidden = false; $(".mmd-step2", f).hidden = true; btn.textContent = "Σύνδεση"; }
        err.textContent = x.message;
        f.classList.remove("mmd-shake"); void f.offsetWidth; f.classList.add("mmd-shake");
        btn.disabled = false;
      }
    });
  }

  window.MMDock = { login };
  if (!ADMIN) return;
  if (window.self !== window.top) return; // μέσα στην προεπισκόπηση της Διαχείρισης: τίποτα

  /* =========================================================
     Μπάρα διαχειριστή
     ========================================================= */
  const dock = document.createElement("div");
  dock.className = "mmd-dock";
  dock.setAttribute("role", "toolbar");
  dock.setAttribute("aria-label", "Εργαλεία διαχειριστή");
  dock.innerHTML = `
    <img class="mmd-dock__logo" src="assets/logo/logo-mark.svg" alt="">
    <a class="mmd-live" href="admin/#live" title="Επισκέπτες αυτή τη στιγμή"><i></i><b id="mmdLive">–</b><span>online</span></a>
    <button class="mmd-btn" id="mmdEdit" type="button" aria-pressed="false"><span class="mmd-ic">✎</span><span class="mmd-lbl">Επεξεργασία</span></button>
    <a class="mmd-btn" href="admin/#messages" title="Μηνύματα"><span class="mmd-ic">✉</span><span class="mmd-badge" id="mmdMsg"></span></a>
    <a class="mmd-btn mmd-btn--gold" href="admin/"><span class="mmd-ic">▦</span><span class="mmd-lbl">Διαχείριση</span></a>
    <button class="mmd-icon" id="mmdOut" type="button" title="Αποσύνδεση" aria-label="Αποσύνδεση">⏻</button>
    <button class="mmd-icon" id="mmdMin" type="button" title="Απόκρυψη" aria-label="Απόκρυψη μπάρας">‹</button>`;
  document.body.append(dock);
  document.body.classList.add("mm-admin");
  if (ADMIN.maintenance) {
    const r = document.createElement("a");
    r.className = "mmd-ribbon";
    r.href = "admin/#settings";
    r.textContent = "Λειτουργία συντήρησης: οι επισκέπτες βλέπουν σελίδα αναμονής — πατήστε για αλλαγή";
    document.body.append(r);
  }

  try { if (sessionStorage.getItem("mmd.min") === "1") dock.classList.add("min"); } catch { /* */ }
  $("#mmdMin").onclick = () => {
    dock.classList.toggle("min");
    try { sessionStorage.setItem("mmd.min", dock.classList.contains("min") ? "1" : "0"); } catch { /* */ }
  };
  $("#mmdOut").onclick = async () => {
    if (!confirm("Αποσύνδεση από τη διαχείριση;")) return;
    try { await api("logout", { body: {} }); } catch { /* */ }
    location.href = location.pathname;
  };

  const poll = async () => {
    try {
      const b = await api("badge");
      $("#mmdLive").textContent = b.live;
      const m = $("#mmdMsg"); m.textContent = b.unread || ""; m.hidden = !b.unread;
    } catch (e) { if (e.status === 401) location.reload(); }
  };
  poll();
  setInterval(() => { if (document.visibilityState === "visible") poll(); }, 20000);

  /* =========================================================
     Επεξεργασία πάνω στη σελίδα
     ========================================================= */
  let editing = false, content = null, pop = null;
  const SCHEMA = window.MM_SCHEMA;
  const getVal = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), content);
  const setVal = (path, v) => {
    const ks = path.split("."), last = ks.pop();
    const o = ks.reduce((x, k) => x[k], content);
    o[last] = v;
  };
  const rich = (s, cls = "") => esc(s).replace(/\*([^*\n]+)\*/g, cls ? `<i class="${cls}">$1</i>` : "<i>$1</i>").replace(/\n/g, "<br/>");
  const SEC_LINK = { hero: "content/hero", marquee: "content/marquee", about: "content/about", services: "content/services", projects: "projects", compare: "content/compare", process: "content/process", fleet: "content/fleet", contact: "content/contact" };
  const SEC_NAME = { hero: "Αρχική οθόνη", marquee: "Κυλιόμενη μπάρα", about: "Η Εταιρεία", services: "Υπηρεσίες", projects: "Έργα", compare: "Πριν · Μετά", process: "Μέθοδος", fleet: "Εξοπλισμός", contact: "Επικοινωνία" };

  function render(node, path, type, v) {
    if (type === "image") { node.src = v; return; }
    if (type === "number") { node.dataset.count = v; node.textContent = v; return; }
    if (type === "title") {
      const lines = String(v).split("\n").map((x) => x.trim()).filter(Boolean);
      node.innerHTML = lines.map((ln, i) => `<span class="line"><span${lines.length > 1 && i === lines.length - 1 ? ' class="gold"' : ""}>${rich(ln)}</span></span>`).join("");
      return;
    }
    if (type === "rich") { node.innerHTML = rich(v, path === "contact.title" ? "gold" : ""); return; }
    node.textContent = v;
    if (path === "company.phone") { const a = node.closest("a"); if (a) a.href = `tel:${String(v).replace(/[^+\d]/g, "")}`; }
    if (path === "company.email") { const a = node.closest("a"); if (a) a.href = `mailto:${v}`; }
  }

  async function save(path, value, node, type) {
    const r = await api("content.patch", { body: { path, value } });
    setVal(path, r.value);
    render(node, path, type, r.value);
    toast("Αποθηκεύτηκε — είναι ήδη online ✓");
  }

  function closePop() { if (pop) { pop.remove(); pop = null; } }

  function openText(node) {
    closePop();
    const path = node.dataset.edit, type = node.dataset.type || "text";
    const info = SCHEMA && SCHEMA.find(path);
    const multi = type === "rich" || type === "title";
    const val = getVal(path);
    pop = document.createElement("div");
    pop.className = "mmd-pop";
    pop.innerHTML = `<div class="mmd-pop__head"><b>${esc(info ? info.label : path)}</b><button type="button" class="mmd-x" aria-label="Κλείσιμο">×</button></div>
      ${multi ? `<textarea rows="${Math.min(8, Math.max(3, String(val).split("\n").length + 1))}"></textarea>` : `<input ${type === "number" ? 'type="number" step="1"' : 'type="text"'}>`}
      <div class="mmd-pop__help">${esc(info && info.field.help ? info.field.help : multi ? "Enter = νέα γραμμή · *λέξη* = έμφαση" : "")}</div>
      <div class="mmd-pop__foot"><span class="mmd-muted">Ctrl+Enter = αποθήκευση</span><button type="button" class="mmd-btn" data-c>Άκυρο</button><button type="button" class="mmd-btn mmd-btn--gold" data-s>Αποθήκευση</button></div>`;
    document.body.append(pop);
    const inp = $("textarea, input", pop);
    inp.value = val ?? "";
    // θέση κάτω (ή πάνω) από το στοιχείο
    const r = node.getBoundingClientRect(), pw = Math.min(460, innerWidth - 24);
    pop.style.width = pw + "px";
    const left = Math.max(12, Math.min(innerWidth - pw - 12, r.left));
    const below = r.bottom + 12 + pop.offsetHeight < innerHeight || r.top < pop.offsetHeight + 24;
    pop.style.left = left + "px";
    pop.style.top = (below ? Math.min(r.bottom + 10, innerHeight - pop.offsetHeight - 12) : r.top - pop.offsetHeight - 10) + "px";
    inp.focus();
    if (inp.select) inp.select();
    const doSave = async () => {
      const b = $("[data-s]", pop); b.disabled = true; b.textContent = "…";
      try { await save(path, type === "number" ? +inp.value || 0 : inp.value, node, type); closePop(); }
      catch (x) { toast(x.message, true); b.disabled = false; b.textContent = "Αποθήκευση"; }
    };
    $("[data-s]", pop).onclick = doSave;
    $("[data-c]", pop).onclick = closePop;
    $(".mmd-x", pop).onclick = closePop;
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !multi)) { e.preventDefault(); doSave(); }
      if (e.key === "Escape") closePop();
    });
  }

  async function openImage(node) {
    closePop();
    const path = node.dataset.edit;
    const info = SCHEMA && SCHEMA.find(path);
    let sel = getVal(path) || "";
    const { ov, close } = overlay(`<div class="mmd-card mmd-picker"><div class="mmd-pop__head"><b>${esc(info ? info.label : "Φωτογραφία")}</b><button type="button" class="mmd-x" aria-label="Κλείσιμο">×</button></div>
      <label class="mmd-drop"><input type="file" accept="image/jpeg,image/png,image/webp" hidden><b>+ Ανέβασμα νέας φωτογραφίας</b><span class="mmd-muted">ή διαλέξτε από τις υπάρχουσες</span></label>
      <div class="mmd-grid"><div class="mmd-muted" style="padding:20px">Φόρτωση…</div></div>
      <div class="mmd-pop__foot"><button type="button" class="mmd-btn" data-c>Άκυρο</button><button type="button" class="mmd-btn mmd-btn--gold" data-s>Χρήση φωτογραφίας</button></div></div>`, "mmd-ov--center");
    const grid = $(".mmd-grid", ov);
    let items = [];
    const draw = () => {
      grid.innerHTML = items.map((it) => `<button type="button" class="mmd-thumb${it.path === sel ? " on" : ""}" data-p="${esc(it.path)}"><img src="${esc(it.path)}" alt="" loading="lazy"></button>`).join("");
    };
    grid.onclick = (e) => { const b = e.target.closest("[data-p]"); if (b) { sel = b.dataset.p; draw(); } };
    $(".mmd-x", ov).onclick = close;
    $("[data-c]", ov).onclick = close;
    $("input[type=file]", ov).onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const lab = $(".mmd-drop b", ov); lab.textContent = "Ανέβασμα…";
      try {
        const fd = new FormData(); fd.append("file", file);
        const r = await api("media.upload", { form: fd });
        items.unshift(r.item); sel = r.item.path; draw(); lab.textContent = "✓ Ανέβηκε — πατήστε «Χρήση»";
      } catch (x) { toast(x.message, true); lab.textContent = "+ Ανέβασμα νέας φωτογραφίας"; }
    };
    $("[data-s]", ov).onclick = async () => {
      if (!sel) return;
      try { await save(path, sel, node, "image"); close(); } catch (x) { toast(x.message, true); }
    };
    try { items = (await api("media.list")).items; draw(); } catch (x) { grid.innerHTML = `<p class="mmd-err">${esc(x.message)}</p>`; }
  }

  // κλικ σε επεξεργάσιμο στοιχείο (πριν φτάσει στα links / lightbox της σελίδας)
  document.addEventListener("click", (e) => {
    if (!editing) return;
    if (e.target.closest(".mmd-dock, .mmd-pop, .mmd-ov, .mmd-chip, .mmd-ribbon")) return;
    const btn = e.target.closest(".mmd-imgbtn");
    const node = btn ? btn._target : e.target.closest("[data-edit]");
    e.preventDefault();
    e.stopPropagation();
    if (!node) { closePop(); return; }
    (node.dataset.type === "image" ? openImage : openText)(node);
  }, true);
  document.addEventListener("submit", (e) => { if (editing && !e.target.closest(".mmd-ov")) e.preventDefault(); }, true);

  async function setEditing(on) {
    if (on && !content) {
      try { content = (await api("content.get")).content; } catch (x) { toast(x.message, true); return; }
    }
    editing = on;
    document.body.classList.toggle("mm-editing", on);
    const b = $("#mmdEdit");
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    $(".mmd-lbl", b).textContent = on ? "Τέλος επεξεργασίας" : "Επεξεργασία";
    closePop();
    $$(".mmd-imgbtn, .mmd-chip").forEach((x) => x.remove());
    if (on) {
      $$('img[data-type="image"]').forEach((img) => {
        const box = img.closest(".ba") || img.parentElement;
        if (getComputedStyle(box).position === "static") box.style.position = "relative";
        const bt = document.createElement("button");
        bt.type = "button";
        bt.className = `mmd-imgbtn${img.dataset.edit === "compare.before" ? " mmd-imgbtn--l" : ""}`;
        const info = SCHEMA && SCHEMA.find(img.dataset.edit);
        bt.textContent = `📷 ${img.dataset.edit === "compare.before" ? "Πριν" : img.dataset.edit === "compare.after" ? "Μετά" : "Αλλαγή φωτογραφίας"}`;
        bt.title = info ? info.label : "";
        bt._target = img;
        box.append(bt);
      });
      $$("[data-section]").forEach((s) => {
        const k = s.dataset.section;
        if (!SEC_LINK[k]) return;
        if (getComputedStyle(s).position === "static") s.style.position = "relative";
        const a = document.createElement("a");
        a.className = "mmd-chip";
        a.href = `admin/#${SEC_LINK[k]}`;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = `⚙ ${SEC_NAME[k]} — όλες οι επιλογές`;
        s.append(a);
      });
      if (!sessionStorage.getItem("mmd.hint")) {
        toast("Κάντε κλικ σε οποιοδήποτε κείμενο ή φωτογραφία για να το αλλάξετε");
        try { sessionStorage.setItem("mmd.hint", "1"); } catch { /* */ }
      }
    }
    const u = new URL(location.href);
    if (on) u.searchParams.set("edit", "1"); else u.searchParams.delete("edit");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }
  $("#mmdEdit").onclick = () => setEditing(!editing);
  if (new URLSearchParams(location.search).get("edit") === "1") setEditing(true);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && pop) closePop(); });
  addEventListener("scroll", () => { if (pop && !pop.contains(document.activeElement)) closePop(); }, { passive: true });
})();
