# ADR-003: persistencia remota y evolución local

- Estado: aceptada.
- Fecha: 2026-10-16.

## Contexto

PostgreSQL será fuente de verdad sincronizada; se desea incorporar SQLite posteriormente sin construir ahora sincronización bidireccional.

## Decisión

Inyectar repositorios por feature y mantener reglas fuera del SDK. El caso actual solo necesita AuthRepository y lectura ProfileRepository; no crear un repositorio genérico ni operaciones sin consumidor.
Migrar solo profiles; documentar el resto como esquema preliminar hasta definir recurrencias, historial y cardinalidad.
Usar UUID estables e instantes de servidor; la zona del perfil es opcional hasta selección explícita.
No persistir la caché Query ni implementar colas offline, Realtime, SQLite, tombstones o resolución de conflictos todavía.

## Alternativas

Crear todas las tablas fijaría silenciosamente reglas funcionales abiertas. Una capa CRUD genérica filtraría detalles de almacenamiento y reduciría invariantes específicas.
Implementar offline sin contrato de conflictos prometería una capacidad inexistente y aumentaría riesgo de perder historial.

## Consecuencias y futuras decisiones

La aplicación requiere red para datos remotos. Un adaptador SQLite podrá implementar contratos de datos pertinentes, pero Auth seguirá necesitando su proveedor.
Antes de sincronizar: decidir transacciones locales, cursors, operaciones idempotentes, versiones de servidor, detección de conflictos y política de merges. updated_at por sí solo no es un protocolo de concurrencia.
Para registros binarios, una operación futura setCompleted(habitId,date,boolean) puede usar una clave única por ocurrencia; no aplicarla a cantidades sin contrato.
Definir borrado, tombstones y retención, separar fecha de negocio de instante y preservar revisiones de programación.
Probar desconexión, reintentos, relojes desalineados, cambios de zona y conflictos antes de anunciar soporte offline.
