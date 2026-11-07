# Diseño de hábitos

## Creación

Referencia: pantalla «Crear Hábito» de [Daily Tracker — Manrope UI Design System en Stitch](https://stitch.google.com/projects/17936847200751344870), inspeccionada en el navegador.

Se adapta su composición al contrato aprobado de la primera entrega: encabezado con retorno, bloque «Diseña tu constancia», tarjetas de nombre, frecuencia programada y tipo de meta diaria, controles compactos con acento lima y acción principal. Se conserva Manrope, los tokens centrales y light/dark/system, con textos y accesibilidad es/en. Los días tienen nombres accesibles completos y objetivos táctiles de 48; el atajo de lunes a viernes sigue permitiendo editar cada día.

Los campos de categoría, icono personalizable, tono de acento, momento de enfoque y recordatorio de la maqueta quedan fuera de esta entrega: el contrato actual no los persiste ni programa notificaciones. El icono del nombre es decorativo. Se mantienen las tres frecuencias aprobadas, las cantidades exactas, el calendario de cuenta y el reintento con identidad estable ante respuestas inciertas. No se incorpora el invitado ni las promesas de almacenamiento local del proyecto de Stitch.

Las preferencias de la sesión se concentran en la pestaña Más. El panel previo al acceso y las opciones ante configuración pendiente siguen disponibles. Inicio, listado, creación, detalle y calendario no repiten los controles.

### Verificación de creación

Revisión de los componentes reales con React Native Web en una vista previa local aislada: español oscuro a 390 × 844 e inglés claro a 360 × 800, con frecuencia por días fijos, meta cuantitativa y error sintético que conserva los valores y ofrece reintentar el mismo guardado. La vista previa utiliza adaptadores sintéticos y preferencias en memoria; no escribe en Supabase ni verifica persistencia nativa.

También se comprobó Más en claro y oscuro, el cambio es/en y la selección de tema sistema. `pnpm check` pasó con 143 pruebas en 19 suites, incluidos los nuevos pares de contraste, el atajo de días y la protección de Más sin sesión. Las exportaciones Android/iOS con Hermes finalizaron correctamente.

La conexión nativa de Computer Use devolvió «native pipe unavailable» tras reintentar y reiniciar su sesión. La revisión de estos cambios en el emulador queda pendiente; no se sustituye por la inspección de navegador.

## Listado diario e histórico

Referencia: [preview dinámico de Stitch](https://stitch.google.com/preview/17936847200751344870?node-id=e85895c497bc41faad479452b65046b7), inspeccionando sus dos pestañas. La diaria presenta tarjetas compactas con estado de hoy, mínimo, valor confirmado y progreso semanal flexible cuando corresponde. La histórica conserva las tarjetas y añade un mapa de 16 semanas por hábito, alineadas con el inicio de semana de la cuenta. La fecha de hoy y su zona vienen del contexto del servidor.

Los filtros operan sobre los tipos binario y cuantitativo disponibles en la página. No se simulan las categorías ni los contadores de racha de la maqueta. Los hábitos y las ventanas históricas se paginan por separado. Los colores se derivan de `dayStatus`, con leyenda textual y estados distintos para futuro, fechas previas al inicio y días no programados. Un fallo de lectura no se representa como ausencia de registros.

Los cuadros del mapa son informativos: tocar el nombre abre el detalle de fechas con controles de 48, evitando objetivos diminutos y conservando como fecha inicial el final de la ventana histórica seleccionada. El botón lateral abre el registro de hoy y reutiliza `HabitDayEditor`, también para consultar o corregir fechas elegibles. El panel impide cerrarse durante un guardado incierto, conserva la identidad de operación y se mantiene al cambiar idioma, tema o fecha de cuenta. Las consultas del inspector mantienen semanas completas estables al cruzar medianoche; las escrituras siguen dependiendo del reloj servidor y de la ventana aprobada.

Las 16 semanas se leen en hasta cuatro bloques de 28 fechas, para respetar el contrato del adaptador y mantener cada respuesta por debajo de 1.000 filas con 30 hábitos. El inspector consulta solo su hábito. No se cambia el esquema, las RPC, los tipos generados ni las reglas de recurrencia; no se añaden dependencias ni endpoints fijos.

La revisión visual usa componentes reales y adaptadores sintéticos en una carpeta temporal del sistema, fuera del repositorio y sin conexión a Supabase. Se comprobaron diario, histórico y panel de registro en español oscuro a 390 × 844 e inglés claro a 360 × 800. Las pruebas cubren cambio de pestaña, filtros, fallos de lectura, rangos por bloques, cambio de año, lunes/domingo, edición antigua de solo lectura, reintentos y conservación al cruzar medianoche. No sustituye pruebas nativas del dispositivo ni persistencia real.

Verificación final: `pnpm check` correcto con 154 pruebas en 21 suites y exportaciones Android/iOS con Hermes correctas. Desde Más se comprobó el cambio es/en y tema sistema, conservando la pestaña histórica al regresar. El estado seleccionado de las pestañas también se verificó en la accesibilidad del navegador.

## Detalle y corrección de registros

Referencia: [preview «Editar Hábito» de Stitch](https://stitch.google.com/preview/17936847200751344870?node-id=9adc5b3182bf4073b174d555e3bb464d). El alcance inicial fue el detalle visual y la corrección de registros, manteniendo fijos nombre, meta y frecuencia. La ampliación del 23 de octubre descrita abajo habilita su edición real. Se mantiene «Detalle del hábito» como título del recorrido; no se incorporan categorías, rachas, porcentajes, horario ideal ni hitos ilustrativos.

La composición conserva encabezado, tarjeta de identidad, selector de período, mapa con leyenda, registro seleccionado e historial reciente. Los períodos son reales: semana de la cuenta, mes calendario, tres meses terminando en el mes seleccionado y año calendario. Sus flechas recorren períodos anteriores hasta el inicio del hábito. El mapa se adapta al ancho y permite desplazamiento horizontal cuando sea necesario; la consulta de fechas se hace con controles accesibles y el historial desplegable de 14 fechas, incluyendo ausencia de registros.

`HabitPeriodMap` reutiliza los colores derivados de `dayStatus`; `HabitSummary`, `HabitValue` y `HabitRecordSheet` presentan y corrigen el estado confirmado. Las correcciones refrescan el mapa, el resumen y el historial. El borrador y su operación sobreviven al cambio de fecha de cuenta. Los instantes de actualización se formatean en la zona del hábito. Una lectura fallida muestra error y recuperación sin representar fechas vacías como hechos.

Se mantienen `Screen`, los proveedores y layouts centrales, protección de rutas y preferencias es/en y light/dark/system. No se cambia SQL, RLS, RPC, tipos generados ni configuración de rate limits: Auth conserva el manejo de 429, y la limitación efectiva de solicitudes corresponde al backend.

Verificación del detalle: componentes reales con adaptadores sintéticos en la carpeta temporal del sistema; español oscuro a 390 × 844 e inglés claro a 360 × 800. Se confirmó la corrección de 5 a 24 páginas y su refresco. `pnpm check` pasó con 162 pruebas en 23 suites; exportaciones Android/iOS con Hermes correctas. Las pruebas incluyen años bisiestos, límites de semana, navegación histórica, lectura fallida, correcciones antiguas de solo lectura y reintento al cruzar medianoche. Esta comprobación en navegador no verifica el emulador ni escrituras reales en Supabase.

## Edición y simplificación cuantitativa — 23 de octubre de 2026

El lápiz abre un formulario real de nombre, frecuencia y mínimo cuantitativo. El nombre cambia inmediatamente; los otros cambios desde la próxima semana de la cuenta, con fecha visible antes del guardado y configuración pendiente en el detalle/listado. La unidad y el modo de medición se conservan. Las correcciones, el mapa y los valores históricos usan la definición de cada fecha; véase [ADR-007](../architecture/adr/007-habit-editing.md).

Creación y edición comparten `HabitScheduleFields`; ambos paneles usan `HabitSheet`. `HabitDefinitionSummary` muestra configuración guardada y pendiente. El registro cuantitativo diario deja una acción principal para sumar, incluye la unidad y explica su efecto. «Corregir el total del día» cambia explícitamente a sustitución; en fechas anteriores comienza en ese modo. La recarga queda para errores/conflictos. Se conservan el borrador ante fallos, la identidad de operación y el guardado confirmado.

`pnpm check`: 174 pruebas en 24 suites; exportaciones Android/iOS con Hermes correctas. El backend pasó 216 comprobaciones pgTAP, migración aislada con conservación exacta de fixtures y concurrencia de renombres/edición. Tipos regenerados e importados. Computer Use no encontró navegadores conectados en esta sesión: la revisión visual de esta ampliación y el recorrido en emulador siguen pendientes. Las capturas anteriores documentan la entrega previa.
