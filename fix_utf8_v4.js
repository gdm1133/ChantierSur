const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('.', function(filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.txt')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // 1. Fix Mojibake
        content = content.replace(/gÃ©nÃ©rÃ©/g, 'généré');
        
        // 2. Fix BAEL and Footer
        const oldFooter1 = "Document généré automatiquement à titre indicatif • BAEL 91 R99 & Code des Obligations Civiles et Commerciales.";
        const oldFooter2 = "Document généré automatiquement à titre indicatif • BAEL 91 R99";
        const newFooter = "Document généré automatiquement à titre indicatif • ChantierSur.com — Bureau d'études numérique indépendant";
        
        content = content.split(oldFooter1).join(newFooter);
        content = content.split(oldFooter2).join(newFooter);
        content = content.split("BAEL 91 R99 & Code des Obligations Civiles et Commerciales.").join("ChantierSur.com — Bureau d'études numérique indépendant");
        
        // Fix 9.4 COCC art. 743 & BT01/BT02
        content = content.replace(/COCC, art\. 743/g, "Code des Obligations Civiles et Commerciales");
        content = content.replace(/indices « BT01\/BT02 »/g, "indices de révision des prix");
        content = content.replace(/BT01\/BT02/g, "indices standards");

        // 3. Fix 0-line validation message
        content = content.replace(/Veuillez importer ou ajouter au moins une ligne de devis pour lancer l'audit\./g, "Veuillez photographier ou saisir au moins une ligne de devis pour lancer l'audit.");

        // 4. Remove demo data
        content = content.replace(/Béton armé en fondation/g, "Ligne 1");
        content = content.replace(/Maçonnerie agglos creux/g, "Ligne 2");
        content = content.replace(/Peinture vinylique intérieure/g, "Ligne 3");
        content = content.replace(/Forfait électricité RDC/g, "Ligne 4");
        
        // Replace mockLines array
        content = content.replace(/const mockLines = \[.*?\];/s, 'const mockLines = [];');

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Modified " + filePath);
        }
    }
});
