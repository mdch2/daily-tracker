# ADR-007: edición de hábitos y registro cuantitativo

- Estado: aceptada.
- Confirmación: 2026-10-23.

El nombre cambia inmediatamente. La frecuencia y la meta cuantitativa se aplican desde el inicio de la próxima semana de la cuenta, según elección explícita del usuario. Cada fecha conserva su definición histórica; las versiones pendientes pueden revisarse antes de activarse. Unidad, modalidad y calendario de cuenta permanecen fijos. Esta decisión corresponde al ADR-008 del backend.

El adaptador recibe el historial de definiciones y valida su identidad, contexto y modalidad comunes. Las reglas resuelven la definición por fecha, compartida por listado, detalle, mapa, resumen y editor. El formulario muestra la fecha de aplicación; tras guardar se consulta el estado confirmado. El nombre usa `rename`, los cambios de configuración usan `edit`, ambos con UUID estable y `updatedAt` observado. Un conflicto conserva el borrador y requiere revisar el estado remoto.

La interfaz cuantitativa diaria ofrece una acción principal para sumar y una alternativa explícita para corregir el total. Muestra unidad y efecto de la operación; el historial empieza en corrección del total. La recarga se ofrece ante fallos o conflictos. Se conservan milésimas exactas, cero explícito, revisiones e idempotencia.

Se reutilizan `HabitSheet`, los campos de frecuencia de creación/edición y el resumen de definición guardada/pendiente. Rutas protegidas, es/en y light/dark/system permanecen centrales. SQL y permisos viven exclusivamente en el backend; el móvil importa sus tipos generados. No se añaden dependencias, conversiones, pausas ni rachas.

Aplicar los cambios hoy exigiría reglas de semanas divididas; se descartó en favor de la próxima semana. Cambiar el nombre también lo actualiza en la consulta histórica, manteniendo la identidad del hábito.
