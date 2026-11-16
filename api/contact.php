<?php
/* =========================================================
   M&M — Φόρμα επικοινωνίας
   Αποθηκεύει το μήνυμα (το βλέπετε στη Διαχείριση → Μηνύματα)
   και στέλνει ειδοποίηση με email.
   ========================================================= */
declare(strict_types=1);
ini_set('display_errors', '0');

require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/content.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') mm_json(['ok' => false, 'error' => 'Μη έγκυρο αίτημα.'], 405);

$in = mm_input();
$val = fn($k, $max) => mb_substr(trim(str_replace(["\r\n", "\r"], "\n", (string)($in[$k] ?? ''))), 0, $max);
$name = $val('name', 120);
$email = $val('email', 160);
$phone = $val('phone', 40);
$message = $val('message', 5000);
$pid = preg_match('/^[a-z0-9]{10,32}$/i', (string)($in['pid'] ?? '')) ? (string)$in['pid'] : '';

// Παγίδα για spam bots: το πεδίο «website» είναι κρυφό, οι άνθρωποι δεν το συμπληρώνουν
if ($val('website', 200) !== '') mm_json(['ok' => true]);

if (mb_strlen($name) < 2) mm_json(['ok' => false, 'error' => 'Συμπληρώστε το ονοματεπώνυμο.'], 422);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) mm_json(['ok' => false, 'error' => 'Το email δεν φαίνεται σωστό.'], 422);
if (mb_strlen($message) < 5) mm_json(['ok' => false, 'error' => 'Γράψτε λίγα λόγια για το έργο.'], 422);

try {
  $ipHash = mm_hash(mm_ip());
  $key = 'contact:' . $ipHash;
  if (mm_rate_count($key, 3600) >= 5) mm_json(['ok' => false, 'error' => 'Έχετε στείλει ήδη αρκετά μηνύματα. Δοκιμάστε αργότερα ή καλέστε μας.'], 429);
  mm_rate_hit($key);

  $db = mm_db();
  $q = $db->prepare('SELECT cc, city FROM geo WHERE ip_hash = ?');
  $q->execute([$ipHash]);
  $geo = $q->fetch() ?: ['cc' => '', 'city' => ''];
  $db->prepare('INSERT INTO msg (ts, name, email, phone, message, cc, city, pid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([time(), $name, $email, $phone, $message, $geo['cc'], $geo['city'], $pid]);
  $id = (int)$db->lastInsertId();
  if ($pid !== '') {
    $db->prepare('INSERT INTO ev (pid, ts, name, label) VALUES (?, ?, ?, ?)')->execute([$pid, time(), 'form', 'Φόρμα επικοινωνίας']);
    $db->prepare('UPDATE pv SET events = events + 1 WHERE pid = ?')->execute([$pid]);
  }
} catch (Throwable $e) {
  error_log('[mm] contact: ' . $e->getMessage());
  mm_json(['ok' => false, 'error' => 'Προσωρινό πρόβλημα. Στείλτε μας email απευθείας.'], 500);
}

// Ειδοποίηση με email (αν αποτύχει, το μήνυμα έχει ήδη αποθηκευτεί)
$S = mm_settings();
$C = mm_content();
$to = $S['notify_email'] !== '' ? $S['notify_email'] : $C['company']['email'];
if (filter_var($to, FILTER_VALIDATE_EMAIL)) {
  $host = preg_replace('/^www\./', '', preg_replace('/[^a-z0-9.\-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost')) ?? 'localhost');
  $clean = fn($s) => preg_replace('/[\r\n]+/', ' ', (string)$s);
  $subject = mb_encode_mimeheader('Νέο μήνυμα από την ιστοσελίδα — ' . $clean($name), 'UTF-8');
  $body = "Νέο μήνυμα από τη φόρμα επικοινωνίας του " . $host . "\n\n"
    . "Όνομα:    " . $name . "\n"
    . "Email:    " . $email . "\n"
    . "Τηλέφωνο: " . ($phone !== '' ? $phone : '—') . "\n"
    . ($geo['city'] ? "Περιοχή:  " . $geo['city'] . "\n" : '')
    . "\n" . $message . "\n\n"
    . "— Δείτε όλα τα μηνύματα: " . mm_base_url() . "/admin/#messages/" . $id . "\n";
  $headers = implode("\r\n", [
    'From: ' . mb_encode_mimeheader('Ιστοσελίδα M&M', 'UTF-8') . ' <no-reply@' . $host . '>',
    'Reply-To: ' . $clean($email),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ]);
  @mail($to, $subject, $body, $headers);
}

mm_json(['ok' => true]);
