import re

with open(r'app/UniTrace/[slug]/template.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print("File total length:", len(text))

# Search for all tabs
tab_matches = re.findall(r'<div id="tab-([^"]+)"', text)
print("Tabs found in UniTrace:", tab_matches)

# Find render functions for transiciones
render_funcs = re.findall(r'function (render[A-Za-z0-9_]*Transicion[A-Za-z0-9_]*)', text)
print("Render functions:", render_funcs)

# Find buttons in tab-transiciones or tab-transicionesTsp
for tab in ['transiciones', 'transicionesTsp', 'transicionestsp']:
    m = re.search(r'<div id="tab-' + tab + r'".*?</div>\s*</div>', text, re.DOTALL | re.IGNORECASE)
    if m:
        print(f"=== Tab content header ({tab}) ===")
        print(m.group(0)[:600])
