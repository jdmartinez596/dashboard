const LOCAL_STORAGE_KEY = 'bold_dashboard_state';
let state = {
    inventory: [],
    sales: [],
    transactions: [],
    returns: [],
    settings: {
        categories: ['Marketing', 'LogÃ­stica', 'Soporte', 'Gasto Operativo', 'InversiÃ³n'],
        sources: ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda FÃ­sica', 'PÃ¡gina Web', 'Mercado Libre', 'Otro'],
        thresholds: { 'Sono Qr': 5, 'Neo': 5, 'Plus': 5, 'Smart': 3, 'Smart Pro': 2 }
    }
};

let editingInventoryIndex = -1;
let editingFinanceIndex = -1;
let editingSaleIndex = -1;
let currentReturnSaleIndex = -1;
let isOnline = navigator.onLine;
let pendingSync = false;
let currentUser = null;
let isRegisterMode = false;

function saveState() {
    if (!currentUser) return;
    const key = LOCAL_STORAGE_KEY + '_' + currentUser.id;
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem(key + '_time', Date.now().toString());
    refreshUI();
    if (isOnline) syncToSupabase();
    else pendingSync = true;
}

async function loadState() {
    if (!currentUser) return;
    const localKey = LOCAL_STORAGE_KEY + '_' + currentUser.id;
    
    const saved = localStorage.getItem(localKey);
    if (saved) {
        try { 
            state = JSON.parse(saved); 
        } catch(e) {}
    }
    state.inventory = state.inventory || [];
    state.sales = state.sales || [];
    state.transactions = state.transactions || [];
    state.returns = state.returns || [];

    if (isOnline) {
        try {
            showSyncStatus('syncing');
            const { data, error } = await supabaseClient
                .from('dashboard_state')
                .select('data, updated_at')
                .eq('user_id', currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                const cloudTime = new Date(data.updated_at).getTime();
                const localTime = localStorage.getItem(localKey + '_time');
                const localTimeMs = localTime ? parseInt(localTime) : 0;

                if (cloudTime > localTimeMs) {
                    state = data.data;
                    state.inventory = state.inventory || [];
                    state.sales = state.sales || [];
                    state.transactions = state.transactions || [];
                    state.returns = state.returns || [];
                    localStorage.setItem(localKey, JSON.stringify(state));
                    localStorage.setItem(localKey + '_time', cloudTime.toString());
                }
            } else {
                await syncToSupabase();
            }
        } catch (err) {
            console.warn('Cloud load error:', err);
        }
    }

    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.innerText = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    refreshUI();
    subscribeToRealtime();
}

async function syncToSupabase() {
    if (!currentUser || !isOnline) {
        pendingSync = true;
        return;
    }

    try {
        showSyncStatus('syncing');
        const { error } = await supabaseClient
            .from('dashboard_state')
            .upsert({
                user_id: currentUser.id,
                data: state,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
        pendingSync = false;
        showSyncStatus('synced');
    } catch (err) {
        console.error('Sync error:', err);
        showSyncStatus('error');
        pendingSync = true;
    }
}

// FunciÃ³n centralizada para refrescar TODA la interfaz
function refreshUI() {
    renderInventory();
    renderSales();
    renderFinance();
    renderAccounting();
    renderReturns();
    updateDashboard();
    lucide.createIcons();
}

// --- Realtime Subscription ---
function subscribeToRealtime() {
    if (!currentUser) return;
    
    // Eliminar canales previos si existen
    supabaseClient.removeAllChannels();

    supabaseClient
        .channel('dashboard_changes')
        .on('postgres_changes', {
            event: '*', // Escuchar INSERT, UPDATE y DELETE
            schema: 'public',
            table: 'dashboard_state',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Realtime Change Received:', payload);
            if (payload.new && payload.new.data) {
                const cloudTime = new Date(payload.new.updated_at).getTime();
                const localKey = LOCAL_STORAGE_KEY + '_' + currentUser.id;
                const localTime = localStorage.getItem(localKey + '_time');
                const localTimeMs = localTime ? parseInt(localTime) : 0;

                // Si los datos de la nube son diferentes o mÃ¡s nuevos, actualizar localmente
                if (cloudTime > localTimeMs) {
                    state = payload.new.data;
                    localStorage.setItem(localKey, JSON.stringify(state));
                    localStorage.setItem(localKey + '_time', cloudTime.toString());
                    
                    // Refrescar toda la interfaz automÃ¡ticamente
                    refreshUI();
                    showSyncStatus('synced');
                }
            }
        })
        .subscribe((status) => {
            console.log('Realtime Status:', status);
        });
}
