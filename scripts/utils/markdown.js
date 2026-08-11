/**
 * Shared Markdown / code / math rendering helpers used by every detail page.
 * Load via <script> BEFORE any page-level script that uses them.
 */

/**
 * Runs highlight.js over every code block inside the rendered content.
 * Safe to call even if the highlight.js script hasn't loaded.
 */
function highlightCodeBlocks(container) {
    if (!window.hljs || !container) return;
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

/**
 * Runs KaTeX auto-render over the content to typeset LaTeX.
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

/**
 * Parses markdown while protecting $...$/$$...$$ math segments from
 * marked's own backslash-escaping first.
 *
 * CommonMark treats backslash + ASCII punctuation as an escape sequence
 * and strips the backslash — this isn't just the \( \) \[ \] delimiter
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

/**
 * Adds copy-to-clipboard buttons on every code block inside the container.
 * Safe to call repeatedly (existing buttons are skipped).
 */
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

/**
 * Wraps every top-level <table> inside the container in a horizontally
 * scrollable wrapper div so wide tables can scroll instead of cramming.
 * Safe to call repeatedly (already-wrapped tables are skipped).
 */
function wrapTablesForScroll(container) {
    if (!container) return;
    container.querySelectorAll('table').forEach((table) => {
        if (table.parentElement && table.parentElement.classList.contains('content-table-wrapper')) return; // avoid duplicates

        const wrapper = document.createElement('div');
        wrapper.className = 'content-table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}

// Expose as globals for plain <script> pages.
window.highlightCodeBlocks = highlightCodeBlocks;
window.renderMathContent = renderMathContent;
window.renderMarkdownWithMath = renderMarkdownWithMath;
window.addCopyButtonsToCodeBlocks = addCopyButtonsToCodeBlocks;
window.wrapTablesForScroll = wrapTablesForScroll;
