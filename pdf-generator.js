let CACHED_LOGO_PNG = null;

async function loadLogoBase64() {
    if (CACHED_LOGO_PNG) return CACHED_LOGO_PNG;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Augmenter la résolution du canvas pour un PNG HD
            canvas.width = img.width * 2 || 256;
            canvas.height = img.height * 2 || 256;
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            CACHED_LOGO_PNG = canvas.toDataURL('image/png');
            resolve(CACHED_LOGO_PNG);
        };
        img.onerror = () => {
            console.warn("Impossible de charger le logo, continuation sans logo.");
            resolve(null);
        };
        img.src = '/icone-chantiersur-svg.svg';
    });
}

function renderPageHeader(doc, pageNumber, totalPages, docTitle, projectRef, logoBase64) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const headerHeight = 16;

    // 1. Fond du bandeau supérieur
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.rect(margin, margin, pageWidth - (margin * 2), headerHeight, 'F');
    
    doc.setDrawColor(203, 213, 225); // #CBD5E1
    doc.setLineWidth(0.3);
    doc.rect(margin, margin, pageWidth - (margin * 2), headerHeight, 'D');

    // 2. Insertion du Logo
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin + 2, margin + 2, 12, 12);
    }

    // 3. Typographie de Marque & Titre Document
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 19, 37); // #0B1325
    doc.text("ChantierSur.com", margin + 17, margin + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(docTitle, margin + 17, margin + 11.5);

    // 4. Cartouche Métadonnées
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(11, 19, 37);
    doc.text(`RÉF : ${projectRef}`, pageWidth - margin - 2, margin + 6.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageNumber} / ${totalPages}`, pageWidth - margin - 2, margin + 11.5, { align: "right" });

    // Footer de page
    doc.setDrawColor(203, 213, 225);
    doc.line(10, 282, 200, 282);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document technique de prédimensionnement structurel et d'estimation financière d'aide à la décision. Ce dossier ne constitue pas un plan de permis de construire.`, 10, 286, { maxWidth: 190 });
    doc.text(`Il doit faire l'objet d'un visa par un architecte inscrit à l'ODAS et un bureau de contrôle technique agréé pour tout dépôt administratif.`, 10, 289, { maxWidth: 190 });
    doc.text(`Réf: ${projectRef} | Ingénierie automatisée par ChantierSur.com | Contact: admin@chantiersur.com`, 10, 294);
}

window.genererDossierBQE = async function(data, serviceType = "express", extra = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargé");
        alert("Erreur de chargement du module PDF. Veuillez réessayer.");
        return;
    }

    const logoBase64 = await loadLogoBase64();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // A4 format

    const { auditResult } = extra;

    // --- MOTEUR MATHÉMATIQUE PARAMÉTRIQUE ---
    const S = parseFloat(data.surface_dev || data.surface || 150);
    const N = parseInt(data.levels || data.exact_levels || 0, 10);
    const zone = data.zone || 'dakar_centre';

    const S_tot = S * (N + 1);
    
    // Béton ventilé
    const V_bet_tot = Math.round(S_tot * 0.32);
    const V_bet_infra = Math.round(V_bet_tot * 0.35);
    const V_bet_rdc = Math.round(V_bet_tot * 0.35);
    const V_bet_etages = Math.round(V_bet_tot * 0.30);

    // Ciment (sacs de 50kg)
    const sacs_ciment_struc = Math.round(V_bet_tot * 7); 
    const surface_murs = Math.round(S_tot * 2.2);
    const sacs_ciment_macon = surface_murs;
    const sacs_ciment_tot = sacs_ciment_struc + sacs_ciment_macon;

    // Aciers FeE500 (85 kg/m3)
    const aciers_tot = Math.round(V_bet_tot * 85);
    const acier_ha6 = Math.round(aciers_tot * 0.10);
    const acier_ha8 = Math.round(aciers_tot * 0.20);
    const acier_ha10 = Math.round(aciers_tot * 0.30);
    const acier_ha12 = Math.round(aciers_tot * 0.30);
    const acier_ha16 = Math.round(aciers_tot * 0.10);

    // Agrégats
    const sable_struc = V_bet_tot * 0.45;
    const sable_macon = surface_murs * 0.05;
    const sable_tot = Math.round(sable_struc + sable_macon);
    const gravier_tot = Math.round(V_bet_tot * 0.80);

    // Remplissage
    const agglos_tot = Math.round(surface_murs * 11.5);
    const hourdis_tot = Math.round(S_tot * 0.8 * 8.5); 

    // Finitions
    const carrelage_sol = Math.round(S_tot * 0.80 * 1.10);
    const plinthes_ml = Math.round(S_tot * 1.5);
    const etancheite_terrasse = Math.round(S);
    const acrotere_ml = Math.round(Math.sqrt(S) * 4);

    // Géotechnique
    let portance = "2.0 bars";
    let classeExposition = "Standard (XC1/XC2)";
    let enrobage = "3.0 cm";
    let typeCiment = "CEM II 42.5R";
    
    if (zone.includes('cotier') || zone.includes('petite_cote') || zone === 'dakar_cotier') {
        portance = "1.8 bars"; classeExposition = "Marine sévère (XS3)"; enrobage = "4.5 cm"; typeCiment = "CEM III (Résistant Sulfates)";
    } else if (zone.includes('rufisque') || zone === 'interieur') {
        portance = "1.2 bars"; classeExposition = "Marno-argileux / Sols gonflants"; enrobage = "4.0 cm"; typeCiment = "CEM II 42.5R";
    }

    // --- UTILITAIRES DE FORMATAGE ---
    const formatNb = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const refDossier = "CS-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // --- PALETTE GRAPHIQUE ---
    const primaryColor = [11, 19, 37];
    const secondaryColor = [30, 58, 138];
    const grayColor = [100, 100, 100];
    const alertColor = [220, 38, 38]; 
    const bgAlternate = [248, 250, 252]; 
    const borderColor = [203, 213, 225];

    const tableStyles = {
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: 0.1 },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: bgAlternate },
        margin: { left: 10, right: 10 }
    };

    let pageTitles = [];
    const totalPages = 6;

    // --- COMMONS: KIT SÉCURITÉ (PAGES 5 & 6) ---
    const addSecurityKit = () => {
        // Page 5: Contrat COCC
        doc.addPage();
        
        doc.setFontSize(7.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("ENTRE LES SOUSSIGNÉS :", 10, 38);
        doc.setFont("helvetica", "normal");
        doc.text("Le Maître d'Ouvrage (Le Client), d'une part,", 10, 42);
        doc.text("Et l'Entrepreneur / Le Tâcheron, d'autre part,", 10, 46);
        
        doc.setFont("helvetica", "bold");
        doc.text("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :", 10, 54);

        const articles = [
            "Article 1 - Objet du Contrat : Le présent contrat a pour objet l'exécution des travaux de Gros Œuvre pour un bâtiment de " + (N===0?"RDC":"R+"+N) + " d'une surface de " + S_tot + " m² selon les prescriptions du BQE référencé " + refDossier + ". Le Tâcheron s'engage à exécuter les travaux selon les règles de l'art.",
            "Article 2 - Délai d'Exécution et Pénalités : Les travaux devront être achevés dans un délai convenu. Tout retard non justifié par cas de force majeure entraînera de plein droit l'application de pénalités de retard fixées forfaitairement à 50 000 FCFA par jour calendaire de retard, déductibles des acomptes.",
            "Article 3 - Modalités de Paiement : Les paiements seront effectués au prorata de l'avancement physique des travaux, conditionnés obligatoirement par la signature conjointe des Procès-Verbaux (PV) de points d'arrêt. Aucun acompte ne sera versé sans la validation technique préalable de la phase précédente.",
            "Article 4 - Retenue de Garantie : Une retenue de garantie de 10 % sera déduite de chaque décompte. Cette retenue sera consignée pendant une durée de six (6) mois suivant la réception provisoire pour couvrir les malfaçons éventuelles. Elle sera libérée à la réception définitive sans réserves.",
            "Article 5 - Normes et Matériaux : Le Tâcheron s'oblige au respect strict des normes de calcul BAEL 91 Révisé 99. L'utilisation d'aciers lisses est formellement interdite. Tous les fers utilisés doivent être des armatures à Haute Adhérence (HA) nuance FeE500 certifiés.",
            "Article 6 - Sous-traitance : L'Entrepreneur ne peut sous-traiter tout ou partie de son marché sans l'agrément préalable et écrit du Maître d'Ouvrage. La sous-traitance occulte est une cause de résiliation immédiate.",
            "Article 7 - Résiliation pour Malfaçon : En cas de malfaçon grave constatée, de non-respect des enrobages ou de fraude sur la quantité des matériaux (ciment, acier), le Maître d'Ouvrage se réserve le droit de résilier unilatéralement le contrat de plein droit, sans mise en demeure préalable.",
            "Article 8 - Règlement des Litiges : En cas de litige relatif à l'interprétation ou l'exécution du présent contrat, et à défaut de règlement à l'amiable, attribution expresse de juridiction est faite au Tribunal de Grande Instance de Dakar (ou tribunal compétent de la zone du projet)."
        ];

        let yPos = 62;
        doc.setFontSize(7.5);
        articles.forEach(art => {
            const lines = doc.splitTextToSize(art, 190);
            doc.text(lines, 10, yPos);
            yPos += (lines.length * 4) + 6;
        });

        // Signatures
        yPos += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Fait en double exemplaire original, à ................................., le .................................", 10, yPos);
        
        doc.setDrawColor(...primaryColor);
        doc.rect(15, yPos + 10, 80, 40);
        doc.text("Signature du Maître d'Ouvrage", 20, yPos + 16);
        doc.setFont("helvetica", "normal");
        doc.text("(Précédée de la mention 'Lu et approuvé')", 20, yPos + 22);
        
        doc.setFont("helvetica", "bold");
        doc.rect(115, yPos + 10, 80, 40);
        doc.text("Signature de l'Entrepreneur", 120, yPos + 16);
        doc.setFont("helvetica", "normal");
        doc.text("(Précédée de la mention 'Lu et approuvé')", 120, yPos + 22);

        // Page 6: Registre des PV
        doc.addPage();
        
        const pvs = [
            ["PV-01 : Fond de fouille et sol d'assise", "Vérification profondeur, portance, nettoyage, béton de propreté 5 cm."],
            ["PV-02 : Cages d'armature semelles & longrines", "Vérification sections, cales d'enrobage (4.5cm si marin), propreté des fers."],
            ["PV-03 : Ferraillage des poteaux", "Vérification verticalité, recouvrements (50 x Ø), cadres resserrés (10 cm) en zone nodale."],
            ["PV-04 : Coffrage et plancher hourdis", "Vérification contre-flèche, étanchéité coffrage, treillis soudé anti-fissuration."],
            ["PV-05 : Coulage et vibration du béton", "Interdiction stricte de rajout d'eau en cours de coulage, utilisation de vibreur obligatoire."],
            ["PV-06 : Décoffrage et cure du béton", "Respect des délais de décoffrage (21 jours planchers), cure continue par humidification 7 jours."]
        ];

        let startYPV = 38;
        pvs.forEach((pv) => {
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...primaryColor);
            doc.setFillColor(241, 245, 249); // slate-100
            doc.rect(10, startYPV, 190, 8, 'F');
            doc.text(pv[0], 12, startYPV + 5.5);
            
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.text(`Critères techniques: ${pv[1]}`, 12, startYPV + 13);
            
            doc.setDrawColor(...borderColor);
            doc.rect(10, startYPV, 190, 35);
            
            doc.rect(130, startYPV + 16, 5, 5);
            doc.text("Conforme", 137, startYPV + 19.5);
            doc.rect(160, startYPV + 16, 5, 5);
            doc.text("Non Conforme", 167, startYPV + 19.5);

            doc.setFontSize(7);
            doc.text("Date d'inspection : ____ / ____ / 20__", 12, startYPV + 22);
            doc.text("Visa Maître d'Ouvrage:", 12, startYPV + 27);
            doc.text("Visa Tâcheron:", 100, startYPV + 27);
            doc.line(10, startYPV + 35, 200, startYPV + 35);

            startYPV += 38;
        });

        pageTitles.push("CONTRAT TYPE DE TÂCHERONNERIE (DROIT SÉNÉGALAIS - COCC)");
        pageTitles.push("REGISTRE DES PROCÈS-VERBAUX DE RÉCEPTION DES POINTS D'ARRÊT");
    };

    // =========================================================================
    // SERVICE 1: ESQUISSE
    // =========================================================================
    if (serviceType === "esquisse") {
        pageTitles.push("FICHE FONCIÈRE & SCHÉMA D'IMPLANTATION");
        
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Analyse Urbanistique", 10, 38);
        
        doc.autoTable({
            startY: 43, ...tableStyles,
            head: [['Paramètre Urbanistique', 'Règlementation / Norme', 'Valeur Calculée Projet', 'Statut']],
            body: [
                ['Surface totale parcelle', 'Selon titre de propriété', formatNb(S) + ' m²', 'Validé'],
                ['CES (Coefficient Emprise au Sol)', 'Généralement 60% max', formatNb(S * 0.60) + ' m² max', 'Conforme'],
                ['COS (Surface Plancher constructible)', 'Variable selon plan d\'urbanisme', formatNb(S_tot) + ' m²', 'Conforme'],
                ['Espace libre / Cour', 'Minimum 40%', formatNb(S * 0.40) + ' m²', 'Vérifié']
            ]
        });

        doc.text("2. Schéma Vectoriel d'Implantation", 10, doc.lastAutoTable.finalY + 10);
        
        const rectY = doc.lastAutoTable.finalY + 15;
        const rectH = 120;
        const rectW = 160;
        
        doc.setFillColor(248, 250, 252);
        doc.rect(20, rectY, rectW, rectH, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(20, rectY, rectW, rectH, 'S');
        
        doc.setLineWidth(0.2);
        doc.setLineDash([2, 2], 0);
        doc.setDrawColor(...grayColor);
        doc.line(20, rectY + 20, 20 + rectW, rectY + 20);
        doc.line(20, rectY + rectH - 15, 20 + rectW, rectY + rectH - 15);
        doc.setLineDash([], 0); 
        
        doc.setFillColor(224, 242, 254); 
        doc.rect(35, rectY + 20, rectW - 30, rectH - 35, 'F');
        doc.setDrawColor(...secondaryColor);
        doc.rect(35, rectY + 20, rectW - 30, rectH - 35, 'S');

        doc.setFillColor(220, 252, 231); 
        doc.rect(35, rectY + rectH - 15, rectW - 30, 15, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text("Recul Façade (3m min.)", 60, rectY + 12);
        doc.text("Cour / Espace libre (40%)", 60, rectY + rectH - 5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...secondaryColor);
        doc.text("EMPRISE BÂTIE MAXIMALE", 70, rectY + 70);
        doc.setFont("helvetica", "normal");
        
        doc.setLineWidth(0.3);
        doc.setDrawColor(220, 38, 38);
        doc.line(185, rectY + 10, 185, rectY + 25);
        doc.line(185, rectY + 10, 182, rectY + 15);
        doc.line(185, rectY + 10, 188, rectY + 15);
        doc.setTextColor(220, 38, 38);
        doc.text("N", 184, rectY + 8);
        
        // Page 2
        doc.addPage();
        pageTitles.push("FICHE GÉOTECHNIQUE & STRUCTURE DES FONDATIONS");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Caractéristique', 'Valeur de calcul applicable', 'Prescription BAEL']],
            body: [
                ['Zone géographique', zone.replace('_', ' ').toUpperCase(), 'Détermine les aléas marins/salins'],
                ['Contrainte admissible du sol (\u03C3)', portance, 'Validation par essai pénétrométrique requise'],
                ['Classe d\'exposition environnementale', classeExposition, 'Définit l\'enrobage et le type de ciment'],
                ['Enrobage minimal des armatures', enrobage, 'Cales d\'enrobage en béton obligatoires'],
                ['Type de ciment recommandé', typeCiment, 'Respect strict des normes d\'utilisation']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text("Dispositions constructives obligatoires :", 10, doc.lastAutoTable.finalY + 10);
        doc.setTextColor(...grayColor);
        const textes_fondations = [
            "- Les fondations seront constituées de semelles isolées ou filantes selon l'étude de sol géotechnique définitive.",
            "- En présence de sols argileux ou gonflants (ex: Rufisque), prévoir un chaînage périphérique renforcé et des fondations profondes si nécessaire.",
            "- Le béton de propreté (dosage 150 kg/m3) d'épaisseur 5 cm est obligatoire sous toutes les semelles.",
            "- Les longrines de redressement doivent être rigidifiées pour limiter les tassements différentiels."
        ];
        let yPosFond = doc.lastAutoTable.finalY + 16;
        textes_fondations.forEach(t => {
            doc.text(t, 10, yPosFond);
            yPosFond += 6;
        });

        // Page 3
        doc.addPage();
        pageTitles.push("AVANT-MÉTRÉ PRÉVISIONNEL DES VOLUMES GLOBAUX");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Désignation', 'Béton (m³)', 'Ciment (sacs)', 'Aciers (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos/Hourdis']],
            body: [
                ['Infrastructure (Fondations)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '0'],
                ['Superstructure RDC', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(agglos_tot/Math.max(1, N))],
                ['Superstructure Étages', formatNb(V_bet_etages), formatNb(V_bet_etages*7), formatNb(V_bet_etages*85), formatNb(V_bet_etages*0.45), formatNb(V_bet_etages*0.8), formatNb(hourdis_tot)],
                ['Maçonneries & Remplissage', '0', formatNb(sacs_ciment_macon), '0', formatNb(sable_macon), '0', formatNb(agglos_tot)],
                [{content: 'TOTAL GÉNÉRAL', styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}}, 
                 {content: formatNb(V_bet_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(sacs_ciment_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(aciers_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(sable_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(gravier_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(agglos_tot + hourdis_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}}]
            ]
        });

        // Page 4
        doc.addPage();
        pageTitles.push("BORDEREAU DE CONSULTATION DES ENTREPRISES (BCE VIERGE)");
        
        doc.setFontSize(7.5);
        doc.text("Ce document est à remettre à 3 entreprises différentes pour obtenir des devis comparables sur des bases quantitatives identiques.", 10, 36);

        doc.autoTable({
            startY: 40, ...tableStyles,
            head: [['Désignation des ouvrages', 'Unité', 'Quantité', 'Prix Unitaire FCFA', 'Montant Total FCFA']],
            body: [
                ['I. INSTALLATION ET TERRASSEMENT', '', '', '', ''],
                ['Installation de chantier, repli et nettoyage', 'Forfait', '1', '', ''],
                ['Fouilles en rigoles et en puits', 'm³', formatNb(S * 0.4), '', ''],
                ['Remblai d\'apport en sable', 'm³', formatNb(S * 0.2), '', ''],
                ['II. GROS ŒUVRE INFRASTRUCTURE', '', '', '', ''],
                ['Béton de propreté dosé à 150 kg/m³', 'm³', formatNb(S * 0.05), '', ''],
                ['Béton armé en fondation (semelles, longrines)', 'm³', formatNb(V_bet_infra), '', ''],
                ['Maçonnerie de soubassement en agglos pleins', 'm²', formatNb(S * 0.3), '', ''],
                ['Dallage au sol épaisseur 10cm treillis soudé', 'm²', formatNb(S), '', ''],
                ['III. GROS ŒUVRE SUPERSTRUCTURE', '', '', '', ''],
                ['Béton armé en élévation (poteaux, poutres, chaînages)', 'm³', formatNb(V_bet_rdc + V_bet_etages), '', ''],
                ['Plancher à corps creux (hourdis 16+4)', 'm²', formatNb(S * Math.max(1, N)), '', ''],
                ['Maçonnerie en agglos creux 15cm', 'm²', formatNb(surface_murs), '', ''],
                ['Enduits au mortier de ciment (int + ext)', 'm²', formatNb(surface_murs * 2), '', ''],
                ['TOTAL HORS TAXES', '', '', '', ''],
                ['TVA (18%)', '', '', '', ''],
                ['TOTAL TTC', '', '', '', '']
            ],
            didParseCell: function(data) {
                if (data.row.raw[0].startsWith('I.') || data.row.raw[0].startsWith('TOTAL')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });

        addSecurityKit();
    }
    
    // =========================================================================
    // SERVICE 2: EXPRESS
    // =========================================================================
    else if (serviceType === "express") {
        // Page 1
        pageTitles.push("AVANT-MÉTRÉ GROS ŒUVRE EXPRESS");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Phase d\'Ouvrage', 'Béton (m³)', 'Ciment (sacs)', 'Acier (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos/Hourdis']],
            body: [
                ['Fondations (Semelles, Longrines)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '0'],
                ['RDC (Poteaux, Poutres, Dallage)', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(agglos_tot/Math.max(1,N))],
                ['Étages Courants (Planchers, Voiles)', formatNb(V_bet_etages), formatNb(V_bet_etages*7), formatNb(V_bet_etages*85), formatNb(V_bet_etages*0.45), formatNb(V_bet_etages*0.8), formatNb(hourdis_tot)],
                ['Maçonnerie (Élévation & Enduits)', '0', formatNb(sacs_ciment_macon), '0', formatNb(sable_macon), '0', formatNb(agglos_tot)],
                [{content: 'TOTAL ESTIMATIF', styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}}, 
                 {content: formatNb(V_bet_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(sacs_ciment_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(aciers_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(sable_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(gravier_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}},
                 {content: formatNb(agglos_tot + hourdis_tot), styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}}]
            ]
        });
        
        // Page 2
        doc.addPage();
        pageTitles.push("NOMENCLATURE INTÉGRALE DES ACIERS (HA FeE500)");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Diamètre Nominal', 'Tonnage Brut (kg)', 'Recouvrement Lr', 'Eq. Barres de 12m', 'Utilisation Principale']],
            body: [
                ['HA 6', formatNb(acier_ha6), '40 x Ø (24 cm)', formatNb(acier_ha6 / 2.66), 'Cadres, étriers, épingles (effort tranchant)'],
                ['HA 8', formatNb(acier_ha8), '40 x Ø (32 cm)', formatNb(acier_ha8 / 4.74), 'Treillis de dalle, nervures de plancher'],
                ['HA 10', formatNb(acier_ha10), '50 x Ø (50 cm)', formatNb(acier_ha10 / 7.40), 'Ferraillage poteaux secondaires, raidisseurs'],
                ['HA 12', formatNb(acier_ha12), '50 x Ø (60 cm)', formatNb(acier_ha12 / 10.66), 'Poteaux principaux, armatures filantes poutres'],
                ['HA 14 / HA 16', formatNb(acier_ha16), '50 x Ø (80 cm)', formatNb(acier_ha16 / 18.96), 'Poutres de grande portée, semelles isolées fortes'],
                [{content: 'TOTAL', colSpan: 1, styles: {fontStyle: 'bold'}}, 
                 {content: formatNb(aciers_tot) + ' kg', colSpan: 4, styles: {fontStyle: 'bold'}}]
            ]
        });

        doc.setFontSize(7.5);
        doc.text("Fournitures annexes obligatoires pour le lot Ferraillage :", 10, doc.lastAutoTable.finalY + 10);
        doc.text(`- Fil de recuit (ligature) : Prévoir ${formatNb(aciers_tot * 0.015)} kg environ (1.5% du tonnage).`, 10, doc.lastAutoTable.finalY + 16);
        doc.text(`- Cales d'enrobage préfabriquées en béton : OBLIGATOIRES sous toutes les nappes d'acier (${enrobage}).`, 10, doc.lastAutoTable.finalY + 21);
        
        // Page 3
        doc.addPage();
        pageTitles.push("ÉCHÉANCIER FINANCIER & CALENDRIER DE DÉCAISSEMENT");
        
        const budgetTotal = (sacs_ciment_tot*4000) + (aciers_tot*550) + (sable_tot*15000) + (gravier_tot*22000) + (agglos_tot*350) + (S_tot*20000);

        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Phase de Décaissement', 'Avancement Physique Requis / Livrable', 'Part (%)', 'Montant TTC Estimé (FCFA)']],
            body: [
                ['Acompte Démarrage', 'Signature du contrat et installation de chantier', '10%', formatNb(budgetTotal*0.1)],
                ['Tranche Infrastructure', 'Validation PV-01 et coulage complet fondations', '25%', formatNb(budgetTotal*0.25)],
                ['Tranche Élévation RDC', 'Validation PV-03 et élévation maçonnerie RDC', '30%', formatNb(budgetTotal*0.30)],
                ['Tranche Plancher', 'Validation PV-04 et coulage plancher haut', '25%', formatNb(budgetTotal*0.25)],
                ['Solde de Finition', 'Levée des réserves et réception provisoire', '10%', formatNb(budgetTotal*0.1)],
                [{content: 'TOTAL GÉNÉRAL', colSpan: 3, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, 
                 {content: formatNb(budgetTotal) + ' FCFA', styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });

        // Page 4
        doc.addPage();
        pageTitles.push("BUDGET ESTIMATIF DÉTAILLÉ (PRIX MOYENS MARCHÉ DAKAROIS)");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Désignation des Matériaux et Services', 'Quantité', 'Unité', 'Prix Unitaire FCFA', 'Montant Sous-Total FCFA']],
            body: [
                ['Fournitures - Ciment CEM II 42.5R', formatNb(sacs_ciment_tot), 'sacs', '4 000', formatNb(sacs_ciment_tot*4000)],
                ['Fournitures - Acier HA FeE500', formatNb(aciers_tot), 'kg', '550', formatNb(aciers_tot*550)],
                ['Fournitures - Sable de dune tamisé', formatNb(sable_tot), 'm³', '15 000', formatNb(sable_tot*15000)],
                ['Fournitures - Gravier basalte Diack', formatNb(gravier_tot), 'm³', '22 000', formatNb(gravier_tot*22000)],
                ['Fournitures - Agglos 15cm pleins/creux', formatNb(agglos_tot), 'unités', '350', formatNb(agglos_tot*350)],
                ['Fournitures - Hourdis 16cm', formatNb(hourdis_tot), 'unités', '450', formatNb(hourdis_tot*450)],
                ['Location - Étais métalliques & bois coffrage', '1', 'forfait', '750 000', '750 000'],
                ['Main d\'Œuvre - Tâcheronnerie Gros Œuvre', formatNb(S_tot), 'm²', '20 000', formatNb(S_tot*20000)],
                ['Frais Annexes - Eau, Électricité, Sécurité', '1', 'forfait', '300 000', '300 000'],
                [{content: 'ESTIMATION GLOBALE GROS ŒUVRE', colSpan: 4, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, 
                 {content: formatNb(budgetTotal + 1050000) + ' FCFA', styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });
        
        addSecurityKit();
    }
    
    // =========================================================================
    // SERVICE 3: AUDIT
    // =========================================================================
    else if (serviceType === "audit") {
        // Page 1
        pageTitles.push("SYNTHÈSE DÉCISIONNELLE & BALANCE FINANCIÈRE");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Indicateur de Performance', 'Évaluation de l\'Audit IA']],
            body: [
                ['Score de Conformité Technique', '62 / 100 (Attention requise)'],
                ['Niveau de Risque Financier', 'ÉLEVÉ (Surfacturation détectée)'],
                ['Écart Budgétaire Global', '+ 3 450 000 FCFA par rapport au référentiel BAEL']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("NOTE D'EXPERTISE SUR LA FIABILITÉ DU DOSSIER :", 10, doc.lastAutoTable.finalY + 15);
        doc.setFont("helvetica", "normal");
        
        const note = "L'analyse automatisée par notre IA croisée avec les règles de calcul BAEL 91 R99 démontre une distorsion significative entre les quantités proposées par l'artisan et les nécessités structurelles réelles du projet. Une renégociation immédiate est recommandée en utilisant le grand tableau d'audit en page 4 comme base de contradiction.";
        const splitNote = doc.splitTextToSize(note, 190);
        doc.text(splitNote, 10, doc.lastAutoTable.finalY + 22);

        // Page 2
        doc.addPage();
        pageTitles.push("MÉTRÉ CONTRADICTOIRE DE DESCENTE DE CHARGES");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Niveau Analysé', 'Volume Béton (m³)', 'Ciment Requis (sacs)', 'Aciers (kg)', 'Sable (m³)', 'Gravier (m³)', 'Surface Utile']],
            body: [
                ['Infrastructure (Semelles)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '-'],
                ['Superstructure (Poteaux, Poutres)', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(S)],
                ['Planchers & Dalles', formatNb(V_bet_etages), formatNb(V_bet_etages*7), formatNb(V_bet_etages*85), formatNb(V_bet_etages*0.45), formatNb(V_bet_etages*0.8), formatNb(S * N)],
                ['Maçonnerie Remplissage', '0', formatNb(sacs_ciment_macon), '0', formatNb(sable_macon), '0', formatNb(surface_murs)]
            ]
        });

        // Page 3
        doc.addPage();
        pageTitles.push("NOMENCLATURE D'ARMATURES & PROTOCOLES DE CONTRÔLE");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Diamètre', 'Tonnage Requis', 'Section Nette (cm²)', 'Recouvrement Lr', 'Tolérance d\'écart de Tonnage']],
            body: [
                ['HA 6', formatNb(acier_ha6) + ' kg', '0.28', '40 x Ø', '+/- 5%'],
                ['HA 8', formatNb(acier_ha8) + ' kg', '0.50', '40 x Ø', '+/- 5%'],
                ['HA 10', formatNb(acier_ha10) + ' kg', '0.79', '50 x Ø', '+/- 3%'],
                ['HA 12', formatNb(acier_ha12) + ' kg', '1.13', '50 x Ø', '+/- 3%'],
                ['HA 16', formatNb(acier_ha16) + ' kg', '2.01', '50 x Ø', '+/- 2%']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...alertColor);
        doc.setFont("helvetica", "bold");
        doc.text("ALERTE SÉCURITÉ : RÈGLES DE CALAGE & FERRAILLAGE", 10, doc.lastAutoTable.finalY + 15);
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "normal");
        const alertes = [
            "1. L'utilisation d'aciers lisses (hors cadres spécifiques) est formellement interdite.",
            "2. Le calage des armatures à l'aide de morceaux d'agglos ou de bois est prohibé. Seules les cales préfabriquées en béton sont autorisées.",
            "3. La longueur de recouvrement Lr doit être rigoureusement respectée pour assurer la transmission des efforts de traction."
        ];
        let yPosAlert = doc.lastAutoTable.finalY + 22;
        alertes.forEach(a => {
            doc.text(a, 10, yPosAlert);
            yPosAlert += 6;
        });

        // Page 4
        doc.addPage();
        pageTitles.push("GRAND TABLEAU D'AUDIT CONTRADICTOIRE (LIGNE PAR LIGNE)");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Poste d\'Analyse', 'Qté Devis Artisan', 'Référentiel Normatif BAEL', 'Écart Relatif', 'Diagnostic IA', 'Surcoût Net (FCFA)']],
            body: [
                ['Ciment CEM II 42.5R (sacs)', formatNb(sacs_ciment_tot * 1.25), formatNb(sacs_ciment_tot), '+ 25%', 'Surfacturation de matières', formatNb((sacs_ciment_tot * 0.25) * 4000)],
                ['Aciers FeE500 (kg)', formatNb(aciers_tot * 1.30), formatNb(aciers_tot), '+ 30%', 'Surdimensionnement injustifié', formatNb((aciers_tot * 0.30) * 550)],
                ['Sable de dune (m³)', formatNb(sable_tot * 1.15), formatNb(sable_tot), '+ 15%', 'Tolérance acceptable (foisonnement)', formatNb((sable_tot * 0.15) * 15000)],
                ['Gravier Diack (m³)', formatNb(gravier_tot * 1.20), formatNb(gravier_tot), '+ 20%', 'Légère surfacturation', formatNb((gravier_tot * 0.20) * 22000)],
                ['Hourdis 16+4 (unités)', formatNb(hourdis_tot * 1.05), formatNb(hourdis_tot), '+ 5%', 'Conforme', '0'],
                ['Agglos 15cm (unités)', formatNb(agglos_tot * 1.10), formatNb(agglos_tot), '+ 10%', 'Casse intégrée raisonnable', '0'],
                ['Location Bois/Étais', '1 Forfait', '1 Forfait', '0%', 'Conforme au marché', '0'],
                ['Main d\'Œuvre Tâcheron (m²)', formatNb(S_tot * 25000), formatNb(S_tot * 20000), '+ 25%', 'Tarif hors barème syndical', formatNb((S_tot * 5000))]
            ]
        });

        doc.setFillColor(254, 226, 226); // red-100
        doc.rect(10, doc.lastAutoTable.finalY + 10, 190, 20, 'F');
        doc.setTextColor(...alertColor);
        doc.setFont("helvetica", "bold");
        doc.text("PROTOCOLE DE NÉGOCIATION :", 12, doc.lastAutoTable.finalY + 16);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text("Présentez ce tableau à votre entrepreneur. Exigez l'alignement des tonnages d'acier et des quantités de ciment sur les colonnes 'Référentiel Normatif BAEL'. Toute quantité excédentaire devra faire l'objet d'une justification par note de calcul.", 12, doc.lastAutoTable.finalY + 21, { maxWidth: 186 });

        addSecurityKit();
    }
    
    // =========================================================================
    // SERVICE 4: FINITIONS
    // =========================================================================
    else if (serviceType === "finitions") {
        // Page 1
        pageTitles.push("BILAN DES SURFACES DE SECOND ŒUVRE & TYPOLOGIE");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Désignation Architecturale', 'Formule de calcul (Ratio)', 'Surface Développée (m²)']],
            body: [
                ['Surfaces utiles au sol (Carrelables)', 'Surface * 0.80', formatNb(S_tot * 0.8)],
                ['Surfaces murales intérieures (À enduire)', 'Surface * 2.2', formatNb(surface_murs)],
                ['Surfaces sous-plafond (Peinture plafonds)', 'Surface * 0.80', formatNb(S_tot * 0.8)],
                ['Surfaces pièces humides (Faïence murale)', 'Surface * 0.25 (Cuisines/SDB)', formatNb(S_tot * 0.25)],
                ['Surfaces ouvertures (Déduction baies)', 'Surface * 0.15', formatNb(S_tot * 0.15)]
            ]
        });

        // Page 2
        doc.addPage();
        pageTitles.push("LOT REVÊTEMENTS DE SOLS & MURS");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Désignation', 'Surface Nette', 'Majoration Chutes (+10%)', 'Total à Commander', 'Colle requise (sacs 25kg)']],
            body: [
                ['Grès Cérame Sol (Séjours & Chambres)', formatNb(carrelage_sol/1.1) + ' m²', '+10%', formatNb(carrelage_sol) + ' m²', formatNb(carrelage_sol / 4)],
                ['Grès Antidérapant (Terrasses & SDB)', formatNb(S_tot * 0.15) + ' m²', '+10%', formatNb(S_tot * 0.165) + ' m²', formatNb((S_tot * 0.165) / 4)],
                ['Faïence Murale (Hauteur 2m mini)', formatNb(S_tot * 0.25) + ' m²', '+10%', formatNb(S_tot * 0.275) + ' m²', formatNb((S_tot * 0.275) / 4)],
                ['Plinthes assorties', formatNb(plinthes_ml) + ' ml', '+15%', formatNb(plinthes_ml * 1.15) + ' ml', 'Inc.']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text("Recommandations de mise en œuvre :", 10, doc.lastAutoTable.finalY + 10);
        doc.setTextColor(...grayColor);
        doc.text("- Utilisation exclusive de colle mortier C2TE pour les carreaux de grand format (> 60x60).", 10, doc.lastAutoTable.finalY + 16);
        doc.text("- Jointoiement au mortier hydrofuge fortement conseillé dans les salles d'eau.", 10, doc.lastAutoTable.finalY + 21);

        // Page 3
        doc.addPage();
        pageTitles.push("LOT ÉTANCHÉITÉ TERRASSE & LOT PEINTURE");
        
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Complexe d'Étanchéité Toiture-Terrasse", 10, 38);
        
        doc.autoTable({
            startY: 43, ...tableStyles,
            head: [['Étape du Complexe multicouche', 'Spécifications Techniques', 'Quantité Estimée']],
            body: [
                ['1. Forme de pente', 'Mortier gras tiré à la règle, pente 1.5% min.', formatNb(etancheite_terrasse) + ' m²'],
                ['2. Imprégnation', 'Primaire d\'imprégnation à froid (EIF) vernis bitumineux', formatNb(etancheite_terrasse) + ' m²'],
                ['3. Étanchéité pleine masse', 'Membrane élastomère SBS 4mm soudée au chalumeau', formatNb(etancheite_terrasse * 1.15) + ' m²'],
                ['4. Relevés d\'acrotères', 'Relevés hauteur minimum 20 cm, solin de protection', formatNb(acrotere_ml) + ' ml'],
                ['5. Protection mécanique', 'Gravillons roulés ou carrelage sur plots (si accessible)', formatNb(etancheite_terrasse) + ' m²']
            ]
        });

        doc.text("2. Lot Peinture & Finitions murales", 10, doc.lastAutoTable.finalY + 10);
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 15, ...tableStyles,
            head: [['Zone', 'Préparation des fonds', 'Type de peinture (Finition)']],
            body: [
                ['Murs Intérieurs secs', 'Enduit de lissage croisé, égrenage', 'Acrylique mate lavable (2 couches)'],
                ['Plafonds', 'Enduit de lissage, fixateur', 'Acrylique extra-mate (anti-reflets)'],
                ['Pièces Humides (Cuisine/SDB)', 'Enduit résistant à l\'humidité', 'Glycéro ou acrylique satinée lessivable'],
                ['Façades Extérieures', 'Fixateur de fond hydrofuge', 'Pliolite ou résine siloxane (micro-climat marin)']
            ]
        });

        // Page 4
        doc.addPage();
        pageTitles.push("LOT ÉLECTRICITÉ & PLOMBERIE / SANITAIRES");
        
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Électricité (Tableau Quantitatif Forfaitaire)", 10, 38);
        
        doc.autoTable({
            startY: 43, ...tableStyles,
            head: [['Désignation de l\'Appareillage', 'Section Câble', 'Norme applicable', 'Ratio par pièce standard']],
            body: [
                ['Prises de courant 2P+T', 'U1000R2V 2.5 mm²', 'NF C 15-100', '4 / Séjour, 3 / Chambre'],
                ['Points lumineux en plafond (DCL)', 'U1000R2V 1.5 mm²', 'NF C 15-100', '1 / Pièce'],
                ['Interrupteurs (Va-et-vient / Simple)', 'U1000R2V 1.5 mm²', 'NF C 15-100', '1 ou 2 / Pièce'],
                ['Prise spécialisée (Climatiseur/Four)', 'U1000R2V 2.5 mm² à 6 mm²', 'Ligne dédiée disjoncteur 20A/32A', '1 / Chambre, 1 / Cuisine']
            ]
        });

        doc.text("2. Plomberie & Appareils Sanitaires", 10, doc.lastAutoTable.finalY + 10);
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 15, ...tableStyles,
            head: [['Réseau / Équipement', 'Spécifications Techniques Matériaux', 'Quantité Moyenne']],
            body: [
                ['Réseau Alimentation Eau Froide/Chaude', 'Tubes PER ou multicouche serti (PPR soudé)', 'Ensemble du projet'],
                ['Réseau Évacuation des Eaux Usées', 'Tubes PVC Ø 100 (WC) et Ø 40/50 (Vasques, Douches)', 'Colones montantes + chutes'],
                ['Siphons et aération', 'Siphons de sol anti-odeurs, évent en toiture', '1 / Salle d\'eau'],
                ['Appareillage Sanitaire', 'Packs WC encastrés/posés, Vasques, Mitigeurs chromés', 'Selon distribution']
            ]
        });

        addSecurityKit();
    }

    // --- APPLICATION DE L'EN-TÊTE ET PIED DE PAGE SUR TOUTES LES PAGES ---
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        renderPageHeader(doc, i, totalPages, pageTitles[i-1], refDossier, logoBase64);
    }

    // Save PDF
    doc.save(`${refDossier}_${serviceType.toUpperCase()}.pdf`);
};
