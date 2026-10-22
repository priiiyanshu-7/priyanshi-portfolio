(function () {
  'use strict';

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

  // ---- Shelves: hover/tap a book to lift it, move the lamp, and fill the card ----
  var wall = document.querySelector('.shelf-wall');
  var books = Array.prototype.slice.call(document.querySelectorAll('.book'));
  var featured = document.querySelector('.featured');
  var content = document.querySelector('[data-featured-content]');
  var fTags = document.querySelector('[data-featured-tags]');
  var fTitle = document.querySelector('[data-featured-title]');
  var fDesc = document.querySelector('[data-featured-desc]');
  var fYear = document.querySelector('[data-featured-year]');
  var fLink = document.querySelector('[data-featured-link]');
  var fCover = document.querySelector('[data-featured-cover]');
  var BOOK_PITCH = 84;
  var SHELF_PITCH = 354 + 110;      // shelf height + gap between shelves
  var current = null, swapTimer = null;

  function renderTags(text) {
    fTags.textContent = '';
    text.split('·').forEach(function (part, i) {
      if (i > 0) { var dot = document.createElement('span'); dot.className = 'featured__dot'; dot.textContent = '·'; fTags.appendChild(dot); }
      var span = document.createElement('span'); span.textContent = part.trim(); fTags.appendChild(span);
    });
  }
  function fillCard(book) {
    var d = book.dataset, cs = getComputedStyle(book);
    featured.style.setProperty('--spine', cs.getPropertyValue('--spine').trim());
    featured.style.setProperty('--edge-l', cs.getPropertyValue('--edge-l').trim());
    if (d.tags) renderTags(d.tags);
    if (d.title) fTitle.textContent = d.title;
    if (d.desc) fDesc.textContent = d.desc;
    if (d.year) fYear.textContent = d.year;
    if (d.link) {
      fLink.href = d.link;
      var isMail = d.link.indexOf('mailto:') === 0;
      if (isMail) { fLink.removeAttribute('target'); fLink.removeAttribute('rel'); }
      else { fLink.setAttribute('target', '_blank'); fLink.setAttribute('rel', 'noopener'); }
      var lbl = fLink.querySelector('[data-featured-link-label]');
      if (lbl) lbl.textContent = d.linkLabel || 'Behance';
    }
    if (d.cover && fCover) { fCover.src = d.cover; fCover.alt = (d.title || 'Project') + ' cover'; }
  }
  function select(book) {
    if (!book || book === current) return;
    current = book;
    books.forEach(function (b) { b.classList.toggle('is-raised', b === book); });
    var index = parseInt(book.dataset.index, 10) || 1;
    var shelfIdx = parseInt(book.closest('[data-shelf]').getAttribute('data-shelf'), 10) || 1;
    wall.style.setProperty('--lamp-x', ((index - 1) * BOOK_PITCH) + 'px');
    wall.style.setProperty('--lamp-y', ((shelfIdx - 1) * SHELF_PITCH) + 'px');
    wall.dispatchEvent(new CustomEvent('bookselect', { detail: { book: book, isDefault: book === books[0] } }));
    clearTimeout(swapTimer);
    content.classList.add('is-switching');
    swapTimer = setTimeout(function () { fillCard(book); content.classList.remove('is-switching'); }, 220);
  }
  if (wall && books.length && featured && content) {
    books.forEach(function (b) {
      b.addEventListener('mouseenter', function () { select(b); });
      b.addEventListener('focusin', function () { select(b); });
      b.addEventListener('click', function (e) {
        // First tap on a phone selects; a second tap (already selected) follows the link.
        if (window.innerWidth < 900 && b !== current) e.preventDefault();
        select(b);
      });
    });
    // Land on a specific book when arriving from the home shelf (#book-03).
    var wanted = (location.hash.match(/^#book-(\d+)$/) || [])[1];
    var start = books[0];
    if (wanted) {
      var hit = books.filter(function (b) { return b.querySelector('.book__num').textContent === wanted; })[0];
      if (hit) { start = hit; setTimeout(function () { hit.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 300); }
    }
    current = null; select(start);
    fillCard(start);
  }

  // Shelf panda: same little guy as on the home page.
  var shelfPanda = document.querySelector('[data-shelf-panda]');
  if (shelfPanda) {
    var pandaImg = shelfPanda.querySelector('img');
    var pandaBubble = shelfPanda.querySelector('.shelf__panda-bubble');
    var talkTimer = null;
    function pandaAnimate(cls) {
      pandaImg.classList.remove('is-hop', 'is-peek', 'is-wiggle');
      void pandaImg.offsetWidth;
      pandaImg.classList.add(cls);
    }
    pandaImg.addEventListener('animationend', function () { pandaImg.classList.remove('is-hop', 'is-peek', 'is-wiggle'); });
    function pandaSay(text, ms) {
      pandaBubble.textContent = text;
      shelfPanda.classList.add('is-talking');
      clearTimeout(talkTimer);
      talkTimer = setTimeout(function () { shelfPanda.classList.remove('is-talking'); }, ms || 2000);
    }
    var reactions = ['ooh!', 'nice one!', 'that one’s good!', 'good pick!', 'read that!'];
    shelfPanda.addEventListener('mouseenter', function () { pandaAnimate('is-wiggle'); pandaSay('so many books!'); });
    shelfPanda.addEventListener('mouseleave', function () { clearTimeout(talkTimer); shelfPanda.classList.remove('is-talking'); });
    shelfPanda.addEventListener('click', function () { pandaAnimate('is-hop'); pandaSay('yay! 🐼', 1600); });
    if (wall) wall.addEventListener('bookselect', function (e) {
      if (e.detail.isDefault) return;
      pandaAnimate('is-peek');
      pandaSay(reactions[Math.floor(Math.random() * reactions.length)], 1100);
    });
  }
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

})();
