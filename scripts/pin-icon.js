(function () {
    window.createPinBadge = function createPinBadge() {
        const badge = document.createElement('span');
        badge.className = 'pin-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 3.5 20 14l-3 1-4.5-4.5-4.8 4.8c-.4.4-.6.9-.7 1.5L7 19.5 4.5 22 3 20.5l2.5-2.5.7-.5c.6-.1 1.1-.3 1.5-.7l4.8-4.8L8 7.5l1-3.9.5-.1Z" /></svg>';
        return badge;
    };

    window.getPinBadgeHtml = function getPinBadgeHtml() {
        return '<span class="pin-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 3.5 20 14l-3 1-4.5-4.5-4.8 4.8c-.4.4-.6.9-.7 1.5L7 19.5 4.5 22 3 20.5l2.5-2.5.7-.5c.6-.1 1.1-.3 1.5-.7l4.8-4.8L8 7.5l1-3.9.5-.1Z" /></svg></span>';
    };
}());
