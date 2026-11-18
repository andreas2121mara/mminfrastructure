<?php
/* =========================================================
   M&M — Χάρτης ιστοτόπου για Google/Bing (σερβίρεται ως /sitemap.xml)
   Περιλαμβάνει τις φωτογραφίες των έργων (Google Images) και την
   ημερομηνία της τελευταίας αλλαγής από τη Διαχείριση.
   ========================================================= */
declare(strict_types=1);
ini_set('display_errors', '0');

$C = null;
try {
  require __DIR__ . '/lib/bootstrap.php';
  require __DIR__ . '/lib/content.php';
  $C = mm_content();
  $base = mm_base_url();
  $f = mm_data_dir() . '/content.json';
  $mod = is_file($f) ? (int)filemtime($f) : (int)filemtime(__FILE__);
} catch (Throwable $e) {
  error_log('[mm] sitemap: ' . $e->getMessage());
  $base = 'https://' . preg_replace('/[^a-z0-9.\-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'mminfrastructure.gr'));
  $mod = (int)filemtime(__FILE__);
}

$x = fn($s) => htmlspecialchars((string)$s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$images = [];
if ($C) {
  $add = function (string $p) use (&$images, $base): void {
    if ($p !== '' && !isset($images[$p])) $images[$p] = $base . '/' . ltrim($p, '/');
  };
  $add($C['hero']['image']);
  foreach ($C['projects']['items'] as $it) $add($it['image']);
  $add($C['compare']['before']);
  $add($C['compare']['after']);
  $add($C['fleet']['image']);
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";
echo "  <url>\n";
echo '    <loc>' . $x($base . '/') . "</loc>\n";
echo '    <lastmod>' . date('c', $mod) . "</lastmod>\n";
foreach ($images as $loc) echo '    <image:image><image:loc>' . $x($loc) . "</image:loc></image:image>\n";
echo "  </url>\n";
echo "</urlset>\n";
