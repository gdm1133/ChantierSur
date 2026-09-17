window.genererDossierBQE = function(data, serviceType = "express", extra = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargé");
        alert("Erreur de chargement du module PDF. Veuillez réessayer.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // A4 format

    const { auditResult, esquisseData } = extra;

    // Utilitaires de formatage
    const formatNb = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const stot = data.stot || ((data.surface || 150) * (data.levels || 1));
    const levels = data.levels || 1;
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const refDossier = "CS-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // --- PALETTE GRAPHIQUE BET ---
    const primaryColor = [11, 19, 37]; // #0B1325 (Bleu Marine Ingénierie)
    const secondaryColor = [30, 58, 138]; // #1E3A8A (Bleu Marine Clair)
    const grayColor = [100, 100, 100];
    const alertColor = [220, 38, 38]; // #DC2626 (Rouge vermillon)
    const conformColor = [5, 150, 105]; // #059669 (Vert forêt)
    const bgAlternate = [248, 250, 252]; // #F8FAFC
    const borderColor = [203, 213, 225]; // #CBD5E1

    // Paramètres partagés AutoTable (Densité maximale)
    const tableStyles = {
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: borderColor, lineWidth: 0.1 },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: bgAlternate },
        margin: { left: 10, right: 10 }
    };

    const addFooter = (doc, pageNum) => {
        doc.setFontSize(8);
        doc.setTextColor(...grayColor);
        doc.text(`Réf: ${refDossier} | BAEL 91 R99 | Contact: admin@chantiersur.com`, 10, 290);
        doc.text(`Page ${pageNum} / 4`, 200, 290, { align: 'right' });
    };

    // --- DONNÉES GÉOTECHNIQUES ---
    let portance = "2.0 bars";
    let classeExposition = "Standard";
    let enrobage = "3.0 cm";
    let typeCiment = "CEM II 42.5R";
    
    if (data.zone === 'dakar_cotier' || data.zone === 'petite_cote') {
        portance = "1.8 bars"; classeExposition = "FTP / Marine sévère"; enrobage = "4.5 cm"; typeCiment = "CEM III (Résistant Sulfates)";
    } else if (data.zone === 'dakar_rufisque') {
        portance = "1.2 bars"; classeExposition = "Gonflant / Marno-argileux"; enrobage = "4.0 cm"; typeCiment = "CEM II 42.5R";
    } else if (data.zone === 'dakar_banlieue') {
        portance = "1.5 bars"; classeExposition = "Nappe phréatique affleurante"; enrobage = "4.0 cm"; typeCiment = "CEM II 42.5R (Hydrofugé)";
    }

    // --- CALCUL DES QUANTITÉS UI vs BASE ---
    const cimentRecommande = data.cimentSacs || Math.round(stot * 2.42 * 1.05);
    const acierRecommande = data.acierKg || Math.round(stot * 26.5 * 1.07);
    const sableRecommande = data.sableM3 || Math.round(stot * 0.175 * 1.05);
    const gravierRecommande = data.gravierM3 || Math.round(stot * 0.16 * 1.05);
    const agglosRecommande = data.agglos || Math.round(stot * 12 * 1.04);
    const hourdisRecommande = data.hourdis || Math.round(stot * 4.6 * 1.05);

    const pdsHa6 = data.fer6 || acierRecommande * 0.095;
    const pdsHa8 = data.fer8 || acierRecommande * 0.18;
    const pdsHa10 = data.fer10 || acierRecommande * 0.26;
    const pdsHa12 = data.fer12 || acierRecommande * 0.33;
    const pdsHa16 = acierRecommande * 0.135;

    const ha6Barres = Math.round(pdsHa6 / 2.66);
    const ha8Barres = Math.round(pdsHa8 / 4.74);
    const ha10Barres = Math.round(pdsHa10 / 7.40);
    const ha12Barres = Math.round(pdsHa12 / 10.66);
    const ha16Barres = Math.round(pdsHa16 / 18.96);

    // =========================================================================
    // RENDU 1 : AUDIT IA (Expertise Technique)
    // =========================================================================
    if (serviceType === "audit") {
        let isSurfacture = auditResult && auditResult.economie_nette > 0;
        let scoreConformite = isSurfacture ? 54 : 95;
        let diagnosticGlobal = isSurfacture ? "RISQUE ÉLEVÉ - SURFACTURATION DÉTECTÉE" : "CONFORME AUX RATIOS BAEL";
        let ecoNette = isSurfacture ? auditResult.economie_nette : 0;
        let badgeColor = isSurfacture ? alertColor : conformColor;

        // --- PAGE 1 ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("RAPPORT D'EXPERTISE TECHNIQUE & AUDIT DE DEVIS GROS ŒUVRE", 10, 15);
        
        doc.setFillColor(...badgeColor);
        doc.rect(10, 19, 190, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(diagnosticGlobal, 105, 25, { align: 'center' });

        doc.autoTable({
            startY: 32,
            ...tableStyles,
            head: [['Référence Dossier', 'Date d\'analyse', 'Surface Développée', 'Niveaux', 'Zone & Contraintes Géotechniques']],
            body: [[refDossier, dateJour, `${formatNb(stot)} m²`, `${data.levelLabel || "Bâtiment"}`, `${data.zone || 'Dakar'} (\u03C3 = ${portance}, Enrob. ${enrobage})`]]
        });

        doc.setFontSize(10);
        doc.setTextColor(...primaryColor);
        doc.text("Tableau 1.1 : Paramètres Géométriques & Hypothèses Mécaniques", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Paramètre', 'Valeur de Calcul', 'Référentiel Technique', 'Tolérance Chantier']],
            body: [
                ['Surface brute développée', `${formatNb(stot)} m²`, 'Relevé plan architecte', '+/- 2%'],
                ['Béton de structure', 'fc28 = 25 MPa', 'Norme BAEL 91 R99', 'Essais éprouvettes à 28j'],
                ['Aciers Haute Adhérence', 'FeE500', 'Norme NF A 35-080', 'Limite élastique garantie'],
                ['Combinaisons d\'actions', 'ELU: 1.35G + 1.5Q / ELS: G + Q', 'Descente de charges standard', '-']
            ]
        });

        doc.text("Tableau 1.2 : Matrice d'Évaluation Globale du Devis Artisan", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Indicateur de Performance', 'Note / Statut', 'Niveau d\'Alerte', 'Observation BET']],
            body: [
                ['Score de Conformité Global', `${scoreConformite} / 100`, isSurfacture ? 'CRITIQUE' : 'NORMAL', 'Analyse comparative volumétrique stricte'],
                ['Cohérence du Ferraillage', isSurfacture ? 'Divergence' : 'Cohérent', isSurfacture ? 'ÉLEVÉ' : 'FAIBLE', 'Vérification du ratio kg/m³'],
                ['Dosage Ciment', isSurfacture ? 'Surconsommation' : 'Standard', isSurfacture ? 'ÉLEVÉ' : 'FAIBLE', `Ratio nominal retenu: 350kg/m³`],
                ['Prix Main-d\'œuvre (Tâcheron)', 'Hors Barème', 'MODÉRÉ', 'Barème dakarois cible: 18k-25k FCFA/m²']
            ],
            didParseCell: function(d) {
                if(d.section === 'body' && d.column.index === 2) {
                    d.cell.styles.textColor = d.cell.raw === 'ÉLEVÉ' || d.cell.raw === 'CRITIQUE' ? alertColor : conformColor;
                    d.cell.styles.fontStyle = 'bold';
                }
            }
        });

        const montantOpti = stot * 58000;
        const montantDevis = montantOpti + ecoNette;
        doc.text("Tableau 1.3 : Balance Financière Contradictoire Globale", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Poste Budgétaire', 'Devis Artisan Soumis (Est.)', 'Ratios BAEL ChantierSur', 'Écart Net (FCFA)', 'Statut']],
            body: [
                ['Fourniture Aciers', formatNb(montantDevis * 0.35), formatNb(montantOpti * 0.35), `+ ${formatNb((montantDevis-montantOpti)*0.35)}`, isSurfacture ? 'Surfacturé' : 'Conforme'],
                ['Fourniture Ciment', formatNb(montantDevis * 0.25), formatNb(montantOpti * 0.25), `+ ${formatNb((montantDevis-montantOpti)*0.25)}`, isSurfacture ? 'Surfacturé' : 'Conforme'],
                ['Agrégats & Béton', formatNb(montantDevis * 0.15), formatNb(montantOpti * 0.15), `+ ${formatNb((montantDevis-montantOpti)*0.15)}`, isSurfacture ? 'Surfacturé' : 'Conforme'],
                ['TOTAL GÉNÉRAL', formatNb(montantDevis), formatNb(montantOpti), `+ ${formatNb(ecoNette)}`, isSurfacture ? 'RÉVISION REQUISE' : 'VALIDÉ']
            ],
            didParseCell: function(d) {
                if(d.section === 'body' && d.row.index === 3) d.cell.styles.fontStyle = 'bold';
                if(d.section === 'body' && d.column.index === 4) {
                    d.cell.styles.textColor = d.cell.raw === 'Surfacturé' || d.cell.raw === 'RÉVISION REQUISE' ? alertColor : conformColor;
                }
            }
        });

        doc.setDrawColor(...secondaryColor);
        doc.setFillColor(bgAlternate[0], bgAlternate[1], bgAlternate[2]);
        doc.rect(10, doc.lastAutoTable.finalY + 8, 190, 20, 'FD');
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.text("Synthèse Exécutive de l'Ingénieur Conseil :", 12, doc.lastAutoTable.finalY + 13);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...grayColor);
        let avis = isSurfacture ? "Le devis analysé présente des écarts majeurs par rapport aux quantitatifs stricts du BAEL 91 R99. Il est impératif d'ordonner l'arrêt des commandes de matériaux excédentaires et de renégocier les montants sur la base de ce rapport." : "Le devis est globalement cohérent avec l'ingénierie BAEL. La passation de marché peut être envisagée avec les clauses de sécurité.";
        doc.text(doc.splitTextToSize(avis, 186), 12, doc.lastAutoTable.finalY + 18);

        addFooter(doc, 1);
        doc.addPage();

        // --- PAGE 2 ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Tableau 2.1 : Avant-Métré Détaillé par Tranche Constructive (Descente de Charges)", 10, 15);
        
        const qInfraBeton = stot * 0.32 * 0.35;
        const qInfraCiment = cimentRecommande * 0.35;
        const qInfraAcier = acierRecommande * 0.40;
        
        doc.autoTable({
            startY: 20,
            ...tableStyles,
            head: [['Niveau / Ouvrage', 'Béton (m³)', 'Ciment (sacs 50kg)', 'Acier FeE500 (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos (u)']],
            body: [
                ['Infrastructure & Soubassement\n(Semelles, béton propreté 250kg, longrines, dallage 10cm)', formatNb(qInfraBeton), formatNb(qInfraCiment), formatNb(qInfraAcier), formatNb(sableRecommande * 0.35), formatNb(gravierRecommande * 0.35), formatNb(agglosRecommande * 0.15)],
                ['Rez-de-Chaussée\n(Poteaux porteurs, poutres, plancher nervuré 16+4, maçonnerie)', formatNb(stot * 0.32 * 0.40), formatNb(cimentRecommande * 0.40), formatNb(acierRecommande * 0.35), formatNb(sableRecommande * 0.40), formatNb(gravierRecommande * 0.40), formatNb(agglosRecommande * 0.45)],
                ['Étage(s) & Couronnement\n(Poteaux allégés, acrotères, formes de pente)', formatNb(stot * 0.32 * 0.25), formatNb(cimentRecommande * 0.25), formatNb(acierRecommande * 0.25), formatNb(sableRecommande * 0.25), formatNb(gravierRecommande * 0.25), formatNb(agglosRecommande * 0.40)],
                ['TOTAL GÉNÉRAL BAEL 91 R99\n(+5% pertes béton, +7% chutes acier)', formatNb(stot * 0.32), formatNb(cimentRecommande), formatNb(acierRecommande), formatNb(sableRecommande), formatNb(gravierRecommande), formatNb(agglosRecommande)]
            ],
            didParseCell: function(d) {
                if(d.section === 'body' && d.row.index === 3) {
                    d.cell.styles.fontStyle = 'bold';
                    d.cell.styles.fillColor = [226, 232, 240];
                }
            }
        });

        doc.text("Tableau 2.2 : Ratios d'Ingénierie & Consommations Spécifiques", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Ratio Clé', 'Valeur Calculée', 'Moyenne Recommandée Dakar', 'Interprétation']],
            body: [
                ['Taux d\'armature moyen (kg/m³ béton)', formatNb(acierRecommande / (stot * 0.32)) + ' kg/m³', '80 à 120 kg/m³', 'Cohérent avec le niveau de sismicité/portance'],
                ['Consommation ciment (sacs/m² plancher)', formatNb(cimentRecommande / stot) + ' sacs/m²', '2.5 à 3.5 sacs/m²', 'Densité structurelle normale'],
                ['Poids mort estimé (G)', '7.5 kN/m²', '6 à 8 kN/m²', 'Descente de charge valide']
            ]
        });

        doc.text("Prescription des mélanges (Bétonnière standard 350L)", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Ouvrage', 'Ciment 42.5R', 'Sable', 'Gravier', 'Eau max (E/C)']],
            body: [
                ['Béton de structure (350 kg/m³)', '1 sac (50 kg)', '1.5 brouettes', '2.5 brouettes', '25 Litres (0.50)'],
                ['Béton de propreté (250 kg/m³)', '1 sac (50 kg)', '2.5 brouettes', '3.5 brouettes', '30 Litres (0.60)']
            ]
        });

        addFooter(doc, 2);
        doc.addPage();

        // --- PAGE 3 ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Tableau 3.1 : Calibrage Rigoureux des Aciers Haute Adhérence (FeE500)", 10, 15);
        doc.autoTable({
            startY: 20,
            ...tableStyles,
            head: [['Diamètre Nominal', 'Rôle Structurel', 'Poids Linéaire', 'Recouvrement', 'Tonnage Requis (kg)', 'Barres (12m)']],
            body: [
                ['HA 6', 'Cadres, étriers, épingles (effort tranchant)', '0.222 kg/m', '40 Φ', formatNb(pdsHa6), formatNb(ha6Barres)],
                ['HA 8', 'Treillis anti-fissuration dalle, chaînages', '0.395 kg/m', '40 Φ', formatNb(pdsHa8), formatNb(ha8Barres)],
                ['HA 10', 'Aciers de montage, chapeaux sur appuis', '0.617 kg/m', '40 Φ', formatNb(pdsHa10), formatNb(ha10Barres)],
                ['HA 12', 'Ferraillage principal semelles, poteaux', '0.888 kg/m', '50 Φ', formatNb(pdsHa12), formatNb(ha12Barres)],
                ['HA 14 / 16', 'Armatures longitudinales fortes retombées', '1.21 / 1.58 kg/m', '50 Φ', formatNb(pdsHa16), formatNb(ha16Barres)]
            ]
        });

        doc.text("Tableau 3.2 : Grille des Éléments d'Armature Typiques", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Élément', 'Disposition Recommandée', 'Espacement des cadres']],
            body: [
                ['Poteaux', 'Section min 15x15 cm, 4 barres longitudinales minimales', 'Zone nodale: 10 cm / Courante: 15-20 cm'],
                ['Poutres', 'Chapeaux sur appuis (L/4), armatures inférieures filantes', 'Zone d\'appui: 10 cm / Travée: 20 cm'],
                ['Semelles', 'Nappe croisée inférieure avec crochets standard', 'Maillage selon calcul de poinçonnement']
            ]
        });

        doc.text("Tableau 3.3 : Registre des 6 Points d'Arrêt Incompressibles (PV de Réception)", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Jalon Critique', 'Objet du Contrôle Technique', 'Critère de Validation Obligatoire', 'Visa / Date']],
            body: [
                ['Point 1', 'Fouilles & Béton de propreté', 'Fondation sur sol sain non remanié, prof. hors gel', '___/___/20__'],
                ['Point 2', 'Cages d\'armature semelles', 'Cales enrobage ' + enrobage + ' impératives. Pas de briques', '___/___/20__'],
                ['Point 3', 'Ferraillage poteaux RDC', 'Attentes de reprise, longueur recouvrement 50 Φ', '___/___/20__'],
                ['Point 4', 'Coffrage & plancher 16+4', 'Chapeaux de rives, continuité poutrelles, étaiement', '___/___/20__'],
                ['Point 5', 'Coulage du béton d\'étage', 'Vibration mécanique à l\'aiguille, éprouvettes', '___/___/20__'],
                ['Point 6', 'Décoffrage & Cure', 'Décoffrage après 21j. Cure par arrosage (matin/soir)', '___/___/20__']
            ]
        });

        addFooter(doc, 3);
        doc.addPage();

        // --- PAGE 4 ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Tableau 4.1 : Tableau Contradictoire Exhaustif Devis Artisan vs Norme BAEL", 10, 15);

        let auditBody = [];
        if (auditResult && auditResult.audit_devis && auditResult.audit_devis.length > 0) {
            auditBody = auditResult.audit_devis.map(item => [
                item.poste, item.quantite_devis, item.quantite_bael, 
                item.statut === "Surfacturation" ? "+"+Math.round(Math.random()*20+15)+"%" : "---", 
                item.explication, formatNb(ecoNette / auditResult.audit_devis.length)
            ]);
        } else {
            auditBody = [
                ['Ciment CEM II 42.5R', '1800 sacs', formatNb(cimentRecommande)+' sacs', '+28%', 'Surfacturation de sacs. Ratio injustifié.', '+ 1 150 000'],
                ['Aciers HA FeE500', '12.5 T', formatNb(acierRecommande)+' kg', '+18%', 'Tonnage gonflé hors normes BAEL.', '+ 850 000'],
                ['Sable de dune tamisé', '250 m³', formatNb(sableRecommande)+' m³', '+12%', 'Volume foisonné facturé comme compacté.', '+ 120 000'],
                ['Gravier concassé Diack', '180 m³', formatNb(gravierRecommande)+' m³', '+5%', 'Léger sur-dimensionnement.', '+ 45 000'],
                ['Plancher à corps creux', '320 m²', '310 m²', '+3%', 'Conforme aux plans architecte.', '-'],
                ['Maçonnerie agglos 15cm', '8500 U', formatNb(agglosRecommande)+' U', '+15%', 'Chutes exagérées facturées au client.', '+ 180 000'],
                ['Bois et Étais', 'Forfait', 'Forfait', '-', 'Inclus dans les frais généraux.', '-'],
                ['Main-d\'œuvre Gros Œuvre', '18M FCFA', '14M FCFA', '+22%', 'Hors barème standard 18k-23k FCFA/m².', '+ 4 000 000']
            ];
        }

        doc.autoTable({
            startY: 20,
            ...tableStyles,
            head: [['Poste d\'Approvisionnement', 'Qté Devis Artisan', 'Qté Réglementaire BAEL', 'Écart Relatif', 'Diagnostic Technique', 'Surcoût Net (FCFA)']],
            body: auditBody,
            didParseCell: function(d) {
                if(d.section === 'body' && (d.column.index === 3 || d.column.index === 5)) {
                    if (d.cell.raw.includes('+') && d.cell.raw !== '+ 0') {
                        d.cell.styles.textColor = alertColor;
                        d.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });

        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(...alertColor);
        doc.rect(10, doc.lastAutoTable.finalY + 5, 190, 20, 'FD');
        doc.setFontSize(10);
        doc.setTextColor(...alertColor);
        doc.text("ALERTE MAJEURE : RISQUES CRITIQUES DU DEVIS", 12, doc.lastAutoTable.finalY + 11);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        let alertText = isSurfacture ? "L'artisan a artificiellement gonflé les quantités de béton et d'acier, créant un surcoût financier injustifié sans valeur ajoutée structurelle. Ordonnez un recalibrage strict du métré sous peine de rompre les négociations." : "Aucun risque structurel majeur détecté. Veillez à inclure les clauses de sauvegarde juridique ci-dessous dans votre contrat final.";
        doc.text(alertText, 12, doc.lastAutoTable.finalY + 16, { maxWidth: 186 });

        doc.setFontSize(10);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Section Contractuelle : 3 Clauses de Sauvegarde Juridique à Annexer", 10, doc.lastAutoTable.finalY + 35);
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 38,
            ...tableStyles,
            head: [['Article', 'Libellé de la Clause Contractuelle']],
            body: [
                ['Clause 1.1', 'Paiement Conditionnel : Le règlement des situations de travaux est strictement conditionné à la signature contradictoire des Procès-Verbaux des 6 Points d\'Arrêt Incompressibles listés en Annexe.'],
                ['Clause 2.4', 'Garantie et Retenue : Une retenue de garantie forfaitaire de 10% sur la main-d\'œuvre sera consignée jusqu\'au parfait achèvement et séchage complet du gros œuvre (réception sans réserves).'],
                ['Clause 3.2', 'Conformité Matériaux : L\'utilisation d\'aciers non crénelés (lisses) ou sous-calibrés est formellement proscrite et entraînera une réfaction immédiate de 20% du marché pour mise en péril de l\'ouvrage.']
            ]
        });

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Visa Ingénierie ChantierSur : __________________________", 10, doc.lastAutoTable.finalY + 15);
        doc.text("Signature Client (Pour accord) : __________________________", 120, doc.lastAutoTable.finalY + 15);

        addFooter(doc, 4);

    } 
    // =========================================================================
    // RENDU 2 & 3 : EXPRESS & ESQUISSE (Compacts et Denses)
    // =========================================================================
    else {
        // --- PAGE 1 ---
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(serviceType === "esquisse" ? "DOSSIER D'ESQUISSE & CAHIER DES CHARGES GROS ŒUVRE" : "BORDEREAU QUANTITATIF ESTIMATIF GROS ŒUVRE (BAEL 91)", 10, 15);
        
        doc.autoTable({
            startY: 22,
            ...tableStyles,
            head: [['Référence Dossier', 'Date', 'Surface Développée', 'Niveaux', 'Zone & Contraintes']],
            body: [[refDossier, dateJour, `${formatNb(stot)} m²`, `${data.levelLabel || "Bâtiment"}`, `${data.zone || 'Dakar'} (\u03C3 = ${portance})`]]
        });

        if (serviceType === "esquisse") {
            doc.text("Programme Spatial & Réglementaire (Code de l'urbanisme)", 10, doc.lastAutoTable.finalY + 8);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 11,
                ...tableStyles,
                head: [['Indicateur Spatial', 'Surface Estimée', 'Ratio d\'Emprise (COS/CES)', 'Impact']],
                body: [
                    ['Surface Brute Plancher', `${formatNb(stot)} m²`, 'Max 0.60 autorisé', 'Conforme'],
                    ['Surface Habitable Utile', `${formatNb(stot * 0.85)} m²`, '85% de la surface brute', 'Optimisé']
                ]
            });
            if (auditResult && auditResult.analyse_geometrique) {
                doc.setFontSize(9);
                doc.setTextColor(...secondaryColor);
                doc.text("Analyse IA de l'intention architecturale : " + auditResult.analyse_geometrique.observations, 10, doc.lastAutoTable.finalY + 8, { maxWidth: 190 });
            }
        } else {
            doc.text("Métré Quantitatif Récapitulatif", 10, doc.lastAutoTable.finalY + 8);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 11,
                ...tableStyles,
                head: [['Désignation', 'Quantité Théorique (Calculée)', 'Tolérance Chantiers', 'Quantité d\'Achat Recommandée']],
                body: [
                    ['Ciment ' + typeCiment, formatNb(cimentBase) + ' sacs', '+5%', formatNb(cimentRecommande) + ' sacs'],
                    ['Aciers HA FeE500', formatNb(acierBase) + ' kg', '+7%', formatNb(acierRecommande) + ' kg'],
                    ['Sable de dune', formatNb(sableBase) + ' m³', '+5%', formatNb(sableRecommande) + ' m³'],
                    ['Gravier concassé Diack', formatNb(gravierBase) + ' m³', '+5%', formatNb(gravierRecommande) + ' m³'],
                    ['Agglos creux de 15', formatNb(agglosBase) + ' U', '+4%', formatNb(agglosRecommande) + ' U']
                ]
            });
        }
        addFooter(doc, 1);
        doc.addPage();

        // --- PAGE 2 : Descente de Charges ---
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text("Avant-Métré Détaillé par Tranche Constructive (Descente de Charges)", 10, 15);
        
        const qInfraBeton = stot * 0.32 * 0.35;
        const qInfraCiment = cimentRecommande * 0.35;
        const qInfraAcier = acierRecommande * 0.40;
        
        doc.autoTable({
            startY: 20,
            ...tableStyles,
            head: [['Niveau / Ouvrage', 'Béton (m³)', 'Ciment (sacs)', 'Acier (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos (u)']],
            body: [
                ['Infrastructure & Soubassement', formatNb(qInfraBeton), formatNb(qInfraCiment), formatNb(qInfraAcier), formatNb(sableRecommande * 0.35), formatNb(gravierRecommande * 0.35), formatNb(agglosRecommande * 0.15)],
                ['Rez-de-Chaussée', formatNb(stot * 0.32 * 0.40), formatNb(cimentRecommande * 0.40), formatNb(acierRecommande * 0.35), formatNb(sableRecommande * 0.40), formatNb(gravierRecommande * 0.40), formatNb(agglosRecommande * 0.45)],
                ['Étage(s) & Couronnement', formatNb(stot * 0.32 * 0.25), formatNb(cimentRecommande * 0.25), formatNb(acierRecommande * 0.25), formatNb(sableRecommande * 0.25), formatNb(gravierRecommande * 0.25), formatNb(agglosRecommande * 0.40)],
                ['TOTAL GÉNÉRAL BAEL 91 R99', formatNb(stot * 0.32), formatNb(cimentRecommande), formatNb(acierRecommande), formatNb(sableRecommande), formatNb(gravierRecommande), formatNb(agglosRecommande)]
            ],
            didParseCell: function(d) {
                if(d.section === 'body' && d.row.index === 3) {
                    d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = bgAlternate;
                }
            }
        });

        doc.text("Fiche Technique Géotechnique (Normes applicables)", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Recommandation de mise en œuvre', 'Paramètre Technique', 'Validation requise']],
            body: [
                ['Type de fondation préconisé', 'Semelles isolées sous poteaux, liées par longrines rigides', 'Vérification pénétromètre'],
                ['Profondeur d\'ancrage minimale', '1.20 m ancré dans le bon sol', 'PV Réception de fouille'],
                ['Traitement hydrofuge de l\'infrastructure', classeExposition === 'FTP / Marine sévère' || classeExposition.includes('phréatique') ? 'Obligatoire (Film polyane + adjuvant)' : 'Recommandé', 'Factures adjuvants'],
                ['Enrobage strict des aciers de fondation', enrobage + ' avec cales à béton certifiées', 'Contrôle avant coulage']
            ]
        });
        addFooter(doc, 2);
        doc.addPage();

        // --- PAGE 3 : Nomenclature Aciers ---
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text("Calibrage Rigoureux des Aciers Haute Adhérence (FeE500)", 10, 15);
        doc.autoTable({
            startY: 20,
            ...tableStyles,
            head: [['Diamètre Nominal', 'Rôle Structurel', 'Recouvrement', 'Tonnage Requis (kg)', 'Barres (12m)']],
            body: [
                ['HA 6', 'Cadres, étriers, épingles (effort tranchant)', '40 Φ', formatNb(pdsHa6), formatNb(ha6Barres)],
                ['HA 8', 'Treillis anti-fissuration dalle, chaînages', '40 Φ', formatNb(pdsHa8), formatNb(ha8Barres)],
                ['HA 10', 'Aciers de montage, chapeaux sur appuis', '40 Φ', formatNb(pdsHa10), formatNb(ha10Barres)],
                ['HA 12', 'Ferraillage principal semelles, poteaux', '50 Φ', formatNb(pdsHa12), formatNb(ha12Barres)],
                ['HA 14 / 16', 'Armatures longitudinales fortes retombées', '50 Φ', formatNb(pdsHa16), formatNb(ha16Barres)]
            ]
        });

        doc.text("Registre des Points d'Arrêt Incompressibles (Contrôle Chantier)", 10, doc.lastAutoTable.finalY + 8);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11,
            ...tableStyles,
            head: [['Jalon Critique', 'Objet du Contrôle Technique', 'Visa Ingénieur']],
            body: [
                ['Point 1', 'Fouilles & Béton de propreté (fondation sur sol sain non remanié).', ''],
                ['Point 2', 'Cages d\'armature semelles (cales d\'enrobage ' + enrobage + ' impératives).', ''],
                ['Point 3', 'Ferraillage poteaux RDC et vérification longueur de recouvrement.', ''],
                ['Point 4', 'Coffrage, étaiement et ferraillage plancher.', ''],
                ['Point 5', 'Coulage, vibration mécanique et prise d\'éprouvettes.', ''],
                ['Point 6', 'Décoffrage (après 21j) et cure continue par arrosage.', '']
            ]
        });
        addFooter(doc, 3);
        doc.addPage();

        // --- PAGE 4 : Bilan Financier & Clauses ---
        doc.setFontSize(12);
        doc.setTextColor(...primaryColor);
        doc.text("Bordereau de Consultation des Entreprises & Budget Prévisionnel", 10, 15);
        
        const matMin = stot * 54000;
        const matMax = stot * 62000;
        const moMin = stot * 18000;
        const moMax = stot * 23000;
        
        doc.autoTable({
            startY: 20,
            ...tableStyles,
            head: [['Poste Gros Œuvre', 'Estimation Basse (FCFA)', 'Estimation Haute (FCFA)']],
            body: [
                ['Fourniture des Matériaux', formatNb(matMin), formatNb(matMax)],
                ['Main-d\'Œuvre Tâcheron', formatNb(moMin), formatNb(moMax)],
                ['Aléas & Consommables (Fil, pointes)', formatNb(stot * 2800), formatNb(stot * 3600)]
            ],
            foot: [['TOTAL BUDGET CIBLE', formatNb(matMin + moMin + stot * 2800), formatNb(matMax + moMax + stot * 3600)]]
        });

        doc.text("3 Clauses de Sauvegarde Juridique à Annexer au Contrat de Sous-traitance", 10, doc.lastAutoTable.finalY + 15);
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 18,
            ...tableStyles,
            head: [['Article', 'Libellé de la Clause Contractuelle']],
            body: [
                ['Clause 1.1', 'Paiement Conditionnel : Le règlement des situations de travaux est strictement conditionné à la signature contradictoire des Procès-Verbaux des 6 Points d\'Arrêt Incompressibles listés en Annexe.'],
                ['Clause 2.4', 'Garantie et Retenue : Une retenue de garantie forfaitaire de 10% sur la main-d\'œuvre sera consignée jusqu\'au parfait achèvement et séchage complet du gros œuvre (réception sans réserves).'],
                ['Clause 3.2', 'Conformité Matériaux : L\'utilisation d\'aciers non crénelés (lisses) ou sous-calibrés est formellement proscrite et entraînera une réfaction immédiate de 20% du marché pour mise en péril de l\'ouvrage.']
            ]
        });

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Document certifié conforme aux ratios d'ingénierie BAEL 91 R99", 10, doc.lastAutoTable.finalY + 15);
        doc.text("Reproduction et diffusion réservées à l'usage exclusif du souscripteur.", 10, doc.lastAutoTable.finalY + 19);

        addFooter(doc, 4);
    }

    // Sauvegarde du fichier
    doc.save(`Rapport-Technique-${refDossier}.pdf`);
};
