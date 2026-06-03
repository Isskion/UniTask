# Estado del Proyecto: Plan de Transporte Unigis (Crossdock)

Este documento sirve como instantánea de memoria para retomar el proyecto exactamente donde se ha quedado.

## 📊 Resumen del Estado Actual

Hemos diseñado e implementado completamente el **Core del motor de Crossdock (Versión 3.0)** para UNIGIS EUP. La arquitectura está lista, es relacionalmente robusta, cumple con las restricciones estructurales de UNIGIS (Pedido $\rightarrow$ Orden $\rightarrow$ Parada) y cuenta con asignación de flota de soporte ("NO DETERMINADO").

### Hitos Completados (100%)
*   **Malla de Viajes Autónoma**: Se generan Rutas $\rightarrow$ Viajes $\rightarrow$ Paradas limpios para cada tramo de arrastre.
*   **Integridad Relacional**: Paradas e Items clonados con sus IDs de cliente y orden originales intactos.
*   **Esquema de Estados**: Configuración del nuevo estado **6 (Crossdock)** y sus transiciones de ida y vuelta.
*   **Capa de Anulación**: Reversión operacional automática (marca los viajes/rutas generados como Anulados/Cancelados si se deshace el estado del pedido).

---

## 🗺️ Mapa de Archivos Listos (en `docs/db/`)

| Archivo | Rol / Versión | Función |
| :--- | :--- | :--- |
| [Z_Insert_EstadosCrossdock.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_Insert_EstadosCrossdock.sql) | Configuración | Registra el Estado 6 y las transiciones 4 $\rightarrow$ 6 y 6 $\rightarrow$ 4 en la máquina de estados de UNIGIS. |
| [Z_Tabla_RutaInterDepositoConfig.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_Tabla_RutaInterDepositoConfig.sql) | Tabla Maestra | Almacena la matriz de rutas entre depósitos: `Origen → Destino → Intermedio(s)`. |
| [Z_SP_ResolverRutaInterDepositos.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_ResolverRutaInterDepositos.sql) | Lógica | Evalúa si un pedido requiere tramos crossdock según sus depósitos configurados. |
| [Z_SP_GenerarCrossdock.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_GenerarCrossdock.sql) | **Core v3.0** | El motor principal. Crea la infraestructura operativa de viajes con recursos "NO DETERMINADO". |
| [Z_SP_ProcesarCrossdock.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_ProcesarCrossdock.sql) | Orquestador | Punto de entrada para la máquina de estados. Llama a la resolución y a la generación. |
| [Z_SP_AnularCrossdock.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_AnularCrossdock.sql) | Limpieza | Revierte el proceso marcando los tramos como `Anulados (IdEstadoViaje=4)`. |
| [Z_Test_Crossdock.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_Test_Crossdock.sql) | Pruebas v3.0 | Permite validar todo el flujo usando la ruta real **Portugal (14) → Madrid (7) → Barcelona (9)**. |

---

## 💡 Pregunta Pendiente para Continuar

Para dar el siguiente paso, debemos resolver cómo gestionará el sistema los pedidos que no tengan depósitos de origen/destino pre-asignados en su carga:

> **¿Cómo decidimos los Hubs si el pedido viene de calle a calle?**
> 1.  **Escenario A**: Asumir que UNIGIS ya asigna por defecto el `IdDepositoSalida` y `IdDepositoLlegada` antes de pulsar "Crossdock" (nuestro modelo actual).
> 2.  **Escenario B**: Ampliar el SP `Z_SP_ResolverRutaInterDepositos` para que busque dinámicamente el depósito COL más cercano al domicilio del cliente por Código Postal o por cálculo de coordenadas geográficas.

---
*Este estado del proyecto ha sido consolidado el 15 de Mayo de 2026.*
