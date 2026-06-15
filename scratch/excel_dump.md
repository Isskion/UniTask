# Excel Sheets Structure & Data

## Sheet: Legenda
Total Rows: 25

### Sample Data (First 15 Rows):

| Campos | Col 1 | Col 2 | Col 3 |
| --- | --- | --- | --- |
| Deposito Origen | Deposito mas cercano de la origen |  |  |
| Deposito llegada | Deposito mas cercano de destino |  |  |
| Deposito Carga | Deposito desde donde se hace el planeamiento | Donde esta la mercancia | Quando un pedido entra com Tipo domicilio Orden2 = deposito colocar deposito carga igual salida |
| Deposito Descarga | Deposito destino del tramo planeado | Para donde va la mercancia |  |
| Zona depósito Salida (origen) | Zona de influencia del deposito de origen |  |  |
| Zona Depósito Carga * | Zona de influencia del deposito de carga |  |  |
| Zona Depósito descarga * | Zona de influencia del deposito de descarga |  |  |
| Tipo viaje (tramo) | Que tipo de flujo se esta a planear (local o larga  distancia) | Comparando Zona deposito Carga com Descarga. Recogida y punto a punto utiliza zona deposito salida em vez de carga |  |
| Tipo Jornada viaje (tramo) | Para atribuir una jornada a las ordens que se van a crear |  |  |
| Operacion viaje (tramo) | Operacion que va a realizar el viaje |  |  |
| Domiclio orden |  |  |  |
| Tipo Domicilio orden |  |  |  |
| Domiclio orden 2 |  |  |  |
| Tipo Domicilio orden 2 |  |  |  |

---

## Sheet: Estados
Total Rows: 10

### Sample Data (First 15 Rows):

| Estados Planificación | Descripcion | Tipos Orden Pickup | Campo Unigis | Tipo Orden Delivery | Campo Unigis |
| --- | --- | --- | --- | --- | --- |
| Programar (Punto-a-Punto) | Planificar pedido de uno punto a outro fuera de los depósitos próprios o ajenos. Aplicable a local y larga distância. | Recoleccion en remitente | domicilio orden2 | Entrega en destinatario | domicilio orden |
| PLANIFICAR (Entrega Directa) |  | Recoleccion en depósito |  | Entrega en destinatario | domicilio orden |
| PLANIFICAR (Arrastre) |  | Recoleccion en COL |  | Entrega en COL crossdock |  |
| Programar Recogida |  | Recoleccion en remitente | domicilio orden2 | Entrega en COL | Deposito recogida (?) |
|  |  |  |  |  |  |
| AJENA- Programar Punto a Punto | Selecionar con motivo que agencia va a ejecutar | Recoleccion en remitente | domicilio orden2 | Entrega en destinatario | domicilio orden |
| AJENA - Programar Arrastre | Selecionar con motivo el deposito destino |  |  |  |  |
| AJENA  - Programar Recogida | Selecionar con motivo el deposito destino |  |  |  |  |
| PLANIFICAR (Paqueteria) | Avaliar se es necesario jornada y motivos | Recoleccion en COL |  | Entrega en destinatario | domicilio orden |

---

## Sheet: Tabela programacion
Total Rows: 10

### Sample Data (First 15 Rows):

| Col 0 | pedido | pedido | Completa Integracion | Completa Integracion | Completa Integracion | Completa Integracion | Completa Integracion | Completa Integracion | Completa Integracion/Completar prog | Completar prog | Completa Integracion/Completar prog | Completar prog | Completar prog | Calculo prog | Col 15 | Col 16 | Col 17 | Calculo prog | Calculo prog | A definir | Col 21 | Col 22 | Col 23 | Col 24 | Col 25 | Formula | Formula |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Estados Programación | Domicilio Orden 2 | Domicilio Orden | Tipo Domicilio orden 2 | Tipo Domicilio orden | Deposito Salida | Deposito Llegada | Zona depósito Salida (origen) | Zona depósito Llegada | Zona Depósito Carga * | Zona Depósito descarga * | Deposito carga | Depósito Descarga | Deposito Ajena | Tipo tramo | Cliente dador | Canal | Tipo carga | Tipo Jornada viaje (tramo) | Operacion viaje (tramo) | Fecha Jornada | Tipo Orden PickUp 1 | Campo Unigis | Tipo Orden Delivery 1 | Campo Unigis2 | Programación Automática seguiente | Condición dinâmica Creacion | Condicion dinamica borrar |
| Programar Punto a Punto | Remitente | Destinatario | Remitente | Destinatário | Zona Franca | Lliça del vale | Barcelona | Barcelona |  |  |  |  |  | Local |  |  |  | ES Barcelona Local | Nordeste Barcelona |  | Recolección en Remitente | Domicilio Orden 2 | Entrega destinatário | Domicilio Orden |  |  |  |
| Programar Entrega Direta | Remitente | Auchan Barcelona | Remitente | Destinatário | Lliça del Vale | Lliça del vale | Barcelona | Barcelona | Barcelona |  | Lliça del vale |  |  | Local |  |  |  | ES Barcelona Local | Nordeste Barcelona |  | Recoleccion en Deposito | Deposito Carga | Entrega destinatário | Domicilio Orden |  |  |  |
| Programar Recogida | Remitente | Valencia | Remitente | Destinatario | Guadalajara | Valencia | Madrid | Valencia |  | Madrid |  | Guadalajara |  | Local |  |  |  | ES Madrid Local | Centro Norte Madrid |  | Recolección en Remitente | Domicilio Orden 2 | Entrega en Depósito | Depósito Descarga |  | Planificar Entrega Direta | Se reprogramar para arrastre borrar ordens de entrega direta |
| Programar Arrastre | Auchan Guadalajara | Auchan Barcelona | Remitente | Destinatário | Guadalajara | Lliça del vale | Madrid | Barcelona | Madrid | Barcelona | Guadalajara | Zona Franca |  | Larga distância |  |  |  | ES Madrid Larga distancia | Centro Norte Madrid |  | Recolecion en Depósito | Deposito Carga | Entrega en Depósito Crossdock | Depósito Descarga | Entrega direta | Se Domicilio orden é diferente do depósito descarga | Se reprogramar para arrastre borrar ordens de entrega direta |
| AJENA - Programar Punto a Punto |  |  |  |  |  |  |  |  |  |  |  |  | Vila Real Ajena |  |  |  |  | PT Ajena - Vila Real | PT Noroeste |  |  |  |  |  |  |  |  |
| AJENA - Programar Arrastre |  |  |  |  |  |  |  |  |  |  |  |  | Vila Real Ajena |  |  |  |  | PT Ajena - Vila Real | PT Noroeste |  |  |  |  |  |  |  |  |
| AJENA - Programar Recogida |  |  |  |  |  |  |  |  |  |  |  |  | Vila Real Ajena |  |  |  |  | PT Ajena - Vila Real | PT Noroeste |  |  |  |  |  |  |  |  |
| Programar Paqueteria |  | Destinatario |  |  | - | Carregado |  |  | Porto |  | Gaia |  |  |  |  |  |  | PT Noroeste | PT Noroeste Paqueteria |  |  |  |  |  |  |  |  |

---

## Sheet: Flujos estados
Total Rows: 48

### Sample Data (First 15 Rows):

| Passo 0- mudar estado | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |
|  |  | Passo 1 | Passo 2 |  |  |  |  |
| Programar punto a punto |  | Atribuir tipo de tramo | Atribuir Tipo Jornada + Operacion |  |  |  |  |
|  |  | Calculo: Si Zona depósito Salida = Zona deposito llegada -> 'Local'. Else 'Larga Distância' | Calculo: Tabla deposito salida |  |  |  |  |
|  |  |  | Deposito Salida + Tipo tramo = Tipo jornada + Operacion |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  |  | Passo 1 | Passo 2 | Passo 3 | Passo 4 | Passo 5 | Passo 6 |
| Programar Recogida |  | Selecionar motivo | Atribuir Deposito Descarga | Definir Zona depósito Descarga | Atribuir tipo de tramo | Atribuir Tipo Jornada + Operacion | Programacion tramo seguiente |
|  |  | Elegir el deposito para descarga | Utilizar motivo para campo deposito descarga | Completar c/ zona depósito | Calculo: Si Zona depósito Salida = Zona deposito Descarga -> 'Local'. Else 'Larga Distância' | Calculo: Tabla deposito carga | Se Tipo domicilio orden = deposito y domicilio orden <> Deposito descarga -> Programar arrastre Se Tipo domicilio orden = destinatario -> Programar Entrega Direta |
|  |  |  |  |  |  | Deposito Carga + Tipo tramo = Tipo Jornada + Operacion |  |
|  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |
|  | Passo 0 | Passo 1 | Passo 2 | Passo 3 | Passo 4 | Passo 5 | Passo 6 |
| Programar Entrega Direta | Borrar ordens de paqueteria se el ultimo es Paqueteria | Atribuir deposito Carga | Calcular Zona deposito Carga | Borrar deposito Descarga | Borrar zona deposito descarga | Atribuir tipo de tramo | Atribuir Tipo Jornada + Operacion |

---

## Sheet: Sheet1
Total Rows: 5

### Sample Data (First 15 Rows):

| Estados Programación | Tipo Orden PickUp 1 | Campo Unigis | Tipo Orden Delivery 1 | Campo Unigis2 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 | Col 10 | Tipo pedido | Estado pedido | Tipo orden | Data | Tipo Jornada | Operacion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Programar Punto a Punto | Recolección en Remitente | Domicilio Orden 2 | Entrega destinatário | Domicilio Orden |  |  |  |  |  |  | Local | Programar Punto a punto | PickUp Remitente | Campo de pedido a definir (recolecion) |  |  |
| Programar Entrega Direta | Recoleccion en Deposito | Deposito Carga | Entrega destinatário | Domicilio Orden |  |  |  |  |  |  | Local | Programar Punto a punto | Delivery en destinatario | Campo de data de entrega |  |  |
| Programar Recogida | Recolección en Remitente | Domicilio Orden 2 | Entrega en Depósito | Depósito Descarga |  |  |  |  |  |  |  |  |  |  |  |  |
| Programar Arrastre | Recolecion en Depósito | Deposito Carga | Entrega en Depósito Crossdock | Depósito Descarga |  |  |  |  |  |  |  |  |  |  |  |  |

---

## Sheet: Depositos
Total Rows: 9

### Sample Data (First 15 Rows):

| Tabla deposito Carga | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Tabla deposito Salida | Col 7 | Col 8 | Col 9 | Col 10 | Col 11 | Tabla deposito Ajenas | Col 13 | Col 14 | Col 15 | Col 16 | Col 17 | Tabla Paqueteria | Col 19 | Col 20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Deposito Carga | Tipo tramo | Tipo Jornada | Operacion |  |  | Deposito Salida | Tipo tramo | Tipo Jornada | Operacion |  |  | Deposito Ajenas | Tipo Jornada | Operacion |  |  |  | Zona deposito carga | Operaciones | Tipo Jornada |
| Guadalajara | Local | ES Madrid Local | Centro Norte Madrid |  |  | Guadalajara | Local | ES Madrid Local | Centro Norte Madrid |  |  | Vila Real Ajena | PT Ajena - Vila Real | Noroeste |  |  |  | Porto | PT Noroeste | PT Noroeste Paqueteria |
| Guadalajara | Larga distância | ES Madrid Larga distancia | Centro Norte Madrid |  |  | Guadalajara | Larga Distância | ES Madrid Larga distancia | Centro Norte Madrid |  |  |  |  |  |  |  |  | Coimbra | PT Noroeste | PT Noroeste Paqueteria |
| Centralidad | Local | ES Madrid Local | Centro Norte Madrid |  |  | Zona Franca | Local | ES Barcelona Local | NORDESTE BARCELONA |  |  |  |  |  |  |  |  | Lisboa | PT Sudoeste | PT Sudoeste |
| Centralidad | Larga distância | ES Madrid Larga distancia | Centro Norte Madrid |  |  | Zona Franca | Larga Distância | ES Barcelona Larga distancia | NORDESTE BARCELONA |  |  |  |  |  |  |  |  | Algarve | PT Sudoeste | PT Sudoeste |
| Lliça del Vale | Local | ES Barcelona Local | NORDESTE BARCELONA |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Lliça del Vale | Larga distância | ES Barcelona Larga distancia | NORDESTE BARCELONA |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Vila  Real ajena |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

---

## Sheet: Tipos Jornada_operacion
Total Rows: 28

### Sample Data (First 15 Rows):

| Tipo Jornada | Operacion |
| --- | --- |
| PT Porto Local | PT Noroeste |
| PT Noroeste  Larga distancia | PT Noroeste |
| PT Coimbra Local | PT Noroeste |
| PT Noroeste Paqueteria | PT Noroeste |
| PT Ajena - Vila Real | PT Noroeste |
| PT Ajena - Braga | PT Noroeste |
| PT Lisboa Local | PT Sudoeste |
| PT Algarve Local | PT Sudoeste |
| PT Sudoeste Paqueteria | PT Sudoeste |
| PT Sudoeste Larga distancia | PT Sudoeste |
| PT Ajena LISB | PT Sudoeste |
| PT Ajena PTOM | PT Sudoeste |
| PT Ajena MARS | PT Sudoeste |
| PT Ajena EVR | PT Sudoeste |

---

## Sheet: Transição Estados
Total Rows: 38

### Sample Data (First 15 Rows):

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Estados destino | Col 7 | Col 8 | Col 9 | Col 10 | Col 11 | Col 12 | Col 13 | Col 14 | Col 15 | Col 16 | Col 17 | Col 18 | Col 19 | Col 20 | Col 21 | Col 22 | Col 23 | Col 24 | Col 25 | Col 26 | Col 27 | Col 28 | Col 29 | Col 30 | Col 31 | Col 32 | Col 33 | Col 34 | Col 35 | Col 36 | Col 37 | Col 38 | Col 39 | Col 40 | Col 41 | Col 42 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  | Grupo | Obser |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| S | SAC |  | Estados Origen | Restrição | Editable | Inicial |  | Error |  | Confirmado |  | Registrado Ok |  | Programable |  | Anulado |  | Programar Punto a Punto |  | Programar Entrega Direta |  | Programar Recogida |  | Programar Arrastre |  | AJENA - Programar Punto a Punto |  | AJENA - Programar Arrastre |  | AJENA - Programar Recogida |  | Programar Paqueteria |  | Replanificar |  | Reprogramable |  | Reentrega/Rerecogida |  | Retorno depósito origen |  | Retorno Cliente |
| D | Distr |  | Inicial |  |  |  |  | Auto |  | Auto |  | Auto | Se no hay errores en la validacion de los campos de pedido |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Adm | Admin |  | Error |  |  |  |  |  |  | SAC | Realizar las validaciones despues de corrigir |  |  |  |  | SAC |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| A | Automático |  | Confirmado |  |  |  |  | Auto | El pedido no fue validado |  |  | Auto | Se no hay errores en la validacion de los campos de pedido | Auto | Se no hay errores en la validacion de los campos de pedido |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| T | Todos |  | Registrado Ok |  | SAC |  |  |  |  | SAC | Realizar las validaciones despues de corrigir |  |  |  |  | SAC |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  | Programable | Ya no es possível editar el pedido (apenas info operacional de planeamento) | Dist - pero solo informacion operacional |  |  |  |  |  |  | DIST | Se es necesario que equipo de SAC haga cambio al pedido |  |  |  |  | DIST | Solo es possible se el Tipo domicilio Orden 2 = No es deposito | DIST | Solo es posible se el Tipo domicilio Orden = No es deposito y domicilio Orden 2 = deposito | DIST | Solo es possible se el Tipo domicilio Orden 2 = No es deposito | DIST | Solo es possible se el Tipo domicilio Orden 2 =  Deposito | DIST | Solo es possible se el Tipo domicilio Orden 2 <> Deposito | DIST | Solo es possible se el Tipo domicilio Orden 2 =  Deposito | DIST | Solo es possible se el Tipo domicilio Orden 2 <> deposito | DIST | Solo es posible se el Tipo domicilio Orden = No es deposito y domicilio Orden 2 = deposito |  |  |  |  |  |  |  |  |  |
|  |  |  | Anulado | Verificar com equipa de WMS como vão funcionar as interfaces. Pode-se informar desde TMS cambios de estado |  | SAC |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
|  |  |  | Programar Punto a Punto |  |  |  |  |  |  |  |  |  |  | DIST | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | Dist | Se estado de ejecucion del pedido es no entregado o entregado parcial |  |  |  |  |  |  |  |
|  |  |  | Programar Entrega Direta |  |  |  |  |  |  |  |  |  |  | DIST | PE |  |  |  |  |  |  |  |  | DIST |  |  |  | DIST |  |  |  | DIST |  | Dist | Se estado de ejecucion del pedido es no entregado o entregado parcial |  |  |  |  |  |  |  |
|  |  |  | Programar Recogida |  |  |  |  |  |  |  |  |  |  | DIST | PE |  |  |  |  | DIST | Se Tipo domicilio orden = destinatario -> Programar Entrega Direta | DIST |  | DIST | Se Tipo domicilio orden = deposito y domicilio orden <> Deposito descarga -> Programar arrastre |  |  | DIST | Se Tipo domicilio orden = deposito y domicilio orden <> Deposito descarga -> Programar arrastre | DIST |  |  |  | Dist | Se estado de ejecucion del pedido es no entregado o entregado parcial |  |  |  |  |  |  |  |
|  |  |  | Programar Arrastre |  |  |  |  |  |  |  |  |  |  | DIST | PE |  |  |  |  | DIST | Se Tipo domicilio orden = destinatario |  |  | DIST | Se Tipo domicilio orden = deposito y domicilio orden <> Deposito descarga |  |  | DIST |  |  |  | DIST |  | Dist | Se estado de ejecucion del pedido es no entregado o entregado parcial |  |  |  |  |  |  |  |
|  |  |  | AJENA - Programar Punto a Punto |  |  |  |  |  |  |  |  |  |  | DIST | PE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | Dist | Se estado de ejecucion del pedido es no entregado o entregado parcial |  |  |  |  |  |  |  |
|  |  |  | AJENA - Programar Arrastre |  |  |  |  |  |  |  |  |  |  | DIST | PE |  |  |  |  | DIST | Se Tipo domicilio orden = destinatario |  |  | DIST | Se Tipo deposito descarga = Deposito LS y deposito descarga <>domicilio orden |  |  | DIST |  |  |  | DIST |  | Dist | Se estado de ejecucion del pedido es no entregado o entregado parcial |  |  |  |  |  |  |  |

---

