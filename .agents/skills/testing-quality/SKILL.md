---
name: testing-quality
description: Diseñar pruebas, investigar regresiones y revisar la calidad de cambios de Daily Tracker. Usar para cobertura de comportamiento, revisión de diffs y fallos entre módulos; no activar para cada ajuste documental o visual trivial.
---

# Pruebas y revisión de calidad

## Activación

Aplica cuando se soliciten pruebas o revisión de código, se corrija una regresión o un cambio requiera verificar reglas temporales, integridad de datos o interacción entre módulos. La revisión por sí sola no autoriza a modificar código.

## Procedimiento

1. Obtén los criterios de aceptación, el diff y los contratos afectados. Descubre los comandos y herramientas del repositorio; no uses un comando habitual como sustituto de uno documentado o comprobado.
2. Relaciona los riesgos del cambio con resultados observables. Elige la capa más pequeña que pueda probar cada resultado: dominio para cálculos, integración para escrituras y contratos, interfaz para interacción y extremo a extremo para recorridos críticos.
   Consultar repository-boundaries.md y localization-and-themes.md. Ejecutar check:boundaries en móvil; las migraciones/RLS se prueban únicamente en daily-tracker-supabase, sin añadir fixtures SQL al móvil.
3. Para un fallo, reproduce su disparador y captura un caso de regresión cuando sea viable. Para una regla nueva, fija ejemplos con resultados esperados independientes del algoritmo implementado. Mantén deterministas reloj, zona y datos cuando influyan.
4. Selecciona bordes pertinentes: valores ausentes o cero, entradas inválidas, fronteras temporales, reintentos, errores de guardado o relaciones eliminadas. No amplíes la matriz con comportamientos que el producto no admita.
5. Ejecuta las pruebas y checks pertinentes. Comprueba tanto el camino exitoso como el fallo relevante; simula solo los límites necesarios y usa datos sintéticos. Si no hay herramientas, realiza una revisión manual concreta y declara la falta de cobertura ejecutable.
6. Revisa el diff buscando cambios de contrato, efectos en consumidores, errores silenciados y resultados incoherentes entre vistas. En una revisión solicitada, prioriza hallazgos verificables por impacto, con ubicación, disparador y consecuencia; separa preferencias de estilo.
7. Al corregir, repite los checks afectados. Amplía la ejecución si cambió una dependencia compartida o persiste una incertidumbre concreta; no repitas suites sin un motivo nuevo.

## Verificación

- Cada riesgo principal tiene evidencia que confirma un comportamiento, no solo detalles internos de la implementación.
- Una prueba de regresión reproduce el fallo previo cuando puede demostrarse sin alterar trabajo ajeno.
- Los hallazgos indican archivos y casos concretos; la ausencia de hallazgos no se presenta como garantía de ausencia de errores.
- El informe distingue checks ejecutados y resultados, verificaciones manuales, fallos previos conocidos y limitaciones pendientes.
- Para presentación y preferencias, cubrir es/en, respaldo inglés, validaciones traducidas, light/dark/system, respuesta a cambios del dispositivo, restauración tras relanzamiento y fallos de lectura/guardado. Comprobar paridad de claves/interpolación y contraste; los mocks de dispositivo no prueban Keychain ni apariencia nativa real.
- Los cambios de documentación e instrucciones se revisan por coherencia, enlaces y formato sin instalar herramientas innecesarias.
