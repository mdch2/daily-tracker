# Plan de rutinas y metas personales

Fecha: 2026-10-27. Especificación previa a implementación. Las reglas confirmadas están en [ADR-008](adr/008-routines-personal-goals.md). Las decisiones adicionales de este plan son una propuesta concreta para revisión, no funcionalidades disponibles. El diseño de tablas, restricciones, índices y autorización vive exclusivamente en el backend, en `docs/routines-goals-plan.md` de `daily-tracker-supabase`.

Actualización: el usuario autoriza implementar únicamente Rutinas. El [contrato v1](routines.md) y [ADR-009](adr/009-routines-v1.md) describen su implementación y prevalecen sobre las propuestas de ese módulo. Metas personales continúa sin implementar. La navegación actual añade solo Rutinas; Metas se incorporará cuando tenga un recorrido completo.

## Alcance y decisiones confirmadas

- Cinco pestañas cuando existan los recorridos: Hoy, Hábitos, Rutinas, Metas y Más. Progreso no será una sexta pestaña; su ubicación futura se resolverá con su tarea.
- Rutinas con pasos propios y hábitos existentes; orden orientativo, pasos obligatorios y opcionales. Se completan al realizar todos los obligatorios.
- Rutinas diarias o en días de semana concretos. El registro y la corrección desde Rutinas se permiten solo hoy según el servidor; las fechas anteriores se consultan.
- Metas de cantidad o hitos de igual peso, con fuente manual o vinculada según la meta. Una meta vinculada usa un único hábito; el mismo hábito puede contribuir a varias metas.
- Inicio y fecha límite opcional para metas. Una meta vencida permite continuar, reprogramar o archivar. Una corrección puede reducir el progreso y deshacer el logro.
- La programación y el registro de un hábito no se duplican ni se alteran por incluirlo en una rutina o meta. Las unidades deben ser compatibles.

Las siguientes secciones concretan recomendaciones para cubrir los casos que aún no estaban definidos. Los valores de límites y las políticas nuevas requieren revisión de producto antes de implementar.

## Estructura dentro de la aplicación

| Destino | Contenido y acciones                                                                                                                                                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hoy     | Conserva su sección de hábitos. Añade las rutinas programadas para la fecha seleccionada y acceso a su ejecución. Mantiene separados los conteos de hábitos y rutinas, para no contar dos veces una misma práctica. No inventa una obligación diaria para las metas. |
| Hábitos | Conserva creación, registro, detalle y correcciones actuales. Los vínculos no crean otro registro ni cambian su programación.                                                                                                                                        |
| Rutinas | Listado activo/archivado, creación, detalle, ejecución de hoy, consulta por fecha y edición con vigencia visible.                                                                                                                                                    |
| Metas   | Listado con filtros de estado, creación, detalle del progreso, historial, registro manual, edición y archivo.                                                                                                                                                        |
| Más     | Preferencias y cuenta existentes. No duplica los listados de rutinas y metas.                                                                                                                                                                                        |

Rutas previstas, sin crearlas todavía: `(tabs)/routines`, `routines/new`, `routines/[id]`, `(tabs)/goals`, `goals/new` y `goals/[id]`. La ejecución de una rutina es un estado del detalle con fecha explícita, no una segunda entidad ni un temporizador. Los formularios de edición pueden usar los paneles existentes si las referencias lo permiten.

Las pestañas nuevas se incorporan cuando sus recorridos estén implementados, sin pantallas vacías de navegación. La separación y el orden de los destinos están aprobados; las referencias exportadas recibidas se adaptarán a estas reglas antes de implementar composición visual, iconos y recursos.

## Rutinas: propuesta de reglas completas

### Creación y programación

- Nombre recortado de 1–100 caracteres. De 1 a 30 pasos y al menos uno obligatorio. Sin rutinas vacías ni formadas únicamente por opcionales.
- Paso propio: nombre de 1–100 caracteres y registro binario. No incorpora cantidades, temporizadores ni recurrencia independiente inicialmente.
- Paso vinculado: referencia a un hábito propio existente. Muestra su nombre y configuración; no guarda una copia editable de su meta o unidad. El mismo hábito no se repite dentro de una rutina y sí puede aparecer en rutinas distintas.
- Programación diaria o máscara de días concretos no vacía. Inicio hoy, fijado al confirmar el servidor; sin creación retroactiva ni planificación de inicio futuro en esta entrega.
- Los hábitos semanales flexibles solo se admiten como pasos opcionales: su objetivo semanal no se transforma en una obligación diaria. La pantalla explica esta condición al vincularlos.
- Si un hábito obligatorio pasa después a frecuencia flexible, desde la vigencia de ese cambio deja de contar como obligación diaria en la rutina y se muestra un aviso de configuración para ajustar su siguiente versión. El vínculo no bloquea ni modifica la edición del hábito y las fechas anteriores conservan su definición.
- Al crear o editar se valida que exista al menos un día programado con un paso obligatorio elegible. Los cambios posteriores del hábito pueden producir fechas sin obligatorios elegibles; esas fechas no se evalúan como éxito o fracaso.

### Elegibilidad, cumplimiento y progreso

Primero se resuelve la definición histórica de la rutina y de sus hábitos para la fecha consultada. Una fecha anterior al inicio, futura o no programada no admite registro. Para hoy, el servidor vuelve a validar la fecha tras esperar bloqueos.

Un paso propio es elegible en toda fecha programada de la rutina. Un paso de hábito diario o de días concretos es elegible solo cuando lo permite la definición del hábito en esa fecha. Un paso no elegible se muestra como «no programado» y queda fuera del denominador; no genera una escritura. Los hábitos flexibles opcionales son oportunidades de registro en fechas elegibles, aunque ya se haya alcanzado su objetivo semanal.

Sea `N` el número de pasos obligatorios elegibles y `C` los que están completos:

- `N = 0`: rutina no evaluable para esa fecha, sin porcentaje ni cumplimiento automático. Los opcionales elegibles pueden registrarse hoy.
- `N > 0` y `C = N`: completada.
- Hoy, con `C = 0`: pendiente; con `0 < C < N`: parcial.
- Fecha cerrada, con `C < N`: no completada, conservando el avance `C/N`.
- Progreso: `C/N`; porcentaje entero truncado hacia abajo. Los opcionales se muestran por separado, sin modificarlo.

Una cantidad parcial de un hábito se muestra con su valor real, pero no completa ese paso hasta alcanzar su mínimo histórico. No se promedian cantidades de hábitos diferentes.

La ausencia de registro propio se distingue de `false` explícito; ambos dejan el paso pendiente. Una lectura fallida no se convierte en ausencia. No hay operación «completar toda la rutina» ni estado de cumplimiento editable independiente.

### Registro, historial y cambios

Los pasos propios se confirman o revierten hoy. Un paso vinculado abre el registro del hábito de hoy y usa sus operaciones existentes; no escribe un estado de paso separado. Desde Rutinas no se habilita corrección de fechas anteriores para ninguno de sus pasos.

Hábitos conserva su ventana actual `[D−7,D]`. Una corrección histórica realizada allí recalcula el paso vinculado y el resultado derivado de la rutina correspondiente. La limitación de Rutinas a hoy no congela una copia del hábito ni amplía su ventana.

El nombre de la rutina cambia inmediatamente. Pasos, obligatoriedad, orden y programación se versionan desde la próxima semana de la cuenta, como la edición de frecuencia de hábitos. La pantalla muestra la fecha efectiva y la configuración pendiente; solo la versión futura puede reemplazarse antes de aplicarse. Los pasos propios mantienen identidad estable entre versiones; cambiar un paso propio por un vínculo, o cambiar el hábito vinculado, crea otra identidad de paso.

Archivar bloquea nuevos registros y ediciones, conserva el historial y elimina la rutina de las fechas posteriores al archivo. No borra hábitos, pasos ni registros. Inicialmente no se ofrece eliminación definitiva ni restauración; tampoco pausas o rachas propias. El archivo no impide corregir los hábitos desde su módulo dentro de su ventana ni oculta esos cambios al consultar una fecha previa.

## Metas: propuesta de reglas completas

### Definición y validaciones

- Nombre de 1–100 caracteres; descripción opcional de hasta 2.000. Ausencia de descripción se representa como nulo, no como un error.
- Inicio elegido explícitamente, hoy o una fecha futura de la cuenta. No se incorporan registros anteriores al inicio ni importaciones retroactivas anteriores a la creación.
- Fecha límite opcional, igual o posterior al inicio. Se vence al comenzar el día siguiente a esa fecha en la zona de cuenta, sin sumar 24 horas a un instante.
- Cantidad objetivo positiva, unidad de 1–30 caracteres, hasta tres decimales y rango de hábitos: máximo 999999999.999 unidades. Se usan milésimas enteras, no sumas en coma flotante.
- De 1 a 30 hitos con nombre de 1–100 caracteres, ordenados y de igual peso. Sin hitos vacíos ni metas sin denominador.
- Modalidad, fuente, inicio, unidad, hábito y medida vinculada quedan fijos desde la creación. Cambiarlos requiere otra meta para conservar el significado del historial.

### Fuente manual

Para cantidad, se permite sumar un aporte positivo al total de una fecha o corregir ese total, incluido cero. Los registros diarios se acumulan desde el inicio hasta hoy. No hay cantidades negativas; una disminución o retirada se refleja corrigiendo explícitamente un total diario existente.

Se propone la misma ventana de siete fechas anteriores más hoy para aportes y correcciones manuales de metas, limitada además por el inicio. Esta es una propuesta propia de Metas, no una extensión de la decisión de Rutinas ni una regla ya confirmada. No se permite introducir un saldo inicial sin fecha de registro; puede registrarse como aporte de hoy.

Para hitos, cada uno se confirma o revierte explícitamente. Al confirmar se elige fecha entre inicio y hoy, dentro de esa ventana; al corregir se comprueba tanto la fecha guardada como la nueva. Los hitos fuera de la ventana quedan consultables, sin reversión tardía en esta propuesta. Se debe mostrar esa restricción antes de confirmar.

No se registra progreso antes del inicio ni después del archivo. Superar la fecha límite no cierra la escritura: permite seguir avanzando.

### Fuente vinculada a un hábito

Cada meta selecciona un hábito y una medida fija:

- **Cantidad acumulada:** suma de los totales diarios confirmados del hábito cuantitativo, incluso en fechas donde no alcanzó su mínimo. La unidad es exactamente la del hábito, sin conversiones.
- **Días cumplidos:** número de fechas distintas con cumplimiento del hábito, resuelto según su definición histórica. Compatible con hábitos binarios y cuantitativos. Una fecha aporta como máximo un día; la meta utiliza enteros y muestra una unidad localizada de días cumplidos.

La ventana de contribución empieza en el inicio de la meta y termina hoy, o en la fecha de archivo si está archivada. Incluye las fechas posteriores a la fecha límite para permitir continuar. No se copia el historial anterior al inicio ni se resta un saldo base implícito.

Una meta de cantidad compara la medida acumulada con su objetivo. Una meta de hitos vinculada asigna umbrales positivos estrictamente crecientes a sus hitos sobre esa misma medida; cada hito se completa al alcanzar su umbral. Para días cumplidos, los umbrales son enteros. No se marcan manualmente hitos vinculados ni se interpreta una sesión de estudio como un módulo terminado.

Ejemplo: un hábito de estudio puede alimentar hitos llamados «5 días de estudio», «10 días» y «20 días». «Terminar módulo 1» requiere registro manual salvo que el hábito registre precisamente ese resultado en una unidad compatible.

La falta de registro no es un aporte confirmado de cero, aunque no incremente el acumulado. Un fallo de lectura deja el progreso no disponible. Si la suma supera el rango admitido se informa un límite; nunca se trunca ni se pierde precisión silenciosamente.

### Progreso, estados y edición

En cantidad, el avance es el valor acumulado frente al objetivo. En hitos, es el número completado frente al total de hitos; un hito aún no alcanzado no aporta una fracción de su peso. La barra se limita a 100 %, el porcentaje entero se trunca hacia abajo y el valor real conserva el exceso. No se muestra 100 % antes de lograr la meta por efecto del redondeo.

Se proponen estos estados, con prioridad: archivada, programada (inicio futuro), lograda, vencida (límite pasado sin lograr) y en curso. Una meta lograda permanece lograda al pasar su fecha límite mientras siga cumpliendo el objetivo. El archivo se presenta como estado de ciclo de vida y mantiene visible el progreso alcanzado.

Nombre y descripción se editan inmediatamente. Fecha límite y cantidad objetivo también, con revisión de concurrencia e historial de antes/después, sin cambiar registros ni fechas de origen. Se permite quitar la fecha límite o reprogramarla a otra igual o posterior al inicio. Cambiar la cantidad objetivo puede lograr o reabrir la meta. Los hitos, sus umbrales y su orden se fijan al crear; añadirlos, quitarlos o reordenarlos exige otra meta en esta entrega.

Archivar detiene nuevas fechas de contribución y escrituras manuales, conserva el historial y no elimina el hábito. Las correcciones permitidas de un hábito en fechas incluidas en la ventana de la meta siguen reflejándose en el progreso archivado; no se presenta como una certificación inmutable. Sin eliminación definitiva ni restauración inicialmente.

## Contratos cliente y límites de módulos

Se prevén `src/features/routines` y `src/features/goals`, con capas solo cuando exista una responsabilidad real. `src/app` compone rutas delgadas; `src/bootstrap` conecta repositorios y providers. No se crean estas carpetas durante la definición.

| Entrada de aplicación prevista                          | Responsabilidad                                                                                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RoutineRepository.list/findById/readWindow`            | Leer identidad, definiciones, pasos propios y registros confirmados del rango; los pasos vinculados incluyen los datos de Hábitos necesarios para la evaluación compartida. |
| `RoutineRepository.create/rename/edit/archive`          | Guardar definición o ciclo de vida, con identificadores estables y versión observada. `edit` devuelve la fecha efectiva autoritativa.                                       |
| `RoutineRepository.recordOwnStep`                       | Confirmar/revertir un paso propio de hoy con UUID de operación y revisión observada; nunca registrar un hábito.                                                             |
| `HabitRepository.record`                                | Única escritura de un hábito, también desde Rutinas. Reutiliza el editor y la validación existentes.                                                                        |
| `GoalRepository.list/findById/readProgress/readHistory` | Leer definición vigente, revisión, acumulado confirmado, contexto de cuenta e historial paginado. No descargar años completos de registros para calcular una tarjeta.       |
| `GoalRepository.create/edit/archive`                    | Guardar configuración y cambios admitidos, con control de versión y resultado autoritativo.                                                                                 |
| `GoalRepository.recordAmount/recordMilestone`           | Escribir solo progreso manual, con fecha explícita, idempotencia y revisión para sustituciones.                                                                             |

Las escrituras comprueban pertenencia, calendario, archivo, modalidad, ventana y vínculos en el servidor. Operación y comprobante se confirman atómicamente. Repetir UUID y contenido devuelve el comprobante anterior; cambiar el contenido falla. Los reintentos confirmados se reconocen antes de volver a exigir la ventana temporal. Los comprobantes no reemplazan una lectura del estado vigente.

Los nombres anteriores especifican responsabilidades, no interfaces TypeScript o RPC ya existentes. Los adaptadores validarán respuestas con Zod y traducirán errores a códigos de dominio: identidad ausente, calendario pendiente, entrada inválida, recurso no disponible, conflicto, operación reutilizada, fecha no elegible, fuera de ventana, archivado y límite de cantidad. La presentación traduce esos códigos en es/en.

Rutinas consume las reglas públicas de elegibilidad y cumplimiento de Hábitos; no escribe otra implementación dentro de su feature. Metas consume una medida confirmada del contrato de Hábitos, calculada por el backend desde sus registros para evitar lecturas ilimitadas. Sus umbrales y estados pertenecen al dominio de Metas. No se importan adaptadores de otra feature ni fuentes del otro repositorio.

TanStack Query mantiene datos remotos por usuario. Registrar o corregir un hábito invalida Hábitos, Hoy, las rutinas y metas vinculadas; el cambio de sesión limpia las consultas. Zustand sigue limitado a preferencias de interfaz. No se añaden almacenamiento offline, sincronización, Realtime ni nuevas dependencias.

## Lecturas y coherencia

Los rangos se paginan y acotan. Propuesta inicial: listado de 20 entidades, ejecución por lotes de hasta 10 rutinas para una fecha y hasta 30 pasos por rutina; historial de una rutina en bloques de hasta 28 fechas. Así un bloque de registros propios no supera 840 filas. Las definiciones y los hábitos vinculados se deduplican por identidad y versión.

El progreso actual de hasta 20 metas se obtiene como una proyección calculada en servidor sobre una lectura coherente, incluyendo fecha de cuenta y revisión de configuración. No se almacenan porcentajes, rachas ni banderas de logro como otra fuente de verdad. El historial de aportes y cambios de configuración se pagina por separado; no se promete una gráfica histórica de porcentajes en esta entrega.

Un fallo en cualquier bloque impide publicar un resumen parcial como si fuera completo. Si el guardado se confirma y falla el refresco, se comunica guardado confirmado y se exige recargar antes de una nueva sustitución. Un borrador conserva contenido e identidad de operación ante error, cambio de idioma/tema o cruce de fecha; tras ese cruce debe revalidarse y nunca se mueve el registro a otra fecha silenciosamente.

## Diseño y estados de pantalla

Referencias recibidas e inspeccionadas: [rutinas](../design/routines/README.md) y [metas](../design/goals/README.md). Sus documentos registran las diferencias con el alcance: navegación, horarios, sesiones guiadas, métricas, rachas y vínculos entre medidas incompatibles. Los exportados orientan composición y recursos; las maquetas no amplían las reglas ni justifican datos ficticios.

Cada recorrido debe cubrir carga, vacío, datos, error y recuperación; validación, guardado, conflicto, archivo y fechas no editables donde correspondan. Las metas vinculadas muestran origen y medida y ofrecen abrir el hábito, sin controles de aporte manual. El detalle de rutina distingue pasos propios, vinculados, obligatorios, opcionales y no elegibles. Las confirmaciones de archivo explican conservación del historial y bloqueo de escrituras.

Se mantienen catálogos completos es/en, tokens light/dark/system, formateadores Intl con contexto temporal explícito, áreas táctiles de al menos 48 y lectura accesible del progreso. Ningún gráfico depende solo del color. Las referencias se adaptan al sistema existente y no convierten la identidad comercial provisional en definitiva.

## Criterios de aceptación previos a entrega

| Caso                                                                             | Resultado esperado                                                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Hoy, rutina con 2 obligatorios elegibles completos y un opcional pendiente.      | Completada, 2/2; el opcional no bloquea.                                                               |
| Un obligatorio vinculado no está programado en esa fecha.                        | No elegible y fuera del denominador; no se crea un registro del hábito.                                |
| Ningún obligatorio es elegible.                                                  | No evaluable, sin porcentaje ni cumplimiento automático.                                               |
| Se intenta hacer obligatorio un hábito semanal flexible.                         | Validación explicada; puede vincularse como opcional.                                                  |
| Se intenta registrar ayer desde Rutinas.                                         | Solo lectura, aunque Hábitos aún admita corregir su propio registro.                                   |
| Se corrige ayer un hábito desde Hábitos.                                         | Se actualizan rutina, meta y resumen afectados; los pasos propios de ayer siguen sin editarse.         |
| Se edita hoy la programación de una rutina.                                      | Sigue vigente la anterior hasta la próxima semana de cuenta; el historial no cambia de definición.     |
| Hábito cuantitativo con dos aportes en una fecha.                                | La meta de cantidad recibe el total una sola vez; la meta de días cumplidos recibe como máximo un día. |
| Un mismo hábito alimenta dos metas.                                              | Cada meta aplica su propio inicio y objetivo; no se reparten ni consumen los registros.                |
| Hito vinculado con umbral de 10 días y acumulado de 9.                           | Hito pendiente; no se puede marcar manualmente.                                                        |
| Meta incompleta cuyo límite es hoy.                                              | En curso; vence al empezar mañana en la zona de cuenta.                                                |
| Meta sin fecha límite.                                                           | No vence por omisión.                                                                                  |
| Meta lograda recibe una corrección que la deja bajo objetivo.                    | En curso o vencida según su fecha límite.                                                              |
| Se repite una operación confirmada tras perder la respuesta o cruzar medianoche. | Mismo comprobante, sin duplicado; se vuelve a leer el estado actual.                                   |
| Dos dispositivos sustituyen el mismo total con la misma revisión.                | Uno confirma y el otro recibe conflicto; no se oculta la pérdida de actualización.                     |
| Cambia el horario de verano o el teléfono viaja.                                 | Fechas y ventanas siguen el calendario explícito de cuenta, sin cálculos por horas fijas.              |

Durante la implementación: pruebas puras de reglas y validación, pruebas de contratos/adaptadores y de conservación de formularios, PostgreSQL real para restricciones/RLS/concurrencia, `pnpm check`, compatibilidad y bundles afectados. Revisar visualmente es/en, light/dark/system, textos ampliados e iOS/Android frente a las referencias. Este plan no declara realizadas esas verificaciones de funcionalidades futuras.
