# ADR-001: base móvil, módulos y herramientas

- Estado: aceptada.
- Fecha: 2026-10-16.

## Contexto

El repositorio tenía instrucciones y Skills, sin aplicación. La tarea selecciona React Native/Expo, TypeScript, Supabase y herramientas de estado/calidad, y limita la primera entrega a fundamentos.

## Decisión

Usar Expo estable 58, React Native 0.88 y React 19.3 conforme a la matriz publicada y dependencias instalables. pnpm 10.28.2 por petición explícita, Node 22.14.0 disponible y compatible, lockfile versionado.
Organizar por features con rutas delgadas y composition root en bootstrap. Crear capas solo para responsabilidades existentes.
TanStack Query gestiona datos remotos; Zustand solo preferencias de UI. React conserva el estado local.

TypeScript 6.0 corresponde al template de este SDK. ESLint 9 conserva compatibilidad declarada con los plugins de eslint-config-expo 58; ESLint 10 actualmente rompe sus peers, aunque 9 emite aviso de deprecación.
Jest 30 cumple los peers de jest-expo (^29 o ^30), el plugin de watch instalado (^30) y RNTL 14, requerido por Router 58.
La recomendación estática de expo install todavía propone Jest 29 y @types/jest 29: se excluyen explícitamente esas dos recomendaciones, con evidencia de pruebas ejecutadas. No se excluyen paquetes nativos de la comprobación.
react-dom se fija a 19.3.0 para resolver el peer de Router; no activa una entrega web.

## Alternativas

- Bare React Native exigiría más mantenimiento nativo sin una necesidad actual.
- Cuatro capas y carpetas para cada módulo vacío aumentarían coste sin comportamiento.
- Jest 29 coincide con la lista conservadora de Expo, pero no con el peer del plugin watch transitivo actual.
- Actualizar ESLint a 10 requeriría ignorar peers o sustituir el preset de Expo; se prefiere actualizarlo cuando el ecosistema sea compatible.

## Consecuencias

Desarrollo gestionado con Expo y límites reemplazables. Las comprobaciones estáticas no prueban por sí solas ausencia de ciclos ni la ejecución nativa.
Se deben vigilar actualizaciones de ESLint/preset y avisos transitivos. No se añade CI remoto, EAS ni configuración de tiendas sin definir entrega.
