# ADR-014: compatibilidad web y hosting estático

- Estado: aceptada para web; complementa ADR-002 y ADR-012 sin cambiar persistencia nativa. La persistencia por pestaña fue sustituida por [ADR-016](016-persistent-web-session-and-keyboard.md).
- Fecha: 2026-11-09.

## Contexto

El usuario autoriza ejecutar Daily Tracker en web y preparar Vercel usando su Supabase de nube. SecureStore no implementa lectura/escritura en web. El fallo de preferencias bloqueaba LocalizationProvider antes de montar Auth y las rutas, incluido /sign-in.

## Decisión

Metro selecciona adaptadores por plataforma. Android/iOS mantienen SecureStore cifrado y sesiones por bloques sin fallback. Web guarda idioma/tema y sesión/PKCE en localStorage con claves independientes, según la actualización ADR-016. Las operaciones acceden al navegador de forma diferida y propagan fallos; no se ocultan errores ni se reemplazan datos inválidos.

La decisión inicial limitaba la sesión web a la pestaña mediante sessionStorage para evitar persistirla al cerrarla. ADR-016 cambia esa decisión por petición del propietario: se recuerda la sesión entre pestañas y aperturas del mismo navegador y origen. El almacenamiento web es accesible a JavaScript y no equivale al cifrado nativo. La aplicación no guarda contraseñas.

Los recordatorios locales son exclusivamente nativos: web no crea el servicio ni sus controles ni importa expo-notifications. Cerrar sesión/archivar rutinas en web no depende del almacenamiento de recordatorios. El refresh por AppState es nativo; Supabase gestiona visibilidad en navegador.

Los callbacks usan dailytracker://callback en nativo y /callback en el origen web actual. El origen debe estar autorizado en Supabase Auth. La recuperación conserva mode=recovery.

Web se exporta como SPA con Metro (web.output=single). Vercel sirve dist y reescribe rutas al documento inicial, incluidas rutas con identificadores y callback. No se incorpora servidor ni esquema backend a este repositorio.

Las dos variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY se suministran al compilar. Publicar web no migra ni sustituye Supabase. La autenticación/RLS del backend sigue protegiendo cada operación.

## Verificación y límites

Probar hidratación/persistencia y fallos de almacenamiento web, separación de sesión, cifrado nativo sin fallback, callbacks según plataforma, rutas protegidas y bundle de producción. La compilación web no prueba Keychain, notificaciones nativas, RLS ni correo remoto. El dominio final y la allowlist se configuran al desplegar.
