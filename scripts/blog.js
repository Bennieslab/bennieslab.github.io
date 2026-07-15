const SERVER_URL = "https://bennieslab-backend.onrender.com";
const isAdmin = !!localStorage.getItem('jwt_token');

const PAGE_SIZE = 6;
let currentPage = 0;
let totalPages = 1;
let pageLoading = false;
let activeFilters = { category: 'all', skillId: 'all' };
let filterCategories = [];
let filterSkills = [];

async function fetchPosts(page = 0, size = PAGE_SIZE, filters = {}) {
    try {
        const params = new URLSearchParams({ page, size });
        if (filters.category && filters.category !== 'all') {
            params.set('category', filters.category);
        }
        if (filters.skillId && filters.skillId !== 'all') {
            params.set('skillId', filters.skillId);
        }
        let response = await fetch(`${SERVER_URL}/blog?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error. status: ${response.status}`);
        }
        return await response.json(); // Spring Page<PostDto>
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

function formatDateTimeArray(dateTimeArray) {
    if (!dateTimeArray || dateTimeArray.length < 6) {
        return "Invalid Date";
    }

    const year = dateTimeArray[0];
    const month = dateTimeArray[1] - 1;
    const day = dateTimeArray[2];
    const hours = dateTimeArray[3];
    const minutes = dateTimeArray[4];
    const seconds = dateTimeArray[5];

    const postDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return postDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (postDate >= startOfWeek && postDate <= now) {
        return postDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
            postDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (postDate.getFullYear() === now.getFullYear()) {
        return postDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return postDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

function getSkillIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('skill') || params.get('skillId');
}

async function fetchPostCategories() {
    try {
        const response = await fetch(`${SERVER_URL}/blog/categories`);
        if (!response.ok) throw new Error(`HTTP error. Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching post categories:', error);
        return [];
    }
}

async function fetchSkillOptions() {
    try {
        const response = await fetch(`${SERVER_URL}/skills`);
        if (!response.ok) throw new Error(`HTTP error. Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching skill options:', error);
        return [];
    }
}

function syncFilterUrl() {
    const url = new URL(window.location.href);
    if (activeFilters.category && activeFilters.category !== 'all') {
        url.searchParams.set('category', activeFilters.category);
    } else {
        url.searchParams.delete('category');
    }
    if (activeFilters.skillId && activeFilters.skillId !== 'all') {
        url.searchParams.set('skillId', activeFilters.skillId);
    } else {
        url.searchParams.delete('skillId');
        url.searchParams.delete('skill');
    }
    history.replaceState({}, '', url);
}

function updateFilterSummary() {
    const summary = document.getElementById('filterSummary');
    if (!summary) return;

    const parts = [];
    if (activeFilters.category !== 'all') parts.push(`Category: ${activeFilters.category}`);
    if (activeFilters.skillId !== 'all') {
        const skill = filterSkills.find(item => String(item.id) === String(activeFilters.skillId));
        parts.push(`Skill: ${skill ? skill.name : activeFilters.skillId}`);
    }

    summary.textContent = parts.length ? parts.join(' · ') : 'All posts';
}

let postCategorySelect = null;
let postSkillSelect = null;

function renderFilterControls() {
    const filters = document.querySelector('.filters');
    const tags = document.querySelector('.tags');
    const dropdowns = document.querySelector('.filter-dropdowns');
    if (!filters || !tags || !dropdowns) return;

    filters.style.display = 'flex';
    tags.innerHTML = `
        <button type="button" class="filter-clear-btn" id="clearFilters">Clear filters</button>
        <span class="filter-status" id="filterSummary">All posts</span>
    `;
    dropdowns.innerHTML = `
        <div class="filter-control">
            <span class="filter-control-label" id="postCategoryFilterLabel">Category</span>
        </div>
        <div class="filter-control">
            <span class="filter-control-label" id="postSkillFilterLabel">Skill</span>
        </div>
    `;

    const [categoryControl, skillControl] = dropdowns.querySelectorAll('.filter-control');

    postCategorySelect = createCustomSelect({
        id: 'postCategoryFilter',
        options: [
            { value: 'all', label: 'All categories' },
            ...filterCategories.map(category => ({ value: category, label: category }))
        ],
        value: activeFilters.category,
        onChange: (value) => {
            activeFilters.category = value;
            syncFilterUrl();
            currentPage = 0;
            loadPage(0);
        }
    });
    categoryControl.appendChild(postCategorySelect.element);
    categoryControl.querySelector('.custom-select-trigger').setAttribute('aria-labelledby', 'postCategoryFilterLabel');

    postSkillSelect = createCustomSelect({
        id: 'postSkillFilter',
        options: [
            { value: 'all', label: 'All skills' },
            ...filterSkills.map(skill => ({ value: skill.id, label: skill.name }))
        ],
        value: activeFilters.skillId,
        onChange: (value) => {
            activeFilters.skillId = value;
            syncFilterUrl();
            currentPage = 0;
            loadPage(0);
        }
    });
    skillControl.appendChild(postSkillSelect.element);
    skillControl.querySelector('.custom-select-trigger').setAttribute('aria-labelledby', 'postSkillFilterLabel');

    document.getElementById('clearFilters').addEventListener('click', () => {
        activeFilters = { category: 'all', skillId: 'all' };
        postCategorySelect.setValue('all');
        postSkillSelect.setValue('all');
        syncFilterUrl();
        currentPage = 0;
        loadPage(0);
    });

    updateFilterSummary();
}

function renderPosts(posts) {
    let postsContainer = document.querySelector(".blog-posts");
    if (!postsContainer) {
        console.error("No element with class 'blog-posts' found.");
        return;
    }
    postsContainer.innerHTML = "";

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = "<p>No blog posts to display yet.</p>";
        return;
    }

    posts.forEach(post => {
        let postDiv = document.createElement("div");
        postDiv.classList.add("blog-post");
        if (post.pinned) postDiv.classList.add("pinned-item");
        postDiv.addEventListener('click', () => {
            window.location.href = `blog-post-detail.html?id=${post.id}`;
        });

        let postThumbnail = document.createElement("div");
        postThumbnail.classList.add("thumbnail-container");

        if (post.thumbnailUrl) {
            let img = document.createElement("img");
            img.src = post.thumbnailUrl;
            img.alt = post.title + " thumbnail";
            img.classList.add("post-thumbnail-img");
            postThumbnail.appendChild(img);
        }

        let postMetadata = document.createElement("div");
        postMetadata.classList.add("metadata");

        let postTitleElement = document.createElement("h2");
        let postContentElement = document.createElement("p");
        let postCategoryElement = document.createElement("span");
        let datePostedElement = document.createElement("span");

        postTitleElement.classList.add("post-title");
        postContentElement.classList.add("post-content");
        postCategoryElement.classList.add("category");
        datePostedElement.classList.add("date-posted");

        postTitleElement.textContent = post.title;
        if (post.pinned) {
            postTitleElement.prepend(createPinBadge());
        }
        postContentElement.textContent = getPlainTextSnippet(post.content, 120);
        postCategoryElement.textContent = post.category;

        datePostedElement.textContent = "Posted: " + formatDateTimeArray(post.datePosted);

        postMetadata.appendChild(postTitleElement);
        postMetadata.appendChild(postContentElement);
        postMetadata.appendChild(postCategoryElement);
        postMetadata.appendChild(datePostedElement);

        postDiv.appendChild(postThumbnail);
        postDiv.appendChild(postMetadata);

        if (isAdmin) {
            postDiv.appendChild(buildAdminControls('blog', post.id));
        }

        postsContainer.appendChild(postDiv);
    });
}

function renderPagination(currentPg, totalPgs) {
    const container = document.getElementById("pagination-blog");
    if (!container) return;
    container.innerHTML = "";

    if (totalPgs <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Previous";
    prevBtn.disabled = currentPg === 0;
    prevBtn.id = "page-prev";
    prevBtn.addEventListener("click", () => loadPage(currentPg - 1));
    container.appendChild(prevBtn);

    const maxButtons = 5;
    let startPage = Math.max(0, currentPg - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPgs - 1, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(0, endPage - maxButtons + 1);
    }

    if (startPage > 0) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "…";
        ellipsis.classList.add("pagination-ellipsis");
        container.appendChild(ellipsis);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.textContent = i + 1;
        pageBtn.id = `page-btn-${i}`;
        if (i === currentPg) pageBtn.classList.add("active");
        const pageIndex = i;
        pageBtn.addEventListener("click", () => loadPage(pageIndex));
        container.appendChild(pageBtn);
    }

    if (endPage < totalPgs - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "…";
        ellipsis.classList.add("pagination-ellipsis");
        container.appendChild(ellipsis);
    }

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next →";
    nextBtn.disabled = currentPg >= totalPgs - 1;
    nextBtn.id = "page-next";
    nextBtn.addEventListener("click", () => loadPage(currentPg + 1));
    container.appendChild(nextBtn);
}

async function loadPage(page) {
    if (pageLoading) return;
    pageLoading = true;
    const paginationContainer = document.getElementById("pagination-blog");
    const loader = window.showActionLoader
        ? showActionLoader(paginationContainer, { variant: 'block', disable: false })
        : null;
    currentPage = page;
    try {
        const data = await fetchPosts(page, PAGE_SIZE, activeFilters);
        if (!data) {
            document.querySelector(".blog-posts").innerHTML = "<p>Error loading posts.</p>";
            return;
        }
        totalPages = data.totalPages || 1;
        renderPosts(data.content);
        renderPagination(currentPage, totalPages);
        updateFilterSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
        if (loader) loader.hide();
        pageLoading = false;
    }
}

async function initializePosts() {
    try {
        const url = new URL(window.location.href);
        activeFilters.category = url.searchParams.get('category') || 'all';
        activeFilters.skillId = url.searchParams.get('skillId') || url.searchParams.get('skill') || 'all';

        const [categories, skills] = await Promise.all([
            fetchPostCategories(),
            fetchSkillOptions()
        ]);

        filterCategories = categories;
        filterSkills = skills;
        renderFilterControls();
        await loadPage(0);
    } catch (error) {
        console.error('Error initializing posts:', error);
    }
}

function buildAdminControls(type, id) {
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
        if (!confirm(`Delete this post? This cannot be undone.`)) return;

        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/blog/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            initializePosts();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    return controls;
}

document.addEventListener('DOMContentLoaded', initializePosts);