# ADR-006: activación de rachas tras tres días

- Estado: aceptada para el umbral y la comunicación previa; elegibilidad y cálculo completo pendientes.
- Fecha: 2026-10-19.

## Contexto

El usuario solicita una fase de avance hacia la racha que indique cuántos días faltan para iniciarla. Tras aclarar el umbral, confirma tres días consecutivos completados: después del primero faltan dos.
Todavía no existen reglas implementadas de recurrencia ni métricas de hábitos.

## Decisión

Una racha se activa al completar tres días consecutivos. Antes de alcanzar el umbral, la interfaz comunica el avance sin presentar una racha activa.
Los siguientes ejemplos se refieren a un hábito diario con cumplimiento confirmado en los días indicados:

| Cumplimiento confirmado | Estado de la racha | Mensaje de referencia                    |
| ----------------------- | ------------------ | ---------------------------------------- |
| Primer día consecutivo  | Aún no activa      | Te faltan 2 días para iniciar una racha. |
| Segundo día consecutivo | Aún no activa      | Te falta 1 día para iniciar una racha.   |
| Tercer día consecutivo  | Activa             | ¡Racha iniciada!                         |

Los mensajes finales pertenecen a los catálogos es/en. Esta decisión fija el umbral y la comunicación previa, no una fórmula para todas las recurrencias.

## Alternativas

Se descarta el umbral de cinco días tras la aclaración explícita del usuario. Mostrar una racha activa desde el primer día tampoco representa la fase previa solicitada.

## Consecuencias

Dashboard, detalle de hábito y estadísticas deberán consumir la misma regla cuando se implemente el dominio.
Antes de implementar el cálculo completo deben definirse días elegibles y no programados, interrupciones, períodos abiertos, pausas, correcciones históricas y zona de negocio. No se infieren políticas para esos casos a partir del umbral.
Actualización del 21 de octubre de 2026: el usuario acepta registrar/corregir días anteriores y recalcular estadísticas y rachas afectadas con las reglas históricas, según ADR-005 del backend. Una corrección puede recuperar o reducir una racha; la ventana permite los siete días anteriores, además del día actual, según la fecha de la cuenta; siguen pendientes las fórmulas completas por recurrencia. La zona de negocio se elige por cuenta y no cambia automáticamente al viajar, según ADR-004 del backend.
No se añaden algoritmos, contratos de persistencia ni cambios de backend con esta actualización documental.

Actualización de pausas del 21 de octubre de 2026: el usuario acepta pausar y reanudar conservando historial, con un máximo de tres días calendario consecutivos de pausa, en la zona de la cuenta, para proteger una racha existente, según ADR-006 del backend. La pausa no suma días completados ni activa una racha por sí sola. El usuario delega la elección de calendario frente a días programados; se elige calendario para mantener corto el descanso. Se aprueban duración de 1 a 3 días con inicio incluido, reanudación automática y presupuesto de 3 fechas protegidas por hábito en 30 fechas móviles. Terminar la pausa no rompe la racha a medianoche: vuelve la exigencia del siguiente día programado. Quedan pendientes el efecto semanal y los casos especiales; esta excepción no elimina el umbral de tres días efectivamente completados.
