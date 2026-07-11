PCFIX - Sistema web administrativo

Como abrirlo:
1. Abre index.html en un navegador moderno.
2. Entra a Admin y usa "Cargar datos de ejemplo" si quieres probar rapido.
3. Coloca el logotipo original en outputs/assets/logo-pcfix.png para que aparezca en el panel.
4. Si ya iniciaste el backend, entra a Admin > Conexion backend, presiona Conectar y usa Subir datos locales o Descargar backend.
5. Para abrir backend y sistema juntos usa iniciar-produccion-pcfix.bat.

Funciones incluidas:
- Registro y edicion de clientes.
- Ordenes de reparacion con folio, estado, anticipo, total y refacciones.
- Archivado de clientes, ordenes, proveedores, citas, compras e inventario para evitar perdida accidental de historial.
- Bitacora administrativa de acciones recientes.
- Caja con pagos, abonos, metodos de pago, referencias y corte del dia.
- Modo servidor automatico para sincronizar cambios con el backend conectado.
- Gestion de usuarios de backend desde Admin.
- Modulo de garantias con reclamos, resolucion, estado y costo absorbido.
- Reportes CSV de ordenes, pagos, compras y garantias.
- Tecnico asignado e historial de estatus por orden.
- Movimientos de inventario por altas, ajustes, salidas por orden y entradas por compra.
- Descuento automatico de refacciones usadas al guardar una orden.
- Firma digital de aceptacion del cliente en la orden y en el PDF.
- Codigo y QR de seguimiento en el comprobante imprimible.
- Plantillas rapidas de fallas comunes para acelerar la recepcion.
- Checklist de recepcion tecnica con accesorios, estado fisico, evidencia, clave autorizada y aprobacion del cliente.
- Garantia por orden con dias y condiciones visibles en PDF y portal del cliente.
- Proveedores con datos de contacto, especialidad y acceso a WhatsApp.
- Agenda de citas para recepcion, diagnostico, entrega, garantia y seguimiento, con recordatorio por WhatsApp.
- Ordenes de compra y cotizaciones a proveedores, con folio OC, estado, costo estimado y enlace a orden de reparacion.
- Cotizacion automatica por WhatsApp de piezas faltantes al guardar una orden.
- Cotizacion formal por WhatsApp para aprobacion del cliente.
- Solicitud de resena post-entrega por WhatsApp.
- Portal de cliente para consultar seguimiento con folio y telefono.
- Enlaces de WhatsApp para clientes y seguimiento de ordenes.
- Vista imprimible de orden para guardar como PDF desde el navegador.
- Inventario con stock minimo, costos, precios y exportacion CSV.
- Inventario por marca y modelo, con autocompletado de marcas/modelos comerciales comunes.
- Categorias comunes para talleres de computadoras y celulares, con filtro y accesos rapidos.
- Panel administrativo con metricas, margen estimado, agenda proxima, compras pendientes, respaldos JSON y restauracion.

Notas:
- Los datos se guardan en localStorage del navegador.
- Para uso real con varias computadoras se recomienda migrar a backend con usuarios, roles, base de datos, almacenamiento de fotos y WhatsApp Business Cloud API.
- Ya se incluye una base de backend de produccion en outputs/production/backend.
- Si Windows no reconoce npm, usa la alternativa sin instalacion en outputs/production/no-npm-backend.
- La interfaz ya incluye controles para conectar con http://localhost:8080, subir datos locales y descargar datos del backend.
- Incluye respaldar-produccion-pcfix.bat para copiar la base JSON del backend sin npm.
- La guia de migracion esta en outputs/production/MIGRACION.md.
- La guia para montarlo gratis con subdominio esta en outputs/production/DEPLOY-GRATIS.md.
- Los archivos antiguos de la prueba de webhook quedaron en outputs/legacy para referencia, pero no son necesarios para abrir index.html.
- La identidad visual usa la paleta PCFix Comitan: azul #0B3B63, turquesa #20C7D8, blanco y gris claro.
- Usa fotografias reales del negocio o reparaciones dentro de outputs/assets. No usar imagenes generadas por IA para dispositivos.
- Para produccion conviene conectar esta interfaz a una API con autenticacion y base de datos.
