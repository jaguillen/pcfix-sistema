# PCFix Comitan - Repo limpio

Frontend limpio conectado directo a backend/Postgres. No hay modo offline ni almacenamiento local de datos de negocio.

Version frontend:

`pcfix-rebuild-bd-directa-manual-20260715-02`

## Que subir a GitHub

Sube TODO el contenido de esta carpeta como raiz del repositorio.

Incluye:

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `manifest.webmanifest`
- `assets/`
- `backend/`
- `render.yaml`
- `supabase-crear-tablas-profesionales.sql`

No incluye `.env` real.

## Render

El `render.yaml` crea:

- `pcfix-backend`: backend Node/Postgres desde `backend/`.
- `pcfix-sistema`: frontend static desde la raiz.

Variables necesarias en backend:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`

## Verificar frontend correcto

En consola del navegador:

```js
window.PCFIX_FRONTEND_VERSION
```

Debe devolver:

```txt
pcfix-rebuild-bd-directa-manual-20260715-02
```

Si la version no coincide, el hosting sigue sirviendo una compilacion anterior.

## Verificar backend correcto

Abre `/api/health` y confirma:

```txt
pcfix-backend-bd-directa-20260715-03
```

Abre `/api/stability` y compara `totals.purchase` contra Supabase:

```sql
select count(*) from purchases where archived = false;
```
