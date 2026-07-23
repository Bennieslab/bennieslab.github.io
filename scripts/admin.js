const SERVER_URL = "https://bennieslab-backend.onrender.com";
let easyMDE;

document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.replace('login.html');
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
            default: return 'skills';
        }
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes < 1024) return `${bytes || 0} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    async function loadMediaLibrary() {
        const body = document.getElementById('mediaLibraryBody');
        const summary = document.getElementById('mediaLibrarySummary');
        if (!body) return;

        body.innerHTML = `<div class="media-loading"><span class="action-loader action-loader--block"></span></div>`;
        if (summary) summary.textContent = '';

        const currentToken = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/media`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again.');
                localStorage.removeItem('jwt_token');
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) throw new Error(`Failed to load media: ${response.status}`);

            const files = await response.json();
            renderMediaLibrary(files);
        } catch (error) {
            console.error('Error loading media library:', error);
            body.innerHTML = `<p class="skills-error">Could not load the media library. Please try again.</p>`;
        }
    }

    function renderMediaLibrary(files) {
        const body = document.getElementById('mediaLibraryBody');
        const summary = document.getElementById('mediaLibrarySummary');
        if (!body) return;

        if (!files || files.length === 0) {
            body.innerHTML = `<p class="coming-soon">No files uploaded yet.</p>`;
            if (summary) summary.textContent = '';
            return;
        }

        const totalBytes = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
        if (summary) {
            summary.textContent = `${files.length} file${files.length === 1 ? '' : 's'} · ${formatFileSize(totalBytes)} total`;
        }

        const thumbnails = files.filter(f => f.category === 'thumbnails');
        const models = files.filter(f => f.category === 'models');
        const other = files.filter(f => f.category === 'other');

        body.innerHTML = '';

        if (thumbnails.length) body.appendChild(buildMediaSection('Thumbnails', thumbnails, 'image'));
        if (models.length) body.appendChild(buildMediaSection('3D Models', models, 'model'));
        if (other.length) body.appendChild(buildMediaSection('Other Files', other, 'other'));
    }

    function buildMediaSection(title, files, kind) {
        const section = document.createElement('div');
        section.className = 'media-section';

        const heading = document.createElement('h2');
        heading.className = 'media-section-heading';
        heading.textContent = `${title} (${files.length})`;
        section.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'media-grid';

        [...files]
            .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
            .forEach(file => grid.appendChild(buildMediaCard(file, kind)));

        section.appendChild(grid);
        return section;
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
        const confirmed = confirm(
            `Delete this file permanently?\n\n${key}\n\nThis cannot be undone. If this file is still used as a thumbnail or 3D model on a live project, post, skill, or model, deleting it will break that item's image/model — this tool has no way to check that for you.`
        );
        if (!confirmed) return;

        const currentToken = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/media?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            cardElement.remove();
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Could not delete this file.');
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
            alert('Could not load the requested item for editing.');
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
                    <input type="text" id="category-input" placeholder="Category" class="modal-input" required value="${isEditMode ? itemData.category : ''}">
                    ${type === 'project' ? `<input type="url" id="github-url-input" placeholder="GitHub URL" class="modal-input" value="${isEditMode ? (itemData.githubUrl || '') : ''}">` : ''}
                    <div class="modal-sorting-controls" style="margin: 12px 0; text-align: left; display: flex; flex-direction: column; gap: 8px;">
                        <label class="modal-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem; user-select: none;">
                            <input type="checkbox" id="pinned-input" ${isEditMode && itemData.pinned ? 'checked' : ''}>
                            Pin item to top of list
                        </label>
                        <label for="sort-order-input" class="modal-label" style="font-size: 0.85rem; margin-top: 4px;">Sort Order / Weight (lower is first):</label>
                        <input type="number" id="sort-order-input" placeholder="0" class="modal-input" style="width: 100%; box-sizing: border-box;" value="${isEditMode ? (itemData.sortOrder !== undefined ? itemData.sortOrder : 0) : 0}">
                    </div>
                    ${type !== 'skill' ? `
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

        initMarkdownEditorAndModal(type, itemId);

        if (type !== 'skill') {
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

    function initMarkdownEditorAndModal(type, itemId) {
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
                alert("Title and content cannot be empty.");
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

        if (!token) {
            alert("You are not logged in. Redirecting to login page.");
            window.location.href = 'login.html';
            return;
        }

        if (categoryInput.trim() === "") {
            alert("Category cannot be empty.");
            return;
        }

        if (type === 'model' && !itemId && !modelFile) {
            alert("Please choose a 3D model file (.glb or .gltf).");
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
                    alert("Your session has expired. Please log in again.");
                    localStorage.removeItem('jwt_token');
                    if (saveLoader) saveLoader.hide();
                    window.location.href = 'login.html';
                    return;
                }

                if (!response.ok) throw new Error(`File upload failed: ${response.status}`);
                const result = await response.json();
                thumbnailUrl = result.fileUrl;
            } catch (error) {
                console.error('Upload Error:', error);
                alert('Error uploading thumbnail. Please try again.');
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
                    alert("Your session has expired. Please log in again.");
                    localStorage.removeItem('jwt_token');
                    if (saveLoader) saveLoader.hide();
                    window.location.href = 'login.html';
                    return;
                }

                if (!modelResponse.ok) throw new Error(`Model upload failed: ${modelResponse.status}`);
                const modelResult = await modelResponse.json();
                modelFileKey = modelResult.fileUrl;
            } catch (error) {
                console.error('Model Upload Error:', error);
                alert('Error uploading 3D model file. Please try again.');
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

        if (type === 'project' || type === 'skill' || type === 'model') {
            payload.name = titleInput;
            payload.description = contentBody;
        } else if (type === 'blog') {
            payload.title = titleInput;
            payload.content = contentBody;
        }

        if (type === 'project') {
            const githubUrlInput = document.getElementById('github-url-input');
            payload.githubUrl = githubUrlInput ? githubUrlInput.value.trim() : '';
        }

        if (type !== 'skill') {
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
                alert("Your session has expired. Please log in again.");
                localStorage.removeItem('jwt_token');
                window.location.href = 'login.html';
                return;
            }

            if (response.ok) {
                alert(`Content ${itemId ? 'updated' : 'saved'} successfully!`);
                location.reload();
            } else {
                const error = await response.text();
                throw new Error(`Content save failed: ${response.status} - ${error}`);
            }
        } catch (error) {
            console.error('Content Save Error:', error);
            alert('Error saving content. Please try again.');
        } finally {
            if (saveLoader) saveLoader.hide();
        }
    }

    function loadSimpleForm(type) {
        const headerText = `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`;
        let formHtml = '';

        switch (type) {
            case 'education':
                formHtml = `
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
                break;
            case 'certificate':
                formHtml = `
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
                break;
            case 'experience':
                formHtml = `
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
                break;
        }

        mainContentArea.innerHTML = formHtml;
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
        if (!token) {
            alert("You are not logged in. Redirecting to login page.");
            window.location.href = 'login.html';
            return;
        }

        const startDateInput = document.getElementById('education-date-started');
        const endDateInput = document.getElementById('education-date-ended');
        const isCurrentlyHere = document.getElementById('education-currently-here').checked;

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            alert("The end date cannot be before the start date.");
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
            alert('Error saving education. Please try again.');
        }
    }

    async function handleCertificateSave() {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            alert("You are not logged in. Redirecting to login page.");
            window.location.href = 'login.html';
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
            alert('Error saving certificate. Please try again.');
        }
    }

    async function handleExperienceSave() {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            alert("You are not logged in. Redirecting to login page.");
            window.location.href = 'login.html';
            return;
        }

        const startDateInput = document.getElementById('exp-date-started');
        const endDateInput = document.getElementById('exp-date-ended');
        const isCurrentlyHere = document.getElementById('exp-currently-here').checked;

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            alert("The end date cannot be before the start date.");
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
            alert('Error saving experience. Please try again.');
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
                alert("Your session has expired. Please log in again.");
                localStorage.removeItem('jwt_token');
                window.location.href = 'login.html';
                return;
            }

            if (response.ok) {
                alert(`${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully!`);
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

        if (!token) {
            alert("You are not logged in. Redirecting to login page.");
            window.location.href = 'login.html';
            return;
        }

        const handleEditClick = async (event) => {
            const button = event.target;
            const id = button.dataset.id;
            const type = button.dataset.type;

            if (!token) {
                alert("You are not logged in.");
                window.location.href = 'login.html';
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
                alert('Could not load item details for editing.');
            }
        };

        const handleDeleteClick = async (event) => {
            const button = event.target;
            const id = button.dataset.id;
            const type = button.dataset.type;

            if (!confirm('Are you sure you want to delete this item?')) {
                return;
            }

            const token = localStorage.getItem('jwt_token');
            if (!token) {
                alert("You are not logged in.");
                window.location.href = 'login.html';
                return;
            }

            try {
                const endpoint = `/${getTypeEndpoint(type)}/${id}`;
                const response = await fetch(`${SERVER_URL}${endpoint}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    alert('Item deleted successfully!');
                    loadManageContent(type);
                } else {
                    throw new Error(`Failed to delete item: ${response.status}`);
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                alert('Could not delete the item.');
            }
        };

        try {
            const endpoint = `/${getTypeEndpoint(type)}`;
            const response = await fetch(`${SERVER_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert("Your session has expired. Please log in again.");
                    localStorage.removeItem('jwt_token');
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Failed to fetch content');
            }

            const items = await response.json();

            let listHtml = items.map(item => `
                <li class="content-item">
                    <span>${item.pinned ? getPinBadgeHtml() + ' ' : ''}${item.title || item.name}</span>
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
            alert('Error loading content for management.');
        }
    }

});