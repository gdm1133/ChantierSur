// Replacement for renderAudit in pdf-generator.js
function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);

    const clientName = (data.client_name || "Maitre d'Ouvrage").trim();
    const rawPrefix  = (data.phone_prefix || '+221').trim();
    let   rawPhone   = (data.client_phone || '').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const clientEmail = (data.client_email || 'Non précisé').trim();
    const clientCity = (data.client_city || 'Sénégal').trim();
    const projectType = (data.project_type || 'Construction Bâtiment').trim();
    const levels = parseInt(data.exact_levels || '1', 10);
    const tvaRate = parseFloat(data.tva_rate || '18') / 100;

    // Conditions contractuelles
    const acompte = data.acompte || 'Non précisé';
    const echeancier = data.echeancier || 'Non précisé';
    const retenue = data.retenue || 'Non précisé';
    const penalites = data.penalites || 'Non précisé';
    const avenants = data.avenants || 'Non précisé';
    const assurances = data.assurances || 'Non précisé';

    // Parsing the devis lines from state
    let lines = window.devisLinesState || data.devis_lines || [];
    if (typeof lines === 'string') {
        try { lines = JSON.parse(lines); } catch (e) { lines = []; }
    }

    let totalHT = 0;
    const tableData = [];
    lines.forEach((line) => {
        const designation = line.designation || 'Lot sans nom';
        const montant = parseFloat(line.montant_indique) || 0;
        if (designation && montant >= 0) {
            totalHT += montant;
            tableData.push([
                designation, 
                'Forfait',
                '-',
                '-',
                formatFCFA(montant)
            ]);
        }
    });

    const totalTVA = totalHT * tvaRate;
    const totalTTC = totalHT + totalTVA;

    let y = 15;
    const addPage = () => {
        doc.addPage();
        y = 15;
    };

    // ----- PAGE 1 : IDENTIFICATION ET SOMMAIRE -----
    drawUnifiedHeader(doc, "AUDIT TECHNIQUE ET Conformité StructurelleDEVIS", "Partie 1 - Informations et Synthèse Globale", refDoc, currentDate, clientName, clientPhone, "AUDIT", "audit");
    y = 50;

    drawSectionTitle(doc, y, "1. IDENTIFICATION DU PROJET ET DU MAÎTRE D'OUVRAGE");
    y += 8;

    doc.autoTable(createTableOptions(y, 
        [['Élément', 'Information Déclarée']],
        [
            ['Maître d\'Ouvrage', clientName],
            ['Contact (Tél / Email)', `${clientPhone} / ${clientEmail}`],
            ['Lieu du Projet', clientCity],
            ['Type de Projet', `${projectType} (R+${levels})`]
        ]
    ));
    y = doc.lastAutoTable.finalY + 12;

    drawSectionTitle(doc, y, "2. SYNTHÈSE FINANCIÈRE DU DEVIS SOUMIS");
    y += 8;

    doc.autoTable(createTableOptions(y, 
        [['Rubrique', 'Montant Évalué (FCFA)']],
        [
            ['Total Hors Taxes (HT)', formatFCFA(totalHT)],
            [`TVA Applicable (${formatPercent(tvaRate)})`, formatFCFA(totalTVA)],
            ['Montant Total Toutes Taxes Comprises (TTC)', formatFCFA(totalTTC)]
        ]
    ));
    y = doc.lastAutoTable.finalY + 12;

    drawSectionTitle(doc, y, "3. AVIS TECHNIQUE ET CLAUSES CONTRACTUELLES");
    y += 8;

    doc.autoTable(createTableOptions(y, 
        [['Clause Contractuelle', 'Condition Spécifiée']],
        [
            ['Acompte au Démarrage', acompte],
            ['Échéancier de Paiement', echeancier],
            ['Retenue de Garantie (Recommandé: 5%)', retenue],
            ['Pénalités de Retard', penalites],
            ['Gestion des Avenants', avenants],
            ['Assurances (Décennale, etc.)', assurances]
        ]
    ));

    // ----- PAGE 2 : DÉTAIL DES LOTS ET VÉRIFICATION -----
    addPage();
    drawUnifiedHeader(doc, "AUDIT TECHNIQUE ET Conformité StructurelleDEVIS", "Partie 2 - Détail Analytique du Devis", refDoc, currentDate, clientName, clientPhone, "AUDIT", "audit");
    y = 50;

    drawSectionTitle(doc, y, "4. VÉRIFICATION DÉTAILLÉE LIGNE PAR LIGNE");
    y += 8;
    
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("L'analyse ci-dessous reprend les lots extraits de votre devis pour validation arithmétique.", MARGIN_LEFT, y);
    y += 5;

    doc.autoTable(createTableOptions(y, 
        [['Désignation du Lot', 'Unité', 'Quantité', 'PU HT (FCFA)', 'Montant HT (FCFA)']],
        tableData
    ));
    y = doc.lastAutoTable.finalY + 15;

    // ----- PAGE 3 : MéthodologieET RECOMMANDATIONS -----
    addPage();
    drawUnifiedHeader(doc, "AUDIT TECHNIQUE ET Conformité StructurelleDEVIS", "Partie 3 - Méthodologieet Cadre Légal (Sénégal)", refDoc, currentDate, clientName, clientPhone, "AUDIT", "audit");
    y = 50;

    drawSectionTitle(doc, y, "5. MéthodologieD'AUDIT");
    y += 10;
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const methodText = "L'audit de devis ChantierSur repose sur une analyse croisée des coûts déclarés avec notre base de données des prix de la construction au Sénégal (actualisée en continu). Nous vérifions la cohérence arithmétique, l'exhaustivité des lots obligatoires pour le type de bâtiment, et l'adéquation des clauses contractuelles pour protéger le Maître d'Ouvrage.";
    doc.text(doc.splitTextToSize(methodText, USABLE_WIDTH), MARGIN_LEFT, y);
    y += 25;

    drawSectionTitle(doc, y, "6. RECOMMANDATIONS LÉGALES ET TECHNIQUES (SÉNÉGAL)");
    y += 10;

    // Recommandations Bullet Points
    const recommandations = [
        "Permis de Construire : En vertu de la Loi n° 2023-20 du 29 décembre 2023 (Code de l'urbanisme du Sénégal), tout projet de construction, d'agrandissement ou de modification nécessite l'obtention préalable d'une autorisation de construire. Ne démarrez aucun chantier sans ce document.",
        "Bureau de Contrôle & Architecte : Pour les bâtiments de type R+2 et supérieur, ou recevant du public, le recours à un Architecte inscrit à l'Ordre et à un Bureau de Contrôle Technique est obligatoire.",
        "Étude de Sol (Géotechnique) : Fortement recommandée pour tout bâtiment, elle devient incontournable pour les ouvrages à étages (R+1 et plus) afin de garantir des fondations sécurisées et d'éviter les affaissements différentiels très fréquents au Sénégal.",
        "Assurance Décennale : Exigez que l'entreprise de construction fournisse une attestation d'assurance responsabilité civile décennale valide, vous protégeant contre les vices cachés menaçant la solidité de l'ouvrage sur 10 ans (cf. Article 741 du Code des Obligations Civiles et Commerciales du Sénégal).",
        "Retenue de Garantie : Conservez contractuellement une retenue de garantie (généralement 5% du montant) pendant une durée de 1 an après la réception des travaux, payable uniquement à la levée de toutes les réserves parfaites."
    ];

    recommandations.forEach((rec) => {
        doc.setFillColor(COLOR_AMBER[0], COLOR_AMBER[1], COLOR_AMBER[2]);
        doc.circle(MARGIN_LEFT + 2, y - 1, 1.5, 'F');
        const lines = doc.splitTextToSize(rec, USABLE_WIDTH - 8);
        doc.text(lines, MARGIN_LEFT + 6, y);
        y += (lines.length * 4.5) + 3;
    });

    y += 15;
    drawSectionTitle(doc, y, "7. AVIS DE CONCLUSION");
    y += 10;
    const conclusion = "Ce rapport met en évidence les points de vigilance majeurs pour la sécurisation de votre projet. Nous vous invitons à clarifier toutes les zones d'ombre (échéanciers non définis, assurances manquantes) avec votre prestataire avant la signature du marché de travaux. N'hésitez pas à mandater un Bureau d'Études Technique agréé pour une contre-expertise terrain.";
    doc.text(doc.splitTextToSize(conclusion, USABLE_WIDTH), MARGIN_LEFT, y);

    // Signature
    y += 30;
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text("L'Équipe ChantierSur.com", PAGE_WIDTH - MARGIN_RIGHT - 50, y);
}

