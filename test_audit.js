const fs = require('fs');

// Mock jsPDF
class jsPDF {
    constructor() {
        this.texts = [];
        this.lastAutoTable = { finalY: 0 };
    }
    addPage() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    text(txt) {
        if (typeof txt === 'string') this.texts.push(txt);
        else if (Array.isArray(txt)) this.texts.push(txt.join(' '));
    }
    setFillColor() {}
    rect() {}
    roundedRect() {}
    setDrawColor() {}
    autoTable(opts) {
        if (opts.body) {
            opts.body.forEach(row => {
                row.forEach(cell => this.texts.push(cell));
            });
        }
        this.lastAutoTable.finalY += 50;
    }
    splitTextToSize(txt) { return txt; }
    getFontList() { return { 'NotoSans': true }; }
}

global.window = {
    NOTO_SANS_REGULAR: 'base64',
    NOTO_SANS_BOLD: 'base64',
    jspdf: { jsPDF }
};

// Load pdf-generator.js
const code = fs.readFileSync('pdf-generator.js', 'utf8');
eval(code);

function runTests() {
    let passed = 0;
    let failed = 0;

    function assertPass(name, condition, details) {
        if (condition) {
            console.log(`[PASS] ${name}`);
            passed++;
        } else {
            console.log(`[FAIL] ${name} - ${details}`);
            failed++;
        }
    }

    // ── TEST 1 & 2 ──
    const doc1 = new jsPDF();
    const data1 = {
        devis_lines: [],
        total_ht_indique: 1128991800,
        tva_applicable: 'oui'
    };
    for (let i=0; i<27; i++) data1.devis_lines.push({ lot: 'Lot 1', des: 'Item', u: 'u', q: 1, pu: 100000, total: 100000 });
    // Ligne 2.8 Ecart
    data1.devis_lines.push({ lot: 'Lot 2', des: 'Enduits intérieurs', u: 'm2', q: 9500, pu: 4800, total: 46500000 }); // total = 46.5M instead of 45.6M

    let t1Ht = 27 * 100000 + 9500 * 4800; // 2.7M + 45.6M = 48.3M
    // wait, the prompt says "total HT exactly 1 128 991 800 FCFA" 
    // I need to adjust the dummy lines so the calculated HT equals exactly 1 128 991 800.
    // Ligne 2.8 calculates to 45 600 000.
    // Remaining HT = 1 128 991 800 - 45 600 000 = 1 083 391 800.
    data1.devis_lines = [];
    for (let i=0; i<27; i++) {
        let amt = i === 0 ? 1083391800 : 0;
        data1.devis_lines.push({ lot: `Lot ${(i % 7)+1}`, des: `Item ${i}`, u: 'u', q: 1, pu: amt, total: amt });
    }
    data1.devis_lines.push({ lot: 'Lot 2', des: 'Enduits intérieurs', u: 'm2', q: 9500, pu: 4800, total: 46500000 });

    try {
        window.renderAudit(doc1, data1, 'TEST', '2026-09-25');
        const textDump = doc1.texts.join(' ');
        
        // T1
        assertPass("Test 1 - Intégrité du devis complet", 
            textDump.includes("1 128 991 800 FCFA") && textDump.includes("203 218 524 FCFA") && textDump.includes("1 332 210 324 FCFA"),
            "Valeurs HT, TVA, TTC non trouvées"
        );
        // T2
        assertPass("Test 2 - Détection de l'écart de la ligne 2.8",
            textDump.includes("Enduits intérieurs") && textDump.includes("45 600 000 FCFA") && textDump.includes("46 500 000 FCFA") && textDump.includes("900 000 FCFA"),
            "Ecart ligne 2.8 non signalé explicitement"
        );
        
        // T3
        const lowerDump = textDump.toLowerCase();
        const hasInterdits = lowerDump.includes("bael") || lowerDump.includes("visa") || lowerDump.includes("certifié") || lowerDump.includes("100 % conforme") || lowerDump.includes("contre-expertise");
        assertPass("Test 3 - Absence des termes interdits", !hasInterdits, "Termes interdits trouvés");

        // T4
        const hasEncodingErrors = textDump.includes("Ã") || textDump.includes("Â");
        assertPass("Test 4 - UTF-8 et caractères français", !hasEncodingErrors && textDump.includes("Échéancier de paiement") && textDump.includes("coût") && textDump.includes("œuvre"), "Erreur d'encodage ou manquants");
        
    } catch (e) {
        console.error(e);
        assertPass("Test 1-4", false, e.message);
    }

    // ── TEST 5 ──
    const doc5 = new jsPDF();
    try {
        window.renderAudit(doc5, { devis_lines: [] }, 'TEST', '2026-09-25');
        assertPass("Test 5 - Dossier vide bloqué", false, "Le PDF a été généré sans erreur");
    } catch (e) {
        assertPass("Test 5 - Dossier vide bloqué", e.message.includes("Aucune ligne de devis validée"), "Erreur inattendue: " + e.message);
    }

    // ── TEST 6 ──
    const doc6 = new jsPDF();
    const data6 = {
        devis_lines: [{ lot: '1', des: 'TracabiliteTest', u: 'u', q: 1, pu: 1000, total: 1000 }],
        prix_ferme: 'ferme',
        validite_devis: '3 mois',
        delai_execution: '12 mois',
        acompte_pct: '35',
        echeancier: 'oui',
        retenue_garantie: '5',
        penalites: 'oui',
        avenants: 'ecrit_exige',
        assurances: 'oui',
        montant_lettres: 'oui'
    };
    try {
        window.renderAudit(doc6, data6, 'TEST', '2026-09-25');
        const t6 = doc6.texts.join(' ');
        assertPass("Test 6 - Traçabilité de chaque champ", t6.includes("TracabiliteTest") && t6.includes("3 mois") && t6.includes("12 mois"), "Champs manquants");
    } catch (e) {
        assertPass("Test 6 - Traçabilité de chaque champ", false, e.message);
    }

    console.log(`\nResults: ${passed} PASS, ${failed} FAIL`);
}
runTests();
