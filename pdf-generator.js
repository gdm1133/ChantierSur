/**
 * ChantierSur.com - Moteur de Génération de Livrables Techniques & Juridiques
 * Conforme : BAEL 91 Révisé 99 • Droit de la Construction COCC Sénégal
 */

(function() {
  'use strict';

  // Couleurs de la charte institutionnelle ChantierSur
  const COLOR_NAVY = [11, 19, 37];      // #0B1325
  const COLOR_AMBER = [245, 158, 11];   // #F59E0B
  const COLOR_SLATE = [71, 85, 105];    // #475569
  const COLOR_BG_LIGHT = [248, 250, 252]; // #F8FAFC

  function getJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (typeof jsPDF !== 'undefined') return jsPDF;
    return null;
  }

  // =========================================================================
  // FONCTION PRINCIPALE EXPORTÉE SUR WINDOW
  // =========================================================================
  // FORMATTEUR MONÉTAIRE SÉCURISÉ (ESPACES ASCII PURS, AUCUN SLASH NI CARACTÈRE CORROMPU)
function formatFCFA(val) {
  if (val === undefined || val === null || isNaN(val)) return "0 FCFA";
  const num = Math.round(val).toString();
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

// MOTEUR D'ESQUISSE & FAISABILITÉ TECHNIQUE HAUTE VALEUR (4 PAGES)
function generateEsquissePDF(doc, data) {
  const COLOR_NAVY = [11, 19, 37];      // #0B1325
  const COLOR_AMBER = [245, 158, 11];   // #F59E0B
  const COLOR_SLATE = [71, 85, 105];    // #475569
  const COLOR_BG_LIGHT = [248, 250, 252];

  // Données recueillies
  const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
  const clientPhone = (data.phone_prefix || '+221') + ' ' + (data.client_phone || '770000000');
  const clientEmail = (data.client_email || 'client@chantiersur.com').trim();
  const surface = parseFloat(data.surface) || 200;
  const facade1 = parseFloat(data.facade_width) || 10;
  const facade2 = parseFloat(data.facade_width_2) || 0;
  const streetWidth = parseFloat(data.street_width) || 12;
  const hasBasement = data.has_basement === 'oui';
  const energyBackup = data.energy_backup || 'standard';
  const levels = parseInt(data.exact_levels, 10) || 1;
  const totalLevelsCount = levels + 1; // RDC + étages
  const location = data.project_location || 'Dakar - Zone Urbaine';
  const landStatus = data.land_status || 'Titre Foncier (TF)';
  const lotNumber = data.lot_number || 'Non spécifié';
  const config = data.parcel_config || 'bande';
  const usage = data.building_usage || 'unifamilial';
  const standing = data.standing || 'moyen';
  const sanitation = data.sanitation_type || 'autonome';
  const neighbor = data.neighbor_status || 'vide';
  const refDoc = 'CS-ESQ-' + (data.timestamp ? data.timestamp.toString().slice(-6) : Date.now().toString().slice(-6));
  const currentDate = new Date().toLocaleDateString('fr-FR');

  // --- CALCULS URBANISTIQUES (CODE DE L'URBANISME SÉNÉGAL) ---
  const cesMax = 0.65;
  const empriseSolMax = Math.round(surface * cesMax);
  const espacesLibres = Math.round(surface * (1 - cesMax));
  const sdpTotale = Math.round(empriseSolMax * totalLevelsCount * 0.90);
  const hauteurFaitage = ((totalLevelsCount * 3.10) + 1.20).toFixed(1);
  const reculAlignement = streetWidth >= 15 ? 4.0 : 3.0; // Recul sur rue obligatoire
  const hauteurMaxGabarit = (streetWidth + reculAlignement).toFixed(1); // Décret 2009-1450: H <= L + R
  const respecteGabarit = parseFloat(hauteurFaitage) <= parseFloat(hauteurMaxGabarit);

  // --- ANALYSE GÉOTECHNIQUE PAR SECTEUR TERRITORIAL DU SÉNÉGAL ---
  const locLower = location.toLowerCase();
  const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
  const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
  const isClay = locLower.includes('diamniadio') || locLower.includes('bargny') || locLower.includes('sébikotane');

  let portanceSolBars = 2.2;
  let natureSol = "Plateau sédimentaire / Latérite compacte portante";
  let modeFondation = "Semelles isolées superficielles reliées par longrines de rigidité croisées";
  let enrobageAciers = "3,0 cm (Exposition standard protégée)";
  let typeCiment = "CEM II/B-L 42.5R dosé à 350 kg/m³ minimum";
  let hydroRisk = "Modéré / Infiltration pluviale standard";

  if (isMarine) {
    portanceSolBars = 2.0;
    natureSol = "Sable dunaire quartzeux littoral / Présence possible de basalte fracturé";
    modeFondation = "Semelles isolées rigides avec double nappe d'aciers HA et longrines antisismiques";
    enrobageAciers = "4,5 cm à 5,0 cm STRICT (Attaque saline sévère par embruns et brouillard marin)";
    typeCiment = "CEM II 42.5R haute résistance aux chlorures";
    hydroRisk = "Élevé (Remontées capillaires côtières et sels corrosifs)";
  } else if (isWetland) {
    portanceSolBars = 1.2;
    natureSol = "Sables alluvionnaires fins compressibles / Nappe phréatique sub-affleurante en hivernage";
    modeFondation = hasBasement ? "Radier général étanche sous cuvelage avec parois moulées" : "Radier général nervuré ou semelles filantes rigides avec cuvelage étanche";
    enrobageAciers = "4,0 cm avec hydrofuge de masse Sika";
    typeCiment = "CEM II 42.5R avec compacité maximale";
    hydroRisk = "Critique (Submersion saisonnière / Infiltration permanente sous semelle)";
  } else if (isClay) {
    portanceSolBars = 1.5;
    natureSol = "Marnes et argiles gonflantes (Phénomène sévère de retrait / gonflement volumétrique)";
    modeFondation = "Puits courts ancrés sous la zone active de dessiccation (-2,20 m) ou réseau de longrines rigides";
    enrobageAciers = "3,5 cm avec renfort des armatures longitudinales de traction";
    typeCiment = "CEM II 42.5R normalisé";
    hydroRisk = "Mouvements différentiels saisonniers (Saison sèche vs Hivernage)";
  }

  // --- DESCENTE DE CHARGES PRÉLIMINAIRE (BAEL 91 R99) ---
  const surfaceInfluence = 16.0; // Poteau le plus chargé : trame moyenne 4x4m
  const gPlancher = 5.8; // kN/m² (Dalle corps creux 16+4, chape, carrelage, cloisons, enduits)
  const gPoteauPoutre = 1.2; // kN/m²
  const gNiveau = (gPlancher + gPoteauPoutre) * surfaceInfluence; // 112 kN/niveau
  const qUnit = usage === 'bureaux' ? 2.5 : (usage === 'mixte' ? 2.0 : 1.5); // kN/m²
  const qNiveau = qUnit * surfaceInfluence; // 24 à 40 kN/niveau

  const gTotal = gNiveau * totalLevelsCount;
  const qTotal = qNiveau * totalLevelsCount;
  const nSer = Math.round(gTotal + qTotal); // kN
  const nUltime = Math.round((1.35 * gTotal) + (1.5 * qTotal)); // kN
  const tonnesSer = (nSer / 9.81).toFixed(1);

  // Surface et dimension de la semelle carrée (DTU 13.12)
  const qAdmkNm2 = portanceSolBars * 100; // 1 bar = 100 kN/m²
  const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2);
  const coteSemelleCarrer = Math.ceil(Math.sqrt(surfaceSemelleRequise) * 20) / 20; // Arrondi aux 5 cm sup
  const epaisseurSemelle = Math.max(35, Math.round(((coteSemelleCarrer * 100 - 30) / 4) + 5)); // Condition de rigidité en cm

  // --- EN-TÊTE RÉUTILISABLE SANS "1." DANS LE TITRE ---
  function drawEsquisseHeader(pageDoc, pageNum, pageTitle, subTitle) {
    pageDoc.setFillColor(...COLOR_NAVY);
    pageDoc.rect(0, 0, 210, 28, 'F');
    pageDoc.setFillColor(...COLOR_AMBER);
    pageDoc.rect(0, 28, 210, 1.5, 'F');

    // Logo et marque
    pageDoc.setTextColor(255, 255, 255);
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(14);
    pageDoc.text("Chantier", 14, 13);
    const tw = pageDoc.getTextWidth("Chantier");
    pageDoc.setTextColor(...COLOR_AMBER);
    pageDoc.text("Sur.com", 14 + tw, 13);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(148, 163, 184);
    pageDoc.text("BUREAU D'ÉTUDES NUMÉRIQUE • AUDIT TECHNIQUE BTP SÉNÉGAL", 14, 20);

    // Données cartouche haut
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(255, 255, 255);
    pageDoc.text(`Dossier : ${refDoc}`, 196, 12, { align: 'right' });
    pageDoc.setTextColor(203, 213, 225);
    pageDoc.text(`Date : ${currentDate}`, 196, 18, { align: 'right' });
    pageDoc.text(`Titulaire : ${clientName.substring(0, 26)}`, 196, 24, { align: 'right' });

    // Titres de section
    pageDoc.setTextColor(...COLOR_NAVY);
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(10.5);
    pageDoc.text(pageTitle.toUpperCase(), 14, 37);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(...COLOR_SLATE);
    pageDoc.text(subTitle, 14, 42);

    pageDoc.setDrawColor(226, 232, 240);
    pageDoc.setLineWidth(0.5);
    pageDoc.line(14, 45, 196, 45);

    // FILIGRANE DE SÉCURITÉ NOMINATIF ANTI-DIFFUSION
    pageDoc.setFontSize(6.2);
    pageDoc.setFont('helvetica', 'italic');
    pageDoc.setTextColor(100, 116, 139);
    pageDoc.text(`DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL — MAÎTRE D'OUVRAGE : ${clientName.toUpperCase()} • TÉL : ${clientPhone} • TITRE FONCIER : ${lotNumber}. LA TRANSMISSION DE CE LIVRABLE À DES TIERS SANS MANDAT ENGAGE LA RESPONSABILITÉ CIVILE ET PÉNALE DU DÉTENTEUR.`, 14, 49);
  }

  // =========================================================================
  // PAGE 1 : IDENTIFICATION FONCIÈRE, GABARIT & VOLUMÉTRIE DUA
  // =========================================================================
  drawEsquisseHeader(doc, 1, "Rapport d'Esquisse & Faisabilité Technique", "Partie I : Cartouche Foncier, Gabarit Volumétrique & Conformité au Code de l'Urbanisme");

  // Cartouche officiel d'identification
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 53, 182, 34, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IDENTIFICATION NOMINATIVE DU MAÎTRE D'OUVRAGE & DU TITRE DE PROPRIÉTÉ", 18, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Maître d'Ouvrage : ${clientName}`, 18, 66);
  doc.text(`Téléphone Notifié : ${clientPhone}`, 18, 72);
  doc.text(`Email Enregistré : ${clientEmail}`, 18, 78);
  doc.text(`Statut Foncier : ${landStatus}`, 18, 84);

  let dimTxt = `Façade ${facade1} m × Profondeur ~${(surface / facade1).toFixed(1)} m`;
  if (config === 'angle' && facade2 > 0) dimTxt = `Façade 1: ${facade1} m • Façade 2: ${facade2} m (Angle)`;

  doc.text(`Localisation : ${location}`, 110, 66);
  doc.text(`Réf. Cadastrale / Lot : ${lotNumber}`, 110, 72);
  doc.text(`Destination de l'Ouvrage : ${usage.toUpperCase()}`, 110, 78);
  doc.text(`Géométrie Parcelle : ${dimTxt}`, 110, 84);

  let currentY = 93;

  // I. Gabarit Volumétrique & Conformité Règle Hauteur
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("I. GABARIT URBANISTIQUE & DROITS À BÂTIR (DÉCRET 2009-1450 & PDU DAKAR)", 14, currentY);

  const gabaritRows = [
    ["Surface Totale Parcellaire", `${surface} m²`, "Superficie de base enregistrée au cadastre"],
    ["Emprise au Sol Maximale (CES = 0,65)", `${empriseSolMax} m²`, "Limite légale de projection au sol des constructions"],
    ["Espaces Libres Imperméables (35%)", `${espacesLibres} m²`, "Zone perméable requise pour l'infiltration pluviale"],
    ["Surface Développée de Plancher Totale (SDP)", `~${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (hors trémies)`],
    ["Hauteur Totale du Bâtiment Projeté", `~${hauteurFaitage} m`, "Dalle supérieure + acrotère de terrasse de 1,20 m"],
    ["Largeur de la Voie Publique Desservante", `${streetWidth} mètres`, `Recul légal d'alignement exigé : ${reculAlignement.toFixed(1)} m`],
    ["Gabarit Maximal Légal sur Rue (H <= L + R)", `${hauteurMaxGabarit} mètres`, respecteGabarit ? "CONFORME au gabarit direct sur rue" : "DÉPASSEMENT : Retrait en gradins à 45° requis aux étages hauts"],
    ["Places de Stationnement Privatives Obligatoires", `${Math.max(1, Math.round(sdpTotale / 120))} place(s)`, "Norme PDU Dakar : 1 place par logement ou tranche de 100 m²"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Indicateur d\'Urbanisme', 'Valeur Déterminée', 'Exigence Légale (Direction de l\'Urbanisme)']],
    body: gabaritRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // II. Implantation & Servitudes de Voisinage
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("II. CONTRAINTES D'IMPLANTATION, PAN COUPÉ D'ANGLE & PROSPECTS", 14, currentY);

  let angleDesc = "Alignement standard sur voie unique avec recul obligatoire de 3,00 m.";
  if (config === 'angle') {
    angleDesc = `Parcelle d'Angle (${facade1}m × ${facade2}m) : Pan coupé de visibilité obligatoire de 3,50 m d'hypoténuse à l'intersection pour sécuriser le carrefour. Double recul sur les deux rues.`;
  } else if (config === 'traversante') {
    angleDesc = "Parcelle Traversante : Deux accès distincts sur voies publiques opposées. Recul réglementaire de 3,00 m sur les deux façades.";
  } else if (config === 'bande') {
    angleDesc = "Configuration en Bande : Murs mitoyens latéraux aveugles obligatoires (coupe-feu 2h). Aucune fenêtre directe sans accord écrit des voisins.";
  } else {
    angleDesc = "Parcelle Isolée : Recul minimal de 2,00 m imposé sur toutes les limites séparatives de propriété.";
  }

  const mitoyenRows = [
    ["Régime de Façade & Voirie", config.toUpperCase(), angleDesc],
    ["État des Terrains Voisins", neighbor === 'vide' ? "Parcelles Voisines Nues" : "Constructions Mitoyennes Présentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-œuvre préalable." : "Constat d'huissier contradictoire obligatoire avant toute excavation."],
    ["Puits de Jour & Cours d'Aération", "Minimum 12 m² (Largeur min 3,00 m)", "Obligatoire pour les pièces aveugles centrales selon le règlement sanitaire."],
    ["Régime des Eaux de Toiture", "Égout intérieur à la parcelle", "Interdiction absolue de déverser les eaux pluviales sur le domaine public ou chez les voisins."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Paramètre Spatial', 'Situation Chantier', 'Prescription d\'Ingénierie Obligatoire']],
    body: mitoyenRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.3 },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 2 : DESCENTE DE CHARGES BAEL 91 & DIMENSIONNEMENT SEMELLE
  // =========================================================================
  doc.addPage();
  drawEsquisseHeader(doc, 2, "Rapport d'Esquisse & Faisabilité Technique", "Partie II : Descente de Charges (BAEL 91 R99) & Dimensionnement des Fondations");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU LE PLUS CHARGÉ (BAEL 91 R99)", 14, currentY);

  const descenteRows = [
    ["Surface d'Influence du Poteau Central", `${surfaceInfluence} m²`, "Trame structurelle courante 4,00 m × 4,00 m"],
    ["Charges Permanentes Cumulées (G)", `${gTotal.toFixed(0)} kN (~${(gTotal / 9.81).toFixed(1)} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
    ["Charges d'Exploitation Cumulées (Q)", `${qTotal.toFixed(0)} kN (~${(qTotal / 9.81).toFixed(1)} T)`, `Norme NF P 06-001 selon usage : ${qUnit} kN/m² par niveau`],
    ["Effort Normal Total de Service (N_ser)", `${nSer} kN (~${tonnesSer} Tonnes)`, "N_ser = G + Q (Utilisé pour le dimensionnement du sol)"],
    ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (~${(nUltime / 9.81).toFixed(1)} Tonnes)`, "N_u = 1,35 G + 1,5 Q (Utilisé pour le ferraillage des armatures)"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Paramètre de Descente de Charges', 'Valeur Calculée', 'Hypothèse & Méthode de Calcul BAEL 91']],
    body: descenteRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // IV. Dimensionnement Géométrique de la Semelle & Profil Sol
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÉOTECHNIQUE", 14, currentY);

  const semelleRows = [
    ["Capacité Portante Admissible du Sol (q_adm)", `${portanceSolBars.toFixed(1)} bars (${qAdmkNm2} kN/m²)`, "Valeur géotechnique estimative pour le secteur sélectionné"],
    ["Surface Portante Minimale Requise (S)", `${surfaceSemelleRequise} m²`, "Formule DTU 13.12 : S >= 1,05 × N_ser / q_adm"],
    ["Dimensionnement Semelle Carrée (A × B)", `${coteSemelleCarrer.toFixed(2)} m × ${coteSemelleCarrer.toFixed(2)} m`, "Section d'assise au sol sous le poteau le plus chargé"],
    ["Épaisseur Minimale de la Semelle (H)", `${epaisseurSemelle} cm (d >= ${epaisseurSemelle - 5} cm)`, "Condition de rigidité : d >= (A - a)/4 pour éviter le poinçonnement"],
    ["Enrobage Réglementaire des Aciers", enrobageAciers, "Obligation BAEL 91 R99 pour prévenir la corrosion des armatures"],
    ["Nature Stratigraphique du Terrain", natureSol, "Profil géologique dominant dans la zone choisie"],
    ["Mode de Fondation Préconisé", modeFondation, hasBasement ? "Cuvelage étanche requis en sous-sol" : "Adapté pour éviter les tassements différentiels"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Élément de Dimensionnement', 'Prescription Déterminée', 'Justification Technique de Sécurité']],
    body: semelleRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 3 : RÉSEAUX (SEN'EAU, SENELEC, ONAS) & CLIMAT TROPICAL
  // =========================================================================
  doc.addPage();
  drawEsquisseHeader(doc, 3, "Rapport d'Esquisse & Faisabilité Technique", "Partie III : Résilience Fluides (Sen'Eau, Senelec, ONAS) & Conception Bioclimatique");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("V. RÉSERVE HYDRAULIQUE (SEN'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT (NS 17-074)", 14, currentY);

  const occupantsEstimes = Math.max(6, Math.round(sdpTotale / 25));
  const bacheEauVolume = Math.max(3.5, ((occupantsEstimes * 150 * 2) / 1000)).toFixed(1);
  const puissanceKva = Math.max(9, Math.round(totalLevelsCount * 5.0));

  let energieDetail = "Raccordement standard Senelec monophasé ou triphasé.";
  if (energyBackup === 'solaire') energieDetail = "Installation photovoltaïque hybride avec onduleur 5 kVA et stockage lithium pour charges critiques (éclairage, froid, surpresseur).";
  if (energyBackup === 'groupe') energieDetail = "Inverseur de source automatique Normal/Secours (ATS) + local insonorisé pour groupe électrogène diesel.";

  const reseauxRows = [
    ["Bâche à Eau Tampon Enterrée (Sen'Eau)", `${bacheEauVolume} m³ (Autonomie 48h)`, "Obligatoire face aux baisses de pression récurrentes. Cuve béton étanche + surpresseur hydrophore."],
    ["Bilan de Puissance Souscrite (Senelec)", `${puissanceKva} kVA (${puissanceKva > 12 ? 'Triphasé' : 'Monophasé'})`, "Calculé pour climatisation split system complète, éclairage et groupe motopompe."],
    ["Secours Énergétique Préconisé", energyBackup.toUpperCase(), energieDetail],
    ["Boucle de Terre en Fond de Fouille", "Câble cuivre nu 25 mm² (<= 5 Ohms)", "Ceinture sous semelles obligatoire pour la protection contre la foudre en hivernage."],
    ["Système d'Assainissement des Eaux", sanitation === 'onas' ? "Réseau Public Collectif ONAS" : "Fosse Toutes Eaux Étanche (NS 17-074)", sanitation === 'onas' ? "Pose obligatoire d'un clapet anti-retour de façade contre les refoulements d'égout." : `Fosse étanche 3 compartiments (${Math.max(4.5, totalLevelsCount * 1.5).toFixed(1)} m³) + puits filtrant.`]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Poste VRD & Équipements', 'Dimensionnement Préconisé', 'Prescription Fonctionnelle Indispensable']],
    body: reseauxRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // VI. Conception Bioclimatique Tropicale (Dakar)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VI. CONCEPTION BIOCLIMATIQUE & PROTECTION THERMIQUE SOUS CLIMAT TROPICAL", 14, currentY);

  const bioclimRows = [
    ["Orientation & Vents Dominants", "Alizés maritimes N-NO", "Privilégier la ventilation traversante pour capter les brises fraîches et réduire le besoin de climatisation."],
    ["Protection Façades Est / Ouest", "Harmattan sec & Soleil rasant", "Limiter les baies vitrées sur ces façades ou intégrer des casquettes béton / brise-soleil verticaux."],
    ["Isolation Toiture Terrasse", "Complexe SBS 4mm + Chape réfléchissante", "L'isolation thermique sous chape diminue la température sous plafond de 4°C à 6°C."],
    ["Étanchéité Acrotères & Solins", "Relevés d'étanchéité min 20 cm", "Goutte d'eau et bavette zinc obligatoires pour éviter le ruissellement noirci sur les façades."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Axe Bioclimatique', 'Prescription d\'Ingénierie', 'Bénéfice Confort & Durabilité']],
    body: bioclimRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 4 : ENVELOPPE BUDGET TCE & FEUILLE DE ROUTE ADMINISTRATIVE TELEDAC
  // =========================================================================
  doc.addPage();
  drawEsquisseHeader(doc, 4, "Rapport d'Esquisse & Faisabilité Technique", "Partie IV : Enveloppe Budgétaire TCE & Procédure Administrative du Permis (TELEDAC)");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VII. ENVELOPPE BUDGÉTAIRE PRÉVISIONNELLE TOUS CORPS D'ÉTAT (TCE SÉNÉGAL 2026)", 14, currentY);

  let coutM2 = standing === 'haut' ? 325000 : (standing === 'economique' ? 225000 : 270000);
  if (levels >= 3) coutM2 += (levels * 6000); // Surcoût de structure et pompage
  if (hasBasement) coutM2 += 40000; // Surcoût cuvelage et terrassement sous-sol

  const budgetTotalTCE = Math.round(sdpTotale * coutM2);
  const pTerrassement = Math.round(budgetTotalTCE * (hasBasement ? 0.18 : 0.14));
  const pGrosOeuvre = Math.round(budgetTotalTCE * 0.36);
  const pSecondOeuvre = Math.round(budgetTotalTCE * 0.32);
  const pEtancheite = Math.round(budgetTotalTCE * 0.08);
  const pAleas = Math.round(budgetTotalTCE * 0.07);
  const pTotal = pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite + pAleas;

  const budgetTceRows = [
    ["1. Terrassements, Fouilles & Fondations", formatFCFA(pTerrassement), hasBasement ? "Fouilles sous-sol, blindage, béton armé hydrofuge" : "Fouilles en puits/rigoles, béton de propreté, semelles armées, longrines"],
    ["2. Superstructure Béton Armé BAEL 91", formatFCFA(pGrosOeuvre), "Poteaux, poutres, dalles corps creux 16+4, maçonnerie agglos vibrés de 15"],
    ["3. Second Œuvre, Fluides & Électricité", formatFCFA(pSecondOeuvre), "Plomberie multicouche, câblage NF C 15-100, carrelage grès cérame, menuiseries"],
    ["4. Étanchéité Toiture Terrasse & Cuvelage", formatFCFA(pEtancheite), "Complexe bicouche bitumineux 4mm, relevés d'acrotère et protection thermique"],
    ["5. Provision pour Aléas & Marché (7%)", formatFCFA(pAleas), "Marge de sécurité couvrant les fluctuations des prix du ciment 42.5R et fer FeE500"],
    ["ENVELOPPE GLOBALE ESTIMATIVE DU PROJET", formatFCFA(pTotal), `Ratio moyen d'ingénierie : ~${formatFCFA(Math.round(pTotal / sdpTotale))} / m² de plancher`]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Macro-Lot Technique TCE', 'Montant Prévisionnel', 'Prestations & Matériaux Normalisés Inclus']],
    body: budgetTceRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // VIII. Feuille de Route Légale & TELEDAC
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VIII. FEUILLE DE ROUTE LÉGALE : OBTENTION DU PERMIS DE CONSTRUIRE (TELEDAC)", 14, currentY);

  const etapesTeledac = [
    ["1. Bornage Contradictoire", "Géomètre-Expert Agréé (OGES)", "Plan de bornage régulier et scellement des bornes physiques."],
    ["2. Plans Architecturaux Visés", "Architecte Ordre (OAAS)", "Obligation légale pour toute surface > 80 m² ou tout R+1 et plus."],
    ["3. Note de Calcul de Stabilité", "Bureau d'Études Techniques (BET)", "Justification des sections de béton et armatures selon BAEL 91 R99."],
    ["4. Dépôt Plateforme TELEDAC", "Commission Mairie / DUA", "Délai légal de 28 à 40 jours. Interdiction formelle d'ouvrir le chantier sans arrêté signé."],
    ["5. Contrat & Clauses COCC", "Entreprise Générale / Tâcheron", "Imposer le contrat type avec retenue de garantie 5% et respect des 6 points d'arrêt."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Étape Administrative', 'Professionnel Compétent', 'Exigence Légale Impérative (Code de l\'Urbanisme)']],
    body: etapesTeledac,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.1 },
    margin: { left: 14, right: 14 }
  });

  // Bloc de validation technique officiel
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
  doc.text("Étude d'esquisse et de faisabilité établie conformément aux règles de l'art du bâtiment (BAEL 91 Révisé 99 & DUA Sénégal).", 18, currentY + 10);
  doc.text(`Rapport officiel certifié n° ${refDoc} • Émis à Dakar le ${currentDate} pour le compte exclusif de ${clientName}.`, 18, currentY + 15);
}


window.generateProjectPDF = function(projectData) {
    const jsPDFClass = getJsPDF();
    if (!jsPDFClass) {
      alert("Erreur critique : Bibliothèque jsPDF non disponible.");
      return;
    }

    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const data = projectData || {};
    const service = (data.service || 'express').toLowerCase();
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const clientPhone = (data.phone_prefix || '+221') + ' ' + (data.client_phone || '770000000');
    const clientEmail = (data.client_email || 'client@chantiersur.com').trim();
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const surface = parseFloat(data.surface) || 200;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const lotNumber = data.lot_number || 'Non renseigné';
    const landStatus = data.land_status || 'Titre Foncier (TF)';
    const standing = data.standing || 'moyen';
    const facadeWidth = parseFloat(data.facade_width) || 10;
    const parcelConfig = data.parcel_config || 'bande';
    const buildingUsage = data.building_usage || 'unifamilial';
    const sanitationType = data.sanitation_type || 'autonome';
    const neighborStatus = data.neighbor_status || 'vide';
    const refDoc = 'CS-' + (data.timestamp ? data.timestamp.toString().slice(-6) : Date.now().toString().slice(-6));
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // Calcul des surfaces réglementaires
    const totalLevelsCount = levels + 1; // RDC + étages
    const sdpTotal = Math.round(surface * (service === 'esquisse' ? totalLevelsCount * 0.75 : 1));

    // =========================================================================
    // EN-TÊTE RÉUTILISABLE (PAR PAGE)
    // =========================================================================
    function drawPageHeader(pageDoc, pageTitle, categoryText) {
      // Bandeau bleu foncé
      pageDoc.setFillColor(...COLOR_NAVY);
      pageDoc.rect(0, 0, 210, 28, 'F');

      // Ligne d'accent ambre
      pageDoc.setFillColor(...COLOR_AMBER);
      pageDoc.rect(0, 28, 210, 1.5, 'F');

      // Marque
      pageDoc.setTextColor(255, 255, 255);
      pageDoc.setFont('helvetica', 'bold');
      pageDoc.setFontSize(14);
      pageDoc.text("Chantier", 14, 13);
      const titleWidth = pageDoc.getTextWidth("Chantier");
      pageDoc.setTextColor(...COLOR_AMBER);
      pageDoc.text("Sur.com", 14 + titleWidth, 13);

      pageDoc.setFont('helvetica', 'normal');
      pageDoc.setFontSize(7.5);
      pageDoc.setTextColor(148, 163, 184);
      pageDoc.text("BUREAU D'ÉTUDES NUMÉRIQUE • AUDIT TECHNIQUE BTP SÉNÉGAL", 14, 20);

      // Métadonnées d'en-tête (droite)
      pageDoc.setFontSize(8);
      pageDoc.setTextColor(255, 255, 255);
      pageDoc.text(`Dossier : ${refDoc}`, 196, 12, { align: 'right' });
      pageDoc.setTextColor(203, 213, 225);
      pageDoc.text(`Date : ${currentDate}`, 196, 18, { align: 'right' });
      pageDoc.text(`Norme : BAEL 91 R99 / COCC`, 196, 24, { align: 'right' });

      // Sous-titre de la section
      pageDoc.setTextColor(...COLOR_NAVY);
      pageDoc.setFont('helvetica', 'bold');
      pageDoc.setFontSize(11);
      pageDoc.text(pageTitle.toUpperCase(), 14, 38);

      pageDoc.setFont('helvetica', 'normal');
      pageDoc.setFontSize(8);
      pageDoc.setTextColor(...COLOR_SLATE);
      pageDoc.text(categoryText, 14, 43);

      pageDoc.setDrawColor(226, 232, 240);
      pageDoc.setLineWidth(0.5);
      pageDoc.line(14, 46, 196, 46);
    }

    // =========================================================================
    // ENCADRÉ D'IDENTIFICATION PROJET (SUR PAGE 1)
    // =========================================================================
    function drawProjectIdentityBlock(startY) {
      doc.setFillColor(...COLOR_BG_LIGHT);
      doc.roundedRect(14, startY, 182, 30, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, startY, 182, 30, 2, 2, 'D');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text("IDENTIFICATION DU MAÎTRE D'OUVRAGE & DU SITE", 18, startY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Maître d'Ouvrage : ${clientName}`, 18, startY + 13);
      doc.text(`Contact : ${clientPhone} • ${clientEmail}`, 18, startY + 19);
      doc.text(`Statut Foncier : ${landStatus} (Parcelle : ${lotNumber})`, 18, startY + 25);

      doc.text(`Localisation : ${location}`, 115, startY + 13);
      doc.text(`Typologie : R+${levels} (${totalLevelsCount} niveaux)`, 115, startY + 19);
      doc.text(`Surface déclarée : ${surface} m² (Plancher calculé : ~${sdpTotal} m²)`, 115, startY + 25);

      return startY + 36;
    }

    // =========================================================================
    // 1. LIVRABLE : ESQUISSE & FAISABILITÉ
    // =========================================================================
    if (service === 'esquisse') {
      generateEsquissePDF(doc, data);
    }

    // =========================================================================
    // 2. LIVRABLE : BQE GROS ŒUVRE EXPRESS
    // =========================================================================
    else if (service === 'express') {
      // PAGE 1 : Quantitatifs Béton & Aciers
      drawPageHeader(doc, "2. Bordereau Quantitatif Estimatif (BQE) Gros Œuvre", "Phase Budget : Cubages Béton, Aciers FeE500, Ciment & Granulats");
      let currentY = drawProjectIdentityBlock(50);

      // Calculs d'ingénierie BAEL 91
      const cubageBeton = Math.round(surface * 0.38 * (levels > 2 ? 1.08 : 1.0));
      const ratioAcier = levels >= 4 ? 105 : (levels >= 2 ? 95 : 85); // kg d'acier / m3 de béton
      const tonnageAcier = ((cubageBeton * ratioAcier) / 1000).toFixed(2);
      const sacsCimentStructure = Math.round(cubageBeton * 7); // 350 kg/m3 = 7 sacs de 50kg
      const sacsCimentMaconnerie = Math.round(surface * 1.8);
      const totalSacsCiment = sacsCimentStructure + sacsCimentMaconnerie;
      const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);
      const volumeSable = Math.round(cubageBeton * 0.50 + (surface * 0.08));
      const volumeGravier = Math.round(cubageBeton * 0.82);
      const nbAgglos15 = Math.round(surface * 14.5);
      const nbAgglos20 = Math.round(surface * 3.5);

      // Prix Unitaires Moyens Dakar 2026
      const prixCimentSac = 4400; // 88 000 FCFA / tonne
      const prixAcierTonne = 620000;
      const prixSableM3 = 11000;
      const prixGravierM3 = 19000; // Basalte de Diack
      const prixAgglo15 = 380;
      const prixAgglo20 = 480;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("I. BORDEREAU ESTIMATIF DÉTAILLÉ DES MATÉRIAUX MAJEURS", 14, currentY);

      const bqeRows = [
        ["Aciers Haute Adhérence FeE500", "Barres HA 6, 8, 10, 12, 14", `${tonnageAcier} Tonnes`, `${prixAcierTonne.toLocaleString('fr-FR')} F`, `${Math.round(tonnageAcier * prixAcierTonne).toLocaleString('fr-FR')} FCFA`],
        ["Ciment CEM II 42.5R (SOCOCIM/Dangote)", "Sacs de 50 kg normalisés", `${totalSacsCiment} Sacs (${tonnesCiment} T)`, `${prixCimentSac.toLocaleString('fr-FR')} F`, `${Math.round(totalSacsCiment * prixCimentSac).toLocaleString('fr-FR')} FCFA`],
        ["Gravier Basalte Concassé (Diack)", "Calibres 8/16 & 16/25", `${volumeGravier} m³`, `${prixGravierM3.toLocaleString('fr-FR')} F`, `${Math.round(volumeGravier * prixGravierM3).toLocaleString('fr-FR')} FCFA`],
        ["Sable dunaire propre (Kayar/Diender)", "Sable lavé sans sel", `${volumeSable} m³`, `${prixSableM3.toLocaleString('fr-FR')} F`, `${Math.round(volumeSable * prixSableM3).toLocaleString('fr-FR')} FCFA`],
        ["Agglos creux de 15 (Élévations)", "Parpaings vibrés", `${nbAgglos15.toLocaleString('fr-FR')} U`, `${prixAgglo15} F`, `${Math.round(nbAgglos15 * prixAgglo15).toLocaleString('fr-FR')} FCFA`],
        ["Agglos pleins de 20 (Soubassement)", "Agglos de fondation", `${nbAgglos20.toLocaleString('fr-FR')} U`, `${prixAgglo20} F`, `${Math.round(nbAgglos20 * prixAgglo20).toLocaleString('fr-FR')} FCFA`],
        ["Fil de recuit & cales d'enrobage", "Accessoires de ferraillage", "Forfait chantier", "-", `${Math.round(surface * 1200).toLocaleString('fr-FR')} FCFA`]
      ];

      const totalFournitures = Math.round(
        (tonnageAcier * prixAcierTonne) +
        (totalSacsCiment * prixCimentSac) +
        (volumeGravier * prixGravierM3) +
        (volumeSable * prixSableM3) +
        (nbAgglos15 * prixAgglo15) +
        (nbAgglos20 * prixAgglo20) +
        (surface * 1200)
      );

      doc.autoTable({
        startY: currentY + 4,
        head: [['Poste Matériaux', 'Spécification Technique', 'Quantité Calculée', 'Prix Unitaire', 'Total Estimé']],
        body: bqeRows,
        theme: 'grid',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 6;

      // Encadré Total Matériaux
      doc.setFillColor(...COLOR_BG_LIGHT);
      doc.rect(14, currentY, 182, 14, 'F');
      doc.setDrawColor(...COLOR_AMBER);
      doc.setLineWidth(0.8);
      doc.rect(14, currentY, 182, 14, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("SOUS-TOTAL ESTIMATIF FOURNITURES MATÉRIAUX BRUTS :", 18, currentY + 9);
      doc.setTextColor(...COLOR_AMBER);
      doc.setFontSize(10);
      doc.text(`${totalFournitures.toLocaleString('fr-FR')} FCFA`, 190, currentY + 9, { align: 'right' });

      // PAGE 2 : Protocole des 6 Points d'Arrêt (Mandatory Hold Points)
      doc.addPage();
      drawPageHeader(doc, "2. Protocole Technique des 6 Points d'Arrêt", "Contrôle Qualité Chantier : Ne payez aucun acompte sans visa écrit");

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("II. PROTOCOLE D'INSPECTION AVANT DÉCAISSEMENT DES ACOMPTES", 14, 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE);
      doc.text("Pour sécuriser votre investissement à distance, appliquez la règle des 6 Points d'Arrêt : chaque point exige une validation formelle :", 14, 57);

      const holdPointsRows = [
        ["Point 1 : Fond de Fouille", "Avant coulage du béton de propreté", "Vérifier la profondeur d'assise et l'absence de remblai meuble ou d'eau stagnante."],
        ["Point 2 : Ferraillage Semelles", "Avant coulage du béton de fondation", "Contrôler le diamètre des fers HA, le façonnage des crochets et les cales d'enrobage (4 cm)."],
        ["Point 3 : Chaînage & Longrines", "Avant remblaiement du soubassement", "Vérifier la continuité des aciers d'attente et l'arase étanche anti-remontée capillaire."],
        ["Point 4 : Dalle & Poutres", "3 heures avant la toupie ou la bétonnière", "Contrôler les armatures chapeaux, le calage des hourdis et la solidité des étaiements."],
        ["Point 5 : Décoffrage Structure", "Minimum 21 jours après coulage de dalle", "Interdiction absolue de décoffrer prématurément sans l'accord écrit du technicien."],
        ["Point 6 : Épreuve d'Étanchéité", "Après pose du complexe bitumineux", "Mise en eau de la terrasse pendant 48 heures consécutives. Zéro trace d'humidité sous plafond."]
      ];

      doc.autoTable({
        startY: 61,
        head: [['Point d\'Arrêt', 'Moment du Contrôle', 'Critère Impératif de Validation']],
        body: holdPointsRows,
        theme: 'striped',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      // Cadre conseil bétonnière
      currentY = doc.lastAutoTable.finalY + 10;
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(14, currentY, 182, 24, 2, 2, 'F');
      doc.setDrawColor(...COLOR_AMBER);
      doc.roundedRect(14, currentY, 182, 24, 2, 2, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text("RÈGLE TECHNIQUE D'OR SUR LES CHANTIERS DE DAKAR :", 18, currentY + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 53, 15);
      doc.text("• Pour 1 sac de ciment CEM II 42.5R (50 kg) : doser avec 2 brouettes de gravier 8/16 et 1 brouette rase de sable.", 18, currentY + 12);
      doc.text("• L'eau de gâchage ne doit JAMAIS rendre le béton liquide (l'excès d'eau chute la résistance mécanique de 40%).", 18, currentY + 17);
      doc.text("• Utilisation impérative d'une aiguille vibrante lors du coulage des poteaux pour éviter les nids de gravier.", 18, currentY + 22);
    }

    // =========================================================================
    // 3. LIVRABLE : CONTRE-EXPERTISE DEVIS BTP
    // =========================================================================
    else if (service === 'audit') {
      const quotedAmount = parseFloat(data.quoted_amount) || 35000000;
      const refMin = Math.round(sdpTotal * 115000);
      const refMax = Math.round(sdpTotal * 155000);
      const ecartMoyen = Math.round(((quotedAmount - ((refMin + refMax) / 2)) / ((refMin + refMax) / 2)) * 100);

      // PAGE 1 : Analyse des Prix & Verdict
      drawPageHeader(doc, "3. Rapport d'Arbitrage & Contre-Expertise Devis", "Audit Indépendant de Devis Entrepreneur • Ratios BAEL & Analyse des Écarts");
      let currentY = drawProjectIdentityBlock(50);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("I. VERDICT FINANCIER & POSITIONNEMENT MARCHÉ SÉNÉGAL", 14, currentY);

      let verdictText = "TARIF COHÉRENT AVEC LES RATIOS DU MARCHÉ";
      let verdictColor = [16, 185, 129]; // Vert
      let verdictAdvice = "Le montant soumis se situe dans la fourchette technique standard pour ce gabarit de construction à Dakar.";

      if (quotedAmount > refMax * 1.15) {
        verdictText = "SUSPICION DE SURFACTURATION OU COEFFICIENT DE MARGE ÉLEVÉ";
        verdictColor = [239, 68, 68]; // Rouge
        verdictAdvice = `Le montant soumis dépasse de plus de ${ecartMoyen}% le barème d'ingénierie moyen. Une renégociation poste par poste est impérative.`;
      } else if (quotedAmount < refMin * 0.85) {
        verdictText = "ATTENTION : RISQUE MAJEUR DE DEVIS ANORMALEMENT BAS";
        verdictColor = [245, 158, 11]; // Ambre
        verdictAdvice = "Un devis sous-évalué conduit quasi systématiquement à l'abandon de chantier en cours de travaux ou à des malfaçons sur le ferraillage.";
      }

      // Encadré Verdict
      doc.setFillColor(...COLOR_BG_LIGHT);
      doc.rect(14, currentY + 4, 182, 28, 'F');
      doc.setDrawColor(...verdictColor);
      doc.setLineWidth(1);
      doc.rect(14, currentY + 4, 182, 28, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...verdictColor);
      doc.text(verdictText, 18, currentY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE);
      doc.text(verdictAdvice, 18, currentY + 17);
      doc.text(`• Montant du devis expertisé : ${quotedAmount.toLocaleString('fr-FR')} FCFA (${Math.round(quotedAmount / sdpTotal).toLocaleString('fr-FR')} FCFA / m²)`, 18, currentY + 23);
      doc.text(`• Fourchette d'ingénierie de référence : ${refMin.toLocaleString('fr-FR')} à ${refMax.toLocaleString('fr-FR')} FCFA`, 18, currentY + 28);

      currentY = currentY + 38;

      // Grille des Points de Vigilance
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("II. DÉTECTION DES PIÈGES & OMISSIONS TECHNIQUES FRÉQUENTES", 14, currentY);

      const auditRows = [
        ["1. Qualité du ferraillage", "Aciers d'origine douteuse ou lisses", "Exiger impérativement la mention 'Aciers Haute Adhérence FeE500 certifiés'."],
        ["2. Imprécision du dosage béton", "Mention vague 'béton armé'", "Imposer le dosage contractuel : '350 kg/m³ au ciment CEM II 42.5R'."],
        ["3. Omission de l'arase étanche", "Non chiffrée sur 60% des devis", "Absence de feutre bitumé sous longrine = remontées d'humidité sur 1m de mur."],
        ["4. Étaiement & décoffrage", "Non précisé", "L'entrepreneur décoffre parfois sous 7 jours pour réutiliser ses étais ailleurs."],
        ["5. Évacuation des gravois", "Reportée en supplément", "Le nettoyage de fin de chantier et l'évacuation des terres doivent être inclus."]
      ];

      doc.autoTable({
        startY: currentY + 4,
        head: [['Point de Vigilance', 'Risque Fréquent Constaté', 'Correction Contractuelle Exigée']],
        body: auditRows,
        theme: 'grid',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      // PAGE 2 : Clauses Protectrices COCC
      doc.addPage();
      drawPageHeader(doc, "3. Clauses Contractuelles Protectrices (COCC)", "Sécurisation Juridique selon le Code des Obligations Civiles et Commerciales");

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("III. LES 4 CLAUSES À INSÉRER IMPÉRATIVEMENT DANS VOTRE CONTRAT", 14, 52);

      const clauses = [
        {
          title: "Clause 1 : Retenue de Garantie Légale de 5% (Art. 768 COCC)",
          desc: "Une retenue de 5% est prélevée sur chaque décompte de paiement. Cette somme n'est débloquée qu'à la Réception Définitive, soit un an après la fin des travaux, après levée intégrale des réserves éventuelles."
        },
        {
          title: "Clause 2 : Conditionnement des Paiements aux Visas de Points d'Arrêt",
          desc: "Aucun acompte ne sera déboursé sur la simple demande de l'entrepreneur. Chaque paiement est subordonné à la production d'une photo géo-localisée et du Procès-Verbal de validation du Point d'Arrêt correspondant."
        },
        {
          title: "Clause 3 : Pénalités de Retard Journalières",
          desc: "En cas de dépassement du délai d'exécution fixé contractuellement, sans motif de force majeure avéré, une pénalité forfaitaire de 25 000 FCFA par jour de retard calendaire sera déduite d'office du solde final."
        },
        {
          title: "Clause 4 : Responsabilité Décennale & Vices Cachés",
          desc: "L'entrepreneur demeure responsable de plein droit pendant 10 ans de tout dommage compromettant la solidité de l'ouvrage ou le rendant impropre à sa destination (fissures structurelles, affaissement de dallage, étanchéité défaillante)."
        }
      ];

      let clauseY = 58;
      clauses.forEach((c) => {
        doc.setFillColor(...COLOR_BG_LIGHT);
        doc.rect(14, clauseY, 182, 22, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, clauseY, 182, 22, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...COLOR_NAVY);
        doc.text(c.title, 18, clauseY + 6);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        const splitText = doc.splitTextToSize(c.desc, 174);
        doc.text(splitText, 18, clauseY + 12);

        clauseY += 26;
      });
    }

    // =========================================================================
    // 4. LIVRABLE : FINITIONS & SECOND ŒUVRE
    // =========================================================================
    else if (service === 'finitions') {
      // PAGE 1 : Quantitatifs Carrelage, Peinture & Étanchéité
      drawPageHeader(doc, "4. Bordereau Technique Finitions & Second Œuvre", "Phase Post-Gros Œuvre : Carrelage, Étanchéité, Plomberie & Réseaux");
      let currentY = drawProjectIdentityBlock(50);

      const surfaceCarrelageSol = Math.round(surface * 1.12); // +12% chutes & plinthes
      const surfaceFaienceMurs = Math.round(surface * 0.45);
      const surfaceEtancheite = Math.round(surface / totalLevelsCount);
      const surfacePeinture = Math.round(surface * 2.8); // Murs + plafonds

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("I. QUANTITATIFS PRÉVISIONNELS DES CORPS D'ÉTAT SECONDAIRES", 14, currentY);

      const finitionsRows = [
        ["Carrelage sol (Grès cérame)", `${surfaceCarrelageSol} m²`, "Prend en compte 12% de perte à la coupe et plinthes assorties"],
        ["Faïence murale (Cuisines & SDE)", `${surfaceFaienceMurs} m²`, "Hauteur minimale 2,10m dans les cabines de douche"],
        ["Colle ciment améliorée (C2E)", `${Math.round(surfaceCarrelageSol / 4.5)} Sacs de 25kg`, "Obligatoire pour pose de grands formats sans décollement"],
        ["Étanchéité toiture terrasse", `${surfaceEtancheite} m²`, "Système bicouche bitumineux élastomère (4mm) + chape de protection"],
        ["Peinture intérieure & extérieure", `${surfacePeinture} m²`, "1 sous-couche d'impression + 2 couches finition acrylique lavable"],
        ["Réseau Plomberie Multicouche", "Installation complète", "Tubes multicouche sertis, évacuations PVC qualité assainissement"],
        ["Tableau Électrique & Terre", "Conforme NF C 15-100", "Piquet de terre cuivre, interrupteurs différentiels 30mA obligatoires"]
      ];

      doc.autoTable({
        startY: currentY + 4,
        head: [['Lot de Finition', 'Quantitatif Estimé', 'Prescription d\'Exécution']],
        body: finitionsRows,
        theme: 'grid',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 }
      });

      // PAGE 2 : Modèle PV de Réception
      doc.addPage();
      drawPageHeader(doc, "4. Modèle de Procès-Verbal de Réception de Chantier", "Document Juridique à faire signer à l'entrepreneur lors de la remise des clés");

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("II. PROCÈS-VERBAL DE RÉCEPTION DES TRAVAUX (COCC ART. 768)", 14, 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE);
      doc.text("Ce procès-verbal marque le transfert de garde du bâtiment et le point de départ de la garantie décennale :", 14, 57);

      // Cadre PV
      doc.setFillColor(255, 255, 255);
      doc.rect(14, 62, 182, 180, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("PROCES-VERBAL DE RECEPTION DES TRAVAUX DE SECOND OEUVRE", 20, 72);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Ce jour le ................................................., sur le chantier situé à : ${location}`, 20, 82);
      doc.text(`Entre le Maître d'Ouvrage : ${clientName}`, 20, 89);
      doc.text(`Et l'Entrepreneur en charge des travaux : .....................................................................`, 20, 96);

      doc.text("Après visite contradictoire des lieux, les parties concluent :", 20, 106);
      doc.text("[  ] Réception prononcée SANS réserve.", 25, 114);
      doc.text("[  ] Réception prononcée AVEC réserves ci-dessous énumérées :", 25, 122);

      // Lignes de réserves
      for (let l = 0; l < 5; l++) {
        doc.setDrawColor(203, 213, 225);
        doc.line(25, 132 + (l * 8), 180, 132 + (l * 8));
      }

      doc.text("Délai convenu pour la levée intégrale des réserves : ........................ jours ouvrés.", 20, 178);
      doc.text("La garantie décennale et la retenue de garantie de 5% prennent effet à compter de ce jour.", 20, 186);

      // Signatures
      doc.rect(20, 196, 75, 38);
      doc.text("Signature du Maître d'Ouvrage :", 24, 203);
      doc.text("(Mention manuscrite 'Lu et approuvé')", 24, 209);

      doc.rect(110, 196, 75, 38);
      doc.text("Signature de l'Entrepreneur :", 114, 203);
      doc.text("(Cachet et signature obligatoire)", 114, 209);
    }

    // =========================================================================
    // NUMÉROTATION MULTIPAGE & PIEDS DE PAGE AUTOMATIQUES ("Page X sur Y")
    // =========================================================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const pageHeight = doc.internal.pageSize.height;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, pageHeight - 16, 196, pageHeight - 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text("ChantierSur.com • Bureau d'Études Numérique Indépendant • Dakar, République du Sénégal.", 14, pageHeight - 11);
      doc.text("Rapport certifié édité sous les règles de l'art BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", 14, pageHeight - 7);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Page ${p} sur ${totalPages}`, 196, pageHeight - 9, { align: 'right' });
    }


    // =========================================================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      const pageHeight = doc.internal.pageSize.height;

      // Filet séparateur bas
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, pageHeight - 16, 196, pageHeight - 16);

      // Textes légaux bas de page
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text("ChantierSur.com • Bureau d'Études Numérique Indépendant • Dakar, République du Sénégal.", 14, pageHeight - 11);
      doc.text("Rapport certifié édité sous les règles de l'art BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", 14, pageHeight - 7);

      // Compteur de page dynamique
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Page ${p} sur ${totalPages}`, 196, pageHeight - 9, { align: 'right' });
    }

    // Téléchargement sécurisé
    const cleanFileName = `ChantierSur_${service.toUpperCase()}_${refDoc}.pdf`;
    doc.save(cleanFileName);
  };

  // Alias universel de sécurité
  window.generatePDF = window.generateProjectPDF;
})();
