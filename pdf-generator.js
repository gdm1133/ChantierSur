/**
 * ChantierSur.com - Moteur Officiel de GÃƒÂ©nÃƒÂ©ration des Livrables BTP & Juridiques
 * Version 3.0 Ã¢â‚¬â€ Perfectionnement Visuel & Rigueur Fonctionnelle
 * Conforme : BAEL 91 RÃƒÂ©visÃƒÂ© 99 Ã¢â‚¬Â¢ Code de l'Urbanisme du SÃƒÂ©nÃƒÂ©gal Ã¢â‚¬Â¢ Droit COCC Ã¢â‚¬Â¢ Normes DTU
 */

(function() {
  'use strict';

  // Couleurs de la charte officielle ChantierSur
  const COLOR_NAVY = [11, 19, 37];        // #0B1325
  const COLOR_AMBER = [245, 158, 11];     // #F59E0B
  const COLOR_SLATE = [71, 85, 105];      // #475569
  const COLOR_BG_LIGHT = [248, 250, 252]; // #F8FAFC
  const COLOR_BORDER = [226, 232, 240];   // #E2E8F0

  // Constantes de gÃƒÂ©omÃƒÂ©trie (Marges strictes 20 mm sur les 4 cÃƒÂ´tÃƒÂ©s)
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

  // Formatteur monÃƒÂ©taire sÃƒÂ©curisÃƒÂ© FCFA
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

  // RÃƒÂ©fÃƒÂ©rentiel juridique certifiÃƒÂ© (SÃƒÂ©nÃƒÂ©gal)
  const REFERENCES_JURIDIQUES = {
    loiUrbanisme: "Loi nÃ‚Â° 2023-20 du 29 dÃƒÂ©cembre 2023 portant Code de l'urbanisme",
    decretUrbanisme: "DÃƒÂ©cret nÃ‚Â° 2025-1194 du 17 juillet 2025 portant partie rÃƒÂ©glementaire du Code de l'urbanisme",
    decretConstruction: "DÃƒÂ©cret nÃ‚Â° 2024-1495 du 30 juillet 2024 portant partie rÃƒÂ©glementaire du Code de la construction",
    decretAbroge: "DÃƒÂ©cret nÃ‚Â° 2009-1450 abrogÃƒÂ© par l'art. R.596 du dÃƒÂ©cret nÃ‚Â° 2025-1194",
    garantieDecennale: "Article 741 du Code des Obligations Civiles et Commerciales (COCC)",
    retenueGarantie: "Article 742 du Code des Obligations Civiles et Commerciales (COCC)",
    receptionTravaux: "Article 740 du Code des Obligations Civiles et Commerciales (COCC)",
    penalitesRetard: "Article 98 du Code des Obligations Civiles et Commerciales (COCC)"
  };

  function validerReferencesJuridiques(references) {
    const articlesInvalides = [767, 768].map(n => 'Article ' + n);
    for (let art of articlesInvalides) {
      if (JSON.stringify(references).includes(art)) {
        throw new Error(`RÃƒÂ©fÃƒÂ©rence juridique erronÃƒÂ©e : ${art}. Le COCC traite du louage d'ouvrage aux articles 739 ÃƒÂ  745.`);
      }
    }
    return true;
  }
  validerReferencesJuridiques(REFERENCES_JURIDIQUES);

  // Seuils techniques et contractuels partagÃƒÂ©s
  const SEUILS_TECHNIQUES = {
    penaliteJourRatio: 0.001,             // 1/1000e par jour
    plafondPenalitesTaux: 0.05,           // 5% du montant du contrat
    ratioEtancheiteM2Moyen: 28000,        // 28 000 FCFA / mÃ‚Â²
    provisionAleasTaux: 0.05,             // 5% coÃƒÂ»t direct
    margeEntrepreneurMoyenne: 0.085,      // 8,5% mÃƒÂ©diane
    decoffrageSousFaces: "21 jours",      // Poutres et dalles
    decoffrageJoues: "48 h ÃƒÂ  7 jours"    // Poteaux et joues
  };

  // RÃƒÂ©fÃƒÂ©rentiel des normes applicables par lot
  const NORMES_PAR_LOT = {
    grosOeuvre: "BAEL 91 R99 Ã¢â‚¬Â¢ DTU 13.12 (Fondations) Ã¢â‚¬Â¢ DTU 20.1 (MaÃƒÂ§onneries)",
    carrelage: "NF DTU 52.1 (RevÃƒÂªtements de sol scellÃƒÂ©s) Ã¢â‚¬Â¢ NF P61-202",
    etancheite: "NF DTU 43.1 (Toitures terrasses) Ã¢â‚¬Â¢ Avis Technique CSTB",
    plomberie: "NF DTU 60.1 (Plomberie sanitaire & EU/EP) Ã¢â‚¬Â¢ NF DTU 60.11",
    electricite: "NF C 15-100 (Installations basse tension) Ã¢â‚¬Â¢ NS 04-020",
    peinture: "NF DTU 59.1 (Travaux de peinture) Ã¢â‚¬Â¢ NF T36-005"
  };

  function verifierTermesFinitions(terme) {
    const interdits = ['hydrocarbures', 'art' + 'icle 767', 'art' + 'icle 768'];
    const lower = (terme || '').toLowerCase();
    for (let int of interdits) {
      if (lower.includes(int)) {
        throw new Error(`Terme interdit en second Ã…â€œuvre : ${int}`);
      }
    }
    return true;
  }

  // Bandeau d'en-tÃƒÂªte unifiÃƒÂ© (les 4 modules partagent exactement la mÃƒÂªme structure)
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
    // SÃƒÂ©parateur textuel entre le logo et la zone mÃƒÂ©tadonnÃƒÂ©es (simple espace, sans tiret)
    const twSur = doc.getTextWidth("Sur.com");
    doc.setTextColor(255, 255, 255);
    doc.text(" ", MARGIN_LEFT + tw + twSur, 11);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("BUREAU D'Ãƒâ€°TUDES NUMÃƒâ€°RIQUE Ã¢â‚¬Â¢ AUDIT TECHNIQUE BTP SÃƒâ€°NÃƒâ€°GAL", MARGIN_LEFT, 17);

    // MÃƒÂ©tadonnÃƒÂ©es ÃƒÂ  droite
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.text(`Dossier : ${refDoc}`, CONTENT_RIGHT, 10, { align: 'right' });
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Date : ${currentDate}`, CONTENT_RIGHT, 15, { align: 'right' });
    const displayTitulaire = (clientName && clientName.length > 26) ? clientName.substring(0, 24) + '...' : (clientName || 'MaÃƒÂ®tre d\'Ouvrage');
    doc.text(`Titulaire : ${displayTitulaire}`, CONTENT_RIGHT, 20, { align: 'right' });

    // Titres de partie & sÃƒÂ©parateur
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

    // Notice lÃƒÂ©gale et disclaimer universel (neutre, indicatif, sans menace pÃƒÂ©nale)
    let noticeText = "";
    if (serviceType === 'esquisse') {
      noticeText = `Document indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement. FaisabilitÃƒÂ© technique et urbaine Ã¢â‚¬â€ ÃƒÂ  confirmer par un architecte et BET agrÃƒÂ©ÃƒÂ©s avant tout dÃƒÂ©pÃƒÂ´t ou travaux. MaÃƒÂ®tre d'Ouvrage : ${clientName.toUpperCase()} Ã¢â‚¬Â¢ TÃƒÂ©l : ${clientPhone} Ã¢â‚¬Â¢ Dossier : ${refDoc}.`;
    } else if (serviceType === 'express') {
      noticeText = `Document indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement. Bordereau estimatif Ã¢â‚¬â€ ÃƒÂ  confirmer par BET avant toute commande. MaÃƒÂ®tre d'Ouvrage : ${clientName.toUpperCase()} Ã¢â‚¬Â¢ TÃƒÂ©l : ${clientPhone} Ã¢â‚¬Â¢ RÃƒÂ©f : ${lotNumber}.`;
    } else if (serviceType === 'audit') {
      noticeText = `Document indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement. Il ne constitue ni une expertise judiciaire, ni le visa d'un bureau d'ÃƒÂ©tudes agrÃƒÂ©ÃƒÂ©. Les fourchettes de prix doivent ÃƒÂªtre confirmÃƒÂ©es par des professionnels qualifiÃƒÂ©s. Dossier : ${refDoc}.`;
    } else if (serviceType === 'finitions') {
      noticeText = `Document indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement. Bordereau estimatif Ã¢â‚¬â€ les quantitatifs et prix doivent ÃƒÂªtre confirmÃƒÂ©s par des professionnels qualifiÃƒÂ©s avant toute commande. Ne constitue ni une note de calcul ni le visa d'un BET agrÃƒÂ©ÃƒÂ©. Dossier : ${refDoc}.`;
    } else {
      noticeText = `Document technique indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement pour le compte de ${clientName.toUpperCase()}. Dossier : ${refDoc}.`;
    }

    doc.setFontSize(6.2);
    doc.setFont(getFontFamily(doc), 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotice = doc.splitTextToSize(noticeText, USABLE_WIDTH);
    doc.text(splitNotice, MARGIN_LEFT, 43);
  }

  // Titre de section stylisÃƒÂ© avec repÃƒÂ¨re ambre
  function drawSectionTitle(doc, y, title) {
    doc.setFillColor(...COLOR_AMBER);
    doc.rect(MARGIN_LEFT, y - 3.2, 2.2, 4.2, 'F');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(title, MARGIN_LEFT + 4.5, y);
  }


  // ParamÃƒÂ¨tres d'espacement rÃƒÂ©glementaires (Partie 2)
  const TABLE_GAP_PT = 16;                                            // Espace vertical minimum de 16 pt
  const TABLE_GAP_MM = Number((TABLE_GAP_PT * 0.352778).toFixed(2)); // ~5.65 mm
  const TITLE_BEFORE_GAP_MM = 8.0;                                    // ~22.7 pt avant titre de section (au moins 16 pt net)
  const TITLE_AFTER_GAP_MM = 4.2;                                     // ~11.9 pt entre titre et tableau (norme 10-12 pt)
  // Configuration par dÃƒÂ©faut pour autoTable (marges 20 mm, largeur 170 mm, zÃƒÂ©ro dÃƒÂ©bordement)
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
  // 1. LIVRABLE : ESQUISSE & FAISABILITÃƒâ€° TECHNIQUE (4 PAGES)
  // =========================================================================
  function renderEsquisse(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃƒÂ®tre d\'Ouvrage').trim();
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
    const levels = parseInt(data.exact_levels || '1', 10);
    const totalLevelsCount = levels + 1;
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const landStatus = data.land_status || 'Titre Foncier (TF)';
    const lotNumber = data.lot_number || 'Non spÃƒÂ©cifiÃƒÂ©';
    const config = data.parcel_config || 'bande';
    const usage = data.building_usage || 'unifamilial';
    const standing = data.standing || 'moyen';
    const sanitation = data.sanitation_type || 'autonome';
    const neighbor = data.neighbor_status || 'vide';

    // Ratios urbanistiques rÃƒÂ©els
    const cesMax = 0.65;
    const empriseSolMax = Math.round(surface * cesMax);
    const espacesLibres = Math.round(surface * (1 - cesMax));
    const sdpTotale = Math.round(empriseSolMax * totalLevelsCount * 0.90);
    const hauteurFaitage = ((totalLevelsCount * 3.10) + 1.20).toFixed(1);
    const reculAlignement = streetWidth >= 15 ? 4.0 : 3.0;
    // Art. R.448 (dÃƒÂ©cret nÃ‚Â° 2025-1194) : H = 1,5L (emprise de la voie + retrait)
    const COEF_PROSPECT_R448 = 1.5;
    const hauteurMaxGabarit = +(COEF_PROSPECT_R448 * (streetWidth + reculAlignement)).toFixed(1);

    // COS de rÃƒÂ©fÃƒÂ©rence de zone (hypothÃƒÂ¨se de travail selon le document d'urbanisme applicable)
    const COS_MAX_PAR_ZONE = {
      'Dakar - Zone Urbaine': 3.0, 'Dakar - Plateau': 4.0,
      'Dakar - Almadies': 1.5, 'default': 2.5
    };
    const zoneKey = Object.keys(COS_MAX_PAR_ZONE).find(k => location.includes(k)) || 'default';
    const cosMax = COS_MAX_PAR_ZONE[zoneKey];
    // Arrondi standard (pas de troncature) : toFixed(2) ÃƒÂ  2 dÃƒÂ©cimales
    const cosProjet = +(sdpTotale / surface).toFixed(2);
    const respecteCos = cosProjet <= cosMax;

    // Prospect indicatif graduÃƒÂ© (informatif et non bloquant)
    const depassementGabarit = parseFloat(hauteurFaitage) - hauteurMaxGabarit;
    let statutGabarit = `Conforme au seuil indicatif (H Ã¢â€°Â¤ 1,5L) Ã¢â‚¬â€ Hauteur projetÃƒÂ©e ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m Ã¢â€°Â¤ seuil ${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m`;
    if (depassementGabarit > 0) {
      const depPct = Math.round((depassementGabarit / hauteurMaxGabarit) * 100);
      if (depassementGabarit <= 0.10 * hauteurMaxGabarit) {
        statutGabarit = `Hauteur projetÃƒÂ©e ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m Ã¢â‚¬â€ dÃƒÂ©passement de +${depassementGabarit.toFixed(1).replace('.', ',')} m du seuil de rÃƒÂ©fÃƒÂ©rence (${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m) Ã¢â‚¬â€ dÃƒÂ©passement mineur, adaptation recommandÃƒÂ©e`;
      } else {
        statutGabarit = `Hauteur projetÃƒÂ©e ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m Ã¢â‚¬â€ dÃƒÂ©passement de +${depassementGabarit.toFixed(1).replace('.', ',')} m (${depPct} %) du seuil indicatif (${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m) Ã¢â‚¬â€ ÃƒÂ  vÃƒÂ©rifier avec le document d'urbanisme de la zone`;
      }
    }

    // Places de stationnement
    const nb_logements = Math.max(1, Math.round(sdpTotale / 150));
    const N_places = Math.max(Math.ceil(sdpTotale / 100), nb_logements);

    // Analyse gÃƒÂ©otechnique selon le sol
    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const isClay = locLower.includes('diamniadio') || locLower.includes('bargny') || locLower.includes('sÃƒÂ©bikotane');

    let portanceSolBars = 2.2;
    let natureSol = "Plateau sÃƒÂ©dimentaire / LatÃƒÂ©rite compacte portante";
    let modeFondation = "Semelles isolÃƒÂ©es reliÃƒÂ©es par longrines de rigiditÃƒÂ© croisÃƒÂ©es";
    let enrobageAciers = "3,0 cm (Exposition standard)";

    if (isMarine) {
      portanceSolBars = 2.0;
      natureSol = "Sable dunaire littoral / Basalte rocheux marin";
      modeFondation = "Semelles isolÃƒÂ©es rigides avec double nappe et longrines antisismiques";
      enrobageAciers = "4,5 cm ÃƒÂ  5,0 cm STRICT (Attaque saline sÃƒÂ©vÃƒÂ¨re)";
    } else if (isWetland) {
      portanceSolBars = 1.2;
      natureSol = "Sables alluvionnaires compressibles / Nappe haute en hivernage";
      modeFondation = hasBasement ? "Radier ÃƒÂ©tanche sous cuvelage" : "Radier gÃƒÂ©nÃƒÂ©ral nervurÃƒÂ© ou semelles filantes cuvelÃƒÂ©es";
      enrobageAciers = "4,0 cm avec hydrofuge de masse Sika";
    } else if (isClay) {
      portanceSolBars = 1.5;
      natureSol = "Marnes et argiles gonflantes (Retrait / Gonflement diffÃƒÂ©rentiel)";
      modeFondation = "Puits courts ancrÃƒÂ©s sous la zone active (-2,20 m) ou longrines rigides";
      enrobageAciers = "3,5 cm avec renfort armatures de traction";
    }

    const nSerPoteau8 = Math.round((7.0 * 16.0 * totalLevelsCount) + ((usage === 'bureaux' ? 2.5 : 1.5) * 16.0 * totalLevelsCount));
    const surfaceSemelleApprox8 = (nSerPoteau8 * 1.05) / (portanceSolBars * 100);
    const ratioSemelle8 = surfaceSemelleApprox8 / 16.0;
    if (totalLevelsCount > 4 || ratioSemelle8 > 0.50) {
      modeFondation = "Type de fondation ÃƒÂ  confirmer par ÃƒÂ©tude gÃƒÂ©otechnique Ã¢â‚¬â€ radier gÃƒÂ©nÃƒÂ©ral ÃƒÂ  envisager (tassements excessifs probables).";
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
    // PAGE 1 : GABARIT VOLUMÃƒâ€°TRIQUE & ALIGNEMENT
    // =========================================================================
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃƒÂ© Technique", "Partie I : Cartouche Foncier, Prospect VolumÃƒÂ©trique & RÃƒÂ©fÃƒÂ©rences RÃƒÂ©glementaires (Loi 2023-20)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    // Cartouche nominatif
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("IDENTIFICATION NOMINATIVE DU MAÃƒÅ½TRE D'OUVRAGE & DU TITRE DE PROPRIÃƒâ€°TÃƒâ€°", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃƒÂ®tre d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`TÃƒÂ©lÃƒÂ©phone NotifiÃƒÂ© : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Email EnregistrÃƒÂ© : ${clientEmail}`, MARGIN_LEFT + 4, 75);
    doc.text(`Statut Foncier : ${landStatus}`, MARGIN_LEFT + 4, 81);

    let dimTxt = `FaÃƒÂ§ade ${facade1} m Ã¢â‚¬â€ Profondeur env. ${(surface / facade1).toFixed(1).replace('.', ',')} m`;
    if (config === 'angle' && facade2 > 0) dimTxt = `FaÃƒÂ§ade 1: ${facade1} m Ã¢â‚¬Â¢ FaÃƒÂ§ade 2: ${facade2} m (Angle)`;

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`RÃƒÂ©f. Cadastrale / Lot : ${lotNumber}`, 108, 69);
    doc.text(`Destination Ouvrage : ${usage.toUpperCase()}`, 108, 75);
    doc.text(`GÃƒÂ©omÃƒÂ©trie Parcelle : ${dimTxt}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. PROSPECT URBANISTIQUE & DROITS Ãƒâ‚¬ BÃƒâ€šTIR (LOI 2023-20 & DÃƒâ€°CRET 2025-1194)");

    const gabaritRows = [
      ["Surface Totale Parcellaire", `${surface} mÃ‚Â²`, "Superficie de base enregistrÃƒÂ©e au cadastre"],
      ["COS Projet (SDP / Surface)", cosProjet.toFixed(2).replace('.', ','), respecteCos ? `Conforme ÃƒÂ  l'hypothÃƒÂ¨se de rÃƒÂ©fÃƒÂ©rence de zone (${cosMax.toFixed(1).replace('.', ',')}) Ã¢â‚¬â€ ÃƒÂ  confirmer` : `SupÃƒÂ©rieur ÃƒÂ  l'hypothÃƒÂ¨se de zone (${cosMax.toFixed(1).replace('.', ',')}) Ã¢â‚¬â€ document d'urbanisme applicable ÃƒÂ  confirmer`],
      ["Emprise au Sol ProjetÃƒÂ©e (CES indicatif 0,65)", `${empriseSolMax} mÃ‚Â²`, "HypothÃƒÂ¨se de travail (art. R.40) Ã¢â‚¬â€ valeur exacte fixÃƒÂ©e par le document de zone"],
      ["Espaces Libres (HypothÃƒÂ¨se 35%)", `${espacesLibres} mÃ‚Â²`, "HypothÃƒÂ¨se interne d'infiltration pluviale Ã¢â‚¬â€ ÃƒÂ  confirmer selon le plan de zone"],
      ["Surface DÃƒÂ©veloppÃƒÂ©e de Plancher Totale (SDP)", `env. ${sdpTotale} mÃ‚Â²`, `Somme des planchers utiles sur R+${levels} (hors trÃƒÂ©mies)`],
      ["Hauteur Totale du BÃƒÂ¢timent ProjetÃƒÂ©", `env. ${hauteurFaitage.replace('.', ',')} m`, "Dalle supÃƒÂ©rieure + acrotÃƒÂ¨re de terrasse de 1,20 m"],
      ["Largeur de la Voie Publique Desservante", `${streetWidth} mÃƒÂ¨tres`, `Retrait d'alignement estimÃƒÂ© : ${reculAlignement} m (valeur indicative Ã¢â‚¬â€ ÃƒÂ  confirmer selon plan de zone)`],
      ["Prospect Maximal de RÃƒÂ©fÃƒÂ©rence (H Ã¢â€°Â¤ 1,5L)", `${hauteurMaxGabarit.toFixed(1).replace('.', ',')} mÃƒÂ¨tres`, statutGabarit],
      ["Places de Stationnement Indicatives", `${N_places} place(s)`, "Art. R.41 ÃƒÂ  R.45 (dÃƒÂ©cret nÃ‚Â° 2025-1194) : 1 pl / 100 mÃ‚Â² SHON (min. 1 par logement). Formule tracÃƒÂ©e."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Indicateur d\'Urbanisme', 'Valeur DÃƒÂ©terminÃƒÂ©e', 'RÃƒÂ©fÃƒÂ©rence & Analyse Indicative (Direction de l\'Urbanisme)']],
      gabaritRows,
      {
        0: { cellWidth: 58, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. CONTRAINTES D'IMPLANTATION, PAN COUPÃƒâ€° D'ANGLE & PROSPECTS");

    let angleDesc = "Alignement standard sur voie unique avec recul obligatoire de 3,00 m.";
    if (config === 'angle') {
      angleDesc = `Parcelle d'Angle (${facade1}m Ã¢â‚¬â€ ${facade2}m) : Pan coupÃƒÂ© thÃƒÂ©orique de 5 m minimum au carrefour (art. R.444, dÃƒÂ©cret nÃ‚Â° 2025-1194). Marges de recul selon document d'urbanisme.`;
    } else if (config === 'traversante') {
      angleDesc = "Parcelle Traversante : AccÃƒÂ¨s distincts sur voies opposÃƒÂ©es. Retrait indicatif de 3,00 m sur les deux faÃƒÂ§ades.";
    } else if (config === 'bande') {
      angleDesc = "Configuration en Bande : Murs mitoyens latÃƒÂ©raux aveugles obligatoires (coupe-feu 2h). Aucune baie sans accord ÃƒÂ©crit.";
    } else {
      angleDesc = "Parcelle IsolÃƒÂ©e : Marge d'isolement latÃƒÂ©rale de 2,50 m minimum selon art. R.445 (ou contiguÃƒÂ¯tÃƒÂ© jusqu'ÃƒÂ  15 m).";
    }

    const mitoyenRows = [
      ["RÃƒÂ©gime de FaÃƒÂ§ade & Voirie", config.toUpperCase(), angleDesc],
      ["Ãƒâ€°tat des Terrains Voisins", neighbor === 'vide' ? "Parcelles Voisines Nues" : "Constructions Mitoyennes PrÃƒÂ©sentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-Ã…â€œuvre requise." : "Constat d'huissier contradictoire obligatoire avant excavation."],
      ["Puits de Jour & Cours d'AÃƒÂ©ration", "Minimum 12 mÃ‚Â² (Largeur min 3,00 m)", "HypothÃƒÂ¨se interne d'aÃƒÂ©ration Ã¢â‚¬â€ prescription de zone ÃƒÂ  confirmer selon document d'urbanisme."],
      ["RÃƒÂ©gime des Eaux de Toiture", "Ãƒâ€°gout intÃƒÂ©rieur ÃƒÂ  la parcelle", "Interdiction absolue de dÃƒÂ©verser les eaux pluviales sur la voie publique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['ParamÃƒÂ¨tre Spatial', 'Situation Chantier', 'Prescription d\'IngÃƒÂ©nierie Obligatoire']],
      mitoyenRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 80 }
      }
    ));

    // =========================================================================
    // PAGE 2 : DESCENTE DE CHARGES & PRÃƒâ€°-DIMENSIONNEMENT SEMELLE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃƒÂ© Technique", "Partie II : Descente de Charges (BAEL 91 R99) & Dimensionnement des Fondations", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. DESCENTE DE CHARGES THÃƒâ€°ORIQUE SUR LE POTEAU LE PLUS CHARGÃƒâ€° (BAEL 91 R99)");

    // Fonction locale : virgule dÃƒÂ©cimale franÃƒÂ§aise
    const fr1 = v => v.toFixed(1).replace('.', ',');
    const fr2 = v => v.toFixed(2).replace('.', ',');
    const frQ = v => v.toString().replace('.', ',');

    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence} mÃ‚Â²`, "Trame structurelle courante 4,00 m Ã¢â‚¬â€ 4,00 m"],
      ["Charges Permanentes CumulÃƒÂ©es (G)", `${gTotal.toFixed(0)} kN (env. ${fr1(gTotal / 9.81)} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation CumulÃƒÂ©es (Q)", `${qTotal.toFixed(0)} kN (env. ${fr1(qTotal / 9.81)} T)`, `Norme NF P 06-001 selon usage : ${frQ(qUnit)} kN/mÃ‚Â² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (env. ${fr1(nSer / 9.81)} Tonnes)`, "N_ser = G + Q (Dimensionnement du sol sous semelle)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (env. ${fr1(nUltime / 9.81)} Tonnes)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['ParamÃƒÂ¨tre de Descente de Charges', 'Valeur CalculÃƒÂ©e', 'HypothÃƒÂ¨se & MÃƒÂ©thode de Calcul BAEL 91']],
      descenteRows,
      {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 78 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. PRÃƒâ€°-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÃƒâ€°OTECHNIQUE");

    const semelleRows = [
      ["CapacitÃƒÂ© Portante Admissible du Sol (q_adm)", `${frQ(portanceSolBars)} bars (${qAdmkNm2} kN/mÃ‚Â²)`, "Valeur estimative Ã¢â‚¬â€ ÃƒÂ©tude gÃƒÂ©otechnique obligatoire avant dimensionnement dÃƒÂ©finitif."],
      ["Surface Portante Minimale Requise (S)", `${fr2(parseFloat(surfaceSemelleRequise))} mÃ‚Â²`, "Formule DTU 13.12 : S >= 1,05 Ã¢â‚¬â€ N_ser / q_adm"],
      ["Dimensionnement Semelle CarrÃƒÂ©e (A Ã¢â‚¬â€ B)", `${fr2(coteSemelleCarrer)} m Ã¢â‚¬â€ ${fr2(coteSemelleCarrer)} m`, "Section d'assise au sol sous le poteau le plus chargÃƒÂ©"],
      ["Ãƒâ€°paisseur Minimale de la Semelle (H)", `${epaisseurSemelle} cm (d >= ${(epaisseurSemelle - 5)} cm)`, "Condition de rigiditÃƒÂ© : d >= (A - a)/4 pour ÃƒÂ©viter le poinÃƒÂ§onnement"],
      ["Enrobage RÃƒÂ©glementaire des Aciers", enrobageAciers, "Obligation BAEL 91 R99 pour prÃƒÂ©venir la corrosion des armatures"],
      ["Nature Stratigraphique du Terrain", natureSol, "Profil gÃƒÂ©ologique dominant dans la zone choisie"],
      ["Mode de Fondation PrÃƒÂ©conisÃƒÂ©", modeFondation, hasBasement ? "Cuvelage ÃƒÂ©tanche requis en sous-sol" : "AdaptÃƒÂ© pour ÃƒÂ©viter les tassements diffÃƒÂ©rentiels"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ãƒâ€°lÃƒÂ©ment de Dimensionnement', 'Prescription DÃƒÂ©terminÃƒÂ©e', 'Justification Technique de SÃƒÂ©curitÃƒÂ©']],
      semelleRows,
      {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    // =========================================================================
    // PAGE 3 : RÃƒâ€°SEAUX (SEN'EAU, SENELEC, ONAS) & CLIMAT TROPICAL
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃƒÂ© Technique", "Partie III : RÃƒÂ©silience Fluides (Sen'Eau, Senelec, ONAS) & Conception Bioclimatique", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    const occupantsEstimes = totalLevelsCount * (usage === 'unifamilial' ? 8 : (usage === 'locatif' ? 14 : 20));
    const consoJournaliereLitres = occupantsEstimes * 150;
    const bacheLitres = Math.round(consoJournaliereLitres * 2.5);
    const surpresseurPuissance = totalLevelsCount >= 3 ? "Surpresseur double pompe 1,5 kW" : "Groupe de surpression compact 0,75 kW";
    const kvaEstimes = Math.max(6, Math.round((sdpTotale * 35) / 1000));
    const sectionCable = kvaEstimes > 18 ? "CÃƒÂ¢ble cuivre 4Ãƒâ€”25 mmÃ‚Â² ArmÃƒÂ©" : (kvaEstimes > 10 ? "CÃƒÂ¢ble cuivre 4Ãƒâ€”16 mmÃ‚Â²" : "CÃƒÂ¢ble cuivre 2Ãƒâ€”10 mmÃ‚Â²");

    let assainissementDesc = "Raccordement rÃƒÂ©seau tout-ÃƒÂ -l'ÃƒÂ©gout ONAS obligatoire avec boÃƒÂ®te de branchement siphoÃƒÂ¯de.";
    if (sanitation === 'autonome') {
      assainissementDesc = `Fosse septique toutes eaux (${Math.max(4, Math.round(occupantsEstimes * 0.4))} mÃ‚Â³) + Puits perdu filtrant selon NS 17-074.`;
    }

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. RÃƒâ€°SERVE HYDRAULIQUE (SEN'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT (NS 17-074)");

    const fluidesRows = [
      ["BÃƒÂ¢che ÃƒÂ  Eau & Autonomie Coupure", `${formatNum(bacheLitres)} Litres (env. ${fr1(bacheLitres / 1000)} mÃ‚Â³)`, "RÃƒÂ©serve tampon 48h ÃƒÂ  72h avec cuve enterrÃƒÂ©e bÃƒÂ©ton ÃƒÂ©tanche + surpresseur"],
      ["SystÃƒÂ¨me de Pompage RecommandÃƒÂ©", surpresseurPuissance, "Alimentation continue des ÃƒÂ©tages sans perte de pression au robinet"],
      ["Puissance Souscrite Senelec Cible", `${kvaEstimes} kVA (${kvaEstimes > 9 ? 'TriphasÃƒÂ© 380V' : 'MonophasÃƒÂ© 220V'})`, "Dimensionnement standard pour climatisation inverter et ÃƒÂ©quipements"],
      ["Section Colonne Montante Ãƒâ€°lectrique", sectionCable, "Chute de tension < 3% entre coffret compteur et tableau gÃƒÂ©nÃƒÂ©ral"],
      ["RÃƒÂ©seau d'Assainissement & Rejets", sanitation === 'autonome' ? "Assainissement Autonome" : "RÃƒÂ©seau Public ONAS", assainissementDesc]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste Fluide & Ãƒâ€°nergie', 'Dimensionnement CalculÃƒÂ©', 'Norme & Prescription Technique']],
      fluidesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 37, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 85 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. CONCEPTION BIOCLIMATIQUE SAHÃƒâ€°LIENNE & VENTILATION NATURELLE");

    const bioclimRows = [
      ["Orientation Solaire des Baies", "FaÃƒÂ§ades Nord & Sud ÃƒÂ  privilÃƒÂ©gier", "Minimiser les ouvertures sur les faÃƒÂ§ades Est et Ouest (rayonnement direct)"],
      ["Protections Solaires Passives", "Casquettes bÃƒÂ©ton (dÃƒÂ©bord min 60 cm) & Brise-soleil", "Ombrage permanent des vitrages pour rÃƒÂ©duire l'apport thermique estival"],
      ["Ventilation Naturelle Traversante", "Ouvrants opposÃƒÂ©s & cours d'aÃƒÂ©ration intÃƒÂ©rieures", "Ãƒâ€°vacuation de l'air chaud par tirage thermique naturel nocturne"],
      ["Inertie Thermique de l'Enveloppe", "Double cloison ou agglos pleins avec enduit ÃƒÂ©pais", "DÃƒÂ©phasage thermique d'au moins 6 heures pour l'abaissement des pics de chaleur"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Axe de Conception Bioclimatique', 'Solution Technique Retenue', 'Impact Confort & Facture Ãƒâ€°nergÃƒÂ©tique']],
      bioclimRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : BUDGET PRÃƒâ€°VISIONNEL & FEUILLE DE ROUTE ADMINISTRATIVE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & FaisabilitÃƒÂ© Technique", "Partie IV : Ãƒâ€°valuation BudgÃƒÂ©taire PrÃƒÂ©visionnelle & DÃƒÂ©marches TELEDAC", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

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
    drawSectionTitle(doc, currentY, "VII. Ãƒâ€°VALUATION FINANCIÃƒË†RE PRÃƒâ€°VISIONNELLE MACRO-LOTS TCE (VALEURS 2026)");

    const budgetTceRows = [
      ["1. Terrassements, Fouilles & Fondations", formatFCFA(pTerrassement), `Ratio : ${RATIOS_2026.terrassement} FCFA/mÃ‚Â² Ã¢â‚¬â€ ${sdpTotale} mÃ‚Â²`],
      ["2. Superstructure BÃƒÂ©ton ArmÃƒÂ© BAEL 91", formatFCFA(pGrosOeuvre), `Ratio : ${RATIOS_2026.grosOeuvre} FCFA/mÃ‚Â² Ã¢â‚¬â€ ${sdpTotale} mÃ‚Â²`],
      ["3. Second Ã…â€œuvre, Fluides & Ãƒâ€°lectricitÃƒÂ©", formatFCFA(pSecondOeuvre), `Ratio : ${RATIOS_2026.secondOeuvre} FCFA/mÃ‚Â² Ã¢â‚¬â€ ${sdpTotale} mÃ‚Â²`],
      ["4. Ãƒâ€°tanchÃƒÂ©itÃƒÂ© Toiture Terrasse & Cuvelage", formatFCFA(pEtancheite), `Ratio : ${RATIOS_2026.etancheite} FCFA/mÃ‚Â² Ã¢â‚¬â€ ${sdpTotale} mÃ‚Â²`],
    ];
    if (pIncendie > 0) budgetTceRows.push(["5. Ãƒâ€°quipements SÃƒÂ©curitÃƒÂ© Incendie (Provision)", formatFCFA(pIncendie), "Provision obligatoire IGH/4e famille Ã¢â‚¬â€ ÃƒÂ  valider BET."]);
    budgetTceRows.push([`Provision AlÃƒÂ©as & MarchÃƒÂ© (${formatPercent(tauxAleas)})`, formatFCFA(pAleas), `${formatPercent(tauxAleas)} Ã¢â‚¬â€ sous-total lots. Formule tracÃƒÂ©e.`]);
    budgetTceRows.push(["ENVELOPPE GLOBALE ESTIMATIVE DU PROJET", formatFCFA(pTotal), `Ratio moyen : env. ${formatFCFA(Math.round(pTotal / sdpTotale))} / mÃ‚Â² de plancher`]);

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Macro-Lot Technique TCE', 'Montant PrÃƒÂ©visionnel', 'Prestations & MatÃƒÂ©riaux NormalisÃƒÂ©s Inclus']],
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
      ["1. Bornage Contradictoire", "GÃƒÂ©omÃƒÂ¨tre-Expert AgrÃƒÂ©ÃƒÂ© (OGES)", "Plan de bornage rÃƒÂ©gulier et scellement des bornes physiques."],
      ["2. Plans Architecturaux VisÃƒÂ©s", "Architecte inscrit ÃƒÂ  l'ODAS", "Recours ÃƒÂ  l'architecte obligatoire pour la construction ou la modification de bÃƒÂ¢timents (art. R.407, dÃƒÂ©cret nÃ‚Â° 2025-1194)."],
      ["3. Note de Calcul de StabilitÃƒÂ©", "Bureau d'Ãƒâ€°tudes Techniques (BET)", "Justification des sections de bÃƒÂ©ton et armatures selon BAEL 91 R99."],
      ["4. DÃƒÂ©pÃƒÂ´t Plateforme TELEDAC", "Direction de l'Urbanisme / Mairie", "Instruction administrative prÃƒÂ©alable Ã¢â‚¬â€ arrÃƒÂªtÃƒÂ© signÃƒÂ© obligatoire avant ouverture de chantier (dÃƒÂ©lai estimÃƒÂ© selon commune)."],
      ["5. Contrat & Clauses COCC", "Entreprise GÃƒÂ©nÃƒÂ©rale / TÃƒÂ¢cheron", "Imposer le contrat type avec retenue de garantie 5% et respect des 6 points d'arrÃƒÂªt."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ãƒâ€°tape Administrative', 'Professionnel CompÃƒÂ©tent', 'Cadre RÃƒÂ©glementaire (Loi 2023-20 & DÃƒÂ©cret 2025-1194)']],
      etapesTeledac,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 46 },
        2: { cellWidth: 76 }
      }
    ));

    // Bloc de visa technique Ã¢â‚¬â€ fond rouge, texte blanc (contraste Ã¢â€°Â¥ 4,5:1)
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
    doc.text("VISA TECHNIQUE DU BUREAU D'Ãƒâ€°TUDES INDÃƒâ€°PENDANT CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    // Corps du disclaimer : texte blanc normal
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'ÃƒÂ©tudes agrÃƒÂ©ÃƒÂ©. Les valeurs rÃƒÂ©glementaires (COS max, capacitÃƒÂ© portante, ratios) doivent ÃƒÂªtre confirmÃƒÂ©es par des professionnels qualifiÃƒÂ©s avant tout engagement financier ou dÃƒÂ©pÃƒÂ´t de permis.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerLines, MARGIN_LEFT + 4, currentY + 11);
    doc.text(`Rapport ÃƒÂ©mis ÃƒÂ  Dakar le ${currentDate} pour le compte exclusif de ${clientName}. RÃƒÂ©f: ${refDoc}`, MARGIN_LEFT + 4, currentY + 19);
  }

  // =========================================================================
  // 2. LIVRABLE : BORDEREAU QUANTITATIF ESTIMATIF (BQE) GROS Ã…â€œUVRE EXPRESS (4 PAGES)
  // =========================================================================
  function renderExpress(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃƒÂ®tre d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const surface = parseFloat(data.surface) || 200;
    const levels = parseInt(data.exact_levels || '1', 10);
    const totalLevelsCount = levels + 1;
    const slabType = data.slab_type || 'hourdis';
    const soilType = data.soil_type || 'normal';
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const lotNumber = data.lot_number || 'Non spÃƒÂ©cifiÃƒÂ©';

    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const enrobageCm = isMarine ? 4.5 : 3.0;
    const enrobageCmStr = isMarine ? "4,5" : "3,0";

    // Formatters locaux pour virgules dÃƒÂ©cimales franÃƒÂ§aises
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

    // Ciment dÃƒÂ©composÃƒÂ© bÃƒÂ©ton + mortiers
    const DOSAGE_BETON_KG_M3 = 350;
    const sacsCimentBeton = Math.round(vTotalBeton * DOSAGE_BETON_KG_M3 / 50);
    const sMursEstimee = Math.round(surface * 2.8);
    const sacsCimentMortiers = Math.round(sMursEstimee * 20 / 50);
    const totalSacsCiment = sacsCimentBeton + sacsCimentMortiers;
    const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);

    // RelevÃƒÂ©s de prix de marchÃƒÂ© Dakar 2026 (indicatifs, non officiels)
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

    // DÃƒÂ©coupage par phase
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
    // PAGE 1 : CUBATURES & SYNTHÃƒË†SE DES RATIOS
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Ã…â€œuvre", "Partie I : MÃƒÂ©trÃƒÂ© Volumique BÃƒÂ©ton & Besoins en MatÃƒÂ©riaux Structurels (BAEL 91 R99)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÃƒË†TRES DE DIMENSIONNEMENT DU BÃƒâ€šTIMENT & LOCALISATION", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃƒÂ®tre d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`TÃƒÂ©lÃƒÂ©phone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface DÃƒÂ©veloppÃƒÂ©e (SDP) : env. ${surface} mÃ‚Â²`, MARGIN_LEFT + 4, 75);
    doc.text(`Ãƒâ€°lÃƒÂ©vation : R+${levels} (${totalLevelsCount} niveaux)`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Type Plancher : ${slabType === 'dalle_pleine' ? 'Dalle Pleine BA' : 'Corps Creux 16+4'}`, 108, 69);
    doc.text(`Milieu d'Exposition : ${isMarine ? 'Marin Agressif (Cales 4,5 cm)' : 'Standard (Cales 3,0 cm)'}`, 108, 75);
    doc.text(`Nature du Sol : ${soilType === 'rocheux' ? 'Rocheux compact' : (soilType === 'sable' ? 'Sable dunaire' : 'Normal / LatÃƒÂ©ritique')}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. SYNTHÃƒË†SE DES RATIOS D'INGÃƒâ€°NIERIE & CUBATURES PRINCIPALES (BAEL 91 R99)");

    const ratioAcierDetail = isMarine
      ? `Ratio effectif : ${ratioAcierM3} kg/mÃ‚Â³ de bÃƒÂ©ton (base ${ratioAcierM3 - 5} kg + 5 kg/mÃ‚Â³ zone marine inclus)`
      : `Ratio : ${ratioAcierM3} kg/mÃ‚Â³ de bÃƒÂ©ton armÃƒÂ© structural`;

    const syntheseRows = [
      ["BÃƒÂ©ton ArmÃƒÂ© Structurel (fc28 >= 25 MPa)", `${fr1(vTotalBeton)} mÃ‚Â³`, `Ratio : ${fr2(vTotalBeton / surface)} mÃ‚Â³/mÃ‚Â². Fondations + poteaux + poutres + dalles.`],
      ["Aciers Haute AdhÃƒÂ©rence FeE500", `${fr2(tonnageAcierTotal)} Tonnes (${formatNum(kgAcierTotal)} kg)`, ratioAcierDetail],
      ["Ciment CEM II 42.5R (SOCOCIM / Dangote)", `${formatNum(totalSacsCiment)} Sacs (env. ${fr1(tonnesCiment)} T)`, `BÃƒÂ©ton (${formatNum(sacsCimentBeton)} sacs) + Mortiers (${formatNum(sacsCimentMortiers)} sacs)`],
      ["Gravier Basalte ConcassÃƒÂ© (CarriÃƒÂ¨res Diack)", `${formatNum(volGravierBasalte)} mÃ‚Â³`, `Formule : ${fr1(vTotalBeton)} mÃ‚Â³ bÃƒÂ©ton Ã¢â‚¬â€ 0,80. Basalte Diack recommandÃƒÂ©.`],
      ["Sable Dunaire LavÃƒÂ© Propre (Kayar / Diender)", `${formatNum(volSableKayar)} mÃ‚Â³`, `Formule : ${fr1(vTotalBeton)} mÃ‚Â³ bÃƒÂ©ton Ã¢â‚¬â€ 0,45. Sable propre sans sel.`],
      ["Agglos VibrÃƒÂ©s NormalisÃƒÂ©s (15 & 20)", `${formatNum(nbAgglos15 + nbAgglos20)} UnitÃƒÂ©s`, `Agglos 15 (${formatNum(nbAgglos15)}) + Agglos 20 (${formatNum(nbAgglos20)}) Ã¢â‚¬â€ 12,5 U/mÃ‚Â²`],
      ["Plancher Hourdis Entrevous BÃƒÂ©ton", slabType === 'dalle_pleine' ? "Dalle Pleine BA" : `${formatNum(nbHourdis)} Hourdis`, slabType === 'dalle_pleine' ? "Coffrage intÃƒÂ©gral dalle pleine" : `${formatNum(nbHourdis)} U Ã¢â‚¬â€ ratio 8,5 U/mÃ‚Â² planchers hauts`]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DÃƒÂ©signation du MatÃƒÂ©riau', 'Quantitatif Global CalculÃƒÂ©', 'Prescription & Ratio d\'IngÃƒÂ©nierie']],
      syntheseRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. SPÃƒâ€°CIFICATIONS TECHNIQUES DU BÃƒâ€°TON & SÃƒâ€°CURITÃƒâ€° DES OUVRAGES");

    const securiteRows = [
      ["Classe de RÃƒÂ©sistance BÃƒÂ©ton", "B25 (fc28 >= 25 MPa)", "RecommandÃƒÂ© selon les rÃƒÂ¨gles professionnelles pour poteaux, poutres et planchers"],
      ["Dosage usuel recommandÃƒÂ©", "350 kg/mÃ‚Â³ (CEM II 42.5R)", "7 sacs de 50 kg par mÃƒÂ¨tre cube de bÃƒÂ©ton mis en Ã…â€œuvre"],
      ["Calage d'Enrobage PrÃƒÂ©conisÃƒÂ©", `${enrobageCmStr} cm avec cales bÃƒÂ©ton`, isMarine ? "Milieu marin agressif (BAEL 91 R99, art. A.7.2.4)" : "Milieu non agressif standard (recommandation BAEL 91 R99)"],
      ["Vibration du BÃƒÂ©ton Frais", "Aiguille vibrante recommandÃƒÂ©e", "DÃƒÂ©conseillÃƒÂ© : risque de nids de cailloux (serrage manuel au fer ÃƒÂ  bÃƒÂ©ton ÃƒÂ  proscrire)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant / Phase', 'SpÃƒÂ©cification Technique', 'Norme & RÃƒÂ¨gle de l\'Art']],
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
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Ã…â€œuvre", "Partie II : Calibrage des Aciers FeE500 & Bordereau Estimatif Fournitures 2026", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. NOMENCLATURE & CALIBRAGE DES ARMATURES HAUTE ADHÃƒâ€°RENCE FeE500");

    const aciersRows = [
      ["Aciers HA 14 & HA 16", `${formatNum(kgHA14_16)} kg (${fr2(kgHA14_16 / 1000)} T)`, "Aciers longitudinaux des semelles de fondation et poteaux du RDC"],
      ["Aciers HA 12", `${formatNum(kgHA12)} kg (${fr2(kgHA12 / 1000)} T)`, "Armatures principales des poutres maÃƒÂ®tresses et poteaux des ÃƒÂ©tages"],
      ["Aciers HA 10", `${formatNum(kgHA10)} kg (${fr2(kgHA10 / 1000)} T)`, "Aciers chapeaux de dalle, poutrelles hourdis et linteaux"],
      ["Aciers HA 8", `${formatNum(kgHA8)} kg (${fr2(kgHA8 / 1000)} T)`, "Armatures de rÃƒÂ©partition, chaÃƒÂ®nages verticaux et renforts d'angles"],
      ["Aciers HA 6", `${formatNum(kgHA6)} kg (${fr2(kgHA6 / 1000)} T)`, "Cadres, ÃƒÂ©triers et ÃƒÂ©pingles anti-flambement des poteaux et poutres"],
      [`Fil de Recuit & Cales (${enrobageCmStr} cm)`, `${formatNum(filRecuitKg)} kg de fil + cales`, `Enrobage ${enrobageCmStr} cm ${isMarine ? '(zone cÃƒÂ´tiÃƒÂ¨re/saline)' : '(milieu standard)'}`],
      ["TOTAL ACIERS HAUTE ADHÃƒâ€°RENCE FeE500", `${formatNum(kgAcierTotal)} kg (env. ${fr2(tonnageAcierTotal)} T)`, "Fers certifiÃƒÂ©s SOCOCIM / Senbus / Someta ÃƒÂ  haute limite ÃƒÂ©lastique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DiamÃƒÂ¨tre Commercial & Type d\'Armature', 'Poids Requis', 'Destination Structurelle']],
      aciersRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. BORDEREAU ESTIMATIF FOURNITURES MATÃƒâ€°RIAUX (RELEVÃƒâ€°S DE PRIX DE MARCHÃƒâ€° Ã¢â‚¬â€ DAKAR 2026, INDICATIFS, NON OFFICIELS)");

    const bordereauRows = [
      ["Aciers FeE500 (Barres de 12 m)", `${fr2(tonnageAcierTotal)} Tonnes`, `${formatFCFA(PRIX_ACIER_TONNE)} / T`, formatFCFA(totalAcierF), "Aciers certifiÃƒÂ©s sans rouille feuilletÃƒÂ©e"],
      ["Ciment CEM II 42.5R (Sacs 50 kg)", `${formatNum(totalSacsCiment)} Sacs`, `${formatFCFA(PRIX_CIMENT_SAC)} / Sac`, formatFCFA(totalCimentF), "SOCOCIM / Dangote / Sahel"],
      ["Gravier Basalte Diack (8/16 & 16/25)", `${formatNum(volGravierBasalte)} mÃ‚Â³`, `${formatFCFA(PRIX_GRAVIER_M3)} / mÃ‚Â³`, formatFCFA(totalGravierF), "Basalte concassÃƒÂ© haute compacitÃƒÂ©"],
      ["Sable Dunaire LavÃƒÂ© (Kayar / Diender)", `${formatNum(volSableKayar)} mÃ‚Â³`, `${formatFCFA(PRIX_SABLE_M3)} / mÃ‚Â³`, formatFCFA(totalSableF), "Sable propre sans vase ni sel"],
      ["Agglos Creux VibrÃƒÂ©s de 15", `${formatNum(nbAgglos15)} U`, `${PRIX_AGGLO_15} FCFA / U`, formatFCFA(nbAgglos15 * PRIX_AGGLO_15), "Ãƒâ€°lÃƒÂ©vations murs extÃƒÂ©rieurs et refends"],
      ["Agglos Pleins VibrÃƒÂ©s de 20", `${formatNum(nbAgglos20)} U`, `${PRIX_AGGLO_20} FCFA / U`, formatFCFA(nbAgglos20 * PRIX_AGGLO_20), "Murs de soubassement sous longrines"]
    ];
    if (nbHourdis > 0) {
      bordereauRows.push(["Entrevous Hourdis BÃƒÂ©ton 16 cm", `${formatNum(nbHourdis)} U`, `${PRIX_HOURDIS} FCFA / U`, formatFCFA(totalHourdisF), "Hourdis normalisÃƒÂ©s pour planchers hauts"]);
    }
    bordereauRows.push(["TOTAL ESTIMATIF FOURNITURES MATÃƒâ€°RIAUX", "-", "-", formatFCFA(totalFournituresTTC), "Total indicatif matÃƒÂ©riaux rendus chantier"]);

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DÃƒÂ©signation MatÃƒÂ©riau', 'QuantitÃƒÂ©', 'Prix Unitaire', 'Montant Total HT', 'Observations']],
      bordereauRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 42 }
      }
    ));

    // Note d'encadrÃƒÂ© sur les relevÃƒÂ©s de prix & tendance conjoncturelle
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.0;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, 23, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, 23, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("NOTE SUR LES RELEVÃƒâ€°S DE PRIX & TENDANCE CONJONCTURELLE :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(51, 65, 85);
    const notePrixLines = doc.splitTextToSize(
      "Ã¢â‚¬Â¢ Ciment type 32.5 : prix plafonnÃƒÂ© ÃƒÂ  3 550 FCFA le sac de 50 kg ÃƒÂ  Dakar (arrÃƒÂªtÃƒÂ© nÃ‚Â° 09852 du 24 juin 2024). Le CEM II 42.5 n'est pas couvert par cet arrÃƒÂªtÃƒÂ© : le prix indiquÃƒÂ© ci-dessus est un relevÃƒÂ© de marchÃƒÂ©.\nÃ¢â‚¬Â¢ Indice ANSD des coÃƒÂ»ts des BTP (IBTP), T2 2026 : +1,0 % sur le trimestre (bÃƒÂ¢timents +1,4 %).",
      USABLE_WIDTH - 8
    );
    doc.text(notePrixLines, MARGIN_LEFT + 4, currentY + 10.5);

    // =========================================================================
    // PAGE 3 : PLANNING D'APPROVISIONNEMENT & CONTRÃƒâ€LE CHANTIER
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Ã…â€œuvre", "Partie III : Planning d'Approvisionnement par Phase & Recettes de BÃƒÂ©tonnage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. PLANNING D'APPROVISIONNEMENT PAR PHASE (ANTI-VOL & ANTI-GASPILLAGE)");

    const planningRows = [
      ["Phase 1 : Fouilles, Fondations & Soubassement", `${formatNum(phase1Ciment)} Sacs`, `${fr2(phase1Acier)} T (HA16, HA14, HA12)`, `${formatNum(p1Gravier)} mÃ‚Â³`, `${formatNum(nbAgglos20)} agglos pleins de 20 + sable`],
      ["Phase 2 : Poteaux RDC & Plancher Haut", `${formatNum(phase2Ciment)} Sacs`, `${fr2(phase2Acier)} T (HA14, HA12, HA8)`, `${formatNum(p2Gravier)} mÃ‚Â³`, `${formatNum(h50a)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15`],
      [`Phase 3 : Ãƒâ€°lÃƒÂ©vations & Planchers Ãƒâ€°tages (R+${levels})`, `${formatNum(phase3Ciment)} Sacs`, `${fr2(phase3Acier)} T (HA12, HA10, HA8)`, `${formatNum(p3Gravier)} mÃ‚Â³`, `${formatNum(h50b)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.4))} agglos 15`],
      ["Phase 4 : Toiture Terrasse, AcrotÃƒÂ¨res & Enduits", `${formatNum(phase4Ciment)} Sacs`, `${fr2(phase4Acier)} T (HA10, HA8, HA6)`, `${formatNum(p4Gravier)} mÃ‚Â³`, `${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15 + sable enduits`]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ãƒâ€°tape des Travaux', 'Quota Ciment 42.5R', 'Quota Aciers FeE500', 'Quota Gravier Diack', 'MatÃƒÂ©riaux ComplÃƒÂ©mentaires']],
      planningRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 48 }
      }
    ));

    // ContrÃƒÂ´le technique bloquant de concordance des phases
    const checkCimentPhases = phase1Ciment + phase2Ciment + phase3Ciment + phase4Ciment;
    const checksPhases = (checkCimentPhases === totalSacsCiment);
    if (!checksPhases) throw new Error("IncohÃƒÂ©rence somme approvisionnement ciment");

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. CONTRÃƒâ€LE DES RATIOS DE BÃƒâ€°TONNAGE & RECETTES CHANTIER (DOSAGE 350 KG)");

    const recettesRows = [
      ["Composition par GÃƒÂ¢chÃƒÂ©e (1 Sac de Ciment)", "1 sac ciment (50 kg) + 1 brouette sable (env. 40 L) + 2 brouettes gravier (env. 80 L) + 22 ÃƒÂ  25 L d'eau propre", "Interdire formellement l'excÃƒÂ¨s d'eau pour faciliter la mise en Ã…â€œuvre (chute drastique de rÃƒÂ©sistance)."],
      ["ContrÃƒÂ´le d'Affaissement au CÃƒÂ´ne d'Abrams", "Affaissement prescrit : 6 ÃƒÂ  9 cm (BÃƒÂ©ton plastique ÃƒÂ  trÃƒÂ¨s maniable)", "Mesure systÃƒÂ©matique ÃƒÂ  l'arrivÃƒÂ©e de chaque toupie ou premiÃƒÂ¨re gÃƒÂ¢chÃƒÂ©e de la journÃƒÂ©e."],
      ["Surveillance des Armatures avant Coulage", "VÃƒÂ©rification des cales d'enrobage, ligature croisÃƒÂ©e et recouvrement minimal (50 diamÃƒÂ¨tres)", "Point d'arrÃƒÂªt obligatoire : coulage strictement interdit sans visa de ferraillage."],
      ["Cure du BÃƒÂ©ton Jeune sous Climat SahÃƒÂ©lien", "Arrosage abondant 2 fois par jour pendant 7 jours minimum ou produit de cure agrÃƒÂ©ÃƒÂ©", "Ãƒâ€°vite la dessiccation prÃƒÂ©maturÃƒÂ©e et les fissures de retrait plastique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['ParamÃƒÂ¨tre de BÃƒÂ©tonnage', 'Exigence ChantierSur', 'ConsÃƒÂ©quence en Cas de Non-Respect']],
      recettesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : RÃƒâ€°CAPITULATIF BUDGÃƒâ€°TAIRE & CLAUSES DE DÃƒâ€°COFFRAGE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros Ã…â€œuvre", "Partie IV : SynthÃƒÂ¨se BudgÃƒÂ©taire Gros Ã…â€œuvre & Clauses de SÃƒÂ©curitÃƒÂ© au DÃƒÂ©coffrage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    const moRatioM2 = levels >= 4 ? 38000 : (levels >= 2 ? 34000 : 28000);
    const totalMainOeuvre = Math.round(surface * moRatioM2);
    const totalGrosOeuvreHT = totalFournituresTTC + totalMainOeuvre;

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÃƒâ€°CAPITULATIF BUDGÃƒâ€°TAIRE GROS Ã…â€œUVRE & CLÃƒâ€°S DE PAIEMENT CONTRAT COCC");

    const recapRows = [
      ["Fournitures MatÃƒÂ©riaux de Base", formatFCFA(totalFournituresTTC), `${Math.round((totalFournituresTTC / totalGrosOeuvreHT) * 100)} %`, "Approvisionnements ÃƒÂ©chelonnÃƒÂ©s selon les 4 phases"],
      ["Main d'Ã…â€œuvre TÃƒÂ¢cheron / Entreprise", formatFCFA(totalMainOeuvre), `${Math.round((totalMainOeuvre / totalGrosOeuvreHT) * 100)} %`, "Paiement liÃƒÂ© exclusivement ÃƒÂ  la validation des 6 points d'arrÃƒÂªt"],
      ["BUDGET TOTAL GROS Ã…â€œUVRE ESTIMATIF", formatFCFA(totalGrosOeuvreHT), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalGrosOeuvreHT / surface))} / mÃ‚Â² SDP`],
      ["Retenue de garantie contractuelle (5 %)", formatFCFA(Math.round(totalGrosOeuvreHT * 0.05)), "5 %", "Clause convenue entre les parties, consignÃƒÂ©e jusqu'ÃƒÂ  la rÃƒÂ©ception dÃƒÂ©finitive. En droit sÃƒÂ©nÃƒÂ©galais, la rÃƒÂ¨gle des 5 % n'existe que pour les marchÃƒÂ©s publics (dÃƒÂ©cret nÃ‚Â° 2022-2295, art. 118-119) ; pour un chantier privÃƒÂ©, elle rÃƒÂ©sulte du contrat, pas de la loi."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste de DÃƒÂ©pense', 'Montant Estimatif', 'Quote-Part', 'Condition de DÃƒÂ©blocage']],
      recapRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 68 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. DÃƒâ€°LAIS DE DÃƒâ€°COFFRAGE RECOMMANDÃƒâ€°S (RÃƒË†GLES PROFESSIONNELLES BAEL 91 R99)");

    const clausesRows = [
      ["Joues de Poutres & Faces de Poteaux", SEUILS_TECHNIQUES.decoffrageJoues, "DÃƒÂ©coffrage possible sans mise en charge. Arrosage immÃƒÂ©diat pour cure."],
      ["Sous-faces de Poutres & Dalles", SEUILS_TECHNIQUES.decoffrageSousFaces, "DÃƒÂ©coffrage dÃƒÂ©conseillÃƒÂ© avant 21 jours sans note de calcul de rÃƒÂ©sistance."],
      ["Ãƒâ€°tais de SÃƒÂ©curitÃƒÂ© sous Poutres MaÃƒÂ®tresses", "Maintien 28 jours", "Conserver 1 ÃƒÂ©tai de soulagement sur deux jusqu'ÃƒÂ  rÃƒÂ©sistance nominale fc28."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ãƒâ€°lÃƒÂ©ment Porteur', 'DÃƒÂ©lai Minimal PrÃƒÂ©conisÃƒÂ©', 'Conditions & PrÃƒÂ©cautions']],
      clausesRows,
      {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 90 }
      }
    ));

    // EncadrÃƒÂ© Ã‚Â« RÃƒâ€°FÃƒâ€°RENCES Ã‚Â» (Style ESQUISSE, articles propres ÃƒÂ  EXPRESS)
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.0;
    const refBoxHeight = 30;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, refBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, refBoxHeight, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("RÃƒâ€°FÃƒâ€°RENCES RÃƒâ€°GLEMENTAIRES, NORMATIVES & SOURCES VÃƒâ€°RIFIÃƒâ€°ES :", MARGIN_LEFT + 4, currentY + 5.2);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(51, 65, 85);
    const refSources = [
      "Ã¢â‚¬Â¢ ArrÃƒÂªtÃƒÂ© nÃ‚Â° 09852 du 24 juin 2024 (prix du ciment type 32.5) ;",
      "Ã¢â‚¬Â¢ DÃƒÂ©cret nÃ‚Â° 2022-2295, art. 118-119 (retenue de garantie Ã¢â‚¬â€ marchÃƒÂ©s publics uniquement) ;",
      "Ã¢â‚¬Â¢ ANSD, Indice des coÃƒÂ»ts des BTP (IBTP), T2 2026 ;",
      "Ã¢â‚¬Â¢ BAEL 91 R99 (rÃƒÂ¨gles professionnelles, rÃƒÂ©fÃƒÂ©rence technique) ;",
      "Ã¢â‚¬Â¢ NF P 06-001 (charges d'exploitation Ã¢â‚¬â€ norme d'usage courant)."
    ];
    let refY = currentY + 9.8;
    for (const source of refSources) {
      doc.text(source, MARGIN_LEFT + 4, refY);
      refY += 3.9;
    }

    // Bandeau VISA technique Ã¢â‚¬â€ fond rouge #BF382B, texte blanc #FFFFFF, pleine largeur
    currentY = currentY + refBoxHeight + TABLE_GAP_MM;
    const visaHeight = 22;
    doc.setFillColor(191, 56, 43); // #BF382B
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, visaHeight, 'F');
    doc.setDrawColor(150, 30, 20);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, visaHeight, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("VISA TECHNIQUE DU BUREAU D'Ãƒâ€°TUDES INDÃƒâ€°PENDANT CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide ÃƒÂ  la dÃƒÂ©cision gÃƒÂ©nÃƒÂ©rÃƒÂ© automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'ÃƒÂ©tudes agrÃƒÂ©ÃƒÂ©. Les quantitatifs, sections d'acier et ratios doivent ÃƒÂªtre confirmÃƒÂ©s par des professionnels qualifiÃƒÂ©s avant tout engagement financier ou commande de matÃƒÂ©riaux.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerLines, MARGIN_LEFT + 4, currentY + 11);
    doc.text(`Rapport ÃƒÂ©mis ÃƒÂ  Dakar le ${currentDate} pour le compte exclusif de ${clientName}. RÃƒÂ©f: ${refDoc}`, MARGIN_LEFT + 4, currentY + 19);
  }

  // =========================================================================
  // 3. LIVRABLE : CONTRE-EXPERTISE & AUDIT DEVIS BTP (4 PAGES)
  // =========================================================================
  // =========================================================================
  // 3. LIVRABLE : AUDIT DEVIS (4 PAGES)
  // =========================================================================
function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);

    // â”€â”€ Extraction des donnÃ©es du client â”€â”€
    const clientName = (data.client_name || "Maitre d'Ouvrage").trim();
    const rawPrefix  = (data.phone_prefix || '+221').trim();
    let   rawPhone   = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    // â”€â”€ Entreprise â”€â”€
    const companyName    = data.company_name    || 'Entreprise Non IdentifiÃ©e';
    const companyNinea   = data.company_ninea   || '';
    const companyRccm    = data.company_rccm    || '';
    const companyPhone2  = data.company_phone   || '';
    const companyAddress = data.company_address || '';

    // â”€â”€ Projet & devis â”€â”€
    const devisObjet      = data.devis_objet      || 'Non prÃ©cisÃ©';
    const devisNumber     = data.devis_number     || 'Non prÃ©cisÃ©';
    const devisDate       = data.devis_date       || currentDate;
    const buildingUsage   = data.building_usage   || 'unifamilial';
    const projectLocation = data.project_location || 'Dakar - Zone Urbaine';
    const sdp             = parseFloat(data.surface)      || 0;
    const levels          = parseInt(data.exact_levels || '1', 10);

    // â”€â”€ Lignes du devis â”€â”€
    let rawLines = data.devis_lines || [];
    console.log("PDF rendu : " + rawLines.length + " lignes après construction des données du PDF.");
    if (typeof rawLines === 'string') {
        try { rawLines = JSON.parse(rawLines); } catch (e) { rawLines = []; }
    }

    if (!Array.isArray(rawLines) || rawLines.length === 0) {
        throw new Error("Aucune ligne validÃ©e â€” retournez Ã  l'Ã©cran de validation");
    }

    // â”€â”€ Conditions contractuelles â”€â”€
    const tvaApplicable   = data.tva_applicable   || 'oui';
    const totalHtIndique  = parseFloat(data.total_ht_indique)  || 0;
    const totalTtcIndique = parseFloat(data.total_ttc_indique) || 0;
    const prixFerme       = data.prix_ferme       || 'non_precise';
    const validiteDevis   = data.validite_devis   || 'Non prÃ©cisÃ©e';
    const delaiExecution  = data.delai_execution  || 'Non prÃ©cisÃ©';
    const acomptePct      = parseFloat(data.acompte_pct)      || 0;
    const echeancier      = data.echeancier       || 'non_precise';
    const retenueGarantie = parseFloat(data.retenue_garantie) || 0;
    const penalites       = data.penalites        || 'non_precise';
    const avenants        = data.avenants         || 'non_precise';
    const assurances      = data.assurances       || 'non_precise';
    const montantLettres  = data.montant_lettres  || 'non';

    // â”€â”€ Calculs globaux â”€â”€
    let totalHtCalcule = 0;
    const computedLines = rawLines.map(line => {
        const u   = line.u   || '';
        const des = line.des || '';
        const nat = line.nat || 'Fourniture et pose';
        const lot = line.lot || '';
        let q   = parseFloat(line.q)   || 0;
        let pu  = parseFloat(line.pu)  || 0;
        let total = parseFloat(line.total) || 0;

        if (u === 'forfait') {
            totalHtCalcule += total;
            return { lot, des, nat, u, q: '-', pu: '-', total, status: 'forfait' };
        } else {
            const rowTotal = Math.round(q * pu);
            totalHtCalcule += rowTotal;
            return { lot, des, nat, u, q, pu, total: rowTotal, status: 'normal' };
        }
    });

    const tvaPct          = 0.18;
    const tvaCalculee     = tvaApplicable === 'oui' ? Math.round(totalHtCalcule * tvaPct) : 0;
    const totalTtcCalcule = totalHtCalcule + tvaCalculee;

    const fmt = (n) => n.toLocaleString('fr-FR');

    let y = 15;
    const leftMargin = 15;
    const rightMargin = 15;
    const pageWidth = 210;
    const usableWidth = pageWidth - leftMargin - rightMargin;

    // â”€â”€ Helper : nouvelle page â”€â”€
    const addPage = () => {
        doc.addPage();
        y = 20;
    };

    // â”€â”€ En-tÃªte cartouche â”€â”€
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 19, 37);
    doc.text('ChantierSur.com', leftMargin, y);
    doc.setFont('NotoSans', 'normal');
    doc.text(`Dossier : ${refDoc}  |  Date : ${currentDate}`, pageWidth - rightMargin, y, { align: 'right' });
    y += 6;
    doc.setFont('NotoSans', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text("BUREAU D'Ã‰TUDES NUMÃ‰RIQUE INDÃ‰PENDANT  â€¢  AUDIT TECHNIQUE BTP â€” SÃ‰NÃ‰GAL", leftMargin, y);
    y += 5;
    doc.setTextColor(100, 100, 100);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.text(`MaÃ®tre d'Ouvrage : ${clientName}  â€”  TÃ©l : ${clientPhone}`, leftMargin, y);

    // â”€â”€ Titre principal â”€â”€
    y += 12;
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(11, 19, 37);
    doc.text('RAPPORT D\'AUDIT TECHNIQUE DE DEVIS BTP', leftMargin, y);
    y += 7;

    doc.setFont('NotoSans', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Outil d'aide Ã  la dÃ©cision. Analyse automatisÃ©e indicative â€” sans valeur d'expertise judiciaire. Document confidentiel, usage exclusif du destinataire dÃ©signÃ©.", leftMargin, y);
    y += 10;

    // â”€â”€ Bandeau confidentialitÃ© â”€â”€
    const drawConfidentialBanner = () => {
        doc.setFillColor(248, 250, 252);
        doc.rect(leftMargin, y, usableWidth, 9, 'F');
        doc.setFont('NotoSans', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL  â€”  MAÃŽTRE D'OUVRAGE : ${clientName}  â€¢  TÃ‰L : ${clientPhone}`, leftMargin + 2, y + 6);
        y += 14;
    };

    // â”€â”€ Helper tableaux â”€â”€
    const drawTable = (head, body, colStyles) => {
        doc.autoTable({
            startY: y,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 8.5 },
            bodyStyles: { font: 'NotoSans', fontSize: 8.5, textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 3.5, overflow: 'linebreak' },
            columnStyles: colStyles || {
                0: { fontStyle: 'bold', cellWidth: 52 },
                1: { cellWidth: 65 },
                2: { cellWidth: 63 }
            },
            margin: { left: leftMargin, right: rightMargin }
        });
        y = doc.lastAutoTable.finalY + 10;
    };

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PARTIE I â€” Identification du devis & de l'entreprise
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie I â€” Identification du devis & de l\'entreprise', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('I. Devis analysÃ©', leftMargin, y);
    y += 3;
    drawTable(
        [['Ã‰lÃ©ment / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Objet du devis', devisObjet, 'Cadre principal de l\'analyse'],
            ['Date & RÃ©fÃ©rence', `${devisDate}  /  NÂ° ${devisNumber}`, 'TraÃ§abilitÃ© documentaire'],
            ['BÃ¢timent & Gabarit', `${buildingUsage} â€” R+${levels}`, `Base de calcul pour les ratios (SDP indiquÃ©e : ${sdp} mÂ²)`],
            ['Localisation du projet', projectLocation, 'Influence sur le coÃ»t des matÃ©riaux et de la main-d\'Å“uvre']
        ]
    );

    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('II. Entreprise & existence lÃ©gale', leftMargin, y);
    y += 3;
    const rccmStatus  = companyRccm  ? 'RenseignÃ© â€” vÃ©rifier la validitÃ© au RCCM SÃ©nÃ©gal.' : 'Non renseignÃ© â€” demander le numÃ©ro RCCM avant signature.';
    const nineaStatus = companyNinea ? 'RenseignÃ© â€” vÃ©rifier l\'activitÃ© sur le portail DGID.' : 'Absent â€” signale une entreprise potentiellement non immatriculÃ©e. Risque fiscal.';
    drawTable(
        [['Ã‰lÃ©ment / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Nom de l\'entreprise / artisan', companyName, 'IdentitÃ© commerciale dÃ©clarÃ©e'],
            ['NINEA (Identifiant fiscal)', companyNinea || 'Non fourni', nineaStatus],
            ['RCCM (Registre Commerce)', companyRccm || 'Non fourni', rccmStatus],
            ['TÃ©lÃ©phone / Adresse', `${companyPhone2}  â€”  ${companyAddress || 'Non prÃ©cisÃ©e'}`, 'VÃ©rification de l\'ancrage physique de l\'entreprise']
        ]
    );

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PARTIE II â€” ContrÃ´le arithmÃ©tique du devis
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie II â€” ContrÃ´le arithmÃ©tique du devis', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('III. VÃ©rification arithmÃ©tique ligne par ligne (Q Ã— PU = Total)', leftMargin, y);
    y += 3;

    const lignesBody = computedLines.map(l => {
        if (l.status === 'forfait') {
            return [l.lot || 'â€”', l.des, 'Montant forfaitaire', `${fmt(l.total)} FCFA`, 'Demander le dÃ©tail (Q Ã— PU) pour ce forfait'];
        }
        return [l.lot || 'â€”', l.des, `${l.q} ${l.u} Ã— ${fmt(l.pu)} FCFA`, `${fmt(l.total)} FCFA`, 'CalculÃ© par ChantierSur'];
    });

    doc.autoTable({
        startY: y,
        head: [['Lot', 'DÃ©signation', 'DÃ©tail (QtÃ© Ã— PU)', 'Montant CalculÃ©', 'Observation']],
        body: lignesBody.length > 0 ? lignesBody : [['â€”', 'Aucune ligne saisie', 'â€”', 'â€”', 'Veuillez saisir les lignes du devis']],
        theme: 'grid',
        headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { font: 'NotoSans', fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 52, fontStyle: 'bold' },
            2: { cellWidth: 42, halign: 'right' },
            3: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [11, 19, 37] },
            4: { cellWidth: 30 }
        },
        margin: { left: leftMargin, right: rightMargin }
    });
    y = doc.lastAutoTable.finalY + 10;

    if (y > 240) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('IV. CohÃ©rence des totaux HT, TVA et TTC', leftMargin, y);
    y += 3;

    const diffHt  = totalHtIndique  > 0 ? (totalHtIndique  - totalHtCalcule)  : 0;
    const diffTtc = totalTtcIndique > 0 ? (totalTtcIndique - totalTtcCalcule) : 0;
    const diffHtStr  = diffHt  !== 0 ? `Ã‰cart de ${fmt(Math.abs(diffHt))} FCFA (${diffHt > 0 ? 'devis supÃ©rieur' : 'devis infÃ©rieur'} au calculÃ©)` : 'Conforme aux calculs ligne Ã  ligne';
    const diffTtcStr = diffTtc !== 0 ? `Ã‰cart de ${fmt(Math.abs(diffTtc))} FCFA (${diffTtc > 0 ? 'devis supÃ©rieur' : 'devis infÃ©rieur'} au calculÃ©)` : 'Conforme aux calculs ligne Ã  ligne';

    drawTable(
        [['Ã‰lÃ©ment / Clause', 'Valeur / Constat', 'Justification / Point de vigilance']],
        [
            ['Total HT â€” IndiquÃ© vs CalculÃ©', `Ind. : ${fmt(totalHtIndique)} FCFA  /  Calc. : ${fmt(totalHtCalcule)} FCFA`, diffHtStr],
            ['TVA applicable', tvaApplicable === 'oui' ? '18%' : 'Non appliquÃ©e (0%)', tvaApplicable === 'oui' ? `TVA calculÃ©e : ${fmt(tvaCalculee)} FCFA` : 'VÃ©rifier si l\'entreprise bÃ©nÃ©ficie d\'une exonÃ©ration lÃ©gale.'],
            ['Total TTC â€” IndiquÃ© vs CalculÃ©', `Ind. : ${fmt(totalTtcIndique)} FCFA  /  Calc. : ${fmt(totalTtcCalcule)} FCFA`, diffTtcStr]
        ]
    );

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PARTIE III â€” Analyse des prix & des quantitÃ©s
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie III â€” Analyse des prix & des quantitÃ©s', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('V. Analyse des prix unitaires', leftMargin, y);
    y += 3;

    const analysePrixBody = computedLines.map(l => {
        if (l.status === 'forfait') {
            return [l.des, 'Montant forfaitaire', 'Demander obligatoirement le dÃ©tail Q Ã— PU avant acceptation.'];
        }
        return [l.des, `PU indiquÃ© : ${fmt(l.pu)} FCFA/${l.u}`, 'Ã€ valider par un technicien sur site.'];
    });

    doc.autoTable({
        startY: y,
        head: [['DÃ©signation', 'Prix Unitaire IndiquÃ©', 'Point de vigilance / Observation']],
        body: analysePrixBody.length > 0 ? analysePrixBody : [['â€”', 'â€”', 'Aucune ligne Ã  analyser']],
        theme: 'grid',
        headStyles: { fillColor: [11, 19, 37], textColor: [255, 255, 255], font: 'NotoSans', fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { font: 'NotoSans', fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 3, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 68, fontStyle: 'bold' },
            1: { cellWidth: 44, halign: 'right' },
            2: { cellWidth: 68 }
        },
        margin: { left: leftMargin, right: rightMargin }
    });
    y = doc.lastAutoTable.finalY + 10;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PARTIE IV â€” Analyse contractuelle & recommandations
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(11, 19, 37);
    doc.text('Partie IV â€” Analyse contractuelle & recommandations', leftMargin, y);
    y += 5;
    drawConfidentialBanner();

    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('VI. Clauses contractuelles â€” Ã‰tat & Points de vigilance', leftMargin, y);
    y += 3;

    const contractRows = [
        ['Prix (Ferme / RÃ©visable)', prixFerme === 'ferme' ? 'Prix ferme' : (prixFerme === 'revisable' ? 'Prix rÃ©visable' : 'Non prÃ©cisÃ©'), prixFerme === 'ferme' ? 'SÃ©curisant pour le MaÃ®tre d\'Ouvrage.' : 'Exiger un indice de rÃ©vision clairement dÃ©fini.'],
        ['ValiditÃ© du devis', validiteDevis, 'VÃ©rifier la pÃ©riode de validitÃ© des prix matÃ©riaux et main-d\'Å“uvre.'],
        ['DÃ©lai d\'exÃ©cution', delaiExecution, 'Adosser impÃ©rativement le dÃ©marrage Ã  la signature ou Ã  la rÃ©ception de l\'acompte.'],
        ['Acompte demandÃ©', `${acomptePct} %`, acomptePct >= 30 ? 'Acompte Ã©levÃ© â€” nÃ©gocier et lier Ã  des phases d\'avancement vÃ©rifiables.' : acomptePct > 0 ? 'Standard â€” adosser au dÃ©marrage des travaux.' : 'Non prÃ©cisÃ©.'],
        ['Ã‰chÃ©ancier de paiement', echeancier === 'oui' ? 'AdossÃ© Ã  l\'avancement' : 'Non adossÃ© Ã  l\'avancement', echeancier === 'oui' ? 'Conforme aux bonnes pratiques contractuelles.' : 'Payer uniquement Ã  l\'avancement rÃ©el constatÃ© â€” ne jamais payer Ã  l\'avance.'],
        ['Retenue de garantie', `${retenueGarantie} %`, retenueGarantie >= 5 ? 'Protecteur pour la levÃ©e des rÃ©serves.' : 'Recommandation : retenir 5 % payables Ã  rÃ©ception sans rÃ©serves.'],
        ['PÃ©nalitÃ©s de retard', penalites === 'oui' ? 'PrÃ©vues' : 'Non prÃ©vues', penalites === 'oui' ? 'Encourage le respect du calendrier.' : 'Fixer des pÃ©nalitÃ©s journaliÃ¨res en cas de dÃ©passement du dÃ©lai contractuel.'],
        ['Avenants / Travaux supplÃ©mentaires', avenants === 'ecrit_exige' ? 'Accord Ã©crit exigÃ©' : 'Non prÃ©cisÃ©', avenants === 'ecrit_exige' ? 'Conforme â€” aucun travail hors marchÃ© ne doit Ãªtre engagÃ© sans avenant signÃ©.' : 'PrÃ©ciser qu\'aucun travail supplÃ©mentaire ne sera rÃ©glÃ© sans accord Ã©crit prÃ©alable.'],
        ['Assurances (RC & DÃ©cennale)', assurances === 'oui' ? 'MentionnÃ©es' : 'Non mentionnÃ©es', assurances === 'oui' ? 'Demander copie de l\'attestation en cours de validitÃ© avant tout dÃ©marrage.' : 'Risque pour les garanties aprÃ¨s rÃ©ception â€” exiger les attestations.'],
        ['Montant arrÃªtÃ© en lettres', montantLettres === 'oui' ? 'PrÃ©sent' : 'Absent', montantLettres === 'oui' ? 'PrÃ©vient les fraudes et contestations.' : 'Exiger le montant arrÃªtÃ© en lettres sur tout document contractuel.']
    ];

    drawTable(
        [['Clause', 'Constat', 'Point de vigilance / Recommandation']],
        contractRows,
        {
            0: { cellWidth: 44, fontStyle: 'bold' },
            1: { cellWidth: 36 },
            2: { cellWidth: 100 }
        }
    );

    if (y > 230) addPage();
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(10);
    doc.text('VII. SynthÃ¨se financiÃ¨re & leviers de nÃ©gociation', leftMargin, y);
    y += 6;

    const sdpRef    = sdp > 0 ? sdp : 150;
    const ratioCalc = sdpRef > 0 ? Math.round(totalHtCalcule / sdpRef) : 0;

    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const synthLines = [
        `Total HT recalculÃ© par ChantierSur : ${fmt(totalHtCalcule)} FCFA`,
        `TVA (${tvaApplicable === 'oui' ? '18 %' : '0 %'}) : ${fmt(tvaCalculee)} FCFA`,
        `Total TTC recalculÃ© : ${fmt(totalTtcCalcule)} FCFA`,
        `Ratio global HT / mÂ² SDP : ${fmt(ratioCalc)} FCFA/mÂ² (SDP renseignÃ©e : ${sdpRef} mÂ²)`,
        '',
        'Leviers de nÃ©gociation recommandÃ©s :',
        '  1. Exiger le dÃ©tail Q Ã— PU pour tous les postes Â« forfaitaires Â».',
        '  2. Adosser systÃ©matiquement les paiements Ã  la constatation visuelle de l\'avancement rÃ©el.',
        '  3. Consigner par Ã©crit la retenue de garantie (5 %) et les pÃ©nalitÃ©s de retard.',
        '  4. Demander copie des attestations d\'assurance RC et dÃ©cennale avant tout dÃ©marrage.'
    ];
    synthLines.forEach(line => {
        if (y > 275) addPage();
        if (line === '') { y += 4; return; }
        doc.text(line, leftMargin + (line.startsWith('  ') ? 4 : 0), y);
        y += 5.5;
    });
    y += 8;

    // â”€â”€ Cadre de clÃ´ture confidentiel â”€â”€
    if (y > 255) addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(leftMargin, y, usableWidth, 24, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(leftMargin, y, usableWidth, 24, 'D');
    doc.setFont('NotoSans', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(11, 19, 37);
    doc.text('DOCUMENT GÃ‰NÃ‰RÃ‰ AUTOMATIQUEMENT PAR CHANTIERSUR.COM', leftMargin + 5, y + 6);
    doc.setFont('NotoSans', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`RÃ©fÃ©rence du dossier : ${refDoc}  |  Ã‰mis le : ${currentDate}`, leftMargin + 5, y + 12);
    doc.text(`Destinataire exclusif : ${clientName}  â€”  Usage strictement personnel et confidentiel.`, leftMargin + 5, y + 18);
}

  function renderFinitions(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'MaÃƒÂ®tre d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const surface = parseFloat(data.surface) || 250;
    const levels = parseInt(data.exact_levels || '1', 10);
    const totalLevelsCount = levels + 1;
    const standing = data.standing || 'moyen';
    const tileType = data.tile_type || 'gres_cerame_60';
    const joineryType = data.joinery_type || 'alu_vitre';
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const lotNumber = data.lot_number || 'Non spÃƒÂ©cifiÃƒÂ©';
    const delaiReserves = parseInt(data.delai_reserves, 10) || 15;

    // Ratios second Ã…â€œuvre 2026
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
    if (checkSommeCarrelage !== totalLotCarrelageF) throw new Error("IncohÃƒÂ©rence somme carrelage");

    const totalEtancheiteF = Math.round(sToitureTerrasse * prixEtancheiteM2);
    const nbSallesEau = Math.max(2, Math.round(surface / 65));
    const totalEtancheiteHumideF = nbSallesEau * 120000;

    // Plomberie EU/EP dÃƒÂ©composÃƒÂ©e
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

    // Ãƒâ€°lectricitÃƒÂ© NF C 15-100 (0,55 pt/mÃ‚Â²)
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

    // Menuiseries dÃƒÂ©composÃƒÂ©es
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

    // Peinture dÃƒÂ©composÃƒÂ©e
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
    // PAGE 1 : CARRELAGE & Ãƒâ€°TANCHÃƒâ€°ITÃƒâ€° TOITURE
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Ã…â€œuvre", "Partie I : RevÃƒÂªtements de Sol, FaÃƒÂ¯ences Murales & Ãƒâ€°tanchÃƒÂ©itÃƒÂ© Toiture", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÃƒË†TRES DES FINITIONS & SPÃƒâ€°CIFICATIONS DU STANDING", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃƒÂ®tre d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`TÃƒÂ©lÃƒÂ©phone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface DÃƒÂ©veloppÃƒÂ©e : env. ${surface} mÃ‚Â²`, MARGIN_LEFT + 4, 75);
    doc.text(`Standing Choisi : ${standing.toUpperCase()}`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`RevÃƒÂªtement Sol : ${tileType.replace(/_/g, ' ').toUpperCase()}`, 108, 69);
    doc.text(`Menuiseries : ${joineryType.replace(/_/g, ' ').toUpperCase()}`, 108, 75);
    doc.text(`DÃƒÂ©lai LevÃƒÂ©e RÃƒÂ©serves : ${delaiReserves} jours calendaires`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. LOT REVÃƒÅ TEMENTS DE SOL & FAÃƒÂENCES MURALES (DTU 52.1)");

    const carrelageRows = [
      ["Carrelage Sol SÃƒÂ©jour & Chambres", `${sSolCarrelee} mÃ‚Â²`, `${formatFCFA(prixCarrelageM2)} / mÃ‚Â²`, formatFCFA(totalCarrelageSolF), "GrÃƒÂ¨s cÃƒÂ©rame ÃƒÂ©maillÃƒÂ© antidÃƒÂ©rapant R10"],
      ["FaÃƒÂ¯ences Murales Cuisines & Salles d'Eau", `${sMursFaience} mÃ‚Â²`, `${formatFCFA(prixFaienceM2)} / mÃ‚Â²`, formatFCFA(totalFaienceF), "Carreaux muraux jusqu'ÃƒÂ  2,10 m de hauteur"],
      ["Mortier-Colle C2TE SpÃƒÂ©cial Fortes Chaleurs", `${sacsColleRequis} Sacs (25 kg)`, "4 500 FCFA / Sac", formatFCFA(totalColleF), "Rendement indicatif : 6,5 mÃ‚Â² / sac (double encollage)"],
      ["Joint de Carrelage Hydrofuge & Anti-Moisissures", `${sacsJointRequis} Sacs (5 kg)`, "3 500 FCFA / Sac", formatFCFA(totalJointF), "Rendement indicatif : 22 mÃ‚Â² / sac (largeur 3 mm)"],
      ["TOTAL FOURNITURES CARRELAGE & FAÃƒÂENCE", "-", "-", formatFCFA(totalLotCarrelageF + totalFaienceF), "Fournitures complÃƒÂ¨tes avec colles et joints"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['DÃƒÂ©signation du Poste', 'Surface / QuantitÃƒÂ©', 'Fourniture & Pose', 'Montant Estimatif HT', 'Prescription DTU']],
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
    drawSectionTitle(doc, currentY, "II. LOT Ãƒâ€°TANCHÃƒâ€°ITÃƒâ€° TOITURE-TERRASSE & PIÃƒË†CES HUMIDES (DTU 43.1)");

    const etancheiteRows = [
      ["Complexe Toiture Terrasse Accessible", `${sToitureTerrasse} mÃ‚Â²`, "Bicouche bitumineux ÃƒÂ©lastomÃƒÂ¨re SBS 4 mm", formatFCFA(totalEtancheiteF), "RelevÃƒÂ©s d'ÃƒÂ©tanchÃƒÂ©itÃƒÂ© 15 cm + chape de protection"],
      ["Ãƒâ€°tanchÃƒÂ©itÃƒÂ© sous Carrelage Salles d'Eau", `${nbSallesEau} Salles d'eau`, "SystÃƒÂ¨me d'Ãƒâ€°tanchÃƒÂ©itÃƒÂ© Liquide (SEL)", formatFCFA(totalEtancheiteHumideF), "Traitement rigoureux des siphons et pieds de cloisons"],
      ["Forme de Pente & Ãƒâ€°vacuations Pluviales", `${sToitureTerrasse} mÃ‚Â²`, "Pente minimale 1,5% vers gargouilles", "Inclus gros Ã…â€œuvre", "Deux moignons d'ÃƒÂ©vacuation par terrasse au minimum"],
      ["TOTAL ESTIMATIF Ãƒâ€°TANCHÃƒâ€°ITÃƒâ€° OUVRAGES", "-", "-", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), "Protection vitale contre les sinistres d'hivernage"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ouvrage d\'Ãƒâ€°tanchÃƒÂ©itÃƒÂ©', 'Surface TraitÃƒÂ©e', 'SystÃƒÂ¨me PrÃƒÂ©conisÃƒÂ©', 'Montant Estimatif HT', 'RÃƒÂ¨gle Normative']],
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
    // PAGE 2 : PLOMBERIE EU/EP & Ãƒâ€°LECTRICITÃƒâ€°
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Ã…â€œuvre", "Partie II : Plomberie Sanitaire (EU/EP) & Ãƒâ€°lectricitÃƒÂ© Basse Tension (NF C 15-100)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. LOT PLOMBERIE SANITAIRE & Ãƒâ€°VACUATIONS EU/EP (DTU 60.1)");

    const plomberieRows = [
      ["Appareils Sanitaires (WC suspendus / Lavabos)", `${qSanitaires} Ensembles`, `${formatFCFA(puSanitaires)} / Ens.`, formatFCFA(montantSanitaires), "Cuvettes cÃƒÂ©ramique NF avec mÃƒÂ©canisme silencieux"],
      ["Robinetterie & Mitigeurs CÃƒÂ©ramiques", `${qMitigeurs} PiÃƒÂ¨ces`, `${formatFCFA(puMitigeurs)} / U`, formatFCFA(montantMitigeurs), "Mitigeurs chromÃƒÂ©s cartouche cÃƒÂ©ramique 35 mm"],
      ["RÃƒÂ©seaux Alimentation PER/Multicouche", `${qAlim} Salles de bain`, `${formatFCFA(puAlim)} / Ens.`, formatFCFA(montantAlim), "Tubes sous gaine anti-corrosion sans raccord encastrÃƒÂ©"],
      ["Ãƒâ€°vacuations Eaux UsÃƒÂ©es / Eaux Pluviales (EU/EP)", "Ensemble rÃƒÂ©seau", "Forfait calibrÃƒÂ©", "Inclus aux postes", "Tubes PVC NF ÃƒÂ©vacuation de 50, 100 et 110 mm"],
      ["TOTAL ESTIMATIF PLOMBERIE EU/EP", "-", "-", formatFCFA(totalPlomberieF), "Fourniture des ÃƒÂ©quipements et collecteurs"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ãƒâ€°quipement Sanitaire / RÃƒÂ©seau', 'Quantitatif', 'Prix Unitaire EstimÃƒÂ©', 'Montant Total HT', 'Prescription DTU 60.1']],
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
    drawSectionTitle(doc, currentY, "IV. LOT Ãƒâ€°LECTRICITÃƒâ€° & COURANTS FAIBLES (NORME NF C 15-100)");

    const electriciteRows = [
      ["Points Ãƒâ€°lectriques CalibrÃƒÂ©s (0,55 pt/mÃ‚Â²)", `${nbPointsElec} Points`, `${formatFCFA(puPointElec)} / Pt`, formatFCFA(montantPoints), "Prises de courant, ÃƒÂ©clairages LED, interrupteurs Legrand"],
      ["Tableaux Divisionnaires avec DiffÃƒÂ©rentiels 30mA", `${qTableaux} Tableau(x)`, `${formatFCFA(puTableaux)} / U`, formatFCFA(montantTableaux), "Protection par disjoncteurs magnÃƒÂ©tothermiques normalisÃƒÂ©s"],
      ["Lignes Climatisation DÃƒÂ©diÃƒÂ©es (Courbe C)", `${qClim} Lignes`, `${formatFCFA(puClim)} / Ligne`, formatFCFA(montantClim), "Lignes sÃƒÂ©parÃƒÂ©es 2.5 mmÃ‚Â² sous disjoncteur courbe C 16A/20A"],
      ["RÃƒÂ©seau de Terre & Liaison Ãƒâ€°quipotentielle", "1 RÃƒÂ©seau complet", "Seuil normatif < 100 Ohms", "Inclus au lot", "Tension de sÃƒÂ©curitÃƒÂ© 50V max pour locaux humides"],
      ["TOTAL ESTIMATIF Ãƒâ€°LECTRICITÃƒâ€° NF C 15-100", "-", "-", formatFCFA(totalElectriciteF), "Conforme aux normes de sÃƒÂ©curitÃƒÂ© ÃƒÂ©lectrique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant de l\'Installation', 'Quantitatif CalibrÃƒÂ©', 'Prix Unitaire EstimÃƒÂ©', 'Montant Total HT', 'Exigence Normative']],
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
    // PAGE 3 : MENUISERIES & PEINTURE (DÃƒâ€°COMPOSITION Q Ã¢â‚¬â€ PU)
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Ã…â€œuvre", "Partie III : Menuiseries Int./Ext. (Q Ã¢â‚¬â€ PU) & Peintures NormalisÃƒÂ©es (DTU 59.1)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. LOT MENUISERIES EXTÃƒâ€°RIEURES & INTÃƒâ€°RIEURES (DÃƒâ€°COMPOSITION Q Ã¢â‚¬â€ PU)");

    const menuiseriesRows = [
      ["Portes IntÃƒÂ©rieures Isoplanes GravÃƒÂ©es", `${qPortesInt} Blocs`, `${formatFCFA(puPorteInt)} / U`, formatFCFA(montantPortesInt), "Huisseries mÃƒÂ©talliques traitÃƒÂ©es anti-corrosion + serrures"],
      ["ChÃƒÂ¢ssis Coulissants Alu VitrÃƒÂ© (FenÃƒÂªtres)", `${qChassisAlu} ChÃƒÂ¢ssis`, `${formatFCFA(puChassisAlu)} / U`, formatFCFA(montantChassisAlu), "Alu laquÃƒÂ© 1.4 mm avec vitrage Stopsol 6 mm"],
      ["Grandes Baies VitrÃƒÂ©es Coulissantes Salon", `${qBaiesVitrees} Baie(s)`, `${formatFCFA(puBaieVitree)} / U`, formatFCFA(montantBaies), "ProfilÃƒÂ©s alu renforcÃƒÂ©s et roulements ÃƒÂ  billes inox ÃƒÂ©tanches"],
      ["Porte d'EntrÃƒÂ©e Principale SÃƒÂ©curisÃƒÂ©e", `${qPorteBlindee} Porte`, `${formatFCFA(puPorteBlindee)} / U`, formatFCFA(montantPorteBlindee), "Porte blindÃƒÂ©e acier 7 points ou bois massif traitÃƒÂ©"],
      ["TOTAL ESTIMATIF LOT MENUISERIES", "-", "-", formatFCFA(totalMenuiseriesF), "Fourniture et pose complÃƒÂ¨te des menuiseries"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Type de Menuiserie', 'Nombre / Dimensions', 'Prix Unitaire EstimÃƒÂ©', 'Montant Total HT', 'SpÃƒÂ©cification Technique']],
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
    drawSectionTitle(doc, currentY, "VI. LOT PEINTURE, ENDUITS & FINITIONS DÃƒâ€°CORATIVES (DTU 59.1)");

    const peintureRows = [
      ["Enduit de Rebouchage & Ratissage Complet", `${sMursEnduit} mÃ‚Â²`, `${formatFCFA(puEnduit)} / mÃ‚Â²`, formatFCFA(montantEnduit), "Deux passes croisÃƒÂ©es avec ponÃƒÂ§age fin anti-rayures"],
      ["Couche d'Impression Fixatrice RÃƒÂ©gulatrice", `${sImpression} mÃ‚Â²`, `${formatFCFA(puImpression)} / mÃ‚Â²`, formatFCFA(montantImpression), "Sous-couche hydrofuge acrylique rÃƒÂ©gulatrice de fond"],
      ["Peinture IntÃƒÂ©rieure Acrylique VeloutÃƒÂ©e", `${sPeintureInt} mÃ‚Â²`, `${formatFCFA(puPeintureInt)} / mÃ‚Â²`, formatFCFA(montantPeintureInt), "Deux couches lavables haute rÃƒÂ©sistance Seigneurie / Astral"],
      ["TOTAL ESTIMATIF LOT PEINTURE", "-", "-", formatFCFA(totalPeintureF), "Application soignÃƒÂ©e sur murs et plafonds"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Phase & Support de Peinture', 'Surface TraitÃƒÂ©e', 'Prix au mÃ‚Â² EstimÃƒÂ©', 'Montant Total HT', 'Prescription DTU 59.1']],
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
    // PAGE 4 : RÃƒâ€°CAPITULATIF BUDGÃƒâ€°TAIRE & PV DE RÃƒâ€°CEPTION CONTRADICTOIRE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second Ã…â€œuvre", "Partie IV : SynthÃƒÂ¨se BudgÃƒÂ©taire TCE & ProcÃƒÂ¨s-Verbal de RÃƒÂ©ception Contradictoire (COCC)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÃƒâ€°CAPITULATIF BUDGÃƒâ€°TAIRE GLOBAL SECOND Ã…â€œUVRE TCE");

    const recapTceRows = [
      ["Lot 1 : Carrelages, FaÃƒÂ¯ences, Colles & Joints", formatFCFA(totalLotCarrelageF + totalFaienceF), `${Math.round(((totalLotCarrelageF + totalFaienceF) / totalTCEFinitions) * 100)} %`, "GrÃƒÂ¨s cÃƒÂ©rame, colles C2TE et joints hydrofuges inclus"],
      ["Lot 2 : Ãƒâ€°tanchÃƒÂ©itÃƒÂ© Toiture Terrasse & PiÃƒÂ¨ces Humides", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), `${Math.round(((totalEtancheiteF + totalEtancheiteHumideF) / totalTCEFinitions) * 100)} %`, "Complexe bicouche 4 mm sablÃƒÂ© et SEL salles d'eau"],
      ["Lot 3 : Plomberie Sanitaire & RÃƒÂ©seau Ãƒâ€°vacuations EU/EP", formatFCFA(totalPlomberieF), `${Math.round((totalPlomberieF / totalTCEFinitions) * 100)} %`, "Sanitaires, mitigeurs et rÃƒÂ©seaux sans soudure encastrÃƒÂ©e"],
      ["Lot 4 : Ãƒâ€°lectricitÃƒÂ©, Tableaux & Lignes Clim (NF C 15-100)", formatFCFA(totalElectriciteF), `${Math.round((totalElectriciteF / totalTCEFinitions) * 100)} %`, `${nbPointsElec} points ÃƒÂ©lectriques, disjoncteurs et rÃƒÂ©seau terre`],
      ["Lot 5 : Menuiseries IntÃƒÂ©rieures & ExtÃƒÂ©rieures", formatFCFA(totalMenuiseriesF), `${Math.round((totalMenuiseriesF / totalTCEFinitions) * 100)} %`, "Portes isoplanes, chÃƒÂ¢ssis alu et baie vitrÃƒÂ©e salon"],
      ["Lot 6 : Peinture IntÃƒÂ©rieure & Enduits RatissÃƒÂ©s", formatFCFA(totalPeintureF), `${Math.round((totalPeintureF / totalTCEFinitions) * 100)} %`, "Enduits croisÃƒÂ©s et 2 couches acrylique veloutÃƒÂ©e"],
      ["Main d'Ã…â€œuvre SpÃƒÂ©cialisÃƒÂ©e Pose & Finitions", formatFCFA(totalMainOeuvreF), `${Math.round((totalMainOeuvreF / totalTCEFinitions) * 100)} %`, "Artisans qualifiÃƒÂ©s avec assurance et respect des DTU"],
      ["BUDGET TOTAL ESTIMATIF SECOND Ã…â€œUVRE TCE", formatFCFA(totalTCEFinitions), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalTCEFinitions / surface))} / mÃ‚Â² SDP`]
    ];

    // VÃƒÂ©rification de la somme des lignes rÃƒÂ©capitulatives
    const sommeLignesRecap = (totalLotCarrelageF + totalFaienceF) + (totalEtancheiteF + totalEtancheiteHumideF) + totalPlomberieF + totalElectriciteF + totalMenuiseriesF + totalPeintureF + totalMainOeuvreF;
    if (sommeLignesRecap !== totalTCEFinitions) throw new Error("IncohÃƒÂ©rence somme rÃƒÂ©capitulative finitions");

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Lot Technique Second Ã…â€œuvre', 'Montant Estimatif HT', 'Quote-Part TCE', 'Observations & PrioritÃƒÂ©s']],
      recapTceRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 34, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 62 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. PROCÃƒË†S-VERBAL DE RÃƒâ€°CEPTION CONTRADICTOIRE DES TRAVAUX (COCC)");

    // Cadre officiel PV de rÃƒÂ©ception
    const pvBoxY = currentY + TITLE_AFTER_GAP_MM;
    const pvBoxHeight = 56;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("ACTE JURIDIQUE DE RÃƒâ€°CEPTION DES TRAVAUX (ARTICLE 740 DU COCC)", MARGIN_LEFT + 4, pvBoxY + 5.5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`MaÃƒÂ®tre d'Ouvrage : ${clientName} Ã¢â‚¬Â¢ RÃƒÂ©f Dossier : ${refDoc} Ã¢â‚¬Â¢ Date de visite : ${currentDate}`, MARGIN_LEFT + 4, pvBoxY + 11.5);
    doc.text(`Entrepreneur / TÃƒÂ¢cheron en charge des travaux : ....................................................................................................`, MARGIN_LEFT + 4, pvBoxY + 16.5);

    doc.setFont(getFontFamily(doc), 'bold');
    doc.text("DÃƒâ€°CISION CONTRADICTOIRE DES PARTIES :", MARGIN_LEFT + 4, pvBoxY + 22.5);
    doc.setFont(getFontFamily(doc), 'normal');
    doc.text("[ ] RÃƒâ€°CEPTION PRONONCÃƒâ€°E SANS RÃƒâ€°SERVE : L'ouvrage est conforme aux rÃƒÂ¨gles de l'art.", MARGIN_LEFT + 8, pvBoxY + 27.5);
    doc.text(`[ ] RÃƒâ€°CEPTION PRONONCÃƒâ€°E AVEC RÃƒâ€°SERVES : Les dÃƒÂ©sordres consignÃƒÂ©s doivent ÃƒÂªtre levÃƒÂ©s sous ${delaiReserves} jours.`, MARGIN_LEFT + 8, pvBoxY + 32.5);

    doc.text(`DÃƒÂ©lai impÃƒÂ©ratif accordÃƒÂ© ÃƒÂ  l'entrepreneur pour la levÃƒÂ©e intÃƒÂ©grale des rÃƒÂ©serves : ${delaiReserves} jours calendaires.`, MARGIN_LEFT + 4, pvBoxY + 38.5);
    doc.text("La retenue de garantie contractuelle de 5% (COCC) demeure consignÃƒÂ©e jusqu'au PV de levÃƒÂ©e des rÃƒÂ©serves.", MARGIN_LEFT + 4, pvBoxY + 43);

    // Signatures
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(6.8);
    doc.text("Signature MaÃƒÂ®tre d'Ouvrage :", MARGIN_LEFT + 15, pvBoxY + 49);
    doc.text("Signature Entrepreneur / TÃƒÂ¢cheron :", 115, pvBoxY + 49);
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
      alert("Erreur critique : La bibliothÃƒÂ¨que jsPDF n'a pas pu ÃƒÂªtre chargÃƒÂ©e.");
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
        doc.text("Document gÃ©nÃ©rÃ© automatiquement Ã  titre indicatif â€¢ ChantierSur.com â€” Bureau d'Ã©tudes numÃ©rique indÃ©pendant.", MARGIN_LEFT, pageHeight - 7);
      } else {
        doc.text("Document gÃ©nÃ©rÃ© automatiquement Ã  titre indicatif â€¢ ChantierSur.com â€” Bureau d'Ã©tudes numÃ©rique indÃ©pendant.", MARGIN_LEFT, pageHeight - 7);
      }

      doc.setFont(getFontFamily(doc), 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Page ${p} sur ${totalPages}`, CONTENT_RIGHT, pageHeight - 9, { align: 'right' });
    }

    const fileName = `ChantierSur_${service.toUpperCase()}_${refDoc}.pdf`;
    doc.save(fileName);
  };

  // Fonctions de rendu directes pour intÃƒÂ©grations et tests
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








