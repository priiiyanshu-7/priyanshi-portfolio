(function () {
  'use strict';

  // Loader: play the growing-tulip intro once per session, then lift it away.
  var loader = document.querySelector('[data-loader]');
  if (loader) {
    var seen = false;
    try { seen = sessionStorage.getItem('pc-loader') === '1'; } catch (e) {}
    var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (seen || noMotion) {
      loader.classList.add('is-hidden');
    } else {
      document.documentElement.classList.add('is-loading');
      try { sessionStorage.setItem('pc-loader', '1'); } catch (e) {}
      setTimeout(function () {
        loader.classList.add('is-done');
        document.documentElement.classList.remove('is-loading');
        loader.addEventListener('transitionend', function () { loader.classList.add('is-hidden'); }, { once: true });
        setTimeout(function () { loader.classList.add('is-hidden'); }, 1200); // safety net
      }, 2300);
    }
  }

  // Responsive scaling: keep --vw up to date for the CSS zoom rules, and
  // correct the hero's viewport-height minimum while the page is scaled.
  function fitViewport() {
    var w = document.documentElement.clientWidth;
    var root = document.documentElement.style;
    root.setProperty('--vw', w);
    if (w >= 900 && w < 1440) {
      root.setProperty('--hero-min', (window.innerHeight / (w / 1440) - 55) + 'px');
    } else {
      root.removeProperty('--hero-min');
    }
  }
  fitViewport();
  window.addEventListener('resize', fitViewport);

  // Highlight the nav link for the section currently in view.
  var links = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bestRatio = 0;
      sections.forEach(function (s) {
        if ((visible[s.id] || 0) > bestRatio) { bestRatio = visible[s.id]; best = s.id; }
      });
      if (window.scrollY < 80) best = sections[0].id;
      if (best) setActive(best);
    }, { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    sections.forEach(function (s) { io.observe(s); });
    window.addEventListener('scroll', function () {
      if (window.scrollY < 80) setActive(sections[0].id);
    }, { passive: true });
  }

  links.forEach(function (a) {
    a.addEventListener('click', function () { setActive(a.getAttribute('href').slice(1)); });
  });

  // Mobile hamburger menu.
  var nav = document.querySelector('.nav');
  var navToggle = document.querySelector('[data-nav-toggle]');
  if (nav && navToggle) {
    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    navToggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    links.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900) setMenu(false); });
  }

  // Back to top.
  var top = document.querySelector('[data-back-to-top]');
  if (top) {
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Bookshelf: the hovered/focused book lifts, the lamp slides over it, and
  // the featured card takes that book's colours and copy.
  var shelf = document.querySelector('.shelf');
  var booksWrap = document.querySelector('.shelf__books');
  var books = Array.prototype.slice.call(document.querySelectorAll('.book'));
  var featured = document.querySelector('.featured');
  var content = document.querySelector('[data-featured-content]');
  var fTags = document.querySelector('[data-featured-tags]');
  var fTitle = document.querySelector('[data-featured-title]');
  var fDesc = document.querySelector('[data-featured-desc]');
  var fYear = document.querySelector('[data-featured-year]');
  var fLink = document.querySelector('[data-featured-link]');
  var fCover = document.querySelector('[data-featured-cover]');
  var BOOK_PITCH = 84; // horizontal distance between book slots, in px
  var current = document.querySelector('.book.is-raised');
  var defaultBook = current;
  var leaveTimer = null, swapTimer = null;

  function renderTags(text) {
    fTags.textContent = '';
    text.split('·').forEach(function (part, i) {
      if (i > 0) {
        var dot = document.createElement('span');
        dot.className = 'featured__dot';
        dot.textContent = '·';
        fTags.appendChild(dot);
      }
      var span = document.createElement('span');
      span.textContent = part.trim();
      fTags.appendChild(span);
    });
  }

  function fillCard(book) {
    var d = book.dataset;
    var cs = getComputedStyle(book);
    featured.style.setProperty('--spine', cs.getPropertyValue('--spine').trim());
    featured.style.setProperty('--edge-l', cs.getPropertyValue('--edge-l').trim());
    if (d.tags) renderTags(d.tags);
    if (d.title) fTitle.textContent = d.title;
    if (d.desc) fDesc.textContent = d.desc;
    if (d.year) fYear.textContent = d.year;
    if (d.link) fLink.href = d.link;
    if (d.cover && fCover) { fCover.src = d.cover; fCover.alt = (d.title || 'Project') + ' cover'; }
  }

  function select(book) {
    if (!book || book === current) return;
    current = book;
    books.forEach(function (b) { b.classList.toggle('is-raised', b === book); });

    var index = parseInt(book.dataset.index, 10) || 1;
    shelf.style.setProperty('--lamp-x', ((index - 1) * BOOK_PITCH) + 'px');
    shelf.dispatchEvent(new CustomEvent('bookselect', { detail: { book: book, isDefault: book === defaultBook } }));

    clearTimeout(swapTimer);
    content.classList.add('is-switching');
    swapTimer = setTimeout(function () {
      fillCard(book);
      content.classList.remove('is-switching');
    }, 220);
  }

  if (shelf && booksWrap && featured && content) {
    books.forEach(function (b) {
      b.addEventListener('mouseenter', function () { clearTimeout(leaveTimer); select(b); });
      b.addEventListener('focusin', function () { clearTimeout(leaveTimer); select(b); });
      // A tap/click picks the book. Until a book has a real project link, don't follow the '#' placeholder.
      b.addEventListener('click', function (e) {
        var href = b.querySelector('a') && b.querySelector('a').getAttribute('href');
        if (!href || href.charAt(0) === '#') e.preventDefault();
        clearTimeout(leaveTimer);
        select(b);
      });
    });
    // Return to the default book once the pointer leaves the shelf for a moment.
    booksWrap.addEventListener('mouseleave', function () {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () { select(defaultBook); }, 600);
    });
    booksWrap.addEventListener('focusout', function (e) {
      if (!booksWrap.contains(e.relatedTarget)) select(defaultBook);
    });
    fillCard(current);
  }

  // Shelf panda: breathes while idle, hops and chats on hover, peeks when a
  // book is picked, and throws hearts when clicked.
  var shelfPanda = document.querySelector('[data-shelf-panda]');
  if (shelfPanda) {
    var pandaImg = shelfPanda.querySelector('img');
    var pandaBubble = shelfPanda.querySelector('.shelf__panda-bubble');
    var talkTimer = null;
    var onDefaultBook = true;

    function pandaAnimate(cls) {
      pandaImg.classList.remove('is-hop', 'is-peek', 'is-wiggle');
      void pandaImg.offsetWidth; // restart the animation
      pandaImg.classList.add(cls);
    }
    pandaImg.addEventListener('animationend', function () {
      pandaImg.classList.remove('is-hop', 'is-peek', 'is-wiggle'); // back to breathing
    });

    function pandaSay(text, ms) {
      pandaBubble.textContent = text;
      shelfPanda.classList.add('is-talking');
      clearTimeout(talkTimer);
      talkTimer = setTimeout(function () { shelfPanda.classList.remove('is-talking'); }, ms || 2000);
    }

    function throwHearts() {
      for (var i = 0; i < 5; i++) {
        var heart = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        heart.setAttribute('viewBox', '0 0 24 24');
        heart.setAttribute('class', 'shelf__heart');
        heart.innerHTML = '<path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.6 4.8 6.2 4.2c2-.3 3.9.6 5.8 2.7 1.9-2.1 3.8-3 5.8-2.7 3.6.6 5.3 4.3 3.8 7.6C19.5 16.4 12 21 12 21z"/>';
        heart.style.setProperty('--hx', ((i - 2) * 16 + (Math.random() * 10 - 5)).toFixed(0) + 'px');
        heart.style.setProperty('--hr', ((Math.random() * 50) - 25).toFixed(0) + 'deg');
        heart.style.animationDelay = (i * 70) + 'ms';
        shelfPanda.appendChild(heart);
        heart.addEventListener('animationend', function (e) { e.target.remove(); });
      }
    }

    shelfPanda.addEventListener('mouseenter', function () {
      pandaAnimate('is-wiggle');
      pandaSay(onDefaultBook ? 'psst… hover a book!' : 'ooh, nice pick!');
    });
    shelfPanda.addEventListener('mouseleave', function () {
      clearTimeout(talkTimer);
      shelfPanda.classList.remove('is-talking');
    });
    shelfPanda.addEventListener('click', function () {
      pandaAnimate('is-hop');
      pandaSay('yay! 🐼', 1600);
      throwHearts();
    });
    if (shelf) {
      var reactions = ['ooh!', 'nice one!', 'that one’s good!', 'good pick!', 'read that!'];
      shelf.addEventListener('bookselect', function (e) {
        onDefaultBook = e.detail.isDefault;
        if (e.detail.isDefault) return;
        pandaAnimate('is-peek');
        pandaSay(reactions[Math.floor(Math.random() * reactions.length)], 1100);
      });
    }
  }

  // Scroll reveals: a section gets .is-visible once it scrolls into view
  // (and .is-settled a moment later, so hover transitions lose their stagger).
  function revealOnScroll(section, threshold, trigger) {
    if (!section) return;
    trigger = trigger || section; // the element whose visibility starts the reveal
    function show() {
      section.classList.add('is-visible');
      setTimeout(function () { section.classList.add('is-settled'); }, 2400);
    }
    if ('IntersectionObserver' in window) {
      var revealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { show(); revealer.disconnect(); }
        });
      }, { threshold: threshold });
      revealer.observe(trigger);
    } else {
      show();
    }
  }
  // Chapters: on desktop, wait until the ground line (where the plants grow) is
  // on screen, so the growth is actually seen; on mobile the section itself is enough.
  var journeyEl = document.querySelector('[data-journey]');
  var journeyGround = journeyEl && journeyEl.querySelector('.timeline__plank');
  var journeyTrigger = window.innerWidth >= 900 && journeyGround ? journeyGround : journeyEl;
  revealOnScroll(journeyEl, journeyTrigger === journeyEl ? 0.15 : 0, journeyTrigger);
  revealOnScroll(document.querySelector('[data-achievements]'), 0.35); // little achievements

  // Hero portrait: a greeting bubble pops up on hover (tap toggles it on touch).
  var heroArt = document.querySelector('[data-hero-art]');
  var portrait = heroArt && heroArt.querySelector('.hero__portrait');
  if (portrait) {
    portrait.addEventListener('mouseenter', function () { heroArt.classList.add('is-greeting'); });
    portrait.addEventListener('mouseleave', function () { heroArt.classList.remove('is-greeting'); });
    portrait.addEventListener('click', function () { heroArt.classList.toggle('is-greeting'); });
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

  // Cursor butterfly: flutters after the pointer with a little lag, faces the
  // way it flies, bobs while hovering and settles down when the pointer rests.
  var butterfly = document.querySelector('[data-cursor-butterfly]');
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (butterfly && finePointer && !reduceMotion) {
    var HALF = 26;             // half the butterfly's box
    var OFFSET_X = 38;         // hover up and to the right of the cursor
    var OFFSET_Y = -42;
    var REST_AFTER = 1600;     // ms without pointer movement before it settles
    var targetX = -200, targetY = -200;
    var posX = -200, posY = -200, velX = 0, velY = 0;
    var facing = 1, lastMove = 0, clock = 0, flying = false;

    document.addEventListener('mousemove', function (e) {
      targetX = e.clientX; targetY = e.clientY;
      lastMove = performance.now();
      if (!flying) {
        flying = true;
        posX = targetX + OFFSET_X; posY = targetY + OFFSET_Y;
        butterfly.classList.add('is-active');
      }
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      butterfly.classList.remove('is-active');
    });
    document.addEventListener('mouseenter', function () {
      if (flying) butterfly.classList.add('is-active');
    });

    function flutter(now) {
      if (flying) {
        clock += 0.016;
        var resting = now - lastMove > REST_AFTER;
        var bob = Math.sin(clock * 1.1) * 1.5;
        var goalX = targetX + OFFSET_X * facing;
        var goalY = targetY + OFFSET_Y + bob;
        var dx = goalX - posX, dy = goalY - posY;
        var pull = resting ? 0.005 : 0.009;   // small pull = lazy, drifting follow
        velX = (velX + dx * pull) * 0.93;
        velY = (velY + dy * pull) * 0.93;
        var speed = Math.hypot(velX, velY), MAX_SPEED = 2.2; // px per frame
        if (speed > MAX_SPEED) { velX *= MAX_SPEED / speed; velY *= MAX_SPEED / speed; }
        posX += velX; posY += velY;
        if (Math.abs(velX) > 1.2) facing = velX > 0 ? 1 : -1;
        var tilt = Math.max(-6, Math.min(6, velX * 2)) * facing;
        butterfly.style.transform = 'translate3d(' + (posX - HALF).toFixed(1) + 'px,' + (posY - HALF).toFixed(1) + 'px,0) scaleX(' + facing + ') rotate(' + tilt.toFixed(1) + 'deg)';
        butterfly.classList.toggle('is-resting', resting && Math.hypot(dx, dy) < 10);
      }
      requestAnimationFrame(flutter);
    }
    requestAnimationFrame(flutter);
  }
})();
