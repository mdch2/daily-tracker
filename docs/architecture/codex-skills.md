# Configuración de Codex

AGENTS.md contiene acuerdos permanentes y comandos. Las Skills viven en .agents/skills/<nombre>/SKILL.md con frontmatter YAML name y description, seguido de activación, procedimiento y verificación.
No necesitan scripts propios ni archivos de interfaz porque son procedimientos locales breves.

## Evaluación

| Propuesta                 | Resultado                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| architecture-guardian     | Nueva: revisión transversal de límites y dependencias.                                                         |
| feature-development       | No creada: repetiría el flujo general de AGENTS.md.                                                            |
| ui-implementation         | Cubierta por ui-design existente, con Stitch y accesibilidad.                                                  |
| supabase-development      | Nueva: flujo específico SQL/RLS/Auth/tipos y pruebas PostgreSQL.                                               |
| habit-domain              | Cubierta por habit-management existente, sin decidir políticas abiertas.                                       |
| testing-quality           | Conservada: pruebas, regresiones y evidencia proporcional.                                                     |
| data-management existente | Conservada: semántica y consistencia independientes del proveedor; se combina con Supabase cuando corresponde. |

Las cuatro Skills existentes se conservaron sin renombrarlas para evitar duplicación y romper referencias.
Las dos nuevas no reproducen todo AGENTS.md: describen procedimientos de revisión o integración particulares.

## Fuentes y validación

Se consultó [la documentación oficial de Skills](https://learn.chatgpt.com/docs/build-skills) y la Skill skill-creator instalada, incluyendo su quick_validate.py.
La validación oficial usa Python y PyYAML; el entorno no tenía un Python ejecutable en PATH, por lo que se preparó un runtime temporal fuera del repositorio.
El resultado real de cada validación está documentado en validation.md. El validador comprueba formato/nombres; la revisión semántica adicional revisa activación, solapamientos, referencias y criterios operativos.
