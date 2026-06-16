// ── Global State ──────────────────────────────────────────────
const LOCAL_STORAGE_KEY = 'bold_dashboard_state';
let state = {
    inventory: [],
    sales: [],
    transactions: [],
    returns: [],
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
let isOnline = navigator.onLine;
let pendingSync = false;
let currentUser = null;
let isRegisterMode = false;

// ── State Management ──────────────────────────────────────────
function saveState() {
    if (!currentUser) return;
    const key = LOCAL_STORAGE_KEY + '_' + currentUser.id;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(key + '_time', Date.now().toString());
    refreshUI();
    if (isOnline) syncToSupabase();
    else pendingSync = true;
}

async function loadState() {
    if (!currentUser) return;
    const localKey = LOCAL_STORAGE_KEY + '_' + currentUser.id;

    const saved = localStorage.getItem(localKey);
    if (saved) {
        try { state = JSON.parse(saved); } catch (e) { }
    }
    state.inventory = state.inventory || [];
    state.sales = state.sales || [];
    state.transactions = state.transactions || [];
    state.returns = state.returns || [];

    if (isOnline) {
        try {
            showSyncStatus('syncing');
            const { data, error } = await supabaseClient
                .from('dashboard_state')
                .select('data, updated_at')
                .eq('user_id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                const cloudTime = new Date(data.updated_at).getTime();
                const localTime = localStorage.getItem(localKey + '_time');
                const localTimeMs = localTime ? parseInt(localTime) : 0;

                if (cloudTime > localTimeMs) {
                    state = data.data;
                    state.inventory = state.inventory || [];
                    state.sales = state.sales || [];
                    state.transactions = state.transactions || [];
                    state.returns = state.returns || [];
                    localStorage.setItem(localKey, JSON.stringify(state));
                    localStorage.setItem(localKey + '_time', cloudTime.toString());
                }
            } else {
                await syncToSupabase();
            }
        } catch (err) {
            console.warn('Cloud load error:', err);
        }
    }

    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    refreshUI();
    subscribeToRealtime();
}

async function syncToSupabase() {
    if (!currentUser || !isOnline) {
        pendingSync = true;
        return;
    }

    try {
        showSyncStatus('syncing');
        const { error } = await supabaseClient
            .from('dashboard_state')
            .upsert({
                user_id: currentUser.id,
                data: state,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
        pendingSync = false;
        showSyncStatus('synced');
    } catch (err) {
        console.error('Sync error:', err);
        showSyncStatus('error');
        pendingSync = true;
    }
}

function refreshUI() {
    if (typeof renderInventory === 'function') renderInventory();
    if (typeof renderSales === 'function') renderSales();
    if (typeof renderFinance === 'function') renderFinance();
    if (typeof renderAccounting === 'function') renderAccounting();
    if (typeof renderReturns === 'function') renderReturns();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function subscribeToRealtime() {
    if (!currentUser) return;

    supabaseClient.removeAllChannels();

    supabaseClient
        .channel('dashboard_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'dashboard_state',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Realtime Change Received:', payload);
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
        .subscribe((status) => {
            console.log('Realtime Status:', status);
        });
}

// ── Navigation ────────────────────────────────────────────────
function showView(viewId) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('sidebar-open')) toggleSidebar();

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(viewId)) item.classList.add('active');
    });
    if (viewId === 'inventory') { initInventoryFilter(); renderInventory(); }
    if (viewId === 'sales') renderSales();
    if (viewId === 'finance') renderFinance();
    if (viewId === 'accounting') renderAccounting();
    if (viewId === 'returns') renderReturns();
    if (viewId === 'settings') renderSettings();
    lucide.createIcons();
}

// ── Modals ────────────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
    if (id === 'saleModal') {
        populateSources();
        if (editingSaleIndex === -1) {
            const deviceList = document.getElementById('saleDeviceList');
            if (deviceList) deviceList.innerHTML = '';
            saleDeviceCount = 0;
            addSaleDevice();
            document.getElementById('m_sale_date').value = getLocalDateString();
        }
    }
    if (id === 'inventoryModal') {
        document.getElementById('m_inv_date').value = getLocalDateString();
        document.getElementById('m_inv_model').innerHTML = getModelOptions(
            editingInventoryIndex !== -1 ? state.inventory[editingInventoryIndex].model : ''
        );
        if (editingInventoryIndex !== -1) {
            const inv = state.inventory[editingInventoryIndex];
            document.getElementById('m_inv_serial').readOnly = true;
            document.getElementById('m_inv_date').value = inv.entryDate || getLocalDateString();
        } else {
            document.getElementById('m_inv_serial').readOnly = false;
        }
    }
    if (id === 'transactionModal') {
        populateFinanceCategories();
        if (editingFinanceIndex === -1) {
            document.getElementById('m_trans_date').value = getLocalDateString();
        }
    }
    lucide.createIcons();
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';

    if (id === 'saleModal') {
        editingSaleIndex = -1;
        document.getElementById('saleForm').reset();
        saleDeviceCount = 0;
        const deviceList = document.getElementById('saleDeviceList');
        if (deviceList) deviceList.innerHTML = '';
        const display = document.getElementById('saleTotalDisplay');
        if (display) display.innerText = '$0';
    }
    if (id === 'inventoryModal') editingInventoryIndex = -1;
    if (id === 'transactionModal') editingFinanceIndex = -1;

    if (id === 'inventoryModal') document.getElementById('inventoryForm').reset();
    if (id === 'transactionModal') document.getElementById('transactionForm').reset();
}

function openReturnModal(serial) {
    const index = state.sales.findIndex(s => s.serial === serial);
    if (index === -1) return;
    currentReturnSaleIndex = index;
    const s = state.sales[index];
    if (!s) return;

    const item = state.inventory.find(i => i.serial === s.serial);
    const cost = item ? (item.cost || 0) : 0;

    const eSerial = escapeHtml(s.serial);
    const eModel = escapeHtml(s.model || '');
    const eClient = escapeHtml(s.client || 'N/A');
    const eCity = escapeHtml(s.city || 'N/A');
    const eSaleDate = escapeHtml(s.saleDate || 'N/A');

    document.getElementById('returnSaleInfo').innerHTML = `
        <strong style="color:var(--deep-blue);">Venta original</strong><br>
        📦 <b>Serial:</b> ${eSerial} — ${eModel}<br>
        👤 <b>Cliente:</b> ${eClient} (${eCity})<br>
        📅 <b>Fecha venta:</b> ${eSaleDate}<br>
        💵 <b>Precio venta:</b> $${(s.price || 0).toLocaleString()}<br>
        📊 <b>Utilidad original:</b> $${((s.price || 0) - cost).toLocaleString()}
    `;

    document.getElementById('m_ret_date').value = getLocalDateString();
    document.getElementById('returnModalOverlay').style.display = 'flex';
    lucide.createIcons();
}

function closeReturnModal() {
    document.getElementById('returnModalOverlay').style.display = 'none';
    document.getElementById('returnForm').reset();
    currentReturnSaleIndex = -1;
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

    input.addEventListener('focus', () => { renderOptions(input.value); dropdown.classList.add('open'); });
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
    const filterInput = document.getElementById('filterModelWrapper_input');
    if (filterInput) {
        filterInput.addEventListener('change', () => setTimeout(renderInventory, 200));
        filterInput.addEventListener('input', () => setTimeout(renderInventory, 200));
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
let salesChart, categoryChartInstance, sourceChart;

function initCharts() {
    const ctxSales = document.getElementById('salesTrendChart').getContext('2d');
    salesChart = new Chart(ctxSales, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Ventas ($)', data: [], borderColor: '#121E6C', backgroundColor: 'rgba(18,30,108,0.1)', fill: true, tension: 0.4 }] },
        options: {
            responsive: true, maintainAspectRatio: false, resizeDelay: 200,
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, callback: function (v) { if (v % 1 !== 0) return null; return '$' + v.toLocaleString(); } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return '$' + ctx.parsed.y.toLocaleString(); } } } }
        }
    });

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
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

    const ctxSource = document.getElementById('sourceChart').getContext('2d');
    sourceChart = new Chart(ctxSource, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#121E6C', '#EE424E', '#919FDC', '#047481', '#647481', '#E2E8F0'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10, weight: '600' }, padding: 15 } } } }
    });
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
        }).reduce((acc, s) => acc + s.price, 0);
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
        document.getElementById('noDataText').style.display = 'block';
        categoryChartInstance.data.labels = [];
        categoryChartInstance.data.datasets[0].data = [];
        categoryChartInstance.data.datasets[1].data = [];
    } else {
        document.getElementById('noDataText').style.display = 'none';
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
}

// ── Laser Scanner ─────────────────────────────────────────────
(function initLaserScanner() {
    let laserBuffer = '';
    let laserTimer = null;
    const LASER_THRESHOLD_MS = 80;

    document.addEventListener('keydown', function (e) {
        const active = document.activeElement;
        const isLaserInput = active && active.id === 'laserInput';
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') && !isLaserInput;
        if (isTyping) return;

        if (e.key === 'Enter' && laserBuffer.length > 3) {
            handleLaserScan(laserBuffer.trim());
            laserBuffer = '';
            clearTimeout(laserTimer);
            return;
        }

        if (e.key.length === 1) {
            laserBuffer += e.key;
            clearTimeout(laserTimer);
            laserTimer = setTimeout(() => { laserBuffer = ''; }, LASER_THRESHOLD_MS * 20);
        }
    });
})();

function toggleLaserBar() {
    const bar = document.getElementById('laserBar');
    if (!bar) return;
    const visible = bar.style.display === 'flex';
    bar.style.display = visible ? 'none' : 'flex';
    if (!visible) document.getElementById('laserInput').focus();
}

function hideLaserBar() {
    const bar = document.getElementById('laserBar');
    if (bar) bar.style.display = 'none';
}

// ── Exports ────────────────────────────────────────────────────
function exportSalesXLSX() {
    const search = (document.getElementById('searchSales')?.value || '').toLowerCase();
    const salePeriod = document.getElementById('filterSalePeriod')?.value || '';
    const saleFrom = document.getElementById('filterSaleFrom')?.value || '';
    const saleTo = document.getElementById('filterSaleTo')?.value || '';
    const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

    const filtered = state.sales.filter(s => {
        const matchSearch = (s.client || '').toLowerCase().includes(search) || (s.serial || '').toLowerCase().includes(search) || (s.city || '').toLowerCase().includes(search);
        let matchDate = true;
        if (saleDateRange) { const d = parseDateLocal(s.saleDate); matchDate = d && d >= saleDateRange.from && d <= saleDateRange.to; }
        return matchSearch && matchDate;
    });

    if (filtered.length === 0) { alert('No hay ventas para exportar.'); return; }

    const rows = filtered.map(s => ({ 'Fecha': s.saleDate || '', 'Serial': s.serial || '', 'Modelo': s.model || '', 'Cliente': s.client || '', 'Ciudad': s.city || '', 'Canal': s.source || '', 'Precio Venta': s.price || 0, 'Costo': getSaleCost(s), 'Utilidad': (s.price || 0) - getSaleCost(s), 'Margen %': getSaleCost(s) > 0 ? ((((s.price || 0) - getSaleCost(s)) / getSaleCost(s)) * 100).toFixed(1) + '%' : 'N/A' }));
    const totalVentas = filtered.reduce((a, s) => a + (s.price || 0), 0);
    rows.push({ 'Fecha': 'TOTAL', 'Serial': '', 'Modelo': '', 'Cliente': `${filtered.length} ventas`, 'Ciudad': '', 'Canal': '', 'Precio Venta': totalVentas, 'Costo': '', 'Utilidad': rows.reduce((a, r) => a + r['Utilidad'], 0), 'Margen %': '' });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    const periodLabel = salePeriod === 'custom' ? `${saleFrom}_${saleTo}` : salePeriod || 'todas';
    XLSX.writeFile(wb, `Ventas_PartnersBold_${periodLabel}_${getLocalDateString()}.xlsx`);
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
    XLSX.writeFile(wb, `Inventario_PartnersBold_${getLocalDateString()}.xlsx`);
}

function exportReturnsXLSX() {
    const returns = state.returns || [];
    if (returns.length === 0) { alert('No hay devoluciones para exportar.'); return; }
    const rows = returns.map(r => ({ 'ID': r.id, 'Fecha Devolución': r.returnDate, 'Fecha Venta Original': r.saleDate, 'Serial': r.serial, 'Modelo': r.model, 'Cliente': r.client, 'Ciudad': r.city, 'Canal': r.source, 'Motivo': r.reason, 'Estado Equipo': r.condition, 'Acción': r.action, 'Precio Venta': r.salePrice, 'Costo': r.cost, 'Impacto Financiero': -r.salePrice, 'Notas': r.notes }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones');
    XLSX.writeFile(wb, `Devoluciones_PartnersBold_${getLocalDateString()}.xlsx`);
}

function exportTraceXLSX() {
    const data = state.inventory.map(i => {
        const sale = state.sales.find(s => s.serial === i.serial);
        const ret = (state.returns || []).find(r => r.serial === i.serial);
        const cost = parseFloat(i.cost) || 0;
        const price = sale ? (parseFloat(sale.price) || 0) : 0;
        return { 'Fecha Ingreso': i.entryDate, 'Modelo': i.model, 'Serial': i.serial, 'Costo Compra': cost, 'Fecha Venta': sale ? sale.saleDate : 'N/A', 'Precio Venta': price, 'Utilidad': sale ? (price - cost) : 0, 'Canal': sale ? sale.source : 'N/A', 'Cliente': sale ? sale.client : 'N/A', 'Estado Actual': i.status, 'Fecha Devolución': ret ? ret.returnDate : 'N/A', 'Motivo Devolución': ret ? ret.reason : 'N/A' };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trazabilidad Equipos");
    XLSX.writeFile(wb, `Trazabilidad_PartnersBold_${getLocalDateString()}.xlsx`);
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

    const totalSales = sales.reduce((a, s) => a + (parseFloat(s.price) || 0), 0);
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
        ['ESTADO DE RESULTADOS', 'Partners Bold'],
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

    const salesRows = sales.map(s => ({ 'Fecha': s.saleDate, 'Serial': s.serial, 'Modelo': s.model, 'Cliente': s.client, 'Canal': s.source, 'Precio': s.price, 'Costo': getSaleCost(s), 'Utilidad': (s.price || 0) - getSaleCost(s) }));
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

    XLSX.writeFile(wb, `Contabilidad_PartnersBold_${getLocalDateString()}.xlsx`);
}

// ── Settings ───────────────────────────────────────────────────
function renderSettings() {
    if (currentUser) {
        document.getElementById('set_full_name').value = currentUser.user_metadata?.full_name || '';
        document.getElementById('set_business_name').value = currentUser.user_metadata?.business_name || '';
    }

    const list = document.getElementById('categoryList');
    list.innerHTML = '';
    state.settings.categories.forEach(c => {
        const ec = escapeHtml(c);
        list.innerHTML += `<span class="badge" style="background:var(--light-gray);color:var(--deep-blue);border:1px solid var(--border);display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1rem;">${ec} <i data-lucide="x" size="14" style="cursor:pointer" onclick="removeCategory('${ec}')"></i></span>`;
    });

    const sourceList = document.getElementById('sourceList');
    if (sourceList) {
        sourceList.innerHTML = '';
        (state.settings.sources || []).forEach(s => {
            const es = escapeHtml(s);
            sourceList.innerHTML += `<span class="badge" style="background:var(--light-gray);color:var(--deep-blue);border:1px solid var(--border);display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1rem;border-radius:100px;font-size:0.85rem;font-weight:600;">${es} <i data-lucide="x" style="width:14px;height:14px;cursor:pointer;" onclick="removeSource('${es}')"></i></span>`;
        });
    }

    const modelList = document.getElementById('modelList');
    modelList.innerHTML = '';
    Object.keys(state.settings.thresholds).forEach(m => {
        const em = escapeHtml(m);
        modelList.innerHTML += `<span class="badge" style="background:var(--light-gray);color:var(--deep-blue);border:1px solid var(--border);display:flex;align-items:center;gap:0.5rem;padding:0.6rem 1rem;">${em} <i data-lucide="x" size="14" style="cursor:pointer" onclick="removeModel('${em}')"></i></span>`;
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
    if (state.settings.thresholds[name] !== undefined) { alert('Este modelo ya existe.'); return; }
    state.settings.thresholds[name] = 5;
    saveState();
    renderSettings();
    document.getElementById('newModelName').value = '';
}

function removeModel(name) {
    if (state.inventory.some(i => i.model === name)) { alert(`El modelo "${name}" tiene equipos registrados.`); return; }
    delete state.settings.thresholds[name];
    saveState();
    renderSettings();
}

function addCategory() {
    const name = document.getElementById('newCategoryName').value.trim();
    if (name && !state.settings.categories.includes(name)) { state.settings.categories.push(name); saveState(); renderSettings(); document.getElementById('newCategoryName').value = ''; }
}

function removeCategory(name) {
    if (state.transactions.some(t => t.category === name)) { alert(`La categoría "${name}" está en uso.`); return; }
    state.settings.categories = state.settings.categories.filter(c => c !== name);
    saveState();
    renderSettings();
}

function updateThreshold(model, val) { state.settings.thresholds[model] = parseInt(val); saveState(); }

function addSource() {
    const name = document.getElementById('newSourceName').value.trim();
    if (!name) return;
    if (!state.settings.sources) state.settings.sources = [];
    if (state.settings.sources.includes(name)) { alert('Este canal ya existe.'); return; }
    state.settings.sources.push(name);
    saveState();
    renderSettings();
    document.getElementById('newSourceName').value = '';
}

function removeSource(name) {
    if (state.sales.some(s => s.source === name)) { alert(`El canal "${name}" tiene ventas registradas.`); return; }
    state.settings.sources = (state.settings.sources || []).filter(s => s !== name);
    saveState();
    renderSettings();
}

function populateSources() {
    const sources = state.settings.sources || ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda Física', 'Página Web', 'Mercado Libre', 'Otro'];
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
    if (!fullName || !businessName) { alert('Completa todos los campos.'); return; }
    try {
        const { data, error } = await supabaseClient.auth.updateUser({ data: { full_name: fullName, business_name: businessName } });
        if (error) throw error;
        currentUser = data.user;
        const sidebarBiz = document.getElementById('displayBusinessName');
        const welcomeEl = document.getElementById('dashboardWelcome');
        if (sidebarBiz) sidebarBiz.innerText = businessName;
        if (welcomeEl) welcomeEl.innerText = `¡Bienvenido, ${fullName}!`;
        alert('¡Datos actualizados!');
        lucide.createIcons();
    } catch (err) { alert('Error: ' + err.message); }
}

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
                document.getElementById('appView').style.display = 'block';
                loadState();
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            document.getElementById('loginView').style.display = 'flex';
            document.getElementById('appView').style.display = 'none';
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
window.onload = function () {
    initCharts();
};
