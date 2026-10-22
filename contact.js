(function () {
  'use strict';

  function fitViewport() { document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth); }
  fitViewport(); window.addEventListener('resize', fitViewport);

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

  var EMAIL = 'priyanshichikhale90@gmail.com';

  // Bangalore clock in the intro, and the postmark date.
  var clock = document.querySelector('[data-blr-time]');
  function tick() {
    if (!clock) return;
    try {
      var t = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date());
      var h = parseInt(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()), 10);
      var mood = h < 6 ? 'very late' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'late';
      clock.textContent = t.toLowerCase() + ', ' + mood;
    } catch (e) { clock.textContent = 'a nice time'; }
  }
  tick(); setInterval(tick, 30000);
  var pm = document.querySelector('[data-postmark-date]');
  if (pm) {
    try { pm.textContent = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase(); } catch (e) {}
  }

  // The postcard. With a Formspree endpoint set it is stored + emailed to her;
  // without one it opens the visitor's mail app pre-filled.
  var form = document.querySelector('[data-postcard]');
  var sent = document.querySelector('[data-sent]');
  var sentBody = document.querySelector('[data-sent-body]');
  var note = document.querySelector('[data-note]');
  var courier = document.querySelector('[data-courier]');
  var again = document.querySelector('[data-again]');
  if (form) {
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    if (endpoint && note) note.textContent = 'Lands straight in my inbox.';

    function runOff() {
      form.classList.add('is-sending');
      if (courier) { courier.classList.remove('is-running'); void courier.offsetWidth; courier.classList.add('is-running'); }
      setTimeout(function () { if (sent) sent.hidden = false; }, 900);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add('is-invalid');
        var bad = form.querySelector(':invalid');
        if (bad) bad.focus();
        return;
      }
      form.classList.remove('is-invalid');
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var topic = (form.querySelector('input[name="topic"]:checked') || {}).value || 'a hello';
      var msg = form.elements.message.value.trim();
      var subject = 'Postcard from ' + name + ' — about ' + topic;
      var fallback = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent('Hey Priyanshi,\n\n' + msg + '\n\n— ' + name + '\n' + email + '\n\n(sent from the postcard on your portfolio)');

      if (!endpoint) {
        runOff();
        setTimeout(function () { window.location.href = fallback; }, 500);
        return;
      }

      var btn = form.querySelector('.send');
      btn.disabled = true; btn.textContent = 'Sending…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ name: name, email: email, topic: topic, message: msg, _subject: subject, _replyto: email })
      }).then(function (r) {
        if (!r.ok) throw new Error('bad response');
        if (sentBody) sentBody.textContent = 'Your postcard is in my inbox. I’ll write back to ' + email + ' soon.';
        runOff();
      }).catch(function () {
        // Service down or blocked: fall back to the mail app so nothing is lost.
        runOff();
        setTimeout(function () { window.location.href = fallback; }, 500);
      }).then(function () {
        btn.disabled = false; btn.innerHTML = 'Send it off <svg class="icon icon--chevron"><use href="#i-chevron"/></svg>';
      });
    });
    if (again) again.addEventListener('click', function () {
      sent.hidden = true;
      form.classList.remove('is-sending');
      form.reset();
      if (courier) courier.classList.remove('is-running');
      form.elements.message.focus();
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
