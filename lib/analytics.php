<?php
/* =========================================================
   M&M — Στατιστικά επισκεπτών (χωρίς cookies)
   Ο επισκέπτης αναγνωρίζεται με ένα ημερήσιο, μη αναστρέψιμο
   αποτύπωμα (IP + browser + μυστικό που αλλάζει κάθε μέρα).
   Η IP δεν αποθηκεύεται ποτέ.
   ========================================================= */
declare(strict_types=1);

const MM_SECTIONS = ['hero', 'about', 'services', 'projects', 'compare', 'process', 'fleet', 'contact'];
const MM_EVENTS = ['cta', 'phone', 'email', 'form', 'project', 'filter', 'compare', 'nav', 'social', 'outbound'];

function mm_is_bot(string $ua): bool {
  if ($ua === '' || strlen($ua) < 20) return true;
  return (bool)preg_match('/bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|pingdom|uptime|monitor|curl|wget|python|java\/|go-http|okhttp|scrapy|httpclient|phantom|selenium|puppeteer|playwright|bingpreview|whatsapp\/|telegrambot|discordbot/i', $ua);
}

function mm_ua_parse(string $ua): array {
  $device = 'desktop';
  if (preg_match('/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i', $ua)) $device = 'tablet';
  elseif (preg_match('/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini/i', $ua)) $device = 'mobile';

  $browser = 'Άλλος';
  foreach ([
    'Facebook' => '/FBAN|FBAV/', 'Instagram' => '/Instagram/', 'Edge' => '/Edg(e|A|iOS)?\//', 'Opera' => '/OPR\/|Opera/',
    'Samsung Internet' => '/SamsungBrowser/', 'Firefox' => '/Firefox|FxiOS/', 'Chrome' => '/Chrome|CriOS/', 'Safari' => '/Safari/',
  ] as $name => $re) { if (preg_match($re, $ua)) { $browser = $name; break; } }

  $os = 'Άλλο';
  foreach ([
    'iOS' => '/iPhone|iPod/', 'iPadOS' => '/iPad/', 'Android' => '/Android/', 'Windows' => '/Windows/',
    'macOS' => '/Mac OS X|Macintosh/', 'ChromeOS' => '/CrOS/', 'Linux' => '/Linux/',
  ] as $name => $re) { if (preg_match($re, $ua)) { $os = $name; break; } }
  return [$browser, $os, $device];
}

/** Πηγή επισκεψιμότητας: Google, Facebook, Άμεση κ.λπ. */
function mm_ref_classify(string $ref, string $utmSource): array {
  $own = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
  $host = strtolower((string)(parse_url($ref, PHP_URL_HOST) ?? ''));
  $host = preg_replace('/^www\./', '', $host) ?? '';
  if ($host !== '' && ($host === $own || $host === preg_replace('/^www\./', '', $own))) $host = '';

  if ($utmSource !== '') {
    $s = mb_strtolower($utmSource);
    $known = ['facebook' => 'Facebook', 'fb' => 'Facebook', 'instagram' => 'Instagram', 'ig' => 'Instagram', 'google' => 'Google', 'linkedin' => 'LinkedIn', 'newsletter' => 'Newsletter', 'email' => 'Email'];
    return [$host, $known[$s] ?? mb_convert_case($utmSource, MB_CASE_TITLE), 'campaign'];
  }
  if ($host === '') return ['', 'Άμεση', 'direct'];
  $rules = [
    'Google' => ['/(^|\.)google\./', 'search'], 'Bing' => ['/(^|\.)bing\.com$/', 'search'], 'DuckDuckGo' => ['/duckduckgo\./', 'search'],
    'Yahoo' => ['/yahoo\./', 'search'], 'Yandex' => ['/yandex\./', 'search'], 'Ecosia' => ['/ecosia\./', 'search'],
    'Facebook' => ['/(^|\.)(facebook\.com|fb\.com|fb\.me)$/', 'social'], 'Instagram' => ['/instagram\.com$/', 'social'],
    'LinkedIn' => ['/(linkedin\.com|lnkd\.in)$/', 'social'], 'X / Twitter' => ['/(^|\.)(twitter\.com|t\.co|x\.com)$/', 'social'],
    'YouTube' => ['/youtube\.com$|youtu\.be$/', 'social'], 'TikTok' => ['/tiktok\.com$/', 'social'], 'Pinterest' => ['/pinterest\./', 'social'],
    'Reddit' => ['/reddit\.com$/', 'social'], 'Viber' => ['/viber\./', 'social'], 'WhatsApp' => ['/whatsapp\.|wa\.me$/', 'social'],
    'ChatGPT' => ['/chatgpt\.com$|openai\.com$/', 'ai'], 'Perplexity' => ['/perplexity\.ai$/', 'ai'], 'Claude' => ['/claude\.ai$/', 'ai'],
    'Gemini' => ['/gemini\.google\.com$/', 'ai'], 'Copilot' => ['/copilot\.microsoft\.com$/', 'ai'],
  ];
  foreach ($rules as $name => [$re, $medium]) if (preg_match($re, $host)) return [$host, $name, $medium];
  return [$host, $host, 'referral'];
}

/* ---------- Ημερήσιο «αλάτι» για ανώνυμο αποτύπωμα επισκέπτη ---------- */
function mm_daily_salt(): string {
  $db = mm_db();
  $key = 'salt-' . date('Y-m-d');
  $q = $db->prepare('SELECT v FROM kv WHERE k = ?');
  $q->execute([$key]);
  $v = $q->fetchColumn();
  if ($v) return (string)$v;
  $v = bin2hex(random_bytes(16));
  $db->prepare('INSERT OR IGNORE INTO kv (k, v) VALUES (?, ?)')->execute([$key, $v]);
  $db->prepare("DELETE FROM kv WHERE k LIKE 'salt-%' AND k <> ?")->execute([$key]);
  $q->execute([$key]);
  return (string)$q->fetchColumn();
}

function mm_visitor_id(string $ip, string $ua): string {
  return substr(hash('sha256', mm_daily_salt() . '|' . $ip . '|' . $ua), 0, 20);
}

/* ---------- Γεωεντοπισμός ---------- */
function mm_geo_cached(string $ipHash): ?array {
  $q = mm_db()->prepare('SELECT cc, country, region, city, lat, lon FROM geo WHERE ip_hash = ? AND ts > ?');
  $q->execute([$ipHash, time() - 30 * 86400]);
  $r = $q->fetch();
  return $r ?: null;
}

function mm_geo_lookup(string $ip): ?array {
  if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
    return ['cc' => 'LO', 'country' => 'Τοπικό δίκτυο', 'region' => '', 'city' => 'Τοπικό δίκτυο', 'lat' => null, 'lon' => null];
  }
  $url = 'https://free.freeipapi.com/api/v1/json/' . rawurlencode($ip);
  $raw = null;
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3, CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_USERAGENT => 'mm-site-analytics/1.0', CURLOPT_HTTPHEADER => ['Accept: application/json']]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code !== 200) $raw = null;
  } elseif (ini_get('allow_url_fopen')) {
    $ctx = stream_context_create(['http' => ['timeout' => 3, 'header' => "Accept: application/json\r\nUser-Agent: mm-site-analytics/1.0\r\n"]]);
    $raw = @file_get_contents($url, false, $ctx);
  }
  if (!is_string($raw) || $raw === '') return null;
  $d = json_decode($raw, true);
  $cc = strtoupper((string)($d['countryCode'] ?? ''));
  if (!is_array($d) || !preg_match('/^[A-Z]{2}$/', $cc)) return null;
  return [
    'cc' => $cc,
    'country' => mb_substr((string)($d['countryName'] ?? ''), 0, 80),
    'region' => mb_substr((string)($d['regionName'] ?? ''), 0, 80),
    'city' => mb_substr((string)($d['cityName'] ?? ''), 0, 80),
    'lat' => is_numeric($d['latitude'] ?? null) ? round((float)$d['latitude'], 3) : null,
    'lon' => is_numeric($d['longitude'] ?? null) ? round((float)$d['longitude'], 3) : null,
  ];
}

function mm_geo_store(string $ipHash, array $g): void {
  mm_db()->prepare('INSERT OR REPLACE INTO geo (ip_hash, cc, country, region, city, lat, lon, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([$ipHash, $g['cc'], $g['country'], $g['region'], $g['city'], $g['lat'], $g['lon'], time()]);
}

/** Εκτίμηση χώρας από τη ζώνη ώρας του browser, όταν ο γεωεντοπισμός είναι κλειστός ή αποτύχει. */
function mm_geo_from_tz(string $tz): ?array {
  $map = [
    'Europe/Athens' => ['GR', 37.98, 23.73], 'Asia/Nicosia' => ['CY', 35.17, 33.36], 'Europe/Nicosia' => ['CY', 35.17, 33.36],
    'Europe/Berlin' => ['DE', 52.52, 13.40], 'Europe/London' => ['GB', 51.51, -0.13], 'Europe/Paris' => ['FR', 48.86, 2.35],
    'Europe/Rome' => ['IT', 41.90, 12.50], 'Europe/Madrid' => ['ES', 40.42, -3.70], 'Europe/Sofia' => ['BG', 42.70, 23.32],
    'Europe/Bucharest' => ['RO', 44.43, 26.10], 'Europe/Istanbul' => ['TR', 41.01, 28.98], 'Europe/Tirane' => ['AL', 41.33, 19.82],
    'Europe/Skopje' => ['MK', 42.00, 21.43], 'Europe/Belgrade' => ['RS', 44.79, 20.45], 'Europe/Amsterdam' => ['NL', 52.37, 4.90],
    'Europe/Brussels' => ['BE', 50.85, 4.35], 'Europe/Vienna' => ['AT', 48.21, 16.37], 'Europe/Zurich' => ['CH', 47.38, 8.54],
    'Europe/Stockholm' => ['SE', 59.33, 18.07], 'Europe/Oslo' => ['NO', 59.91, 10.75], 'Europe/Copenhagen' => ['DK', 55.68, 12.57],
    'Europe/Helsinki' => ['FI', 60.17, 24.94], 'Europe/Warsaw' => ['PL', 52.23, 21.01], 'Europe/Prague' => ['CZ', 50.08, 14.44],
    'Europe/Budapest' => ['HU', 47.50, 19.04], 'Europe/Lisbon' => ['PT', 38.72, -9.14], 'Europe/Dublin' => ['IE', 53.35, -6.26],
    'Europe/Kyiv' => ['UA', 50.45, 30.52], 'Europe/Kiev' => ['UA', 50.45, 30.52], 'Europe/Moscow' => ['RU', 55.76, 37.62],
    'America/New_York' => ['US', 40.71, -74.01], 'America/Chicago' => ['US', 41.88, -87.63], 'America/Los_Angeles' => ['US', 34.05, -118.24],
    'America/Toronto' => ['CA', 43.65, -79.38], 'Australia/Sydney' => ['AU', -33.87, 151.21], 'Australia/Melbourne' => ['AU', -37.81, 144.96],
    'Asia/Dubai' => ['AE', 25.20, 55.27],
  ];
  if (!isset($map[$tz])) return null;
  [$cc, $lat, $lon] = $map[$tz];
  return ['cc' => $cc, 'country' => '', 'region' => '', 'city' => '', 'lat' => $lat, 'lon' => $lon];
}

/** Διαγραφή παλιών στατιστικών, σύμφωνα με τη ρύθμιση διατήρησης. */
function mm_retention_cleanup(): void {
  $days = (int)mm_settings()['retention_days'];
  $cut = time() - $days * 86400;
  $db = mm_db();
  $db->prepare('DELETE FROM ev WHERE ts < ?')->execute([$cut]);
  $db->prepare('DELETE FROM pv WHERE ts < ?')->execute([$cut]);
  $db->prepare('DELETE FROM geo WHERE ts < ?')->execute([time() - 30 * 86400]);
  mm_rate_cleanup();
}
