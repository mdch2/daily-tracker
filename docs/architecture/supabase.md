# Supabase y seguridad

Este documento describe la integración **cliente**. El esquema, SQL, RLS, configuración y pruebas PostgreSQL pertenecen únicamente a [daily-tracker-supabase](https://github.com/mdch2/daily-tracker-supabase). Consultar [límites permanentes](repository-boundaries.md) antes de cualquier cambio.

## Configuración

Cliente central en src/infrastructure/supabase/client.ts; bootstrap lo instancia solo si hay URL y clave publicable válidas.
No hay credenciales incluidas. HTTPS obligatorio salvo loopback y 10.0.2.2 del emulador.
El cliente usa Auth PKCE, persistSession y autoRefreshToken; detectSessionInUrl está deshabilitado.
Antes de crear el cliente nativo, `auth-crypto.ts` completa las capacidades ausentes de WebCrypto con `expo-crypto`, ya instalado: aleatoriedad segura y `subtle.digest` limitado a SHA-256. Conserva implementaciones existentes y no altera web. Así PKCE usa S256 en Hermes sin degradar a `plain` ni generar verificadores con Math.random. Véase [Expo Crypto](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/).
No se ha contratado, creado, enlazado ni modificado un proyecto alojado.

En el repositorio backend, config.toml prepara PostgreSQL 17, API solo public, Auth Email y buzón de pruebas local.
Realtime, Storage, Edge Runtime y Analytics están deshabilitados porque no hay consumidores.
El seed no contiene datos personales. La migración crea perfiles, permisos, RLS y funciones privadas de trigger.

## Sesión nativa

SecureStore cifra todos los valores. Las sesiones pueden superar los límites históricos de unos 2 KiB por valor en iOS.
El adaptador divide por puntos de código Unicode en bloques de hasta 450 caracteres, escribe una versión nueva y confirma el manifiesto al final.
Las operaciones están serializadas. Un fallo al escribir conserva la versión anterior; datos incompletos generan error, no una sesión vacía.
El manifiesto no contiene tokens; también se guarda en SecureStore. No hay fallback sin cifrar.
La accesibilidad de Keychain se limita al dispositivo y al estado desbloqueado.

Un cierre de proceso o fallo de limpieza después del commit puede dejar bloques cifrados huérfanos. No se implementa un recolector de Keychain en esta fase.
SecureStore no garantiza desaparición de datos en Keychain al desinstalar iOS. El cierre local elimina los bloques referenciados y solicita signOut(scope: local); no cierra otras sesiones.
Fallos de borrado se propagan. Nunca registrar payloads, errores de SDK con contexto sensible ni tokens.

## Registro y recuperación

Registro e inicio de sesión usan acciones con validación Zod, adaptadas por AuthRepository.
La contraseña nueva requiere 8–128 caracteres; el login permite contraseñas existentes sin imponer retroactivamente esa longitud mínima.
El backend debe configurar también un mínimo de 8 caracteres. No se alteran contraseñas ni cuentas desde SQL propio.
La configuración local de `daily-tracker-supabase/supabase/config.toml` fija `minimum_password_length = 8`, alineada con el cliente. Tras editar configuración Auth, `pnpm db:restart` en backend detiene e inicia los servicios conservando datos. `db:reset` no es necesario para aplicar esta política; un proyecto alojado necesita su propia configuración autorizada.

En Android, `127.0.0.1` es el propio emulador. Usar `http://10.0.2.2:54321` en `.env` o crear explícitamente `adb reverse tcp:54321 tcp:54321`; el reenvío de Metro no incluye Supabase. Reiniciar Expo y recargar tras cambiar `.env`.

Los errores conocidos de Auth se reducen a códigos de dominio: conexión, política de contraseña, límite de solicitudes y fallo genérico. Presentación los traduce en es/en y conserva las entradas para reintentar. No se exponen mensajes crudos del servidor ni la existencia de una cuenta.

Confirmación y recuperación usan dailytracker://callback, intercambio de code PKCE y una pantalla protegida para actualizar contraseña.
Permitir también dailytracker://callback?mode=recovery en Supabase Auth.
Los errores no incluyen datos de credenciales. La solicitud de recuperación muestra una respuesta genérica para evitar revelar la existencia de una cuenta.

Los flujos de correo requieren una development build con el esquema registrado y abrir el enlace en el dispositivo que inició la solicitud (donde vive el verifier).
En producción, evaluar Universal Links/App Links y SMTP; no añadir OAuth ni decisiones definitivas de onboarding sin tarea.
La proyección recovery es estado de navegación en memoria; no es una autorización adicional del backend.
Las rutas protegidas ocultan pantallas, pero RLS/privilegios son la barrera real para datos.

## Permisos verificados por diseño

La API solo expone public. private no tiene permisos de uso del cliente.
Las funciones de trigger fijan search_path y revocan EXECUTE público; solo crear perfil requiere SECURITY DEFINER.
profiles habilita RLS y no concede escritura de id, created_at ni updated_at.
Una cuenta puede consultar y actualizar su perfil, nunca el de otra. Los roles anon no pueden acceder.
En hábitos v1, la edición directa del perfil se limita a display_name. El calendario inicial se confirma por RPC; hábitos, definiciones y estados diarios solo conceden lectura propia. Las RPC de escritura de calendario/hábitos necesitan SECURITY DEFINER con search_path vacío y autorización explícita por auth.uid(), porque no se concede DML directo. Véase [contrato de hábitos](habits.md).
La comprobación ejecutable está en supabase/tests/database/profiles.test.sql **del repositorio backend**. Su ejecución real depende del motor Docker; revisar validation.md, no asumir que pasó. El móvil no contiene SQL ni ejecuta estas pruebas.

## Entornos y siguientes pasos

1. En daily-tracker-supabase, arrancar Docker Linux y ejecutar pnpm db:start.
2. En backend, aplicar pendientes con `pnpm exec supabase migration up --local`, ejecutar `pnpm db:test` y `pnpm db:types`. Reservar db:reset exclusivamente para instancias descartables; no hace falta resetear la base en uso.
3. En móvil, importar el artefacto generado con pnpm db:types. Obtener URL/clave publicable y completar .env sin credenciales privilegiadas.
4. En remoto, revisar la migración y aplicarla con el procedimiento de despliegue autorizado; configurar URLs, Email y SMTP.
5. Validar registro, confirmación, relanzamiento, expiración/refresh, cierre y recuperación en iOS/Android reales.

No se incluyen Edge Functions, buckets ni suscripciones Realtime sin una necesidad de producto.

Idioma y tema se gestionan por preferencias locales persistentes y no requieren columnas en profiles ni sesión Auth. Los mensajes visibles de integración se traducen mediante catálogos es/en; no mostrar errores crudos del SDK.
