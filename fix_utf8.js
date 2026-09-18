const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\germa\\.gemini\\antigravity-ide\\scratch\\ChantierSur';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
files.push('pdf-generator.js');

const replacements = {
    "MÃ©thodologie": "Méthodologie",
    "DÃ©tection": "Détection",
    "matÃ©riaux": "matériaux",
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
};

for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    
    // Fix standalone Ã
    content = content.split("Ã ").join("à ");
    
    fs.writeFileSync(filePath, content, 'utf8');
}
console.log("UTF-8 fixed via Node");
