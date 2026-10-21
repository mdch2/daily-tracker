# ADR-005: cuenta obligatoria en el MVP

- Estado: aceptada para el MVP.
- Fecha: 2026-10-19.

## Contexto

El acceso sin registro permanecía abierto en la base técnica. Las propuestas de Stitch incluyen botones de invitado y mensajes de almacenamiento local que no definen capacidades implementadas.
El usuario decide excluir el modo invitado de la primera versión para limitar la complejidad de conservar los datos personales de hábitos y diario.

## Decisión

El MVP requiere una cuenta y una sesión autenticada para acceder a hábitos, diario y demás datos personales. El diseño de acceso no ofrecerá un modo invitado ni prometerá registro de datos personales sin cuenta.
Se conserva el recorrido de correo y contraseña existente. Esta decisión no incorpora proveedores sociales, biometría ni almacenamiento offline.
La selección de idioma y tema continúa disponible antes del acceso y sus preferencias persisten independientemente de la sesión.

## Alternativas

El acceso como invitado con datos locales exigiría definir conservación, vinculación posterior de la cuenta y tratamiento de pérdidas o conflictos. Se aplaza para una eventual versión futura.
Un usuario anónimo de Supabase también requeriría definir su ciclo de vida y conversión a cuenta; no se incorpora al MVP.

## Consecuencias

La implementación del diseño de autenticación omitirá las acciones de invitado propuestas por Stitch y ajustará sus textos a las capacidades reales.
Las rutas protegidas siguen siendo una barrera de navegación; la autorización de datos continúa dependiendo de RLS y permisos del backend.
El onboarding visual y las reglas de hábitos y rachas siguen pendientes. No se modifica esquema, seguridad del backend ni comportamiento de la aplicación con esta actualización documental.
