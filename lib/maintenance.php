<?php
/* M&M — Σελίδα «Λειτουργία συντήρησης» (τη βλέπουν οι επισκέπτες, όχι ο admin) */
declare(strict_types=1);
http_response_code(503);
header('Retry-After: 3600');
header('Cache-Control: no-store');
?><!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title><?= e($S['maintenance_title']) ?> · M&amp;M Τεχνικά Έργα</title>
  <link rel="icon" href="assets/logo/favicon.svg" type="image/svg+xml" />
  <link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@300;500&display=swap" rel="stylesheet" />
  <style>
    :root { --bg: #0b0b0c; --text: #f2efe8; --muted: #9a968d; --gold: #c8b378; }
    * { box-sizing: border-box; margin: 0; }
    body { min-height: 100vh; display: grid; place-items: center; background: radial-gradient(800px 500px at 50% 35%, rgba(200,179,120,.10), transparent 70%), var(--bg); color: var(--text); font-family: Commissioner, system-ui, sans-serif; font-weight: 300; text-align: center; padding: 2rem 1rem; }
    img { width: clamp(130px, 22vw, 190px); height: auto; margin: 0 auto 2.5rem; display: block; animation: in 1.2s cubic-bezier(.22,1,.36,1) both; }
    h1 { font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 300; letter-spacing: -.02em; margin-bottom: 1rem; }
    p { color: var(--muted); max-width: 32rem; margin: 0 auto; line-height: 1.7; }
    .bar { width: 160px; height: 1px; margin: 2rem auto 0; background: linear-gradient(90deg, transparent, var(--gold), transparent); animation: pulse 2.4s ease-in-out infinite; }
    @keyframes in { from { opacity: 0; transform: translateY(12px); } }
    @keyframes pulse { 50% { opacity: .3; } }
  </style>
</head>
<body>
  <main>
    <img src="assets/logo/logo.svg" alt="M&amp;M Τεχνικά Έργα" width="472" height="512" />
    <h1><?= e($S['maintenance_title']) ?></h1>
    <p><?= nl2br(e($S['maintenance_text'])) ?></p>
    <div class="bar"></div>
  </main>
</body>
</html>
