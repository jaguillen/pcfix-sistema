# PCFix Backend Online

Backend unico para produccion con Node.js, Express y PostgreSQL/Supabase.

No usa SQLite, no usa tabla `records`, no guarda archivos locales y no tiene modo offline.

## Arranque

```bash
npm install
npm start
```

## Variables requeridas

```env
DATABASE_URL=postgresql://...
ADMIN_EMAIL=admin@pcfix.local
ADMIN_PASSWORD=pon-una-clave-segura
JWT_SECRET=clave-larga-aleatoria
SENSITIVE_DATA_KEY=otra-clave-larga-aleatoria
```

El backend crea las tablas profesionales al iniciar y elimina tablas heredadas `records` y `files` si existen.

## Endpoints principales

- `POST /api/auth/login`
- `GET /api/state`
- `GET /api/records/:type`
- `POST /api/records/:type`
- `POST /api/records/:type/:id/archive`
- `POST /api/orders/:id/payments`
- `GET /api/public/orders/:folio?code=CODIGO`
- `POST /api/public/orders/:folio/approval`
- `GET /api/state/revision`
- `GET /api/stability` (requiere rol admin o manager)
- `GET /api/admin/stability`
- `GET /api/admin/analytics`
- `GET /api/admin/integrity`

Tipos permitidos:

`settings`, `client`, `order`, `inventory`, `supplier`, `appointment`, `purchase`, `payment`, `inventoryMovement`, `warrantyClaim`, `auditEntry`.

## Reglas de consistencia

- Clientes, proveedores, ordenes, inventario, compras, pagos y configuracion se leen desde BD.
- Al guardar una compra como `Recibido`, el backend suma inventario y crea movimientos por producto.
- Editar o archivar una compra recibida revierte y recalcula sus efectos dentro de una transaccion.
- Las ordenes bloquean las filas de inventario y rechazan consumos sin existencia suficiente.
- Los pagos actualizan el saldo de la orden en la misma transaccion.
- La API devuelve datos desde las columnas normalizadas y usa `raw_data` solo para extensiones.
- El portal cliente consulta directo a BD por folio con `/api/public/orders/:folio`.
- Todas las respuestas `/api` se entregan con `Cache-Control: no-store`.
- Las consultas y mutaciones se filtran por rol antes de salir de la API.
- Las fotografias se comprimen en el navegador y se guardan directamente en la orden dentro de PostgreSQL.
- El patron o clave de desbloqueo se cifra en reposo y su consulta queda auditada.
