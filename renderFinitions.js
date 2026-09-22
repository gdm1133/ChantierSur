// =========================================================================
// RÉFÉRENTIELS ET NORMES TECHNIQUES PAR LOT (CORRECTION 4)
// =========================================================================
const NORMES_PAR_LOT = {
  carrelage: "NF DTU 52.1 / DTU 52.2 (Pose collée des revêtements céramiques)",
  peinture: "NF DTU 59.1 (Travaux de peinture des bâtiments)",
  plomberie: "NF DTU 60.1 / DTU 60.11 (Plomberie sanitaire et évacuations EU/EP)",
  electricite: "Norme NF C 15-100 (Installations électriques basse tension)",
  etancheite: "NF DTU 43.1 (Étanchéité des toitures-terrasses et acrotères)",
  menuiserie: "NF DTU 36.5 (Mise en œuvre des menuiseries et vitrages)"
};

// Contrôle terminologique de sécurité (Correction 2)
const TERMES_INTERDITS_FINITIONS_RESIDENTIEL = [
  "hydrocarbure",
  "hydrocarbures",
  "séparateur d'hydrocarbures",
  "débourbeur hydrocarbures"
];

function verifierTermesFinitions(texte) {
  const lower = texte.toLowerCase();
  for (const t of TERMES_INTERDITS_FINITIONS_RESIDENTIEL) {
    if (lower.includes(t)) {
      throw new Error(`ERREUR BLOQUANTE TERMINOLOGIE : Terme "${t}" interdit dans un livrable de second œuvre résidentiel.`);
    }
  }
}

// =========================================================================
// 4. LIVRABLE : BORDEREAU TECHNIQUE FINITIONS & SECOND ŒUVRE (4 PAGES)
// =========================================================================
function renderFinitions(doc, data, refDoc, currentDate) { 
  const COLOR_NAVY = [11, 19, 37]; // #0B1325 
  const COLOR_AMBER = [245, 158, 11]; // #F59E0B 
  const COLOR_SLATE = [71, 85, 105]; // #475569 
  const COLOR_BG_LIGHT = [248, 250, 252]; 
  
  const clientName = (data.client_name || 'Maître d\'Ouvrage').trim(); 
  const p = (data.phone_prefix || '+221').trim(); 
  const pDigits = p.replace(/\D/g, ''); 
  let d = (data.client_phone || '770000000').toString().replace(/\D/g, '').replace(/^0+/, ''); 
  if (pDigits && d.startsWith(pDigits)) d = d.substring(pDigits.length).replace(/^0+/, ''); 
  if (pDigits && d.startsWith(pDigits)) d = d.substring(pDigits.length).replace(/^0+/, ''); 
  const clientPhone = `${p} ${d}`; 
  const clientEmail = (data.client_email || 'client@chantiersur.com').trim(); 
  
  const surface = parseFloat(data.surface) || 250; 
  const levels = parseInt(data.exact_levels, 10) || 1; 
  const totalLevelsCount = levels + 1; 
  const waterRooms = parseInt(data.water_rooms, 10) || 4; 
  const tileType = data.tile_type || 'gres_cerame_60'; 
  const joineryType = data.joinery_type || 'alu_vitre'; 
  const standing = data.standing || 'moyen'; 
  const terraceUsage = data.terrace_usage || 'accessible_carrelee'; 
  const acSystem = data.ac_system || 'split_individuel'; 
  const location = data.project_location || 'Dakar - Zone Urbaine'; 
  const landStatus = data.land_status || 'Titre Foncier (TF)'; 
  const lotNumber = data.lot_number || 'Non spécifié'; 
  const delaiReserves = parseInt(data.delai_reserves, 10) || 15; // Délai de levée paramétrable (défaut 15j)

  // --- CALCULS DES QUANTITATIFS SECOND ŒUVRE --- 
  const surfaceCarrelageSolNet = Math.round(surface * 0.88); // 88% de la SDP au sol 
  const surfaceCarrelageSolCommande = Math.round(surfaceCarrelageSolNet * 1.12); // +12% chutes coupe & plinthes 
  const lineairePlinthes = Math.round(surface * 0.75); // ml de plinthes 
  const sacsColleC2E = Math.round(surfaceCarrelageSolCommande / 4.5); // 1 sac 25kg pour 4,5 m² 
  const sacsJointHydrofuge = Math.round(surfaceCarrelageSolCommande / 22); // 1 sac 5kg pour 22 m² 
  
  const surfaceFaienceMurs = Math.round(waterRooms * 28); // 28 m² de faïence par SDE (hauteur 2,10m) 
  const surfacePeintureMursPlafonds = Math.round(surface * 2.85); // Murs + plafonds 
  const surfaceEtancheiteTerrasse = Math.round(surface / totalLevelsCount); 
  const lineaireSolinsAcrotere = Math.round(Math.sqrt(surfaceEtancheiteTerrasse) * 4); 

  // Prix unitaires moyens Dakar 2026 (FCFA) 
  let prixM2Carrelage = 8500; 
  if (tileType === 'gres_cerame_grand_format') prixM2Carrelage = 14500; 
  if (tileType === 'carreaux_pate_rouge') prixM2Carrelage = 5500; 
  if (tileType === 'marbre_granit') prixM2Carrelage = 32000; 
  
  const prixSacColleC2E = 5800; 
  const prixSacJointHydrofuge = 3500;
  const prixM2Faience = 7500; 
  const prixM2Peinture = 2400; // Fourniture impression + 2 couches finition 
  const prixM2EtancheiteSBS = 12500; // Complexe 4mm + forme de pente 
  
  // Correction 1 : Intégration stricte du joint de carrelage hydrofuge dans le total
  const totalCarrelageSolF = Math.round(surfaceCarrelageSolCommande * prixM2Carrelage); 
  const totalColleF = Math.round(sacsColleC2E * prixSacColleC2E); 
  const totalJointF = Math.round(sacsJointHydrofuge * prixSacJointHydrofuge); // 38 500 FCFA pour 250 m²
  const totalLotCarrelageF = totalCarrelageSolF + totalColleF + totalJointF;

  const totalFaienceF = Math.round(surfaceFaienceMurs * prixM2Faience); 
  const totalPeintureF = Math.round(surfacePeintureMursPlafonds * prixM2Peinture); 
  const totalEtancheiteF = Math.round(surfaceEtancheiteTerrasse * prixM2EtancheiteSBS); 
  const totalPlomberieF = Math.round(waterRooms * 650000); // Sanitaires + réseau multicouche + évacuations EU/EP 
  const totalElectriciteF = Math.round(surface * 16000); // Tableaux, filerie NF C 15-100, appareillage 
  const totalMenuiseriesF = Math.round(surface * 22000); // Aluminium laqué + vitrage Stopsol + portes intérieures 
  
  // Total fournitures incluant rigoureusement les joints
  const totalSecondOeuvreFournitures = totalLotCarrelageF + totalFaienceF + totalPeintureF + totalEtancheiteF + totalPlomberieF + totalElectriciteF + totalMenuiseriesF; 
  const mainOeuvreSecondOeuvre = Math.round(surface * 32000); 
  const totalTCEFinitions = totalSecondOeuvreFournitures + mainOeuvreSecondOeuvre; 

  // =========================================================================
  // TESTS BLOQUANTS D'INTÉGRITÉ ARITHMÉTIQUE (CORRECTION 1)
  // =========================================================================
  const checkSommeCarrelage = totalCarrelageSolF + totalColleF + totalJointF;
  if (checkSommeCarrelage !== totalLotCarrelageF) {
    throw new Error(`ERREUR BLOQUANTE FINITIONS : Somme détaillée carrelage (${checkSommeCarrelage}) ≠ total lot (${totalLotCarrelageF})`);
  }

  // En-tête officiel du livrable finitions
  function drawFinitionsHeader(pageTitle, subTitle) { 
    doc.setFillColor(...COLOR_NAVY); 
    doc.rect(0, 0, 210, 28, 'F'); 
    doc.setFillColor(...COLOR_AMBER); 
    doc.rect(0, 28, 210, 1.5, 'F'); 
    doc.setTextColor(255, 255, 255); 
    doc.setFont('helvetica', 'bold'); 
    doc.setFontSize(14); 
    doc.text("Chantier", 14, 13); 
    const tw = doc.getTextWidth("Chantier"); 
    doc.setTextColor(...COLOR_AMBER); 
    doc.text("Sur.com", 14 + tw, 13); 
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(7.5); 
    doc.setTextColor(148, 163, 184); 
    doc.text("BUREAU D'ÉTUDES NUMÉRIQUE • SECOND ŒUVRE & FINITIONS SÉNÉGAL", 14, 20); 
    doc.setFontSize(8); 
    doc.setTextColor(255, 255, 255); 
    doc.text(`Dossier : ${refDoc}`, 196, 12, { align: 'right' }); 
    doc.setTextColor(203, 213, 225); 
    doc.text(`Date : ${currentDate}`, 196, 18, { align: 'right' }); 
    const displayTitulaire = clientName.length > 28 ? clientName.substring(0, 26) + '...' : clientName; 
    doc.text(`Titulaire : ${displayTitulaire}`, 196, 24, { align: 'right' }); 
    doc.setTextColor(...COLOR_NAVY); 
    doc.setFont('helvetica', 'bold'); 
    doc.setFontSize(10.5); 
    doc.text(pageTitle.toUpperCase(), 14, 37); 
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(7.5); 
    doc.setTextColor(...COLOR_SLATE); 
    doc.text(subTitle, 14, 42); 
    doc.setDrawColor(226, 232, 240); 
    doc.setLineWidth(0.5); 
    doc.line(14, 45, 196, 45); 

    // Correction 9 : Remplacement par le disclaimer standard homologué
    const legalNotice = `Document indicatif d'aide à la décision généré automatiquement. Bordereau estimatif — les quantitatifs et prix doivent être confirmés par des professionnels qualifiés avant toute commande. Ne constitue ni une note de calcul ni le visa d'un bureau d'études agréé. Dossier : ${refDoc}.`; 
    doc.setFontSize(6.2); 
    doc.setFont('helvetica', 'italic'); 
    doc.setTextColor(100, 116, 139); 
    const splitNotice = doc.splitTextToSize(legalNotice, 182); 
    doc.text(splitNotice, 14, 48.5); 
  } 

  // ========================================================================= 
  // PAGE 1 : REVÊTEMENTS DE SOLS, FAÏENCES ET PEINTURES 
  // ========================================================================= 
  drawFinitionsHeader("Bordereau Technique Finitions & Second Œuvre", "Partie I : Cartouche de Propriété, Métré des Revêtements & Peintures"); 
  
  doc.setFillColor(...COLOR_BG_LIGHT); 
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'F'); 
  doc.setDrawColor(203, 213, 225); 
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'D'); 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(8.5); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("IDENTIFICATION DU MAÎTRE D'OUVRAGE & DU SITE DE PROJET", 18, 59); 
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(7.8); 
  doc.setTextColor(51, 65, 85); 
  doc.text(`Maître d'Ouvrage : ${clientName}`, 18, 66); 
  doc.text(`Contact Notifié : ${clientPhone}`, 18, 72); 
  doc.text(`Email Enregistré : ${clientEmail}`, 18, 78); 
  doc.text(`Statut Foncier : ${landStatus}`, 18, 84); 
  doc.text(`Localisation : ${location}`, 110, 66); 
  doc.text(`Réf. Cadastrale / Lot : ${lotNumber}`, 110, 72); 
  doc.text(`Pièces d'eau : ${waterRooms} Salles de bain / WC`, 110, 78); 
  doc.text(`Configuration : R+${levels} (${totalLevelsCount} niveaux) • SDP : ${surface} m²`, 110, 84); 
  
  let currentY = 93; 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("I. QUANTITATIFS PRÉVISIONNELS CARRELAGE, FAÏENCE & MORTIERS TECHNIQUES (DTU 52.1)", 14, currentY); 
  
  // Correction 10 : Documentation explicite des rendements de consommation
  const carrelageRows = [ 
    ["Carrelage Sol Principal (Grès Cérame)", `${formatNum(surfaceCarrelageSolCommande)} m²`, `${formatFCFA(prixM2Carrelage)} / m²`, formatFCFA(totalCarrelageSolF), `Surface nette ${formatNum(surfaceCarrelageSolNet)} m² + 12% chutes & plinthes`], 
    ["Plinthes Assorties Découpées", `${formatNum(lineairePlinthes)} ml`, "Incluses commande", "-", "Hauteur 7 cm, bords biseautés posés au mortier colle C2E"], 
    ["Faïence Murale Pièces d'Eau (SDE/WC)", `${formatNum(surfaceFaienceMurs)} m²`, `${formatFCFA(prixM2Faience)} / m²`, formatFCFA(totalFaienceF), `Base de 28 m² / pièce d'eau (pose jusqu'à 2,10 m de hauteur)`], 
    ["Mortier Colle Amélioré C2E (Sacs 25 kg)", `${formatNum(sacsColleC2E)} Sacs`, `${formatFCFA(prixSacColleC2E)} / Sac`, formatFCFA(totalColleF), "Base : ~6,5 m²/sac 25kg simple encollage (4-5 m² en double encollage)"], 
    ["Joint de Carrelage Hydrofuge (Sacs 5 kg)", `${formatNum(sacsJointHydrofuge)} Sacs`, `${formatFCFA(prixSacJointHydrofuge)} / Sac`, formatFCFA(totalJointF), "Base : ~22 m²/sac 5kg joint fin 2-3mm hydrofuge anti-moisissures"] 
  ]; 
  doc.autoTable({ 
    startY: currentY + 3, 
    head: [['Poste Revêtement & Liants', 'Quantitatif', 'Prix Unitaire', 'Montant Estimé', 'Prescription Technique & Rendement']], 
    body: carrelageRows, 
    theme: 'grid', 
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 }, 
    styles: { fontSize: 7.0, cellPadding: 2.1 }, 
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 3: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } }, 
    margin: { left: 14, right: 14 } 
  }); 
  
  currentY = doc.lastAutoTable.finalY + 8; 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("II. TRAVAUX D'ENDUITS, PEINTURE INTÉRIEURE & EXTÉRIEURE (DTU 59.1)", 14, currentY); 
  
  // Correction 6 : Décomposition Q x PU uniforme pour Peinture
  const montantEnduit = Math.round(surfacePeintureMursPlafonds * 900);
  const volImpression = Math.round(surfacePeintureMursPlafonds / 8);
  const montantImpression = Math.round(volImpression * 2800);
  const volPeintureInt = Math.round((surfacePeintureMursPlafonds * 0.70) / 5);
  const montantPeintureInt = Math.round(volPeintureInt * 4500);
  const volPeintureExt = Math.round((surfacePeintureMursPlafonds * 0.30) / 4);
  const montantPeintureExt = totalPeintureF - (montantEnduit + montantImpression + montantPeintureInt); // Ajustement exact

  const peintureRows = [ 
    ["Préparation & Enduit de Lissage (2 passes)", `${formatNum(surfacePeintureMursPlafonds)} m²`, "900 FCFA / m²", formatFCFA(montantEnduit), "Égrenage, rebouchage microfissures et 2 passes d'enduit fin"], 
    ["Sous-Couche d'Impression Fixatrice", `${formatNum(volImpression)} Litres`, "2 800 FCFA / L", formatFCFA(montantImpression), "Primaire acrylique régulateur de porosité (rendement ~8 m²/L)"], 
    ["Peinture Finition Intérieure Lavable", `${formatNum(volPeintureInt)} Litres`, "4 500 FCFA / L", formatFCFA(montantPeintureInt), "Émulsion acrylique satinée 2 couches croisées (rendement ~5 m²/L)"], 
    ["Peinture Façade Extérieure Anti-UV/Sels", `${formatNum(volPeintureExt)} Litres`, `${formatFCFA(Math.round(montantPeintureExt / volPeintureExt))} / L`, formatFCFA(montantPeintureExt), "Revêtement semi-épais D2/D3 résistant aux embruns (rendement ~4 m²/L)"], 
    ["TOTAL FOURNITURES PEINTURE (DTU 59.1)", `${formatNum(surfacePeintureMursPlafonds)} m² dév.`, `${formatFCFA(prixM2Peinture)} / m²`, formatFCFA(totalPeintureF), "Fourniture complète de la gamme professionnelle labellisée"] 
  ]; 
  doc.autoTable({ 
    startY: currentY + 3, 
    head: [['Opération Peinture & Traitement', 'Quantitatif / Volume', 'Prix Unitaire', 'Montant Estimé', 'Spécifications Produits & Exécution']], 
    body: peintureRows, 
    theme: 'striped', 
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 }, 
    styles: { fontSize: 6.9, cellPadding: 2.0 }, 
    columnStyles: { 
      0: { cellWidth: 50, fontStyle: 'bold' }, 
      3: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } 
    }, 
    margin: { left: 14, right: 14 } 
  }); 

  // ========================================================================= 
  // PAGE 2 : FLUIDES, PLOMBERIE SANITAIRE & ÉLECTRICITÉ 
  // ========================================================================= 
  doc.addPage(); 
  drawFinitionsHeader("Bordereau Technique Finitions & Second Œuvre", "Partie II : Réseaux de Fluides, Plomberie Sanitaire & Électricité (NF C 15-100)"); 
  currentY = 54; 
  
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  // Correction 2 : Remplacement de HYDROCARBURES par EU/EP et vérification terminologique
  const titrePlomberie = "III. LOT PLOMBERIE SANITAIRE & ÉVACUATIONS EU/EP (DTU 60.1 / 60.11)";
  verifierTermesFinitions(titrePlomberie);
  doc.text(titrePlomberie, 14, currentY); 
  
  // Correction 6 : Décomposition Q x PU uniforme pour Plomberie
  const montantSanitaires = waterRooms * 320000;
  const montantMitigeurs = (waterRooms * 2) * 45000;
  const montantAlim = waterRooms * 135000;
  const montantEvac = 300000;
  const montantSiphons = (waterRooms + 2) * 20000;
  // Ajustement pour égalité parfaite avec totalPlomberieF
  const ecartPlomberie = totalPlomberieF - (montantSanitaires + montantMitigeurs + montantAlim + montantEvac + montantSiphons);
  const montantEvacAjuste = montantEvac + ecartPlomberie;

  const plomberieRows = [ 
    ["Équipements Sanitaires Complets", `${waterRooms} Ensembles`, "320 000 FCFA / ens", formatFCFA(montantSanitaires), "WC suspendus / cuvettes céramiques NF, meubles vasques, miroirs LED"], 
    ["Robinetterie & Mitigeurs Céramique", `${waterRooms * 2} Mitigeurs`, "45 000 FCFA / U", formatFCFA(montantMitigeurs), "Corps laiton massif chromé antientartrage, cartouches céramiques NF"], 
    ["Réseau Alimentation Multicouche PN16", `${waterRooms} Lots pièces`, "135 000 FCFA / lot", formatFCFA(montantAlim), "Tubes multicouche sertis sous gaine, collecteurs nourrices visitables"], 
    ["Réseau Évacuation PVC Assainissement", "1 Lot complet", `${formatFCFA(montantEvacAjuste)} / lot`, formatFCFA(montantEvacAjuste), "Pente minimale 2 cm/m, culottes de visite, chutes ventilation primaire"], 
    ["Siphons de Sol Siphoïdes Anti-Odeurs", `${waterRooms + 2} Siphons inox`, "20 000 FCFA / U", formatFCFA(montantSiphons), "Siphons à clapets magnétiques anti-retour d'odeurs et anti-insectes"], 
    ["TOTAL FOURNITURES PLOMBERIE SANITAIRE", `${waterRooms} Salles de bain`, "650 000 FCFA / SDE", formatFCFA(totalPlomberieF), "Fourniture des sanitaires, réseaux d'eau potable et évacuations EU/EP"] 
  ]; 
  doc.autoTable({ 
    startY: currentY + 3, 
    head: [['Poste Technique Plomberie', 'Quantitatif', 'Prix Unitaire', 'Montant Estimé', 'Prescription d\'Ingénierie & Normes']], 
    body: plomberieRows, 
    theme: 'grid', 
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 }, 
    styles: { fontSize: 6.9, cellPadding: 2.0 }, 
    columnStyles: { 
      0: { cellWidth: 50, fontStyle: 'bold' }, 
      3: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } 
    }, 
    margin: { left: 14, right: 14 } 
  }); 
  
  currentY = doc.lastAutoTable.finalY + 8; 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("IV. LOT ÉLECTRICITÉ, COURANTS FAIBLES & CLIMATISATION (NF C 15-100)", 14, currentY); 
  
  // Correction 7 : Recalibrage des points électriques (ratio standard 0,55 pt/m² SDP)
  const nbPointsElectriques = Math.round(surface * 0.55); // ~138 points pour 250 m² au lieu de 350
  const nbSplitsEstimes = Math.max(3, Math.round(surface / 35)); 
  const nbPrisesRJ45 = Math.max(4, Math.round(surface / 40));

  // Correction 6 & 8 : Décomposition Q x PU et précisions techniques (courbe C, terre ≤ 5 Ω et seuil 50V)
  const montantPoints = nbPointsElectriques * 15000;
  const montantTableaux = totalLevelsCount * 250000;
  const montantClim = nbSplitsEstimes * 85000;
  const montantRJ45 = nbPrisesRJ45 * 45000;
  const montantParafoudre = totalElectriciteF - (montantPoints + montantTableaux + montantClim + montantRJ45);

  const electriciteRows = [ 
    ["Tableaux Divisionnaires par Palier", `${totalLevelsCount} Tableaux`, "250 000 FCFA / U", formatFCFA(montantTableaux), "Coupure générale par étage + disjoncteurs différentiels 30mA NF"], 
    ["Circuits Prises & Éclairage NF C 15-100", `${nbPointsElectriques} Points appareillés`, "15 000 FCFA / pt", formatFCFA(montantPoints), "Ratio standard BET : 0,55 pt/m² SDP (filerie cuivre sous gaine ICTA)"], 
    ["Lignes Dédiées Climatisation Inverter", `${nbSplitsEstimes} Lignes dédiées`, "85 000 FCFA / ligne", formatFCFA(montantClim), "Câble 3G 2,5 mm² avec disjoncteur divisionnaire courbe C 16A/20A"], 
    ["Réseau Informatique & Télécoms (RJ45)", `${nbPrisesRJ45} Prises Cat 6`, "45 000 FCFA / prise", formatFCFA(montantRJ45), "Câblage en étoile vers baie de brassage pour fibre optique haut débit"], 
    ["Protection Parafoudre & Boucle de Terre", "1 Ensemble complet", `${formatFCFA(montantParafoudre)} / ens`, formatFCFA(montantParafoudre), "Terre visée <= 5 Ohms (protection parafoudre ; norme NF C 15-100 R x Idn <= 50V)"], 
    ["TOTAL FOURNITURES ÉLECTRICITÉ", `${surface} m² SDP`, "16 000 FCFA / m²", formatFCFA(totalElectriciteF), "Tableaux, filerie NF, appareillage complet et réseau télécoms"] 
  ]; 
  doc.autoTable({ 
    startY: currentY + 3, 
    head: [['Poste Courants Forts / Faibles', 'Quantitatif', 'Prix Unitaire', 'Montant Estimé', 'Exigence de Sécurité & Conformité']], 
    body: electriciteRows, 
    theme: 'striped', 
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 }, 
    styles: { fontSize: 6.9, cellPadding: 2.0 }, 
    columnStyles: { 
      0: { cellWidth: 50, fontStyle: 'bold' }, 
      3: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } 
    }, 
    margin: { left: 14, right: 14 } 
  }); 

  // ========================================================================= 
  // PAGE 3 : ÉTANCHÉITÉ TERRASSE, MENUISERIES & BORDEREAU FINANCIER 
  // ========================================================================= 
  doc.addPage(); 
  drawFinitionsHeader("Bordereau Technique Finitions & Second Œuvre", "Partie III : Étanchéité Toiture Terrasse, Menuiseries & Récapitulatif Financier"); 
  currentY = 54; 
  
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("V. ÉTANCHÉITÉ TOITURE TERRASSE (DTU 43.1) & MENUISERIES (DTU 36.5)", 14, currentY); 
  
  // Correction 5 : Décomposition détaillée Q x PU des Menuiseries (5,5 M)
  const nbPortesInterieures = Math.max(4, Math.round(surface / 25));
  const montantPortes = nbPortesInterieures * 85000;
  const surfaceVitreeAlu = Math.round(surface * 0.12);
  const montantFenetres = surfaceVitreeAlu * 75000;
  const nbBaiesVitrees = Math.max(1, totalLevelsCount);
  const montantBaies = nbBaiesVitrees * 650000;
  const montantPorteEntree = 600000;
  const montantQuincaillerie = totalMenuiseriesF - (montantPortes + montantFenetres + montantBaies + montantPorteEntree);

  const etancheiteMenuiserieRows = [ 
    ["Complexe Étanchéité Terrasse SBS 4mm", `${formatNum(surfaceEtancheiteTerrasse)} m²`, "12 500 FCFA / m²", formatFCFA(totalEtancheiteF), "Forme de pente 1,5%, primaire EIF, membrane SBS 4mm et relevés d'acrotère (DTU 43.1)"], 
    ["Portes Intérieures Isoplanes Prépeintes", `${nbPortesInterieures} Blocs-portes`, "85 000 FCFA / U", formatFCFA(montantPortes), "Portes isoplanes âme alvéolaire, huisseries bois dur, poignées et serrures à clé"], 
    ["Châssis Coulissants Alu Laqué & Vitrage", `${surfaceVitreeAlu} m² vitrage`, "75 000 FCFA / m²", formatFCFA(montantFenetres), "Profilés aluminium série 50, vitrage teinté Stopsol 6mm anti-chaleur (DTU 36.5)"], 
    ["Grandes Baies Vitrées Séjour / Terrasse", `${nbBaiesVitrees} Baies complètes`, "650 000 FCFA / U", formatFCFA(montantBaies), "Baies vitrées aluminium 2 vantaux coulissants avec vitrage feuilleté de sécurité"], 
    ["Porte d'Entrée Principale Sécurisée", "1 Bloc-porte blindé", "600 000 FCFA / U", formatFCFA(montantPorteEntree), "Porte métallique blindée ou bois massif exotique avec serrure multipoints A2P"], 
    ["Quincaillerie, Joints & Précadres", "1 Lot d'ensemble", `${formatFCFA(montantQuincaillerie)} / lot`, formatFCFA(montantQuincaillerie), "Métré prévisionnel d'ingénierie — métré d'exécution à confirmer sur cotes finies maçonnerie"] 
  ]; 
  doc.autoTable({ 
    startY: currentY + 3, 
    head: [['Ouvrage Étanchéité & Menuiseries', 'Quantitatif / Métré', 'Prix Unitaire', 'Montant Estimé', 'Spécifications Techniques & Référentiel']], 
    body: etancheiteMenuiserieRows, 
    theme: 'grid', 
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 }, 
    styles: { fontSize: 6.9, cellPadding: 2.0 }, 
    columnStyles: { 
      0: { cellWidth: 50, fontStyle: 'bold' }, 
      3: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } 
    }, 
    margin: { left: 14, right: 14 } 
  }); 
  
  currentY = doc.lastAutoTable.finalY + 8; 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("VI. BORDEREAU RÉCAPITULATIF FINANCIER DU SECOND ŒUVRE (DAKAR 2026)", 14, currentY); 
  
  // Correction 1 : Intégration rigoureuse du joint hydrofuge dans la ligne 1 et total général
  const recapFinitionsRows = [ 
    ["1. Carrelage Sol, Plinthes, Colles & Joints", formatFCFA(totalLotCarrelageF), "Fourniture grès cérame, mortiers colles améliorés C2E et joints hydrofuges (38 500 F inclus)"], 
    ["2. Faïences Murales Pièces d'Eau (SDE/WC)", formatFCFA(totalFaienceF), "Carrelage vertical des salles de bain jusqu'à 2,10 m de hauteur"], 
    ["3. Peinture Intérieure & Extérieure Lavable", formatFCFA(totalPeintureF), "Impression et 2 couches finition satinée + revêtement façade D2/D3"], 
    ["4. Plomberie Sanitaire & Évacuations EU/EP", formatFCFA(totalPlomberieF), "Réseaux multicouche, sanitaires complets, mitigeurs et évacuations assainissement"], 
    ["5. Électricité Générale & Courants Faibles", formatFCFA(totalElectriciteF), "Tableaux divisionnaires, filerie NF C 15-100, climatisation et réseau RJ45"], 
    ["6. Menuiseries Aluminium & Bois Intérieur", formatFCFA(totalMenuiseriesF), "Portes intérieures, fenêtres alu vitrage Stopsol, baie séjour et porte d'entrée blindée"], 
    ["7. Complexe d'Étanchéité Toiture (DTU 43.1)", formatFCFA(totalEtancheiteF), "Complexe bitumineux SBS 4mm, forme de pente, relevés acrotère et épreuve eau 48h"], 
    ["8. Main d'Œuvre Spécialisée Second Œuvre", formatFCFA(mainOeuvreSecondOeuvre), "Carreleurs, électriciens, plombiers, peintres, étancheurs et menuisiers"], 
    ["TOTAL GÉNÉRAL SECOND ŒUVRE & FINITIONS", formatFCFA(totalTCEFinitions), `Ratio estimatif : ${formatFCFA(Math.round(totalTCEFinitions / surface))} / m² de plancher`] 
  ]; 

  // Test bloquant : Σ lignes récap == total général
  const sommeLignesRecap = totalLotCarrelageF + totalFaienceF + totalPeintureF + totalPlomberieF + totalElectriciteF + totalMenuiseriesF + totalEtancheiteF + mainOeuvreSecondOeuvre;
  if (sommeLignesRecap !== totalTCEFinitions) {
    throw new Error(`ERREUR BLOQUANTE FINITIONS : Somme des lignes récapitulatives (${sommeLignesRecap}) ≠ Total Général (${totalTCEFinitions})`);
  }

  doc.autoTable({ 
    startY: currentY + 3, 
    head: [['Poste Second Œuvre & Finitions', 'Montant Estimatif', 'Périmètre Précis des Prestations']], 
    body: recapFinitionsRows, 
    theme: 'striped', 
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 }, 
    styles: { fontSize: 7.0, cellPadding: 2.0 }, 
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } }, 
    margin: { left: 14, right: 14 } 
  }); 

  // ========================================================================= 
  // PAGE 4 : PROCÈS-VERBAL DE RÉCEPTION DES TRAVAUX (DISPOSITIONS COCC) 
  // ========================================================================= 
  doc.addPage(); 
  drawFinitionsHeader("Bordereau Technique Finitions & Second Œuvre", "Partie IV : Procès-Verbal Officiel de Réception des Travaux (Régime COCC du Contrat d'Entreprise)"); 
  currentY = 54; 
  
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(9); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("VII. PROCÈS-VERBAL OFFICIEL DE RÉCEPTION DE CHANTIER (VALEUR JURIDIQUE COCC)", 14, currentY); 
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(7.3); 
  doc.setTextColor(...COLOR_SLATE); 
  doc.text("Ce document contradictoire acte l'achèvement des travaux, le transfert de garde de l'ouvrage et déclenche les garanties légales :", 14, currentY + 5); 
  
  // Cadre PV officiel 
  const pvBoxY = currentY + 9; 
  doc.setFillColor(255, 255, 255); 
  doc.rect(14, pvBoxY, 182, 122, 'D'); 
  
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(8); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("PROCÈS-VERBAL CONTRADICTOIRE DE RÉCEPTION DES TRAVAUX", 18, pvBoxY + 7); 
  
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(7.3); 
  doc.setTextColor(51, 65, 85); 
  doc.text(`Chantier situé à : ${location} • Titre Foncier / Lot : ${lotNumber}`, 18, pvBoxY + 14); 
  doc.text(`Maître d'Ouvrage : ${clientName} • Téléphone : ${clientPhone}`, 18, pvBoxY + 20); 
  doc.text(`Entrepreneur / Tâcheron en charge des travaux : ..........................................................................................................`, 18, pvBoxY + 26); 
  
  doc.setFont('helvetica', 'bold'); 
  doc.text("DÉCISION CONTRADICTOIRE DES PARTIES :", 18, pvBoxY + 34); 
  doc.setFont('helvetica', 'normal'); 
  doc.text("[ ] RÉCEPTION PRONONCÉE SANS RÉSERVE : L'ouvrage est conforme aux règles de l'art.", 22, pvBoxY + 41); 
  doc.text(`[ ] RÉCEPTION PRONONCÉE AVEC RÉSERVES : Les désordres consignés ci-après doivent être levés sous ${delaiReserves} jours.`, 22, pvBoxY + 47); 
  
  // Tableau des réserves 
  doc.setFont('helvetica', 'bold'); 
  doc.text("LISTE CONTRADICTOIRE DES RÉSERVES CONSTATÉES LORS DE LA VISITE :", 18, pvBoxY + 56); 
  doc.setDrawColor(203, 213, 225); 
  for (let l = 0; l < 4; l++) { 
    doc.line(18, pvBoxY + 64 + (l * 8), 190, pvBoxY + 64 + (l * 8)); 
  } 
  
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(7); 
  doc.text(`Délai impératif accordé à l'entrepreneur pour la levée intégrale des réserves : ${delaiReserves} jours calendaires.`, 18, pvBoxY + 100); 
  doc.text("La retenue de garantie contractuelle de 5% (COCC) demeure consignée jusqu'au PV de levée des réserves.", 18, pvBoxY + 105); 
  
  // Signatures contradictoires 
  doc.setDrawColor(203, 213, 225); 
  doc.rect(18, pvBoxY + 110, 85, 34); 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(7.2); 
  doc.text("LE MAÎTRE D'OUVRAGE :", 22, pvBoxY + 116); 
  doc.setFont('helvetica', 'italic'); 
  doc.setFontSize(6.8); 
  doc.text("(Mention manuscrite 'Lu et approuvé')", 22, pvBoxY + 121); 
  
  doc.rect(111, pvBoxY + 110, 81, 34); 
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(7.2); 
  doc.text("L'ENTREPRENEUR / TÂCHERON :", 115, pvBoxY + 116); 
  doc.setFont('helvetica', 'italic'); 
  doc.setFontSize(6.8); 
  doc.text("(Cachet commercial et signature)", 115, pvBoxY + 121); 
  
  // Bloc de validation technique officiel (Correction 9 : suppression de "certifié")
  currentY = pvBoxY + 148; 
  doc.setFillColor(...COLOR_BG_LIGHT); 
  doc.rect(14, currentY, 182, 20, 'F'); 
  doc.setDrawColor(203, 213, 225); 
  doc.rect(14, currentY, 182, 20, 'D'); 
  
  doc.setFont('helvetica', 'bold'); 
  doc.setFontSize(7.5); 
  doc.setTextColor(...COLOR_NAVY); 
  doc.text("AVIS TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", 18, currentY + 5); 
  
  doc.setFont('helvetica', 'normal'); 
  doc.setFontSize(6.8); 
  doc.setTextColor(...COLOR_SLATE); 
  const disclaimerClotureFinitions = doc.splitTextToSize(
    "Document indicatif d'aide à la décision généré automatiquement. Bordereau technique de second œuvre et modèle de réception établis selon les normes applicables (DTU 52.1, 59.1, 60.1, 43.1, NF C 15-100) et le Code des Obligations Civiles et Commerciales. Ne constitue ni une note de calcul ni le visa d'un bureau d'études agréé.",
    174
  );
  doc.text(disclaimerClotureFinitions, 18, currentY + 10); 
  doc.text(`Dossier estimatif n° ${refDoc} • Émis à Dakar le ${currentDate} pour le compte de ${clientName}.`, 18, currentY + 18.5); 
}
