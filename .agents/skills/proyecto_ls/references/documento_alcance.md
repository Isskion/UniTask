LUIS SIMÕES
Proyecto de Implantación UNIGIS TMS — DOCUMENTO DE ALCANCE CONSOLIDADO — FASE 2
Versión 3 — Junio 2026  |  Documento Confidencial — Para uso interno UNIGIS / Luis Simões
Control del Documento
Lista de distribución

--- TABLE START ---
Área | Nombre | Cargo / Rol | Datos de contacto
LUIS SIMOES | Luis Miguel Freitas | Sponsor | luis.freitas@luis-simoes.com
LUIS SIMOES | Antonio Fernandes | Director Proyecto | antonio.fernandes@luis-simoes.com
LUIS SIMOES | André Santos | Gerencia Proyecto LS | andre.guedelha.santos@luis-simoes.com
LUIS SIMOES | Alberto Mangas | PMO | alberto.santana@luis-simoes.com
LUIS SIMOES | Paulo Cruz | Project Manager | paulo.cruz@luis-simoes.com
LUIS SIMOES | Vitor Silva | Líder Funcional | vitor.silva@luis-simoes.com
LUIS SIMOES | Anny Bastos | Líder Técnico | anny.bastos@luis-simoes.com
LUIS SIMOES | Filipa Pereira | Consultor Técnico | filipa.pereira@luis-simoes.com
LUIS SIMOES | Joana Ferreira | Consultor Técnico | joana.ferreira@luis-simoes.com
LUIS SIMOES | Claudia Oliveira | Stream Leader | claudia.oliveira@luis-simoes.com
LUIS SIMOES | Miguel Sousa | Stream Leader | miguel.sousa@luis-simoes.com
LUIS SIMOES | Veronica Perez | Stream Leader | veronica.manzanero@luis-simoes.com
LUIS SIMOES | Selene Kleczar | Stream Leader | selene.garcia@luis-simoes.com
LUIS SIMOES | Tiago Silva | Stream Leader | tiago.silva@luis-simoes.com
LUIS SIMOES | Valentin Balaban | Stream Leader | valentin.balaban@luis-simoes.com
UNIGIS | Javier Martínez | Sponsor | javier.martinez@unigis.com
UNIGIS | Jorge Sureda | Gerente Proyecto | jorge.sureda@unigis.com
UNIGIS | Diego Senra | Project Manager | diego.senra@unigis.com
UNIGIS | Gonzalo Castro | Líder Proyecto | gonzalo.castro@unigis.com
--- TABLE END ---

Historial de Revisiones

--- TABLE START ---
Versión | Fecha | Secciones Revisadas | Descripción
1 | 09/03/2026 | Creación de documento | Creación del documento base (Documento Maestro)
2 | Junio 2026 | Todas | Versión consolidada: integración de Consolidado Tarifas + Programación TMS
--- TABLE END ---

📌  Versión 3 — Junio 2026: reestructuración según anotaciones de producto.
Aprobación

--- TABLE START ---
Nombre | Rol | Fecha | Firma
Luis Miguel Freitas | Sponsor Luis Simoes |  | 
André Santos | Gerencia Proyecto LS |  | 
Antonio Fernandes | Director Proyecto LS |  | 
Paulo Cruz | PM Luis Simoes |  | 
Vitor Silva | Líder Funcional LS |  | 
Anny Bastos | Líder Técnico LS |  | 
Javier Martínez | Sponsor UNIGIS |  | 
Jorge Sureda | Gerente Proyecto  |  | 
Diego Senra | PM UNIGIS |  | 
Gonzalo Castro | Líder Proyecto UNIGIS |  | 
--- TABLE END ---

1. INTRODUCCIÓN
Razón social: Luis Simões Iberia (España y Portugal)  |  Proyecto: Implantación UNIGIS TMS – Fase 2  |  Ámbito geográfico: España + Portugal (Iberia) 
Luis Simões (LS) es un operador logístico ibérico de referencia que gestiona transporte, distribución, almacenaje y logística integrada a través de una red propia de Centros de Operaciones Logísticas (COL) en España y Portugal.
Líneas de negocio en el alcance:
Distribución capilar: Entregas de último kilómetro desde delegaciones propias (COL).
Transporte de arrastre: Larga distancia peninsular inter-delegaciones.
Logística de terceros: Almacenamiento + distribución y servicios de crossdock/consolidación.
Flujos especiales: Entregas vía delegaciones ajenas y logística de retornos/devoluciones.
2. OBJETIVOS DEL PROYECTO
Los objetivos de la Fase 2 del proyecto UNIGIS TMS en Luis Simões son:
Aumento da eficiencia – secuencia optima de entregas y asignación de recursos que minimiza el coste y maximiza nivel servicio al cliente. ​
Mejora del servicio y información al cliente.​
Automatizar y optimizar el planeamiento y asignación de medios.​
Automatizar y controlo de la tarificación de ventas (a clientes) y Costes (Proveedores)​
Acceso rápido, sencillo y con alarmistas a la información del día a día para la toma de decisiones.
Fuente: [Combinado]
3. ESTRUCTURA
3.1 Empresa
Empresa es la entidad raíz organizativa que actúa como contenedor jerárquico de toda la operación logística. Representa a la organización (o unidad de negocio) bajo la cual se configuran y agrupan el resto de las entidades 
Organizacionales:
Sucursal 
Operación
y Operativas
Deposito
Vehículos
Conductores…
3.2 Sucursales
La Sucursal es una subdivisión operativa de la Empresa que representa una sede con identidad propia dentro de la jerarquía organizativa. Actúa como un nivel intermedio entre la Empresa y las entidades operativas (depósitos, vehículos, usuarios), permitiendo segmentar la operación logística por zona geográfica
Luis Simões opera con dos sucursales en UNIGIS TMS: LSLI – ES y LSLI - PT.
3.3 Operaciones
La operación es una subdivisión operativa de las sucursales, que representa una zona geográfica y que contiene uno o varios depósitos. Se le pueden atribuir otros maestros tales como usuarios, vehículos, conductores….

--- TABLE START ---
Empresa | Sucursal | Operación | Ubicaciones
Luis Simoes Logistica | LSLI - PT | NW (Noroeste Porto) | Porto, Coimbra, Vila Real, Braga
Luis Simoes Logistica | LSLI - PT | SW (Sudoeste Lisboa) | Carregado, Algoz
Luis Simoes Logistica | LSLI – ES | NEB (Nordeste Barcelona) | Barcelona
Luis Simoes Logistica | LSLI – ES | NEV (Nordeste Valencia) | Valencia
Luis Simoes Logistica | LSLI – ES | CN (Centro Norte Madrid) | Madrid, Guadalajara, Centralidad
Luis Simoes Logistica | LSLI – ES | S (Sur Sevilla) | Sevilla
--- TABLE END ---

4. DATOS MAESTROS
Los Maestros son el conjunto de entidades de configuración estática que definen el marco sobre el cual opera el sistema. Representan los datos de referencia que no cambian en el día a día de la operación pero que condicionan todo el comportamiento logístico: sin ellos, el sistema no puede completar, validar ni planificar ningún pedido o ruta.
4.1 Depósitos (Dbo.Deposito)
El Depósito es la entidad que representa una instalación física desde la que se origina o hacia la que se dirige el transporte. Puede corresponder a un almacén propio (COL - Centro de Operaciones Logísticas) o una delegación ajena, y su rol en la operativa determina cómo el sistema lo utiliza: como punto de salida de rutas, como destino final de una entrega o como nodo de tránsito en operativas de Crossdock.
Cada depósito tiene asociada un área de influencia geográfica que el sistema emplea para asignarlo automáticamente a los pedidos según el código postal del destino, garantizando que cada envío salga siempre desde la instalación más adecuada.
Tipología de depósitos (se utiliza en el flujo de programación de pedidos):
Tipo de depósito Propio
Tipo de depósito Ajeno
Los depósitos se crearán en TMS desde EAL.

--- TABLE START ---
Código depósito | refdepositoexterno | C
Nombre depósito | descripcion | CARREGADO
Tipo depósito  | idtipodeposito | 3 (propio)
Dirección | direccion | Estrada Quinta dos Conegos, nº 2
Localidad | localidad | Carregado
CP | codigopostal | 2584-908
Concelho | partido | Carregado
Provincia | provincia | Lisboa
País | pais | Portugal
Latitud | latitud | 39,031285
longitud | longitud | -8,96597
Inicio horario | iniciohorario | 0
Fin horario | finhorario | 2359
Permite Fiscal | integrarfiscal | 1
--- TABLE END ---

→  Ver Anexo -- Añadir el anexo de depósitos, cuando se haya completado
4.2 Clientes (Cliente Dador) (Dbo.Cliente)
El Cliente Dador es la entidad que representa a la empresa o persona que origina el pedido de transporte, es decir, quien encarga el servicio logístico. Los clientes dadores se reciben en TMS vía EAL, desde el ERP. 

--- TABLE START ---
Código  | referenciaexterna | 9999
Codigo adicional | referenciaadicional | 1111
Nombre  | razonsocial | Clientedador
Estado | IdEstado | Activo
CIF | cuit | ES-A09999999
Dirección | direccion | Test
Localidad | localidad | BARCELONA
CP | codigopostal | NULL
Concelho | partido | NULL
Provincia | provincia | NULL
País | pais | NULL
Telefono 1 | telefono1 | NULL
Telefono2 | telefono2 | NULL
Mail | emailgestordeflota | NULL
--- TABLE END ---

4.3 ClienteOrden (Dbo.ClienteOrden) y DomicilioOrden (Dbo.DomicilioOrden)
Estas entidades se crearán junto con el pedido mediante interfase vía EAL. También será posible actualizar los registros en TMS informando a EAL para alinear la información.
4.3.1 ClienteOrden
Es una agrupación de destinatarios, que permite hacer analíticas por esta entidad.

--- TABLE START ---
Código de Cliente orden | refclienteexterna | 99999
Nombre | razonsocial | Prueba
Contacto | contacto | NULL
telefono | telefono | 
dirección | direccion | prueba
localidad | localidad | NULL
codigopostal | codigopostal | NULL
partido | partido | NULL
provincia | provincia | FARO
país | pais | PT
Clasificación de clienteorden | varchar1 | TOP
--- TABLE END ---

4.3.2 DomicilioOrden
DomicilioOrden es la entidad, asociado a un ClienteOrden, que recoge la dirección física asociada a un pedido concreto de entrega o recogida. Además, es el espacio donde definir restricciones, ventanas horarias, geolocalización…

--- TABLE START ---
Codigo destinatario / Deposito | refdomicilioexterno | 99999
Cliente orden asociado | idclienteorden | 41
Nombre | descripcion | test
direccion | direccion | prueba
localidad | localidad | ÓBIDOS
codigopostal | codigopostal | 2510-216
partido | partido | ÓBIDOS
provincia | provincia | LEIRIA
pais | pais | PT
latitud | latitud | 000000
Longitud | Longitud | 000000
Categoría de destinatario | Varchar1 | TOP (Premiun)
Tipo Destinatário |  | CZ (Centralizaciones), etc
Telefono | Telefono | 999999999
Email | EMail | preuab@prueba.com
Requiere cita | RequiereTurno | 0
Ventanas horarias | - | NULL
IdDomicilioOrden escogido para las ventansa horarias | Moverlo al pedido mañana, lo definen las reglas del pedido. | 
RespetarHorario |  | 0
MultiplesCitas |  | 0
ToleranciaCita | ToleranciaCita |  |  | 60
ToleranciaCita | 
CantidadMaximaVehiculosDia |  | 1
deposito | Iddeposito | 1
normalizado |  |  0
geocodificado |  | 0
Tipo Georreferenciación |  | Exacta
iddomicilioordenpadre |  | 345
Fijo o Variable |  | Fijo / Variable
iniciohorarioacordado1,2 finhorarioacordado1,2 |  | 0600,1800
--- TABLE END ---

* Las ventanas horarias son los rangos de horas en los que está permitido repartir o recoger mercancía en un domicilio (fijo o variable). Se registrarán en una tabla auxiliar que permite definir varios rangos horarios por día (por ejemplo, mañana y tarde).
* Regla de prioridad para determinar el horario de entrega aplicado a un pedido: 
Se aplica en primer lugar la ventana horaria del domicilio variable, si tiene una definida.
Si el domicilio variable no tiene ventana horaria propia, se aplica la del domicilio fijo asociado.
Excepción — clientes centralizaciones: se aplica siempre la ventana horaria del domicilio fijo, independientemente de si el variable tiene una definida.
* Esta regla deberá reflejarse en un campo del pedido que indique qué domicilio (fijo o variable) determinó finalmente el horario aplicado, para trazabilidad.
* Las ventanas horarias asociadas a los domicilios, serán registradas en una tabla auxiliar que permite definir varios rangos horarios por día.  A definir la regla por la cual se establece el horario de entrega del pedido a partir de los datos en el domicilio fijo o variable (en un campo del pedido)
* Las restricciones de domicilios para la planificación se registran en una tabla aparte que será detallada en el apartado de planificación.
4.3.3 Destinatarios fijos y variables
• Domicilio Fijo (Código LS): registrado con geocodificación, restricciones y horarios ya configurados.
• Domicilio Variable (Código Cliente): Registrado por el cliente, puede requerir geocodificación y puede tener información puntal de restricciones u horarios.
Toda la creación y validación de asociación de domicilios variables con domicilios fijos se realiza en EAL antes de integrar en TMS.
En TMS se podrán añadir datos operacionales (restricciones, ventanas horarias, geolocalización y Requiere Citas) de los domicilios fijos y variables que deberán ser sincronizados con EAL.
Ver Notas 1.2 en el diagrama de flujo v2
• ReferenciaExterna se usa como llave para crear el DomicilioOrden variable.
• Si el fijo no existe, se crea uno nuevo con código diferente.
 Añadimos documento con la Concepción Unigis para validar por parte de LS
4.4 Transportes (Dbo.Transporte)
Empresa transportista responsable de ejecutar el viaje.
La creación y los datos financieros de los transportes provienen del ERP mediante EAL.
Tanto LS TRANSPORTE como la flota subcontratada (eventual) es registrada en UNIGIS como un transporte.
Cada transporte tiene asociado uno o varios tipos de contratos siguientes con la información operacional:
Propio
Dedicado
Eventual

--- TABLE START ---
Descripción / Significado | Campo BD (UNIGIS) | Valor de ejemplo
Código de integración único asignado al transportista para sincronizar con el ERP. | REFERENCIAEXTERNA | 46192
Código de integración secundario o de referencia cruzada. | REFERENCIAEXTERNAADICIONAL | 46192
Razón social o nombre legal completo registrado del transportista. | RAZONSOCIAL | LIXATERRA CONSTRUÇÕES, LDA
Código del país. | NOMBREFANTASIA | PT
Identificación fiscal  | CUIT | PT-505621061
Fecha y hora en la que se dio de alta el transportista en el sistema. | FechaAlta | NULL
Dirección o domicilio fiscal principal del transportista. | Direccion | RUA D AMÉLIA DE BARREIROS, 634
Ciudad o municipio de radicación del transportista. | Localidad | LIXA
Concelho | partido | NULL
Provincia  | provincia | NULL
Código postal correspondiente a la dirección. | CodigoPostal | 4615-511
Nombre de la persona o departamento de contacto principal. | contacto | (Vacío)
Teléfono de contacto primario del transportista. | Telefono1 | (Vacío)
Teléfono de contacto alternativo o de emergencias. | Telefono2 | (Vacío)
Correos electrónicos  | EMail | vitor.silva@luis-simoes.com; ...
Identificador del tipo de transporte/carrier en el sistema (Agencias, Spot, TI – A validar) | IdTipoTransporte | NULL
Identificador del estado maestro en UNIGIS. | IdEstadoTransporte | NULL
Flag operativo. Indica si está habilitado para la asignación física de viajes (1 = Sí, 0 = No). | HabilitadoOperativo | 1
Flag administrativo. Indica si está habilitado para procesos de liquidación/auditoría (1 = Sí, 0 = No). | HabilitadoAdministrativo | 1
Flag que determina si está habilitado para recibir ofertas de viajes en el módulo de Tendering. | HabilitadoTendering | NULL
ID del grupo de Tendering al que pertenece el transportista para recibir ofertas de carga. | IdTransporteGrupoTendering | NULL
Nota o puntuación interna del desempeño del transportista. | Calificacion | NULL
Nivel de prioridad asignado al transportista para la publicación de viajes en ofertas. | PrioridadTendering | NULL
Hora de inicio permitida en la que el transportista puede recibir ofertas. | HorarioDesdeTendering | NULL
Hora límite en la que el transportista puede recibir ofertas de viajes. | HorarioHastaTendering | NULL
Hora de inicio del rango de publicación de ofertas automáticas. | HorarioPublicacionDesdeTendering | NULL
Hora límite de publicación de ofertas automáticas. | HorarioPublicacionHastaTendering | NULL
Clasificación de transporte (A1,A2,A3,B1) Refencia en documento 1.8 delegaciones Ajenas | A definir | 
--- TABLE END ---

4.5 Vehículos (Dbo.Vehiculo)
Unidad de transporte asignada a un viaje y que está asociada a un tipo de vehículo y un transporte.
Los vehículos se crearán y mantendrán en TMS.

--- TABLE START ---
Descripción / Significado en UNIGIS | Campo BD (dbo.Vehiculo) | Valor de ejemplo
Código único de integración del vehículo. Es la clave de cruce usada por el ERP. | referenciaexterna | VT002
Matrícula, patente o placa del vehículo (identificador físico primario). | dominio | 111111222
Estado lógico del registro en la base de datos (1 = Activo/Habilitado, 0 = Inactivo). | idestado | 1
ID del estado de monitoreo del vehículo | idestadovehiculo | 1
ID del conductor habitual asignado al vehículo (dbo.Conductor). | idconductor | NULL
Flag booleano. Si es 1, el TMS valida y bloquea el vehículo si tiene documentos vencidos. | validardocumentos | 1
Clave que define la categoría o tipo de vehículo (dbo.TipoVehiculo). | idtipovehiculo | 3
Identificador de la flota a la que está asignado (para segmentación de operaciones). | flota | 1
ID de la empresa transportista propietaria o responsable del vehículo (dbo.Transporte). | idtransporte | 7
Fecha de fabricación del vehículo (usada para control de antigüedad). | fechafabricacion | 2025-01-01 00:00:00.000
Prioridad de asignación para el algoritmo de ruteo. | prioridad | 0
ID de la ciudad base | idciudad | 19
Telefono | float1 | 666666666
Logotipo Si / No | chasis | LOGOTIPOOOOOO
Tiene registro de temperatura Si / No | idmodelo | N
ID del tipo de carrocería (lona, furgón, etc.) (dbo.TipoCarroceria). | idtipocarroceria | 6
ID del tipo de carga admitido (seco, frío, etc.) (dbo.TipoCarga). | idtipocarga | 2
ID de la categoría del vehículo. | idcategoriavehiculo | 1
ID del tipo de caja o contenedor del vehículo (dbo.TipoCaja). | idtipocaja | NULL
Portapallets Si / No | int2 | 0
Plataforma Si / No | float2 | 0
Capacidad máxima de carga expresada en volumen (m³). | volumen | 2
Capacidad máxima de carga expresada en peso kg | peso | 100
Capacidad máxima de carga medida en cantidad de pallets. | pallets | NULL
Matricula Galera | varchar1 | 111111
Fecha matricula Galera | varchar2 | 20250101
Matricula Reboque | varchar3 | 11111
Fecha Matricula Reboque | varchar4 | 20250101
Clasificacion emisiones |  | 
--- TABLE END ---

4.6 Tipos de Vehículo (dbo.tipovehiculo)
Agrupación de vehículos con distinto tratamiento en la planificación de rutas. Se crearán y mantendrán en TMS
Los tipos de Vehículo se crearán dependiendo del modelo + capacidad + flota. El modelo y la capacidad son necesarios para definir las restricciones con productos y destinatarios. Mientras que la flota se necesita para definir la cantidad de vehículos a tener en cuenta en la planificación.
Modelos base confirmadas durante el relevamiento on-site Madrid (Mayo 2026):
• Lona
• Refrigerado
• Carrozado / Furgoneta
• Tráiler
→  Ver Anexo A.T1 — Tabla de Tipos de Vehículo

--- TABLE START ---
Descripción / Significado en UNIGIS | Campo BD (dbo.TipoVehiculo) | Valor de ejemplo
Código único de integración de la categoría o tipo de vehículo (clave de cruce con el ERP). | refvehiculoexterno | T1
Nombre descriptivo del tipo de vehículo (ej. "Tráiler 24 Tn", "T1"). | descripcion | T1
Número total de vehículos disponibles de este tipo en la flota para la planificación. | cantidad | 20
Prioridad de uso del tipo de vehículo para el algoritmo de ruteo. | prioridad | NULL
Capacidad máxima de peso de carga útil permitida para esta categoría (0 = sin límite o no configurado). | pesomaximo | 0
Capacidad máxima de volumen de carga útil permitida (m³) para esta categoría. | volumenmaximo | 0
Capacidad máxima expresada en cantidad de bultos/cajas individuales. | bultosmaximo | 0
Capacidad máxima medida en cantidad de pallets que admite la categoría del vehículo. | palletsmaximo | 0
Número máximo de pedidos individuales que pueden planificarse en un mismo viaje. | cantidadordenesmaximo | 0
Hora de inicio de disponibilidad del tipo de vehículo (ej. 0 = 00:00 h). | iniciohorario | 0
Hora fin de disponibilidad en la que el vehículo debe terminar la ruta (ej. 2359 = 23:59 h). | finhorario | 2359
Tiempo máximo de viaje permitido para una ruta (en minutos). | tiempomaximo | 0
Tiempo máximo total de jornada de trabajo diaria permitida para este tipo de vehículo. | tiempomaximojornada | 0
Velocidad promedio en carretera (km/h) utilizada por el optimizador para estimar tiempos de viaje. | velocidadmedia | 0
Hora de inicio del bloque de inactividad o descanso obligatorio. | iniciohorarioinactividad | 0
Hora de finalización del bloque de inactividad o descanso obligatorio. | finhorarioinactividad | 0
Tiempo total de inactividad o descanso programado (en minutos). | tiempoinactividad | 0
Duración mínima obligatoria para considerar un descanso válido (en minutos). | tiempominimoinactividad | 0
Booleano. Indica si el vehículo puede realizar rutas que recojan carga en múltiples depósitos (1 = Sí). | permitemultiplesdepositos | 1
Booleano. Indica si el camión puede hacer segundas o terceras vueltas de reparto el mismo día (1 = Sí). | reutilizable | 0
Cantidad máxima de vueltas/viajes diarios permitidos por vehículo (si es reutilizable). | cantidadvueltas | 0
--- TABLE END ---

4.7 Categoría de Vehículo (Dbo.CategoriaVehiculo)
La categoría de vehículo es una agrupación de vehículo, utilizada para la tarifación. Permite aplicar tarifas diferenciadas según la categoría del vehículo asignado a un viaje.
Se crean y se mantienen en TMS.
→  Ver Anexo A.T2 — Tabla de Categorías de Vehículo
4.8 Conductores (Dbo.Conductor)
Recurso humano que ejecuta el viaje en el vehículo asignado.
•Al crear un conductor en UNIGIS, el sistema debe crear automáticamente el usuario de la app móvil.
Pueden ir asociados a un vehículo y deben ir asociados a un transporte
Se crean y mantienen en TMS.
Completar campos del conductor.
4.9 Tipo de Documento (Dbo.TipoDocumento)

--- TABLE START ---
Documento | Nivel | Generación | Observaciones
Albarán | Parada / Pedido | Se genera en PDF por LS y se envía a UNIGIS por MAPI / (es necesario que se conviertan a Base64). / Pendiente revisar ejemplo de rendición y digitalización de viaje. / UNIGIS: Confirmar link en parada para acceder al albarán digitalizado en sistema LS. | Formatos distintos por cliente (confirmar que son convertibles a Base64).
e-CMR | Viaje | TMS + integración TransFollow | Nuevo requerimiento — Q4 2026
DECA / (Documento electrónico de control administrativo) | Parada | TMS | Debe ir como un link o QR asociado a la parada. / Revisar el detalle del documento en conjunto después del verano.
Mapa de Carga | Viaje | TMS | Incluye secuencia de carga y cantidades planificadas y cargadas (actualizadas desde WMS).
Contrato de Transporte / (Orden de Carga ES, actualmente) | Viaje | TMS — Se genera automáticamente cuando se asigna transporte al viaje. / Revisar en qué estados de viaje (Inicial / Pendiente Agencia). | Para todos los transportes. / 1ª notificación: al asignar transporte al viaje. / 2ª notificación: al asignar vehículo si no lo tenía en el primer envío (actualiza matrícula en el documento). / UNIGIS: Confirmar gestión de notificaciones y reenvío del contrato. / Notificación de cancelación automática al primer transporte cuando se asigna uno nuevo. / Notificación con nuevo documento cuando se cambia el vehículo sin cambiar el transporte.
Carta de Porte / (nombre a definir por LS) | Viaje (solo ES) | TMS | Requiere datos actualizados desde WMS. / Pendiente confirmar por parte de LS.
Hoja de Inspección de Vehículo | Viaje | TMS — Se genera en Visitado, presentación garita o inicio de carga en la primera parada en COL. / Pendiente confirmar por parte de LS. | Adjunto al mapa de carga, o documento aparte para ser validado fuera de TMS por garita de distribución en el momento de la carga. / Pendiente confirmar por parte de LS.
Contrato | Cliente / Pedido | — | —
--- TABLE END ---

4.10 Contratos
Los Contratos de UNIGIS TMS son el eje central que conecta al cliente dador, el pedido, la tarifación y la facturación. Sin contrato activo, un pedido no puede avanzar en el flujo operativo. Esta interdependencia no es una restricción técnica: es la garantía de que cada servicio queda trazado, tarifado y facturado bajo las condiciones comerciales acordadas con el cliente.
Contratos con cliente para tarifación de venta
Contratos con transportes – datos operacionales del transportista
Se envía en la asignación de medios del viaje       
Los contratos de transporte con clientes dadores se registran en UNIGIS como documentos del tipo 'Venta de Transporte'. Reglas de gestión:
• Un cliente puede tener múltiples contratos vigentes.
• Un pedido pertenece siempre a un único contrato.
• Sin número de contrato, el pedido no puede avanzar en el flujo (bloqueo obligatorio).
• Las tarifas deben estar vinculadas a cada contrato.
• La aglutinación de contratos distintos está controlada por un campo SI/NO en el contrato.
• La liquidación siempre genera una factura por contrato (separación obligatoria).
• Regla de asignación de contrato: a definir si es el MiddleWare o UNIGIS el que asocia cliente dador con contrato en la creación del pedido.
Variables de cálculo del contrato: los costes del servicio se calculan en base a cliente dador, origen (COL de salida), destino (COL de llegada o zona de entrega) y volúmenes (peso, bultos, pallets). Sobre estas variables base se aplican los modelos tarifarios definidos.
Hay contratos de transporte por tipo de transporte
Origen de datos: Se crean y mantienen en TMS.
           UNIGIS ampliar información de cómo se crearán los contratos por parte del usuario tras la creación automática vía interfase
 Añadimos documento con la Concepción Unigis para validar por parte de LS
4.11 Recursos
Los recursos son todas las entidades necesarias para ejecutar y completar una entrega/recolección o cualquier otro elemento asignable a una ruta o viaje que no sea un vehículo o conductor.
Lista de recursos:
Porta pallets
Ayudantes
…[GC1]
Pueden ser requeridos para el viaje en función de la parametrización del domicilioorden.
[GC1]LS pendiente completar lista recursos requeridos
4.12 Productos
Los productos se clasifican mediante una jerarquía de línea y sublinea de producto, que permite segmentar la oferta y aplicar reglas específicas por categoría de mercancía.
Restricciones en base a la tipología de los productos (a nivel de cabecera porque así se enviará desde el WMS):
CategoriaOrden – CategoriaOrden -> No se permite mezclar estas tipologías de producto
Categoria Orden – Tipo Vehículo -> Que se permite incluir en cada tipología de vehículo
Categoria Orden – DomicilioOrden -> Si algún destinatario no permite recibir alguna tipología de producto
WMS enviara la tipología de producto a nivel de cabecera de pedido (confirmar en que campo del pedido) para llevarlo a la Categoria Orden en Planning y así poder tener en cuenta las restricciones a nivel de categoría orden.
5. GESTIÓN DE PEDIDOS
El Pedido es la solicitud de transporte original remitida por el cliente dador a Luis Simões. Es el documento cabecera que establece los requerimientos de entrega (bultos, peso, volumen, ventana horaria de cita, importes). Establece los datos de origen, destino, horarios y fechas de recolección y entrega, como así los productos a ser transportados.
5.1 Datos del Pedido
5.1.1 Tipos de Pedido
Tipos de pedido configurados inicialmente:
• Operación + Local
• Operación + Larga Distancia
Tablas auxiliares requeridas para la determinación automática de depósitos y operación:
• Z_Area_Influencia_Deposito: determina el depósito de salida y operación a partir del código postal del remitente.
• Z_DistanciaRelacion: define días mínimos de tránsito entre zonas para validación de fechas.
Anexo: Lista Tipo de Pedido
5.1.2 Campos del Pedido
Anexo: Campos Pedido y pedido_Dyn
5.1.3 Campos del Pedido Item
Anexo: Campos PedidoItem y pedidoitem_Dyn
5.1.4 Etiquetas (LPN)
Las etiquetas NO se generan en UNIGIS. Se reciben en el campo PedidoItem.LPN. Reglas:
• El código de etiqueta puede venir del WMS, del cliente o del COL (Crossdock).
• Formato propuesto: País + Empresa + SistemaOrigen + Contador + Dígito Control.
• Un ítem (pallet o bulto) NO puede tener más de una etiqueta.
• Para pedidos con cajas paletizadas: la etiqueta estará en el pallet, no en las cajas.
• Los pedidos se reciben inicialmente sin etiqueta; luego de la preparación se actualizará el pedido con PedidoItem.LPN.
5.2 Estados del Pedido y Transiciones
Los estados del pedido se clasifican en dos grupos: estados de ejecución y estados de programación de tramos. A continuación, se presentan ambas matrices.
5.2.1 — Estados de Ejecución: reflejan la situación global del pedido. Transiciones gestionadas por SAC y DIST con algunas automáticas.
Anexo: Lista estados ejecución
5.2.2 — Estados de Programación (Tramos): reflejan el estado respecto a la planificación de tramos, gestionados por DIST desde Planificación.
Anexo: Lista estados programación
5.3 Flujo del Pedido (Ingreso hasta Programable)
5.3.1 Ingreso/Alta
El pedido se recibe desde EAL/Middleware a través del Webserie CrearOrdenesPedido y entra en estado INICIAL. No existe carga manual de pedidos en pantallas de UNIGIS; los pedidos manuales se introducen a través del portal LSTools, que llama al mismo Webservice.
5.3.1.1 Sistema de Origen del Pedido

--- TABLE START ---
Sistema origen | Campo Pedido_Dyn.SistemaOrigen
ERP LS vía EAL/MW | ERP
LS TOOLS vía EAL/MW | LS TOOLS
WMS vía EAL/MW | SGA
Cliente via EAL/MW | 
--- TABLE END ---

EAL confirmará si es posible mapear este campo con el sistema origen del pedido.
5.3.2 Procesos de Completar y Validar tras el ingreso
El sistema lanza automáticamente los siguientes procesos tras la creación del pedido:
Completar Pedido: rellena los campos no informados, así como Depósito de Salida (por área de influencia del CP), Depósito de Llegada, Operación, Tipo de Pedido y Horarios. 
Anexo: Campos Pedido a completar
Validar Pedido: A continuación, se ejecuta la Validación del pedido tras el completado. 
Anexo: Campos Pedido a validar
Si la validación es correcta el pedido cambia al estado REGISTRADO-OK y, en caso contrario, cambia al estado ERROR (con el detalle del error en el campo del pedido Pedido_Dyn.Mensajes_Y_Errores). 
5.3.3 Ajuste manual y Confirmación
El usuario de SAC edita/corrige el pedido en estado REGISTRADO-OK/ERROR, y cambia el estado del pedido a CONFIRMADO cuando considera que el pedido está listo para ser programado por el equipo de Distribución.
5.3.4 Procesos de Completar y Validar tras la confirmación
El sistema lanza automáticamente de nuevo los siguientes procesos tras la confirmación del pedido:
Completar Pedido: rellena los campos no informados, así como Depósito de Salida (por área de influencia del CP), Depósito de Llegada, Operación, Tipo de Pedido y Horarios. 
Validar Pedido: A continuación, se ejecuta la Validación del pedido tras el completado. 
Si la validación es correcta el pedido cambia al estado PROGRAMABLE y, en caso contrario, cambia al estado ERROR (con el detalle del error en el campo del pedido Pedido_Dyn.Mensajes_Y_Errores). 
5.3.5 Programable
Una vez que el pedido se encuentra en estado PROGRAMABLE, es gestionado por los usuarios de Distribución y no es editable (salvo por usuarios con perfil SAC y con previa comunicación o autorización de la operación - Cualquier modificación SAC relanza el ciclo de validación).
PROGRAMABLE -> REGISTRADO-OK: Lo realizará Distribucion si es necesario que equipo de SAC haga cambio al pedido
5.3.6 Actualización de Pedidos
Los pedidos se actualizan tras la preparación en WMS, o al ser recibidos en COL (Crossdock o entrega en COL por el cliente).
¿Quién puede actualizar y hasta cuándo?
Vía interfaz desde WMS: la actualización puede realizarse mientras el pedido no esté en estado Confirmado.
Vía usuario de SAC: también puede actualizar el pedido hasta que este quede Confirmado. Sin embargo, dado que un pedido en firme y pendiente de planificar ya no es editable por SAC, en ese caso SAC debe solicitar al equipo de planificación que retroceda el estado del pedido, para poder realizar la modificación necesaria.
¿Por qué se actualiza?
Porque en el almacén se ha preparado menos cantidad de la pedida.
Porque la cantidad recogida en una recogida varía respecto a lo previsto.
Por roturas de stock.
Por accidentes (mercancía dañada o perdida).
Tipos de actualización:
Modificación de cantidades a nivel de cabecera o ítem (agregar/quitar ítems, reemplazar descripción).
Actualización con etiqueta de ítems (campo PedidoItem.LPN).
Actualización de campos DYN operacionales.
📌 Nota: Analizar la creación de un método ad hoc (ActualizarPedidosParcial) que solo permita modificar campos objetivo del Pedido/PedidoItem sin afectar otros campos.
📌 Nota: Actualización en Cascada (sincronizador PedidoOrdenParada): cuando se registra una modificación de pallets, bultos, peso o volumen, deben actualizarse las órdenes y paradas donde exista ese mismo pedido.
Los pedidos se actualizan tras la preparación en WMS 
o al ser recibidos en COL (Crossdock o entrega en COL por el cliente). Tipos de actualización:
• Modificación de cantidades a nivel de cabecera o ítem (agregar/quitar ítems, reemplazar descripción).
• Actualización con etiqueta de ítems (campo PedidoItem.LPN).
• Actualización de campos DYN operacionales.
📌 Nota: Analizar la creación de un método ad hoc (ActualizarPedidosParcial) que solo permita modificar campos objetivo del Pedido/PedidoItem sin afectar otros campos.
📌 Nota: Actualización en Cascada (sincronizador PedidoOrdenParada): cuando se registra una modificación de pallets, bultos, peso o volumen, deben actualizarse las órdenes y paradas donde exista ese mismo pedido.
5.4 Casos Especiales de Pedido
5.4.1 Pedidos con Capacidad Superior al Vehículo Mayor
Si un pedido excede el tamaño del vehículo con mayor capacidad disponible, se necesita un Split de Pedido. De ser necesario, esta tarea la realiza el Middleware. Enviándonos pedidos cuyo volumen puede ser embarcado en un camión.
5.4.2 Actualización de Cantidades en Cascada
Cuando se registra una modificación de Pallet, bultos, peso, volumen o cantidades, deben actualizarse las órdenes y las paradas donde exista ese mismo pedido. Ausente del esquema.
5.4.3 Método ActualizarPedidos Parcial
Analizar la creación de un método adHoc para este fin.
El metodo solo debe permitir la modificacíón de algunos campos objetivo de Pedido / PedidoItem sin modificar los campos no contenidos en el método.
5.4.4 Actualización de Cantidades en Cascada (sincronizador PedidoOrdenParada)
Cuando se registra una modificación de Pallet, bultos, peso, volumen o cantidades, deben actualizarse las órdenes y las paradas donde exista ese mismo pedido. 
5.4.5 Rangos horarios por destinatario y día.
En el proceso de CompletarPedido, actualizar los horarios en función del destinatario y el día a partir de la tabla DomicilioOrdenVentanaHoraria.
5.4.6 Fecha límite de PREPARACIÓN, teniendo en cuenta los feriados.
Proponemos controlar con la fecha de Recolección.
5.4.7 Grandes Superficies
Para clientes con flag AgrupaHorariosEnPrimeraEntrega: si en la jornada hay varias órdenes al mismo domicilio con horarios diferentes, se actualiza el horario de entrega al primer horario disponible (ojo: incompatible con citas).
5.4.8 Pedidos con carga en depósito de salida
 Los pedidos con Tipo DomicilioOrden2 = Depósito se tratan como pedido con origen en depósito (carga en depósito de salida).
5.4.9 Re-entregas
• Re-planificar Reparto SIN CARGO: el usuario edita la fecha de entrega y cambia estado para volver a planificar.
• Re-planificar Reparto CON CARGO: el sistema genera un nuevo pedido con los mismos datos, registrando en Pedido_Dyn el IdPedidoOriginal (padre). Se trabaja con el nuevo pedido.
6. PROGRAMACION
La planificación en UNIGIS TMS se organiza jerárquicamente: Operación → Jornada (+Tipo Jornada) → Ruta → Orden (+Tipo Orden). Esta sección describe la programación de pedidos a partir de los distintos estados posibles, generando dos tipos de orden (entrega y recogida) en cada caso, que se enmarcan en una operación y tipo de jornada concretos.
6.1 Tipos de Órdenes
Las órdenes son las unidades de planificación física generadas a partir de los pedidos. Cada pedido puede generar múltiples pares de órdenes (entrega y recogida) según los tramos del itinerario logístico, indicados por el estado de programación seleccionado.
Anexo: Lista de Tipos de Orden
6.2 Tipos de Jornada
Las jornadas se clasifican según el tipo de operativa y el ámbito geográfico del tramo planificado:
Tipo de Jornada, Descripción, Criterio de asignación
LOCAL, Distribución capilar o recogidas dentro de la zona de influencia de un COL., Zona depósito Carga = Zona depósito Descarga
LARGA DISTANCIA, Movimientos entre distintas zonas de influencia de un COL de LS., Zona depósito Carga ≠ Zona depósito Descarga
PAQUETERÍA, Pedidos de paquetería canalizados a través de operadores externos en una jornada específica., Tipo de pedido = Paquetería + regla de zona
DELEGACIÓN AJENA, Movimientos en los que participa un COL que no es propio de LS., Depósito Ajena identificado en el pedido
Anexo: Lista de Tipos de Jornada
6.3 Flujo de Pedido (Programable hasta Creación de Órdenes)
6.3.1 Pedido programable
Una vez creado y confirmado, el pedido alcanza el estado PROGRAMABLE, quedando incluido en el listado de pedidos disponibles para programar.
A partir de este estado el pedido no puede ser modificado por el usuario.
6.3.2 Flag de Pedido 'Preparado' (Interfaz Reflex/SGAs)
El WMS (Reflex/SGAs) envía automáticamente un flag al TMS marcando el pedido como 'PREPARADO'. Esta integración es fundamental para mantener la sincronización entre los sistemas de venta y de logística/almacén.
Este dato se podrá enviar desde la creación del pedido hasta cualquier estado de programación.
En caso de fallo de comunicación con Reflex/SGAs, el flag no se actualiza, lo que podría afectar a la visibilidad del pedido en otros sistemas.
6.3.2.1 Registro de Interfaces
Nº Interfaz, Nombre, Dirección, Dato, Criticidad
4, Flag Pedido Preparado, VENTA → Reflex/SGAs, PEDIDO: PREPARADO, ALTA
6.3.3 Programación Manual
El usuario cambia el estado de uno o varios pedidos a un estado de programación. El TMS:
Crea la jornada en la operación y del tipo correspondiente (local, larga distancia…), utilizando la información de las tablas auxiliares.
Crea para cada pedido los pares de órdenes de recogida y entrega (Pickup y Delivery), con el tipo de orden correspondiente.
Estados de programación (disponibles para programar los pedidos del cliente desde OM):
Estado, Acción / Descripción
Programable, Estado inicial de programación; el pedido está disponible para programar. En este estado aún no tiene ninguna orden creada.
Programar [Punto a Punto], Programar pedido de un punto a otro fuera de los depósitos propios o ajenos.
Programar [Entrega Directa], Programar una entrega desde un depósito hasta el destino final.
Programar [Arrastre], Programar un crossdock desde un depósito a otro, propio o ajeno.
Programar [Recogida], Programar una recolección en un remitente (cliente o destinatario) para descarga en un depósito.
Ajena* - Programar [Punto a Punto], Programar pedido de un punto a otro fuera de los depósitos propios o ajenos, ejecutado por una delegación ajena.
Ajena - Programar [Arrastre], Programar un crossdock desde un depósito a otro, propio o ajeno, ejecutado por una delegación ajena.
Ajena - Programar [Recogida], Programar una recolección en un remitente (cliente o destinatario) para descarga en un depósito, ejecutado por una delegación ajena.
Programar [Paquetería], Programar una entrega desde un depósito hasta el destino final, ejecutado por una paquetería.
Replanificar, Estado administrativo para edición y tratamiento.
Reprogramable, El pedido está validado y disponible para programar logística inversa o reprogramar la entrega/recogida.
Reentrega / Rerecogida, Definir que el pedido deberá ser replanificado para entrega/recogida.
Retorno depósito origen, Definir como destino final del pedido el retorno al depósito original de los pallets restantes.
Retorno cliente, Definir como destino final del pedido el retorno al cliente dador.
* Diferenciado con 'Ajena' para que sea enviado al tipo de jornada de la delegación ajena.
A continuación se detalla, paso a paso, el proceso que ejecuta el TMS para cada estado de programación:
Programar Punto a Punto
Tramo entre Remitente y Destinatario sin pasar por depósito intermedio. La recogida se hace en el domicilio del remitente y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a Programar Punto a Punto:
Paso 1: Se calcula y compara la Zona depósito Salida con Zona depósito Llegada (a partir de la tabla de zona influencia depósito) → si son iguales el tramo es Local, si difieren es Larga Distancia.
Paso 2: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Salida, se consulta la tabla Depósito Salida para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
No se programan próximos tramos automáticamente.
Programar Entrega Directa
Tramo entre un depósito de carga de LS (no desde el remitente) y destinatario. La recogida se hace en el depósito de LS y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a Programar Entrega Directa:
Paso 1: Borra las órdenes de paquetería generadas anteriormente si el estado de programación anterior era Paquetería.
Paso 2: El valor de Depósito Descarga se traslada a Depósito Carga.
Paso 3: Se calcula la zona del Depósito de Carga a partir de la tabla de zona influencia depósito (por si se habían actualizado anteriormente en otro estado de programación).
Paso 4: Se borra el Depósito Descarga del pedido para evitar datos residuales.
Paso 5: Se borra la Zona Depósito Descarga del pedido para evitar datos residuales.
Paso 6: El tipo de tramo se calcula comparando Zona depósito Carga con Zona depósito Llegada (igual → Local, distinta → Larga Distancia).
Paso 7: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
No se programan próximos tramos automáticamente.
Programar Recogida
Tramo entre Remitente y Depósito de LS. La recogida se hace en el Remitente y la entrega en el depósito de LS.
Proceso Cambio de estado de pedido a Programar Recogida:
Paso 1: El usuario selecciona el depósito de descarga entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: El motivo seleccionado se asigna al campo Depósito Descarga del pedido.
Paso 3: Se calcula y asigna la zona del Depósito Descarga a partir de la tabla de zona influencia depósito.
Paso 4: El tipo de tramo compara Zona depósito Salida con Zona depósito Descarga (igual → Local, distinta → Larga Distancia).
Paso 5: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 6: El tramo siguiente se determina automáticamente: 
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
Programar Arrastre
Tramo entre dos Depósitos de LS, generando una orden de recogida en el primer depósito de LS y una de entrega en el segundo.
Proceso Cambio de estado de pedido a Programar Arrastre:
Paso 1: El usuario selecciona el depósito de descarga entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: Si el estado de programación anterior era Entrega Directa, se borran las órdenes generadas no asignadas a ninguna ruta (no planificadas).
Paso 3: El motivo seleccionado en el paso anterior se guarda en una variable temporal del pedido.
Paso 4: Si el Depósito Descarga actual ≠ vacío, el valor del Depósito Descarga pasa a ser el nuevo Depósito Carga.
Paso 5: Si el Depósito Descarga actual ≠ vacío, se calcula la zona del nuevo Depósito Carga a partir de la tabla de zona influencia depósito.
Paso 6: La variable temporal del Paso 3 se convierte en el nuevo Depósito Descarga.
Paso 7: Se calcula la zona del nuevo Depósito Descarga a partir de la tabla de zona influencia depósito.
Paso 8: El tipo de tramo compara Zona depósito Carga con Zona depósito Descarga (igual → Local, distinta → Larga Distancia).
Paso 9: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 10: El tramo siguiente se determina automáticamente: 
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre (encadenado)
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
AJENA – Programar Punto a Punto
Tramo subcontratado entre Remitente y Destinatario sin pasar por depósito intermedio. La recogida se hace en el domicilio del remitente y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a AJENA - Programar Punto a Punto:
Paso 1: El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: El motivo seleccionado se asigna al campo Depósito Ajena del pedido.
Paso 3: A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
No se programan próximos tramos automáticamente.
AJENA – Programar Recogida
Tramo subcontratado entre Remitente y Depósito Ajena. La recogida se hace en el Remitente y la entrega en Depósito Ajena.
Proceso Cambio de estado de pedido a AJENA - Programar Recogida:
Paso 1: El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: El motivo seleccionado se asigna al campo Depósito Ajena del pedido.
Paso 3: El valor del Depósito Ajena se copia al campo Depósito Descarga del pedido.
Paso 4: A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 5: El tramo siguiente se determina automáticamente: 
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
AJENA – Programar Arrastre
Tramo subcontratado entre dos Depósitos en los que uno de ellos es Ajena, generando una orden de recogida en el primer depósito y una de entrega en el segundo.
Proceso Cambio de estado de pedido a AJENA - Programar Arrastre:
Paso 1: El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: Si el estado de programación anterior era Entrega Directa, se borran las órdenes generadas no asignadas a ninguna ruta (no planificadas).
Paso 3: El motivo seleccionado en el Paso 1 se guarda en una variable temporal del pedido.
Paso 4: Si el Depósito Descarga actual ≠ vacío, el valor del Depósito Descarga pasa a ser el nuevo Depósito Carga.
Paso 5: Si el Depósito Descarga actual ≠ vacío, se borra la zona del Depósito Carga.
Paso 6: Si el Depósito Descarga actual ≠ vacío, se calcula la nueva zona del Depósito Carga a partir de la tabla de zona influencia depósito.
Paso 7: La variable temporal del Paso 3 se copia al campo Depósito Descarga del pedido.
Paso 8: Se borra la zona del Depósito Descarga.
Paso 9: Se calcula la nueva zona del Depósito Descarga a partir de la tabla de zona influencia depósito.
Paso 10: Se determina el Depósito Ajena definitivo: 
Si el tipo del Depósito Descarga = depósito LS → el Depósito Carga se traslada al campo Depósito Ajena
Si el tipo del Depósito Descarga ≠ depósito LS → el Depósito Descarga se traslada al campo Depósito Ajena
Paso 11: A partir del Depósito Ajena resultante, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 12: El tramo siguiente se determina automáticamente: 
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
Programar Paquetería
Estado de programación para pedidos de paquetería operados por terceros. En este flujo la mercancía se entrega a un proveedor que se encarga de su entrega. El proveedor puede recoger en COL o se le posiciona la mercancía.
Proceso Cambio de estado de pedido a Programar Paquetería:
Paso 1: El Depósito Descarga actual pasa a ser Depósito Carga.
Paso 2: Se calcula la zona del Depósito de Carga (a partir de la tabla de zona influencia depósito).
Paso 3: Se borra el Depósito Descarga del pedido para evitar datos residuales.
Paso 4: Se borra la Zona Depósito Descarga del pedido para evitar datos residuales.
Paso 5: A partir del Depósito de Carga del pedido, se consulta la tabla Depósito Carga para determinar a qué Operación se asignarán las órdenes generadas.
Paso 6: A partir de la zona de Depósito de Carga del pedido y la Operación determinada en el paso anterior, se consulta la tabla Paquetería para determinar a qué Tipo de Jornada se asignarán las órdenes generadas.
6.3.4 Desprogramación de pedidos
Proceso especial para desprogramar pedidos, aplicable cuando es necesario deshacer varios tramos del ruteo. El sistema verifica primero si las órdenes del tramo anterior o del último tramo ya están ruteadas; si es así, el proceso se cancela para evitar inconsistencias en el flujo logístico. Solo se permite borrar las órdenes de un tramo anterior si no están asignadas a una ruta.
⚠ Un fallo en estas validaciones podría llevar a inconsistencias severas en el estado de las rutas y órdenes.
6.3.4.1 Desprogramación último tramo
Proceso especial de borrado del último tramo:
Valida si el último tramo tiene órdenes asignadas a ruta. 
Si tiene órdenes asignadas: no las borra y detiene el proceso (informando en un campo del pedido). Si se quiere poder realizar el borrado, se deben desasignar las órdenes de la ruta en Planning y volver a ejecutar el proceso.
Si no las tiene: borra las órdenes del último tramo.
6.3.4.2 Desprogramación dos últimos tramos
Proceso especial de borrado de los últimos dos tramos:
Si el tramo anterior al último programado tiene órdenes asignadas a ruta: no las borra y se detiene el proceso (informando en un campo del pedido).
Si no las tiene, valida si el último tramo tiene órdenes asignadas a ruta: 
Si tiene órdenes asignadas: no las borra y detiene el proceso.
Si no las tiene: borra las órdenes del último tramo y del anterior.
6.3.4.3 Desprogramación completa
Mismo proceso que el anterior, pero aplicado a todos los tramos del pedido.
6.3.5 Programación Semiautomática
El usuario ejecuta el proceso sobre uno o varios pedidos. UNIGIS analiza los datos y aplica las reglas para programar los cambios de estado de programación igual que en la Programación Manual, pero de forma automática.
6.3.6 Tablas auxiliares de programación
(Añadir en anexo y referenciar)
Tablas Depósito – Carga, Descarga, Paquetería y Ajena
Tabla OrdenTipoPedido
6.3.7 Programación MCFS (Multicapacityflow)
El usuario selecciona uno o varios pedidos y los envía al data collection de MCFS. TMS ejecutará el nuevo algoritmo que determinará los viajes óptimos, sin pasar por el módulo de planificación.
6.3.8 Crear Ruta Manual desde pedidos
El usuario selecciona uno o varios pedidos y crea la ruta sin pasar por el módulo de planificación. Dirigido a FTL.
La planificación en UNIGIS TMS se organiza jerárquicamente: Operación → Jornada (+Tipo Jornada) → Ruta → Orden (+Tipo Orden). Esta sección describe la programación de pedidos a partir de los distintos estados posibles, generando dos tipos de orden (entrega y recogida) en cada caso que se enmarcan en una operación y tipo de jornada concretos.
6.1 Tipos de Órdenes
Las órdenes son las unidades de planificación física generadas a partir de los pedidos. Cada pedido puede generar múltiples pares de órdenes (entrega y recogida) según los tramos del itinerario logístico, indicados por el estado de programación seleccionado.
Anexo: Lista de Tipos de Orden
6.2 Tipos de Jornada
Las jornadas se clasifican según el tipo de operativa y el ámbito geográfico del tramo planificado:

--- TABLE START ---
Tipo de Jornada | Descripción | Criterio de asignación
LOCAL | Distribución capilar o Recogidas dentro de la zona de influencia de un COL. | Zona depósito Carga = Zona depósito Descarga
LARGA DISTANCIA | Movimientos entre distintas zonas de influencia de un COL de LS. | Zona depósito Carga ≠ Zona depósito Descarga
PAQUETERÍA | Pedidos de paquetería canalizados a través de operadores externos en una jornada específica. | Tipo de pedido = Paquetería + regla de zona
DELEGACIÓN AJENA | Movimientos en los que participa un COL que no es propio de LS. | Depósito Ajena identificado en el pedido
--- TABLE END ---

Anexo: Lista de Tipos de Jornada
6.3 Flujo de Pedido (Programable hasta Creación de Órdenes)
6.3.1 Pedido programable
Una vez creado y confirmado, el pedido alcanza el estado PROGRAMABLE, quedando incluido en el listado de pedidos disponibles para programar. 
A partir de este estado el pedido no puede ser modificado por el usuario.
6.3.2 Flag de Pedido 'Preparado' (Interfaz Reflex/SGAs)
El WMS (Reflex/SGAs) envía automáticamente un flag al TMS marcando el pedido como 'PREPARADO'. Esta integración es fundamental para mantener la sincronización entre los sistemas de venta y de logística/almacén. 
Este dato se podrá enviar desde la creación del pedido hasta cualquier estado de programación.
En caso de fallo de comunicación con Reflex/SGAs, el flag no se actualiza, lo que podría afectar a la visibilidad del pedido en otros sistemas.
6.3.2.1 Registro de Interfaces

--- TABLE START ---
Nº Interfaz | Nombre | Dirección | Dato | Criticidad
4 | Flag Pedido Preparado | VENTA → Reflex/SGAs | PEDIDO: PREPARADO | ALTA
--- TABLE END ---

6.3.3 Programación Manual
el usuario cambia el estado de uno o varios pedidos a un estado de programación. El TMS 
crea 
La jornada en la operación y del tipo correspondiente (local, larga distancia…), utilizando la información de las tablas auxiliares.
Crea para cada pedido los pares de órdenes de recogida y entrega (Pickup y Delivery), con el tipo de orden correspondiente

--- TABLE START ---
Estados de programación / Disponibles para programar los pedidos del cliente desde OM | Acción / Descripción
Programable | Estado inicial de programación; el pedido está disponible para programar. En este estado aún no tiene ninguna orden creada.
Programar [Punto a Punto] | Programar pedido de un punto a otro fuera de los depósitos propios o ajenos.
Programar [Entrega Directa] | Programar una entrega desde un depósito hasta el destino final.
Programar [Arrastre] | Programar un crossdock desde un depósito a otro, propio o ajeno.
Programar [Recogida] | Programar una recolección en un remitente (cliente o destinatario) para descarga en un depósito.
Ajena* - Programar [Punto a Punto] | Programar pedido de un punto a otro fuera de los depósitos propios o ajenos, ejecutado por una delegación ajena.
Ajena - Programar [Arrastre] | Programar un crossdock desde un depósito a otro, propio o ajeno, ejecutado por una delegación ajena.
Ajena - Programar [Recogida] | Programar una recolección en un remitente (cliente o destinatario) para descarga en un depósito, ejecutado por una delegación ajena.
Programar [Paquetería] | Programar una entrega desde un depósito hasta el destino final, ejecutado por una paquetería.
Replanificar | Estado administrativo para edición y tratamiento.
Reprogramable | El pedido está validado y disponible para programar logística inversa o reprogramar la entrega/recogida.
Reentrega / Rerecogida | Definir que el pedido deberá ser replanificado para entrega/recogida.
Retorno depósito origen | Definir como destino final del pedido el retorno al depósito original de los pallets restantes.
Retorno cliente | Definir como destino final del pedido el retorno al cliente dador.
* Diferenciado con 'Ajena' para que sea enviado al tipo de jornada de la delegación ajena.
--- TABLE END ---

Analizando los cambios entre el texto actual y la hoja "Flujos estados Fechado". Los cambios clave son:
Entrega Directa: El "Paso 0" pasa a ser "Paso 1" (renumeración)
Programar Arrastre: Nueva condición "Si Depósito Descarga ≠ vacío" antes de trasladar Descarga→Carga (Pasos 4 y 5)
AJENA - Programar Recogida: Corrección en Paso 5 — la condición para Programar Arrastre ahora requiere también que "Tipo domicilio orden = depósito"
AJENA - Programar Arrastre: Reestructuración mayor (8→12 pasos): añade condición "Si Depósito Descarga ≠ vacío" en pasos 4-6, y nuevo Paso 10 con lógica para determinar el Depósito Ajena según el tipo de depósito de descarga
El resto de estados (Punto a Punto, Paquetería, AJENA-Punto a Punto) no tienen cambios lógicos, solo detalle de presentación.
Aquí el texto actualizado completo de 6.3.3:
6.3.3 Programación Manual
El usuario cambia el estado de uno o varios pedidos a un estado de programación. El TMS crea la jornada en la operación y del tipo correspondiente (local, larga distancia…), utilizando la información de las tablas auxiliares. Crea para cada pedido los pares de órdenes de recogida y entrega (Pickup y Delivery), con el tipo de orden correspondiente.
Estados Programación
Programar Punto a Punto
Programar Entrega Directa
Programar Recogida
Programar Arrastre
AJENA - Programar Punto a Punto
AJENA - Programar Arrastre
AJENA - Programar Recogida
Programar Paquetería
Programar Punto a Punto
Tramo entre Remitente y Destinatario sin pasar por depósito intermedio. La recogida se hace en el domicilio del remitente y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a Programar Punto a Punto:
Paso 1: Se calcula y compara la Zona depósito Salida con Zona depósito Llegada (a partir de la tabla de zona influencia depósito) → si son iguales el tramo es Local, si difieren es Larga Distancia.
Paso 2: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Salida, se consulta la tabla Depósito Salida para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
No se programan próximos tramos automáticamente.
Programar Entrega Directa
Tramo entre un depósito de carga de LS (no desde el remitente) y destinatario. La recogida se hace en el depósito de LS y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a Programar Entrega Directa:
Paso 1: Borra las órdenes de paquetería generadas anteriormente si el estado de programación anterior era Paquetería.
Paso 2: El valor de Depósito Descarga se traslada a Depósito Carga.
Paso 3: Se calcula la zona del Depósito de Carga a partir de la tabla de zona influencia depósito (por si se habían actualizado anteriormente en otro estado de programación).
Paso 4: Se borra el Depósito Descarga del pedido para evitar datos residuales.
Paso 5: Se borra la Zona Depósito Descarga del pedido para evitar datos residuales.
Paso 6: El tipo de tramo se calcula comparando Zona depósito Carga con Zona depósito Llegada (igual → Local, distinta → Larga Distancia).
Paso 7: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
No se programan próximos tramos automáticamente.
Programar Recogida
Tramo entre Remitente y Depósito de LS. La recogida se hace en el Remitente y la entrega en el depósito de LS.
Proceso Cambio de estado de pedido a Programar Recogida:
Paso 1: El usuario selecciona el depósito de descarga entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: El motivo seleccionado se asigna al campo Depósito Descarga del pedido.
Paso 3: Se calcula y asigna la zona del Depósito Descarga a partir de la tabla de zona influencia depósito.
Paso 4: El tipo de tramo compara Zona depósito Salida con Zona depósito Descarga (igual → Local, distinta → Larga Distancia).
Paso 5: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 6: El tramo siguiente se determina automáticamente:
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
Programar Arrastre
Tramo entre dos Depósitos de LS, generando una orden de recogida en el primer depósito de LS y una de entrega en el segundo.
Proceso Cambio de estado de pedido a Programar Arrastre:
Paso 1: El usuario selecciona el depósito de descarga entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: Si el estado de programación anterior era Entrega Directa, se borran las órdenes generadas no asignadas a ninguna ruta (no planificadas).
Paso 3: El motivo seleccionado en el paso anterior se guarda en una variable temporal del pedido.
Paso 4: Si el Depósito Descarga actual ≠ vacío, el valor del Depósito Descarga pasa a ser el nuevo Depósito Carga.
Paso 5: Si el Depósito Descarga actual ≠ vacío, se calcula la zona del nuevo Depósito Carga a partir de la tabla de zona influencia depósito.
Paso 6: La variable temporal del Paso 3 se convierte en el nuevo Depósito Descarga.
Paso 7: Se calcula la zona del nuevo Depósito Descarga a partir de la tabla de zona influencia depósito.
Paso 8: El tipo de tramo compara Zona depósito Carga con Zona depósito Descarga (igual → Local, distinta → Larga Distancia).
Paso 9: A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 10: El tramo siguiente se determina automáticamente:
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre (encadenado)
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
AJENA – Programar Punto a Punto
Tramo subcontratado entre Remitente y Destinatario sin pasar por depósito intermedio. La recogida se hace en el domicilio del remitente y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a AJENA - Programar Punto a Punto:
Paso 1: El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: El motivo seleccionado se asigna al campo Depósito Ajena del pedido.
Paso 3: A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
No se programan próximos tramos automáticamente.
AJENA – Programar Recogida
Tramo subcontratado entre Remitente y Depósito Ajena. La recogida se hace en el Remitente y la entrega en Depósito Ajena.
Proceso Cambio de estado de pedido a AJENA - Programar Recogida:
Paso 1: El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: El motivo seleccionado se asigna al campo Depósito Ajena del pedido.
Paso 3: El valor del Depósito Ajena se copia al campo Depósito Descarga del pedido.
Paso 4: A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 5: El tramo siguiente se determina automáticamente:
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
AJENA – Programar Arrastre
Tramo subcontratado entre dos Depósitos en los que uno de ellos es Ajena, generando una orden de recogida en el primer depósito y una de entrega en el segundo.
Proceso Cambio de estado de pedido a AJENA - Programar Arrastre:
Paso 1: El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido.
Paso 2: Si el estado de programación anterior era Entrega Directa, se borran las órdenes generadas no asignadas a ninguna ruta (no planificadas).
Paso 3: El motivo seleccionado en el Paso 1 se guarda en una variable temporal del pedido.
Paso 4: Si el Depósito Descarga actual ≠ vacío, el valor del Depósito Descarga pasa a ser el nuevo Depósito Carga.
Paso 5: Si el Depósito Descarga actual ≠ vacío, se borra la zona del Depósito Carga.
Paso 6: Si el Depósito Descarga actual ≠ vacío, se calcula la nueva zona del Depósito Carga a partir de la tabla de zona influencia depósito.
Paso 7: La variable temporal del Paso 3 se copia al campo Depósito Descarga del pedido.
Paso 8: Se borra la zona del Depósito Descarga.
Paso 9: Se calcula la nueva zona del Depósito Descarga a partir de la tabla de zona influencia depósito.
Paso 10: Se determina el Depósito Ajena definitivo:
Si el tipo del Depósito Descarga = depósito LS → el Depósito Carga se traslada al campo Depósito Ajena
Si el tipo del Depósito Descarga ≠ depósito LS → el Depósito Descarga se traslada al campo Depósito Ajena
Paso 11: A partir del Depósito Ajena resultante, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas.
Paso 12: El tramo siguiente se determina automáticamente:
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
Programar Paquetería
Estado de programación para pedidos de paquetería operados por terceros. En este flujo la mercancía se entrega a un proveedor que se encarga de su entrega. El proveedor puede recoger en Col o se le posiciona la mercancía.
Proceso Cambio de estado de pedido a Programar Paquetería:
Paso 1: El Depósito Descarga actual pasa a ser Depósito Carga.
Paso 2: Se calcula la zona del Depósito de Carga (a partir de la tabla de zona influencia depósito).
Paso 3: Se borra el Depósito Descarga del pedido para evitar datos residuales.
Paso 4: Se borra la Zona Depósito Descarga del pedido para evitar datos residuales.
Paso 5: A partir del Depósito de Carga del pedido, se consulta la tabla Depósito Carga para determinar a qué Operación se asignarán las órdenes generadas.
Paso 6: A partir de la zona de Depósito de Carga del pedido y la Operación determinada en el paso anterior, se consulta la tabla Paquetería para determinar a qué Tipo de Jornada se asignarán las órdenes generadas.
Los cambios más relevantes respecto al texto anterior son el Paso 10 de AJENA-Arrastre (lógica nueva para determinar el Depósito Ajena según tipo de depósito) y la condición "Si Depósito Descarga ≠ vacío" en Programar Arrastre y AJENA-Arrastre, que protege contra datos en blanco antes de ejecutar el traslado. ¿Lo quieres en Word con formato UNIGIS?
Programar Punto a Punto
Tramo entre Remitente y Destinatario sin pasar por depósito intermedio. La recogida se hace en el domicilio del remitente y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a Programar Punto a Punto: 
Paso 1: 
Se calcula y compara la Zona depósito Salida con Zona depósito Llegada (a partir de la tabla de zona influencia depósito) -> si son iguales el tramo es Local, si difieren es Larga Distancia. 
Paso 2:
A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Salida, se consulta la tabla Depósito Salida para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
No se programan próximos tramos automáticamente.
Programar Entrega Directa
Tramo entre un depósito de carga de LS (no desde el remitente) y destinatario. La recogida se hace en el depósito de LS y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a Programar Entrega Directa: 
Paso 0:
Borra las órdenes de paquetería generadas anteriormente si el estado de programación anterior era Paquetería.
Paso 1 y 2:
El valor de Depósito Descarga se traslada a Depósito Carga y se calcula su zona a partir de la tabla de zona influencia depósito (por si se habían actualizado anteriormente en otro estado de programación).
Paso 3 y 4:
Se borra el Depósito Descarga y Zona Depósito Descarga del pedido para evitar datos residuales. 
Paso 5:
El tipo de tramo se calcula comparando Zona depósito Carga con Zona depósito Llegada (igual → Local, distinta → Larga Distancia). 
Paso 6:
A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
No se programan próximos tramos automáticamente.
Programar Recogida
Tramo entre Remitente y Depósito de LS. La recogida se hace en el Remitente y la entrega en el depósito de LS.
Proceso Cambio de estado de pedido a Programar Recogida: 
Paso 1, 2 y 3:
El usuario selecciona el depósito de descarga entre los motivos que aparecen en el cambio de estado del pedido y se asigna al campo Depósito Descarga del pedido, calculando también zona (a partir de la tabla de zona influencia depósito).
Paso 4:
El tipo de tramo compara Zona depósito Salida con Zona depósito Descarga (igual → Local, distinta → Larga Distancia). 
Paso 5:
A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
Paso 6:
El tramo siguiente se determina automáticamente:
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
Programar Arrastre
Tramo entre dos Depósitos de LS, generando una orden de recogida en el primer depósito de LS y una de entrega en el segundo.
Proceso Cambio de estado de pedido a Programar Arrastre: 
Paso 1:
El usuario selecciona el depósito de descarga entre los motivos que aparecen en el cambio de estado del pedido y, si el estado de programación anterior era Entrega Directa, se borran las órdenes generadas y no asignadas a ninguna ruta (no planificadas). 
Paso 2:
El motivo seleccionado en el paso anterior (Depósito Descarga) se guarda en una variable temporal del pedido
Paso 3, 4, 5 y 6:
El Depósito Descarga actual pasa a ser Depósito Carga, y la variable temporal del paso anterior se convierte en el nuevo Depósito Descarga. Se calculan ambas zonas de depósito (a partir de la tabla de zona influencia depósito).
Paso 7:
El tipo de tramo compara Zona depósito Carga con Zona depósito Descarga (igual → Local, distinta → Larga Distancia). 
Paso 8:
A partir del tipo de tramo (Local o Larga Distancia) y en función del Depósito de Carga, se consulta la tabla Depósito Carga para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
Paso 9:
El tramo siguiente se determina automáticamente:
Si Tipo domicilio orden = depósito y Domicilio orden ≠ Depósito descarga → Programar Arrastre (encadenado)
Si Tipo domicilio orden = destinatario → Programar Entrega Directa
AJENA – Programar Punto a Punto
Tramo subcontratado entre Remitente y Destinatario sin pasar por depósito intermedio. La recogida se hace en el domicilio del remitente y la entrega en el domicilio del destinatario.
Proceso Cambio de estado de pedido a AJENA - Programar Punto a Punto: 
Paso 1 y 2:
El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido y se asigna al campo Depósito Ajena del pedido. 
Paso 3:
A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
No se programan próximos tramos automáticamente.
AJENA – Programar Recogida
Tramo subcontratado entre Remitente y Depósito Ajena. La recogida se hace en el Remitente y la entrega en Depósito Ajena.
Proceso Cambio de estado de pedido a AJENA - Programar Recogida: 
Paso 1, 2 y 3:
El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido y se asigna a los campos Depósito Ajena y Deposito Descarga del pedido. 
Paso 4:
A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
Paso 5:
El tramo siguiente se determina automáticamente:
Si Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio = destinatario → Programar Entrega Directa
AJENA – Programar Arrastre
Tramo subcontratado entre dos Depósitos en los que uno de ellos es Ajena, generando una orden de recogida en el primer depósito y una de entrega en el segundo.
Proceso Cambio de estado de pedido a AJENA - Programar Arrastre: 
Paso 1:
El usuario selecciona el depósito ajena entre los motivos que aparecen en el cambio de estado del pedido y, si el estado de programación anterior era Entrega Directa, se borran las órdenes generadas y no asignadas a ninguna ruta (no planificadas). 
Paso 2, 3 ,4, 5 y 6:
El Depósito Descarga actual pasa a ser Depósito Carga, el Depósito Ajena elegido en el paso anterior pasa a ser Depósito Descarga. Se borran ambas zonas de depósito (Carga y Descarga).
Paso 7:
A partir del Depósito Ajena seleccionado, se consulta la tabla Depósito Ajena para determinar a qué Operación y Tipo de Jornada se asignarán las órdenes generadas. 
Paso 8:
El tramo siguiente se determina automáticamente:
Si Domicilio orden ≠ Depósito descarga → Programar Arrastre
Si Tipo domicilio = destinatario → Programar Entrega Directa
Programar Paquetería
Estado de programación para pedidos de paquetería operados por terceros. En este flujo la mercancía se entrega a un proveedor que se encarga de su entrega. El proveedor puede recoger en Col o se le posiciona la mercancía.
Proceso Cambio de estado de pedido a Programar Paquetería: 
Paso 1: 
El Depósito Descarga actual pasa a ser Depósito Carga.
Paso 2:
Se calcula la zona del Depósito de Carga (a partir de la tabla de zona influencia depósito).
Paso 3 y 4:
Se borra el Depósito Descarga y Zona Depósito Descarga del pedido para evitar datos residuales. 
Paso 5:
A partir del Depósito de Carga del pedido, se consulta la tabla Depósito Carga para determinar a qué Operación se asignarán las órdenes generadas. 
Paso 6:
A partir de la zona de Depósito de Carga del pedido y la Operación determinada en el paso anterior, se consulta la tabla Paquetería para determinar a qué Tipo de Jornada se asignarán las órdenes generadas. 
6.3.4 Desprogramación de pedidos
Proceso especial para desprogramar pedidos, aplicable cuando es necesario deshacer varios tramos del ruteo. El sistema verifica primero si las órdenes del tramo anterior o del último tramo ya están ruteadas; si es así, el proceso se cancela para evitar inconsistencias en el flujo logístico. Solo se permite borrar las ordenes de un tramo anterior si no están asignadas a una ruta.
Un fallo en estas validaciones podría llevar a inconsistencias severas en el estado de las rutas y órdenes.
Desprogramacion ultimo tramo – proceso especial de borrado último tramo:
valida si el ultimo tramo tiene ordenes asignadas a ruta:
Si tiene ordenes asignadas -no las borra y detiene el proceso (informando en un campo del pedido)
Si se quiere poder realizar el borrado se deben desasignar las ordenes de la ruta en Planning y volver a ejecutar el proceso
Si no las tiene, borra las ordenes del ultimo tramo
Desprogramacion dos últimos tramos – proceso especial de borrado últimos dos tramos:
- Si el tramo anterior al ultimo programado tiene ordenes asignadas a ruta:
No las borra y se detiene el proceso (informando en un campo del pedido)
Si no las tiene, valida si el ultimo tramo tiene ordenes asignadas a ruta:
Si tiene ordenes asignadas – no las borra y detiene el proceso
Si no las tiene, borra las ordenes del ultimo tramo y el anterior.
Desprogramacion completa – Mismo que el anterior pero con todos los tramos
Programación Semiautomática
El usuario ejecuta proceso sobre uno o varios pedido. UNIGIS analiza los datos y aplica las reglas para programar los cambios de estado de programación igual que en la programación Manual, pero de forma automática.
Tablas auxiliares de programación
Añadir en anexo y referenciar
Tablas deposito – carga, descarga, paqueteria y ajena
Tabla ordentipopedido
6.3.7 Programación MCFS (Multicapacityflow)
El usuario seleccionar uno o varios pedidos y los envía al data collection de MCFS. TMS ejecutará el nuevo algoritmo que determinará los viajes óptimos, sin pasar por el módulo de planificación.
6.3.8 Crear Ruta Manual desde pedidos 
Crear Ruta desde pedidos: el usuario selecciona uno o varios pedidos y crea la ruta sin pasar por el módulo de planificación. Dirigido a FTL.
7. PLANIFICACION (ROUTING)
DATOS PARA PLANIFICACION
• Zonas de ruteo y modelo de condición
cuando sea necesario (zonas dentro de casco urbano…)
 • Escenarios de planificación
Criterios de optimización y reglas de negocio
- Restricciones
Anexo: Lista de restricciones
FLUJO DE PLANIFICACIÓN
7.2.1  Creación de Rutas
Las órdenes ya se encuentran en las Jornadas correspondientes. El planificador debe crear las rutas bien manual o automáticamente.
7.2.2  Creación de Rutas Manual
Al crear una ruta manual se debe definir los datos necesarios (tipo de vehículo, horario de salida y de llegada...), las órdenes a incluir y la secuencia de entrega.
7.2.3 Creación de Rutas Automática
Antes de ejecutar el algoritmo de ruteo, el usuario debe seleccionar la zona/s a tener en cuenta, los tipos de vehículo disponibles en el ruteo, el modelo de condición si es necesario (dentro se configuran las reglas de las zonas) y el escenario de planificación, donde se establecen los criterios de optimización.
Una vez ejecutado el algoritmo, se devolverá la lista de rutas óptimas con las órdenes agrupadas en su interior con su secuencia óptima. Este proceso toma en cuenta diversas configuraciones, como el tiempo de descanso del conductor, horarios de entrega, saturación, balance de rutas... Si el ruteo automático no logra generar rutas viables debido a restricciones no cumplidas, el sistema puede alertar al usuario o dejar las órdenes 'sin rutear' para una intervención manual.
7.2.4 Edición de Rutas
Una vez generada la ruta, el operador evalúa su viabilidad y optimización. Si se detectan mejoras o errores, se pueden realizar modificaciones específicas de rutas. Este ciclo de evaluación y ajuste se repite hasta que la ruta sea considerada óptima.
En este paso se pueden realizar distintas acciones para modificar las rutas: edición masiva de rutas, agregar órdenes entre rutas existentes (manual o automático), mover órdenes entre rutas, reordenar rutas (manual o automático), entre otras.
7.2.5 Asignar Vehículo (opcional)
Un operador puede manualmente vincular un vehículo a una ruta.
7.2.6 Confirmación de Ruta
Una vez que la ruta ha sido definida, ajustada y se le ha asignado un vehículo (si aplica), se procede a su confirmación final. Este cambio de estado a 'Confirmada' marca la ruta como lista para la operación y sirve como disparador para los siguientes procesos logísticos. 
NOTA: Tras la confirmación de la ruta, se crea el viaje automáticamente (si no tiene vehículo y/o conductor se asigna el NO DETERMINADO), y se envía por interfaz los detalles del viaje a los sistemas REFLEX/SGA para su preparación.
8. Ejecución (Viajes)d
Categoria Viaje
 Anexo: Lista Categorias de Viaje 
Estados de Viaje 
Sincronización de estados con Ruta
Anexo: Lista Estados de Viaje
Tipos de Parada
 Según el tipo de orden se generan los tipos de parada correspondientes (mismo nombre e ID que el tipo de orden)
Anexo: Lista Tipos de Parada
Estados de Parada
Sincronización de estados con Orden y Pedido
Anexo: Lista Estados de Parada
FLUJO ASIGNACIÓN DE VIAJE (INICIAL -- > ACTIVO)
8.5.1 Creación del Viaje
Tras confirmar la ruta, el viaje y sus paradas se crean en Unigis TMS de forma automática en  su estado inicial. Además, se crearán las paradas de control por cada parada dentro de los COL propios de LS.
Tras la creación, el sistema evalúa automáticamente si la categoría del viaje es Xdocking.
De ser así, se envía por interfaz mediante EAL la información del viaje y sus paradas a sistemas externos para enviar la Previsión de Carga para su coordinación.  Una vez se tiene la información real de la carga, se actualiza en TMS mediante interfaz con EAL desde los sistemas externos.
Después,  el flujo continúa con la evaluación de la flota.
8.5.2 Validación Transporte
El sistema valida el transporte asignado al viaje. De esta validación se difiere si el tipo de transporte es EVENTUAL o PROPIO / DEDICADO.
Si el tipo de transporte es eventual se abre el flujo de asignación de recursos por agencias.
Si el tipo de transporte es propio o dedicado, se abre el flujo de asignación de recursos por parte de LS.
8.5.3 Asignación de Agencia y Tendering
Cuando el viaje es asignado a una agencia o la agencia tiene disponible el viaje en el portal de Tendering, se requiere que la agencia acepte o rechace el viaje. La agencia seleccionada debe estar validada y disponible para poder aceptar el viaje. Tras la asignación, el viaje cambia automáticamente al estado PENDIENTE AGENCIA y queda publicado y visible con coste en el Portal Transportista para la agencia asignada y que esta pueda aceptar o rechazar el viaje con unas condiciones economicas diferentes, además de asignar vehiculo y conductor si procede (en el caso de no indicarlos se asignaran como No Determinado, a la espera de asignarlos posteriormente).
Si la acepta, el viaje cambia al estado ACEPTADO AGENCIA y el flujo avanza a la asignación de recursos específicos. Si la rechaza (o no responde dentro del plazo establecido), el viaje cambia al estado RECHAZADO AGENCIA y el proceso se redirige al paso de asignación de agencia para intentar una nueva asignación o buscar una alternativa.
8.5.4 Asignación de Vehículo y Conductor
La asignación del vehículo y conductor puede ser ejecutada por la agencia a través de su portal de Transporte (antes de aceptar el viaje) o directamente por el equipo de asignacion de recursos en TMS en casos de asignación directa sin agencia. 
El vehículo y el conductor asignados deben estar dados de alta en el sistema.
Tras el registro exitoso de los recursos, el sistema Unigis actualiza automáticamente el estado del viaje a PROGRAMADO, confirmando que todos los recursos principales están asignados. Durante este paso, el sistema evalúa además si el conductor es nuevo, lo que activa un flujo específico de notificación a nuevos conductores.
8.5.5 Interfaz Muelle Reflex/SGA
Una vez el viaje está en estado PROGRAMADO, se puede recibir en TMS en algún momento desde el WMS mediante interfaz con EAL la información del muelle y el depósito de carga. Esta integración es fundamental para coordinar la logística en el muelle de carga.
8.5.6 Notificación y Aceptación del Conductor
Una vez que el viaje se encuentra en Programado, TMS cambia automáticamente el estado del viaje a PENDIENTE CONDUCTOR (pasando por el estado NUEVO CONDUCTOR en el caso de que el conductor nunca fue asignado a un viaje) y envía una notificación vía SMS al conductor asignado, solicitando la aceptación o rechazo del viaje a través de la aplicación móvil Unigis Deliveries. Si el conductor es nuevo en el sistema, se envian los datos de acceso a la aplicación y sus credenciales mediante SMS.
El conductor cambia en Mobile al estado del viaje a ACEPTADO CONDUCTOR o RECHAZADO CONDUCTOR. 
Si el conductor acepta el viaje, se enviará una notificación al transporte de los recursos requeridos definidos en los domicilios de las paradas del viaje, cuando se requieran recursos adicionales para poder ejecutar el transporte.
Si el viaje permanece X tiempo en pendiente conductor, el sistema cambiará el estado automáticamente a RECHAZADO CONDUCTOR.
Si el viaje está en RECHAZADO CONDUCTOR, el equipo de asignación de recursos debe asociar los nuevos recursos o transporte al viaje.
8.5.7 Activación del Viaje
Con el viaje en estado ACEPTADO CONDUCTOR, cuando el conductor vaya a comenzar el viaje, cambiará el estado del viaje en la aplicación Mobile a ACTIVO. Esta acción activa automáticamente  GPSTracker, que realiza la transmisión de datos de ubicación a los servicios de localización para el seguimiento en tiempo real. Simultáneamente, el sistema genera las notificaciones al transporte y a los destinatarios.
Gestion de Paradas
Cancelacion de viaje
Finalizacion de viaje
Rendicion y liquidacion de viaje?
8. GESTIÓN DE INCIDENCIAS
8.1 Tipos de Incidencia
⚠ Los motivos e incidencias pueden tener etiquetas diferentes para el conductor y para el cliente dador. Configurar doble etiquetado en el catálogo de incidencias.
Campos obligatorios para siniestros: fotos (mínimo 2), descripción, referencias de bultos afectados. El número de expediente SoftExpert debe quedar vinculado a la parada en UNIGIS.
8.2 Flujo Siniestro → SoftExpert
Conductor detecta daño → 2. Selecciona tipo 'Siniestro/Quiebra' en app → 3. Registra fotos, descripción y referencias → 4. UNIGIS envía a SoftExpert → 5. SoftExpert genera expediente → 6. Equipo gestión siniestros coordina con cliente → 7. Estado expediente vuelve a UNIGIS para cierre.
Los siniestros incluyen: contador, motivo, cliente, número de quiebra. Desde TMS se indica cuando el Nº de quiebra está concluido.
📌 Nota: Abono de parking y peajes: se gestiona mediante incidencia económica.
Fuente: [Combinado]
9. LOGÍSTICA INVERSA
9.1 No Entregados / Entregados Parciales / Recolecciones
UNIGIS creará automáticamente una parada en el depósito de llegada del viaje, en la cual se incluirán los ítems no entregados y los no entregados por entrega parcial con sus cantidades correspondientes.
El usuario del almacén interactuará con esta parada desde UNIGIS Mobile para registrar la recepción de los productos.
📌 Nota: Definir qué interfaz se generará y en qué momento para enviar al WMS la recepción esperada de mercancía no entregada.
📌 Nota: Las recolecciones ya tienen su parada de delivery correspondiente, con lo cual deben incluirse en la interfaz de recepciones esperadas con la parada de delivery en el depósito correspondiente.
Fuente: [Maestro]
9.2 Retornos
9.2.1 Retorno Directo al COL Origen
La mercancía no entregada vuelve directamente al COL desde el que salió. El conductor la lleva al COL al final de la jornada. El COL registra la entrada y notifica al ERP.
9.2.2 Retorno Indirecto vía Crossdock
La mercancía no puede volver directamente y pasa por un COL intermedio. El crossdock consolida los retornos y genera movimiento de arrastre hacia el COL origen.
9.2.3 Notificación al WMS
En ambos casos se debe notificar al WMS y al COL de destino para que esperen la recepción de la mercancía.
📌 Nota: Campo parada_dyn: lugar sugerido de retorno. Los pedidos de retorno se identifican actualmente con la marca 'T'.
📌 Nota: La generación de retorno se ejecutará automáticamente como respuesta al cambio de estado cuando el motivo de la incidencia lo estipule. La encuesta con Pallets/Cajas permite generar el retorno con datos fiables.
Fuente: [Consolidado Tarifas]
10. DELEGACIONES AJENAS Y SUBCONTRATACIÓN TI
El tendering es el proceso de licitación de cargas a transportistas externos cuando la flota propia no tiene capacidad.
Plataformas integradas: WTransNet y TUKANE (load boards europeos) — integración programada Q3 2026.
Flujo: planificador identifica ruta → publica en plataforma → transportistas ofertan → planificador acepta → transportista asignado en UNIGIS.
Las delegaciones ajenas son COL de otras empresas logísticas (MRW, SEUR, etc.) donde LS entrega cargas para distribución final. Requieren POD físico o digital. La empresa receptora se registra como transportista externo, a través del sistema de Transporte TI.
7. GESTIÓN DE INCIDENCIAS Y LOGISTICA INVERSA
7.4 No Entregados / Entregados Parciales / Recolecciones
UNIGIS creará automáticamente una parada en el depósito de llegada del viaje, en la cual se incluirán los ítems no entregados y los no entregados por entrega parcial con sus cantidades correspondientes.
El usuario del almacén interactuará con esta parada desde UNIGIS Mobile para registrar la recepción de los productos.
📌 Nota: Definir qué interfaz se generará y en qué momento para enviar al WMS la recepción esperada de mercancía no entregada.
📌 Nota: Las recolecciones ya tienen su parada de delivery correspondiente, con lo cual deben incluirse en la interfaz de recepciones esperadas con la parada de delivery en el depósito correspondiente.
Fuente: [Maestro]
7.5 Incidencias
7.5.1 Tipos de Incidencia
⚠ Los motivos e incidencias pueden tener etiquetas diferentes para el conductor y para el cliente dador. Configurar doble etiquetado en el catálogo de incidencias.
Campos obligatorios para siniestros: fotos (mínimo 2), descripción, referencias de bultos afectados. El número de expediente SoftExpert debe quedar vinculado a la parada en UNIGIS.
7.5.2 Flujo Siniestro → SoftExpert
1. Conductor detecta daño → 2. Selecciona tipo 'Siniestro/Quiebra' en app → 3. Registra fotos, descripción y referencias → 4. UNIGIS envía a SoftExpert → 5. SoftExpert genera expediente → 6. Equipo gestión siniestros coordina con cliente → 7. Estado expediente vuelve a UNIGIS para cierre.
Los siniestros incluyen: contador, motivo, cliente, número de quiebra. Desde TMS se indica cuando el Nº de quiebra está concluido.
📌 Nota: Abono de parking y peajes: se gestiona mediante incidencia económica.
Fuente: [Combinado]
7.6 Retornos
7.6.1 Retorno Directo al COL Origen
La mercancía no entregada vuelve directamente al COL desde el que salió. El conductor la lleva al COL al final de la jornada. El COL registra la entrada y notifica al ERP.
7.6.2 Retorno Indirecto via Crossdock
La mercancía no puede volver directamente y pasa por un COL intermedio. El crossdock consolida los retornos y genera movimiento de arrastre hacia el COL origen.
7.6.3 Notificación al WMS
En ambos casos se debe notificar al WMS y al COL de destino para que esperen la recepción de la mercancía.
📌 Nota: Campo parada_dyn: lugar sugerido de retorno. Los pedidos de retorno se identifican actualmente con la marca 'T'.
📌 Nota: La generación de retorno se ejecutará automáticamente como respuesta al cambio de estado cuando el motivo de la incidencia lo estipule. La encuesta con Pallets/Cajas permite generar el retorno con datos fiables.
Fuente: [Consolidado Tarifas]
7.7 Delegaciones ajenas y subcontratación TI
El tendering es el proceso de licitación de cargas a transportistas externos cuando la flota propia no tiene capacidad.
• Plataformas integradas: WTransNet y TUKANE (load boards europeos) — integración programada Q3 2026.
• Flujo: planificador identifica ruta → publica en plataforma → transportistas ofertan → planificador acepta → transportista asignado en UNIGIS.
Las delegaciones ajenas son COL de otras empresas logísticas (MRW, SEUR, etc.) donde LS entrega cargas para distribución final. Requieren POD físico o digital. La empresa receptora se registra como transportista externo.
8. ALARMAS
Definir un conjunto de alarmas operativas básicas para el seguimiento en tiempo real del estado de la operación. Las alarmas se configurarán en el módulo de notificaciones de UNIGIS.
[Pendiente de definición técnica de mapeo]
Alarmas mínimas propuestas (a validar con LS):
• Viaje con retraso en llegada a parada (tiempo estimado superado).
• Parada sin confirmar tras N minutos desde la llegada.
• Pedido sin contrato asignado.
• DomicilioOrden sin geocodificar.
• Pedido con fecha de entrega vencida.
• Incidencia de tipo Siniestro registrada.
• KM mensuales de flota dedicada próximos al límite contractual.
Fuente: [Maestro]
9. NOTIFICACIONES
Las notificaciones definen los mensajes automáticos enviados a usuarios del sistema o externos en respuesta a eventos operativos.
[Pendiente de definición técnica de mapeo]
Notificaciones mínimas identificadas:
• Notificación de documentos al transportista al despachar el viaje (Contrato de Transporte / Orden de Carga).
• Notificación de cancelación de viaje al transportista anterior + nuevo contrato al nuevo transportista.
• Notificación al WMS de retorno esperado de mercancía.
• Notificación al cliente dador ante incidencia en entrega (con enlace a LS TOOLS para respuesta del cliente).
• Notificación a delegaciones de un resumen del mapa de carga (Excel por email).
📌 Nota: LS solicita enviar al cliente dador un enlace a TMS para responder incidencias. El canal de entrada es LS TOOLS. La respuesta se guarda en la bitácora del pedido o del viaje.
📌 Nota: Revisar si las notificaciones son iguales a las definidas en la Fase 1 o requieren actualización.
Fuente: [Maestro]
10. DASHBOARD Y REPORTING
10.1 Panel de Control (Dashboard)
Dashboard operativo en tiempo real con:
• Mapa de rutas activas con posición GPS de los conductores.
• Estado de todas las rutas del día por COL: planificadas, confirmadas, en curso, finalizadas.
• Alertas de retrasos: paradas con tiempo estimado de llegada superado.
• KPIs diarios: tasa de entrega exitosa, incidencias, retornos.
10.2 Reporting
Informes requeridos:
📌 Nota: Reporting externo para dirección de LS mediante Power BI (a confirmar la integración con UNIGIS).
Fuente: [Combinado]
GLOSARIO
Términos de la operación de Luis Simões y del sistema UNIGIS TMS utilizados en este documento.

--- TABLE START ---
Término | Definición
COL | Centro de Operaciones Logísticas — depósito/hub de LS en la red de distribución
EAL / MW | Enterprise Application Layer / MiddleWare — componente de integración entre ERP y TMS
ERP | Enterprise Resource Planning — sistema de gestión empresarial de LS
TMS | Transportation Management System — el sistema UNIGIS que se implanta
OM | Order Management — módulo de gestión de órdenes en UNIGIS
MCFS | Motor de Cálculo de Frecuencias y Secuencias — optimizador de rutas de UNIGIS
DomicilioOrden | Dirección específica de entrega dentro de una orden
ClienteOrden | Cabecera de la orden de transporte (orden principal)
Domicilio Fijo | Dirección de entrega registrada en el maestro con coordenadas y restricciones
Domicilio Variable | Dirección de entrega específica de la orden, no en el maestro
OrdenTipoPedido | Tabla que mapea tipos de pedido ERP a jornadas de planificación UNIGIS
Tabla de Influencia | Mapeo de código postal (CP) a COL de distribución responsable
Arrastre | Transporte de mercancía entre dos COL (trunking / line-haul)
Crossdock | COL que actúa como punto intermedio de consolidación
Tendering | Proceso de licitación de cargas a transportistas externos
WTransNet / TUKANE | Plataformas de load board para tendering de cargas en Europa
SoftExpert | Sistema externo de LS para gestión de reclamaciones y siniestros
e-CMR | Carta de Porte electrónica — versión digital del CMR en papel
TransFollow | Plataforma europea de gestión de e-CMR
POD | Proof of Delivery — prueba de entrega (firma digital + timestamp + geolocalización)
GAP | Funcionalidad requerida no existente en el estándar UNIGIS; requiere desarrollo
Spot | Transportista o conductor externo contratado puntualmente, sin cuenta en el sistema
Delegación Ajena | COL de otra empresa logística donde LS entrega cargas para distribución final
OCR | Optical Character Recognition — reconocimiento automático de texto en documentos
PBS / PBL | Picking by Stock / Picking by Line — categorías de producto para tarifación
LPN | License Plate Number — número de etiqueta de unidad de carga
DIST | Perfil Planificador / Distribuidor — usuario con permisos de planificación operativa
SAC | Servicio de Atención al Cliente — perfil con permisos de gestión comercial del pedido
--- TABLE END ---

Términos adicionales de UNIGIS (fuente: documento EUP):
Alta de Usuarios: Es la creación de usuarios en el set up de Unigis.
Alta de vehículos: Es la creación de vehículos en el set up de Unigis. Esta creación se realiza de forma automática a través de integración de gps previa solicitud del cliente o de forma manual en el set up.
Cliente orden: Es el destinatario al cual se le debe entregar la carga.
Consolidación: Es el proceso por el cual se agrupan órdenes basados en reglas y que tienen la misma fecha de entrega.
Depósitos:  Son los lugares donde se inicia o finaliza un servicio, por ejemplo, los centros de distribución o proveedores.
Domicilio orden: Es el domicilio de destino del cliente orden, es donde debe llegar la carga.
Escenario de ruteo: Configuración de las reglas de planificación.
Encuesta: Es un formulario que contiene un conjunto de preguntas tipificadas y que son aplicables a las transiciones de los cambios de estados de paradas. Aplican para la aplicación mobile y Unigis Tracking.
Empresa: Es la unidad organizacional principal del TMS
Estado: Es una breve descripción de cómo se encuentra una entidad en determinado momento. Existen estados configurables para el pedido, pedidoitem, la orden, la ruta, el viaje, transporte y la parada.
Geocerca: Es una zona que se configura en UNIGIS para gatillar cambios de estado automático o alertas cuando ingresa o sale de esa zona.
Geocodificación: es el proceso de convertir direcciones postales o puntos geográficos de interés en coordenadas geográficas (Latitud, Longitud), para luego localizarlas y visualizarlas en un mapa.
Ítems: Es la información detalla de los productos que forman parte de un pedido. Un pedido puede estar conformado por uno o más ítems.
Jornada: Es la fecha operativa, es decir, define la fecha de ejecución de los servicios y tareas a realizar en cada operación.
Muelle: Es el punto donde se realiza la carga y descarga de cada viaje dentro de un depósito, se planean sus ocupaciones y disponibilidades.
Operación: Es la unidad operativa de trabajo, cada una tiene su comportamiento, configuración, grupos de usuarios, datos y procesos de forma segmentada. Es el servicio que se presta en un determinado lugar, todo lo que se susceptible a ser planificado de manera conjunta, tiene ir en la misma operación.
Orden: Es la entidad ejecutiva mediante la cual se ordena realizar una actividad. Un pedido puede requerir N órdenes para cumplirse y estas pueden ser de tipo pickup o delivery.
Parada: Contiene los datos de cada una de las entregas o recolecciones a realizar. Por cada orden se genera una parada. Las paradas están relacionadas a un viaje.
Pedido: Es la solicitud de movimiento de carga. Es el compromiso de servicio de entrega, recolección y/o visita, por ende, contiene los datos necesarios para saber en dónde recolectar los productos, donde entregarlos, las fechas y demás datos sobre el servicio solicitado.
Portal B2C: Es un portal donde el cliente final puede realizar el seguimiento del producto y la trazabilidad de entrega. Pueden ser configurables para cada cliente.
Recorrido: Es el conjunto de trayectos y zonas que se deben controlar de forma automática o que están habilitadas para un viaje, por ejemplo, zonas de peligro, vías donde se puede transitar, zonas de paradas, zonas de control de velocidad, etc.
Ruta: Es la planificación de un servicio de transporte que se debe realizar por un tipo de vehículo, con una secuencia optimizada de las órdenes. La ruta agrupa órdenes de entrega y pertenece a una jornada (día determinado).
Sucursal: Segmentación organizacional geográfica y/o por negocio de la empresa.
Ventana horaria: son los rangos horarios en los que se puede visitar a cada cliente.
Viaje: Es la ejecución del servicio de transporte. Como datos obligatorios siempre va a requerir un vehículo y un conductor.
Zonas: Es un conjunto de ubicaciones geográficas que permiten segmentar el mapa de acuerdo con diferentes reglas, por ejemplo, zonas de restricción vial, por riesgo, por tipo de vehículos, por horarios, etc.
ANEXO TÉCNICO — WORKFLOWS, CONFIGURACIÓN Y PARAMETRIZACIONES
Este anexo contiene todas las tablas de detalle referenciadas en el cuerpo del documento. Campos marcados PENDIENTE requieren completar información por LS o revisión UNIGIS.
A.1 Matriz de Transición de Estados — Pedido (Ciclo de Vida)

--- TABLE START ---
Estado Origen | Estado Destino permitido | Perfil | Condición / Observación
Inicial | Confirmado / Error | Automático | Resultado de validación automática de campos
Error | Confirmado / Programable | SAC | Tras corrección y re-validación
Confirmado | Error / Registrado OK / Programable | Automático | Según resultado de validación
Registrado OK | Confirmado / Programable | SAC | Corrección o habilitación para planificar
Programable | Estados de programación (Prog. P.a.P, Entrega Dir., Recogida, Arrastre, Ajena, Paquetería) | DIST | Según condición Tipo DomicilioOrden2 (ver nota)
Cualquier estado de programación | Programable (reactivar) | DIST | PE: solo si estado ejecución = No Entregado / Entregado Parcial
Cualquier estado de programación | Replanificar | DIST | PE: solo si estado ejecución = No Entregado / Entregado Parcial
Replanificar | Confirmado / Retorno Cliente | DIST | Reprogramación del pedido
Reprogramable | Reentrega / Retorno Depósito Origen / Retorno Cliente | DIST | Según resolución del Control Tower
Reentrega | Estados de programación | DIST | Nuevo ciclo de programación para la re-entrega
--- TABLE END ---

A.1.2 Estados de Ciclo de Vida del Pedido — Detalle

--- TABLE START ---
Código | Nombre | Descripción | Editable | Grupo
INICIAL | Inicial | Pedido recibido, pendiente de validación automática | Sí (SAC) | SAC
ERROR | Error | Falló la validación de campos obligatorios | Sí (SAC) | SAC
CONFIRMADO | Confirmado | Pedido validado y confirmado por el sistema | Sí (SAC) | SAC
REGISTRADO-OK | Registrado OK | Validación completa sin errores | Sí (SAC, solo info operacional) | SAC/DIST
PROGRAMABLE | Programable | Pedido listo para ser programado en tramos por el planificador | Sí (solo info operacional) | DIST
ANULADO | Anulado | Pedido anulado — requiere verificación con WMS | No | SAC
--- TABLE END ---

A.1.3 Transiciones de Ciclo de Vida del Pedido — Detalle

--- TABLE START ---
Estado Origen | Acción / Trigger | Estado Destino | Quién | Validación requerida
Inicial | Validación automática OK | Confirmado | Automático | Campos obligatorios completos sin errores
Inicial | Error en validación | Error | Automático | Campos obligatorios incompletos o inválidos
Error | Corrección por SAC + re-validación | Confirmado | SAC | Realizar validaciones tras corrección
Error | Corrección SAC → programar | Programable | SAC | Corrección y validación OK
Confirmado | Error detectado | Error | Automático | Nuevos errores detectados
Confirmado | Validación sin errores | Registrado OK | Automático | Sin errores de validación
Confirmado | Validación → Programable | Programable | Automático | Sin errores de validación
Registrado OK | Corrección SAC | Confirmado | SAC | Re-validar tras corrección
Registrado OK | Programar por planificador | Programable | SAC | Campos obligatorios OK
Programable | Replanificar | Confirmado | DIST | Estado de ejecución = no entregado o entregado parcial
Anulado | Verificar con WMS | — | SAC | Verificar impacto en WMS antes de anular
--- TABLE END ---

A.1.4 Estados de Programación del Pedido

--- TABLE START ---
Estado Programación | Descripción | Tipo Jornada determinada | Automática | Usuario
Programar Punto a Punto | Pedido punto a punto fuera de depósitos propios o ajenos | Local / LD según zonas | No | DIST
Programar Entrega Directa | Recogida en depósito + entrega en destinatario | Local / LD según zonas | Sí (si procede) | DIST
Programar Recogida | Recogida en remitente + entrega en COL | Local / LD según zonas | No | DIST
Programar Arrastre | Recogida en COL + entrega en COL destino/crossdock | Larga Distancia | Sí (si procede) | DIST
AJENA - Programar Punto a Punto | Entrega a delegación ajena — punto a punto | Según tabla depósitos ajenas | No | DIST
AJENA - Programar Arrastre | Arrastre con destino delegación ajena | Según tabla depósitos ajenas | No | DIST
AJENA - Programar Recogida | Recogida con destino delegación ajena | Según tabla depósitos ajenas | No | DIST
Programar Paquetería | Paquetería canalizada a operador externo | Paquetería por zona | No | DIST
Replanificar | Replanificar pedido en curso (no entregado/parcial) | — | No | DIST
Reprogramable | Estado intermedio para reprogramación | — | No | DIST
Reentrega/Rerecogida | Nuevo intento de entrega o recogida | — | No | DIST
Retorno Depósito Origen | Mercancía retorna al depósito de origen | — | No | DIST
Retorno Cliente | Mercancía retorna al cliente dador | — | No | DIST
--- TABLE END ---

A.2 Tabla de Determinación de Tipo de Tramo y Jornada

--- TABLE START ---
Regla | Condición | Resultado
Tipo de Tramo (desde depósitos) | Zona Depósito Carga = Zona Depósito Descarga | LOCAL
Tipo de Tramo (desde depósitos) | Zona Depósito Carga ≠ Zona Depósito Descarga | LARGA DISTANCIA
Tipo de Tramo (Punto a Punto / Recogida) | Zona Depósito Salida = Zona Depósito Descarga | LOCAL
Tipo de Tramo (Punto a Punto / Recogida) | Zona Depósito Salida ≠ Zona Depósito Descarga | LARGA DISTANCIA
Jornada + Operación | Depósito Carga + Tipo Tramo | Ver Tabla depósito Carga (hoja Depositos del Excel)
Jornada + Operación (Ajenas) | Depósito Ajena | Ver Tabla depósito Ajenas (hoja Depositos del Excel)
Jornada + Operación (Paquetería) | Zona Depósito Carga | Ver Tabla Paquetería (hoja Depositos del Excel)
--- TABLE END ---

A.2.1 Tipos de Jornada — Tabla Completa por COL

--- TABLE START ---
Tipo de Jornada | Operación
PT Porto Local | PT Noroeste
PT Noroeste Larga Distancia | PT Noroeste
PT Coimbra Local | PT Noroeste
PT Noroeste Paquetería | PT Noroeste
PT Ajena - Vila Real | PT Noroeste
PT Ajena - Braga | PT Noroeste
PT Lisboa Local | PT Sudoeste
PT Algarve Local | PT Sudoeste
PT Sudoeste Paquetería | PT Sudoeste
PT Sudoeste Larga Distancia | PT Sudoeste
PT Ajena LISB | PT Sudoeste
PT Ajena PTOM | PT Sudoeste
PT Ajena MARS | PT Sudoeste
PT Ajena EVR | PT Sudoeste
PT Ajena ALC | PT Sudoeste
ES Barcelona Local | Nordeste Barcelona
ES Barcelona Larga Distancia | Nordeste Barcelona
ES Barcelona Paquetería | Nordeste Barcelona
ES Madrid Local | Centro Norte Madrid
ES Madrid Larga Distancia | Centro Norte Madrid
ES Madrid Paquetería | Centro Norte Madrid
ES Valencia Local | Nordeste Valencia
ES Valencia Larga Distancia | Nordeste Valencia
ES Valencia Paquetería | Nordeste Valencia
ES Sevilla Local | Sur Sevilla
ES Sevilla Larga Distancia | Sur Sevilla
ES Sevilla Paquetería | Sur Sevilla
--- TABLE END ---

⚠  PENDIENTE CLIENTE (LS): Completar los tipos de jornada local de España y los tipos de Delegaciones Ajenas.
A.2.2 Tabla COL de Carga → Tipo Jornada y Operación

--- TABLE START ---
Depósito Carga | Tipo Tramo | Tipo Jornada | Operación
Guadalajara | Local | ES Madrid Local | Centro Norte Madrid
Guadalajara | Larga Distancia | ES Madrid Larga Distancia | Centro Norte Madrid
Centralidad | Local | ES Madrid Local | Centro Norte Madrid
Centralidad | Larga Distancia | ES Madrid Larga Distancia | Centro Norte Madrid
Lliça del Vale | Local | ES Barcelona Local | Nordeste Barcelona
Lliça del Vale | Larga Distancia | ES Barcelona Larga Distancia | Nordeste Barcelona
--- TABLE END ---

A.2.3 Tabla COL de Salida → Tipo Jornada y Operación

--- TABLE START ---
Depósito Salida | Tipo Tramo | Tipo Jornada | Operación
Guadalajara | Local | ES Madrid Local | Centro Norte Madrid
Guadalajara | Larga Distancia | ES Madrid Larga Distancia | Centro Norte Madrid
Zona Franca | Local | ES Barcelona Local | Nordeste Barcelona
Zona Franca | Larga Distancia | ES Barcelona Larga Distancia | Nordeste Barcelona
--- TABLE END ---

A.2.4 Tabla Depósitos Ajenas → Tipo Jornada y Operación

--- TABLE START ---
Depósito Ajena | Tipo Jornada | Operación
Vila Real Ajena | PT Ajena - Vila Real | PT Noroeste
--- TABLE END ---

A.2.5 Tabla Paquetería → Operación y Jornada

--- TABLE START ---
Zona Depósito Carga (Paquetería) | Operación | Tipo Jornada
Porto | PT Noroeste | PT Noroeste Paquetería
Coimbra | PT Noroeste | PT Noroeste Paquetería
Lisboa | PT Sudoeste | PT Sudoeste Paquetería
Algarve | PT Sudoeste | PT Sudoeste Paquetería
--- TABLE END ---

A.3 Flujos de Pasos Técnicos por Estado de Programación (Resumen)

--- TABLE START ---
Estado | Paso 0 | Paso 1 | Paso 2 | Pasos siguientes
Programar Punto a Punto | — | Atribuir tipo de tramo (Zona Salida vs. Zona Llegada) | Atribuir Tipo Jornada + Operación (Tabla depósito Salida) | —
Programar Recogida | — | Seleccionar motivo (depósito descarga) | Atribuir Depósito Descarga desde motivo | Calcular zona descarga → Tipo tramo → Jornada → Prog. siguiente tramo
Programar Entrega Directa | Borrar órdenes paquetería si último estado es Paquetería | Atribuir depósito Carga (desde depósito Descarga) | Calcular zona depósito Carga | Borrar depósito Descarga → Tipo tramo → Jornada
Programar Arrastre | — | Seleccionar motivo + borrar órdenes si estado anterior = Entrega Directa | Atribuir depósito Carga (desde depósito Descarga) | Calcular zona Carga → Atribuir depósito Descarga → Tipo tramo → Jornada → Prog. siguiente
AJENA - Programar Punto a Punto | — | Seleccionar motivo (depósito ajena) | Atribuir a depósito ajena | Atribuir Tipo Jornada + Operación (Tabla depósitos ajenas)
--- TABLE END ---

A.3.2 Flujos de Pasos Técnicos — Detalle Completo

--- TABLE START ---
Estado | Paso 1 | Paso 2 | Paso 3 | Paso 4 | Paso 5 | Paso 6+
Prog. Punto a Punto | Atribuir tipo de tramo (Zona Salida vs Llegada) | Atribuir Tipo Jornada + Operación (Tabla depósito Salida) | — | — | — | —
Prog. Recogida | Seleccionar motivo (depósito descarga) | Atribuir Depósito Descarga desde motivo | Calcular zona depósito descarga | Atribuir tipo de tramo | Atribuir Tipo Jornada + Operación | Prog. tramo siguiente (Arrastre o Entrega Directa)
Prog. Entrega Directa | (Paso 0: Borrar órdenes paquetería si último = Paquetería) Atribuir depósito Carga (desde depósito Descarga) | Calcular Zona depósito Carga | Borrar depósito Descarga | Borrar zona depósito descarga | Atribuir tipo de tramo | Atribuir Tipo Jornada + Operación (Tabla depósito Carga)
Prog. Arrastre | Seleccionar motivo + (borrar órdenes si ant.=Entrega Dir.) | Atribuir motivo a variable temporal | Atribuir depósito Carga (desde depósito Descarga) | Calcular zona depósito Carga | Atribuir variable a depósito Descarga → calcular zona descarga → tipo tramo → jornada | Prog. tramo siguiente (Arrastre o Entrega Directa según tipo DO)
AJENA Punto a Punto | Seleccionar motivo (depósito ajena) | Atribuir a depósito ajena | Atribuir Tipo Jornada + Operación (Tabla depósitos ajenas) | — | — | —
AJENA Arrastre | Seleccionar motivo (depósito ajena) + borrar órdenes si ant.=Entrega Dir. | Atribuir motivo a depósito ajena | Atribuir depósito descarga a depósito carga | Copiar depósito ajena a depósito descarga | Atribuir Tipo Jornada + Operación (Tabla ajenas) | Prog. tramo siguiente
AJENA Recogida | Seleccionar motivo (depósito ajena) | Atribuir motivo a depósito ajena | Copiar depósito ajena a depósito descarga | Atribuir Tipo Jornada + Operación (Tabla ajenas) | Prog. tramo siguiente | —
Prog. Paquetería | Atribuir depósito descarga a depósito carga | Calcular zona depósito carga | Borrar depósito descarga | Borrar zona depósito descarga | Atribuir Operación (Tabla depósito carga) | Atribuir Tipo Jornada (Tabla Paquetería)
--- TABLE END ---

A.4 Estados de Ejecución de Paradas — Catálogo

--- TABLE START ---
Código | Nombre | Descripción | Tipo parada aplicable
1 | Inicial | Parada creada, pendiente de ruteo | Todos
2 | Ruteada | Parada asignada a una ruta | Todos
4 | En Viaje | Conductor en ruta hacia esta parada | Todos
20 | Arribo a parada | Conductor llegó al domicilio | Todos
1035 | Recolectado en Cliente | Colecta física realizada en dependencias del cliente | 51 - RECOLECCION CLIENTE
1045 | Entregado en COL Salida | Llegada y descarga en almacén de origen (COL Salida) | 52 - ENTREGA COL SALIDA
1055 | Recolectado en Deleg. Origen | Carga del vehículo troncal desde almacén origen | 53 - RECOLECCION COL SALIDA
1115 | Entregado en COL Crossdock | Llegada y descarga en hub de crossdock central | 100 - ENTREGA COL CROSSDOCK
1215 | Recolectado en Deleg. Crossdock | Carga en el hub con destino al centro de reparto local | 101 - RECOLECCION COL CROSSDOCK
1255 | Entregado en COL Llegada | Llegada y descarga en centro de distribución local | 54 - ENTREGA COL LLEGADA
1275 | Recolectado en Depósito Llegada | Carga en vehículo de última milla | 53 - RECOLECCION COL SALIDA (reparto)
1315 | Entregado en Destinatario | Hito final de entrega física al destinatario | 1201 - ENTREGA DESTINATARIO
NO_ENTREGADO | No Entregado | Entrega no realizada — requiere gestión | 1201
ENTREGADO_PARCIAL | Entregado Parcial | Solo parte de la mercancía entregada | 1201
NO_RECOLECTADO | No Recolectado | Recogida no realizada | 51
RECOLECTADO_PARCIAL | Recolectado Parcial | Solo parte de la mercancía recolectada | 51
--- TABLE END ---

A.4.2 Estados de Ejecución de Paradas — Etiquetas LS

--- TABLE START ---
Código | Etiqueta TMS | Etiqueta LS propuesta | Tipo parada | Descripción
1 | Inicial | Inicial | Todos | Parada creada, pendiente
2 | Ruteada | Ruteada | Todos | Asignada a ruta
4 | En Viaje | En Viaje | Todos | Conductor en ruta
20 | Arribo a parada | Arribo a parada | Todos | Conductor llegó al domicilio
1035 | Recolectado en Cliente | Recolectado en Cliente | 51 | Colecta física en dependencias del cliente
1045 | Entregado en COL Salida | Entregado en COL Origen | 52 | Llegada y descarga en almacén de origen
1055 | Recolectado en Deleg. Origen | Recolectado en COL Origen | 53 | Carga del vehículo troncal desde almacén MD
1115 | Entregado en COL Crossdock | Entregado en COL Crossdock | 100 | Llegada y descarga en hub de crossdock central
1215 | Recolectado en Deleg. Crossdock | Recolectado en COL Crossdock | 101 | Carga en hub BL hacia centro de reparto
1255 | Entregado en COL Llegada | Entregado en COL Reparto | 54 | Llegada y descarga en centro de distribución local
1275 | Recolectado en Depósito Llegada | Recolectado en COL Reparto | 53 (reparto) | Carga en vehículo de última milla
1315 | Entregado en Destinatario | Entregado en Destinatario | 1201 | Hito final de entrega física
--- TABLE END ---

A.5 Entidades del Modelo Conceptual UNIGIS

--- TABLE START ---
Entidad | Descripción funcional | Relaciones clave | Estados | Procesos principales
Deposito | Almacén físico o hub operado por LS o corresponsales. Nodo origen/destino del transporte. | Pedido.IdDepositoSalida, Pedido.IdDepositoLlegada, Viaje.IdDeposito | Activo / Inactivo | Ingesta de pedidos, ruteo, intermediación crossdock
Cliente (Dador) | Entidad jurídica contratante que solicita y paga servicios de transporte. | 1:N con Pedido (Pedido.IdCliente), padre de ClienteOrden | Activo / Inactivo / Bloqueado | Integración pedidos, cálculo facturación
ClienteOrden | Destinatario/consignatario del envío según perspectiva del cliente dador. | FK a Cliente; vinculado a Pedido.IdClienteOrden | Activo / Inactivo | Validación y asignación en ingesta del pedido
DomicilioOrden | Dirección geográfica exacta con coordenadas GPS para ruteo. | Pedido.IdDomicilioOrden (descarga), Pedido.IdDomicilioOrden2 (carga) | Normalizado/Geocodificado / No Geocodificado / Inválido | Validación, zonificación, secuenciación en ruta
Pedido | Orden comercial original del cliente dador a LS. | Vinculado a Cliente, DomicilioOrden, Deposito; padre de Orden | Inicial / Error / Confirmado / Registrado OK / Programable + estados de programación | Integración API/EDI, validación, control estados, facturación
Orden | Unidad de planificación física (tramo logístico ejecutable de un pedido). | N:1 con Pedido; vinculada a Parada en planificación | Pendiente / Ruteada / Despachada / Entregada | Planeación transporte, decalajes crossdock
Ruta | Agrupación lógica secuenciada de paradas por unidad de transporte. | Agrupa múltiples Órdenes; se traduce en un Viaje al confirmarse | Borrador / Diseñada / Optimizada / Aprobada | Optimización de rutas (MCFS), despacho manual
Viaje | Ejecución física de una ruta por un vehículo y conductor. | Ejecuta una Ruta; contiene múltiples Paradas; vinculado a Vehículo, Conductor, Transportista | Pendiente (1) / Programado (9) / Activo (100) / Finalizado (300) / Cancelado (501) / Rendido / Digitalizado / Liquidable | Despacho, seguimiento GPS, liquidación
Parada | Hito de detención del vehículo durante el viaje para entrega/recogida. | 1:1 con Viaje; vinculada a la Orden correspondiente | Inicial (1) / Ruteada (2) / En Viaje (4) / Arribo (20) / Estados de ejecución (1035…1315) | UNIGIS Mobile, POD, incidencias
Guía | Documento legal/fiscal que ampara el tránsito de mercancías. | Vinculada al Viaje (guía de viaje) o al Pedido/Orden (carta de porte) | Borrador / Emitida / Impresa / Fiscalizada / Anulada | Emisión legal, validación AT (PT)
Liquidación | Cierre económico del servicio de transporte. | Vinculada al Viaje (coste transportista) y al Pedido (venta cliente) | Pendiente / Calculada / Pre-aprobada / Aprobada / Conciliada | Evaluación tarifas, cobro desvíos, gestión incidencias económicas
--- TABLE END ---

A.6 Tabla de Depósitos

--- TABLE START ---
Campo | Descripción | Observaciones
IdDeposito | Identificador único del depósito | Clave primaria TMS
Nombre | Nombre del COL | Ej: Guadalajara, Lliça del Vale, Porto
TipoDeposito | Propio LS / Ajena / Crossdock / Puerto | Determina el tipo de parada asociada
Horario |  | 
Dirección / coordenadas |  | 
--- TABLE END ---


--- TABLE START ---
Depósito
Guadalajara
Guadalajara
Centralidad
Centralidad
Lliça del Vale
Lliça del Vale
Zona Franca (Depósito Salida)
Zona Franca (Depósito Salida)
Vila Real Ajena
--- TABLE END ---

⚠  PENDIENTE CLIENTE (LS): Completar el listado completo de depósitos activos con códigos, direcciones y áreas de influencia.
⚠  PENDIENTE UNIGIS: Completar datos de configuración (muelles, horarios, restricciones) tras sesión con LS.
A.T1 Tabla de Tipos de Vehículo

--- TABLE START ---
Atributo | Descripción | Observaciones
Matrícula | Número de matrícula | G2 — GAP: Validar contra DGT/registros oficiales
TipoVehiculo | Lona / Refrigerado / Carrozado-Furgoneta / Tráiler | Tipologías base confirmadas en onsite
Capacidad (kg/m³) | Capacidad máxima del vehículo | Para optimización de carga
Dimensiones | Longitud útil en metros lineales | Para restricciones de carga
Flota | Propia / Dedicada / Eventual | Determina el modelo tarifario a aplicar
Restricciones | Por tipo de mercancía, cliente o domicilio | Configurables en módulo de restricciones
--- TABLE END ---

⚠  PENDIENTE: Completar capacidades (peso, volumen, bultos, paradas máximas) con Gonzalo y LS Operaciones.
A.T2 Tabla de Categorías de Vehículo
⚠  PENDIENTE: Las categorías de vehículo deben definirse en la sesión de tarifación con LS Comercial y LS Operaciones.
A.T3 Tabla de Líneas y Sublíneas de Producto
⚠  PENDIENTE CLIENTE (LS): Completar catálogo completo de líneas y sublíneas de producto.
A.T4 Campos Obligatorios del Pedido
Copia de la sección 5.1.5 para consulta rápida.

--- TABLE START ---
Campo | Descripción | Origen | Obligatorio
ReferenciaExterna | Nº Pedido ERP (Ordem.IDOrdem Middleware) | EAL/MW | Sí
ReferenciaAdicional | Código ordem cliente (Nº Ordem) | EAL/MW | Sí
ReferenciaAdicional2 | Nº destinatario para esta orden | EAL/MW | Sí
ClienteDador | Referencia del cliente dador | EAL/MW | Sí
Contrato | Nº de contrato asociado al pedido | EAL/MW o TMS | Sí (bloqueante)
FechaEntregaDesde | Ventana inicio de entrega acordada | EAL/MW | Sí
FechaEntregaHasta | Ventana fin de entrega acordada | EAL/MW | Sí
FechaEntregaMaxima | Fecha límite absoluta de entrega | EAL/MW | Sí
FechaLimitePreparacion | Fecha límite para preparar el pedido | EAL/MW | Sí
FechaRecoleccionDesde | Ventana inicio de recolección | EAL/MW | Sí
FechaRecoleccionHasta | Ventana fin de recolección | EAL/MW | Sí
DepositoSalida | Depósito origen (asignado por automatismo) | TMS | Sí (auto)
DepositoLlegada | Depósito destino (asignado por automatismo) | TMS | Sí (auto)
Operacion | Operación asignada (por automatismo) | TMS | Sí (auto)
TipoPedido | Tipo de pedido (por automatismo) | TMS | Sí (auto)
TipoCarga | Frio/Seco/Peligrosas/Alimentos… | EAL/MW | Sí
TipoFormatoPallet | EuroPallet, Americano, Medio Pallet… | EAL/MW | Sí
PalletsBase | Huecos que ocupa en el camión | EAL/MW o WMS | Sí
PalletsMadera | Pallets físicos | EAL/MW o WMS | Sí
PalletsCliente | Indicados en el pedido | EAL/MW | Sí
PalletsEquivalentes | Para ruteo antes de preparación | WMS/TMS | Recomendado
CodigoHaciendaPT | Código AT de transporte (Portugal) | WMS (fin preparación) | Sí (PT)
Preparado | Si el pedido ya viene preparado | EAL/MW | No
RequiereTurno | Requiere cita con el destinatario | EAL/MW o DomicilioOrden | Condicional
EntregaIslas | Indica si es entrega a islas | EAL/MW | No
--- TABLE END ---

A.T5 Campos DYN del Pedido

--- TABLE START ---
Campo Dyn | Descripción | Tipo
IdDomicilioOrdenUnigis | Domicilio fijo TMS (descarga) | FK Fijo
IdDomicilioOrdenCliente | Domicilio variable cliente (descarga) | FK Variable
IdDomicilioOrden2Unigis | Domicilio fijo TMS (carga/recogida) | FK Fijo
IdDomicilioOrden2Cliente | Domicilio variable cliente (carga) | FK Variable
SistemaOrigen | Sistema que originó el pedido | String
FormaIngreso | Canal de ingreso (API, B2B, etc.) | String
TipoServicio | Paquetería, Corriente, Reentrega, etc. | String
Canal | Horeca, Neveras, Farma, Planeamiento, etc. | String
TipoEntrega | Frio, Isotérmico, Ambiente | String
RefTransportePedido | Referencia transporte del pedido | String
ColAjenaDesignada | COL ajena para canal Horeca (por rango CP) | FK
TransitarioDesignado | Transitario para islas | FK
RefWmsPedido | Referencia del pedido en WMS | String
RefViajeCliente | Referencia del viaje en sistema del cliente | String
Contrato | Nº de contrato TMS | String
HorarioSolicitadoDesde | Ventana horaria solicitada por el cliente (inicio) | DateTime
HorarioSolicitadoHasta | Ventana horaria solicitada por el cliente (fin) | DateTime
HorarioAcordadoDesde | Ventana horaria acordada (inicio) | DateTime
HorarioAcordadoHasta | Ventana horaria acordada (fin) | DateTime
Mensajes_Y_Errores | Mensajes de error de validación | Text
--- TABLE END ---

A.T6 Campos FECHA del Pedido

--- TABLE START ---
Tipo | Campo | Descripción
Tope | FechaTopeDepositoSalida | Fecha límite para que el pedido esté en depósito de salida
Tope | FechaTopeDepositoLlegada | Fecha límite para que el pedido llegue al depósito de llegada
Tope | FechaTopeLlegadaCrossdock1..4 | Fecha límite para llegar a cada crossdock intermedio
Tope | FechaTopeDomicilioOrden | Fecha límite para entrega en domicilio del destinatario
Tope | FechaTopeDepositoOrden2 | Fecha límite para depósito de origen alternativo
Objetivo | FechaObjetivoPreparacion | Fecha deseable de preparación del pedido
Objetivo | FechaObjetivoDepositoSalida | Fecha deseable en depósito salida
Objetivo | FechaObjetivoDepositoLlegada | Fecha deseable en depósito llegada
Objetivo | FechaObjetivoLlegadaCrossdock1..4 | Fecha deseable en cada crossdock
Objetivo | FechaObjetivoDomicilioOrden | Fecha deseable de entrega
--- TABLE END ---

A.8 Plan de Actividades — Resumen

--- TABLE START ---
# | Tarea | Responsable | Fecha límite | Estado
U1 | Desarrollar auto-creación usuario app al crear conductor (G1) | UNIGIS | Jun 2026 | En curso
U2 | Desarrollar mejoras pantalla DomicilioOrden (G5) | UNIGIS | Jul 2026 | Planificado
U3 | Desarrollar estado Confirmada-Definitiva con delay (G20) | UNIGIS | Jul 2026 | Planificado
U4 | Desarrollar pantalla selección COL llegada en arrastre (G18) | UNIGIS | Sprint +2 | Planificado
U5 | Desarrollar mover/fusionar rutas entre jornadas (G8) | UNIGIS | Sprint +2 | Planificado
U6 | Desarrollar totalizadores selección órdenes OM (G15) | UNIGIS | Sprint +2 | Planificado
U7 | Desarrollar trigger creación automática DomicilioOrden (G4) | UNIGIS | Sprint +2 | Planificado
U8 | Desarrollar visibilidad multi-operación en OM (G7) | UNIGIS | Sprint +3 | Planificado
U9 | Desarrollar webapp sin login conductores spot (G11) | UNIGIS | Sprint +3 | Planificado
U10 | Desarrollar restricción Cliente-Cliente (G13) | UNIGIS | Sprint +4 | Planificado
U11 | Desarrollar separación liquidaciones por contrato (G17) | UNIGIS | Sprint +3 | Planificado
L1 | Proveer catálogo tipos de incidencia | LS | Jun 2026 | Pendiente
L2 | Proveer maestro de tarifas en formato acordado | LS | Jun 2026 | Pendiente
L3 | Confirmar API SoftExpert para integración siniestros | LS IT | Jun 2026 | Pendiente
L4 | Proveer estructura OrdenTipoPedido del ERP | LS IT | Jun 2026 | Pendiente
L5 | Proveer Tabla de Influencia (CP → COL) | LS Operaciones | Jun 2026 | Pendiente
L6 | Proveer maestro de domicilios para geocodificación masiva | LS Operaciones | Jul 2026 | Pendiente
L7 | Definir pares de clientes con restricción Cliente-Cliente | LS Comercial | Jul 2026 | Pendiente
L11 | Seleccionar COL piloto para pruebas operativas | LS Dirección | Jul 2026 | Pendiente
L13 | Realizar pruebas de aceptación (UAT) flujo completo | LS IT + Ops | Sep-Oct 2026 | Planificado
L14 | Aprobar go-live COL piloto | LS Dirección | Oct-Nov 2026 | Planificado
--- TABLE END ---

A.9 Tabla de GAPs — Resumen Completo

--- TABLE START ---
# | GAP / Requerimiento | Tipo | Módulo | Prioridad | Sprint est.
G1 | Auto-creación usuario app al crear conductor | Desarrollo | Flota/Conductores | Alta | Sprint actual
G2 | Validación matrícula contra registros oficiales (DGT) | Integración | Flota/Vehículos | Media | Sprint +5
G3 | Prioridad tipo vehículo configurable por operación/jornada | Config/Dev | Planificación | Media | Sprint +2
G4 | Trigger creación DomicilioOrden al llegar orden del ERP | Desarrollo | OM/Domicilios | Alta | Sprint +2
G5 | Mejora búsqueda/filtro pantalla DomicilioOrden + acceso directo | Desarrollo UX | OM | Alta | Próx. sprint
G6 | Geocodificación masiva domicilios (lote) | Herramienta | Domicilios | Media | Sprint +4
G7 | Visibilidad OM a través de operaciones para paradas compartidas | Desarrollo | OM/Planif. | Alta | Sprint +3
G8 | Mover/fusionar rutas entre jornadas | Desarrollo | Planificación | Alta | Sprint +2
G9 | Transiciones de estado configurables por tipo de orden | Config/Dev | OM/Ejecución | Media | Sprint +4
G10 | Rutas mixtas (recogida + entrega simultáneas) en MCFS | Desarrollo Core | MCFS | Alta | Q4 2026
G11 | Webapp sin login para conductores spot | Desarrollo | App Conductor | Alta | Sprint +3
G12 | IdDomicilioOrden en restricción Producto-Producto | Desarrollo | Restricciones | Media | Sprint +4
G13 | Restricción Cliente-Cliente | Desarrollo | Restricciones | Alta | Sprint +4
G14 | Restricción CategoríaOrden-CategoríaOrden | Desarrollo | Restricciones | Media | Sprint +4
G15 | Totalizadores cantidades en selección órdenes OM | Dev UX | OM | Media | Sprint +2
G16 | Valor mínimo de liquidación con ajuste automático | Desarrollo | Liquidación | Media | Sprint +3
G17 | Separación liquidaciones por contrato | Desarrollo | Liquidación | Alta | Sprint +3
G18 | Selección COL llegada en cambio estado parada arrastre | Desarrollo | Ejecución | Alta | Sprint +2
G19 | Vista restricciones DomicilioOrden en pantalla Órdenes OM | Dev UX | OM/Domicilios | Media | Sprint +4
G20 | Estado Confirmada-Definitiva con delay configurable | Desarrollo | Planificación | Alta | Próx. sprint
G21 | Tarifas retroactivas en Guía | Desarrollo | Fleet/Liquidación | Alta | TBD
G22 | Guía adicional por límite KM mensual (flota dedicada) | Desarrollo | Fleet/Tarifas | Media | TBD
G23 | Adicional por entrega a partir de la Nª parada | Configuración | Fleet/Tarifas | Media | Sprint +4
G24 | Paralizaciones diferenciadas PT vs ES | Configuración | Fleet/Tarifas | Media | Config
G25 | Categorización viajes para tarifas spot | Desarrollo | Fleet/Tarifas | Alta | TBD
G26 | Tarifa delegación ajena como criterio de planificación | Desarrollo | Fleet/Planif. | Media | Sprint +4
G27 | Tarifación multi-contrato (pendiente confirmar LS) | Análisis | Fleet/Tarifas | TBD | TBD
G28 | Campos depósitos en Pedido vinculados a tabla depósitos | Desarrollo | OM | Media | TBD
G29 | Categoría pedido a permisos de grupo (delegaciones ajenas) | Desarrollo | Administración | Media | TBD
G30 | Pop-Up indicadores desplanificación | Desarrollo | OM | Media | TBD
G31 | Tabla configurable de transiciones de estados (ejes X/Y) | Desarrollo | Administración | Media | TBD
G32 | Cambio estado masivo en caja de destinatarios para paradas agrupadas | Desarrollo | OM | Media | TBD
G33 | Crear ruta manual desde Administración de Órdenes | Desarrollo | Planificación | Media | TBD
G34 | Filtro rango CP en pantalla filtros Órdenes RoutingX | Desarrollo UX | RoutingX | Media | TBD
G35 | Totalizadores en lo seleccionado en pestaña Órdenes RoutingX | Desarrollo UX | RoutingX | Media | TBD
G36 | Seleccionar órdenes en pestaña Órdenes para mostrar totalizadores | Desarrollo UX | RoutingX | Media | TBD
--- TABLE END ---

Glosario programación
Deposito Salida (Origen) - Deposito mas cercano del origen 
Deposito Llegada (Destino) - Deposito mas cercano al destino
Deposito Carga - Deposito desde donde se hace el planeamiento
Deposito Descarga - Deposito destino del tramo planeado
Deposito Ajena - Deposito que no es propio de LS
Zona Depósito Salida (Origen) - Zona de influencia del Deposito de Salida
Zona Depósito Llegada (Destino) - Zona de influencia del Deposito de Llegada
Zona Depósito Carga - Zona de influencia del deposito de carga
Zona Depósito Descarga - Zona de influencia del deposito de descarga
Tipo viaje (tramo) - Que tipo de flujo se esta planeando (local o larga  distancia)
Tipo Jornada viaje (tramo)Para atribuir una jornada a las ordens que se van a crear
Operacion viaje (tramo)- Operacion que va a realizar el viaje
Domiclio orden - Domicilio de destino
Tipo Domicilio orden - Remitente/Destinatario o Deposito (LS o Ajena)
Domiclio orden 2 - Domicilio de origen
Tipo Domicilio orden 2 - Remitente/Destinatario o Deposito (LS o Ajena)