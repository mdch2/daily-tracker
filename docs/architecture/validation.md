# Verificación de la base técnica

Fecha: 2026-10-16. Entorno Windows, Node 22.14.0, pnpm 10.28.2, Supabase CLI 2.75.0.
Las herramientas Node se ejecutaron fuera del sandbox porque el runtime y el almacén pnpm no eran accesibles dentro. No se cambió el Node global ni se instaló Python en el sistema.

## Comprobaciones ejecutadas

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

Para levantar el bloqueo: reparar/iniciar el motor Linux de Docker, pnpm db:start, pnpm db:reset solo en local descartable, pnpm db:test y pnpm db:types.
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
