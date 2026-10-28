# Referencias de diseño: rutinas

Exportados recibidos e inspeccionados el 27 de octubre de 2026: [captura](screen.png), [HTML original](code.html) y [sistema visual](DESIGN.md). Se conservan sin reformatear, como las referencias de Home. La [implementación v1](../../architecture/routines.md) cubre listado activo/archivado, creación, edición, detalle, registro de hoy, historial y archivo; las limitaciones de revisión visual se registran en [validation.md](../../architecture/validation.md).

Reglas aprobadas: [ADR-008](../../architecture/adr/008-routines-personal-goals.md). Recorridos, estados y propuesta detallada: [plan de rutinas y metas](../../architecture/routines-goals-plan.md).

El diseño debe cubrir listado, creación con pasos propios y hábitos existentes, detalle/ejecución de hoy, historial de solo lectura y edición con fecha efectiva visible. Debe distinguir pasos obligatorios, opcionales y no programados, así como carga, vacío, error, guardado y conflicto.

La navegación prevista tiene cinco pestañas: Hoy, Hábitos, Rutinas, Metas y Más. Se mantienen es/en, light/dark/system, tokens semánticos, áreas táctiles de al menos 48 y progreso legible sin depender del color. El orden de los pasos es orientativo.

## Adaptación funcional implementada

La referencia aporta tarjetas oscuras, Manrope, acento lima, un listado de pasos y una barra de progreso. Se adapta a los componentes y tokens existentes; no define una identidad comercial nueva.

| Elemento de la referencia                                          | Tratamiento en el alcance propuesto                                                                                          |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Navegación con Progreso.                                           | Hoy, Hábitos, Rutinas y Más. Metas se añadirá al implementarla, completando las cinco pestañas aprobadas.                    |
| Filtros Mañana/Tarde/Noche, horario y «momento actual».            | No añadir franjas horarias, reloj de ejecución ni campos de horario sin cerrar otro alcance; usar fecha y programación real. |
| «4 hábitos encadenados».                                           | Distinguir pasos propios y hábitos vinculados, obligatorios y opcionales.                                                    |
| «Continuar sesión guiada», paso «en curso» y duraciones estimadas. | Abrir el detalle de hoy y permitir cualquier orden. Sin temporizador, bloqueo secuencial ni estimaciones no registradas.     |
| «2 de 4 (50 %)».                                                   | Derivar el conteo solo de obligatorios elegibles; mostrar opcionales aparte y no evaluable si el denominador es cero.        |
| Rachas, constancia y «+24 % de cumplimiento».                      | Omitir métricas sin contrato implementado; no usar valores de la maqueta como datos.                                         |
| Recordatorio y acción «Programar».                                 | La programación de días vive en el formulario; no implica notificaciones.                                                    |
| Banners con imágenes remotas.                                      | Se omiten los banners ilustrativos; la interfaz usa recursos locales y los tokens existentes.                                |

La captura no incluye los formularios completos de creación/edición ni todos los estados de error, vacío o accesibilidad. Se implementan con los patrones existentes, el panel compartido `Sheet` y el contrato v1, sin añadir dependencias. Las pruebas cubren es/en, light/dark/system, progreso accesible, fallo de lectura, conservación del borrador/reintento y registro vinculado mediante Hábitos. La comprobación visual nativa, textos ampliados y lectores de pantalla sigue pendiente.

Una imagen no modifica los contratos de datos. Las diferencias anteriores se revisan junto con el plan funcional antes de implementar.
