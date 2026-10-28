# Rutinas v1: contrato consumido por la app

Implementación según [ADR-009](adr/009-routines-v1.md), [definición funcional](adr/008-routines-personal-goals.md) y [referencia visual](../design/routines/README.md). Metas personales sigue aplazada.

## Modelo cliente

`Routine` conserva identidad, nombre, inicio, archivo opcional, timestamps de servidor y definiciones ordenadas por fecha efectiva. Cada definición contiene calendario explícito, programación diaria o por días concretos y pasos propios/vinculados con identidad estable, orden y obligatoriedad. Las versiones aplicadas se conservan; solo la futura de la próxima semana puede sustituirse.

`RoutineDayRecord` representa únicamente un paso propio, su fecha, definición histórica, booleano confirmado y revisión. Ausencia y false son distintos. Los hábitos vinculados siguen usando `Habit` y `HabitDayRecord`; su evaluación procede de las reglas de Hábitos.

Para una fecha programada se cuentan los obligatorios elegibles. Todos completos significa completada; hoy sin ninguno completo está pendiente y con parte completos, parcial. Al cerrar incompleta pasa a no completada. Sin obligatorios elegibles no se evalúa ni se divide por cero. Opcionales y hábitos flexibles no aumentan el denominador. No hay una marca independiente de cumplimiento de toda la rutina.

## Operaciones y límites

`RoutineRepository` ofrece listado activo/archivado, detalle, estados propios por rango, creación, edición, archivo y registro propio. La edición sin configuración solo cambia el nombre; con configuración devuelve la fecha efectiva autoritativa. Nombres y pasos propios admiten 1–100 caracteres recortados; hay 1–30 pasos y al menos un obligatorio. No se repite un mismo hábito dentro de una definición.

El adaptador consume las RPC `get_routines`, `create_routine`, `edit_routine`, `archive_routine` y `record_routine_step`, con validación Zod. El detalle/listado recibe hasta 20 rutinas y sus versiones mediante una lectura invocadora con RLS; la representación JSON evita truncar las membresías por el límite REST. Los estados propios se leen para hasta 10 rutinas/una fecha o una rutina/hasta 28 fechas; máximo 840 filas por rango histórico.

`readRoutineWindow` compone estos estados y los datos de los hábitos vinculados: deduplica identidades, consulta solo esos hábitos en grupos de hasta 10 y sus días en grupos de hasta 30. No promete una instantánea global entre esas lecturas independientes; un fallo en cualquier parte impide publicar el conjunto como confirmado. El historial del detalle presenta hasta 14 fechas por ventana y permite recorrer hasta el inicio. Hoy lee todas las páginas antes de mostrar las rutinas de la fecha, incluyendo las archivadas cuando se consulta el pasado.

## Escrituras y recuperación

Solo se aceptan escrituras de pasos propios de hoy según reloj servidor, calendario, programación y versión vigentes. El servidor valida tras adquirir bloqueos. Crear comienza hoy al confirmar; editar estructura aplica la próxima semana de la cuenta. El archivo conserva el último día y anteriores como historial, bloqueando nuevas escrituras propias desde su confirmación y excluyendo fechas posteriores.

Crear usa UUID estable de entidad y pasos; otras escrituras usan UUID de operación. Edición/archivo comparan el timestamp observado y el registro propio su revisión, con 0 para ausencia. La petición y su comprobante se guardan atómicamente. Repetir identidad y contenido reconoce la operación confirmada antes de volver a exigir fecha/archivo; contenido distinto falla. El comprobante no reemplaza una lectura actual.

Los formularios conservan borrador e identidad al fallar. Conflictos obligan a recargar y revisar, sin sobrescribir el borrador. Guardado confirmado y refresco fallido se comunican por separado y bloquean una escritura nueva hasta recargar. Paneles y navegación se protegen mientras exista una petición incierta; no se cambia su fecha automáticamente al cruzar medianoche.

Registrar un hábito desde Rutinas reutiliza el editor y escritor de Hábitos, con escrituras nuevas habilitadas solo para hoy en ese recorrido. Hábitos conserva `[D−7,D]` desde su propio recorrido. Los cambios invalidan las consultas de rutinas y el resumen de Hoy. El calendario refresca ambas features en foreground y al cambiar de día.

## Seguridad y alcance

El diseño detallado, las restricciones, permisos y comprobantes pertenecen solo a `daily-tracker-supabase/docs/routines-v1.md`. Las tablas públicas conceden únicamente SELECT propio mediante RLS; el cliente no tiene DML directo ni acceso a comprobantes/helpers privados. Las escrituras RPC exigen identidad y pertenencia. Los tipos se generaron en backend desde PostgreSQL local y se importaron con `pnpm db:types`.

No se implementan Metas personales, modo invitado, almacenamiento offline, pausas/rachas de rutinas, notificaciones ni temporizadores. Los resultados de pruebas, bundles y revisión visual se distinguen en [validation.md](validation.md).
