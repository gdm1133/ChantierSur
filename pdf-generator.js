window.genererDossierBQE = function(data, serviceType = "express", extra = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargé");
        alert("Erreur de chargement du module PDF. Veuillez réessayer.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // A4 format

    const { auditResult } = extra;

    // Formatting utilities
    const formatNb = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    
    // Default fallback values
    const stot = data.surface_dev || data.stot || ((data.surface || 150) * (data.levels ? data.levels + 1 : 2)) || 300;
    const levels = data.levels || data.exact_levels || 1;
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const refDossier = "CS-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const zone = data.zone || 'dakar_centre';

    // Graphic Palette
    const primaryColor = [11, 19, 37]; // #0B1325
    const secondaryColor = [30, 58, 138]; // #1E3A8A
    const grayColor = [100, 100, 100];
    const alertColor = [220, 38, 38]; 
    const conformColor = [5, 150, 105]; 
    const bgAlternate = [248, 250, 252]; 
    const borderColor = [203, 213, 225]; // #CBD5E1

    const tableStyles = {
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: 0.1 },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: bgAlternate },
        margin: { left: 10, right: 10 }
    };

    const addHeader = (doc, title) => {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(title, 10, 15);
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.text(`Réf: ${refDossier} | Date: ${dateJour}`, 10, 20);
    };

    const addFooter = (doc, pageNum, totalPages) => {
        doc.setFontSize(7);
        doc.setTextColor(...grayColor);
        doc.text(`Document technique de prédimensionnement structurel et d'estimation financière d'aide à la décision. Ce dossier ne constitue pas un plan de permis de construire et doit faire l'objet d'un visa par un architecte inscrit à l'ODAS et un bureau de contrôle technique agréé pour le dépôt administratif.`, 10, 285, { maxWidth: 190 });
        doc.text(`Réf: ${refDossier} | Contact: admin@chantiersur.com`, 10, 292);
        doc.text(`Page ${pageNum} / ${totalPages}`, 200, 292, { align: 'right' });
    };

    // Geotechnical data based on zone
    let portance = "2.0 bars";
    let classeExposition = "Standard";
    let enrobage = "3.0 cm";
    let typeCiment = "CEM II 42.5R";
    
    if (zone.includes('cotier') || zone.includes('petite_cote')) {
        portance = "1.8 bars"; classeExposition = "Marine sévère"; enrobage = "4.5 cm"; typeCiment = "CEM III (Résistant Sulfates)";
    } else if (zone.includes('rufisque')) {
        portance = "1.2 bars"; classeExposition = "Marno-argileux"; enrobage = "4.0 cm"; typeCiment = "CEM II 42.5R";
    }

    const cimentRecommande = Math.round(stot * 2.42 * 1.05);
    const acierRecommande = Math.round(stot * 26.5 * 1.07);

    // =========================================================================
    // SERVICE 1: ESQUISSE
    // =========================================================================
    if (serviceType === "esquisse") {
        // Page 1
        addHeader(doc, "DOSSIER DE FAISABILITÉ & FICHE FONCIÈRE");
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.text("1. Analyse Urbanistique", 10, 30);
        doc.autoTable({
            startY: 35, ...tableStyles,
            head: [['Paramètre', 'Règlementation', 'Valeur Projet']],
            body: [
                ['CES (Emprise au sol max)', '60% max', 'Conforme'],
                ['COS (Surface Plancher)', 'Selon zone', 'Conforme'],
                ['Surface cour obligatoire', 'Minimum 40%', 'Vérifié']
            ]
        });
        doc.text("2. Schéma d'implantation", 10, doc.lastAutoTable.finalY + 10);
        doc.setDrawColor(...borderColor);
        doc.rect(10, doc.lastAutoTable.finalY + 15, 190, 80);
        doc.text("Schéma vectoriel d'implantation parcellaire selon la configuration choisie.", 15, doc.lastAutoTable.finalY + 25);
        addFooter(doc, 1, 6);
        
        // Page 2
        doc.addPage();
        addHeader(doc, "FICHE GÉOTECHNIQUE & FONDATIONS");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Zone', 'Portance (\u03C3)', 'Enrobage', 'Ciment recommandé']],
            body: [[zone, portance, enrobage, typeCiment]]
        });
        addFooter(doc, 2, 6);

        // Page 3
        doc.addPage();
        addHeader(doc, "AVANT-MÉTRÉ PRÉVISIONNEL GROS ŒUVRE");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Niveau', 'Béton (m³)', 'Ciment (sacs)', 'Acier (kg)', 'Sable (m³)', 'Gravier (m³)', 'Hourdis']],
            body: [
                ['Infrastructure', formatNb(stot*0.1), formatNb(cimentRecommande*0.3), formatNb(acierRecommande*0.4), formatNb(stot*0.15), formatNb(stot*0.15), '0'],
                ['Superstructure', formatNb(stot*0.22), formatNb(cimentRecommande*0.7), formatNb(acierRecommande*0.6), formatNb(stot*0.2), formatNb(stot*0.2), formatNb(stot*4.5)],
                ['TOTAL', formatNb(stot*0.32), formatNb(cimentRecommande), formatNb(acierRecommande), formatNb(stot*0.35), formatNb(stot*0.35), formatNb(stot*4.5)]
            ]
        });
        addFooter(doc, 3, 6);

        // Page 4
        doc.addPage();
        addHeader(doc, "BORDEREAU DE CONSULTATION DES ENTREPRISES (BCE)");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Désignation', 'U', 'Quantité', 'PU', 'Montant']],
            body: [
                ['Installation de chantier', 'Ens', '1', '', ''],
                ['Terrassement', 'm³', formatNb(stot*0.5), '', ''],
                ['Béton armé en fondation', 'm³', formatNb(stot*0.1), '', ''],
                ['Béton armé en élévation', 'm³', formatNb(stot*0.22), '', ''],
                ['Maçonnerie agglos creux 15cm', 'm²', formatNb(stot*2.5), '', '']
            ]
        });
        addFooter(doc, 4, 6);

        // Page 5 & 6
        doc.addPage();
        addHeader(doc, "KIT SÉCURITÉ : CONTRAT TÂCHERONNERIE (COCC)");
        doc.setFontSize(8);
        doc.text("CONTRAT TYPE SÉNÉGALAIS (COCC)", 10, 30);
        doc.text("Article 1: Objet du contrat...", 10, 40);
        doc.text("Article 2: Retenue de garantie de 10% sur chaque décompte...", 10, 50);
        addFooter(doc, 5, 6);

        doc.addPage();
        addHeader(doc, "KIT SÉCURITÉ : POINTS D'ARRÊT INCOMPRESSIBLES");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Point d\'arrêt', 'Validation requise', 'Signature Inspecteur']],
            body: [
                ['1. Fouilles et fond de fouille', 'Avant coulage béton propreté', ''],
                ['2. Ferraillage semelles', 'Avant coulage semelles', ''],
                ['3. Ferraillage plancher', 'Avant coulage dalle', '']
            ]
        });
        addFooter(doc, 6, 6);
    }

    // =========================================================================
    // SERVICE 2: EXPRESS
    // =========================================================================
    else if (serviceType === "express") {
        // Page 1
        addHeader(doc, "BQE GROS ŒUVRE EXPRESS");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Phase', 'Béton (m³)', 'Ciment (sacs)', 'Acier (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos']],
            body: [
                ['Infrastructure', formatNb(stot*0.1), formatNb(cimentRecommande*0.3), formatNb(acierRecommande*0.4), formatNb(stot*0.15), formatNb(stot*0.15), '0'],
                ['RDC', formatNb(stot*0.11), formatNb(cimentRecommande*0.35), formatNb(acierRecommande*0.3), formatNb(stot*0.1), formatNb(stot*0.1), formatNb(stot*6)],
                ['Étages courants', formatNb(stot*0.11), formatNb(cimentRecommande*0.35), formatNb(acierRecommande*0.3), formatNb(stot*0.1), formatNb(stot*0.1), formatNb(stot*6)]
            ]
        });
        addFooter(doc, 1, 6);

        // Page 2
        doc.addPage();
        addHeader(doc, "NOMENCLATURE EXHAUSTIVE DES ACIERS (HA FeE500)");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Diamètre (\u03A6)', 'Poids (kg)', 'Longueur Recouvrement', 'Eq. Barres 12m']],
            body: [
                ['HA 6', formatNb(acierRecommande*0.1), '40\u03A6', formatNb((acierRecommande*0.1)/2.66)],
                ['HA 8', formatNb(acierRecommande*0.2), '40\u03A6', formatNb((acierRecommande*0.2)/4.74)],
                ['HA 10', formatNb(acierRecommande*0.3), '40\u03A6', formatNb((acierRecommande*0.3)/7.40)],
                ['HA 12', formatNb(acierRecommande*0.3), '50\u03A6', formatNb((acierRecommande*0.3)/10.66)],
                ['HA 16', formatNb(acierRecommande*0.1), '50\u03A6', formatNb((acierRecommande*0.1)/18.96)]
            ]
        });
        addFooter(doc, 2, 6);

        // Page 3
        doc.addPage();
        addHeader(doc, "ÉCHÉANCIER FINANCIER & DÉCAISSEMENT");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Phase de décaissement', 'Avancement physique requis', 'Part du budget (%)']],
            body: [
                ['Phase 1', 'Achèvement Infrastructure', '30%'],
                ['Phase 2', 'Élévation et Dalle RDC', '35%'],
                ['Phase 3', 'Mise hors d\'eau', '35%']
            ]
        });
        addFooter(doc, 3, 6);

        // Page 4
        doc.addPage();
        addHeader(doc, "BUDGET ESTIMATIF DÉTAILLÉ (Prix Dakar)");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Désignation', 'Quantité', 'PU Moyen (FCFA)', 'Total (FCFA)']],
            body: [
                ['Ciment', formatNb(cimentRecommande), '3 850', formatNb(cimentRecommande*3850)],
                ['Acier', formatNb(acierRecommande), '540', formatNb(acierRecommande*540)]
            ]
        });
        addFooter(doc, 4, 6);

        // Page 5 & 6
        doc.addPage();
        addHeader(doc, "KIT SÉCURITÉ CONTRACTUELLE");
        doc.text("Contrat Tâcheron COCC", 10, 30);
        addFooter(doc, 5, 6);
        doc.addPage();
        addHeader(doc, "PROCÈS-VERBAUX DES POINTS D'ARRÊT");
        doc.text("Fiches d'inspection des 6 points d'arrêt.", 10, 30);
        addFooter(doc, 6, 6);
    }

    // =========================================================================
    // SERVICE 3: AUDIT
    // =========================================================================
    else if (serviceType === "audit") {
        // Page 1
        addHeader(doc, "RAPPORT DE CONTRE-EXPERTISE IA");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Score de conformité', 'Niveau d\'alerte', 'Économie négociable (FCFA)']],
            body: [['62/100', 'Surfacturation détectée', '2 500 000 FCFA']] // Mock data if auditResult is missing
        });
        addFooter(doc, 1, 6);

        // Page 2
        doc.addPage();
        addHeader(doc, "MÉTRÉ CONTRADICTOIRE (DESCENTE DE CHARGES)");
        doc.text("Métré détaillé niveau par niveau.", 10, 30);
        addFooter(doc, 2, 6);

        // Page 3
        doc.addPage();
        addHeader(doc, "NOMENCLATURE ARMATURES & CONTRÔLE");
        doc.text("Interdiction des aciers lisses. Protocoles de contrôle HA.", 10, 30);
        addFooter(doc, 3, 6);

        // Page 4
        doc.addPage();
        addHeader(doc, "GRAND TABLEAU D'AUDIT LIGNE PAR LIGNE");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Poste', 'Qté Devis', 'Qté BAEL', 'Écart', 'Diagnostic', 'Impact (FCFA)']],
            body: [
                ['Ciment CEM II 42.5R', '1200 sacs', '900 sacs', '+300', 'Surfacturation', '1 155 000'],
                ['Acier HA FeE500', '15000 kg', '10000 kg', '+5000', 'Surdimensionnement', '2 700 000']
            ]
        });
        addFooter(doc, 4, 6);

        // Page 5 & 6
        doc.addPage();
        addHeader(doc, "CLAUSES DE SAUVEGARDE JURIDIQUE");
        doc.text("Clauses à annexer au marché de travaux.", 10, 30);
        addFooter(doc, 5, 6);
        doc.addPage();
        addHeader(doc, "FICHES D'INSPECTION CONTRADICTOIRE");
        doc.text("Fiches des 6 points d'arrêt.", 10, 30);
        addFooter(doc, 6, 6);
    }

    // =========================================================================
    // SERVICE 4: FINITIONS
    // =========================================================================
    else if (serviceType === "finitions") {
        // Page 1
        addHeader(doc, "BILAN DES SURFACES DE SECOND ŒUVRE");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Désignation', 'Surface (m²)']],
            body: [
                ['Surfaces au sol habitables', formatNb(stot * 0.8)],
                ['Surfaces murales intérieures (Enduit/Peinture)', formatNb(stot * 2.5)],
                ['Surfaces sous-plafonds', formatNb(stot * 0.8)],
                ['Surfaces pièces humides (Faïence)', formatNb(stot * 0.3)]
            ]
        });
        addFooter(doc, 1, 6);

        // Page 2
        doc.addPage();
        addHeader(doc, "LOT CARRELAGE & REVÊTEMENTS");
        doc.autoTable({
            startY: 30, ...tableStyles,
            head: [['Désignation', 'Surface Nette', 'Majoration Chutes (+10%)', 'Total à Commander']],
            body: [
                ['Grès cérame sol', formatNb(stot * 0.8), formatNb(stot * 0.08), formatNb(stot * 0.88)],
                ['Plinthes linéaires (ml)', formatNb(stot * 1.5), formatNb(stot * 0.15), formatNb(stot * 1.65)]
            ]
        });
        addFooter(doc, 2, 6);

        // Page 3
        doc.addPage();
        addHeader(doc, "LOT ÉTANCHÉITÉ TERRASSE & PEINTURE");
        doc.text("Complexe d'étanchéité dakarois : forme de pente 1.5%, primaire d'accrochage bitumineux...", 10, 30, { maxWidth: 190 });
        doc.text("Peinture acrylique extérieure anti-fissuration et vinyle intérieure 2 couches.", 10, 45, { maxWidth: 190 });
        addFooter(doc, 3, 6);

        // Page 4
        doc.addPage();
        addHeader(doc, "LOT ÉLECTRICITÉ & PLOMBERIE/SANITAIRE");
        doc.text("Quantitatif forfaitaire appareillages Legrand/équivalent par pièce...", 10, 30, { maxWidth: 190 });
        doc.text("Canalisations PVC évacuation, tuyauterie PER/PPR alimentation eau...", 10, 40, { maxWidth: 190 });
        addFooter(doc, 4, 6);

        // Page 5 & 6
        doc.addPage();
        addHeader(doc, "CONTRAT CADRE CORPS D'ÉTAT SECONDAIRES");
        doc.text("Clause de garantie de parfait achèvement et retenue de garantie.", 10, 30);
        addFooter(doc, 5, 6);
        doc.addPage();
        addHeader(doc, "ANNEXES TECHNIQUES");
        doc.text("Détails d'exécution et règles de l'art.", 10, 30);
        addFooter(doc, 6, 6);
    }

    // Save PDF
    doc.save(`${refDossier}_${serviceType.toUpperCase()}.pdf`);
};
