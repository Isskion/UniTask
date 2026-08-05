import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'app/UniTrace/[slug]/template.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

for m in re.finditer(r'function save[A-Za-z0-9_]*|async function save[A-Za-z0-9_]*', text):
    start = m.start()
    print("=== SAVE FUNC ===")
    print(text[start:start+400])
