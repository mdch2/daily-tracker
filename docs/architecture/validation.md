# Verificación

## Rutinas v1: cierre del 28 de octubre de 2026

Implementación autorizada únicamente para Rutinas, según [ADR-009](adr/009-routines-v1.md) y [contrato cliente](routines.md). Metas personales continúa sin implementar.

- `pnpm check` repetido al retomar el cierre: correcto, **220 pruebas en 31 suites**, límites de repositorios, lint sin advertencias, formato y TypeScript. Incluye elegibilidad, pasos obligatorios/opcionales, historial, vínculos con Hábitos, lectura fallida, creación y edición con borrador conservado, revisión visible tras conflicto y recuperación de un guardado confirmado sin reenviar la edición.
- Backend local: migración incremental `20261027000100_routines.sql` aplicada el 27, sin reset ni cambios remotos. Al retomar el 28 Docker estaba detenido; se inició y se conservaron sus volúmenes. Después, `pnpm db:test`: **301 comprobaciones pgTAP correctas en seis archivos**, incluidas **85 nuevas de Rutinas**, con propietario A, usuario B, anon e identidad ausente.
- `pnpm db:test:routines:isolated`: correcto el 28. Reproducción completa de migraciones, conservación de perfil/hábito/definición/registro previo y pruebas con dos conexiones reales: creación y registro duplicados, revisiones/configuraciones obsoletas, edición simultánea con registro y archivo repetido. Los fixtures se revierten; solo se elimina la base temporal creada por el runner. Su Auth mínimo sintético no equivale a recrear todo el servicio Auth.
- Tipos generados en backend desde PostgreSQL local y después importados con `pnpm db:types` del móvil. Igualdad SHA-256 comprobada el 28: `12B67C8228958A2C98F7345F1C07B77486BB21DA4931FDC5D10B41FAD1C17D30`. Sin edición manual del artefacto.
- Bundles finales Android/iOS generados correctamente el 27 con `pnpm exec expo export --platform android --platform ios --output-dir dist/routines-mobile --max-workers 2`, después de los ajustes de recuperación. No sustituyen una compilación nativa o pruebas en dispositivos.
- Lint SQL local del 27: sin problemas en las funciones de Rutinas; persiste la advertencia previa de variable no usada en `create_habit`. No se modifica esa función ni la historia de migraciones para una limpieza ajena a Rutinas.
- `pnpm exec expo install --check --pnpm`, repetido el 28, **no está limpio**: solicita parches para expo, expo-constants, expo-dev-client, expo-font, expo-linking, expo-localization, expo-router, expo-status-bar, expo-system-ui y jest-expo. No se añadieron dependencias ni se actualizaron versiones o el lockfile durante esta tarea. Se conservan las exclusiones de Jest ya documentadas.
- Referencias originales de Rutinas conservadas sin reformatear. Se extrajo `Sheet` por sus consumidores reales en Hábitos y Rutinas; es/en y light/dark/system reutilizan las preferencias y tokens existentes. Las pruebas comprueban progreso accesible y los estados pertinentes, pero no certifican fidelidad visual nativa ni lectores de pantalla.
- Revisión visual pendiente: se generó el 27 una vista web aislada con componentes reales y repositorios sintéticos en memoria, sin sesión ni escrituras Supabase. El host de acceso del navegador no permitió crear una pestaña dedicada; la revisión automática rechazó acceder a Chrome por mostrar Stitch y posible contenido privado ajeno. Al retomar el 28 también rechazó el inventario visual por ese riesgo. Se requiere una ventana dedicada a Rutinas y autorización de inspección; no se eludió ese bloqueo.
- No hay cambios remotos, implementación de Metas personales, SQL de servidor en móvil ni configuración temporal de QA en los archivos de producto. La revisión de diff, enlaces y hashes confirma los límites entre repositorios y la conservación de los tipos y referencias.

## Hábitos v1: 22 de octubre de 2026

- `pnpm check`: correcto, **141 pruebas en 19 suites**, límites de repositorio, lint sin warnings, formato y TypeScript. Incluye reglas de las tres frecuencias, cantidades exactas, cierre de períodos, semana parcial, correcciones, adaptadores, reintentos, conflictos, calendario explícito, conservación de entradas, rutas protegidas y regresiones de Auth/preferencias.
- Backend: migración incremental 20261021000100 aplicada solo en PostgreSQL local, sin resetear sus datos. `pnpm db:test`: **165 comprobaciones pgTAP correctas**; lint SQL sin errores. `pnpm db:test:auth` correcto, con eliminación de su usuario/perfil sintéticos.
- `pnpm db:test:habits:isolated`: cadena completa de migraciones de aplicación, conservación de un perfil previo, pgTAP y dos conexiones concurrentes correctos. Se usa una base temporal con tabla Auth mínima sintética y la función auth.uid instalada; no equivale a recrear todo Supabase Auth. Solo esa base temporal se elimina al terminar.
- Tipos generados en backend desde PostgreSQL y después importados con `pnpm db:types` del móvil. El generador elimina espacio final de CLI, sin edición manual del artefacto. SHA-256 coincidente en ambos repositorios: `C03E38BB45E4E190967CA95DA6B835E6FDF2D18C99B96A6A96FDAF7E4FD74A72`.
- Exportación Hermes Android/iOS correcta con dos workers. No sustituye builds de distribución ni pruebas en dispositivos iOS.
- `pnpm exec expo install --check --pnpm` devuelve advertencias de parches pendientes para expo, expo-constants, expo-linking, expo-localization, expo-router, expo-status-bar y jest-expo. Se conservan las versiones y el lockfile de la tarea; no se afirma compatibilidad completamente limpia ni se actualizan dependencias ajenas al módulo.
- Revisión con Computer Use en el emulador Android API 37 abierto por el usuario y Supabase local: calendario America/Bogota/lunes confirmado por elección explícita del usuario; listado vacío, creación binaria, marcar y desmarcar con guardado confirmado y actualización del listado correctos. La sesión existente se conserva.
- Recorrido cuantitativo semanal real: mínimo de 500 ml y meta de tres días; dos aportes de 250 dejaron 500 ml y 1/3 días. Fijar el total en 100 dejó 100 ml y 0/3, conservando una sola fecha y tres comprobantes en PostgreSQL. La primera semana parcial muestra progreso informativo. Se revisaron es/en y claro/oscuro/sistema; cambiar idioma y tema conservó el formulario antes de crear.
- Limpieza de QA: se retiraron exclusivamente los dos hábitos sintéticos creados en el recorrido, sus dos estados diarios, dos definiciones y cinco comprobantes, verificando sus identidades antes de la transacción. No se eliminó la cuenta ni se cambió el calendario elegido. Idioma y tema se restauraron a sistema, como estaban al comenzar.
- Sin despliegues remotos, dependencias nuevas, SQL en móvil ni alteración deliberada de los cambios previos de Auth/documentación. No se verificaron iOS físico, lector de pantalla, texto ampliado, cambios reales de zona/DST mediante el reloj del dispositivo ni distribución en tiendas; las fronteras temporales se cubren con reloj/fechas explícitos en las pruebas.

Los resultados de las secciones siguientes son históricos. Los bloqueos iniciales de Docker, PostgreSQL y snapshot manual ya no describen el estado actual.

## Historial de la base técnica

Fecha: 2026-10-16. Entorno Windows, Node 22.14.0, pnpm 10.28.2, Supabase CLI 2.75.0.
Las herramientas Node se ejecutaron fuera del sandbox porque el runtime y el almacén pnpm no eran accesibles dentro. No se cambió el Node global ni se instaló Python en el sistema.

Los resultados de la configuración inicial se conservan como historial. Tras ADR-004, los comandos de administración y pruebas SQL pertenecen al repositorio backend; pnpm db:types del móvil ahora importa un artefacto, no ejecuta el generador.

## Corrección del registro: 21 de octubre de 2026

- Causas comprobadas: `.env` local usa `127.0.0.1` y el emulador solo tenía reenviado Metro (8081), sin Supabase (54321); Auth exigía 12 caracteres mientras el formulario admitía 8. Se reprodujo `422 weak_password` con 8 caracteres contra el servicio local.
- Se conserva `127.0.0.1` por preferencia del usuario y se habilitó `adb reverse tcp:54321 tcp:54321`. El reenvío debe repetirse tras perder la conexión ADB. El mínimo local de Auth quedó en 8 con autorización explícita; `pnpm db:restart` aplicó la configuración conservando datos. No se modificaron esquema ni permisos.
- El cliente completa las capacidades nativas necesarias para PKCE S256 mediante `expo-crypto`, sin dependencia nueva. Los errores conocidos se traducen en es/en sin exponer mensajes del servidor; el formulario conserva los campos y permite reintentar.
- `pnpm check`: correcto, **85 pruebas en 13 suites**, límites, lint, formato y TypeScript. Incluye vector RFC 7636, petición PKCE del SDK, clasificación segura de errores, reintentos, idiomas y temas. La primera ejecución tuvo timeouts; se aisló el mock de registro y el check completo posterior pasó.
- Backend: `pnpm db:test:auth --email user1-test@gmail.com` correcto: registro, correo al buzón local, confirmación, intercambio S256 y lectura del perfil autenticado. La prueba eliminó su cuenta y correo; rechaza reutilizar una cuenta existente. `pnpm db:test`: **65 pruebas pgTAP correctas**; lint SQL sin errores.
- Exportación Hermes de Android/iOS correcta fuera del sandbox con dos workers. El primer intento dentro del sandbox terminó con código 6 del compilador. Compatibilidad Expo comprobada con su matriz local; la consulta online no estuvo disponible.
- Recorrido real en development build Android: registro de `user1-test@gmail.com` con 8 caracteres, pantalla de confirmación, enlace desde el buzón local abierto en el dispositivo de origen, intercambio PKCE y dashboard con sesión iniciada. Se usó `127.0.0.1` con ADB reverse. Se cerró la sesión y se eliminaron la cuenta, su perfil y el correo de prueba; la app volvió al inicio de sesión.
- Las pruebas de SDK usan un adaptador criptográfico nativo simulado. No se comprobaron dispositivos iOS, SMTP remoto ni un proyecto alojado.

## Actualización: reglas permanentes de repositorios, i18n y temas

- pnpm check: correcto, incluidos límites de repositorio, lint sin warnings, formato, TypeScript y **49 pruebas en 10 suites**.
- Pruebas nuevas: idiomas es/en y fallback, paridad de claves/interpolaciones, validación traducida, formato con zona explícita, tres modos de tema, cambios del dispositivo, persistencia tras relanzamiento, concurrencia y errores. Cambiar idioma conserva los datos y la validación del formulario. Contraste de texto comprobado contra tokens.
- pnpm exec expo install --check --pnpm: dependencias compatibles; expo-localization ~58.0.4, i18next 26.4.7 y react-i18next 17.0.20. Se conservan las excepciones de Jest documentadas.
- Las seis Skills pasaron quick_validate.py tras actualizar cinco de ellas; no se crearon Skills redundantes.
- Instalación con pnpm install --frozen-lockfile --ignore-scripts: correcta.
- Bundles Hermes de Android e iOS exportados correctamente con la base de idiomas/temas; no sustituyen una compilación nativa.
- Prebuild Android temporal correcto: locales_config.xml incluye en/es, el manifiesto referencia ese recurso y mantiene RTL deshabilitado. Las propiedades Android siguen siendo mínimo 30, compilación 37 y destino 36. La introspección iOS declara CFBundleLocalizations en/es.
- Se trasladaron cinco archivos backend sin alterar su contenido, comprobando SHA-256 antes de retirar las copias móviles. pnpm check:boundaries confirma que no quedan SQL ni infraestructura Supabase del servidor en el móvil.
- En backend, pnpm db:types y pnpm db:test se intentaron y fallaron por PostgreSQL no disponible. El importador móvil también falló al no existir el artefacto generado y se comprobó por hash que conservó el snapshot anterior.

No se verificaron físicamente Keychain, cambios de idioma/tema en dispositivos ni el renderizado visual nativo. El bloqueo de Java/Android SDK y Docker continúa. El snapshot manual histórico sigue pendiente de sustitución; no se presenta como generado. Véase [límites](repository-boundaries.md) y [presentación](localization-and-themes.md).

## Historial de comprobaciones de la base inicial

| Comprobación                                    | Resultado                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| pnpm install --frozen-lockfile --ignore-scripts | Correcta; lockfile reproducible. También se completó la instalación normal con pnpm.                                                                                     |
| pnpm lint                                       | Correcta, sin warnings.                                                                                                                                                  |
| pnpm format:check                               | Correcta.                                                                                                                                                                |
| pnpm typecheck                                  | Correcta con strict, noUncheckedIndexedAccess y exactOptionalPropertyTypes.                                                                                              |
| pnpm test                                       | 17 pruebas, 6 suites, todas correctas.                                                                                                                                   |
| pnpm check                                      | Correcta: lint, formato, tipos y las 17 pruebas.                                                                                                                         |
| Expo config --type public                       | Configuración resuelta correctamente; solo iOS/Android.                                                                                                                  |
| Expo export --platform android --platform ios   | Bundles Hermes de ambas plataformas generados; dist queda ignorado.                                                                                                      |
| Expo install --check --pnpm                     | Matriz local de Expo compatible. Consulta online no disponible; usa bundledNativeModules.json. Jest y sus tipos están excluidos explícitamente por ADR-001.              |
| pnpm dlx expo-doctor                            | 19/20 checks correctos; falló la consulta externa de metadatos a React Native Directory con “unexpected server response”. No se declara diagnóstico totalmente correcto. |
| quick_validate.py                               | Las seis Skills válidas; Python embebido temporal y PyYAML del repositorio oficial fuera del proyecto.                                                                   |
| git diff --check                                | Sin errores en los archivos versionados modificados. Revisión adicional de archivos nuevos, enlaces y privacidad.                                                        |

No se incluyó package-lock.json tras cambiar el gestor a pnpm.
Los scripts opcionales de instalación de @parcel/watcher y unrs-resolver quedaron bloqueados por pnpm; los checks y bundles funcionaron sin ejecutarlos.

## Actualización de compatibilidad Android

Android mínimo del producto: Android 11/API 30. `expo-build-properties` ~58.0.11 fija mínimo 30, compilación 37 y destino 36. La introspección y el prebuild temporal confirmaron las propiedades en Gradle y su consumo por la aplicación. La comprobación de dependencias de Expo pasó. La fusión del manifiesto y la compilación APK/AAB siguen sin verificarse: el wrapper falló antes de ejecutar Gradle porque no hay Java disponible, y el Android SDK no está configurado. Véase [evidencia y reproducción](android-compatibility.md).

## Bloqueos reales

- Docker Desktop está instalado y su comando de inicio se ejecutó, pero no aparece el pipe dockerDesktopLinuxEngine. Supabase local no pudo arrancar.
- pnpm db:test falló por conexión rechazada a PostgreSQL en 127.0.0.1:54322. Las 14 aserciones SQL están preparadas, **sin ejecución exitosa**.
- pnpm db:types falló por backend no disponible y conservó el snapshot manual de database.types.ts.
- La migración se revisó estáticamente; aún no se ha aplicado ni reproducido contra PostgreSQL en este entorno. RLS no se presenta como verificada mediante ejecución.
- Sin proyecto/credenciales Supabase remotos, no se comprobaron registro y correo reales, refresh/expiración contra servidor ni recuperación completa.
- Sin dispositivo/simulador ejecutado, no se validaron visualmente pantallas ni Keychain/Keystore, enlaces nativos, accesibilidad asistida o builds de tiendas. Los tests de componentes y bundles no sustituyen esas comprobaciones.

Para levantar el bloqueo: en el repositorio backend, reparar/iniciar el motor Linux de Docker, pnpm db:start, pnpm db:reset solo en local descartable, pnpm db:test y pnpm db:types. Después importar el artefacto desde el móvil con su comando pnpm db:types.
Después configurar .env y probar los recorridos Auth en development builds iOS/Android.

## Auditoría de dependencias

pnpm audit reportó cuatro avisos transitivos: dos altos y dos moderados. No es un resultado limpio.
Las rutas reportadas pertenecen a tooling de Expo o pruebas; no se identificaron imports directos desde el código de negocio. Esto no elimina el riesgo de las herramientas de desarrollo.

| Paquete    | Gravedad | Ruta reportada y acción                                                                                                                                                                          |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| uuid       | Moderada | expo → config-plugins → xcode → uuid 7. La corrección publicada requiere >=11.1.1; necesita actualización compatible de xcode/Expo o evaluación específica, no un override de major sin pruebas. |
| node-forge | Alta     | expo → CLI → node-forge. El reporte no ofrece versión corregida; seguir actualización del proveedor.                                                                                             |
| braces     | Alta     | jest-expo → preset RN → transform → micromatch → braces. El reporte no ofrece versión corregida.                                                                                                 |
| sprintf-js | Moderada | Jest → Istanbul → js-yaml → argparse → sprintf-js. El reporte no ofrece versión corregida.                                                                                                       |

Avisos: [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).
Revisar nuevamente con pnpm audit al actualizar dependencias y antes de una entrega comercial. No se forzaron versiones incompatibles ni se ocultaron avisos.
