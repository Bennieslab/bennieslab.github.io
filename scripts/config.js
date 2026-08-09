/**
 * Centralized site configuration.
 *
 * Every other script used to hardcode `const SERVER_URL = "..."`
 * — if the API ever moved, that meant editing every file that
 * talked to it. This single module is now the only place the
 * backend base URL (and other shared settings) live.
 *
 * Load this BEFORE any page-level script:
 *     <script src="scripts/config.js"></script>
 */
const SERVER_URL = "https://bennieslab-backend.onrender.com";
window.SERVER_URL = SERVER_URL;
