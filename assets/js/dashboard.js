function updateDashboard() {
    const now = new Date();
    const curM = now.getMonth();
    const curY = now.getFullYear();
    
    const prevM = curM === 0 ? 11 : curM - 1;
    const prevY = curM === 0 ? curY - 1 : curY;

    const getSaleTotal = (s) => {
        if (s.total) return parseFloat(s.total) || 0;
        if (s.price) return parseFloat(s.price) || 0;
        if (s.devices && Array.isArray(s.devices)) {
            return s.devices.reduce((a, d) => a + (parseFloat(d.price) || 0), 0);
        }
        return 0;
    };

    const filterCurM = (dStr) => { const d = parseDateLocal(dStr); return d && d.getMonth() === curM && d.getFullYear() === curY; };
    const filterPrevM = (dStr) => { const d = parseDateLocal(dStr); return d && d.getMonth() === prevM && d.getFullYear() === prevY; };

    const salesCurM = state.sales.filter(s => filterCurM(s.saleDate) && s.returned !== true);
    const salesPrevM = state.sales.filter(s => filterPrevM(s.saleDate) && s.returned !== true);
    
    const otherIncomeCurM = (state.transactions || []).filter(t => t.type === 'income' && t.category !== 'Venta' && filterCurM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
    const otherIncomePrevM = (state.transactions || []).filter(t => t.type === 'income' && t.category !== 'Venta' && filterPrevM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);

    const incomeCurM = salesCurM.reduce((a, s) => a + getSaleTotal(s), 0) + otherIncomeCurM;
    const incomePrevM = salesPrevM.reduce((a, s) => a + getSaleTotal(s), 0) + otherIncomePrevM;

    const costCurM = salesCurM.reduce((a, s) => a + getSaleCost(s), 0);
    const expCurM = (state.transactions || []).filter(t => t.type === 'expense' && t.category !== 'Devolución' && filterCurM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
    const returnsCurM = (state.returns || []).filter(r => filterCurM(r.returnDate)).reduce((a, r) => a + (parseFloat(r.salePrice) || 0), 0);
    const profitCurM = incomeCurM - costCurM - expCurM - returnsCurM;
    
    const costPrevM = salesPrevM.reduce((a, s) => a + getSaleCost(s), 0);
    const expPrevM = (state.transactions || []).filter(t => t.type === 'expense' && t.category !== 'Devolución' && filterPrevM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
    const returnsPrevM = (state.returns || []).filter(r => filterPrevM(r.returnDate)).reduce((a, r) => a + (parseFloat(r.salePrice) || 0), 0);
    const profitPrevM = incomePrevM - costPrevM - expPrevM - returnsPrevM;

    const getVarBadge = (cur, prev) => {
        if (!prev || prev === 0) return '';
        const diff = ((cur - prev) / Math.abs(prev)) * 100;
        const icon = diff >= 0 ? 'arrow-up' : 'arrow-down';
        const color = diff >= 0 ? '#047481' : 'var(--vibrant-red)';
        return `<span style="font-size:0.7rem; font-weight:700; color:${color}; margin-left:0.5rem; display:inline-flex; align-items:center; gap:0.1rem;">
                    <i data-lucide="${icon}" style="width:10px;height:10px;"></i> ${Math.abs(diff).toFixed(0)}%
                </span>`;
    };

    const kpiUtility = document.getElementById('kpi-utility');
    if (kpiUtility) {
        kpiUtility.innerHTML = `$${profitCurM.toLocaleString()} ${getVarBadge(profitCurM, profitPrevM)}`;
        kpiUtility.parentElement.style.borderLeft = `4px solid ${profitCurM >= 0 ? '#047481' : 'var(--vibrant-red)'}`;
    }

    const kpiSold = document.getElementById('kpi-sold');
    if (kpiSold) kpiSold.innerHTML = `${salesCurM.length} ${getVarBadge(salesCurM.length, salesPrevM.length)}`;

    const kpiStock = document.getElementById('kpi-stock');
    if (kpiStock) kpiStock.innerText = (state.inventory || []).filter(i => i.status === 'Disponible').length;

    // Rotación promedio
    const soldItems = (state.inventory || []).filter(i => i.status === 'Vendido');
    let rotationText = '0 días';
    if (soldItems.length > 0) {
        let totalDays = 0;
        let count = 0;
        soldItems.forEach(i => {
            const s = state.sales.find(sale => sale.serial === i.serial);
            if (s) {
                const start = parseDateLocal(i.entryDate);
                const end = parseDateLocal(s.saleDate);
                totalDays += Math.floor((end - start) / (1000 * 60 * 60 * 24));
                count++;
            }
        });
        if (count > 0) rotationText = `${Math.round(totalDays / count)} días`;
    }
    const kpiRotation = document.getElementById('kpi-rotation');
    if (kpiRotation) kpiRotation.innerText = rotationText;

    const returnsM = (state.returns || []).filter(r => filterCurM(r.returnDate));
    const retBadge = document.getElementById('kpi-returns-badge');
    if (retBadge) {
        retBadge.innerText = returnsM.length > 0 ? `${returnsM.length} dev. este mes` : '';
        retBadge.style.display = returnsM.length > 0 ? 'inline' : 'none';
    }

    updateChartsData();
    renderStockBars();
    lucide.createIcons();
}

function renderStockBars() {
    const container = document.getElementById('inventoryBars');
    if (!container) return;
    container.innerHTML = '';

    const thresholds = state.settings?.thresholds || {};
    const uniqueModels = Array.from(new Set([
        ...Object.keys(thresholds),
        ...(state.inventory || []).map(i => i.model)
    ])).filter(Boolean);

    console.log('Modelos encontrados:', uniqueModels);

    uniqueModels.forEach(model => {
        const threshold = state.settings.thresholds[model] !== undefined ? state.settings.thresholds[model] : 5;
        const count = state.inventory.filter(
            i => i && i.model === model && i.status === 'Disponible'
        ).length;

        const isBelowThreshold = count < threshold;
        const pct = threshold > 0
            ? Math.min((count / threshold) * 100, 100)
            : 100;

        const barColor = isBelowThreshold ? 'var(--vibrant-red)' : '#047481';
        const countColor = isBelowThreshold ? 'var(--vibrant-red)' : '#047481';
        const alertText = isBelowThreshold ? '⚠ Stock bajo' : '✓ Stock OK';
        const alertColor = isBelowThreshold ? 'var(--vibrant-red)' : '#047481';

        const eModel = escapeHtml(model);
        container.innerHTML += `
            <div class="stock-item">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; width: 100%;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span class="stock-label" style="font-weight:700; color:var(--deep-blue);">
                            ${eModel}
                        </span>
                        <span style="
                            font-size: 0.65rem;
                            font-weight: 700;
                            color: ${alertColor};
                            background: ${isBelowThreshold
                                ? 'rgba(238,66,78,0.08)'
                                : 'rgba(4,116,129,0.08)'};
                            padding: 0.15rem 0.5rem;
                            border-radius: 100px;
                         ">${alertText}</span>
                    </div>
                    <span class="stock-count" style="color:${countColor}; font-weight:800;">
                        ${count}
                    </span>
                </div>
                <div class="progress-bg">
                    <div class="progress-fill" style="width: ${pct}%; background: ${barColor};"></div>
                </div>
            </div>`;
    });

    const bajosCount = uniqueModels.filter(m => {
        const threshold = thresholds[m] !== undefined ? thresholds[m] : 5;
        const count = state.inventory.filter(
            i => i && i.model === m && i.status === 'Disponible'
        ).length;
        return count < threshold;
    }).length;

    const summaryEl = document.getElementById('stockAlertSummary');
    if (summaryEl) {
        if (bajosCount === 0) {
            summaryEl.style.color = '#047481';
            summaryEl.innerText = '✓ Todo el stock en niveles normales';
        } else {
            summaryEl.style.color = 'var(--vibrant-red)';
            summaryEl.innerText = `⚠ ${bajosCount} modelo${bajosCount > 1 ? 's' : ''} con stock bajo`;
        }
    }
}
