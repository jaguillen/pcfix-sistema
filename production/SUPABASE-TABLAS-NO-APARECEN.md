# Si no aparecen las tablas profesionales en Supabase

Las tablas profesionales se crean automaticamente cuando Render ejecuta el backend nuevo.

Si despues del deploy no aparecen en Supabase, normalmente significa una de estas cosas:

- Render desplego una version anterior del repositorio.
- El backend no arranco correctamente y no ejecuto la migracion.
- `DATABASE_URL` apunta a otro proyecto de Supabase.
- Estas viendo otro schema/proyecto en Supabase.

## Verificacion rapida

Abre:

```text
https://pcfix-backend.onrender.com/api/health
```

Luego:

```text
https://pcfix-backend.onrender.com/api/stability
```

Si `/api/stability` responde `Cannot GET`, Render aun no tiene la version nueva.

## Solucion directa desde Supabase

1. Entra a Supabase.
2. Abre `SQL Editor`.
3. Ejecuta primero:

```text
outputs/production/supabase-crear-tablas-profesionales.sql
```

4. Si ya tienes datos en `records`, ejecuta despues:

```text
outputs/production/supabase-proyectar-records-a-tablas.sql
```

5. Verifica la orden reportada:

```sql
SELECT folio, device, created_at
FROM service_orders
WHERE folio = 'PCF-2026-0004';
```

Debe aparecer `Oppo A38`.

6. Cuando confirmes que las tablas profesionales ya tienen datos, puedes respaldar y eliminar la tabla legacy `records`:

```text
outputs/production/supabase-respaldar-y-purgar-records.sql
```

7. Ve a `Table Editor` y refresca la pagina.

Nota: despues de eliminar `records`, usa la version nueva del backend. Esta version ya lee y escribe directo en tablas profesionales.

Deberias ver:

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
- `app_settings`
