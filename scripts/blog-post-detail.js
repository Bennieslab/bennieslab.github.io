const isAdmin = isLoggedIn();

async function fetchBlogPost(id) {
    try {
        const response = await fetch(`${SERVER_URL}/blog/${id}`);
        const postData = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return postData;
    } catch (error) {
        console.error("Error fetching blog post:", error);
        return null;
    }
}

async function displayBlogPost() {
    const postId = getIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const postDetailThumbnail = document.getElementById('postDetailThumbnail');
    const postTitleElement = document.querySelector('.post-detail-title');
    const postCategoryElement = document.querySelector('.post-meta .category');
    const datePostedElement = document.querySelector('.post-meta .date-posted');
    const lastUpdateElement = document.querySelector('.post-meta .last-updated');
    const postContentElement = document.querySelector('.post-content-rendered');

    if (!postId) {
        postTitleElement.textContent = "Post Not Found";
        postContentElement.innerHTML = "<p>No blog post ID provided in the URL.</p>";
        pageTitleElement.textContent = "Error";
        document.body.classList.remove('is-loading');
        return;
    }

    const post = await fetchBlogPost(postId);

    if (post) {
        if (isAdmin) {
            document.body.appendChild(buildAdminFab('blog', post.id, 'blogs.html'));
        }

        pageTitleElement.textContent = post.title;
        postTitleElement.textContent = post.title;
        postCategoryElement.textContent = post.category;
        datePostedElement.textContent = "Posted: " + formatDateTimeArray(post.datePosted);
        lastUpdateElement.textContent = "Last Updated: " + formatDateTimeArray(post.lastUpdated);

        if (post.thumbnailUrl) {
            postDetailThumbnail.src = post.thumbnailUrl;
            postDetailThumbnail.style.display = 'block';
        } else {
            postDetailThumbnail.style.display = 'none';
        }

        postContentElement.innerHTML = renderMarkdownWithMath(post.content);
        addCopyButtonsToCodeBlocks(postContentElement);
        highlightCodeBlocks(postContentElement);
        renderMathContent(postContentElement);

        // Render skills sidebar if skills are attached
        renderSkillsSidebar(post.skills);
    } else {
        postTitleElement.textContent = "Post Not Found";
        postContentElement.innerHTML = "<p>The requested blog post could not be loaded.</p>";
        pageTitleElement.textContent = "Error";
    }

    document.body.classList.remove('is-loading');
}

/**
 * Builds skill chip links in the left sidebar.
 * The sidebar stays hidden (display:none) if there are no skills.
 */
function renderSkillsSidebar(skills) {
    const sidebar = document.getElementById('postSkillsSidebar');
    const list = document.getElementById('postSkillsList');
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

document.addEventListener('DOMContentLoaded', displayBlogPost);