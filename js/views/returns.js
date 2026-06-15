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
        // Ordenar por fecha mÃ¡s reciente
        [...returns].reverse().forEach(r => {
            const impact = r.salePrice || 0;
            const actionColor =
                r.action === 'Reingreso' ? '#047481' :
                r.action === 'GarantÃ­a' ? '#B7791F' :
                'var(--vibrant-red)';

            tbody.innerHTML += `
                <tr>
                    <td style="font-size:0.75rem; color:var(--text-gray);">
                        ${r.id}
                    </td>
                    <td>${r.returnDate || 'N/A'}</td>
                    <td style="font-family:monospace; font-size:0.82rem;">
                        ${r.serial}
                    </td>
                    <td>${r.model}</td>
                    <td>${r.client}</td>
                    <td>${r.reason}</td>
                    <td>
                        <span style="
                            font-size:0.75rem;
                            font-weight:700;
                            padding:0.2rem 0.6rem;
                            border-radius:100px;
                            background:var(--light-gray);">
                            ${r.condition}
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
                            ${r.action}
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
    const warranty = returns.filter(r => r.action === 'GarantÃ­a').length;

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
