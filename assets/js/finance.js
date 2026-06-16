function populateFinanceCategories() {
    const select = document.getElementById('m_trans_category');
    select.innerHTML = '';
    state.settings.categories.forEach(c => {
        const ec = escapeHtml(c);
        select.innerHTML += `<option value="${ec}">${ec}</option>`;
    });
}

const txForm = document.getElementById('transactionForm');
if (txForm) txForm.onsubmit = function (e) {
    e.preventDefault();
    const type = document.getElementById('m_trans_type').value;
    const category = document.getElementById('m_trans_category').value;
    const description = document.getElementById('m_trans_desc').value;
    const amount = parseFloat(document.getElementById('m_trans_amount').value);
    const date = document.getElementById('m_trans_date').value;
    const id = editingFinanceIndex !== -1 ? state.transactions[editingFinanceIndex].id : Date.now();

    if (editingFinanceIndex === -1) {
        state.transactions.push({ id, type, category, description, amount, date });
    } else {
        state.transactions[editingFinanceIndex] = { id, type, category, description, amount, date };
    }
    saveState();
    closeModal('transactionModal');
    renderFinance();
};

function renderFinance() {
    const typeEl = document.getElementById('filterFinanceType');
    const catEl = document.getElementById('filterFinanceCategory');
    if (!typeEl || !catEl) return;
    const typeFilter = typeEl.value;
    const catFilter = catEl.value;
    const tbody = document.querySelector('#financeTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // Reconstruir dropdown solo si es necesario (cuando cambia la vista)
    if (catEl.options.length <= 1) {
        catEl.innerHTML = '<option value="">Todas las categorías</option>';
        state.settings.categories.forEach(c => {
            const ec = escapeHtml(c);
            catEl.innerHTML += `<option value="${ec}">${ec}</option>`;
        });
        catEl.value = catFilter;
    }

    const filteredTxList = state.transactions.filter(t => {
        if (!t) return false;
        return (!typeFilter || t.type === typeFilter) && (!catFilter || t.category === catFilter);
    });

    // Orden cronológico descendente
    filteredTxList.sort((a, b) => {
        const da = parseDateLocal(a.date) || 0;
        const db = parseDateLocal(b.date) || 0;
        return db - da;
    });

    filteredTxList.forEach((t) => {
        const isExpense = t.type === 'expense';
        const amountNum = parseFloat(t.amount) || 0;
        const isAuto = t.category === 'Venta' || t.category === 'Devolución';
        const autoBadge = isAuto ? `<span class="badge" style="background:#E2E8F0; color:var(--text-gray); font-size:0.65rem; margin-left:0.5rem; font-weight:600; padding:0.15rem 0.4rem;">Auto</span>` : '';
        
        const editBtn = isAuto 
            ? `<button disabled style="background:none; border:none; color:var(--border); cursor:not-allowed;"><i data-lucide="pencil" size="18"></i></button>`
            : `<button onclick="editFinance(${t.id})" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>`;
            
        const deleteBtn = isAuto 
            ? `<button disabled style="background:none; border:none; color:var(--border); cursor:not-allowed;"><i data-lucide="trash-2" size="18"></i></button>`
            : `<button onclick="deleteFinance(${t.id})" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>`;

        const eCategory = escapeHtml(t.category);
        const eDescription = escapeHtml(t.description);
        tbody.innerHTML += `
            <tr>
                <td>${escapeHtml(t.date)}</td>
                <td>${t.type === 'income' ? 'Ingreso' : 'Egreso'}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:0.25rem;">
                        <span class="badge badge-pill">${eCategory}</span>
                        ${autoBadge}
                    </div>
                </td>
                <td>${eDescription}</td>
                <td style="color: ${isExpense ? 'var(--vibrant-red)' : '#047481'}; font-weight: 700;">${isExpense ? '-' : '+'} $${amountNum.toLocaleString()}</td>
                <td>
                    <div style="display:flex; gap:0.5rem;">
                        ${editBtn}
                        ${deleteBtn}
                    </div>
                </td>
            </tr>`;
    });

    // Balance del período
    const filteredTx = state.transactions.filter(t =>
        (!typeFilter || t.type === typeFilter) && (!catFilter || t.category === catFilter)
    );
    const totalInc = filteredTx.filter(t => t.type === 'income').reduce((a,t) => a + (parseFloat(t.amount)||0), 0);
    const totalExp = filteredTx.filter(t => t.type === 'expense').reduce((a,t) => a + (parseFloat(t.amount)||0), 0);
    const balance = totalInc - totalExp;
    const balanceSummaryEl = document.getElementById('financeBalanceSummary');
    if (balanceSummaryEl) {
        balanceSummaryEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-top:1px solid var(--border);">
                <span style="font-size:0.85rem;color:var(--text-gray);">Total Ingresos</span>
                <span style="font-weight:700;color:#047481;">+$${totalInc.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-top:1px solid var(--border);">
                <span style="font-size:0.85rem;color:var(--text-gray);">Total Egresos</span>
                <span style="font-weight:700;color:var(--vibrant-red);">-$${totalExp.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:0.75rem 0;border-top:2px solid var(--border);margin-top:0.25rem;">
                <span style="font-weight:700;font-size:1rem;">Balance</span>
                <span style="font-weight:800;font-size:1.1rem;color:${balance>=0?'#047481':'var(--vibrant-red)'};">${balance>=0?'+':''}$${balance.toLocaleString()}</span>
            </div>`;
    }
    lucide.createIcons();
}

function editFinance(id) {
    const index = state.transactions.findIndex(t => t.id === id);
    if (index === -1) return;
    const t = state.transactions[index];
    if (t.category === 'Venta' || t.category === 'Devolución') {
        alert('Las transacciones automáticas no pueden ser editadas directamente.');
        return;
    }
    editingFinanceIndex = index;
    document.getElementById('m_trans_type').value = t.type;
    populateFinanceCategories();
    document.getElementById('m_trans_category').value = t.category;
    document.getElementById('m_trans_desc').value = t.description;
    document.getElementById('m_trans_amount').value = t.amount;
    document.getElementById('m_trans_date').value = t.date;
    openModal('transactionModal');
}

function deleteFinance(id) {
    const index = state.transactions.findIndex(t => t.id === id);
    if (index === -1) return;
    const t = state.transactions[index];
    if (t.category === 'Venta' || t.category === 'Devolución') {
        alert('Las transacciones automáticas no pueden ser eliminadas directamente.');
        return;
    }
    if (confirm('¿Eliminar esta transacción?')) {
        state.transactions.splice(index, 1);
        saveState();
        renderFinance();
    }
}
