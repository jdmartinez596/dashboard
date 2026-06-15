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

document.getElementById('saleForm').onsubmit = function (e) {
    e.preventDefault();
    const serial = document.getElementById('m_sale_serial').value;
    const client = document.getElementById('m_sale_client').value;
    const city = document.getElementById('m_sale_city').value;
    const source = document.getElementById('m_sale_source').value;
    const saleDate = document.getElementById('m_sale_date').value;
    const price = parseFloat(document.getElementById('m_sale_price').value);

    if (editingSaleIndex === -1) {
        const item = state.inventory.find(i => i.serial === serial);
        if (!serial || !item) { alert('No hay equipos disponibles para vender.'); return; }
        item.status = 'Vendido';
        state.sales.push({ serial, model: item.model, cost: item.cost, price, client, city, source, saleDate });
        
        // Registro contable automÃ¡tico
        state.transactions.push({
            id: Date.now(),
            type: 'income',
            category: 'Venta',
            description: `Venta Equipo â€” ${serial} â€” Cliente: ${client}`,
            amount: price,
            date: saleDate
        });
    } else {
        const oldSerial = state.sales[editingSaleIndex].serial;
        state.sales[editingSaleIndex] = { ...state.sales[editingSaleIndex], price, client, city, source, saleDate };
        
        // Actualizar registro contable existente
        const trans = state.transactions.find(t => t.type === 'income' && t.description.includes(oldSerial));
        if (trans) {
            trans.description = `Venta Equipo â€” ${oldSerial} â€” Cliente: ${client}`;
            trans.amount = price;
            trans.date = saleDate;
        }
    }
    saveState();
    closeModal('saleModal');
    renderSales();
    updateDashboard();
};

function renderSales() {
    const search = document.getElementById('searchSales').value.toLowerCase().trim();
    const salePeriod = document.getElementById('filterSalePeriod') ? document.getElementById('filterSalePeriod').value : '';
    const saleFrom = document.getElementById('filterSaleFrom') ? document.getElementById('filterSaleFrom').value : '';
    const saleTo = document.getElementById('filterSaleTo') ? document.getElementById('filterSaleTo').value : '';
    const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

    const tbody = document.querySelector('#salesTable tbody');
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

    // Orden cronolÃ³gico descendente
    filtered.sort((a, b) => {
        const da = parseDateLocal(a.saleDate) || 0;
        const db = parseDateLocal(b.saleDate) || 0;
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
            : `<button onclick="openReturnModal('${s.serial}')" title="Registrar devoluciÃ³n" style="background:none; border:none; cursor:pointer; color:var(--vibrant-red); display:flex; align-items:center; padding:0.25rem;">
                 <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
               </button>`;

        tbody.innerHTML += `
            <tr>
                <td>${s.saleDate}</td>
                <td>${s.model} <br><small>${s.serial}</small></td>
                <td>${s.client}</td>
                <td><strong>$${priceNum.toLocaleString()}</strong></td>
                <td style="color: ${utilityColor}; font-weight: 700;">
                    $${utility.toLocaleString()} <br><small style="color:var(--text-gray)">${margin}%</small>
                </td>
                <td><span class="badge" style="background:#E2E8F0; color:var(--deep-blue)">${s.source}</span></td>
                <td>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <button onclick="editSale('${s.serial}')" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>
                        <button onclick="deleteSale('${s.serial}')" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>
                        ${retBtn}
                    </div>
                </td>
            </tr>`;
    });

    const countEl = document.getElementById('salesResultCount');
    if (countEl) {
        countEl.innerText = saleDateRange
            ? `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en el perÃ­odo`
            : `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en total`;
    }
    lucide.createIcons();
}

function editSale(serial) {
    const index = state.sales.findIndex(s => s.serial === serial);
    if (index === -1) return;
    editingSaleIndex = index;
    const s = state.sales[index];
    createSearchableSelect({
        wrapperId: 'saleSerialWrapper',
        hiddenInputId: 'm_sale_serial',
        placeholder: 'Serial del equipo',
        options: [{ value: s.serial, label: `${s.serial} â€” ${s.model}` }]
    });
    populateSources();
    document.getElementById('m_sale_serial').value = s.serial;
    document.getElementById('saleSerialWrapper_input').value = `${s.serial} â€” ${s.model}`;
    document.getElementById('m_sale_client').value = s.client;
    document.getElementById('m_sale_city').value = s.city;
    document.getElementById('m_sale_source').value = s.source;
    document.getElementById('m_sale_date').value = s.saleDate;
    document.getElementById('m_sale_price').value = s.price;
    openModal('saleModal');
}

function deleteSale(serial) {
    if (confirm('Â¿Eliminar esta venta? Se ajustarÃ¡ el inventario y las finanzas automÃ¡ticamente.')) {
        const index = state.sales.findIndex(s => s.serial === serial);
        if (index === -1) return;
        const s = state.sales[index];

        // 1. Revertir inventario
        const item = state.inventory.find(i => i.serial === s.serial);
        if (item) {
            item.status = 'Disponible';
            if (item.returnNote) delete item.returnNote;
        }

        // 2. Eliminar transacciÃ³n financiera de la venta
        state.transactions = state.transactions.filter(t => 
            !(t.type === 'income' && t.description.includes(serial) && t.category === 'Venta')
        );

        // 3. Si fue devuelta, eliminar el registro de devoluciÃ³n y su transacciÃ³n
        if (s.returned) {
            const retId = s.returnId;
            state.returns = (state.returns || []).filter(r => r.id !== retId);
            state.transactions = state.transactions.filter(t => 
                !(t.category === 'DevoluciÃ³n' && t.description.includes(serial))
            );
        }

        // 4. Eliminar la venta
        state.sales.splice(index, 1);
        
        saveState();
        renderSales();
        updateDashboard();
    }
}

document.getElementById('returnForm').onsubmit = async (e) => {
    e.preventDefault();
    if (currentReturnSaleIndex === -1) return;

    const s = state.sales[currentReturnSaleIndex];
    const item = state.inventory.find(i => i.serial === s.serial);
    const cost = item ? (item.cost || 0) : 0;
    const action = document.getElementById('m_ret_action').value;
    const condition = document.getElementById('m_ret_condition').value;

    // Crear registro de devoluciÃ³n
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
        source: s.source || ''
    };

    // Agregar a state.returns
    if (!state.returns) state.returns = [];
    state.returns.push(ret);

    // Trazabilidad: marcar la venta como devuelta
    state.sales[currentReturnSaleIndex].returned = true;
    state.sales[currentReturnSaleIndex].returnId = ret.id;

    // AcciÃ³n sobre el inventario segÃºn decisiÃ³n
    if (action === 'Reingreso' && item) {
        // Volver a disponible
        item.status = 'Disponible';
        item.entryDate = ret.returnDate;
        item.returnNote = `Reingreso por devoluciÃ³n ${ret.id}`;
    } else if (action === 'Baja' && item) {
        item.status = 'Baja';
        item.returnNote = `Baja por devoluciÃ³n ${ret.id}`;
    } else if (action === 'GarantÃ­a' && item) {
        item.status = 'GarantÃ­a';
        item.returnNote = `En garantÃ­a por devoluciÃ³n ${ret.id}`;
    }

    // Registrar automÃ¡ticamente en finanzas como egreso
    // si el precio de venta fue cobrado (impacto financiero)
    state.transactions.push({
        type: 'expense',
        category: 'DevoluciÃ³n',
        description: `DevoluciÃ³n ${ret.id} â€” ${s.serial} â€” Cliente: ${s.client || 'N/A'}`,
        amount: s.price || 0,
        date: ret.returnDate
    });

    await saveState();
    closeReturnModal();
    renderSales();
    updateDashboard();

    alert(`âœ… DevoluciÃ³n ${ret.id} registrada.\n` +
          `AcciÃ³n: ${action}\n` +
          `El equipo fue marcado como: ${
              action === 'Reingreso' ? 'Disponible' :
              action === 'GarantÃ­a' ? 'En GarantÃ­a' : 'Baja'
          }`);
};
