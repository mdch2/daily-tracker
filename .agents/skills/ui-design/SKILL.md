---
name: ui-design
description: Implementar o revisar interfaces de Daily Tracker a partir de referencias visuales y componentes existentes. Usar para pantallas, estados interactivos, adaptación y accesibilidad; no para cambios exclusivos de dominio o persistencia.
---

# Interfaces de Daily Tracker

## Activación

Aplica al crear o modificar una pantalla, traducir una captura o diseño a interfaz, ajustar componentes o revisar fidelidad visual y accesibilidad. Un cálculo de estadísticas sin cambios de presentación no requiere esta Skill.

## Procedimiento

1. Identifica la referencia aplicable, sus recursos y el recorrido solicitado. Inspecciona los componentes y tokens disponibles antes de implementar. Si falta una referencia, usa los patrones existentes; si tampoco existen, presenta una solución mínima provisional sin convertirla en identidad definitiva.
2. Traduce la referencia a jerarquía, estructura, espaciado, tipografía, colores y comportamiento. Separa lo visible de lo que necesita una decisión; una imagen por sí sola no define guardado, navegación ni reglas de negocio.
3. Reutiliza componentes por significado y estados compatibles. Mantén los patrones específicos del módulo en él; extrae variantes compartidas solo cuando haya un uso real. Si existe un sistema de diseño, expresa los ajustes mediante sus tokens y mecanismos.
4. Implementa los estados aplicables al recorrido: inicial, vacío, cargando, con datos, error, validación, foco y acción en curso. Evita dobles envíos; conserva la entrada ante fallos. No añadas estados asíncronos si la operación no los tiene.
5. Comprueba semántica, etiquetas de controles, orden de foco, teclado, contraste y mensajes comprensibles. En calendarios o gráficos, acompaña el color con texto u otra señal y permite consultar la información relevante sin depender de una imagen.
6. Revisa la interfaz renderizada frente a la referencia en tamaños representativos. Examina textos largos, fechas, valores cero y listas vacías. Si no hay entorno ejecutable o herramienta visual disponible, indica la revisión pendiente y limita la conclusión a lo inspeccionado.

## Verificación

- La jerarquía y los recursos coinciden con la referencia vigente; las diferencias intencionales están explicadas.
- No hay desbordamientos que impidan usar el recorrido ni controles inaccesibles mediante teclado.
- Los estados muestran el resultado real de la operación y permiten recuperarse de los errores relevantes.
- Dashboard, calendario y estadísticas presentan datos del dominio; los datos sintéticos de una maqueta están identificados como tales.
- La entrega indica qué pantallas, tamaños y estados se revisaron y qué no se pudo comprobar.
