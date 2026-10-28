# Referencias de diseño: metas personales

Exportados recibidos e inspeccionados el 27 de octubre de 2026: [captura](screen.png), [HTML original](code.html) y [sistema visual](DESIGN.md). Se conservan sin reformatear, como las referencias de Home. La inspección corresponde a los archivos de diseño, no a una pantalla implementada.

Reglas aprobadas: [ADR-008](../../architecture/adr/008-routines-personal-goals.md). Recorridos, estados y propuesta detallada: [plan de rutinas y metas](../../architecture/routines-goals-plan.md).

El diseño debe cubrir listado y filtros, creación de cantidad o hitos, elección de fuente manual o de un hábito, detalle e historial, registro manual, edición y archivo. Las metas vinculadas muestran su hábito y medida de origen y no ofrecen aporte manual.

Mostrar inicio y fecha límite opcional, avance real y estados programada, en curso, lograda, vencida y archivada según la propuesta. Incluir carga, vacío, error, guardado y conflicto. El vencimiento permite continuar o reprogramar.

La navegación prevista tiene cinco pestañas: Hoy, Hábitos, Rutinas, Metas y Más. Se mantienen es/en, light/dark/system, tokens semánticos, áreas táctiles de al menos 48 y progreso legible sin depender del color.

## Adaptación funcional prevista

La referencia aporta tarjetas, barras y segmentos de avance, resumen y listado de hitos, con Manrope, superficies oscuras y acento lima. Se adapta a los componentes y tokens existentes.

| Elemento de la referencia                                                   | Tratamiento en el alcance propuesto                                                                                                                                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Título «Goals», etiqueta accesible «Crear Rutina» y pestaña Rutinas activa. | Títulos/etiquetas de Metas traducidos y pestaña Metas activa en la navegación aprobada.                                                                                            |
| «Avance global ponderado», +9 % mensual y «alineación semanal».             | No mezclar metas de unidades diferentes ni inventar ponderaciones o comparaciones sin contrato. Puede mostrarse conteo real de metas por estado, cuando se lean todas las páginas. |
| Estado «En riesgo» o «En ritmo».                                            | Usar los estados definidos: programada, en curso, lograda, vencida y archivada. Sin pronósticos automáticos.                                                                       |
| Categorías y filtros Q1/Anual 2025.                                         | Inicialmente filtros de estado con conteos reales; categorías y horizontes fijos no crean campos nuevos. Fechas localizadas del registro.                                          |
| Libros terminados vinculados a páginas leídas.                              | No inferir libros a partir de páginas; registrar libros manualmente o vincular un hábito que mida libros.                                                                          |
| Media maratón basada en distancia máxima.                                   | Un máximo o récord no equivale a cantidad acumulada. Esa meta se registra con hitos manuales; no se deriva de la suma de kilómetros ni de días de ejercicio.                       |
| Sesiones de meditación y «días acumulados».                                 | Diferenciar cantidad de sesiones y días cumplidos. Varias sesiones en una fecha no generan varios días.                                                                            |
| Hitos de racha, porcentajes de constancia y capítulo/libro actual.          | No incorporar reglas de rachas, subprogreso o métricas sin datos y contrato.                                                                                                       |
| Hitos con fechas propias.                                                   | Mostrar orden/umbrales o estado confirmado; fechas límite por hito no están definidas en este alcance.                                                                             |

La captura no incluye todos los formularios, configuración de la fuente, registro manual, archivo ni estados de fallo. Esos recorridos se definirán con los patrones existentes y el contrato antes de implementar. La comprobación de contraste, textos ampliados y es/en en light/dark/system queda pendiente en la interfaz real.

Una imagen no modifica los contratos de datos. Las diferencias anteriores se revisan junto con el plan funcional antes de implementar.
