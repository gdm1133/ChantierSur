let CACHED_LOGO_PNG = null;

async function loadLogoBase64() {
    if (CACHED_LOGO_PNG) return CACHED_LOGO_PNG;
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width * 2 || 256;
            canvas.height = img.height * 2 || 256;
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            CACHED_LOGO_PNG = canvas.toDataURL('image/png');
            resolve(CACHED_LOGO_PNG);
        };
        img.onerror = () => {
            resolve(null);
        };
        img.src = '/icone-chantiersur-svg.svg';
    });
}

function renderPageHeader(doc, pageNumber, totalPages, docTitle, projectRef, logoBase64, clientData = {}) {
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
    doc.text("Chantier", margin + 17, margin + 6.5);
    
    const textW = doc.getTextWidth("Chantier");
    doc.setTextColor(245, 158, 11); // #F59E0B
    doc.text("Sur.com", margin + 17 + textW, margin + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(docTitle, margin + 17, margin + 11.5);

    // 4. Cartouche Métadonnées
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(11, 19, 37);
    doc.text(`RÉF : ${projectRef}`, pageWidth - margin - 2, margin + 6.5, { align: "right" });

    // QR Code for Authenticity
    if (pageNumber === 1 && typeof qrcode !== 'undefined') {
        const qr = qrcode(0, 'L');
        qr.addData(`https://chantiersur.com/?verify=${projectRef}`);
        qr.make();
        const qrImg = qr.createDataURL(4, 0);
        doc.addImage(qrImg, 'GIF', pageWidth - margin - 35, margin + 1, 14, 14);
        drawBETStamp(doc, pageWidth - margin - 50, margin + 8, projectRef);
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${pageNumber} / ${totalPages}`, pageWidth - margin - 2, margin + 11.5, { align: "right" });

    // Client Info on Page 1
    if (pageNumber === 1 && clientData && clientData.client_name) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138); // secondaryColor
        doc.text(`Maître d'Ouvrage : ${clientData.client_name}  |  Contact : ${clientData.phone_prefix || ''} ${clientData.client_phone || ''}`, margin, 30);
        doc.text(`Localité : ${clientData.project_location || ''}  |  Foncier : ${clientData.land_status || ''} ${clientData.lot_number ? '(Lot: ' + clientData.lot_number + ')' : ''}`, margin, 34);
    }

    // Footer de page
    doc.setDrawColor(203, 213, 225);
    doc.line(10, 282, 200, 282);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document technique de prédimensionnement structurel et d'estimation financière d'aide à la décision. Ce dossier ne constitue pas un plan de permis de construire.`, 10, 286, { maxWidth: 190 });
    doc.text(`Il doit faire l'objet d'un visa par un architecte inscrit à l'ODAS et un bureau de contrôle technique agréé pour tout dépôt administratif.`, 10, 289, { maxWidth: 190 });
    doc.text(`Conformité Juridique & Numérique : Données chiffrées TLS 1.3 (256 bits) • Paiement PayTech BCEAO • Conforme Loi n° 2008-12 (CDP) & COCC Sénégal.`, 10, 292, { maxWidth: 190 });
    doc.text(`Réf: ${projectRef} | Ingénierie automatisée par ChantierSur.com | Contact: admin@chantiersur.com`, 10, 296);
}

window.genererDossierBQE = async function(data, serviceType = "express", extra = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargé");
        alert("Erreur de chargement du module PDF. Veuillez réessayer.");
        return;
    }

    const logoBase64 = await loadLogoBase64();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- MOTEUR MATHÉMATIQUE PARAMÉTRIQUE ---
    let S = parseFloat(data.surface_dev || data.surface_preset);
    if (!S || isNaN(S)) {
        let f = parseFloat(data.custom_facade);
        let p = parseFloat(data.custom_depth);
        if (f && p) S = f * p;
        else S = 150;
    }
    
    const N = parseInt(data.levels || data.exact_levels || 0, 10);
    const zone = data.zone || 'dakar_centre';

    const S_tot = S * (N + 1);
    
    // Béton ventilé
    const V_bet_infra = Math.round(S * 0.35);
    const V_bet_rdc = Math.round(S * 0.35);
    const V_bet_etages = N > 0 ? Math.round(S * N * 0.30) : 0;
    const V_bet_tot = V_bet_infra + V_bet_rdc + V_bet_etages;

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
    const hourdis_tot = N > 0 ? Math.round(S * N * 0.8 * 8.5) : 0; 

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
    const zoneCotiere = data.zone_cotiere === "true" || data.zone_cotiere === true;
    const isHivernage = data.is_hivernage === "true" || data.is_hivernage === true;
    
    if (zone.includes('cotier') || zone.includes('petite_cote') || zone === 'dakar_cotier' || zoneCotiere) {
        portance = "1.8 bars"; 
        classeExposition = "Marine sévère (XS3)"; 
        enrobage = "4.5 cm"; 
        typeCiment = "CEM II 42.5R avec additions pouzzolaniques (ou CEM III)";
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

    const drawBETStamp = (doc, x, y, ref) => {
        doc.setDrawColor(30, 58, 138); // blue-900 (#1E3A8A)
        doc.setLineWidth(0.6);
        doc.circle(x, y, 15, 'S'); // Outer circle (30mm diameter)
        doc.setLineWidth(0.2);
        doc.circle(x, y, 14, 'S'); // Inner circle
        
        doc.setFontSize(5);
        doc.setTextColor(30, 58, 138);
        doc.text("CHANTIERSUR BET • AUDIT & STRUCTURE", x, y - 9, { align: "center" });
        doc.text("CONFORME BAEL 91 R99 • DROIT SÉNÉGALAIS COCC", x, y + 9, { align: "center" });
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text("VISA OFFICIEL BET", x, y - 2, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.text(ref, x, y + 2, { align: "center" });
    };

    const tableStyles = {
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: 0.1 },
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: bgAlternate },
        margin: { left: 10, right: 10 }
    };

    let pageTitles = [];
    const totalPages = serviceType === "finitions" ? 7 : 10;

    // --- COMMONS: PROTOCOLE DIASPORA ---
    const addDiasporaProtocol = () => {
        doc.addPage();
        pageTitles.push("PROTOCOLE DE VALIDATION VISUELLE À DISTANCE (DIASPORA & WHATSAPP)");

        // Bandeau d'Instruction Opérationnelle
        doc.setFillColor(11, 19, 37); // #0B1325
        doc.setDrawColor(245, 158, 11); // #F59E0B
        doc.setLineWidth(0.6);
        doc.rect(10, 38, 190, 24, 'FD');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("RÈGLE CONTRACTUELLE STRICTE :", 12, 44);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(241, 245, 249);
        doc.text("Aucun acompte de phase de travaux ne doit être viré à l'artisan sans la réception préalable des clichés conformes ci-dessous. Chaque envoi WhatsApp doit être accompagné de la mention de la date et de la référence du dossier. Tout élément structurel coulé sans validation visuelle préalable dégage la responsabilité du Maître d'Ouvrage.", 12, 49, { maxWidth: 186 });

        // Grand Tableau Quadri-Colonnes
        doc.autoTable({
            startY: 65, ...tableStyles,
            head: [['Étape / Jalon', 'Prises de Vue Obligatoires (WhatsApp)', 'Détails de Conformité BAEL', 'Motif de Blocage Financier Immédiat']],
            body: [
                ['Fondations & Fouilles (PV-01)', '1 vue d\'ensemble tranchée\n1 mesure profondeur avec mètre ruban\n1 gros plan béton de propreté', 'Sol d\'assise nettoyé, horizontal, béton de propreté 5 cm régulier.', 'Fond de fouille inondé, boueux, ou semelles posées directement sur la terre.'],
                ['Armatures & Calage d\'Enrobage (PV-02)', '1 vue générale semelles\n1 gros plan rasant sous les nappes d\'acier', 'Cales d\'enrobage préfabriquées étanches en béton de 4,5 cm (littoral) ou 3 cm en place.', 'Ferraille au contact du sol ou calage artisanal (morceaux de briques, agglos ou bois).'],
                ['Poteaux & Longueurs de Recouvrement (PV-03)', '1 vue d\'ensemble poteau avant coffrage\n1 gros plan mètre ruban sur chevauchement d\'acier\n1 photo cadres nœud', 'Recouvrement minimal de 50 x Ø (50 cm pour HA 10, 60 cm pour HA 12), cadres resserrés à 10 cm en zone nodale.', 'Barres aboutées sans longueur d\'ancrage, aciers lisses de rebut, ligature absente.'],
                ['Plancher Hourdis & Étaiement (PV-04)', '1 vue sous dalle (étais)\n1 vue dessus (hourdis + treillis soudé sur cales)', 'Étais métalliques d\'aplomb sur bastaings, treillis soudé surélevé sur cales, réservations techniques réservées.', 'Étais en bois bricolés, flèche de coffrage visible, treillis non surélevé posé à plat sur les briques.'],
                ['Coulage & Vibration Mécanique (PV-05)', '1 courte vidéo (15 s) montrant l\'aiguille vibrante immergée\n1 photo consistance bétonnière', 'Aiguille vibrante motorisée active, béton ferme et plastique, eau dosée strictement.', 'Ajout sauvage de seaux d\'eau dans le béton, absence totale d\'aiguille vibrante mécanique.'],
                ['Décoffrage à 21 Jours & Parements (PV-06)', '1 photo plancher décoffré après 21 jours\n1 gros plan arêtes et têtes de poteaux', 'Parements pleins, absence de nids de gravier, arrosage continu visible.', 'Décoffrage hâtif avant 21 jours, aciers apparents par ségrégation du béton, fissuration transversale.']
            ]
        });

        // Encadré de Clôture
        let yPosCheck = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, yPosCheck, 190, 28, 'FD');
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("Checklist de Déblocage Wave / Orange Money :", 12, yPosCheck + 7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("[  ] Photos reçues et conformes aux critères ci-dessus", 12, yPosCheck + 13);
        doc.text("[  ] Date vérifiée par repère temporel ou appel vidéo en direct", 12, yPosCheck + 18);
        doc.text("[  ] Procès-Verbal (Page 6) signé conjointement par le représentant local et le tâcheron", 12, yPosCheck + 23);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61); // green-700
        doc.text("--> DÉBLOCAGE DE L'ACOMPTE AUTORISÉ.", 130, yPosCheck + 23);
    };

    // --- COMMONS: FRAIS ADMINISTRATIFS (NOUVELLE PAGE) ---
    const addAdministrativeCosts = () => {
        doc.addPage();
        pageTitles.push("BARÈME PRÉVISIONNEL DES FORMALITÉS ADMINISTRATIVES & FRAIS ANNEXES DE DÉMARRAGE");

        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("BUDGET ESTIMATIF PRÉ-CHANTIER : FORMALITÉS, RACCORDEMENTS & SÉCURISATION JURIDIQUE", 10, 38);

        doc.autoTable({
            startY: 42, ...tableStyles,
            head: [['Poste / Formalité', 'Organisme / Intervenant', 'Base d\'Évaluation', 'Fourchette Marché (FCFA)', 'Niveau de Priorité']],
            body: [
                ['Bornage contradictoire & Rétablissement de bornes', 'Géomètre-Expert agréé ONGES', 'Vérification physique des 4 sommets de la parcelle, PV contradictoire signé avec les voisins.', '150 000 à 250 000', 'OBLIGATOIRE'],
                ['Constat d\'état des lieux préventif des mitoyennetés', 'Commissaire de Justice (Huissier)', 'Constat des fissures préexistantes sur les façades mitoyennes pour neutraliser les litiges.', '80 000 à 120 000', 'FORTEMENT RECOMMANDÉ'],
                ['Raccordement Eau Douce de Chantier', 'SEN\'EAU (ou camions-citernes)', 'Branchement provisoire au réseau potable. Eau de puits saumâtre interdite (corrosion).', '90 000 à 160 000', 'OBLIGATOIRE'],
                ['Branchement Électrique Forain / Provisoire', 'SENELEC', 'Abonnement Woyofal de chantier (30A monophasé) pour machines et éclairage.', '85 000 à 150 000', 'OBLIGATOIRE'],
                ['Panneau d\'Affichage Réglementaire du Permis', 'Fournisseur signalétique', 'Panneau rigide 1.20x0.80m visible de la rue (Art. R.82 Code Urbanisme).', '35 000 à 60 000', 'OBLIGATOIRE'],
                ['Clôture de Chantier & Abri de Stockage Sécurisé', 'Tâcheron / Gardiennage', 'Palissade tôle et abri couvert surélevé pour stocker le ciment à l\'abri.', '150 000 à 300 000', 'OBLIGATOIRE'],
                [{content: 'ENVELOPPE PRÉALABLE ESTIMÉE (À provisionner hors coût de main-d\'œuvre tâcheron)', colSpan: 3, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, {content: '590 000 à 1 040 000 FCFA', colSpan: 2, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });

        // Encadré d'Alerte Juridique
        let yPosAlert = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(30, 58, 138); // bleu ardoise
        doc.setLineWidth(0.4);
        doc.rect(10, yPosAlert, 190, 24, 'FD');
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("RAPPEL CONTRÔLE DSCOS :", 12, yPosAlert + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("La Direction de la Surveillance et du Contrôle de l'Occupation des Sols effectue des descentes inopinées régulières sur les chantiers. Le défaut de panneau visible, l'absence d'autorisation de construire ou un empiètement sur la voie publique entraîne l'arrêt immédiat des travaux, la confiscation du matériel de l'artisan et une amende pénale. Sécurisez ces formalités avant la livraison de la première tonne de ciment.", 12, yPosAlert + 11, { maxWidth: 186 });
    };

    // --- COMMONS: BON DE COMMANDE FOURNISSEUR ---
    const addPurchaseOrder = () => {
        doc.addPage();
        pageTitles.push("BON DE COMMANDE QUINCAILLERIE & CARRIÈRE — APPROVISIONNEMENT DIRECT");

        // En-tête fournisseur
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.4);
        doc.rect(10, 38, 190, 25, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text("Destinataire / Fournisseur : ...........................................................................................................................", 15, 45);
        doc.text("Nom du Livreur / Tél. : ..................................................................................................................................", 15, 52);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Commande passée directement par le Maître d'Ouvrage (" + (data.client_name || "Client") + "). Tout changement de marque ou de calibre sans accord écrit entraîne le rejet immédiat de la livraison sur chantier.", 15, 59, { maxWidth: 180 });

        // Tableau 1 : Aciers
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Lot Aciers Haute Adhérence FeE500 (Quincaillerie)", 10, 71);

        const maj = 1.05; // +5% chutes
        const q_ha6 = Math.ceil((acier_ha6 * maj) / 2.66);
        const q_ha8 = Math.ceil((acier_ha8 * maj) / 4.74);
        const q_ha10 = Math.ceil((acier_ha10 * maj) / 7.40);
        const q_ha12 = Math.ceil((acier_ha12 * maj) / 10.66);
        const q_ha16 = Math.ceil((acier_ha16 * maj) / 18.94);
        const rouleauxFil = Math.ceil(aciers_tot / 1500);
        const lotsCales = Math.ceil(S_tot / 15);

        doc.autoTable({
            startY: 74, ...tableStyles,
            head: [['Calibre Nominal', 'Usage Structurel', 'Quantité Nette (kg)', 'Nombre de Barres 12m', 'Prix Unitaire Indicatif', 'Montant Estimé FCFA']],
            body: [
                ['Fer HA 6', 'Cadres, épingles', formatNb(acier_ha6 * maj), formatNb(q_ha6) + ' barres', '1 500', formatNb(q_ha6 * 1500)],
                ['Fer HA 8', 'Treillis, nervures', formatNb(acier_ha8 * maj), formatNb(q_ha8) + ' barres', '2 600', formatNb(q_ha8 * 2600)],
                ['Fer HA 10', 'Raidisseurs, chaînages', formatNb(acier_ha10 * maj), formatNb(q_ha10) + ' barres', '4 100', formatNb(q_ha10 * 4100)],
                ['Fer HA 12', 'Poteaux, poutres', formatNb(acier_ha12 * maj), formatNb(q_ha12) + ' barres', '5 900', formatNb(q_ha12 * 5900)],
                ['Fer HA 14/16', 'Semelles isolées fortes', formatNb(acier_ha16 * maj), formatNb(q_ha16) + ' barres', '10 500', formatNb(q_ha16 * 10500)],
                ['Fil de recuit', 'Ligature des aciers', formatNb(rouleauxFil * 25), formatNb(rouleauxFil) + ' rouleau(x) de 25 kg', '25 000', formatNb(rouleauxFil * 25000)],
                ['Cales d\'enrobage', 'Protection béton', '-', formatNb(lotsCales) + ' lot(s) de 100', '5 000', formatNb(lotsCales * 5000)]
            ]
        });

        // Tableau 2 : Ciment & Maçonnerie
        doc.text("2. Lot Ciment & Maçonnerie (Dépôt / Préfabrication)", 10, doc.lastAutoTable.finalY + 8);
        const palettes = Math.floor(sacs_ciment_tot / 40);
        const sacsRestants = sacs_ciment_tot % 40;
        const conditionnementCiment = palettes > 0 ? `${palettes} palette(s) de 2T + ${sacsRestants} sacs` : `${sacsRestants} sacs`;

        const agglos_pleins = Math.round(S * 11.5 * 0.3); // Estimation soubassement
        const agglos_creux = agglos_tot - agglos_pleins > 0 ? agglos_tot - agglos_pleins : agglos_tot;

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11, ...tableStyles,
            head: [['Désignation Matériau', 'Spécification Technique', 'Conditionnement Recommandé', 'Quantité Totale', 'Prix Unitaire', 'Total FCFA']],
            body: [
                ['Ciment CEM II 42.5R', 'Résistance 42.5 MPa', conditionnementCiment, formatNb(sacs_ciment_tot) + ' sacs', '4 000', formatNb(sacs_ciment_tot * 4000)],
                ['Agglos creux 15x20x40', 'Vibrés mécaniquement', 'Livraison par lots', formatNb(agglos_creux) + ' unités', '350', formatNb(agglos_creux * 350)],
                ['Agglos pleins 15x20x40', 'Pleins (Soubassement)', 'Livraison par lots', formatNb(agglos_pleins) + ' unités', '450', formatNb(agglos_pleins * 450)],
                ['Hourdis béton 16 cm', 'Pour plancher 16+4', 'Livraison par lots', formatNb(hourdis_tot) + ' unités', '450', formatNb(hourdis_tot * 450)]
            ]
        });

        // Tableau 3 : Carrière & Agrégats
        doc.text("3. Lot Carrière & Agrégats (Transporteur / Benne)", 10, doc.lastAutoTable.finalY + 8);
        const camionsGravier = Math.ceil(gravier_tot / 16);
        const camionsSable = Math.ceil(sable_tot / 16);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11, ...tableStyles,
            head: [['Matériau', 'Provenance Certifiée', 'Volume Requis (m³)', 'Nombre de Camions (16 m³)', 'Prix Rotation Indicatif', 'Total FCFA']],
            body: [
                ['Gravier basalte concassé', 'Carrière Diack / Ngoundiane', formatNb(gravier_tot) + ' m³', formatNb(camionsGravier) + ' rotation(s)', '350 000', formatNb(camionsGravier * 350000)],
                ['Sable de dune lavé', 'Carrière Kayar / Lac Rose', formatNb(sable_tot) + ' m³', formatNb(camionsSable) + ' rotation(s)', '150 000', formatNb(camionsSable * 150000)]
            ]
        });

        // Cartouche de Réception
        let yPosRec = doc.lastAutoTable.finalY + 8;
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, yPosRec, 92, 25);
        doc.rect(108, yPosRec, 92, 25);
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("Visa Bon de Livraison Fournisseur", 13, yPosRec + 5);
        doc.text("Visa Représentant Maître d'Ouvrage", 111, yPosRec + 5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text("(Date, N° BL, Quantités livrées)", 13, yPosRec + 9);
        doc.text("(Conformité calibres et comptage)", 111, yPosRec + 9);
    };

    // --- COMMONS: KIT SÉCURITÉ (PAGES 5 & 6) ---
    const addSecurityKit = () => {
        doc.addPage();
        doc.setFontSize(7.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("ENTRE LES SOUSSIGNÉS :", 10, 38);
        doc.setFont("helvetica", "normal");
        doc.text("Le Maître d'Ouvrage, M./Mme " + (data.client_name || "____________________") + " (Le Client), d'une part,", 10, 42);
        doc.text("Et l'Entrepreneur / Le Tâcheron, d'autre part,", 10, 46);
        doc.setFont("helvetica", "bold");
        doc.text("IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :", 10, 54);

        let articles = [];
        let pvs = [];

        if (serviceType === "finitions") {
            articles = [
                "Article 1 - Objet du Contrat : Le présent contrat a pour objet l'exécution des travaux de Finitions & Second Œuvre (Lots carrelage, étanchéité terrasse, peinture, électricité et plomberie sanitaire) pour un bâtiment d'une surface développée de " + S_tot + " m² selon les prescriptions du BQE référencé " + refDossier + ".",
                "Article 2 - Délai d'Exécution et Pénalités : Les travaux devront être achevés dans le délai convenu. Tout retard non justifié entraînera l'application de pénalités de retard fixées forfaitairement à 50 000 FCFA par jour calendaire de retard, déductibles des acomptes.",
                "Article 3 - Modalités de Paiement : Les paiements seront effectués au prorata de l'avancement physique des travaux, conditionnés obligatoirement par la signature conjointe des Procès-Verbaux (PV) de points d'arrêt des 6 lots du second œuvre.",
                "Article 4 - Retenue de Garantie : Une retenue de garantie de 10 % sera déduite de chaque décompte. Cette retenue sera consignée pendant la période de garantie de parfait achèvement (un an) pour couvrir les malfaçons éventuelles et sera libérée à la réception définitive sans réserves.",
                "Article 5 - Garantie de Parfait Achèvement : Le Tâcheron est tenu à une garantie de parfait achèvement d'une durée d'un (1) an à compter de la réception provisoire. Durant cette période, il s'engage à réparer à ses frais tous les désordres, fuites, ou défauts d'isolation signalés par le Maître d'Ouvrage.",
                "Article 6 - Sous-traitance : L'Entrepreneur ne peut sous-traiter tout ou partie de son marché sans l'agrément préalable et écrit du Maître d'Ouvrage. La sous-traitance occulte est une cause de résiliation immédiate.",
                "Article 7 - Résiliation pour Malfaçon : En cas de malfaçon grave constatée (fuites réseaux, défaut d'étanchéité, carrelage décollé), le Maître d'Ouvrage se réserve le droit de résilier unilatéralement le contrat de plein droit, sans mise en demeure préalable.",
                "Article 8 - Règlement des Litiges : En cas de litige relatif à l'interprétation ou l'exécution du présent contrat, et à défaut de règlement à l'amiable, attribution expresse de juridiction est faite au Tribunal de Grande Instance de Dakar."
            ];
            pvs = [
                ["PV-01 : Réception des supports", "Vérification des chapes, enduits et planéité des sols avant pose des revêtements."],
                ["PV-02 : Test de mise en eau de l'étanchéité", "Épreuve de l'étanchéité terrasse (72h sous rétention d'eau sans infiltration)."],
                ["PV-03 : Épreuve sous pression des réseaux", "Vérification des réseaux de plomberie (zéro fuite à 6 bars de pression)."],
                ["PV-04 : Contrôle de l'isolement électrique", "Mesure de l'isolement et de la prise de terre (< 100 Ohms) avant mise sous tension."],
                ["PV-05 : Pose du carrelage", "Vérification de l'alignement des joints et de l'adhérence (test au son creux)."],
                ["PV-06 : Réception des couches de peinture", "Réception des subjectiles et application conforme des couches de peinture de finition."]
            ];
            pageTitles.push("CONTRAT CADRE POUR TRAVAUX DE FINITIONS & SECOND ŒUVRE");
            pageTitles.push("REGISTRE DES PROCÈS-VERBAUX DE RÉCEPTION DES POINTS D'ARRÊT (FINITIONS)");
        } else {
            articles = [
                "Article 1 - Objet du Contrat : Le présent contrat a pour objet l'exécution des travaux de Gros Œuvre pour un bâtiment de " + (N===0?"RDC":"R+"+N) + " d'une surface de " + S_tot + " m² selon les prescriptions du BQE référencé " + refDossier + ". Le Tâcheron s'engage à exécuter les travaux selon les règles de l'art.",
                "Article 2 - Délai d'Exécution et Pénalités : Les travaux devront être achevés dans un délai convenu. Tout retard non justifié par cas de force majeure entraînera de plein droit l'application de pénalités de retard fixées forfaitairement à 50 000 FCFA par jour calendaire de retard, déductibles des acomptes.",
                "Article 3 - Modalités de Paiement : Les paiements seront effectués au prorata de l'avancement physique des travaux, conditionnés obligatoirement par la signature conjointe des Procès-Verbaux (PV) de points d'arrêt. Aucun acompte ne sera versé sans la validation technique préalable de la phase précédente.",
                "Article 4 - Retenue de Garantie : Une retenue de garantie de 10 % sera déduite de chaque décompte. Cette retenue sera consignée pendant une durée de six (6) mois suivant la réception provisoire pour couvrir les malfaçons éventuelles. Elle sera libérée à la réception définitive sans réserves.",
                "Article 5 - Normes et Matériaux : Le Tâcheron s'oblige au respect strict des normes de calcul BAEL 91 Révisé 99. L'utilisation d'aciers lisses est formellement interdite. Tous les fers utilisés doivent être des armatures à Haute Adhérence (HA) nuance FeE500 certifiés.",
                "Article 6 - Sous-traitance : L'Entrepreneur ne peut sous-traiter tout ou partie de son marché sans l'agrément préalable et écrit du Maître d'Ouvrage. La sous-traitance occulte est une cause de résiliation immédiate.",
                "Article 7 - Résiliation pour Malfaçon : En cas de malfaçon grave constatée, de non-respect des enrobages ou de fraude sur la quantité des matériaux (ciment, acier), le Maître d'Ouvrage se réserve le droit de résilier unilatéralement le contrat de plein droit, sans mise en demeure préalable.",
                "Article 8 - Règlement des Litiges : En cas de litige relatif à l'interprétation ou l'exécution du présent contrat, et à défaut de règlement à l'amiable, attribution expresse de juridiction est faite au Tribunal de Grande Instance de Dakar."
            ];
            pvs = [
                ["PV-01 : Fond de fouille et sol d'assise", "Vérification profondeur, portance, nettoyage, béton de propreté 5 cm."],
                ["PV-02 : Cages d'armature semelles & longrines", "Vérification sections, cales d'enrobage (4.5cm si marin), propreté des fers."],
                ["PV-03 : Ferraillage des poteaux", "Vérification verticalité, recouvrements (50 x d), cadres resserrés (10 cm) en zone nodale."],
                ["PV-04 : Coffrage et plancher hourdis", "Vérification contre-flèche, étanchéité coffrage, treillis soudé anti-fissuration."],
                ["PV-05 : Coulage et vibration du béton", "Interdiction stricte de rajout d'eau en cours de coulage, utilisation de vibreur obligatoire."],
                ["PV-06 : Décoffrage et cure du béton", "Respect des délais de décoffrage (21 jours planchers), cure continue par humidification 7 jours."]
            ];
            pageTitles.push("CONTRAT TYPE DE TÂCHERONNERIE (DROIT SÉNÉGALAIS - COCC)");
            pageTitles.push("REGISTRE DES PROCÈS-VERBAUX DE RÉCEPTION DES POINTS D'ARRÊT");
        }

        let yPos = 62;
        doc.setFontSize(7.5);
        articles.forEach(art => {
            const lines = doc.splitTextToSize(art, 190);
            doc.text(lines, 10, yPos);
            yPos += (lines.length * 4) + 6;
        });

        yPos += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Fait en double exemplaire original, à ................................., le .................................", 10, yPos);
        
        drawBETStamp(doc, 105, yPos + 30, refDossier);

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

        doc.text("2. Plan de Masse & Trame Structurale BET", 10, doc.lastAutoTable.finalY + 10);
        
        // Advanced Plot Plan
        const rectY = doc.lastAutoTable.finalY + 15;
        const maxW = 160;
        const maxH = 110;
        
        // Dimensions
        let facade = parseFloat(data.custom_facade);
        let prof = parseFloat(data.custom_depth);
        if (!facade || !prof) {
            prof = Math.sqrt(S * 1.5);
            facade = S / prof;
        }
        
        // Scale to fit
        const scale = Math.min(maxW / facade, maxH / prof);
        const w = facade * scale;
        const h = prof * scale;
        const offsetX = 20 + (maxW - w) / 2;
        const offsetY = rectY + (maxH - h) / 2;

        // Route (Voie publique)
        doc.setFillColor(226, 232, 240); // slate-200
        doc.rect(offsetX, offsetY - 12, w, 12, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...grayColor);
        doc.text("VOIE PUBLIQUE / RUE", offsetX + w/2, offsetY - 4, { align: "center" });

        // Terrain
        doc.setFillColor(248, 250, 252);
        doc.rect(offsetX, offsetY, w, h, 'F');
        doc.setLineWidth(0.5);
        doc.setDrawColor(0, 0, 0);
        doc.rect(offsetX, offsetY, w, h, 'S');
        
        // Cotes Terrain
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text(formatNb(facade) + " m", offsetX + w/2, offsetY + h + 4, { align: "center" });
        doc.text(formatNb(prof) + " m", offsetX - 2, offsetY + h/2, { align: "right", angle: 90 });

        // Recul 3m
        const recul = 3 * scale;
        doc.setLineWidth(0.2);
        doc.setLineDash([2, 2], 0);
        doc.setDrawColor(100, 116, 139);
        doc.line(offsetX, offsetY + recul, offsetX + w, offsetY + recul);
        doc.setLineDash([], 0);
        doc.text("Recul 3m", offsetX + 2, offsetY + recul - 2);

        // Cour arrière (40% space roughly)
        const courH = Math.max(h * 0.3, 3 * scale); 
        doc.setFillColor(220, 252, 231); // vert clair
        doc.rect(offsetX, offsetY + h - courH, w, courH, 'F');
        doc.setTextColor(21, 128, 61);
        doc.text("Cour arrière réglementaire", offsetX + w/2, offsetY + h - courH/2, { align: "center" });

        // Emprise Bâtie
        const batY = offsetY + recul;
        const batH = h - recul - courH;
        doc.setFillColor(224, 242, 254); // sky-100
        doc.rect(offsetX, batY, w, batH, 'F');
        doc.setDrawColor(2, 132, 199); // sky-600
        doc.setLineWidth(0.4);
        doc.rect(offsetX, batY, w, batH, 'S');

        // Trame poteaux (tous les 4m)
        doc.setFillColor(0, 0, 0);
        const gridStep = 4 * scale;
        for (let x = offsetX; x <= offsetX + w + 0.1; x += gridStep) {
            for (let y = batY; y <= batY + batH + 0.1; y += gridStep) {
                // Adjust to borders
                let px = Math.min(x, offsetX + w - 1.5);
                let py = Math.min(y, batY + batH - 1.5);
                if (px === x) px -= 1.5;
                if (py === y) py -= 1.5;
                doc.rect(px, py, 3, 3, 'F');
            }
        }

        // Nord Rose des vents
        const nx = 185, ny = rectY + 15;
        doc.setDrawColor(220, 38, 38);
        doc.setFillColor(220, 38, 38);
        doc.triangle(nx, ny-5, nx-2, ny, nx+2, ny, 'FD'); // Nord rouge
        doc.setDrawColor(148, 163, 184);
        doc.setFillColor(148, 163, 184);
        doc.triangle(nx, ny+5, nx-2, ny, nx+2, ny, 'FD'); // Sud gris
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.text("N", nx - 1, ny - 6);
        
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
        doc.setFont("helvetica", "normal");
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
        
        if (zoneCotiere) {
            doc.setFillColor(254, 226, 226);
            doc.rect(10, yPosFond + 5, 190, 20, 'F');
            doc.setTextColor(220, 38, 38);
            doc.setFont("helvetica", "bold");
            doc.text("ZONE LITTORALE CORROSIVE DÉTECTÉE :", 12, yPosFond + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Risque d'éclatement du béton par carbonatation et chlorures marins. Cales d'enrobage préfabriquées étanches obligatoires sous tous les fers. Interdiction absolue d'utiliser du sable marin non lavé.", 12, yPosFond + 16, { maxWidth: 186 });
            yPosFond += 28;
        }

        if (isHivernage) {
            doc.setFillColor(254, 243, 199);
            doc.rect(10, yPosFond + 5, 190, 22, 'F');
            doc.setTextColor(180, 83, 9);
            doc.setFont("helvetica", "bold");
            doc.text("PROTOCOLE HIVERNAGE ACTIVÉ :", 12, yPosFond + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Protection anti-lessivage : Bâchage obligatoire du béton frais en cas d'averse. Le blindage des fouilles est requis pour prévenir les éboulements sableux. Un budget prévisionnel d'épuisement des eaux (motopompe) a été inclus dans l'estimation financière.", 12, yPosFond + 16, { maxWidth: 186 });
        }

        // Page 3
        doc.addPage();
        pageTitles.push("AVANT-MÉTRÉ PRÉVISIONNEL DES VOLUMES GLOBAUX");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Désignation', 'Béton (m³)', 'Ciment (sacs)', 'Aciers (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos/Hourdis']],
            body: [
                ['Infrastructure (Fondations)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '0'],
                ['Superstructure RDC', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(agglos_tot/Math.max(1, N||1))],
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
        
        // Planning Gantt
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Tableau Chronologique Prévisionnel de Chantier", 10, doc.lastAutoTable.finalY + 10);
        
        let ganttBodyEsq = [
            ['Phase 1 (Semaines 1 à 3)', 'Terrassements, fouilles, coulage du béton de propreté et ferraillage des semelles.'],
            ['Phase 2 (Semaines 3 à 4)', 'Coulage des semelles isolées, longrines de liaison et décoffrage.'],
            ['Phase 3 (Semaines 5 à 7)', 'Élévation des maçonneries de soubassement, remblais compactés et coulage dallage sol.'],
            ['Phase 4 (Semaines 8 à 11)', 'Coffrage poteaux/poutres, pose du plancher hourdis 16+4 et cure 21 jours.']
        ];
        if (N > 0) {
            ganttBodyEsq.push(['Phases Étages (+ ' + (N * 4) + ' Sem.)', 'Ajouter 4 semaines de cycle de coffrage/coulage/séchage par niveau supplémentaire.']);
        }
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 13,
            ...tableStyles,
            head: [['Période', 'Opérations Techniques Majeures']],
            body: ganttBodyEsq
        });
        
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(148, 163, 184);
        doc.rect(10, doc.lastAutoTable.finalY + 8, 190, 16, 'FD');
        doc.setTextColor(11, 19, 37);
        doc.setFont("helvetica", "bold");
        doc.text("RÈGLE BAEL ART. A.3 :", 12, doc.lastAutoTable.finalY + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Le décoffrage des planchers porteurs avant 21 jours de cure complète est une cause majeure d'effondrement différé. Tout artisan exigeant un décoffrage précoce engage sa responsabilité décennale.", 12, doc.lastAutoTable.finalY + 18, { maxWidth: 186 });

        // Page 4
        doc.addPage();
        pageTitles.push("BORDEREAU DE CONSULTATION DES ENTREPRISES (BCE VIERGE)");
        
        doc.setFontSize(7.5);
        doc.text("Ce document est à remettre à 3 entreprises différentes pour obtenir des devis comparables sur des bases quantitatives identiques.", 10, 36);

        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['Désignation des ouvrages', 'Unité', 'Quantité', 'Prix Unitaire FCFA', 'Montant Total FCFA']],
                ['I. INSTALLATION ET TERRASSEMENT', '', '', '', ''],
                ['Installation de chantier, repli et nettoyage', 'Forfait', '1', '', ''],
                ['Fouilles en rigoles et en puits', 'm³', formatNb(S * 0.4), '', ''],
                ['Remblai d\'apport en sable', 'm³', formatNb(S * 0.2), '', ''],
                isHivernage ? ['Blindage et épuisement des eaux pluviales (Forfait Hivernage)', 'Forfait', '1', '', ''] : null,
                ['II. GROS ŒUVRE INFRASTRUCTURE', '', '', '', ''],
                ['Béton de propreté dosé à 150 kg/m³', 'm³', formatNb(S * 0.05), '', ''],
                ['Béton armé en fondation (semelles, longrines)', 'm³', formatNb(V_bet_infra), '', ''],
                ['Maçonnerie de soubassement en agglos pleins', 'm²', formatNb(S * 0.3), '', ''],
                ['Dallage au sol épaisseur 10cm treillis soudé', 'm²', formatNb(S), '', ''],
                ['III. GROS ŒUVRE SUPERSTRUCTURE', '', '', '', ''],
                ['Béton armé en élévation (poteaux, poutres, chaînages)', 'm³', formatNb(V_bet_rdc + V_bet_etages), '', ''],
                ['Plancher à corps creux (hourdis 16+4)', 'm²', formatNb(S * Math.max(1, N||1)), '', ''],
                ['Maçonnerie en agglos creux 15cm', 'm²', formatNb(surface_murs), '', ''],
                ['Enduits au mortier de ciment (int + ext)', 'm²', formatNb(surface_murs * 2), '', ''],
                ['TOTAL HORS TAXES', '', '', '', ''],
                ['TVA (18%)', '', '', '', ''],
                ['TOTAL TTC', '', '', '', '']
            ].filter(row => row !== null),
            didParseCell: function(data) {
                if (data.row.raw[0].startsWith('I.') || data.row.raw[0].startsWith('TOTAL')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });

        addDiasporaProtocol();
        addAdministrativeCosts();
        addPurchaseOrder();
        addSecurityKit();
    }
    
    // =========================================================================
    // SERVICE 2: EXPRESS
    // =========================================================================
    else if (serviceType === "express") {
        const forfaitHivernage = isHivernage ? Math.round(S_tot * 3500) : 0;
        const budgetTotalGrosOeuvre = (sacs_ciment_tot*4000) + (aciers_tot*550) + (sable_tot*15000) + (gravier_tot*22000) + (agglos_tot*350) + (hourdis_tot*450) + 750000 + (S_tot*20000) + 300000 + forfaitHivernage;

        // Page 1
        pageTitles.push("AVANT-MÉTRÉ GROS ŒUVRE EXPRESS");
        
        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['Phase d\'Ouvrage', 'Béton (m³)', 'Ciment (sacs)', 'Acier (kg)', 'Sable (m³)', 'Gravier (m³)', 'Agglos/Hourdis']],
            body: [
                ['Fondations (Semelles, Longrines)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '0'],
                ['RDC (Poteaux, Poutres, Dallage)', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(agglos_tot/Math.max(1, N||1))],
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
                ['HA 6', formatNb(acier_ha6), '40 x d (24 cm)', formatNb(acier_ha6 / 2.66), 'Cadres, étriers, épingles (effort tranchant)'],
                ['HA 8', formatNb(acier_ha8), '40 x d (32 cm)', formatNb(acier_ha8 / 4.74), 'Treillis de dalle, nervures de plancher'],
                ['HA 10', formatNb(acier_ha10), '50 x d (50 cm)', formatNb(acier_ha10 / 7.40), 'Ferraillage poteaux secondaires, raidisseurs'],
                ['HA 12', formatNb(acier_ha12), '50 x d (60 cm)', formatNb(acier_ha12 / 10.66), 'Poteaux principaux, armatures filantes poutres'],
                ['HA 14 / HA 16', formatNb(acier_ha16), '50 x d (80 cm)', formatNb(acier_ha16 / 18.96), 'Poutres de grande portée, semelles isolées fortes'],
                [{content: 'TOTAL', colSpan: 1, styles: {fontStyle: 'bold'}}, 
                 {content: formatNb(aciers_tot) + ' kg', colSpan: 4, styles: {fontStyle: 'bold'}}]
            ]
        });

        doc.setFontSize(7.5);
        doc.text("Fournitures annexes obligatoires pour le lot Ferraillage :", 10, doc.lastAutoTable.finalY + 10);
        doc.text(`- Fil de recuit (ligature) : Prévoir ${formatNb(aciers_tot * 0.015)} kg environ (1.5% du tonnage).`, 10, doc.lastAutoTable.finalY + 16);
        doc.text(`- Cales d'enrobage préfabriquées en béton : OBLIGATOIRES sous toutes les nappes d'acier (${enrobage}).`, 10, doc.lastAutoTable.finalY + 21);
        
        let yPosExpress = doc.lastAutoTable.finalY + 26;
        if (zoneCotiere) {
            doc.setFillColor(254, 226, 226);
            doc.rect(10, yPosExpress, 190, 20, 'F');
            doc.setTextColor(220, 38, 38);
            doc.setFont("helvetica", "bold");
            doc.text("ZONE LITTORALE CORROSIVE DÉTECTÉE :", 12, yPosExpress + 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Risque d'éclatement du béton par carbonatation et chlorures marins. Cales d'enrobage préfabriquées étanches obligatoires sous tous les fers. Interdiction absolue d'utiliser du sable marin non lavé.", 12, yPosExpress + 11, { maxWidth: 186 });
            yPosExpress += 28;
        }

        if (isHivernage) {
            doc.setFillColor(254, 243, 199);
            doc.rect(10, yPosExpress, 190, 22, 'F');
            doc.setTextColor(180, 83, 9);
            doc.setFont("helvetica", "bold");
            doc.text("PROTOCOLE HIVERNAGE ACTIVÉ :", 12, yPosExpress + 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Protection anti-lessivage : Bâchage obligatoire du béton frais en cas d'averse. Le blindage des fouilles est requis pour prévenir les éboulements sableux. Un budget prévisionnel d'épuisement des eaux (motopompe) a été inclus dans l'estimation financière.", 12, yPosExpress + 11, { maxWidth: 186 });
        }
        
        // Page 3
        doc.addPage();
        pageTitles.push("ÉCHÉANCIER FINANCIER & PLANNING PRÉVISIONNEL (GANTT)");
        
        const tranche1 = Math.round(budgetTotalGrosOeuvre * 0.10);
        const tranche2 = Math.round(budgetTotalGrosOeuvre * 0.25);
        const tranche3 = Math.round(budgetTotalGrosOeuvre * 0.30);
        const tranche4 = Math.round(budgetTotalGrosOeuvre * 0.25);
        const tranche5 = budgetTotalGrosOeuvre - (tranche1 + tranche2 + tranche3 + tranche4);

        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Phase de Décaissement', 'Avancement Physique Requis / Livrable', 'Part (%)', 'Montant TTC Estimé (FCFA)']],
            body: [
                ['Acompte Démarrage', 'Signature du contrat et installation de chantier', '10%', formatNb(tranche1)],
                ['Tranche Infrastructure', 'Validation PV-01 et coulage complet fondations', '25%', formatNb(tranche2)],
                ['Tranche Élévation RDC', 'Validation PV-03 et élévation maçonnerie RDC', '30%', formatNb(tranche3)],
                ['Tranche Plancher', 'Validation PV-04 et coulage plancher haut', '25%', formatNb(tranche4)],
                ['Solde de Finition', 'Levée des réserves et réception provisoire', '10%', formatNb(tranche5)],
                [{content: 'TOTAL GÉNÉRAL', colSpan: 3, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, 
                 {content: formatNb(budgetTotalGrosOeuvre) + ' FCFA', styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });
        
        // Planning Gantt
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Tableau Chronologique Prévisionnel de Chantier", 10, doc.lastAutoTable.finalY + 10);
        
        let ganttBody = [
            ['Phase 1 (Semaines 1 à 3)', 'Terrassements, fouilles, coulage du béton de propreté et ferraillage des semelles.'],
            ['Phase 2 (Semaines 3 à 4)', 'Coulage des semelles isolées, longrines de liaison et décoffrage.'],
            ['Phase 3 (Semaines 5 à 7)', 'Élévation des maçonneries de soubassement, remblais compactés et coulage dallage sol.'],
            ['Phase 4 (Semaines 8 à 11)', 'Coffrage poteaux/poutres, pose du plancher hourdis 16+4 et cure 21 jours.']
        ];
        if (N > 0) {
            ganttBody.push(['Phases Étages (+ ' + (N * 4) + ' Sem.)', 'Ajouter 4 semaines de cycle de coffrage/coulage/séchage par niveau supplémentaire.']);
        }
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 13,
            ...tableStyles,
            head: [['Période', 'Opérations Techniques Majeures']],
            body: ganttBody
        });
        
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.rect(10, doc.lastAutoTable.finalY + 8, 190, 16, 'FD');
        doc.setTextColor(11, 19, 37);
        doc.setFont("helvetica", "bold");
        doc.text("RÈGLE BAEL ART. A.3 :", 12, doc.lastAutoTable.finalY + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Le décoffrage des planchers porteurs avant 21 jours de cure complète est une cause majeure d'effondrement différé. Tout artisan exigeant un décoffrage précoce engage sa responsabilité décennale.", 12, doc.lastAutoTable.finalY + 18, { maxWidth: 186 });

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
                 {content: formatNb(budgetTotalGrosOeuvre) + ' FCFA', styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });
        
        addDiasporaProtocol();
        addAdministrativeCosts();
        addPurchaseOrder();
        addSecurityKit();
    }
    
    // =========================================================================
    // SERVICE 3: AUDIT
    // =========================================================================
    else if (serviceType === "audit") {
        const surcout_ciment = Math.round((sacs_ciment_tot * 0.25) * 4000);
        const surcout_acier = Math.round((aciers_tot * 0.30) * 550);
        const surcout_sable = Math.round((sable_tot * 0.15) * 15000);
        const surcout_gravier = Math.round((gravier_tot * 0.20) * 22000);
        const surcout_mo = Math.round(S_tot * 5000);
        const ecartGlobal = surcout_ciment + surcout_acier + surcout_sable + surcout_gravier + surcout_mo;

        // Page 1
        pageTitles.push("SYNTHÈSE DÉCISIONNELLE & BALANCE FINANCIÈRE");
        
        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['Indicateur de Performance', 'Évaluation de l\'Audit IA']],
            body: [
                ['Score de Conformité Technique', '62 / 100 (Attention requise)'],
                ['Niveau de Risque Financier', 'ÉLEVÉ (Surfacturation détectée)'],
                ['Écart Budgétaire Global', '+ ' + formatNb(ecartGlobal) + ' FCFA par rapport au référentiel BAEL']
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
                ['HA 6', formatNb(acier_ha6) + ' kg', '0.28', '40 x d', '+/- 5%'],
                ['HA 8', formatNb(acier_ha8) + ' kg', '0.50', '40 x d', '+/- 5%'],
                ['HA 10', formatNb(acier_ha10) + ' kg', '0.79', '50 x d', '+/- 3%'],
                ['HA 12', formatNb(acier_ha12) + ' kg', '1.13', '50 x d', '+/- 3%'],
                ['HA 16', formatNb(acier_ha16) + ' kg', '2.01', '50 x d', '+/- 2%']
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
                ['Ciment CEM II 42.5R (sacs)', formatNb(sacs_ciment_tot * 1.25), formatNb(sacs_ciment_tot), '+ 25%', 'Surfacturation de matières', formatNb(surcout_ciment)],
                ['Aciers FeE500 (kg)', formatNb(aciers_tot * 1.30), formatNb(aciers_tot), '+ 30%', 'Surdimensionnement injustifié', formatNb(surcout_acier)],
                ['Sable de dune (m³)', formatNb(sable_tot * 1.15), formatNb(sable_tot), '+ 15%', 'Tolérance acceptable (foisonnement)', formatNb(surcout_sable)],
                ['Gravier Diack (m³)', formatNb(gravier_tot * 1.20), formatNb(gravier_tot), '+ 20%', 'Légère surfacturation', formatNb(surcout_gravier)],
                ['Hourdis 16+4 (unités)', formatNb(hourdis_tot * 1.05), formatNb(hourdis_tot), '+ 5%', 'Conforme', '0'],
                ['Agglos 15cm (unités)', formatNb(agglos_tot * 1.10), formatNb(agglos_tot), '+ 10%', 'Casse intégrée raisonnable', '0'],
                ['Location Bois/Étais', '1 Forfait', '1 Forfait', '0%', 'Conforme au marché', '0'],
                ['Main d\'Œuvre Tâcheron (m²)', formatNb(S_tot * 25000), formatNb(S_tot * 20000), '+ 25%', 'Tarif hors barème syndical', formatNb(surcout_mo)]
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

        addDiasporaProtocol();
        addAdministrativeCosts();
        addPurchaseOrder();
        addSecurityKit();
    }
    
    // =========================================================================
    // SERVICE 4: FINITIONS
    // =========================================================================
    else if (serviceType === "finitions") {
        // Page 1
        pageTitles.push("BILAN DES SURFACES DE SECOND ŒUVRE & TYPOLOGIE");
        
        doc.autoTable({
            startY: 45, ...tableStyles,
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

    // =========================================================================
    // ANNEXE PRATIQUE : FICHE DE SURVEILLANCE DU REPRÉSENTANT LOCAL (PAGE 7)
    // =========================================================================
    doc.addPage();
    pageTitles.push("FICHE DE SURVEILLANCE DU REPRÉSENTANT LOCAL (NON-TECHNICIEN)");
    
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.setDrawColor(30, 58, 138);   // border-blue-900
    doc.setLineWidth(0.3);
    doc.rect(10, 38, 190, 22, 'FD');
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("GUIDE D'INSPECTION VISUELLE SIMPLIFIÉE :", 14, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(11, 19, 37);
    doc.text("Ce protocole est destiné au parent, ami ou mandataire du Maître d'Ouvrage présent sur site. Aucun acompte ou achat de matériaux ne doit être débloqué sans la vérification stricte de ces 4 contrôles physiques incompressibles.", 14, 49, { maxWidth: 182 });

    doc.autoTable({
        startY: 65, ...tableStyles,
        head: [['Point de Contrôle', 'Règle de Chantier Incompressible', 'Action Immédiate du Représentant', 'Statut']],
        body: [
            ['Ciment & Règle des Sacs Vides', 'Mention CEM II 42.5R obligatoire (Sococim, Dangote, Sahel). Stockage sur palettes bois surélevées de 15 cm avec bâche étanche.', 'Compter et pointer les sacs vides avant d\'autoriser tout nouvel achat. Refuser tout sac durci présentant des grumeaux.', '[   ] OK\n\n[   ] KO'],
            ['Aciers & Détection Faux Fer', 'Aciers Haute Adhérence (crantés) FeE500 exclusivement. Fer lisse formellement interdit en structure.', 'Mesurer le diamètre des barres. Vérifier l\'installation de vraies cales d\'enrobage en béton (interdiction absolue de caler avec du gravier ou des morceaux de briques).', '[   ] OK\n\n[   ] KO'],
            ['Eau & Gâchage du Béton', 'Eau potable SEN\'EAU obligatoire (zéro eau de puits saumâtre corrosive). Béton ferme et plastique.', 'Interdire formellement aux ouvriers de rajouter de l\'eau dans la bétonnière pour fluidifier le béton. Exiger l\'aiguille vibrante en marche.', '[   ] OK\n\n[   ] KO'],
            ['Cure et Arrosage', 'Le béton frais doit rester humide pour atteindre sa résistance sans fissurer.', 'Exiger l\'arrosage copieux des dalles et poteaux 2 fois par jour pendant 7 jours dès le lendemain du coulage.', '[   ] OK\n\n[   ] KO']
        ],
        columnStyles: { 3: { cellWidth: 20 } }
    });

    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Pack de Preuves Numériques WhatsApp (Protocole Diaspora) :", 10, doc.lastAutoTable.finalY + 10);
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 14, ...tableStyles,
        head: [['Réf', 'Médias Contractuels à Exiger de l\'Artisan (Avant Paiement)']],
        body: [
            ['Photo 1', 'Photo grand angle de l\'armature complète avant fermeture des coffrages.'],
            ['Photo 2', 'Gros plan net sur les cales d\'enrobage béton sous les nappes d\'acier.'],
            ['Photo 3', 'Mesure au mètre ruban des longueurs de recouvrement des barres (50 × Ø).'],
            ['Vidéo 1', 'Vidéo de 15 secondes attestant de l\'utilisation du vibreur mécanique lors du coulage.']
        ],
        columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' } }
    });

    let yPosEmarge = doc.lastAutoTable.finalY + 15;
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, yPosEmarge, 190, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("ATTESTATION DE CONTRÔLE VISUEL", 15, yPosEmarge + 7);
    doc.setFont("helvetica", "normal");
    doc.text("Nom du représentant sur place : ...................................................................", 15, yPosEmarge + 15);
    doc.text("Téléphone WhatsApp : ...................................................................................", 15, yPosEmarge + 23);
    doc.text("Date du pointage : ........ / ........ / 20........", 15, yPosEmarge + 31);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("« Je confirme avoir vérifié visuellement les 4 points d'arrêt ci-dessus et certifie la conformité des éléments contrôlés. »", 15, yPosEmarge + 40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 19, 37);
    doc.text("Signature du Mandataire :", 130, yPosEmarge + 15);

    // --- APPLICATION DE L'EN-TÊTE ET PIED DE PAGE SUR TOUTES LES PAGES ---
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        renderPageHeader(doc, i, totalPages, pageTitles[i-1], refDossier, logoBase64, data);
    }

    // Save to LocalStorage (via safe wrapper) for recovery
    const pdfData = doc.output('datauristring');
    try {
        if (window.safeStorage) {
            window.safeStorage.setItem("cs_last_order", JSON.stringify({ 
                ref: refDossier, 
                service: serviceType, 
                date: new Date().toISOString(), 
                pdfData: pdfData 
            }), false);
        } else {
            localStorage.setItem("cs_last_order", JSON.stringify({ 
                ref: refDossier, 
                service: serviceType, 
                date: new Date().toISOString(), 
                pdfData: pdfData 
            }));
        }
    } catch (e) {
    }

    // Save PDF
    doc.save(`${refDossier}_${serviceType.toUpperCase()}.pdf`);

    return new Promise((resolve) => {
        resolve({ ref: refDossier, service: serviceType, pdfData: pdfData });
    });
};

window.generateProjectPDF = typeof generateProjectPDF !== 'undefined' ? generateProjectPDF : (typeof generatePDF !== 'undefined' ? generatePDF : (typeof genererDossierBQE !== 'undefined' ? genererDossierBQE : null));

window.generateProjectPDF = typeof generateProjectPDF !== 'undefined' ? generateProjectPDF : (typeof generatePDF !== 'undefined' ? generatePDF : null);
