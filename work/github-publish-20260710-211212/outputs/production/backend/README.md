# PCFix Backend de Produccion

Backend opcional para operar PCFix en varias computadoras con usuarios, roles, base SQLite, auditoria, archivos y WhatsApp Cloud API.

## Instalacion

```bash
cd outputs/production/backend
copy .env.example .env
npm install
npm run init
npm start
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

Webhook para Meta:

```text
https://tu-dominio.com/api/whatsapp/webhook
```

## Notas de produccion

- Usar HTTPS obligatorio.
- Respaldar `pcfix.sqlite` y `uploads/`.
- Proteger `.env`.
- Cambiar contrasenas iniciales.
- Para alto volumen, migrar de SQLite a PostgreSQL.
