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

    const postDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24 && diffHours >= 0) {
        return postDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    if (postDate >= startOfWeek && postDate <= now) {
        return postDate.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
            postDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    if (postDate.getFullYear() === now.getFullYear()) {
        return postDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }

    return postDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getBlogPostIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

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

/**
 * Runs highlight.js over every code block inside the rendered post content.
 * Safe to call even if the highlight.js script hasn't loaded for some reason.
 */
function highlightCodeBlocks(container) {
    if (!window.hljs || !container) return;
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

/**
 * Parses markdown while protecting $...$/$$...$$ math segments from
 * marked's own backslash-escaping first.
 *
 * CommonMark treats backslash + ASCII punctuation as an escape sequence
 * and strips the backslash — this isn't just the \( \( \[ \] delimiter
 * problem from before, it hits ANY backslash-punctuation LaTeX command
 * inside math too: \, (thin space), \%, \_, \&, etc. all get silently
 * mangled by marked before KaTeX ever sees them (e.g. "2t\,\mathbf{D}"
 * comes out as "2t,\mathbf{D}" — a stray literal comma in the equation).
 *
 * The fix: pull math segments out into plain alphanumeric placeholder
 * tokens (which markdown can't misinterpret or alter) before handing the
 * content to marked, then swap the original, untouched LaTeX back in
 * after marked has produced its HTML. KaTeX's auto-render then sees the
 * real source with every backslash intact.
 *
 * Known limitation (inherited from the $-delimiter choice, not new here):
 * a literal "$" not meant as math can still be misread as an opening
 * delimiter if a closing "$" appears later on the same line — same
 * trade-off already accepted for auto-render itself.
 */
function renderMarkdownWithMath(markdownSource) {
    if (!markdownSource) return '';

    const mathSegments = [];
    const protect = (match) => {
        const token = `MATHSEGMENTPLACEHOLDER${mathSegments.length}ENDPLACEHOLDER`;
        mathSegments.push(match);
        return token;
    };

    // Order matters: pull out $$...$$ blocks first so the single-$ pass
    // below can't split one in half.
    const withPlaceholders = markdownSource
        .replace(/\$\$[\s\S]+?\$\$/g, protect)
        .replace(/\$[^$\n]+?\$/g, protect);

    let html = marked.parse(withPlaceholders);

    mathSegments.forEach((segment, index) => {
        const token = `MATHSEGMENTPLACEHOLDER${index}ENDPLACEHOLDER`;
        html = html.split(token).join(segment);
    });

    return html;
}

async function displayBlogPost() {
    const postId = getBlogPostIdFromUrl();
    const pageTitleElement = document.getElementById('pageTitle');
    const postDetailThumbnail = document.getElementById('postDetailThumbnail'); // New
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
            document.body.appendChild(buildAdminFab('blog', post.id));
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

/**
 * Runs KaTeX auto-render over the post content to typeset LaTeX.
 * Safe to call even if the KaTeX script hasn't loaded for some reason.
 * Uses $...$ (inline) and $$...$$ (display) as delimiters. Backslash
 * forms like \( \) and \[ \] don't survive markdown's own escaping
 * (marked strips the backslash before punctuation, e.g. \( -> ( ),
 * so dollar delimiters are the only reliable option here. Content
 * inside <code>/<pre> is skipped automatically by auto-render, so
 * shell/JS variables like $HOME or $\{value} in code blocks are safe.
 */
function renderMathContent(container) {
    if (!window.renderMathInElement || !container) return;
    renderMathInElement(container, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
        ],
        throwOnError: false
    });
}

document.addEventListener('DOMContentLoaded', displayBlogPost);

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
        if (!confirm('Delete this post? This cannot be undone.')) return;

        const token = localStorage.getItem('jwt_token');
        try {
            const response = await fetch(`${SERVER_URL}/blog/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Your session has expired. Please log in again through the admin panel.');
                return;
            }

            if (!response.ok) throw new Error(`Delete failed: ${response.status}`);

            alert('Post deleted.');
            window.location.href = 'blogs.html';
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Could not delete this item.');
        }
    });

    fab.appendChild(editBtn);
    fab.appendChild(deleteBtn);
    return fab;
}

function addCopyButtonsToCodeBlocks(container) {
    if (!container) return;
    container.querySelectorAll('pre').forEach((pre) => {
        if (pre.querySelector('.code-copy-btn')) return; // avoid duplicates

        pre.classList.add('code-block-wrapper');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'code-copy-btn';
        btn.setAttribute('aria-label', 'Copy code');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

        btn.addEventListener('click', async () => {
            const code = pre.querySelector('code');
            const text = code ? code.innerText : pre.innerText;
            try {
                await navigator.clipboard.writeText(text);
                btn.classList.add('is-copied');
                btn.setAttribute('aria-label', 'Copied!');
                setTimeout(() => {
                    btn.classList.remove('is-copied');
                    btn.setAttribute('aria-label', 'Copy code');
                }, 1500);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });

        pre.appendChild(btn);
    });
}