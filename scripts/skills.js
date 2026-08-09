const isAdmin = isLoggedIn();

const PAGE_SIZE = 12;

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
            skillName.prepend(createPinBadge());
        }

        skillDiv.appendChild(skillThumbnail);
        skillDiv.appendChild(skillName);

        if (isAdmin) {
            skillDiv.appendChild(buildAdminControls('skill', skill.id, () => pager.loadPage(pager.currentPage)));
        }

        skillsContainer.appendChild(skillDiv);
    });
}

const pager = createPaginationState({
    container: document.getElementById("pagination-skills"),
    fetcher: (page, size) => fetchSkills(page, size),
    render: (items) => renderSkills(items),
    onError: () => {
        document.querySelector(".skills").innerHTML = "<p>Error loading skills.</p>";
    },
    pageSize: PAGE_SIZE
});

pager.loadPage(0);