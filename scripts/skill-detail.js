const isAdmin = isLoggedIn();

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

async function fetchAllContent(path) {
    try {
        const response = await fetch(`${SERVER_URL}${path}`);
        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return null;
    }
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
        projectsLink.href = `projects.html?skillId=${encodeURIComponent(skillId)}`;
    }
    if (postsLink) {
        postsLink.href = `blogs.html?skillId=${encodeURIComponent(skillId)}`;
    }

    const encodedSkillId = encodeURIComponent(skillId);
    const [projects, posts] = await Promise.all([
        fetchAllContent(`/projects?skillId=${encodedSkillId}`),
        fetchAllContent(`/blog?skillId=${encodedSkillId}`)
    ]);

    // Leave the loading animation in place if a fetch failed, rather than
    // crashing or falling back to a misleading "0".
    if (Array.isArray(projects)) {
        projectsCountElement.textContent = projects.filter(project => itemHasSkill(project, skillId)).length;
    }
    if (Array.isArray(posts)) {
        postsCountElement.textContent = posts.filter(post => itemHasSkill(post, skillId)).length;
    }
}

async function displaySkill() {
    const skillId = getIdFromUrl();
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
        document.body.classList.remove('is-loading');
        return;
    }

    const skill = await fetchSkill(skillId);

    if (skill) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('skill', skill.id, 'skills.html'));
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

        skillContentElement.innerHTML = renderMarkdownWithMath(skill.description);
        addCopyButtonsToCodeBlocks(skillContentElement);
        highlightCodeBlocks(skillContentElement);
        renderMathContent(skillContentElement);
        displaySkillCounts(skill.id);
    } else {
        skillTitleElement.textContent = "Skill Not Found";
        skillContentElement.innerHTML = "<p>The requested skill could not be loaded.</p>";
        pageTitleElement.textContent = "Error";
    }

    document.body.classList.remove('is-loading');
}

document.addEventListener('DOMContentLoaded', displaySkill);