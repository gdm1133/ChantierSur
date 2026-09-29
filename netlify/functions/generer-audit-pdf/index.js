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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try { data = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Invalid JSON' }; }
  if (!data.devis?.lignes || data.devis.lignes.length === 0) return { statusCode: 400, body: 'Aucune ligne' };

  let totalHTCalcule = 0;
  let totalHTIndiqueLignes = 0;
  let forfaits = [];
  let anomaliesArith = [];

  // Lignes processing
  data.devis.lignes.forEach((l) => {
    let qte = typeof l.quantite === 'number' ? l.quantite : 0;
    let pu = typeof l.pu === 'number' ? l.pu : 0;
    let mInd = typeof l.montantIndique === 'number' ? l.montantIndique : 0;
    let isForfait = (pu === 0 && mInd > 0) || String(l.unite).toLowerCase().includes('forf');
    
    if (isForfait) {
      forfaits.push({ l, mInd });
      l._calc = mInd;
      l._ecart = 0;
      l._isForfait = true;
    } else {
      l._calc = Math.round(qte * pu);
      l._ecart = Math.round(mInd - l._calc);
      if (Math.abs(l._ecart) > 5) anomaliesArith.push({ l, ecart: l._ecart, calc: l._calc });
      l._isForfait = false;
    }
    totalHTCalcule += l._calc;
    totalHTIndiqueLignes += mInd;
  });

  // Correction demandée : utiliser la somme des lignes comme Total Indiqué si le total fourni par le form est incohérent.
  const totalHTIndiqueDevis = totalHTIndiqueLignes;
  const ecartGlobalHT = Math.round(totalHTIndiqueDevis - totalHTCalcule);
  
  const tauxTVA = data.totaux?.tauxTVA || 18;
  const tvaCalc = Math.round(totalHTCalcule * (tauxTVA / 100));
  const totalTTCCalc = totalHTCalcule + tvaCalc;

  // Anomalies list
  let anomalies = [];
  let causesBloquantes = [];
  let causesMajeures = [];

  if (anomaliesArith.length > 0) {
    const totalEcart = anomaliesArith.reduce((acc, curr) => acc + curr.ecart, 0);
    anomalies.push({
      titre: 'Écarts arithmétiques détectés',
      constat: `${anomaliesArith.length} ligne(s) présente(nt) un écart de calcul (Qté × PU ≠ Montant).`,
      risque: 'Surfacturation ou incohérence dans le contrat.',
      action: 'Exiger un devis corrigé arithmétiquement parfait avant signature.'
    });
    causesMajeures.push(`Écart arithmétique de ${fmtCfa(totalEcart)} sur ${anomaliesArith.length} ligne(s).`);
  }
  if (forfaits.length > 0) {
    anomalies.push({
      titre: 'Lignes forfaitaires',
      constat: `${forfaits.length} ligne(s) facturée(s) au "Forfait" sans détail (PU=0 ou Unité=Forfait).`,
      risque: 'Impossibilité de vérifier la quantité réelle de matériaux ou le temps de main d\'œuvre. Risque d\'avenants.',
      action: 'Demander le sous-détail des prix (quantités réelles et prix unitaires) pour chaque forfait.'
    });
  }
  if (Math.abs(ecartGlobalHT) > 100) {
    anomalies.push({
      titre: 'Incohérence Total HT Global',
      constat: `Le total HT indiqué en pied de page ne correspond pas à la somme exacte des lignes recalculées. Écart: ${fmtCfa(ecartGlobalHT)}.`,
      risque: 'Le montant final réclamé est faux. Risque de litige lors du paiement.',
      action: 'Faire corriger le Total HT et le TTC sur le devis officiel.'
    });
    if (Math.abs(ecartGlobalHT) > 100000) causesBloquantes.push('Incohérence massive du Total HT.');
    else causesMajeures.push('Incohérence du Total HT.');
  }
  if (!data.identification?.ninea || !data.identification?.rccm) {
    anomalies.push({
      titre: 'Identification Légale Incomplète',
      constat: 'Le NINEA et/ou RCCM de l\'entreprise sont manquants.',
      risque: 'Entreprise potentiellement informelle. Aucun recours juridique en cas d\'abandon de chantier.',
      action: 'Exiger la copie du RCCM et NINEA et vérifier leur validité.'
    });
    causesMajeures.push('Identification NINEA/RCCM manquante.');
  }

  // Conditions
  const cAcompte = data.devis?.conditions?.acompteType === 'percent' ? data.devis.conditions.acompte : (data.devis?.conditions?.acompte / totalTTCCalc * 100);
  if (cAcompte > 30) {
    anomalies.push({
      titre: 'Acompte abusif (>30%)',
      constat: `L'acompte demandé est supérieur aux 30% recommandés.`,
      risque: 'Risque financier majeur en cas de disparition de l\'entrepreneur.',
      action: 'Négocier un acompte à la signature de 20% ou 30% maximum.'
    });
    causesBloquantes.push(`Acompte abusif (${Math.round(cAcompte)}%).`);
  }
  if (!data.devis?.conditions?.retenueGarantie) {
    anomalies.push({
      titre: 'Clause absente : Retenue de garantie',
      constat: 'Aucune retenue de garantie (ex: 5%) n\'est stipulée sur les paiements.',
      risque: 'L\'entreprise n\'a aucune incitation financière à lever les réserves de fin de chantier.',
      action: 'Ajouter une mention "Retenue de garantie de 5% payable 1 an après réception".'
    });
    causesMajeures.push('Absence de retenue de garantie.');
  }
  if (!data.devis?.conditions?.penalites) {
    anomalies.push({
      titre: 'Clause absente : Pénalités de retard',
      constat: 'Pas de pénalités de retard définies.',
      risque: 'Le chantier peut s\'éterniser sans aucune pénalité pour l\'entreprise.',
      action: 'Ajouter des pénalités (ex: 1/1000 du montant du marché par jour de retard).'
    });
    causesMajeures.push('Absence de pénalités de retard.');
  }
  if (!data.devis?.conditions?.assurances) {
    anomalies.push({
      titre: 'Clause absente : Assurances',
      constat: 'Aucune mention d\'assurance RC pro ou décennale.',
      risque: 'En cas de sinistre ou d\'effondrement, vous paierez de votre poche.',
      action: 'Exiger l\'attestation d\'assurance Responsabilité Civile et Décennale.'
    });
    causesMajeures.push('Absence d\'assurance pro/décennale.');
  }

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

    const COLOR_NAVY = rgb(11/255, 19/255, 37/255);
    const COLOR_AMBER = rgb(245/255, 158/255, 11/255);
    const COLOR_SLATE = rgb(148/255, 163/255, 184/255);
    const COLOR_RED = rgb(0.86, 0.15, 0.15);
    const COLOR_GREEN = rgb(0.1, 0.6, 0.2);
    const COLOR_GRAY = rgb(0.9, 0.9, 0.9);

    const drawHeader = (page, y, pageIndex) => {
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });
      page.drawRectangle({ x: 0, y: height - 73, width: width, height: 3, color: COLOR_AMBER });
      const clientName = data.client?.nom || "Client";
      page.drawText('ChantierSur.com', { x: 40, y: height - 30, size: 16, font: boldFont, color: rgb(1,1,1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 40, y: height - 42, size: 8, font: regularFont, color: COLOR_SLATE });
      page.drawText('RAPPORT D\'AUDIT DE DEVIS', { x: width - 200, y: height - 35, size: 10, font: boldFont, color: rgb(1,1,1) });
      return height - 100;
    };

    const drawFooter = (page, pageIndex) => {
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 1, color: COLOR_GRAY });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — Dakar, République du Sénégal.", { x: 40, y: 25, size: 7, font: regularFont, color: COLOR_SLATE });
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

    // Bloc Identification
    currentPage.drawRectangle({ x: 40, y: currentY - 50, width: width - 80, height: 50, color: rgb(0.96,0.97,0.98), borderColor: rgb(0.8,0.84,0.88), borderWidth: 1 });
    currentPage.drawText('I. IDENTIFICATION DU PROJET & ENTREPRISE', { x: 50, y: currentY - 15, size: 9, font: boldFont, color: COLOR_NAVY });
    const objText = data.identification?.objetDevis || 'Non fourni';
    const entNom = data.identification?.entrepriseNom || 'Non fourni';
    currentPage.drawText(`Objet : ${objText} | Client : ${data.client?.nom||''}`, { x: 50, y: currentY - 30, size: 8, font: regularFont });
    currentPage.drawText(`Entreprise : ${entNom} | NINEA : ${data.identification?.ninea||''} | RCCM : ${data.identification?.rccm||''}`, { x: 50, y: currentY - 42, size: 8, font: regularFont });
    currentY -= 70;

    // Tableau Lignes
    currentPage.drawText('II. VÉRIFICATION LIGNE PAR LIGNE', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    // Colonnes ajustées: Lot plus large, Désignation un peu moins large.
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

    currentY -= 15;
    checkPageBreak(50);
    currentPage.drawText('III. SYNTHÈSE DES TOTAUX (TVA & TTC)', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    currentPage.drawText('Total HT Indiqué sur devis: ' + fmtCfa(totalHTIndiqueDevis), { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total HT Recalculé (y compris forfaits): ' + fmtCfa(totalHTCalcule), { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 12;
    currentPage.drawText(`TVA (${tauxTVA}%) Recalculée: ` + fmtCfa(tvaCalc), { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total TTC Recalculé: ' + fmtCfa(totalTTCCalc), { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 25;

    checkPageBreak(120);
    currentPage.drawText('IV. TABLEAU DES 8 CLAUSES CONTRACTUELLES', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    let acompteStr = 'Non précisé';
    if (data.devis?.conditions?.acompte) {
        if (data.devis.conditions.acompteType === 'fcfa') {
            acompteStr = fmtCfa(data.devis.conditions.acompte);
        } else {
            acompteStr = data.devis.conditions.acompte + ' %';
        }
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

    checkPageBreak(80);
    currentPage.drawText('V. DÉTAIL DES ANOMALIES & PLAN D\'ACTION', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;

    if (anomalies.length === 0) {
      currentPage.drawText('Aucune anomalie détectée.', { x: 50, y: currentY, size: 9, font: regularFont, color: COLOR_GREEN });
      currentY -= 20;
    } else {
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

    // CHECKLIST
    checkPageBreak(60);
    currentPage.drawText('CHECKLIST AVANT SIGNATURE', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    const cl = [
      "Transmettre ce rapport à l'entrepreneur pour explication.",
      "Exiger la correction de tous les écarts arithmétiques.",
      "Faire rajouter par écrit toutes les clauses contractuelles absentes (voir section IV).",
      "Vérifier le RCCM et le NINEA sur les documents officiels.",
      "Ne verser aucun acompte avant signature du devis mis à jour et validé."
    ];
    cl.forEach(c => {
      checkPageBreak(15);
      currentPage.drawText('[ ] ' + c, { x: 40, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    });
    currentY -= 20;

    checkPageBreak(80);
    currentPage.drawText('VI. MÉTHODOLOGIE & LIMITES', { x: 40, y: currentY, size: 10, font: boldFont });
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
    currentY -= 25;

    checkPageBreak(120);
    let hasBloquant = causesBloquantes.length > 0;
    let hasMajeur = causesMajeures.length > 0;

    let verdictText = "🟢 CONFORME";
    let verdictColor = COLOR_GREEN;
    let verdictJustif = "Toutes les vérifications arithmétiques et contractuelles sont correctes.";

    if (hasBloquant || hasMajeur) {
        if (hasBloquant) {
            verdictText = "🔴 NE PAS SIGNER EN L'ÉTAT";
            verdictColor = COLOR_RED;
        } else {
            verdictText = "🟡 À CLARIFIER";
            verdictColor = COLOR_AMBER;
        }
        
        let parts = [];
        let totalEcartArith = anomaliesArith.reduce((acc, curr) => acc + curr.ecart, 0);
        let clausesCount = clausesList.filter(c => (!c.v || c.v === '' || c.v === 'Non précisé')).length;
        
        if (totalEcartArith !== 0) parts.push(`Écart majeur de ${fmtCfa(Math.abs(totalEcartArith))} non corrigé`);
        if (clausesCount > 0) parts.push(`${clausesCount} clause(s) bloquante(s) absente(s)`);
        
        if (parts.length > 0) verdictJustif = parts.join(' et ') + '.';
        else verdictJustif = "Des éléments nécessitent une vérification (ex: Identification, Forfaits).";
    }

    currentPage.drawRectangle({ x: 40, y: currentY - 50, width: width - 80, height: 60, color: rgb(0.98,0.98,0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText('VII. VERDICT FINAL', { x: 50, y: currentY - 15, size: 9, font: boldFont });
    currentPage.drawText(verdictText, { x: 50, y: currentY - 30, size: 14, font: boldFont, color: verdictColor });
    wrapText('Justification: ' + verdictJustif, 480, regularFont, 9).forEach((l, i) => {
      currentPage.drawText(l, { x: 50, y: currentY - 45 - (i*12), size: 9, font: regularFont });
    });

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
