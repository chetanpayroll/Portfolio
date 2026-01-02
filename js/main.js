/**
 * Main JavaScript Entry Point
 */

import { getCurrentYear } from './utils.js';

// Since we are using modules in utils, we need to treat this as a module or bundle it.
// For simplicity in this static site (without bundler), we might want to avoid import/export/require if not using type="module".
// However, modern browsers support type="module". We will assume we add type="module" to script tags.

document.addEventListener('DOMContentLoaded', () => {
    console.log('GMPPayroll application initialized');

    // Update Copyright Year
    const yearSpan = document.querySelector('.copyright-year');
    if (yearSpan) {
        yearSpan.textContent = getCurrentYear();
    }

    // FAQ Interaction
    const faqQuestions = document.querySelectorAll('.faq-question');
    if (faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;

                // Optional: Close others?
                // faqQuestions.forEach(q => {
                //     if (q !== question) q.parentElement.classList.remove('active');
                // });

                item.classList.toggle('active');
            });
        });
    }
});
