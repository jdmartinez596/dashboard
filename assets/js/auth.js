// -- SEGURIDAD: Validar fortaleza de contraseña -------------------
function validatePassword(password) {
    const errors = [];
    if (password.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
    if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
    if (!/[0-9]/.test(password)) errors.push('Al menos un número');
    return errors.length ? errors.join(', ') : null;
}

// -- SEGURIDAD: Código de invitación para registro (validado del lado servidor) ----------------
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
        // -- SEGURIDAD: Validar contraseña en registro ------------
        if (isRegisterMode) {
            const pwError = validatePassword(password);
            if (pwError) { throw new Error('Contraseña débil: ' + pwError); }
        }

        // -- SEGURIDAD: Validar código de invitación (client-side, el servidor también valida) --
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
                throw new Error('Credenciales incorrectas.');
            }
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
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {
        console.warn('Error en signOut, forzando limpieza local:', e);
        currentUser = null;
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('sb-') || k.startsWith(LOCAL_STORAGE_KEY)) localStorage.removeItem(k);
        });
        document.getElementById('loginView').style.display = 'flex';
        document.getElementById('appView').style.display = 'none';
    }
}

// Auth listeners moved to app.js (after loadState is defined)
// to prevent ReferenceError from INITIAL_SESSION firing before loadState exists.
