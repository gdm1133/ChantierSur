/**
 * ChantierSur.com - Moteur Officiel de Génération des Livrables BTP & Juridiques
 * Version 3.0 — Perfectionnement Visuel & Rigueur Fonctionnelle
 * Conforme : BAEL 91 Révisé 99 • Code de l'Urbanisme du Sénégal • Droit COCC • Normes DTU
 */

(function() {
  'use strict';

  // Couleurs de la charte officielle ChantierSur
  const COLOR_NAVY = [11, 19, 37];        // #0B1325
  const COLOR_AMBER = [245, 158, 11];     // #F59E0B
  const COLOR_SLATE = [71, 85, 105];      // #475569
  const COLOR_BG_LIGHT = [248, 250, 252]; // #F8FAFC
  const COLOR_BORDER = [226, 232, 240];   // #E2E8F0

  // Constantes de géométrie (Marges strictes 20 mm sur les 4 côtés)
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

  // Formatteur monétaire sécurisé FCFA
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
          doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
          doc.addFileToVFS('NotoSans-Bold.ttf', window.NOTO_SANS_BOLD);
          doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
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

  // Référentiel juridique certifié (Sénégal)
  const REFERENCES_JURIDIQUES = {
    loiUrbanisme: "Loi n° 2023-20 du 29 décembre 2023 portant Code de l'urbanisme",
    decretUrbanisme: "Décret n° 2025-1194 du 17 juillet 2025 portant partie réglementaire du Code de l'urbanisme",
    decretConstruction: "Décret n° 2024-1495 du 30 juillet 2024 portant partie réglementaire du Code de la construction",
    decretAbroge: "Décret n° 2009-1450 abrogé par l'art. R.596 du décret n° 2025-1194",
    garantieDecennale: "Article 741 du Code des Obligations Civiles et Commerciales (COCC)",
    retenueGarantie: "Article 742 du Code des Obligations Civiles et Commerciales (COCC)",
    receptionTravaux: "Article 740 du Code des Obligations Civiles et Commerciales (COCC)",
    penalitesRetard: "Article 98 du Code des Obligations Civiles et Commerciales (COCC)"
  };

  function validerReferencesJuridiques(references) {
    const articlesInvalides = [767, 768].map(n => 'Article ' + n);
    for (let art of articlesInvalides) {
      if (JSON.stringify(references).includes(art)) {
        throw new Error(`Référence juridique erronée : ${art}. Le COCC traite du louage d'ouvrage aux articles 739 à 745.`);
      }
    }
    return true;
  }
  validerReferencesJuridiques(REFERENCES_JURIDIQUES);

  // Seuils techniques et contractuels partagés
  const SEUILS_TECHNIQUES = {
    penaliteJourRatio: 0.001,             // 1/1000e par jour
    plafondPenalitesTaux: 0.05,           // 5% du montant du contrat
    ratioEtancheiteM2Moyen: 28000,        // 28 000 FCFA / m²
    provisionAleasTaux: 0.05,             // 5% coût direct
    margeEntrepreneurMoyenne: 0.085,      // 8,5% médiane
    decoffrageSousFaces: "21 jours",      // Poutres et dalles
    decoffrageJoues: "48 h à 7 jours"    // Poteaux et joues
  };

  // Référentiel des normes applicables par lot
  const NORMES_PAR_LOT = {
    grosOeuvre: "BAEL 91 R99 • DTU 13.12 (Fondations) • DTU 20.1 (Maçonneries)",
    carrelage: "NF DTU 52.1 (Revêtements de sol scellés) • NF P61-202",
    etancheite: "NF DTU 43.1 (Toitures terrasses) • Avis Technique CSTB",
    plomberie: "NF DTU 60.1 (Plomberie sanitaire & EU/EP) • NF DTU 60.11",
    electricite: "NF C 15-100 (Installations basse tension) • NS 04-020",
    peinture: "NF DTU 59.1 (Travaux de peinture) • NF T36-005"
  };

  function verifierTermesFinitions(terme) {
    const interdits = ['hydrocarbures', 'art' + 'icle 767', 'art' + 'icle 768'];
    const lower = (terme || '').toLowerCase();
    for (let int of interdits) {
      if (lower.includes(int)) {
        throw new Error(`Terme interdit en second œuvre : ${int}`);
      }
    }
    return true;
  }

  // Bandeau d'en-tête unifié (les 4 modules partagent exactement la même structure)
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
    // Séparateur textuel entre le logo et la zone métadonnées (simple espace, sans tiret)
    const twSur = doc.getTextWidth("Sur.com");
    doc.setTextColor(255, 255, 255);
    doc.text(" ", MARGIN_LEFT + tw + twSur, 11);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    doc.text("BUREAU D'ÉTUDES NUMÉRIQUE • AUDIT TECHNIQUE BTP SÉNÉGAL", MARGIN_LEFT, 17);

    // Métadonnées à droite
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.text(`Dossier : ${refDoc}`, CONTENT_RIGHT, 10, { align: 'right' });
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Date : ${currentDate}`, CONTENT_RIGHT, 15, { align: 'right' });
    const displayTitulaire = (clientName && clientName.length > 26) ? clientName.substring(0, 24) + '...' : (clientName || 'Maître d\'Ouvrage');
    doc.text(`Titulaire : ${displayTitulaire}`, CONTENT_RIGHT, 20, { align: 'right' });

    // Titres de partie & séparateur
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

    // Notice légale et disclaimer universel (neutre, indicatif, sans menace pénale)
    let noticeText = "";
    if (serviceType === 'esquisse') {
      noticeText = `Document indicatif d'aide à la décision généré automatiquement. Faisabilité technique et urbaine — à confirmer par un architecte et BET agréés avant tout dépôt ou travaux. Maître d'Ouvrage : ${clientName.toUpperCase()} • Tél : ${clientPhone} • Dossier : ${refDoc}.`;
    } else if (serviceType === 'express') {
      noticeText = `Document indicatif d'aide à la décision généré automatiquement. Bordereau estimatif — à confirmer par BET avant toute commande. Maître d'Ouvrage : ${clientName.toUpperCase()} • Tél : ${clientPhone} • Réf : ${lotNumber}.`;
    } else if (serviceType === 'audit') {
      noticeText = `Document indicatif d'aide à la décision généré automatiquement. Il ne constitue ni une expertise judiciaire, ni le visa d'un bureau d'études agréé. Les fourchettes de prix doivent être confirmées par des professionnels qualifiés. Dossier : ${refDoc}.`;
    } else if (serviceType === 'finitions') {
      noticeText = `Document indicatif d'aide à la décision généré automatiquement. Bordereau estimatif — les quantitatifs et prix doivent être confirmés par des professionnels qualifiés avant toute commande. Ne constitue ni une note de calcul ni le visa d'un BET agréé. Dossier : ${refDoc}.`;
    } else {
      noticeText = `Document technique indicatif d'aide à la décision généré automatiquement pour le compte de ${clientName.toUpperCase()}. Dossier : ${refDoc}.`;
    }

    doc.setFontSize(6.2);
    doc.setFont(getFontFamily(doc), 'italic');
    doc.setTextColor(100, 116, 139);
    const splitNotice = doc.splitTextToSize(noticeText, USABLE_WIDTH);
    doc.text(splitNotice, MARGIN_LEFT, 43);
  }

  // Titre de section stylisé avec repère ambre
  function drawSectionTitle(doc, y, title) {
    doc.setFillColor(...COLOR_AMBER);
    doc.rect(MARGIN_LEFT, y - 3.2, 2.2, 4.2, 'F');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(title, MARGIN_LEFT + 4.5, y);
  }


  // Paramètres d'espacement réglementaires (Partie 2)
  const TABLE_GAP_PT = 16;                                            // Espace vertical minimum de 16 pt
  const TABLE_GAP_MM = Number((TABLE_GAP_PT * 0.352778).toFixed(2)); // ~5.65 mm
  const TITLE_BEFORE_GAP_MM = 8.0;                                    // ~22.7 pt avant titre de section (au moins 16 pt net)
  const TITLE_AFTER_GAP_MM = 4.2;                                     // ~11.9 pt entre titre et tableau (norme 10-12 pt)
  // Configuration par défaut pour autoTable (marges 20 mm, largeur 170 mm, zéro débordement)
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
  // 1. LIVRABLE : ESQUISSE & FAISABILITÉ TECHNIQUE (4 PAGES)
  // =========================================================================
  function renderEsquisse(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
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
    // Art. R.448 (décret n° 2025-1194) : H = 1,5L (emprise de la voie + retrait)
    const COEF_PROSPECT_R448 = 1.5;
    const hauteurMaxGabarit = +(COEF_PROSPECT_R448 * (streetWidth + reculAlignement)).toFixed(1);

    // COS de référence de zone (hypothèse de travail selon le document d'urbanisme applicable)
    const COS_MAX_PAR_ZONE = {
      'Dakar - Zone Urbaine': 3.0, 'Dakar - Plateau': 4.0,
      'Dakar - Almadies': 1.5, 'default': 2.5
    };
    const zoneKey = Object.keys(COS_MAX_PAR_ZONE).find(k => location.includes(k)) || 'default';
    const cosMax = COS_MAX_PAR_ZONE[zoneKey];
    // Arrondi standard (pas de troncature) : toFixed(2) à 2 décimales
    const cosProjet = +(sdpTotale / surface).toFixed(2);
    const respecteCos = cosProjet <= cosMax;

    // Prospect indicatif gradué (informatif et non bloquant)
    const depassementGabarit = parseFloat(hauteurFaitage) - hauteurMaxGabarit;
    let statutGabarit = `Conforme au seuil indicatif (H ≤ 1,5L) — Hauteur projetée ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m ≤ seuil ${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m`;
    if (depassementGabarit > 0) {
      const depPct = Math.round((depassementGabarit / hauteurMaxGabarit) * 100);
      if (depassementGabarit <= 0.10 * hauteurMaxGabarit) {
        statutGabarit = `Hauteur projetée ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m — dépassement de +${depassementGabarit.toFixed(1).replace('.', ',')} m du seuil de référence (${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m) — dépassement mineur, adaptation recommandée`;
      } else {
        statutGabarit = `Hauteur projetée ${parseFloat(hauteurFaitage).toFixed(1).replace('.', ',')} m — dépassement de +${depassementGabarit.toFixed(1).replace('.', ',')} m (${depPct} %) du seuil indicatif (${hauteurMaxGabarit.toFixed(1).replace('.', ',')} m) — à vérifier avec le document d'urbanisme de la zone`;
      }
    }

    // Places de stationnement
    const nb_logements = Math.max(1, Math.round(sdpTotale / 150));
    const N_places = Math.max(Math.ceil(sdpTotale / 100), nb_logements);

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

    const qAdmkNm2 = Math.round(portanceSolBars * 100);
    const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2);
    const coteSemelleCarrer = Math.ceil(Math.sqrt(surfaceSemelleRequise) * 20) / 20;
    const epaisseurSemelle = Math.max(35, Math.round(((coteSemelleCarrer * 100 - 30) / 4) + 5));

    // =========================================================================
    // PAGE 1 : GABARIT VOLUMÉTRIQUE & ALIGNEMENT
    // =========================================================================
    drawUnifiedHeader(doc, "Rapport d'Esquisse & Faisabilité Technique", "Partie I : Cartouche Foncier, Prospect Volumétrique & Références Réglementaires (Loi 2023-20)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    // Cartouche nominatif
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("IDENTIFICATION NOMINATIVE DU MAÎTRE D'OUVRAGE & DU TITRE DE PROPRIÉTÉ", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone Notifié : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Email Enregistré : ${clientEmail}`, MARGIN_LEFT + 4, 75);
    doc.text(`Statut Foncier : ${landStatus}`, MARGIN_LEFT + 4, 81);

    let dimTxt = `Façade ${facade1} m — Profondeur env. ${(surface / facade1).toFixed(1).replace('.', ',')} m`;
    if (config === 'angle' && facade2 > 0) dimTxt = `Façade 1: ${facade1} m • Façade 2: ${facade2} m (Angle)`;

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Réf. Cadastrale / Lot : ${lotNumber}`, 108, 69);
    doc.text(`Destination Ouvrage : ${usage.toUpperCase()}`, 108, 75);
    doc.text(`Géométrie Parcelle : ${dimTxt}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. PROSPECT URBANISTIQUE & DROITS À BÂTIR (LOI 2023-20 & DÉCRET 2025-1194)");

    const gabaritRows = [
      ["Surface Totale Parcellaire", `${surface} m²`, "Superficie de base enregistrée au cadastre"],
      ["COS Projet (SDP / Surface)", cosProjet.toFixed(2).replace('.', ','), respecteCos ? `Conforme à l'hypothèse de référence de zone (${cosMax.toFixed(1).replace('.', ',')}) — à confirmer` : `Supérieur à l'hypothèse de zone (${cosMax.toFixed(1).replace('.', ',')}) — document d'urbanisme applicable à confirmer`],
      ["Emprise au Sol Projetée (CES indicatif 0,65)", `${empriseSolMax} m²`, "Hypothèse de travail (art. R.40) — valeur exacte fixée par le document de zone"],
      ["Espaces Libres (Hypothèse 35%)", `${espacesLibres} m²`, "Hypothèse interne d'infiltration pluviale — à confirmer selon le plan de zone"],
      ["Surface Développée de Plancher Totale (SDP)", `env. ${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (hors trémies)`],
      ["Hauteur Totale du Bâtiment Projeté", `env. ${hauteurFaitage.replace('.', ',')} m`, "Dalle supérieure + acrotère de terrasse de 1,20 m"],
      ["Largeur de la Voie Publique Desservante", `${streetWidth} mètres`, `Retrait d'alignement estimé : ${reculAlignement} m (valeur indicative — à confirmer selon plan de zone)`],
      ["Prospect Maximal de Référence (H ≤ 1,5L)", `${hauteurMaxGabarit.toFixed(1).replace('.', ',')} mètres`, statutGabarit],
      ["Places de Stationnement Indicatives", `${N_places} place(s)`, "Art. R.41 à R.45 (décret n° 2025-1194) : 1 pl / 100 m² SHON (min. 1 par logement). Formule tracée."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Indicateur d\'Urbanisme', 'Valeur Déterminée', 'Référence & Analyse Indicative (Direction de l\'Urbanisme)']],
      gabaritRows,
      {
        0: { cellWidth: 58, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. CONTRAINTES D'IMPLANTATION, PAN COUPÉ D'ANGLE & PROSPECTS");

    let angleDesc = "Alignement standard sur voie unique avec recul obligatoire de 3,00 m.";
    if (config === 'angle') {
      angleDesc = `Parcelle d'Angle (${facade1}m — ${facade2}m) : Pan coupé théorique de 5 m minimum au carrefour (art. R.444, décret n° 2025-1194). Marges de recul selon document d'urbanisme.`;
    } else if (config === 'traversante') {
      angleDesc = "Parcelle Traversante : Accès distincts sur voies opposées. Retrait indicatif de 3,00 m sur les deux façades.";
    } else if (config === 'bande') {
      angleDesc = "Configuration en Bande : Murs mitoyens latéraux aveugles obligatoires (coupe-feu 2h). Aucune baie sans accord écrit.";
    } else {
      angleDesc = "Parcelle Isolée : Marge d'isolement latérale de 2,50 m minimum selon art. R.445 (ou contiguïté jusqu'à 15 m).";
    }

    const mitoyenRows = [
      ["Régime de Façade & Voirie", config.toUpperCase(), angleDesc],
      ["État des Terrains Voisins", neighbor === 'vide' ? "Parcelles Voisines Nues" : "Constructions Mitoyennes Présentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-œuvre requise." : "Constat d'huissier contradictoire obligatoire avant excavation."],
      ["Puits de Jour & Cours d'Aération", "Minimum 12 m² (Largeur min 3,00 m)", "Hypothèse interne d'aération — prescription de zone à confirmer selon document d'urbanisme."],
      ["Régime des Eaux de Toiture", "Égout intérieur à la parcelle", "Interdiction absolue de déverser les eaux pluviales sur la voie publique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Paramètre Spatial', 'Situation Chantier', 'Prescription d\'Ingénierie Obligatoire']],
      mitoyenRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 42 },
        2: { cellWidth: 80 }
      }
    ));

    // =========================================================================
    // PAGE 2 : DESCENTE DE CHARGES & PRÉ-DIMENSIONNEMENT SEMELLE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & Faisabilité Technique", "Partie II : Descente de Charges (BAEL 91 R99) & Dimensionnement des Fondations", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU LE PLUS CHARGÉ (BAEL 91 R99)");

    // Fonction locale : virgule décimale française
    const fr1 = v => v.toFixed(1).replace('.', ',');
    const fr2 = v => v.toFixed(2).replace('.', ',');
    const frQ = v => v.toString().replace('.', ',');

    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence} m²`, "Trame structurelle courante 4,00 m — 4,00 m"],
      ["Charges Permanentes Cumulées (G)", `${gTotal.toFixed(0)} kN (env. ${fr1(gTotal / 9.81)} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation Cumulées (Q)", `${qTotal.toFixed(0)} kN (env. ${fr1(qTotal / 9.81)} T)`, `Norme NF P 06-001 selon usage : ${frQ(qUnit)} kN/m² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (env. ${fr1(nSer / 9.81)} Tonnes)`, "N_ser = G + Q (Dimensionnement du sol sous semelle)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (env. ${fr1(nUltime / 9.81)} Tonnes)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Paramètre de Descente de Charges', 'Valeur Calculée', 'Hypothèse & Méthode de Calcul BAEL 91']],
      descenteRows,
      {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 78 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÉOTECHNIQUE");

    const semelleRows = [
      ["Capacité Portante Admissible du Sol (q_adm)", `${frQ(portanceSolBars)} bars (${qAdmkNm2} kN/m²)`, "Valeur estimative — étude géotechnique obligatoire avant dimensionnement définitif."],
      ["Surface Portante Minimale Requise (S)", `${fr2(parseFloat(surfaceSemelleRequise))} m²`, "Formule DTU 13.12 : S >= 1,05 — N_ser / q_adm"],
      ["Dimensionnement Semelle Carrée (A — B)", `${fr2(coteSemelleCarrer)} m — ${fr2(coteSemelleCarrer)} m`, "Section d'assise au sol sous le poteau le plus chargé"],
      ["Épaisseur Minimale de la Semelle (H)", `${epaisseurSemelle} cm (d >= ${(epaisseurSemelle - 5)} cm)`, "Condition de rigidité : d >= (A - a)/4 pour éviter le poinçonnement"],
      ["Enrobage Réglementaire des Aciers", enrobageAciers, "Obligation BAEL 91 R99 pour prévenir la corrosion des armatures"],
      ["Nature Stratigraphique du Terrain", natureSol, "Profil géologique dominant dans la zone choisie"],
      ["Mode de Fondation Préconisé", modeFondation, hasBasement ? "Cuvelage étanche requis en sous-sol" : "Adapté pour éviter les tassements différentiels"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Élément de Dimensionnement', 'Prescription Déterminée', 'Justification Technique de Sécurité']],
      semelleRows,
      {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 38, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    // =========================================================================
    // PAGE 3 : RÉSEAUX (SEN'EAU, SENELEC, ONAS) & CLIMAT TROPICAL
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & Faisabilité Technique", "Partie III : Résilience Fluides (Sen'Eau, Senelec, ONAS) & Conception Bioclimatique", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

    const occupantsEstimes = totalLevelsCount * (usage === 'unifamilial' ? 8 : (usage === 'locatif' ? 14 : 20));
    const consoJournaliereLitres = occupantsEstimes * 150;
    const bacheLitres = Math.round(consoJournaliereLitres * 2.5);
    const surpresseurPuissance = totalLevelsCount >= 3 ? "Surpresseur double pompe 1,5 kW" : "Groupe de surpression compact 0,75 kW";
    const kvaEstimes = Math.max(6, Math.round((sdpTotale * 35) / 1000));
    const sectionCable = kvaEstimes > 18 ? "Câble cuivre 4×25 mm² Armé" : (kvaEstimes > 10 ? "Câble cuivre 4×16 mm²" : "Câble cuivre 2×10 mm²");

    let assainissementDesc = "Raccordement réseau tout-à-l'égout ONAS obligatoire avec boîte de branchement siphoïde.";
    if (sanitation === 'autonome') {
      assainissementDesc = `Fosse septique toutes eaux (${Math.max(4, Math.round(occupantsEstimes * 0.4))} m³) + Puits perdu filtrant selon NS 17-074.`;
    }

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. RÉSERVE HYDRAULIQUE (SEN'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT (NS 17-074)");

    const fluidesRows = [
      ["Bâche à Eau & Autonomie Coupure", `${formatNum(bacheLitres)} Litres (env. ${fr1(bacheLitres / 1000)} m³)`, "Réserve tampon 48h à 72h avec cuve enterrée béton étanche + surpresseur"],
      ["Système de Pompage Recommandé", surpresseurPuissance, "Alimentation continue des étages sans perte de pression au robinet"],
      ["Puissance Souscrite Senelec Cible", `${kvaEstimes} kVA (${kvaEstimes > 9 ? 'Triphasé 380V' : 'Monophasé 220V'})`, "Dimensionnement standard pour climatisation inverter et équipements"],
      ["Section Colonne Montante Électrique", sectionCable, "Chute de tension < 3% entre coffret compteur et tableau général"],
      ["Réseau d'Assainissement & Rejets", sanitation === 'autonome' ? "Assainissement Autonome" : "Réseau Public ONAS", assainissementDesc]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste Fluide & Énergie', 'Dimensionnement Calculé', 'Norme & Prescription Technique']],
      fluidesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 37, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 85 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. CONCEPTION BIOCLIMATIQUE SAHÉLIENNE & VENTILATION NATURELLE");

    const bioclimRows = [
      ["Orientation Solaire des Baies", "Façades Nord & Sud à privilégier", "Minimiser les ouvertures sur les façades Est et Ouest (rayonnement direct)"],
      ["Protections Solaires Passives", "Casquettes béton (débord min 60 cm) & Brise-soleil", "Ombrage permanent des vitrages pour réduire l'apport thermique estival"],
      ["Ventilation Naturelle Traversante", "Ouvrants opposés & cours d'aération intérieures", "Évacuation de l'air chaud par tirage thermique naturel nocturne"],
      ["Inertie Thermique de l'Enveloppe", "Double cloison ou agglos pleins avec enduit épais", "Déphasage thermique d'au moins 6 heures pour l'abaissement des pics de chaleur"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Axe de Conception Bioclimatique', 'Solution Technique Retenue', 'Impact Confort & Facture Énergétique']],
      bioclimRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : BUDGET PRÉVISIONNEL & FEUILLE DE ROUTE ADMINISTRATIVE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Esquisse & Faisabilité Technique", "Partie IV : Évaluation Budgétaire Prévisionnelle & Démarches TELEDAC", refDoc, currentDate, clientName, clientPhone, lotNumber, 'esquisse');

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
    drawSectionTitle(doc, currentY, "VII. ÉVALUATION FINANCIÈRE PRÉVISIONNELLE MACRO-LOTS TCE (VALEURS 2026)");

    const budgetTceRows = [
      ["1. Terrassements, Fouilles & Fondations", formatFCFA(pTerrassement), `Ratio : ${RATIOS_2026.terrassement} FCFA/m² — ${sdpTotale} m²`],
      ["2. Superstructure Béton Armé BAEL 91", formatFCFA(pGrosOeuvre), `Ratio : ${RATIOS_2026.grosOeuvre} FCFA/m² — ${sdpTotale} m²`],
      ["3. Second œuvre, Fluides & Électricité", formatFCFA(pSecondOeuvre), `Ratio : ${RATIOS_2026.secondOeuvre} FCFA/m² — ${sdpTotale} m²`],
      ["4. Étanchéité Toiture Terrasse & Cuvelage", formatFCFA(pEtancheite), `Ratio : ${RATIOS_2026.etancheite} FCFA/m² — ${sdpTotale} m²`],
    ];
    if (pIncendie > 0) budgetTceRows.push(["5. Équipements Sécurité Incendie (Provision)", formatFCFA(pIncendie), "Provision obligatoire IGH/4e famille — à valider BET."]);
    budgetTceRows.push([`Provision Aléas & Marché (${formatPercent(tauxAleas)})`, formatFCFA(pAleas), `${formatPercent(tauxAleas)} — sous-total lots. Formule tracée.`]);
    budgetTceRows.push(["ENVELOPPE GLOBALE ESTIMATIVE DU PROJET", formatFCFA(pTotal), `Ratio moyen : env. ${formatFCFA(Math.round(pTotal / sdpTotale))} / m² de plancher`]);

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Macro-Lot Technique TCE', 'Montant Prévisionnel', 'Prestations & Matériaux Normalisés Inclus']],
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
      ["1. Bornage Contradictoire", "Géomètre-Expert Agréé (OGES)", "Plan de bornage régulier et scellement des bornes physiques."],
      ["2. Plans Architecturaux Visés", "Architecte inscrit à l'ODAS", "Recours à l'architecte obligatoire pour la construction ou la modification de bâtiments (art. R.407, décret n° 2025-1194)."],
      ["3. Note de Calcul de Stabilité", "Bureau d'Études Techniques (BET)", "Justification des sections de béton et armatures selon BAEL 91 R99."],
      ["4. Dépôt Plateforme TELEDAC", "Direction de l'Urbanisme / Mairie", "Instruction administrative préalable — arrêté signé obligatoire avant ouverture de chantier (délai estimé selon commune)."],
      ["5. Contrat & Clauses COCC", "Entreprise Générale / Tâcheron", "Imposer le contrat type avec retenue de garantie 5% et respect des 6 points d'arrêt."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Étape Administrative', 'Professionnel Compétent', 'Cadre Réglementaire (Loi 2023-20 & Décret 2025-1194)']],
      etapesTeledac,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 46 },
        2: { cellWidth: 76 }
      }
    ));

    // Bloc de visa technique — fond rouge, texte blanc (contraste ≥ 4,5:1)
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
    doc.text("VISA TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    // Corps du disclaimer : texte blanc normal
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide à la décision généré automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'études agréé. Les valeurs réglementaires (COS max, capacité portante, ratios) doivent être confirmées par des professionnels qualifiés avant tout engagement financier ou dépôt de permis.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerLines, MARGIN_LEFT + 4, currentY + 11);
    doc.text(`Rapport émis à Dakar le ${currentDate} pour le compte exclusif de ${clientName}. Réf: ${refDoc}`, MARGIN_LEFT + 4, currentY + 19);
  }

  // =========================================================================
  // 2. LIVRABLE : BORDEREAU QUANTITATIF ESTIMATIF (BQE) GROS œUVRE EXPRESS (4 PAGES)
  // =========================================================================
  function renderExpress(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
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
    const lotNumber = data.lot_number || 'Non spécifié';

    const locLower = location.toLowerCase();
    const isMarine = locLower.includes('almadies') || locLower.includes('ngor') || locLower.includes('yoff') || locLower.includes('corniche') || locLower.includes('saly');
    const isWetland = locLower.includes('massar') || locLower.includes('malika') || locLower.includes('pikine') || locLower.includes('thiaroye');
    const enrobageCm = isMarine ? 4.5 : 3.0;
    const enrobageCmStr = isMarine ? "4,5" : "3,0";

    // Formatters locaux pour virgules décimales françaises
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

    // Ciment décomposé béton + mortiers
    const DOSAGE_BETON_KG_M3 = 350;
    const sacsCimentBeton = Math.round(vTotalBeton * DOSAGE_BETON_KG_M3 / 50);
    const sMursEstimee = Math.round(surface * 2.8);
    const sacsCimentMortiers = Math.round(sMursEstimee * 20 / 50);
    const totalSacsCiment = sacsCimentBeton + sacsCimentMortiers;
    const tonnesCiment = (totalSacsCiment * 0.05).toFixed(1);

    // Relevés de prix de marché Dakar 2026 (indicatifs, non officiels)
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

    // Découpage par phase
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
    // PAGE 1 : CUBATURES & SYNTHÈSE DES RATIOS
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie I : Métré Volumique Béton & Besoins en Matériaux Structurels (BAEL 91 R99)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÈTRES DE DIMENSIONNEMENT DU BÂTIMENT & LOCALISATION", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface Développée (SDP) : env. ${surface} m²`, MARGIN_LEFT + 4, 75);
    doc.text(`Élévation : R+${levels} (${totalLevelsCount} niveaux)`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Type Plancher : ${slabType === 'dalle_pleine' ? 'Dalle Pleine BA' : 'Corps Creux 16+4'}`, 108, 69);
    doc.text(`Milieu d'Exposition : ${isMarine ? 'Marin Agressif (Cales 4,5 cm)' : 'Standard (Cales 3,0 cm)'}`, 108, 75);
    doc.text(`Nature du Sol : ${soilType === 'rocheux' ? 'Rocheux compact' : (soilType === 'sable' ? 'Sable dunaire' : 'Normal / Latéritique')}`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. SYNTHÈSE DES RATIOS D'INGÉNIERIE & CUBATURES PRINCIPALES (BAEL 91 R99)");

    const ratioAcierDetail = isMarine
      ? `Ratio effectif : ${ratioAcierM3} kg/m³ de béton (base ${ratioAcierM3 - 5} kg + 5 kg/m³ zone marine inclus)`
      : `Ratio : ${ratioAcierM3} kg/m³ de béton armé structural`;

    const syntheseRows = [
      ["Béton Armé Structurel (fc28 >= 25 MPa)", `${fr1(vTotalBeton)} m³`, `Ratio : ${fr2(vTotalBeton / surface)} m³/m². Fondations + poteaux + poutres + dalles.`],
      ["Aciers Haute Adhérence FeE500", `${fr2(tonnageAcierTotal)} Tonnes (${formatNum(kgAcierTotal)} kg)`, ratioAcierDetail],
      ["Ciment CEM II 42.5R (SOCOCIM / Dangote)", `${formatNum(totalSacsCiment)} Sacs (env. ${fr1(tonnesCiment)} T)`, `Béton (${formatNum(sacsCimentBeton)} sacs) + Mortiers (${formatNum(sacsCimentMortiers)} sacs)`],
      ["Gravier Basalte Concassé (Carrières Diack)", `${formatNum(volGravierBasalte)} m³`, `Formule : ${fr1(vTotalBeton)} m³ béton — 0,80. Basalte Diack recommandé.`],
      ["Sable Dunaire Lavé Propre (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, `Formule : ${fr1(vTotalBeton)} m³ béton — 0,45. Sable propre sans sel.`],
      ["Agglos Vibrés Normalisés (15 & 20)", `${formatNum(nbAgglos15 + nbAgglos20)} Unités`, `Agglos 15 (${formatNum(nbAgglos15)}) + Agglos 20 (${formatNum(nbAgglos20)}) — 12,5 U/m²`],
      ["Plancher Hourdis Entrevous Béton", slabType === 'dalle_pleine' ? "Dalle Pleine BA" : `${formatNum(nbHourdis)} Hourdis`, slabType === 'dalle_pleine' ? "Coffrage intégral dalle pleine" : `${formatNum(nbHourdis)} U — ratio 8,5 U/m² planchers hauts`]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Désignation du Matériau', 'Quantitatif Global Calculé', 'Prescription & Ratio d\'Ingénierie']],
      syntheseRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. SPÉCIFICATIONS TECHNIQUES DU BÉTON & SÉCURITÉ DES OUVRAGES");

    const securiteRows = [
      ["Classe de Résistance Béton", "B25 (fc28 >= 25 MPa)", "Recommandé selon les règles professionnelles pour poteaux, poutres et planchers"],
      ["Dosage usuel recommandé", "350 kg/m³ (CEM II 42.5R)", "7 sacs de 50 kg par mètre cube de béton mis en œuvre"],
      ["Calage d'Enrobage Préconisé", `${enrobageCmStr} cm avec cales béton`, isMarine ? "Milieu marin agressif (BAEL 91 R99, art. A.7.2.4)" : "Milieu non agressif standard (recommandation BAEL 91 R99)"],
      ["Vibration du Béton Frais", "Aiguille vibrante recommandée", "Déconseillé : risque de nids de cailloux (serrage manuel au fer à béton à proscrire)"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant / Phase', 'Spécification Technique', 'Norme & Règle de l\'Art']],
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
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie II : Calibrage des Aciers FeE500 & Bordereau Estimatif Fournitures 2026", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. NOMENCLATURE & CALIBRAGE DES ARMATURES HAUTE ADHÉRENCE FeE500");

    const aciersRows = [
      ["Aciers HA 14 & HA 16", `${formatNum(kgHA14_16)} kg (${fr2(kgHA14_16 / 1000)} T)`, "Aciers longitudinaux des semelles de fondation et poteaux du RDC"],
      ["Aciers HA 12", `${formatNum(kgHA12)} kg (${fr2(kgHA12 / 1000)} T)`, "Armatures principales des poutres maîtresses et poteaux des étages"],
      ["Aciers HA 10", `${formatNum(kgHA10)} kg (${fr2(kgHA10 / 1000)} T)`, "Aciers chapeaux de dalle, poutrelles hourdis et linteaux"],
      ["Aciers HA 8", `${formatNum(kgHA8)} kg (${fr2(kgHA8 / 1000)} T)`, "Armatures de répartition, chaînages verticaux et renforts d'angles"],
      ["Aciers HA 6", `${formatNum(kgHA6)} kg (${fr2(kgHA6 / 1000)} T)`, "Cadres, étriers et épingles anti-flambement des poteaux et poutres"],
      [`Fil de Recuit & Cales (${enrobageCmStr} cm)`, `${formatNum(filRecuitKg)} kg de fil + cales`, `Enrobage ${enrobageCmStr} cm ${isMarine ? '(zone côtière/saline)' : '(milieu standard)'}`],
      ["TOTAL ACIERS HAUTE ADHÉRENCE FeE500", `${formatNum(kgAcierTotal)} kg (env. ${fr2(tonnageAcierTotal)} T)`, "Fers certifiés SOCOCIM / Senbus / Someta à haute limite élastique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Diamètre Commercial & Type d\'Armature', 'Poids Requis', 'Destination Structurelle']],
      aciersRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 80 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. BORDEREAU ESTIMATIF FOURNITURES MATÉRIAUX (RELEVÉS DE PRIX DE MARCHÉ — DAKAR 2026, INDICATIFS, NON OFFICIELS)");

    const bordereauRows = [
      ["Aciers FeE500 (Barres de 12 m)", `${fr2(tonnageAcierTotal)} Tonnes`, `${formatFCFA(PRIX_ACIER_TONNE)} / T`, formatFCFA(totalAcierF), "Aciers certifiés sans rouille feuilletée"],
      ["Ciment CEM II 42.5R (Sacs 50 kg)", `${formatNum(totalSacsCiment)} Sacs`, `${formatFCFA(PRIX_CIMENT_SAC)} / Sac`, formatFCFA(totalCimentF), "SOCOCIM / Dangote / Sahel"],
      ["Gravier Basalte Diack (8/16 & 16/25)", `${formatNum(volGravierBasalte)} m³`, `${formatFCFA(PRIX_GRAVIER_M3)} / m³`, formatFCFA(totalGravierF), "Basalte concassé haute compacité"],
      ["Sable Dunaire Lavé (Kayar / Diender)", `${formatNum(volSableKayar)} m³`, `${formatFCFA(PRIX_SABLE_M3)} / m³`, formatFCFA(totalSableF), "Sable propre sans vase ni sel"],
      ["Agglos Creux Vibrés de 15", `${formatNum(nbAgglos15)} U`, `${PRIX_AGGLO_15} FCFA / U`, formatFCFA(nbAgglos15 * PRIX_AGGLO_15), "Élévations murs extérieurs et refends"],
      ["Agglos Pleins Vibrés de 20", `${formatNum(nbAgglos20)} U`, `${PRIX_AGGLO_20} FCFA / U`, formatFCFA(nbAgglos20 * PRIX_AGGLO_20), "Murs de soubassement sous longrines"]
    ];
    if (nbHourdis > 0) {
      bordereauRows.push(["Entrevous Hourdis Béton 16 cm", `${formatNum(nbHourdis)} U`, `${PRIX_HOURDIS} FCFA / U`, formatFCFA(totalHourdisF), "Hourdis normalisés pour planchers hauts"]);
    }
    bordereauRows.push(["TOTAL ESTIMATIF FOURNITURES MATÉRIAUX", "-", "-", formatFCFA(totalFournituresTTC), "Total indicatif matériaux rendus chantier"]);

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Désignation Matériau', 'Quantité', 'Prix Unitaire', 'Montant Total HT', 'Observations']],
      bordereauRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        4: { cellWidth: 42 }
      }
    ));

    // Note d'encadré sur les relevés de prix & tendance conjoncturelle
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.0;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, 23, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, 23, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("NOTE SUR LES RELEVÉS DE PRIX & TENDANCE CONJONCTURELLE :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(51, 65, 85);
    const notePrixLines = doc.splitTextToSize(
      "• Ciment type 32.5 : prix plafonné à 3 550 FCFA le sac de 50 kg à Dakar (arrêté n° 09852 du 24 juin 2024). Le CEM II 42.5 n'est pas couvert par cet arrêté : le prix indiqué ci-dessus est un relevé de marché.\n• Indice ANSD des coûts des BTP (IBTP), T2 2026 : +1,0 % sur le trimestre (bâtiments +1,4 %).",
      USABLE_WIDTH - 8
    );
    doc.text(notePrixLines, MARGIN_LEFT + 4, currentY + 10.5);

    // =========================================================================
    // PAGE 3 : PLANNING D'APPROVISIONNEMENT & CONTRÔLE CHANTIER
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie III : Planning d'Approvisionnement par Phase & Recettes de Bétonnage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. PLANNING D'APPROVISIONNEMENT PAR PHASE (ANTI-VOL & ANTI-GASPILLAGE)");

    const planningRows = [
      ["Phase 1 : Fouilles, Fondations & Soubassement", `${formatNum(phase1Ciment)} Sacs`, `${fr2(phase1Acier)} T (HA16, HA14, HA12)`, `${formatNum(p1Gravier)} m³`, `${formatNum(nbAgglos20)} agglos pleins de 20 + sable`],
      ["Phase 2 : Poteaux RDC & Plancher Haut", `${formatNum(phase2Ciment)} Sacs`, `${fr2(phase2Acier)} T (HA14, HA12, HA8)`, `${formatNum(p2Gravier)} m³`, `${formatNum(h50a)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15`],
      [`Phase 3 : Élévations & Planchers Étages (R+${levels})`, `${formatNum(phase3Ciment)} Sacs`, `${fr2(phase3Acier)} T (HA12, HA10, HA8)`, `${formatNum(p3Gravier)} m³`, `${formatNum(h50b)} hourdis + ${formatNum(Math.round(nbAgglos15 * 0.4))} agglos 15`],
      ["Phase 4 : Toiture Terrasse, Acrotères & Enduits", `${formatNum(phase4Ciment)} Sacs`, `${fr2(phase4Acier)} T (HA10, HA8, HA6)`, `${formatNum(p4Gravier)} m³`, `${formatNum(Math.round(nbAgglos15 * 0.3))} agglos 15 + sable enduits`]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Étape des Travaux', 'Quota Ciment 42.5R', 'Quota Aciers FeE500', 'Quota Gravier Diack', 'Matériaux Complémentaires']],
      planningRows,
      {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 24, halign: 'right' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 48 }
      }
    ));

    // Contrôle technique bloquant de concordance des phases
    const checkCimentPhases = phase1Ciment + phase2Ciment + phase3Ciment + phase4Ciment;
    const checksPhases = (checkCimentPhases === totalSacsCiment);
    if (!checksPhases) throw new Error("Incohérence somme approvisionnement ciment");

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. CONTRÔLE DES RATIOS DE BÉTONNAGE & RECETTES CHANTIER (DOSAGE 350 KG)");

    const recettesRows = [
      ["Composition par Gâchée (1 Sac de Ciment)", "1 sac ciment (50 kg) + 1 brouette sable (env. 40 L) + 2 brouettes gravier (env. 80 L) + 22 à 25 L d'eau propre", "Interdire formellement l'excès d'eau pour faciliter la mise en œuvre (chute drastique de résistance)."],
      ["Contrôle d'Affaissement au Cône d'Abrams", "Affaissement prescrit : 6 à 9 cm (Béton plastique à très maniable)", "Mesure systématique à l'arrivée de chaque toupie ou première gâchée de la journée."],
      ["Surveillance des Armatures avant Coulage", "Vérification des cales d'enrobage, ligature croisée et recouvrement minimal (50 diamètres)", "Point d'arrêt obligatoire : coulage strictement interdit sans visa de ferraillage."],
      ["Cure du Béton Jeune sous Climat Sahélien", "Arrosage abondant 2 fois par jour pendant 7 jours minimum ou produit de cure agréé", "Évite la dessiccation prématurée et les fissures de retrait plastique."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Paramètre de Bétonnage', 'Exigence ChantierSur', 'Conséquence en Cas de Non-Respect']],
      recettesRows,
      {
        0: { cellWidth: 48, fontStyle: 'bold' },
        1: { cellWidth: 47 },
        2: { cellWidth: 75 }
      }
    ));

    // =========================================================================
    // PAGE 4 : RÉCAPITULATIF BUDGÉTAIRE & CLAUSES DE DÉCOFFRAGE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Quantitatif Estimatif (BQE) Gros œuvre", "Partie IV : Synthèse Budgétaire Gros œuvre & Clauses de Sécurité au Décoffrage", refDoc, currentDate, clientName, clientPhone, lotNumber, 'express');

    const moRatioM2 = levels >= 4 ? 38000 : (levels >= 2 ? 34000 : 28000);
    const totalMainOeuvre = Math.round(surface * moRatioM2);
    const totalGrosOeuvreHT = totalFournituresTTC + totalMainOeuvre;

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÉCAPITULATIF BUDGÉTAIRE GROS œUVRE & CLÉS DE PAIEMENT CONTRAT COCC");

    const recapRows = [
      ["Fournitures Matériaux de Base", formatFCFA(totalFournituresTTC), `${Math.round((totalFournituresTTC / totalGrosOeuvreHT) * 100)} %`, "Approvisionnements échelonnés selon les 4 phases"],
      ["Main d'œuvre Tâcheron / Entreprise", formatFCFA(totalMainOeuvre), `${Math.round((totalMainOeuvre / totalGrosOeuvreHT) * 100)} %`, "Paiement lié exclusivement à la validation des 6 points d'arrêt"],
      ["BUDGET TOTAL GROS œUVRE ESTIMATIF", formatFCFA(totalGrosOeuvreHT), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalGrosOeuvreHT / surface))} / m² SDP`],
      ["Retenue de garantie contractuelle (5 %)", formatFCFA(Math.round(totalGrosOeuvreHT * 0.05)), "5 %", "Clause convenue entre les parties, consignée jusqu'à la réception définitive. En droit sénégalais, la règle des 5 % n'existe que pour les marchés publics (décret n° 2022-2295, art. 118-119) ; pour un chantier privé, elle résulte du contrat, pas de la loi."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste de Dépense', 'Montant Estimatif', 'Quote-Part', 'Condition de Déblocage']],
      recapRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 68 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. DÉLAIS DE DÉCOFFRAGE RECOMMANDÉS (RÈGLES PROFESSIONNELLES BAEL 91 R99)");

    const clausesRows = [
      ["Joues de Poutres & Faces de Poteaux", SEUILS_TECHNIQUES.decoffrageJoues, "Décoffrage possible sans mise en charge. Arrosage immédiat pour cure."],
      ["Sous-faces de Poutres & Dalles", SEUILS_TECHNIQUES.decoffrageSousFaces, "Décoffrage déconseillé avant 21 jours sans note de calcul de résistance."],
      ["Étais de Sécurité sous Poutres Maîtresses", "Maintien 28 jours", "Conserver 1 étai de soulagement sur deux jusqu'à résistance nominale fc28."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Élément Porteur', 'Délai Minimal Préconisé', 'Conditions & Précautions']],
      clausesRows,
      {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 90 }
      }
    ));

    // Encadré « RÉFÉRENCES » (Style ESQUISSE, articles propres à EXPRESS)
    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.0;
    const refBoxHeight = 30;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, refBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, currentY, USABLE_WIDTH, refBoxHeight, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("RÉFÉRENCES RÉGLEMENTAIRES, NORMATIVES & SOURCES VÉRIFIÉES :", MARGIN_LEFT + 4, currentY + 5.2);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(51, 65, 85);
    const refSources = [
      "• Arrêté n° 09852 du 24 juin 2024 (prix du ciment type 32.5) ;",
      "• Décret n° 2022-2295, art. 118-119 (retenue de garantie — marchés publics uniquement) ;",
      "• ANSD, Indice des coûts des BTP (IBTP), T2 2026 ;",
      "• BAEL 91 R99 (règles professionnelles, référence technique) ;",
      "• NF P 06-001 (charges d'exploitation — norme d'usage courant)."
    ];
    let refY = currentY + 9.8;
    for (const source of refSources) {
      doc.text(source, MARGIN_LEFT + 4, refY);
      refY += 3.9;
    }

    // Bandeau VISA technique — fond rouge #BF382B, texte blanc #FFFFFF, pleine largeur
    currentY = currentY + refBoxHeight + TABLE_GAP_MM;
    const visaHeight = 22;
    doc.setFillColor(191, 56, 43); // #BF382B
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, visaHeight, 'F');
    doc.setDrawColor(150, 30, 20);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, visaHeight, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("VISA TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const disclaimerLines = doc.splitTextToSize(
      "Document indicatif d'aide à la décision généré automatiquement. Il ne constitue ni une note de calcul, ni le visa d'un bureau d'études agréé. Les quantitatifs, sections d'acier et ratios doivent être confirmés par des professionnels qualifiés avant tout engagement financier ou commande de matériaux.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerLines, MARGIN_LEFT + 4, currentY + 11);
    doc.text(`Rapport émis à Dakar le ${currentDate} pour le compte exclusif de ${clientName}. Réf: ${refDoc}`, MARGIN_LEFT + 4, currentY + 19);
  }

  // =========================================================================
  // 3. LIVRABLE : CONTRE-EXPERTISE & AUDIT DEVIS BTP (4 PAGES)
  // =========================================================================
  function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = `${rawPrefix} ${rawPhone}`;

    const quotedAmount = parseFloat(data.quoted_amount) || 45000000;
    const surface = parseFloat(data.surface) || 250;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const totalLevelsCount = levels + 1;
    const scope = data.contract_scope || 'tce';
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const lotNumber = data.lot_number || 'Non spécifié';

    const sToiture = Math.max(20, Math.round(surface / totalLevelsCount));
    const partEtancheiteRef = sToiture * SEUILS_TECHNIQUES.ratioEtancheiteM2Moyen;

    // Référentiel BET Dakar 2026
    const ratioBetMoyen = scope === 'go_seul' ? 145000 : (scope === 'clos_couvert' ? 210000 : 277500);
    const refMoyen = Math.round(surface * ratioBetMoyen);
    const refBas = Math.round(refMoyen * 0.88);
    const refHaut = Math.round(refMoyen * 1.15);
    const contractAmount = parseFloat(data.contract_amount) || refMoyen;

    const penaliteJournaliere = Math.round(contractAmount * SEUILS_TECHNIQUES.penaliteJourRatio);
    const plafondPenalites = Math.round(contractAmount * SEUILS_TECHNIQUES.plafondPenalitesTaux);

    const diffMontant = quotedAmount - refMoyen;
    const ecartPourcent = Math.round((diffMontant / refMoyen) * 100);

    let diagnosticGeneral = "";
    if (ecartPourcent < -25) {
      diagnosticGeneral = "DEVIS ANORMALEMENT BAS : Risque critique d'abandon de chantier, malfaçons sévères ou sous-dosage du ciment.";
    } else if (ecartPourcent < -10) {
      diagnosticGeneral = "DEVIS TRÈS COMPÉTITIF : Vérifier scrupuleusement la qualité des aciers (FeE500 certifiés) et l'épaisseur du dallage.";
    } else if (ecartPourcent <= 15) {
      diagnosticGeneral = "DEVIS CONFORME AU MARCHÉ : Tarifs en cohérence avec les mercuriales professionnelles du BTP à Dakar.";
    } else {
      diagnosticGeneral = "DEVIS SURÉVALUÉ : Marges excessives ou quantitatifs gonflés. Fort potentiel de renégociation.";
    }

    // =========================================================================
    // PAGE 1 : CONFRONTATION GLOBALE & RÉPARTITION PAR MACRO-LOT
    // =========================================================================
    drawUnifiedHeader(doc, "Rapport d'Audit de Devis", "Partie I : Confrontation Globale au Référentiel BET & Audit par Macro-Lot", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("SYNTHÈSE DE L'AUDIT & IDENTIFICATION DU DEVIS ANALYSÉ", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Montant Devis Soumis : ${formatFCFA(quotedAmount)}`, MARGIN_LEFT + 4, 75);
    doc.text(`Périmètre Travaux : ${scope.toUpperCase()}`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Budget Cible Recommandé : ${formatFCFA(refMoyen)}`, 108, 69);
    doc.text(`Écart Global : ${ecartPourcent > 0 ? '+' : ''}${ecartPourcent} % (${formatFCFA(diffMontant)})`, 108, 75);
    doc.text(`Diagnostic Global : ${diagnosticGeneral.substring(0, 32)}...`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. CONFRONTATION GLOBALE DU DEVIS AU RÉFÉRENTIEL DAKAR 2026");

    const auditGlobalRows = [
      ["Montant Total Devis Soumis", formatFCFA(quotedAmount), `${formatFCFA(Math.round(quotedAmount / surface))} / m²`, "Montant TTC saisi par le maître d'ouvrage"],
      ["Fourchette Référentiel Basse", formatFCFA(refBas), `${formatFCFA(Math.round(refBas / surface))} / m²`, "Seuil minimum en dessous duquel la qualité est compromise"],
      ["Budget de Référence Médian BET", formatFCFA(refMoyen), `${formatFCFA(Math.round(refMoyen / surface))} / m²`, "Budget objectif recommandé pour la négociation"],
      ["Fourchette Référentiel Haute", formatFCFA(refHaut), `${formatFCFA(Math.round(refHaut / surface))} / m²`, "Prix plafond pour prestations d'entreprise générale de standing"],
      ["Écart Constaté vs Référence", `${ecartPourcent > 0 ? '+' : ''}${ecartPourcent} %`, formatFCFA(diffMontant), diagnosticGeneral]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Indicateur d\'Analyse', 'Devis Soumis Artisan', 'Référentiel BET ChantierSur', 'Écart & Diagnostic']],
      auditGlobalRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        3: { cellWidth: 68 }
      }
    ));

    // SECTION II : TABLEAU II CONCORDANCE STRICTE
    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "II. RÉPARTITION COMPARATIVE PAR MACRO-LOT (DEVIS SOUMIS VS RÉFÉRENTIEL BET)");

    const coefGo = scope === 'go_seul' ? 0.88 : (scope === 'clos_couvert' ? 0.60 : 0.48);
    const coefSo = scope === 'go_seul' ? 0 : (scope === 'clos_couvert' ? 0.25 : 0.38);
    const tauxAleas = SEUILS_TECHNIQUES.provisionAleasTaux;            // 0.05
    const tauxMarge = SEUILS_TECHNIQUES.margeEntrepreneurMoyenne;    // 0.085
    const facteurTotal = 1.0 + tauxAleas + tauxMarge;                // 1.135

    // Décomposition 100% concordante de Ref BET (Somme des lignes = refMoyen)
    const coutDirectRef = Math.round(refMoyen / facteurTotal);
    const partAleasRef = Math.round(coutDirectRef * tauxAleas);
    const partMargeRef = refMoyen - coutDirectRef - partAleasRef;

    const partEtancheiteRefCalculee = scope === 'go_seul' ? 0 : partEtancheiteRef;
    const remDirectRef = coutDirectRef - partEtancheiteRefCalculee;
    const partGoRef = Math.round(remDirectRef * (coefGo / (coefGo + coefSo)));
    const partSoRef = scope === 'go_seul' ? 0 : (remDirectRef - partGoRef);

    // Décomposition 100% concordante de Devis Soumis (Somme des lignes = quotedAmount)
    const coutDirectSoumis = Math.round(quotedAmount / facteurTotal);
    const partAleasSoumis = Math.round(coutDirectSoumis * tauxAleas);
    const partMargeSoumis = quotedAmount - coutDirectSoumis - partAleasSoumis;

    const partEtancheiteSoumis = scope === 'go_seul' ? 0 : Math.round(partEtancheiteRefCalculee * (quotedAmount / refMoyen));
    const remDirectSoumis = coutDirectSoumis - partEtancheiteSoumis;
    const partGoSoumis = Math.round(remDirectSoumis * (coefGo / (coefGo + coefSo)));
    const partSoSoumis = scope === 'go_seul' ? 0 : (remDirectSoumis - partGoSoumis);

    // Écarts ligne par ligne
    const ecartGo = partGoSoumis - partGoRef;
    const ecartSo = partSoSoumis - partSoRef;
    const ecartEtancheite = partEtancheiteSoumis - partEtancheiteRefCalculee;
    const ecartAleas = partAleasSoumis - partAleasRef;
    const ecartMarge = partMargeSoumis - partMargeRef;

    // Test bloquant d'intégrité comptable
    const verifSommeSoumis = partGoSoumis + partSoSoumis + partEtancheiteSoumis + partAleasSoumis + partMargeSoumis;
    const verifSommeRef = partGoRef + partSoRef + partEtancheiteRefCalculee + partAleasRef + partMargeRef;
    const verifSommeEcarts = ecartGo + ecartSo + ecartEtancheite + ecartAleas + ecartMarge;

    if (verifSommeSoumis !== quotedAmount || verifSommeRef !== refMoyen || verifSommeEcarts !== (quotedAmount - refMoyen)) {
      throw new Error("Discordance critique dans la décomposition du Tableau II d'Audit");
    }

    function fmtEcart(val) {
      if (val === 0) return "0 FCFA";
      return (val > 0 ? "+" : "") + formatFCFA(val);
    }

    const repartitionRows = [
      [
        "Gros œuvre & Structure BAEL",
        formatFCFA(partGoSoumis),
        formatFCFA(partGoRef),
        fmtEcart(ecartGo),
        "Terrassements, fondations, poteaux, poutres, dalles, maçonneries"
      ],
      [
        "Second œuvre & Finitions",
        scope === 'go_seul' ? "Exclu" : formatFCFA(partSoSoumis),
        scope === 'go_seul' ? "Exclu" : formatFCFA(partSoRef),
        scope === 'go_seul' ? "-" : fmtEcart(ecartSo),
        scope === 'go_seul' ? "Hors périmètre contrat" : "Plomberie, électricité, carrelage, menuiseries int./ext."
      ],
      [
        "Étanchéité Toiture & Acrotères",
        scope === 'go_seul' ? "Exclu" : formatFCFA(partEtancheiteSoumis),
        scope === 'go_seul' ? "Exclu" : formatFCFA(partEtancheiteRefCalculee),
        scope === 'go_seul' ? "-" : fmtEcart(ecartEtancheite),
        `Complexe bitumineux (${sToiture} m² toiture — 28 000 F/m² — à valider BET)`
      ],
      [
        "Provision pour Aléas (5% direct)",
        formatFCFA(partAleasSoumis),
        formatFCFA(partAleasRef),
        fmtEcart(ecartAleas),
        "Couverture des sujétions imprévues et aléas de sol"
      ],
      [
        "Marge Entrepreneur (8,5% direct)",
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
        "Confrontation globale concordante du devis vs budget repère BET"
      ]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Macro-Lot Technique', 'Devis Soumis', 'Budget Réf. BET', 'Écart Constaté', 'Base & Observations']],
      repartitionRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 26, halign: 'right' },
        2: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 48 }
      }
    ));

    // =========================================================================
    // PAGE 2 : PIÈGES TECHNIQUES & LES 7 OMISSIONS FRÉQUENTES
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Audit de Devis", "Partie II : Détection des Pièges Techniques, Ratios Incohérents & Omissions", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. AUDIT DES RATIOS STRUCTURAUX & PIÈGES TECHNIQUES COURANTS");

    const piegesRows = [
      ["Dosage du Béton Armé", "Mention imprécise 'Béton Armé'", "Privilégier le CEM II 42.5R dosé à 350 kg/m³ pour les éléments porteurs (marge de sécurité sur fc28 = 25 MPa). Ciment 32.5N admissible uniquement sous réserve d'essais."],
      ["Qualité & Diamètre des Aciers", "Aciers non spécifiés ou lisses", "Imposer : Aciers Haute Adhérence FeE500 certifiés. Interdire les fers déclassés ou de récupération."],
      ["Épaisseur Table de Compression", "Table réduite à 2 ou 3 cm", "Norme BAEL 91 : Épaisseur minimale de 4 cm armée d'un treillis soudé (exigence BAEL : flexion locale et fonctionnement en diaphragme horizontal)."],
      ["Enrobage des Armatures", "Absence totale de cales béton", "Exiger cales de 4,5 cm en milieu marin (Dakar Littoral) et 3 cm en zone intérieure sous peine de rouille expansive."],
      ["Nature des Agrégats", "Gravier calcaire tendre", "Prescrire obligatoirement le concassé de basalte des carrières de Diack pour toute la structure porteuse."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant Structurel', 'Piège / Formule Trompeuse Constatée', 'Recommandation']],
      piegesRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 53 },
        2: { cellWidth: 75 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "IV. LES 7 OMISSIONS FRÉQUENTES DANS LES DEVIS SÉNÉGALAIS");

    const omissionsRows = [
      ["Étanchéité Toiture & Acrotères", "Complexe monocouche bâclé", "Imposer complexe bitumineux bicouche 4 mm sablé + relevés d'étanchéité 15 cm (DTU 43.1)."],
      ["Canalisations EU/EP & Regards", "Réseau d'évacuation non chiffré", "Intégrer tubes PVC évacuation normalisés + regards de visite siphoïdes à chaque angle."],
      ["Tableau Électrique & Terre", "Prise de terre absente du devis", "Piquet de terre obligatoire avec mesure < 100 Ohms (50V max) + différentiels 30 mA (NF C 15-100)."],
      ["Nettoyage & Évacuation Gravats", "Non mentionné au devis", "Stipuler que le repli de chantier et l'évacuation à la décharge autorisée incombent à l'entrepreneur."],
      ["Arase Étanche sous Soubassement", "Absente sur les devis courants", "Barrière d'arase étanche obligatoire pour stopper les remontées capillaires (DTU 20.1)."],
      ["Réservation Gaines & Fourreaux", "Forages facturés en suppléments", "Imposer la pose préalable des fourreaux avant coulage des dalles et poutres."],
      ["Étais & Sécurité de Coulage", "Coffrages sous-dimensionnés", "Exiger étaiement certifié tous les 80 cm sous poutres et maintien 21 jours minimum."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Poste Oublié ou Minimisé', 'Impact Financier Imprévu', 'Source Normative & Recommandation']],
      omissionsRows,
      {
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { cellWidth: 33, halign: 'right' },
        2: { cellWidth: 95 }
      }
    ));

    // =========================================================================
    // PAGE 3 : ÉCHÉANCIER DE PAIEMENT & ENCADREMENT CONTRACTUEL COCC
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Audit de Devis", "Partie III : Échéancier de Paiement Sécurisé & Clauses Juridiques COCC", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    const tranche1 = Math.round(contractAmount * 0.15);
    const tranche2 = Math.round(contractAmount * 0.25);
    const tranche3 = Math.round(contractAmount * 0.25);
    const tranche4 = Math.round(contractAmount * 0.20);
    const tranche5 = Math.round(contractAmount * 0.10);
    const tranche6 = contractAmount - (tranche1 + tranche2 + tranche3 + tranche4 + tranche5); // 5% retenue

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. ÉCHÉANCIER DE PAIEMENT SÉCURISÉ & CLÉS D'AVANCEMENT (BASE NÉGOCIÉE)");

    const echeancierRows = [
      ["Tranche 1 : Démarrage & Approvisionnement", formatFCFA(tranche1), "15 %", "Après implantation validée par géomètre et approvisionnement des premiers aciers."],
      ["Tranche 2 : Fondations & Plancher Bas", formatFCFA(tranche2), "25 %", "Après coulage semelles, longrines, soubassement et dallage (point d'arrêt 1 & 2)."],
      ["Tranche 3 : Poteaux & Dalle RDC", formatFCFA(tranche3), "25 %", "Après coulage de la dalle supérieure et validation du ferraillage (point d'arrêt 3)."],
      ["Tranche 4 : Élévations & Dalles Étages", formatFCFA(tranche4), "20 %", "Après achèvement des maçonneries d'étages et coulage toiture (point d'arrêt 4 & 5)."],
      ["Tranche 5 : Réception Provisoire avec Réserves", formatFCFA(tranche5), "10 %", "Après visite contradictoire et signature du PV de réception (Article 740 COCC)."],
      ["Tranche 6 : Retenue de Garantie Légale (COCC)", formatFCFA(tranche6), "5 %", "Libérable 1 an après réception définitive sans désordre (Article 742 COCC)."]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Tranche de Paiement', 'Montant Cible Négocié', 'Quote-Part', 'Condition Impérative de Déblocage']],
      echeancierRows,
      {
        0: { cellWidth: 46, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 74 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VI. ENCADREMENT CONTRACTUEL COCC & PÉNALITÉS DE RETARD");

    const clausesRows = [
      ["Clause de Pénalités de Retard Journalières", `Pénalité de 1/1000e par jour de retard calendaire (${formatFCFA(penaliteJournaliere)} / jour), plafonnée à 5% (${formatFCFA(plafondPenalites)}).`, REFERENCES_JURIDIQUES.penalitesRetard],
      ["Clause de Retenue de Garantie 5%", "Déduction systématique de 5% sur chaque décompte mensuel, consignée jusqu'à la levée de toutes les réserves.", REFERENCES_JURIDIQUES.retenueGarantie],
      ["Points d'Arrêt & Contrôle Technique", "Interdiction absolue de couler sans visa formel de ferraillage du BET. Tout béton non visé sera refusé.", REFERENCES_JURIDIQUES.receptionTravaux],
      ["Garantie Décennale des Gros Ouvrages", "Responsabilité de plein droit de l'entrepreneur pendant 10 ans sur la solidité et l'étanchéité.", REFERENCES_JURIDIQUES.garantieDecennale]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Clause Contractuelle Obligatoire', 'Formulation Protectrice Recommandée', 'Réf. Juridique COCC']],
      clausesRows,
      {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 85 },
        2: { cellWidth: 40 }
      }
    ));

    // =========================================================================
    // PAGE 4 : STRATÉGIE DE NÉGOCIATION & FEUILLE DE ROUTE CONTRACTUELLE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Rapport d'Audit de Devis", "Partie IV : Stratégie de Négociation & Argumentaire Technique ChantierSur", refDoc, currentDate, clientName, clientPhone, lotNumber, 'audit');

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. GRILLE DE NÉGOCIATION & ARGUMENTAIRE CHANTIERSUR");

    const negociationRows = [
      ["Fourniture des Aciers FeE500", "L'artisan surfacture souvent l'acier", "Acheter soi-même les aciers auprès d'usines agréées (SOCOCIM/Someta) et payer la façon", "Économie : 10% à 15% sur le lot armatures"],
      ["Dosage & Qualité du Ciment", "L'artisan propose du ciment 32.5N standard", "Exiger contractuellement le CEM II 42.5R avec bon de livraison usine", "Protection vitale contre l'effondrement précoce"],
      ["Étanchéité Toiture-Terrasse", "L'artisan sous-estime la surface de toiture", `Imposer les ${sToiture} m² réels calculés au ratio DTU 43.1`, "Protection totale contre les infiltrations d'hivernage"],
      ["Acomptes & Trésorerie Chantier", "L'artisan exige 40% à 50% d'avance", "Plafonner strictement l'avance à 15% contre approvisionnement effectif sur le site", "Zéro risque de fuite de l'artisan avec la trésorerie"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Sujet de Négociation', 'Position Fréquente de l\'Artisan', 'Contre-Proposition ChantierSur', 'Économie / Protection']],
      negociationRows,
      {
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { cellWidth: 56 },
        3: { cellWidth: 38 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TABLE_GAP_MM + 1.5;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 20, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 20, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("VISA TECHNIQUE DU BUREAU D'ÉTUDES NUMÉRIQUE CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SLATE);
    const disclaimerAudit = doc.splitTextToSize(
      "Cet audit est un rapport indicatif d'aide à la décision établi selon les mercuriales moyennes du BTP à Dakar (valeurs 2026). Il ne constitue ni une expertise judiciaire ni une garantie de prix fixe. Il appartient au maître d'ouvrage de formaliser son contrat avec l'assistance d'un juriste ou d'un BET agréé.",
      USABLE_WIDTH - 8
    );
    doc.text(disclaimerAudit, MARGIN_LEFT + 4, currentY + 10);
    doc.text(`Rapport de contre-expertise émis à Dakar le ${currentDate}. Dossier Réf: ${refDoc}`, MARGIN_LEFT + 4, currentY + 17.5);
  }

  // =========================================================================
  // 4. LIVRABLE : PRESTATIONS TRANSVERSES
  // =========================================================================
  function renderOtherServices(doc, data, service, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const surface = parseFloat(data.surface) || 200;
    const location = data.project_location || 'Dakar';

    drawUnifiedHeader(doc, `Rapport Spécialisé : ${service.toUpperCase()}`, "Dossier Technique & Recommandations Réglementaires BTP Sénégal", refDoc, currentDate, clientName, '', '', service);

    let currentY = 52;
    drawSectionTitle(doc, currentY, "I. SYNTHÈSE DES DISPOSITIONS TECHNIQUES & RÉGLEMENTAIRES");

    const rows = [
      ["Formule Souscrite", service.toUpperCase(), "Module de conseil technique ChantierSur.com"],
      ["Surface Déclarée", `${surface} m²`, "Surface utile du projet analysé"],
      ["Zone Géographique", location, "Contexte urbain et environnemental"],
      ["Dispositions Applicables", "Code de l'Urbanisme & COCC", "Cadre légal de la République du Sénégal"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Paramètre d\'Étude', 'Valeur / Référence', 'Observations & Prescriptions']],
      rows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 75 }
      }
    ));
  }

  // =========================================================================
  // 5. LIVRABLE : BORDEREAU TECHNIQUE FINITIONS & SECOND œUVRE (4 PAGES)
  // =========================================================================
  function renderFinitions(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
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
    const lotNumber = data.lot_number || 'Non spécifié';
    const delaiReserves = parseInt(data.delai_reserves, 10) || 15;

    // Ratios second œuvre 2026
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
    if (checkSommeCarrelage !== totalLotCarrelageF) throw new Error("Incohérence somme carrelage");

    const totalEtancheiteF = Math.round(sToitureTerrasse * prixEtancheiteM2);
    const nbSallesEau = Math.max(2, Math.round(surface / 65));
    const totalEtancheiteHumideF = nbSallesEau * 120000;

    // Plomberie EU/EP décomposée
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

    // Électricité NF C 15-100 (0,55 pt/m²)
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

    // Menuiseries décomposées
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

    // Peinture décomposée
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
    // PAGE 1 : CARRELAGE & ÉTANCHÉITÉ TOITURE
    // =========================================================================
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie I : Revêtements de Sol, Faïences Murales & Étanchéité Toiture", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, 50, USABLE_WIDTH, 34, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("PARAMÈTRES DES FINITIONS & SPÉCIFICATIONS DU STANDING", MARGIN_LEFT + 4, 56);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName}`, MARGIN_LEFT + 4, 63);
    doc.text(`Téléphone : ${clientPhone}`, MARGIN_LEFT + 4, 69);
    doc.text(`Surface Développée : env. ${surface} m²`, MARGIN_LEFT + 4, 75);
    doc.text(`Standing Choisi : ${standing.toUpperCase()}`, MARGIN_LEFT + 4, 81);

    doc.text(`Localisation : ${location}`, 108, 63);
    doc.text(`Revêtement Sol : ${tileType.replace(/_/g, ' ').toUpperCase()}`, 108, 69);
    doc.text(`Menuiseries : ${joineryType.replace(/_/g, ' ').toUpperCase()}`, 108, 75);
    doc.text(`Délai Levée Réserves : ${delaiReserves} jours calendaires`, 108, 81);

    let currentY = 90;
    drawSectionTitle(doc, currentY, "I. LOT REVÊTEMENTS DE SOL & FAÏENCES MURALES (DTU 52.1)");

    const carrelageRows = [
      ["Carrelage Sol Séjour & Chambres", `${sSolCarrelee} m²`, `${formatFCFA(prixCarrelageM2)} / m²`, formatFCFA(totalCarrelageSolF), "Grès cérame émaillé antidérapant R10"],
      ["Faïences Murales Cuisines & Salles d'Eau", `${sMursFaience} m²`, `${formatFCFA(prixFaienceM2)} / m²`, formatFCFA(totalFaienceF), "Carreaux muraux jusqu'à 2,10 m de hauteur"],
      ["Mortier-Colle C2TE Spécial Fortes Chaleurs", `${sacsColleRequis} Sacs (25 kg)`, "4 500 FCFA / Sac", formatFCFA(totalColleF), "Rendement indicatif : 6,5 m² / sac (double encollage)"],
      ["Joint de Carrelage Hydrofuge & Anti-Moisissures", `${sacsJointRequis} Sacs (5 kg)`, "3 500 FCFA / Sac", formatFCFA(totalJointF), "Rendement indicatif : 22 m² / sac (largeur 3 mm)"],
      ["TOTAL FOURNITURES CARRELAGE & FAÏENCE", "-", "-", formatFCFA(totalLotCarrelageF + totalFaienceF), "Fournitures complètes avec colles et joints"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Désignation du Poste', 'Surface / Quantité', 'Fourniture & Pose', 'Montant Estimatif HT', 'Prescription DTU']],
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
    drawSectionTitle(doc, currentY, "II. LOT ÉTANCHÉITÉ TOITURE-TERRASSE & PIÈCES HUMIDES (DTU 43.1)");

    const etancheiteRows = [
      ["Complexe Toiture Terrasse Accessible", `${sToitureTerrasse} m²`, "Bicouche bitumineux élastomère SBS 4 mm", formatFCFA(totalEtancheiteF), "Relevés d'étanchéité 15 cm + chape de protection"],
      ["Étanchéité sous Carrelage Salles d'Eau", `${nbSallesEau} Salles d'eau`, "Système d'Étanchéité Liquide (SEL)", formatFCFA(totalEtancheiteHumideF), "Traitement rigoureux des siphons et pieds de cloisons"],
      ["Forme de Pente & Évacuations Pluviales", `${sToitureTerrasse} m²`, "Pente minimale 1,5% vers gargouilles", "Inclus gros œuvre", "Deux moignons d'évacuation par terrasse au minimum"],
      ["TOTAL ESTIMATIF ÉTANCHÉITÉ OUVRAGES", "-", "-", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), "Protection vitale contre les sinistres d'hivernage"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Ouvrage d\'Étanchéité', 'Surface Traitée', 'Système Préconisé', 'Montant Estimatif HT', 'Règle Normative']],
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
    // PAGE 2 : PLOMBERIE EU/EP & ÉLECTRICITÉ
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie II : Plomberie Sanitaire (EU/EP) & Électricité Basse Tension (NF C 15-100)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "III. LOT PLOMBERIE SANITAIRE & ÉVACUATIONS EU/EP (DTU 60.1)");

    const plomberieRows = [
      ["Appareils Sanitaires (WC suspendus / Lavabos)", `${qSanitaires} Ensembles`, `${formatFCFA(puSanitaires)} / Ens.`, formatFCFA(montantSanitaires), "Cuvettes céramique NF avec mécanisme silencieux"],
      ["Robinetterie & Mitigeurs Céramiques", `${qMitigeurs} Pièces`, `${formatFCFA(puMitigeurs)} / U`, formatFCFA(montantMitigeurs), "Mitigeurs chromés cartouche céramique 35 mm"],
      ["Réseaux Alimentation PER/Multicouche", `${qAlim} Salles de bain`, `${formatFCFA(puAlim)} / Ens.`, formatFCFA(montantAlim), "Tubes sous gaine anti-corrosion sans raccord encastré"],
      ["Évacuations Eaux Usées / Eaux Pluviales (EU/EP)", "Ensemble réseau", "Forfait calibré", "Inclus aux postes", "Tubes PVC NF évacuation de 50, 100 et 110 mm"],
      ["TOTAL ESTIMATIF PLOMBERIE EU/EP", "-", "-", formatFCFA(totalPlomberieF), "Fourniture des équipements et collecteurs"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Équipement Sanitaire / Réseau', 'Quantitatif', 'Prix Unitaire Estimé', 'Montant Total HT', 'Prescription DTU 60.1']],
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
    drawSectionTitle(doc, currentY, "IV. LOT ÉLECTRICITÉ & COURANTS FAIBLES (NORME NF C 15-100)");

    const electriciteRows = [
      ["Points Électriques Calibrés (0,55 pt/m²)", `${nbPointsElec} Points`, `${formatFCFA(puPointElec)} / Pt`, formatFCFA(montantPoints), "Prises de courant, éclairages LED, interrupteurs Legrand"],
      ["Tableaux Divisionnaires avec Différentiels 30mA", `${qTableaux} Tableau(x)`, `${formatFCFA(puTableaux)} / U`, formatFCFA(montantTableaux), "Protection par disjoncteurs magnétothermiques normalisés"],
      ["Lignes Climatisation Dédiées (Courbe C)", `${qClim} Lignes`, `${formatFCFA(puClim)} / Ligne`, formatFCFA(montantClim), "Lignes séparées 2.5 mm² sous disjoncteur courbe C 16A/20A"],
      ["Réseau de Terre & Liaison Équipotentielle", "1 Réseau complet", "Seuil normatif < 100 Ohms", "Inclus au lot", "Tension de sécurité 50V max pour locaux humides"],
      ["TOTAL ESTIMATIF ÉLECTRICITÉ NF C 15-100", "-", "-", formatFCFA(totalElectriciteF), "Conforme aux normes de sécurité électrique"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Composant de l\'Installation', 'Quantitatif Calibré', 'Prix Unitaire Estimé', 'Montant Total HT', 'Exigence Normative']],
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
    // PAGE 3 : MENUISERIES & PEINTURE (DÉCOMPOSITION Q — PU)
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie III : Menuiseries Int./Ext. (Q — PU) & Peintures Normalisées (DTU 59.1)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "V. LOT MENUISERIES EXTÉRIEURES & INTÉRIEURES (DÉCOMPOSITION Q — PU)");

    const menuiseriesRows = [
      ["Portes Intérieures Isoplanes Gravées", `${qPortesInt} Blocs`, `${formatFCFA(puPorteInt)} / U`, formatFCFA(montantPortesInt), "Huisseries métalliques traitées anti-corrosion + serrures"],
      ["Châssis Coulissants Alu Vitré (Fenêtres)", `${qChassisAlu} Châssis`, `${formatFCFA(puChassisAlu)} / U`, formatFCFA(montantChassisAlu), "Alu laqué 1.4 mm avec vitrage Stopsol 6 mm"],
      ["Grandes Baies Vitrées Coulissantes Salon", `${qBaiesVitrees} Baie(s)`, `${formatFCFA(puBaieVitree)} / U`, formatFCFA(montantBaies), "Profilés alu renforcés et roulements à billes inox étanches"],
      ["Porte d'Entrée Principale Sécurisée", `${qPorteBlindee} Porte`, `${formatFCFA(puPorteBlindee)} / U`, formatFCFA(montantPorteBlindee), "Porte blindée acier 7 points ou bois massif traité"],
      ["TOTAL ESTIMATIF LOT MENUISERIES", "-", "-", formatFCFA(totalMenuiseriesF), "Fourniture et pose complète des menuiseries"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Type de Menuiserie', 'Nombre / Dimensions', 'Prix Unitaire Estimé', 'Montant Total HT', 'Spécification Technique']],
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
    drawSectionTitle(doc, currentY, "VI. LOT PEINTURE, ENDUITS & FINITIONS DÉCORATIVES (DTU 59.1)");

    const peintureRows = [
      ["Enduit de Rebouchage & Ratissage Complet", `${sMursEnduit} m²`, `${formatFCFA(puEnduit)} / m²`, formatFCFA(montantEnduit), "Deux passes croisées avec ponçage fin anti-rayures"],
      ["Couche d'Impression Fixatrice Régulatrice", `${sImpression} m²`, `${formatFCFA(puImpression)} / m²`, formatFCFA(montantImpression), "Sous-couche hydrofuge acrylique régulatrice de fond"],
      ["Peinture Intérieure Acrylique Veloutée", `${sPeintureInt} m²`, `${formatFCFA(puPeintureInt)} / m²`, formatFCFA(montantPeintureInt), "Deux couches lavables haute résistance Seigneurie / Astral"],
      ["TOTAL ESTIMATIF LOT PEINTURE", "-", "-", formatFCFA(totalPeintureF), "Application soignée sur murs et plafonds"]
    ];

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Phase & Support de Peinture', 'Surface Traitée', 'Prix au m² Estimé', 'Montant Total HT', 'Prescription DTU 59.1']],
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
    // PAGE 4 : RÉCAPITULATIF BUDGÉTAIRE & PV DE RÉCEPTION CONTRADICTOIRE
    // =========================================================================
    doc.addPage();
    drawUnifiedHeader(doc, "Bordereau Technique Finitions & Second œuvre", "Partie IV : Synthèse Budgétaire TCE & Procès-Verbal de Réception Contradictoire (COCC)", refDoc, currentDate, clientName, clientPhone, lotNumber, 'finitions');

    currentY = 52;
    drawSectionTitle(doc, currentY, "VII. RÉCAPITULATIF BUDGÉTAIRE GLOBAL SECOND œUVRE TCE");

    const recapTceRows = [
      ["Lot 1 : Carrelages, Faïences, Colles & Joints", formatFCFA(totalLotCarrelageF + totalFaienceF), `${Math.round(((totalLotCarrelageF + totalFaienceF) / totalTCEFinitions) * 100)} %`, "Grès cérame, colles C2TE et joints hydrofuges inclus"],
      ["Lot 2 : Étanchéité Toiture Terrasse & Pièces Humides", formatFCFA(totalEtancheiteF + totalEtancheiteHumideF), `${Math.round(((totalEtancheiteF + totalEtancheiteHumideF) / totalTCEFinitions) * 100)} %`, "Complexe bicouche 4 mm sablé et SEL salles d'eau"],
      ["Lot 3 : Plomberie Sanitaire & Réseau Évacuations EU/EP", formatFCFA(totalPlomberieF), `${Math.round((totalPlomberieF / totalTCEFinitions) * 100)} %`, "Sanitaires, mitigeurs et réseaux sans soudure encastrée"],
      ["Lot 4 : Électricité, Tableaux & Lignes Clim (NF C 15-100)", formatFCFA(totalElectriciteF), `${Math.round((totalElectriciteF / totalTCEFinitions) * 100)} %`, `${nbPointsElec} points électriques, disjoncteurs et réseau terre`],
      ["Lot 5 : Menuiseries Intérieures & Extérieures", formatFCFA(totalMenuiseriesF), `${Math.round((totalMenuiseriesF / totalTCEFinitions) * 100)} %`, "Portes isoplanes, châssis alu et baie vitrée salon"],
      ["Lot 6 : Peinture Intérieure & Enduits Ratissés", formatFCFA(totalPeintureF), `${Math.round((totalPeintureF / totalTCEFinitions) * 100)} %`, "Enduits croisés et 2 couches acrylique veloutée"],
      ["Main d'œuvre Spécialisée Pose & Finitions", formatFCFA(totalMainOeuvreF), `${Math.round((totalMainOeuvreF / totalTCEFinitions) * 100)} %`, "Artisans qualifiés avec assurance et respect des DTU"],
      ["BUDGET TOTAL ESTIMATIF SECOND œUVRE TCE", formatFCFA(totalTCEFinitions), "100 %", `Ratio moyen : env. ${formatFCFA(Math.round(totalTCEFinitions / surface))} / m² SDP`]
    ];

    // Vérification de la somme des lignes récapitulatives
    const sommeLignesRecap = (totalLotCarrelageF + totalFaienceF) + (totalEtancheiteF + totalEtancheiteHumideF) + totalPlomberieF + totalElectriciteF + totalMenuiseriesF + totalPeintureF + totalMainOeuvreF;
    if (sommeLignesRecap !== totalTCEFinitions) throw new Error("Incohérence somme récapitulative finitions");

    doc.autoTable(createTableOptions(
      currentY + TITLE_AFTER_GAP_MM,
      [['Lot Technique Second œuvre', 'Montant Estimatif HT', 'Quote-Part TCE', 'Observations & Priorités']],
      recapTceRows,
      {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 34, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 62 }
      }
    ));

    currentY = doc.lastAutoTable.finalY + TITLE_BEFORE_GAP_MM;
    drawSectionTitle(doc, currentY, "VIII. PROCÈS-VERBAL DE RÉCEPTION CONTRADICTOIRE DES TRAVAUX (COCC)");

    // Cadre officiel PV de réception
    const pvBoxY = currentY + TITLE_AFTER_GAP_MM;
    const pvBoxHeight = 56;
    doc.setFillColor(...COLOR_BG_LIGHT);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(MARGIN_LEFT, pvBoxY, USABLE_WIDTH, pvBoxHeight, 2, 2, 'D');

    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR_NAVY);
    doc.text("ACTE JURIDIQUE DE RÉCEPTION DES TRAVAUX (ARTICLE 740 DU COCC)", MARGIN_LEFT + 4, pvBoxY + 5.5);

    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Maître d'Ouvrage : ${clientName} • Réf Dossier : ${refDoc} • Date de visite : ${currentDate}`, MARGIN_LEFT + 4, pvBoxY + 11.5);
    doc.text(`Entrepreneur / Tâcheron en charge des travaux : ....................................................................................................`, MARGIN_LEFT + 4, pvBoxY + 16.5);

    doc.setFont(getFontFamily(doc), 'bold');
    doc.text("DÉCISION CONTRADICTOIRE DES PARTIES :", MARGIN_LEFT + 4, pvBoxY + 22.5);
    doc.setFont(getFontFamily(doc), 'normal');
    doc.text("[ ] RÉCEPTION PRONONCÉE SANS RÉSERVE : L'ouvrage est conforme aux règles de l'art.", MARGIN_LEFT + 8, pvBoxY + 27.5);
    doc.text(`[ ] RÉCEPTION PRONONCÉE AVEC RÉSERVES : Les désordres consignés doivent être levés sous ${delaiReserves} jours.`, MARGIN_LEFT + 8, pvBoxY + 32.5);

    doc.text(`Délai impératif accordé à l'entrepreneur pour la levée intégrale des réserves : ${delaiReserves} jours calendaires.`, MARGIN_LEFT + 4, pvBoxY + 38.5);
    doc.text("La retenue de garantie contractuelle de 5% (COCC) demeure consignée jusqu'au PV de levée des réserves.", MARGIN_LEFT + 4, pvBoxY + 43);

    // Signatures
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(6.8);
    doc.text("Signature Maître d'Ouvrage :", MARGIN_LEFT + 15, pvBoxY + 49);
    doc.text("Signature Entrepreneur / Tâcheron :", 115, pvBoxY + 49);
    doc.setDrawColor(148, 163, 184);
    doc.line(MARGIN_LEFT + 10, pvBoxY + 53, MARGIN_LEFT + 65, pvBoxY + 53);
    doc.line(110, pvBoxY + 53, 165, pvBoxY + 53);
  }

  // =========================================================================
  // EXPORTATION GLOBALE & GESTIONNAIRE DE TÉLÉCHARGEMENT
  // =========================================================================
  window.generateProjectPDF = function(projectData) {
    const jsPDFClass = getJsPDF();
    if (!jsPDFClass) {
      alert("Erreur critique : La bibliothèque jsPDF n'a pas pu être chargée.");
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
      doc.text("ChantierSur.com • Bureau d'Études Numérique Indépendant • Dakar, République du Sénégal.", MARGIN_LEFT, pageHeight - 11);
      if (service === 'finitions') {
        doc.text("Document généré automatiquement à titre indicatif • Normes DTU Second œuvre (52.1, 59.1, 60.1, 43.1) & NF C 15-100.", MARGIN_LEFT, pageHeight - 7);
      } else {
        doc.text("Document généré automatiquement à titre indicatif • BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", MARGIN_LEFT, pageHeight - 7);
      }

      doc.setFont(getFontFamily(doc), 'bold');
      doc.setTextColor(...COLOR_NAVY);
      doc.text(`Page ${p} sur ${totalPages}`, CONTENT_RIGHT, pageHeight - 9, { align: 'right' });
    }

    const fileName = `ChantierSur_${service.toUpperCase()}_${refDoc}.pdf`;
    doc.save(fileName);
  };

  // Fonctions de rendu directes pour intégrations et tests
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
