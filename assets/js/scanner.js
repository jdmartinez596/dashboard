let html5QrCode = null;
let currentScannerTarget = null;
let currentCameraId = null;
let cameras = [];
let scannerActive = false;
let contrastActive = false;

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
            // 38% del ancho: captura códigos altos y bajos
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
        let msg = 'Error al iniciar cámara.';
        
        if (window.location.protocol === 'file:') {
            msg = 'La cámara está bloqueada en archivos locales por seguridad del navegador.';
        } else if (err.name === 'NotAllowedError') {
            msg = 'Permiso de cámara denegado. Permite el acceso en configuración.';
        } else if (err.name === 'NotFoundError') {
            msg = 'No se encontró ninguna cámara.';
        } else if (err.name === 'NotReadableError') {
            msg = 'La cámara está en uso por otra app.';
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
                Para usar la cámara, abre el dashboard desde un servidor (localhost) o súbelo a un hosting.<br>
                <b>Mientras tanto, puedes usar la opción de "Subir Foto".</b>
            </p>
        </div>`;
    lucide.createIcons();
}

// Función llamada al detectar — inserción INMEDIATA sin confirmación
function onBarcodeDetected(decodedText) {
    if (!scannerActive) return;
    scannerActive = false;

    // Feedback auditivo y táctil
    playSuccessBeep();

    const cleaned = cleanBarcode(decodedText);

    closeScanner();

    setTimeout(() => {
        // Multi-device scanner target: sale-scanner-{id}
        if (currentScannerTarget && currentScannerTarget.startsWith('sale-scanner-')) {
            const id = currentScannerTarget.replace('sale-scanner-', '');
            const select = document.getElementById(`sale-serial-${id}`);
            if (select) {
                const opt = [...select.options].find(o => o.value === cleaned);
                if (opt) {
                    select.value = cleaned;
                    updateSaleTotal();
                } else {
                    alert(`Serial "${cleaned}" no encontrado en inventario disponible.`);
                }
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

    // Detener cámara en segundo plano sin bloquear UI
    if (html5QrCode) {
        const instance = html5QrCode;
        html5QrCode = null;
        setTimeout(async () => {
            try {
                if (instance.isScanning) await instance.stop();
                instance.clear();
            } catch(e) {}
            // Limpiar reader para próxima apertura
            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '';
        }, 100);
    }
}

// Alias para el botón X y "Entrada Manual" del modal
function stopScanner() {
    closeScanner();
}

async function switchCamera() {
    if (!cameras || cameras.length < 2) {
        alert('Solo se detectó una cámara.');
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

function toggleContrast() {
    const video = document.querySelector('#reader video');
    const btn = document.getElementById('contrastBtn');
    if (!video) {
        alert('Inicia la cámara primero.');
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

    // Agregar animación de spin si no existe
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
        // Pausar cámara en vivo mientras procesa la imagen
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

        // Éxito — insertar directamente
        closeScanner();
        setTimeout(() => {
            if (currentScannerTarget && currentScannerTarget.startsWith('sale-scanner-')) {
                const id = currentScannerTarget.replace('sale-scanner-', '');
                const select = document.getElementById(`sale-serial-${id}`);
                if (select) {
                    const opt = [...select.options].find(o => o.value === cleaned);
                    if (opt) {
                        select.value = cleaned;
                        updateSaleTotal();
                    } else {
                        alert(`Serial "${cleaned}" no encontrado en inventario disponible.`);
                    }
                }
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

        // No se detectó código — mostrar opciones
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
                ">No se detectó ningún código</p>
                <p style="
                    font-size: 0.8rem;
                    color: var(--text-gray);
                    margin: 0;
                    text-align: center;
                    line-height: 1.5;
                ">
                    Intenta con mejor iluminación,<br>
                    más cerca o activa el contraste.
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
                        <i data-lucide="camera"></i> Usar cámara
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

// === Laser Scanner PC (USB Keyboard Wedge) ===
function toggleLaserBar() {
    const bar = document.getElementById('laserBar');
    if (!bar) return;
    const visible = bar.style.display === 'flex';
    bar.style.display = visible ? 'none' : 'flex';
    if (!visible) {
        setTimeout(() => document.getElementById('laserInput').focus(), 100);
    }
}

function hideLaserBar() {
    const bar = document.getElementById('laserBar');
    if (bar) bar.style.display = 'none';
}

(function initLaserScanner() {
    let laserBuffer = '';
    let laserTimer = null;
    const LASER_THRESHOLD_MS = 80;

    document.addEventListener('keydown', function(e) {
        const active = document.activeElement;
        const isLaserInput = active && active.id === 'laserInput';
        const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') && !isLaserInput;
        if (isTyping) return;

        if (e.key === 'Enter' && laserBuffer.length > 3) {
            handleLaserScan(laserBuffer.trim());
            laserBuffer = '';
            clearTimeout(laserTimer);
            return;
        }

        if (e.key.length === 1) {
            laserBuffer += e.key;
            clearTimeout(laserTimer);
            laserTimer = setTimeout(() => { laserBuffer = ''; }, LASER_THRESHOLD_MS * 20);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const li = document.getElementById('laserInput');
        if (!li) return;
        li.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLaserScan(li.value.trim());
                li.value = '';
            }
        });
    });
})();

function handleLaserScan(code) {
    if (!code) return;
    const target = document.getElementById('laserTarget');
    const mode = target ? target.value : 'search';

    if (mode === 'inventory') {
        openModal('inventoryModal');
        const serialInput = document.getElementById('m_inv_serial');
        if (serialInput) { serialInput.value = code; serialInput.dispatchEvent(new Event('input')); }
        showToast(`Serial ${code} cargado en inventario`, 'success');
    } else if (mode === 'sale') {
        const firstSelect = document.querySelector('#saleDeviceList [id^="sale-serial-"]');
        if (firstSelect) {
            const opt = [...firstSelect.options].find(o => o.value === code);
            if (opt) { firstSelect.value = code; updateSaleTotal(); showToast(`Serial ${code} seleccionado`, 'success'); }
            else showToast(`Serial ${code} no encontrado en disponibles`, 'error');
        } else {
            openModal('saleModal');
            showToast('Abre una venta primero para asignar el serial', 'info');
        }
    } else {
        const searchInv = document.getElementById('searchInventory');
        const searchSale = document.getElementById('searchSales');
        const view = document.querySelector('.view.active');
        if (view && view.id === 'sales' && searchSale) {
            searchSale.value = code; renderSales();
        } else if (searchInv) {
            searchInv.value = code; renderInventory();
        }
        showToast(`Buscando: ${code}`, 'success');
    }
}
