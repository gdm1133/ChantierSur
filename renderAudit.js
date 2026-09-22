    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const quotedAmount = parseFloat(data.quoted_amount) || 45000000;
    const surface = parseFloat(data.surface) || 250;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const totalLevelsCount = levels + 1;
    const scope = data.contract_scope || 'tce';
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const lotNumber = data.lot_number || 'Non spécifié';

    const sToiture = Math.max(20, Math.round(surface / totalLevelsCount));
    const partEtancheiteRef = sToiture * SEUILS_TECHNIQUES.ratioEtancheiteM2Moyen;

    // Référentiel BET Dakar 2026
    const ratioBetMoyen = scope === 'go_seul' ? 145000 : (scope === 'clos_couvert' ? 210000 : 277500);
    const refMoyen = Math.round(surface * ratioBetMoyen);
    const refBas = Math.round(refMoyen * 0.88);
    const refHaut = Math.round(refMoyen * 1.15);
    const contractAmount = parseFloat(data.contract_amount) || refMoyen;

    const penaliteJournaliere = Math.round(contractAmount * SEUILS_TECHNIQUES.penaliteJourRatio);
    const plafondPenalites = Math.round(contractAmount * SEUILS_TECHNIQUES.plafondPenalitesTaux);

    const diffMontant = quotedAmount - refMoyen;
    const ecartPourcent = Math.round((diffMontant / refMoyen) * 100);

    let diagnosticGeneral = "";
    if (ecartPourcent < -25) {
      diagnosticGeneral = "DEVIS ANORMALEMENT BAS : Risque critique d'abandon de chantier, malfaçons sévères ou sous-dosage du ciment.";
    } else if (ecartPourcent < -10) {
      diagnosticGeneral = "DEVIS TRÈS COMPÉTITIF : Vérifier scrupuleusement la qualité des aciers (FeE500 certifiés) et l'épaisseur du dallage.";
    } else if (ecartPourcent <= 15) {
      diagnosticGeneral = "DEVIS CONFORME AU MARCHÉ : Tarifs en cohérence avec les mercuriales professionnelles du BTP à Dakar.";
    } else {
      diagnosticGeneral = "DEVIS SURÉVALUÉ : Marges excessives ou quantitatifs gonflés. Fort potentiel de renégociation.";
    }

    // =========================================================================
    // PAGE 1 : CONFRONTATION GLOBALE & RÉPARTITION PAR MACRO-LOT
    // =========================================================================
    drawUnifiedHeader(doc, "Rapport de Contre-Expertise & Audit Devis", "Partie I : Confrontation Globale au Référentiel BET & Audit par Macro-Lot", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("SYNTHÈSE DE L'AUDIT & IDENTIFICATION DU DEVIS ANALYSÉ", MARGIN_LEFT + 4, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Montant Devis Soumis : ${formatFCFA(quotedAmount)}`, MARGIN_LEFT + 4, 75);
    doc.text(`Périmètre Travaux : ${scope.toUpperCase()}`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Budget Cible Recommandé : ${formatFCFA(refMoyen)}`, 108, 69);
    doc.text(`Écart Global : ${ecartPourcent > 0 ? '+' : ''}${ecartPourcent} % (${formatFCFA(diffMontant)})`, 108, 75);
    doc.text(`Diagnostic Global : ${diagnosticGeneral.substring(0, 32)}...`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. CONFRONTATION GLOBALE DU DEVIS AU RÉFÉRENTIEL DAKAR 2026");

    const auditGlobalRows = [
      ["Montant Total Devis Soumis", formatFCFA(quotedAmount), `${formatFCFA(Math.round(quotedAmount / surface))} / m²`, "Montant TTC saisi par le maître d'ouvrage"],
      ["Fourchette Référentiel Basse", formatFCFA(refBas), `${formatFCFA(Math.round(refBas / surface))} / m²`, "Seuil minimum en dessous duquel la qualité est compromise"],
      ["Budget de Référence Médian BET", formatFCFA(refMoyen), `${formatFCFA(Math.round(refMoyen / surface))} / m²`, "Budget objectif recommandé pour la négociation"],
      ["Fourchette Référentiel Haute", formatFCFA(refHaut), `${formatFCFA(Math.round(refHaut / surface))} / m²`, "Prix plafond pour prestations d'entreprise générale de standing"],
      ["Écart Constaté vs Référence", `${ecartPourcent > 0 ? '+' : ''}${ecartPourcent} %`, formatFCFA(diffMontant), diagnosticGeneral]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Indicateur d\'Analyse', 'Devis Soumis Artisan', 'Référentiel BET ChantierSur', 'Écart & Diagnostic']],
      auditGlobalRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        3: { cellWidth: 68 }
      }
    ));

    // SECTION II : TABLEAU II CONCORDANCE STRICTE
    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "II. RÉPARTITION COMPARATIVE PAR MACRO-LOT (DEVIS SOUMIS VS RÉFÉRENTIEL BET)");

    const coefGo = scope === 'go_seul' ? 0.88 : (scope === 'clos_couvert' ? 0.60 : 0.48);
    const coefSo = scope === 'go_seul' ? 0 : (scope === 'clos_couvert' ? 0.25 : 0.38);
    const tauxAleas = SEUILS_TECHNIQUES.provisionAleasTaux;            // 0.05
    const tauxMarge = SEUILS_TECHNIQUES.margeEntrepreneurMoyenne;    // 0.085
    const facteurTotal = 1.0 + tauxAleas + tauxMarge;                // 1.135

    // Décomposition 100% concordante de Ref BET (Somme des lignes = refMoyen)
    const coutDirectRef = Math.round(refMoyen / facteurTotal);
    const partAleasRef = Math.round(coutDirectRef * tauxAleas);
    const partMargeRef = refMoyen - coutDirectRef - partAleasRef;

    const partEtancheiteRefCalculee = scope === 'go_seul' ? 0 : partEtancheiteRef;
    const remDirectRef = coutDirectRef - partEtancheiteRefCalculee;
    const partGoRef = Math.round(remDirectRef * (coefGo / (coefGo + coefSo)));
    const partSoRef = scope === 'go_seul' ? 0 : (remDirectRef - partGoRef);

    // Décomposition 100% concordante de Devis Soumis (Somme des lignes = quotedAmount)
    const coutDirectSoumis = Math.round(quotedAmount / facteurTotal);
    const partAleasSoumis = Math.round(coutDirectSoumis * tauxAleas);
    const partMargeSoumis = quotedAmount - coutDirectSoumis - partAleasSoumis;

    const partEtancheiteSoumis = scope === 'go_seul' ? 0 : Math.round(partEtancheiteRefCalculee * (quotedAmount / refMoyen));
    const remDirectSoumis = coutDirectSoumis - partEtancheiteSoumis;
    const partGoSoumis = Math.round(remDirectSoumis * (coefGo / (coefGo + coefSo)));
    const partSoSoumis = scope === 'go_seul' ? 0 : (remDirectSoumis - partGoSoumis);

    // Écarts ligne par ligne
    const ecartGo = partGoSoumis - partGoRef;
    const ecartSo = partSoSoumis - partSoRef;
    const ecartEtancheite = partEtancheiteSoumis - partEtancheiteRefCalculee;
    const ecartAleas = partAleasSoumis - partAleasRef;
    const ecartMarge = partMargeSoumis - partMargeRef;

    // Test bloquant d'intégrité comptable
    const verifSommeSoumis = partGoSoumis + partSoSoumis + partEtancheiteSoumis + partAleasSoumis + partMargeSoumis;
    const verifSommeRef = partGoRef + partSoRef + partEtancheiteRefCalculee + partAleasRef + partMargeRef;
    const verifSommeEcarts = ecartGo + ecartSo + ecartEtancheite + ecartAleas + ecartMarge;

    if (verifSommeSoumis !== quotedAmount || verifSommeRef !== refMoyen || verifSommeEcarts !== (quotedAmount - refMoyen)) {
      throw new Error("Discordance critique dans la décomposition du Tableau II d'Audit");
    }

    function fmtEcart(val) {
      if (val === 0) return "0 FCFA";
      return (val > 0 ? "+" : "") + formatFCFA(val);
    }

    const repartitionRows = [
      [
        "Gros œuvre & Structure BAEL",
        formatFCFA(partGoSoumis),
        formatFCFA(partGoRef),
        fmtEcart(ecartGo),
        "Terrassements, fondations, poteaux, poutres, dalles, maçonneries"
      ],
      [
        "Second œuvre & Finitions",
        scope === 'go_seul' ? "Exclu" : formatFCFA(partSoSoumis),
        scope === 'go_seul' ? "Exclu" : formatFCFA(partSoRef),
        scope === 'go_seul' ? "-" : fmtEcart(ecartSo),
        scope === 'go_seul' ? "Hors périmètre contrat" : "Plomberie, électricité, carrelage, menuiseries int./ext."
      ],
      [
        "Étanchéité Toiture & Acrotères",
        scope === 'go_seul' ? "Exclu" : formatFCFA(partEtancheiteSoumis),
        scope === 'go_seul' ? "Exclu" : formatFCFA(partEtancheiteRefCalculee),
        scope === 'go_seul' ? "-" : fmtEcart(ecartEtancheite),
        `Complexe bitumineux (${sToiture} m² toiture — 28 000 F/m² — à valider BET)`
      ],
      [
        "Provision pour Aléas (5% direct)",
        formatFCFA(partAleasSoumis),
        formatFCFA(partAleasRef),
        fmtEcart(ecartAleas),
        "Couverture des sujétions imprévues et aléas de sol"
      ],
      [
        "Marge Entrepreneur (8,5% direct)",
        formatFCFA(partMargeSoumis),
        formatFCFA(partMargeRef),
        fmtEcart(ecartMarge),
        "Marge bénéficiaire normale estimée (base médiane : 8,5%)"
      ],
      [
        "TOTAL MACRO-LOTS CONFRONTÉ",
        formatFCFA(quotedAmount),
        formatFCFA(refMoyen),
        `${ecartPourcent > 0 ? '+' : ''}${ecartPourcent} % (${fmtEcart(quotedAmount - refMoyen)})`,
        "Confrontation globale concordante du devis vs budget repère BET"
      ]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Macro-Lot Technique', 'Devis Soumis', 'Budget Réf. BET', 'Écart Constaté', 'Base & Observations']],
      repartitionRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 26, halign: 'right' },
        2: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 48 }
      }
    ));

    // =========================================================================
    // PAGE 2 : PIÈGES TECHNIQUES & LES 7 OMISSIONS FRÉQUENTES
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport de Contre-Expertise & Audit Devis", "Partie II : Détection des Pièges Techniques, Ratios Incohérents & Omissions", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. AUDIT DES RATIOS STRUCTURAUX & PIÈGES TECHNIQUES COURANTS");

    const piegesRows = [
      ["Dosage du Béton Armé", "Mention imprécise 'Béton Armé'", "Privilégier le CEM II 42.5R dosé à 350 kg/m³ pour les éléments porteurs (marge de sécurité sur fc28 = 25 MPa). Ciment 32.5N admissible uniquement sous réserve d'essais."],
      ["Qualité & Diamètre des Aciers", "Aciers non spécifiés ou lisses", "Imposer : Aciers Haute Adhérence FeE500 certifiés. Interdire les fers déclassés ou de récupération."],
      ["Épaisseur Table de Compression", "Table réduite à 2 ou 3 cm", "Norme BAEL 91 : Épaisseur minimale de 4 cm armée d'un treillis soudé (exigence BAEL : flexion locale et fonctionnement en diaphragme horizontal)."],
      ["Enrobage des Armatures", "Absence totale de cales béton", "Exiger cales de 4,5 cm en milieu marin (Dakar Littoral) et 3 cm en zone intérieure sous peine de rouille expansive."],
      ["Nature des Agrégats", "Gravier calcaire tendre", "Prescrire obligatoirement le concassé de basalte des carrières de Diack pour toute la structure porteuse."]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Composant Structurel', 'Piège / Formule Trompeuse Constatée', 'Exigence Rectificative ChantierSur']],
      piegesRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 53 },
        2: { cellWidth: 75 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "IV. LES 7 OMISSIONS FRÉQUENTES DANS LES DEVIS SÉNÉGALAIS");

    const omissionsRows = [
      ["Étanchéité Toiture & Acrotères", "Complexe monocouche bâclé", "Imposer complexe bitumineux bicouche 4 mm sablé + relevés d'étanchéité 15 cm (DTU 43.1)."],
      ["Canalisations EU/EP & Regards", "Réseau d'évacuation non chiffré", "Intégrer tubes PVC évacuation normalisés + regards de visite siphoïdes à chaque angle."],
      ["Tableau Électrique & Terre", "Prise de terre absente du devis", "Piquet de terre obligatoire avec mesure < 100 Ohms (50V max) + différentiels 30 mA (NF C 15-100)."],
      ["Nettoyage & Évacuation Gravats", "Non mentionné au devis", "Stipuler que le repli de chantier et l'évacuation à la décharge autorisée incombent à l'entrepreneur."],
      ["Arase Étanche sous Soubassement", "Absente sur les devis courants", "Barrière d'arase étanche obligatoire pour stopper les remontées capillaires (DTU 20.1)."],
      ["Réservation Gaines & Fourreaux", "Forages facturés en suppléments", "Imposer la pose préalable des fourreaux avant coulage des dalles et poutres."],
      ["Étais & Sécurité de Coulage", "Coffrages sous-dimensionnés", "Exiger étaiement certifié tous les 80 cm sous poutres et maintien 21 jours minimum."]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Poste Oublié ou Minimisé', 'Impact Financier Imprévu', 'Source Normative & Recommandation']],
      omissionsRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 33, halign: 'right' },
        2: { cellWidth: 95 }
      }
    ));

    // =========================================================================
    // PAGE 3 : ÉCHÉANCIER DE PAIEMENT & ENCADREMENT CONTRACTUEL COCC
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport de Contre-Expertise & Audit Devis", "Partie III : Échéancier de Paiement Sécurisé & Clauses Juridiques COCC", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    const tranche1 = Math.round(contractAmount * 0.15);
    const tranche2 = Math.round(contractAmount * 0.25);
    const tranche3 = Math.round(contractAmount * 0.25);
    const tranche4 = Math.round(contractAmount * 0.20);
    const tranche5 = Math.round(contractAmount * 0.10);
    const tranche6 = contractAmount - (tranche1 + tranche2 + tranche3 + tranche4 + tranche5); // 5% retenue

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. ÉCHÉANCIER DE PAIEMENT SÉCURISÉ & CLÉS D'AVANCEMENT (BASE NÉGOCIÉE)");

    const echeancierRows = [
      ["Tranche 1 : Démarrage & Approvisionnement", formatFCFA(tranche1), "15 %", "Après implantation validée par géomètre et approvisionnement des premiers aciers."],
      ["Tranche 2 : Fondations & Plancher Bas", formatFCFA(tranche2), "25 %", "Après coulage semelles, longrines, soubassement et dallage (point d'arrêt 1 & 2)."],
      ["Tranche 3 : Poteaux & Dalle RDC", formatFCFA(tranche3), "25 %", "Après coulage de la dalle supérieure et validation du ferraillage (point d'arrêt 3)."],
      ["Tranche 4 : Élévations & Dalles Étages", formatFCFA(tranche4), "20 %", "Après achèvement des maçonneries d'étages et coulage toiture (point d'arrêt 4 & 5)."],
      ["Tranche 5 : Réception Provisoire avec Réserves", formatFCFA(tranche5), "10 %", "Après visite contradictoire et signature du PV de réception (Article 740 COCC)."],
      ["Tranche 6 : Retenue de Garantie Légale (COCC)", formatFCFA(tranche6), "5 %", "Libérable 1 an après réception définitive sans désordre (Article 742 COCC)."]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Tranche de Paiement', 'Montant Cible Négocié', 'Quote-Part', 'Condition Impérative de Déblocage']],
      echeancierRows,
      {
        0: { cellWidth: 46, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 74 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "VI. ENCADREMENT CONTRACTUEL COCC & PÉNALITÉS DE RETARD");

    const clausesRows = [
      ["Clause de Pénalités de Retard Journalières", `Pénalité de 1/1000e par jour de retard calendaire (${formatFCFA(penaliteJournaliere)} / jour), plafonnée à 5% (${formatFCFA(plafondPenalites)}).`, REFERENCES_JURIDIQUES.penalitesRetard],
      ["Clause de Retenue de Garantie 5%", "Déduction systématique de 5% sur chaque décompte mensuel, consignée jusqu'à la levée de toutes les réserves.", REFERENCES_JURIDIQUES.retenueGarantie],
      ["Points d'Arrêt & Contrôle Technique", "Interdiction absolue de couler sans visa formel de ferraillage du BET. Tout béton non visé sera refusé.", REFERENCES_JURIDIQUES.receptionTravaux],
      ["Garantie Décennale des Gros Ouvrages", "Responsabilité de plein droit de l'entrepreneur pendant 10 ans sur la solidité et l'étanchéité.", REFERENCES_JURIDIQUES.garantieDecennale]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Clause Contractuelle Obligatoire', 'Formulation Protectrice Recommandée', 'Réf. Juridique COCC']],
      clausesRows,
      {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 85 },
        2: { cellWidth: 40 }
      }
    ));

    // =========================================================================
    // PAGE 4 : STRATÉGIE DE NÉGOCIATION & FEUILLE DE ROUTE CONTRACTUELLE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport de Contre-Expertise & Audit Devis", "Partie IV : Stratégie de Négociation & Argumentaire Technique ChantierSur", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. GRILLE DE NÉGOCIATION & ARGUMENTAIRE CHANTIERSUR");

    const negociationRows = [
      ["Fourniture des Aciers FeE500", "L'artisan surfacture souvent l'acier", "Acheter soi-même les aciers auprès d'usines agréées (SOCOCIM/Someta) et payer la façon", "Économie : 10% à 15% sur le lot armatures"],
      ["Dosage & Qualité du Ciment", "L'artisan propose du ciment 32.5N standard", "Exiger contractuellement le CEM II 42.5R avec bon de livraison usine", "Protection vitale contre l'effondrement précoce"],
      ["Étanchéité Toiture-Terrasse", "L'artisan sous-estime la surface de toiture", `Imposer les ${sToiture} m² réels calculés au ratio DTU 43.1`, "Protection totale contre les infiltrations d'hivernage"],
      ["Acomptes & Trésorerie Chantier", "L'artisan exige 40% à 50% d'avance", "Plafonner strictement l'avance à 15% contre approvisionnement effectif sur le site", "Zéro risque de fuite de l'artisan avec la trésorerie"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Sujet de Négociation', 'Position Fréquente de l\'Artisan', 'Contre-Proposition ChantierSur', 'Économie / Protection']],
      negociationRows,
      {
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 56 },
        3: { cellWidth: 38 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 20, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 20, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VISA TECHNIQUE DU BUREAU D'ÉTUDES NUMÉRIQUE CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SLATE);
    const disclaimerAudit = doc.splitTextToSize(
      "Cet audit est un rapport indicatif d'aide à la décision établi selon les mercuriales moyennes du BTP à Dakar (valeurs 2026). Il ne constitue ni une expertise judiciaire ni une garantie de prix fixe. Il appartient au maître d'ouvrage de formaliser son contrat avec l'assistance d'un juriste ou d'un BET agréé.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerAudit, MARGIN_LEFT + 4, currentY + 10);
    doc.text(`Rapport de contre-expertise émis à Dakar le ${currentDate}. Dossier Réf: ${refDoc}`, MARGIN_LEFT + 4, currentY + 17.5);
  }

