let salesChart, categoryChartInstance, sourceChart;

function initCharts() {
    const ctxSales = document.getElementById('salesTrendChart').getContext('2d');
    salesChart = new Chart(ctxSales, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Ventas ($)', data: [], borderColor: '#121E6C', backgroundColor: 'rgba(18, 30, 108, 0.1)', fill: true, tension: 0.4 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            resizeDelay: 200, // BUG FIX: Stability during resize
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        font: { size: 11 },
                        callback: function(value) {
                            if (value % 1 !== 0) return null;
                            return '$' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    categoryChartInstance = new Chart(ctxCat, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { label: 'Ingresos', data: [], backgroundColor: '#047481' },
                { label: 'Egresos', data: [], backgroundColor: '#EE424E' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            resizeDelay: 200,
            layout: {
                padding: { top: 8, bottom: 0, left: 0, right: 0 }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 },
                        padding: 12
                    }
                },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: false,
                        callback: function(value, index) {
                            const label = this.getLabelForValue(index);
                            return label.length > 13 ? label.substring(0, 13) + 'â€¦' : label;
                        }
                    }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { font: { size: 11 } },
                    beginAtZero: true
                }
            }
        }
    });

    const ctxSource = document.getElementById('sourceChart').getContext('2d');
    sourceChart = new Chart(ctxSource, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#121E6C', '#EE424E', '#919FDC', '#047481', '#647481', '#E2E8F0'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 10,
                        font: { size: 10, weight: '600' },
                        padding: 15
                    }
                }
            }
        }
    });
}

function updateChartsData() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(months[d.getMonth()]);
        const total = state.sales.filter(s => {
            const sd = parseDateLocal(s.saleDate);
            return sd && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        }).reduce((acc, s) => acc + s.price, 0);
        data.push(total);
    }
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = data;
    salesChart.update();

    const incomeData = {};
    const expenseData = {};
    state.transactions.forEach(t => {
        if (t.type === 'income') incomeData[t.category] = (incomeData[t.category] || 0) + t.amount;
        else expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
    });

    const allCats = Array.from(new Set([...Object.keys(incomeData), ...Object.keys(expenseData)]));

    if (allCats.length === 0) {
        document.getElementById('noDataText').style.display = 'block';
        categoryChartInstance.data.labels = [];
        categoryChartInstance.data.datasets[0].data = [];
        categoryChartInstance.data.datasets[1].data = [];
    } else {
        document.getElementById('noDataText').style.display = 'none';
        categoryChartInstance.data.labels = allCats;
        categoryChartInstance.data.datasets[0].data = allCats.map(c => incomeData[c] || 0);
        categoryChartInstance.data.datasets[1].data = allCats.map(c => expenseData[c] || 0);
    }
    categoryChartInstance.update();

    // Source Chart Data
    const sources = {};
    state.sales.forEach(s => {
        const src = s.source || 'Otro';
        sources[src] = (sources[src] || 0) + 1;
    });
    const srcLabels = Object.keys(sources);
    const srcData = Object.values(sources);
    if (srcLabels.length > 0) {
        sourceChart.data.labels = srcLabels;
        sourceChart.data.datasets[0].data = srcData;
    } else {
        sourceChart.data.labels = ['Sin ventas'];
        sourceChart.data.datasets[0].data = [1];
    }
    sourceChart.update();
}
