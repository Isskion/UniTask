# Mapeo de Integración IFTMIN (XML) ➔ UNIGIS (BD)
*Validación, Correcciones y Completitud de Campos*

Este documento detalla el mapeo validado y corregido para la integración de los mensajes XML de instrucción de transporte **IFTMIN (EDIFACT)** con la base de datos de **UNIGIS**.

---

## 1. Tabla de Mapeo Validada y Completada

| Campo XML (IFTMIN) | Campo BD Original | Campo BD Validado/Propuesto | Estado | Descripción y Notas |
| :--- | :--- | :--- | :---: | :--- |
| `tred_document.message.number` | `Viaje.ReferenciaExteterna` | **`Viaje.ReferenciaExterna`** | 🔧 *Corregido* | Corrección de error tipográfico (*ReferenciaExteterna* $\rightarrow$ *ReferenciaExterna*). Identificador externo del viaje. |
| `tred_date.time.period (137)` | `Viaje.Fecha` | **`Viaje.Fecha`** o `Viaje.FechaCreacion` |  *Correcto* | Calificador `137` representa la fecha de emisión del mensaje/documento. |
| `tred_id.of.the.means.of.transport` | `Vehiculo.Dominio` | **`Vehiculo.Dominio`** |  *Correcto* | Matrícula del camión (patente) o ID del buque (TDT). |
| `tred_carrier.name` | `Empresa.RazonSocial` | **`Transporte.RazonSocial`** | 🔧 *Corregido* | En UNIGIS, `Empresa` es el dador de carga (Tenant). El carrier se modela en la entidad **`Transporte`** (o `Transportista`). |
| `tred_date.time.period (200)` | `Viaje.FechaInicioPlan` | **`Viaje.FechaInicioPlan`** |  *Correcto* | Calificador `200` representa la fecha estimada de salida/inicio plan. |
| `tred_date.time.period (2)` | `Viaje.FechaFinPlan` | **`Viaje.FechaFinPlan`** |  *Correcto* | Calificador `2` representa la fecha estimada de entrega/fin de viaje. |
| `tred_party.id.identification` | `Transporte.CUIT` | **`Transporte.CUIT`** (o `.ReferenciaExterna`) |  *Correcto* | Identificación fiscal del transportista (si la parte es `CA`). |
| `tred_name.and.address.line` | `Empresa.RazonSocial` | **`Sucursal.Nombre`** | 🔧 *Corregido* | Al estar dentro del bloque NAD que describe el destino/origen, representa el **nombre de la sucursal/parada**, no de la Empresa general. |
| `tred_street.and.number...` | `Sucursal.Direccion` | **`Sucursal.Direccion`** |  *Correcto* | Dirección física de la parada. |
| `tred_city.name` | `Sucursal.Localidad` | **`Sucursal.Localidad`** |  *Correcto* | Localidad/Ciudad del punto de parada. |
| `tred_post.code` | `Sucursal.CodigoPostal` | **`Sucursal.CodigoPostal`** |  *Correcto* | Código Postal. |
| `trcd_reference (BN)` | *[Vacío]* | **`Viaje.ReferenciaAdicional`** (o `Viaje.Z_BookingNumber` / `Pedido.ReferenciaExterna`) | 🆕 *Completado* | **BN = Booking Number**. Si `Viaje.ReferenciaExterna` ya se usa para el ID de mensaje, el número de Booking se guarda en campos adicionales o a nivel Pedido. |
| `tred_goods.item.number` | `ParadaItem.Orden` | **`ParadaItem.Orden`** |  *Correcto* | Índice/línea del ítem dentro de la parada. |
| `tred_number.of.packages` | `ParadaItem.Cantidad` | **`ParadaItem.Cantidad`** (o `.Bultos`) |  *Correcto* | Cantidad de bultos declarados para el ítem. |
| `tred_free.text (AAA)` | `ParadaItem.Descripcion` | **`ParadaItem.Descripcion`** |  *Correcto* | Calificador `AAA` representa la descripción de la mercancía. |
| `tred_type.of.packages.id` | `ParadaItem.TipoITem` | **`ParadaItem.TipoItem`** (o `ParadaItem.Z_TipoBulto`) | 🔧 *Corregido* | Corrección de mayúsculas (*TipoITem* $\rightarrow$ *TipoItem*). Representa el tipo de embalaje (Caja, Palet, etc.). |
| `tred_equipment.id.number` | `ParadaItem_Dyn.Z_PromocionCampana (o similar)` | **`Parada_Dyn.Z_Contenedor`** (o `UnidadContenedora.ReferenciaExterna`) | 🔧 *Corregido* | **Grave:** Este campo lleva la sigla/número del contenedor (ej. *MSKU1234567*). Debe ir a las propiedades dinámicas de la parada o al recurso contenedor. |
| `anxe_sender.identification` | `Parada.Idcliente` | **`Parada.IdCliente`** (o `Viaje.Z_TerminalID`) | 🔧 *Corregido* | Corrección de mayúsculas (*Idcliente* $\rightarrow$ *IdCliente*). Si representa la terminal/depósito origen del mensaje, suele mapearse a `Viaje.IdDepositoSalida` o `Viaje.Z_TerminalID`. |
| `tred_transport.stage.qualifier` | `Viaje_Dyn.Etapa` | **`Viaje_Dyn.Etapa`** |  *Correcto* | Define la etapa del transporte (ej. principal, previo). |
| `tred_seal.number` | `Viaje_Dyn.IdPrecinto` | **`Parada_Dyn.Z_Precinto`** (o `Viaje_Dyn.IdPrecinto`) | 🔧 *Corregido* | El precinto se asocia físicamente al contenedor. Dado que en este modelo **1 Contenedor = 1 Parada**, el precinto debe guardarse a nivel parada (`Parada_Dyn.Z_Precinto`) para soportar viajes multi-contenedor. |

---

## 2. Correcciones de Mayor Importancia

> [!CAUTION]
> ### 1. Corrección del Número de Contenedor (`tred_equipment.id.number`)
> En el mapeo original, este campo estaba erróneamente apuntando a `ParadaItem_Dyn.Z_PromocionCampana`. El identificador de equipamiento (contenedor ISO, remolque, etc.) debe almacenarse en el campo dinámico del contenedor de la parada (**`Parada_Dyn.Z_Contenedor`**) o en el campo de sistema **`UnidadContenedora.ReferenciaExterna`**.

> [!WARNING]
> ### 2. Nivel de Precintos (`tred_seal.number`)
> Mapearlo a `Viaje_Dyn.IdPrecinto` asume que todo el viaje tiene un único precinto/contenedor. Si el viaje contiene múltiples contenedores (paradas), cada parada debe tener su propio precinto en **`Parada_Dyn.Z_Precinto`**.

> [!NOTE]
> ### 3. Empresa vs. Transporte
> * El nombre del transportista (`tred_carrier.name`) debe ir a **`Transporte.RazonSocial`** (o `Transporte.Nombre`). El campo `Empresa` en UNIGIS se reserva para el dador de carga (Tenant).
> * El nombre de la sucursal/planta/depósito en el bloque de dirección (`tred_name.and.address.line`) debe ir a **`Sucursal.Nombre`** y no a la Razón Social de la empresa global.

---

## 3. Campos Adicionales Recomendados para IFTMIN

Para que la integración de contenedores sea lo más completa posible, se recomienda mapear estos campos adicionales típicos del estándar IFTMIN:

* **`tred_equipment.size.and.type`** (Tamaño/Tipo ISO del contenedor, ej. *45G1*, *20GP*) ➔ Mapear a **`Parada_Dyn.Z_TipoContenedor`** (o `TipoUnidadContenedora.ReferenciaExterna`).
* **`tred_full.or.empty.indicator`** (Indicador de Lleno/Vacío, ej. *5* o *8*) ➔ Mapear a **`Parada_Dyn.Z_EstadoEquipo`** (valores *Full* o *Empty*).
* **`tred_measurements`** (con Calificador `AET` para Peso Neto del Contenedor) ➔ Mapear a **`Parada_Dyn.Z_PesoNeto`**.
