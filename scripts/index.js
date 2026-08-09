async function displayHighlights(containerSelector, apiPath, linkPrefix, cardClass, nameKey) {
    try {
        const response = await fetch(`${SERVER_URL}/${apiPath}?page=0&size=3`);
        if (!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        const highlightResponse = await response.json();
        const highlightData = Array.isArray(highlightResponse)
            ? highlightResponse
            : (highlightResponse.content || []);
        const container = document.querySelector(containerSelector);

        container.innerHTML = '';

        for (let i = 0; i < 3; i++) {
            const data = highlightData[i];
            const cardDiv = document.createElement("div");
            cardDiv.classList.add(cardClass);

            if (data) {
                cardDiv.addEventListener('click', () => {
                    window.location.href = `${linkPrefix}?id=${data.id}`;
                });

                const thumbContainer = document.createElement("div");
                thumbContainer.classList.add("thumbnail-container");
                if (data.thumbnailUrl) {
                    const img = document.createElement("img");
                    img.src = data.thumbnailUrl;
                    img.alt = data[nameKey] + " thumbnail";
                    img.classList.add("highlight-thumbnail-img", `${cardClass}-thumbnail-img`);
                    thumbContainer.appendChild(img);
                }

                const cardName = document.createElement("p");
                cardName.classList.add(`${cardClass}-name`);
                cardName.textContent = data[nameKey];

                cardDiv.appendChild(thumbContainer);
                cardDiv.appendChild(cardName);

            } else {
                cardDiv.innerHTML = '<div class="thumbnail-container"></div><p>Coming Soon...</p>';
            }

            container.appendChild(cardDiv);
        }

        initCarouselDots(container);
    } catch (error) {
        console.error(`Error displaying highlights from ${apiPath}: `, error);
        let container = document.querySelector(containerSelector);
        container.innerHTML = `<p>Error loading content.</p>`;
    }
}

function initCarouselDots(container) {
    const section = container.closest('.highlights > div');
    if (!section) return;

    const dotsContainer = section.querySelector('.carousel-dots');
    if (!dotsContainer) return;

    const cards = Array.from(container.children);
    dotsContainer.innerHTML = '';

    cards.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', `Show item ${index + 1}`);
        dot.addEventListener('click', () => {
            cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
        });
        dotsContainer.appendChild(dot);
    });

    const dots = Array.from(dotsContainer.children);
    const setActiveDot = () => {
        const cardWidth = cards[0]?.getBoundingClientRect().width || 1;
        const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
        const index = Math.round(container.scrollLeft / (cardWidth + gap));

        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === index);
        });
    };

    container.addEventListener('scroll', setActiveDot, { passive: true });
    window.addEventListener('resize', setActiveDot);
    setActiveDot();
}

document.addEventListener('DOMContentLoaded', () => {
    displayHighlights(".projects .cards", "projects", "project-detail.html", "project", "name");
    displayHighlights(".posts .cards", "blog", "blog-post-detail.html", "post", "title");
    displayHighlights(".skills .cards", "skills", "skill-detail.html", "skill", "name");
});