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
```

El backend crea las tablas profesionales al iniciar y elimina tablas heredadas `records` y `files` si existen.

## Endpoints principales

- `POST /api/auth/login`
- `GET /api/state`
- `GET /api/records/:type`
- `POST /api/records/:type`
- `POST /api/records/:type/:id/archive`
- `GET /api/public/orders/:folio`
- `GET /api/stability`
- `GET /api/admin/stability`
- `GET /api/admin/analytics`
- `GET /api/admin/integrity`

Tipos permitidos:

`settings`, `client`, `order`, `inventory`, `supplier`, `appointment`, `purchase`, `payment`, `inventoryMovement`, `warrantyClaim`, `auditEntry`.

## Reglas de consistencia

- Clientes, proveedores, ordenes, inventario, compras, pagos y configuracion se leen desde BD.
- Al guardar una compra como `Recibido`, el backend suma inventario y crea movimiento de forma idempotente.
- El movimiento `mov_purchase_<id>` evita duplicar stock si se vuelve a guardar la misma compra.
- El portal cliente consulta directo a BD por folio con `/api/public/orders/:folio`.
- Todas las respuestas `/api` se entregan con `Cache-Control: no-store`.
