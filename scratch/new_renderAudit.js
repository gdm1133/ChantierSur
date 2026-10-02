function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);

    // -- Extraction des données du client --
    const clientName = (data.client_name || "Maitre d'Ouvrage").trim();
    const rawPrefix  = (data.phone_prefix || '+221').trim();
    let   rawPhone   = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = ${rawPrefix} ;

    // -- Entreprise --
    const companyName    = data.company_name    || 'Entreprise Non Identifiée';
    const companyNinea   = data.company_ninea   || '';
    const companyRccm    = data.company_rccm    || '';
    const companyPhone2  = data.company_phone   || '';
    const companyAddress = data.company_address || '';

    // -- Projet & devis --
    const devisObjet      = data.devis_objet      || 'Non précisé';
    const devisNumber     = data.devis_number     || 'Non précisé';
    const devisDate       = data.devis_date       || currentDate;
    const buildingUsage   = data.building_usage   || 'unifamilial';
    const projectLocation = data.project_location || 'Dakar - Zone Urbaine';
    const sdp             = parseFloat(data.surface)      || 0;
    const levels          = parseInt(data.exact_levels || '1', 10);

    // -- Lignes du devis --
    let rawLines = data.devis_lines || [];
    if (typeof rawLines === 'string') {
        try { rawLines = JSON.parse(rawLines); } catch (e) { rawLines = []; }
    }

    // -- Conditions contractuelles --
    const tvaApplicable   = data.tva_applicable   || 'oui';
    const totalHtIndique  = parseFloat(data.total_ht_indique)  || 0;
    const totalTtcIndique = parseFloat(data.total_ttc_indique) || 0;
    const prixFerme       = data.prix_ferme       || 'non_precise';
    const validiteDevis   = data.validite_devis   || 'Non précisée';
    const delaiExecution  = data.delai_execution  || 'Non précisé';
    const acomptePct      = parseFloat(data.acompte_pct)      || 0;
    const echeancier      = data.echeancier       || 'non_precise';
    const retenueGarantie = parseFloat(data.retenue_garantie) || 0;
    const penalites       = data.penalites        || 'non_precise';
    const avenants        = data.avenants         || 'non_precise';
    const assurances      = data.assurances       || 'non_precise';
    const montantLettres  = data.montant_lettres  || 'non';

    // -- Calculs globaux --
    let totalHtCalcule = 0;
    const computedLines = rawLines.map(line => {
        const unite = line.unite || '';
        const designation = line.designation || '';
        const lot = line.lot || '';
        let quantite = parseFloat(line.quantite) || 0;
        let pu = parseFloat(line.pu) || 0;
        let montant = parseFloat(line.montant) || 0;

        if (unite === 'forfait' || unite.toLowerCase() === 'ff' || unite.toLowerCase() === 'ens' || quantite === 0 || pu === 0) {
            totalHtCalcule += montant;
            return { lot, designation, unite, quantite: '-', pu: '-', montant, status: 'forfait' };
        } else {
            const rowTotal = Math.round(quantite * pu);
            totalHtCalcule += rowTotal;
            return { lot, designation, unite, quantite, pu, montant: rowTotal, status: 'normal' };
        }
    });

    const tvaPct          = 0.18;
    const tvaCalculee     = tvaApplicable === 'oui' ? Math.round(totalHtCalcule * tvaPct) : 0;
    const totalTtcCalcule = totalHtCalcule + tvaCalculee;

    const fmt = (n) => n.toLocaleString('fr-FR');

    let y = 15;
    const leftMargin = 15;
    const rightMargin = 15;
    const pageWidth = 210;
    const usableWidth = pageWidth - leftMargin - rightMargin;

    // -- Helper : nouvelle page --
    const addPage = () => {
        doc.addPage();
        y = 20;
    };

    // -- En-tête cartouche --
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 19, 37);
    doc.text('ChantierSur.com', leftMargin, y);
    doc.setFont('NotoSans', 'normal');
    doc.text(Dossier :   |  Date : , pageWidth - rightMargin, y, { align: 'right' });
    y += 6;
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT  •  AUDIT TECHNIQUE BTP • SÉNÉGAL", leftMargin, y);
    y += 5;
    doc.setTextColor(100, 100, 100);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.text(Maître d'Ouvrage :   •  Tél : , leftMargin, y);

    // -- Titre principal --
    y += 12;
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(11, 19, 37);
    doc.text('RAPPORT D\'AUDIT TECHNIQUE DE DEVIS BTP', leftMargin, y);
    y += 7;

    doc.setFont('NotoSans', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Outil d'aide à la décision. Analyse automatisée indicative sans valeur d'expertise judiciaire.", leftMargin, y);
    doc.text("Document confidentiel, usage exclusif du destinataire désigné.", leftMargin, y + 4);
    y += 10;

    // -- Bandeau confidentialité --
    const drawConfidentialBanner = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, y, usableWidth, 9, 'F');
        doc.setFont('NotoSans', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL  •  MAÎTRE D'OUVRAGE :   •  TÉL : , leftMargin + 2, y + 6);
        y += 14;
    };

    // -- Helper tableaux --
    const drawTable = (head, body, colStyles) => {
        doc.autoTable({
            startY: y,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 8.5 },
            bodyStyles: { font: 'NotoSans', fontSize: 8.5, textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 3.5, overflow: 'linebreak' },
            columnStyles: colStyles || {
                0: { fontStyle: 'bold', cellWidth: 52 },
                1: { cellWidth: 65 },
                2: { cellWidth: 63 }
            },
            margin: { left: leftMargin, right: rightMargin }
        });
        y = doc.lastAutoTable.finalY + 10;
    };

    // -----------------------------------------------------------
    // PARTIE I - Identification du devis & de l'entreprise
    // -----------------------------------------------------------
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie I • Identification du devis & de l\'entreprise', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('I. Devis analysé', leftMargin, y);
    y += 3;
    drawTable(
        [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Objet du devis', devisObjet, 'Cadre principal de l\'analyse'],
            ['Date & Référence', ${devisDate}  /  N° , 'Traçabilité documentaire'],
            ['Bâtiment & Gabarit', ${buildingUsage} • R+, Base de calcul pour les ratios (SDP indiquée :  m²)],
            ['Localisation du projet', projectLocation, 'Influence sur le coût des matériaux et de la main-d\'œuvre']
        ]
    );

    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('II. Entreprise & existence légale', leftMargin, y);
    y += 3;
    const rccmStatus  = companyRccm  ? 'Renseigné (à vérifier au RCCM Sénégal).' : 'Non renseigné — à exiger avant signature.';
    const nineaStatus = companyNinea ? 'Renseigné (à vérifier sur le portail DGID).' : 'Absent — signale une entreprise potentiellement non immatriculée.';
    drawTable(
        [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Nom de l\'entreprise', companyName, 'Identité commerciale déclarée'],
            ['NINEA (Identifiant fiscal)', companyNinea || 'Non fourni', nineaStatus],
            ['RCCM (Registre Commerce)', companyRccm || 'Non fourni', rccmStatus],
            ['Téléphone / Adresse', ${companyPhone2}  •  , 'Vérification de l\'ancrage physique']
        ]
    );

    // -----------------------------------------------------------
    // PARTIE II - Contrôle arithmétique et analyse des écarts
    // -----------------------------------------------------------
    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie II • Contrôle arithmétique et analyse des écarts', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('III. Analyse des prix et calcul exact ligne par ligne', leftMargin, y);
    y += 3;

    let nbEcarts = 0;
    const lignesBody = computedLines.map(l => {
        if (l.status === 'forfait') {
            return [l.designation, 'Forfait', '-', '-', ${fmt(l.montant)} FCFA, 'Vigilance: Exiger Q x PU'];
        }
        const diffLigne = l.montant - (Math.round(l.quantite * l.pu));
        if (Math.abs(diffLigne) > 5) nbEcarts++;
        const ecartStr = Math.abs(diffLigne) <= 5 ? 'Exact' : (diffLigne > 0 ? + : ${fmt(diffLigne)});
        return [l.designation, ${l.quantite} , ${fmt(l.pu)}, ${fmt(l.montant)}, ${fmt(l.quantite * l.pu)}, ecartStr];
    });

    doc.autoTable({
        startY: y,
        head: [['Désignation', 'Qté', 'PU (FCFA)', 'Montant Déclaré', 'Montant Calculé', 'Écart détecté']],
        body: lignesBody.length > 0 ? lignesBody : [['-', 'Aucune ligne saisie', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { font: 'NotoSans', fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 20 },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [11, 19, 37] },
            5: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [192, 57, 43] }
        },
        margin: { left: leftMargin, right: rightMargin }
    });
    y = doc.lastAutoTable.finalY + 10;

    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('IV. Écarts détectés et Mesures à prendre', leftMargin, y);
    y += 3;

    const diffHt  = totalHtIndique  > 0 ? (totalHtIndique  - totalHtCalcule)  : 0;
    const diffTtc = totalTtcIndique > 0 ? (totalTtcIndique - totalTtcCalcule) : 0;
    
    let mesures = "Tout est conforme mathématiquement.";
    if (nbEcarts > 0 || diffHt !== 0 || diffTtc !== 0) {
        mesures = "Action immédiate : Demander un devis corrigé à l'entreprise avant toute signature. Le devis contient des erreurs de calcul en votre défaveur ou en faveur de l'entrepreneur.";
    }

    drawTable(
        [['Indicateur', 'Constat', 'Mesure à prendre']],
        [
            ['Erreurs lignes', ${nbEcarts} ligne(s) avec erreurs arithmétiques, nbEcarts > 0 ? 'Faire corriger le devis.' : 'Calculs unitaires justes.'],
            ['Total HT', Déclaré:  / Réel: , diffHt !== 0 ? Écart de  FCFA. : 'Total HT conforme.'],
            ['Total TTC', Déclaré:  / Réel: , diffTtc !== 0 ? Écart de  FCFA. : 'Total TTC conforme.'],
            ['Bilan', 'Analyse globale des erreurs', mesures]
        ]
    );

    // -----------------------------------------------------------
    // PARTIE III - Analyse contractuelle & recommandations
    // -----------------------------------------------------------
    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie III • Analyse contractuelle & Recommandations', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('V. Clauses contractuelles & Points de vigilance', leftMargin, y);
    y += 3;

    const contractRows = [
        ['Prix', prixFerme === 'ferme' ? 'Prix ferme' : 'Non précisé/Révisable', prixFerme === 'ferme' ? 'Sécurisant.' : 'Exiger un prix ferme pour éviter les surcoûts.'],
        ['Délai', delaiExecution, 'Adosser impérativement le démarrage à la signature ou réception de l\'acompte.'],
        ['Acompte', ${acomptePct} %, acomptePct >= 30 ? 'Acompte élevé à négocier.' : (acomptePct > 0 ? 'Standard.' : 'Non précisé.')],
        ['Paiements', echeancier === 'oui' ? 'Adossé à l\'avancement' : 'Non adossé', echeancier === 'oui' ? 'Conforme.' : 'Payer UNIQUEMENT à l\'avancement réel.'],
        ['Retenue', ${retenueGarantie} %, retenueGarantie >= 5 ? 'Protecteur.' : 'Recommandation : imposer 5% de retenue de garantie.'],
        ['Pénalités', penalites === 'oui' ? 'Prévues' : 'Non prévues', penalites === 'oui' ? 'Encourage le respect du délai.' : 'Fixer des pénalités journalières en cas de retard.']
    ];

    drawTable(
        [['Clause', 'Constat', 'Recommandation']],
        contractRows,
        {
            0: { cellWidth: 44, fontStyle: 'bold' },
            1: { cellWidth: 36 },
            2: { cellWidth: 100 }
        }
    );

    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('VI. Recommandations Finales (Synthèse)', leftMargin, y);
    y += 6;

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    
    let recommandationFinale = "À NE PAS SIGNER EN L'ÉTAT";
    if (nbEcarts === 0 && diffHt === 0 && diffTtc === 0) {
        if (acomptePct <= 30 && echeancier === 'oui' && retenueGarantie >= 5) {
            recommandationFinale = "FAVORABLE À LA SIGNATURE";
        } else {
            recommandationFinale = "À RENÉGOCIER (Clauses contractuelles)";
        }
    }

    const synthLines = [
        VERDICT : ,
        '',
        'Actions prioritaires :',
        nbEcarts > 0 ? '1. Exiger la correction des erreurs de calcul sur les lignes du devis.' : '1. Calculs conformes.',
        '2. Exiger le détail Q × PU pour tous les postes facturés "au forfait".',
        '3. Ne jamais payer d\'acompte sans un calendrier de paiement lié à l\'avancement physique.',
        '4. Imposer une retenue de garantie de 5% pour vous protéger contre les malfaçons.'
    ];
    
    synthLines.forEach((line, index) => {
        if (y > 275) addPage();
        if (index === 0) {
            doc.setFont('NotoSans', 'bold');
            doc.setTextColor(recommandationFinale.includes("FAVORABLE") ? 39 : 192, recommandationFinale.includes("FAVORABLE") ? 174 : 57, recommandationFinale.includes("FAVORABLE") ? 96 : 43);
        } else {
            doc.setFont('NotoSans', 'normal');
            doc.setTextColor(51, 65, 85);
        }
        if (line === '') { y += 4; return; }
        doc.text(line, leftMargin + (line.startsWith(' ') ? 4 : 0), y);
        y += 5.5;
    });
    y += 8;

    // -- Cadre de clôture confidentiel --
    if (y > 255) addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(leftMargin, y, usableWidth, 24, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(leftMargin, y, usableWidth, 24, 'D');
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(11, 19, 37);
    doc.text('DOCUMENT GÉNÉRÉ AUTOMATIQUEMENT PAR CHANTIERSUR.COM', leftMargin + 5, y + 6);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(Référence du dossier :   |  Émis le : , leftMargin + 5, y + 12);
    doc.text(Destinataire exclusif :   •  Usage strictement personnel et confidentiel., leftMargin + 5, y + 18);
}
