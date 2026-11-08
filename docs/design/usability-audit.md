# Auditoría de usabilidad y mejora de controles

Fecha: 2026-11-07. Referencia: composiciones Stitch y tokens actuales. Alcance: pantallas existentes; no cambia la identidad visual. Decisiones: [ADR-013](../architecture/adr/013-form-controls-and-goal-rewards.md).

## Matriz de hallazgos y correcciones

| Prioridad | Recorrido          | Hallazgo                                                                   | Corrección y aceptación                                                                                                                                                                          |
| --------- | ------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1        | Calendario inicial | Exigía escribir una zona IANA                                              | Selección con búsqueda en catálogo, desfase actual y sugerencia del teléfono; no guarda zona ni comienzo de semana sin elección explícita.                                                       |
| P1        | Crear/editar Metas | Inicio y vencimiento eran texto ISO                                        | Calendario nativo, etiqueta localizada y límites; inicio sigue siendo inmutable tras crear. Vencimiento se puede quitar explícitamente.                                                          |
| P1        | Registro de Metas  | Fecha de cantidad e hitos escrita manualmente                              | Cantidades entre `max(inicio,hoy−7)` y hoy; hitos entre inicio y hoy. Cambiar idioma/zona del teléfono no cambia fechas.                                                                         |
| P1        | Recordatorios      | Hora y minuto en entradas independientes                                   | Un reloj nativo conserva la hora elegida. Cancelar no modifica el borrador; permisos/errores siguen visibles y recuperables.                                                                     |
| P1        | Metas              | Recompensa personal inexistente                                            | Texto opcional persistido, validado y editable; detalle destacado solo en estado logrado, historial y archivo conservados.                                                                       |
| P2        | Hábitos            | Cantidad semanal abierta a texto inválido                                  | Selector de 1–7, compartido por creación y edición. No cambia el inicio de vigencia ni la evaluación histórica.                                                                                  |
| P2        | Metas/Rutinas      | Vincular hábitos usaba listas de botones; en Metas solo se veía una página | Selector con búsqueda sobre el catálogo completo y estados de carga, vacío, error y reintento; la búsqueda ignora tildes.                                                                        |
| P2        | Metas              | Modalidad y fuente parecían acciones                                       | Selección única accesible, campos condicionados y agrupación de información básica/configuración.                                                                                                |
| P2        | Rutinas            | Obligatoriedad de paso presentada como botón                               | Interruptor con etiqueta accesible, preservando el bloqueo de hábitos semanales flexibles como opcionales.                                                                                       |
| P2        | Formularios        | Se podía cerrar con entrada sin guardar                                    | Confirmación de descarte en creación de Hábitos/Metas/Rutinas y edición; cantidades de Hábitos se conservan al cancelar cierre o cambio de fecha. Las escrituras inciertas mantienen su bloqueo. |
| P2        | Metas              | Validación genérica al final del formulario                                | Errores junto a nombre, descripción, recompensa, unidad, cantidad, hábito, fechas e hitos; foco al primer campo de texto inválido.                                                               |
| P2        | Documentación      | Metas figuraba como no implementada                                        | Actualizados estado actual, contrato consumido y decisiones; se mantienen las limitaciones reales de validación nativa.                                                                          |

## Recorridos revisados sin sustitución de controles

La revisión nativa del 8 de noviembre añadió correcciones de carga de Metas, validación junto a los campos del calendario inicial y lectura del historial con recompensa. Hábitos abre en Semana. El historial de Rutinas abre la semana actual de la cuenta y conserva acceso a semanas anteriores.

- Acceso y recuperación: email con teclado de correo, contraseña oculta/visible, foco entre campos y conservación al cambiar preferencias. Las entradas son apropiadas para texto libre.
- Hoy: búsqueda textual y selección de día mediante la semana existente. No hay una fecha de negocio editable como texto.
- Hábitos: nombres, unidades libres y cantidades con teclado numérico; los días de semana ya son seleccionables. Se conservan sus composiciones y estados actuales.
- Listados y detalles: filtros, progreso accesible, archivo con confirmación, errores y reintento. El progreso se obtiene del dominio/servicio.
- Más y preferencias: idioma/tema seleccionables con persistencia y errores de almacenamiento ya cubiertos por la suite. La revisión no añade un modo de sesión web ni un calendario nuevo.

## Verificación

Pruebas de interacción para abrir/confirmar/cancelar/limpiar, límites temporales, búsqueda, sugerencia explícita, recompensa, descartes y errores. Pruebas de dominio y adaptador para normalización, precisión y RPC v2; PostgreSQL real para propiedad, archivo, historial, idempotencia y clientes v1.

Los resultados ejecutados, revisión visual y límites de dispositivo se registran en [validation.md](../architecture/validation.md). Las pruebas con el límite nativo simulado no verifican la apariencia del calendario/reloj real.
