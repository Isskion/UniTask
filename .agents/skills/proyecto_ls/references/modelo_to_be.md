Preparado porGonzalo CastroColaboradoresJorge Sureda y Diego SenraPreparado porGonzalo CastroColaboradoresJorge Sureda y Diego SenraLUIS SIMOES - Proyecto GOLDEtapa DiseñoModelo To Be – Documento de Alcance – Flujo de Trabajo e IntegracionesLUIS SIMOES - Proyecto GOLDEtapa DiseñoModelo To Be – Documento de Alcance – Flujo de Trabajo e Integraciones
Índice
Lista de distribución3
Introducción4
Objetivos del proyecto4
KPIs del proyecto4
Entidades principales5
Elementos visuales5
Diagrama de flujo de trabajo e integraciones6-12
Anexo 1: Entidades y Workflows13-18
Aprobación19
Lista de distribución:

--- TABLE START ---
Asistentes
Área | Nombre | Cargo/Rol | Datos de contacto
LUIS SIMOES | Luis Miguel Freitas / Alberto Santana / André Santos / Antonio Fernandes / Paulo Cruz / Vitor Silva / Nuno Gama / Filipa Pereira / Claudia Oliveira / Javier García | Sponsor / Director IT / Director Proyecto / Project Manager / Líder Funcional / Líder Técnico / Consultor Técnico / Key User / Key User | luis.freitas@luis-simoes.com / alberto.santana@luis-simoes.com / andre.guedelha.santos@luis-simoes.com / antonio.fernandes@luis-simoes.com / paulo.cruz@luis-simoes.com / vitor.silva@luis-simoes.com / nuno.gama@luis-simoes.com / filipa.pereira@luis-simoes.com / claudia.oliveira@luis-simoes.com / javier.munoz@luis-simoes.com
UNIGIS | Javier Martínez / Jorge Sureda  / Diego Senra / Gonzalo Castro | Sponsor / Gerente Proyecto / Project Manager / Líder Proyecto | javier.martinez@unigis.com / jorge.sureda@unigis.com / diego.senra@unigis.com / gonzalo.castro@unigis.com
--- TABLE END ---

Historial de Revisiones:

--- TABLE START ---
Versión | Fecha | Secciones Revisadas | Descripción
1 | 02/01/2025 | Creación de documento | Creación de documento
2 | 17/01/2025 | Diagrama de flujo e integraciones | Modificación documento
3 | 22/01/2025 | Anexo 1 – Entidades y Workflows | Modificación documento
4 | 04/02/2025 | Diagrama de flujo e integraciones | Modificación documento
5 | 24/02/2025 | Diagrama de flujo e integraciones | Modificación documento
6 | 06/03/2025 | Diagrama de flujo e integraciones | Modificación documento
7 | 07/03/2025 | Diagrama de flujo e integraciones | Modificación documento
--- TABLE END ---

Introducción
En este documento se describe el detalle de cómo se gestionará en la plataforma de UNIGIS los procesos logísticos y entidades comprendidos en el alcance del proyecto.
El diagrama adjunto representa el flujo de trabajo y las integraciones entre los sistemas SID (Luis Simões) y UNIGIS. Este esquema proporciona una representación visual clara de los procesos, las interfaces y las condiciones que gobiernan las interacciones entre los sistemas, utilizando diversos elementos visuales, colores y notas aclaratorias. Cada color y forma tiene un significado específico que facilita la identificación de los procesos y la comprensión de las decisiones y bifurcaciones en el flujo. Además, se incluyen notas que aportan información adicional sobre puntos clave o condicionantes.
Objetivos del proyecto
Automatizar el proceso de trazabilidad y comunicación, con información en tiempo real del estado de los servicios e incidencias que permita una gestión proactiva. 
Incremento de la productividad del equipo de seguimiento (Control Tower LS)
Control Tower con gestión robusta y proactiva de los servicios de acuerdo con los tiempos estimados de llegada, geoposicionamiento e intervención crítica.
KPIs del proyecto
Entidades principales
SID (Luis Simões):
Es el sistema que representa la gestión interna de operaciones de Luis Simões. Contiene funcionalidades que interactúan con otros sistemas a través de interfases automatizadas.
UNIGIS:
Sistema de gestión logística que soporta la ejecución de las operaciones de transporte. Se integra con SID para el intercambio de datos críticos.
Interfaces:
Constituyen los puntos de integración entre SID y UNIGIS. Permiten el flujo de datos en tiempo real o por lotes, garantizando la consistencia y sincronización entre los sistemas.
Elementos visuales:
Simbología: 
Círculo: Inicio de proceso
Rectángulo: Actividad del proceso
Rombo: Decisión del proceso
Línea de flujo entre pasos del proceso
Colores: 
Naranja: Corresponde a un evento de viaje en UNIGIS
Morado: Corresponde a un evento de parada en UNIGIS
Amarillo: Corresponde a un evento de LS fuera de UNIGIS
Azul: Corresponde a un evento de notificación desde UNIGIS
Verde: Corresponde a un evento de interfaz entre sistemas
Gris: Corresponde a notas aclaratorias sobre el flujo
Diagrama de flujo de trabajo e integraciones
LUIS SIMOES - Diagrama Flujo de Trabajo e Integraciones v6.png

--- TABLE START ---
Paso 1 | Descripción
Creación de Clientes | Los clientes se crean en UNIGIS desde SID mediante la interfaz 7.
--- TABLE END ---


--- TABLE START ---
Paso 2 | Descripción
Creación de Pedidos y Geolocalización de Clientes y Destinatarios | Los pedidos se crean en UNIGS desde SID mediante la interfaz 1. / En la creación de pedidos se incluye la creación y actualización de destinatarios. Sin embargo, una vez creados los pedidos, se pueden geolocalizar interactivamente de forma masiva en el módulo OM (Order Management) de UNIGIS los pedidos cuyos clientes o destinatarios no estén geolocalizados. De esta forma, una vez se creen los viajes con las paradas asociadas a los pedidos creados, los clientes y destinatarios tendrán coordenadas.
--- TABLE END ---


--- TABLE START ---
Paso 3 | Descripción
Creación de Viajes y Paradas | Se crean los viajes y paradas (asociándolas con los pedidos creados previamente) en UNIGIS desde SID mediante la interfaz 2.
--- TABLE END ---


--- TABLE START ---
Paso 4 | Descripción
Validación de Conductor y Vehículo | Dependiendo del caso:  / 1. Conductor y vehículo concreto: El viaje se notifica directamente al conductor para su aceptación o rechazo.  / 2. Conductor y/o vehículo no determinado: El viaje se notifica primero a la agencia, que asigna un conductor y/o vehículo antes de notificar al conductor.
--- TABLE END ---


--- TABLE START ---
Paso 5 | Descripción
Rechazo de Viaje | En caso de rechazo, se realizan ajustes al viaje o a las paradas en SID y se sincronizan con UNIGIS para actualizar el estado del viaje. Estos cambios se envían a UNIGIS mediante la interfaz 3.
--- TABLE END ---


--- TABLE START ---
Paso 6 | Descripción
Alta de Agencia, Conductor o Vehículo | Si una agencia, un conductor o un vehículo no está dado de alta en UNIGIS, se realiza su creación en UNIGIS desde SID mediante las interfases 8, 9 y 10 antes de proceder con la modificación del viaje.
--- TABLE END ---


--- TABLE START ---
Paso 7 | Descripción
Asignación de recursos por la Agencia | La agencia realiza la asignación de recursos en SID y se envían a UNIGIS mediante la interfaz 3.  / En el caso de que el conductor asignado no estaba dado de alta, UNIGIS creará su usuario y se lo asignará automáticamente para así notificar al conductor las credenciales de su usuario para acceder a la aplicación móvil. / Posteriormente, el conductor recibe la notificación (Email y SMS/Whatsapp) y debe aceptar el viaje mediante la aplicación móvil.
--- TABLE END ---


--- TABLE START ---
Paso 8 | Descripción
Activación del Viaje | Con la aceptación del viaje por parte del conductor, se generan notificaciones automáticas al depósito o cliente para preparar la recepción del conductor y permitir el inicio del viaje.
--- TABLE END ---


--- TABLE START ---
Paso 9 | Descripción
Parada de Recolección (Circuitos 1 y 2) | 1. Recolección en Cliente: El conductor llega a la ubicación del cliente, registra el inicio y fin de carga y luego en Mobile confirma si se cargó todo lo previsto o si hubo un problema en la carga. Los cambios de estado se deberán efectuar dentro de la geocerca del cliente y, en el caso de que se salga de la geocerca sin confirmar la recolección, se enviará una notificación al conductor y a Control Tower. / Si ocurre un problema, el conductor cambia el estado de la parada a Problema, indica el motivo, toma una foto y realiza una validación de cantidades. / En el caso de que no se registre el inicio de la carga y pase un determinado tiempo parametrizable desde el estado Visitado y la fecha y hora de entrega prevista, se cambiará automáticamente la parada a Problema en la Parada con el motivo ‘Aguarda carga’ para que Control Tower pueda resolver la incidencia. / 2. Recolección en Depósito: El conductor se presenta en la portería del depósito y se valida o no el acceso si los datos del viaje son correctos. En la Fase 2 del proyecto se consultará mediante interfase a UNIGIS si el viaje está activo y se respeta la hora prevista de carga para realizar el cambio de estado de la parada a ‘Acceso Conductor Validado’ o ‘Acceso Conductor No Validado’. / Una vez validado el acceso, el conductor se presenta en la garita, donde se valida el QR del viaje y la documentación del conductor y el vehículo. En el futuro se desarrollará una funcionalidad que permita la lectura del QR de una parada para validar cargas en distintos depósitos de un mismo viaje y que automáticamente cambie el estado de la parada a ‘Presentación Conductor Validado’ o ‘Presentación Conductor No Validado’ según corresponda. / Una vez verificada la presentación del conductor, el personal de la garita entrega la hoja de carga y registra el inicio y el fin de la carga de la mercancía. / Si ocurre un problema, el personal de la garita cambia el estado de la parada a Problema, indica el motivo, toma una foto y realiza una validación de cantidades. / Para la Fase 1 del proyecto el conductor se presenta en la portería del depósito, y marca el comienzo y el fin de la recolección en la aplicación.
--- TABLE END ---


--- TABLE START ---
Paso 10 | Descripción
Siguiente Parada | Una vez se confirma el primer punto de carga, el conductor se dirige a la siguiente parada, que puede ser de recolección o de entrega, es decir, puede continuar en cualquiera de los otros circuitos, ya sea de recolección o de entrega (Circuitos 1, 2, 3 y 4).
--- TABLE END ---


--- TABLE START ---
Paso 11 | Descripción
Parada de Entrega (Circuitos 3 y 4) | 3. Entrega en Depósito: El conductor se presenta en la portería del depósito y se valida o no el acceso si los datos del viaje son correctos. En la Fase 2 del proyecto se consultará mediante interfase a UNIGIS si el viaje está activo y se respeta la hora prevista de carga para realizar el cambio de estado de la parada a ‘Acceso Conductor Validado’ o ‘Acceso Conductor No Validado’. / Una vez validado el acceso, el conductor se presenta en la garita, donde se valida el QR del viaje y la documentación del conductor y el vehículo. En el futuro se desarrollará una funcionalidad que permita la lectura del QR de una parada para validar cargas en distintos depósitos de un mismo viaje y que automáticamente cambie el estado de la parada a ‘Presentación Conductor Validado’ o ‘Presentación Conductor No Validado’ según corresponda. / Una vez verificado, se le permite realizar la descarga y se registra el inicio y fin de la descarga de la mercancía (adjuntando una foto para la evidencia). / 4. Entrega en Cliente: El conductor llega a la ubicación del cliente, registra el inicio y fin de descarga y luego en Mobile confirma si se descargó todo lo previsto o si hubo un problema en la descarga.  Los cambios de estado se deberán efectuar dentro de la geocerca del cliente y, en el caso de que se salga de la geocerca sin confirmar la entrega, se enviará una notificación al conductor y a Control Tower. / Si ocurre un problema, el conductor cambia el estado de la parada a Problema, indica el motivo, toma una foto y realiza una validación de cantidades. / En el caso de que no se registre el inicio de la descarga y pase un determinado tiempo parametrizable desde el estado Visitado y la fecha y hora de entrega prevista, se cambiará automáticamente la parada a Problema en la Parada con el motivo ‘Aguarda descarga’ para que Control Tower pueda resolver la incidencia.
--- TABLE END ---


--- TABLE START ---
Paso 12 | Descripción
Resolución de problemas | - Si se registra un problema en la carga (añadiendo foto, motivo y una validación de cantidades), el conductor debe esperar a que desde SID se indique la resolución de la incidencia (si no hay respuesta en un determinado tiempo parametrizable, se habilitará el estado ‘Sin respuesta’ para que el conductor pueda confirmar la carga) realizando uno de los siguientes cambios de estado de la parada mediante la interfaz 4:  / a) Recolectado / b) Recolectado Parcial (A definir): Una vez se sepa el responsable se puede cambiar el estado de la parada a Recolectado Parcial (Transporte), Recolectado Parcial (LS), Recolectado Parcial (Cliente). / c) No recolectado (A definir): Una vez se sepa el responsable se puede cambiar el estado de la parada a No recolectado (Transporte), No recolectado (LS), No recolectado (Cliente).  / En el caso de que la parada se encuentre en estado Recolectado Parcial o No recolectado, se debe enviar desde SID a UNIGIS la modificación de la parada con lo realmente cargado mediante la interfaz 2.  / - Si se registra un problema en la descarga (añadiendo foto, motivo y una validación de cantidades), el conductor debe esperar a que desde SID se indique la resolución de la incidencia (si no hay respuesta en un determinado tiempo parametrizable, se habilitará el estado ‘Sin respuesta’ para que el conductor pueda confirmar la descarga) realizando uno de los siguientes cambios de estado de la parada mediante la interfaz 4:  / a) Entregado / b) Entregado Parcial (A definir): Una vez se sepa el responsable se puede cambiar el estado de la parada a Entregado Parcial (Transporte), Entregado Parcial (LS), Entregado Parcial (Cliente). / c) No entregado (A definir): Una vez se sepa el responsable se puede cambiar el estado de la parada a No entregado (Transporte), No entregado (LS), No entregado (Cliente).  / En el caso de que la parada se encuentre en estado Entregado Parcial o No entregado, se debe enviar desde SID a UNIGIS la creación de las paradas de retorno con lo que no se pudo descargar mediante la interfaz 2.
--- TABLE END ---


--- TABLE START ---
Paso 13 | Descripción
Finalización de Viaje | Si todas las paradas se encuentran en un estado final, se finaliza el viaje automáticamente. Si todavía hay paradas pendientes de confirmación al final del día, se podrá cerrar el viaje por parte del personal de Control Tower o mediante un proceso automático.  / Una vez finalizado el viaje, se cambiará el estado del viaje desde SID cuando se realice la entrega de la documentación, que puede ser total o parcial (estados de viaje ‘Rendido’ y ‘Rendido Parcial’) . Cuando se tiene toda la documentación del viaje, desde SID se cambiará el estado del viaje a ‘Digitalizado’ y, una vez que se hayan validado los procesos de tarificación y liquidación del viaje, se cambiará de nuevo el estado del viaje a ´Liquidable’.
--- TABLE END ---


--- TABLE START ---
Paso 14 | Descripción
Cancelación de Viaje | Desde cualquiera de los estados de viaje hasta el estado Finalizado se podrá cambiar el estado del viaje a ‘Cancelado’ desde SID mediante la interfaz 3.
--- TABLE END ---


--- TABLE START ---
Paso 15 | Descripción
Transiciones de estado | Cualquier transición de estado de un viaje o una parada se enviará desde UNIGIS a SID mediante las interfases 5 y 6.
--- TABLE END ---

Desarrollos identificados
Etiquetas de estados (Pedido, Parada y Viaje) y motivos multi-idioma (identificado dentro del RoadMap 2025 de UNIGIS)
Validación del QR a nivel de parada para validar cargas en distintos depósitos de un mismo viaje y que automáticamente cambie el estado de la parada
Aplicación UNIGIS DeliveriesX compatible con el sistema operativo IOS (identificado dentro del RoadMap 2025 de UNIGIS)
Anexo 1: Entidades y Workflows
En este anexo se incluyen las entidades de UNIGIS que están involucradas en el proyecto, así como un cuadro de workflows con los diferentes estados detallados y transiciones para cada una de las entidades.
Entidades: Viaje, Parada y Pedido
Estados de Viaje:
Pendiente: Viaje creado
Pendiente Agencia: Viaje sin vehículo y/o conductor determinado
Rechazado Agencia: Agencia (Proveedor de transporte) no acepta el viaje
Aceptado Agencia: Agencia (Proveedor de transporte) acepta el viaje
Programado: Viaje con vehículo y conductor asignado
Pendiente Conductor: Viaje pendiente de ser aceptado o rechazado por el conductor
Aceptado Conductor: Viaje aceptado por el conductor
Rechazado Conductor: Viaje rechazado por el conductor
Activo: Conductor se loguea en Mobile e inicia el viaje
Finalizado: Viaje con todas las paradas tratadas (finalizadas)
Cancelado: Viaje cancelado
Rendido: Viaje con toda la documentación entregada
Rendido Parcial: Viaje con documentación faltante
Digitalizado: Viaje con toda la documentación digitalizada
Liquidable: Viaje verificado para su tarifación y liquidación
Estados de Parada/Pedido:
Inicial: Parada/Pedido creada
Pendiente Recolección Cliente: Parada/Pedido del cliente está pendiente de ser recolectado en punto de carga fuera de Luís Simões
Pendiente Recolección Depósito: Parada/Pedido del cliente está pendiente de ser recolectado en almacén de Luís Simões
Pendiente Entrega Depósito: Parada/Pedido del cliente está pendiente de ser entregado en almacen de Luís Simões
Pendiente Entrega Cliente: Parada/Pedido del cliente está pendiente de ser entregado en punto de entrega fuera de Luís Simões
Visitado: Cuando el conductor llega a la parada de recolección o entrega en un punto de carga o descarga fuera de Luís Simões
Arribo a Portería: Cuando el conductor llega a la portería (Para Fase 2 de acuerdo a las interfases definidas)
Fin Recolección Depósito: Cuando el conductor finaliza la recolección en depósito (Solo para Fase 1)
Acceso Conductor Validado: Validación del viaje en portería (Para Fase 2 de acuerdo a las interfases definidas)
Acceso Conductor No Validado: No Validación del viaje en portería (Para Fase 2 de acuerdo a las interfases definidas)
Presentación Conductor Validado: Validación del conductor en la garita de distribución (garantizando que tiene QR Code válido)
Presentación Conductor No Validado: No validación del conductor en la garita de distribución (garantizando que tiene QR Code válido)
Inicio Carga: Inicio de la operación de carga por parte del conductor
Fin Carga: Fin de la operación de carga por parte del conductor
Inicio Carga Depósito: Inicio de la operación de carga por parte de la garita
Fin Carga Depósito: Fin de la operación de carga por parte de la garita
Inicio Descarga: Inicio de la operación de descarga
Fin Descarga: Fin de la operación de descarga
Problema en Parada: Registro de un problema (incidencia) en la parada y/o pedido del cliente con motivos predefinidos, cantidades, observaciones y foto
Sin Respuesta: Control Tower no envía la resolución del problema en la parada dentro de un determinado tiempo, habilitando con este estado que el conductor pueda confirmar la carga o la descarga
Recolectado: Parada/Pedido del cliente recolectado de acuerdo con lo previsto
Recolectado Parcial (Responsable A definir): Parada/Pedido del cliente recolectado parcialmente y con responsable a definir
Recolectado Parcial (Transporte): Parada/Pedido del cliente recolectado parcialmente y cuyo responsable es el Transporte
Recolectado Parcial (LS): Parada/Pedido del cliente recolectado parcialmente y cuyo responsable es Luis Simoes 
Recolectado Parcial (Cliente): Parada/Pedido del cliente recolectado parcialmente y cuyo responsable es el Cliente
No recolectado (Responsable A definir): Parada/Pedido del cliente no recolectado (totalmente) y con responsable a definir
No recolectado (Transporte): Parada/Pedido del cliente no recolectado (totalmente) y cuyo responsable es el Transporte
No recolectado (LS): Parada/Pedido del cliente no recolectado (totalmente) y cuyo responsable es Luis Simoes
No recolectado (Cliente): Parada/Pedido del cliente no recolectado (totalmente) y cuyo responsable es el Cliente
Entregado: Parada/Pedido del cliente entregado de acuerdo con lo previsto
Entregado Parcial (Responsable A definir): Parada/Pedido del cliente entregado parcialmente y con responsable a definir
Entregado Parcial (Transporte):Parada/Pedido del cliente entregado parcialmente y cuyo responsable es el Transporte
Entregado Parcial (LS):Parada/Pedido del cliente entregado parcialmente y cuyo responsable es Luis Simoes 
Entregado Parcial (Cliente): Parada/Pedido del cliente entregado parcialmente y cuyo responsable es el Cliente
No entregado (Responsable A definir): Parada/Pedido del cliente no entregado (totalmente) y con responsable a definir
No entregado (Transporte): Parada/Pedido del cliente no entregado (totalmente) y cuyo responsable es el Transporte
No entregado (LS): Parada/Pedido del cliente no entregado (totalmente) y cuyo responsable es Luis Simoes
No entregado (Cliente): Parada/Pedido del cliente no entregado (totalmente) y cuyo responsable es el Cliente
Tabla de Transiciones de Estados de Viaje y Parada/Pedido

--- TABLE START ---
Disparador Cambio de Estado | Entidad  | Estado Inicial | Estado Final
Creación del viaje | Viaje | - | Pendiente
Viaje con Conductor y/o Vehículo No Determinado | Viaje | Pendiente | Pendiente Agencia
Rechazo de la agencia | Viaje | Pendiente Agencia | Rechazado Agencia
Aceptación por la agencia | Viaje | Pendiente Agencia | Aceptado Agencia
Viaje con Conductor y Vehículo concreto | Viaje | Pendiente / Aceptado Agencia | Programado
Notificación al conductor | Viaje | Programado | Pendiente Conductor
Rechazo por parte del conductor | Viaje | Pendiente Conductor | Rechazado Conductor
Aceptación del viaje por parte del conductor | Viaje | Pendiente Conductor | Aceptado Conductor
Creación de la parada en el viaje | Parada/Pedido | - | Inicial
Viaje aceptado por el conductor | Parada/Pedido | Inicial | Pendiente Recolección Cliente / Pendiente Recolección Depósito / Pendiente Entrega Depósito / Pendiente Entrega Cliente
Inicio del viaje | Viaje | Aceptado Conductor | Activo
Llegada del conductor a la parada | Parada/Pedido | Pendiente (cualquier tipo) | Visitado
Arribo a portería en una parada de depósito | Parada/Pedido | Pendiente | Arribo a Portería
Confirmación recolección en depósito (Fase1) | Parada/Pedido | Arribo a Portería | Fin Recolección Depósito
Validación en portería | Parada/Pedido | Arribo a Portería | Acceso Conductor Validado / Acceso Conductor No Validado
Validación en garita | Parada/Pedido | Acceso Conductor Validado | Presentación Conductor Validado / Presentación Conductor No Validado
Inicio de la actividad (carga o descarga) | Parada/Pedido | Presentación Conductor Validado | Inicio Carga / Inicio Carga Depósito / Inicio Descarga 
Finalización de la actividad (carga o descarga) | Parada/Pedido | Inicio Carga / Inicio Carga Depósito / Inicio Descarga | Fin Carga / Fin Carga Depósito / Fin Descarga
Problema detectado en la parada | Parada/Pedido | Cualquier estado | Problema en Parada
Sin respuesta de Control Tower al problema | Parada/Pedido | Problema en Parada | Sin respuesta
Confirmación del estado final de la parada | Parada/Pedido | Problema en Parada / Fin Carga / Fin Carga Depósito / Sin respuesta | Recolectado / Recolectado Parcial (Responsable A definir) / No recolectado (Responsable A definir)
Confirmación responsable de la recolección parcial | Parada/Pedido | Recolectado Parcial (Responsable A definir) | Recolectado Parcial (Transporte) / Recolectado Parcial (LS) / Recolectado Parcial (Cliente)
Confirmación responsable de la no recolección | Parada/Pedido | No recolectado (Responsable A definir) | No recolectado (Transporte) / No recolectado (LS) / No recolectado (Cliente)
Confirmación del estado final de la entrega | Parada/Pedido | Problema en Parada / Fin Descarga / Sin respuesta | Entregado / Entregado Parcial (Responsable A definir) / No entregado (Responsable A definir)
Confirmación responsable de la entrega parcial | Parada/Pedido | Entregado Parcial (Responsable A definir) | Entregado Parcial (Transporte) / Entregado Parcial (LS) / Entregado Parcial (Cliente)
Confirmación responsable de la no entrega | Parada/Pedido | No entregado (Responsable A definir) | No entregado (Transporte) / No entregado (LS) / No entregado (Cliente)
Cancelación de viaje | Viaje | Pendiente / Pendiente Agencia / Rechazado Agencia / Aceptado Agencia / Programado / Pendiente Conductor / Aceptado Conductor / Rechazado Conductor / Activo | Cancelado
Todas las paradas del viaje en estado final | Viaje | Activo | Finalizado
Validación de la documentación del viaje | Viaje | Finalizado | Rendido / Rendido Parcial
Verificación de la digitalización de la documentación del viaje | Viaje | Rendido | Digitalizado
Verificación de la tarifación del viaje | Viaje | Digitalizado | Liquidable
--- TABLE END ---

Aprobación

--- TABLE START ---
Cuadro de aceptación 
Firma de aceptación del Sponsor del proyecto LUIS SIMOES
Nombre    | Fecha | Firma
Luis Miguel Freitas |  | 
Firma de aceptación de la Gerencia del proyecto LUIS SIMOES
Nombre    | Fecha | Firma
André Santos |  | 
Antonio Fernandes |  | 
Paulo Cruz |  | 
Firma de aceptación Líder Funcional/Técnico LUIS SIMOES
Nombre    | Fecha | Firma
Vitor Silva |  | 
Nuno Gama |  | 
Firma de Equipo de Proyecto UNIGIS 
Nombre   | Fecha | Firma
Javier Martínez |  | 
Jorge Sureda  |  | 
Diego Senra |  | 
Gonzalo Castro |  | 
--- TABLE END ---
