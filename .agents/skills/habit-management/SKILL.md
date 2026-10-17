---
name: habit-management
description: Definir, implementar o corregir recurrencias, cumplimiento, rachas y métricas de hábitos de Daily Tracker. Usar también cuando calendario o estadísticas cambien estos cálculos; no para ajustes visuales sin efecto en sus reglas.
---

# Reglas de hábitos

## Activación

Aplica a programación de hábitos, registro o corrección de cumplimiento, cálculo de rachas y porcentajes, o cambios de planificación e historial que afecten esos resultados.

## Procedimiento

1. Localiza el contrato vigente y sus consumidores. Antes de cambiar cálculos, determina los tipos de recurrencia y de cumplimiento admitidos, fecha de inicio y fin si existe, zona horaria, períodos evaluables y política de edición. Consulta las decisiones abiertas en `docs/decisiones-pendientes.md`; no conviertas una opción en regla por omisión.
2. Distingue la definición del hábito, su programación y los registros de cumplimiento. Una rutina agrupa actividades según su contrato; no marques automáticamente todos sus hábitos como completados al cambiar el estado de la rutina sin una regla que lo establezca.
3. Modela la elegibilidad de una fecha o período antes de calcular cumplimiento. No confundas una recurrencia por días elegidos con un objetivo de cierta cantidad de veces por semana. No clasifiques como incumplido un período aún abierto salvo que el contrato lo indique.
4. Define cómo se identifica cada ocurrencia y cómo se registra o revierte. Para cumplimiento binario, repetir la misma confirmación no debe incrementar el total; para cantidades, distingue fijar el valor de añadir un evento y trata los reintentos según esa operación.
5. Calcula rachas y métricas desde programación y registros coherentes, con reloj y zona explícitos. Expresa numerador, denominador, ventanas y redondeo; decide qué mostrar cuando no hay períodos elegibles. Evita dividir por cero o tratar automáticamente el futuro como incumplimiento.
6. Al editar recurrencia, pausar, archivar o corregir registros, determina qué fechas cambian y si se preserva la interpretación del pasado. Aplica el contrato a todas las vistas y recalcula los valores derivados afectados; no reinterpretes el historial silenciosamente.
7. Escribe ejemplos de entrada y resultado esperado para las reglas tocadas antes de verificarlas. Usa solo las recurrencias y excepciones ya admitidas o solicitadas; no construyas un motor universal de recurrencias.

## Verificación

- Repetir o revertir una operación produce el resultado definido sin duplicar cumplimiento accidentalmente.
- Los ejemplos cubren, según el cambio, días no programados, período actual, inicio y fin de recurrencia, cambio de mes o año y frontera de medianoche. Incluye horario de verano si la zona admitida lo requiere.
- Una corrección histórica produce resultados compatibles en rachas, calendario, dashboard y estadísticas afectados.
- Los períodos sin datos y los denominadores vacíos tienen un resultado explícito y verificable.
- Las políticas nuevas están registradas como decisiones; los aspectos ajenos al cambio siguen pendientes.
