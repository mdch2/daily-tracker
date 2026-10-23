# Primera entrega de hábitos

Implementación de registro binario/cuantitativo, tres frecuencias y correcciones de siete días. El esquema, las RPC y su autorización pertenecen exclusivamente al backend, en su `docs/habits-v1.md` y ADR-007. Pausas, rachas, porcentajes agregados, archivo y cambios de configuración siguen aplazados; sus decisiones aprobadas se conservan.

## Contratos y recorrido

`ProfileRepository` proyecta el perfil, consulta el contexto temporal del servidor y confirma el calendario inicial. Sin elección explícita de zona IANA y lunes/domingo, el recorrido muestra configuración pendiente. El calendario es remoto por cuenta y permanece fijo en esta versión; idioma y tema siguen siendo preferencias locales independientes.

`HabitRepository` ofrece creación, listado paginado, detalle, lectura por rangos y registro diario. El adaptador valida filas y respuestas con Zod. Los casos de uso vuelven a validar entradas; dominio no importa React, Expo ni Supabase. Bootstrap compone adaptadores y las rutas solo delegan en presentación. Las nuevas rutas están protegidas por sesión; RLS y RPC autorizan realmente los datos.

Las cantidades se representan como milésimas enteras de una unidad libre, sin conversiones. La entrada admite coma o punto decimal, hasta tres decimales y sin agrupación. Meta/aporte positivos, total desde cero y máximo 999999999.999 unidades. El estado diario mantiene distintos ausencia, cero y binario false.

Crear usa UUID anterior al envío y empieza hoy al confirmar el servidor. `setBinary`, `addAmount` y `setTotal` usan UUID de operación; las sustituciones llevan revisión observada. Un fallo de respuesta conserva identidad y contenido para reintentar la misma operación. Un conflicto obliga a recargar y revisar antes de generar una corrección nueva. Un guardado confirmado cuyo refresco falla se muestra como guardado y bloquea nuevos registros hasta recargar; no se reenvía como una operación nueva.

El comprobante puede ser anterior a escrituras posteriores: nunca se aplica como total vigente. La UI vuelve a leer el estado confirmado y usa su revisión. Los formularios conservan su entrada ante errores, cambios de idioma/tema y fallos de refresco del contexto.

## Fechas y evaluación

El contexto incluye reloj servidor, fecha de negocio, zona y límites de día/semana. Se refresca al volver a foreground y al cruzar el límite informado; también invalida las consultas de hábitos. El servidor valida nuevamente toda escritura después de esperar bloqueos. Reloj del teléfono, idioma y viaje no redefinen fechas.

Las fechas de negocio ya asignadas se transportan a Intl con sus campos de calendario y UTC explícito para formatearlas sin desplazarlas. Esto no convierte instantes ni cambia la zona aplicada al registro. La aritmética de etiquetas usa operaciones UTC de calendario; nunca suma 24 horas a un instante de negocio para obtener el siguiente día.

Un día programado abierto está pendiente o parcial; al cerrar sin cumplir, no cumplido. Una frecuencia semanal flexible cuenta días distintos y no obliga a completar cada fecha. La primera semana parcial conserva X y muestra progreso informativo, sin evaluación. Una semana completa puede cumplir al alcanzar X; si termina por debajo, no cumplida. Correcciones admitidas recalculan desde los registros y la definición inmutable, manteniendo los límites históricos. No hay contadores de cumplimiento, porcentajes ni rachas persistidos.

El historial se conserva y consulta fuera de la ventana editable. Las páginas muestran 14 fechas e incluyen los límites semanales necesarios en consultas acotadas a 31 fechas. Antes del inicio, futuro y días no programados no admiten escrituras; hoy y siete fechas previas sí, cuando son elegibles.

## Presentación y verificación

Creación y listado adaptados a las referencias de Stitch, con catálogos centrales es/en, formateadores Intl y tokens light/dark/system. El listado alterna tarjetas diarias y mapas de 16 semanas con inspección accesible de fechas; consulta por bloques de hasta 28 fechas y reutiliza el editor confirmado. Las preferencias de la sesión se concentran en Más. Véase [diseño de hábitos](../design/habits.md). Sin dependencias nuevas, almacenamiento offline, guest mode ni identidad visual definitiva.

Pruebas: reglas puras, validación, adaptadores, creación, reintentos, conflictos, lectura fallida, calendario explícito, conservación de borradores y rutas protegidas. Las pruebas PostgreSQL reales, la cadena incremental y la concurrencia viven solo en backend. Los resultados ejecutados y límites de revisión nativa se registran en [validation.md](validation.md).
