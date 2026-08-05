
--- TABLE START ---
NARRATIVA DE FLUJO OPERATIVO / Flujo Operativo de Viajes con Subcontratación TI / De la asignación del viaje al cierre de la recolección, pasando por el tracking en tiempo real
--- TABLE END ---


--- TABLE START ---
Tipo de documento | Narrativa funcional de flujo operativo
Cliente / Proyecto | TMS Unigis
Elaborado por | Daniel del Amo
Fecha | 6 de julio de 2026
Versión | 1.0
Nº de pasos documentados | 8
--- TABLE END ---


--- TABLE START ---
RESUMEN EJECUTIVO / Este documento narra, paso a paso, cómo un viaje gestionado con una subcontratación avanza desde su asignación inicial hasta el cierre de la recolección, mostrando en qué momentos se comunican los sistemas y qué ocurre cuando algo no sale según lo previsto.
--- TABLE END ---

Resumen del flujo

--- TABLE START ---
Fase | Pasos
FASE 1 — PREPARACIÓN Y ASIGNACIÓN | 2
FASE 2 — GESTIÓN EN DELEGACIÓN | 2
FASE 3 — MONITOREO Y TRACKING | 2
FASE 4 — CIERRE DE RECOLECCIÓN | 2
--- TABLE END ---

Interfaces entre TMS Unigis y TMS Andsoft
Comunicación entre TMS Unigis y TMS Andsoft en los casos de subcontratación de TI. Cada paso del flujo hace referencia al interfaz correspondiente mediante su código [n].

--- TABLE START ---
Interfaz | Sentido | Descripción
[1] | Unigis → EAL | Interface con la información del viaje y sus pedidos.
[2] | Unigis → EAL | Actualización de pedidos y cantidades en el momento de la carga.
[3] | EAL → Unigis | Actualización de estados que vengan de TMS Andsoft o mobilidad de TI (Astrata y Trackapp).
[4] | EAL → Unigis | Fotos de los albaranes y fotos de incidencias, que vengan de TMS Andsoft o mobilidad de TI (Astrata y Trackapp).
[5] | EAL → Unigis | Creación de la incidencia, que venga de TMS Andsoft o mobilidad (Astrata y Trackapp).
[6] | EAL → Andsoft | Respuesta a la incidencia y generación del retorno (Total o Parcial).
--- TABLE END ---

FASE 1 — PREPARACIÓN Y ASIGNACIÓN
Paso 1. Viaje con Transportes TI
Preparación de viaje y asignación a agencia
Interfaz relacionada: [1]
Todo comienza cuando el sistema Unigis asigna el viaje al Transporte TI y actualiza automáticamente su estado a «Pendiente agencia». Este cambio dispara un interfaz a EAL para transmitir la información del viaje y sus pedidos al TMS sistema de TI.
Paso 2. 1° Momento de envío - información provisoria
Envío de datos iniciales a delegación ajena
Interfaz relacionada: [1]
Cuando el viaje esté asignado a una agencia en estado PENDIENTE AGENCIA, TMS Unigis envía a la EAL la información provisoria del viaje, mediante una interfaz automática. 
FASE 2 — GESTIÓN EN DELEGACIÓN
Paso 3. En Transporte TI
Recepción y registro de mercancía en delegación
Interfaz relacionada: [1]
Informado y preparado, Transportes TI crea el viaje y expediciones en su sistema a partir de esto datos.
Paso 4. En Destinatario [domicilio orden]
Reporte de entrega y eventos en destino
Interfaz relacionada: [3] [4] [5]
Una vez la información queda registrada en Transportes TI, el proceso avanza hasta el destinatario final, El resultado real de la entrega —completa, parcial, con incidencia o no entregada— junto con la prueba de entrega (POD) que la respalda y la posición GPS de los eventos realizados, devolviendo esta información a TMS Unigis a través de una interfaz mediante EAL.
FASE 3 — MONITOREO Y TRACKING
Paso 5. Control Tower LS
Monitoreo centralizado de estados de tracking
Interfaz relacionada: [3]
Con la entrega ya resuelta en el terreno, el foco pasa a la visibilidad del proceso: el Control Tower LS actúa como centro de monitoreo, recibiendo y consolidando los estados de tracking que llegan del sistema Transportes TI. Gracias a esto, cualquiera puede tener una visión global y en tiempo real de cómo avanza el viaje. 
Paso 6. Problema en Parada
Reporte de estados y eventos por el motorista
Interfaz relacionada: [5] [6]
Cuando se reporta un problema en parada a través de interfaz desde Transportes TI, el Control Tower envía la resolución de la incidencia a EAL para que se transmita Transportes TI a través de interfaz.
FASE 4 — CIERRE DE RECOLECCIÓN
Paso 7. Recolección en Col LS
Registro de carga y documentación en WMS/TMS
Interfaz relacionada: [2]
El proceso da un giro hacia el cierre cuando, en el punto de salida, el WMS registra la recolección de la mercancía: se documenta que se cargó todo lo previsto y se toma una fotografía que valida la carga física. Si lo cargado no coincide con lo planeado, el sistema debe registrar esa diferencia y actualizar el manifiesto de carga en consecuencia.
Así mismo el TMS Unigis emitirá el mapa de carga con la información de la carga actualizada. Esta información es a su vez transmitida a EAL para que informe a Transportes TI.
Paso 8. 2° Momento de envío de la información
Envío de información final de carga/recolección
Interfaz relacionada: [2]
El WMS envía al TMS la información definitiva de la carga, precisando si se recolectó de forma completa, parcial o si finalmente no se recolectó, mediante la interfaz con EAL hacia TMS.  Después TMS envía a Transportes TI esta actualización vía EAL de nuevo por interfaz.