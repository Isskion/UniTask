
--- TABLE START ---
UNIGIS TMS / Luis Simoes Logística Iberia (LS)
--- TABLE END ---

Informe Técnico-Funcional
Gestión de Destinatarios Fijos y Variables
Estructura de Entidades, Clasificación Fijo/Variable y Reglas de Integración EAL ↔ UNIGIS TMS
Versión 2.0  ·  Junio 2026  ·  Confidencial

--- TABLE START ---
Campo | Valor
Cliente | Luis Simoes Logística Iberia (LS)
Proyecto | Implantación UNIGIS TMS — Fase 2
Módulo | Gestión de Domicilios — Destinatarios Fijos y Variables
Versión | 2.0 (modelo conceptual corregido)
Fecha | Junio 2026
Confidencialidad | Uso interno UNIGIS + Luis Simoes
--- TABLE END ---

1. Introducción y Conceptos Clave
En la operación de transporte de Luis Simoes Logística Iberia (LS), la precisión en los puntos físicos de carga y descarga es crítica para la planificación de rutas, el cumplimiento de ventanas horarias y la tarificación. UNIGIS TMS gestiona estos puntos a través de dos entidades: ClienteOrden (agrupación comercial) y DomicilioOrden (dirección física). Dentro de DomicilioOrden, existe una clasificación clave: Fijo y Variable.

--- TABLE START ---
CONCEPTO CENTRAL — "Mi código / Tu código": / El Domicilio FIJO es la dirección física en el sistema de UNIGIS: datos maestros validados, geocodificación precisa, ventanas horarias y restricciones operativas completas. Es el código interno de LS/UNIGIS. / El Domicilio VARIABLE es el código o referencia que el cliente externo (su ERP, su sistema) usa para esa misma dirección física. Se crea en UNIGIS apuntando al Fijo equivalente mediante el campo iddomicilioordenpadre. / Ejemplo: UNIGIS tiene el "Puerto de Barcelona" con id=1 (Fijo). El cliente A lo llama "Port-BCN" (id=11, Variable con iddomicilioordenpadre=1). El cliente B lo llama "BCN-ZF-002" (id=22, Variable con iddomicilioordenpadre=1). Los tres representan la misma ubicación física.
--- TABLE END ---


--- TABLE START ---
Concepto | Descripción
ClienteOrden | Agrupación lógica de domicilios bajo una misma cuenta comercial. Contenedor para analíticas y reportes consolidados. No determina la relación Fijo-Variable.
DomicilioOrden | Dirección física real de entrega o recogida. Puede ser de tipo Fijo (maestro UNIGIS) o Variable (alias del cliente para esa misma dirección).
Domicilio FIJO | Código UNIGIS/LS. Datos maestros completos: GPS validado, horarios, restricciones de vehículo, depósito COL. Es el registro de referencia.
Domicilio VARIABLE | Código del cliente externo para esa misma ubicación. Hereda atributos del Fijo padre (iddomicilioordenpadre). Es el registro de uso por pedido.
EAL | Capa de integración que resuelve la asociación Variable → Fijo antes de que los domicilios entren formalmente a UNIGIS TMS.
--- TABLE END ---

La creación y asociación de los DomicilioOrden fijos y variables al TMS es a través del interfaz de pedidos con EAL. Es en EAL donde se validan y configuran los domicilios y sus relaciones, antes de ser enviados a TMS.
Adjuntamos la pate del flujo donde TMS gestiona la información recibida.
FLUJO DE CREACIÓN DE DOMICILIOS EN TMS
FASE 1 — RECEPCIÓN Y PROCESAMIENTO
Paso 1. Recepción de Información del Pedido
Procesamiento de datos de destino fijo y variable, y actualización de EAL.
El sistema TMS recibe y procesa la información detallada del pedido, incluyendo los datos del destinatario fijo y variable. Esta fase asegura la consolidación y actualización de datos entre el TMS y el EAL mediante una interfaz bidireccional, garantizando la consistencia. Si la información del destinatario es insuficiente o faltan datos críticos, el proceso de georeferenciación no podrá iniciar, requiriendo intervención. Un campo con el tipo de GEO es mandatorio en los domicilios fijos para una correcta gestión.
FASE 2 — GEOREFERENCIACIÓN Y VALIDACIÓN
Paso 2. ¿Tiene Coordenadas?
Verificación de la existencia de coordenadas geográficas para el domicilio.
Una vez que la información del pedido ha sido procesada, el sistema TMS realiza una verificación automática para determinar si el domicilio del destinatario ya cuenta con coordenadas geográficas asociadas. Esta validación es esencial para definir la siguiente ruta del flujo. Si se detectan coordenadas, el pedido avanza a la clasificación de su tipo; de lo contrario, se procede a iniciar el proceso de georeferenciación para obtenerlas.
Paso 3. Envío para Normalización y Georeferenciación
Detección automática o envío manual de pedidos sin coordenadas para georeferenciar.
Cuando un pedido carece de coordenadas, el sistema TMS lo detecta y lo envía automáticamente a un motor de georeferenciación, cumpliendo con la política de redundancia de dos motores. Adicionalmente, se habilita la opción de realizar envíos manuales para casos específicos o lotes masivos, permitiendo flexibilidad operativa. En caso de que el proceso automático falle en obtener coordenadas, el pedido es marcado en un estado de error específico, indicando la falta de georeferenciación y el ID del domicilio, lo que requiere una intervención posterior para su resolución.
Paso 4. Clasificación del Tipo de Georeferenciación
Evaluación de la calidad y precisión de las coordenadas obtenidas.
Una vez que el sistema recibe las coordenadas del motor de georeferenciación, procede a clasificarlas automáticamente según su calidad y precisión, basándose en reglas preestablecidas en el fichero 'Atributos domicilio orden'. Esta clasificación determina si las coordenadas son exactas, aproximadas o inexistentes, lo cual es fundamental para el siguiente paso en el flujo de validación. La correcta categorización asegura el tratamiento adecuado del pedido.
Paso 5. Tipo Geo = 3 (Sin Coordenada)
Procesamiento de pedidos sin coordenadas válidas, requiriendo corrección de datos.
Cuando la georeferenciación clasifica el pedido como 'Tipo Geo = 3', significa que no se pudieron obtener coordenadas válidas, usualmente por datos de dirección incompletos o incorrectos. En este escenario, el sistema automáticamente marca la coordenada como 'NOK' y redirige el pedido al estado  'PEDIDO - ERROR'. Aquí, un usuario debe corregir manualmente los datos de dirección para reintentar la georeferenciación, ya que sin coordenadas no puede avanzar. Si la corrección falla, el pedido permanecerá en estado de error.
Paso 6. Tipo Geo = 1 (Aproximada)
Procesamiento de coordenadas aproximadas, requiriendo validación manual.
Cuando el sistema clasifica las coordenadas como 'Tipo Geo = 1', estas se consideran aproximadas, derivadas de datos como la calle o el código postal. El sistema las marca como 'A REVER NOK', indicando que requieren una revisión y validación manual por parte de un usuario. Si el usuario acepta la coordenada como válida, el pedido puede proceder al estado OK; en caso contrario, si la descarta, el pedido se redirige a la 'Pantalla Errores' para una corrección más exhaustiva.
Paso 7. Tipo Geo = 2 (Exacta)
Procesamiento de coordenadas exactas y definitivas.
Si la clasificación de georeferenciación arroja un 'Tipo Geo = 2', el sistema interpreta que se han obtenido coordenadas exactas y definitivas para el domicilio. Estas coordenadas se consideran 'DEFINITIVA OK', lo que significa que no requieren ninguna validación manual adicional. El pedido puede entonces avanzar directamente a la etapa de 'Pedido Cliente OK', agilizando el flujo y confirmando la validez de la información de geolocalización.
FASE 3 — RESOLUCIÓN DE ERRORES
Paso 8. pedido en estado 'PEDIDO - ERROR'
Corrección manual de datos de domicilio para lograr una georeferenciación válida.
En la grilla de pedidos, se podrán filtrar los pedidos en estado 'PEDIDO - ERROR', indicativo que precisan de revisión y  corrección manual.
FASE 4 — CONFIRMACIÓN DE PEDIDO
Paso 9. Pedido Cliente OK
Creación final del pedido del cliente con datos georreferenciados válidos.
Este paso representa la culminación exitosa del proceso de georeferenciación, donde el pedido del cliente se crea o actualiza en el sistema OM. Se asocian los datos del domicilio y las coordenadas finales, ya sean las exactas (Tipo 2) o las aproximadas validadas manualmente (Tipo 1). Es fundamental que este paso asegure que las coordenadas sean un dato obligatorio, garantizando la integridad de la información. Con el pedido en estado OK, el flujo puede avanzar a las siguientes etapas logísticas.
2. Estructura de Entidades y Relación Fijo-Variable
La relación fundamental del módulo de destinatarios opera a nivel de DomicilioOrden, no de ClienteOrden. Un mismo Domicilio Fijo puede tener múltiples Domicilios Variables apuntando a él, cada uno representando cómo un cliente externo diferente referencia esa misma dirección física en su propio sistema.
Figura 1 — Un Domicilio Fijo (maestro UNIGIS) puede tener múltiples Domicilios Variables (alias de distintos clientes). Todos apuntan al mismo punto físico.
2.1 ClienteOrden
Agrupación lógica de domicilios bajo una misma cuenta comercial. Permite consolidar analíticas, reportes y clasificaciones de negocio. No interviene en la lógica de resolución Fijo-Variable: esa asociación se gestiona exclusivamente dentro de DomicilioOrden mediante el campo iddomicilioordenpadre.
2.2 DomicilioOrden — Atributos clave

--- TABLE START ---
Atributo | Tipo | Descripción funcional
refdomicilioexterno | PK | Identificador único del domicilio. Para Fijos: código UNIGIS/LS. Para Variables: código del ERP del cliente.
idclienteorden | FK | Vincula el domicilio a su ClienteOrden. No determina si es Fijo o Variable.
iddomicilioordenpadre | FK | CAMPO CLAVE: cuando está informado, indica que este DomicilioOrden es Variable y apunta al id del Domicilio Fijo padre. NULL = es un Fijo.
latitud / longitud | GPS | Fijo: siempre validado. Variable: puede ser NULL → hereda del Fijo padre.
iniciohorarioacordado / finhorarioacordado | Horario | Fijo: configurado. Variable: si NULL → hereda del Fijo padre.
RequiereTurno | Bool | Fijo: configurado según tipo de instalación. Variable: hereda del Fijo padre o define el propio.
CantidadMaximaVehiculosDia | Int | Fijo: límite según capacidad de la instalación. Variable: hereda del Fijo padre.
varchar1 / Iddeposito | Misc | Categoría operativa (PORT, C&C...) y depósito COL asociado. Propio de cada registro.
--- TABLE END ---

3. Clasificación: Fijo vs. Variable

--- TABLE START ---
 | DOMICILIO FIJO — Maestro UNIGIS | DOMICILIO VARIABLE — Alias del Cliente
 | iddomicilioordenpadre = NULL / Quién lo crea: / LS durante configuración del proyecto o mantenimiento de maestros. Datos validados y completos. / Ejemplos típicos: / • Puertos (Barcelona, Valencia, Algeciras) / • Campas y depósitos propios LS / • Almacenes de clientes habituales / • Instalaciones recurrentes de plataformas logísticas / ✓  GPS validado y preciso / ✓  Ventanas horarias configuradas / ✓  Restricciones y límites de vehículos definidos / ✓  RequiereTurno configurado según instalación | iddomicilioordenpadre = id del Fijo / Quién lo crea: / LS al integrar el pedido del cliente. Contiene el código con el que el ERP del cliente identifica esa dirección. / Ejemplos típicos: / • "Port-BCN" (alias de cliente A para Puerto BCN) / • "BCN-ZF-002" (alias de cliente B para mismo puerto) / • Código ERP del cliente para un almacén recurrente / • Referencia interna del cliente para instalación logística / ⚠  GPS: hereda del Fijo padre (si propio es NULL) / ⚠  Horarios: hereda del Fijo padre (si propios son NULL) / ⚠  Restricciones: hereda del Fijo padre / ⚠  Válido solo para pedidos concretos de ese cliente
--- TABLE END ---


--- TABLE START ---
Regla de herencia: cuando un campo del Domicilio Variable está vacío (NULL), UNIGIS TMS hereda automáticamente el valor del Domicilio Fijo referenciado por iddomicilioordenpadre. / Si el Variable tiene su propio valor informado, prevalece el del Variable sobre el del Fijo padre. / 📌 Pendiente confirmar con LS la regla de prioridad cuando existen valores en ambos registros (ej. horarios propios del Variable distintos a los del Fijo).
--- TABLE END ---

4. Flujo de Integración EAL ↔ TMS
Cuando el sistema del cliente envía un pedido con un Domicilio Variable, la capa EAL es responsable de resolver la asociación con el Domicilio Fijo maestro antes de integrarlo en UNIGIS TMS. El siguiente diagrama muestra el flujo completo incluyendo el caso no resuelto (GAP abierto).
Figura 2 — Flujo EAL: resolución Fijo-Variable, opciones ante Fijo inexistente y sincronización bidireccional
4.1 Reglas de Integración en EAL

--- TABLE START ---
# | Regla | Descripción | Impacto en TMS
R1 | Llave de creación única | ReferenciaExterna como identificador unívoco del DomicilioOrden Variable. Garantiza idempotencia en la integración. | Sin duplicados. Trazabilidad completa.
R2 | Resolución Fijo-Variable en EAL | EAL busca el Domicilio Fijo equivalente en el maestro EAL y completa iddomicilioordenpadre antes de integrar. | TMS recibe Variable ya vinculado a su Fijo padre.
R3 | Herencia automática en TMS | Cuando iddomicilioordenpadre está informado, UNIGIS hereda del Fijo padre todos los campos vacíos del Variable (GPS, horarios, restricciones). A validar con LS. | Variable operativo sin necesidad de datos completos propios.
R4 | Sync bidireccional TMS → EAL | Datos operacionales enriquecidos en TMS (GPS validado, citas, restricciones ajustadas) se sincronizan de vuelta a EAL para enriquecer el maestro global. | Maestro siempre actualizado para futuras asociaciones.
--- TABLE END ---

4.2 GAP — ¿Qué ocurre cuando no se encuentra el Fijo padre?
Este es el caso no resuelto del diseño: cuando EAL recibe un Domicilio Variable cuya ReferenciaExterna no tiene un Domicilio Fijo equivalente en el maestro UNIGIS. Se han identificado tres opciones de diseño, cada una con sus implicaciones:

--- TABLE START ---
 | OPCIÓN A — EAL provee el Fijo primero | OPCIÓN C — Pedido en estado ERROR
 | EAL envía siempre el Domicilio Fijo antes (o simultáneamente) de enviar el Variable asociado. El Fijo se crea/actualiza primero en TMS, luego se integra el Variable ya vinculado. / ✓ Ventajas: / • Datos maestros siempre completos antes del Variable / • Garantiza la integridad de la relación desde el origen / • Alineado con la arquitectura EAL como fuente de verdad / → OPCIÓN RECOMENDADA | El pedido queda en estado ERROR hasta que se resuelva el domicilioorden en TMS. / Consideraciones: / • Cuando se resuelva el caso, se envía actualización a EAL para alinear sistemas. / • Puede bloquear la planificación del pedido en curso / • Permite mantener la calidad del maestro con revisión manual
--- TABLE END ---

5. Concepción UNIGIS para la Solución
5.1 Herencia de Atributos (iddomicilioordenpadre)
Cuando iddomicilioordenpadre está informado en un DomicilioOrden Variable, UNIGIS TMS aplica la siguiente lógica de herencia automática:

--- TABLE START ---
Atributo | Valor en Variable | Comportamiento del sistema
latitud / longitud | NULL | Hereda GPS del Fijo padre. Planificador puede geocodificar si tampoco hay en Fijo.
iniciohorarioacordado / finhorarioacordado | NULL | Hereda ventanas horarias del Fijo padre.
iniciohorarioacordado / finhorarioacordado | Informado | Prevalece el valor propio del Variable sobre el del Fijo padre. (Pendiente confirmar prioridad con LS.)
RequiereTurno | NULL | Hereda configuración del Fijo padre.
CantidadMaximaVehiculosDia | NULL | Hereda el límite definido en el Fijo padre.
Restricciones físicas de vehículo | NULL | Hereda tipo de camión permitido y restricciones de acceso del Fijo padre.
--- TABLE END ---

* A confirmar con LS
5.2 Visibilidad en el Planificador y Geocodificación
•  Los pedidos con DomicilioOrden geocodificado=0 o normalizado=0 se marcan con alerta visual en un campo del pedido indicando que falta geoposición.
•  UNIGIS propone geocodificación automática a partir de la dirección textual. El planificador acepta o corrige la propuesta.
•  La geocodificación validada se sincroniza hacia EAL para enriquecer el maestro global y evitar el mismo problema en futuros pedidos del mismo cliente.
Glosario

--- TABLE START ---
Término | Definición
ClienteOrden | Agrupación lógica de domicilios bajo una misma cuenta comercial. Contenedor para analíticas y reportes. No interviene en la relación Fijo-Variable.
DomicilioOrden | Dirección física de entrega o recogida. Puede ser Fijo (maestro UNIGIS, iddomicilioordenpadre=NULL) o Variable (alias cliente, iddomicilioordenpadre=id_fijo).
Domicilio FIJO | Código UNIGIS/LS de la dirección física. Datos maestros completos y validados. Campo iddomicilioordenpadre = NULL.
Domicilio VARIABLE | Código del cliente externo para esa misma dirección. Campo iddomicilioordenpadre apunta al id del Fijo equivalente. Hereda atributos del Fijo padre cuando los propios son NULL.
iddomicilioordenpadre | FK en DomicilioOrden Variable que referencia al IdDomicilioOrden del Fijo equivalente. Es el campo que habilita la herencia automática. Si NULL, el domicilio es Fijo.
ReferenciaExterna | Llave unívoca usada por EAL para identificar y dar de alta un DomicilioOrden Variable. Corresponde al código del ERP del cliente.
EAL | Enterprise Application Layer. Responsable de resolver la asociación Variable→Fijo antes de integrar en TMS. Fuente de verdad para la creación del maestro de Fijos.
RequiereTurno | Flag booleano. Cuando TRUE, bloquea la confirmación del viaje hasta registrar cita previa. El Variable puede heredarlo del Fijo padre.
--- TABLE END ---

UNIGIS TMS · Gestión de Destinatarios Fijos y Variables
Luis Simoes Logística Iberia (LS)  ·  Versión 2.0  ·  Junio 2026
Documento confidencial de uso interno UNIGIS + cliente