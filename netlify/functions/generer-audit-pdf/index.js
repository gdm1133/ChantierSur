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

  const totalHTIndiqueDevis = data.totaux?.htIndique || data.devis.totalHTIndique || 0;
  // If the user typed a HT total on the devis, use it to find the global gap
  const ecartGlobalHT = Math.round(totalHTIndiqueDevis - totalHTCalcule);
  
  const tauxTVA = data.totaux?.tauxTVA || 18;
  const tvaCalc = Math.round(totalHTCalcule * (tauxTVA / 100));
  const totalTTCCalc = totalHTCalcule + tvaCalc;

  // Anomalies list
  let anomalies = [];
  if (anomaliesArith.length > 0) {
    anomalies.push({
      titre: 'Écarts arithmétiques détectés',
      constat: `${anomaliesArith.length} ligne(s) présente(nt) un écart de calcul (Qté × PU ≠ Montant).`,
      risque: 'Surfacturation ou incohérence dans le contrat.',
      action: 'Exiger un devis corrigé arithmétiquement parfait avant signature.'
    });
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
      constat: `Le total HT indiqué en pied de page (${fmtCfa(totalHTIndiqueDevis)}) ne correspond pas à la somme exacte des lignes recalculées (${fmtCfa(totalHTCalcule)}). Écart: ${fmtCfa(ecartGlobalHT)}.`,
      risque: 'Le montant final réclamé est faux. Litige garanti lors du paiement.',
      action: 'Faire corriger le Total HT et le TTC sur le devis officiel.'
    });
  }
  if (!data.identification?.ninea || !data.identification?.rccm) {
    anomalies.push({
      titre: 'Identification Légale Incomplète',
      constat: 'Le NINEA et/ou RCCM de l\'entreprise sont manquants.',
      risque: 'Entreprise potentiellement informelle. Aucun recours juridique en cas d\'abandon de chantier.',
      action: 'Exiger la copie du RCCM et NINEA et vérifier leur validité.'
    });
  }

  // Conditions
  let clausesManquantes = [];
  const cAcompte = data.devis?.conditions?.acompteType === 'percent' ? data.devis.conditions.acompte : (data.devis?.conditions?.acompte / totalTTCCalc * 100);
  if (cAcompte > 30) {
    anomalies.push({
      titre: 'Acompte abusif (>30%)',
      constat: `L'acompte demandé est supérieur aux 30% recommandés.`,
      risque: 'Risque financier majeur en cas de disparition de l\'entrepreneur.',
      action: 'Négocier un acompte à la signature de 20% ou 30% maximum.'
    });
  }
  if (!data.devis?.conditions?.retenueGarantie) {
    anomalies.push({
      titre: 'Clause absente : Retenue de garantie',
      constat: 'Aucune retenue de garantie (ex: 5%) n\'est stipulée sur les paiements.',
      risque: 'L\'entreprise n\'a aucune incitation financière à lever les réserves de fin de chantier.',
      action: 'Ajouter une mention "Retenue de garantie de 5% payable 1 an après réception".'
    });
  }
  if (!data.devis?.conditions?.penalites) {
    anomalies.push({
      titre: 'Clause absente : Pénalités de retard',
      constat: 'Pas de pénalités de retard définies.',
      risque: 'Le chantier peut s\'éterniser sans aucune pénalité pour l\'entreprise.',
      action: 'Ajouter des pénalités (ex: 1/1000 du montant du marché par jour de retard).'
    });
  }
  if (!data.devis?.conditions?.assurances) {
    anomalies.push({
      titre: 'Clause absente : Assurances',
      constat: 'Aucune mention d\'assurance RC pro ou décennale.',
      risque: 'En cas de sinistre ou d\'effondrement, vous paierez de votre poche.',
      action: 'Exiger l\'attestation d\'assurance Responsabilité Civile et Décennale.'
    });
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
      page.drawText("Document généré automatiquement à titre indicatif - ChantierSur.com", { x: 40, y: 25, size: 7, font: regularFont, color: COLOR_SLATE });
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
    currentPage.drawText('II. VÉRIFICATION LIGNE PAR LIGNE (TOUTES LES LIGNES)', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    const colX = [40, 110, 260, 290, 330, 390, 450, 510];
    const headers = ['Lot', 'Désignation', 'Qté', 'Unité', 'PU HT', 'Indiqué', 'Recalculé', 'Écart'];
    headers.forEach((h, i) => currentPage.drawText(h, { x: colX[i], y: currentY, size: 7, font: boldFont }));
    currentY -= 5;
    currentPage.drawLine({start: {x: 40, y: currentY}, end: {x: 550, y: currentY}, thickness: 1, color: COLOR_NAVY});
    currentY -= 10;

    data.devis.lignes.forEach((l) => {
      checkPageBreak(25);
      let lotLines = wrapText(l.lot || '', 65, regularFont, 7);
      let desLines = wrapText(l.designation || '', 145, regularFont, 7);
      let maxLines = Math.max(lotLines.length, desLines.length);
      
      lotLines.forEach((t, i) => currentPage.drawText(t, { x: colX[0], y: currentY - (i*10), size: 7, font: regularFont }));
      desLines.forEach((t, i) => currentPage.drawText(t, { x: colX[1], y: currentY - (i*10), size: 7, font: regularFont }));
      
      currentPage.drawText(String(l.quantite||0), { x: colX[2], y: currentY, size: 7, font: regularFont });
      currentPage.drawText(String(l.unite||'').substring(0, 5), { x: colX[3], y: currentY, size: 7, font: regularFont });
      
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

    checkPageBreak(50);
    currentPage.drawText('IV. DÉTAIL DES ANOMALIES & PLAN D\'ACTION', { x: 40, y: currentY, size: 10, font: boldFont });
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

    checkPageBreak(80);
    currentPage.drawText('V. MÉTHODOLOGIE & LIMITES', { x: 40, y: currentY, size: 10, font: boldFont });
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
    currentY -= 15;

    checkPageBreak(120);
    let hasBloquant = (Math.abs(ecartGlobalHT) > 100) || (cAcompte > 30);
    let hasMajeur = anomaliesArith.length > 0 || anomalies.length > 2;

    let verdictText = "🟢 CONFORME";
    let verdictColor = COLOR_GREEN;
    let verdictJustif = "Toutes les vérifications arithmétiques et contractuelles sont correctes.";

    if (hasBloquant) {
        verdictText = "🔴 NE PAS SIGNER EN L'ÉTAT";
        verdictColor = COLOR_RED;
        verdictJustif = "Des écarts bloquants ou des risques financiers graves (acompte excessif) sont présents.";
    } else if (hasMajeur) {
        verdictText = "🟡 À CLARIFIER";
        verdictColor = COLOR_AMBER;
        verdictJustif = "Le devis comporte plusieurs anomalies ou lacunes (forfaits, clauses manquantes) à corriger avant signature.";
    }

    currentPage.drawRectangle({ x: 40, y: currentY - 50, width: width - 80, height: 60, color: rgb(0.98,0.98,0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText('VI. VERDICT FINAL', { x: 50, y: currentY - 15, size: 9, font: boldFont });
    currentPage.drawText(verdictText, { x: 50, y: currentY - 30, size: 14, font: boldFont, color: verdictColor });
    currentPage.drawText('Justification: ' + verdictJustif, { x: 50, y: currentY - 45, size: 9, font: regularFont });

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
