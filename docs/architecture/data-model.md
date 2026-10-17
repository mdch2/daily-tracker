# Contrato de datos consumido por la app

El esquema y su diseño detallado pertenecen exclusivamente a [mdch2/daily-tracker-supabase](https://github.com/mdch2/daily-tracker-supabase), en docs/data-model.md. Este repositorio no define migraciones, RLS, SQL ni configuración backend.

La app consume profiles mediante ProfileRepository: id, displayName opcional y timeZone opcional. El adaptador transforma nombres del servicio y valida filas con Zod antes de entregarlas a presentación.
No hay escrituras de perfiles implementadas en esta base. No se replican contraseñas, email ni tokens Auth en modelos de tablas.
La ausencia de un perfil se distingue de un fallo de consulta; la zona nula no autoriza a inferir una política de negocio.

Los futuros hábitos, rutinas, objetivos y diario se definirán con contratos de caso de uso y cambios de esquema en backend.
Dashboard, calendario y estadísticas consumirán las mismas reglas y registros; el idioma de presentación no redefine fechas ni historial.

El único artefacto del esquema permitido en el móvil es src/infrastructure/supabase/database.types.ts.
El backend lo genera desde PostgreSQL; pnpm db:types en móvil **solo importa** el resultado. No se debe editar a mano.
El snapshot manual inicial aún está identificado como tal: Docker impide obtener el primer artefacto generado. Véase [límites y estado](repository-boundaries.md).
