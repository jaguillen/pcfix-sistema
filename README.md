# PCFix Comitan - Repo limpio

Frontend limpio conectado directo a backend/Postgres. No hay modo offline ni almacenamiento local de datos de negocio.

Version frontend:

`pcfix-premium-operativo-20260716-01`

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
pcfix-premium-operativo-20260716-01
```

Si la version no coincide, el hosting sigue sirviendo una compilacion anterior.

## Verificar backend correcto

Abre `/api/health` y confirma:

```txt
pcfix-backend-premium-operativo-20260716-01
```

Abre `/api/stability` y compara `totals.purchase` contra Supabase:
En `purchaseSource` veras la tabla exacta consultada, conteos y folios visibles para el backend.

```sql
select count(*) from purchases where archived = false;
```

## Mejoras operativas incluidas

- Las columnas profesionales de PostgreSQL son la fuente de verdad; `raw_data` solo conserva campos complementarios.
- Ordenes, compras, inventario y pagos usan transacciones y bloqueos para evitar guardados parciales.
- Una refaccion no puede dejar stock negativo.
- Editar o archivar una compra recibida reconcilia sus movimientos sin duplicar inventario.
- Control de concurrencia: avisa cuando otra persona modifico el registro antes de guardar.
- Prioridad, fecha prometida, autorizacion, costo interno, ciclo de reparacion y alertas de atraso.
- Pagos y saldo de orden se registran en una sola operacion atomica.
- Evidencias fotograficas optimizadas antes de enviarse.
- Actualizacion automatica desde BD al volver a la ventana y cada 45 segundos cuando no hay formularios en uso.
