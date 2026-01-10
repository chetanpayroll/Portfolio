/* =========================================
   Fortune 100 Enterprise Booking Logic
   Handles: State Machine, Validation, Mock Data
   ========================================= */

class BookingFlow {
    constructor() {
        this.step = 1;
        this.state = {
            date: null,
            time: null,
            details: {}
        };

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
        // Simple 30-day view for demo purposes
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

        // Auto-advance for UX "wow" factor (optional, but requested by user to be seamless)
        // setTimeout(() => this.goToStep(2), 300); 
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
        // Auto-advance
        // setTimeout(() => this.goToStep(3), 300);
    }

    /* ================= Navigation Logic ================= */
    setupNavigation() {
        // Step 1 -> 2
        this.btnDateContinue.onclick = () => this.goToStep(2);

        // Step 2 -> 3
        this.btnTimeContinue.onclick = () => this.goToStep(3);

        // Step 3 -> 4 (Validation)
        this.btnFormContinue.onclick = () => {
            if (this.validateForm()) {
                this.goToStep(4);
            }
        };

        // Step 4 -> 5 (Confirm)
        this.btnConfirm.onclick = () => {
            // Mock API Call
            const btnText = this.btnConfirm.querySelector('span');
            const originalText = btnText.textContent;
            btnText.textContent = 'Confirming...';
            this.btnConfirm.disabled = true;

            setTimeout(() => {
                this.goToStep(5);
                btnText.textContent = originalText;
                this.btnConfirm.disabled = false;
            }, 1000);
        };

        // Back Buttons
        document.getElementById('backToDate').onclick = () => this.goToStep(1);
        document.getElementById('backToTime').onclick = () => this.goToStep(2);
        document.getElementById('backToForm').onclick = () => this.goToStep(3);
    }

    validateForm() {
        const name = document.getElementById('inputName').value;
        const email = document.getElementById('inputEmail').value;
        // Basic check
        if (name && email.includes('@')) {
            this.state.details = { name, email, phone: document.getElementById('inputPhone').value };
            return true;
        }
        // Simple shake animation on invalid
        this.bookingForm.classList.add('shake');
        setTimeout(() => this.bookingForm.classList.remove('shake'), 400);
        return false;
    }

    updateReviewScreen() {
        document.getElementById('reviewDate').textContent = this.state.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('reviewTime').textContent = this.state.time;
        document.getElementById('reviewName').textContent = this.state.details.name;
        document.getElementById('reviewEmail').textContent = this.state.details.email;
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    window.bookingFlow = new BookingFlow();
});
