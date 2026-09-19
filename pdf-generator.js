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
      // PAGE 1 : Faisabilité & Sol
      drawPageHeader(doc, "1. Rapport d'Esquisse & Faisabilité Technique", "Phase Zéro : Faisabilité Foncière, Contraintes Sol & Gabarit BTP");
      let currentY = drawProjectIdentityBlock(50);

      // Section Analyse Géotechnique
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("I. DIAGNOSTIC GÉOTECHNIQUE & PRESCRIPTIONS DE FONDATIONS", 14, currentY);

      const isMarine = location.toLowerCase().includes('almadies') || location.toLowerCase().includes('ngor') || location.toLowerCase().includes('yoff') || location.toLowerCase().includes('corniche');
      const isSwampy = location.toLowerCase().includes('massar') || location.toLowerCase().includes('malika') || location.toLowerCase().includes('pikine') || location.toLowerCase().includes('thiaroye');
      const isClay = location.toLowerCase().includes('diamniadio') || location.toLowerCase().includes('bargny');

      let solNature = "Sable dunaire ou latérite portante standard";
      let foundationType = "Semelles isolées sous poteaux + longrines de chaînage";
      let enrobageAciers = "3,0 cm (Exposition standard)";
      let hydroRisk = "Modéré / Infiltration standard";

      if (isMarine) {
        solNature = "Sable quartzeux dunaire / roche volcanique côtière avec risque de sels marins";
        foundationType = "Semelles renforcées + longrines de rigidité antisismiques";
        enrobageAciers = "4,5 à 5,0 cm strict (Milieu agressif marin - risque d'éclatement du béton)";
        hydroRisk = "Élevé (Brumes salines & remontées capillaires côtières)";
      } else if (isSwampy) {
        solNature = "Zone basse à nappe phréatique affleurante en période d'hivernage";
        foundationType = "Radier général nervuré ou semelles filantes avec cuvelage étanche";
        enrobageAciers = "4,0 cm avec hydrofuge de masse Sika dans le béton";
        hydroRisk = "Critique (Drainage périphérique & cuvelage étanche obligatoires)";
      } else if (isClay) {
        solNature = "Marnes et argiles gonflantes (Mouvements de sol différentiels en saison des pluies)";
        foundationType = "Puits courts ancrés sous la couche active ou longrines rigides de liaisonnement";
        enrobageAciers = "3,5 cm avec armature minimale de traction renforcée";
        hydroRisk = "Gonflement / Retrait sévère";
      }

      const geoRows = [
        ["Nature dominante du sol", solNature],
        ["Système de fondations préconisé", foundationType],
        ["Enrobage minimal des armatures", enrobageAciers],
        ["Sensibilité hydrique & Hivernage", hydroRisk],
        ["Dosage recommandé béton de semelle", "CEM II 42.5R dosé à 350 kg/m³ minimum"]
      ];

      doc.autoTable({
        startY: currentY + 4,
        head: [['Paramètre Géotechnique', 'Prescription d\'Ingénierie ChantierSur']],
        body: geoRows,
        theme: 'striped',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Section Gabarit Parcellaire
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("II. GABARIT PARCELLAIRE & CAPACITÉ CONSTRUCTIVE ESTIMÉE", 14, currentY);

      const empriseSol = Math.round(surface * 0.65);
      const retraitRue = 3.0; // 3m de recul minimal (Urbanisme)
      const profondeurParcelle = surface / facadeWidth;
      const hauteurTotale = (totalLevelsCount * 3.10) + 1.20;

      const gabaritRows = [
        ["Emprise au Sol (CES max 65%)", `${empriseSol} m²`, "Préserve l'aération et l'éclairage naturel (Règlementation)"],
        ["Surface Libre / Cours Intérieures", `${surface - empriseSol} m²`, "Espaces d'infiltration des eaux pluviales et servitudes"],
        ["Retrait de Façade sur Rue", `${retraitRue.toFixed(2)} m`, "Alignement obligatoire avec la voirie"],
        ["Gabarit de Hauteur (Faîtage)", `~${hauteurTotale.toFixed(1)} mètres`, "Sous réserve d'autorisation de l'Aviation Civile selon la zone"],
        ["Destination & Typologie", buildingUsage === 'unifamilial' ? "Résidentiel Unifamilial" : (buildingUsage === 'locatif' ? "Immeuble Locatif" : "Projet Mixte / Bureaux"), "Impact sur le dimensionnement des charges d'exploitation"],
        ["Mitoyenneté & Configuration", neighborStatus === 'vide' ? "Parcelles nues autour" : "Mitoyenneté existante", parcelConfig === 'angle' ? "Parcelle d'angle (2 façades)" : "Parcelle en bande"]
      ];

      doc.autoTable({
        startY: currentY + 4,
        head: [['Indicateur Volumétrique', 'Valeur Calculée', 'Implication Technique & Urbanistique']],
        body: gabaritRows,
        theme: 'grid',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 }
      });

      // PAGE 2 : Enveloppe Budgétaire & Urbanisme Sénégal
      doc.addPage();
      drawPageHeader(doc, "1. Rapport d'Esquisse & Faisabilité Technique", "Phase Zéro : Estimation Budgétaire Macro & Démarches Administratives");

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("III. ENVELOPPE BUDGÉTAIRE PRÉVISIONNELLE (PHASE ZÉRO)", 14, 52);

      const coutM2GrosOeuvre = standing === 'haut' ? 155000 : (standing === 'economique' ? 115000 : 135000);
      const coutM2SecondOeuvre = standing === 'haut' ? 175000 : (standing === 'economique' ? 105000 : 130000);
      const totalGo = Math.round(sdpTotal * coutM2GrosOeuvre);
      const totalSo = Math.round(sdpTotal * coutM2SecondOeuvre);
      const totalTce = totalGo + totalSo;

      const budgetRows = [
        ["Gros Œuvre & Structure BAEL", `${totalGo.toLocaleString('fr-FR')} FCFA`, "Terrassements, fondations, béton armé, maçonnerie"],
        ["Second Œuvre & Lots Architecturaux", `${totalSo.toLocaleString('fr-FR')} FCFA`, "Plomberie, électricité, carrelage, menuiserie, étanchéité"],
        ["Provision Aléas & Intempéries (5%)", `${Math.round(totalTce * 0.05).toLocaleString('fr-FR')} FCFA`, "Marge pour variations de prix du fer/ciment"],
        ["TOTAL ESTIMATIF CLEF EN MAIN (TCE)", `${Math.round(totalTce * 1.05).toLocaleString('fr-FR')} FCFA`, `Ratio macro : ~${Math.round((totalTce * 1.05) / sdpTotal).toLocaleString('fr-FR')} FCFA / m²`]
      ];

      doc.autoTable({
        startY: 56,
        head: [['Macro-Lot Technique', 'Montant Prévisionnel', 'Contenu du Poste']],
        body: budgetRows,
        theme: 'grid',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 3 },
        margin: { left: 14, right: 14 }
      });

      // Procédure Permis de Construire Sénégal
      currentY = doc.lastAutoTable.finalY + 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("IV. CADRE JURIDIQUE & DOSSIER DE PERMIS DE CONSTRUIRE AU SÉNÉGAL", 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR_SLATE);
      doc.text("Conformément au Code de l'Urbanisme du Sénégal, toute construction doit faire l'objet d'une autorisation préalable :", 14, currentY + 5);

      const urbaRows = [
        ["1. Certificat d'Urbanisme", "Direction de l'Urbanisme (DUA)", "Vérification des alignements, servitudes et COS."],
        ["2. Plans Architecturaux Visés", "Architecte inscrit à l'Ordre (OAAS)", "Obligatoire au Sénégal pour tout projet au-delà de 80 m²."],
        ["3. Note de Calcul Béton Armé", "Bureau d'études techniques (BET)", "Justification des sections de béton et ferraillages BAEL 91."],
        ["4. Titre de Propriété Régulier", "Conservation de la Propriété Foncière", "Extrait de Titre Foncier (TF) ou Bail approuvé de moins de 3 mois."],
        ["5. Délais d'Instruction Légaux", "Mairie / Commission Préfectorale", "Délai légal moyen de 45 jours calendaires après dépôt complet."]
      ];

      doc.autoTable({
        startY: currentY + 8,
        head: [['Pièce Administrative', 'Organisme Compétent', 'Exigence Légale']],
        body: urbaRows,
        theme: 'striped',
        headStyles: { fillColor: COLOR_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        margin: { left: 14, right: 14 }
      });
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
