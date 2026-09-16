window.genererDossierBQE = function(data) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargé");
        alert("Erreur de chargement du module PDF. Veuillez réessayer.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Utilitaires de formatage
    const formatNb = (num) => Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const stot = (data.surface || 150) * (data.levels || 1);
    const dateJour = new Date().toLocaleDateString('fr-FR');
    const refDossier = "CS-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // --- COULEURS CHARTE ---
    const primaryColor = [11, 19, 37]; // #0B1325
    const accentColor = [245, 158, 11]; // #F59E0B
    const grayColor = [100, 100, 100];

    // --- HELPER PIED DE PAGE ---
    const addFooter = (doc, pageNum) => {
        doc.setFontSize(9);
        doc.setTextColor(...grayColor);
        doc.text(`Ref : ${refDossier} | Contact technique : admin@chantiersur.com`, 14, 285);
        doc.text(`Page ${pageNum}/4`, 190, 285, { align: 'right' });
    };

    // =========================================================================
    // PAGE 1 : CARTOUCHE & SYNTHÈSE GLOBALE
    // =========================================================================
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("ChantierSur.com", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(...accentColor);
    doc.text("Bordereau Quantitatif Estimatif & Audit Technique BAEL", 14, 28);

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

    // Calculs Poste par Poste
    const cimentBase = stot * 2.42;
    const cimentTotal = cimentBase * 1.05;

    const acierBase = stot * 26.5;
    const acierTotal = acierBase * 1.07;

    const sableBase = stot * 0.175;
    const sableTotal = sableBase * 1.05;

    const gravierBase = stot * 0.16;
    const gravierTotal = gravierBase * 1.05;

    const agglosBase = stot * 12;
    const agglosTotal = agglosBase * 1.04;

    const hourdisBase = stot * 4.6;
    const hourdisTotal = hourdisBase * 1.05;

    doc.autoTable({
        startY: 65,
        head: [['Désignation des matériaux', 'Quantité Théorique', 'Tolérance (Pertes)', 'Quantité Recommandée (Achat)']],
        body: [
            ['Ciment CEM II 42.5R (Sacs de 50kg)', formatNb(cimentBase) + ' sacs', '+5%', formatNb(cimentTotal) + ' sacs'],
            ['Aciers Haute Adhérence FeE500', formatNb(acierBase) + ' kg', '+7%', formatNb(acierTotal) + ' kg'],
            ['Sable de dune propre', formatNb(sableBase) + ' m3', '+5%', formatNb(sableTotal) + ' m3'],
            ['Gravier basaltique concassé 8/16', formatNb(gravierBase) + ' m3', '+5%', formatNb(gravierTotal) + ' m3'],
            ['Agglos creux de 15', formatNb(agglosBase) + ' U', '+4%', formatNb(agglosTotal) + ' unités'],
            ['Hourdis de 16', formatNb(hourdisBase) + ' U', '+5%', formatNb(hourdisTotal) + ' unités']
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    addFooter(doc, 1);

    // =========================================================================
    // PAGE 2 : VENTILATION PRÉCISE DES ACIERS HA
    // =========================================================================
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Ventilation Précise des Aciers HA", 14, 20);

    const pdsHa6 = acierTotal * 0.095;
    const pdsHa8 = acierTotal * 0.18;
    const pdsHa10 = acierTotal * 0.26;
    const pdsHa12 = acierTotal * 0.33;
    const pdsHa16 = acierTotal * 0.135; // HA 14/16

    doc.autoTable({
        startY: 30,
        head: [['Diamètre HA', 'Usage Principal', 'Poids Requis (kg)', 'Conversion en Barres (12m)']],
        body: [
            ['HA 6', 'Cadres & Étriers', formatNb(pdsHa6) + ' kg', formatNb(pdsHa6 / 2.66) + ' barres'],
            ['HA 8', 'Treillis dalle', formatNb(pdsHa8) + ' kg', formatNb(pdsHa8 / 4.74) + ' barres'],
            ['HA 10', 'Chapeaux & Poteaux', formatNb(pdsHa10) + ' kg', formatNb(pdsHa10 / 7.40) + ' barres'],
            ['HA 12', 'Longrines & Poteaux porteurs', formatNb(pdsHa12) + ' kg', formatNb(pdsHa12 / 10.66) + ' barres'],
            ['HA 14 / 16', 'Retombées de poutres', formatNb(pdsHa16) + ' kg', formatNb(pdsHa16 / 18.96) + ' barres']
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    const finalYPage2 = doc.lastAutoTable.finalY + 15;
    
    // Encadré Jaune Anti-Fraude
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(...accentColor);
    doc.rect(14, finalYPage2, 182, 35, 'FD');
    doc.setTextColor(180, 83, 9); // amber-700
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("! DIRECTIVES ANTI-FRAUDE SUR LES ACIERS :", 18, finalYPage2 + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("- Exigez un contrôle des diamètres au pied à coulisse lors de la livraison.", 18, finalYPage2 + 18);
    doc.text("- N'acceptez que des barres normalisées d'une longueur stricte de 12 mètres.", 18, finalYPage2 + 24);
    doc.text("- La tolérance maximale acceptable pour les chutes d'acier est de 7%.", 18, finalYPage2 + 30);

    addFooter(doc, 2);

    // =========================================================================
    // PAGE 3 : PLANNING DE DÉCAISSEMENT & APPROVISIONNEMENT
    // =========================================================================
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Planning de Décaissement & Approvisionnement", 14, 20);

    doc.autoTable({
        startY: 30,
        head: [['Phase de Construction', 'Matériaux à approvisionner', 'Point d\'arrêt (Contrôle technique)']],
        body: [
            ['Phase 1 : Fondations & Soubassement\n(J1 - J20)', '32% Ciment\n35% Fer\n100% Remblai', 'Inspection de la fouille et\nferraillage avant coulage du\nbéton de propreté.'],
            ['Phase 2 : RDC & Plancher Haut\n(J21 - J45)', '42% Ciment\n45% Fer\n100% Hourdis', 'Contrôle des cales d\'enrobage\n(2,5 cm minimum) et de la\nqualité de l\'étaiement.'],
            ['Phase 3 : Étage & Chaînages\n(J46 - J75)', 'Solde Ciment (26%)\nSolde Fer (20%)\nMaçonnerie', 'Vérification des aplombs et\ndes linteaux/chaînages\navant coulage final.']
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 } }
    });

    addFooter(doc, 3);

    // =========================================================================
    // PAGE 4 : BUDGET PRÉVISIONNEL & CLAUSES CONTRACTUELLES
    // =========================================================================
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Budget Prévisionnel Gros Œuvre", 14, 20);

    const matMin = stot * 54000;
    const matMax = stot * 62000;
    const moMin = stot * 18000;
    const moMax = stot * 23000;
    const consMin = stot * 2800;
    const consMax = stot * 3600;
    const totMin = matMin + moMin + consMin;
    const totMax = matMax + moMax + consMax;

    doc.autoTable({
        startY: 30,
        head: [['Poste de Dépense', 'Estimation Basse (FCFA)', 'Estimation Haute (FCFA)']],
        body: [
            ['Fourniture des Matériaux (54k - 62k / m2)', formatNb(matMin), formatNb(matMax)],
            ['Main-d\'Œuvre Tâcheron (18k - 23k / m2)', formatNb(moMin), formatNb(moMax)],
            ['Consommables (Bois, Pointes, Fil) (2.8k - 3.6k)', formatNb(consMin), formatNb(consMax)]
        ],
        foot: [
            ['TOTAL ESTIMÉ GROS ŒUVRE BRUT', formatNb(totMin), formatNb(totMax)]
        ],
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        footStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    const finalYPage4 = doc.lastAutoTable.finalY + 15;

    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Clauses Contractuelles Anti-Litiges à inclure", 14, finalYPage4);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    const clausesY = finalYPage4 + 10;
    doc.text("1. Clause d'Enrobage Béton :", 14, clausesY);
    doc.setTextColor(...grayColor);
    doc.text("L'entrepreneur a l'obligation absolue d'utiliser des cales à béton pour garantir un enrobage minimum", 14, clausesY + 5);
    doc.text("de 2,5 cm de tous les aciers. Le non-respect entraîne la destruction de l'ouvrage aux frais de l'entrepreneur.", 14, clausesY + 10);

    doc.setTextColor(30, 41, 59);
    doc.text("2. Clause de Retenue de Garantie Tâcheron :", 14, clausesY + 20);
    doc.setTextColor(...grayColor);
    doc.text("Une retenue de 10% sur chaque situation de paiement sera appliquée. Cette somme ne sera restituée", 14, clausesY + 25);
    doc.text("qu'après la réception provisoire de l'ouvrage certifiant l'absence de malfaçons structurelles.", 14, clausesY + 30);

    doc.setTextColor(30, 41, 59);
    doc.text("3. Clause de Non-Prise en Charge des Surconsommations d'Acier :", 14, clausesY + 40);
    doc.setTextColor(...grayColor);
    doc.text("Le client ne prendra en charge aucune surconsommation d'acier supérieure aux quantités du présent BQE.", 14, clausesY + 45);
    doc.text("Les pertes ou vols imputables à la mauvaise gestion de l'entrepreneur seront déduits de sa facture.", 14, clausesY + 50);

    addFooter(doc, 4);

    // Sauvegarde du fichier
    doc.save(`BQE-ChantierSur-${refDossier}.pdf`);
};
