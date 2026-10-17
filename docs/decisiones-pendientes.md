# Decisiones pendientes

## Punto de partida

Inspección del 16 de octubre de 2026: solo existía `.git`, sin archivos versionados, código, manifiestos, dependencias, pruebas ni configuración de ejecución. Las instrucciones iniciales son independientes de la tecnología. Ninguna opción de las siguientes está seleccionada.

## Decisiones técnicas

| Decisión | Qué resolver | Cuándo hace falta |
| --- | --- | --- |
| Plataforma y stack | Web, móvil o escritorio; lenguaje, framework, runtime y versiones compatibles. | Antes de crear el esqueleto de aplicación. |
| Herramientas y convenciones | Gestor de dependencias, organización concreta, nomenclatura, formato, lint y tipos si aplican. | Con el primer código, siguiendo el stack elegido. |
| Persistencia y modelo de uso | Almacenamiento local o remoto, necesidad de backend y base de datos; durabilidad, copias y eventual sincronización. | Antes del primer guardado real. |
| Identidad y privacidad | Uso personal sin cuenta o con cuentas; aislamiento de datos, sesiones y eliminación o exportación si se requieren. | Antes de introducir identidad o almacenar datos personales. |
| Modelo temporal | Fecha de negocio frente a instante, origen de la zona horaria, cambios de zona y comienzo de semana. No heredar la zona del entorno de desarrollo como regla del producto. | Antes de calcular recurrencias o métricas por fecha. |
| Calidad y ejecución | Herramientas de pruebas y comandos reales de desarrollo, validación y compilación. | Al introducir código ejecutable. |
| Entrega | Destino de despliegue y automatización mínima necesaria. | Cuando se solicite ejecutar o publicar el MVP. |
| Diseño | Referencias visuales, recursos, componentes, adaptación a pantallas y criterios de accesibilidad. | Antes de consolidar la primera interfaz. La marca definitiva queda abierta. |

## Contratos funcionales por concretar

- **Entrega del MVP:** primer recorrido completo, orden de módulos y criterios de aceptación. La tabla de `AGENTS.md` delimita una base orientativa, no un backlog aprobado en detalle.
- **Hábitos:** tipos de recurrencia iniciales; cumplimiento binario o por cantidad; unidad y objetivo; elegibilidad de registros pasados o futuros; excepciones, pausas y fecha efectiva de cambios.
- **Rachas y métricas:** períodos que cuentan, tratamiento del período actual abierto, omisiones, días no programados, denominadores y resultados cuando no hay períodos elegibles.
- **Rutinas y objetivos:** qué actividades agrupa una rutina; relación opcional con hábitos; avance manual o derivado de una meta, y sus unidades.
- **Historial:** efectos de editar, archivar o eliminar entidades sobre sus registros y vistas derivadas.
- **Diario:** cardinalidad de entradas por fecha y contenido mínimo admitido.

Resuelve solo las decisiones necesarias para la tarea actual. Registra cada resolución aquí con su estado, fecha, motivo, alternativas relevantes y consecuencias; deja de presentarla como pendiente. Si se necesita un registro más extenso, enlázalo desde este documento. Las Skills describen cómo trabajar con estos contratos, sin decidir las opciones pendientes.

## Convenciones de Codex utilizadas

Las instrucciones comunes viven en `AGENTS.md`; las Skills locales viven en `.agents/skills/<nombre>/SKILL.md`, con metadatos YAML `name` y `description` y procedimientos específicos. Pueden seleccionarse por coincidencia con la descripción o por invocación explícita, por ejemplo `$habit-management`. No requieren scripts ni metadatos de interfaz adicionales para este caso.

Referencias oficiales consultadas para esta configuración:

- [Instrucciones con AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- [Creación, estructura y descubrimiento de Skills](https://learn.chatgpt.com/docs/build-skills).
