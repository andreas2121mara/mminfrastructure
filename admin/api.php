<?php
/* =========================================================
   M&M — API της Διαχείρισης
   Όλες οι ενέργειες του πίνακα ελέγχου περνούν από εδώ.
   Χωρίς σύνδεση επιτρέπονται μόνο: status, setup, login, login2fa.
   ========================================================= */
declare(strict_types=1);
ini_set('display_errors', '0');

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/content.php';
require __DIR__ . '/../lib/analytics.php';

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: SAMEORIGIN');

$A = (string)($_GET['a'] ?? '');
$POST = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';

try {
  mm_dispatch($A, $POST);
} catch (Throwable $e) {
  error_log('[mm] admin api ' . $A . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  mm_json(['error' => $e instanceof RuntimeException ? $e->getMessage() : 'Απρόσμενο σφάλμα στον server.'], 500);
}

function mm_need_post(bool $post): void {
  if (!$post) mm_json(['error' => 'Απαιτείται POST.'], 405);
}

function mm_dispatch(string $a, bool $post): void {
  /* ---------- Χωρίς σύνδεση ---------- */
  switch ($a) {
    case 'status':
      $u = mm_admin();
      mm_json(['setup' => mm_auth() === null, 'logged' => $u !== null, 'user' => $u['user'] ?? null, 'csrf' => $u['csrf'] ?? null]);
    case 'setup': mm_need_post($post); mm_setup();
    case 'login': mm_need_post($post); mm_login();
    case 'login2fa': mm_need_post($post); mm_login2fa();
    case 'logout':
      mm_need_post($post);
      if (mm_admin()) mm_audit('logout');
      mm_logout();
      mm_json(['ok' => true]);
  }

  /* ---------- Με σύνδεση ---------- */
  $u = mm_require_admin(true);
  $db = mm_db();
  switch ($a) {
    case 'badge': mm_json(mm_badge());
    case 'overview': mm_json(mm_overview());
    case 'live': mm_json(mm_live());
    case 'visits': mm_json(mm_visits());
    case 'visit': mm_json(mm_visit((string)($_GET['pid'] ?? '')));
    case 'export': mm_export_visits();

    case 'messages.list': mm_json(mm_messages_list());
    case 'messages.get':
      $q = $db->prepare('SELECT * FROM msg WHERE id = ?');
      $q->execute([(int)($_GET['id'] ?? 0)]);
      $m = $q->fetch();
      if (!$m) mm_json(['error' => 'Το μήνυμα δεν βρέθηκε.'], 404);
      if (!$m['is_read']) { $db->prepare('UPDATE msg SET is_read = 1 WHERE id = ?')->execute([$m['id']]); $m['is_read'] = 1; }
      mm_json(['message' => $m]);
    case 'messages.update':
      mm_need_post($post);
      $in = mm_input();
      $ids = array_map('intval', (array)($in['ids'] ?? []));
      foreach (['is_read', 'starred', 'archived'] as $f) {
        if (array_key_exists($f, $in) && $ids) {
          $ph = implode(',', array_fill(0, count($ids), '?'));
          $db->prepare("UPDATE msg SET $f = ? WHERE id IN ($ph)")->execute(array_merge([$in[$f] ? 1 : 0], $ids));
        }
      }
      mm_json(['ok' => true]);
    case 'messages.delete':
      mm_need_post($post);
      $ids = array_map('intval', (array)(mm_input()['ids'] ?? []));
      if ($ids) {
        $db->prepare('DELETE FROM msg WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')')->execute($ids);
        mm_audit('messages.delete', count($ids) . ' μηνύματα');
      }
      mm_json(['ok' => true]);
    case 'messages.export': mm_export_messages();

    case 'content.get':
      $f = mm_data_dir() . '/content.json';
      mm_json(['content' => mm_content(), 'updated' => is_file($f) ? filemtime($f) : 0, 'icons' => mm_icons()]);
    case 'content.save':
      mm_need_post($post);
      $in = mm_input();
      if (!is_array($in['content'] ?? null)) mm_json(['error' => 'Λείπει το περιεχόμενο.'], 422);
      $note = mb_substr(trim((string)($in['note'] ?? 'Αποθήκευση από τη Διαχείριση')), 0, 120);
      $c = mm_save_content($in['content'], $note);
      mm_audit('content.save', $note);
      mm_json(['ok' => true, 'content' => $c]);
    case 'content.patch':
      mm_need_post($post);
      $in = mm_input();
      $path = (string)($in['path'] ?? '');
      if (!preg_match('/^[a-z_]+(\.[a-z0-9_]+)+$/', $path)) mm_json(['error' => 'Μη έγκυρο πεδίο.'], 422);
      $doc = mm_content();
      $ref = &$doc;
      foreach (explode('.', $path) as $seg) {
        $k = ctype_digit($seg) ? (int)$seg : $seg;
        if (!is_array($ref) || !array_key_exists($k, $ref)) mm_json(['error' => 'Το πεδίο δεν υπάρχει.'], 422);
        $ref = &$ref[$k];
      }
      if (is_array($ref)) mm_json(['error' => 'Το πεδίο δεν επεξεργάζεται έτσι.'], 422);
      $ref = $in['value'] ?? '';
      unset($ref);
      $c = mm_save_content($doc, 'Στη σελίδα: ' . $path);
      mm_audit('content.patch', $path);
      $val = $c;
      foreach (explode('.', $path) as $seg) $val = $val[ctype_digit($seg) ? (int)$seg : $seg];
      mm_json(['ok' => true, 'value' => $val]);
    case 'history.list': mm_json(['items' => mm_history_list()]);
    case 'history.get':
      $c = mm_history_get((string)($_GET['id'] ?? ''));
      if (!$c) mm_json(['error' => 'Η έκδοση δεν βρέθηκε.'], 404);
      mm_json(['content' => $c]);
    case 'history.restore':
      mm_need_post($post);
      $id = (string)(mm_input()['id'] ?? '');
      $c = mm_history_get($id);
      if (!$c) mm_json(['error' => 'Η έκδοση δεν βρέθηκε.'], 404);
      mm_save_content($c, 'Επαναφορά έκδοσης ' . $id);
      mm_audit('history.restore', $id);
      mm_json(['ok' => true]);

    case 'media.list': mm_json(['items' => mm_media_list()]);
    case 'media.upload':
      mm_need_post($post);
      if (empty($_FILES['file'])) mm_json(['error' => 'Δεν στάλθηκε αρχείο (ίσως είναι πολύ μεγάλο για τον server).'], 422);
      $item = mm_media_upload($_FILES['file']);
      mm_audit('media.upload', $item['path']);
      mm_json(['ok' => true, 'item' => $item]);
    case 'media.delete':
      mm_need_post($post);
      $in = mm_input();
      $p = (string)($in['path'] ?? '');
      if (!str_starts_with($p, 'uploads/') || !mm_valid_image_path($p)) mm_json(['error' => 'Μόνο ανεβασμένες εικόνες διαγράφονται.'], 422);
      $used = mm_image_usage(mm_content())[$p] ?? [];
      if ($used && empty($in['force'])) mm_json(['error' => 'Η εικόνα χρησιμοποιείται στη σελίδα.', 'used' => $used], 409);
      @unlink(MM_ROOT . '/' . $p);
      mm_audit('media.delete', $p);
      mm_json(['ok' => true]);

    case 'settings.get': mm_json(mm_settings_payload());
    case 'settings.save':
      mm_need_post($post);
      $s = mm_save_settings((array)(mm_input()['settings'] ?? []));
      mm_audit('settings.save', $s['maintenance'] ? 'Συντήρηση: ΕΝΕΡΓΗ' : '');
      mm_json(['ok' => true, 'settings' => $s]);
    case 'account.password':
      mm_need_post($post);
      $in = mm_input();
      $auth = mm_auth();
      if (!password_verify((string)($in['current'] ?? ''), $auth['hash'])) mm_json(['error' => 'Ο τρέχων κωδικός δεν είναι σωστός.'], 422);
      $new = (string)($in['new'] ?? '');
      if (mb_strlen($new) < 10) mm_json(['error' => 'Ο νέος κωδικός θέλει τουλάχιστον 10 χαρακτήρες.'], 422);
      $auth['hash'] = password_hash($new, PASSWORD_DEFAULT);
      $auth['pw_changed'] = time();
      mm_auth_save($auth);
      mm_login_complete($auth, !empty($_SESSION['remember']));
      mm_audit('account.password');
      mm_json(['ok' => true, 'csrf' => $_SESSION['csrf']]);
    case '2fa.begin':
      mm_need_post($post);
      $secret = mm_b32_encode(random_bytes(20));
      $_SESSION['totp_pending'] = $secret;
      $label = rawurlencode('M&M Διαχείριση:' . $u['user']);
      mm_json(['secret' => $secret, 'uri' => "otpauth://totp/$label?secret=$secret&issuer=" . rawurlencode('M&M Τεχνικά Έργα') . '&digits=6&period=30']);
    case '2fa.enable':
      mm_need_post($post);
      $secret = (string)($_SESSION['totp_pending'] ?? '');
      if ($secret === '' || !mm_totp_verify($secret, (string)(mm_input()['code'] ?? ''))) mm_json(['error' => 'Ο κωδικός δεν είναι σωστός. Δοκιμάστε τον επόμενο.'], 422);
      $auth = mm_auth();
      $auth['totp'] = $secret;
      mm_auth_save($auth);
      unset($_SESSION['totp_pending']);
      mm_audit('2fa.enable');
      mm_json(['ok' => true]);
    case '2fa.disable':
      mm_need_post($post);
      $auth = mm_auth();
      if (!password_verify((string)(mm_input()['password'] ?? ''), $auth['hash'])) mm_json(['error' => 'Λάθος κωδικός.'], 422);
      $auth['totp'] = '';
      mm_auth_save($auth);
      mm_audit('2fa.disable');
      mm_json(['ok' => true]);
    case 'audit.list':
      mm_json(['items' => $db->query('SELECT ts, action, detail, ip FROM audit ORDER BY id DESC LIMIT 200')->fetchAll()]);
    case 'analytics.clear':
      mm_need_post($post);
      if ((string)(mm_input()['confirm'] ?? '') !== 'ΔΙΑΓΡΑΦΗ') mm_json(['error' => 'Γράψτε ΔΙΑΓΡΑΦΗ για επιβεβαίωση.'], 422);
      foreach (['ev', 'pv', 'geo'] as $t) $db->exec("DELETE FROM $t");
      $db->exec('VACUUM');
      mm_audit('analytics.clear');
      mm_json(['ok' => true]);
    case 'mail.test':
      mm_need_post($post);
      $S = mm_settings();
      $to = $S['notify_email'] !== '' ? $S['notify_email'] : mm_content()['company']['email'];
      $host = preg_replace('/^www\./', '', preg_replace('/[^a-z0-9.\-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost')) ?? '');
      $ok = filter_var($to, FILTER_VALIDATE_EMAIL) && @mail($to, mb_encode_mimeheader('Δοκιμαστικό email — M&M Διαχείριση', 'UTF-8'),
        "Αν διαβάζετε αυτό το μήνυμα, οι ειδοποιήσεις της φόρμας επικοινωνίας λειτουργούν σωστά.\n\n" . mm_base_url() . "/admin/",
        "From: no-reply@$host\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8");
      mm_json(['ok' => (bool)$ok, 'to' => $to]);
    case 'backup': mm_backup();
  }
  mm_json(['error' => 'Άγνωστη ενέργεια.'], 404);
}

/* =========================================================
   Σύνδεση
   ========================================================= */
function mm_setup(): void {
  if (mm_auth() !== null) mm_json(['error' => 'Ο λογαριασμός έχει ήδη δημιουργηθεί.'], 403);
  $in = mm_input();
  $user = trim((string)($in['user'] ?? ''));
  $pass = (string)($in['pass'] ?? '');
  if (!preg_match('/^[\p{L}0-9._\-@]{3,40}$/u', $user)) mm_json(['error' => 'Όνομα χρήστη: 3-40 χαρακτήρες, χωρίς κενά.'], 422);
  if (mb_strlen($pass) < 10) mm_json(['error' => 'Ο κωδικός θέλει τουλάχιστον 10 χαρακτήρες.'], 422);
  $auth = ['user' => $user, 'hash' => password_hash($pass, PASSWORD_DEFAULT), 'totp' => '', 'created' => time(), 'pw_changed' => time()];
  if (!mm_auth_save($auth)) mm_json(['error' => 'Δεν ήταν δυνατή η αποθήκευση. Ελέγξτε τα δικαιώματα του φακέλου δεδομένων.'], 500);
  mm_db();
  mm_login_complete($auth, false);
  mm_audit('setup', $user);
  mm_json(['ok' => true]);
}

function mm_login_throttle(): void {
  $ipKey = 'login:' . substr(mm_hash(mm_ip() . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 24);
  if (mm_rate_count($ipKey, 900) >= 6) mm_json(['error' => 'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε 15 λεπτά.'], 429);
  if (mm_rate_count('login:*', 900) >= 40) mm_json(['error' => 'Η σύνδεση είναι προσωρινά κλειδωμένη για λόγους ασφαλείας. Δοκιμάστε σε λίγα λεπτά.'], 429);
}
function mm_login_fail(string $msg): void {
  mm_rate_hit('login:' . substr(mm_hash(mm_ip() . '|' . ($_SERVER['REMOTE_ADDR'] ?? '')), 0, 24));
  mm_rate_hit('login:*');
  mm_audit('login.fail');
  usleep(random_int(300000, 700000));
  mm_json(['error' => $msg], 401);
}

function mm_login(): void {
  mm_login_throttle();
  $auth = mm_auth();
  if (!$auth) mm_json(['error' => 'Δεν έχει δημιουργηθεί λογαριασμός ακόμα.', 'setup' => true], 409);
  $in = mm_input();
  $user = trim((string)($in['user'] ?? ''));
  $pass = (string)($in['pass'] ?? '');
  $okUser = hash_equals(mb_strtolower($auth['user']), mb_strtolower($user));
  if (!password_verify($pass, $auth['hash']) || !$okUser) mm_login_fail('Λάθος όνομα χρήστη ή κωδικός.');
  if (password_needs_rehash($auth['hash'], PASSWORD_DEFAULT)) { $auth['hash'] = password_hash($pass, PASSWORD_DEFAULT); mm_auth_save($auth); }
  $remember = !empty($in['remember']);
  if (!empty($auth['totp'])) {
    mm_session_start(true);
    $_SESSION['pending'] = ['ts' => time(), 'remember' => $remember];
    mm_json(['ok' => true, 'need2fa' => true]);
  }
  mm_login_complete($auth, $remember);
  mm_audit('login');
  mm_json(['ok' => true]);
}

function mm_login2fa(): void {
  mm_login_throttle();
  mm_session_start(true);
  $p = $_SESSION['pending'] ?? null;
  $auth = mm_auth();
  if (!$p || time() - (int)$p['ts'] > 300 || !$auth || empty($auth['totp'])) mm_json(['error' => 'Η σύνδεση έληξε. Ξεκινήστε από την αρχή.', 'restart' => true], 401);
  if (!mm_totp_verify($auth['totp'], (string)(mm_input()['code'] ?? ''))) mm_login_fail('Ο κωδικός 2FA δεν είναι σωστός.');
  mm_login_complete($auth, !empty($p['remember']));
  mm_audit('login', '2FA');
  mm_json(['ok' => true]);
}

/* =========================================================
   Στατιστικά
   ========================================================= */
function mm_range(): array {
  $r = (string)($_GET['range'] ?? '30d');
  $now = time();
  $today = strtotime('today');
  $span = null;
  switch ($r) {
    case 'today': $from = $today; $to = $now; $span = 86400; break;
    case 'yesterday': $from = strtotime('yesterday'); $to = $today; break;
    case '7d': $from = strtotime('-6 days', $today); $to = $now; break;
    case '90d': $from = strtotime('-89 days', $today); $to = $now; break;
    case '12m': $from = strtotime('first day of -11 months', $today); $to = $now; break;
    case 'custom':
      $f = strtotime((string)($_GET['from'] ?? ''));
      $t = strtotime((string)($_GET['to'] ?? ''));
      if ($f && $t && $t >= $f) { $from = $f; $to = min($now, strtotime('+1 day', $t)); break; }
      // αλλιώς πέφτει στις 30 μέρες
    default: $r = '30d'; $from = strtotime('-29 days', $today); $to = $now;
  }
  $span = $span ?? max(3600, $to - $from);
  $len = $to - $from;
  $gran = $len <= 2 * 86400 ? 'hour' : ($len <= 100 * 86400 ? 'day' : 'month');
  return ['key' => $r, 'from' => $from, 'to' => $to, 'pfrom' => $from - $span, 'pto' => $to - $span, 'gran' => $gran];
}

function mm_bucket_key(int $ts, string $gran): string {
  return $gran === 'hour' ? date('Y-m-d H', $ts) : ($gran === 'day' ? date('Y-m-d', $ts) : date('Y-m', $ts));
}

function mm_buckets(array $R): array {
  $out = [];
  $months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
  if ($R['gran'] === 'hour') {
    for ($t = strtotime(date('Y-m-d H:00:00', $R['from'])); $t < $R['to']; $t += 3600) $out[mm_bucket_key($t, 'hour')] = date('H:00', $t);
  } elseif ($R['gran'] === 'day') {
    for ($t = $R['from']; $t < $R['to']; $t = strtotime('+1 day', $t)) $out[mm_bucket_key($t, 'day')] = date('j/n', $t);
  } else {
    for ($t = strtotime(date('Y-m-01', $R['from'])); $t < $R['to']; $t = strtotime('+1 month', $t)) $out[mm_bucket_key($t, 'month')] = $months[(int)date('n', $t) - 1] . ' ' . date('y', $t);
  }
  return $out;
}

function mm_kpis(int $from, int $to): array {
  $db = mm_db();
  $q = $db->prepare('SELECT COUNT(*) AS pv, COUNT(DISTINCT vid) AS visitors, COUNT(DISTINCT sid) AS sessions,
      COALESCE(AVG(dur), 0) AS dur, COALESCE(AVG(scroll), 0) AS scroll,
      COALESCE(SUM(CASE WHEN dur < 10 AND events = 0 AND scroll < 25 THEN 1 ELSE 0 END), 0) AS bounces
      FROM pv WHERE ts >= ? AND ts < ?');
  $q->execute([$from, $to]);
  $k = $q->fetch();
  $q = $db->prepare("SELECT COUNT(*) FROM ev WHERE ts >= ? AND ts < ? AND name IN ('phone','email','form')");
  $q->execute([$from, $to]);
  $contacts = (int)$q->fetchColumn();
  $q = $db->prepare('SELECT COUNT(*) FROM msg WHERE ts >= ? AND ts < ?');
  $q->execute([$from, $to]);
  $pv = (int)$k['pv'];
  return [
    'visitors' => (int)$k['visitors'], 'sessions' => (int)$k['sessions'], 'pageviews' => $pv,
    'duration' => round((float)$k['dur']), 'scroll' => round((float)$k['scroll']),
    'bounce' => $pv ? round((int)$k['bounces'] / $pv * 100, 1) : 0, 'contacts' => $contacts, 'messages' => (int)$q->fetchColumn(),
  ];
}

function mm_top(string $sql, array $args): array {
  $q = mm_db()->prepare($sql);
  $q->execute($args);
  return $q->fetchAll();
}

function mm_live_count(): int {
  $q = mm_db()->prepare('SELECT COUNT(DISTINCT vid) FROM pv WHERE last_ts >= ?');
  $q->execute([time() - 45]);
  return (int)$q->fetchColumn();
}

function mm_badge(): array {
  return ['live' => mm_live_count(), 'unread' => (int)mm_db()->query('SELECT COUNT(*) FROM msg WHERE is_read = 0 AND archived = 0')->fetchColumn()];
}

function mm_overview(): array {
  $R = mm_range();
  $db = mm_db();
  $a = [$R['from'], $R['to']];
  $W = 'ts >= ? AND ts < ?';

  // χρονοσειρά
  $buckets = mm_buckets($R);
  $series = [];
  foreach ($buckets as $k => $label) $series[$k] = ['label' => $label, 'visitors' => [], 'pageviews' => 0, 'dur' => 0, 'scroll' => 0, 'bounces' => 0, 'contacts' => 0];
  $heat = array_fill(0, 7, array_fill(0, 24, 0));
  $q = $db->prepare("SELECT ts, vid, dur, scroll, events FROM pv WHERE $W");
  $q->execute($a);
  foreach ($q as $r) {
    $k = mm_bucket_key((int)$r['ts'], $R['gran']);
    if (isset($series[$k])) {
      $series[$k]['visitors'][$r['vid']] = 1;
      $series[$k]['pageviews']++;
      $series[$k]['dur'] += (int)$r['dur'];
      $series[$k]['scroll'] += (int)$r['scroll'];
      if ((int)$r['dur'] < 10 && (int)$r['events'] === 0 && (int)$r['scroll'] < 25) $series[$k]['bounces']++;
    }
    $heat[(int)date('N', (int)$r['ts']) - 1][(int)date('G', (int)$r['ts'])]++;
  }
  $q = $db->prepare("SELECT ts FROM ev WHERE $W AND name IN ('phone','email','form')");
  $q->execute($a);
  foreach ($q as $r) { $k = mm_bucket_key((int)$r['ts'], $R['gran']); if (isset($series[$k])) $series[$k]['contacts']++; }
  $ts = [];
  foreach ($series as $k => $s) {
    $n = $s['pageviews'];
    $ts[] = ['key' => $k, 'label' => $s['label'], 'visitors' => count($s['visitors']), 'pageviews' => $n,
      'duration' => $n ? round($s['dur'] / $n) : 0, 'scroll' => $n ? round($s['scroll'] / $n) : 0,
      'bounce' => $n ? round($s['bounces'] / $n * 100, 1) : 0, 'contacts' => $s['contacts']];
  }

  // ενότητες που είδαν οι επισκέπτες
  $parts = [];
  foreach (MM_SECTIONS as $s) $parts[] = "SUM(CASE WHEN sections LIKE '%,$s,%' THEN 1 ELSE 0 END) AS $s";
  $q = $db->prepare('SELECT COUNT(*) AS total, ' . implode(', ', $parts) . " FROM pv WHERE $W");
  $q->execute($a);
  $sec = $q->fetch();

  $msgs = $db->query('SELECT id, ts, name, email, substr(message, 1, 140) AS excerpt, is_read FROM msg WHERE archived = 0 ORDER BY ts DESC LIMIT 5')->fetchAll();

  return [
    'range' => $R,
    'kpis' => mm_kpis($R['from'], $R['to']),
    'prev' => mm_kpis($R['pfrom'], $R['pto']),
    'series' => $ts,
    'countries' => mm_top("SELECT cc, MAX(country) AS country, COUNT(DISTINCT vid) AS n FROM pv WHERE $W AND cc <> '' GROUP BY cc ORDER BY n DESC LIMIT 12", $a),
    'cities' => mm_top("SELECT city, cc, COUNT(DISTINCT vid) AS n FROM pv WHERE $W AND city <> '' GROUP BY city, cc ORDER BY n DESC LIMIT 12", $a),
    'points' => mm_top("SELECT ROUND(lat, 1) AS lat, ROUND(lon, 1) AS lon, MAX(city) AS city, MAX(cc) AS cc, COUNT(DISTINCT vid) AS n FROM pv WHERE $W AND lat IS NOT NULL GROUP BY ROUND(lat, 1), ROUND(lon, 1) ORDER BY n DESC LIMIT 400", $a),
    'sources' => mm_top("SELECT source AS k, MAX(medium) AS medium, COUNT(DISTINCT vid) AS n FROM pv WHERE $W GROUP BY source ORDER BY n DESC LIMIT 10", $a),
    'referrers' => mm_top("SELECT ref_host AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE $W AND ref_host <> '' GROUP BY ref_host ORDER BY n DESC LIMIT 10", $a),
    'campaigns' => mm_top("SELECT utm_campaign AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE $W AND utm_campaign <> '' GROUP BY utm_campaign ORDER BY n DESC LIMIT 10", $a),
    'devices' => mm_top("SELECT device AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE $W GROUP BY device ORDER BY n DESC", $a),
    'browsers' => mm_top("SELECT browser AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE $W GROUP BY browser ORDER BY n DESC LIMIT 8", $a),
    'os' => mm_top("SELECT os AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE $W GROUP BY os ORDER BY n DESC LIMIT 8", $a),
    'languages' => mm_top("SELECT lower(substr(lang, 1, 2)) AS k, COUNT(DISTINCT vid) AS n FROM pv WHERE $W AND lang <> '' GROUP BY lower(substr(lang, 1, 2)) ORDER BY n DESC LIMIT 8", $a),
    'sections' => $sec,
    'events' => mm_top("SELECT name, label, COUNT(*) AS n FROM ev WHERE $W GROUP BY name, label ORDER BY n DESC LIMIT 60", $a),
    'heat' => $heat,
    'messages' => $msgs,
    'live' => mm_live_count(),
  ];
}

function mm_live(): array {
  $db = mm_db();
  $now = time();
  $q = $db->prepare('SELECT pid, vid, ts, last_ts, cc, country, city, lat, lon, device, browser, os, source, ref_host, section, sections, scroll, dur, events
      FROM pv WHERE last_ts >= ? ORDER BY ts DESC LIMIT 80');
  $q->execute([$now - 45]);
  $active = $q->fetchAll();

  $minutes = array_fill(0, 30, []);
  $q = $db->prepare('SELECT ts, last_ts, vid FROM pv WHERE last_ts >= ?');
  $q->execute([$now - 1800]);
  foreach ($q as $r) {
    for ($m = 0; $m < 30; $m++) {
      $end = $now - (29 - $m) * 60; $start = $end - 60;
      if ((int)$r['ts'] <= $end && (int)$r['last_ts'] >= $start) $minutes[$m][$r['vid']] = 1;
    }
  }
  $q = $db->prepare('SELECT ev.ts, ev.name, ev.label, pv.city, pv.cc, pv.device FROM ev JOIN pv ON pv.pid = ev.pid WHERE ev.ts >= ? ORDER BY ev.ts DESC LIMIT 30');
  $q->execute([$now - 3 * 3600]);
  $feed = $q->fetchAll();
  $q = $db->prepare("SELECT ts, 'arrive' AS name, source AS label, city, cc, device FROM pv WHERE ts >= ? ORDER BY ts DESC LIMIT 30");
  $q->execute([$now - 3 * 3600]);
  $feed = array_merge($feed, $q->fetchAll());
  usort($feed, fn($x, $y) => (int)$y['ts'] <=> (int)$x['ts']);

  $today = strtotime('today');
  $q = $db->prepare('SELECT COUNT(DISTINCT vid) AS v, COUNT(*) AS p FROM pv WHERE ts >= ?');
  $q->execute([$today]);
  $t = $q->fetch();
  $uniq = [];
  foreach ($active as $r) $uniq[$r['vid']] = 1;
  return ['now' => $now, 'count' => count($uniq), 'active' => $active, 'minutes' => array_map('count', $minutes),
    'feed' => array_slice($feed, 0, 40), 'today' => ['visitors' => (int)$t['v'], 'pageviews' => (int)$t['p']], 'unread' => mm_badge()['unread']];
}

function mm_visits_where(array $R): array {
  $w = ['ts >= ?', 'ts < ?'];
  $a = [$R['from'], $R['to']];
  $qs = trim((string)($_GET['q'] ?? ''));
  if ($qs !== '') {
    $w[] = '(city LIKE ? OR country LIKE ? OR ref_host LIKE ? OR source LIKE ? OR browser LIKE ? OR os LIKE ? OR utm_campaign LIKE ?)';
    $like = '%' . $qs . '%';
    array_push($a, $like, $like, $like, $like, $like, $like, $like);
  }
  if (in_array($_GET['device'] ?? '', ['desktop', 'mobile', 'tablet'], true)) { $w[] = 'device = ?'; $a[] = $_GET['device']; }
  if (!empty($_GET['source'])) { $w[] = 'source = ?'; $a[] = (string)$_GET['source']; }
  if (!empty($_GET['cc']) && preg_match('/^[A-Z]{2}$/', (string)$_GET['cc'])) { $w[] = 'cc = ?'; $a[] = $_GET['cc']; }
  if (!empty($_GET['engaged'])) $w[] = '(dur >= 30 OR events > 0)';
  return [implode(' AND ', $w), $a];
}

function mm_visits(): array {
  $R = mm_range();
  [$w, $a] = mm_visits_where($R);
  $db = mm_db();
  $page = max(1, (int)($_GET['page'] ?? 1));
  $per = 25;
  $q = $db->prepare("SELECT COUNT(*) FROM pv WHERE $w");
  $q->execute($a);
  $total = (int)$q->fetchColumn();
  $q = $db->prepare("SELECT pid, sid, ts, last_ts, path, ref_host, source, medium, utm_campaign, cc, country, city, browser, os, device, lang, sw, sh, dur, scroll, sections, events
      FROM pv WHERE $w ORDER BY ts DESC LIMIT $per OFFSET " . (($page - 1) * $per));
  $q->execute($a);
  return [
    'total' => $total, 'page' => $page, 'pages' => max(1, (int)ceil($total / $per)), 'rows' => $q->fetchAll(),
    'sources' => mm_top('SELECT source AS k, COUNT(*) AS n FROM pv WHERE ts >= ? AND ts < ? GROUP BY source ORDER BY n DESC LIMIT 20', [$R['from'], $R['to']]),
    'countries' => mm_top("SELECT cc AS k, MAX(country) AS country, COUNT(*) AS n FROM pv WHERE ts >= ? AND ts < ? AND cc <> '' GROUP BY cc ORDER BY n DESC LIMIT 40", [$R['from'], $R['to']]),
  ];
}

function mm_visit(string $pid): array {
  $db = mm_db();
  $q = $db->prepare('SELECT * FROM pv WHERE pid = ?');
  $q->execute([$pid]);
  $v = $q->fetch();
  if (!$v) mm_json(['error' => 'Η επίσκεψη δεν βρέθηκε.'], 404);
  unset($v['vid']);
  $q = $db->prepare('SELECT ts, name, label FROM ev WHERE pid = ? ORDER BY ts');
  $q->execute([$pid]);
  $events = $q->fetchAll();
  $q = $db->prepare('SELECT pid, ts, dur, path FROM pv WHERE sid = ? AND pid <> ? ORDER BY ts');
  $q->execute([$v['sid'], $pid]);
  return ['visit' => $v, 'events' => $events, 'session' => $q->fetchAll()];
}

function mm_csv_out(string $name, array $head, iterable $rows): void {
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $name . '"');
  header('Cache-Control: no-store');
  $out = fopen('php://output', 'w');
  fwrite($out, "\xEF\xBB\xBF");
  fputcsv($out, $head, ';', '"', '\\');
  foreach ($rows as $r) fputcsv($out, $r, ';', '"', '\\');
  fclose($out);
  exit;
}

function mm_export_visits(): void {
  $R = mm_range();
  [$w, $a] = mm_visits_where($R);
  $q = mm_db()->prepare("SELECT * FROM pv WHERE $w ORDER BY ts DESC LIMIT 50000");
  $q->execute($a);
  $gen = (function () use ($q) {
    foreach ($q as $r) yield [date('d/m/Y', (int)$r['ts']), date('H:i:s', (int)$r['ts']), $r['country'], $r['city'], $r['source'], $r['ref_host'],
      $r['utm_campaign'], $r['device'], $r['browser'], $r['os'], $r['lang'], $r['sw'] . '×' . $r['sh'], $r['dur'], $r['scroll'], trim((string)$r['sections'], ','), $r['events']];
  })();
  mm_audit('export.visits');
  mm_csv_out('episkepseis-' . date('Ymd') . '.csv', ['Ημερομηνία', 'Ώρα', 'Χώρα', 'Πόλη', 'Πηγή', 'Referrer', 'Καμπάνια', 'Συσκευή', 'Browser', 'Σύστημα', 'Γλώσσα', 'Οθόνη', 'Ενεργός χρόνος (δ)', 'Scroll %', 'Ενότητες', 'Ενέργειες'], $gen);
}

/* =========================================================
   Μηνύματα
   ========================================================= */
function mm_messages_where(): array {
  $f = (string)($_GET['filter'] ?? 'inbox');
  $w = match ($f) {
    'unread' => 'is_read = 0 AND archived = 0',
    'starred' => 'starred = 1',
    'archived' => 'archived = 1',
    'all' => '1 = 1',
    default => 'archived = 0',
  };
  $a = [];
  $qs = trim((string)($_GET['q'] ?? ''));
  if ($qs !== '') {
    $w .= ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ?)';
    $like = '%' . $qs . '%';
    $a = [$like, $like, $like, $like];
  }
  return [$w, $a];
}

function mm_messages_list(): array {
  [$w, $a] = mm_messages_where();
  $db = mm_db();
  $q = $db->prepare("SELECT id, ts, name, email, phone, substr(message, 1, 160) AS excerpt, cc, city, is_read, starred, archived FROM msg WHERE $w ORDER BY ts DESC LIMIT 300");
  $q->execute($a);
  $c = $db->query('SELECT SUM(archived = 0) AS inbox, SUM(is_read = 0 AND archived = 0) AS unread, SUM(starred = 1) AS starred, SUM(archived = 1) AS archived, COUNT(*) AS all_ FROM msg')->fetch();
  return ['rows' => $q->fetchAll(), 'counts' => array_map('intval', $c ?: [])];
}

function mm_export_messages(): void {
  [$w, $a] = mm_messages_where();
  $q = mm_db()->prepare("SELECT * FROM msg WHERE $w ORDER BY ts DESC");
  $q->execute($a);
  $gen = (function () use ($q) {
    foreach ($q as $r) yield [date('d/m/Y H:i', (int)$r['ts']), $r['name'], $r['email'], $r['phone'], $r['message'], $r['city']];
  })();
  mm_audit('export.messages');
  mm_csv_out('minimata-' . date('Ymd') . '.csv', ['Ημερομηνία', 'Όνομα', 'Email', 'Τηλέφωνο', 'Μήνυμα', 'Περιοχή'], $gen);
}

/* =========================================================
   Πολυμέσα
   ========================================================= */
function mm_slug(string $s): string {
  $map = ['α' => 'a', 'ά' => 'a', 'β' => 'v', 'γ' => 'g', 'δ' => 'd', 'ε' => 'e', 'έ' => 'e', 'ζ' => 'z', 'η' => 'i', 'ή' => 'i', 'θ' => 'th',
    'ι' => 'i', 'ί' => 'i', 'ϊ' => 'i', 'ΐ' => 'i', 'κ' => 'k', 'λ' => 'l', 'μ' => 'm', 'ν' => 'n', 'ξ' => 'x', 'ο' => 'o', 'ό' => 'o',
    'π' => 'p', 'ρ' => 'r', 'σ' => 's', 'ς' => 's', 'τ' => 't', 'υ' => 'y', 'ύ' => 'y', 'ϋ' => 'y', 'ΰ' => 'y', 'φ' => 'f', 'χ' => 'ch',
    'ψ' => 'ps', 'ω' => 'o', 'ώ' => 'o'];
  $s = strtr(mb_strtolower($s), $map);
  $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
  return substr(trim($s, '-'), 0, 50);
}

function mm_media_item(string $rel, array $usage): array {
  $abs = MM_ROOT . '/' . $rel;
  $info = @getimagesize($abs);
  return ['path' => $rel, 'w' => $info[0] ?? 0, 'h' => $info[1] ?? 0, 'size' => (int)@filesize($abs), 'mtime' => (int)@filemtime($abs),
    'builtin' => str_starts_with($rel, 'assets/'), 'used' => $usage[$rel] ?? []];
}

function mm_media_list(): array {
  $usage = mm_image_usage(mm_content());
  $items = [];
  $up = MM_ROOT . '/uploads';
  if (is_dir($up)) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($up, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
      $rel = 'uploads/' . str_replace('\\', '/', substr($f->getPathname(), strlen($up) + 1));
      if (mm_valid_image_path($rel)) $items[] = mm_media_item($rel, $usage);
    }
  }
  foreach (glob(MM_ROOT . '/assets/images/*') ?: [] as $f) {
    $rel = 'assets/images/' . basename($f);
    if (mm_valid_image_path($rel)) $items[] = mm_media_item($rel, $usage);
  }
  usort($items, fn($a, $b) => [$a['builtin'], -$a['mtime']] <=> [$b['builtin'], -$b['mtime']]);
  return $items;
}

function mm_media_upload(array $f): array {
  $errors = [UPLOAD_ERR_INI_SIZE => 'Το αρχείο ξεπερνά το όριο του server.', UPLOAD_ERR_FORM_SIZE => 'Το αρχείο είναι πολύ μεγάλο.',
    UPLOAD_ERR_PARTIAL => 'Το ανέβασμα διακόπηκε.', UPLOAD_ERR_NO_FILE => 'Δεν επιλέχθηκε αρχείο.'];
  if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException($errors[$f['error']] ?? 'Σφάλμα στο ανέβασμα.');
  if ($f['size'] > 25 * 1024 * 1024) throw new RuntimeException('Μέγιστο μέγεθος 25MB.');
  $info = @getimagesize($f['tmp_name']);
  $mime = $info['mime'] ?? '';
  if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) throw new RuntimeException('Επιτρέπονται μόνο εικόνες JPG, PNG, WebP ή GIF.');

  $sub = date('Y/m');
  $dir = MM_ROOT . '/uploads/' . $sub;
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new RuntimeException('Δεν δημιουργήθηκε ο φάκελος uploads (δικαιώματα).');
  $base = (mm_slug(pathinfo((string)$f['name'], PATHINFO_FILENAME)) ?: 'eikona') . '-' . bin2hex(random_bytes(3));

  $gd = function_exists('imagecreatefromstring') && function_exists('imagejpeg');
  if (!$gd) {
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime];
    if (!move_uploaded_file($f['tmp_name'], "$dir/$base.$ext")) throw new RuntimeException('Δεν αποθηκεύτηκε το αρχείο.');
    return mm_media_item("uploads/$sub/$base.$ext", []);
  }

  $src = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
  if (!$src) throw new RuntimeException('Η εικόνα δεν μπόρεσε να διαβαστεί.');
  if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
    $o = (int)(@exif_read_data($f['tmp_name'])['Orientation'] ?? 1);
    $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
    if ($rot) { $r = imagerotate($src, $rot, 0); if ($r) { imagedestroy($src); $src = $r; } }
  }
  $w = imagesx($src); $h = imagesy($src);
  $max = 2200;
  $scale = min(1, $max / max($w, $h));
  $nw = (int)round($w * $scale); $nh = (int)round($h * $scale);
  // PNG με διαφάνεια (color type 4 ή 6 στο byte 25 της κεφαλίδας) μένει PNG, όλα τα άλλα γίνονται JPG
  $colorType = (string)file_get_contents($f['tmp_name'], false, null, 25, 1);
  $alpha = $mime === 'image/png' && $colorType !== '' && in_array(ord($colorType), [4, 6], true);
  $dst = imagecreatetruecolor($nw, $nh);
  if ($alpha) { imagealphablending($dst, false); imagesavealpha($dst, true); }
  else imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255));
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
  if ($alpha) { $rel = "uploads/$sub/$base.png"; imagepng($dst, MM_ROOT . '/' . $rel, 7); }
  else { imageinterlace($dst, true); $rel = "uploads/$sub/$base.jpg"; imagejpeg($dst, MM_ROOT . '/' . $rel, 84); }
  imagedestroy($src); imagedestroy($dst);
  return mm_media_item($rel, []);
}

/* =========================================================
   Ρυθμίσεις / σύστημα / αντίγραφο ασφαλείας
   ========================================================= */
function mm_dir_size(string $dir): array {
  $size = 0; $n = 0;
  if (is_dir($dir)) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)) as $f) { $size += $f->getSize(); $n++; }
  }
  return [$size, $n];
}

function mm_settings_payload(): array {
  $auth = mm_auth();
  $db = mm_db();
  [$upSize, $upN] = mm_dir_size(MM_ROOT . '/uploads');
  $dbFile = mm_data_dir() . '/' . mm_config()['db'];
  return [
    'settings' => mm_settings(),
    'account' => ['user' => $auth['user'], 'totp' => !empty($auth['totp']), 'created' => $auth['created'] ?? 0, 'pw_changed' => $auth['pw_changed'] ?? 0],
    'company_email' => mm_content()['company']['email'],
    'system' => [
      'php' => PHP_VERSION,
      'sqlite' => (string)$db->query('SELECT sqlite_version()')->fetchColumn(),
      'gd' => function_exists('imagecreatefromstring'),
      'curl' => function_exists('curl_init'),
      'zip' => class_exists('ZipArchive'),
      'mail' => function_exists('mail'),
      'upload_max' => ini_get('upload_max_filesize'),
      'data_outside' => !str_starts_with(realpath(mm_data_dir()) ?: '', realpath(MM_ROOT) ?: '///'),
      'db_size' => (int)@filesize($dbFile),
      'uploads_size' => $upSize, 'uploads_count' => $upN,
      'pv_count' => (int)$db->query('SELECT COUNT(*) FROM pv')->fetchColumn(),
      'first_pv' => (int)$db->query('SELECT COALESCE(MIN(ts), 0) FROM pv')->fetchColumn(),
      'msg_count' => (int)$db->query('SELECT COUNT(*) FROM msg')->fetchColumn(),
    ],
  ];
}

function mm_backup(): void {
  mm_audit('backup');
  $stamp = date('Ymd-His');
  $dataDir = mm_data_dir();
  if (!class_exists('ZipArchive')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="mm-periexomeno-' . $stamp . '.json"');
    echo json_encode(['content' => mm_content(), 'settings' => mm_settings()], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
  }
  $tmp = $dataDir . '/backup-' . bin2hex(random_bytes(4)) . '.zip';
  $zip = new ZipArchive();
  if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) throw new RuntimeException('Δεν δημιουργήθηκε το αρχείο αντιγράφου.');
  foreach (['content.json', 'settings.json'] as $f) if (is_file("$dataDir/$f")) $zip->addFile("$dataDir/$f", "data/$f");
  $dbFile = $dataDir . '/' . mm_config()['db'];
  if (is_file($dbFile)) $zip->addFile($dbFile, 'data/statistika-minimata.sqlite');
  foreach (glob(mm_history_dir() . '/*.json') ?: [] as $f) $zip->addFile($f, 'data/history/' . basename($f));
  $up = MM_ROOT . '/uploads';
  if (is_dir($up)) {
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($up, FilesystemIterator::SKIP_DOTS)) as $f) {
      $rel = str_replace('\\', '/', substr($f->getPathname(), strlen($up) + 1));
      if ($rel !== '.htaccess') $zip->addFile($f->getPathname(), 'uploads/' . $rel);
    }
  }
  $zip->addFromString('ΔΙΑΒΑΣΤΕ-ΜΕ.txt', "Αντίγραφο ασφαλείας M&M — " . date('d/m/Y H:i') . "\n\n"
    . "data/content.json      Κείμενα & εικόνες της σελίδας\n"
    . "data/settings.json     Ρυθμίσεις\n"
    . "data/history/          Παλαιότερες εκδόσεις περιεχομένου\n"
    . "data/*.sqlite          Στατιστικά & μηνύματα (ανοίγει με DB Browser for SQLite)\n"
    . "uploads/               Οι εικόνες που ανεβάσατε\n");
  $zip->close();
  header('Content-Type: application/zip');
  header('Content-Disposition: attachment; filename="mm-backup-' . $stamp . '.zip"');
  header('Content-Length: ' . filesize($tmp));
  header('Cache-Control: no-store');
  readfile($tmp);
  @unlink($tmp);
  exit;
}
