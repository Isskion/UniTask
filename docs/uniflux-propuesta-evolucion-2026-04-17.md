# UniFlux — Propuesta de Evolución Estratégica
**Fecha:** 2026-04-17  
**Estado:** Para Revisión (Draft)  
**Autor:** Antigravity (AI)

---

## 1. Contexto
Tras completar el despliegue del **Modo C4 Architecture (v4)**, UniFlux ha alcanzado la paridad funcional con herramientas de diagramación estándar. Este documento propone las líneas de evolución para transformar UniFlux de un "dibujador de diagramas" a una "plataforma de inteligencia de arquitectura" integrada en UniTask.

---

## 2. Análisis del Roadmap Actual (Pendiente)

Los siguientes puntos ya están identificados en el informe de mantenimiento y se consideran **necesarios** para cerrar el ciclo actual:

| Item | Impacto | Justificación Técnica |
| :--- | :--- | :--- |
| **Pipeline IA de 2 fases** | 🔴 Muy Alto | Genera primero un `SystemModel` (lógico) y luego el grafo. Evita layouts caóticos y mejora la coherencia entre niveles C4. |
| **Editor de Contratos (Edges)** | 🟡 Medio | Permite documentar protocolos, SLAs y payloads (JSON/XML) directamente en las flechas del diagrama. |
| **Panel de Insights UI** | 🟡 Medio | Visualiza los resultados de `analysis.ts` (puntos de fallo, ciclos, nodos huérfanos) de forma proactiva al usuario. |

---

## 3. Nuevas Propuestas (Evolución Estratégica)

Para maximizar el valor de UniFlux dentro del ecosistema UniTask, se proponen las siguientes adiciones:

### A. Trazabilidad: Arquitectura → Realidad
Actualmente, los nodos C4 son etiquetas de texto.  
*   **Propuesta:** Vincular nodos (Containers/Components) con entidades reales de UniTask (ej. Colecciones de Firestore, Interfaces de API documentadas).
*   **Valor:** El diagrama se convierte en el "Portal" del proyecto. Al hacer clic en una base de datos en el C4, se abre su esquema de mapeo.

### B. Linter de Arquitectura (Policy Enforcement)
Extender la capa de inteligencia para validar reglas de diseño.
*   **Propuesta:** Implementar políticas como *"Un componente web no puede conectar directamente con una base de datos (debe pasar por API)"*.
*   **Valor:** Garantiza la calidad arquitectónica de forma automática durante la fase de diseño.

### C. Navegación Drill-down (Contexto Híbrido)
Puente entre arquitectura y lógica de procesos.
*   **Propuesta:** Permitir que un componente C4 tenga un "enlace profundo" a un **Visual Flow**.
*   **Valor:** El C4 muestra *qué* hay; el Visual Flow muestra *cómo* funciona la lógica interna de ese componente específico.

### D. Observabilidad Visual
*   **Propuesta:** Sincronizar estados de salud (Health Checks). Si un servicio monitorizado en UniTask falla, su nodo en el C4 cambia de color a rojo o muestra un badge de alerta.
*   **Valor:** Transforma el diagrama de documentación estática en un panel de monitorización arquitectónica.

---

## 4. Roadmap Sugerido por Corrientes (Streams)

Se propone organizar el trabajo en tres frentes para que el equipo pueda priorizar:

### Stream 1: Inteligencia y Calidad (The Brain)
*   **Fase 1:** Implementación de AI Pipeline 2-fases (`Prompt -> SystemModel -> Graph`).
*   **Fase 2:** Sidebar de Insights (errores de validación y análisis de grafos).
*   **Fase 3:** Linter de políticas de arquitectura (reglas de diseño personalizadas).

### Stream 2: Documentación y Detalle (The Muscle)
*   **Fase 1:** Ampliación de metadatos en aristas (SLA, esquemas de datos, frecuencia).
*   **Fase 2:** Mapeo de componentes con Interfaces de UniTask.
*   **Fase 3:** Soporte para Nivel L4 (Código/Estructura de clases).

### Stream 3: Integración y UX (The Bridge)
*   **Fase 1:** Navegación entre diagramas (C4 <-> Visual Flow).
*   **Fase 2:** Exportación enriquecida (SVG interactivo con enlaces).
*   **Fase 3:** Modo "Live" con indicadores de estado de servicios reales.

---

## 5. Recomendación de Prioridad Inmediata

1.  **Pipeline IA (Phase 1):** Es la mayor fuente de fricción actual (la IA a veces coloca los nodos en lugares extraños).
2.  **Mapeo de Interfaces:** Es lo que da "sentido de producto" a UniFlux dentro de UniTask.

---
*Documento preparado para revisión por el equipo de arquitectura y producto.*
