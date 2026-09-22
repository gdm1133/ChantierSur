    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const surface = parseFloat(data.surface) || 250;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const totalLevelsCount = levels + 1;
    const standing = data.standing || 'moyen';
    const tileType = data.tile_type || 'gres_cerame_60';
    const joineryType = data.joinery_type || 'alu_vitre';
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const lotNumber = data.lot_number || 'Non spécifié';
    const delaiReserves = parseInt(data.delai_reserves, 10) || 15;

    // Ratios second œuvre 2026
    const sSolCarrelee = Math.round(surface * 0.82);
    const sMursFaience = Math.round(surface * 0.35);
    const sToitureTerrasse = Math.max(25, Math.round(surface / totalLevelsCount));

    const prixCarrelageM2 = tileType.includes('grand_format') ? 14500 : (tileType.includes('marbre') ? 28000 : 9500);
    const prixFaienceM2 = 8500;
    const prixEtancheiteM2 = 28000;

    const totalCarrelageSolF = Math.round(sSolCarrelee * prixCarrelageM2);
    const totalFaienceF = Math.round(sMursFaience * prixFaienceM2);

    const sacsColleRequis = Math.ceil((sSolCarrelee + sMursFaience) / 6.5);
    const totalColleF = sacsColleRequis * 4500;
    const sacsJointRequis = Math.ceil((sSolCarrelee + sMursFaience) / 22);
    const totalJointF = sacsJointRequis * 3500;

    const totalLotCarrelageF = totalCarrelageSolF + totalColleF + totalJointF;
    const checkSommeCarrelage = totalCarrelageSolF + totalColleF + totalJointF;
    if (checkSommeCarrelage !== totalLotCarrelageF) throw new Error("Incohérence somme carrelage");

    const totalEtancheiteF = Math.round(sToitureTerrasse * prixEtancheiteM2);
    const nbSallesEau = Math.max(2, Math.round(surface / 65));
    const totalEtancheiteHumideF = nbSallesEau * 120000;

    // Plomberie EU/EP décomposée
    const qSanitaires = nbSallesEau * 2;
    const puSanitaires = 185000;
    const montantSanitaires = qSanitaires * puSanitaires;
    const qMitigeurs = nbSallesEau * 3;
    const puMitigeurs = 45000;
    const montantMitigeurs = qMitigeurs * puMitigeurs;
    const qAlim = nbSallesEau;
    const puAlim = 150000;
    const montantAlim = qAlim * puAlim;
    const totalPlomberieF = montantSanitaires + montantMitigeurs + montantAlim;

    // Électricité NF C 15-100 (0,55 pt/m²)
    const nbPointsElec = Math.round(surface * 0.55);
    const puPointElec = 16000;
    const montantPoints = nbPointsElec * puPointElec;
    const qTableaux = Math.max(1, levels);
    const puTableaux = 320000;
    const montantTableaux = qTableaux * puTableaux;
    const qClim = Math.max(2, Math.round(surface / 45));
    const puClim = 95000;
    const montantClim = qClim * puClim;
    const totalElectriciteF = montantPoints + montantTableaux + montantClim;

    // Menuiseries décomposées
    const qPortesInt = Math.max(4, Math.round(surface / 30));
    const puPorteInt = 85000;
    const montantPortesInt = qPortesInt * puPorteInt;
    const qChassisAlu = Math.max(4, Math.round(surface / 25));
    const puChassisAlu = 160000;
    const montantChassisAlu = qChassisAlu * puChassisAlu;
    const qBaiesVitrees = Math.max(1, Math.round(surface / 100));
    const puBaieVitree = 380000;
    const montantBaies = qBaiesVitrees * puBaieVitree;
    const qPorteBlindee = 1;
    const puPorteBlindee = 450000;
    const montantPorteBlindee = qPorteBlindee * puPorteBlindee;
    const totalMenuiseriesF = montantPortesInt + montantChassisAlu + montantBaies + montantPorteBlindee;

    // Peinture décomposée
    const sMursEnduit = Math.round(surface * 2.8);
    const puEnduit = 1600;
    const montantEnduit = sMursEnduit * puEnduit;
    const sImpression = sMursEnduit;
    const puImpression = 950;
    const montantImpression = sImpression * puImpression;
    const sPeintureInt = sMursEnduit;
    const puPeintureInt = 1850;
    const montantPeintureInt = sPeintureInt * puPeintureInt;
    const totalPeintureF = montantEnduit + montantImpression + montantPeintureInt;

    const totalSecondOeuvreFournitures = totalLotCarrelageF + totalFaienceF + totalEtancheiteF + totalEtancheiteHumideF + totalPlomberieF + totalElectriciteF + totalMenuiseriesF + totalPeintureF;
    const totalMainOeuvreF = Math.round(totalSecondOeuvreFournitures * 0.38);
    const totalTCEFinitions = totalSecondOeuvreFournitures + totalMainOeuvreF;

    // =========================================================================
    // PAGE 1 : CARRELAGE & ÉTANCHÉITÉ TOITURE
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie I : Revêtements de Sol, Faïences Murales & Étanchéité Toiture", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÈTRES DES FINITIONS & SPÉCIFICATIONS DU STANDING", MARGIN_LEFT + 4, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface Développée : env. ${surface} m²`, MARGIN_LEFT + 4, 75);
    doc.text(`Standing Choisi : ${standing.toUpperCase()}`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Revêtement Sol : ${tileType.replace(/_/g, ' ').toUpperCase()}`, 108, 69);
    doc.text(`Menuiseries : ${joineryType.replace(/_/g, ' ').toUpperCase()}`, 108, 75);
    doc.text(`Délai Levée Réserves : ${delaiReserves} jours calendaires`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. LOT REVÊTEMENTS DE SOL & FAÏENCES MURALES (DTU 52.1)");

    const carrelageRows = [
      ["Carrelage Sol Séjour & Chambres", `${sSolCarrelee} m²`, `${formatFCFA(prixCarrelageM2)} / m²`, formatFCFA(totalCarrelageSolF), "Grès cérame émaillé antidérapant R10"],
      ["Faïences Murales Cuisines & Salles d'Eau", `${sMursFaience} m²`, `${formatFCFA(prixFaienceM2)} / m²`, formatFCFA(totalFaienceF), "Carreaux muraux jusqu'à 2,10 m de hauteur"],
      ["Mortier-Colle C2TE Spécial Fortes Chaleurs", `${sacsColleRequis} Sacs (25 kg)`, "4 500 FCFA / Sac", formatFCFA(totalColleF), "Rendement indicatif : 6,5 m² / sac (double encollage)"],
      ["Joint de Carrelage Hydrofuge & Anti-Moisissures", `${sacsJointRequis} Sacs (5 kg)`, "3 500 FCFA / Sac", formatFCFA(totalJointF), "Rendement indicatif : 22 m² / sac (largeur 3 mm)"],
      ["TOTAL FOURNITURES CARRELAGE & FAÏENCE", "-", "-", formatFCFA(totalLotCarrelageF + totalFaienceF), "Fournitures complètes avec colles et joints"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Désignation du Poste', 'Surface / Quantité', 'Fourniture & Pose', 'Montant Estimatif HT', 'Prescription DTU']],
      carrelageRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 44 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "II. LOT ÉTANCHÉITÉ TOITURE-TERRASSE & PIÈCES HUMIDES (DTU 43.1)");

    const etancheiteRows = [
      ["Complexe Toiture Terrasse Accessible", `${sToitureTerrasse} m²`, "Bicouche bitumineux élastomère SBS 4 mm", formatFCFA(totalEtancheiteF), "Relevés d'étanchéité 15 cm + chape de protection"],
      ["Étanchéité sous Carrelage Salles d'Eau", `${nbSallesEau} Salles d'eau`, "Système d'Étanchéité Liquide (SEL)", formatFCFA(totalEtancheiteHumideF), "Traitement rigoureux des siphons et pieds de cloisons"],
      ["Forme de Pente & Évacuations Pluviales", `${sToitureTerrasse} m²`, "Pente minimale 1,5% vers gargouilles", "Inclus gros œuvre", "Deux moignons d'évacuation par terrasse au minimum"],
      ["TOTAL ESTIMATIF ÉTANCHÉITÉ OUVRAGES", "-", "-", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), "Protection vitale contre les sinistres d'hivernage"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Ouvrage d\'Étanchéité', 'Surface Traitée', 'Système Préconisé', 'Montant Estimatif HT', 'Règle Normative']],
      etancheiteRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 32 },
        3: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 40 }
      }
    ));

    // =========================================================================
    // PAGE 2 : PLOMBERIE EU/EP & ÉLECTRICITÉ
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie II : Plomberie Sanitaire (EU/EP) & Électricité Basse Tension (NF C 15-100)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. LOT PLOMBERIE SANITAIRE & ÉVACUATIONS EU/EP (DTU 60.1)");

    const plomberieRows = [
      ["Appareils Sanitaires (WC suspendus / Lavabos)", `${qSanitaires} Ensembles`, `${formatFCFA(puSanitaires)} / Ens.`, formatFCFA(montantSanitaires), "Cuvettes céramique NF avec mécanisme silencieux"],
      ["Robinetterie & Mitigeurs Céramiques", `${qMitigeurs} Pièces`, `${formatFCFA(puMitigeurs)} / U`, formatFCFA(montantMitigeurs), "Mitigeurs chromés cartouche céramique 35 mm"],
      ["Réseaux Alimentation PER/Multicouche", `${qAlim} Salles de bain`, `${formatFCFA(puAlim)} / Ens.`, formatFCFA(montantAlim), "Tubes sous gaine anti-corrosion sans raccord encastré"],
      ["Évacuations Eaux Usées / Eaux Pluviales (EU/EP)", "Ensemble réseau", "Forfait calibré", "Inclus aux postes", "Tubes PVC NF évacuation de 50, 100 et 110 mm"],
      ["TOTAL ESTIMATIF PLOMBERIE EU/EP", "-", "-", formatFCFA(totalPlomberieF), "Fourniture des équipements et collecteurs"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Équipement Sanitaire / Réseau', 'Quantitatif', 'Prix Unitaire Estimé', 'Montant Total HT', 'Prescription DTU 60.1']],
      plomberieRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 46 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "IV. LOT ÉLECTRICITÉ & COURANTS FAIBLES (NORME NF C 15-100)");

    const electriciteRows = [
      ["Points Électriques Calibrés (0,55 pt/m²)", `${nbPointsElec} Points`, `${formatFCFA(puPointElec)} / Pt`, formatFCFA(montantPoints), "Prises de courant, éclairages LED, interrupteurs Legrand"],
      ["Tableaux Divisionnaires avec Différentiels 30mA", `${qTableaux} Tableau(x)`, `${formatFCFA(puTableaux)} / U`, formatFCFA(montantTableaux), "Protection par disjoncteurs magnétothermiques normalisés"],
      ["Lignes Climatisation Dédiées (Courbe C)", `${qClim} Lignes`, `${formatFCFA(puClim)} / Ligne`, formatFCFA(montantClim), "Lignes séparées 2.5 mm² sous disjoncteur courbe C 16A/20A"],
      ["Réseau de Terre & Liaison Équipotentielle", "1 Réseau complet", "Seuil normatif < 100 Ohms", "Inclus au lot", "Tension de sécurité 50V max pour locaux humides"],
      ["TOTAL ESTIMATIF ÉLECTRICITÉ NF C 15-100", "-", "-", formatFCFA(totalElectriciteF), "Conforme aux normes de sécurité électrique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Composant de l\'Installation', 'Quantitatif Calibré', 'Prix Unitaire Estimé', 'Montant Total HT', 'Exigence Normative']],
      electriciteRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 46 }
      }
    ));

    // =========================================================================
    // PAGE 3 : MENUISERIES & PEINTURE (DÉCOMPOSITION Q — PU)
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie III : Menuiseries Int./Ext. (Q — PU) & Peintures Normalisées (DTU 59.1)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. LOT MENUISERIES EXTÉRIEURES & INTÉRIEURES (DÉCOMPOSITION Q — PU)");

    const menuiseriesRows = [
      ["Portes Intérieures Isoplanes Gravées", `${qPortesInt} Blocs`, `${formatFCFA(puPorteInt)} / U`, formatFCFA(montantPortesInt), "Huisseries métalliques traitées anti-corrosion + serrures"],
      ["Châssis Coulissants Alu Vitré (Fenêtres)", `${qChassisAlu} Châssis`, `${formatFCFA(puChassisAlu)} / U`, formatFCFA(montantChassisAlu), "Alu laqué 1.4 mm avec vitrage Stopsol 6 mm"],
      ["Grandes Baies Vitrées Coulissantes Salon", `${qBaiesVitrees} Baie(s)`, `${formatFCFA(puBaieVitree)} / U`, formatFCFA(montantBaies), "Profilés alu renforcés et roulements à billes inox étanches"],
      ["Porte d'Entrée Principale Sécurisée", `${qPorteBlindee} Porte`, `${formatFCFA(puPorteBlindee)} / U`, formatFCFA(montantPorteBlindee), "Porte blindée acier 7 points ou bois massif traité"],
      ["TOTAL ESTIMATIF LOT MENUISERIES", "-", "-", formatFCFA(totalMenuiseriesF), "Fourniture et pose complète des menuiseries"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Type de Menuiserie', 'Nombre / Dimensions', 'Prix Unitaire Estimé', 'Montant Total HT', 'Spécification Technique']],
      menuiseriesRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 44 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "VI. LOT PEINTURE, ENDUITS & FINITIONS DÉCORATIVES (DTU 59.1)");

    const peintureRows = [
      ["Enduit de Rebouchage & Ratissage Complet", `${sMursEnduit} m²`, `${formatFCFA(puEnduit)} / m²`, formatFCFA(montantEnduit), "Deux passes croisées avec ponçage fin anti-rayures"],
      ["Couche d'Impression Fixatrice Régulatrice", `${sImpression} m²`, `${formatFCFA(puImpression)} / m²`, formatFCFA(montantImpression), "Sous-couche hydrofuge acrylique régulatrice de fond"],
      ["Peinture Intérieure Acrylique Veloutée", `${sPeintureInt} m²`, `${formatFCFA(puPeintureInt)} / m²`, formatFCFA(montantPeintureInt), "Deux couches lavables haute résistance Seigneurie / Astral"],
      ["TOTAL ESTIMATIF LOT PEINTURE", "-", "-", formatFCFA(totalPeintureF), "Application soignée sur murs et plafonds"]
    ];

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Phase & Support de Peinture', 'Surface Traitée', 'Prix au m² Estimé', 'Montant Total HT', 'Prescription DTU 59.1']],
      peintureRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 46 }
      }
    ));

    // =========================================================================
    // PAGE 4 : RÉCAPITULATIF BUDGÉTAIRE & PV DE RÉCEPTION CONTRADICTOIRE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie IV : Synthèse Budgétaire TCE & Procès-Verbal de Réception Contradictoire (COCC)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÉCAPITULATIF BUDGÉTAIRE GLOBAL SECOND œUVRE TCE");

    const recapTceRows = [
      ["Lot 1 : Carrelages, Faïences, Colles & Joints", formatFCFA(totalLotCarrelageF + totalFaienceF), `${Math.round(((totalLotCarrelageF + totalFaienceF) / totalTCEFinitions) * 100)} %`, "Grès cérame, colles C2TE et joints hydrofuges inclus"],
      ["Lot 2 : Étanchéité Toiture Terrasse & Pièces Humides", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), `${Math.round(((totalEtancheiteF + totalEtancheiteHumideF) / totalTCEFinitions) * 100)} %`, "Complexe bicouche 4 mm sablé et SEL salles d'eau"],
      ["Lot 3 : Plomberie Sanitaire & Réseau Évacuations EU/EP", formatFCFA(totalPlomberieF), `${Math.round((totalPlomberieF / totalTCEFinitions) * 100)} %`, "Sanitaires, mitigeurs et réseaux sans soudure encastrée"],
      ["Lot 4 : Électricité, Tableaux & Lignes Clim (NF C 15-100)", formatFCFA(totalElectriciteF), `${Math.round((totalElectriciteF / totalTCEFinitions) * 100)} %`, `${nbPointsElec} points électriques, disjoncteurs et réseau terre`],
      ["Lot 5 : Menuiseries Intérieures & Extérieures", formatFCFA(totalMenuiseriesF), `${Math.round((totalMenuiseriesF / totalTCEFinitions) * 100)} %`, "Portes isoplanes, châssis alu et baie vitrée salon"],
      ["Lot 6 : Peinture Intérieure & Enduits Ratissés", formatFCFA(totalPeintureF), `${Math.round((totalPeintureF / totalTCEFinitions) * 100)} %`, "Enduits croisés et 2 couches acrylique veloutée"],
      ["Main d'œuvre Spécialisée Pose & Finitions", formatFCFA(totalMainOeuvreF), `${Math.round((totalMainOeuvreF / totalTCEFinitions) * 100)} %`, "Artisans qualifiés avec assurance et respect des DTU"],
      ["BUDGET TOTAL ESTIMATIF SECOND œUVRE TCE", formatFCFA(totalTCEFinitions), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalTCEFinitions / surface))} / m² SDP`]
    ];

    // Vérification de la somme des lignes récapitulatives
    const sommeLignesRecap = (totalLotCarrelageF + totalFaienceF) + (totalEtancheiteF + totalEtancheiteHumideF) + totalPlomberieF + totalElectriciteF + totalMenuiseriesF + totalPeintureF + totalMainOeuvreF;
    if (sommeLignesRecap !== totalTCEFinitions) throw new Error("Incohérence somme récapitulative finitions");

    doc.autoTable(createTableOptions(
      currentY + 3.8,
      [['Lot Technique Second œuvre', 'Montant Estimatif HT', 'Quote-Part TCE', 'Observations & Priorités']],
      recapTceRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 34, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 62 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 6.5;
    drawSectionTitle(doc, currentY, "VIII. PROCÈS-VERBAL DE RÉCEPTION CONTRADICTOIRE DES TRAVAUX (COCC)");

    // Cadre officiel PV de réception
    const pvBoxY = currentY + 3.8;
    const pvBoxHeight = 56;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("ACTE JURIDIQUE DE RÉCEPTION DES TRAVAUX (ARTICLE 740 DU COCC)", MARGIN_LEFT + 4, pvBoxY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName} • Réf Dossier : ${refDoc} • Date de visite : ${currentDate}`, MARGIN_LEFT + 4, pvBoxY + 11.5);
    doc.text(`Entrepreneur / Tâcheron en charge des travaux : ....................................................................................................`, MARGIN_LEFT + 4, pvBoxY + 16.5);

    doc.setFont('helvetica', 'bold');
    doc.text("DÉCISION CONTRADICTOIRE DES PARTIES :", MARGIN_LEFT + 4, pvBoxY + 22.5);
    doc.setFont('helvetica', 'normal');
    doc.text("[ ] RÉCEPTION PRONONCÉE SANS RÉSERVE : L'ouvrage est conforme aux règles de l'art.", MARGIN_LEFT + 8, pvBoxY + 27.5);
    doc.text(`[ ] RÉCEPTION PRONONCÉE AVEC RÉSERVES : Les désordres consignés doivent être levés sous ${delaiReserves} jours.`, MARGIN_LEFT + 8, pvBoxY + 32.5);

    doc.text(`Délai impératif accordé à l'entrepreneur pour la levée intégrale des réserves : ${delaiReserves} jours calendaires.`, MARGIN_LEFT + 4, pvBoxY + 38.5);
    doc.text("La retenue de garantie contractuelle de 5% (COCC) demeure consignée jusqu'au PV de levée des réserves.", MARGIN_LEFT + 4, pvBoxY + 43);

    // Signatures
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text("Signature Maître d'Ouvrage :", MARGIN_LEFT + 15, pvBoxY + 49);
    doc.text("Signature Entrepreneur / Tâcheron :", 115, pvBoxY + 49);
    doc.setDrawColor(148, 163, 184);
    doc.line(MARGIN_LEFT + 10, pvBoxY + 53, MARGIN_LEFT + 65, pvBoxY + 53);
    doc.line(110, pvBoxY + 53, 165, pvBoxY + 53);
  }

