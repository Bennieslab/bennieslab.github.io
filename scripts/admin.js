// SERVER_URL, formatFileSize and the dialog/toast helpers come from the
// shared modules loaded before this script (config.js, utils/*).
let easyMDE;

document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('jwt_token');
    if (!token || !isSessionValid()) {
        redirectToLogin();
        return;
    }

    const mainContentArea = document.querySelector('.admin-main');
    const creationCenterContent = document.getElementById('creation-center-content');
    const profileEditorContent = document.getElementById('profile-editor-content');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const mediaLibraryContent = document.getElementById('media-library-content');
    const draftsContent = document.getElementById('drafts-content');
    const analyticsContent = document.getElementById('analytics-content');

    const urlParams = new URLSearchParams(window.location.search);
    const deepLinkType = urlParams.get('edit');
    const deepLinkId = urlParams.get('id');

    if (deepLinkType && deepLinkId) {
        loadItemForDeepEdit(deepLinkType, deepLinkId, token);
    } else {
        showTabContent('creation-center');
    }

    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            showTabContent(tabId);
            updateActiveTab(tab);
            if (tabId === 'media-library') {
                loadMediaLibrary();
            }
        });
    });

    document.querySelectorAll('.create-option').forEach(option => {
        option.addEventListener('click', () => {
            const type = option.dataset.type;
            loadMarkdownForm(type);
        });
    });

    document.querySelectorAll('.add-option').forEach(option => {
        option.addEventListener('click', () => {
            const type = option.dataset.type;
            loadSimpleForm(type);
        });
    });

    document.querySelectorAll('.manage-option').forEach(option => {
        option.addEventListener('click', () => {
            const type = option.dataset.type;
            loadManageContent(type);
        });
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = 'login.html';
    });

    const mediaRefreshBtn = document.getElementById('mediaRefreshBtn');
    if (mediaRefreshBtn) {
        mediaRefreshBtn.addEventListener('click', () => loadMediaLibrary());
    }

    function showTabContent(tabId) {
        const sections = {
            'creation-center': creationCenterContent,
            'profile-editor': profileEditorContent,
            'media-library': mediaLibraryContent,
            'drafts': draftsContent,
            'analytics': analyticsContent
        };

        Object.entries(sections).forEach(([id, el]) => {
            if (el) el.style.display = (id === tabId) ? 'block' : 'none';
        });
    }

    function updateActiveTab(activeTab) {
        adminTabs.forEach(tab => tab.classList.remove('active-tab'));
        activeTab.classList.add('active-tab');
    }

    /**
     * Maps a content type ('project', 'blog', 'skill', 'model') to its
     * REST endpoint segment. Centralized so adding a new type only means
     * adding one line here instead of updating five separate ternaries.
     */
    function getTypeEndpoint(type) {
        switch (type) {
            case 'blog': return 'blog';
            case 'project': return 'projects';
            case 'model': return 'models';
            case 'skill': return 'skills';
            case 'release': return 'releases';
            default: return 'skills';
        }
    }

    async function loadMediaLibrary() {
        const body = document.getElementById('mediaLibraryBody');
        const summary = document.getElementById('mediaLibrarySummary');
        if (!body) return;

        body.innerHTML = '';
        if (summary) summary.textContent = 'Loading…';

        const thumbnailsSection = buildMediaSection('Thumbnails', 'thumbnails', 'image');
        const modelsSection = buildMediaSection('3D Models', 'models', 'model');

        body.appendChild(thumbnailsSection.element);
        body.appendChild(modelsSection.element);

        await Promise.all([thumbnailsSection.loadMore(), modelsSection.loadMore()]);

        if (thumbnailsSection.isEmpty() && modelsSection.isEmpty()) {
            const emptyMsg = document.createElement('p');
            emptyMsg.className = 'coming-soon';
            emptyMsg.textContent = 'No files uploaded yet.';
            body.appendChild(emptyMsg);
        }

        if (summary) summary.textContent = '';
    }

    /**
     * Builds one category section (Thumbnails or 3D Models) that fetches
     * its own pages from GET /media?category=... independently — each
     * section tracks its own continuationToken, so "Show more" on one
     * never affects the other's position.
     */
    function buildMediaSection(title, category, kind) {
        const INITIAL_LIMIT = 24;
        const NEXT_LIMIT = 8;

        let continuationToken = null;
        let hasMore = true;
        let loadedCount = 0;
        let firstLoad = true;

        const section = document.createElement('div');
        section.className = 'media-section';
        section.style.display = 'none'; // revealed once we know it has at least one file

        const heading = document.createElement('h2');
        heading.className = 'media-section-heading';
        heading.textContent = title;
        section.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'media-grid';
        section.appendChild(grid);

        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.type = 'button';
        loadMoreBtn.className = 'media-load-more-btn';
        loadMoreBtn.textContent = 'Show more';
        section.appendChild(loadMoreBtn);

        async function loadMore() {
            const limit = firstLoad ? INITIAL_LIMIT : NEXT_LIMIT;
            firstLoad = false;
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Loading…';

            const currentToken = localStorage.getItem('jwt_token');
            const params = new URLSearchParams({ category, limit: String(limit) });
            if (continuationToken) params.set('continuationToken', continuationToken);

            try {
                const response = await fetch(`${SERVER_URL}/media?${params.toString()}`, {
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });

                if (response.status === 401 || response.status === 403) {
                    redirectToLogin();
                    return;
                }

                if (!response.ok) throw new Error(`Failed to load ${category}: ${response.status}`);

                const page = await response.json();
                page.files.forEach(file => grid.appendChild(buildMediaCard(file, kind)));

                loadedCount += page.files.length;
                continuationToken = page.nextContinuationToken;
                hasMore = page.hasMore;

                heading.textContent = `${title} (${loadedCount}${hasMore ? '+' : ''})`;
                if (loadedCount > 0) section.style.display = '';

                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Show more';
                loadMoreBtn.style.display = hasMore ? 'block' : 'none';
            } catch (error) {
                console.error(`Error loading ${category}:`, error);
                loadMoreBtn.textContent = 'Failed to load — try again';
                loadMoreBtn.disabled = false;
            }
        }

        loadMoreBtn.addEventListener('click', () => loadMore());

        return {
            element: section,
            loadMore,
            isEmpty: () => loadedCount === 0
        };
    }

    function buildMediaCard(file, kind) {
        const card = document.createElement('div');
        card.className = 'media-card';

        const preview = document.createElement('div');
        preview.className = 'media-card-preview';

        if (kind === 'image') {
            const img = document.createElement('img');
            img.src = file.url;
            img.alt = file.key;
            img.loading = 'lazy';
            preview.appendChild(img);
        } else if (kind === 'model') {
            preview.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
        } else {
            preview.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
        }

        const meta = document.createElement('div');
        meta.className = 'media-card-meta';

        const nameEl = document.createElement('div');
        nameEl.className = 'media-card-name';
        nameEl.title = file.key;
        nameEl.textContent = file.key.split('/').pop();
        meta.appendChild(nameEl);

        const sizeEl = document.createElement('div');
        sizeEl.className = 'media-card-size';
        sizeEl.textContent = formatFileSize(file.sizeBytes || 0);
        meta.appendChild(sizeEl);

        const actions = document.createElement('div');
        actions.className = 'media-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'media-card-btn';
        copyBtn.textContent = 'Copy link';
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(file.url);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1500);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });
        actions.appendChild(copyBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'media-card-btn media-card-btn-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteMediaFile(file.key, card));
        actions.appendChild(deleteBtn);

        meta.appendChild(actions);

        card.appendChild(preview);
        card.appendChild(meta);
        return card;
    }

    async function deleteMediaFile(key, cardElement) {
        const confirmed = await showConfirmDialog({
            title: 'Delete this file?',
            message: `Delete this file permanently?\n\n${key}\n\nThis cannot be undone. If this file is still used as a thumbnail or 3D model on a live project, post, skill, or model, deleting it will break that item's image/model — this tool has no way to check that for you.`,
            confirmLabel: 'Delete',
            danger: true
        });
        if (!confirmed) return;

        const currentToken = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/media?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            cardElement.remove();
            showToast('File deleted.', 'success');
        } catch (error) {
            console.error('Error deleting file:', error);
            showToast('Could not delete this file.', 'error');
        }
    }

    async function loadItemForDeepEdit(type, id, token) {
        try {
            const endpoint = `/${getTypeEndpoint(type)}/${id}`;
            const response = await fetch(`${SERVER_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch item for editing');

            const item = await response.json();
            loadMarkdownForm(type, item, id);
        } catch (error) {
            console.error('Error loading item from deep link:', error);
            showAlertDialog({
                title: 'Could not load item',
                message: 'Could not load the requested item for editing.'
            });
        }
    }

    function loadMarkdownForm(type, itemData = null, itemId = null) {
        const isEditMode = itemData !== null;
        const headerText = isEditMode
            ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`
            : `Create ${type.charAt(0).toUpperCase() + type.slice(1)}`;

        let titlePlaceholder = "";
        let contentPlaceholder = "";

        switch (type) {
            case 'project':
                titlePlaceholder = "Project Name";
                contentPlaceholder = "Project Content (Markdown)";
                break;
            case 'blog':
                titlePlaceholder = "Post Title";
                contentPlaceholder = "Post Content (Markdown)";
                break;
            case 'skill':
                titlePlaceholder = "Skill Name";
                contentPlaceholder = "Skill Description (Markdown)";
                break;
            case 'model':
                titlePlaceholder = "Model Name";
                contentPlaceholder = "Model Description (Markdown)";
                break;
            case 'release':
                titlePlaceholder = "App Name";
                contentPlaceholder = "App Description / Release Notes (Markdown)";
                break;
        }

        const formHtml = `
            <div class="creation-center-container">
                <h1 class="tab-header">${headerText}</h1>
                <form id="creation-form">
                    <input type="text" id="content-title" class="obsidian-style-input" placeholder="${titlePlaceholder}" required value="${isEditMode ? (itemData.title || itemData.name) : ''}">
                    <textarea id="content-body" placeholder="${contentPlaceholder}" required>${isEditMode ? (itemData.content || itemData.description) : ''}</textarea>
                    <div class="form-actions">
                        <button type="button" id="save-content-button" class="submit-button">${isEditMode ? 'Update' : 'Save'}</button>
                        <button type="button" class="cancel-button">Cancel</button>
                    </div>
                </form>
            </div>
            <dialog id="save-modal" class="modal">
                <div class="modal-content">
                    <h2>${isEditMode ? 'Update Details' : 'Add Details'}</h2>
                    ${type === 'model' ? `
                    <label for="model-upload" class="file-label">
                        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; margin-right: 8px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        <span id="model-file-name-display">${isEditMode && itemData.modelUrl ? 'Model file already exists' : 'Choose 3D Model File (.glb/.gltf)'}</span>
                        <input type="file" id="model-upload" accept=".glb,.gltf" style="display:none;">
                    </label>
                    ` : ''}
                    <label for="thumbnail-upload" class="file-label">
                        <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px; margin-right: 8px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span id="file-name-display">${isEditMode ? (itemData.thumbnailUrl ? 'Thumbnail already exists' : 'Choose New Thumbnail') : 'Choose Thumbnail Image'}</span>
                        <input type="file" id="thumbnail-upload" accept="image/*" style="display:none;">
                    </label>
                    <div class="thumbnail-divider">or</div>
                    <input type="url" id="thumbnail-url-input" placeholder="Paste an image URL instead" class="modal-input">
                    ${type === 'release' ? `
                    <div class="modal-field-group">
                        <label class="modal-field-label">Category</label>
                        <select id="release-category-select" class="modal-input">
                            <option value="Desktop Tools" ${isEditMode && itemData.category === 'Desktop Tools' ? 'selected' : ''}>Desktop Tools</option>
                            <option value="Web Apps" ${isEditMode && itemData.category === 'Web Apps' ? 'selected' : ''}>Web Apps</option>
                            <option value="Mobile" ${isEditMode && (itemData.category === 'Mobile' || itemData.category === 'Mobile Apps') ? 'selected' : ''}>Mobile Apps</option>
                            <option value="Developer Utilities" ${isEditMode && itemData.category === 'Developer Utilities' ? 'selected' : ''}>Developer Utilities</option>
                            <option value="CLI Tools" ${isEditMode && itemData.category === 'CLI Tools' ? 'selected' : ''}>CLI Tools</option>
                            <option value="custom" ${isEditMode && itemData.category && !['Desktop Tools', 'Web Apps', 'Mobile', 'Mobile Apps', 'Developer Utilities', 'CLI Tools'].includes(itemData.category) ? 'selected' : ''}>Custom...</option>
                        </select>
                        <input type="text" id="category-input" placeholder="Custom category name" class="modal-input" style="${isEditMode && itemData.category && !['Desktop Tools', 'Web Apps', 'Mobile', 'Mobile Apps', 'Developer Utilities', 'CLI Tools'].includes(itemData.category) ? 'display:block; margin-top:6px;' : 'display:none; margin-top:6px;'}" value="${isEditMode ? (itemData.category || 'Desktop Tools') : 'Desktop Tools'}">
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <div class="modal-field-group" style="flex: 1;">
                            <label class="modal-field-label">Version</label>
                            <input type="text" id="release-version-input" placeholder="e.g. v2.0.1" class="modal-input" required value="${isEditMode ? (itemData.version || 'v1.0.0') : 'v1.0.0'}">
                        </div>
                        <div class="modal-field-group" style="flex: 1;">
                            <label class="modal-field-label">Status</label>
                            <select id="release-status-input" class="modal-input">
                                <option value="Stable" ${isEditMode && itemData.status === 'Stable' ? 'selected' : ''}>Stable</option>
                                <option value="Beta" ${isEditMode && itemData.status === 'Beta' ? 'selected' : ''}>Beta</option>
                                <option value="Preview" ${isEditMode && itemData.status === 'Preview' ? 'selected' : ''}>Preview / Alpha</option>
                                <option value="Archived" ${isEditMode && itemData.status === 'Archived' ? 'selected' : ''}>Archived</option>
                            </select>
                        </div>
                    </div>

                    <div class="modal-field-group">
                        <label class="modal-field-label">Supported Platforms (Click to select)</label>
                        <div class="platform-chips-picker" id="platform-chips-picker">
                            <button type="button" class="platform-chip-toggle" data-platform="Windows">
                                <svg class="platform-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801"/></svg>
                                <span>Windows</span>
                            </button>
                            <button type="button" class="platform-chip-toggle" data-platform="Linux">
                                <svg class="platform-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.012 0c-3.107 0-5.32 2.505-5.32 5.867 0 1.25.32 2.628.84 3.734-.33.374-.75.787-1.25 1.254-1.373 1.28-2.586 3.12-2.586 5.599 0 1.627.534 3.014 1.48 3.974.96.96 2.307 1.467 3.867 1.467.547 0 1.134-.067 1.76-.2.894.854 2.16 1.307 3.667 1.307 1.493 0 2.747-.44 3.64-1.28.653.133 1.253.2 1.826.2 1.56 0 2.907-.507 3.867-1.467.947-.96 1.48-2.347 1.48-3.974 0-2.48-1.213-4.32-2.586-5.599-.5-.467-.92-.88-1.254-1.254.52-1.106.84-2.484.84-3.734C17.332 2.505 15.12 0 12.012 0z"/></svg>
                                <span>Linux</span>
                            </button>
                            <button type="button" class="platform-chip-toggle" data-platform="Android">
                                <svg class="platform-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.412 13.8533 8.077 12 8.077s-3.5902.335-5.1368.8727L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396"/></svg>
                                <span>Android</span>
                            </button>
                            <button type="button" class="platform-chip-toggle" data-platform="Web">
                                <svg class="platform-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                <span>Web</span>
                            </button>
                            <button type="button" class="platform-chip-toggle" data-platform="macOS">
                                <svg class="platform-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 3.93c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z"/></svg>
                                <span>macOS</span>
                            </button>
                        </div>
                        <input type="hidden" id="release-platforms-input" value="${isEditMode ? (itemData.platforms || 'Windows') : 'Windows'}">
                    </div>

                    <div class="modal-field-group">
                        <label class="modal-field-label">Distribution Links</label>
                        <input type="url" id="release-download-url-input" placeholder="Download link (GitHub Release .exe/.apk/.zip or web app)" class="modal-input" value="${isEditMode ? (itemData.downloadUrl || '') : ''}">
                        <input type="url" id="release-github-url-input" placeholder="GitHub repository URL (optional)" class="modal-input" style="margin-top: 6px;" value="${isEditMode ? (itemData.githubUrl || '') : ''}">
                    </div>
                    ` : `
                    <input type="text" id="category-input" placeholder="Category" class="modal-input" required value="${isEditMode ? itemData.category : ''}">
                    ${type === 'project' ? `
                    <input type="url" id="github-url-input" placeholder="GitHub URL" class="modal-input" value="${isEditMode ? (itemData.githubUrl || '') : ''}">
                    <input type="url" id="live-url-input" placeholder="Live Demo / Release URL (optional)" class="modal-input" value="${isEditMode ? (itemData.liveUrl || '') : ''}">` : ''}
                    `}
                    <div class="modal-sorting-controls" style="margin: 8px 0; text-align: left; display: flex; flex-direction: column; gap: 8px;">
                        <label class="modal-checkbox-card">
                            <input type="checkbox" id="pinned-input" ${isEditMode && itemData.pinned ? 'checked' : ''}>
                            <div class="checkbox-card-info">
                                <span class="checkbox-card-title">${type === 'release' ? 'Feature in Spotlight Showcase' : 'Pin item to top of list'}</span>
                                <span class="checkbox-card-desc">${type === 'release' ? 'Showcase this app in the prominent top banner on releases.html' : 'Display this item first on list pages'}</span>
                            </div>
                        </label>
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px;">
                            <label for="sort-order-input" class="modal-field-label" style="margin: 0;">Sort Order (lower is first):</label>
                            <input type="number" id="sort-order-input" placeholder="0" class="modal-input" style="width: 80px; text-align: center;" value="${isEditMode ? (itemData.sortOrder !== undefined ? itemData.sortOrder : 0) : 0}">
                        </div>
                    </div>
                    ${type !== 'skill' && type !== 'release' ? `
                    <div class="skills-picker-container">
                        <label class="modal-label">Attach Skills</label>
                        <div class="skills-checkbox-list" id="skills-checkbox-list">
                            <p class="skills-loading">Loading skills...</p>
                        </div>
                    </div>
                    ` : ''}
                    <div class="modal-actions">
                        <button id="confirm-save" class="modal-button primary">${isEditMode ? 'Confirm Update' : 'Confirm'}</button>
                        <button id="cancel-modal" class="modal-button secondary">Cancel</button>
                    </div>
                </div>
            </dialog>
        `;
        mainContentArea.innerHTML = formHtml;

        initMarkdownEditorAndModal(type, itemId, itemData);

        if (type !== 'skill' && type !== 'release') {
            populateSkillsPicker(itemData);
        }
    }

    async function populateSkillsPicker(itemData) {
        const listContainer = document.getElementById('skills-checkbox-list');
        if (!listContainer) return;

        const token = localStorage.getItem('jwt_token');
        const existingSkillIds = new Set(
            (itemData && itemData.skills ? itemData.skills : []).map(skill => skill.id)
        );

        try {
            const response = await fetch(`${SERVER_URL}/skills`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Failed to fetch skills: ${response.status}`);

            const skills = await response.json();

            if (skills.length === 0) {
                listContainer.innerHTML = '<p class="skills-empty">No skills created yet.</p>';
                return;
            }

            listContainer.innerHTML = skills.map(skill => `
            <label class="skill-checkbox-label">
                <input type="checkbox" name="skill-id" value="${skill.id}" ${existingSkillIds.has(skill.id) ? 'checked' : ''}>
                ${skill.name}
            </label>
        `).join('');
        } catch (error) {
            console.error('Error loading skills picker:', error);
            listContainer.innerHTML = '<p class="skills-error">Could not load skills.</p>';
        }
    }

    function initMarkdownEditorAndModal(type, itemId, itemData = null) {
        if (easyMDE) easyMDE.toTextArea();
        easyMDE = new EasyMDE({
            element: document.getElementById('content-body'),
            spellChecker: false,
            forceSync: true,
        });

        const saveButton = document.getElementById('save-content-button');
        const cancelButton = document.querySelector('.cancel-button');
        const saveModal = document.getElementById('save-modal');
        const confirmSaveButton = document.getElementById('confirm-save');
        const cancelModalButton = document.getElementById('cancel-modal');
        const thumbnailUploadInput = document.getElementById('thumbnail-upload');
        const fileNameDisplay = document.getElementById('file-name-display');

        // Release Category Selector Wiring
        const catSelect = document.getElementById('release-category-select');
        const catInput = document.getElementById('category-input');
        if (catSelect && catInput) {
            catSelect.addEventListener('change', () => {
                if (catSelect.value === 'custom') {
                    catInput.style.display = 'block';
                    catInput.value = '';
                    catInput.focus();
                } else {
                    catInput.style.display = 'none';
                    catInput.value = catSelect.value;
                }
            });
        }

        // Release Platform Chips Wiring
        const platformPicker = document.getElementById('platform-chips-picker');
        const platformsInput = document.getElementById('release-platforms-input');
        if (platformPicker && platformsInput) {
            const currentSelected = (platformsInput.value || '')
                .split(/[,/ ]+/)
                .map(s => s.trim().toLowerCase())
                .filter(Boolean);

            const toggles = platformPicker.querySelectorAll('.platform-chip-toggle');
            toggles.forEach(btn => {
                const platName = btn.dataset.platform.toLowerCase();
                if (currentSelected.includes(platName)) {
                    btn.classList.add('is-selected');
                }

                btn.addEventListener('click', () => {
                    btn.classList.toggle('is-selected');
                    const selected = Array.from(toggles)
                        .filter(b => b.classList.contains('is-selected'))
                        .map(b => b.dataset.platform);
                    platformsInput.value = selected.join(', ');
                });
            });
        }


        const thumbnailUrlInput = document.getElementById('thumbnail-url-input');
        const modelUploadInput = document.getElementById('model-upload');
        const modelFileNameDisplay = document.getElementById('model-file-name-display');

        if (modelUploadInput && modelFileNameDisplay) {
            modelUploadInput.addEventListener('change', (e) => {
                modelFileNameDisplay.textContent = e.target.files[0]
                    ? e.target.files[0].name
                    : "Choose 3D Model File (.glb/.gltf)";
            });
        }

        thumbnailUploadInput.addEventListener('change', (e) => {
            fileNameDisplay.textContent = e.target.files[0] ? e.target.files[0].name : "Choose Thumbnail Image";
            if (e.target.files[0]) {
                thumbnailUrlInput.value = '';
            }
        });

        thumbnailUrlInput.addEventListener('input', () => {
            if (thumbnailUrlInput.value.trim()) {
                thumbnailUploadInput.value = '';
                fileNameDisplay.textContent = "Choose Thumbnail Image";
            }
        });

        saveButton.addEventListener('click', () => {
            const content = easyMDE.value();
            const title = document.getElementById('content-title').value;
            if (title.trim() === "" || content.trim() === "") {
                showAlertDialog({
                    title: 'Missing content',
                    message: 'Title and content cannot be empty.'
                });
                return;
            }
            saveModal.showModal();
        });

        cancelButton.addEventListener('click', () => location.reload());
        cancelModalButton.addEventListener('click', () => saveModal.close());

        confirmSaveButton.addEventListener('click', () => handleMarkdownSave(type, itemId, easyMDE));
    }

    async function handleMarkdownSave(type, itemId, mde) {
        const titleInput = document.getElementById('content-title').value;
        const contentBody = mde.value();
        const categoryInput = document.getElementById('category-input').value;
        const thumbnailUploadInput = document.getElementById('thumbnail-upload');
        const file = thumbnailUploadInput.files[0];
        const modelUploadInput = document.getElementById('model-upload');
        const modelFile = modelUploadInput ? modelUploadInput.files[0] : null;
        const token = localStorage.getItem('jwt_token');

        if (!token || !isSessionValid()) {
            redirectToLogin('You are not logged in. Redirecting to login page.');
            return;
        }

        if (categoryInput.trim() === "") {
            showAlertDialog({
                title: 'Missing category',
                message: 'Category cannot be empty.'
            });
            return;
        }

        if (type === 'model' && !itemId && !modelFile) {
            showAlertDialog({
                title: 'Missing model file',
                message: 'Please choose a 3D model file (.glb or .gltf).'
            });
            return;
        }

        const thumbnailUrlInput = document.getElementById('thumbnail-url-input');
        const pastedUrl = thumbnailUrlInput ? thumbnailUrlInput.value.trim() : '';
        const confirmSaveButton = document.getElementById('confirm-save');
        const saveLoader = window.showActionLoader
            ? showActionLoader(confirmSaveButton, { placement: 'inside', variant: 'button' })
            : null;

        let thumbnailUrl = null;
        if (pastedUrl) {
            thumbnailUrl = pastedUrl;
        } else if (file) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch(`${SERVER_URL}/upload/thumbnail`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (response.status === 401 || response.status === 403) {
                    redirectToLogin();
                    return;
                }

                if (!response.ok) throw new Error(`File upload failed: ${response.status}`);
                const result = await response.json();
                thumbnailUrl = result.fileUrl;
            } catch (error) {
                console.error('Upload Error:', error);
                showToast('Error uploading thumbnail. Please try again.', 'error');
                if (saveLoader) saveLoader.hide();
                return;
            }
        }

        let modelFileKey = null;
        if (type === 'model' && modelFile) {
            try {
                const modelFormData = new FormData();
                modelFormData.append('file', modelFile);
                const modelResponse = await fetch(`${SERVER_URL}/upload/model`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: modelFormData,
                });

                if (modelResponse.status === 401 || modelResponse.status === 403) {
                    redirectToLogin();
                    return;
                }

                if (!modelResponse.ok) throw new Error(`Model upload failed: ${modelResponse.status}`);
                const modelResult = await modelResponse.json();
                modelFileKey = modelResult.fileUrl;
            } catch (error) {
                console.error('Model Upload Error:', error);
                showToast('Error uploading 3D model file. Please try again.', 'error');
                if (saveLoader) saveLoader.hide();
                return;
            }
        }

        const payload = {
            category: categoryInput,
            pinned: document.getElementById('pinned-input').checked,
            sortOrder: parseInt(document.getElementById('sort-order-input').value, 10) || 0
        };

        if (thumbnailUrl) {
            payload.thumbnailUrl = thumbnailUrl;
        }

        if (modelFileKey) {
            payload.modelFileKey = modelFileKey;
        }

        if (type === 'project' || type === 'skill' || type === 'model' || type === 'release') {
            payload.name = titleInput;
            payload.description = contentBody;
        } else if (type === 'blog') {
            payload.title = titleInput;
            payload.content = contentBody;
        }

        if (type === 'project') {
            const githubUrlInput = document.getElementById('github-url-input');
            payload.githubUrl = githubUrlInput ? githubUrlInput.value.trim() : '';
            const liveUrlInput = document.getElementById('live-url-input');
            payload.liveUrl = liveUrlInput ? liveUrlInput.value.trim() : '';
        } else if (type === 'release') {
            const versionInput = document.getElementById('release-version-input');
            payload.version = versionInput ? versionInput.value.trim() : 'v1.0.0';
            const statusInput = document.getElementById('release-status-input');
            payload.status = statusInput ? statusInput.value.trim() : 'Stable';
            const downloadUrlInput = document.getElementById('release-download-url-input');
            payload.downloadUrl = downloadUrlInput ? downloadUrlInput.value.trim() : '';
            const githubUrlInput = document.getElementById('release-github-url-input');
            payload.githubUrl = githubUrlInput ? githubUrlInput.value.trim() : '';
            const platformsInput = document.getElementById('release-platforms-input');
            payload.platforms = platformsInput ? platformsInput.value.trim() : '';
        }

        if (type !== 'skill' && type !== 'release') {
            const checkedBoxes = document.querySelectorAll('input[name="skill-id"]:checked');
            payload.skillIds = Array.from(checkedBoxes).map(checkbox => parseInt(checkbox.value, 10));
        }

        const endpoint = `/${getTypeEndpoint(type)}`;
        const method = itemId ? 'PUT' : 'POST';
        const finalEndpoint = itemId ? `${SERVER_URL}${endpoint}/${itemId}` : `${SERVER_URL}${endpoint}`;

        try {
            const response = await fetch(finalEndpoint, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (response.ok) {
                showToast(`Content ${itemId ? 'updated' : 'saved'} successfully!`, 'success');
                location.reload();
            } else {
                const error = await response.text();
                throw new Error(`Content save failed: ${response.status} - ${error}`);
            }
        } catch (error) {
            console.error('Content Save Error:', error);
            showToast('Error saving content. Please try again.', 'error');
        } finally {
            if (saveLoader) saveLoader.hide();
        }
    }

    function loadSimpleForm(type) {
        const headerText = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;

        if (type === 'education') {
            mainContentArea.innerHTML = `
                <div class="creation-center-container">
                    <h1 class="tab-header">${headerText}</h1>
                    <form id="education-form">
                        <input type="text" id="education-institution" placeholder="Institution" class="modal-input" required>
                        <input type="text" id="education-title" placeholder="Degree/Course Title" class="modal-input" required>
                        <label for="education-level" class="form-label">Education Level:</label>
                        <select id="education-level" class="modal-input" required>
                            <option value="" disabled selected>Select Level</option>
                            <option value="HIGH_SCHOOL">High School</option>
                            <option value="ASSOCIATE">Associate's Degree</option>
                            <option value="DIPLOMA">Diploma</option>
                            <option value="BACHELOR">Bachelor's Degree</option>
                            <option value="MASTER">Master's Degree</option>
                            <option value="PHD">PhD</option>
                            <option value="OTHER">Other</option>
                        </select>
                        <div class="date-inputs">
                            <label for="education-date-started">Start Date:</label>
                            <input type="date" id="education-date-started" class="modal-input" required>
                            <label for="education-date-ended">End Date:</label>
                            <input type="date" id="education-date-ended" class="modal-input">
                            <div id="education-end-date-container">
                                <label><input type="checkbox" id="education-currently-here"> Currently Attending</label>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="submit-button">Save</button>
                            <button type="button" class="cancel-button">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
        } else if (type === 'certificate') {
            mainContentArea.innerHTML = `
                <div class="creation-center-container">
                    <h1 class="tab-header">${headerText}</h1>
                    <form id="certificate-form">
                        <input type="text" id="cert-name" placeholder="Certificate Name" class="modal-input" required>
                        <input type="text" id="cert-source" placeholder="Issuing Organization" class="modal-input" required>
                        <input type="text" id="cert-category" placeholder="Category (e.g., Cloud, AI, Security)" class="modal-input" required>
                        <div class="form-actions">
                            <button type="submit" class="submit-button">Save</button>
                            <button type="button" class="cancel-button">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
        } else if (type === 'experience') {
            mainContentArea.innerHTML = `
                <div class="creation-center-container">
                    <h1 class="tab-header">${headerText}</h1>
                    <form id="experience-form">
                        <input type="text" id="exp-position" placeholder="Position Title" class="modal-input" required>
                        <input type="text" id="exp-organization" placeholder="Organization/Company" class="modal-input" required>
                        <div class="date-inputs">
                            <label for="exp-date-started">Start Date:</label>
                            <input type="date" id="exp-date-started" class="modal-input" required>
                            <label for="exp-date-ended">End Date:</label>
                            <input type="date" id="exp-date-ended" class="modal-input">
                            <div id="experience-end-date-container">
                                <label><input type="checkbox" id="exp-currently-here"> Currently here</label>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="submit-button">Save</button>
                            <button type="button" class="cancel-button">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
        } else {
            return;
        }

        const cancelButton = mainContentArea.querySelector('.cancel-button');
        cancelButton.addEventListener('click', () => location.reload());

        mainContentArea.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            if (type === 'education') {
                handleEducationSave();
            } else if (type === 'certificate') {
                handleCertificateSave();
            } else if (type === 'experience') {
                handleExperienceSave();
            }
        });

        const educationCurrentlyHereCheckbox = document.getElementById('education-currently-here');
        const educationEndDateInput = document.getElementById('education-date-ended');

        if (educationCurrentlyHereCheckbox && educationEndDateInput) {
            educationCurrentlyHereCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    educationEndDateInput.disabled = true;
                    educationEndDateInput.value = '';
                } else {
                    educationEndDateInput.disabled = false;
                }
            });

            if (educationCurrentlyHereCheckbox.checked) {
                educationEndDateInput.disabled = true;
            }
        }

        const experienceCurrentlyHereCheckbox = document.getElementById('exp-currently-here');
        const experienceEndDateInput = document.getElementById('exp-date-ended');

        if (experienceCurrentlyHereCheckbox && experienceEndDateInput) {
            experienceCurrentlyHereCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    experienceEndDateInput.disabled = true;
                    experienceEndDateInput.value = '';
                } else {
                    experienceEndDateInput.disabled = false;
                }
            });

            if (experienceCurrentlyHereCheckbox.checked) {
                experienceEndDateInput.disabled = true;
            }
        }
    }

    async function handleEducationSave() {
        const token = localStorage.getItem('jwt_token');
        if (!token || !isSessionValid()) {
            redirectToLogin('You are not logged in. Redirecting to login page.');
            return;
        }

        const startDateInput = document.getElementById('education-date-started');
        const endDateInput = document.getElementById('education-date-ended');
        const isCurrentlyHere = document.getElementById('education-currently-here').checked;

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            showAlertDialog({
                title: 'Invalid date range',
                message: 'The end date cannot be before the start date.'
            });
            return;
        }

        const payload = {
            level: document.getElementById('education-level').value,
            title: document.getElementById('education-title').value,
            institution: document.getElementById('education-institution').value,
            dateStarted: startDate,
            dateEnded: isCurrentlyHere ? null : endDate,
            currentlyHere: isCurrentlyHere
        };

        try {
            await postData('education', payload, token);
        } catch (error) {
            console.error('Education Save Error:', error);
            showToast('Error saving education. Please try again.', 'error');
        }
    }

    async function handleCertificateSave() {
        const token = localStorage.getItem('jwt_token');
        if (!token || !isSessionValid()) {
            redirectToLogin('You are not logged in. Redirecting to login page.');
            return;
        }
        const payload = {
            name: document.getElementById('cert-name').value,
            source: document.getElementById('cert-source').value,
            category: document.getElementById('cert-category').value,
        };
        try {
            await postData('certificate', payload, token);
        } catch (error) {
            console.error('Certificate Save Error:', error);
            showToast('Error saving certificate. Please try again.', 'error');
        }
    }

    async function handleExperienceSave() {
        const token = localStorage.getItem('jwt_token');
        if (!token || !isSessionValid()) {
            redirectToLogin('You are not logged in. Redirecting to login page.');
            return;
        }

        const startDateInput = document.getElementById('exp-date-started');
        const endDateInput = document.getElementById('exp-date-ended');
        const isCurrentlyHere = document.getElementById('exp-currently-here').checked;

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            showAlertDialog({
                title: 'Invalid date range',
                message: 'The end date cannot be before the start date.'
            });
            return;
        }

        const payload = {
            position: document.getElementById('exp-position').value,
            organization: document.getElementById('exp-organization').value,
            dateStarted: startDate,
            dateEnded: isCurrentlyHere ? null : endDate,
        };

        try {
            await postData('experience', payload, token);
        } catch (error) {
            console.error('Experience Save Error:', error);
            showToast('Error saving experience. Please try again.', 'error');
        }
    }

    async function postData(type, payload, token) {
        let endpoint = '';
        if (type === 'education') {
            endpoint = `${SERVER_URL}/education`;
        } else if (type === 'certificate') {
            endpoint = `${SERVER_URL}/certificate`;
        } else if (type === 'experience') {
            endpoint = `${SERVER_URL}/experience`;
        } else {
            throw new Error('Invalid post data type');
        }

        const submitButton = mainContentArea.querySelector('form .submit-button');
        const loader = window.showActionLoader
            ? showActionLoader(submitButton, { placement: 'inside', variant: 'button' })
            : null;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin();
                return;
            }

            if (response.ok) {
                showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully!`, 'success');
                location.reload();
            } else {
                const error = await response.text();
                throw new Error(`Save failed: ${response.status} - ${error}`);
            }
        } finally {
            if (loader) loader.hide();
        }
    }

    async function loadManageContent(type) {
        const headerText = `Manage ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const mainContentArea = document.querySelector('.admin-main');
        const token = localStorage.getItem('jwt_token');

        if (!token || !isSessionValid()) {
            redirectToLogin('You are not logged in. Redirecting to login page.');
            return;
        }

        const handleEditClick = async (event) => {
            const button = event.target;
            const id = button.dataset.id;
            const type = button.dataset.type;

            if (!token || !isSessionValid()) {
                redirectToLogin('You are not logged in.');
                return;
            }

            try {
                const endpoint = `/${getTypeEndpoint(type)}/${id}`;
                const response = await fetch(`${SERVER_URL}${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to fetch item for editing');

                const item = await response.json();

                loadMarkdownForm(type, item, id);
            } catch (error) {
                console.error('Error fetching item for edit:', error);
                showAlertDialog({
                    title: 'Could not load item',
                    message: 'Could not load item details for editing.'
                });
            }
        };

        const handleDeleteClick = async (event) => {
            const button = event.target;
            const id = button.dataset.id;
            const type = button.dataset.type;

            const confirmed = await showConfirmDialog({
                title: 'Delete this item?',
                message: 'Are you sure you want to delete this item?',
                confirmLabel: 'Delete',
                danger: true
            });
            if (!confirmed) return;

            const token = localStorage.getItem('jwt_token');
            if (!token || !isSessionValid()) {
                redirectToLogin('You are not logged in.');
                return;
            }

            try {
                const endpoint = `/${getTypeEndpoint(type)}/${id}`;
                const response = await fetch(`${SERVER_URL}${endpoint}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    showToast('Item deleted successfully!', 'success');
                    loadManageContent(type);
                } else {
                    throw new Error(`Failed to delete item: ${response.status}`);
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                showToast('Could not delete the item.', 'error');
            }
        };

        try {
            const endpoint = `/${getTypeEndpoint(type)}`;
            const response = await fetch(`${SERVER_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    redirectToLogin();
                    return;
                }
                throw new Error('Failed to fetch content');
            }

            const rawData = await response.json();
            const items = Array.isArray(rawData) ? rawData : (rawData.content || []);

            let listHtml = items.map(item => `
                <li class="content-item">
                    <span>${item.pinned ? getPinBadgeHtml() + ' ' : ''}${item.title || item.name}${item.version ? ' (' + item.version + ')' : ''}</span>
                    <div>
                        <button class="edit-button" data-id="${item.id}" data-type="${type}">Edit</button>
                        <button class="delete-button" data-id="${item.id}" data-type="${type}">Delete</button>
                    </div>
                </li>
            `).join('');

            const manageContentHtml = `
                <div class="creation-center-container">
                    <h1 class="tab-header">${headerText}</h1>
                    <ul class="manage-list">
                        ${listHtml.length > 0 ? listHtml : '<li>No items found.</li>'}
                    </ul>
                </div>
            `;
            mainContentArea.innerHTML = manageContentHtml;

            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', handleEditClick);
            });
            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', handleDeleteClick);
            });
        } catch (error) {
            console.error('Error fetching items:', error);
            showAlertDialog({
                title: 'Load failed',
                message: 'Error loading content for management.'
            });
        }
    }

    function getPinBadgeHtml() {
        const span = createPinBadge();
        return span.innerHTML;
    }

});