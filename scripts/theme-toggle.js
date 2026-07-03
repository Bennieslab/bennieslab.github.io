(function () {
    const storageKey = 'bennieslab_theme';
    const savedTheme = localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    document.documentElement.dataset.theme = initialTheme;

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.querySelector('.theme-toggle');
        if (!toggle) return;

        const setTheme = (theme) => {
            document.documentElement.dataset.theme = theme;
            localStorage.setItem(storageKey, theme);
            toggle.setAttribute('aria-pressed', String(theme === 'dark'));
            toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        };

        setTheme(initialTheme);

        toggle.addEventListener('click', () => {
            const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
        });
    });
})();
