MANUAL DE TARIFACION
Luis Simoes Logistica
DLS Portugal  |  LOAL España  |  UNIGIS TMS

--- TABLE START ---
Version / 1.0 — julio 2026 | Ambito / Portugal (DLS) y España (LOAL)
--- TABLE END ---

1. Introducción — Luis Simoes en UNIGIS TMS
Luis Simoes Logistica (LS) opera como operador logístico integral en la Península Ibérica con dos entidades jurídicas diferenciadas dentro de UNIGIS TMS:

--- TABLE START ---
Empresa | Pais | Descripcion
DLS | Portugal | Luis Simoes entidad portuguesa. Opera los contratos de clientes PT: Unilever, LG, Essity, Prime Drinks y Bacardi.
LOAL | España | Luis Simoes entidad española. Opera los contratos de clientes ES: Unilever, Diageo, Bacardi, Ferroli, Procter PLV y Spectrum.
--- TABLE END ---

LS gestiona una cartera de clientes principales con contratos activos, cada uno con sus propias tablas de tarifas, tipos de servicio y reglas de facturación. Esta diversidad convierte al modelo de tarifación de LS en uno de los más complejos del ecosistema UNIGIS.
Los tres ejes que definen la complejidad del modelo LS son:
• Múltiples bases de cálculo por cliente: KG, PAL, M3, VEH (FTL/HTL) — a veces combinadas en el mismo contrato.
• Familias de almacén: cada cliente puede tener varios contratos activos, uno por familia de producto (e.g. Bacardí producto vs. material POS vs. CoPacking).
• Doble ajuste periódico: actualización de combustible independiente por cliente y revisión tarifaria anual (IPC + gasóleo).
1.1 Mapa de clientes

--- TABLE START ---
Cod | Cliente | Contratos principales | Base | Unidad base | Consideracion clave
604 | Unilever PT | 604A/E/F/G/J (12+ contratos) | PAL/KG | Pallets y kilos | FTL a partir de 17 PAL; ajuste IPC 2,36%
295 | LG Electronics PT | 295/295A/D/E/H/Z (10+ contratos) | M3 | Metros cubicos | Minimo garantizado; tarifa corrida por CP
732 | Prime Drinks PT | 732A/B/C/D/E (6+ contratos) | PAL/KG | Pallets y kilos | FTL a partir de 22 PAL; doble entrada
303 | Essity PT | 303A/B/C/X/Z/D (8+ contratos) | M3/PAL | M3 y pallets | Multiples unidades segun contrato
616 | Bacardi PT | 616/616A/TP/P (4 contratos) | KG/PAL | Kilos y pallets | Diferencial de primarios; ajuste -2,09%
1179 | Unilever ES | 1179C/D/P (3 contratos) | PAL/KG | Pallets y kilos | Huecos de camion; entregas agrupadas
1011 | Diageo ES | 1011T (1 contrato) | KG | Kilos | Varios tipos de servicio: normal/web/empleados/sabado
1141 | Bacardi ES | 1141/1141P (2 contratos) | KG/PAL | Kilos y pallets | Zonas provinciales; Canarias cubicaje 333
1007 | Ferroli ES | 1007F/G/V/W/S (5 contratos) | KG | Kilos | Peso volumetrico; familias de almacen; sabado
1087 | Procter PLV ES | 1087P/D (2 contratos) | PAL/KG | Pallets y kilos | Reparto costes por familia; semipallet
1004 | Spectrum ES | 1004R/X/Z (3 contratos) | KG | Kilos | Peso volumetrico; zonas 1-7; Portugal y Andorra
--- TABLE END ---

2. Claves en UNIGIS TMS
Para trabajar con tarifas en UNIGIS es necesario comprender los cuatro bloques de configuración que se apilan de menor a mayor nivel de agrupación:

--- TABLE START ---
Nivel | Elemento | Que define
Nivel 1 | Concepto | La línea de factura: que se cobra. Ej: VENTA DESDE PEDIDO x PESO, VENTA INCIDENCIA ESPERAS.
Nivel 2 | Tarifa | La regla de cálculo: formula, base, tramos, filtros (cliente, contrato, zona, peso...).
Nivel 3 | Cuadro Tarifario | El contenedor de tarifas para un cliente y un rango de vigencia. Agrupa todas las Tarifas aplicables.
Nivel 4 | Tipo de Guia | El tipo de documento económico (guía) que desencadena el cálculo: Venta desde Pedido, Costo Distribución, etc.
--- TABLE END ---


--- TABLE START ---
 | Analogía practica / Un pedido llega al TMS. El sistema busca el Tipo de Guia activo para ese cliente, identifica el Cuadro Tarifario vigente, recorre las Tarifas del cuadro aplicando los filtros (zona, peso, fecha...) y genera una línea de factura por cada Concepto encontrado.
--- TABLE END ---

2.1 Tipos de Guia activos en Luis Simoes
Luis Simoes tiene configurados 6 Tipos de Guia según la información aportada. Cada uno actúa sobre un modo diferente de agrupación de pedidos:

--- TABLE START ---
Id | Nombre | Modo | Tipo | Caracteristica principal
1 | COSTO DISTRIBUCION DIRECTA | Shipment | Costo | Un viaje = una guía de costo. Sin límite de vueltas.
2 | VENTA DESDE PEDIDO | OrderBase | Venta | Un pedido = una guía de venta. Máximo 1 pedido por guía.
7 | COSTO LOCAL | Shipment | Costo | Operaciones locales. Admite hasta 99.999 viajes por guía.
111 | COSTO ARRASTRES PORTUGAL | Shipment | Costo | Primarios de larga distancia. Modo Shipment (transporte principal).
200 | VENTA DESDE PEDIDO AGRUPADOS | OrderBase Group | Venta | Múltiples pedidos agrupados. Creación automática. Usado en LS para entregas agrupadas por Tournée.
210 | VENTA RECOLECCIONES DESDE VIAJE | Shipment | Venta | Recolecciones facturadas desde el viaje, no desde el pedido.
--- TABLE END ---


--- TABLE START ---
 | Clave de diseño en LS / Los Tipos de Guia 2 y 200 son los más usados en venta. El 200 (agrupado) es el modelo dominante: un conductor hace una tournée con N entregas y se genera una sola guía de venta que consolida todos los pedidos del viaje. La prefacturación usa siempre la Fecha de Tournée como referencia.
--- TABLE END ---

3. Conceptos tarifarios utilizados en LS
Los Conceptos son las líneas que aparecen en la guía de facturación. En LS están organizados en dos grandes grupos: Venta (ingresos del cliente) y Costo (costes del transportista).
3.1 Conceptos de Venta

--- TABLE START ---
Id | Descripción | Orden | Uso en LS
3 | VENTA DESDE PEDIDO | 20 | Base de todas las guías de venta. Precio por pedido simple.
100 | VENTA DESDE PEDIDO x PESO MINIMO | 20 | Mínimo garantizado por peso. Bloquea escalar mas abajo del mínimo.
101 | VENTA DESDE PEDIDO x PESO | 20 | Precio por kilo según escalado. Diageo, Bacardí ES, Ferroli, Spectrum.
102 | VENTA DESDE PEDIDO x PALLET | 20 | Precio por pallet. Unilever PT/ES, Prime Drinks, Essity.
103 | VENTA DESDE PEDIDO x PALLET FIJO | 20 | Pallet con precio fijo (sin escalar). Bacardí ES zonas fijas.
104 | VENTA ADICIONAL PALLET AMERICANO | 20 | Suplemento por pallet americano (1.00 x 1.20 m). Bacardí ES.
105 | VENTA INCIDENCIA ADICIONAL | 50 | Cargo adicional por incidencia tarifaria (esperas, extras).
106 | VENTA SOBRE PESO PEDIDO | 20 | Sobrecargo por exceso de peso sobre el máximo del escalado.
108 | VENTA INCIDENCIA AYUDANTES | 20 | Cargo por segundo conductor o ayudante de reparto.
109 | VENTA INCIDENCIA ESPERAS Y DEMORAS | 20 | Tiempo de espera en muelle superior al tiempo libre contratado.
110 | VENTA INCIDENCIA RE-EXPEDICION | 20 | Reexpedición o devolución de mercancía fallida.
136 | VENTA RECOLECCION DOMICILIO | 20 | Recolección en domicilio de destinatario (Tipo Guia 210).
4 | TOTAL VENTA | 55 | Línea agregadora. Suma todos los conceptos de venta. IdConceptoExterno=1.
--- TABLE END ---

3.2 Conceptos de Costo

--- TABLE START ---
Id | Descripción | Orden | Uso en LS
5 | COSTO POR PARADA x PALLET | 5 | Costo del transportista por entrega, calculado en pallets.
6 | COSTO POR PARADA x PESO | 5 | Costo por entrega calculado en kilos (portes).
97 | COSTO POR PARADA x MINIMO PESO | 5 | Mínimo garantizado en costo por parada.
7 | COSTO SOBREPESO PARADA | 5 | Cargo de costo por exceso de peso en una parada.
8 | COSTO TARIFA FIJA (Origen-Destino) | 5 | Porte fijo por origen-destino (usado en arrastres PT).
9 | COSTO INCIDENCIA PARADA (Extras) | 5 | Cargo de costo por incidencia en una parada concreta.
67 | COSTO FREE DOMICILE | 5 | Porte con entrega en domicilio del destinatario final.
68 | COSTO WAREHOUSE HANDLING | 5 | Manipulación en almacén incluida en la guía de costo.
69 | COSTO ADMINISTRATION/SERVICE | 5 | Cargo administrativo o de servicio del transportista.
--- TABLE END ---

4. Modelos de Tarificación en Luis Simoes
Los clientes de LS se agrupan en cuatro modelos de tarificación según su base de cálculo principal. Conocer el modelo de cada cliente es clave para configurar correctamente el Tipo de Tarifa y la Formula en UNIGIS.

--- TABLE START ---
MODELO KG — Precio por kilogramo con escalado de tramos
--- TABLE END ---

Es el modelo más extendido en la operativa española de LS. El precio varía según el peso del pedido siguiendo una tabla de tramos. A mayor peso, menor precio unitario.

--- TABLE START ---
Clientes | Base calculo | Característica del escalado
Diageo ES (1011) | KG | 15 tramos de peso. Precio €/kg decreciente. FTL como tramo final.
Bacardí ES (1141) | KG + PAL | KG para tramos bajos (0-500 kg), precio fijo por PAL para el resto.
Ferroli ES (1007) | KG | 18 tramos de peso por familia de almacén. Peso volumétrico activo.
Spectrum ES (1004) | KG | 7 zonas geográficas x 11 tramos de peso. Peso volumétrico activo.
Bacardí PT (616) | KG/PAL | Tarifa por kg con FTL; sábados y festivos tabla separada.
LG Electronics PT (295) | M3 | Tarifa corrida por código postal. Único cliente en M3 puro.
--- TABLE END ---


--- TABLE START ---
 | Escalado hacia abajo (máximo escalado abajo) / En LS el escalado se aplica siempre buscando el tramo más bajo que contenga el peso del pedido. El sistema NO prorratea: aplica el precio del tramo completo. Si un pedido pesa 480 kg, se aplica el tramo 350-500 kg (no el de 500-750 kg).
--- TABLE END ---


--- TABLE START ---
MODELO PAL — Precio por pallet con escalado de tramos
--- TABLE END ---

Se usa cuando la unidad logística es el pallet completo. El precio puede ser fijo (mismo precio sea cual sea el número de pallets) o escalar (precio diferente según el número de pallets).

--- TABLE START ---
Clientes | Base calculo | Caracteristica del escalado
Unilever PT (604) | PAL | FTL a partir de 17 pallets. Tramos 0-17 / 17+ (FTL).
Essity PT (303) | M3/PAL | Contratos mixtos: algunos en M3, otros en pallets.
Prime Drinks PT (732) | PAL/KG | FTL a partir de 22 pallets. Doble entrada en algunos contratos.
Unilever ES (1179) | PAL/KG | Huecos de camión: precio por pallet según ocupación del tráiler.
Procter PLV ES (1087) | PAL/KG/0.5PAL | Semipallet (medio pallet) como unidad adicional. Reparto % por familia.
--- TABLE END ---


--- TABLE START ---
 | FTL como tramo final del escalado / Cuando el pedido supera el umbral de FTL (ej. 17 PAL en Unilever PT o 22 PAL en Prime Drinks), el sistema aplica automáticamente la tarifa FTL fija (precio por viaje) en lugar de la tarifa por pallet. La fórmula cambia de [precio_unitario * pallets] a [precio_fijo].
--- TABLE END ---


--- TABLE START ---
MODELO M3 — Precio por metro cubico (volumen)
--- TABLE END ---

Exclusivo de LG Electronics PT. La tarifa corrida se indexa por código postal de destino: cada rango de CP tiene un precio diferente por m3 según la tabla de LTL de LG.

--- TABLE START ---
Clientes | Base calculo | Característica del escalado
LG Electronics PT (295) | M3 | Tarifa corrida: precio continuo que varía según el volumen de 0 a 23 m3 + FTL.
Essity PT (303, algunos contratos) | M3 | Tramos de volumen: 0-0.5 / 0.5-1 / 1-1.5 / 1.5-2.5 / ... / 28-56 m3 + €/Viatura.
--- TABLE END ---


--- TABLE START ---
 | Tarifa corrida vs tarifa por tramos / En LG PT la tarifa corrida es continua: cada decima de m3 tiene un precio diferente (0.1 m3, 0.2 m3, 0.293 m3...). En Essity PT la tarifa es por tramos fijos. Ambas se configuran en UNIGIS con la misma estructura de Tarifa pero con un numero diferente de filas en la tabla de escalado.
--- TABLE END ---


--- TABLE START ---
MODELO MIXTO — Combinación de bases en el mismo contrato
--- TABLE END ---

Algunos clientes tienen contratos que mezclan tipos de servicio con bases de cálculo diferentes. El TMS resuelve el modelo correcto a partir del Tipo de Servicio del pedido.

--- TABLE START ---
Clientes | Tipos de servicio | Como se resuelve en UNIGIS
Bacardí ES (1141) | E (pallet), EKG (kg), ECAN (kg+cubicaje) | Tres conceptos diferentes se activan según el tipo de servicio del pedido.
Ferroli ES (1007) | CPV, E, ESAT (sábado), PAQ (paquetería) | Cada familia de almacén tiene su contrato y su cuadro tarifario.
Unilever ES (1179) | CDT (temp. controlada), CPV (ambiente), DA (aduanas) | Contrato 1179C para frio, 1179D para ambiente, 1179P para cargas Persán.
Spectrum ES (1004) | CPV (peso vol.), E (peso real), PAQ (paquetería) | Contratos 1004R y 1004X con peso volumétrico activo.
--- TABLE END ---

5. Contratos y Familias de Almacen
En LS, cada contrato corresponde a una familia de producto o canal de distribución dentro del mismo cliente. El TMS asigna el contrato correcto a cada pedido filtrando por la familia de almacén configurada en el artículo.
5.1 Clientes Portugal (DLS)

--- TABLE START ---
Cod cliente | Contrato | Familia / Canal | Descripción
604 Unilever | 604A | ISOT | Unilever Fima Ambiente
 | 604E | HPC | Unilever Lever Home Care (contrato principal facturación)
 | 604F | HPC | Unilever Lever Personal Care
 | 604G | ISOT | Unilever Knorr
 | 604J | BEBI | Unilever Ice Tea
 | 604H | HPC | Materiales CoPacking
 | 604V | HPC | Unilever Lever Home Care (venta)
295 LG | 295Z | ELEC | LG Logística Integrada (contrato principal)
 | 295D | ELEC | LG Domicilios
 | 295H | ELEC | LG Pedidos de servicio — Logística
 | 295A | ELEC | LG Pedidos de servicio — Asistencia técnica
732 Prime | 732A | POS | Prime Drinks Producto Acabado POS
 | 732B | BEBI | Prime Drinks Producto Acabado bebidas
 | 732C | BEBI | Prime Drinks B2C
 | 732M | BEBI | Prime Drinks CoPacking
303 Essity | 303A | — | Essity Armazem (almacén)
 | 303B | — | Essity Distribución Retail
 | 303C | — | Essity Canal Homecare
 | 303D | — | Essity Webshop
 | 303X | HPC | Essity Tork CD Centralidad
616 Bacardi | 616 | BAC | Bacardí Producto (principal)
 | 616A | LP | Bacardí Material Promocional POS
 | 616TP | BEBI | Bacardí Transporte Primario
 | 616P | LP | Bacardí Pacotaria (paqueterías pequeña)
--- TABLE END ---

5.2 Clientes España (LOAL)

--- TABLE START ---
Cod cliente | Contrato | Familia / Canal | Descripcion
1179 Unilever | 1179D | Ambiente | Unilever distribución temperatura ambiente (principal)
 | 1179C | Frio | Unilever distribución temperatura controlada
 | 1179P | — | Unilever cargas Persán (carga completa)
1011 Diageo | 1011T | Alimentación | Contrato único. Varios tipos de servicio.
1141 Bacardí | 1141 | BAC | Bacardí España producto (zona centro y provincias)
 | 1141P | PAC | Bacardí España material POS (zona centro y provincias)
1007 Ferroli | 1007F | BU1/BU2 | Ferroli línea 1: < 15 kg y > 15 kg
 | 1007G | BU3 | Ferroli línea 2: < 25 kg
 | 1007V | CS1/CS2 | Cointra línea 1: < 15 kg y > 15 kg
 | 1007W | FE3/CS3 | Cointra línea 2: < 25 kg
 | 1007S | — | Ferroli Sevilla
1087 Procter | 1087D | — | P&G Distribución / Logística promocional
 | 1087P | — | P&G POS Independientes
1004 Spectrum | 1004R | OI | Operaciones internas + Distribución
 | 1004X | — | Solo distribución
 | 1004Z | OI | Solo operaciones internas
--- TABLE END ---


--- TABLE START ---
 | Regla de asignación de contrato en UNIGIS / El TMS asigna el contrato a cada pedido en función del campo Familia de Almacen del artículo. Si un pedido de Ferroli contiene artículos de la familia BU1, el sistema selecciona el contrato 1007F automáticamente. Si el pedido incluye familias mixtas, se aplica el contrato con mayor peso o el configurado como principal.
--- TABLE END ---

6. Escalados, Mínimos y Cubicaje
6.1 Como funciona el escalado en UNIGIS TMS
El escalado es la tabla de tramos que define el precio según el volumen o peso del pedido. En LS se usa siempre el modo máximo escalado hacia abajo: el sistema busca el tramo que contiene el valor real y aplica el precio de ese tramo. No hay prorrateo entre tramos.

--- TABLE START ---
Tramo de peso | Precio €/kg (Diageo ES — Toledo) | Tipo | Lectura practica
0 a 50 kg | 0,107 €/kg | Variable | Pedido de 30 kg: 30 x 0,107 = 3,21 €
50,01 a 100 kg | 0,096 €/kg | Variable | Pedido de 80 kg: 80 x 0,096 = 7,68 €
100,01 a 200 kg | 0,085 €/kg | Variable | Pedido de 150 kg: 150 x 0,085 = 12,75 €
200,01 a 350 kg | 0,071 €/kg | Variable | Pedido de 280 kg: 280 x 0,071 = 19,88 €
350,01 a 500 kg | 0,062 €/kg | Variable | —
500,01 a 750 kg | 0,050 €/kg | Variable | —
750,01 a 1.000 kg | 0,040 €/kg | Variable | —
1.000,01 a 2.500 kg | 0,030 €/kg | Variable | —
2.500,01 a 5.000 kg | 0,025 €/kg | Variable | —
5.000,01 a 7.500 kg | 0,022 €/kg | Variable | —
7.500,01 a 10.000 kg | 0,018 €/kg | Variable | —
10.000,01 a 15.000 kg | 0,016 €/kg | Variable | —
15.000,01 a 20.000 kg | 0,015 €/kg | Variable | —
Mas de 20.000 kg | 0,014 €/kg | Variable | —
FTL (carga completa) | 322,365 € / viaje | Fijo | Precio por viaje completo independiente del peso
--- TABLE END ---


--- TABLE START ---
 | Formula en UNIGIS para tarifa KG / Formula: [precio_unitario_entre] * [pedido. Peso] / Base de cálculo: Precio unitario (entre tramos) / Concepto: VENTA DESDE PEDIDO x PESO (id 101) / El campo FormulaRangoIN del fichero Excel = [Pedidos_Total_Int1] activa el uso del valor del tramo.
--- TABLE END ---

6.2 Mínimo garantizado
Algunos contratos incluyen un importe mínimo por entrega. Si el cálculo del escalado arroja un resultado inferior al mínimo, el sistema aplica el mínimo automáticamente.

--- TABLE START ---
Cliente | Tipo de mínimo | Como se configura en UNIGIS
LG Electronics PT (295) | Mínimo por escalado corrido | El concepto VENTA DESDE PEDIDO x PESO MINIMO (id 100) actúa como tarifa de mínimos: si la tarifa principal da menos, se aplica la de mínimos.
Bacardí ES (1141, tramos bajos) | Mínimo por tramo fijo | ValorResultadoMinimo en la tarifa: ej. 1.587.000 (en centésimas = 15.870 €). El campo bloquea resultados menores.
Bacardí ES (1141, tramos altos) | Pallet americano suplemento | Concepto adicional id 104 (VENTA ADICIONAL PALLET AMERICANO) se suma al principal.
--- TABLE END ---

6.3 Cubicaje (peso volumétrico)
Cuando el volumen de la mercancía implica un coste de transporte mayor que su peso real, se aplica el cubicaje: un factor de conversión que transforma el volumen en peso equivalente para el cálculo tarifario.

--- TABLE START ---
Cliente / Destino | Factor de cubicaje | Aplicación
Bacardí ES — Canarias | 333 kg/m3 | El peso de la mercancía se compara con volumen x 333. Se factura el mayor de los dos.
Ferroli ES — todos los contratos | Variable por familia | El peso volumétrico varía según la familia de almacén (BU1 < BU2 < BU3).
Spectrum ES (1004R) | Activo | El contrato 1004R incluye peso volumétrico; el 1004X no.
Unilever ES (1179C/D) | No activo | Las entregas agrupadas se facturan por pallet real sin cubicaje.
--- TABLE END ---


--- TABLE START ---
 | Como activar cubicaje en UNIGIS / En la configuración de la Tarifa, el campo BaseCalculo permite seleccionar VentaXPedidoPesoMin o fórmulas que usan el peso mayor entre real y volumétrico. El campo FormulaRangoIN se rellena con [Pedidos_Total_Int1] para activar la evaluación del peso equivalente.
--- TABLE END ---

7. Cobertura Geográfica y Destinos Especiales
LS opera en toda la Península Ibérica más los archipiélagos españoles y portugueses. Cada zona geográfica con condiciones especiales tiene su propia tabla de tarifas en UNIGIS.
7.1 Estructura de zonas en Portugal (DLS)
Las tarifas PT se indexan por Distrito. Cada cliente tiene su propia tabla con los 18 distritos continentales mas las Islas.

--- TABLE START ---
Zona | Distritos / Ambito | Caracteristica tarifaria
Distribución Continental | Lisboa, Setubal, Porto, Viana do Castelo, Braga, Aveiro, Coimbra, Leiria, Santarem, Braganca, Vila Real, Guarda, Viseu, Castelo Branco, Portalegre, Evora, Beja, Faro | Tarifa escalada por distrito. En algunos clientes (Unilever PT) incluye también Azambuja.
Madeira | Funchal y Porto Santo | FTL y HTL con precio fijo. En Prime Drinks: FTL Madeira = tarifa especial contenedor 20/40 pies.
Azores | Ponta Delgada (Terceira) | Misma estructura que Madeira. Precio por contenedor o FTL aéreo según el cliente.
Entregas especiales (Armazem) | COL Carregado, Azambuja | Destinos internos de LS: los movimientos de entrada en el almacén tienen tarifa propia diferente a la de distribución.
--- TABLE END ---

7.2 Estructura de zonas en España (LOAL)
Las tarifas ES se indexan por provincia o por zona geográfica según el cliente. El modelo más complejo es Spectrum, con 7 zonas; el más sencillo es Diageo, indexado directamente por provincia.

--- TABLE START ---
Zona | Provincias incluidas | Característica tarifaria
Madrid y Centro | 28-Madrid, 45-Toledo, 16-Cuenca, 19-Guadalajara, 40-Segovia, 05-Avila | El origen de LS en España es Area Madrid (código origen AD). Es la zona más cercana y económica.
Nordeste | 08-Barcelona, 17-Girona, 25-Lleida, 43-Tarragona, 50-Zaragoza, 22-Huesca | Segunda zona de mayor volumen. En Spectrum = Zonas 1 y 2.
Levante | 46-Valencia, 03-Alicante, 12-Castellon, 30-Murcia, 02-Albacete | En Ferroli el almacén origen es Valencia (LSLI Valencia).
Norte | 01-Alava, 20-Gipuzkoa, 48-Bizkaia, 31-Navarra, 26-La Rioja, 39-Cantabria | Precio premium por distancia.
Galicia y Asturias | 15-La Coruña, 36-Pontevedra, 32-Ourense, 27-Lugo, 33-Asturias | Una de las zonas más caras en precio por kg.
Andalucia | 41-Sevilla, 14-Cordoba, 21-Huelva, 11-Cadiz, 29-Malaga, 18-Granada, 04-Almeria, 23-Jaen | Precios similares a Galicia por distancia desde Madrid.
Canarias | 35-Las Palmas, 38-Sta Cruz de Tenerife | Tarifa especial: cubicaje 333 kg/m3. Destinos A/B/C/D según isla. Sin FTL terrestre.
Ceuta y Melilla | 51-Ceuta, 52-Melilla | Precio muy superior. Requiere gestión aduanera (DA como servicio adicional).
Andorra | AND | Precio especial. IVA diferente (E en campo Código IVA). Spectrum: desde 19,04 €/bulto.
Gibraltar | GIB | Precio similar a Ceuta/Melilla. Solo activo en algunos contratos (Diageo ES).
Baleares | 07-Baleares (Palma) | Tarifa marítima. En algunos contratos incluye cubicaje. Spectrum: desde 235 €/FTL.
--- TABLE END ---


--- TABLE START ---
 | Configuración de zonas en UNIGIS / El campo Zona de la tabla Tarifa se rellena con el código de zona o provincia. El campo CodigoPostal se usa cuando la tarifa se indexa a nivel de CP (modelo LG PT con tarifa corrida). El campo DescripcionZona contiene el nombre del tramo para trazabilidad (ej. C-8555).
--- TABLE END ---

8. Servicios Adicionales e Incidencias
Los servicios adicionales son cargos que se suman a la tarifa base cuando el servicio requiere condiciones especiales. En LS se gestionan como Conceptos de incidencia dentro de la guía de venta o mediante tarifas adicionales en el cuadro tarifario.
8.1 Tabla de servicios adicionales y su configuración

--- TABLE START ---
Servicio | Descripción | Importe referencia | Configuración UNIGIS
DA — Despacho Aduanas | Gestión aduanera para Ceuta, Melilla o Andorra | 30 € / expedición | Concepto adicional activado por Tipo de Servicio DA o por destino.
BAF — Bunker Adj. Factor | Suplemento de combustible adicional puntual | Variable (% sobre base) | Concepto adicional. Se activa solo cuando está vigente en el contrato.
RETA — Retorno de albarán | Devolución del albarán firmado al cliente | 2,536 € / albarán | Concepto en la guía de venta con tarifa fija.
POD — Recuperación comprobante | Recuperación de justificante de entrega | 0,546 € / documento | Concepto adicional activado por solicitud expresa.
T3 — Timbre / tasa | Tasa por expedición (Bacardí ES) | 6,60 € / tonelada | Concepto en guía de venta con formula por peso.
URG — Entrega urgente | Servicio de entrega antes de las 12h o en menos de 24h | Tarifa propia | Tipo de Servicio URG con cuadro tarifario propio.
ESP — Servicio especial | Entregas especiales (horario nocturno, sábado) | Tarifa propia | Tipo de Servicio ESP o ESAT con tabla de sábados y festivos.
ECAN — Canarias | Entrega en islas Canarias con cubicaje | Tarifa propia x isla | Tipo de Servicio ECAN. Factor cubicaje 333 kg/m3 activo.
PAQ — Paquetería | Envíos de menos de 50 kg por operador de paqueterías | Tarifa propia por zona | Tipo de Servicio PAQ. Zonas: provincial / nacional / baleares.
--- TABLE END ---

8.2 Tablas de sábados y festivos
Varios clientes tienen tabla de tarifas diferenciada para entregas en sábado y festivos. Se activa automáticamente cuando el campo DiaSemana de la tarifa corresponde a sábado (6) o festivo.

--- TABLE START ---
Cliente | Estructura de la tabla de sabados
Essity PT (303) | Destinos fijos (Pingo Doce, Modis, Auchan, LIDL) x tramos de pallets: hasta 3 PAL / 4-7 PAL / 8-10 PAL / 11-16 PAL / 17-33 PAL.
Prime Drinks PT (732) | Misma estructura por destinos y tramos de pallets que Essity.
Bacardí PT (616) | Tabla separada por Distrito con mismos tramos de kg pero precios superiores.
Bacardí ES (1141) | Tipos de servicio ESP y ESAT tienen cuadro tarifario propio con precio diferencial de sábado.
Ferroli ES (1007) | Contrato ESAT activo para sábado. Familias BU1/BU2 con precios diferenciados.
--- TABLE END ---

9. Ajuste de Combustible y Actualización Periódica
Todos los contratos de LS incluyen una cláusula de revisión del combustible. El ajuste se calcula comparando el precio de referencia del contrato con el precio medio real del periodo y aplicando el porcentaje de variación sobre la tarifa base.
9.1 Estado actual de los ajustes por cliente

--- TABLE START ---
Cliente | Referencia combustible | Ajuste vigente | Periodo de referencia
Unilever PT (604) | Gasóleo + IPC + CCTV | + 2,36% sobre tarifa | Actualización anual (diciembre)
Bacardí PT (616) | 1,5372 €/litro | - 2,09% sobre tarifa | Media Q2 2025 (desde 01/07/2025)
LG Electronics PT (295) | 1,5975 €/litro | + 3,17% sobre tarifa | Media (ref. 31/12/2023, desde 01/07/2025)
Prime Drinks PT (732) | 1,5498 €/litro | - 1,79% sobre tarifa | Media Q3 2024
Diageo ES (1011) | Sin ajuste automático | Revisión anual por contrato | Cuarto trimestre
Bacardí ES (1141) | Incluido en tarifa base | Sin ajuste separado | Revisión anual
Ferroli ES (1007) | Por familia de almacén | Revisión periódica | Revisión anual
--- TABLE END ---


--- TABLE START ---
 | Como se implementa el ajuste en UNIGIS / El ajuste de combustible no modifica la tarifa base en el cuadro tarifario. Se implementa como un porcentaje de descuento o recargo aplicado al resultado final de la guía mediante un Concepto de ajuste independiente, o actualizando el campo ValorDesde/ValorHasta de la tarifa en el siguiente ciclo de vigencia (VigenciaDesde / VigenciaHasta).
--- TABLE END ---

9.2 Revisión tarifaria anual
Además del ajuste de combustible, los contratos de LS incluyen revisión tarifaria anual vinculada al IPC. El proceso en UNIGIS consiste en crear una nueva versión de cada tarifa con VigenciaDesde = fecha de la revisión y los nuevos valores, manteniendo la tarifa anterior activa hasta esa fecha.

--- TABLE START ---
Paso | Acción en UNIGIS
1. Identificar tarifas a actualizar | Consultar en el módulo de Tarifas todas las filas con VigenciaHasta cercana a la fecha de revisión.
2. Calcular nuevos valores | Aplicar el porcentaje de actualización (IPC o gasóleo) a cada valor de la tabla.
3. Crear nueva versión | Duplicar las tarifas existentes con nueva VigenciaDesde y los nuevos importes. Cerrar las anteriores con VigenciaHasta = día anterior.
4. Validar solapamientos | Asegurarse de que no hay dos tarifas activas para el mismo rango en la misma fecha.
5. Activar en producción | Verificar con una guía de prueba que el nuevo importe se calcula correctamente antes del corte.
--- TABLE END ---

10. Aglutinación, Prefacturación y Liquidación
La aglutinación define como se agrupan las entregas de una tournée para generar la guía de facturación. Es el elemento clave que diferencia el modelo LS de otros operadores.
10.1 Modelo de aglutinación en LS

--- TABLE START ---
Tipo de aglutinación | Cuando se usa | Efecto en UNIGIS
Por Tournée (principal) | Todos los clientes con Tipo de Guia 200 | Todos los pedidos del mismo viaje se consolidan en una única guía de venta. El importe total = suma de tarifas por pedido.
Por Pedido individual | Tipo de Guia 2 (un pedido = una guía) | Se usa para pedidos especiales o contratos sin agrupación. Menos común en LS.
Por Viaje (recolecciones) | Tipo de Guia 210 | La facturación se calcula sobre el viaje de recogida, no sobre los pedidos individuales.
--- TABLE END ---


--- TABLE START ---
 | Fecha de Tournée como referencia de prefacturación / La prefacturación en LS usa siempre la Fecha de Tournée, no la Fecha de Entrega ni la Fecha del Pedido. Esto significa que si una tournée cubre varios días, todas las entregas se consolidan en la fecha de salida del vehiculo (inicio de la tournee). Esta es la fecha que aparece como referencia en la guía de facturación.
--- TABLE END ---

10.2 Flujo de liquidación en UNIGIS
El ciclo completo desde la entrega hasta la facturación sigue estos pasos en UNIGIS TMS:

--- TABLE START ---
Paso | Fase | Descripción
1 | Entrega | El conductor confirma la entrega en la app móvil. El pedido pasa a estado Entregado.
2 | Cierre de tournée | Al finalizar el viaje, el sistema cierra la tournée. Fecha cierre = Fecha Tournée.
3 | Generación de guía | UNIGIS crea automáticamente la guía de venta (Tipo Guia 200) agrupando todos los pedidos de la tournée.
4 | Tarificación | El motor de tarifas recorre cada pedido de la guía, aplica el cuadro tarifario del cliente y genera las líneas de concepto.
5 | Prefacturación | La guía queda en estado Prefacturada. El equipo de operaciones puede revisarla y corregir incidencias.
6 | Validacion | El responsable de facturación valida la guía: confirma los importes y los servicios adicionales.
7 | Facturación | La guía pasa a estado Facturada. Se genera el documento de factura que se envía al cliente.
8 | Conciliación | El departamento de administración compara la factura emitida con la confirmación de pago del cliente.
--- TABLE END ---

11. Crear una Tarifa en UNIGIS TMS — Paso a Paso (Modelo LS)
Este apartado explica cómo dar de alta una nueva tarifa en UNIGIS TMS siguiendo el flujo real para Luis Simoes. El ejemplo usa Diageo ES (1011T) con tarifa por kg para la zona Toledo.
Paso 1 — Acceder al módulo de Tarifas

--- TABLE START ---
Campo / Ruta | Detalle
Ruta en UNIGIS | Menú principal > Tarifación > Tarifas (o Maestros > Tarifas según la instalación)
Filtro recomendado | Filtrar por IdCliente = 1011 para ver solo las tarifas de Diageo ES antes de crear una nueva.
Verificación previa | Comprobar que no existe ya una tarifa activa para el mismo cliente, contrato, zona y rango de fechas.
--- TABLE END ---

Paso 2 — Crear el registro de Tarifa

--- TABLE START ---
Campo | Valor para Diageo ES Toledo
IdCuadroTarifario | Código del cuadro tarifario del cliente 1011 (consultar en Cuadros Tarifarios)
VigenciaDesde | Fecha de inicio de validez (ej. 01/01/2026)
VigenciaHasta | Fecha de fin de validez (ej. 31/12/2026) o dejar vacío para vigencia indefinida
Id Concepto | 101 — VENTA DESDE PEDIDO x PESO
Formula | [precio_unitario_entre] * [pedido. Peso]
BaseCalculo | Precio unitario
Entidad | Pedido
IdCliente | 1011
IdTipoGuia | 200 (VENTA DESDE PEDIDO AGRUPADOS)
--- TABLE END ---

Paso 3 — Definir los filtros geográficos

--- TABLE START ---
Campo | Valor para la zona Toledo
Zona | Toledo
Provincia | 45
DescripcionZona | TOLEDO (para trazabilidad)
--- TABLE END ---

Paso 4 — Configurar los tramos de peso (escalado)
Para cada tramo de peso se crea una fila de Tarifa independiente con el mismo IdCuadroTarifario, IdConcepto y filtros de zona, pero con diferentes valores de PesoDesde, PesoHasta y Formula (precio).

--- TABLE START ---
PesoDesde (kg) | PesoHasta (kg) | Precio €/kg | Tipo de tramo
0 | 50 | 0,107 | Variable por peso
50,01 | 100 | 0,096 | Variable por peso
100,01 | 200 | 0,085 | Variable por peso
200,01 | 350 | 0,071 | Variable por peso
350,01 | 500 | 0,062 | Variable por peso
500,01 | 750 | 0,050 | Variable por peso
750,01 | 1.000 | 0,040 | Variable por peso
1.000,01 | 2.500 | 0,030 | Variable por peso
2.500,01 | 5.000 | 0,025 | Variable por peso
5.000,01 | 7.500 | 0,022 | Variable por peso
7.500,01 | 10.000 | 0,018 | Variable por peso
10.000,01 | 15.000 | 0,016 | Variable por peso
15.000,01 | 20.000 | 0,015 | Variable por peso
20.000,01 | 99.999 | 0,014 | Variable por peso
FTL (cualquier peso) | — | 322,365 € | Precio fijo por viaje
--- TABLE END ---

Paso 5 — Configurar la tarifa FTL

--- TABLE START ---
Campo | Valor FTL Toledo
IdConcepto | 3 — VENTA DESDE PEDIDO (precio fijo)
Formula | 322,365
BaseCalculo | Precio fijo
PesoDesde | 0 (aplica siempre que se seleccione FTL)
IdTipoGuia | 1 — COSTO DISTRIBUCION DIRECTA (o el tipo de guia de FTL configurado)
--- TABLE END ---

Paso 6 — Activar y verificar

--- TABLE START ---
Accion | Detalle
Guardar las tarifas | Guardar cada fila de tramo. Verificar que la suma de filas = 15 tramos + 1 FTL = 16 registros.
Test de tarificacion | Crear un pedido de prueba para cliente 1011, destino Toledo, peso 80 kg. La guia debe calcular 80 x 0,096 = 7,68 €.
Verificacion de vigencia | Comprobar que la VigenciaDesde es igual o anterior a la fecha del pedido de prueba.
Activar estado | La tarifa debe estar en estado Activo (IdEstadoTarifa = 1) para ser usada en el calculo.
--- TABLE END ---


--- TABLE START ---
 | Truco para cargas masivas / Para clientes con muchas zonas (Bacardí ES tiene 50+ provincias, Diageo ES tiene 30+ regiones), se recomienda preparar el fichero de importación en Excel con todas las filas de tramos por zona y usar la importación masiva de UNIGIS (Herramientas > Importar Tarifas). El formato del fichero debe coincidir exactamente con las columnas del modelo: IdCuadroTarifario, VigenciaDesde, VigenciaHasta, IdConcepto, PesoDesde, PesoHasta, Zona, Provincia, Formula...
--- TABLE END ---

12. Ejemplos de Tarifas Reales
Ejemplo 1 — Bacardí ES: tarifa KG + PAL por zona provincial
Cliente Bacardi ES (1141), contrato principal (producto). Origen: Area Madrid. Destino: Alava.

--- TABLE START ---
Tramo | 0-50 kg | 50-100 kg | 100-250 kg | 250-500 kg | Comentario
€/kg | 10,829 | 16,009 | 0,105 | 0,080 | Primeros tramos en €/entrega (precio fijo), luego €/kg
PAL 1 | 47,08 | — | — | — | 1 pallet: precio fijo 47,08 €
PAL 5 | 84,37 | — | — | — | 5 pallets: precio fijo 84,37 €
PAL 10 | 148,00 | — | — | — | 10 pallets: precio fijo 148,00 €
PAL 20 | 315,82 | — | — | — | 20 pallets: precio fijo 315,82 €
--- TABLE END ---


--- TABLE START ---
 | Nota de diseño Bacardi ES / Los tramos 0-50 kg y 50-100 kg tienen precio fijo (€/entrega) aunque se muestran en la columna €/kg. A partir de 100 kg la tarifa es variable por kg. A partir de 1 pallet el sistema cambia a precio fijo por pallet. Esto implica dos conceptos en UNIGIS: uno de tarifa KG (id 101) y otro de tarifa PAL (id 102/103).
--- TABLE END ---

Ejemplo 2 — LG Electronics PT: tarifa corrida por M3 y CP
Cliente LG PT (295), contrato 295Z. Tarifa corrida: cada decima de m3 tiene un precio diferente segun el rango de codigo postal.

--- TABLE START ---
Ejemplo calculo | CP destino | Volumen pedido | Tarifa aplicada
Pedido a Lisboa (CP 1000-1999) | 1000-000 | 0,3 m3 | Precio tramo 0,293-0,3 m3 del CP Lisboa
Pedido a Porto (CP 4000-4999) | 4000-000 | 2,5 m3 | Precio tramo 2,5 m3 del CP Porto
FTL a cualquier destino | — | 23+ m3 | Precio FTL fijo segun destino
--- TABLE END ---


--- TABLE START ---
 | Como se configura la tarifa corrida de LG en UNIGIS / Cada combinación CP + tramo de m3 es una fila independiente en la tabla de tarifas. Con 102 columnas en el Excel de LG PT (86 tramos de m3 x múltiples CP), el número total de filas puede superar las 5.000 líneas. Se recomienda la importación masiva desde Excel para este cliente.
--- TABLE END ---

Ejemplo 3 — Unilever PT: FTL de planta a cliente
Inbounds (arrastres primarios) desde plantas a centros de distribución LS. Cliente Unilever PT (604), contrato 604E.

--- TABLE START ---
Origen → Destino | Tarifa base | Tarifa actualizada | Variacion
Santa Iría → Carregado / Azambuja | 90,00 € / 25T ambiente | 115,86 € / viaje | + 28,7%
Santa Iría → Carregado (doble piso) | 140,00 € / viaje | 180,23 € / viaje | + 28,7%
Abrantes → Carregado | 155,00 € / viaje | 199,50 € / viaje | + 28,7%
Francia (48H) → CD | 2.481,23 € / viaje | 3.193,94 € / viaje | + 28,7%
Francia (72H) → CD | 2.977,94 € / viaje | 3.833,31 € / viaje | + 28,7%
COL Palmela → CD | 204,30 € / viaje | 208,33 € / viaje | + 2,0%
--- TABLE END ---


--- TABLE START ---
 | Tipo de Guia para inbounds (arrastres) / Los transportes primarios (planta → almacén LS) usan el Tipo de Guia 111 — COSTO ARRASTRES PORTUGAL. Este tipo no es de venta sino de costo: registra el coste del transporte primario que LS paga al proveedor. La tarifa de costo usa el Concepto 8 (COSTO TARIFA FIJA) con precio por viaje.
--- TABLE END ---
