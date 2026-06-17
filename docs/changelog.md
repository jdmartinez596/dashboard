# Changelog

## 1.2.0 (Junio 2026)

### Mejoras
- Reorganización completa del proyecto en estructura `gest-inventary/`
- Separación de HTML, CSS y JS en archivos independientes
- Creación de módulos especializados por funcionalidad
- Nuevos componentes: Sidebar, Modal, Charts
- Documentación de usuario y changelog

### Seguridad
- Escape de salida HTML en todas las vistas
- Validación robusta de contraseñas en frontend
- Rate limiting en intentos de autenticación
- Bloqueo temporal de cuenta tras múltiples fallos
- CSP (Content Security Policy) mediante meta tag

### Nuevo
- Función `escapeHtml()` para prevenir XSS
- Configuración centralizada en `config/supabase.js`
- Módulo `utils.js` con helpers reutilizables
- Placeholder para asistente IA (`assistant.js`)
- Exportación de reportes contables a Excel
- Escáner QR/Barras (láser + cámara)

### Técnico
- Migración a Supabase JavaScript SDK v2
- Sincronización en tiempo real con Realtime
- Manejo de concurrencia en inventario (último write wins)
- Caché offline con validación de estado del servidor
- Componentes reutilizables en carpeta `components/`
- Logging estructurado con `console.log` etiquetado

---

## 1.1.0 (Mayo 2026)

- Módulo de Contabilidad con estado de resultados P&G
- Trazabilidad individual de utilidad por equipo vendido
- Cálculo automático de margen y utilidad por venta
- Mejora en interfaz de devoluciones con reingreso a inventario
- Filtros por fechas en inventario, ventas y finanzas
- Exportación a Excel desde todas las vistas principales

## 1.0.0 (Abril 2026)

- Lanzamiento inicial del sistema
- Autenticación con Supabase Auth
- Gestión de inventario con estados y seriales
- Registro de ventas multi-dispositivo
- Control de finanzas con ingresos/egresos
- Módulo de devoluciones con 3 modalidades
- Dashboard con KPIs y gráficas Chart.js
- Escáner de códigos de barras (láser + cámara)
- Diseño responsive con tema oscuro
