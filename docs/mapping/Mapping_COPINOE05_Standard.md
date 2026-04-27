# Mapeo PORTIC COPINOE05 ➔ Unigis EUP

Este documento detalla la integración de los mensajes COPINOE05 (Pre-notificación de Contenedores) en el ecosistema Unigis de Europastry (EUP).

## Reglas de Negocio
- **Unidad de Trabajo**: 1 Contenedor (`GROUP 8`) = 1 Parada en Unigis.
- **Trazabilidad**: Permite gestionar estados de Gate-in/Gate-out individuales.

## 1. Cabecera y Referencias (Nivel Viaje / Cabecera)
| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción |
| :--- | :--- | :--- |
| `trsd_beginning.of.message/tred_document.message.number` | **Viaje.IdViajeExterno** | Referencia de la pre-notificación. |
| `anxs_interchange.header/anxe_sender.identification` | **Viaje.Z_TerminalID** | ID Terminal/Depósito emisor. |
| `COPINOE05.GROUP1/trcd_reference` (Qual `BN`) | **Viaje.Z_BookingNumber** | Número de Booking asociado. |
| `trcd_date.time.period` (Qual `137`) | **Viaje.FechaViaje** | Fecha emisión mensaje. |

## 2. Transporte y Medios (Nivel Viaje / GROUP 2)
| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción |
| :--- | :--- | :--- |
| `trsd_details.of.transport/trcd_transport.identification/tred_id.of_means.of.transport.identification` | **Viaje.Transportista** | Empresa que realiza el movimiento. |
| `trcd_transport.identification/tred_id.of.the.means.of.transport` | **Viaje.Matricula** | Matrícula camión / ID Buque. |
| `COPINOE05.GROUP2/trcd_date.time.period` (Qual `132`) | **Viaje.FechaInicio** | Fecha estimada llegada (Gate-in). |

## 3. Entidades / Agentes (Nivel Parada / GROUP 3)
| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción |
| :--- | :--- | :--- |
| `trsd_name.and.address/tred_party.qualifier` | **Parada.TipoParada** | GA (Agente), TR (Terminal), etc. |
| `trsd_name.and.address/tred_party.id.identification` | **Parada.IdParadaExterno** | Código cliente o puerto. |
| `trsd_name.and.address/tred_name.and.address.line` | **Parada.Nombre** | Nombre de la entidad. |

## 4. Detalles del Contenedor (Nivel Parada_Dyn / GROUP 8)
| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción |
| :--- | :--- | :--- |
| `trsd_equipment.details/tred_equipment.identification.number` | **Parada_Dyn.Z_Contenedor** | Nº Contenedor (Ej: MSKU1234567). |
| `trsd_equipment.details/tred_equipment.size.and.type.identification` | **Parada_Dyn.Z_TipoContenedor** | Tipo ISO (45G1, 22G1). |
| `trsd_equipment.details/tred_equipment.qualifier` | **Parada_Dyn.Z_EstadoEquipo** | Lleno (Full) / Vacío (Empty). |
| `trsd_seal.number/tred_seal.number` | **Parada_Dyn.Z_Precinto** | Número de precinto/sello. |
| `trsd_measurements` (Qual `AET`) | **Parada_Dyn.Z_PesoNeto** | Peso neto (según calificador AET). |

## 5. Mercancía / Ítems (Nivel ParadaItem / GROUP 5)
| Campo XML (Path COPINOE05) | Campo BD EUP | Descripción |
| :--- | :--- | :--- |
| `trsd_goods.item.details/tred_number.of.packages` | **ParadaItem.Cantidad** | Bultos declarados. |
| `trsd_goods.item.details/tred_type.of.packages.identification` | **ParadaItem.Z_TipoBulto** | Cajas, Palets, etc. |
| `COPINOE05.GROUP6/trsd_dangerous.goods/trcd_hazard.code` | **ParadaItem.Z_CodigoIMO** | Peligrosidad (si aplica). |
