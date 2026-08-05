---
name: proyecto_ls
description: Conocimiento funcional, de arquitectura y reglas del Proyecto GOLD de LUIS SIMÕES e integración con UNIGIS TMS.
---

# Proyecto GOLD — LUIS SIMÕES (LS)

Este skill proporciona el contexto de negocio, arquitectura y reglas operativas del **Proyecto GOLD (Fase 2)** de LUIS SIMÕES, enfocado en la implantación y personalización de **UNIGIS TMS** en España y Portugal.

---

## 🏗️ Resumen de Sistemas e Integraciones
- **SID (Luis Simões)**: Sistema de gestión interna de operaciones que envía y recibe datos a través de interfaces automatizadas.
- **UNIGIS TMS**: Soporta la ejecución, planificación (ruteo) y control de operaciones de transporte.
- **EAL / MW (Middleware)**: Capa de integración principal entre el ERP de LS y UNIGIS.
- **WMS (Reflex / SGAs)**: Gestiona la preparación física de cargas en los depósitos y envía flags de "Preparado".
- **SoftExpert**: Sistema externo para la gestión de reclamaciones y siniestros/daños en paradas.

---

## 📌 Conceptos y Reglas Clave

### 1. Domicilios Fijos vs. Variables (DomicilioOrden)
- **Domicilio Fijo (Código LS)**: Tiene geocodificación, restricciones y ventanas horarias configuradas estáticamente.
- **Domicilio Variable (Código Cliente)**: Proviene de la orden específica del cliente y puede requerir geocodificación al vuelo.
- **Regla de Prioridad Horaria**:
  1. Se aplica la ventana horaria del domicilio **variable** si la tiene.
  2. Si no la tiene, se aplica la del domicilio **fijo** asociado.
  3. *Excepción*: Para clientes de tipo **Centralización (CZ)**, se aplica **siempre** la ventana horaria del domicilio fijo.


### 2. Determinación de Tramo (Local vs. Larga Distancia)
- **Local**: Si la Zona del Depósito de Carga (o Salida) es igual a la Zona del Depósito de Descarga (o Llegada).
- **Larga Distancia (LD)**: Si las zonas difieren.
- La zona se determina por el código postal del domicilio usando la tabla de influencia `Z_Area_Influencia_Deposito`.

### 3. Estados Operativos Principales
- **Viajes**: `Pendiente` ➔ `Pendiente Agencia` ➔ `Aceptado/Rechazado Agencia` ➔ `Programado` ➔ `Pendiente Conductor` ➔ `Aceptado Conductor` ➔ `Activo` ➔ `Finalizado` ➔ `Rendido` ➔ `Digitalizado` ➔ `Liquidable`.
- **Paradas**: `Inicial` ➔ `Pendiente (Recolección/Entrega)` ➔ `Visitado` ➔ `Arribo a Portería` ➔ `Acceso Validado` ➔ `Presentación Validada` ➔ `Inicio Carga/Descarga` ➔ `Fin Carga/Descarga` ➔ `Final (Recolectado/Entregado/Parcial/No Recolectado)`.

### 4. Actualizaciones en Cascada
- Cualquier cambio de peso, volumen, bultos o pallets en un pedido debe propagarse automáticamente hacia las órdenes y paradas asociadas (`PedidoOrdenParada`).

---

## 📂 Documentos de Referencia
Para consultas detalladas sobre configuraciones de base de datos, transiciones específicas de estados y flujos de pasos técnicos por estado de programación, consulta los siguientes archivos en la carpeta de referencias:
1. **[Flujo de Trabajo e Integraciones (Modelo To Be)](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/modelo_to_be.md)**: Detalle del workflow de 15 pasos y transiciones de estados.
2. **[Documento de Alcance Consolidado (Fase 2)](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/documento_alcance.md)**: Estructura organizativa, maestros, algoritmos de desprogramación y glosario.
3. **[Contratos LuisSimoes LS v1](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/Contratos_LuisSimoes_LS_v1.md)**: Modelos de facturación, contratos de venta y de transportistas.
4. **[DDS FlotaVehiculos ProyectoGOLD v01](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/DDS_FlotaVehiculos_ProyectoGOLD_v01.md)**: Maestro y taxonomía de vehículos de la flota.
5. **[Domicilios Fijos y Variables](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/Domicilios%20Fijos%20y%20Variables.md)**: Reglas detalladas y georreferenciación de direcciones de destinatarios.
6. **[Flujo de Creación de Domicilios](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/Flujo%20de%20creación%20de%20domicilios.md)**: Workflow técnico de integración de domicilios variables y fijos.
7. **[Flujo Operativo de Viajes con Delegación Ajena](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/Flujo%20Operativo%20de%20Viajes%20con%20Delegacion%20Ajena.md)**: Logística y PODs asociados a delegaciones externas.
8. **[Flujo Operativo de Viajes con Subcontratación TI v2](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/Flujo_Operativo_de_Viajes_con_Subcontratacion_TI_v2.md)**: Ruteo y licitación mediante transportistas subcontratados.
9. **[LS Guía de Tarificación](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/LS%20guía%20de%20Tarifiación.md)**: Lógica comercial, fórmulas y tarifas aplicadas a clientes y proveedores.
10. **[Narrativa Logística Inversa V4](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/Narrativa_Logistica_Inversa_V4.md)**: Tratamiento de no entregados, devoluciones y crossdock de retorno.
11. **[UNIGIS TMS](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/UNIGIS%20TMS.md)**: Mapeos maestros y de interfaces globales de UNIGIS.
12. **[Tarifación y Ventas Detallada](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/tarifacion_ventas_detallada.md)**: Estructura de clientes, códigos Baan, CIFs, contratos, tipos de servicio y mapeos a la tabla Tarifa de UNIGIS.
13. **[Tarifación y Compras Detallada](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/.agents/skills/proyecto_ls/references/tarifacion_compras_detallada.md)**: Estructura de costes capilares, delegaciones locales (ER, IL, DD), subcontrataciones portuguesas (MARS, LISB, ALC) y servicios navieros (Logislink, Trasmediterránea, Grupamar).
