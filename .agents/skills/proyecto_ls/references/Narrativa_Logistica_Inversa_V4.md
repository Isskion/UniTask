
--- TABLE START ---
NARRATIVA DE FLUJO OPERATIVO / Gestión de Logística Inversa / Del registro de una incidencia en parada al cierre del retorno de mercancía
--- TABLE END ---


--- TABLE START ---
Tipo de documento | Narrativa funcional de flujo operativo
Cliente / Proyecto | TMS UNIGIS
Elaborado por | Daniel del Amo
Fecha | 8 de julio de 2026
Versión | 2.0
Nº de pasos documentados | 19
--- TABLE END ---

Resumen del flujo

--- TABLE START ---
Fase | Pasos
INICIO — ESTADO PARADA: PROBLEMA EN PARADA | 1
CAMINO CENTRAL — CLASIFICACIÓN Y RESOLUCIÓN | 6
REENTREGAS — NUEVO INTENTO DE ENTREGA O RECOLECCIÓN | 5
RETORNOS — DEVOLUCIÓN DE MERCANCÍA AL DEPÓSITO O CLIENTE | 7
--- TABLE END ---

INICIO — ESTADO PARADA: PROBLEMA EN PARADA
REGISTRO DE INCIDENCIA EN PARADA
Notificación de un problema surgido durante la recolección en cliente o la entrega en destinatario.
El conductor, utilizando la app de Deliveries, o el equipo de Control Tower directamente en el TMS, registra un problema surgido durante la recolección o entrega de mercancía. Esta acción cambia el estado de la parada a «Problema en Parada». Es el punto de entrada único del flujo, independientemente de si el problema ocurre en una recolección en cliente o en una entrega en destinatario. A partir de este momento, la Control Tower toma el control de la gestión y determina las acciones a seguir.
CAMINO CENTRAL — CLASIFICACIÓN Y RESOLUCIÓN
CLASIFICACIÓN DEL PROBLEMA — ¿Es informativo?
Determinar si el motivo del problema requiere acción o es meramente informativo.
Al registrarse el problema, la Control Tower evalúa su naturaleza. Si el motivo es informativo (por ejemplo, un retraso menor sin impacto en la entrega), el flujo se cierra sin necesidad de generar un estado de resolución formal: la incidencia queda registrada a efectos de trazabilidad pero no desencadena acciones operativas adicionales. Si el motivo no es informativo, requiere gestión activa y el flujo continúa hacia la clasificación y respuesta.
GESTIÓN DE SINIESTRO — ¿Genera Proceso Quebra (PQ)?
Evaluación interdepartamental para determinar responsabilidad y coste en incidencias mayores.
Cuando la incidencia no es informativa, la Control Tower determina si el problema clasifica como siniestro (por ejemplo, daño o falta de mercancía). Si lo hace, el TMS genera automáticamente un número de Proceso Quebra (PQ) con todos los datos relevantes de la incidencia. Esta información se envía a través de la interfaz EAL al sistema SoftExpert, iniciando un proceso de evaluación interdepartamental para determinar responsabilidad y coste. La resolución llega de vuelta vía interfaz y cierra el PQ. Si el problema no genera PQ, la resolución es directa por parte de la Control Tower y el flujo pasa a la siguiente evaluación.
COMUNICACIÓN AL CLIENTE DADOR — ¿Requiere notificación?
Notificación al cliente dador y recepción de su respuesta antes de resolver la incidencia.
Una vez clasificada la incidencia, la Control Tower determina si es necesario informar al cliente dador antes de resolverla. Si sí, el sistema genera y envía automáticamente una notificación detallada por email, incluyendo un enlace a LStools para que el cliente pueda responder e indicar cómo proceder. La respuesta recibida a través de LStools retroalimenta la resolución en el TMS. Si la incidencia no requiere notificación externa, la Control Tower resuelve directamente sin esperar respuesta del cliente, pasando al paso siguiente.
RESOLUCIÓN DE LA INCIDENCIA POR CONTROL TOWER
Control Tower aplica la resolución en el TMS y actualiza los estados del pedido y la parada.
Con toda la información disponible —clasificación del problema, resultado del Proceso Quebra si aplica, y respuesta del cliente si se solicitó—, la Control Tower valida las cantidades y aplica una resolución en el TMS. Esta acción actualiza automáticamente los estados de programación del pedido y la parada. El estado de resolución elegido es el que determina el camino que seguirá la mercancía a partir de este momento: cierre del proceso, generación de reentrega o generación de retorno.
NOTIFICACIÓN SMS AL CONDUCTOR
El sistema comunica al conductor la resolución adoptada y las instrucciones a seguir.
Una vez que la Control Tower ha aplicado la resolución, el TMS envía automáticamente un SMS al conductor. Este mensaje comunica la decisión adoptada e indica las instrucciones operativas concretas: si debe continuar con la ruta, gestionar una reentrega inmediata o trasladar la mercancía a un punto de retorno. El conductor actualiza su actuación en la app de Deliveries en consecuencia, quedando el resultado registrado en el sistema.
RESOLUCIÓN: ENTREGADO / RECOLECTADO — Cierre del proceso
La entrega o recolección se completó correctamente. No se genera logística inversa.
Cuando la resolución registrada es «Entregado» o «Recolectado», el flujo concluye en este punto. El estado del pedido se actualiza al valor correspondiente y la parada queda en estado «Completada». No se genera ninguna acción adicional de logística inversa. Este es el cierre estándar del flujo cuando la incidencia se resuelve con éxito y no hay mercancía pendiente de gestionar.
REENTREGAS — NUEVO INTENTO DE ENTREGA O RECOLECCIÓN
CRITERIOS DE ENTRADA AL FLUJO DE REENTREGA
Cuándo se activa el proceso de reentrega o rerecogida.
El flujo de reentrega se activa desde dos situaciones distintas. Primera: la resolución es «No entregado» o «No recolectado» y se aprueba un nuevo intento (el pedido completo vuelve a programarse). Segunda: la resolución es «Entregado Parcial» o «Recolección Parcial» y se decide reintentar las cantidades pendientes (en este caso, el pedido se divide mediante un split antes de continuar). En ambos casos, el objetivo es garantizar que la mercancía pendiente llegue al destinatario o sea recogida del cliente en un nuevo ciclo de programación.
GESTIÓN DE ENTREGA O RECOLECCIÓN PARCIAL (SPLIT)
Creación de un nuevo pedido spliteado para las cantidades pendientes cuando la resolución es parcial.
Cuando la resolución es «Entregado Parcial» o «Recolección Parcial» y se aprueba la reentrega, el sistema realiza un split sobre el pedido original. El pedido original queda cerrado con estado «Entregado Parcial» o «Recolectado Parcial» por las cantidades ya gestionadas. Se crea un nuevo pedido independiente con las cantidades pendientes, que es el que seguirá el ciclo de reentrega. Este nuevo pedido arranca en estado inicial en el TMS y se gestiona como cualquier otro pedido activo. Cuando la resolución es de «No entregado» o «No recolectado» total, no hay split: el pedido original sigue su ciclo directamente.
ASIGNACIÓN DE TIPO DE SERVICIO RG Y ALTA PRIORIDAD
El pedido de reentrega o rerecogida recibe tipo de servicio «RG» y se marca con alta prioridad.
Para garantizar que las reentregas y rerecogidas se gestionen de forma diferenciada y urgente, el TMS asigna el tipo de servicio «RG» al pedido (o al nuevo pedido spliteado en caso de parcial), manteniendo el número de pedido original como referencia. Además, el pedido se marca con alta prioridad para que los equipos de planificación lo traten preferentemente en la siguiente ventana de programación, minimizando el tiempo de espera para el destinatario o cliente.
ESTADO ADMINISTRATIVO: REPLANIFICAR
El pedido entra en estado «Replanificar» para ajustar fecha, cantidades y parámetros antes de la nueva programación.
Tras la asignación de tipo de servicio y prioridad, el estado del pedido cambia a «Replanificar». Este estado administrativo indica que el pedido está pendiente de revisión por el equipo de planificación, que podrá ajustar la fecha de entrega o recolección, las cantidades y cualquier otro parámetro necesario para el nuevo intento. Es un estado de control que garantiza que ningún pedido de reentrega pase a programación sin haber sido revisado y validado.
ESTADO FINAL: REPROGRAMABLE — Listo para nueva ruta
El pedido está disponible para ser incluido en una nueva ruta de entrega o recolección.
Una vez que el equipo de planificación ha revisado y completado los ajustes del pedido en estado «Replanificar», se valida su información y el pedido transita a «Reprogramable». Este estado indica que el pedido está operativamente preparado para ser incluido en una nueva ruta como pedido de tipo «Reentrega» o «Rerecogida». Desde aquí, el ciclo de programación estándar del TMS toma el control y el pedido puede volver a entrar en el flujo de entrega o recolección, reiniciando el proceso desde el inicio.
RETORNOS — DEVOLUCIÓN DE MERCANCÍA AL DEPÓSITO O CLIENTE
CRITERIOS DE ENTRADA AL FLUJO DE RETORNO
Cuándo se activa el proceso de retorno de mercancía.
El flujo de retorno se activa cuando la resolución de la incidencia determina que la mercancía no va a ser reentregada ni rerecogida y debe volver a un depósito o al cliente dador. Esto ocurre en dos escenarios: (1) resolución «No entregado» o «Entregado Parcial» con generación de retorno aprobada, y (2) resolución «No entregado», «Entregado Parcial» o «Recolección Parcial» sin reentrega aprobada. En ambos casos, el objetivo es garantizar que la mercancía no quede en posesión del conductor y regrese de forma controlada y trazable a su destino asignado.
ASIGNACIÓN DE DEPÓSITO DE LLEGADA Y TIPO DE RETORNO
Control Tower determina el destino del retorno: depósito de origen o cliente dador.
Ante la necesidad de retorno, la Control Tower interviene en el TMS para especificar el depósito de llegada y el tipo de retorno. El estado del pedido se actualiza para reflejar si la mercancía debe retornar al depósito de origen (caso habitual) o directamente al cliente dador (cuando la política de la empresa o el tipo de mercancía así lo exigen). La asignación se realiza a través de una pantalla pre-rellenada en el TMS, lo que agiliza la operativa y reduce errores.
CREACIÓN DE PARADA DE RETORNO EN EL MISMO VIAJE
El TMS genera una nueva parada logística para el COL de llegada del retorno dentro del viaje actual.
Una vez definido el destino, el TMS crea automáticamente una nueva parada logística asociada al COL (Centro de Operaciones Logísticas) de llegada. Esta parada se añade al viaje actual del conductor, de modo que la mercancía retorna en el mismo trayecto sin necesidad de generar un nuevo viaje o asignar otro conductor. La parada de retorno recoge toda la información del pedido original y queda registrada para la planificación y seguimiento del equipo de Distribución.
EVALUACIÓN Y AJUSTE DEL COL DE LLEGADA
Verificar si el COL de llegada asignado debe modificarse respecto al estándar definido.
Una vez creada la parada de retorno, se evalúa si el COL de llegada debe ser diferente al predefinido por defecto. Si la política operativa o las instrucciones del cliente lo requieren, la Control Tower ejecuta el cambio de COL en el TMS; de lo contrario, el retorno sigue con el destino estándar. Tras esta evaluación, el pedido pasa al estado administrativo «Replanificar» para su ajuste antes de quedar en estado «Reprogramable» con el tipo de retorno correspondiente (Retorno Depósito Origen o Retorno Cliente).
SUPERVISIÓN POR DISTRIBUCIÓN Y AVISO PREVIO AL WMS
El equipo de Distribución monitorea el retorno y el TMS notifica al WMS la mercancía prevista.
El equipo de Distribución mantiene supervisión constante sobre los estados de programación de los pedidos de retorno en el TMS. En paralelo, el TMS genera y envía una notificación de recepción prevista al sistema WMS Reflex. Esta integración permite al WMS anticipar la entrada de mercancía, preparar el espacio de almacén y los recursos de descarga necesarios, y agilizar el proceso de recepción cuando el conductor llegue al depósito.
ENTREGA FÍSICA EN DEPÓSITO Y RECEPCIÓN POR WMS
El conductor entrega la mercancía en el depósito asignado. El WMS procesa la entrada y emite comprobante.
El conductor, siguiendo la parada de retorno incluida en su viaje, realiza la entrega física de la mercancía en el depósito de llegada asignado. El sistema WMS Reflex procesa la entrada validando cantidades y estado de la mercancía, y registra la recepción en el sistema. Una vez completada, el WMS emite automáticamente un comprobante de entrega —documento físico o email— como confirmación de que la mercancía de retorno ha sido correctamente recibida y registrada.
AJUSTE FINANCIERO Y CIERRE DEL PROCESO
Determinación de responsabilidad del retorno para facturación al cliente dador o compensación al transportista.
Con el retorno de la mercancía confirmado por el WMS, se procede a los ajustes financieros pertinentes. Este paso determina la responsabilidad del retorno: si la causa es imputable al cliente dador, se genera la facturación correspondiente; si la causa es imputable al transportista, se gestiona la compensación o el descuento. Este cierre financiero completa el ciclo de logística inversa, dejando trazabilidad completa de la incidencia desde su registro inicial en parada hasta la resolución económica del caso.
DIAGRAMA DE FLUJO

--- TABLE START ---
ESTADO PARADA: PROBLEMA EN PARADA / Recolección en cliente  ·  Entrega en destinatario
--- TABLE END ---

↓

--- TABLE START ---
PARTE 1 | GESTIÓN DE INCIDENCIA EN PARADA
--- TABLE END ---


--- TABLE START ---
1 | REGISTRO DE INCIDENCIA EN PARADA / El conductor (APP Deliveries) o Control Tower (TMS) registra el problema. Estado parada → «Problema en Parada». Punto de entrada único del flujo, independientemente de si el problema ocurre en recolección o entrega.
--- TABLE END ---


--- TABLE START ---
2 | CLASIFICACIÓN — ¿Es informativo? / Primera bifurcación según la naturaleza del problema: / INFORMATIVO / No requiere estado de resolución. El flujo termina aquí. / NO INFORMATIVO / Requiere gestión activa → continúa al paso 3. | INFORMATIVO | No requiere estado de resolución. El flujo termina aquí. | NO INFORMATIVO | Requiere gestión activa → continúa al paso 3.
INFORMATIVO | No requiere estado de resolución. El flujo termina aquí.
NO INFORMATIVO | Requiere gestión activa → continúa al paso 3.
--- TABLE END ---


--- TABLE START ---
3 | GESTIÓN Y RESPUESTA — ¿Es siniestro (PQ)? / Segunda bifurcación por tipo de gestión requerida: / SÍ ES PQ / Genera Proceso Quebra. Interfaz con SoftExpert vía EAL. Resolución por interfaz. / NO ES PQ / Resolución directa por Control Tower. Continúa al paso 4. | SÍ ES PQ | Genera Proceso Quebra. Interfaz con SoftExpert vía EAL. Resolución por interfaz. | NO ES PQ | Resolución directa por Control Tower. Continúa al paso 4.
SÍ ES PQ | Genera Proceso Quebra. Interfaz con SoftExpert vía EAL. Resolución por interfaz.
NO ES PQ | Resolución directa por Control Tower. Continúa al paso 4.
--- TABLE END ---


--- TABLE START ---
4 | ¿Requiere notificación al cliente dador? / Tercera bifurcación según política de comunicación: / CON NOTIFICACIÓN / Email automático al cliente + enlace LSTools para respuesta. Resolución por interfaz tras respuesta del cliente. / SIN NOTIFICACIÓN / Control Tower resuelve directamente en TMS. | CON NOTIFICACIÓN | Email automático al cliente + enlace LSTools para respuesta. Resolución por interfaz tras respuesta del cliente. | SIN NOTIFICACIÓN | Control Tower resuelve directamente en TMS.
CON NOTIFICACIÓN | Email automático al cliente + enlace LSTools para respuesta. Resolución por interfaz tras respuesta del cliente.
SIN NOTIFICACIÓN | Control Tower resuelve directamente en TMS.
--- TABLE END ---


--- TABLE START ---
5 | RESOLUCIÓN Y NOTIFICACIÓN AL CONDUCTOR / Control Tower resuelve la novedad en el TMS. El sistema envía automáticamente un SMS al conductor con la resolución adoptada. El estado de resolución determina el camino de Logística Inversa.
--- TABLE END ---

↓

--- TABLE START ---
PARTE 2 | LOGÍSTICA INVERSA — CAMINOS DE RESOLUCIÓN
--- TABLE END ---


--- TABLE START ---
Cada camino nace del estado de resolución registrado en el paso 5. Son excluyentes entre sí.
--- TABLE END ---


--- TABLE START ---
A | CAMINO A — Resolución: ENTREGADO / RECOLECTADO / La entrega o recolección se completó correctamente. / FIN DE FLUJO / Estado pedido → Entregado / Recolectado. No se genera logística inversa. | FIN DE FLUJO | Estado pedido → Entregado / Recolectado. No se genera logística inversa.
FIN DE FLUJO | Estado pedido → Entregado / Recolectado. No se genera logística inversa.
--- TABLE END ---


--- TABLE START ---
B | CAMINO B — Resolución: NO ENTREGADO / ENTREGADO PARCIAL · Genera retorno / La mercancía debe retornar al depósito o al cliente. / RETORNO / CT asigna depósito → TMS crea parada de retorno en el mismo viaje → Estado pedido: Replanificar → Reprogramable → Retorno Depósito Origen / Cliente. | RETORNO | CT asigna depósito → TMS crea parada de retorno en el mismo viaje → Estado pedido: Replanificar → Reprogramable → Retorno Depósito Origen / Cliente.
RETORNO | CT asigna depósito → TMS crea parada de retorno en el mismo viaje → Estado pedido: Replanificar → Reprogramable → Retorno Depósito Origen / Cliente.
--- TABLE END ---


--- TABLE START ---
C | CAMINO C — Resolución: NO ENTREGADO / ENTREGADO PARCIAL · No genera retorno / Caso a revisar con LS: sin retorno ni reentrega. / POR DEFINIR / Estado pedido: pendiente de confirmación. Se puede marcar estado final con responsabilidad para tarifación. | POR DEFINIR | Estado pedido: pendiente de confirmación. Se puede marcar estado final con responsabilidad para tarifación.
POR DEFINIR | Estado pedido: pendiente de confirmación. Se puede marcar estado final con responsabilidad para tarifación.
--- TABLE END ---


--- TABLE START ---
D | CAMINO D — Resolución: NO ENTREGADO / NO RECOLECTADO · Genera reentrega / rerecogida / El pedido completo se programa para un nuevo intento. / REENTREGA / Fin parada → Estado pedido: Replanificar → Reprogramable → Reentrega / Rerecogida. Tipo servicio «RG» con alta prioridad. | REENTREGA | Fin parada → Estado pedido: Replanificar → Reprogramable → Reentrega / Rerecogida. Tipo servicio «RG» con alta prioridad.
REENTREGA | Fin parada → Estado pedido: Replanificar → Reprogramable → Reentrega / Rerecogida. Tipo servicio «RG» con alta prioridad.
--- TABLE END ---


--- TABLE START ---
E | CAMINO E — Resolución: ENTREGADO PARCIAL / RECOLECCIÓN PARCIAL · Genera reentrega / rerecogida / Se entregó / recolectó parte. El resto se gestiona como nuevo pedido. / SPLIT + REENTREGA / Pedido original: Entregado Parcial / Recolectado Parcial. Nuevo pedido spliteado con cantidades pendientes → Replanificar → Reprogramable → Reentrega. | SPLIT + REENTREGA | Pedido original: Entregado Parcial / Recolectado Parcial. Nuevo pedido spliteado con cantidades pendientes → Replanificar → Reprogramable → Reentrega.
SPLIT + REENTREGA | Pedido original: Entregado Parcial / Recolectado Parcial. Nuevo pedido spliteado con cantidades pendientes → Replanificar → Reprogramable → Reentrega.
--- TABLE END ---


--- TABLE START ---
F | CAMINO F — Resolución: NO ENTREGADO / PARCIAL · No genera reentrega / rerecogida / Se descarta nuevo intento; la mercancía retorna. / RETORNO SIN REENTREGA / Estado pedido: Replanificar → Reprogramable → Retorno Depósito Origen / Cliente. | RETORNO SIN REENTREGA | Estado pedido: Replanificar → Reprogramable → Retorno Depósito Origen / Cliente.
RETORNO SIN REENTREGA | Estado pedido: Replanificar → Reprogramable → Retorno Depósito Origen / Cliente.
--- TABLE END ---

↓

--- TABLE START ---
PARTE 3 | EJECUCIÓN DE RETORNO  (solo caminos B y F)
--- TABLE END ---


--- TABLE START ---
6 | Asignación depósito de llegada / Control Tower indica el COL destino del retorno mediante pantalla pre-rellenada en el TMS.
--- TABLE END ---


--- TABLE START ---
7 | Creación de parada de retorno / TMS genera nueva parada logística asociada al COL de llegada, dentro del mismo viaje del conductor.
--- TABLE END ---


--- TABLE START ---
8 | ¿Cambio de COL de llegada? / Si la política requiere otro destino, CT lo actualiza; si no, el retorno sigue con el COL estándar.
--- TABLE END ---


--- TABLE START ---
9 | Notificación prevista al WMS (Reflex) / TMS avisa al WMS de la mercancía de retorno esperada para preparar espacio y recursos.
--- TABLE END ---


--- TABLE START ---
10 | Entrega física + Recepción WMS / Conductor entrega en el depósito. WMS procesa la entrada, valida cantidades y emite comprobante.
--- TABLE END ---

↓

--- TABLE START ---
PARTE 4 | CIERRE — AJUSTE FINANCIERO Y COMPROBANTE
--- TABLE END ---


--- TABLE START ---
11 | Ajuste financiero por retorno / Determinación de responsabilidad: si la causa es imputable al cliente dador, se genera la facturación; si es imputable al transportista, se gestiona la compensación.
--- TABLE END ---


--- TABLE START ---
12 | Emisión de comprobante de entrega (WMS Reflex) / WMS genera documento o email de confirmación de recepción del retorno. Cierre completo del ciclo de logística inversa.
--- TABLE END ---


--- TABLE START ---
✔  FIN DEL PROCESO
--- TABLE END ---
