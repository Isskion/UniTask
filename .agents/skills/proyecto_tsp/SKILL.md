---
name: proyecto_tsp
description: Conocimiento funcional, de arquitectura y reglas del Proyecto Transpais (TSP) e integración con UNIGIS TMS.
---

# Proyecto Transpais (TSP) - Base de Conocimiento

Transpais es un operador logístico de referencia en España con presencia en Francia, Polonia y Bulgaria.
El proyecto en UNIGIS TMS engloba la creación de **3 operaciones independientes**:
1. **Internacional** (punto de partida inicial)
2. **Distribución**
3. **Intermodal**

## Estructura Organizativa

En UNIGIS TMS se usa la jerarquía de cuatro niveles:
- **Empresa:** Transpais
- **Sucursales (Países):** España, Polonia, Bulgaria, Francia
- **Operaciones:** Internacional La Selva, Internacional Atlántico, Internacional Polonia, Internacional Bulgaria, Internacional Montouir.
- **Depósitos:** Almacén La Selva, Almacén Vigo, Almacén Francia, Almacén Polonia, Almacén Bulgaria, Almacén Bélgica, Cabanillas del Campo.

Cada depósito tiene asociada un área de influencia por país y código postal.

## Arquitectura de Integración
La solución integra cuatro sistemas:
1. **Transporeon (Interfaz 1):** Origen principal de los pedidos (Assigned Transport Interface). Los pedidos ingresan en estado `INGRESADO`.
2. **MS365 Business Central:** ERP de maestros y finanzas.
   - Sincroniza maestros hacia UNIGIS (Clientes, Vehículos, Transportes).
   - Recibe preliquidaciones de Venta y Costo (JsonSyncout).
3. **Webfleet:** Proveedor único de telemetría para flota propia (160 vehículos). Recibe información en tiempo real de vehículos, conductores, eventos y tiempos de conducción.
4. **UNIGIS TMS:** Gestión operativa central (OM, Fleet, Tracking, Dashboard, App X Deliveries, Portales).

## Operativa 4PL - Modelo Ball
Transpais opera como 4PL para su cliente **BALL**.
- **Regla de identificación (Catálogo Dinámico):** Si el Cliente Dador es "BALL" y el Almacén de Carga es "Novelis", "Constellium", o "Speira", el pedido se clasifica como 4PL.
- **Facturación / Tarificación:** Varía según quién ejecute (Tercero de Ball, Transpais, Transpais + agencia, Transpais + intercompany). Puede ser facturación a Ball (4PL + Transporte + Indexación gasoil) o solo 4PL si lo ejecuta un tercero de Ball.

## Modelo Intercompany
Cuando una empresa del grupo capta un viaje y lo ejecuta otra (ej. España lo capta y Polonia lo ejecuta):
- **Regla general:** 8% a la empresa captadora, 92% a la ejecutora.
- **Precios especiales:** Tarifas fijas acordadas cargadas en plantilla TMS.

## Flujo Operativo y Matriz de Estados

### Pedidos (`dbo.EstadoPedido`)
**Estados Ciertos:** 1 INGRESADO -> 2 ERROR -> 3 GRABADO -> 100 CONFIRMADO -> 101 EN PLANIFICACION / PLANIFICAR -> 102 PLANIFICADO EN PREPARACIÓN -> [303 ENTREGADO / 304 ENTREGA PARCIAL / 305 NO ENTREGADO] (Espejos) -> [400 RECOLECTADO / 404 NO RECOLECTADO / 405 RECOLECTADO PARCIAL] (Espejos) -> 502 LIQUIDADO
- `INGRESADO` (1): Entra de Transporeon, Portic, SIC, Generix WMS o carga manual Excel.
- `ERROR-REQUIERE AJUSTE` (2): Faltan datos críticos o dirección no geocodificada en maestros.
- `GRABADO` (3): Procesos `CompletarPedido` y `ValidarPedido` automáticos de UNIGIS.
- `CONFIRMADO` (100): Customer Service revisa, preasigna y confirma.
- `EN PLANIFICACION` / `PLANIFICAR` (101): Planificador inicia creación de viajes (directos, arrastres, repartos, etc).
- `PLANIFICADO EN PREPARACIÓN` (102): Ruta confirmada y enviada a WMS Generix para picking y etiquetado (Distribución).
- `ENTREGADO` (303) / `ENTREGA PARCIAL` (304) / `NO ENTREGADO` (305): Estados espejo disparados por la Parada de entrega.
- `RECOLECTADO` (400) / `NO RECOLECTADO` (404) / `RECOLECTADO PARCIAL` (405): Estados espejo disparados por la Parada de devolución del contenedor o recogida.
- `LIQUIDADO` (502): Viajes rendidos y liquidados (cantidades reales).

### Viajes (`dbo.EstadoViaje`)
**Estados Ciertos:** 105 INACTIVO -> 106 ASIGNADO / PENDIENTE -> 107 RECHAZADO o 108 CONFIRMADO -> 206 PREPARADO -> 300 CARGADO / 301 CARGADO PARCIAL -> 200 ACTIVO / EN EJECUCIÓN -> 403 FINALIZADO -> 402 RENDIDO -> 500 LIQUIDABLE -> 501 LIQUIDADO
- `INACTIVO` (105): Viaje recién creado tras planificar un pedido.
- `ASIGNADO / PENDIENTE` (106): Vehículo y conductor asignados. Se valida recurso.
- `RECHAZADO` (107): El transportista tercero rechaza la asignación en el Portal.
- `CONFIRMADO` (108): Transportista acepta asignación; se valida documentación (ADR, ITV, licencias) y se solicita PIN Code.
- `PREPARADO` (206): WMS notifica picking y etiquetado completado en almacén (Interfaz 5 y 6).
- `CARGADO` (300) / `CARGADO PARCIAL` (301): Carga física completada en muelle por el conductor (o supervisor si hay incidencia).
- `ACTIVO / EN EJECUCIÓN` (200): Conductor inicia viaje en la App Mobile (PIN visible / salida a reparto). Activa Ruta = 201.
- `FINALIZADO` (403): Conductor completa todas las paradas en UNIGIS X Deliveries (Ruta = 401).
- `RENDIDO` (402): Chofer entrega Carta de porte sellada, eCMR y rinde items no entregados al almacén (dispara Interfaz 9 reingreso WMS).
- `LIQUIDABLE` (500): Incidencias revisadas y aprobadas administrativamente, listo para calcular tarificación.
- `LIQUIDADO` (501): Preliquidaciones enviadas a MS365 BC (Interfaz 10) y confirmadas. Dispara Pedido = 502.

### Paradas (`dbo.EstadoParada`)
**Estados Ciertos:** 203 PENDIENTE -> 206 PREPARADO -> 204 EN VIAJE -> 205 VISITADO / EN GEOCERCA -> [300 CARGADO / 301 CARGADO PARCIAL / 302 NO CARGADO] (Origen) -> [303 ENTREGADO / 304 ENTREGA PARCIAL / 305 NO ENTREGADO] (Destino) -> [400 RECOLECTADO EN DEVOLUCIÓN / 404 NO RECOLECTADO / 405 RECOLECTADO PARCIAL] (Devolución/Recogida) -> 406 RENDIDO (Rendición Almacén)
Las paradas se registran desde *UNIGIS X Deliveries* (App Mobile) o geocercas automáticas (Webfleet).

#### EstadoParadaVisita (Tabla de control de visitas de Parada)
- `0`: PENDIENTE (Color: 13421772) - Parada activa en ruta sin detectar arribo.
- `1`: VISITANDO (Color: 13421772) - Vehículo dentro de la geocerca.
- `2`: VISITADO (Color: 16239131) - Arribo y salida a tiempo y en orden planificado.
- `3`: VISITADO FUERA DE HORARIO (Color: 4635634) - Llegada detectada fuera de ventana.
---
name: proyecto_tsp
description: Conocimiento funcional, de arquitectura y reglas del Proyecto Transpais (TSP) e integración con UNIGIS TMS.
---

# Proyecto Transpais (TSP) - Base de Conocimiento

Transpais es un operador logístico de referencia en España con presencia en Francia, Polonia y Bulgaria.
El proyecto en UNIGIS TMS engloba la creación de **3 operaciones independientes**:
1. **Internacional** (punto de partida inicial)
2. **Distribución**
3. **Intermodal**

## Estructura Organizativa

En UNIGIS TMS se usa la jerarquía de cuatro niveles:
- **Empresa:** Transpais
- **Sucursales (Países):** España, Polonia, Bulgaria, Francia
- **Operaciones:** Internacional La Selva, Internacional Atlántico, Internacional Polonia, Internacional Bulgaria, Internacional Montouir.
- **Depósitos:** Almacén La Selva, Almacén Vigo, Almacén Francia, Almacén Polonia, Almacén Bulgaria, Almacén Bélgica, Cabanillas del Campo.

Cada depósito tiene asociada un área de influencia por país y código postal.

## Arquitectura de Integración
La solución integra cuatro sistemas:
1. **Transporeon (Interfaz 1):** Origen principal de los pedidos (Assigned Transport Interface). Los pedidos ingresan en estado `INGRESADO`.
2. **MS365 Business Central:** ERP de maestros y finanzas.
   - Sincroniza maestros hacia UNIGIS (Clientes, Vehículos, Transportes).
   - Recibe preliquidaciones de Venta y Costo (JsonSyncout).
3. **Webfleet:** Proveedor único de telemetría para flota propia (160 vehículos). Recibe información en tiempo real de vehículos, conductores, eventos y tiempos de conducción.
4. **UNIGIS TMS:** Gestión operativa central (OM, Fleet, Tracking, Dashboard, App X Deliveries, Portales).

## Operativa 4PL - Modelo Ball
Transpais opera como 4PL para su cliente **BALL**.
- **Regla de identificación (Catálogo Dinámico):** Si el Cliente Dador es "BALL" y el Almacén de Carga es "Novelis", "Constellium", o "Speira", el pedido se clasifica como 4PL.
- **Facturación / Tarificación:** Varía según quién ejecute (Tercero de Ball, Transpais, Transpais + agencia, Transpais + intercompany). Puede ser facturación a Ball (4PL + Transporte + Indexación gasoil) o solo 4PL si lo ejecuta un tercero de Ball.

## Modelo Intercompany
Cuando una empresa del grupo capta un viaje y lo ejecuta otra (ej. España lo capta y Polonia lo ejecuta):
- **Regla general:** 8% a la empresa captadora, 92% a la ejecutora.
- **Precios especiales:** Tarifas fijas acordadas cargadas en plantilla TMS.

## Flujo Operativo y Matriz de Estados

### Pedidos (`dbo.EstadoPedido`)
**Estados Ciertos:** 1 INGRESADO -> 2 ERROR -> 3 GRABADO -> 100 CONFIRMADO -> 101 EN PLANIFICACION / PLANIFICAR -> 102 PLANIFICADO EN PREPARACIÓN -> [303 ENTREGADO / 304 ENTREGA PARCIAL / 305 NO ENTREGADO] (Espejos) -> [400 RECOLECTADO / 404 NO RECOLECTADO / 405 RECOLECTADO PARCIAL] (Espejos) -> 502 LIQUIDADO
- `INGRESADO` (1): Entra de Transporeon, Portic, SIC, Generix WMS o carga manual Excel.
- `ERROR-REQUIERE AJUSTE` (2): Faltan datos críticos o dirección no geocodificada en maestros.
- `GRABADO` (3): Procesos `CompletarPedido` y `ValidarPedido` automáticos de UNIGIS.
- `CONFIRMADO` (100): Customer Service revisa, preasigna y confirma.
- `EN PLANIFICACION` / `PLANIFICAR` (101): Planificador inicia creación de viajes (directos, arrastres, repartos, etc).
- `PLANIFICADO EN PREPARACIÓN` (102): Ruta confirmada y enviada a WMS Generix para picking y etiquetado (Distribución).
- `ENTREGADO` (303) / `ENTREGA PARCIAL` (304) / `NO ENTREGADO` (305): Estados espejo disparados por la Parada de entrega.
- `RECOLECTADO` (400) / `NO RECOLECTADO` (404) / `RECOLECTADO PARCIAL` (405): Estados espejo disparados por la Parada de devolución del contenedor o recogida.
- `LIQUIDADO` (502): Viajes rendidos y liquidados (cantidades reales).

### Viajes (`dbo.EstadoViaje`)
**Estados Ciertos:** 105 INACTIVO -> 106 ASIGNADO / PENDIENTE -> 107 RECHAZADO o 108 CONFIRMADO -> 206 PREPARADO -> 300 CARGADO / 301 CARGADO PARCIAL -> 200 ACTIVO / EN EJECUCIÓN -> 403 FINALIZADO -> 402 RENDIDO -> 500 LIQUIDABLE -> 501 LIQUIDADO
- `INACTIVO` (105): Viaje recién creado tras planificar un pedido.
- `ASIGNADO / PENDIENTE` (106): Vehículo y conductor asignados. Se valida recurso.
- `RECHAZADO` (107): El transportista tercero rechaza la asignación en el Portal.
- `CONFIRMADO` (108): Transportista acepta asignación; se valida documentación (ADR, ITV, licencias) y se solicita PIN Code.
- `PREPARADO` (206): WMS notifica picking y etiquetado completado en almacén (Interfaz 5 y 6).
- `CARGADO` (300) / `CARGADO PARCIAL` (301): Carga física completada en muelle por el conductor (o supervisor si hay incidencia).
- `ACTIVO / EN EJECUCIÓN` (200): Conductor inicia viaje en la App Mobile (PIN visible / salida a reparto). Activa Ruta = 201.
- `FINALIZADO` (403): Conductor completa todas las paradas en UNIGIS X Deliveries (Ruta = 401).
- `RENDIDO` (402): Chofer entrega Carta de porte sellada, eCMR y rinde items no entregados al almacén (dispara Interfaz 9 reingreso WMS).
- `LIQUIDABLE` (500): Incidencias revisadas y aprobadas administrativamente, listo para calcular tarificación.
- `LIQUIDADO` (501): Preliquidaciones enviadas a MS365 BC (Interfaz 10) y confirmadas. Dispara Pedido = 502.

### Paradas (`dbo.EstadoParada`)
**Estados Ciertos:** 203 PENDIENTE -> 206 PREPARADO -> 204 EN VIAJE -> 205 VISITADO / EN GEOCERCA -> [300 CARGADO / 301 CARGADO PARCIAL / 302 NO CARGADO] (Origen) -> [303 ENTREGADO / 304 ENTREGA PARCIAL / 305 NO ENTREGADO] (Destino) -> [400 RECOLECTADO EN DEVOLUCIÓN / 404 NO RECOLECTADO / 405 RECOLECTADO PARCIAL] (Devolución/Recogida) -> 406 RENDIDO (Rendición Almacén)
Las paradas se registran desde *UNIGIS X Deliveries* (App Mobile) o geocercas automáticas (Webfleet).

#### EstadoParadaVisita (Tabla de control de visitas de Parada)
- `0`: PENDIENTE (Color: 13421772) - Parada activa en ruta sin detectar arribo.
- `1`: VISITANDO (Color: 13421772) - Vehículo dentro de la geocerca.
- `2`: VISITADO (Color: 16239131) - Arribo y salida a tiempo y en orden planificado.
- `3`: VISITADO FUERA DE HORARIO (Color: 4635634) - Llegada detectada fuera de ventana.
- `4`: VISITADO FUERA DE ORDEN (Color: 12876773) - Llegada fuera de la secuencia planificada.

### Órdenes (`dbo.EstadoOrden`)
**Estados Ciertos:** 102 PENDIENTE -> 104 PLANIFICADA -> 202 EN TRÁNSITO -> 306 FINALIZADA -> 400 RECOLECTADO
Se asocian directamente al pedido en la planificación y a la parada en la ejecución.

---

## Operativa de Distribución (TO BE)

### Flujo Operativo en 15 Pasos:
1. **Creación de Pedidos en WMS:** Generix (Interfaz 1: `CrearOrdenesPedido`) o importación Excel en TMS. Pedido entra en estado `INGRESADO` (1).
2. **Completar y Validar Pedido:** Procesos `CompletarPedido` y `ValidarPedido`. Si faltan datos -> `ERROR-REQUIERE AJUSTE` (2). Al corregir -> `GRABADO` (3).
3. **Confirmación de Pedidos:** Customer Service valida pedidos `GRABADO` -> `CONFIRMADO` (100). Se notifica al WMS via Interfaz 2/3.
4. **Planificación de Viajes:** Pedido pasa a `EN PLANIFICACION` (101). Se aplican reglas de zonificación por Código Postal asignando a flota propia o a colaboradores externos (**CBL**, **Pall-Ex**, **Palet System**).
5. **Creación de Viaje y Comunicación al WMS:** Viaje en estado `INACTIVO` (105) y paradas en `PENDIENTE` (203). Interfaz 4 notifica al WMS. Pedido pasa a `PLANIFICADO EN PREPARACIÓN` (102).
6. **Preparación en Almacén (Picking y Etiquetado):** WMS ejecuta olas de picking y notifica al TMS (Interfaz 5 y 6). Viaje y paradas cambian a `PREPARADO` (206). Se imprimen Hojas de Viaje y etiquetas.
7. **Actualización de Tracking:** WMS envía n.º de tracking y etiquetas al TMS.
8. **Seguimiento por Colaboradores:** Trazabilidad en tiempo real para colaboradores de distribución.
9. **Carga del Camión:** Conductor valida bultos en UNIGIS X Deliveries. Cambia paradas de carga a `CARGADO` (300) [o `CARGADO PARCIAL` (301) / `NO CARGADO` (302) con motivo de incidencia]. WMS confirma salida del camión.
10. **Adición de Paradas Urgentes:** Gestión de ajustes de última hora y paradas adicionales desde UNIGIS Dispatch/OM.
11. **Activación del Viaje:** Conductor o Tráfico cambia el viaje a `ACTIVO` (200). Pedidos pasan a `EN RUTA` (entregas) o `POR RECOGER` (recogidas).
12. **Ejecución de Entregas (App Mobile):** Geocerca activa `VISITADO` (205). Conductor registra `ENTREGADO` (303), `ENTREGA PARCIAL` (304), o `NO ENTREGADO` (305) con firma y fotos. Para clientes como **CM LOGISTICS**, Interfaz 8 notifica entregas en tiempo real. Al completar todas las paradas -> Viaje `FINALIZADO` (403).
13. **Rendición en Almacén:** Para paradas no entregadas o parciales, TMS crea automáticamente parada de `Rendición en Almacén`. Al retornar, usuario de Tráfico valida y cambia a `RENDIDO` (406), activando Interfaz 9 (reingreso de stock en WMS). Viaje pasa a `RENDIDO` (402).
14. **Validación de Incidencias:** Administración revisa viaje `RENDIDO`, aprueba incidencias y cambia viaje a `LIQUIDABLE` (500).
15. **Liquidación y ERP:** Se generan liquidaciones (`INICIAL` -> `CONFIRMADA`). Interfaz 10 envía preliquidaciones a MS365 Business Central. Viaje pasa a `LIQUIDADO` (501) y Pedido a `LIQUIDADO` (502).

---

## Reglas de Desarrollo y Transiciones TSP

### 1. Regla de Confirmación Previa mediante SELECTs en BD
Antes de asumir IDs o generar scripts SQL definitivos:
- **NUNCA ASUMIR IDs:** Jamás asumir valores para `IdOperacion` ni códigos/IDs de estados.
- **SOLICITAR CONSULTAS SELECT:** Pedir siempre al usuario la ejecución de consultas `SELECT` en la BD real de UNIGIS para obtener los datos de maestros, operaciones y estados antes de proceder.

### 2. Operación de Distribución
- **IdOperacion:** Confirmado explícitamente `IdOperacion = 3` para la operación de Distribución.

## Perfiles de Usuario
- **Key User / Administrador:** Acceso total.
- **Customer Service:** Confirma pedidos, atiende excepciones.
- **Planificador:** Planifica y asigna recursos a viajes.
- **Tráfico:** Seguimiento, alarmas e incidencias GPS en tiempo real.
- **Conductor:** Uso de App UNIGIS X Deliveries offline/online.
- **Terceros (Transportistas / Colaboradores):** Portal B2B / Interfaces CBL, Pall-Ex, Palet System, CM Logistics.
