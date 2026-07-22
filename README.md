# PCFix Comitan - Repo limpio

Frontend limpio conectado directo a backend/Postgres. No hay modo offline ni almacenamiento local de datos de negocio.

Version frontend:

`pcfix-flujo-estatus-20260722-10`

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
- `SENSITIVE_DATA_KEY`

`CORS_ORIGIN` debe contener la URL real del frontend.

## Verificar frontend correcto

En consola del navegador:

```js
window.PCFIX_FRONTEND_VERSION
```

Debe devolver:

```txt
pcfix-flujo-estatus-20260722-10
```

Si la version no coincide, el hosting sigue sirviendo una compilacion anterior.

## Verificar backend correcto

Abre `/api/health` y confirma:

```txt
pcfix-backend-fotos-directas-20260716-09
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
- Ingresos, cobros, cartera y margen se calculan por separado y solo las ordenes entregadas cuentan como venta realizada.
- La sincronizacion periodica consulta primero una revision ligera y descarga el estado completo solo cuando hay cambios.
- Cada cambio de estatus abre un flujo unico para registrar pruebas funcionales, observaciones y evidencia fotografica antes de guardar en PostgreSQL.
- Los estados Listo y Entregado exigen completar las pruebas de entrega; al confirmar se prepara el aviso de WhatsApp con el nuevo estatus y la liga segura del portal.

## Seguridad y calidad

- Portal publico protegido por folio o WhatsApp mas codigo de seguimiento; el enlace enviado al cliente ya incluye el codigo.
- Datos internos filtrados por rol y credenciales de desbloqueo cifradas, auditadas y eliminadas al cerrar la orden.
- RLS habilitado y acceso directo de los roles publicos de Supabase revocado solo en las tablas de PCFix.
- Fotografias comprimidas a 1280 px y guardadas directamente dentro de la orden en PostgreSQL, sin depender de Storage.
- Login protegido contra fallos de PostgreSQL y CORS habilitado para los dos dominios de despliegue PCFix en Render.
- Aprobacion o rechazo digital del presupuesto con trazabilidad de fecha, cliente y sesion.
- Checklist de recepcion y control final; una orden no puede pasar a Listo o Entregado con pruebas pendientes.
- Etiqueta imprimible por orden, historial por cliente, calidad de refacciones y trazabilidad por lote/serie/proveedor.
- Pruebas automaticas y workflow de GitHub Actions incluidos en `.github/workflows/quality.yml`.

## Identidad visual y portal

- Seguimiento con seis etapas reales: 17%, 33%, 50%, 67%, 83% y 100% al entregar.
- El estado cancelado se presenta como interrupcion y no como avance de reparacion.
- Animaciones de estado basadas en el logotipo original de PCFix, sin modificarlo.
- Interfaz responsiva con jerarquia visual, color semantico y microinteracciones.
- Control de animaciones desde Configuracion y compatibilidad con `prefers-reduced-motion`.
- Escala tipografica comoda como valor predeterminado, con textos secundarios legibles y controles de 48 px.
- Selector persistente de tamano de interfaz: Comodo, Amplio o Compacto.
- Formularios, tablas, ordenes, compras, dashboard y portal adaptados a zoom y pantallas tactiles.

## Compras multiproducto

- Area de captura amplia para mostrar producto, cantidad, costo unitario, subtotal y acciones sin recortes.
- Partidas responsivas con etiquetas individuales en tablet y celular.
- Contador de productos y resumen financiero de la compra.
- Listado de compras con estado, total, orden relacionada y piezas faciles de escanear.
- Evidencias fotograficas optimizadas antes de enviarse.
- Actualizacion automatica desde BD al volver a la ventana y cada 45 segundos cuando no hay formularios en uso.
- Clientes y selectores ordenados alfabeticamente.
- Tecnicos registrados como usuarios: la API rechaza nombres libres o tecnicos inactivos.
- Refacciones sugeridas por modelo y limitadas a existencias positivas.
- Cotizacion emergente a proveedor cuando no existe una pieza compatible.
- Constructor de compras multiproducto con subtotales y total estimado.
- Caja limitada a ordenes con saldo pendiente.
- Garantia fija de 90 dias naturales con condiciones incorporadas a la orden y al PDF.
