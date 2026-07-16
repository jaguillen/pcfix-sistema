# Migracion de PCFix local a produccion

La app actual (`outputs/index.html`) sigue funcionando sin servidor usando `localStorage`.
La carpeta `outputs/production/backend` agrega la capa para produccion.

## Ruta recomendada

1. Exportar respaldo desde `Admin > Respaldar datos`.
2. Instalar y arrancar el backend.
3. Crear usuarios reales.
4. Importar los datos del respaldo mediante un script de migracion o endpoints `POST /api/records/:type`.
5. Cambiar el frontend para leer/escribir por API en lugar de `localStorage`.

## Mapeo de datos

| LocalStorage | Backend type |
| --- | --- |
| settings | settings |
| clients | client |
| orders | order |
| inventory | inventory |
| suppliers | supplier |
| appointments | appointment |
| purchases | purchase |
| payments | payment |
| inventoryMovements | inventoryMovement |
| auditLog | audit_log |

## Seguridad minima para operar

- HTTPS.
- Usuarios individuales.
- Roles por puesto.
- Respaldos automaticos.
- Cifrado o proteccion del disco donde vivan `pcfix.sqlite` y `uploads/`.
- No guardar contrasenas/patrones si no es indispensable; si se guardan, limitar acceso por rol.

## Pendiente de integracion frontend

La interfaz local puede conectarse al backend con una capa `apiClient` que reemplace:

- `loadState()`
- `persist()`
- carga/subida de fotos
- envio de WhatsApp

Esto se deja separado para no romper la version local ya funcional.
