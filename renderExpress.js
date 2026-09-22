    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const surface = parseFloat(data.surface) || 200;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const totalLevelsCount = levels + 1;
    const slabType = data.slab_type || 'hourdis';
    const soilType = data.soil_type || 'normal';
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const lotNumber = data.lot_number || 'Non spécifié';

    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const enrobageCm = isMarine ? 4.5 : 3.0;

    // Cubatures structurales
    const epaisseurDallageM = 0.12;
    const vDallageSol = +(surface * epaisseurDallageM).toFixed(1);
    const coefPlancherHaut = slabType === 'dalle_pleine' ? 0.18 : 0.08;
    const vPlanchersHauts = +((surface * ((totalLevelsCount - 1) / totalLevelsCount)) * coefPlancherHaut).toFixed(1);

    const ratioBetonM2 = levels >= 4 ? 0.38 : (levels >= 2 ? 0.33 : 0.28);
    let vTotalBetonTheorique = +(surface * ratioBetonM2).toFixed(1);
    const vFondationsPoteauxPoutres = Math.max(10, +(vTotalBetonTheorique - vDallageSol - vPlanchersHauts).toFixed(1));
    const vTotalBeton = +(vDallageSol + vPlanchersHauts + vFondationsPoteauxPoutres).toFixed(1);

    const volGravierBasalte = Math.round(vTotalBeton * 0.80);
    const volSableKayar = Math.round(vTotalBeton * 0.45);
    const nbAgglos15 = Math.round(surface * 8.5);
    const nbAgglos20 = Math.round(surface * 3.4);
    const nbHourdis = slabType === 'dalle_pleine' ? 0 : Math.round((surface * ((totalLevelsCount - 1) / totalLevelsCount)) * 8.5);

    // Aciers FeE500
    let ratioAcierM3 = levels >= 4 ? 105 : (levels >= 2 ? 95 : 85);
    if (isMarine) ratioAcierM3 += 5;
    const tonnageAcierTotal = ((vTotalBeton * ratioAcierM3) / 1000).toFixed(2);
    const kgAcierTotal = Math.round(tonnageAcierTotal * 1000);

    const kgHA14_16 = Math.round(kgAcierTotal * 0.28);
    const kgHA12 = Math.round(kgAcierTotal * 0.32);
    const kgHA10 = Math.round(kgAcierTotal * 0.20);
    const kgHA8 = Math.round(kgAcierTotal * 0.12);
    const kgHA6 = Math.round(kgAcierTotal * 0.08);
    const filRecuitKg = Math.round(tonnageAcierTotal * 15);

    // Ciment décomposé béton + mortiers
    const DOSAGE_BETON_KG_M3 = 350;
    const sacsCimentBeton = Math.round(vTotalBeton * DOSAGE_BETON_KG_M3 / 50);
    const sMursEstimee = Math.round(surface * 2.8);
    const sacsCimentMortiers = Math.round(sMursEstimee * 20 / 50);
    const totalSacsCiment = sacsCimentBeton + sacsCimentMortiers;
    const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);

    // Prix unitaires de référence Dakar 2026
    const PRIX_ACIER_TONNE = 640000;
    const PRIX_CIMENT_SAC = 4100;
    const PRIX_GRAVIER_M3 = 19000;
    const PRIX_SABLE_M3 = 9000;
    const PRIX_AGGLO_15 = 325;
    const PRIX_AGGLO_20 = 425;
    const PRIX_HOURDIS = 650;

    const totalAcierF = Math.round(tonnageAcierTotal * PRIX_ACIER_TONNE);
    const totalCimentF = totalSacsCiment * PRIX_CIMENT_SAC;
    const totalGravierF = volGravierBasalte * PRIX_GRAVIER_M3;
    const totalSableF = volSableKayar * PRIX_SABLE_M3;
    const totalAgglosF = (nbAgglos15 * PRIX_AGGLO_15) + (nbAgglos20 * PRIX_AGGLO_20);
    const totalHourdisF = nbHourdis * PRIX_HOURDIS;
    const totalFournituresTTC = totalAcierF + totalCimentF + totalGravierF + totalSableF + totalAgglosF + totalHourdisF;

    // Découpage par phase
    const phase1Ciment = Math.round(totalSacsCiment * 0.30);
    const phase2Ciment = Math.round(totalSacsCiment * 0.30);
    const phase3Ciment = Math.round(totalSacsCiment * 0.25);
    const phase4Ciment = totalSacsCiment - phase1Ciment - phase2Ciment - phase3Ciment;

    const tAcierNum = parseFloat(tonnageAcierTotal);
    const phase1Acier = +(tAcierNum * 0.35).toFixed(2);
    const phase2Acier = +(tAcierNum * 0.30).toFixed(2);
    const phase3Acier = +(tAcierNum * 0.20).toFixed(2);
    const phase4Acier = +(tAcierNum - phase1Acier - phase2Acier - phase3Acier).toFixed(2);

    const p1Gravier = Math.round(volGravierBasalte * 0.30);
    const p2Gravier = Math.round(volGravierBasalte * 0.30);
    const p3Gravier = Math.round(volGravierBasalte * 0.25);
    const p4Gravier = volGravierBasalte - p1Gravier - p2Gravier - p3Gravier;

    const h50a = Math.round(nbHourdis * 0.50);
    const h50b = nbHourdis - h50a;

    // =========================================================================
    // PAGE 1 : CUBATURES & SYNTHÈSE DES RATIOS
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie I : Métré Volumique Béton & Besoins en Matériaux Structurels (BAEL 91 R99)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÈTRES DE DIMENSIONNEMENT DU BÂTIMENT & LOCALISATION", MARGIN_LEFT + 4, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface Développée (SDP) : env. ${surface} m²`, MARGIN_LEFT + 4, 75);
    doc.text(`Élévation : R+${levels} (${totalLevelsCount} niveaux)`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Type Plancher : ${slabType === 'dalle_pleine' ? 'Dalle Pleine BA' : 'Corps Creux 16+4'}`, 108, 69);
    doc.text(`Milieu d'Exposition : ${isMarine ? 'Marin Agressif (Cales 4,5 cm)' : 'Standard (Cales 3,0 cm)'}`, 108, 75);
    doc.text(`Nature du Sol : ${soilType === 'rocheux' ? 'Rocheux compact' : (soilType === 'sable' ? 'Sable dunaire' : 'Normal / Latéritique')}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. SYNTHÈSE DES RATIOS D'INGÉNIERIE & CUBATURES PRINCIPALES (BAEL 91 R99)");

    const ratioAcierDetail = isMarine
      ? `Ratio effectif : ${ratioAcierM3} kg/m³ de béton (base ${ratioAcierM3 - 5} kg + 5 kg/m³ zone marine inclus)`
      : `Ratio : ${ratioAcierM3} kg/m³ de béton armé structural`;

    const syntheseRows = [
      ["Béton Armé Structurel (fc28 >= 25 MPa)", `${vTotalBeton} m³`, `Ratio : ${(vTotalBeton / surface).toFixed(2)} m³/m². Fondations + poteaux + poutres + dalles.`],
      ["Aciers Haute Adhérence FeE500", `${tonnageAcierTotal} Tonnes (${formatNum(kgAcierTotal)} kg)`, ratioAcierDetail],
      ["Ciment CEM II 42.5R (SOCOCIM / Dangote)", `${formatNum(totalSacsCiment)} Sacs (env. ${tonnesCiment} T)`, `Béton (${formatNum(sacsCimentBeton)} sacs) + Mortiers (${formatNum(sacsCimentMortiers)} sacs)`],
      ["Gravier Basalte Concassé (Carrières Diack)", `${formatNum(volGravierBasalte)} m³`, `Formule : ${vTotalBeton} m³ béton — 0.80. Basalte Diack obligatoire.`],
      ["Sable Dunaire Lavé Propre (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, `Formule : ${vTotalBeton} m³ béton — 0.45. Sable propre sans sel.`],
      ["Agglos Vibrés Normalisés (15 & 20)", `${formatNum(nbAgglos15 + nbAgglos20)} Unités`, `Agglos 15 (${formatNum(nbAgglos15)}) + Agglos 20 (${formatNum(nbAgglos20)}) — 12.5 U/m²`],
      ["Plancher Hourdis Entrevous Béton", slabType === 'dalle_pleine' ? "Dalle Pleine BA" : `${formatNum(nbHourdis)} Hourdis`, slabType === 'dalle_pleine' ? "Coffrage intégral dalle pleine" : `${formatNum(nbHourdis)} U — ratio 8.5 U/m² planchers hauts`]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Désignation du Matériau', 'Quantitatif Global Calculé', 'Prescription & Ratio d\'Ingénierie']],
      syntheseRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "II. SPÉCIFICATIONS TECHNIQUES DU BÉTON & SÉCURITÉ DES OUVRAGES");

    const securiteRows = [
      ["Classe de Résistance Béton", "B25 (fc28 >= 25 MPa)", "Obligation minimale pour poteaux, poutres et planchers"],
      ["Dosage Réglementaire Ciment", "350 kg/m³ (CEM II 42.5R)", "7 sacs de 50 kg par mètre cube de béton mis en œuvre"],
      ["Calage d'Enrobage Réglementaire", `${enrobageCm} cm stricts avec cales béton`, isMarine ? "Milieu marin agressif (BAEL 91 R99 art. A.7.2.4)" : "Milieu non agressif standard (BAEL 91 R99)"],
      ["Vibration du Béton Frais", "Aiguille vibrante obligatoire", "Interdiction du serrage manuel au fer à béton sous peine de nids de cailloux"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Composant / Phase', 'Spécification Technique', 'Norme & Règle de l\'Art']],
      securiteRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 2 : NOMENCLATURE DES ACIERS & BORDEREAU ESTIMATIF FOURNITURES
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie II : Calibrage des Aciers FeE500 & Bordereau Estimatif Fournitures 2026", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. NOMENCLATURE & CALIBRAGE DES ARMATURES HAUTE ADHÉRENCE FeE500");

    const aciersRows = [
      ["Aciers HA 14 & HA 16", `${formatNum(kgHA14_16)} kg (${(kgHA14_16/1000).toFixed(2)} T)`, "Aciers longitudinaux des semelles de fondation et poteaux du RDC"],
      ["Aciers HA 12", `${formatNum(kgHA12)} kg (${(kgHA12/1000).toFixed(2)} T)`, "Armatures principales des poutres maîtresses et poteaux des étages"],
      ["Aciers HA 10", `${formatNum(kgHA10)} kg (${(kgHA10/1000).toFixed(2)} T)`, "Aciers chapeaux de dalle, poutrelles hourdis et linteaux"],
      ["Aciers HA 8", `${formatNum(kgHA8)} kg (${(kgHA8/1000).toFixed(2)} T)`, "Armatures de répartition, chaînages verticaux et renforts d'angles"],
      ["Aciers HA 6", `${formatNum(kgHA6)} kg (${(kgHA6/1000).toFixed(2)} T)`, "Cadres, étriers et épingles anti-flambement des poteaux et poutres"],
      [`Fil de Recuit & Cales (${enrobageCm} cm)`, `${formatNum(filRecuitKg)} kg de fil + cales`, `Enrobage ${enrobageCm} cm ${isMarine ? '(zone côtière/saline)' : '(milieu standard)'}`],
      ["TOTAL ACIERS HAUTE ADHÉRENCE FeE500", `${formatNum(kgAcierTotal)} kg (env. ${tonnageAcierTotal} T)`, "Fers certifiés SOCOCIM / Senbus / Someta à haute limite élastique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Diamètre Commercial & Type d\'Armature', 'Poids Requis', 'Destination Structurelle']],
      aciersRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "IV. BORDEREAU ESTIMATIF FOURNITURES MATÉRIAUX (RÉFÉRENTIEL DAKAR 2026)");

    const bordereauRows = [
      ["Aciers FeE500 (Barres de 12 m)", `${tonnageAcierTotal} Tonnes`, `${formatFCFA(PRIX_ACIER_TONNE)} / T`, formatFCFA(totalAcierF), "Aciers certifiés sans rouille feuilletée"],
      ["Ciment CEM II 42.5R (Sacs 50 kg)", `${formatNum(totalSacsCiment)} Sacs`, `${formatFCFA(PRIX_CIMENT_SAC)} / Sac`, formatFCFA(totalCimentF), "SOCOCIM / Dangote / Sahel"],
      ["Gravier Basalte Diack (8/16 & 16/25)", `${formatNum(volGravierBasalte)} m³`, `${formatFCFA(PRIX_GRAVIER_M3)} / m³`, formatFCFA(totalGravierF), "Basalte concassé haute compacité"],
      ["Sable Dunaire Lavé (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, `${formatFCFA(PRIX_SABLE_M3)} / m³`, formatFCFA(totalSableF), "Sable propre sans vase ni sel"],
      ["Agglos Creux Vibrés de 15", `${formatNum(nbAgglos15)} U`, `${PRIX_AGGLO_15} FCFA / U`, formatFCFA(nbAgglos15 * PRIX_AGGLO_15), "Élévations murs extérieurs et refends"],
      ["Agglos Pleins Vibrés de 20", `${formatNum(nbAgglos20)} U`, `${PRIX_AGGLO_20} FCFA / U`, formatFCFA(nbAgglos20 * PRIX_AGGLO_20), "Murs de soubassement sous longrines"]
    ];
    if (nbHourdis > 0) {
      bordereauRows.push(["Entrevous Hourdis Béton 16 cm", `${formatNum(nbHourdis)} U`, `${PRIX_HOURDIS} FCFA / U`, formatFCFA(totalHourdisF), "Hourdis normalisés pour planchers hauts"]);
    }
    bordereauRows.push(["TOTAL ESTIMATIF FOURNITURES MATÉRIAUX", "-", "-", formatFCFA(totalFournituresTTC), "Total indicatif matériaux rendus chantier"]);

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Désignation Matériau', 'Quantité', 'Prix Unitaire', 'Montant Total HT', 'Observations']],
      bordereauRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 42 }
      }
    ));

    // =========================================================================
    // PAGE 3 : PLANNING D'APPROVISIONNEMENT & CONTRÔLE CHANTIER
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie III : Planning d'Approvisionnement par Phase & Recettes de Bétonnage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. PLANNING D'APPROVISIONNEMENT PAR PHASE (ANTI-VOL & ANTI-GASPILLAGE)");

    const planningRows = [
      ["Phase 1 : Fouilles, Fondations & Soubassement", `${formatNum(phase1Ciment)} Sacs`, `${phase1Acier} T (HA16, HA14, HA12)`, `${formatNum(p1Gravier)} m³`, `${formatNum(nbAgglos20)} agglos pleins de 20 + sable`],
      ["Phase 2 : Poteaux RDC & Plancher Haut", `${formatNum(phase2Ciment)} Sacs`, `${phase2Acier} T (HA14, HA12, HA8)`, `${formatNum(p2Gravier)} m³`, `${formatNum(h50a)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15`],
      [`Phase 3 : Élévations & Planchers Étages (R+${levels})`, `${formatNum(phase3Ciment)} Sacs`, `${phase3Acier} T (HA12, HA10, HA8)`, `${formatNum(p3Gravier)} m³`, `${formatNum(h50b)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.4))} agglos 15`],
      ["Phase 4 : Toiture Terrasse, Acrotères & Enduits", `${formatNum(phase4Ciment)} Sacs`, `${phase4Acier} T (HA10, HA8, HA6)`, `${formatNum(p4Gravier)} m³`, `${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15 + sable enduits`]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Étape des Travaux', 'Quota Ciment 42.5R', 'Quota Aciers FeE500', 'Quota Gravier Diack', 'Matériaux Complémentaires']],
      planningRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 48 }
      }
    ));

    // Contrôle technique bloquant de concordance des phases
    const checkCimentPhases = phase1Ciment + phase2Ciment + phase3Ciment + phase4Ciment;
    const checksPhases = (checkCimentPhases === totalSacsCiment);
    if (!checksPhases) throw new Error("Incohérence somme approvisionnement ciment");

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "VI. CONTRÔLE DES RATIOS DE BÉTONNAGE & RECETTES CHANTIER (DOSAGE 350 KG)");

    const recettesRows = [
      ["Composition par Gâchée (1 Sac de Ciment)", "1 sac ciment (50 kg) + 1 brouette sable (env. 40 L) + 2 brouettes gravier (env. 80 L) + 22 à 25 L d'eau propre", "Interdire formellement l'excès d'eau pour faciliter la mise en œuvre (chute drastique de résistance)."],
      ["Contrôle d'Affaissement au Cône d'Abrams", "Affaissement prescrit : 6 à 9 cm (Béton plastique à très maniable)", "Mesure systématique à l'arrivée de chaque toupie ou première gâchée de la journée."],
      ["Surveillance des Armatures avant Coulage", "Vérification des cales d'enrobage, ligature croisée et recouvrement minimal (50 diamètres)", "Point d'arrêt obligatoire : coulage strictement interdit sans visa de ferraillage."],
      ["Cure du Béton Jeune sous Climat Sahélien", "Arrosage abondant 2 fois par jour pendant 7 jours minimum ou produit de cure agréé", "Évite la dessiccation prématurée et les fissures de retrait plastique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Paramètre de Bétonnage', 'Exigence ChantierSur', 'Conséquence en Cas de Non-Respect']],
      recettesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : RÉCAPITULATIF BUDGÉTAIRE & CLAUSES DE DÉCOFFRAGE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie IV : Synthèse Budgétaire Gros œuvre & Clauses de Sécurité au Décoffrage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    const moRatioM2 = levels >= 4 ? 38000 : (levels >= 2 ? 34000 : 28000);
    const totalMainOeuvre = Math.round(surface * moRatioM2);
    const totalGrosOeuvreHT = totalFournituresTTC + totalMainOeuvre;

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÉCAPITULATIF BUDGÉTAIRE GROS œUVRE & CLÉS DE PAIEMENT CONTRAT COCC");

    const recapRows = [
      ["Fournitures Matériaux de Base", formatFCFA(totalFournituresTTC), `${Math.round((totalFournituresTTC / totalGrosOeuvreHT) * 100)} %`, "Approvisionnements échelonnés selon les 4 phases"],
      ["Main d'œuvre Tâcheron / Entreprise", formatFCFA(totalMainOeuvre), `${Math.round((totalMainOeuvre / totalGrosOeuvreHT) * 100)} %`, `Paiement lié exclusivement à la validation des 6 points d'arrêt`],
      ["BUDGET TOTAL GROS œUVRE ESTIMATIF", formatFCFA(totalGrosOeuvreHT), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalGrosOeuvreHT / surface))} / m² SDP`],
      ["Retenue de Garantie Contractuelle (5%)", formatFCFA(Math.round(totalGrosOeuvreHT * 0.05)), "5 %", "Consignée jusqu'à la réception définitive (Article 742 COCC)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Poste de Dépense', 'Montant Estimatif', 'Quote-Part', 'Condition de Déblocage']],
      recapRows,
      {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 64 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "VIII. DÉLAIS IMPÉRATIFS DE DÉCOFFRAGE DES OUVRAGES (BAEL 91 R99)");

    const clausesRows = [
      ["Joues de Poutres & Faces de Poteaux", SEUILS_TECHNIQUES.decoffrageJoues, "Décoffrage possible sans mise en charge. Arrosage immédiat pour cure."],
      ["Sous-faces de Poutres & Dalles", SEUILS_TECHNIQUES.decoffrageSousFaces, "Décoffrage formellement interdit avant 21 jours sans note de calcul de résistance."],
      ["Étais de Sécurité sous Poutres Maîtresses", "Maintien 28 jours", "Conserver 1 étai de soulagement sur deux jusqu'à résistance nominale fc28."]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Élément Porteur', 'Délai Minimal de Décoffrage', 'Conditions & Précautions']],
      clausesRows,
      {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 90 }
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
    doc.text("ENGAGEMENT TECHNIQUE CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SLATE);
    const disclaimerExpress = doc.splitTextToSize(
      "Les quantitatifs de ce bordereau sont calculés selon les règles professionnelles BAEL 91 R99 à titre purement indicatif. Avant toute commande définitive de fer ou de béton, un BET agréé doit impérativement valider les sections sur plan d'exécution.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerExpress, MARGIN_LEFT + 4, currentY + 10);
    doc.text(`Bordereau quantitatif émis à Dakar le ${currentDate}. Réf Dossier: ${refDoc}`, MARGIN_LEFT + 4, currentY + 17.5);
  }

