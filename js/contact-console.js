/**
 * Contact console.
 *
 * The contact page used to be a form and three coloured tiles. This turns it
 * into something that actually knows the situation: what time it is where he
 * is, what time it is where you are, whether that overlaps, and which slots
 * are genuinely open — shown in your own timezone, read from the same booking
 * engine the widget uses.
 *
 * Everything here degrades quietly. If the calendar module is missing, or
 * Intl cannot resolve a timezone, the page is still a working contact form.
 */

(function () {
    'use strict';

    const CU = window.CalendarUtils || null;

    /* ---------------- helpers ---------------- */

    const $ = (id) => document.getElementById(id);

    function hostParts(now) {
        if (CU && CU.partsInZone) return CU.partsInZone(now, CU.HOST_TZ);
        return null;
    }

    function fmt(now, zone) {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: zone
            }).format(now);
        } catch (e) { return null; }
    }

    function zoneLabel(zone) {
        if (!zone) return '';
        return zone.replace(/_/g, ' ');
    }

    /* ---------------- live clocks + status ---------------- */

    const hostClock = $('ccHostClock');
    const hostNote = $('ccHostNote');
    const visClock = $('ccVisitorClock');
    const visNote = $('ccVisitorNote');
    const status = $('ccStatus');

    const HOST_TZ = (CU && CU.HOST_TZ) || 'Asia/Kolkata';
    let visitorTZ = null;
    try {
        visitorTZ = (CU && CU.visitorTimeZone && CU.visitorTimeZone()) ||
            Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) { visitorTZ = null; }

    // The bookable day runs 10:00–20:00 IST (the slot table in calendar-utils),
    // so treat that as the window rather than inventing office hours.
    const OPEN_HOUR = 10, CLOSE_HOUR = 20;

    function tick() {
        const now = new Date();

        if (hostClock) hostClock.textContent = fmt(now, HOST_TZ) || '--:--';
        if (visClock && visitorTZ) visClock.textContent = fmt(now, visitorTZ) || '--:--';

        const hp = hostParts(now);
        if (hostNote && hp) {
            const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
                new Date(Date.UTC(hp.year, hp.month - 1, hp.day)).getUTCDay()];
            hostNote.textContent = day + ' · Asia/Kolkata';
        }

        if (visNote) {
            if (visitorTZ && visitorTZ !== HOST_TZ) {
                visNote.textContent = zoneLabel(visitorTZ);
            } else if (visitorTZ) {
                visNote.textContent = 'Same timezone as Chetan';
            } else {
                visNote.textContent = 'Timezone unavailable in this browser';
            }
        }

        if (status && hp) {
            const dow = new Date(Date.UTC(hp.year, hp.month - 1, hp.day)).getUTCDay();
            const weekend = dow === 0 || dow === 6;
            const open = !weekend && hp.hour >= OPEN_HOUR && hp.hour < CLOSE_HOUR;
            const text = status.querySelector('.cc-status-text');
            status.classList.toggle('is-open', open);
            if (text) {
                text.textContent = open
                    ? 'Working hours in Pune right now — a message sent today usually gets an answer today.'
                    : (weekend
                        ? 'Weekend in Pune — send it anyway; he picks messages up on Monday morning.'
                        : 'Outside working hours in Pune — send it anyway; it will be read in the morning.');
            }
        }
    }

    if (hostClock || visClock || status) {
        tick();
        setInterval(tick, 30000);
    }

    /* ---------------- next open slots, in the visitor's timezone ---------------- */

    const slotsBox = $('ccSlots');

    function renderSlots() {
        if (!slotsBox) return;
        if (!CU || !CU.generateSlots) {
            slotsBox.innerHTML = '<p class="cc-slots-loading">Use the button below to pick a time.</p>';
            return;
        }

        let slots = [];
        try { slots = CU.generateSlots(new Date()) || []; } catch (e) { slots = []; }
        if (!slots.length) {
            slotsBox.innerHTML = '<p class="cc-slots-loading">Use the button below to pick a time.</p>';
            return;
        }

        const tz = visitorTZ || HOST_TZ;
        const picked = slots.slice(0, 3);

        slotsBox.innerHTML = picked.map(function (instant) {
            const d = (instant instanceof Date) ? instant : new Date(instant);
            let day = '', time = '';
            try {
                day = new Intl.DateTimeFormat('en-GB', {
                    weekday: 'short', day: 'numeric', month: 'short', timeZone: tz
                }).format(d);
                time = fmt(d, tz) || '';
            } catch (e) { return ''; }
            return '<button type="button" class="cc-slot trigger-booking-flow">' +
                '<span class="cc-slot-day">' + day + '</span>' +
                '<span class="cc-slot-time">' + time + '</span>' +
                '</button>';
        }).join('');

        const foot = document.querySelector('.cc-slots-foot');
        if (foot && visitorTZ && visitorTZ !== HOST_TZ) {
            foot.textContent = 'Shown in ' + zoneLabel(visitorTZ) +
                '. Thirty minutes. No payment, no forms beyond your name and email.';
        }
    }

    renderSlots();

    /* ---------------- route chooser ---------------- */

    const routes = $('ccRoutes');
    const routeHint = $('ccRouteHint');
    const subject = $('subject');

    if (routes) {
        routes.addEventListener('click', function (e) {
            const btn = e.target.closest('.cc-route');
            if (!btn) return;

            routes.querySelectorAll('.cc-route').forEach(function (b) {
                b.classList.toggle('is-active', b === btn);
                b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
            });

            if (subject && btn.dataset.topic) {
                subject.value = btn.dataset.topic;
                subject.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (routeHint && btn.dataset.hint) routeHint.innerHTML = btn.dataset.hint;

            const msg = $('message');
            if (msg) msg.focus({ preventScroll: true });
            const panel = document.querySelector('.cc-form-panel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    /* ---------------- job-description detection ---------------- */

    const message = $('message');
    const nudge = $('ccJdNudge');
    const jdGo = $('ccJdGo');

    const JD_SIGNALS = /\b(responsibilities|requirements|qualifications|job description|role summary|what you.ll do|we are looking for|minimum experience|years of experience|reports to|job title|key duties)\b/i;

    if (message && nudge) {
        let shown = false;
        message.addEventListener('input', function () {
            if (shown) return;
            const v = message.value;
            if (v.length > 240 && JD_SIGNALS.test(v)) {
                nudge.hidden = false;
                shown = true;
            }
        });
    }

    if (jdGo) {
        jdGo.addEventListener('click', function () {
            const toggle = document.getElementById('chat-toggle') ||
                document.getElementById('chat-toggle-btn');
            if (toggle) toggle.click();
            setTimeout(function () {
                const input = document.getElementById('chat-input');
                const form = document.getElementById('chat-form');
                if (input && form) {
                    input.value = 'Match a job description';
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }, 450);
        });
    }

    /* ---------------- copy to clipboard ---------------- */

    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.cc-copy');
        if (!btn) return;
        const value = btn.getAttribute('data-copy');
        if (!value) return;

        const done = function () {
            const original = btn.textContent;
            btn.textContent = 'Copied';
            btn.classList.add('is-copied');
            setTimeout(function () {
                btn.textContent = original;
                btn.classList.remove('is-copied');
            }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(done).catch(function () { });
        } else {
            const ta = document.createElement('textarea');
            ta.value = value;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (err) { }
            document.body.removeChild(ta);
        }
    });

    /* ---------------- header over the dark hero ---------------- */

    (function () {
        const body = document.body;
        if (!body.classList.contains('contact-page')) return;
        let ticking = false;
        function apply() {
            body.classList.toggle('is-scrolled', window.scrollY > 60);
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(apply); }
        }, { passive: true });
        apply();
    })();

    /* ---------------- scroll reveal ---------------- */

    (function () {
        document.documentElement.setAttribute('data-reveal-ready', '');
        const items = document.querySelectorAll('[data-reveal]');
        if (!items.length) return;

        const reduced = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function showAll() {
            for (let i = 0; i < items.length; i++) items[i].classList.add('is-in');
        }

        if (reduced || !('IntersectionObserver' in window)) { showAll(); return; }

        const io = new IntersectionObserver(function (entries) {
            for (let i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add('is-in');
                    io.unobserve(entries[i].target);
                }
            }
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

        for (let i = 0; i < items.length; i++) io.observe(items[i]);
    })();
})();
