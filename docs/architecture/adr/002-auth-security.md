# ADR-002: autenticación técnica y aislamiento

- Estado: aceptada para la base; onboarding comercial pendiente. Ubicación de SQL actualizada por [ADR-004](004-permanent-foundations.md): exclusivamente repositorio backend.
- Fecha: 2026-10-16.

## Contexto

Se solicita preparar registro, acceso, recuperación y sesión segura, sin fijar aún acceso anónimo ni disponer de credenciales remotas.

## Decisión

Supabase Auth Email con PKCE, clave publicable, SecureStore nativo y rutas protegidas.
Un contrato AuthRepository oculta el SDK a la presentación y proyecta userId, nunca tokens.
SecureStore divide sesiones grandes en bloques cifrados y confirma un manifiesto al final; ningún fallo habilita fallback sin cifrar.
El cliente se crea solo con configuración válida. El estado sin credenciales es explícito y no simula conexión.

Crear profiles desde un trigger privado de Auth, con backfill, RLS por id y permisos de actualización solo de campos editables.
No replicar email, contraseñas ni tokens en tablas propias.
El cierre de sesión es local al dispositivo y se comunica así. La caché de datos se limpia al cambiar identidad.

## Alternativas

AsyncStorage en texto plano no satisface el requisito de sesión segura. Cifrar un blob externo requiere más almacenamiento y gestión de claves que los bloques de SecureStore.
Crear el perfil desde el formulario permitiría escrituras parciales; el trigger mantiene atomicidad con el alta Auth.
Conceder UPDATE completo y confiar solo en la interfaz dejaría modificar timestamps y propiedad.

## Consecuencias

La API móvil depende de RLS y privilegios, además de guards visuales. Los tests de seguridad necesitan PostgreSQL real.
Los flujos de correo requieren development build y mismo dispositivo por PKCE. El esquema deep link y los tokens visuales son provisionales.
Un proceso interrumpido puede dejar bloques cifrados huérfanos. La política completa de borrado/retención y los enlaces verificados de producción siguen abiertos.
