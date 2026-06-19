// -- SEGURIDAD: Validar fortaleza de contraseña -------------------
function validatePassword(password) {
    const errors = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
    if (!/[0-9]/.test(password)) errors.push('Al menos un número');
    return errors.length ? errors.join(', ') : null;
}

// -- SEGURIDAD: Rate limiting para login --------------------------
const LOGIN_ATTEMPTS = { count: 0, lastAttempt: 0, maxPerMinute: 5 };
function checkLoginRateLimit() {
    const now = Date.now();
    if (now - LOGIN_ATTEMPTS.lastAttempt > 60000) LOGIN_ATTEMPTS.count = 0;
    LOGIN_ATTEMPTS.count++;
    if (LOGIN_ATTEMPTS.count > LOGIN_ATTEMPTS.maxPerMinute) {
        const wait = Math.ceil((LOGIN_ATTEMPTS.lastAttempt + 60000 - now) / 1000);
        if (wait > 0) return `Demasiados intentos. Espera ${wait} segundos.`;
    }
    LOGIN_ATTEMPTS.lastAttempt = now;
    return null;
}

// -- SEGURIDAD: Protección contra fuerza bruta --------------------
let loginAttempts = 0;
let lockoutUntil = null;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// -- SEGURIDAD: Código de invitación para registro ----------------
const INVITE_CODE = 'PARTNERS2026';

// Auth UI Toggle
const toggleLink = document.getElementById('toggleAuth');
if (toggleLink) toggleLink.onclick = (e) => {
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
        desc.innerText = 'Regístrate para empezar a gestionar tu inventario.';
        registerFields.style.display = 'block';
        document.getElementById('inviteCodeGroup').style.display = 'block';
        document.getElementById('auth_business').required = true;
        document.getElementById('auth_full_name').required = true;
        btn.innerHTML = '<i data-lucide="user-plus"></i> Registrar Negocio';
        toggleText.innerText = '¿Ya tienes cuenta?';
        toggleLink.innerText = 'Iniciar Sesión';
    } else {
        title.innerText = 'Bienvenido';
        desc.innerText = 'Ingresa tus credenciales para acceder a tu panel personal.';
        registerFields.style.display = 'none';
        document.getElementById('inviteCodeGroup').style.display = 'none';
        document.getElementById('auth_business').required = false;
        document.getElementById('auth_full_name').required = false;
        btn.innerHTML = '<i data-lucide="log-in"></i> Acceder al Panel';
        toggleText.innerText = '¿No tienes cuenta?';
        toggleLink.innerText = 'Registrarse';
    }
    lucide.createIcons();
};

// Auth Listeners
const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth_email').value;
    const password = document.getElementById('auth_password').value;
    const business = document.getElementById('auth_business').value;
    const fullName = document.getElementById('auth_full_name').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('authBtn');

    try {
        // -- SEGURIDAD: Verificar bloqueo por fuerza bruta --------
        if (lockoutUntil && new Date() < lockoutUntil) {
            const remaining = Math.ceil(
                (lockoutUntil - new Date()) / 60000
            );
            throw new Error(
                `Demasiados intentos fallidos. ` +
                `Espera ${remaining} minuto${remaining > 1 ? 's' : ''}.`
            );
        }

        // -- SEGURIDAD: Rate limiting -----------------------------
        const rateMsg = checkLoginRateLimit();
        if (rateMsg) { throw new Error(rateMsg); }

        // -- SEGURIDAD: Validar contraseña en registro ------------
        if (isRegisterMode) {
            const pwError = validatePassword(password);
            if (pwError) { throw new Error('Contraseña débil: ' + pwError); }
        }

        // -- SEGURIDAD: Validar código de invitación --------------
        if (isRegisterMode) {
            const code = document.getElementById('auth_invite_code')?.value?.trim();
            if (code !== INVITE_CODE) {
                throw new Error(
                    'Código de acceso incorrecto. ' +
                    'Contacta al administrador.'
                );
            }
        }

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
                // Logueado automáticamente tras registro (si el email no requiere confirmación)
                console.log('Registered and logged in');
            } else {
                alert('¡Registro exitoso! Por favor verifica tu correo para activar tu cuenta (o inicia sesión si la verificación está desactivada).');
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

            if (error) {
                // -- SEGURIDAD: Contar intentos fallidos -----------
                loginAttempts++;
                if (loginAttempts >= MAX_ATTEMPTS) {
                    lockoutUntil = new Date(
                        Date.now() + LOCKOUT_MINUTES * 60 * 1000
                    );
                    loginAttempts = 0;
                    throw new Error(
                        `Cuenta bloqueada por ${LOCKOUT_MINUTES} minutos ` +
                        `por múltiples intentos fallidos.`
                    );
                } else {
                    const remaining = MAX_ATTEMPTS - loginAttempts;
                    throw new Error(
                        `Credenciales incorrectas. ` +
                        `${remaining} intento${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`
                    );
                }
            }

            // Login exitoso — resetear contador
            loginAttempts = 0;
            lockoutUntil = null;
        }
    } catch (err) {
        console.error('Auth error:', err);
        errorEl.innerText = 'Error: ' + (err.message || 'Credenciales inválidas.');
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

// Auth listeners moved to app.js (after loadState is defined)
// to prevent ReferenceError from INITIAL_SESSION firing before loadState exists.
