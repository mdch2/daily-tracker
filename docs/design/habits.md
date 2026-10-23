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

Los cuadros del mapa son informativos: tocar el nombre abre un inspector de fechas con controles de 48, evitando objetivos diminutos. El botón lateral abre el registro de hoy y reutiliza `HabitDayEditor`, también para consultar o corregir fechas elegibles. El panel impide cerrarse durante un guardado incierto, conserva la identidad de operación y se mantiene al cambiar idioma, tema o fecha de cuenta. Las consultas del inspector mantienen semanas completas estables al cruzar medianoche; las escrituras siguen dependiendo del reloj servidor y de la ventana aprobada.

Las 16 semanas se leen en hasta cuatro bloques de 28 fechas, para respetar el contrato del adaptador y mantener cada respuesta por debajo de 1.000 filas con 30 hábitos. El inspector consulta solo su hábito. No se cambia el esquema, las RPC, los tipos generados ni las reglas de recurrencia; no se añaden dependencias ni endpoints fijos.

La revisión visual usa componentes reales y adaptadores sintéticos en una carpeta temporal del sistema, fuera del repositorio y sin conexión a Supabase. Se comprobaron diario, histórico y panel de registro en español oscuro a 390 × 844 e inglés claro a 360 × 800. Las pruebas cubren cambio de pestaña, filtros, fallos de lectura, rangos por bloques, cambio de año, lunes/domingo, edición antigua de solo lectura, reintentos y conservación al cruzar medianoche. No sustituye pruebas nativas del dispositivo ni persistencia real.

Verificación final: `pnpm check` correcto con 154 pruebas en 21 suites y exportaciones Android/iOS con Hermes correctas. Desde Más se comprobó el cambio es/en y tema sistema, conservando la pestaña histórica al regresar. El estado seleccionado de las pestañas también se verificó en la accesibilidad del navegador.
