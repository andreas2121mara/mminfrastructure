<?php
/* =========================================================
   M&M — Περιεχόμενο ιστοσελίδας
   Τα κείμενα/εικόνες ζουν σε JSON: lib/defaults.json (αρχικά)
   + mm-data/content.json (ό,τι αλλάζει ο admin). Κάθε αποθήκευση
   κρατά και αντίγραφο στο ιστορικό για επαναφορά.
   ========================================================= */
declare(strict_types=1);

const MM_IMAGE_KEYS = ['image', 'og_image', 'before', 'after'];
const MM_SIZES = ['normal', 'tall', 'wide'];

function mm_is_list(array $a): bool {
  return $a === [] || array_keys($a) === range(0, count($a) - 1);
}

function mm_defaults(): array {
  static $d = null;
  if ($d === null) $d = json_decode((string)file_get_contents(__DIR__ . '/defaults.json'), true) ?: [];
  return $d;
}

function mm_content(): array {
  static $c = null;
  if ($c !== null) return $c;
  $saved = mm_read_json(mm_data_dir() . '/content.json', null);
  return $c = $saved ? mm_sanitize($saved, mm_defaults()) : mm_defaults();
}

function mm_valid_image_path(string $p): bool {
  return (bool)preg_match('#^(assets/images|uploads)/[A-Za-z0-9/_\-.]+\.(jpe?g|png|webp|gif)$#i', $p) && !str_contains($p, '..');
}

/** Κρατά μόνο ό,τι προβλέπεται από το πρότυπο (defaults) και καθαρίζει τις τιμές. */
function mm_sanitize($in, $tpl, string $key = '') {
  if (is_array($tpl) && mm_is_list($tpl)) {
    if (!is_array($in)) return $tpl;
    $item = $tpl[0] ?? '';
    $out = [];
    foreach (array_values($in) as $v) {
      $out[] = mm_sanitize($v, $item, $key);
      if (count($out) >= 200) break;
    }
    return $out;
  }
  if (is_array($tpl)) {
    $out = [];
    foreach ($tpl as $k => $t) {
      $v = (is_array($in) && array_key_exists($k, $in)) ? $in[$k] : $t;
      $out[$k] = mm_sanitize($v, $t, (string)$k);
    }
    return $out;
  }
  if (is_int($tpl) || is_float($tpl)) {
    return is_numeric($in) ? (int)round((float)$in) : $tpl;
  }
  $s = is_scalar($in) ? (string)$in : (string)$tpl;
  $s = str_replace(["\r\n", "\r"], "\n", $s);
  $s = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $s) ?? '';
  $s = mb_substr(trim($s), 0, 6000);
  if (in_array($key, MM_IMAGE_KEYS, true)) return mm_valid_image_path($s) ? $s : (string)$tpl;
  if ($key === 'size') return in_array($s, MM_SIZES, true) ? $s : 'normal';
  if ($key === 'icon') return array_key_exists($s, mm_icons()) ? $s : 'tiles';
  if ($key === 'key' || $key === 'cat') {
    $s = strtolower(preg_replace('/[^a-z0-9\-]/i', '', $s) ?? '');
    return $s !== '' ? $s : 'cat';
  }
  if (in_array($key, ['facebook', 'instagram', 'linkedin'], true) && $s !== '' && !preg_match('#^https?://#i', $s)) {
    $s = 'https://' . ltrim($s, '/');
  }
  return $s;
}

function mm_history_dir(): string {
  $d = mm_data_dir() . DIRECTORY_SEPARATOR . 'history';
  if (!is_dir($d)) @mkdir($d, 0750, true);
  return $d;
}

function mm_save_content(array $doc, string $note): array {
  $clean = mm_sanitize($doc, mm_defaults());
  if (!mm_write_json(mm_data_dir() . '/content.json', $clean)) {
    throw new RuntimeException('Δεν ήταν δυνατή η αποθήκευση (δικαιώματα φακέλου δεδομένων).');
  }
  $id = date('Ymd-His') . '-' . bin2hex(random_bytes(3));
  mm_write_json(mm_history_dir() . "/$id.json", ['ts' => time(), 'note' => mb_substr($note, 0, 200), 'content' => $clean]);
  $files = glob(mm_history_dir() . '/*.json') ?: [];
  rsort($files);
  foreach (array_slice($files, 80) as $old) @unlink($old);
  return $clean;
}

function mm_history_list(): array {
  $out = [];
  $files = glob(mm_history_dir() . '/*.json') ?: [];
  rsort($files);
  foreach (array_slice($files, 0, 80) as $f) {
    $d = mm_read_json($f, []);
    $out[] = ['id' => basename($f, '.json'), 'ts' => (int)($d['ts'] ?? filemtime($f)), 'note' => (string)($d['note'] ?? ''), 'size' => filesize($f)];
  }
  return $out;
}

function mm_history_get(string $id): ?array {
  if (!preg_match('/^\d{8}-\d{6}-[a-f0-9]{6}$/', $id)) return null;
  $d = mm_read_json(mm_history_dir() . "/$id.json", null);
  return $d['content'] ?? null;
}

/** Βρίσκει πού χρησιμοποιείται μια εικόνα μέσα στο περιεχόμενο. */
function mm_image_usage(array $content): array {
  $map = [];
  $walk = function ($node, string $path) use (&$walk, &$map) {
    if (is_array($node)) { foreach ($node as $k => $v) $walk($v, $path === '' ? (string)$k : "$path.$k"); return; }
    if (is_string($node) && mm_valid_image_path($node)) $map[$node][] = $path;
  };
  $walk($content, '');
  return $map;
}

/* ---------- Βοηθητικά για το template ---------- */
function e($s): string {
  return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Κείμενο με απλή μορφοποίηση: *λέξη* = πλάγια/χρυσή έμφαση, Enter = νέα γραμμή. */
function rich($s, string $iClass = ''): string {
  $h = e($s);
  $h = preg_replace('/\*([^*\n]+)\*/u', $iClass !== '' ? '<i class="' . $iClass . '">$1</i>' : '<i>$1</i>', $h) ?? $h;
  return str_replace("\n", '<br/>', $h);
}

/** Μικρότερες εκδόσεις μιας εικόνας: «φάκελος/sm/όνομα» (600px) και «φάκελος/md/όνομα» (900px). */
function mm_img_variant(string $path, string $v): string {
  return dirname($path) . '/' . $v . '/' . basename($path);
}
function mm_img_small(string $path): string {
  return mm_img_variant($path, 'sm');
}

/** Λίστα «αρχείο πλάτος» για srcset (μικρό → μεγάλο) ή [] αν δεν υπάρχουν μικρότερες εκδόσεις. */
function mm_img_srcset(string $path): array {
  static $cache = [];
  if (isset($cache[$path])) return $cache[$path];
  $abs = MM_ROOT . '/' . $path;
  $info = (mm_valid_image_path($path) && is_file($abs)) ? @getimagesize($abs) : false;
  if (!$info) return $cache[$path] = ['w' => 0, 'h' => 0, 'set' => []];
  $set = [];
  foreach (['sm', 'md'] as $v) {
    $p = mm_img_variant($path, $v);
    $vi = is_file(MM_ROOT . '/' . $p) ? @getimagesize(MM_ROOT . '/' . $p) : false;
    if ($vi && (int)$vi[0] < (int)$info[0]) $set[] = [$p, (int)$vi[0]];
  }
  if ($set) $set[] = [$path, (int)$info[0]];
  return $cache[$path] = ['w' => (int)$info[0], 'h' => (int)$info[1], 'set' => $set];
}

/**
 * width/height + srcset για μια εικόνα: η σελίδα δεν «πηδάει» όσο φορτώνει
 * και ο browser κατεβάζει το μέγεθος που χρειάζεται (μικρό σε κάρτες/κινητά).
 */
function mm_img(string $path, string $sizes = '100vw'): string {
  $i = mm_img_srcset($path);
  $out = $i['w'] ? ' width="' . $i['w'] . '" height="' . $i['h'] . '"' : '';
  if ($i['set']) $out .= ' srcset="' . e(implode(', ', array_map(fn($s) => $s[0] . ' ' . $s[1] . 'w', $i['set']))) . '" sizes="' . e($sizes) . '"';
  return $out;
}

/** Καθαρό κείμενο (χωρίς *έμφαση* και αλλαγές γραμμής) για meta/alt/structured data. */
function mm_plain(string $s): string {
  return trim(preg_replace('/\s+/u', ' ', str_replace('*', '', $s)) ?? $s);
}

function mm_lines(string $s): array {
  $l = array_values(array_filter(array_map('trim', explode("\n", $s)), fn($x) => $x !== ''));
  return $l ?: [''];
}

/** Σημάδι για επεξεργασία πάνω στη σελίδα (μπαίνει μόνο όταν είναι συνδεδεμένος ο admin). */
function ed(string $path, string $type = 'text'): string {
  return mm_edit_mode() ? ' data-edit="' . e($path) . '" data-type="' . e($type) . '"' : '';
}
function mm_edit_mode(?bool $set = null): bool {
  static $on = false;
  if ($set !== null) $on = $set;
  return $on;
}

function mm_icons(): array {
  return [
    'tiles'  => '<rect x="6" y="6" width="16" height="16"/><rect x="26" y="6" width="16" height="16"/><rect x="6" y="26" width="16" height="16"/><rect x="26" y="26" width="16" height="16"/>',
    'plaza'  => '<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="6"/><path d="M24 2v8M24 38v8M2 24h8M38 24h8"/>',
    'coast'  => '<path d="M2 34c6-4 10-4 16 0s10 4 16 0 10-4 12-2"/><path d="M2 42c6-4 10-4 16 0s10 4 16 0 10-4 12-2"/><path d="M10 24l14-16 14 16"/>',
    'road'   => '<path d="M16 4L8 44M32 4l8 40"/><path d="M24 8v6M24 20v6M24 32v6"/>',
    'access' => '<rect x="18" y="4" width="12" height="40"/><path d="M21 10h6M21 16h6M21 22h6M21 28h6M21 34h6M21 40h6"/>',
    'infra'  => '<path d="M4 40h40"/><path d="M8 40V20l10-8 10 8v20"/><path d="M28 40V12l12-6v34"/>',
    'park'   => '<path d="M24 44V26"/><circle cx="24" cy="16" r="12"/><path d="M8 44h32"/>',
    'pipe'   => '<path d="M4 18h24a8 8 0 0 1 8 8v18"/><path d="M4 30h18a2 2 0 0 1 2 2v12"/><path d="M4 12v24M30 44h12"/>',
    'light'  => '<path d="M24 44V14"/><path d="M24 14c0-6 4-10 12-10"/><path d="M30 4h10l-2 6h-6z"/><path d="M16 44h16"/>',
    'truck'  => '<path d="M2 34V14h26v20"/><path d="M28 20h10l8 8v6H28"/><circle cx="12" cy="38" r="4"/><circle cx="36" cy="38" r="4"/>',
    'shield' => '<path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z"/><path d="M17 24l5 5 10-11"/>',
    'ruler'  => '<rect x="4" y="16" width="40" height="16"/><path d="M10 16v6M16 16v4M22 16v6M28 16v4M34 16v6M40 16v4"/>',
  ];
}

function mm_icon(string $k): string {
  return mm_icons()[$k] ?? mm_icons()['tiles'];
}

function mm_find_cat(array $cats, string $key): array {
  foreach ($cats as $c) if (($c['key'] ?? '') === $key) return $c;
  return ['key' => $key, 'label' => '', 'tag' => ''];
}

function mm_abs_url(string $path): string {
  return preg_match('#^https?://#', $path) ? $path : mm_base_url() . '/' . ltrim($path, '/');
}
