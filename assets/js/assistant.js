// ── Asistente IA ──────────────────────────────────────────────
const AI_API_KEY = window.SECRETS?.GEMINI_API_KEY || '';

async function sendAIMessage() {
    if (!AI_API_KEY || AI_API_KEY === 'tu-api-key-aqui') {
        addAIMessage('bot',
            '⚠️ API Key no configurada. ' +
            'Agrega tu key en config/secrets.js'
        );
        return;
    }
    // ... resto del código igual
}

console.log('Asistente IA — módulo cargado');
