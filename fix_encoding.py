import os

def fix_mojibake(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        # Revert the bad conversion:
        # It was read as cp1252 and saved as utf-8.
        # So we encode it back to cp1252, and decode as utf-8
        fixed = content.encode('cp1252').decode('utf-8')
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(fixed)
        print(f"Fixed {filename}")
    except Exception as e:
        print(f"Error fixing {filename}: {e}")

fix_mojibake('app_privee.html')
fix_mojibake('pdf-generator.js')
