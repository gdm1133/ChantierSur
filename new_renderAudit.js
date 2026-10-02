function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);

    // ── Extraction des données du client ──
    const clientName = (data.client_name || "Maitre d'Ouvrage").trim();
    const rawPrefix  = (data.phone_prefix || '+221').trim();
    let   rawPhone   = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    // ── Entreprise ──
    const companyName    = data.company_name    || 'Entreprise Non Identifiée';
    const companyNinea   = data.company_ninea   || '';
    const companyRccm    = data.company_rccm    || '';
    const companyPhone2  = data.company_phone   || '';
    const companyAddress = data.company_address || '';

    // ── Projet & devis ──
    const devisObjet      = data.devis_objet      || 'Non précisé';
    const devisNumber     = data.devis_number     || 'Non précisé';
    const devisDate       = data.devis_date       || currentDate;
    const buildingUsage   = data.building_usage   || 'unifamilial';
    const projectLocation = data.project_location || 'Dakar - Zone Urbaine';
    const sdp             = parseFloat(data.surface)      || 0;
    const levels          = parseInt(data.exact_levels || '1', 10);

    // ── Lignes du devis ──
    let rawLines = data.devis_lines || [];
    if (typeof rawLines === 'string') {
        try { rawLines = JSON.parse(rawLines); } catch (e) { rawLines = []; }
    }

    if (!Array.isArray(rawLines) || rawLines.length === 0) {
        throw new Error("Aucune ligne de devis validée ou total HT nul. Vérifiez les données avant de générer le rapport.");
    }

    // ── Calculs globaux ──
    let totalHtCalcule = 0;
    const computedLines = rawLines.map(line => {
        const lot = line.lot || '';
        const des = line.designation || line.des || '';
        const nat = line.nat || 'Fourniture et pose';
        const u   = line.unite || line.u || '';
        
        let q   = parseFloat(line.quantite || line.q)   || 0;
        let pu  = parseFloat(line.pu_ht || line.pu)  || 0;
        let mtIndique = parseFloat(line.montant_indique || line.total) || 0;
        
        const rowTotal = Math.round(q * pu);
        totalHtCalcule += rowTotal;

        return { lot, des, nat, u, q, pu, mtIndique, mtCalcule: rowTotal, ecart: mtIndique - rowTotal };
    });

    if (totalHtCalcule === 0) {
        throw new Error("Aucune ligne de devis validée ou total HT nul. Vérifiez les données avant de générer le rapport.");
    }

    // ── Conditions contractuelles ──
    const tvaApplicable   = data.tva_applicable   || 'oui';
    let tvaPct = 0;
    if (tvaApplicable === 'oui') tvaPct = 0.18;
    
    // Le total HT indiqué par l'utilisateur
    const totalHtIndique  = parseFloat(data.total_ht_indique)  || 0;
    const totalTtcIndique = parseFloat(data.total_ttc_indique) || 0;

    const tvaCalculee     = Math.round(totalHtCalcule * tvaPct);
    const totalTtcCalcule = totalHtCalcule + tvaCalculee;

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

    const fmt = (n) => formatNum(n);

    let y = 50;
    
    const drawConfidentialBanner = () => {
        doc.setFillColor(...COLOR_BG_LIGHT);
        doc.rect(MARGIN_LEFT, y, USABLE_WIDTH, 9, 'F');
        doc.setFont(getFontFamily(doc), 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLOR_SLATE);
        doc.text(`DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL  —  MAÎTRE D'OUVRAGE : ${clientName}  •  TÉL : ${clientPhone}`, MARGIN_LEFT + 2, y + 6);
        y += 14;
    };

    // ═══════════════════════════════════════════════════════════
    // PAGE 1 : IDENTIFICATION & CONTRÔLE CONTRACTUEL
    // ═══════════════════════════════════════════════════════════
    drawUnifiedHeader(doc, "RAPPORT D'AUDIT DE DEVIS", "Partie I : Identification du Devis & Analyse Contractuelle", refDoc, currentDate, clientName, clientPhone, "Audit", 'audit');
    y = 50;

    drawSectionTitle(doc, y, "I. IDENTIFICATION DU DEVIS & DE L'ENTREPRISE");
    y += TITLE_AFTER_GAP_MM;
    
    const rccmStatus  = companyRccm  ? 'Renseigné — vérifier la validité au RCCM Sénégal.' : 'Non renseigné — point à faire vérifier par un juriste / professionnel qualifié.';
    const nineaStatus = companyNinea ? 'Renseigné — vérifier l\'activité sur le portail DGID.' : 'Absent — point à faire vérifier par un juriste / professionnel qualifié.';
    
    doc.autoTable(createTableOptions(
        y,
        [['Élément / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Objet du devis', devisObjet, 'Cadre principal de l\'analyse'],
            ['Date & Référence', `${devisDate}  /  N° ${devisNumber}`, 'Traçabilité documentaire'],
            ['Bâtiment & Gabarit', `${buildingUsage} — R+${levels}`, `Base de calcul pour les ratios (SDP : ${sdp} m²)`],
            ['Entreprise / Artisan', companyName, 'Identité commerciale déclarée'],
            ['NINEA (Identifiant fiscal)', companyNinea || 'Non fourni', nineaStatus],
            ['RCCM (Registre Commerce)', companyRccm || 'Non fourni', rccmStatus],
            ['Téléphone / Adresse', `${companyPhone2}  —  ${companyAddress || 'Non précisée'}`, 'Vérification de l\'ancrage physique de l\'entreprise']
        ],
        { 0: { cellWidth: 44, fontStyle: 'bold' }, 1: { cellWidth: 44 }, 2: { cellWidth: 82 } }
    ));
    
    y = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;

    drawSectionTitle(doc, y, "II. COHÉRENCE CONTRACTUELLE");
    y += TITLE_AFTER_GAP_MM;

    const contractRows = [
        ['Prix (Ferme / Révisable)', prixFerme === 'ferme' ? 'Prix ferme' : (prixFerme === 'revisable' ? 'Prix révisable' : 'Non précisé'), prixFerme === 'ferme' ? 'Sécurisant pour le Maître d\'Ouvrage.' : 'Exiger un indice de révision clairement défini.'],
        ['Validité du devis', validiteDevis, 'Vérifier la période de validité des prix matériaux et main-d\'œuvre.'],
        ['Délai d\'exécution', delaiExecution, 'Adosser impérativement le démarrage à la signature ou à la réception de l\'acompte.'],
        ['Acompte demandé', `${acomptePct} %`, acomptePct >= 30 ? 'Acompte élevé — négocier et lier à des phases d\'avancement vérifiables.' : (acomptePct > 0 ? 'Standard — adosser au démarrage des travaux.' : 'Point à clarifier.')],
        ['Échéancier de paiement', echeancier === 'oui' ? 'Adossé à l\'avancement' : 'Non adossé à l\'avancement', echeancier === 'oui' ? 'Conforme aux bonnes pratiques contractuelles.' : 'Payer uniquement à l\'avancement réel constaté — ne jamais payer à l\'avance.'],
        ['Retenue de garantie', `${retenueGarantie} %`, retenueGarantie >= 5 ? 'Protecteur pour la levée des réserves (Réf: Loi n° 2021-22 du 2 mars 2021, articles 28 et 31).' : 'Point à clarifier. L\'applicabilité doit être confirmée par un juriste.'],
        ['Pénalités de retard', penalites === 'oui' ? 'Prévues' : 'Non prévues', penalites === 'oui' ? 'Encourage le respect du calendrier (Cour suprême, arrêt n° 28 du 18 avril 2018).' : 'Fixer des pénalités journalières en cas de dépassement du délai.'],
        ['Avenants / Suppléments', avenants === 'ecrit_exige' ? 'Accord écrit exigé' : 'Non précisé', avenants === 'ecrit_exige' ? 'Conforme — aucun travail hors marché ne doit être engagé sans avenant signé.' : 'Préciser qu\'aucun travail supplémentaire ne sera réglé sans accord écrit préalable.'],
        ['Assurances', assurances === 'oui' ? 'Mentionnées' : 'Non mentionnées', assurances === 'oui' ? 'Demander copie de l\'attestation en cours de validité avant tout démarrage.' : 'Risque pour les garanties après réception — exiger les attestations. Point à faire vérifier.'],
        ['Montant arrêté en lettres', montantLettres === 'oui' ? 'Présent' : 'Absent', montantLettres === 'oui' ? 'Prévient les fraudes et contestations.' : 'Exiger le montant arrêté en lettres sur tout document contractuel.']
    ];

    doc.autoTable(createTableOptions(
        y,
        [['Clause', 'Constat', 'Analyse & Aide à la décision']],
        contractRows,
        { 0: { cellWidth: 44, fontStyle: 'bold' }, 1: { cellWidth: 36 }, 2: { cellWidth: 90 } }
    ));

    // ═══════════════════════════════════════════════════════════
    // PAGE 2 : CONTRÔLE ARITHMÉTIQUE
    // ═══════════════════════════════════════════════════════════
    doc.addPage();
    drawUnifiedHeader(doc, "RAPPORT D'AUDIT DE DEVIS", "Partie II : Contrôle Arithmétique & Cohérence des Lignes", refDoc, currentDate, clientName, clientPhone, "Audit", 'audit');
    y = 52;
    drawSectionTitle(doc, y, "III. CONTRÔLE ARITHMÉTIQUE DES LIGNES VALIDÉES (Q × PU)");
    y += TITLE_AFTER_GAP_MM;

    const lignesBody = computedLines.map(l => {
        let ecartStr = 'Conforme';
        if (l.ecart > 0) {
            ecartStr = `Surfacturation: +${fmt(l.ecart)} FCFA`;
        } else if (l.ecart < 0) {
            ecartStr = `Sous-facturation: ${fmt(l.ecart)} FCFA`;
        }
        return [l.lot, l.des, `${l.q} ${l.u} × ${fmt(l.pu)}`, `${fmt(l.mtIndique)} FCFA`, `${fmt(l.mtCalcule)} FCFA`, ecartStr];
    });

    doc.autoTable(createTableOptions(
        y,
        [['Lot', 'Désignation', 'Détail (Q × PU)', 'Montant Affiché', 'Montant Recalculé', 'Écart Constaté']],
        lignesBody,
        {
            0: { cellWidth: 26 },
            1: { cellWidth: 48, fontStyle: 'bold' },
            2: { cellWidth: 30 },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
            5: { cellWidth: 22, halign: 'right', textColor: [192, 57, 43] }
        }
    ));

    y = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    if (y > 230) { doc.addPage(); y = 20; }
    drawSectionTitle(doc, y, "IV. RÉCAPITULATIF FINANCIER GLOBAL");
    y += TITLE_AFTER_GAP_MM;

    const diffHt  = totalHtIndique > 0 ? (totalHtIndique  - totalHtCalcule)  : 0;
    const diffTtc = totalTtcIndique > 0 ? (totalTtcIndique - totalTtcCalcule) : 0;
    const diffHtStr  = diffHt !== 0 ? `Écart de ${fmt(Math.abs(diffHt))} FCFA (${diffHt > 0 ? 'devis supérieur' : 'devis inférieur'})` : 'Total exact';
    const diffTtcStr = diffTtc !== 0 ? `Écart de ${fmt(Math.abs(diffTtc))} FCFA (${diffTtc > 0 ? 'devis supérieur' : 'devis inférieur'})` : 'Total exact';

    doc.autoTable(createTableOptions(
        y,
        [['Élément / Agrégat', 'Valeur Affichée', 'Valeur Recalculée', 'Écart / Observation']],
        [
            ['Total HT', `${fmt(totalHtIndique)} FCFA`, `${fmt(totalHtCalcule)} FCFA`, diffHtStr],
            ['TVA', tvaApplicable === 'oui' ? 'Taux : 18 %' : 'Taux : 0 %', `${fmt(tvaCalculee)} FCFA`, tvaApplicable === 'oui' ? 'Application de la TVA à 18 % sur le total HT calculé.' : 'Vérifier si l\'entreprise bénéficie d\'une exonération.'],
            ['Total TTC', `${fmt(totalTtcIndique)} FCFA`, `${fmt(totalTtcCalcule)} FCFA`, diffTtcStr]
        ],
        { 0: { cellWidth: 44, fontStyle: 'bold' }, 1: { cellWidth: 36, halign: 'right' }, 2: { cellWidth: 36, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY }, 3: { cellWidth: 54 } }
    ));
}
