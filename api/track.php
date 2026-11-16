<?php
/* =========================================================
   M&M — Καταγραφή επισκεψιμότητας (καλείται από το js/track.js)
   t = pv (νέα προβολή) · hb (παλμός: χρόνος, scroll, ενότητα) · ev (ενέργεια)
   ========================================================= */
declare(strict_types=1);
ini_set('display_errors', '0');

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/analytics.php';

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function mm_track_done(int $code = 204): void { http_response_code($code); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') mm_track_done(405);

// Μόνο από τον δικό μας ιστότοπο
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$host = (string)($_SERVER['HTTP_HOST'] ?? '');
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== preg_replace('/:\d+$/', '', $host)) mm_track_done(403);

$d = json_decode((string)file_get_contents('php://input', false, null, 0, 8192), true);
if (!is_array($d)) mm_track_done(400);

try {
  $S = mm_settings();
  if (!$S['track_admin'] && mm_is_admin()) mm_track_done();
  $ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400);
  if (mm_is_bot($ua)) mm_track_done();

  $pid = (string)($d['pid'] ?? '');
  if (!preg_match('/^[a-z0-9]{10,32}$/i', $pid)) mm_track_done(400);
  $t = (string)($d['t'] ?? '');
  $now = time();
  $db = mm_db();
  $str = fn($k, $max) => mb_substr(trim((string)($d[$k] ?? '')), 0, $max);

  if ($t === 'pv') {
    $ip = mm_ip();
    $ipHash = mm_hash($ip);
    $vid = mm_visitor_id($ip, $ua);

    // προστασία από «βομβαρδισμό» αιτημάτων
    $q = $db->prepare('SELECT COUNT(*) FROM pv WHERE vid = ? AND ts > ?');
    $q->execute([$vid, $now - 60]);
    if ((int)$q->fetchColumn() > 20) mm_track_done(429);

    // ίδια συνεδρία αν υπήρξε δραστηριότητα τα τελευταία 30'
    $q = $db->prepare('SELECT sid FROM pv WHERE vid = ? AND last_ts > ? ORDER BY last_ts DESC LIMIT 1');
    $q->execute([$vid, $now - 1800]);
    $sid = (string)($q->fetchColumn() ?: substr(bin2hex(random_bytes(8)), 0, 16));

    $utmS = $str('us', 80); $utmM = $str('um', 80); $utmC = $str('uc', 120);
    [$refHost, $source, $medium] = mm_ref_classify($str('ref', 500), $utmS);
    if ($utmM !== '' && $medium === 'campaign') $medium = mb_strtolower($utmM);
    [$browser, $os, $device] = mm_ua_parse($ua);
    $tz = preg_match('#^[A-Za-z_]+(/[A-Za-z_\-+0-9]+){0,2}$#', $str('tz', 60)) ? $str('tz', 60) : '';
    $lang = preg_replace('/[^a-zA-Z\-]/', '', $str('lang', 16)) ?? '';
    $path = '/' . ltrim(preg_replace('/[^\w\-\/.#?=&%]/u', '', $str('path', 200)) ?? '', '/');

    $geo = mm_geo_cached($ipHash);
    if (!$geo && !$S['geo']) $geo = mm_geo_from_tz($tz);

    $db->prepare('INSERT OR IGNORE INTO pv (pid, vid, sid, ts, last_ts, path, ref, ref_host, source, medium, utm_source, utm_medium, utm_campaign,
        cc, country, region, city, lat, lon, browser, os, device, lang, tz, sw, sh, load_ms)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      ->execute([$pid, $vid, $sid, $now, $now, $path, $refHost !== '' ? $str('ref', 300) : '', $refHost, $source, $medium, $utmS, $utmM, $utmC,
        $geo['cc'] ?? '', $geo['country'] ?? '', $geo['region'] ?? '', $geo['city'] ?? '', $geo['lat'] ?? null, $geo['lon'] ?? null,
        $browser, $os, $device, $lang, $tz, max(0, min(20000, (int)($d['sw'] ?? 0))), max(0, min(20000, (int)($d['sh'] ?? 0))),
        max(0, min(120000, (int)($d['load'] ?? 0)))]);

    // Απαντάμε αμέσως και κάνουμε τον γεωεντοπισμό «στο παρασκήνιο»
    http_response_code(204);
    mm_finish_request();
    if (!$geo && $S['geo']) {
      $g = mm_geo_lookup($ip) ?? mm_geo_from_tz($tz);
      if ($g) {
        if (($g['country'] ?? '') !== '' || ($g['cc'] ?? '') === 'LO') mm_geo_store($ipHash, $g);
        $db->prepare('UPDATE pv SET cc = ?, country = ?, region = ?, city = ?, lat = ?, lon = ? WHERE pid = ?')
          ->execute([$g['cc'], $g['country'], $g['region'], $g['city'], $g['lat'], $g['lon'], $pid]);
      }
    }
    if (random_int(1, 200) === 1) mm_retention_cleanup();
    exit;
  }

  if ($t === 'hb') {
    $sections = array_values(array_intersect(array_filter((array)($d['seen'] ?? []), 'is_string'), MM_SECTIONS));
    $cur = in_array($d['s'] ?? '', MM_SECTIONS, true) ? (string)$d['s'] : '';
    $q = $db->prepare('SELECT sections FROM pv WHERE pid = ? AND ts > ?');
    $q->execute([$pid, $now - 6 * 3600]);
    $old = $q->fetchColumn();
    if ($old === false) mm_track_done();
    $set = array_unique(array_merge(array_filter(explode(',', (string)$old)), $sections));
    $db->prepare('UPDATE pv SET last_ts = ?, dur = MAX(dur, ?), scroll = MAX(scroll, ?), section = ?, sections = ? WHERE pid = ?')
      ->execute([$now, max(0, min(6 * 3600, (int)($d['a'] ?? 0))), max(0, min(100, (int)($d['sc'] ?? 0))), $cur, ',' . implode(',', $set) . ',', $pid]);
    mm_track_done();
  }

  if ($t === 'ev') {
    $name = (string)($d['n'] ?? '');
    if (!in_array($name, MM_EVENTS, true)) mm_track_done(400);
    $q = $db->prepare('SELECT COUNT(*) FROM ev WHERE pid = ?');
    $q->execute([$pid]);
    if ((int)$q->fetchColumn() > 200) mm_track_done(429);
    $q = $db->prepare('SELECT 1 FROM pv WHERE pid = ? AND ts > ?');
    $q->execute([$pid, $now - 6 * 3600]);
    if (!$q->fetchColumn()) mm_track_done();
    $db->prepare('INSERT INTO ev (pid, ts, name, label) VALUES (?, ?, ?, ?)')->execute([$pid, $now, $name, $str('l', 140)]);
    $db->prepare('UPDATE pv SET events = events + 1, last_ts = ? WHERE pid = ?')->execute([$now, $pid]);
    mm_track_done();
  }

  mm_track_done(400);
} catch (Throwable $e) {
  error_log('[mm] track: ' . $e->getMessage());
  mm_track_done(500);
}
