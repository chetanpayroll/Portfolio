/**
 * AI Assistant for Chetan Sharma's Portfolio
 * Only answers questions about Chetan's professional profile
 */

class ProfileAssistant {
    constructor() {
        this.chatToggle = document.getElementById('chat-toggle');
        this.chatWindow = document.getElementById('chat-window');
        this.chatClose = document.getElementById('chat-close');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatMessages = document.getElementById('chat-messages');

        this.isOpen = false;
        this.isProcessing = false;

        this.init();
    }

    init() {
        // Toggle chat
        this.chatToggle.addEventListener('click', () => this.toggleChat());
        this.chatClose.addEventListener('click', () => this.closeChat());

        // Form submit
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserMessage();
        });

        // Quick action buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.dataset.question;
                this.chatInput.value = question;
                this.handleUserMessage();
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeChat();
            }
        });
    }

    toggleChat() {
        this.isOpen ? this.closeChat() : this.openChat();
    }

    openChat() {
        this.isOpen = true;
        this.chatWindow.classList.add('visible');
        this.chatToggle.classList.add('active');
        this.chatInput.focus();
    }

    closeChat() {
        this.isOpen = false;
        this.chatWindow.classList.remove('visible');
        this.chatToggle.classList.remove('active');
    }

    handleUserMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isProcessing) return;

        // Add user message
        this.addMessage(message, 'user');
        this.chatInput.value = '';

        // Hide quick actions after first message
        const quickActions = document.querySelector('.quick-actions');
        if (quickActions) quickActions.style.display = 'none';

        // Show typing indicator
        this.showTyping();

        // Process and respond
        this.isProcessing = true;
        setTimeout(() => {
            this.hideTyping();
            const response = this.generateResponse(message);
            this.addMessage(response, 'assistant');
            this.isProcessing = false;
        }, 800 + Math.random() * 700); // Random delay for natural feel
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <p>${this.formatMessage(content)}</p>
            </div>
        `;
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(text) {
        // Convert markdown-like formatting
        return text
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

    generateResponse(query) {
        const q = query.toLowerCase();

        // ============================================
        // PROFILE QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['who is chetan', 'tell me about chetan', 'who are you', 'about chetan', 'introduce'])) {
            return `**Chetan Sharma** is a Global Payroll Implementation Manager with **13+ years** of experience.\n\nHe currently works at **Deel**, where he leads enterprise payroll implementations across **25+ countries** with **99.8% accuracy**.\n\nHe specializes in Hong Kong MPF, Singapore CPF, and UAE compliance, and has been promoted **5 times in 4 years**.`;
        }

        if (this.matchesAny(q, ['what does chetan do', 'what is his job', 'his role', 'job title', 'position'])) {
            return `Chetan is a **Global Payroll Implementation Manager** at Deel.\n\nHe leads multi-country payroll transitions, builds automation solutions, manages compliance across APAC and Middle East regions, and mentors implementation teams.`;
        }

        if (this.matchesAny(q, ['where is chetan', 'location', 'where does he', 'based', 'work from'])) {
            return `Chetan is based in **Alwar, Rajasthan, India**.\n\nHe works remotely and has managed global payroll operations across multiple time zones throughout his career at Deel.`;
        }

        // ============================================
        // EXPERIENCE QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['experience', 'work history', 'career', 'worked', 'employment', 'background'])) {
            return `Chetan has **13+ years** of experience:\n\n• **Deel** (2018-Present): Global Payroll Implementation Manager\n• **Xerex Business Services** (2014-2017): Benefits Administrator\n• **AON Hewitt** (2011-2014): HR & Benefits Coordinator\n\nAt Deel, he's led implementations across 25+ countries and managed 122 payrolls in a single year.`;
        }

        if (this.matchesAny(q, ['how long', 'deel', 'current job', 'current company'])) {
            return `Chetan has been with **Deel** (formerly Safeguard Pay) since **October 2018** - over 6 years.\n\nDuring this time, he's received **5 promotions** and multiple awards including the Global Bolt Award.`;
        }

        if (this.matchesAny(q, ['countries', 'regions', 'international', 'global'])) {
            return `Chetan has hands-on expertise with payroll in:\n\n• **Hong Kong** - MPF, IR56B, ORSO\n• **Singapore** - CPF, SDL, IR8A\n• **UAE** - Gratuity, WPS, MOHRE\n• **Indonesia** - BPJS\n\nHe has managed implementations across **25+ countries** in APAC, EMEA, and LATAM regions.`;
        }

        // ============================================
        // SKILLS QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['skills', 'expertise', 'good at', 'abilities', 'competencies', 'capable'])) {
            return `Chetan's key skills include:\n\n**Payroll Platforms:** Deel, Unity, Payroll2u\n\n**Compliance:** Hong Kong MPF/IR56B, Singapore CPF/SDL, UAE Gratuity/WPS\n\n**Automation:** Google Apps Script, Advanced Excel, Data Migration\n\n**Management:** Project Management, Stakeholder Management, Vendor Transitions, Team Leadership`;
        }

        if (this.matchesAny(q, ['tools', 'software', 'platforms', 'systems', 'technology'])) {
            return `Chetan works with:\n\n**Payroll:** Deel, Unity, Payroll2u\n**Project Management:** Monday.com, Gainsight\n**Communication:** Slack, Microsoft Teams\n**Automation:** Google Apps Script, Advanced Excel`;
        }

        if (this.matchesAny(q, ['hong kong', 'hk', 'mpf'])) {
            return `Yes! Chetan has deep expertise in **Hong Kong payroll** including:\n\n• **MPF** (Mandatory Provident Fund) setup and management\n• **IR56B and IR56E** tax filing workflows\n• **ORSO** pension schemes\n\nHe implemented end-to-end MPF compliance at Deel with **100% statutory compliance**.`;
        }

        if (this.matchesAny(q, ['singapore', 'sg', 'cpf'])) {
            return `Chetan has configured complete **Singapore payroll** systems including:\n\n• **CPF** (Central Provident Fund) calculations by age tier\n• **SDL** (Skills Development Levy) at 0.25%\n• **IR8A** annual tax reporting\n\nHe manages monthly submissions for **500+ employees**.`;
        }

        if (this.matchesAny(q, ['uae', 'dubai', 'gratuity', 'wps'])) {
            return `Chetan has expertise in **UAE payroll** compliance:\n\n• **End of Service Gratuity** calculations\n• **WPS** (Wage Protection System)\n• **MOHRE** compliance requirements\n\nHe has implemented UAE payroll processes at Deel.`;
        }

        // ============================================
        // PROJECT QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['projects', 'work on', 'portfolio', 'achievements', 'accomplished'])) {
            return `Chetan's notable projects include:\n\n1. **Project Unity** - Migrated 2,000+ employees across 18 countries with zero disruption\n\n2. **ICP Service Dashboard** - Automated comparison of 50+ service providers, saving 15+ hours/week\n\n3. **Two-Way Validation Engine** - Built Google Apps Script tool saving 12 hours/week\n\n4. **Hong Kong MPF Implementation** - 100% statutory compliance\n\n5. **Singapore CPF Setup** - Processing for 500+ employees monthly`;
        }

        if (this.matchesAny(q, ['project unity', 'unity', 'migration'])) {
            return `**Project Unity** was a major migration initiative at Deel.\n\nChetan led the transition of **2,000+ employees** across **18+ countries** from a legacy system to a new platform.\n\n**Results:**\n• 100% data integrity\n• Zero payroll disruption\n• Completed in 3 months`;
        }

        if (this.matchesAny(q, ['automation', 'dashboard', 'script', 'validation'])) {
            return `Chetan has built several automation tools:\n\n**ICP Service Dashboard:**\n• Automates 50+ service provider comparisons\n• Saves 15+ hours/week\n• Reduced planning cycle by 40%\n\n**Two-Way Validation Engine:**\n• Google Apps Script tool\n• Saves 12 hours/week in reconciliation\n• Audit-ready for SOC 1 compliance`;
        }

        // ============================================
        // AWARDS QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['awards', 'recognition', 'achievements', 'honors', 'accomplishments'])) {
            return `Chetan has received numerous awards:\n\n• **2024:** Global Bolt Award (Deel)\n• **2023:** Spotlight Award (Deel)\n• **2022:** Global Annual Bolt Award - 122 payrolls processed\n• **2021, 2020, 2019:** Annual Bolt Awards\n• **2018:** Spotlight Awards (Q1, Q2, Q3)\n\nHe's also been **promoted 5 times in 4 years**.`;
        }

        if (this.matchesAny(q, ['promotions', 'promoted', 'career growth', 'advancement'])) {
            return `Chetan has been **promoted 5 times in 4 years** (2020-2024):\n\nInternational Specialist → Senior Specialist → Implementation Consultant → Senior Implementation Consultant → **Implementation Manager**\n\nThis reflects his consistent excellence in payroll operations and leadership.`;
        }

        if (this.matchesAny(q, ['accuracy', 'performance', 'track record', 'success rate'])) {
            return `Chetan maintains a **99.8% accuracy rate** across all payroll operations.\n\nThis includes:\n• Managing **122 payrolls** in a single year\n• Implementations across **25+ countries**\n• Zero payroll disruption in major migrations`;
        }

        // ============================================
        // CONTACT QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['contact', 'email', 'phone', 'reach', 'connect', 'get in touch', 'hire', 'linkedin'])) {
            return `You can reach Chetan through:\n\n📧 **Email:** chetanpayroll@gmail.com\n📱 **Phone:** +91 8619495587\n🔗 **LinkedIn:** linkedin.com/in/chetan-champ/\n🌐 **Website:** www.gmppayroll.com\n\nHe's open to discussing career opportunities, speaking engagements, and professional collaboration.`;
        }

        if (this.matchesAny(q, ['available', 'hire', 'job', 'opportunity', 'looking', 'open to'])) {
            return `Yes! Chetan is currently **open to new opportunities**.\n\nHe's exploring senior roles in:\n• Global payroll operations\n• Implementation leadership\n• Payroll transformation\n\nFeel free to reach out at **chetanpayroll@gmail.com**.`;
        }

        // ============================================
        // RESUME QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['resume', 'cv', 'download', 'pdf'])) {
            return `Yes! You can download Chetan's resume from the website.\n\nClick the **'Download Resume'** button on the homepage or contact page.\n\nThe resume includes his complete work history, skills, achievements, and contact information.`;
        }

        // ============================================
        // VIDEO QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['video', 'watch', 'see him', 'introduction video'])) {
            return `There's a **professional video introduction** on the homepage!\n\nYou can watch it to learn more about Chetan's background, expertise, and career vision.\n\nJust scroll to the hero section on the main page.`;
        }

        // ============================================
        // EDUCATION QUESTIONS
        // ============================================

        if (this.matchesAny(q, ['education', 'degree', 'university', 'study', 'college', 'qualification'])) {
            return `Chetan holds a **B.Sc (Bachelor of Science)** degree from **Rajasthan University**, completed in 2010.\n\nHis extensive professional experience of **13+ years** has made him an expert in global payroll operations.`;
        }

        // ============================================
        // GREETINGS
        // ============================================

        if (this.matchesAny(q, ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
            return `Hello! 👋 I'm Chetan's AI Assistant.\n\nI can help you learn about:\n• His professional experience\n• Skills and expertise\n• Projects and achievements\n• How to contact him\n\nWhat would you like to know?`;
        }

        if (this.matchesAny(q, ['thank', 'thanks', 'appreciate'])) {
            return `You're welcome! 😊\n\nIf you have more questions about Chetan's profile or want to get in touch with him, feel free to ask!\n\n**Email:** chetanpayroll@gmail.com`;
        }

        // ============================================
        // DEFAULT / UNRELATED QUESTIONS
        // ============================================

        return `I'm Chetan's AI Assistant, focused specifically on his professional profile.\n\nI can help you with:\n• **Experience** - Work history and career journey\n• **Skills** - Technical and professional expertise\n• **Projects** - Notable achievements and implementations\n• **Contact** - How to reach Chetan\n• **Resume** - Download his CV\n\nWhat would you like to know about Chetan?`;
    }

    matchesAny(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProfileAssistant();
});
