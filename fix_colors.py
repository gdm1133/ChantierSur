import os
import re

files_to_check = []
for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'netlify' in root or 'scratch' in root:
        continue
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            files_to_check.append(os.path.join(root, file))

for filepath in files_to_check:
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    orig_content = content
    
    # Fix corrupted emerald
    content = content.replace('[#C9A227]merald', 'emerald')
    
    # Replace #C9A227 completely
    content = re.sub(r'(?i)#C9A227', '#B8C9DB', content)
    content = re.sub(r'(?i)bg-amber-\d{3}', 'bg-[#1B4F72]', content)
    content = re.sub(r'(?i)text-amber-\d{3}', 'text-[#B8C9DB]', content)
    content = re.sub(r'(?i)border-amber-\d{3}', 'border-[#B8C9DB]', content)
    
    # Fix the header background (make it Navy Blue)
    content = re.sub(r'<header class="[^"]*bg-white/95[^"]*"', '<header class="bg-[#0E2A47] border-b border-[#1B4F72] sticky top-0 z-50"', content)
    content = re.sub(r'<header class="bg-white border-b border-slate-200 sticky top-0 z-50"', '<header class="bg-[#0E2A47] border-b border-[#1B4F72] sticky top-0 z-50"', content)
    
    # Fix Topbar
    content = re.sub(r'<div class="bg-white border-b border-slate-800 text-\[11px\] text-slate-400 py-2 px-4">', '<div class="bg-[#0E2A47] border-b border-[#1B4F72] text-[11px] text-slate-300 py-2 px-4">', content)
    content = re.sub(r'<div class="bg-white border-b border-slate-200 text-\[11px\] text-slate-400 py-2 px-4">', '<div class="bg-[#0E2A47] border-b border-[#1B4F72] text-[11px] text-slate-300 py-2 px-4">', content)
    
    # Fix Footer
    content = content.replace('<footer class="bg-white', '<footer class="bg-[#0E2A47]')
    
    # Fix text in header to white
    content = content.replace('text-[#0E2A47]" style="font-family: \'Archivo\'', 'text-white" style="font-family: \'Archivo\'')
    content = content.replace('text-[#0E2A47]" style="font-family: \'Archivo\', sans-serif; font-weight: 800;">ChantierSur.com', 'text-white" style="font-family: \'Archivo\', sans-serif; font-weight: 800;">ChantierSur.com')
    
    # Fix Logo
    content = content.replace('assets/logo/logo-a-clair.png', 'assets/logo/logo-a-sombre.png')
    content = content.replace('assets/logo/logo-a-clair.webp', 'assets/logo/logo-a-sombre.webp')
    
    if orig_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

