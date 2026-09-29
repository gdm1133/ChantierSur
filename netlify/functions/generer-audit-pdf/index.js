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
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

function fmtCfa(num) {
  if (typeof num !== 'number' || isNaN(num)) num = 0;
  return Math.round(num).toLocaleString('fr-FR').replace(/\s/g, '\u00A0') + ' FCFA';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Allow': 'POST' }, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Données AUDIT invalides.' })
    };
  }

  if (!data || !data.devis || !data.devis.lignes || !Array.isArray(data.devis.lignes) || data.devis.lignes.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: "Aucune ligne validée — retournez à l'écran de validation." })
    };
  }

  let totalHTCalcule = 0;
  let ecarts = [];
  let forfaits = [];

  data.devis.lignes.forEach((l, i) => {
    let qte = typeof l.quantite === 'number' && isFinite(l.quantite) ? l.quantite : 0;
    let pu = typeof l.pu === 'number' && isFinite(l.pu) ? l.pu : 0;
    let mIndique = typeof l.montantIndique === 'number' && isFinite(l.montantIndique) ? l.montantIndique : 0;

    let isForfait = (pu === 0 && mIndique > 0) || String(l.unite).toLowerCase().includes('forf');
    let calc = 0;

    if (isForfait) {
      calc = mIndique;
      forfaits.push({ l, calc });
    } else {
      calc = Math.round(qte * pu);
      const ec = Math.round(mIndique - calc);
      if (Math.abs(ec) > 5) {
        ecarts.push({ l, mCalc: calc, ec });
      }
    }
    totalHTCalcule += calc;
  });

  const totalHTIndique = data.totaux?.htIndique || data.devis.totalHTIndique || 0;
  const ecartGlobalHT = Math.round(totalHTIndique - totalHTCalcule);

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

    const drawHeader = (page, y, pageIndex) => {
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });
      page.drawRectangle({ x: 0, y: height - 73, width: width, height: 3, color: COLOR_AMBER });
      
      const clientName = data.client?.nom || "Maître d'Ouvrage";
      const refDoc = data.dossier || "N/A";
      const dateStr = data.devis?.date || new Date().toLocaleDateString('fr-FR');

      page.drawText('ChantierSur.com', { x: 40, y: height - 30, size: 16, font: boldFont, color: rgb(1, 1, 1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 40, y: height - 42, size: 8, font: regularFont, color: COLOR_SLATE });
      
      page.drawText('AUDIT TECHNIQUE ET CONFORMITÉ DEVIS', { x: width - 280, y: height - 30, size: 10, font: boldFont, color: rgb(1, 1, 1) });
      
      let partText = '';
      if (pageIndex === 0) partText = "Partie 1 & 2 - Identification et Vérifications";
      else if (pageIndex === 1) partText = "Partie 3 - Analyse et décision";
      else partText = "Partie 4 - Synthèse";

      page.drawText(partText, { x: width - 280, y: height - 42, size: 9, font: regularFont, color: COLOR_AMBER });

      page.drawRectangle({ x: width - 280, y: height - 60, width: 240, height: 12, color: rgb(1,1,1), opacity: 0.1 });
      page.drawText(`Réf: ${refDoc} | Date: ${dateStr} | Client: ${clientName.substring(0,20)}`, { x: width - 275, y: height - 56, size: 7, font: regularFont, color: rgb(1,1,1) });

      return height - 100;
    };

    const drawFooter = (page, pageIndex) => {
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 1, color: rgb(0.9, 0.9, 0.9) });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — Dakar, République du Sénégal.", { x: 40, y: 25, size: 7, font: regularFont, color: COLOR_SLATE });
      page.drawText("Outil automatisé d'aide à la décision — sans certification.", { x: 40, y: 15, size: 7, font: regularFont, color: COLOR_SLATE });
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

    // Partie 1
    currentPage.drawText('Partie 1 — Identification', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    
    // I. Devis analysé
    currentPage.drawText('I. Devis analysé', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    const objText = data.identification?.objetDevis || data.devis?.objet || 'Non fourni';
    currentPage.drawText('Objet du devis: ' + objText, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Type de projet: ' + (data.devis?.batiment || 'Non fourni'), { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 20;

    // II. Entreprise
    currentPage.drawText('II. Entreprise & existence légale', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    const entNom = data.identification?.entrepriseNom || 'Non fourni';
    const ninea = data.identification?.ninea || 'Non fourni';
    const rccm = data.identification?.rccm || 'Non fourni';
    
    currentPage.drawText(`Nom de l'entreprise: ${entNom}`, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText(`NINEA: ${ninea} | RCCM: ${rccm}`, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 25;

    // Partie 2
    checkPageBreak(50);
    currentPage.drawText('Partie 2 — Vérifications', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    
    // III. Forfaits
    if (forfaits.length > 0) {
      checkPageBreak(50);
      currentPage.drawText('III. Montants forfaitaires', { x: 40, y: currentY, size: 10, font: boldFont });
      currentY -= 12;
      currentPage.drawText('(Contrôle arithmétique impossible, à faire détailler par écrit)', { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_AMBER });
      currentY -= 15;

      const cF = [40, 100, 380, 480];
      const hF = ['Lot', 'Désignation', 'PU', 'Montant Indiqué'];
      hF.forEach((h, i) => currentPage.drawText(h, { x: cF[i], y: currentY, size: 7, font: boldFont }));
      currentY -= 5;
      currentPage.drawLine({start: {x: 40, y: currentY}, end: {x: 550, y: currentY}, thickness: 1, color: COLOR_NAVY});
      currentY -= 10;

      forfaits.forEach(f => {
        checkPageBreak(20);
        let lotLines = wrapText(f.l.lot || '', 55, regularFont, 7);
        let desLines = wrapText(f.l.designation || '', 270, regularFont, 7);
        let maxLines = Math.max(lotLines.length, desLines.length);
        
        lotLines.forEach((t, i) => currentPage.drawText(t, { x: cF[0], y: currentY - (i*10), size: 7, font: regularFont }));
        desLines.forEach((t, i) => currentPage.drawText(t, { x: cF[1], y: currentY - (i*10), size: 7, font: regularFont }));
        currentPage.drawText(fmtCfa(f.l.pu || 0), { x: cF[2], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(f.l.montantIndique || 0), { x: cF[3], y: currentY, size: 7, font: regularFont });
        
        currentY -= (maxLines * 10) + 5;
      });
      currentY -= 15;
    }

    // IV. Ecarts
    checkPageBreak(60);
    currentPage.drawText((forfaits.length > 0 ? 'IV' : 'III') + '. Vérification arithmétique ligne par ligne (Écarts)', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;

    if (ecarts.length === 0) {
      currentPage.drawText('Aucun écart arithmétique détecté sur les lignes détaillées.', { x: 50, y: currentY, size: 9, font: regularFont, color: COLOR_GREEN });
      currentY -= 20;
    } else {
      const colX = [40, 100, 250, 280, 320, 380, 450, 500];
      const headers = ['Lot', 'Désignation', 'Qté', 'Unité', 'PU HT', 'Indiqué', 'Recalculé', 'Écart'];
      
      headers.forEach((h, i) => {
        currentPage.drawText(h, { x: colX[i], y: currentY, size: 7, font: boldFont });
      });
      currentY -= 5;
      currentPage.drawLine({start: {x: 40, y: currentY}, end: {x: 550, y: currentY}, thickness: 1, color: COLOR_NAVY});
      currentY -= 10;

      ecarts.forEach(e => {
        checkPageBreak(25);
        let lotLines = wrapText(e.l.lot || '', 55, regularFont, 7);
        let desLines = wrapText(e.l.designation || '', 140, regularFont, 7);
        let maxLines = Math.max(lotLines.length, desLines.length);
        
        lotLines.forEach((t, i) => currentPage.drawText(t, { x: colX[0], y: currentY - (i*10), size: 7, font: regularFont }));
        desLines.forEach((t, i) => currentPage.drawText(t, { x: colX[1], y: currentY - (i*10), size: 7, font: regularFont }));
        currentPage.drawText(String(e.l.quantite||0), { x: colX[2], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(String(e.l.unite||'').substring(0, 5), { x: colX[3], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(e.l.pu||0).replace(' FCFA',''), { x: colX[4], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(e.l.montantIndique||0).replace(' FCFA',''), { x: colX[5], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(e.mCalc).replace(' FCFA',''), { x: colX[6], y: currentY, size: 7, font: regularFont });
        currentPage.drawText(fmtCfa(e.ec).replace(' FCFA',''), { x: colX[7], y: currentY, size: 7, font: boldFont, color: COLOR_RED });
        
        currentY -= (maxLines * 10) + 5;
      });
      currentY -= 15;
    }

    // V. Cohérence des totaux
    checkPageBreak(50);
    currentPage.drawText((forfaits.length > 0 ? 'V' : 'IV') + '. Cohérence globale des totaux', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    currentPage.drawText('Total HT Indiqué sur devis: ' + fmtCfa(totalHTIndique), { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total HT Recalculé (y compris forfaits): ' + fmtCfa(totalHTCalcule), { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    const cEcart = Math.abs(ecartGlobalHT) > 5 ? COLOR_RED : COLOR_GREEN;
    currentPage.drawText('Écart HT Global: ' + fmtCfa(ecartGlobalHT), { x: 50, y: currentY, size: 9, font: boldFont, color: cEcart });
    currentY -= 20;

    // Conditions Contractuelles
    checkPageBreak(80);
    currentPage.drawText((forfaits.length > 0 ? 'VI' : 'V') + '. Clauses contractuelles', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    let hasMissingClauses = false;
    let acompteStr = 'Non précisé';
    if (data.devis?.conditions?.acompte) {
        if (data.devis.conditions.acompteType === 'fcfa') {
            acompteStr = fmtCfa(data.devis.conditions.acompte);
        } else {
            acompteStr = data.devis.conditions.acompte + ' %';
        }
    }
    const conds = [
      { label: 'Acompte', val: acompteStr },
      { label: 'Échéancier', val: data.devis?.conditions?.echeancier },
      { label: 'Retenue', val: data.devis?.conditions?.retenueGarantie ? data.devis.conditions.retenueGarantie + '%' : null },
      { label: 'Pénalités', val: data.devis?.conditions?.penalites },
      { label: 'Assurances', val: data.devis?.conditions?.assurances }
    ];

    conds.forEach(c => {
      let txt = c.val;
      let clr = COLOR_SLATE;
      if (!txt || txt === '' || txt === 'Non précisé') {
        txt = 'Non précisé (à faire préciser par écrit avant signature)';
        hasMissingClauses = true;
        clr = COLOR_AMBER;
      }
      checkPageBreak(15);
      currentPage.drawText(c.label + ': ' + txt, { x: 50, y: currentY, size: 9, font: regularFont, color: clr });
      currentY -= 12;
    });
    currentY -= 10;

    // Partie 3
    checkPageBreak(100);
    currentPage.drawText('Partie 3 — Verdict et plan d\'action', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 25;

    // Détermination du verdict
    let hasBloquant = (Math.abs(ecartGlobalHT) > 100000) || (data.devis?.conditions?.acompteType === 'percent' && data.devis?.conditions?.acompte > 30);
    let hasMajeur = ecarts.length > 0 || hasMissingClauses || forfaits.length > 3 || (ninea === 'Non fourni' && rccm === 'Non fourni');

    let verdictText = "🟢 CONFORME";
    let verdictColor = COLOR_GREEN;
    let verdictDesc = "Aucune anomalie majeure détectée. Le devis peut être signé en l'état.";

    if (hasBloquant) {
        verdictText = "🔴 NE PAS SIGNER EN L'ÉTAT";
        verdictColor = COLOR_RED;
        verdictDesc = "Anomalies bloquantes (écart majeur ou acompte > 30%). Demandez une révision immédiate.";
    } else if (hasMajeur) {
        verdictText = "🟡 À CLARIFIER";
        verdictColor = COLOR_AMBER;
        verdictDesc = "Plusieurs points nécessitent une clarification ou correction écrite avant toute signature.";
    }

    currentPage.drawRectangle({ x: 40, y: currentY - 30, width: width - 80, height: 45, color: rgb(0.98,0.98,0.98), borderColor: verdictColor, borderWidth: 2 });
    currentPage.drawText(verdictText, { x: 50, y: currentY - 5, size: 14, font: boldFont, color: verdictColor });
    currentPage.drawText(verdictDesc, { x: 50, y: currentY - 20, size: 9, font: regularFont });
    currentY -= 50;

    // Rendu des footers
    pages.forEach((p, idx) => {
      drawFooter(p, idx);
    });

    const pdfBytes = await pdfDoc.save();
    const safeDossier = (data.dossier || 'inconnu').replace(/[^a-zA-Z0-9_-]/g, '');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ChantierSur_AUDIT_${safeDossier}.pdf"`,
        'Cache-Control': 'no-store'
      },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("PDF Gen Error:", err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Generation failed: ' + err.message })
    };
  }
};
