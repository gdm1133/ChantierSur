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
  const surface = parseFloat(data.surface || data.projet?.surface || 0);
  const clientNom = (data.client && (data.client.nom || data.client.name))
    || data.client_name
    || data.clientName
    || data.clientNom
    || (data.identification && (data.identification.client?.nom || data.identification.nom))
    || 'Maître d\'ouvrage';
  const location = data.project_location || data.client_city || data.location || 'Dakar - Grand Dakar';

  if (!surface || surface <= 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Rapport d'esquisse impossible : la surface du terrain ou du projet doit être renseignée." })
    };
  }

  const levels = parseInt(data.exact_levels !== undefined ? data.exact_levels : (data.niveaux || data.levels || 1), 10);
  const totalLevelsCount = levels + 1; // RDC + étages
  const typology = data.project_typology || (data.building_usage === 'bureaux' ? 'Immeuble tertiaire / Bureaux' : (data.building_usage === 'mixte' ? 'Immeuble mixte commercial & résidentiel' : (data.building_usage === 'locatif' ? 'Immeuble d\'habitation collectif' : 'Villa individuelle résidentielle')));
  const pricePaid = getEsquissePrice(surface);
  const refStr = data.dossier || data.reference || ('CS-ESQ-' + Date.now());
  const auditDate = new Date().toLocaleDateString('fr-FR');
  const streetWidth = parseFloat(data.street_width) || 12;
  const facade1 = parseFloat(data.facade_width) || 10;
  const facade2 = parseFloat(data.facade_width_2) || 0;
  const parcelConfig = data.parcel_config || 'bande';
  const neighbor = data.neighbor_status || 'vide';
  const standing = data.standing || 'moyen';
  const sanitation = data.sanitation_type || 'autonome';
  const landStatus = data.land_status || 'Titre Foncier (TF)';
  const lotNumber = (data.lot_number || '').trim() || 'Lot cadastral en cours';

  // 1. CALCULS GABARIT & SDP COHÉRENTS (formule vérifiée : surface * 0.65 * totalLevels * 0.90)
  const empriseSolMax = Math.round(surface * 0.65);
  const espacesLibres = Math.round(surface * 0.35);
  const sdpTotale = Math.round(surface * 0.65 * totalLevelsCount * 0.90);
  const cosProjet = (sdpTotale / surface).toFixed(2).replace('.', ',');
  const hauteurFaitage = (totalLevelsCount * 3.10 + 1.20).toFixed(1).replace('.', ',');
  const reculAlignement = streetWidth >= 15 ? "4,00" : "3,00";
  const hauteurMaxGabarit = (1.5 * (streetWidth + parseFloat(reculAlignement.replace(',', '.')))).toFixed(1).replace('.', ',');
  const nPlacesStationnement = Math.max(1, Math.round(sdpTotale / 100));

  // 2. DESCENTE DE CHARGES (Méthode générique aux états limites)
  const surfaceInfluence = 16.0; // trame 4,00 m x 4,00 m
  const gTotal = 7.0 * surfaceInfluence * totalLevelsCount; // kN
  const qUnit = data.building_usage === 'bureaux' ? 2.5 : (data.building_usage === 'mixte' ? 2.0 : 1.5);
  const qTotal = qUnit * surfaceInfluence * totalLevelsCount; // kN
  const nSer = Math.round(gTotal + qTotal); // kN
  const nUltime = Math.round((1.35 * gTotal) + (1.5 * qTotal)); // kN

  // 3. PRÉ-DIMENSIONNEMENT DE LA SEMELLE ISOLÉE
  let portanceSolBars = 1.8; // valeur moyenne courante au Sénégal
  if (/almadies|ngor|ouakam|côti/i.test(location)) portanceSolBars = 1.5;
  else if (/thiès|plateau/i.test(location)) portanceSolBars = 2.0;
  const qAdmkNm2 = Math.round(portanceSolBars * 100);
  const surfaceSemelleRequise = ((nSer * 1.05) / qAdmkNm2).toFixed(2);
  const coteSemelleCarrer = (Math.ceil(Math.sqrt(parseFloat(surfaceSemelleRequise)) * 20) / 20).toFixed(2);
  const epaisseurSemelle = Math.max(35, Math.round(((parseFloat(coteSemelleCarrer) * 100 - 30) / 4) + 5));
  const enrobageAciers = /almadies|ngor|ouakam|mer|côti/i.test(location) ? "4,5 cm (Milieu marin agressif)" : "3,5 cm (Milieu standard)";
  const modeFondation = "Semelles isolées solidarisées par un réseau rigide de longrines de redressement.";

  // 4. RÉSEAUX, FLUIDES & CAPACITÉS
  const occupantsEstimes = totalLevelsCount * (data.building_usage === 'unifamilial' ? 6 : (data.building_usage === 'locatif' ? 12 : 16));
  const consoJournaliereLitres = occupantsEstimes * 150;
  const bacheLitres = Math.round(consoJournaliereLitres * 2.5);
  const surpresseurDesc = totalLevelsCount >= 3 ? "Groupe de surpression bi-pompe 1,5 kW avec réservoir à vessie" : "Groupe de surpression compact 0,75 kW avec régulation pressostat";
  const kvaEstimes = Math.max(6, Math.round((sdpTotale * 35) / 1000));
  const sectionCable = kvaEstimes > 18 ? "Câble cuivre 4×25 mm² armé" : (kvaEstimes > 9 ? "Câble cuivre 4×16 mm²" : "Câble cuivre 2×10 mm²");
  const assainissementDesc = sanitation === 'autonome'
    ? `Fosse septique toutes eaux (${Math.max(4, Math.round(occupantsEstimes * 0.4))} m³) + puisard filtrant étanche`
    : "Raccordement réseau tout-à-l'égout public ONAS via regard siphoïde";

  // 5. BUDGET MACRO-LOTS TCE (Valeurs 2026 au m² SDP)
  const RATIOS_TCE = {
    economique: { terrassement: 18000, grosOeuvre: 110000, secondOeuvre: 85000, etancheite: 15000 },
    moyen: { terrassement: 22000, grosOeuvre: 135000, secondOeuvre: 115000, etancheite: 20000 },
    haut: { terrassement: 28000, grosOeuvre: 165000, secondOeuvre: 165000, etancheite: 28000 }
  }[standing] || { terrassement: 22000, grosOeuvre: 135000, secondOeuvre: 115000, etancheite: 20000 };

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
    const logoBytes = fs.readFileSync(findFile('logo-a-sombre.png'));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regularFont = await pdfDoc.embedFont(regularBytes);
    const boldFont = await pdfDoc.embedFont(boldBytes);
    const logoImage = await pdfDoc.embedPng(logoBytes);

    let pages = [];
    let currentPage = pdfDoc.addPage([595, 842]);
    pages.push(currentPage);
    const { width, height } = currentPage.getSize();
    let currentY = height - 40;

    const drawHeader = (page, y, pageIndex) => {
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });
      page.drawRectangle({ x: 0, y: height - 73, width: width, height: 3, color: COLOR_AMBER });

      const logoW = 34;
      const logoH = 34;
      page.drawImage(logoImage, {
        x: 40,
        y: height - 56,
        width: logoW,
        height: logoH
      });

      page.drawText('ChantierSur.com', { x: 82, y: height - 34, size: 15, font: boldFont, color: rgb(1,1,1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 82, y: height - 46, size: 7.5, font: regularFont, color: COLOR_SLATE });
      page.drawText('ÉTUDE D\'ESQUISSE & FAISABILITÉ', { x: width - 215, y: height - 38, size: 9.5, font: boldFont, color: rgb(1,1,1) });
      return height - 95;
    };

    const drawFooter = (page, pageIndex) => {
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 0.8, color: COLOR_GRAY });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — 16 Route de Mont-Rolland, Thiès, Sénégal.", { x: 40, y: 24, size: 6.8, font: regularFont, color: COLOR_SLATE });
      page.drawText("Étude d'ingénierie préliminaire & cadrage technique indépendant — Usage exclusif du demandeur.", { x: 40, y: 14, size: 6.8, font: boldFont, color: COLOR_NAVY });
      page.drawText(`Page ${pageIndex + 1} sur ${pages.length}`, { x: width - 85, y: 19, size: 7.5, font: boldFont, color: COLOR_NAVY });
    };

    const checkPageBreak = (requiredSpace) => {
      if (currentY - requiredSpace < 50) {
        currentPage = pdfDoc.addPage([595, 842]);
        pages.push(currentPage);
        currentY = drawHeader(currentPage, currentY, pages.length - 1);
        return true;
      }
      return false;
    };

    // Helper de tracé de tableau stylisé avec auto-wrap et gestion de saut de page
    const drawTable = (headers, rows, colWidths, rightAlignedCols = []) => {
      const startX = 40;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      // Calcul espace requis pour l'en-tête
      checkPageBreak(30);

      // En-tête
      currentPage.drawRectangle({ x: startX, y: currentY - 18, width: tableWidth, height: 18, color: COLOR_NAVY });
      let currentX = startX;
      headers.forEach((h, i) => {
        currentPage.drawText(h, { x: currentX + 6, y: currentY - 12, size: 7.2, font: boldFont, color: rgb(1,1,1) });
        currentX += colWidths[i];
      });
      currentY -= 18;

      // Lignes de données
      rows.forEach((row, rIdx) => {
        // Découpage du texte de chaque cellule
        const wrappedCells = row.map((cellText, cIdx) => wrapText(String(cellText), colWidths[cIdx] - 12, cIdx === 0 ? boldFont : regularFont, 7.0));
        const maxLines = Math.max(...wrappedCells.map(c => c.length), 1);
        const rowHeight = (maxLines * 10) + 6;

        checkPageBreak(rowHeight + 5);

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
              const tw = cellFont.widthOfTextAtSize(lineText, 7.0);
              tx = cellX + colWidths[cIdx] - tw - 6;
            }
            currentPage.drawText(lineText, {
              x: tx,
              y: currentY - 10 - (lIdx * 10),
              size: 7.0,
              font: cellFont,
              color: cellColor
            });
          });
          cellX += colWidths[cIdx];
        });

        currentY -= rowHeight;
      });

      currentY -= 12; // Espace après tableau
    };

    currentY = drawHeader(currentPage, currentY, 0);

    // ==========================================
    // 0. FICHE SYNTHÉTIQUE DU PROJET
    // ==========================================
    const ficheHeight = 115;
    checkPageBreak(ficheHeight + 20);
    currentPage.drawRectangle({ x: 40, y: currentY - ficheHeight, width: width - 80, height: ficheHeight, color: rgb(0.98,0.98,0.98), borderColor: COLOR_NAVY, borderWidth: 1.5 });
    currentPage.drawText('0. FICHE SYNTHÉTIQUE DE L\'ÉTUDE D\'ESQUISSE & FAISABILITÉ', { x: 50, y: currentY - 18, size: 9.5, font: boldFont, color: COLOR_NAVY });

    currentPage.drawText(`Réf. Dossier : ${refStr}   |   Date : ${auditDate}   |   Montant prestation : ${typeof pricePaid === 'number' ? fmtCfa(pricePaid) : pricePaid}`, { x: 50, y: currentY - 36, size: 8, font: regularFont });
    currentPage.drawText(`Maître d'Ouvrage : ${clientNom}   |   Localisation : ${location}`, { x: 50, y: currentY - 52, size: 8.5, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Typologie : ${typology}   |   Statut Foncier : ${landStatus}`, { x: 50, y: currentY - 67, size: 8, font: regularFont });
    currentPage.drawText(`Superficie Parcelle : ${surface} m²   |   Élévation : R+${levels} (${totalLevelsCount} niveaux)   |   SDP Estimée : ${sdpTotale} m²`, { x: 50, y: currentY - 82, size: 8.5, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Origine de l'émission : 16 Route de Mont-Rolland, Thiès, Sénégal`, { x: 50, y: currentY - 98, size: 7.5, font: regularFont, color: COLOR_SLATE });

    currentY -= (ficheHeight + 22);

    // ==========================================
    // I. CARTOUCHE FONCIER, URBANISME & DROITS À BÂTIR
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('I. PROSPECT URBANISTIQUE, GABARIT & DROITS À BÂTIR SÉNÉGALAIS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    const gabaritHeaders = ['Indicateur d\'Urbanisme', 'Valeur Déterminée', 'Référence & Analyse Technique Prudentielle'];
    const gabaritRows = [
      ["Surface Totale Parcellaire", `${surface} m²`, "Superficie de base enregistrée au cadastre"],
      ["COS Projet (SDP / Surface)", cosProjet, "Coefficient d'occupation des sols calculé sur la parcelle"],
      ["Emprise au Sol (CES indicatif 0,65)", `${empriseSolMax} m²`, "Hypothèse de gabarit d'emprise maximale bâtie au sol"],
      ["Espaces Libres d'Infiltration (35%)", `${espacesLibres} m²`, "Hypothèse de pleine terre préservée pour l'infiltration pluviale"],
      ["Surface Développée de Plancher (SDP)", `${sdpTotale} m²`, `Somme des planchers utiles sur R+${levels} (${totalLevelsCount} niveaux, hors trémies)`],
      ["Hauteur Totale du Bâtiment Projeté", `${hauteurFaitage} m`, "Dalle supérieure + acrotère de toiture terrasse de 1,20 m"],
      ["Largeur de la Voie Publique", `${streetWidth} mètres`, `Retrait d'alignement estimé : ${reculAlignement} m selon gabarit de voirie`],
      ["Prospect Maximal de Référence (H ≤ 1,5L)", `${hauteurMaxGabarit} mètres`, "Seuil indicatif calculé selon les règles de prospect de voirie"],
      ["Places de Stationnement Indicatives", `${nPlacesStationnement} place(s)`, "Règle indicative de référence : 1 place par 100 m² de SDP utile"]
    ];
    drawTable(gabaritHeaders, gabaritRows, [160, 100, 255], [1]);

    // ==========================================
    // II. IMPLANTATION & MITOYENNETÉ
    // ==========================================
    checkPageBreak(100);
    currentPage.drawText('II. CONTRAINTES D\'IMPLANTATION, MITOYENNETÉ & VOIRIE', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    let configDesc = "Parcelle en bande standard : façades latérales mitoyennes aveugles obligatoires.";
    if (parcelConfig === 'angle') configDesc = `Parcelle d'angle (Façades ${facade1}m et ${facade2 || 12}m) : pan coupé recommandé au carrefour.`;
    else if (parcelConfig === 'traversante') configDesc = "Parcelle traversante avec accès double sur voies opposées.";
    else if (parcelConfig === 'isolee') configDesc = "Parcelle isolée : recul périmétrique d'au moins 2,50 m recommandé.";

    const mitoyenHeaders = ['Paramètre Spatial', 'Situation Chantier', 'Prescription d\'Ingénierie Obligatoire'];
    const mitoyenRows = [
      ["Configuration & Façade", parcelConfig.toUpperCase(), configDesc],
      ["Parcelles Voisines", neighbor === 'vide' ? "Terrains voisins nus" : "Constructions mitoyennes présentes", neighbor === 'vide' ? "Terrassement direct sans reprise en sous-œuvre préalable." : "Constat d'huissier contradictoire obligatoire avant excavation."],
      ["Puits de Jour & Aération", "Minimum 12 m² (Largeur ≥ 3,00 m)", "Aération et éclairage direct naturels conformes aux règles sanitaires."],
      ["Évacuation Eaux Pluviales", "Égout intérieur à la parcelle", "Interdiction absolue de déversement sauvage sur la voie publique."]
    ];
    drawTable(mitoyenHeaders, mitoyenRows, [140, 140, 235], []);

    // ==========================================
    // III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU CENTRAL
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('III. DESCENTE DE CHARGES THÉORIQUE SUR LE POTEAU LE PLUS CHARGÉ', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    const descenteHeaders = ['Paramètre de Descente de Charges', 'Valeur Calculée', 'Hypothèse & Méthode de Calcul Générique'];
    const descenteRows = [
      ["Surface d'Influence du Poteau Central", `${surfaceInfluence.toFixed(1).replace('.', ',')} m²`, "Trame structurelle courante 4,00 m × 4,00 m"],
      ["Charges Permanentes Cumulées (G)", `${gTotal.toFixed(0)} kN (env. ${(gTotal / 9.81).toFixed(1).replace('.', ',')} T)`, "Planchers corps creux 16+4, chape, cloisons, poteaux et poutres"],
      ["Charges d'Exploitation Cumulées (Q)", `${qTotal.toFixed(0)} kN (env. ${(qTotal / 9.81).toFixed(1).replace('.', ',')} T)`, `Pratique courante d'ingénierie selon usage : ${qUnit.toString().replace('.', ',')} kN/m² par niveau`],
      ["Effort Normal Total de Service (N_ser)", `${nSer} kN (env. ${(nSer / 9.81).toFixed(1).replace('.', ',')} T)`, "N_ser = G + Q (Dimensionnement du sol sous semelle de fondation)"],
      ["Effort Normal Total Ultime (N_u)", `${nUltime} kN (env. ${(nUltime / 9.81).toFixed(1).replace('.', ',')} T)`, "N_u = 1,35 G + 1,5 Q (Ferraillage des aciers de structure porteuse)"]
    ];
    drawTable(descenteHeaders, descenteRows, [160, 120, 235], [1]);

    // ==========================================
    // IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('IV. PRÉ-DIMENSIONNEMENT DE LA SEMELLE DE FONDATION & DIAGNOSTIC GÉOTECHNIQUE', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    const semelleHeaders = ['Élément de Dimensionnement', 'Prescription Déterminée', 'Justification Technique de Sécurité'];
    const semelleRows = [
      ["Portance Admissible du Sol (q_adm)", `${portanceSolBars.toString().replace('.', ',')} bars (${qAdmkNm2} kN/m²)`, "Valeur indicative de zone — essai géotechnique obligatoire avant exécution."],
      ["Surface Portante Minimale Requise (S)", `${surfaceSemelleRequise.replace('.', ',')} m²`, "Formule d'équilibre de portance : S ≥ 1,05 × N_ser / q_adm"],
      ["Dimensions Semelle Carrée (A × B)", `${coteSemelleCarrer.replace('.', ',')} m × ${coteSemelleCarrer.replace('.', ',')} m`, "Section d'assise au sol sous le poteau central le plus chargé"],
      ["Épaisseur Minimale Semelle (H)", `${epaisseurSemelle} cm (d ≥ ${epaisseurSemelle - 5} cm)`, "Condition de rigidité : d ≥ (A - a)/4 pour écarter tout risque de poinçonnement"],
      ["Enrobage Minimal des Armatures", enrobageAciers, "Protection durable des aciers contre l'oxydation en climat chaud et salin"],
      ["Mode de Fondation Préconisé", modeFondation, "Système adapté pour prévenir les tassements différentiels de structure."]
    ];
    drawTable(semelleHeaders, semelleRows, [155, 125, 235], [1]);

    // ==========================================
    // V. RÉSERVE HYDRAULIQUE, PUISSANCE SENELEC & ASSAINISSEMENT
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('V. RÉSERVE HYDRAULIQUE (SEN\'EAU), PUISSANCE (SENELEC) & ASSAINISSEMENT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    const fluidesHeaders = ['Poste Fluide & Énergie', 'Dimensionnement Calculé', 'Prescription Technique d\'Ingénierie'];
    const fluidesRows = [
      ["Bâche à Eau & Autonomie Coupure", `${bacheLitres.toLocaleString('fr-FR')} L (env. ${(bacheLitres / 1000).toFixed(1).replace('.', ',')} m³)`, "Réserve tampon 48h à 72h avec cuve étanche et groupe de pompage"],
      ["Système de Pompage Recommandé", surpresseurDesc, "Distribution d'eau continue sous pression constante à tous les étages"],
      ["Puissance Souscrite Senelec Cible", `${kvaEstimes} kVA (${kvaEstimes > 9 ? 'Triphasé 380V' : 'Monophasé 220V'})`, "Dimensionnement standard pour climatisation inverter et usages domestiques"],
      ["Section Colonne Montante Électrique", sectionCable, "Ligne principale sécurisée limitant les chutes de tension sous 3%"],
      ["Réseau d'Assainissement & Rejets", sanitation === 'autonome' ? "Assainissement Autonome" : "Réseau Public ONAS", assainissementDesc]
    ];
    drawTable(fluidesHeaders, fluidesRows, [155, 125, 235], [1]);

    // ==========================================
    // VI. CONCEPTION BIOCLIMATIQUE SAHÉLIENNE
    // ==========================================
    checkPageBreak(110);
    currentPage.drawText('VI. CONCEPTION BIOCLIMATIQUE ADAPTÉE AU CLIMAT SÉNÉGALAIS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    const bioclimHeaders = ['Axe de Conception Bioclimatique', 'Solution Technique Retenue', 'Impact Confort & Facture Énergétique'];
    const bioclimRows = [
      ["Orientation Solaire des Baies", "Façades Nord & Sud privilégiées", "Minimisation des rayonnements solaires directs sur les parois vitrées."],
      ["Protections Solaires Passives", "Casquettes béton (60-90 cm) & Brise-soleil", "Ombrage permanent limitant les surchauffes en période estivale."],
      ["Ventilation Naturelle Traversante", "Ouvrants opposés orientés Alizés", "Évacuation nocturne de l'air chaud par tirage thermique naturel."],
      ["Inertie Thermique de l'Enveloppe", "Double cloison ou agglos pleins avec enduit", "Déphasage thermique d'au moins 6h pour atténuer les pics de chaleur."]
    ];
    drawTable(bioclimHeaders, bioclimRows, [150, 135, 230], []);

    // ==========================================
    // VII. ESTIMATION PRÉVISIONNELLE MACRO-LOTS TCE (2026)
    // ==========================================
    checkPageBreak(140);
    currentPage.drawText('VII. ÉVALUATION FINANCIÈRE PRÉVISIONNELLE MACRO-LOTS TCE (VALEURS 2026)', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

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

    // ==========================================
    // VIII. FEUILLE DE ROUTE ADMINISTRATIVE : TELEDAC & PERMIS
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('VIII. FEUILLE DE ROUTE ADMINISTRATIVE : PERMIS DE CONSTRUIRE & TELEDAC', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 15;

    const teledacHeaders = ['Étape Administrative', 'Professionnel Compétent', 'Cadre Réglementaire & Bonnes Pratiques'];
    const teledacRows = [
      ["1. Bornage Contradictoire", "Géomètre-Expert Agréé (OGES)", "Établissement du plan de bornage régulier et scellement des bornes physiques."],
      ["2. Conception Architecturale", "Architecte inscrit à l'ODAS", "Recours obligatoire à l'architecte pour le permis (Loi n° 2021-22 du 2 mars 2021)."],
      ["3. Note de Calcul de Stabilité", "Bureau d'Études Techniques (BET)", "Justification des sections béton et armatures selon méthodes reconnues aux états limites."],
      ["4. Dépôt Plateforme TELEDAC", "Direction de l'Urbanisme / Mairie", "Instruction dématérialisée préalable et délivrance de l'autorisation de construire."],
      ["5. Marché & Points d'Arrêt", "Entreprise Générale / Maçon", "Retenue de garantie de 5% et respect des points d'arrêt (Arrêt n° 28 de la Cour suprême)."]
    ];
    drawTable(teledacHeaders, teledacRows, [140, 140, 235], []);

    // ==========================================
    // VISA TECHNIQUE ET AVERTISSEMENT LÉGAL
    // ==========================================
    const visaHeight = 48;
    checkPageBreak(visaHeight + 15);
    currentPage.drawRectangle({ x: 40, y: currentY - visaHeight, width: width - 80, height: visaHeight, color: COLOR_RED });
    currentPage.drawRectangle({ x: 40, y: currentY - visaHeight, width: width - 80, height: visaHeight, borderColor: rgb(0.5, 0.1, 0.1), borderWidth: 1 });

    currentPage.drawText("VISA TECHNIQUE DU BUREAU D'ÉTUDES INDÉPENDANT CHANTIERSUR.COM :", { x: 48, y: currentY - 14, size: 7.5, font: boldFont, color: rgb(1,1,1) });
    const disclaimerLines = [
      "Le présent livrable d'esquisse et de faisabilité constitue une analyse préliminaire indépendante d'ingénierie et d'urbanisme.",
      "Il ne se substitue ni aux plans d'exécution architecturaux réglementaires visés par un architecte membre de l'ODAS pour l'obtention formelle",
      "du permis de construire, ni à la mission de sondage géotechnique de sol (G2) obligatoire avant le coulage des fondations."
    ];
    let disY = currentY - 25;
    disclaimerLines.forEach(l => {
      currentPage.drawText(l, { x: 48, y: disY, size: 6.2, font: regularFont, color: rgb(1,1,1) });
      disY -= 9;
    });

    currentY -= (visaHeight + 15);

    // Rendu global des pieds de page
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
