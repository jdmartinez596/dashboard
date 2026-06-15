        // --- Supabase Config ---
        const SUPABASE_URL = 'https://idqhbfygmwyujrrebebt.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkcWhiZnlnbXd5dWpycmViZWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODIwMDEsImV4cCI6MjA5NDM1ODAwMX0.YItzpGHRVWVLelxTwmL0VsPKNzgfAMu5xBELkJ5EwuQ';
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
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

        let isOnline = navigator.onLine;
        let pendingSync = false;
        let currentUser = null;
        let isRegisterMode = false;

        // Auth UI Toggle
        document.getElementById('toggleAuth').onclick = (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            
            const title = document.getElementById('authTitle');
            const desc = document.getElementById('authDesc');
            const registerFields = document.getElementById('registerFields');
            const btn = document.getElementById('authBtn');
            const toggleText = document.getElementById('toggleText');
            const toggleLink = document.getElementById('toggleAuth');
            
            if (isRegisterMode) {
                title.innerText = 'Crea tu Cuenta';
                desc.innerText = 'RegÃ­strate para empezar a gestionar tu inventario.';
                registerFields.style.display = 'block';
                document.getElementById('auth_business').required = true;
                document.getElementById('auth_full_name').required = true;
                btn.innerHTML = '<i data-lucide="user-plus"></i> Registrar Negocio';
                toggleText.innerText = 'Â¿Ya tienes cuenta?';
                toggleLink.innerText = 'Iniciar SesiÃ³n';
            } else {
                title.innerText = 'Bienvenido';
                desc.innerText = 'Ingresa tus credenciales para acceder a tu panel personal.';
                registerFields.style.display = 'none';
                document.getElementById('auth_business').required = false;
                document.getElementById('auth_full_name').required = false;
                btn.innerHTML = '<i data-lucide="log-in"></i> Acceder al Panel';
                toggleText.innerText = 'Â¿No tienes cuenta?';
                toggleLink.innerText = 'Registrarse';
            }
            lucide.createIcons();
        };

        // Auth Listeners
        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth_email').value;
            const password = document.getElementById('auth_password').value;
            const business = document.getElementById('auth_business').value;
            const fullName = document.getElementById('auth_full_name').value;
            const errorEl = document.getElementById('loginError');
            const btn = document.getElementById('authBtn');

            try {
                btn.disabled = true;
                btn.innerText = isRegisterMode ? 'Creando cuenta...' : 'Autenticando...';
                errorEl.style.display = 'none';

                if (isRegisterMode) {
                    // REGISTRO
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { 
                                business_name: business,
                                full_name: fullName 
                            }
                        }
                    });
                    if (error) throw error;
                    
                    if (data.user && data.session) {
                        // Logueado automÃ¡ticamente tras registro (si el email no requiere confirmaciÃ³n)
                        console.log('Registered and logged in');
                    } else {
                        alert('Â¡Registro exitoso! Por favor verifica tu correo para activar tu cuenta (o inicia sesiÃ³n si la verificaciÃ³n estÃ¡ desactivada).');
                        // Forzar cambio a modo login
                        document.getElementById('toggleAuth').click();
                        btn.disabled = false;
                        return;
                    }
                } else {
                    // LOGIN
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email,
                        password
                    });
                    if (error) throw error;
                }
            } catch (err) {
                console.error('Auth error:', err);
                errorEl.innerText = 'Error: ' + (err.message || 'Credenciales invÃ¡lidas.');
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = isRegisterMode ? 
                    '<i data-lucide="user-plus"></i> Registrar Negocio' : 
                    '<i data-lucide="log-in"></i> Acceder al Panel';
                lucide.createIcons();
            }
        };

        async function logout() {
            await supabaseClient.auth.signOut();
            location.reload();
        }

        // Suscribirse a cambios de autenticaciÃ³n
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                if (session) {
                    currentUser = session.user;
                    
                    // Aplicar personalizaciÃ³n de nombre de negocio
                    const bizName = currentUser.user_metadata?.business_name || 'Mi Negocio';
                    const fullName = currentUser.user_metadata?.full_name || '';
                    const sidebarBiz = document.getElementById('displayBusinessName');
                    const welcomeEl = document.getElementById('dashboardWelcome');
                    
                    if (sidebarBiz) sidebarBiz.innerText = bizName;
                    if (welcomeEl) welcomeEl.innerText = fullName ? `Â¡Bienvenido, ${fullName}!` : 'Resumen Ejecutivo';

                    document.getElementById('loginView').style.display = 'none';
                    document.getElementById('appView').style.display = 'block';
                    loadState(); 
                }
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                document.getElementById('loginView').style.display = 'flex';
                document.getElementById('appView').style.display = 'none';
            }
        });

        window.addEventListener('online', async () => {
            isOnline = true;
            showSyncStatus('online');
            if (pendingSync) await syncToSupabase();
        });

        window.addEventListener('offline', () => {
            isOnline = false;
            showSyncStatus('offline');
        });

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

        // FunciÃ³n centralizada para refrescar TODA la interfaz
        function refreshUI() {
            renderInventory();
            renderSales();
            renderFinance();
            renderAccounting();
            renderReturns();
            updateDashboard();
            populateSaleSerials();
            lucide.createIcons();
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

        // --- Core Application Logic ---
        // --- Scanner Logic ---
        let html5QrCode = null;
        let currentScannerTarget = null;
        let currentCameraId = null;
        let cameras = [];
        let scannerActive = false;

        function cleanBarcode(raw) {
            return raw
                .replace(/^(SN|S\/N|SERIAL|IMEI|IME|NO|NUM|NÂ°|#)\s*[:\.\-]?\s*/i, '')
                .replace(/\s+/g, '')
                .trim();
        }

        async function startScanner(targetId) {
            currentScannerTarget = targetId;
            scannerActive = true;

            // Limpiar reader completamente antes de iniciar
            const readerEl = document.getElementById('reader');
            readerEl.innerHTML = '';

            document.getElementById('scannerModal').style.display = 'flex';
            lucide.createIcons();

            // Destruir instancia anterior si existe
            if (html5QrCode) {
                try {
                    if (html5QrCode.isScanning) await html5QrCode.stop();
                } catch(e) {}
                try { html5QrCode.clear(); } catch(e) {}
                html5QrCode = null;
            }

            html5QrCode = new Html5Qrcode('reader');

            const config = {
                fps: 20,
                qrbox: (vw, vh) => ({
                    width: Math.min(vw * 0.92, 480),
                    height: Math.max(Math.round(Math.min(vw * 0.92, 480) * 0.38), 100)
                    // 38% del ancho: captura cÃ³digos altos y bajos
                }),
                aspectRatio: 1.7778,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.PDF_417
                ],
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };

            try {
                cameras = await Html5Qrcode.getCameras();
            } catch(e) {
                cameras = [];
            }

            try {
                if (cameras && cameras.length > 0) {
                    const back = cameras.find(c =>
                        c.label.toLowerCase().includes('back') ||
                        c.label.toLowerCase().includes('rear') ||
                        c.label.toLowerCase().includes('trasera') ||
                        c.label.toLowerCase().includes('environment')
                    );
                    currentCameraId = back ? back.id : cameras[0].id;
                    await html5QrCode.start(
                        currentCameraId,
                        config,
                        onBarcodeDetected,
                        () => {}
                    );
                } else {
                    await html5QrCode.start(
                        { facingMode: { ideal: 'environment' } },
                        config,
                        onBarcodeDetected,
                        () => {}
                    );
                }
            } catch(err) {
                console.error('Camera error:', err);
                let msg = 'Error al iniciar cÃ¡mara.';
                
                if (window.location.protocol === 'file:') {
                    msg = 'La cÃ¡mara estÃ¡ bloqueada en archivos locales por seguridad del navegador.';
                } else if (err.name === 'NotAllowedError') {
                    msg = 'Permiso de cÃ¡mara denegado. Permite el acceso en configuraciÃ³n.';
                } else if (err.name === 'NotFoundError') {
                    msg = 'No se encontrÃ³ ninguna cÃ¡mara.';
                } else if (err.name === 'NotReadableError') {
                    msg = 'La cÃ¡mara estÃ¡ en uso por otra app.';
                }
                
                showScannerErrorUI(msg);
            }
        }

        function showScannerErrorUI(msg) {
            const readerEl = document.getElementById('reader');
            if (!readerEl) return;
            
            readerEl.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    min-height: 180px;
                    padding: 1.5rem;
                    gap: 0.8rem;
                ">
                    <div style="
                        background: #FFF5F5;
                        border-radius: 50%;
                        width: 50px; height: 50px;
                        display: flex; align-items: center;
                        justify-content: center;
                    ">
                        <i data-lucide="alert-triangle"
                           style="color:var(--vibrant-red);
                                  width:28px; height:28px;">
                        </i>
                    </div>
                    <p style="
                        font-size: 0.85rem;
                        font-weight: 700;
                        color: var(--deep-blue);
                        margin: 0;
                        text-align: center;
                    ">${msg}</p>
                    <p style="
                        font-size: 0.75rem;
                        color: var(--text-gray);
                        margin: 0;
                        text-align: center;
                        line-height: 1.4;
                    ">
                        Para usar la cÃ¡mara, abre el dashboard desde un servidor (localhost) o sÃºbelo a un hosting.<br>
                        <b>Mientras tanto, puedes usar la opciÃ³n de "Subir Foto".</b>
                    </p>
                </div>`;
            lucide.createIcons();
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

        // FunciÃ³n llamada al detectar â€” inserciÃ³n INMEDIATA sin confirmaciÃ³n
        function onBarcodeDetected(decodedText) {
            if (!scannerActive) return;
            scannerActive = false;

            // Feedback auditivo y tÃ¡ctil
            playSuccessBeep();

            const cleaned = cleanBarcode(decodedText);

            closeScanner();

            setTimeout(() => {
                if (currentScannerTarget === 'm_sale_serial_scanner') {
                    const input = document.getElementById('saleSerialWrapper_input');
                    const hidden = document.getElementById('m_sale_serial');
                    const item = state.inventory.find(
                        i => i.serial === cleaned && i.status === 'Disponible'
                    );
                    if (item) {
                        hidden.value = cleaned;
                        input.value = `${cleaned} â€” ${item.model}`;
                    } else {
                        if (hidden) hidden.value = cleaned;
                        if (input) input.value = cleaned;
                        alert(`Serial "${cleaned}" no encontrado en inventario disponible.`);
                    }
                } else {
                    const target = document.getElementById(currentScannerTarget);
                    if (target) {
                        target.value = cleaned;
                        target.dispatchEvent(new Event('input'));
                        target.style.borderColor = '#047481';
                        target.style.boxShadow = '0 0 0 4px rgba(4,116,129,0.15)';
                        setTimeout(() => {
                            target.style.borderColor = '';
                            target.style.boxShadow = '';
                        }, 2000);
                    }
                }
            }, 150);
        }

        function closeScanner() {
            document.getElementById('scannerModal').style.display = 'none';
            scannerActive = false;

            // Detener cÃ¡mara en segundo plano sin bloquear UI
            if (html5QrCode) {
                const instance = html5QrCode;
                html5QrCode = null;
                setTimeout(async () => {
                    try {
                        if (instance.isScanning) await instance.stop();
                        instance.clear();
                    } catch(e) {}
                    // Limpiar reader para prÃ³xima apertura
                    const readerEl = document.getElementById('reader');
                    if (readerEl) readerEl.innerHTML = '';
                }, 100);
            }
        }

        // Alias para el botÃ³n X y "Entrada Manual" del modal
        function stopScanner() {
            closeScanner();
        }

        async function switchCamera() {
            if (!cameras || cameras.length < 2) {
                alert('Solo se detectÃ³ una cÃ¡mara.');
                return;
            }
            const currentIndex = cameras.findIndex(c => c.id === currentCameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            currentCameraId = cameras[nextIndex].id;

            try {
                if (html5QrCode && html5QrCode.isScanning) {
                    await html5QrCode.stop();
                }
            } catch(e) {}

            scannerActive = true;
            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '';

            const config = {
                fps: 20,
                qrbox: (vw, vh) => ({
                    width: Math.min(vw * 0.92, 480),
                    height: Math.max(Math.round(Math.min(vw * 0.92, 480) * 0.38), 100)
                }),
                aspectRatio: 1.7778,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.CODE_93,
                    Html5QrcodeSupportedFormats.CODABAR,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.PDF_417
                ],
                experimentalFeatures: { useBarCodeDetectorIfSupported: true }
            };

            try {
                await html5QrCode.start(
                    currentCameraId,
                    config,
                    onBarcodeDetected,
                    () => {}
                );
            } catch(err) {
                console.error('Error switching camera:', err);
            }
        }

        let contrastActive = false;

        function toggleContrast() {
            const video = document.querySelector('#reader video');
            const btn = document.getElementById('contrastBtn');
            if (!video) {
                alert('Inicia la cÃ¡mara primero.');
                return;
            }
            contrastActive = !contrastActive;
            if (contrastActive) {
                video.classList.add('high-contrast');
                btn.style.background = 'var(--deep-blue)';
                btn.style.color = 'var(--white)';
                btn.innerHTML = '<i data-lucide="sun"></i> Contraste: ON';
            } else {
                video.classList.remove('high-contrast');
                btn.style.background = '';
                btn.style.color = '';
                btn.innerHTML = '<i data-lucide="sun"></i> Mejorar Contraste';
            }
            lucide.createIcons();
        }

        async function scanFromImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Resetear input para permitir subir la misma foto de nuevo
            event.target.value = '';

            // Mostrar estado de procesando en el reader
            const readerEl = document.getElementById('reader');
            const originalContent = readerEl.innerHTML;
            readerEl.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    min-height: 180px;
                    gap: 1rem;
                    color: var(--text-gray);
                    font-size: 0.9rem;
                    font-weight: 600;
                ">
                    <i data-lucide="loader"
                       style="width:36px; height:36px;
                              animation: spin 1s linear infinite;">
                    </i>
                    Analizando imagen...
                </div>`;

            // Agregar animaciÃ³n de spin si no existe
            if (!document.getElementById('spinStyle')) {
                const s = document.createElement('style');
                s.id = 'spinStyle';
                s.textContent =
                    '@keyframes spin { from { transform: rotate(0deg); }' +
                    ' to { transform: rotate(360deg); } }';
                document.head.appendChild(s);
            }
            lucide.createIcons();

            try {
                // Pausar cÃ¡mara en vivo mientras procesa la imagen
                if (html5QrCode && html5QrCode.isScanning) {
                    await html5QrCode.stop();
                }

                // Crear instancia temporal si no existe
                if (!html5QrCode) {
                    html5QrCode = new Html5Qrcode('reader');
                }

                // Escanear desde archivo
                const result = await html5QrCode.scanFile(file, true);
                const cleaned = cleanBarcode(result);

                // Ã‰xito â€” insertar directamente
                closeScanner();
                setTimeout(() => {
                    if (currentScannerTarget === 'm_sale_serial_scanner') {
                        const input = document.getElementById('saleSerialWrapper_input');
                        const hidden = document.getElementById('m_sale_serial');
                        const item = state.inventory.find(
                            i => i.serial === cleaned && i.status === 'Disponible'
                        );
                        if (item) {
                            hidden.value = cleaned;
                            input.value = `${cleaned} â€” ${item.model}`;
                        } else {
                            if (hidden) hidden.value = cleaned;
                            if (input) input.value = cleaned;
                            alert(`Serial "${cleaned}" no encontrado en inventario disponible.`);
                        }
                    } else {
                        const target = document.getElementById(currentScannerTarget);
                        if (target) {
                            target.value = cleaned;
                            target.dispatchEvent(new Event('input'));
                            target.style.borderColor = '#047481';
                            target.style.boxShadow = '0 0 0 4px rgba(4,116,129,0.15)';
                            setTimeout(() => {
                                target.style.borderColor = '';
                                target.style.boxShadow = '';
                            }, 2000);
                        }
                    }
                }, 150);

            } catch(err) {
                console.error('Error scanning image:', err);

                // No se detectÃ³ cÃ³digo â€” mostrar opciones
                readerEl.innerHTML = `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        min-height: 180px;
                        padding: 1.5rem;
                        gap: 1rem;
                    ">
                        <div style="
                            background: #FFF5F5;
                            border-radius: 50%;
                            width: 56px; height: 56px;
                            display: flex; align-items: center;
                            justify-content: center;
                        ">
                            <i data-lucide="alert-circle"
                               style="color:var(--vibrant-red);
                                      width:30px; height:30px;">
                            </i>
                        </div>
                        <p style="
                            font-size: 0.9rem;
                            font-weight: 700;
                            color: var(--deep-blue);
                            margin: 0;
                            text-align: center;
                        ">No se detectÃ³ ningÃºn cÃ³digo</p>
                        <p style="
                            font-size: 0.8rem;
                            color: var(--text-gray);
                            margin: 0;
                            text-align: center;
                            line-height: 1.5;
                        ">
                            Intenta con mejor iluminaciÃ³n,<br>
                            mÃ¡s cerca o activa el contraste.
                        </p>
                        <div style="display:flex; gap:0.75rem; width:100%;">
                            <button
                                onclick="document.getElementById('scanImageInput').click()"
                                class="btn btn-secondary"
                                style="flex:1; justify-content:center;">
                                <i data-lucide="image"></i> Otra foto
                            </button>
                            <button
                                onclick="reiniciarCamara()"
                                class="btn btn-primary"
                                style="flex:1; justify-content:center;">
                                <i data-lucide="camera"></i> Usar cÃ¡mara
                            </button>
                        </div>
                    </div>`;
                lucide.createIcons();
            }
        }

        async function reiniciarCamara() {
            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '';
            if (html5QrCode) {
                try { html5QrCode.clear(); } catch(e) {}
                html5QrCode = null;
            }
            scannerActive = true;
            startScanner(currentScannerTarget);
        }

        // --- Date Helpers ---
        function getLocalDateString(date = new Date()) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function onSalePeriodChange() {
            const period = document.getElementById('filterSalePeriod').value;
            const customDiv = document.getElementById('customSaleDates');

            if (period === 'custom') {
                customDiv.style.display = 'flex';
                const today = getLocalDateString();
                const fromEl = document.getElementById('filterSaleFrom');
                const toEl = document.getElementById('filterSaleTo');
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
            renderSales();
        }

        function onInvPeriodChange() {
            const period = document.getElementById('filterInvPeriod').value;
            const customDiv = document.getElementById('customInvDates');
            if (period === 'custom') {
                customDiv.style.display = 'flex';
                const today = getLocalDateString();
                const fromEl = document.getElementById('filterInvFrom');
                const toEl = document.getElementById('filterInvTo');
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
            renderInventory();
        }


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

        function parseDateLocal(dateStr) {
            if (!dateStr) return null;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d);
        }

        function createSearchableSelect(config) {
            const wrapper = document.getElementById(config.wrapperId);
            if (!wrapper) return;

            wrapper.innerHTML = `
                <div class="searchable-select-wrapper">
                    <input type="text" 
                           class="searchable-select-input" 
                           id="${config.wrapperId}_input"
                           placeholder="${config.placeholder}"
                           autocomplete="off">
                    <input type="hidden" id="${config.hiddenInputId}">
                    <div class="searchable-select-dropdown" 
                         id="${config.wrapperId}_dropdown"></div>
                </div>`;

            const input = document.getElementById(`${config.wrapperId}_input`);
            const hidden = document.getElementById(config.hiddenInputId);
            const dropdown = document.getElementById(`${config.wrapperId}_dropdown`);

            function renderOptions(filter = '') {
                const filtered = config.options.filter(o =>
                    o.label.toLowerCase().includes(filter.toLowerCase())
                );
                if (filtered.length === 0) {
                    dropdown.innerHTML = `<div class="searchable-select-option no-results">Sin resultados</div>`;
                } else {
                    dropdown.innerHTML = filtered.map(o =>
                        `<div class="searchable-select-option" data-value="${o.value}">${o.label}</div>`
                    ).join('');
                    dropdown.querySelectorAll('.searchable-select-option[data-value]').forEach(el => {
                        el.addEventListener('click', () => {
                            hidden.value = el.dataset.value;
                            input.value = el.textContent.trim();
                            dropdown.classList.remove('open');
                        });
                    });
                }
            }

            input.addEventListener('focus', () => {
                renderOptions(input.value);
                dropdown.classList.add('open');
            });

            input.addEventListener('input', () => {
                hidden.value = '';
                renderOptions(input.value);
                dropdown.classList.add('open');
            });

            // Limpiar listener anterior si existe
            if (wrapper._outsideClickHandler) {
                document.removeEventListener(
                    'click', wrapper._outsideClickHandler, true
                );
            }
            wrapper._outsideClickHandler = (e) => {
                if (!wrapper.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            };
            document.addEventListener(
                'click', wrapper._outsideClickHandler, true
            );

            renderOptions();
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

        function initInventoryFilter() {
            const modelOpts = [
                { value: '', label: 'Todos los modelos' },
                ...Object.keys(state.settings.thresholds).map(m =>
                    ({ value: m, label: m }))
            ];
            createSearchableSelect({
                wrapperId: 'filterModelWrapper',
                hiddenInputId: 'filterModelHidden',
                placeholder: 'Filtrar por modelo...',
                options: modelOpts
            });
            const filterInput = document.getElementById('filterModelWrapper_input');
            if (filterInput) {
                filterInput.addEventListener('change', renderInventory);
                filterInput.addEventListener('input', () => {
                    setTimeout(renderInventory, 200);
                });
            }
        }

        // --- Navigation ---
        function showView(viewId) {
            // Cerrar sidebar al navegar en mÃ³vil
            const sidebar = document.querySelector('.sidebar');
            if (sidebar.classList.contains('sidebar-open')) toggleSidebar();

            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.getElementById(viewId).classList.add('active');
            document.querySelectorAll('.nav-item').forEach(item => {
                if (item.getAttribute('onclick').includes(viewId)) item.classList.add('active');
            });
            if (viewId === 'inventory') {
                initInventoryFilter();
                renderInventory();
            }
            if (viewId === 'sales') renderSales();
            if (viewId === 'finance') renderFinance();
            if (viewId === 'accounting') renderAccounting();
            if (viewId === 'returns') renderReturns();
            if (viewId === 'settings') renderSettings();
            lucide.createIcons();
        }

        // --- Modals ---
        function openModal(id) {
            document.getElementById(id).style.display = 'flex';
            if (id === 'saleModal') {
                populateSources();
                if (editingSaleIndex === -1) {
                    populateSaleSerials();
                    document.getElementById('m_sale_date').value = getLocalDateString();
                    // Asegurar que el input visible estÃ© habilitado
                    const visibleInput = document.getElementById('saleSerialWrapper_input');
                    if (visibleInput) {
                        visibleInput.disabled = false;
                        visibleInput.style.opacity = '1';
                        visibleInput.style.cursor = 'pointer';
                        visibleInput.style.backgroundColor = '';
                    }
                } else {
                    // Modo ediciÃ³n: bloquear visualmente el campo de serial
                    const visibleInput = document.getElementById('saleSerialWrapper_input');
                    if (visibleInput) {
                        visibleInput.disabled = true;
                        visibleInput.style.opacity = '0.6';
                        visibleInput.style.cursor = 'not-allowed';
                        visibleInput.style.backgroundColor = 'var(--light-gray)';
                    }
                }
            }
            if (id === 'inventoryModal') {
                // Precargar fecha de hoy por defecto
                document.getElementById('m_inv_date').value = getLocalDateString();

                document.getElementById('m_inv_model').innerHTML = getModelOptions(
                    editingInventoryIndex !== -1 ? state.inventory[editingInventoryIndex].model : ''
                );
                if (editingInventoryIndex !== -1) {
                    const inv = state.inventory[editingInventoryIndex];
                    document.getElementById('m_inv_serial').readOnly = true;
                    document.getElementById('m_inv_date').value = inv.entryDate || getLocalDateString();
                } else {
                    document.getElementById('m_inv_serial').readOnly = false;
                }
            }
            if (id === 'transactionModal') {
                populateFinanceCategories();
                if (editingFinanceIndex === -1) {
                    document.getElementById('m_trans_date').value = getLocalDateString();
                }
            }
            lucide.createIcons();
        }

        function closeModal(id) {
            document.getElementById(id).style.display = 'none';
            
            if (id === 'saleModal') {
                editingSaleIndex = -1;
                document.getElementById('saleForm').reset();
                // Restablecer estado visual del serial
                const visibleInput = document.getElementById('saleSerialWrapper_input');
                if (visibleInput) {
                    visibleInput.disabled = false;
                    visibleInput.style.opacity = '1';
                    visibleInput.style.cursor = 'pointer';
                    visibleInput.style.backgroundColor = '';
                    visibleInput.value = '';
                }
                // Limpiar tambiÃ©n el hidden
                const hiddenSerial = document.getElementById('m_sale_serial');
                if (hiddenSerial) hiddenSerial.value = '';
            }
            if (id === 'inventoryModal')   editingInventoryIndex = -1;
            if (id === 'transactionModal') editingFinanceIndex = -1;

            if (id === 'inventoryModal') document.getElementById('inventoryForm').reset();
            if (id === 'transactionModal') document.getElementById('transactionForm').reset();
        }

        // --- Dashboard & Analytics ---
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

        function updateDashboard() {
            const now = new Date();
            const curM = now.getMonth();
            const curY = now.getFullYear();
            
            const prevM = curM === 0 ? 11 : curM - 1;
            const prevY = curM === 0 ? curY - 1 : curY;

            const filterCurM = (dStr) => { const d = parseDateLocal(dStr); return d && d.getMonth() === curM && d.getFullYear() === curY; };
            const filterPrevM = (dStr) => { const d = parseDateLocal(dStr); return d && d.getMonth() === prevM && d.getFullYear() === prevY; };

            const salesCurM = state.sales.filter(s => filterCurM(s.saleDate) && s.returned !== true);
            const salesPrevM = state.sales.filter(s => filterPrevM(s.saleDate) && s.returned !== true);
            
            const otherIncomeCurM = (state.transactions || []).filter(t => t.type === 'income' && t.category !== 'Venta' && filterCurM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
            const otherIncomePrevM = (state.transactions || []).filter(t => t.type === 'income' && t.category !== 'Venta' && filterPrevM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);

            const incomeCurM = salesCurM.reduce((a, s) => a + (parseFloat(s.price) || 0), 0) + otherIncomeCurM;
            const incomePrevM = salesPrevM.reduce((a, s) => a + (parseFloat(s.price) || 0), 0) + otherIncomePrevM;

            const costCurM = salesCurM.reduce((a, s) => a + getSaleCost(s), 0);
            const expCurM = (state.transactions || []).filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n' && filterCurM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
            const returnsCurM = (state.returns || []).filter(r => filterCurM(r.returnDate)).reduce((a, r) => a + (parseFloat(r.salePrice) || 0), 0);
            const profitCurM = incomeCurM - costCurM - expCurM - returnsCurM;
            
            const costPrevM = salesPrevM.reduce((a, s) => a + getSaleCost(s), 0);
            const expPrevM = (state.transactions || []).filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n' && filterPrevM(t.date)).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0);
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
            if (kpiStock) kpiStock.innerText = state.inventory.filter(i => i.status === 'Disponible').length;

            // RotaciÃ³n promedio
            const soldItems = state.inventory.filter(i => i.status === 'Vendido');
            let rotationText = '0 dÃ­as';
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
                if (count > 0) rotationText = `${Math.round(totalDays / count)} dÃ­as`;
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

        function renderStockBars() {
            const container = document.getElementById('inventoryBars');
            if (!container) return;
            container.innerHTML = '';

            const uniqueModels = Array.from(new Set([
                ...Object.keys(state.settings.thresholds),
                ...state.inventory.map(i => i.model)
            ])).filter(Boolean);

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
                const alertText = isBelowThreshold ? 'âš  Stock bajo' : 'âœ“ Stock OK';
                const alertColor = isBelowThreshold ? 'var(--vibrant-red)' : '#047481';

                container.innerHTML += `
                    <div class="stock-item">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; width: 100%;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <span class="stock-label" style="font-weight:700; color:var(--deep-blue);">
                                    ${model}
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

            const uniqueModels2 = Array.from(new Set([
                ...Object.keys(state.settings.thresholds),
                ...state.inventory.map(i => i.model)
            ])).filter(Boolean);

            const bajosCount = uniqueModels2.filter(m => {
                const threshold = state.settings.thresholds[m] !== undefined ? state.settings.thresholds[m] : 5;
                const count = state.inventory.filter(
                    i => i && i.model === m && i.status === 'Disponible'
                ).length;
                return count < threshold;
            }).length;

            const summaryEl = document.getElementById('stockAlertSummary');
            if (summaryEl) {
                if (bajosCount === 0) {
                    summaryEl.style.color = '#047481';
                    summaryEl.innerText = 'âœ“ Todo el stock en niveles normales';
                } else {
                    summaryEl.style.color = 'var(--vibrant-red)';
                    summaryEl.innerText = `âš  ${bajosCount} modelo${bajosCount > 1 ? 's' : ''} con stock bajo`;
                }
            }
        }

        // --- Logic modules ---
        document.getElementById('inventoryForm').onsubmit = function (e) {
            e.preventDefault();
            const serial = document.getElementById('m_inv_serial').value.trim();
            const model = document.getElementById('m_inv_model').value;
            const imei = document.getElementById('m_inv_imei').value;
            const cost = parseFloat(document.getElementById('m_inv_cost').value);
            const entryDate = document.getElementById('m_inv_date').value;

            if (editingInventoryIndex === -1) {
                if (state.inventory.find(i => i.serial === serial)) { alert('Serial duplicado.'); return; }
                state.inventory.push({ serial, model, imei, cost, entryDate: entryDate, status: 'Disponible' });
            } else {
                state.inventory[editingInventoryIndex] = { 
                    ...state.inventory[editingInventoryIndex], 
                    model, imei, cost, entryDate 
                };
            }
            saveState();
            closeModal('inventoryModal');
            renderInventory();
        };

        function renderInventory() {
            const search = document.getElementById('searchInventory').value.toLowerCase();
            const modelFilter = document.getElementById('filterModelHidden') ?
                document.getElementById('filterModelHidden').value : '';
            const invPeriod = document.getElementById('filterInvPeriod')
                ? document.getElementById('filterInvPeriod').value : '';
            const invFrom = document.getElementById('filterInvFrom')
                ? document.getElementById('filterInvFrom').value : '';
            const invTo = document.getElementById('filterInvTo')
                ? document.getElementById('filterInvTo').value : '';
            const invDateRange = getDateRangeFilter(invPeriod, invFrom, invTo);

            const tbody = document.querySelector('#inventoryTable tbody');
            tbody.innerHTML = '';

            let filteredInv = state.inventory.filter(i => {
                const matchSearch = (i.serial || '').toLowerCase().includes(search) || (i.imei || '').toLowerCase().includes(search);
                const matchModel = !modelFilter || i.model === modelFilter;
                let matchDate = true;
                if (invDateRange) {
                    const d = parseDateLocal(i.entryDate);
                    matchDate = d && d >= invDateRange.from && d <= invDateRange.to;
                }
                return matchSearch && matchModel && matchDate;
            });

            // Orden cronolÃ³gico descendente
            filteredInv.sort((a, b) => {
                const da = parseDateLocal(a.entryDate) || 0;
                const db = parseDateLocal(b.entryDate) || 0;
                return db - da;
            });

            const now = new Date();
            filteredInv.forEach((i) => {
                if (!i) return;
                const statusColor =
                    i.status === 'Disponible' ? '#047481' :
                    i.status === 'Vendido' ? 'var(--deep-blue)' :
                    i.status === 'GarantÃ­a' ? '#B7791F' :
                    i.status === 'Baja' ? 'var(--vibrant-red)' :
                    'var(--text-gray)';

                const entryDate = parseDateLocal(i.entryDate);
                const sale = state.sales.find(s => s.serial === i.serial);
                let daysText = '-';
                let stagnantStyle = '';

                if (i.status === 'Disponible') {
                    const days = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
                    daysText = `${days} dÃ­as`;
                    if (days > 30) stagnantStyle = 'background:rgba(183,121,31,0.1); color:#B7791F; font-weight:700; border-radius:4px; padding:0.1rem 0.3rem;';
                } else if (sale) {
                    const saleDate = parseDateLocal(sale.saleDate);
                    const days = Math.floor((saleDate - entryDate) / (1000 * 60 * 60 * 24));
                    daysText = `${days} dÃ­as`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><strong>${i.serial}</strong></td>
                        <td>${i.model}</td>
                        <td style="font-size:0.75rem;">${i.entryDate}</td>
                        <td><span style="${stagnantStyle}">${daysText}</span></td>
                        <td>$${(parseFloat(i.cost) || 0).toLocaleString()}</td>
                        <td>
                            <span style="
                                padding: 0.25rem 0.75rem;
                                border-radius: 100px;
                                font-size: 0.75rem;
                                font-weight: 700;
                                color: ${statusColor};
                                background: ${statusColor}18;">
                                ${i.status}
                            </span>
                            ${i.returnNote
                                ? '<div style="font-size:0.7rem; color:var(--text-gray); margin-top:0.2rem;">' + i.returnNote + '</div>'
                                : ''}
                        </td>
                        <td>
                            <div style="display:flex; gap:0.5rem;">
                                <button onclick="editInventory('${i.serial}')" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>
                                <button onclick="deleteItem('${i.serial}')" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>
                            </div>
                        </td>
                    </tr>`;
            });

            const invCountEl = document.getElementById('invResultCount');
            if (invCountEl) {
                invCountEl.innerText = invDateRange
                    ? `${filteredInv.length} equipo${filteredInv.length !== 1 ? 's' : ''} en el perÃ­odo`
                    : `${filteredInv.length} equipo${filteredInv.length !== 1 ? 's' : ''} en total`;
            }
            lucide.createIcons();
        }

        function editInventory(serial) {
            const index = state.inventory.findIndex(i => i.serial === serial);
            if (index === -1) return;
            editingInventoryIndex = index;
            const i = state.inventory[index];
            document.getElementById('m_inv_model').value = i.model;
            document.getElementById('m_inv_serial').value = i.serial;
            document.getElementById('m_inv_imei').value = i.imei || '';
            document.getElementById('m_inv_cost').value = i.cost;
            openModal('inventoryModal');
        }

        function deleteItem(serial) {
            if (confirm('Â¿Eliminar este equipo? Se borrarÃ¡n tambiÃ©n sus ventas y registros financieros asociados.')) {
                // 1. Limpiar ventas y sus finanzas
                const sale = state.sales.find(s => s.serial === serial);
                if (sale) {
                    // Eliminar ingreso de la venta
                    state.transactions = state.transactions.filter(t => 
                        !(t.type === 'income' && t.description.includes(serial))
                    );
                    // Eliminar devoluciÃ³n si existe
                    if (sale.returned) {
                        state.returns = (state.returns || []).filter(r => r.serial !== serial);
                        state.transactions = state.transactions.filter(t => 
                            !(t.category === 'DevoluciÃ³n' && t.description.includes(serial))
                        );
                    }
                    state.sales = state.sales.filter(s => s.serial !== serial);
                }
                
                // 2. Eliminar del inventario
                state.inventory = state.inventory.filter(i => i.serial !== serial);
                
                saveState();
                renderInventory();
                updateDashboard();
            }
        }

        function populateSaleSerials() {
            const options = state.inventory
                .filter(i => i.status === 'Disponible')
                .map(i => ({ value: i.serial, label: `${i.serial} â€” ${i.model}` }));
            createSearchableSelect({
                wrapperId: 'saleSerialWrapper',
                hiddenInputId: 'm_sale_serial',
                placeholder: 'Escribe el serial o modelo...',
                options
            });
        }

        document.getElementById('saleForm').onsubmit = function (e) {
            e.preventDefault();
            const serial = document.getElementById('m_sale_serial').value;
            const client = document.getElementById('m_sale_client').value;
            const city = document.getElementById('m_sale_city').value;
            const source = document.getElementById('m_sale_source').value;
            const saleDate = document.getElementById('m_sale_date').value;
            const price = parseFloat(document.getElementById('m_sale_price').value);

            if (editingSaleIndex === -1) {
                const item = state.inventory.find(i => i.serial === serial);
                if (!serial || !item) { alert('No hay equipos disponibles para vender.'); return; }
                item.status = 'Vendido';
                state.sales.push({ serial, model: item.model, cost: item.cost, price, client, city, source, saleDate });
                
                // Registro contable automÃ¡tico
                state.transactions.push({
                    id: Date.now(),
                    type: 'income',
                    category: 'Venta',
                    description: `Venta Equipo â€” ${serial} â€” Cliente: ${client}`,
                    amount: price,
                    date: saleDate
                });
            } else {
                const oldSerial = state.sales[editingSaleIndex].serial;
                state.sales[editingSaleIndex] = { ...state.sales[editingSaleIndex], price, client, city, source, saleDate };
                
                // Actualizar registro contable existente
                const trans = state.transactions.find(t => t.type === 'income' && t.description.includes(oldSerial));
                if (trans) {
                    trans.description = `Venta Equipo â€” ${oldSerial} â€” Cliente: ${client}`;
                    trans.amount = price;
                    trans.date = saleDate;
                }
            }
            saveState();
            closeModal('saleModal');
            renderSales();
            updateDashboard();
        };

        function renderSales() {
            const search = document.getElementById('searchSales').value.toLowerCase().trim();
            const salePeriod = document.getElementById('filterSalePeriod') ? document.getElementById('filterSalePeriod').value : '';
            const saleFrom = document.getElementById('filterSaleFrom') ? document.getElementById('filterSaleFrom').value : '';
            const saleTo = document.getElementById('filterSaleTo') ? document.getElementById('filterSaleTo').value : '';
            const saleDateRange = getDateRangeFilter(salePeriod, saleFrom, saleTo);

            const tbody = document.querySelector('#salesTable tbody');
            tbody.innerHTML = '';
            
            let filtered = state.sales.filter(s => {
                const matchSearch =
                    (s.client || '').toLowerCase().includes(search) ||
                    (s.serial || '').toLowerCase().includes(search) ||
                    (s.city || '').toLowerCase().includes(search);

                let matchDate = true;
                if (saleDateRange) {
                    const d = parseDateLocal(s.saleDate);
                    matchDate = d && d >= saleDateRange.from && d <= saleDateRange.to;
                }

                return matchSearch && matchDate;
            });

            // Orden cronolÃ³gico descendente
            filtered.sort((a, b) => {
                const da = parseDateLocal(a.saleDate) || 0;
                const db = parseDateLocal(b.saleDate) || 0;
                return db - da;
            });

            filtered.forEach((s) => {
                if (!s) return;
                const index = state.sales.indexOf(s);
                const priceNum = parseFloat(s.price) || 0;
                const costNum = getSaleCost(s);
                const utility = priceNum - costNum;
                const utilityColor = utility < 0 ? 'var(--vibrant-red)' : '#047481';
                const margin = priceNum > 0 ? ((utility / priceNum) * 100).toFixed(0) : 0;

                const retBtn = s.returned
                    ? `<span style="font-size:0.65rem; color:var(--vibrant-red); font-weight:800; background:rgba(238,66,78,0.1); padding:0.2rem 0.4rem; border-radius:100px;">DEVUELTO</span>`
                    : `<button onclick="openReturnModal('${s.serial}')" title="Registrar devoluciÃ³n" style="background:none; border:none; cursor:pointer; color:var(--vibrant-red); display:flex; align-items:center; padding:0.25rem;">
                         <i data-lucide="rotate-ccw" style="width:16px;height:16px;"></i>
                       </button>`;

                tbody.innerHTML += `
                    <tr>
                        <td>${s.saleDate}</td>
                        <td>${s.model} <br><small>${s.serial}</small></td>
                        <td>${s.client}</td>
                        <td><strong>$${priceNum.toLocaleString()}</strong></td>
                        <td style="color: ${utilityColor}; font-weight: 700;">
                            $${utility.toLocaleString()} <br><small style="color:var(--text-gray)">${margin}%</small>
                        </td>
                        <td><span class="badge" style="background:#E2E8F0; color:var(--deep-blue)">${s.source}</span></td>
                        <td>
                            <div style="display:flex; gap:0.5rem; align-items:center;">
                                <button onclick="editSale('${s.serial}')" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>
                                <button onclick="deleteSale('${s.serial}')" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>
                                ${retBtn}
                            </div>
                        </td>
                    </tr>`;
            });

            const countEl = document.getElementById('salesResultCount');
            if (countEl) {
                countEl.innerText = saleDateRange
                    ? `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en el perÃ­odo`
                    : `${filtered.length} venta${filtered.length !== 1 ? 's' : ''} en total`;
            }
            lucide.createIcons();
        }

        function editSale(serial) {
            const index = state.sales.findIndex(s => s.serial === serial);
            if (index === -1) return;
            editingSaleIndex = index;
            const s = state.sales[index];
            createSearchableSelect({
                wrapperId: 'saleSerialWrapper',
                hiddenInputId: 'm_sale_serial',
                placeholder: 'Serial del equipo',
                options: [{ value: s.serial, label: `${s.serial} â€” ${s.model}` }]
            });
            populateSources();
            document.getElementById('m_sale_serial').value = s.serial;
            document.getElementById('saleSerialWrapper_input').value = `${s.serial} â€” ${s.model}`;
            document.getElementById('m_sale_client').value = s.client;
            document.getElementById('m_sale_city').value = s.city;
            document.getElementById('m_sale_source').value = s.source;
            document.getElementById('m_sale_date').value = s.saleDate;
            document.getElementById('m_sale_price').value = s.price;
            openModal('saleModal');
        }

        function deleteSale(serial) {
            if (confirm('Â¿Eliminar esta venta? Se ajustarÃ¡ el inventario y las finanzas automÃ¡ticamente.')) {
                const index = state.sales.findIndex(s => s.serial === serial);
                if (index === -1) return;
                const s = state.sales[index];

                // 1. Revertir inventario
                const item = state.inventory.find(i => i.serial === s.serial);
                if (item) {
                    item.status = 'Disponible';
                    if (item.returnNote) delete item.returnNote;
                }

                // 2. Eliminar transacciÃ³n financiera de la venta
                state.transactions = state.transactions.filter(t => 
                    !(t.type === 'income' && t.description.includes(serial) && t.category === 'Venta')
                );

                // 3. Si fue devuelta, eliminar el registro de devoluciÃ³n y su transacciÃ³n
                if (s.returned) {
                    const retId = s.returnId;
                    state.returns = (state.returns || []).filter(r => r.id !== retId);
                    state.transactions = state.transactions.filter(t => 
                        !(t.category === 'DevoluciÃ³n' && t.description.includes(serial))
                    );
                }

                // 4. Eliminar la venta
                state.sales.splice(index, 1);
                
                saveState();
                renderSales();
                updateDashboard();
            }
        }

        function openReturnModal(serial) {
            const index = state.sales.findIndex(s => s.serial === serial);
            if (index === -1) return;
            currentReturnSaleIndex = index;
            const s = state.sales[index];
            if (!s) return;

            const item = state.inventory.find(i => i.serial === s.serial);
            const cost = item ? (item.cost || 0) : 0;

            // Mostrar info de la venta original
            document.getElementById('returnSaleInfo').innerHTML = `
                <strong style="color:var(--deep-blue);">
                    Venta original
                </strong><br>
                ðŸ“¦ <b>Serial:</b> ${s.serial} â€” ${s.model || ''}<br>
                ðŸ‘¤ <b>Cliente:</b> ${s.client || 'N/A'}
                    (${s.city || 'N/A'})<br>
                ðŸ“… <b>Fecha venta:</b> ${s.saleDate || 'N/A'}<br>
                ðŸ’µ <b>Precio venta:</b>
                    $${(s.price || 0).toLocaleString()}<br>
                ðŸ“Š <b>Utilidad original:</b>
                    $${((s.price || 0) - cost).toLocaleString()}
            `;

            document.getElementById('m_ret_date').value = getLocalDateString();
            document.getElementById('returnModalOverlay').style.display = 'flex';
            lucide.createIcons();
        }

        function closeReturnModal() {
            document.getElementById('returnModalOverlay').style.display = 'none';
            document.getElementById('returnForm').reset();
            currentReturnSaleIndex = -1;
        }

        document.getElementById('returnForm').onsubmit = async (e) => {
            e.preventDefault();
            if (currentReturnSaleIndex === -1) return;

            const s = state.sales[currentReturnSaleIndex];
            const item = state.inventory.find(i => i.serial === s.serial);
            const cost = item ? (item.cost || 0) : 0;
            const action = document.getElementById('m_ret_action').value;
            const condition = document.getElementById('m_ret_condition').value;

            // Crear registro de devoluciÃ³n
            const ret = {
                id: 'RET-' + Date.now(),
                serial: s.serial,
                model: s.model || '',
                client: s.client || '',
                city: s.city || '',
                saleDate: s.saleDate || '',
                returnDate: document.getElementById('m_ret_date').value,
                salePrice: s.price || 0,
                cost: cost,
                reason: document.getElementById('m_ret_reason').value,
                condition: condition,
                action: action,
                notes: document.getElementById('m_ret_notes').value,
                source: s.source || ''
            };

            // Agregar a state.returns
            if (!state.returns) state.returns = [];
            state.returns.push(ret);

            // Trazabilidad: marcar la venta como devuelta
            state.sales[currentReturnSaleIndex].returned = true;
            state.sales[currentReturnSaleIndex].returnId = ret.id;

            // AcciÃ³n sobre el inventario segÃºn decisiÃ³n
            if (action === 'Reingreso' && item) {
                // Volver a disponible
                item.status = 'Disponible';
                item.entryDate = ret.returnDate;
                item.returnNote = `Reingreso por devoluciÃ³n ${ret.id}`;
            } else if (action === 'Baja' && item) {
                item.status = 'Baja';
                item.returnNote = `Baja por devoluciÃ³n ${ret.id}`;
            } else if (action === 'GarantÃ­a' && item) {
                item.status = 'GarantÃ­a';
                item.returnNote = `En garantÃ­a por devoluciÃ³n ${ret.id}`;
            }

            // Registrar automÃ¡ticamente en finanzas como egreso
            // si el precio de venta fue cobrado (impacto financiero)
            state.transactions.push({
                type: 'expense',
                category: 'DevoluciÃ³n',
                description: `DevoluciÃ³n ${ret.id} â€” ${s.serial} â€” Cliente: ${s.client || 'N/A'}`,
                amount: s.price || 0,
                date: ret.returnDate
            });

            await saveState();
            closeReturnModal();
            renderSales();
            updateDashboard();

            alert(`âœ… DevoluciÃ³n ${ret.id} registrada.\n` +
                  `AcciÃ³n: ${action}\n` +
                  `El equipo fue marcado como: ${
                      action === 'Reingreso' ? 'Disponible' :
                      action === 'GarantÃ­a' ? 'En GarantÃ­a' : 'Baja'
                  }`);
        };

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

            const totalSales = sales.reduce((acc, s) => acc + (parseFloat(s.price) || 0), 0);
            const otherIncome = transactions.filter(t => t.type === 'income' && t.category !== 'Venta').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
            const totalIncome = totalSales + otherIncome;

            const costOfInventoryPurchased = inventoryEntries.reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
            const costOfMerchSold = sales.reduce((acc, s) => acc + getSaleCost(s), 0);
            const opExpenses = transactions.filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n').reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
            const totalReturnsPaid = returns.reduce((acc, r) => acc + (parseFloat(r.salePrice) || 0), 0);

            // Cost of Goods Sold calculations
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

            if (document.getElementById('acc-merch-opening')) document.getElementById('acc-merch-opening').innerText = `$${openingStock.toLocaleString()}`;
            if (document.getElementById('acc-merch-closing')) document.getElementById('acc-merch-closing').innerText = `$${closingStock.toLocaleString()}`;
            if (document.getElementById('acc-merch-stagnant-val')) document.getElementById('acc-merch-stagnant-val').innerText = `$${stagnantStockValue.toLocaleString()}`;

            if (document.getElementById('acc-merch-purchased')) document.getElementById('acc-merch-purchased').innerText = `$${costOfInventoryPurchased.toLocaleString()}`;
            if (document.getElementById('acc-merch-cost-sold')) document.getElementById('acc-merch-cost-sold').innerText = `$${costOfMerchSold.toLocaleString()}`;
            if (document.getElementById('acc-merch-available')) document.getElementById('acc-merch-available').innerText = `$${availableStockValue.toLocaleString()}`;
            if (document.getElementById('acc-total-op-expenses')) document.getElementById('acc-total-op-expenses').innerText = `$${opExpenses.toLocaleString()}`;
            if (document.getElementById('acc-returns-total')) document.getElementById('acc-returns-total').innerText = `$${totalReturnsPaid.toLocaleString()}`;
            if (document.getElementById('acc-returns-count')) document.getElementById('acc-returns-count').innerText = returns.length;
            if (document.getElementById('acc-final-total-expenses')) document.getElementById('acc-final-total-expenses').innerText = `$${totalExpensesAcc.toLocaleString()}`;

            const expenseCats = {};
            transactions.filter(t => t.type === 'expense' && t.category !== 'DevoluciÃ³n').forEach(t => { expenseCats[t.category] = (expenseCats[t.category] || 0) + parseFloat(t.amount); });
            let expHtml = '';
            for (let cat in expenseCats) { expHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${cat}</span><span>$${expenseCats[cat].toLocaleString()}</span></div>`; }
            if (document.getElementById('acc-expense-categories')) document.getElementById('acc-expense-categories').innerHTML = expHtml;

            if (document.getElementById('acc-sales-total')) document.getElementById('acc-sales-total').innerText = `$${totalSales.toLocaleString()}`;
            if (document.getElementById('acc-sales-count')) document.getElementById('acc-sales-count').innerText = sales.length;
            if (document.getElementById('acc-sales-avg')) document.getElementById('acc-sales-avg').innerText = sales.length > 0 ? `$${(totalSales / sales.length).toLocaleString()}` : '$0';
            if (document.getElementById('acc-total-other-income')) document.getElementById('acc-total-other-income').innerText = `$${otherIncome.toLocaleString()}`;
            if (document.getElementById('acc-final-total-income')) document.getElementById('acc-final-total-income').innerText = `$${totalIncome.toLocaleString()}`;

            const salesModel = {};
            sales.forEach(s => { salesModel[s.model] = (salesModel[s.model] || 0) + parseFloat(s.price); });
            let modelHtml = '';
            Object.entries(salesModel).sort((a,b) => b[1] - a[1]).forEach(([mod, val]) => {
                modelHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${mod}</span><span>$${val.toLocaleString()}</span></div>`;
            });
            if (document.getElementById('acc-sales-by-model')) document.getElementById('acc-sales-by-model').innerHTML = modelHtml || '<div style="font-size:0.8rem; color:var(--text-gray); padding-left:1rem;">N/A</div>';

            const salesSource = {};
            sales.forEach(s => { salesSource[s.source] = (salesSource[s.source] || 0) + parseFloat(s.price); });
            let sourceHtml = '';
            Object.entries(salesSource).sort((a,b) => b[1] - a[1]).forEach(([src, val]) => {
                sourceHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${src}</span><span>$${val.toLocaleString()}</span></div>`;
            });
            if (document.getElementById('acc-sales-by-source')) document.getElementById('acc-sales-by-source').innerHTML = sourceHtml || '<div style="font-size:0.8rem; color:var(--text-gray); padding-left:1rem;">N/A</div>';

            const incomeCats = {};
            transactions.filter(t => t.type === 'income' && t.category !== 'Venta').forEach(t => { incomeCats[t.category] = (incomeCats[t.category] || 0) + parseFloat(t.amount); });
            let incHtml = '';
            for (let cat in incomeCats) { incHtml += `<div class="report-row" style="font-size:0.85rem; padding-left:1rem; border-bottom:none;"><span>${cat}</span><span>$${incomeCats[cat].toLocaleString()}</span></div>`; }
            if (document.getElementById('acc-income-categories')) document.getElementById('acc-income-categories').innerHTML = incHtml;

            if (document.getElementById('acc-res-gross')) document.getElementById('acc-res-gross').innerText = `$${grossProfit.toLocaleString()}`;
            if (document.getElementById('acc-res-op')) document.getElementById('acc-res-op').innerText = `$${opProfit.toLocaleString()}`;
            if (document.getElementById('acc-res-net')) document.getElementById('acc-res-net').innerText = `$${netProfit.toLocaleString()}`;
            
            const finalVal = document.getElementById('acc-res-final-value');
            if (finalVal) {
                finalVal.innerText = `$${netProfit.toLocaleString()}`;
                finalVal.style.color = netProfit >= 0 ? '#047481' : 'var(--vibrant-red)';
                document.getElementById('acc-res-final-margin').innerText = `Margen: ${marginNet.toFixed(1)}%`;
                document.getElementById('acc-res-final-box').style.background = netProfit >= 0 ? 'rgba(4,116,129,0.05)' : 'rgba(238,66,78,0.05)';
                
                const progressFill = document.getElementById('acc-margin-progress-fill');
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

            const soldInPeriod = state.inventory.filter(i => i.status === 'Vendido' && sales.some(s => s.serial === i.serial));
            let totalDays = 0;
            soldInPeriod.forEach(i => {
                const sale = sales.find(s => s.serial === i.serial);
                if (sale) {
                    const start = parseDateLocal(i.entryDate);
                    const end = parseDateLocal(sale.saleDate);
                    totalDays += Math.floor((end - start) / (1000 * 60 * 60 * 24));
                }
            });
            if (document.getElementById('acc-met-rotation')) document.getElementById('acc-met-rotation').innerText = soldInPeriod.length > 0 ? `${Math.round(totalDays / soldInPeriod.length)} dÃ­as` : '0 dÃ­as';

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
            const query = document.getElementById('traceSearch').value.toLowerCase().trim();
            const tbody = document.getElementById('traceTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            const now = new Date();

            let traceList = [...state.inventory];
            traceList.sort((a, b) => {
                const da = parseDateLocal(a.entryDate) || 0;
                const db = parseDateLocal(b.entryDate) || 0;
                return db - da;
            });

            traceList.forEach(i => {
                if (query && !i.serial.toLowerCase().includes(query) && !i.model.toLowerCase().includes(query)) return;
                const sale = state.sales.find(s => s.serial === i.serial);
                const ret = (state.returns || []).find(r => r.serial === i.serial);
                const costNum = parseFloat(i.cost) || 0;
                const priceNum = sale ? (parseFloat(sale.price) || 0) : 0;
                const utility = sale ? (priceNum - costNum) : 0;
                const statusColor = i.status === 'Disponible' ? '#047481' : i.status === 'Vendido' ? 'var(--deep-blue)' : i.status === 'Devuelto' ? 'var(--vibrant-red)' : i.status === 'GarantÃ­a' ? '#B7791F' : '#718096';

                tbody.innerHTML += `
                    <tr>
                        <td style="font-size:0.75rem;">${i.entryDate}</td>
                        <td><strong>${i.model}</strong><br><small>${i.serial}</small></td>
                        <td>$${costNum.toLocaleString()}</td>
                        <td style="font-size:0.75rem;">${sale ? sale.saleDate : '-'}</td>
                        <td>$${priceNum.toLocaleString()}</td>
                        <td style="color:${utility >= 0 ? '#047481' : 'var(--vibrant-red)'}; font-weight:700;">
                            ${sale ? '$' + utility.toLocaleString() : '-'}
                        </td>
                        <td style="font-size:0.75rem;">
                            ${sale ? '<strong>' + sale.source + '</strong><br>' + sale.client : '-'}
                        </td>
                        <td>
                            <span style="padding:0.2rem 0.5rem; border-radius:100px; font-size:0.7rem; font-weight:700; color:${statusColor}; background:${statusColor}15;">
                                ${i.status}
                            </span>
                        </td>
                        <td style="font-size:0.7rem; color:var(--text-gray);">
                            ${ret ? '<strong>DEV:</strong> ' + ret.returnDate + '<br>' + ret.reason : (i.returnNote || '-')}
                        </td>
                    </tr>`;
            });
            lucide.createIcons();
        }

        function populateFinanceCategories() {
            const select = document.getElementById('m_trans_category');
            select.innerHTML = '';
            state.settings.categories.forEach(c => { select.innerHTML += `<option value="${c}">${c}</option>`; });
        }

        document.getElementById('transactionForm').onsubmit = function (e) {
            e.preventDefault();
            const type = document.getElementById('m_trans_type').value;
            const category = document.getElementById('m_trans_category').value;
            const description = document.getElementById('m_trans_desc').value;
            const amount = parseFloat(document.getElementById('m_trans_amount').value);
            const date = document.getElementById('m_trans_date').value;
            const id = editingFinanceIndex !== -1 ? state.transactions[editingFinanceIndex].id : Date.now();

            if (editingFinanceIndex === -1) {
                state.transactions.push({ id, type, category, description, amount, date });
            } else {
                state.transactions[editingFinanceIndex] = { id, type, category, description, amount, date };
            }
            saveState();
            closeModal('transactionModal');
            renderFinance();
        };

        function renderFinance() {
            const typeFilter = document.getElementById('filterFinanceType').value;
            const catFilter = document.getElementById('filterFinanceCategory').value;
            const tbody = document.querySelector('#financeTable tbody');
            tbody.innerHTML = '';
            
            // Reconstruir dropdown solo si es necesario (cuando cambia la vista)
            const catDropdown = document.getElementById('filterFinanceCategory');
            if (catDropdown.options.length <= 1) {
                catDropdown.innerHTML = '<option value="">Todas las categorÃ­as</option>';
                state.settings.categories.forEach(c => { catDropdown.innerHTML += `<option value="${c}">${c}</option>`; });
                catDropdown.value = catFilter;
            }

            const filteredTxList = state.transactions.filter(t => {
                if (!t) return false;
                return (!typeFilter || t.type === typeFilter) && (!catFilter || t.category === catFilter);
            });

            // Orden cronolÃ³gico descendente
            filteredTxList.sort((a, b) => {
                const da = parseDateLocal(a.date) || 0;
                const db = parseDateLocal(b.date) || 0;
                return db - da;
            });

            filteredTxList.forEach((t) => {
                const isExpense = t.type === 'expense';
                const amountNum = parseFloat(t.amount) || 0;
                const isAuto = t.category === 'Venta' || t.category === 'DevoluciÃ³n';
                const autoBadge = isAuto ? `<span class="badge" style="background:#E2E8F0; color:var(--text-gray); font-size:0.65rem; margin-left:0.5rem; font-weight:600; padding:0.15rem 0.4rem;">Auto</span>` : '';
                
                const editBtn = isAuto 
                    ? `<button disabled style="background:none; border:none; color:var(--border); cursor:not-allowed;"><i data-lucide="pencil" size="18"></i></button>`
                    : `<button onclick="editFinance(${t.id})" style="background:none; border:none; color:var(--soft-blue); cursor:pointer;"><i data-lucide="pencil" size="18"></i></button>`;
                    
                const deleteBtn = isAuto 
                    ? `<button disabled style="background:none; border:none; color:var(--border); cursor:not-allowed;"><i data-lucide="trash-2" size="18"></i></button>`
                    : `<button onclick="deleteFinance(${t.id})" style="background:none; border:none; color:var(--vibrant-red); cursor:pointer;"><i data-lucide="trash-2" size="18"></i></button>`;

                tbody.innerHTML += `
                    <tr>
                        <td>${t.date}</td>
                        <td>${t.type === 'income' ? 'Ingreso' : 'Egreso'}</td>
                        <td>
                            <div style="display:flex; align-items:center; gap:0.25rem;">
                                <span class="badge badge-pill">${t.category}</span>
                                ${autoBadge}
                            </div>
                        </td>
                        <td>${t.description}</td>
                        <td style="color: ${isExpense ? 'var(--vibrant-red)' : '#047481'}; font-weight: 700;">${isExpense ? '-' : '+'} $${amountNum.toLocaleString()}</td>
                        <td>
                            <div style="display:flex; gap:0.5rem;">
                                ${editBtn}
                                ${deleteBtn}
                            </div>
                        </td>
                    </tr>`;
            });

            // Balance del perÃ­odo
            const filteredTx = state.transactions.filter(t =>
                (!typeFilter || t.type === typeFilter) && (!catFilter || t.category === catFilter)
            );
            const totalInc = filteredTx.filter(t => t.type === 'income').reduce((a,t) => a + (parseFloat(t.amount)||0), 0);
            const totalExp = filteredTx.filter(t => t.type === 'expense').reduce((a,t) => a + (parseFloat(t.amount)||0), 0);
            const balance = totalInc - totalExp;
            const balanceSummaryEl = document.getElementById('financeBalanceSummary');
            if (balanceSummaryEl) {
                balanceSummaryEl.innerHTML = `
                    <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-top:1px solid var(--border);">
                        <span style="font-size:0.85rem;color:var(--text-gray);">Total Ingresos</span>
                        <span style="font-weight:700;color:#047481;">+$${totalInc.toLocaleString()}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-top:1px solid var(--border);">
                        <span style="font-size:0.85rem;color:var(--text-gray);">Total Egresos</span>
                        <span style="font-weight:700;color:var(--vibrant-red);">-$${totalExp.toLocaleString()}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:0.75rem 0;border-top:2px solid var(--border);margin-top:0.25rem;">
                        <span style="font-weight:700;font-size:1rem;">Balance</span>
                        <span style="font-weight:800;font-size:1.1rem;color:${balance>=0?'#047481':'var(--vibrant-red)'};">${balance>=0?'+':''}$${balance.toLocaleString()}</span>
                    </div>`;
            }
            lucide.createIcons();
        }

        function editFinance(id) {
            const index = state.transactions.findIndex(t => t.id === id);
            if (index === -1) return;
            const t = state.transactions[index];
            if (t.category === 'Venta' || t.category === 'DevoluciÃ³n') {
                alert('Las transacciones automÃ¡ticas no pueden ser editadas directamente.');
                return;
            }
            editingFinanceIndex = index;
            document.getElementById('m_trans_type').value = t.type;
            populateFinanceCategories();
            document.getElementById('m_trans_category').value = t.category;
            document.getElementById('m_trans_desc').value = t.description;
            document.getElementById('m_trans_amount').value = t.amount;
            document.getElementById('m_trans_date').value = t.date;
            openModal('transactionModal');
        }

        function deleteFinance(id) {
            const index = state.transactions.findIndex(t => t.id === id);
            if (index === -1) return;
            const t = state.transactions[index];
            if (t.category === 'Venta' || t.category === 'DevoluciÃ³n') {
                alert('Las transacciones automÃ¡ticas no pueden ser eliminadas directamente.');
                return;
            }
            if (confirm('Â¿Eliminar esta transacciÃ³n?')) {
                state.transactions.splice(index, 1);
                saveState();
                renderFinance();
            }
        }

        function renderSettings() {
            // Cargar datos personales
            if (currentUser) {
                document.getElementById('set_full_name').value = currentUser.user_metadata?.full_name || '';
                document.getElementById('set_business_name').value = currentUser.user_metadata?.business_name || '';
            }

            const list = document.getElementById('categoryList');
            list.innerHTML = '';
            state.settings.categories.forEach(c => {
                list.innerHTML += `<span class="badge" style="background:var(--light-gray); color:var(--deep-blue); border:1px solid var(--border); display:flex; align-items:center; gap:0.5rem; padding:0.6rem 1rem;">${c} <i data-lucide="x" size="14" style="cursor:pointer" onclick="removeCategory('${c}')"></i></span>`;
            });

            const sourceList = document.getElementById('sourceList');
            if (sourceList) {
                sourceList.innerHTML = '';
                const sources = state.settings.sources || [];
                sources.forEach(s => {
                    sourceList.innerHTML += `
                        <span class="badge" style="background: var(--light-gray); color: var(--deep-blue); border: 1px solid var(--border); display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 100px; font-size: 0.85rem; font-weight: 600;">
                            ${s}
                            <i data-lucide="x" style="width:14px; height:14px; cursor:pointer;" onclick="removeSource('${s}')"></i>
                        </span>`;
                });
            }

            const modelList = document.getElementById('modelList');
            modelList.innerHTML = '';
            Object.keys(state.settings.thresholds).forEach(m => {
                modelList.innerHTML += `
                    <span class="badge" style="background:var(--light-gray); 
                    color:var(--deep-blue); border:1px solid var(--border); 
                    display:flex; align-items:center; gap:0.5rem; 
                    padding:0.6rem 1rem;">
                        ${m}
                        <i data-lucide="x" size="14" style="cursor:pointer" 
                           onclick="removeModel('${m}')"></i>
                    </span>`;
            });
            const thresholds = document.getElementById('thresholdSettings');
            thresholds.innerHTML = '';
            Object.keys(state.settings.thresholds).forEach(m => {
                thresholds.innerHTML += `<div class="form-group"><label>${m}</label><input type="number" value="${state.settings.thresholds[m]}" onchange="updateThreshold('${m}', this.value)"></div>`;
            });
            lucide.createIcons();
        }

        function addModel() {
            const name = document.getElementById('newModelName').value.trim();
            if (!name) return;
            if (state.settings.thresholds[name] !== undefined) {
                alert('Este modelo ya existe.');
                return;
            }
            state.settings.thresholds[name] = 5;
            saveState();
            renderSettings();
            document.getElementById('newModelName').value = '';
        }

        function removeModel(name) {
            const enUso = state.inventory.some(i => i.model === name);
            if (enUso) {
                alert(`El modelo "${name}" tiene equipos registrados en inventario y no puede eliminarse.`);
                return;
            }
            delete state.settings.thresholds[name];
            saveState();
            renderSettings();
        }

        function addCategory() {
            const name = document.getElementById('newCategoryName').value.trim();
            if (name && !state.settings.categories.includes(name)) { state.settings.categories.push(name); saveState(); renderSettings(); document.getElementById('newCategoryName').value = ''; }
        }

        function removeCategory(name) {
            const enUso = state.transactions.some(t => t.category === name);
            if (enUso) {
                alert(`La categorÃ­a "${name}" estÃ¡ en uso por transacciones existentes y no puede eliminarse.`);
                return;
            }
            state.settings.categories = state.settings.categories.filter(c => c !== name);
            saveState();
            renderSettings();
        }

        function updateThreshold(model, val) { state.settings.thresholds[model] = parseInt(val); saveState(); }

        function addSource() {
            const name = document.getElementById('newSourceName').value.trim();
            if (!name) return;
            if (!state.settings.sources) state.settings.sources = [];
            if (state.settings.sources.includes(name)) {
                alert('Este canal ya existe.');
                return;
            }
            state.settings.sources.push(name);
            saveState();
            renderSettings();
            document.getElementById('newSourceName').value = '';
        }

        function removeSource(name) {
            const enUso = state.sales.some(s => s.source === name);
            if (enUso) {
                alert(`El canal "${name}" tiene ventas registradas y no puede eliminarse.`);
                return;
            }
            state.settings.sources = (state.settings.sources || []).filter(s => s !== name);
            saveState();
            renderSettings();
        }

        function populateSources() {
            const sources = state.settings.sources || ['WhatsApp', 'Instagram', 'Facebook', 'Referido', 'Tienda FÃ­sica', 'Otro'];
            const select = document.getElementById('m_sale_source');
            const currentVal = select ? select.value : '';
            if (select) {
                select.innerHTML = sources.map(s => `<option value="${s}" ${s === currentVal ? 'selected' : ''}>${s}</option>`).join('');
            }
        }

        async function updatePersonalData() {
            const fullName = document.getElementById('set_full_name').value.trim();
            const businessName = document.getElementById('set_business_name').value.trim();

            if (!fullName || !businessName) {
                alert('Por favor completa todos los campos.');
                return;
            }

            try {
                const { data, error } = await supabaseClient.auth.updateUser({
                    data: { 
                        full_name: fullName,
                        business_name: businessName 
                    }
                });

                if (error) throw error;

                // Actualizar currentUser local con los nuevos datos
                currentUser = data.user;
                
                // Actualizar elementos visuales inmediatos
                const sidebarBiz = document.getElementById('displayBusinessName');
                const welcomeEl = document.getElementById('dashboardWelcome');
                
                if (sidebarBiz) sidebarBiz.innerText = businessName;
                if (welcomeEl) welcomeEl.innerText = `Â¡Bienvenido, ${fullName}!`;

                alert('Â¡Datos actualizados con Ã©xito!');
                lucide.createIcons();
            } catch (err) {
                alert('Error al actualizar datos: ' + err.message);
            }
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
            } else if (status === 'offline') {
                icon.innerHTML = '<i data-lucide="cloud-off" style="color: #EE424E"></i>';
                text.innerText = 'Modo Offline';
            } else if (status === 'error') {
                icon.innerHTML = '<i data-lucide="alert-circle" style="color: #EE424E"></i>';
                text.innerText = 'Error de Sinc.';
            }
            lucide.createIcons();
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

        window.onload = function() {
            initCharts();
            // El loadState se llama desde el onAuthStateChange
        };


