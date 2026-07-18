const SERVER_URL = "https://bennieslab-backend.onrender.com";
const isAdmin = !!localStorage.getItem('jwt_token');

const PAGE_SIZE = 6;
let currentPage = 0;
let totalPages = 1;
let pageLoading = false;
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

    const modelDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - modelDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return modelDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (modelDate >= startOfWeek && modelDate <= now) {
        return modelDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
            modelDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (modelDate.getFullYear() === now.getFullYear()) {
        return modelDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return modelDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
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

async function fetchModelCategories() {
    try {
        const response = await fetch(`${SERVER_URL}/models/categories`);
        if (!response.ok) throw new Error(`HTTP error. Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching model categories:', error);
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

    summary.textContent = parts.length ? parts.join(' · ') : 'All models';
}

let modelCategorySelect = null;
let modelSkillSelect = null;

function renderFilterControls() {
    const filters = document.querySelector('.filters');
    const tags = document.querySelector('.tags');
    const dropdowns = document.querySelector('.filter-dropdowns');
    if (!filters || !tags || !dropdowns) return;

    filters.style.display = 'flex';
    tags.innerHTML = `
        <button type="button" class="filter-clear-btn" id="clearFilters">Clear filters</button>
        <span class="filter-status" id="filterSummary">All models</span>
    `;
    dropdowns.innerHTML = `
        <div class="filter-control">
            <span class="filter-control-label" id="modelCategoryFilterLabel">Category</span>
        </div>
        <div class="filter-control">
            <span class="filter-control-label" id="modelSkillFilterLabel">Skill</span>
        </div>
    `;

    const [categoryControl, skillControl] = dropdowns.querySelectorAll('.filter-control');

    modelCategorySelect = createCustomSelect({
        id: 'modelCategoryFilter',
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
    categoryControl.appendChild(modelCategorySelect.element);
    categoryControl.querySelector('.custom-select-trigger').setAttribute('aria-labelledby', 'modelCategoryFilterLabel');

    modelSkillSelect = createCustomSelect({
        id: 'modelSkillFilter',
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
    skillControl.appendChild(modelSkillSelect.element);
    skillControl.querySelector('.custom-select-trigger').setAttribute('aria-labelledby', 'modelSkillFilterLabel');

    document.getElementById('clearFilters').addEventListener('click', () => {
        activeFilters = { category: 'all', skillId: 'all' };
        modelCategorySelect.setValue('all');
        modelSkillSelect.setValue('all');
        syncFilterUrl();
        currentPage = 0;
        loadPage(0);
    });

    updateFilterSummary();
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
            modelDiv.appendChild(buildAdminControls('model', model.id));
        }

        modelsContainer.appendChild(modelDiv);
    });
}

function renderPagination(currentPg, totalPgs) {
    const container = document.getElementById("pagination-models");
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
    const paginationContainer = document.getElementById("pagination-models");
    const loader = window.showActionLoader
        ? showActionLoader(paginationContainer, { variant: 'block', disable: false })
        : null;
    currentPage = page;
    try {
        const data = await fetchModels(page, PAGE_SIZE, activeFilters);
        if (!data) {
            document.querySelector(".model-cards").innerHTML = "<p>Error loading models.</p>";
            return;
        }
        totalPages = data.totalPages || 1;
        renderModels(data.content);
        renderPagination(currentPage, totalPages);
        updateFilterSummary();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
        if (loader) loader.hide();
        pageLoading = false;
    }
}

async function initializeModels() {
    try {
        const url = new URL(window.location.href);
        activeFilters.category = url.searchParams.get('category') || 'all';
        activeFilters.skillId = url.searchParams.get('skillId') || url.searchParams.get('skill') || 'all';

        const [categories, skills] = await Promise.all([
            fetchModelCategories(),
            fetchSkillOptions()
        ]);

        filterCategories = categories;
        filterSkills = skills;
        renderFilterControls();
        await loadPage(0);
    } catch (error) {
        console.error('Error initializing models:', error);
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
        if (!confirm(`Delete this ${type}? This cannot be undone.`)) return;

        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/models/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            await initializeModels();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    return controls;
}

document.addEventListener('DOMContentLoaded', initializeModels);