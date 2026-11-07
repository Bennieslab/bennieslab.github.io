/**
 * Bennieslab Side Navigation & Exploration Drawer Component
 * Automatically mounts floating dock (desktop) and slide-out exploration drawer (mobile).
 */
(function () {
    function initSideNav() {
        if (document.querySelector('.side-nav-dock')) {
            // Already mounted
            return;
        }

        const currentPath = window.location.pathname.toLowerCase();
        const isModels = currentPath.endsWith('models.html') || currentPath.endsWith('model-detail.html');
        const isReleases = currentPath.endsWith('releases.html');

        // Create Container Fragment
        const container = document.createElement('div');
        container.className = 'side-nav-component';
        container.innerHTML = `
            <!-- Desktop Floating Dock -->
            <aside class="side-nav-dock" aria-label="Secondary navigation">
                <div class="side-nav-inner">
                    <a href="models.html" class="side-nav-link ${isModels ? 'active-link' : ''}" aria-label="3D Models">
                        <svg class="side-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        <span class="side-nav-tooltip">3D Models</span>
                    </a>
                    <a href="releases.html" class="side-nav-link ${isReleases ? 'active-link' : ''}" aria-label="App Releases">
                        <svg class="side-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        <span class="side-nav-tooltip">App Releases</span>
                    </a>
                </div>
            </aside>

            <!-- Mobile Explore Trigger Pill -->
            <button class="mobile-side-nav-trigger" type="button" aria-label="Explore more content" aria-expanded="false" aria-controls="mobileSideNavDrawer">
                <svg class="trigger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="1.5"></circle>
                    <circle cx="19" cy="12" r="1.5"></circle>
                    <circle cx="5" cy="12" r="1.5"></circle>
                </svg>
                <span>Explore</span>
            </button>

            <!-- Mobile Drawer Backdrop -->
            <div class="mobile-side-nav-backdrop" id="mobileSideNavBackdrop" aria-hidden="true"></div>

            <!-- Mobile Slide-out Drawer -->
            <div class="mobile-side-nav-drawer" id="mobileSideNavDrawer" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Explore Bennieslab">
                <div class="mobile-side-nav-header">
                    <span class="mobile-side-nav-title">Explore</span>
                    <button class="mobile-side-nav-close" type="button" aria-label="Close menu">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <nav class="mobile-side-nav-links">
                    <a href="models.html" class="mobile-side-nav-link ${isModels ? 'active-link' : ''}">
                        <svg class="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        <span class="drawer-link-title">3D Models</span>
                    </a>
                    <a href="releases.html" class="mobile-side-nav-link ${isReleases ? 'active-link' : ''}">
                        <svg class="drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        <span class="drawer-link-title">App Releases</span>
                    </a>
                </nav>
            </div>
        `;

        document.body.appendChild(container);

        const trigger = container.querySelector('.mobile-side-nav-trigger');
        const backdrop = container.querySelector('.mobile-side-nav-backdrop');
        const drawer = container.querySelector('.mobile-side-nav-drawer');
        const closeBtn = container.querySelector('.mobile-side-nav-close');

        function openDrawer() {
            drawer.classList.add('is-open');
            backdrop.classList.add('is-open');
            drawer.setAttribute('aria-hidden', 'false');
            backdrop.setAttribute('aria-hidden', 'false');
            trigger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.classList.remove('is-open');
            backdrop.classList.remove('is-open');
            drawer.setAttribute('aria-hidden', 'true');
            backdrop.setAttribute('aria-hidden', 'true');
            trigger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }

        if (trigger) trigger.addEventListener('click', openDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (backdrop) backdrop.addEventListener('click', closeDrawer);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
                closeDrawer();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSideNav);
    } else {
        initSideNav();
    }
})();
