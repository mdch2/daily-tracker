# Metas v1: contrato de servicios para implementar

Fecha: 2026-10-30. Diseño técnico definido para implementar, sin endpoints disponibles ni tipos generados de Metas. Complementa las [reglas aprobadas](goals-v1.md) y [ADR-010](adr/010-personal-goals-v1.md); las decisiones de integración se recogen en [ADR-011](adr/011-goal-service-contract.md). Sustituye los nombres orientativos de servicios de Metas del [plan inicial](routines-goals-plan.md).

El esquema, SQL, permisos y pruebas PostgreSQL pertenecen al backend, cuyo contrato está en `docs/goals-v1.md` de `daily-tracker-supabase`. Aquí se especifica lo que consume el móvil; no se importan fuentes ni se crean capas de código antes de implementar.

## Convenciones de transporte

Las RPC nuevas reciben un único argumento `p_input` de tipo JSON. Los campos de transporte usan snake_case; el adaptador valida con Zod y transforma a camelCase de dominio. Payloads discriminados rechazan campos incompatibles, claves desconocidas y nulos donde no se admiten. Los campos opcionales anulables se envían explícitamente como nulo; ausencia y nulo no se usan indistintamente en una sustitución completa.

- UUID estables para meta, hitos y operación, generados antes del envío. Todas las escrituras incluyen `operation_id` y `goal_id`, también creación. Un reintento conserva ambos y el contenido normalizado.
- Fechas `YYYY-MM-DD`; instantes ISO 8601 con offset explícito. Propietario, calendario, timestamps, posiciones derivadas del array y revisiones los asigna el servidor.
- `mode`: `amount` o `milestones`. `progress_source`: `manual` o `habit`. `linked_metric`: `amount` o `completed_days` cuando hay hábito.
- `state`: `archived`, `scheduled`, `achieved`, `overdue` o `in_progress`, con esa prioridad. `kind` de evento/comprobante: `create`, `edit`, `archive`, `amount_add`, `amount_set` o `milestone_set`.
- Cantidades y umbrales en milésimas enteras, de 0 a 999999999999; objetivos y aportes desde 1. Días cumplidos se transportan también en milésimas y exigen múltiplos de 1000. Sin coma flotante ni conversiones de unidad.
- Revisiones, versiones y secuencias son enteros seguros para JavaScript. Una fila ausente tiene revisión observada 0; una existente, al menos 1. No se utilizan timestamps como revisión de cantidades o hitos.
- Longitudes después de recortar espacios exteriores, contadas por puntos de código Unicode para coincidir con la validación del servidor. Descripción vacía se normaliza a nulo; longitud máxima 400. No se usa el número de unidades UTF-16 como regla de negocio.

## Definición recibida

`GoalDefinition` contiene `id`, `name`, `description`, `mode`, `progress_source`, `start_date`, `deadline`, `time_zone`, `created_at`, `archived_at`, `archived_on`, `version`, `updated_at` y `milestones`. `archived_on` es nulo o la fecha de archivo en la zona fija de la meta. Cada hito contiene `id`, `name`, `position` y `threshold_milliunits` anulable; las posiciones recibidas son consecutivas desde 0.

La configuración distingue estas cuatro combinaciones:

| Combinación        | Campos de medida                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cantidad manual    | `unit_label` y `target_milliunits`; sin hábito, medida vinculada ni hitos.                                                            |
| Hitos manuales     | De 1 a 30 hitos sin umbral; sin unidad, objetivo cuantitativo ni hábito.                                                              |
| Cantidad vinculada | `habit_id`, `linked_metric`, `target_milliunits`; unidad resuelta desde hábito o días localizados. Sin hitos.                         |
| Hitos vinculados   | `habit_id`, `linked_metric`, hitos con umbrales crecientes; sin objetivo cuantitativo independiente. Unidad resuelta desde la medida. |

En lecturas, `unit_label`, `target_milliunits`, `habit_id` y `linked_metric` siempre existen, con nulo en los casos no aplicables; cantidad devuelve `milestones=[]`. Una unidad localizada de días no se persiste como texto traducido. `source` es nulo o contiene `habit_id`, `name`, `measurement_mode` (`binary` o `quantity`), `linked_metric` y `unit_label` anulable para días localizados. Permite mostrar y abrir el hábito, sin copiar registros ni programación. En creación los campos de una combinación ajena se omiten y rechazan incluso si llevan nulo; `description` y `deadline` comunes sí se envían como nulo cuando no tienen valor.

## Lecturas públicas

Todas requieren identidad y calendario confirmado. Cada respuesta incluye `context`: `read_at`, `today`, `time_zone` y `next_day_at`, obtenidos del servidor en la misma lectura. No acepta `user_id`, una fecha de hoy ni reloj suministrados por el cliente.

| RPC / entrada de repositorio                                  | `p_input`                                                                   | Resultado                                                                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_goals` / `GoalRepository.list`                           | `status` nulo o uno de los cinco estados; `cursor` nulo o cursor de página. | Hasta 20 elementos `GoalRead`, `next_cursor` anulable y `counts` de los cinco estados de toda la cuenta, independientes del filtro.                            |
| `get_goal` / `GoalRepository.findById`                        | `goal_id`.                                                                  | `goal` de tipo `GoalRead` o nulo para inexistente o ajena, incluidas archivadas.                                                                               |
| `get_goal_contributions` / `GoalRepository.readContributions` | `goal_id`, `from`, `to`, fechas inclusivas. Máximo 31 fechas.               | `days` ordenados por fecha, con una fila por fecha solicitada. Para cantidad manual o cualquier medida vinculada; hitos manuales usan su estado en el detalle. |
| `get_goal_history` / `GoalRepository.readHistory`             | `goal_id`, `before_sequence` y `up_to_sequence`, inicialmente nulos.        | Hasta 20 eventos propios, `up_to_sequence` fijo y `next_before_sequence` anulable.                                                                             |

`GoalRead` reúne `definition`, `state`, `progress`, `milestone_states` y `source` anulable. Cantidad manual no incluye estados de hitos; hitos manuales devuelven para cada identidad `completed`, `completion_date` y `revision` (false/nulo/0 si aún no hay fila). Los hitos vinculados devuelven estado calculado y umbral, sin revisión ni fecha de logro inventadas. Se incluyen los 30 hitos como máximo, sin otra paginación.

`progress` tiene dos variantes explícitas:

- Disponible: `available=true`, `accumulated_milliunits` (nulo en hitos manuales), `completed_milestones` y `total_milestones` (nulos en cantidad), y `percentage` entero limitado a 100 para presentación. La cantidad real conserva el exceso.
- Límite de cantidad vinculada: `available=false`, `error=amountLimit`, valores y porcentaje no disponibles. El servidor calcula el estado y los umbrales con aritmética exacta antes de omitir la cantidad que excede el rango. No muestra cero, un total recortado ni bloquea escrituras del hábito. Los conteos por estado siguen siendo completos. Esto es un resultado de dominio conocido, no un fallo de lectura parcial.

Una fecha de contribución contiene `date`, `in_window`, `recorded`, `revision` anulable, `amount_milliunits` o `binary_value` según el origen, `completed` y `contribution_milliunits` anulable. El valor de origen conserva ausencia frente a cero/false; una fecha no registrada no se presenta como un cero confirmado. Para origen vinculado se añade `source_definition_id`, con la definición histórica usada para evaluar. La contribución se expresa en cantidad o 1000 por día cumplido. Antes del inicio, futuro y después de la fecha de archivo se devuelve `in_window=false`, `recorded=false`, valores/revisión/contribución nulos y `completed=false`; no se leen aportes de esas fechas ni se amplía la ventana para registrar desde Metas.

`revision` es la del registro manual o de origen leído; solo las revisiones manuales se envían a escritores de Metas. Los valores de Hábitos se interpretan con su modalidad histórica, que permanece compatible con la medida fijada al crear.

### Paginación y coherencia

Listado por `created_at DESC, id DESC`, mediante cursor de clave, sin offset. El cursor codifica versión de formato, filtro y última clave; se valida como entrada no confiable y no concede acceso. Cambiar filtro lo reinicia. No se permite que un cursor de otro filtro altere la consulta.

La página, sus progresos, conteos y contexto temporal se calculan sobre una única instantánea de lectura. Los conteos no proceden de sumar tarjetas descargadas y no hay segunda llamada independiente para obtener su resumen. El evaluador común de Hábitos resuelve sus definiciones y cumplimiento; las reglas de estado y umbrales de Metas se prueban también en dominio móvil con casos de paridad.

Cada petición es coherente por sí misma. No se promete una instantánea congelada entre páginas: un hábito corregido en otro dispositivo puede cambiar la pertenencia a un filtro. El orden por clave evita repetir identidades; refrescar reinicia la cadena y actualiza conteos. Tras escritura local, foreground o cambio de fecha se descartan cursores y páginas previas; no se mezclan generaciones de lecturas ni filtros. Sin Realtime ni sesiones de paginación persistidas.

Un fallo de red, autorización, formato o lectura impide publicar esa página y su resumen como actuales. Datos anteriores pueden permanecer visibles como desactualizados con recuperación explícita, sin permitir sustituciones con revisiones no confirmadas.

## Escrituras públicas

Toda respuesta es un comprobante con `operation_id`, `goal_id`, `kind`, `accepted_at`, `goal_version` y `event_sequence`, además de los campos de resultado indicados. Es el resultado original de la operación, no la proyección vigente; después se vuelve a leer.

| RPC / entrada de repositorio                | Campos además de `operation_id`, `goal_id`                                                                                                                                                      | Resultado específico                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_goal` / `create`                    | `name`, `description`, `start_date`, `deadline`, `mode`, `progress_source`, y configuración discriminada. Hitos con UUID y nombre; umbral solo si vinculados. Unidad solo para cantidad manual. | Identidad creada y versión inicial 1. No acepta unidad alternativa del hábito ni fechas/propiedad de servidor.                                           |
| `edit_goal` / `edit`                        | `expected_version`, `name`, `description`, `deadline`, `target_milliunits` (nulo si hitos). Sustitución completa de campos editables, no parche parcial.                                        | Nueva versión de configuración. Campos estructurales prohibidos.                                                                                         |
| `archive_goal` / `archive`                  | `expected_version`.                                                                                                                                                                             | Nueva versión, `archived_at` y `archived_on` autoritativos.                                                                                              |
| `record_goal_amount` / `recordAmount`       | `date`, `action=add` y `amount_milliunits` positivo, o `action=set`, `amount_milliunits` desde cero y `expected_revision`.                                                                      | Fecha, total diario resultante y revisión. Solo cantidad manual en `[max(inicio,D−7),D]`. `add` no recibe revisión y suma al total vigente bajo bloqueo. |
| `record_goal_milestone` / `recordMilestone` | `milestone_id`, `completed`, `completion_date` (fecha al confirmar, nulo al revertir), `expected_revision`.                                                                                     | Identidad de hito, booleano, fecha anulable y nueva revisión. Solo hito manual; sin límite de siete días.                                                |

La configuración vinculada envía `habit_id` y `linked_metric`; su unidad se resuelve en servidor. Una creación de inicio futuro no permite guardar progreso antes de esa fecha. Los formularios de fecha nunca reubican automáticamente un borrador si se cruza medianoche.

`version` cambia con configuración o archivo; `revision` con cada sustitución/aporte de su registro, y `event_sequence` con toda operación nueva aceptada, incluso una confirmación explícita que mantenga el mismo valor. Configuración y progreso tienen revisiones distintas: una escritura manual no invalida por sí sola el token de edición. Las escrituras de progreso verifican la configuración y el archivo actuales bajo bloqueo. Repetir una operación ya aceptada no crea revisión ni evento nuevos.

Todas las escrituras nuevas revalidan identidad, pertenencia, modalidad, calendario, ventana y límites después de esperar bloqueos. Al crear se preserva el inicio explícito: si hoy elegido ya pasó al aceptar, se rechaza para revisar. Un comprobante previo válido se reconoce antes de volver a exigir ventana o estado no archivado; nunca se acepta el mismo UUID con otro contenido.

## Historial y auditoría visible

El historial propio contiene creación, cambios de configuración, archivo, aportes/sustituciones manuales y confirmaciones/correcciones/reversiones de hitos. Cada evento expone `sequence`, `operation_id`, `kind`, `accepted_at`, fecha de negocio afectada cuando aplique y campos `before`/`after` tipados por operación. En creación `before` es nulo. Una reversión conserva la fecha y estado anteriores; una corrección de cantidad conserva total anterior y posterior. La descripción histórica respeta el límite de 400.

La primera página fija `up_to_sequence` al último evento comprometido; páginas posteriores usan ese límite y `sequence < before_sequence`, en orden descendente. Los eventos son inmutables, así que nuevas escrituras no desplazan esta consulta. Refrescar inicia otra lectura. Ambos números son enteros positivos seguros, con `before_sequence <= up_to_sequence` cuando se pagina y límite superior no mayor que la secuencia comprometida de esa meta. La secuencia es por meta: todos los eventos se filtran por meta y propietario independientemente de los números recibidos; esos números nunca autorizan acceso.

La auditoría se obtiene por RPC autorizada y proyección de campos permitidos; no expone la tabla privada de comprobantes ni payloads internos. Un solo almacén de operaciones aceptadas puede servir a idempotencia e historial, con retención durante toda la vida de la meta; no se añade una segunda fuente del avance.

Para metas vinculadas, la vista de contribuciones muestra los registros diarios actuales del hábito en la ventana de la meta y su detalle permite abrir el hábito. No se inventan eventos propios de Metas por correcciones del hábito, fechas históricas de cruce de umbrales ni una gráfica pasada de porcentajes. Su historial de configuración sí existe. La auditoría completa de cada modificación de Hábitos permanece fuera de este alcance.

## Errores y recuperación

| SQLSTATE definido | Código de dominio  | Recuperación                                                                      |
| ----------------- | ------------------ | --------------------------------------------------------------------------------- |
| `GL001`           | `unauthorized`     | Restaurar sesión o acceder.                                                       |
| `GL002`           | `calendarRequired` | Completar calendario de cuenta.                                                   |
| `GL003`           | `invalidInput`     | Corregir campos, sin borrar el formulario.                                        |
| `GL004`           | `notFound`         | Recurso inexistente o ajeno, sin revelar existencia.                              |
| `GL005`           | `operationReused`  | UUID reutilizado con otro contenido; no reintentar payload alterado con ese UUID. |
| `GL006`           | `outsideWindow`    | Recargar contexto y revisar la fecha del borrador.                                |
| `GL007`           | `ineligibleDate`   | Fecha antes del inicio o futura; revisar explícitamente.                          |
| `GL008`           | `conflict`         | Recargar y comparar antes de una nueva operación.                                 |
| `GL009`           | `archived`         | Consultar historial; escrituras bloqueadas.                                       |
| `GL010`           | `amountLimit`      | Revisar cantidad manual; el origen vinculado tiene variante de lectura explícita. |

Transporte sin respuesta se distingue de rechazo conocido: conservar borrador, UUID y contenido para reintentar. Confirmado el guardado, si falla el refresco se informa guardado confirmado y se bloquea otro envío hasta recargar. Los códigos desconocidos o datos inválidos se reducen a `service`, fallos de conexión a `network`; nunca se muestran mensajes crudos ni se registran payloads. Todos los textos y ayudas pertenecen a catálogos es/en.

## Integración móvil y orden de implementación

1. Backend implementa y prueba los contratos, permisos y lecturas coherentes en su repositorio. Genera tipos desde PostgreSQL real; el móvil importa el artefacto con `pnpm db:types`.
2. `features/goals` incorpora tipos/reglas puras, validación y acciones, repositorio adaptador y composición en bootstrap según responsabilidades reales. No importa infraestructura de Hábitos ni usa Supabase desde presentación.
3. TanStack Query usa la raíz `['goals', userId]`, con claves para filtro/detalle/contribuciones/historial. Registrar o corregir un hábito desde cualquier recorrido, editar su definición, volver a foreground y cruzar fecha invalida Metas. Escrituras propias invalidan sus lecturas y reinician paginación; el cambio de sesión limpia caché.
4. Construir listado, creación, detalle, registro, edición e historial/archivo. Activar la pestaña Metas cuando exista el recorrido completo. Reutilizar patrones existentes y conservar el alcance visual aprobado.
5. Validar reglas, paridad entre proyecciones y dominio, idempotencia/concurrencia/autorización en PostgreSQL real, borradores/fallos y paginación. Ejecutar checks, compatibilidad/bundles afectados y revisión visual es/en, light/dark/system e iOS/Android. Sin reset de la base de trabajo ni despliegues remotos por defecto.

No quedan preguntas de producto para iniciar v1. La disponibilidad de PostgreSQL local y las verificaciones ejecutadas se comprobarán al implementar; esta definición no afirma que ya existan servicios, migraciones o seguridad probada de Metas.
