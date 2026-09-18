import os
import glob

replacements = {
    "MÃ©thodologie": "Méthodologie",
    "DÃ©tection": "Détection",
    "matÃ©riaux": "matériaux",
    "Gros Œuvre": "Gros Œuvre",
    "Second Œuvre": "Second Œuvre",
    "LÃ©gales": "Légales",
    "DonnÃ©es": "Données",
    "Ã©": "é",
    "Ã‰": "É",
    "Ã¨": "è",
    "Ãˆ": "È",
    "Ã ": "à",
    "Ã ": "À",
    "Ã¢": "â",
    "Ãª": "ê",
    "Ã®": "î",
    "Ã´": "ô",
    "Ã»": "û",
    "Ã§": "ç",
    "Ã‡": "Ç",
    "â€™": "’",
    "â€¢": "•",
    "â€“": "–",
    "â€”": "—",
    "Ã": "à", # fallback for leftover Ã which are usually à if not followed by ©
    "MaÃ®tre dâ€™Ouvrage": "Maître d'Ouvrage",
    "GÃ©nÃ©ration": "Génération",
    "tÃ©lÃ©charge": "télécharge",
    "SÃ©nÃ©gal": "Sénégal",
    "dÃ©monstration": "démonstration",
    "ValidÃ©": "Validé",
    "â ³": "⏳",
    "PRÃ‰CÃ‰DENT": "PRÉCÉDENT",
    "EMPÃŠCHE": "EMPÊCHE",
    "chargÃ©": "chargé"
}

files = glob.glob("c:\\Users\\germa\\.gemini\\antigravity-ide\\scratch\\ChantierSur\\*.html")
files.append("c:\\Users\\germa\\.gemini\\antigravity-ide\\scratch\\ChantierSur\\pdf-generator.js")

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Run user requested exact matches first
    for bad, good in replacements.items():
        content = content.replace(bad, good)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Text fixed")
