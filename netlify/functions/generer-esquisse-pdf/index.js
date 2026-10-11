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
    || data.identification?.nom
    || 'Maître d\'ouvrage';
  const location = data.project_location || data.client_city || data.location || 'Sénégal';

  if (!surface || surface <= 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Rapport d'esquisse impossible : la surface du terrain ou du projet doit être renseignée." })
    };
  }

  const levels = parseInt(data.exact_levels || data.niveaux || data.levels || 1, 10);
  const typology = data.project_typology || 'Villa individuelle / Immeuble résidentiel';
  const pricePaid = getEsquissePrice(surface);
  const refStr = data.dossier || data.reference || ('CS-ESQ-' + Date.now());
  const auditDate = new Date().toLocaleDateString('fr-FR');

  // Surface de plancher estimative (SDP)
  const estimatedSDP = Math.round(surface * (levels >= 1 ? 0.75 * (levels + 1) : 0.65));

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

    currentY = drawHeader(currentPage, currentY, 0);

    // ==========================================
    // 0. FICHE SYNTHÈSE DU PROJET
    // ==========================================
    const ficheHeight = 110;
    currentPage.drawRectangle({ x: 40, y: currentY - ficheHeight, width: width - 80, height: ficheHeight, color: rgb(0.98,0.98,0.98), borderColor: COLOR_NAVY, borderWidth: 1.5 });
    currentPage.drawText('0. FICHE SYNTHÉTIQUE DE L\'ÉTUDE D\'ESQUISSE', { x: 50, y: currentY - 18, size: 9.5, font: boldFont, color: COLOR_NAVY });

    currentPage.drawText(`Réf. Dossier : ${refStr}   |   Date : ${auditDate}   |   Montant prestation : ${typeof pricePaid === 'number' ? fmtCfa(pricePaid) : pricePaid}`, { x: 50, y: currentY - 35, size: 8, font: regularFont });
    currentPage.drawText(`Maître d'ouvrage : ${clientNom}   |   Localisation : ${location}`, { x: 50, y: currentY - 50, size: 8.5, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Typologie de construction : ${typology}`, { x: 50, y: currentY - 65, size: 8, font: regularFont });
    currentPage.drawText(`Superficie de la parcelle : ${surface} m²   |   Niveaux projetés : R+${levels}   |   SDP estimée : ~${estimatedSDP} m²`, { x: 50, y: currentY - 80, size: 8.5, font: boldFont, color: COLOR_NAVY });
    currentPage.drawText(`Origine de l'émission : 16 Route de Mont-Rolland, Thiès, Sénégal`, { x: 50, y: currentY - 95, size: 7.5, font: regularFont, color: COLOR_SLATE });

    currentY -= (ficheHeight + 20);

    // ==========================================
    // I. ANALYSE FONCIÈRE, URBANISME & DROITS À BÂTIR
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('I. ANALYSE FONCIÈRE, DROITS À BÂTIR & URBANISME SÉNÉGALAIS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const urbanText = [
      "Vérification du statut juridique foncier : Avant tout engagement, s'assurer de la nature exacte du titre (Titre Foncier définitif, Bail emphytéotique de l'État, Droit de superficie, ou Délibération d'attribution communale). Un état de droits réels délivré par la conservation foncière compétente est indispensable.",
      "Cadre juridique de référence : Loi n° 2021-22 du 2 mars 2021 (articles 28 et 31) régissant les règles fondamentales de la construction, la responsabilité des constructeurs et la régularité administrative des chantiers. Arrêt n° 28 de la Cour suprême du Sénégal du 18 avril 2018 consacrant l'obligation stricte de conformité contractuelle et la garantie des désordres.",
      "Règles de prospect et servitudes de mitoyenneté : Les retraits minimaux réglementaires s'établissent couramment à 3,00 m par rapport aux limites parcellaires mitoyennes et à l'alignement de la voie publique selon la hauteur de façade (Réglementations d'urbanisme applicables dans les zones d'aménagement concerté et plans directeurs locaux).",
      `Droits à bâtir sur la parcelle de ${surface} m² : Pour un gabarit R+${levels}, le Coefficient d'Occupation du Sol (COS) et le Coefficient d'Emprise au Sol (CES) prévisionnels doivent préserver un ratio d'espaces libres et de cours intérieures permettant un éclairage et une aération directs conformes aux normes d'hygiène et d'habitabilité.`
    ];

    urbanText.forEach(par => {
      wrapText(par, width - 85, regularFont, 7.5).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.5, font: regularFont });
        currentY -= 10;
      });
      currentY -= 4;
    });

    currentY -= 14;

    // ==========================================
    // II. GÉOTECHNIQUE, SOL & RECOMMANDATIONS FONDATIONS
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('II. GÉOTECHNIQUE, HYDROGÉOLOGIE & RECOMMANDATIONS DE FONDATIONS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const geotechText = [
      `Contexte hydrogéologique de la zone (${location}) : Selon la situation géographique (littoral, zone des Niayes, plateau ou cuvettes), la profondeur de la nappe phréatique varie fortement au cours de l'année (remontées observées en période hivernale).`,
      "Nature des sols rencontrés au Sénégal : Présence fréquente de sables côtiers fins à moyens, sables dunaires, marnes potentiellement gonflantes (bassin de Thiès) ou cuirasses latéritiques. Une étude de sol géotechnique de type mission G2 (sondages pressiométriques ou pénétrométriques) est obligatoire pour arrêter la contrainte admissible du sol (q_admissible).",
      `Système de fondations préconisé pour R+${levels} : Semelles isolées en béton armé solidarisées par un réseau rigide de longrines de redressement et chaînages bas, garantissant l'absence de tassements différentiels. En cas de sols compressibles ou nappe affleurante, envisager un radier général nervuré étanche.`
    ];

    geotechText.forEach(par => {
      wrapText(par, width - 85, regularFont, 7.5).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.5, font: regularFont });
        currentY -= 10;
      });
      currentY -= 4;
    });

    currentY -= 14;

    // ==========================================
    // III. STRUCTURE BÉTON ARMÉ & SPÉCIFICATIONS MATÉRIAUX
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('III. STRUCTURE PORTEUSE & SPÉCIFICATIONS DES MATÉRIAUX', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const structText = [
      "Méthode de calcul générique : Dimensionnement de l'ossature poteaux-poutres-dalles aux états limites ultimes (ELU) et de service (ELS) selon les principes de l'art (formulations de calcul de type Eurocode 2 / règles reconnues de béton armé).",
      "Qualité des bétons et ciments : Béton de structure dosé a minima à 350 kg/m³ de ciment classe 42.5 (CEM II/B-L 42.5 R ou équivalent). Ciment 32.5 formellement réservé aux mortiers de pose et enduits.",
      "Aciers pour béton armé : Aciers à haute adhérence nuance FeE500 (limite élastique 500 MPa), façonnés sans pliures brutales. Respect strict des recouvrements minimaux (40 à 50 fois le diamètre de la barre).",
      "Durabilité et enrobages : En zone côtière exposée aux embruns salins, l'enrobage minimal des armatures doit être de 4 à 5 cm pour prévenir l'éclatement du béton consécutif à l'oxydation des fers."
    ];

    structText.forEach(par => {
      wrapText(par, width - 85, regularFont, 7.5).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.5, font: regularFont });
        currentY -= 10;
      });
      currentY -= 4;
    });

    currentY -= 14;

    // ==========================================
    // IV. RÉSEAUX, FLUIDES & ASSAINISSEMENT
    // ==========================================
    checkPageBreak(130);
    currentPage.drawText('IV. RÉSEAUX HUMIDES, ÉLECTRICITÉ & ASSAINISSEMENT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const fluidsText = [
      "Alimentation en eau potable : Raccordement au réseau de distribution publique (SEN'EAU). Prévoir une bâche de stockage tampon au sol (volume recommandé : 3 à 5 m³) couplée à un suppresseur automatique avec ballon de vessie pour pallier les baisses de pression du réseau urbain.",
      "Assainissement des eaux usées & vannes : Si raccordement au réseau public de l'ONAS indisponible, réalisation d'une fosse septique toutes eaux à 3 compartiments dimensionnée selon le nombre d'occupants, suivie d'un puisard filtrant ou d'un lit d'épandage souterrain respectant une distance de sécurité > 15 m de tout point de puisage.",
      "Alimentation électrique & mise à la terre : Raccordement au réseau basse tension Senelec. Réalisation d'une boucle à fond de fouille en cuivre nu 29 mm² garantissant une résistance de terre < 10 Ohms avec disjoncteur différentiel général de protection."
    ];

    fluidsText.forEach(par => {
      wrapText(par, width - 85, regularFont, 7.5).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.5, font: regularFont });
        currentY -= 10;
      });
      currentY -= 4;
    });

    currentY -= 14;

    // ==========================================
    // V. CONCEPTION BIOCLIMATIQUE & CONFORT THERMIQUE
    // ==========================================
    checkPageBreak(120);
    currentPage.drawText('V. CONCEPTION BIOCLIMATIQUE ADAPTÉE AU CLIMAT SÉNÉGALAIS', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const bioText = [
      "Orientation optimale : Privilégier l'orientation des façades principales selon l'axe Nord-Sud pour limiter le rayonnement direct du soleil sahélien sur les parois vitrées.",
      "Ventilation naturelle traversante : Disposer les ouvertures en vis-à-vis pour capter les flux d'Alizés maritimes dominants de direction Nord / Nord-Ouest, réduisant de 30 à 45% la facture énergétique de climatisation.",
      "Protections solaires passives : Prévoir des débords de toit généreux (casquettes béton de 60 à 90 cm) ou des claustras en terre cuite sur les baies exposées au Sud et à l'Ouest. Utiliser des teintes claires à fort albédo sur la toiture-terrasse."
    ];

    bioText.forEach(par => {
      wrapText(par, width - 85, regularFont, 7.5).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.5, font: regularFont });
        currentY -= 10;
      });
      currentY -= 4;
    });

    currentY -= 14;

    // ==========================================
    // VI. ESTIMATION PRÉVISIONNELLE DU BUDGET PAR LOTS
    // ==========================================
    checkPageBreak(160);
    currentPage.drawText('VI. ESTIMATION BUDGÉTAIRE INDICATIVE PAR CORPS D\'ÉTAT', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    // Ratios métriques d'estimation au Sénégal pour R+levels
    const coutM2Moyen = levels <= 1 ? 260000 : 310000;
    const budgetTotalEstime = estimatedSDP * coutM2Moyen;

    const lotsBudget = [
      { lot: "01. Terrassement & Fondations (Infrastructures)", pct: 15, mnt: Math.round(budgetTotalEstime * 0.15) },
      { lot: "02. Gros Œuvre, Élévations & Béton Armé (Superstructure)", pct: 38, mnt: Math.round(budgetTotalEstime * 0.38) },
      { lot: "03. Étanchéité toiture terrasse & formes de pente", pct: 5, mnt: Math.round(budgetTotalEstime * 0.05) },
      { lot: "04. Plomberie sanitaire, Évacuation & Réseaux", pct: 9, mnt: Math.round(budgetTotalEstime * 0.09) },
      { lot: "05. Électricité, Éclairage & Courants faibles", pct: 8, mnt: Math.round(budgetTotalEstime * 0.08) },
      { lot: "06. Menuiseries extérieures & serrurerie", pct: 9, mnt: Math.round(budgetTotalEstime * 0.09) },
      { lot: "07. Revêtements carrelages & Faïences", pct: 10, mnt: Math.round(budgetTotalEstime * 0.10) },
      { lot: "08. Peintures intérieures/extérieures & Finitions", pct: 6, mnt: Math.round(budgetTotalEstime * 0.06) }
    ];

    currentPage.drawText(`Budget global estimatif prévisionnel (SDP ~${estimatedSDP} m²) : ${fmtCfa(budgetTotalEstime)} HT (Ratio : ~${fmtCfa(coutM2Moyen)}/m² SDP)`, { x: 40, y: currentY, size: 8.5, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    lotsBudget.forEach(lb => {
      checkPageBreak(14);
      currentPage.drawText(`• ${lb.lot} :`, { x: 50, y: currentY, size: 7.5, font: regularFont });
      currentPage.drawText(`${fmtCfa(lb.mnt)} (${lb.pct}%)`, { x: width - 180, y: currentY, size: 7.5, font: boldFont, color: COLOR_NAVY });
      currentY -= 12;
    });

    currentY -= 14;

    // ==========================================
    // VII. FEUILLE DE ROUTE ADMINISTRATIVE : TELEDAC & PERMIS
    // ==========================================
    checkPageBreak(150);
    currentPage.drawText('VII. FEUILLE DE ROUTE ADMINISTRATIVE & PROCÉDURE TELEDAC', { x: 40, y: currentY, size: 10, font: boldFont, color: COLOR_NAVY });
    currentY -= 16;

    const stepsTeledac = [
      "1. Phase Étude Préliminaire : Réalisation du levé topographique par un géomètre agréé et réalisation de l'essai de sol géotechnique (G2).",
      "2. Conception Architecturale & Ingénierie : Élaboration du dossier de plans par un architecte inscrit à l'Ordre des Architectes du Sénégal (ODAS) et plans de structure par un bureau d'études.",
      "3. Dépôt dématérialisé sur la plateforme TELEDAC : Enregistrement de la demande de Permis de Construire avec pièces requises (Titre foncier ou acte notarié, Plan de situation, Plan de masse, Plans de coupes, Notice de sécurité incendie, Devis estimatif descriptif).",
      "4. Instruction administrative : Examen par la commission de la Division Régionale de l'Urbanisme et de l'Habitat (DRUH) et avis technique des sapeurs-pompiers (BNSP) pour les ERP/IGH.",
      "5. Délai légal d'instruction : Délai moyen de 40 jours ouvrés prévu par les textes pour la délivrance de l'arrêté d'autorisation de construire par l'autorité administrative compétente."
    ];

    stepsTeledac.forEach(st => {
      wrapText(st, width - 85, regularFont, 7.5).forEach(l => {
        checkPageBreak(12);
        currentPage.drawText(l, { x: 40, y: currentY, size: 7.5, font: regularFont });
        currentY -= 10;
      });
      currentY -= 4;
    });

    currentY -= 20;

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
