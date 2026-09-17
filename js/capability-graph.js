/**
 * Capability graph — the hero-piece on the expertise page.
 *
 * Six competencies sit on an orbit around a core. Each one is wired to the
 * proof figures it produced, and those figures are read straight out of the
 * cards further down the page rather than being restated here: the graph
 * cannot drift from the page's own claims because it has no claims of its own.
 *
 * It is a navigation layer, not content. The cards below remain the readable
 * source, so with JavaScript off, or on a screen reader, nothing is lost —
 * this simply does not appear.
 */

/* Scroll reveal. Runs first and unconditionally: it reports the page's
   hide-before-reveal flag as safe to keep, which the inline failsafe in the
   head is waiting on. If this never runs, that failsafe un-hides everything. */
(function () {
    'use strict';

    document.documentElement.setAttribute('data-reveal-ready', '');

    var items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function showAll() {
        for (var i = 0; i < items.length; i++) items[i].classList.add('is-in');
    }

    if (reduced || !('IntersectionObserver' in window)) { showAll(); return; }

    // Stagger siblings so a grid lands as a wave rather than all at once.
    var seen = {};
    for (var i = 0; i < items.length; i++) {
        var p = items[i].parentNode;
        var key = p ? (p.className || 'x') : 'x';
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1 && seen[key] <= 6) {
            items[i].style.setProperty('--d', ((seen[key] - 1) * 70) + 'ms');
        }
    }

    var io = new IntersectionObserver(function (entries) {
        for (var j = 0; j < entries.length; j++) {
            if (entries[j].isIntersecting) {
                entries[j].target.classList.add('is-in');
                io.unobserve(entries[j].target);
            }
        }
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

    for (var k = 0; k < items.length; k++) io.observe(items[k]);
})();

(function () {
    'use strict';

    var mount = document.getElementById('capGraph');
    if (!mount) return;

    var NS = 'http://www.w3.org/2000/svg';
    var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- read the competencies out of the page ---------- */

    var NODES = [].slice.call(document.querySelectorAll('.capability-card'))
        .map(function (card) {
            var title = card.querySelector('.capability-title');
            var proofs = [].slice.call(card.querySelectorAll('.metric-item'))
                .map(function (m) {
                    var fig = m.querySelector('.fig');
                    var txt = m.querySelector('.metric-text');
                    return {
                        fig: fig ? fig.textContent.trim() : '',
                        text: txt ? txt.textContent.trim() : ''
                    };
                });
            return {
                id: card.getAttribute('data-cap'),
                label: title ? title.textContent.trim() : '',
                card: card,
                proofs: proofs
            };
        })
        .filter(function (n) { return n.id && n.label; });

    if (NODES.length < 3) return;

    /* ---------- geometry ---------- */

    var VB = 460;                 // viewBox is square; CSS scales it
    var C = VB / 2;
    var R_ORBIT = 138;            // competency ring
    var R_CORE = 46;

    // Start at the top and run clockwise.
    NODES.forEach(function (n, i) {
        var a = -Math.PI / 2 + (i / NODES.length) * Math.PI * 2;
        n.a = a;
        n.x = C + Math.cos(a) * R_ORBIT;
        n.y = C + Math.sin(a) * R_ORBIT;
    });

    function el(name, attrs) {
        var e = document.createElementNS(NS, name);
        for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
        return e;
    }

    /* ---------- build ---------- */

    var svg = el('svg', {
        viewBox: '0 0 ' + VB + ' ' + VB,
        class: 'cap-svg',
        focusable: 'false'
    });

    var defs = el('defs');
    var glow = el('radialGradient', { id: 'capCoreGlow' });
    glow.appendChild(el('stop', { offset: '0%', 'stop-color': '#E11D48', 'stop-opacity': '0.55' }));
    glow.appendChild(el('stop', { offset: '100%', 'stop-color': '#E11D48', 'stop-opacity': '0' }));
    defs.appendChild(glow);
    svg.appendChild(defs);

    // A slow sweep behind everything, like a scope refreshing.
    var sweep = el('g', { class: 'cap-sweep' });
    var sweepGrad = el('linearGradient', {
        id: 'capSweep', x1: '0', y1: '0', x2: '1', y2: '0'
    });
    sweepGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#E11D48', 'stop-opacity': '0' }));
    sweepGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#E11D48', 'stop-opacity': '0.2' }));
    defs.appendChild(sweepGrad);
    sweep.appendChild(el('path', {
        d: 'M ' + C + ' ' + C +
           ' L ' + (C + R_ORBIT * 1.12) + ' ' + C +
           ' A ' + (R_ORBIT * 1.12) + ' ' + (R_ORBIT * 1.12) + ' 0 0 0 ' +
           (C + R_ORBIT * 1.12 * Math.cos(-0.7)) + ' ' + (C + R_ORBIT * 1.12 * Math.sin(-0.7)) + ' Z',
        fill: 'url(#capSweep)'
    }));
    svg.appendChild(sweep);

    // Orbit ring
    svg.appendChild(el('circle', {
        cx: C, cy: C, r: R_ORBIT, class: 'cap-orbit'
    }));
    svg.appendChild(el('circle', {
        cx: C, cy: C, r: R_ORBIT * 0.62, class: 'cap-orbit cap-orbit-inner'
    }));
    svg.appendChild(el('circle', {
        cx: C, cy: C, r: R_ORBIT * 1.24, class: 'cap-orbit cap-orbit-outer'
    }));

    // Degree ticks around the outer ring — instrument detail, no meaning implied.
    var ticks = el('g', { class: 'cap-ticks' });
    for (var t = 0; t < 72; t++) {
        var ta = (t / 72) * Math.PI * 2;
        var major = t % 6 === 0;
        var r1 = R_ORBIT * 1.24;
        var r2 = r1 + (major ? 8 : 4);
        ticks.appendChild(el('line', {
            x1: C + Math.cos(ta) * r1, y1: C + Math.sin(ta) * r1,
            x2: C + Math.cos(ta) * r2, y2: C + Math.sin(ta) * r2,
            class: major ? 'cap-tick cap-tick-major' : 'cap-tick'
        }));
    }
    svg.appendChild(ticks);

    // Spokes, one per competency
    var spokes = NODES.map(function (n) {
        var line = el('line', {
            x1: C + Math.cos(n.a) * R_CORE, y1: C + Math.sin(n.a) * R_CORE,
            x2: n.x, y2: n.y, class: 'cap-spoke'
        });
        svg.appendChild(line);
        return line;
    });

    // Core
    svg.appendChild(el('circle', { cx: C, cy: C, r: R_CORE * 2.4, fill: 'url(#capCoreGlow)' }));
    svg.appendChild(el('circle', { cx: C, cy: C, r: R_CORE, class: 'cap-core' }));
    var coreFig = el('text', { x: C, y: C + 2, class: 'cap-core-fig', 'text-anchor': 'middle' });
    var coreSub = el('text', { x: C, y: C + 22, class: 'cap-core-sub', 'text-anchor': 'middle' });
    svg.appendChild(coreFig);
    svg.appendChild(coreSub);

    // Competency nodes
    var dots = NODES.map(function (n, i) {
        var g = el('g', { class: 'cap-node', 'data-i': i });
        g.appendChild(el('circle', { cx: n.x, cy: n.y, r: 19, class: 'cap-node-halo' }));
        g.appendChild(el('circle', { cx: n.x, cy: n.y, r: 8, class: 'cap-node-dot' }));
        svg.appendChild(g);
        return g;
    });

    mount.appendChild(svg);

    // Readout under the graph — filled from the cards, never authored here.
    var readout = document.createElement('div');
    readout.className = 'cap-readout';
    readout.innerHTML =
        '<p class="cap-readout-label"></p>' +
        '<div class="cap-readout-proofs"></div>';
    mount.appendChild(readout);
    var rLabel = readout.querySelector('.cap-readout-label');
    var rProofs = readout.querySelector('.cap-readout-proofs');

    /* ---------- selection ---------- */

    var active = -1;

    function show(i) {
        if (i === active) return;
        active = i;
        var n = NODES[i];

        dots.forEach(function (d, j) { d.classList.toggle('is-on', j === i); });
        spokes.forEach(function (s, j) { s.classList.toggle('is-on', j === i); });
        NODES.forEach(function (o, j) { o.card.classList.toggle('is-linked', j === i); });

        coreFig.textContent = String(i + 1).padStart(2, '0');
        coreSub.textContent = 'of ' + NODES.length;

        rLabel.textContent = n.label;
        // Figures only. The sentence each one belongs to lives in the card below;
        // repeating it here would just be the same paragraph twice on one page.
        rProofs.innerHTML = '';
        n.proofs.forEach(function (p) {
            if (!p.fig) return;
            var b = document.createElement('b');
            b.className = 'cap-readout-fig';
            b.textContent = p.fig;
            rProofs.appendChild(b);
        });

        readout.classList.remove('is-swap');
        // restart the swap animation
        void readout.offsetWidth;
        readout.classList.add('is-swap');
    }

    dots.forEach(function (g, i) {
        g.addEventListener('mouseenter', function () { stopCycle(); show(i); });
        g.addEventListener('click', function () {
            stopCycle();
            show(i);
            NODES[i].card.scrollIntoView({
                behavior: reduced ? 'auto' : 'smooth', block: 'center'
            });
        });
        g.addEventListener('touchstart', function () { stopCycle(); show(i); }, { passive: true });
    });

    /* ---------- idle cycle ---------- */

    var timer = null;

    function stopCycle() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function startCycle() {
        if (timer || reduced) return;
        timer = setInterval(function () {
            show((active + 1) % NODES.length);
        }, 3200);
    }

    show(0);

    if (!reduced && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) startCycle(); else stopCycle();
        }, { threshold: 0.25 }).observe(mount);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopCycle();
    });

    mount.classList.add('is-ready');
})();
