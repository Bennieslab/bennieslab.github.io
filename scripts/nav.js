(function () {
    const items = [
        {
            href: 'index.html',
            label: 'Home',
            paths: ['', 'index.html'],
            icon: '<path d="m3 11 9-8 9 8"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path>'
        },
        {
            href: 'projects.html',
            label: 'Projects',
            paths: ['projects.html', 'project-detail.html'],
            icon: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path>'
        },
        {
            href: 'blogs.html',
            label: 'Blogs',
            paths: ['blogs.html', 'blog-post-detail.html'],
            icon: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>'
        },
        {
            href: 'skills.html',
            label: 'Skills',
            paths: ['skills.html', 'skill-detail.html'],
            icon: '<path d="M12 5a3 3 0 1 0-5.99.13A4 4 0 0 0 5 13a4 4 0 0 0 1 7.87A3 3 0 0 0 12 19Z"></path><path d="M12 5a3 3 0 1 1 5.99.13A4 4 0 0 1 19 13a4 4 0 0 1-1 7.87A3 3 0 0 1 12 19Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path><path d="M17.5 10.5c.8.8 1.5 1.8 1.5 3.5"></path><path d="M6.5 10.5C5.7 11.3 5 12.3 5 14"></path>'
        },
        {
            href: 'profile.html',
            label: 'Profile',
            paths: ['profile.html'],
            icon: '<path d="M16 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"></path><path d="M9 6h6"></path><path d="M9 10h6"></path><path d="M9 14h3"></path>'
        }
    ];

    function currentPage() {
        const page = window.location.pathname.split('/').pop();
        return page || 'index.html';
    }

    function renderNav() {
        const nav = document.querySelector('.navbar nav');
        if (!nav) return;

        const page = currentPage();
        nav.innerHTML = items.map((item) => {
            const active = item.paths.includes(page) ? ' class="active-link"' : '';
            return `<a href="${item.href}"${active} aria-label="${item.label}">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${item.icon}</svg>
                <span class="nav-label">${item.label}</span>
            </a>`;
        }).join('');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderNav);
    } else {
        renderNav();
    }
})();
