<?php
/* =========================================================
   M&M — Αρχική σελίδα (δυναμική)
   Τα κείμενα/εικόνες έρχονται από τη Διαχείριση. Αν για
   οποιονδήποτε λόγο αποτύχει το backend, σερβίρεται αυτόματα
   το στατικό index.html, ώστε το site να μην «πέσει» ποτέ.
   ========================================================= */
declare(strict_types=1);

ini_set('display_errors', '0');
ob_start();
try {
  require __DIR__ . '/lib/bootstrap.php';
  require __DIR__ . '/lib/content.php';
  $ADMIN = mm_admin();
  $S = mm_settings();
  header('Content-Type: text/html; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: strict-origin-when-cross-origin');
  if ($S['maintenance'] && !$ADMIN) {
    require __DIR__ . '/lib/maintenance.php';
  } else {
    header('Cache-Control: no-cache');
    $C = mm_content();
    mm_edit_mode($ADMIN !== null);
    require __DIR__ . '/lib/page.php';
  }
  ob_end_flush();
} catch (Throwable $e) {
  while (ob_get_level() > 0) ob_end_clean();
  error_log('[mm] index.php: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  if (is_file(__DIR__ . '/index.html')) {
    if (!headers_sent()) header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
  } else {
    http_response_code(503);
    echo 'Η σελίδα δεν είναι διαθέσιμη προσωρινά.';
  }
}
