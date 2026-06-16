function onInvPeriodChange() {
    const period = document.getElementById('filterInvPeriod').value;
    const customDiv = document.getElementById('customInvDates');
    if (period === 'custom') {
        customDiv.style.display = 'flex';
        const today = getLocalDateString();
        const fromEl = document.getElementById('filterInvFrom');
        const toEl = document.getElementById('filterInvTo');
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
    renderInventory();
}

const invForm = document.getElementById('inventoryForm');
if (invForm) invForm.onsubmit = function (e) {
    e.preventDefault();
    const serial = document.getElementById('m_inv_serial').value.trim();
    const model = document.getElementById('m_inv_model').value;
    const imei = document.getElementById('m_inv_imei').value;
    const cost = parseFloat(document.getElementById('m_inv_cost').value);
    const entryDate = document.getElementById('m_inv_date').value;

    if (editingInventoryIndex === -1) {
        if (state.inventory.find(i => i.serial === serial)) { alert('Serial duplicado.'); return; }
        state.inventory.push({ serial, model, imei, cost, entryDate: entryDate, status: 'Disponible' });
    } else {
        state.inventory[editingInventoryIndex] = { 
            ...state.inventory[editingInventoryIndex], 
            model, imei, cost, entryDate 
        };
    }
    saveState();
    closeModal('inventoryModal');
    renderInventory();
};

function renderInventory() {
    const searchInput = document.getElementById('searchInventory');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const modelFilter = document.getElementById('filterModelHidden') ?
        document.getElementById('filterModelHidden').value : '';
    const invPeriod = document.getElementById('filterInvPeriod')
        ? document.getElementById('filterInvPeriod').value : '';
    const invFrom = document.getElementById('filterInvFrom')
        ? document.getElementById('filterInvFrom').value : '';
    const invTo = document.getElementById('filterInvTo')
        ? document.getElementById('filterInvTo').value : '';
    const invDateRange = getDateRangeFilter(invPeriod, invFrom, invTo);

    const tbody = document.querySelector('#inventoryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filteredInv = state.inventory.filter(i => {
        const matchSearch = (i.serial || '').toLowerCase().includes(search) || (i.imei || '').toLowerCase().includes(search);
        const matchModel = !modelFilter || i.model === modelFilter;
        let matchDate = true;
        if (invDateRange) {
            const d = parseDateLocal(i.entryDate);
            matchDate = d && d >= invDateRange.from && d <= invDateRange.to;
        }
        return matchSearch && matchModel && matchDate;
    });

    // Orden cronológico descendente
    filteredInv.sort((a, b) => {
        const da = parseDateLocal(a.entryDate) || 0;
        const db = parseDateLocal(b.entryDate) || 0;
        return db - da;
    });

    const now = new Date();
    filteredInv.forEach((i) => {
        if (!i) return;
        const statusColor =
            i.status === 'Disponible' ? '#047481' :
            i.status === 'Vendido' ? 'var(--deep-blue)' :
            i.status === 'Garantía' ? '#B7791F' :
            i.status === 'Baja' ? 'var(--vibrant-red)' :
            'var(--text-gray)';

        const entryDate = parseDateLocal(i.entryDate);
        const sale = state.sales.find(s => s.serial === i.serial);
        let daysText = '-';
        let stagnantStyle = '';

        if (i.status === 'Disponible') {
            const days = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
            daysText = `${days} días`;
            if (days > 30) stagnantStyle = 'background:rgba(183,121,31,0.1); color:#B7791F; font-weight:700; border-radius:4px; padding:0.1rem 0.3rem;';
        } else if (sale) {
            const saleDate = parseDateLocal(sale.saleDate);
            const days = Math.floor((saleDate - entryDate) / (1000 * 60 * 60 * 24));
            daysText = `${days} días`;
        }

        const eSerial = escapeHtml(i.serial);
        const eModel = escapeHtml(i.model);
        const eReturnNote = escapeHtml(i.returnNote);
        tbody.innerHTML += `
            <tr>
                <td data-label="Serial"><strong>${eSerial}</strong></td>
                <td data-label="Modelo">${eModel}</td>
                <td data-label="Ingreso" style="font-size:0.75rem;">${escapeHtml(i.entryDate)}</td>
                <td data-label="Días"><span style="${stagnantStyle}">${daysText}</span></td>
                <td data-label="Costo">$${(parseFloat(i.cost) || 0).toLocaleString()}</td>
                <td data-label="Estado">
                    <span style="
                        padding: 0.25rem 0.75rem;
                        border-radius: 100px;
                        font-size: 0.75rem;
                        font-weight: 700;
                        color: ${statusColor};
                        background: ${statusColor}18;">
                        ${escapeHtml(i.status)}
                    </span>
                    ${eReturnNote
                        ? '<div style="font-size:0.7rem; color:var(--text-gray); margin-top:0.2rem;">' + eReturnNote + '</div>'
                        : ''}
                </td>
                <td data-label="Acciones">
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="editInventory('${eSerial}')" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>
                        <button onclick="deleteItem('${eSerial}')" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>
                    </div>
                </td>
            </tr>`;
    });

    const invCountEl = document.getElementById('invResultCount');
    if (invCountEl) {
        invCountEl.innerText = invDateRange
            ? `${filteredInv.length} equipo${filteredInv.length !== 1 ? 's' : ''} en el período`
            : `${filteredInv.length} equipo${filteredInv.length !== 1 ? 's' : ''} en total`;
    }
    lucide.createIcons();
}

function editInventory(serial) {
    const index = state.inventory.findIndex(i => i.serial === serial);
    if (index === -1) return;
    editingInventoryIndex = index;
    const i = state.inventory[index];
    document.getElementById('m_inv_serial').value = i.serial;
    document.getElementById('m_inv_imei').value = i.imei || '';
    document.getElementById('m_inv_cost').value = i.cost;
    openModal('inventoryModal');
}

function deleteItem(serial) {
    if (confirm('¿Eliminar este equipo? Se borrarán también sus ventas y registros financieros asociados.')) {
        // 1. Limpiar ventas y sus finanzas
        const sale = state.sales.find(s => s.serial === serial);
        if (sale) {
            // Eliminar ingreso de la venta
            state.transactions = state.transactions.filter(t => 
                !(t.type === 'income' && t.description.includes(serial))
            );
            // Eliminar devolución si existe
            if (sale.returned) {
                state.returns = (state.returns || []).filter(r => r.serial !== serial);
                state.transactions = state.transactions.filter(t => 
                    !(t.category === 'Devolución' && t.description.includes(serial))
                );
            }
            state.sales = state.sales.filter(s => s.serial !== serial);
        }
        
        // 2. Eliminar del inventario
        state.inventory = state.inventory.filter(i => i.serial !== serial);
        
        saveState();
        renderInventory();
        updateDashboard();
    }
}


