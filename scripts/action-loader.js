(function () {
    const activeLoaders = new WeakMap();

    function resolveTarget(target) {
        if (typeof target === 'string') return document.querySelector(target);
        return target;
    }

    window.showActionLoader = function showActionLoader(target, options = {}) {
        const element = resolveTarget(target);
        if (!element) return null;

        if (activeLoaders.has(element)) return activeLoaders.get(element);

        const loader = document.createElement('span');
        loader.className = `action-loader action-loader--${options.variant || 'inline'}`;
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-label', options.label || 'Loading');

        if (options.disable !== false && 'disabled' in element) {
            element.disabled = true;
            element.classList.add('is-loading');
        }

        if (options.placement === 'inside') {
            element.appendChild(loader);
        } else if (options.placement === 'before') {
            element.parentNode.insertBefore(loader, element);
        } else {
            element.insertAdjacentElement('afterend', loader);
        }

        const handle = {
            hide() {
                loader.remove();
                if (options.disable !== false && 'disabled' in element) {
                    element.disabled = false;
                    element.classList.remove('is-loading');
                }
                activeLoaders.delete(element);
            }
        };

        activeLoaders.set(element, handle);
        return handle;
    };

    window.hideActionLoader = function hideActionLoader(target) {
        const element = resolveTarget(target);
        const handle = element ? activeLoaders.get(element) : null;
        if (handle) handle.hide();
    };
}());
