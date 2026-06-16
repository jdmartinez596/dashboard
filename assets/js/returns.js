function renderReturns() {
    const returns = state.returns || [];
    const tbody = document.querySelector('#returnsTable tbody');
    if (!tbody) return; // SAFE EXIT
    tbody.innerHTML = '';

    if (returns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color:var(--text-gray); padding:3rem;">
                    No hay devoluciones registradas
                </td>
            </tr>`;
    } else {
        // Ordenar por fecha más reciente
        [...returns].reverse().forEach(r => {
            const impact = r.salePrice || 0;
            const actionColor =
                r.action === 'Reingreso' ? '#047481' :
                r.action === 'Garantía' ? '#B7791F' :
                'var(--vibrant-red)';
            const eId = escapeHtml(r.id);
            const eSerial = escapeHtml(r.serial);
            const eModel = escapeHtml(r.model);
            const eClient = escapeHtml(r.client);
            const eReason = escapeHtml(r.reason);
            const eCondition = escapeHtml(r.condition);
            const eAction = escapeHtml(r.action);

            tbody.innerHTML += `
                <tr>
                    <td style="font-size:0.75rem; color:var(--text-gray);">
                        ${eId}
                    </td>
                    <td>${escapeHtml(r.returnDate || 'N/A')}</td>
                    <td style="font-family:monospace; font-size:0.82rem;">
                        ${eSerial}
                    </td>
                    <td>${eModel}</td>
                    <td>${eClient}</td>
                    <td>${eReason}</td>
                    <td>
                        <span style="
                            font-size:0.75rem;
                            font-weight:700;
                            padding:0.2rem 0.6rem;
                            border-radius:100px;
                            background:var(--light-gray);">
                            ${eCondition}
                        </span>
                    </td>
                    <td>
                        <span style="
                            font-size:0.75rem;
                            font-weight:700;
                            color:${actionColor};
                            padding:0.2rem 0.6rem;
                            border-radius:100px;
                            background:rgba(0,0,0,0.04);">
                            ${eAction}
                        </span>
                    </td>
                    <td style="color:var(--vibrant-red); font-weight:700;">
                        -$${impact.toLocaleString()}
                    </td>
                </tr>`;
        });
    }

    // Actualizar KPIs de devoluciones
    const total = returns.length;
    const impact = returns.reduce((a, r) => a + (r.salePrice || 0), 0);
    const reingresos = returns.filter(r => r.action === 'Reingreso').length;
    const warranty = returns.filter(r => r.action === 'Garantía').length;

    const kpiTotal = document.getElementById('ret-kpi-total');
    const kpiImpact = document.getElementById('ret-kpi-impact');
    const kpiRein = document.getElementById('ret-kpi-reingreso');
    const kpiWar = document.getElementById('ret-kpi-warranty');

    if (kpiTotal) kpiTotal.innerText = total;
    if (kpiImpact) kpiImpact.innerText = '-$' + impact.toLocaleString();
    if (kpiRein) kpiRein.innerText = reingresos;
    if (kpiWar) kpiWar.innerText = warranty;

    lucide.createIcons();
}
