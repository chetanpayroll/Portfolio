/**
 * Assistant Reasoner — the layer that turns the retrieval engine into something
 * that can answer a question it has no card for.
 *
 * The card engine can only return an answer someone wrote in advance, so
 * questions a recruiter actually asks ("give me three reasons to interview
 * him", "what would he do in his first 90 days", "has he used Workday")
 * either got silence or, worse, a confident answer about the wrong subject.
 *
 * This module classifies the *kind* of question first, then composes a reply
 * out of the fact graph. Two rules hold everywhere in here:
 *
 *   1. Nothing is invented. Every claim is a string from ProfileFacts or the
 *      published pages, recombined — never generated.
 *   2. When the record does not cover something, it says so plainly and points
 *      at the real route, instead of reaching for the nearest keyword match.
 *
 * Detectors are strict. When none fires the module returns null and the engine
 * behaves exactly as it did before.
 */

(function (global) {
    'use strict';

    const PF = global.ProfileFacts;
    if (!PF) { return; }

    const SRC = PF.SOURCES;

    /* =========================================================
       EVIDENCE BASE
       Assembled from the role key points and headline metrics, each
       tagged so an answer can select the evidence that fits the question.
       ========================================================= */

    const EVIDENCE = [];

    function addEvidence(text, tags, weight, source, role) {
        EVIDENCE.push({ text: text, tags: tags, weight: weight, source: source, role: role });
    }

    // Vertiv — current transformation programme
    addEvidence('leads a 21-month global payroll transformation at Vertiv across **54 countries, 179 legal entities and 36,720 employees**',
        ['scale', 'transformation', 'current', 'leadership'], 10, SRC.roles, 'Vertiv');
    addEvidence('consolidated payroll vendors down to four — ADP GlobalView, ADP Celergo, SD Worx and Neeyamo — for **$964K of annual savings** (PEPM $12.92 → $10.73)',
        ['savings', 'vendor', 'transformation', 'commercial'], 10, SRC.roles, 'Vertiv');
    addEvidence('built a 35-tab self-validating Control Tower on SharePoint, with a parallel-run **0.5% variance go/no-go gate**',
        ['governance', 'controls', 'method', 'automation', 'risk'], 9, SRC.roles, 'Vertiv');
    addEvidence('sequenced the programme into **4 strategic batches and 11 tactical waves** rather than a single cutover',
        ['method', 'planning', 'risk', 'transformation'], 8, SRC.roles, 'Vertiv');
    addEvidence('runs AI programme intelligence on Amazon Bedrock and QuickSight, with **ADKAR change management across 70+ stakeholders**',
        ['ai', 'change', 'leadership', 'stakeholders'], 8, SRC.roles, 'Vertiv');

    // Deel — delivery record
    addEvidence('delivered **12+ multi-country implementations** (Hong Kong, Singapore, Indonesia, UAE, Egypt, Israel, United Kingdom) — 100% within SLA at **99.8% accuracy**',
        ['delivery', 'compliance', 'countries', 'quality'], 10, SRC.roles, 'Deel');
    addEvidence('ran Project Unity, migrating **2,000+ employees across 18 countries with zero payroll disruption**',
        ['migration', 'risk', 'delivery', 'scale'], 10, SRC.roles, 'Deel');
    addEvidence('built the ICP Service Dashboard and a Two-Way Validation Engine, saving **15+ and 12+ hours every week**',
        ['automation', 'tooling', 'efficiency'], 9, SRC.roles, 'Deel');
    addEvidence('earned **5 promotions** at Deel plus the Global Bolt Award',
        ['recognition', 'progression', 'leadership'], 9, SRC.roles, 'Deel');

    // Earlier career
    addEvidence('administered COBRA and QMCSO compliance for 500+ employees with **zero violations** at Xerex',
        ['compliance', 'quality'], 6, SRC.roles, 'Xerex');
    addEvidence('maintained the Vantive HR Portal for 15+ enterprise clients and **500,000+ employee records** at AON Hewitt',
        ['scale', 'data'], 6, SRC.roles, 'AON Hewitt');

    // Career-level metrics
    addEvidence('**' + PF.METRICS.yearsExperience + ' years** in global payroll across **' + PF.METRICS.countriesCareer + ' countries**, with **' + PF.METRICS.payrollCycles + ' payroll cycles** run at **' + PF.METRICS.accuracy + ' accuracy**',
        ['scale', 'quality', 'career'], 9, SRC.metrics, null);

    function pickEvidence(tags, n) {
        const scored = EVIDENCE.map(function (e) {
            let s = e.weight;
            for (let i = 0; i < tags.length; i++) {
                if (e.tags.indexOf(tags[i]) !== -1) s += 6 - Math.min(i, 4);
            }
            return { e: e, s: s };
        }).sort(function (a, b) { return b.s - a.s; });

        const out = [], seenRole = {};
        for (let i = 0; i < scored.length && out.length < n; i++) {
            const ev = scored[i].e;
            // spread the evidence across employers rather than stacking one role
            if (ev.role && seenRole[ev.role] >= 2) continue;
            if (ev.role) seenRole[ev.role] = (seenRole[ev.role] || 0) + 1;
            out.push(ev);
        }
        return out;
    }

    function bullets(list) {
        return list.map(function (e) {
            return '• ' + e.text.charAt(0).toUpperCase() + e.text.slice(1);
        }).join('\n');
    }

    /* =========================================================
       DOCUMENTED STACK — so "has he used X" can be answered either way
       ========================================================= */

    const STACK = {
        'oracle fusion hcm': 'Oracle Fusion HCM — the system of record on the Vertiv programme',
        'oracle fusion': 'Oracle Fusion HCM — the system of record on the Vertiv programme',
        'oracle': 'Oracle Fusion HCM and Oracle Integration Cloud',
        'oic': 'Oracle Integration Cloud',
        'oracle integration cloud': 'Oracle Integration Cloud',
        'adp': 'ADP GlobalView and ADP Celergo',
        'adp globalview': 'ADP GlobalView',
        'globalview': 'ADP GlobalView',
        'celergo': 'ADP Celergo',
        'sd worx': 'SD Worx',
        'sdworx': 'SD Worx',
        'neeyamo': 'Neeyamo',
        'deel': 'Deel — where he spent 7+ years',
        'unity': 'Unity — the platform behind Project Unity',
        'payroll2u': 'Payroll2u',
        'power apps': 'Power Apps',
        'power automate': 'Power Automate',
        'power platform': 'the Microsoft Power Platform — Power Apps, Power Automate and SharePoint',
        'sharepoint': 'SharePoint — including the 35-tab Control Tower',
        'bedrock': 'Amazon Bedrock',
        'amazon bedrock': 'Amazon Bedrock',
        'quicksight': 'Amazon QuickSight',
        'monday.com': 'Monday.com',
        'monday': 'Monday.com',
        'gainsight': 'Gainsight',
        'excel': 'Advanced Excel and Power Query',
        'power query': 'Power Query',
        'vba': 'VBA and VBScript automation',
        'google apps script': 'Google Apps Script',
        'apps script': 'Google Apps Script',
        'peoplesoft': 'PeopleSoft',
        'teams': 'Microsoft Teams',
        'slack': 'Slack'
    };

    // Named explicitly so the answer can be a clean "no", not a vague miss.
    const NOT_IN_STACK = ['workday', 'successfactors', 'sap', 'ceridian', 'dayforce', 'ukg',
        'kronos', 'paychex', 'paycom', 'gusto', 'zenefits', 'bamboohr', 'namely',
        'tally', 'zoho payroll', 'greythr', 'darwinbox'];

    const STACK_SUMMARY = 'Oracle Fusion HCM (system of record), Oracle Integration Cloud, ADP GlobalView, ADP Celergo, SD Worx, Neeyamo, Deel, the Microsoft Power Platform, and Amazon Bedrock / QuickSight';

    /* =========================================================
       1. META — questions about the assistant itself
       ========================================================= */

    const META_RE = /\b(are you (a )?(real|human|person|bot|ai|robot)|who (are|made|built|created) you|what are you|are you chatgpt|is this (a )?(bot|ai|real)|what can you do|how do you work|what do you know)\b/i;

    function meta(query) {
        if (!META_RE.test(query)) return null;

        if (/what can you do|what do you know|how do you work/i.test(query)) {
            return {
                intent: 'About this assistant',
                answer: 'I answer questions about **Chetan Sharma\'s professional record** — nothing else.\n\n' +
                    'I work from a structured fact graph built out of this site: his four roles, the countries he has delivered in, the programmes he has run, the tools in his stack, his certifications and his metrics. I can compute things too, like exact tenure or a side-by-side comparison of two roles.\n\n' +
                    'What I will not do is guess. If the record does not cover something, I will tell you that rather than invent an answer.',
                source: null,
                followUps: ['What is his experience?', 'Compare Deel vs Vertiv', 'Match a job description']
            };
        }

        return {
            intent: 'About this assistant',
            answer: 'I\'m an assistant built into Chetan\'s site — not a person, and not a general chatbot.\n\n' +
                'Everything I say comes from a fact graph of his published record, so I can be specific about dates, scope and numbers, and honest when something simply is not documented.\n\n' +
                'If you want Chetan himself, the fastest route is a 30-minute intro call.',
            source: SRC.contact,
            followUps: ['Book a meeting', 'How can I contact Chetan?', 'What is his experience?']
        };
    }

    /* =========================================================
       2. NOT DOCUMENTED — answer honestly instead of keyword-matching
       ========================================================= */

    const UNDOCUMENTED = [
        {
            re: /\b(salary|compensation|pay expectation|rate|day rate|how much (does he|would he) (charge|cost)|package|ctc|remuneration)\b/i,
            what: 'compensation',
            line: 'Compensation is not published on this site — that is a conversation to have with him directly.'
        },
        {
            re: /\b(notice period|when can he (start|join)|availability to start|how soon can he)\b/i,
            what: 'notice period',
            line: 'His notice period and start date are not published here.'
        },
        {
            re: /\b(visa|work permit|sponsorship|right to work|passport|citizenship)\b/i,
            what: 'visa status',
            line: 'Visa and work-authorisation details are not published here.'
        },
        {
            re: /\b(relocat\w*|willing to move|move to|shift to)\b/i,
            what: 'relocation',
            line: 'Relocation preferences are not published here. What the record does show is that he has delivered across 25+ countries from a base in Pune, India.'
        },
        {
            re: /\b(speak|language[s]?|fluent|multilingual)\b.*\b(french|spanish|german|arabic|mandarin|chinese|japanese|language)\b|\b(what|which) languages\b/i,
            what: 'languages',
            line: 'Spoken languages are not listed on this site.'
        },
        {
            re: /\b(age|how old|married|marital|family|religion|caste|personal life|hobbies)\b/i,
            what: 'personal details',
            line: 'This site covers professional history only, so I do not hold personal details.'
        },
        {
            re: /\b(reference[s]?|referee|background check|previous manager'?s? (number|contact))\b/i,
            what: 'references',
            line: 'References are not published here — he would share those directly.'
        }
    ];

    function undocumented(query) {
        for (let i = 0; i < UNDOCUMENTED.length; i++) {
            if (UNDOCUMENTED[i].re.test(query)) {
                return {
                    intent: 'Not documented',
                    answer: UNDOCUMENTED[i].line + '\n\nI only answer from what is actually on the record, so I would rather say that than guess. Chetan replies to enquiries directly — a 30-minute intro call is the quickest way to cover it.',
                    source: SRC.contact,
                    followUps: ['Book a meeting', 'How can I contact Chetan?', 'What is his experience?']
                };
            }
        }
        return null;
    }

    /* =========================================================
       3. CAPABILITY — "has he used X", "does he know Y"
       ========================================================= */

    const CAPABILITY_RE = /\b(does he (have|know|use|work with)|has he (used|worked with|done|any experience)|is he (familiar|experienced)|experience (with|in|of)|can he (use|handle|do|work))\b/i;

    function capability(query) {
        if (!CAPABILITY_RE.test(query)) return null;
        const q = query.toLowerCase();

        for (let i = 0; i < NOT_IN_STACK.length; i++) {
            const name = NOT_IN_STACK[i];
            if (q.indexOf(name) !== -1) {
                const pretty = name.charAt(0).toUpperCase() + name.slice(1);
                return {
                    intent: 'Tooling — honest answer',
                    answer: '**' + pretty + ' is not in his documented stack.** I will not stretch a near-match into a yes.\n\n' +
                        'What is on the record is ' + STACK_SUMMARY + '.\n\n' +
                        'Worth noting that his last two roles were both platform migrations — he moved 2,000+ employees across 18 countries on Project Unity, and is moving 54 countries onto Oracle Fusion HCM now — so picking up a new payroll platform is the job he has been doing, not a gap.',
                    source: SRC.tools,
                    followUps: ['What tools does he use?', 'Tell me about Project Unity', 'Match a job description']
                };
            }
        }

        // Geography — the named implementations are specific, but the site also
        // claims regional statutory coverage, so answer with both and neither
        // overclaim nor deny.
        const NAMED = Object.keys(PF.COUNTRIES).map(function (k) { return PF.COUNTRIES[k].name; });
        const GEO_MISS = /\b(united states|usa|u\.s\.|us payroll|america|canada|brazil|mexico|australia|japan|germany|france|china|nigeria|south africa)\b/i;
        const geoHit = query.match(GEO_MISS);
        if (geoHit && !/\b(uae|dubai|singapore|hong kong|egypt|israel|united kingdom|uk|indonesia)\b/i.test(query)) {
            const place = geoHit[0].replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            return {
                intent: 'Country coverage — honest answer',
                answer: '**' + place + ' is not one of the implementations named on this site.** The ones documented by name are ' +
                    NAMED.join(', ') + '.\n\n' +
                    'Two things are worth knowing before you read that as a no. The site does state statutory coverage across **EMEA, APAC and the Americas**, and the current Vertiv programme spans **54 countries** — most of which are not individually named here.\n\n' +
                    'So the honest answer is: not documented specifically, quite possibly in scope. Chetan can confirm in a minute; I would rather not guess.',
                source: SRC.countries,
                followUps: ['Which countries has he worked with?', 'Book a meeting', 'Match a job description']
            };
        }

        const keys = Object.keys(STACK).sort(function (a, b) { return b.length - a.length; });
        for (let j = 0; j < keys.length; j++) {
            if (q.indexOf(keys[j]) !== -1) {
                return {
                    intent: 'Tooling — documented',
                    answer: 'Yes — **' + STACK[keys[j]] + '** is part of his documented stack.\n\n' +
                        bullets(pickEvidence(['tooling', 'automation', 'transformation'], 2)),
                    source: SRC.tools,
                    followUps: ['What tools does he use?', 'What are his skills?', 'Match a job description']
                };
            }
        }
        return null;
    }

    /* =========================================================
       4. EVALUATIVE — "why hire him", "three reasons", "strengths"
       ========================================================= */

    const EVAL_RE = /\b(why (should|would) (i|we|anyone)|why hire|reasons to (hire|interview|talk|meet)|(three|3|top) reasons|what makes him|most impressive|biggest (achievement|accomplishment|win|weakness)|his (strengths|weakness(es)?|gaps?|limitations?)|any weakness|what is he (good|best) at|not good at|fall short|downside|drawback|stand ?out|standout|better than|over (a|an|someone)|is he (a )?(good|strong|right) fit|suitable for|worth (a call|interviewing|hiring))\b/i;

    function evaluative(query) {
        if (!EVAL_RE.test(query)) return null;
        const q = query.toLowerCase();

        let tags = ['scale', 'delivery', 'savings'];
        if (/cost|saving|budget|commercial|roi/.test(q)) tags = ['savings', 'commercial', 'vendor'];
        if (/risk|safe|disruption|reliab/.test(q)) tags = ['risk', 'quality', 'governance'];
        if (/lead|manage|team|people/.test(q)) tags = ['leadership', 'change', 'stakeholders'];
        if (/tech|automation|ai|tool/.test(q)) tags = ['automation', 'ai', 'tooling'];

        const picked = pickEvidence(tags, 3);
        const weakness = /weak|downside|gap|limitation|con\b|cons\b/.test(q);

        if (weakness) {
            return {
                intent: 'Honest read of the record',
                answer: 'He has not published a self-assessment, and I am not going to invent one.\n\n' +
                    'What I can do is show you the shape of the record so you can judge the fit yourself. It is deep in **multi-country payroll transformation, vendor consolidation and statutory compliance across APAC, EMEA and LATAM** — and it is specialised. If a role needs something outside that, the site will not claim otherwise.\n\n' +
                    'The most useful thing here is the **JD match** — paste a job description and I will show you which requirements the record actually covers and which it does not.',
                source: SRC.roles,
                followUps: ['Match a job description', 'What is his experience?', 'Book a meeting']
            };
        }

        return {
            intent: 'The case, from the record',
            answer: 'Straight from the record, no spin:\n\n' + bullets(picked) +
                '\n\nEvery one of those is on the site with its numbers attached — I have just picked the three that answer your question.',
            source: SRC.roles,
            followUps: ['Match a job description', 'Tell me about the Vertiv programme', 'Book a meeting']
        };
    }

    /* =========================================================
       5. HYPOTHETICAL — "how would he approach", "first 90 days"
       ========================================================= */

    const HYPO_RE = /\b(how would he|what would he do|how does he (handle|approach|deal|manage|run)|his approach to|first (90|ninety|30|thirty|60|sixty) days|if (he|you) (were|had to)|how does he (go about|tackle)|what is his (process|method|playbook))\b/i;

    function hypothetical(query) {
        if (!HYPO_RE.test(query)) return null;
        const q = query.toLowerCase();

        const isPlan = /first (90|ninety|30|thirty|60|sixty) days|start|joining|onboard/.test(q);
        const isFailure = /fail|error|wrong|issue|incident|problem|crisis|missed|late|dispute/.test(q);

        if (isFailure) {
            return {
                intent: 'How the record says he controls risk',
                answer: 'He has not written an incident-management essay, so here is what the record actually shows about how he keeps runs from failing in the first place:\n\n' +
                    bullets(pickEvidence(['governance', 'controls', 'risk', 'quality'], 3)) +
                    '\n\nThe pattern is prevention by design — validate before cutover, gate on variance, and keep a live control view — rather than recovery after the fact.',
                source: SRC.roles,
                followUps: ['Tell me about the Vertiv programme', 'Tell me about Project Unity', 'What are his skills?']
            };
        }

        if (isPlan) {
            return {
                intent: 'How he sequences a programme',
                answer: 'There is no published 90-day plan — but his actual sequencing is on the record, which is more useful than a generic one:\n\n' +
                    bullets(pickEvidence(['method', 'planning', 'governance', 'change'], 3)) +
                    '\n\nSo the pattern is: map the estate, batch and wave it rather than big-bang, stand up governance and a control view early, and run change management alongside — not after.',
                source: SRC.roles,
                followUps: ['Tell me about the Vertiv programme', 'What are his skills?', 'Book a meeting']
            };
        }

        return {
            intent: 'His method, from the record',
            answer: 'Rather than speculate, here is how he has actually done it:\n\n' +
                bullets(pickEvidence(['method', 'transformation', 'governance', 'vendor'], 3)) +
                '\n\nIf you want this against a specific brief, paste the job description and I will map it requirement by requirement.',
            source: SRC.roles,
            followUps: ['Match a job description', 'Tell me about the Vertiv programme', 'Book a meeting']
        };
    }

    /* =========================================================
       6. LEADERSHIP & TEAM — asked constantly, previously answered
          with the Power Platform card
       ========================================================= */

    const LEAD_RE = /\b(manage[d]? a team|team size|how (big|many) (a |is )?(his |the )?team|people (report|reporting)|direct reports|lead[s]? a team|leadership style|how does he lead|管理|stakeholder management|does he manage)\b/i;

    function leadership(query) {
        if (!LEAD_RE.test(query)) return null;
        return {
            intent: 'Leadership, from the record',
            answer: 'A headcount for his direct reports is not published, so I will not put a number on it.\n\n' +
                'What the record does document is the span he operates across:\n\n' +
                bullets(pickEvidence(['leadership', 'change', 'stakeholders', 'recognition'], 3)) +
                '\n\nThe consistent signal is influence across a wide stakeholder base and repeated internal promotion, rather than a stated org chart.',
            source: SRC.roles,
            followUps: ['Tell me about the Vertiv programme', 'What are his achievements?', 'Book a meeting']
        };
    }

    /* =========================================================
       7. CONTINUATION — "tell me more", "and then?", "why?"
       ========================================================= */

    const CONT_RE = /^(tell me more|more|go on|and then\??|then\??|continue|what else|anything else|ok(ay)? and( then)?\??|elaborate|expand|why\??|really\??)[.!?]*$/i;
    const SUMMARISE_RE = /^(summari[sz]e( that| this| it)?( in one line| briefly| short)?|tldr|in short|one line|shorter)[.!?]*$/i;

    function continuation(query, ctx) {
        const t = query.trim();

        if (SUMMARISE_RE.test(t)) {
            if (!ctx || !ctx.lastAnswerText) return null;
            const first = ctx.lastAnswerText
                .replace(/\*\*/g, '')
                .split(/\n+/).filter(Boolean)
                .map(function (l) { return l.replace(/^[•\-\s]+/, '').trim(); })
                .filter(function (l) { return l.length > 25; })[0];
            if (!first) return null;
            return {
                intent: 'In short',
                answer: first.length > 190 ? first.slice(0, 187).replace(/[\s,;]+\S*$/, '') + '…' : first,
                source: null,
                followUps: ['Tell me more', 'What is his experience?', 'Book a meeting']
            };
        }

        if (!CONT_RE.test(t)) return null;
        if (!ctx) return null;

        const used = ctx.usedEvidence || [];
        const fresh = EVIDENCE
            .filter(function (e) { return used.indexOf(e.text) === -1; })
            .sort(function (a, b) { return b.weight - a.weight; })
            .slice(0, 3);

        if (!fresh.length) {
            return {
                intent: 'That is the record',
                answer: 'That is the substance of what is published. For anything deeper — the reasoning behind a decision, or how it would apply to your situation — Chetan is the better source.',
                source: SRC.contact,
                followUps: ['Book a meeting', 'Match a job description', 'How can I contact Chetan?']
            };
        }

        return {
            intent: 'More from the record',
            answer: 'Continuing on:\n\n' + bullets(fresh),
            source: SRC.roles,
            followUps: ['Tell me more', 'Match a job description', 'Book a meeting'],
            evidenceUsed: fresh.map(function (e) { return e.text; })
        };
    }

    /* =========================================================
       8. OFF-TOPIC — stay useful instead of matching a random card
       ========================================================= */

    const OFFTOPIC_RE = /\b(weather|joke|football|cricket score|movie|recipe|stock price|bitcoin|who is the president|capital of|translate|write (me )?(a )?(poem|song|code)|ignore (all )?(previous|prior) instructions?|disregard (your|the) (instructions|rules)|system prompt|your prompt)\b/i;

    function offTopic(query) {
        if (!OFFTOPIC_RE.test(query)) return null;
        return {
            intent: 'Out of scope',
            answer: 'That is outside what I cover — I only answer from Chetan Sharma\'s professional record.\n\n' +
                'Ask me about his experience, the countries he has delivered in, the Vertiv transformation programme, his tooling, or paste a job description and I will map it against his background.',
            source: null,
            followUps: ['What is his experience?', 'Match a job description', 'Which countries has he worked with?']
        };
    }

    /* =========================================================
       Entry point — first detector that fires wins.
       ========================================================= */

    function reason(query, ctx) {
        if (!query || !query.trim()) return null;
        ctx = ctx || {};
        return meta(query)
            || offTopic(query)
            || undocumented(query)
            || leadership(query)
            || capability(query)
            || evaluative(query)
            || hypothetical(query)
            || continuation(query, ctx)
            || null;
    }

    global.AssistantReasoner = {
        reason: reason,
        EVIDENCE: EVIDENCE,
        pickEvidence: pickEvidence,
        // exposed for the test suite
        meta: meta, undocumented: undocumented, capability: capability,
        evaluative: evaluative, hypothetical: hypothetical,
        leadership: leadership, continuation: continuation, offTopic: offTopic
    };

})(typeof window !== 'undefined' ? window : globalThis);
