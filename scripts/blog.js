const isAdmin = isLoggedIn();

const PAGE_SIZE = 6;
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

/**
 * Fetches the latest stickies (short notes pinned to the top of the blog)
 * and renders them into the page's .stickies grid. Hides the stickies
 * section when the API returns none (or fails).
 */
async function renderStickies() {
    const section = document.querySelector('.stickies-section');
    const container = document.querySelector('.stickies');
    if (!section || !container) return;

    let stickies = [];
    try {
        const response = await fetch(`${SERVER_URL}/stickie`);
        if (!response.ok) throw new Error(`HTTP error. Status: ${response.status}`);
        stickies = await response.json();
    } catch (error) {
        console.error("Error fetching stickies:", error);
    }

    // Show the section only when there's something to display.
    if (!Array.isArray(stickies) || stickies.length === 0) {
        section.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    stickies.slice(0, 3).forEach(stickie => {
        const stickieDiv = document.createElement('div');
        stickieDiv.classList.add('stickie');
        stickieDiv.setAttribute('role', 'note');

        const content = document.createElement('p');
        content.classList.add('stickie-content');
        content.textContent = stickie.content;

        const meta = document.createElement('div');
        meta.classList.add('stickie-meta');

        const source = document.createElement('span');
        source.classList.add('stickie-source');
        source.textContent = stickie.source === 'USER' ? 'Bennie' : 'AI';
        meta.appendChild(source);

        const date = document.createElement('span');
        date.classList.add('stickie-date');
        date.textContent = formatDateTimeArray(stickie.dateStuck);
        meta.appendChild(date);

        stickieDiv.appendChild(content);
        stickieDiv.appendChild(meta);
        container.appendChild(stickieDiv);
    });

    section.style.display = 'flex';
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
            postDiv.appendChild(buildAdminControls('blog', post.id, () => pager.loadPage(pager.currentPage)));
        }

        postsContainer.appendChild(postDiv);
    });
}

const pager = createPaginationState({
    container: document.getElementById("pagination-blog"),
    fetcher: (page, size) => fetchPosts(page, size, activeFilters),
    render: (items) => renderPosts(items),
    onLoaded: () => updateFilterSummary(activeFilters, 'All posts', filterSkills),
    onError: () => {
        document.querySelector(".blog-posts").innerHTML = "<p>Error loading posts.</p>";
    },
    pageSize: PAGE_SIZE
});

function onFilterChange() {
    syncFilterUrl(activeFilters);
    pager.loadPage(0);
}

async function initializePosts() {
    try {
        const url = new URL(window.location.href);
        activeFilters.category = url.searchParams.get('category') || 'all';
        activeFilters.skillId = url.searchParams.get('skillId') || url.searchParams.get('skill') || 'all';

        const [categories, skills] = await Promise.all([
            fetchCategories('/blog/categories'),
            fetchSkillOptions()
        ]);

        filterCategories = categories;
        filterSkills = skills;
        renderFilterControls({
            activeFilters,
            filterCategories,
            filterSkills,
            categoryLabelId: 'postCategoryFilterLabel',
            skillLabelId: 'postSkillFilterLabel',
            categorySelectId: 'postCategoryFilter',
            skillSelectId: 'postSkillFilter',
            allLabel: 'All posts',
            onChange: onFilterChange
        });

        // Stickies don't block the post list — fire and forget.
        renderStickies();
        await pager.loadPage(0);
    } catch (error) {
        console.error('Error initializing posts:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializePosts);