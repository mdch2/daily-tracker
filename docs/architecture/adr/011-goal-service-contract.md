# ADR-011: contrato técnico de Metas v1

- Estado: definido para implementación, sin endpoints implementados.
- Fecha: 2026-10-30.

## Contexto y decisión

Las reglas de [ADR-010](010-personal-goals-v1.md) están cerradas. Se concreta el [contrato de servicios](../goals-service-contract.md) para que ambos repositorios implementen la misma semántica, sin crear infraestructura backend en móvil.

Las nuevas RPC usan un payload JSON discriminado y un adaptador cliente que valida y transforma los datos. Listado y detalle devuelven definición y progreso juntos; el listado calcula también los cinco conteos de estado en la misma instantánea. Se pagina por clave estable, sin descargar todos los registros ni mantener porcentajes persistidos.

Se separan versión de configuración, revisión de cada registro y secuencia de eventos por meta. Toda escritura tiene UUID de operación, comprobante original e historial inmutable, confirmados atómicamente. Una sola responsabilidad privada conserva operaciones aceptadas; el historial autorizado proyecta sus campos seguros sin dar acceso al almacén.

Las contribuciones vinculadas siguen siendo registros actuales de Hábitos. No se crea auditoría duplicada de sus cambios ni fechas de logro inferidas. Un exceso de cantidad vinculada se comunica como progreso no disponible, con estado evaluado exactamente, sin truncar el dato ni bloquear el hábito.

## Alternativas y consecuencias

Se descarta consultar por separado tarjetas y conteos, porque podrían representar estados distintos. Tampoco se promete una instantánea entre páginas ni se introduce un servicio persistente para congelarlas: cada petición es coherente, y escrituras, foreground o cambio de fecha reinician la lectura.

Los timestamps no son el token de concurrencia de registros y un comprobante no se aplica como estado vigente. Las revisiones de configuración y progreso son independientes para no causar conflictos por cambios sin relación.

El backend conserva esquema, permisos, RPC y pruebas reales. El móvil recibe exclusivamente sus tipos generados y contratos de servicio; no modifica los contratos existentes de Hábitos/Rutinas ni añade dependencias. Esta entrega concreta documentación de ambos repositorios, sin migraciones, generación de tipos, implementación de pantallas ni despliegues.
