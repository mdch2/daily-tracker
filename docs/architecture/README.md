# Arquitectura de Daily Tracker

Estado: fundamentos implementados. Feature-First + Clean Architecture pragmática + monolito modular móvil.
La separación se aplica donde existe una responsabilidad, sin generar cuatro carpetas por cada módulo previsto.

## Requisitos permanentes

Dos repositorios independientes: el [backend](repository-boundaries.md) posee todo el esquema/SQL/infraestructura y el móvil solo consume servicios e importa tipos. [Idiomas es/en y temas light/dark/system](localization-and-themes.md) son obligatorios, con preferencias persistentes y controles provisionales. Estas decisiones se recogen en [ADR-004](adr/004-permanent-foundations.md).

## Stack elegido

| Tecnología                             | Versión base              | Motivo                                                                                    |
| -------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| Node / pnpm                            | 22.14.0 / 10.28.2         | Runtime instalado compatible, gestor solicitado y lockfile reproducible.                  |
| Expo / React Native / React            | 58.0.14 / 0.88.0 / 19.3.0 | Conjunto estable publicado y matriz Expo verificada.                                      |
| Expo Router                            | 58.0.23                   | Navegación por archivos, rutas delgadas y guards.                                         |
| TypeScript                             | 6.0.3                     | Versión del template Expo; strict, exactOptionalPropertyTypes y noUncheckedIndexedAccess. |
| Supabase JS                            | 2.118.0                   | Auth, cliente tipado y acceso PostgreSQL con RLS.                                         |
| TanStack Query                         | 5.104.3                   | Caché y estado de consultas remotas; claves incluyen usuario.                             |
| Zustand                                | 5.0.15                    | Preferencia visual compartida, sin copiar datos remotos.                                  |
| React Hook Form / Zod / resolvers      | 7.90.0 / 4.6.7 / 5.9.1    | Formularios y validación de límites externos.                                             |
| Jest / jest-expo / RNTL                | 30.5.2 / 58.0.11 / 14.1.0 | Preset nativo compatible y pruebas de interacción.                                        |
| ESLint / eslint-config-expo / Prettier | 9.39.5 / 58.0.4 / 3.9.10  | Reglas Expo y formato uniforme.                                                           |

El lockfile fija las resoluciones reales; los rangos permiten parches compatibles. ESLint 10 se descartó porque los plugins actuales de Expo declaran compatibilidad solo hasta 9; existe una advertencia de deprecación que se revisará al actualizar el preset. No se ignoran peers incompatibles.
react-dom está fijado a la versión de React para satisfacer el peer de Router; no habilita una plataforma web del producto.
La instalación hoisted de pnpm simplifica resolución de Metro/Jest. No hay gestor adicional ni workspace artificial.

## Compatibilidad Android

Daily Tracker requiere **Android 11 (API 30)** como mínimo. `app.json` configura `expo-build-properties` (~58.0.11) con `minSdkVersion: 30`, `compileSdkVersion: 37` y `targetSdkVersion: 36`, compatibles con Expo 58 y el requisito vigente de Google Play. El plugin aplica los valores al generar el proyecto nativo; no basta con exportar JavaScript ni ejecutar Expo Go. La verificación y los pasos de compilación están en [compatibilidad Android](android-compatibility.md).

## Responsabilidades y dependencias

- **Domain:** tipos y contratos independientes. AuthRepository proyecta identidad sin exponer tokens a pantallas; ProfileRepository no conoce Supabase.
- **Application:** validación de entradas y operaciones de autenticación. Las validaciones se repiten en el límite de escritura aunque el formulario ya las haya aplicado.
- **Infrastructure:** repositorios Supabase, transformación/validación de filas, cliente y adaptador de sesión cifrada.
- **Presentation:** formularios, estados, contextos, consultas y pantallas. Nunca escribe consultas SQL/Supabase.
- **Bootstrap:** crea un único runtime con cliente y repositorios, configura providers y el ciclo de refresh.
- **App:** layouts y rutas que delegan en features.
- **Shared:** tokens, controles mínimos y configuración. No es un contenedor de reglas de negocio de hábitos.

Flujo de escritura: ruta → pantalla/formulario → acción validada → contrato de repositorio → adaptador Supabase → Auth/PostgreSQL.
Flujo de lectura: pantalla → Query con clave por usuario → ProfileRepository → adaptador → RLS → fila validada → entidad → estado de UI.
La composición inyecta adaptadores; dominio no importa infraestructura. ESLint comprueba una parte de estos límites, y las revisiones cubren imports relativos y ciclos que el lint básico no detecta.

## Estado y ciclo de sesión

Supabase posee la sesión y SecureStore la persiste; el contexto solo proyecta userId, estado de carga/error y modo de recuperación.
Se escucha Auth antes de restaurar la sesión para que una respuesta inicial tardía no reemplace un evento más reciente.
El cambio de identidad limpia la caché Query. Las consultas personales incluyen userId en la clave y las mutaciones no tienen reintentos automáticos.
Los listeners de AppState y Auth se limpian al desmontar. No hay almacenamiento de contraseñas.

Query usa staleTime de 30 segundos y un reintento de lecturas. No existe persistencia local de datos de negocio ni promesa de acceso offline.
Idioma y tema se persisten en SecureStore mediante un store Zustand de preferencias de dispositivo, independiente de sesión Auth y datos remotos. Ver [idiomas y temas](localization-and-themes.md).

## Sistema de diseño provisional

Tokens semánticos claros/oscuros, tipografía de sistema, espaciados, radios, elevación y objetivo táctil mínimo de 48.
Text, Button, Input, Screen y mensajes de error/carga existen porque el acceso los usa. Los enlaces respetan tema y área táctil.
Card, Modal, EmptyState, iconografía y sombras de marca se incorporarán al disponer de diseños de Stitch o consumidores reales.
No hay logotipo, fuentes descargadas ni paleta comercial. Screen integra área segura, scroll y teclado.
Las rutas se cargan mediante Router; no hay listas ni grandes consultas que optimizar todavía.

## Fuentes consultadas

- [Matriz de versiones de Expo](https://docs.expo.dev/versions/latest/).
- [Rutas protegidas de Expo Router](https://docs.expo.dev/router/advanced/protected/).
- [Pruebas con jest-expo](https://docs.expo.dev/develop/unit-testing/).
- [SecureStore y limitaciones de tamaño](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).
- [Supabase Auth en React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).
- [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Las versiones exactas y peers también se comprobaron en el registro de paquetes y expo/bundledNativeModules.json instalado.
