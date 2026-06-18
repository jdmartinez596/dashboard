function onAccountingPeriodChange() {
    const period = document.getElementById('accPeriod').value;
    const customDiv = document.getElementById('customAccDates');
    if (period === 'custom') {
        customDiv.style.display = 'flex';
        const today = getLocalDateString();
        const fromEl = document.getElementById('accFrom');
        const toEl = document.getElementById('accTo');
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
    renderAccounting();
}

function renderAccounting() {
    const accPeriodEl = document.getElementById('accPeriod');
    if (!accPeriodEl) return;
    const period = accPeriodEl.value;
    const from = document.getElementById('accFrom').value;
    const to = document.getElementById('accTo').value;
    
    const range = getDateRangeFilter(period, from, to);
    const now = new Date();

    const filterFn = (dateStr) => {
        if (!range) return true;
        const d = parseDateLocal(dateStr);
        return d >= range.from && d <= range.to;
    };

    const sales = state.sales.filter(s => filterFn(s.saleDate) && s.returned !== true);
    const transactions = (state.transactions || []).filter(t => filterFn(t.date));
    const returns = (state.returns || []).filter(r => filterFn(r.returnDate));
    const inventoryEntries = state.inventory.filter(i => filterFn(i.entryDate));

    const totalSales = sales.reduce((acc, s) => acc + getSaleTotal(s), 0);
    const otherIncome = transactions.filter(t => t.type === 'income' && t.category !== 'Venta').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalIncome = totalSales + otherIncome;

    const costOfInventoryPurchased = inventoryEntries.reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
    const costOfMerchSold = sales.reduce((acc, s) => acc + getSaleCost(s), 0);
    const opExpenses = transactions.filter(t => t.type === 'expense' && t.category !== 'Devolución').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalReturnsPaid = returns.reduce((acc, r) => acc + (parseFloat(r.salePrice) || 0), 0);

    // Cost of aoods Sold calculations
    const openingStock = state.inventory.filter(i => {
        const entryDate = parseDateLocal(i.entryDate);
        if (!entryDate || (range && entryDate >= range.from)) return false;
        const sale = state.sales.find(s => {
            if (s.devices) return s.devices.some(d => d.serial === i.serial);
            return s.serial === i.serial;
        });
        if (sale) {
            const saleDate = parseDateLocal(sale.saleDate);
            if (saleDate && (range && saleDate < range.from)) return false;
        }
        return true;
    }).reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);

    const closingStock = state.inventory.filter(i => {
        const entryDate = parseDateLocal(i.entryDate);
        if (!entryDate || (range && entryDate > range.to)) return false;
        const sale = state.sales.find(s => {
            if (s.devices) return s.devices.some(d => d.serial === i.serial);
            return s.serial === i.serial;
        });
        if (sale) {
            const saleDate = parseDateLocal(sale.saleDate);
            if (saleDate && (range && saleDate <= range.to)) return false;
        }
        return true;
    }).reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);

    const totalExpensesAcc = costOfMerchSold + opExpenses + totalReturnsPaid;

    const grossProfit = totalSales - costOfMerchSold;
    const opProfit = grossProfit - opExpenses;
    const netProfit = opProfit - totalReturnsPaid + otherIncome;
    const marginNet = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const availableStockValue = state.inventory.filter(i => i.status === 'Disponible').reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
    
    const stagnantStockValue = state.inventory.filter(i => {
        if (i.status !== 'Disponible') return false;
        const start = parseDateLocal(i.entryDate);
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return days > 30;
    }).reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);

    const netKpi = document.getElementById('acc-kpi-net-profit');
    if (netKpi) {
        netKpi.innerText = `$${netProfit.toLocaleString()}`;
        netKpi.style.color = netProfit >= 0 ? '#047481' : 'var(--vibrant-red)';
    }
    
    if (document.getElementById('acc-kpi-total-income')) document.getElementById('acc-kpi-total-income').innerText = `$${totalIncome.toLocaleString()}`;
    if (document.getElementById('acc-kpi-total-expenses')) document.getElementById('acc-kpi-total-expenses').innerText = `$${totalExpensesAcc.toLocaleString()}`;
    
    const marginEl = document.getElementById('acc-kpi-margin');
    const marginCard = document.getElementById('acc-kpi-margin-card');
    if (marginEl && marginCard) {
        marginEl.innerText = `${marginNet.toFixed(1)}%`;
        if (marginNet > 20) { marginEl.style.color = '#047481'; marginCard.style.borderBottom = "4px solid #047481"; }
        else if (marginNet >= 10) { marginEl.style.color = '#B7791F'; marginCard.style.borderBottom = "4px solid #B7791F"; }
        else { marginEl.style.color = 'var(--vibrant-red)'; marginCard.style.borderBottom = "4px solid var(--vibrant-red)"; }
    }

    if (document.getElementById('acc-opening-stock-cost')) document.getElementById('acc-opening-stock-cost').innerText = `$${openingStock.toLocaleString()}`;
    if (document.getElementById('acc-opening-stock-units')) document.getElementById('acc-opening-stock-units').innerText = `${state.inventory.filter(i => {
        const d = parseDateLocal(i.entryDate);
        if (!d || (range && d >= range.from)) return false;
        const sale = state.sales.find(s => {
            if (s.devices) return s.devices.some(dd => dd.serial === i.serial);
            return s.serial === i.serial;
        });
        if (sale) {
            const sd = parseDateLocal(sale.saleDate);
            if (sd && (range && sd < range.from)) return false;
        }
        return true;
    }).length} equipos`;
    if (document.getElementById('acc-stagnant-value')) document.getElementById('acc-stagnant-value').innerText = `$${stagnantStockValue.toLocaleString()}`;

    if (document.getElementById('acc-merch-purchased')) document.getElementById('acc-merch-purchased').innerText = `$${costOfInventoryPurchased.toLocaleString()}`;
    if (document.getElementById('acc-purchased-units')) document.getElementById('acc-purchased-units').innerText = `${inventoryEntries.length} equipos`;
    if (document.getElementById('acc-merch-cost-sold')) document.getElementById('acc-merch-cost-sold').innerText = `$${costOfMerchSold.toLocaleString()}`;
    if (document.getElementById('acc-merch-available')) document.getElementById('acc-merch-available').innerText = `$${closingStock.toLocaleString()}`;
    if (document.getElementById('acc-closing-stock-units')) document.getElementById('acc-closing-stock-units').innerText = `${state.inventory.filter(i => {
        const d = parseDateLocal(i.entryDate);
        if (!d || (range && d > range.to)) return false;
        const sale = state.sales.find(s => {
            if (s.devices) return s.devices.some(dd => dd.serial === i.serial);
            return s.serial === i.serial;
        });
        if (sale) {
            const sd = parseDateLocal(sale.saleDate);
            if (sd && (range && sd <= range.to)) return false;
        }
        return true;
    }).length} equipos`;
    if (document.getElementById('acc-total-op-expenses')) document.getElementById('acc-total-op-expenses').innerText = `$${opExpenses.toLocaleString()}`;
    if (document.getElementById('acc-returns-total')) document.getElementById('acc-returns-total').innerText = `$${totalReturnsPaid.toLocaleString()}`;
    if (document.getElementById('acc-returns-count')) document.getElementById('acc-returns-count').innerText = returns.length;
    if (document.getElementById('acc-final-total-expenses')) document.getElementById('acc-final-total-expenses').innerText = `$${totalExpensesAcc.toLocaleString()}`;

    const expenseCats = {};
    transactions.filter(t => t.type === 'expense' && t.category !== 'Devolución').forEach(t => { expenseCats[t.category] = (expenseCats[t.category] || 0) + parseFloat(t.amount); });
    let expHtml = '';
    for (let cat in expenseCats) { expHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${escapeHtml(cat)}</span><span>$${expenseCats[cat].toLocaleString()}</span></div>`; }
    if (document.getElementById('acc-expense-categories')) document.getElementById('acc-expense-categories').innerHTML = expHtml;

    if (document.getElementById('acc-sales-total')) document.getElementById('acc-sales-total').innerText = `$${totalSales.toLocaleString()}`;
    if (document.getElementById('acc-sales-count')) document.getElementById('acc-sales-count').innerText = `${sales.reduce((sum, s) => sum + (s.devices ? s.devices.length : 1), 0)} equipos`;
    if (document.getElementById('acc-sales-avg')) document.getElementById('acc-sales-avg').innerText = sales.length > 0 ? `$${(totalSales / sales.length).toLocaleString()}` : '$0';
    if (document.getElementById('acc-total-other-income')) document.getElementById('acc-total-other-income').innerText = `$${otherIncome.toLocaleString()}`;
    if (document.getElementById('acc-final-total-income')) document.getElementById('acc-final-total-income').innerText = `$${totalIncome.toLocaleString()}`;

    const salesModel = {};
    sales.forEach(s => {
        const devices = s.devices || [{ model: s.model, price: s.price }];
        devices.forEach(d => { salesModel[d.model] = (salesModel[d.model] || 0) + parseFloat(d.price); });
    });
    let modelHtml = '';
    Object.entries(salesModel).sort((a,b) => b[1] - a[1]).forEach(([mod, val]) => {
        modelHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${escapeHtml(mod)}</span><span>$${val.toLocaleString()}</span></div>`;
    });
    if (document.getElementById('acc-sales-by-model')) document.getElementById('acc-sales-by-model').innerHTML = modelHtml || '<div style="font-size:0.8rem; color:var(--text-gray); padding-left:1rem;">N/A</div>';

    const salesSource = {};
    sales.forEach(s => { salesSource[s.source] = (salesSource[s.source] || 0) + getSaleTotal(s); });
    let sourceHtml = '';
    Object.entries(salesSource).sort((a,b) => b[1] - a[1]).forEach(([src, val]) => {
        sourceHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${escapeHtml(src)}</span><span>$${val.toLocaleString()}</span></div>`;
    });
    if (document.getElementById('acc-sales-by-source')) document.getElementById('acc-sales-by-source').innerHTML = sourceHtml || '<div style="font-size:0.8rem; color:var(--text-gray); padding-left:1rem;">N/A</div>';

    const incomeCats = {};
    transactions.filter(t => t.type === 'income' && t.category !== 'Venta').forEach(t => { incomeCats[t.category] = (incomeCats[t.category] || 0) + parseFloat(t.amount); });
    let incHtml = '';
    for (let cat in incomeCats) { incHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${escapeHtml(cat)}</span><span>$${incomeCats[cat].toLocaleString()}</span></div>`; }
    if (document.getElementById('acc-income-categories')) document.getElementById('acc-income-categories').innerHTML = incHtml;

    if (document.getElementById('acc-res-gross')) document.getElementById('acc-res-gross').innerText = `$${grossProfit.toLocaleString()}`;
    if (document.getElementById('acc-res-op')) document.getElementById('acc-res-op').innerText = `$${opProfit.toLocaleString()}`;
    if (document.getElementById('acc-res-net')) document.getElementById('acc-res-net').innerText = `$${netProfit.toLocaleString()}`;
    
    const finalVal = document.getElementById('acc-res-final-value');
    if (finalVal) {
        finalVal.innerText = `$${netProfit.toLocaleString()}`;
        finalVal.style.color = netProfit >= 0 ? '#047481' : 'var(--vibrant-red)';
        const marginLabel = document.getElementById('acc-res-final-margin');
        if (marginLabel) marginLabel.innerText = `Margen: ${marginNet.toFixed(1)}%`;
        const finalBox = document.getElementById('acc-res-final-box');
        if (finalBox) finalBox.style.background = netProfit >= 0 ? 'rgba(4,116,129,0.05)' : 'rgba(238,66,78,0.05)';
        
        const progressFill = document.getElementById('acc-margin-bar');
        if (progressFill) {
            const boundedMargin = Math.max(0, Math.min(marginNet, 100));
            progressFill.style.width = `${boundedMargin}%`;
            if (marginNet > 20) {
                progressFill.style.background = '#047481';
            } else if (marginNet >= 10) {
                progressFill.style.background = '#B7791F';
            } else {
                progressFill.style.background = 'var(--vibrant-red)';
            }
        }
    }

    if (document.getElementById('acc-met-avg-ticket')) document.getElementById('acc-met-avg-ticket').innerText = sales.length > 0 ? `$${(totalSales / sales.length).toLocaleString()}` : '$0';
    const topModelVal = Object.entries(salesModel).sort((a,b) => b[1] - a[1])[0];
    if (document.getElementById('acc-met-top-model')) document.getElementById('acc-met-top-model').innerText = topModelVal ? topModelVal[0] : 'N/A';
    const topSrcVal = Object.entries(salesSource).sort((a,b) => b[1] - a[1])[0];
    if (document.getElementById('acc-met-top-source')) document.getElementById('acc-met-top-source').innerText = topSrcVal ? topSrcVal[0] : 'N/A';

    const soldInPeriod = state.inventory.filter(i => i.status === 'Vendido' && sales.some(s => {
        if (s.devices) return s.devices.some(d => d.serial === i.serial);
        return s.serial === i.serial;
    }));
    let totalDays = 0;
    soldInPeriod.forEach(i => {
        const sale = sales.find(s => {
            if (s.devices) return s.devices.some(d => d.serial === i.serial);
            return s.serial === i.serial;
        });
        if (sale) {
            const start = parseDateLocal(i.entryDate);
            const end = parseDateLocal(sale.saleDate);
            totalDays += Math.floor((end - start) / (1000 * 60 * 60 * 24));
        }
    });
    if (document.getElementById('acc-met-rotation')) document.getElementById('acc-met-rotation').innerText = soldInPeriod.length > 0 ? `${Math.round(totalDays / soldInPeriod.length)} días` : '0 días';

    const stagnant = state.inventory.filter(i => {
        if (i.status !== 'Disponible') return false;
        const start = parseDateLocal(i.entryDate);
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        return days > 30;
    });
    if (document.getElementById('acc-met-stagnant')) document.getElementById('acc-met-stagnant').innerText = `${stagnant.length} equipos`;

    const returnRate = totalSales > 0 ? (totalReturnsPaid / totalSales) * 100 : 0;
    const rateEl = document.getElementById('acc-met-return-rate');
    if (rateEl) {
        rateEl.innerText = `${returnRate.toFixed(1)}%`;
        rateEl.style.color = returnRate < 5 ? '#047481' : (returnRate < 15 ? '#B7791F' : 'var(--vibrant-red)');
    }

    renderAccountingTrace();
    lucide.createIcons();
}

function renderAccountingTrace() {
    const traceSearch = document.getElementById('traceSearch');
    if (!traceSearch) return;
    const query = traceSearch.value.toLowerCase().trim();
    const tbody = document.getElementById('traceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const now = new Date();

    let traceList = [...state.inventory];
    traceList.sort((a, b) => {
        const da = new Date(a.createdAt || a.entryDate).getTime() || 0;
        const db = new Date(b.createdAt || b.entryDate).getTime() || 0;
        return db - da;
    });

    traceList.forEach(i => {
        if (query && !i.serial.toLowerCase().includes(query) && !i.model.toLowerCase().includes(query)) return;
        const sale = state.sales.find(s => {
            if (s.devices) return s.devices.some(d => d.serial === i.serial);
            return s.serial === i.serial;
        });
        const device = sale && sale.devices ? sale.devices.find(d => d.serial === i.serial) : sale;
        const ret = (state.returns || []).find(r => r.serial === i.serial);
        const costNum = parseFloat(i.cost) || 0;
        const priceNum = device ? (parseFloat(device.price) || 0) : 0;
        const utility = sale ? (priceNum - costNum) : 0;
        const statusColor = i.status === 'Disponible' ? '#047481' : i.status === 'Vendido' ? 'var(--deep-blue)' : i.status === 'Devuelto' ? 'var(--vibrant-red)' : i.status === 'Garantía' ? '#B7791F' : '#718096';
        const eSerial = escapeHtml(i.serial);
        const eModel = escapeHtml(i.model);
        const eStatus = escapeHtml(i.status);
        const eReturnNote = escapeHtml(i.returnNote);
        const saleSource = sale ? escapeHtml(sale.source) : '';
        const saleClient = sale ? escapeHtml(sale.client) : '';
        const saleDate = sale ? escapeHtml(sale.saleDate) : '';
        const retDate = ret ? escapeHtml(ret.returnDate) : '';
        const retReason = ret ? escapeHtml(ret.reason) : '';

        tbody.innerHTML += `
            <tr>
                <td style="font-size:0.75rem;">${escapeHtml(i.entryDate)}</td>
                <td><strong>${eModel}</strong><br><small>${eSerial}</small></td>
                <td>$${costNum.toLocaleString()}</td>
                <td style="font-size:0.75rem;">${saleDate || '-'}</td>
                <td>$${priceNum.toLocaleString()}</td>
                <td style="color:${utility >= 0 ? '#047481' : 'var(--vibrant-red)'}; font-weight:700;">
                    ${sale ? '$' + utility.toLocaleString() : '-'}
                </td>
                <td style="font-size:0.75rem;">
                    ${sale ? '<strong>' + saleSource + '</strong><br>' + saleClient : '-'}
                </td>
                <td>
                    <span style="padding:0.2rem 0.5rem; border-radius:100px; font-size:0.7rem; font-weight:700; color:${statusColor}; background:${statusColor}15;">
                        ${eStatus}
                    </span>
                </td>
                <td style="font-size:0.7rem; color:var(--text-gray);">
                    ${ret ? '<strong>DEV:</strong> ' + retDate + '<br>' + retReason : (eReturnNote || '-')}
                </td>
            </tr>`;
    });
    lucide.createIcons();
}
