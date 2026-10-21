# Decisiones y próximos pasos

La configuración inicial del 16 de octubre de 2026 partió de instrucciones y Skills, sin aplicación. El master setup define ahora móvil iOS/Android, Expo/TypeScript, Supabase y las herramientas de estado/calidad.

## Resueltas en esta entrega

| Decisión              | Resolución y motivo                                                                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plataforma y stack    | Expo SDK 58 con React Native 0.88/React 19.3; conjunto estable compatible. [ADR-001](architecture/adr/001-mobile-foundation.md).                            |
| Android mínimo        | Android 11/API 30; minSdk 30, compileSdk 37 y targetSdk 36 mediante expo-build-properties. [Compatibilidad Android](architecture/android-compatibility.md). |
| Gestor y convenciones | pnpm por instrucción explícita; código inglés, docs español, strict, ESLint y Prettier.                                                                     |
| Organización          | Feature-First y capas por necesidad; bootstrap compone adaptadores; rutas delgadas.                                                                         |
| Backend               | Supabase/PostgreSQL como fuente sincronizada; cliente sin credenciales privilegiadas. [ADR-002](architecture/adr/002-auth-security.md).                     |
| Sesión                | SecureStore cifrado, PKCE, refresh por ciclo de app y rutas protegidas técnicas.                                                                            |
| Persistencia futura   | Contratos sustituibles, sin motor offline en esta fase. [ADR-003](architecture/adr/003-persistence.md).                                                     |
| Calidad               | Comandos de lint, formato, tipos, Jest/RNTL y pruebas SQL pgTAP.                                                                                            |
| Modelo inicial        | Contrato profiles consumido por móvil; diseño, migraciones y pruebas exclusivamente en backend.                                                             |
| Acceso al MVP         | Cuenta obligatoria para hábitos, diario y demás datos personales; sin modo invitado. [ADR-005](architecture/adr/005-mvp-account-required.md).               |
| Activación de rachas  | Umbral de 3 días consecutivos completados, con cuenta regresiva tras el primero y segundo. [ADR-006](architecture/adr/006-streak-activation-threshold.md).  |

## Requisitos arquitectónicos permanentes resueltos

Separación móvil/backend, idiomas es/en y temas light/dark/system con preferencias persistentes son obligatorios según [ADR-004](architecture/adr/004-permanent-foundations.md). No quedan como opciones del MVP. La generación real de tipos sigue bloqueada por PostgreSQL; no se autoriza ampliar el snapshot manual histórico.

## Pendientes

| Decisión                                    | Cuándo resolver                                                                                                                                                                                                         |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credenciales y proyecto Supabase alojado    | Antes del primer recorrido remoto real. Configurar Email, SMTP y redirects; no se inventan valores.                                                                                                                     |
| Backend local                               | En el repositorio backend, habilitar Docker Linux, verificar SQL/RLS y generar el primer artefacto real de tipos.                                                                                                       |
| Onboarding                                  | Diseñar el recorrido de entrada con cuenta obligatoria; la presentación actual de Auth es provisional.                                                                                                                  |
| Primera funcionalidad completa              | Elegir módulo y criterios de aceptación; el listado del producto no autoriza implementar todo.                                                                                                                          |
| Zona de negocio, viaje y comienzo de semana | Antes de recurrencias y métricas. profiles.time_zone permanece nulo hasta elección explícita.                                                                                                                           |
| Hábitos                                     | Recurrencias admitidas, binario/cantidades, períodos abiertos, corrección retroactiva, pausas y fecha efectiva de cambios.                                                                                              |
| Métricas                                    | Rachas: días elegibles, interrupciones, correcciones y otras recurrencias; umbral de activación ya definido en ADR-006. También faltan denominadores, redondeo y ausencia de períodos; no hay algoritmos implementados. |
| Rutinas/objetivos                           | Qué actividades agrupar, relación con hábitos, unidad y origen del progreso.                                                                                                                                            |
| Diario                                      | Cardinalidad por fecha, contenido mínimo, edición y límites.                                                                                                                                                            |
| Historial y privacidad                      | Borrado/exportación de cuenta, retención, archivo y correcciones históricas; sin cascadas de negocio por defecto.                                                                                                       |
| Diseño                                      | Referencias Stitch, identidad y recursos; tokens actuales neutrales/provisionales.                                                                                                                                      |
| Distribución                                | Bundle IDs, signing, EAS, cuentas de tiendas, enlaces verificados y versión mínima de iOS. Android mínimo ya está definido.                                                                                             |
| Dependencias                                | Seguir avisos del audit y actualización del preset ESLint compatible; ver validation.md.                                                                                                                                |
| Offline futuro                              | Modelo de conflictos, tombstones, orden de eventos, cursor, transacciones, cifrado local y migraciones SQLite antes de sincronizar.                                                                                     |

Resolver solo las decisiones que requiera cada tarea. Registrar decisiones duraderas en ADR con fecha, alternativas, consecuencias y estado.
