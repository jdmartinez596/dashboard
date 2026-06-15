function exportSalesXLSX() {
    const search = (document.getElementById('searchSales')?.value || '').toLowerCase();
    const salePeriod = document.getElementById('filterSalePeriod')?.value || '';
    const saleFrom = document.getElementById('filterSaleFrom')?.value || '';
    const saleTo = document.getElementById('filterSaleTo')?.value || '';
    const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

    const filtered = state.sales.filter(s => {
        const matchSearch = (s.client || '').toLowerCase().includes(search) || (s.serial || '').toLowerCase().includes(search) || (s.city || '').toLowerCase().includes(search);
        let matchDate = true;
        if (saleDateRange) {
            const d = parseDateLocal(s.saleDate);
            matchDate = d && d >= saleDateRange.from && d <= saleDateRange.to;
        }
        return matchSearch && matchDate;
    });

    if (filtered.length === 0) {
        alert('No hay ventas para exportar con los filtros actuales.');
        return;
    }

    const rows = filtered.map(s => {
        const cost = getSaleCost(s);
        const utility = (s.price || 0) - cost;
        return {
            'Fecha': s.saleDate || '',
            'Serial': s.serial || '',
            'Modelo': s.model || '',
            'Cliente': s.client || '',
            'Ciudad': s.city || '',
            'Canal': s.source || '',
            'Precio Venta': s.price || 0,
            'Costo': cost,
            'Utilidad': utility,
            'Margen %': cost > 0 ? ((utility / cost) * 100).toFixed(1) + '%' : 'N/A'
        };
    });

    const totalVentas = filtered.reduce((a, s) => a + (s.price || 0), 0);
    const totalUtilidad = rows.reduce((a, r) => a + r['Utilidad'], 0);
    rows.push({
        'Fecha': 'TOTAL', 'Serial': '', 'Modelo': '', 'Cliente': `${filtered.length} ventas`,
        'Ciudad': '', 'Canal': '', 'Precio Venta': totalVentas, 'Costo': '', 'Utilidad': totalUtilidad, 'Margen %': ''
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:12},{wch:22},{wch:14},{wch:20},{wch:14},{wch:16},{wch:14},{wch:12},{wch:12},{wch:10}];
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
        if (invDateRange) {
            const d = parseDateLocal(i.entryDate);
            matchDate = d && d >= invDateRange.from && d <= invDateRange.to;
        }
        return matchSearch && matchModel && matchDate;
    });

    if (filtered.length === 0) {
        alert('No hay equipos para exportar con los filtros actuales.');
        return;
    }

    const rows = filtered.map(i => ({
        'Fecha Ingreso': i.entryDate || '', 'Modelo': i.model || '', 'Serial': i.serial || '', 'IMEI': i.imei || '', 'Costo': i.cost || 0, 'Estado': i.status || '',
        'DÃ­as en Stock': i.entryDate ? Math.floor((new Date() - new Date(i.entryDate)) / (1000 * 60 * 60 * 24)) : 'N/A'
    }));

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
        resumenRows.push({
            'Fecha Ingreso': model, 'Modelo': `Total: ${data.total}`, 'Serial': `Disponible: ${data.disponible}`, 'IMEI': `Vendido: ${data.vendido}`,
            'Costo': '', 'Estado': '', 'DÃ­as en Stock': ''
        });
    });

    const ws = XLSX.utils.json_to_sheet([...rows, ...resumenRows]);
    ws['!cols'] = [{wch:14},{wch:14},{wch:22},{wch:18},{wch:12},{wch:12},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    const periodLabel = invPeriod === 'custom' ? `${invFrom}_${invTo}` : invPeriod || 'completo';
    XLSX.writeFile(wb, `Inventario_PartnersBold_${periodLabel}_${getLocalDateString()}.xlsx`);
}

function exportReturnsXLSX() {
    const returns = state.returns || [];
    if (returns.length === 0) {
        alert('No hay devoluciones para exportar.');
        return;
    }
    const rows = returns.map(r => ({
        'ID': r.id,
        'Fecha DevoluciÃ³n': r.returnDate,
        'Fecha Venta Original': r.saleDate,
        'Serial': r.serial,
        'Modelo': r.model,
        'Cliente': r.client,
        'Ciudad': r.city,
        'Canal': r.source,
        'Motivo': r.reason,
        'Estado Equipo': r.condition,
        'AcciÃ³n': r.action,
        'Precio Venta': r.salePrice,
        'Costo': r.cost,
        'Impacto Financiero': -r.salePrice,
        'Notas': r.notes
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
        {wch:16},{wch:14},{wch:16},{wch:22},{wch:14},
        {wch:18},{wch:14},{wch:14},{wch:18},{wch:14},
        {wch:14},{wch:14},{wch:12},{wch:16},{wch:20}
    ];
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
        return {
            'Fecha Ingreso': i.entryDate,
            'Modelo': i.model,
            'Serial': i.serial,
            'Costo Compra': cost,
            'Fecha Venta': sale ? sale.saleDate : 'N/A',
            'Precio Venta': price,
            'Utilidad': sale ? (price - cost) : 0,
            'Canal': sale ? sale.source : 'N/A',
            'Cliente': sale ? sale.client : 'N/A',
            'Estado Actual': i.status,
            'Fecha DevoluciÃ³n': ret ? ret.returnDate : 'N/A',
            'Motivo DevoluciÃ³n': ret ? ret.reason : 'N/A'
        };
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

    const totalSales = sales.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0);
    const otherIncome = transactions.filter(t => t.type === 'income' && t.category !== 'Venta').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalIncome = totalSales + otherIncome;

    const costOfInventoryPurchased = inventoryEntries.reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
    const costOfMerchSold = sales.reduce((acc, s) => acc + getSaleCost(s), 0);
    const opExpenses = transactions.filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const totalReturnsPaid = returns.reduce((acc, r) => acc + (parseFloat(r.salePrice) || 0), 0);
    
    const openingStock = state.inventory.filter(i => {
        const entryDate = parseDateLocal(i.entryDate);
        if (!entryDate || (range && entryDate >= range.from)) return false;
        const sale = state.sales.find(s => s.serial === i.serial);
        if (sale) {
            const saleDate = parseDateLocal(sale.saleDate);
            if (saleDate && (range && saleDate < range.from)) return false;
        }
        return true;
    }).reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);

    const closingStock = state.inventory.filter(i => {
        const entryDate = parseDateLocal(i.entryDate);
        if (!entryDate || (range && entryDate > range.to)) return false;
        const sale = state.sales.find(s => s.serial === i.serial);
        if (sale) {
            const saleDate = parseDateLocal(sale.saleDate);
            if (saleDate && (range && saleDate <= range.to)) return false;
        }
        return true;
    }).reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);

    const grossProfit = totalSales - costOfMerchSold;
    const opProfit = grossProfit - opExpenses;
    const netProfit = opProfit - totalReturnsPaid + otherIncome;
    const marginNet = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const availableStockValue = state.inventory.filter(i => i.status === 'Disponible').reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);

    const wb = XLSX.utils.book_new();

    // 1. Hoja "Resumen P&G"
    const summaryRows = [
        ['ESTADO DE RESULTADOS (P&G)', 'Partners Bold'],
        ['PerÃ­odo:', period === 'custom' ? `${from} a ${to}` : period],
        ['Generado el:', getLocalDateString() + ' ' + new Date().toLocaleTimeString()],
        [],
        ['CONCEPTO', 'VALOR'],
        ['(+) Ventas de Equipos (Netas)', totalSales],
        ['(-) Costo de Ventas (COGS)', costOfMerchSold],
        ['(=) UTILIDAD BRUTA', grossProfit],
        ['(-) Gastos Operativos', opExpenses],
        ['(=) UTILIDAD OPERATIVA', opProfit],
        ['(-) Reembolsos por Devoluciones', totalReturnsPaid],
        ['(+) Otros Ingresos', otherIncome],
        ['(=) UTILIDAD NETA REAL', netProfit],
        ['MARGEN NETO REAL %', marginNet.toFixed(2) + '%'],
        [],
        ['--- ANÃLISIS DE MERCANCÃA ---', ''],
        ['(+) Inventario Inicial', openingStock],
        ['(+) Compras del PerÃ­odo', costOfInventoryPurchased],
        ['(-) Inventario Final', closingStock],
        ['(=) Costo de Ventas (COGS)', costOfMerchSold],
        ['Valor Inventario Disponible Actual', availableStockValue]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{wch:35},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen P&G");

    // 2. Hoja "Ventas con Margen"
    const salesRows = sales.map(s => {
        const cost = getSaleCost(s);
        const ut = s.price - cost;
        return {
            'Fecha Venta': s.saleDate,
            'Modelo': s.model,
            'Serial': s.serial,
            'Cliente': s.client,
            'Ciudad': s.city,
            'Canal': s.source,
            'Precio Venta': s.price,
            'Costo Compra': cost,
            'Utilidad': ut,
            'Margen %': s.price > 0 ? ((ut / s.price) * 100).toFixed(1) + '%' : '0%'
        };
    });
    const wsSales = XLSX.utils.json_to_sheet(salesRows);
    wsSales['!cols'] = [{wch:12},{wch:14},{wch:20},{wch:18},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb, wsSales, "Ventas con Margen");

    // 3. Hoja "Resumen Gastos"
    const expenseCats = {};
    transactions.filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n').forEach(t => {
        expenseCats[t.category] = (expenseCats[t.category] || 0) + parseFloat(t.amount);
    });
    const expensesSummaryRows = Object.entries(expenseCats).map(([cat, total]) => ({
        'CategorÃ­a': cat,
        'Monto Total': total,
        'ParticipaciÃ³n %': opExpenses > 0 ? ((total / opExpenses) * 100).toFixed(1) + '%' : '0%'
    }));
    const wsExpSum = XLSX.utils.json_to_sheet(expensesSummaryRows);
    wsExpSum['!cols'] = [{wch:20},{wch:14},{wch:16}];
    XLSX.utils.book_append_sheet(wb, wsExpSum, "Resumen Gastos");

    // 4. Hoja "Detalle Gastos"
    const expensesDetailRows = transactions.filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n').map(t => ({
        'Fecha': t.date,
        'CategorÃ­a': t.category,
        'DescripciÃ³n': t.description,
        'Monto': t.amount
    }));
    const wsExpDet = XLSX.utils.json_to_sheet(expensesDetailRows);
    wsExpDet['!cols'] = [{wch:12},{wch:20},{wch:30},{wch:12}];
    XLSX.utils.book_append_sheet(wb, wsExpDet, "Detalle Gastos");

    // 5. Hoja "Devoluciones"
    const returnsRows = returns.map(r => ({
        'ID DevoluciÃ³n': r.id,
        'Fecha DevoluciÃ³n': r.returnDate,
        'Serial': r.serial,
        'Modelo': r.model,
        'Cliente': r.client,
        'Ciudad': r.city,
        'Canal': r.source,
        'Motivo': r.reason,
        'CondiciÃ³n': r.condition,
        'AcciÃ³n': r.action,
        'Monto Reembolsado': r.salePrice
    }));
    const wsReturns = XLSX.utils.json_to_sheet(returnsRows);
    wsReturns['!cols'] = [{wch:16},{wch:14},{wch:20},{wch:14},{wch:18},{wch:14},{wch:14},{wch:16},{wch:12},{wch:12},{wch:14}];
    XLSX.utils.book_append_sheet(wb, wsReturns, "Devoluciones");

    // 6. Hoja "Trazabilidad"
    const traceRows = state.inventory.map(i => {
        const sale = state.sales.find(s => s.serial === i.serial);
        const ret = (state.returns || []).find(r => r.serial === i.serial);
        const cost = parseFloat(i.cost) || 0;
        const price = sale ? (parseFloat(sale.price) || 0) : 0;
        return {
            'Serial': i.serial,
            'Modelo': i.model,
            'Fecha Ingreso': i.entryDate,
            'Costo Compra': cost,
            'Fecha Venta': sale ? sale.saleDate : 'N/A',
            'Precio Venta': price,
            'Utilidad': sale ? (price - cost) : 0,
            'Canal Venta': sale ? sale.source : 'N/A',
            'Cliente': sale ? sale.client : 'N/A',
            'Estado Actual': i.status,
            'Fecha DevoluciÃ³n': ret ? ret.returnDate : 'N/A',
            'Motivo DevoluciÃ³n': ret ? ret.reason : 'N/A'
        };
    });
    const wsTrace = XLSX.utils.json_to_sheet(traceRows);
    wsTrace['!cols'] = [{wch:20},{wch:14},{wch:14},{wch:12},{wch:14},{wch:12},{wch:12},{wch:14},{wch:18},{wch:14},{wch:14},{wch:18}];
    XLSX.utils.book_append_sheet(wb, wsTrace, "Trazabilidad");

    XLSX.writeFile(wb, `Contabilidad_PartnersBold_${getLocalDateString()}.xlsx`);
}
