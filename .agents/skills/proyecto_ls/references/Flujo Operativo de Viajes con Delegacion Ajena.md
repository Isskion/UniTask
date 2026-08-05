
--- TABLE START ---
NARRATIVA DE FLUJO OPERATIVO / Flujo Operativo de Viajes con Delegación Ajena / De la asignación del viaje al cierre de la recolección, pasando por el tracking en tiempo real
--- TABLE END ---


--- TABLE START ---
Tipo de documento | Narrativa funcional de flujo operativo
Cliente / Proyecto | TMS Unigis
Elaborado por | Daniel del Amo
Fecha | 3 de julio de 2026
Versión | 1.0
Nº de pasos documentados | 8
--- TABLE END ---


--- TABLE START ---
RESUMEN EJECUTIVO / Este documento narra, paso a paso, cómo un viaje gestionado con una delegación ajena avanza desde su asignación inicial hasta el cierre de la recolección, mostrando en qué momentos se comunican los sistemas y qué ocurre cuando algo no sale según lo previsto.
--- TABLE END ---

Resumen del flujo

--- TABLE START ---
Fase | Pasos
FASE 1 — PREPARACIÓN Y ASIGNACIÓN | 2
FASE 2 — GESTIÓN EN DELEGACIÓN | 2
FASE 3 — MONITOREO Y TRACKING | 2
FASE 4 — CIERRE DE RECOLECCIÓN | 2
--- TABLE END ---


--- TABLE START ---
Grupo | Código | Descripción
GRUPO A: SIN PLANIFICACIÓN LS | [A1] | Delegaciones ajenas multi-operador con su sistema, con capacidad de desarrollar integraciones y sin planeamiento LS.
 | [A2] | Delegaciones ajenas multi-operador con su sistema, sin capacidad de desarrollar integraciones y sin planeamiento LS.
 | [A3] | Delegaciones ajenas multi-operador sin sistema, sin capacidad de desarrollar integraciones y sin planeamiento LS.
GRUPO B: CON PLANIFICACIÓN LS | [B1] | Delegaciones ajenas con exclusividad LS sin sistema y con planeamiento de rutas.
Estructura en TMS: Se van a crear Depósitos y Tipos de Jornadas para cada una de las delegaciones ajenas.
--- TABLE END ---

FASE 1 — PREPARACIÓN Y ASIGNACIÓN
Paso 1. Viaje con agencia
Preparación de viaje y asignación a agencia
Todo comienza cuando el sistema Unigis asigna el viaje a una agencia y actualiza automáticamente su estado a «Pendiente agencia». Este cambio de estado es lo que habilita al transportista a visualizar y gestionar el viaje desde su portal, dando así el pistoletazo de salida al proceso de tendering. 
Paso 2. 1° Momento de envío - información provisoria
Envío de datos iniciales a delegación ajena
Cuando el viaje esté asignado a una agencia en estado PENDIENTE AGENCIA, TMS Unigis envía a la EAL la información provisoria del viaje, ya sea mediante una interfaz automática o una notificación. Esta primera entrega de datos es la que permite que la delegación inicie su propio proceso de aceptación y organización interna. 
FASE 2 — GESTIÓN EN DELEGACIÓN
Paso 3. En delegación Ajena
Recepción y registro de mercancía en delegación
Informada y preparada, la delegación ajena recibe físicamente la mercancía. Es en este momento cuando su personal debe registrar con detalle la llegada y la descarga: fechas y horas exactas, cualquier incidencia detectada y fotografías que documenten en qué condición llegó la carga.
Paso 4. En Destinatario [domicilio orden]
Reporte de entrega y eventos en destino
Una vez la mercancía queda registrada en la delegación, el proceso avanza hasta el destinatario final: el sistema debe reflejar primero la salida a reparto y, después, el resultado real de la entrega —completa, parcial, con incidencia o no entregada— junto con la prueba de entrega (POD) que la respalda y la posición GPS de los eventos realizados.
FASE 3 — MONITOREO Y TRACKING
Paso 5. Control Tower LS
Monitoreo centralizado de estados de tracking
Con la entrega ya resuelta en el terreno, el foco pasa a la visibilidad del proceso: el Control Tower LS actúa como centro de monitoreo, recibiendo y consolidando en un mismo lugar los estados de tracking que llegan tanto del TMS Unigis como del sistema de la delegación ajena. Gracias a esto, cualquiera puede tener una visión global y en tiempo real de cómo avanza el viaje. 
Paso 6. Motorista LS/Ajena y Portal TMS
Reporte de estados y eventos por el motorista
Esa visibilidad que ofrece el Control Tower depende del motorista, quien reporta en tiempo real desde la aplicación Unigis X Deliveries si visitó cada parada, el motivo del resultado de la entrega y las evidencias fotográficas correspondientes. 
Las delegaciones Ajenas con sistemas propios reportaran los estados y eventos a través de las interfaces con EAL que, a su vez, reporta a TMS. Salvo en los casos que asuman la utilización de la Aplicación Unigis X Deliveries y que reportarán directamente.
FASE 4 — CIERRE DE RECOLECCIÓN
Paso 7. Recolección en Col Salida
Registro de carga y documentación en WMS/TMS
El proceso da un giro hacia el cierre cuando, en el punto de salida, el WMS registra la recolección de la mercancía: se documenta que se cargó todo lo previsto y se toma una fotografía que valida la carga física. Si lo cargado no coincide con lo planeado, el sistema debe registrar esa diferencia y actualizar el manifiesto de carga en consecuencia.
Paso 8. 2° Momento de envío de la información
Envío de información final de carga/recolección
El WMS envía al TMS la información definitiva de la carga, precisando si se recolectó de forma completa, parcial o si finalmente no se recolectó, mediante la interfaz con EAL hacia TMS.  Después TMS envía a las delegaciones ajenas esta actualización vía EAL de nuevo, bien por interfaz, bien por notificación.