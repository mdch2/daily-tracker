# Daily Tracker: instrucciones del proyecto

## Contexto y estado

Daily Tracker permite seguir hábitos diarios, organizar rutinas, gestionar objetivos personales y visualizar el progreso. Sus módulos previstos son hábitos, rutinas, objetivos, dashboard, calendario, estadísticas y diario personal.

Al preparar estas instrucciones, el repositorio estaba vacío salvo por `.git`. No hay stack, aplicación, dependencias ni comandos de ejecución definidos. Consulta [las decisiones pendientes](docs/decisiones-pendientes.md) antes de iniciar la implementación. Actualiza este estado y documenta los comandos reales cuando se incorpore el primer código; no inventes comandos ni resultados de pruebas.

## Alcance del MVP

Usa la siguiente base para acotar las futuras tareas. Los detalles funcionales y el orden de entrega se concretan con los criterios de aceptación de cada tarea; esta lista no autoriza a implementar todos los módulos de una vez.

| Módulo | Capacidad mínima orientativa |
| --- | --- |
| Hábitos | Definir un hábito y su recurrencia, registrar y corregir su cumplimiento. |
| Rutinas | Agrupar y ordenar actividades para su consulta diaria. |
| Objetivos | Definir una meta y consultar o actualizar su avance. |
| Dashboard | Resumir lo previsto para hoy y el progreso disponible. |
| Calendario | Consultar la planificación y el cumplimiento por fecha. |
| Estadísticas | Mostrar métricas básicas calculadas a partir de registros reales. |
| Diario personal | Escribir, consultar y editar entradas asociadas a una fecha. |

Deja fuera por defecto redes sociales, rankings, gamificación compleja, recomendaciones con IA, pagos, notificaciones e integraciones externas. Incorpóralos solo si una tarea los solicita. Tampoco presupongas cuentas, sincronización o funcionamiento sin conexión.

## Arquitectura y organización

- Mantén límites por capacidad de negocio. Separa reglas de dominio, presentación y acceso a datos donde sea necesario para probarlos y modificarlos de forma independiente.
- Las reglas de negocio no deben depender de componentes visuales ni de un proveedor de almacenamiento. Usa límites simples; no crees capas o interfaces sin una necesidad concreta.
- Cada módulo es responsable de sus escrituras y expone operaciones claras. Evita dependencias circulares y acceso directo a detalles internos de otros módulos.
- Dashboard, calendario y estadísticas consumen las mismas reglas y registros de origen; no mantengas versiones independientes del cumplimiento o del progreso.
- Organiza el código por funcionalidades y sigue las convenciones del stack cuando se elija. No fijes ahora nombres de carpetas de aplicación, monorepo, backend ni servicios separados.
- `AGENTS.md` contiene acuerdos comunes; `.agents/skills/` contiene procedimientos especializados; `docs/` contiene decisiones y contratos que deban persistir. Crea otras carpetas solo al necesitarlas.
- Coloca las pruebas según la convención elegida y mantén clara su relación con el módulo probado. Extrae código compartido solo cuando existan consumidores reales.

## Convenciones y reutilización

- Al existir código, conserva su estilo, nomenclatura, formateador y contratos públicos. Antes del primer código, documenta las convenciones del lenguaje elegido sin introducir herramientas adicionales por costumbre.
- Usa nombres del dominio coherentes; evita abreviaturas ambiguas. Explica en comentarios las decisiones no evidentes y sus motivos.
- Mantén operaciones pequeñas con responsabilidades claras. No mezcles refactorizaciones ajenas con la funcionalidad solicitada.
- Busca componentes y utilidades existentes antes de crear otros. Reutiliza cuando la semántica y el comportamiento coincidan; no fuerces una abstracción configurable para similitudes solo visuales.
- Sigue las referencias visuales y el sistema de diseño que se proporcionen. Conserva sus recursos y patrones; no definas marca, logotipo, paleta ni identidad comercial definitiva por iniciativa propia.
- Justifica una dependencia nueva por una necesidad de la tarea que no cubran las herramientas existentes. No agregues infraestructura para necesidades hipotéticas.

## Errores, validaciones y datos personales

- Valida los datos externos en el límite de entrada y aplica las invariantes en el dominio. La validación visual ayuda al usuario, pero no sustituye la validación en el punto que acepta la escritura.
- Distingue entradas inválidas, ausencia de datos y fallos de persistencia o comunicación. No conviertas errores en éxitos aparentes ni en datos vacíos silenciosos.
- Informa el fallo con una acción de recuperación cuando exista. Conserva los datos introducidos si falla el guardado y comunica el éxito solo cuando corresponda al resultado real.
- Evita escrituras parciales y reintentos que dupliquen registros. No cambies o elimines historial como efecto secundario de otra operación sin un contrato explícito.
- Trata el diario y los registros personales como privados. No incluyas su contenido ni secretos en logs, fixtures o mensajes de error; usa datos sintéticos para verificar.

## Flujo para desarrollar funcionalidades

1. Lee las instrucciones aplicables, las decisiones relevantes y el código relacionado. Identifica los módulos afectados y las herramientas realmente disponibles.
2. Traduce la tarea en un comportamiento observable y criterios de aceptación. Resuelve las ambigüedades con impacto en datos, alcance o contratos antes de comprometer la implementación; continúa con las partes independientes.
3. Implementa el cambio mínimo completo dentro de los límites existentes, incluyendo los estados de interfaz y persistencia que requiera el caso de uso. Usa solo las Skills pertinentes de la tabla siguiente.
4. Verifica el resultado con evidencia proporcional al riesgo y revisa el diff. Documenta decisiones duraderas y entrega un resumen de cambios, verificaciones y limitaciones.

Las decisiones pendientes no bloquean tareas que no dependan de ellas. No elijas silenciosamente un stack ni una política de negocio porque el repositorio todavía no los defina.

## Skills especializadas

Lee la Skill cuando la tarea corresponda a su descripción o se invoque explícitamente con `$nombre`. Combínalas solo si el cambio cruza sus responsabilidades; no cargues todas por defecto.

| Skill | Cuándo usarla |
| --- | --- |
| [ui-design](.agents/skills/ui-design/SKILL.md) | Implementar o revisar pantallas, componentes, referencias visuales y accesibilidad. |
| [habit-management](.agents/skills/habit-management/SKILL.md) | Cambiar recurrencias, cumplimiento, rachas o métricas derivadas de hábitos. |
| [data-management](.agents/skills/data-management/SKILL.md) | Diseñar o cambiar modelos, contratos de datos, persistencia, migraciones o consistencia. |
| [testing-quality](.agents/skills/testing-quality/SKILL.md) | Diseñar pruebas, investigar regresiones o realizar una revisión de calidad. |

El desarrollo general se rige por el flujo anterior: no existe una Skill `feature-development` que repita estos acuerdos.

## Estrategia de pruebas

- Prioriza pruebas de reglas de negocio, límites de fechas, validaciones y consistencia. Usa pruebas de integración para persistencia y contratos entre módulos; reserva pruebas de extremo a extremo para los recorridos críticos que existan.
- En correcciones de comportamiento, añade una prueba de regresión cuando capture el fallo de forma útil. Evita pruebas que solo reproduzcan la implementación o fijen detalles irrelevantes.
- Haz deterministas reloj, zona horaria y datos de prueba cuando influyan en el resultado. Verifica la interfaz visualmente si cambias su presentación.
- Ejecuta los checks existentes que correspondan al cambio: pruebas, formato, lint, tipos o compilación, según el stack. Si todavía no hay herramientas, realiza las comprobaciones posibles y declara lo que no se pudo ejecutar.
- No instales un framework para validar únicamente instrucciones o cambios documentales sencillos.

## Criterios antes de finalizar

- El resultado satisface los criterios de aceptación y respeta el alcance solicitado.
- Las reglas y cálculos tienen una fuente de verdad; no hay duplicaciones innecesarias ni acoplamientos nuevos injustificados.
- Se cubren las validaciones y los estados de fallo relevantes; los cambios visuales respetan las referencias y son utilizables con teclado.
- Los checks pertinentes pasan, o se explican sus fallos y las verificaciones no ejecutadas sin afirmar que pasaron.
- El diff contiene solo cambios relacionados, sin secretos, dependencias superfluas, artefactos temporales ni funcionalidades añadidas por anticipación.
- Los contratos, decisiones y comandos documentados coinciden con el estado final del repositorio.
