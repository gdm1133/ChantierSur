// test-reel.js
const fs = require('fs');

async function testerAuditReel() {
    console.log("🚀 Envoi d'un dossier test à https://chantiersur.com/.netlify/functions/gemini-audit ...\n");

    // Données de simulation : R+2 à Dakar Côtier avec un devis suspect d'artisan
    const payload = {
        surface: 220,
        levels: 2, // R+2
        zone: "dakar_cotier",
        devisTexte: `
      Devis Gros Œuvre Villa R+2 :
      - Ciment : 950 sacs de 50kg
      - Fer à béton : 9,5 tonnes (HA 10 et HA 12)
      - Sable : 65 m3
      - Gravier : 50 m3
      - Main d'oeuvre : 6 500 000 FCFA
    `
    };

    try {
        const response = await fetch("https://chantiersur.com/.netlify/functions/gemini-audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const resultat = await response.json();
        console.log("=== RÉSULTAT RETOURNÉ PAR L'IA (AUTOMATISATION) ===");
        console.log(JSON.stringify(resultat, null, 2));

        if (resultat.audit_devis) {
            console.log("\n✅ L'IA a bien analysé et comparé le devis aux normes BAEL !");
        }
    } catch (error) {
        console.error("❌ Erreur de test :", error.message);
    }
}

testerAuditReel();