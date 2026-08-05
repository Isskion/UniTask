import re

file_path = r"Integracion_UNIGIS_Maersk.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find matches for something like Word.Word (e.g. Pedido.ReferenciaExterna)
matches = re.findall(r'[a-zA-Z_]+\.[a-zA-Z0-9_]+', text)
unique_matches = sorted(list(set(matches)))

print("=== Mappings found in Maersk Integration Doc ===")
for m in unique_matches:
    if m.startswith(("Pedido.", "Domicilio", "Direccion", "Cliente.", "Item.", "Orden.", "Viaje.", "Parada.")):
        print(m)
