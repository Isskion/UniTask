import sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open(r'app/UniTrace/[slug]/template.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

idx = text.find('function renderTransiciones()')
if idx != -1:
    print("=== renderTransiciones snippet ===")
    print(text[idx:idx+1500])

idx2 = text.find('function generarMatrizAutomatica()')
if idx2 != -1:
    print("=== generarMatrizAutomatica snippet ===")
    print(text[idx2:idx2+1000])
