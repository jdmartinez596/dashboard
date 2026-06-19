// ── SEGURIDAD: Escapar HTML para prevenir XSS ───────────────────
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// ── SEGURIDAD: Cifrado localStorage (AES-256-GCM) ──────────────
function supportsCrypto() {
    return window.crypto && window.crypto.subtle;
}

async function getEncryptionKey() {
    const keyData = currentUser?.id + '|' + (currentUser?.email || 'fallback');
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(keyData),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new TextEncoder().encode('bold_dashboard_salt_v1'),
            iterations: 200000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptStore(data) {
    if (!supportsCrypto()) {
        console.warn('Crypto API no disponible, guardando en plano');
        return JSON.stringify(data);
    }
    try {
        const key = await getEncryptionKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        return 'enc:' + btoa(String.fromCharCode(...new Uint8Array(combined)));
    } catch (e) {
        console.error('Error cifrando datos:', e);
        return JSON.stringify(data);
    }
}

async function decryptStored(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    if (!encoded.startsWith('enc:')) {
        // Datos en plano (migración desde versión anterior)
        try { return JSON.parse(encoded); } catch (e) { return null; }
    }
    if (!supportsCrypto()) {
        console.warn('Crypto API no disponible, no se puede descifrar');
        return null;
    }
    try {
        const key = await getEncryptionKey();
        const raw = Uint8Array.from(atob(encoded.slice(4)), c => c.charCodeAt(0));
        const iv = raw.slice(0, 12);
        const ciphertext = raw.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        console.error('Error descifrando datos:', e);
        return null;
    }
}

// Nota: XOR no es cifrado real, no usar para datos sensibles.
// Se mantienen las funciones encryptStore/decryptStored con AES-GCM.

// ── SEGURIDAD: Auto-logout por inactividad ─────────────────────
let inactivityTimer = null;

function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (currentUser && typeof supabaseClient !== 'undefined') {
            console.warn('Sesión expirada por inactividad');
            supabaseClient.auth.signOut();
            showToast('Sesión cerrada por inactividad', 'warning');
        }
    }, 60 * 60 * 1000); // 1 hora
}

['click', 'keydown', 'mousemove', 'touchstart', 'scroll', 'focus'].forEach(ev =>
    document.addEventListener(ev, resetInactivityTimer, { passive: true })
);

// --- Date Helpers ---
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateLocal(dateStr) {
    if (!dateStr) return null;
    // Soportar formato YYYY-MM-DD y DD/MM/YYYY
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    }
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
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
    if (!sale || !state || !state.inventory) return 0;
    // Si la venta tiene múltiples dispositivos (devices[])
    if (sale.devices && Array.isArray(sale.devices)) {
        return sale.devices.reduce((total, device) => {
            const item = state.inventory.find(i => i.serial === device.serial);
            return total + (item ? (parseFloat(item.cost) || 0) : 0);
        }, 0);
    }
    // Venta con un solo serial
    const item = state.inventory.find(i => i.serial === sale.serial);
    return item ? (parseFloat(item.cost) || 0) : 0;
}

function cleanBarcode(raw) {
    return raw
        .replace(/^(SN|S\/N|SERIAL|IMEI|IME|NO|NUM|N°|#)\s*[:\.\-]?\s*/i, '')
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
        icon.innerHTML = '<i data-lucide="badge-check" style="color: #047481"></i>';
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

let _cacheTapCount = 0;
let _cacheTapTimer = null;

function checkSyncStatus() {
    _cacheTapCount++;
    if (_cacheTapCount >= 5) {
        _cacheTapCount = 0;
        clearTimeout(_cacheTapTimer);
        if (confirm('¿Limpiar caché y recargar la app?')) clearAppCache();
        return;
    }
    clearTimeout(_cacheTapTimer);
    _cacheTapTimer = setTimeout(() => { _cacheTapCount = 0; }, 2000);

    const status = navigator.onLine ? 'online' : 'offline';
    const msg = 'Estado: ' + (status === 'online' ? 'Conectado' : 'Sin conexión') +
        ' | Sinc.: ' + (pendingSync ? 'Pendiente' : 'OK') +
        '\n\nToca 5 veces seguidas para limpiar caché.';
    alert(msg);
}

function clearAppCache() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
        navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
    }
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
    showToast('Caché limpiada, recargando...', 'success');
    setTimeout(() => location.reload(), 500);
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
