# Límites permanentes entre repositorios

Decisión obligatoria: dos repositorios independientes, sin compartir fuentes ni convertirlos en monorepo.

| Repositorio                  | Responsabilidad exclusiva                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mdch2/daily-tracker          | App React Native/Expo/TypeScript, UI, navegación, reglas de negocio, casos de uso y adaptadores cliente Supabase. Recibe únicamente database.types.ts como artefacto del esquema. |
| mdch2/daily-tracker-supabase | Esquema PostgreSQL, migraciones, RLS, SQL, funciones, triggers, snippets, seeds, Edge Functions y configuración/infraestructura Supabase.                                         |

La carpeta src/infrastructure/supabase del móvil contiene **cliente y almacenamiento de sesión**, no infraestructura del servidor. Su nombre no autoriza a añadir SQL o configuración del backend.
La app conserva validaciones de entradas y contratos de dominio; no replicas manuales del esquema ni privilegios administrativos.

## Flujo de cambios

1. Leer AGENTS.md del repositorio donde corresponde el trabajo. Un cambio de base se implementa y prueba únicamente en el backend.
2. En backend, revisar migración incremental, integridad, RLS y pruebas reales de propietario, otro usuario y anónimo. No ejecutar un despliegue remoto sin autorización de la tarea.
3. En backend, ejecutar pnpm db:types contra PostgreSQL migrado. El resultado es types/database.types.ts, marcado por el generador; no escribirlo a mano.
4. Entregar/versionar ese artefacto junto al cambio de backend. En móvil, ejecutar pnpm db:types [ruta-del-artefacto]. Sin ruta explícita busca el checkout hermano daily-tracker-supabase/types/database.types.ts.
5. Revisar diff del artefacto y adaptar repositorios/casos de uso consumidores. Ejecutar pnpm check y comprobar compatibilidad del servicio antes de entregar.

El importador móvil solo copia el artefacto y lo sustituye atómicamente; no invoca Supabase CLI, Docker, SQL ni comandos del otro repositorio. Si falta el artefacto o no identifica una generación CLI, falla y conserva el archivo anterior.
La cabecera identifica el proceso esperado; la revisión de procedencia y del diff sigue siendo necesaria. No es una firma criptográfica.
Los despliegues deben conservar contratos compatibles mientras existan clientes anteriores; no acoplar la actualización de la app a una migración destructiva.

## Separación aplicada

Se trasladaron cinco archivos originales, verificando SHA-256 antes de retirar las copias del móvil:

- supabase/config.toml.
- supabase/.gitignore.
- supabase/migrations/20261016000100_profiles.sql.
- supabase/seed.sql.
- supabase/tests/database/profiles.test.sql.

El diseño detallado de esquema vive ahora en docs/data-model.md del backend. El móvil documenta solo el [contrato que consume](data-model.md).
Los comandos db:start, db:reset y db:test se retiraron del móvil y están en backend. La caché local CLI restante se eliminó del móvil; no se movieron datos de una base ni secretos.

pnpm check:boundaries, incluido en pnpm check, rechaza SQL y directorios de infraestructura backend en el móvil. Los imports relativos y la procedencia de los tipos requieren además revisión de arquitectura.

## Estado de verificación: 22 de octubre de 2026

PostgreSQL local está disponible. La migración incremental de hábitos se aplicó en backend; sus pruebas pgTAP, reproducción de migraciones de aplicación y concurrencia se ejecutaron allí. Se generaron tipos con su comando y se importaron en móvil, con igualdad del artefacto. No se aplicaron cambios remotos. El detalle de evidencia está en [validation.md](validation.md).

## Historial: límite durante la separación inicial

Docker no responde. No se aplicaron migraciones ni se generaron tipos desde PostgreSQL.
El archivo database.types.ts preexistente sigue identificado como **snapshot manual histórico** para conservar la compatibilidad del cliente; no se ha presentado como generado ni ampliado. Su sustitución por el primer artefacto real del backend es una deuda explícita bloqueada por PostgreSQL, no una autorización para editar tipos a mano en futuras tareas.

Repositorios: [móvil](https://github.com/mdch2/daily-tracker) y [backend](https://github.com/mdch2/daily-tracker-supabase). El traslado es local; no se creó ni publicó un repositorio remoto.
