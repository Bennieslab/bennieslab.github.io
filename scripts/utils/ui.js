/**
 * Shared filter / selection UI helpers.
 * Load via <script> BEFORE any page-level script that uses them.
 * Requires custom-select.js to be loaded first.
 */

/**
 * Fetches the filterable category list for an endpoint.
 * e.g. fetchCategories('/projects/categories') → ["Web", "Mobile", ...]
 */
async function fetchCategories(categoriesPath) {
    try {
        const response = await fetch(`${SERVER_URL}${categoriesPath}`);
        if (!response.ok) throw new Error(`HTTP error. Status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching categories (${categoriesPath}):`, error);
        return [];
    }
}

/** Fetches the full skills list for the skill filter dropdown. */
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

/**
 * Writes the active category/skillId filters into the URL query string
 * (replacing the current history entry).
 */
function syncFilterUrl(activeFilters) {
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

/**
 * Updates the "filter summary" line under the filter buttons.
 *
 * @param {object} activeFilters  { category, skillId }
 * @param {string} allLabel       e.g. 'All projects'
 * @param {Array}  [skills]       skill objects for resolving skill names
 */
function updateFilterSummary(activeFilters, allLabel, skills) {
    const summary = document.getElementById('filterSummary');
    if (!summary) return;

    const parts = [];
    if (activeFilters.category !== 'all') parts.push(`Category: ${activeFilters.category}`);
    if (activeFilters.skillId !== 'all') {
        const skill = (skills || []).find(item => String(item.id) === String(activeFilters.skillId));
        parts.push(`Skill: ${skill ? skill.name : activeFilters.skillId}`);
    }

    summary.textContent = parts.length ? parts.join(' · ') : allLabel;
}

/**
 * Renders the category + skill custom-select dropdowns into the page's
 * `.filters` markup. The page must contain elements with classes
 * `.filters`, `.tags`, `.filter-dropdowns` (matching other list pages).
 *
 * @param {object} options
 * @param {object} options.activeFilters     { category, skillId }
 * @param {Array}  options.filterCategories  string category list
 * @param {Array}  options.filterSkills      skill objects
 * @param {string} options.categoryLabelId   e.g. 'projectCategoryFilterLabel'
 * @param {string} options.skillLabelId      e.g. 'projectSkillFilterLabel'
 * @param {string} options.categorySelectId  e.g. 'projectCategoryFilter'
 * @param {string} options.skillSelectId     e.g. 'projectSkillFilter'
 * @param {string} options.allLabel          e.g. 'All projects' (filter summary)
 * @param {Function} options.onChange        called after any filter changes
 */
function renderFilterControls({
    activeFilters,
    filterCategories,
    filterSkills,
    categoryLabelId,
    skillLabelId,
    categorySelectId,
    skillSelectId,
    allLabel,
    onChange
}) {
    const filters = document.querySelector('.filters');
    const tags = document.querySelector('.tags');
    const dropdowns = document.querySelector('.filter-dropdowns');
    if (!filters || !tags || !dropdowns) return;

    filters.style.display = 'flex';
    tags.innerHTML = `
        <button type="button" class="filter-clear-btn" id="clearFilters">Clear filters</button>
        <span class="filter-status" id="filterSummary">${allLabel}</span>
    `;
    dropdowns.innerHTML = `
        <div class="filter-control">
            <span class="filter-control-label" id="${categoryLabelId}">Category</span>
        </div>
        <div class="filter-control">
            <span class="filter-control-label" id="${skillLabelId}">Skill</span>
        </div>
    `;

    const [categoryControl, skillControl] = dropdowns.querySelectorAll('.filter-control');

    const categorySelect = createCustomSelect({
        id: categorySelectId,
        options: [
            { value: 'all', label: 'All categories' },
            ...filterCategories.map(category => ({ value: category, label: category }))
        ],
        value: activeFilters.category,
        onChange: (value) => {
            activeFilters.category = value;
            onChange();
        }
    });
    categoryControl.appendChild(categorySelect.element);
    categoryControl.querySelector('.custom-select-trigger').setAttribute('aria-labelledby', categoryLabelId);

    const skillSelect = createCustomSelect({
        id: skillSelectId,
        options: [
            { value: 'all', label: 'All skills' },
            ...filterSkills.map(skill => ({ value: skill.id, label: skill.name }))
        ],
        value: activeFilters.skillId,
        onChange: (value) => {
            activeFilters.skillId = value;
            onChange();
        }
    });
    skillControl.appendChild(skillSelect.element);
    skillControl.querySelector('.custom-select-trigger').setAttribute('aria-labelledby', skillLabelId);

    document.getElementById('clearFilters').addEventListener('click', () => {
        activeFilters.category = 'all';
        activeFilters.skillId = 'all';
        categorySelect.setValue('all');
        skillSelect.setValue('all');
        onChange();
    });

    return { categorySelect, skillSelect };
}

// Expose as globals for plain <script> pages.
window.fetchCategories = fetchCategories;
window.fetchSkillOptions = fetchSkillOptions;
window.syncFilterUrl = syncFilterUrl;
window.updateFilterSummary = updateFilterSummary;
window.renderFilterControls = renderFilterControls;