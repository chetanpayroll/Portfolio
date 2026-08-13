/**
 * Homepage metric count-up.
 *
 * The final figures are hard-coded in the markup, so with JavaScript off,
 * with reduced motion on, or in browsers without IntersectionObserver the
 * band simply shows the real numbers — this module only adds the count-up
 * flourish when it is safe to do so.
 */

(function () {
    'use strict';

    var band = document.querySelector('.metric-band');
    if (!band) return;

    var nodes = band.querySelectorAll('.metric-num');
    if (!nodes.length) return;

    var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) return;

    var DURATION = 1400;
    var started = false;

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

    function run() {
        if (started) return;
        started = true;
        var startTs = null;

        function frame(ts) {
            if (startTs === null) startTs = ts;
            var p = Math.min((ts - startTs) / DURATION, 1);
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

    var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
                run();
                io.disconnect();
                break;
            }
        }
    }, { threshold: 0.3 });

    io.observe(band);
})();

/**
 * Career constellation: draw the connection lines when the band scrolls
 * into view, and let touch/keyboard users toggle the tenure tips (mouse
 * users get them on hover via CSS).
 */
(function () {
    'use strict';

    var constellation = document.getElementById('constellation');
    if (!constellation) return;

    // Line draw-in. Without IntersectionObserver (or with reduced motion,
    // where the CSS keeps lines fully drawn) the class is simply inert.
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    constellation.classList.add('is-drawn');
                    io.disconnect();
                    break;
                }
            }
        }, { threshold: 0.35 });
        io.observe(constellation);
    } else {
        constellation.classList.add('is-drawn');
    }

    // Tenure tip toggle — one open at a time.
    var cards = constellation.querySelectorAll('.const-card');

    function closeAll(except) {
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] !== except) {
                cards[i].classList.remove('is-open');
                cards[i].setAttribute('aria-expanded', 'false');
            }
        }
    }

    for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener('click', function () {
            var open = this.classList.toggle('is-open');
            this.setAttribute('aria-expanded', open ? 'true' : 'false');
            closeAll(this);
        });
    }

    document.addEventListener('click', function (e) {
        if (!constellation.contains(e.target)) closeAll(null);
    });
})();
