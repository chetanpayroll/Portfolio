/**
 * Structured fact graph for the Portfolio AI Assistant.
 *
 * Every value here is taken from content already published on the site
 * (experience.html, about.html, expertise.html, case-studies) — the composer
 * may only COMBINE and COMPUTE from these facts, never invent new ones.
 * Dates use YYYY-MM so tenure is computable; `null` end = present.
 *
 * SOURCES maps each fact group to the page it lives on, which powers the
 * "Source: …" citation chips shown under composed answers.
 */

(function (global) {
    'use strict';

    const SOURCES = {
        roles: { label: 'Experience page', href: '/experience' },
        countries: { label: 'Experience page', href: '/experience' },
        projects: { label: 'Portfolio', href: '/case-studies' },
        awards: { label: 'Experience page', href: '/experience' },
        metrics: { label: 'About page', href: '/about' },
        tools: { label: 'Expertise page', href: '/expertise' },
        certifications: { label: 'About page', href: '/about' },
        education: { label: 'About page', href: '/about' },
        contact: { label: 'Contact page', href: '/contact' }
    };

    const ROLES = [
        {
            id: 'vertiv',
            company: 'Vertiv',
            aliases: ['vertiv'],
            title: 'Global Payroll Transformation Manager',
            start: '2026-03',
            end: null,
            location: 'Pune, India',
            scope: '54 countries · 179 legal entities · 36,720 employees',
            focus: 'Enterprise transformation — vendor consolidation (54 → 4), system rationalization (58 → under 5), Oracle Fusion HCM as system of record, SOX-aligned governance',
            keyPoints: [
                '21-month programme across 4 strategic batches and 11 tactical waves',
                'Vendor consolidation to ADP GlobalView, ADP Celergo, SD Worx and Neeyamo — $964K annual savings (PEPM $12.92 → $10.73)',
                '35-tab self-validating Control Tower on SharePoint; parallel-run 0.5% variance go/no-go gate',
                'AI programme intelligence on Amazon Bedrock and QuickSight; ADKAR change management across 70+ stakeholders'
            ]
        },
        {
            id: 'deel',
            company: 'Deel',
            aliases: ['deel', 'safeguard', 'safeguard pay'],
            title: 'Global Payroll Implementation Manager',
            start: '2018-10',
            end: '2026-03',
            location: 'Remote — India',
            scope: '25+ countries · 12+ implementations · 122 payrolls in a single year',
            focus: 'Multi-country implementations, platform migration (Project Unity), automation, statutory compliance across APAC / EMEA / LATAM',
            keyPoints: [
                'Led 12+ multi-country implementations (Hong Kong, Singapore, Indonesia, UAE, Egypt, Israel, United Kingdom) — 100% within SLA at 99.8% accuracy',
                'Project Unity: migrated 2,000+ employees across 18 countries with zero payroll disruption',
                'Built the ICP Service Dashboard and Two-Way Validation Engine — 15+ and 12+ hours saved weekly',
                '5 promotions and multiple awards including the Global Bolt Award'
            ]
        },
        {
            id: 'xerex',
            company: 'Xerex Business Services',
            aliases: ['xerex', 'xerox'],
            title: 'Benefits Administrator',
            start: '2014-05',
            end: '2017-01',
            location: 'India',
            scope: '500+ employees — COBRA and QMCSO compliance',
            focus: 'Health and welfare benefits administration with zero compliance violations',
            keyPoints: [
                'Administered COBRA and QMCSO compliance for 500+ employees with zero violations',
                'Managed DBP, HIPAA, LOA, enrollment and Medicare eligibility at 99%+ accuracy'
            ]
        },
        {
            id: 'aon',
            company: 'AON Hewitt',
            aliases: ['aon', 'aon hewitt', 'hewitt'],
            title: 'HR & Benefits Coordinator',
            start: '2011-04',
            end: '2014-05',
            location: 'Gurgaon, India',
            scope: '15+ enterprise clients · 500,000+ employee records',
            focus: 'Vantive HR Portal administration, data loads and benefits processing',
            keyPoints: [
                'Maintained the Vantive HR Portal for 15+ enterprise clients managing 500,000+ employee records',
                'Gold Award for Client Value and Benefits Champ Award'
            ]
        }
    ];

    const COUNTRIES = {
        'hong kong': {
            name: 'Hong Kong',
            aliases: ['hong kong', 'hongkong', 'hk'],
            statutory: ['MPF (Mandatory Provident Fund)', 'ORSO pension schemes', 'IR56B / IR56E tax filing'],
            detail: 'End-to-end MPF compliance implemented at Deel with 100% statutory compliance; ESPP/equity processing included.'
        },
        singapore: {
            name: 'Singapore',
            aliases: ['singapore', 'sg'],
            statutory: ['CPF (Central Provident Fund) by age tier', 'SDL (Skills Development Levy)', 'SHG contributions', 'IR8A annual reporting'],
            detail: 'Complete CPF/SDL configuration; monthly submissions for 500+ employees.'
        },
        uae: {
            name: 'UAE',
            aliases: ['uae', 'dubai', 'emirates'],
            statutory: ['End of Service Gratuity', 'WPS (Wage Protection System)', 'MOHRE compliance'],
            detail: 'UAE payroll processes implemented at Deel with full WPS compliance.'
        },
        indonesia: {
            name: 'Indonesia',
            aliases: ['indonesia'],
            statutory: ['BPJS (social security)', 'THR (religious holiday allowance)', 'PPh 21 (income tax)'],
            detail: 'Full statutory coverage within multi-country implementations.'
        },
        egypt: {
            name: 'Egypt',
            aliases: ['egypt'],
            statutory: ['Local statutory payroll compliance'],
            detail: 'Implementation delivered within the Deel multi-country programme; ICP model covered in the Egypt case study.'
        },
        israel: {
            name: 'Israel',
            aliases: ['israel'],
            statutory: ['Local statutory payroll compliance'],
            detail: 'Implementation delivered within the Deel multi-country programme.'
        },
        'united kingdom': {
            name: 'United Kingdom',
            aliases: ['united kingdom', 'uk', 'britain'],
            statutory: ['Local statutory payroll compliance'],
            detail: 'Implementation delivered within the Deel multi-country programme.'
        }
    };

    const METRICS = {
        yearsExperience: '13+',
        countriesVertiv: 54,
        legalEntities: 179,
        employeesVertiv: '36,720',
        accuracy: '99.8%',
        payrollCycles: '1,500+',
        hoursSavedMonthly: '90+',
        countriesCareer: '25+'
    };

    const CAREER_START = '2011-04';

    /* ---------- date helpers ---------- */

    function parseYM(ym) {
        const [y, m] = ym.split('-').map(Number);
        return { y, m };
    }

    function monthsBetween(startYM, endYM) {
        const s = parseYM(startYM);
        const e = endYM ? parseYM(endYM) : currentYM();
        return (e.y - s.y) * 12 + (e.m - s.m);
    }

    function currentYM() {
        const d = new Date();
        return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }

    function formatDuration(months) {
        const y = Math.floor(months / 12);
        const m = months % 12;
        const parts = [];
        if (y) parts.push(y + (y === 1 ? ' year' : ' years'));
        if (m) parts.push(m + (m === 1 ? ' month' : ' months'));
        return parts.join(' ') || 'less than a month';
    }

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    function formatYM(ym) {
        if (!ym) return 'Present';
        const p = parseYM(ym);
        return MONTH_NAMES[p.m - 1] + ' ' + p.y;
    }

    /** Role whose span covers the given year (calendar overlap). */
    function rolesInYear(year) {
        return ROLES.filter(r => {
            const s = parseYM(r.start).y;
            const e = r.end ? parseYM(r.end).y : currentYM().y;
            return year >= s && year <= e;
        });
    }

    function findRole(text) {
        const t = String(text).toLowerCase();
        return ROLES.find(r => r.aliases.some(a =>
            new RegExp('(?:^|\\W)' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|\\W)').test(t)
        )) || null;
    }

    function findCountries(text) {
        const t = String(text).toLowerCase();
        const hits = [];
        Object.keys(COUNTRIES).forEach(key => {
            const c = COUNTRIES[key];
            if (c.aliases.some(a =>
                new RegExp('(?:^|\\W)' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|\\W)').test(t)
            )) hits.push(c);
        });
        return hits;
    }

    global.ProfileFacts = {
        SOURCES, ROLES, COUNTRIES, METRICS, CAREER_START,
        monthsBetween, formatDuration, formatYM, parseYM,
        rolesInYear, findRole, findCountries
    };

})(typeof window !== 'undefined' ? window : globalThis);
