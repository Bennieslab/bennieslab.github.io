/**
 * Shared API / auth helpers.
 * Load via <script> BEFORE any page-level script that uses them.
 */

/** True when a JWT token is present in localStorage. */
function isLoggedIn() {
    return !!localStorage.getItem('jwt_token');
}

/**
 * Decodes the payload of a JWT without verifying its signature.
 * Returns null when the token is missing or malformed.
 */
function decodeJwtPayload(token) {
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        // JWT base64url → base64, then decode. atob gives a binary string,
        // so TextDecoder converts it to UTF-8 (preserving non-ASCII chars).
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        const payload = JSON.parse(decoded);
        return typeof payload === 'object' && payload !== null ? payload : null;
    } catch (error) {
        console.error('Failed to decode JWT payload:', error);
        return null;
    }
}

/**
 * Returns true when the stored token is present AND (if it carries an
 * exp claim) still valid. Tokens without an exp claim are treated as
 * valid, matching the backend's behavior.
 */
function isSessionValid() {
    const token = localStorage.getItem('jwt_token');
    if (!token) return false;

    const payload = decodeJwtPayload(token);
    if (!payload) return false;

    if (typeof payload.exp !== 'number') return true;

    // exp is in seconds since epoch; add a small 5s buffer so a token
    // that expires mid-round-trip doesn't pass here then fail the call.
    return payload.exp * 1000 > Date.now() + 5000;
}

/**
 * Removes the stored token and redirects to the login page.
 * Used when the session is missing, expired, or rejected by the API.
 */
function redirectToLogin(message) {
    localStorage.removeItem('jwt_token');
    if (message && window.showToast) {
        window.showToast(message, 'error');
    }
    window.location.href = 'login.html';
}

// Expose as globals for plain <script> pages.
window.isLoggedIn = isLoggedIn;
window.decodeJwtPayload = decodeJwtPayload;
window.isSessionValid = isSessionValid;
window.redirectToLogin = redirectToLogin;