/**
 * JD Match Analyzer — scores a pasted job description against Chetan Sharma's
 * documented profile. Runs entirely in the browser: no API, no network, no cost.
 *
 * Design note on honesty: the analyser reports GAPS as well as matches. The
 * "gap vocabulary" lists skills that commonly appear in payroll job specs but
 * are NOT claimed anywhere on this site, so a recruiter gets a truthful picture
 * rather than an inflated score.
 */

(function (global) {
    'use strict';

    // Skills evidenced on the site. `w` = weight (importance to his positioning).
    const PROFILE_SKILLS = [
        // Core payroll
        { label: 'Global payroll transformation', w: 5, match: ['global payroll transformation', 'payroll transformation', 'transformation'] },
        { label: 'Multi-country payroll', w: 5, match: ['multi-country', 'multi country', 'multicountry', 'multi-country payroll', 'international payroll', 'global payroll'] },
        { label: 'Payroll implementation', w: 5, match: ['payroll implementation', 'implementation', 'implementations', 'implementation manager'] },
        { label: 'Payroll operations', w: 4, match: ['payroll operations', 'payroll processing', 'payroll cycle', 'payroll run'] },
        { label: 'Vendor transitions & management', w: 4, match: ['vendor transition', 'vendor management', 'vendor consolidation', 'third party', 'outsourced payroll', 'managed services'] },
        { label: 'Data migration', w: 4, match: ['data migration', 'migration', 'legacy migration', 'system migration'] },
        { label: 'UAT & testing', w: 3, match: ['uat', 'user acceptance testing', 'testing', 'test scripts'] },
        { label: 'Cutover & go-live planning', w: 3, match: ['cutover', 'go-live', 'go live', 'golive', 'parallel run'] },

        // Compliance & governance
        { label: 'Payroll compliance', w: 5, match: ['compliance', 'statutory', 'regulatory', 'legislation', 'statutory compliance'] },
        { label: 'Payroll governance', w: 4, match: ['governance', 'policy', 'framework', 'standardization', 'standardisation'] },
        { label: 'Internal / SOX controls', w: 4, match: ['internal controls', 'sox', 'soc 1', 'soc1', 'audit', 'auditors', 'control framework'] },
        { label: 'Hong Kong MPF / IR56B', w: 3, match: ['mpf', 'ir56b', 'ir56e', 'orso', 'hong kong'] },
        { label: 'Singapore CPF / IR8A', w: 3, match: ['cpf', 'ir8a', 'sdl', 'singapore'] },
        { label: 'UAE WPS / Gratuity', w: 3, match: ['wps', 'gratuity', 'mohre', 'uae', 'dubai', 'end of service'] },
        { label: 'APAC / EMEA regional payroll', w: 4, match: ['apac', 'emea', 'latam', 'asia pacific', 'middle east', 'regional'] },

        // Technology
        { label: 'Microsoft Power Platform', w: 5, match: ['power platform', 'powerplatform', 'power apps', 'powerapps', 'power automate', 'dataverse'] },
        { label: 'SharePoint', w: 3, match: ['sharepoint'] },
        { label: 'Advanced Excel & Power Query', w: 4, match: ['excel', 'power query', 'powerquery', 'pivot', 'vlookup', 'spreadsheet'] },
        { label: 'Google Apps Script automation', w: 3, match: ['apps script', 'google sheets', 'google workspace', 'app script'] },
        { label: 'Process automation', w: 5, match: ['automation', 'automate', 'automated', 'process improvement', 'efficiency', 'streamline', 'digitisation', 'digitization'] },
        { label: 'Payroll platforms (Deel, Unity, Payroll2u)', w: 3, match: ['deel', 'payroll software', 'payroll system', 'payroll platform', 'hris'] },
        { label: 'Oracle Fusion HCM', w: 5, match: ['oracle fusion', 'oracle hcm', 'oracle cloud hcm', 'fusion hcm'] },
        { label: 'Oracle Integration Cloud', w: 3, match: ['oracle integration', 'oic'] },
        { label: 'ADP GlobalView / Celergo', w: 4, match: ['adp globalview', 'adp celergo', 'globalview', 'celergo'] },
        { label: 'SD Worx', w: 3, match: ['sd worx', 'sdworx'] },
        { label: 'Neeyamo', w: 3, match: ['neeyamo'] },
        { label: 'Programme governance (RACI/RAID/tollgate)', w: 4, match: ['raci', 'raid', 'tollgate', 'steering committee', 'programme governance', 'program governance', 'governance framework'] },
        { label: 'PEPM & TCO modelling', w: 3, match: ['pepm', 'tco', 'cost per employee', 'total cost of ownership'] },
        { label: 'ADKAR change management', w: 3, match: ['adkar', 'change management', 'organizational change', 'organisational change'] },
        { label: 'Wave planning & batch sequencing', w: 4, match: ['wave planning', 'wave', 'batch sequencing', 'phased rollout', 'country sequencing'] },
        { label: 'Parallel run & variance control', w: 4, match: ['parallel run', 'parallel runs', 'variance', 'reconciliation', 'go-no-go', 'go/no-go'] },
        { label: 'Cloud analytics (Bedrock / QuickSight)', w: 3, match: ['bedrock', 'quicksight', 'aws analytics'] },
        { label: 'VBA & VBScript', w: 3, match: ['vba', 'vbscript', 'macros'] },

        // Leadership
        { label: 'Project management', w: 4, match: ['project management', 'project manager', 'programme', 'program management', 'monday.com', 'stakeholder'] },
        { label: 'Stakeholder management', w: 4, match: ['stakeholder', 'stakeholders', 'business partner', 'cross-functional', 'cross functional'] },
        { label: 'Team leadership & mentoring', w: 4, match: ['team lead', 'leadership', 'mentor', 'mentoring', 'coaching', 'line management', 'people management'] },
        { label: 'Reporting & analytics', w: 3, match: ['reporting', 'dashboard', 'analytics', 'metrics', 'kpi', 'kpis'] }
    ];

    // Commonly requested in payroll specs but NOT evidenced on this site.
    // Surfacing these keeps the score honest.
    const GAP_VOCAB = [
        { label: 'Workday', w: 4, match: ['workday'] },
        { label: 'SAP / SuccessFactors', w: 4, match: ['sap', 'successfactors', 'success factors'] },
        { label: 'Ceridian / Dayforce', w: 3, match: ['ceridian', 'dayforce'] },
        { label: 'PeopleSoft', w: 3, match: ['peoplesoft'] },
        { label: 'UKG / Kronos', w: 3, match: ['ukg', 'kronos'] },
        { label: 'NetSuite', w: 2, match: ['netsuite'] },
        { label: 'SQL', w: 3, match: ['sql', 'database query'] },
        { label: 'Python', w: 3, match: ['python'] },
        { label: 'Power BI / Tableau', w: 3, match: ['power bi', 'powerbi', 'tableau', 'qlik'] },
        { label: 'US payroll / multi-state tax', w: 4, match: ['us payroll', 'multi-state', 'multi state', 'federal tax', 'irs', 'w-2', 'fica'] },
        { label: 'UK payroll / RTI', w: 3, match: ['uk payroll', 'rti', 'hmrc', 'paye', 'p60', 'p45'] },
        { label: 'CIPP / CPP certification', w: 3, match: ['cipp', 'certified payroll professional', 'cpp certification'] },
        { label: 'PMP certification', w: 2, match: ['pmp', 'prince2'] },
        { label: 'Six Sigma / Lean', w: 2, match: ['six sigma', 'lean', 'kaizen'] },
        { label: "Master's degree", w: 2, match: ['master', 'mba', 'msc', 'postgraduate'] }
    ];

    function normalize(text) {
        return ' ' + String(text || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s.+#-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() + ' ';
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function mentions(haystack, needle) {
        const re = new RegExp('(?:^|\\W)' + escapeRegex(needle) + '(?:$|\\W)', 'i');
        return re.test(haystack);
    }

    function hitsAny(haystack, list) {
        return list.some(term => mentions(haystack, term));
    }

    /**
     * @param {string} jdText raw job description
     * @returns {{ok:boolean, reason?:string, percent:number, matched:Array, gaps:Array, signals:number}}
     */
    function analyze(jdText) {
        const raw = String(jdText || '').trim();
        if (raw.length < 40) {
            return { ok: false, reason: 'too_short', percent: 0, matched: [], gaps: [], signals: 0 };
        }

        const text = normalize(raw);

        const matched = [];
        let matchedWeight = 0;
        PROFILE_SKILLS.forEach(skill => {
            if (hitsAny(text, skill.match)) {
                matched.push({ label: skill.label, w: skill.w });
                matchedWeight += skill.w;
            }
        });

        const gaps = [];
        let gapWeight = 0;
        GAP_VOCAB.forEach(item => {
            if (hitsAny(text, item.match)) {
                gaps.push({ label: item.label, w: item.w });
                gapWeight += item.w;
            }
        });

        const signals = matched.length + gaps.length;
        if (signals === 0) {
            return { ok: false, reason: 'no_signal', percent: 0, matched: [], gaps: [], signals: 0 };
        }

        // Coverage of the requirements we could actually identify.
        const percent = Math.round((matchedWeight / (matchedWeight + gapWeight)) * 100);

        matched.sort((a, b) => b.w - a.w);
        gaps.sort((a, b) => b.w - a.w);

        return { ok: true, percent, matched, gaps, signals };
    }

    function verdict(percent) {
        if (percent >= 80) return 'Strong fit';
        if (percent >= 60) return 'Good fit';
        if (percent >= 40) return 'Partial fit';
        return 'Limited fit';
    }

    global.JDMatcher = { analyze, verdict, PROFILE_SKILLS, GAP_VOCAB };

})(typeof window !== 'undefined' ? window : globalThis);
