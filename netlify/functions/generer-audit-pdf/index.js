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
      body: JSON.stringify({ error: "Aucune ligne validée — retournez à l'écran de validation." })
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

    const COLOR_NAVY = rgb(11/255, 19/255, 37/255);
    const COLOR_AMBER = rgb(245/255, 158/255, 11/255);
    const COLOR_SLATE = rgb(148/255, 163/255, 184/255);

    const drawHeader = (page, y, pageIndex) => {
      // Fond Navy
      page.drawRectangle({ x: 0, y: height - 70, width: width, height: 70, color: COLOR_NAVY });
      // Ligne Amber
      page.drawRectangle({ x: 0, y: height - 73, width: width, height: 3, color: COLOR_AMBER });
      
      const clientName = data.client.nom || "Maître d'Ouvrage";
      const clientPhone = data.client.telephone || "";
      const refDoc = data.dossier || "N/A";
      const dateStr = data.devis.date || new Date().toLocaleDateString('fr-FR');

      // Textes
      page.drawText('ChantierSur.com', { x: 40, y: height - 30, size: 16, font: boldFont, color: rgb(1, 1, 1) });
      page.drawText("BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT", { x: 40, y: height - 42, size: 8, font: regularFont, color: COLOR_SLATE });
      
      page.drawText('AUDIT TECHNIQUE ET CONFORMITÉ DEVIS', { x: width - 280, y: height - 30, size: 10, font: boldFont, color: rgb(1, 1, 1) });
      
      let partText = '';
      if (pageIndex === 0) partText = "Partie 1 & 2 - Identification et Vérifications";
      else if (pageIndex === 1) partText = "Partie 3 - Analyse et décision";
      else partText = "Partie 4 - Synthèse";

      page.drawText(partText, { x: width - 280, y: height - 42, size: 9, font: regularFont, color: COLOR_AMBER });

      // Cartouche dossier
      page.drawRectangle({ x: width - 280, y: height - 60, width: 240, height: 12, color: rgb(1,1,1), opacity: 0.1 });
      page.drawText(`Réf: ${refDoc} | Date: ${dateStr} | Client: ${clientName}`, { x: width - 275, y: height - 56, size: 7, font: regularFont, color: rgb(1,1,1) });

      return height - 100;
    };

    const drawFooter = (page, pageIndex) => {
      // Ligne grise au-dessus du footer
      page.drawRectangle({ x: 40, y: 35, width: width - 80, height: 1, color: rgb(0.9, 0.9, 0.9) });
      page.drawText("ChantierSur.com — Bureau d'études Numérique Indépendant — Dakar, République du Sénégal.", { x: 40, y: 25, size: 7, font: regularFont, color: COLOR_SLATE });
      page.drawText("Document généré automatiquement à titre indicatif — ChantierSur.com — Bureau d'études numérique indépendant.", { x: 40, y: 15, size: 7, font: regularFont, color: COLOR_SLATE });
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

    // Cartouche nominatif
    currentPage.drawRectangle({ x: 40, y: currentY - 50, width: width - 80, height: 40, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.8, 0.84, 0.88), borderWidth: 1 });
    currentPage.drawText("IDENTIFICATION NOMINATIVE DU MAÎTRE D'OUVRAGE & DU PROJET", { x: 50, y: currentY - 22, size: 9, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Maître d'Ouvrage : ${data.client.nom || ''}`, { x: 50, y: currentY - 35, size: 8, font: regularFont, color: rgb(0.2, 0.25, 0.33) });
    currentPage.drawText(`Téléphone : ${data.client.telephone || ''}`, { x: 50, y: currentY - 45, size: 8, font: regularFont, color: rgb(0.2, 0.25, 0.33) });
    
    currentY -= 70;

    // Partie 1
    currentPage.drawText('Partie 1 — Identification', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('I. Devis analysé', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    currentPage.drawText('Objet: ' + data.devis.objet, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 20;
    currentPage.drawText('II. Entreprise & existence légale', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    let nineaText = 'Non fourni';
    if (data.devis.entreprise.ninea) {
      nineaText = 'Identifiant déclaré dans les données reçues — authenticité non vérifiée';
    } else {
      nineaText = "l'identifiant n'a pas été fourni";
    }
    currentPage.drawText('NINEA/RCCM: ' + nineaText, { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 30;

    // Partie 2
    checkPageBreak(50);
    currentPage.drawText('Partie 2 — Vérifications', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('III. Vérification arithmétique ligne par ligne', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;

    // Tableau Lignes
    const colX = [40, 100, 250, 280, 320, 380, 450, 520];
    const headers = ['Lot', 'Désignation', 'Qté', 'Unité', 'PU HT', 'Indiqué', 'Recalculé', 'Écart'];
    
    headers.forEach((h, i) => {
      currentPage.drawText(h, { x: colX[i], y: currentY, size: 7, font: boldFont });
    });
    currentY -= 5;
    currentPage.drawLine({start: {x: 40, y: currentY}, end: {x: 550, y: currentY}, thickness: 1, color: COLOR_NAVY});
    currentY -= 10;

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
        const f = i === 7 ? boldFont : regularFont;
        const c = i === 7 ? COLOR_NAVY : rgb(0,0,0);
        currentPage.drawText(txt, { x: colX[i], y: currentY, size: 7, font: f, color: c });
      });
      currentY -= 12;
    });
    
    currentY -= 15;
    checkPageBreak(40);
    currentPage.drawText('IV. Cohérence des totaux', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    const tvaCalc = totalHTCalcule * (data.devis.tvaTaux / 100);
    const totalTTC = totalHTCalcule + tvaCalc;
    const ecartHT = (data.devis.totalHTIndique || 0) - totalHTCalcule;
    
    currentPage.drawText('Total HT Indiqué: ' + (data.devis.totalHTIndique||0) + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total HT Recalculé: ' + totalHTCalcule + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Écart HT: ' + ecartHT + ' FCFA', { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 20;

    // Partie 3
    checkPageBreak(60);
    currentPage.drawText('Partie 3 — Analyse et décision', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('V. Écarts détectés', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;

    if (ecarts.length === 0 && ecartHT === 0) {
      currentPage.drawText('Les montants indiqués sont arithmétiquement cohérents avec les quantités et PU transmis.', { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 15;
    } else {
      ecarts.forEach(e => {
        checkPageBreak(25); // Augmenté pour l'espacement
        currentPage.drawText('• Ligne: ' + e.l.designation, { x: 50, y: currentY, size: 9, font: boldFont, color: rgb(0.86, 0.15, 0.15) });
        currentY -= 12;
        currentPage.drawText('  Calcul: ' + e.l.quantite + ' x ' + e.l.pu + ' = ' + e.mCalc + ' | Écart: ' + e.ec + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
        currentY -= 18; // Plus d'espace entre chaque écart
      });
      if (ecartHT !== 0) {
        checkPageBreak(25);
        currentPage.drawText('• Total HT', { x: 50, y: currentY, size: 9, font: boldFont, color: rgb(0.86, 0.15, 0.15) });
        currentY -= 12;
        currentPage.drawText('  Indiqué: ' + data.devis.totalHTIndique + ' | Recalculé: ' + totalHTCalcule + ' | Écart: ' + ecartHT, { x: 50, y: currentY, size: 9, font: regularFont });
        currentY -= 18;
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
        txt = 'Non précisé (à faire préciser par écrit avant signature)';
        hasMissingClauses = true;
      }
      checkPageBreak(15);
      currentPage.drawText(k + ': ' + txt, { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    });

    currentY -= 10;
    checkPageBreak(40);
    currentPage.drawText('VII. Mesures à prendre & Recommandations', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    
    if (ecarts.length > 0 || ecartHT !== 0) {
      currentPage.drawText('- Demander une correction écrite du devis concernant les écarts arithmétiques.', { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    }
    if (hasMissingClauses) {
      currentPage.drawText('- Demander de préciser par écrit les clauses contractuelles manquantes.', { x: 50, y: currentY, size: 9, font: regularFont });
      currentY -= 12;
    }
    
    if (ecarts.length > 0 || ecartHT !== 0 || hasMissingClauses) {
      currentPage.drawText('Recommandation: Demander une version corrigée et complétée du devis avant signature.', { x: 50, y: currentY, size: 9, font: boldFont });
      currentY -= 15;
    } else {
      currentPage.drawText('Recommandation: Conditions arithmétiques cohérentes. Signature possible sous réserve de validation technique.', { x: 50, y: currentY, size: 9, font: boldFont });
      currentY -= 15;
    }

    // Partie 4
    currentY -= 10;
    checkPageBreak(60);
    currentPage.drawText('Partie 4 — Synthèse', { x: 40, y: currentY, size: 12, font: boldFont });
    currentY -= 20;
    currentPage.drawText('VIII. Synthèse financière', { x: 40, y: currentY, size: 10, font: boldFont });
    currentY -= 15;
    currentPage.drawText('Total HT Recalculé : ' + totalHTCalcule + ' FCFA', { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 12;
    currentPage.drawText('TVA (' + data.devis.tvaTaux + '%) : ' + tvaCalc + ' FCFA', { x: 50, y: currentY, size: 9, font: regularFont });
    currentY -= 12;
    currentPage.drawText('Total TTC Recalculé : ' + totalTTC + ' FCFA', { x: 50, y: currentY, size: 9, font: boldFont });
    currentY -= 30;

    checkPageBreak(40);
    currentPage.drawText('Mentions obligatoires:', { x: 40, y: currentY, size: 8, font: boldFont });
    currentY -= 12;
    currentPage.drawText("Outil d'aide à la décision. Analyse automatisée indicative — sans valeur d'expertise judiciaire.", { x: 40, y: currentY, size: 7, font: regularFont });
    currentY -= 10;
    currentPage.drawText('Document produit sans certification.', { x: 40, y: currentY, size: 7, font: regularFont });

    // Rendu des footers restants
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
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Generation failed: ' + err.message })
    };
  }
};
