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

    const projectDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - projectDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return projectDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (projectDate >= startOfWeek && projectDate <= now) {
        return projectDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
               projectDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    
    if (projectDate.getFullYear() === now.getFullYear()) {
        return projectDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return projectDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getProjectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

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
    const projectId = getProjectIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const projectDetailThumbnail = document.getElementById('projectDetailThumbnail');
    const projectTitleElement = document.querySelector('.project-detail-title');
    const projectCategoryElement = document.querySelector('.project-meta .category');
    const datePostedElement = document.querySelector('.project-meta .date-posted');
    const lastUpdateElement = document.querySelector('.project-meta .last-updated');
    const projectContentElement = document.querySelector('.project-content-rendered');

    if (!projectId) {
        projectTitleElement.textContent = "Project Not Found";
        projectContentElement.innerHTML = "<p>No project ID provided in the URL.</p>";
        pageTitleElement.textContent = "Error";
        return;
    }

    const project = await fetchProject(projectId);

    // Added for debugging: Log the entire project object to the console
    console.log("Fetched project object:", project);

    if (project) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('project', project.id));
        }

        pageTitleElement.textContent = project.name;
        projectTitleElement.textContent = project.name;
        projectCategoryElement.textContent = project.category;
        datePostedElement.textContent = "Posted: " + formatDateTimeArray(project.datePosted);
        lastUpdateElement.textContent = "Last Updated: " + formatDateTimeArray(project.lastUpdated);
        
        // Display thumbnail if available
        if (project.thumbnailUrl) {
            // FIX: Prepend the SERVER_URL to the relative thumbnail path
            projectDetailThumbnail.src = project.thumbnailUrl;
            projectDetailThumbnail.style.display = 'block'; // Make it visible
        } else {
            projectDetailThumbnail.style.display = 'none'; // Hide if no thumbnail
        }

        projectContentElement.innerHTML = marked.parse(project.description);

        // Render skills sidebar if skills are attached
        renderSkillsSidebar(project.skills);
    } else {
        projectTitleElement.textContent = "Project Not Found";
        projectContentElement.innerHTML = "<p>The requested project could not be loaded.</p>";
        pageTitleElement.textContent = "Error";
    }
}

/**
 * Builds skill chip links in the left sidebar.
 * The sidebar stays hidden (display:none) if there are no skills.
 */
function renderSkillsSidebar(skills) {
    const sidebar = document.getElementById('projectSkillsSidebar');
    const list    = document.getElementById('projectSkillsList');
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
        if (!confirm('Delete this project? This cannot be undone.')) return;

        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/projects/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            alert('Project deleted.');
            window.location.href = 'projects.html';
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    fab.appendChild(editBtn);
    fab.appendChild(deleteBtn);
    return fab;
}
