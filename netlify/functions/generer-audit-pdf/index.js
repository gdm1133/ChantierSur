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
      body: JSON.stringify({ error: 'DonnÃ©es AUDIT invalides.' })
    };
  }

  if (!data || !data.devis || !data.devis.lignes || !Array.isArray(data.devis.lignes) || data.devis.lignes.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: "Aucune ligne validÃ©e â€” retournez Ã  l'Ã©cran de validation." })
    };
  }

  let totalHTCalcule = 0;
  for (let i = 0; i < data.devis.lignes.length; i++) {
    const l = data.devis.lignes[i];
    if (!l.lot || !l.designation || typeof l.quantite !== 'number' || typeof l.pu !== 'number' || typeof l.montantIndique !== 'number' || !isFinite(l.quantite) || !isFinite(l.pu) || !isFinite(l.montantIndique) || l.quantite < 0 || l.pu < 0 || l.montantIndique < 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ error: `Ligne ${i} invalide.` })
      };
    }
    const calc = l.quantite * l.pu;
    totalHTCalcule += calc;
  }

  if (totalHTCalcule === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: "Aucune ligne validÃ©e â€” retournez Ã  l'Ã©cran de validation." })
    };
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

    const drawHeader = (page, y) => {
      page.drawText('ChantierSur.com | Dossier : ' + (data.dossier||'') + ' | Date : ' + (data.devis.date||''), { x: 40, y: y, size: 9, font: regularFont, color: rgb(0.5, 0.5, 0.5) });
      page.drawText('BUREAU D\'Ã‰TUDES NUMÃ‰RIQUE INDÃ‰PENDANT â€” AUDIT TECHNIQUE BTP SÃ‰NÃ‰GAL', { x: 40, y: y - 12, size: 8, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
      page.drawText('RAPPORT D\'AUDIT DE DEVIS', { x: 40, y: y - 35, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      return y - 60;
    };

    const drawFooter = (page) => {
      page.drawText('DOCUMENT TECHNIQUE NOMINATIF & CONFIDENTIEL â€” MAÃŽTRE D\'OUVRAGE : ' + (data.client.nom||''), { x: 40, y: height - 15, size: 7, font: boldFont, color: rgb(0.7, 0.2, 0.2) });
    };

    const checkPageBreak = (requiredSpace) => {
      if (currentY - requiredSpace < 40) {
        currentPage = pdfDoc.addPage([595, 842]);
        pages.push(currentPage);
        currentY = height - 40;
        drawFooter(currentPage);
        return true;
      }
      return false;
    };

    drawFooter(currentPage);
    currentY = drawHeader(currentPage, currentY);

    // Partie 1
    currentPage.drawText('Partie 1 â€” Identification', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('I. Devis analysÃ©', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    currentPage.drawText('Objet: ' + data.devis.objet, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 20;
    currentPage.drawText('II. Entreprise & existence lÃ©gale', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    let nineaText = 'Non fourni';
    if (data.devis.entreprise.ninea) {
      nineaText = 'Identifiant dÃ©clarÃ© dans les donnÃ©es reÃ§ues â€” authenticitÃ© non vÃ©rifiÃ©e';
    } else {
      nineaText = 'l\'identifiant n\'a pas Ã©tÃ© fourni';
    }
    currentPage.drawText('NINEA/RCCM: ' + nineaText, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 30;

    // Partie 2
    checkPageBreak(50);
    currentPage.drawText('Partie 2 â€” VÃ©rifications', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('III. VÃ©rification arithmÃ©tique ligne par ligne', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;

    // Tableau Lignes
    const colX = [40, 100, 250, 280, 320, 380, 450, 520];
    const headers = ['Lot', 'DÃ©signation', 'QtÃ©', 'UnitÃ©', 'PU HT', 'Montant indiquÃ©', 'Montant recalculÃ©', 'Ã‰cart'];
    
    headers.forEach((h, i) => {
      currentPage.drawText(h, { x: colX[i], y: currentY, size: 7, font: boldFont });
    });
    currentY -= 15;

    let ecarts = [];
    data.devis.lignes.forEach(l => {
      checkPageBreak(20);
      const mCalc = l.quantite * l.pu;
      const ec = l.montantIndique - mCalc;
      if (ec !== 0) ecarts.push({ l, mCalc, ec });

      const row = [
        l.lot.substring(0, 12),
        l.designation.substring(0, 25),
        l.quantite.toString(),
        l.unite.substring(0, 5),
        l.pu.toString(),
        l.montantIndique.toString(),
        mCalc.toString(),
        ec.toString()
      ];
      row.forEach((txt, i) => {
        currentPage.drawText(txt, { x: colX[i], y: currentY, size: 7, font: regularFont });
      });
      currentY -= 12;
    });
    
    currentY -= 15;
    checkPageBreak(40);
    currentPage.drawText('IV. CohÃ©rence des totaux', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    const tvaCalc = totalHTCalcule * (data.devis.tvaTaux / 100);
    const totalTTC = totalHTCalcule + tvaCalc;
    const ecartHT = (data.devis.totalHTIndique || 0) - totalHTCalcule;
    
    currentPage.drawText('Total HT IndiquÃ©: ' + (data.devis.totalHTIndique||0) + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total HT RecalculÃ©: ' + totalHTCalcule + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Ã‰cart HT: ' + ecartHT + ' FCFA', { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 20;

    // Partie 3
    checkPageBreak(60);
    currentPage.drawText('Partie 3 â€” Analyse et dÃ©cision', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('V. Ã‰carts dÃ©tectÃ©s', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;

    if (ecarts.length === 0 && ecartHT === 0) {
      currentPage.drawText('les montants indiquÃ©s sont arithmÃ©tiquement cohÃ©rents avec les quantitÃ©s et PU transmis', { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 15;
    } else {
      ecarts.forEach(e => {
        checkPageBreak(20);
        currentPage.drawText('Ligne: ' + e.l.designation + ' | Calcul: ' + e.l.quantite + ' x ' + e.l.pu + ' = ' + e.mCalc + ' | Ã‰cart: ' + e.ec + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
        currentY -= 12;
      });
      if (ecartHT !== 0) {
        checkPageBreak(20);
        currentPage.drawText('Total HT | IndiquÃ©: ' + data.devis.totalHTIndique + ' | RecalculÃ©: ' + totalHTCalcule + ' | Ã‰cart: ' + ecartHT, { x: 50, y: currentY, size: 9, font: boldFont });
        currentY -= 15;
      }
    }

    currentY -= 10;
    checkPageBreak(40);
    currentPage.drawText('VI. Clauses contractuelles', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    let hasMissingClauses = false;
    ['acompte', 'echeancier', 'retenueGarantie', 'penalites', 'avenants', 'assurances', 'validite', 'delai'].forEach(k => {
      const v = data.devis.conditions[k];
      let txt = v;
      if (!v || v === '') {
        txt = 'Non prÃ©cisÃ© (Ã  faire prÃ©ciser par Ã©crit avant signature)';
        hasMissingClauses = true;
      }
      checkPageBreak(15);
      currentPage.drawText(k + ': ' + txt, { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    });

    currentY -= 10;
    checkPageBreak(40);
    currentPage.drawText('VII. Mesures Ã  prendre & Recommandations', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    if (ecarts.length > 0 || ecartHT !== 0) {
      currentPage.drawText('- Demander une correction Ã©crite du devis concernant les Ã©carts arithmÃ©tiques.', { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    }
    if (hasMissingClauses) {
      currentPage.drawText('- Demander de prÃ©ciser par Ã©crit les clauses contractuelles manquantes.', { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    }
    
    if (ecarts.length > 0 || ecartHT !== 0 || hasMissingClauses) {
      currentPage.drawText('Recommandation: Demander une version corrigÃ©e et complÃ©tÃ©e du devis avant signature', { x: 50, y: currentY, size: 9, font: boldFont });
      currentY -= 15;
    } else {
      currentPage.drawText('Recommandation: Conditions arithmÃ©tiques cohÃ©rentes. Signature possible sous rÃ©serve de validation technique.', { x: 50, y: currentY, size: 9, font: boldFont });
      currentY -= 15;
    }

    // Partie 4
    currentY -= 10;
    checkPageBreak(50);
    currentPage.drawText('Partie 4 â€” SynthÃ¨se', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('VIII. SynthÃ¨se financiÃ¨re', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    currentPage.drawText('Total HT RecalculÃ© : ' + totalHTCalcule + ' FCFA', { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 12;
    currentPage.drawText('TVA (' + data.devis.tvaTaux + '%) : ' + tvaCalc + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total TTC RecalculÃ© : ' + totalTTC + ' FCFA', { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 30;

    checkPageBreak(40);
    currentPage.drawText('Mentions obligatoires:', { x: 40, y: currentY, size: 8, font: boldFont });
    currentY -= 12;
    currentPage.drawText('Outil d\'aide Ã  la dÃ©cision. Analyse automatisÃ©e indicative â€” sans valeur d\'expertise judiciaire.', { x: 40, y: currentY, size: 7, font: regularFont });
    currentY -= 10;
    currentPage.drawText('Document produit sans certification.', { x: 40, y: currentY, size: 7, font: regularFont });

    // Pagination
    const totalPages = pages.length;
    pages.forEach((p, idx) => {
      p.drawText('ChantierSur.com â€” Bureau d\'Ã©tudes numÃ©rique indÃ©pendant, Dakar, RÃ©publique du SÃ©nÃ©gal. Page ' + (idx + 1) + ' sur ' + totalPages, {
        x: 40, y: 20, size: 7, font: regularFont
      });
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Font loading failed: ' + err.message })
    };
  }
};


