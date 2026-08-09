const isAdmin = isLoggedIn();

const PAGE_SIZE = 6;
let activeFilters = { category: 'all', skillId: 'all' };
let filterCategories = [];
let filterSkills = [];

async function fetchModels(page = 0, size = PAGE_SIZE, filters = {}) {
    try {
        const params = new URLSearchParams({ page, size });
        if (filters.category && filters.category !== 'all') {
            params.set('category', filters.category);
        }
        if (filters.skillId && filters.skillId !== 'all') {
            params.set('skillId', filters.skillId);
        }
        let response = await fetch(`${SERVER_URL}/models?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return await response.json(); // Spring Page<ModelDto>
    } catch (error) {
        console.error("Error fetching models: ", error);
        return null;
    }
}

function renderModels(models) {
    let modelsContainer = document.querySelector(".model-cards");
    if (!modelsContainer) {
        console.error("No element with class 'model-cards' found.");
        return;
    }
    modelsContainer.innerHTML = "";

    if (!models || models.length === 0) {
        modelsContainer.innerHTML = "<p>No models to display yet.</p>";
        return;
    }

    models.forEach(model => {
        let modelDiv = document.createElement("div");
        modelDiv.classList.add("model");
        if (model.pinned) modelDiv.classList.add("pinned-item");
        modelDiv.addEventListener('click', () => {
            window.location.href = `model-detail.html?id=${model.id}`;
        });

        let modelThumbnail = document.createElement("div");
        modelThumbnail.classList.add("thumbnail-container");
        if (model.thumbnailUrl) {
            let img = document.createElement("img");
            img.src = model.thumbnailUrl;
            img.alt = model.name + " thumbnail";
            img.classList.add("model-thumbnail-img");
            modelThumbnail.appendChild(img);
        }

        let modelMetadata = document.createElement("div");
        modelMetadata.classList.add("metadata");

        let modelNameElement = document.createElement("h2");
        let descriptionElement = document.createElement("p");
        let categoryElement = document.createElement("span");
        let datePostedElement = document.createElement("span");

        modelNameElement.classList.add("model-title");
        descriptionElement.classList.add("model-content");
        categoryElement.classList.add("category");
        datePostedElement.classList.add("date-posted");

        modelNameElement.textContent = model.name;
        if (model.pinned) {
            modelNameElement.prepend(createPinBadge());
        }
        descriptionElement.textContent = getPlainTextSnippet(model.description, 120);
        categoryElement.textContent = model.category;
        datePostedElement.textContent = "Posted: " + formatDateTimeArray(model.datePosted);

        modelMetadata.appendChild(modelNameElement);
        modelMetadata.appendChild(descriptionElement);
        modelMetadata.appendChild(categoryElement);
        modelMetadata.appendChild(datePostedElement);

        modelDiv.appendChild(modelThumbnail);
        modelDiv.appendChild(modelMetadata);

        if (isAdmin) {
            modelDiv.appendChild(buildAdminControls('model', model.id, () => pager.loadPage(pager.currentPage)));
        }

        modelsContainer.appendChild(modelDiv);
    });
}

const pager = createPaginationState({
    container: document.getElementById("pagination-models"),
    fetcher: (page, size) => fetchModels(page, size, activeFilters),
    render: (items) => renderModels(items),
    onLoaded: () => updateFilterSummary(activeFilters, 'All models', filterSkills),
    onError: () => {
        document.querySelector(".model-cards").innerHTML = "<p>Error loading models.</p>";
    },
    pageSize: PAGE_SIZE
});

function onFilterChange() {
    syncFilterUrl(activeFilters);
    pager.loadPage(0);
}

async function initializeModels() {
    try {
        const url = new URL(window.location.href);
        activeFilters.category = url.searchParams.get('category') || 'all';
        activeFilters.skillId = url.searchParams.get('skillId') || url.searchParams.get('skill') || 'all';

        const [categories, skills] = await Promise.all([
            fetchCategories('/models/categories'),
            fetchSkillOptions()
        ]);

        filterCategories = categories;
        filterSkills = skills;
        renderFilterControls({
            activeFilters,
            filterCategories,
            filterSkills,
            categoryLabelId: 'modelCategoryFilterLabel',
            skillLabelId: 'modelSkillFilterLabel',
            categorySelectId: 'modelCategoryFilter',
            skillSelectId: 'modelSkillFilter',
            allLabel: 'All models',
            onChange: onFilterChange
        });
        await pager.loadPage(0);
    } catch (error) {
        console.error('Error initializing models:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeModels);