# ADR-013: controles semánticos y recompensa personal

Fecha: 2026-11-07. Estado: aprobado e implementado; la evidencia de verificación se registra en [validation.md](../validation.md).

## Contexto

La revisión de usabilidad encontró fechas ISO, zonas IANA y horas tratadas como entradas de texto, además de elecciones cerradas presentadas como acciones. Se solicita una revisión integral conservando la línea visual existente, selectores nativos y una recompensa personal opcional en Metas.

## Decisión

- Fechas: campo seleccionable localizado, calendario nativo, confirmación/cancelación y límites del caso de uso. Las fechas de negocio siguen siendo `YYYY-MM-DD`. Android transporta sus campos como fecha local; iOS usa UTC explícito como transporte. Ninguno determina el día de negocio a partir de la zona del teléfono.
- Horas: reloj nativo con hora/minuto de pared del dispositivo; se conservan las reglas de recordatorios de ADR-012.
- Zona de cuenta: catálogo IANA empaquetado desde `Intl.supportedValuesOf('timeZone')`, con UTC y la zona del teléfono como sugerencia. Buscar y confirmar es obligatorio; no se aplica la sugerencia automáticamente ni se habilita cambiar un calendario confirmado.
- Selecciones cerradas: controles con estados accesibles, búsqueda cuando la lista es extensa y selección explícita. La frecuencia semanal ofrece 1–7 días. Los catálogos de hábitos se cargan por páginas completas antes de buscar; un fallo no se disfraza de catálogo parcial.
- Formularios: validación junto al campo en Metas y confirmación antes de descartar entradas modificadas. Las escrituras inciertas siguen bloqueando la salida y conservan identidad y contenido para reintentar.
- Recompensa: `reward: string | null`, opcional, hasta 400 puntos de código Unicode, texto recortado y vacío normalizado a nulo. Se crea/edita con la configuración; se muestra en detalle, se destaca al estar lograda y se conserva al archivar. Si el progreso deja de alcanzar la meta, desaparece el énfasis y permanece el texto. No existe estado de recompensa recibida.

## Persistencia y compatibilidad

`daily-tracker-supabase` añade `reward` a `goal_versions` mediante migración incremental y conserva las versiones anteriores. Las RPC `create_goal_v2`, `edit_goal_v2`, `get_goal_v2` y `get_goals_v2` exponen el nuevo contrato. Las lecturas v1 mantienen exactamente su forma anterior porque los clientes existentes validan claves estrictamente. Una edición v1 conserva la recompensa vigente; archivo y nueva configuración también la conservan. Historial e idempotencia reutilizan los mecanismos existentes, sin otro almacén ni estado derivado.

Las tablas, restricciones, SQL y pruebas de autorización pertenecen al backend. El móvil recibe únicamente los tipos generados desde PostgreSQL e importados con `pnpm db:types`. Backend compatible debe estar desplegado antes de distribuir este cliente; esta tarea aplica la migración solo localmente.

## Dependencia nativa y alternativas

Se incorpora `@expo/ui` con su adaptador de fecha/hora. Su implementación Android ignora `locale`; se mantiene un parche de pnpm que pasa el idioma a cada diálogo y localiza su contexto, recursos y lista de idiomas Compose. Compose 1.12 consulta `LocalResources` y `LocalLocale` para el título y encabezado. El parche proporciona `LocalProvidableLocaleList`, API pública restringida de AndroidX, dentro del diálogo. Esta dependencia requiere revisión al actualizar Compose. `expo.autolinking.android.buildFromSource` fuerza compilar `expo-ui` desde las fuentes parcheadas.

Esto requiere reconstruir el development build Android. Expo Go contiene su propio módulo y no incorpora este parche nativo; no sirve como evidencia de localización del diálogo. Al actualizar `@expo/ui`, revisar si el soporte ya existe y retirar o actualizar el parche. Las superficies y etiquetas propias de la app consumen catálogos es/en y tokens light/dark/system. La vista web usa controles del navegador exclusivamente para inspección visual; no añade persistencia de sesión web.

Se descarta construir un calendario/reloj propio: la elección de producto es una experiencia nativa. Se conserva el diseño actual de pantallas que ya tienen una interacción apropiada; esta revisión no redefine marca ni reglas de recurrencia.

Fuentes de implementación. [Expo UI DateTimePicker](https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/datetimepicker/), [recursos de Material 3](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/androidMain/kotlin/androidx/compose/material3/internal/Strings.android.kt), [idiomas de Compose](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/ui/ui/src/commonMain/kotlin/androidx/compose/ui/platform/CompositionLocals.kt) y código instalado de `@expo/ui` 58.0.27, especialmente sus adaptadores Android/iOS y `DatePickerView.kt`.
