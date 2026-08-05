# Tarifación y Compras (Costos) - Proyecto LS (Luis Simões)

Este documento recopila la estructura de tarifas de compras (costos de transportistas y subcontratistas), plataformas, delegaciones ajenas, modelos de facturación y reglas operativas detalladas para España (LOAL) y Portugal (DLS) en el sistema UNIGIS TMS, según el análisis del archivo de compras `Master Custos_Modelos.xlsx` (1.6 MB).

---

## 🏗️ 1. Lógica Operativa de Compras (Información sobre Faturação)

La facturación de compras (costos de transportistas) en Luis Simões está estructurada según la delegación física y el tipo de servicio/vehículo (Trailer, Carrozados, Traslados).

### 1.1 Rutas Largas (Larga Distancia)
Aplica para tramos que cruzan zonas tarifarias principales.
- **Bases de cobro**:
  - Flete principal (completo o grupaje) en euros.
  - Entregas adicionales por kilómetro (€/km).
  - Puntos de carga (Nº / €).
  - Rechazos de mercancía cobrados como €/km de retorno al punto de descarga.
  - Paralizaciones (esperas) cobradas por hora (€/hora).
  - Manipulaciones de carga incluidas (Sí para Madrid, Barcelona, Valencia y Sevilla).
- **Frecuencia de Facturación**:
  - Madrid / Valencia: Por viaje, semanal, quincenal o mensual.
  - Barcelona / Sevilla: Facturación mensual con un 99% de contratación fija.
- **Comunicación al Proveedor**:
  - Madrid / Barcelona / Valencia: Envío de Orden de Carga.
  - Sevilla: Notificación vía TMS Viaje Chofer o mensaje directo de WhatsApp a la empresa transportista.
- **Retén (Guardia/Disponibilidad)**:
  - Madrid: Cobro de €/km ida y vuelta.
  - Barcelona / Valencia / Sevilla: No aplica.

### 1.2 Capilar (Distribución Local) - Tráileres
Aplica para entregas locales de última milla realizadas con vehículos pesados.
- **Flete**:
  - Madrid: Tarifa por vehículo, zona y proveedor.
  - Barcelona / Sevilla: Tarifa en función del tipo de vehículo (T1/T2/T3/T4/T5).
  - Valencia: Tarifa directa por flete.
- **Cobro de entregas**:
  - Madrid: Precio fijo definido o por kilómetros si está fuera del rango establecido.
  - Barcelona / Sevilla / Valencia: No se cobra entrega adicional.
- **Rechazos y Paralizaciones**:
  - Madrid / Valencia: Sí se facturan los rechazos y paralizaciones.
  - Barcelona / Sevilla: No se facturan.

### 1.3 Capilar (Distribución Local) - Carrozados
Aplica para vehículos rígidos de reparto capilar.
- **Flete**:
  - Madrid: Precio base de posicionamiento del vehículo + cobro adicional por kg y pallets entregados.
  - Barcelona: Flete diario fijo con suplementos por entregas nocturnas o destinos lejanos.
  - Valencia: Tarifa base por tipo de vehículo y número de entregas.
  - Sevilla: Tarifa en función del tipo de vehículo (T1/T2/T3/T4/T5).
- **Comunicación**:
  - Madrid / Barcelona / Valencia: Envío de Orden de Carga.
  - Sevilla: Notificación vía TMS Viaje Chofer o WhatsApp a la empresa.

### 1.4 Traslados entre Naves (Lanzaderas)
- Madrid / Barcelona: Valor diario fijo pactado.
- Valencia: Contratación a petición, con precio cerrado por viaje.
- Sevilla: Precio cerrado por viaje diario con margen de reserva (buffer).

---

## 🚚 2. Subcontrataciones de Distribución (Plataformas PT)

El transporte secundario en Portugal opera a través de subcontratos específicos por plataforma con reglas y filtros muy rigurosos.

### 2.1 MARS - Transmarsil (Subcontrato 4769 - Faro)
- **Matriz de Tarifas por Peso (Faro)**:
  - `< 100 kg`: **5.46 €** (Tarifa Plana/Mínimo).
  - `101 kg - 250 kg`: **0.055 €/kg**.
  - `251 kg - 500 kg`: **0.049 €/kg**.
  - `501 kg - 1000 kg`: **0.038 €/kg**.
  - `1001 kg - 3000 kg`: **0.031 €/kg**.
  - `3001 kg - 5000 kg`: **0.029 €/kg**.
  - `5001 kg - 7500 kg`: **0.027 €/kg**.
  - `FTL` (Camión Completo): **182.364 €** flat.
- **Filtros y Criterios de Facturación**:
  - Uniformizar destinatarios en base de datos.
  - **Exclusión**: Eliminar devoluciones y rechazos según el origen de la responsabilidad.
  - **Exclusión**: Eliminar códigos de tránsito `TRET` / `RECU`.
  - **Exclusión**: Eliminar facturas del cliente interno `1000`.
  - **Reentregas (RG)**: Pasar las reentregas no pagas y no facturadas (`NP`/`NF`), con la excepción estricta de los clientes **604 Unilever** y **724 Arcas** (para los cuales nunca se paga).
  - Analizar restantes `RG` / `RL` de acuerdo a la responsabilidad de la propia plataforma.
  - Eliminar guías duplicadas.
  - Separar facturaciones de clientes `HOR` (cobro al kg) de clientes de `Distribución` (por escalado de peso).

### 2.2 Estamos Atentos (Subcontrato 2502 - Lisboa)
- **Criterio base**: Tarifa general de **55.00 €/tonelada** (o **0.055 €/kg**) facturado al peso.
- **Filtros y Restricciones**:
  - Mismos filtros que MARS (eliminar cliente 1000, tramos `TRET`/`RECU`, duplicados, devoluciones/rechazos según responsabilidad, y reentregas excepto excepciones).
  - **REGLA DE ORO**: **No se pagan recogidas o re-recogidas (L/RL) que tengan entrega asociada al mismo destinatario** (se considera un único servicio).

### 2.3 Tomadica Alcacer - Colina Gigante (Subcontrato 2692 Ambiente / 2691 Arcas)
- **Matriz de Tarifas por Zonas y Escalones**:
  - **Escalón 1** (`0.1 a 50 kg`): Zona 1: **6.25955 €** (Flat) | Zona 2: **7.00697 €** (Flat).
  - **Escalón 2** (`50.1 a 100 kg`): Zona 1: **9.32140 €** (Flat) | Zona 2: **10.43441 €** (Flat).
  - **Escalón 3** (`100.1 a 200 kg`): Zona 1: **0.08778 €/kg** | Zona 2: **0.09826 €/kg**.
  - **Escalón 4** (`200.1 a 500 kg`): Zona 1: **0.07837 €/kg** | Zona 2: **0.08773 €/kg**.
  - **Escalón 5** (`500.1 a 1000 kg`): Zona 1: **0.06165 €/kg** | Zona 2: **0.06902 €/kg**.
  - **Escalón 6** (`1000.1 a 2000 kg`): Zona 1: **0.04807 €/kg** | Zona 2: **0.05381 €/kg**.
- **Filtros y Criterios**:
  - Separar Arcas de Distribución normal: Clientes `724, 778, 775, 644I y 644H` pasan para Distribución arcas; los restantes son dist_normal.
  - Eliminar devoluciones, rechazos, `TRET`/`RECU`, cliente 1000, duplicados y reentregas no pagas.
  - Pagar un extra siempre que hay entrega en ese destinatario.
  - Retirar del valor de facturación final el coste del arrastre.

---

## 📍 3. Tarifas por Delegaciones de LOAL (España)

LOAL opera en España subcontratando a delegaciones locales que cobran por escalas específicas.

### 3.1 Mérida (Delegación ER) - *El Escalado Kilo a Kilo*
Esta delegación tiene un comportamiento de base de datos sumamente particular. Aunque en Excel se definen 10,000 filas (una para cada kilo), en realidad se rige bajo **37 tramos de tarifas** principales:

*   **Tramos de Tarifa Plana (Flat Rate)**:
    1.  `1 a 10 kg`: **3.86242 €**
    2.  `11 a 20 kg`: **4.85179 €**
    3.  `21 a 30 kg`: **5.81748 €**
    4.  `31 a 40 kg`: **6.21080 €**
    5.  `41 a 50 kg`: **6.54464 €**
    6.  `51 a 60 kg`: **6.67574 €**
    7.  `61 a 70 kg`: **7.06918 €**
    8.  `71 a 80 kg`: **7.72483 €**
    9.  `81 a 90 kg`: **7.84404 €**
    10. `91 a 100 kg`: **11.13421 €**
    11. `101 a 120 kg`: **13.74492 €**
    12. `121 a 140 kg`: **14.91311 €**
    13. `141 a 160 kg`: **15.58067 €**
    14. `161 a 180 kg`: **16.48675 €**
    15. `181 a 200 kg`: **17.67884 €**
    16. `201 a 230 kg`: **19.95573 €**
    17. `231 a 260 kg`: **21.73197 €**
    18. `261 a 290 kg`: **24.59301 €**
    19. `291 a 320 kg`: **26.96519 €**
    20. `321 a 350 kg`: **28.65804 €**
    21. `351 a 380 kg`: **30.76801 €**
    22. `381 a 410 kg`: **33.50983 €**
    23. `411 a 440 kg`: **35.46489 €**
    24. `441 a 470 kg`: **37.69407 €**
    25. `471 a 500 kg`: **39.93525 €**
    26. `501 a 550 kg`: **43.32083 €**
    27. `551 a 600 kg`: **45.75273 €**
    28. `601 a 650 kg`: **48.04151 €**
    29. `651 a 700 kg`: **49.86547 €**
    30. `701 a 750 kg`: **53.01252 €**
    31. `751 a 800 kg`: **55.76635 €**
    32. `801 a 850 kg`: **56.94644 €**
    33. `851 a 900 kg`: **60.08170 €**
    34. `901 a 950 kg`: **62.75201 €**
    35. `951 a 1000 kg`: **64.79048 €**
*   **Tramos de Cobro por Kilo (Per Kg)**:
    36. `1001 a 2000 kg`: **0.06321 €/kg**
    37. `2001 a 10000 kg`: **0.05950 €/kg** (con un tope máximo absoluto de **283.84 €**).
- **Cubicaje**: Ratio de cubicación de **250 kg/m³** para Mérida.

### 3.2 Bilbao (Delegación IL)
- **Topes máximos**: Máximo de **245.01 €** para códigos postales de Vizcaya (C.P.-48) y **405.08 €** para C.P.-20.
- **Escalas**:
  - `Hasta 50 kg`: Flat **6.33 €** (C.P.-48) | **7.07 €** (C.P.-20).
  - `51 a 100 kg`: **0.12177 €/kg** (C.P.-48) | **0.09729 €/kg** (C.P.-20).
  - `101 a 250 kg`: **0.10483 €/kg** (C.P.-48) | **0.08446 €/kg** (C.P.-20).
  - `251 a 500 kg`: **0.09847 €/kg** (C.P.-48) | **0.07484 €/kg** (C.P.-20).
  - `501 a 1000 kg`: **0.09106 €/kg** (C.P.-48) | **0.07163 €/kg** (C.P.-20).
- **Servicios logísticos adicionales**:
  - Almacenaje: **4.56 €**
  - Manipulación: **0.63 €**
  - Operativa Affinity: **50.03 €/día**
  - Retornos/Devoluciones: **1.25 €/palet cargado**
  - Rechazos no entregados: **2.51 €/descarga o carga**
- **Cubicaje**: **250 kg/m³**.

### 3.3 Valladolid (Delegación DD)
- **Topes máximos**: Máximo de **148.00 €** para C.P.-47 y **184.50 €** para C.P.-34, 37, 49.
- **Escalas**:
  - `Hasta 50 kg`: Flat **5.33 €** (C.P.-47) | **7.11 €** (Otras zonas).
  - `51 a 100 kg`: Flat **8.03 €** (C.P.-47) | **10.50 €** (Otras zonas).
  - `101 a 150 kg`: Flat **10.97 €** (C.P.-47) | **13.04 €** (Otras zonas).
  - `151 a 215 kg`: Flat **10.97 €** (C.P.-47) | **0.08298 €/kg** (Otras zonas).
  - `216 a 500 kg`: **0.04856 €/kg** (C.P.-47) | **0.07559 €/kg** (Otras zonas).
- **Servicios adicionales**:
  - Recargo de **0.0060 €/kg** por mercancía movida en Salamanca, Palencia y Zamora.
  - Cargo fijo de **4.90 €** por almacenaje, descargas fuera de hora, descargas de rechazos y devoluciones.
- **Cubicaje**: **300 kg/m³**.

---

## 🚢 4. Servicios Insulares, Paquetería y Navieras

### 4.1 Logislink (FCL / LCL Azores y Madeira)
- **Contenedores FCL (20' y 40') con entrega final**:
  - Leixões a Funchal: **1571.89 €** (20') / **2462.43 €** (40').
  - Leixões a Ponta Delgada: **1642.02 €** (20') / **2800.40 €** (40').
  - Carga a São Jorge: **1832.49 €** (20') / **2967.02 €** (40').
  - Carga a Pico: **1823.38 €** (20') / **2949.89 €** (40').
  - Carga a Angra do Heroísmo: **1778.66 €** (20') / **2859.45 €** (40').
- **Grupaje LCL (m³)**:
  - Funchal: **42.95 €/m³**.
  - Faial: **46.09 €/m³**.

### 4.2 Trasmediterránea (TF Trasme & IS Trasme)
- **Cubicaje forzado**: **333 kg/m³**.
- **Canarias (TF Trasme)**:
  - Mínimos: **25.75 €** (Tenerife / Las Palmas) | **41.20 €** (Islas menores).
  - Kilos: **0.206 €/kg** (Tenerife / LP) | **0.288 €/kg** (Menores).
  - Despachos (Exportación / Importación): **25.00 €** por trámite.
- **Baleares (IS Trasme)**:
  - Mínimos: **23.90 €** para Mallorca, Ibiza y Menorca.
  - Kilos: **0.097 €/kg** (Mallorca / Ibiza) | **0.119 €/kg** (Menorca).
  - Surcharges (Portes): Recargo del **12.3%** sobre portes para Mallorca y **5%** para Ibiza.

### 4.3 Grupamar (Baleares y Canarias)
- **Contenedores desde AX Cabanillas**:
  - Contenedor 20': **1750.00 €** (Las Palmas / Tenerife) | **1950.00 €** (Menores).
  - Contenedor 40': **2271.00 €** (Las Palmas / Tenerife) | **2471.00 €** (Menores).
  - Contenedor 45': **2346.00 €** (Las Palmas / Tenerife) | **2546.00 €** (Menores).
- **Camión Completo (FCL) desde AX Cabanillas**:
  - Mallorca: **1450.00 €**.
  - Ibiza: **1650.00 €**.
  - Menorca / Formentera: **1900.00 €**.

### 4.4 Carmar - Schweppes Baleares (Burgos)
- **Cubicaje**: **333 kg/m³**.
- **Tarifas**:
  - Mínimo: **25.00 €** (Mallorca, Ibiza, Menorca).
  - `Hasta 2500 kg`: **0.102 €/kg** (Mallorca) | **0.110 €/kg** (Ibiza) | **0.120 €/kg** (Menorca).
  - `Más de 2500 kg`: **0.090 €/kg** (Mallorca) | **0.099 €/kg** (Ibiza) | **0.104 €/kg** (Menorca).
  - Límite máximo: **1300.00 €**.
