/**
 * ChantierSur.com - Logique Métier et UI
 */

const PRIX = {
    ciment: 3850, // Par sac 50kg (77 000 / tonne)
    acier: 540, // Par kg (540 000 / tonne)
    basalte: 12500, // Par m3 (200 000 / 16m3)
    sable: 5312.5, // Par m3 (85 000 / 16m3)
    agglo: 300, // Par unité 15x20x40
    hourdis: 400, // Par unité 16cm
    mo: 25000 // Par m2 bâti pour gros oeuvre
};

let currentAuditData = null;

const formatMoney = (amount) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' FCFA';
};

const formatNumber = (num) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(num);
};

// Logique de calcul
const calculateAudit = (surface, type, location) => {
    let niveaux = 1;
    if (type === 'R+1') niveaux = 2;
    if (type === 'R+2') niveaux = 3;
    
    const stot = surface * niveaux; // Surface totale développée
    
    // A. CIMENT
    let cimentFactor = 2.9;
    if (type === 'R+1') cimentFactor = 3.4;
    if (type === 'R+2') cimentFactor = 3.8;
    const cimentSacs = Math.ceil(stot * cimentFactor);
    const cimentCost = cimentSacs * PRIX.ciment;
    
    // B. ACIER
    let acierFactor = 42;
    if (type === 'R+1') acierFactor = 60;
    if (type === 'R+2') acierFactor = 78;
    const acierKg = Math.ceil(stot * acierFactor);
    
    // Ventilation Acier
    const fer12_14 = Math.ceil(acierKg * 0.40);
    const fer10 = Math.ceil(acierKg * 0.30);
    const fer8 = Math.ceil(acierKg * 0.20);
    const fer6 = Math.ceil(acierKg * 0.10);
    const acierCost = acierKg * PRIX.acier;
    
    // C. GRANULATS & MAÇONNERIE
    const basalteM3 = Math.ceil(stot * 0.25); // Adaptation: basé sur la surface plancher totale pour simplifier
    const basalteCost = basalteM3 * PRIX.basalte;
    
    const sableM3 = Math.ceil(stot * 0.35);
    const sableCost = sableM3 * PRIX.sable;
    
    const aggloNb = Math.ceil(stot * 14 * 1.05); // +5% casse
    const aggloCost = aggloNb * PRIX.agglo;
    
    let hourdisNb = 0;
    if (type !== 'RDC') {
        hourdisNb = Math.ceil((stot - surface) * 7.5); // Hors RDC simple (planchers hauts)
    }
    const hourdisCost = hourdisNb * PRIX.hourdis;
    
    // D. MAIN D'OEUVRE
    const moCost = stot * PRIX.mo;
    
    let subtotal = cimentCost + acierCost + basalteCost + sableCost + aggloCost + hourdisCost + moCost;
    
    // Ajustement localisation (Transport)
    let transportPercent = 0;
    if (location === 'thies') transportPercent = 0.05;
    if (location === 'autres') transportPercent = 0.12;
    
    const transportCost = Math.round(subtotal * transportPercent);
    const total = subtotal + transportCost;

    // Estimation durée (approximative)
    let duree = "2 à 3";
    if (type === 'R+1') duree = "4 à 5";
    if (type === 'R+2') duree = "6 à 8";

    // Volume beton théorique (basé sur 350kg ciment / m3 de béton approx)
    const betonM3 = (cimentSacs * 50) / 350;

    return {
        inputs: { surface, type, location, stot, niveaux },
        ciment: { sacs: cimentSacs, cost: cimentCost },
        acier: { totalKg: acierKg, f12: fer12_14, f10: fer10, f8: fer8, f6: fer6, cost: acierCost },
        granulats: { basalteM3, basalteCost, sableM3, sableCost },
        maconnerie: { aggloNb, aggloCost, hourdisNb, hourdisCost },
        mo: { cost: moCost },
        transport: { cost: transportCost },
        total: total,
        duree: duree,
        betonM3: betonM3
    };
};

// DOM Elements & Listeners
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('auditForm');
    const surfaceInput = document.getElementById('surfaceInput');
    const surfaceRange = document.getElementById('surfaceRange');
    
    // Sync Range & Input
    if(surfaceInput && surfaceRange) {
        surfaceRange.addEventListener('input', (e) => surfaceInput.value = e.target.value);
        surfaceInput.addEventListener('input', (e) => surfaceRange.value = e.target.value);
    }

    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-calculate');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="loader"></span> <span>Analyse en cours...</span>';
            btn.disabled = true;

            setTimeout(() => {
                runAudit();
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 800); // Micro animation
        });
    }

    const btnDemo = document.getElementById('btnDemo');
    if(btnDemo) {
        btnDemo.addEventListener('click', (e) => { e.preventDefault(); unlockPaywall(); });
    }

    const btnPayLocal = document.getElementById('btnPayLocal');
    if(btnPayLocal) {
        btnPayLocal.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = btnPayLocal.innerHTML;
            btnPayLocal.innerHTML = '<span class="loader"></span> <span>Patientez...</span>';
            btnPayLocal.disabled = true;
            try {
                const res = await fetch('/.netlify/functions/paytech', {
                    method: 'POST',
                    body: JSON.stringify({ redirectUrl: window.location.href.split('?')[0] })
                });
                const data = await res.json();
                if(data.success === 1 && data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    alert("Erreur lors de l'initialisation du paiement.");
                    btnPayLocal.innerHTML = originalText;
                    btnPayLocal.disabled = false;
                }
            } catch (err) {
                console.error(err);
                alert("Erreur de connexion au serveur.");
                btnPayLocal.innerHTML = originalText;
                btnPayLocal.disabled = false;
            }
        });
    }

    const btnPayCard = document.getElementById('btnPayCard');
    if(btnPayCard) btnPayCard.addEventListener('click', (e) => { e.preventDefault(); unlockPaywall(); });

    const btnPdf = document.getElementById('btnPdf');
    if(btnPdf) {
        btnPdf.addEventListener('click', generatePDF);
    }

    const b2bForm = document.getElementById('b2bForm');
    if(b2bForm) {
        b2bForm.addEventListener('submit', handleB2B);
    }

    // Vérifier si retour de paiement réussi
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('payment') === 'success') {
        alert("Paiement réussi ! Veuillez relancer l'audit pour voir les résultats complets.");
        // Pour une version avancée, on pourrait stocker l'audit dans localStorage
    }
});

const runAudit = () => {
    const surface = parseInt(document.getElementById('surfaceInput').value) || 150;
    const type = document.querySelector('input[name="type"]:checked').value;
    const location = document.getElementById('location').value;

    currentAuditData = calculateAudit(surface, type, location);

    // Update Teaser UI
    const resultSection = document.getElementById('results-container');
    if(resultSection) {
        resultSection.classList.remove('hidden');
        resultSection.style.display = 'block';
    }

    const minTotal = currentAuditData.total * 0.95;
    const maxTotal = currentAuditData.total * 1.05;

    document.getElementById('teaserCost').innerText = `Entre ${formatNumber(minTotal/1000000)} et ${formatNumber(maxTotal/1000000)} Millions FCFA`;
    document.getElementById('teaserBeton').innerText = `~${Math.round(currentAuditData.betonM3)} m³`;
    document.getElementById('teaserDuration').innerText = `${currentAuditData.duree} mois`;

    // Populate BQE Table
    populateBQE();
    
    // Scroll to results
    if(resultSection) resultSection.scrollIntoView({ behavior: 'smooth' });
};

const populateBQE = () => {
    if(!currentAuditData) return;
    const d = currentAuditData;
    const tbody = document.getElementById('bqeTable');
    if(!tbody) return;

    const rows = [
        { desc: "Ciment CPJ 42.5/35 (Sacs 50kg)", qty: `${formatNumber(d.ciment.sacs)} sacs`, pu: formatMoney(PRIX.ciment), total: d.ciment.cost },
        { desc: "Acier HA FeE500 (12mm & 14mm)", qty: `${formatNumber(d.acier.f12)} kg`, pu: formatMoney(PRIX.acier), total: d.acier.f12 * PRIX.acier },
        { desc: "Acier HA FeE500 (10mm)", qty: `${formatNumber(d.acier.f10)} kg`, pu: formatMoney(PRIX.acier), total: d.acier.f10 * PRIX.acier },
        { desc: "Acier HA FeE500 (8mm & 6mm)", qty: `${formatNumber(d.acier.f8 + d.acier.f6)} kg`, pu: formatMoney(PRIX.acier), total: (d.acier.f8 + d.acier.f6) * PRIX.acier },
        { desc: "Gravier Basalte (Diack)", qty: `${formatNumber(d.granulats.basalteM3)} m³`, pu: formatMoney(PRIX.basalte), total: d.granulats.basalteCost },
        { desc: "Sable de Dune (Propre)", qty: `${formatNumber(d.granulats.sableM3)} m³`, pu: formatMoney(PRIX.sable), total: d.granulats.sableCost },
        { desc: "Agglos creux 15x20x40", qty: `${formatNumber(d.maconnerie.aggloNb)} unités`, pu: formatMoney(PRIX.agglo), total: d.maconnerie.aggloCost },
    ];

    if(d.maconnerie.hourdisNb > 0) {
        rows.push({ desc: "Hourdis 16cm (Planchers)", qty: `${formatNumber(d.maconnerie.hourdisNb)} unités`, pu: formatMoney(PRIX.hourdis), total: d.maconnerie.hourdisCost });
    }

    rows.push({ desc: "Main d'Œuvre Tâcheron (Gros Œuvre)", qty: `${formatNumber(d.inputs.stot)} m²`, pu: formatMoney(PRIX.mo), total: d.mo.cost });

    if(d.transport.cost > 0) {
        rows.push({ desc: "Forfait Transport Région", qty: "-", pu: "-", total: d.transport.cost });
    }

    let html = '';
    rows.forEach(r => {
        html += `
            <tr class="hover:bg-gray-50">
                <td class="p-3 border-b">${r.desc}</td>
                <td class="p-3 border-b font-medium">${r.qty}</td>
                <td class="p-3 border-b text-gray-500">${r.pu}</td>
                <td class="p-3 border-b text-right font-semibold">${formatMoney(r.total)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    document.getElementById('totalBqe').innerText = formatMoney(d.total);
};

const unlockPaywall = () => {
    const content = document.getElementById('detailedContent');
    const overlay = document.getElementById('paywallOverlay');
    const b2b = document.getElementById('b2bModule');

    if(content) content.classList.remove('paywall-blur');
    if(overlay) overlay.style.display = 'none';
    if(b2b) b2b.classList.remove('hidden');
};

const handleB2B = (e) => {
    e.preventDefault();
    if(!currentAuditData) return;
    
    const name = document.getElementById('b2bName').value;
    const phone = document.getElementById('b2bPhone').value;
    
    const ref = `SN-DKR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    let message = `Bonjour, je suis ${name}.\n`;
    message += `Je souhaite obtenir une cotation négociée pour mon chantier (${currentAuditData.inputs.type}, ${currentAuditData.inputs.surface}m²).\n`;
    message += `Réf Audit ChantierSur : ${ref}\n\n`;
    message += `Besoins principaux :\n`;
    message += `- Ciment : ${currentAuditData.ciment.sacs} sacs\n`;
    message += `- Fer à béton : ${currentAuditData.acier.totalKg} kg\n\n`;
    message += `Merci de me faire un retour sur ce numéro : ${phone}`;
    
    const waUrl = `https://wa.me/221770000000?text=${encodeURIComponent(message)}`; // Dummy supplier number
    window.open(waUrl, '_blank');
};

const generatePDF = () => {
    if(!window.jspdf || !currentAuditData) {
        alert("Erreur lors de la génération du PDF.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const d = currentAuditData;
    const ref = `SN-DKR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // btp-dark
    doc.text("ChantierSur.com", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(217, 119, 6); // amber
    doc.text("Bordereau Quantitatif Estimatif - Audit Gros Œuvre", 14, 28);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Réf : ${ref}`, 150, 20);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 150, 26);
    
    // Config Summary
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 35, 182, 25, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Configuration du Chantier", 18, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Type d'ouvrage : ${d.inputs.type}`, 18, 49);
    doc.text(`Emprise au sol : ${d.inputs.surface} m² (Surface totale dev: ${d.inputs.stot} m²)`, 18, 55);
    doc.text(`Localisation : ${d.inputs.location.toUpperCase()}`, 110, 49);
    
    // Table
    const tableData = [
        ["Ciment CPJ 42.5/35", `${formatNumber(d.ciment.sacs)} sacs`, formatMoney(PRIX.ciment), formatMoney(d.ciment.cost)],
        ["Acier HA FeE500 (12 & 14mm)", `${formatNumber(d.acier.f12)} kg`, formatMoney(PRIX.acier), formatMoney(d.acier.f12 * PRIX.acier)],
        ["Acier HA FeE500 (10mm)", `${formatNumber(d.acier.f10)} kg`, formatMoney(PRIX.acier), formatMoney(d.acier.f10 * PRIX.acier)],
        ["Acier HA FeE500 (8 & 6mm)", `${formatNumber(d.acier.f8 + d.acier.f6)} kg`, formatMoney(PRIX.acier), formatMoney((d.acier.f8 + d.acier.f6) * PRIX.acier)],
        ["Gravier Basalte", `${formatNumber(d.granulats.basalteM3)} m³`, formatMoney(PRIX.basalte), formatMoney(d.granulats.basalteCost)],
        ["Sable de Dune", `${formatNumber(d.granulats.sableM3)} m³`, formatMoney(PRIX.sable), formatMoney(d.granulats.sableCost)],
        ["Agglos creux 15x20x40", `${formatNumber(d.maconnerie.aggloNb)} U`, formatMoney(PRIX.agglo), formatMoney(d.maconnerie.aggloCost)],
    ];
    
    if(d.maconnerie.hourdisNb > 0) {
        tableData.push(["Hourdis 16cm", `${formatNumber(d.maconnerie.hourdisNb)} U`, formatMoney(PRIX.hourdis), formatMoney(d.maconnerie.hourdisCost)]);
    }
    
    tableData.push(["Main d'Œuvre Tâcheron", `${formatNumber(d.inputs.stot)} m²`, formatMoney(PRIX.mo), formatMoney(d.mo.cost)]);
    if(d.transport.cost > 0) {
        tableData.push(["Forfait Transport", "-", "-", formatMoney(d.transport.cost)]);
    }
    
    doc.autoTable({
        startY: 65,
        head: [['Désignation', 'Quantité Exacte', 'P.U. Moyen', 'Montant (FCFA)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }, // btp-dark
        foot: [['', '', 'TOTAL ESTIMÉ', formatMoney(d.total)]],
        footStyles: { fillColor: [248, 250, 252], textColor: [217, 119, 6], fontStyle: 'bold' }
    });
    
    // Legal & B2B
    let finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Mentions légales : Ce BQE est une estimation basée sur les normes BAEL.", 14, finalY);
    doc.text("Une tolérance de +/- 5% est applicable selon les spécificités du terrain.", 14, finalY + 5);
    
    finalY += 20;
    doc.setFillColor(255, 248, 235); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.rect(14, finalY, 182, 40, 'FD');
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Achetez vos matériaux au prix de gros négocié", 20, finalY + 12);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Bénéficiez des tarifs négociés ChantierSur auprès de nos dépôts partenaires.", 20, finalY + 22);
    doc.text("Envoyez ce BQE par WhatsApp à nos experts : +221 77 000 00 00", 20, finalY + 28);
    
    doc.save(`ChantierSur_Audit_${ref}.pdf`);
};
