/* =========================================
   Fortune 100 Enterprise Booking Logic
   Handles: State Machine, Validation, Mock Data, Real Submission
   ========================================= */

class BookingFlow {
    constructor() {
        this.step = 1;
        this.state = {
            date: null,
            time: null,
            details: {}
        };
        this.accessKey = "f526a9f2-266b-43d8-9b49-41f03a7776b6"; // Web3Forms Key

        // Cache DOM Elements
        this.modalOverlay = document.getElementById('bookingModalOverlay');
        this.closeBtn = document.getElementById('closeBookingModal');
        this.progressBar = document.getElementById('bookingProgressBar');

        // Screens
        this.screenDate = document.getElementById('screenDate');
        this.screenTime = document.getElementById('screenTime');
        this.screenForm = document.getElementById('screenForm');
        this.screenReview = document.getElementById('screenReview');
        this.screenSuccess = document.getElementById('screenSuccess');

        // Interactive Elements
        this.calendarGrid = document.getElementById('calendarGrid');
        this.monthDisplay = document.getElementById('currentMonthDisplay');
        this.timeSlotGrid = document.getElementById('timeSlotGrid');
        this.bookingForm = document.getElementById('bookingDetailsForm');

        // Buttons
        this.btnDateContinue = document.getElementById('btnDateContinue');
        this.btnTimeContinue = document.getElementById('btnTimeContinue');
        this.btnFormContinue = document.getElementById('btnFormContinue');
        this.btnConfirm = document.getElementById('btnConfirmBooking');

        this.init();
    }

    init() {
        // Event Listeners for Open/Close
        document.querySelectorAll('.trigger-booking-flow').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        });

        this.closeBtn.addEventListener('click', () => this.close());

        // Setup Logic
        this.renderCalendar();
        this.setupNavigation();
        this.setupRealTimeValidation();
    }

    open() {
        this.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling bg
        this.goToStep(1);
    }

    close() {
        this.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        // Optional: Reset state after delay
        setTimeout(() => this.reset(), 300);
    }

    reset() {
        this.step = 1;
        this.state = { date: null, time: null, details: {} };
        // Reset Inputs
        if (this.bookingForm) this.bookingForm.reset();
        this.clearAllErrors();
        // Clear Selections
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        this.btnDateContinue.disabled = true;
        this.btnTimeContinue.disabled = true;
    }

    goToStep(stepNumber) {
        // Hide all screens
        [this.screenDate, this.screenTime, this.screenForm, this.screenReview, this.screenSuccess].forEach(s => s?.classList.remove('active'));

        // Show Target
        switch (stepNumber) {
            case 1: this.screenDate.classList.add('active'); break;
            case 2:
                this.renderTimeSlots();
                this.screenTime.classList.add('active');
                break;
            case 3: this.screenForm.classList.add('active'); break;
            case 4:
                this.updateReviewScreen();
                this.screenReview.classList.add('active');
                break;
            case 5: this.screenSuccess.classList.add('active'); break;
        }

        // Update Progress Bar
        const progress = (stepNumber / 5) * 100;
        this.progressBar.style.width = `${progress}%`;
        this.step = stepNumber;
    }

    /* ================= Calendar Logic ================= */
    renderCalendar() {
        const today = new Date();
        const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
        this.monthDisplay.textContent = currentMonth;

        this.calendarGrid.innerHTML = ''; // Clear

        // Mock Calendar: Starting from today
        for (let i = 0; i < 20; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const btn = document.createElement('button');
            btn.className = 'calendar-day-btn';
            btn.textContent = date.getDate();

            // Highlight today
            if (i === 0) btn.classList.add('today');

            // Disable Sundays (mock logic)
            if (date.getDay() === 0) {
                btn.disabled = true;
            } else {
                btn.onclick = () => this.selectDate(btn, date);
            }

            this.calendarGrid.appendChild(btn);
        }
    }

    selectDate(btn, date) {
        // Visual
        document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // State
        this.state.date = date;
        this.btnDateContinue.disabled = false;
    }

    /* ================= Time Slot Logic ================= */
    renderTimeSlots() {
        const slots = ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM', '04:00 PM'];
        this.timeSlotGrid.innerHTML = '';

        // Dynamic Header Update
        const dateStr = this.state.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        document.querySelector('#selectedDateDisplay').textContent = dateStr;

        slots.forEach(time => {
            const btn = document.createElement('button');
            btn.className = 'time-slot-btn';
            btn.textContent = time;
            btn.onclick = () => this.selectTime(btn, time);
            this.timeSlotGrid.appendChild(btn);
        });
    }

    selectTime(btn, time) {
        document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        this.state.time = time;
        this.btnTimeContinue.disabled = false;
    }

    /* ================= Navigation Logic ================= */
    setupNavigation() {
        // Step 1 -> 2
        this.btnDateContinue.onclick = () => this.goToStep(2);

        // Step 2 -> 3
        this.btnTimeContinue.onclick = () => this.goToStep(3);

        // Step 3 -> 4 (Validation)
        // Handle Button Click
        this.btnFormContinue.onclick = (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        };

        // Handle Enter Key on Mobile/Desktop
        if (this.bookingForm) {
            this.bookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // Step 4 -> 5 (Confirm & Submit)
        this.btnConfirm.onclick = () => this.submitBooking();

        // Back Buttons
        document.getElementById('backToDate').onclick = () => this.goToStep(1);
        document.getElementById('backToTime').onclick = () => this.goToStep(2);
        document.getElementById('backToForm').onclick = () => this.goToStep(3);
    }

    handleFormSubmit() {
        if (this.validateForm()) {
            this.goToStep(4);
        }
    }

    /* ================= Validation Logic ================= */
    setupRealTimeValidation() {
        const inputs = this.bookingForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearError(input);
            });
            input.addEventListener('blur', () => {
                if (input.value.trim() !== '') {
                    this.validateField(input);
                }
            });
        });
    }

    validateField(input) {
        const value = input.value.trim();
        if (input.hasAttribute('required') && !value) {
            this.showError(input, 'This field is required');
            return false;
        }
        if (input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showError(input, 'Please enter a valid email');
                return false;
            }
        }
        return true;
    }

    validateForm() {
        let isValid = true;
        let firstErrorInput = null;

        this.clearAllErrors();

        const inputs = this.bookingForm.querySelectorAll('input');

        // Use a standard loop or forEach
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
                if (!firstErrorInput) firstErrorInput = input;
            }
        });

        if (!isValid) {
            this.bookingForm.classList.add('shake');
            setTimeout(() => this.bookingForm.classList.remove('shake'), 400);
            if (firstErrorInput) firstErrorInput.focus();
            return false;
        }

        // Save State
        this.state.details = {
            name: document.getElementById('inputName').value,
            email: document.getElementById('inputEmail').value,
            phone: document.getElementById('inputPhone').value,
            company: document.getElementById('inputCompany').value
        };

        return true;
    }

    showError(input, message) {
        this.clearError(input); // Clear existing first
        input.classList.add('input-error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        // Add error icon
        errorDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> ${message}`;
        input.parentElement.appendChild(errorDiv);
    }

    clearError(input) {
        input.classList.remove('input-error');
        const existingError = input.parentElement.querySelector('.error-message');
        if (existingError) existingError.remove();
    }

    clearAllErrors() {
        const inputs = this.bookingForm.querySelectorAll('input');
        inputs.forEach(input => this.clearError(input));
    }

    updateReviewScreen() {
        if (!this.state.date || !this.state.time) return; // Should not happen

        document.getElementById('reviewDate').textContent = this.state.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('reviewTime').textContent = this.state.time;
        document.getElementById('reviewName').textContent = this.state.details.name;
        document.getElementById('reviewEmail').textContent = this.state.details.email;
    }

    /* ================= Submission Logic ================= */
    async submitBooking() {
        if (this.btnConfirm.disabled) return;

        // Visual Loading State
        const btnText = this.btnConfirm.querySelector('span');
        const originalText = btnText.textContent;
        btnText.textContent = 'Confirming...';
        this.btnConfirm.disabled = true;

        try {
            // Validate Date State
            if (!this.state.date) throw new Error('Invalid date selection');

            // Prepare Payload
            const dateStr = this.state.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const payload = {
                name: this.state.details.name,
                email: this.state.details.email,
                phone: this.state.details.phone || '',
                company: this.state.details.company || '',
                topic: this.state.details.topic || 'General Inquiry',
                date: dateStr,
                time: this.state.time,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                source: 'Portfolio Booking Modal'
            };

            // Build the calendar event once and reuse it for the invite,
            // the "add to calendar" links and the email attachment.
            this.currentEvent = null;
            if (window.CalendarUtils && this.state.time) {
                const start = window.CalendarUtils.combineDateAndTime(this.state.date, this.state.time);
                this.currentEvent = window.CalendarUtils.buildEvent({
                    start,
                    attendeeName: payload.name,
                    attendeeEmail: payload.email,
                    topic: payload.topic,
                    phone: payload.phone
                });
            }

            const result = await window.BookingTransport.submit(payload, this.currentEvent);

            this.renderSuccess(result);
            this.goToStep(5);

            if (typeof window.gtag === 'function') {
                try { window.gtag('event', 'booking_submitted', { via: result.via, source: 'modal' }); } catch (e) { }
            }

        } catch (error) {
            console.error('Booking Error:', error);
            alert(`Unable to schedule booking: ${error.message}. Please try again.`);
            this.btnConfirm.disabled = false;
        } finally {
            // Reset button text
            btnText.textContent = originalText;
        }
    }

    /* ================= Success screen ================= */
    renderSuccess(result) {
        const screen = this.screenSuccess;
        if (!screen) return;

        // Say what actually happened. Previously this always claimed an email
        // invitation had been sent, which was not true on the Web3Forms path.
        const subtitle = screen.querySelector('.booking-subtitle');
        if (subtitle) {
            subtitle.textContent = result && result.bothNotified
                ? 'A confirmation email with the calendar invite is on its way to you, and Chetan has been notified.'
                : 'Your request has been sent to Chetan. Add the invite to your calendar below — he will confirm by email.';
        }

        // Offer the invite + one-click calendar links.
        if (this.currentEvent && window.CalendarUtils) {
            let slot = screen.querySelector('.cal-slot');
            if (!slot) {
                slot = document.createElement('div');
                slot.className = 'cal-slot';
                const actions = screen.querySelector('.success-container > div:last-child');
                if (actions) actions.parentNode.insertBefore(slot, actions);
                else screen.querySelector('.success-container').appendChild(slot);
            }
            slot.innerHTML = window.CalendarUtils.calendarLinksHTML(this.currentEvent);
        }
    }

    /* ================= ICS Generation ================= */
    downloadICS() {
        if (!this.currentEvent || !window.CalendarUtils) {
            if (!this.state.date || !this.state.time) return;
            const start = window.CalendarUtils.combineDateAndTime(this.state.date, this.state.time);
            this.currentEvent = window.CalendarUtils.buildEvent({
                start,
                attendeeName: this.state.details.name,
                attendeeEmail: this.state.details.email,
                topic: this.state.details.topic,
                phone: this.state.details.phone
            });
        }
        window.CalendarUtils.downloadICS(this.currentEvent);
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    window.bookingFlow = new BookingFlow();

    // "Add to Calendar" on the success screen, plus the .ics button inside the
    // dynamically injected calendar-links row. Delegated so both work.
    const successScreen = document.getElementById('screenSuccess');
    if (successScreen) {
        successScreen.addEventListener('click', (e) => {
            if (e.target.closest('.booking-btn-primary') || e.target.closest('[data-cal="ics"]')) {
                e.preventDefault();
                if (window.bookingFlow) window.bookingFlow.downloadICS();
            }
        });
    }
});
