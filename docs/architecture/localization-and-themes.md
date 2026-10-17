# Idiomas y temas obligatorios

Estas capacidades son permanentes desde la base técnica; los diseños definitivos y el alcance del MVP no pueden eliminarlas.

## Idiomas

i18next 26.4.7 y react-i18next 17.0.20 son compatibles con React 19 y TypeScript 6 según sus peers. expo-localization ~58.0.4 corresponde a Expo SDK 58.
El plugin nativo declara en/es y deshabilita RTL porque los dos idiomas soportados son LTR.

Los catálogos compartidos viven en src/shared/i18n/locales/en.json y es.json, organizados por capacidad: common, auth, validation, preferences, dashboard, navigation, config y errors.
Las claves tienen tipado i18next. La prueba de paridad exige las mismas claves e interpolaciones y textos no vacíos.

Preferencia por defecto: system. expo-localization/useLocales detecta variantes regionales y cambios del dispositivo; se elige el primer idioma soportado de la lista, con **inglés como respaldo**.
Una selección manual es/en persiste y tiene prioridad; System vuelve a seguir al dispositivo.
React usa useTranslation y recibe el evento de cambio sin recrear la navegación o perder el contenido del formulario.
Los esquemas de aplicación devuelven códigos validation.*, que presentación traduce al renderizar; no importan React ni i18n. Los mensajes del SDK y errores internos no se muestran directamente al usuario.

Prohibido escribir textos visibles, etiquetas accesibles, títulos de navegación, errores o validaciones literales en componentes. Los mensajes internos de diagnóstico no son textos de producto.
ESLint detecta texto JSX y atributos visibles literales comunes; la revisión cubre expresiones dinámicas que esa regla básica no puede detectar.

## Formato localizado

useLocalizedFormatters expone Intl.NumberFormat e Intl.DateTimeFormat usando idioma activo y la variante regional compatible del dispositivo, o el idioma base.
La fecha requiere un timeZone explícito del caso de uso. Cambiar idioma no modifica zona de negocio, fechas almacenadas, recurrencias ni historial.
No hay métricas o fechas ficticias en la pantalla: el formateador está preparado y probado para consumidores futuros.

## Temas

Los modos light, dark y system comparten tokens semánticos en shared/theme/tokens.ts. useTheme resuelve la preferencia contra useColorScheme; sin señal del sistema usa light.
El catálogo es neutro/provisional: Stitch podrá actualizarlo, manteniendo semántica, contraste y los tres modos.
No se permiten colores literales en componentes cuando existe un token equivalente.

PresentationProvider aplica el tema a Expo Router/ThemeProvider y StatusBar; formularios, áreas seguras, fondos, enlaces, errores, indicadores y teclado consumen el mismo tema.
Los modales futuros deben usar estos tokens/contextos, incluidos portales. No se añade una biblioteca de modales sin un consumidor real.
Las pruebas verifican contraste WCAG AA de texto normal (>=4.5:1) para las combinaciones actuales. Componentes nuevos necesitan comprobar sus propios estados.
El tema de lanzamiento/splash depende del binario y del sistema antes de hidratar; esta base no afirma que una preferencia JS controle toda interfaz del sistema operativo.

## Persistencia y fallos

Un único store Zustand de preferencias de dispositivo persiste language y theme en daily-tracker.preferences.v1.
Se reutiliza SecureStore, ya instalado, para un JSON pequeño; no se añade almacenamiento ni dependencia extra. Nunca se mezclan preferencias con tokens Auth, datos remotos o perfiles PostgreSQL.
Las preferencias se conservan al cerrar sesión; no sincronizan entre dispositivos.

El arranque espera la hidratación antes de mostrar el contenido de la app. Un fallo de lectura o datos inválidos muestra error y permite reintentar, sin sobrescribir silenciosamente el registro.
Las escrituras se serializan y se confirman en UI solo después de persistir. Ante fallo se mantienen los valores anteriores y se informa en el idioma activo.
No hay guardado exitoso aparente ni caché remota duplicada.

## Controles y verificación

Los controles provisionales están disponibles en acceso, dashboard y configuración pendiente, sin requerir una cuenta ni credenciales de backend.
Permiten español, inglés o sistema y claro, oscuro o sistema. El estado seleccionado es visible y accesible.
La suite cubre catálogo, detección/respaldo, validaciones es/en, formato, cambios manuales/sistema, tres modos, relanzamiento, errores y concurrencia.
Los mocks de dispositivo y pruebas de componentes no sustituyen una revisión visual en iOS/Android, Keychain real, lectores de pantalla o builds nativas.

Fuentes: [Expo Localization SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/localization/), [opciones i18next](https://www.i18next.com/overview/configuration-options), [useTranslation](https://react.i18next.com/latest/usetranslation-hook), [temas Expo](https://docs.expo.dev/develop/user-interface/color-themes/).
