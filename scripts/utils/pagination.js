/**
 * Shared pagination helpers.
 * Load via <script> BEFORE any page-level script that uses them.
 */

/**
 * Renders Prev/Next + page-number buttons into the given container,
 * and calls `onPageChange(pageIndex)` when a button is clicked.
 * Matches the visual/behavioral pattern used across list pages.
 */
function renderPagination(currentPage, totalPages, onPageChange, container) {
    if (!container) return;
    container.innerHTML = "";

    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "← Previous";
    prevBtn.disabled = currentPage === 0;
    prevBtn.id = "page-prev";
    prevBtn.addEventListener("click", () => onPageChange(currentPage - 1));
    container.appendChild(prevBtn);

    const maxButtons = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxButtons - 1);
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
        if (i === currentPage) pageBtn.classList.add("active");
        const pageIndex = i;
        pageBtn.addEventListener("click", () => onPageChange(pageIndex));
        container.appendChild(pageBtn);
    }

    if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "…";
        ellipsis.classList.add("pagination-ellipsis");
        container.appendChild(ellipsis);
    }

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next →";
    nextBtn.disabled = currentPage >= totalPages - 1;
    nextBtn.id = "page-next";
    nextBtn.addEventListener("click", () => onPageChange(currentPage + 1));
    container.appendChild(nextBtn);
}

/**
 * Wraps the standard per-page state + "load a page" flow used by every
 * paginated list page (projects, blog, models, skills).
 *
 * Example:
 *   const pager = createPaginationState({
 *       container: document.getElementById("pagination-projects"),
 *       fetcher: (page, size) => fetchProjects(page, size, activeFilters),
 *       render: (items) => renderProjects(items),
 *       onLoaded: () => updateFilterSummary()
 *   });
 *   pager.loadPage(0);
 */
function createPaginationState({ container, fetcher, render, onLoaded, onError, pageSize = 6 }) {
    let currentPage = 0;
    let totalPages = 1;
    let pageLoading = false;

    async function loadPage(page) {
        if (pageLoading) return;
        pageLoading = true;
        const loader = window.showActionLoader
            ? showActionLoader(container, { variant: 'block', disable: false })
            : null;
        currentPage = page;
        try {
            const data = await fetcher(page, pageSize);
            if (!data) {
                render(null);
                if (onError) onError();
                return;
            }
            totalPages = data.totalPages || 1;
            render(data.content);
            renderPagination(currentPage, totalPages, loadPage, container);
            if (onLoaded) onLoaded();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            if (loader) loader.hide();
            pageLoading = false;
        }
    }

    return {
        get currentPage() { return currentPage; },
        get totalPages() { return totalPages; },
        loadPage
    };
}

// Expose as globals for plain <script> pages.
window.renderPagination = renderPagination;
window.createPaginationState = createPaginationState;