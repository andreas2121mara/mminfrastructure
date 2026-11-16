<?php
/* =========================================================
   M&M — Διαχείριση
   Πρώτη φορά: δημιουργία λογαριασμού. Μετά: σύνδεση → πίνακας ελέγχου.
   ========================================================= */
declare(strict_types=1);
ini_set('display_errors', '0');

$view = 'login';
$error = '';
$u = null;
try {
  require __DIR__ . '/../lib/bootstrap.php';
  $u = mm_admin();
  $view = mm_auth() === null ? 'setup' : ($u ? 'app' : 'login');
  mm_db();
} catch (Throwable $e) {
  $view = 'error';
  $error = $e->getMessage();
  error_log('[mm] admin: ' . $error);
}

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: same-origin');
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$v = fn($p) => $p . (is_file(__DIR__ . '/' . $p) ? '?v=' . filemtime(__DIR__ . '/' . $p) : '');
?><!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#0b0b0c" />
<?php if ($view === 'app'): ?>
  <meta name="csrf" content="<?= $h($u['csrf']) ?>" />
  <meta name="user" content="<?= $h($u['user']) ?>" />
<?php endif; ?>
  <title>Διαχείριση · M&amp;M Τεχνικά Έργα</title>
  <link rel="icon" href="../assets/logo/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@300;400;500;600;700&family=Noto+Serif+Display:ital,wght@1,300;1,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="<?= $h($v('assets/admin.css')) ?>" />
</head>
<body class="view-<?= $h($view) ?>">

<?php if ($view === 'app'): ?>
  <div id="app" class="boot"><div class="boot__logo"><img src="../assets/logo/logo-mark.svg" alt="" /></div></div>
  <script src="<?= $h($v('assets/worldmap.js')) ?>"></script>
  <script src="<?= $h($v('assets/schema.js')) ?>"></script>
  <script src="<?= $h($v('assets/admin.js')) ?>"></script>
  <script src="<?= $h($v('assets/admin-site.js')) ?>"></script>

<?php elseif ($view === 'error'): ?>
  <main class="auth">
    <div class="auth__card">
      <img class="auth__logo" src="../assets/logo/logo.svg" alt="M&amp;M" />
      <h1>Κάτι δεν είναι σωστά ρυθμισμένο</h1>
      <p class="auth__sub">Η διαχείριση δεν μπορεί να ξεκινήσει: <b><?= $h($error) ?></b></p>
      <p class="auth__sub">Συνήθως λύνεται από το hPanel → <b>Advanced → PHP Configuration</b>: επιλέξτε PHP 8.1 ή νεότερη και βεβαιωθείτε ότι είναι ενεργά τα <b>pdo_sqlite</b> και <b>gd</b>.</p>
      <a class="auth__back" href="../">← Επιστροφή στην ιστοσελίδα</a>
    </div>
  </main>

<?php else: ?>
  <canvas class="auth__bg" id="authBg" aria-hidden="true"></canvas>
  <main class="auth">
    <div class="auth__card">
      <img class="auth__logo" src="../assets/logo/logo.svg" alt="M&amp;M Τεχνικά Έργα" width="472" height="512" />
<?php if ($view === 'setup'): ?>
      <h1>Καλώς ήρθατε</h1>
      <p class="auth__sub">Πρώτη εκκίνηση της διαχείρισης. Δημιουργήστε τον λογαριασμό του διαχειριστή. Θα είναι ο <b>μοναδικός</b> με πρόσβαση.</p>
      <form class="auth__form" id="setupForm" autocomplete="on">
        <label class="f"><span>Όνομα χρήστη</span><input name="user" required minlength="3" maxlength="40" autocomplete="username" autofocus /></label>
        <label class="f"><span>Κωδικός <em>(τουλάχιστον 10 χαρακτήρες)</em></span>
          <div class="pw"><input name="pass" type="password" required minlength="10" autocomplete="new-password" /><button type="button" class="pw__eye" aria-label="Εμφάνιση κωδικού">👁</button></div>
          <div class="meter"><i id="meter"></i></div><small class="meter__txt" id="meterTxt"></small>
        </label>
        <label class="f"><span>Επανάληψη κωδικού</span><input name="pass2" type="password" required autocomplete="new-password" /></label>
        <p class="auth__err" id="authErr" role="alert"></p>
        <button class="abtn" type="submit"><span>Δημιουργία λογαριασμού</span></button>
      </form>
<?php else: ?>
      <h1>Διαχείριση</h1>
      <p class="auth__sub">Συνδεθείτε για να συνεχίσετε.</p>
      <form class="auth__form" id="loginForm" autocomplete="on">
        <label class="f"><span>Όνομα χρήστη</span><input name="user" required autocomplete="username" autofocus /></label>
        <label class="f"><span>Κωδικός</span>
          <div class="pw"><input name="pass" type="password" required autocomplete="current-password" /><button type="button" class="pw__eye" aria-label="Εμφάνιση κωδικού">👁</button></div>
        </label>
        <label class="chk"><input type="checkbox" name="remember" /> <span>Να με θυμάσαι σε αυτή τη συσκευή (30 μέρες)</span></label>
        <p class="auth__err" id="authErr" role="alert"></p>
        <button class="abtn" type="submit"><span>Σύνδεση</span></button>
      </form>
      <form class="auth__form" id="tfaForm" hidden>
        <p class="auth__sub">Ανοίξτε την εφαρμογή επαλήθευσης (Google Authenticator, Authy…) και γράψτε τον 6ψήφιο κωδικό.</p>
        <label class="f"><span>Κωδικός επαλήθευσης</span><input name="code" inputmode="numeric" pattern="[0-9 ]*" maxlength="7" autocomplete="one-time-code" class="otp" /></label>
        <p class="auth__err" id="tfaErr" role="alert"></p>
        <button class="abtn" type="submit"><span>Επιβεβαίωση</span></button>
      </form>
<?php endif; ?>
      <a class="auth__back" href="../">← Επιστροφή στην ιστοσελίδα</a>
    </div>
  </main>
  <script src="<?= $h($v('assets/admin.js')) ?>"></script>
<?php endif; ?>
</body>
</html>
