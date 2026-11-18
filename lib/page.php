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
$base = mm_base_url();
$url = $base . '/';
$tel = preg_replace('/[^+\d]/', '', $co['phone']) ?? '';
$tel2 = preg_replace('/[^+\d]/', '', $co['phone2']) ?? '';
$realPhone = $tel !== '' && !preg_match('/0{6,}/', $tel);
$lat = is_numeric($co['lat']) ? (float)$co['lat'] : 40.6401;
$lng = is_numeric($co['lng']) ? (float)$co['lng'] : 22.9444;
$coords = sprintf('%.4f° %s · %.4f° %s', abs($lat), $lat >= 0 ? 'N' : 'S', abs($lng), $lng >= 0 ? 'E' : 'W');
$city = trim(preg_split('/[,\n]/u', $co['address'])[0] ?? '');
$mq = '';
foreach ($C['marquee']['items'] as $it) $mq .= '<span>' . e($it) . '</span><b>◆</b>';
$socials = array_filter(['Facebook' => $co['facebook'], 'Instagram' => $co['instagram'], 'LinkedIn' => $co['linkedin']]);
$ogImg = mm_abs_url($seo['og_image']);
$ogSize = @getimagesize(MM_ROOT . '/' . $seo['og_image']) ?: [0, 0];
$heroSizes = '(max-width: 960px) 100vw, 45vw';
$heroSet = mm_img_srcset($h['image'])['set'];

// Structured data (schema.org): η Google καταλαβαίνει ποια είναι η εταιρεία, τι κάνει και πού
$org = array_filter([
  '@type' => 'GeneralContractor',
  '@id' => $url . '#company',
  'name' => $co['name'],
  'url' => $url,
  'logo' => ['@type' => 'ImageObject', 'url' => $base . '/assets/logo/apple-touch-icon.png', 'width' => 180, 'height' => 180],
  'image' => $ogImg,
  'description' => mm_plain($seo['description']),
  'telephone' => $realPhone ? $co['phone'] : null,
  'email' => $co['email'] !== '' ? $co['email'] : null,
  'vatID' => $co['vat'] !== '' ? $co['vat'] : null,
  'address' => array_filter(['@type' => 'PostalAddress', 'addressLocality' => $city, 'addressCountry' => 'GR']),
  'geo' => ['@type' => 'GeoCoordinates', 'latitude' => $lat, 'longitude' => $lng],
  'areaServed' => ['@type' => 'Country', 'name' => 'Ελλάδα'],
  'knowsAbout' => array_map(fn($s) => $s['title'], $sv['items']),
  'hasOfferCatalog' => [
    '@type' => 'OfferCatalog', 'name' => mm_plain($nav['services']),
    'itemListElement' => array_map(fn($s) => ['@type' => 'Offer', 'itemOffered' => ['@type' => 'Service', 'name' => $s['title'], 'description' => mm_plain($s['text'])]], $sv['items']),
  ],
  'sameAs' => $socials ? array_values($socials) : null,
], fn($v) => $v !== null && $v !== '' && $v !== []);
$ld = ['@context' => 'https://schema.org', '@graph' => [
  ['@type' => 'WebSite', '@id' => $url . '#website', 'url' => $url, 'name' => $co['name'], 'inLanguage' => 'el-GR', 'publisher' => ['@id' => $url . '#company']],
  $org,
]];
?><!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title><?= e($seo['title']) ?></title>
  <meta name="description" content="<?= e(mm_plain($seo['description'])) ?>" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="theme-color" content="#0b0b0c" />
  <link rel="canonical" href="<?= e($url) ?>" />

  <meta property="og:type" content="website" />
  <meta property="og:locale" content="el_GR" />
  <meta property="og:site_name" content="<?= e($co['name']) ?>" />
  <meta property="og:title" content="<?= e(mm_plain($seo['og_title'] !== '' ? $seo['og_title'] : $seo['title'])) ?>" />
  <meta property="og:description" content="<?= e(mm_plain($seo['og_description'] !== '' ? $seo['og_description'] : $seo['description'])) ?>" />
  <meta property="og:url" content="<?= e($url) ?>" />
  <meta property="og:image" content="<?= e($ogImg) ?>" />
<?php if ($ogSize[0]): ?>
  <meta property="og:image:width" content="<?= (int)$ogSize[0] ?>" />
  <meta property="og:image:height" content="<?= (int)$ogSize[1] ?>" />
<?php endif; ?>
  <meta property="og:image:alt" content="<?= e($h['image_alt']) ?>" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="<?= e(mm_plain($seo['og_title'] !== '' ? $seo['og_title'] : $seo['title'])) ?>" />
  <meta name="twitter:description" content="<?= e(mm_plain($seo['og_description'] !== '' ? $seo['og_description'] : $seo['description'])) ?>" />
  <meta name="twitter:image" content="<?= e($ogImg) ?>" />
  <meta name="geo.region" content="GR" />
<?php if ($city !== ''): ?>
  <meta name="geo.placename" content="<?= e($city) ?>" />
<?php endif; ?>
  <meta name="geo.position" content="<?= e($lat . ';' . $lng) ?>" />
  <meta name="ICBM" content="<?= e($lat . ', ' . $lng) ?>" />

  <link rel="icon" href="assets/logo/favicon.png" type="image/png" sizes="64x64" />
  <link rel="icon" href="assets/logo/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="assets/logo/apple-touch-icon.png" />

  <link rel="preload" as="image" href="<?= e($h['image']) ?>"<?= $heroSet ? ' imagesrcset="' . e(implode(', ', array_map(fn($s) => $s[0] . ' ' . $s[1] . 'w', $heroSet))) . '" imagesizes="' . e($heroSizes) . '"' : '' ?> fetchpriority="high" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@200;300;400;500&family=Noto+Serif+Display:ital,wght@1,300&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="<?= e(mm_asset('css/style.css')) ?>" />
<?php if ($ADMIN): ?>
  <link rel="stylesheet" href="<?= e(mm_asset('css/admin-dock.css')) ?>" />
<?php endif; ?>
  <noscript><style>.preloader,.cursor,.cursor-dot{display:none!important}.reveal{opacity:1!important;transform:none!important}.hero__title .line>span{transform:none!important}.hero__media{clip-path:none!important}.hero__media img{transform:none!important}</style></noscript>
  <script type="application/ld+json"><?= json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
</head>
<body>
  <a class="skip" href="#about">Μετάβαση στο περιεχόμενο</a>

  <!-- ====== PRELOADER ====== -->
  <div class="preloader" id="preloader" aria-hidden="true">
    <img class="preloader__logo" src="assets/logo/logo.svg" alt="" width="472" height="512" />
    <div class="preloader__bar"><span id="preloaderBar"></span></div>
    <div class="preloader__pct" id="preloaderPct">000</div>
  </div>

  <div class="cursor" id="cursor" aria-hidden="true"></div>
  <div class="cursor-dot" id="cursorDot" aria-hidden="true"></div>
  <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>

  <!-- ====== HEADER ====== -->
  <header class="header" id="header">
    <a href="#top" class="brand" aria-label="<?= e($co['name']) ?> — Αρχική">
      <img class="brand__emblem" src="assets/logo/logo-mark.svg" alt="" width="314" height="318" />
      <img class="brand__word" src="assets/logo/logo-wordmark.svg" alt="M&amp;M" width="472" height="152" />
      <span class="brand__text"<?= ed('company.tagline') ?>><?= e($co['tagline']) ?></span>
    </a>
    <nav class="nav" id="nav" aria-label="Κύριο μενού">
      <a href="#about" data-magnetic<?= ed('nav.about') ?>><?= e($nav['about']) ?></a>
      <a href="#services" data-magnetic<?= ed('nav.services') ?>><?= e($nav['services']) ?></a>
      <a href="#projects" data-magnetic<?= ed('nav.projects') ?>><?= e($nav['projects']) ?></a>
      <a href="#process" data-magnetic<?= ed('nav.process') ?>><?= e($nav['process']) ?></a>
      <a href="#fleet" data-magnetic<?= ed('nav.fleet') ?>><?= e($nav['fleet']) ?></a>
      <a href="#contact" class="nav__cta" data-magnetic<?= ed('nav.contact') ?>><?= e($nav['contact']) ?></a>
    </nav>
    <button class="burger" id="burger" type="button" aria-label="Μενού" aria-expanded="false" aria-controls="nav"><span></span><span></span></button>
  </header>

  <main id="top">

    <!-- ====== HERO ====== -->
    <section class="hero" id="hero" data-section="hero">
      <canvas id="blueprint" class="hero__canvas" aria-hidden="true"></canvas>
      <div class="hero__media">
        <img src="<?= e($h['image']) ?>" alt="<?= e($h['image_alt']) ?>" fetchpriority="high"<?= mm_img($h['image'], $heroSizes) ?><?= ed('hero.image', 'image') ?> />
        <div class="hero__media-tag">
          <span class="dot"></span> <span<?= ed('hero.tag') ?>><?= e($h['tag']) ?></span>
        </div>
      </div>
      <div class="hero__content">
        <h1 class="hero__title"<?= ed('hero.title', 'title') ?>>
          <span class="eyebrow reveal"<?= ed('hero.eyebrow') ?>><?= e($h['eyebrow']) ?></span>
<?php $lines = mm_lines($h['title']); $n = count($lines); foreach ($lines as $i => $ln): ?>
          <span class="line"><span<?= ($n > 1 && $i === $n - 1) ? ' class="gold"' : '' ?>><?= rich($ln) ?></span></span>
<?php endforeach; ?>
        </h1>
        <p class="hero__lead reveal"<?= ed('hero.lead', 'rich') ?>><?= rich($h['lead']) ?></p>
        <div class="hero__actions reveal">
          <a href="#projects" class="btn btn--gold" data-magnetic data-track="cta"><span<?= ed('hero.cta_primary') ?>><?= e($h['cta_primary']) ?></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
          <a href="#contact" class="btn btn--ghost" data-magnetic data-track="cta"><span<?= ed('hero.cta_secondary') ?>><?= e($h['cta_secondary']) ?></span></a>
        </div>
      </div>
      <div class="hero__coords" id="coords" data-lat="<?= e((string)$lat) ?>" data-lng="<?= e((string)$lng) ?>" aria-hidden="true"><?= e($coords) ?></div>
      <a href="#about" class="hero__scroll" aria-label="Κύλιση στο περιεχόμενο"><span>SCROLL</span><i></i></a>
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
            <div class="stat__num"><span data-count="<?= (int)$st['value'] ?>"<?= ed("about.stats.$i.value", 'number') ?>><?= (int)$st['value'] ?></span><span<?= ed("about.stats.$i.suffix") ?>><?= e($st['suffix']) ?></span></div>
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
            <div class="service__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><?= mm_icon($it['icon']) ?></svg></div>
            <span class="service__no" aria-hidden="true"><?= sprintf('%02d', $i + 1) ?></span>
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
          <div class="filters reveal" id="filters" role="group" aria-label="Φίλτρο έργων">
            <button type="button" class="active" data-filter="all" aria-pressed="true"><?= e($pj['filter_all']) ?></button>
<?php foreach ($pj['categories'] as $cat): ?>
            <button type="button" data-filter="<?= e($cat['key']) ?>" aria-pressed="false"><?= e($cat['label']) ?></button>
<?php endforeach; ?>
          </div>
        </div>
        <div class="projects__grid" id="projectsGrid">
<?php foreach ($pj['items'] as $i => $it): $cat = mm_find_cat($pj['categories'], $it['cat']); $size = $it['size'] === 'tall' ? ' project--tall' : ($it['size'] === 'wide' ? ' project--wide' : ''); ?>
          <figure class="project<?= $size ?> reveal" data-cat="<?= e($it['cat']) ?>">
            <img src="<?= e($it['image']) ?>" alt="<?= e($it['alt'] !== '' ? $it['alt'] : $it['title']) ?>" loading="lazy" decoding="async"<?= mm_img($it['image'], $it['size'] === 'wide' ? '(max-width: 1000px) 100vw, 840px' : '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 420px') ?><?= ed("projects.items.$i.image", 'image') ?> />
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
        <div class="ba reveal" id="ba" role="img" aria-label="<?= e('Σύγκριση πριν και μετά: ' . mm_plain($cm['label_before']) . ' / ' . mm_plain($cm['label_after'])) ?>">
          <img src="<?= e($cm['after']) ?>" alt="<?= e('Μετά — ' . mm_plain($cm['label_after'])) ?>" class="ba__after" loading="lazy" decoding="async"<?= mm_img($cm['after'], '(max-width: 860px) 100vw, 640px') ?><?= ed('compare.after', 'image') ?> />
          <div class="ba__before" id="baBefore"><img src="<?= e($cm['before']) ?>" alt="<?= e('Πριν — ' . mm_plain($cm['label_before'])) ?>" loading="lazy" decoding="async"<?= mm_img($cm['before'], '(max-width: 860px) 100vw, 640px') ?><?= ed('compare.before', 'image') ?> /></div>
          <div class="ba__handle" id="baHandle" aria-hidden="true"><span>⟷</span></div>
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
        <ol class="timeline" id="timeline">
          <li class="timeline__line" aria-hidden="true"><span id="timelineFill"></span></li>
<?php foreach ($pr['steps'] as $i => $st): ?>
          <li class="step reveal"><b aria-hidden="true"><?= sprintf('%02d', $i + 1) ?></b><h3<?= ed("process.steps.$i.title") ?>><?= e($st['title']) ?></h3><p<?= ed("process.steps.$i.text", 'rich') ?>><?= rich($st['text']) ?></p></li>
<?php endforeach; ?>
        </ol>
      </div>
    </section>

    <!-- ====== FLEET ====== -->
    <section class="section fleet" id="fleet" data-section="fleet">
      <div class="container fleet__grid">
        <div class="fleet__media reveal" data-parallax>
          <img src="<?= e($fl['image']) ?>" alt="<?= e($fl['image_alt']) ?>" loading="lazy" decoding="async"<?= mm_img($fl['image'], '(max-width: 860px) 100vw, 600px') ?><?= ed('fleet.image', 'image') ?> />
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
          <address class="contact__info">
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
<?php foreach ($socials as $name => $surl): ?>
              <a href="<?= e($surl) ?>" target="_blank" rel="noopener" data-track="social"><?= e($name) ?> ↗</a>
<?php endforeach; ?>
            </div>
<?php endif; ?>
          </address>
        </div>
        <form class="form reveal" id="contactForm" action="api/contact.php" method="POST" novalidate>
          <div class="field"><input type="text" name="name" id="f-name" required maxlength="120" autocomplete="name" placeholder=" " /><label for="f-name"<?= ed('contact.form_name') ?>><?= e($ct['form_name']) ?></label></div>
          <div class="field"><input type="email" name="email" id="f-email" required maxlength="160" autocomplete="email" inputmode="email" placeholder=" " /><label for="f-email"<?= ed('contact.form_email') ?>><?= e($ct['form_email']) ?></label></div>
          <div class="field"><input type="tel" name="phone" id="f-phone" maxlength="40" autocomplete="tel" inputmode="tel" placeholder=" " /><label for="f-phone"<?= ed('contact.form_phone') ?>><?= e($ct['form_phone']) ?></label></div>
          <div class="field"><textarea name="message" id="f-msg" rows="4" required maxlength="5000" placeholder=" "></textarea><label for="f-msg"<?= ed('contact.form_message') ?>><?= e($ct['form_message']) ?></label></div>
          <div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
          <button type="submit" class="btn btn--gold btn--full" data-magnetic><span<?= ed('contact.form_submit') ?>><?= e($ct['form_submit']) ?></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          <p class="form__status" id="formStatus" role="status" aria-live="polite" data-success="<?= e($ct['form_success']) ?>" data-email="<?= e($co['email']) ?>"></p>
        </form>
      </div>
    </section>
  </main>

  <!-- ====== FOOTER ====== -->
  <footer class="footer">
    <div class="container footer__inner">
      <div class="brand brand--footer">
        <img class="brand__emblem" src="assets/logo/logo-mark.svg" alt="" width="314" height="318" loading="lazy" />
        <img class="brand__word" src="assets/logo/logo-wordmark.svg" alt="M&amp;M" width="472" height="152" loading="lazy" />
      </div>
      <p>© <span id="year"><?= date('Y') ?></span> <span<?= ed('footer.copyright') ?>><?= e($C['footer']['copyright']) ?></span></p>
      <div class="footer__end">
        <a href="#top" class="footer__top" data-magnetic>↑ Αρχή</a>
        <button type="button" class="footer__key" id="adminKey" aria-label="Σύνδεση διαχειριστή"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></button>
      </div>
    </div>
  </footer>

  <!-- ====== LIGHTBOX ====== -->
  <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Προβολή έργου" aria-hidden="true">
    <button type="button" class="lightbox__close" id="lbClose" aria-label="Κλείσιμο">✕</button>
    <button type="button" class="lightbox__nav lightbox__prev" id="lbPrev" aria-label="Προηγούμενη">‹</button>
    <img id="lbImg" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="" width="1200" height="1600" />
    <button type="button" class="lightbox__nav lightbox__next" id="lbNext" aria-label="Επόμενη">›</button>
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
