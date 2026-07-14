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

    const skillDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - skillDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return skillDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (skillDate >= startOfWeek && skillDate <= now) {
        return skillDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
            skillDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (skillDate.getFullYear() === now.getFullYear()) {
        return skillDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return skillDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getSkillIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function fetchSkill(id) {
    try {
        const response = await fetch(`${SERVER_URL}/skills/${id}`);
        const skillData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return skillData;
    } catch (error) {
        console.error("Error fetching skill:", error);
        return null;
    }
}

async function fetchPagedContent(path, page = 0, size = 1000) {
    try {
        const response = await fetch(`${SERVER_URL}${path}?page=${page}&size=${size}`);
        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return null;
    }
}

async function fetchAllPagedContent(path) {
    const firstPage = await fetchPagedContent(path);
    if (!firstPage) return [];

    const content = Array.isArray(firstPage.content) ? [...firstPage.content] : [];
    const totalPages = firstPage.totalPages || 1;

    for (let page = 1; page < totalPages; page++) {
        const nextPage = await fetchPagedContent(path, page);
        if (nextPage && Array.isArray(nextPage.content)) {
            content.push(...nextPage.content);
        }
    }

    return content;
}

function itemHasSkill(item, skillId) {
    const skills = Array.isArray(item.skills) ? item.skills : Array.from(item.skills || []);
    return skills.some(skill => String(skill.id) === String(skillId));
}

async function displaySkillCounts(skillId) {
    const projectsCountElement = document.getElementById('skillProjectsCount');
    const postsCountElement = document.getElementById('skillPostsCount');
    const projectsLink = document.getElementById('skillProjectsLink');
    const postsLink = document.getElementById('skillPostsLink');
    if (!projectsCountElement || !postsCountElement) return;

    if (projectsLink) {
        projectsLink.href = `projects.html?skill=${encodeURIComponent(skillId)}`;
    }
    if (postsLink) {
        postsLink.href = `blogs.html?skill=${encodeURIComponent(skillId)}`;
    }

    const [projects, posts] = await Promise.all([
        fetchAllPagedContent('/projects'),
        fetchAllPagedContent('/blog')
    ]);

    projectsCountElement.textContent = projects.filter(project => itemHasSkill(project, skillId)).length;
    postsCountElement.textContent = posts.filter(post => itemHasSkill(post, skillId)).length;
}

async function displaySkill() {
    const skillId = getSkillIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const skillDetailThumbnail = document.getElementById('skillDetailThumbnail');
    const skillTitleElement = document.querySelector('.skill-detail-title');
    const skillCategoryElement = document.querySelector('.skill-meta .category');
    const datePostedElement = document.querySelector('.skill-meta .date-posted');
    const lastUpdateElement = document.querySelector('.skill-meta .last-updated');
    const skillContentElement = document.querySelector('.skill-content-rendered');

    if (!skillId) {
        skillTitleElement.textContent = "Skill Not Found";
        skillContentElement.innerHTML = "<p>No skill ID provided in the URL.</p>";
        pageTitleElement.textContent = "Error";
        return;
    }

    const skill = await fetchSkill(skillId);

    if (skill) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('skill', skill.id));
        }

        pageTitleElement.textContent = skill.name;
        skillTitleElement.textContent = skill.name;
        skillCategoryElement.textContent = skill.category;
        datePostedElement.textContent = "Posted: " + formatDateTimeArray(skill.datePosted);
        lastUpdateElement.textContent = "Last Updated: " + formatDateTimeArray(skill.lastUpdated);

        if (skill.thumbnailUrl) {
            skillDetailThumbnail.src = skill.thumbnailUrl;
            skillDetailThumbnail.style.display = 'block';
        } else {
            skillDetailThumbnail.style.display = 'none';
        }

        skillContentElement.innerHTML = marked.parse(skill.description);
        displaySkillCounts(skill.id);
    } else {
        skillTitleElement.textContent = "Skill Not Found";
        skillContentElement.innerHTML = "<p>The requested skill could not be loaded.</p>";
        pageTitleElement.textContent = "Error";
    }
}

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
        if (!confirm('Delete this skill? This cannot be undone.')) return;

        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/skills/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            alert('Skill deleted.');
            window.location.href = 'skills.html';
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    fab.appendChild(editBtn);
    fab.appendChild(deleteBtn);
    return fab;
}

document.addEventListener('DOMContentLoaded', displaySkill);
