// ── Componente Modal (futura migración) ──────────────────────
// Centraliza la creación y manejo de modales en la aplicación.

function createModal(config) {
    const { id, title, content, onConfirm, confirmText, cancelText } = config;
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>${title}</h3>
                <button onclick="closeModal('${id}')" class="modal-close">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">${content}</div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('${id}')">
                    ${cancelText || 'Cancelar'}
                </button>
                <button class="btn btn-primary" id="${id}_confirm">
                    ${confirmText || 'Confirmar'}
                </button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    document.getElementById(`${id}_confirm`).onclick = () => {
        if (onConfirm) onConfirm();
        closeModal(id);
    };

    lucide.createIcons();
    return overlay;
}
