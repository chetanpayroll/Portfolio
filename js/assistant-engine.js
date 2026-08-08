/**
 * Retrieval engine for the Portfolio AI Assistant.
 *
 * Replaces the original first-match-wins if-else chain, which used a naive
 * `text.includes()` substring test. That approach had three defects:
 *
 *   1. "his" contains "hi", so any question containing "his" fell through to
 *      the greeting. Fixed here by whole-word (\b) matching.
 *   2. Keywords shared between rules (e.g. "achievements") were unreachable on
 *      the later rule. Fixed here by scoring every card and taking the best.
 *   3. No typo tolerance. Fixed here with a bounded Levenshtein fallback.
 *
 * Scoring: whole-word phrase hits + IDF-weighted term overlap, with a fuzzy
 * pass for near-miss tokens. Below the confidence floor we return "did you
 * mean" suggestions instead of a dead-end fallback.
 */

(function (global) {
    'use strict';

    const KBData = global.AssistantKB;
    if (!KBData) {
        console.error('[assistant-engine] AssistantKB not loaded');
        return;
    }

    const { KB, FALLBACK, SYNONYMS, ENTITIES } = KBData;

    /* ================= Tuning ================= */
    const PHRASE_WEIGHT = 6.0;   // per word of a matched phrase
    const TERM_WEIGHT = 3.0;     // multiplied by the term's IDF
    const PHRASE_TERM_WEIGHT = 0.4; // incidental phrase words score lower than curated terms
    const FUZZY_PENALTY = 0.55;  // fuzzy hits count for less than exact ones
    const MIN_SCORE = 3.0;       // below this we offer suggestions instead
    const STRONG_SCORE = 9.0;    // at/above this we treat confidence as high
    const MIN_FUZZY_LEN = 4;     // don't fuzzy-match very short tokens
    const MAX_EDIT_DISTANCE = 2;

    // Short words are only allowed a single edit; two edits on a 5-letter word
    // matches almost anything.
    function maxDistanceFor(len) {
        return len >= 7 ? MAX_EDIT_DISTANCE : 1;
    }
    const EXACT_ONLY_MAX_WORDS = 6;

    /* ================= Text utilities ================= */

    function normalize(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[‘’]/g, "'")
            .replace(/[^a-z0-9'\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Light suffix stripping. Deliberately conservative — we only fold the
    // endings that actually collide in this knowledge base.
    function stem(token) {
        if (token.length <= 4) return token;
        if (token.endsWith('ies') && token.length > 5) return token.slice(0, -3) + 'y';
        if (token.endsWith('ing') && token.length > 6) return token.slice(0, -3);
        if (token.endsWith('ions') && token.length > 6) return token.slice(0, -4);
        if (token.endsWith('ion') && token.length > 5) return token.slice(0, -3);
        if (token.endsWith('ments') && token.length > 7) return token.slice(0, -5);
        if (token.endsWith('ment') && token.length > 6) return token.slice(0, -4);
        if (token.endsWith('es') && token.length > 5) return token.slice(0, -2);
        if (token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
        return token;
    }

    // Escape a phrase for use in a whole-word regex.
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // THE core fix: whole-word containment. `\bhi\b` will not match "his".
    function containsWholeWord(haystack, needle) {
        if (!needle) return false;
        const re = new RegExp('(?:^|\\W)' + escapeRegex(needle) + '(?:$|\\W)', 'i');
        return re.test(haystack);
    }

    function levenshtein(a, b, max) {
        if (a === b) return 0;
        if (Math.abs(a.length - b.length) > max) return max + 1;
        let prev = new Array(b.length + 1);
        let curr = new Array(b.length + 1);
        for (let j = 0; j <= b.length; j++) prev[j] = j;
        for (let i = 1; i <= a.length; i++) {
            curr[0] = i;
            let rowMin = curr[0];
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
                if (curr[j] < rowMin) rowMin = curr[j];
            }
            if (rowMin > max) return max + 1; // early exit
            const tmp = prev; prev = curr; curr = tmp;
        }
        return prev[b.length];
    }

    /* ================= Index build ================= */

    // Generic function words. Any word that is a real KB term is removed from
    // this set below, so we never discard a meaningful token.
    const RAW_STOPWORDS = ['is', 'are', 'the', 'a', 'an', 'of', 'to', 'in', 'for', 'on', 'and',
        'or', 'with', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
        'can', 'could', 'would', 'should', 'will', 'i', 'you', 'me', 'my', 'your', 'we', 'us',
        'please', 'tell', 'him', 'his', 'he', 'she', 'her', 'them', 'at', 'by', 'from', 'as',
        'so', 'if', 'then', 'than', 'but', 'also', 'just', 'any', 'all', 'more', 'most', 'very',
        'really', 'know', 'want', 'need', 'like', 'give', 'say', 'said', 'about', 'chetan',
        'sharma', 'mr', 'sir', 'am', 'im', 'lets', 'let',
        // Pronouns are stripped from scoring (otherwise "there" fuzzy-matches
        // "where"), but still detected on the raw string for context carry-over.
        'there', 'it', 'that', 'this', 'they', 'those', 'these'];

    // Explicit `terms` are curated signals. Build the stopword set from these
    // ONLY — if phrase words were included, common words like "tell"/"about"
    // (from "tell me about chetan") would stop being stopwords and pollute
    // every score.
    const EXPLICIT_TERMS = new Set();
    KB.forEach(card => (card.terms || []).forEach(t => EXPLICIT_TERMS.add(stem(normalize(t)))));

    const STOPWORDS = new Set(
        RAW_STOPWORDS.map(w => stem(w)).filter(w => !EXPLICIT_TERMS.has(w))
    );

    const cards = KB.map(card => {
        const termSet = new Set((card.terms || []).map(t => stem(normalize(t))));
        const phrases = (card.phrases || []).map(p => normalize(p));
        // Phrase words are incidental signals — searchable, but scored lower
        // than curated terms (see PHRASE_TERM_WEIGHT).
        const phraseTermSet = new Set();
        phrases.forEach(p => p.split(' ').forEach(w => {
            const s = stem(w);
            if (w.length > 1 && !STOPWORDS.has(s) && !termSet.has(s)) phraseTermSet.add(s);
        }));
        return {
            ref: card,
            id: card.id,
            phrases,
            termSet,
            phraseTermSet,
            allTerms: new Set([...termSet, ...phraseTermSet]),
            exactOnly: !!card.exactOnly,
            weight: card.weight || 1.0
        };
    });

    const KB_TERMS = new Set();
    cards.forEach(c => c.allTerms.forEach(t => KB_TERMS.add(t)));

    // IDF over cards.
    const df = Object.create(null);
    cards.forEach(c => c.allTerms.forEach(t => { df[t] = (df[t] || 0) + 1; }));
    const N = cards.length;
    function idf(term) {
        const d = df[term] || 0;
        if (!d) return 0;
        return Math.log(1 + N / d);
    }

    /* ================= Query processing ================= */

    function tokenize(normalized) {
        const out = [];
        normalized.split(' ').forEach(raw => {
            if (!raw) return;
            const s = stem(raw);
            if (STOPWORDS.has(s)) return;
            out.push(s);
            const syn = SYNONYMS[raw] || SYNONYMS[s];
            if (syn) syn.forEach(x => out.push(stem(normalize(x))));
        });
        return out;
    }

    const PRONOUNS = ['there', 'it', 'that', 'this', 'they', 'them', 'those'];

    function hasPronounReference(normalized) {
        return PRONOUNS.some(p => containsWholeWord(normalized, p));
    }

    /* ================= Scoring ================= */

    function scoreCard(card, normalized, tokens, wordCount) {
        let score = 0;
        let matchedPhrase = false;

        for (const phrase of card.phrases) {
            if (containsWholeWord(normalized, phrase)) {
                matchedPhrase = true;
                score += PHRASE_WEIGHT * phrase.split(' ').length;
            }
        }

        // Greeting/thanks style cards must be essentially the whole query,
        // otherwise "hey, what is his experience?" would greet instead of answer.
        if (card.exactOnly) {
            if (!matchedPhrase) return 0;
            if (wordCount > EXACT_ONLY_MAX_WORDS) return 0;
            const meaningful = tokens.filter(t => KB_TERMS.has(t) && !card.allTerms.has(t));
            if (meaningful.length > 0) return 0;
            return score * card.weight;
        }

        const seen = new Set();
        for (const token of tokens) {
            if (seen.has(token)) continue;
            seen.add(token);

            if (card.termSet.has(token)) {
                score += TERM_WEIGHT * idf(token);
                continue;
            }
            if (card.phraseTermSet.has(token)) {
                score += TERM_WEIGHT * idf(token) * PHRASE_TERM_WEIGHT;
                continue;
            }

            // Fuzzy pass for typos ("expereince" -> "experience").
            if (token.length >= MIN_FUZZY_LEN) {
                const limit = maxDistanceFor(token.length);
                let best = null;
                let bestDist = limit + 1;
                for (const term of card.allTerms) {
                    if (term.length < MIN_FUZZY_LEN) continue;
                    if (Math.abs(term.length - token.length) > limit) continue;
                    const dist = levenshtein(token, term, limit);
                    if (dist < bestDist) { bestDist = dist; best = term; }
                    if (dist === 0) break;
                }
                if (best && bestDist <= limit) {
                    score += TERM_WEIGHT * idf(best) * FUZZY_PENALTY;
                }
            }
        }

        return score * card.weight;
    }

    /* ================= Public API ================= */

    function createEngine() {
        let lastEntityCardId = null;

        function rememberEntity(normalized) {
            for (const key of Object.keys(ENTITIES)) {
                if (containsWholeWord(normalized, key)) {
                    lastEntityCardId = ENTITIES[key];
                    return;
                }
            }
        }

        function match(query) {
            const normalized = normalize(query);
            const wordCount = normalized ? normalized.split(' ').length : 0;
            const tokens = tokenize(normalized);

            const scored = cards
                .map(c => ({ card: c, score: scoreCard(c, normalized, tokens, wordCount) }))
                .filter(s => s.score > 0)
                .sort((a, b) => b.score - a.score);

            let best = scored[0] || null;

            // Pronoun follow-up: "how long has he been there?" after Vertiv.
            if ((!best || best.score < MIN_SCORE) && lastEntityCardId && hasPronounReference(normalized)) {
                const carried = cards.find(c => c.id === lastEntityCardId);
                if (carried) {
                    best = { card: carried, score: MIN_SCORE, carried: true };
                }
            }

            rememberEntity(normalized);

            if (best && best.score >= MIN_SCORE) {
                return {
                    card: best.card.ref,
                    intent: best.card.ref.intent,
                    score: best.score,
                    confidence: Math.min(1, best.score / STRONG_SCORE),
                    matched: true,
                    carried: !!best.carried,
                    suggestions: []
                };
            }

            // Low confidence: offer the nearest questions rather than a dead end.
            // Chips show the readable intent label but send the canonical phrase.
            const suggestions = scored.slice(0, 3).map(s => ({
                label: s.card.ref.intent,
                query: (s.card.ref.phrases && s.card.ref.phrases[0]) || s.card.ref.intent
            }));

            return {
                card: null,
                intent: 'unmatched',
                score: best ? best.score : 0,
                confidence: 0,
                matched: false,
                carried: false,
                suggestions,
                answer: FALLBACK
            };
        }

        function reset() { lastEntityCardId = null; }

        return { match, reset };
    }


    global.AssistantEngine = {
        create: createEngine,
        // exposed for the QA harness
        _internals: { normalize, stem, tokenize, containsWholeWord, levenshtein, scoreCard, cards, idf }
    };

})(typeof window !== 'undefined' ? window : globalThis);
