# Proyecto EUP: Módulo de Cobranzas App Mobile

**CLIENTE:** EUROPASTRY ES
**PROYECTO / SERVICIO:** UNIGIS TMS
**COMPONENTE / MODULO:** App Mobile

## RESPONSABLES UNIGIS
| Fecha | Prioridad | Autor | Correo | Aprobado por |
|---|---|---|---|---|
| 02/02/2026 | 1 | Consultor Sr | jorge.martinez@unigis.com | |

## APROBACION DEL CLIENTE
| Fecha | Quien solicito el cambio | Rol del solicitante |
|---|---|---|
| 02/02/2026 | Alessandro Milani | Gerente de Proyecto |

## REGISTRO DE CAMBIOS / HISTORIA DE REVISIONES
| Versión | Causa del Cambio | Responsable del Cambio | Fecha del Cambio |
|---|---|---|---|
| 0100 | Versión inicial | Jorge Martínez | 06/11/2025 |

---

## INTRODUCCION 

El cliente Europastry es una empresa española líder en la producción y distribución de masas congeladas de panadería y bollería, con sede en San Cugat del Vallés, Barcelona. Actualmente está presente en más de 90 países, cuenta con 29 plantas productivas en Europa y América, y supera los 1.500 millones de euros en facturación anual y ha seleccionado a Unigis como su TMS para la operación de Distribución.

En este circuito operativo el conductor es clave en el proceso de distribución y reparto ya que además tiene la atribución de realizar cobros con distintos medios de pago:
- Efectivo.
- Cheque
- Pagaré
- Tarjeta de débito o crédito

Además, tiene la facultad de realizar depósitos bancarios del dinero en efectivo cobrado durante la ejecución de su viaje, de allí surge la necesidad de realizar mejoras importantes en la app Unigis X Delivieries.
*Alarma por tope de efectivo*

## PROPOSITO u OBJETIVO
Controlar a través de la App Unigis X Deliveries, en el proceso de confirmación entrega, los cobros asociados a cada parada, considerando todas las formas de pago descritas a través de la app, dando la posibilidad de generar e imprimir los documentos que son necesarios en toda transacción financiera.

---

## DESCRIPCION y ALCANCE

### FUNCIONES REQUERIDAS
**Cobranza con Mobile:** Se describen las funcionalidades que debe cubrir la aplicación.

1. Funcionamiento de la aplicación offline.
2. Indicar si la parada requiere cobro o no.
3. Controlar que no se pueda entregar si no se realiza cobro de por lo menos el valor mínimo indicado cuando una parada requiera cobro. En este sentido se debe considerar la siguiente excepción:
   a. Poder habilitar la entrega sin cobro mediante un código PIN que la torre de control entregue al conductor.
   b. Generación automática del PIN de entrega que pueda visualizarse en Unigis Tracking-Paradas.
   - Que en la tabla `Parada` se genere un campo nuevo, por ejemplo: `Parada.CodigoAutorizacionEntrega` y su valor lo genere de forma automática el sistema al crear la parada y que se muestre en el SmartPage de la Parada.
   *`JsonConfiguracionCobranza`: Cuando el cobro sea obligatorio y no se ha realizado ningún cobro en la parada, dar la posibilidad de ingresar un PIN.*

4. Se debe utilizar en la entidad `ParadaItem` los campos:
   a. Cantidad
   b. ValorUnitario
   c. TipoImpuesto (ParadaItemTipoImpuesto).
   d. Cobrado: Indica con True o False si ese ítem fue cobrado (total o parcialmente) o no.

5. Deben venir configurados de forma estándar por Defecto las siguientes Formas de Pago:
   a. Efectivo
   b. Tarjeta ( Crédito o Débito a través de pasarela de Pago).
   c. TPV (Terminal Punto de Venta Bancario)
   d. Cheque
   e. Pagaré

6. Configurar en cada Forma de Pago los datos que serán solicitados en la app Mobile: 
   Para todas las Formas de Pago se debe solicitar el importe que por defecto tendrá el valor existente en: `ValorACobrar – ValorCobrado` (Sumatoria de todos los cobros realizados y registrados en el sistema para la parada).
   En la app Unigis antes de levantar la pasarela de pago, debe venir precargado con el ValorACobrar y se debe entregar a opción de editar el valor. 
   - **Efectivo:** (Datos estándar)
   - **Tarjeta:** (Datos estándar)
   - **TPV: Terminal Punto de Venta:**
     i. Número de Comprobante
     ii. Foto (que permita adjuntar de la galería).
   - **Cheque:**
     i. Banco
     ii. FechaEmisión
     iii. FechaPago
     iv. Titular
     v. Número Cheque
     vi. Foto
   - **Pagaré:**
     i. Banco
     ii. FechaEmisión
     iii. FechaVencimiento
     iv. Titular
     v. Número Pagaré
     vi. Foto

7. **Agrupación de paradas para cobros consolidados:** Permitir agrupar paradas para el proceso de cobro. Se sugiere usar un parámetro para este punto o reutilizar alguno de los que existen:
   `Parametro.ParadasAgrupadas`
   `Parametro.ParadasAgrupadasMenu`
   `Parametro.ParadasAgrupadasTipoOrden`
   `Parametro.ParadasAgrupadasTipoParada`

8. **Atributos para agrupar paradas en mobile para cobros consolidados debe ser configurable.** Por defecto debe considerar clienteoorden y domicilioorden. Debe considerar campos como: 
   - IdTipoCarga, Temperatura, ClienteDador, TipoParada, IdOrdenParada, IdCategoriaParada y cualquier otro campo de la parada con identificadores (ID).
   - Campos Dinámicos de la parada.

9. **Al agrupar paradas la app debe aplicar lógicas para almacenar datos en las paradas según lo que se debe cobrar y lo cobrado.** Los campos que principalmente se deben considerar:
   a. **ValorMinimo:** Esto permite definir qué valor mínimo mostrar cuando se agrupan paradas y se cobran en conjunto. Definir con un parámetro en la tabla parámetro `Parametro.ValorMinimoCobroParadasAgrupadas`.
      - *Opciones:* 
        - Mayor: Toma el Valor más alto de las paradas agrupadas
        - Suma: Suma los valores mínimos de todas las paradas agrupadas.
   b. **ValorACobrar:** Definir cuál es el total a cobrar que mostrará la app cuando se agrupan paradas y se cobran en conjunto. Acá se debe realizar la suma de `Parada.ValorACobrar` de las paradas agrupadas. 

10. **Casos de uso, cuando se agrupan paradas para su cobro:**
   - **Caso 1: ENTREGA COMPLETA Y COBRO COMPLETO:** Se realiza la entrega completa y se cobra el total dispuesto en la parada (`Parada.ValorACobrar`). En este caso, el sistema debe registrar el valor cobrado en cada parada: `Parada.ValorCobrado = Parada.ValorACobrar`
   - **Caso 2: ENTREGA COMPLETA Y COBRO ENTRE MINIMO Y MENOR A Parada.ValorACobrar:** `Parada.ValorCobrado` = Distribuir el importe cobrado (Reparte el cobro realizado, como un cobro total de cada parada y en la ultima de ellas deja el saldo que sea menor al total).
   - **Caso 3: ENTREGA COMPLETA Y COBRO ENTRE MINIMO Y MAYOR A Parada.ValorACobrar:** `Parada.ValorCobrado = Parada.ValorACobrar`. `Parada.CobroEnExceso = ValorCobrado - ValorACobrar` (en la última parada)
   - **Caso 4: ENTREGA PARCIAL CON COBRO DE SOLO LO ENTREGADO:** Lo primero que debe realizar es el cambio de estado con la validación de cantidades, luego realizar el cálculo de cada `ParadaItem` por el precio unitario de lo que se entregará. `Parada.ValorCobrado = ParadaItem.ValorUnitario * ParadaItemCantidad.Cantidad` (realizado en la parada que se realizó la validación de cantidades). Para el resto de las paradas: `Parada.ValorCobrado = Parada.ValorACobrar`

11. Si el cobro realizado con la Forma de pago es rechazado, poder reintentar (ejemplo, con pasarela de pago por perdida de conexión o señal).
12. **Capacidad de revertir una parada y su cobro realizado:** Para esto se sugiere registrar un nuevo campo en `EstadoParadaTransicion.PermiteReversionCobro = True o False`.
    a. En transiciones de parada, configurar la opción “PermiteReversiónCobro”, si se activa esta opción, se debe apagar la opción de cobranza o viceversa. Al ejecutar una reversión de cobro, se debe indicar al usuario con un mensaje en pantalla que ya existen cobros, para que confirme o no la eliminación de este.
13. Debe existir un botón de **Cancelar y Guardar** en el proceso de cobranza. El botón de Guardar se habilitará solo si el o los cobros realizados son iguales o mayores a `Parada.MinimoACobrar`.
14. Cobranza de Documentos impagos anteriores adicionales a la parada. Para esto se registra `Parada.MinimoAcobrar`.
15. Controlar Entregas en paradas que requieren cobro de documentos impagos anteriores. Esto es, no se entrega si no se cobra estos documentos.

16. **Luego de realizar el proceso de confirmación de Entrega mostrar en pantalla de la app mobile:**
    a. MinimoACobrar
    b. TotalACobrar
    c. ValorCobrado
    d. Ver Documentos (muestra los documentos pendientes de cobro)
    e. Botón Ingresar Cobro: Al presionarlo, debe mostrar las formas de pago habilitadas, para que el usuario la seleccione. 
    f. Botón de Cancelar: Levantar un modal, que indique al usuario “Desea Anular cobros realizados”. 
    g. Botón de Guardar o Finalizar Cobro (inhabilitado si no se ha cobrado)

17. **Generación e impresión de comprobante de pago:** Al finalizar el proceso de cobro, debe existir una opción de Generar el comprobante asociado. Este comprobante debe contar con identificador único que puede ser configurado en la tabla Numerador o podría ser un hash del usuario conductor+yyyy+MM+dd+HHmmss.
    a. Se sugiere en este caso, poder dejar configurado un comprobante por defecto.
    b. Poder configurarlo por Operación, empresa o sucursal.
18. Identificar los tipos de documentos que pueden ser visibles en los viajes y paradas, manejándolo a través de permisos de grupos de usuarios.
19. Habilitar un botón “INGRESAR COBRO” y que sea controlado a nivel de Estado de Parada. Puede venir precargado con el valor pendiente de pago.
20. Múltiples medios de Pago (Efectivo, Tarjeta, Cheque) permitidos en el cobro.
21. Medios de Pago habilitados por cliente, clienteorden y/o domicilioorden.
22. Medio de pago preferente de cliente, clienteorden y/o domicilioorden.
23. Medios de pagos por defecto cuando no se encuentra seteado en cliente, clienteorden y/o domicilioorden.
    - Utilizar para este caso la entidad `FormaPagoEntidad` que se debe poblar cuando la Entidad que contiene la forma de pago es la Parada. 
    - Agregar un nuevo parámetro: `FormaPagoporDefecto: 1,2,4`
24. Cobros con más de un medio de pago.
25. Considerar tipo de Impuesto que apliquen a los productos (`ParadaItem`, `Parada`, `Domicilioorden` o `Clienteorden`).
26. Bonificaciones o descuentos de la parada (`BonificaciónEntidad`).
27. Configurar en el medio de pago un ValorMaximo (ejemplo: EfectivoMaximo: 1000 Euros). Para el tipo de Pago Efectivo colocar como valor por defecto 999 Euros.
28. Manejar en un campo del viaje el Saldo de Transportista (En Euros).
29. Poder realizar más de un cobro con el mismo medio de pago.
30. Definir en la Forma o medio de pago el monto y el número identificador de transacción o documento (para dispositivos externos de cobro).
31. Controlar en una entrega con cobros, la recolección de recursos que funcionan como abono a la entrega (Retornables). 
    - **1ra Opción:** Controlar a nivel de transiciones de parada (`Requiere cobros` y `Permite Retornables`). Si ambas están activas, se calcula el valor de los recursos recogidos para restarlos.
    - **2da Opción:** Considerar los “Retornables” como una forma de Pago "Bonificable".

32. Generar en Fleet – Viajes una nueva sección de Cobros, que contenga la información general y el detalle de los cobros realizados.
34. Dejar en el smartpage de la Parada un tab llamado “Cobros” que muestre la información asociada a los cobros asociados a esta.

---

## TABLAS PROPUESTAS Y ABM 

### FormaPago
En principio serían 2 registros de forma estándar: Contado y Crédito.
- Descripcion
- Referencia
- RequiereFormaPago
- RequiereValidacionCantidades
- RequierePartidasAbiertas

### FormaPagoEntidad
Se utilizará para relacionar las formas de pago con Los Medios de Pago.
- IdFormaPago
- Entidad (Ejemplo: MedioPago)
- IdEntidad

### MedioPagoEntidad
Relaciona Medio de Pago con las entidades a las que aplique.
- OpcionPreferente
- FechaDesde
- FechaHasta

### MedioPago
Son los métodos habilitados para ejecutar el cobro.
Campos sugeridos:
- ValorMaximoPermitido
- ValorMinimoPermitido
- Habilitado: True o False
- RequiereNumeroCobro, RequiereFoto, CantidadFotos, RequiereObservaciones
- IdTipoEnte, RequiereBanco, RequiereFechaEmisión, RequiereFechaVencimiento, RequiereTitular (Con opciones: NO / SI Opcional / SI Obligatorio)

### Ente
- IdEnte, ReferenciaExterna, IdTipoEnte, Descripcion, DireccionFiscal, IdPais, PaisDescripcion, Email, Telefono1

### TipoEnte
- IdTipoEnte, Descripcion, PermiteMobile

### EstadoParada
*`JsonConfiguracionCobranza`: Podría usarse un json de configuración a nivel de Transición de estado o como parámetro.*
- Cobro: True o False
- CobroPorItem: True o False
- PermiteCobroMinimo: True o False

### Parada
- RequiereCobro (True o False)
- ValorMinimoaCobrar, ValorACobrar, ValorCobrado
- CobroEnExceso
- Moneda

### TipoDocumento / Documento
- **TipoDocumento:** RequiereCobro (True o False)
- **Documento:** ValorACobrar, ValorCobrado, CobroObligatorioTotal, CobroObligatorioParcial

### Cobros
Registra los cobros realizados.
- IdCobro, Estado (Enviado a Pasarela de Pago, Aprobado, Rechazado, Anulado), Motivo, IdFormaPago, Identificador, NumeroRecibo, ImporteCobrado, Login, FechaHora, Latitud, Longitud, Observaciones, IdEnte, FechaEmisión, FechaVencimiento, Titular, NumeroCobro.

### Relacionales
- **CobroArchivo:** IdCobro, IdArchivo
- **ParadaCobro:** IdParada, IdCobro
- **DocumentoCobro:** IdDocumento, IdCobro

### LogCobranza
- IdParada, IdParadaCobro, Request, Respuesta, FechaHora, Detalle

### Parametros
- `MedioPagoporDefecto`
- `HabilitarLimitedeCredito`
- `Parametro.ValorMinimoCobroParadasAgrupadas`

### Entidades con Límite de Crédito
- **Cliente:** LimiteCredito
- **ClienteOrden:** LimiteCredito
- **DomicilioOrden:** LimiteCredito

### Formas de Pago Habilitadas
- **ParadaFormaPagoHabilitado:** IdParada, IdFormaPago, Preferente
- **DomicilioOrdenFormaPagoHabilitado:** IdDomicilioOrden, IdFormaPago, Preferente
- **ClienteOrdenFormaPagoHabilitado:** IdClienteOrden, IdFormaPago, Preferente

---

## CONSIDERAR EN LOS SERVICIOS WEB LOS CAMPOS ASOCIADOS

Se deben considerar campos para los servicios web que permiten crear y/o actualizar viajes, paradas y paradaItems:
- `CrearViajeCompleto`
- `ModificarParada`
- `ModificarParadaItem`
- `ModificarParadaItemDesdeViaje`
- `ModificarViajeConParadas`
- `CrearOrdenesPedido`

**Campos a considerar:**
- **ParadaItem:** ValorACobrar, ValorUnitario, ValorCobrado
- **EstadoParada:** Cobro, CobroPorItem, PermiteCobroMinimo
- **FormaPago:** ValorMaximoPermitido, ValorMinimoPermitido, Habilitado, etc.
- **TiposImpuesto:** Descripcion, ReferenciaExterna, Alicuota
- **Bonificaciones:** ReferenciaExterna, Descripcion, Tipo, ValorBonificacion
- **CrearDocumento:** ValorACobrar, ValorCobrado, CobroObligatorioTotal, CobroObligatorioParcial
