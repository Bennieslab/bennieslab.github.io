/**
 * Shared admin edit/delete controls (list-page controls + detail-page FAB).
 * Load via <script> BEFORE any page-level script that uses them.
 * Uses dialogs.js (confirm/toast) and api.js (session handling).
 */

/**
 * Builds the edit + delete button cluster shown on list pages for admins.
 *
 * @param {string} type    'project' | 'blog' | 'skill' | 'model'
 * @param {number|string} id
 * @param {Function} [onDeleted]  called after a successful delete
 * @param {string} [baseEndpoint] overrides SERVER_URL/<type> (rarely needed)
 */
function buildAdminControls(type, id, onDeleted, baseEndpoint) {
    const controls = document.createElement('div');
    controls.classList.add('admin-item-controls');

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('admin-control-btn', 'admin-edit-btn');
    editBtn.setAttribute('aria-label', 'Edit');
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `admin.html?edit=${type}&id=${id}`;
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('admin-control-btn', 'admin-delete-btn');
    deleteBtn.setAttribute('aria-label', 'Delete');
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const confirmed = await showConfirmDialog({
            title: `Delete ${type}?`,
            message: `Delete this ${type}? This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true
        });
        if (!confirmed) return;

        const token = localStorage.getItem('jwt_token');
        if (!token) {
            redirectToLogin('Your session has expired. Please log in again.');
            return;
        }

        try {
            const endpoint = baseEndpoint || `${SERVER_URL}/${type === 'blog' ? 'blog' : type + 's'}/${id}`;
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
            if (typeof onDeleted === 'function') onDeleted();
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Could not delete this item.', 'error');
        }
    });

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    return controls;
}

/**
 * Builds the floating edit + delete buttons (FAB) shown on detail pages
 * for admins.
 *
 * @param {string} type     'project' | 'blog' | 'skill' | 'model'
 * @param {number|string} id
 * @param {string} [redirectPage]  e.g. 'projects.html' — where to go after delete
 */
function buildAdminFab(type, id, redirectPage) {
    const fab = document.createElement('div');
    fab.classList.add('admin-fab-controls');

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('admin-fab-btn', 'admin-fab-edit');
    editBtn.setAttribute('aria-label', 'Edit');
    editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
    editBtn.addEventListener('click', () => {
        window.location.href = `admin.html?edit=${type}&id=${id}`;
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('admin-fab-btn', 'admin-fab-delete');
    deleteBtn.setAttribute('aria-label', 'Delete');
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>`;
    deleteBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog({
            title: `Delete ${type}?`,
            message: `Delete this ${type}? This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true
        });
        if (!confirmed) return;

        const token = localStorage.getItem('jwt_token');
        if (!token) {
            redirectToLogin('Your session has expired. Please log in again.');
            return;
        }

        try {
            const endpoint = `${SERVER_URL}/${type === 'blog' ? 'blog' : type + 's'}/${id}`;
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                redirectToLogin('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`, 'success');
            if (redirectPage) {
                window.location.href = redirectPage;
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Could not delete this item.', 'error');
        }
    });

    fab.appendChild(editBtn);
    fab.appendChild(deleteBtn);
    return fab;
}

// Expose as globals for plain <script> pages.
window.buildAdminControls = buildAdminControls;
window.buildAdminFab = buildAdminFab;