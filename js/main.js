/**
 * Main JavaScript Entry Point
 */

import { getCurrentYear } from './utils.js';

// Since we are using modules in utils, we need to treat this as a module or bundle it.
// For simplicity in this static site (without bundler), we might want to avoid import/export/require if not using type="module".
// However, modern browsers support type="module". We will assume we add type="module" to script tags.

document.addEventListener('DOMContentLoaded', () => {
    console.log('GMP Payroll application initialized');

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
    // Video Player Logic
    const videoWrapper = document.querySelector('.video-wrapper');
    const video = document.getElementById('hero-video');
    const playBtn = document.getElementById('hero-play-btn');

    if (videoWrapper && video && playBtn) {
        const togglePlay = () => {
            if (video.paused) {
                video.play();
                videoWrapper.classList.add('playing');
                video.setAttribute('controls', 'true');
            } else {
                video.pause();
                videoWrapper.classList.remove('playing');
                video.removeAttribute('controls');
            }
        };

        playBtn.addEventListener('click', togglePlay);
        video.addEventListener('click', (e) => {
            // Only toggle if controls aren't showing (initial state) or if user clicked video area not controls
            // But since controls overlay, usually browser handles click if controls are visible.
            // A simple toggle here might interfere with native controls if they are active.
            // Let's only handle play if not playing.
            if (video.paused) {
                togglePlay();
            }
        });

        video.addEventListener('pause', () => {
            videoWrapper.classList.remove('playing');
            video.removeAttribute('controls');
        });

        video.addEventListener('play', () => {
            videoWrapper.classList.add('playing');
            video.setAttribute('controls', 'true');
        });
    }
});
