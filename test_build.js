const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkitModule = require('@pdf-lib/fontkit');
const fontkit = fontkitModule.default || fontkitModule;

function findFile(filename) {
  const paths = [
    path.join(__dirname, filename),
    path.join(process.cwd(), 'netlify/functions/generer-audit-pdf', filename),
    path.join('/var/task/netlify/functions/generer-audit-pdf', filename)
  ];
  for (let p of paths) {
    if (fs.existsSync(p)) return p;
  }
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
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Données AUDIT invalides.' }) };
  }

  if (!data || !data.devis || !data.devis.lignes || !Array.isArray(data.devis.lignes) || data.devis.lignes.length === 0) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Aucune ligne validée.' }) };
  }

  try {
    const regularBytes = fs.readFileSync(findFile('DejaVuSans.ttf'));
    const boldBytes = fs.readFileSync(findFile('DejaVuSans-Bold.ttf'));

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const regularFont = await pdfDoc.embedFont(regularBytes);
    const boldFont = await pdfDoc.embedFont(boldBytes);

    let currentPage = pdfDoc.addPage([595, 842]);
    currentPage.drawText('ChantierSur.com | Dossier : ' + (data.dossier||''), { x: 40, y: 800, size: 9, font: regularFont });
    currentPage.drawText('Total Lignes : ' + data.devis.lignes.length, { x: 40, y: 780, size: 9, font: regularFont });
    
    // Quick debug PDF if logic was too heavy and crashing
    let currentY = 750;
    data.devis.lignes.forEach((l, i) => {
       if (currentY < 50) { currentPage = pdfDoc.addPage([595, 842]); currentY = 800; }
       currentPage.drawText(l.designation.substring(0,50) + ' | ' + l.montantIndique, { x: 40, y: currentY, size: 9, font: regularFont });
       currentY -= 12;
    });

    const pdfBytes = await pdfDoc.save();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=\"ChantierSur_AUDIT.pdf\"'
      },
      body: Buffer.from(pdfBytes).toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  }
};
