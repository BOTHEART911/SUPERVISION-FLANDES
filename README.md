# SUPERVISION-FLANDES

App de los supervisores de contrato de la Alcaldía de Flandes. Front estático (GitHub Pages) sobre FLANDES_CORE (app `SUPERVISION`). Mismo kit, estilos, cohete, esqueletos, Insights, foto de perfil, modo oscuro y firma que Contratista y Contratación.

## Qué hay aquí (entrega 6.1)
- Inicio: saludo con el alcance, accesos REVISAR CUENTAS, PLAN DE PAGOS y SOLICITUD A PRENSA, resumen de mis cuentas.
- Lista de cuentas con pastillas (estado, revisión, secretaría, supervisor). Solo las de su supervisión; el REVISOR ve las del supervisor o la secretaría que le asigne ADMIN.
- Revisión con el visor rápido y el carrusel de evidencias (5.4) y bitácora de observaciones.
- Decisión a nombre del SUPERVISOR: Aprobar, Devolver o Incompleta. El REVISOR sin permiso deja VISTO BUENO o CON INCONSISTENCIA ("Visto Bueno: nombre · fecha y hora" en la tarjeta).
- Plan de pagos: firmar el informe de supervisión (plantilla V3 de Drive, con RP de cesión) y aceptar el plan. El acta de cumplimiento del último informe llega en la 6.2.
- Solicitud a Prensa sin antelación mínima (desde hoy).
- Descarga de la lista: Excel plano y PDF como informe por bloques.

## Entrega 6.3
- Aceptar el plan de pagos avisa, a nombre del supervisor, al grupo de Contabilidad (pedido de la orden de pago) y al contratista (push + WhatsApp + su buzón) con el enlace del informe de supervisión y, en la última cuenta, el del acta final de cumplimiento.
- CONTRATISTAS de la supervisión con su ficha, INFORME de cuentas de un contrato (PDF por bloques y Excel con las columnas compartidas con Contabilidad y Tesorería: `kit/informe-cuentas.js`), INFORMES FIRMADOS (hoja FIRMAS, con el PDF en el visor), REPORTE DE SUPERVISIÓN (todas las cuentas por etapa), REQUERIMIENTOS, COMUNICADOS, DIRECTORIO, DRIVE DE HACIENDA (llave `DRIVE_HACIENDA` de CONFIG) y MI FIRMA Y MI FOTO.
- Todas las vistas con carga única, Refrescar, esqueleto centrado, Insights y modo oscuro.
