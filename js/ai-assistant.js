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

    renderBookingWidget(container) {
        const today = new Date();
        const dates = [];

        // Next 5 weekdays.
        let cursor = 1;
        while (dates.length < 5 && cursor < 20) {
            const d = new Date(today);
            d.setDate(today.getDate() + cursor);
            cursor++;
            const dow = d.getDay();
            if (dow === 0 || dow === 6) continue; // skip weekends
            dates.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                date: d.getDate(),
                fullDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
                iso: d.toISOString()
            });
        }

        const widgetId = 'booking-' + Date.now();

        container.innerHTML = `
            <div id="${widgetId}" class="booking-widget">
                <div class="booking-step" id="${widgetId}-step-1">
                    <p class="booking-title">Select a Date</p>
                    <div class="date-scroll">
                        ${dates.map(d => `
                            <button type="button" class="date-card" data-date="${d.fullDate}" data-iso="${d.iso}">
                                <span class="card-day">${d.day}</span>
                                <span class="card-date">${d.date}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="booking-step hidden" id="${widgetId}-step-2">
                    <button type="button" class="back-link" data-step="1">← Back</button>
                    <p class="booking-title">Select Time</p>
                    <p class="selected-date-display"></p>
                    <div class="time-grid">
                        <button type="button" class="time-btn">10:00 AM</button>
                        <button type="button" class="time-btn">11:30 AM</button>
                        <button type="button" class="time-btn">02:00 PM</button>
                        <button type="button" class="time-btn">04:30 PM</button>
                    </div>
                </div>

                <div class="booking-step hidden" id="${widgetId}-step-3">
                    <button type="button" class="back-link" data-step="2">← Back</button>
                    <p class="booking-title">Your Details</p>
                    <form class="booking-form" novalidate>
                        <input type="text" name="name" placeholder="Your Name" required class="booking-input">
                        <input type="email" name="email" placeholder="Email Address" required class="booking-input">
                        <input type="text" name="topic" placeholder="Meeting Topic" required class="booking-input">
                        <button type="submit" class="confirm-btn">Confirm Booking</button>
                    </form>
                </div>

                <div class="booking-step hidden" id="${widgetId}-step-4">
                    <div class="booking-success">
                        <div class="success-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h4>Request Sent!</h4>
                        <p>Chetan will confirm the meeting for:</p>
                        <p class="final-slot"></p>
                        <div class="cal-slot"></div>
                        <p class="small-note"></p>
                    </div>
                </div>
            </div>
        `;

        const widget = container.querySelector('.' + 'booking-widget');
        const state = { date: null, iso: null, time: null };
        const self = this;

        const goStep = (n) => {
            widget.querySelectorAll('.booking-step').forEach(s => s.classList.add('hidden'));
            const el = document.getElementById(`${widgetId}-step-${n}`);
            if (el) el.classList.remove('hidden');
            self.scrollToBottom();
        };

        widget.addEventListener('click', async (e) => {
            const dateBtn = e.target.closest('.date-card');
            if (dateBtn) {
                widget.querySelectorAll('.date-card').forEach(c => c.classList.remove('active'));
                dateBtn.classList.add('active');
                state.date = dateBtn.dataset.date;
                state.iso = dateBtn.dataset.iso;
                const disp = widget.querySelector('.selected-date-display');
                if (disp) disp.textContent = state.date;
                goStep(2);
                return;
            }

            const timeBtn = e.target.closest('.time-btn');
            if (timeBtn) {
                state.time = timeBtn.textContent.trim();
                goStep(3);
                return;
            }

            const back = e.target.closest('.back-link');
            if (back) { goStep(Number(back.dataset.step)); return; }

            const calBtn = e.target.closest('[data-cal="ics"]');
            if (calBtn && widget._event && window.CalendarUtils) {
                window.CalendarUtils.downloadICS(widget._event);
            }
        });

        const form = widget.querySelector('.booking-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.confirm-btn');
            const original = submitBtn.textContent;

            const name = form.elements.name.value.trim();
            const email = form.elements.email.value.trim();
            const topic = form.elements.topic.value.trim();

            if (!name || !email || !topic || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 400);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending Request...';

            const payload = {
                name, email, topic,
                date: state.date,
                time: state.time,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                source: 'Portfolio AI Chat'
            };

            let ev = null;
            if (window.CalendarUtils && state.iso && state.time) {
                const start = window.CalendarUtils.combineDateAndTime(new Date(state.iso), state.time);
                ev = window.CalendarUtils.buildEvent({
                    start, attendeeName: name, attendeeEmail: email, topic
                });
                widget._event = ev;
            }

            try {
                const res = await window.BookingTransport.submit(payload, ev);

                widget.querySelector('.final-slot').textContent = `${state.date} • ${state.time}`;

                const note = widget.querySelector('.small-note');
                note.textContent = res.bothNotified
                    ? 'A confirmation email is on its way to you, and Chetan has been notified.'
                    : 'Your request has been sent to Chetan. Add the invite to your calendar below.';

                if (ev && window.CalendarUtils) {
                    widget.querySelector('.cal-slot').innerHTML =
                        window.CalendarUtils.calendarLinksHTML(ev);
                }

                goStep(4);
                if (window.lucide) window.lucide.createIcons();

                if (typeof window.gtag === 'function') {
                    try { window.gtag('event', 'booking_submitted', { via: res.via, source: 'chat' }); } catch (err) { }
                }
            } catch (error) {
                console.error('Booking Error:', error);
                const note = document.createElement('p');
                note.className = 'booking-error';
                note.textContent = 'Sorry, there was an issue sending your request. Please email chetanpayroll@gmail.com directly.';
                form.appendChild(note);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = original;
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileAssistant();
});
