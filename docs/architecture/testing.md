# Estrategia de pruebas

## Checks ejecutables

pnpm check agrupa límites de repositorio, ESLint sin warnings, Prettier check, TypeScript y Jest. pnpm format aplica formato.
Jest usa jest-expo y React Native Testing Library 14; render e interacciones se esperan de forma asíncrona.
Las pruebas están en tests y se aceptan también archivos *.test.ts(x) junto al módulo. Datos sintéticos exclusivamente.

La cobertura inicial comprueba configuración inválida/clave privilegiada, validación antes del backend, compatibilidad con contraseñas existentes, propagación de errores, conservación del formulario, recuperación de controles y atomicidad/Unicode/concurrencia del almacenamiento seguro.
No se agregan pruebas de rachas ni porcentajes que aún no existen.

## Integración real

Solo en daily-tracker-supabase, su comando pnpm db:test ejecuta pgTAP sobre PostgreSQL local migrado. El móvil no contiene SQL ni ejecuta pruebas de infraestructura. Las pruebas transaccionales crean dos usuarios sintéticos y revierten todo.
Comprueban creación de perfiles desde Auth, RLS activada, lectura por dueño, invisibilidad ajena, actualización permitida, escritura cruzada sin efecto, rechazo de INSERT/DELETE/cambio de propietario/timestamps, zona inválida y acceso anónimo.
El proveedor de autenticación del cliente puede simularse en pruebas de UI; esa simulación no demuestra seguridad de base de datos.

Antes de cada módulo: pruebas unitarias de reglas, integración de repositorios y contratos SQL pertinentes.
Para hábitos, fijar reloj, fecha de negocio, zona IANA y programación efectiva antes de verificar rachas; incluir medianoche y horario de verano cuando corresponda.
E2E se reservará para recorridos reales; no se añade un framework antes de tenerlos.

## Validación móvil pendiente

La exportación de bundles verifica resolución y transformación JavaScript, no SecureStore/Keychain real, enlaces nativos, teclado, VoiceOver/TalkBack o builds de tiendas.
Comprobar en iOS/Android: tamaños pequeños/grandes, tema claro/oscuro, texto ampliado, foco/teclado, errores y carga.
No existe una referencia Stitch para afirmar fidelidad visual.
El registro exacto de resultados, advertencias y comprobaciones no ejecutadas vive en validation.md.

## Idiomas, temas y preferencias

Las pruebas usan los proveedores reales con almacenamiento de preferencias controlado. Cubren catálogo es/en, interpolaciones, respaldo inglés, validaciones traducidas, formato explícito, selección manual/sistema, tres modos, cambio de apariencia del dispositivo, restauración, concurrencia y fallos de lectura/guardado. El contraste de texto se comprueba contra los tokens actuales. Ver [contrato de presentación](localization-and-themes.md).
