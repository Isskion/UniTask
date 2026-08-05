import os
import re

db_pattern = re.compile(r'UNIGIS_DataRepository_[A-Za-z0-9_]+', re.IGNORECASE)
matches_found = []

for root, dirs, files in os.walk('.'):
    # Skip node_modules and .next
    if 'node_modules' in root or '.next' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith(('.sql', '.js', '.ts', '.ps1', '.json', '.txt', '.md', '.env', '.local')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                matches = db_pattern.findall(content)
                for m in matches:
                    matches_found.append((path, m))
            except Exception:
                pass

print("=== Found Database Names ===")
for path, db in sorted(list(set(matches_found))):
    print(f"{path}: {db}")
