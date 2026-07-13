const SERVER_URL = "https://bennieslab-backend.onrender.com";
const isAdmin = !!localStorage.getItem('jwt_token');

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

function getBlogPostIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function fetchBlogPost(id) {
    try {
        const response = await fetch(`${SERVER_URL}/blog/${id}`);
        const postData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return postData;
    } catch (error) {
        console.error("Error fetching blog post:", error);
        return null;
    }
}

async function displayBlogPost() {
    const postId = getBlogPostIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const postDetailThumbnail = document.getElementById('postDetailThumbnail'); // New
    const postTitleElement = document.querySelector('.post-detail-title');
    const postCategoryElement = document.querySelector('.post-meta .category');
    const datePostedElement = document.querySelector('.post-meta .date-posted');
    const lastUpdateElement = document.querySelector('.post-meta .last-updated');
    const postContentElement = document.querySelector('.post-content-rendered');

    if (!postId) {
        postTitleElement.textContent = "Post Not Found";
        postContentElement.innerHTML = "<p>No blog post ID provided in the URL.</p>";
        pageTitleElement.textContent = "Error";
        return;
    }

    const post = await fetchBlogPost(postId);

    if (post) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('blog', post.id));
        }

        pageTitleElement.textContent = post.title;
        postTitleElement.textContent = post.title;
        postCategoryElement.textContent = post.category;
        datePostedElement.textContent = "Posted: " + formatDateTimeArray(post.datePosted);
        lastUpdateElement.textContent = "Last Updated: " + formatDateTimeArray(post.lastUpdated);

        if (post.thumbnailUrl) {
            postDetailThumbnail.src = post.thumbnailUrl;
            postDetailThumbnail.style.display = 'block';
        } else {
            postDetailThumbnail.style.display = 'none';
        }

        postContentElement.innerHTML = marked.parse(post.content);

        // Render skills sidebar if skills are attached
        renderSkillsSidebar(post.skills);
    } else {
        postTitleElement.textContent = "Post Not Found";
        postContentElement.innerHTML = "<p>The requested blog post could not be loaded.</p>";
        pageTitleElement.textContent = "Error";
    }
}

/**
 * Builds skill chip links in the left sidebar.
 * The sidebar stays hidden (display:none) if there are no skills.
 */
function renderSkillsSidebar(skills) {
    const sidebar = document.getElementById('postSkillsSidebar');
    const list    = document.getElementById('postSkillsList');
    if (!sidebar || !list || !skills || skills.length === 0) return;

    skills.forEach(skill => {
        const chip = document.createElement('a');
        chip.href = `skill-detail.html?id=${skill.id}`;
        chip.className = 'skill-chip';
        chip.title = skill.description || skill.name;

        if (skill.thumbnailUrl) {
            const img = document.createElement('img');
            img.src = skill.thumbnailUrl;
            img.alt = skill.name;
            img.className = 'skill-chip-thumb';
            chip.appendChild(img);
        }

        const label = document.createElement('span');
        label.className = 'skill-chip-name';
        label.textContent = skill.name;
        chip.appendChild(label);

        list.appendChild(chip);
    });

    sidebar.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', displayBlogPost);

function buildAdminFab(type, id) {
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
        if (!confirm('Delete this post? This cannot be undone.')) return;

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

            alert('Post deleted.');
            window.location.href = 'blogs.html';
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    fab.appendChild(editBtn);
    fab.appendChild(deleteBtn);
    return fab;
}
