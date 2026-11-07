---
name: supabase-development
description: Integrar Supabase en el cliente Daily Tracker, mantener Auth y tipos y coordinar cambios de esquema exclusivamente en daily-tracker-supabase. Usar data-management para semántica y habit-management para recurrencias.
---

# Desarrollo con Supabase

## Activación

Usar ante consultas, adaptadores, Auth, actualización de tipos o cambios que requieran coordinar esquema/permisos con el backend. No activar para ajustes visuales sin cambios de integración.

## Procedimiento

1. Leer docs/architecture/repository-boundaries.md, supabase.md y el contrato data-model.md. Identificar el checkout y sus instrucciones: no crear SQL, migraciones, RLS, seeds, funciones o configuración backend dentro del móvil.
2. Si cambia el esquema, realizar el trabajo exclusivamente en daily-tracker-supabase tras leer su AGENTS.md. Si no está accesible, documentar el contrato requerido y el bloqueo; no crear una migración temporal en el móvil.
3. En backend, definir restricciones y RLS, funciones privilegiadas pequeñas con search_path fijo y pruebas reales de dueño/otro usuario/anónimo. Ejecutar los comandos de ese repositorio; no asumir autorización para cambios remotos ni reemplazar RLS por mocks.
4. Generar types/database.types.ts en backend desde PostgreSQL; después ejecutar pnpm db:types en móvil para importar el artefacto. No editar tipos a mano ni llamar al generador SQL desde el cliente. Un fallo debe conservar el archivo anterior y quedar informado.
5. Mantener consultas y transformación de filas en los adaptadores cliente. Los componentes consumen contratos; no traducir mensajes del servidor sin control ni exponer tokens. Presentación traduce claves de error y validación a es/en.
6. En Auth comprobar SecureStore, refresh en foreground, limpieza de listeners/caché y URLs permitidas. Preferencias de tema/idioma son independientes de la sesión. Probar correo PKCE en development build y en el dispositivo que inició el flujo.

## Verificación

- pnpm check:boundaries pasa en móvil. La reproducción del esquema y las pruebas SQL tienen evidencia del repositorio backend.
- No hay claves privilegiadas en variables públicas, aplicación o fixtures.
- El cliente no puede cambiar propiedad ni timestamps del servidor.
- El informe distingue pruebas ejecutadas, tipos realmente generados y verificaciones bloqueadas.
