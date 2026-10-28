# ADR-009: primera implementación de Rutinas

- Estado: aceptada e implementada localmente.
- Fecha: 2026-10-27.
- Alcance autorizado: Rutinas; Metas personales sigue sin implementar.

## Decisión

Se implementan las reglas de Rutinas de [ADR-008](008-routines-personal-goals.md) y del [plan](../routines-goals-plan.md): de 1 a 30 pasos propios binarios o hábitos existentes, al menos un obligatorio, orden orientativo y frecuencia diaria o por días concretos. Inicio hoy por servidor. Solo los obligatorios elegibles participan en cumplimiento y porcentaje; sin denominador se muestra no evaluable. Los hábitos flexibles son opcionales; una transición posterior a flexible deja de generar obligación diaria y muestra aviso para ajustar la configuración futura.

Rutinas registra y corrige solo hoy. Los registros de hábitos siguen perteneciendo a Hábitos y conservan su ventana histórica; corregirlos allí actualiza los resultados derivados de Rutinas. No se duplica su estado. El nombre cambia inmediatamente y los cambios estructurales desde la próxima semana de cuenta, conservando versiones aplicadas e identidades de pasos. Archivar conserva el historial y bloquea escrituras; no hay borrado definitivo, restauración, temporizadores, notificaciones ni rachas de rutinas.

Se añade la pestaña Rutinas y su sección independiente en Hoy. La navegación actual tiene Hoy, Hábitos, Rutinas y Más; Metas se incorporará cuando se implemente, conservando el objetivo aprobado de cinco destinos y sin crear una pestaña vacía.

## Contratos e integración

El backend posee migración, RLS, restricciones, operaciones y pruebas PostgreSQL. El móvil importa tipos generados desde esa base y adapta `get_routines`, `create_routine`, `edit_routine`, `archive_routine` y `record_routine_step`. La lectura de estados propios usa su tabla con RLS y rangos limitados. Se utiliza un único comprobante privado de operaciones para creación, edición, archivo y registro: no hay dos almacenes con la misma responsabilidad.

Application valida entradas y compone las lecturas de Rutinas y Hábitos; Domain reutiliza elegibilidad y cumplimiento de Hábitos. No hay imports de infraestructura entre features. Las consultas están identificadas por usuario y se invalidan al registrar, editar, cambiar fecha o volver a foreground. La lectura de vínculos se deduplica y agrupa; un fallo no se presenta como ausencia o un resumen completo.

Los formularios conservan contenido e identidad de petición ante entrega incierta; los conflictos exigen recargar y revisar. Un guardado confirmado con fallo de refresco no se reenvía como una nueva operación. La navegación y los paneles se bloquean durante guardados inciertos. Se extrae `Sheet` a shared por sus consumidores reales en Hábitos y Rutinas; el nombre anterior se mantiene como reexportación compatible.

## Diseño y consecuencias

La implementación adapta [la referencia de Rutinas](../../design/routines/README.md) a datos reales, catálogos es/en y tokens light/dark/system. No implementa elementos ilustrativos ajenos al contrato ni una identidad visual definitiva. No añade dependencias.

La evidencia ejecutada y los límites de verificación se registran en [validation.md](../validation.md). Las pruebas del backend no sustituyen la revisión nativa iOS/Android ni un despliegue remoto, que no forma parte de esta entrega.
