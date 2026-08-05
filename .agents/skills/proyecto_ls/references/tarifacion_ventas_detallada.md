# Tarifación y Ventas - Proyecto LS (Luis Simões)

Este documento recopila de manera exhaustiva la estructura de tarifas, contratos, tipos de servicio, esquemas de bases de datos y reglas de negocio para los clientes de España (LOAL) y Portugal (DLS) en el sistema UNIGIS TMS, según el análisis de los archivos de especificación de Ventas (`Master Ventas_Modelos v.0.xlsx`, `Ejemplos de tabla de tarifas.xlsx`, `Faturaçao.xlsx` y `Ejemplo TMS.xlsx`).

---

## 📊 1. Maestro de Clientes y Contratos (Ventas)

A continuación se detalla para cada cliente su código, CIF, código de sistema (Baan), contratos activos y tipos de servicio parametrizados.

### 1.1 Unilever PT (Cliente 604)
- **Compañía**: DLS (Portugal)
- **Código Baan**: 1690
- **CIF**: PT-503933139
- **Contratos**:
  - `604A`: UNILEVER - FIMA AMBIENTE
  - `604B`: UNILEVER - FRIO
  - `604C`: UNILEVER - TI - FOODS AMBIENTE
  - `604E`: UNILEVER - LEVER HOME CARE
  - `604F`: UNILEVER - LEVER PERSONAL CARE
  - `604G`: UNILEVER - KNORR
  - `604H`: UNILEVER - MATERIAIS COPACKING
  - `604I`: UNILEVER - LIPTON
  - `604J`: UNILEVER - ICE TEA
  - `604L`: UNILEVER - TI - HPC
- **Tipos de Servicio (Serviço)**:
  - `E`: Entrega
  - `RECU`: Recusar (Rechazos)
  - `L`: Levantamento (Recogidas)
  - `RG`: Reentrega
  - `RL`: Re-levantamento
  - `U100`: Urgência 100%
  - `ENOT`: Entregas Noturnas
  - `EIP`: Entregas Pico
  - `EIM`: Entregas Madeira
  - `EISM`: Entregas São Miguel
  - `EIT`: Entregas Terceira
  - `EISJ`: Entregas Sao Jorge
  - `EIHO`: Entregas Horta
  - `EIMA`: Entregas S. Maria
  - `EIG`: Entregas Graciosa
  - `EIFL`: Entregas Flores
  - `ECON`: Entregas Contentores
- **Reglas de Tarifación**:
  - Múltiples contratos, tarifas calculadas en base a KG y PAL (Pallets).
  - El FTL (Full Truck Load) se activa a partir de **17 PAL**.

### 1.2 LG Electronics PT (Cliente 295)
- **Compañía**: DLS (Portugal)
- **Código Baan**: 7650
- **CIF**: PT-506425010
- **Contratos**:
  - `295`: LG PORTUGAL - OPERAÇOES INTERNAS
  - `295A`: LG PORTUGAL (PRODUTO)
  - `295D`: LG PORTUGAL (PRODUTO) - DIRECTO
  - `295E`: LG PORTUGAL (PRODUTO) - ESPECIAIS
  - `295H`: LG PORTUGAL (PRODUTO) - ILHAS
  - `295Z`: LG PORTUGAL (REVERSOS)
  - `295L`: LG PORTUGAL (MARKETING - DE)
  - `295M`: LG PORTUGAL (MARKETING - BG)
  - `295N`: LG PORTUGAL (MARKETING - WG)
  - `295O`: LG PORTUGAL (MARKETING - ISP)
  - `295P`: LG PORTUGAL (MARKETING - ID)
  - `295Q`: LG PORTUGAL (MARKETING - AC)
- **Tipos de Servicio (Serviço)**:
  - `RL`: Re-levantamento
  - `RECU`: Recusar (Rechazos)
  - `RELT`: Recusas LTL
  - `RGLT`: Reentrega LTL
  - `E`: Entrega
  - `CD`: Carga Directa
  - `HTL`: HTL (Full Truck Load)
  - `LHTL`: Levantamento HTL
  - `LLTL`: Levantamento LTL
  - `RLLT`: Re-levantamento LTL
  - `U100`: Urgência 100%
  - `D1E` / `D....`: Entregas DPD
  - `T1E` / `T....`: Entregas TTM
  - `L1E` / `L...`: Entregas DPD Ilhas
  - `REHL`: Recusas HTL
  - `RGFT`: Reentrega FTL
  - `REFT`: Recusas FTL
  - `RLFT`: Re-levantamento FTL
  - `RLHT`: Re-levantamento HTL
  - `LFTL`: Levantamento FTL
  - `RGHT`: Reentrega HTL
- **Reglas de Tarifación**:
  - Tarifas basadas en M3 (Metros cúbicos).
  - Regla estricta: "No se puede cobrar más que el mínimo del escalado arriba" (tope superior de facturación).
  - Tabela Corrida por Código Postal.

### 1.3 Prime Drinks PT (Cliente 732)
- **Compañía**: DLS (Portugal)
- **Código Baan**: 19481
- **CIF**: PT-503543179
- **Contratos**:
  - `732A`: PRIMEDRINKS POS
  - `732B`: PRIMEDRINKS PRODUTO ACABADO
  - `732C`: PRIMEDRINKS PRODUTO ACABADO EXCLUSIVOS
  - `732D`: PRIMEDRINKS COPACKING
  - `732E`: PRIMEDRINKS EVENTOS
- **Tipos de Servicio (Serviço)**:
  - `E`: Entrega
  - `RG`: Reentrega
  - `RECU`: Recusar (Rechazos)
  - `DEV`: Devoluções
  - `L`: Levantamento (Recogidas)
  - `U100`: Urgência 100%
- **Reglas de Tarifación**:
  - Varios contratos; Doble entrada de tarifas.
  - FTL se activa a partir de **22 PAL**.

### 1.4 Essity PT (Cliente 303)
- **Compañía**: DLS (Portugal)
- **Código Baan**: 6611
- **CIF**: PT-503237612
- **Contratos**:
  - `303A`: ESSITY PORTUGAL - ARMAZÉM - PT75
  - `303B`: ESSITY PORTUGAL - DIRETO - PT75
  - `303C`: ESSITY PORTUGAL - ILHAS - PT75
  - `303D`: ESSITY PORTUGAL - PAQUETERIA
  - `303X`: ESSITY PORTUGAL - DIRETO EXPORTAÇÃO
  - `303Z`: ESSITY PORTUGAL - RETORNOS
  - `303M`: ESSITY PORTUGAL - COPACKING
- **Tipos de Servicio**:
  - `DEV`: Devoluções
  - `L`: Levantamento
  - `RECU`: Recusar (Rechazos)
  - `RG`: Reentrega
  - `U100`: Urgência 100%
- **Reglas de Tarifación**:
  - Múltiples unidades (PAL, M3, KG, UN, CXA, etc.) dependiendo del contrato del cliente.
  - Parametrización especial para el contrato `303D` (Paquetería/PAQ).

### 1.5 Bacardi PT (Cliente 616)
- **Compañía**: DLS (Portugal)
- **Código Baan**: 15705
- **CIF**: PT-500186260
- **Contratos**:
  - `616A`: BACARDI - MATERIAL PROMOCIONAL
  - `616M`: BACARDI - COPACKING
  - `616P`: BACARDI - PRODUTO ACABADO
  - `616T`: BACARDI - TRANSTRANSPORTE (PRIMARIOS)
- **Tipos de Servicio**:
  - `L`: Levantamento
  - `RG`: Reentrega
  - `RECU`: Recusar (Rechazos)
  - `U100`: Urgência 100%
  - `RL`: Re-levantamento
  - `E`: Entrega
- **Reglas de Tarifación**:
  - Lógica basada en diferencial de primarios.
  - Ajuste de combustible (BAF) configurado en -2,09%.

### 1.6 Bacardi ES (Cliente 1141)
- **Compañía**: LOAL (España)
- **Código Baan**: 17477
- **CIF**: ES-A08005746
- **Contratos**:
  - `1141`: Bacardi España producto zona centro
  - `1141P`: Bacardi España Pos zona centro
- **Tipos de Servicio**:
  - `E`: Entrega normal
  - `EEXT`: Entrega exenta (FISCAL)
  - `EKG`: Entrega kilos
  - `EEXK`: Entrega exenta kilos (FISCAL)
  - `ECC`: Entrega cargas combinadas
  - `ECAN`: Entrega Canarias (Cubicación a 333)
  - `EFER`: Entrega Ferias
  - `EIBZ`: Entrega Ibiza
  - `PAQ`: Paquetería
  - `RCPQ`: Rechazo paquetería
  - `RGQ`: Reentrega paquetería
  - `R`: Recogida/Levantamiento
  - `RKG`: Recogida en kilos
  - `RNP`: Recogida no paga
  - `RSKG`: Rechazo stock kilos
  - `TRNP`: Transferencia no paga
  - `VT`: Pedido carro
- **Reglas de Tarifación**:
  - Distribución provincial (basada en Códigos Postales), nacional y Baleares.
  - **Islas Canarias**: Cubicaje forzado a **333 kg/m³** (requiere desarrollo especial).
  - **Bacardi Pos (1141P)**: Coste basado en número de pallets (1 a 33), aplicando tarifa FTL a partir de los **28 pallets**.
  - **Gestión Fiscal**: Las entregas exentas se dividen por peso (`EEXT` si peso > 500 kg, `EEXK` si peso < 500 kg).

### 1.7 Spectrum ES (Cliente 1004)
- **Compañía**: LOAL (España)
- **Código Baan**: 15580
- **CIF**: ES-B85461096
- **Contratos**:
  - `1004`: OI + Distribución
  - `1004R`: OI + Distribución
  - `1004X`: Distribución
  - `1004Z`: OI
- **Tipos de Servicio**:
  - `CPV`: Complemento viaje
  - `E`: Entrega
  - `EDIR`: Entrega directa
  - `ESP`: Especial
  - `ESPX`: Entrega PT express
  - `R`: Recogida
  - `RECU`: Rechazo
  - `RG`: Reentrega
  - `VT`: Pedido carro
- **Reglas de Tarifación**:
  - Tarifa calculada en base al peso volumétrico.
  - Zonas tarifarias del 1 al 7 cubriendo España, Portugal y Andorra.

### 1.8 Unilever ES (Cliente 1179)
- **Compañía**: LOAL (España)
- **Código Baan**: 15580
- **CIF**: ES-B85461096
- **Contratos**:
  - `1179C`: Unilever distribución tª controlada
  - `1179D`: Unilever distribución ambiente
  - `1179P`: Unilever cargas persan
- **Tipos de Servicio**:
  - `CDT`: Carga directa tte
  - `CPS`: Carga persan
  - `CPV`: Complemento precio viaje
  - `DA`: Despacho aduana
  - `E`: Entrega
  - `EAD`: Entregas adicional
  - `ECC`: Entrega carga combinada
  - `EKG`: Entrega kilos
  - `ESP`: Especial
  - `PRLZ`: Paralizaciones
  - `R`: Recogida
  - `RECU`: Rechazo
  - `REDI`: Rechazo directo
  - `REKG`: Rechazo kilos
  - `RESG`: Rechazo para stock kilos
  - `RESK`: Rechazo para stock
  - `RG`: Reentrega
  - `RGDI`: Reentrega directa
  - `RGKG`: Reentrega kilos
  - `RKG`: Recogida kilos
  - `VT`: Pedido carro
- **Reglas de Tarifación**:
  - Precios por carga basados en huecos de camión (PFS) y peso.
  - Entregas agrupadas por Tournée.

### 1.9 Ferroli ES (Cliente 1007)
- **Compañía**: LOAL (España)
- **Código Baan**: 16278
- **CIF**: ES-B09497264
- **Contratos**:
  - `1007F`: Ferroli 1
  - `1007L`: Cointra Leroy
  - `1007S`: Ferroli Sevilla
  - `1007V`: Ferroli Valencia
- **Tipos de Servicio**:
  - `CPV`: Complemento viaje
  - `E`: Entrega
  - `EAD`: Entrega adicional
  - `EDIR`: Entrega directa
  - `EDP`: Distribución
  - `EESP`: Entrega especial
  - `EEXM`: Entrega exenta (Leroy Merlin)
  - `EKG`: Entrega kilos
  - `ESP`: Especial
  - `PRLZ`: Paralizaciones
  - `R`: Recogida
  - `RECU`: Rechazo
  - `REKG`: Rechazo kilos
  - `RESG`: Rechazo para stock kilos
  - `RESK`: Rechazo para stock
  - `RG`: Reentrega
  - `RGKG`: Reentrega kilos
  - `RKG`: Recogida kilos
  - `RSKG`: Rechazo stock kilos
  - `TRNP`: Transferencia no paga
  - `VT`: Pedido carro
- **Reglas de Tarifación**:
  - Peso volumétrico.
  - Clasificación por Familias de Artículo/Almacén.
  - Recargos aplicados para entregas los sábados.

### 1.10 Diageo ES (Cliente 1011)
- **Compañía**: LOAL (España)
- **Código Baan**: 16069
- **CIF**: ES-A28826691
- **Contratos**:
  - `1011T`: Diageo
- **Tipos de Servicio**:
  - `DE`: Entrega Diageo
  - `DEEX`: Entregas diageo Fiscal
  - `DECC`: Entrega cargas combinadas
  - `DPAQ`: Entregas paquetería
  - `DESA`: Entregas sabados
  - `DR`: Recogidas
  - `DRCU`: Rechazos
  - `DREP`: Repaletizaciones
  - `DRG`: Reentrega
  - `DRGP`: Reentrega paquetería
  - `DVT`: Pedido carro
- **Reglas de Tarifación**:
  - Tarifa puramente por Kilos.
  - Matriz compleja de tarifas según rango de peso (0-50 kg, 50-100 kg, 100-200 kg, 200-350 kg, 350-500 kg, 500-750 kg, 750-1000 kg, 1000-2500 kg, 2500-5000 kg, 5000-7500 kg, 7500-10000 kg, 10000-15000 kg, 15000-20000 kg, 20000+ kg, FTL price) y provincia de destino (Álava, Albacete, Alicante, Almería, Andorra, etc.).
  - Variantes de tipo de servicio: normal, entrega web, entregas a empleados, entregas los sábados.

### 1.11 Procter PLV ES (Cliente 1087)
- **Compañía**: LOAL (España)
- **Código Baan**: 10223
- **Contratos**:
  - `1087P`: POS independientes
  - `1087D`: P&G Distribución
- **Tipos de Servicio**:
  - `E`: Entrega
  - `K25` / `K50` / `MP`: Servicios y promociones
  - `R`: Recogida
  - `RECU`: Rechazo
- **Reglas de Tarifación**:
  - Reparto de costes por familia de producto.
  - Gestión de semipallets.

---

## ⚙️ 2. Estructura de la Tabla `Tarifa` en UNIGIS

A partir del análisis de la hoja `Dudas LS` de `Ejemplos de tabla de tarifas.xlsx`, se documenta el comportamiento de las columnas en la base de datos de UNIGIS para la tarificación de LS:

| Campo | Tipo / Valores | Comportamiento y Regla de Negocio |
|---|---|---|
| `IdTarifa` | Primary Key | Identificador único de la tarifa en la tabla. |
| `IdCuadroTarifario` | Foreign Key | Asocia la tarifa a un cuadro tarifario de un cliente. |
| `VigenciaDesde` / `Hasta` | DateTime | Define el rango de fechas en el que la tarifa es aplicable. |
| `IdConcepto` | Foreign Key | Concepto al que imputa (ej. VENTA DESDE PEDIDO x PESO). |
| `Formula` / `BaseCalculo` | Fórmulas UNIGIS | Fórmulas como `VentaXPedidoPallets` o `Precio.unitario rango 1` que definen la base matemática del cobro. |
| `Entidad` | `Pedido`, `Viaje`, `Parada` | Determina a qué nivel del modelo de datos se evalúa la tarifa. |
| `IdSucursal` | Foreign Key | Filtro por sucursal física. |
| `IdCliente` | Foreign Key | Filtro del cliente (ID BAAN / Unicliente). |
| `IdTipoServicioAdicional` | Foreign Key | Mapea al tipo de servicio de LS (normal, urgencia, etc.). |
| `IdCategoriaPedido` | Foreign Key | Mapea al tipo de servicio de LS (normal, urgencia). |
| `EsRango` / `UnidadesDesde` / `Hasta` | Boolean / Decimal | Define si la tarifa se aplica en base a un escalado de unidades (bultos, pallets, kilos). |
| `PedidoOrigen` / `PedidoDestino` | String | Permite aplicar tarifas según el depósito de salida (stock) o el destino de la mercancía. |
| `FormulaRangoIN` | String | Expresión SQL/fórmula para evaluar si entra en el rango (ej. `[Pedidos_Total_Int1]`). |
| `ValorResultadoMinimo` | Decimal | Mínimo garantizado para la tarifa. |
| `PermiteAjusteMasivo` | Boolean (0/1) | Indica si se permiten correcciones manuales y ajustes masivos de tarifas cuando el cliente envía la facturación. |

---

## 🛠️ 3. Reglas Operativas Especiales de Tarificación en LS

Para el desarrollo de la tarificación y la resolución de dudas operativas, se deben tener presentes las siguientes consideraciones:

1. **Cubicación en Islas Canarias**: Para el cliente **Bacardi ES (1141)**, los envíos a las Islas Canarias requieren aplicar un ratio de cubicación estricto de **333 kg/m³** (en caso de que el sistema UNIGIS de forma nativa no soporte la cubicación directa, se debe realizar a nivel de middleware o reglas de cálculo).
2. **FTL por Huecos (PFS)**: En el caso de **Unilever PT** y **Prime Drinks**, el paso a tarifa FTL (camión completo) no depende solo del peso, sino de la cantidad de pallets cargados:
   - **Unilever PT**: FTL a partir de **17 pallets**.
   - **Prime Drinks**: FTL a partir de **22 pallets**.
   - **Bacardi ES (Pos)**: FTL a partir de **28 pallets**.
3. **Mínimos Garantizados**: Clientes como **LG Electronics PT** tienen configuradas tarifas por M3 con mínimos garantizados estrictos, impidiendo que el resultado de la tarifa baje de un importe base.
4. **Doble Ajuste**:
   - **IPC**: Ajuste anual de tarifas según IPC contractual (ej. Unilever PT 2,36%).
   - **BAF (Gasóleo)**: Ajuste periódico según variación del combustible. Bacardi PT tiene por defecto un ajuste del -2,09%.
5. **Tipos de Guías para Prefacturación**: La prefacturación de ventas se basa prioritariamente en los Tipos de Guía **2 (VENTA DESDE PEDIDO)** y **200 (VENTA DESDE PEDIDO AGRUPADOS)**, tomando siempre como referencia temporal la **Fecha de Tournée** (Fecha del Viaje).
