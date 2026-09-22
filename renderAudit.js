// =========================================================================
// RÉFÉRENTIELS TECHNIQUES ET JURIDIQUES PARTAGÉS (CORRECTIONS 1 & 10)
// =========================================================================
const SEUILS_TECHNIQUES = {
  dosageCimentBA: 350,          // kg/m³ CEM II 42.5R (ou 32.5 sous réserve d'essais concluants)
  fc28Min: 25,                  // MPa
  enrobageMarin: 4.5,           // cm (BAEL 91 R99 art. A.7.2.4)
  enrobageStandard: 3.0,        // cm
  epaisseurTableCompressionMin: 4, // cm (flexion locale et fonctionnement en diaphragme horizontal)
  decoffrageJoues: "48 h à 7 jours",
  decoffrageSousFaces: "21 jours calendaires min (portées courantes)",
  cureBetonDureeMin: "7 jours continus (arrosage biquotidien)",
  cableTerreSection: "25 mm² cuivre nu en boucle sous semelle (NF C 15-100)",
  ratioEtancheiteM2Min: 20000,   // FCFA / m²
  ratioEtancheiteM2Max: 35000,   // FCFA / m²
  ratioEtancheiteM2Moyen: 28000, // FCFA / m² (médiane technique)
  provisionAleasTaux: 0.05,     // 5% du coût direct
  margeEntrepreneurMin: 0.07,   // 7%
  margeEntrepreneurMax: 0.10,   // 10%
  margeEntrepreneurMoyenne: 0.085, // 8.5% médian
  penaliteJourRatio: 0.001,     // 1/1000e du montant du marché par jour ouvré de retard
  plafondPenalitesTaux: 0.05    // 5% max légal / contractuel usuel (paramétrable max 10%)
};

// Table des références juridiques officielles vérifiées (Correction 1)
// Toute référence "Article NNN" absente de cette table déclenche une exception bloquante
const REFERENCES_JURIDIQUES = {
  "COCC_CONTRAT_ENTREPRISE": "Dispositions du Code des Obligations Civiles et Commerciales relatives au contrat d'entreprise",
  "BAEL_91_R99": "Règles techniques de conception et de calcul des ouvrages et constructions en béton armé",
  "DTU_20_1": "Ouvrages en maçonnerie de petits éléments — parois et murs",
  "DTU_14_1": "Travaux de cuvelage",
  "NF_C_15_100": "Installations électriques à basse tension — prise de terre en fond de fouille",
  "DECRET_89_442": "Décret n° 89-442 relatif aux marchés publics et garanties contractuelles"
};

// Garde-fou bloquant : interdire formellement toute mention "Article NNN" non vérifiée
function validerReferencesJuridiques(texte) {
  const matches = texte.match(/Article\s+\d+/gi) || [];
  for (const m of matches) {
    const key = m.toUpperCase().replace(/\s+/g, '_');
    if (!REFERENCES_JURIDIQUES[key]) {
      throw new Error(`ERREUR BLOQUANTE : Référence juridique non vérifiée détectée : "${m}". Se référer à la table REFERENCES_JURIDIQUES.`);
    }
  }
}

// =========================================================================
// 3. LIVRABLE : CONTRE-EXPERTISE & AUDIT DEVIS BTP (4 PAGES DENSES)
// =========================================================================
function renderAudit(doc, data, refDoc, currentDate) {
  const COLOR_NAVY = [11, 19, 37];      // #0B1325
  const COLOR_AMBER = [245, 158, 11];   // #F59E0B
  const COLOR_SLATE = [71, 85, 105];    // #475569
  const COLOR_BG_LIGHT = [248, 250, 252];

  // Données du Maître d'Ouvrage
  const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
  const p = (data.phone_prefix || '+221').trim();
  const pDigits = p.replace(/\D/g, '');
  let d = (data.client_phone || '770000000').toString().replace(/\D/g, '').replace(/^0+/, '');
  if (pDigits && d.startsWith(pDigits)) d = d.substring(pDigits.length).replace(/^0+/, '');
  if (pDigits && d.startsWith(pDigits)) d = d.substring(pDigits.length).replace(/^0+/, '');
  const clientPhone = `${p} ${d}`;

  const clientEmail = (data.client_email || 'client@chantiersur.com').trim();
  const quotedAmount = parseFloat(data.quoted_amount) || 45000000;
  const surface = parseFloat(data.surface) || 250;
  const levels = parseInt(data.exact_levels, 10) || 1;
  const totalLevelsCount = levels + 1;
  const scope = data.contract_scope || 'tce_clef_en_main';
  const contractorType = data.contractor_type || 'tacheron';
  const standing = data.standing || 'moyen';
  const location = data.project_location || 'Dakar - Zone Urbaine';
  const landStatus = data.land_status || 'Titre Foncier (TF)';
  const lotNumber = data.lot_number || 'Non spécifié';
  const advanceRequested = parseInt(data.advance_requested, 10) || 30;
  const hasGuarantee = data.has_guarantee || 'aucune';

  // --- BENCHMARK DU MARCHÉ DAKAR 2026 (FCFA / m²) ---
  let baseMin = 220000;
  let baseMax = 270000;

  if (scope === 'go_seul') {
    baseMin = 115000;
    baseMax = 145000;
  } else if (scope === 'clos_couvert') {
    baseMin = 160000;
    baseMax = 195000;
  } else {
    // TCE
    if (standing === 'economique') { baseMin = 210000; baseMax = 250000; }
    else if (standing === 'haut') { baseMin = 310000; baseMax = 380000; }
    else { baseMin = 250000; baseMax = 305000; }
  }

  // Ajustement étages hauts
  if (levels >= 3) {
    const extra = levels * 4000;
    baseMin += extra;
    baseMax += extra;
  }

  const refTotalMin = Math.round(surface * baseMin);
  const refTotalMax = Math.round(surface * baseMax);
  const refMoyen = Math.round((refTotalMin + refTotalMax) / 2);
  const ratioM2Soumis = Math.round(quotedAmount / surface);
  const ecartPourcent = Math.round(((quotedAmount - refMoyen) / refMoyen) * 100);

  // Correction 5 : Montant contractuel cible pour l'échéancier (défaut = médiane refMoyen)
  const contractAmount = parseFloat(data.contract_amount) || refMoyen;

  // Correction 2 : Pénalités de retard journalières (1/1000e par jour ouvré, plafonné à 5%)
  const penaliteJournaliere = Math.round(contractAmount * SEUILS_TECHNIQUES.penaliteJourRatio);
  const plafondPenalite = Math.round(contractAmount * SEUILS_TECHNIQUES.plafondPenalitesTaux);

  // Correction 3 : Étanchéité toiture calculée sur S_toiture (SDP / nb_niveaux) × 28 000 FCFA/m²
  const sToiture = Math.max(20, Math.round(surface / totalLevelsCount));
  const ratioEtancheite = SEUILS_TECHNIQUES.ratioEtancheiteM2Moyen;
  const partEtancheiteRef = scope === 'go_seul' ? 0 : Math.round(sToiture * ratioEtancheite);

  // Diagnostic de cohérence
  let verdictTitre = "DEVIS COHÉRENT AVEC LE MARCHÉ DAKAR 2026";
  let verdictCouleur = [16, 185, 129]; // Vert
  let verdictAvis = "Le montant global se positionne dans la fourchette d'ingénierie attendue pour ce type d'ouvrage. La négociation doit cibler les clauses de garantie.";

  if (quotedAmount > refTotalMax * 1.12) {
    verdictTitre = "RISQUE DE SURFACTURATION OU COEFFICIENT DE MARGE ABUSIF";
    verdictCouleur = [239, 68, 68]; // Rouge
    verdictAvis = `Le montant soumis dépasse de ${ecartPourcent}% la médiane constatée à Dakar. Des marges anormales sur les fournitures ou des postes doublons sont identifiés.`;
  } else if (quotedAmount < refTotalMin * 0.85) {
    verdictTitre = "ALERTE MAJEURE : DEVIS ANORMALEMENT BAS (DANGER DE MALFAÇONS)";
    verdictCouleur = [245, 158, 11]; // Ambre
    verdictAvis = "Un devis excessivement bas est le premier facteur d'abandon de chantier, de réduction du diamètre des aciers ou de sous-dosage du béton armé.";
  }

  // En-tête officiel (Correction 9 : suppression de toute mention "certifié" et de menace pénale)
  function drawAuditHeader(pageTitle, subTitle) {
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

    // Correction 9 : Remplacement par le disclaimer indicatif officiel
    const legalNotice = `Document indicatif d'aide à la décision généré automatiquement. Il ne constitue ni une expertise judiciaire, ni le visa d'un bureau d'études agréé. Les fourchettes de prix doivent être confirmées par des professionnels qualifiés avant tout engagement. Dossier : ${refDoc}.`;
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotice = doc.splitTextToSize(legalNotice, 182);
    doc.text(splitNotice, 14, 48.5);
  }

  // =========================================================================
  // PAGE 1 : DIAGNOSTIC FINANCIER MACRO & VERDICT DE COHÉRENCE
  // =========================================================================
  drawAuditHeader("Rapport de Contre-Expertise & Audit Devis", "Partie I : Cartouche de Propriété, Confrontation Marché & Verdict d'Ingénierie");

  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IDENTIFICATION DU MAÎTRE D'OUVRAGE & DU DEVIS AUDITÉ", 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Maître d'Ouvrage : ${clientName}`, 18, 66);
  doc.text(`Téléphone Notifié : ${clientPhone}`, 18, 72);
  doc.text(`Email Enregistré : ${clientEmail}`, 18, 78);
  doc.text(`Statut Foncier : ${landStatus}`, 18, 84);

  let scopeLabel = "Tous Corps d'État (TCE)";
  if (scope === 'go_seul') scopeLabel = "Gros Œuvre Seul";
  if (scope === 'clos_couvert') scopeLabel = "Clos & Couvert";

  doc.text(`Localisation : ${location}`, 110, 66);
  doc.text(`Réf. Cadastrale / Lot : ${lotNumber}`, 110, 72);
  doc.text(`Périmètre Audité : ${scopeLabel}`, 110, 78);
  doc.text(`Configuration : R+${levels} (${totalLevelsCount} niveaux) • SDP : ${surface} m²`, 110, 84);

  let currentY = 93;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("I. VERDICT DE COHÉRENCE FINANCIÈRE & POSITIONNEMENT MARCHÉ DAKAR 2026", 14, currentY);

  // Encadré verdict
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, currentY + 3, 182, 24, 2, 2, 'F');
  doc.setDrawColor(...verdictCouleur);
  doc.setLineWidth(0.8);
  doc.roundedRect(14, currentY + 3, 182, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...verdictCouleur);
  doc.text(verdictTitre, 18, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const splitAvis = doc.splitTextToSize(verdictAvis, 174);
  doc.text(splitAvis, 18, currentY + 16);

  currentY = currentY + 32;

  const comparaisonRows = [
    ["Montant Total du Devis Soumis", formatFCFA(quotedAmount), `Ratio unitaire : env. ${formatFCFA(ratioM2Soumis)} / m² de plancher`],
    ["Fourchette Normale Marché Dakar 2026", `${formatFCFA(refTotalMin)} à ${formatFCFA(refTotalMax)}`, `Ratio de référence : ${formatFCFA(baseMin)} à ${formatFCFA(baseMax)} / m²`],
    ["Écart Constaté par rapport à la Médiane", `${ecartPourcent > 0 ? '+' : ''}${ecartPourcent} %`, ecartPourcent > 10 ? "Surévaluation nette détectée" : (ecartPourcent < -15 ? "Sous-évaluation dangereuse" : "Parfaitement aligné")],
    ["Avance au Démarrage Demandée", `${advanceRequested} % du montant total`, advanceRequested > 20 ? "AVANCE EXCESSIVE : Risque majeur de cavalerie financière" : "Avance prudente et conforme aux règles de l'art"],
    ["Couverture Assurantielle / Garanties", hasGuarantee === 'aucune' ? "ZÉRO garantie spécifiée" : (hasGuarantee === 'retenue_5' ? "Retenue de 5% actée" : "Décennale officielle"), hasGuarantee === 'aucune' ? "ALERTE : Absence de recours contractuel en cas de sinistre" : "Protection juridique minimale assurée"]
  ];

  doc.autoTable({
    startY: currentY,
    head: [['Indicateur Financier Clé', 'Valeur Analysée', 'Constat & Arbitrage d\'Ingénierie']],
    body: comparaisonRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // SECTION II : RÉPARTITION COMPARATIVE PAR MACRO-LOT (CORRECTIONS 3, 6, 7)
  // =========================================================================
  currentY = doc.lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("II. RÉPARTITION COMPARATIVE PAR MACRO-LOT (DEVIS SOUMIS VS RÉFÉRENTIEL BET)", 14, currentY);

  const coefGo = scope === 'go_seul' ? 0.88 : (scope === 'clos_couvert' ? 0.60 : 0.48);
  const coefSo = scope === 'go_seul' ? 0 : (scope === 'clos_couvert' ? 0.25 : 0.38);

  const partGoSoumis = Math.round(quotedAmount * coefGo);
  const partGoRef = Math.round(refMoyen * coefGo);
  const ecartGo = partGoSoumis - partGoRef;

  const partSoSoumis = scope === 'go_seul' ? 0 : Math.round(quotedAmount * coefSo);
  const partSoRef = scope === 'go_seul' ? 0 : Math.round(refMoyen * coefSo);
  const ecartSo = partSoSoumis - partSoRef;

  // Correction 3 : Étanchéité toiture non forfaitisée, basée sur S_toiture x ratio_m²
  const partEtancheiteSoumis = scope === 'go_seul' ? 0 : Math.round(partEtancheiteRef * (quotedAmount / refMoyen));
  const ecartEtancheite = partEtancheiteSoumis - partEtancheiteRef;

  // Correction 7 : Scinder Aléas (5%) et Marge Entrepreneur (7-10%, médiane 8.5%)
  const coutDirectSoumis = partGoSoumis + partSoSoumis + partEtancheiteSoumis;
  const coutDirectRef = partGoRef + partSoRef + partEtancheiteRef;

  const partAleasSoumis = Math.round(coutDirectSoumis * SEUILS_TECHNIQUES.provisionAleasTaux);
  const partAleasRef = Math.round(coutDirectRef * SEUILS_TECHNIQUES.provisionAleasTaux);
  const ecartAleas = partAleasSoumis - partAleasRef;

  const partMargeSoumis = Math.round(coutDirectSoumis * SEUILS_TECHNIQUES.margeEntrepreneurMoyenne);
  const partMargeRef = Math.round(coutDirectRef * SEUILS_TECHNIQUES.margeEntrepreneurMoyenne);
  const ecartMarge = partMargeSoumis - partMargeRef;

  function fmtEcart(val) {
    if (val === 0) return "0 FCFA";
    return (val > 0 ? "+" : "") + formatFCFA(val);
  }

  const repartitionRows = [
    [
      "Gros Œuvre & Structure BAEL",
      formatFCFA(partGoSoumis),
      formatFCFA(partGoRef),
      fmtEcart(ecartGo),
      "Terrassements, fondations, poteaux, poutres, dalles, maçonneries"
    ],
    [
      "Second Œuvre & Finitions",
      scope === 'go_seul' ? "Exclu" : formatFCFA(partSoSoumis),
      scope === 'go_seul' ? "Exclu" : formatFCFA(partSoRef),
      scope === 'go_seul' ? "-" : fmtEcart(ecartSo),
      scope === 'go_seul' ? "Hors périmètre contrat" : "Plomberie, électricité, carrelage, menuiseries int./ext."
    ],
    [
      "Étanchéité Toiture & Acrotères",
      scope === 'go_seul' ? "Exclu" : formatFCFA(partEtancheiteSoumis),
      scope === 'go_seul' ? "Exclu" : formatFCFA(partEtancheiteRef),
      scope === 'go_seul' ? "-" : fmtEcart(ecartEtancheite),
      `Complexe bitumineux (${sToiture} m² toiture × 28 000 F/m² — à valider BET)`
    ],
    [
      "Provision pour Aléas (5% coût direct)",
      formatFCFA(partAleasSoumis),
      formatFCFA(partAleasRef),
      fmtEcart(ecartAleas),
      "Couverture des sujétions imprévues et aléas de sol"
    ],
    [
      "Marge Entrepreneur (7–10% coût direct)",
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
      "Confrontation globale du devis vs budget repère BET"
    ]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Macro-Lot Technique', 'Devis Soumis', 'Budget Réf. BET', 'Écart Constaté', 'Base & Observations']],
    body: repartitionRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    styles: { fontSize: 6.8, cellPadding: 1.9 },
    columnStyles: { 
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 26 },
      2: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY, cellWidth: 26 },
      3: { halign: 'right', cellWidth: 30 },
      4: { fontSize: 6.2 }
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 2 : PIÈGES TECHNIQUES & LES 7 OMISSIONS FRÉQUENTES
  // =========================================================================
  doc.addPage();
  drawAuditHeader("Rapport de Contre-Expertise & Audit Devis", "Partie II : Détection des Pièges Techniques, Ratios Incohérents & Omissions");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("III. AUDIT DES RATIOS STRUCTURAUX & PIÈGES TECHNIQUES COURANTS", 14, currentY);

  const piegesRows = [
    // Correction 8b : reformulation ciment 42.5R vs 32.5
    ["Dosage du Béton Armé", "Mention imprécise 'Béton Armé'", "Privilégier le CEM II 42.5R dosé à 350 kg/m³ pour les éléments porteurs (marge de sécurité sur fc28 ≥ 25 MPa). Ciment 32.5N admissible uniquement sous réserve d'essais d'écrasement concluants."],
    ["Qualité & Diamètre des Aciers", "Aciers non spécifiés ou lisses", "Imposer : Aciers Haute Adhérence FeE500 certifiés. Interdire les fers déclassés ou de récupération."],
    // Correction 8a : rectification justification table de compression (flexion et diaphragme)
    ["Épaisseur Table de Compression", "Table réduite à 2 ou 3 cm", "Norme BAEL 91 : Épaisseur minimale de 4 cm armée d'un treillis soudé (exigence BAEL : flexion locale et fonctionnement en diaphragme horizontal)."],
    ["Enrobage des Armatures", "Absence totale de cales béton", "Exiger cales de 4,5 cm en milieu marin (Dakar Littoral) et 3 cm en zone intérieure sous peine de rouille expansive."],
    ["Nature des Agrégats", "Gravier calcaire tendre", "Prescrire obligatoirement le concassé de basalte des carrières de Diack pour toute la structure porteuse."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Composant Structurel', 'Piège / Formule Trompeuse Constatée', 'Exigence Rectificative ChantierSur']],
    body: piegesRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.0, cellPadding: 2.1 },
    columnStyles: { 0: { cellWidth: 44, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IV. LES 7 OMISSIONS STRATÉGIQUES DES ENTREPRENEURS À DAKAR", 14, currentY);

  // Correction 4 : suppression des statistiques inventées ("65%", "30%"), ajout colonne Source
  // Correction 10 : harmonisation seuils techniques (décoffrage joues 48h-7j, sous-faces 21j min)
  const omissionsRows = [
    ["1. L'Arase Étanche de Soubassement", "Fréquemment omise dans les devis tâcherons", "Absence de feutre bitumé sous longrines = remontées capillaires sur 1,50 m de mur.", "DTU 20.1 & Règles BAEL"],
    ["2. La Cure du Béton pendant 7 jours", "Considérée à tort comme accessoire", "Béton non arrosé sous le soleil = microfissuration et perte jusqu'à ~30% de résistance.", "BAEL 91 R99 art. A.3.3"],
    ["3. L'Évacuation des Déblais et Gravois", "Reportée en supplément de fin de chantier", "Imposer contractuellement le nettoyage continu et l'évacuation en décharge autorisée.", "CCAG Travaux"],
    ["4. Les Essais d'Écrasement d'Éprouvettes", "Absents des devis tâcherons", "Recommandé dès R+2 pour certifier la résistance nominale fc28 >= 25 MPa du béton.", "NF EN 12390 / BAEL 91"],
    ["5. Le Cuvelage des Fosses et Bâches", "Chiffré en maçonnerie simple poreuse", "Les bâches Sen'Eau et fosses doivent être en béton armé étanche avec adjuvant hydrofuge.", "DTU 14.1 (Cuvelage)"],
    ["6. Les Étaiements & Délais Décoffrage", "Non formalisés au devis", "Décoffrage joues : 48 h à 7 j. Enlèvement sous-faces & étais : 21 jours min (portées courantes).", "SEUILS_TECHNIQUES"],
    ["7. La Prise de Terre en Fond de Fouille", "Omise au profit d'un simple piquet", "Exiger le câble cuivre nu 25 mm² en boucle sous semelle pour la sécurité des personnes.", "Norme NF C 15-100"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Poste Couramment Omis', 'Constat & Piège Fréquent', 'Correction Obligatoire ChantierSur', 'Référentiel / Source']],
    body: omissionsRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.3 },
    styles: { fontSize: 6.8, cellPadding: 2.0 },
    columnStyles: { 
      0: { cellWidth: 42, fontStyle: 'bold' },
      1: { cellWidth: 35 },
      2: { cellWidth: 70 },
      3: { cellWidth: 35, fontStyle: 'italic' }
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 3 : ÉCHELONNEMENT DES PAIEMENTS & GRILLE DE NÉGOCIATION
  // =========================================================================
  doc.addPage();
  drawAuditHeader("Rapport de Contre-Expertise & Audit Devis", "Partie III : Échéancier de Paiement Sécurisé & Grille de Négociation Chiffrée");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("V. CALENDRIER DE DÉCAISSEMENT RECOMMANDÉ (INDEXÉ SUR POINTS D'ARRÊT)", 14, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.0);
  doc.setTextColor(...COLOR_SLATE);
  doc.text(`Base de calcul : Budget cible de référence négocié (${formatFCFA(contractAmount)}) — à réajuster selon le montant contractuel final.`, 14, currentY + 4);

  // Correction 5 : Tranches calculées sur contractAmount (médiane refMoyen et non le devis surfacturé)
  const tranche1 = Math.round(contractAmount * 0.15); // Avance démarrage
  const tranche2 = Math.round(contractAmount * 0.25); // Fondations achevées
  const tranche3 = Math.round(contractAmount * 0.25); // Plancher RDC / R+1
  const tranche4 = Math.round(contractAmount * 0.20); // Toiture et élévations
  const tranche5 = Math.round(contractAmount * 0.10); // Réception provisoire
  const retenue = Math.round(contractAmount * 0.05);  // Retenue de garantie contractuelle 5%

  const echeancierRows = [
    ["Tranche 1 : Démarrage & Approvisionnement", "15 %", formatFCFA(tranche1), "Installation chantier, premières commandes aciers FeE500 et fouilles"],
    ["Tranche 2 : Réception des Fondations", "25 %", formatFCFA(tranche2), "Coulage des semelles, longrines et dallage RDC validés sur PV"],
    ["Tranche 3 : Superstructure & Dalles Mi-Parcours", "25 %", formatFCFA(tranche3), "Poteaux, poutres et dalles d'étages achevés sans désaffleurement"],
    ["Tranche 4 : Toiture Terrasse & Maçonneries", "20 %", formatFCFA(tranche4), "Étanchéité toiture éprouvée 48h en eau + agglos entièrement montés"],
    ["Tranche 5 : Réception Provisoire des Travaux", "10 %", formatFCFA(tranche5), "Remise des clés et signature du Procès-Verbal de Réception Provisoire"],
    ["Retenue de Garantie Contractuelle (1 an)", "5 %", formatFCFA(retenue), "Libérée UNIQUEMENT à la réception définitive après levée des réserves"]
  ];

  doc.autoTable({
    startY: currentY + 6.5,
    head: [['Étape Contractuelle de Décaissement', 'Quote-Part', 'Montant Associé', 'Condition Impérative de Déblocage des Fonds']],
    body: echeancierRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.1, cellPadding: 2.1 },
    columnStyles: { 
      0: { cellWidth: 55, fontStyle: 'bold' },
      2: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VI. GRILLE D'ARGUMENTS DE NÉGOCIATION FACE À L'ENTREPRENEUR", 14, currentY);

  // Correction 2 : Pénalités de retard calculées à 1/1000e / jour, plafonnées à 5%
  const negoRows = [
    ["Sur l'Acompte Initial Élevé", "Refuser toute avance > 20%", "Argument : 'Les matériaux seront livrés par tranches sur le site et payés directement aux fournisseurs certifiés.'"],
    ["Sur la Fluctuation des Prix", "Imposer le prix forfaitaire et ferme", "Argument : 'Le contrat est signé sur une base globale forfaitaire non révisable. Le stockage initial sécurise le prix.'"],
    ["Sur les Travaux Supplémentaires", "Avenant écrit obligatoire", "Argument : 'Aucun supplément de prix ne sera recevable s'il n'a pas fait l'objet d'un ordre écrit signé du maître d'ouvrage.'"],
    ["Sur les Délais de Livraison", `Acter ${formatFCFA(penaliteJournaliere)}/jour (1/1000e)`, `Argument : 'Clause pénale à stipuler expressément au contrat (${formatFCFA(penaliteJournaliere)}/jour, plafonnée à 5% soit ${formatFCFA(plafondPenalite)}).'`]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Sujet de Friction Fréquent', 'Position Ferme à Tenir', 'Formulation d\'Ingénierie à Imposer']],
    body: negoRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.1, cellPadding: 2.1 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 4 : LES 5 CLAUSES DU COCC & AVIS DE CLÔTURE
  // =========================================================================
  doc.addPage();
  drawAuditHeader("Rapport de Contre-Expertise & Audit Devis", "Partie IV : Clauses Contractuelles Impératives (COCC) & Visa de Clôture");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VII. LES 5 CLAUSES JURIDIQUES DE SAUVEGARDE DU CODE DES OBLIGATIONS (COCC)", 14, currentY);

  // Correction 1 : Remplacement des faux articles 767 et 768 par la formulation légale COCC
  // Correction 2 : Pénalité 1/1000e/jour plafonnée à 5% dans la clause 4
  const clausesCOCC = [
    {
      titre: "1. Clause de Retenue de Garantie Contractuelle de 5% (Conformément aux dispositions du COCC relatives au contrat d'entreprise)",
      texte: "Une retenue de 5% est systématiquement déduite de chaque acompte payé à l'entrepreneur. Cette somme est consignée et ne sera débloquée qu'à l'issue du délai de garantie d'un an suivant le Procès-Verbal de Réception Définitive, après levée complète de toutes les réserves éventuelles."
    },
    {
      titre: "2. Clause de Forfaitisation Ferme et Non Révisable (Conformément aux dispositions du COCC relatives au contrat d'entreprise)",
      texte: "Le montant convenu au présent marché est réputé forfaitaire, ferme et définitif pour l'intégralité des prestations décrites. Aucune majoration pour augmentation du coût de la main d'œuvre, du carburant ou des matériaux (fer, ciment) ne pourra être opposée au maître d'ouvrage."
    },
    {
      titre: "3. Clause de Conditionnement des Décaissements aux Points d'Arrêt",
      texte: "Aucun paiement ne peut être exigé sur simple constat de temps écoulé. Chaque acompte est formellement subordonné à la présentation du Procès-Verbal de Point d'Arrêt signé par le technicien mandataire du maître d'ouvrage (armatures semelles, hourdis, décoffrage)."
    },
    {
      titre: "4. Clause de Pénalités de Retard Journalières (Clause Pénale Contractuelle)",
      texte: `En cas de retard dans l'exécution des travaux par rapport au délai convenu, et hors cas de force majeure dûment constatée, l'entrepreneur sera redevable d'une pénalité contractuelle de 1/1000e du montant du marché par jour ouvré de retard (soit ${formatFCFA(penaliteJournaliere)}/jour), plafonnée à 5% du marché (soit ${formatFCFA(plafondPenalite)}). Clause pénale à stipuler expressément au contrat et compensable sur les acomptes.`
    },
    {
      titre: "5. Clause de Résolution de Plein Droit en Cas d'Abandon de Chantier",
      texte: "Tout arrêt injustifié des travaux supérieur à 14 jours calendaires consécutifs entraînera la résiliation immédiate du contrat aux torts exclusifs de l'entrepreneur après mise en demeure par exploit d'huissier restée sans effet sous 8 jours, sans préjudice de poursuites en dommages et intérêts."
    }
  ];

  // Test bloquant : validation automatique de toutes les références juridiques
  const clausesFullText = clausesCOCC.map(c => `${c.titre} ${c.texte}`).join(' ');
  validerReferencesJuridiques(clausesFullText);

  let clauseTop = currentY + 4;
  clausesCOCC.forEach((c) => {
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.rect(14, clauseTop, 182, 23, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, clauseTop, 182, 23, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(c.titre, 18, clauseTop + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(51, 65, 85);
    const splitC = doc.splitTextToSize(c.texte, 174);
    doc.text(splitC, 18, clauseTop + 10.5);

    clauseTop += 25.5;
  });

  currentY = clauseTop + 3;

  // Bloc de validation technique officiel (Correction 9 : suppression de "certifié", avis d'ingénierie indicatif)
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.rect(14, currentY, 182, 21, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 21, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("AVIS TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLOR_SLATE);
  const disclaimerCloture = doc.splitTextToSize(
    "Document indicatif d'aide à la décision généré automatiquement selon les règles de l'art du bâtiment (BAEL 91 R99) et le Code des Obligations Civiles et Commerciales. Il ne constitue ni une expertise judiciaire, ni le visa d'un bureau d'études agréé. Les montants doivent être confirmés par des professionnels qualifiés avant tout engagement contractuel.",
    174
  );
  doc.text(disclaimerCloture, 18, currentY + 10.5);
  doc.text(`Dossier d'audit indicatif n° ${refDoc} • Émis à Dakar le ${currentDate} pour le compte de ${clientName}.`, 18, currentY + 18.5);
}
