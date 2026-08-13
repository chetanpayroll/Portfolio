/**
 * Answer Composer — builds answers the knowledge base never pre-wrote, by
 * computing and combining facts from ProfileFacts (js/profile-facts.js).
 *
 * Handlers: tenure math, year lookup, role/country comparison tables and
 * multi-intent composition. Each handler has a strict detector; when none
 * fires, the caller falls through to the normal card engine, so existing
 * behaviour is unchanged.
 *
 * Every composed answer carries a `source` ({label, href}) so the UI can show
 * a citation chip, and may carry `html: true` when it contains table markup.
 */

(function (global) {
    'use strict';

    const PF = global.ProfileFacts;
    if (!PF) { console.error('[answer-composer] ProfileFacts not loaded'); return; }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* =========================================================
       1. TENURE — "how long was he at deel", "since when at vertiv",
          "total experience", "how many years at aon"
       ========================================================= */

    const TENURE_RE = /\b(how long|how many (years|months)|since when|duration|tenure|total experience|years of experience)\b/i;

    function tenure(query) {
        if (!TENURE_RE.test(query)) return null;

        const role = PF.findRole(query);
        if (role) {
            const months = PF.monthsBetween(role.start, role.end);
            const span = PF.formatYM(role.start) + ' – ' + PF.formatYM(role.end);
            return {
                intent: 'computed-tenure',
                answer: 'Chetan ' + (role.end ? 'spent' : 'has spent') + ' **' + PF.formatDuration(months) +
                    '** at **' + role.company + '** (' + span + ') as ' + role.title + '.\n\n' + role.focus + '.',
                source: PF.SOURCES.roles,
                followUps: ['Compare ' + role.company + ' with his other roles', 'What is his total experience?']
            };
        }

        // No specific company → total career
        const months = PF.monthsBetween(PF.CAREER_START, null);
        return {
            intent: 'computed-tenure',
            answer: 'Chetan’s documented career spans **' + PF.formatDuration(months) +
                '** (since ' + PF.formatYM(PF.CAREER_START) + ') — presented on the site as **' +
                PF.METRICS.yearsExperience + ' years** across ' + PF.METRICS.countriesCareer +
                ' countries:\n\n' +
                PF.ROLES.map(r => '• **' + r.company + '** — ' + r.title + ' (' +
                    PF.formatYM(r.start) + ' – ' + PF.formatYM(r.end) + ')').join('\n'),
            source: PF.SOURCES.roles,
            followUps: ['How long was he at Deel?', 'Compare Deel vs Vertiv']
        };
    }

    /* =========================================================
       2. YEAR LOOKUP — "what was he doing in 2015"
       ========================================================= */

    const YEAR_CONTEXT_RE = /\b(doing|working|role|job|career|company|where was|what was|back in|during)\b/i;

    function yearLookup(query) {
        const m = query.match(/\b(19|20)\d{2}\b/);
        if (!m) return null;
        if (!YEAR_CONTEXT_RE.test(query)) return null;

        const year = parseInt(m[0], 10);
        const startYear = PF.parseYM(PF.CAREER_START).y;
        const now = new Date().getFullYear();

        if (year < startYear) {
            return {
                intent: 'computed-year',
                answer: 'Chetan’s documented career starts in **' + PF.formatYM(PF.CAREER_START) +
                    '** at AON Hewitt, so there’s nothing on record for ' + year +
                    '. His B.Sc at Rajasthan University completed in 2010.',
                source: PF.SOURCES.roles,
                followUps: ['What is his total experience?', 'What is his education?']
            };
        }
        if (year > now) {
            return null; // future years → let normal cards handle ("2026" often means Vertiv start)
        }

        const roles = PF.rolesInYear(year);
        if (!roles.length) return null;
        return {
            intent: 'computed-year',
            answer: 'In **' + year + '**, Chetan was ' +
                roles.map(r => '**' + r.title + '** at **' + r.company + '** (' +
                    PF.formatYM(r.start) + ' – ' + PF.formatYM(r.end) + ')').join(', transitioning to ') +
                '.\n\n' + roles[roles.length - 1].focus + '.',
            source: PF.SOURCES.roles,
            followUps: ['How long was he at ' + roles[roles.length - 1].company + '?', 'What is his experience?']
        };
    }

    /* =========================================================
       3. COMPARISONS — "deel vs vertiv", "compare hong kong and
          singapore", "difference between ..."
       ========================================================= */

    const COMPARE_RE = /\b(vs\.?|versus|compare|comparison|difference between|differ)\b/i;

    function comparison(query) {
        if (!COMPARE_RE.test(query)) return null;

        // Two roles?
        const roleHits = PF.ROLES.filter(r =>
            r.aliases.some(a => new RegExp('(?:^|\\W)' + a + '(?:$|\\W)', 'i').test(query)));
        if (roleHits.length >= 2) return roleTable(roleHits[0], roleHits[1]);

        // Two countries?
        const countries = PF.findCountries(query);
        if (countries.length >= 2) return countryTable(countries[0], countries[1]);

        return null;
    }

    function roleTable(a, b) {
        const row = (label, va, vb) =>
            '<tr><th>' + esc(label) + '</th><td>' + esc(va) + '</td><td>' + esc(vb) + '</td></tr>';
        const html =
            '<div class="cmp-scroll"><table class="cmp-table">' +
            '<thead><tr><th></th><th>' + esc(a.company) + '</th><th>' + esc(b.company) + '</th></tr></thead>' +
            '<tbody>' +
            row('Role', a.title, b.title) +
            row('Period', PF.formatYM(a.start) + ' – ' + PF.formatYM(a.end),
                PF.formatYM(b.start) + ' – ' + PF.formatYM(b.end)) +
            row('Duration', PF.formatDuration(PF.monthsBetween(a.start, a.end)),
                PF.formatDuration(PF.monthsBetween(b.start, b.end))) +
            row('Scope', a.scope, b.scope) +
            row('Focus', a.focus, b.focus) +
            '</tbody></table></div>';
        return {
            intent: 'computed-compare-roles',
            answer: 'Here’s **' + a.company + '** and **' + b.company + '** side by side:',
            htmlExtra: html,
            source: PF.SOURCES.roles,
            followUps: ['Tell me about ' + a.company, 'Tell me about ' + b.company]
        };
    }

    function countryTable(a, b) {
        const maxRows = Math.max(a.statutory.length, b.statutory.length);
        let body = '';
        for (let i = 0; i < maxRows; i++) {
            body += '<tr><td>' + esc(a.statutory[i] || '—') + '</td><td>' + esc(b.statutory[i] || '—') + '</td></tr>';
        }
        const html =
            '<div class="cmp-scroll"><table class="cmp-table">' +
            '<thead><tr><th>' + esc(a.name) + '</th><th>' + esc(b.name) + '</th></tr></thead>' +
            '<tbody>' + body + '</tbody></table></div>';
        return {
            intent: 'computed-compare-countries',
            answer: 'Statutory coverage in **' + a.name + '** vs **' + b.name + '** (both delivered hands-on):',
            htmlExtra: html,
            source: PF.SOURCES.countries,
            followUps: ['Tell me about ' + a.name, 'Tell me about ' + b.name, 'What other countries?']
        };
    }

    /* =========================================================
       4. MULTI-INTENT — "his experience and how to contact him"
       ========================================================= */

    const CONJ_RE = /\b(and|also|plus|as well as)\b|&|\+/i;

    // Card pairs that make sense to combine; both sides must clear threshold.
    function multiIntent(query, topMatches, minScore) {
        if (!CONJ_RE.test(query)) return null;
        if (!topMatches || topMatches.length < 2) return null;

        const a = topMatches[0], b = topMatches[1];
        if (!a || !b) return null;
        if (a.card.exactOnly || b.card.exactOnly) return null;
        if (a.card.action || b.card.action) return null;         // widgets can't be merged
        if (a.card.id === b.card.id) return null;
        if (b.score < minScore * 1.6) return null;               // second intent must be genuinely present

        return {
            intent: 'computed-multi',
            answer: '**' + a.card.intent + '**\n\n' + a.card.answer +
                '\n\n---\n\n**' + b.card.intent + '**\n\n' + b.card.answer,
            source: null,                                        // sections carry their own links
            followUps: (a.card.followUps || []).slice(0, 1).concat((b.card.followUps || []).slice(0, 1))
        };
    }

    /* =========================================================
       5. TOPIC CARRY — "and singapore?" after a Hong Kong question
       ========================================================= */

    function countryFollowUp(query, lastTopic) {
        if (lastTopic !== 'country') return null;
        const t = query.trim().toLowerCase();
        // short follow-ups only: "and singapore?", "what about the uk?"
        if (t.split(/\s+/).length > 5) return null;
        if (!/^(and|what about|how about|also)\b/.test(t)) return null;
        const hits = PF.findCountries(t);
        if (hits.length !== 1) return null;
        const c = hits[0];
        return {
            intent: 'computed-country-carry',
            answer: 'For **' + c.name + '**:\n\n' +
                c.statutory.map(s => '• ' + s).join('\n') + '\n\n' + c.detail,
            source: PF.SOURCES.countries,
            followUps: ['What other countries?', 'Compare ' + c.name + ' with Hong Kong']
        };
    }

    /* =========================================================
       Entry point — first detector that fires wins.
       ========================================================= */

    function compose(query, ctx) {
        ctx = ctx || {};
        return comparison(query)
            || tenure(query)
            || yearLookup(query)
            || countryFollowUp(query, ctx.lastTopic)
            || multiIntent(query, ctx.topMatches, ctx.minScore || 3.0)
            || null;
    }

    global.AnswerComposer = { compose, tenure, yearLookup, comparison, multiIntent, countryFollowUp };

})(typeof window !== 'undefined' ? window : globalThis);
