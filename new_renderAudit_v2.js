function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);

    // Extraction des données du client
    const clientName = (data.client_name || 'Maitre d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = ${rawPrefix} ;

    // Données de l'entreprise
    const companyName = data.company_name || 'Entreprise Non Identifiée';
    const companyNinea = data.company_ninea || '';
    const companyRccm = data.company_rccm || '';
    const companyPhone = data.company_phone || '';
    const companyAddress = data.company_address || '';

    // Données du projet
    const devisObjet = data.devis_objet || 'Non précisé';
    const devisNumber = data.devis_number || 'Non précisé';
    const devisDate = data.devis_date || currentDate;
    const buildingUsage = data.building_usage || 'unifamilial';
    const projectLocation = data.project_location || 'Dakar - Zone Urbaine';
    const sdp = parseFloat(data.surface) || 0;
    const levels = parseInt(data.exact_levels, 10) || 1;

    // Lignes du devis
    let rawLines = data.devis_lines || [];
    if (typeof rawLines === 'string') {
        try { rawLines = JSON.parse(rawLines); } catch (e) { rawLines = []; }
    }
    
    // Conditions contractuelles
    const tvaApplicable = data.tva_applicable || 'oui';
    const totalHtIndique = parseFloat(data.total_ht_indique) || 0;
    const totalTtcIndique = parseFloat(data.total_ttc_indique) || 0;
    const prixFerme = data.prix_ferme || 'non_precise';
    const validiteDevis = data.validite_devis || 'Non précisée';
    const delaiExecution = data.delai_execution || 'Non précisé';
    const acomptePct = parseFloat(data.acompte_pct) || 0;
    const echeancier = data.echeancier || 'non_precise';
    const retenueGarantie = parseFloat(data.retenue_garantie) || 0;
    const penalites = data.penalites || 'non_precise';
    const avenants = data.avenants || 'non_precise';
    const assurances = data.assurances || 'non_precise';
    const montantLettres = data.montant_lettres || 'non';

    // Calculs globaux
    let totalHtCalcule = 0;
    const computedLines = rawLines.map(line => {
        const u = line.u || '';
        const des = line.des || '';
        const nat = line.nat || 'Fourniture et pose';
        const lot = line.lot || '';
        
        let q = parseFloat(line.q) || 0;
        let pu = parseFloat(line.pu) || 0;
        let total = parseFloat(line.total) || 0;

        if (u === 'forfait') {
            totalHtCalcule += total;
            return { lot, des, nat, u, q: '-', pu: '-', total, status: 'forfait' };
        } else {
            const rowTotal = Math.round(q * pu);
            totalHtCalcule += rowTotal;
            return { lot, des, nat, u, q, pu, total: rowTotal, status: 'normal' };
        }
    });

    const tvaPct = 0.18;
    const tvaCalculee = tvaApplicable === 'oui' ? Math.round(totalHtCalcule * tvaPct) : 0;
    const totalTtcCalcule = totalHtCalcule + tvaCalculee;

    let y = 15;
    const leftMargin = 15;
    const pageWidth = 210;

    // Helper: Add page with footer
    const addPage = () => {
        const pageNum = doc.internal.getNumberOfPages();
        doc.setFont('NotoSans', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(ChantierSur.com • Bureau d'Études Numérique Indépendant • Dakar, République du Sénégal. Page \ sur {total_pages_count_string}, pageWidth / 2, 287, { align: 'center' });
        doc.addPage();
        y = 20;
    };

    // Cartouche haut de page
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 19, 37);
    doc.text('ChantierSur.com', leftMargin, y);
    doc.setFont('NotoSans', 'normal');
    doc.text(Dossier : \ • Date : \, pageWidth - leftMargin, y, { align: 'right' });
    y += 6;
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text("BUREAU D'ÉTUDES NUMÉRIQUE • AUDIT TECHNIQUE BTP SÉNÉGAL", leftMargin, y);
    y += 6;
    doc.setTextColor(100, 100, 100);
    doc.setFont('NotoSans', 'normal');
    doc.text(Titulaire : \, leftMargin, y);
    
    // Titre
    y += 12;
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(11, 19, 37);
    doc.text('## RAPPORT D\'AUDIT DE DEVIS', leftMargin, y);
    y += 8;
    
    // Disclaimer
    doc.setFont('NotoSans', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Outil numérique d\'aide à la décision. Analyse automatisée indicative (sans valeur d\'expertise judiciaire).', leftMargin, y);
    y += 10;

    const drawConfidentialBanner = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, y, pageWidth - 30, 10, 'F');
        doc.setFont('NotoSans', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL — MAÎTRE D'OUVRAGE : \ • TÉL : \, leftMargin + 2, y + 6);
        y += 15;
    };

    const drawTable = (head, body) => {
        doc.autoTable({
            startY: y,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { font: 'NotoSans', fontSize: 9, textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 4 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                1: { cellWidth: 65 },
                2: { cellWidth: 65 }
            },
            margin: { left: leftMargin, right: 15 }
        });
        y = doc.lastAutoTable.finalY + 12;
    };

    // PARTIE I
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie I : Identification du devis & de l\'entreprise', leftMargin, y);
    y += 6;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text('I. Devis analysé', leftMargin, y);
    y += 4;
    drawTable(
        [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Objet', devisObjet, 'Cadre principal de l\'analyse'],
            ['Date & Référence', \ / N° \, 'Traçabilité documentaire'],
            ['Bâtiment & Gabarit', \ (Niveaux: R+\), Base de calcul pour les ratios (SDP: \ m²)],
            ['Localisation', projectLocation, 'Influence sur le coût des matériaux']
        ]
    );

    doc.text('II. Entreprise & existence légale', leftMargin, y);
    y += 4;
    let rccmStatus = companyRccm ? 'Renseigné' : 'Non renseigné';
    let nineaStatus = companyNinea ? 'Renseigné' : 'Drapeau : Entreprise non identifiée. Existence légale à vérifier.';
    drawTable(
        [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Nom Entreprise', companyName, 'Identité commerciale'],
            ['NINEA', companyNinea || 'N/A', nineaStatus],
            ['RCCM', companyRccm || 'N/A', rccmStatus],
            ['Téléphone / Adresse', \ / \, 'Vérification de l\'ancrage physique']
        ]
    );

    // PARTIE II
    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie II : Contrôle arithmétique du devis', leftMargin, y);
    y += 6;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text('III. Vérification arithmétique ligne par ligne', leftMargin, y);
    y += 4;
    
    const lignesBody = computedLines.map(l => {
        if (l.status === 'forfait') {
            return [l.des, 'Forfait', 'Demander le détail du forfait'];
        }
        return [l.des, \ \ x \ FCFA, = \ FCFA calculé];
    });

    doc.autoTable({
        startY: y,
        head: [['Désignation', 'Détail (Qté x PU)', 'Montant Calculé']],
        body: lignesBody,
        theme: 'grid',
        headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { font: 'NotoSans', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 3 },
        margin: { left: leftMargin, right: 15 }
    });
    y = doc.lastAutoTable.finalY + 12;

    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text('IV. Cohérence des totaux HT, TVA, TTC', leftMargin, y);
    y += 4;
    
    const diffHt = totalHtIndique > 0 ? (totalHtIndique - totalHtCalcule) : 0;
    const diffHtStr = diffHt !== 0 ? Écart de \ FCFA : 'Conforme aux calculs';

    const diffTtc = totalTtcIndique > 0 ? (totalTtcIndique - totalTtcCalcule) : 0;
    const diffTtcStr = diffTtc !== 0 ? Écart de \ FCFA : 'Conforme aux calculs';

    drawTable(
        [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Total HT (Indiqué vs Calculé)', Ind: \ / Calc: \, diffHtStr],
            ['TVA Applicable', tvaApplicable === 'oui' ? '18%' : 'Non (0%)', tvaApplicable === 'oui' ? Calc: \ FCFA : 'Vérifier l\'exonération'],
            ['Total TTC (Indiqué vs Calculé)', Ind: \ / Calc: \, diffTtcStr]
        ]
    );

    // PARTIE III
    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie III : Analyse des prix & des quantités', leftMargin, y);
    y += 6;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text('V. Comparaison des prix aux références & VI. Plausibilité', leftMargin, y);
    y += 4;
    
    const analysePrixBody = computedLines.map(l => {
        if (l.status === 'forfait') {
            return [l.des, 'Montant Forfaitaire', 'Non vérifiable en l\'état — demander le détail'];
        }
        return [l.des, PU: \ FCFA, 'Comparaison indicative (Dakar 2026). Estimations indicatives de prédimensionnement — ce n\'est pas un métré.'];
    });
    
    doc.autoTable({
        startY: y,
        head: [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        body: analysePrixBody,
        theme: 'grid',
        headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { font: 'NotoSans', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 3 },
        margin: { left: leftMargin, right: 15 }
    });
    y = doc.lastAutoTable.finalY + 12;

    // PARTIE IV
    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie IV : Analyse contractuelle & recommandations', leftMargin, y);
    y += 6;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text('VII. Conditions contractuelles & VIII. Drapeaux rouges', leftMargin, y);
    y += 4;

    const contractRows = [];
    contractRows.push(['Prix (Ferme / Révisable)', prixFerme, prixFerme === 'ferme' ? 'Sécurisant pour le client' : 'Exiger un indice clair si révisable.']);
    contractRows.push(['Validité', validiteDevis, 'Vérifier la période de validité des prix matériaux.']);
    contractRows.push(['Délai d\'exécution', delaiExecution, 'Indispensable d\'adosser le démarrage à la signature ou acompte.']);
    
    let acompteRemarque = 'Standard';
    if (acomptePct >= 30) acompteRemarque = 'Acompte élevé — à négocier et à adosser à des phases d\'avancement vérifiables.';
    contractRows.push(['Acompte demandé', \%, acompteRemarque]);

    contractRows.push(['Échéancier', echeancier === 'oui' ? 'Adossé à l\'avancement' : 'Non adossé à l\'avancement', echeancier === 'oui' ? 'Conforme aux bonnes pratiques' : 'Drapeau : Payer uniquement à l\'avancement réel constaté.']);
    contractRows.push(['Retenue de garantie', \%, retenueGarantie >= 5 ? 'Protecteur pour la levée des réserves.' : 'Il est recommandé de retenir 5% payable à réception sans réserves.']);
    contractRows.push(['Pénalités de retard', penalites === 'oui' ? 'Prévues' : 'Non prévues', penalites === 'oui' ? 'Encourage le respect des délais' : 'Drapeau : Fixer des pénalités journalières en cas de dépassement.']);
    contractRows.push(['Avenants', avenants === 'ecrit_exige' ? 'Écrit exigé' : 'Non précisé', avenants === 'ecrit_exige' ? 'Conforme' : 'Préciser qu\'aucun travail sup. ne sera payé sans accord écrit préalable.']);
    contractRows.push(['Assurances (RC / Décennale)', assurances === 'oui' ? 'Mentionnées' : 'Non mentionnées', assurances === 'oui' ? 'Demander copie de l\'attestation' : 'Risque pour les garanties après réception.']);
    contractRows.push(['Montant en lettres', montantLettres === 'oui' ? 'Présent' : 'Absent', montantLettres === 'oui' ? 'Prévient les fraudes' : 'Remarque : Exiger le montant arrêté en lettres.']);

    drawTable(
        [['Clause', 'Constat', 'Point de vigilance']],
        contractRows
    );

    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text('IX. Recommandations & leviers de négociation', leftMargin, y);
    y += 8;

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.text('1. Ratio global d\'estimation', leftMargin, y);
    y += 5;
    const sdpCalculee = sdp > 0 ? sdp : 150;
    const ratioClient = Math.round(totalHtCalcule / sdpCalculee);
    doc.setFont('NotoSans', 'italic');
    doc.text(   Le devis fait ressortir un ratio global HT de \ FCFA/m² pour une SDP de \ m²., leftMargin, y);
    y += 5;
    doc.text('   À titre indicatif, la fourchette pour ce type de projet à Dakar (2026) varie selon les prestations.', leftMargin, y);
    y += 8;

    doc.setFont('NotoSans', 'normal');
    doc.text('2. Leviers de négociation', leftMargin, y);
    y += 5;
    doc.setFont('NotoSans', 'italic');
    doc.text('   - Exiger le détail chiffré (quantités et prix unitaires) pour tous les "forfaits".', leftMargin, y);
    y += 5;
    doc.text('   - Adosser systématiquement l\'échéancier de paiement à la constatation visuelle de l\'avancement.', leftMargin, y);
    y += 5;
    doc.text('   - Faire consigner par écrit la retenue de garantie (5%) et les pénalités de retard.', leftMargin, y);
    y += 15;

    if (y > 250) addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(leftMargin, y, pageWidth - 30, 25, 'F');
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(11, 19, 37);
    doc.text('DOCUMENT GÉNÉRÉ AUTOMATIQUEMENT PAR CHANTIERSUR.COM', leftMargin + 5, y + 6);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(Référence du dossier : \ | Émis le : \, leftMargin + 5, y + 12);
    doc.text(Destinataire exclusif : \, leftMargin + 5, y + 18);
    
    if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages('{total_pages_count_string}');
    }

    doc.setPage(1);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(ChantierSur.com • Bureau d'Études Numérique Indépendant • Dakar, République du Sénégal. Page 1 sur {total_pages_count_string}, pageWidth / 2, 287, { align: 'center' });
}
