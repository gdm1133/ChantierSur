const fs = require('fs');
const content = fs.readFileSync('pdf-generator.js', 'utf8');
// Mock jsPDF
const doc = {
    texts: [],
    tables: [],
    setFont: () => {},
    setFontSize: () => {},
    setTextColor: () => {},
    setFillColor: () => {},
    text: (str, x, y) => { doc.texts.push(str.toString()); },
    addPage: () => {},
    autoTable: (config) => {
        doc.tables.push(config);
        if (config.head) config.head.forEach(row => row.forEach(c => doc.texts.push(c)));
        if (config.body) config.body.forEach(row => row.forEach(c => doc.texts.push(c)));
    }
};

// We need to extract just the renderAudit function and evaluate it.
// We'll wrap pdf-generator in a function or just eval it.
let setupDocumentFonts = () => {};
let drawConfidentialBanner = () => {};
let addPage = () => {};
let y = 50;
let leftMargin = 15;
function fmt(val) { return Number(val).toLocaleString('fr-FR'); }

// Eval all functions from the file
eval(content);

try {
    const data = {
        devis_lines: [
            { lot: '1', designation: 'TEST-A', quantite: 1, pu_ht: 111000, montant_indique: 111000, unite: 'u' },
            { lot: '2', designation: 'TEST-B', quantite: 1, pu_ht: 222000, montant_indique: 222000, unite: 'u' },
            { lot: '3', designation: 'TEST-C', quantite: 1, pu_ht: 333000, montant_indique: 333000, unite: 'u' }
        ],
        total_ht_indique: 666000
    };
    renderAudit(doc, data, null, '25/09/2026');
    const allText = doc.texts.join('\n');
    console.log("=== TEST PASS 1 ===");
    console.log("TEST-A:", allText.includes('TEST-A'));
    console.log("TEST-B:", allText.includes('TEST-B'));
    console.log("TEST-C:", allText.includes('TEST-C'));
    console.log("666 000 FCFA:", allText.includes('666 000 FCFA'));
    console.log("Aucune ligne saisie (0 occ):", !allText.toLowerCase().includes('aucune ligne saisie'));
    console.log("régime normal (0 occ):", !allText.toLowerCase().includes('régime normal'));
    console.log("mercuriale (0 occ):", !allText.toLowerCase().includes('mercuriale'));
} catch (e) {
    console.error("TEST 1 ERROR:", e);
}

try {
    const data2 = { devis_lines: [] };
    renderAudit(doc, data2, null, '25/09/2026');
    console.log("TEST 2 ERROR: PDF was generated but shouldn't have been!");
} catch (e) {
    console.log("=== TEST PASS 2 ===");
    console.log("Blocked 0 lines properly. Message:", e.message);
}
