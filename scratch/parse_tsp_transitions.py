import re
import os

tables = {
    "Pedido": "EstadoPedidoTransicion",
    "Orden": "EstadoOrdenTransicion",
    "Ruta": "EstadoRutaTransicion",
    "Viaje": "EstadoViajeTransicion",
    "Parada": "EstadoParadaTransicion"
}

# We also need state name maps to translate IDs to names
# Let's load state name map from full_estados_tsp.sql first
state_names = {} # format: {entity: {id: name}}
for ent in tables:
    state_names[ent] = {}
state_names["ParadaVisita"] = {}

sql_states_file = r"docs\TSP\full_estados_tsp.sql"
with open(sql_states_file, 'r', encoding='utf-8') as f:
    sql_st = f.read()

state_tables = {
    "Pedido": "EstadoPedido",
    "Orden": "EstadoOrden",
    "Viaje": "EstadoViaje",
    "Parada": "EstadoParada",
    "ParadaVisita": "EstadoParadaVisita",
    "Ruta": "EstadoRuta"
}

blocks = sql_st.split('GO')
for block in blocks:
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
            if m_id and m_desc:
                id_val = int(m_id.group(1))
                desc = m_desc.group(1)
                # Map sub-table correctly (dbo.EstadoParadaVisita vs dbo.EstadoParada)
                if tbl == "EstadoParadaVisita":
                    state_names["ParadaVisita"][id_val] = desc
                else:
                    state_names[ent][id_val] = desc

# Manual additions/overrides if any
state_names["Pedido"][1] = "INGRESADO"
state_names["Pedido"][2] = "ERROR-REQUIERE AJUSTE"
state_names["Pedido"][3] = "GRABADO"
state_names["Pedido"][100] = "CONFIRMADO"
state_names["Pedido"][101] = "PROGRAMAR DIRECTO REMITENTE DESTINO"
state_names["Pedido"][102] = "PROGRAMAR RECOLECCIÓN"
state_names["Pedido"][103] = "PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO"
state_names["Pedido"][104] = "PROGRAMAR ARRASTRE"
state_names["Pedido"][105] = "PROGRAMAR REPARTO"

def parse_file(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    results = []
    blocks = sql.split('GO')
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        
        # Determine table
        tbl_found = None
        ent_found = None
        for ent, tbl in tables.items():
            if f"dbo.{tbl}" in block:
                tbl_found = tbl
                ent_found = ent
                break
        
        if not tbl_found:
            continue
            
        id_col = f"Id{tbl_found}"
        
        # Extract Transition ID
        m_trans_id = re.search(rf"WHERE {id_col}\s*=\s*(\d+)", block)
        if not m_trans_id:
            m_trans_id = re.search(rf"VALUES\s*\(\s*(\d+)\s*,", block)
            
        if not m_trans_id:
            continue
            
        trans_id = int(m_trans_id.group(1))
        
        # Extract Source and Target state IDs
        # Column names are IdEstado<Entity>Origen and IdEstado<Entity>Destino
        # except Ruta, which uses IdEstadoRutaOrigen and IdEstadoRutaDestino
        # Orden uses IdEstadoOrdenOrigen and IdEstadoOrdenDestino
        # Viaje uses IdEstadoViajeOrigen and IdEstadoViajeDestino
        # Parada uses IdEstadoParadaOrigen and IdEstadoParadaDestino
        src_col = f"IdEstado{ent_found}Origen"
        dst_col = f"IdEstado{ent_found}Destino"
        
        m_src = re.search(rf"{src_col}\s*=\s*(\d+|NULL)", block)
        m_dst = re.search(rf"{dst_col}\s*=\s*(\d+|NULL)", block)
        
        # In VALUES, it's (id, src, dst, ...
        if not m_src or not m_dst:
            # Let's parse VALUES (trans_id, src_id, dst_id, ...
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
            
        # Extract parameters: RequiereFirma, RequiereFoto, RequiereMotivo, PermiteObtenerEvidencias
        m_req_firma = re.search(rf"RequiereFirma\s*=\s*(\d+)", block)
        req_firma = int(m_req_firma.group(1)) if m_req_firma else 0
        
        m_req_foto = re.search(rf"RequiereFoto\s*=\s*(\d+)", block)
        req_foto = int(m_req_foto.group(1)) if m_req_foto else 0
        
        m_req_motivo = re.search(rf"RequiereMotivo\s*=\s*(\d+)", block)
        req_motivo = int(m_req_motivo.group(1)) if m_req_motivo else 0
        
        m_perm_evid = re.search(rf"PermiteObtenerEvidencias\s*=\s*(\d+)", block)
        perm_evid = int(m_perm_evid.group(1)) if m_perm_evid else 0
        
        # Get Names
        src_name = "NULL"
        if src_val != "NULL":
            src_name = state_names[ent_found].get(int(src_val), f"ESTADO_{src_val}")
        dst_name = "NULL"
        if dst_val != "NULL":
            dst_name = state_names[ent_found].get(int(dst_val), f"ESTADO_{dst_val}")
            
        results.append({
            "Entidad": ent_found,
            "TransId": trans_id,
            "SrcId": src_val,
            "SrcName": src_name,
            "DstId": dst_val,
            "DstName": dst_name,
            "Firma": req_firma,
            "Foto": req_foto,
            "Motivo": req_motivo,
            "Evidencia": perm_evid
        })
        
    return results

print("=== INTERNACIONAL TRANSITIONS ===")
intl = parse_file(r"docs\TSP\full_transiciones_tsp.sql")
for t in sorted(intl, key=lambda x: (x["Entidad"], x["TransId"])):
    print(f"{t['Entidad']} | ID: {t['TransId']} | {t['SrcId']} ({t['SrcName']}) -> {t['DstId']} ({t['DstName']}) | Firma: {t['Firma']} | Foto: {t['Foto']} | Motivo: {t['Motivo']} | Evid: {t['Evidencia']}")

print("\n=== INTERMODAL TRANSITIONS ===")
interm = parse_file(r"docs\TSP\full_transiciones_intermodal.sql")
for t in sorted(interm, key=lambda x: (x["Entidad"], x["TransId"])):
    print(f"{t['Entidad']} | ID: {t['TransId']} | {t['SrcId']} ({t['SrcName']}) -> {t['DstId']} ({t['DstName']}) | Firma: {t['Firma']} | Foto: {t['Foto']} | Motivo: {t['Motivo']} | Evid: {t['Evidencia']}")
