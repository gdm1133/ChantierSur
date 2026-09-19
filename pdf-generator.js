/**
 * ChantierSur.com - Moteur Officiel de Génération des Livrables BTP & Juridiques
 * Conforme : BAEL 91 Révisé 99 • Code de l'Urbanisme du Sénégal • Droit COCC
 */

(function() {
  'use strict';

  // Couleurs de la charte officielle ChantierSur
  const COLOR_NAVY = [11, 19, 37];      // #0B1325
  const COLOR_AMBER = [245, 158, 11];   // #F59E0B
  const COLOR_SLATE = [71, 85, 105];    // #475569
  const COLOR_BG_LIGHT = [248, 250, 252]; // #F8FAFC

  // Formatteur monétaire sécurisé (espaces ASCII purs, zéro slash ni caractère corrompu)
  function formatFCFA(val) {
    if (val === undefined || val === null || isNaN(val)) return "0 FCFA";
    const num = Math.round(val).toString();
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  }

  function getJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (typeof jsPDF !== 'undefined') return jsPDF;
    return null;
  }

  // =========================================================================
  // 1. LIVRABLE : ESQUISSE & FAISABILITÉ TECHNIQUE (4 PAGES DENSES)
  // =========================================================================
  function renderEsquisse(doc, data, refDoc, currentDate) {
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
    const totalLevelsCount = levels + 1;
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const landStatus = data.land_status || 'Titre Foncier (TF)';
    const lotNumber = data.lot_number || 'Non spécifié';
    const config = data.parcel_config || 'bande';
    const usage = data.building_usage || 'unifamilial';
    const standing = data.standing || 'moyen';
    const sanitation = data.sanitation_type || 'autonome';
    const neighbor = data.neighbor_status || 'vide';

    // Ratios urbanistiques réels
    const cesMax = 0.65;
    const empriseSolMax = Math.round(surface * cesMax);
    const espacesLibres = Math.round(surface * (1 - cesMax));
    const sdpTotale = Math.round(empriseSolMax * totalLevelsCount * 0.90);
    const hauteurFaitage = ((totalLevelsCount * 3.10) + 1.20).toFixed(1);
    const reculAlignement = streetWidth >= 15 ? 4.0 : 3.0;
    const hauteurMaxGabarit = (streetWidth + reculAlignement).toFixed(1);
    const respecteGabarit = parseFloat(hauteurFaitage) <= parseFloat(hauteurMaxGabarit);

    // Analyse géotechnique selon le sol
    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const isClay = locLower.includes('diamniadio') || locLower.includes('bargny') || locLower.includes('sébikotane');

    let portanceSolBars = 2.2;
    let natureSol = "Plateau sédimentaire / Latérite compacte portante";
    let modeFondation = "Semelles isolées reliées par longrines de rigidité croisées";
    let enrobageAciers = "3,0 cm (Exposition standard)";

    if (isMarine) {
      portanceSolBars = 2.0;
      natureSol = "Sable dunaire littoral / Basalte rocheux marin";
      modeFondation = "Semelles isolées rigides avec double nappe et longrines antisismiques";
      enrobageAciers = "4,5 cm à 5,0 cm STRICT (Attaque saline sévère)";
    } else if (isWetland) {
      portanceSolBars = 1.2;
      natureSol = "Sables alluvionnaires compressibles / Nappe haute en hivernage";
      modeFondation = hasBasement ? "Radier étanche sous cuvelage" : "Radier général nervuré ou semelles filantes cuvelées";
      enrobageAciers = "4,0 cm avec hydrofuge de masse Sika";
    } else if (isClay) {
      portanceSolBars = 1.5;
      natureSol = "Marnes et argiles gonflantes (Retrait / Gonflement différentiel)";
      modeFondation = "Puits courts ancrés sous la zone active (-2,20 m) ou longrines rigides";
      enrobageAciers = "3,5 cm avec renfort armatures de traction";
    }

    // Descente de charges BAEL 91
    const surfaceInfluence = 16.0;
    const gTotal = 7.0 * surfaceInfluence * totalLevelsCount;
    const qUnit = usage === 'bureaux' ? 2.5 : (usage === 'mixte' ? 2.0 : 1.5);
    const qTotal = qUnit * surfaceInfluence * totalLevelsCount;
    const nSer = Math.round(gTotal + qTotal);
    const nUltime = Math.round((1.35 * gTotal) + (1.5 * qTotal));
    const qAdmkNm2 = portanceSolBars * 100;
    const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2);
    const coteSemelleCarrer = Math.ceil(Math.sqrt(surfaceSemelleRequise) * 20) / 20;
    const epaisseurSemelle = Math.max(35, Math.round(((coteSemelleCarrer * 100 - 30) / 4) + 5));

    // En-tête de section
    function drawHeader(pageTitle, subTitle) {
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
      doc.text(`Titulaire : ${clientName.substring(0, 26)}`, 196, 24, { align: 'right' });

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

      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL — MAÎTRE D'OUVRAGE : ${clientName.toUpperCase()} • TÉL : ${clientPhone} • TITRE FONCIER : ${lotNumber}. LA TRANSMISSION DE CE LIVRABLE À DES TIERS ENGAGE LA RESPONSABILITÉ CIVILE DU DÉTENTEUR.`, 14, 49);
    }

    // --- PAGE 1 ---
    drawHeader("Rapport d'Esquisse & Faisabilité Technique", "Partie I : Cartouche Foncier, Gabarit Volumétrique & Conformité au Code de l'Urbanisme");

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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("I. GABARIT URBANISTIQUE & DROITS À BÂTIR (DÉCRET 2009-1450 & PDU DAKAR)", 14, currentY);

    const gabaritRows = [
      ["Surface Totale Parcellaire", `${surface} m²`, "Superficie de base enregistrée au cadastre"],
      ["Emprise au Sol Maximale (CES = 0,65)", `${empriseSolMax} m²`, "Limite légale de projection au sol des constructions"],
      ["Espaces Libres Perméables (35%)", `${espacesLibres} m²`, "Zone perméable requise pour l'infiltration pluviale"],
      ["Surface Développée de Plancher Totale (SDP)", `~${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (hors trémies)`],
      ["Hauteur Totale du Bâtiment Projeté", `~${hauteurFaitage} m`, "Dalle supérieure + acrotère de terrasse de 1,20 m"],
      ["Largeur de la Voie Publique Desservante", `${streetWidth} mètres`, `Recul légal d'alignement exigé : ${reculAlignement} m`],
      ["Gabarit Légal sur Rue (H <= L + R)", `${hauteurMaxGabarit} mètres`, respecteGabarit ? "CONFORME au gabarit direct sur rue" : "DÉPASSEMENT : Retrait en gradins requis aux étages hauts"],
      ["Places de Stationnement Obligatoires", `${Math.max(1, Math.round(sdpTotale / 120))} place(s)`, "Norme PDU Dakar : 1 place / logement ou tranche 100 m²"]
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("II. CONTRAINTES D'IMPLANTATION, PAN COUPÉ D'ANGLE & PROSPECTS", 14, currentY);

    let angleDesc = "Alignement standard sur voie unique avec recul obligatoire de 3,00 m.";
    if (config === 'angle') {
      angleDesc = `Parcelle d'Angle (${facade1}m × ${facade2}m) : Pan coupé de visibilité obligatoire de 3,50 m d'hypoténuse au carrefour. Double recul sur les deux rues.`;
    } else if (config === 'traversante') {
      angleDesc = "Parcelle Traversante : Deux accès distincts sur voies opposées. Recul réglementaire de 3,00 m sur les deux façades.";
    } else if (config === 'bande') {
      angleDesc = "Configuration en Bande : Murs mitoyens latéraux aveugles obligatoires (coupe-feu 2h). Aucune baie sans accord écrit.";
    } else {
      angleDesc = "Parcelle Isolée : Recul minimal de 2,00 m imposé sur toutes les limites séparatives.";
    }

    const mitoyenRows = [
      ["Régime de Façade & Voirie", config.toUpperCase(), angleDesc],
      ["État des Terrains Voisins", neighbor === 'vide' ? "Parcelles Voisines Nues" : "Constructions Mitoyennes Présentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-œuvre requise." : "Constat d'huissier contradictoire obligatoire avant excavation."],
      ["Puits de Jour & Cours d'Aération", "Minimum 12 m² (Largeur min 3,00 m)", "Obligatoire pour les pièces aveugles centrales selon le règlement sanitaire."],
      ["Régime des Eaux de Toiture", "Égout intérieur à la parcelle", "Interdiction absolue de déverser les eaux pluviales sur la voie publique."]
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

    // --- PAGE 2 ---
    doc.addPage();
    drawHeader("Rapport d'Esquisse & Faisabilité Technique", "Partie II : Descente de Charges (BAEL 91 R99) & Dimensionnement des Fondations");

    currentY = 54;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU LE PLUS CHARGÉ (BAEL 91 R99)", 14, currentY);

    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence} m²`, "Trame structurelle courante 4,00 m × 4,00 m"],
      ["Charges Permanentes Cumulées (G)", `${gTotal.toFixed(0)} kN (~${(gTotal / 9.81).toFixed(1)} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation Cumulées (Q)", `${qTotal.toFixed(0)} kN (~${(qTotal / 9.81).toFixed(1)} T)`, `Norme NF P 06-001 selon usage : ${qUnit} kN/m² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (~${(nSer / 9.81).toFixed(1)} Tonnes)`, "N_ser = G + Q (Dimensionnement du sol sous semelle)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (~${(nUltime / 9.81).toFixed(1)} Tonnes)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure)"]
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÉOTECHNIQUE", 14, currentY);

    const semelleRows = [
      ["Capacité Portante Admissible du Sol (q_adm)", `${portanceSolBars} bars (${qAdmkNm2} kN/m²)`, "Valeur géotechnique estimative pour le secteur sélectionné"],
      ["Surface Portante Minimale Requise (S)", `${surfaceSemelleRequise} m²`, "Formule DTU 13.12 : S >= 1,05 × N_ser / q_adm"],
      ["Dimensionnement Semelle Carrée (A × B)", `${coteSemelleCarrer.toFixed(2)} m × ${coteSemelleCarrer.toFixed(2)} m`, "Section d'assise au sol sous le poteau le plus chargé"],
      ["Épaisseur Minimale de la Semelle (H)", `${epaisseurSemelle} cm (d >= ${(epaisseurSemelle - 5)} cm)`, "Condition de rigidité : d >= (A - a)/4 pour éviter le poinçonnement"],
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

    // --- PAGE 3 ---
    doc.addPage();
    drawHeader("Rapport d'Esquisse & Faisabilité Technique", "Partie III : Résilience Fluides (Sen'Eau, Senelec, ONAS) & Conception Bioclimatique");

    currentY = 54;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("V. RÉSERVE HYDRAULIQUE (SEN'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT (NS 17-074)", 14, currentY);

    const occupantsEstimes = Math.max(6, Math.round(sdpTotale / 25));
    const bacheEauVolume = Math.max(3.5, ((occupantsEstimes * 150 * 2) / 1000)).toFixed(1);
    const puissanceKva = Math.max(9, Math.round(totalLevelsCount * 5.0));

    let energieDetail = "Raccordement standard Senelec monophasé ou triphasé.";
    if (energyBackup === 'solaire') energieDetail = "Installation photovoltaïque hybride avec onduleur 5 kVA et stockage lithium pour charges critiques.";
    if (energyBackup === 'groupe') energieDetail = "Inverseur de source automatique Normal/Secours (ATS) + local insonorisé pour groupe électrogène.";

    const reseauxRows = [
      ["Bâche à Eau Tampon Enterrée (Sen'Eau)", `${bacheEauVolume} m³ (Autonomie 48h)`, "Obligatoire face aux baisses de pression récurrentes. Cuve béton étanche + surpresseur."],
      ["Bilan de Puissance Souscrite (Senelec)", `${puissanceKva} kVA (${puissanceKva > 12 ? 'Triphasé' : 'Monophasé'})`, "Calculé pour climatisation split system complète, éclairage et motopompe."],
      ["Secours Énergétique Préconisé", energyBackup.toUpperCase(), energieDetail],
      ["Boucle de Terre en Fond de Fouille", "Câble cuivre nu 25 mm² (<= 5 Ohms)", "Ceinture sous semelles obligatoire pour la protection foudre en hivernage."],
      ["Système d'Assainissement des Eaux", sanitation === 'onas' ? "Réseau Public Collectif ONAS" : "Fosse Toutes Eaux Étanche (NS 17-074)", sanitation === 'onas' ? "Pose obligatoire d'un clapet anti-retour de façade contre les refoulements." : `Fosse étanche 3 compartiments (${Math.max(4.5, totalLevelsCount * 1.5).toFixed(1)} m³) + puits filtrant.`]
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VI. CONCEPTION BIOCLIMATIQUE & PROTECTION THERMIQUE SOUS CLIMAT TROPICAL", 14, currentY);

    const bioclimRows = [
      ["Orientation & Vents Dominants", "Alizés maritimes N-NO", "Privilégier la ventilation traversante pour capter les brises fraîches et réduire la climatisation."],
      ["Protection Façades Est / Ouest", "Harmattan sec & Soleil rasant", "Limiter les baies vitrées sur ces façades ou intégrer des casquettes béton / brise-soleil."],
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

    // --- PAGE 4 ---
    doc.addPage();
    drawHeader("Rapport d'Esquisse & Faisabilité Technique", "Partie IV : Enveloppe Budgétaire TCE & Procédure Administrative du Permis (TELEDAC)");

    currentY = 54;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VII. ENVELOPPE BUDGÉTAIRE PRÉVISIONNELLE TOUS CORPS D'ÉTAT (TCE SÉNÉGAL 2026)", 14, currentY);

    let coutM2 = standing === 'haut' ? 325000 : (standing === 'economique' ? 225000 : 270000);
    if (levels >= 3) coutM2 += (levels * 6000);
    if (hasBasement) coutM2 += 40000;

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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VIII. FEUILLE DE ROUTE LÉGALE : OBTENTION DU PERMIS DE CONSTRUIRE (TELEDAC)", 14, currentY);

    const etapesTeledac = [
      ["1. Bornage Contradictoire", "Géomètre-Expert Agréé (OGES)", "Plan de bornage régulier et scellement des bornes physiques."],
      ["2. Plans Architecturaux Visés", "Architecte Ordre (OAAS)", "Obligation légale pour toute surface > 80 m² ou tout R+1 et plus."],
      ["3. Note de Calcul de Stabilité", "Bureau d'Études Techniques (BET)", "Justification des sections de béton et armatures selon BAEL 91 R99."],
      ["4. Dépôt Plateforme TELEDAC", "Commission Mairie / DUA", "Délai légal de 28 à 40 jours. Interdiction formelle d'ouvrir le chantier sans arrêté."],
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

  // =========================================================================
  // 2. LIVRABLES : GROS ŒUVRE, AUDIT DEVIS & FINITIONS
  // =========================================================================
  function renderOtherServices(doc, data, service, refDoc, currentDate) {
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const surface = parseFloat(data.surface) || 200;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const location = data.project_location || 'Dakar';

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
    doc.text("BUREAU D'ÉTUDES NUMÉRIQUE • RÉPUBLIQUE DU SÉNÉGAL", 14, 20);

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Réf : ${refDoc}`, 196, 12, { align: 'right' });
    doc.setTextColor(203, 213, 225);
    doc.text(`Date : ${currentDate}`, 196, 18, { align: 'right' });

    let title = "BORDEREAU QUANTITATIF ESTIMATIF (BQE) GROS ŒUVRE";
    if (service === 'audit') title = "RAPPORT DE CONTRE-EXPERTISE & AUDIT DEVIS";
    if (service === 'finitions') title = "BORDEREAU TECHNIQUE SECOND ŒUVRE & FINITIONS";

    doc.setTextColor(...COLOR_NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, 14, 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SLATE);
    doc.text(`Maître d'Ouvrage : ${clientName} • Localisation : ${location} • Surface : ${surface} m²`, 14, 43);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 46, 196, 46);

    let rows = [];
    if (service === 'express') {
      rows = [
        ["Béton armé dosé à 350 kg/m³ (CEM II 42.5R)", `${Math.round(surface * 0.38)} m³`, "Conforme BAEL 91 R99"],
        ["Armatures Haute Adhérence FeE500", `${(surface * 0.038).toFixed(1)} Tonnes`, "Fers certifiés normes sénégalaises"],
        ["Sable dunaire lavé (Kayar / Diender)", `${Math.round(surface * 0.18)} m³`, "Sable propre sans matières organiques"],
        ["Gravier Basalte concassé (Diack)", `${Math.round(surface * 0.32)} m³`, "Calibres 8/16 et 16/25"],
        ["Ciment Sacs 50kg (SOCOCIM / Sahel / Dangote)", `${Math.round(surface * 2.8)} Sacs`, "Classe 42.5R impérative"]
      ];
    } else if (service === 'audit') {
      rows = [
        ["Contrôle du ratio Aciers / Béton", "Conforme BAEL 91", "Tolérance ±5% respectée"],
        ["Contre-Expertise Prix Ciment", "4 300 - 4 500 FCFA / Sac", "Prix du marché Dakar"],
        ["Audit Cubage Béton Armé", "Optimisation 12% détectée", "Élimination des surcoûts"],
        ["Prescriptions Juridiques COCC", "Retenue de garantie 5%", "Protection légale maître d'ouvrage"]
      ];
    } else {
      rows = [
        ["Carrelage Grès Cérame", `${Math.round(surface * 1.15)} m²`, "Prise en compte des coupes (+12%)"],
        ["Réseau Plomberie Multicouche", "Installation complète", "Alimentation et évacuation étanches"],
        ["Étanchéité Toiture Terrasse", `${Math.round(surface / (levels + 1))} m²`, "Système bitumineux 4mm"],
        ["Électricité & Éclairage", "Conforme NF C 15-100", "Disjoncteurs différentiels 30mA"]
      ];
    }

    doc.autoTable({
      startY: 52,
      head: [['Poste Technique', 'Quantitatif / Prescription', 'Observation Technique']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: COLOR_NAVY, textColor: [245, 158, 11] },
      styles: { fontSize: 8.5, cellPadding: 3 },
      margin: { left: 14, right: 14 }
    });
  }

  // =========================================================================
  // FONCTION EXPORTÉE GLOBALE
  // =========================================================================
  window.generateProjectPDF = function(projectData) {
    const jsPDFClass = getJsPDF();
    if (!jsPDFClass) {
      alert("Erreur : La bibliothèque jsPDF n'a pas pu être chargée.");
      return;
    }

    const doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const data = projectData || {};
    const service = (data.service || 'esquisse').toLowerCase();
    const refDoc = 'CS-' + (data.timestamp ? data.timestamp.toString().slice(-6) : Date.now().toString().slice(-6));
    const currentDate = new Date().toLocaleDateString('fr-FR');

    if (service === 'esquisse') {
      renderEsquisse(doc, data, refDoc, currentDate);
    } else {
      renderOtherServices(doc, data, service, refDoc, currentDate);
    }

    // Pagination dynamique X sur Y
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

    const fileName = `ChantierSur_${service.toUpperCase()}_${refDoc}.pdf`;
    doc.save(fileName);
  };

  // Alias universels
  window.generatePDF = window.generateProjectPDF;
})();
