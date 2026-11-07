/**
 * Bennieslab App Releases & Marketplace Client Logic
 * Loads releases from backend GET /releases and provides real-time search & filtering.
 */

(function () {
    let allReleases = [];
    let activeCategory = 'all';
    let activePlatform = 'all';
    let searchQuery = '';

    const PLATFORM_ICONS = {
        windows: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801"/></svg>`,
        linux: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.012 0c-3.107 0-5.32 2.505-5.32 5.867 0 1.25.32 2.628.84 3.734-.33.374-.75.787-1.25 1.254-1.373 1.28-2.586 3.12-2.586 5.599 0 1.627.534 3.014 1.48 3.974.96.96 2.307 1.467 3.867 1.467.547 0 1.134-.067 1.76-.2.894.854 2.16 1.307 3.667 1.307 1.493 0 2.747-.44 3.64-1.28.653.133 1.253.2 1.826.2 1.56 0 2.907-.507 3.867-1.467.947-.96 1.48-2.347 1.48-3.974 0-2.48-1.213-4.32-2.586-5.599-.5-.467-.92-.88-1.254-1.254.52-1.106.84-2.484.84-3.734C17.332 2.505 15.12 0 12.012 0z"/></svg>`,
        android: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.412 13.8533 8.077 12 8.077s-3.5902.335-5.1368.8727L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/></svg>`,
        web: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
        macos: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 3.93c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z"/></svg>`
    };

    const PACKAGE_BOX_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;

    async function loadReleases() {
        const grid = document.getElementById('releasesGrid');
        if (grid) {
            grid.innerHTML = '<p style="text-align:center; padding: 32px; color: #6b7280;">Loading releases...</p>';
        }

        try {
            const endpoint = (typeof SERVER_URL !== 'undefined' ? SERVER_URL : 'https://bennieslab-backend.onrender.com') + '/releases';
            const response = await fetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                allReleases = Array.isArray(data) ? data : (data.content || []);
            } else {
                console.warn('GET /releases returned status', response.status);
                allReleases = [];
            }
        } catch (e) {
            console.error('Error fetching releases from backend:', e);
            allReleases = [];
        }

        updateCategoryCounts();
        renderSpotlight();
        renderGrid();
    }

    function parsePlatforms(platformsStr) {
        if (!platformsStr) return ['web'];
        return platformsStr.split(/[,/ ]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
    }

    function renderMarkdownSnippet(text) {
        if (!text) return 'Application release by Benson Musonda.';
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            try {
                // If it starts with a title/heading like "# Title", strip it so it doesn't duplicate the card title
                let clean = text.replace(/^#+\s+[^\n]*\n+/m, '').trim();
                if (!clean) clean = text;
                return marked.parse(clean);
            } catch (e) {
                console.warn('Error parsing markdown snippet:', e);
                return text;
            }
        }
        return text;
    }

    function updateCategoryCounts() {
        const countMap = { all: allReleases.length };
        allReleases.forEach(r => {
            const cat = (r.category || 'App').toLowerCase();
            if (cat.includes('desktop') || cat.includes('tool')) countMap['desktop'] = (countMap['desktop'] || 0) + 1;
            if (cat.includes('web')) countMap['web'] = (countMap['web'] || 0) + 1;
            if (cat.includes('mobile')) countMap['mobile'] = (countMap['mobile'] || 0) + 1;
        });

        document.querySelectorAll('.release-filter-chip[data-category]').forEach(chip => {
            const cat = chip.dataset.category;
            const countSpan = chip.querySelector('.chip-count');
            if (countSpan) {
                countSpan.textContent = countMap[cat] || 0;
            }
        });
    }

    function renderSpotlight() {
        const container = document.getElementById('featuredReleaseSpotlight');
        if (!container) return;

        if (allReleases.length === 0) {
            container.style.display = 'none';
            return;
        }

        const featured = allReleases.find(r => r.pinned) || allReleases[0];
        const platforms = parsePlatforms(featured.platforms);
        const platformTags = platforms.map(p => `
            <span class="platform-tag" title="${p.toUpperCase()}">
                ${PLATFORM_ICONS[p] || ''}
                ${p.charAt(0).toUpperCase() + p.slice(1)}
            </span>
        `).join('');

        const iconHtml = featured.thumbnailUrl
            ? `<img src="${featured.thumbnailUrl}" alt="${featured.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 14px;">`
            : PACKAGE_BOX_ICON;

        const downloadLink = featured.downloadUrl || featured.githubUrl || '#';

        container.dataset.id = featured.id;
        container.style.cursor = 'pointer';
        container.innerHTML = `
            <div class="featured-header-row">
                <div class="featured-badge-group">
                    <span class="featured-badge">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width:13px;height:13px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ${featured.pinned ? 'Pinned Showcase' : 'Latest Release'}
                    </span>
                    <span class="release-version-pill">${featured.version || 'v1.0'}</span>
                    ${featured.status ? `<span class="release-status-pill status-${featured.status.toLowerCase()}">${featured.status}</span>` : ''}
                </div>
            </div>
            <div class="featured-body">
                <div class="featured-top-row">
                    <div class="featured-icon-box">
                        ${iconHtml}
                    </div>
                    <div class="featured-title-wrap">
                        <h2>${featured.name}</h2>
                        <span class="release-category-tag">${featured.category || 'Application'}</span>
                    </div>
                </div>
                <div class="featured-info">
                    <div class="featured-desc">${renderMarkdownSnippet(featured.description)}</div>
                    <div class="release-card-platforms" style="margin-bottom: 14px;">
                        ${platformTags}
                    </div>
                    <div class="featured-actions">
                        ${featured.downloadUrl ? `
                        <a href="${downloadLink}" class="btn-release-primary" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Get App / Download
                        </a>` : ''}
                        ${featured.githubUrl ? `
                        <a href="${featured.githubUrl}" class="btn-release-secondary" target="_blank" rel="noopener noreferrer">
                            GitHub Repository
                        </a>` : ''}
                    </div>
                </div>
            </div>
        `;
        container.style.display = 'flex';

        if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof buildAdminControls === 'function') {
            container.appendChild(buildAdminControls('release', featured.id, () => loadReleases()));
        }
    }

    function renderGrid() {
        const grid = document.getElementById('releasesGrid');
        if (!grid) return;

        const filtered = allReleases.filter(r => {
            // Category filter
            if (activeCategory !== 'all') {
                const cat = (r.category || '').toLowerCase();
                if (activeCategory === 'desktop' && !(cat.includes('desktop') || cat.includes('tool'))) return false;
                if (activeCategory === 'web' && !(cat.includes('web') || cat.includes('app'))) return false;
                if (activeCategory === 'mobile' && !cat.includes('mobile')) return false;
            }

            // Platform filter
            if (activePlatform !== 'all') {
                const platforms = parsePlatforms(r.platforms);
                if (!platforms.includes(activePlatform)) return false;
            }

            // Search query
            if (searchQuery) {
                const text = `${r.name} ${r.description || ''} ${r.category || ''} ${r.version || ''}`.toLowerCase();
                if (!text.includes(searchQuery)) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="releases-empty-state">
                    <div style="width: 48px; height: 48px; margin: 0 auto 12px auto; color: #9ca3af;">
                        ${PACKAGE_BOX_ICON}
                    </div>
                    <h3>No releases found</h3>
                    <p>${allReleases.length === 0 ? 'Official applications and downloadable tools will appear here once released.' : 'Try adjusting your search query or active filter tags.'}</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(app => {
            const platforms = parsePlatforms(app.platforms);
            const statusClass = app.status ? `status-${app.status.toLowerCase()}` : 'status-stable';
            const platformTags = platforms.map(p => `
                <span class="platform-tag" title="${p.toUpperCase()}">
                    ${PLATFORM_ICONS[p] || ''}
                    ${p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
            `).join('');

            const iconHtml = app.thumbnailUrl
                ? `<img src="${app.thumbnailUrl}" alt="${app.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`
                : PACKAGE_BOX_ICON;

            return `
                <div class="release-card" data-id="${app.id}" role="button" tabindex="0" aria-label="View details for ${app.name}">
                    <div class="release-card-body">
                        <div class="release-card-top">
                            <div class="release-card-icon">
                                ${iconHtml}
                            </div>
                            <div class="release-card-meta">
                                <div class="release-card-title-row">
                                    <h3 class="release-card-title">${app.name}</h3>
                                    <span class="release-version-pill">${app.version || 'v1.0'}</span>
                                    ${app.status ? `<span class="release-status-pill ${statusClass}">${app.status}</span>` : ''}
                                </div>
                                <span class="release-category-tag">${app.category || 'Application'}</span>
                            </div>
                        </div>

                        <div class="release-card-desc">${renderMarkdownSnippet(app.description)}</div>
                    </div>

                    <div class="release-card-footer">
                        <div class="release-card-platforms">
                            ${platformTags}
                        </div>

                        <div class="release-card-actions">
                            ${app.downloadUrl ? `
                            <a href="${app.downloadUrl}" class="btn-release-primary" target="_blank" rel="noopener noreferrer">
                                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Download
                            </a>` : ''}
                            ${app.githubUrl ? `
                            <a href="${app.githubUrl}" class="btn-release-secondary" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof buildAdminControls === 'function') {
            document.querySelectorAll('.release-card[data-id]').forEach(card => {
                const id = card.dataset.id;
                card.appendChild(buildAdminControls('release', id, () => loadReleases()));
            });
        }
    }

    function openReleaseModal(app) {
        const modal = document.getElementById('releaseDetailModal');
        if (!modal) return;

        const iconContainer = document.getElementById('modalAppIcon');
        const nameEl = document.getElementById('modalAppName');
        const versionEl = document.getElementById('modalAppVersion');
        const statusEl = document.getElementById('modalAppStatus');
        const categoryEl = document.getElementById('modalAppCategory');
        const platformsEl = document.getElementById('modalAppPlatforms');
        const bodyEl = document.getElementById('modalAppBody');
        const actionsEl = document.getElementById('modalAppActions');

        // Icon
        if (iconContainer) {
            iconContainer.innerHTML = app.thumbnailUrl
                ? `<img src="${app.thumbnailUrl}" alt="${app.name}">`
                : PACKAGE_BOX_ICON;
        }

        // Titles
        if (nameEl) nameEl.textContent = app.name || 'Untitled Application';
        if (versionEl) versionEl.textContent = app.version || 'v1.0.0';

        if (statusEl) {
            if (app.status) {
                statusEl.textContent = app.status;
                statusEl.className = `release-status-pill status-${app.status.toLowerCase()}`;
                statusEl.style.display = 'inline-block';
            } else {
                statusEl.style.display = 'none';
            }
        }

        if (categoryEl) categoryEl.textContent = app.category || 'Application';

        // Platforms
        if (platformsEl) {
            const platforms = parsePlatforms(app.platforms);
            platformsEl.innerHTML = platforms.map(p => `
                <span class="platform-tag" title="${p.toUpperCase()}">
                    ${PLATFORM_ICONS[p] || ''}
                    ${p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
            `).join('');
        }

        // Body Content (Render with marked.js if present)
        if (bodyEl) {
            const desc = app.description || 'No detailed release notes or description provided.';
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
                bodyEl.innerHTML = marked.parse(desc);
            } else {
                bodyEl.innerHTML = `<p>${desc.replace(/\n/g, '<br>')}</p>`;
            }
        }

        // Action Buttons
        if (actionsEl) {
            let actionHtml = '';
            if (app.downloadUrl) {
                actionHtml += `
                    <a href="${app.downloadUrl}" class="btn-release-primary" target="_blank" rel="noopener noreferrer">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Get App / Download
                    </a>
                `;
            }
            if (app.githubUrl) {
                actionHtml += `
                    <a href="${app.githubUrl}" class="btn-release-secondary" target="_blank" rel="noopener noreferrer">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;height:14px;margin-right:4px;">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        GitHub Repository
                    </a>
                `;
            }
            actionsEl.innerHTML = actionHtml;
        }

        modal.showModal();
        document.body.style.overflow = 'hidden';
    }

    function closeReleaseModal() {
        const modal = document.getElementById('releaseDetailModal');
        if (modal && modal.open) {
            modal.close();
        }
        document.body.style.overflow = '';
    }

    function initListeners() {
        const searchInput = document.getElementById('releaseSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                renderGrid();
            });
        }

        // Category filter chips
        const categoryChips = document.querySelectorAll('.filter-chip[data-category], .release-filter-chip[data-category]');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                categoryChips.forEach(c => c.classList.remove('is-active'));
                chip.classList.add('is-active');
                activeCategory = chip.dataset.category;
                renderGrid();
            });
        });

        // Platform filter chips
        const platformChips = document.querySelectorAll('.filter-chip[data-platform], .release-filter-chip[data-platform]');
        platformChips.forEach(chip => {
            chip.addEventListener('click', () => {
                platformChips.forEach(c => c.classList.remove('is-active'));
                chip.classList.add('is-active');
                activePlatform = chip.dataset.platform;
                renderGrid();
            });
        });

        // Card clicks open the detail modal (ignoring clicks on buttons, links, or admin controls)
        const grid = document.getElementById('releasesGrid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.admin-item-controls') || e.target.closest('button')) {
                    return;
                }
                const card = e.target.closest('.release-card');
                if (!card) return;
                const id = card.dataset.id;
                const app = allReleases.find(r => String(r.id) === String(id));
                if (app) openReleaseModal(app);
            });

            grid.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const card = e.target.closest('.release-card');
                    if (card && e.target === card) {
                        e.preventDefault();
                        const id = card.dataset.id;
                        const app = allReleases.find(r => String(r.id) === String(id));
                        if (app) openReleaseModal(app);
                    }
                }
            });
        }

        // Spotlight banner click also opens the detail modal
        const banner = document.getElementById('featuredReleaseSpotlight');
        if (banner) {
            banner.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('.admin-item-controls') || e.target.closest('button')) {
                    return;
                }
                const id = banner.dataset.id;
                const app = allReleases.find(r => String(r.id) === String(id));
                if (app) openReleaseModal(app);
            });
        }

        // Modal close controls
        const modal = document.getElementById('releaseDetailModal');
        const closeBtn = document.getElementById('modalCloseBtn');
        const dismissBtn = document.getElementById('modalDismissBtn');

        if (closeBtn) closeBtn.addEventListener('click', closeReleaseModal);
        if (dismissBtn) dismissBtn.addEventListener('click', closeReleaseModal);

        if (modal) {
            modal.addEventListener('click', (e) => {
                const rect = modal.getBoundingClientRect();
                const inDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
                                  rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
                if (!inDialog) closeReleaseModal();
            });

            modal.addEventListener('cancel', () => {
                document.body.style.overflow = '';
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        initListeners();
        loadReleases();
    });
})();
