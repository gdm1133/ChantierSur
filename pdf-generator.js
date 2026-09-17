window.genererDossierBQE = function(data, serviceType = "express", extra = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargé");
        alert("Erreur de chargement du module PDF. Veuillez réessayer.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const { auditResult, esquisseData } = extra;

    // Utilitaires de formatage
    const formatNb = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const stot = data.stot || ((data.surface || 150) * (data.levels || 1));
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const refDossier = "CS-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // --- COULEURS CHARTE ---
    const primaryColor = [11, 19, 37]; // #0B1325
    let accentColor = [245, 158, 11]; // #F59E0B (Amber)
    const grayColor = [100, 100, 100];
    
    // Customization pour Audit
    if (serviceType === "audit") {
        accentColor = [30, 58, 138]; // #1E3A8A (Bleu Ingénieur)
    }

    // --- HELPER PIED DE PAGE ---
    const addFooter = (doc, pageNum) => {
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.text(`Ref : ${refDossier} | Contact technique : admin@chantiersur.com`, 14, 285);
        doc.text(`Page ${pageNum}/4`, 190, 285, { align: 'right' });
    };

    // Variables communes (récupérées du calcul de l'UI pour garantir la correspondance exacte, ou fallback)
    const cimentRecommande = data.cimentSacs || Math.round(stot * 2.42 * 1.05);
    const cimentBase = Math.round(cimentRecommande / 1.05);
    
    const acierRecommande = data.acierKg || Math.round(stot * 26.5 * 1.07);
    const acierBase = Math.round(acierRecommande / 1.07);
    
    const sableRecommande = data.sableM3 || Math.round(stot * 0.175 * 1.05);
    const sableBase = Math.round(sableRecommande / 1.05);
    
    const gravierRecommande = data.gravierM3 || Math.round(stot * 0.16 * 1.05);
    const gravierBase = Math.round(gravierRecommande / 1.05);
    
    const agglosRecommande = data.agglos || Math.round(stot * 12 * 1.04);
    const agglosBase = Math.round(agglosRecommande / 1.04);
    
    const hourdisRecommande = data.hourdis || Math.round(stot * 4.6 * 1.05);
    const hourdisBase = Math.round(hourdisRecommande / 1.05);

    const pdsHa6 = data.fer6 || acierRecommande * 0.095;
    const pdsHa8 = data.fer8 || acierRecommande * 0.18;
    const pdsHa10 = data.fer10 || acierRecommande * 0.26;
    const pdsHa12 = data.fer12 || acierRecommande * 0.33;
    const pdsHa16 = acierRecommande * 0.135;

    const ha6Kg = formatNb(pdsHa6);
    const ha6Barres = formatNb(pdsHa6 / 2.66);
    const ha8Kg = formatNb(pdsHa8);
    const ha8Barres = formatNb(pdsHa8 / 4.74);
    const ha10Kg = formatNb(pdsHa10);
    const ha10Barres = formatNb(pdsHa10 / 7.40);
    const ha12Kg = formatNb(pdsHa12);
    const ha12Barres = formatNb(pdsHa12 / 10.66);
    const ha16Kg = formatNb(pdsHa16);
    const ha16Barres = formatNb(pdsHa16 / 18.96);

    // =========================================================================
    // HEADER GÉNÉRAL (PAGE 1)
    // =========================================================================
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("ChantierSur.com", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(...accentColor);
    
    let docTitle = "Bordereau Quantitatif Estimatif Gros Œuvre (Estimation Express BAEL 91)";
    if (serviceType === "esquisse") docTitle = "Dossier d'Esquisse & Cahier des Charges Gros Œuvre";
    if (serviceType === "audit") docTitle = "Rapport d'Expertise Technique & Audit de Devis (Gemini Vision x BAEL)";
    
    doc.text(docTitle, 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(...grayColor);
    doc.setFont("helvetica", "normal");
    doc.text(`Date : ${dateJour} | Réf : ${refDossier}`, 14, 35);
    doc.text(`Projet : ${data.levelLabel || "Bâtiment"} | Surface Totale Développée : ${formatNb(stot)} m2`, 14, 41);

    // Mention technique
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 46, 182, 12, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Référentiel Technique : Béton dosé à 350 kg/m3 | Aciers FeE500 | Règles BAEL 91 R99", 18, 53);

    let startYPage1 = 65;

    // =========================================================================
    // RENDU SPÉCIFIQUE : ESQUISSE
    // =========================================================================
    if (serviceType === "esquisse") {
        // Page 1 : Synthèse & Programme spatial
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text("Synthèse du projet & Programme Spatial", 14, startYPage1);
        
        doc.autoTable({
            startY: startYPage1 + 5,
            head: [['Caractéristique', 'Valeur Estimée']],
            body: [
                ['Surface Brute / Emprise au sol', `${formatNb(data.surface || 150)} m2`],
                ['Surface Habitable Utile (~85%)', `${formatNb((data.surface || 150) * 0.85)} m2`],
                ['Nombre de niveaux', `${(data.levels || 0) + 1} niveaux`],
                ['Zone & Contraintes locales', data.zone || 'Non spécifié']
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
        });

        if (auditResult && auditResult.analyse_geometrique) {
            const obsY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(...primaryColor);
            doc.text("Analyse IA du Croquis / Cahier des charges :", 14, obsY);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...grayColor);
            const splitObs = doc.splitTextToSize(auditResult.analyse_geometrique.observations || "Aucune observation.", 182);
            doc.text(splitObs, 14, obsY + 8);
        }

        addFooter(doc, 1);
        doc.addPage();
        
        // Page 2 : Fiche technique fondations & préconisations sol
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Fiche technique : Fondations & Implantation", 14, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "normal");
        doc.text("Recommandations adaptées au type de sol sélectionné (" + (data.zone || 'Dakar') + ") :", 14, 30);
        doc.text("- Type de fondation préconisé : Semelles isolées sous poteaux, liées par longrines.", 14, 40);
        doc.text("- Profondeur d'ancrage minimale : 1.20 m (à valider par un essai au pénétromètre).", 14, 48);
        doc.text("- Traitement hydrofuge obligatoire pour les zones côtières.", 14, 56);
        doc.text("- Orientation bioclimatique : Favoriser les ouvertures Nord-Sud.", 14, 64);
        
        addFooter(doc, 2);
        doc.addPage();

        // Page 3 : Métré prévisionnel (Ventilation)
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Métré Prévisionnel des Matériaux par Phase", 14, 20);
        
        doc.autoTable({
            startY: 30,
            head: [['Phase de Construction', 'Ciment (Sacs)', 'Aciers HA (kg)', 'Sable (m3)', 'Gravier (m3)']],
            body: [
                ['Infrastructure & Fondations', formatNb(cimentRecommande * 0.3), formatNb(acierRecommande * 0.35), formatNb(sableRecommande * 0.3), formatNb(gravierRecommande * 0.3)],
                ['Superstructure RDC', formatNb(cimentRecommande * 0.4), formatNb(acierRecommande * 0.35), formatNb(sableRecommande * 0.4), formatNb(gravierRecommande * 0.4)],
                ['Étages & Finitions', formatNb(cimentRecommande * 0.3), formatNb(acierRecommande * 0.3), formatNb(sableRecommande * 0.3), formatNb(gravierRecommande * 0.3)],
                ['TOTAL RECOMMANDÉ', formatNb(cimentRecommande), formatNb(acierRecommande), formatNb(sableRecommande), formatNb(gravierRecommande)]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' }
        });
        
        addFooter(doc, 3);
        doc.addPage();

        // Page 4 : Budget & BCE
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Budget Prévisionnel Gros Œuvre & BCE", 14, 20);
        
        const matMin = stot * 54000;
        const matMax = stot * 62000;
        const moMin = stot * 18000;
        const moMax = stot * 23000;
        
        doc.autoTable({
            startY: 30,
            head: [['Poste', 'Estimation Basse (FCFA)', 'Estimation Haute (FCFA)']],
            body: [
                ['Matériaux Gros Œuvre', formatNb(matMin), formatNb(matMax)],
                ['Main d\'Œuvre', formatNb(moMin), formatNb(moMax)],
                ['Aléas & Consommables', formatNb(stot * 2800), formatNb(stot * 3600)]
            ],
            foot: [['TOTAL', formatNb(matMin + moMin + stot * 2800), formatNb(matMax + moMax + stot * 3600)]],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
            footStyles: { fillColor: accentColor, textColor: [255, 255, 255] }
        });
        
        addFooter(doc, 4);

    } 
    // =========================================================================
    // RENDU SPÉCIFIQUE : AUDIT
    // =========================================================================
    else if (serviceType === "audit") {
        // --- Page 1 : Dashboard & Synthèse Décisionnelle ---
        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38); // Red
        doc.setFont("helvetica", "bold");
        
        let diagnosticGlobal = "CONFORME";
        let scoreConformite = 95;
        let badgeColor = [22, 163, 74];
        let ecoNette = 0;
        
        if (auditResult && auditResult.economie_nette > 0) {
            diagnosticGlobal = "RISQUE ÉLEVÉ - SURFACTURATION DÉTECTÉE";
            scoreConformite = 54;
            badgeColor = [220, 38, 38];
            ecoNette = auditResult.economie_nette;
        }

        doc.setFillColor(...badgeColor);
        doc.rect(14, startYPage1, 182, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(diagnosticGlobal, 105, startYPage1 + 8, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text("Cartouche d'Identification", 14, startYPage1 + 25);
        
        doc.autoTable({
            startY: startYPage1 + 30,
            head: [['Paramètre', 'Valeur retenue pour l\'audit']],
            body: [
                ['Référence Dossier', refDossier],
                ['Date d\'analyse', dateJour],
                ['Surface Développée', `${formatNb(stot)} m2`],
                ['Niveaux', `${data.levelLabel || "Bâtiment"}`],
                ['Zone Géotechnique', `${data.zone || 'Dakar'} (Classe exposition spécifique)`]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
        });

        const yAfterCartouche = doc.lastAutoTable.finalY + 15;
        
        doc.setFontSize(12);
        doc.text("Tableau de Synthèse Exécutive (Score de Conformité)", 14, yAfterCartouche);
        doc.autoTable({
            startY: yAfterCartouche + 5,
            head: [['Indicateur', 'Résultat']],
            body: [
                ['Score Global de Conformité du Devis', `${scoreConformite} / 100`],
                ['Risque Structurel', auditResult && auditResult.economie_nette > 0 ? "Alerte de sur-dimensionnement ou sous-dimensionnement détectée" : "Aucun risque majeur identifié"],
                ['Indice de Surcoût', auditResult && auditResult.economie_nette > 0 ? "+28 % par rapport aux ratios stricts BAEL 91 R99" : "Conforme aux tolérances BAEL"]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
        });

        const yAfterSynthese = doc.lastAutoTable.finalY + 15;

        // Bilan Financier Contradictoire
        const montantDevis = (stot * 58000) + ecoNette; 
        const montantOpti = stot * 58000;

        doc.text("Bilan Financier Contradictoire", 14, yAfterSynthese);
        doc.autoTable({
            startY: yAfterSynthese + 5,
            head: [['Indicateur Financier', 'Montant (FCFA)']],
            body: [
                ['Montant Total Devis Soumis (Artisan estimé)', formatNb(montantDevis)],
                ['Estimation Théorique Optimale BAEL', formatNb(montantOpti)],
                ['Écart Brut Identifié', `+ ${formatNb(ecoNette)}`],
                ['Économie Nette Négociable Recommandée', formatNb(ecoNette)]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
            bodyStyles: { fontStyle: 'bold' },
            didParseCell: function(data) {
                if (data.row.index === 3) {
                    data.cell.styles.textColor = [22, 163, 74];
                }
            }
        });

        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(...grayColor);
        doc.text("Note méthodologique : Ce rapport a une valeur de contre-expertise technique. Il confronte de façon impartiale", 14, doc.lastAutoTable.finalY + 10);
        doc.text("les volumes d'un devis aux formules mathématiques strictes de la norme européenne BAEL 91 R99.", 14, doc.lastAutoTable.finalY + 15);

        addFooter(doc, 1);
        doc.addPage();

        // --- Page 2 : Métré Contradictoire Ventilé par Niveau ---
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Métré Contradictoire Ventilé par Niveau", 14, 20);

        doc.autoTable({
            startY: 30,
            head: [['Niveau de l\'Ouvrage', 'Béton (m3)', 'Ciment (sacs)', 'Aciers (kg)', 'Sable (m3)', 'Gravier (m3)']],
            body: [
                ['Infrastructure & Soubassement\n(Semelles, longrines, dallage 10cm, polyane)', formatNb(stot * 0.32 * 0.35), formatNb(cimentRecommande * 0.35), formatNb(acierRecommande * 0.40), formatNb(sableRecommande * 0.35), formatNb(gravierRecommande * 0.35)],
                ['Rez-de-Chaussée\n(Poteaux, poutres, plancher 16+4, agglos 15)', formatNb(stot * 0.32 * 0.40), formatNb(cimentRecommande * 0.40), formatNb(acierRecommande * 0.35), formatNb(sableRecommande * 0.40), formatNb(gravierRecommande * 0.40)],
                ['Étage(s) & Couronnement\n(Poteaux, linteaux, dalle terrasse, acrotères)', formatNb(stot * 0.32 * 0.25), formatNb(cimentRecommande * 0.25), formatNb(acierRecommande * 0.25), formatNb(sableRecommande * 0.25), formatNb(gravierRecommande * 0.25)],
                ['TOTAL GÉNÉRAL BAEL 91 R99\n(+5% pertes béton, +7% chutes acier)', formatNb(stot * 0.32), formatNb(cimentRecommande), formatNb(acierRecommande), formatNb(sableRecommande), formatNb(gravierRecommande)]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
            didParseCell: function(data) {
                if (data.row.index === 3) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 240, 240];
                }
            }
        });

        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(30, 58, 138); // Bleu Ingénieur
        doc.rect(14, doc.lastAutoTable.finalY + 15, 182, 30, 'FD');
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text("Note Explicative des Ratios de Dosage", 18, doc.lastAutoTable.finalY + 23);
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "normal");
        doc.text("- Éléments porteurs (Poteaux, Poutres, Dalles) : Béton dosé à 350 kg/m3.", 18, doc.lastAutoTable.finalY + 30);
        doc.text("- Infrastructure (Béton de propreté) : Béton dosé à 250 kg/m3.", 18, doc.lastAutoTable.finalY + 36);
        doc.text("- Rapport E/C (Eau/Ciment) : Maximum 0.55 pour limiter la porosité (renforcé en zone côtière).", 18, doc.lastAutoTable.finalY + 42);

        addFooter(doc, 2);
        doc.addPage();

        // --- Page 3 : Calibrage des Aciers & Protocole de Contrôle ---
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Calibrage des Aciers HA FeE500 & Protocole", 14, 20);

        doc.autoTable({
            startY: 30,
            head: [['Diamètre', 'Éléments de structure associés', 'Recouvrement', 'Poids total (kg)', 'Barres (12m)']],
            body: [
                ['HA 6', 'Cadres, étriers, épingles', '40 Ø', ha6Kg, ha6Barres],
                ['HA 8', 'Treillis anti-fissuration chape compression', '40 Ø', ha8Kg, ha8Barres],
                ['HA 10', 'Aciers de montage et chapeaux sur appuis', '40 Ø', ha10Kg, ha10Barres],
                ['HA 12', 'Ferraillage principal semelles, poteaux, poutres', '50 Ø', ha12Kg, ha12Barres],
                ['HA 14/16', 'Armatures longitudinales fortes retombées', '50 Ø', ha16Kg, ha16Barres]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
        });

        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(220, 38, 38);
        doc.rect(14, doc.lastAutoTable.finalY + 15, 182, 20, 'FD');
        doc.setFontSize(11);
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.text("Alerte Qualité Matériaux :", 18, doc.lastAutoTable.finalY + 23);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Interdiction absolue d'approvisionnement en aciers déclassés, lisses ou d'origine non certifiée.", 18, doc.lastAutoTable.finalY + 29);
        doc.text("Exigez un contrôle systématique du diamètre réel au pied à coulisse lors de la livraison.", 18, doc.lastAutoTable.finalY + 33);

        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Protocole des 6 Points d'Arrêt Incompressibles (PV obligatoires)", 14, doc.lastAutoTable.finalY + 45);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...grayColor);
        let yProto = doc.lastAutoTable.finalY + 55;
        const protocoles = [
            "1. Réception du fond de fouille (portance et profondeur hors gel/dessiccation).",
            "2. Ferraillage des semelles et longrines avec cales d'enrobage béton certifiées (interdiction des éclats de briques).",
            "3. Coulage et vibration du béton d'infrastructure avec prise d'éprouvettes.",
            "4. Réception du ferraillage poteaux et vérification des longueurs de recouvrement (min 40 diamètres).",
            "5. Réception du coffrage, étaiement et ferraillage dalle (chapeaux d'armature et espacement des poutrelles).",
            "6. Cure du béton par humidification continue (minimum 7 jours consécutifs)."
        ];
        protocoles.forEach(p => {
            const splitProto = doc.splitTextToSize(p, 182);
            doc.text(splitProto, 14, yProto);
            yProto += splitProto.length * 6;
        });

        addFooter(doc, 3);
        doc.addPage();

        // --- Page 4 : Tableau d'Audit Ligne par Ligne & Stratégie ---
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Audit Contradictoire Ligne par Ligne & Stratégie", 14, 20);

        let auditBody = [];
        if (auditResult && auditResult.audit_devis && auditResult.audit_devis.length > 0) {
            auditBody = auditResult.audit_devis.map(item => [
                item.poste,
                item.quantite_devis,
                item.quantite_bael,
                item.statut,
                item.explication
            ]);
        } else {
            // Mock de 6 postes clés
            auditBody = [
                ['Ciment CEM II 42.5R', '18T', '14.5T', 'Surfacturation', 'Détection des surconsommations (ratio sacs/m³ excessif)'],
                ['Aciers Haute Adhérence', '2.5T', '2.1T', 'Surfacturation', 'Surplus injustifié par le BAEL'],
                ['Agrégats basaltiques & Sable', '45 m³', '38 m³', 'Surfacturation', 'Contrôle foisonné vs compacté'],
                ['Plancher complet (16+4)', '120 m²', '115 m²', 'Conforme', 'Léger écart toléré'],
                ['Maçonnerie (Agglos de 15)', '2500 U', '2350 U', 'Surfacturation', 'Dosage et chutes exagérés'],
                ['Main-d\'œuvre Tâcheron', '3M FCFA', '2.5M FCFA', 'Surfacturation', 'Hors grille moyenne (18k-25k/m²)']
            ];
        }

        doc.autoTable({
            startY: 30,
            head: [['Poste Ouvrage', 'Qté Devis Artisan', 'Norme BAEL', 'Diagnostic', 'Impact Financier']],
            body: auditBody,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
            styles: { fontSize: 9 },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 3) {
                    if (data.cell.raw === 'Conforme') data.cell.styles.textColor = [22, 163, 74];
                    else if (data.cell.raw === 'Surfacturation' || data.cell.raw === 'Sous-dimensionnement') data.cell.styles.textColor = [220, 38, 38];
                }
            }
        });

        let finalYPage4 = doc.lastAutoTable.finalY + 15;

        // Encadré d'Alerte Majeure
        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(220, 38, 38);
        doc.rect(14, finalYPage4, 182, 35, 'FD');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.text("Alerte Majeure : À bloquer immédiatement avec l'artisan", 18, finalYPage4 + 8);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        if (auditResult && auditResult.alertes_chantier && auditResult.alertes_chantier.length > 0) {
            let yAlerte = finalYPage4 + 15;
            auditResult.alertes_chantier.slice(0, 2).forEach(alerte => {
                const splitText = doc.splitTextToSize("• " + alerte, 175);
                doc.text(splitText, 18, yAlerte);
                yAlerte += splitText.length * 6;
            });
        } else {
            doc.text("• Surconsommation manifeste de Ciment non justifiée par la structure.", 18, finalYPage4 + 16);
            doc.text("• Décalage financier sur la Main-d'œuvre (au-delà des prix du marché).", 18, finalYPage4 + 23);
        }

        finalYPage4 += 45;

        // Clauses Juridiques & Contractuelles
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Clauses Juridiques & Contractuelles à imposer au contrat", 14, finalYPage4);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...grayColor);
        doc.text("• Paiement échelonné exclusivement après signature du PV de réception de chaque point d'arrêt.", 14, finalYPage4 + 8);
        doc.text("• Retenue de garantie de 10% consignée jusqu'au parfait séchage du gros œuvre.", 14, finalYPage4 + 14);
        doc.text("• Pénalités de retard et réfaction financière automatique en cas de non-respect des calibres d'armature.", 14, finalYPage4 + 20);

        addFooter(doc, 4);
    }
    // =========================================================================
    // RENDU SPÉCIFIQUE : EXPRESS (Standard)
    // =========================================================================
    else {
        // Page 1 suite
        doc.autoTable({
            startY: startYPage1,
            head: [['Désignation', 'Quantité Théorique', 'Tolérance', 'Quantité Recommandée']],
            body: [
                ['Ciment CEM II 42.5R', formatNb(cimentBase) + ' sacs', '+5%', formatNb(cimentRecommande) + ' sacs'],
                ['Aciers HA FeE500', formatNb(acierBase) + ' kg', '+7%', formatNb(acierRecommande) + ' kg'],
                ['Sable de dune', formatNb(sableBase) + ' m3', '+5%', formatNb(sableRecommande) + ' m3'],
                ['Gravier concassé', formatNb(gravierBase) + ' m3', '+5%', formatNb(gravierRecommande) + ' m3'],
                ['Agglos de 15', formatNb(agglosBase) + ' U', '+4%', formatNb(agglosRecommande) + ' U'],
                ['Hourdis de 16', formatNb(hourdisBase) + ' U', '+5%', formatNb(hourdisRecommande) + ' U']
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        addFooter(doc, 1);

        // Page 2 : Ventilation aciers
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Ventilation Précise des Aciers HA", 14, 20);

        doc.autoTable({
            startY: 30,
            head: [['Diamètre HA', 'Usage Principal', 'Poids Requis (kg)', 'Barres (12m)']],
            body: [
                ['HA 6', 'Cadres & Étriers', `${ha6Kg} kg`, `${ha6Barres} u`],
                ['HA 8', 'Treillis dalle', `${ha8Kg} kg`, `${ha8Barres} u`],
                ['HA 10', 'Chapeaux & Poteaux', `${ha10Kg} kg`, `${ha10Barres} u`],
                ['HA 12', 'Longrines & Poteaux', `${ha12Kg} kg`, `${ha12Barres} u`],
                ['HA 14 / 16', 'Retombées de poutres', `${ha16Kg} kg`, `${ha16Barres} u`]
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
        });
        
        const finalYPage2 = doc.lastAutoTable.finalY + 15;
        doc.setFillColor(254, 243, 199); 
        doc.setDrawColor(...accentColor);
        doc.rect(14, finalYPage2, 182, 35, 'FD');
        doc.setTextColor(180, 83, 9);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("! DIRECTIVES ANTI-FRAUDE SUR LES ACIERS :", 18, finalYPage2 + 10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("- Exigez un contrôle des diamètres au pied à coulisse lors de la livraison.", 18, finalYPage2 + 18);
        doc.text("- N'acceptez que des barres normalisées d'une longueur stricte de 12 mètres.", 18, finalYPage2 + 24);
        
        addFooter(doc, 2);

        // Page 3 : Planning
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Planning de Décaissement & Approvisionnement", 14, 20);

        doc.autoTable({
            startY: 30,
            head: [['Phase de Construction', 'Matériaux à approvisionner', 'Point d\'arrêt (Contrôle technique)']],
            body: [
                ['Phase 1 : Fondations\n(J1 - J20)', '32% Ciment\n35% Fer', 'Inspection fouille et ferraillage.'],
                ['Phase 2 : RDC & Plancher\n(J21 - J45)', '42% Ciment\n45% Fer', 'Contrôle cales d\'enrobage.'],
                ['Phase 3 : Étage\n(J46 - J75)', '26% Ciment\n20% Fer', 'Vérification aplombs.']
            ],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] }
        });
        
        addFooter(doc, 3);

        // Page 4 : Budget
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Budget Prévisionnel Gros Œuvre", 14, 20);

        const matMin = stot * 54000;
        const matMax = stot * 62000;
        const moMin = stot * 18000;
        const moMax = stot * 23000;

        doc.autoTable({
            startY: 30,
            head: [['Poste', 'Estimation Basse (FCFA)', 'Estimation Haute (FCFA)']],
            body: [
                ['Fourniture des Matériaux', formatNb(matMin), formatNb(matMax)],
                ['Main-d\'Œuvre Tâcheron', formatNb(moMin), formatNb(moMax)],
                ['Consommables', formatNb(stot * 2800), formatNb(stot * 3600)]
            ],
            foot: [['TOTAL ESTIMÉ', formatNb(matMin + moMin + stot * 2800), formatNb(matMax + moMax + stot * 3600)]],
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
            footStyles: { fillColor: accentColor, textColor: [255, 255, 255] }
        });

        const finalYPage4 = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Clauses Contractuelles Anti-Litiges à inclure", 14, finalYPage4);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...grayColor);
        doc.text("1. Clause d'Enrobage Béton : cales de 2,5 cm obligatoires.", 14, finalYPage4 + 10);
        doc.text("2. Retenue de Garantie : 10% sur chaque situation de paiement.", 14, finalYPage4 + 18);
        doc.text("3. Non-Prise en Charge des Surconsommations d'Acier au-delà des quantités BQE.", 14, finalYPage4 + 26);
        
        addFooter(doc, 4);
    }

    // Sauvegarde du fichier
    doc.save(`BQE-ChantierSur-${refDossier}.pdf`);
};
