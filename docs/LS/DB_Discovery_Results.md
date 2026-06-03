# Resultados de Descubrimiento de Base de Datos - LUIS SIMOES (LS)

Este documento recopila la estructura de estados, transiciones y flujos obtenida al ejecutar las consultas de diagnóstico en la base de datos `UNIGIS_DataRepository_LUIS_SIMOES`.

---

## 1. Catálogo de Estados

### 1.1 Estados de Pedidos (`EstadoPedido`)
Estos son los estados que puede tomar un pedido a lo largo de su ciclo de vida en LS:

| ID | Estado / Descripción | Referencia Externa |
|----|----------------------|-------------------|
| **1** | INICIAL | INICIAL |
| **2** | CONFIRMADO | CONFIRMADO |
| **3** | ERROR-REQUIERE AJUSTE | ERROR-REQUIERE AJUSTE |
| **4** | REGISTRADO-OK | REGISTRADO-OK |
| **11** | RECHAZADO | RECHAZADO |
| **13** | ** ANULADO ** | ** ANULADO ** |
| **15** | REQUIERE AUTORIZACION | REQUIERE AUTORIZACION |
| **16** | APROBADO | APROBADO |
| **17** | SINCRONIZA INTERFASE CROSSDOCK | SINCRONIZA INTERFASE CROSSDOCK |
| **20** | CANCELADO POR CLIENTE | CANCELADO POR CLIENTE |
| **30** | PREPARADO | PREPARADO |
| **33** | PROGRAMADO CLIENTE ENTREGA EN DELEGACION ORIGEN | PROGRAMADO CLIENTE ENTREGA EN DELEGACION ORIGEN |
| **38** | PLANIFICAR (Punto-a-Punto) | PLANIFICAR (Punto-a-Punto) |
| **40** | PLANIFICAR (Importacion) | PLANIFICAR (Importacion) |
| **42** | PLANIFICAR (Internacional a Cliente Iberico) | PLANIFICAR (Internacional a Cliente Iberico) |
| **44** | PLANIFICAR (Distribucion Directa) | PLANIFICAR (Distribucion Directa) |
| **45** | PLANIFICAR (Distribucion Local) | PLANIFICAR (Distribucion Local) |
| **46** | PLANIFICAR (Recoleccion Local) | PLANIFICAR (Recoleccion Local) |
| **50** | PLANIFICAR (Exportacion) | PLANIFICAR (Exportacion) |
| **70** | PLANIFICAR (Arrastre) | PLANIFICAR (Arrastre) |
| **71** | PLANIFICAR (Reparto) | PLANIFICAR (Reparto) |
| **72** | PLANIFICAR (Red) | PLANIFICAR (Red) |
| **73** | PLANIFICAR Distribución Exclusivo | PLANIFICAR Distribución Exclusivo |
| **74** | PLANIFICAR Recoleccion Exclusivo | PLANIFICAR Recoleccion Exclusivo |
| **80** | RE-PLANIFICAR REPARTO (CON CARGO) | RE-PLANIFICAR REPARTO (CON CARGO) |
| **81** | RE-PLANIFICAR REPARTO (SIN CARGO) | RE-PLANIFICAR REPARTO (SIN CARGO) |
| **99** | ENTREGADO CLIENTE EN DELEGACION ORIGEN | ENTREGADO CLIENTE EN DELEGACION ORIGEN |
| **102** | RECOLECTADO DELEG ORIGEN | RECOLECTADO DELEG ORIGEN |
| **103** | ENTREGADO CROSSDOCK IBERICO | ENTREGADO CROSSDOCK IBERICO |
| **104** | RECOLECTADO CROSSDOCK IBERICO | RECOLECTADO CROSSDOCK IBERICO |
| **105** | ENTREGADO DELG INTERNACIONAL | ENTREGADO DELG INTERNACIONAL |
| **106** | RECOLECTADO DELG INTERNACIONAL | RECOLECTADO DELG INTERNACIONAL |
| **107** | ENTREGADO RECADERO INTERNACIONAL | ENTREGADO RECADERO INTERNACIONAL |
| **108** | RECOLECTADO RECADERO INTERNACIONAL | RECOLECTADO RECADERO INTERNACIONAL |
| **501** | GENERAR DEVOLUCION | GENERAR DEVOLUCION |
| **503** | DEVOLUCION EN MUELLE | DEVOLUCION EN MUELLE |
| **504** | DEVOLUCION CONTROLADA | DEVOLUCION CONTROLADA |
| **510** | ESPERA EN MUELLE | ESPERA EN MUELLE |
| **901** | DESTRUIDO | DESTRUIDO |
| **902** | FALTA DEFINITIVA | FALTA DEFINITIVA |
| **999** | BLOQUEADO POR SINIESTRO | BLOQUEADO POR SINIESTRO |
| **1020** | ARRIBO A PARADA (Visitado) | ARRIBO A PARADA (Visitado) |
| **1035** | RECOLECTADO EN CLIENTE | RECOLECTADO EN CLIENTE |
| **1045** | ENTREGADO EN COL SALIDA | ENTREGADO EN COL SALIDA |
| **1055** | RECOLECTADO EN DELEG ORIGEN | RECOLECTADO EN DELEG ORIGEN |
| **1065** | ENTREGADO EN DELEG INTERNACIONAL | ENTREGADO EN DELEG INTERNACIONAL |
| **1075** | RECOLECTADO EN DELEG INTERNACIONAL | RECOLECTADO EN DELEG INTERNACIONAL |
| **1095** | ENTREGADO EN RECADERO | ENTREGADO EN RECADERO |
| **1105** | RECOLECTADO EN RECADERO | RECOLECTADO EN RECADERO |
| **1115** | ENTREGADO EN COL CROSSDOCK | ENTREGADO EN COL CROSSDOCK |
| **1215** | RECOLECTADO EN DELEG CROSSDOCK | RECOLECTADO EN DELEG CROSSDOCK |
| **1255** | ENTREGADO EN COL LLEGADA | ENTREGADO EN COL LLEGADA |
| **1275** | RECOLECTADO EN DEPOSITO LLEGADA | RECOLECTADO EN DEPOSITO LLEGADA |
| **1315** | ENTREGADO EN DESTINATARIO | ENTREGADO EN DESTINATARIO |
| **1515** | RECOLECTADO EN (Devolucion) | RECOLECTADO EN (Devolucion) |
| **1714** | ENTREGADO x CLI. EN DELEG. | ENTREGADO x CLI. EN DELEG. |

### 1.2 Estados de Viajes (`EstadoViaje`)
Estados operativos de las rutas/viajes planificados:

*   **1**: PENDIENTE
*   **9**: PROGRAMADO
*   **10**: PENDIENTE AGENCIA
*   **11**: RECHAZADO AGENCIA
*   **12**: ACEPTADO AGENCIA
*   **13**: PENDIENTE CONDUCTOR
*   **14**: ACEPTADO CONDUCTOR
*   **15**: RECHAZADO CONDUCTOR
*   **16**: NUEVO CONDUCTOR
*   **100**: ACTIVO (EN VIAJE)
*   **300**: FINALIZADO
*   **501**: CANCELADO

### 1.3 Estados de Paradas (`EstadoParada`)
Estados relacionales de las paradas dentro de los viajes de reparto o arrastre:

*   **1**: INICIAL
*   **2**: RUTEADA
*   **3**: EN PREPARACION VIAJE
*   **4**: EN VIAJE
*   **20**: ARRIBO A PARADA (Visitado)
*   **35**: RECOLECTADO EN CLIENTE
*   **45**: ENTREGADO EN COL SALIDA
*   **55**: RECOLECTADO EN DELEG ORIGEN
*   **65**: ENTREGADO EN DELEG INTERNACIONAL
*   **75**: RECOLECTADO EN DELEG INTERNACIONAL
*   **95**: ENTREGADO EN RECADERO
*   **105**: RECOLECTADO EN RECADERO
*   **115**: ENTREGADO EN DELEG CROSSDOCK
*   **215**: RECOLECTADO EN DELEG CROSSDOCK
*   **255**: ENTREGADO EN COL LLEGADA
*   **275**: RECOLECTADO EN DEPOSITO LLEGADA
*   **315**: ENTREGADO EN CONSIGNATARIO (DESTINATARIO)
*   **515**: RECOLECTADO EN (Devolucion)
*   **714**: ENTREGADO x CLI. EN DELEG.

---

## 2. Máquina de Estados y Transiciones de Pedidos

A continuación se detallan algunas transiciones permitidas clave (`EstadoPedidoTransicion`) que indican cómo fluye un pedido:

### 2.1 Flujo Inicial
*   **1 (INICIAL)** $\rightarrow$ **2 (CONFIRMADO)** / **13 (ANULADO)**
*   **2 (CONFIRMADO)** $\rightarrow$ **1 (INICIAL)** / **4 (REGISTRADO-OK)**
*   **3 (ERROR-REQUIERE AJUSTE)** $\rightarrow$ **1 (INICIAL)** / **2 (CONFIRMADO)**

### 2.2 Desde REGISTRADO-OK (Estado 4) hacia Planificación
El estado **4 (REGISTRADO-OK)** es la bifurcación principal de planificación según el tipo de transporte:
*   $\rightarrow$ **33 (PROGRAMADO CLIENTE ENTREGA...)**
*   $\rightarrow$ **38 (PLANIFICAR Punto-a-Punto)**
*   $\rightarrow$ **40 (PLANIFICAR Importacion)**
*   $\rightarrow$ **44 (PLANIFICAR Distribucion Directa)**
*   $\rightarrow$ **45 (PLANIFICAR Distribucion Local)**
*   $\rightarrow$ **46 (PLANIFICAR Recoleccion Local)**
*   $\rightarrow$ **50 (PLANIFICAR Exportacion)**
*   $\rightarrow$ **70 (PLANIFICAR Arrastre)**
*   $\rightarrow$ **71 (PLANIFICAR Reparto)**
*   $\rightarrow$ **72 (PLANIFICAR Red)**
*   $\rightarrow$ **73 (PLANIFICAR Distribución Exclusivo)**
*   $\rightarrow$ **74 (PLANIFICAR Recoleccion Exclusivo)**
*   $\rightarrow$ **503 (DEVOLUCION EN MUELLE)**

### 2.3 Desde Planificación hacia Ejecución/Operación
Por ejemplo, desde **38 (PLANIFICAR Punto-a-Punto)** el pedido puede transicionar directamente a los estados de arribo, recolección o entrega física:
*   $\rightarrow$ **1035 (RECOLECTADO EN CLIENTE)**
*   $\rightarrow$ **1045 (ENTREGADO EN COL SALIDA)**
*   $\rightarrow$ **1115 (ENTREGADO EN COL CROSSDOCK)**
*   $\rightarrow$ **1255 (ENTREGADO EN COL LLEGADA)**
*   $\rightarrow$ **1315 (ENTREGADO EN DESTINATARIO)**
*   $\rightarrow$ **1515 (RECOLECTADO EN Devolucion)**

---

## 3. Observaciones Clave de Negocio para LUIS SIMOES (LS)

1.  **Doble Código de Arribo/Visita:**
    *   `EstadoPedido` usa **1020** para `ARRIBO A PARADA (Visitado)`.
    *   `EstadoParada` usa **20** para `ARRIBO A PARADA (Visitado)`.
2.  **Multitud de Sub-Estados de Planificación:**
    *   A diferencia de EUP o Hesa, que suelen tener menos tipos de planificación, LS tiene una segmentación muy detallada (Punto-a-Punto, Importación, Distribución Directa, Local, Recolección, Exportación, Arrastre, Reparto, Red, etc.). Esto sugiere que las reglas de asignación y enrutamiento dependerán fuertemente del canal o del `IdTipoPedido` asignado.
3.  **Lógica Crossdock y Delegaciones:**
    *   La presencia de estados como `1115` (`ENTREGADO EN COL CROSSDOCK`), `1215` (`RECOLECTADO EN DELEG CROSSDOCK`), `1255` (`ENTREGADO EN COL LLEGADA`) y `1275` (`RECOLECTADO EN DEPOSITO LLEGADA`) confirma que **LS cuenta con una operativa crossdock muy activa e intermediada por almacenes/hubs propios**, similar a la implementada en EUP/Hesa.
