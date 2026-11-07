# ADR-004: repositorios, idiomas y temas permanentes

- Estado: aceptada por instrucción explícita.
- Fecha: 2026-10-16.
- Actualiza la ubicación de persistencia de ADR-002/003; no cambia las reglas de autenticación ni de datos.

## Contexto

La base inicial incluía SQL y configuración Supabase junto al móvil, textos en español y tema no persistido. El producto exige dos repositorios independientes, soporte es/en y light/dark/system en todas las entregas.

## Decisión

Separar la propiedad del esquema en mdch2/daily-tracker-supabase, transfiriendo los archivos existentes sin alterar SQL. El móvil conserva adaptadores cliente y solo recibe el artefacto de tipos del backend.
Añadir control de límites al quality gate; no importar fuentes entre repositorios.

Usar las tres dependencias solicitadas de i18n con recursos centrales tipados y validaciones representadas por códigos. Detectar el dispositivo, permitir cambio manual/sistema y usar inglés de respaldo.
Mantener un único sistema de tokens y resolución de tema para componentes y navegación.

Persistir las dos preferencias con Zustand y SecureStore existente. Es un registro local pequeño, sin necesidad de AsyncStorage ni tablas remotas.
Serializar escrituras y conservar la preferencia anterior si falla el guardado; esperar hidratación y ofrecer reintento de lectura.

## Alternativas y consecuencias

Mantener migraciones en ambos repositorios crearía dos propietarios y queda prohibido.
Copiar datos remotos a Zustand o guardar preferencias en profiles acoplaría la apariencia a login y conexión, sin necesidad.
AsyncStorage sería válido para datos no sensibles, pero añade una dependencia que esta tarea no necesita.
No se crea una pantalla definitiva de ajustes ni una biblioteca nueva de componentes.

La sincronización de tipos requiere un artefacto realmente generado desde PostgreSQL; Docker no está disponible y el snapshot inicial sigue claramente identificado hasta sustituirlo.
Las pruebas automatizadas cubren comportamiento y contraste, pero la validación nativa/visual sigue pendiente del entorno.

Detalles operativos en [límites](../repository-boundaries.md) e [idiomas y temas](../localization-and-themes.md).
