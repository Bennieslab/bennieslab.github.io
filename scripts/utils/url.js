/**
 * Shared URL / query-string helpers.
 * Load via <script> BEFORE any page-level script that uses them.
 */

/** Reads `?skill=` or `?skillId=` from the current URL. */
function getSkillIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('skill') || params.get('skillId');
}

/** Reads `?id=` from the current URL. */
function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Expose as globals for plain <script> pages.
window.getSkillIdFromUrl = getSkillIdFromUrl;
window.getIdFromUrl = getIdFromUrl;