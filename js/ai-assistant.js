/**
 * AI Assistant for Chetan Sharma's Portfolio
 * Only answers questions about Chetan's professional profile.
 *
 * Answers come from js/assistant-kb.js and are selected by the scoring engine
 * in js/assistant-engine.js (replacing the previous first-match-wins keyword
 * chain). All answer copy is unchanged from the original implementation.
 */

class ProfileAssistant {
    constructor() {
        // The blog-post template uses `chat-toggle-btn` and hides the window
        // with a `hidden` class instead of `chat-toggle` / `.visible`. Support
        // both so the assistant works on every page that includes it.
        this.chatToggle = document.getElementById('chat-toggle')
            || document.getElementById('chat-toggle-btn');
        this.chatWindow = document.getElementById('chat-window');
        this.chatClose = document.getElementById('chat-close');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatMessages = document.getElementById('chat-messages');

        if (!this.chatToggle || !this.chatWindow || !this.chatMessages) return;

        this.isOpen = false;
        this.isProcessing = false;
        this.usesHiddenClass = this.chatWindow.classList.contains('hidden');

        this.engine = (window.AssistantEngine && window.AssistantEngine.create())
            || { match: () => ({ matched: false, suggestions: [], answer: '' }), reset: () => { } };

        this.reduceMotion = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.init();
    }

    init() {
        this.chatToggle.addEventListener('click', () => this.toggleChat());
        if (this.chatClose) this.chatClose.addEventListener('click', () => this.closeChat());

        if (this.chatForm) {
            this.chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUserMessage();
            });
        }

        // Some templates ship the send button disabled and never re-enable it,
        // which also blocks Enter-to-submit (implicit submission is suppressed
        // when the default button is disabled). Keep it in sync with the input.
        const sendBtn = this.chatForm && this.chatForm.querySelector('.chat-send-btn, #chat-send-btn');
        if (sendBtn && this.chatInput) {
            const sync = () => { sendBtn.disabled = this.chatInput.value.trim().length === 0; };
            this.syncSendBtn = sync;
            this.chatInput.addEventListener('input', sync);
            sync();
        }

        // Quick action buttons (existing markup) + any added later.
        this.chatMessages.addEventListener('click', (e) => {
            const quick = e.target.closest('.quick-action-btn, .suggestion-chip');
            if (quick && quick.dataset.question) {
                this.chatInput.value = quick.dataset.question;
                this.handleUserMessage();
                return;
            }
            const copyBtn = e.target.closest('.msg-copy-btn');
            if (copyBtn) this.copyMessage(copyBtn);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeChat();
                return;
            }
            // Cmd/Ctrl+K opens the assistant.
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.isOpen ? this.closeChat() : this.openChat();
            }
            if (e.key === 'Tab' && this.isOpen) this.trapFocus(e);
        });

        this.setupAccessibility();
        this.setupVoice();
        this.applyPageContext();
        this.restoreTranscript();
    }

    /* ================= Accessibility ================= */

    setupAccessibility() {
        this.chatMessages.setAttribute('role', 'log');
        this.chatMessages.setAttribute('aria-live', 'polite');
        this.chatMessages.setAttribute('aria-relevant', 'additions text');
        this.chatWindow.setAttribute('role', 'dialog');
        this.chatWindow.setAttribute('aria-label', "Chetan's AI Assistant");
        this.chatWindow.setAttribute('aria-modal', 'false');
    }

    trapFocus(e) {
        const focusables = this.chatWindow.querySelectorAll(
            'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter(el => el.offsetParent !== null);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    /* ================= Voice input (feature-detected) ================= */

    setupVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR || !this.chatForm) return; // silently unavailable

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chat-mic-btn';
        btn.setAttribute('aria-label', 'Ask by voice');
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>`;
        this.chatForm.insertBefore(btn, this.chatForm.querySelector('.chat-send-btn'));

        const recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        let listening = false;
        btn.addEventListener('click', () => {
            if (listening) { recognition.stop(); return; }
            try { recognition.start(); } catch (e) { /* already started */ }
        });
        recognition.addEventListener('start', () => {
            listening = true;
            btn.classList.add('listening');
        });
        recognition.addEventListener('end', () => {
            listening = false;
            btn.classList.remove('listening');
        });
        recognition.addEventListener('result', (e) => {
            const said = e.results[0][0].transcript;
            this.chatInput.value = said;
            this.handleUserMessage();
        });
        recognition.addEventListener('error', () => {
            listening = false;
            btn.classList.remove('listening');
        });
    }

    /* ================= Page-aware quick actions ================= */

    applyPageContext() {
        const path = (window.location.pathname || '').toLowerCase();
        const container = this.chatMessages.querySelector('.quick-actions');
        if (!container) return;

        let extra = null;
        if (path.includes('case-stud')) extra = { label: 'Project Unity', q: 'Tell me about Project Unity' };
        else if (path.includes('contact')) extra = { label: 'Book a meeting', q: 'Book a meeting' };
        else if (path.includes('expertise')) extra = { label: 'Power Platform', q: 'Tell me about his Power Platform work' };
        else if (path.includes('blog')) extra = { label: 'Automation', q: 'What automation has he built' };

        // Always offer the JD analyzer — it is the highest-value recruiter action.
        const buttons = [];
        if (extra) buttons.push(extra);
        buttons.push({ label: 'Match a JD', q: 'Match a job description' });

        buttons.forEach(b => {
            if (container.querySelector(`[data-question="${b.q}"]`)) return;
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.dataset.question = b.q;
            btn.textContent = b.label;
            container.appendChild(btn);
        });
    }

    /* ================= Open / close ================= */

    toggleChat() {
        this.isOpen ? this.closeChat() : this.openChat();
    }

    openChat() {
        this.isOpen = true;
        this.chatWindow.classList.remove('hidden');
        this.chatWindow.classList.add('visible');
        this.chatToggle.classList.add('active');
        if (this.chatInput) this.chatInput.focus();
    }

    closeChat() {
        this.isOpen = false;
        this.chatWindow.classList.remove('visible');
        if (this.usesHiddenClass) this.chatWindow.classList.add('hidden');
        this.chatToggle.classList.remove('active');
        this.chatToggle.focus();
    }

    /* ================= Message flow ================= */

    handleUserMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isProcessing) return;

        this.addMessage(message, 'user');
        this.chatInput.value = '';
        if (this.syncSendBtn) this.syncSendBtn();

        const quickActions = this.chatMessages.querySelector('.quick-actions');
        if (quickActions) quickActions.style.display = 'none';
        this.clearSuggestions();

        this.showTyping();
        this.isProcessing = true;

        const result = this.engine.match(message);
        this.trackQuery(message, result);

        const delay = this.reduceMotion ? 200 : 500 + Math.random() * 400;
        setTimeout(() => {
            this.hideTyping();
            this.renderResult(result);
            this.isProcessing = false;
        }, delay);
    }

    renderResult(result) {
        const card = result.card;

        if (card && card.action === 'booking') {
            this.addMessage({ type: 'widget', widgetType: 'booking', text: card.answer }, 'assistant');
            return;
        }
        if (card && card.action === 'jdmatch') {
            this.addMessage({ type: 'widget', widgetType: 'jdmatch', text: card.answer }, 'assistant');
            return;
        }

        if (card) {
            this.addMessage(card.answer, 'assistant', {
                link: card.link,
                followUps: card.followUps
            });
            return;
        }

        // Low confidence — offer the nearest topics instead of a dead end.
        const suggestions = result.suggestions || [];
        if (suggestions.length) {
            const text = `I'm not certain I understood that one. Did you mean:`;
            this.addMessage(text, 'assistant', {
                suggestions: suggestions
            });
        } else {
            this.addMessage(result.answer || '', 'assistant');
        }
    }

    trackQuery(query, result) {
        if (typeof window.gtag !== 'function') return;
        try {
            window.gtag('event', 'chat_query', {
                intent: result.intent || 'unmatched',
                matched: !!result.matched,
                confidence: Number((result.confidence || 0).toFixed(2)),
                query_length: query.length
            });
        } catch (e) { /* analytics must never break the chat */ }
    }

    addMessage(content, type, opts) {
        opts = opts || {};
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        if (typeof content === 'object' && content.type === 'widget') {
            // Widgets (calendar grid, JD analyzer) need the full bubble width.
            messageDiv.classList.add('has-widget');
            messageDiv.innerHTML = `
                <div class="message-content">
                    <p>${this.formatMessage(content.text)}</p>
                    <div class="widget-container"></div>
                </div>
            `;
            this.chatMessages.appendChild(messageDiv);
            const container = messageDiv.querySelector('.widget-container');
            if (content.widgetType === 'booking') this.renderBookingWidget(container);
            if (content.widgetType === 'jdmatch') this.renderJDWidget(container);
            this.scrollToBottom();
            return;
        }

        messageDiv.innerHTML = `<div class="message-content"></div>`;
        const body = messageDiv.querySelector('.message-content');
        this.chatMessages.appendChild(messageDiv);

        // Assistant copy is trusted (it comes from the knowledge base and may
        // contain intentional markup). Anything the visitor typed is escaped.
        const html = type === 'user'
            ? this.escapeHtml(content)
            : this.formatMessage(content);

        if (type === 'assistant' && !this.reduceMotion) {
            this.streamInto(body, html, () => this.decorateAnswer(body, opts));
        } else {
            body.innerHTML = `<p>${html}</p>`;
            if (type === 'assistant') this.decorateAnswer(body, opts);
        }

        this.scrollToBottom();
        this.persistTranscript();
    }

    /**
     * Reveals an answer word-by-word. Because the source can contain inline
     * HTML, we stream the plain text and swap in the real HTML at the end —
     * markup never renders half-formed.
     */
    streamInto(body, html, done) {
        const plain = html.replace(/<[^>]+>/g, '');
        const words = plain.split(/(\s+)/);
        const p = document.createElement('p');
        body.appendChild(p);

        let i = 0;
        const step = () => {
            if (!body.isConnected) return;
            const chunk = words.slice(i, i + 3).join('');
            p.textContent += chunk;
            i += 3;
            this.scrollToBottom();
            if (i < words.length) {
                setTimeout(step, 18);
            } else {
                body.innerHTML = `<p>${html}</p>`;
                if (done) done();
                this.scrollToBottom();
                this.persistTranscript();
            }
        };
        step();
    }

    decorateAnswer(body, opts) {
        // Deep link into the site
        if (opts.link && opts.link.href) {
            const a = document.createElement('a');
            a.className = 'answer-link-btn';
            a.href = opts.link.href;
            a.textContent = `${opts.link.label} →`;
            body.appendChild(a);
        }

        // Copy button
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'msg-copy-btn';
        copy.setAttribute('aria-label', 'Copy this answer');
        copy.textContent = 'Copy';
        body.appendChild(copy);

        const chips = opts.suggestions
            ? opts.suggestions.map(s => ({ label: s.label, q: s.query }))
            : (opts.followUps || []).map(f => ({ label: f, q: f }));

        if (chips.length) this.renderChips(chips);
    }

    renderChips(chips) {
        const wrap = document.createElement('div');
        wrap.className = 'suggestion-chips';
        chips.forEach(c => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'suggestion-chip';
            b.dataset.question = c.q;
            b.textContent = c.label;
            wrap.appendChild(b);
        });
        this.chatMessages.appendChild(wrap);
        this.scrollToBottom();
    }

    clearSuggestions() {
        this.chatMessages.querySelectorAll('.suggestion-chips').forEach(el => el.remove());
    }

    copyMessage(btn) {
        const content = btn.closest('.message-content');
        if (!content) return;
        const text = content.innerText.replace(/\s*Copy\s*$/, '').trim();
        const finish = () => {
            btn.textContent = 'Copied';
            setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(finish).catch(() => { });
        }
    }

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    formatMessage(text) {
        return String(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '</p><p>');
    }

    showTyping() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /* ================= Transcript persistence ================= */

    persistTranscript() {
        try {
            sessionStorage.setItem('cs-chat-transcript', this.chatMessages.innerHTML);
        } catch (e) { /* private mode / quota */ }
    }

    restoreTranscript() {
        try {
            const saved = sessionStorage.getItem('cs-chat-transcript');
            if (saved && saved.indexOf('user-message') !== -1) {
                this.chatMessages.innerHTML = saved;
                // Widgets are not restorable (they hold live state) — drop them.
                this.chatMessages.querySelectorAll('.widget-container').forEach(w => w.remove());
                this.scrollToBottom();
            }
        } catch (e) { /* ignore */ }
    }

    /* ================= JD Match Analyzer ================= */

    renderJDWidget(container) {
        const id = 'jd-' + Date.now();
        container.innerHTML = `
            <div class="jd-widget" id="${id}">
                <label class="jd-label" for="${id}-input">Job description</label>
                <textarea id="${id}-input" class="jd-input" rows="5"
                    placeholder="Paste the full job description here..."></textarea>
                <button type="button" class="jd-analyze-btn">Analyze match</button>
                <div class="jd-result" hidden></div>
            </div>
        `;

        const root = container.querySelector('.jd-widget');
        const input = root.querySelector('.jd-input');
        const btn = root.querySelector('.jd-analyze-btn');
        const out = root.querySelector('.jd-result');

        btn.addEventListener('click', () => {
            const res = window.JDMatcher ? window.JDMatcher.analyze(input.value) : null;
            out.hidden = false;

            if (!res || !res.ok) {
                const msg = (res && res.reason === 'too_short')
                    ? 'Please paste a bit more of the job description (at least a couple of lines).'
                    : "I couldn't find any payroll, compliance or automation requirements in that text. Is it definitely a payroll-related role?";
                out.innerHTML = `<p class="jd-empty">${msg}</p>`;
                return;
            }

            const verdict = window.JDMatcher.verdict(res.percent);
            out.innerHTML = `
                <div class="jd-score">
                    <div class="jd-score-ring" style="--pct:${res.percent}">
                        <span class="jd-score-num">${res.percent}<small>%</small></span>
                    </div>
                    <div class="jd-score-meta">
                        <strong>${verdict}</strong>
                        <span>${res.matched.length} requirement${res.matched.length === 1 ? '' : 's'} matched${res.gaps.length ? ` · ${res.gaps.length} gap${res.gaps.length === 1 ? '' : 's'}` : ''}</span>
                    </div>
                </div>
                <div class="jd-group">
                    <h5>Matches Chetan's profile</h5>
                    <div class="jd-tags">
                        ${res.matched.map(m => `<span class="jd-tag jd-tag-yes">${m.label}</span>`).join('') || '<span class="jd-none">None identified</span>'}
                    </div>
                </div>
                ${res.gaps.length ? `
                <div class="jd-group">
                    <h5>Not evidenced on this site</h5>
                    <div class="jd-tags">
                        ${res.gaps.map(g => `<span class="jd-tag jd-tag-gap">${g.label}</span>`).join('')}
                    </div>
                </div>` : ''}
                <p class="jd-note">Scored against skills documented on this site only — nothing is inferred or assumed.</p>
            `;
            this.scrollToBottom();

            if (typeof window.gtag === 'function') {
                try {
                    window.gtag('event', 'jd_match', { percent: res.percent, matched: res.matched.length, gaps: res.gaps.length });
                } catch (e) { /* noop */ }
            }
        });
    }

    /* ================= Booking widget ================= */

    /* ================= Booking widget ================= */

    renderBookingWidget(container) {
        const CU = window.CalendarUtils;
        if (!CU) {
            container.innerHTML = '<p class="booking-error">Booking is unavailable right now. Please email chetanpayroll@gmail.com.</p>';
            return;
        }

        const self = this;
        const STEP_LABELS = ['Choose a date', 'Choose a time', 'Your details', 'Confirmed'];

        const state = {
            tz: CU.visitorTimeZone(),
            groups: {},
            year: 0,
            month: 0,      // 1-12, in the visitor's calendar
            dateKey: null,
            instant: null,
            preferred: '',
            step: 1,
            sending: false,
            done: null
        };

        container.innerHTML = '<div class="bk"></div>';
        const root = container.querySelector('.bk');

        /* ---------- data ---------- */

        function refreshSlots() {
            state.groups = CU.slotsByVisitorDate(state.tz);
            const keys = Object.keys(state.groups).sort();
            const first = keys[0];
            if (first) {
                const p = first.split('-');
                state.year = parseInt(p[0], 10);
                state.month = parseInt(p[1], 10);
            } else {
                const now = CU.partsInZone(new Date(), state.tz);
                state.year = now.year;
                state.month = now.month;
            }
        }

        function pad(n) { return n < 10 ? '0' + n : '' + n; }
        function keyOf(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }

        function monthHasAnySlot(y, m) {
            const prefix = y + '-' + pad(m) + '-';
            return Object.keys(state.groups).some(k => k.indexOf(prefix) === 0);
        }

        /* ---------- small helpers ---------- */

        function esc(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function zoneCity(tz) {
            const bits = String(tz).split('/');
            return bits[bits.length - 1].replace(/_/g, ' ');
        }

        function hostTimeOf(instant) {
            return CU.formatTimeInZone(instant, CU.HOST_TZ) + ' IST';
        }

        /* ---------- render ---------- */

        function render(focusSel) {
            const pct = Math.round((state.step / 4) * 100);
            const html = [];

            // Timezone bar
            const sample = state.instant || new Date();
            html.push(
                '<div class="bk-tzbar">' +
                '<span class="bk-tz-text">Times shown in <strong>' + esc(zoneCity(state.tz)) + '</strong>' +
                ' <span class="bk-tz-abbr">' + esc(CU.zoneAbbreviation(sample, state.tz)) + '</span></span>' +
                (state.step < 4
                    ? '<button type="button" class="bk-tz-toggle" aria-expanded="false">Change</button>'
                    : '') +
                '</div>' +
                '<div class="bk-tzpicker" hidden>' +
                '<label class="bk-tz-label" for="bk-tz-select">Your timezone</label>' +
                '<select id="bk-tz-select" class="bk-tz-select">' +
                CU.availableTimeZones().map(z =>
                    '<option value="' + esc(z) + '"' + (z === state.tz ? ' selected' : '') + '>' + esc(z) + '</option>'
                ).join('') +
                '</select></div>'
            );

            // Progress
            html.push(
                '<div class="bk-progress" role="progressbar" aria-valuemin="1" aria-valuemax="4"' +
                ' aria-valuenow="' + state.step + '" aria-label="Booking progress">' +
                '<div class="bk-progress-fill" style="width:' + pct + '%"></div></div>' +
                '<p class="bk-steplabel">Step ' + state.step + ' of 4 · ' + STEP_LABELS[state.step - 1] + '</p>'
            );

            // Summary once a slot is chosen
            if (state.instant) {
                html.push(
                    '<div class="bk-summary">' +
                    '<div class="bk-summary-row">' +
                    '<span class="bk-summary-date">' + esc(CU.formatDateInZone(state.instant, state.tz, { weekday: 'long', month: 'long', day: 'numeric' })) + '</span>' +
                    '</div>' +
                    '<div class="bk-summary-row">' +
                    '<span class="bk-summary-time">' + esc(CU.formatTimeInZone(state.instant, state.tz)) + '</span>' +
                    '<span class="bk-summary-meta">' + esc(CU.zoneAbbreviation(state.instant, state.tz)) + ' · 30 min</span>' +
                    '</div>' +
                    '<div class="bk-summary-host">' + esc(hostTimeOf(state.instant)) + ' for Chetan</div>' +
                    '</div>'
                );
            }

            if (state.step === 1) html.push(renderCalendar());
            if (state.step === 2) html.push(renderTimes());
            if (state.step === 3) html.push(renderForm());
            if (state.step === 4) html.push(renderSuccess());

            root.innerHTML = html.join('');
            self.scrollToBottom();

            if (focusSel) {
                const el = root.querySelector(focusSel);
                if (el) el.focus();
            }
        }

        function renderCalendar() {
            const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
                .format(new Date(Date.UTC(state.year, state.month - 1, 1)));

            const firstDow = new Date(Date.UTC(state.year, state.month - 1, 1)).getUTCDay();
            const daysInMonth = new Date(Date.UTC(state.year, state.month, 0)).getUTCDate();
            const todayKey = CU.partsInZone(new Date(), state.tz).key;

            const cells = [];
            for (let i = 0; i < firstDow; i++) cells.push('<span class="bk-day bk-day-blank"></span>');

            for (let d = 1; d <= daysInMonth; d++) {
                const k = keyOf(state.year, state.month, d);
                const open = !!state.groups[k];
                const isToday = k === todayKey;
                const sel = state.dateKey === k;
                if (open) {
                    cells.push(
                        '<button type="button" class="bk-day is-open' + (sel ? ' is-selected' : '') +
                        (isToday ? ' is-today' : '') + '" data-key="' + k + '" role="gridcell"' +
                        ' aria-selected="' + (sel ? 'true' : 'false') + '"' +
                        ' aria-label="' + esc(CU.formatDateInZone(state.groups[k][0], state.tz, { weekday: 'long', month: 'long', day: 'numeric' })) +
                        ', ' + state.groups[k].length + ' slots">' + d + '</button>'
                    );
                } else {
                    cells.push(
                        '<span class="bk-day is-closed' + (isToday ? ' is-today' : '') +
                        '" aria-disabled="true">' + d + '</span>'
                    );
                }
            }

            const prevOk = monthHasAnySlot(
                state.month === 1 ? state.year - 1 : state.year,
                state.month === 1 ? 12 : state.month - 1
            );
            const nextOk = monthHasAnySlot(
                state.month === 12 ? state.year + 1 : state.year,
                state.month === 12 ? 1 : state.month + 1
            );

            return '<div class="bk-cal">' +
                '<div class="bk-cal-head">' +
                '<button type="button" class="bk-nav" data-nav="-1" aria-label="Previous month"' +
                (prevOk ? '' : ' disabled') + '>&#8249;</button>' +
                '<span class="bk-cal-title">' + esc(monthName) + '</span>' +
                '<button type="button" class="bk-nav" data-nav="1" aria-label="Next month"' +
                (nextOk ? '' : ' disabled') + '>&#8250;</button>' +
                '</div>' +
                '<div class="bk-dow" aria-hidden="true">' +
                ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => '<span>' + x + '</span>').join('') +
                '</div>' +
                '<div class="bk-grid" role="grid" aria-label="Available dates">' + cells.join('') + '</div>' +
                '<p class="bk-hint">Weekdays only · 24-hour notice · times converted to your timezone</p>' +
                '</div>';
        }

        function renderTimes() {
            const list = state.groups[state.dateKey] || [];
            const slots = list.map((instant, i) =>
                '<button type="button" class="bk-slot" role="radio" aria-checked="false"' +
                ' data-i="' + i + '" tabindex="' + (i === 0 ? '0' : '-1') + '">' +
                '<span class="bk-slot-time">' + esc(CU.formatTimeInZone(instant, state.tz)) + '</span>' +
                '<span class="bk-slot-host">' + esc(hostTimeOf(instant)) + '</span>' +
                '</button>'
            ).join('');

            return '<div class="bk-step">' +
                '<button type="button" class="bk-back" data-back="1">&#8592; Change date</button>' +
                '<div class="bk-slots" role="radiogroup" aria-label="Available times">' + slots + '</div>' +
                '<button type="button" class="bk-nofit">None of these work for me</button>' +
                '</div>';
        }

        function renderForm() {
            return '<div class="bk-step">' +
                '<button type="button" class="bk-back" data-back="2">&#8592; Change time</button>' +
                '<form class="booking-form bk-form" novalidate>' +
                field('name', 'text', 'Your name', 'name') +
                field('email', 'email', 'Email address', 'email') +
                field('topic', 'text', 'What would you like to discuss?', 'off') +
                (state.preferred
                    ? '<p class="bk-preferred">Preferred time noted: <strong>' + esc(state.preferred) + '</strong></p>'
                    : '') +
                '<button type="submit" class="confirm-btn bk-confirm">Request this meeting</button>' +
                '<p class="bk-note">Chetan confirms by email — this sends a request, it is not an instant booking.</p>' +
                '</form></div>';
        }

        function field(name, type, label, ac) {
            return '<div class="bk-field">' +
                '<label class="bk-flabel" for="bk-' + name + '">' + esc(label) + '</label>' +
                '<input class="booking-input" id="bk-' + name + '" name="' + name + '" type="' + type + '"' +
                ' autocomplete="' + ac + '" aria-describedby="bk-' + name + '-err" required>' +
                '<span class="bk-err" id="bk-' + name + '-err" role="alert"></span>' +
                '</div>';
        }

        function renderSuccess() {
            const r = state.done || {};
            return '<div class="bk-step bk-success">' +
                '<div class="success-icon" aria-hidden="true">' +
                '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
                '</div>' +
                '<h4>Request sent</h4>' +
                '<p class="bk-note">' +
                (r.bothNotified
                    ? 'A confirmation is on its way to your inbox, and Chetan has been notified.'
                    : 'Your request has reached Chetan. Add it to your calendar below — he will confirm by email.') +
                '</p>' +
                (state.instant ? CU.calendarLinksHTML(state.eventObj) : '') +
                '</div>';
        }

        /* ---------- validation ---------- */

        const RULES = {
            name: v => v.trim().length >= 2 || 'Please enter your name',
            email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email',
            topic: v => v.trim().length >= 3 || 'A short topic helps Chetan prepare'
        };

        function validateField(input) {
            const rule = RULES[input.name];
            if (!rule) return true;
            const res = rule(input.value);
            const err = root.querySelector('#bk-' + input.name + '-err');
            if (res === true) {
                input.classList.remove('is-invalid');
                if (err) err.textContent = '';
                return true;
            }
            input.classList.add('is-invalid');
            if (err) err.textContent = res;
            return false;
        }

        /* ---------- events ---------- */

        root.addEventListener('click', async (e) => {
            const tzToggle = e.target.closest('.bk-tz-toggle');
            if (tzToggle) {
                const picker = root.querySelector('.bk-tzpicker');
                const open = picker.hasAttribute('hidden');
                if (open) picker.removeAttribute('hidden'); else picker.setAttribute('hidden', '');
                tzToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                if (open) picker.querySelector('select').focus();
                return;
            }

            const nav = e.target.closest('.bk-nav');
            if (nav && !nav.disabled) {
                const dir = parseInt(nav.dataset.nav, 10);
                let m = state.month + dir, y = state.year;
                if (m < 1) { m = 12; y--; }
                if (m > 12) { m = 1; y++; }
                state.month = m; state.year = y;
                render('.bk-cal-title');
                return;
            }

            const day = e.target.closest('.bk-day.is-open');
            if (day) {
                state.dateKey = day.dataset.key;
                state.instant = null;
                state.step = 2;
                render('.bk-slot');
                return;
            }

            const slot = e.target.closest('.bk-slot');
            if (slot) {
                const list = state.groups[state.dateKey] || [];
                state.instant = list[parseInt(slot.dataset.i, 10)];
                state.step = 3;
                render('#bk-name');
                return;
            }

            const back = e.target.closest('.bk-back');
            if (back) {
                state.step = parseInt(back.dataset.back, 10);
                if (state.step === 1) { state.instant = null; }
                render(state.step === 1 ? '.bk-day.is-open' : '.bk-slot');
                return;
            }

            const nofit = e.target.closest('.bk-nofit');
            if (nofit) {
                const answer = window.prompt('What day and time would suit you? (your local time)');
                if (answer && answer.trim()) {
                    state.preferred = answer.trim();
                    const list = state.groups[state.dateKey] || [];
                    state.instant = list[0] || null;
                    state.step = 3;
                    render('#bk-name');
                }
                return;
            }

            const ics = e.target.closest('[data-cal="ics"]');
            if (ics && state.eventObj) {
                CU.downloadICS(state.eventObj);
            }
        });

        root.addEventListener('change', (e) => {
            if (e.target.id === 'bk-tz-select') {
                state.tz = e.target.value;
                state.dateKey = null;
                state.instant = null;
                state.step = 1;
                refreshSlots();
                render('.bk-tz-toggle');
            }
        });

        root.addEventListener('blur', (e) => {
            if (e.target.classList && e.target.classList.contains('booking-input')) validateField(e.target);
        }, true);

        root.addEventListener('input', (e) => {
            if (e.target.classList && e.target.classList.contains('booking-input') &&
                e.target.classList.contains('is-invalid')) {
                validateField(e.target);
            }
        });

        // Keyboard: arrow navigation across days and slots
        root.addEventListener('keydown', (e) => {
            const inGrid = e.target.closest('.bk-grid');
            const inSlots = e.target.closest('.bk-slots');
            if (!inGrid && !inSlots) return;

            const items = Array.from(
                (inGrid || inSlots).querySelectorAll(inGrid ? '.bk-day.is-open' : '.bk-slot')
            );
            const idx = items.indexOf(e.target);
            if (idx === -1) return;

            const step = inGrid ? { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }
                : { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 };
            if (step[e.key] !== undefined) {
                e.preventDefault();
                const next = items[Math.min(items.length - 1, Math.max(0, idx + step[e.key]))];
                if (next) {
                    items.forEach(i => i.setAttribute('tabindex', '-1'));
                    next.setAttribute('tabindex', '0');
                    next.focus();
                }
            } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                const t = e.key === 'Home' ? items[0] : items[items.length - 1];
                if (t) t.focus();
            }
        });

        root.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (state.sending) return;

            const form = e.target;
            const inputs = Array.from(form.querySelectorAll('.booking-input'));
            const allOk = inputs.map(validateField).every(Boolean);
            if (!allOk) {
                const bad = form.querySelector('.is-invalid');
                if (bad) bad.focus();
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 400);
                return;
            }

            state.sending = true;
            const btn = form.querySelector('.bk-confirm');
            const original = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Sending…';

            const name = form.elements.name.value.trim();
            const email = form.elements.email.value.trim();
            const topic = form.elements.topic.value.trim();

            state.eventObj = CU.buildEvent({
                start: state.instant, attendeeName: name, attendeeEmail: email, topic: topic
            });

            const payload = {
                name: name, email: email, topic: topic,
                date: CU.formatDateInZone(state.instant, state.tz, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                time: CU.formatTimeInZone(state.instant, state.tz) + ' ' + CU.zoneAbbreviation(state.instant, state.tz) +
                    ' (' + hostTimeOf(state.instant) + ')',
                timezone: state.tz,
                company: state.preferred ? ('Preferred alternative: ' + state.preferred) : '',
                source: 'Portfolio AI Chat'
            };

            try {
                state.done = await window.BookingTransport.submit(payload, state.eventObj);
                state.step = 4;
                render();
                if (typeof window.gtag === 'function') {
                    try { window.gtag('event', 'booking_submitted', { via: state.done.via, source: 'chat' }); } catch (err) { }
                }
            } catch (err) {
                console.error('Booking Error:', err);
                btn.disabled = false;
                btn.textContent = original;
                state.sending = false;
                let box = form.querySelector('.booking-error');
                if (!box) {
                    box = document.createElement('p');
                    box.className = 'booking-error';
                    form.appendChild(box);
                }
                box.textContent = 'Could not send the request. Please email chetanpayroll@gmail.com directly.';
            }
        });

        /* ---------- go ---------- */
        refreshSlots();
        render();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileAssistant();
});
