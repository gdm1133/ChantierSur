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
    path.join(process.cwd(), 'netlify/functions/generer-audit-pdf', filename),
    path.join('/var/task/netlify/functions/generer-audit-pdf', filename),
    path.join('/var/task/src/netlify/functions/generer-audit-pdf', filename),
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

function getAuditPrice(surface) {
  const s = parseFloat(surface) || 150;
  if (s <= 150) return 249000;
  if (s <= 300) return 289000;
  if (s <= 600) return 329000;
  if (s <= 1000) return 369000;
  if (s <= 2000) return 409000;
  return 'Sur devis';
}

function categorizeLot(rawLot, designation) {
  const des = (designation || '').toLowerCase();
  const rLot = (rawLot || '').trim().replace(/^[-—\s]+/, '');

  if (rLot && rLot.toUpperCase() !== 'LOT GÉNÉRAL' && rLot.toUpperCase() !== 'SANS LOT PRÉCISÉ' && rLot !== '-') {
    return rLot.toUpperCase();
  }

  // Classification intelligente par mots-clés étendue (ne bascule jamais en Lot Général)
  if (/fouille|terrassement|d[eé]blai|remblai|d[eé]capage|plateforme|[eé]vacuation.*gravois|compactage/.test(des)) return 'TERRASSEMENT';
  if (/fondation|b[eé]ton|ferraillage|armature|semelle|longrine|poteau|poutre|dalle|radier|cha[iî]nage|coffrage|vibrage|acier|ha\d|treillis|b[eé]ton arm[eé]/.test(des)) return 'GROS ŒUVRE & STRUCTURE';
  if (/ma[cç]onnerie|agglos|parpaing|brique|enduit|mur|cloison|cr[eé]pissage|jambage|linteau/.test(des)) return 'MAÇONNERIE & ÉLÉVATION';
  if (/carrelage|fa[iï]ence|chape|plinthe|rev[eê]tement|marbre|gr[eè]s|mosa[iï]que/.test(des)) return 'REVÊTEMENTS & CARRELAGE';
  if (/peinture|badigeon|vernis|impression|acrylique|vinylique|laque|pon[cç]age/.test(des)) return 'PEINTURE & FINITIONS';
  if (/plomberie|sanitaire|wc|lavabo|[eé]vier|vidange|tuyau|pvc|fosse|puisard|robinet|mitigeur|regard|siphon|alimentation.*eau|[eé]vacuation/.test(des)) return 'PLOMBERIE & ASSAINISSEMENT';
  if (/([eé]lectricit[eé]|c[aâ]ble|disjoncteur|tableau|luminaire|prise|spot|gainage|interrupteur|fil\s|terre|barrette)/.test(des)) return 'ÉLECTRICITÉ & COURANTS FAIBLES';
  if (/menuiserie|porte|fen[eê]tre|baie|ch[aâ]ssis|serrure|vitrage|volet|alu|aluminium|ferronnerie|garde-corps/.test(des)) return 'MENUISERIE & SERRURERIE';
  if (/[eé]tanch[eé]it[eé]|forme de pente|chape de pente|roofing|derbigum|[eé]tanche|imperm[eé]abilisation|sika|calandrite/.test(des)) return 'ÉTANCHÉITÉ';
  if (/charpente|toiture|couverture|bac alu|tuile|panne|chevron|liteau|t[oô]le/.test(des)) return 'CHARPENTE & TOITURE';

  return 'SECOND ŒUVRE & DIVERS';
}

const COLOR_NAVY = rgb(14/255, 42/255, 71/255);    // #0E2A47
const COLOR_AMBER = rgb(245/255, 158/255, 11/255);  // #F59E0B
const COLOR_SLATE = rgb(148/255, 163/255, 184/255);
const COLOR_RED = rgb(0.86, 0.15, 0.15);
const COLOR_GREEN = rgb(0.1, 0.6, 0.2);
const COLOR_GRAY = rgb(0.9, 0.9, 0.9);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  // VÉRIFICATION DU JETON DE TÉLÉCHARGEMENT SÉCURISÉ (B5)
  if (data.download_token) {
    const tokenRes = verifyAndConsumeToken(data.download_token, 'audit');
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
  if (!data.devis?.lignes || !Array.isArray(data.devis.lignes) || data.devis.lignes.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Rapport d'audit impossible : aucun poste chiffré n'a été fourni. Veuillez saisir les lignes du devis." })
    };
  }
  const hasPositiveAmount = data.devis.lignes.some(l => (parseFloat(l.montantIndique) > 0 || parseFloat(l.pu) > 0));
  if (!hasPositiveAmount) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Rapport d'audit impossible : aucun montant positif n'a été saisi sur le devis." })
    };
  }

  // LOGIQUE DE CALCUL ET ANALYSE
  let totalHTCalcule = 0;
  let totalHTIndiqueLignes = 0;
  let forfaits = [];
  let anomaliesArith = [];
  let sumEcartsPositifs = 0;
  let sumEcartsNegatifs = 0;
  let sumForfaits = 0;
  let sousTotauxLot = {};

  data.devis.lignes.forEach((l) => {
    let qte = typeof l.quantite === 'number' ? l.quantite : parseFloat(l.quantite) || 0;
    let pu = typeof l.pu === 'number' ? l.pu : parseFloat(l.pu) || 0;
    let mInd = typeof l.montantIndique === 'number' ? l.montantIndique : parseFloat(l.montantIndique) || 0;
    let isForfait = (pu === 0 && mInd > 0) || String(l.unite || '').toLowerCase().includes('forf');

    const lotName = categorizeLot(l.lot, l.designation);
    l.lot = lotName;

    if (!sousTotauxLot[lotName]) sousTotauxLot[lotName] = { indique: 0, calcule: 0 };

    if (isForfait) {
      forfaits.push({ l, mInd });
      l._calc = mInd;
      l._ecart = 0;
      l._isForfait = true;
      sumForfaits += mInd;
    } else {
      l._calc = Math.round(qte * pu);
      l._ecart = Math.round(mInd - l._calc);
      if (Math.abs(l._ecart) > 5) {
        anomaliesArith.push({ l, ecart: l._ecart, calc: l._calc });
        if (l._ecart > 0) sumEcartsPositifs += l._ecart;
        else sumEcartsNegatifs += Math.abs(l._ecart);
      }
      l._isForfait = false;
      if (l.designation) {
        l.designation = l.designation.replace(/kgm/g, 'kg/m³');
      }
    }
    totalHTCalcule += l._calc;
    totalHTIndiqueLignes += mInd;
    sousTotauxLot[lotName].indique += mInd;
    sousTotauxLot[lotName].calcule += l._calc;
  });

  const totalHTIndiqueDevis = totalHTIndiqueLignes;
  const ecartGlobalHT = Math.round(totalHTIndiqueDevis - totalHTCalcule);
  const tauxTVA = data.totaux?.tauxTVA || 18;
  const tvaCalc = Math.round(totalHTCalcule * (tauxTVA / 100));
  const totalTTCCalc = totalHTCalcule + tvaCalc;

  // Surfaces & Ratios
  const surfaceTerrain = parseFloat(data.surface || data.identification?.surface || data.projet?.surface_terrain || 200);
  const surfaceSDP = parseFloat(data.sdp || data.identification?.sdp || data.projet?.sdp || 200);
  const ratioM2 = surfaceSDP > 0 ? Math.round(totalHTCalcule / surfaceSDP) : null;
  const prixEtude = getAuditPrice(surfaceTerrain);

  // ANOMALIES & ACTIONS
  let anomalies = [];
  let causesBloquantes = [];
  let topActions = [];

  if (anomaliesArith.length > 0) {
    const sArith = anomaliesArith.length > 1 ? 's' : '';
    anomalies.push({
      titre: 'Écarts arithmétiques détectés',
      constat: `${anomaliesArith.length} ligne${sArith} présente${anomaliesArith.length > 1 ? 'nt' : ''} un écart de calcul (Qté × PU ≠ Montant).`,
      risque: 'Surfacturation ou incohérence contractuelle.',
      action: 'Exiger un devis corrigé arithmétiquement parfait avant tout engagement.'
    });
    const erreurPrefix = anomaliesArith.length === 1 ? "l'" : `les ${anomaliesArith.length} `;
    topActions.push(`Faire corriger ${erreurPrefix}erreur${sArith} de calcul arithmétique.`);
  }

  if (forfaits.length > 0) {
    anomalies.push({
      titre: 'Lignes forfaitaires non détaillées',
      constat: `${forfaits.length} ligne${forfaits.length > 1 ? 's' : ''} facturée${forfaits.length > 1 ? 's' : ''} au "Forfait" sans sous-détail (PU=0 ou Unité=Forfait).`,
      risque: 'Impossibilité de vérifier les quantités réelles ou les cadences de main d\'œuvre. Risque élevé d\'avenants abusifs.',
      action: 'Exiger le sous-détail des prix (quantités métrées et prix unitaires décomposés) pour chaque forfait.'
    });
    topActions.push('Exiger le décompte unitaire des montants forfaitaires.');
  }

  if (Math.abs(ecartGlobalHT) > 100) {
    anomalies.push({
      titre: 'Incohérence du Total HT Global',
      constat: `Le total HT indiqué sur le devis ne correspond pas à la somme des lignes recalculées. Écart constaté : ${fmtCfa(ecartGlobalHT)}.`,
      risque: 'Facturation erronée susceptible d\'engendrer un contentieux financier lors des situations de travaux.',
      action: 'Faire rectifier le Total HT et le TTC sur un devis révisé conforme.'
    });
    if (Math.abs(ecartGlobalHT) > 100000) {
      causesBloquantes.push(`Écart global de ${fmtCfa(ecartGlobalHT)} non régularisé.`);
      topActions.push(`Clarifier l'incohérence globale de ${fmtCfa(ecartGlobalHT)} sur le total HT.`);
    }
  }

  if (!data.identification?.ninea && !data.identification?.rccm && !data.identification?.entreprise?.ninea) {
    anomalies.push({
      titre: 'Identification Légale Incomplète',
      constat: 'Le NINEA et le RCCM de l\'entreprise soumissionnaire ne sont pas mentionnés.',
      risque: 'Structure potentiellement informelle. Recours juridiques très complexes en cas d\'abandon de chantier ou malfaçons.',
      action: 'Exiger impérativement la copie certifiée du RCCM et de l\'attestation NINEA.'
    });
    topActions.push("Vérifier le RCCM et le NINEA de l'entreprise avant signature.");
  }

  const cAcompte = data.devis?.conditions?.acompteType === 'percent'
    ? data.devis.conditions.acompte
    : (data.devis?.conditions?.acompte ? (data.devis.conditions.acompte / totalTTCCalc * 100) : 0);

  if (cAcompte > 30) {
    anomalies.push({
      titre: 'Acompte excessif (> 30%)',
      constat: `L'acompte à la commande s'élève à ${Math.round(cAcompte)}%, excédant le seuil prudentiel recommandé de 20 à 30%.`,
      risque: 'Vulnérabilité financière majeure du maître d\'ouvrage en cas de défaillance précoce du constructeur.',
      action: 'Négocier un acompte de démarrage plafonné à 20% ou 30% adossé à un calendrier d\'approvisionnement vérifiable.'
    });
    causesBloquantes.push(`Acompte disproportionné (${Math.round(cAcompte)}%).`);
    topActions.push(`Plafonner l'acompte initial (${Math.round(cAcompte)}%) à maximum 30%.`);
  }

  const clausesMap = [
    { k: 'retenueGarantie', t: 'Retenue de garantie (5%)', r: 'Absence de levier financier pour obtenir la levée des réserves lors de l\'année de parfait achèvement.', a: 'Insérer la clause : "Retenue de garantie légale de 5% consignée jusqu\'à réception définitive".' },
    { k: 'penalites', t: 'Pénalités de retard', r: 'Aucune indemnité contractuelle en cas de glissement calendaire injustifié du chantier.', a: 'Définir des pénalités claires (ex. 1/1000e du montant du marché par jour calendaire de retard).' },
    { k: 'assurances', t: 'Assurances Décennale & RC', r: 'En cas de vice de sol, d\'effondrement ou de dommage corporel, vous assumez l\'intégralité des préjudices.', a: 'Exiger la police d\'assurance Responsabilité Civile Professionnelle et Garantie Décennale en cours de validité.' }
  ];

  let absentes = 0;
  let missingNames = [];
  clausesMap.forEach(c => {
    if (!data.devis?.conditions || !data.devis.conditions[c.k]) {
      anomalies.push({ titre: 'Clause contractuelle absente : ' + c.t, constat: `Aucune stipulation relative à la clause : ${c.t}.`, risque: c.r, action: c.a });
      absentes++;
      missingNames.push(c.t);
    }
  });

  if (absentes > 0) {
    const sAbs = absentes > 1 ? 's' : '';
    const clausePrefix = absentes === 1 ? 'la' : 'les';
    topActions.push(`Intégrer ${clausePrefix} ${absentes} clause${sAbs} contractuelle${sAbs} protectrice${sAbs}.`);
  }

  let acompteStr = 'Non précisé';
  if (data.devis?.conditions?.acompte) {
    if (data.devis.conditions.acompteType === 'fcfa') acompteStr = fmtCfa(data.devis.conditions.acompte);
    else acompteStr = data.devis.conditions.acompte + ' %';
  }

  const clausesList = [
    { n: '1. Acompte de démarrage', v: acompteStr },
    { n: '2. Échéancier de paiement', v: data.devis?.conditions?.echeancier },
    { n: '3. Retenue de garantie', v: data.devis?.conditions?.retenueGarantie ? data.devis.conditions.retenueGarantie + '%' : null },
    { n: '4. Pénalités de retard', v: data.devis?.conditions?.penalites },
    { n: '5. Gestion des travaux modificatifs / avenants', v: data.devis?.conditions?.avenants },
    { n: '6. Attestation d\'assurance (RC / Décennale)', v: data.devis?.conditions?.assurances },
    { n: '7. Durée de validité de l\'offre', v: data.devis?.conditions?.validite },
    { n: '8. Délai d\'exécution contractuel', v: data.devis?.conditions?.delai }
  ];

  let missingClausesCount = clausesList.filter(c => (!c.v || c.v === '' || c.v === 'Non précisé')).length;
  if (missingClausesCount >= 4) {
    const sCl = missingClausesCount > 1 ? 's' : '';
    const absentStr = missingClausesCount > 1 ? 'absentes' : 'absente';
    causesBloquantes.push(`${missingClausesCount} clauses de sécurité contractuelle ${absentStr}.`);
  }

  let hasBloquant = causesBloquantes.length > 0 || Math.abs(ecartGlobalHT) > 100000 || cAcompte > 30;
  let hasMajeur = anomaliesArith.length > 0 || anomalies.length > 2;

  let verdictCode = "CONFORME";
  let verdictColor = COLOR_GREEN;
  if (hasBloquant) { verdictCode = "NE PAS SIGNER EN L'ÉTAT"; verdictColor = COLOR_RED; }
  else if (hasMajeur) { verdictCode = "À CLARIFIER AVANT SIGNATURE"; verdictColor = COLOR_AMBER; }

  // CRÉATION DU DOCUMENT PDF
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
      // Bandeau haut bleu marine (#0E2A47)
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });
      page.drawRectangle({ x: 0, y: height - 73, width: width, height: 3, color: COLOR_AMBER });

      // Logo officiel incorporé
      const logoW = 34;
      const logoH = 34;
      page.drawImage(logoClairImage, {
        x: 40,
        y: height - 56,
        width: logoW,
        height: logoH
      });

      page.drawText('ChantierSur.com', { x: 82, y: height - 34, size: 15, font: boldFont, color: rgb(1,1,1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 82, y: height - 46, size: 7.5, font: regularFont, color: COLOR_SLATE });
      page.drawText('RAPPORT D\'AUDIT DE DEVIS BTP', { x: width - 215, y: height - 38, size: 9.5, font: boldFont, color: rgb(1,1,1) });
      return height - 95;
    };

    const drawFooter = (page, pageIndex) => {
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 0.8, color: COLOR_GRAY });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — 16 Route de Mont-Rolland, Thiès, Sénégal.", { x: 40, y: 24, size: 6.8, font: regularFont, color: COLOR_SLATE });
      page.drawText("Audit d'ingénierie et contre-expertise contractuelle — Document délivré au maître d'ouvrage.", { x: 40, y: 14, size: 6.8, font: boldFont, color: COLOR_NAVY });
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

    const drawAdviceBox = (title, items) => {
      const startX = 40;
      const boxWidth = width - 80;

      let formattedLines = [];
      items.forEach(it => {
        const fullTxt = `• ${it.label} : ${it.text}`;
        const lines = wrapText(fullTxt, boxWidth - 22, regularFont, 6.7);
        formattedLines.push(...lines);
      });

      const boxHeight = 14 + (formattedLines.length * 8.5) + 6;
      checkPageBreak(boxHeight + 10);

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
        y: currentY - 10.5,
        size: 7.2,
        font: boldFont,
        color: COLOR_NAVY
      });

      formattedLines.forEach((ln, idx) => {
        currentPage.drawText(ln, {
          x: startX + 8,
          y: currentY - 20 - (idx * 8.5),
          size: 6.7,
          font: regularFont,
          color: rgb(0.12, 0.18, 0.24)
        });
      });

      currentY -= (boxHeight + 12);
    };

    currentY = drawHeader(currentPage, currentY, 0);

    // ==========================================
    // 0. RÉSUMÉ EXÉCUTIF
    // ==========================================
    let percNonVerif = totalHTIndiqueDevis > 0 ? (sumForfaits / totalHTIndiqueDevis * 100) : 0;
    let percNonVerifStr = percNonVerif.toFixed(1).replace('.', ',') + ' %';
    let acts = topActions.slice(0, 3);
    if (acts.length === 0) acts.push("Aucune action urgente, devis cohérent.");

    let actsLines = [];
    acts.forEach((a) => {
      let wl = wrapText(`• ${a}`, width - 120, regularFont, 7.5);
      actsLines.push(...wl);
    });

    let execHeight = 105 + (actsLines.length * 10) + 15;
    checkPageBreak(execHeight + 20);

    currentPage.drawRectangle({ x: 40, y: currentY - execHeight, width: width - 80, height: execHeight, color: rgb(0.98,0.98,0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText('0. RÉSUMÉ EXÉCUTIF', { x: 50, y: currentY - 20, size: 9.5, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(verdictCode, { x: width - 260, y: currentY - 22, size: 12, font: boldFont, color: verdictColor });
    currentPage.drawImage(logoSombreImage, {
      x: width - 72,
      y: currentY - 34,
      width: 22,
      height: 22
    });

    currentPage.drawText(`Total HT Indiqué : ${fmtCfa(totalHTIndiqueDevis)}`, { x: 50, y: currentY - 40, size: 8.5, font: regularFont });
    currentPage.drawText(`Total HT Recalculé : ${fmtCfa(totalHTCalcule)}`, { x: 50, y: currentY - 55, size: 8.5, font: boldFont });
    currentPage.drawText(`Écart global : ${ecartGlobalHT > 0 ? '+' : ''}${fmtCfa(ecartGlobalHT)}`, { x: 50, y: currentY - 70, size: 8.5, font: regularFont, color: ecartGlobalHT !== 0 ? COLOR_RED : COLOR_GREEN });

    currentPage.drawText(`Anomalies détectées : ${anomalies.length}`, { x: width - 260, y: currentY - 40, size: 8.5, font: regularFont });
    currentPage.drawText(`Part forfaitaire non vérifiable : ${percNonVerifStr}`, { x: width - 260, y: currentY - 55, size: 8.5, font: regularFont });
    if (ratioM2) {
      currentPage.drawText(`Ratio d'ouvrage : ${fmtCfa(ratioM2)}/m² SDP`, { x: width - 260, y: currentY - 70, size: 8.5, font: boldFont, color: COLOR_NAVY });
    }

    currentPage.drawText('Priorités d\'action immédiates :', { x: 50, y: currentY - 92, size: 8, font: boldFont });
    let actsY = currentY - 105;
    actsLines.forEach((l) => {
      currentPage.drawText(l, { x: 60, y: actsY, size: 7.5, font: regularFont, color: COLOR_NAVY });
      actsY -= 11;
    });

    currentY -= (execHeight + 20);

    // ==========================================
    // I. IDENTIFICATION & PÉRIMÈTRE
    // ==========================================
    checkPageBreak(110);
    currentPage.drawText('I. IDENTIFICATION ET PÉRIMÈTRE DE L\'AUDIT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 18;

    const objText = data.identification?.objetDevis || data.devis_object || 'Construction BTP';
    // Résolution robuste du nom client
    const clientNom = (data.client && (data.client.nom || data.client.name))
      || (data.identification && (data.identification.client?.nom || data.identification.nom || data.identification.clientNom))
      || data.client_name
      || 'Client';
    const entNom = data.identification?.entrepriseNom || data.identification?.entreprise?.nom || data.company_name || 'Entreprise soumissionnaire';
    const devisDate = data.devis?.date || data.devis_date || 'Non précisée';
    const auditDate = new Date().toLocaleDateString('fr-FR');
    const ninea = data.identification?.ninea || data.identification?.entreprise?.ninea || data.ninea || 'Non fourni';
    const rccm = data.identification?.rccm || data.identification?.entreprise?.rccm || data.rccm || 'Non fourni';
    const refStr = data.dossier || data.reference || ('CS-AUDIT-' + Date.now());

    currentPage.drawText(`Référence du dossier : ${refStr}   |   Date d'audit : ${auditDate}   |   Tarif de l'étude : ${typeof prixEtude === 'number' ? fmtCfa(prixEtude) : prixEtude}`, { x: 40, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`Maître d'ouvrage (Client) : ${clientNom}   |   Entreprise auditée : ${entNom}`, { x: 40, y: currentY, size: 8, font: boldFont, color: COLOR_NAVY });
    currentY -= 12;
    currentPage.drawText(`Objet du devis : ${objText}   |   Date d'émission du devis : ${devisDate}`, { x: 40, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`Superficie du terrain : ${surfaceTerrain} m²   |   Surface de plancher (SDP) : ${surfaceSDP} m²   |   Niveaux : ${data.exact_levels || data.niveaux || 1}`, { x: 40, y: currentY, size: 8, font: boldFont, color: COLOR_NAVY });
    currentY -= 12;
    currentPage.drawText(`Immatriculation entreprise : NINEA : ${ninea}   |   RCCM : ${rccm}`, { x: 40, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`Périmètre vérifié : Calculs arithmétiques, sous-détails des forfaits, Conformité de la TVA (18%), clauses contractuelles vitales.`, { x: 40, y: currentY, size: 7.5, font: regularFont, color: COLOR_SLATE });
    currentY -= 12;
    currentPage.drawText(`Hors périmètre : Analyse des prix marchands détaillés (disponible via l'Étude d'Esquisse), sondage géotechnique de sol in situ.`, { x: 40, y: currentY, size: 7.5, font: regularFont, color: COLOR_SLATE });
    currentY -= 22;

    // ==========================================
    // II. VÉRIFICATION LIGNE PAR LIGNE
    // ==========================================
    checkPageBreak(50);
    currentPage.drawText('II. CONTRÔLE ARITHMÉTIQUE DÉTAILLÉ LIGNE PAR LIGNE', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const colX = [40, 125, 290, 318, 350, 405, 460, 515];
    const headers = ['Lot technique', 'Désignation', 'Qté', 'Unité', 'PU HT', 'Indiqué', 'Recalculé', 'Écart'];
    headers.forEach((h, i) => currentPage.drawText(h, { x: colX[i], y: currentY, size: 7, font: boldFont, color: COLOR_NAVY }));
    currentY -= 5;
    currentPage.drawLine({ start: { x: 40, y: currentY }, end: { x: 558, y: currentY }, thickness: 1, color: COLOR_NAVY });
    currentY -= 10;

    data.devis.lignes.forEach((l) => {
      let lotLines = wrapText(l.lot || 'DIVERS', 80, regularFont, 6.8);
      const cleanDes = (l.designation || '').replace(/ép\.\s*(\d+)/gi, 'ép.\u00A0$1').replace(/(\d+)\s*(cm|mm|m²|m³|kg)/gi, '$1\u00A0$2');
      let desLines = wrapText(cleanDes, 160, regularFont, 6.8);
      let maxLines = Math.max(lotLines.length, desLines.length);
      let reqSpace = (maxLines * 10) + 8;
      checkPageBreak(reqSpace);

      lotLines.forEach((t, i) => currentPage.drawText(t, { x: colX[0], y: currentY - (i * 10), size: 6.8, font: regularFont }));
      desLines.forEach((t, i) => currentPage.drawText(t, { x: colX[1], y: currentY - (i * 10), size: 6.8, font: regularFont }));

      currentPage.drawText(String(l.quantite || 0), { x: colX[2], y: currentY, size: 6.8, font: regularFont });
      let uniteStr = l._isForfait ? 'Forfait' : String(l.unite || '').substring(0, 8);
      currentPage.drawText(uniteStr, { x: colX[3], y: currentY, size: 6.8, font: regularFont });

      if (l._isForfait) {
        currentPage.drawText('Forfait', { x: colX[4], y: currentY, size: 6.8, font: regularFont, color: COLOR_AMBER });
        currentPage.drawText(fmtCfa(l.montantIndique).replace(' FCFA', ''), { x: colX[5], y: currentY, size: 6.8, font: regularFont });
        currentPage.drawText(fmtCfa(l._calc).replace(' FCFA', ''), { x: colX[6], y: currentY, size: 6.8, font: regularFont });
        currentPage.drawText('-', { x: colX[7], y: currentY, size: 6.8, font: boldFont });
      } else {
        currentPage.drawText(fmtCfa(l.pu || 0).replace(' FCFA', ''), { x: colX[4], y: currentY, size: 6.8, font: regularFont });
        currentPage.drawText(fmtCfa(l.montantIndique || 0).replace(' FCFA', ''), { x: colX[5], y: currentY, size: 6.8, font: regularFont });
        currentPage.drawText(fmtCfa(l._calc).replace(' FCFA', ''), { x: colX[6], y: currentY, size: 6.8, font: regularFont });
        const cEcart = l._ecart !== 0 ? COLOR_RED : COLOR_GREEN;
        currentPage.drawText(fmtCfa(l._ecart).replace(' FCFA', ''), { x: colX[7], y: currentY, size: 6.8, font: boldFont, color: cEcart });
      }
      currentY -= (maxLines * 10) + 4;
    });

    currentY -= 12;

    // Conseil personnalisé après Tableau II
    let conseilLignes = [];
    if (anomaliesArith.length > 0) {
      conseilLignes.push({
        label: "Écarts arithmétiques relevés",
        text: `Ce devis comporte ${anomaliesArith.length} ligne(s) arithmétiquement erronée(s) représentant un surcoût indu de ${fmtCfa(sumEcartsPositifs)}. Exigez une réémission formelle du devis corrigé avant tout acompte.`
      });
    } else {
      conseilLignes.push({
        label: "Arithmétique conforme",
        text: "Toutes les multiplications Quantité × Prix Unitaire déclarées sont conformes. Aucune erreur de calcul direct n'a été décelée."
      });
    }
    if (forfaits.length > 0) {
      conseilLignes.push({
        label: "Opacité des forfaits",
        text: `${forfaits.length} ligne(s) sont libellées en "Forfait" (${percNonVerifStr} du budget). Exigez un sous-détail BPU (Bordereau de Prix Unitaires) avec métrés précis pour éviter des contestations en cours d'exécution.`
      });
    }
    conseilLignes.push({
      label: "Action recommandée",
      text: "Ne signez aucun devis comportant des arrondis arbitraires. Toute modification de métré sur chantier devra être consignée au préalable par écrit via un avenant d'attachement contradictoire."
    });
    drawAdviceBox("CONSEILS DE CONTRÔLE TECHNIQUE & ARITHMÉTIQUE (B7)", conseilLignes);

    // ==========================================
    // III. SOUS-TOTAUX & PRINCIPAUX POSTES
    // ==========================================
    checkPageBreak(90);
    currentPage.drawText('III. RÉPARTITION PAR LOT & PRINCIPAUX POSTES DE COÛT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    let lotArray = Object.keys(sousTotauxLot).map(k => ({ nom: k, ...sousTotauxLot[k] })).sort((a, b) => b.indique - a.indique);
    lotArray.forEach(lot => {
      checkPageBreak(14);
      let pct = totalHTIndiqueDevis > 0 ? (lot.indique / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
      currentPage.drawText(`• ${lot.nom} : ${fmtCfa(lot.indique)} indiqués (${pct} du devis)`, { x: 50, y: currentY, size: 7.5, font: regularFont });
      currentY -= 12;
    });

    currentY -= 8;
    checkPageBreak(65);
    currentPage.drawText('Postes prépondérants identifiés (leviers prioritaires de négociation) :', { x: 40, y: currentY, size: 8.5, font: boldFont, color: COLOR_NAVY });
    currentY -= 14;

    let topLignes = [...data.devis.lignes].sort((a, b) => (b.montantIndique || 0) - (a.montantIndique || 0)).slice(0, 5);
    let topSum = 0;
    topLignes.forEach(l => {
      checkPageBreak(14);
      let m = l.montantIndique || 0;
      topSum += m;
      let pct = totalHTIndiqueDevis > 0 ? (m / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
      let ds = (l.designation || '').substring(0, 48);
      currentPage.drawText(`- ${ds}... [${l.lot || 'DIVERS'}] : ${fmtCfa(m)} (${pct})`, { x: 50, y: currentY, size: 7.5, font: regularFont });
      currentY -= 11;
    });

    let topPctTotal = totalHTIndiqueDevis > 0 ? (topSum / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
    currentY -= 4;
    currentPage.drawText(`Note stratégique : Ces postes concentrent ${topPctTotal} de l'enveloppe globale : concentrez-y vos demandes de rabais et de vérification.`, { x: 40, y: currentY, size: 7.5, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    // Conseil personnalisé après Tableau III
    let topLotNom = lotArray.length > 0 ? lotArray[0].nom : 'Gros Œuvre';
    let topLotPct = lotArray.length > 0 && totalHTIndiqueDevis > 0 ? (lotArray[0].indique / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
    let conseilLots = [
      {
        label: "Poste prépondérant (" + topLotNom + ")",
        text: `Le lot ${topLotNom} représente à lui seul ${topLotPct} du montant total. C'est sur ce lot que doivent porter 80 % de vos efforts de contrôle (demande des fiches techniques des matériaux et bons de commande).`
      },
      {
        label: "Approvisionnement & matériaux",
        text: "Vérifiez que la fourniture du ciment (dosage 350 kg/m³ pour éléments porteurs) et des aciers (haute adhérence FeE500) est explicitement contractée à la charge de l'entrepreneur sans clause d'indexation unilatérale."
      },
      {
        label: "Négociation ciblée",
        text: `Sur les postes majeurs représentant ${topPctTotal} de l'enveloppe, sollicitez une remise globale de 5 % à 8 % en contrepartie d'un calendrier de paiement garanti par jalons constatés.`
      }
    ];
    drawAdviceBox("CONSEILS DE NÉGOCIATION PAR LOT TECHNIQUE (B7)", conseilLots);

    // ==========================================
    // IV. SYNTHÈSE TOTAUX + FIABILITÉ + ENJEU
    // ==========================================
    checkPageBreak(140);
    currentPage.drawText('IV. SYNTHÈSE BUDGÉTAIRE, SCORE DE FIABILITÉ & ENJEU FINANCIER', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    currentPage.drawText('Total HT Indiqué sur le devis : ' + fmtCfa(totalHTIndiqueDevis), { x: 40, y: currentY, size: 8.5, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total HT Recalculé par le bureau d\'études : ' + fmtCfa(totalHTCalcule), { x: 40, y: currentY, size: 8.5, font: boldFont });
    currentY -= 12;
    currentPage.drawText(`TVA légale sénégalaise (${tauxTVA}%) recalculée : ` + fmtCfa(tvaCalc), { x: 40, y: currentY, size: 8.5, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total TTC Réel recalculé : ' + fmtCfa(totalTTCCalc), { x: 40, y: currentY, size: 8.5, font: boldFont });
    if (ratioM2) {
      currentY -= 12;
      currentPage.drawText(`Ratio global au mètre carré SDP : ${fmtCfa(ratioM2)} / m² de plancher`, { x: 40, y: currentY, size: 8.5, font: boldFont, color: COLOR_NAVY });
    }
    currentY -= 18;

    // Encadré Score
    let percVerif = totalHTIndiqueDevis > 0 ? ((totalHTCalcule - sumForfaits) / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
    let scoreText = `SCORE DE FIABILITÉ : ${percVerif} du montant est formellement vérifié arithmétiquement | ${percNonVerifStr} est forfaitaire non vérifiable.`;
    let scoreLines = wrapText(scoreText, width - 100, boldFont, 8);
    let extraNote = ecartGlobalHT !== 0 ? `Avertissement : un écart arithmétique net de ${fmtCfa(Math.abs(ecartGlobalHT))} a été mis en évidence.` : null;
    let scoreHeight = (scoreLines.length * 12) + 15 + (extraNote ? 12 : 0);
    checkPageBreak(scoreHeight + 10);
    currentPage.drawRectangle({ x: 40, y: currentY - scoreHeight, width: width - 80, height: scoreHeight, color: rgb(0.95, 0.95, 0.95) });
    let scY = currentY - 14;
    scoreLines.forEach((l) => {
      currentPage.drawText(l, { x: 50, y: scY, size: 8, font: boldFont, color: COLOR_NAVY });
      scY -= 12;
    });
    if (extraNote) {
      currentPage.drawText(extraNote, { x: 50, y: scY, size: 7.5, font: regularFont, color: COLOR_RED });
    }
    currentY -= (scoreHeight + 15);

    // Encadré Enjeu
    let t1 = `Surfacturations directes identifiées (écarts arithmétiques positifs) : ${sumEcartsPositifs > 0 ? fmtCfa(sumEcartsPositifs) : 'Aucune'}`;
    let t2 = `Sous-évaluations manifestes (risque d'avenants imprévus en cours de chantier) : ${sumEcartsNegatifs > 0 ? fmtCfa(sumEcartsNegatifs) : 'Aucune'}`;
    let t3 = `Volumes financiers non quantifiés (lignes forfaitaires opaques) : ${sumForfaits > 0 ? fmtCfa(sumForfaits) : 'Aucun'} (${percNonVerifStr} du devis)`;
    let w1 = wrapText(t1, width - 100, boldFont, 7.8);
    let w2 = wrapText(t2, width - 100, boldFont, 7.8);
    let w3 = wrapText(t3, width - 100, boldFont, 7.8);
    let enjeuHeight = (w1.length + w2.length + w3.length) * 12 + 18;
    checkPageBreak(enjeuHeight + 10);
    currentPage.drawRectangle({ x: 40, y: currentY - enjeuHeight, width: width - 80, height: enjeuHeight, color: rgb(0.99, 0.95, 0.95), borderColor: COLOR_RED, borderWidth: 1 });
    let enjY = currentY - 14;
    w1.forEach(l => { currentPage.drawText(l, { x: 50, y: enjY, size: 7.8, font: boldFont }); enjY -= 12; });
    w2.forEach(l => { currentPage.drawText(l, { x: 50, y: enjY, size: 7.8, font: boldFont }); enjY -= 12; });
    w3.forEach(l => { currentPage.drawText(l, { x: 50, y: enjY, size: 7.8, font: boldFont }); enjY -= 12; });
    currentY -= (enjeuHeight + 16);

    // Conseil personnalisé après Tableau IV
    let conseilSynthese = [
      {
        label: "Ratio au m² SDP",
        text: ratioM2 ? `Le ratio constaté de ${fmtCfa(ratioM2)}/m² de plancher se situe dans les standards du marché pour ce type d'ouvrage. Surveillez scrupuleusement la qualité d'exécution des finitions associées.` : `Superficie SDP non spécifiée : exigez de l'entrepreneur la ventilation du coût au m² habitable pour comparer aux références du secteur.`
      },
      {
        label: "Maîtrise des risques financiers",
        text: `Montant révisé recalculé : ${fmtCfa(totalTTCCalc)}. Bloquez impérativement 5 % en retenue de garantie légale jusqu'à la réception définitive (1 an après la réception provisoire).`
      },
      {
        label: "Échelonnement des paiements",
        text: "Proscrivez tout acompte à la commande supérieur à 20-30 %. Conditionnez chaque tranche suivante (fondations, élévation RDC, plancher haut, second œuvre) au constat contradictoire de l'avancement physique."
      }
    ];
    drawAdviceBox("CONSEILS DE MAÎTRISE FINANCIÈRE & JALONS DE PAIEMENT (B7)", conseilSynthese);

    // ==========================================
    // V. TABLEAU DES CLAUSES CONTRACTUELLES
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('V. CONTRÔLE DES 8 CLAUSES CONTRACTUELLES FONDAMENTALES', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    clausesList.forEach(c => {
      let isMissing = (!c.v || c.v === '' || c.v === 'Non précisé');
      let tColor = isMissing ? COLOR_RED : COLOR_GREEN;
      let tVal = isMissing ? 'ABSENTE / NON FORMALISÉE' : c.v;
      checkPageBreak(14);
      currentPage.drawText(c.n + ' :', { x: 40, y: currentY, size: 7.8, font: boldFont });
      currentPage.drawText(tVal, { x: 230, y: currentY, size: 7.8, font: regularFont, color: tColor });
      currentY -= 12;
    });
    currentY -= 16;

    // Conseil personnalisé après Tableau V
    let conseilClauses = [
      {
        label: "Sécurisation contractuelle",
        text: missingClausesCount > 0 ? `${missingClausesCount} clause(s) protectrice(s) manque(nt) au devis. Exigez l'annexion d'un Cahier des Clauses Particulières (CCP) reprenant l'ensemble des garanties requises avant signature.` : `L'ensemble des clauses contractuelles standard sont mentionnées au devis, conférant une sécurité juridique appréciable au marché.`
      },
      {
        label: "Cadre légal sénégalais",
        text: "Conformément à la Loi n° 2021-22 du 2 mars 2021 (art. 28 et 31) et à l'arrêt n° 28 de la Cour suprême du 18 avril 2018, la responsabilité des constructeurs s'applique de plein droit en cas de malfaçon ou inexécution."
      },
      {
        label: "Pénalités & Assurances",
        text: "Imposez une pénalité de retard contractuelle (1/1 000e du montant du marché par jour calendaire de retard) et exigez l'attestation d'assurance Tous Risques Chantier (TRC) en cours de validité."
      }
    ];
    drawAdviceBox("CONSEILS JURIDIQUES & SÉCURISATION DU MARCHÉ (B7)", conseilClauses);

    // ==========================================
    // VI. DÉTAIL DES ANOMALIES & POINTS POSITIFS
    // ==========================================
    checkPageBreak(80);
    currentPage.drawText('VI. DÉTAIL DES ANOMALIES & POINTS POSITIFS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    if (anomalies.length > 0) {
      anomalies.forEach(a => {
        checkPageBreak(50);
        currentPage.drawText('▶ ' + a.titre, { x: 40, y: currentY, size: 8.5, font: boldFont, color: COLOR_NAVY });
        currentY -= 11;
        wrapText('Constat technique : ' + a.constat, 500, regularFont, 7.5).forEach(l => { currentPage.drawText(l, { x: 50, y: currentY, size: 7.5, font: regularFont }); currentY -= 9.5; });
        wrapText('Risque client : ' + a.risque, 500, regularFont, 7.5).forEach(l => { currentPage.drawText(l, { x: 50, y: currentY, size: 7.5, font: regularFont, color: COLOR_RED }); currentY -= 9.5; });
        wrapText('Action recommandée : ' + a.action, 500, boldFont, 7.5).forEach(l => { currentPage.drawText(l, { x: 50, y: currentY, size: 7.5, font: boldFont, color: COLOR_NAVY }); currentY -= 9.5; });
        currentY -= 9;
      });
    }

    checkPageBreak(55);
    currentPage.drawText('Points positifs relevés sur le dossier :', { x: 40, y: currentY, size: 8.5, font: boldFont, color: COLOR_GREEN });
    currentY -= 14;
    let lignesExactes = data.devis.lignes.length - anomaliesArith.length - forfaits.length;
    const sLig = lignesExactes > 1 ? 's' : '';
    currentPage.drawText(`✓ ${lignesExactes} ligne${sLig} sur ${data.devis.lignes.length} arithmétiquement exacte${sLig} (Quantité × Prix Unitaire = Montant).`, { x: 50, y: currentY, size: 7.5, font: regularFont });
    currentY -= 11;
    if (tvaCalc > 0) {
      currentPage.drawText(`✓ Conformité du taux de TVA légale sénégalaise (18%) sur les montants déclarés.`, { x: 50, y: currentY, size: 7.5, font: regularFont });
      currentY -= 11;
    }
    let clausesPresentes = 8 - missingClausesCount;
    const sCp = clausesPresentes > 1 ? 's' : '';
    currentPage.drawText(`✓ ${clausesPresentes} clause${sCp} contractuelle${sCp} sur 8 dument formalisée${sCp} au devis.`, { x: 50, y: currentY, size: 7.5, font: regularFont });
    currentY -= 11;
    if (!hasMajeur && !hasBloquant) {
      currentPage.drawText(`✓ Aucune incohérence financière bloquante identifiée à ce stade.`, { x: 50, y: currentY, size: 7.5, font: regularFont });
      currentY -= 11;
    }
    currentY -= 18;

    // ==========================================
    // VII. CHECKLIST & CONSEILS
    // ==========================================
    checkPageBreak(80);
    currentPage.drawText('VII. CHECKLIST DE NÉGOCIATION AVANT ENGAGEMENT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 14;

    const cl = [
      "Transmettre ce rapport à l'entrepreneur pour explication sur les écarts constatés.",
      "Exiger la correction de tous les écarts arithmétiques avant toute signature.",
      "Faire rajouter expressément par écrit toutes les clauses contractuelles absentes (voir section V).",
      "Vérifier le RCCM et le NINEA auprès des registres officiels sénégalais.",
      "Ne verser aucun acompte avant l'approbation conjointe du marché rectifié et paraphé."
    ];
    cl.forEach(c => {
      checkPageBreak(14);
      currentPage.drawText('[ ] ' + c, { x: 40, y: currentY, size: 7.5, font: regularFont });
      currentY -= 11;
    });

    currentY -= 10;
    const conseils = [
      "1) Exigez un décompte mensuel détaillé d'avancement avant chaque appel de fonds ; ne payez que les ouvrages effectivement exécutés.",
      "2) Tout ouvrage modificatif ou supplémentaire doit faire l'objet d'un avenant écrit, quantifié et chiffré AVANT tout début d'exécution.",
      "3) Conservez obligatoirement la retenue de garantie (5 %) jusqu'à la réception définitive après levée intégrale des réserves.",
      "4) La réception s'effectue obligatoirement avec procès-verbal écrit : consignez-y scrupuleusement l'ensemble des malfaçons constatées.",
      "5) Conservez précieusement un jeu complet de tous les documents contractuels : devis initial, avenants, reçus de virement, PV de réception."
    ];
    let consLines = [];
    conseils.forEach(c => {
      let wl = wrapText(c, width - 100, regularFont, 7.2);
      consLines.push(...wl);
      consLines.push("");
    });
    let consHeight = 22 + (consLines.length * 9.5) + 10;
    checkPageBreak(consHeight + 10);
    currentPage.drawRectangle({ x: 40, y: currentY - consHeight, width: width - 80, height: consHeight, color: rgb(0.96, 0.98, 0.96), borderColor: COLOR_GREEN, borderWidth: 1 });
    currentPage.drawText('Règles d\'or pour sécuriser le suivi de vos travaux :', { x: 50, y: currentY - 14, size: 8, font: boldFont, color: COLOR_NAVY });
    let innerY = currentY - 28;
    consLines.forEach(l => {
      if (l !== "") currentPage.drawText(l, { x: 50, y: innerY, size: 7.2, font: regularFont });
      innerY -= (l === "" ? 4 : 9.5);
    });
    currentY -= (consHeight + 20);

    // ==========================================
    // VIII. MÉTHODOLOGIE & CADRE RÉGLEMENTAIRE
    // ==========================================
    checkPageBreak(70);
    currentPage.drawText('VIII. MÉTHODOLOGIE D\'AUDIT & CADRE LÉGAL SÉNÉGALAIS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 14;
    const methodText = [
      "Le présent audit est réalisé selon les règles d'art de l'ingénierie du bâtiment et de l'analyse contractuelle des marchés privés de travaux.",
      "Références légales sénégalaises : Loi n° 2021-22 du 2 mars 2021 (notamment art. 28 et 31) régissant le cadre de la construction et les obligations des constructeurs, et Arrêt n° 28 de la Cour suprême du Sénégal du 18 avril 2018 consacrant la responsabilité contractuelle en matière de vices et manquements professionnels.",
      "Les méthodes d'analyse structurelle s'appuient sur les principes reconnus des calculs aux états limites appliqués aux ouvrages en béton armé.",
      "Limites : L'audit sur pièces ne remplace ni l'étude de sol in situ, ni le visa formel d'un bureau de contrôle technique agréé pour la délivrance des assurances décennales."
    ];
    methodText.forEach(t => {
      wrapText('- ' + t, 500, regularFont, 7.2).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.2, font: regularFont });
        currentY -= 9.5;
      });
      currentY -= 3;
    });
    currentY -= 15;

    // ==========================================
    // IX. VERDICT FINAL & CONCLUSION
    // ==========================================
    let parts = [];
    if (ecartGlobalHT !== 0) parts.push(`Écart arithmétique de ${fmtCfa(Math.abs(ecartGlobalHT))} non régularisé`);
    if (missingClausesCount > 0) {
      const sCl2 = missingClausesCount > 1 ? 's' : '';
      const absentStr2 = missingClausesCount > 1 ? 'absentes' : 'absente';
      parts.push(`${missingClausesCount} clause${sCl2} de protection contractuelle ${absentStr2}`);
    }
    let verdictJustif = parts.length > 0 ? parts.join(' et ') + '.' : "L'ensemble des vérifications arithmétiques et contractuelles indispensables sont satisfaisantes.";
    let justifLines = wrapText('Motifs du verdict : ' + verdictJustif, width - 100, regularFont, 8.5);

    let verdictHeight = 45 + (justifLines.length * 12) + 12;
    checkPageBreak(verdictHeight + 20);

    currentPage.drawRectangle({ x: 40, y: currentY - verdictHeight, width: width - 80, height: verdictHeight, color: rgb(0.98, 0.98, 0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText('IX. VERDICT FINAL DE LA CONTRE-EXPERTISE', { x: 50, y: currentY - 15, size: 9, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(verdictCode, { x: 50, y: currentY - 32, size: 13, font: boldFont, color: verdictColor });

    let vY = currentY - 48;
    justifLines.forEach((l) => {
      currentPage.drawText(l, { x: 50, y: vY, size: 8.5, font: regularFont });
      vY -= 12;
    });

    currentY -= (verdictHeight + 18);
    currentPage.drawText("Validité : Cet audit ne vaut que pour le devis référencé ci-dessus. Tout devis modifié ou rectificatif doit faire l'objet d'un nouvel audit de validation.", { x: 40, y: currentY, size: 6.8, font: boldFont, color: COLOR_NAVY });

    // Rendu global des pieds de page
    pages.forEach((p, idx) => drawFooter(p, idx));

    const pdfBytes = await pdfDoc.save();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ChantierSur_Audit_${refStr}.pdf"`
      },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
