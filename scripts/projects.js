const isAdmin = isLoggedIn();

const PAGE_SIZE = 6;
let activeFilters = { category: 'all', skillId: 'all' };
let filterCategories = [];
let filterSkills = [];

async function fetchProjects(page = 0, size = PAGE_SIZE, filters = {}) {
    try {
        const params = new URLSearchParams({ page, size });
        if (filters.category && filters.category !== 'all') {
            params.set('category', filters.category);
        }
        if (filters.skillId && filters.skillId !== 'all') {
            params.set('skillId', filters.skillId);
        }
        let response = await fetch(`${SERVER_URL}/projects?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return await response.json(); // Spring Page<ProjectDto>
    } catch (error) {
        console.error("Error fetching projects: ", error);
        return null;
    }
}

function renderProjects(projects) {
    let projectsContainer = document.querySelector(".project-cards");
    if (!projectsContainer) {
        console.error("No element with class 'project-cards' found.");
        return;
    }
    projectsContainer.innerHTML = "";

    if (!projects || projects.length === 0) {
        projectsContainer.innerHTML = "<p>No projects to display yet.</p>";
        return;
    }

    projects.forEach(project => {
        let projectDiv = document.createElement("div");
        projectDiv.classList.add("project");
        if (project.pinned) projectDiv.classList.add("pinned-item");
        projectDiv.addEventListener('click', () => {
            window.location.href = `project-detail.html?id=${project.id}`;
        });

        let projectThumbnail = document.createElement("div");
        projectThumbnail.classList.add("thumbnail-container");
        if (project.thumbnailUrl) {
            let img = document.createElement("img");
            img.src = project.thumbnailUrl;
            img.alt = project.name + " thumbnail";
            img.classList.add("project-thumbnail-img");
            projectThumbnail.appendChild(img);
        }

        let projectMetadata = document.createElement("div");
        projectMetadata.classList.add("metadata");

        let projectNameElement = document.createElement("h2");
        let descriptionElement = document.createElement("p");
        let categoryElement = document.createElement("span");
        let datePostedElement = document.createElement("span");

        projectNameElement.classList.add("project-title");
        descriptionElement.classList.add("project-content");
        categoryElement.classList.add("category");
        datePostedElement.classList.add("date-posted");

        projectNameElement.textContent = project.name;
        if (project.pinned) {
            projectNameElement.prepend(createPinBadge());
        }
        descriptionElement.textContent = getPlainTextSnippet(project.description, 120);
        categoryElement.textContent = project.category;
        datePostedElement.textContent = "Posted: " + formatDateTimeArray(project.datePosted);

        projectMetadata.appendChild(projectNameElement);
        projectMetadata.appendChild(descriptionElement);
        projectMetadata.appendChild(categoryElement);
        projectMetadata.appendChild(datePostedElement);

        projectDiv.appendChild(projectThumbnail);
        projectDiv.appendChild(projectMetadata);

        if (isAdmin) {
            projectDiv.appendChild(buildAdminControls('project', project.id, () => pager.loadPage(pager.currentPage)));
        }

        projectsContainer.appendChild(projectDiv);
    });
}

const pager = createPaginationState({
    container: document.getElementById("pagination-projects"),
    fetcher: (page, size) => fetchProjects(page, size, activeFilters),
    render: (items) => renderProjects(items),
    onLoaded: () => updateFilterSummary(activeFilters, 'All projects', filterSkills),
    onError: () => {
        document.querySelector(".project-cards").innerHTML = "<p>Error loading projects.</p>";
    },
    pageSize: PAGE_SIZE
});

function onFilterChange() {
    syncFilterUrl(activeFilters);
    pager.loadPage(0);
}

async function initializeProjects() {
    try {
        const url = new URL(window.location.href);
        activeFilters.category = url.searchParams.get('category') || 'all';
        activeFilters.skillId = url.searchParams.get('skillId') || url.searchParams.get('skill') || 'all';

        const [categories, skills] = await Promise.all([
            fetchCategories('/projects/categories'),
            fetchSkillOptions()
        ]);

        filterCategories = categories;
        filterSkills = skills;
        renderFilterControls({
            activeFilters,
            filterCategories,
            filterSkills,
            categoryLabelId: 'projectCategoryFilterLabel',
            skillLabelId: 'projectSkillFilterLabel',
            categorySelectId: 'projectCategoryFilter',
            skillSelectId: 'projectSkillFilter',
            allLabel: 'All projects',
            onChange: onFilterChange
        });
        await pager.loadPage(0);
    } catch (error) {
        console.error('Error initializing projects:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeProjects);