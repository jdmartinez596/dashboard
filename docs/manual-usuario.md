# Manual de Usuario — Gest Inventary

## Índice

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Dashboard](#2-dashboard)
3. [Inventario](#3-inventario)
4. [Ventas](#4-ventas)
5. [Finanzas](#5-finanzas)
6. [Devoluciones](#6-devoluciones)
7. [Contabilidad](#7-contabilidad)
8. [Configuración](#8-configuración)
9. [Exportación de Reportes](#9-exportación-de-reportes)
10. [Escáner](#10-escáner)

---

## 1. Acceso al Sistema

### Registro
1. Ingresa tu correo electrónico y una contraseña (mín. 8 caracteres, 1 mayúscula, 1 número).
2. Completa los datos de tu negocio.
3. Haz clic en **Registrarse**.

### Inicio de Sesión
1. Ingresa tu correo y contraseña registrados.
2. Haz clic en **Iniciar Sesión**.

> La sesión se mantiene activa aunque cierres el navegador. Para salir, usa **Cerrar Sesión** en el menú lateral.

---

## 2. Dashboard

La pantalla principal muestra:

- **KPIs**: Ventas hoy, ventas del mes, margen promedio, utilidad del mes.
- **Gráfica de Tendencia**: Ventas de los últimos 7 días.
- **Top 10 Modelos**: Los modelos más vendidos.
- **Ingresos vs Egresos**: Comparativa mensual.

> Los datos se actualizan automáticamente cada 5 segundos vía Supabase Realtime.

---

## 3. Inventario

### Agregar Equipo
1. Haz clic en **Equipo +**.
2. Completa: modelo, IMEI/Serial, precio de compra, precio de venta, proveedor.
3. Haz clic en **Guardar**.

### Estados
- **Disponible** — En vitrina, listo para vender.
- **Vendido** — Equipo ya vendido.
- **Garantía** — En garantía con cliente.
- **Baja** — Dado de baja (robo, daño total).

### Acciones
| Botón | Acción |
|-------|--------|
| ✏️ | Editar equipo |
| 🗑️ | Eliminar (solo si está Disponible) |
| 📋 | Copiar serial al portapapeles |

### Filtros
Usa los filtros sobre la tabla por: serial, modelo, estado, proveedor, fechas.

---

## 4. Ventas

### Registrar Venta
1. Haz clic en **Venta +**.
2. Agrega equipos (pueden ser varios por venta).
3. Se calcula automáticamente: subtotal, utilidad por equipo.
4. Selecciona método de pago y monto recibido.
5. Haz clic en **Confirmar Venta**.

### Historial
- Todas las ventas registradas con fecha, cliente, equipos y total.
- Puedes filtrar por fechas.
- Exportar a Excel desde el botón en la esquina.

---

## 5. Finanzas

### Agregar Transacción
1. Selecciona **tipo**: Ingreso o Egreso.
2. Selecciona **categoría** (personalizables en Configuración).
3. Ingresa monto, descripción y fecha.
4. Haz clic en **Guardar**.

### Reportes
- Balance general con total de ingresos, egresos y saldo.
- Desglose por categorías.
- Exportable a Excel.

---

## 6. Devoluciones

### Procesar Devolución
1. Busca la venta original por serial.
2. Selecciona el equipo a devolver.
3. Elige el tipo:
   - **Reingreso a inventario** — El equipo vuelve a Disponible.
   - **Garantía** — Se marca como Garantía.
   - **Baja** — Se da de baja.
4. Haz clic en **Procesar Devolución**.

---

## 7. Contabilidad

### Estado de Resultados (P&G)
- Utilidad Bruta = Ventas Totales - Costo de Ventas.
- Gastos Operativos = Suma de egresos del período.
- Utilidad Neta = Utilidad Bruta - Gastos Operativos.

### Trazabilidad
Cada equipo vendido muestra su utilidad individual, permitiendo auditoría completa.

---

## 8. Configuración

### Categorías de Egresos
Agrega o elimina categorías personalizadas para clasificar tus egresos.

### Datos del Negocio
Actualiza el nombre de tu negocio y la moneda.

### Cuenta
- Ver correo electrónico registrado.
- Cerrar sesión.

---

## 9. Exportación de Reportes

En las vistas de **Inventario**, **Ventas**, **Finanzas** y **Contabilidad** encontrarás un botón de exportación. Los reportes se descargan en formato `.xlsx` compatible con Excel.

### Datos exportados por vista
| Vista | Contenido |
|-------|-----------|
| Inventario | Todos los equipos con estados, precios y proveedores |
| Ventas | Ventas del período con desglose de equipos |
| Finanzas | Balance de ingresos, egresos, saldo y categorías |
| Contabilidad | Estado de resultados completo |

---

## 10. Escáner

### Escáner Láser (USB)
Conecta un escáner de código de barras USB. Los códigos se leerán automáticamente en el campo de búsqueda.

### Escáner por Cámara
1. Haz clic en el ícono 📷 junto al campo de búsqueda.
2. Permite el acceso a la cámara cuando el navegador lo solicite.
3. Enfoca el código QR o de barras.
4. El código se capturará automáticamente.

> ⚠️ La cámara solo funciona sirviendo la app desde un servidor (localhost o HTTPS).
