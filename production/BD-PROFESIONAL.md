# Base de datos profesional PCFix

Esta version agrega tablas por modulo sin romper la compatibilidad con la app actual.

## Estrategia

La tabla `records` se conserva como capa de compatibilidad y respaldo JSON.
Cada vez que se guarda un registro, el backend tambien lo proyecta a tablas profesionales.

Esto permite:

- reportes SQL confiables;
- restricciones por entidad;
- indices por cliente, orden, inventario y compras;
- integridad entre partidas de compras, ordenes y refacciones;
- migracion gradual sin perder datos existentes.

## Tablas creadas

- `app_settings`
- `clients`
- `suppliers`
- `inventory_items`
- `service_orders`
- `order_parts`
- `purchases`
- `purchase_items`
- `payments`
- `appointments`
- `warranty_claims`
- `inventory_movements`
- `audit_entries`

## Restricciones principales

- `clients.id` unico.
- Telefono de cliente indexado para busqueda rapida, sin bloquear clientes que compartan numero.
- `service_orders.folio` unico en ordenes activas.
- `service_orders.tracking_code` unico en ordenes activas.
- `purchases.folio` unico en compras activas.
- `order_parts.order_id` referencia a `service_orders`.
- `purchase_items.purchase_id` referencia a `purchases`.
- Montos, costos, precios y stock no aceptan valores negativos.

## Migracion automatica

Al iniciar el backend:

1. Crea/actualiza la estructura.
2. Repara duplicados criticos en `records`.
3. Crea indices unicos.
4. Recorre todos los registros existentes.
5. Inserta o actualiza sus equivalentes en tablas profesionales.

## Diagnostico

Ruta publica de solo diagnostico:

```text
GET /api/stability
```

Ruta protegida con usuario `admin` o `manager`:

```text
GET /api/admin/stability
```

Reportes protegidos adicionales:

```text
GET /api/admin/analytics
GET /api/admin/integrity
```

La respuesta incluye:

- duplicados detectados;
- totales por tipo en `records`;
- totales por tabla profesional.

`/api/admin/analytics` calcula desde tablas SQL:

- ingresos;
- costo de refacciones;
- margen bruto;
- cuentas por cobrar;
- stock bajo;
- compras pendientes;
- costo de garantias;
- mezcla de servicios;
- ingresos mensuales;
- recomendaciones operativas.

`/api/admin/integrity` revisa:

- ordenes sin cliente valido;
- pagos sin orden;
- compras sin proveedor;
- compras ligadas a orden inexistente;
- refacciones surtidas sin orden;
- refacciones surtidas sin articulo de inventario.

## Importante

La app sigue leyendo y escribiendo con `/api/records/:type`.
La diferencia es que ahora cada escritura tambien queda organizada en su tabla especifica.
