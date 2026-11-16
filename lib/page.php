<?php
/* =========================================================
   M&M — Template της δημόσιας σελίδας
   Καλείται από το /index.php. Μεταβλητές: $C (περιεχόμενο),
   $S (ρυθμίσεις), $ADMIN (στοιχεία admin ή null).
   ========================================================= */
declare(strict_types=1);

$co = $C['company'];
$seo = $C['seo'];
$nav = $C['nav'];
$h = $C['hero'];
$ab = $C['about'];
$sv = $C['services'];
$pj = $C['projects'];
$cm = $C['compare'];
$pr = $C['process'];
$fl = $C['fleet'];
$ct = $C['contact'];
$tel = preg_replace('/[^+\d]/', '', $co['phone']) ?? '';
$tel2 = preg_replace('/[^+\d]/', '', $co['phone2']) ?? '';
$lat = is_numeric($co['lat']) ? (float)$co['lat'] : 40.6401;
$lng = is_numeric($co['lng']) ? (float)$co['lng'] : 22.9444;
$coords = sprintf('%.4f° %s · %.4f° %s', abs($lat), $lat >= 0 ? 'N' : 'S', abs($lng), $lng >= 0 ? 'E' : 'W');
$mq = '';
foreach ($C['marquee']['items'] as $it) $mq .= '<span>' . e($it) . '</span><b>◆</b>';
$socials = array_filter(['Facebook' => $co['facebook'], 'Instagram' => $co['instagram'], 'LinkedIn' => $co['linkedin']]);
?><!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= e($seo['title']) ?></title>
  <meta name="description" content="<?= e($seo['description']) ?>" />
  <meta name="theme-color" content="#0b0b0c" />
  <link rel="canonical" href="<?= e(mm_base_url() . '/') ?>" />

  <meta property="og:title" content="<?= e($seo['og_title']) ?>" />
  <meta property="og:description" content="<?= e($seo['og_description']) ?>" />
  <meta property="og:image" content="<?= e(mm_abs_url($seo['og_image'])) ?>" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="<?= e(mm_base_url() . '/') ?>" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="icon" href="assets/logo/favicon.png" type="image/png" sizes="64x64" />
  <link rel="icon" href="assets/logo/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="assets/logo/apple-touch-icon.png" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@200;300;400;500;600;700;800&family=Noto+Serif+Display:ital,wght@1,300;1,400&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="<?= e(mm_asset('css/style.css')) ?>" />
<?php if ($ADMIN): ?>
  <link rel="stylesheet" href="<?= e(mm_asset('css/admin-dock.css')) ?>" />
<?php endif; ?>
  <script type="application/ld+json"><?= json_encode([
    '@context' => 'https://schema.org', '@type' => 'GeneralContractor', 'name' => $co['name'],
    'url' => mm_base_url() . '/', 'telephone' => $co['phone'], 'email' => $co['email'],
    'address' => ['@type' => 'PostalAddress', 'addressLocality' => $co['address']],
    'image' => mm_abs_url($seo['og_image']), 'sameAs' => array_values($socials),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
</head>
<body>

  <!-- ====== PRELOADER ====== -->
  <div class="preloader" id="preloader">
    <img class="preloader__logo" src="assets/logo/logo.svg" alt="<?= e($co['name']) ?>" width="472" height="512" />
    <div class="preloader__bar"><span id="preloaderBar"></span></div>
    <div class="preloader__pct" id="preloaderPct">000</div>
  </div>

  <div class="cursor" id="cursor"></div>
  <div class="cursor-dot" id="cursorDot"></div>
  <div class="scroll-progress" id="scrollProgress"></div>

  <!-- ====== HEADER ====== -->
  <header class="header" id="header">
    <a href="#top" class="brand" aria-label="<?= e($co['name']) ?> — Αρχική">
      <img class="brand__emblem" src="assets/logo/logo-mark.svg" alt="" width="314" height="318" />
      <img class="brand__word" src="assets/logo/logo-wordmark.svg" alt="M&amp;M" width="472" height="152" />
      <span class="brand__text"<?= ed('company.tagline') ?>><?= e($co['tagline']) ?></span>
    </a>
    <nav class="nav" id="nav">
      <a href="#about" data-magnetic<?= ed('nav.about') ?>><?= e($nav['about']) ?></a>
      <a href="#services" data-magnetic<?= ed('nav.services') ?>><?= e($nav['services']) ?></a>
      <a href="#projects" data-magnetic<?= ed('nav.projects') ?>><?= e($nav['projects']) ?></a>
      <a href="#process" data-magnetic<?= ed('nav.process') ?>><?= e($nav['process']) ?></a>
      <a href="#fleet" data-magnetic<?= ed('nav.fleet') ?>><?= e($nav['fleet']) ?></a>
      <a href="#contact" class="nav__cta" data-magnetic<?= ed('nav.contact') ?>><?= e($nav['contact']) ?></a>
    </nav>
    <button class="burger" id="burger" aria-label="Μενού"><span></span><span></span></button>
  </header>

  <main id="top">

    <!-- ====== HERO ====== -->
    <section class="hero" id="hero" data-section="hero">
      <canvas id="blueprint" class="hero__canvas"></canvas>
      <div class="hero__media">
        <img src="<?= e($h['image']) ?>" alt="<?= e($h['image_alt']) ?>"<?= ed('hero.image', 'image') ?> />
        <div class="hero__media-tag">
          <span class="dot"></span> <span<?= ed('hero.tag') ?>><?= e($h['tag']) ?></span>
        </div>
      </div>
      <div class="hero__content">
        <p class="eyebrow reveal"<?= ed('hero.eyebrow') ?>><?= e($h['eyebrow']) ?></p>
        <h1 class="hero__title"<?= ed('hero.title', 'title') ?>>
<?php $lines = mm_lines($h['title']); $n = count($lines); foreach ($lines as $i => $ln): ?>
          <span class="line"><span<?= ($n > 1 && $i === $n - 1) ? ' class="gold"' : '' ?>><?= rich($ln) ?></span></span>
<?php endforeach; ?>
        </h1>
        <p class="hero__lead reveal"<?= ed('hero.lead', 'rich') ?>><?= rich($h['lead']) ?></p>
        <div class="hero__actions reveal">
          <a href="#projects" class="btn btn--gold" data-magnetic data-track="cta"><span<?= ed('hero.cta_primary') ?>><?= e($h['cta_primary']) ?></span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          <a href="#contact" class="btn btn--ghost" data-magnetic data-track="cta"><span<?= ed('hero.cta_secondary') ?>><?= e($h['cta_secondary']) ?></span></a>
        </div>
      </div>
      <div class="hero__coords" id="coords" data-lat="<?= e((string)$lat) ?>" data-lng="<?= e((string)$lng) ?>"><?= e($coords) ?></div>
      <a href="#about" class="hero__scroll"><span>SCROLL</span><i></i></a>
    </section>

    <!-- ====== MARQUEE ====== -->
    <div class="marquee" aria-hidden="true" data-section="marquee">
      <div class="marquee__track"><?= $mq . $mq ?></div>
    </div>

    <!-- ====== ABOUT + STATS ====== -->
    <section class="section about" id="about" data-section="about">
      <div class="container about__grid">
        <div class="about__text">
          <p class="eyebrow reveal"<?= ed('about.eyebrow') ?>><?= e($ab['eyebrow']) ?></p>
          <h2 class="h2 reveal"<?= ed('about.title', 'rich') ?>><?= rich($ab['title']) ?></h2>
          <p class="reveal"<?= ed('about.p1', 'rich') ?>><?= rich($ab['p1']) ?></p>
<?php if ($ab['p2'] !== ''): ?>
          <p class="reveal"<?= ed('about.p2', 'rich') ?>><?= rich($ab['p2']) ?></p>
<?php endif; ?>
        </div>
        <div class="stats">
<?php foreach ($ab['stats'] as $i => $st): ?>
          <div class="stat reveal" data-tilt>
            <div class="stat__num"><span data-count="<?= (int)$st['value'] ?>"<?= ed("about.stats.$i.value", 'number') ?>>0</span><span<?= ed("about.stats.$i.suffix") ?>><?= e($st['suffix']) ?></span></div>
            <div class="stat__label"<?= ed("about.stats.$i.label") ?>><?= e($st['label']) ?></div>
          </div>
<?php endforeach; ?>
        </div>
      </div>
    </section>

    <!-- ====== SERVICES ====== -->
    <section class="section services" id="services" data-section="services">
      <div class="container">
        <div class="section__head">
          <p class="eyebrow reveal"<?= ed('services.eyebrow') ?>><?= e($sv['eyebrow']) ?></p>
          <h2 class="h2 reveal"<?= ed('services.title', 'rich') ?>><?= rich($sv['title']) ?></h2>
        </div>
        <div class="services__grid">
<?php foreach ($sv['items'] as $i => $it): ?>
          <article class="service reveal" data-tilt>
            <div class="service__icon"><svg viewBox="0 0 48 48"><?= mm_icon($it['icon']) ?></svg></div>
            <span class="service__no"><?= sprintf('%02d', $i + 1) ?></span>
            <h3<?= ed("services.items.$i.title") ?>><?= e($it['title']) ?></h3>
            <p<?= ed("services.items.$i.text", 'rich') ?>><?= rich($it['text']) ?></p>
          </article>
<?php endforeach; ?>
        </div>
      </div>
    </section>

    <!-- ====== PROJECTS ====== -->
    <section class="section projects" id="projects" data-section="projects">
      <div class="container">
        <div class="section__head section__head--row">
          <div>
            <p class="eyebrow reveal"<?= ed('projects.eyebrow') ?>><?= e($pj['eyebrow']) ?></p>
            <h2 class="h2 reveal"<?= ed('projects.title', 'rich') ?>><?= rich($pj['title']) ?></h2>
          </div>
          <div class="filters reveal" id="filters">
            <button class="active" data-filter="all"><?= e($pj['filter_all']) ?></button>
<?php foreach ($pj['categories'] as $cat): ?>
            <button data-filter="<?= e($cat['key']) ?>"><?= e($cat['label']) ?></button>
<?php endforeach; ?>
          </div>
        </div>
        <div class="projects__grid" id="projectsGrid">
<?php foreach ($pj['items'] as $i => $it): $cat = mm_find_cat($pj['categories'], $it['cat']); $size = $it['size'] === 'tall' ? ' project--tall' : ($it['size'] === 'wide' ? ' project--wide' : ''); ?>
          <figure class="project<?= $size ?> reveal" data-cat="<?= e($it['cat']) ?>">
            <img src="<?= e($it['image']) ?>" alt="<?= e($it['alt']) ?>" loading="lazy"<?= ed("projects.items.$i.image", 'image') ?> />
            <figcaption><span><?= e($cat['tag']) ?></span><h3<?= ed("projects.items.$i.title") ?>><?= e($it['title']) ?></h3></figcaption>
          </figure>
<?php endforeach; ?>
        </div>
      </div>
    </section>

    <!-- ====== BEFORE / AFTER ====== -->
    <section class="section compare" id="compare" data-section="compare">
      <div class="container compare__grid">
        <div>
          <p class="eyebrow reveal"<?= ed('compare.eyebrow') ?>><?= e($cm['eyebrow']) ?></p>
          <h2 class="h2 reveal"<?= ed('compare.title', 'rich') ?>><?= rich($cm['title']) ?></h2>
          <p class="reveal"<?= ed('compare.text', 'rich') ?>><?= rich($cm['text']) ?></p>
        </div>
        <div class="ba reveal" id="ba">
          <img src="<?= e($cm['after']) ?>" alt="Μετά" class="ba__after"<?= ed('compare.after', 'image') ?> />
          <div class="ba__before" id="baBefore"><img src="<?= e($cm['before']) ?>" alt="Πριν"<?= ed('compare.before', 'image') ?> /></div>
          <div class="ba__handle" id="baHandle"><span>⟷</span></div>
          <span class="ba__label ba__label--l"<?= ed('compare.label_before') ?>><?= e($cm['label_before']) ?></span>
          <span class="ba__label ba__label--r"<?= ed('compare.label_after') ?>><?= e($cm['label_after']) ?></span>
        </div>
      </div>
    </section>

    <!-- ====== PROCESS ====== -->
    <section class="section process" id="process" data-section="process">
      <div class="container">
        <div class="section__head">
          <p class="eyebrow reveal"<?= ed('process.eyebrow') ?>><?= e($pr['eyebrow']) ?></p>
          <h2 class="h2 reveal"<?= ed('process.title', 'rich') ?>><?= rich($pr['title']) ?></h2>
        </div>
        <div class="timeline" id="timeline">
          <div class="timeline__line"><span id="timelineFill"></span></div>
<?php foreach ($pr['steps'] as $i => $st): ?>
          <div class="step reveal"><b><?= sprintf('%02d', $i + 1) ?></b><h3<?= ed("process.steps.$i.title") ?>><?= e($st['title']) ?></h3><p<?= ed("process.steps.$i.text", 'rich') ?>><?= rich($st['text']) ?></p></div>
<?php endforeach; ?>
        </div>
      </div>
    </section>

    <!-- ====== FLEET ====== -->
    <section class="section fleet" id="fleet" data-section="fleet">
      <div class="container fleet__grid">
        <div class="fleet__media reveal" data-parallax>
          <img src="<?= e($fl['image']) ?>" alt="<?= e($fl['image_alt']) ?>" loading="lazy"<?= ed('fleet.image', 'image') ?> />
        </div>
        <div class="fleet__text">
          <p class="eyebrow reveal"<?= ed('fleet.eyebrow') ?>><?= e($fl['eyebrow']) ?></p>
          <h2 class="h2 reveal"<?= ed('fleet.title', 'rich') ?>><?= rich($fl['title']) ?></h2>
          <p class="reveal"<?= ed('fleet.text', 'rich') ?>><?= rich($fl['text']) ?></p>
          <ul class="fleet__list">
<?php foreach ($fl['items'] as $i => $it): ?>
            <li class="reveal"><span<?= ed("fleet.items.$i.name") ?>><?= e($it['name']) ?></span><em<?= ed("fleet.items.$i.detail") ?>><?= e($it['detail']) ?></em></li>
<?php endforeach; ?>
          </ul>
        </div>
      </div>
    </section>

    <!-- ====== CONTACT ====== -->
    <section class="section contact" id="contact" data-section="contact">
      <div class="container contact__grid">
        <div>
          <p class="eyebrow reveal"<?= ed('contact.eyebrow') ?>><?= e($ct['eyebrow']) ?></p>
          <h2 class="h2 h2--xl reveal"<?= ed('contact.title', 'rich') ?>><?= rich($ct['title'], 'gold') ?></h2>
          <div class="contact__info">
            <a href="tel:<?= e($tel) ?>" class="reveal" data-magnetic><small<?= ed('contact.label_phone') ?>><?= e($ct['label_phone']) ?></small><span<?= ed('company.phone') ?>><?= e($co['phone']) ?></span></a>
<?php if ($co['phone2'] !== ''): ?>
            <a href="tel:<?= e($tel2) ?>" class="reveal" data-magnetic><small><?= e($ct['label_phone']) ?> 2</small><span<?= ed('company.phone2') ?>><?= e($co['phone2']) ?></span></a>
<?php endif; ?>
            <a href="mailto:<?= e($co['email']) ?>" class="reveal" data-magnetic><small<?= ed('contact.label_email') ?>><?= e($ct['label_email']) ?></small><span<?= ed('company.email') ?>><?= e($co['email']) ?></span></a>
            <div class="reveal"><small<?= ed('contact.label_address') ?>><?= e($ct['label_address']) ?></small><span<?= ed('company.address', 'rich') ?>><?= rich($co['address']) ?></span></div>
<?php if ($co['hours'] !== ''): ?>
            <div class="reveal"><small<?= ed('contact.label_hours') ?>><?= e($ct['label_hours']) ?></small><span<?= ed('company.hours', 'rich') ?>><?= rich($co['hours']) ?></span></div>
<?php endif; ?>
<?php if ($socials): ?>
            <div class="contact__social reveal">
<?php foreach ($socials as $name => $url): ?>
              <a href="<?= e($url) ?>" target="_blank" rel="noopener" data-track="social"><?= e($name) ?> ↗</a>
<?php endforeach; ?>
            </div>
<?php endif; ?>
          </div>
        </div>
        <form class="form reveal" id="contactForm" action="api/contact.php" method="POST" novalidate>
          <div class="field"><input type="text" name="name" id="f-name" required maxlength="120" placeholder=" " /><label for="f-name"<?= ed('contact.form_name') ?>><?= e($ct['form_name']) ?></label></div>
          <div class="field"><input type="email" name="email" id="f-email" required maxlength="160" placeholder=" " /><label for="f-email"<?= ed('contact.form_email') ?>><?= e($ct['form_email']) ?></label></div>
          <div class="field"><input type="tel" name="phone" id="f-phone" maxlength="40" placeholder=" " /><label for="f-phone"<?= ed('contact.form_phone') ?>><?= e($ct['form_phone']) ?></label></div>
          <div class="field"><textarea name="message" id="f-msg" rows="4" required maxlength="5000" placeholder=" "></textarea><label for="f-msg"<?= ed('contact.form_message') ?>><?= e($ct['form_message']) ?></label></div>
          <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
          <button type="submit" class="btn btn--gold btn--full" data-magnetic><span<?= ed('contact.form_submit') ?>><?= e($ct['form_submit']) ?></span><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          <p class="form__status" id="formStatus" data-success="<?= e($ct['form_success']) ?>" data-email="<?= e($co['email']) ?>"></p>
        </form>
      </div>
    </section>
  </main>

  <!-- ====== FOOTER ====== -->
  <footer class="footer">
    <div class="container footer__inner">
      <div class="brand brand--footer">
        <img class="brand__emblem" src="assets/logo/logo-mark.svg" alt="" width="314" height="318" />
        <img class="brand__word" src="assets/logo/logo-wordmark.svg" alt="M&amp;M" width="472" height="152" />
      </div>
      <p>© <span id="year"></span> <span<?= ed('footer.copyright') ?>><?= e($C['footer']['copyright']) ?></span></p>
      <div class="footer__end">
        <a href="#top" class="footer__top" data-magnetic>↑ Αρχή</a>
        <button type="button" class="footer__key" id="adminKey" aria-label="Σύνδεση διαχειριστή"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></button>
      </div>
    </div>
  </footer>

  <!-- ====== LIGHTBOX ====== -->
  <div class="lightbox" id="lightbox" aria-hidden="true">
    <button class="lightbox__close" id="lbClose" aria-label="Κλείσιμο">✕</button>
    <button class="lightbox__nav lightbox__prev" id="lbPrev" aria-label="Προηγούμενη">‹</button>
    <img id="lbImg" alt="" />
    <button class="lightbox__nav lightbox__next" id="lbNext" aria-label="Επόμενη">›</button>
    <p class="lightbox__cap" id="lbCap"></p>
  </div>

  <script src="<?= e(mm_asset('js/main.js')) ?>"></script>
<?php if (!$ADMIN || $S['track_admin']): ?>
  <script src="<?= e(mm_asset('js/track.js')) ?>" data-dnt="<?= $S['respect_dnt'] ? '1' : '0' ?>" defer></script>
<?php endif; ?>
<?php if ($ADMIN): ?>
  <script>window.MM_ADMIN = <?= json_encode(['csrf' => $ADMIN['csrf'], 'user' => $ADMIN['user'], 'api' => 'admin/api.php', 'maintenance' => (bool)$S['maintenance']], JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) ?>;</script>
  <script src="<?= e(mm_asset('admin/assets/schema.js')) ?>"></script>
  <script src="<?= e(mm_asset('js/admin-dock.js')) ?>"></script>
<?php endif; ?>
</body>
</html>
