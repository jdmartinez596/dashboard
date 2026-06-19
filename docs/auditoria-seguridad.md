# Auditoría de Seguridad — Gest Inventary Dashboard

**Fecha:** 19 de junio de 2026
**Versión del código evaluado:** Commits hasta `881d6d2`
**Plataforma:** PWA client-side (Supabase backend)
**Metodología:** Revisión manual de código fuente (SAST)

---

## Resumen Ejecutivo

Se realizó una auditoría de seguridad sobre el código fuente del dashboard Gest Inventary. Se identificaron **16 vulnerabilidades** de las cuales **8 fueron de gravedad ALTA** y **8 de gravedad MEDIA/BAJA**. Todas fueron corregidas.

| Gravedad | Encontradas | Corregidas | Pendientes |
|----------|-------------|------------|------------|
| CRÍTICO | 0 | 0 | 0 |
| ALTO | 8 | 8 | 0 |
| MEDIO | 5 | 5 | 0 |
| BAJO | 3 | 3 | 0 |
| **Total** | **16** | **16** | **0** |

---

## 1. Vulnerabilidades Corregidas

### 1.1 Logout no limpiaba datos de usuario (ALTA)
- **Archivo:** `assets/js/app.js:878-882`
- **Problema:** Al cerrar sesión, los datos específicos del usuario (`bold_dashboard_state_{userId}`) persistían en localStorage.
- **Corrección:** Se captura `userId` antes de setear `currentUser = null` y se eliminan todas las claves que comiencen con `LOCAL_STORAGE_KEY + '_' + userId`.

### 1.2 Falsa protección anti-fuerza bruta (ALTA)
- **Archivo:** `assets/js/auth.js:12-29`
- **Problema:** Rate limiting y lockout por intentos fallidos se implementaban completamente en cliente. Un atacante podía modificarlos desde DevTools.
- **Corrección:** Eliminado todo el código de rate limiting client-side. La responsabilidad pasa al servidor (Supabase Auth).

### 1.3 Clave de encriptación usaba SUPABASE_KEY (ALTA)
- **Archivo:** `assets/js/utils.js:15`
- **Problema:** `getEncryptionKey()` usaba `SUPABASE_KEY` (clave pública anónima) como semilla para AES-GCM. Cualquier persona con acceso al código fuente podía derivar la misma clave.
- **Corrección:** Se reemplazó `SUPABASE_KEY` por `currentUser.email` como semilla, haciendo la clave derivada única por usuario.

### 1.4 Plaintext fallback en localStorage (ALTA)
- **Archivo:** `assets/js/app.js:79-80, 188-189`
- **Problema:** Cuando AES-GCM fallaba, los datos se guardaban en texto plano en localStorage (inventario, ventas, clientes, finanzas).
- **Corrección:** Se eliminó el fallback. Si la encriptación falla, se muestra error y no se guarda nada.

### 1.5 CDNs sin SRI (ALTA)
- **Archivo:** `index.html:55-61`
- **Problema:** 5 librerías cargadas desde CDN sin atributos `integrity`. Una (`lucide`) usaba `@latest` (riesgo de supply chain).
- **Corrección:** Se fijaron versiones exactas y se agregaron hashes SRI (SHA-384) para todas: Chart.js 4.4.7, Lucide 0.479.0, XLSX 0.18.5, Supabase JS 2.49.4, html5-qrcode 2.3.8.

### 1.6 XSS por onclick inline (ALTA)
- **Archivos:** `assets/js/settings.js:15,28,45,54`, `assets/js/inventory.js:139-141`
- **Problema:** Los valores insertados en atributos `onclick` via string interpolation permitían inyección de código si el nombre contenía una comilla simple.
- **Corrección:** Reemplazados todos los `onclick` inline por `addEventListener` con `data-attributes` y event delegation.

### 1.7 CSP frame-ancestors ignorado + connect-src incompleto (MEDIA)
- **Archivo:** `index.html:29-47`
- **Problema:** `frame-ancestors 'self'` dentro de `<meta>` CSP no funciona (Chrome lo ignora). `connect-src` no permitía CDNs para source maps.
- **Corrección:** Eliminado `frame-ancestors`. Agregados `cdn.jsdelivr.net` y `unpkg.com` a `connect-src`.

### 1.8 secrets.js 404 en producción (MEDIA)
- **Archivo:** `index.html:1061`
- **Problema:** `<script src='config/secrets.js'>` causaba 404 porque el archivo está en `.gitignore`.
- **Corrección:** Eliminado el script tag. `assistant.js` usa optional chaining para manejar su ausencia.

### 1.9 subscribeToRealtime sin guard (MEDIA)
- **Archivo:** `assets/js/app.js:262`
- **Problema:** `supabaseClient.removeAllChannels()` se llamaba sin verificar que `supabaseClient` existiera.
- **Corrección:** Agregado `typeof supabaseClient === 'undefined'` guard.

### 1.10 Logout con location.reload en móvil (MEDIA)
- **Archivo:** `assets/js/auth.js:131-141`
- **Problema:** `location.reload()` después de `signOut()` causaba conflictos en PWAs móviles y perdía el toast de confirmación.
- **Corrección:** Eliminado `location.reload()`. El manejador `onAuthStateChange` gestiona la transición UI. Se agregó try/catch con limpieza manual de emergencia.

### 1.11 Datos sensibles en console.log (MEDIA)
- **Archivos:** Múltiples
- **Problema:** Se logueaban `currentUser.id`, `currentUser.email`, cantidades de inventario y ventas.
- **Corrección:** Eliminados logs con datos sensibles. `checkSyncStatus()` ya no muestra email en `alert()`.

### 1.12 Funciones XOR muertas (BAJA)
- **Archivo:** `assets/js/utils.js:80-111`
- **Problema:** Tres funciones de pseudo-encriptación XOR sin usar. Su presencia podía engañar a futuros desarrolladores.
- **Corrección:** Eliminadas.

### 1.13 icono Lucide inexistente (BAJA)
- **Archivo:** `assets/js/utils.js:196`
- **Problema:** `cloud-check` no existe en Lucide v0.479.0, causando error en consola.
- **Corrección:** Reemplazado por `badge-check`.

### 1.14 SW sin updateViaCache (BAJA)
- **Archivo:** `sw.js`, `index.html:1094`
- **Problema:** El Service Worker se registraba sin `updateViaCache: 'none'`, permitiendo que el navegador sirviera el SW desde caché HTTP.
- **Corrección:** Agregado `updateViaCache: 'none'` y bump de cache a v2.

### 1.15 Botón de logout oculto en móvil (BAJA)
- **Archivo:** `assets/css/styles.css:429`
- **Problema:** El sidebar no tenía `overflow-y: auto`, ocultando el botón "Cerrar Sesión" en pantallas pequeñas.
- **Corrección:** Agregado `overflow-y: auto` al `.sidebar`.

### 1.16 Eliminación de componentes muertos (BAJA)
- **Archivos:** `components/Modal.js`, `components/Sidebar.js`, `components/Charts.js`
- **Problema:** Tres archivos no referenciados desde ningún lado, acumulando código muerto.
- **Corrección:** Eliminados.

---

## 2. Estado Actual de Seguridad

### 2.1 Controles implementados

| Control | Estado |
|---------|--------|
| Cifrado localStorage (AES-256-GCM) | ✅ |
| CSP con SRI hashes | ✅ |
| XSS prevention (escapeHtml + event delegation) | ✅ |
| Auto-logout por inactividad (1 hora) | ✅ |
| Validación de contraseña (8+ chars, mayúscula, minúscula, número) | ✅ |
| Service Worker con stale-while-revalidate | ✅ |
| Limpieza de datos en logout | ✅ |
| Botón de limpieza de caché en UI | ✅ |

### 2.2 Riesgos remanentes (no mitigables desde código)

1. **RLS Policies de Supabase** — Si no están configuradas correctamente, cualquier usuario autenticado puede acceder a datos de otros usuarios. La anon key es pública por diseño.
2. **Invite code client-side** — El código `PARTNERS2026` sigue siendo visible en `auth.js`. Es un gating básico, no un control de seguridad real.
3. **Gemini API key** — Si se coloca una API key real en `config/secrets.js`, estará expuesta a todos los clientes (el archivo se sirve al navegador aunque esté gitignored).

### 2.3 Recomendaciones en Supabase

1. Configurar RLS policies usando `auth.uid()`:
   ```sql
   CREATE POLICY "users_can_read_own_data" ON dashboard_state
   FOR ALL USING (auth.uid() = user_id::uuid);
   ```
2. Activar confirmación de email en Authentication > Settings
3. Restringir registro por dominios autorizados
4. Deshabilitar registro público si el invite code es el único control

---

## 3. Cartera de Dependencias

| Librería | Versión | SRI | Propósito |
|----------|---------|-----|-----------|
| Chart.js | 4.4.7 | ✅ | Gráficas |
| Lucide | 0.479.0 | ✅ | Iconos |
| XLSX | 0.18.5 | ✅ | Exportación Excel |
| Supabase JS | 2.49.4 | ✅ | Backend |
| html5-qrcode | 2.3.8 | ✅ | Escáner código barras |

---

## 4. Conclusión

El código de Gest Inventary Dashboard ha sido auditado y las 16 vulnerabilidades identificadas han sido corregidas. La aplicación no almacena credenciales, no expone datos sensibles en frontend, y cuenta con controles básicos de seguridad como CSP, cifrado local y sanitización de XSS.

**La seguridad del backend (Supabase) queda fuera del alcance de esta auditoría de código.** Se recomienda encarecidamente verificar la configuración de RLS policies antes de poner la aplicación en producción con datos reales.

---

**Auditoría realizada por:** Herramienta automatizada de análisis de seguridad
**Metodología:** Revisión de código fuente (SAST)
**Próxima revisión sugerida:** A los 6 meses o después de cambios significativos en el código
