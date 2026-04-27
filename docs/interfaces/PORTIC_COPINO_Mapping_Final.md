# Mapeo Final PORTIC (COPINO) -> EUP Database

Este documento contiene las reglas de transformación validadas para la integración de pre-notificaciones de contenedores de PORTIC en el ecosistema Europastry (UNIGIS).

## 1. Cabecera y Referencias (Nivel Viaje / Cabecera)

| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción / Nota |
| :--- | :--- | :--- |
| `trsd_beginning.of.message/tred_document.message.number` | `Viaje.IdViajeExterno` | Ref. de la pre-notificación. |
| `anxs_interchange.header/anxe_sender.identification` | `Viaje.IdDepositoSalida` | ID Terminal/Depósito emisor (Deposito.ReferenciaExterna). |
| `COPINOE05.GROUP1/trcd_reference` (Qual `BN`) | `Pedido.ReferenciaAdicional` | Número de Booking asociado. |
| `trcd_date.time.period` (Qual `137`) | `Viaje.FechaCreacion` | Fecha emisión mensaje. |

## 2. Transporte y Medios (Nivel Viaje / GROUP 2)

| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción / Nota |
| :--- | :--- | :--- |
| `trsd_details.of.transport/trcd_transport.identification/tred_id.of_means.of.transport.identification` | `Viaje.Transportista` | Empresa que realiza el movimiento (Transporte.ReferenciaExterna). |
| `trcd_transport.identification/tred_id.of.the.means.of.transport` | `Viaje.IdVehiculo` | Matrícula camión / ID Buque (Vehiculo.Dominio). |
| `COPINOE05.GROUP2/trcd_date.time.period` (Qual `132`) | `Viaje.FechaInicioPlan` | Fecha estimada llegada (Gate-in). |

## 3. Entidades / Agentes (Nivel Parada / GROUP 3)

| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción / Nota |
| :--- | :--- | :--- |
| `trsd_name.and.address/tred_party.qualifier` | - | `GA` (Agente), `TR` (Terminal), etc. |
| `trsd_name.and.address/tred_party.id.identification` | - | Código cliente o puerto. |
| `trsd_name.and.address/tred_name.and.address.line` | - | Nombre de la entidad. |

## 4. Detalles del Contenedor (Nivel Parada_Dyn / GROUP 8)

| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción / Nota |
| :--- | :--- | :--- |
| `trsd_equipment.details/tred_equipment.identification.number` | `UnidadContenedora.ReferenciaExterna` | Nº Contenedor (ViajeRecurso.IdRecurso, Recurso.IdRecurso, TipoRecurso.IdTipoRecurso = 10). |
| `trsd_equipment.details/tred_equipment.size.and.type.identification` | `TipoUnidadContenedora.ReferenciaExterna` | Tipo ISO (45G1, 22G1). |
| `trsd_equipment.details/tred_equipment.qualifier` | **REVISAR** | Lleno (Full) / Vacío (Empty). |
| `trsd_seal.number/tred_seal.number` | `Recurso.ReferenciaExterna` | Número de precinto/sello (TipoRecurso.IdTipoRecurso = X). |
| `trsd_measurements` (Qual `AET`) | `UnidadContenedora.ReferenciaExterna` | Peso neto (usar calificador AET). |

## 5. Mercancía / Ítems (Nivel ParadaItem / GROUP 5)

| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción / Nota |
| :--- | :--- | :--- |
| `trsd_goods.item.details/tred_number.of.packages` | `Parada.Bultos` o `ParadaItem.Bulto` | Bultos declarados. |
| `trsd_goods.item.details/tred_type.of.packages.identification` | - | Cajas, Palets, etc. |
| `COPINOE05.GROUP6/trsd_dangerous.goods/trcd_hazard.code` | `ParadaItem.Descripcion` | Peligrosidad (si aplica). |
