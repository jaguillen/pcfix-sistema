# Migracion estable de datos PCFix

Esta version conserva la API actual del sistema, pero endurece Postgres para evitar cruces de informacion y duplicados criticos.

## Que queda protegido en base de datos

- `records.id` es llave primaria global.
- `order.folio` queda unico para ordenes activas.
- `order.trackingCode` queda unico para ordenes activas.
- `purchase.folio` queda unico para compras activas.
- La bitacora local de la app (`auditLog`) ahora tambien se sincroniza como `auditEntry`.

## Reparacion automatica

Al iniciar el backend, se ejecuta una migracion de estabilidad:

1. Revisa ordenes activas con folio duplicado.
2. Revisa ordenes activas con codigo de seguimiento duplicado.
3. Revisa compras activas con folio duplicado.
4. Conserva el primer registro y a los duplicados les agrega consecutivo:

```text
PCF-2026-0004
PCF-2026-0004-2
PCF-2026-0004-3
```

Despues crea indices unicos para que el problema no vuelva a ocurrir.

## Nuevas escrituras

Cuando el frontend sube datos:

- Si llega un folio de orden ya usado por otra orden activa, el backend lo ajusta con consecutivo.
- Si llega un codigo de seguimiento duplicado, el backend lo ajusta con consecutivo.
- Si llega un folio de compra duplicado, el backend lo ajusta con consecutivo.
- Si llega un `id` ya usado por otro tipo de registro, el backend crea un ID consecutivo.

## Diagnostico

Con usuario `admin` o `manager`:

```text
GET /api/admin/stability
```

Con usuario `admin`, para forzar reparacion:

```text
POST /api/admin/stability/repair
```

## Recomendacion de uso

Despues de desplegar esta version:

1. Abrir el backend y confirmar `/api/health`.
2. Entrar al sistema.
3. Descargar datos del backend.
4. Revisar el portal de cliente con enlaces nuevos, porque los enlaces actuales incluyen `trackingCode`.
