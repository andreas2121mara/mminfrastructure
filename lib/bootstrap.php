<?php
/* =========================================================
   M&M — Κοινός πυρήνας του backend
   Ρυθμίσεις, φάκελος δεδομένων, βάση SQLite, συνεδρίες admin,
   προστασία CSRF και βοηθητικές συναρτήσεις.
   ========================================================= */
declare(strict_types=1);

if (PHP_VERSION_ID < 80000) {
  http_response_code(500);
  exit('Απαιτείται PHP 8.0 ή νεότερη (hPanel → Advanced → PHP Configuration).');
}

define('MM_ROOT', dirname(__DIR__));
mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Athens');

/* ---------- Φάκελος δεδομένων ----------
   Προτιμάμε φάκελο ΕΞΩ από το public_html (δεν είναι προσβάσιμος από το web
   και δεν τον αγγίζει το Git deploy). Αν δεν γίνεται, χρησιμοποιούμε το /data
   με πλήρη απαγόρευση πρόσβασης μέσω .htaccess. */
function mm_data_dir(): string {
  static $dir = null;
  if ($dir !== null) return $dir;
  $outside = dirname(MM_ROOT) . DIRECTORY_SEPARATOR . 'mm-data';
  if (@is_dir($outside) && @is_writable($outside)) return $dir = $outside;
  if (@is_writable(dirname(MM_ROOT)) && @mkdir($outside, 0750, true)) return $dir = $outside;
  $inside = MM_ROOT . DIRECTORY_SEPARATOR . 'data';
  if (!is_dir($inside)) @mkdir($inside, 0750, true);
  if (!is_file($inside . '/.htaccess')) {
    @file_put_contents($inside . '/.htaccess', "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
  }
  return $dir = $inside;
}

/* ---------- JSON αρχεία ----------
   Τα ευαίσθητα αρχεία αποθηκεύονται ως .php με «φρουρό» στην αρχή,
   ώστε ακόμη κι αν κάποιος τα ζητήσει από τον browser να μη δει τίποτα. */
const MM_GUARD = "<?php http_response_code(404); exit; ?>\n";

function mm_read_json(string $file, $default = null) {
  if (!is_file($file)) return $default;
  $raw = @file_get_contents($file);
  if ($raw === false) return $default;
  if (str_starts_with($raw, '<?php')) $raw = (string)substr($raw, (int)strpos($raw, "\n") + 1);
  $d = json_decode($raw, true);
  return is_array($d) ? $d : $default;
}

function mm_write_json(string $file, $data, bool $guard = false): bool {
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  if ($json === false) return false;
  if ($guard) $json = MM_GUARD . $json;
  $tmp = $file . '.tmp' . bin2hex(random_bytes(4));
  if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
  if (!@rename($tmp, $file)) { @unlink($tmp); return false; }
  return true;
}

/* ---------- Μυστικό κλειδί + όνομα βάσης (δημιουργούνται στην πρώτη εκκίνηση) ---------- */
function mm_config(): array {
  static $c = null;
  if ($c !== null) return $c;
  $f = mm_data_dir() . '/config.php';
  $c = mm_read_json($f, []);
  if (empty($c['secret']) || empty($c['db'])) {
    $c = ['secret' => bin2hex(random_bytes(32)), 'db' => 'mm-' . bin2hex(random_bytes(8)) . '.sqlite', 'created' => time()];
    mm_write_json($f, $c, true);
  }
  return $c;
}

function mm_hash(string $s): string {
  return hash_hmac('sha256', $s, mm_config()['secret']);
}

/* ---------- Βάση δεδομένων ---------- */
function mm_db(): PDO {
  static $db = null;
  if ($db) return $db;
  if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
    throw new RuntimeException('Το PHP extension pdo_sqlite δεν είναι ενεργό.');
  }
  $db = new PDO('sqlite:' . mm_data_dir() . DIRECTORY_SEPARATOR . mm_config()['db']);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  $db->exec('PRAGMA busy_timeout = 4000');
  mm_migrate($db);
  return $db;
}

function mm_migrate(PDO $db): void {
  $v = (int)$db->query('PRAGMA user_version')->fetchColumn();
  if ($v < 1) {
    $db->exec("
      CREATE TABLE IF NOT EXISTS pv (
        id INTEGER PRIMARY KEY, pid TEXT UNIQUE, vid TEXT, sid TEXT,
        ts INTEGER, last_ts INTEGER, path TEXT, ref TEXT, ref_host TEXT, source TEXT, medium TEXT,
        utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
        cc TEXT, country TEXT, region TEXT, city TEXT, lat REAL, lon REAL,
        browser TEXT, os TEXT, device TEXT, lang TEXT, tz TEXT, sw INTEGER, sh INTEGER,
        dur INTEGER DEFAULT 0, scroll INTEGER DEFAULT 0, section TEXT DEFAULT '', sections TEXT DEFAULT ',',
        load_ms INTEGER, events INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS pv_ts ON pv(ts);
      CREATE INDEX IF NOT EXISTS pv_last ON pv(last_ts);
      CREATE INDEX IF NOT EXISTS pv_vid ON pv(vid);
      CREATE TABLE IF NOT EXISTS ev (id INTEGER PRIMARY KEY, pid TEXT, ts INTEGER, name TEXT, label TEXT);
      CREATE INDEX IF NOT EXISTS ev_ts ON ev(ts);
      CREATE INDEX IF NOT EXISTS ev_pid ON ev(pid);
      CREATE TABLE IF NOT EXISTS geo (ip_hash TEXT PRIMARY KEY, cc TEXT, country TEXT, region TEXT, city TEXT, lat REAL, lon REAL, ts INTEGER);
      CREATE TABLE IF NOT EXISTS msg (
        id INTEGER PRIMARY KEY, ts INTEGER, name TEXT, email TEXT, phone TEXT, message TEXT,
        cc TEXT, city TEXT, pid TEXT, is_read INTEGER DEFAULT 0, starred INTEGER DEFAULT 0, archived INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS msg_ts ON msg(ts);
      CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, ts INTEGER, action TEXT, detail TEXT, ip TEXT);
      CREATE TABLE IF NOT EXISTS rl (id INTEGER PRIMARY KEY, k TEXT, ts INTEGER);
      CREATE INDEX IF NOT EXISTS rl_k ON rl(k, ts);
      CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT);
      PRAGMA user_version = 1;
    ");
  }
}

/* ---------- Ρυθμίσεις ---------- */
function mm_settings_defaults(): array {
  return [
    'geo' => true,               // γεωεντοπισμός επισκεπτών (πόλη/χώρα)
    'respect_dnt' => true,       // σεβασμός «Do Not Track» / GPC
    'track_admin' => false,      // να μετράνε και οι επισκέψεις του admin
    'retention_days' => 400,     // πόσες μέρες κρατάμε τα στατιστικά
    'notify_email' => '',        // πού έρχονται τα μηνύματα της φόρμας (κενό = email εταιρείας)
    'maintenance' => false,
    'maintenance_title' => 'Σύντομα κοντά σας',
    'maintenance_text' => 'Ο ιστότοπος ανανεώνεται. Επιστρέφουμε σε λίγο.',
  ];
}

function mm_settings(): array {
  static $s = null;
  if ($s !== null) return $s;
  $saved = mm_read_json(mm_data_dir() . '/settings.json', []);
  return $s = array_merge(mm_settings_defaults(), array_intersect_key($saved, mm_settings_defaults()));
}

function mm_save_settings(array $in): array {
  $d = mm_settings_defaults();
  $cur = mm_settings();
  $out = [];
  foreach ($d as $k => $def) {
    $v = array_key_exists($k, $in) ? $in[$k] : $cur[$k];
    if (is_bool($def)) $v = filter_var($v, FILTER_VALIDATE_BOOLEAN);
    elseif (is_int($def)) $v = max(7, min(3650, (int)$v));
    else $v = mb_substr(trim((string)$v), 0, 500);
    $out[$k] = $v;
  }
  if ($out['notify_email'] !== '' && !filter_var($out['notify_email'], FILTER_VALIDATE_EMAIL)) $out['notify_email'] = $cur['notify_email'];
  mm_write_json(mm_data_dir() . '/settings.json', $out);
  return $out;
}

/* ---------- Αίτημα / απάντηση ---------- */
function mm_is_https(): bool {
  return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
    || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

function mm_ip(): string {
  foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP'] as $h) {
    if (!empty($_SERVER[$h])) {
      $ip = trim(explode(',', (string)$_SERVER[$h])[0]);
      if (filter_var($ip, FILTER_VALIDATE_IP)) return $ip;
    }
  }
  return (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function mm_json($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function mm_input(): array {
  $ct = $_SERVER['CONTENT_TYPE'] ?? '';
  if (str_contains($ct, 'application/json')) {
    $d = json_decode((string)file_get_contents('php://input'), true);
    return is_array($d) ? $d : [];
  }
  return $_POST;
}

function mm_finish_request(): void {
  ignore_user_abort(true);
  if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); return; }
  if (function_exists('litespeed_finish_request')) { litespeed_finish_request(); return; }
  @ob_end_flush();
  @flush();
}

/* ---------- Όριο αιτημάτων (rate limit) ---------- */
function mm_rate_hit(string $key): void {
  mm_db()->prepare('INSERT INTO rl (k, ts) VALUES (?, ?)')->execute([$key, time()]);
}
function mm_rate_count(string $key, int $window): int {
  $q = mm_db()->prepare('SELECT COUNT(*) FROM rl WHERE k = ? AND ts > ?');
  $q->execute([$key, time() - $window]);
  return (int)$q->fetchColumn();
}
function mm_rate_cleanup(): void {
  mm_db()->prepare('DELETE FROM rl WHERE ts < ?')->execute([time() - 86400]);
}

/* ---------- Ημερολόγιο ενεργειών admin ---------- */
function mm_audit(string $action, string $detail = ''): void {
  try {
    mm_db()->prepare('INSERT INTO audit (ts, action, detail, ip) VALUES (?, ?, ?, ?)')
      ->execute([time(), $action, mb_substr($detail, 0, 300), substr(mm_hash(mm_ip()), 0, 10)]);
  } catch (Throwable $e) { /* δεν σταματάμε ποτέ μια ενέργεια επειδή απέτυχε το log */ }
}

/* ---------- Συνεδρία admin ---------- */
const MM_SESSION = 'mm_admin';
const MM_IDLE = 4 * 3600;            // αποσύνδεση μετά από 4 ώρες αδράνειας
const MM_REMEMBER = 30 * 86400;      // «Να με θυμάσαι» για 30 μέρες

function mm_session_start(bool $create = false): bool {
  if (session_status() === PHP_SESSION_ACTIVE) return true;
  if (!$create && empty($_COOKIE[MM_SESSION])) return false;
  $dir = mm_data_dir() . DIRECTORY_SEPARATOR . 'sessions';
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  ini_set('session.use_strict_mode', '1');
  ini_set('session.gc_maxlifetime', (string)MM_REMEMBER);
  ini_set('session.gc_probability', '1');
  ini_set('session.gc_divisor', '100');
  session_save_path($dir);
  session_name(MM_SESSION);
  session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => mm_is_https(), 'httponly' => true, 'samesite' => 'Lax']);
  return @session_start();
}

function mm_auth_file(): string { return mm_data_dir() . '/auth.php'; }
function mm_auth(): ?array { return mm_read_json(mm_auth_file(), null); }
function mm_auth_save(array $a): bool { return mm_write_json(mm_auth_file(), $a, true); }

function mm_ua_hash(): string { return substr(mm_hash((string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 16); }

/** Επιστρέφει τον συνδεδεμένο admin ή null. Δεν ανοίγει συνεδρία σε απλούς επισκέπτες. */
function mm_admin(): ?array {
  static $checked = false, $user = null;
  if ($checked) return $user;
  $checked = true;
  if (!mm_session_start(false)) return null;
  $s = $_SESSION;
  $auth = mm_auth();
  $now = time();
  $limit = !empty($s['remember']) ? MM_REMEMBER : MM_IDLE;
  if (!$auth || empty($s['uid']) || $s['uid'] !== mm_hash($auth['user'])
      || ($s['uah'] ?? '') !== mm_ua_hash() || $now - (int)($s['last'] ?? 0) > $limit
      || (int)($s['pw'] ?? 0) !== (int)($auth['pw_changed'] ?? 0)) {
    if (!empty($s['uid'])) { $_SESSION = []; }
    return null;
  }
  if ($now - (int)$s['last'] > 60) $_SESSION['last'] = $now;
  return $user = ['user' => $auth['user'], 'csrf' => (string)$s['csrf'], 'totp' => !empty($auth['totp'])];
}

function mm_is_admin(): bool { return mm_admin() !== null; }

function mm_login_complete(array $auth, bool $remember): void {
  mm_session_start(true);
  session_regenerate_id(true);
  $_SESSION = [
    'uid' => mm_hash($auth['user']), 'csrf' => bin2hex(random_bytes(16)), 'login' => time(), 'last' => time(),
    'remember' => $remember, 'uah' => mm_ua_hash(), 'pw' => (int)($auth['pw_changed'] ?? 0),
  ];
  if ($remember) {
    setcookie(session_name(), session_id(), ['expires' => time() + MM_REMEMBER, 'path' => '/', 'secure' => mm_is_https(), 'httponly' => true, 'samesite' => 'Lax']);
  }
}

function mm_logout(): void {
  if (mm_session_start(false)) {
    $_SESSION = [];
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'secure' => mm_is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    session_destroy();
  }
}

function mm_require_admin(bool $csrf = true): array {
  $u = mm_admin();
  if (!$u) mm_json(['error' => 'Η σύνδεση έληξε. Συνδεθείτε ξανά.', 'auth' => false], 401);
  if ($csrf && ($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    $t = (string)($_SERVER['HTTP_X_CSRF'] ?? '');
    if (!hash_equals($u['csrf'], $t)) mm_json(['error' => 'Μη έγκυρο αίτημα (CSRF).'], 403);
  }
  return $u;
}

/* ---------- 2FA (TOTP, συμβατό με Google Authenticator / Authy) ---------- */
function mm_b32_encode(string $bin): string {
  $a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $out = '';
  foreach (str_split($bin) as $ch) $bits .= str_pad(decbin(ord($ch)), 8, '0', STR_PAD_LEFT);
  foreach (str_split($bits, 5) as $chunk) $out .= $a[bindec(str_pad($chunk, 5, '0'))];
  return $out;
}
function mm_b32_decode(string $s): string {
  $a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $out = '';
  foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $s))) as $ch) $bits .= str_pad(decbin((int)strpos($a, $ch)), 5, '0', STR_PAD_LEFT);
  foreach (str_split($bits, 8) as $byte) if (strlen($byte) === 8) $out .= chr(bindec($byte));
  return $out;
}
function mm_totp(string $secret, ?int $t = null): string {
  $h = hash_hmac('sha1', pack('J', intdiv($t ?? time(), 30)), mm_b32_decode($secret), true);
  $o = ord($h[19]) & 0x0f;
  $n = ((ord($h[$o]) & 0x7f) << 24) | (ord($h[$o + 1]) << 16) | (ord($h[$o + 2]) << 8) | ord($h[$o + 3]);
  return str_pad((string)($n % 1000000), 6, '0', STR_PAD_LEFT);
}
function mm_totp_verify(string $secret, string $code): bool {
  $code = preg_replace('/\D/', '', $code);
  if (strlen($code) !== 6) return false;
  foreach ([-1, 0, 1] as $w) if (hash_equals(mm_totp($secret, time() + $w * 30), $code)) return true;
  return false;
}

/* ---------- Βοηθητικά ---------- */
function mm_base_url(): string {
  $host = preg_replace('/[^a-z0-9.\-:]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost'));
  return (mm_is_https() ? 'https://' : 'http://') . $host;
}

/** URL αρχείου με version για να μη μένει παλιό στην cache του browser. */
function mm_asset(string $path): string {
  $f = MM_ROOT . '/' . $path;
  return $path . (is_file($f) ? '?v=' . filemtime($f) : '');
}
