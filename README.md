# Partners Bold | Dashboard de Gestión

Sistema de gestión integral para puntos de venta de equipos celulares. Administra inventario, ventas, finanzas, devoluciones y genera reportes contables con trazabilidad completa.

## Características

- **Inventario** — Control de equipos por serial/IMEI con estados (Disponible, Vendido, Garantía, Baja)
- **Ventas** — Registro multi-dispositivo por venta, cálculo automático de utilidad y margen
- **Finanzas** — Transacciones de ingresos/egresos con categorías personalizables
- **Devoluciones** — Gestión de devoluciones con reingreso a inventario, garantía o baja
- **Contabilidad** — Estado de resultados P&G, trazabilidad completa por equipo
- **Dashboard** — KPIs, gráficas de tendencia, barras de stock por modelo
- **Exportación** — Reportes en Excel (XLSX) con SheetJS
- **Escáner** — Soporte para escáner láser USB y cámara (códigos de barras/QR)
- **Sincronización** — Tiempo real vía Supabase Realtime, modo offline con localStorage

## Tecnologías

- Vanilla JavaScript (ES6+)
- Supabase (Auth, Database, Realtime)
- Chart.js
- SheetJS (XLSX)
- html5-qrcode

## Estructura del Proyecto

```
partners-bold/
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── js/           # Módulos de la aplicación
│   └── img/logo.svg
├── components/       # Componentes (futura migración)
├── config/           # Configuración de Supabase
├── docs/             # Documentación
└── backups/          # Backups exportados
```

## Instalación

1. Clona el repositorio
2. Abre `index.html` en tu navegador o súbelo a un hosting estático
3. Regístrate con tu correo y contraseña

> ⚠️ La cámara requiere servir el archivo desde un servidor (localhost o hosting HTTPS).

## Licencia

MIT
