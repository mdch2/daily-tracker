# ADR-016: sesión web persistente y foco del teclado

- Estado: aceptada por solicitud del propietario; sustituye la persistencia por pestaña de ADR-014.
- Fecha: 2026-11-09.

## Decisión

La sesión y el verificador PKCE de Supabase web se guardan en localStorage. Abrir otra pestaña o volver a abrir el navegador en el mismo origen conserva la sesión; Supabase mantiene la renovación de tokens, su validez y los eventos entre pestañas. Cerrar sesión elimina la sesión persistida. No se guardan contraseñas y no se modifica el cifrado de Android/iOS.

No se recuperan tokens del sessionStorage retirado: hacerlo como fallback podría resucitar una sesión después de cerrarla en otra pestaña. Al instalar este cambio, una sesión antigua limitada a la pestaña puede requerir un último inicio de sesión. Los errores de lectura/escritura se propagan; no hay éxito aparente ni fallback sin persistencia.

localStorage es accesible a JavaScript y conserva la sesión en el navegador hasta que se cierre sesión, el servicio la invalide o el usuario/navegador borre su almacenamiento. No se garantiza persistencia en modo privado, entre navegadores, dominios o dispositivos. Los correos PKCE deben abrirse en el mismo navegador y origen que inició la solicitud; una pestaña nueva del mismo origen puede leer el verificador.

En web, Screen usa keyboardDismissMode=none. La implementación instalada de React Native Web ejecutaba dismissKeyboard para todos los eventos scroll con on-drag, incluidos los desplazamientos automáticos al enfocar el campo o reajustar la ventana por el teclado. Se reprodujo pérdida de foco en Chrome; el primer intento de escribir podía quedar sin caracteres. En Android/iOS se conserva on-drag.

## Verificación

Probar persistencia entre contextos de pestaña, separación de preferencias, fallos de almacenamiento, renovación de una sesión expirada con el SDK real y transporte simulado, cierre de sesión y rechazo del token antiguo por pestaña. Verificar en Chrome que escribir y desplazar la pantalla conserve el foco del campo. Estas pruebas no simulan el teclado físico de un teléfono ni sustituyen su comprobación final.
