# Migracion PCFix a Supabase Postgres

## 1. Crear base en Supabase

1. Entra a https://supabase.com
2. Crea un proyecto nuevo.
3. Ve a `Project Settings > Database`.
4. Copia el connection string de Postgres.

Usa preferentemente el connection string del pooler si Render no puede conectar por IPv6.

Formato esperado:

```text
postgresql://USUARIO:PASSWORD@HOST:PUERTO/postgres
```

## 2. Configurar Render

En Render abre `pcfix-backend > Environment` y agrega:

```text
DATABASE_URL=postgresql://...
ADMIN_EMAIL=admin@pcfix.local
ADMIN_PASSWORD=pon-una-clave-segura
JWT_SECRET=clave-larga-aleatoria
```

Opcional para WhatsApp:

```text
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=pcfix-webhook-token
```

Con esas variables el sistema envia WhatsApp automaticamente desde el backend al:

- Cambiar estatus de una orden.
- Enviar seguimiento.
- Enviar cotizacion al cliente.
- Solicitar resena.
- Cotizar piezas con proveedores.

Si faltan esas variables o Meta rechaza el envio, el sistema abre WhatsApp manual como respaldo.

## 3. Cambiar Blueprint

El `render.yaml` ya quedo apuntando a:

```text
outputs/production/backend
node src/server-postgres.js
```

Render hara:

```text
npm install
node src/server-postgres.js
```

## 4. Desplegar

1. Sube los cambios a GitHub.
2. En Render ejecuta `Manual Deploy > Deploy latest commit` en `pcfix-backend`.
3. Abre:

```text
https://pcfix-backend.onrender.com/api/health
```

Debe responder:

```json
{"ok":true,"service":"PCFix backend","mode":"postgres"}
```

## 5. Subir datos actuales

Cuando el backend Postgres ya este vivo:

1. Abre `pcfix-sistema`.
2. Ve a `Admin > Conexion backend`.
3. Conecta con:

```text
https://pcfix-backend.onrender.com
```

4. Si tu navegador tiene los datos buenos, presiona `Subir datos locales`.
5. Activa `Modo servidor automatico`.

## 6. Importante

No uses `Subir datos locales` si tu pantalla esta vacia.
Primero recupera datos desde un respaldo o desde otro navegador que si tenga la informacion.

Con Postgres, los datos ya no dependen del filesystem temporal de Render.
