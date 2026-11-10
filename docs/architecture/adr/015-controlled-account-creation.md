# ADR-015: altas de cuentas controladas

- Estado: aceptada por solicitud del propietario.
- Fecha: 2026-11-09.

## Decisión

Se oculta Crear cuenta y su texto introductorio en el acceso, en ambos idiomas y todos los temas. La ruta /sign-up redirige a /sign-in para que un enlace directo no exponga el formulario. Acceso, recuperación de contraseña y cuentas existentes conservan su comportamiento.

La protección efectiva requiere desactivar Allow new users to sign up en Supabase Auth de nube. El propietario administra las altas desde el Dashboard de Supabase; no se incorpora una consola administrativa ni una clave privilegiada a la app. Esta tarea no implementa un nuevo flujo de invitación por correo.

La configuración del servicio es independiente del cliente y debe mantenerse al desplegar otro entorno. Ocultar una acción o redirigir una ruta no constituye autorización del backend. El adaptador y las validaciones de registro permanecen internos, sin acceso desde rutas públicas.

## Verificación

Comprobar ausencia del registro en es/en y light/dark/system, redirección de /sign-up, acceso/recuperación disponibles, configuración pública de Supabase con registro desactivado y despliegue desde main. Una APK ya instalada conserva su interfaz hasta actualizarse; el cierre de registros del servicio se aplica también a clientes anteriores. No se crean usuarios de prueba en producción.
