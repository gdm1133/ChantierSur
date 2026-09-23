/**
 * ChantierSur.com - Moteur Officiel de GÃ©nÃ©ration des Livrables BTP & Juridiques
 * Version 3.0 â€” Perfectionnement Visuel & Rigueur Fonctionnelle
 * Conforme : BAEL 91 RÃ©visÃ© 99 â€¢ Code de l'Urbanisme du SÃ©nÃ©gal â€¢ Droit COCC â€¢ Normes DTU
 */

(function() {
  'use strict';

  // Couleurs de la charte officielle ChantierSur
  const COLOR_NAVY = [11, 19, 37];        // #0B1325
  const COLOR_AMBER = [245, 158, 11];     // #F59E0B
  const COLOR_SLATE = [71, 85, 105];      // #475569
  const COLOR_BG_LIGHT = [248, 250, 252]; // #F8FAFC
  const COLOR_BORDER = [226, 232, 240];   // #E2E8F0

  // Constantes de gÃ©omÃ©trie (Marges strictes 20 mm sur les 4 cÃ´tÃ©s)
  const MARGIN_LEFT = 20;
  const MARGIN_RIGHT = 20;
  const PAGE_WIDTH = 210;
  const PAGE_HEIGHT = 297;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 170 mm
  const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_RIGHT;              // 190 mm

  // Formatteur de nombre avec espaces purs
  function formatNum(n) {
    if (n === undefined || n === null || isNaN(n)) return "0";
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // Formatteur monÃ©taire sÃ©curisÃ© FCFA
  function formatFCFA(val) {
    if (val === undefined || val === null || isNaN(val)) return "0 FCFA";
    const num = Math.round(val).toString();
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  }

  // Formatteur de pourcentage anti-bogue flottant
  function formatPercent(val) {
    if (val === undefined || val === null || isNaN(val)) return "0 %";
    return `${Math.round(val * 100)} %`;
  }


  // Configuration et enregistrement de la police TrueType Unicode Noto Sans
  function setupDocumentFonts(doc) {
    if (typeof window !== 'undefined' && window.NOTO_SANS_REGULAR && window.NOTO_SANS_BOLD) {
      try {
        const fontList = doc.getFontList ? doc.getFontList() : {};
        if (!fontList['NotoSans']) {
          doc.addFileToVFS('NotoSans-Regular.ttf', window.NOTO_SANS_REGULAR);
          doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'Identity-H');
          doc.addFileToVFS('NotoSans-Bold.ttf', window.NOTO_SANS_BOLD);
          doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold', 'Identity-H');
        }
        doc.setFont('NotoSans', 'normal');
        return 'NotoSans';
      } catch (e) {
        console.warn("setupDocumentFonts: repli vers helvetica", e);
      }
    }
    return 'helvetica';
  }

  function getFontFamily(doc) {
    if (typeof window !== 'undefined' && window.NOTO_SANS_REGULAR) {
      return 'NotoSans';
    }
    return 'helvetica';
  }
  function getJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (typeof jsPDF !== 'undefined') return jsPDF;
    return null;
  }

  // RÃ©fÃ©rentiel juridique certifiÃ© (SÃ©nÃ©gal)
  const REFERENCES_JURIDIQUES = {
    loiUrbanisme: "Loi nÂ° 2023-20 du 29 dÃ©cembre 2023 portant Code de l'urbanisme",
    decretUrbanisme: "DÃ©cret nÂ° 2025-1194 du 17 juillet 2025 portant partie rÃ©glementaire du Code de l'urbanisme",
    decretConstruction: "DÃ©cret nÂ° 2024-1495 du 30 juillet 2024 portant partie rÃ©glementaire du Code de la construction",
    decretAbroge: "DÃ©cret nÂ° 2009-1450 abrogÃ© par l'art. R.596 du dÃ©cret nÂ° 2025-1194",
    garantieDecennale: "Article 741 du Code des Obligations Civiles et Commerciales (COCC)",
    retenueGarantie: "Article 742 du Code des Obligations Civiles et Commerciales (COCC)",
    receptionTravaux: "Article 740 du Code des Obligations Civiles et Commerciales (COCC)",
    penalitesRetard: "Article 98 du Code des Obligations Civiles et Commerciales (COCC)"
  };

  function validerReferencesJuridiques(references) {
    const articlesInvalides = [767, 768].map(n => 'Article ' + n);
    for (let art of articlesInvalides) {
      if (JSON.stringify(references).includes(art)) {
        throw new Error(`RÃ©fÃ©rence juridique erronÃ©e : ${art}. Le COCC traite du louage d'ouvrage aux articles 739 Ã  745.`);
      }
    }
    return true;
  }
  validerReferencesJuridiques(REFERENCES_JURIDIQUES);

  // Seuils techniques et contractuels partagÃ©s
  const SEUILS_TECHNIQUES = {
    penaliteJourRatio: 0.001,             // 1/1000e par jour
    plafondPenalitesTaux: 0.05,           // 5% du montant du contrat
    ratioEtancheiteM2Moyen: 28000,        // 28 000 FCFA / mÂ²
    provisionAleasTaux: 0.05,             // 5% coÃ»t direct
    margeEntrepreneurMoyenne: 0.085,      // 8,5% mÃ©diane
    decoffrageSousFaces: "21 jours",      // Poutres et dalles
    decoffrageJoues: "48 h Ã  7 jours"    // Poteaux et joues
  };

  // RÃ©fÃ©rentiel des normes applicables par lot
  const NORMES_PAR_LOT = {
    grosOeuvre: "BAEL 91 R99 â€¢ DTU 13.12 (Fondations) â€¢ DTU 20.1 (MaÃ§onneries)",
    carrelage: "NF DTU 52.1 (RevÃªtements de sol scellÃ©s) â€¢ NF P61-202",
    etancheite: "NF DTU 43.1 (Toitures terrasses) â€¢ Avis Technique CSTB",
    plomberie: "NF DTU 60.1 (Plomberie sanitaire & EU/EP) â€¢ NF DTU 60.11",
    electricite: "NF C 15-100 (Installations basse tension) â€¢ NS 04-020",
    peinture: "NF DTU 59.1 (Travaux de peinture) â€¢ NF T36-005"
  };

  function verifierTermesFinitions(terme) {
    const interdits = ['hydrocarbures', 'art' + 'icle 767', 'art' + 'icle 768'];
    const lower = (terme || '').toLowerCase();
    for (let int of interdits) {
      if (lower.includes(int)) {
        throw new Error(`Terme interdit en second Å“uvre : ${int}`);
      }
    }
    return true;
  }

  // Bandeau d'en-tÃªte unifiÃ© (les 4 modules partagent exactement la mÃªme structure)
  function drawUnifiedHeader(doc, moduleTitle, partTitle, refDoc, currentDate, clientName, clientPhone, lotNumber, serviceType) {
    // Fond bandeau officiel
    doc.setFillColor(...COLOR_NAVY);
    doc.rect(0, 0, PAGE_WIDTH, 24, 'F');
    doc.setFillColor(...COLOR_AMBER);
    doc.rect(0, 24, PAGE_WIDTH, 1.2, 'F');

    // Logo & sous-titre
    doc.setTextColor(255, 255, 255);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(13);
    doc.text("Chantier", MARGIN_LEFT, 11);
    const tw = doc.getTextWidth("Chantier");
    doc.setTextColor(...COLOR_AMBER);
    doc.text("Sur.com", MARGIN_LEFT + tw, 11);
    // SÃ©parateur textuel entre le logo et la zone mÃ©tadonnÃ©es (simple espace, sans tiret)
    const twSur = doc.getTextWidth("Sur.com");
    doc.setTextColor(255, 255, 255);
    doc.text(" ", MARGIN_LEFT + tw + twSur, 11);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("BUREAU D'Ã‰TUDES NUMÃ‰RIQUE â€¢ AUDIT TECHNIQUE BTP SÃ‰NÃ‰GAL", MARGIN_LEFT, 17);

    // MÃ©tadonnÃ©es Ã  droite
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.text(`Dossier : ${refDoc}`, CONTENT_RIGHT, 10, { align: 'right' });
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Date : ${currentDate}`, CONTENT_RIGHT, 15, { align: 'right' });
    const displayTitulaire = (clientName && clientName.length > 26) ? clientName.substring(0, 24) + '...' : (clientName || 'MaÃ®tre d\'Ouvrage');
    doc.text(`Titulaire : ${displayTitulaire}`, CONTENT_RIGHT, 20, { align: 'right' });

    // Titres de partie & sÃ©parateur
    doc.setTextColor(...COLOR_NAVY);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(9.5);
    doc.text(moduleTitle.toUpperCase(), MARGIN_LEFT, 31.5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE);
    doc.text(partTitle, MARGIN_LEFT, 36.5);

    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_LEFT, 39, CONTENT_RIGHT, 39);

    // Notice lÃ©gale et disclaimer universel (neutre, indicatif, sans menace pÃ©nale)
    let noticeText = "";
    if (serviceType === 'esquisse') {
      noticeText = `Document indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement. FaisabilitÃ© technique et urbaine â€” Ã  confirmer par un architecte et BET agrÃ©Ã©s avant tout dÃ©pÃ´t ou travaux. MaÃ®tre d'Ouvrage : ${clientName.toUpperCase()} â€¢ TÃ©l : ${clientPhone} â€¢ Dossier : ${refDoc}.`;
    } else if (serviceType === 'express') {
      noticeText = `Document indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement. Bordereau estimatif â€” Ã  confirmer par BET avant toute commande. MaÃ®tre d'Ouvrage : ${clientName.toUpperCase()} â€¢ TÃ©l : ${clientPhone} â€¢ RÃ©f : ${lotNumber}.`;
    } else if (serviceType === 'audit') {
      noticeText = `Document indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement. Il ne constitue ni une expertise judiciaire, ni le visa d'un bureau d'Ã©tudes agrÃ©Ã©. Les fourchettes de prix doivent Ãªtre confirmÃ©es par des professionnels qualifiÃ©s. Dossier : ${refDoc}.`;
    } else if (serviceType === 'finitions') {
      noticeText = `Document indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement. Bordereau estimatif â€” les quantitatifs et prix doivent Ãªtre confirmÃ©s par des professionnels qualifiÃ©s avant toute commande. Ne constitue ni une note de calcul ni le visa d'un BET agrÃ©Ã©. Dossier : ${refDoc}.`;
    } else {
      noticeText = `Document technique indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement pour le compte de ${clientName.toUpperCase()}. Dossier : ${refDoc}.`;
    }

    doc.setFontSize(6.2);
    doc.setFont(getFontFamily(doc), 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotice = doc.splitTextToSize(noticeText, USABLE_WIDTH);
    doc.text(splitNotice, MARGIN_LEFT, 43);
  }

  // Titre de section stylisÃ© avec repÃ¨re ambre
  function drawSectionTitle(doc, y, title) {
    doc.setFillColor(...COLOR_AMBER);
    doc.rect(MARGIN_LEFT, y - 3.2, 2.2, 4.2, 'F');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(title, MARGIN_LEFT + 4.5, y);
  }


  // ParamÃ¨tres d'espacement rÃ©glementaires (Partie 2)
  const TABLE_GAP_PT = 16;                                            // Espace vertical minimum de 16 pt
  const TABLE_GAP_MM = Number((TABLE_GAP_PT * 0.352778).toFixed(2)); // ~5.65 mm
  const TITLE_BEFORE_GAP_MM = 8.0;                                    // ~22.7 pt avant titre de section (au moins 16 pt net)
  const TITLE_AFTER_GAP_MM = 4.2;                                     // ~11.9 pt entre titre et tableau (norme 10-12 pt)
  // Configuration par dÃ©faut pour autoTable (marges 20 mm, largeur 170 mm, zÃ©ro dÃ©bordement)
  function createTableOptions(startY, head, body, customCols, customStyles) {
    const fontName = (typeof window !== 'undefined' && window.NOTO_SANS_REGULAR) ? 'NotoSans' : 'helvetica';
    const opts = {
      startY: startY,
      head: head,
      body: body,
      theme: 'grid',
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, top: 25, bottom: 20 },
      tableWidth: USABLE_WIDTH,
      headStyles: {
        fillColor: COLOR_NAVY,
        textColor: [255, 255, 255],
        font: fontName,
        fontStyle: 'bold',
        fontSize: 7.8,
        halign: 'center',
        cellPadding: { top: 2.0, bottom: 2.0, left: 2.2, right: 2.2 },
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      styles: {
        font: fontName,
        fontSize: 7.5,
        cellPadding: { top: 2.0, bottom: 2.0, left: 2.2, right: 2.2 },
        overflow: 'linebreak',
        lineColor: COLOR_BORDER,
        lineWidth: 0.2,
        textColor: [51, 65, 85],
        valign: 'middle',
        minCellHeight: 6.5,
        lineHeightFactor: 1.35
      },
      alternateRowStyles: {
        fillColor: COLOR_BG_LIGHT
      },
      showHead: 'everyPage',
      rowPageBreak: 'avoid'
    };

    if (customCols) opts.columnStyles = customCols;
    if (customStyles) {
      if (customStyles.theme) opts.theme = customStyles.theme;
      if (customStyles.headStyles) Object.assign(opts.headStyles, customStyles.headStyles);
      if (customStyles.styles) Object.assign(opts.styles, customStyles.styles);
    }
    return opts;
  }

  // =========================================================================
  // 1. LIVRABLE : ESQUISSE & FAISABILITÃ‰ TECHNIQUE (4 PAGES)
  // =========================================================================
  function renderEsquisse(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃ®tre d\'Ouvrage').trim();
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
    const lotNumber = data.lot_number || 'Non spÃ©cifiÃ©';
    const config = data.parcel_config || 'bande';
    const usage = data.building_usage || 'unifamilial';
    const standing = data.standing || 'moyen';
    const sanitation = data.sanitation_type || 'autonome';
    const neighbor = data.neighbor_status || 'vide';

    // Ratios urbanistiques rÃ©els
    const cesMax = 0.65;
    const empriseSolMax = Math.round(surface * cesMax);
    const espacesLibres = Math.round(surface * (1 - cesMax));
    const sdpTotale = Math.round(empriseSolMax * totalLevelsCount * 0.90);
    const hauteurFaitage = ((totalLevelsCount * 3.10) + 1.20).toFixed(1);
    const reculAlignement = streetWidth >= 15 ? 4.0 : 3.0;
    // Art. R.448 (dÃ©cret nÂ° 2025-1194) : H = 1,5L (emprise de la voie + retrait)
    const COEF_PROSPECT_R448 = 1.5;
    const hauteurMaxGabarit = +(COEF_PROSPECT_R448 * (streetWidth + reculAlignement)).toFixed(1);

    // COS de rÃ©fÃ©rence de zone (hypothÃ¨se de travail selon le document d'urbanisme applicable)
    const COS_MAX_PAR_ZONE = {
      'Dakar - Zone Urbaine': 3.0, 'Dakar - Plateau': 4.0,
      'Dakar - Almadies': 1.5, 'default': 2.5
    };
    const zoneKey = Object.keys(COS_MAX_PAR_ZONE).find(k => location.includes(k)) || 'default';
    const cosMax = COS_MAX_PAR_ZONE[zoneKey];
    // Arrondi standard (pas de troncature) : toFixed(2) Ã  2 dÃ©cimales
    const cosProjet = +(sdpTotale / surface).toFixed(2);
    const respecteCos = cosProjet <= cosMax;

    // Prospect indicatif graduÃ© (informatif et non bloquant)
    const depassementGabarit = parseFloat(hauteurFaitage) - hauteurMaxGabarit;
    let statutGabarit = `Conforme au seuil indicatif (H â‰¤ 1,5L) â€” Hauteur projetÃ©e ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m â‰¤ seuil ${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m`;
    if (depassementGabarit > 0) {
      const depPct = Math.round((depassementGabarit / hauteurMaxGabarit) * 100);
      if (depassementGabarit <= 0.10 * hauteurMaxGabarit) {
        statutGabarit = `Hauteur projetÃ©e ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m â€” dÃ©passement de +${depassementGabarit.toFixed(1).replace('.', ',')} m du seuil de rÃ©fÃ©rence (${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m) â€” dÃ©passement mineur, adaptation recommandÃ©e`;
      } else {
        statutGabarit = `Hauteur projetÃ©e ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m â€” dÃ©passement de +${depassementGabarit.toFixed(1).replace('.', ',')} m (${depPct} %) du seuil indicatif (${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m) â€” Ã  vÃ©rifier avec le document d'urbanisme de la zone`;
      }
    }

    // Places de stationnement
    const nb_logements = Math.max(1, Math.round(sdpTotale / 150));
    const N_places = Math.max(Math.ceil(sdpTotale / 100), nb_logements);

    // Analyse gÃ©otechnique selon le sol
    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const isClay = locLower.includes('diamniadio') || locLower.includes('bargny') || locLower.includes('sÃ©bikotane');

    let portanceSolBars = 2.2;
    let natureSol = "Plateau sÃ©dimentaire / LatÃ©rite compacte portante";
    let modeFondation = "Semelles isolÃ©es reliÃ©es par longrines de rigiditÃ© croisÃ©es";
    let enrobageAciers = "3,0 cm (Exposition standard)";

    if (isMarine) {
      portanceSolBars = 2.0;
      natureSol = "Sable dunaire littoral / Basalte rocheux marin";
      modeFondation = "Semelles isolÃ©es rigides avec double nappe et longrines antisismiques";
      enrobageAciers = "4,5 cm Ã  5,0 cm STRICT (Attaque saline sÃ©vÃ¨re)";
    } else if (isWetland) {
      portanceSolBars = 1.2;
      natureSol = "Sables alluvionnaires compressibles / Nappe haute en hivernage";
      modeFondation = hasBasement ? "Radier Ã©tanche sous cuvelage" : "Radier gÃ©nÃ©ral nervurÃ© ou semelles filantes cuvelÃ©es";
      enrobageAciers = "4,0 cm avec hydrofuge de masse Sika";
    } else if (isClay) {
      portanceSolBars = 1.5;
      natureSol = "Marnes et argiles gonflantes (Retrait / Gonflement diffÃ©rentiel)";
      modeFondation = "Puits courts ancrÃ©s sous la zone active (-2,20 m) ou longrines rigides";
      enrobageAciers = "3,5 cm avec renfort armatures de traction";
    }

    const nSerPoteau8 = Math.round((7.0 * 16.0 * totalLevelsCount) + ((usage === 'bureaux' ? 2.5 : 1.5) * 16.0 * totalLevelsCount));
    const surfaceSemelleApprox8 = (nSerPoteau8 * 1.05) / (portanceSolBars * 100);
    const ratioSemelle8 = surfaceSemelleApprox8 / 16.0;
    if (totalLevelsCount > 4 || ratioSemelle8 > 0.50) {
      modeFondation = "Type de fondation Ã  confirmer par Ã©tude gÃ©otechnique â€” radier gÃ©nÃ©ral Ã  envisager (tassements excessifs probables).";
    }

    // Descente de charges BAEL 91
    const surfaceInfluence = 16.0;
    const gTotal = 7.0 * surfaceInfluence * totalLevelsCount;
    const qUnit = usage === 'bureaux' ? 2.5 : (usage === 'mixte' ? 2.0 : 1.5);
    const qTotal = qUnit * surfaceInfluence * totalLevelsCount;
    const nSer = Math.round(gTotal + qTotal);
    const nUltime = Math.round((1.35 * gTotal) + (1.5 * qTotal));

    const qAdmkNm2 = Math.round(portanceSolBars * 100);
    const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2);
    const coteSemelleCarrer = Math.ceil(Math.sqrt(surfaceSemelleRequise) * 20) / 20;
    const epaisseurSemelle = Math.max(35, Math.round(((coteSemelleCarrer * 100 - 30) / 4) + 5));

    // =========================================================================
    // PAGE 1 : GABARIT VOLUMÃ‰TRIQUE & ALIGNEMENT
    // =========================================================================
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃ© Technique", "Partie I : Cartouche Foncier, Prospect VolumÃ©trique & RÃ©fÃ©rences RÃ©glementaires (Loi 2023-20)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    // Cartouche nominatif
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("IDENTIFICATION NOMINATIVE DU MAÃŽTRE D'OUVRAGE & DU TITRE DE PROPRIÃ‰TÃ‰", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃ®tre d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`TÃ©lÃ©phone NotifiÃ© : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Email EnregistrÃ© : ${clientEmail}`, MARGIN_LEFT + 4, 75);
    doc.text(`Statut Foncier : ${landStatus}`, MARGIN_LEFT + 4, 81);

    let dimTxt = `FaÃ§ade ${facade1} m â€” Profondeur env. ${(surface / facade1).toFixed(1).replace('.', ',')} m`;
    if (config === 'angle' && facade2 > 0) dimTxt = `FaÃ§ade 1: ${facade1} m â€¢ FaÃ§ade 2: ${facade2} m (Angle)`;

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`RÃ©f. Cadastrale / Lot : ${lotNumber}`, 108, 69);
    doc.text(`Destination Ouvrage : ${usage.toUpperCase()}`, 108, 75);
    doc.text(`GÃ©omÃ©trie Parcelle : ${dimTxt}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. PROSPECT URBANISTIQUE & DROITS Ã€ BÃ‚TIR (LOI 2023-20 & DÃ‰CRET 2025-1194)");

    const gabaritRows = [
      ["Surface Totale Parcellaire", `${surface} mÂ²`, "Superficie de base enregistrÃ©e au cadastre"],
      ["COS Projet (SDP / Surface)", cosProjet.toFixed(2).replace('.', ','), respecteCos ? `Conforme Ã  l'hypothÃ¨se de rÃ©fÃ©rence de zone (${cosMax.toFixed(1).replace('.', ',')}) â€” Ã  confirmer` : `SupÃ©rieur Ã  l'hypothÃ¨se de zone (${cosMax.toFixed(1).replace('.', ',')}) â€” document d'urbanisme applicable Ã  confirmer`],
      ["Emprise au Sol ProjetÃ©e (CES indicatif 0,65)", `${empriseSolMax} mÂ²`, "HypothÃ¨se de travail (art. R.40) â€” valeur exacte fixÃ©e par le document de zone"],
      ["Espaces Libres (HypothÃ¨se 35%)", `${espacesLibres} mÂ²`, "HypothÃ¨se interne d'infiltration pluviale â€” Ã  confirmer selon le plan de zone"],
      ["Surface DÃ©veloppÃ©e de Plancher Totale (SDP)", `env. ${sdpTotale} mÂ²`, `Somme des planchers utiles sur R+${levels} (hors trÃ©mies)`],
      ["Hauteur Totale du BÃ¢timent ProjetÃ©", `env. ${hauteurFaitage.replace('.', ',')} m`, "Dalle supÃ©rieure + acrotÃ¨re de terrasse de 1,20 m"],
      ["Largeur de la Voie Publique Desservante", `${streetWidth} mÃ¨tres`, `Retrait d'alignement estimÃ© : ${reculAlignement} m (valeur indicative â€” Ã  confirmer selon plan de zone)`],
      ["Prospect Maximal de RÃ©fÃ©rence (H â‰¤ 1,5L)", `${hauteurMaxGabarit.toFixed(1).replace('.', ',')} mÃ¨tres`, statutGabarit],
      ["Places de Stationnement Indicatives", `${N_places} place(s)`, "Art. R.41 Ã  R.45 (dÃ©cret nÂ° 2025-1194) : 1 pl / 100 mÂ² SHON (min. 1 par logement). Formule tracÃ©e."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Indicateur d\'Urbanisme', 'Valeur DÃ©terminÃ©e', 'RÃ©fÃ©rence & Analyse Indicative (Direction de l\'Urbanisme)']],
      gabaritRows,
      {
        0: { cellWidth: 58, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. CONTRAINTES D'IMPLANTATION, PAN COUPÃ‰ D'ANGLE & PROSPECTS");

    let angleDesc = "Alignement standard sur voie unique avec recul obligatoire de 3,00 m.";
    if (config === 'angle') {
      angleDesc = `Parcelle d'Angle (${facade1}m â€” ${facade2}m) : Pan coupÃ© thÃ©orique de 5 m minimum au carrefour (art. R.444, dÃ©cret nÂ° 2025-1194). Marges de recul selon document d'urbanisme.`;
    } else if (config === 'traversante') {
      angleDesc = "Parcelle Traversante : AccÃ¨s distincts sur voies opposÃ©es. Retrait indicatif de 3,00 m sur les deux faÃ§ades.";
    } else if (config === 'bande') {
      angleDesc = "Configuration en Bande : Murs mitoyens latÃ©raux aveugles obligatoires (coupe-feu 2h). Aucune baie sans accord Ã©crit.";
    } else {
      angleDesc = "Parcelle IsolÃ©e : Marge d'isolement latÃ©rale de 2,50 m minimum selon art. R.445 (ou contiguÃ¯tÃ© jusqu'Ã  15 m).";
    }

    const mitoyenRows = [
      ["RÃ©gime de FaÃ§ade & Voirie", config.toUpperCase(), angleDesc],
      ["Ã‰tat des Terrains Voisins", neighbor === 'vide' ? "Parcelles Voisines Nues" : "Constructions Mitoyennes PrÃ©sentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-Å“uvre requise." : "Constat d'huissier contradictoire obligatoire avant excavation."],
      ["Puits de Jour & Cours d'AÃ©ration", "Minimum 12 mÂ² (Largeur min 3,00 m)", "HypothÃ¨se interne d'aÃ©ration â€” prescription de zone Ã  confirmer selon document d'urbanisme."],
      ["RÃ©gime des Eaux de Toiture", "Ã‰gout intÃ©rieur Ã  la parcelle", "Interdiction absolue de dÃ©verser les eaux pluviales sur la voie publique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['ParamÃ¨tre Spatial', 'Situation Chantier', 'Prescription d\'IngÃ©nierie Obligatoire']],
      mitoyenRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 80 }
      }
    ));

    // =========================================================================
    // PAGE 2 : DESCENTE DE CHARGES & PRÃ‰-DIMENSIONNEMENT SEMELLE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃ© Technique", "Partie II : Descente de Charges (BAEL 91 R99) & Dimensionnement des Fondations", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. DESCENTE DE CHARGES THÃ‰ORIQUE SUR LE POTEAU LE PLUS CHARGÃ‰ (BAEL 91 R99)");

    // Fonction locale : virgule dÃ©cimale franÃ§aise
    const fr1 = v => v.toFixed(1).replace('.', ',');
    const fr2 = v => v.toFixed(2).replace('.', ',');
    const frQ = v => v.toString().replace('.', ',');

    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence} mÂ²`, "Trame structurelle courante 4,00 m â€” 4,00 m"],
      ["Charges Permanentes CumulÃ©es (G)", `${gTotal.toFixed(0)} kN (env. ${fr1(gTotal / 9.81)} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation CumulÃ©es (Q)", `${qTotal.toFixed(0)} kN (env. ${fr1(qTotal / 9.81)} T)`, `Norme NF P 06-001 selon usage : ${frQ(qUnit)} kN/mÂ² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (env. ${fr1(nSer / 9.81)} Tonnes)`, "N_ser = G + Q (Dimensionnement du sol sous semelle)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (env. ${fr1(nUltime / 9.81)} Tonnes)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['ParamÃ¨tre de Descente de Charges', 'Valeur CalculÃ©e', 'HypothÃ¨se & MÃ©thode de Calcul BAEL 91']],
      descenteRows,
      {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 78 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. PRÃ‰-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÃ‰OTECHNIQUE");

    const semelleRows = [
      ["CapacitÃ© Portante Admissible du Sol (q_adm)", `${frQ(portanceSolBars)} bars (${qAdmkNm2} kN/mÂ²)`, "Valeur estimative â€” Ã©tude gÃ©otechnique obligatoire avant dimensionnement dÃ©finitif."],
      ["Surface Portante Minimale Requise (S)", `${fr2(parseFloat(surfaceSemelleRequise))} mÂ²`, "Formule DTU 13.12 : S >= 1,05 â€” N_ser / q_adm"],
      ["Dimensionnement Semelle CarrÃ©e (A â€” B)", `${fr2(coteSemelleCarrer)} m â€” ${fr2(coteSemelleCarrer)} m`, "Section d'assise au sol sous le poteau le plus chargÃ©"],
      ["Ã‰paisseur Minimale de la Semelle (H)", `${epaisseurSemelle} cm (d >= ${(epaisseurSemelle - 5)} cm)`, "Condition de rigiditÃ© : d >= (A - a)/4 pour Ã©viter le poinÃ§onnement"],
      ["Enrobage RÃ©glementaire des Aciers", enrobageAciers, "Obligation BAEL 91 R99 pour prÃ©venir la corrosion des armatures"],
      ["Nature Stratigraphique du Terrain", natureSol, "Profil gÃ©ologique dominant dans la zone choisie"],
      ["Mode de Fondation PrÃ©conisÃ©", modeFondation, hasBasement ? "Cuvelage Ã©tanche requis en sous-sol" : "AdaptÃ© pour Ã©viter les tassements diffÃ©rentiels"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ã‰lÃ©ment de Dimensionnement', 'Prescription DÃ©terminÃ©e', 'Justification Technique de SÃ©curitÃ©']],
      semelleRows,
      {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    // =========================================================================
    // PAGE 3 : RÃ‰SEAUX (SEN'EAU, SENELEC, ONAS) & CLIMAT TROPICAL
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃ© Technique", "Partie III : RÃ©silience Fluides (Sen'Eau, Senelec, ONAS) & Conception Bioclimatique", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    const occupantsEstimes = totalLevelsCount * (usage === 'unifamilial' ? 8 : (usage === 'locatif' ? 14 : 20));
    const consoJournaliereLitres = occupantsEstimes * 150;
    const bacheLitres = Math.round(consoJournaliereLitres * 2.5);
    const surpresseurPuissance = totalLevelsCount >= 3 ? "Surpresseur double pompe 1,5 kW" : "Groupe de surpression compact 0,75 kW";
    const kvaEstimes = Math.max(6, Math.round((sdpTotale * 35) / 1000));
    const sectionCable = kvaEstimes > 18 ? "CÃ¢ble cuivre 4Ã—25 mmÂ² ArmÃ©" : (kvaEstimes > 10 ? "CÃ¢ble cuivre 4Ã—16 mmÂ²" : "CÃ¢ble cuivre 2Ã—10 mmÂ²");

    let assainissementDesc = "Raccordement rÃ©seau tout-Ã -l'Ã©gout ONAS obligatoire avec boÃ®te de branchement siphoÃ¯de.";
    if (sanitation === 'autonome') {
      assainissementDesc = `Fosse septique toutes eaux (${Math.max(4, Math.round(occupantsEstimes * 0.4))} mÂ³) + Puits perdu filtrant selon NS 17-074.`;
    }

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. RÃ‰SERVE HYDRAULIQUE (SEN'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT (NS 17-074)");

    const fluidesRows = [
      ["BÃ¢che Ã  Eau & Autonomie Coupure", `${formatNum(bacheLitres)} Litres (env. ${fr1(bacheLitres / 1000)} mÂ³)`, "RÃ©serve tampon 48h Ã  72h avec cuve enterrÃ©e bÃ©ton Ã©tanche + surpresseur"],
      ["SystÃ¨me de Pompage RecommandÃ©", surpresseurPuissance, "Alimentation continue des Ã©tages sans perte de pression au robinet"],
      ["Puissance Souscrite Senelec Cible", `${kvaEstimes} kVA (${kvaEstimes > 9 ? 'TriphasÃ© 380V' : 'MonophasÃ© 220V'})`, "Dimensionnement standard pour climatisation inverter et Ã©quipements"],
      ["Section Colonne Montante Ã‰lectrique", sectionCable, "Chute de tension < 3% entre coffret compteur et tableau gÃ©nÃ©ral"],
      ["RÃ©seau d'Assainissement & Rejets", sanitation === 'autonome' ? "Assainissement Autonome" : "RÃ©seau Public ONAS", assainissementDesc]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste Fluide & Ã‰nergie', 'Dimensionnement CalculÃ©', 'Norme & Prescription Technique']],
      fluidesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 37, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 85 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. CONCEPTION BIOCLIMATIQUE SAHÃ‰LIENNE & VENTILATION NATURELLE");

    const bioclimRows = [
      ["Orientation Solaire des Baies", "FaÃ§ades Nord & Sud Ã  privilÃ©gier", "Minimiser les ouvertures sur les faÃ§ades Est et Ouest (rayonnement direct)"],
      ["Protections Solaires Passives", "Casquettes bÃ©ton (dÃ©bord min 60 cm) & Brise-soleil", "Ombrage permanent des vitrages pour rÃ©duire l'apport thermique estival"],
      ["Ventilation Naturelle Traversante", "Ouvrants opposÃ©s & cours d'aÃ©ration intÃ©rieures", "Ã‰vacuation de l'air chaud par tirage thermique naturel nocturne"],
      ["Inertie Thermique de l'Enveloppe", "Double cloison ou agglos pleins avec enduit Ã©pais", "DÃ©phasage thermique d'au moins 6 heures pour l'abaissement des pics de chaleur"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Axe de Conception Bioclimatique', 'Solution Technique Retenue', 'Impact Confort & Facture Ã‰nergÃ©tique']],
      bioclimRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : BUDGET PRÃ‰VISIONNEL & FEUILLE DE ROUTE ADMINISTRATIVE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃ© Technique", "Partie IV : Ã‰valuation BudgÃ©taire PrÃ©visionnelle & DÃ©marches TELEDAC", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    const RATIOS_2026 = {
      eco: { terrassement: 18000, grosOeuvre: 110000, secondOeuvre: 85000, etancheite: 15000 },
      moyen: { terrassement: 22000, grosOeuvre: 135000, secondOeuvre: 115000, etancheite: 20000 },
      haut: { terrassement: 28000, grosOeuvre: 165000, secondOeuvre: 165000, etancheite: 28000 }
    }[standing] || { terrassement: 22000, grosOeuvre: 135000, secondOeuvre: 115000, etancheite: 20000 };

    const pTerrassement = Math.round(sdpTotale * RATIOS_2026.terrassement);
    const pGrosOeuvre = Math.round(sdpTotale * RATIOS_2026.grosOeuvre);
    const pSecondOeuvre = Math.round(sdpTotale * RATIOS_2026.secondOeuvre);
    const pEtancheite = Math.round(sdpTotale * RATIOS_2026.etancheite);
    const pIncendie = (parseFloat(hauteurFaitage) > 28) ? Math.round(sdpTotale * 12000) : 0;

    const tauxAleas = 0.07;
    const pAleas = Math.round((pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite + pIncendie) * tauxAleas);
    const pTotal = pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite + pIncendie + pAleas;

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. Ã‰VALUATION FINANCIÃˆRE PRÃ‰VISIONNELLE MACRO-LOTS TCE (VALEURS 2026)");

    const budgetTceRows = [
      ["1. Terrassements, Fouilles & Fondations", formatFCFA(pTerrassement), `Ratio : ${RATIOS_2026.terrassement} FCFA/mÂ² â€” ${sdpTotale} mÂ²`],
      ["2. Superstructure BÃ©ton ArmÃ© BAEL 91", formatFCFA(pGrosOeuvre), `Ratio : ${RATIOS_2026.grosOeuvre} FCFA/mÂ² â€” ${sdpTotale} mÂ²`],
      ["3. Second Å“uvre, Fluides & Ã‰lectricitÃ©", formatFCFA(pSecondOeuvre), `Ratio : ${RATIOS_2026.secondOeuvre} FCFA/mÂ² â€” ${sdpTotale} mÂ²`],
      ["4. Ã‰tanchÃ©itÃ© Toiture Terrasse & Cuvelage", formatFCFA(pEtancheite), `Ratio : ${RATIOS_2026.etancheite} FCFA/mÂ² â€” ${sdpTotale} mÂ²`],
    ];
    if (pIncendie > 0) budgetTceRows.push(["5. Ã‰quipements SÃ©curitÃ© Incendie (Provision)", formatFCFA(pIncendie), "Provision obligatoire IGH/4e famille â€” Ã  valider BET."]);
    budgetTceRows.push([`Provision AlÃ©as & MarchÃ© (${formatPercent(tauxAleas)})`, formatFCFA(pAleas), `${formatPercent(tauxAleas)} â€” sous-total lots. Formule tracÃ©e.`]);
    budgetTceRows.push(["ENVELOPPE GLOBALE ESTIMATIVE DU PROJET", formatFCFA(pTotal), `Ratio moyen : env. ${formatFCFA(Math.round(pTotal / sdpTotale))} / mÂ² de plancher`]);

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Macro-Lot Technique TCE', 'Montant PrÃ©visionnel', 'Prestations & MatÃ©riaux NormalisÃ©s Inclus']],
      budgetTceRows,
      {
        0: { cellWidth: 62, fontStyle: 'bold' },
        1: { cellWidth: 36, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 72 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. FEUILLE DE ROUTE ADMINISTRATIVE : INSTRUCTION DU PERMIS DE CONSTRUIRE (TELEDAC)");

    const etapesTeledac = [
      ["1. Bornage Contradictoire", "GÃ©omÃ¨tre-Expert AgrÃ©Ã© (OGES)", "Plan de bornage rÃ©gulier et scellement des bornes physiques."],
      ["2. Plans Architecturaux VisÃ©s", "Architecte inscrit Ã  l'ODAS", "Recours Ã  l'architecte obligatoire pour la construction ou la modification de bÃ¢timents (art. R.407, dÃ©cret nÂ° 2025-1194)."],
      ["3. Note de Calcul de StabilitÃ©", "Bureau d'Ã‰tudes Techniques (BET)", "Justification des sections de bÃ©ton et armatures selon BAEL 91 R99."],
      ["4. DÃ©pÃ´t Plateforme TELEDAC", "Direction de l'Urbanisme / Mairie", "Instruction administrative prÃ©alable â€” arrÃªtÃ© signÃ© obligatoire avant ouverture de chantier (dÃ©lai estimÃ© selon commune)."],
      ["5. Contrat & Clauses COCC", "Entreprise GÃ©nÃ©rale / TÃ¢cheron", "Imposer le contrat type avec retenue de garantie 5% et respect des 6 points d'arrÃªt."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ã‰tape Administrative', 'Professionnel CompÃ©tent', 'Cadre RÃ©glementaire (Loi 2023-20 & DÃ©cret 2025-1194)']],
      etapesTeledac,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 46 },
        2: { cellWidth: 76 }
      }
    ));

    // Bloc de visa technique â€” fond rouge, texte blanc (contraste â‰¥ 4,5:1)
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.5;
    // Couleur fond : rouge profond #C0392B (R=192, G=57, B=43)
    doc.setFillColor(192, 57, 43);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 22, 'F');
    doc.setDrawColor(150, 30, 20);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 22, 'D');

    // Titre : texte blanc gras
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("VISA TECHNIQUE DU BUREAU D'Ã‰TUDES INDÃ‰PENDANT CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    // Corps du disclaimer : texte blanc normal
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'Ã©tudes agrÃ©Ã©. Les valeurs rÃ©glementaires (COS max, capacitÃ© portante, ratios) doivent Ãªtre confirmÃ©es par des professionnels qualifiÃ©s avant tout engagement financier ou dÃ©pÃ´t de permis.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerLines, MARGIN_LEFT + 4, currentY + 11);
    doc.text(`Rapport Ã©mis Ã  Dakar le ${currentDate} pour le compte exclusif de ${clientName}. RÃ©f: ${refDoc}`, MARGIN_LEFT + 4, currentY + 19);
  }

  // =========================================================================
  // 2. LIVRABLE : BORDEREAU QUANTITATIF ESTIMATIF (BQE) GROS Å“UVRE EXPRESS (4 PAGES)
  // =========================================================================
  function renderExpress(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃ®tre d\'Ouvrage').trim();
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
    const lotNumber = data.lot_number || 'Non spÃ©cifiÃ©';

    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const enrobageCm = isMarine ? 4.5 : 3.0;
    const enrobageCmStr = isMarine ? "4,5" : "3,0";

    // Formatters locaux pour virgules dÃ©cimales franÃ§aises
    const fr1 = v => (typeof v === 'number' ? v.toFixed(1) : parseFloat(v).toFixed(1)).replace('.', ',');
    const fr2 = v => (typeof v === 'number' ? v.toFixed(2) : parseFloat(v).toFixed(2)).replace('.', ',');
    const frQ = v => (v === undefined || v === null ? '' : v.toString().replace('.', ','));

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

    // Ciment dÃ©composÃ© bÃ©ton + mortiers
    const DOSAGE_BETON_KG_M3 = 350;
    const sacsCimentBeton = Math.round(vTotalBeton * DOSAGE_BETON_KG_M3 / 50);
    const sMursEstimee = Math.round(surface * 2.8);
    const sacsCimentMortiers = Math.round(sMursEstimee * 20 / 50);
    const totalSacsCiment = sacsCimentBeton + sacsCimentMortiers;
    const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);

    // RelevÃ©s de prix de marchÃ© Dakar 2026 (indicatifs, non officiels)
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

    // DÃ©coupage par phase
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
    // PAGE 1 : CUBATURES & SYNTHÃˆSE DES RATIOS
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Å“uvre", "Partie I : MÃ©trÃ© Volumique BÃ©ton & Besoins en MatÃ©riaux Structurels (BAEL 91 R99)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÃˆTRES DE DIMENSIONNEMENT DU BÃ‚TIMENT & LOCALISATION", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃ®tre d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`TÃ©lÃ©phone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface DÃ©veloppÃ©e (SDP) : env. ${surface} mÂ²`, MARGIN_LEFT + 4, 75);
    doc.text(`Ã‰lÃ©vation : R+${levels} (${totalLevelsCount} niveaux)`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Type Plancher : ${slabType === 'dalle_pleine' ? 'Dalle Pleine BA' : 'Corps Creux 16+4'}`, 108, 69);
    doc.text(`Milieu d'Exposition : ${isMarine ? 'Marin Agressif (Cales 4,5 cm)' : 'Standard (Cales 3,0 cm)'}`, 108, 75);
    doc.text(`Nature du Sol : ${soilType === 'rocheux' ? 'Rocheux compact' : (soilType === 'sable' ? 'Sable dunaire' : 'Normal / LatÃ©ritique')}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. SYNTHÃˆSE DES RATIOS D'INGÃ‰NIERIE & CUBATURES PRINCIPALES (BAEL 91 R99)");

    const ratioAcierDetail = isMarine
      ? `Ratio effectif : ${ratioAcierM3} kg/mÂ³ de bÃ©ton (base ${ratioAcierM3 - 5} kg + 5 kg/mÂ³ zone marine inclus)`
      : `Ratio : ${ratioAcierM3} kg/mÂ³ de bÃ©ton armÃ© structural`;

    const syntheseRows = [
      ["BÃ©ton ArmÃ© Structurel (fc28 >= 25 MPa)", `${fr1(vTotalBeton)} mÂ³`, `Ratio : ${fr2(vTotalBeton / surface)} mÂ³/mÂ². Fondations + poteaux + poutres + dalles.`],
      ["Aciers Haute AdhÃ©rence FeE500", `${fr2(tonnageAcierTotal)} Tonnes (${formatNum(kgAcierTotal)} kg)`, ratioAcierDetail],
      ["Ciment CEM II 42.5R (SOCOCIM / Dangote)", `${formatNum(totalSacsCiment)} Sacs (env. ${fr1(tonnesCiment)} T)`, `BÃ©ton (${formatNum(sacsCimentBeton)} sacs) + Mortiers (${formatNum(sacsCimentMortiers)} sacs)`],
      ["Gravier Basalte ConcassÃ© (CarriÃ¨res Diack)", `${formatNum(volGravierBasalte)} mÂ³`, `Formule : ${fr1(vTotalBeton)} mÂ³ bÃ©ton â€” 0,80. Basalte Diack recommandÃ©.`],
      ["Sable Dunaire LavÃ© Propre (Kayar / Diender)", `${formatNum(volSableKayar)} mÂ³`, `Formule : ${fr1(vTotalBeton)} mÂ³ bÃ©ton â€” 0,45. Sable propre sans sel.`],
      ["Agglos VibrÃ©s NormalisÃ©s (15 & 20)", `${formatNum(nbAgglos15 + nbAgglos20)} UnitÃ©s`, `Agglos 15 (${formatNum(nbAgglos15)}) + Agglos 20 (${formatNum(nbAgglos20)}) â€” 12,5 U/mÂ²`],
      ["Plancher Hourdis Entrevous BÃ©ton", slabType === 'dalle_pleine' ? "Dalle Pleine BA" : `${formatNum(nbHourdis)} Hourdis`, slabType === 'dalle_pleine' ? "Coffrage intÃ©gral dalle pleine" : `${formatNum(nbHourdis)} U â€” ratio 8,5 U/mÂ² planchers hauts`]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DÃ©signation du MatÃ©riau', 'Quantitatif Global CalculÃ©', 'Prescription & Ratio d\'IngÃ©nierie']],
      syntheseRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. SPÃ‰CIFICATIONS TECHNIQUES DU BÃ‰TON & SÃ‰CURITÃ‰ DES OUVRAGES");

    const securiteRows = [
      ["Classe de RÃ©sistance BÃ©ton", "B25 (fc28 >= 25 MPa)", "RecommandÃ© selon les rÃ¨gles professionnelles pour poteaux, poutres et planchers"],
      ["Dosage usuel recommandÃ©", "350 kg/mÂ³ (CEM II 42.5R)", "7 sacs de 50 kg par mÃ¨tre cube de bÃ©ton mis en Å“uvre"],
      ["Calage d'Enrobage PrÃ©conisÃ©", `${enrobageCmStr} cm avec cales bÃ©ton`, isMarine ? "Milieu marin agressif (BAEL 91 R99, art. A.7.2.4)" : "Milieu non agressif standard (recommandation BAEL 91 R99)"],
      ["Vibration du BÃ©ton Frais", "Aiguille vibrante recommandÃ©e", "DÃ©conseillÃ© : risque de nids de cailloux (serrage manuel au fer Ã  bÃ©ton Ã  proscrire)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant / Phase', 'SpÃ©cification Technique', 'Norme & RÃ¨gle de l\'Art']],
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
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Å“uvre", "Partie II : Calibrage des Aciers FeE500 & Bordereau Estimatif Fournitures 2026", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. NOMENCLATURE & CALIBRAGE DES ARMATURES HAUTE ADHÃ‰RENCE FeE500");

    const aciersRows = [
      ["Aciers HA 14 & HA 16", `${formatNum(kgHA14_16)} kg (${fr2(kgHA14_16 / 1000)} T)`, "Aciers longitudinaux des semelles de fondation et poteaux du RDC"],
      ["Aciers HA 12", `${formatNum(kgHA12)} kg (${fr2(kgHA12 / 1000)} T)`, "Armatures principales des poutres maÃ®tresses et poteaux des Ã©tages"],
      ["Aciers HA 10", `${formatNum(kgHA10)} kg (${fr2(kgHA10 / 1000)} T)`, "Aciers chapeaux de dalle, poutrelles hourdis et linteaux"],
      ["Aciers HA 8", `${formatNum(kgHA8)} kg (${fr2(kgHA8 / 1000)} T)`, "Armatures de rÃ©partition, chaÃ®nages verticaux et renforts d'angles"],
      ["Aciers HA 6", `${formatNum(kgHA6)} kg (${fr2(kgHA6 / 1000)} T)`, "Cadres, Ã©triers et Ã©pingles anti-flambement des poteaux et poutres"],
      [`Fil de Recuit & Cales (${enrobageCmStr} cm)`, `${formatNum(filRecuitKg)} kg de fil + cales`, `Enrobage ${enrobageCmStr} cm ${isMarine ? '(zone cÃ´tiÃ¨re/saline)' : '(milieu standard)'}`],
      ["TOTAL ACIERS HAUTE ADHÃ‰RENCE FeE500", `${formatNum(kgAcierTotal)} kg (env. ${fr2(tonnageAcierTotal)} T)`, "Fers certifiÃ©s SOCOCIM / Senbus / Someta Ã  haute limite Ã©lastique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DiamÃ¨tre Commercial & Type d\'Armature', 'Poids Requis', 'Destination Structurelle']],
      aciersRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. BORDEREAU ESTIMATIF FOURNITURES MATÃ‰RIAUX (RELEVÃ‰S DE PRIX DE MARCHÃ‰ â€” DAKAR 2026, INDICATIFS, NON OFFICIELS)");

    const bordereauRows = [
      ["Aciers FeE500 (Barres de 12 m)", `${fr2(tonnageAcierTotal)} Tonnes`, `${formatFCFA(PRIX_ACIER_TONNE)} / T`, formatFCFA(totalAcierF), "Aciers certifiÃ©s sans rouille feuilletÃ©e"],
      ["Ciment CEM II 42.5R (Sacs 50 kg)", `${formatNum(totalSacsCiment)} Sacs`, `${formatFCFA(PRIX_CIMENT_SAC)} / Sac`, formatFCFA(totalCimentF), "SOCOCIM / Dangote / Sahel"],
      ["Gravier Basalte Diack (8/16 & 16/25)", `${formatNum(volGravierBasalte)} mÂ³`, `${formatFCFA(PRIX_GRAVIER_M3)} / mÂ³`, formatFCFA(totalGravierF), "Basalte concassÃ© haute compacitÃ©"],
      ["Sable Dunaire LavÃ© (Kayar / Diender)", `${formatNum(volSableKayar)} mÂ³`, `${formatFCFA(PRIX_SABLE_M3)} / mÂ³`, formatFCFA(totalSableF), "Sable propre sans vase ni sel"],
      ["Agglos Creux VibrÃ©s de 15", `${formatNum(nbAgglos15)} U`, `${PRIX_AGGLO_15} FCFA / U`, formatFCFA(nbAgglos15 * PRIX_AGGLO_15), "Ã‰lÃ©vations murs extÃ©rieurs et refends"],
      ["Agglos Pleins VibrÃ©s de 20", `${formatNum(nbAgglos20)} U`, `${PRIX_AGGLO_20} FCFA / U`, formatFCFA(nbAgglos20 * PRIX_AGGLO_20), "Murs de soubassement sous longrines"]
    ];
    if (nbHourdis > 0) {
      bordereauRows.push(["Entrevous Hourdis BÃ©ton 16 cm", `${formatNum(nbHourdis)} U`, `${PRIX_HOURDIS} FCFA / U`, formatFCFA(totalHourdisF), "Hourdis normalisÃ©s pour planchers hauts"]);
    }
    bordereauRows.push(["TOTAL ESTIMATIF FOURNITURES MATÃ‰RIAUX", "-", "-", formatFCFA(totalFournituresTTC), "Total indicatif matÃ©riaux rendus chantier"]);

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DÃ©signation MatÃ©riau', 'QuantitÃ©', 'Prix Unitaire', 'Montant Total HT', 'Observations']],
      bordereauRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 42 }
      }
    ));

    // Note d'encadrÃ© sur les relevÃ©s de prix & tendance conjoncturelle
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.0;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, 23, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, 23, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("NOTE SUR LES RELEVÃ‰S DE PRIX & TENDANCE CONJONCTURELLE :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(51, 65, 85);
    const notePrixLines = doc.splitTextToSize(
      "â€¢ Ciment type 32.5 : prix plafonnÃ© Ã  3 550 FCFA le sac de 50 kg Ã  Dakar (arrÃªtÃ© nÂ° 09852 du 24 juin 2024). Le CEM II 42.5 n'est pas couvert par cet arrÃªtÃ© : le prix indiquÃ© ci-dessus est un relevÃ© de marchÃ©.\nâ€¢ Indice ANSD des coÃ»ts des BTP (IBTP), T2 2026 : +1,0 % sur le trimestre (bÃ¢timents +1,4 %).",
      USABLE_WIDTH - 8
    );
    doc.text(notePrixLines, MARGIN_LEFT + 4, currentY + 10.5);

    // =========================================================================
    // PAGE 3 : PLANNING D'APPROVISIONNEMENT & CONTRÃ”LE CHANTIER
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Å“uvre", "Partie III : Planning d'Approvisionnement par Phase & Recettes de BÃ©tonnage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. PLANNING D'APPROVISIONNEMENT PAR PHASE (ANTI-VOL & ANTI-GASPILLAGE)");

    const planningRows = [
      ["Phase 1 : Fouilles, Fondations & Soubassement", `${formatNum(phase1Ciment)} Sacs`, `${fr2(phase1Acier)} T (HA16, HA14, HA12)`, `${formatNum(p1Gravier)} mÂ³`, `${formatNum(nbAgglos20)} agglos pleins de 20 + sable`],
      ["Phase 2 : Poteaux RDC & Plancher Haut", `${formatNum(phase2Ciment)} Sacs`, `${fr2(phase2Acier)} T (HA14, HA12, HA8)`, `${formatNum(p2Gravier)} mÂ³`, `${formatNum(h50a)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15`],
      [`Phase 3 : Ã‰lÃ©vations & Planchers Ã‰tages (R+${levels})`, `${formatNum(phase3Ciment)} Sacs`, `${fr2(phase3Acier)} T (HA12, HA10, HA8)`, `${formatNum(p3Gravier)} mÂ³`, `${formatNum(h50b)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.4))} agglos 15`],
      ["Phase 4 : Toiture Terrasse, AcrotÃ¨res & Enduits", `${formatNum(phase4Ciment)} Sacs`, `${fr2(phase4Acier)} T (HA10, HA8, HA6)`, `${formatNum(p4Gravier)} mÂ³`, `${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15 + sable enduits`]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ã‰tape des Travaux', 'Quota Ciment 42.5R', 'Quota Aciers FeE500', 'Quota Gravier Diack', 'MatÃ©riaux ComplÃ©mentaires']],
      planningRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 48 }
      }
    ));

    // ContrÃ´le technique bloquant de concordance des phases
    const checkCimentPhases = phase1Ciment + phase2Ciment + phase3Ciment + phase4Ciment;
    const checksPhases = (checkCimentPhases === totalSacsCiment);
    if (!checksPhases) throw new Error("IncohÃ©rence somme approvisionnement ciment");

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. CONTRÃ”LE DES RATIOS DE BÃ‰TONNAGE & RECETTES CHANTIER (DOSAGE 350 KG)");

    const recettesRows = [
      ["Composition par GÃ¢chÃ©e (1 Sac de Ciment)", "1 sac ciment (50 kg) + 1 brouette sable (env. 40 L) + 2 brouettes gravier (env. 80 L) + 22 Ã  25 L d'eau propre", "Interdire formellement l'excÃ¨s d'eau pour faciliter la mise en Å“uvre (chute drastique de rÃ©sistance)."],
      ["ContrÃ´le d'Affaissement au CÃ´ne d'Abrams", "Affaissement prescrit : 6 Ã  9 cm (BÃ©ton plastique Ã  trÃ¨s maniable)", "Mesure systÃ©matique Ã  l'arrivÃ©e de chaque toupie ou premiÃ¨re gÃ¢chÃ©e de la journÃ©e."],
      ["Surveillance des Armatures avant Coulage", "VÃ©rification des cales d'enrobage, ligature croisÃ©e et recouvrement minimal (50 diamÃ¨tres)", "Point d'arrÃªt obligatoire : coulage strictement interdit sans visa de ferraillage."],
      ["Cure du BÃ©ton Jeune sous Climat SahÃ©lien", "Arrosage abondant 2 fois par jour pendant 7 jours minimum ou produit de cure agrÃ©Ã©", "Ã‰vite la dessiccation prÃ©maturÃ©e et les fissures de retrait plastique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['ParamÃ¨tre de BÃ©tonnage', 'Exigence ChantierSur', 'ConsÃ©quence en Cas de Non-Respect']],
      recettesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : RÃ‰CAPITULATIF BUDGÃ‰TAIRE & CLAUSES DE DÃ‰COFFRAGE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Å“uvre", "Partie IV : SynthÃ¨se BudgÃ©taire Gros Å“uvre & Clauses de SÃ©curitÃ© au DÃ©coffrage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    const moRatioM2 = levels >= 4 ? 38000 : (levels >= 2 ? 34000 : 28000);
    const totalMainOeuvre = Math.round(surface * moRatioM2);
    const totalGrosOeuvreHT = totalFournituresTTC + totalMainOeuvre;

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÃ‰CAPITULATIF BUDGÃ‰TAIRE GROS Å“UVRE & CLÃ‰S DE PAIEMENT CONTRAT COCC");

    const recapRows = [
      ["Fournitures MatÃ©riaux de Base", formatFCFA(totalFournituresTTC), `${Math.round((totalFournituresTTC / totalGrosOeuvreHT) * 100)} %`, "Approvisionnements Ã©chelonnÃ©s selon les 4 phases"],
      ["Main d'Å“uvre TÃ¢cheron / Entreprise", formatFCFA(totalMainOeuvre), `${Math.round((totalMainOeuvre / totalGrosOeuvreHT) * 100)} %`, "Paiement liÃ© exclusivement Ã  la validation des 6 points d'arrÃªt"],
      ["BUDGET TOTAL GROS Å“UVRE ESTIMATIF", formatFCFA(totalGrosOeuvreHT), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalGrosOeuvreHT / surface))} / mÂ² SDP`],
      ["Retenue de garantie contractuelle (5 %)", formatFCFA(Math.round(totalGrosOeuvreHT * 0.05)), "5 %", "Clause convenue entre les parties, consignÃ©e jusqu'Ã  la rÃ©ception dÃ©finitive. En droit sÃ©nÃ©galais, la rÃ¨gle des 5 % n'existe que pour les marchÃ©s publics (dÃ©cret nÂ° 2022-2295, art. 118-119) ; pour un chantier privÃ©, elle rÃ©sulte du contrat, pas de la loi."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste de DÃ©pense', 'Montant Estimatif', 'Quote-Part', 'Condition de DÃ©blocage']],
      recapRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 68 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. DÃ‰LAIS DE DÃ‰COFFRAGE RECOMMANDÃ‰S (RÃˆGLES PROFESSIONNELLES BAEL 91 R99)");

    const clausesRows = [
      ["Joues de Poutres & Faces de Poteaux", SEUILS_TECHNIQUES.decoffrageJoues, "DÃ©coffrage possible sans mise en charge. Arrosage immÃ©diat pour cure."],
      ["Sous-faces de Poutres & Dalles", SEUILS_TECHNIQUES.decoffrageSousFaces, "DÃ©coffrage dÃ©conseillÃ© avant 21 jours sans note de calcul de rÃ©sistance."],
      ["Ã‰tais de SÃ©curitÃ© sous Poutres MaÃ®tresses", "Maintien 28 jours", "Conserver 1 Ã©tai de soulagement sur deux jusqu'Ã  rÃ©sistance nominale fc28."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ã‰lÃ©ment Porteur', 'DÃ©lai Minimal PrÃ©conisÃ©', 'Conditions & PrÃ©cautions']],
      clausesRows,
      {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 90 }
      }
    ));

    // EncadrÃ© Â« RÃ‰FÃ‰RENCES Â» (Style ESQUISSE, articles propres Ã  EXPRESS)
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.0;
    const refBoxHeight = 30;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, refBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, refBoxHeight, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("RÃ‰FÃ‰RENCES RÃ‰GLEMENTAIRES, NORMATIVES & SOURCES VÃ‰RIFIÃ‰ES :", MARGIN_LEFT + 4, currentY + 5.2);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(51, 65, 85);
    const refSources = [
      "â€¢ ArrÃªtÃ© nÂ° 09852 du 24 juin 2024 (prix du ciment type 32.5) ;",
      "â€¢ DÃ©cret nÂ° 2022-2295, art. 118-119 (retenue de garantie â€” marchÃ©s publics uniquement) ;",
      "â€¢ ANSD, Indice des coÃ»ts des BTP (IBTP), T2 2026 ;",
      "â€¢ BAEL 91 R99 (rÃ¨gles professionnelles, rÃ©fÃ©rence technique) ;",
      "â€¢ NF P 06-001 (charges d'exploitation â€” norme d'usage courant)."
    ];
    let refY = currentY + 9.8;
    for (const source of refSources) {
      doc.text(source, MARGIN_LEFT + 4, refY);
      refY += 3.9;
    }

    // Bandeau VISA technique â€” fond rouge #BF382B, texte blanc #FFFFFF, pleine largeur
    currentY = currentY + refBoxHeight + TABLE_GAP_MM;
    const visaHeight = 22;
    doc.setFillColor(191, 56, 43); // #BF382B
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, visaHeight, 'F');
    doc.setDrawColor(150, 30, 20);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, visaHeight, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("VISA TECHNIQUE DU BUREAU D'Ã‰TUDES INDÃ‰PENDANT CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide Ã  la dÃ©cision gÃ©nÃ©rÃ© automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'Ã©tudes agrÃ©Ã©. Les quantitatifs, sections d'acier et ratios doivent Ãªtre confirmÃ©s par des professionnels qualifiÃ©s avant tout engagement financier ou commande de matÃ©riaux.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerLines, MARGIN_LEFT + 4, currentY + 11);
    doc.text(`Rapport Ã©mis Ã  Dakar le ${currentDate} pour le compte exclusif de ${clientName}. RÃ©f: ${refDoc}`, MARGIN_LEFT + 4, currentY + 19);
  }

  // =========================================================================
  // 3. LIVRABLE : CONTRE-EXPERTISE & AUDIT DEVIS BTP (4 PAGES)
  // =========================================================================
  function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃ®tre d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = ${rawPrefix} ;
    const surface = parseFloat(data.surface) || 250;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const buildingUsage = data.building_usage || 'unifamilial';

    // 1. Process Devis Lines
    const lines = data.devis_lines || [];
    let totalDevisTTC = 0;
    
    // Macro-lots structure
    const macroLots = {
      'Gros Å“uvre & structure': { total: 0, keywords: ['terrassement', 'fondation', 'bÃ©ton', 'bÃ©t', 'maÃ§onnerie', 'dalle', 'poteau', 'poutre', 'enduit', 'chape', 'fouille'] },
      'Ã‰tanchÃ©itÃ© & toiture': { total: 0, keywords: ['Ã©tanch', 'etanch', 'toiture', 'acrotÃ¨re', 'acrotere'] },
      'Second Å“uvre & finitions': { total: 0, keywords: ['menuiserie', 'porte', 'fenÃªtre', 'fenetre', 'garde-corps', 'carrelage', 'faÃ¯ence', 'faience', 'peinture', 'plomberie', 'sanitaire', 'Ã©lectricitÃ©', 'electricite', 'forage'] },
      'Installation & travaux prÃ©paratoires': { total: 0, keywords: ['installation', 'chantier', 'base vie', 'clÃ´ture', 'cloture'] }
    };

    function mapMacroLot(designation, lotName) {
      const text = ${designation || ''} .toLowerCase();
      for (const [mlName, mlData] of Object.entries(macroLots)) {
        if (mlData.keywords.some(kw => text.includes(kw))) {
          return mlName;
        }
      }
      return 'Second Å“uvre & finitions'; // fallback
    }

    // Process each line to calculate Theoretical values
    const processedLines = lines.map(line => {
      const designation = line.designation || 'Ligne non spÃ©cifiÃ©e';
      const qteDevis = parseFloat(line.qty) || 0;
      const puDevis = parseFloat(line.pu) || 0;
      const montantDevis = parseFloat(line.total) || 0;
      totalDevisTTC += montantDevis;
      
      const lotName = line.lot || '';
      const mLot = mapMacroLot(designation, lotName);
      macroLots[mLot].total += montantDevis;

      let qteTheo = "N/A";
      let formule = "-";
      let puRef = "Hors Base";
      let sourceRef = "-";
      let montantTheo = null;
      
      const text = designation.toLowerCase();
      
      // Heuristics for Theoretical Quantities & PU based on Dakar 2026 Mercuriales
      if (text.includes('bÃ©ton') || text.includes('beton')) {
        qteTheo = (surface * (levels + 1) * 0.35).toFixed(1);
        formule = "V = SDP Ã— 0.35 mÂ³/mÂ² (BAEL 91 R99)";
        puRef = "130000 - 160000";
        sourceRef = "ANSD IBTP T2 2026";
        montantTheo = parseFloat(qteTheo) * 145000;
      } else if (text.includes('maÃ§onnerie') || text.includes('agglo') || text.includes('parpaing')) {
        qteTheo = (surface * 2.5 * (levels + 1)).toFixed(1);
        formule = "S = SDP Ã— 2.5 (DTU 20.1)";
        puRef = "7000 - 9000";
        sourceRef = "Mercuriale Dakar 2026";
        montantTheo = parseFloat(qteTheo) * 8000;
      } else if (text.includes('enduit')) {
        qteTheo = (surface * 5 * (levels + 1)).toFixed(1);
        formule = "S â‰ˆ 2 Ã— surf. maÃ§onnerie (DTU 26.2)";
        puRef = "3500 - 5000";
        sourceRef = "Mercuriale Dakar 2026";
        montantTheo = parseFloat(qteTheo) * 4000;
      } else if (text.includes('Ã©tanchÃ©itÃ©') || text.includes('etancheite')) {
        qteTheo = (surface / (levels + 1)).toFixed(1);
        formule = "Emprise toiture estimÃ©e (DTU 43.1)";
        puRef = "15000 - 20000";
        sourceRef = "ANSD IBTP T2 2026";
        montantTheo = parseFloat(qteTheo) * 17500;
      } else if (text.includes('carrelage')) {
        qteTheo = (surface * (levels + 1) * 0.9).toFixed(1);
        formule = "S â‰ˆ SDP Ã— coeff circ.";
        puRef = "12000 - 18000";
        sourceRef = "Mercuriale Dakar 2026";
        montantTheo = parseFloat(qteTheo) * 15000;
      } else if (text.includes('acier') || text.includes('fer')) {
        qteTheo = (surface * (levels + 1) * 0.35 * 90).toFixed(1);
        formule = "Ratio kg/mÂ³ bÃ©ton (Pratique BET)";
        puRef = "750 - 900";
        sourceRef = "Mercuriale Dakar 2026";
        montantTheo = parseFloat(qteTheo) * 800;
      }

      // Calcul des Ã©carts
      let ecartPct = 0;
      let ecartMontant = 0;
      let verdict = "Non vÃ©rifiable en l'Ã©tat";
      
      const diffArith = Math.abs(montantDevis - (qteDevis * puDevis));
      if (diffArith > 1.0) {
        verdict = "Erreur arithmÃ©tique";
      } else if (montantTheo !== null && montantTheo > 0) {
        ecartMontant = montantDevis - montantTheo;
        ecartPct = (ecartMontant / montantTheo) * 100;
        
        if (montantDevis < montantTheo * 0.5) {
          verdict = "Sous-Ã©valuÃ© â€” risque qualitÃ©/abandon";
        } else if (Math.abs(ecartPct) <= 10) {
          verdict = "CohÃ©rent";
        } else if (ecartPct > 10 && ecartPct <= 25) {
          verdict = "Ã€ nÃ©gocier";
        } else if (ecartPct > 25) {
          verdict = "SurcoÃ»t significatif";
        }
      } else if (qteDevis === 0) {
        verdict = "Demander le dÃ©tail du forfait";
      }

      return {
        num: line.num || '-',
        designation: designation,
        u: line.unit || '-',
        qteDevis: qteDevis,
        puDevis: puDevis,
        montantDevis: montantDevis,
        qteTheo: qteTheo,
        formule: formule,
        puRef: puRef,
        sourceRef: sourceRef,
        montantTheo: montantTheo,
        ecart: montantTheo ? (ecartPct > 0 ? '+' : '') + ecartPct.toFixed(1) + '%' : '-',
        verdict: verdict
      };
    });

    const devisAmountTTC = totalDevisTTC;
    const ratioTTC = (surface > 0) ? (devisAmountTTC / surface) : 0;

    // --------------
    // PAGE 1: SYNTHÃˆSE
    // --------------
    addPageBorder(doc);
    addHeader(doc, "RAPPORT D'AUDIT TECHNIQUE & FINANCIER", "VÃ‰RIFICATION DE COHÃ‰RENCE DU DEVIS", refDoc);
    
    doc.setFontSize(10);
    doc.setTextColor(11, 19, 37);
    doc.text(Projet :  | Localisation :  | SDP :  mÂ² | Niveaux : R+, 15, 45);
    doc.text(Client :  | TÃ©lÃ©phone : , 15, 50);

    // Box: RÃ©sultats Globaux
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, 55, 180, 25, 3, 3, 'FD');
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11);
    doc.text("RÃ‰SULTAT GLOBAL DU DEVIS SOUMIS", 20, 65);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(10);
    doc.text(Montant TTC (somme des lignes validÃ©es) : , 20, 72);
    doc.text(Ratio TTC par mÂ² de SDP :  / mÂ², 110, 72);

    // Box: Ventilation par Macro-Lots (from devis directly)
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(15, 85, 180, 50, 3, 3, 'FD');
    doc.setFont('NotoSans', 'bold');
    doc.text("RÃ‰PARTITION PAR MACRO-LOT (Issus du Devis)", 20, 95);
    
    let yPos = 105;
    doc.setFont('NotoSans', 'normal');
    for (const [mlName, mlData] of Object.entries(macroLots)) {
      doc.text(mlName, 20, yPos);
      const val = mlData.total > 0 ? formatFCFA(mlData.total) : "Non renseignÃ©";
      doc.text(val, 140, yPos);
      yPos += 8;
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Note : Ces totaux sont l'agrÃ©gation stricte des lignes du devis que vous avez validÃ©es.", 15, 145);

    // --------------
    // PAGE 2: TABLEAU LIGNE PAR LIGNE (LANDSCAPE)
    // --------------
    doc.addPage('a4', 'landscape');
    addPageBorderLandscape(doc);
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 19, 37);
    doc.text("TABLEAU COMPARATIF LIGNE PAR LIGNE", 15, 25);
    
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Les quantitÃ©s thÃ©oriques sont des estimations indicatives de prÃ©dimensionnement â€” ce n'est pas un mÃ©trÃ©.", 15, 30);
    doc.text("Les fourchettes de prix sont indicatives, issues des mercuriales BTP Dakar 2026, Ã  confirmer par des professionnels qualifiÃ©s.", 15, 34);

    const tableBody = processedLines.map(l => [
      l.num,
      l.designation.substring(0, 35) + (l.designation.length > 35 ? '...' : ''),
      l.u,
      l.qteDevis,
      formatFCFA(l.puDevis),
      formatFCFA(l.montantDevis),
      l.qteTheo,
      l.formule,
      l.puRef,
      l.sourceRef,
      l.montantTheo ? formatFCFA(l.montantTheo) : '-',
      l.ecart,
      l.verdict
    ]);

    doc.autoTable({
      startY: 40,
      head: [['NÂ°', 'DÃ©signation (devis)', 'U', 'QtÃ© Devis', 'PU Devis', 'Montant Devis', 'QtÃ© ThÃ©o.', 'Formule / Norme', 'PU RÃ©f.', 'Source', 'Montant ThÃ©o.', 'Ã‰cart', 'Verdict']],
      body: tableBody,
      theme: 'grid',
      styles: { font: 'NotoSans', fontSize: 7, cellPadding: 1, textColor: [30, 30, 30] },
      headStyles: { fillColor: [11, 19, 37], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        1: { cellWidth: 35 },
        7: { cellWidth: 25 },
        8: { cellWidth: 20 },
        12: { cellWidth: 25, fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 12) {
          const v = data.cell.raw;
          if (v.includes('SurcoÃ»t') || v.includes('Erreur')) {
            data.cell.styles.textColor = [220, 38, 38]; // Red
          } else if (v.includes('Sous-Ã©valuÃ©')) {
            data.cell.styles.textColor = [234, 88, 12]; // Orange
          } else if (v.includes('CohÃ©rent')) {
            data.cell.styles.textColor = [5, 150, 105]; // Green
          }
        }
      }
    });

    // --------------
    // PAGE 3: RECOMMANDATIONS JURIDIQUES ET Ã‰CHÃ‰ANCIER
    // --------------
    doc.addPage('a4', 'portrait');
    addPageBorder(doc);
    addHeader(doc, "CLAUSES CONTRACTUELLES & CONDITIONS DE PAIEMENT", "RECOMMANDATIONS JURIDIQUES", refDoc);

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 19, 37);
    doc.text("Ã‰CHÃ‰ANCIER DE PAIEMENT NORMALISÃ‰ (TOTAL = 100%)", 15, 45);
    
    doc.autoTable({
      startY: 50,
      head: [['Tranche', 'Phase d\'avancement', '%']],
      body: [
        ['Acompte', 'DÃ©marrage (Installation de chantier)', '15%'],
        ['Tranche 1', 'AchÃ¨vement des fondations et dalle RDC', '25%'],
        ['Tranche 2', 'AchÃ¨vement du gros Å“uvre / mise hors d\'eau', '25%'],
        ['Tranche 3', 'AchÃ¨vement du second Å“uvre', '20%'],
        ['Tranche 4', 'RÃ©ception provisoire (remise des clÃ©s)', '10%'],
        ['Retenue', 'Retenue de garantie contractuelle (5 %)', '5%']
      ],
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80], textColor: 255 },
      styles: { font: 'NotoSans', fontSize: 10 }
    });

    // Alert Acompte if needed
    const acompteDemande = parseFloat(data.devis_acompte) || 0;
    if (acompteDemande > 20) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(252, 165, 165);
      const finalY = doc.lastAutoTable.finalY + 5;
      doc.roundedRect(15, finalY, 180, 15, 2, 2, 'FD');
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(9);
      doc.text(ATTENTION : L'acompte demandÃ© de % dÃ©passe la limite recommandÃ©e (15-20%)., 20, finalY + 8);
    }

    const startYClauses = doc.lastAutoTable.finalY + 25;
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 19, 37);
    doc.text("LES 5 CLAUSES CONTRACTUELLES RECOMMANDÃ‰ES (Ã  faire valider par un juriste avant signature)", 15, startYClauses);

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const clauses = [
      "1. ConformitÃ© : Les travaux doivent respecter les normes (BAEL 91 R99, DTU 20.1, NF C 15-100) sous peine de reprise aux frais de l'entrepreneur.",
      "2. Prix ferme et dÃ©finitif : Le devis est forfaitaire (Art. L.88 Code de la construction). Aucun supplÃ©ment non approuvÃ© par avenant Ã©crit ne sera payÃ©.",
      "3. PÃ©nalitÃ©s de retard : FixÃ©es Ã  25 000 FCFA par jour de retard, exigibles aprÃ¨s mise en demeure (Art. 153/154 du COCC).",
      "4. SÃ©curitÃ© : L'entrepreneur est seul responsable de la sÃ©curitÃ© sur le chantier (DÃ©cret 2022-2295 art. 118-119).",
      "5. Garanties : Retenue de garantie contractuelle de 5% libÃ©rÃ©e Ã  la levÃ©e des rÃ©serves (si elle est convenue entre les parties)."
    ];

    let cY = startYClauses + 10;
    clauses.forEach(c => {
      const lines = doc.splitTextToSize(c, 180);
      doc.text(lines, 15, cY);
      cY += (lines.length * 5) + 3;
    });

    // VISA
    doc.setDrawColor(11, 19, 37);
    doc.setLineWidth(1);
    doc.line(15, 260, 195, 260);
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(9);
    doc.text("VISA TECHNIQUE DU BUREAU D'Ã‰TUDES INDÃ‰PENDANT CHANTIERSUR.COM :", 15, 270);
    doc.setFont('NotoSans', 'normal');
    doc.text("Ce document est un audit de cohÃ©rence indicatif. Il ne constitue ni une certification lÃ©gale ni un arbitrage.", 15, 275);
    doc.text(GÃ©nÃ©rÃ© le  | RÃ©f: , 15, 280);
  }
  function renderFinitions(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃ®tre d\'Ouvrage').trim();
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
    const lotNumber = data.lot_number || 'Non spÃ©cifiÃ©';
    const delaiReserves = parseInt(data.delai_reserves, 10) || 15;

    // Ratios second Å“uvre 2026
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
    if (checkSommeCarrelage !== totalLotCarrelageF) throw new Error("IncohÃ©rence somme carrelage");

    const totalEtancheiteF = Math.round(sToitureTerrasse * prixEtancheiteM2);
    const nbSallesEau = Math.max(2, Math.round(surface / 65));
    const totalEtancheiteHumideF = nbSallesEau * 120000;

    // Plomberie EU/EP dÃ©composÃ©e
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

    // Ã‰lectricitÃ© NF C 15-100 (0,55 pt/mÂ²)
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

    // Menuiseries dÃ©composÃ©es
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

    // Peinture dÃ©composÃ©e
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
    // PAGE 1 : CARRELAGE & Ã‰TANCHÃ‰ITÃ‰ TOITURE
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Å“uvre", "Partie I : RevÃªtements de Sol, FaÃ¯ences Murales & Ã‰tanchÃ©itÃ© Toiture", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÃˆTRES DES FINITIONS & SPÃ‰CIFICATIONS DU STANDING", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃ®tre d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`TÃ©lÃ©phone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface DÃ©veloppÃ©e : env. ${surface} mÂ²`, MARGIN_LEFT + 4, 75);
    doc.text(`Standing Choisi : ${standing.toUpperCase()}`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`RevÃªtement Sol : ${tileType.replace(/_/g, ' ').toUpperCase()}`, 108, 69);
    doc.text(`Menuiseries : ${joineryType.replace(/_/g, ' ').toUpperCase()}`, 108, 75);
    doc.text(`DÃ©lai LevÃ©e RÃ©serves : ${delaiReserves} jours calendaires`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. LOT REVÃŠTEMENTS DE SOL & FAÃENCES MURALES (DTU 52.1)");

    const carrelageRows = [
      ["Carrelage Sol SÃ©jour & Chambres", `${sSolCarrelee} mÂ²`, `${formatFCFA(prixCarrelageM2)} / mÂ²`, formatFCFA(totalCarrelageSolF), "GrÃ¨s cÃ©rame Ã©maillÃ© antidÃ©rapant R10"],
      ["FaÃ¯ences Murales Cuisines & Salles d'Eau", `${sMursFaience} mÂ²`, `${formatFCFA(prixFaienceM2)} / mÂ²`, formatFCFA(totalFaienceF), "Carreaux muraux jusqu'Ã  2,10 m de hauteur"],
      ["Mortier-Colle C2TE SpÃ©cial Fortes Chaleurs", `${sacsColleRequis} Sacs (25 kg)`, "4 500 FCFA / Sac", formatFCFA(totalColleF), "Rendement indicatif : 6,5 mÂ² / sac (double encollage)"],
      ["Joint de Carrelage Hydrofuge & Anti-Moisissures", `${sacsJointRequis} Sacs (5 kg)`, "3 500 FCFA / Sac", formatFCFA(totalJointF), "Rendement indicatif : 22 mÂ² / sac (largeur 3 mm)"],
      ["TOTAL FOURNITURES CARRELAGE & FAÃENCE", "-", "-", formatFCFA(totalLotCarrelageF + totalFaienceF), "Fournitures complÃ¨tes avec colles et joints"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DÃ©signation du Poste', 'Surface / QuantitÃ©', 'Fourniture & Pose', 'Montant Estimatif HT', 'Prescription DTU']],
      carrelageRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 44 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. LOT Ã‰TANCHÃ‰ITÃ‰ TOITURE-TERRASSE & PIÃˆCES HUMIDES (DTU 43.1)");

    const etancheiteRows = [
      ["Complexe Toiture Terrasse Accessible", `${sToitureTerrasse} mÂ²`, "Bicouche bitumineux Ã©lastomÃ¨re SBS 4 mm", formatFCFA(totalEtancheiteF), "RelevÃ©s d'Ã©tanchÃ©itÃ© 15 cm + chape de protection"],
      ["Ã‰tanchÃ©itÃ© sous Carrelage Salles d'Eau", `${nbSallesEau} Salles d'eau`, "SystÃ¨me d'Ã‰tanchÃ©itÃ© Liquide (SEL)", formatFCFA(totalEtancheiteHumideF), "Traitement rigoureux des siphons et pieds de cloisons"],
      ["Forme de Pente & Ã‰vacuations Pluviales", `${sToitureTerrasse} mÂ²`, "Pente minimale 1,5% vers gargouilles", "Inclus gros Å“uvre", "Deux moignons d'Ã©vacuation par terrasse au minimum"],
      ["TOTAL ESTIMATIF Ã‰TANCHÃ‰ITÃ‰ OUVRAGES", "-", "-", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), "Protection vitale contre les sinistres d'hivernage"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ouvrage d\'Ã‰tanchÃ©itÃ©', 'Surface TraitÃ©e', 'SystÃ¨me PrÃ©conisÃ©', 'Montant Estimatif HT', 'RÃ¨gle Normative']],
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
    // PAGE 2 : PLOMBERIE EU/EP & Ã‰LECTRICITÃ‰
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Å“uvre", "Partie II : Plomberie Sanitaire (EU/EP) & Ã‰lectricitÃ© Basse Tension (NF C 15-100)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. LOT PLOMBERIE SANITAIRE & Ã‰VACUATIONS EU/EP (DTU 60.1)");

    const plomberieRows = [
      ["Appareils Sanitaires (WC suspendus / Lavabos)", `${qSanitaires} Ensembles`, `${formatFCFA(puSanitaires)} / Ens.`, formatFCFA(montantSanitaires), "Cuvettes cÃ©ramique NF avec mÃ©canisme silencieux"],
      ["Robinetterie & Mitigeurs CÃ©ramiques", `${qMitigeurs} PiÃ¨ces`, `${formatFCFA(puMitigeurs)} / U`, formatFCFA(montantMitigeurs), "Mitigeurs chromÃ©s cartouche cÃ©ramique 35 mm"],
      ["RÃ©seaux Alimentation PER/Multicouche", `${qAlim} Salles de bain`, `${formatFCFA(puAlim)} / Ens.`, formatFCFA(montantAlim), "Tubes sous gaine anti-corrosion sans raccord encastrÃ©"],
      ["Ã‰vacuations Eaux UsÃ©es / Eaux Pluviales (EU/EP)", "Ensemble rÃ©seau", "Forfait calibrÃ©", "Inclus aux postes", "Tubes PVC NF Ã©vacuation de 50, 100 et 110 mm"],
      ["TOTAL ESTIMATIF PLOMBERIE EU/EP", "-", "-", formatFCFA(totalPlomberieF), "Fourniture des Ã©quipements et collecteurs"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ã‰quipement Sanitaire / RÃ©seau', 'Quantitatif', 'Prix Unitaire EstimÃ©', 'Montant Total HT', 'Prescription DTU 60.1']],
      plomberieRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 46 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. LOT Ã‰LECTRICITÃ‰ & COURANTS FAIBLES (NORME NF C 15-100)");

    const electriciteRows = [
      ["Points Ã‰lectriques CalibrÃ©s (0,55 pt/mÂ²)", `${nbPointsElec} Points`, `${formatFCFA(puPointElec)} / Pt`, formatFCFA(montantPoints), "Prises de courant, Ã©clairages LED, interrupteurs Legrand"],
      ["Tableaux Divisionnaires avec DiffÃ©rentiels 30mA", `${qTableaux} Tableau(x)`, `${formatFCFA(puTableaux)} / U`, formatFCFA(montantTableaux), "Protection par disjoncteurs magnÃ©tothermiques normalisÃ©s"],
      ["Lignes Climatisation DÃ©diÃ©es (Courbe C)", `${qClim} Lignes`, `${formatFCFA(puClim)} / Ligne`, formatFCFA(montantClim), "Lignes sÃ©parÃ©es 2.5 mmÂ² sous disjoncteur courbe C 16A/20A"],
      ["RÃ©seau de Terre & Liaison Ã‰quipotentielle", "1 RÃ©seau complet", "Seuil normatif < 100 Ohms", "Inclus au lot", "Tension de sÃ©curitÃ© 50V max pour locaux humides"],
      ["TOTAL ESTIMATIF Ã‰LECTRICITÃ‰ NF C 15-100", "-", "-", formatFCFA(totalElectriciteF), "Conforme aux normes de sÃ©curitÃ© Ã©lectrique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant de l\'Installation', 'Quantitatif CalibrÃ©', 'Prix Unitaire EstimÃ©', 'Montant Total HT', 'Exigence Normative']],
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
    // PAGE 3 : MENUISERIES & PEINTURE (DÃ‰COMPOSITION Q â€” PU)
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Å“uvre", "Partie III : Menuiseries Int./Ext. (Q â€” PU) & Peintures NormalisÃ©es (DTU 59.1)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. LOT MENUISERIES EXTÃ‰RIEURES & INTÃ‰RIEURES (DÃ‰COMPOSITION Q â€” PU)");

    const menuiseriesRows = [
      ["Portes IntÃ©rieures Isoplanes GravÃ©es", `${qPortesInt} Blocs`, `${formatFCFA(puPorteInt)} / U`, formatFCFA(montantPortesInt), "Huisseries mÃ©talliques traitÃ©es anti-corrosion + serrures"],
      ["ChÃ¢ssis Coulissants Alu VitrÃ© (FenÃªtres)", `${qChassisAlu} ChÃ¢ssis`, `${formatFCFA(puChassisAlu)} / U`, formatFCFA(montantChassisAlu), "Alu laquÃ© 1.4 mm avec vitrage Stopsol 6 mm"],
      ["Grandes Baies VitrÃ©es Coulissantes Salon", `${qBaiesVitrees} Baie(s)`, `${formatFCFA(puBaieVitree)} / U`, formatFCFA(montantBaies), "ProfilÃ©s alu renforcÃ©s et roulements Ã  billes inox Ã©tanches"],
      ["Porte d'EntrÃ©e Principale SÃ©curisÃ©e", `${qPorteBlindee} Porte`, `${formatFCFA(puPorteBlindee)} / U`, formatFCFA(montantPorteBlindee), "Porte blindÃ©e acier 7 points ou bois massif traitÃ©"],
      ["TOTAL ESTIMATIF LOT MENUISERIES", "-", "-", formatFCFA(totalMenuiseriesF), "Fourniture et pose complÃ¨te des menuiseries"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Type de Menuiserie', 'Nombre / Dimensions', 'Prix Unitaire EstimÃ©', 'Montant Total HT', 'SpÃ©cification Technique']],
      menuiseriesRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 44 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. LOT PEINTURE, ENDUITS & FINITIONS DÃ‰CORATIVES (DTU 59.1)");

    const peintureRows = [
      ["Enduit de Rebouchage & Ratissage Complet", `${sMursEnduit} mÂ²`, `${formatFCFA(puEnduit)} / mÂ²`, formatFCFA(montantEnduit), "Deux passes croisÃ©es avec ponÃ§age fin anti-rayures"],
      ["Couche d'Impression Fixatrice RÃ©gulatrice", `${sImpression} mÂ²`, `${formatFCFA(puImpression)} / mÂ²`, formatFCFA(montantImpression), "Sous-couche hydrofuge acrylique rÃ©gulatrice de fond"],
      ["Peinture IntÃ©rieure Acrylique VeloutÃ©e", `${sPeintureInt} mÂ²`, `${formatFCFA(puPeintureInt)} / mÂ²`, formatFCFA(montantPeintureInt), "Deux couches lavables haute rÃ©sistance Seigneurie / Astral"],
      ["TOTAL ESTIMATIF LOT PEINTURE", "-", "-", formatFCFA(totalPeintureF), "Application soignÃ©e sur murs et plafonds"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Phase & Support de Peinture', 'Surface TraitÃ©e', 'Prix au mÂ² EstimÃ©', 'Montant Total HT', 'Prescription DTU 59.1']],
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
    // PAGE 4 : RÃ‰CAPITULATIF BUDGÃ‰TAIRE & PV DE RÃ‰CEPTION CONTRADICTOIRE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Å“uvre", "Partie IV : SynthÃ¨se BudgÃ©taire TCE & ProcÃ¨s-Verbal de RÃ©ception Contradictoire (COCC)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÃ‰CAPITULATIF BUDGÃ‰TAIRE GLOBAL SECOND Å“UVRE TCE");

    const recapTceRows = [
      ["Lot 1 : Carrelages, FaÃ¯ences, Colles & Joints", formatFCFA(totalLotCarrelageF + totalFaienceF), `${Math.round(((totalLotCarrelageF + totalFaienceF) / totalTCEFinitions) * 100)} %`, "GrÃ¨s cÃ©rame, colles C2TE et joints hydrofuges inclus"],
      ["Lot 2 : Ã‰tanchÃ©itÃ© Toiture Terrasse & PiÃ¨ces Humides", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), `${Math.round(((totalEtancheiteF + totalEtancheiteHumideF) / totalTCEFinitions) * 100)} %`, "Complexe bicouche 4 mm sablÃ© et SEL salles d'eau"],
      ["Lot 3 : Plomberie Sanitaire & RÃ©seau Ã‰vacuations EU/EP", formatFCFA(totalPlomberieF), `${Math.round((totalPlomberieF / totalTCEFinitions) * 100)} %`, "Sanitaires, mitigeurs et rÃ©seaux sans soudure encastrÃ©e"],
      ["Lot 4 : Ã‰lectricitÃ©, Tableaux & Lignes Clim (NF C 15-100)", formatFCFA(totalElectriciteF), `${Math.round((totalElectriciteF / totalTCEFinitions) * 100)} %`, `${nbPointsElec} points Ã©lectriques, disjoncteurs et rÃ©seau terre`],
      ["Lot 5 : Menuiseries IntÃ©rieures & ExtÃ©rieures", formatFCFA(totalMenuiseriesF), `${Math.round((totalMenuiseriesF / totalTCEFinitions) * 100)} %`, "Portes isoplanes, chÃ¢ssis alu et baie vitrÃ©e salon"],
      ["Lot 6 : Peinture IntÃ©rieure & Enduits RatissÃ©s", formatFCFA(totalPeintureF), `${Math.round((totalPeintureF / totalTCEFinitions) * 100)} %`, "Enduits croisÃ©s et 2 couches acrylique veloutÃ©e"],
      ["Main d'Å“uvre SpÃ©cialisÃ©e Pose & Finitions", formatFCFA(totalMainOeuvreF), `${Math.round((totalMainOeuvreF / totalTCEFinitions) * 100)} %`, "Artisans qualifiÃ©s avec assurance et respect des DTU"],
      ["BUDGET TOTAL ESTIMATIF SECOND Å“UVRE TCE", formatFCFA(totalTCEFinitions), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalTCEFinitions / surface))} / mÂ² SDP`]
    ];

    // VÃ©rification de la somme des lignes rÃ©capitulatives
    const sommeLignesRecap = (totalLotCarrelageF + totalFaienceF) + (totalEtancheiteF + totalEtancheiteHumideF) + totalPlomberieF + totalElectriciteF + totalMenuiseriesF + totalPeintureF + totalMainOeuvreF;
    if (sommeLignesRecap !== totalTCEFinitions) throw new Error("IncohÃ©rence somme rÃ©capitulative finitions");

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Lot Technique Second Å“uvre', 'Montant Estimatif HT', 'Quote-Part TCE', 'Observations & PrioritÃ©s']],
      recapTceRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 34, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 62 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. PROCÃˆS-VERBAL DE RÃ‰CEPTION CONTRADICTOIRE DES TRAVAUX (COCC)");

    // Cadre officiel PV de rÃ©ception
    const pvBoxY = currentY + TITLE_AFTER_GAP_MM;
    const pvBoxHeight = 56;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("ACTE JURIDIQUE DE RÃ‰CEPTION DES TRAVAUX (ARTICLE 740 DU COCC)", MARGIN_LEFT + 4, pvBoxY + 5.5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃ®tre d'Ouvrage : ${clientName} â€¢ RÃ©f Dossier : ${refDoc} â€¢ Date de visite : ${currentDate}`, MARGIN_LEFT + 4, pvBoxY + 11.5);
    doc.text(`Entrepreneur / TÃ¢cheron en charge des travaux : ....................................................................................................`, MARGIN_LEFT + 4, pvBoxY + 16.5);

    doc.setFont(getFontFamily(doc), 'bold');
    doc.text("DÃ‰CISION CONTRADICTOIRE DES PARTIES :", MARGIN_LEFT + 4, pvBoxY + 22.5);
    doc.setFont(getFontFamily(doc), 'normal');
    doc.text("[ ] RÃ‰CEPTION PRONONCÃ‰E SANS RÃ‰SERVE : L'ouvrage est conforme aux rÃ¨gles de l'art.", MARGIN_LEFT + 8, pvBoxY + 27.5);
    doc.text(`[ ] RÃ‰CEPTION PRONONCÃ‰E AVEC RÃ‰SERVES : Les dÃ©sordres consignÃ©s doivent Ãªtre levÃ©s sous ${delaiReserves} jours.`, MARGIN_LEFT + 8, pvBoxY + 32.5);

    doc.text(`DÃ©lai impÃ©ratif accordÃ© Ã  l'entrepreneur pour la levÃ©e intÃ©grale des rÃ©serves : ${delaiReserves} jours calendaires.`, MARGIN_LEFT + 4, pvBoxY + 38.5);
    doc.text("La retenue de garantie contractuelle de 5% (COCC) demeure consignÃ©e jusqu'au PV de levÃ©e des rÃ©serves.", MARGIN_LEFT + 4, pvBoxY + 43);

    // Signatures
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(6.8);
    doc.text("Signature MaÃ®tre d'Ouvrage :", MARGIN_LEFT + 15, pvBoxY + 49);
    doc.text("Signature Entrepreneur / TÃ¢cheron :", 115, pvBoxY + 49);
    doc.setDrawColor(148, 163, 184);
    doc.line(MARGIN_LEFT + 10, pvBoxY + 53, MARGIN_LEFT + 65, pvBoxY + 53);
    doc.line(110, pvBoxY + 53, 165, pvBoxY + 53);
  }

  // =========================================================================
  // EXPORTATION GLOBALE & GESTIONNAIRE DE TÃ‰LÃ‰CHARGEMENT
  // =========================================================================
  window.generateProjectPDF = function(projectData) {
    const jsPDFClass = getJsPDF();
    if (!jsPDFClass) {
      alert("Erreur critique : La bibliothÃ¨que jsPDF n'a pas pu Ãªtre chargÃ©e.");
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
      doc.line(MARGIN_LEFT, pageHeight - 16, CONTENT_RIGHT, pageHeight - 16);

      doc.setFont(getFontFamily(doc), 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text("ChantierSur.com â€¢ Bureau d'Ã‰tudes NumÃ©rique IndÃ©pendant â€¢ Dakar, RÃ©publique du SÃ©nÃ©gal.", MARGIN_LEFT, pageHeight - 11);
      if (service === 'finitions') {
        doc.text("Document gÃ©nÃ©rÃ© automatiquement Ã  titre indicatif â€¢ Normes DTU Second Å“uvre (52.1, 59.1, 60.1, 43.1) & NF C 15-100.", MARGIN_LEFT, pageHeight - 7);
      } else {
        doc.text("Document gÃ©nÃ©rÃ© automatiquement Ã  titre indicatif â€¢ BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", MARGIN_LEFT, pageHeight - 7);
      }

      doc.setFont(getFontFamily(doc), 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Page ${p} sur ${totalPages}`, CONTENT_RIGHT, pageHeight - 9, { align: 'right' });
    }

    const fileName = `ChantierSur_${service.toUpperCase()}_${refDoc}.pdf`;
    doc.save(fileName);
  };

  // Fonctions de rendu directes pour intÃ©grations et tests
  window.renderEsquisse = renderEsquisse;
  window.renderExpress = renderExpress;
  window.renderAudit = renderAudit;
  window.renderFinitions = renderFinitions;
  window.renderOtherServices = renderOtherServices;
  window.ChantierSurPDF = {
    renderEsquisse,
    renderExpress,
    renderAudit,
    renderFinitions,
    renderOtherServices
  };

  // Alias universels
  window.generatePDF = window.generateProjectPDF;
})();

