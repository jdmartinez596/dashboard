// --- Navigation ---
function showView(viewId) {
    // Cerrar sidebar al navegar en mÃ³vil
    const sidebar = document.querySelector('.sidebar');
    if (sidebar.classList.contains('sidebar-open')) toggleSidebar();

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick').includes(viewId)) item.classList.add('active');
    });
    if (viewId === 'inventory') {
        initInventoryFilter();
        renderInventory();
    }
    if (viewId === 'sales') renderSales();
    if (viewId === 'finance') renderFinance();
    if (viewId === 'accounting') renderAccounting();
    if (viewId === 'returns') renderReturns();
    if (viewId === 'settings') renderSettings();
    lucide.createIcons();
}

// --- Modals ---
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
        // Precargar fecha de hoy por defecto
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
    }
    if (id === 'inventoryModal')   editingInventoryIndex = -1;
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

    // Mostrar info de la venta original
    document.getElementById('returnSaleInfo').innerHTML = `
        <strong style="color:var(--deep-blue);">
            Venta original
        </strong><br>
        ðŸ“¦ <b>Serial:</b> ${s.serial} â€” ${s.model || ''}<br>
        ðŸ‘¤ <b>Cliente:</b> ${s.client || 'N/A'}
            (${s.city || 'N/A'})<br>
        ðŸ“… <b>Fecha venta:</b> ${s.saleDate || 'N/A'}<br>
        ðŸ’µ <b>Precio venta:</b>
            $${(s.price || 0).toLocaleString()}<br>
        ðŸ“Š <b>Utilidad original:</b>
            $${((s.price || 0) - cost).toLocaleString()}
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
