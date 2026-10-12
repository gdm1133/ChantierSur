// CANARY-UNIQUE-20261011
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkitModule = require('@pdf-lib/fontkit');
const fontkit = fontkitModule.default || fontkitModule;
const { verifyAndConsumeToken } = require('../token-security');

function findFile(filename) {
  const paths = [
    path.join(__dirname, filename),
    path.join(process.cwd(), 'netlify/functions/generer-esquisse-pdf', filename),
    path.join('/var/task/netlify/functions/generer-esquisse-pdf', filename),
    path.join('/var/task/src/netlify/functions/generer-esquisse-pdf', filename),
    path.join(process.cwd(), 'assets/logo', filename)
  ];
  for (let p of paths) { if (fs.existsSync(p)) return p; }
  throw new Error('File not found: ' + filename + ' in ' + paths.join(', '));
}

function wrapText(text, maxWidth, font, fontSize) {
  if (!text) return [];
  const words = String(text).split(' ');
  let lines = [];
  let currentLine = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
    if (width < maxWidth) currentLine += " " + word;
    else { lines.push(currentLine); currentLine = word; }
  }
  lines.push(currentLine);
  return lines;
}

function fmtCfa(num) {
  if (typeof num !== 'number' || isNaN(num)) num = 0;
  return Math.round(num).toLocaleString('fr-FR').replace(/\s/g, '\u00A0') + ' FCFA';
}

function getEsquissePrice(surface) {
  const s = parseFloat(surface) || 150;
  if (s <= 150) return 149000;
  if (s <= 300) return 174000;
  if (s <= 600) return 199000;
  if (s <= 1000) return 224000;
  if (s <= 2000) return 249000;
  return 'Sur devis';
}

const COLOR_NAVY = rgb(14/255, 42/255, 71/255);    // #0E2A47
const COLOR_AMBER = rgb(245/255, 158/255, 11/255);  // #F59E0B
const COLOR_SLATE = rgb(148/255, 163/255, 184/255);
const COLOR_GRAY = rgb(0.9, 0.9, 0.9);
const COLOR_ROW_ALT = rgb(0.96, 0.98, 1.0);
const COLOR_RED = rgb(192/255, 57/255, 43/255);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  // VÉRIFICATION DU JETON SÉCURISÉ (B5)
  if (data.download_token) {
    const tokenRes = verifyAndConsumeToken(data.download_token, 'esquisse');
    if (!tokenRes.valid) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: tokenRes.error })
      };
    }
    if (tokenRes.dossierData) {
      data = { ...tokenRes.dossierData, ...data };
    }
  } else if (process.env.NODE_ENV === 'production' && !data.is_admin_preview) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Téléchargement sécurisé : un jeton valide issu du règlement PayTech est requis." })
    };
  }

  // GARDE ANTI-VIDE (B3)
  if (!data.surface || parseFloat(data.surface) <= 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Rapport d'esquisse impossible : la surface de parcelle est obligatoire." })
    };
  }

  const surface = parseFloat(data.surface) || 200;
  const levels = parseInt(data.exact_levels, 10) || 1;
  const totalLevelsCount = levels + 1; // RDC + étages
  const ceilingHeight = parseFloat(data.ceiling_height) || 3.0;
  const facade1 = parseFloat(data.facade_width) || 10;
  const facade2 = parseFloat(data.facade_width_2) || 0;
  const streetWidth = parseFloat(data.street_width) || 12;
  const usage = data.building_usage || 'unifamilial';
  const standing = data.standing || 'moyen';
  const parcelConfig = data.parcel_config || 'bande';
  const location = data.project_location || 'Dakar';
  const landStatus = data.land_status || 'Titre Foncier (TF)';
  const lotNumber = data.lot_number || 'Non spécifié';
  const sanitation = data.sanitation_type || 'autonome';
  const neighbor = data.neighbor_status || 'vide';
  const clientNom = data.client_name || 'Maître d\'Ouvrage';
  const clientEmail = data.client_email || 'Non renseigné';
  const clientPhone = data.client_phone ? `${data.phone_prefix || '+221'} ${data.client_phone}` : 'Non renseigné';
  const refStr = data.ref_command || data.dossier || ('CS-ESQ-' + Date.now().toString().slice(-6));
  const pricePaid = data.exact_amount || getEsquissePrice(surface);
  const auditDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // 1. CALCULS D'URBANISME & GABARIT (COHÉRENCE SÉNÉGALAISE VÉRIFIÉE)
  const cesMax = 0.65; // Coefficient d'emprise au sol indicatif courant
  const empriseSolMax = Math.round(surface * cesMax);
  const espacesLibres = Math.round(surface * (1 - cesMax));
  // Formule SDP réaliste et cohérente : Emprise × Niveaux × Coefficient de réduction de trémie (0,90)
  const sdpTotale = Math.round(empriseSolMax * totalLevelsCount * 0.90);
  const cosProjet = (sdpTotale / surface).toFixed(2).replace('.', ',');
  const hauteurFaitage = (totalLevelsCount * ceilingHeight + 1.20).toFixed(2).replace('.', ','); // + acrotère 1.20m
  const reculAlignement = streetWidth < 10 ? 2.0 : (streetWidth < 14 ? 3.0 : 4.0);
  const hauteurMaxGabarit = (1.5 * (streetWidth + reculAlignement)).toFixed(2).replace('.', ','); // Règle H <= 1.5*(L+R)
  const nPlacesStationnement = Math.max(1, Math.round(sdpTotale / 100));

  // 2. DESCENTE DE CHARGES (Méthode générique aux états limites)
  const surfaceInfluence = 16.0; // Trame standard 4m × 4m sur le poteau le plus chargé
  const gPlancher = 5.5; // kN/m² (Dalle corps creux 16+4 + chape + cloisons + revêtements)
  const gPoteauPoutre = 1.8; // kN/m² (Poids propre structurel)
  const gNiveau = (gPlancher + gPoteauPoutre) * surfaceInfluence; // kN par niveau
  const gTotal = gNiveau * totalLevelsCount;

  let qUnit = 1.5; // kN/m² (Résidentiel standard)
  if (usage === 'collectif') qUnit = 2.0;
  else if (usage === 'commercial' || usage === 'bureaux') qUnit = 2.5;
  const qNiveau = qUnit * surfaceInfluence;
  const qTotal = qNiveau * totalLevelsCount;

  const nSer = Math.round(gTotal + qTotal); // N_ser = G + Q (kN)
  const nUltime = Math.round(1.35 * gTotal + 1.5 * qTotal); // N_u = 1.35 G + 1.5 Q (kN)

  // 3. PRÉ-DIMENSIONNEMENT DE LA SEMELLE ISOLÉE (Portance sol Dakar / Thiès)
  let portanceSolBars = 1.5; // Portance indicative sols sableux / sablo-argileux
  if (location.toLowerCase().includes('almadies') || location.toLowerCase().includes('ngor')) portanceSolBars = 2.0;
  else if (location.toLowerCase().includes('rufisque') || location.toLowerCase().includes('bargny')) portanceSolBars = 1.2;
  const qAdmkNm2 = portanceSolBars * 100; // 1 bar = 100 kN/m²

  const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2); // +5% poids propre semelle
  const coteSemelleCarrer = Math.max(0.8, Math.ceil(Math.sqrt(parseFloat(surfaceSemelleRequise)) * 10) / 10).toFixed(2);
  const epaisseurSemelle = Math.max(25, Math.ceil(((parseFloat(coteSemelleCarrer) - 0.20) / 4) * 100)); // Condition de rigidité
  const enrobageAciersVal = location.toLowerCase().includes('ngor') || location.toLowerCase().includes('almadies') ? "5 cm" : "4 cm";
  const enrobageAciers = `${enrobageAciersVal} (zone côtière et embruns)`;
  const modeFondation = levels <= 3 ? "Semelles isolées avec longrines de redressement et chaînage bas" : "Semelles filantes croisées ou radier général";

  // 4. RÉSEAUX, FLUIDES & ÉNERGIE
  const consoJournaliereLitres = usage === 'unifamilial' ? 1200 : (usage === 'collectif' ? totalLevelsCount * 800 : 1500);
  const bacheLitres = Math.round(consoJournaliereLitres * 2.5); // Réserve de sécurité 48h à 72h
  const surpresseurDesc = totalLevelsCount <= 2 ? "Groupe surpresseur monobloc 0,75 kW avec réservoir à vessie 50L" : "Surpresseur bi-pompe inverter 1,5 kW avec réservoir 100L";
  const kvaEstimes = Math.max(6, Math.min(36, Math.round(totalLevelsCount * (standing === 'haut' ? 6 : 4))));
  const sectionCable = kvaEstimes <= 9 ? "3 × 10 mm² Cuivre" : (kvaEstimes <= 18 ? "4 × 16 mm² Cuivre" : "4 × 25 mm² Cuivre");
  const assainissementDesc = sanitation === 'autonome'
    ? "Fosse toutes eaux étanche (béton hydrofugé) avec filtre pouzzolane + puisard ventilé"
    : "Raccordement gravitaire direct au collecteur public ONAS avec clapet anti-retour";

  // 5. RATIOS MACRO-LOTS TCE (Marché Sénégal 2026)
  const RATIOS_TCE = {
    terrassement: 35000,
    grosOeuvre: 145000,
    secondOeuvre: 95000,
    etancheite: 20000
  };
  if (standing === 'haut') {
    RATIOS_TCE.grosOeuvre = 175000;
    RATIOS_TCE.secondOeuvre = 145000;
  }
  const pTerrassement = Math.round(sdpTotale * RATIOS_TCE.terrassement);
  const pGrosOeuvre = Math.round(sdpTotale * RATIOS_TCE.grosOeuvre);
  const pSecondOeuvre = Math.round(sdpTotale * RATIOS_TCE.secondOeuvre);
  const pEtancheite = Math.round(sdpTotale * RATIOS_TCE.etancheite);
  const tauxAleas = 0.07;
  const pAleas = Math.round((pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite) * tauxAleas);
  const pTotal = pTerrassement + pGrosOeuvre + pSecondOeuvre + pEtancheite + pAleas;

  try {
    const regularBytes = fs.readFileSync(findFile('DejaVuSans.ttf'));
    const boldBytes = fs.readFileSync(findFile('DejaVuSans-Bold.ttf'));
    const logoClairBytes = fs.readFileSync(findFile('logo-a-clair.png'));
    const logoSombreBytes = fs.readFileSync(findFile('logo-a-sombre.png'));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regularFont = await pdfDoc.embedFont(regularBytes);
    const boldFont = await pdfDoc.embedFont(boldBytes);
    const logoClairImage = await pdfDoc.embedPng(logoClairBytes);
    const logoSombreImage = await pdfDoc.embedPng(logoSombreBytes);

    let pages = [];
    let currentPage = pdfDoc.addPage([595, 842]);
    pages.push(currentPage);
    const { width, height } = currentPage.getSize();
    let currentY = height - 40;

    const drawHeader = (page, y, pageIndex) => {
      // Bandeau haut bleu marine (#0E2A47) sans filet doré
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });

      // Badge blanc officiel avec Monogramme C Navy (#0E2A47)
      const logoW = 34;
      const logoH = 34;
      page.drawRectangle({
        x: 40,
        y: height - 56,
        width: logoW,
        height: logoH,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.9, 0.95),
        borderWidth: 0.8
      });
      page.drawImage(logoSombreImage, {
        x: 43,
        y: height - 53,
        width: 28,
        height: 28
      });

      page.drawText('ChantierSur.com', { x: 82, y: height - 34, size: 15, font: boldFont, color: rgb(1,1,1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 82, y: height - 46, size: 7.5, font: regularFont, color: COLOR_SLATE });
      page.drawText('ÉTUDE D\'ESQUISSE & FAISABILITÉ', { x: width - 215, y: height - 38, size: 9.5, font: boldFont, color: rgb(1,1,1) });
      return height - 118;
    };

    const drawFooter = (page, pageIndex) => {
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 0.8, color: COLOR_GRAY });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — 16 Route de Mont-Rolland, Thiès, Sénégal.", { x: 40, y: 24, size: 6.8, font: regularFont, color: COLOR_SLATE });
      page.drawText("Étude d'ingénierie préliminaire & cadrage technique indépendant — Usage exclusif du demandeur.", { x: 40, y: 14, size: 6.8, font: boldFont, color: COLOR_NAVY });
      page.drawText(`Page ${pageIndex + 1} sur 4`, { x: width - 85, y: 19, size: 7.5, font: boldFont, color: COLOR_NAVY });
    };

    const forceNewPage = () => {
      currentPage = pdfDoc.addPage([595, 842]);
      pages.push(currentPage);
      currentY = drawHeader(currentPage, currentY, pages.length - 1);
    };

    // Helper de tracé de tableau stylisé avec auto-wrap
    const drawTable = (headers, rows, colWidths, rightAlignedCols = []) => {
      const startX = 40;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      // En-tête
      currentPage.drawRectangle({ x: startX, y: currentY - 18, width: tableWidth, height: 18, color: COLOR_NAVY });
      let currentX = startX;
      headers.forEach((h, i) => {
        currentPage.drawText(h, { x: currentX + 6, y: currentY - 12, size: 7.0, font: boldFont, color: rgb(1,1,1) });
        currentX += colWidths[i];
      });
      currentY -= 18;

      // Lignes de données
      rows.forEach((row, rIdx) => {
        const wrappedCells = row.map((cellText, cIdx) => wrapText(String(cellText), colWidths[cIdx] - 12, cIdx === 0 ? boldFont : regularFont, 6.7));
        const maxLines = Math.max(...wrappedCells.map(c => c.length), 1);
        const rowHeight = (maxLines * 10.0) + 6.5;

        // Fond alterné
        if (rIdx % 2 === 1) {
          currentPage.drawRectangle({ x: startX, y: currentY - rowHeight, width: tableWidth, height: rowHeight, color: COLOR_ROW_ALT });
        }
        currentPage.drawRectangle({ x: startX, y: currentY - rowHeight, width: tableWidth, height: rowHeight, borderColor: COLOR_GRAY, borderWidth: 0.5 });

        let cellX = startX;
        row.forEach((cellText, cIdx) => {
          const lines = wrappedCells[cIdx];
          const isRight = rightAlignedCols.includes(cIdx);
          const cellFont = (cIdx === 0) ? boldFont : (isRight ? boldFont : regularFont);
          const cellColor = (cIdx === 1 && isRight) ? COLOR_NAVY : rgb(0.15, 0.2, 0.25);

          lines.forEach((lineText, lIdx) => {
            let tx = cellX + 6;
            if (isRight) {
              const tw = cellFont.widthOfTextAtSize(lineText, 6.7);
              tx = cellX + colWidths[cIdx] - tw - 6;
            }
            currentPage.drawText(lineText, {
              x: tx,
              y: currentY - 9.8 - (lIdx * 10.0),
              size: 6.7,
              font: cellFont,
              color: cellColor
            });
          });
          cellX += colWidths[cIdx];
        });

        currentY -= rowHeight;
      });

      // Espace de respiration régulier sous le tableau avant le bloc de conseils
      currentY -= 12;
    };

    // Helper de bloc de conseils d'ingénierie personnalisés (B7)
    const drawAdviceBox = (title, items) => {
      const startX = 40;
      const boxWidth = width - 80;

      let formattedLines = [];
      items.forEach(it => {
        const fullTxt = `• ${it.label} : ${it.text}`;
        const lines = wrapText(fullTxt, boxWidth - 22, regularFont, 6.6);
        formattedLines.push(...lines);
      });

      const boxHeight = 15 + (formattedLines.length * 9.0) + 6;

      currentPage.drawRectangle({
        x: startX,
        y: currentY - boxHeight,
        width: boxWidth,
        height: boxHeight,
        color: rgb(0.975, 0.985, 1.0),
        borderColor: COLOR_NAVY,
        borderWidth: 0.6
      });

      currentPage.drawText(title, {
        x: startX + 8,
        y: currentY - 11,
        size: 7.2,
        font: boldFont,
        color: COLOR_NAVY
      });

      formattedLines.forEach((ln, idx) => {
        currentPage.drawText(ln, {
          x: startX + 8,
          y: currentY - 21 - (idx * 9.0),
          size: 6.6,
          font: regularFont,
          color: rgb(0.12, 0.18, 0.24)
        });
      });

      // Espace de respiration régulier après le bloc de conseils
      currentY -= (boxHeight + 14);
    };

    // =========================================================================
    // PAGE 1 : FICHE SYNTHÉTIQUE, GABARIT & IMPLANTATION
    // =========================================================================
    currentY = drawHeader(currentPage, currentY, 0);

    // 0. FICHE SYNTHÉTIQUE DU PROJET
    const ficheHeight = 100;
    currentPage.drawRectangle({ x: 40, y: currentY - ficheHeight, width: width - 80, height: ficheHeight, color: rgb(0.98,0.98,0.98), borderColor: COLOR_NAVY, borderWidth: 1.5 });
    currentPage.drawImage(logoSombreImage, { x: width - 85, y: currentY - 50, width: 34, height: 34 });

    currentPage.drawText('0. FICHE SYNTHÉTIQUE DE L\'ÉTUDE D\'ESQUISSE & FAISABILITÉ', { x: 50, y: currentY - 17, size: 9.5, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Réf. Dossier : ${refStr}   |   Date : ${auditDate}   |   Montant prestation : ${typeof pricePaid === 'number' ? fmtCfa(pricePaid) : pricePaid}`, { x: 50, y: currentY - 33, size: 7.8, font: regularFont });
    currentPage.drawText(`Maître d'Ouvrage : ${clientNom}   |   Localisation : ${location}`, { x: 50, y: currentY - 47, size: 8.2, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Typologie : ${usage.toUpperCase()} (${standing.toUpperCase()})   |   Statut Foncier : ${landStatus} (Lot : ${lotNumber})`, { x: 50, y: currentY - 61, size: 7.8, font: regularFont });
    currentPage.drawText(`Superficie Parcelle : ${surface} m²   |   Élévation : R+${levels} (${totalLevelsCount} niveaux)   |   SDP Estimée : ${sdpTotale} m²`, { x: 50, y: currentY - 75, size: 8.2, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Émis à : 16 Route de Mont-Rolland, Thiès, Sénégal   |   Contact : ${clientPhone}`, { x: 50, y: currentY - 89, size: 7.2, font: regularFont, color: COLOR_SLATE });

    currentY -= (ficheHeight + 22);

    // I. PROSPECT URBANISTIQUE, GABARIT & DROITS À BÂTIR
    currentPage.drawText('I. PROSPECT URBANISTIQUE, GABARIT & DROITS À BÂTIR SÉNÉGALAIS', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const gabaritHeaders = ['Indicateur d\'Urbanisme', 'Valeur Déterminée', 'Référence & Analyse Technique Prudentielle'];
    const gabaritRows = [
      ["Surface Totale Parcellaire", `${surface} m²`, "Superficie de base enregistrée au cadastre"],
      ["COS Projet (SDP / Surface)", cosProjet, "Coefficient d'occupation des sols calculé sur la parcelle"],
      ["Emprise au Sol (CES indicatif 0,65)", `${empriseSolMax} m²`, "Hypothèse de gabarit d'emprise maximale bâtie au sol"],
      ["Espaces Libres d'Infiltration (35%)", `${espacesLibres} m²`, "Pleine terre préservée pour l'infiltration des eaux pluviales"],
      ["Surface Développée de Plancher (SDP)", `${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (${totalLevelsCount} niveaux)`],
      ["Hauteur Totale du Bâtiment Projeté", `${hauteurFaitage} m`, "Dalle supérieure + acrotère de toiture terrasse de 1,20 m"],
      ["Largeur de la Voie Publique", `${streetWidth} mètres`, `Retrait d'alignement estimé : ${reculAlignement} m selon gabarit de voirie`],
      ["Prospect Maximal de Référence (H <= 1,5L)", `${hauteurMaxGabarit} mètres`, "Seuil indicatif calculé selon les règles de prospect de voirie"],
      ["Places de Stationnement Indicatives", `${nPlacesStationnement} place(s)`, "Règle indicative de référence : 1 place par 100 m² de SDP utile"]
    ];
    drawTable(gabaritHeaders, gabaritRows, [160, 95, 260], [1]);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — URBANISME & GABARIT (B7)", [
      { label: "Analyse du gabarit", text: `Pour votre parcelle de ${surface} m² avec un COS projet de ${cosProjet}, l'emprise maximale de ${empriseSolMax} m² garantit ${espacesLibres} m² de pleine terre préservée pour l'infiltration pluviale.` },
      { label: "Vérification du prospect", text: `La hauteur de faîtage prévue (${hauteurFaitage} m) respecte le prospect maximal théorique de ${hauteurMaxGabarit} m calculé sur une voie de ${streetWidth} m.` },
      { label: "Action recommandée", text: `Faire valider l'alignement précis de clôture par les services cadastraux avant tout coulage des semelles de clôture.` }
    ]);

    currentY -= 28;

    // II. CONTRAINTES D'IMPLANTATION & MITOYENNETÉ
    currentPage.drawText('II. CONTRAINTES D\'IMPLANTATION, MITOYENNETÉ & VOIRIE', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    let configDesc = "Parcelle en bande standard : façades latérales mitoyennes aveugles obligatoires.";
    if (parcelConfig === 'angle') configDesc = `Parcelle d'angle (Façades ${facade1}m et ${facade2 || 12}m) : pan coupé recommandé au carrefour.`;
    else if (parcelConfig === 'traversante') configDesc = "Parcelle traversante avec accès double sur voies opposées.";
    else if (parcelConfig === 'isolee') configDesc = "Parcelle isolée : recul périmétrique d'au moins 2,50 m recommandé.";

    const mitoyenHeaders = ['Paramètre Spatial', 'Situation Chantier', 'Prescription d\'Ingénierie Obligatoire'];
    const mitoyenRows = [
      ["Configuration & Façade", parcelConfig.toUpperCase(), configDesc],
      ["Parcelles Voisines", neighbor === 'vide' ? "Terrains voisins nus" : "Constructions mitoyennes présentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-œuvre préalable." : "Constat d'huissier contradictoire obligatoire avant excavation."],
      ["Puits de Jour & Aération", "Minimum 12 m² (Largeur >= 3,00 m)", "Aération et éclairage direct naturels conformes aux règles sanitaires."],
      ["Évacuation Eaux Pluviales", "Égout intérieur à la parcelle", "Interdiction absolue de déversement sauvage sur la voie publique."]
    ];
    drawTable(mitoyenHeaders, mitoyenRows, [140, 140, 235], []);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — IMPLANTATION & VOISINAGE (B7)", [
      { label: "Configuration parcellaire", text: `Parcelle de type ${parcelConfig.toUpperCase()} : ${configDesc}` },
      { label: "Précaution mitoyenneté", text: neighbor === 'vide' ? "Terrains adjacents nus : terrassement direct possible sous réserve de piquetage contradictoire par géomètre agréé OGES." : "Constructions mitoyennes existantes : constat d'huissier préventif contradictoire obligatoire avant toute excavation pour se prémunir contre les recours en fissures." },
      { label: "Prescription cour intérieure", text: "Conserver des cours intérieures d'au moins 12 m² avec largeur minimale de 3,00 m pour la salubrité et la ventilation naturelle des pièces de vie." }
    ]);

    // =========================================================================
    // PAGE 2 : DESCENTE DE CHARGES & FONDATIONS
    // =========================================================================
    forceNewPage();

    // III. DESCENTE DE CHARGES THÉORIQUE
    currentPage.drawText('III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU LE PLUS CHARGÉ', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const descenteHeaders = ['Paramètre de Descente de Charges', 'Valeur Calculée', 'Hypothèse & Méthode de Calcul Générique'];
    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence.toFixed(1).replace('.', ',')} m²`, "Trame structurelle courante 4,00 m × 4,00 m"],
      ["Charges Permanentes Cumulées (G)", `${gTotal.toFixed(0)} kN (env. ${(gTotal / 9.81).toFixed(1).replace('.', ',')} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation Cumulées (Q)", `${qTotal.toFixed(0)} kN (env. ${(qTotal / 9.81).toFixed(1).replace('.', ',')} T)`, `Pratique courante d'ingénierie selon usage : ${qUnit.toString().replace('.', ',')} kN/m² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (env. ${(nSer / 9.81).toFixed(1).replace('.', ',')} T)`, "N_ser = G + Q (Dimensionnement du sol sous semelle de fondation)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (env. ${(nUltime / 9.81).toFixed(1).replace('.', ',')} T)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure porteuse)"]
    ];
    drawTable(descenteHeaders, descenteRows, [160, 115, 240], [1]);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — STRUCTURE & DESCENTE DE CHARGES (B7)", [
      { label: "Charge axiale prévisionnelle", text: `L'effort de service N_ser calculé à ${nSer} kN (${(nSer / 9.81).toFixed(1)} T) et N_u à ${nUltime} kN (${(nUltime / 9.81).toFixed(1)} T) pour votre élévation R+${levels} imposent des poteaux béton d'au moins 20×20 cm ou 20×30 cm.` },
      { label: "Qualité des matériaux", text: "Béton armé dosé impérativement à 350 kg/m³ de ciment classe 42.5 gâché à l'eau douce potable (interdiction absolue d'eau de forage saumâtre ou de sable marin non dessalé)." },
      { label: "Contrôle d'exécution", text: "Exiger les procès-verbaux d'écrasement d'éprouvettes béton à 7 et 28 jours (résistance caractéristique visée fck >= 25 MPa)." }
    ]);

    currentY -= 20;

    // IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION
    currentPage.drawText('IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÉOTECHNIQUE', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const semelleHeaders = ['Élément de Dimensionnement', 'Prescription Déterminée', 'Justification Technique de Sécurité'];
    const semelleRows = [
      ["Portance Admissible du Sol (q_adm)", `${portanceSolBars.toString().replace('.', ',')} bars (${qAdmkNm2} kN/m²)`, "Valeur indicative de zone — essai géotechnique obligatoire avant exécution."],
      ["Surface Portante Minimale Requise (S)", `${surfaceSemelleRequise.replace('.', ',')} m²`, "Formule d'équilibre de portance : S >= 1,05 × N_ser / q_adm"],
      ["Dimensions Semelle Carrée (A × B)", `${coteSemelleCarrer.replace('.', ',')} m × ${coteSemelleCarrer.replace('.', ',')} m`, "Section d'assise au sol sous le poteau central le plus chargé"],
      ["Épaisseur Minimale Semelle (H)", `${epaisseurSemelle} cm (d >= ${epaisseurSemelle - 5} cm)`, "Condition de rigidité : d >= (A - a)/4 pour écarter tout risque de poinçonnement"],
      ["Enrobage Minimal des Armatures", enrobageAciers, "Protection durable des aciers contre l'oxydation en climat chaud et salin"],
      ["Mode de Fondation Préconisé", modeFondation, "Système adapté pour prévenir les tassements différentiels de structure."]
    ];
    drawTable(semelleHeaders, semelleRows, [160, 115, 240], [1]);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — FONDATIONS & GÉOTECHNIQUE (B7)", [
      { label: "Assise de fondation", text: `Semelle isolée carrée proposée de ${coteSemelleCarrer} m × ${coteSemelleCarrer} m (épaisseur H=${epaisseurSemelle} cm) calculée pour une portance admise de ${portanceSolBars} bars à ${location}.` },
      { label: "Aléas géotechniques", text: "En cas de découverte d'argiles gonflantes ou de nappe phréatique haute lors des fouilles, il convient d'adapter la profondeur d'ancrage en prévoyant des longrines de redressement renforcées et un cuvelage adapté." },
      { label: "Béton de propreté & enrobage", text: `Béton de propreté dosé à 150 kg/m³ (épaisseur 5 cm) obligatoire en fond de fouille + cales béton pour assurer ${enrobageAciersVal} d'enrobage minimal des armatures.` }
    ]);

    // =========================================================================
    // PAGE 3 : FLUIDES, ÉNERGIE & BIOCLIMATIQUE
    // =========================================================================
    forceNewPage();

    // V. RÉSERVE HYDRAULIQUE & ÉNERGIE
    currentPage.drawText('V. RÉSERVE HYDRAULIQUE (SEN\'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const fluidesHeaders = ['Poste Fluide & Énergie', 'Dimensionnement Calculé', 'Prescription Technique d\'Ingénierie'];
    const fluidesRows = [
      ["Bâche à Eau & Autonomie Coupure", `${bacheLitres.toLocaleString('fr-FR')} L (env. ${(bacheLitres / 1000).toFixed(1).replace('.', ',')} m³)`, "Réserve tampon 48h à 72h avec cuve étanche et groupe de pompage"],
      ["Système de Pompage Recommandé", surpresseurDesc, "Distribution d'eau continue sous pression constante à tous les étages"],
      ["Puissance Souscrite Senelec Cible", `${kvaEstimes} kVA (${kvaEstimes > 9 ? 'Triphasé 380V' : 'Monophasé 220V'})`, "Dimensionnement standard pour climatisation inverter et usages domestiques"],
      ["Section Colonne Montante Électrique", sectionCable, "Ligne principale sécurisée limitant les chutes de tension sous 3%"],
      ["Réseau d'Assainissement & Rejets", sanitation === 'autonome' ? "Assainissement Autonome" : "Réseau Public ONAS", assainissementDesc]
    ];
    drawTable(fluidesHeaders, fluidesRows, [155, 120, 240], [1]);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — FLUIDES, EAU & ÉNERGIE (B7)", [
      { label: "Sécurisation en eau potable", text: `Bâche tampon de ${bacheLitres.toLocaleString('fr-FR')} L avec surpresseur à vitesse variable indispensable pour pallier les coupures récurrentes de distribution d'eau à ${location}.` },
      { label: "Sécurité électrique Senelec", text: `Puissance préconisée de ${kvaEstimes} kVA (${kvaEstimes > 9 ? 'raccordement triphasé 380V' : 'monophasé'}) avec câble de section ${sectionCable} pour limiter les chutes de tension sous 3%.` },
      { label: "Assainissement durable", text: sanitation === 'autonome' ? "Fosse toutes eaux étanche ventilée avec filtre pouzzolane + puisard d'infiltration ou lit d'épandage dimensionné à la perméabilité du sol récepteur." : "Assainissement collectif : vérifier la côte altimétrique du collecteur ONAS de rue avant pose du clapet anti-retour obligatoire." }
    ]);

    currentY -= 20;

    // VI. CONCEPTION BIOCLIMATIQUE SAHÉLIENNE
    currentPage.drawText('VI. CONCEPTION BIOCLIMATIQUE ADAPTÉE AU CLIMAT SÉNÉGALAIS', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const bioclimHeaders = ['Axe de Conception Bioclimatique', 'Solution Technique Retenue', 'Impact Confort & Facture Énergétique'];
    const bioclimRows = [
      ["Orientation Solaire des Baies", "Façades Nord & Sud privilégiées", "Minimisation des rayonnements solaires directs sur les parois vitrées."],
      ["Protections Solaires Passives", "Casquettes béton (60-90 cm) & Brise-soleil", "Ombrage permanent limitant les surchauffes en période estivale."],
      ["Ventilation Naturelle Traversante", "Ouvrants opposés orientés Alizés", "Évacuation nocturne de l'air chaud par tirage thermique naturel."],
      ["Inertie Thermique de l'Enveloppe", "Double cloison ou agglos pleins avec enduit", "Déphasage thermique d'au moins 6h pour atténuer les pics de chaleur."]
    ];
    drawTable(bioclimHeaders, bioclimRows, [150, 135, 230], []);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — CONCEPTION BIOCLIMATIQUE (B7)", [
      { label: "Protection solaire passive", text: `À ${location}, l'exposition solaire et les embruns imposent des casquettes d'ombrage d'au moins 60 cm sur les ouvertures Sud et Ouest.` },
      { label: "Ventilation naturelle", text: "Positionner les menuiseries pour une ventilation traversante captant les alizés maritimes, réduisant fortement la consommation électrique de climatisation." }
    ]);

    // =========================================================================
    // PAGE 4 : BUDGET ESTIMATIF & FEUILLE DE ROUTE TELEDAC
    // =========================================================================
    forceNewPage();

    // VII. ESTIMATION PRÉVISIONNELLE MACRO-LOTS TCE
    currentPage.drawText('VII. ÉVALUATION FINANCIÈRE PRÉVISIONNELLE MACRO-LOTS TCE (VALEURS 2026)', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const budgetHeaders = ['Macro-Lot Technique TCE', 'Montant Prévisionnel', 'Ratio de Référence au m² SDP'];
    const budgetRows = [
      ["1. Terrassements, Fouilles & Fondations", fmtCfa(pTerrassement), `Ratio : ${RATIOS_TCE.terrassement.toLocaleString('fr-FR')} FCFA/m² — ${sdpTotale} m² SDP`],
      ["2. Superstructure Béton Armé & Maçonnerie", fmtCfa(pGrosOeuvre), `Ratio : ${RATIOS_TCE.grosOeuvre.toLocaleString('fr-FR')} FCFA/m² — ${sdpTotale} m² SDP`],
      ["3. Second Œuvre, Fluides & Électricité", fmtCfa(pSecondOeuvre), `Ratio : ${RATIOS_TCE.secondOeuvre.toLocaleString('fr-FR')} FCFA/m² — ${sdpTotale} m² SDP`],
      ["4. Étanchéité Toiture Terrasse & Acrotères", fmtCfa(pEtancheite), `Ratio : ${RATIOS_TCE.etancheite.toLocaleString('fr-FR')} FCFA/m² — ${sdpTotale} m² SDP`],
      ["5. Provision Aléas & Imprévus (7%)", fmtCfa(pAleas), "Marge de sécurité technique standard sur marché de travaux"],
      ["ENVELOPPE BUDGÉTAIRE TOTALE ESTIMATIVE", fmtCfa(pTotal), `Ratio moyen : env. ${fmtCfa(Math.round(pTotal / sdpTotale))}/m² SDP`]
    ];
    drawTable(budgetHeaders, budgetRows, [170, 115, 230], [1]);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — BUDGET & MARCHÉ DE TRAVAUX (B7)", [
      { label: "Analyse budgétaire globale", text: `Enveloppe estimative globale de ${fmtCfa(pTotal)} (${fmtCfa(Math.round(pTotal / sdpTotale))}/m² SDP) pour un niveau de standing ${standing.toUpperCase()}.` },
      { label: "Verrouillage des prix unitaires", text: "Négocier un marché à forfait avec bordereau de prix unitaires ferme et non révisable pour neutraliser les hausses du fer à béton et du ciment." },
      { label: "Réserve de trésorerie", text: `Conserver une provision de sécurité de 7 % (${fmtCfa(pAleas)}) dédiée aux raccordements concessionnaires (Senelec, SEN'EAU, ONAS) et aléas de sol.` }
    ]);

    currentY -= 18;

    // VIII. FEUILLE DE ROUTE ADMINISTRATIVE : TELEDAC & PERMIS
    currentPage.drawText('VIII. FEUILLE DE ROUTE ADMINISTRATIVE : PERMIS DE CONSTRUIRE & TELEDAC', { x: 40, y: currentY, size: 9.2, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const teledacHeaders = ['Étape Administrative', 'Professionnel Compétent', 'Cadre Réglementaire & Bonnes Pratiques'];
    const teledacRows = [
      ["1. Bornage Contradictoire", "Géomètre-Expert Agréé (OGES)", "Établissement du plan de bornage régulier et scellement des bornes physiques."],
      ["2. Conception Architecturale", "Architecte inscrit à l'ODAS", "Recours obligatoire à l'architecte pour le permis (Loi n° 2021-22 du 2 mars 2021)."],
      ["3. Note de Calcul de Stabilité", "Bureau d'Études Techniques (BET)", "Justification des sections béton et armatures selon méthodes reconnues aux états limites."],
      ["4. Dépôt Plateforme TELEDAC", "Direction de l'Urbanisme / Mairie", "Instruction dématérialisée préalable et délivrance de l'autorisation de construire."],
      ["5. Marché & Points d'Arrêt", "Entreprise Générale / Maçon", "Retenue de garantie de 5% et respect des points d'arrêt (Arrêt n° 28 de la Cour suprême)."]
    ];
    drawTable(teledacHeaders, teledacRows, [140, 140, 235], []);

    drawAdviceBox("CONSEILS D'INGÉNIERIE & VIGILANCE — JURIDIQUE & RÉCEPTION CHANTIER (B7)", [
      { label: "Conformité Loi n° 2021-22", text: "Conformément à la Loi n° 2021-22 du 2 mars 2021 (art. 28, 31), le recours à un architecte inscrit à l'ODAS est obligatoire pour l'établissement du dossier de permis de construire." },
      { label: "Sécurité contractuelle (Arrêt n° 28)", text: "Conformément à la jurisprudence de l'arrêt n° 28 de la Cour suprême du 18/04/2018, consigner une retenue de garantie de 5 % jusqu'à réception définitive et valider chaque point d'arrêt d'ingénierie avant coulage." }
    ]);

    currentY -= 14;

    // VISA TECHNIQUE ET AVERTISSEMENT LÉGAL
    const visaHeight = 44;
    currentPage.drawRectangle({ x: 40, y: currentY - visaHeight, width: width - 80, height: visaHeight, color: COLOR_RED });
    currentPage.drawRectangle({ x: 40, y: currentY - visaHeight, width: width - 80, height: visaHeight, borderColor: rgb(0.5, 0.1, 0.1), borderWidth: 1 });

    currentPage.drawText("VISA TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", { x: 48, y: currentY - 13, size: 7.3, font: boldFont, color: rgb(1,1,1) });
    const disclaimerLines = [
      "Le présent livrable d'esquisse et de faisabilité constitue une analyse préliminaire indépendante d'ingénierie et d'urbanisme.",
      "Il ne se substitue ni aux plans d'exécution architecturaux réglementaires visés par un architecte membre de l'ODAS pour l'obtention formelle",
      "du permis de construire, ni à la mission de sondage géotechnique de sol (G2) obligatoire avant le coulage des fondations."
    ];
    let disY = currentY - 24;
    disclaimerLines.forEach(l => {
      currentPage.drawText(l, { x: 48, y: disY, size: 6.2, font: regularFont, color: rgb(1,1,1) });
      disY -= 8.5;
    });

    currentY -= (visaHeight + 12);

    // Rendu global des pieds de page sur les 4 pages
    pages.forEach((p, idx) => drawFooter(p, idx));

    const pdfBytes = await pdfDoc.save();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ChantierSur_Esquisse_${refStr}.pdf"`
      },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
