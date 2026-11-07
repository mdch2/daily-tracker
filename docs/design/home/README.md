# Home: referencia y alcance

La referencia recibida de Stitch es [screen.png](screen.png), con su [HTML original](code.html) y [sistema visual](DESIGN.md). Los exportados se conservan sin reformatear.

## Implementación

- La ruta de inicio compone `DashboardScreen`; `Screen` comparte scroll, teclado y un encabezado fijo opcional. La navegación inferior usa el tema central.
- `Card` e `IconButton` son controles compartidos; este último también se reutiliza en las pantallas de hábitos. `DashboardWeek`, `DailySummaryCard` y `HabitDayRow` separan calendario, resumen y registro.
- Se mantienen Manrope empaquetada, superficies claras/carbón, acentos lima, catálogos es/en y modos claro/oscuro/sistema con preferencias persistentes. Idioma/apariencia y cierre de sesión están en Más.
- Las fechas y el inicio de semana proceden del contexto de cuenta del servidor. La tira permite consultar la semana actual; el futuro es solo lectura. El editor de registro existente conserva borradores, identidad de operación y reintentos.
- Las consultas se identifican por usuario. Se leen todas las páginas y los registros en bloques de hasta 30 hábitos antes de publicar un resumen; un fallo no se presenta como cero ni como una cuenta vacía.

## Diferencias intencionales de la maqueta

El home muestra hábitos reales y, desde Rutinas v1, una sección independiente de rutinas programadas para la fecha, con progreso confirmado y acceso al detalle. Sus conteos no se mezclan con los de Hábitos. No se inventan horarios, sincronización offline ni rachas. El saludo utiliza el nombre del perfil cuando está disponible. La búsqueda filtra el listado de hábitos del día sin alterar el resumen. El distintivo de apariencia refleja el tema resuelto.

El resumen muestra un conteo y una barra de las metas programadas en la fecha, usando las reglas compartidas de elegibilidad, definición histórica y cumplimiento. Los hábitos flexibles de X días por semana aparecen como oportunidades de registro y se excluyen de las obligaciones diarias. No se implementan porcentajes agregados ni comparaciones semanales pendientes de contrato; la tarjeta de ritmo semanal permite acceder al progreso existente en Hábitos.

La navegación incorpora Hoy, Hábitos, Rutinas y Más. Metas completará los cinco destinos aprobados cuando se implemente; no se añade una pestaña sin un recorrido real. Progreso sigue pendiente.

## Verificación

Las pruebas cubren lectura paginada, fallos, definiciones históricas, exclusión de metas semanales del conteo diario, cuenta vacía, selección de fecha, futuro, búsqueda, traducciones, cambios del tema del sistema y conservación del borrador ante un guardado incierto. El contraste de texto se comprueba en ambos temas.

Verificación del 27 de octubre de 2026: `pnpm check` completado (límites, lint sin advertencias, formato, TypeScript y 187 pruebas en 26 suites). Exportación de bundles Android e iOS completada con `pnpm exec expo export --platform android --platform ios --output-dir dist/home-mobile --max-workers 2`. No se añadieron dependencias ni se modificó el backend. Los bundles no sustituyen una compilación nativa.

Se generó una vista local aislada con los componentes reales y datos sintéticos, sin credenciales ni escrituras remotas. La revisión visual no pudo completarse: el emulador no respondió a la inspección y Computer Use detuvo el acceso al navegador al no poder verificar la URL. Quedan pendientes la comparación visual en tamaños 360–430 px, el texto ampliado y la comprobación nativa iOS/Android; las pruebas de componentes no sustituyen esa revisión.
