import re
from collections import defaultdict

file_path = r"docs\TSP\Internacional_Ayer\full_transiciones_tsp.sql"

with open(file_path, 'r', encoding='utf-8') as f:
    sql = f.read()

# Tables: EstadoPedidoTransicion, EstadoOrdenTransicion, EstadoRutaTransicion, EstadoViajeTransicion, EstadoParadaTransicion
tables = ["EstadoPedidoTransicion", "EstadoOrdenTransicion", "EstadoRutaTransicion", "EstadoViajeTransicion", "EstadoParadaTransicion"]

for table in tables:
    matches = re.findall(rf"INSERT INTO dbo\.{table}\s*\([^\)]+\)\s*VALUES\s*\(([^\)]+)\);", sql)
    ids = []
    for match in matches:
        parts = [p.strip() for p in match.split(',')]
        ids.append(int(parts[0]))
    ids.sort()
    if ids:
        print(f"{table}: {len(ids)} transitions. Min: {ids[0]} | Max: {ids[-1]}")
        print(f"  All IDs: {ids}")
    else:
        print(f"{table}: No transitions found.")
