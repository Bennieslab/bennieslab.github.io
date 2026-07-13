const SERVER_URL = "https://bennieslab-backend.onrender.com";
const isAdmin = !!localStorage.getItem('jwt_token');

const PAGE_SIZE = 12;
let currentPage = 0;
let totalPages = 1;

async function fetchSkills(page = 0, size = PAGE_SIZE) {
    try {
        const response = await fetch(`${SERVER_URL}/skills?page=${page}&size=${size}`);
        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return await response.json(); // Spring Page<SkillDto>
    } catch (error) {
        console.error("Error fetching skills: ", error);
        return null;
    }
}

function renderSkills(skills) {
    const skillsContainer = document.querySelector(".skills");
    if (!skillsContainer) {
        console.error("No element with class 'skills' found.");
        return;
    }
    skillsContainer.innerHTML = '';

    if (!skills || skills.length === 0) {
        skillsContainer.innerHTML = "<p>No skills found.</p>";
        return;
    }

    skills.forEach(skill => {
        let skillDiv = document.createElement("div");
        skillDiv.classList.add("skill");
        if (skill.pinned) skillDiv.classList.add("pinned-item");
        skillDiv.addEventListener('click', () => {
            window.location.href = `skill-detail.html?id=${skill.id}`;
        });

        let skillThumbnail = document.createElement("div");
        skillThumbnail.classList.add("skill-thumbnail");

        if (skill.thumbnailUrl) {
            let img = document.createElement("img");
            img.src = skill.thumbnailUrl;
            img.alt = skill.name + " thumbnail";
            skillThumbnail.appendChild(img);
        }

        let skillName = document.createElement("h3");
        skillName.textContent = skill.name;
        if (skill.pinned) {
            const pin = document.createElement("span");
            pin.classList.add("pin-badge");
            pin.textContent = "📌";
            skillName.prepend(pin);
        }

        skillDiv.appendChild(skillThumbnail);
        skillDiv.appendChild(skillName);

        if (isAdmin) {
            skillDiv.appendChild(buildAdminControls('skill', skill.id));
        }

        skillsContainer.appendChild(skillDiv);
    });
}

function renderPagination(currentPg, totalPgs) {
    const container = document.getElementById("pagination-skills");
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
    currentPage = page;
    const data = await fetchSkills(page, PAGE_SIZE);
    if (!data) {
        document.querySelector(".skills").innerHTML = "<p>Error loading skills.</p>";
        return;
    }
    totalPages = data.totalPages;
    renderSkills(data.content);
    renderPagination(currentPage, totalPages);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            const response = await fetch(`${SERVER_URL}/skills/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            loadPage(currentPage);
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    return controls;
}

loadPage(0);
