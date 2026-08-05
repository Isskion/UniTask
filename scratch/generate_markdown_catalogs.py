import re
import os

# Paths
sql_states_file = r"docs\TSP\full_estados_tsp.sql"
sql_intl_file = r"docs\TSP\full_transiciones_tsp.sql"
sql_interm_file = r"docs\TSP\full_transiciones_intermodal.sql"
out_dir = r"C:\Users\daniel.delamo\.gemini\antigravity\brain\426b3482-74db-4a8c-974d-05da7a1b51b8"

state_tables = {
    "Pedido": "EstadoPedido",
    "Orden": "EstadoOrden",
    "Viaje": "EstadoViaje",
    "Parada": "EstadoParada",
    "ParadaVisita": "EstadoParadaVisita",
    "Ruta": "EstadoRuta"
}

transition_tables = {
    "Pedido": "EstadoPedidoTransicion",
    "Orden": "EstadoOrdenTransicion",
    "Ruta": "EstadoRutaTransicion",
    "Viaje": "EstadoViajeTransicion",
    "Parada": "EstadoParadaTransicion"
}

# 1. Parse States
with open(sql_states_file, 'r', encoding='utf-8') as f:
    sql_st = f.read()

state_names = {ent: {} for ent in state_tables}
state_details = []

blocks_st = sql_st.split('GO')
for block in blocks_st:
    block = block.strip()
    if not block:
        continue
    for ent, tbl in state_tables.items():
        if f"dbo.{tbl}" in block:
            id_col = f"Id{tbl}"
            m_id = re.search(rf"WHERE {id_col}\s*=\s*(\d+)", block)
            if not m_id:
                m_id = re.search(rf"VALUES\s*\(\s*(\d+)\s*,", block)
            m_desc = re.search(rf"SET Descripcion\s*=\s*'([^']+)'", block)
            if not m_desc:
                m_desc = re.search(rf"VALUES\s*\(\s*\d+\s*,\s*'([^']+)'", block)
            m_color = re.search(rf"Color\s*=\s*(\d+|NULL)", block)
            if not m_color:
                m_color = re.search(rf"VALUES\s*\(\s*\d+\s*,\s*'[^']+'\s*,\s*(\d+|NULL)", block)
            
            if m_id and m_desc:
                id_val = int(m_id.group(1))
                desc = m_desc.group(1).upper() # Mayusculas
                color = m_color.group(1) if m_color else "NULL"
                
                # Determine Momento de Ejecucion
                moment = "INGRESO/PROGRAMACION"
                if 100 <= id_val < 200:
                    moment = "PLANIFICACION/ASIGNACION"
                elif 200 <= id_val < 300:
                    moment = "TRANSITO/EJECUCION"
                elif 300 <= id_val < 400:
                    moment = "CARGA/ENTREGA"
                elif 400 <= id_val < 500:
                    moment = "LOGISTICA INVERSA/CIERRE/RENDICION"
                elif id_val >= 500:
                    moment = "LIQUIDACION/CIERRE"
                
                state_names[ent][id_val] = desc
                state_details.append({
                    "Entidad": ent,
                    "Id": id_val,
                    "Momento": moment,
                    "Nombre": desc,
                    "Color": color
                })

# Fallbacks / Manual Overrides
state_names["Pedido"][1] = "INGRESADO"
state_names["Pedido"][2] = "ERROR-REQUIERE AJUSTE"
state_names["Pedido"][3] = "GRABADO"
state_names["Pedido"][100] = "CONFIRMADO"
state_names["Pedido"][101] = "PROGRAMAR DIRECTO REMITENTE DESTINO"
state_names["Pedido"][102] = "PROGRAMAR RECOLECCIÓN"
state_names["Pedido"][103] = "PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO"
state_names["Pedido"][104] = "PROGRAMAR ARRASTRE"
state_names["Pedido"][105] = "PROGRAMAR REPARTO"

# 2. Function to parse transitions file
def parse_transitions(filepath, default_op_id):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()
        
    transitions = []
    blocks = sql.split('GO')
    for block in blocks:
        block = block.strip()
        if not block:
            continue
            
        tbl_found = None
        ent_found = None
        for ent, tbl in transition_tables.items():
            if f"dbo.{tbl}" in block:
                tbl_found = tbl
                ent_found = ent
                break
        
        if not tbl_found:
            continue
            
        id_col = f"Id{tbl_found}"
        m_trans_id = re.search(rf"WHERE {id_col}\s*=\s*(\d+)", block)
        if not m_trans_id:
            m_trans_id = re.search(rf"VALUES\s*\(\s*(\d+)\s*,", block)
        if not m_trans_id:
            continue
            
        trans_id = int(m_trans_id.group(1))
        
        src_col = f"IdEstado{ent_found}Origen"
        dst_col = f"IdEstado{ent_found}Destino"
        
        m_src = re.search(rf"{src_col}\s*=\s*(\d+|NULL)", block)
        m_dst = re.search(rf"{dst_col}\s*=\s*(\d+|NULL)", block)
        
        if not m_src or not m_dst:
            m_val = re.search(rf"VALUES\s*\(\s*\d+\s*,\s*(\d+|NULL)\s*,\s*(\d+|NULL)", block)
            if m_val:
                src_val = m_val.group(1)
                dst_val = m_val.group(2)
            else:
                src_val = "NULL"
                dst_val = "NULL"
        else:
            src_val = m_src.group(1)
            dst_val = m_dst.group(1)
            
        # Parse parameters
        m_req_firma = re.search(rf"RequiereFirma\s*=\s*(\d+)", block)
        req_firma = int(m_req_firma.group(1)) if m_req_firma else 0
        
        m_req_foto = re.search(rf"RequiereFoto\s*=\s*(\d+)", block)
        req_foto = int(m_req_foto.group(1)) if m_req_foto else 0
        
        m_req_motivo = re.search(rf"RequiereMotivo\s*=\s*(\d+)", block)
        req_motivo = int(m_req_motivo.group(1)) if m_req_motivo else 0
        
        m_perm_evid = re.search(rf"PermiteObtenerEvidencias\s*=\s*(\d+)", block)
        perm_evid = int(m_perm_evid.group(1)) if m_perm_evid else 0
        
        m_op = re.search(rf"IdOperacion\s*=\s*(\d+)", block)
        if not m_op:
            # check inside VALUES
            # IdOperacion is column 17 in EstadoPedidoTransicion, column 10 in others, etc.
            # We can use the default or search values line
            m_op = re.search(rf"VALUES\s*\(.*?,.*?IdOperacion\s*=\s*(\d+)", block)
        op_id = int(m_op.group(1)) if m_op else default_op_id
        
        src_name = "NULL"
        if src_val != "NULL":
            src_name = state_names[ent_found].get(int(src_val), f"ESTADO_{src_val}").upper()
        dst_name = "NULL"
        if dst_val != "NULL":
            dst_name = state_names[ent_found].get(int(dst_val), f"ESTADO_{dst_val}").upper()
            
        transitions.append({
            "Entidad": ent_found,
            "TransId": trans_id,
            "SrcId": src_val,
            "SrcName": src_name,
            "DstId": dst_val,
            "DstName": dst_name,
            "OpId": op_id,
            "Firma": req_firma,
            "Foto": req_foto,
            "Motivo": req_motivo,
            "Evidencia": perm_evid
        })
    return transitions

intl_trans = parse_transitions(sql_intl_file, 1)
interm_trans = parse_transitions(sql_interm_file, 1) # Wait, does Intermodal also use IdOperacion = 1? Yes, in Transpais operation rule, all transitions use 1.

# Sort entities in custom order: Pedido, Orden, Ruta, Viaje, Parada, ParadaVisita
entity_order = ["Pedido", "Orden", "Ruta", "Viaje", "Parada", "ParadaVisita"]

# 3. Write States Catalog
states_md_path = os.path.join(out_dir, "estados_totales_tsp.md")
with open(states_md_path, 'w', encoding='utf-8') as f:
    f.write("# Catálogo Maestro de Estados Compartidos - Transpais (TSP)\n\n")
    f.write("Este catálogo consolidado contiene todos los estados físicos configurados para las entidades del TMS UNIGIS.\n\n")
    f.write("| Entidad | ID Estado | Momento de Ejecución | Nombre Estado | Color (DEC) | Descripción |\n")
    f.write("|:---|:---|:---|:---|:---|:---|\n")
    
    # Group and sort
    sorted_states = sorted(state_details, key=lambda x: (entity_order.index(x["Entidad"]), x["Id"]))
    seen_state_keys = set()
    for s in sorted_states:
        key = (s["Entidad"], s["Id"])
        if key in seen_state_keys:
            continue
        seen_state_keys.add(key)
        desc = f"ESTADO PARA LA ENTIDAD {s['Entidad'].upper()} EN MOMENTO {s['Momento']}"
        f.write(f"| {s['Entidad']} | {s['Id']} | {s['Momento']} | {s['Nombre']} | {s['Color']} | {desc} |\n")

# 4. Write Internacional Transitions
intl_md_path = os.path.join(out_dir, "transiciones_internacional_tsp.md")
with open(intl_md_path, 'w', encoding='utf-8') as f:
    f.write("# Matriz de Transiciones - Operación Internacional (Transpais TSP)\n\n")
    f.write("Matriz de transiciones habilitadas para la operación de **Internacional** (`IdOperacion = 1`).\n\n")
    f.write("| Entidad | ID Transición | ID Origen | Estado Origen | ID Destino | Estado Destino | IdOperacion | Requiere Firma | Requiere Foto | Requiere Motivo | Permite Evidencias |\n")
    f.write("|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|\n")
    
    sorted_intl = sorted(intl_trans, key=lambda x: (entity_order.index(x["Entidad"]), x["TransId"]))
    for t in sorted_intl:
        f.write(f"| {t['Entidad']} | {t['TransId']} | {t['SrcId']} | {t['SrcName']} | {t['DstId']} | {t['DstName']} | {t['OpId']} | {t['Firma']} | {t['Foto']} | {t['Motivo']} | {t['Evidencia']} |\n")

# 5. Write Intermodal Transitions
interm_md_path = os.path.join(out_dir, "transiciones_intermodal_tsp.md")
with open(interm_md_path, 'w', encoding='utf-8') as f:
    f.write("# Matriz de Transiciones - Operación Intermodal (Transpais TSP)\n\n")
    f.write("Matriz de transiciones habilitadas para la operación de **Intermodal** (Offset +1000, `IdOperacion = 1`).\n\n")
    f.write("| Entidad | ID Transición | ID Origen | Estado Origen | ID Destino | Estado Destino | IdOperacion | Requiere Firma | Requiere Foto | Requiere Motivo | Permite Evidencias |\n")
    f.write("|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|\n")
    
    sorted_interm = sorted(interm_trans, key=lambda x: (entity_order.index(x["Entidad"]), x["TransId"]))
    for t in sorted_interm:
        f.write(f"| {t['Entidad']} | {t['TransId']} | {t['SrcId']} | {t['SrcName']} | {t['DstId']} | {t['DstName']} | {t['OpId']} | {t['Firma']} | {t['Foto']} | {t['Motivo']} | {t['Evidencia']} |\n")

print("Done! Markdown catalogs generated successfully.")
