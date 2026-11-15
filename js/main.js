/* =========================================================
   M&M ΤΕΧΝΙΚΑ ΕΡΓΑ — Διαδραστικότητα
   Χωρίς βιβλιοθήκες: καθαρό JavaScript, γρήγορο και ελαφρύ.
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isTouch = matchMedia("(hover: none)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.body.classList.add("loading");
  $("#year").textContent = new Date().getFullYear();

  /* ---------- 1. Preloader ---------- */
  const imgs = $$("img");
  let loaded = 0;
  const bar = $("#preloaderBar"), pct = $("#preloaderPct");
  const tick = () => {
    loaded++;
    const p = Math.min(100, Math.round((loaded / imgs.length) * 100));
    bar.style.width = p + "%";
    pct.textContent = String(p).padStart(3, "0");
  };
  imgs.forEach((im) => (im.complete ? tick() : (im.addEventListener("load", tick), im.addEventListener("error", tick))));
  const finish = () => {
    bar.style.width = "100%"; pct.textContent = "100";
    setTimeout(() => {
      $("#preloader").classList.add("done");
      document.body.classList.remove("loading");
      document.body.classList.add("loaded");
    }, 350);
  };
  window.addEventListener("load", finish);
  setTimeout(finish, 3500); // ασφάλεια αν αργήσει κάποια εικόνα

  /* ---------- 2. Custom cursor ---------- */
  if (!isTouch) {
    const c = $("#cursor"), d = $("#cursorDot");
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; d.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    (function loop() {
      cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18;
      c.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$("a, button, [data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", () => c.classList.add("hover"));
      el.addEventListener("mouseleave", () => c.classList.remove("hover"));
    });
    $$(".project").forEach((el) => {
      el.addEventListener("mouseenter", () => c.classList.add("hover", "view"));
      el.addEventListener("mouseleave", () => c.classList.remove("hover", "view"));
    });
  }

  /* ---------- 3. Magnetic buttons ---------- */
  if (!isTouch) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- 4. 3D tilt + spotlight on cards ---------- */
  if (!isTouch && !reduce) {
    $$("[data-tilt]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 8}deg)`;
        el.style.setProperty("--mx", px * 100 + "%");
        el.style.setProperty("--my", py * 100 + "%");
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------- 5. Header, scroll progress, parallax, timeline ---------- */
  const header = $("#header"), prog = $("#scrollProgress");
  const parallax = $$("[data-parallax] img");
  const tl = $("#timeline"), tlFill = $("#timelineFill");
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    prog.style.width = (y / h) * 100 + "%";
    header.classList.toggle("scrolled", y > 40);
    header.classList.toggle("hide", y > lastY && y > 600 && !$("#nav").classList.contains("open"));
    lastY = y;
    if (!reduce) parallax.forEach((im) => {
      const r = im.parentElement.getBoundingClientRect();
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      im.style.transform = `translateY(${t * -12 - 8}%)`;
    });
    if (tl) {
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3)));
      tlFill.style.width = p * 100 + "%";
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 6. Mobile menu ---------- */
  const burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", () => { burger.classList.toggle("open"); nav.classList.toggle("open"); });
  $$("#nav a").forEach((a) => a.addEventListener("click", () => { burger.classList.remove("open"); nav.classList.remove("open"); }));

  /* ---------- 7. Reveal on scroll + counters ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      $$("[data-count]", en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = (i % 4) * 0.08 + "s"; io.observe(el); });

  function countUp(el) {
    const end = +el.dataset.count, dur = 2000, t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- 8. Project filters ---------- */
  $$("#filters button").forEach((b) => b.addEventListener("click", () => {
    $$("#filters button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    const f = b.dataset.filter;
    $$(".project").forEach((p) => {
      const show = f === "all" || p.dataset.cat === f;
      p.style.opacity = 0; p.style.transform = "scale(.96)";
      setTimeout(() => {
        p.classList.toggle("is-hidden", !show);
        if (show) requestAnimationFrame(() => { p.style.opacity = 1; p.style.transform = ""; });
      }, 300);
    });
  }));

  /* ---------- 9. Lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  let idx = 0;
  const visible = () => $$(".project:not(.is-hidden)");
  const show = (i) => {
    const list = visible(); idx = (i + list.length) % list.length;
    const p = list[idx];
    lbImg.src = $("img", p).src; lbImg.alt = $("img", p).alt;
    lbCap.textContent = $("h3", p).textContent;
  };
  $$(".project").forEach((p) => p.addEventListener("click", () => {
    show(visible().indexOf(p)); lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
  }));
  const close = () => { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); };
  $("#lbClose").onclick = close;
  $("#lbPrev").onclick = () => show(idx - 1);
  $("#lbNext").onclick = () => show(idx + 1);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });

  /* ---------- 10. Before / After slider ---------- */
  const ba = $("#ba"), baBefore = $("#baBefore"), baHandle = $("#baHandle");
  if (ba) {
    let drag = false;
    const set = (x) => {
      const r = ba.getBoundingClientRect();
      const p = Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100));
      baBefore.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      baHandle.style.left = p + "%";
    };
    ba.addEventListener("pointerdown", (e) => { drag = true; set(e.clientX); });
    addEventListener("pointermove", (e) => drag && set(e.clientX));
    addEventListener("pointerup", () => (drag = false));
    if (!isTouch) ba.addEventListener("mousemove", (e) => !drag && set(e.clientX));
  }

  /* ---------- 11. Hero «blueprint» canvas — τεχνικό πλέγμα που αντιδρά στο ποντίκι ---------- */
  const cv = $("#blueprint");
  if (cv && !reduce) {
    const ctx = cv.getContext("2d");
    let w, h, dpr, pts = [], mouse = { x: -999, y: -999 };
    const GAP = 46;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let x = GAP / 2; x < w; x += GAP) for (let y = GAP / 2; y < h; y += GAP) pts.push({ x, y });
    };
    resize(); addEventListener("resize", resize);
    cv.parentElement.addEventListener("mousemove", (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    cv.parentElement.addEventListener("mouseleave", () => (mouse.x = mouse.y = -999));
    const GOLD = getComputedStyle(document.documentElement).getPropertyValue("--gold-rgb").trim() || "200,179,120";
    let t = 0;
    (function draw() {
      t += 0.006;
      ctx.clearRect(0, 0, w, h);
      // λεπτές γραμμές πλέγματος
      ctx.strokeStyle = "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += GAP) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y < h; y += GAP) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      // κόμβοι που «ανάβουν» κοντά στο ποντίκι + κύμα
      for (const p of pts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.hypot(dx, dy);
        const near = Math.max(0, 1 - dist / 220);
        const wave = (Math.sin(p.x * 0.01 + p.y * 0.008 + t * 3) + 1) / 2;
        const a = 0.06 + wave * 0.08 + near * 0.8;
        const s = 1 + near * 2.5;
        ctx.fillStyle = near > 0.05 ? `rgba(${GOLD},${a})` : `rgba(255,255,255,${a * 0.6})`;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      // σταυρόνημα «χωροβάτη» στο ποντίκι
      if (mouse.x > 0) {
        ctx.strokeStyle = `rgba(${GOLD},0.25)`;
        ctx.beginPath(); ctx.moveTo(mouse.x, 0); ctx.lineTo(mouse.x, h); ctx.moveTo(0, mouse.y); ctx.lineTo(w, mouse.y); ctx.stroke();
      }
      requestAnimationFrame(draw);
    })();

    // ζωντανές «συντεταγμένες» στο κάτω μέρος του hero
    const coords = $("#coords");
    cv.parentElement.addEventListener("mousemove", () => {
      const lat = (40.6401 + (mouse.y / h - 0.5) * -0.01).toFixed(4);
      const lng = (22.9444 + (mouse.x / w - 0.5) * 0.01).toFixed(4);
      coords.textContent = `${lat}° N · ${lng}° E`;
    });
  }

  /* ---------- 12. Φόρμα επικοινωνίας (Formspree) ---------- */
  const form = $("#contactForm"), status = $("#formStatus");
  form.addEventListener("submit", async (e) => {
    if (form.action.includes("YOUR_FORM_ID")) {
      e.preventDefault();
      status.textContent = "⚠ Η φόρμα δεν έχει ρυθμιστεί ακόμα (δες README, βήμα 9).";
      return;
    }
    e.preventDefault();
    status.textContent = "Αποστολή…";
    try {
      const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
      status.textContent = res.ok ? "✓ Ευχαριστούμε! Θα επικοινωνήσουμε σύντομα." : "Κάτι πήγε στραβά. Δοκιμάστε ξανά.";
      if (res.ok) form.reset();
    } catch { status.textContent = "Σφάλμα σύνδεσης. Δοκιμάστε ξανά."; }
  });
})();
