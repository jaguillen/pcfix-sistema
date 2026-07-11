# PCFix online-first y datos seguros

## Estado actual reforzado

El sistema ahora trabaja mejor en modo en linea:

- Cada modificacion local marca una sincronizacion pendiente.
- Si `Modo servidor automatico` esta activo, el sistema intenta guardar en el backend en segundos.
- Si no hay internet o el backend falla, el cambio queda en cola local.
- Al recuperar conexion, la cola se intenta subir de nuevo.
- El indicador de `Admin > Conexion backend` muestra:
  - `Servidor: guardado`
  - `Pendiente: N cambio(s)`
  - `Sin conexion: N pendiente(s)`
  - `Sincronizando...`

## Backend sin npm

El backend sin npm ahora escribe la base JSON de forma atomica:

- Escribe primero a `pcfix-data.json.tmp`.
- Genera respaldo antes de reemplazar la base.
- Conserva los ultimos 30 respaldos.
- Permite mover datos con variables:

```text
DATA_DIR=/var/data
UPLOAD_DIR=/var/data/uploads
```

En Render gratis el filesystem sigue siendo temporal. Para maxima seguridad usa base de datos externa.

## Recomendacion de produccion

Para operacion real:

1. Usar Supabase Postgres o Neon Postgres.
2. Conectar el backend Express a Postgres.
3. Mantener el frontend con cola offline.
4. Programar respaldos diarios.
5. Guardar fotografias en storage externo.

## Flujo recomendado

1. El usuario crea o edita informacion.
2. El navegador guarda copia local inmediata.
3. El navegador manda el cambio al backend.
4. El backend guarda en base persistente.
5. Si falla internet, queda pendiente.
6. Al volver internet, se sincroniza.

Esto evita depender de botones manuales para no perder informacion.
