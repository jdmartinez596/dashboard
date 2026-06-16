function renderSettings() {
    // Cargar datos personales
    if (currentUser) {
        document.getElementById('set_full_name').value = currentUser.user_metadata?.full_name || '';
        document.getElementById('set_business_name').value = currentUser.user_metadata?.business_name || '';
    }

    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    state.settings.categories.forEach(c => {
        const ec = escapeHtml(c);
        list.innerHTML += `<span class="badge" style="background:var(--light-gray); color:var(--deep-blue); border:1px solid var(--border); display:flex; align-items:center; gap:0.5rem; padding:0.6rem 1rem;">${ec} <i data-lucide="x" size="14" style="cursor:pointer" onclick="removeCategory('${ec}')"></i></span>`;
    });

    const sourceList = document.getElementById('sourceList');
    if (sourceList) {
        sourceList.innerHTML = '';
        const sources = state.settings.sources || [];
        sources.forEach(s => {
            const es = escapeHtml(s);
            sourceList.innerHTML += `
                <span class="badge" style="background: var(--light-gray); color: var(--deep-blue); border: 1px solid var(--border); display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 100px; font-size: 0.85rem; font-weight: 600;">
                    ${es}
                    <i data-lucide="x" style="width:14px; height:14px; cursor:pointer;" onclick="removeSource('${es}')"></i>
                </span>`;
        });
    }

    const modelList = document.getElementById('modelList');
    modelList.innerHTML = '';
    Object.keys(state.settings.thresholds).forEach(m => {
        const em = escapeHtml(m);
        modelList.innerHTML += `
            <span class="badge" style="background:var(--light-gray); 
            color:var(--deep-blue); border:1px solid var(--border); 
            display:flex; align-items:center; gap:0.5rem; 
            padding:0.6rem 1rem;">
                ${em}
                <i data-lucide="x" size="14" style="cursor:pointer" 
                   onclick="removeModel('${em}')"></i>
            </span>`;
    });
    const thresholds = document.getElementById('thresholdSettings');
    thresholds.innerHTML = '';
    Object.keys(state.settings.thresholds).forEach(m => {
        const em = escapeHtml(m);
        thresholds.innerHTML += `<div class="form-group"><label>${em}</label><input type="number" value="${state.settings.thresholds[m]}" onchange="updateThreshold('${em}', this.value)"></div>`;
    });
    lucide.createIcons();
}

function addModel() {
    const name = document.getElementById('newModelName').value.trim();
    if (!name) return;
    if (state.settings.thresholds[name] !== undefined) {
        alert('Este modelo ya existe.');
        return;
    }
    state.settings.thresholds[name] = 5;
    saveState();
    renderSettings();
    document.getElementById('newModelName').value = '';
}

function removeModel(name) {
    const enUso = state.inventory.some(i => i.model === name);
    if (enUso) {
        alert(`El modelo "${name}" tiene equipos registrados en inventario y no puede eliminarse.`);
        return;
    }
    delete state.settings.thresholds[name];
    saveState();
    renderSettings();
}

function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (name && !state.settings.categories.includes(name)) { state.settings.categories.push(name); saveState(); renderSettings(); document.getElementById('newCategoryName').value = ''; }
}

function removeCategory(name) {
    const enUso = state.transactions.some(t => t.category === name);
    if (enUso) {
        alert(`La categoría "${name}" está en uso por transacciones existentes y no puede eliminarse.`);
        return;
    }
    state.settings.categories = state.settings.categories.filter(c => c !== name);
    saveState();
    renderSettings();
}

function updateThreshold(model, val) { state.settings.thresholds[model] = parseInt(val); saveState(); }

function addSource() {
    const name = document.getElementById('newSourceName').value.trim();
    if (!name) return;
    if (!state.settings.sources) state.settings.sources = [];
    if (state.settings.sources.includes(name)) {
        alert('Este canal ya existe.');
        return;
    }
    state.settings.sources.push(name);
    saveState();
    renderSettings();
    document.getElementById('newSourceName').value = '';
}

function removeSource(name) {
    const enUso = state.sales.some(s => s.source === name);
    if (enUso) {
        alert(`El canal "${name}" tiene ventas registradas y no puede eliminarse.`);
        return;
    }
    state.settings.sources = (state.settings.sources || []).filter(s => s !== name);
    saveState();
    renderSettings();
}

function populateSources() {
    const sources = state.settings.sources || ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda Física', 'Otro'];
    const select = document.getElementById('m_sale_source');
    const currentVal = select ? select.value : '';
    if (select) {
        select.innerHTML = sources.map(s => {
            const es = escapeHtml(s);
            return `<option value="${es}" ${es === currentVal ? 'selected' : ''}>${es}</option>`;
        }).join('');
    }
}

async function updatePersonalData() {
    const fullName = document.getElementById('set_full_name').value.trim();
    const businessName = document.getElementById('set_business_name').value.trim();

    if (!fullName || !businessName) {
        alert('Por favor completa todos los campos.');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            data: { 
                full_name: fullName,
                business_name: businessName 
            }
        });

        if (error) throw error;

        // Actualizar currentUser local con los nuevos datos
        currentUser = data.user;
        
        // Actualizar elementos visuales inmediatos
        const sidebarBiz = document.getElementById('displayBusinessName');
        const welcomeEl = document.getElementById('dashboardWelcome');
        
        if (sidebarBiz) sidebarBiz.innerText = businessName;
        if (welcomeEl) welcomeEl.innerText = `¡Bienvenido, ${fullName}!`;

        alert('¡Datos actualizados con éxito!');
        lucide.createIcons();
    } catch (err) {
        alert('Error al actualizar datos: ' + err.message);
    }
}
