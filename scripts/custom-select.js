/**
 * Lightweight custom dropdown ("select") component.
 * Native <select> listboxes can't be restyled cross-browser (that's the
 * OS-drawn menu you were seeing), so this renders a fully CSS-styled
 * button + listbox instead, while keeping the same value/onChange
 * shape the filter code already expects.
 *
 * Usage:
 *   const control = createCustomSelect({
 *       id: 'postCategoryFilter',
 *       options: [{ value: 'all', label: 'All categories' }, ...],
 *       value: activeFilters.category,
 *       onChange: (value) => { ... }
 *   });
 *   container.appendChild(control.element);
 *   control.setValue('all'); // programmatic update, e.g. Clear filters
 */
function createCustomSelect({ id, options, value, onChange }) {
    let currentValue = value;
    let optionEls = [];

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    if (id) wrapper.id = id;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const triggerLabel = document.createElement('span');
    triggerLabel.className = 'custom-select-label';
    trigger.appendChild(triggerLabel);

    const chevron = document.createElement('span');
    chevron.className = 'custom-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    trigger.appendChild(chevron);

    const list = document.createElement('ul');
    list.className = 'custom-select-options';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    function renderOptions() {
        list.innerHTML = '';
        optionEls = [];

        options.forEach(opt => {
            const item = document.createElement('li');
            item.className = 'custom-select-option';
            item.setAttribute('role', 'option');
            item.dataset.value = opt.value;
            item.textContent = opt.label;

            const isSelected = String(opt.value) === String(currentValue);
            item.setAttribute('aria-selected', String(isSelected));
            if (isSelected) {
                item.classList.add('is-selected');
                triggerLabel.textContent = opt.label;
            }

            item.addEventListener('click', () => {
                selectValue(opt.value, true);
            });

            list.appendChild(item);
            optionEls.push(item);
        });

        if (!options.some(opt => String(opt.value) === String(currentValue)) && options.length) {
            triggerLabel.textContent = options[0].label;
        }
    }

    function selectValue(newValue, fromUserClick) {
        currentValue = newValue;
        renderOptions();
        closeList();
        if (fromUserClick && typeof onChange === 'function') {
            onChange(newValue);
        }
    }

    function openList() {
        list.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        wrapper.classList.add('is-open');
        document.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleKeydown);
    }

    function closeList() {
        list.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        wrapper.classList.remove('is-open');
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleKeydown);
    }

    function handleOutsideClick(e) {
        if (!wrapper.contains(e.target)) closeList();
    }

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            closeList();
            trigger.focus();
        }
    }

    trigger.addEventListener('click', () => {
        if (list.hidden) openList(); else closeList();
    });

    renderOptions();

    wrapper.appendChild(trigger);
    wrapper.appendChild(list);

    return {
        element: wrapper,
        setValue(newValue) {
            selectValue(newValue, false);
        },
        getValue() {
            return currentValue;
        }
    };
}
