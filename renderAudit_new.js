  // =========================================================================
  // 3. LIVRABLE : AUDIT DEVIS (4 PAGES)
  // =========================================================================
  function renderAudit(doc, data, refDoc, currentDate) {
    setupDocumentFonts(doc);
    const clientName = (data.client_name || 'Maître d\'Ouvrage').trim();
    const rawPrefix = (data.phone_prefix || '+221').trim();
    let rawPhone = (data.client_phone || '770000000').toString().trim();
    rawPhone = rawPhone.replace(/^\+?221/, '').replace(/^0+/, '').trim();
    const clientPhone = ${rawPrefix} ;

    const surface = parseFloat(data.surface) || 250;
    const levels = parseInt(data.exact_levels, 10) || 1;
    const totalLevelsCount = levels + 1;
    const location = data.project_location || 'Dakar - Zone Urbaine';
    const buildingUsage = data.building_usage || 'unifamilial';
    
    // Formatters locaux
    const fr1 = v => (typeof v === 'number' ? v.toFixed(1) : parseFloat(v).toFixed(1)).replace('.', ',');
    const fr2 = v => (typeof v === 'number' ? v.toFixed(2) : parseFloat(v).toFixed(2)).replace('.', ',');

    // 1. Process Devis Lines
    const lines = data.devis_lines || [];
    let totalDevisTTC = 0;
    let totalTheoTTC = 0;
    
    // Macro-lots structure
    const macroLots = {
      'Gros œuvre & structure': { devis: 0, theo: 0, keywords: ['terrassement', 'fondation', 'béton', 'bét', 'maçonnerie', 'dalle', 'poteau', 'poutre', 'enduit', 'chape', 'fouille'] },
      'Étanchéité & toiture': { devis: 0, theo: 0, keywords: ['étanch', 'etanch', 'toiture', 'acrotère', 'acrotere'] },
      'Second œuvre & finitions': { devis: 0, theo: 0, keywords: ['menuiserie', 'porte', 'fenêtre', 'fenetre', 'garde-corps', 'carrelage', 'faïence', 'faience', 'peinture', 'plomberie', 'sanitaire', 'électricité', 'electricite', 'forage'] },
      'Installation & travaux préparatoires': { devis: 0, theo: 0, keywords: ['installation', 'chantier', 'base vie', 'clôture', 'cloture'] }
    };

    function mapMacroLot(designation) {
      const text = (designation || '').toLowerCase();
      for (const [mlName, mlData] of Object.entries(macroLots)) {
        if (mlData.keywords.some(kw => text.includes(kw))) {
          return mlName;
        }
      }
      return 'Second œuvre & finitions'; // fallback
    }

    const processedLines = lines.map((line, idx) => {
      const designation = line.designation || 'Ligne non spécifiée';
      const qteDevis = parseFloat(line.qty) || 0;
      const puDevis = parseFloat(line.pu) || 0;
      const montantDevis = qteDevis * puDevis;
      totalDevisTTC += montantDevis;
      
      const mLot = mapMacroLot(designation);
      macroLots[mLot].devis += montantDevis;

      // Logique de calcul théorique avancée
      let qteTheo = qteDevis;
      let formule = 'Identique devis';
      let puRefText = 'Non audité';
      let puRefVal = puDevis;
      let refLegale = '-';
      
      const text = designation.toLowerCase();
      if (text.includes('béton') || text.includes('beton')) {
        qteTheo = parseFloat((surface * totalLevelsCount * 0.35).toFixed(1));
        formule = 'V=SDP×0.35 m³';
        puRefVal = 145000;
        puRefText = '130k-160k';
        refLegale = 'BAEL 91 R99';
      } else if (text.includes('maçonnerie') || text.includes('agglo')) {
        qteTheo = parseFloat((surface * 2.5 * totalLevelsCount).toFixed(1));
        formule = 'S=SDP×2.5';
        puRefVal = 8000;
        puRefText = '7k-9k';
        refLegale = 'DTU 20.1';
      } else if (text.includes('enduit')) {
        qteTheo = parseFloat((surface * 5 * totalLevelsCount).toFixed(1));
        formule = 'S≈2×Maçonnerie';
        puRefVal = 4000;
        puRefText = '3.5k-5k';
        refLegale = 'DTU 26.2';
      } else if (text.includes('étanchéité') || text.includes('etancheite')) {
        qteTheo = parseFloat(surface.toFixed(1));
        formule = 'Emprise toiture';
        puRefVal = 17500;
        puRefText = '15k-20k';
        refLegale = 'DTU 43.1';
      } else if (text.includes('carrelage')) {
        qteTheo = parseFloat((surface * totalLevelsCount * 0.9).toFixed(1));
        formule = 'S≈SDP×0.9';
        puRefVal = 15000;
        puRefText = '12k-18k';
        refLegale = 'DTU 52.1';
      } else if (text.includes('acier') || text.includes('fer')) {
        qteTheo = parseFloat((surface * totalLevelsCount * 0.35 * 90).toFixed(1));
        formule = 'Ratio kg/m³ béton';
        puRefVal = 800;
        puRefText = '750-900';
        refLegale = 'BAEL 91 R99';
      } else if (text.includes('terrassement') || text.includes('fouille')) {
        qteTheo = parseFloat((surface * 1.5).toFixed(1));
        formule = 'V≈Surface×1.5m';
        puRefVal = 12000;
        puRefText = '10k-15k';
        refLegale = 'DTU 13.12';
      }

      const montantTheo = qteTheo * puRefVal;
      totalTheoTTC += montantTheo;
      macroLots[mLot].theo += montantTheo;

      let ecartMontant = montantDevis - montantTheo;
      let ecartPct = montantTheo > 0 ? (ecartMontant / montantTheo) * 100 : 0;
      
      let verdict = 'Non vérifiable';
      if (montantTheo > 0) {
        if (montantDevis < montantTheo * 0.5) verdict = 'Sous-évalué';
        else if (Math.abs(ecartPct) <= 10) verdict = 'Cohérent';
        else if (ecartPct > 10 && ecartPct <= 25) verdict = 'À négocier';
        else verdict = 'Surcoût';
      }

      return {
        num: String(idx + 1).padStart(2, '0'),
        designation: designation,
        u: line.unit || 'U',
        qteDevis: qteDevis,
        puDevis: puDevis,
        montantDevis: montantDevis,
        qteTheo: qteTheo,
        formule: formule,
        puRef: puRefText,
        montantTheo: montantTheo,
        diff: montantTheo > 0 ? (ecartPct > 0 ? '+' : '') + ecartPct.toFixed(0) + '%' : '-',
        verdict: verdict,
        refLegale: refLegale
      };
    });

    // --------------
    // PAGE 1: SYNTHÈSE GLOBALE & MACRO-LOTS
    // --------------
    drawUnifiedHeader(doc, "Rapport d'Audit de Devis", "Partie I : Synthèse Financière & Écarts Macro-Lots", refDoc, currentDate, clientName, clientPhone, "Non spécifié", 'audit');
    
    let currentY = 52;
    drawSectionTitle(doc, currentY, "I. RÉSULTAT GLOBAL DU DEVIS SOUMIS VS ESTIMATION DE RÉFÉRENCE (DAKAR 2026)");
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN_LEFT, currentY + 6, USABLE_WIDTH, 26, 2, 2, 'FD');
    
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("MONTANT GLOBAL DU DEVIS (TTC)", MARGIN_LEFT + 5, currentY + 13);
    doc.text("ESTIMATION DE RÉFÉRENCE (TTC)", MARGIN_LEFT + USABLE_WIDTH / 2 + 5, currentY + 13);
    
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(14);
    doc.setTextColor(11, 19, 37);
    doc.text(formatFCFA(totalDevisTTC), MARGIN_LEFT + 5, currentY + 22);
    doc.text(formatFCFA(totalTheoTTC), MARGIN_LEFT + USABLE_WIDTH / 2 + 5, currentY + 22);
    
    const diffTotale = totalDevisTTC - totalTheoTTC;
    const diffTotalePct = totalTheoTTC > 0 ? (diffTotale / totalTheoTTC) * 100 : 0;
    
    doc.setFontSize(9);
    if (diffTotale > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(Surcoût global estimé : + (+%), MARGIN_LEFT + 5, currentY + 29);
    } else {
      doc.setTextColor(5, 150, 105);
      doc.text(Économie globale estimée :  (%), MARGIN_LEFT + 5, currentY + 29);
    }

    currentY += 40;
    drawSectionTitle(doc, currentY, "II. VENTILATION PAR MACRO-LOTS TECHNIQUES & DÉTECTION D'ÉCARTS");

    const macroRows = Object.entries(macroLots).map(([name, data]) => {
      const diff = data.devis - data.theo;
      const pct = data.theo > 0 ? (diff / data.theo) * 100 : 0;
      let statut = "Cohérent";
      if (pct > 15) statut = "Surévalué";
      else if (pct < -15) statut = "Sous-évalué (Risque qualité)";
      
      return [
        name,
        formatFCFA(data.devis),
        formatFCFA(data.theo),
        data.theo > 0 ? ${pct > 0 ? '+' : ''}% : '-',
        statut
      ];
    });

    doc.autoTable(createTableOptions(
      currentY + 8,
      [['Macro-Lot', 'Montant Devis (TTC)', 'Référence Théo. (TTC)', 'Écart', 'Analyse du Risque']],
      macroRows,
      {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 15, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 30, fontStyle: 'bold' }
      }
    ));

    // --------------
    // PAGE 2: TABLEAU DÉTAILLÉ (13 COLONNES) - LANDSCAPE
    // --------------
    doc.addPage('a4', 'landscape');
    const LANDSCAPE_WIDTH = 297;
    const LAND_USABLE_WIDTH = LANDSCAPE_WIDTH - 40;
    
    // Header for landscape
    doc.setFillColor(...COLOR_NAVY);
    doc.rect(0, 0, LANDSCAPE_WIDTH, 20, 'F');
    doc.setFillColor(...COLOR_AMBER);
    doc.rect(0, 20, LANDSCAPE_WIDTH, 1.2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.setFontSize(11);
    doc.text("Rapport d'Audit de Devis - Tableau Analytique Détaillé", 20, 12);
    doc.setFontSize(7);
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(Dossier :  | Date :  | Client : , LANDSCAPE_WIDTH - 20, 12, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Avertissement : Les quantités théoriques sont des pré-dimensionnements forfaitaires basés sur la SDP. Les prix de référence sont issus des Mercuriales Dakar 2026. Ces données ne substituent pas l'étude d'un BET.", 20, 28);

    const tableBody = processedLines.map(l => [
      l.num,
      l.designation,
      l.u,
      l.qteDevis.toFixed(1),
      formatFCFA(l.puDevis).replace(' FCFA', ''),
      formatFCFA(l.montantDevis).replace(' FCFA', ''),
      l.qteTheo.toFixed(1),
      l.formule,
      l.puRef,
      formatFCFA(l.montantTheo).replace(' FCFA', ''),
      l.diff,
      l.verdict,
      l.refLegale
    ]);

    doc.autoTable({
      startY: 32,
      head: [['N°', 'Désignation', 'U', 'Qté(D)', 'PU(D)', 'Mont.(D)', 'Qté(T)', 'Formule Théo.', 'PU Réf', 'Mont.(T)', 'Diff', 'Verdict', 'Réf. Légale']],
      body: tableBody,
      theme: 'grid',
      margin: { left: 20, right: 20 },
      tableWidth: LAND_USABLE_WIDTH,
      styles: { font: getFontFamily(doc), fontSize: 6.5, cellPadding: 1.5, lineColor: COLOR_BORDER, textColor: [51, 65, 85] },
      headStyles: { fillColor: COLOR_NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 8, halign: 'center' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 15, halign: 'right', textColor: COLOR_NAVY },
        7: { cellWidth: 22 },
        8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY },
        10: { cellWidth: 12, halign: 'right', fontStyle: 'bold' },
        11: { cellWidth: 22, fontStyle: 'bold' },
        12: { cellWidth: 18 }
      },
      didParseCell: function(d) {
        if (d.section === 'body' && d.column.index === 11) {
          const v = d.cell.raw;
          if (v.includes('Surcoût') || v.includes('Erreur')) d.cell.styles.textColor = [220, 38, 38];
          else if (v.includes('Sous-évalué')) d.cell.styles.textColor = [234, 88, 12];
          else if (v.includes('Cohérent')) d.cell.styles.textColor = [5, 150, 105];
        }
      }
    });

    // --------------
    // PAGE 3: CONSEILS JURIDIQUES ET ÉCHÉANCIER COCC
    // --------------
    doc.addPage('a4', 'portrait');
    drawUnifiedHeader(doc, "Rapport d'Audit de Devis", "Partie III : Analyse Contractuelle & Échéancier de Paiement", refDoc, currentDate, clientName, clientPhone, "Non spécifié", 'audit');
    
    currentY = 52;
    drawSectionTitle(doc, currentY, "III. ÉCHÉANCIER DE PAIEMENT RECOMMANDÉ (NORME BTP)");
    
    doc.autoTable(createTableOptions(
      currentY + 8,
      [['Tranche', 'Déclencheur de Paiement (Milestone)', 'Pourcentage']],
      [
        ['Acompte Démarrage', "Installation de chantier et livraison premiers matériaux", '15 %'],
        ['Tranche 1', "Achèvement des fondations et dalle RDC", '25 %'],
        ['Tranche 2', "Achèvement du gros œuvre / mise hors d'eau", '25 %'],
        ['Tranche 3', "Achèvement du second œuvre", '20 %'],
        ['Tranche 4', "Réception provisoire (remise des clés et PV)", '10 %'],
        ['Retenue de Garantie', "Levée des réserves à 1 an (ou caution bancaire substitutive)", '5 %']
      ],
      {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 110 },
        2: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: COLOR_NAVY }
      }
    ));

    currentY = doc.lastAutoTable.finalY + 15;
    drawSectionTitle(doc, currentY, "IV. 5 CLAUSES CONTRACTUELLES À IMPOSER (SÉCURISATION COCC)");
    
    const clauses = [
      ["1. Prix Forfaitaire", "Le devis doit explicitement mentionner « Marché à Prix Forfaitaire ». Aucun avenant pour erreur de métré de l'entrepreneur n'est acceptable (Art. L.88 Code Construction)."],
      ["2. Pénalités de Retard", "Mention obligatoire : « Pénalités de retard fixées à 1/1000ème du marché par jour calendaire, plafonnées à 5% » (Application stricte de l'Art. 98 COCC)."],
      ["3. Conformité DTU", "L'entreprise s'engage à respecter les normes DTU en vigueur et le BAEL 91 R99. Toute malfaçon entraîne démolition/reprise à ses frais exclusifs."],
      ["4. Réception des Travaux", "La réception (avec ou sans réserves) doit faire l'objet d'un Procès-Verbal écrit contradictoire (Art. 740 COCC). C'est le point de départ des garanties."],
      ["5. Retenue de Garantie", "Application d'une retenue de 5% sur tous les acomptes, libérable à la fin de l'année de parfait achèvement, sauf si caution bancaire à première demande fournie (Art. 742 COCC)."]
    ];

    doc.autoTable(createTableOptions(
      currentY + 8,
      [['Clause Essentielle', 'Rédaction Recommandée & Fondement Juridique']],
      clauses,
      {
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 130 }
      }
    ));

    // Footer Disclaimer
    currentY = doc.lastAutoTable.finalY + 15;
    doc.setFillColor(192, 57, 43);
    doc.rect(MARGIN_LEFT, currentY, USABLE_WIDTH, 22, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont(getFontFamily(doc), 'bold');
    doc.text("AVERTISSEMENT LÉGAL CHANTIERSUR.COM :", MARGIN_LEFT + 4, currentY + 5);
    doc.setFont(getFontFamily(doc), 'normal');
    doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize("Ce document est un audit numérique indicatif d'aide à la décision. Il ne s'agit ni d'une expertise judiciaire, ni d'un visa officiel de bureau d'études, ni d'une contre-expertise légale. Toute validation structurelle nécessite le cachet d'un BET agréé inscrit à l'ordre.", USABLE_WIDTH - 8), MARGIN_LEFT + 4, currentY + 11);
  }
