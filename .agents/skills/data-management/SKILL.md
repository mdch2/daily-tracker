---
name: data-management
description: Diseñar o cambiar modelos, contratos, validaciones de datos, persistencia y migraciones de Daily Tracker. Usar cuando cambien escrituras, relaciones o consistencia; no para cambios exclusivos de presentación ni para decidir políticas de recurrencia.
---

# Datos y persistencia

## Activación

Aplica a modelos persistidos, contratos de entrada o salida, consultas, integridad entre entidades, migraciones, importaciones o correcciones de datos. Las reglas de recurrencia pertenecen a `habit-management`; esta Skill aborda cómo representarlas y conservarlas.

## Procedimiento

1. Identifica dónde se originan, validan, escriben y leen los datos del cambio. Si aún no existe almacenamiento, resuelve la decisión necesaria antes de crear un adaptador; no selecciones proveedor, ORM o backend por defecto.
2. Define el contrato mínimo: identificadores estables, campos requeridos y opcionales, tipos, límites, relaciones y propietario si existen cuentas. Diferencia ausencia, valor nulo y cero cuando tengan efectos distintos. Incorpora solo campos con uso en el caso actual.
3. Distingue fechas de calendario de instantes. Preserva la fecha de negocio y la información temporal necesarias para el contrato; no derives todos los días de una conversión implícita a UTC ni de la zona del equipo que ejecuta el código.
4. Coloca las validaciones en el límite de entrada y las restricciones de integridad donde se aceptan las escrituras. Si hay varias entradas, reutiliza el contrato sin acoplarlo a formularios. Valida referencias a entidades existentes y, si aplica, su pertenencia al usuario.
5. Define la unidad de escritura y los efectos ante fallos. Usa atomicidad, restricciones de unicidad o un mecanismo equivalente según el almacenamiento real; contempla concurrencia y reintentos solo donde puedan ocurrir. No confíes en deshabilitar un botón para garantizar integridad.
6. Separa registros de origen y valores calculados. Si una vista necesita almacenar un derivado, especifica cómo actualizarlo o reconstruirlo y comprueba que no se convierta en una fuente contradictoria.
7. Antes de cambiar un esquema o formato existente, identifica datos y consumidores afectados. Prepara conversión, compatibilidad y recuperación acordes al riesgo. Para eliminación o archivo, aplica la política de relaciones e historial; no introduzcas cascadas destructivas implícitas.

## Verificación

- Guardar y volver a leer conserva identificadores, valores, relaciones y significado temporal.
- Las entradas inválidas no dejan cambios parciales; los fallos no se reportan como guardados exitosos.
- Los duplicados y conflictos relevantes al contrato tienen un resultado determinista.
- Si hay migración, se verifica con datos sintéticos representativos del formato anterior y se explica su recuperación o limitación.
- Las consultas y vistas afectadas siguen siendo coherentes después de editar, archivar o eliminar según el contrato vigente.
