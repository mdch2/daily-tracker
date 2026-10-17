---
name: architecture-guardian
description: Revisar límites de módulos, dependencias y flujo de datos de Daily Tracker ante cambios transversales o revisiones de arquitectura; no activar para cada edición local trivial.
---

# Revisión de arquitectura

## Activación

Usar al añadir integraciones o dependencias entre módulos, sustituir persistencia, mover responsabilidades entre capas o solicitar una revisión arquitectónica.

## Procedimiento

1. Leer docs/architecture/README.md y los ADR afectados. Identificar entradas públicas, propietario de escrituras y consumidores reales.
2. Seguir un recorrido desde la ruta hasta persistencia. Comprobar que src/bootstrap compone adaptadores y presentación consume contratos; dominio no debe conocer Supabase.
3. Buscar imports hacia infraestructura de otra feature, ciclos y estado remoto duplicado en Zustand. Revisar imports relativos: ESLint solo cubre límites básicos.
4. Para cada abstracción nueva, identificar qué dependencia permite sustituir o qué consumidor real comparte. Proponer la alternativa más pequeña si no aporta un límite útil.
5. Clasificar hallazgos con archivo, disparador, efecto y corrección mínima. Distinguir preferencia estructural y regresión verificable. Una revisión no autoriza refactorizaciones ajenas.
6. Actualizar el ADR si cambia una decisión duradera, preservando los motivos anteriores.

## Verificación

- Las reglas se pueden probar sin React Native ni Supabase.
- El flujo tiene un propietario de datos y permite reemplazar un adaptador sin cambiar las reglas.
- El informe indica evidencia concreta y límites no comprobados.
