/**
 * Shared dialog / toast components.
 * Load via <script> BEFORE any page-level script that uses them.
 * Requires stylesheets/dialogs.css to be linked.
 *
 * API:
 *   showToast(message, type='info')            → non-blocking notification
 *   showAlertDialog({ title, message })        → Promise, resolves on OK
 *   showConfirmDialog({ title, message,
 *                       confirmLabel, cancelLabel, danger }) → Promise<boolean>
 */

/** Injects the toast container into <body> on first use. */
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Shows a non-blocking toast notification.
 * Types: 'info' | 'success' | 'error'
 */
function showToast(message, type = 'info', duration = 3500) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><span class="toast-message"></span>`;
    toast.querySelector('.toast-message').textContent = message;

    container.appendChild(toast);

    // Trigger enter animation on next frame.
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    const dismiss = () => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 250);
    };

    const timeout = setTimeout(dismiss, duration);
    toast.addEventListener('click', () => {
        clearTimeout(timeout);
        dismiss();
    });
}

/** Shared <dialog> element used by showAlertDialog / showConfirmDialog. */
let dialogEl = null;
let alertResolve = null;
let confirmResolve = null;

function getDialogEl() {
    if (dialogEl && document.body.contains(dialogEl)) return dialogEl;

    dialogEl = document.createElement('dialog');
    dialogEl.className = 'site-dialog';
    dialogEl.innerHTML = `
        <div class="site-dialog-content">
            <h2 class="site-dialog-title"></h2>
            <div class="site-dialog-message"></div>
            <div class="site-dialog-actions"></div>
        </div>
    `;
    document.body.appendChild(dialogEl);
    return dialogEl;
}

/**
 * Promise-based replacement for alert().
 * Resolves when the user clicks OK or closes the dialog.
 */
function showAlertDialog({ title = 'Notice', message = '' } = {}) {
    const dialog = getDialogEl();

    // Reject any pending confirm first — only one site dialog at a time.
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
    if (alertResolve) {
        alertResolve();
        alertResolve = null;
    }

    dialog.querySelector('.site-dialog-title').textContent = title;
    dialog.querySelector('.site-dialog-message').textContent = message;

    const actions = dialog.querySelector('.site-dialog-actions');
    actions.innerHTML = '';

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'site-dialog-btn primary';
    okBtn.textContent = 'OK';
    okBtn.addEventListener('click', close);
    actions.appendChild(okBtn);

    dialog.showModal();
    okBtn.focus();

    return new Promise((resolve) => {
        alertResolve = () => resolve();
    });

    function close() {
        dialog.close();
    }
}

/**
 * Promise-based replacement for confirm().
 * Resolves with `true` when the user confirms, `false` otherwise.
 */
function showConfirmDialog({
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false
} = {}) {
    const dialog = getDialogEl();

    // Reject any pending dialog first.
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
    if (alertResolve) {
        alertResolve();
        alertResolve = null;
    }

    dialog.querySelector('.site-dialog-title').textContent = title;
    dialog.querySelector('.site-dialog-message').textContent = message;

    const actions = dialog.querySelector('.site-dialog-actions');
    actions.innerHTML = '';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'site-dialog-btn';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = `site-dialog-btn ${danger ? 'danger' : 'primary'}`;
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    const result = new Promise((resolve) => {
        confirmResolve = resolve;
    });

    const onConfirm = () => {
        confirmResolve(true);
        confirmResolve = null;
        dialog.close();
    };
    const onCancel = () => {
        confirmResolve(false);
        confirmResolve = null;
        dialog.close();
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    dialog.addEventListener('cancel', onCancel, { once: true });

    dialog.showModal();
    cancelBtn.focus();

    return result;
}

// Expose as globals for plain <script> pages.
window.showToast = showToast;
window.showAlertDialog = showAlertDialog;
window.showConfirmDialog = showConfirmDialog;