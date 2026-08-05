import os

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

def generate_upsert(table, trans_id, operacion_id, col_values):
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
                col_dict[cname] = str(operacion_id)
            elif ctype == "bit":
                col_dict[cname] = "0"
            elif ctype in ["int", "bigint", "datetime", "varchar"]:
                col_dict[cname] = "NULL"
            else:
                col_dict[cname] = "NULL"

    update_sets = ", ".join([f"{k} = {v}" for k, v in col_dict.items() if k != id_col])
    insert_cols = ", ".join(col_dict.keys())
    insert_vals = ", ".join(col_dict.values())
    
    return f"""IF EXISTS (SELECT 1 FROM dbo.{table} WHERE {id_col} = {trans_id})
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

# =========================================================
# 1. DISTRIBUCION (IdOperacion = 3, Offset +3000)
# =========================================================
dist_sql = []
dist_sql.append("-- =========================================================")
dist_sql.append("-- Transiciones de Estados de la Operación DISTRIBUCIÓN (TSP)")
dist_sql.append("-- Offset ID: +3000 | IdOperacion = 3")
dist_sql.append("-- =========================================================\n")

pedido_trans_dist = [
    (3001, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 2}),
    (3002, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 3}),
    (3003, {"IdEstadoPedidoOrigen": 2, "IdEstadoPedidoDestino": 3}),
    (3100, {"IdEstadoPedidoOrigen": 3, "IdEstadoPedidoDestino": 100}),
    (3101, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 101, "IdEstadoOrden": 102}),
    (3102, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 102}),
    (3301, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 303}),
    (3302, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 304}),
    (3303, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 305}),
    (3304, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 400}),
    (3305, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 404}),
    (3306, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 405}),
    (3311, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 303}),
    (3312, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 304}),
    (3313, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 305}),
    (3314, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 400}),
    (3315, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 404}),
    (3316, {"IdEstadoPedidoOrigen": 102, "IdEstadoPedidoDestino": 405}),
    (3501, {"IdEstadoPedidoOrigen": 303, "IdEstadoPedidoDestino": 502}),
    (3502, {"IdEstadoPedidoOrigen": 304, "IdEstadoPedidoDestino": 502}),
    (3503, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 502}),
    (3504, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 502}),
]
dist_sql.append("-- ENTIDAD: ESTADOPEDIDOTRANSICION")
for t_id, vals in pedido_trans_dist:
    dist_sql.append(generate_upsert("EstadoPedidoTransicion", t_id, 3, vals))

orden_trans_dist = [
    (3100, {"IdEstadoOrigen": 102, "IdEstadoDestino": 104, "IdEstadoParada": 203}),
    (3200, {"IdEstadoOrigen": 104, "IdEstadoDestino": 202}),
    (3300, {"IdEstadoOrigen": 202, "IdEstadoDestino": 306}),
    (3400, {"IdEstadoOrigen": 202, "IdEstadoDestino": 400})
]
dist_sql.append("\n-- ENTIDAD: ESTADOORDENTRANSICION")
for t_id, vals in orden_trans_dist:
    dist_sql.append(generate_upsert("EstadoOrdenTransicion", t_id, 3, vals))

ruta_trans_dist = [
    (3100, {"IdEstadoRutaOrigen": 103, "IdEstadoRutaDestino": 201}),
    (3400, {"IdEstadoRutaOrigen": 201, "IdEstadoRutaDestino": 401})
]
dist_sql.append("\n-- ENTIDAD: ESTADORUTATRANSICION")
for t_id, vals in ruta_trans_dist:
    dist_sql.append(generate_upsert("EstadoRutaTransicion", t_id, 3, vals))

viaje_trans_dist = [
    (3100, {"IdEstadoViajeOrigen": 105, "IdEstadoViajeDestino": 106}),
    (3101, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 108}),
    (3102, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 107, "RequiereMotivo": 1}),
    (3103, {"IdEstadoViajeOrigen": 107, "IdEstadoViajeDestino": 106}),
    (3104, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 206}),
    (3105, {"IdEstadoViajeOrigen": 206, "IdEstadoViajeDestino": 300}),
    (3106, {"IdEstadoViajeOrigen": 206, "IdEstadoViajeDestino": 301, "RequiereMotivo": 1}),
    (3200, {"IdEstadoViajeOrigen": 300, "IdEstadoViajeDestino": 200}),
    (3201, {"IdEstadoViajeOrigen": 301, "IdEstadoViajeDestino": 200}),
    (3202, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 200}),
    (3300, {"IdEstadoViajeOrigen": 200, "IdEstadoViajeDestino": 403}),
    (3400, {"IdEstadoViajeOrigen": 403, "IdEstadoViajeDestino": 402}),
    (3500, {"IdEstadoViajeOrigen": 402, "IdEstadoViajeDestino": 500}),
    (3501, {"IdEstadoViajeOrigen": 500, "IdEstadoViajeDestino": 501, "IdEstadoPedido": 502})
]
dist_sql.append("\n-- ENTIDAD: ESTADOVIAJETRANSICION")
for t_id, vals in viaje_trans_dist:
    dist_sql.append(generate_upsert("EstadoViajeTransicion", t_id, 3, vals))

exec_actions_dist = [
    (1, 300, {"RequiereFirma": 1}),
    (2, 301, {"RequiereFirma": 1, "RequiereMotivo": 1}),
    (3, 302, {"RequiereFoto": 1, "RequiereMotivo": 1}),
    (4, 303, {"RequiereFirma": 1, "RequiereFoto": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 303}),
    (5, 304, {"RequiereFirma": 1, "RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 304}),
    (6, 305, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 305}),
    (7, 400, {"RequiereFirma": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 400}),
    (8, 404, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 404}),
    (9, 405, {"RequiereFirma": 1, "RequiereMotivo": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 405}),
    (10, 406, {"RequiereFirma": 1, "RequiereObservacion": 1})
]

parada_trans_dist = [
    (3200, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 206}),
    (3201, {"IdEstadoParadaOrigen": 206, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}),
    (3202, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}),
    (3203, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 1}),
    (3204, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 2}),
    (3205, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 3}),
    (3206, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 4}),
]
for sub_id, dest, actions in exec_actions_dist:
    t_id = 3300 + sub_id
    vals = {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_dist.append((t_id, vals))

for sub_id, dest, actions in exec_actions_dist:
    t_id = 3320 + sub_id
    vals = {"IdEstadoParadaOrigen": 205, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_dist.append((t_id, vals))
for sub_id, dest, actions in exec_actions_dist[:3]:
    t_id = 3340 + sub_id
    vals = {"IdEstadoParadaOrigen": 206, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_dist.append((t_id, vals))

dist_sql.append("\n-- ENTIDAD: ESTADOPARADATRANSICION")
for t_id, vals in parada_trans_dist:
    dist_sql.append(generate_upsert("EstadoParadaTransicion", t_id, 3, vals))



# =========================================================
# 2. INTERMODAL (IdOperacion = 3, Offset +3000)
# =========================================================
im_sql = []
im_sql.append("-- =========================================================")
im_sql.append("-- Transiciones de Estados de la Operación INTERMODAL (TSP)")
im_sql.append("-- Offset ID: +3000 | IdOperacion = 3")
im_sql.append("-- =========================================================\n")

pedido_trans_im = [
    (3001, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 2}),
    (3002, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 3}),
    (3003, {"IdEstadoPedidoOrigen": 2, "IdEstadoPedidoDestino": 3}),
    (3100, {"IdEstadoPedidoOrigen": 3, "IdEstadoPedidoDestino": 100}),
    (3101, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 101, "IdEstadoOrden": 102}),
    (3301, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 303}),
    (3302, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 304}),
    (3303, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 305}),
    (3304, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 400}),
    (3305, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 404}),
    (3306, {"IdEstadoPedidoOrigen": 101, "IdEstadoPedidoDestino": 405}),
    (3410, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 303}),
    (3411, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 304}),
    (3412, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 305}),
    (3420, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 303}),
    (3421, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 304}),
    (3422, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 305}),
    (3501, {"IdEstadoPedidoOrigen": 303, "IdEstadoPedidoDestino": 502}),
    (3502, {"IdEstadoPedidoOrigen": 304, "IdEstadoPedidoDestino": 502}),
    (3503, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 502}),
    (3504, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 502}),
]
im_sql.append("-- ENTIDAD: ESTADOPEDIDOTRANSICION")
for t_id, vals in pedido_trans_im:
    im_sql.append(generate_upsert("EstadoPedidoTransicion", t_id, 3, vals))

orden_trans_im = [
    (3100, {"IdEstadoOrigen": 102, "IdEstadoDestino": 104, "IdEstadoParada": 203}),
    (3200, {"IdEstadoOrigen": 104, "IdEstadoDestino": 202}),
    (3300, {"IdEstadoOrigen": 202, "IdEstadoDestino": 306}),
    (3400, {"IdEstadoOrigen": 202, "IdEstadoDestino": 400})
]
im_sql.append("\n-- ENTIDAD: ESTADOORDENTRANSICION")
for t_id, vals in orden_trans_im:
    im_sql.append(generate_upsert("EstadoOrdenTransicion", t_id, 3, vals))

ruta_trans_im = [
    (3100, {"IdEstadoRutaOrigen": 103, "IdEstadoRutaDestino": 201}),
    (3400, {"IdEstadoRutaOrigen": 201, "IdEstadoRutaDestino": 401})
]
im_sql.append("\n-- ENTIDAD: ESTADORUTATRANSICION")
for t_id, vals in ruta_trans_im:
    im_sql.append(generate_upsert("EstadoRutaTransicion", t_id, 3, vals))

viaje_trans_im = [
    (3100, {"IdEstadoViajeOrigen": 105, "IdEstadoViajeDestino": 106}),
    (3101, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 108}),
    (3102, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 107, "RequiereMotivo": 1}),
    (3103, {"IdEstadoViajeOrigen": 107, "IdEstadoViajeDestino": 106}),
    (3200, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 200}),
    (3300, {"IdEstadoViajeOrigen": 200, "IdEstadoViajeDestino": 403}),
    (3400, {"IdEstadoViajeOrigen": 403, "IdEstadoViajeDestino": 402}),
    (3500, {"IdEstadoViajeOrigen": 402, "IdEstadoViajeDestino": 500}),
    (3501, {"IdEstadoViajeOrigen": 500, "IdEstadoViajeDestino": 501, "IdEstadoPedido": 502})
]
im_sql.append("\n-- ENTIDAD: ESTADOVIAJETRANSICION")
for t_id, vals in viaje_trans_im:
    im_sql.append(generate_upsert("EstadoViajeTransicion", t_id, 3, vals))

parada_trans_im = [
    (3200, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}),
    (3201, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 1}),
    (3202, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 2}),
    (3203, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 3}),
    (3204, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 4})
]
exec_actions_im = [
    (1, 300, {"RequiereFirma": 1}),
    (2, 301, {"RequiereFirma": 1, "RequiereMotivo": 1}),
    (3, 302, {"RequiereFoto": 1, "RequiereMotivo": 1}),
    (4, 303, {"RequiereFirma": 1, "RequiereFoto": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 303}),
    (5, 304, {"RequiereFirma": 1, "RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 304}),
    (6, 305, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 305}),
    (7, 400, {"RequiereFirma": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 400}),
    (8, 404, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 404}),
    (9, 405, {"RequiereFirma": 1, "RequiereMotivo": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 405})
]
for sub_id, dest, actions in exec_actions_im:
    t_id = 3300 + sub_id
    vals = {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_im.append((t_id, vals))
for sub_id, dest, actions in exec_actions_im:
    t_id = 3320 + sub_id
    vals = {"IdEstadoParadaOrigen": 205, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_im.append((t_id, vals))

im_sql.append("\n-- ENTIDAD: ESTADOPARADATRANSICION")
for t_id, vals in parada_trans_im:
    im_sql.append(generate_upsert("EstadoParadaTransicion", t_id, 3, vals))


base_dir = r"c:\Users\daniel.delamo\.gemini\antigravity\scratch\UniTask\docs\TSP"
with open(os.path.join(base_dir, "full_transiciones_distribucion.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(dist_sql))

with open(os.path.join(base_dir, "full_transiciones_intermodal.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(im_sql))

print("Both SQL scripts cleanly built!")
