# Diseño de autenticación

Referencia: [Daily Tracker — Manrope UI Design System en Stitch](https://stitch.google.com/projects/17936847200751344870).

## Alcance

Acceso por correo y contraseña, registro, solicitud de recuperación, nueva contraseña, confirmación de envío y validación de enlaces. La implementación consume los contratos de Auth existentes; no incorpora escrituras de perfil ni funcionalidades de hábitos.

El MVP requiere cuenta según ADR-005. El formulario omite invitado, biometría, Apple/Google, nombre de perfil y consentimiento legal ficticio que aparecen en el mock. No hay enlaces a políticas inexistentes ni promesas de almacenamiento local de hábitos o diario.

## Adaptación visual

Se conserva el lenguaje de la referencia: Manrope, fondos carbón, acento lima, tarjetas redondeadas e iconografía lineal. El modo claro usa superficies neutras y verde oscuro para enlaces, evitando texto lima sobre blanco. Los colores viven en shared/theme/tokens.ts.

Se simplifica el acceso a una acción principal por pantalla. El encabezado de marca y el motivo de bloques son provisionales. El panel de preferencias evita desplazar el formulario con seis botones de configuración y sigue siendo accesible antes de iniciar sesión.

Los campos usan cuerpo de 16, borde de foco y etiquetas persistentes. Los controles tienen objetivos táctiles de al menos 48 y admiten ajuste de fuente. El contenido puede desplazarse y se adapta al teclado, sin alturas fijas del formulario.

## Recursos y dependencias

- expo-font carga fuentes locales empaquetadas; el arranque incluye carga y reintento si falla.
- @expo-google-fonts/manrope proporciona Regular 400, Medium 500, SemiBold 600 y Bold 700; no se solicitan fuentes a Google durante el uso.
- @expo/vector-icons proporciona Feather. Los iconos decorativos no sustituyen etiquetas accesibles.
- react-native-web es una dependencia de desarrollo para inspeccionar los componentes en navegador. No cambia las plataformas iOS/Android ni la seguridad de la sesión nativa.

## Comportamiento

Las contraseñas nuevas requieren 8–128 caracteres. El acceso acepta contraseñas anteriores sin imponer ese mínimo retroactivamente. Las entradas se conservan ante fallos y cambios de idioma o tema.

Durante el envío se bloquean campos y navegación del formulario, y se mantiene una única solicitud en curso. Registro y recuperación muestran confirmación después de la respuesta de la acción; la recuperación conserva su mensaje genérico para evitar revelar cuentas.

La verificación real de correos PKCE, teclado, autofill, SecureStore y lectores de pantalla requiere una development build y un dispositivo. La inspección de navegador y las pruebas de componentes no sustituyen esa revisión.

## Verificación del 19 de octubre de 2026

- pnpm check: límites, lint, formato, tipos y 57 pruebas correctos. Los casos de interfaz cubren conservación de valores, cambios de idioma y tema, contraseña visible/oculta, bloqueo de envíos repetidos, recuperación y confirmaciones tras respuesta.
- Los pares de texto y fondo definidos para ambos temas cumplen 4.5:1 en las pruebas; los bordes de campo superan 3:1 sobre su superficie.
- Inspección de los componentes reales con React Native Web en una vista previa local aislada: acceso oscuro en español a 390 × 844, acceso y registro claros en inglés a 390 × 844, registro y confirmación oscuros en español a 360 × 800, recuperación clara en inglés y nueva contraseña oscura en español a 430 × 932 y panel de preferencias en ambos temas. Sin desbordamiento horizontal en los anchos comprobados.
- La vista previa usa un adaptador sintético sin conexión a Supabase y preferencias solo en memoria. No acredita sesiones, envío de correos ni persistencia nativa reales.
- Exportaciones separadas de Android e iOS correctas, con bytecode Hermes y las cuatro fuentes e iconos empaquetados. El primer intento dentro del aislamiento falló por permisos del compilador sobre su archivo temporal; la repetición fuera del aislamiento finalizó correctamente. No sustituye una compilación nativa ni pruebas de dispositivo.
- pnpm exec expo install --check --pnpm recomienda parches de dependencias existentes: Expo 58.0.16, expo-localization 58.0.5 y expo-router 58.0.24. Esta entrega conserva las versiones base; los módulos añadidos de fuentes e iconos no aparecen como incompatibles.
