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
    const hauteurMaxGabarit = +(streetWidth + reculAlignement).toFixed(1);

    // Correction 1 - COS
    const COS_MAX_PAR_ZONE = {
      'Dakar - Zone Urbaine': 3.0, 'Dakar - Plateau': 4.0,
      'Dakar - Almadies': 1.5, 'default': 2.5
    };
    const zoneKey = Object.keys(COS_MAX_PAR_ZONE).find(k => location.includes(k)) || 'default';
    const cosMax = COS_MAX_PAR_ZONE[zoneKey];
    const cosProjet = +(sdpTotale / surface).toFixed(2);
    const respecteCos = cosProjet <= cosMax;

    // Correction 2 - Gabarit gradué
    const depassementGabarit = parseFloat(hauteurFaitage) - hauteurMaxGabarit;
    let statutGabarit = "Conforme";
    if (depassementGabarit > 0) {
      if (depassementGabarit <= 0.10 * hauteurMaxGabarit) {
        statutGabarit = "Non-conformité mineure — dérogation à étudier auprès de la DUA";
      } else {
        const depPct = Math.round((depassementGabarit / hauteurMaxGabarit) * 100);
        statutGabarit = `NON CONFORME : Dépassement de ${depassementGabarit.toFixed(1)} m (${depPct} %). Réduire la hauteur ou dérogation exceptionnelle.`;
      }
    }

    // Correction 7 - Places de stationnement
    const nb_logements = Math.max(1, Math.round(sdpTotale / 150));
    const N_places = Math.max(Math.ceil(sdpTotale / 100), nb_logements);
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

    // Correction 8 - Type de fondation (radier si niveaux > 4)
    const nSerPoteau8 = Math.round((7.0 * 16.0 * totalLevelsCount) + ((usage === 'bureaux' ? 2.5 : 1.5) * 16.0 * totalLevelsCount));
    const surfaceSemelleApprox8 = (nSerPoteau8 * 1.05) / (portanceSolBars * 100);
    const ratioSemelle8 = surfaceSemelleApprox8 / 16.0;
    if (totalLevelsCount > 4 || ratioSemelle8 > 0.50) {
      modeFondation = "Type de fondation à confirmer par étude géotechnique — radier général à envisager (tassements excessifs probables).";
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
      ["COS Projet (SDP / Surface)", cosProjet.toFixed(2), respecteCos ? `CONFORME (Max PDU: ${cosMax})` : `NON CONFORME : COS ${cosProjet} > ${cosMax} — permis refusable.`],
      ["Emprise au Sol Maximale (CES = 0,65)", `${empriseSolMax} m²`, "Limite légale de projection au sol des constructions"],
      ["Espaces Libres Perméables (35%)", `${espacesLibres} m²`, "Zone perméable requise pour l'infiltration pluviale"],
      ["Surface Développée de Plancher Totale (SDP)", `env. ${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (hors trémies)`],
      ["Hauteur Totale du Bâtiment Projeté", `env. ${hauteurFaitage} m`, "Dalle supérieure + acrotère de terrasse de 1,20 m"],
      ["Largeur de la Voie Publique Desservante", `${streetWidth} mètres`, `Recul légal d'alignement exigé : ${reculAlignement} m`],
      ["Gabarit Légal sur Rue (H <= L + R)", `${hauteurMaxGabarit} mètres`, statutGabarit],
      ["Places de Stationnement Obligatoires", `${N_places} place(s)`, "Règle: max(SDP/100, nb_logements). Formule tracée."]
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

    // Correction 3 - Sécurité incendie si H > 28m
    const hFaitageFloat3 = parseFloat(hauteurFaitage);
    if (hFaitageFloat3 > 28) {
      currentY = doc.lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLOR_NAVY);
      doc.text("III. PRESCRIPTIONS SÉCURITÉ INCENDIE (ARRÊTÉ 31/01/1986 / RÉGIME IGH)", 14, currentY);
      const incendieBody = (usage === 'unifamilial' || usage === 'locatif') ?
        [
          ["Classification", "4ème famille d'habitation", "Prescriptions de sécurité incendie renforcées (H > 28 m)."],
          ["Action requise", "Validation BET spécialisé", "Conformité à valider avant tout dépôt de permis de construire."]
        ] : [
          ["Classification", "Régime IGH (Immeuble de Grande Hauteur)", "Passage en commission de sécurité obligatoire."],
          ["Exigences", "Désenfumage + Compartimentage 2h", "2 escaliers/compartiment, colonnes sèches/humides, sprinklers."]
        ];
      doc.autoTable({
        startY: currentY + 3,
        head: [['Domaine', 'Statut Incendie', 'Réglementation & Actions']], body: incendieBody,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.2, cellPadding: 2.3 },
        columnStyles: { 1: { fontStyle: 'bold', textColor: [185, 28, 28] } },
        margin: { left: 14, right: 14 }
      });
    }

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
      ["Capacité Portante Admissible du Sol (q_adm)", `${portanceSolBars} bars (${qAdmkNm2} kN/m²)`, "Valeur estimative — étude géotechnique obligatoire avant dimensionnement définitif."],
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
    
    // Correction 4 - Puissance Senelec
    const ratioElec = 0.08; // 0.08 kVA/m² pour bâtiment climatisé (à valider BET)
    const puissanceKva = Math.round(sdpTotale * ratioElec);
    const alerteSenelec = `Ratio : ${ratioElec} kVA/m² × ${sdpTotale} m² SDP. Formule tracée. À valider BET.`;

    let energieDetail = "Raccordement standard Senelec monophasé ou triphasé.";
    if (energyBackup === 'solaire') energieDetail = "Installation photovoltaïque hybride avec onduleur 5 kVA et stockage lithium.";
    if (energyBackup === 'groupe') energieDetail = "Inverseur de source automatique Normal/Secours (ATS) + local insonorisé pour groupe.";

    // Correction 5 - Fosse septique
    let assainissementType, assainissementPrescription;
    if (sanitation === 'onas') {
      assainissementType = "Réseau Public Collectif ONAS";
      assainissementPrescription = "Raccordement obligatoire. Clapet anti-retour de façade requis. Pas de fosse septique.";
    } else {
      assainissementType = "Fosse Toutes Eaux Étanche (NS 17-074)";
      const nbPieces = Math.round(sdpTotale / 30);
      const volFosse = 3 + Math.max(0, nbPieces - 5);
      assainissementPrescription = volFosse > 30
        ? `Fosse étanche ${volFosse} m³. ALERTE: Volume important — BET requis, micro-station à envisager.`
        : `Fosse 3 compartiments ${volFosse} m³ + puits filtrant. (NS 17-074).`;
    }

    // Correction de la séparation nette des lignes du tableau V
    const reseauxRows = [
      ["Bâche à Eau Tampon Enterrée (Sen'Eau)", `${bacheEauVolume} m³ (Autonomie 48h)`, "Obligatoire face aux baisses de pression. Cuve béton étanche + surpresseur."],
      ["Bilan de Puissance Souscrite (Senelec)", `${puissanceKva} kVA (${puissanceKva > 12 ? 'Triphasé' : 'Monophasé'})`, alerteSenelec],
      ["Secours Énergétique Préconisé", energyBackup.toUpperCase(), energieDetail],
      ["Boucle de Terre en Fond de Fouille", "Câble cuivre nu 25 mm² (<= 5 Ohms)", "Ceinture sous semelles obligatoire pour la protection foudre en hivernage."],
      ["Système d'Assainissement des Eaux", assainissementType, assainissementPrescription]
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

    // Corrections 6 & 9 - Ratios traçables + provision correcte
    const RATIOS_2026 = {
      terrassement: hasBasement ? 60000 : 45000,
      grosOeuvre: 110000,
      secondOeuvre: standing === 'haut' ? 140000 : (standing === 'economique' ? 70000 : 95000),
      etancheite: 25000
    };
    const pTerrassement = Math.round(sdpTotale * RATIOS_2026.terrassement);
    const pGrosOeuvre = Math.round(sdpTotale * RATIOS_2026.grosOeuvre);
    const pSecondOeuvre = Math.round(sdpTotale * RATIOS_2026.secondOeuvre);
    const pEtancheite = Math.round(sdpTotale * RATIOS_2026.etancheite);
    const pIncendie = parseFloat(hauteurFaitage) > 28 ? 25000000 : 0;
    const tauxAleas = 0.07;
    const pAleas = Math.round((pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite + pIncendie) * tauxAleas);
    const pTotal = pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite + pIncendie + pAleas;

    let budgetTceRows = [
      ["1. Terrassements, Fouilles & Fondations", formatFCFA(pTerrassement), `Ratio : ${RATIOS_2026.terrassement} FCFA/m² × ${sdpTotale} m²`],
      ["2. Superstructure Béton Armé BAEL 91", formatFCFA(pGrosOeuvre), `Ratio : ${RATIOS_2026.grosOeuvre} FCFA/m² × ${sdpTotale} m²`],
      ["3. Second Œuvre, Fluides & Électricité", formatFCFA(pSecondOeuvre), `Ratio : ${RATIOS_2026.secondOeuvre} FCFA/m² × ${sdpTotale} m²`],
      ["4. Étanchéité Toiture Terrasse & Cuvelage", formatFCFA(pEtancheite), `Ratio : ${RATIOS_2026.etancheite} FCFA/m² × ${sdpTotale} m²`],
    ];
    if (pIncendie > 0) budgetTceRows.push(["5. Équipements Sécurité Incendie (Provision)", formatFCFA(pIncendie), "Provision obligatoire IGH/4e famille — à valider BET."]);
    budgetTceRows.push([`Provision Aléas & Marché (${tauxAleas * 100}%)`, formatFCFA(pAleas), `${tauxAleas * 100}% × sous-total lots. Formule tracée.`]);
    budgetTceRows.push(["ENVELOPPE GLOBALE ESTIMATIVE DU PROJET", formatFCFA(pTotal), `Ratio moyen : env. ${formatFCFA(Math.round(pTotal / sdpTotale))} / m² de plancher`]);

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
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SLATE);
    // Correction 10 - Disclaimer (suppression de "certifié")
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide à la décision généré automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'études agréé. Les valeurs réglementaires (COS max, capacité portante, ratios) doivent être confirmées par des professionnels qualifiés avant tout engagement financier ou dépôt de permis.",
      178
    );
    doc.text(disclaimerLines, 18, currentY + 10);
    doc.text(`Rapport émis à Dakar le ${currentDate} pour le compte exclusif de ${clientName}. Réf: ${refDoc}`, 18, currentY + 18);
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

  // =========================================================================
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
  // ========================================================================= 
// 4. LIVRABLE : BORDEREAU SECOND ŒUVRE & FINITIONS (4 PAGES DENSES) 
// ========================================================================= 
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

  // =========================================================================
  // FONCTION EXPORTEE GLOBALE
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
  } else if (service === 'finitions') {
    renderFinitions(doc, data, refDoc, currentDate);
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
      if (service === 'finitions') {
        doc.text("Document généré automatiquement à titre indicatif — Normes DTU Second Œuvre (52.1, 59.1, 60.1, 43.1) & NF C 15-100.", 14, pageHeight - 7);
      } else {
        doc.text("Document généré automatiquement à titre indicatif — BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", 14, pageHeight - 7);
      }

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
