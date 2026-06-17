function onSalePeriodChange() {
    const period = document.getElementById('filterSalePeriod').value;
    const customDiv = document.getElementById('customSaleDates');

    if (period === 'custom') {
        customDiv.style.display = 'flex';
        const today = getLocalDateString();
        const fromEl = document.getElementById('filterSaleFrom');
        const toEl = document.getElementById('filterSaleTo');
        fromEl.removeAttribute('min');
        fromEl.removeAttribute('max');
        toEl.removeAttribute('min');
        toEl.removeAttribute('max');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        fromEl.value = getLocalDateString(thirtyDaysAgo);
        toEl.value = today;
    } else {
        customDiv.style.display = 'none';
    }
    renderSales();
}

// --- Multi-Device Sale ---
let saleDeviceCount = 0;

function addSaleDevice() {
    saleDeviceCount++;
    const id = saleDeviceCount;
    const available = state.inventory.filter(i => i.status === 'Disponible');
    if (available.length === 0) { alert('No hay equipos disponibles en inventario.'); return; }

    const options = available.map(i =>
        `<option value="${escapeHtml(i.serial)}">${escapeHtml(i.model)} — ${escapeHtml(i.serial)}</option>`
    ).join('');

    const row = document.createElement('div');
    row.id = `sale-device-${id}`;
    row.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:0.5rem;align-items:end;background:var(--light-gray);padding:0.75rem;border-radius:10px;';
    row.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Dispositivo ${id}</label>
            <div style="display:flex;gap:0.4rem;">
                <select id="sale-serial-${id}" onchange="updateSaleTotal()" required
                    style="flex:1;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;background:var(--white);">
                    ${options}
                </select>
                <button type="button" onclick="startScanner('sale-scanner-${id}')" title="Escanear"
                    style="background:var(--white);border:1.5px solid var(--border);border-radius:8px;padding:0 0.6rem;cursor:pointer;display:flex;align-items:center;">
                    <i data-lucide="scan" style="width:16px;height:16px;color:var(--deep-blue);"></i>
                </button>
            </div>
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Precio ($)</label>
            <input type="number" id="sale-price-${id}" min="0" oninput="updateSaleTotal()" required
                style="width:110px;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;">
        </div>
        <button type="button" onclick="removeSaleDevice(${id})"
            style="background:none;border:none;cursor:pointer;color:var(--vibrant-red);padding:0.4rem;align-self:end;margin-bottom:2px;">
            <i data-lucide="trash-2" style="width:18px;height:18px;"></i>
        </button>`;

    document.getElementById('saleDeviceList').appendChild(row);
    lucide.createIcons();
    updateSaleTotal();
}

function removeSaleDevice(id) {
    const el = document.getElementById(`sale-device-${id}`);
    if (el) el.remove();
    if (document.getElementById('saleDeviceList').children.length === 0) addSaleDevice();
    updateSaleTotal();
}

function updateSaleTotal() {
    const list = document.getElementById('saleDeviceList');
    if (!list) return;
    let total = 0;
    list.querySelectorAll('[id^="sale-price-"]').forEach(el => {
        total += parseFloat(el.value) || 0;
    });
    const display = document.getElementById('saleTotalDisplay');
    if (display) display.innerText = `$${Math.round(total).toLocaleString()}`;
}

const saleForm = document.getElementById('saleForm');
if (saleForm) saleForm.onsubmit = function (e) {
    e.preventDefault();
    const client = document.getElementById('m_sale_client').value.trim();
    const city = document.getElementById('m_sale_city').value.trim();
    const source = document.getElementById('m_sale_source').value;
    const saleDate = document.getElementById('m_sale_date').value;

    // --- EDIT MODE ---
    if (editingSaleIndex !== -1) {
        const priceEl = document.querySelector('#saleDeviceList [id^="sale-price-"]');
        const price = parseFloat(priceEl?.value);
        if (!price || price <= 0) { alert('Ingresa un precio válido.'); return; }
        const oldSerial = state.sales[editingSaleIndex].serial;
        state.sales[editingSaleIndex] = { ...state.sales[editingSaleIndex], price, client, city, source, saleDate };
        const trans = state.transactions.find(t => t.type === 'income' && t.category === 'Venta' && t.description.includes(oldSerial));
        if (trans) { trans.amount = price; trans.date = saleDate; trans.description = `Venta Equipo — ${oldSerial} — Cliente: ${client}`; }
        saveState(); closeModal('saleModal'); renderSales(); updateDashboard();
        return;
    }

    // --- NEW MODE ---
    const list = document.getElementById('saleDeviceList');
    const rows = list ? [...list.children] : [];

    if (rows.length === 0) { alert('Agrega al menos un dispositivo.'); return; }

    const serials = rows.map(row => {
        const sel = row.querySelector('[id^="sale-serial-"]');
        return sel ? sel.value : '';
    });
    if (new Set(serials).size !== serials.length) {
        alert('Hay dispositivos duplicados en la venta. Verifica los seriales.');
        return;
    }

    let allOk = true;
    rows.forEach(row => {
        const selEl = row.querySelector('[id^="sale-serial-"]');
        const priceEl = row.querySelector('[id^="sale-price-"]');
        if (!selEl || !priceEl) return;
        const serial = selEl.value;
        const price = parseFloat(priceEl.value);
        if (!serial || !price || price <= 0) { allOk = false; return; }
        const item = state.inventory.find(i => i.serial === serial);
        if (!item || item.status !== 'Disponible') {
            alert(`El equipo ${serial} ya no está disponible.`);
            allOk = false; return;
        }
        item.status = 'Vendido';
        state.sales.push({ serial, model: item.model, cost: item.cost, price, client, city, source, saleDate, createdAt: new Date().toISOString() });
        state.transactions.push({
            id: Date.now() + Math.random(),
            type: 'income', category: 'Venta',
            description: `Venta Equipo — ${serial} — Cliente: ${client}`,
            amount: price, date: saleDate, createdAt: new Date().toISOString()
        });
    });

    if (!allOk) return;
    saveState(); closeModal('saleModal'); renderSales(); updateDashboard();
};

function renderSales() {
    const searchInput = document.getElementById('searchSales');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const salePeriod = document.getElementById('filterSalePeriod') ? document.getElementById('filterSalePeriod').value : '';
    const saleFrom = document.getElementById('filterSaleFrom') ? document.getElementById('filterSaleFrom').value : '';
    const saleTo = document.getElementById('filterSaleTo') ? document.getElementById('filterSaleTo').value : '';
    const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

    const tbody = document.querySelector('#salesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = state.sales.filter(s => {
        const matchSearch =
            (s.client || '').toLowerCase().includes(search) ||
            (s.serial || '').toLowerCase().includes(search) ||
            (s.city || '').toLowerCase().includes(search);

        let matchDate = true;
        if (saleDateRange) {
            const d = parseDateLocal(s.saleDate);
            matchDate = d && d >= saleDateRange.from && d <= saleDateRange.to;
        }

        return matchSearch && matchDate;
    });

    // Orden descendente: último creado primero
    filtered.sort((a, b) => {
        const da = new Date(a.createdAt || a.saleDate).getTime() || 0;
        const db = new Date(b.createdAt || b.saleDate).getTime() || 0;
        return db - da;
    });

    filtered.forEach((s) => {
        if (!s) return;
        const index = state.sales.indexOf(s);
        const priceNum = parseFloat(s.price) || 0;
        const costNum = getSaleCost(s);
        const utility = priceNum - costNum;
        const utilityColor = utility < 0 ? 'var(--vibrant-red)' : '#047481';
        const margin = priceNum > 0 ? ((utility / priceNum) * 100).toFixed(0) : 0;

        const retBtn = s.returned
            ? `<span style="font-size:0.65rem; color:var(--vibrant-red); font-weight:800; background:rgba(238,66,78,0.1); padding:0.2rem 0.4rem; border-radius:100px;">DEVUELTO</span>`
            : `<button onclick="openReturnModal('${s.serial}')" title="Registrar devolución" style="background:none; border:none; cursor:pointer; color:var(--vibrant-red); display:flex; align-items:center; padding:0.25rem;">
                 <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
               </button>`;

        const eModel = escapeHtml(s.model);
        const eSerial = escapeHtml(s.serial);
        const eClient = escapeHtml(s.client);
        const eSource = escapeHtml(s.source);
        const safeRetBtn = s.returned
            ? `<span style="font-size:0.65rem; color:var(--vibrant-red); font-weight:800; background:rgba(238,66,78,0.1); padding:0.2rem 0.4rem; border-radius:100px;">DEVUELTO</span>`
            : `<button onclick="openReturnModal('${eSerial}')" title="Registrar devolución" style="background:none; border:none; cursor:pointer; color:var(--vibrant-red); display:flex; align-items:center; padding:0.25rem;">
                 <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
               </button>`;

        tbody.innerHTML += `
            <tr>
                <td data-label="Fecha">${escapeHtml(s.saleDate)}</td>
                <td data-label="Modelo">${eModel} <br><small>${eSerial}</small></td>
                <td data-label="Cliente">${eClient}</td>
                <td data-label="Precio"><strong>$${priceNum.toLocaleString()}</strong></td>
                <td data-label="Utilidad" style="color: ${utilityColor}; font-weight: 700;">
                    $${utility.toLocaleString()} <br><small style="color:var(--text-gray)">${margin}%</small>
                </td>
                <td data-label="Canal"><span class="badge" style="background:#E2E8F0; color:var(--deep-blue)">${eSource}</span></td>
                <td data-label="Acciones">
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <button onclick="editSale('${eSerial}')" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>
                        <button onclick="deleteSale('${eSerial}')" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>
                        ${safeRetBtn}
                    </div>
                </td>
            </tr>`;
    });

    const countEl = document.getElementById('salesResultCount');
    if (countEl) {
        countEl.innerText = saleDateRange
            ? `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en el período`
            : `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en total`;
    }
    lucide.createIcons();
}

function editSale(serial) {
    const index = state.sales.findIndex(s => s.serial === serial);
    if (index === -1) return;
    editingSaleIndex = index;
    const s = state.sales[index];

    populateSources();
    document.getElementById('m_sale_date').value = s.saleDate;
    document.getElementById('m_sale_client').value = s.client;
    document.getElementById('m_sale_city').value = s.city;
    document.getElementById('m_sale_source').value = s.source;

    const deviceList = document.getElementById('saleDeviceList');
    if (deviceList) deviceList.innerHTML = '';
    saleDeviceCount = 0;
    saleDeviceCount++;
    const id = saleDeviceCount;

    const eModel = escapeHtml(s.model);
    const eSerial = escapeHtml(s.serial);
    const row = document.createElement('div');
    row.id = `sale-device-${id}`;
    row.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:0.5rem;align-items:end;background:var(--light-gray);padding:0.75rem;border-radius:10px;';
    row.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Dispositivo — ${eModel}</label>
            <input type="text" value="${eSerial} — ${eModel}" readonly
                style="width:100%;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;background:var(--light-gray);color:var(--text-gray);cursor:not-allowed;">
            <input type="hidden" id="sale-serial-${id}" value="${eSerial}">
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:0.75rem;margin-bottom:0.25rem;display:block;">Precio ($)</label>
            <input type="number" id="sale-price-${id}" value="${s.price}" min="0" oninput="updateSaleTotal()" required
                style="width:120px;padding:0.55rem 0.75rem;border:1.5px solid var(--border);border-radius:8px;font-size:0.85rem;">
        </div>`;
    deviceList.appendChild(row);
    updateSaleTotal();
    openModal('saleModal');
    lucide.createIcons();
}

function deleteSale(serial) {
    if (confirm('¿Eliminar esta venta? Se ajustará el inventario y las finanzas automáticamente.')) {
        const index = state.sales.findIndex(s => s.serial === serial);
        if (index === -1) return;
        const s = state.sales[index];

        // 1. Revertir inventario
        const item = state.inventory.find(i => i.serial === s.serial);
        if (item) {
            item.status = 'Disponible';
            if (item.returnNote) delete item.returnNote;
        }

        // 2. Eliminar transacción financiera de la venta
        state.transactions = state.transactions.filter(t => 
            !(t.type === 'income' && t.description.includes(serial) && t.category === 'Venta')
        );

        // 3. Si fue devuelta, eliminar el registro de devolución y su transacción
        if (s.returned) {
            const retId = s.returnId;
            state.returns = (state.returns || []).filter(r => r.id !== retId);
            state.transactions = state.transactions.filter(t => 
                !(t.category === 'Devolución' && t.description.includes(serial))
            );
        }

        // 4. Eliminar la venta
        state.sales.splice(index, 1);
        
        saveState();
        renderSales();
        updateDashboard();
    }
}

const returnForm = document.getElementById('returnForm');
if (returnForm) returnForm.onsubmit = async (e) => {
    e.preventDefault();
    if (currentReturnSaleIndex === -1) return;

    const s = state.sales[currentReturnSaleIndex];
    const item = state.inventory.find(i => i.serial === s.serial);
    const cost = item ? (item.cost || 0) : 0;
    const action = document.getElementById('m_ret_action').value;
    const condition = document.getElementById('m_ret_condition').value;

    // Crear registro de devolución
    const ret = {
        id: 'RET-' + Date.now(),
        serial: s.serial,
        model: s.model || '',
        client: s.client || '',
        city: s.city || '',
        saleDate: s.saleDate || '',
        returnDate: document.getElementById('m_ret_date').value,
        salePrice: s.price || 0,
        cost: cost,
        reason: document.getElementById('m_ret_reason').value,
        condition: condition,
        action: action,
        notes: document.getElementById('m_ret_notes').value,
        source: s.source || '',
        createdAt: new Date().toISOString()
    };

    // Agregar a state.returns
    if (!state.returns) state.returns = [];
    state.returns.push(ret);

    // Trazabilidad: marcar la venta como devuelta
    state.sales[currentReturnSaleIndex].returned = true;
    state.sales[currentReturnSaleIndex].returnId = ret.id;

    // Acción sobre el inventario según decisión
    if (action === 'Reingreso' && item) {
        // Volver a disponible
        item.status = 'Disponible';
        item.entryDate = ret.returnDate;
        item.returnNote = `Reingreso por devolución ${ret.id}`;
    } else if (action === 'Baja' && item) {
        item.status = 'Baja';
        item.returnNote = `Baja por devolución ${ret.id}`;
    } else if (action === 'Garantía' && item) {
        item.status = 'Garantía';
        item.returnNote = `En garantía por devolución ${ret.id}`;
    }

    // Registrar automáticamente en finanzas como egreso
    // si el precio de venta fue cobrado (impacto financiero)
    state.transactions.push({
        type: 'expense',
        category: 'Devolución',
        description: `Devolución ${ret.id} — ${escapeHtml(s.serial)} — Cliente: ${escapeHtml(s.client || 'N/A')}`,
        amount: s.price || 0,
        date: ret.returnDate,
        createdAt: new Date().toISOString()
    });

    await saveState();
    closeReturnModal();
    renderSales();
    updateDashboard();

    alert(`✅ Devolución ${ret.id} registrada.\n` +
          `Acción: ${action}\n` +
          `El equipo fue marcado como: ${
              action === 'Reingreso' ? 'Disponible' :
              action === 'Garantía' ? 'En Garantía' : 'Baja'
          }`);
};
