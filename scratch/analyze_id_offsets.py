import re

file_path = r"docs\TSP\Internacional_Ayer\full_transiciones_tsp.sql"

with open(file_path, 'r', encoding='utf-8') as f:
    sql = f.read()

tables = ["EstadoPedidoTransicion", "EstadoOrdenTransicion", "EstadoRutaTransicion", "EstadoViajeTransicion", "EstadoParadaTransicion"]

all_ids = {}
for table in tables:
    matches = re.findall(rf"INSERT INTO dbo\.{table}\s*\([^\)]+\)\s*VALUES\s*\(([^\)]+)\);", sql)
    ids = [int(match.split(',')[0].strip()) for match in matches]
    all_ids[table] = sorted(ids)

offsets_to_test = [25, 100, 250, 1000]

print("=== Análisis de Colisiones por Offset ===")
for offset in offsets_to_test:
    print(f"\nProbando Offset: +{offset}")
    has_collisions_any = False
    for table in tables:
        orig_set = set(all_ids[table])
        shifted_set = {x + offset for x in all_ids[table]}
        collisions = orig_set.intersection(shifted_set)
        if collisions:
            print(f"  - {table}: ¡COLISIÓN DETECTADA! {len(collisions)} colisiones en IDs: {sorted(list(collisions))[:5]}...")
            has_collisions_any = True
        else:
            print(f"  - {table}: OK (Sin colisiones). Rango: {min(shifted_set)} - {max(shifted_set)}")
    if not has_collisions_any:
        print(f"-> CONCLUSIÓN: Offset +{offset} es 100% SEGURO.")
    else:
        print(f"-> CONCLUSIÓN: Offset +{offset} NO es seguro debido a colisiones.")
