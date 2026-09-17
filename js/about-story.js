/**
 * About page controller.
 *
 * Three jobs, all of them degradations-first:
 *
 *  - Scroll reveal, which also reports the hide-before-reveal flag as safe.
 *  - The career scrollytelling: a sticky stage whose identity block tracks
 *    whichever chapter you are reading. Every role's identity is in the DOM
 *    the whole time, so with this script absent the stage simply lists all
 *    four in order and the page still reads correctly.
 *  - Count-ups on the hero figures, which start from and land on the exact
 *    numbers already written into the markup — nothing is computed here.
 */

(function () {
    'use strict';

    var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------- scroll reveal ---------------- */

    (function () {
        document.documentElement.setAttribute('data-reveal-ready', '');

        var items = document.querySelectorAll('[data-reveal]');
        if (!items.length) return;

        function showAll() {
            for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
        }

        if (reduced || !('IntersectionObserver' in window)) { showAll(); return; }

        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('is-in');
                    io.unobserve(entries[i].target);
                }
            }
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

        for (var j = 0; j < items.length; j++) io.observe(items[j]);
    })();

    /* ---------------- career scrollytelling ---------------- */

    (function () {
        var scope = document.getElementById('storyScroll');
        if (!scope) return;

        var chapters = [].slice.call(scope.querySelectorAll('.story-chapter'));
        var idents = [].slice.call(scope.querySelectorAll('.story-id'));
        var ticks = [].slice.call(scope.querySelectorAll('.story-rail li'));
        var now = scope.querySelector('.story-index-now');
        var of = scope.querySelector('.story-index-of');
        if (!chapters.length || chapters.length !== idents.length) return;

        // The stage only makes sense once it can actually swap; until then the
        // markup's "all four listed" state is the correct thing to show.
        scope.classList.add('is-live');
        if (of) of.textContent = '/ ' + String(chapters.length).padStart(2, '0');

        var current = -1;

        function select(i) {
            if (i === current) return;
            current = i;
            idents.forEach(function (d, j) { d.classList.toggle('is-on', j === i); });
            ticks.forEach(function (t, j) {
                t.classList.toggle('is-on', j === i);
                t.classList.toggle('is-past', j < i);
            });
            chapters.forEach(function (c, j) { c.classList.toggle('is-on', j === i); });
            if (now) now.textContent = String(i + 1).padStart(2, '0');
        }

        select(0);

        // Pick the chapter nearest the reading line rather than the first one
        // merely intersecting, so a short chapter cannot be skipped over.
        var ticking = false;

        function update() {
            ticking = false;
            var line = window.innerHeight * 0.42;
            var best = 0, bestD = Infinity;
            for (var i = 0; i < chapters.length; i++) {
                var r = chapters[i].getBoundingClientRect();
                var d = (r.top > line) ? (r.top - line)
                    : (r.bottom < line ? line - r.bottom : 0);
                if (d < bestD) { bestD = d; best = i; }
            }
            select(best);
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });

        window.addEventListener('resize', update, { passive: true });
        update();
    })();

    /* ---------------- hero count-up ---------------- */

    (function () {
        var box = document.querySelector('.about-stats-container');
        if (!box) return;

        var nums = [].slice.call(box.querySelectorAll('.about-stat-number'));
        if (!nums.length) return;

        // Remember the authored text exactly; it is the only source of truth.
        nums.forEach(function (n) { n.setAttribute('data-final', n.textContent.trim()); });

        if (reduced || !('IntersectionObserver' in window)) return;

        function run(nEl) {
            var final = nEl.getAttribute('data-final');
            var m = final.match(/^([^\d.]*)([\d,.]+)(.*)$/);
            if (!m) return;                       // nothing numeric — leave it alone
            var pre = m[1], body = m[2], post = m[3];
            var decimals = (body.split('.')[1] || '').length;
            var target = parseFloat(body.replace(/,/g, ''));
            if (!isFinite(target)) return;

            var t0 = null, DUR = 1300;

            function frame(ts) {
                if (!t0) t0 = ts;
                var p = Math.min((ts - t0) / DUR, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                var v = (target * eased).toFixed(decimals);
                if (!decimals) v = String(Math.round(target * eased));
                nEl.textContent = pre + v + post;
                if (p < 1) requestAnimationFrame(frame);
                else nEl.textContent = final;     // always land on the authored string
            }

            requestAnimationFrame(frame);
        }

        var io = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            nums.forEach(function (n, i) { setTimeout(function () { run(n); }, i * 120); });
        }, { threshold: 0.4 });

        io.observe(box);
    })();

    /* ---------------- header over the dark hero ---------------- */

    (function () {
        var body = document.body;
        if (!body.classList.contains('about-page')) return;
        var ticking = false;

        function apply() {
            body.classList.toggle('is-scrolled', window.scrollY > 60);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(apply); }
        }, { passive: true });

        apply();
    })();
})();
