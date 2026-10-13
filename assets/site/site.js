// Replaces the Squarespace runtime: everything the Mojave template needed JavaScript for.
(function () {
  'use strict';

  var body = document.body;
  var site = document.querySelector('.Site');

  // Squarespace crops "fill" images around a focal point: scale to cover, then centre the focal
  // point in the frame without exposing an edge. Reproduced exactly so crops match the original.
  function focal(img) {
    var fp = (img.getAttribute('data-image-focal-point') || '0.5,0.5').split(',');
    return [parseFloat(fp[0]) || 0.5, parseFloat(fp[1]) || 0.5];
  }

  function cropToFill(img, cw, ch) {
    var dims = (img.getAttribute('data-image-dimensions') || '').split('x');
    var iw = parseFloat(dims[0]) || img.naturalWidth, ih = parseFloat(dims[1]) || img.naturalHeight;
    if (!iw || !ih || !cw || !ch) return;
    var scale = Math.max(cw / iw, ch / ih), w = iw * scale, h = ih * scale, fp = focal(img);
    var left = Math.min(0, Math.max(cw - w, cw / 2 - fp[0] * w));
    var top = Math.min(0, Math.max(ch - h, ch / 2 - fp[1] * h));
    img.style.cssText += ';position:relative;font-size:0;max-width:none;width:' + w + 'px;height:' + h + 'px;left:' + left + 'px;top:' + top + 'px';
  }

  var fills = [];
  function layoutFills() {
    fills.forEach(function (f) {
      var r = f.box.getBoundingClientRect();
      cropToFill(f.img, r.width, r.height);
    });
  }

  // Images: Squarespace ships <img data-src> and lets its ImageLoader pick a size.
  // The mirror keeps one large rendition per image, so load it directly.
  function loadImage(img) {
    var src = img.getAttribute('data-src') || img.getAttribute('data-image');
    if (!src) return;
    var box = img.closest('.content-fill, .Index-page-image');
    if (box) {
      box.style.overflow = 'hidden';
      fills.push({ img: img, box: box });
    }
    img.addEventListener('load', function () {
      img.classList.add('loaded');
      var fig = img.closest('.Index-page-image');
      if (fig) fig.classList.add('loaded');
      layoutFills();
    });
    img.setAttribute('src', src);
    img.setAttribute('data-load', 'true');
  }

  // Parallax: each section's background figure lives in a layer behind the page that tracks the
  // section; the figure drifts at half the scroll speed (Squarespace's "new math" parallax).
  var parallax = [];
  function setupParallax() {
    if (!body.classList.contains('tweak-overlay-parallax-enabled')) return;
    body.classList.add('has-parallax-images', 'parallax-item-positioning-method-absolute');
    document.querySelectorAll('[data-parallax-original-element]').forEach(function (section) {
      var id = section.getAttribute('data-parallax-id');
      var item = document.querySelector('.Parallax-item[data-parallax-id="' + id + '"]');
      var fig = section.querySelector('[data-parallax-image-wrapper]');
      if (!item || !fig) return;
      item.appendChild(fig);
      parallax.push({ section: section, item: item, fig: fig });
    });
  }

  function layoutParallax() {
    var host = document.querySelector('[data-parallax-host]');
    if (!host) return;
    var h = host.getBoundingClientRect(), vh = window.innerHeight;
    parallax.forEach(function (p) {
      var r = p.section.getBoundingClientRect();
      p.item.style.top = (r.top - h.top) + 'px';
      p.item.style.left = (r.left - h.left) + 'px';
      p.item.style.width = r.width + 'px';
      p.item.style.height = r.height + 'px';
      p.fig.style.overflow = 'hidden';
      p.fig.style.bottom = -Math.max(0, (vh - r.height) / 2) + 'px';
    });
    layoutFills();
    scrollParallax();
  }

  function scrollParallax() {
    parallax.forEach(function (p) {
      var top = p.section.getBoundingClientRect().top;
      p.fig.style.transform = 'translate3d(0,' + (-0.5 * top) + 'px,0)';
    });
  }

  // Header and mobile bar: body classes such as ancillary-header-branding-position-top-center
  // say which container each element belongs in ("hide" removes it).
  function placeAncillary(group, prefix) {
    if (!group) return;
    group.querySelectorAll('[data-nc-element]').forEach(function (el) {
      var name = el.getAttribute('data-nc-element');
      var m = body.className.match(new RegExp('(?:^|\\s)' + prefix + name + '-position-([a-z-]+)'));
      if (!m) return;
      if (m[1] === 'hide') { el.remove(); return; }
      var target = group.querySelector('[data-nc-container="' + m[1] + '"]');
      if (target) target.appendChild(el);
    });
  }

  // Image-card text (titles, captions, buttons) is styled very large and scaled down by
  // Squarespace so the longest title on the page fits on one line; every card on the page then
  // shares that scale: font-size: max(0.75rem, N%).
  function fitDynamicText() {
    // Card blocks narrower than 400px stack the image above the text
    document.querySelectorAll('.image-block-outer-wrapper').forEach(function (fig) {
      fig.classList.remove('sqs-narrow-width');
      if (fig.getBoundingClientRect().width < 400) fig.classList.add('sqs-narrow-width');
    });
    var all = document.querySelectorAll('.sqs-dynamic-text');
    if (!all.length) return;
    all.forEach(function (el) { el.style.fontSize = ''; });
    var pct = 100;
    document.querySelectorAll('.image-title.sqs-dynamic-text').forEach(function (el) {
      var avail = el.getBoundingClientRect().width;
      el.classList.add('dynamic-text-measure');
      var natural = el.scrollWidth;
      el.classList.remove('dynamic-text-measure');
      if (avail && natural) pct = Math.min(pct, Math.floor(avail / natural * 1000) / 10);
    });
    all.forEach(function (el) {
      el.setAttribute('data-width-percentage', pct);
      el.style.fontSize = 'max(0.75rem, ' + pct + '%)';
    });
  }

  // Grid gallery blocks: column widths come from site.css once the grid classes are present;
  // gutter and thumbnail aspect ratio come from the block's settings.
  var ASPECTS = { square: '1 / 1', 'standard': '4 / 3', 'standard-vertical': '3 / 4', widescreen: '16 / 9', 'three-two': '3 / 2', 'three-two-vertical': '2 / 3' };
  function setupGalleryGrids() {
    document.querySelectorAll('.sqs-block-gallery').forEach(function (block) {
      var grid = block.querySelector('.sqs-gallery-block-grid');
      if (!grid) return;
      var cfg = {};
      try { cfg = JSON.parse(block.getAttribute('data-block-json') || '{}'); } catch (e) {}
      var pad = typeof cfg.padding === 'number' ? cfg.padding : 20;
      var gallery = grid.querySelector('.sqs-gallery');
      gallery.classList.add('sqs-gallery-design-grid');
      gallery.style.marginRight = -pad + 'px';
      gallery.style.overflow = 'hidden';
      gallery.querySelectorAll('.slide').forEach(function (slide) {
        slide.classList.add('sqs-gallery-design-grid-slide');
        slide.style.float = 'left';
        var wrap = slide.querySelector('.margin-wrapper');
        if (wrap) { wrap.style.marginRight = pad + 'px'; wrap.style.marginBottom = pad + 'px'; }
        var a = slide.querySelector('.image-slide-anchor');
        if (a) { a.style.display = 'block'; a.style.aspectRatio = ASPECTS[cfg['aspect-ratio']] || '1 / 1'; }
      });
    });
  }

  // Video blocks keep their YouTube iframe in data-html; Squarespace inserted it at runtime.
  function loadVideos() {
    document.querySelectorAll('.sqs-video-wrapper[data-html]').forEach(function (w) {
      var tmp = document.createElement('div');
      tmp.innerHTML = w.getAttribute('data-html');
      var iframe = tmp.querySelector('iframe');
      if (!iframe) return;
      // Embedly wrappers point at a third-party proxy; embed the video directly instead.
      var src = iframe.getAttribute('src') || '';
      if (/^\/\//.test(src)) iframe.setAttribute('src', 'https:' + src);
      if (/embedly\.com\/widgets\/media\.html/.test(src)) {
        var inner = new URLSearchParams(src.split('?')[1]).get('src');
        if (inner) iframe.setAttribute('src', inner);
      }
      iframe.removeAttribute('width');
      iframe.removeAttribute('height');
      iframe.setAttribute('loading', 'lazy');
      w.innerHTML = '';
      w.appendChild(iframe);
      w.classList.add('video-loaded');
    });
  }

  // Mobile navigation overlay and its folders (e.g. Bio > Short / Long).
  function setupMobileNav() {
    document.querySelectorAll('[data-controller~="MobileOverlayToggle"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        body.classList.toggle('is-mobile-overlay-active');
      });
    });
    var folders = document.querySelectorAll('.Mobile-overlay-folder');
    document.querySelectorAll('[data-controller-folder-toggle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-controller-folder-toggle');
        var target = document.querySelector('.Mobile-overlay-folder[data-controller-folder="' + name + '"]');
        if (target) target.classList.add('is-active-folder');
        document.querySelector('.Mobile-overlay-menu-main').classList.add('is-active-folder');
      });
    });
    document.querySelectorAll('.Mobile-overlay-folder-item--toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        folders.forEach(function (f) { f.classList.remove('is-active-folder'); });
        document.querySelector('.Mobile-overlay-menu-main').classList.remove('is-active-folder');
      });
    });
    document.querySelectorAll('.Mobile-overlay-back').forEach(function (el) {
      el.addEventListener('click', function () { body.classList.remove('is-mobile-overlay-active'); });
    });
  }

  // Search ran on Squarespace's servers; send queries to a site-restricted web search instead.
  function setupSearch() {
    document.querySelectorAll('form[action="/search"]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = (form.querySelector('input[name="q"]') || {}).value || '';
        window.location.href = 'https://duckduckgo.com/?q=' + encodeURIComponent('site:megbrennan.com ' + q);
      });
    });
  }

  // Fixed mobile bars overlay the page, so the body is offset by their height while they show.
  function offsetMobileBars() {
    [['top', 'marginTop'], ['bottom', 'marginBottom']].forEach(function (pos) {
      var bar = document.querySelector('.Mobile-bar--' + pos[0]);
      var fixed = body.classList.contains('tweak-mobile-bar-' + pos[0] + '-fixed');
      var shown = bar && getComputedStyle(bar).display !== 'none' && bar.offsetHeight > 0;
      body.style[pos[1]] = fixed && shown ? bar.offsetHeight + 'px' : '';
    });
  }

  // Grid blog lists: as many columns (up to 4) as fit with items at least 200px wide and the
  // template's 80px gutters, matching Squarespace's layout at every width.
  function layoutBlogLists() {
    if (!body.classList.contains('tweak-blog-list-style-grid')) return;
    document.querySelectorAll('.BlogList').forEach(function (list) {
      var w = list.getBoundingClientRect().width, n = 4;
      while (n > 1 && (w - (n - 1) * 80) / n < 200) n--;
      list.setAttribute('data-columns', n);
    });
  }

  // The search page's input box was built by Squarespace's script.
  function buildSearchPage() {
    var box = document.querySelector('.sqs-search-page-input');
    if (!box || box.querySelector('form')) return;
    box.classList.add('sqs-search-input', 'sqs-search-input-content');
    var form = document.createElement('form');
    form.setAttribute('action', '/search');
    form.innerHTML = '<input name="q" placeholder="Type to search\u2026" type="text" spellcheck="false" aria-label="Search">';
    box.appendChild(form);
    var q = new URLSearchParams(window.location.search).get('q');
    if (q) form.querySelector('input').value = q;
  }

  // Map blocks used Squarespace's Google Maps key; embed the same location with Google's
  // keyless embed instead.
  function loadMaps() {
    document.querySelectorAll('.sqs-block-map [data-context]').forEach(function (el) {
      var loc;
      try { loc = JSON.parse(el.getAttribute('data-context')).location; } catch (e) { return; }
      if (!loc) return;
      var q = [loc.addressLine1, loc.addressLine2, loc.addressCountry].filter(Boolean).join(', ') || (loc.mapLat + ',' + loc.mapLng);
      var iframe = document.createElement('iframe');
      iframe.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=' + (loc.mapZoom || 12) + '&output=embed';
      iframe.title = 'Map';
      iframe.loading = 'lazy';
      iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0';
      el.style.position = 'relative';
      if (!el.offsetHeight) el.style.minHeight = '100%';
      el.appendChild(iframe);
    });
  }

  // The first full-bleed image section fills 90% of the screen below the header bar and the
  // site border: min-height: calc(90vh - (bar height + border)).
  function sizeHeroSection() {
    var first = document.querySelector('.Index-page');
    if (!first || !first.classList.contains('Index-page--has-image')) return;
    var header = document.querySelector('.Header--top'), mobileBar = document.querySelector('.Mobile-bar--top');
    var bar = header && header.offsetHeight ? header.offsetHeight : (mobileBar ? mobileBar.offsetHeight : 0);
    var border = Math.max(0, Math.round(first.getBoundingClientRect().left));
    first.style.minHeight = 'calc(-' + (bar + border) + 'px + 90vh)';
  }

  // Spacer blocks get their height from data-aspect-ratio (a percentage of their width); the
  // site CSS hides or resizes them on small screens.
  function sizeSpacers() {
    document.querySelectorAll('.sqs-block-spacer[data-aspect-ratio] > .sqs-block-content').forEach(function (c) {
      c.style.paddingBottom = parseFloat(c.parentNode.getAttribute('data-aspect-ratio')) + '%';
    });
  }

  // Blocks with entrance animations start hidden until Squarespace marks them loaded.
  // Show them in their final state.
  function revealAnimatedBlocks() {
    document.querySelectorAll('.image-block-outer-wrapper, [class*="block-animation-"], [class*="combination-animation-"]').forEach(function (el) {
      el.classList.add('animation-loaded', 'sqs-text-ready');
    });
    document.querySelectorAll('.sqs-block-image').forEach(function (el) { el.classList.add('sqs-text-ready'); });
  }

  function init() {
    revealAnimatedBlocks();
    sizeSpacers();
    buildSearchPage();
    loadMaps();
    placeAncillary(document.querySelector('[data-nc-base="header"]'), 'ancillary-header-');
    placeAncillary(document.querySelector('[data-nc-base="mobile-bar"]'), 'ancillary-mobile-bar-');
    setupParallax();
    setupGalleryGrids();
    document.querySelectorAll('img[data-src]').forEach(loadImage);
    loadVideos();
    setupMobileNav();
    setupSearch();
    offsetMobileBars();
    sizeHeroSection();
    layoutBlogLists();
    fitDynamicText();
    layoutParallax();
    window.addEventListener('resize', function () { offsetMobileBars(); sizeHeroSection(); layoutBlogLists(); fitDynamicText(); layoutParallax(); });
    window.addEventListener('load', layoutParallax);
    if (document.fonts) document.fonts.ready.then(function () { fitDynamicText(); layoutParallax(); });
    window.addEventListener('scroll', function () { window.requestAnimationFrame(scrollParallax); }, { passive: true });
    if (site) site.classList.add('loaded');
    body.classList.add('loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
