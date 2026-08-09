/**
 * Shared formatting helpers.
 * Load via <script> BEFORE any page-level script that uses them.
 */

/**
 * Formats a date/time from the API into a friendly relative label.
 *
 * Accepts either the legacy Jackson array form ([y, m, d, h, min, s])
 * or the current ISO-8601 string form ("2026-07-27T10:24:27.174102")
 * by normalizing strings into the same array shape first.
 */
function formatDateTimeArray(dateTimeArray) {
    // Normalize ISO-8601 strings (e.g. "2026-07-27T10:24:27.174102")
    // into [year, month, day, hour, minute, second] so the array
    // logic below works identically for both formats.
    if (typeof dateTimeArray === 'string') {
        dateTimeArray = dateTimeArray
            .replace('T', ' ')
            .split(/[-:. ]/)
            .map(Number);
    }
    if (!dateTimeArray || dateTimeArray.length < 6) {
        return "Invalid Date";
    }

    const year = dateTimeArray[0];
    const month = dateTimeArray[1] - 1;
    const day = dateTimeArray[2];
    const hours = dateTimeArray[3];
    const minutes = dateTimeArray[4];
    const seconds = dateTimeArray[5];

    const date = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (date >= startOfWeek && date <= now) {
        return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Converts a Markdown string into a short plain-text snippet.
 * Falls back to raw text when marked hasn't loaded.
 */
function getPlainTextSnippet(markdownContent, maxLength = 120) {
    if (typeof marked === 'undefined') {
        console.warn("marked.js is not loaded. Cannot process Markdown for snippet.");
        return markdownContent.substring(0, maxLength) + (markdownContent.length > maxLength ? '...' : '');
    }
    const htmlContent = marked.parse(markdownContent);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    let plainText = tempDiv.textContent || tempDiv.innerText || '';
    plainText = plainText.replace(/\s+/g, ' ').trim();

    if (plainText.length > maxLength) {
        return plainText.substring(0, maxLength) + '...';
    }
    return plainText;
}

/**
 * Normalizes a date (ISO "2022-01-15" / "2022-01-15T10:24:27" or legacy
 * array [2022, 1, 15]) into [year, month, day].
 * Returns null when the value can't be parsed.
 */
function toYmd(value) {
    if (typeof value === 'string') {
        const parts = value
            .replace('T', ' ')
            .split(/[-:. ]/)
            .map(Number);
        return [parts[0], parts[1], parts[2]];
    }
    if (Array.isArray(value)) {
        return [value[0], value[1], value[2]];
    }
    return null;
}

/** Renders a byte count as a human-friendly size string. */
function formatFileSize(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Expose as globals for plain <script> pages (matching config.js pattern).
window.formatDateTimeArray = formatDateTimeArray;
window.getPlainTextSnippet = getPlainTextSnippet;
window.toYmd = toYmd;
window.formatFileSize = formatFileSize;