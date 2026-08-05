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

OPERACION_DISTRIBUCION_ID = 3  # Confirmado de la tabla dbo.Operacion (3 = Distribución)

dist_sql = []
dist_sql.append("-- =========================================================")
dist_sql.append("-- Proyecto: Transpais (TSP)")
dist_sql.append("-- Operación: DISTRIBUCIÓN (IdOperacion = 3)")
dist_sql.append("-- Basado en los IDs reales de Estados verificados en la BD")
dist_sql.append("-- Rango de IDs de Transición: 2001 en adelante")
dist_sql.append("-- =========================================================\n")

# 1. PEDIDO TRANSITIONS (Distribución IdOperacion = 3)
pedido_trans_dist = [
    (2001, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 2}),   # INGRESADO -> ERROR-REQUIERE AJUSTE
    (2002, {"IdEstadoPedidoOrigen": 1, "IdEstadoPedidoDestino": 3}),   # INGRESADO -> GRABADO
    (2003, {"IdEstadoPedidoOrigen": 2, "IdEstadoPedidoDestino": 3}),   # ERROR -> GRABADO
    (2100, {"IdEstadoPedidoOrigen": 3, "IdEstadoPedidoDestino": 100}), # GRABADO -> CONFIRMADO
    (2101, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 105, "IdEstadoOrden": 102}), # CONFIRMADO -> PROGRAMAR REPARTO (105)
    (2102, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 101, "IdEstadoOrden": 102}), # CONFIRMADO -> PROGRAMAR DIRECTO REMITENTE DESTINO (101)
    (2103, {"IdEstadoPedidoOrigen": 100, "IdEstadoPedidoDestino": 102, "IdEstadoOrden": 102}), # CONFIRMADO -> PROGRAMAR RECOLECCIÓN (102)
]

# Transiciones desde programación (101, 102, 105) hacia estados de ejecución
prog_states = [101, 102, 105]
exec_destinations = [
    (303, "ENTREGADO"),
    (304, "ENTREGA PARCIAL"),
    (305, "NO ENTREGADO"),
    (400, "RECOLECTADO"),
    (404, "NO RECOLECTADO"),
    (405, "RECOLECTADO PARCIAL")
]

next_p_id = 2301
for p in prog_states:
    for dest_code, _ in exec_destinations:
        pedido_trans_dist.append((next_p_id, {"IdEstadoPedidoOrigen": p, "IdEstadoPedidoDestino": dest_code}))
        next_p_id += 1

# Liquidación de pedidos desde ejecuciones
pedido_trans_dist.append((2501, {"IdEstadoPedidoOrigen": 303, "IdEstadoPedidoDestino": 502}))
pedido_trans_dist.append((2502, {"IdEstadoPedidoOrigen": 304, "IdEstadoPedidoDestino": 502}))
pedido_trans_dist.append((2503, {"IdEstadoPedidoOrigen": 400, "IdEstadoPedidoDestino": 502}))
pedido_trans_dist.append((2504, {"IdEstadoPedidoOrigen": 405, "IdEstadoPedidoDestino": 502}))

dist_sql.append("-- ---------------------------------------------------------")
dist_sql.append("-- ENTIDAD: ESTADOPEDIDOTRANSICION (DISTRIBUCIÓN - IdOperacion = 3)")
dist_sql.append("-- ---------------------------------------------------------")
for t_id, vals in pedido_trans_dist:
    dist_sql.append(generate_upsert("EstadoPedidoTransicion", t_id, OPERACION_DISTRIBUCION_ID, vals))

# 2. ORDEN TRANSITIONS
orden_trans_dist = [
    (2100, {"IdEstadoOrigen": 102, "IdEstadoDestino": 104, "IdEstadoParada": 203}), # PENDIENTE -> PLANIFICADA
    (2200, {"IdEstadoOrigen": 104, "IdEstadoDestino": 202}),                         # PLANIFICADA -> EN TRÁNSITO
    (2300, {"IdEstadoOrigen": 202, "IdEstadoDestino": 306}),                         # EN TRÁNSITO -> FINALIZADA
    (2400, {"IdEstadoOrigen": 202, "IdEstadoDestino": 400})                          # EN TRÁNSITO -> RECOLECTADO
]
dist_sql.append("\n-- ---------------------------------------------------------")
dist_sql.append("-- ENTIDAD: ESTADOORDENTRANSICION (DISTRIBUCIÓN - IdOperacion = 3)")
dist_sql.append("-- ---------------------------------------------------------")
for t_id, vals in orden_trans_dist:
    dist_sql.append(generate_upsert("EstadoOrdenTransicion", t_id, OPERACION_DISTRIBUCION_ID, vals))

# 3. RUTA TRANSITIONS
ruta_trans_dist = [
    (2100, {"IdEstadoRutaOrigen": 103, "IdEstadoRutaDestino": 201}), # CREADA (103) -> EN RUTA (201)
    (2400, {"IdEstadoRutaOrigen": 201, "IdEstadoRutaDestino": 401})  # EN RUTA (201) -> FINALIZADA (401)
]
dist_sql.append("\n-- ---------------------------------------------------------")
dist_sql.append("-- ENTIDAD: ESTADORUTATRANSICION (DISTRIBUCIÓN - IdOperacion = 3)")
dist_sql.append("-- ---------------------------------------------------------")
for t_id, vals in ruta_trans_dist:
    dist_sql.append(generate_upsert("EstadoRutaTransicion", t_id, OPERACION_DISTRIBUCION_ID, vals))

# 4. VIAJE TRANSITIONS
viaje_trans_dist = [
    (2100, {"IdEstadoViajeOrigen": 105, "IdEstadoViajeDestino": 106}), # INACTIVO -> ASIGNADO / PENDIENTE
    (2101, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 108}), # ASIGNADO -> CONFIRMADO
    (2102, {"IdEstadoViajeOrigen": 106, "IdEstadoViajeDestino": 107, "RequiereMotivo": 1}), # ASIGNADO -> RECHAZADO
    (2103, {"IdEstadoViajeOrigen": 107, "IdEstadoViajeDestino": 106}), # RECHAZADO -> ASIGNADO
    (2200, {"IdEstadoViajeOrigen": 108, "IdEstadoViajeDestino": 200}), # CONFIRMADO -> ACTIVO / EN EJECUCIÓN
    (2300, {"IdEstadoViajeOrigen": 200, "IdEstadoViajeDestino": 403}), # ACTIVO -> FINALIZADO
    (2400, {"IdEstadoViajeOrigen": 403, "IdEstadoViajeDestino": 402}), # FINALIZADO -> RENDIDO
    (2500, {"IdEstadoViajeOrigen": 402, "IdEstadoViajeDestino": 500}), # RENDIDO -> LIQUIDABLE
    (2501, {"IdEstadoViajeOrigen": 500, "IdEstadoViajeDestino": 501, "IdEstadoPedido": 502}) # LIQUIDABLE -> LIQUIDADO
]
dist_sql.append("\n-- ---------------------------------------------------------")
dist_sql.append("-- ENTIDAD: ESTADOVIAJETRANSICION (DISTRIBUCIÓN - IdOperacion = 3)")
dist_sql.append("-- ---------------------------------------------------------")
for t_id, vals in viaje_trans_dist:
    dist_sql.append(generate_upsert("EstadoViajeTransicion", t_id, OPERACION_DISTRIBUCION_ID, vals))

# 5. PARADA TRANSITIONS
parada_trans_dist = [
    (2200, {"IdEstadoParadaOrigen": 203, "IdEstadoParadaDestino": 204, "IdEstadoOrden": 202}), # PENDIENTE -> EN VIAJE
    # Geocerca 204 (EN VIAJE) -> 205 (VISITADO / EN GEOCERCA)
    (2201, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 1}),
    (2202, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 2}),
    (2203, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 3}),
    (2204, {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": 205, "ValidarGeocerca": 1, "IdEstadoParadaVisita": 4}),
]

exec_actions = [
    # (sub_id, dest, params)
    (1, 300, {"RequiereFirma": 1}),                                                              # CARGADO
    (2, 301, {"RequiereFirma": 1, "RequiereMotivo": 1}),                                          # CARGADO PARCIAL
    (3, 302, {"RequiereFoto": 1, "RequiereMotivo": 1}),                                           # NO CARGADO
    (4, 303, {"RequiereFirma": 1, "RequiereFoto": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 303}),# ENTREGADO (POD)
    (5, 304, {"RequiereFirma": 1, "RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoOrden": 306, "IdEstadoPedido": 304}), # ENTREGA PARCIAL
    (6, 305, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 305}),                    # NO ENTREGADO
    (7, 400, {"RequiereFirma": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 400}),                  # RECOLECTADO EN DEVOLUCION
    (8, 404, {"RequiereFoto": 1, "RequiereMotivo": 1, "IdEstadoPedido": 404}),                    # NO RECOLECTADO
    (9, 405, {"RequiereFirma": 1, "RequiereMotivo": 1, "IdEstadoOrden": 400, "IdEstadoPedido": 405}), # RECOLECTADO PARCIAL
]

# Transiciones ejecutadas desde 204 (EN VIAJE)
for sub_id, dest, actions in exec_actions:
    t_id = 2300 + sub_id
    vals = {"IdEstadoParadaOrigen": 204, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_dist.append((t_id, vals))

# Transiciones ejecutadas desde 205 (VISITADO / EN GEOCERCA)
for sub_id, dest, actions in exec_actions:
    t_id = 2320 + sub_id
    vals = {"IdEstadoParadaOrigen": 205, "IdEstadoParadaDestino": dest}
    vals.update(actions)
    parada_trans_dist.append((t_id, vals))

dist_sql.append("\n-- ---------------------------------------------------------")
dist_sql.append("-- ENTIDAD: ESTADOPARADATRANSICION (DISTRIBUCIÓN - IdOperacion = 3)")
dist_sql.append("-- ---------------------------------------------------------")
for t_id, vals in parada_trans_dist:
    dist_sql.append(generate_upsert("EstadoParadaTransicion", t_id, OPERACION_DISTRIBUCION_ID, vals))

output_path = r"c:\Users\daniel.delamo\.gemini\antigravity\scratch\UniTask\docs\TSP\full_transiciones_distribucion.sql"
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(dist_sql))

print(f"Generated verified Distribución SQL script (IdOperacion = 3) -> {output_path}")
