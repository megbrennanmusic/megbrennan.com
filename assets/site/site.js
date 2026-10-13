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

  function init() {
    placeAncillary(document.querySelector('[data-nc-base="header"]'), 'ancillary-header-');
    placeAncillary(document.querySelector('[data-nc-base="mobile-bar"]'), 'ancillary-mobile-bar-');
    setupParallax();
    setupGalleryGrids();
    document.querySelectorAll('img[data-src]').forEach(loadImage);
    loadVideos();
    setupMobileNav();
    setupSearch();
    layoutParallax();
    window.addEventListener('resize', layoutParallax);
    window.addEventListener('load', layoutParallax);
    window.addEventListener('scroll', function () { window.requestAnimationFrame(scrollParallax); }, { passive: true });
    if (site) site.classList.add('loaded');
    body.classList.add('loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
