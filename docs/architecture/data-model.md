# Contrato de datos consumido por la app

El esquema y su diseño detallado pertenecen exclusivamente a [mdch2/daily-tracker-supabase](https://github.com/mdch2/daily-tracker-supabase), en docs/data-model.md. Este repositorio no define migraciones, RLS, SQL ni configuración backend.

La app consume profiles mediante ProfileRepository: id, displayName opcional y timeZone opcional. El adaptador transforma nombres del servicio y valida filas con Zod antes de entregarlas a presentación.
ProfileRepository confirma el calendario inicial mediante RPC y consulta el contexto del servidor; no ofrece edición posterior del calendario. No se replican contraseñas, email ni tokens Auth en modelos de tablas.
La ausencia de un perfil se distingue de un fallo de consulta; la zona nula no autoriza a inferir una política de negocio.
La zona de negocio es una zona IANA elegida para la cuenta, compartida entre dispositivos y sin cambio automático al viajar o cambiar la zona del teléfono. La primera entrega confirma explícitamente zona e inicio de semana lunes/domingo; los cambios manuales posteriores siguen aplazados. Véase [hábitos](habits.md) y ADR-007 del backend.

HabitRepository consume hábitos, su definición inicial inmutable y el estado diario confirmado, y registra operaciones por RPC con idempotencia y revisión. Los contratos de rutinas, objetivos y diario siguen pendientes.
Dashboard, calendario y estadísticas consumirán las mismas reglas y registros; el idioma de presentación no redefine fechas ni historial.

El único artefacto del esquema permitido en el móvil es src/infrastructure/supabase/database.types.ts.
El backend lo genera desde PostgreSQL; pnpm db:types en móvil **solo importa** el resultado. No se debe editar a mano.
El artefacto actual está generado desde PostgreSQL local e importado desde backend, sin edición manual. Las referencias al snapshot inicial se conservan únicamente como historial de la separación. Véase [límites y estado](repository-boundaries.md).
