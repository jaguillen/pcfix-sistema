# Evaluacion integral PCFix Comitan

## Resultado

La version `pcfix-premium-operativo-20260716-01` fortalece los procesos que mas afectan la confianza del negocio: lectura consistente desde PostgreSQL, inventario, compras recibidas, costos por orden, pagos, fechas prometidas y trabajo simultaneo.

## Cambios implementados

- Las columnas normalizadas son la fuente de verdad de la API. `raw_data` conserva unicamente campos complementarios.
- Guardados de ordenes, compras, inventario relacionado y archivado dentro de transacciones PostgreSQL.
- Bloqueo de filas de inventario y rechazo explicito cuando no existe stock suficiente.
- Reversion y reaplicacion de una compra recibida al editarla o archivarla, sin duplicar entradas.
- Pagos y saldo de orden actualizados en una sola operacion atomica.
- Control de concurrencia por `updated_at` para evitar sobrescribir el trabajo de otra persona.
- Relaciones nuevas protegidas con llaves foraneas y limpieza de referencias vacias o huerfanas.
- Prioridad, entrega prometida, autorizacion, costo interno de mano de obra y fecha de terminacion por orden.
- Dashboard con ordenes vencidas, ciclo promedio, costo real y margen de contribucion.
- SKU y ubicacion fisica en inventario.
- Verificaciones de integridad para compras recibidas sin movimiento, ordenes entregadas con saldo y costos de refaccion descuadrados.
- Consulta automatica de BD al recuperar la ventana y cada 45 segundos cuando no hay un formulario en uso.
- Fotografias redimensionadas y comprimidas antes del guardado.
- Limite de intentos fallidos de acceso y limite de consultas al portal publico.
- Garantia y destino de refacciones sustituidas documentados en la orden y PDF.

## Siguiente fase recomendada

1. Mover evidencias desde JSON/base64 a un bucket privado de Supabase Storage con URLs firmadas. Esto reduce el peso de las ordenes y permite politicas de acceso por archivo.
2. Configurar respaldo logico programado fuera de Supabase. En plan gratuito no debe asumirse una restauracion diaria administrada.
3. Completar WhatsApp Cloud API con numero productivo y plantillas aprobadas; mientras tanto se conserva el flujo `wa.me` que abre la aplicacion.
4. Incorporar pruebas automatizadas contra una base PostgreSQL de ensayo y CI antes de cada despliegue.
5. Solicitar revision legal local del formato final de orden, aviso de privacidad, resguardo, abandono de equipos y garantia.

## Referencias de investigacion

- PostgreSQL, transacciones: https://www.postgresql.org/docs/current/tutorial-transactions.html
- PostgreSQL, bloqueos de fila: https://www.postgresql.org/docs/current/explicit-locking.html
- OWASP, seguridad de APIs: https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP, autenticacion y limitacion de intentos: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Supabase Storage: https://supabase.com/docs/guides/storage
- Supabase respaldos: https://supabase.com/docs/guides/platform/backups
- Microsoft Field Service, SLA en ordenes: https://learn.microsoft.com/en-us/dynamics365/field-service/sla-work-orders
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- NOM-174-SCFI-2007: https://www.dof.gob.mx/normasOficiales/2845/SEECO2/SEECO2.htm

Este documento describe controles de producto y no sustituye asesoria juridica, contable o de seguridad especializada.
