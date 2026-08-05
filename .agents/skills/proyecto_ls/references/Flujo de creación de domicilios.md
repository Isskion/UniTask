
--- TABLE START ---
NARRATIVA DE FLUJO OPERATIVO / Georeferenciación de Domicilios Fijos y Variables / Narrativa funcional del flujo, de la recepción del pedido a la confirmación
--- TABLE END ---


--- TABLE START ---
Tipo de documento | Narrativa funcional de flujo operativo
Cliente / Proyecto | Proyecto / Cliente
Elaborado por | Analista Funcional
Fecha | 1 de julio de 2026
Versión | 1.0
Nº de pasos documentados | 9
--- TABLE END ---

Resumen del flujo

--- TABLE START ---
Fase | Pasos
FASE 1 — RECEPCIÓN Y PROCESAMIENTO | 1
FASE 2 — GEOREFERENCIACIÓN Y VALIDACIÓN | 6
FASE 3 — RESOLUCIÓN DE ERRORES | 1
FASE 4 — CONFIRMACIÓN DE PEDIDO | 1
--- TABLE END ---

FASE 1 — RECEPCIÓN Y PROCESAMIENTO
Paso 1. Recepción de Información del Pedido
Procesamiento de datos de destino fijo y variable, y actualización de EAL.
El sistema TMS recibe y procesa la información detallada del pedido, incluyendo los datos del destinatario fijo y variable. Esta fase asegura la consolidación y actualización de datos entre el TMS y el EAL mediante una interfaz bidireccional, garantizando la consistencia. Si la información del código de destinatario es insuficiente o faltan datos críticos, el proceso de georeferenciación no podrá iniciar, requiriendo intervención. Un campo con el tipo de GEO es mandatorio en los domicilios fijos para una correcta gestión.
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
En la grilla de pedidos, se podrán filtrar los pedidos en estado 'PEDIDO - ERROR', indicativo que precisan de revisión y  correción manual.
FASE 4 — CONFIRMACIÓN DE PEDIDO
Paso 9. Pedido Cliente OK
Creación final del pedido del cliente con datos georreferenciados válidos.
Este paso representa la culminación exitosa del proceso de georeferenciación, donde el pedido del cliente se crea o actualiza en el sistema OM. Se asocian los datos del domicilio y las coordenadas finales, ya sean las exactas (Tipo 2) o las aproximadas validadas manualmente (Tipo 1). Es fundamental que este paso asegure que las coordenadas sean un dato obligatorio, garantizando la integridad de la información. Con el pedido en estado OK, el flujo puede avanzar a las siguientes etapas logísticas.