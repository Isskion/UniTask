import re
import os

source_file = r"docs\TSP\full_transiciones_tsp.sql"
dest_file = r"docs\TSP\full_transiciones_intermodal.sql"

if not os.path.exists(source_file):
    print(f"Source file {source_file} not found.")
    exit(1)

with open(source_file, 'r', encoding='utf-8') as f:
    sql = f.read()

tables = ["EstadoPedidoTransicion", "EstadoOrdenTransicion", "EstadoRutaTransicion", "EstadoViajeTransicion", "EstadoParadaTransicion"]

blocks = sql.split('GO\n')
output = []
output.append("-- =========================================================")
output.append("-- Transiciones de Estados de la Operación Intermodal (TSP)")
output.append("-- Offset ID: +3000 | IdOperacion = 3")
output.append("-- =========================================================\n")

for block in blocks:
    if not block.strip():
        continue
    
    table_found = None
    for table in tables:
        if f"dbo.{table}" in block:
            table_found = table
            break
    
    if not table_found:
        output.append(block + "GO\n")
        continue
        
    id_col = f"Id{table_found}"
    
    match_id = re.search(rf"WHERE {id_col} = (\d+)", block)
    if match_id:
        orig_id = int(match_id.group(1))
        new_id = orig_id + 3000
        
        block_new = re.sub(rf"WHERE {id_col} = {orig_id}", f"WHERE {id_col} = {new_id}", block)
        block_new = re.sub(rf"VALUES\s*\(\s*{orig_id}\s*,", f"VALUES ({new_id},", block_new)
        
        # Replace IdOperacion value with 3 for Intermodal
        block_new = re.sub(r"IdOperacion = 1", "IdOperacion = 3", block_new)
        block_new = re.sub(r", 1, 0, 0, 0", ", 3, 0, 0, 0", block_new) # Regex fallback if needed
        # In INSERT: replace the column value for IdOperacion (which was generated as 1) with 3
        # In gen_transitions_sql, IdOperacion is column index 16 or near company ID
        # Explicit update of SET IdOperacion = 3
        block_new = re.sub(r"IdOperacion = \d+", "IdOperacion = 3", block_new)
        
        output.append(block_new + "GO\n")
    else:
        output.append(block + "GO\n")

with open(dest_file, 'w', encoding='utf-8') as f:
    f.write("".join(output))

print(f"Generated Intermodal (IdOperacion = 3) transitions -> {dest_file}")
