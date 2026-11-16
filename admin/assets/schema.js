/* =========================================================
   M&M — Χάρτης περιεχομένου
   Περιγράφει κάθε επεξεργάσιμο πεδίο της σελίδας (ετικέτα, τύπος, βοήθεια).
   Το χρησιμοποιούν ο επεξεργαστής περιεχομένου και η επεξεργασία πάνω στη σελίδα.
   Τύποι: text · rich (πολλές γραμμές, *έμφαση*) · number · image · icon · select · list
   ========================================================= */
(() => {
  const RICH = "Enter = νέα γραμμή · *λέξη* = πλάγια/χρυσή έμφαση";
  const T = (k, label, extra = {}) => ({ k, label, type: "text", ...extra });
  const R = (k, label, extra = {}) => ({ k, label, type: "rich", help: RICH, ...extra });
  const I = (k, label, extra = {}) => ({ k, label, type: "image", ...extra });
  const eyebrow = T("eyebrow", "Μικρός τίτλος (πάνω από τον τίτλο)");

  const sections = [
    {
      key: "hero", label: "Αρχική οθόνη", anchor: "#hero", icon: "home",
      desc: "Το πρώτο πράγμα που βλέπει ο επισκέπτης.",
      fields: [
        eyebrow,
        R("title", "Κεντρικός τίτλος", { rows: 3, help: "Κάθε γραμμή σε νέα σειρά · η τελευταία γραμμή βγαίνει χρυσή · *λέξη* = πλάγια" }),
        R("lead", "Κείμενο κάτω από τον τίτλο", { rows: 3 }),
        T("cta_primary", "Κουμπί «έργα»"),
        T("cta_secondary", "Κουμπί «προσφορά»"),
        I("image", "Μεγάλη φωτογραφία"),
        T("image_alt", "Περιγραφή φωτογραφίας", { help: "Για Google και για άτομα με προβλήματα όρασης" }),
        T("tag", "Ετικέτα πάνω στη φωτογραφία"),
      ],
    },
    {
      key: "marquee", label: "Κυλιόμενη μπάρα", anchor: "#about", icon: "marquee",
      desc: "Οι λέξεις που κυλάνε κάτω από την αρχική οθόνη.",
      fields: [{ k: "items", label: "Λέξεις", type: "list", item: { type: "text" }, add: "Προσθήκη λέξης", itemTitle: (v) => v }],
    },
    {
      key: "about", label: "Η Εταιρεία", anchor: "#about", icon: "building",
      fields: [
        eyebrow, R("title", "Τίτλος", { rows: 2 }), R("p1", "Πρώτη παράγραφος", { rows: 5 }), R("p2", "Δεύτερη παράγραφος", { rows: 4, help: "Αφήστε κενό για να μην εμφανίζεται" }),
        {
          k: "stats", label: "Αριθμοί", type: "list", add: "Προσθήκη αριθμού", itemTitle: (v) => `${v.value}${v.suffix} ${v.label}`,
          item: { type: "object", fields: [{ k: "value", label: "Αριθμός", type: "number" }, T("suffix", "Σύμβολο", { help: "π.χ. + ή % ή k" }), T("label", "Περιγραφή")] },
        },
      ],
    },
    {
      key: "services", label: "Υπηρεσίες", anchor: "#services", icon: "tool",
      fields: [
        eyebrow, R("title", "Τίτλος", { rows: 2 }),
        {
          k: "items", label: "Υπηρεσίες", type: "list", add: "Προσθήκη υπηρεσίας", itemTitle: (v) => v.title,
          item: { type: "object", fields: [{ k: "icon", label: "Εικονίδιο", type: "icon" }, T("title", "Τίτλος"), R("text", "Περιγραφή", { rows: 3 })] },
        },
      ],
    },
    {
      key: "projects", label: "Έργα", anchor: "#projects", icon: "grid",
      desc: "Για εικόνες, σειρά και κατηγορίες υπάρχει και η σελίδα «Έργα» με οπτική διαχείριση.",
      fields: [
        eyebrow, R("title", "Τίτλος", { rows: 2 }), T("filter_all", "Κουμπί «Όλα»"),
        {
          k: "categories", label: "Κατηγορίες (φίλτρα)", type: "list", add: "Νέα κατηγορία", itemTitle: (v) => v.label,
          item: { type: "object", fields: [T("label", "Όνομα φίλτρου", { help: "π.χ. Παραλιακά" }), T("tag", "Ετικέτα στην κάρτα του έργου", { help: "π.χ. Παραλιακό Μέτωπο" }), { k: "key", label: "Κωδικός", type: "key" }] },
        },
        {
          k: "items", label: "Έργα", type: "list", add: "Νέο έργο", itemTitle: (v) => v.title,
          item: {
            type: "object", fields: [
              I("image", "Φωτογραφία"), T("title", "Τίτλος"), T("alt", "Περιγραφή φωτογραφίας"),
              { k: "cat", label: "Κατηγορία", type: "select", options: "categories" },
              { k: "size", label: "Μέγεθος κάρτας", type: "select", options: [["normal", "Κανονικό"], ["tall", "Ψηλό"], ["wide", "Φαρδύ"]] },
            ],
          },
        },
      ],
    },
    {
      key: "compare", label: "Πριν · Μετά", anchor: "#compare", icon: "compare",
      fields: [eyebrow, R("title", "Τίτλος", { rows: 2 }), R("text", "Κείμενο", { rows: 3 }), I("before", "Φωτογραφία «πριν»"), I("after", "Φωτογραφία «μετά»"), T("label_before", "Ετικέτα «πριν»"), T("label_after", "Ετικέτα «μετά»")],
    },
    {
      key: "process", label: "Μέθοδος", anchor: "#process", icon: "steps",
      fields: [
        eyebrow, R("title", "Τίτλος", { rows: 2 }),
        { k: "steps", label: "Βήματα", type: "list", add: "Προσθήκη βήματος", itemTitle: (v) => v.title, item: { type: "object", fields: [T("title", "Τίτλος"), R("text", "Περιγραφή", { rows: 2 })] } },
      ],
    },
    {
      key: "fleet", label: "Εξοπλισμός", anchor: "#fleet", icon: "truck",
      fields: [
        eyebrow, R("title", "Τίτλος", { rows: 2 }), R("text", "Κείμενο", { rows: 3 }), I("image", "Φωτογραφία"), T("image_alt", "Περιγραφή φωτογραφίας"),
        { k: "items", label: "Μηχανήματα", type: "list", add: "Προσθήκη", itemTitle: (v) => v.name, item: { type: "object", fields: [T("name", "Όνομα"), T("detail", "Λεπτομέρεια")] } },
      ],
    },
    {
      key: "contact", label: "Επικοινωνία", anchor: "#contact", icon: "mail",
      desc: "Τηλέφωνα, email και διεύθυνση αλλάζουν από τα «Στοιχεία εταιρείας».",
      fields: [
        eyebrow, R("title", "Τίτλος", { rows: 2 }),
        T("label_phone", "Ετικέτα τηλεφώνου"), T("label_email", "Ετικέτα email"), T("label_address", "Ετικέτα διεύθυνσης"), T("label_hours", "Ετικέτα ωραρίου"),
        T("form_name", "Φόρμα: πεδίο ονόματος"), T("form_email", "Φόρμα: πεδίο email"), T("form_phone", "Φόρμα: πεδίο τηλεφώνου"), T("form_message", "Φόρμα: πεδίο μηνύματος"),
        T("form_submit", "Φόρμα: κουμπί αποστολής"), T("form_success", "Μήνυμα επιτυχίας"),
      ],
    },
    {
      key: "nav", label: "Μενού", anchor: "#top", icon: "menu",
      fields: [T("about", "Η Εταιρεία"), T("services", "Υπηρεσίες"), T("projects", "Έργα"), T("process", "Μέθοδος"), T("fleet", "Εξοπλισμός"), T("contact", "Κουμπί επικοινωνίας")],
    },
    { key: "footer", label: "Υποσέλιδο", anchor: "#contact", icon: "footer", fields: [T("copyright", "Κείμενο πνευματικών δικαιωμάτων", { help: "Πριν μπαίνει αυτόματα © και η χρονιά" })] },
    {
      key: "company", label: "Στοιχεία εταιρείας", anchor: "#contact", icon: "id", page: "company",
      fields: [
        T("name", "Επωνυμία"), T("tagline", "Υπότιτλος δίπλα στο λογότυπο"),
        T("phone", "Τηλέφωνο"), T("phone2", "Δεύτερο τηλέφωνο", { help: "Προαιρετικό" }), T("email", "Email"),
        R("address", "Διεύθυνση", { rows: 2, help: "Enter = νέα γραμμή" }), R("hours", "Ωράριο", { rows: 2, help: "Προαιρετικό · π.χ. Δευ–Παρ 08:00–16:00" }), T("vat", "ΑΦΜ / ΓΕΜΗ", { help: "Προαιρετικό" }),
        T("facebook", "Facebook (link)"), T("instagram", "Instagram (link)"), T("linkedin", "LinkedIn (link)"),
        T("lat", "Γεωγραφικό πλάτος", { help: "Οι «συντεταγμένες» στην αρχική οθόνη" }), T("lng", "Γεωγραφικό μήκος"),
      ],
    },
    {
      key: "seo", label: "SEO & Κοινοποίηση", anchor: "#top", icon: "search", page: "seo",
      fields: [
        T("title", "Τίτλος σελίδας", { max: 60 }), R("description", "Περιγραφή για Google", { rows: 3, max: 160, help: "Εμφανίζεται κάτω από τον τίτλο στα αποτελέσματα της Google" }),
        T("og_title", "Τίτλος κοινοποίησης"), T("og_description", "Περιγραφή κοινοποίησης"), I("og_image", "Εικόνα κοινοποίησης", { help: "Ιδανικά 1200×630" }),
      ],
    },
  ];

  /** Βρίσκει τον ορισμό ενός πεδίου από τη διαδρομή του, π.χ. "services.items.2.title". */
  function find(path) {
    const parts = path.split(".");
    const sec = sections.find((s) => s.key === parts[0]);
    if (!sec) return null;
    let fields = sec.fields, field = null, crumbs = [sec.label];
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      if (/^\d+$/.test(p)) { crumbs.push("#" + (+p + 1)); continue; }
      field = (fields || []).find((f) => f.k === p);
      if (!field) return null;
      crumbs.push(field.label);
      if (field.type === "list") fields = field.item.type === "object" ? field.item.fields : null;
      if (field.type === "list" && field.item.type !== "object" && /^\d+$/.test(parts[i + 1] || "")) field = { ...field.item, label: field.label };
    }
    return field ? { section: sec, field, label: crumbs.join(" › ") } : null;
  }

  window.MM_SCHEMA = { sections, find, RICH };
})();
