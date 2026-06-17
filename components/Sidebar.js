// ── Componente Sidebar ────────────────────────────────────────
// Renderiza la barra lateral de navegación.
// En la versión actual se genera desde el HTML directamente.
// Este componente está preparado para futura migración a React/Vue.

function renderSidebar(containerId, activeView, userData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const navItems = [
        { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
        { id: 'inventory', icon: 'package', label: 'Inventario' },
        { id: 'sales', icon: 'trending-up', label: 'Ventas' },
        { id: 'finance', icon: 'wallet', label: 'Finanzas' },
        { id: 'returns', icon: 'rotate-ccw', label: 'Devoluciones' },
        { id: 'accounting', icon: 'calculator', label: 'Contabilidad' },
        { id: 'settings', icon: 'settings', label: 'Configuración' }
    ];

    const bizName = userData?.business_name || 'Mi Negocio';

    container.innerHTML = `
        <div class="sidebar">
            <div class="logo">
                <img src="assets/img/logo.svg" alt="Gest Inventary" height="40">
                <span>${escapeHtml(bizName)}</span>
            </div>
            <ul class="nav-links">
                ${navItems.map(item => `
                    <li class="nav-item ${item.id === activeView ? 'active' : ''}"
                        onclick="showView('${item.id}')">
                        <i data-lucide="${item.icon}"></i> ${item.label}
                    </li>
                `).join('')}
            </ul>
            <div class="sidebar-footer">
                <button class="btn btn-secondary" onclick="logout()" style="width:100%;justify-content:center;">
                    <i data-lucide="log-out"></i> Cerrar Sesión
                </button>
            </div>
        </div>`;
    lucide.createIcons();
}
