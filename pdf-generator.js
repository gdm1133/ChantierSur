/**
 * ChantierSur.com - Moteur Officiel de Génération des Livrables BTP & Juridiques
 * Conforme : BAEL 91 Révisé 99 • Code de l'Urbanisme du Sénégal • Droit COCC
 */

(function() {
  'use strict';
  // Formatteur monétaire sécurisé (espaces purs)
  function formatNum(n) {
    if (n === undefined || n === null || isNaN(n)) return "0";
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }


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
    
    // Assainissement téléphone anti-doublon
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

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
    
    // Correction précision flottante (arrondi entier propre)
    const qAdmkNm2 = Math.round(portanceSolBars * 100);
    const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2);
    const coteSemelleCarrer = Math.ceil(Math.sqrt(surfaceSemelleRequise) * 20) / 20;
    const epaisseurSemelle = Math.max(35, Math.round(((coteSemelleCarrer * 100 - 30) / 4) + 5));

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

      // Notice de confidentialité sur 2 lignes nettes
      const legalNotice = `DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL — MAÎTRE D'OUVRAGE : ${clientName.toUpperCase()} • TÉL : ${clientPhone} • TITRE FONCIER : ${lotNumber}. LA TRANSMISSION OU DIFFUSION DE CE LIVRABLE ENGAGE LA RESPONSABILITÉ CIVILE ET PÉNALE DU DÉTENTEUR.`;
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      const splitNotice = doc.splitTextToSize(legalNotice, 182);
      doc.text(splitNotice, 14, 48.5);
    }

    // =========================================================================
    // PAGE 1 : GABARIT VOLUMÉTRIQUE & ALIGNEMENT
    // =========================================================================
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

    let dimTxt = `Façade ${facade1} m × Profondeur env. ${(surface / facade1).toFixed(1)} m`;
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
      ["Surface Développée de Plancher Totale (SDP)", `env. ${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (hors trémies)`],
      ["Hauteur Totale du Bâtiment Projeté", `env. ${hauteurFaitage} m`, "Dalle supérieure + acrotère de terrasse de 1,20 m"],
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
      angleDesc = `Parcelle d'Angle (${facade1}m × ${facade2}m) : Pan coupé de visibilité de 3,50 m d'hypoténuse au carrefour. Double recul sur les deux rues.`;
    } else if (config === 'traversante') {
      angleDesc = "Parcelle Traversante : Accès distincts sur voies opposées. Recul réglementaire de 3,00 m sur les deux façades.";
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

    // =========================================================================
    // PAGE 2 : DESCENTE DE CHARGES & PRÉ-DIMENSIONNEMENT SEMELLE
    // =========================================================================
    doc.addPage();
    drawHeader("Rapport d'Esquisse & Faisabilité Technique", "Partie II : Descente de Charges (BAEL 91 R99) & Dimensionnement des Fondations");

    currentY = 54;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU LE PLUS CHARGÉ (BAEL 91 R99)", 14, currentY);

    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence} m²`, "Trame structurelle courante 4,00 m × 4,00 m"],
      ["Charges Permanentes Cumulées (G)", `${gTotal.toFixed(0)} kN (env. ${(gTotal / 9.81).toFixed(1)} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation Cumulées (Q)", `${qTotal.toFixed(0)} kN (env. ${(qTotal / 9.81).toFixed(1)} T)`, `Norme NF P 06-001 selon usage : ${qUnit} kN/m² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (env. ${(nSer / 9.81).toFixed(1)} Tonnes)`, "N_ser = G + Q (Dimensionnement du sol sous semelle)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (env. ${(nUltime / 9.81).toFixed(1)} Tonnes)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure)"]
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

    // Correction de la structure du tableau IV (lignes strictement indépendantes)
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
      columnStyles: { 
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 42, fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 85 }
      },
      margin: { left: 14, right: 14 }
    });

    // =========================================================================
    // PAGE 3 : RÉSEAUX (SEN'EAU, SENELEC, ONAS) & CLIMAT TROPICAL
    // =========================================================================
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
    if (energyBackup === 'solaire') energieDetail = "Installation photovoltaïque hybride avec onduleur 5 kVA et stockage lithium.";
    if (energyBackup === 'groupe') energieDetail = "Inverseur de source automatique Normal/Secours (ATS) + local insonorisé pour groupe.";

    // Correction de la séparation nette des lignes du tableau V
    const reseauxRows = [
      ["Bâche à Eau Tampon Enterrée (Sen'Eau)", `${bacheEauVolume} m³ (Autonomie 48h)`, "Obligatoire face aux baisses de pression. Cuve béton étanche + surpresseur."],
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
      columnStyles: { 
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 40, fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 90 }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VI. CONCEPTION BIOCLIMATIQUE & PROTECTION THERMIQUE SOUS CLIMAT TROPICAL", 14, currentY);

    // Correction de la coquille "Quest" -> "Ouest"
    const bioclimRows = [
      ["Orientation & Vents Dominants", "Alizés maritimes N-NO", "Privilégier la ventilation traversante pour capter les brises fraîches."],
      ["Protection Façades Est / Ouest", "Harmattan sec & Soleil rasant", "Limiter les baies vitrées sur ces façades ou intégrer des casquettes béton."],
      ["Isolation Toiture Terrasse", "Complexe SBS 4mm + Chape réfléchissante", "L'isolation thermique sous chape diminue la température sous plafond de 4°C à 6°C."],
      ["Étanchéité Acrotères & Solins", "Relevés d'étanchéité min 20 cm", "Goutte d'eau et bavette zinc obligatoires contre le ruissellement noirci."]
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
    // PAGE 4 : ENVELOPPE BUDGET TCE & FEUILLE DE ROUTE ADMINISTRATIVE
    // =========================================================================
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
      ["ENVELOPPE GLOBALE ESTIMATIVE DU PROJET", formatFCFA(pTotal), `Ratio moyen d'ingénierie : env. ${formatFCFA(Math.round(pTotal / sdpTotale))} / m² de plancher`]
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

    // Inversion corrigée : Le titre VIII est placé rigoureusement AVANT le tableau VIII
    currentY = doc.lastAutoTable.finalY + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VIII. FEUILLE DE ROUTE LÉGALE : OBTENTION DU PERMIS DE CONSTRUIRE (TELEDAC)", 14, currentY);

    // Correction des coquilles rédactionnelles
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

    // Bloc de visa technique
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

  // Cubages béton BAEL 91
  const vFondations = Math.round(surface * (hasBasement ? 0.16 : 0.11));
  const vPoteaux = Math.round(surface * (0.065 + (levels * 0.003)));
  const vPoutres = Math.round(surface * 0.08);
  const vPlanchers = Math.round(surface * (slabType === 'dalle_pleine' ? 0.15 : (slabType === 'hourdis20' ? 0.12 : 0.10)));
  const vDallageRdc = Math.round((surface / totalLevelsCount) * 0.10);
  const vTotalBeton = vFondations + vPoteaux + vPoutres + vPlanchers + vDallageRdc;

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

  // Granulats et agglos
  const sacsCimentStructure = Math.round(vTotalBeton * 7);
  const sacsCimentMaconnerie = Math.round(surface * 1.8);
  const totalSacsCiment = sacsCimentStructure + sacsCimentMaconnerie;
  const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);

  const volGravierBasalte = Math.round(vTotalBeton * 0.82);
  const volSableKayar = Math.round((vTotalBeton * 0.48) + (surface * 0.08));

  const nbAgglos15 = Math.round(surface * 14.2);
  const nbAgglos20 = Math.round(surface * 3.4);
  const nbHourdis = slabType === 'dalle_pleine' ? 0 : Math.round((surface * ((totalLevelsCount - 1) / totalLevelsCount)) * 8.5);

  // Prix unitaires Dakar 2026
  const PRIX_ACIER_TONNE = 620000;
  const PRIX_CIMENT_SAC = 4400;
  const PRIX_GRAVIER_M3 = 19000;
  const PRIX_SABLE_M3 = 11500;
  const PRIX_AGGLO_15 = 380;
  const PRIX_AGGLO_20 = 480;
  const PRIX_HOURDIS = 450;
  const PRIX_FIL_CALES = 1400;

  const totalAcierF = Math.round(tonnageAcierTotal * PRIX_ACIER_TONNE);
  const totalCimentF = Math.round(totalSacsCiment * PRIX_CIMENT_SAC);
  const totalGravierF = Math.round(volGravierBasalte * PRIX_GRAVIER_M3);
  const totalSableF = Math.round(volSableKayar * PRIX_SABLE_M3);
  const totalAgglosF = Math.round((nbAgglos15 * PRIX_AGGLO_15) + (nbAgglos20 * PRIX_AGGLO_20) + (nbHourdis * PRIX_HOURDIS));
  const totalAccessoiresF = Math.round(surface * PRIX_FIL_CALES);

  const totalFournituresBrutes = totalAcierF + totalCimentF + totalGravierF + totalSableF + totalAgglosF + totalAccessoiresF;
  const mainOeuvreEstimee = Math.round(surface * 28000);
  const totalGrosOeuvreTCE = totalFournituresBrutes + mainOeuvreEstimee;

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

    const legalNotice = `DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL — MAÎTRE D'OUVRAGE : ${clientName.toUpperCase()} • TÉL : ${clientPhone} • TITRE FONCIER : ${lotNumber}. CE BORDEREAU DE COMMANDE MATÉRIAUX ENGAGE LA RESPONSABILITÉ CIVILE ET PÉNALE DU DÉTENTEUR.`;
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

  const syntheseRows = [
    ["Béton Armé Structurel (fc28 >= 25 MPa)", `${vTotalBeton} m³`, `Ratio moyen : env. ${(vTotalBeton / surface).toFixed(2)} m³ de béton / m² de plancher`],
    ["Aciers Haute Adhérence FeE500", `${tonnageAcierTotal} Tonnes (${formatNum(kgAcierTotal)} kg)`, `Ratio de ferraillage : env. ${ratioAcierM3} kg d'acier / m³ de béton`],
    ["Ciment CEM II 42.5R (SOCOCIM / Dangote)", `${formatNum(totalSacsCiment)} Sacs (env. ${tonnesCiment} T)`, "Structure dosée à 350 kg/m³ + mortiers de pose et d'enduits"],
    ["Gravier Basalte Concassé (Carrières Diack)", `${formatNum(volGravierBasalte)} m³`, "Calibres 8/16 & 16/25 (Mélange granulaire optimal)"],
    ["Sable Dunaire Lavé Propre (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, "Sable d'apport exempt de coquillages et de matières organiques"],
    ["Agglos Vibrés Normalisés (15 & 20)", `${formatNum(nbAgglos15 + nbAgglos20)} Unités`, `Agglos creux 15 (${formatNum(nbAgglos15)}) + Agglos pleins 20 (${formatNum(nbAgglos20)})`],
    ["Plancher Hourdis Entrevous Béton", slabType === 'dalle_pleine' ? "Dalle Pleine BA" : `${formatNum(nbHourdis)} Hourdis`, slabType === 'dalle_pleine' ? "Coffrage intégral dalle pleine" : "Hourdis creux 16+4 pour allègement des planchers hauts"]
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

  const ventilationBetonRows = [
    ["1. Fondations (Semelles isolées & Longrines)", `${vFondations} m³`, hasBasement ? "Semelles élargies + radier et voiles de sous-sol" : "Béton de semelles armées, longrines de rigidité et amorces"],
    ["2. Poteaux, Raidisseurs & Potelets", `${vPoteaux} m³`, `Sections 15x30 à 20x40 cm selon descente de charges sur R+${levels}`],
    ["3. Poutres Maîtresses & Chaînages Hauts", `${vPoutres} m³`, "Poutres porteuses continues et ceintures périphériques"],
    ["4. Dalles de Compression & Escaliers", `${vPlanchers} m³`, `Table de compression 4 cm sur hourdis + paillasses escaliers`],
    ["5. Forme de Dallage RDC sur Hérisson (10 cm)", `${vDallageRdc} m³`, "Dallage armé d'un treillis soudé anti-fissuration posé sur film polyane"],
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
    ["Fil de Recuit & Cales d'Enrobage (4 cm)", `${formatNum(filRecuitKg)} kg de fil + cales`, "Indispensable pour maintenir l'enrobage strict de 4,5 cm en milieu salin"],
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
    ["Accessoires (Fil, cales, polyane)", "Forfait chantier", `${formatFCFA(PRIX_FIL_CALES)} / m²`, formatFCFA(totalAccessoiresF), "Cales béton 4cm, film étanche dallage"],
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

  const phase1Ciment = Math.round(totalSacsCiment * 0.25);
  const phase1Acier = (tonnageAcierTotal * 0.30).toFixed(2);
  const phase2Ciment = Math.round(totalSacsCiment * 0.30);
  const phase2Acier = (tonnageAcierTotal * 0.30).toFixed(2);
  const phase3Ciment = Math.round(totalSacsCiment * 0.25);
  const phase3Acier = (tonnageAcierTotal * 0.25).toFixed(2);
  const phase4Ciment = totalSacsCiment - (phase1Ciment + phase2Ciment + phase3Ciment);
  const phase4Acier = (tonnageAcierTotal - (parseFloat(phase1Acier) + parseFloat(phase2Acier) + parseFloat(phase3Acier))).toFixed(2);

  const planningRows = [
    ["Phase 1 : Fouilles, Fondations & Soubassement", `${formatNum(phase1Ciment)} Sacs`, `${phase1Acier} T (HA16, HA14, HA12)`, `${formatNum(Math.round(volGravierBasalte * 0.25))} m³`, `${formatNum(nbAgglos20)} agglos pleins de 20 + sable`],
    ["Phase 2 : Poteaux RDC & Plancher Haut", `${formatNum(phase2Ciment)} Sacs`, `${phase2Acier} T (HA14, HA12, HA8)`, `${formatNum(Math.round(volGravierBasalte * 0.30))} m³`, `${formatNum(Math.round(nbHourdis * 0.5))} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15`],
    ["Phase 3 : Élévations & Planchers Étages (R+N)", `${formatNum(phase3Ciment)} Sacs`, `${phase3Acier} T (HA12, HA10, HA8)`, `${formatNum(Math.round(volGravierBasalte * 0.25))} m³`, `${formatNum(Math.round(nbHourdis * 0.5))} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.4))} agglos 15`],
    ["Phase 4 : Toiture Terrasse, Acrotères & Enduits", `${formatNum(phase4Ciment)} Sacs`, `${phase4Acier} T (HA10, HA8, HA6)`, `${formatNum(Math.round(volGravierBasalte * 0.20))} m³`, `${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15 + sable enduits`]
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
    ["BUDGET GLOBAL GROS ŒUVRE (TCE FOURNITURES + MO)", formatFCFA(totalGrosOeuvreTCE), `Ratio d'ingénierie global : env. ${formatFCFA(Math.round(totalGrosOeuvreTCE / surface))} / m² de plancher`]
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
    ["Point 5 : Décoffrage Structure", "21 jours calendaires min", "Interdiction formelle de décoffrer sous 7 ou 14 jours sans accord écrit du bureau de contrôle."],
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
    ["4. Retenue de Garantie Légale 5%", "Article 768 du COCC : Prélever 5% sur chaque acompte jusqu'à la réception définitive des travaux."]
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
  doc.text("Bordereau Quantitatif Estimatif établi selon les normes BAEL 91 R99 et le Code des Obligations Civiles et Commerciales.", 18, currentY + 10);
  doc.text(`Rapport officiel certifié n° ${refDoc} • Émis à Dakar le ${currentDate} pour le compte exclusif de ${clientName}.`, 18, currentY + 15);
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

  // Diagnostic
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

  // En-tête officiel
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

    const legalNotice = `DOCUMENT D'ARBITRAGE TECHNIQUE & JURIDIQUE NOMINATIF — MAÎTRE D'OUVRAGE : ${clientName.toUpperCase()} • TÉL : ${clientPhone} • TITRE FONCIER : ${lotNumber}. TOUTE UTILISATION OU DIFFUSION ENGAGE LA RESPONSABILITÉ CIVILE ET PÉNALE DU DÉTENTEUR.`;
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
  doc.text("IDENTIFICATION NOMINATIVE DU MAÎTRE D'OUVRAGE & DU DEVIS AUDITÉ", 18, 59);

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
    ["Couverture Assurantielle / Garanties", hasGuarantee === 'aucune' ? "ZÉRO garantie spécifiée" : (hasGuarantee === 'retenue_5' ? "Retenue de 5% actée" : "Décennale officielle"), hasGuarantee === 'aucune' ? "ALERTE : Absence totale de recours contractuel en cas de sinistre" : "Protection juridique minimale assurée"]
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

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("II. RÉPARTITION THÉORIQUE DU BUDGET PAR MACRO-LOT (RÉFÉRENTIEL BET)", 14, currentY);

  const partGo = Math.round(quotedAmount * (scope === 'go_seul' ? 1.0 : (scope === 'clos_couvert' ? 0.68 : 0.48)));
  const partSo = scope === 'go_seul' ? 0 : Math.round(quotedAmount * (scope === 'clos_couvert' ? 0.22 : 0.38));
  const partEtancheite = scope === 'go_seul' ? 0 : Math.round(quotedAmount * 0.07);
  const partMarge = Math.round(quotedAmount * 0.07);

  const repartitionRows = [
    ["Gros Œuvre & Structure BAEL", formatFCFA(partGo), "Terrassements, semelles, poteaux, poutres, planchers et agglos"],
    ["Second Œuvre & Finitions", scope === 'go_seul' ? "Exclu du devis" : formatFCFA(partSo), "Plomberie, électricité, carrelage grès cérame, étanchéités intérieures"],
    ["Étanchéité Toiture & Acrotères", scope === 'go_seul' ? "Exclu du devis" : formatFCFA(partEtancheite), "Complexe multicouche 4mm bitumineux avec relevés de solin"],
    ["Provision Aléas & Marge Entrepreneur", formatFCFA(partMarge), "Marge bénéficiaire normale estimée à 7-10% du coût direct"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Poste Technique', 'Quote-Part Estimative', 'Périmètre Normal des Prestations']],
    body: repartitionRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY } },
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
    ["Dosage du Béton Armé", "Mention imprécise 'Béton Armé'", "Exiger : CEM II 42.5R dosé à 350 kg/m³. Refuser formellement le ciment 32.5 pour les dalles et poteaux."],
    ["Qualité & Diamètre des Aciers", "Aciers non spécifiés ou lisses", "Imposer : Aciers Haute Adhérence FeE500 certifiés. Interdire les fers déclassés ou de récupération."],
    ["Épaisseur de Table de Compression", "Table réduite à 2 ou 3 cm", "Norme BAEL 91 : Épaisseur minimale absolue de 4 cm armée d'un treillis soudé pour éviter le poinçonnement."],
    ["Enrobage des Armatures", "Absence totale de cales béton", "Exiger cales de 4,5 cm en milieu marin (Dakar Littoral) et 3 cm en zone intérieure sous peine de rouille expansive."],
    ["Nature des Agrégats", "Gravier calcaire tendre", "Prescrire obligatoirement le concassé de basalte des carrières de Diack pour toute la structure porteuse."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Composant Structurel', 'Piège / Formule Trompeuse Constatée', 'Exigence Rectificative ChantierSur']],
    body: piegesRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("IV. LES 7 OMISSIONS STRATÉGIQUES DES ENTREPRENEURS À DAKAR", 14, currentY);

  const omissionsRows = [
    ["1. L'Arase Étanche de Soubassement", "Oubliée dans 65% des devis", "Absence de feutre bitumé sous longrines = remontées capillaires sur 1,50 m de mur."],
    ["2. La Cure du Béton pendant 7 jours", "Considérée à tort comme accessoire", "Béton non arrosé sous le soleil de Dakar = microfissuration et perte de 30% de résistance."],
    ["3. L'Évacuation des Déblais et Gravois", "Reportée en supplément de fin de chantier", "Imposer contractuellement le nettoyage continu et l'évacuation en décharge autorisée."],
    ["4. Les Essais d'Écrasement d'Éprouvettes", "Absents des devis tâcherons", "Recommandé pour R+2 et plus pour certifier la résistance fc28 >= 25 MPa du béton."],
    ["5. Le Cuvelage des Fosses et Bâches", "Chiffré en maçonnerie simple poreuse", "Les bâches Sen'Eau et fosses doivent être en béton armé étanche avec adjuvant hydrofuge."],
    ["6. Les Étaiements & Délais de Décoffrage", "Non formalisés au devis", "Risque d'affaissement si décoffrage sous 7 à 10 jours pour réutiliser les étais ailleurs."],
    ["7. La Prise de Terre en Fond de Fouille", "Omise au profit d'un simple piquet", "Exiger le câble cuivre nu 25 mm² ceinturé sous semelle pour conformité NF C 15-100."]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Poste Couramment Omis', 'Impact / Risque Financier Réel', 'Correction Obligatoire à Porter au Devis']],
    body: omissionsRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
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

  const tranche1 = Math.round(quotedAmount * 0.15); // Avance démarrage
  const tranche2 = Math.round(quotedAmount * 0.25); // Fondations achevées
  const tranche3 = Math.round(quotedAmount * 0.25); // Plancher RDC / R+1
  const tranche4 = Math.round(quotedAmount * 0.20); // Toiture et élévations
  const tranche5 = Math.round(quotedAmount * 0.10); // Réception provisoire
  const retenue = Math.round(quotedAmount * 0.05);  // Retenue de garantie 5%

  const echeancierRows = [
    ["Tranche 1 : Démarrage & Approvisionnement", "15 %", formatFCFA(tranche1), "Installation chantier, premières commandes aciers FeE500 et fouilles"],
    ["Tranche 2 : Réception des Fondations", "25 %", formatFCFA(tranche2), "Coulage des semelles, longrines et dallage RDC validés sur PV"],
    ["Tranche 3 : Superstructure & Dalles Mi-Parcours", "25 %", formatFCFA(tranche3), "Poteaux, poutres et dalles d'étages achevés sans désaffleurement"],
    ["Tranche 4 : Toiture Terrasse & Maçonneries", "20 %", formatFCFA(tranche4), "Étanchéité toiture éprouvée 48h en eau + agglos entièrement montés"],
    ["Tranche 5 : Réception Provisoire des Travaux", "10 %", formatFCFA(tranche5), "Remise des clés et signature du Procès-Verbal de Réception Provisoire"],
    ["Garantie Légale COCC (Bloquée 1 an)", "5 %", formatFCFA(retenue), "Libérée UNIQUEMENT à la réception définitive après levée des réserves"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Étape Contractuelle de Décaissement', 'Quote-Part', 'Montant Associé', 'Condition Impérative de Déblocage des Fonds']],
    body: echeancierRows,
    theme: 'grid',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
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

  const negoRows = [
    ["Sur l'Acompte Initial Élevé", "Refuser toute avance > 20%", "Argument : 'Les matériaux seront livrés par tranches sur le site et payés directement aux fournisseurs certifiés.'"],
    ["Sur la Fluctuation des Prix", "Imposer le prix forfaitaire et ferme", "Argument : 'Le contrat est signé sur une base globale forfaitaire non révisable. Le stockage initial sécurise le prix.'"],
    ["Sur les Travaux Supplémentaires", "Avenant écrit obligatoire", "Argument : 'Aucun supplément de prix ne sera recevable s'il n'a pas fait l'objet d'un ordre écrit signé du maître d'ouvrage.'"],
    ["Sur les Délais de Livraison", "Acter 25 000 FCFA/jour de retard", "Argument : 'Le respect du calendrier engage des coûts de loyer pour le maître d'ouvrage, les pénalités sont de droit.'"]
  ];

  doc.autoTable({
    startY: currentY + 3,
    head: [['Sujet de Friction Fréquent', 'Position Ferme à Tenir', 'Formulation d\'Ingénierie à Imposer']],
    body: negoRows,
    theme: 'striped',
    headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.2, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // PAGE 4 : LES 5 CLAUSES DU COCC & VISA DE L'EXPERT
  // =========================================================================
  doc.addPage();
  drawAuditHeader("Rapport de Contre-Expertise & Audit Devis", "Partie IV : Clauses Contractuelles Impératives (COCC) & Visa de Clôture");

  currentY = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VII. LES 5 CLAUSES JURIDIQUES DE SAUVEGARDE DU CODE DES OBLIGATIONS (COCC)", 14, currentY);

  const clausesCOCC = [
    {
      titre: "1. Clause de Retenue de Garantie Légale de 5% (Article 768 du COCC)",
      texte: "Une retenue de 5% est systématiquement déduite de chaque acompte payé à l'entrepreneur. Cette somme est consignée et ne sera débloquée qu'à l'issue du délai de garantie d'un an suivant le Procès-Verbal de Réception Définitive, après levée complète de toutes les réserves éventuelles."
    },
    {
      titre: "2. Clause de Forfaitisation Ferme et Non Révisable (Article 767 du COCC)",
      texte: "Le montant convenu au présent marché est réputé forfaitaire, ferme et définitif pour l'intégralité des prestations décrites. Aucune majoration pour augmentation du coût de la main d'œuvre, du carburant ou des matériaux (fer, ciment) ne pourra être opposée au maître d'ouvrage."
    },
    {
      titre: "3. Clause de Conditionnement des Décaissements aux Points d'Arrêt",
      texte: "Aucun paiement ne peut être exigé sur simple constat de temps écoulé. Chaque acompte est formellement subordonné à la présentation du Procès-Verbal de Point d'Arrêt signé par le technicien mandataire du maître d'ouvrage (armatures semelles, hourdis, décoffrage)."
    },
    {
      titre: "4. Clause de Pénalités de Retard Journalières",
      texte: "En cas de retard dans l'exécution des travaux par rapport au délai convenu, et hors cas de force majeure prouvée par voie d'huissier, l'entrepreneur sera redevable d'office d'une pénalité de 25 000 FCFA par jour de retard, directement compensable sur le solde de fin de chantier."
    },
    {
      titre: "5. Clause de Résolution de Plein Droit en Cas d'Abandon de Chantier",
      texte: "Tout arrêt injustifié des travaux supérieur à 14 jours calendaires consécutifs entraînera la résiliation immédiate du contrat aux torts exclusifs de l'entrepreneur après mise en demeure par exploit d'huissier restée sans effet sous 8 jours, sans préjudice de poursuites en dommages et intérêts."
    }
  ];

  let clauseTop = currentY + 4;
  clausesCOCC.forEach((c) => {
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.rect(14, clauseTop, 182, 23, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, clauseTop, 182, 23, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(c.titre, 18, clauseTop + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.1);
    doc.setTextColor(51, 65, 85);
    const splitC = doc.splitTextToSize(c.texte, 174);
    doc.text(splitC, 18, clauseTop + 11);

    clauseTop += 25.5;
  });

  currentY = clauseTop + 3;

  // Bloc de validation technique officiel
  doc.setFillColor(...COLOR_BG_LIGHT);
  doc.rect(14, currentY, 182, 21, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 21, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_NAVY);
  doc.text("VISA TECHNIQUE & JURIDIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLOR_SLATE);
  doc.text("Rapport d'expertise et d'arbitrage financier de devis établi en conformité avec les règles de l'art du bâtiment et le Code des Obligations Civiles et Commerciales.", 18, currentY + 11);
  doc.text(`Dossier certifié nominatif n° ${refDoc} • Émis à Dakar le ${currentDate} pour le compte exclusif de ${clientName}.`, 18, currentY + 16);
}


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
    } else if (service === 'express') {
      renderExpress(doc, data, refDoc, currentDate);
    } else if (service === 'audit') {
      renderAudit(doc, data, refDoc, currentDate);
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
