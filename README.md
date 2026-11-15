# M&M Τεχνικά Έργα — mminfrastructure.gr

Ο επίσημος ιστότοπος της M&M Τεχνικά Έργα. Είναι απλό HTML/CSS/JavaScript, χωρίς βιβλιοθήκες και χωρίς βήμα build, οπότε τρέχει παντού και φορτώνει πολύ γρήγορα.

---

## 📁 Τι υπάρχει μέσα στον φάκελο

```
mminfrastructure/
├── index.html                 ← Η σελίδα (κείμενα, ενότητες, έργα)
├── css/style.css              ← Όλη η εμφάνιση (χρώματα, γραμματοσειρές, animations)
├── js/main.js                 ← Η διαδραστικότητα (cursor, πλέγμα, slider, φίλτρα κ.λπ.)
├── assets/
│   ├── images/                ← Οι φωτογραφίες των έργων
│   └── logo/                  ← Εδώ θα μπει το λογότυπο + favicon
├── .htaccess                  ← Ρυθμίσεις για τον server της Hostinger (HTTPS, ταχύτητα)
├── mminfrastructure.code-workspace  ← 👉 ΑΥΤΟ ανοίγεις με το VS Code
└── README.md                  ← Αυτός ο οδηγός
```

---

## 🧭 ΟΔΗΓΟΣ ΒΗΜΑ-ΒΗΜΑ (για αρχάριους)

Η συνολική εικόνα:

**Ο υπολογιστής σου (VS Code)** → ανεβάζεις τις αλλαγές στο **GitHub** → η **Hostinger** τις τραβάει αυτόματα → το **mminfrastructure.gr** δείχνει στη Hostinger.

Τα βήματα 1 έως 7 τα κάνεις **μία φορά μόνο**. Μετά, η καθημερινή δουλειά είναι το βήμα 8.

---

### ΒΗΜΑ 1 — Εγκατάσταση προγραμμάτων (10′)

1. **VS Code**: κατέβασέ το από https://code.visualstudio.com και εγκατέστησέ το.
2. **GitHub Desktop**: κατέβασέ το από https://desktop.github.com. Είναι ο πιο εύκολος τρόπος να δουλέψεις με το GitHub χωρίς εντολές.
3. **Λογαριασμός GitHub**: κάνε δωρεάν εγγραφή στο https://github.com/signup. Καλύτερα να χρησιμοποιήσεις ένα email της εταιρείας.

### ΒΗΜΑ 2 — Βάλε τον φάκελο στη σωστή θέση

1. Αποσυμπίεσε το `mminfrastructure.zip`.
2. Μετέφερε τον φάκελο `mminfrastructure` σε μόνιμη θέση, π.χ. `Documents/Websites/mminfrastructure`.
   ⚠️ Μην τον αφήσεις στα Downloads ή στην Επιφάνεια Εργασίας, γιατί θα τον σβήσεις κατά λάθος.

### ΒΗΜΑ 3 — Άνοιγμα στο VS Code + προεπισκόπηση

1. Κάνε διπλό κλικ στο αρχείο **`mminfrastructure.code-workspace`**, ή από το VS Code: *File → Open Workspace from File…* και διάλεξέ το.
2. Κάτω δεξιά θα εμφανιστεί μήνυμα *"Do you want to install the recommended extensions?"*. Πάτα **Install**. Έτσι εγκαθίσταται το **Live Server**.
   - Αν δεν εμφανιστεί: πήγαινε στο εικονίδιο Extensions αριστερά (τα 4 τετράγωνα), γράψε `Live Server` (από Ritwick Dey) και πάτα Install.
3. Άνοιξε το `index.html` από τη λίστα αριστερά.
4. Πάτα **"Go Live"** κάτω δεξιά στη μπλε γραμμή. Θα ανοίξει ο browser με το σάιτ στη διεύθυνση `http://127.0.0.1:5500`.
5. 🎉 Από εδώ και πέρα, κάθε φορά που κάνεις αλλαγή και πατάς **Ctrl+S** (Mac: **Cmd+S**), ο browser ανανεώνεται μόνος του.

### ΒΗΜΑ 4 — Ανέβασμα στο GitHub (μία φορά)

1. Άνοιξε το **GitHub Desktop** και κάνε **Sign in** με τον λογαριασμό σου στο GitHub.
2. Επίλεξε **File → Add local repository…** και διάλεξε τον φάκελο `mminfrastructure`.
3. Θα σου πει *"This directory does not appear to be a Git repository"*. Πάτα το μπλε link **"create a repository"**.
   - Name: `mminfrastructure`
   - Git ignore / License: άφησέ τα **None**
   - Πάτα **Create repository**.
4. Πάνω πάνω πάτα **Publish repository**.
   - ✅ Για αρχή **ξετσέκαρε** το *"Keep this code private"*. Με δημόσιο repo η σύνδεση με τη Hostinger γίνεται χωρίς κλειδιά (δες το Βήμα 5Β αν το θέλεις ιδιωτικό).
   - Πάτα **Publish repository**.
5. Πήγαινε στο https://github.com/ΤΟ-USERNAME-ΣΟΥ/mminfrastructure για να δεις ότι ανέβηκαν τα αρχεία.

### ΒΗΜΑ 5 — Σύνδεση GitHub → Hostinger (μία φορά)

1. Μπες στο **hPanel** της Hostinger: https://hpanel.hostinger.com
2. Αν δεν έχεις ήδη προσθέσει το site: **Websites → Add website** και διάλεξε το `mminfrastructure.gr` (επιλογή *"Use an existing domain"*). Αν σε ρωτήσει για WordPress ή Website Builder, διάλεξε **Skip / Empty website**.
3. Στο site πάτα **Dashboard / Manage**. Από το αριστερό μενού: **Advanced → GIT**.
4. Συμπλήρωσε στο **Create a New Repository**:
   - **Repository**: `https://github.com/ΤΟ-USERNAME-ΣΟΥ/mminfrastructure.git`
   - **Branch**: `main`
   - **Directory**: άφησέ το **κενό**. Έτσι τα αρχεία πάνε κατευθείαν στο `public_html`.
   - ⚠️ Το `public_html` πρέπει να είναι **άδειο**. Αν έχει ένα προεπιλεγμένο `default.php` ή `index.php`, σβήσ' το από **Files → File Manager → public_html**.
5. Πάτα **Create**. Στη λίστα από κάτω πάτα **Deploy**.
6. **Αυτόματο deploy** (για να ενημερώνεται μόνο του):
   - Στην ίδια σελίδα πάτα **Auto Deployment** και **αντίγραψε το Webhook URL**.
   - Στο GitHub, στο repo σου: **Settings → Webhooks → Add webhook**.
   - **Payload URL**: επικόλλησε το URL. **Content type**: `application/json`. Μετά πάτα **Add webhook**.
   - ✅ Από εδώ και πέρα, κάθε "Push" στο GitHub ανεβαίνει αυτόματα στο σάιτ.

**5Β (προαιρετικό) — Ιδιωτικό repo:** στη σελίδα GIT της Hostinger υπάρχει κουμπί **Generate SSH Key**. Αντέγραψε το κλειδί και πρόσθεσέ το στο GitHub: **repo → Settings → Deploy keys → Add deploy key**. Μετά στο πεδίο Repository βάλε τη διεύθυνση SSH: `git@github.com:ΤΟ-USERNAME-ΣΟΥ/mminfrastructure.git`.

### ΒΗΜΑ 6 — Σύνδεση του domain από το papaki.gr (μία φορά)

Το domain είναι αγορασμένο στο papaki, το hosting όμως είναι στη Hostinger. Πρέπει λοιπόν το domain να «δείχνει» στη Hostinger:

1. Στο hPanel κοίτα ποια **nameservers** σου δίνει η Hostinger. Θα τα βρεις στη σελίδα του site ή στο **Domains → mminfrastructure.gr → DNS / Nameservers**. Συνήθως είναι:
   ```
   ns1.dns-parking.com
   ns2.dns-parking.com
   ```
   (Χρησιμοποίησε πάντα **αυτά που σου δείχνει το hPanel**.)
2. Μπες στο **papaki.gr → Τα domains μου → mminfrastructure.gr → Nameservers / Διαχείριση DNS**.
3. Διάλεξε **"Χρήση δικών μου nameservers"** (custom), σβήσε τα παλιά, βάλε τα δύο της Hostinger και **Αποθήκευση**.
4. ⏳ Η αλλαγή θέλει από λίγα λεπτά μέχρι **24–48 ώρες** για να ενεργοποιηθεί.

### ΒΗΜΑ 7 — HTTPS (το λουκέτο 🔒)

1. hPanel → **Security → SSL**. Βεβαιώσου ότι το SSL για το `mminfrastructure.gr` είναι **Active**. Είναι δωρεάν και συνήθως ενεργοποιείται μόνο του μόλις «πιάσει» το domain.
2. Το αρχείο `.htaccess` που υπάρχει ήδη στον φάκελο στέλνει αυτόματα όλους τους επισκέπτες στο `https://mminfrastructure.gr` (χωρίς www).

### ΒΗΜΑ 8 — 🔁 Η καθημερινή ροή (κάθε φορά που αλλάζεις κάτι)

1. Κάνεις αλλαγές στο **VS Code** και τις βλέπεις ζωντανά με το Live Server.
2. Ανοίγεις το **GitHub Desktop**. Αριστερά βλέπεις τι άλλαξε.
3. Κάτω αριστερά γράφεις στο **Summary** μια περιγραφή, π.χ. `Προσθήκη νέου έργου`, και πατάς **Commit to main**.
4. Πατάς **Push origin** πάνω πάνω.
5. Σε 10–30 δευτερόλεπτα το **mminfrastructure.gr** είναι ενημερωμένο. Αν δεν δεις την αλλαγή, κάνε **Ctrl+F5** για να καθαρίσει η cache.

### ΒΗΜΑ 9 — Ενεργοποίηση της φόρμας επικοινωνίας (5′)

Επειδή το σάιτ δεν έχει δικό του server κώδικα, τα email τα στέλνει δωρεάν η υπηρεσία **Formspree**:

1. Κάνε εγγραφή στο https://formspree.io με το email όπου θέλεις να έρχονται τα μηνύματα.
2. Επίλεξε **New Form**, δώσε όνομα `mminfrastructure` και πάτα Create.
3. Θα σου δώσει μια διεύθυνση σαν `https://formspree.io/f/abcdwxyz`.
4. Στο `index.html` βρες το `YOUR_FORM_ID` (Ctrl+F) και αντικατέστησέ το με τον δικό σου κωδικό (π.χ. `abcdwxyz`).
5. Κάνε Commit + Push. Στείλε ένα δοκιμαστικό μήνυμα και επιβεβαίωσε το email που θα σου έρθει.

---

## ✏️ Συνηθισμένες αλλαγές

| Θέλω να… | Πού το κάνω |
|---|---|
| Αλλάξω κείμενα | `index.html` (ψάξε με Ctrl+F τη φράση) |
| Αλλάξω τηλέφωνο/email | `index.html`, ενότητα `CONTACT` |
| Αλλάξω τους αριθμούς (χρόνια, έργα…) | `index.html`, `data-count="15"` κ.λπ. |
| Αλλάξω χρώματα | `css/style.css`, οι μεταβλητές στην αρχή (`--gold`, `--bg`…) |
| Προσθέσω έργο | Βάλε τη φωτό στο `assets/images/` και αντέγραψε ένα `<figure class="project">` στο `index.html` |
| Βάλω λογότυπο | Βάλε το `logo.svg` στο `assets/logo/` και ακολούθησε τη σημείωση 👉 στο header του `index.html` |

**Φωτογραφίες:** πριν τις ανεβάσεις, μίκρυνέ τες σε πλάτος περίπου 1600px και μέγεθος κάτω από 400KB. Μπορείς να το κάνεις δωρεάν στο https://squoosh.app. Τα ονόματα των αρχείων να είναι **λατινικά, χωρίς κενά**, π.χ. `plateia-kalamaria.jpg`.

Σε όλο τον κώδικα, ό,τι σημάδι 👉 βλέπεις είναι σημείο που πρέπει να συμπληρώσεις με πραγματικά στοιχεία.
