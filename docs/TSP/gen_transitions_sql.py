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
                col_dict[cname] = "1"  # Default to 1 (Internacional) for Transpais (TSP)
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
out_sql.append("-- Script Completo de Transiciones y Triggers TSP (Master)")
out_sql.append("-- =========================================================")

# 1. PEDIDO TRANSITIONS
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOPEDIDOTRANSICION")
out_sql.append("-- ---------------------------------------------------------")
pedido_trans = [
    (1, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 2}),
    (2, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 3}),
    (3, {"IdEstadoPedidoOrigen": 2, "IdEstadoPedidoDestino": 3}),
    (100, {"IdEstadoPedidoOrigen": 3, "IdEstadoPedidoDestino": 100}),
    (101, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 101, "IdEstadoOrden": 102}),
    (102, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 102, "IdEstadoOrden": 102}),
    (103, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 103, "IdEstadoOrden": 102}),
    (104, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 104, "IdEstadoOrden": 102}),
    (105, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 105, "IdEstadoOrden": 102})
]

# Add transitions from each programming state (101..105) to each execution result (303, 304, 305, 400, 404, 405)
# Using transition IDs 301-306 for 101, 321-326 for 102, 341-346 for 103, 361-366 for 104, 381-386 for 105
prog_states = [101, 102, 103, 104, 105]
dest_states = [303, 304, 305, 400, 404, 405]
base_ids = {101: 300, 102: 320, 103: 340, 104: 360, 105: 380}

for p in prog_states:
    base_id = base_ids[p]
    for idx, d in enumerate(dest_states):
        trans_id = base_id + idx + 1
        pedido_trans.append((trans_id, {"IdEstadoPedidoOrigen": p, "IdEstadoPedidoDestino": d}))

# Add transitions from RECOLECTADO (400) and RECOLECTADO PARCIAL (405) to delivery states (303, 304, 305)
pedido_trans.append((410, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 303}))
pedido_trans.append((411, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 304}))
pedido_trans.append((412, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 305}))

pedido_trans.append((420, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 303}))
pedido_trans.append((421, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 304}))
pedido_trans.append((422, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 305}))

# Add transitions to liquidado (502) from execution states
pedido_trans.append((501, {"IdEstadoPedidoOrigen": 303, "IdEstadoPedidoDestino": 502}))
pedido_trans.append((502, {"IdEstadoPedidoOrigen": 304, "IdEstadoPedidoDestino": 502}))
pedido_trans.append((503, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 502}))
pedido_trans.append((504, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 502}))


for t_id, vals in pedido_trans:
    out_sql.append(generate_upsert("EstadoPedidoTransicion", t_id, vals))


# 2. ORDEN TRANSITIONS
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOORDENTRANSICION")
out_sql.append("-- ---------------------------------------------------------")
orden_trans = [
    (100, {"IdEstadoOrigen": 102, "IdEstadoDestino": 104, "IdEstadoParada": 203, "IdEstadoRuta": None}),
    (200, {"IdEstadoOrigen": 104, "IdEstadoDestino": 202}),
    (300, {"IdEstadoOrigen": 202, "IdEstadoDestino": 306}),
    (400, {"IdEstadoOrigen": 202, "IdEstadoDestino": 400})
]
for t_id, vals in orden_trans:
    out_sql.append(generate_upsert("EstadoOrdenTransicion", t_id, vals))


# 3. RUTA TRANSITIONS
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADORUTATRANSICION")
out_sql.append("-- ---------------------------------------------------------")
ruta_trans = [
    (100, {"IdEstadoRutaOrigen": 103, "IdEstadoRutaDestino": 201}),
    (400, {"IdEstadoRutaOrigen": 201, "IdEstadoRutaDestino": 401})
]
for t_id, vals in ruta_trans:
    out_sql.append(generate_upsert("EstadoRutaTransicion", t_id, vals))


# 4. VIAJE TRANSITIONS
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOVIAJETRANSICION")
out_sql.append("-- ---------------------------------------------------------")
viaje_trans = [
    (100, {"IdEstadoViajeOrigen": 105, "IdEstadoViajeDestino": 106}),
    (101, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 108}),
    (102, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 107, "RequiereMotivo": 1}),
    (103, {"IdEstadoViajeOrigen": 107, "IdEstadoViajeDestino": 106}),
    (200, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 200}),
    (300, {"IdEstadoViajeOrigen": 200, "IdEstadoViajeDestino": 403}),
    (400, {"IdEstadoViajeOrigen": 403, "IdEstadoViajeDestino": 402}),
    (500, {"IdEstadoViajeOrigen": 402, "IdEstadoViajeDestino": 500}),
    (501, {"IdEstadoViajeOrigen": 500, "IdEstadoViajeDestino": 501, "IdEstadoPedido": 502})
]
for t_id, vals in viaje_trans:
    out_sql.append(generate_upsert("EstadoViajeTransicion", t_id, vals))


# 5. PARADA TRANSITIONS
out_sql.append("\n-- ---------------------------------------------------------")
out_sql.append("-- ENTIDAD: ESTADOPARADATRANSICION")
out_sql.append("-- ---------------------------------------------------------")
parada_trans = [
    # 200 PENDIENTE -> EN VIAJE
    (200, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}),
    # 204 EN VIAJE -> 205 VISITADO (With different visit status triggers)
    (201, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 1}),
    (202, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 2}),
    (203, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 3}),
    (204, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 4})
]

# Physical executions from 204 (EN VIAJE)
exec_actions_204 = [
    (300, 300, {"RequiereFirma": 1}),
    (301, 301, {"RequiereFirma": 1, "RequiereMotivo": 1}),
    (302, 302, {"RequiereFoto": 1, "RequiereMotivo": 1}),
    (303, 303, {"RequiereFirma": 1, "RequiereFoto": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 303}),
    (304, 304, {"RequiereFirma": 1, "RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 304}),
    (305, 305, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 305}),
    (306, 400, {"RequiereFirma": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 400}),
    (307, 404, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 404}),
    (308, 405, {"RequiereFirma": 1, "RequiereMotivo": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 405})
]

for t_id, dest, actions in exec_actions_204:
    vals = {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans.append((t_id, vals))

# Physical executions from 205 (VISITADO)
exec_actions_205 = [
    (320, 300, {"RequiereFirma": 1}),
    (321, 301, {"RequiereFirma": 1, "RequiereMotivo": 1}),
    (322, 302, {"RequiereFoto": 1, "RequiereMotivo": 1}),
    (323, 303, {"RequiereFirma": 1, "RequiereFoto": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 303}),
    (324, 304, {"RequiereFirma": 1, "RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 304}),
    (325, 305, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 305}),
    (326, 400, {"RequiereFirma": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 400}),
    (327, 404, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 404}),
    (328, 405, {"RequiereFirma": 1, "RequiereMotivo": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 405})
]

for t_id, dest, actions in exec_actions_205:
    vals = {"IdEstadoParadaOrigen": 205, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans.append((t_id, vals))

for t_id, vals in parada_trans:
    out_sql.append(generate_upsert("EstadoParadaTransicion", t_id, vals))


# Write output to SQL file
base_dir = r"c:\Users\daniel.delamo\.gemini\antigravity\scratch\UniTask\docs\TSP"
with open(os.path.join(base_dir, "full_transiciones_tsp.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(out_sql))

print("Regeneration complete!")
