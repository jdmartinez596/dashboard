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
