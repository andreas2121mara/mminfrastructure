/* =========================================================
   M&M — Διαχείριση · σελίδες ιστοσελίδας
   Περιεχόμενο, Έργα, Πολυμέσα, Στοιχεία εταιρείας, SEO,
   Ιστορικό, Ρυθμίσεις και γρήγορη αναζήτηση (Ctrl+K).
   ========================================================= */
(() => {
  "use strict";
  const M = window.MMA;
  const { $, $$, esc, clone, store, nf, bytes, fDate, fTime, fDT, ago, norm, ICON, api, toast, modal, confirmBox, setTop, empty, VIEWS } = M;
  const SCHEMA = window.MM_SCHEMA;
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
  const icon = (k, size = 16) => (ICON[k] || "").replace("<svg", `<svg style="width:${size}px;height:${size}px"`);

  /* =========================================================
     Κοινή κατάσταση περιεχομένου
     ========================================================= */
  const C = { saved: null, work: null, icons: {}, loaded: false };
  async function loadContent(force = false) {
    if (!C.loaded || force) {
      const d = await api("content.get");
      C.saved = d.content; C.work = clone(d.content); C.icons = d.icons || {}; C.loaded = true;
      setDirty(false);
    }
    return C.work;
  }
  function setDirty(v) {
    M.dirty = v;
    const bar = $("#savebar");
    if (bar) bar.classList.toggle("on", v);
  }
  M.discard = () => { if (C.saved) C.work = clone(C.saved); setDirty(false); };

  function missingImages(obj, path = "") {
    const out = [];
    for (const [k, v] of Object.entries(obj || {})) {
      const p = path ? `${path}.${k}` : k;
      if (v && typeof v === "object") out.push(...missingImages(v, p));
      else if (["image", "og_image", "before", "after"].includes(k) && !v) out.push(p);
    }
    return out;
  }

  async function saveContent(note = "Αποθήκευση από τη Διαχείριση") {
    const miss = missingImages(C.work);
    if (miss.length) {
      const f = SCHEMA.find(miss[0]);
      toast(`Λείπει εικόνα: ${f ? f.label : miss[0]}`, "err");
      return false;
    }
    const d = await api("content.save", { body: { content: C.work, note } });
    C.saved = d.content; C.work = clone(d.content);
    setDirty(false);
    toast("Αποθηκεύτηκε — οι αλλαγές είναι ήδη στην ιστοσελίδα ✓");
    const pv = $("#pv");
    if (pv) try { pv.contentWindow.location.reload(); } catch { pv.src = pv.src; }
    return true;
  }

  function savebarEl(note) {
    const b = el("div", "savebar");
    b.id = "savebar";
    b.innerHTML = `<p><span style="width:8px;height:8px;border-radius:50%;background:var(--gold);display:inline-block"></span>Υπάρχουν αλλαγές που δεν έχουν αποθηκευτεί</p>
      <button class="btn btn--ghost" data-discard>Απόρριψη</button><button class="btn btn--gold" data-save>${icon("check")} Αποθήκευση</button>`;
    $("[data-discard]", b).onclick = async () => {
      if (!(await confirmBox("Απόρριψη αλλαγών", "Οι αλλαγές που δεν αποθηκεύτηκαν θα χαθούν.", { ok: "Απόρριψη", danger: true }))) return;
      M.discard(); M.route();
    };
    $("[data-save]", b).onclick = async (e) => {
      const btn = e.currentTarget;
      btn.classList.add("loading"); btn.disabled = true;
      try { await saveContent(typeof note === "function" ? note() : note); } catch (x) { toast(x.message, "err"); }
      btn.classList.remove("loading"); btn.disabled = false;
    };
    if (M.dirty) b.classList.add("on");
    return b;
  }

  /* =========================================================
     Επιλογή / ανέβασμα εικόνας
     ========================================================= */
  async function shrink(file) {
    // Μεγάλες φωτογραφίες κινητού μικραίνουν πριν ανέβουν (πιο γρήγορο ανέβασμα)
    if (!/^image\/jpe?g$/.test(file.type) || file.size < 2.5 * 1048576 || !window.createImageBitmap) return file;
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const s = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
      cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.9));
      return blob ? new File([blob], file.name, { type: "image/jpeg" }) : file;
    } catch { return file; }
  }

  function uploadFile(file, onProgress) {
    return new Promise(async (resolve, reject) => {
      const f = await shrink(file);
      const fd = new FormData();
      fd.append("file", f, file.name);
      const x = new XMLHttpRequest();
      x.open("POST", "api.php?a=media.upload");
      x.setRequestHeader("X-CSRF", M.csrf);
      x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      x.onload = () => {
        let d = {};
        try { d = JSON.parse(x.responseText); } catch { /* */ }
        if (x.status >= 200 && x.status < 300 && d.item) resolve(d.item);
        else reject(new Error(d.error || (x.status === 413 ? "Το αρχείο είναι πολύ μεγάλο για τον server." : `Σφάλμα ${x.status}`)));
      };
      x.onerror = () => reject(new Error("Σφάλμα δικτύου"));
      x.send(fd);
    });
  }

  /** Ζώνη «σύρετε εδώ» + λίστα προόδου. onDone(item) για κάθε αρχείο που ανέβηκε. */
  function dropzone(onDone, { compact = false } = {}) {
    const w = el("div");
    w.innerHTML = `<div class="drop"${compact ? ' style="padding:16px"' : ""}>${compact ? "" : ICON.upload}<b>Σύρετε φωτογραφίες εδώ</b> ή <u>επιλέξτε από τον υπολογιστή</u><div class="small" style="margin-top:4px">JPG, PNG, WebP · μικραίνουν και βελτιστοποιούνται αυτόματα</div><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden></div><div class="uploads"></div>`;
    const drop = $(".drop", w), input = $("input", w), list = $(".uploads", w);
    const handle = async (files) => {
      for (const file of [...files]) {
        const row = el("div", "up", `<span class="grow" style="flex:0 1 220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(file.name)}</span><div class="up__bar"><i></i></div><span class="muted small">0%</span>`);
        list.append(row);
        try {
          const item = await uploadFile(file, (p) => { $("i", row).style.width = `${p * 100}%`; $(".small", row).textContent = `${Math.round(p * 100)}%`; });
          $(".small", row).textContent = "✓"; $(".small", row).className = "ok small";
          setTimeout(() => row.remove(), 2500);
          onDone(item);
        } catch (e) {
          $(".small", row).textContent = e.message; $(".small", row).className = "no small";
        }
      }
    };
    drop.onclick = () => input.click();
    input.onchange = () => { handle(input.files); input.value = ""; };
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => handle(e.dataTransfer.files));
    w.pick = () => input.click();
    return w;
  }

  const mcard = (it, on) => `<div class="mcard${on ? " on" : ""}" data-path="${esc(it.path)}">
    <div class="mcard__img"><img src="../${esc(it.path)}" alt="" loading="lazy">${it.builtin ? '<span class="mcard__tag">Αρχική</span>' : ""}${it.used.length ? `<span class="mcard__tag mcard__tag--used">Σε χρήση</span>` : ""}</div>
    <div class="mcard__info"><b>${esc(it.path.split("/").pop())}</b><span>${it.w}×${it.h}</span></div></div>`;

  function pickImage(current) {
    return new Promise(async (resolve) => {
      let sel = current || "", done = false, items = [];
      const m = modal({
        title: "Επιλογή εικόνας", wide: true,
        body: `<div id="pkDrop"></div><div class="mgrid" id="pkGrid" style="margin-top:16px"><div class="skel" style="height:160px"></div></div>`,
        foot: `<span class="muted small grow" id="pkSel"></span><button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--gold" data-ok>Επιλογή</button>`,
        onClose: () => { if (!done) resolve(null); },
      });
      const grid = $("#pkGrid", m.el);
      const render = () => {
        grid.innerHTML = items.map((it) => mcard(it, it.path === sel)).join("") || empty("Δεν υπάρχουν εικόνες ακόμα — ανεβάστε την πρώτη");
        $("#pkSel", m.el).textContent = sel ? `Επιλεγμένη: ${sel.split("/").pop()}` : "";
      };
      $("#pkDrop", m.el).append(dropzone((it) => { items.unshift(it); sel = it.path; render(); }, { compact: true }));
      grid.onclick = (e) => { const c = e.target.closest(".mcard"); if (c) { sel = c.dataset.path; render(); } };
      grid.ondblclick = (e) => { const c = e.target.closest(".mcard"); if (c) { sel = c.dataset.path; finish(); } };
      const finish = () => { if (!sel) { toast("Διαλέξτε μια εικόνα.", "err"); return; } done = true; resolve(sel); m.close(); };
      $("[data-no]", m.el).onclick = () => m.close();
      $("[data-ok]", m.el).onclick = finish;
      try { items = (await api("media.list")).items; render(); } catch (e) { grid.innerHTML = empty(e.message, "alert"); }
    });
  }

  /* =========================================================
     Δημιουργία φόρμας από τον «χάρτη» περιεχομένου
     ========================================================= */
  function blank(v) {
    if (typeof v === "string") return "";
    if (typeof v === "number") return 0;
    if (Array.isArray(v)) return [];
    if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) o[k] = blank(v[k]); return o; }
    return v;
  }

  function renderFields(fields, obj, onChange) {
    const box = el("div");
    fields.forEach((f) => { const n = field(f, obj, onChange); if (n) box.append(n); });
    return box;
  }

  function field(f, obj, onChange) {
    const label = `<label>${esc(f.label)}${f.max ? `<span class="fld__count"></span>` : ""}</label>`;
    const help = f.help ? `<div class="fld__help">${esc(f.help)}</div>` : "";
    const w = el("div", "fld");
    const counter = (inp) => {
      const c = $(".fld__count", w); if (!c) return;
      const n = inp.value.length; c.textContent = `${n}/${f.max}`; c.classList.toggle("over", n > f.max);
    };
    switch (f.type) {
      case "text":
      case "number": {
        w.innerHTML = `${label}<input class="input" ${f.type === "number" ? 'type="number" step="1"' : 'type="text"'}>${help}`;
        const i = $("input", w);
        i.value = obj[f.k] ?? "";
        i.oninput = () => { obj[f.k] = f.type === "number" ? (i.value === "" ? 0 : +i.value) : i.value; counter(i); onChange(f); };
        counter(i);
        return w;
      }
      case "rich": {
        w.innerHTML = `<label>${esc(f.label)}<span class="rich-tools" style="margin-left:auto"><button type="button" data-em title="Επιλέξτε λέξεις και πατήστε για έμφαση">*Έμφαση*</button></span>${f.max ? '<span class="fld__count"></span>' : ""}</label><textarea class="textarea" rows="${f.rows || 3}"></textarea>${help}`;
        const t = $("textarea", w);
        t.value = obj[f.k] ?? "";
        t.oninput = () => { obj[f.k] = t.value; counter(t); onChange(f); };
        $("[data-em]", w).onclick = () => {
          const a = t.selectionStart, b = t.selectionEnd;
          if (a === b) { toast("Επιλέξτε πρώτα τις λέξεις που θέλετε να τονιστούν.", "info"); return; }
          t.setRangeText(`*${t.value.slice(a, b).replace(/\*/g, "")}*`, a, b, "select");
          t.dispatchEvent(new Event("input"));
          t.focus();
        };
        counter(t);
        return w;
      }
      case "image": {
        w.innerHTML = `<label>${esc(f.label)}</label><div class="imgfield"><img alt=""><div class="grow"><div class="imgfield__path"></div><div class="row" style="margin-top:8px"><button type="button" class="btn btn--sm" data-pick>${icon("media")} Αλλαγή εικόνας</button></div></div></div>${help}`;
        const img = $("img", w), p = $(".imgfield__path", w);
        const show = () => {
          const v = obj[f.k];
          if (v) { img.src = `../${v}`; img.style.visibility = ""; p.textContent = v.split("/").pop(); }
          else { img.removeAttribute("src"); img.style.visibility = "hidden"; p.innerHTML = '<span class="no">Δεν έχει επιλεγεί εικόνα</span>'; }
        };
        show();
        $("[data-pick]", w).onclick = async () => { const v = await pickImage(obj[f.k]); if (v) { obj[f.k] = v; show(); onChange(f); } };
        return w;
      }
      case "icon": {
        w.innerHTML = `<label>${esc(f.label)}</label><div class="icons">${Object.entries(C.icons).map(([k, svg]) => `<button type="button" data-k="${esc(k)}" class="${obj[f.k] === k ? "on" : ""}" title="${esc(k)}"><svg viewBox="0 0 48 48">${svg}</svg></button>`).join("")}</div>`;
        $(".icons", w).onclick = (e) => {
          const b = e.target.closest("button"); if (!b) return;
          obj[f.k] = b.dataset.k;
          $$(".icons button", w).forEach((x) => x.classList.toggle("on", x === b));
          onChange(f);
        };
        return w;
      }
      case "select": {
        const opts = f.options === "categories" ? C.work.projects.categories.map((c) => [c.key, c.label]) : f.options;
        w.innerHTML = `${label}<select class="select">${opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>${help}`;
        const s = $("select", w);
        s.value = obj[f.k];
        s.onchange = () => { obj[f.k] = s.value; onChange(f); };
        return w;
      }
      case "key":
        return null; // εσωτερικός κωδικός, δεν τον αλλάζει ο χρήστης
      case "list":
        return listEditor(f, obj[f.k], onChange);
    }
    return null;
  }

  function listEditor(f, arr, onChange) {
    const w = el("div", "fld");
    w.innerHTML = `<div class="fld__label">${esc(f.label)} <span class="badge"></span></div><div class="list"></div><div><button type="button" class="btn btn--sm" data-add>${icon("plus")} ${esc(f.add || "Προσθήκη")}</button></div>`;
    const list = $(".list", w);
    const open = new Set();
    let dragFrom = -1;
    const title = (item) => { try { return String(f.itemTitle ? f.itemTitle(item) : item || "").trim(); } catch { return ""; } };
    const changed = () => { onChange(f); };
    const render = () => {
      $(".badge", w).textContent = arr.length;
      list.innerHTML = "";
      arr.forEach((item, i) => {
        const li = el("div", `li${open.has(i) ? "" : " closed"}`);
        li.innerHTML = `<div class="li__head"><span class="li__grip" title="Σύρετε για αλλαγή σειράς">${ICON.grip}</span>${item && item.image ? `<img class="li__thumb" src="../${esc(item.image)}" alt="">` : ""}
          <span class="li__title"><em>${i + 1}.</em>${esc(title(item) || "(κενό)")}</span>
          <button type="button" class="iconbtn" data-a="up" title="Μετακίνηση πάνω" ${i === 0 ? "disabled" : ""}>${ICON.up}</button>
          <button type="button" class="iconbtn" data-a="down" title="Μετακίνηση κάτω" ${i === arr.length - 1 ? "disabled" : ""}>${ICON.down}</button>
          <button type="button" class="iconbtn" data-a="dup" title="Αντιγραφή">${ICON.copy}</button>
          <button type="button" class="iconbtn" data-a="del" title="Διαγραφή">${ICON.trash}</button>
          <span class="li__chev">${ICON.chev}</span></div><div class="li__body"></div>`;
        const body = $(".li__body", li);
        const retitle = () => { $(".li__title", li).innerHTML = `<em>${i + 1}.</em>${esc(title(arr[i]) || "(κενό)")}`; };
        if (f.item.type === "object") body.append(renderFields(f.item.fields, item, () => { retitle(); changed(); }));
        else {
          const inp = el("input", "input"); inp.value = item;
          inp.oninput = () => { arr[i] = inp.value; retitle(); changed(); };
          const fw = el("div", "fld"); fw.style.marginTop = "8px"; fw.append(inp); body.append(fw);
        }
        $(".li__head", li).addEventListener("click", async (e) => {
          const b = e.target.closest("[data-a]");
          if (!b) { li.classList.toggle("closed"); li.classList.contains("closed") ? open.delete(i) : open.add(i); return; }
          const a = b.dataset.a;
          if (a === "up" && i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
          else if (a === "down" && i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; }
          else if (a === "dup") { arr.splice(i + 1, 0, clone(item)); if (arr[i + 1] && arr[i + 1].key) arr[i + 1].key = "k" + Date.now().toString(36); open.add(i + 1); }
          else if (a === "del") {
            if (arr.length <= 1) { toast("Πρέπει να μείνει τουλάχιστον ένα.", "err"); return; }
            if (f.k === "categories" && C.work.projects.items.some((p) => p.cat === item.key)) {
              if (!(await confirmBox("Η κατηγορία χρησιμοποιείται", "Κάποια έργα ανήκουν σε αυτή την κατηγορία και θα μείνουν χωρίς φίλτρο. Να διαγραφεί;", { ok: "Διαγραφή", danger: true }))) return;
            } else if (!(await confirmBox("Διαγραφή", `Να διαγραφεί το «${esc(title(item) || "στοιχείο")}»;`, { ok: "Διαγραφή", danger: true }))) return;
            arr.splice(i, 1); open.clear();
          } else return;
          render(); changed();
        });
        const grip = $(".li__grip", li);
        grip.addEventListener("mousedown", () => { li.draggable = true; });
        li.addEventListener("dragstart", (e) => { dragFrom = i; li.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); });
        li.addEventListener("dragend", () => { li.draggable = false; li.classList.remove("drag"); $$(".li.over", list).forEach((x) => x.classList.remove("over")); });
        li.addEventListener("dragover", (e) => { if (dragFrom < 0) return; e.preventDefault(); li.classList.add("over"); });
        li.addEventListener("dragleave", () => li.classList.remove("over"));
        li.addEventListener("drop", (e) => {
          e.preventDefault(); li.classList.remove("over");
          if (dragFrom < 0 || dragFrom === i) return;
          const [moved] = arr.splice(dragFrom, 1);
          arr.splice(i, 0, moved);
          dragFrom = -1; open.clear(); render(); changed();
        });
        list.append(li);
      });
    };
    $("[data-add]", w).onclick = async () => {
      let tpl = arr.length ? blank(clone(arr[0])) : (f.item.type === "object" ? Object.fromEntries(f.item.fields.map((x) => [x.k, x.type === "number" ? 0 : ""])) : "");
      if (tpl && typeof tpl === "object") {
        if ("key" in tpl) tpl.key = "k" + Date.now().toString(36);
        if ("size" in tpl) tpl.size = "normal";
        if ("icon" in tpl) tpl.icon = "tiles";
        if ("cat" in tpl) tpl.cat = (C.work.projects.categories[0] || {}).key || "";
        if ("image" in tpl) { const v = await pickImage(""); if (!v) return; tpl.image = v; }
      }
      arr.push(tpl);
      open.add(arr.length - 1);
      render(); changed();
      const last = list.lastElementChild; if (last) { last.scrollIntoView({ behavior: "smooth", block: "center" }); const i = $("input, textarea", last); if (i) setTimeout(() => i.focus(), 300); }
    };
    render();
    return w;
  }

  /* =========================================================
     ΠΕΡΙΕΧΟΜΕΝΟ
     ========================================================= */
  VIEWS.content = async (view, args) => {
    await loadContent();
    const secs = SCHEMA.sections.filter((s) => !s.page);
    const sec = secs.find((s) => s.key === args[0]) || secs[0];
    let showPrev = store.get("preview", true);
    const prevBtn = el("button", "btn", `${icon("eye")} Προεπισκόπηση`);
    prevBtn.classList.toggle("btn--ghost", !showPrev);
    prevBtn.onclick = () => { showPrev = !showPrev; store.set("preview", showPrev); M.route(); };
    setTop("Περιεχόμενο", "Κείμενα και εικόνες κάθε ενότητας της σελίδας", prevBtn, `<a class="btn btn--gold" href="../?edit=1" target="_blank" rel="noopener">${icon("edit")} Επεξεργασία πάνω στη σελίδα</a>`);
    view.innerHTML = `<div class="editor${showPrev ? " with-preview" : ""}">
      <nav class="secnav" aria-label="Ενότητες">${secs.map((s) => `<a href="#content/${s.key}" class="${s.key === sec.key ? "on" : ""}">${icon(s.icon)}${esc(s.label)}</a>`).join("")}</nav>
      <div><div class="card form-card"><h2>${esc(sec.label)}</h2><p>${esc(sec.desc || "Αλλάξτε ό,τι θέλετε και πατήστε «Αποθήκευση». Οι αλλαγές φαίνονται αμέσως στην ιστοσελίδα.")}</p><div id="fields"></div></div></div>
      ${showPrev ? `<div class="preview"><div class="preview__bar"><a class="btn btn--sm" href="../${esc(sec.anchor || "")}" target="_blank" rel="noopener" title="Άνοιγμα σε νέα καρτέλα">${icon("external", 14)}</a></div><iframe id="pv" title="Προεπισκόπηση ιστοσελίδας" src="../?preview=1"></iframe></div>` : ""}
    </div>`;
    const pv = $("#pv", view);
    if (pv) pv.addEventListener("load", () => {
      // κύλιση ΜΟΝΟ μέσα στην προεπισκόπηση (ένα #anchor θα κυλούσε και τη Διαχείριση)
      try {
        const w = pv.contentWindow, t = sec.anchor && w.document.querySelector(sec.anchor);
        if (t) setTimeout(() => w.scrollTo(0, t.getBoundingClientRect().top + w.scrollY), 400);
      } catch { /* */ }
    });
    $("#fields", view).append(renderFields(sec.fields, C.work[sec.key], () => setDirty(true)));
    view.append(savebarEl(() => `Ενότητα: ${sec.label}`));
  };

  /* =========================================================
     ΣΤΟΙΧΕΙΑ ΕΤΑΙΡΕΙΑΣ & SEO
     ========================================================= */
  VIEWS.company = async (view) => {
    await loadContent();
    const sec = SCHEMA.sections.find((s) => s.key === "company");
    setTop("Στοιχεία εταιρείας", "Τηλέφωνα, email, διεύθυνση και social — αλλάζουν παντού στη σελίδα");
    view.innerHTML = `<div class="grid"><div class="card span-7 form-card"><h2>Στοιχεία επικοινωνίας</h2><p>Ό,τι γράψετε εδώ εμφανίζεται στην ενότητα «Επικοινωνία», στο Google και όταν μοιράζεται η σελίδα.</p><div id="fields"></div></div>
      <div class="span-5" style="display:grid;gap:16px;align-content:start"><div class="card"><div class="card__head"><h3 class="card__title">Έτσι θα φαίνονται</h3></div><div id="cPrev"></div></div>
      <div class="card"><div class="card__head"><h3 class="card__title">Συμβουλή</h3></div><p class="muted small" style="margin:0;line-height:1.7">Τα ίδια στοιχεία (επωνυμία, τηλέφωνο, διεύθυνση) καλό είναι να είναι <b>ακριβώς ίδια</b> με αυτά στο Google Business Profile. Έτσι η Google «δένει» την ιστοσελίδα με την επιχείρηση στους χάρτες.</p></div></div></div>`;
    const prev = () => {
      const c = C.work.company;
      $("#cPrev", view).innerHTML = `<dl class="kv">
        <dt>Επωνυμία</dt><dd>${esc(c.name)}</dd>
        <dt>Τηλέφωνο</dt><dd>${c.phone ? `<a href="tel:${esc(c.phone.replace(/[^+\d]/g, ""))}" style="color:var(--gold-2)">${esc(c.phone)}</a>` : "—"}${c.phone2 ? `<br>${esc(c.phone2)}` : ""}</dd>
        <dt>Email</dt><dd>${c.email ? `<a href="mailto:${esc(c.email)}" style="color:var(--gold-2)">${esc(c.email)}</a>` : "—"}</dd>
        <dt>Διεύθυνση</dt><dd style="white-space:pre-line">${esc(c.address || "—")}</dd>
        ${c.hours ? `<dt>Ωράριο</dt><dd style="white-space:pre-line">${esc(c.hours)}</dd>` : ""}
        ${c.vat ? `<dt>ΑΦΜ</dt><dd>${esc(c.vat)}</dd>` : ""}
        <dt>Social</dt><dd>${[["Facebook", c.facebook], ["Instagram", c.instagram], ["LinkedIn", c.linkedin]].filter((x) => x[1]).map((x) => `<a href="${esc(x[1])}" target="_blank" rel="noopener" style="color:var(--gold-2)">${x[0]} ↗</a>`).join(" · ") || "—"}</dd>
      </dl>`;
    };
    $("#fields", view).append(renderFields(sec.fields, C.work.company, () => { setDirty(true); prev(); }));
    prev();
    view.append(savebarEl("Στοιχεία εταιρείας"));
  };

  VIEWS.seo = async (view) => {
    await loadContent();
    const sec = SCHEMA.sections.find((s) => s.key === "seo");
    setTop("SEO & Κοινοποίηση", "Πώς εμφανίζεται η σελίδα στη Google και όταν τη μοιράζεστε");
    view.innerHTML = `<div class="grid"><div class="card span-6 form-card"><h2>Ρυθμίσεις</h2><p>Ο τίτλος και η περιγραφή είναι τα πρώτα που διαβάζει κάποιος στη Google — αξίζει να είναι σύντομα και ξεκάθαρα.</p><div id="fields"></div></div>
      <div class="span-6" style="display:grid;gap:16px;align-content:start">
        <div class="card"><div class="card__head"><h3 class="card__title">Αποτέλεσμα στη Google</h3></div><div id="gPrev"></div></div>
        <div class="card"><div class="card__head"><h3 class="card__title">Κοινοποίηση σε Facebook / Viber / Messenger</h3></div><div id="fPrev" style="max-width:500px"></div></div>
        <div class="card"><div class="card__head"><h3 class="card__title">Έλεγχος</h3></div><div class="checks" id="sChecks"></div></div>
      </div></div>`;
    const host = location.host.replace(/^www\./, "");
    const prev = () => {
      const s = C.work.seo;
      const cut = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
      $("#gPrev", view).innerHTML = `<div class="gprev"><div class="gprev__url"><img src="../assets/logo/favicon.svg" alt=""><div><div style="color:#202124">${esc(C.work.company.name)}</div>https://${esc(host)}</div></div><div class="gprev__t">${esc(cut(s.title, 62))}</div><div class="gprev__d">${esc(cut(s.description.replace(/\*/g, ""), 160))}</div></div>`;
      $("#fPrev", view).innerHTML = `<div class="fbprev"><img src="../${esc(s.og_image)}" alt=""><div><small>${esc(host)}</small><b>${esc(s.og_title || s.title)}</b><p>${esc(s.og_description || s.description)}</p></div></div>`;
      const checks = [
        [s.title.length >= 20 && s.title.length <= 62, `Τίτλος ${s.title.length} χαρακτήρες`, "ιδανικά 30–60"],
        [s.description.length >= 70 && s.description.length <= 160, `Περιγραφή ${s.description.length} χαρακτήρες`, "ιδανικά 70–160"],
        [/αναπλ|δημόσι|έργ/i.test(s.title + s.description), "Περιέχει λέξεις-κλειδιά της δουλειάς σας", "π.χ. αναπλάσεις, δημόσια έργα"],
        [!!s.og_image, "Υπάρχει εικόνα κοινοποίησης", "1200×630 ιδανικά"],
        [!!C.work.company.phone && !/000 0000/.test(C.work.company.phone), "Υπάρχει πραγματικό τηλέφωνο", "το βλέπει και η Google"],
      ];
      $("#sChecks", view).innerHTML = checks.map(([ok, t, h]) => `<div class="check ${ok ? "is-ok" : "is-no"}"><i>${ok ? "✓" : "!"}</i><div>${esc(t)}<div class="muted small">${esc(h)}</div></div></div>`).join("");
    };
    $("#fields", view).append(renderFields(sec.fields, C.work.seo, () => { setDirty(true); prev(); }));
    prev();
    view.append(savebarEl("SEO & κοινοποίηση"));
  };

  /* =========================================================
     ΕΡΓΑ (οπτική διαχείριση, αποθηκεύει αμέσως)
     ========================================================= */
  VIEWS.projects = async (view, args) => {
    await loadContent();
    const P = C.work.projects;
    const add = el("button", "btn btn--gold", `${icon("plus")} Νέο έργο`);
    add.onclick = () => edit(-1);
    setTop("Έργα", "Σύρετε τις κάρτες για να αλλάξετε σειρά · κάθε αλλαγή αποθηκεύεται αμέσως", add);
    const SIZE = { normal: "", tall: "Ψηλό", wide: "Φαρδύ" };
    const persist = async (note) => {
      try { await saveContent(note); } catch (e) { toast(e.message, "err"); await loadContent(true); }
      render();
    };
    const render = () => {
      const cats = P.categories;
      view.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="card__head"><h3 class="card__title">Κατηγορίες</h3><p class="card__sub card__act">Τα φίλτρα πάνω από τα έργα</p></div>
          <div class="chiprow" id="cats">${cats.map((c, i) => `<span class="chip"><b>${esc(c.label)}</b> ${nf(P.items.filter((p) => p.cat === c.key).length)} <button class="iconbtn" style="width:22px;height:22px" data-ce="${i}" title="Επεξεργασία">${icon("edit", 13)}</button></span>`).join("")}
          <button class="btn btn--sm" data-cadd>${icon("plus")} Νέα κατηγορία</button></div></div>
        <div class="pgrid" id="pg">${P.items.map((p, i) => `<div class="pcard" draggable="true" data-i="${i}"><img src="../${esc(p.image)}" alt="" loading="lazy"><span class="pcard__no">${i + 1}</span>${SIZE[p.size] ? `<span class="pcard__size">${SIZE[p.size]}</span>` : ""}
            <div class="pcard__info"><small>${esc((cats.find((c) => c.key === p.cat) || {}).tag || "Χωρίς κατηγορία")}</small><b>${esc(p.title || "(χωρίς τίτλο)")}</b></div></div>`).join("")}
          <button class="pcard pcard--add" data-new><div>${ICON.plus}<b style="font-weight:500">Νέο έργο</b><div class="small">ανεβάστε φωτογραφία</div></div></button></div>`;
      let from = -1;
      const pg = $("#pg", view);
      pg.onclick = (e) => { if (e.target.closest("[data-new]")) return edit(-1); const c = e.target.closest(".pcard[data-i]"); if (c) edit(+c.dataset.i); };
      pg.addEventListener("dragstart", (e) => { const c = e.target.closest(".pcard[data-i]"); if (!c) return; from = +c.dataset.i; c.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", c.dataset.i); });
      pg.addEventListener("dragover", (e) => { const c = e.target.closest(".pcard[data-i]"); if (!c || from < 0) return; e.preventDefault(); $$(".pcard.over", pg).forEach((x) => x !== c && x.classList.remove("over")); c.classList.add("over"); });
      pg.addEventListener("dragend", () => { $$(".pcard", pg).forEach((x) => x.classList.remove("drag", "over")); });
      pg.addEventListener("drop", (e) => {
        const c = e.target.closest(".pcard[data-i]"); if (!c || from < 0) return;
        e.preventDefault();
        const to = +c.dataset.i;
        if (to !== from) { const [m] = P.items.splice(from, 1); P.items.splice(to, 0, m); persist("Αλλαγή σειράς έργων"); }
        from = -1;
      });
      $("#cats", view).onclick = (e) => {
        if (e.target.closest("[data-cadd]")) return catEdit(-1);
        const b = e.target.closest("[data-ce]"); if (b) catEdit(+b.dataset.ce);
      };
    };
    const catEdit = (i) => {
      const isNew = i < 0;
      const c = isNew ? { key: "k" + Date.now().toString(36), label: "", tag: "" } : clone(P.categories[i]);
      const m = modal({
        title: isNew ? "Νέα κατηγορία" : "Κατηγορία",
        body: `<div class="fld"><label>Όνομα φίλτρου</label><input class="input" id="cL" placeholder="π.χ. Πλατείες"></div><div class="fld"><label>Ετικέτα στην κάρτα του έργου</label><input class="input" id="cT" placeholder="π.χ. Ανάπλαση Πλατείας"></div>`,
        foot: `${isNew ? "" : `<button class="btn btn--danger" data-del style="margin-right:auto">${icon("trash")} Διαγραφή</button>`}<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--gold" data-ok>Αποθήκευση</button>`,
      });
      $("#cL", m.el).value = c.label; $("#cT", m.el).value = c.tag;
      $("[data-no]", m.el).onclick = m.close;
      $("[data-ok]", m.el).onclick = () => {
        c.label = $("#cL", m.el).value.trim(); c.tag = $("#cT", m.el).value.trim() || c.label;
        if (!c.label) { toast("Γράψτε όνομα.", "err"); return; }
        if (isNew) P.categories.push(c); else P.categories[i] = c;
        m.close(); persist(isNew ? `Νέα κατηγορία: ${c.label}` : `Κατηγορία: ${c.label}`);
      };
      const del = $("[data-del]", m.el);
      if (del) del.onclick = async () => {
        if (P.categories.length <= 1) { toast("Πρέπει να μείνει τουλάχιστον μία κατηγορία.", "err"); return; }
        const used = P.items.filter((p) => p.cat === c.key).length;
        if (!(await confirmBox("Διαγραφή κατηγορίας", used ? `${used} έργα ανήκουν σε αυτή την κατηγορία και θα μεταφερθούν στην «${esc(P.categories.find((x) => x.key !== c.key).label)}».` : "Να διαγραφεί η κατηγορία;", { ok: "Διαγραφή", danger: true }))) return;
        const other = P.categories.find((x) => x.key !== c.key).key;
        P.items.forEach((p) => { if (p.cat === c.key) p.cat = other; });
        P.categories.splice(i, 1);
        m.close(); persist(`Διαγραφή κατηγορίας: ${c.label}`);
      };
    };
    const edit = async (i) => {
      const isNew = i < 0;
      let p = isNew ? { image: "", alt: "", cat: (P.categories[0] || {}).key || "", title: "", size: "normal" } : clone(P.items[i]);
      if (isNew) { const img = await pickImage(""); if (!img) return; p.image = img; }
      const m = modal({
        title: isNew ? "Νέο έργο" : "Επεξεργασία έργου", wide: false,
        body: `<div style="position:relative;border-radius:14px;overflow:hidden;margin-bottom:16px;aspect-ratio:16/9;background:#111"><img id="pImg" style="width:100%;height:100%;object-fit:cover" alt=""><button class="btn btn--sm" id="pPick" style="position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.6)">${icon("media")} Αλλαγή φωτογραφίας</button></div>
          <div class="fld"><label>Τίτλος</label><input class="input" id="pT" placeholder="π.χ. Ανάπλαση Πλατείας Αριστοτέλους"></div>
          <div class="row"><div class="fld grow"><label>Κατηγορία</label><select class="select" id="pC">${P.categories.map((c) => `<option value="${esc(c.key)}">${esc(c.label)}</option>`).join("")}</select></div>
          <div class="fld grow"><label>Μέγεθος κάρτας</label><select class="select" id="pS"><option value="normal">Κανονικό</option><option value="tall">Ψηλό (κάθετη φωτογραφία)</option><option value="wide">Φαρδύ (πανοραμική)</option></select></div></div>
          <div class="fld"><label>Περιγραφή φωτογραφίας</label><input class="input" id="pA" placeholder="Τι δείχνει η φωτογραφία"><div class="fld__help">Τη «διαβάζει» η Google και όσοι έχουν πρόβλημα όρασης</div></div>`,
        foot: `${isNew ? "" : `<button class="btn btn--danger" data-del style="margin-right:auto">${icon("trash")} Διαγραφή</button>`}<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--gold" data-ok>${isNew ? "Προσθήκη" : "Αποθήκευση"}</button>`,
      });
      const img = $("#pImg", m.el);
      img.src = `../${p.image}`;
      $("#pT", m.el).value = p.title; $("#pC", m.el).value = p.cat; $("#pS", m.el).value = p.size; $("#pA", m.el).value = p.alt;
      $("#pPick", m.el).onclick = async () => { const v = await pickImage(p.image); if (v) { p.image = v; img.src = `../${v}`; } };
      $("[data-no]", m.el).onclick = m.close;
      $("[data-ok]", m.el).onclick = () => {
        p.title = $("#pT", m.el).value.trim(); p.cat = $("#pC", m.el).value; p.size = $("#pS", m.el).value; p.alt = $("#pA", m.el).value.trim() || p.title;
        if (!p.title) { toast("Γράψτε τίτλο για το έργο.", "err"); return; }
        if (isNew) P.items.unshift(p); else P.items[i] = p;
        m.close(); persist(isNew ? `Νέο έργο: ${p.title}` : `Έργο: ${p.title}`);
      };
      const del = $("[data-del]", m.el);
      if (del) del.onclick = async () => {
        if (!(await confirmBox("Διαγραφή έργου", `Το «${esc(p.title)}» θα αφαιρεθεί από τη σελίδα. Η φωτογραφία μένει στα Πολυμέσα.`, { ok: "Διαγραφή", danger: true }))) return;
        P.items.splice(i, 1); m.close(); persist(`Διαγραφή έργου: ${p.title}`);
      };
    };
    render();
    if (args[0] === "new") edit(-1);
  };

  /* =========================================================
     ΠΟΛΥΜΕΣΑ
     ========================================================= */
  VIEWS.media = async (view) => {
    let items = [], filter = "all";
    const up = el("button", "btn btn--gold", `${icon("upload")} Ανέβασμα`);
    setTop("Πολυμέσα", "Όλες οι εικόνες της ιστοσελίδας", up);
    view.innerHTML = `<div class="card" style="margin-bottom:16px" id="mDrop"></div>
      <div class="card"><div class="card__head"><h3 class="card__title" id="mCount">Εικόνες</h3><div class="tabs" id="mTabs"><button data-f="all" class="on">Όλες</button><button data-f="uploads">Ανεβασμένες</button><button data-f="unused">Αχρησιμοποίητες</button><button data-f="builtin">Αρχικές</button></div></div><div class="mgrid" id="mGrid"></div></div>`;
    const dz = dropzone((it) => { items.unshift(it); render(); toast("Η εικόνα ανέβηκε ✓"); });
    $("#mDrop", view).append(dz);
    up.onclick = () => dz.pick();
    const render = () => {
      const list = items.filter((it) => filter === "all" || (filter === "uploads" && !it.builtin) || (filter === "builtin" && it.builtin) || (filter === "unused" && !it.used.length));
      $("#mCount", view).textContent = `${nf(list.length)} ${list.length === 1 ? "εικόνα" : "εικόνες"}`;
      $("#mGrid", view).innerHTML = list.map((it) => mcard(it, false)).join("") || empty("Καμία εικόνα σε αυτή την κατηγορία", "media");
    };
    $("#mTabs", view).onclick = (e) => { const b = e.target.closest("button"); if (!b) return; filter = b.dataset.f; $$("#mTabs button", view).forEach((x) => x.classList.toggle("on", x === b)); render(); };
    $("#mGrid", view).onclick = (e) => { const c = e.target.closest(".mcard"); if (c) detail(items.find((x) => x.path === c.dataset.path)); };
    const detail = (it) => {
      const usedHtml = it.used.length ? `<div class="chiprow">${it.used.map((p) => { const f = SCHEMA.find(p); return `<span class="chip chip--gold">${esc(f ? f.label : p)}</span>`; }).join("")}</div>` : `<span class="muted">Δεν χρησιμοποιείται πουθενά</span>`;
      const m = modal({
        title: it.path.split("/").pop(), wide: true,
        body: `<div class="grid"><div class="span-8" style="border-radius:12px;overflow:hidden;background:#0d0d0f"><img src="../${esc(it.path)}" alt="" style="width:100%;max-height:62vh;object-fit:contain"></div>
          <div class="span-4"><dl class="kv" style="grid-template-columns:100px 1fr"><dt>Διαστάσεις</dt><dd>${it.w}×${it.h}</dd><dt>Μέγεθος</dt><dd>${bytes(it.size)}</dd><dt>Ημερομηνία</dt><dd>${esc(fDate(it.mtime))}</dd><dt>Διαδρομή</dt><dd class="small">${esc(it.path)}</dd></dl>
          <h4 style="font-weight:500;margin:18px 0 8px">Πού χρησιμοποιείται</h4>${usedHtml}</div></div>`,
        foot: `${it.builtin ? `<span class="muted small" style="margin-right:auto">Αρχική εικόνα του site — δεν διαγράφεται</span>` : `<button class="btn btn--danger" data-del style="margin-right:auto">${icon("trash")} Διαγραφή</button>`}
          <button class="btn" data-copy>${icon("copy")} Αντιγραφή συνδέσμου</button><a class="btn" href="../${esc(it.path)}" target="_blank" rel="noopener">${icon("external")} Άνοιγμα</a>`,
      });
      $("[data-copy]", m.el).onclick = async () => {
        try { await navigator.clipboard.writeText(new URL(`../${it.path}`, location.href).href); toast("Ο σύνδεσμος αντιγράφηκε"); } catch { toast("Δεν έγινε αντιγραφή", "err"); }
      };
      const del = $("[data-del]", m.el);
      if (del) del.onclick = async () => {
        const msg = it.used.length ? "Η εικόνα <b>χρησιμοποιείται</b> στη σελίδα. Αν τη διαγράψετε, εκείνα τα σημεία θα μείνουν χωρίς εικόνα. Σίγουρα;" : "Η εικόνα θα διαγραφεί οριστικά.";
        if (!(await confirmBox("Διαγραφή εικόνας", msg, { ok: "Διαγραφή", danger: true }))) return;
        try {
          await api("media.delete", { body: { path: it.path, force: !!it.used.length } });
          items = items.filter((x) => x !== it); render(); m.close(); toast("Η εικόνα διαγράφηκε");
        } catch (e) { toast(e.message, "err"); }
      };
    };
    items = (await api("media.list")).items;
    render();
  };

  /* =========================================================
     ΙΣΤΟΡΙΚΟ
     ========================================================= */
  const AUDIT = {
    login: "Σύνδεση", "login.fail": "Αποτυχημένη προσπάθεια σύνδεσης", logout: "Αποσύνδεση", setup: "Δημιουργία λογαριασμού",
    "content.save": "Αποθήκευση περιεχομένου", "content.patch": "Επεξεργασία πάνω στη σελίδα", "history.restore": "Επαναφορά παλιάς έκδοσης",
    "media.upload": "Ανέβασμα εικόνας", "media.delete": "Διαγραφή εικόνας", "settings.save": "Αλλαγή ρυθμίσεων", "account.password": "Αλλαγή κωδικού",
    "2fa.enable": "Ενεργοποίηση 2FA", "2fa.disable": "Απενεργοποίηση 2FA", "analytics.clear": "Διαγραφή στατιστικών", "export.visits": "Εξαγωγή επισκέψεων",
    "export.messages": "Εξαγωγή μηνυμάτων", "messages.delete": "Διαγραφή μηνυμάτων", backup: "Λήψη αντιγράφου ασφαλείας",
  };
  function flatten(o, p = "", out = {}) {
    if (o && typeof o === "object") { for (const [k, v] of Object.entries(o)) flatten(v, p ? `${p}.${k}` : k, out); }
    else out[p] = String(o ?? "");
    return out;
  }
  VIEWS.history = async (view) => {
    setTop("Ιστορικό αλλαγών", "Κάθε αποθήκευση κρατιέται — μπορείτε να γυρίσετε σε οποιαδήποτε παλιά έκδοση");
    const [h, a] = await Promise.all([api("history.list"), api("audit.list")]);
    view.innerHTML = `<div class="grid">
      <div class="card span-7"><div class="card__head"><h3 class="card__title">Εκδόσεις περιεχομένου</h3><p class="card__sub card__act">Οι τελευταίες ${h.items.length}</p></div>
        <div class="timeline">${h.items.length ? h.items.map((it, i) => `<div class="tl"><span class="tl__dot"></span><div><b>${esc(it.note || "Αποθήκευση")}</b><small>${esc(fDT(it.ts))} · ${esc(ago(it.ts))}${i === 0 ? " · <span style='color:var(--gold)'>τρέχουσα</span>" : ""}</small></div>
          <div class="row"><button class="btn btn--sm" data-diff="${i}">${icon("eye", 14)} Τι άλλαξε</button>${i ? `<button class="btn btn--sm" data-restore="${esc(it.id)}">${icon("history", 14)} Επαναφορά</button>` : ""}</div></div>`).join("") : empty("Δεν έχει γίνει καμία αλλαγή ακόμα", "history")}</div></div>
      <div class="card span-5"><div class="card__head"><h3 class="card__title">Ημερολόγιο ενεργειών</h3><p class="card__sub card__act">Ασφάλεια & δραστηριότητα</p></div>
        <div class="feed" style="max-height:640px">${a.items.map((x) => `<div class="feed__i"><span class="feed__ic${x.action === "login.fail" ? "" : x.action === "login" ? " k-arrive" : ""}" style="${x.action === "login.fail" ? "background:rgba(208,59,59,.15);color:#ff8a8a" : ""}">${icon(x.action.startsWith("login") || x.action === "logout" ? "lock" : x.action.startsWith("media") ? "media" : x.action.startsWith("content") || x.action.startsWith("history") ? "edit" : "settings", 14)}</span>
          <span class="feed__t"><b>${esc(AUDIT[x.action] || x.action)}</b>${x.detail ? `<div class="muted small" style="word-break:break-all">${esc(x.detail)}</div>` : ""}</span><span class="feed__when">${esc(fDT(+x.ts))}</span></div>`).join("") || empty("Καμία καταγραφή")}</div></div></div>`;
    view.onclick = async (e) => {
      const d = e.target.closest("[data-diff]"), r = e.target.closest("[data-restore]");
      if (d) {
        const i = +d.dataset.diff;
        const it = h.items[i], older = h.items[i + 1];
        const m = modal({ title: `Τι άλλαξε · ${fDT(it.ts)}`, wide: true, body: `<div class="skel" style="height:160px"></div>` });
        try {
          const cur = (await api("history.get", { params: { id: it.id } })).content;
          if (!older) { m.body.innerHTML = empty("Αυτή είναι η πρώτη αποθηκευμένη έκδοση."); return; }
          const prev = (await api("history.get", { params: { id: older.id } })).content;
          const A = flatten(prev), B = flatten(cur);
          const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter((k) => A[k] !== B[k]);
          m.body.innerHTML = keys.length ? `<div class="diff">${keys.slice(0, 80).map((k) => { const f = SCHEMA.find(k); return `<div class="diff__i"><b>${esc(f ? f.label : k)}</b>${A[k] !== undefined ? `<div class="diff__old">${esc(A[k] || "(κενό)")}</div>` : ""}${B[k] !== undefined ? `<div class="diff__new">${esc(B[k] || "(κενό)")}</div>` : '<div class="diff__new">(αφαιρέθηκε)</div>'}</div>`; }).join("")}</div>` : empty("Καμία διαφορά από την προηγούμενη έκδοση.");
        } catch (x) { m.body.innerHTML = empty(x.message, "alert"); }
      }
      if (r) {
        if (!(await confirmBox("Επαναφορά έκδοσης", "Η σελίδα θα γυρίσει ακριβώς όπως ήταν σε αυτή την έκδοση. Η τωρινή κατάσταση κρατιέται στο ιστορικό, οπότε μπορείτε να την ξαναφέρετε.", { ok: "Επαναφορά" }))) return;
        try { await api("history.restore", { body: { id: r.dataset.restore } }); C.loaded = false; toast("Η έκδοση επανήλθε ✓"); M.route(); } catch (x) { toast(x.message, "err"); }
      }
    };
  };

  /* =========================================================
     ΡΥΘΜΙΣΕΙΣ
     ========================================================= */
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); });
  }

  VIEWS.settings = async (view) => {
    setTop("Ρυθμίσεις", "Λογαριασμός, ασφάλεια, στατιστικά και σύστημα");
    const d = await api("settings.get");
    const S = d.settings, sys = d.system, acc = d.account;
    const sw = (k, title, desc) => `<div class="setrow"><div><b>${title}</b><small>${desc}</small></div><label class="switch"><input type="checkbox" data-s="${k}" ${S[k] ? "checked" : ""}><i></i></label></div>`;
    view.innerHTML = `<div class="setgrid">
      <div class="card"><div class="card__head"><h3 class="card__title">${icon("lock")} Λογαριασμός & ασφάλεια</h3></div>
        <div class="setrow"><div><b>${esc(acc.user)}</b><small>Διαχειριστής · από ${esc(fDate(acc.created))} · κωδικός άλλαξε ${esc(ago(acc.pw_changed))}</small></div><button class="btn btn--sm" id="pwBtn">Αλλαγή κωδικού</button></div>
        <div class="setrow"><div><b>Επαλήθευση σε 2 βήματα (2FA)</b><small>${acc.totp ? '<span class="ok">● Ενεργή</span> — η σύνδεση ζητά και κωδικό από το κινητό' : "Εκτός από τον κωδικό, ζητά και 6ψήφιο κωδικό από το κινητό. Συνιστάται."}</small></div><button class="btn btn--sm ${acc.totp ? "btn--danger" : "btn--gold"}" id="tfaBtn">${acc.totp ? "Απενεργοποίηση" : "Ενεργοποίηση"}</button></div>
      </div>
      <div class="card"><div class="card__head"><h3 class="card__title">${icon("overview")} Στατιστικά</h3></div>
        ${sw("geo", "Πόλη & χώρα επισκεπτών", "Εντοπίζει την περιοχή από τη διεύθυνση IP (η IP δεν αποθηκεύεται)")}
        ${sw("respect_dnt", "Σεβασμός «Do Not Track»", "Όσοι έχουν ζητήσει από τον browser να μην καταγράφονται, δεν μετράνε")}
        ${sw("track_admin", "Να μετράνε και οι δικές μου επισκέψεις", "Συνήθως κλειστό, για να μη «φουσκώνουν» τα νούμερα")}
        <div class="setrow"><div><b>Διατήρηση δεδομένων</b><small>Τα παλαιότερα στατιστικά σβήνονται αυτόματα</small></div><select class="select" data-s="retention_days" style="width:auto">${[[90, "3 μήνες"], [180, "6 μήνες"], [400, "13 μήνες"], [730, "2 χρόνια"], [1825, "5 χρόνια"]].map(([v, l]) => `<option value="${v}" ${+S.retention_days === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="setrow"><div><b>Διαγραφή όλων των στατιστικών</b><small>${nf(sys.pv_count)} καταγεγραμμένες επισκέψεις${sys.first_pv ? ` από ${esc(fDate(sys.first_pv))}` : ""}</small></div><button class="btn btn--sm btn--danger" id="clrBtn">Διαγραφή</button></div>
      </div>
      <div class="card"><div class="card__head"><h3 class="card__title">${icon("bell")} Ειδοποιήσεις</h3></div>
        <div class="fld"><label>Email για τα νέα μηνύματα της φόρμας</label><input class="input" type="email" data-s="notify_email" value="${esc(S.notify_email)}" placeholder="${esc(d.company_email)} (το email της εταιρείας)"><div class="fld__help">Αφήστε κενό για να έρχονται στο email της εταιρείας. Όλα τα μηνύματα μένουν και εδώ, στα «Μηνύματα».</div></div>
        <div class="row"><button class="btn btn--sm" id="mailTest">${icon("mail")} Αποστολή δοκιμαστικού email</button></div>
      </div>
      <div class="card"><div class="card__head"><h3 class="card__title">${icon("alert")} Λειτουργία συντήρησης</h3></div>
        ${sw("maintenance", "Η σελίδα «κλειστή» για το κοινό", "Οι επισκέπτες βλέπουν ένα κομψό μήνυμα. Εσείς βλέπετε κανονικά τη σελίδα.")}
        <div class="fld" style="margin-top:12px"><label>Τίτλος</label><input class="input" data-s="maintenance_title" value="${esc(S.maintenance_title)}"></div>
        <div class="fld"><label>Μήνυμα</label><textarea class="textarea" rows="2" data-s="maintenance_text">${esc(S.maintenance_text)}</textarea></div>
      </div>
      <div class="card"><div class="card__head"><h3 class="card__title">${icon("download")} Αντίγραφο ασφαλείας</h3></div>
        <p class="muted small" style="margin:0 0 14px;line-height:1.7">Κατεβάζει σε ένα αρχείο ZIP όλο το περιεχόμενο, τις εικόνες που ανεβάσατε, τα μηνύματα, τα στατιστικά και το ιστορικό αλλαγών. Καλό είναι να κρατάτε ένα αντίγραφο κάθε μήνα.</p>
        <a class="btn btn--gold" href="${esc(M.exportUrl("backup"))}" download>${icon("download")} Λήψη αντιγράφου</a>
      </div>
      <div class="card"><div class="card__head"><h3 class="card__title">${icon("database")} Σύστημα</h3></div>
        <dl class="sys">
          <dt>PHP</dt><dd>${esc(sys.php)}</dd><dt>SQLite</dt><dd>${esc(sys.sqlite)}</dd>
          <dt>Επεξεργασία εικόνων (GD)</dt><dd class="${sys.gd ? "ok" : "no"}">${sys.gd ? "✓ Ναι" : "✕ Όχι"}</dd>
          <dt>Γεωεντοπισμός (cURL)</dt><dd class="${sys.curl ? "ok" : "no"}">${sys.curl ? "✓ Ναι" : "✕ Όχι"}</dd>
          <dt>Αντίγραφα (ZIP)</dt><dd class="${sys.zip ? "ok" : "no"}">${sys.zip ? "✓ Ναι" : "✕ Μόνο κείμενα"}</dd>
          <dt>Αποστολή email</dt><dd class="${sys.mail ? "ok" : "no"}">${sys.mail ? "✓ Ναι" : "✕ Όχι"}</dd>
          <dt>Δεδομένα εκτός δημόσιου φακέλου</dt><dd class="${sys.data_outside ? "ok" : "no"}">${sys.data_outside ? "✓ Ναι" : "Μέσα (προστατευμένα)"}</dd>
          <dt>Μέγιστο ανέβασμα</dt><dd>${esc(sys.upload_max)}</dd>
          <dt>Βάση δεδομένων</dt><dd>${bytes(sys.db_size)}</dd>
          <dt>Ανεβασμένες εικόνες</dt><dd>${nf(sys.uploads_count)} · ${bytes(sys.uploads_size)}</dd>
          <dt>Μηνύματα</dt><dd>${nf(sys.msg_count)}</dd>
        </dl>
      </div>
    </div>`;

    // αυτόματη αποθήκευση ρυθμίσεων
    let t;
    const saveSettings = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const s = {};
        $$("[data-s]", view).forEach((i) => { s[i.dataset.s] = i.type === "checkbox" ? i.checked : i.value; });
        try { await api("settings.save", { body: { settings: s } }); toast("Οι ρυθμίσεις αποθηκεύτηκαν"); } catch (e) { toast(e.message, "err"); }
      }, 500);
    };
    $$("[data-s]", view).forEach((i) => i.addEventListener(i.type === "checkbox" || i.tagName === "SELECT" ? "change" : "input", saveSettings));

    $("#mailTest", view).onclick = async (e) => {
      const b = e.currentTarget; b.classList.add("loading"); b.disabled = true;
      try { const r = await api("mail.test", { body: {} }); toast(r.ok ? `Στάλθηκε στο ${r.to} — ελέγξτε και τα ανεπιθύμητα` : "Ο server δεν μπόρεσε να στείλει email", r.ok ? "ok" : "err"); }
      catch (x) { toast(x.message, "err"); }
      b.classList.remove("loading"); b.disabled = false;
    };

    $("#clrBtn", view).onclick = () => {
      const m = modal({
        title: "Διαγραφή όλων των στατιστικών",
        body: `<p class="muted" style="margin:0 0 14px;line-height:1.7">Θα διαγραφούν <b>οριστικά</b> όλες οι επισκέψεις και οι ενέργειες. Τα μηνύματα και το περιεχόμενο δεν επηρεάζονται.<br>Γράψτε <b>ΔΙΑΓΡΑΦΗ</b> για επιβεβαίωση.</p><input class="input" id="cConf" autocomplete="off">`,
        foot: `<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--danger" data-ok>Οριστική διαγραφή</button>`,
      });
      $("[data-no]", m.el).onclick = m.close;
      $("[data-ok]", m.el).onclick = async () => {
        try { await api("analytics.clear", { body: { confirm: $("#cConf", m.el).value.trim() } }); m.close(); toast("Τα στατιστικά διαγράφηκαν"); M.route(); }
        catch (x) { toast(x.message, "err"); }
      };
    };

    $("#pwBtn", view).onclick = () => {
      const m = modal({
        title: "Αλλαγή κωδικού",
        body: `<div class="fld"><label>Τρέχων κωδικός</label><input class="input" type="password" id="p0" autocomplete="current-password"></div><div class="fld"><label>Νέος κωδικός (τουλάχιστον 10 χαρακτήρες)</label><input class="input" type="password" id="p1" autocomplete="new-password"></div><div class="fld"><label>Επανάληψη νέου κωδικού</label><input class="input" type="password" id="p2" autocomplete="new-password"></div>`,
        foot: `<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--gold" data-ok>Αλλαγή</button>`,
      });
      $("[data-no]", m.el).onclick = m.close;
      $("[data-ok]", m.el).onclick = async () => {
        const p1 = $("#p1", m.el).value;
        if (p1.length < 10) return toast("Ο νέος κωδικός θέλει τουλάχιστον 10 χαρακτήρες.", "err");
        if (p1 !== $("#p2", m.el).value) return toast("Οι νέοι κωδικοί δεν ταιριάζουν.", "err");
        try { const r = await api("account.password", { body: { current: $("#p0", m.el).value, new: p1 } }); M.csrf = r.csrf; m.close(); toast("Ο κωδικός άλλαξε. Οι άλλες συσκευές αποσυνδέθηκαν."); M.route(); }
        catch (x) { toast(x.message, "err"); }
      };
    };

    $("#tfaBtn", view).onclick = async () => {
      if (acc.totp) {
        const m = modal({
          title: "Απενεργοποίηση 2FA",
          body: `<p class="muted" style="margin:0 0 14px">Για λόγους ασφαλείας, γράψτε τον κωδικό σας.</p><input class="input" type="password" id="dP" autocomplete="current-password">`,
          foot: `<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--danger" data-ok>Απενεργοποίηση</button>`,
        });
        $("[data-no]", m.el).onclick = m.close;
        $("[data-ok]", m.el).onclick = async () => {
          try { await api("2fa.disable", { body: { password: $("#dP", m.el).value } }); m.close(); toast("Η επαλήθευση 2 βημάτων απενεργοποιήθηκε"); M.route(); }
          catch (x) { toast(x.message, "err"); }
        };
        return;
      }
      let r;
      try { r = await api("2fa.begin", { body: {} }); } catch (x) { toast(x.message, "err"); return; }
      const m = modal({
        title: "Ενεργοποίηση 2FA",
        body: `<ol class="muted" style="margin:0 0 16px;padding-left:18px;line-height:1.8"><li>Εγκαταστήστε στο κινητό το <b>Google Authenticator</b> ή το <b>Authy</b>.</li><li>Σκανάρετε τον κωδικό QR (ή γράψτε τον κωδικό χειροκίνητα).</li><li>Γράψτε τον 6ψήφιο αριθμό που εμφανίζεται.</li></ol>
          <div class="qr" id="qr"></div><div class="secret">${esc(r.secret.replace(/(.{4})/g, "$1 ").trim())}</div>
          <div class="fld" style="margin-top:16px"><label>Κωδικός από την εφαρμογή</label><input class="input otp" id="tC" inputmode="numeric" maxlength="7" autocomplete="one-time-code"></div>`,
        foot: `<button class="btn btn--ghost" data-no>Άκυρο</button><button class="btn btn--gold" data-ok>Ενεργοποίηση</button>`,
      });
      try {
        if (!window.QRCode) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js");
        new window.QRCode($("#qr", m.el), { text: r.uri, width: 184, height: 184, colorDark: "#000000", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
      } catch { $("#qr", m.el).remove(); }
      $("[data-no]", m.el).onclick = m.close;
      $("[data-ok]", m.el).onclick = async () => {
        try { await api("2fa.enable", { body: { code: $("#tC", m.el).value } }); m.close(); toast("Η επαλήθευση 2 βημάτων είναι ενεργή ✓"); M.route(); }
        catch (x) { toast(x.message, "err"); }
      };
    };
  };

  /* =========================================================
     Γρήγορη αναζήτηση (Ctrl+K)
     ========================================================= */
  M.palette = () => {
    if ($(".cmdk")) return;
    const items = [
      ...M.NAV.filter((n) => n.length > 1).map((n) => ({ t: n[1], i: n[0], go: `#${n[0]}`, s: "Σελίδα" })),
      ...SCHEMA.sections.filter((s) => !s.page).map((s) => ({ t: `Περιεχόμενο › ${s.label}`, i: "content", go: `#content/${s.key}`, s: "Επεξεργασία" })),
      { t: "Νέο έργο", i: "plus", go: "#projects/new", s: "Ενέργεια" },
      { t: "Ανέβασμα εικόνων", i: "upload", go: "#media", s: "Ενέργεια" },
      { t: "Επεξεργασία πάνω στη σελίδα", i: "edit", run: () => window.open("../?edit=1", "_blank"), s: "Ενέργεια" },
      { t: "Άνοιγμα ιστοσελίδας", i: "external", run: () => window.open("../", "_blank"), s: "Ενέργεια" },
      { t: "Λήψη αντιγράφου ασφαλείας", i: "download", run: () => { location.href = M.exportUrl("backup"); }, s: "Ενέργεια" },
    ];
    const ov = el("div", "overlay");
    ov.innerHTML = `<div class="cmdk" role="dialog" aria-label="Γρήγορη αναζήτηση"><input placeholder="Πού θέλετε να πάτε; (π.χ. μηνύματα, έργα, τίτλος…)" aria-label="Αναζήτηση"><div class="cmdk__list"></div></div>`;
    const input = $("input", ov), list = $(".cmdk__list", ov);
    let sel = 0, shown = items;
    const render = () => {
      const q = norm(input.value);
      shown = items.filter((x) => !q || norm(x.t).includes(q) || norm(x.s).includes(q));
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.innerHTML = shown.map((x, i) => `<div class="cmdk__i${i === sel ? " on" : ""}" data-i="${i}">${ICON[x.i] || ICON.sparkle}<span>${esc(x.t)}</span><small>${esc(x.s)}</small></div>`).join("") || `<div class="empty">Δεν βρέθηκε τίποτα</div>`;
    };
    const close = () => ov.remove();
    const run = (x) => { if (!x) return; close(); if (x.run) x.run(); else location.hash = x.go; };
    input.oninput = () => { sel = 0; render(); };
    input.onkeydown = (e) => {
      if (e.key === "ArrowDown") { sel = Math.min(shown.length - 1, sel + 1); render(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
      else if (e.key === "Enter") run(shown[sel]);
      else if (e.key === "Escape") close();
    };
    list.onclick = (e) => { const r = e.target.closest("[data-i]"); if (r) run(shown[+r.dataset.i]); };
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    document.body.append(ov);
    render();
    input.focus();
  };

  M.start();
})();
