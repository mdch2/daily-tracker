# Contrato de datos consumido por la app

El esquema y su diseño detallado pertenecen exclusivamente a [mdch2/daily-tracker-supabase](https://github.com/mdch2/daily-tracker-supabase), en docs/data-model.md. Este repositorio no define migraciones, RLS, SQL ni configuración backend.

La app consume profiles mediante ProfileRepository: id, displayName opcional y timeZone opcional. El adaptador transforma nombres del servicio y valida filas con Zod antes de entregarlas a presentación.
ProfileRepository confirma el calendario inicial mediante RPC y consulta el contexto del servidor; no ofrece edición posterior del calendario. No se replican contraseñas, email ni tokens Auth en modelos de tablas.
La ausencia de un perfil se distingue de un fallo de consulta; la zona nula no autoriza a inferir una política de negocio.
La zona de negocio es una zona IANA elegida para la cuenta, compartida entre dispositivos y sin cambio automático al viajar o cambiar la zona del teléfono. La primera entrega confirma explícitamente zona e inicio de semana lunes/domingo; los cambios manuales posteriores siguen aplazados. Véase [hábitos](habits.md) y ADR-007 del backend.

HabitRepository consume hábitos con updatedAt y versiones de definición por effectiveFrom, además del estado diario confirmado. El nombre cambia inmediatamente; frecuencia y mínimo cuantitativo desde la próxima semana de la cuenta, conservando unidad, modalidad y calendario. `rename_habit` y `edit_habit` reciben UUID de operación y updatedAt observado; el segundo devuelve la fecha efectiva autoritativa. Las correcciones resuelven la definición de su fecha. Véase [ADR-007](adr/007-habit-editing.md).

Las definiciones funcionales de rutinas y metas personales (objetivos) están aprobadas en [ADR-008](adr/008-routines-personal-goals.md). Las rutinas agrupan pasos propios y hábitos existentes, con cumplimiento derivado de sus pasos obligatorios y registro desde Rutinas solo hoy. Las metas admiten cantidad o hitos y una fuente de progreso por meta: manual o vinculada a un hábito compatible, reutilizable en varias metas. Los vínculos reutilizan los registros de hábitos, sin duplicar su cumplimiento ni sumar otra vez el mismo avance por aparecer en una rutina. El [plan previo a implementación](routines-goals-plan.md) conserva las propuestas aún no implementadas de Metas; el móvil no define un esquema backend.
Rutinas ya consume el [contrato v1](routines.md): sus estados propios se guardan mediante operaciones atómicas/idempotentes con revisión, mientras los vínculos leen los registros originales de Hábitos. Conserva definiciones con vigencia y archivo sin cascadas. Su esquema y autorización están implementados exclusivamente en backend según `docs/routines-v1.md`; los tipos fueron generados desde PostgreSQL local e importados en móvil. Metas personales y Diario siguen sin contrato ejecutable.

Dashboard, calendario y estadísticas consumirán las mismas reglas y registros; el idioma de presentación no redefine fechas ni historial.

El único artefacto del esquema permitido en el móvil es src/infrastructure/supabase/database.types.ts.
El backend lo genera desde PostgreSQL; pnpm db:types en móvil **solo importa** el resultado. No se debe editar a mano.
El artefacto actual está generado desde PostgreSQL local e importado desde backend, sin edición manual. Las referencias al snapshot inicial se conservan únicamente como historial de la separación. Véase [límites y estado](repository-boundaries.md).
