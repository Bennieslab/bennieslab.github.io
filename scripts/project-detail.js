const isAdmin = isLoggedIn();

async function fetchProject(id) {
    try {
        const response = await fetch(`${SERVER_URL}/projects/${id}`);
        const projectData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return projectData;
    } catch (error) {
        console.error("Error fetching project:", error);
        return null;
    }
}

async function displayProject() {
    const projectId = getIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const projectDetailThumbnail = document.getElementById('projectDetailThumbnail');
    const projectTitleElement = document.querySelector('.project-detail-title');
    const projectCategoryElement = document.querySelector('.project-meta .category');
    const projectGithubRow = document.querySelector('.project-github-row');
    const projectGithubElement = document.querySelector('.github-url');
    const datePostedElement = document.querySelector('.project-meta .date-posted');
    const lastUpdateElement = document.querySelector('.project-meta .last-updated');
    const projectContentElement = document.querySelector('.project-content-rendered');

    if (!projectId) {
        projectTitleElement.textContent = "Project Not Found";
        projectContentElement.innerHTML = "<p>No project ID provided in the URL.</p>";
        pageTitleElement.textContent = "Error";
        document.body.classList.remove('is-loading');
        return;
    }

    const project = await fetchProject(projectId);

    if (project) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('project', project.id, 'projects.html'));
        }

        pageTitleElement.textContent = project.name;
        projectTitleElement.textContent = project.name;
        projectCategoryElement.textContent = project.category;
        datePostedElement.textContent = formatDateTimeArray(project.datePosted);
        lastUpdateElement.textContent = formatDateTimeArray(project.lastUpdated);
        renderGithubUrl(project, projectGithubRow, projectGithubElement);

        // Display thumbnail if available
        if (project.thumbnailUrl) {
            projectDetailThumbnail.src = project.thumbnailUrl;
            projectDetailThumbnail.style.display = 'block';
        } else {
            projectDetailThumbnail.style.display = 'none';
        }

        projectContentElement.innerHTML = renderMarkdownWithMath(project.description);
        addCopyButtonsToCodeBlocks(projectContentElement);
        highlightCodeBlocks(projectContentElement);
        renderMathContent(projectContentElement);

        // Render skills sidebar if skills are attached
        renderSkillsSidebar(project.skills);
    } else {
        projectTitleElement.textContent = "Project Not Found";
        projectContentElement.innerHTML = "<p>The requested project could not be loaded.</p>";
        pageTitleElement.textContent = "Error";
    }

    document.body.classList.remove('is-loading');
}

function renderGithubUrl(project, row, link) {
    if (!row || !link) return;

    const githubUrl = project.githubUrl || project.gitHubUrl || project.repositoryUrl || project.repoUrl;
    if (!githubUrl) {
        row.hidden = true;
        return;
    }

    link.href = githubUrl;
    link.textContent = githubUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    row.hidden = false;
}

/**
 * Builds skill chip links in the left sidebar.
 * The sidebar stays hidden (display:none) if there are no skills.
 */
function renderSkillsSidebar(skills) {
    const sidebar = document.getElementById('projectSkillsSidebar');
    const list = document.getElementById('projectSkillsList');
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

document.addEventListener('DOMContentLoaded', displayProject);