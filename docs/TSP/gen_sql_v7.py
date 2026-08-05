import os

tables = {
    "EstadoPedido": [
        ("IdEstadoPedido", "int"), ("Descripcion", "varchar"), ("Color", "int"), ("TiempoMaximo", "int"),
        ("ReferenciaExterna", "varchar"), ("WorkflowStep", "int"), ("Icono", "varchar"), ("DescripcionExterna", "varchar"),
        ("WorkflowStepTransicionB2C", "bit"), ("PermiteLeerEtiqueta", "bit"), ("InformaMotivoEnB2C", "bit"),
        ("Anulacion", "bit"), ("FechaCreacion", "datetime"), ("FechaUltimaModificacion", "datetime"), ("PermiteCrearCita", "bit")
    ],
    "EstadoOrden": [
        ("IdEstadoOrden", "bigint"), ("Descripcion", "varchar"), ("LlamadaExterna", "varchar"), ("Color", "int"),
        ("Anulacion", "bit"), ("TiempoMaximo", "int"), ("ReferenciaExterna", "varchar"), ("WorkflowStep", "int"),
        ("Final", "bit"), ("Barcode", "bit"), ("Dispatch", "bit"), ("PermiteCrearPedido", "bit"), ("B2C", "bit"),
        ("PermiteLeerEtiqueta", "bit"), ("PermiteCrearCita", "bit")
    ],
    "EstadoRuta": [
        ("IdEstadoRuta", "int"), ("Descripcion", "varchar"), ("Color", "int"), ("LlamadaExterna", "varchar"), ("Dispatch", "bit")
    ],
    "EstadoViaje": [
        ("IdEstadoViaje", "int"), ("Descripcion", "varchar"), ("IdSeguimientoEstado", "int"), ("Color", "int"),
        ("TiempoMaximo", "int"), ("ReferenciaExterna", "varchar"), ("WorkflowStep", "int"), ("Expedicion", "bit"),
        ("Recepcion", "bit"), ("Final", "bit"), ("PlanificacionRecursos", "bit"), ("PermitePublicarTendering", "bit"),
        ("VisibleMobile", "bit"), ("IdEstadoFase", "int"), ("VisibleTendering", "bit"), ("VisibleYard", "bit"),
        ("IdTipoAlarmaTiempoMaximo", "int"), ("EnMuelle", "bit"), ("PermiteAsignarMuelle", "bit"),
        ("PermiteDesasignarMuelle", "bit"), ("PermiteLiberarMuelle", "bit"), ("PermiteActivacionAutomatica", "bit"),
        ("Dispatch", "bit"), ("AnalizarArriboProximo", "bit"), ("PermiteRendicionRecursos", "bit"),
        ("AnalizarArriboEstimado", "bit"), ("PermiteModificarMuelleSalida", "bit"), ("PermiteModificarMuelleLlegada", "bit"),
        ("PermiteTarifarRetroactivo", "bit"), ("PermiteAdministrarRecursosDescartables", "bit"), ("DispatchToAssign", "bit"),
        ("FechaCreacion", "datetime"), ("FechaUltimaModificacion", "datetime"), ("InicioCarga", "bit")
    ],
    "EstadoParada": [
        ("IdEstadoParada", "int"), ("Descripcion", "varchar"), ("Color", "int"), ("Anulacion", "bit"),
        ("DesasociarOrden", "bit"), ("ReferenciaExterna", "varchar"), ("VisitaReal", "bit"), ("OrdenVisualizacion", "int"),
        ("PermiteMobile", "bit"), ("Costo", "bit"), ("Venta", "bit"), ("Realizado", "bit"), ("Icono", "varchar"),
        ("RealizadoParcial", "bit"), ("Dispatch", "bit"), ("PrimeraVisitaEfectiva", "bit"), ("WorkflowStep", "int"),
        ("NoRealizado", "bit"), ("EsperaDescarga", "bit"), ("InformaMotivoEnB2C", "bit"), ("PermiteEstadia", "bit"),
        ("EnProgreso", "bit"), ("LiberarComoOrdenAlFinalizarViaje", "bit"), ("CheckInCheckOut", "bit")
    ],
    "EstadoParadaVisita": [
        ("IdEstadoParadaVisita", "int"), ("Descripcion", "varchar"), ("Color", "int")
    ]
}

def get_color(desc, table=None):
    d = desc.upper()
    if table == "EstadoParadaVisita":
        if "PENDIENTE" in d or "VISITANDO" in d:
            return "13421772"
        elif d == "VISITADO":
            return "16239131"
        elif "HORARIO" in d:
            return "4635634"
        elif "ORDEN" in d:
            return "12876773"
        return "13421772"
    if "ERROR" in d or "RECHAZADO" in d or "NO CARGADO" in d or "NO ENTREGADO" in d or "DEVOLUCIÓN" in d or "NO RECOLECTADO" in d:
        return "255" # Red
    elif "ENTREGADO" in d or "FINALIZADA" in d or "LIQUIDADO" in d or "RENDIDO" in d or "CONFIRMADO" in d or "GRABADO" in d or "CARGADO" in d or "RECOLECTADO" in d:
        return "65280" # Green
    elif "TRÁNSITO" in d or "ACTIVO" in d or "VIAJE" in d or "RUTA" in d or "VIAJE" in d or "EJECUCIÓN" in d:
        return "16711680" # Blue
    elif "PENDIENTE" in d or "PLANIFICAD" in d or "PROG" in d or "PROGRAMAR" in d:
        return "65535" # Yellow
    else:
        return "14210386" # Beige/Default

def map_estado_fase(id_val):
    if id_val < 100:
        return "1" # Inicial
    elif 100 <= id_val < 200:
        return "2" # Planificado
    elif 200 <= id_val < 400:
        return "3" # En Ejecución
    elif 400 <= id_val < 500:
        return "4" # Rendición
    elif id_val >= 500:
        return "5" # Liquidado
    return "0"

def generate_upsert(table, id_val, desc):
    cols = tables[table]
    
    col_dict = {}
    for cname, ctype in cols:
        if cname == f"Id{table}":
            col_dict[cname] = str(id_val)
        elif cname == "IdEstadoFase":
            col_dict[cname] = map_estado_fase(id_val)
        elif cname == "IdSeguimientoEstado" or cname == "IdTipoAlarmaTiempoMaximo":
            col_dict[cname] = "NULL"
        elif cname == "Descripcion":
            col_dict[cname] = f"'{desc}'"
        elif cname == "Color":
            col_dict[cname] = get_color(desc, table)
        elif cname == "TiempoMaximo":
            col_dict[cname] = "99999999"
        elif cname in ["ReferenciaExterna", "DescripcionExterna", "LlamadaExterna"]:
            col_dict[cname] = f"'{desc}'"
        elif cname == "PermiteLeerEtiqueta":
            col_dict[cname] = "1"
        elif cname == "Final" and (desc == "Finalizada" or desc == "FINALIZADA" or desc == "FINALIZADO"):
            col_dict[cname] = "1"
        elif cname == "Anulacion" and ("RECHAZADO" in desc.upper() or "NO" in desc.upper()):
            col_dict[cname] = "1"
        elif cname == "Realizado" and ("Entregado" in desc or "ENTREGADO" in desc or "RECOLECTADO" in desc or "Cargado" in desc or "CARGADO" in desc):
            col_dict[cname] = "1"
        elif ctype == "bit": 
            col_dict[cname] = "0"
        elif ctype in ["int", "bigint"]: 
            col_dict[cname] = "0"
        elif ctype == "datetime": 
            col_dict[cname] = "NULL"
        elif ctype == "varchar": 
            col_dict[cname] = "NULL"
        else:
            col_dict[cname] = "NULL"

    id_col = f"Id{table}"
    update_sets = ", ".join([f"{k} = {v}" for k, v in col_dict.items() if k != id_col])
    insert_cols = ", ".join(col_dict.keys())
    insert_vals = ", ".join(col_dict.values())
    
    upsert = f"""IF EXISTS (SELECT 1 FROM dbo.{table} WHERE {id_col} = {id_val})
BEGIN
    UPDATE dbo.{table}
    SET {update_sets}
    WHERE {id_col} = {id_val}
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

states = {
    "EstadoPedido": [
        (1, "INGRESADO"), (2, "ERROR-REQUIERE AJUSTE"), (3, "GRABADO"), (100, "CONFIRMADO"),
        (101, "PROGRAMAR DIRECTO REMITENTE DESTINO"),
        (102, "PROGRAMAR RECOLECCIÓN"),
        (103, "PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO"),
        (104, "PROGRAMAR ARRASTRE"),
        (105, "PROGRAMAR REPARTO"),
        (303, "ENTREGADO"),
        (304, "ENTREGA PARCIAL"),
        (305, "NO ENTREGADO"),
        (400, "RECOLECTADO"),
        (404, "NO RECOLECTADO"),
        (405, "RECOLECTADO PARCIAL"),
        (502, "LIQUIDADO")
    ],
    "EstadoOrden": [
        (102, "PENDIENTE"), (104, "PLANIFICADA"), (202, "EN TRÁNSITO"), (306, "FINALIZADA"),
        (400, "RECOLECTADO")
    ],
    "EstadoViaje": [
        (105, "INACTIVO"), (106, "ASIGNADO / PENDIENTE"), (107, "RECHAZADO"), (108, "CONFIRMADO"),
        (200, "ACTIVO / EN EJECUCIÓN"), (403, "FINALIZADO"), (402, "RENDIDO"), (500, "LIQUIDABLE"), (501, "LIQUIDADO")
    ],
    "EstadoParada": [
        (203, "PENDIENTE"), (204, "EN VIAJE"), (205, "VISITADO / EN GEOCERCA"),
        (300, "CARGADO"), (301, "CARGADO PARCIAL"), (302, "NO CARGADO"),
        (303, "ENTREGADO"), (304, "ENTREGA PARCIAL"), (305, "NO ENTREGADO"),
        (400, "RECOLECTADO EN DEVOLUCIÓN"), (404, "NO RECOLECTADO"), (405, "RECOLECTADO PARCIAL")
    ],
    "EstadoParadaVisita": [
        (0, "PENDIENTE"), (1, "VISITANDO"), (2, "VISITADO"), 
        (3, "VISITADO FUERA DE HORARIO"), (4, "VISITADO FUERA DE ORDEN")
    ],
    "EstadoRuta": [
        (103, "CREADA"), (201, "EN RUTA"), (401, "FINALIZADA")
    ]
}

out_full = []
out_full.append("-- Script Completo de Upsert de Estados TSP (Consolidado Final)")
out_full.append("-- Incluye los 5 estados de programación de Pedido, estados espejo, Viaje Finalizado, Parada Recolectado Parcial y Estados de Visita.")

for table, st_list in states.items():
    out_full.append(f"\n-- ---------------------------------------------------------")
    out_full.append(f"-- ENTIDAD: {table.upper()}")
    out_full.append(f"-- ---------------------------------------------------------")
    for id_val, desc in st_list:
        out_full.append(generate_upsert(table, id_val, desc.upper()))

base_dir = r"c:\Users\daniel.delamo\.gemini\antigravity\scratch\UniTask\docs\TSP"
with open(os.path.join(base_dir, "full_estados_tsp.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(out_full))

