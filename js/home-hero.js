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
 * Career timeline: draw the spine (and pop the milestone dots) when the
 * band scrolls into view. Years and roles are always visible, so no
 * toggle behaviour is needed. Without IntersectionObserver — or with
 * reduced motion, where the CSS keeps everything fully drawn — the
 * class is simply inert.
 */
(function () {
    'use strict';

    var timeline = document.getElementById('careerTimeline');
    if (!timeline) return;

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    timeline.classList.add('is-drawn');
                    io.disconnect();
                    break;
                }
            }
        }, { threshold: 0.25 });
        io.observe(timeline);
    } else {
        timeline.classList.add('is-drawn');
    }
})();
