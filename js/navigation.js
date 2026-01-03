/**
 * Navigation functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    // Since the menu is currently hidden on mobile by CSS (d-none d-lg-flex), 
    // we need a mobile menu container if we want to toggle it.
    // The current HTML structure in index.html had the nav inside .desktop-nav which is hidden on mobile.
    // We will assume a mobile menu overlay will be added or we toggle a class on the body/header.

    // Sticky Header Effect
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
            header.style.boxShadow = 'var(--shadow-md)';
        } else {
            header.classList.remove('scrolled');
            header.style.boxShadow = 'none';
        }
    };

    window.addEventListener('scroll', handleScroll);

    // Mobile Menu Toggle
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            // For this phase, we'll simple create a mobile menu if it doesn't exist
            let mobileMenu = document.querySelector('.mobile-menu-overlay');

            if (!mobileMenu) {
                createMobileMenu();
                mobileMenu = document.querySelector('.mobile-menu-overlay');
            }

            const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
            mobileToggle.setAttribute('aria-expanded', !isExpanded);
            mobileMenu.classList.toggle('active');
            document.body.classList.toggle('no-scroll'); // Prevent background scrolling
        });
    }

    // Mark active link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath.split('/').pop() || (currentPath === '/' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
            link.style.color = 'var(--color-primary)';
        }
    });
});



function getRootPath() {
    const logo = document.querySelector('.logo');
    if (logo) {
        const href = logo.getAttribute('href');
        if (href.indexOf('index.html') !== -1) {
            return href.replace('index.html', '');
        }
        return href;
    }
    return '';
}

function createMobileMenu() {
    const root = getRootPath();

    // Updated for Executive Persona - "Services" removed, "Expertise" added
    const navContent = `
        <div class="mobile-menu-overlay">
             <div style="display: flex; justify-content: flex-end;">
                <button class="mobile-menu-close" style="background: none; border: none; cursor: pointer; padding: 0;">
                    <i data-lucide="x" style="width: 24px; height: 24px; color: var(--color-gray-900);"></i>
                </button>
            </div>
            
            <a href="${root}index.html" class="mobile-nav-link">Home</a>
            <a href="${root}about.html" class="mobile-nav-link">About</a>
            <a href="${root}expertise.html" class="mobile-nav-link">Expertise</a>
            <a href="${root}case-studies.html" class="mobile-nav-link">Portfolio</a>
            <a href="${root}experience.html" class="mobile-nav-link">Journey</a>
            <a href="${root}blog/posts/payroll-automation-google-sheets-apps-script.html" class="mobile-nav-link">Automation</a>
            <a href="${root}blog.html" class="mobile-nav-link">Insights</a>
            <a href="${root}contact.html" class="btn btn-primary" style="text-align: center; justify-content: center; margin-top: 1rem;">Connect</a>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', navContent);

    if (window.lucide) {
        window.lucide.createIcons();
    }

    const overlay = document.querySelector('.mobile-menu-overlay');
    const closeBtn = document.querySelector('.mobile-menu-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            document.body.classList.remove('no-scroll');
            const toggle = document.querySelector('.mobile-menu-toggle');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
        });
    }
}


