// --- Date Helpers ---
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateLocal(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function getDateRangeFilter(period, customFrom, customTo) {
    const now = new Date();
    let from, to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === 'today') {
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'week') {
        const day = now.getDay() || 7; 
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
    } else if (period === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0);
    } else if (period === 'year') {
        from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    } else if (period === 'custom') {
        if (!customFrom || !customTo) return null;
        from = parseDateLocal(customFrom);
        to = parseDateLocal(customTo);
        if (to) to.setHours(23, 59, 59);
    } else {
        return null; 
    }
    return { from, to };
}

// Helper: obtener costo real de una venta desde el inventario
function getSaleCost(sale) {
    const item = state.inventory.find(i => i.serial === sale.serial);
    return item ? (parseFloat(item.cost) || 0) : 0;
}

function cleanBarcode(raw) {
    return raw
        .replace(/^(SN|S\/N|SERIAL|IMEI|IME|NO|NUM|NÂ°|#)\s*[:\.\-]?\s*/i, '')
        .replace(/\s+/g, '')
        .trim();
}

function getModelOptions(selectedValue = '') {
    return Object.keys(state.settings.thresholds)
        .map(m => `<option value="${m}" ${m === selectedValue ? 'selected' : ''}>${m}</option>`)
        .join('');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.toggle('sidebar-open');
    overlay.classList.toggle('overlay-active', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
}

// --- UI Feedback ---
function showSyncStatus(status) {
    const icon = document.getElementById('syncIcon');
    const text = document.getElementById('syncText');
    if (!icon || !text) return;

    if (status === 'synced') {
        icon.innerHTML = '<i data-lucide="cloud-check" style="color: #047481"></i>';
        text.innerText = 'Sincronizado';
    } else if (status === 'syncing') {
        icon.innerHTML = '<i data-lucide="refresh-cw" class="spin"></i>';
        text.innerText = 'Sincronizando...';
    } else if (status === 'online') {
        icon.innerHTML = '<i data-lucide="wifi" style="color: #047481"></i>';
        text.innerText = 'Conectado';
    } else if (status === 'offline') {
        icon.innerHTML = '<i data-lucide="cloud-off" style="color: #EE424E"></i>';
        text.innerText = 'Modo Offline';
    } else if (status === 'error') {
        icon.innerHTML = '<i data-lucide="alert-circle" style="color: #EE424E"></i>';
        text.innerText = 'Error de Sinc.';
    }
    lucide.createIcons();
}

// --- Toast Notification System ---
function showToast(message, type) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#047481' : type === 'error' ? '#EE424E' : type === 'warning' ? '#B7791F' : '#121E6C';
    toast.style.cssText = `background:${bgColor};color:white;padding:0.85rem 1.25rem;border-radius:12px;font-size:0.85rem;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.15);animation:slideUp 0.3s ease;pointer-events:auto;max-width:380px;`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Audio Feedback ---
function playSuccessBeep() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
        
        if (navigator.vibrate) navigator.vibrate(100);
    } catch(e) {
        console.warn('Audio feedback failed:', e);
    }
}
