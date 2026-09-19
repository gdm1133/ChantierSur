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

    // 1. Fond du bandeau supÃ©rieur
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

    // 4. Cartouche MÃ©tadonnÃ©es
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(11, 19, 37);
    doc.text(`RÃ‰F : ${projectRef}`, pageWidth - margin - 2, margin + 6.5, { align: "right" });

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
        doc.text(`MaÃ®tre d'Ouvrage : ${clientData.client_name}  |  Contact : ${clientData.phone_prefix || ''} ${clientData.client_phone || ''}`, margin, 30);
        doc.text(`LocalitÃ© : ${clientData.project_location || ''}  |  Foncier : ${clientData.land_status || ''} ${clientData.lot_number ? '(Lot: ' + clientData.lot_number + ')' : ''}`, margin, 34);
    }

    // Footer de page
    doc.setDrawColor(203, 213, 225);
    doc.line(10, 282, 200, 282);
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Document technique de prÃ©dimensionnement structurel et d'estimation financiÃ¨re d'aide Ã  la dÃ©cision. Ce dossier ne constitue pas un plan de permis de construire.`, 10, 286, { maxWidth: 190 });
    doc.text(`Il doit faire l'objet d'un visa par un architecte inscrit Ã  l'ODAS et un bureau de contrÃ´le technique agrÃ©Ã© pour tout dÃ©pÃ´t administratif.`, 10, 289, { maxWidth: 190 });
    doc.text(`ConformitÃ© Juridique & NumÃ©rique : DonnÃ©es chiffrÃ©es TLS 1.3 (256 bits) â€¢ Paiement PayTech BCEAO â€¢ Conforme Loi nÂ° 2008-12 (CDP) & COCC SÃ©nÃ©gal.`, 10, 292, { maxWidth: 190 });
    doc.text(`RÃ©f: ${projectRef} | IngÃ©nierie automatisÃ©e par ChantierSur.com | Contact: admin@chantiersur.com`, 10, 296);
}

window.genererDossierBQE = async function(data, serviceType = "express", extra = {}) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF n'est pas chargÃ©");
        alert("Erreur de chargement du module PDF. Veuillez rÃ©essayer.");
        return;
    }

    const logoBase64 = await loadLogoBase64();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // --- MOTEUR MATHÃ‰MATIQUE PARAMÃ‰TRIQUE ---
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
    
    // BÃ©ton ventilÃ©
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

    // AgrÃ©gats
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

    // GÃ©otechnique
    let portance = "2.0 bars";
    let classeExposition = "Standard (XC1/XC2)";
    let enrobage = "3.0 cm";
    let typeCiment = "CEM II 42.5R";
    const zoneCotiere = data.zone_cotiere === "true" || data.zone_cotiere === true;
    const isHivernage = data.is_hivernage === "true" || data.is_hivernage === true;
    
    if (zone.includes('cotier') || zone.includes('petite_cote') || zone === 'dakar_cotier' || zoneCotiere) {
        portance = "1.8 bars"; 
        classeExposition = "Marine sÃ©vÃ¨re (XS3)"; 
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
        doc.text("CHANTIERSUR BET â€¢ AUDIT & STRUCTURE", x, y - 9, { align: "center" });
        doc.text("CONFORME BAEL 91 R99 â€¢ DROIT SÃ‰NÃ‰GALAIS COCC", x, y + 9, { align: "center" });
        
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
        pageTitles.push("PROTOCOLE DE VALIDATION VISUELLE Ã€ DISTANCE (DIASPORA & WHATSAPP)");

        // Bandeau d'Instruction OpÃ©rationnelle
        doc.setFillColor(11, 19, 37); // #0B1325
        doc.setDrawColor(245, 158, 11); // #F59E0B
        doc.setLineWidth(0.6);
        doc.rect(10, 38, 190, 24, 'FD');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("RÃˆGLE CONTRACTUELLE STRICTE :", 12, 44);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(241, 245, 249);
        doc.text("Aucun acompte de phase de travaux ne doit Ãªtre virÃ© Ã  l'artisan sans la rÃ©ception prÃ©alable des clichÃ©s conformes ci-dessous. Chaque envoi WhatsApp doit Ãªtre accompagnÃ© de la mention de la date et de la rÃ©fÃ©rence du dossier. Tout Ã©lÃ©ment structurel coulÃ© sans validation visuelle prÃ©alable dÃ©gage la responsabilitÃ© du MaÃ®tre d'Ouvrage.", 12, 49, { maxWidth: 186 });

        // Grand Tableau Quadri-Colonnes
        doc.autoTable({
            startY: 65, ...tableStyles,
            head: [['Ã‰tape / Jalon', 'Prises de Vue Obligatoires (WhatsApp)', 'DÃ©tails de ConformitÃ© BAEL', 'Motif de Blocage Financier ImmÃ©diat']],
            body: [
                ['Fondations & Fouilles (PV-01)', '1 vue d\'ensemble tranchÃ©e\n1 mesure profondeur avec mÃ¨tre ruban\n1 gros plan bÃ©ton de propretÃ©', 'Sol d\'assise nettoyÃ©, horizontal, bÃ©ton de propretÃ© 5 cm rÃ©gulier.', 'Fond de fouille inondÃ©, boueux, ou semelles posÃ©es directement sur la terre.'],
                ['Armatures & Calage d\'Enrobage (PV-02)', '1 vue gÃ©nÃ©rale semelles\n1 gros plan rasant sous les nappes d\'acier', 'Cales d\'enrobage prÃ©fabriquÃ©es Ã©tanches en bÃ©ton de 4,5 cm (littoral) ou 3 cm en place.', 'Ferraille au contact du sol ou calage artisanal (morceaux de briques, agglos ou bois).'],
                ['Poteaux & Longueurs de Recouvrement (PV-03)', '1 vue d\'ensemble poteau avant coffrage\n1 gros plan mÃ¨tre ruban sur chevauchement d\'acier\n1 photo cadres nÅ“ud', 'Recouvrement minimal de 50 x Ã˜ (50 cm pour HA 10, 60 cm pour HA 12), cadres resserrÃ©s Ã  10 cm en zone nodale.', 'Barres aboutÃ©es sans longueur d\'ancrage, aciers lisses de rebut, ligature absente.'],
                ['Plancher Hourdis & Ã‰taiement (PV-04)', '1 vue sous dalle (Ã©tais)\n1 vue dessus (hourdis + treillis soudÃ© sur cales)', 'Ã‰tais mÃ©talliques d\'aplomb sur bastaings, treillis soudÃ© surÃ©levÃ© sur cales, rÃ©servations techniques rÃ©servÃ©es.', 'Ã‰tais en bois bricolÃ©s, flÃ¨che de coffrage visible, treillis non surÃ©levÃ© posÃ© Ã  plat sur les briques.'],
                ['Coulage & Vibration MÃ©canique (PV-05)', '1 courte vidÃ©o (15 s) montrant l\'aiguille vibrante immergÃ©e\n1 photo consistance bÃ©tonniÃ¨re', 'Aiguille vibrante motorisÃ©e active, bÃ©ton ferme et plastique, eau dosÃ©e strictement.', 'Ajout sauvage de seaux d\'eau dans le bÃ©ton, absence totale d\'aiguille vibrante mÃ©canique.'],
                ['DÃ©coffrage Ã  21 Jours & Parements (PV-06)', '1 photo plancher dÃ©coffrÃ© aprÃ¨s 21 jours\n1 gros plan arÃªtes et tÃªtes de poteaux', 'Parements pleins, absence de nids de gravier, arrosage continu visible.', 'DÃ©coffrage hÃ¢tif avant 21 jours, aciers apparents par sÃ©grÃ©gation du bÃ©ton, fissuration transversale.']
            ]
        });

        // EncadrÃ© de ClÃ´ture
        let yPosCheck = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, yPosCheck, 190, 28, 'FD');
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("Checklist de DÃ©blocage Wave / Orange Money :", 12, yPosCheck + 7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("[  ] Photos reÃ§ues et conformes aux critÃ¨res ci-dessus", 12, yPosCheck + 13);
        doc.text("[  ] Date vÃ©rifiÃ©e par repÃ¨re temporel ou appel vidÃ©o en direct", 12, yPosCheck + 18);
        doc.text("[  ] ProcÃ¨s-Verbal (Page 6) signÃ© conjointement par le reprÃ©sentant local et le tÃ¢cheron", 12, yPosCheck + 23);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61); // green-700
        doc.text("--> DÃ‰BLOCAGE DE L'ACOMPTE AUTORISÃ‰.", 130, yPosCheck + 23);
    };

    // --- COMMONS: FRAIS ADMINISTRATIFS (NOUVELLE PAGE) ---
    const addAdministrativeCosts = () => {
        doc.addPage();
        pageTitles.push("BARÃˆME PRÃ‰VISIONNEL DES FORMALITÃ‰S ADMINISTRATIVES & FRAIS ANNEXES DE DÃ‰MARRAGE");

        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("BUDGET ESTIMATIF PRÃ‰-CHANTIER : FORMALITÃ‰S, RACCORDEMENTS & SÃ‰CURISATION JURIDIQUE", 10, 38);

        doc.autoTable({
            startY: 42, ...tableStyles,
            head: [['Poste / FormalitÃ©', 'Organisme / Intervenant', 'Base d\'Ã‰valuation', 'Fourchette MarchÃ© (FCFA)', 'Niveau de PrioritÃ©']],
            body: [
                ['Bornage contradictoire & RÃ©tablissement de bornes', 'GÃ©omÃ¨tre-Expert agrÃ©Ã© ONGES', 'VÃ©rification physique des 4 sommets de la parcelle, PV contradictoire signÃ© avec les voisins.', '150 000 Ã  250 000', 'OBLIGATOIRE'],
                ['Constat d\'Ã©tat des lieux prÃ©ventif des mitoyennetÃ©s', 'Commissaire de Justice (Huissier)', 'Constat des fissures prÃ©existantes sur les faÃ§ades mitoyennes pour neutraliser les litiges.', '80 000 Ã  120 000', 'FORTEMENT RECOMMANDÃ‰'],
                ['Raccordement Eau Douce de Chantier', 'SEN\'EAU (ou camions-citernes)', 'Branchement provisoire au rÃ©seau potable. Eau de puits saumÃ¢tre interdite (corrosion).', '90 000 Ã  160 000', 'OBLIGATOIRE'],
                ['Branchement Ã‰lectrique Forain / Provisoire', 'SENELEC', 'Abonnement Woyofal de chantier (30A monophasÃ©) pour machines et Ã©clairage.', '85 000 Ã  150 000', 'OBLIGATOIRE'],
                ['Panneau d\'Affichage RÃ©glementaire du Permis', 'Fournisseur signalÃ©tique', 'Panneau rigide 1.20x0.80m visible de la rue (Art. R.82 Code Urbanisme).', '35 000 Ã  60 000', 'OBLIGATOIRE'],
                ['ClÃ´ture de Chantier & Abri de Stockage SÃ©curisÃ©', 'TÃ¢cheron / Gardiennage', 'Palissade tÃ´le et abri couvert surÃ©levÃ© pour stocker le ciment Ã  l\'abri.', '150 000 Ã  300 000', 'OBLIGATOIRE'],
                [{content: 'ENVELOPPE PRÃ‰ALABLE ESTIMÃ‰E (Ã€ provisionner hors coÃ»t de main-d\'Å“uvre tÃ¢cheron)', colSpan: 3, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, {content: '590 000 Ã  1 040 000 FCFA', colSpan: 2, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });

        // EncadrÃ© d'Alerte Juridique
        let yPosAlert = doc.lastAutoTable.finalY + 10;
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(30, 58, 138); // bleu ardoise
        doc.setLineWidth(0.4);
        doc.rect(10, yPosAlert, 190, 24, 'FD');
        doc.setTextColor(30, 58, 138);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("RAPPEL CONTRÃ”LE DSCOS :", 12, yPosAlert + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("La Direction de la Surveillance et du ContrÃ´le de l'Occupation des Sols effectue des descentes inopinÃ©es rÃ©guliÃ¨res sur les chantiers. Le dÃ©faut de panneau visible, l'absence d'autorisation de construire ou un empiÃ¨tement sur la voie publique entraÃ®ne l'arrÃªt immÃ©diat des travaux, la confiscation du matÃ©riel de l'artisan et une amende pÃ©nale. SÃ©curisez ces formalitÃ©s avant la livraison de la premiÃ¨re tonne de ciment.", 12, yPosAlert + 11, { maxWidth: 186 });
    };

    // --- COMMONS: BON DE COMMANDE FOURNISSEUR ---
    const addPurchaseOrder = () => {
        doc.addPage();
        pageTitles.push("BON DE COMMANDE QUINCAILLERIE & CARRIÃˆRE â€” APPROVISIONNEMENT DIRECT");

        // En-tÃªte fournisseur
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(30, 58, 138);
        doc.setLineWidth(0.4);
        doc.rect(10, 38, 190, 25, 'FD');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text("Destinataire / Fournisseur : ...........................................................................................................................", 15, 45);
        doc.text("Nom du Livreur / TÃ©l. : ..................................................................................................................................", 15, 52);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Commande passÃ©e directement par le MaÃ®tre d'Ouvrage (" + (data.client_name || "Client") + "). Tout changement de marque ou de calibre sans accord Ã©crit entraÃ®ne le rejet immÃ©diat de la livraison sur chantier.", 15, 59, { maxWidth: 180 });

        // Tableau 1 : Aciers
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Lot Aciers Haute AdhÃ©rence FeE500 (Quincaillerie)", 10, 71);

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
            head: [['Calibre Nominal', 'Usage Structurel', 'QuantitÃ© Nette (kg)', 'Nombre de Barres 12m', 'Prix Unitaire Indicatif', 'Montant EstimÃ© FCFA']],
            body: [
                ['Fer HA 6', 'Cadres, Ã©pingles', formatNb(acier_ha6 * maj), formatNb(q_ha6) + ' barres', '1 500', formatNb(q_ha6 * 1500)],
                ['Fer HA 8', 'Treillis, nervures', formatNb(acier_ha8 * maj), formatNb(q_ha8) + ' barres', '2 600', formatNb(q_ha8 * 2600)],
                ['Fer HA 10', 'Raidisseurs, chaÃ®nages', formatNb(acier_ha10 * maj), formatNb(q_ha10) + ' barres', '4 100', formatNb(q_ha10 * 4100)],
                ['Fer HA 12', 'Poteaux, poutres', formatNb(acier_ha12 * maj), formatNb(q_ha12) + ' barres', '5 900', formatNb(q_ha12 * 5900)],
                ['Fer HA 14/16', 'Semelles isolÃ©es fortes', formatNb(acier_ha16 * maj), formatNb(q_ha16) + ' barres', '10 500', formatNb(q_ha16 * 10500)],
                ['Fil de recuit', 'Ligature des aciers', formatNb(rouleauxFil * 25), formatNb(rouleauxFil) + ' rouleau(x) de 25 kg', '25 000', formatNb(rouleauxFil * 25000)],
                ['Cales d\'enrobage', 'Protection bÃ©ton', '-', formatNb(lotsCales) + ' lot(s) de 100', '5 000', formatNb(lotsCales * 5000)]
            ]
        });

        // Tableau 2 : Ciment & MaÃ§onnerie
        doc.text("2. Lot Ciment & MaÃ§onnerie (DÃ©pÃ´t / PrÃ©fabrication)", 10, doc.lastAutoTable.finalY + 8);
        const palettes = Math.floor(sacs_ciment_tot / 40);
        const sacsRestants = sacs_ciment_tot % 40;
        const conditionnementCiment = palettes > 0 ? `${palettes} palette(s) de 2T + ${sacsRestants} sacs` : `${sacsRestants} sacs`;

        const agglos_pleins = Math.round(S * 11.5 * 0.3); // Estimation soubassement
        const agglos_creux = agglos_tot - agglos_pleins > 0 ? agglos_tot - agglos_pleins : agglos_tot;

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11, ...tableStyles,
            head: [['DÃ©signation MatÃ©riau', 'SpÃ©cification Technique', 'Conditionnement RecommandÃ©', 'QuantitÃ© Totale', 'Prix Unitaire', 'Total FCFA']],
            body: [
                ['Ciment CEM II 42.5R', 'RÃ©sistance 42.5 MPa', conditionnementCiment, formatNb(sacs_ciment_tot) + ' sacs', '4 000', formatNb(sacs_ciment_tot * 4000)],
                ['Agglos creux 15x20x40', 'VibrÃ©s mÃ©caniquement', 'Livraison par lots', formatNb(agglos_creux) + ' unitÃ©s', '350', formatNb(agglos_creux * 350)],
                ['Agglos pleins 15x20x40', 'Pleins (Soubassement)', 'Livraison par lots', formatNb(agglos_pleins) + ' unitÃ©s', '450', formatNb(agglos_pleins * 450)],
                ['Hourdis bÃ©ton 16 cm', 'Pour plancher 16+4', 'Livraison par lots', formatNb(hourdis_tot) + ' unitÃ©s', '450', formatNb(hourdis_tot * 450)]
            ]
        });

        // Tableau 3 : CarriÃ¨re & AgrÃ©gats
        doc.text("3. Lot CarriÃ¨re & AgrÃ©gats (Transporteur / Benne)", 10, doc.lastAutoTable.finalY + 8);
        const camionsGravier = Math.ceil(gravier_tot / 16);
        const camionsSable = Math.ceil(sable_tot / 16);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 11, ...tableStyles,
            head: [['MatÃ©riau', 'Provenance CertifiÃ©e', 'Volume Requis (mÂ³)', 'Nombre de Camions (16 mÂ³)', 'Prix Rotation Indicatif', 'Total FCFA']],
            body: [
                ['Gravier basalte concassÃ©', 'CarriÃ¨re Diack / Ngoundiane', formatNb(gravier_tot) + ' mÂ³', formatNb(camionsGravier) + ' rotation(s)', '350 000', formatNb(camionsGravier * 350000)],
                ['Sable de dune lavÃ©', 'CarriÃ¨re Kayar / Lac Rose', formatNb(sable_tot) + ' mÂ³', formatNb(camionsSable) + ' rotation(s)', '150 000', formatNb(camionsSable * 150000)]
            ]
        });

        // Cartouche de RÃ©ception
        let yPosRec = doc.lastAutoTable.finalY + 8;
        doc.setDrawColor(203, 213, 225);
        doc.rect(10, yPosRec, 92, 25);
        doc.rect(108, yPosRec, 92, 25);
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text("Visa Bon de Livraison Fournisseur", 13, yPosRec + 5);
        doc.text("Visa ReprÃ©sentant MaÃ®tre d'Ouvrage", 111, yPosRec + 5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text("(Date, NÂ° BL, QuantitÃ©s livrÃ©es)", 13, yPosRec + 9);
        doc.text("(ConformitÃ© calibres et comptage)", 111, yPosRec + 9);
    };

    // --- COMMONS: KIT SÃ‰CURITÃ‰ (PAGES 5 & 6) ---
    const addSecurityKit = () => {
        doc.addPage();
        doc.setFontSize(7.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("ENTRE LES SOUSSIGNÃ‰S :", 10, 38);
        doc.setFont("helvetica", "normal");
        doc.text("Le MaÃ®tre d'Ouvrage, M./Mme " + (data.client_name || "____________________") + " (Le Client), d'une part,", 10, 42);
        doc.text("Et l'Entrepreneur / Le TÃ¢cheron, d'autre part,", 10, 46);
        doc.setFont("helvetica", "bold");
        doc.text("IL A Ã‰TÃ‰ CONVENU ET ARRÃŠTÃ‰ CE QUI SUIT :", 10, 54);

        let articles = [];
        let pvs = [];

        if (serviceType === "finitions") {
            articles = [
                "Article 1 - Objet du Contrat : Le prÃ©sent contrat a pour objet l'exÃ©cution des travaux de Finitions & Second Å’uvre (Lots carrelage, Ã©tanchÃ©itÃ© terrasse, peinture, Ã©lectricitÃ© et plomberie sanitaire) pour un bÃ¢timent d'une surface dÃ©veloppÃ©e de " + S_tot + " mÂ² selon les prescriptions du BQE rÃ©fÃ©rencÃ© " + refDossier + ".",
                "Article 2 - DÃ©lai d'ExÃ©cution et PÃ©nalitÃ©s : Les travaux devront Ãªtre achevÃ©s dans le dÃ©lai convenu. Tout retard non justifiÃ© entraÃ®nera l'application de pÃ©nalitÃ©s de retard fixÃ©es forfaitairement Ã  50 000 FCFA par jour calendaire de retard, dÃ©ductibles des acomptes.",
                "Article 3 - ModalitÃ©s de Paiement : Les paiements seront effectuÃ©s au prorata de l'avancement physique des travaux, conditionnÃ©s obligatoirement par la signature conjointe des ProcÃ¨s-Verbaux (PV) de points d'arrÃªt des 6 lots du second Å“uvre.",
                "Article 4 - Retenue de Garantie : Une retenue de garantie de 10 % sera dÃ©duite de chaque dÃ©compte. Cette retenue sera consignÃ©e pendant la pÃ©riode de garantie de parfait achÃ¨vement (un an) pour couvrir les malfaÃ§ons Ã©ventuelles et sera libÃ©rÃ©e Ã  la rÃ©ception dÃ©finitive sans rÃ©serves.",
                "Article 5 - Garantie de Parfait AchÃ¨vement : Le TÃ¢cheron est tenu Ã  une garantie de parfait achÃ¨vement d'une durÃ©e d'un (1) an Ã  compter de la rÃ©ception provisoire. Durant cette pÃ©riode, il s'engage Ã  rÃ©parer Ã  ses frais tous les dÃ©sordres, fuites, ou dÃ©fauts d'isolation signalÃ©s par le MaÃ®tre d'Ouvrage.",
                "Article 6 - Sous-traitance : L'Entrepreneur ne peut sous-traiter tout ou partie de son marchÃ© sans l'agrÃ©ment prÃ©alable et Ã©crit du MaÃ®tre d'Ouvrage. La sous-traitance occulte est une cause de rÃ©siliation immÃ©diate.",
                "Article 7 - RÃ©siliation pour MalfaÃ§on : En cas de malfaÃ§on grave constatÃ©e (fuites rÃ©seaux, dÃ©faut d'Ã©tanchÃ©itÃ©, carrelage dÃ©collÃ©), le MaÃ®tre d'Ouvrage se rÃ©serve le droit de rÃ©silier unilatÃ©ralement le contrat de plein droit, sans mise en demeure prÃ©alable.",
                "Article 8 - RÃ¨glement des Litiges : En cas de litige relatif Ã  l'interprÃ©tation ou l'exÃ©cution du prÃ©sent contrat, et Ã  dÃ©faut de rÃ¨glement Ã  l'amiable, attribution expresse de juridiction est faite au Tribunal de Grande Instance de Dakar."
            ];
            pvs = [
                ["PV-01 : RÃ©ception des supports", "VÃ©rification des chapes, enduits et planÃ©itÃ© des sols avant pose des revÃªtements."],
                ["PV-02 : Test de mise en eau de l'Ã©tanchÃ©itÃ©", "Ã‰preuve de l'Ã©tanchÃ©itÃ© terrasse (72h sous rÃ©tention d'eau sans infiltration)."],
                ["PV-03 : Ã‰preuve sous pression des rÃ©seaux", "VÃ©rification des rÃ©seaux de plomberie (zÃ©ro fuite Ã  6 bars de pression)."],
                ["PV-04 : ContrÃ´le de l'isolement Ã©lectrique", "Mesure de l'isolement et de la prise de terre (< 100 Ohms) avant mise sous tension."],
                ["PV-05 : Pose du carrelage", "VÃ©rification de l'alignement des joints et de l'adhÃ©rence (test au son creux)."],
                ["PV-06 : RÃ©ception des couches de peinture", "RÃ©ception des subjectiles et application conforme des couches de peinture de finition."]
            ];
            pageTitles.push("CONTRAT CADRE POUR TRAVAUX DE FINITIONS & SECOND Å’UVRE");
            pageTitles.push("REGISTRE DES PROCÃˆS-VERBAUX DE RÃ‰CEPTION DES POINTS D'ARRÃŠT (FINITIONS)");
        } else {
            articles = [
                "Article 1 - Objet du Contrat : Le prÃ©sent contrat a pour objet l'exÃ©cution des travaux de Gros Å’uvre pour un bÃ¢timent de " + (N===0?"RDC":"R+"+N) + " d'une surface de " + S_tot + " mÂ² selon les prescriptions du BQE rÃ©fÃ©rencÃ© " + refDossier + ". Le TÃ¢cheron s'engage Ã  exÃ©cuter les travaux selon les rÃ¨gles de l'art.",
                "Article 2 - DÃ©lai d'ExÃ©cution et PÃ©nalitÃ©s : Les travaux devront Ãªtre achevÃ©s dans un dÃ©lai convenu. Tout retard non justifiÃ© par cas de force majeure entraÃ®nera de plein droit l'application de pÃ©nalitÃ©s de retard fixÃ©es forfaitairement Ã  50 000 FCFA par jour calendaire de retard, dÃ©ductibles des acomptes.",
                "Article 3 - ModalitÃ©s de Paiement : Les paiements seront effectuÃ©s au prorata de l'avancement physique des travaux, conditionnÃ©s obligatoirement par la signature conjointe des ProcÃ¨s-Verbaux (PV) de points d'arrÃªt. Aucun acompte ne sera versÃ© sans la validation technique prÃ©alable de la phase prÃ©cÃ©dente.",
                "Article 4 - Retenue de Garantie : Une retenue de garantie de 10 % sera dÃ©duite de chaque dÃ©compte. Cette retenue sera consignÃ©e pendant une durÃ©e de six (6) mois suivant la rÃ©ception provisoire pour couvrir les malfaÃ§ons Ã©ventuelles. Elle sera libÃ©rÃ©e Ã  la rÃ©ception dÃ©finitive sans rÃ©serves.",
                "Article 5 - Normes et MatÃ©riaux : Le TÃ¢cheron s'oblige au respect strict des normes de calcul BAEL 91 RÃ©visÃ© 99. L'utilisation d'aciers lisses est formellement interdite. Tous les fers utilisÃ©s doivent Ãªtre des armatures Ã  Haute AdhÃ©rence (HA) nuance FeE500 certifiÃ©s.",
                "Article 6 - Sous-traitance : L'Entrepreneur ne peut sous-traiter tout ou partie de son marchÃ© sans l'agrÃ©ment prÃ©alable et Ã©crit du MaÃ®tre d'Ouvrage. La sous-traitance occulte est une cause de rÃ©siliation immÃ©diate.",
                "Article 7 - RÃ©siliation pour MalfaÃ§on : En cas de malfaÃ§on grave constatÃ©e, de non-respect des enrobages ou de fraude sur la quantitÃ© des matÃ©riaux (ciment, acier), le MaÃ®tre d'Ouvrage se rÃ©serve le droit de rÃ©silier unilatÃ©ralement le contrat de plein droit, sans mise en demeure prÃ©alable.",
                "Article 8 - RÃ¨glement des Litiges : En cas de litige relatif Ã  l'interprÃ©tation ou l'exÃ©cution du prÃ©sent contrat, et Ã  dÃ©faut de rÃ¨glement Ã  l'amiable, attribution expresse de juridiction est faite au Tribunal de Grande Instance de Dakar."
            ];
            pvs = [
                ["PV-01 : Fond de fouille et sol d'assise", "VÃ©rification profondeur, portance, nettoyage, bÃ©ton de propretÃ© 5 cm."],
                ["PV-02 : Cages d'armature semelles & longrines", "VÃ©rification sections, cales d'enrobage (4.5cm si marin), propretÃ© des fers."],
                ["PV-03 : Ferraillage des poteaux", "VÃ©rification verticalitÃ©, recouvrements (50 x d), cadres resserrÃ©s (10 cm) en zone nodale."],
                ["PV-04 : Coffrage et plancher hourdis", "VÃ©rification contre-flÃ¨che, Ã©tanchÃ©itÃ© coffrage, treillis soudÃ© anti-fissuration."],
                ["PV-05 : Coulage et vibration du bÃ©ton", "Interdiction stricte de rajout d'eau en cours de coulage, utilisation de vibreur obligatoire."],
                ["PV-06 : DÃ©coffrage et cure du bÃ©ton", "Respect des dÃ©lais de dÃ©coffrage (21 jours planchers), cure continue par humidification 7 jours."]
            ];
            pageTitles.push("CONTRAT TYPE DE TÃ‚CHERONNERIE (DROIT SÃ‰NÃ‰GALAIS - COCC)");
            pageTitles.push("REGISTRE DES PROCÃˆS-VERBAUX DE RÃ‰CEPTION DES POINTS D'ARRÃŠT");
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
        doc.text("Fait en double exemplaire original, Ã  ................................., le .................................", 10, yPos);
        
        drawBETStamp(doc, 105, yPos + 30, refDossier);

        doc.setDrawColor(...primaryColor);
        doc.rect(15, yPos + 10, 80, 40);
        doc.text("Signature du MaÃ®tre d'Ouvrage", 20, yPos + 16);
        doc.setFont("helvetica", "normal");
        doc.text("(PrÃ©cÃ©dÃ©e de la mention 'Lu et approuvÃ©')", 20, yPos + 22);
        
        doc.setFont("helvetica", "bold");
        doc.rect(115, yPos + 10, 80, 40);
        doc.text("Signature de l'Entrepreneur", 120, yPos + 16);
        doc.setFont("helvetica", "normal");
        doc.text("(PrÃ©cÃ©dÃ©e de la mention 'Lu et approuvÃ©')", 120, yPos + 22);

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
            doc.text(`CritÃ¨res techniques: ${pv[1]}`, 12, startYPV + 13);
            
            doc.setDrawColor(...borderColor);
            doc.rect(10, startYPV, 190, 35);
            
            doc.rect(130, startYPV + 16, 5, 5);
            doc.text("Conforme", 137, startYPV + 19.5);
            doc.rect(160, startYPV + 16, 5, 5);
            doc.text("Non Conforme", 167, startYPV + 19.5);

            doc.setFontSize(7);
            doc.text("Date d'inspection : ____ / ____ / 20__", 12, startYPV + 22);
            doc.text("Visa MaÃ®tre d'Ouvrage:", 12, startYPV + 27);
            doc.text("Visa TÃ¢cheron:", 100, startYPV + 27);
            doc.line(10, startYPV + 35, 200, startYPV + 35);

            startYPV += 38;
        });
    };

    // =========================================================================
    // SERVICE 1: ESQUISSE
    // =========================================================================
    if (serviceType === "esquisse") {
        pageTitles.push("FICHE FONCIÃˆRE & SCHÃ‰MA D'IMPLANTATION");
        
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Analyse Urbanistique", 10, 38);
        
        doc.autoTable({
            startY: 43, ...tableStyles,
            head: [['ParamÃ¨tre Urbanistique', 'RÃ¨glementation / Norme', 'Valeur CalculÃ©e Projet', 'Statut']],
            body: [
                ['Surface totale parcelle', 'Selon titre de propriÃ©tÃ©', formatNb(S) + ' mÂ²', 'ValidÃ©'],
                ['CES (Coefficient Emprise au Sol)', 'GÃ©nÃ©ralement 60% max', formatNb(S * 0.60) + ' mÂ² max', 'Conforme'],
                ['COS (Surface Plancher constructible)', 'Variable selon plan d\'urbanisme', formatNb(S_tot) + ' mÂ²', 'Conforme'],
                ['Espace libre / Cour', 'Minimum 40%', formatNb(S * 0.40) + ' mÂ²', 'VÃ©rifiÃ©']
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

        // Cour arriÃ¨re (40% space roughly)
        const courH = Math.max(h * 0.3, 3 * scale); 
        doc.setFillColor(220, 252, 231); // vert clair
        doc.rect(offsetX, offsetY + h - courH, w, courH, 'F');
        doc.setTextColor(21, 128, 61);
        doc.text("Cour arriÃ¨re rÃ©glementaire", offsetX + w/2, offsetY + h - courH/2, { align: "center" });

        // Emprise BÃ¢tie
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
        pageTitles.push("FICHE GÃ‰OTECHNIQUE & STRUCTURE DES FONDATIONS");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['CaractÃ©ristique', 'Valeur de calcul applicable', 'Prescription BAEL']],
            body: [
                ['Zone gÃ©ographique', zone.replace('_', ' ').toUpperCase(), 'DÃ©termine les alÃ©as marins/salins'],
                ['Contrainte admissible du sol (\u03C3)', portance, 'Validation par essai pÃ©nÃ©tromÃ©trique requise'],
                ['Classe d\'exposition environnementale', classeExposition, 'DÃ©finit l\'enrobage et le type de ciment'],
                ['Enrobage minimal des armatures', enrobage, 'Cales d\'enrobage en bÃ©ton obligatoires'],
                ['Type de ciment recommandÃ©', typeCiment, 'Respect strict des normes d\'utilisation']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text("Dispositions constructives obligatoires :", 10, doc.lastAutoTable.finalY + 10);
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "normal");
        const textes_fondations = [
            "- Les fondations seront constituÃ©es de semelles isolÃ©es ou filantes selon l'Ã©tude de sol gÃ©otechnique dÃ©finitive.",
            "- En prÃ©sence de sols argileux ou gonflants (ex: Rufisque), prÃ©voir un chaÃ®nage pÃ©riphÃ©rique renforcÃ© et des fondations profondes si nÃ©cessaire.",
            "- Le bÃ©ton de propretÃ© (dosage 150 kg/m3) d'Ã©paisseur 5 cm est obligatoire sous toutes les semelles.",
            "- Les longrines de redressement doivent Ãªtre rigidifiÃ©es pour limiter les tassements diffÃ©rentiels."
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
            doc.text("ZONE LITTORALE CORROSIVE DÃ‰TECTÃ‰E :", 12, yPosFond + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Risque d'Ã©clatement du bÃ©ton par carbonatation et chlorures marins. Cales d'enrobage prÃ©fabriquÃ©es Ã©tanches obligatoires sous tous les fers. Interdiction absolue d'utiliser du sable marin non lavÃ©.", 12, yPosFond + 16, { maxWidth: 186 });
            yPosFond += 28;
        }

        if (isHivernage) {
            doc.setFillColor(254, 243, 199);
            doc.rect(10, yPosFond + 5, 190, 22, 'F');
            doc.setTextColor(180, 83, 9);
            doc.setFont("helvetica", "bold");
            doc.text("PROTOCOLE HIVERNAGE ACTIVÃ‰ :", 12, yPosFond + 11);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Protection anti-lessivage : BÃ¢chage obligatoire du bÃ©ton frais en cas d'averse. Le blindage des fouilles est requis pour prÃ©venir les Ã©boulements sableux. Un budget prÃ©visionnel d'Ã©puisement des eaux (motopompe) a Ã©tÃ© inclus dans l'estimation financiÃ¨re.", 12, yPosFond + 16, { maxWidth: 186 });
        }

        // Page 3
        doc.addPage();
        pageTitles.push("AVANT-MÃ‰TRÃ‰ PRÃ‰VISIONNEL DES VOLUMES GLOBAUX");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['DÃ©signation', 'BÃ©ton (mÂ³)', 'Ciment (sacs)', 'Aciers (kg)', 'Sable (mÂ³)', 'Gravier (mÂ³)', 'Agglos/Hourdis']],
            body: [
                ['Infrastructure (Fondations)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '0'],
                ['Superstructure RDC', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(agglos_tot/Math.max(1, N||1))],
                ['Superstructure Ã‰tages', formatNb(V_bet_etages), formatNb(V_bet_etages*7), formatNb(V_bet_etages*85), formatNb(V_bet_etages*0.45), formatNb(V_bet_etages*0.8), formatNb(hourdis_tot)],
                ['MaÃ§onneries & Remplissage', '0', formatNb(sacs_ciment_macon), '0', formatNb(sable_macon), '0', formatNb(agglos_tot)],
                [{content: 'TOTAL GÃ‰NÃ‰RAL', styles: {fillColor: primaryColor, textColor: [255,255,255], fontStyle: 'bold'}}, 
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
        doc.text("Tableau Chronologique PrÃ©visionnel de Chantier", 10, doc.lastAutoTable.finalY + 10);
        
        let ganttBodyEsq = [
            ['Phase 1 (Semaines 1 Ã  3)', 'Terrassements, fouilles, coulage du bÃ©ton de propretÃ© et ferraillage des semelles.'],
            ['Phase 2 (Semaines 3 Ã  4)', 'Coulage des semelles isolÃ©es, longrines de liaison et dÃ©coffrage.'],
            ['Phase 3 (Semaines 5 Ã  7)', 'Ã‰lÃ©vation des maÃ§onneries de soubassement, remblais compactÃ©s et coulage dallage sol.'],
            ['Phase 4 (Semaines 8 Ã  11)', 'Coffrage poteaux/poutres, pose du plancher hourdis 16+4 et cure 21 jours.']
        ];
        if (N > 0) {
            ganttBodyEsq.push(['Phases Ã‰tages (+ ' + (N * 4) + ' Sem.)', 'Ajouter 4 semaines de cycle de coffrage/coulage/sÃ©chage par niveau supplÃ©mentaire.']);
        }
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 13,
            ...tableStyles,
            head: [['PÃ©riode', 'OpÃ©rations Techniques Majeures']],
            body: ganttBodyEsq
        });
        
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(148, 163, 184);
        doc.rect(10, doc.lastAutoTable.finalY + 8, 190, 16, 'FD');
        doc.setTextColor(11, 19, 37);
        doc.setFont("helvetica", "bold");
        doc.text("RÃˆGLE BAEL ART. A.3 :", 12, doc.lastAutoTable.finalY + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Le dÃ©coffrage des planchers porteurs avant 21 jours de cure complÃ¨te est une cause majeure d'effondrement diffÃ©rÃ©. Tout artisan exigeant un dÃ©coffrage prÃ©coce engage sa responsabilitÃ© dÃ©cennale.", 12, doc.lastAutoTable.finalY + 18, { maxWidth: 186 });

        // Page 4
        doc.addPage();
        pageTitles.push("BORDEREAU DE CONSULTATION DES ENTREPRISES (BCE VIERGE)");
        
        doc.setFontSize(7.5);
        doc.text("Ce document est Ã  remettre Ã  3 entreprises diffÃ©rentes pour obtenir des devis comparables sur des bases quantitatives identiques.", 10, 36);

        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['DÃ©signation des ouvrages', 'UnitÃ©', 'QuantitÃ©', 'Prix Unitaire FCFA', 'Montant Total FCFA']],
                ['I. INSTALLATION ET TERRASSEMENT', '', '', '', ''],
                ['Installation de chantier, repli et nettoyage', 'Forfait', '1', '', ''],
                ['Fouilles en rigoles et en puits', 'mÂ³', formatNb(S * 0.4), '', ''],
                ['Remblai d\'apport en sable', 'mÂ³', formatNb(S * 0.2), '', ''],
                isHivernage ? ['Blindage et Ã©puisement des eaux pluviales (Forfait Hivernage)', 'Forfait', '1', '', ''] : null,
                ['II. GROS Å’UVRE INFRASTRUCTURE', '', '', '', ''],
                ['BÃ©ton de propretÃ© dosÃ© Ã  150 kg/mÂ³', 'mÂ³', formatNb(S * 0.05), '', ''],
                ['BÃ©ton armÃ© en fondation (semelles, longrines)', 'mÂ³', formatNb(V_bet_infra), '', ''],
                ['MaÃ§onnerie de soubassement en agglos pleins', 'mÂ²', formatNb(S * 0.3), '', ''],
                ['Dallage au sol Ã©paisseur 10cm treillis soudÃ©', 'mÂ²', formatNb(S), '', ''],
                ['III. GROS Å’UVRE SUPERSTRUCTURE', '', '', '', ''],
                ['BÃ©ton armÃ© en Ã©lÃ©vation (poteaux, poutres, chaÃ®nages)', 'mÂ³', formatNb(V_bet_rdc + V_bet_etages), '', ''],
                ['Plancher Ã  corps creux (hourdis 16+4)', 'mÂ²', formatNb(S * Math.max(1, N||1)), '', ''],
                ['MaÃ§onnerie en agglos creux 15cm', 'mÂ²', formatNb(surface_murs), '', ''],
                ['Enduits au mortier de ciment (int + ext)', 'mÂ²', formatNb(surface_murs * 2), '', ''],
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
        pageTitles.push("AVANT-MÃ‰TRÃ‰ GROS Å’UVRE EXPRESS");
        
        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['Phase d\'Ouvrage', 'BÃ©ton (mÂ³)', 'Ciment (sacs)', 'Acier (kg)', 'Sable (mÂ³)', 'Gravier (mÂ³)', 'Agglos/Hourdis']],
            body: [
                ['Fondations (Semelles, Longrines)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '0'],
                ['RDC (Poteaux, Poutres, Dallage)', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(agglos_tot/Math.max(1, N||1))],
                ['Ã‰tages Courants (Planchers, Voiles)', formatNb(V_bet_etages), formatNb(V_bet_etages*7), formatNb(V_bet_etages*85), formatNb(V_bet_etages*0.45), formatNb(V_bet_etages*0.8), formatNb(hourdis_tot)],
                ['MaÃ§onnerie (Ã‰lÃ©vation & Enduits)', '0', formatNb(sacs_ciment_macon), '0', formatNb(sable_macon), '0', formatNb(agglos_tot)],
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
        pageTitles.push("NOMENCLATURE INTÃ‰GRALE DES ACIERS (HA FeE500)");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['DiamÃ¨tre Nominal', 'Tonnage Brut (kg)', 'Recouvrement Lr', 'Eq. Barres de 12m', 'Utilisation Principale']],
            body: [
                ['HA 6', formatNb(acier_ha6), '40 x d (24 cm)', formatNb(acier_ha6 / 2.66), 'Cadres, Ã©triers, Ã©pingles (effort tranchant)'],
                ['HA 8', formatNb(acier_ha8), '40 x d (32 cm)', formatNb(acier_ha8 / 4.74), 'Treillis de dalle, nervures de plancher'],
                ['HA 10', formatNb(acier_ha10), '50 x d (50 cm)', formatNb(acier_ha10 / 7.40), 'Ferraillage poteaux secondaires, raidisseurs'],
                ['HA 12', formatNb(acier_ha12), '50 x d (60 cm)', formatNb(acier_ha12 / 10.66), 'Poteaux principaux, armatures filantes poutres'],
                ['HA 14 / HA 16', formatNb(acier_ha16), '50 x d (80 cm)', formatNb(acier_ha16 / 18.96), 'Poutres de grande portÃ©e, semelles isolÃ©es fortes'],
                [{content: 'TOTAL', colSpan: 1, styles: {fontStyle: 'bold'}}, 
                 {content: formatNb(aciers_tot) + ' kg', colSpan: 4, styles: {fontStyle: 'bold'}}]
            ]
        });

        doc.setFontSize(7.5);
        doc.text("Fournitures annexes obligatoires pour le lot Ferraillage :", 10, doc.lastAutoTable.finalY + 10);
        doc.text(`- Fil de recuit (ligature) : PrÃ©voir ${formatNb(aciers_tot * 0.015)} kg environ (1.5% du tonnage).`, 10, doc.lastAutoTable.finalY + 16);
        doc.text(`- Cales d'enrobage prÃ©fabriquÃ©es en bÃ©ton : OBLIGATOIRES sous toutes les nappes d'acier (${enrobage}).`, 10, doc.lastAutoTable.finalY + 21);
        
        let yPosExpress = doc.lastAutoTable.finalY + 26;
        if (zoneCotiere) {
            doc.setFillColor(254, 226, 226);
            doc.rect(10, yPosExpress, 190, 20, 'F');
            doc.setTextColor(220, 38, 38);
            doc.setFont("helvetica", "bold");
            doc.text("ZONE LITTORALE CORROSIVE DÃ‰TECTÃ‰E :", 12, yPosExpress + 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Risque d'Ã©clatement du bÃ©ton par carbonatation et chlorures marins. Cales d'enrobage prÃ©fabriquÃ©es Ã©tanches obligatoires sous tous les fers. Interdiction absolue d'utiliser du sable marin non lavÃ©.", 12, yPosExpress + 11, { maxWidth: 186 });
            yPosExpress += 28;
        }

        if (isHivernage) {
            doc.setFillColor(254, 243, 199);
            doc.rect(10, yPosExpress, 190, 22, 'F');
            doc.setTextColor(180, 83, 9);
            doc.setFont("helvetica", "bold");
            doc.text("PROTOCOLE HIVERNAGE ACTIVÃ‰ :", 12, yPosExpress + 6);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Protection anti-lessivage : BÃ¢chage obligatoire du bÃ©ton frais en cas d'averse. Le blindage des fouilles est requis pour prÃ©venir les Ã©boulements sableux. Un budget prÃ©visionnel d'Ã©puisement des eaux (motopompe) a Ã©tÃ© inclus dans l'estimation financiÃ¨re.", 12, yPosExpress + 11, { maxWidth: 186 });
        }
        
        // Page 3
        doc.addPage();
        pageTitles.push("Ã‰CHÃ‰ANCIER FINANCIER & PLANNING PRÃ‰VISIONNEL (GANTT)");
        
        const tranche1 = Math.round(budgetTotalGrosOeuvre * 0.10);
        const tranche2 = Math.round(budgetTotalGrosOeuvre * 0.25);
        const tranche3 = Math.round(budgetTotalGrosOeuvre * 0.30);
        const tranche4 = Math.round(budgetTotalGrosOeuvre * 0.25);
        const tranche5 = budgetTotalGrosOeuvre - (tranche1 + tranche2 + tranche3 + tranche4);

        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Phase de DÃ©caissement', 'Avancement Physique Requis / Livrable', 'Part (%)', 'Montant TTC EstimÃ© (FCFA)']],
            body: [
                ['Acompte DÃ©marrage', 'Signature du contrat et installation de chantier', '10%', formatNb(tranche1)],
                ['Tranche Infrastructure', 'Validation PV-01 et coulage complet fondations', '25%', formatNb(tranche2)],
                ['Tranche Ã‰lÃ©vation RDC', 'Validation PV-03 et Ã©lÃ©vation maÃ§onnerie RDC', '30%', formatNb(tranche3)],
                ['Tranche Plancher', 'Validation PV-04 et coulage plancher haut', '25%', formatNb(tranche4)],
                ['Solde de Finition', 'LevÃ©e des rÃ©serves et rÃ©ception provisoire', '10%', formatNb(tranche5)],
                [{content: 'TOTAL GÃ‰NÃ‰RAL', colSpan: 3, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, 
                 {content: formatNb(budgetTotalGrosOeuvre) + ' FCFA', styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}]
            ]
        });
        
        // Planning Gantt
        doc.setFontSize(8.5);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("Tableau Chronologique PrÃ©visionnel de Chantier", 10, doc.lastAutoTable.finalY + 10);
        
        let ganttBody = [
            ['Phase 1 (Semaines 1 Ã  3)', 'Terrassements, fouilles, coulage du bÃ©ton de propretÃ© et ferraillage des semelles.'],
            ['Phase 2 (Semaines 3 Ã  4)', 'Coulage des semelles isolÃ©es, longrines de liaison et dÃ©coffrage.'],
            ['Phase 3 (Semaines 5 Ã  7)', 'Ã‰lÃ©vation des maÃ§onneries de soubassement, remblais compactÃ©s et coulage dallage sol.'],
            ['Phase 4 (Semaines 8 Ã  11)', 'Coffrage poteaux/poutres, pose du plancher hourdis 16+4 et cure 21 jours.']
        ];
        if (N > 0) {
            ganttBody.push(['Phases Ã‰tages (+ ' + (N * 4) + ' Sem.)', 'Ajouter 4 semaines de cycle de coffrage/coulage/sÃ©chage par niveau supplÃ©mentaire.']);
        }
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 13,
            ...tableStyles,
            head: [['PÃ©riode', 'OpÃ©rations Techniques Majeures']],
            body: ganttBody
        });
        
        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.rect(10, doc.lastAutoTable.finalY + 8, 190, 16, 'FD');
        doc.setTextColor(11, 19, 37);
        doc.setFont("helvetica", "bold");
        doc.text("RÃˆGLE BAEL ART. A.3 :", 12, doc.lastAutoTable.finalY + 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Le dÃ©coffrage des planchers porteurs avant 21 jours de cure complÃ¨te est une cause majeure d'effondrement diffÃ©rÃ©. Tout artisan exigeant un dÃ©coffrage prÃ©coce engage sa responsabilitÃ© dÃ©cennale.", 12, doc.lastAutoTable.finalY + 18, { maxWidth: 186 });

        // Page 4
        doc.addPage();
        pageTitles.push("BUDGET ESTIMATIF DÃ‰TAILLÃ‰ (PRIX MOYENS MARCHÃ‰ DAKAROIS)");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['DÃ©signation des MatÃ©riaux et Services', 'QuantitÃ©', 'UnitÃ©', 'Prix Unitaire FCFA', 'Montant Sous-Total FCFA']],
            body: [
                ['Fournitures - Ciment CEM II 42.5R', formatNb(sacs_ciment_tot), 'sacs', '4 000', formatNb(sacs_ciment_tot*4000)],
                ['Fournitures - Acier HA FeE500', formatNb(aciers_tot), 'kg', '550', formatNb(aciers_tot*550)],
                ['Fournitures - Sable de dune tamisÃ©', formatNb(sable_tot), 'mÂ³', '15 000', formatNb(sable_tot*15000)],
                ['Fournitures - Gravier basalte Diack', formatNb(gravier_tot), 'mÂ³', '22 000', formatNb(gravier_tot*22000)],
                ['Fournitures - Agglos 15cm pleins/creux', formatNb(agglos_tot), 'unitÃ©s', '350', formatNb(agglos_tot*350)],
                ['Fournitures - Hourdis 16cm', formatNb(hourdis_tot), 'unitÃ©s', '450', formatNb(hourdis_tot*450)],
                ['Location - Ã‰tais mÃ©talliques & bois coffrage', '1', 'forfait', '750 000', '750 000'],
                ['Main d\'Å’uvre - TÃ¢cheronnerie Gros Å’uvre', formatNb(S_tot), 'mÂ²', '20 000', formatNb(S_tot*20000)],
                ['Frais Annexes - Eau, Ã‰lectricitÃ©, SÃ©curitÃ©', '1', 'forfait', '300 000', '300 000'],
                [{content: 'ESTIMATION GLOBALE GROS Å’UVRE', colSpan: 4, styles: {fontStyle: 'bold', fillColor: primaryColor, textColor: [255,255,255]}}, 
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
        pageTitles.push("SYNTHÃˆSE DÃ‰CISIONNELLE & BALANCE FINANCIÃˆRE");
        
        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['Indicateur de Performance', 'Ã‰valuation de l\'Audit IA']],
            body: [
                ['Score de ConformitÃ© Technique', '62 / 100 (Attention requise)'],
                ['Niveau de Risque Financier', 'Ã‰LEVÃ‰ (Surfacturation dÃ©tectÃ©e)'],
                ['Ã‰cart BudgÃ©taire Global', '+ ' + formatNb(ecartGlobal) + ' FCFA par rapport au rÃ©fÃ©rentiel BAEL']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("NOTE D'EXPERTISE SUR LA FIABILITÃ‰ DU DOSSIER :", 10, doc.lastAutoTable.finalY + 15);
        doc.setFont("helvetica", "normal");
        
        const note = "L'analyse automatisÃ©e par notre IA croisÃ©e avec les rÃ¨gles de calcul BAEL 91 R99 dÃ©montre une distorsion significative entre les quantitÃ©s proposÃ©es par l'artisan et les nÃ©cessitÃ©s structurelles rÃ©elles du projet. Une renÃ©gociation immÃ©diate est recommandÃ©e en utilisant le grand tableau d'audit en page 4 comme base de contradiction.";
        const splitNote = doc.splitTextToSize(note, 190);
        doc.text(splitNote, 10, doc.lastAutoTable.finalY + 22);

        // Page 2
        doc.addPage();
        pageTitles.push("MÃ‰TRÃ‰ CONTRADICTOIRE DE DESCENTE DE CHARGES");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['Niveau AnalysÃ©', 'Volume BÃ©ton (mÂ³)', 'Ciment Requis (sacs)', 'Aciers (kg)', 'Sable (mÂ³)', 'Gravier (mÂ³)', 'Surface Utile']],
            body: [
                ['Infrastructure (Semelles)', formatNb(V_bet_infra), formatNb(V_bet_infra*7), formatNb(V_bet_infra*85), formatNb(V_bet_infra*0.45), formatNb(V_bet_infra*0.8), '-'],
                ['Superstructure (Poteaux, Poutres)', formatNb(V_bet_rdc), formatNb(V_bet_rdc*7), formatNb(V_bet_rdc*85), formatNb(V_bet_rdc*0.45), formatNb(V_bet_rdc*0.8), formatNb(S)],
                ['Planchers & Dalles', formatNb(V_bet_etages), formatNb(V_bet_etages*7), formatNb(V_bet_etages*85), formatNb(V_bet_etages*0.45), formatNb(V_bet_etages*0.8), formatNb(S * N)],
                ['MaÃ§onnerie Remplissage', '0', formatNb(sacs_ciment_macon), '0', formatNb(sable_macon), '0', formatNb(surface_murs)]
            ]
        });

        // Page 3
        doc.addPage();
        pageTitles.push("NOMENCLATURE D'ARMATURES & PROTOCOLES DE CONTRÃ”LE");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['DiamÃ¨tre', 'Tonnage Requis', 'Section Nette (cmÂ²)', 'Recouvrement Lr', 'TolÃ©rance d\'Ã©cart de Tonnage']],
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
        doc.text("ALERTE SÃ‰CURITÃ‰ : RÃˆGLES DE CALAGE & FERRAILLAGE", 10, doc.lastAutoTable.finalY + 15);
        doc.setTextColor(...grayColor);
        doc.setFont("helvetica", "normal");
        const alertes = [
            "1. L'utilisation d'aciers lisses (hors cadres spÃ©cifiques) est formellement interdite.",
            "2. Le calage des armatures Ã  l'aide de morceaux d'agglos ou de bois est prohibÃ©. Seules les cales prÃ©fabriquÃ©es en bÃ©ton sont autorisÃ©es.",
            "3. La longueur de recouvrement Lr doit Ãªtre rigoureusement respectÃ©e pour assurer la transmission des efforts de traction."
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
            head: [['Poste d\'Analyse', 'QtÃ© Devis Artisan', 'RÃ©fÃ©rentiel Normatif BAEL', 'Ã‰cart Relatif', 'Diagnostic IA', 'SurcoÃ»t Net (FCFA)']],
            body: [
                ['Ciment CEM II 42.5R (sacs)', formatNb(sacs_ciment_tot * 1.25), formatNb(sacs_ciment_tot), '+ 25%', 'Surfacturation de matiÃ¨res', formatNb(surcout_ciment)],
                ['Aciers FeE500 (kg)', formatNb(aciers_tot * 1.30), formatNb(aciers_tot), '+ 30%', 'Surdimensionnement injustifiÃ©', formatNb(surcout_acier)],
                ['Sable de dune (mÂ³)', formatNb(sable_tot * 1.15), formatNb(sable_tot), '+ 15%', 'TolÃ©rance acceptable (foisonnement)', formatNb(surcout_sable)],
                ['Gravier Diack (mÂ³)', formatNb(gravier_tot * 1.20), formatNb(gravier_tot), '+ 20%', 'LÃ©gÃ¨re surfacturation', formatNb(surcout_gravier)],
                ['Hourdis 16+4 (unitÃ©s)', formatNb(hourdis_tot * 1.05), formatNb(hourdis_tot), '+ 5%', 'Conforme', '0'],
                ['Agglos 15cm (unitÃ©s)', formatNb(agglos_tot * 1.10), formatNb(agglos_tot), '+ 10%', 'Casse intÃ©grÃ©e raisonnable', '0'],
                ['Location Bois/Ã‰tais', '1 Forfait', '1 Forfait', '0%', 'Conforme au marchÃ©', '0'],
                ['Main d\'Å’uvre TÃ¢cheron (mÂ²)', formatNb(S_tot * 25000), formatNb(S_tot * 20000), '+ 25%', 'Tarif hors barÃ¨me syndical', formatNb(surcout_mo)]
            ]
        });

        doc.setFillColor(254, 226, 226); // red-100
        doc.rect(10, doc.lastAutoTable.finalY + 10, 190, 20, 'F');
        doc.setTextColor(...alertColor);
        doc.setFont("helvetica", "bold");
        doc.text("PROTOCOLE DE NÃ‰GOCIATION :", 12, doc.lastAutoTable.finalY + 16);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text("PrÃ©sentez ce tableau Ã  votre entrepreneur. Exigez l'alignement des tonnages d'acier et des quantitÃ©s de ciment sur les colonnes 'RÃ©fÃ©rentiel Normatif BAEL'. Toute quantitÃ© excÃ©dentaire devra faire l'objet d'une justification par note de calcul.", 12, doc.lastAutoTable.finalY + 21, { maxWidth: 186 });

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
        pageTitles.push("BILAN DES SURFACES DE SECOND Å’UVRE & TYPOLOGIE");
        
        doc.autoTable({
            startY: 45, ...tableStyles,
            head: [['DÃ©signation Architecturale', 'Formule de calcul (Ratio)', 'Surface DÃ©veloppÃ©e (mÂ²)']],
            body: [
                ['Surfaces utiles au sol (Carrelables)', 'Surface * 0.80', formatNb(S_tot * 0.8)],
                ['Surfaces murales intÃ©rieures (Ã€ enduire)', 'Surface * 2.2', formatNb(surface_murs)],
                ['Surfaces sous-plafond (Peinture plafonds)', 'Surface * 0.80', formatNb(S_tot * 0.8)],
                ['Surfaces piÃ¨ces humides (FaÃ¯ence murale)', 'Surface * 0.25 (Cuisines/SDB)', formatNb(S_tot * 0.25)],
                ['Surfaces ouvertures (DÃ©duction baies)', 'Surface * 0.15', formatNb(S_tot * 0.15)]
            ]
        });

        // Page 2
        doc.addPage();
        pageTitles.push("LOT REVÃŠTEMENTS DE SOLS & MURS");
        
        doc.autoTable({
            startY: 38, ...tableStyles,
            head: [['DÃ©signation', 'Surface Nette', 'Majoration Chutes (+10%)', 'Total Ã  Commander', 'Colle requise (sacs 25kg)']],
            body: [
                ['GrÃ¨s CÃ©rame Sol (SÃ©jours & Chambres)', formatNb(carrelage_sol/1.1) + ' mÂ²', '+10%', formatNb(carrelage_sol) + ' mÂ²', formatNb(carrelage_sol / 4)],
                ['GrÃ¨s AntidÃ©rapant (Terrasses & SDB)', formatNb(S_tot * 0.15) + ' mÂ²', '+10%', formatNb(S_tot * 0.165) + ' mÂ²', formatNb((S_tot * 0.165) / 4)],
                ['FaÃ¯ence Murale (Hauteur 2m mini)', formatNb(S_tot * 0.25) + ' mÂ²', '+10%', formatNb(S_tot * 0.275) + ' mÂ²', formatNb((S_tot * 0.275) / 4)],
                ['Plinthes assorties', formatNb(plinthes_ml) + ' ml', '+15%', formatNb(plinthes_ml * 1.15) + ' ml', 'Inc.']
            ]
        });

        doc.setFontSize(8);
        doc.setTextColor(...primaryColor);
        doc.text("Recommandations de mise en Å“uvre :", 10, doc.lastAutoTable.finalY + 10);
        doc.setTextColor(...grayColor);
        doc.text("- Utilisation exclusive de colle mortier C2TE pour les carreaux de grand format (> 60x60).", 10, doc.lastAutoTable.finalY + 16);
        doc.text("- Jointoiement au mortier hydrofuge fortement conseillÃ© dans les salles d'eau.", 10, doc.lastAutoTable.finalY + 21);

        // Page 3
        doc.addPage();
        pageTitles.push("LOT Ã‰TANCHÃ‰ITÃ‰ TERRASSE & LOT PEINTURE");
        
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Complexe d'Ã‰tanchÃ©itÃ© Toiture-Terrasse", 10, 38);
        
        doc.autoTable({
            startY: 43, ...tableStyles,
            head: [['Ã‰tape du Complexe multicouche', 'SpÃ©cifications Techniques', 'QuantitÃ© EstimÃ©e']],
            body: [
                ['1. Forme de pente', 'Mortier gras tirÃ© Ã  la rÃ¨gle, pente 1.5% min.', formatNb(etancheite_terrasse) + ' mÂ²'],
                ['2. ImprÃ©gnation', 'Primaire d\'imprÃ©gnation Ã  froid (EIF) vernis bitumineux', formatNb(etancheite_terrasse) + ' mÂ²'],
                ['3. Ã‰tanchÃ©itÃ© pleine masse', 'Membrane Ã©lastomÃ¨re SBS 4mm soudÃ©e au chalumeau', formatNb(etancheite_terrasse * 1.15) + ' mÂ²'],
                ['4. RelevÃ©s d\'acrotÃ¨res', 'RelevÃ©s hauteur minimum 20 cm, solin de protection', formatNb(acrotere_ml) + ' ml'],
                ['5. Protection mÃ©canique', 'Gravillons roulÃ©s ou carrelage sur plots (si accessible)', formatNb(etancheite_terrasse) + ' mÂ²']
            ]
        });

        doc.text("2. Lot Peinture & Finitions murales", 10, doc.lastAutoTable.finalY + 10);
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 15, ...tableStyles,
            head: [['Zone', 'PrÃ©paration des fonds', 'Type de peinture (Finition)']],
            body: [
                ['Murs IntÃ©rieurs secs', 'Enduit de lissage croisÃ©, Ã©grenage', 'Acrylique mate lavable (2 couches)'],
                ['Plafonds', 'Enduit de lissage, fixateur', 'Acrylique extra-mate (anti-reflets)'],
                ['PiÃ¨ces Humides (Cuisine/SDB)', 'Enduit rÃ©sistant Ã  l\'humiditÃ©', 'GlycÃ©ro ou acrylique satinÃ©e lessivable'],
                ['FaÃ§ades ExtÃ©rieures', 'Fixateur de fond hydrofuge', 'Pliolite ou rÃ©sine siloxane (micro-climat marin)']
            ]
        });

        // Page 4
        doc.addPage();
        pageTitles.push("LOT Ã‰LECTRICITÃ‰ & PLOMBERIE / SANITAIRES");
        
        doc.setFontSize(9);
        doc.setTextColor(...primaryColor);
        doc.setFont("helvetica", "bold");
        doc.text("1. Ã‰lectricitÃ© (Tableau Quantitatif Forfaitaire)", 10, 38);
        
        doc.autoTable({
            startY: 43, ...tableStyles,
            head: [['DÃ©signation de l\'Appareillage', 'Section CÃ¢ble', 'Norme applicable', 'Ratio par piÃ¨ce standard']],
            body: [
                ['Prises de courant 2P+T', 'U1000R2V 2.5 mmÂ²', 'NF C 15-100', '4 / SÃ©jour, 3 / Chambre'],
                ['Points lumineux en plafond (DCL)', 'U1000R2V 1.5 mmÂ²', 'NF C 15-100', '1 / PiÃ¨ce'],
                ['Interrupteurs (Va-et-vient / Simple)', 'U1000R2V 1.5 mmÂ²', 'NF C 15-100', '1 ou 2 / PiÃ¨ce'],
                ['Prise spÃ©cialisÃ©e (Climatiseur/Four)', 'U1000R2V 2.5 mmÂ² Ã  6 mmÂ²', 'Ligne dÃ©diÃ©e disjoncteur 20A/32A', '1 / Chambre, 1 / Cuisine']
            ]
        });

        doc.text("2. Plomberie & Appareils Sanitaires", 10, doc.lastAutoTable.finalY + 10);
        
        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 15, ...tableStyles,
            head: [['RÃ©seau / Ã‰quipement', 'SpÃ©cifications Techniques MatÃ©riaux', 'QuantitÃ© Moyenne']],
            body: [
                ['RÃ©seau Alimentation Eau Froide/Chaude', 'Tubes PER ou multicouche serti (PPR soudÃ©)', 'Ensemble du projet'],
                ['RÃ©seau Ã‰vacuation des Eaux UsÃ©es', 'Tubes PVC Ã˜ 100 (WC) et Ã˜ 40/50 (Vasques, Douches)', 'Colones montantes + chutes'],
                ['Siphons et aÃ©ration', 'Siphons de sol anti-odeurs, Ã©vent en toiture', '1 / Salle d\'eau'],
                ['Appareillage Sanitaire', 'Packs WC encastrÃ©s/posÃ©s, Vasques, Mitigeurs chromÃ©s', 'Selon distribution']
            ]
        });

        addSecurityKit();
    }

    // =========================================================================
    // ANNEXE PRATIQUE : FICHE DE SURVEILLANCE DU REPRÃ‰SENTANT LOCAL (PAGE 7)
    // =========================================================================
    doc.addPage();
    pageTitles.push("FICHE DE SURVEILLANCE DU REPRÃ‰SENTANT LOCAL (NON-TECHNICIEN)");
    
    doc.setFillColor(248, 250, 252); // bg-slate-50
    doc.setDrawColor(30, 58, 138);   // border-blue-900
    doc.setLineWidth(0.3);
    doc.rect(10, 38, 190, 22, 'FD');
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("GUIDE D'INSPECTION VISUELLE SIMPLIFIÃ‰E :", 14, 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(11, 19, 37);
    doc.text("Ce protocole est destinÃ© au parent, ami ou mandataire du MaÃ®tre d'Ouvrage prÃ©sent sur site. Aucun acompte ou achat de matÃ©riaux ne doit Ãªtre dÃ©bloquÃ© sans la vÃ©rification stricte de ces 4 contrÃ´les physiques incompressibles.", 14, 49, { maxWidth: 182 });

    doc.autoTable({
        startY: 65, ...tableStyles,
        head: [['Point de ContrÃ´le', 'RÃ¨gle de Chantier Incompressible', 'Action ImmÃ©diate du ReprÃ©sentant', 'Statut']],
        body: [
            ['Ciment & RÃ¨gle des Sacs Vides', 'Mention CEM II 42.5R obligatoire (Sococim, Dangote, Sahel). Stockage sur palettes bois surÃ©levÃ©es de 15 cm avec bÃ¢che Ã©tanche.', 'Compter et pointer les sacs vides avant d\'autoriser tout nouvel achat. Refuser tout sac durci prÃ©sentant des grumeaux.', '[   ] OK\n\n[   ] KO'],
            ['Aciers & DÃ©tection Faux Fer', 'Aciers Haute AdhÃ©rence (crantÃ©s) FeE500 exclusivement. Fer lisse formellement interdit en structure.', 'Mesurer le diamÃ¨tre des barres. VÃ©rifier l\'installation de vraies cales d\'enrobage en bÃ©ton (interdiction absolue de caler avec du gravier ou des morceaux de briques).', '[   ] OK\n\n[   ] KO'],
            ['Eau & GÃ¢chage du BÃ©ton', 'Eau potable SEN\'EAU obligatoire (zÃ©ro eau de puits saumÃ¢tre corrosive). BÃ©ton ferme et plastique.', 'Interdire formellement aux ouvriers de rajouter de l\'eau dans la bÃ©tonniÃ¨re pour fluidifier le bÃ©ton. Exiger l\'aiguille vibrante en marche.', '[   ] OK\n\n[   ] KO'],
            ['Cure et Arrosage', 'Le bÃ©ton frais doit rester humide pour atteindre sa rÃ©sistance sans fissurer.', 'Exiger l\'arrosage copieux des dalles et poteaux 2 fois par jour pendant 7 jours dÃ¨s le lendemain du coulage.', '[   ] OK\n\n[   ] KO']
        ],
        columnStyles: { 3: { cellWidth: 20 } }
    });

    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("Pack de Preuves NumÃ©riques WhatsApp (Protocole Diaspora) :", 10, doc.lastAutoTable.finalY + 10);
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 14, ...tableStyles,
        head: [['RÃ©f', 'MÃ©dias Contractuels Ã  Exiger de l\'Artisan (Avant Paiement)']],
        body: [
            ['Photo 1', 'Photo grand angle de l\'armature complÃ¨te avant fermeture des coffrages.'],
            ['Photo 2', 'Gros plan net sur les cales d\'enrobage bÃ©ton sous les nappes d\'acier.'],
            ['Photo 3', 'Mesure au mÃ¨tre ruban des longueurs de recouvrement des barres (50 Ã— Ã˜).'],
            ['VidÃ©o 1', 'VidÃ©o de 15 secondes attestant de l\'utilisation du vibreur mÃ©canique lors du coulage.']
        ],
        columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' } }
    });

    let yPosEmarge = doc.lastAutoTable.finalY + 15;
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, yPosEmarge, 190, 45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("ATTESTATION DE CONTRÃ”LE VISUEL", 15, yPosEmarge + 7);
    doc.setFont("helvetica", "normal");
    doc.text("Nom du reprÃ©sentant sur place : ...................................................................", 15, yPosEmarge + 15);
    doc.text("TÃ©lÃ©phone WhatsApp : ...................................................................................", 15, yPosEmarge + 23);
    doc.text("Date du pointage : ........ / ........ / 20........", 15, yPosEmarge + 31);
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text("Â« Je confirme avoir vÃ©rifiÃ© visuellement les 4 points d'arrÃªt ci-dessus et certifie la conformitÃ© des Ã©lÃ©ments contrÃ´lÃ©s. Â»", 15, yPosEmarge + 40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 19, 37);
    doc.text("Signature du Mandataire :", 130, yPosEmarge + 15);

    // --- APPLICATION DE L'EN-TÃŠTE ET PIED DE PAGE SUR TOUTES LES PAGES ---
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

window.generateProjectPDF = typeof generateProjectPDF !== 'undefined' ? generateProjectPDF : (typeof generatePDF !== 'undefined' ? generatePDF : null);

