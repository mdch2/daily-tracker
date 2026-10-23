# Diseño de creación de hábitos

Referencia: pantalla «Crear Hábito» de [Daily Tracker — Manrope UI Design System en Stitch](https://stitch.google.com/projects/17936847200751344870), inspeccionada en el navegador.

Se adapta su composición al contrato aprobado de la primera entrega: encabezado con retorno, bloque «Diseña tu constancia», tarjetas de nombre, frecuencia programada y tipo de meta diaria, controles compactos con acento lima y acción principal. Se conserva Manrope, los tokens centrales y light/dark/system, con textos y accesibilidad es/en. Los días tienen nombres accesibles completos y objetivos táctiles de 48; el atajo de lunes a viernes sigue permitiendo editar cada día.

Los campos de categoría, icono personalizable, tono de acento, momento de enfoque y recordatorio de la maqueta quedan fuera de esta entrega: el contrato actual no los persiste ni programa notificaciones. El icono del nombre es decorativo. Se mantienen las tres frecuencias aprobadas, las cantidades exactas, el calendario de cuenta y el reintento con identidad estable ante respuestas inciertas. No se incorpora el invitado ni las promesas de almacenamiento local del proyecto de Stitch.

Las preferencias de la sesión se concentran en la pestaña Más. El panel previo al acceso y las opciones ante configuración pendiente siguen disponibles. Inicio, listado, creación, detalle y calendario no repiten los controles.

## Verificación

Revisión de los componentes reales con React Native Web en una vista previa local aislada: español oscuro a 390 × 844 e inglés claro a 360 × 800, con frecuencia por días fijos, meta cuantitativa y error sintético que conserva los valores y ofrece reintentar el mismo guardado. La vista previa utiliza adaptadores sintéticos y preferencias en memoria; no escribe en Supabase ni verifica persistencia nativa.

También se comprobó Más en claro y oscuro, el cambio es/en y la selección de tema sistema. `pnpm check` pasó con 143 pruebas en 19 suites, incluidos los nuevos pares de contraste, el atajo de días y la protección de Más sin sesión. Las exportaciones Android/iOS con Hermes finalizaron correctamente.

La conexión nativa de Computer Use devolvió «native pipe unavailable» tras reintentar y reiniciar su sesión. La revisión de estos cambios en el emulador queda pendiente; no se sustituye por la inspección de navegador.
