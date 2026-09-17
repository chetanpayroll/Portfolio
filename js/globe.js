/**
 * Hero globe — a rotating dot sphere with the delivery hubs marked and
 * great-circle arcs running out of the Pune home base.
 *
 * Plain canvas 2D and an orthographic projection; no libraries, no data files.
 * The hub coordinates are the real latitudes and longitudes of the places
 * already named in the legend beside it.
 *
 * It degrades the way everything else on this page does: with reduced motion
 * it paints one static frame, and if canvas is unavailable nothing is lost —
 * the legend beside it carries the same information as text.
 */

(function () {
    'use strict';

    var canvas = document.getElementById('heroGlobe');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var GARNET = [225, 29, 72];
    var HOME = { lat: 18.52, lon: 73.86 };          // Pune
    var HUBS = [
        { lat: 51.51, lon: -0.13 },                 // United Kingdom
        { lat: 30.04, lon: 31.24 },                 // Egypt
        { lat: 32.08, lon: 34.78 },                 // Israel
        { lat: 25.20, lon: 55.27 },                 // UAE
        { lat: 22.32, lon: 114.17 },                // Hong Kong
        { lat: 1.35, lon: 103.82 },                 // Singapore
        { lat: -6.21, lon: 106.85 }                 // Indonesia
    ];

    /* ---------- vector helpers ---------- */

    function toVec(lat, lon) {
        var a = lat * Math.PI / 180, b = lon * Math.PI / 180;
        return [Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b)];
    }

    function rotY(v, t) {
        var c = Math.cos(t), s = Math.sin(t);
        return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
    }

    function rotX(v, t) {
        var c = Math.cos(t), s = Math.sin(t);
        return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
    }

    /** Spherical interpolation, so an arc follows the actual great circle. */
    function slerp(a, b, t) {
        var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        d = Math.max(-1, Math.min(1, d));
        var o = Math.acos(d);
        if (o < 1e-6) return a.slice();
        var s = Math.sin(o), w1 = Math.sin((1 - t) * o) / s, w2 = Math.sin(t * o) / s;
        return [a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2];
    }

    /* ---------- sphere of dots (Fibonacci distribution) ---------- */

    var DOTS = (function (n) {
        var pts = [], phi = Math.PI * (3 - Math.sqrt(5));
        for (var i = 0; i < n; i++) {
            var y = 1 - (i / (n - 1)) * 2;
            var r = Math.sqrt(Math.max(0, 1 - y * y));
            var th = phi * i;
            pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
        }
        return pts;
    })(720);

    /* Pre-compute each arc as a list of points lifted off the surface. */
    var ARCS = HUBS.map(function (h) {
        var a = toVec(HOME.lat, HOME.lon), b = toVec(h.lat, h.lon), pts = [];
        for (var i = 0; i <= 48; i++) {
            var t = i / 48;
            var p = slerp(a, b, t);
            var lift = 1 + 0.17 * Math.sin(Math.PI * t);   // arc rises then lands
            pts.push([p[0] * lift, p[1] * lift, p[2] * lift]);
        }
        return pts;
    });

    var HUB_VECS = HUBS.map(function (h) { return toVec(h.lat, h.lon); });
    var HOME_VEC = toVec(HOME.lat, HOME.lon);

    /* Opacity buckets for the surface dots (see draw()). */
    var BUCKETS = 10, bins = [], DOT_FILL = [];
    for (var bI = 0; bI < BUCKETS; bI++) {
        bins.push([]);
        DOT_FILL.push('rgba(255,225,235,' + ((bI + 0.5) / BUCKETS).toFixed(3) + ')');
    }

    var TILT = -0.42;              // lean the north pole toward the viewer
    var W = 0, H = 0, R = 0, CX = 0, CY = 0, dpr = 1;

    function resize() {
        var rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = rect.width; H = rect.height;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        R = Math.min(W, H) * 0.44;
        CX = W / 2; CY = H / 2;
        return true;
    }

    function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

    function project(v, spin) {
        var p = rotX(rotY(v, spin), TILT);
        return { x: CX + p[0] * R, y: CY - p[1] * R, z: p[2] };
    }

    function draw(spin, t) {
        ctx.clearRect(0, 0, W, H);

        // Atmosphere behind the sphere
        var halo = ctx.createRadialGradient(CX, CY, R * 0.55, CX, CY, R * 1.5);
        halo.addColorStop(0, rgba(GARNET, 0.22));
        halo.addColorStop(0.55, rgba(GARNET, 0.06));
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(CX, CY, R * 1.5, 0, Math.PI * 2); ctx.fill();

        // Globe body, lit from the upper left
        var body = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.4, R * 0.1, CX, CY, R);
        body.addColorStop(0, 'rgba(70,32,46,0.55)');
        body.addColorStop(1, 'rgba(14,9,12,0.86)');
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();

        // Surface dots — the far hemisphere stays dim so the sphere reads as solid.
        // Bucketed by opacity so fillStyle is assigned a handful of times per
        // frame rather than once per dot, which is what actually costs here.
        for (var bkt = 0; bkt < BUCKETS; bkt++) bins[bkt].length = 0;
        for (var i = 0; i < DOTS.length; i++) {
            var p = project(DOTS[i], spin);
            var a = p.z > 0 ? 0.10 + 0.5 * p.z : 0.05 * (1 + p.z);
            if (a <= 0.012) continue;
            var bi = (a * BUCKETS) | 0;
            if (bi >= BUCKETS) bi = BUCKETS - 1;
            bins[bi].push(p.x, p.y);
        }
        for (var bj = 0; bj < BUCKETS; bj++) {
            var bin = bins[bj];
            if (!bin.length) continue;
            ctx.fillStyle = DOT_FILL[bj];
            for (var q2 = 0; q2 < bin.length; q2 += 2) {
                ctx.fillRect(bin[q2] - 0.9, bin[q2 + 1] - 0.9, 1.8, 1.8);
            }
        }

        // Rim light
        ctx.strokeStyle = rgba(GARNET, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.stroke();

        // Arcs, drawn only where they are on the near side
        for (var k = 0; k < ARCS.length; k++) {
            var pts = ARCS[k], started = false;
            ctx.beginPath();
            for (var j = 0; j < pts.length; j++) {
                var q = project(pts[j], spin);
                if (q.z < -0.05) { started = false; continue; }
                if (!started) { ctx.moveTo(q.x, q.y); started = true; }
                else ctx.lineTo(q.x, q.y);
            }
            ctx.strokeStyle = rgba(GARNET, 0.55);
            ctx.lineWidth = 1.3;
            ctx.stroke();

            // A pulse of light travelling the route
            var tt = (t / 2600 + k / ARCS.length) % 1;
            var idx = Math.floor(tt * (pts.length - 1));
            var sp = project(pts[idx], spin);
            if (sp.z > -0.05) {
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.beginPath(); ctx.arc(sp.x, sp.y, 2.1, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Hub markers
        for (var m = 0; m < HUB_VECS.length; m++) {
            var hp = project(HUB_VECS[m], spin);
            if (hp.z <= 0) continue;
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.beginPath(); ctx.arc(hp.x, hp.y, 2.4, 0, Math.PI * 2); ctx.fill();
            var ring = ((t / 1800 + m * 0.18) % 1);
            ctx.strokeStyle = rgba(GARNET, (1 - ring) * 0.7);
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(hp.x, hp.y, 2.4 + ring * 11, 0, Math.PI * 2); ctx.stroke();
        }

        // Home base, a little brighter than the rest
        var home = project(HOME_VEC, spin);
        if (home.z > 0) {
            var g = ctx.createRadialGradient(home.x, home.y, 0, home.x, home.y, 16);
            g.addColorStop(0, rgba(GARNET, 0.85));
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(home.x, home.y, 16, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(home.x, home.y, 3.4, 0, Math.PI * 2); ctx.fill();
        }
    }

    /* ---------- run loop ---------- */

    var spin = -0.58;              // frames the UK-to-Hong-Kong spread toward the viewer
    var raf = null, visible = false, last = 0;

    function frame(ts) {
        if (!last) last = ts;
        var dt = Math.min(ts - last, 50);
        last = ts;
        spin += dt * 0.00009;
        draw(spin, ts);
        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (raf || reduced) return;
        last = 0;
        raf = requestAnimationFrame(frame);
    }

    function stop() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
    }

    function init() {
        if (!resize()) return;
        draw(spin, 0);
        if (reduced) return;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                if (visible) start(); else stop();
            }, { threshold: 0.01 }).observe(canvas);
        } else {
            start();
        }
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (resize()) draw(spin, performance.now());
        }, 150);
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else if (visible) start();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
