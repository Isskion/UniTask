import re

sql_file = r"docs\TSP\full_estados_tsp.sql"

with open(sql_file, 'r', encoding='utf-8') as f:
    sql = f.read()

tables = {
    "Pedido": "EstadoPedido",
    "Orden": "EstadoOrden",
    "Viaje": "EstadoViaje",
    "Parada": "EstadoParada",
    "ParadaVisita": "EstadoParadaVisita",
    "Ruta": "EstadoRuta"
}

results = {entity: [] for entity in tables}

blocks = sql.split('GO')

for block in blocks:
    block = block.strip()
    if not block:
        continue
    
    # Determine table
    table_found = None
    entity_found = None
    for entity, table in tables.items():
        if f"dbo.{table}" in block:
            table_found = table
            entity_found = entity
            break
            
    if not table_found:
        continue
        
    # Match ID and Description
    # Usually in VALUES (id, 'desc', ...
    # or SET Descripcion = 'desc', Color = color ... WHERE IdEstadoTable = id
    # Let's extract id from: WHERE IdEstadoEntity = <id>
    id_col = f"Id{table_found}"
    match_id = re.search(rf"WHERE {id_col}\s*=\s*(\d+)", block)
    if not match_id:
        match_id = re.search(rf"VALUES\s*\(\s*(\d+)\s*,", block)
        
    match_desc = re.search(rf"SET Descripcion\s*=\s*'([^']+)'", block)
    if not match_desc:
        match_desc = re.search(rf"VALUES\s*\(\s*\d+\s*,\s*'([^']+)'", block)
        
    match_color = re.search(rf"Color\s*=\s*(\d+|NULL)", block)
    if not match_color:
        # Check values line: VALUES (id, 'desc', color, ...
        # Let's find: VALUES (id, 'desc', color_val
        match_color = re.search(rf"VALUES\s*\(\s*\d+\s*,\s*'[^']+'\s*,\s*(\d+|NULL)", block)
        
    if match_id and match_desc:
        id_val = int(match_id.group(1))
        desc = match_desc.group(1)
        color = match_color.group(1) if match_color else "NULL"
        results[entity_found].append((id_val, desc, color))

# Print the results in a structured format
for entity, states in results.items():
    print(f"--- ENTITY: {entity} ---")
    seen_ids = set()
    for s in sorted(states, key=lambda x: x[0]):
        if s[0] in seen_ids:
            continue
        seen_ids.add(s[0])
        print(f"ID: {s[0]} | Desc: {s[1]} | Color: {s[2]}")
