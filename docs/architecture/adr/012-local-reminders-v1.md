# ADR-012: recordatorios locales v1

- Estado: aceptado e implementado en cliente; validación nativa pendiente.
- Fecha: 2026-11-06.

## Contexto y decisión

Se autoriza incorporar recordatorios básicos de Hábitos y Rutinas en esta versión usando las bibliotecas de Expo. Widgets, notificaciones push, avisos condicionales al cumplimiento y registro desde el aviso quedan para una entrega posterior.

El usuario elige explícitamente **hora del teléfono al viajar**, independientemente de la zona de negocio fija de la cuenta. Un recordatorio por entidad permite elegir hora de 24 horas y días ISO de la semana. La programación de avisos no redefine la recurrencia ni modifica registros. Completar la actividad no cancela el aviso. Tras cambiar de zona hay que abrir la aplicación para reconciliar los avisos con la hora actual, especialmente en Android.

Los horarios son preferencias locales del dispositivo y de la identidad activa, no datos de negocio sincronizados. Se persisten en SecureStore con versión de formato y validación en el límite de escritura. PostgreSQL sigue poseyendo exclusivamente los datos de negocio; no se añade soporte offline para registros ni cambios backend. Solo se guardan identificadores, tipo de destino, hora y días, sin nombres ni contenido personal.

`expo-notifications` adapta permisos, canales Android, programación semanal y respuesta a pulsaciones. Se usan avisos `bestEffort`, sin solicitar alarmas exactas, tokens push ni credenciales FCM/APNs. Se permiten ocho recordatorios por dispositivo, hasta 56 solicitudes semanales, para mantener acotada la programación nativa. Los textos pertenecen a es/en y usan contenido genérico. La interfaz consume los tokens existentes de light/dark/system.

## Confirmación, recuperación y sesión

La configuración deseada se guarda antes de proyectarla al sistema. Solo se comunica éxito al confirmar las solicitudes nativas. Si falla la programación se conserva la configuración para reintentar; el adaptador intenta cancelar cualquier programación parcial. Si esa limpieza también falla, el error permanece visible y se vuelve a reconciliar al reintentar. Fallos de almacenamiento no se sustituyen por datos vacíos ni otro almacén.

Las operaciones se serializan. Un cambio de identidad invalida permisos pendientes antes de permitir nuevas escrituras. Al iniciar, volver a primer plano o cambiar el idioma, se cancelan los avisos propios y se reconstruyen los de la identidad actual sin pedir permiso automáticamente. El permiso se solicita únicamente al guardar un recordatorio. Una lectura corrupta cancela la proyección y muestra recuperación; Más permite desactivar todos los horarios para restablecer la configuración local.

El cierre explícito de sesión cancela solicitudes y avisos entregados y limpia la configuración antes de cerrar Auth. Si falla la limpieza, no se confirma el cierre. Si Auth falla después de la limpieza, los recordatorios ya están desactivados. La pérdida o cambio de sesión también reconcilia los avisos. Pulsar un aviso solo abre un UUID de hábito/rutina de la identidad actual, después de montar la navegación protegida; no se aceptan URLs arbitrarias ni se escribe cumplimiento.

Antes de archivar una rutina desde este dispositivo se desactiva su recordatorio local. Si el archivo remoto falla después, el recordatorio queda desactivado y se puede configurar de nuevo. Esta entrega no sincroniza cancelaciones entre dispositivos: un archivo realizado en otro teléfono no elimina automáticamente sus avisos locales. Pueden desactivarse desde Más; abrir un destino archivado conserva el recorrido de solo lectura existente.

## Alternativas y límites

Se aplazan push y preferencias remotas porque no son necesarios para horarios elegidos por dispositivo. Widgets requieren otra superficie y contrato de actualización. Los avisos no garantizan puntualidad frente a ahorro de batería, permisos, canales o modos de concentración. Cambiar idioma requiere abrir la app para regenerar el texto programado. Forzar la detención de la aplicación desde Android puede impedir entregas hasta abrirla de nuevo.

La programación y permisos reales, persistencia nativa, reinicio del teléfono y apertura desde avisos deben verificarse en compilaciones propias de iOS/Android. Los mocks y bundles no prueban entrega real ni la fusión final de permisos del manifiesto.

Fuentes: [Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) y API/código nativo de `expo-notifications` 58.1.8 instalado.
