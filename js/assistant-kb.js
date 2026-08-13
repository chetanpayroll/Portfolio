/**
 * Knowledge Base for Chetan Sharma's Portfolio AI Assistant
 *
 * Every `answer` string below is copied VERBATIM from the original
 * generateResponse() if-else chain in ai-assistant.js. No wording has been
 * changed and no new claims have been added — this file only restructures
 * the existing content so the retrieval engine can score it.
 *
 * Card schema:
 *   id        unique key
 *   intent    human-readable label (used for GA4 analytics)
 *   phrases   multi-word triggers (high confidence when matched exactly)
 *   terms     single-word triggers (scored with IDF weighting)
 *   answer    response text (verbatim)
 *   followUps suggested next questions rendered as chips
 *   link      optional deep link into the site
 *   weight    tie-breaker multiplier
 */

(function (global) {
    'use strict';

    const KB = [
        // ============================================
        // PROFILE
        // ============================================
        {
            id: 'profile-who',
            intent: 'About Chetan',
            phrases: ['who is chetan', 'tell me about chetan', 'who are you', 'about chetan', 'tell me about him'],
            terms: ['who', 'introduce', 'introduction', 'bio', 'profile', 'summary', 'overview'],
            answer: `**Chetan Sharma** is a Global Payroll Transformation Manager with **13+ years** of experience across **25+ countries** in APAC, EMEA and LATAM.\n\nHe currently works at **Vertiv**, where he leads global payroll transformation across **54 countries** and **179 legal entities** (36,720 employees) — with **99.8% accuracy across 1,500+ payroll cycles**.\n\nPreviously at **Deel**, he led enterprise payroll implementations across **25+ countries** with **99.8% accuracy**, specializing in Hong Kong MPF, Singapore CPF, and UAE compliance, and was promoted **5 times in 7 years**.`,
            more: `A little more depth on the journey:\n\n• **2011 — AON Hewitt**: maintained the Vantive HR Portal for 15+ enterprise clients managing 500,000+ employee records\n• **2014 — Xerex Business Services**: administered COBRA and QMCSO compliance for 500+ employees with zero violations\n• **2018 — Deel**: 12+ multi-country implementations, Project Unity (2,000+ employees, 18 countries, zero disruption), 122 payrolls in a single year\n• **2026 — Vertiv**: enterprise transformation across 54 countries and 179 legal entities on Oracle Fusion HCM`,
            followUps: ['What is his current role?', 'What are his skills?', 'Tell me about his projects'],
            link: { label: 'Read his full story', href: '/about' },
            weight: 1.1
        },
        {
            id: 'profile-role',
            intent: 'Job title / role',
            phrases: ['what does chetan do', 'what is his job', 'his role', 'job title', 'current role', 'what is his position', 'what is his designation'],
            terms: ['role', 'position', 'title', 'designation', 'profession', 'occupation'],
            answer: `Chetan is a **Global Payroll Transformation Manager** at Vertiv.\n\nHe leads global payroll transformation across 54 countries and 179 legal entities (36,720 employees). Earlier, at Deel, he led multi-country payroll transitions, built automation solutions, managed compliance across APAC and Middle East regions, and mentored implementation teams.`,
            followUps: ['How long has he been at Vertiv?', 'What is his experience?', 'What is his tech stack?'],
            link: { label: 'See his career journey', href: '/experience' },
            weight: 1.0
        },
        {
            id: 'profile-location',
            intent: 'Location',
            phrases: ['where is chetan', 'where does he live', 'where is he based', 'work from', 'which city', 'which country is he in'],
            terms: ['location', 'based', 'city', 'located', 'residence', 'timezone', 'relocate'],
            answer: `Chetan is based in **Pune, Maharashtra, India**.\n\nHe has managed global payroll operations across multiple time zones throughout his career — currently with Vertiv and previously at Deel.`,
            followUps: ['How can I contact Chetan?', 'Which countries has he worked with?'],
            weight: 1.0
        },

        // ============================================
        // TECH STACK / MICROSOFT POWER PLATFORM
        // ============================================
        {
            id: 'tech-power-platform',
            intent: 'Power Platform / tech stack',
            phrases: ['power platform', 'power apps', 'powerapps', 'power automate', 'tech stack', 'technology stack', 'low code', 'low-code', 'microsoft stack', 'dynamics 365'],
            terms: ['sharepoint', 'flows', 'flow', 'powerapp', 'dataverse', 'microsoft', 'teams', 'power'],
            answer: `Chetan builds enterprise automation on the **Microsoft Power Platform**:\n\n• **Power Apps** — custom low-code apps for payroll intake, approvals & audit trails across 54 countries and 179 legal entities\n• **Power Automate** — automated flows that validate calculations, route approvals and sync systems, eliminating manual touchpoints\n• **SharePoint** — centralized compliance libraries, document control and version governance for secure global collaboration\n\nHe pairs this with **Excel & Power Query**, **Deel**, and **Google Apps Script** to deliver end-to-end global payroll transformation at Vertiv.`,
            followUps: ['Show me his automation projects', 'What are his skills?', 'How does he build these flows?'],
            link: { label: 'See how he builds it', href: '/step-into-my-world' },
            weight: 1.2
        },

        // ============================================
        // EXPERIENCE
        // ============================================
        {
            id: 'exp-history',
            intent: 'Work experience',
            phrases: ['work history', 'his experience', 'career history', 'employment history', 'work background', 'previous companies', 'past roles'],
            terms: ['experience', 'career', 'worked', 'employment', 'background', 'history', 'journey', 'companies', 'years'],
            answer: `Chetan has **13+ years** of experience:\n\n• **Vertiv** (2026-Present): Global Payroll Transformation Manager\n• **Deel** (2018-2026): Global Payroll Implementation Manager\n• **Xerex Business Services** (2014-2017): Benefits Administrator\n• **AON Hewitt** (2011-2014): HR & Benefits Coordinator\n\nAt Vertiv he leads transformation across 54 countries and 179 legal entities; at Deel he led implementations across 25+ countries and managed 122 payrolls in a single year.`,
            more: `Role by role:\n\n• **Vertiv** — vendor consolidation 54 → 4, systems 58 → under 5, $964K annual savings, Oracle Fusion HCM as system of record\n• **Deel** — 12+ implementations across HK, Singapore, Indonesia, UAE, Egypt, Israel and the UK at 99.8% accuracy; built the ICP Dashboard and Two-Way Validation Engine\n• **Xerex** — COBRA/QMCSO compliance for 500+ employees, zero violations\n• **AON Hewitt** — Vantive HR Portal for 15+ enterprise clients, 500,000+ employee records`,
            followUps: ['Tell me about Vertiv', 'What did he do at Deel?', 'What awards has he won?'],
            link: { label: 'View the full timeline', href: '/experience' },
            weight: 1.1
        },
        {
            id: 'exp-current',
            intent: 'Current company / tenure',
            phrases: ['how long', 'current job', 'current company', 'where does he work now', 'tell me about vertiv', 'tell me about deel', 'how long at vertiv', 'how long at deel'],
            terms: ['vertiv', 'deel', 'safeguard', 'tenure', 'now', 'currently'],
            answer: `Chetan currently works at **Vertiv** as Global Payroll Transformation Manager (since **March 2026**), leading transformation across **54 countries** and **179 legal entities** covering **36,720 employees** for a NYSE-listed Fortune 500 organization.\n\nThe programme runs on a **21-month** window across 4 strategic batches and 11 tactical waves — consolidating **54 vendors to 4** (ADP GlobalView, ADP Celergo, SD Worx, Neeyamo) and **58 systems to under 5**, reducing PEPM from $12.92 to $10.73 for **$964K in annual savings**.\n\nBefore Vertiv, he was with **Deel** (formerly Safeguard Pay) from **October 2018 to March 2026** - over 7 years - where he received **5 promotions** and multiple awards including the Global Bolt Award.`,
            followUps: ['What is the transformation programme?', 'What were his promotions?', 'What awards has he won?'],
            weight: 1.0
        },
        {
            id: 'exp-countries',
            intent: 'Countries / regions',
            phrases: ['which countries', 'what regions', 'international experience', 'global experience', 'countries has he worked'],
            terms: ['countries', 'country', 'regions', 'region', 'international', 'global', 'apac', 'emea', 'latam', 'worldwide'],
            answer: `Chetan has hands-on expertise with payroll in:\n\n• **Hong Kong** - MPF, ORSO, IR56B\n• **Singapore** - CPF, SDL, SHG, IR8A\n• **UAE** - Gratuity, WPS, MOHRE\n• **Indonesia** - BPJS, THR, PPh 21\n• **Egypt**, **Israel** and the **United Kingdom**\n\nHe has led **12+ multi-country implementations** with a 100% audit pass rate, across **25+ countries** in APAC, EMEA and LATAM. At Vertiv he now governs statutory compliance across **54 jurisdictions**.`,
            followUps: ['Tell me about Hong Kong MPF', 'Tell me about Singapore CPF', 'Tell me about UAE payroll'],
            weight: 1.0
        },

        // ============================================
        // SKILLS
        // ============================================
        {
            id: 'skills-main',
            intent: 'Skills',
            phrases: ['his skills', 'what is he good at', 'key skills', 'core competencies', 'what are his strengths', 'his expertise'],
            terms: ['skills', 'skill', 'expertise', 'abilities', 'competencies', 'capable', 'strengths', 'specialization', 'specialties'],
            answer: `Chetan's key skills include:\n\n**Transformation & Strategy:** Global payroll roadmap design, RFP-led vendor selection, vendor consolidation, wave planning & batch sequencing, platform migration, ADKAR change management\n\n**Governance & Controls:** Programme governance, RACI design, RAID log management, tollgate/go-no-go control, Steering Committee reporting, Control Tower design, SOX controls, PEPM & TCO modelling\n\n**Systems:** Oracle Fusion HCM, Oracle Integration Cloud, 5-point HCM integration, ADP GlobalView/Celergo, SD Worx, Neeyamo, Deel\n\n**Compliance:** Hong Kong MPF/ORSO/IR56B, Singapore CPF/SDL/SHG, UAE Gratuity/WPS, Indonesia BPJS/THR/PPh 21, Egypt, Israel\n\n**Automation:** Microsoft Power Platform, Google Apps Script, VBA & VBScript, Amazon Bedrock & QuickSight, Advanced Excel & Power Query`,
            more: `Deeper on the governance side: RACI design, RAID log management, tollgate / go-no-go control, Steering Committee reporting, Control Tower design, SOX controls and PEPM & TCO modelling.\n\nOn systems: Oracle Fusion HCM as system of record, Oracle Integration Cloud, ADP GlobalView / Celergo, SD Worx and Neeyamo — paired with the Microsoft Power Platform, Google Apps Script and VBA for automation.`,
            followUps: ['What tools does he use?', 'Show me his automation work', 'Match a job description'],
            link: { label: 'Explore his expertise', href: '/expertise' },
            weight: 1.1
        },
        {
            id: 'skills-tools',
            intent: 'Tools & platforms',
            phrases: ['what tools', 'what software', 'which platforms', 'what systems', 'what technology does he use'],
            terms: ['tools', 'software', 'platforms', 'systems', 'technology', 'applications', 'apps'],
            answer: `Chetan works with:\n\n**Core HCM:** Oracle Fusion HCM (system of record), Oracle Integration Cloud\n**Payroll vendors:** ADP GlobalView, ADP Celergo, SD Worx, Neeyamo, Deel, Unity, Payroll2u\n**Microsoft Power Platform:** Power Apps, Power Automate, SharePoint\n**Analytics & AI:** Amazon Bedrock, Amazon QuickSight\n**Project Management:** Monday.com, Gainsight\n**Communication:** Microsoft Teams, Outlook, Slack\n**Automation:** Google Apps Script, VBA & VBScript, Advanced Excel & Power Query`,
            followUps: ['Tell me about Power Platform', 'What are his skills?'],
            weight: 1.0
        },

        // ============================================
        // COUNTRY COMPLIANCE
        // ============================================
        {
            id: 'country-hk',
            intent: 'Hong Kong payroll',
            phrases: ['hong kong', 'hong kong payroll', 'mpf', 'ir56b', 'orso'],
            terms: ['hongkong', 'hk'],
            answer: `Yes! Chetan has deep expertise in **Hong Kong payroll** including:\n\n• **MPF** (Mandatory Provident Fund) setup and management\n• **IR56B and IR56E** tax filing workflows\n• **ORSO** pension schemes\n\nHe implemented end-to-end MPF compliance at Deel with **100% statutory compliance**.`,
            more: `More on Hong Kong: the implementation covered **IR56B / IR56E** tax-filing workflows and **ORSO** pension schemes alongside MPF, delivered as part of **12+ multi-country implementations** completed 100% within SLA — with a **100% audit pass rate** across statutory filings.`,
            followUps: ['Tell me about Singapore CPF', 'What other countries?', 'Show me his projects'],
            link: { label: 'Read the case study', href: '/case-studies/hong-kong-mpf-implementation' },
            weight: 1.1
        },
        {
            id: 'country-sg',
            intent: 'Singapore payroll',
            phrases: ['singapore', 'singapore payroll', 'cpf', 'sdl', 'ir8a'],
            terms: ['sgp'],
            answer: `Chetan has configured complete **Singapore payroll** systems including:\n\n• **CPF** (Central Provident Fund) calculations by age tier\n• **SDL** (Skills Development Levy) at 0.25%\n• **IR8A** annual tax reporting\n\nHe manages monthly submissions for **500+ employees**.`,
            followUps: ['Tell me about Hong Kong MPF', 'Tell me about UAE payroll', 'What other countries?'],
            link: { label: 'Read the case study', href: '/case-studies/singapore-cpf-implementation' },
            weight: 1.1
        },
        {
            id: 'country-uae',
            intent: 'UAE payroll',
            phrases: ['uae', 'dubai', 'gratuity', 'wps', 'mohre', 'middle east', 'uae payroll'],
            terms: ['emirates', 'abudhabi'],
            answer: `Chetan has expertise in **UAE payroll** compliance:\n\n• **End of Service Gratuity** calculations\n• **WPS** (Wage Protection System)\n• **MOHRE** compliance requirements\n\nHe has implemented UAE payroll processes at Deel.`,
            followUps: ['Tell me about Hong Kong MPF', 'Tell me about Singapore CPF', 'What other countries?'],
            weight: 1.1
        },

        // ============================================
        // PROJECTS
        // ============================================
        {
            id: 'projects-all',
            intent: 'Projects',
            phrases: ['his projects', 'what has he worked on', 'case studies', 'notable projects', 'portfolio of work', 'show me his work'],
            terms: ['projects', 'project', 'portfolio', 'work', 'implementations', 'casestudy'],
            answer: `Chetan's notable projects include:\n\n1. **Project Unity** - Migrated 2,000+ employees across 18 countries with zero disruption\n\n2. **ICP Service Dashboard** - Automated comparison of 50+ service providers, saving 15+ hours/week\n\n3. **Two-Way Validation Engine** - Built Google Apps Script tool saving 12 hours/week\n\n4. **Hong Kong MPF Implementation** - 100% statutory compliance\n\n5. **Singapore CPF Setup** - Processing for 500+ employees monthly`,
            followUps: ['Tell me about Project Unity', 'Show me his automation work', 'What awards has he won?'],
            link: { label: 'Browse all case studies', href: '/case-studies' },
            weight: 1.1
        },
        {
            id: 'projects-unity',
            intent: 'Project Unity',
            phrases: ['project unity', 'unity migration', 'the migration', 'unity project'],
            terms: ['unity', 'migration', 'migrated', 'cutover'],
            answer: `**Project Unity** was a major migration initiative at Deel.\n\nChetan led the transition of **2,000+ employees** across **18+ countries** from a legacy system to a new platform.\n\n**Results:**\n• 100% data integrity\n• Zero payroll disruption\n• Completed in 3 months`,
            more: `Going deeper on Project Unity: the migration moved **2,000+ employees** off a legacy system across **18 countries** in **3 months** with **100% data integrity**. The cutover cycle was reduced by **25%** through parallel-run optimization and data-validation automation, and **100+ critical data gaps** were identified and resolved before go-live.`,
            followUps: ['What other projects?', 'What is his experience?'],
            link: { label: 'Read the full case study', href: '/case-studies/project-unity-migration' },
            weight: 1.2
        },
        {
            id: 'projects-automation',
            intent: 'Automation work',
            phrases: ['automation work', 'what has he automated', 'validation engine', 'icp dashboard', 'apps script', 'google apps script'],
            terms: ['automation', 'automate', 'automated', 'dashboard', 'script', 'validation', 'scripting', 'efficiency'],
            answer: `Chetan has built several automation solutions:\n\n**Microsoft Power Automate:**\n• Flows that validate payroll calculations and route approvals\n• Automated notifications and cross-system sync across regions\n\n**ICP Service Dashboard:**\n• Automates 50+ service provider comparisons\n• Saves 15+ hours/week, reduced planning cycle by 40%\n\n**Two-Way Validation Engine:**\n• Google Apps Script tool, saves 12 hours/week in reconciliation\n• Audit-ready for SOC 1 compliance`,
            followUps: ['Tell me about Power Platform', 'What other projects?'],
            link: { label: 'Read the case study', href: '/case-studies/two-way-validation-automation' },
            weight: 1.1
        },

        // ============================================
        // VERTIV TRANSFORMATION PROGRAMME
        // ============================================
        {
            id: 'vertiv-programme',
            intent: 'Vertiv transformation programme',
            phrases: ['vendor consolidation', 'oracle fusion', 'oracle hcm', 'control tower', 'transformation programme',
                'transformation program', 'how many vendors', 'cost savings', 'pepm', 'what is he doing at vertiv',
                'current project', 'wave planning', 'change management'],
            terms: ['oracle', 'fusion', 'vendors', 'consolidation', 'savings', 'pepm', 'adkar', 'waves', 'batches',
                'bedrock', 'quicksight', 'sox', 'governance', 'tollgate', 'raci', 'raid'],
            answer: `At **Vertiv**, Chetan is running an enterprise global payroll transformation across **54 countries**, **179 legal entities** and **36,720 employees** for a NYSE-listed Fortune 500 company:\n\n• **21-month** accelerated window — 4 strategic batches, 11 tactical waves\n• **Vendor consolidation 54 → 4** (ADP GlobalView, ADP Celergo, SD Worx, Neeyamo)\n• **Systems 58 → under 5**, PEPM $12.92 → $10.73 = **$964K annual savings**\n• **Oracle Fusion HCM** as system of record, 5-point integration (HRIS, Time, Absence, Finance, Outbound)\n• 35-tab self-validating **Control Tower** on SharePoint as single source of truth\n• Parallel-run strategy with a locked **0.5% variance** go/no-go gate\n• SOX-aligned governance, segregation-of-duties remediation across 54 jurisdictions\n• AI programme intelligence on **Amazon Bedrock + QuickSight**\n• **ADKAR** change management across 70+ stakeholders`,
            followUps: ['What is his tech stack?', 'What are his skills?', 'Tell me about his projects'],
            link: { label: 'See his career journey', href: '/experience' },
            weight: 1.2
        },

        // ============================================
        // CERTIFICATIONS
        // ============================================
        {
            id: 'certifications',
            intent: 'Certifications',
            phrases: ['his certifications', 'what certifications', 'is he certified', 'professional development',
                'what training', 'his credentials'],
            terms: ['certifications', 'certification', 'certified', 'credentials', 'training', 'courses'],
            answer: `Chetan's certifications and professional development:\n\n• **VBA & VBScript Automation** — advanced Excel macros for enterprise payroll data processing\n• **Microsoft Power Automate** — workflow automation across Microsoft 365\n• **Microsoft Ecosystem Expert** — Excel (Advanced), SharePoint, Teams, Outlook, Power Platform\n• **monday.com Platform Expert** — workspace configuration and automation recipes\n• **Gainsight Customer Success Platform** — client health scoring and lifecycle management\n• **Deel Application Expert** — payroll configuration, compliance setup, vendor management\n• **Google Apps Script Automation Specialist**\n• **AI Integration for Business Processes**\n\nHe holds a **B.Sc** from **Rajasthan University** (2008–2010).`,
            followUps: ['What are his skills?', 'What is his education?', 'What tools does he use?'],
            link: { label: 'See his background', href: '/about' },
            weight: 1.1
        },

        // ============================================
        // AWARDS
        // ============================================
        {
            id: 'awards-list',
            intent: 'Awards & recognition',
            phrases: ['his awards', 'what recognition', 'has he won', 'bolt award', 'spotlight award', 'his achievements', 'his accomplishments'],
            terms: ['awards', 'award', 'recognition', 'achievements', 'achievement', 'honors', 'accomplishments', 'accolades', 'won', 'winner'],
            answer: `Chetan has received numerous awards:\n\n• **2024:** Global Bolt Award (Deel)\n• **2023:** Spotlight Award (Deel)\n• **2022:** Global Annual Bolt Award - 122 payrolls processed\n• **2021, 2020, 2019:** Annual Bolt Awards\n• **2018:** Spotlight Awards (Q1, Q2, Q3)\n\nHe's also been **promoted 5 times in 7 years**.`,
            followUps: ['Tell me about his promotions', 'What is his track record?', 'Show me his projects'],
            weight: 1.1
        },
        {
            id: 'awards-promotions',
            intent: 'Promotions / career growth',
            phrases: ['his promotions', 'was he promoted', 'career growth', 'career progression', 'how many promotions'],
            terms: ['promotions', 'promotion', 'promoted', 'advancement', 'progression', 'growth', 'ladder'],
            answer: `Chetan has been **promoted 5 times in 7 years**:\n\nInternational Specialist → Senior Specialist → Implementation Consultant → Senior Implementation Consultant → **Implementation Manager**\n\nThis reflects his consistent excellence in payroll operations and leadership.`,
            followUps: ['What awards has he won?', 'What is his experience?'],
            weight: 1.1
        },
        {
            id: 'awards-accuracy',
            intent: 'Accuracy / track record',
            phrases: ['his accuracy', 'track record', 'success rate', 'error rate', 'how accurate', 'his performance'],
            terms: ['accuracy', 'accurate', 'performance', 'record', 'quality', 'reliability', 'sla', 'kpi'],
            answer: `Chetan maintains a **99.8% accuracy rate** across **1,500+ payroll cycles**.\n\nThis includes:\n• Managing **122 payrolls** in a single year\n• Implementations across **25+ countries**\n• **90+ hours saved per month** through enterprise automation\n• Zero payroll disruption in major migrations`,
            followUps: ['What awards has he won?', 'Show me his projects'],
            weight: 1.0
        },

        // ============================================
        // CONTACT
        // ============================================
        {
            id: 'contact-details',
            intent: 'Contact details',
            phrases: ['how can i contact', 'contact chetan', 'his email', 'get in touch', 'reach him', 'his phone', 'his linkedin', 'contact details'],
            terms: ['contact', 'email', 'phone', 'reach', 'connect', 'linkedin', 'mail', 'number', 'whatsapp'],
            answer: `You can reach Chetan through:\n\n📧 **Email:** chetanpayroll@gmail.com\n📱 **Phone:** +91 8619495587\n🔗 **LinkedIn:** linkedin.com/in/chetan-champ/\n🌐 **Website:** www.chetanpayroll.com\n\nHe's open to discussing career opportunities, speaking engagements, and professional collaboration.`,
            followUps: ['Book a meeting', 'Can I see his resume?', 'Is he open to opportunities?'],
            link: { label: 'Go to contact page', href: '/contact' },
            weight: 1.1
        },
        {
            id: 'contact-availability',
            intent: 'Availability / hiring',
            phrases: ['is he available', 'is he hiring', 'open to opportunities', 'looking for a job', 'is he open to work', 'can i hire him', 'job opportunity'],
            terms: ['available', 'availability', 'hire', 'hiring', 'opportunity', 'opportunities', 'recruiting', 'recruiter', 'vacancy', 'openings'],
            answer: `Yes! Chetan is currently **open to new opportunities**.\n\nHe's exploring senior roles in:\n• Global payroll operations\n• Implementation leadership\n• Payroll transformation\n\nFeel free to reach out at **chetanpayroll@gmail.com**.`,
            followUps: ['Match a job description', 'Book a meeting', 'Can I see his resume?'],
            weight: 1.1
        },

        // ============================================
        // RESUME
        // ============================================
        {
            id: 'resume-download',
            intent: 'Resume / CV',
            phrases: ['his resume', 'his cv', 'download resume', 'download his cv', 'can i see his resume', 'send me his cv'],
            terms: ['resume', 'cv', 'download', 'curriculum', 'vitae', 'pdf', 'docx'],
            answer: `Yes! You can download Chetan's resume directly here:\n\n<a href="https://www.chetanpayroll.com/assets/documents/Chetan_Sharma_Resume.docx" target="_blank" class="chat-resume-link">📄 Download Resume (DOCX)</a>\n\nThe resume includes his complete work history, skills, achievements, and contact information.`,
            followUps: ['Match a job description', 'How can I contact Chetan?', 'What is his experience?'],
            weight: 1.2
        },

        // ============================================
        // VIDEO
        // ============================================
        {
            id: 'media-video',
            intent: 'Intro video',
            phrases: ['his video', 'introduction video', 'can i see him', 'video introduction', 'watch video'],
            terms: ['video', 'watch', 'intro', 'clip', 'showreel'],
            answer: `There's a **professional video introduction** on the homepage!\n\nYou can watch it to learn more about Chetan's background, expertise, and career vision.\n\nJust scroll to the hero section on the main page.`,
            followUps: ['Who is Chetan?', 'What is his experience?'],
            weight: 1.0
        },

        // ============================================
        // EDUCATION
        // ============================================
        {
            id: 'education',
            intent: 'Education',
            phrases: ['his education', 'his degree', 'which university', 'where did he study', 'his qualification', 'is he certified'],
            terms: ['education', 'degree', 'university', 'study', 'studied', 'college', 'qualification', 'qualifications', 'graduated', 'academic', 'certification'],
            answer: `Chetan holds a **B.Sc (Bachelor of Science)** degree from **Rajasthan University**, completed in 2010.\n\nHis extensive professional experience of **13+ years** has made him an expert in global payroll operations.`,
            followUps: ['What is his experience?', 'What are his skills?'],
            weight: 1.0
        },

        // ============================================
        // CONVERSATIONAL
        // ============================================
        {
            id: 'greeting',
            intent: 'Greeting',
            phrases: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hi there', 'hey there', 'yo', 'namaste', 'greetings'],
            terms: [],
            exactOnly: true,
            answer: `Hello! 👋 I'm Chetan's AI Assistant.\n\nI can help you learn about:\n• His professional experience\n• Skills and expertise\n• Projects and achievements\n• How to contact him\n\nWhat would you like to know?`,
            followUps: ['Who is Chetan?', 'What are his skills?', 'Tell me about his projects'],
            weight: 1.0
        },
        {
            id: 'thanks',
            intent: 'Thanks',
            phrases: ['thank you', 'thanks', 'thankyou', 'appreciate it', 'thx', 'cheers', 'much appreciated'],
            terms: [],
            exactOnly: true,
            answer: `You're welcome! 😊\n\nIf you have more questions about Chetan's profile or want to get in touch with him, feel free to ask!\n\n**Email:** chetanpayroll@gmail.com`,
            followUps: ['Book a meeting', 'How can I contact Chetan?'],
            weight: 1.0
        },

        // ============================================
        // ACTIONS (handled specially by the assistant)
        // ============================================
        {
            id: 'action-booking',
            intent: 'Book a meeting',
            phrases: ['book a meeting', 'schedule a meeting', 'book a call', 'set up a call', 'schedule a call', 'book an appointment', 'his calendar', 'book time'],
            terms: ['book', 'booking', 'meeting', 'schedule', 'appointment', 'calendar', 'call', 'availability', 'slot'],
            action: 'booking',
            answer: 'I can certainly help you schedule a meeting with Chetan. Please select a preferred date below:',
            followUps: [],
            weight: 1.2
        },
        {
            id: 'action-jd-match',
            intent: 'JD match analyzer',
            phrases: ['match a job description', 'job description', 'check fit', 'is he a fit', 'role fit', 'match jd', 'analyze jd', 'paste a job description', 'does he fit'],
            terms: ['jd', 'fit', 'suitability', 'requirements', 'match'],
            action: 'jdmatch',
            answer: 'Paste the job description below and I\'ll score it against Chetan\'s profile — you\'ll get a match percentage, the skills that line up, and an honest view of any gaps.',
            followUps: [],
            weight: 1.2
        }
    ];

    // Fallback shown when nothing scores above the confidence floor and we have
    // no near-miss suggestions to offer. Copied verbatim from the original bot.
    const FALLBACK = `I'm Chetan's AI Assistant, focused specifically on his professional profile.\n\nI can help you with:\n• **Experience** - Work history and career journey\n• **Skills** - Technical and professional expertise\n• **Projects** - Notable achievements and implementations\n• **Contact** - How to reach Chetan\n• **Resume** - Download his CV\n\nWhat would you like to know about Chetan?`;

    // Synonym expansion: query token -> additional tokens added before scoring.
    const SYNONYMS = {
        hk: ['hong', 'kong'],
        sg: ['singapore'],
        uae: ['dubai', 'emirates'],
        pa: ['power', 'automate'],
        pp: ['power', 'platform'],
        cv: ['resume'],
        jd: ['job', 'description'],
        job: ['role', 'position'],
        firm: ['company'],
        employer: ['company'],
        cert: ['certification'],
        exp: ['experience'],
        tech: ['technology'],
        msft: ['microsoft'],
        ms: ['microsoft'],
        spo: ['sharepoint'],
        gas: ['google', 'apps', 'script'],
        payrolls: ['payroll'],
        salaries: ['salary', 'payroll'],
        compensation: ['payroll'],
        remuneration: ['payroll']
    };

    // Entities tracked for pronoun resolution ("there", "it", "that project").
    const ENTITIES = {
        vertiv: 'exp-current',
        deel: 'exp-current',
        'project unity': 'projects-unity',
        unity: 'projects-unity',
        'hong kong': 'country-hk',
        singapore: 'country-sg',
        uae: 'country-uae',
        'power platform': 'tech-power-platform',
        'power automate': 'tech-power-platform',
        'power apps': 'tech-power-platform'
    };

    global.AssistantKB = { KB, FALLBACK, SYNONYMS, ENTITIES };

})(typeof window !== 'undefined' ? window : globalThis);
