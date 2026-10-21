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
No se añaden algoritmos, contratos de persistencia ni cambios de backend con esta actualización documental.
