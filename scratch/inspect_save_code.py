import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'app/UniTrace/[slug]/template.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Look for openModal('transiciones'...) or save functions for transiciones
idx = text.find("case 'transiciones':")
if idx != -1:
    print("=== openModal transiciones ===")
    print(text[idx:idx+600])

# Look for save handlers
for m in re.finditer(r'function guardar[A-Za-z0-9_]*', text):
    print(m.group(0))
