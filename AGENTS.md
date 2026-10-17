# Daily Tracker: instrucciones del proyecto

## Contexto y alcance

Aplicación móvil MVP para iOS/Android, nombre comercial provisional. Stack y base técnica implementados; módulos de hábitos, rutinas, objetivos, calendario, estadísticas y diario todavía pendientes. Documentación en español; código e identificadores en inglés.

Lee [README.md](README.md), [arquitectura](docs/architecture/README.md) y [decisiones pendientes](docs/decisiones-pendientes.md) antes de modificar contratos. No implementes módulos completos ni una identidad visual sin una tarea y referencias que los autoricen. El acceso sin registro sigue abierto; la autenticación actual es un recorrido técnico provisional.

## Stack y comandos

- Expo SDK 58, React Native 0.88, React 19.3, Expo Router y TypeScript strict.
- Android mínimo: **Android 11 (API 30)**. `expo-build-properties` fija `minSdkVersion: 30`, `compileSdkVersion: 37` y `targetSdkVersion: 36` en app.json para Expo 58. Al actualizar Expo, revisa su matriz y el requisito vigente de Google Play; verifica el prebuild Android y no bajes el mínimo del producto. Expo Go no comprueba este límite de la aplicación.
- **Usa pnpm exclusivamente**; versión fijada en packageManager, Node en .nvmrc. Conserva pnpm-lock.yaml. No generes otros lockfiles.
- Desarrollo: pnpm start, pnpm android, pnpm ios (simulador iOS requiere macOS).
- Calidad: pnpm lint, pnpm format:check, pnpm typecheck, pnpm test; pnpm check agrupa los cuatro.
- Formato: pnpm format. Backend: pnpm db:start, pnpm db:reset, pnpm db:test, pnpm db:types. reset destruye los datos de la instancia **local**.
- Verifica compatibilidad con pnpm exec expo install --check; instala módulos nativos con pnpm exec expo install <paquete> --pnpm.

## Arquitectura y convenciones

- Feature-First + Clean Architecture pragmática + monolito modular. src/app solo compone rutas delgadas; src/bootstrap conecta adaptadores y proveedores.
- src/features/<feature> posee sus escrituras. Domain contiene tipos/reglas/contratos independientes de React, Expo y Supabase. Application valida y orquesta. Infrastructure adapta proveedores. Presentation presenta estados y navegación. Crea solo capas con responsabilidad real.
- No importes infraestructura de una feature desde otra o desde presentación. Consume contratos y puntos de entrada; evita ciclos. No lleves Supabase a componentes.
- TanStack Query posee datos remotos; Zustand solo preferencias/estado global de interfaz; React para estado local. La sesión la posee Supabase Auth y el contexto solo proyecta identidad/estado.
- Dashboard, calendario y estadísticas compartirán las reglas de origen. No dupliques cumplimiento, progreso ni métricas.
- Usa alias @/ para src, nombres descriptivos, funciones pequeñas y composición. Pruebas *.test.ts(x) junto al módulo o en tests/. Mantén el formato del repositorio.
- Justifica cada dependencia nueva con una necesidad actual. No agregues motores offline, servicios, capas vacías ni optimizaciones hipotéticas.
- Tokens neutrales en shared/theme son provisionales; espera referencias de Stitch. Extrae componentes por semántica y consumidores reales.

## Datos y seguridad

- PostgreSQL es la fuente de verdad sincronizada. Contratos de repositorio permiten un adaptador SQLite futuro; hoy no hay soporte offline ni sincronización bidireccional.
- Solo claves sb_publishable_ en EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY; nunca service_role, sb_secret_, contraseñas ni tokens en código, logs o fixtures.
- .env queda fuera de Git; .env.example permanece sin valores reales. Las variables EXPO_PUBLIC_ se empaquetan y son públicas.
- Sesión nativa cifrada en SecureStore; nunca pasar a almacenamiento sin cifrar ante fallos. No usar contenido de diario real en pruebas.
- Toda tabla expuesta necesita RLS y permisos mínimos, con pruebas reales de propietario, otro usuario y anónimo. Las rutas protegidas no sustituyen autorización del backend.
- SQL versionado en supabase/migrations; esquema actual y diseño preliminar en docs/architecture/data-model.md. No apliques migraciones remotas sin una tarea que lo autorice.
- Regenera database.types.ts desde PostgreSQL con pnpm db:types; el script conserva el archivo si falla. No presentes snapshots manuales como tipos generados.
- Valida entradas en el límite de escritura y restricciones en PostgreSQL. Distingue nulo, vacío, ausencia y error; no ocultes fallos como datos vacíos.
- Usa UUID estables, instantes timestamptz y fechas de negocio explícitas. No infieras reglas temporales de la zona del equipo. No reinterpretes historial sin contrato.
- Conserva entradas ante fallo, evita duplicados y comunica éxito solo tras guardado confirmado.

## Flujo y calidad

1. Inspecciona estado, instrucciones, decisiones, referencias y código. Define comportamiento observable; resuelve ambigüedades de datos y alcance antes de comprometerlas.
2. Implementa el cambio mínimo completo con estados de carga, vacío, error y recuperación pertinentes. Documenta decisiones duraderas en ADR; conserva las que siguen abiertas.
3. Prueba reglas, validaciones, fechas e integridad en la capa más pequeña útil. Para seguridad usa PostgreSQL real, no solo mocks. Reloj y zona explícitos si afectan resultados.
4. Ejecuta pnpm check y los checks adicionales afectados (SQL, compatibilidad o bundle). Revisa diff, privacidad, accesibilidad y dependencias. Verifica visualmente las pantallas modificadas si hay entorno.
5. Informa cambios, evidencia y limitaciones reales. No declares checks exitosos sin ejecutarlos. No añadas frameworks para verificar solo documentación.

## Skills especializadas

Lee únicamente las pertinentes; cada SKILL.md contiene activación, procedimiento y verificación.

| Skill                                                                  | Uso                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| [architecture-guardian](.agents/skills/architecture-guardian/SKILL.md) | Revisiones de límites, dependencias y cambios transversales. |
| [ui-design](.agents/skills/ui-design/SKILL.md)                         | Pantallas, Stitch, componentes y accesibilidad.              |
| [habit-management](.agents/skills/habit-management/SKILL.md)           | Recurrencias, cumplimiento, rachas e historial.              |
| [data-management](.agents/skills/data-management/SKILL.md)             | Contratos, consistencia y semántica de datos.                |
| [supabase-development](.agents/skills/supabase-development/SKILL.md)   | Migraciones, RLS, Auth, consultas y tipos PostgreSQL.        |
| [testing-quality](.agents/skills/testing-quality/SKILL.md)             | Pruebas, regresiones y revisión de calidad.                  |

No crees feature-development para repetir este flujo; ui-implementation y habit-domain ya están cubiertas por las Skills existentes. Crea otras solo para procedimientos que aporten valor distinto.
