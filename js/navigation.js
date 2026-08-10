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

    // Desktop "Work" dropdown: hover is handled in CSS; this adds click and
    // keyboard operation so it is usable without a mouse.
    document.querySelectorAll('.has-dropdown').forEach(group => {
        const toggle = group.querySelector('.nav-dropdown-toggle');
        const menu = group.querySelector('.dropdown-menu');
        if (!toggle || !menu) return;

        const items = () => Array.from(menu.querySelectorAll('.dropdown-link'));
        const open = (focusFirst) => {
            group.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
            if (focusFirst && items()[0]) items()[0].focus();
        };
        const close = (returnFocus) => {
            group.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            if (returnFocus) toggle.focus();
        };

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            group.classList.contains('is-open') ? close(false) : open(false);
        });

        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open(true);
            }
        });

        menu.addEventListener('keydown', (e) => {
            const list = items();
            const i = list.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                (list[i + 1] || list[0]).focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (i <= 0) close(true); else list[i - 1].focus();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                close(true);
            }
        });

        document.addEventListener('click', (e) => {
            if (!group.contains(e.target)) close(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && group.classList.contains('is-open')) close(true);
        });
    });

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
            <span class="mobile-nav-group-label">Work</span>
            <a href="${root}case-studies.html" class="mobile-nav-link is-sub">Portfolio</a>
            <a href="${root}experience.html" class="mobile-nav-link is-sub">Journey</a>
            <a href="${root}step-into-my-world/" class="mobile-nav-link is-sub">Step Into</a>
            <a href="${root}blog/posts/payroll-automation-google-sheets-apps-script.html" class="mobile-nav-link is-sub">Automation</a>
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


