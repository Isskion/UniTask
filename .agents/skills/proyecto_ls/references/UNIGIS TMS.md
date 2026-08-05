
--- TABLE START ---
UNIGIS TMS / Luis Simoes Logística Iberia (LS)
--- TABLE END ---

Módulo de Contratos
Documento Monográfico — Diseño de Solución
Versión 1.0  ·  Junio 2026  ·  Confidencial

--- TABLE START ---
Campo | Valor
Cliente | Luis Simoes Logística Iberia (LS)
Proyecto | Implantación UNIGIS TMS — Fase 2
Módulo | Contratos — Fleet
Versión | 1.0
Fecha | Junio 2026
Confidencialidad | Uso interno UNIGIS + Luis Simoes
--- TABLE END ---

1. Introducción
El módulo de Contratos de UNIGIS TMS es el eje central que conecta al cliente dador, el pedido, la tarifación y la facturación. Sin contrato activo, un pedido no puede avanzar en el flujo operativo. Esta interdependencia no es una restricción técnica: es la garantía de que cada servicio queda trazado, tarifado y facturado bajo las condiciones comerciales acordadas con el cliente.
Luis Simoes Logística Iberia (LS) es un operador logístico ibérico de referencia con más de 75 años de historia, con operaciones en España y Portugal organizadas en dos sucursales (LSLI-ES y LSLI-PT) y seis operaciones territoriales (NW Porto, SW Lisboa, NEB Barcelona, NEV Valencia, CN Madrid, S Sevilla). Su modelo operativo combina distribución capilar desde COLs propios, transporte de larga distancia entre delegaciones (arrastre), logística integrada para clientes externos y delegaciones ajenas para el último kilómetro.
Este documento describe el diseño funcional del módulo de Contratos para la Fase 2 de la implantación de UNIGIS TMS en LS. Cubre los tipos de contrato, las reglas de negocio que los rigen, el ciclo de vida completo desde la creación hasta la liquidación, y los puntos abiertos que requieren definición antes del go-live.
2. Tipos de Contrato
UNIGIS TMS maneja dos grandes familias de contratos, con propósitos y entidades vinculantes distintos:

--- TABLE START ---
Tipo de Contrato | Con quién | Propósito | Creación
Contrato de Venta de Transporte | Cliente dador | Regula la tarificación de ventas y la facturación al cliente. Define tarifas, condiciones comerciales y vigencia. | Manual en TMS o automático vía interfaz ERP/EAL
Contrato Operacional de Transportista | Transportista (subcontratado) | Regula la liquidación de costes al transportista. Vinculado a la asignación de medios del viaje. | Manual en TMS o automático vía interfaz de proveedores
--- TABLE END ---

2.1 Contratos de Venta de Transporte (Cliente Dador)
Son los contratos que regulan la relación comercial entre LS y sus clientes dadores. Contienen las tarifas que se aplicarán a los pedidos del cliente, la vigencia y las condiciones de aglutinación. Un cliente puede tener múltiples contratos vigentes simultáneamente (por ejemplo, un contrato para un tipo de servicio y otro para otro ámbito).
2.2 Contratos por Tipo de Flota
En LS, los contratos operacionales con transportistas se clasifican según el tipo de flota al que aplican. El tipo de flota describe la relación contractual entre LS y el transportista, no el tipo de servicio que se ejecuta. La flota Dedicada, por ejemplo, es aquella que trabaja en exclusividad para LS —no presta servicio a otros clientes—, pero puede realizar cualquier tipo de servicio que LS le asigne: distribución local, larga distancia, grupaje (LTL), arrastre, etc.

--- TABLE START ---
Tipo de Flota | Descripción | Servicios que puede realizar | Aglutinación típica
Propio | Vehículos propiedad de LS. Operan bajo gestión directa de LS con máxima flexibilidad operacional. | Local, larga distancia, LTL, arrastre, recogida | Configurable
Dedicado | Flota de un transportista que trabaja en exclusividad para LS. No presta servicio a otros clientes. El ámbito de servicio lo define el contrato: puede incluir distribución local, LTL, larga distancia, arrastre o cualquier combinación. | Local, LTL, larga distancia, arrastre. Definido en el contrato. | Configurable (SI para LTL)
Eventual | Transportista subcontratado de forma puntual para cubrir necesidades específicas. Sin exclusividad. Se contrata por viaje o por período limitado. | Principalmente spot: viajes puntuales según necesidad | SI
--- TABLE END ---


--- TABLE START ---
ℹ  La columna "Aglutinación" indica el valor típico del campo en el contrato. Con SI, pedidos de diferentes contratos del mismo cliente pueden compartir viaje. Con NO, cada contrato genera su propio viaje. Esta regla también aplica a la facturación: un viaje nunca mezcla contratos distintos en la misma guía. / Nota: El tipo de flota (Propio/Dedicado/Eventual) es un atributo del contrato operacional con el transportista, no del pedido ni del cliente dador. Un mismo cliente dador puede tener servicios atendidos por los tres tipos de flota según la operación.
--- TABLE END ---

2.3 Campos Principales de los Contratos
A continuación se detallan los campos de gestión operacional que componen cada tipo de contrato en UNIGIS TMS para LS. Se distinguen los campos del contrato de cliente dador (venta) y los del contrato de transporte (coste operacional con el transportista).
Contrato de Cliente Dador — Campos de Gestión Operacional

--- TABLE START ---
Campo | Descripción / Uso Operacional
Código del contrato | Identificador del contrato. Campo obligatorio y bloqueante en el pedido.
Tipo de contrato | Modelo operativo del contrato con el cliente. Define las reglas de servicio y tarifación aplicables.
Fechas de validez | Período de vigencia del contrato (fecha de inicio y fecha de fin). Fuera de este rango, el contrato no acepta nuevos pedidos.
Nivel de servicio contratado | SLA acordado con el cliente: plazos de entrega, tipos de servicio incluidos, compromisos operativos y penalizaciones aplicables.
Tablas de precios | Referencia a las tarifas de venta acordadas con el cliente. Al menos una tabla activa y vigente es obligatoria para que el contrato pueda tarificar.
Código de conexión con ERP | Código de integración con el sistema ERP de LS. Clave para la sincronización bidireccional a través del EAL/MiddleWare.
Cuenta de venta asociada | Cuenta contable de venta en el ERP de LS utilizada para la facturación del servicio al cliente dador.
Criterios de agrupación | Reglas de aglutinación para la tarificación: determina si pedidos de este contrato pueden agruparse con otros contratos del mismo cliente en un viaje compartido (campo SI/NO). Ver sección 3.1.
Responsable LS | Persona responsable en Luis Simoes de la gestión y seguimiento de este contrato. Punto de contacto para renovaciones, incidencias y cambios de condiciones.
Centro | Centro Operativo Logístico (COL/delegación) de LS al que pertenece el cliente dador. Determina el ámbito territorial de gestión del contrato.
--- TABLE END ---

Contrato de Transporte — Campos de Gestión Operacional

--- TABLE START ---
Campo | Descripción / Uso Operacional
Código del contrato | Identificador del contrato. Campo obligatorio y bloqueante en el pedido.
Fecha de validez | Período de vigencia del contrato operacional con el transportista. Fuera de este rango, el transportista no puede recibir asignaciones bajo este contrato.
Centro | Centro Operativo Logístico (COL/delegación) de LS al que pertenece este contrato de transporte. Delimita el ámbito territorial de operación del transportista.
Tipo de flota | Tipo de flota al que pertenece el transportista bajo este contrato: Dedicado (exclusividad para LS) o Eventual (contratación puntual). Ver sección 2.2.
Nivel de servicio contratado | SLA pactado con el transportista: tipos de servicio, disponibilidad, cobertura geográfica y compromisos de ejecución.
Tabla de tarificación de costes | Referencia a la tabla de tarifas contratada con el transportista para la liquidación de costes. Al menos una tabla activa es obligatoria para tarificar el viaje.
Código ERP asociado | Código de integración con el ERP de LS. Permite la sincronización del contrato y los costes entre UNIGIS TMS y el sistema de gestión financiera de LS.
Cuenta de costes (ERP) | Cuenta contable de costes en el ERP de LS utilizada para la contabilización de los pagos al transportista al liquidar el viaje.
Criterios de tarificación | Variables de cálculo aplicables al contrato de transporte: por KM recorrido, por jornada, por viaje completo, por peso/volumen, o combinación de varios. Determina la base del cálculo de costes en la Guía de Coste.
--- TABLE END ---

3. Reglas de Negocio
Las siguientes reglas rigen el comportamiento del módulo de contratos y no admiten excepciones en el diseño estándar de UNIGIS. Cualquier desviación requiere desarrollo a medida o workaround documentado.

--- TABLE START ---
# | Regla | Descripción | Impacto
R1 | Cardinalidad cliente-contrato | Un cliente puede tener múltiples contratos vigentes simultáneamente. | Permite diferentes tarifas por tipo de servicio o período.
R2 | Unicidad pedido-contrato (1:1) | Un pedido pertenece siempre a un único contrato. No puede cambiar de contrato una vez asignado. | Garantiza trazabilidad y unicidad en la tarifación.
R3 | Bloqueo sin contrato | Sin número de contrato, el pedido queda BLOQUEADO y no puede avanzar al flujo de programación. Alarma configurada en UNIGIS. | Bloqueo crítico. El pedido no llega al planificador.
R4 | Tarifas vinculadas al contrato | No puede tarificarse un pedido o viaje si el contrato asociado no tiene tarifas activas y vigentes. | Prerequisito de tarificación. Bloqueo en el proceso de cálculo.
R5 | Separación en liquidación | La liquidación siempre genera una factura por contrato. No se pueden mezclar contratos en una misma factura. GAP G17. | Obligatorio. Afecta al proceso de facturación al cliente.
R6 | Vigencia del contrato | Un contrato vencido no puede recibir nuevos pedidos. Los pedidos existentes conservan el contrato hasta liquidación. | Requiere gestión activa de renovaciones antes del vencimiento.
--- TABLE END ---

3.1 Campo de Aglutinación — Comportamiento según configuración
El campo de aglutinación es un indicador SI/NO en el contrato que controla si pedidos de contratos distintos del mismo cliente pueden compartir viaje. Su impacto se extiende desde la planificación hasta la facturación:

--- TABLE START ---
Aspecto | Aglutinación = SI | Aglutinación = NO
Planificación | Pedidos de diferentes contratos pueden asignarse al mismo viaje/ruta. | Cada contrato genera su propio viaje. No se mezclan en planificación.
Tarificación | Cada pedido tarifica según su contrato, aunque compartan viaje. | Tarificación aislada por contrato. No hay impacto cruzado entre contratos.
Liquidación / Factura | Se emite una factura por contrato, aunque los pedidos hayan ido en el mismo viaje. | Ídem. La separación de facturas por contrato es siempre obligatoria.
Caso de uso típico LS | LTL (grupaje), servicios eventuales con múltiples contratos del mismo cliente. | Contratos de flota dedicada con exclusividad de ruta o vehículo.
--- TABLE END ---

4. Variables de Cálculo del Contrato
Las tarifas vinculadas a un contrato se calculan en función de un conjunto de variables que el sistema combina para determinar el importe de venta o el coste del servicio. Para LS, las variables base son: cliente dador, origen (COL de salida), destino (COL de llegada o zona de entrega) y volúmenes (peso, bultos, pallets).

--- TABLE START ---
Variable | Descripción | Aplica a | Notas
Cliente dador | El contrato define qué cliente dador es el titular. La tarifa es específica para ese cliente. | Venta | Obligatorio
Origen / Destino (COL) | Origen = COL de salida. Destino = COL de llegada o zona de entrega. Puede ser por zona, código postal, municipio o provincia. | Venta / Coste | Configurable por tipo de tarifa
Tipo de flota | Propio/Dedicado/Eventual. Puede condicionar la tarifa aplicable dentro de un mismo contrato. | Coste | Ligado al tipo de contrato operacional
Unidad de medida | La tarifa puede calcularse por kg, palé, bulto, m³, km, jornada o por viaje. La unidad define la base del cálculo. | Ambos | Puede haber mínimos por unidad
Suplementos y extras | Los contratos pueden incluir suplementos automáticos: combustible, peajes, ferry, gestión documental, paralizaciones ES/PT, etc. | Ambos | Se suman al importe base. GAP G24 para paralizaciones ES vs PT.
Vigencia | Fechas de inicio y fin del contrato. Fuera del período de vigencia, el contrato no puede recibir pedidos ni tarificar. | Ambos | Requiere renovación activa
--- TABLE END ---

5. Ciclo de Vida del Contrato
El ciclo de vida del contrato abarca desde su creación en el sistema hasta el cierre por liquidación o vencimiento. El diagrama siguiente muestra los pasos principales y las entidades involucradas en cada fase.
Figura 1 — Ciclo de vida del contrato en UNIGIS TMS
5.1 Descripción del flujo
El proceso comienza con la creación del contrato, ya sea de forma manual por un usuario de backoffice UNIGIS o de forma automática a través de la interfaz EAL con el ERP de LS. Una vez activo y con tarifas vigentes, el contrato está disponible para recibir pedidos.
La asignación del contrato al pedido ocurre en el momento de la creación del pedido: llega ya vinculado a un contrato desde el EAL/MiddleWare, o bien UNIGIS aplica una regla de asociación automática. Este es el punto de decisión más crítico del módulo (ver sección 8).
El viaje asociado al pedido hereda el contrato de éste. En la asignación de medios al viaje, el transportista recibe el contrato operacional (Propio/Dedicado/Eventual) y se le notifica automáticamente el Contrato de Transporte / Orden de Carga. Al cierre del viaje o del pedido, el sistema lanza la tarificación sobre el contrato vigente y genera la guía de venta o coste correspondiente. La liquidación final emite una factura por contrato.
6. Herencia del Contrato entre Entidades
Una vez asignado al pedido, el contrato se propaga automáticamente a todas las entidades operativas vinculadas. Esta herencia es automática e inmutable: no se puede cambiar el contrato de una entidad derivada sin modificar la entidad raíz.
El flujo sigue una cadena vertical: el Contrato se asigna al Pedido → el Pedido genera el Viaje → del Viaje heredan el Transportista (que recibe el contrato operacional en la asignación de medios) y la Guía de Coste. La Guía de Venta hereda del Pedido. La liquidación consume ambas guías y emite una factura por contrato.
Figura 2 — Propagación del contrato entre entidades de UNIGIS TMS

--- TABLE START ---
Entidad | Origen del contrato | ¿Puede cambiarse? | Notas
Pedido | Asignado en la creación (interfaz EAL o regla UNIGIS) | No, una vez fijado | Punto crítico. Sin contrato → BLOQUEADO. Campo obligatorio y bloqueante.
Viaje | Hereda del pedido que origina el viaje | No | El viaje es el portador del contrato operacional hacia el transportista.
Transportista | Hereda del viaje en la asignación de medios | No | El contrato operacional se activa al asignar el transportista al viaje. Se notifica automáticamente (Contrato de Transporte / Orden de Carga).
Guía de Venta | Hereda del pedido | No | Base de la liquidación al cliente dador. Una guía = un contrato (separación obligatoria).
Guía de Coste | Hereda del viaje | No | Base de la liquidación al transportista. GAP G17: separación de liquidaciones por contrato (Sprint +3).
--- TABLE END ---

7. Creación y Mantenimiento de Contratos
Los contratos pueden crearse y mantenerse mediante dos mecanismos no excluyentes. La elección depende del nivel de integración disponible con los sistemas de LS:

--- TABLE START ---
Mecanismo | Descripción | Responsable | Ventajas
Manual en UNIGIS TMS | El usuario de backoffice crea el contrato directamente en la pantalla de contratos del TMS. Introduce datos maestros, condiciones y tarifas. | Backoffice UNIGIS | Control total. Sin dependencia de integración.
Vía Interfaz EAL (ERP LS) | El contrato se crea o actualiza automáticamente desde el ERP de LS a través del EAL/MiddleWare. El TMS recibe el objeto contrato y lo registra. | Sistema ERP LS | Automático. Sin doble entrada de datos. Reduce errores.
--- TABLE END ---

7.1 Acciones post-creación en UNIGIS
Independientemente de cómo se haya creado el contrato, el equipo UNIGIS debe verificar y completar los siguientes puntos antes de que el contrato esté operativo:

--- TABLE START ---
# | Acción | Responsable | Obligatorio | Notas
1 | Verificar datos maestros del cliente dador | Backoffice | SÍ | Nombre, CIF, dirección de facturación.
2 | Vincular tarifas al contrato | Backoffice | SÍ | Sin tarifas activas, el contrato no puede tarificar.
3 | Configurar vigencia (fecha inicio / fin) | Backoffice | SÍ | Fuera de vigencia → no recibe pedidos.
4 | Definir campo de aglutinación (SI/NO) | Backoffice | SÍ | Impacta planificación y facturación.
5 | Asignar tipo de flota (Propio/Dedicado/Eventual) | Backoffice | SÍ | Determina la lógica de planificación y asignación de medios.
6 | Activar el contrato en el sistema | Backoffice | SÍ | Un contrato en estado borrador no acepta pedidos.
7 | Prueba con pedido de test | Consultor UNIGIS | Recomendado | Verificar asignación automática y tarificación.
--- TABLE END ---

8. Asignación del Contrato al Pedido y al Viaje
La asignación del contrato es el momento más crítico del módulo. Determina bajo qué condiciones comerciales se prestará el servicio y cómo se tarifará. El diseño de este mecanismo debe quedar cerrado antes del go-live.
8.1 Mecanismos de asignación

--- TABLE START ---
Mecanismo | Cómo funciona | Cuándo usarlo
Asignación por interfaz (EAL → UNIGIS) | El pedido llega desde el ERP de LS con el número de contrato ya incluido en el payload de la interfaz CrearOrdenesPedido. UNIGIS registra el contrato sin necesidad de lógica de búsqueda. | Cuando el ERP de LS gestiona la vinculación cliente-contrato y puede enviarla en la creación del pedido. Mecanismo preferido.
Asignación por regla en UNIGIS | El pedido entra sin número de contrato. UNIGIS aplica una regla de asociación automática: busca el contrato activo que corresponde al cliente dador, al tipo de pedido y a la fecha de creación. | Contingencia si el ERP no envía el contrato en la interfaz. Requiere que no haya ambigüedad (un solo contrato activo elegible por cliente).
--- TABLE END ---

8.2 Asignación al Viaje y al Transportista
El viaje hereda el contrato de venta del pedido principal asociado. Para los contratos operacionales con transportistas (Propio/Dedicado/Eventual), la asignación se produce en la asignación de medios al viaje: cuando se asigna un transportista al viaje, UNIGIS activa el contrato operacional correspondiente y lo vincula al viaje. En ese momento se genera y envía automáticamente el Contrato de Transporte / Orden de Carga al transportista (1ª notificación). Si se cancela el viaje y se reasigna a otro transportista, se envía una notificación de cancelación al primero y el nuevo contrato al segundo.

--- TABLE START ---
📌  Punto pendiente de definición / ❓ Punto abierto (§4.10 Documento de Alcance LS): ¿El contrato llega asignado al pedido desde el EAL/MiddleWare, o hay que crear reglas en UNIGIS para asociarlo automáticamente? / Diseño provisional acordado: el pedido traerá definido su número de contrato en el payload de la interfaz de creación (campo "Contrato" en EAL → UNIGIS). El campo está recogido como obligatorio y bloqueante en el Documento de Alcance. El viaje hereda del pedido. El transportista y las guías heredan del viaje. / Acción requerida: confirmar con el equipo de integración de LS (André Santos / Anny Bastos) que el campo de contrato estará disponible en el payload CrearOrdenesPedido antes de la integración del módulo Fleet. Si no está disponible en la primera fase, se activará la regla de asociación en UNIGIS como contingencia. GAP G27 (tarifación multi-contrato) pendiente de confirmar con LS.
--- TABLE END ---

9. Tarificación y Liquidación sobre el Contrato
La tarificación en UNIGIS es el proceso por el cual el sistema calcula los importes de venta (a clientes) y de coste (a transportistas) aplicando las tarifas vinculadas al contrato. La liquidación agrupa estos cálculos y genera las guías que alimentan la facturación.

--- TABLE START ---
Proceso | Entidad base | Contrato involucrado | Momento de cálculo | Output
Tarificación de Venta | Pedido | Contrato de venta del cliente dador | Al finalizar el pedido (PEDIDO FINALIZADO) | Guía de Venta
Tarificación de Coste | Viaje | Contrato operacional del transportista | Al finalizar el viaje (VIAJE TERMINADO) | Guía de Coste
Liquidación | Guías de venta/coste | Contrato de referencia en cada guía | Proceso periódico (semanal/mensual) | Factura por contrato
--- TABLE END ---


--- TABLE START ---
ℹ  Nota sobre momentos de tarificación: Es posible tarificar en momentos anteriores (al confirmar el pedido, al crear el viaje). Sin embargo, para el diseño de LS se recomienda tarificar al finalizar los pedidos y viajes para disponer de todos los datos reales y evitar retarificaciones. Si se necesita forecast de importes antes del cierre, se puede activar una tarificación provisional al confirmar el pedido o al activar el viaje, asumiendo que deberá recalcularse al finalizar.
--- TABLE END ---

10. Configuración en la Aplicación
La siguiente tabla resume los campos de configuración más relevantes del módulo de contratos en UNIGIS TMS, con los valores esperados para LS:

--- TABLE START ---
Campo UNIGIS | Descripción funcional | Valor / Configuración LS
NumeroContrato | Identificador único del contrato en UNIGIS. Coincide con el número de contrato del ERP de LS. | Obligatorio y bloqueante en el pedido. Llega vía interfaz EAL. Formato a confirmar con equipo LS.
ClienteDadorContrato | Vincula el contrato a un cliente dador maestro en UNIGIS. | Clave del cliente dador en UNIGIS. Sincronizado desde ERP LS vía EAL.
TipoContrato | Tipo de contrato: venta al cliente dador, operacional con transportista. | VENTA_TRANSPORTE / OPERACIONAL (a configurar en UNIGIS).
TipoFlota | Tipo de flota al que aplica el contrato operacional. Ver sección 2.2. | PROPIO / DEDICADO / EVENTUAL (según §4.4 Documento de Alcance LS).
FechaInicio / FechaFin | Vigencia del contrato. Fuera de este rango, el contrato no acepta pedidos. | Pendiente provisión maestro de contratos por LS (acción L2, Junio 2026).
Aglutinacion (SI/NO) | Controla si pedidos de contratos distintos pueden compartir viaje. Ver sección 3.1. | Eventual → SI típico. Dedicado/Propio → Configurable según acuerdo comercial.
Estado contrato | BORRADOR / ACTIVO / SUSPENDIDO / VENCIDO / CERRADO. | Solo ACTIVO puede recibir pedidos.
TarifasVinculadas | Lista de tarifas activas asociadas al contrato. Al menos una tarifa activa obligatoria para tarificar. | Pendiente provisión de maestro de tarifas en formato acordado (acción L2, Junio 2026).
--- TABLE END ---

11. GAPs relacionados con el Módulo de Contratos
Los siguientes GAPs del Documento de Alcance afectan directamente al módulo de contratos y deben quedar resueltos antes del go-live del módulo Fleet:

--- TABLE START ---
# | Descripción | Tipo | Prioridad | Sprint | Estado
G17 | Separación de liquidaciones por contrato. Una factura independiente por contrato, sin mezclar contratos en la misma guía. | Desarrollo | Alta | Sprint +3 | Planificado
G22 | Guía adicional por límite de KM mensual en flota dedicada. Cuando se superan los KM contractuales, generación automática de guía adicional. | Desarrollo | Media | TBD | Pendiente
G27 | Tarifación multi-contrato: posibilidad de que un pedido afecte a más de un contrato en la tarificación (pendiente de confirmar caso de uso con LS). | Análisis | TBD | TBD | Pendiente LS
--- TABLE END ---

Glosario

--- TABLE START ---
Término | Definición en UNIGIS TMS
Contrato | Entidad central que vincula un cliente dador con las condiciones comerciales (tarifas, vigencia, flota) bajo las que se prestan los servicios de transporte.
Cliente Dador | Empresa que encarga el transporte a LS. Es el titular del contrato de venta y a quien se factura el servicio.
Pedido | Solicitud de transporte en UNIGIS. Tiene un único contrato de venta asignado (1:1). Sin contrato, el pedido queda bloqueado.
Viaje | Entidad operativa que agrupa uno o más pedidos en un desplazamiento físico con un vehículo y conductor. Hereda el contrato del pedido principal.
Aglutinación | Campo SI/NO del contrato que controla si pedidos de diferentes contratos pueden compartir viaje. Impacta planificación y facturación.
Tarificación | Proceso por el que UNIGIS calcula los importes de venta (guía de venta) o de coste (guía de coste) aplicando las tarifas del contrato.
Guía de Venta | Documento interno UNIGIS que recoge los importes de venta calculados para un pedido sobre su contrato. Base de la factura al cliente dador.
Guía de Coste | Documento interno UNIGIS que recoge los importes de coste calculados para un viaje sobre el contrato operacional del transportista.
Liquidación | Proceso de agrupación de guías de venta o coste para generar las facturas correspondientes. Una factura por contrato (separación obligatoria).
EAL / MiddleWare | Capa de integración entre el ERP de LS y UNIGIS TMS. Transforma, enruta y gestiona los mensajes bidireccionales entre sistemas.
COL | Centro Operativo Logístico. Delegación de LS desde la que se gestiona la distribución capilar y el arrastre a nivel regional.
Flota Propia | Vehículos propiedad de LS. Máxima flexibilidad operacional. Puede realizar cualquier tipo de servicio.
Flota Dedicada | Flota de un transportista que trabaja en exclusividad para LS. No presta servicio a otros clientes. Puede realizar cualquier tipo de servicio que LS le asigne (local, LTL, larga distancia, arrastre, etc.).
Flota Eventual | Transportista subcontratado puntualmente. Sin exclusividad para LS. Se contrata por viaje o período limitado para cubrir necesidades específicas.
--- TABLE END ---

UNIGIS TMS · Módulo de Contratos
Luis Simoes Logística Iberia (LS)  ·  Versión 1.0  ·  Junio 2026
Documento confidencial de uso interno UNIGIS + cliente