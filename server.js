# PCFix Backend de Produccion

Backend opcional para operar PCFix en varias computadoras con usuarios, roles, base SQLite/Postgres, auditoria, archivos y WhatsApp Cloud API.

Para produccion en Render se recomienda `src/server-postgres.js` con Supabase o Neon.

## Instalacion

```bash
cd outputs/production/backend
copy .env.example .env
npm install
npm run init
npm start
```

## Produccion con Postgres

Configura:

```env
DATABASE_URL=postgresql://...
ADMIN_EMAIL=admin@pcfix.local
ADMIN_PASSWORD=pon-una-clave-segura
JWT_SECRET=clave-larga-aleatoria
```

Inicia con:

```bash
npm install
node src/server-postgres.js
```

Guia completa:

```text
outputs/production/SUPABASE-POSTGRES.md
```

Credenciales iniciales por defecto:

- Email: `admin@pcfix.local`
- Password: `Cambiar123!`

Cambia `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `JWT_SECRET` antes de usarlo en produccion.

## Roles

- `admin`: administra todo.
- `manager`: opera y archiva registros.
- `technician`: crea/actualiza ordenes, inventario, citas, pagos y archivos.
- `viewer`: solo lectura.

## API principal

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/records/:type`
- `POST /api/records/:type`
- `POST /api/records/:type/:id/archive`
- `POST /api/files/:recordId`
- `GET /api/audit`
- `GET /api/users`
- `POST /api/users`
- `POST /api/users/:id/deactivate`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`
- `POST /api/whatsapp/send`

Tipos permitidos:

`settings`, `client`, `order`, `inventory`, `supplier`, `appointment`, `purchase`, `payment`, `inventoryMovement`, `warrantyClaim`.

## WhatsApp Cloud API

Configura en `.env`:

```env
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=pcfix-webhook-token
```

En Render se configuran en `pcfix-backend > Environment`.
Cuando estan presentes, el frontend envia mensajes por `POST /api/whatsapp/send` y ya no depende de abrir WhatsApp Web para estatus, seguimiento, cotizaciones y proveedores.

Si no envia:

- Verifica que `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` esten en Render.
- Con token temporal, el numero destino debe estar agregado como numero de prueba en Meta.
- Para enviar a clientes reales fuera de la ventana de 24 horas se requieren plantillas aprobadas de WhatsApp.
- Revisa la tabla `whatsapp_messages` o los logs de Render para ver el error exacto de Meta.

Webhook para Meta:

```text
https://tu-dominio.com/api/whatsapp/webhook
```

## Notas de produccion

- Usar HTTPS obligatorio.
- Respaldar `pcfix.sqlite` y `uploads/`.
- Proteger `.env`.
- Cambiar contrasenas iniciales.
- Para produccion real, usar PostgreSQL con `src/server-postgres.js`.
