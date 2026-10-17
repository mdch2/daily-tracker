---
name: supabase-development
description: Crear o corregir integración Supabase de Daily Tracker, incluyendo migraciones PostgreSQL, RLS, repositorios, Auth y tipos; usar data-management para semántica del contrato y habit-management para recurrencias.
---

# Desarrollo con Supabase

## Activación

Usar ante cambios de SQL, permisos, consultas, adaptadores Supabase o ciclo de sesión. No activar para ajustes visuales sin cambios de integración.

## Procedimiento

1. Leer docs/architecture/supabase.md y data-model.md. Comparar migraciones y database.types.ts. Determinar si se trabaja sobre local o remoto; no asumir autorización para producción.
2. Escribir una migración incremental con restricciones, propiedad, índices necesarios, privilegios de columnas y políticas por operación. Impedir referencias entre propietarios distintos con una restricción verificable.
3. Mantener funciones privilegiadas pequeñas, search_path fijo y ejecución revocada al cliente cuando corresponda. No autorizar mediante metadatos editables del usuario.
4. Añadir pruebas SQL transaccionales en supabase/tests/database para dueño, otro usuario y anónimo; verificar lecturas, escrituras y transferencia de propiedad.
5. Ejecutar pnpm db:start y, solo sobre una instancia local descartable, pnpm db:reset y pnpm db:test. Si Docker falla, indicar la comprobación pendiente; no sustituir RLS por mocks.
6. Ejecutar pnpm db:types contra el esquema migrado. El script conserva el archivo previo ante fallo. Validar y transformar filas externas en el adaptador.
7. En Auth comprobar SecureStore, refresh en foreground, limpieza de listeners y caché al cambiar usuario, errores sin tokens y URLs permitidas. Probar confirmación y recuperación PKCE en development build y en el dispositivo que inició el flujo.

## Verificación

- El esquema se reproduce desde cero y las pruebas SQL aíslan datos por usuario.
- No hay claves privilegiadas en variables públicas, aplicación o fixtures.
- El cliente no puede cambiar propiedad ni timestamps del servidor.
- El informe distingue pruebas ejecutadas, tipos realmente generados y verificaciones bloqueadas.
