(function () {
  'use strict';

  // Responsive scaling (same approach as the home page).
  function fitViewport() {
    document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth);
  }
  fitViewport();
  window.addEventListener('resize', fitViewport);

  // Mobile hamburger.
  var nav = document.querySelector('.nav');
  var navToggle = document.querySelector('[data-nav-toggle]');
  if (nav && navToggle) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    navToggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900) setMenu(false); });
  }

  var top = document.querySelector('[data-back-to-top]');
  if (top) top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Footer panda: pupils follow the cursor.
  var panda = document.querySelector('[data-panda]');
  if (panda && window.matchMedia('(pointer: fine)').matches) {
    var pupils = Array.prototype.slice.call(panda.querySelectorAll('.panda-pupil'));
    var MAX_SHIFT = 3;   // px a pupil may travel from centre
    var REACH = 160;     // px from the eye at which the pupil is fully deflected
    var pointerX = -1, pointerY = -1, frame = null;

    function lookAtPointer() {
      frame = null;
      if (pointerX < 0) return;
      pupils.forEach(function (pupil) {
        var r = pupil.parentNode.getBoundingClientRect();
        var dx = pointerX - (r.left + r.width / 2);
        var dy = pointerY - (r.top + r.height / 2);
        var dist = Math.hypot(dx, dy) || 1;
        var k = Math.min(1, dist / REACH) * MAX_SHIFT;
        pupil.style.setProperty('--px', (dx / dist * k).toFixed(2) + 'px');
        pupil.style.setProperty('--py', (dy / dist * k).toFixed(2) + 'px');
      });
    }
    function queue() { if (!frame) frame = requestAnimationFrame(lookAtPointer); }

    document.addEventListener('mousemove', function (e) {
      pointerX = e.clientX; pointerY = e.clientY; queue();
    }, { passive: true });
    window.addEventListener('scroll', queue, { passive: true });
  }

  // ---- The book ----
  var library = document.querySelector('.library');
  var stage = document.querySelector('[data-book]');
  var cover = document.querySelector('[data-cover]');
  var sheets = Array.prototype.slice.call(document.querySelectorAll('.sheet'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var btnOpen = document.querySelector('[data-open]');
  var btnPrev = document.querySelector('[data-prev]');
  var btnNext = document.querySelector('[data-next]');
  var btnClose = document.querySelector('[data-close]');
  var count = document.querySelector('[data-count]');
  if (!stage || !cover) return;

  var n = sheets.length;
  var isOpen = false;
  var flipped = 0;           // how many sheets have been turned
  var busy = false;

  function layer() {
    // Unturned sheets stack top-down on the right; turned ones stack bottom-up on the left.
    sheets.forEach(function (s, i) {
      var k = i + 1;
      s.style.zIndex = s.classList.contains('is-flipped') ? k : (n - i);
    });
    cover.style.zIndex = isOpen ? 0 : 50;
  }

  function render() {
    tabs.forEach(function (t, i) { t.classList.toggle('is-current', isOpen && flipped === i); });
    if (btnPrev) btnPrev.disabled = flipped === 0;
    if (btnNext) btnNext.disabled = flipped === n;
    if (count) count.textContent = flipped === n ? 'the end' : ('spread ' + (flipped + 1) + ' of ' + (n + 1));
  }

  function openBook() {
    if (isOpen) return;
    isOpen = true;
    busy = true;
    stage.classList.add('is-open');
    library.classList.add('is-open');
    cover.classList.add('is-open');
    layer();
    render();
    setTimeout(function () { busy = false; }, 1200);
  }

  function closeBook() {
    if (!isOpen) return;
    isOpen = false;
    sheets.forEach(function (s) { s.classList.remove('is-flipped'); });
    flipped = 0;
    stage.classList.remove('is-open');
    library.classList.remove('is-open');
    cover.classList.remove('is-open');
    layer();
    render();
  }

  function flipTo(target) {
    if (!isOpen || busy) return;
    target = Math.max(0, Math.min(n, target));
    if (target === flipped) return;
    busy = true;
    var dir = target > flipped ? 1 : -1;
    var i = flipped;
    (function step() {
      if (i === target) { busy = false; layer(); return; }
      var s = dir === 1 ? sheets[i] : sheets[i - 1];
      s.style.zIndex = n + 10;              // the moving sheet rides on top
      s.classList.toggle('is-flipped', dir === 1);
      i += dir;
      flipped = i;
      render();
      setTimeout(step, 320);                // stagger multi-page jumps
    })();
    setTimeout(layer, 1050);
  }

  cover.querySelector('.cover__outside').addEventListener('click', openBook);
  if (btnOpen) btnOpen.addEventListener('click', openBook);
  if (btnClose) btnClose.addEventListener('click', closeBook);
  if (btnPrev) btnPrev.addEventListener('click', function () { flipTo(flipped - 1); });
  if (btnNext) btnNext.addEventListener('click', function () { flipTo(flipped + 1); });
  tabs.forEach(function (t) { t.addEventListener('click', function () { flipTo(parseInt(t.getAttribute('data-goto'), 10)); }); });

  // Click the right page to go forward, the left page to go back (desktop).
  sheets.forEach(function (s, i) {
    s.querySelector('.face--front').addEventListener('click', function () { if (window.innerWidth >= 900 && flipped === i) flipTo(flipped + 1); });
    s.querySelector('.face--back').addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      if (window.innerWidth >= 900 && flipped === i + 1) flipTo(flipped - 1);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') flipTo(flipped + 1);
    if (e.key === 'ArrowLeft') flipTo(flipped - 1);
    if (e.key === 'Enter' && !isOpen && document.activeElement === document.body) openBook();
  });

  // Swipe on touch (desktop-sized tablets).
  var sx = null;
  stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) < 50 || window.innerWidth < 900) return;
    flipTo(flipped + (dx < 0 ? 1 : -1));
  });

  layer();
  render();
})();
