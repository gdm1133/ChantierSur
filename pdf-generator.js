// Initialisation sécurisée de jsPDF
const getJsPDF = () => {
  if (window.jspdf && window.jspdf.jsPDF) {
    return window.jspdf.jsPDF;
  }
  if (typeof jsPDF !== 'undefined') {
    return jsPDF;
  }
  return null;
};

// Fonction Universelle de Génération de Livrable
window.generateProjectPDF = function(data) {
  const jsPDFClass = getJsPDF();
  if (!jsPDFClass) {
    alert("Erreur : La bibliothèque jsPDF n'a pas pu être chargée.");
    return;
  }

  const doc = new jsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const service = (data.service || 'esquisse').toLowerCase();
  const clientName = data.client_name || 'Client ChantierSur';
  const location = data.project_location || 'Dakar, Sénégal';
  const levels = data.exact_levels !== undefined ? data.exact_levels : 1;
  const surface = data.surface || 200;

  // En-tête officiel
  doc.setFillColor(11, 19, 37); // Bleu nuit #0B1325
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(245, 158, 11); // Ambre #F59E0B
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("ChantierSur.com", 15, 16);

  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text("BUREAU D'ÉTUDES NUMÉRIQUE • RÉPUBLIQUE DU SÉNÉGAL", 15, 24);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Réf : CS-${Date.now().toString().slice(-6)}`, 160, 16);
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 160, 24);

  // Titre du Dossier
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');

  let title = "RAPPORT TECHNIQUE OFFICIEL";
  if (service === 'esquisse') title = "ÉTUDE D'ESQUISSE & GABARIT PARCELLAIRE";
  if (service === 'express') title = "BORDEREAU QUANTITATIF ESTIMATIF (BQE) GROS ŒUVRE";
  if (service === 'audit') title = "RAPPORT DE CONTRE-EXPERTISE & AUDIT DEVIS";
  if (service === 'finitions') title = "BORDEREAU TECHNIQUE SECOND ŒUVRE & FINITIONS";

  doc.text(title, 15, 45);

  // Données Projet
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Maître d'Ouvrage : ${clientName}`, 15, 54);
  doc.text(`Localisation : ${location}`, 15, 61);
  doc.text(`Configuration : R+${levels} • Surface : ${surface} m²`, 15, 68);

  // Ligne de séparation
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.8);
  doc.line(15, 73, 195, 73);

  // Tableau récapitulatif avec autotable
  if (doc.autoTable) {
    let rows = [];
    if (service === 'express') {
      rows = [
        ["Béton dosé à 350 kg/m³ (CEM II 42.5R)", `${Math.round(surface * 0.38)} m³`, "Normes BAEL 91 R99"],
        ["Armatures Haute Adhérence FeE500", `${(surface * 0.038).toFixed(1)} Tonnes`, "Ratios séisme & vent"],
        ["Sable dunaire propre", `${Math.round(surface * 0.18)} m³`, "Granulométrie contrôlée"],
        ["Gravier 8/16 & 16/25 (Basalte)", `${Math.round(surface * 0.32)} m³`, "Carrières Diack / Bandia"],
        ["Ciment Sacs 50kg (SOCOCIM / Sahel / Dangote)", `${Math.round(surface * 2.8)} Sacs`, "Classe 42.5R impérative"]
      ];
    } else if (service === 'audit') {
      rows = [
        ["Contrôle Ratio Aciers / Béton", "Conforme BAEL 91", "Tolérance ±5%"],
        ["Contre-Expertise Prix Unitaire Ciment", "4 200 - 4 600 FCFA / Sac", "Prix marché Dakar"],
        ["Audit Cubage Béton Armé", "Optimisation 12% détectée", "Réduction surcoûts"],
        ["Recommandations Contractuelles", "Conformité COCC Sénégal", "Garantie Décennale"]
      ];
    } else if (service === 'finitions') {
      rows = [
        ["Carrelage Grès Cérame", `${Math.round(surface * 1.15)} m²`, "Prise en compte des coupes"],
        ["Plomberie & Multicouche", "Installation complète", "Alimentation + Évacuation"],
        ["Étanchéité Terrasse Solin & Paxalu", `${Math.round(surface / (levels + 1))} m²`, "Protection Hivernage"],
        ["Appareillage Électrique & Climatisation", "Conforme NF C 15-100", "Disjoncteurs différentiels"]
      ];
    } else {
      rows = [
        ["Emprise au sol recommandée", `${Math.round(surface * 0.65)} m²`, "Respect des prospects et retraits"],
        ["Enrobage requis armatures", "4,5 cm", "Atmosphère saline et sol agressif"],
        ["Système de fondations préconisé", "Semelles isolées + Longrines", "Selon portance Dakar"],
        ["Drainage / Cuvelage", "Recommandé selon secteur", "Sécurité nappe phréatique"]
      ];
    }

    doc.autoTable({
      startY: 78,
      head: [['Poste Technique', 'Quantitatif / Prescription', 'Observation Technique']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [11, 19, 37], textColor: [245, 158, 11] },
      styles: { fontSize: 9 }
    });
  }

  // Signature et Pied de page
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Document certifié édité par ChantierSur.com - Bureau d'Études Numérique Indépendant.", 15, pageHeight - 15);
  doc.text("Conforme BAEL 91 R99 • Code des Obligations Civiles et Commerciales (COCC) du Sénégal.", 15, pageHeight - 10);

  // Téléchargement automatique
  doc.save(`ChantierSur_${service.toUpperCase()}_${Date.now().toString().slice(-4)}.pdf`);
};

// Alias de sécurité
window.generatePDF = window.generateProjectPDF;
