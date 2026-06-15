function createSearchableSelect(config) {
    const wrapper = document.getElementById(config.wrapperId);
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="searchable-select-wrapper">
            <input type="text" 
                   class="searchable-select-input" 
                   id="${config.wrapperId}_input"
                   placeholder="${config.placeholder}"
                   autocomplete="off">
            <input type="hidden" id="${config.hiddenInputId}">
            <div class="searchable-select-dropdown" 
                 id="${config.wrapperId}_dropdown"></div>
        </div>`;

    const input = document.getElementById(`${config.wrapperId}_input`);
    const hidden = document.getElementById(config.hiddenInputId);
    const dropdown = document.getElementById(`${config.wrapperId}_dropdown`);

    function renderOptions(filter = '') {
        const filtered = config.options.filter(o =>
            o.label.toLowerCase().includes(filter.toLowerCase())
        );
        if (filtered.length === 0) {
            dropdown.innerHTML = `<div class="searchable-select-option no-results">Sin resultados</div>`;
        } else {
            dropdown.innerHTML = filtered.map(o =>
                `<div class="searchable-select-option" data-value="${o.value}">${o.label}</div>`
            ).join('');
            dropdown.querySelectorAll('.searchable-select-option[data-value]').forEach(el => {
                el.addEventListener('click', () => {
                    hidden.value = el.dataset.value;
                    input.value = el.textContent.trim();
                    dropdown.classList.remove('open');
                });
            });
        }
    }

    input.addEventListener('focus', () => {
        renderOptions(input.value);
        dropdown.classList.add('open');
    });

    input.addEventListener('input', () => {
        hidden.value = '';
        renderOptions(input.value);
        dropdown.classList.add('open');
    });

    // Limpiar listener anterior si existe
    if (wrapper._outsideClickHandler) {
        document.removeEventListener(
            'click', wrapper._outsideClickHandler, true
        );
    }
    wrapper._outsideClickHandler = (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    };
    document.addEventListener(
        'click', wrapper._outsideClickHandler, true
    );

    renderOptions();
}

function initInventoryFilter() {
    const modelOpts = [
        { value: '', label: 'Todos los modelos' },
        ...Object.keys(state.settings.thresholds).map(m =>
            ({ value: m, label: m }))
    ];
    createSearchableSelect({
        wrapperId: 'filterModelWrapper',
        hiddenInputId: 'filterModelHidden',
        placeholder: 'Filtrar por modelo...',
        options: modelOpts
    });
    const filterInput = document.getElementById('filterModelWrapper_input');
    if (filterInput) {
        filterInput.addEventListener('change', renderInventory);
        filterInput.addEventListener('input', () => {
            setTimeout(renderInventory, 200);
        });
    }
}
