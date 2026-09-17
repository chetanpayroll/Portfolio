/**
 * Experience page controller.
 *
 * The career record carries a capability tag on every entry. This turns the
 * six skill categories already on the page into a filter over that record, so
 * the page can answer "show me the leadership evidence" instead of being read
 * end to end.
 *
 * Two rules it holds to:
 *
 *  - Nothing is ever hidden from someone who did not ask. The filter bar is
 *    `hidden` in the markup and only revealed here, so with JavaScript off the
 *    full record shows and no dead control is left on screen.
 *  - The counts are measured, never asserted. Every number shown is the length
 *    of the set actually matched, so the control cannot claim more evidence
 *    than the page holds.
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
        }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

        for (var j = 0; j < items.length; j++) io.observe(items[j]);
    })();

    /* ---------------- capability filter ---------------- */

    (function () {
        var bar = document.getElementById('xrFilter');
        if (!bar) return;

        var entries = [].slice.call(document.querySelectorAll('[data-cap]'));
        var roles = [].slice.call(document.querySelectorAll('.timeline-item'));
        var chips = [].slice.call(bar.querySelectorAll('.xr-chip'));
        var countEl = bar.querySelector('.xr-count');
        var cards = [].slice.call(document.querySelectorAll('.skill-card[data-cat]'));
        if (!entries.length || !chips.length) return;

        // Index once: which entries carry each category.
        var index = {};
        entries.forEach(function (li) {
            (li.getAttribute('data-cap') || '').split(/\s+/).forEach(function (c) {
                if (!c) return;
                (index[c] || (index[c] = [])).push(li);
            });
        });

        // Show the real size of each set on its chip. A category the record
        // cannot evidence says so rather than pretending.
        chips.forEach(function (chip) {
            var cat = chip.getAttribute('data-cat');
            var n = cat === 'all' ? entries.length : (index[cat] || []).length;
            var el = chip.querySelector('.xr-chip-count');
            if (el) el.textContent = String(n);
            chip.setAttribute('data-count', String(n));
            if (!n) chip.disabled = true;
        });

        var current = 'all';

        function apply(cat) {
            current = cat;
            var shown = 0;

            entries.forEach(function (li) {
                var caps = (li.getAttribute('data-cap') || '').split(/\s+/);
                var on = cat === 'all' || caps.indexOf(cat) !== -1;
                li.classList.toggle('is-out', !on);
                if (on) shown++;
            });

            // A role with nothing to show in this view recedes rather than
            // leaving an empty card behind.
            roles.forEach(function (role) {
                var any = role.querySelector('[data-cap]:not(.is-out)');
                role.classList.toggle('is-empty', !any);
            });

            chips.forEach(function (chip) {
                var on = chip.getAttribute('data-cat') === cat;
                chip.classList.toggle('is-on', on);
                chip.setAttribute('aria-checked', on ? 'true' : 'false');
                chip.setAttribute('tabindex', on ? '0' : '-1');
            });

            cards.forEach(function (card) {
                card.classList.toggle('is-on', card.getAttribute('data-cat') === cat);
            });

            if (countEl) {
                countEl.textContent = cat === 'all'
                    ? shown + ' entries across four roles'
                    : shown + ' of ' + entries.length + ' entries';
            }

            document.body.classList.toggle('xr-filtered', cat !== 'all');
        }

        function select(chip, focus) {
            if (!chip || chip.disabled) return;
            apply(chip.getAttribute('data-cat'));
            if (focus) chip.focus();
            // Keep the chosen chip in view in the scrolling row.
            if (chip.scrollIntoView) {
                chip.scrollIntoView({
                    behavior: reduced ? 'auto' : 'smooth',
                    block: 'nearest', inline: 'nearest'
                });
            }
        }

        bar.addEventListener('click', function (e) {
            var chip = e.target.closest('.xr-chip');
            if (chip) select(chip, false);
        });

        // Roving tabindex: a radio group moves with the arrow keys, not Tab.
        bar.addEventListener('keydown', function (e) {
            var i = chips.indexOf(document.activeElement);
            if (i === -1) return;
            var next = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i + 1;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i - 1;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = chips.length - 1;
            else return;
            e.preventDefault();
            if (next < 0) next = chips.length - 1;
            if (next >= chips.length) next = 0;
            select(chips[next], true);
        });

        // Clicking a skill card filters to that category — same state, two doors.
        cards.forEach(function (card) {
            card.addEventListener('click', function () {
                var chip = chips.filter(function (c) {
                    return c.getAttribute('data-cat') === card.getAttribute('data-cat');
                })[0];
                if (!chip || chip.disabled) return;
                select(chip, false);
                bar.scrollIntoView({
                    behavior: reduced ? 'auto' : 'smooth', block: 'start'
                });
            });
        });

        bar.hidden = false;      // only now is there something worth showing
        apply('all');
    })();

    /* ---------------- header over the dark hero ---------------- */

    (function () {
        var body = document.body;
        if (!body.classList.contains('experience-page')) return;
        var ticking = false;

        function applyScroll() {
            body.classList.toggle('is-scrolled', window.scrollY > 60);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(applyScroll); }
        }, { passive: true });

        applyScroll();
    })();
})();
