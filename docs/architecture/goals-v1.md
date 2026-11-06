# Metas personales v1: definición aprobada

Fecha: 2026-10-28. Estado: reglas de producto y alcance visual aprobados; implementación y contratos ejecutables pendientes. [ADR-010](adr/010-personal-goals-v1.md) complementa [ADR-008](adr/008-routines-personal-goals.md) y sustituye las propuestas de Metas del [plan previo](routines-goals-plan.md) donde difieran. Actualización del 30 de octubre: el [contrato técnico de servicios](goals-service-contract.md) queda definido y conciliado con el backend según [ADR-011](adr/011-goal-service-contract.md), sin endpoints implementados.

## Modalidades, fuente y validación

Cada meta pertenece a una cuenta y tiene nombre, descripción opcional, inicio y fecha límite opcional. Admite cantidad acumulada frente a un objetivo positivo, o hitos ordenados de igual peso. Se logra al alcanzar o superar el objetivo o completar todos los hitos.

La fuente se elige al crear: manual o un único hábito propio compatible, sin mezclarlas. Un hábito puede alimentar varias metas sin repartir sus registros. Su aparición en rutinas no multiplica el avance.

| Campo                          | Regla aprobada                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Nombre de meta o hito          | De 1 a 100 caracteres, recortado y no vacío.                                                                |
| Descripción                    | Opcional, hasta 400 caracteres. Ausencia o vacío normalizado a nulo.                                        |
| Unidad de cantidad             | De 1 a 30 caracteres. En cantidad vinculada se toma del hábito; en días cumplidos se localiza al presentar. |
| Hitos                          | De 1 a 30, ordenados y con igual peso.                                                                      |
| Cantidades                     | Hasta tres decimales; máximo 999999999.999 unidades. Representación exacta en milésimas enteras.            |
| Objetivo y aporte cuantitativo | Positivos; una sustitución del total diario admite cero. Sin cantidades negativas.                          |
| Fecha límite                   | Opcional, igual o posterior al inicio. Nulo significa sin vencimiento.                                      |

## Inicio y calendario

Inicio elegido explícitamente, hoy o una fecha futura de la cuenta, sin inicio retroactivo. Las fechas se resuelven con reloj servidor y calendario explícito de la cuenta; idioma, zona del teléfono y viajes no las redefinen.

Una meta vinculada creada hoy incluye todo el registro del hábito de hoy, aunque se haya guardado antes de crear la meta. Una que empiece en el futuro acumula desde esa fecha. No se importan fechas anteriores al inicio ni se introduce un saldo inicial sin fecha; una cantidad inicial manual puede registrarse como aporte de hoy.

El vencimiento se produce al comenzar la fecha siguiente al límite en la zona de cuenta, no sumando 24 horas a un instante. La fecha límite no corta la acumulación ni bloquea el registro: permite continuar, reprogramar o archivar.

## Progreso manual

### Cantidades

Sumar un aporte positivo al total de una fecha y sustituir ese total son operaciones distintas. El acumulado suma los totales diarios confirmados desde el inicio, sin sumar de nuevo los comprobantes de operación. Una reducción se expresa corrigiendo un total, incluido cero.

Registrar o corregir exige una fecha entre `max(inicio, D−7)` y `D`, ambos incluidos, donde `D` es hoy en la cuenta. La meta debe estar sin archivar. El historial anterior sigue consultable, sin corrección fuera de esa ventana.

### Hitos

Se permite confirmar un hito, corregir su fecha o revertirlo durante toda la meta sin archivar. Tanto la fecha confirmada como una nueva fecha de cumplimiento deben pertenecer al intervalo entre inicio y hoy. No se aplica la ventana de siete días de las cantidades: un hito antiguo puede corregirse o revertirse.

Cada cambio conserva historial, incluidos la fecha anterior y el resultado de una reversión. Ausencia, pendiente explícito y lectura fallida no se confunden. Un hito incompleto no aporta una fracción de su peso.

## Progreso vinculado

Cada meta fija una de estas medidas al crear:

- **Cantidad acumulada:** suma de los totales diarios confirmados de un hábito cuantitativo, incluidos los parciales bajo su mínimo diario. La unidad es exactamente la del hábito, sin conversiones.
- **Días cumplidos:** fechas distintas con cumplimiento según la definición histórica del hábito, como máximo un día por fecha. Compatible con hábitos binarios y cuantitativos; objetivo y umbrales son enteros. No se confunde el cumplimiento semanal de un hábito flexible con una obligación diaria nueva.

En cantidad se compara la medida con el objetivo. En hitos se fijan umbrales positivos estrictamente crecientes sobre esa medida, y se completan automáticamente al alcanzarlos. Una corrección puede volver a dejarlos pendientes. No se marcan manualmente hitos vinculados.

Por ejemplo, 5, 10 y 20 días de estudio pueden ser umbrales automáticos. Terminar un módulo exige registro manual salvo que el hábito mida precisamente ese resultado. Páginas no equivalen a libros, sesiones no equivalen a días y cantidad acumulada no equivale a un récord de distancia.

La ventana incluye desde el inicio hasta hoy, o hasta la fecha de archivo inclusive. Un fallo de lectura deja el progreso no disponible, sin convertirlo en cero. El cálculo de Hábitos se reutiliza mediante su contrato; no se duplica en Metas. Un exceso del rango representable debe comunicarse sin truncamiento silencioso ni impedir registrar el hábito de origen.

## Estados y presentación del avance

Prioridad de estados: archivada, programada (inicio futuro), lograda, vencida (límite pasado sin lograr) y en curso. Una meta lograda sigue admitiendo progreso mientras no se archive. Una corrección o un aumento de objetivo puede devolverla a en curso o vencida.

En cantidad se presenta acumulado/objetivo; en hitos, completados/total. El porcentaje entero se trunca hacia abajo y la barra se limita a 100 %, conservando visible el valor real con su exceso. Nunca se muestra 100 % antes de lograrla por efecto del redondeo.

## Edición e historial

Nombre, descripción, fecha límite y objetivo cuantitativo se editan inmediatamente, conservando historial de cambios. Se puede quitar la fecha límite o reprogramarla a una fecha igual o posterior al inicio. Bajar el objetivo puede lograr la meta; subirlo puede reabrirla, sin alterar los registros de origen.

Inicio, modalidad, fuente, unidad, hábito y medida vinculada quedan fijos. También los hitos, su orden y sus umbrales. Cambiarlos exige crear otra meta; no se reinterpreta el historial.

## Archivo

Archivar bloquea registros manuales y cambios de configuración, conserva el historial y mantiene la meta consultable. V1 no permite restauración ni eliminación definitiva, y nunca elimina el hábito de origen.

Una meta vinculada archivada sigue leyendo los registros hasta la fecha completa de archivo, inclusive. Puede cambiar por correcciones permitidas de fechas incluidas y por registros del hábito posteriores al instante de archivo dentro de ese mismo día. Desde el día siguiente no acumula nuevas fechas. El archivo no certifica un resultado congelado; debe explicarse al confirmar y consultar el archivo.

## Alcance visual aprobado

La [referencia de Metas](../design/goals/README.md) aporta composición y tarjetas, adaptadas a los tokens y componentes existentes. El recorrido incluye listado con filtros y conteos reales por estado, creación, detalle, historial, registro manual, edición y archivo. Los hitos pendientes se muestran en el detalle de cada meta.

Quedan fuera de v1 el resumen de próximos hitos entre metas, categorías, pronósticos de riesgo/ritmo, avance global ponderado, comparaciones mensuales, alineación semanal, fechas límite por hito, rachas y subprogreso no medido. No se generan datos ficticios para conservar bloques de la maqueta.

La pestaña Metas se incorpora con el recorrido completo, entre Rutinas y Más: Hoy, Hábitos, Rutinas, Metas y Más. No genera una obligación diaria en Hoy. Las metas vinculadas muestran hábito y medida y ofrecen abrir el hábito, sin aporte manual.

Se mantienen es/en, light/dark/system, preferencias persistentes, formateadores compartidos con contexto temporal explícito y áreas táctiles mínimas de 48. Carga, vacío, error, validación, guardado, conflicto y recuperación deben tener comportamiento accesible y conservar entradas. La revisión visual real sigue pendiente de implementación.

## Trabajo técnico pendiente

El backend conserva la propiedad exclusiva de esquema, restricciones, autorización y pruebas PostgreSQL. Su documentación se ha conciliado en `docs/goals-v1.md` con esta aprobación: descripción de 400, hitos manuales sin corte de siete días, inclusión del día inicial completo y archivo por fecha completa. Este documento no define tablas ni RPC disponibles.

El [contrato de servicios](goals-service-contract.md) concreta firmas y respuestas, códigos de error, revisiones, historial paginado y lecturas coherentes de progreso/conteos. Se mantienen pertenencia por cuenta, operaciones atómicas e idempotentes, conflicto en sustituciones obsoletas, comprobantes que no sustituyen el estado vigente, conservación de borradores y distinción entre guardado confirmado y refresco fallido. Queda implementarlo y verificarlo, sin preguntas de producto pendientes para iniciar v1.

El móvil consumirá contratos mediante su feature y bootstrap, con TanStack Query por usuario. Las escrituras de Hábitos y el cambio de fecha de cuenta invalidarán Metas. Los tipos solo se generarán desde PostgreSQL en backend y se importarán en móvil. Sin cambios remotos, nuevas dependencias ni implementación del módulo en esta entrega documental.

## Casos de aceptación para la implementación

| Caso                                                                       | Resultado esperado                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Descripción de 400 caracteres / 401.                                       | La primera es válida; la segunda se rechaza sin guardar parcialmente.    |
| Cantidad manual: fecha D−7 / D−8, ambas posteriores al inicio.             | La primera es editable; la segunda solo consultable.                     |
| Hito manual confirmado hace un mes, con meta sin archivar.                 | Puede corregirse o revertirse, preservando historial.                    |
| Hito con fecha anterior al inicio o futura.                                | Rechazo sin cambio parcial.                                              |
| Meta vinculada creada hoy después de registrar el hábito.                  | Incluye el registro de hoy una sola vez.                                 |
| Hábito cuantitativo con varios aportes y total bajo su mínimo.             | Cantidad acumulada recibe su total; días cumplidos no aumenta.           |
| Un hábito alimenta dos metas y aparece en varias rutinas.                  | Cada meta aplica su ventana sin multiplicar ni repartir registros.       |
| Se reduce el acumulado bajo el umbral de un hito vinculado.                | El hito vuelve a pendiente automáticamente.                              |
| Una corrección reduce el progreso de una meta lograda.                     | En curso o vencida según el límite; sin logro persistido contradictorio. |
| Se archiva una meta y después se registra su hábito ese día.               | El progreso vinculado refleja el nuevo total de esa fecha.               |
| Se registra el hábito el día siguiente al archivo.                         | Esa fecha no contribuye a la meta archivada.                             |
| Se intenta editar o registrar manualmente tras archivar.                   | Rechazo; el historial sigue disponible.                                  |
| Se repite un aporte confirmado o hay dos sustituciones con igual revisión. | Sin duplicación; conflicto para la sustitución obsoleta.                 |
| Falla una lectura o el refresco tras guardar.                              | No se presenta cero ni se reenvía como nuevo un guardado confirmado.     |

Estos casos son requisitos para pruebas futuras, no evidencia de ejecución de Metas. La implementación requerirá pruebas de dominio, contratos, formularios y PostgreSQL real, checks del repositorio y revisión visual iOS/Android en ambos idiomas y modos de tema.
