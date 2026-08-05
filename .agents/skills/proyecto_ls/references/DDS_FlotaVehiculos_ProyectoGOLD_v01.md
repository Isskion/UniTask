DOCUMENTO DE DISEÑO DE SOLUCIÓN
DDS — Definición de Flota y Tipos de Vehículos
Proyecto GOLD — FASE II
Luís Simões | Grupo LS Logística
Versión: v0.1
Fecha: 07 de julio de 2026
CONFIDENCIAL
Control del Documento
Lista de Distribución

--- TABLE START ---
Empresa | Nombre | Cargo | Email
LS / Luís Simões | Vitor Pereira Silva | Responsable TMS | -
LS / Luís Simões | Miguel Sampaio Sousa | Operaciones | -
LS / Luís Simões | Gonzalo Castro | Planning | -
LS / Luís Simões | Jorge Sureda | Implantación TMS | -
UNIGIS | Daniel Del Amo | Consultor Implantación | daniel.delamo@unigis.com
UNIGIS | Veronica M. | Consultor | -
--- TABLE END ---

Historial de Revisiones

--- TABLE START ---
Versión | Fecha | Secciones Revisadas | Descripción
v0.1 | 07/07/2026 | Todas | Versión inicial — Taller de definición de flota Proyecto GOLD FASE II
--- TABLE END ---

Tabla de Aprobaciones

--- TABLE START ---
Empresa | Nombre | Rol | Firma / Fecha
Luís Simões | Vitor Pereira Silva | Responsable TMS Cliente | _______________
Luís Simões | Jorge Sureda | Responsable Implantación Cliente | _______________
UNIGIS | Daniel Del Amo | Consultor Responsable UNIGIS | _______________
--- TABLE END ---

0. Agenda y Contexto de la Sesión
El presente documento recoge los resultados del taller de análisis de flotas y tipos de vehículos celebrado en el marco del Proyecto GOLD — FASE II, correspondiente a la implantación del TMS UNIGIS para el Grupo Luís Simões (LS). La sesión fue conducida por el equipo conjunto de LS y UNIGIS, con la participación de los responsables de planificación, operaciones y TI.
Figura: Agenda formal de la sesión — Proyecto GOLD
Los puntos trabajados en la sesión fueron:
Objetivo de la sesión: alinear la definición de tipos de vehículo para la parametrización en UNIGIS
TO-BE: Modelo organizativo y lógica de planificación (Programación, Planeamiento, Planificación de Medios)
Ecosistema Aplicacional Logístico (EAL): integraciones y flujos
Order Management (OM): visualización de pedidos por perfil
Planning: parametrización de flota por operación y jornada
Fleet: gestión de medios, conductores y vehículos
Adjuntos: tablas maestras y restricciones de entrega
1. Introducción
Luís Simões (LS) es uno de los operadores logísticos líderes de la Península Ibérica, con operaciones en Portugal y España. El Grupo LS gestiona una flota combinada de vehículos propios, dedicados y eventuales (subcontratados), distribuidos en múltiples hubs y depósitos regionales que cubren la totalidad del territorio peninsular.
El Proyecto GOLD representa la implantación del TMS UNIGIS en su modalidad completa (Order Management, Planning y Fleet) para las operaciones de distribución local y larga distancia. La FASE II del proyecto aborda la parametrización avanzada de la planificación de rutas, incluyendo la definición de la estructura de flota, tipologías de vehículo, carrocerías y el modelo de restricciones por domicilio de entrega.
Este DDS documenta específicamente los resultados del taller de análisis de flota, que constituye la base para la parametrización del módulo Planning de UNIGIS en lo referente a tipos de vehículo, capacidades, carrocerías y restricciones de entrega.
2. Objetivos del Proyecto
Los siguientes objetivos de negocio fueron identificados y validados durante la sesión de taller:
Unificar la definición de tipologías de vehículo a nivel ibérico (ES + PT) bajo un único estándar de parametrización en UNIGIS, garantizando coherencia en la planificación transfronteriza.
Automatizar la validación de restricciones de entrega por domicilio de destinatario, eliminando errores de rechazos por incompatibilidad de vehículo o carrocería al llegar al punto de entrega.
Centralizar el planeamiento de rutas en un equipo nacional único con visibilidad global por destino, maximizando la economía de escala y optimizando los retornos especialmente en Larga Distancia.
Descentralizar la planificación operativa de medios (flota y conductores) a nivel de depósito regional, aprovechando el conocimiento local de cada base para mejorar la ejecución.
Parametrizar en UNIGIS la asignación de tipos de vehículo habilitados por combinación de Operación y Tipo de Jornada, con cantidad disponible y prioridad de uso.
Gestionar la visibilidad de pedidos en Order Management por perfil de usuario, evitando que un planificador regional vea pedidos fuera de su ámbito operativo.
Establecer la base técnica para la implementación de flujos de Multitramos y Multileg para clientes específicos (Duran Freight, Intermerk).
3. Modelo Organizativo y Lógica de Planificación (TO-BE)
El modelo TO-BE define una clara separación de responsabilidades en tres capas funcionales, diferenciando entre quién programa las órdenes, quién planifica las rutas y quién asigna los medios de transporte.
Figura: Diagrama TO-BE: Flujo completo del modelo organizativo de planificación (Programación → Planeamiento → Ejecución)
3.1 Capa 1 — Programación de Pedidos
La programación de pedidos es el proceso de definir el 'camino' del pedido del cliente, creando las órdenes de transporte en el sistema. En UNIGIS, esta tarea corresponde al módulo Order Management. El equipo de SAC o programación introduce o recepciona los pedidos del cliente y los transforma en órdenes de transporte, validando las restricciones de domicilio y la clasificación del pedido.
Configuración UNIGIS: El proceso de Completado de Pedido y Validación de Pedido se ejecuta automáticamente al recibir la orden. El sistema determina el depósito de salida, el tipo de jornada y las restricciones aplicables al domicilio de entrega sin intervención manual.
3.2 Capa 2 — Planeamiento de Rutas (Centralizado)
El planeamiento de rutas es la agrupación de las órdenes y la definición de su secuencia de ejecución en rutas. Esta función está centralizada bajo el Equipo de Planeamiento Central Nacional, que tiene visibilidad global por destino, independientemente del origen geográfico del transporte.
La centralización permite optimizar los retornos de vehículos de larga distancia y consolidar cargas de diferentes depósitos de origen hacia el mismo destino, algo imposible de gestionar de forma descentralizada.
Configuración UNIGIS: El planificador del equipo central opera desde una vista consolidada de todas las operaciones, filtrable por zona de destino. El sistema propone la agrupación óptima de órdenes en rutas según los parámetros configurados (capacidad, ventanas horarias, restricciones de domicilio).
3.3 Capa 3 — Planificación de Medios (Descentralizada por Depósito)
La asignación de medios (vehículos, conductores y transportistas) es descentralizada: cada depósito regional gestiona sus propios recursos con conocimiento local de las especificidades operativas. Se divide en dos equipos según la naturaleza de la ruta:
LO — Equipo de Subcontratación Local: Gestiona la asignación de vehículos eventuales para rutas locales desde el depósito.
LD — Equipo de Subcontratación de Larga Distancia: Centralizado, con visibilidad de la posición de los vehículos y aproximación de recogidas.
C — Equipo de Cambios en la Carga: Descentralizado, gestiona modificaciones de carga en los vehículos en la base.
Dispatch: Responsable de los cambios durante el viaje (cambio de vehículo, conductor, paradas o reencaminamientos en ruta).
3.4 Estructura de Hubs / Operaciones y Depósitos
La operación se estructura en torno a grandes hubs geográficos que agrupan los depósitos físicos bajo su control. A continuación se detalla la asignación:

--- TABLE START ---
Hub / Operación | Código Depósito | Nombre Depósito | País
Nordeste Barcelona | BL | Depósito BL | ES
Nordeste Barcelona | BF | Depósito BF | ES
Centro Norte Madrid | AX | Depósito AX | ES
Centro Norte Madrid | CG | Depósito CG | ES
Nordeste Valencia | VL | Depósito VL | ES
Sur Sevilla | SV | Depósito SV | ES
NW - Noroeste Porto | - | Base Porto | PT
SW - Sudoeste Lisboa | - | Base Lisboa | PT
--- TABLE END ---

Figura: Zoom Visio: Asignación de depósitos físicos a Operaciones de zona (Nordeste Barcelona, Centro Norte Madrid, etc.)
4. Datos Maestros
4.1 Tipos de Jornada y Operación
El Tipo de Jornada es el eje principal de la parametrización del Planning en UNIGIS. Cada tipo de jornada combina el ámbito geográfico con la modalidad de transporte (local, larga distancia, paquetería, ajena). La tabla a continuación muestra el mapeo entre Tipo de Jornada y la Operación a la que pertenece en UNIGIS.
📌 Nota: La columna 'Operación' corresponde al campo Operación en la estructura UNIGIS (Empresa > Sucursal > Operación > Depósito). El equipo de implantación debe completar los tipos de jornada pendientes (indicados en el Excel 'Tipos Jornada_operacion wip') antes de la parametrización definitiva.

--- TABLE START ---
Tipo de Jornada | Operación Asociada | País
PT Porto Local | NW - Noroeste Porto | PT
PT Noroeste Larga distancia | NW - Noroeste Porto | PT
PT Coimbra Local | NW - Noroeste Porto | PT
PT Noroeste Paquetería | NW - Noroeste Porto | PT
PT Ajena - Vila Real | NW - Noroeste Porto | PT
PT Ajena - Braga | NW - Noroeste Porto | PT
PT Lisboa Local | SW - Sudoeste Lisboa | PT
PT Algarve Local | SW - Sudoeste Lisboa | PT
PT Sudoeste Paquetería | SW - Sudoeste Lisboa | PT
PT Sudoeste Larga distancia | SW - Sudoeste Lisboa | PT
ES Barcelona Local | Nordeste Barcelona | ES
ES Barcelona Larga distancia | Nordeste Barcelona | ES
ES Barcelona Paquetería | Nordeste Barcelona | ES
ES Madrid Local | Centro Norte Madrid | ES
ES Madrid Larga distancia | Centro Norte Madrid | ES
ES Madrid Paquetería | Centro Norte Madrid | ES
ES Valencia Local | Nordeste Valencia | ES
ES Valencia Larga distancia | Nordeste Valencia | ES
ES Valencia Paquetería | Nordeste Valencia | ES
ES Sevilla Local | Sur Sevilla | ES
ES Sevilla Larga distancia | Sur Sevilla | ES
ES Sevilla Paquetería | Sur Sevilla | ES
--- TABLE END ---

Figura: Excel: Mapeo de Tipos de Jornada con Operaciones en UNIGIS (pendiente completar)
4.2 Maestro de Tipos de Vehículo
El maestro de Tipos de Vehículo define las capacidades físicas normalizadas por tipo y por país. Es la entidad base que el módulo Planning de UNIGIS utiliza para validar la factibilidad de asignar un vehículo a una ruta (según pallets, peso y volumen requeridos vs. disponibles).
La codificación básica de tipologías está alineada entre España y Portugal para los tipos T1 a T5. Sin embargo, Portugal tiene mayor detalle para vehículos de gran tonelaje (T6 y T7), y el catálogo SID (cliente específico) tiene su propio conjunto de tipologías con mayor granularidad en frío.

--- TABLE START ---
Tipo Vehículo | Descripción | Nº Pallets | Peso Máx. (t) | Volumen M3 | Observaciones
T1 | T1 (pequeño) | 6 | 1,34 | - | España y Portugal alineados
T2 | T2 | 10 | 3,5 | 22 | 
T3 | T3 | 18 | 6,5 - 9,5 | 45 | Tipo más habitual distribución local
T4 | T4 | 20 | 10 - 15 | 50 | 
T5 | T5 | 33 | 24 | 85 | 
T6 | LinkTrailer | 51 | 37 | - | Larga distancia PT / ES
T7 | DUO Trailer | 66 | - | - | Solo Portugal / Tráfico nacional
T1A | T1A | 6 | 1 | - | Variante T1
T2A | T2A | 14/15 | 5,5 / 4,5 | - | Variante T2
--- TABLE END ---

→ Ver Anexo A.1 — Maestro completo de vehículos por país (ES / PT / SID)
Figura: Excel Datos Maestro: Tablas de equivalencias de capacidad por tipo de vehículo (ES, PT, SID)
4.3 Tipos de Carrocería
La carrocería del vehículo determina las condiciones de temperatura y el método de descarga. En el modelo TO-BE de UNIGIS, la carrocería se combina con la tipología de vehículo para generar el Código de Planificación, que es el descriptor completo que usa el planificador para asignar recursos.

--- TABLE START ---
Código | Descripción | Uso en Planificación
C | Cortinas / Lona / Tauliner | Mercancía general sin temperatura controlada. Descarga lateral.
F | Frigorífica | Transporte en frío. Cadena de temperatura controlada.
I | Isotérmica | Mantiene temperatura sin motor de frío. Corta distancia.
BI | Bi-Temperatura | Dos compartimentos: frío y ambiente en el mismo vehículo.
--- TABLE END ---

4.4 Código de Planificación (Tipología + Carrocería)
El sistema UNIGIS utiliza una codificación combinada para describir el tipo de vehículo en el contexto de la planificación. La fórmula es: [Tipología] - [Carrocería]. Ejemplo: T1-F = Vehículo Tipo 1 con Carrocería Frigorífica.

--- TABLE START ---
Tipología | Carrocería | Código de Planificación
T1 | F (Frigorífica) | T1-F
T1 | C (Cortinas) | T1-C
T1 | I (Isotérmica) | T1-I
T2 | F (Frigorífica) | T2-F
T3 | F (Frigorífica) | T3-F
T3 | C (Cortinas) | T3-C
... | ... | El patrón se repite para todos los tipos
--- TABLE END ---

Figura: Excel: Lógica de combinación de códigos Tipología-Carrocería para planificación en UNIGIS
4.5 Tipos de Flota
Además de la tipología y carrocería, el Planning de UNIGIS parametriza el tipo de flota que puede utilizarse en cada combinación de Operación + Tipo de Jornada. Los tres tipos de flota disponibles son:
Propios: Flota de vehículos en propiedad de Luís Simões.
Dedicado: Flota asignada en exclusiva a LS por parte de un transportista externo (contrato dedicado).
Eventual: Flota subcontratada por viaje o jornada, sin compromiso de exclusividad.
La asignación del tipo de flota se parametriza especialmente para las tipologías T1, T2, T6 y T7, que corresponden a los vehículos más pequeños (distribución local) y más grandes (larga distancia).
5. Requerimientos Funcionales para UNIGIS
A partir del análisis de la sesión y la revisión del bloc de notas operativo (TO-DO UNIGIS Gerencial), se han identificado los siguientes requerimientos funcionales pendientes de implementación o configuración en el TMS UNIGIS:
Figura: Bloc de notas TO-DO: Minuta operativa de requerimientos pendientes para UNIGIS (OM, Maestros, Planning)

--- TABLE START ---
# | Requerimiento | Descripción | Módulo UNIGIS
R1 | Nuevo Maestro: Tipo de Domicilio | Creación de un nuevo campo/entidad maestra para clasificar el punto de entrega (ej. peatonal, muelle de carga, calle estrecha). | OM / Maestros
R2 | Nuevo Maestro: Tipo de Orden | Creación del maestro Tipo de Orden para clasificar y filtrar las órdenes de transporte. | OM / Maestros
R3 | Visualización de Pedidos en OM por Perfil | Un usuario debe ver únicamente los pedidos de su ámbito operativo. El sistema filtra por operación o tipo de jornada asignado al perfil. | Order Management
R4 | Campos Dinámicos (DYN) por Tipo de Pedido | Los campos estándar y DYN del pedido son visibles según la categoría/tipo. Configurar visibilidad por perfil y tipo de pedido. | Order Management
R5 | Asignación de Flota por Operación y Tipo de Jornada | El sistema permite definir por cada combinación Operación + Tipo de Jornada: tipos de vehículo habilitados, cantidad y prioridad. | Planning
R6 | Restricciones de Carrocería por Tipo de Jornada | Incorporar el desglose de carrocería (C/F/I/BI) dentro de la configuración de flota por jornada y operación. | Planning / Maestros
R7 | Gestión de Multitramos - Duran Freight | Definir flujos específicos de multitramo para el cliente Duran Freight. Revisión con Roberto, Ale y David. | Planning / Workflows
R8 | Gestión de Multitramos - Intermerk | Definir flujos específicos para Intermerk. Validación con Luisa. Reunión pendiente. | Planning / Workflows
R9 | Listado de Temas Multileg | Entregar listado operativo de temas Multileg a Brenda para coordinación de implementación. | Planning
--- TABLE END ---

6. Restricciones por Domicilio de Entrega
El sistema UNIGIS debe validar automáticamente, en el momento de la programación de pedidos, si el vehículo planificado para una ruta cumple con las restricciones del domicilio de entrega de cada cliente. Esto evita rechazos en destino por incompatibilidad de tipo de vehículo, carrocería, necesidad de trampilla o limitaciones físicas de acceso.
El equipo de LS trabaja actualmente con un universo de 1.359 registros de restricciones de clientes en el archivo Excel 'Datos Maestro', de los cuales 1.317 están pre-filtrados para el análisis del mercado español. Este volumen evidencia la alta complejidad de la última milla y la necesidad de automatización en UNIGIS para gestionar estas restricciones de forma fiable y actualizada.
6.1 Tipos de Restricción Identificados

--- TABLE START ---
Tipo Restricción | Subtipo | Tipo Vehículo / Carrocería | Descripción / Ejemplo
Limitación Vehículo | Zona Peatonal | T3 | Solo puede acceder un vehículo de tipo T3
Limitación Vehículo | EST.ESTR. / CITA | T2 | Calles estrechas, requiere cita previa
Limitación Vehículo | Limitación carro | - | No se puede acceder con determinado tipo de carro
Limitación Vehículo | NO TRAILER | T3 | Prohibido trailer / semirremolque
Limitación Vehículo | ALT+BASC / NO TRAILER | T3 | Alternativa BASC, sin trailer
Limitación Vehículo | BASC+PP | T2 | Requiere BASC + Puerta de Plataforma
Limitación Vehículo | BASC+PP / CITA | T3 | BASC+PP y cita previa obligatoria
Limitación Carrocería | LONA | - | Solo acepta vehículo con carrocería de lona/cortinas
Limitación Carrocería | VEH. TRAMPILLA | - | Requiere vehículo con trampilla elevadora
Destinatario Incompatible | - | - | No puede coincidir con otro destinatario en la misma ruta
--- TABLE END ---

Figura: Excel Restricciones Domicilio Orden: Tabla de clientes con limitaciones por tipo de vehículo y carrocería
6.2 Lógica de Validación en UNIGIS
El proceso de Validación de Pedido en UNIGIS deberá consultar la tabla de restricciones del DomicilioOrden y comparar el tipo de vehículo asignado a la ruta con las restricciones configuradas. Si se detecta una incompatibilidad, el sistema deberá:
Bloquear la asignación del pedido a la ruta incorrecta (validación bloqueante).
Mostrar el motivo de rechazo en el campo DYN 'MensajesYErrores' del pedido.
Sugerir la tipología de vehículo compatible más próxima, si está configurada en el maestro.
📌 Nota: La configuración exacta de los campos DYN para restricciones de domicilio y la lista completa de validaciones bloqueantes vs. advertencias deben ser validadas con el equipo de LS en sesión adicional.
7. Conclusiones y Próximos Pasos
7.1 Conclusiones del Taller
Unificación ibérica: Las tipologías básicas de vehículo (T1 a T5) están alineadas entre España y Portugal, lo que simplifica la parametrización en UNIGIS. Las diferencias se concentran en los vehículos de gran tonelaje (T6 LinkTrailer y T7 Duo Trailer), donde Portugal tiene mayor uso y detalle.
Complejidad de restricciones de última milla: La existencia de más de 1.300 restricciones activas en la base de datos de clientes confirma la necesidad de una validación automática robusta en UNIGIS. La gestión manual de estas restricciones en el proceso actual es un riesgo operativo relevante.
Modelo TO-BE validado: El modelo organizativo de tres capas (Programación centralizada de órdenes, Planeamiento central de rutas, Planificación descentralizada de medios) fue validado por el equipo de LS como la estructura objetivo para la implantación.
Nuevos maestros requeridos: La sesión ha confirmado la necesidad de crear los maestros 'Tipo de Domicilio' y 'Tipo de Orden' en UNIGIS como prerequisito para la implementación de la visibilidad por perfil en OM y la automatización de restricciones.
7.2 Próximos Pasos
Completar el mapeo de Tipos de Jornada para cada Operación (archivo pendiente de LS).
Configurar en UNIGIS los nuevos maestros: Tipo de Domicilio y Tipo de Orden (R1, R2).
Definir la lógica de visibilidad de pedidos y campos DYN en OM por perfil (R3, R4).
Parametrizar la flota disponible por Operación + Tipo de Jornada en Planning (R5, R6).
Agendar reunión con Roberto, Ale y David para definición de flujos Multitramo Duran Freight (R7).
Agendar reunión con Luisa para validación de flujos Intermerk (R8).
Entregar listado de temas Multileg a Brenda para coordinación de implementación (R9).
Cargar el maestro completo de restricciones de domicilio (1.359 registros) en UNIGIS y configurar las reglas de validación automática.
Glosario
Carrocería: Tipo de estructura física del vehículo que determina las condiciones de temperatura y método de descarga (C=Cortinas, F=Frigorífica, I=Isotérmica, BI=Bi-Temperatura).
ClienteDador: Empresa que genera los pedidos de transporte y para la que LS presta el servicio logístico.
DomicilioOrden: Punto de entrega o recogida específico asociado a una orden de transporte.
Depósito: Almacén o base física desde la que salen los vehículos para las rutas de distribución.
Dispatch: Función operativa responsable de gestionar los cambios de vehículo, conductor o paradas durante la ejecución de un viaje en curso.
EAL: Ecosistema Aplicacional Logístico. Conjunto de sistemas integrados que gestionan el flujo de datos en la operación logística de LS.
Empresa: Primer nivel de la jerarquía UNIGIS. En este caso, Luís Simões a nivel de grupo.
Jornada / Tipo de Jornada: Combinación de ámbito geográfico y modalidad de transporte que define el tipo de operación planificable (ej. 'ES Madrid Local', 'PT Porto Larga Distancia').
LD: Equipo de Larga Distancia. Gestiona la subcontratación centralizada de vehículos para rutas nacionales/internacionales.
LO: Equipo Local. Gestiona la subcontratación descentralizada de vehículos para distribución local.
Multileg: Modalidad de transporte con múltiples tramos y vehículos interconectados para un mismo pedido.
Multitramo: Ruta compuesta por varios tramos secuenciales (con posibles transbordos) para llegar al destino final.
Operación: Tercer nivel de la jerarquía UNIGIS. Agrupa depósitos y equipos bajo un hub geográfico (ej. 'Nordeste Barcelona').
Orden: Instrucción de transporte generada a partir de un pedido. Una orden contiene las paradas, vehículo, conductor y tiempos de ejecución.
Parada: Punto de la ruta donde el vehículo debe realizar una entrega o recogida.
Pedido: Solicitud del cliente (ClienteDador) que origina una o varias órdenes de transporte en UNIGIS.
Planning: Módulo de UNIGIS encargado de la planificación de rutas, asignación de vehículos y optimización de la distribución.
Ruta: Agrupación de órdenes y paradas secuenciadas que conforman el trabajo de un vehículo en una jornada.
SID: Segmento de negocio específico (posiblemente cliente o división) con catálogo de vehículos propio dentro de la operación de LS.
Sucursal: Segundo nivel de la jerarquía UNIGIS. Agrupación de operaciones bajo una misma entidad legal o regional.
TMS: Transportation Management System. En este caso, UNIGIS TMS.
Tipo de Flota: Clasificación de la propiedad o relación contractual del vehículo (Propios / Dedicado / Eventual).
Tipo de Vehículo (Tipología): Categoría estandarizada de vehículo según capacidad en pallets, peso y volumen (T1 a T7).
Viaje: Instancia de ejecución de una ruta, con asignación definitiva de vehículo y conductor.
Anexo A.1 — Maestro Completo de Vehículos por País (ES / PT / SID)
La siguiente tabla consolida todos los tipos de vehículo parametrizables en UNIGIS para las operaciones de España (ES), Portugal (PT) y el segmento SID, con sus capacidades en pallets, peso y volumen:

--- TABLE START ---
País | Tipo Vehículo | Descripción | Nº Pallets | Peso Máx. (t) | Volumen M3 | Plataforma
ES | T1 | T1 | 6 | 1,34 | - | -
ES | T2 | T2 | 10 | 3,5 | 22 | -
ES | T3 | T3 | 18 | 6,5-9,5 | 45 | -
ES | T4 | T4 | 20 | 10-15 | 50 | -
ES | T5 | T5 | 33 | 24 | 85 | -
ES | T6 | LinkTrailer | 51 | 37 | - | -
ES | T7 | DUO Trailer | 66 | - | - | -
PT | T1 | T1 | 6 | 1,34 | - | -
PT | T2 | T2 | 10 | 3,5 | 22 | -
PT | T3 | T3 | 18 | 6,5-8,5 | 45 | -
PT | T4 | T4 | 20 | 10-15 | 50 | -
PT | T5 | T5 | 33 | 24 | - | -
PT | T6 | LinkTrailer | 51 | 37 | - | PLT
PT | T7 | DUO Trailer | 66 | 66 | - | -
SID | CP | COPACKING | 99 | 33 | 33000 | -
SID | DT5 | T5-Duplo Deck Frío | 33 | 5 | 15 | 1050
SID | FR1 | Fundição | 5 | 5 | 16 | 1050
SID | T1 | T1-FRIO | 5 | 5 | 13 | 1050
SID | T2 | T2-FRIO | 12 | 10 | 22 | 5000
SID | T3 | T3-FRIO | 18 | 12 | 32 | 10000
SID | T4 | T4-FRIO | 20 | 18 | 45 | 15000
SID | T5 | T5-FRIO | 33 | 33 | 85 | 24000
SID | TPL | Plataformas | 100 | 240 | 100000 | -
--- TABLE END ---

📌 Nota: Los valores de Volumen M3 y Plataforma del segmento SID son los configurados actualmente en el sistema de origen y deben ser validados con el equipo de operaciones antes de su carga definitiva en UNIGIS.