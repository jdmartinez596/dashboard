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
