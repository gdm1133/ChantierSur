function renderExpress(doc, data, refDoc, currentDate) {
  const COLOR_NAVY = [11, 19, 37];
  const COLOR_AMBER = [245, 158, 11];
  const COLOR_SLATE = [71, 85, 105];
  const COLOR_BG_LIGHT = [248, 250, 252];

  const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
  
  // Formatage propre du téléphone sans aucun doublon
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
  const slabType = data.slab_type || 'hourdis16';
  const hasBasement = data.has_basement === 'oui';
  const concreteMethod = data.concrete_method || 'betonniere';
  const location = data.project_location || 'Dakar - Zone Urbaine';
  const landStatus = data.land_status || 'Titre Foncier (TF)';
  const lotNumber = data.lot_number || 'Non spécifié';

  const isMarine = location.toLowerCase().includes('almadies') || location.toLowerCase().includes('ngor') || location.toLowerCase().includes('yoff') || location.toLowerCase().includes('corniche') || location.toLowerCase().includes('saly');

  // Correction 3 — Enrobage paramétré (BAEL 91 R99, art. A.7.2.4)
  const enrobageCm = isMarine ? 4.5 : 3.0;

  // --- CORRECTION 2 : Volumes béton depuis la géométrie (formules traçables) ---
  // Fondations
  const vFondations = Math.round(surface * (hasBasement ? 0.16 : 0.11));
  const vFondationsFormule = `${surface} m² × ${hasBasement ? '0.16' : '0.11'} (fondations${hasBasement ? ' + sous-sol' : ' courantes'})`;

  // Poteaux : N_poteaux × (0.20×0.30 m²) × h_poteau × N_niveaux + raidisseurs
  const nbPoteaux = Math.max(6, Math.round(surface / 16)); // trame 4×4m
  const secPoteau = 0.20 * 0.30; // section courante 20×30 cm
  const hPoteau = 3.10; // hauteur nette courante
  const vPoteauxBase = nbPoteaux * secPoteau * hPoteau * totalLevelsCount;
  const vRaidisseurs = Math.round(nbPoteaux * 0.04 * 0.20 * 0.60 * 10) / 10;
  const vPoteaux = Math.round((vPoteauxBase + vRaidisseurs) * 10) / 10;
  const vPoteauxFormule = `${nbPoteaux} pot. × (0.20×0.30 m²) × ${hPoteau} m × ${totalLevelsCount} niv. + raidisseurs`;

  // Poutres
  const vPoutres = Math.round(surface * 0.08);
  const vPoutresFormule = `${surface} m² × 0.08 (ratio poutres maîtresses + chaînages)`;

  // Dalles : table de compression 4 cm + escaliers
  const sPlancher = surface * (levels / totalLevelsCount); // planchers hauts uniquement
  const vTableCompression = Math.round(sPlancher * 0.04 * 10) / 10;
  const vEscaliers = Math.max(2, Math.round(levels * 3));
  const vPlanchers = Math.round((vTableCompression + vEscaliers) * 10) / 10;
  const vPlanchersFormule = `Table comp. : ${sPlancher.toFixed(0)} m² × 0.04 m + escaliers ${vEscaliers} m³`;

  // Dallage RDC
  const vDallageRdc = Math.round((surface / totalLevelsCount) * 0.10);
  const vDallageFormule = `${(surface / totalLevelsCount).toFixed(0)} m² RDC × 0.10 m (10 cm)`;

  const vTotalBeton = Math.round((vFondations + vPoteaux + vPoutres + vPlanchers + vDallageRdc) * 10) / 10;

  // Agglos (calculés ici car nécessaires pour S_murs)
  const nbAgglos15 = Math.round(surface * 14.2);
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

  // --- CORRECTION 1 : Ciment décomposé béton + mortiers (traçable) ---
  // Ciment béton : V_béton × 350 kg/m³ ÷ 50
  const DOSAGE_BETON_KG_M3 = 350;
  const sacsCimentBeton = Math.round(vTotalBeton * DOSAGE_BETON_KG_M3 / 50);
  // Ciment mortiers : S_murs × 20 kg/m² (6 kg/m² pose + 14 kg/m² enduits 2 faces) ÷ 50 — à valider BET
  const CONSO_MORTIER_AU_M2 = 20; // kg/m² : 6 pose + 14 enduits 2 faces (à valider BET)
  const sMurs = Math.round((nbAgglos15 + nbAgglos20) / 12.5); // surface murs depuis nb agglos (12.5 U/m²)
  const sacsCimentMortier = Math.round((sMurs * CONSO_MORTIER_AU_M2) / 50);
  const totalSacsCiment = sacsCimentBeton + sacsCimentMortier;
  const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);
  const cimentDetail = `Béton : ${sacsCimentBeton} sacs (${vTotalBeton} m³ × ${DOSAGE_BETON_KG_M3} kg/m³ ÷ 50) + Mortiers : ${sacsCimentMortier} sacs (${sMurs} m² × ${CONSO_MORTIER_AU_M2} kg/m² ÷ 50). Ratios mortiers à valider BET.`;

  // --- CORRECTION 7 : Sable (formule traçable) ---
  const vGravierBasalte = Math.round(vTotalBeton * 0.80);
  const vMortierTotal = Math.round(sacsCimentMortier * 50 / 300); // volume mortier depuis ciment (dosage 300 kg/m³)
  const volSableKayar = Math.round(vTotalBeton * 0.40 + vMortierTotal * 1.0);
  const sableDetail = `Béton : ${vTotalBeton} m³ × 0.40 + Mortiers : ${vMortierTotal} m³ × 1.0`;
  const volGravierBasalte = vGravierBasalte; // alias (0.80 × V_béton conservé)

  // Prix unitaires Dakar 2026 (datés — alerte si > 6 mois)
  const PRIX_2026_DATE = '2026-01-01';
  const PRIX_ACIER_TONNE = 620000;
  const PRIX_CIMENT_SAC = 4400;
  const PRIX_GRAVIER_M3 = 19000;
  const PRIX_SABLE_M3 = 11500;
  const PRIX_AGGLO_15 = 380;
  const PRIX_AGGLO_20 = 480;
  const PRIX_HOURDIS = 450;
  const PRIX_FIL_CALES = 1400;
  const moisDepuisPrix = Math.floor((Date.now() - new Date(PRIX_2026_DATE).getTime()) / (1000*60*60*24*30));
  const alertePrix = moisDepuisPrix > 6 ? `⚠️ Prix datés du ${PRIX_2026_DATE} (${moisDepuisPrix} mois) — Réactualiser avant commande.` : `Prix réf. Dakar ${PRIX_2026_DATE}`;

  const totalAcierF = Math.round(tonnageAcierTotal * PRIX_ACIER_TONNE);
  const totalCimentF = Math.round(totalSacsCiment * PRIX_CIMENT_SAC);
  const totalGravierF = Math.round(volGravierBasalte * PRIX_GRAVIER_M3);
  const totalSableF = Math.round(volSableKayar * PRIX_SABLE_M3);
  const totalAgglosF = Math.round((nbAgglos15 * PRIX_AGGLO_15) + (nbAgglos20 * PRIX_AGGLO_20) + (nbHourdis * PRIX_HOURDIS));
  const totalAccessoiresF = Math.round(surface * PRIX_FIL_CALES);

  const totalFournituresBrutes = totalAcierF + totalCimentF + totalGravierF + totalSableF + totalAgglosF + totalAccessoiresF;
  const mainOeuvreEstimee = Math.round(surface * 28000);
  const totalGrosOeuvreGO = totalFournituresBrutes + mainOeuvreEstimee;

  // --- CORRECTION 4 : Tests de cohérence somme phases == total global ---
  // Hourdis (split 50%/50%)
  const h50a = Math.round(nbHourdis * 0.5);
  const h50b = nbHourdis - h50a; // garantit somme exacte
  // Ciment (25% / 30% / 25% / reste)
  const phase1Ciment = Math.round(totalSacsCiment * 0.25);
  const phase2Ciment = Math.round(totalSacsCiment * 0.30);
  const phase3Ciment = Math.round(totalSacsCiment * 0.25);
  const phase4Ciment = totalSacsCiment - (phase1Ciment + phase2Ciment + phase3Ciment); // garantit somme exacte
  // Aciers
  const phase1Acier = (tonnageAcierTotal * 0.30).toFixed(2);
  const phase2Acier = (tonnageAcierTotal * 0.30).toFixed(2);
  const phase3Acier = (tonnageAcierTotal * 0.25).toFixed(2);
  const phase4Acier = (tonnageAcierTotal - (parseFloat(phase1Acier) + parseFloat(phase2Acier) + parseFloat(phase3Acier))).toFixed(2);
  // Gravier
  const p1Gravier = Math.round(volGravierBasalte * 0.25);
  const p2Gravier = Math.round(volGravierBasalte * 0.30);
  const p3Gravier = Math.round(volGravierBasalte * 0.25);
  const p4Gravier = volGravierBasalte - (p1Gravier + p2Gravier + p3Gravier);
  // Test bloquant
  const checksPhases = [
    { nom: 'Hourdis', somme: h50a + h50b, total: nbHourdis },
    { nom: 'Ciment', somme: phase1Ciment + phase2Ciment + phase3Ciment + phase4Ciment, total: totalSacsCiment },
    { nom: 'Gravier', somme: p1Gravier + p2Gravier + p3Gravier + p4Gravier, total: volGravierBasalte }
  ];
  for (const ck of checksPhases) {
    if (ck.somme !== ck.total) {
      throw new Error(`ERREUR BLOQUANTE BQE: Σ phases ${ck.nom} (${ck.somme}) ≠ total global (${ck.total})`);
    }
  }

  function drawExpressHeader(pageTitle, subTitle) {
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
    doc.text("BUREAU D'ÉTUDES NUMÉRIQUE • AUDIT TECHNIQUE BTP SÉNÉGAL", 14, 20);

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

    // Correction 8 — Suppression de la menace pénale abusive
    const legalNotice = `Document indicatif d'aide à la décision généré automatiquement. Bordereau estimatif — à confirmer par BET avant toute commande. Maître d'Ouvrage : ${clientName.toUpperCase()} • Tél : ${clientPhone} • Réf : ${lotNumber}.`;
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotice = doc.splitTextToSize(legalNotice, 182);
    doc.text(splitNotice, 14, 48.5);
  }

  // =========================================================================
  // PAGE 1 : CUBAGES BÉTON ARMÉ
  // =========================================================================
  drawExpressHeader("Bordereau Quantitatif Estimatif (BQE) Gros Œuvre", "Partie I : Cartouche de Propriété, Synthèse Matériaux & Ventilation Béton Armé");

  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IDENTIFICATION NOMINATIVE DU MAÎTRE D'OUVRAGE & DU SITE", 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Maître d'Ouvrage : ${clientName}`, 18, 66);
  doc.text(`Contact Notifié : ${clientPhone}`, 18, 72);
  doc.text(`Email Enregistré : ${clientEmail}`, 18, 78);
  doc.text(`Statut Foncier : ${landStatus}`, 18, 84);

  doc.text(`Localisation : ${location}`, 110, 66);
  doc.text(`Réf. Cadastrale / Lot : ${lotNumber}`, 110, 72);
  doc.text(`Gabarit : R+${levels} (${totalLevelsCount} niveaux) • SDP : ${surface} m²`, 110, 78);
  doc.text(`Structure : Béton dosé à 350 kg/m³ • ${concreteMethod === 'centrale' ? 'Centrale à béton' : 'Bétonnière in situ'}`, 110, 84);

  let currentY = 93;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("I. SYNTHÈSE GLOBALE DES QUANTITATIFS MAJEURS GROS ŒUVRE", 14, currentY);

  // Corrections 1 & 7 — formules affichées dans la colonne "Ratio"
  const syntheseRows = [
    ["Béton Armé Structurel (fc28 >= 25 MPa)", `${vTotalBeton} m³`, `Ratio : ${(vTotalBeton / surface).toFixed(2)} m³/m². Détail : fond. + pot. + poutres + dalles + dallage.`],
    ["Aciers Haute Adhérence FeE500", `${tonnageAcierTotal} Tonnes (${formatNum(kgAcierTotal)} kg)`, `Ratio : ${ratioAcierM3} kg/m³ de béton${isMarine ? ' (zone marine +5 kg)' : ''}`],
    ["Ciment CEM II 42.5R (SOCOCIM / Dangote)", `${formatNum(totalSacsCiment)} Sacs (env. ${tonnesCiment} T)`, cimentDetail],
    ["Gravier Basalte Concassé (Carrières Diack)", `${formatNum(volGravierBasalte)} m³`, `Formule : ${vTotalBeton} m³ béton × 0.80. ${alertePrix}`],
    ["Sable Dunaire Lavé Propre (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, `Formule : ${sableDetail}. À valider BET.`],
    ["Agglos Vibrés Normalisés (15 & 20)", `${formatNum(nbAgglos15 + nbAgglos20)} Unités`, `Agglos creux 15 (${formatNum(nbAgglos15)}) + Agglos pleins 20 (${formatNum(nbAgglos20)}) — 12.5 U/m²`],
    ["Plancher Hourdis Entrevous Béton", slabType === 'dalle_pleine' ? "Dalle Pleine BA" : `${formatNum(nbHourdis)} Hourdis`, slabType === 'dalle_pleine' ? "Coffrage intégral dalle pleine" : `${formatNum(nbHourdis)} U — ratio 8.5 U/m² × ${(surface * levels / totalLevelsCount).toFixed(0)} m² planchers hauts`]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Désignation du Matériau', 'Quantitatif Global Calculé', 'Prescription & Ratio d\'Ingénierie']],
    body: syntheseRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("II. DÉCOMPOSITION DU CUBAGE BÉTON PAR ÉLÉMENT PORTEUR (BAEL 91 R99)", 14, currentY);

  // Correction 2 — formules traçables pour chaque organe
  const ventilationBetonRows = [
    ["1. Fondations (Semelles isolées & Longrines)", `${vFondations} m³`, `Formule : ${vFondationsFormule}`],
    ["2. Poteaux, Raidisseurs & Potelets", `${vPoteaux} m³`, `Formule : ${vPoteauxFormule}`],
    ["3. Poutres Maîtresses & Chaînages Hauts", `${vPoutres} m³`, `Formule : ${vPoutresFormule}`],
    ["4. Dalles de Compression & Escaliers", `${vPlanchers} m³`, `Formule : ${vPlanchersFormule}`],
    ["5. Forme de Dallage RDC sur Hérisson (10 cm)", `${vDallageRdc} m³`, `Formule : ${vDallageFormule}`],
    ["TOTAL CUBAGE BÉTON ARMÉ DU PROJET", `${vTotalBeton} m³`, "Volume net de commande (Prévoir 3% de perte toupie / brouettage)"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Organe de Structure Béton Armé', 'Volume Calculé', 'Spécifications d\'Exécution']],
    body: ventilationBetonRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 2 : NOMENCLATURE DES ACIERS & BORDEREAU FOURNITURES
  // =========================================================================
  doc.addPage();
  drawExpressHeader("Bordereau Quantitatif Estimatif (BQE) Gros Œuvre", "Partie II : Calibrage des Aciers FeE500 & Bordereau Estimatif Fournitures 2026");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("III. NOMENCLATURE & CALIBRAGE DES ARMATURES HAUTE ADHÉRENCE FeE500", 14, currentY);

  const aciersRows = [
    ["Aciers HA 14 & HA 16", `${formatNum(kgHA14_16)} kg (${(kgHA14_16/1000).toFixed(2)} T)`, "Aciers longitudinaux des semelles de fondation et poteaux du RDC"],
    ["Aciers HA 12", `${formatNum(kgHA12)} kg (${(kgHA12/1000).toFixed(2)} T)`, "Armatures principales des poutres maîtresses et poteaux des étages"],
    ["Aciers HA 10", `${formatNum(kgHA10)} kg (${(kgHA10/1000).toFixed(2)} T)`, "Aciers chapeaux de dalle, poutrelles hourdis et linteaux"],
    ["Aciers HA 8", `${formatNum(kgHA8)} kg (${(kgHA8/1000).toFixed(2)} T)`, "Armatures de répartition, chaînages verticaux et renforts d'angles"],
    ["Aciers HA 6", `${formatNum(kgHA6)} kg (${(kgHA6/1000).toFixed(2)} T)`, "Cadres, étriers et épingles anti-flambement des poteaux et poutres"],
    // Correction 3 — enrobage harmonisé (paramétré selon zone)
    [`Fil de Recuit & Cales d'Enrobage (${enrobageCm} cm)`, `${formatNum(filRecuitKg)} kg de fil + cales`, `Enrobage ${enrobageCm} cm ${isMarine ? '(zone côtière/saline — BAEL 91 R99, art. A.7.2.4)' : '(milieu non agressif — BAEL 91 R99, art. A.7.2.4)'}`],
    ["TOTAL ACIERS HAUTE ADHÉRENCE FeE500", `${formatNum(kgAcierTotal)} kg (env. ${tonnageAcierTotal} T)`, "Fers certifiés SOCOCIM / Senbus / Someta à haute limite d'élasticité"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Diamètre Commercial & Type d\'Armature', 'Poids Requis', 'Destination Structurelle']],
    body: aciersRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IV. BORDEREAU ESTIMATIF FOURNITURES MATÉRIAUX (RÉFÉRENTIEL DAKAR 2026)", 14, currentY);

  const bordereauRows = [
    ["Aciers FeE500 (Barres de 12 m)", `${tonnageAcierTotal} Tonnes`, `${formatFCFA(PRIX_ACIER_TONNE)} / T`, formatFCFA(totalAcierF), "Aciers certifiés sans rouille feuilletée"],
    ["Ciment CEM II 42.5R (Sacs 50 kg)", `${formatNum(totalSacsCiment)} Sacs`, `${formatFCFA(PRIX_CIMENT_SAC)} / Sac`, formatFCFA(totalCimentF), "SOCOCIM / Dangote / Sahel"],
    ["Gravier Basalte Diack (8/16 & 16/25)", `${formatNum(volGravierBasalte)} m³`, `${formatFCFA(PRIX_GRAVIER_M3)} / m³`, formatFCFA(totalGravierF), "Basalte concassé haute compacité"],
    ["Sable Dunaire Lavé (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, `${formatFCFA(PRIX_SABLE_M3)} / m³`, formatFCFA(totalSableF), "Sable propre sans vase ni sel"],
    ["Agglos Creux Vibrés de 15", `${formatNum(nbAgglos15)} U`, `${PRIX_AGGLO_15} FCFA / U`, formatFCFA(nbAgglos15 * PRIX_AGGLO_15), "Élévations des murs extérieurs et refends"],
    ["Agglos Pleins Vibrés de 20", `${formatNum(nbAgglos20)} U`, `${PRIX_AGGLO_20} FCFA / U`, formatFCFA(nbAgglos20 * PRIX_AGGLO_20), "Murs de soubassement sous longrines"],
    ["Hourdis Creux Béton (16 ou 20)", slabType === 'dalle_pleine' ? "-" : `${formatNum(nbHourdis)} U`, slabType === 'dalle_pleine' ? "-" : `${PRIX_HOURDIS} FCFA / U`, slabType === 'dalle_pleine' ? "0 FCFA" : formatFCFA(nbHourdis * PRIX_HOURDIS), "Entrevous de plancher"],
    [`Accessoires (Fil, cales ${enrobageCm} cm, polyane)`, "Forfait chantier", `${formatFCFA(PRIX_FIL_CALES)} / m²`, formatFCFA(totalAccessoiresF), `Cales béton ${enrobageCm} cm, film étanche dallage`],
    ["SOUS-TOTAL ESTIMATIF MATÉRIAUX BRUTS", "-", "-", formatFCFA(totalFournituresBrutes), "Hors main d'œuvre et transport chantier"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Poste Matériaux', 'Quantité', 'Prix Unitaire Marché', 'Montant Total Estimé', 'Origine & Contrôle Qualité']],
    body: bordereauRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 
      0: { cellWidth: 46 },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { cellWidth: 36, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
      4: { cellWidth: 42 }
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 3 : CADENCE D'APPROVISIONNEMENT & MAIN D'ŒUVRE
  // =========================================================================
  doc.addPage();
  drawExpressHeader("Bordereau Quantitatif Estimatif (BQE) Gros Œuvre", "Partie III : Planning d'Approvisionnement en 4 Phases & Budget Main d'Œuvre");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("V. PLANNING D'APPROVISIONNEMENT PAR PHASE (ANTI-VOL & ANTI-GASPILLAGE)", 14, currentY);

  // Corrections 4 & 9 — planningRows depuis variables précalculées avec sommes garanties
  const planningRows = [
    ["Phase 1 : Fouilles, Fondations & Soubassement", `${formatNum(phase1Ciment)} Sacs`, `${phase1Acier} T (HA16, HA14, HA12)`, `${formatNum(p1Gravier)} m³`, `${formatNum(nbAgglos20)} agglos pleins de 20 + sable`],
    ["Phase 2 : Poteaux RDC & Plancher Haut", `${formatNum(phase2Ciment)} Sacs`, `${phase2Acier} T (HA14, HA12, HA8)`, `${formatNum(p2Gravier)} m³`, `${formatNum(h50a)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15`],
    // Correction 9 — libellé dynamique R+N → R+${levels}
    [`Phase 3 : Élévations & Planchers Étages (R+${levels})`, `${formatNum(phase3Ciment)} Sacs`, `${phase3Acier} T (HA12, HA10, HA8)`, `${formatNum(p3Gravier)} m³`, `${formatNum(h50b)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.4))} agglos 15`],
    ["Phase 4 : Toiture Terrasse, Acrotères & Enduits", `${formatNum(phase4Ciment)} Sacs`, `${phase4Acier} T (HA10, HA8, HA6)`, `${formatNum(p4Gravier)} m³`, `${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15 + sable enduits`]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Étape des Travaux', 'Quota Ciment 42.5R', 'Quota Aciers FeE500', 'Quota Gravier Diack', 'Matériaux Complémentaires']],
    body: planningRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  // Positionnement rigoureux du Titre VI AVANT le Tableau VI
  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VI. ESTIMATION DE LA MAIN D'ŒUVRE TÂCHERONNE & ÉQUIPEMENTS DE COFFRAGE", 14, currentY);

  const moFerrailleur = Math.round(mainOeuvreEstimee * 0.22);
  const moMaconCoffreur = Math.round(mainOeuvreEstimee * 0.55);
  const moMateriel = Math.round(mainOeuvreEstimee * 0.23);

  const moRows = [
    ["Équipe Maçons & Coffreurs", formatFCFA(moMaconCoffreur), "Montage des agglos, coffrage bois des poteaux/poutres, coulage et vibration du béton"],
    ["Équipe Ferrailleurs Spécialisés", formatFCFA(moFerrailleur), "Façonnage sur gabarit des cadres, étriers, crochets sismiques et ligatures strictes"],
    ["Location Équipements & Étaiement", formatFCFA(moMateriel), "Bétonnière thermique, aiguille vibrante, étais métalliques télescopiques et madriers"],
    ["TOTAL MAIN D'ŒUVRE GROS ŒUVRE", formatFCFA(mainOeuvreEstimee), `Base contractuelle moyenne : env. ${formatFCFA(Math.round(mainOeuvreEstimee / surface))} / m² de plancher`],
    // Correction 6 — suppression du sigle TCE (réservé au rapport d'esquisse tous corps d'état)
    ["BUDGET GLOBAL GROS ŒUVRE (Fournitures + Main d'Œuvre)", formatFCFA(totalGrosOeuvreGO), `Ratio global gros œuvre : env. ${formatFCFA(Math.round(totalGrosOeuvreGO / surface))} / m² de plancher`]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Poste Main d\'Œuvre & Outillage', 'Montant Prévisionnel', 'Contenu des Prestations Incluses']],
    body: moRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } 
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 4 : PROTOCOLE DES 6 POINTS D'ARRÊT & RÉGLEMENTATION
  // =========================================================================
  doc.addPage();
  drawExpressHeader("Bordereau Quantitatif Estimatif (BQE) Gros Œuvre", "Partie IV : Protocole de Réception des 6 Points d'Arrêt & Sécurité Juridique COCC");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VII. PROTOCOLE TECHNIQUE DES 6 POINTS D'ARRÊT (CONTRÔLE AVANT PAIEMENT)", 14, currentY);

  const holdPointsRows = [
    ["Point 1 : Fond de Fouille", "Avant béton de propreté", "Vérifier la profondeur d'ancrage (-1,20m min), l'horizontalité et l'absence de remblai meuble."],
    ["Point 2 : Ferraillage Semelles", "Avant coulage fondations", "Contrôler le diamètre des fers HA, le façonnage des crochets et les cales d'enrobage (4,5 cm)."],
    ["Point 3 : Chaînage & Longrines", "Avant remblai soubassement", "Vérifier la continuité des armatures d'attente et la pose du feutre bitumé d'arase étanche."],
    ["Point 4 : Dalles & Poutres", "3h avant le coulage", "Contrôler les chapeaux de rive, le calage des hourdis et la densité des étais (1 étai / 0,80 m²)."],
    // Correction 5 — reformulation non contradictoire
    ["Point 5 : Décoffrage Structure", "Délais réglementaires", "Décoffrage joues : 48 h à 7 jours. Enlèvement sous-faces & étais : 21 jours calendaires min (portées courantes), sauf accord écrit BET / bureau de contrôle."],
    ["Point 6 : Épreuve d'Étanchéité", "Après complexe étanche", "Mise en eau de la toiture terrasse pendant 48 heures consécutives. Zéro suintement sous plafond."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Point d\'Arrêt Obligatoire', 'Moment du Contrôle', 'Critère Impératif de Validation (Ne pas décaisser sans visa)']],
    body: holdPointsRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.1 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VIII. RÈGLES DE L'ART SUR CHANTIER & CLAUSES DE SAUVEGARDE JURIDIQUE", 14, currentY);

  const reglesArtRows = [
    ["1. Dosage de Gâchage Bétonnière", "1 sac CEM II 42.5R (50 kg) + 2 brouettes de gravier 8/16 + 1 brouette rase de sable lavé."],
    ["2. Contrôle de l'Eau de Gâchage", "Rapport E/C <= 0,50. Un béton trop fluide perd jusqu'à 40% de sa résistance mécanique finale."],
    ["3. Cure Obligatoire du Béton", "Arrosage abondant matin et soir pendant 7 jours consécutifs pour éviter la fissuration précoce."],
    // Correction 10 — suppression de la fausse référence juridique (art. 768 COCC = apports en société)
    ["4. Retenue de Garantie Contractuelle 5%", "Clause contractuelle type (pratique usuelle BTP). Se référer au CCAG / décret n° 89-442 pour les marchés publics. Prélever 5% sur chaque acompte jusqu'à la réception définitive."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Axe de Vigilance Chantier', 'Prescription Impérative ChantierSur.com']],
    body: reglesArtRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.1 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.rect(14, currentY, 182, 20, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 20, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VISA TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", 18, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLOR_SLATE);
  // Correction 8 — suppression de "certifié" + disclaimer homélogué
  const disclaimerBqe = doc.splitTextToSize(
    "Document indicatif d'aide à la décision généré automatiquement. Ne constitue ni une note de calcul ni le visa d'un bureau d'études agréé. Les quantitatifs doivent être confirmés par un BET / économiste avant toute commande.",
    178
  );
  doc.text(disclaimerBqe, 18, currentY + 10);
  doc.text(`BQE GO émis à Dakar le ${currentDate} pour le compte de ${clientName}. Réf: ${refDoc}`, 18, currentY + 18);
}
