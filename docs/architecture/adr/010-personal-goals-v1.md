# ADR-010: reglas y alcance de Metas personales v1

- Estado: aceptada para definición; implementación y contratos ejecutables pendientes.
- Fecha: 2026-10-28.
- Alcance: cerrar las decisiones de producto de Metas y su adaptación visual, sin implementar el módulo ni autorizar cambios remotos.

## Contexto

[ADR-008](008-routines-personal-goals.md) aprobó cantidad o hitos de igual peso, con progreso manual o desde un único hábito compatible. El [plan previo](../routines-goals-plan.md) propuso las reglas restantes. Tras revisar las referencias de `docs/design/goals`, el usuario confirma las decisiones descritas en [Metas v1](../goals-v1.md), que es la definición vigente.

## Decisión

- Cantidades manuales: registrar y corregir hoy y las siete fechas anteriores, respetando el inicio. Hitos manuales: confirmar, corregir fecha o revertir entre inicio y hoy durante toda la meta sin archivar, conservando historial.
- Inicio hoy o futuro, sin retroactividad. Una meta vinculada incluye el total completo de su fecha inicial, aunque el hábito se haya registrado antes de crearla ese día.
- Medida vinculada fija: cantidad acumulada, incluidos parciales bajo mínimo, o días cumplidos según las reglas históricas de Hábitos. Hitos vinculados por umbrales crecientes, sin marcado manual ni conversiones.
- Nombre, descripción, límite y objetivo cuantitativo editables inmediatamente con historial. Inicio, modalidad, fuente, unidad, hábito, medida y estructura de hitos inmutables; cambiarlos requiere otra meta.
- Archivo bloquea escrituras manuales y configuración, mantiene consulta e historial y no admite restauración ni borrado definitivo. La meta vinculada incluye toda la fecha de archivo y sigue reflejando registros y correcciones de fechas incluidas; no congela su resultado.
- Estados con prioridad archivada, programada, lograda, vencida y en curso. Lograr permite seguir acumulando. Barra limitada a 100 %, porcentaje truncado y exceso real visible.
- Descripción opcional de hasta **400** caracteres, sustituyendo los 2.000 del plan inicial. Nombres de 1–100, unidad de 1–30, de 1 a 30 hitos, cantidades de hasta tres decimales y máximo 999999999.999; objetivos/aportes positivos y total corregible a cero.
- Tarjetas de la referencia, filtros/conteos por estado y recorridos completos de creación, detalle, historial, registro, edición y archivo. Hitos pendientes en el detalle. Sin resumen de próximos hitos entre metas, categorías, pronósticos, avance global ponderado ni alineación semanal. Se mantienen es/en y light/dark/system.

## Alternativas y motivos

Se descarta aplicar siete días también a los hitos manuales: debe poder corregirse un error antiguo durante la vida de la meta, con trazabilidad. Para cantidades se conserva la ventana de Hábitos por coherencia de uso.

Se descarta una descripción de 2.000 caracteres por excesiva; el usuario fija 400. Se limita la edición estructural para preservar el significado de los registros, y se trabaja con fechas completas en vínculos y archivo para compartir los totales diarios de origen sin duplicarlos.

## Consecuencias

La definición de producto queda cerrada para v1. En la entrega original quedaron pendientes firmas de servicios, historial/proyecciones, esquema y autorización en backend, generación/importación de tipos, implementación móvil y pruebas reales. Resolución del 30 de octubre: [ADR-011](011-goal-service-contract.md) y el [contrato técnico](../goals-service-contract.md) concretan los servicios y concilian la documentación backend en su propio repositorio. Sigue pendiente implementar y verificar ambos lados; la entrega original del 28 no había modificado el backend.

Los documentos previos conservan el contexto y enlazan esta resolución. La aprobación de reglas no acredita implementación, pruebas de Metas ni despliegue. Las referencias exportadas se conservan sin modificar.
