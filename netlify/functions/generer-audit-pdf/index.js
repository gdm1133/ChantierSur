const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkitModule = require('@pdf-lib/fontkit');
const fontkit = fontkitModule.default || fontkitModule;

function findFile(filename) {
  const paths = [
    path.join(__dirname, filename),
    path.join(process.cwd(), 'netlify/functions/generer-audit-pdf', filename),
    path.join('/var/task/netlify/functions/generer-audit-pdf', filename),
    path.join('/var/task/src/netlify/functions/generer-audit-pdf', filename)
  ];
  for (let p of paths) { if (fs.existsSync(p)) return p; }
  throw new Error('File not found: ' + filename + ' in ' + paths.join(', '));
}

function wrapText(text, maxWidth, font, fontSize) {
  if (!text) return [];
  const words = text.split(' ');
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

const COLOR_NAVY = rgb(11/255, 19/255, 37/255);
const COLOR_AMBER = rgb(245/255, 158/255, 11/255);
const COLOR_SLATE = rgb(148/255, 163/255, 184/255);
const COLOR_RED = rgb(0.86, 0.15, 0.15);
const COLOR_GREEN = rgb(0.1, 0.6, 0.2);
const COLOR_GRAY = rgb(0.9, 0.9, 0.9);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }
  if (!data.devis?.lignes || data.devis.lignes.length === 0) return { statusCode: 400, body: 'Aucune ligne' };

  // CALCULATION LOGIC
  let totalHTCalcule = 0;
  let totalHTIndiqueLignes = 0;
  let forfaits = [];
  let anomaliesArith = [];
  let sumEcartsPositifs = 0;
  let sumEcartsNegatifs = 0;
  let sumForfaits = 0;
  
  let sousTotauxLot = {};

  data.devis.lignes.forEach((l) => {
    let qte = typeof l.quantite === 'number' ? l.quantite : 0;
    let pu = typeof l.pu === 'number' ? l.pu : 0;
    let mInd = typeof l.montantIndique === 'number' ? l.montantIndique : 0;
    let isForfait = (pu === 0 && mInd > 0) || String(l.unite).toLowerCase().includes('forf');
    
    if (typeof l.lot === 'string') {
      l.lot = l.lot.replace(/^[-—\s]+/, '');
    }
    let lotName = (l.lot && l.lot.trim() !== '' && l.lot !== '-') ? l.lot.toUpperCase() : 'SANS LOT PRÉCISÉ';
    if (lotName === 'LOT GÉNÉRAL' && l.designation && l.designation.toLowerCase().includes('plomberie')) {
      lotName = 'PLOMBERIE SANITAIRE';
      l.lot = 'PLOMBERIE SANITAIRE';
    }
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

  let totalEcartArith = anomaliesArith.reduce((acc, curr) => acc + curr.ecart, 0);

  // ANOMALIES & CLAUSES
  let anomalies = [];
  let causesBloquantes = [];
  let topActions = [];

  if (anomaliesArith.length > 0) {
    const sArith = anomaliesArith.length > 1 ? 's' : '';
    anomalies.push({
      titre: 'Écarts arithmétiques détectés',
      constat: `${anomaliesArith.length} ligne${sArith} présente${anomaliesArith.length > 1 ? 'nt' : ''} un écart de calcul (Qté × PU ≠ Montant).`,
      risque: 'Surfacturation ou incohérence dans le contrat.',
      action: 'Exiger un devis corrigé arithmétiquement parfait avant signature.'
    });
    const erreurPrefix = anomaliesArith.length === 1 ? "l'" : `les ${anomaliesArith.length} `;
    topActions.push(`Faire corriger ${erreurPrefix}erreur${sArith} de calcul arithmétique.`);
  }
  if (forfaits.length > 0) {
    anomalies.push({
      titre: 'Lignes forfaitaires',
      constat: `${forfaits.length} ligne${forfaits.length > 1 ? 's' : ''} facturée${forfaits.length > 1 ? 's' : ''} au "Forfait" sans détail (PU=0 ou Unité=Forfait).`,
      risque: 'Impossibilité de vérifier la quantité réelle de matériaux ou le temps de main d\'œuvre. Risque d\'avenants.',
      action: 'Demander le sous-détail des prix (quantités réelles et prix unitaires) pour chaque forfait.'
    });
    topActions.push('Exiger le détail des montants forfaitaires (quantités/prix).');
  }
  if (Math.abs(ecartGlobalHT) > 100) {
    anomalies.push({
      titre: 'Incohérence Total HT Global',
      constat: `Le total HT indiqué en pied de page ne correspond pas à la somme exacte des lignes recalculées. Écart: ${fmtCfa(ecartGlobalHT)}.`,
      risque: 'Le montant final réclamé est faux. Risque de litige lors du paiement.',
      action: 'Faire corriger le Total HT et le TTC sur le devis officiel.'
    });
    if (Math.abs(ecartGlobalHT) > 100000) {
        causesBloquantes.push(`Écart de ${fmtCfa(ecartGlobalHT)} non corrigé.`);
        topActions.push(`Clarifier l'incohérence globale de ${fmtCfa(ecartGlobalHT)} sur le total HT.`);
    }
  }
  if (!data.identification?.ninea || !data.identification?.rccm) {
    anomalies.push({
      titre: 'Identification Légale Incomplète',
      constat: 'Le NINEA et/ou RCCM de l\'entreprise sont manquants.',
      risque: 'Entreprise potentiellement informelle. Aucun recours juridique en cas d\'abandon de chantier.',
      action: 'Exiger la copie du RCCM et NINEA et vérifier leur validité.'
    });
    topActions.push("Demander le RCCM et le NINEA de l'entreprise.");
  }

  const cAcompte = data.devis?.conditions?.acompteType === 'percent' ? data.devis.conditions.acompte : (data.devis?.conditions?.acompte / totalTTCCalc * 100);
  if (cAcompte > 30) {
    anomalies.push({
      titre: 'Acompte abusif (>30%)',
      constat: `L'acompte demandé est supérieur aux 30% recommandés.`,
      risque: 'Risque financier majeur en cas de disparition de l\'entrepreneur.',
      action: 'Négocier un acompte à la signature de 20% ou 30% maximum.'
    });
    causesBloquantes.push(`Acompte abusif (${Math.round(cAcompte)}%).`);
    topActions.push(`Réduire l'acompte demandé (${Math.round(cAcompte)}%) à maximum 30%.`);
  }
  
  const clausesMap = [
    { k: 'retenueGarantie', t: 'Retenue de garantie', r: 'L\'entreprise n\'a aucune incitation financière à lever les réserves de fin de chantier.', a: 'Ajouter une mention "Retenue de garantie de 5% payable 1 an après réception".' },
    { k: 'penalites', t: 'Pénalités de retard', r: 'Le chantier peut s\'éterniser sans aucune pénalité pour l\'entreprise.', a: 'Ajouter des pénalités (ex: 1/1000 du montant du marché par jour de retard).' },
    { k: 'assurances', t: 'Assurances', r: 'En cas de sinistre ou d\'effondrement, vous paierez de votre poche.', a: 'Exiger l\'attestation d\'assurance Responsabilité Civile et Décennale.' }
  ];
  let absentes = 0;
  let missingNames = [];
  clausesMap.forEach(c => {
    if (!data.devis?.conditions || !data.devis.conditions[c.k]) {
      anomalies.push({ titre: 'Clause absente : ' + c.t, constat: `Aucune mention concernant la clause: ${c.t}.`, risque: c.r, action: c.a });
      absentes++;
      missingNames.push(c.t.toLowerCase());
    }
  });
  if (absentes > 0) {
      const sAbs = absentes > 1 ? 's' : '';
      const clausePrefix = absentes === 1 ? 'la' : 'les';
      topActions.push(`Ajouter ${clausePrefix} ${absentes} clause${sAbs} de sécurité manquante${sAbs} (${missingNames.join(', ')}).`);
  }

  let acompteStr = 'Non précisé';
  if (data.devis?.conditions?.acompte) {
      if (data.devis.conditions.acompteType === 'fcfa') acompteStr = fmtCfa(data.devis.conditions.acompte);
      else acompteStr = data.devis.conditions.acompte + ' %';
  }
  const clausesList = [
    { n: '1. Acompte', v: acompteStr },
    { n: '2. Échéancier', v: data.devis?.conditions?.echeancier },
    { n: '3. Retenue de garantie', v: data.devis?.conditions?.retenueGarantie ? data.devis.conditions.retenueGarantie + '%' : null },
    { n: '4. Pénalités de retard', v: data.devis?.conditions?.penalites },
    { n: '5. Gestion des avenants', v: data.devis?.conditions?.avenants },
    { n: '6. Assurances', v: data.devis?.conditions?.assurances },
    { n: '7. Validité du devis', v: data.devis?.conditions?.validite },
    { n: '8. Délai d\'exécution', v: data.devis?.conditions?.delai }
  ];
  let missingClausesCount = clausesList.filter(c => (!c.v || c.v === '' || c.v === 'Non précisé')).length;
  if (missingClausesCount >= 4) {
      const sCl = missingClausesCount > 1 ? 's' : '';
      const absentStr = missingClausesCount > 1 ? 'absentes' : 'absente';
      causesBloquantes.push(`${missingClausesCount} clause${sCl} bloquante${sCl} ${absentStr}.`);
  }

  let hasBloquant = causesBloquantes.length > 0 || Math.abs(ecartGlobalHT) > 100000 || cAcompte > 30;
  let hasMajeur = anomaliesArith.length > 0 || anomalies.length > 2;

  let verdictCode = "🟢 CONFORME";
  let verdictColor = COLOR_GREEN;
  if (hasBloquant) { verdictCode = "🔴 NE PAS SIGNER EN L'ÉTAT"; verdictColor = COLOR_RED; }
  else if (hasMajeur) { verdictCode = "🟡 À CLARIFIER"; verdictColor = COLOR_AMBER; }

  // PDF INIT
  try {
    const regularBytes = fs.readFileSync(findFile('DejaVuSans.ttf'));
    const boldBytes = fs.readFileSync(findFile('DejaVuSans-Bold.ttf'));
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regularFont = await pdfDoc.embedFont(regularBytes);
    const boldFont = await pdfDoc.embedFont(boldBytes);

    let pages = [];
    let currentPage = pdfDoc.addPage([595, 842]);
    pages.push(currentPage);
    const { width, height } = currentPage.getSize();
    let currentY = height - 40;

    const drawHeader = (page, y, pageIndex) => {
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });
      page.drawRectangle({ x: 0, y: height - 73, width: width, height: 3, color: COLOR_AMBER });
      page.drawText('ChantierSur.com', { x: 40, y: height - 30, size: 16, font: boldFont, color: rgb(1,1,1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 40, y: height - 42, size: 8, font: regularFont, color: COLOR_SLATE });
      page.drawText('RAPPORT D\'AUDIT DE DEVIS', { x: width - 200, y: height - 35, size: 10, font: boldFont, color: rgb(1,1,1) });
      return height - 100;
    };

    const drawFooter = (page, pageIndex) => {
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 1, color: COLOR_GRAY });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — 16 Route de Mont-Rolland, Thiès, Sénégal.", { x: 40, y: 25, size: 7, font: regularFont, color: COLOR_SLATE });
      page.drawText("Outil automatisé d'aide à la décision — sans certification.", { x: 40, y: 15, size: 7, font: boldFont, color: COLOR_NAVY });
      page.drawText(`Page ${pageIndex + 1} sur ${pages.length}`, { x: width - 80, y: 20, size: 7, font: boldFont, color: COLOR_NAVY });
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

    currentY = drawHeader(currentPage, currentY, 0);

    // ==========================================
    // 0. RÉSUMÉ EXÉCUTIF
    // ==========================================
    let percNonVerif = totalHTIndiqueDevis > 0 ? (sumForfaits / totalHTIndiqueDevis * 100) : 0;
    let percNonVerifStr = percNonVerif.toFixed(1).replace('.', ',') + ' %';
    let acts = topActions.slice(0, 3);
    if (acts.length === 0) acts.push("Aucune action urgente, devis satisfaisant.");
    
    let actsLines = [];
    acts.forEach((a) => {
      let wl = wrapText(`• ${a}`, width - 120, regularFont, 7);
      actsLines.push(...wl);
    });

    let execHeight = 100 + (actsLines.length * 10) + 15;
    checkPageBreak(execHeight + 20);

    currentPage.drawRectangle({ x: 40, y: currentY - execHeight, width: width - 80, height: execHeight, color: rgb(0.98,0.98,0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText('0. RÉSUMÉ EXÉCUTIF', { x: 50, y: currentY - 20, size: 9, font: boldFont });
    currentPage.drawText(verdictCode, { x: width - 250, y: currentY - 22, size: 12, font: boldFont, color: verdictColor });
    
    currentPage.drawText(`Total HT Indiqué : ${fmtCfa(totalHTIndiqueDevis)}`, { x: 50, y: currentY - 40, size: 9, font: regularFont });
    currentPage.drawText(`Total HT Recalculé : ${fmtCfa(totalHTCalcule)}`, { x: 50, y: currentY - 55, size: 9, font: boldFont });
    currentPage.drawText(`Écart global : ${ecartGlobalHT > 0 ? '+' : ''}${fmtCfa(ecartGlobalHT)}`, { x: 50, y: currentY - 70, size: 9, font: regularFont, color: ecartGlobalHT !== 0 ? COLOR_RED : COLOR_GREEN });
    currentPage.drawText(`Anomalies majeures/bloquantes : ${anomalies.length}`, { x: width - 250, y: currentY - 40, size: 9, font: regularFont });
    currentPage.drawText(`Non vérifiable (Forfaits) : ${percNonVerifStr}`, { x: width - 250, y: currentY - 55, size: 9, font: regularFont });
    
    currentPage.drawText('Top actions urgentes :', { x: 50, y: currentY - 90, size: 8, font: boldFont });
    let actsY = currentY - 102;
    actsLines.forEach((l) => {
        currentPage.drawText(l, { x: 60, y: actsY, size: 7, font: regularFont, color: COLOR_NAVY });
        actsY -= 10;
    });
    
    currentY -= (execHeight + 20);

    // ==========================================
    // I. IDENTIFICATION & PÉRIMÈTRE
    // ==========================================
    checkPageBreak(80);
    currentPage.drawText('I. IDENTIFICATION ET PÉRIMÈTRE DE L\'AUDIT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 20;
    
    const objText = data.identification?.objetDevis || 'Non fourni';
    const clientNom = data.identification?.client?.nom || data.identification?.nom || 'Non fourni';
    const entNom = data.identification?.entrepriseNom || data.identification?.entreprise?.nom || 'Non fourni';
    const devisDate = data.devis?.date || 'Non précisée';
    const auditDate = new Date().toLocaleDateString('fr-FR');
    const ninea = data.identification?.ninea || data.identification?.entreprise?.ninea || 'Non fourni';
    const rccm = data.identification?.rccm || data.identification?.entreprise?.rccm || 'Non fourni';
    const refStr = data.dossier || data.reference || 'CS-' + new Date().getTime();
    
    currentPage.drawText(`Référence du rapport : ${refStr} | Date d'audit : ${auditDate}`, { x: 40, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`Client : ${clientNom} | Devis audité : ${objText} | Émis le : ${devisDate} | Par : ${entNom}`, { x: 40, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`NINEA : ${ninea} | RCCM : ${rccm}`, { x: 40, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`L'audit couvre : calculs arithmétiques, détection des forfaits, conformité TVA, présence des clauses contractuelles vitales.`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });
    currentY -= 12;
    currentPage.drawText(`L'audit ne couvre pas : l'analyse des prix du marché.`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });
    currentY -= 12;
    currentPage.drawText(`• l'existence légale réelle de l'entreprise`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });
    currentY -= 12;
    currentPage.drawText(`• l'état du chantier (aucune visite de site)`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });
    currentY -= 25;

    // ==========================================
    // II. VÉRIFICATION LIGNE PAR LIGNE
    // ==========================================
    checkPageBreak(50);
    currentPage.drawText('II. VÉRIFICATION LIGNE PAR LIGNE', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    const colX = [40, 140, 260, 290, 330, 390, 450, 510];
    const headers = ['Lot', 'Désignation', 'Qté', 'Unité', 'PU HT', 'Indiqué', 'Recalculé', 'Écart'];
    headers.forEach((h, i) => currentPage.drawText(h, { x: colX[i], y: currentY, size: 7, font: boldFont }));
    currentY -= 5;
    currentPage.drawLine({start: {x: 40, y: currentY}, end: {x: 550, y: currentY}, thickness: 1, color: COLOR_NAVY});
    currentY -= 10;

    data.devis.lignes.forEach((l) => {
      let lotLines = wrapText(l.lot || '', 95, regularFont, 7);
      let desLines = wrapText(l.designation || '', 115, regularFont, 7);
      let maxLines = Math.max(lotLines.length, desLines.length);
      let reqSpace = (maxLines * 10) + 15;
      checkPageBreak(reqSpace);
      
      lotLines.forEach((t, i) => currentPage.drawText(t, { x: colX[0], y: currentY - (i*10), size: 7, font: regularFont }));
      desLines.forEach((t, i) => currentPage.drawText(t, { x: colX[1], y: currentY - (i*10), size: 7, font: regularFont }));
      
      currentPage.drawText(String(l.quantite||0), { x: colX[2], y: currentY, size: 7, font: regularFont });
      let uniteStr = l._isForfait ? 'Forfait' : String(l.unite||'').substring(0, 8);
      currentPage.drawText(uniteStr, { x: colX[3], y: currentY, size: 7, font: regularFont });
      
      if (l._isForfait) {
        currentPage.drawText('Forfait', { x: colX[4], y: currentY, size: 7, font: regularFont, color: COLOR_AMBER });
        currentPage.drawText(fmtCfa(l.montantIndique).replace(' FCFA',''), { x: colX[5], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(l._calc).replace(' FCFA',''), { x: colX[6], y: currentY, size: 7, font: regularFont });
        currentPage.drawText('-', { x: colX[7], y: currentY, size: 7, font: boldFont });
      } else {
        currentPage.drawText(fmtCfa(l.pu||0).replace(' FCFA',''), { x: colX[4], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(l.montantIndique||0).replace(' FCFA',''), { x: colX[5], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(l._calc).replace(' FCFA',''), { x: colX[6], y: currentY, size: 7, font: regularFont });
        const cEcart = l._ecart !== 0 ? COLOR_RED : COLOR_GREEN;
        currentPage.drawText(fmtCfa(l._ecart).replace(' FCFA',''), { x: colX[7], y: currentY, size: 7, font: boldFont, color: cEcart });
      }
      currentY -= (maxLines * 10) + 5;
    });

    currentY -= 20;

    // ==========================================
    // III. SOUS-TOTAUX & PRINCIPAUX POSTES
    // ==========================================
    checkPageBreak(100);
    currentPage.drawText('III. SOUS-TOTAUX PAR LOT & PRINCIPAUX POSTES', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 20;
    
    let lotArray = Object.keys(sousTotauxLot).map(k => ({ nom: k, ...sousTotauxLot[k] })).sort((a,b) => b.indique - a.indique);
    lotArray.forEach(lot => {
        checkPageBreak(15);
        let pct = totalHTIndiqueDevis > 0 ? (lot.indique / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
        currentPage.drawText(`• ${lot.nom} : ${fmtCfa(lot.indique)} indiqués (${pct})`, { x: 50, y: currentY, size: 8, font: regularFont });
        currentY -= 12;
    });

    currentY -= 10;
    checkPageBreak(60);
    currentPage.drawText('Principaux postes de coût du devis :', { x: 40, y: currentY, size: 9, font: boldFont });
    currentY -= 15;
    
    let topLignes = [...data.devis.lignes].sort((a,b) => (b.montantIndique||0) - (a.montantIndique||0)).slice(0, 5);
    let topSum = 0;
    topLignes.forEach(l => {
        checkPageBreak(15);
        let m = l.montantIndique||0;
        topSum += m;
        let pct = totalHTIndiqueDevis > 0 ? (m / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
        let ds = (l.designation||'').substring(0, 45);
        currentPage.drawText(`- ${ds}... [${l.lot||'Sans lot'}] : ${fmtCfa(m)} (${pct})`, { x: 50, y: currentY, size: 8, font: regularFont });
        currentY -= 12;
    });
    
    let topPctTotal = totalHTIndiqueDevis > 0 ? (topSum / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
    currentY -= 5;
    currentPage.drawText(`💡 Ces postes représentent ${topPctTotal} du devis : c'est sur eux que la négociation a le plus d'effet.`, { x: 40, y: currentY, size: 8, font: boldFont, color: COLOR_NAVY });
    currentY -= 25;

    // ==========================================
    // IV. SYNTHÈSE TOTAUX + FIABILITÉ + ENJEU
    // ==========================================
    checkPageBreak(150);
    currentPage.drawText('IV. SYNTHÈSE, SCORE DE FIABILITÉ ET ENJEU FINANCIER', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 20;

    currentPage.drawText('Total HT Indiqué sur devis: ' + fmtCfa(totalHTIndiqueDevis), { x: 40, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total HT Recalculé (y compris forfaits): ' + fmtCfa(totalHTCalcule), { x: 40, y: currentY, size: 9, font: boldFont });
    currentY -= 12;
    currentPage.drawText(`TVA (${tauxTVA}%) Recalculée: ` + fmtCfa(tvaCalc), { x: 40, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total TTC Recalculé: ' + fmtCfa(totalTTCCalc), { x: 40, y: currentY, size: 9, font: boldFont });
    currentY -= 20;

    // Encadré Score
    let percVerif = totalHTIndiqueDevis > 0 ? ((totalHTCalcule - sumForfaits) / totalHTIndiqueDevis * 100).toFixed(1).replace('.', ',') + ' %' : '0 %';
    let scoreText = `SCORE: ${percVerif} du montant vérifié arithmétiquement | ${percNonVerifStr} forfaitaire (non vérifiable).`;
    let scoreLines = wrapText(scoreText, width - 100, boldFont, 8);
    let extraNote = ecartGlobalHT !== 0 ? `Note : l'écart détecté de ${fmtCfa(Math.abs(ecartGlobalHT))} explique la différence.` : null;
    let scoreHeight = (scoreLines.length * 12) + 15 + (extraNote ? 12 : 0);
    checkPageBreak(scoreHeight + 10);
    currentPage.drawRectangle({ x: 40, y: currentY - scoreHeight, width: width - 80, height: scoreHeight, color: rgb(0.95,0.95,0.95) });
    let scY = currentY - 15;
    scoreLines.forEach((l) => {
        currentPage.drawText(l, { x: 50, y: scY, size: 8, font: boldFont, color: COLOR_NAVY });
        scY -= 12;
    });
    if (extraNote) {
        currentPage.drawText(extraNote, { x: 50, y: scY, size: 7, font: regularFont, color: COLOR_RED });
    }
    currentY -= (scoreHeight + 10);

    // Encadré Enjeu
    let t1 = `Surfacturation détectée (écarts positifs) : ${sumEcartsPositifs > 0 ? fmtCfa(sumEcartsPositifs) : 'Aucune'}`;
    let t2 = `Sous-évaluations (risque d'avenants) : ${sumEcartsNegatifs > 0 ? fmtCfa(sumEcartsNegatifs) : 'Aucune'}`;
    let t3 = `Montants non vérifiables : ${sumForfaits > 0 ? fmtCfa(sumForfaits) : 'Aucun'} (${percNonVerifStr} du devis)`;
    let w1 = wrapText(t1, width - 100, boldFont, 8);
    let w2 = wrapText(t2, width - 100, boldFont, 8);
    let w3 = wrapText(t3, width - 100, boldFont, 8);
    let enjeuHeight = (w1.length + w2.length + w3.length) * 12 + 20;
    checkPageBreak(enjeuHeight + 10);
    currentPage.drawRectangle({ x: 40, y: currentY - enjeuHeight, width: width - 80, height: enjeuHeight, color: rgb(0.99,0.95,0.95), borderColor: COLOR_RED, borderWidth: 1 });
    let enjY = currentY - 15;
    w1.forEach(l => { currentPage.drawText(l, { x: 50, y: enjY, size: 8, font: boldFont }); enjY -= 12; });
    w2.forEach(l => { currentPage.drawText(l, { x: 50, y: enjY, size: 8, font: boldFont }); enjY -= 12; });
    w3.forEach(l => { currentPage.drawText(l, { x: 50, y: enjY, size: 8, font: boldFont }); enjY -= 12; });
    currentY -= (enjeuHeight + 20);

    // ==========================================
    // V. TABLEAU DES CLAUSES
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('V. TABLEAU DES 8 CLAUSES CONTRACTUELLES', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    clausesList.forEach(c => {
      let isMissing = (!c.v || c.v === '' || c.v === 'Non précisé');
      let tColor = isMissing ? COLOR_RED : COLOR_GREEN;
      let tVal = isMissing ? 'Absent / Non précisé' : c.v;
      checkPageBreak(15);
      currentPage.drawText(c.n + ' :', { x: 40, y: currentY, size: 8, font: boldFont });
      currentPage.drawText(tVal, { x: 180, y: currentY, size: 8, font: regularFont, color: tColor });
      currentY -= 12;
    });
    currentY -= 20;

    // ==========================================
    // VI. ANOMALIES & POINTS POSITIFS
    // ==========================================
    checkPageBreak(80);
    currentPage.drawText('VI. DÉTAIL DES ANOMALIES & POINTS POSITIFS', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 20;

    if (anomalies.length > 0) {
      anomalies.forEach(a => {
        checkPageBreak(50);
        currentPage.drawText('▶ ' + a.titre, { x: 40, y: currentY, size: 9, font: boldFont, color: COLOR_NAVY });
        currentY -= 12;
        wrapText('Constat: ' + a.constat, 500, regularFont, 8).forEach(l => { currentPage.drawText(l, { x: 50, y: currentY, size: 8, font: regularFont }); currentY -= 10; });
        wrapText('Risque: ' + a.risque, 500, regularFont, 8).forEach(l => { currentPage.drawText(l, { x: 50, y: currentY, size: 8, font: regularFont, color: COLOR_RED }); currentY -= 10; });
        wrapText('Action requise: ' + a.action, 500, boldFont, 8).forEach(l => { currentPage.drawText(l, { x: 50, y: currentY, size: 8, font: boldFont, color: COLOR_NAVY }); currentY -= 10; });
        currentY -= 10;
      });
    }

    checkPageBreak(50);
    currentPage.drawText('Points positifs relevés :', { x: 40, y: currentY, size: 9, font: boldFont, color: COLOR_GREEN });
    currentY -= 15;
    let lignesExactes = data.devis.lignes.length - anomaliesArith.length - forfaits.length;
    const sLig = lignesExactes > 1 ? 's' : '';
    currentPage.drawText(`✓ ${lignesExactes} ligne${sLig} sur ${data.devis.lignes.length} arithmétiquement exacte${sLig}.`, { x: 50, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    if (tvaCalc > 0) {
        currentPage.drawText(`✓ TVA correctement appliquée (base × taux).`, { x: 50, y: currentY, size: 8, font: regularFont });
        currentY -= 12;
    }
    let clausesPresentes = 8 - missingClausesCount;
    const sCp = clausesPresentes > 1 ? 's' : '';
    currentPage.drawText(`✓ ${clausesPresentes} clause${sCp} sur 8 présente${sCp} et précisée${sCp}.`, { x: 50, y: currentY, size: 8, font: regularFont });
    currentY -= 12;
    if (!hasMajeur && !hasBloquant) {
        currentPage.drawText(`✓ Aucun écart majeur ou clause bloquante détectée.`, { x: 50, y: currentY, size: 8, font: regularFont });
        currentY -= 12;
    }
    currentY -= 20;

    // ==========================================
    // VII. CHECKLIST & CONSEILS
    // ==========================================
    checkPageBreak(80);
    currentPage.drawText('VII. CHECKLIST AVANT SIGNATURE & CONSEILS POST-SIGNATURE', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    const cl = [
      "Transmettre ce rapport à l'entrepreneur pour explication.",
      "Exiger la correction de tous les écarts arithmétiques.",
      "Faire rajouter par écrit toutes les clauses contractuelles absentes (voir section V).",
      "Vérifier le RCCM et le NINEA sur les documents officiels.",
      "Ne verser aucun acompte avant signature du devis mis à jour et validé."
    ];
    cl.forEach(c => {
      checkPageBreak(15);
      currentPage.drawText('[ ] ' + c, { x: 40, y: currentY, size: 8, font: regularFont });
      currentY -= 12;
    });
    
    currentY -= 10;
    const conseils = [
      "1) Exigez un décompte mensuel détaillé avant chaque paiement ; ne payez que l'avancement réellement constaté sur site.",
      "2) Tout travail non prévu au devis doit faire l'objet d'un avenant écrit et signé AVANT exécution, avec son prix.",
      "3) Conservez la retenue de garantie (5 %) jusqu'à la réception définitive.",
      "4) La réception des travaux se fait avec un procès-verbal écrit ; notez-y toutes les réserves avant de signer.",
      "5) Gardez une copie de tous les documents : devis signé, avenants, reçus de paiement, PV de réception."
    ];
    let consLines = [];
    conseils.forEach(c => {
        let wl = wrapText(c, width - 100, regularFont, 7);
        consLines.push(...wl);
        consLines.push(""); 
    });
    let consHeight = 25 + (consLines.length * 10) + 10;
    checkPageBreak(consHeight + 10);
    currentPage.drawRectangle({ x: 40, y: currentY - consHeight, width: width - 80, height: consHeight, color: rgb(0.96,0.98,0.96), borderColor: COLOR_GREEN, borderWidth: 1 });
    currentPage.drawText('Conseils après la signature :', { x: 50, y: currentY - 15, size: 8, font: boldFont, color: COLOR_NAVY });
    let innerY = currentY - 30;
    consLines.forEach(l => {
        if (l !== "") currentPage.drawText(l, { x: 50, y: innerY, size: 7, font: regularFont });
        innerY -= (l === "" ? 5 : 10);
    });
    currentY -= (consHeight + 20);

    // ==========================================
    // VIII. MÉTHODOLOGIE & LIMITES
    // ==========================================
    checkPageBreak(60);
    currentPage.drawText('VIII. MÉTHODOLOGIE & LIMITES', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    const methodText = [
      "Cet audit est réalisé sur une base purement arithmétique et contractuelle standard.",
      "Il ne remplace pas une visite de site ni l'expertise d'un bureau de contrôle agréé.",
      "Les montants forfaitaires n'ont pas pu être vérifiés car ils manquent de détail (quantités et PU)."
    ];
    methodText.forEach(t => {
      currentPage.drawText('- ' + t, { x: 40, y: currentY, size: 8, font: regularFont });
      currentY -= 10;
    });
    currentY -= 20;

    // ==========================================
    // IX. GLOSSAIRE
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('IX. GLOSSAIRE', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    const glossaire = [
      { t: "HT", d: "Hors Taxes. Montant sans application de la TVA." },
      { t: "TVA", d: "Taxe sur la Valeur Ajoutée. Impôt obligatoire reversé à l'État." },
      { t: "TTC", d: "Toutes Taxes Comprises. Montant final réel à payer." },
      { t: "Acompte", d: "Avance financière versée avant le début des travaux." },
      { t: "Décompte", d: "Facturation progressive basée sur l'avancement du chantier." },
      { t: "Retenue", d: "Somme (souvent 5%) conservée jusqu'à correction des défauts." },
      { t: "Pénalités", d: "Somme déduite en cas de retard de livraison du chantier." },
      { t: "Avenant", d: "Document modifiant le devis initial (travaux supplémentaires)." },
      { t: "Réception", d: "Acte marquant l'acceptation officielle des travaux par le client." }
    ];
    glossaire.forEach(g => {
        checkPageBreak(15);
        currentPage.drawText(`${g.t} : `, { x: 40, y: currentY, size: 7, font: boldFont });
        currentPage.drawText(g.d, { x: 90, y: currentY, size: 7, font: regularFont });
        currentY -= 10;
    });
    currentY -= 20;

    // ==========================================
    // X. VERDICT FINAL & VALIDITÉ
    // ==========================================
    let parts = [];
    if (ecartGlobalHT !== 0) parts.push(`Écart de ${fmtCfa(Math.abs(ecartGlobalHT))} non corrigé`);
    if (missingClausesCount > 0) {
        const sCl2 = missingClausesCount > 1 ? 's' : '';
        const absentStr2 = missingClausesCount > 1 ? 'absentes' : 'absente';
        parts.push(`${missingClausesCount} clause${sCl2} ${absentStr2}`);
    }
    let verdictJustif = parts.length > 0 ? parts.join(' et ') + '.' : "Toutes les vérifications arithmétiques et contractuelles sont correctes.";
    let justifLines = wrapText('Justification: ' + verdictJustif, width - 100, regularFont, 9);
    
    let verdictHeight = 45 + (justifLines.length * 12) + 10;
    checkPageBreak(verdictHeight + 20);

    currentPage.drawRectangle({ x: 40, y: currentY - verdictHeight, width: width - 80, height: verdictHeight, color: rgb(0.98,0.98,0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText('X. VERDICT FINAL', { x: 50, y: currentY - 15, size: 9, font: boldFont });
    currentPage.drawText(verdictCode, { x: 50, y: currentY - 30, size: 14, font: boldFont, color: verdictColor });
    
    let vY = currentY - 45;
    justifLines.forEach((l) => {
        currentPage.drawText(l, { x: 50, y: vY, size: 9, font: regularFont });
        vY -= 12;
    });
    
    currentY -= (verdictHeight + 20);
    currentPage.drawText("Validité : Cet audit ne vaut que pour le devis identifié ci-dessus. Tout devis modifié ou rectificatif doit faire l'objet d'un nouvel audit.", { x: 40, y: currentY, size: 7, font: boldFont, color: COLOR_NAVY });

    // Rendu global
    pages.forEach((p, idx) => drawFooter(p, idx));

    const pdfBytes = await pdfDoc.save();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Audit.pdf"` },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
