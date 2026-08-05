import os

# Definition of schemas for each transition table (columns and their types)
schemas = {
    "EstadoPedidoTransicion": [
        ("IdEstadoPedidoTransicion", "int"), ("IdEstadoPedidoOrigen", "int"), ("IdEstadoPedidoDestino", "int"),
        ("IdEstadoOrden", "bigint"), ("IdTipoPedido", "int"), ("IdEstadoPedidoItem", "int"), ("IdEstadoGuia", "int"),
        ("IdEncuesta", "int"), ("PermiteObtenerEvidencias", "bit"), ("RequiereMotivo", "bit"), ("RequiereFirma", "bit"),
        ("RequiereFoto", "bit"), ("RequiereObservaciones", "bit"), ("RequiereEncuesta", "bit"), ("Contactless", "bit"),
        ("IdEmpresa", "int"), ("IdOperacion", "int"), ("IdTipoOperacion", "int"), ("IdEstadoPedidoTurno", "int"),
        ("IdEstadoCitaSlot", "int"), ("IdEstadoParada", "int")
    ],
    "EstadoOrdenTransicion": [
        ("IdEstadoOrdenTransicion", "bigint"), ("IdEstadoOrigen", "bigint"), ("IdEstadoDestino", "bigint"),
        ("RequiereMotivo", "bit"), ("IdEstadoRuta", "int"), ("IdEstadoParada", "int"), ("IdEstadoPedido", "int"),
        ("IdTipoOrden", "int"), ("IdTipoOperacion", "int"), ("IdTipoAlarma", "int"), ("IdEstadoMuelleCita", "int"),
        ("IdEmpresa", "int"), ("IdOperacion", "int"), ("IdEstadoOrdenRelacion", "bigint"), ("IdTipoOrdenRelacion", "int")
    ],
    "EstadoViajeTransicion": [
        ("IdEstadoViajeTransicion", "int"), ("IdEstadoViajeOrigen", "int"), ("IdEstadoViajeDestino", "int"),
        ("IdEstadoJornada", "bigint"), ("IdTipoAlarma", "int"), ("IdEstadoGuia", "int"), ("RequiereFoto", "bit"),
        ("IdEncuesta", "int"), ("PermiteEditarFecha", "bit"), ("IdEstadoRecurso", "int"), ("TransicionTendering", "bit"),
        ("RealizarParadaDistribuida", "bit"), ("RequiereMotivo", "bit"), ("IdEmpresa", "int"), ("IdOperacion", "int"),
        ("IdTipoOperacion", "int"), ("IdTipoViaje", "int"), ("IdCategoriaViaje", "int"), ("VehiculoRetorno", "bit"),
        ("RequiereObservacion", "bit"), ("Mensaje", "text"), ("RequiereControlItems", "bit"), ("RequiereControlItemsCarga", "bit"),
        ("RequiereControlItemsDescarga", "bit"), ("IdEstadoCitaSlotAgrupacion", "int"), ("InventarioViajeRecurso", "bit"),
        ("VerificarQRMobile", "bit")
    ],
    "EstadoParadaTransicion": [
        ("IdEstadoParadaTransicion", "int"), ("IdEstadoParadaOrigen", "int"), ("IdEstadoParadaDestino", "int"),
        ("RequiereMotivo", "bit"), ("RequiereControl", "bit"), ("IdTipoAlarma", "int"), ("IdEstadoParadaVisita", "int"),
        ("RequiereValidacionCantidades", "bit"), ("RequiereFirma", "bit"), ("RequiereFoto", "bit"), ("IdTipoParada", "int"),
        ("IdEstadoViaje", "int"), ("IdEncuesta", "int"), ("RequiereObservacion", "bit"), ("IdEstadoOrden", "bigint"),
        ("IdEstadoParadaTransicionAlternativo", "int"), ("PermiteModificarUbicacion", "bit"), ("PermiteActualizarUbicacion", "bit"),
        ("ConsiderarConsolidados", "bit"), ("CantidadFoto", "int"), ("IdTipoEvento", "int"), ("PermiteRecolectarRecursos", "bit"),
        ("PermiteEntregarRecursos", "bit"), ("PermiteEditarFecha", "bit"), ("PermiteParadaEtiqueta", "bit"),
        ("ConsiderarDomicilios", "bit"), ("ProximaParada", "bit"), ("IdAccionIntent", "int"), ("Contactless", "bit"),
        ("SalidaZona", "bit"), ("ValidarGeocerca", "bit"), ("CompletarParadaItemCantidad", "bit"),
        ("TemplateNotificacionMovil", "varchar"), ("IdEstadoGuia", "int"), ("IdEmpresa", "int"), ("IdOperacion", "int"),
        ("IdTipoOperacion", "int"), ("PermiteTomarFotosRecursos", "bit"), ("PermiteObservacionesRecursos", "bit"),
        ("PermiteControlDocumentacion", "bit"), ("PermiteVisualizarCantidades", "bit"), ("ForzarEdicionCantidadesValidadas", "bit"),
        ("RequiereMLOCR", "bit"), ("PermiteValidarCantidadSecundaria", "bit"), ("PermiteValidarFormaPago", "bit"),
        ("PermitePartidasAbiertas", "bit"), ("PermiteConfirmacionCobranza", "bit"), ("PermiteOffline", "bit"),
        ("AdministrarRecursosDescartables", "bit"), ("ValidarFecha", "bit"), ("PermiteTomarFotosCategorizadas", "bit"),
        ("PermiteTomarFotosOffline", "bit"), ("RequiereControlNumeroTicket", "bit"), ("ValidarNFC", "bit"),
        ("RequiereEncuestaCliente", "bit"), ("IdEncuestaB2C", "int"), ("RequiereControlItemsDescarga", "bit"),
        ("IdCategoriaFoto", "int"), ("ConsiderarTipoParada", "bit"), ("IdEstadoPedido", "int"), ("RequiereArchivoWeb", "bit")
    ],
    "EstadoRutaTransicion": [
        ("IdEstadoRutaTransicion", "int"), ("IdEstadoRutaOrigen", "int"), ("IdEstadoRutaDestino", "int"),
        ("IdEstadoJornada", "bigint"), ("IdEstadoViaje", "int"), ("CambioEstadoDistribuido", "bit"),
        ("IdEmpresa", "int"), ("IdOperacion", "int"), ("IdTipoOperacion", "int")
    ]
}

def generate_upsert(table, trans_id, col_values):
    cols = schemas[table]
    id_col = f"Id{table}"
    
    col_dict = {}
    for cname, ctype in cols:
        if cname == id_col:
            col_dict[cname] = str(trans_id)
        elif cname in col_values:
            val = col_values[cname]
            if val is None:
                col_dict[cname] = "NULL"
            elif isinstance(val, str) and ctype == "varchar":
                col_dict[cname] = f"'{val}'"
            else:
                col_dict[cname] = str(val)
        else:
            if cname == "IdOperacion":
                col_dict[cname] = "2"  # IdOperacion = 2 (Distribución)
            elif ctype == "bit":
                col_dict[cname] = "0"
            elif ctype in ["int", "bigint"]:
                col_dict[cname] = "NULL"
            elif ctype == "datetime":
                col_dict[cname] = "NULL"
            elif ctype == "varchar":
                col_dict[cname] = "NULL"
            else:
                col_dict[cname] = "NULL"

    update_sets = ", ".join([f"{k} = {v}" for k, v in col_dict.items() if k != id_col])
    insert_cols = ", ".join(col_dict.keys())
    insert_vals = ", ".join(col_dict.values())
    
    upsert = f"""IF EXISTS (SELECT 1 FROM dbo.{table} WHERE {id_col} = {trans_id})
BEGIN
    UPDATE dbo.{table}
    SET {update_sets}
    WHERE {id_col} = {trans_id}
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.{table} ON;
    INSERT INTO dbo.{table} ({insert_cols})
    VALUES ({insert_vals});
    SET IDENTITY_INSERT dbo.{table} OFF;
END
GO
"""
    return upsert

out_sql = []
out_sql.append("-- =========================================================")
out_sql.append("-- Script Completo de Transiciones de la Operación Distribución (TSP)")
out_sql.append("-- Offset ID: +2000 | IdOperacion = 1 (Regla TSP)")
out_sql.append("-- =========================================================")

# 1. PEDIDO TRANSITIONS (Distribución offset +2000)
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOPEDIDOTRANSICION (DISTRIBUCION)")
out_sql.append("-- ---------------------------------------------------------")
pedido_trans = [
    (2001, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 2}),   # INGRESADO -> ERROR
    (2002, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 3}),   # INGRESADO -> GRABADO
    (2003, {"IdEstadoPedidoOrigen": 2, "IdEstadoPedidoDestino": 3}),   # ERROR -> GRABADO
    (2100, {"IdEstadoPedidoOrigen": 3, "IdEstadoPedidoDestino": 100}), # GRABADO -> CONFIRMADO
    (2101, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 101, "IdEstadoOrden": 102}), # CONFIRMADO -> EN PLANIFICACION
    (2102, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 102}), # EN PLANIFICACION -> PLANIFICADO EN PREPARACIÓN (Almacén)
    # Transiciones desde 101/102 hacia ejecución de entrega/recogida
    (2301, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 303}), # EN PLANIFICACION -> ENTREGADO
    (2302, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 304}), # EN PLANIFICACION -> ENTREGA PARCIAL
    (2303, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 305}), # EN PLANIFICACION -> NO ENTREGADO
    (2304, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 400}), # EN PLANIFICACION -> RECOLECTADO
    (2305, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 404}), # EN PLANIFICACION -> NO RECOLECTADO
    (2306, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 405}), # EN PLANIFICACION -> RECOLECTADO PARCIAL
    (2311, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 303}), # PLANIFICADO EN PREPARACIÓN -> ENTREGADO
    (2312, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 304}), # PLANIFICADO EN PREPARACIÓN -> ENTREGA PARCIAL
    (2313, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 305}), # PLANIFICADO EN PREPARACIÓN -> NO ENTREGADO
    (2314, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 400}), # PLANIFICADO EN PREPARACIÓN -> RECOLECTADO
    (2315, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 404}), # PLANIFICADO EN PREPARACIÓN -> NO RECOLECTADO
    (2316, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 405}), # PLANIFICADO EN PREPARACIÓN -> RECOLECTADO PARCIAL
    # Liquidación
    (2501, {"IdEstadoPedidoOrigen": 303, "IdEstadoPedidoDestino": 502}), # ENTREGADO -> LIQUIDADO
    (2502, {"IdEstadoPedidoOrigen": 304, "IdEstadoPedidoDestino": 502}), # ENTREGA PARCIAL -> LIQUIDADO
    (2503, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 502}), # RECOLECTADO -> LIQUIDADO
    (2504, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 502}), # RECOLECTADO PARCIAL -> LIQUIDADO
]

for t_id, vals in pedido_trans:
    out_sql.append(generate_upsert("EstadoPedidoTransicion", t_id, vals))

# 2. ORDEN TRANSITIONS (Distribución offset +2000)
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOORDENTRANSICION (DISTRIBUCION)")
out_sql.append("-- ---------------------------------------------------------")
orden_trans = [
    (2100, {"IdEstadoOrigen": 102, "IdEstadoDestino": 104, "IdEstadoParada": 203}), # PENDIENTE -> PLANIFICADA
    (2200, {"IdEstadoOrigen": 104, "IdEstadoDestino": 202}),                         # PLANIFICADA -> EN TRÁNSITO
    (2300, {"IdEstadoOrigen": 202, "IdEstadoDestino": 306}),                         # EN TRÁNSITO -> FINALIZADA
    (2400, {"IdEstadoOrigen": 202, "IdEstadoDestino": 400})                          # EN TRÁNSITO -> RECOLECTADO
]
for t_id, vals in orden_trans:
    out_sql.append(generate_upsert("EstadoOrdenTransicion", t_id, vals))

# 3. RUTA TRANSITIONS (Distribución offset +2000)
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADORUTATRANSICION (DISTRIBUCION)")
out_sql.append("-- ---------------------------------------------------------")
ruta_trans = [
    (2100, {"IdEstadoRutaOrigen": 103, "IdEstadoRutaDestino": 201}), # CREADA -> EN RUTA
    (2400, {"IdEstadoRutaOrigen": 201, "IdEstadoRutaDestino": 401})  # EN RUTA -> FINALIZADA
]
for t_id, vals in ruta_trans:
    out_sql.append(generate_upsert("EstadoRutaTransicion", t_id, vals))

# 4. VIAJE TRANSITIONS (Distribución offset +2000)
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOVIAJETRANSICION (DISTRIBUCION)")
out_sql.append("-- ---------------------------------------------------------")
viaje_trans = [
    (2100, {"IdEstadoViajeOrigen": 105, "IdEstadoViajeDestino": 106}), # INACTIVO -> ASIGNADO / PENDIENTE
    (2101, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 108}), # ASIGNADO -> CONFIRMADO
    (2102, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 107, "RequiereMotivo": 1}), # ASIGNADO -> RECHAZADO
    (2103, {"IdEstadoViajeOrigen": 107, "IdEstadoViajeDestino": 106}), # RECHAZADO -> ASIGNADO
    (2104, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 206}), # CONFIRMADO -> PREPARADO (Picking WMS)
    (2105, {"IdEstadoViajeOrigen": 206, "IdEstadoViajeDestino": 300}), # PREPARADO -> CARGADO
    (2106, {"IdEstadoViajeOrigen": 206, "IdEstadoViajeDestino": 301, "RequiereMotivo": 1}), # PREPARADO -> CARGADO PARCIAL
    (2200, {"IdEstadoViajeOrigen": 300, "IdEstadoViajeDestino": 200}), # CARGADO -> ACTIVO / EN EJECUCIÓN
    (2201, {"IdEstadoViajeOrigen": 301, "IdEstadoViajeDestino": 200}), # CARGADO PARCIAL -> ACTIVO / EN EJECUCIÓN
    (2202, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 200}), # CONFIRMADO -> ACTIVO / EN EJECUCIÓN
    (2300, {"IdEstadoViajeOrigen": 200, "IdEstadoViajeDestino": 403}), # ACTIVO -> FINALIZADO
    (2400, {"IdEstadoViajeOrigen": 403, "IdEstadoViajeDestino": 402}), # FINALIZADO -> RENDIDO (Firma + eCMR + Rendición WMS)
    (2500, {"IdEstadoViajeOrigen": 402, "IdEstadoViajeDestino": 500}), # RENDIDO -> LIQUIDABLE
    (2501, {"IdEstadoViajeOrigen": 500, "IdEstadoViajeDestino": 501, "IdEstadoPedido": 502}) # LIQUIDABLE -> LIQUIDADO
]
for t_id, vals in viaje_trans:
    out_sql.append(generate_upsert("EstadoViajeTransicion", t_id, vals))

# 5. PARADA TRANSITIONS (Distribución offset +2000)
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOPARADATRANSICION (DISTRIBUCION)")
out_sql.append("-- ---------------------------------------------------------")
parada_trans = [
    (2200, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 206}), # PENDIENTE -> PREPARADO (Picking WMS)
    (2201, {"IdEstadoParadaOrigen": 206, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}), # PREPARADO -> EN VIAJE
    (2202, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}), # PENDIENTE -> EN VIAJE
    # Geocerca 204 -> 205 (VISITADO)
    (2203, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 1}),
    (2204, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 2}),
    (2205, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 3}),
    (2206, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 4}),
]

# Executions from 204 (EN VIAJE) and 205 (VISITADO)
exec_actions = [
    # (id_offset, dest, params)
    (1, 300, {"RequiereFirma": 1}),                                                              # CARGADO
    (2, 301, {"RequiereFirma": 1, "RequiereMotivo": 1}),                                          # CARGADO PARCIAL
    (3, 302, {"RequiereFoto": 1, "RequiereMotivo": 1}),                                           # NO CARGADO
    (4, 303, {"RequiereFirma": 1, "RequiereFoto": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 303}),# ENTREGADO (POD)
    (5, 304, {"RequiereFirma": 1, "RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 304}), # ENTREGA PARCIAL
    (6, 305, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 305}),                    # NO ENTREGADO
    (7, 400, {"RequiereFirma": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 400}),                  # RECOLECTADO
    (8, 404, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 404}),                    # NO RECOLECTADO
    (9, 405, {"RequiereFirma": 1, "RequiereMotivo": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 405}), # RECOLECTADO PARCIAL
    (10, 406, {"RequiereFirma": 1, "RequiereObservacion": 1})                                      # RENDIDO (Rendición Almacén)
]

# From 204 (EN VIAJE)
for sub_id, dest, actions in exec_actions:
    t_id = 2300 + sub_id
    vals = {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans.append((t_id, vals))

# From 205 (VISITADO / EN GEOCERCA)
for sub_id, dest, actions in exec_actions:
    t_id = 2320 + sub_id
    vals = {"IdEstadoParadaOrigen": 205, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans.append((t_id, vals))

# From 206 (PREPARADO en Almacén)
for sub_id, dest, actions in exec_actions[:3]: # Carga
    t_id = 2340 + sub_id
    vals = {"IdEstadoParadaOrigen": 206, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans.append((t_id, vals))

for t_id, vals in parada_trans:
    out_sql.append(generate_upsert("EstadoParadaTransicion", t_id, vals))

base_dir = r"c:\Users\daniel.delamo\.gemini\antigravity\scratch\UniTask\docs\TSP"
with open(os.path.join(base_dir, "full_transiciones_distribucion.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(out_sql))

print("Distribución transitions SQL script generation complete!")
