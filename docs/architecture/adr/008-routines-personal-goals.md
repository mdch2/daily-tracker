# ADR-008: definición funcional de rutinas y metas personales

- Estado: aceptada para las reglas descritas; implementación y contratos técnicos pendientes.
- Confirmación: 2026-10-27.

Implementación posterior: Rutinas v1 está implementada localmente según [ADR-009](009-routines-v1.md). Metas personales conserva su definición funcional y continúa sin implementar. Las secciones de pendientes de este ADR registran el contexto previo al cierre de Rutinas.

Ampliación confirmada en la misma fecha: cinco pestañas (Hoy, Hábitos, Rutinas, Metas y Más); un hábito por meta vinculada, reutilizable en varias metas; registro y corrección desde Rutinas solo hoy. La propuesta detallada para estructura, reglas restantes y contratos cliente está en el [plan de rutinas y metas](../routines-goals-plan.md); el diseño de persistencia se documenta en el repositorio backend.

## Contexto

La documentación mantenía abierta la relación entre rutinas, hábitos y objetivos, así como el origen de su progreso. El usuario confirma que las rutinas agrupan pasos propios y hábitos existentes, se completan mediante sus pasos obligatorios y admiten pasos opcionales. Para las metas personales acepta cantidad o hitos, con progreso manual o vinculado a hábitos según la meta, y aprueba las recomendaciones complementarias descritas aquí.

«Metas personales» y «objetivos» designan el mismo concepto de producto; no son módulos distintos. La meta diaria de un hábito cuantitativo sigue siendo parte de su definición y no se convierte automáticamente en una meta personal.

## Decisión

| Concepto      | Responsabilidad                                                                                         | Ejemplo                      |
| ------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Hábito        | Registrar una práctica repetida y evaluar su cumplimiento según su programación y definición histórica. | Leer 20 minutos al día.      |
| Rutina        | Organizar actividades en pasos para realizarlas en cada fecha programada.                               | Prepararme para dormir.      |
| Meta personal | Seguir el avance acumulado hacia un resultado concreto.                                                 | Terminar 12 libros este año. |

### Rutinas

Una rutina tiene nombre, pasos ordenados y programación propia, inicialmente diaria o en días concretos de la semana. El orden es una guía y permite completar los pasos en otra secuencia. Desde Rutinas solo se permite registrar o corregir hoy, según fecha de la cuenta del servidor; las fechas anteriores son de consulta. Hábitos conserva su ventana propia de corrección y sus cambios se reflejan en los pasos vinculados, también al consultar fechas anteriores.

Los pasos pueden ser propios de la rutina o estar vinculados a hábitos existentes. Cada paso es obligatorio u opcional. Una rutina se considera completada cuando se han completado todos sus pasos obligatorios; los opcionales no bloquean ese resultado. Completar la rutina se deriva de sus pasos, sin una confirmación independiente que marque todos sus hábitos como realizados.

Cada fecha programada empieza con los pasos propios pendientes y conserva el historial de fechas anteriores. Los pasos vinculados reflejan el registro del hábito correspondiente a esa fecha, que puede estar ya completado desde otro recorrido.

El vínculo comparte el registro del hábito: registrar o corregir desde Hábitos se refleja en las rutinas correspondientes. Registrar desde una rutina debe utilizar las operaciones del hábito, con las mismas validaciones y confirmación de guardado. No se crea una copia de su cumplimiento. Si el hábito aparece en varias rutinas, sigue existiendo un único estado diario de origen; varios aportes cuantitativos no generan días adicionales.

La rutina no cambia la programación del hábito ni crea obligaciones nuevas en fechas que este no tiene programadas. El detalle de elegibilidad de los pasos vinculados debe resolverse antes de implementar la evaluación, incluidos los hábitos flexibles de X días por semana. Las rutinas no modifican las reglas vigentes de hábitos ni introducen una nueva fórmula de rachas.

### Metas personales

Una meta tiene nombre, descripción opcional, fecha de inicio y fecha límite opcional. Admite dos modalidades:

- **Cantidad:** valor acumulado frente a una cantidad objetivo, con unidad explícita. Por ejemplo, ahorrar 1.000 o leer 12 libros.
- **Hitos:** conjunto de hitos completables, inicialmente con el mismo peso. Por ejemplo, terminar los cuatro módulos de un curso.

Cada meta elige una fuente de progreso: manual o vinculada a un hábito compatible. No se suman ambas fuentes en una misma meta. Inicialmente se admite un hábito por meta vinculada; ese hábito puede contribuir a varias metas sin repartir sus registros. La vinculación utiliza los registros de origen y evita contar el mismo avance otra vez por aparecer también en una rutina.

La compatibilidad depende de lo que realmente mide el hábito. Registrar minutos de lectura puede contribuir a una meta de minutos, pero no permite deducir libros terminados. Las conversiones y asociaciones entre registros e hitos no se infieren automáticamente.

La meta se logra al alcanzar o superar la cantidad objetivo, o al completar todos sus hitos. Las correcciones pueden reducir el progreso y dejar pendiente una meta que antes figuraba como lograda; el estado debe corresponder a los datos confirmados.

Superar la fecha límite sin lograr la meta muestra «vencida» y permite continuar, reprogramar o archivar. La fecha límite es opcional; su ausencia no equivale a vencimiento. El detalle temporal de esos cambios y su historial se cerrará en el contrato de implementación.

### Fechas, datos y responsabilidades

Las fechas de las rutinas y metas usan el calendario y la zona explícita de la cuenta. Idioma, zona del teléfono y viajes no redefinen las fechas de negocio. Se distinguen fechas de calendario e instantes de escritura.

Hábitos conserva la propiedad de sus registros. Rutinas será propietaria de su definición y los registros de sus pasos propios; Metas personales, de su definición, hitos y progreso manual. El progreso vinculado se deriva de los registros de hábitos, sin establecer otra fuente de verdad para esos registros.

Las relaciones deben pertenecer a la misma cuenta. La integración se realizará mediante contratos y puntos de entrada; no mediante imports de infraestructura entre features. La presentación no accede a Supabase directamente. Todas las futuras pantallas mantienen i18n es/en, temas light/dark/system y estados accesibles.

Esta decisión es funcional. No define tablas, RPC ni tipos generados, ni implementa módulos o autoriza cambios remotos. El esquema, restricciones, RLS y pruebas PostgreSQL corresponden exclusivamente a `daily-tracker-supabase`; el móvil documentará los contratos que consuma e importará los tipos generados allí.

## Ejemplos de comportamiento esperado

| Situación                                                                                 | Resultado                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Rutina con dos pasos obligatorios completos y uno opcional pendiente.                     | Rutina completada.                                                                                                                              |
| Rutina con un paso obligatorio pendiente, aunque los opcionales estén completos.          | Rutina pendiente.                                                                                                                               |
| Se completa el último paso obligatorio antes que los anteriores en el orden visual.       | El orden no bloquea el registro; la rutina se completa cuando todos los obligatorios están completos.                                           |
| Un hábito se completa desde Hábitos y está vinculado a dos rutinas de la fecha.           | Ambos pasos reflejan el mismo cumplimiento; los demás pasos conservan su estado.                                                                |
| Comienza una nueva fecha programada.                                                      | Los pasos propios empiezan pendientes; los anteriores conservan su historial y los vinculados consultan el registro de la nueva fecha.          |
| Un hábito no está programado en una fecha de la rutina.                                   | La rutina no crea un registro ni una obligación del hábito para esa fecha; su efecto en la evaluación de la rutina está pendiente de concretar. |
| Meta manual de 1.000 unidades con 400 confirmadas.                                        | Avance de 400/1.000 (40 %), todavía sin lograr.                                                                                                 |
| Meta de cuatro hitos, dos completos.                                                      | Avance de 2/4 (50 %), todavía sin lograr.                                                                                                       |
| El mismo registro de hábito se muestra también en varias rutinas.                         | No aporta varias veces a una misma meta por esas apariciones.                                                                                   |
| Se intenta derivar libros terminados de minutos de lectura.                               | El vínculo no es compatible con esa medida.                                                                                                     |
| Una corrección reduce una meta cuantitativa de 1.000 a 900 frente a un objetivo de 1.000. | Deja de estar lograda; si la fecha límite ya pasó, debe mostrar su vencimiento.                                                                 |
| Pasa la fecha límite de una meta incompleta.                                              | Vencida; se permite continuar, reprogramar o archivar.                                                                                          |

Estos ejemplos especifican resultados para futuras pruebas; no son evidencia de funcionalidades implementadas.

## Alternativas descartadas

- Limitar las rutinas solo a hábitos o solo a pasos propios: el usuario elige admitir ambos.
- Completar una rutina por un mínimo de pasos o por una marca manual independiente: se elige completar todos los obligatorios, con opcionales permitidos.
- Limitar las metas a progreso manual o solo a hábitos: se elige admitir ambas fuentes según la meta, sin mezclarlas dentro de ella.
- Tratar rutina, hábito y meta personal como equivalentes: tienen responsabilidades y evaluaciones distintas.

## Consecuencias y detalles pendientes de implementación

La definición funcional deja de estar abierta. Los módulos siguen pendientes de implementación. Antes de cerrar sus contratos de escritura y evaluación deben resolverse los siguientes detalles, sin presentarlos como reglas ya aprobadas:

- Elegibilidad de pasos vinculados en días no programados y hábitos flexibles; evaluación de rutinas sin pasos obligatorios elegibles y validación de rutinas vacías o con solo opcionales.
- Fecha de inicio de las rutinas y tratamiento de períodos abiertos y cerrados. El registro/corrección desde Rutinas queda confirmado solo para hoy, sin heredar la ventana de siete días de hábitos.
- Vigencia de cambios en pasos, orden, obligatoriedad, programación y vínculos; conservación de la interpretación histórica y efecto del archivo o eliminación de elementos relacionados, sin cascadas destructivas implícitas.
- Medida y alcance temporal de metas vinculadas y correspondencia de registros con hitos. La cardinalidad queda confirmada en un hábito por meta, reutilizable en varias. Distinguir cantidades acumuladas de días cumplidos y de resultados que el hábito no registra.
- Validaciones y límites concretos de nombres, unidades, cantidades, hitos, fechas y precisión; presentación del exceso y redondeo de porcentajes. Definir los casos sin denominador elegible.
- Operaciones de aporte y corrección manual, concurrencia, reintentos y fallos; cambios de objetivo, modalidad, fuente, fecha límite y archivo, con su historial. Las confirmaciones dependen de guardado real y conservan entradas ante errores.

El [plan previo a implementación](../routines-goals-plan.md) propone una resolución concreta para estos detalles. Se revisará junto con el diseño de datos del backend y las referencias recibidas en `docs/design/routines` y `docs/design/goals`, conservando las reglas funcionales aprobadas. La fase actual define la solución antes de implementar módulos o migraciones.
