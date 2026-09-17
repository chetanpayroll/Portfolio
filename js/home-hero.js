/**
 * Homepage motion modules.
 *
 * Three independent pieces — metric count-up, career-timeline draw-in, and the
 * scroll-reveal choreography. All of them are progressive enhancements: the
 * finished numbers and the finished layout live in the markup, so with
 * JavaScript off, with reduced motion on, or in a browser without
 * IntersectionObserver the page renders complete and static.
 */

(function () {
    'use strict';

    var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasIO = 'IntersectionObserver' in window;

    /* ------------------------------------------------------------------
       Shared: animate a set of [data-target] spans from zero to their
       marked-up value, landing exactly on it.
       ------------------------------------------------------------------ */
    function countUp(nodes, duration) {
        var targets = Array.prototype.map.call(nodes, function (el) {
            return {
                el: el,
                value: parseFloat(el.getAttribute('data-target')),
                decimals: parseInt(el.getAttribute('data-decimals') || '0', 10)
            };
        });

        function render(t, progress) {
            var v = t.value * progress;
            t.el.textContent = t.decimals ? v.toFixed(t.decimals) : String(Math.round(v));
        }

        var startTs = null;

        function frame(ts) {
            if (startTs === null) startTs = ts;
            var p = Math.min((ts - startTs) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            for (var i = 0; i < targets.length; i++) render(targets[i], eased);
            if (p < 1) {
                requestAnimationFrame(frame);
            } else {
                // Land exactly on the marked-up figures
                for (var j = 0; j < targets.length; j++) render(targets[j], 1);
            }
        }
        requestAnimationFrame(frame);
    }

    /** Run `fn` once, the first time `el` scrolls into view. */
    function whenInView(el, threshold, fn) {
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    fn();
                    io.disconnect();
                    break;
                }
            }
        }, { threshold: threshold });
        io.observe(el);
    }

    /** Wire a container's count-up spans, skipping it when motion is unwanted. */
    function setupCounter(containerSelector, numSelector, threshold) {
        var container = document.querySelector(containerSelector);
        if (!container) return;
        var nodes = container.querySelectorAll(numSelector);
        if (!nodes.length) return;
        if (reduced || !hasIO) return;   // markup already shows the real figures
        var started = false;
        whenInView(container, threshold, function () {
            if (started) return;
            started = true;
            countUp(nodes, 1400);
        });
    }

    /* ---------- 1. Hero metric band ---------- */
    setupCounter('.metric-band', '.metric-num', 0.3);

    /* ---------- 2. Recognition stats ---------- */
    setupCounter('.recognition-stats', '.rec-num', 0.35);

    /* ---------- 3. Career timeline spine ---------- */
    (function () {
        var timeline = document.getElementById('careerTimeline');
        if (!timeline) return;
        if (!hasIO) { timeline.classList.add('is-drawn'); return; }
        whenInView(timeline, 0.25, function () {
            timeline.classList.add('is-drawn');
        });
    })();

    /* ---------- 4. Scroll reveal ----------
       The hidden start state is applied by CSS only when the document carries
       `.js-reveal` (set by an inline script in the head), so a failed or
       blocked script can never leave content invisible. */
    (function () {
        document.documentElement.setAttribute('data-reveal-ready', '');
        var items = document.querySelectorAll('[data-reveal]');
        if (!items.length) return;

        function showAll() {
            for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
        }

        if (reduced || !hasIO) { showAll(); return; }

        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('is-in');
                    io.unobserve(entries[i].target);
                }
            }
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

        for (var i = 0; i < items.length; i++) io.observe(items[i]);
    })();

    /* ---------- 5. Header: transparent over the dark hero, solid after ----------
       The class lives on <body>, so CSS handles every colour change. */
    (function () {
        var body = document.body;
        if (!body.classList.contains('home')) return;
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

    /* ---------- 6. Cursor parallax on the hero ----------
       Sets two custom properties; all the movement is described in CSS, and
       only for devices with a real pointer. */
    (function () {
        if (reduced) return;
        var hero = document.querySelector('.hero-dark');
        if (!hero) return;
        if (!(window.matchMedia && window.matchMedia('(pointer: fine)').matches)) return;

        var pending = false, px = 0, py = 0;

        function apply() {
            hero.style.setProperty('--px', px.toFixed(3));
            hero.style.setProperty('--py', py.toFixed(3));
            pending = false;
        }

        hero.addEventListener('mousemove', function (e) {
            var r = hero.getBoundingClientRect();
            px = (e.clientX - r.left) / r.width * 2 - 1;     // -1 .. 1
            py = (e.clientY - r.top) / r.height * 2 - 1;
            if (!pending) { pending = true; requestAnimationFrame(apply); }
        });

        hero.addEventListener('mouseleave', function () {
            px = 0; py = 0;
            if (!pending) { pending = true; requestAnimationFrame(apply); }
        });
    })();
})();
