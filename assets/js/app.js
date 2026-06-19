// ── Global State ──────────────────────────────────────────────
const LOCAL_STORAGE_KEY = 'bold_dashboard_state';
let state = {
    inventory: [],
    sales: [],
    transactions: [],
    returns: [],
    clients: [],
    settings: {
        categories: ['Marketing', 'Logística', 'Soporte', 'Gasto Operativo', 'Inversión'],
        sources: ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda Física', 'Página Web', 'Mercado Libre', 'Otro'],
        thresholds: { 'Sono Qr': 5, 'Neo': 5, 'Plus': 5, 'Smart': 3, 'Smart Pro': 2 }
    }
};

let editingInventoryIndex = -1;
let editingFinanceIndex = -1;
let editingSaleIndex = -1;
let currentReturnSaleIndex = -1;
let currentReturnSerial = '';
let isOnline = navigator.onLine;
let pendingSync = false;
let currentUser = null;
let isRegisterMode = false;

// ── State Management ──────────────────────────────────────────

// -- SEGURIDAD: Validar datos antes de guardar en Supabase --------
function validateStateBeforeSave(stateToSave) {
    if (!Array.isArray(stateToSave.inventory)) return false;
    if (!Array.isArray(stateToSave.sales)) return false;
    if (!Array.isArray(stateToSave.transactions)) return false;
    if (!Array.isArray(stateToSave.returns)) return false;
    if (typeof stateToSave.settings !== 'object') return false;

    const stateSize = JSON.stringify(stateToSave).length;
    if (stateSize > 4 * 1024 * 1024) {
        console.warn('State demasiado grande:', stateSize);
        return false;
    }

    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
    };

    stateToSave.inventory = stateToSave.inventory.map(item => ({
        ...item,
        serial: sanitizeString(item.serial),
        model: sanitizeString(item.model),
        imei: sanitizeString(item.imei)
    }));

    stateToSave.sales = stateToSave.sales.map(sale => ({
        ...sale,
        client: sanitizeString(sale.client),
        city: sanitizeString(sale.city)
    }));

    return true;
}

async function saveState() {
    if (!currentUser) return;
    if (!validateStateBeforeSave(state)) {
        console.error('Estado inválido, no se guardará');
        return;
    }
    const key = LOCAL_STORAGE_KEY + '_' + currentUser.id;

    // Guardar en localStorage inmediatamente (cifrado)
    try {
        const encrypted = await encryptStore(state);
        localStorage.setItem(key, encrypted);
    } catch (e) {
        console.warn('Fallo cifrado localStorage, guardando en plano:', e);
        localStorage.setItem(key, JSON.stringify(state));
    }
    localStorage.setItem(key + '_time', Date.now().toString());

    // Actualizar UI con datos actuales
    refreshUI();

    // Sincronizar con Supabase
    if (isOnline) {
        await syncToSupabase();
    } else {
        pendingSync = true;
        console.warn('Offline, pendiente de sincronizar');
    }
}

async function syncToSupabase() {
    if (!currentUser || !isOnline) {
        pendingSync = true;
        return;
    }

    if (typeof supabaseClient === 'undefined') {
        console.error('supabaseClient NO EXISTE');
        showToast('Error: Supabase no está configurado', 'error');
        showSyncStatus('error');
        return;
    }

    try {
        showSyncStatus('syncing');
        const payload = {
            user_id: currentUser.id,
            data: state,
            updated_at: new Date().toISOString()
        };

        console.log('Supabase guardando para user:', currentUser.id,
            'inv:', state.inventory?.length, 'ventas:', state.sales?.length);

        const { error } = await supabaseClient
            .from('dashboard_state')
            .upsert(payload, { onConflict: 'user_id' });

        if (error) throw error;

        pendingSync = false;
        showSyncStatus('synced');
        console.log('Supabase sincronizado OK');
    } catch (err) {
        console.error('Supabase sync error:', err);
        showToast('Error Supabase: ' + (err.message || err) +
            '. Los datos están guardados localmente.', 'error');
        showSyncStatus('error');
        pendingSync = true;
    }
}

function getDefaultSettings() {
    return {
        categories: ['Marketing', 'Logística', 'Soporte', 'Gasto Operativo', 'Inversión'],
        sources: ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda Física', 'Página Web', 'Mercado Libre', 'Otro'],
        thresholds: { 'Sono Qr': 5, 'Neo': 5, 'Plus': 5, 'Smart': 3, 'Smart Pro': 2 }
    };
}

async function loadState() {
    if (!currentUser) return;
    const localKey = LOCAL_STORAGE_KEY + '_' + currentUser.id;

    const saved = localStorage.getItem(localKey);
    if (saved) {
        try {
            const decrypted = await decryptStored(saved);
            if (decrypted) state = decrypted;
        } catch (e) { }
    }

    if (isOnline) {
        try {
            showSyncStatus('syncing');
            console.log('Cargando desde Supabase para user:', currentUser.id);
            const { data, error } = await supabaseClient
                .from('dashboard_state')
                .select('data, updated_at')
                .eq('user_id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error cargando de Supabase:', error);
                showToast('Error al cargar datos: ' + error.message, 'error');
            }

            if (data && data.data && Object.keys(data.data).length > 0) {
                const cloudTime = new Date(data.updated_at).getTime();
                const localTime = parseInt(
                    localStorage.getItem(localKey + '_time') || '0'
                );
                console.log('Datos desde Supabase:',
                    'cloudTime:', cloudTime, 'localTime:', localTime,
                    'items:', data.data.inventory?.length,
                    'ventas:', data.data.sales?.length);

                if (cloudTime >= localTime) {
                    state = data.data;
                    try {
                        const encrypted = await encryptStore(state);
                        localStorage.setItem(localKey, encrypted);
                    } catch (e) {
                        localStorage.setItem(localKey, JSON.stringify(state));
                    }
                    localStorage.setItem(localKey + '_time', cloudTime.toString());
                    console.log('Usando datos de la nube');
                } else {
                    console.log('Datos locales más recientes, usando local');
                }
            } else {
                console.log('Sin datos en Supabase aún');
            }
        } catch (err) {
            console.warn('Supabase load failed, usando localStorage:', err);
        }
    }

    if (!state.inventory)    state.inventory    = [];
    if (!state.sales)        state.sales        = [];
    if (!state.transactions) state.transactions = [];
    if (!state.returns)      state.returns      = [];
    if (!state.clients)      state.clients      = [];
    if (!state.settings)     state.settings     = getDefaultSettings();

    const now = new Date();
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.innerText = now.toLocaleDateString('es-ES', {
            month: 'long', year: 'numeric'
        });
    }

    initCharts();
    refreshUI();
    showSyncStatus('synced');
    subscribeToRealtime();
    testSupabaseConnection();
    syncToSupabase();
}

async function testSupabaseConnection() {
    if (!currentUser || !isOnline) return;
    try {
        const { data, error } = await supabaseClient
            .from('dashboard_state')
            .select('user_id')
            .limit(1);
        if (error) {
            console.error('SUPABASE TEST FALLÓ:', error);
            showToast('Supabase: ' + error.message + '. Los datos se guardan solo localmente.', 'error');
        } else {
            console.log('SUPABASE CONECTADO');
            showToast('Supabase conectado correctamente', 'success');
        }
    } catch (err) {
        console.error('SUPABASE TEST ERROR:', err);
        showToast('Supabase: No se pudo conectar. Verifica tu conexión.', 'error');
    }
}

function refreshUI() {
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderSales === 'function') renderSales();
    if (typeof renderFinance === 'function') renderFinance();
    if (typeof renderAccounting === 'function') renderAccounting();
    if (typeof renderReturns === 'function') renderReturns();
    if (typeof renderSettings === 'function') renderSettings();
    if (typeof renderClients === 'function') renderClients();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function subscribeToRealtime() {
    if (!currentUser) return;

    supabaseClient.removeAllChannels();

    const channel = supabaseClient.channel('dashboard_changes');
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'dashboard_state',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            if (payload.new && payload.new.data) {
                const cloudTime = new Date(payload.new.updated_at).getTime();
                const localKey = LOCAL_STORAGE_KEY + '_' + currentUser.id;
                const localTime = localStorage.getItem(localKey + '_time');
                const localTimeMs = localTime ? parseInt(localTime) : 0;

                if (cloudTime > localTimeMs) {
                    state = payload.new.data;
                    localStorage.setItem(localKey, JSON.stringify(state));
                    localStorage.setItem(localKey + '_time', cloudTime.toString());
                    refreshUI();
                    showSyncStatus('synced');
                }
            }
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime conectado');
            } else if (status === 'CHANNEL_ERROR') {
                if (err) console.warn('Realtime no disponible (modo lectura-escritura activo)');
            }
        });
}

// ── Navigation ────────────────────────────────────────────────
function showView(viewId) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('sidebar-open')) toggleSidebar();

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const viewEl = document.getElementById(viewId);
    if (!viewEl) return;
    viewEl.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(viewId)) item.classList.add('active');
    });
    if (viewId === 'inventory') { initInventoryFilter(); renderInventory(); }
    if (viewId === 'sales') renderSales();
    if (viewId === 'finance') renderFinance();
    if (viewId === 'accounting') renderAccounting();
    if (viewId === 'returns') renderReturns();
    if (viewId === 'clients') renderClients();
    if (viewId === 'settings') renderSettings();
    lucide.createIcons();
}

// ── Modals ────────────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'flex';
    if (id === 'saleModal') {
        populateSources();
        populateCities();
        if (editingSaleIndex === -1) {
            const deviceList = document.getElementById('saleDeviceList');
            if (deviceList) deviceList.innerHTML = '';
            saleDeviceCount = 0;
            addSaleDevice();
            const saleDateEl = document.getElementById('m_sale_date');
            if (saleDateEl) saleDateEl.value = getLocalDateString();
        }
    }
    if (id === 'inventoryModal') {
        const invDateEl = document.getElementById('m_inv_date');
        if (invDateEl) invDateEl.value = getLocalDateString();
        const invModelEl = document.getElementById('m_inv_model');
        if (invModelEl) invModelEl.innerHTML = getModelOptions(
            editingInventoryIndex !== -1 ? state.inventory[editingInventoryIndex].model : ''
        );
        if (editingInventoryIndex !== -1) {
            const inv = state.inventory[editingInventoryIndex];
            const invSerialEl = document.getElementById('m_inv_serial');
            if (invSerialEl) {
                invSerialEl.readOnly = true;
                invSerialEl.value = inv.serial || '';
            }
            if (invDateEl) invDateEl.value = inv.entryDate || getLocalDateString();
        } else {
            const invSerialEl = document.getElementById('m_inv_serial');
            if (invSerialEl) invSerialEl.readOnly = false;
        }
    }
    if (id === 'transactionModal') {
        populateFinanceCategories();
        if (editingFinanceIndex === -1) {
            const txDateEl = document.getElementById('m_trans_date');
            if (txDateEl) txDateEl.value = getLocalDateString();
        }
    }
    lucide.createIcons();
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'none';

    if (id === 'saleModal') {
        editingSaleIndex = -1;
        const saleForm = document.getElementById('saleForm');
        if (saleForm) saleForm.reset();
        saleDeviceCount = 0;
        const deviceList = document.getElementById('saleDeviceList');
        if (deviceList) deviceList.innerHTML = '';
        const display = document.getElementById('saleTotalDisplay');
        if (display) display.innerText = '$0';
    }
    if (id === 'inventoryModal') editingInventoryIndex = -1;
    if (id === 'transactionModal') editingFinanceIndex = -1;

    if (id === 'inventoryModal') {
        const invForm = document.getElementById('inventoryForm');
        if (invForm) invForm.reset();
    }
    if (id === 'transactionModal') {
        const txForm = document.getElementById('transactionForm');
        if (txForm) txForm.reset();
    }
}

function openReturnModal(serial) {
    const index = state.sales.findIndex(s => {
        if (s.devices) return s.devices.some(d => d.serial === serial);
        return s.serial === serial;
    });
    if (index === -1) return;
    currentReturnSaleIndex = index;
    currentReturnSerial = serial;
    const s = state.sales[index];
    if (!s) return;

    const device = s.devices ? s.devices.find(d => d.serial === serial) : s;
    const item = state.inventory.find(i => i.serial === serial);
    const cost = item ? (item.cost || 0) : 0;

    const eSerial = escapeHtml(serial);
    const eModel = escapeHtml(device.model || '');
    const eClient = escapeHtml(s.client || 'N/A');
    const eCity = escapeHtml(s.city || 'N/A');
    const eSaleDate = escapeHtml(s.saleDate || 'N/A');

    document.getElementById('returnSaleInfo').innerHTML = `
        <strong style="color:var(--deep-blue);">Venta original</strong><br>
        📦 <b>Serial:</b> ${eSerial} — ${eModel}<br>
        👤 <b>Cliente:</b> ${eClient} (${eCity})<br>
        📅 <b>Fecha venta:</b> ${eSaleDate}<br>
        💵 <b>Precio venta:</b> $${(device.price || 0).toLocaleString()}<br>
        📊 <b>Utilidad original:</b> $${((device.price || 0) - cost).toLocaleString()}
    `;

    const retDateEl = document.getElementById('m_ret_date');
    if (retDateEl) retDateEl.value = getLocalDateString();
    const retOverlay = document.getElementById('returnModalOverlay');
    if (retOverlay) retOverlay.style.display = 'flex';
    lucide.createIcons();
}

function closeReturnModal() {
    const retOverlay = document.getElementById('returnModalOverlay');
    if (retOverlay) retOverlay.style.display = 'none';
    const retForm = document.getElementById('returnForm');
    if (retForm) retForm.reset();
    currentReturnSaleIndex = -1;
    currentReturnSerial = '';
}

// ── Searchable Select ─────────────────────────────────────────
function createSearchableSelect(config) {
    const wrapper = document.getElementById(config.wrapperId);
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="searchable-select-wrapper">
            <input type="text" class="searchable-select-input" id="${config.wrapperId}_input"
                   placeholder="${config.placeholder}" autocomplete="off">
            <input type="hidden" id="${config.hiddenInputId}">
            <div class="searchable-select-dropdown" id="${config.wrapperId}_dropdown"></div>
        </div>`;

    const input = document.getElementById(`${config.wrapperId}_input`);
    const hidden = document.getElementById(config.hiddenInputId);
    const dropdown = document.getElementById(`${config.wrapperId}_dropdown`);

    function renderOptions(filter) {
        filter = filter || '';
        const filtered = config.options.filter(o =>
            o.label.toLowerCase().includes(filter.toLowerCase())
        );
        if (filtered.length === 0) {
            dropdown.innerHTML = '<div class="searchable-select-option no-results">Sin resultados</div>';
        } else {
            dropdown.innerHTML = filtered.map(o =>
                `<div class="searchable-select-option" data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</div>`
            ).join('');
            dropdown.querySelectorAll('.searchable-select-option[data-value]').forEach(el => {
                el.addEventListener('click', () => {
                    hidden.value = el.dataset.value;
                    input.value = el.textContent.trim();
                    dropdown.classList.remove('open');
                    if (config.onChange) config.onChange(el.dataset.value);
                });
            });
        }
    }

    input.addEventListener('focus', () => { renderOptions(''); dropdown.classList.add('open'); });
    input.addEventListener('input', () => { hidden.value = ''; renderOptions(input.value); dropdown.classList.add('open'); });

    if (wrapper._outsideClickHandler) {
        document.removeEventListener('click', wrapper._outsideClickHandler, true);
    }
    wrapper._outsideClickHandler = (e) => {
        if (!wrapper.contains(e.target)) dropdown.classList.remove('open');
    };
    document.addEventListener('click', wrapper._outsideClickHandler, true);

    renderOptions();
}

function initInventoryFilter() {
    const modelOpts = [
        { value: '', label: 'Todos los modelos' },
        ...Object.keys(state.settings.thresholds).map(m => ({ value: m, label: m }))
    ];
    createSearchableSelect({
        wrapperId: 'filterModelWrapper',
        hiddenInputId: 'filterModelHidden',
        placeholder: 'Filtrar por modelo...',
        options: modelOpts
    });
    const dropdown = document.getElementById('filterModelWrapper_dropdown');
    if (dropdown) {
        dropdown.addEventListener('click', (e) => {
            const opt = e.target.closest('.searchable-select-option[data-value]');
            if (opt) renderInventory();
        });
    }
}

function populateSaleSerials() {
    const options = state.inventory
        .filter(i => i.status === 'Disponible')
        .map(i => ({ value: i.serial, label: `${i.serial} — ${i.model}` }));
    createSearchableSelect({
        wrapperId: 'saleSerialWrapper',
        hiddenInputId: 'm_sale_serial',
        placeholder: 'Escribe el serial o modelo...',
        options
    });
}

// ── Charts ────────────────────────────────────────────────────
let salesChart, categoryChartInstance, sourceChart, citySalesChart;

function initCharts() {
    // Destruir instancias previas para evitar fugas de memoria
    if (salesChart) { salesChart.destroy(); salesChart = null; }
    if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }
    if (sourceChart) { sourceChart.destroy(); sourceChart = null; }
    if (citySalesChart) { citySalesChart.destroy(); citySalesChart = null; }

    const salesCanvas = document.getElementById('salesTrendChart');
    const catCanvas = document.getElementById('categoryChart');
    const sourceCanvas = document.getElementById('sourceChart');
    const cityCanvas = document.getElementById('citySalesChart');
    if (!salesCanvas || !catCanvas || !sourceCanvas) return;

    const ctxSales = salesCanvas.getContext('2d');
    salesChart = new Chart(ctxSales, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Ventas ($)', data: [], borderColor: '#121E6C', backgroundColor: 'rgba(18,30,108,0.1)', fill: true, tension: 0.4 }] },
        options: {
            responsive: true, maintainAspectRatio: false, resizeDelay: 200,
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, callback: function (v) { if (v % 1 !== 0) return null; return '$' + v.toLocaleString(); } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return '$' + ctx.parsed.y.toLocaleString(); } } } }
        }
    });

    const ctxCat = catCanvas.getContext('2d');
    categoryChartInstance = new Chart(ctxCat, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Ingresos', data: [], backgroundColor: '#047481' }, { label: 'Egresos', data: [], backgroundColor: '#EE424E' }] },
        options: {
            responsive: true, maintainAspectRatio: false, resizeDelay: 200,
            layout: { padding: { top: 8, bottom: 0, left: 0, right: 0 } },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 }, padding: 12 } }, tooltip: { enabled: true } },
            scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0, autoSkip: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } }, beginAtZero: true } }
        }
    });

    const ctxSource = sourceCanvas.getContext('2d');
    sourceChart = new Chart(ctxSource, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#121E6C', '#EE424E', '#919FDC', '#047481', '#647481', '#E2E8F0'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, weight: '600' }, padding: 15 } } } }
    });

    if (cityCanvas) {
        const ctxCity = cityCanvas.getContext('2d');
        citySalesChart = new Chart(ctxCity, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Ventas', data: [], backgroundColor: '#121E6C', borderRadius: 6 }] },
            options: {
                responsive: true, maintainAspectRatio: false, resizeDelay: 200,
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: function (v) { return v.toLocaleString(); } } },
                    y: { grid: { display: false }, ticks: { font: { size: 9 } } }
                },
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return ctx.parsed.x.toLocaleString() + ' ventas'; } } } }
            }
        });
    }
}

function updateChartsData() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(months[d.getMonth()]);
        const total = state.sales.filter(s => {
            const sd = parseDateLocal(s.saleDate);
            return sd && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        }).reduce((acc, s) => acc + getSaleTotal(s), 0);
        data.push(total);
    }
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = data;
    salesChart.update();

    const incomeData = {};
    const expenseData = {};
    state.transactions.forEach(t => {
        if (t.type === 'income') incomeData[t.category] = (incomeData[t.category] || 0) + t.amount;
        else expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
    });

    const allCats = Array.from(new Set([...Object.keys(incomeData), ...Object.keys(expenseData)]));

    if (allCats.length === 0) {
        const noData = document.getElementById('noDataText');
        if (noData) noData.style.display = 'block';
        categoryChartInstance.data.labels = [];
        categoryChartInstance.data.datasets[0].data = [];
        categoryChartInstance.data.datasets[1].data = [];
    } else {
        const noData = document.getElementById('noDataText');
        if (noData) noData.style.display = 'none';
        categoryChartInstance.data.labels = allCats;
        categoryChartInstance.data.datasets[0].data = allCats.map(c => incomeData[c] || 0);
        categoryChartInstance.data.datasets[1].data = allCats.map(c => expenseData[c] || 0);
    }
    categoryChartInstance.update();

    const sources = {};
    state.sales.forEach(s => { sources[s.source] = (sources[s.source] || 0) + 1; });
    sourceChart.data.labels = Object.keys(sources);
    sourceChart.data.datasets[0].data = Object.values(sources);
    sourceChart.update();

    // City sales chart
    if (citySalesChart) {
        const cityData = {};
        state.sales.forEach(s => {
            const city = s.city || 'Sin ciudad';
            cityData[city] = (cityData[city] || 0) + 1;
        });
        const sortedCities = Object.entries(cityData).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const emptyEl = document.getElementById('citySalesEmpty');
        if (sortedCities.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            citySalesChart.data.labels = [];
            citySalesChart.data.datasets[0].data = [];
        } else {
            if (emptyEl) emptyEl.style.display = 'none';
            citySalesChart.data.labels = sortedCities.map(([city]) => city);
            citySalesChart.data.datasets[0].data = sortedCities.map(([, total]) => total);
        }
        citySalesChart.update();
    }
}

// initLaserScanner(), handleLaserScan(), toggleLaserBar(), hideLaserBar()
// se encuentran en assets/js/scanner.js

// ── Exports ────────────────────────────────────────────────────
function exportSalesXLSX() {
    const search = (document.getElementById('searchSales')?.value || '').toLowerCase();
    const salePeriod = document.getElementById('filterSalePeriod')?.value || '';
    const saleFrom = document.getElementById('filterSaleFrom')?.value || '';
    const saleTo = document.getElementById('filterSaleTo')?.value || '';
    const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

    const filtered = state.sales.filter(s => {
        const serials = s.devices ? s.devices.map(d => d.serial) : [s.serial];
        const matchSearch = (s.client || '').toLowerCase().includes(search) || serials.some(ser => ser.toLowerCase().includes(search)) || (s.city || '').toLowerCase().includes(search);
        let matchDate = true;
        if (saleDateRange) { const d = parseDateLocal(s.saleDate); matchDate = d && d >= saleDateRange.from && d <= saleDateRange.to; }
        return matchSearch && matchDate;
    });

    if (filtered.length === 0) { alert('No hay ventas para exportar.'); return; }

    const rows = [];
    filtered.forEach(s => {
        const devices = s.devices || [{ serial: s.serial, model: s.model, price: s.price }];
        devices.forEach(d => {
            const item = state.inventory.find(i => i.serial === d.serial);
            const cost = item ? (parseFloat(item.cost) || 0) : 0;
            const util = (d.price || 0) - cost;
            const margin = cost > 0 ? ((util / cost) * 100).toFixed(1) + '%' : 'N/A';
            rows.push({ 'Fecha': s.saleDate || '', 'Serial': d.serial || '', 'Modelo': d.model || '', 'Cliente': s.client || '', 'Ciudad': s.city || '', 'Canal': s.source || '', 'Precio Venta': d.price || 0, 'Costo': cost, 'Utilidad': util, 'Margen %': margin });
        });
    });
    const totalVentas = rows.reduce((a, r) => a + r['Precio Venta'], 0);
    rows.push({ 'Fecha': 'TOTAL', 'Serial': '', 'Modelo': '', 'Cliente': `${filtered.length} ventas`, 'Ciudad': '', 'Canal': '', 'Precio Venta': totalVentas, 'Costo': '', 'Utilidad': rows.reduce((a, r) => a + r['Utilidad'], 0), 'Margen %': '' });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    const periodLabel = salePeriod === 'custom' ? `${saleFrom}_${saleTo}` : salePeriod || 'todas';
    XLSX.writeFile(wb, `Ventas_GestInventary_${periodLabel}_${getLocalDateString()}.xlsx`);
}

function exportInventoryXLSX() {
    const search = (document.getElementById('searchInventory')?.value || '').toLowerCase();
    const modelFilter = document.getElementById('filterModelHidden')?.value || '';
    const invPeriod = document.getElementById('filterInvPeriod')?.value || '';
    const invFrom = document.getElementById('filterInvFrom')?.value || '';
    const invTo = document.getElementById('filterInvTo')?.value || '';
    const invDateRange = getDateRangeFilter(invPeriod, invFrom, invTo);

    const filtered = state.inventory.filter(i => {
        const matchSearch = (i.serial || '').toLowerCase().includes(search) || (i.imei || '').toLowerCase().includes(search);
        const matchModel = !modelFilter || i.model === modelFilter;
        let matchDate = true;
        if (invDateRange) { const d = parseDateLocal(i.entryDate); matchDate = d && d >= invDateRange.from && d <= invDateRange.to; }
        return matchSearch && matchModel && matchDate;
    });

    if (filtered.length === 0) { alert('No hay inventario para exportar.'); return; }

    const rows = filtered.map(i => ({ 'Fecha Ingreso': i.entryDate || '', 'Modelo': i.model || '', 'Serial': i.serial || '', 'IMEI': i.imei || '', 'Costo': i.cost || 0, 'Estado': i.status || '', 'Días en Stock': i.entryDate ? Math.floor((new Date() - new Date(i.entryDate)) / (1000 * 60 * 60 * 24)) : 'N/A' }));
    const resumenRows = [{}];
    resumenRows.push({ 'Fecha Ingreso': '--- RESUMEN POR MODELO ---' });
    const modelGroups = {};
    filtered.forEach(i => {
        if (!modelGroups[i.model]) modelGroups[i.model] = { total: 0, disponible: 0, vendido: 0 };
        modelGroups[i.model].total++;
        if (i.status === 'Disponible') modelGroups[i.model].disponible++;
        if (i.status === 'Vendido') modelGroups[i.model].vendido++;
    });
    Object.entries(modelGroups).forEach(([model, data]) => {
        resumenRows.push({ 'Fecha Ingreso': model, 'Modelo': `Total: ${data.total}`, 'Serial': `Disponible: ${data.disponible}`, 'IMEI': `Vendido: ${data.vendido}`, 'Costo': '', 'Estado': '', 'Días en Stock': '' });
    });

    const ws = XLSX.utils.json_to_sheet([...rows, ...resumenRows]);
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `Inventario_GestInventary_${getLocalDateString()}.xlsx`);
}

function exportReturnsXLSX() {
    const returns = state.returns || [];
    if (returns.length === 0) { alert('No hay devoluciones para exportar.'); return; }
    const rows = returns.map(r => ({ 'ID': r.id, 'Fecha Devolución': r.returnDate, 'Fecha Venta Original': r.saleDate, 'Serial': r.serial, 'Modelo': r.model, 'Cliente': r.client, 'Ciudad': r.city, 'Canal': r.source, 'Motivo': r.reason, 'Estado Equipo': r.condition, 'Acción': r.action, 'Precio Venta': r.salePrice, 'Costo': r.cost, 'Impacto Financiero': -r.salePrice, 'Notas': r.notes }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');
    XLSX.writeFile(wb, `Devoluciones_GestInventary_${getLocalDateString()}.xlsx`);
}

function exportTraceXLSX() {
    const data = state.inventory.map(i => {
        const sale = state.sales.find(s => {
            if (s.devices) return s.devices.some(d => d.serial === i.serial);
            return s.serial === i.serial;
        });
        const device = sale && sale.devices ? sale.devices.find(d => d.serial === i.serial) : sale;
        const ret = (state.returns || []).find(r => r.serial === i.serial);
        const cost = parseFloat(i.cost) || 0;
        const price = device ? (parseFloat(device.price) || 0) : 0;
        return { 'Fecha Ingreso': i.entryDate, 'Modelo': i.model, 'Serial': i.serial, 'Costo Compra': cost, 'Fecha Venta': sale ? sale.saleDate : 'N/A', 'Precio Venta': price, 'Utilidad': sale ? (price - cost) : 0, 'Canal': sale ? sale.source : 'N/A', 'Cliente': sale ? sale.client : 'N/A', 'Estado Actual': i.status, 'Fecha Devolución': ret ? ret.returnDate : 'N/A', 'Motivo Devolución': ret ? ret.reason : 'N/A' };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trazabilidad Equipos");
    XLSX.writeFile(wb, `Trazabilidad_GestInventary_${getLocalDateString()}.xlsx`);
}

function exportAccountingXLSX() {
    const period = document.getElementById('accPeriod').value;
    const from = document.getElementById('accFrom').value;
    const to = document.getElementById('accTo').value;
    const range = getDateRangeFilter(period, from, to);

    const filterFn = dateStr => { if (!range) return true; const d = parseDateLocal(dateStr); return d >= range.from && d <= range.to; };
    const sales = state.sales.filter(s => filterFn(s.saleDate) && !s.returned);
    const transactions = (state.transactions || []).filter(t => filterFn(t.date));
    const returns = (state.returns || []).filter(r => filterFn(r.returnDate));
    const invEntries = state.inventory.filter(i => filterFn(i.entryDate));

    const totalSales = sales.reduce((a, s) => a + getSaleTotal(s), 0);
    const otherIncome = transactions.filter(t => t.type === 'income' && t.category !== 'Venta').reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
    const totalIncome = totalSales + otherIncome;
    const costMerchSold = sales.reduce((a, s) => a + getSaleCost(s), 0);
    const costInvPurch = invEntries.reduce((a, i) => a + (parseFloat(i.cost) || 0), 0);
    const opExpenses = transactions.filter(t => t.type === 'expense' && t.category !== 'Devolución').reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
    const totalReturns = returns.reduce((a, r) => a + (parseFloat(r.salePrice) || 0), 0);
    const grossProfit = totalSales - costMerchSold;
    const opProfit = grossProfit - opExpenses;
    const netProfit = opProfit - totalReturns + otherIncome;
    const marginNet = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const openingStock = state.inventory.filter(i => range && parseDateLocal(i.entryDate) < range.from).reduce((a, i) => a + (parseFloat(i.cost) || 0), 0);
    const closingStock = state.inventory.filter(i => i.status === 'Disponible').reduce((a, i) => a + (parseFloat(i.cost) || 0), 0);

    const wb = XLSX.utils.book_new();
    const summaryRows = [
        ['ESTADO DE RESULTADOS', 'Gest Inventary'],
        ['Período:', period === 'custom' ? `${from} a ${to}` : period],
        ['Generado el:', getLocalDateString()],
        [],
        ['CONCEPTO', 'VALOR'],
        ['(+) Ventas Netas', totalSales],
        ['(-) Costo de Ventas', costMerchSold],
        ['(=) UTILIDAD BRUTA', grossProfit],
        ['(-) Gastos Operativos', opExpenses],
        ['(=) UTILIDAD OPERATIVA', opProfit],
        ['(-) Devoluciones', totalReturns],
        ['(+) Otros Ingresos', otherIncome],
        ['(=) UTILIDAD NETA', netProfit],
        ['Margen Neto %', marginNet.toFixed(1) + '%'],
        [], ['--- INVENTARIO ---', ''],
        ['Inventario Inicial', openingStock],
        ['Compras del Período', costInvPurch],
        ['Inventario Final', closingStock]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen P&G");

    const salesRows = [];
    sales.forEach(s => {
        const devices = s.devices || [{ serial: s.serial, model: s.model, price: s.price }];
        devices.forEach(d => {
            const item = state.inventory.find(i => i.serial === d.serial);
            const cost = item ? (parseFloat(item.cost) || 0) : 0;
            salesRows.push({ 'Fecha': s.saleDate, 'Serial': d.serial, 'Modelo': d.model, 'Cliente': s.client, 'Canal': s.source, 'Precio': d.price, 'Costo': cost, 'Utilidad': (d.price || 0) - cost });
        });
    });
    if (salesRows.length) { XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), 'Ventas'); }

    const expCats = {};
    transactions.filter(t => t.type === 'expense' && t.category !== 'Devolución').forEach(t => { expCats[t.category] = (expCats[t.category] || 0) + (parseFloat(t.amount) || 0); });
    if (Object.keys(expCats).length) {
        const expRows = Object.entries(expCats).map(([cat, val]) => ({ 'Categoría': cat, 'Total': val }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows), 'Gastos');
    }

    if (returns.length) {
        const retRows = returns.map(r => ({ 'ID': r.id, 'Fecha': r.returnDate, 'Serial': r.serial, 'Motivo': r.reason, 'Monto': r.salePrice }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(retRows), 'Devoluciones');
    }

    XLSX.writeFile(wb, `Contabilidad_GestInventary_${getLocalDateString()}.xlsx`);
}

// ── Settings (definidas en settings.js) ─────────────────────────
// renderSettings, addModel, removeModel, addCategory, removeCategory,
// updateThreshold, addSource, removeSource, populateSources,
// updatePersonalData se encuentran en assets/js/settings.js

// ── Auth State Subscription ────────────────────────────────────
supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            if (session) {
                currentUser = session.user;

                const bizName = currentUser.user_metadata?.business_name || 'Mi Negocio';
                const fullName = currentUser.user_metadata?.full_name || '';
                const sidebarBiz = document.getElementById('displayBusinessName');
                const welcomeEl = document.getElementById('dashboardWelcome');

                if (sidebarBiz) sidebarBiz.innerText = bizName;
                if (welcomeEl) welcomeEl.innerText = fullName ? `¡Bienvenido, ${fullName}!` : 'Resumen Ejecutivo';

                document.getElementById('loginView').style.display = 'none';
                const appView = document.getElementById('appView');
                if (appView) appView.style.display = 'block';
                loadState();
                resetInactivityTimer();
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('sb-') || k === LOCAL_STORAGE_KEY) localStorage.removeItem(k);
            });
            document.getElementById('loginView').style.display = 'flex';
            document.getElementById('appView').style.display = 'none';
            showToast('Sesión expirada. Inicia sesión nuevamente.', 'info');
        }
    }, 0);
});

window.addEventListener('online', async () => {
    isOnline = true;
    showSyncStatus('online');
    if (pendingSync) await syncToSupabase();
});

window.addEventListener('offline', () => {
    isOnline = false;
    showSyncStatus('offline');
});

// ── Initialize ─────────────────────────────────────────────────
// initCharts() se llama desde loadState() después de cargar datos
// para evitar que las gráficas se inicialicen con $0
