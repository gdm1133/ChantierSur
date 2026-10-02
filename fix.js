const fs = require('fs');

let src = fs.readFileSync('netlify/functions/generer-audit-pdf/index.js', 'utf8');

// 1. Nouvelle adresse dans le pied de page
src = src.replace(
  "ChantierSur.com — Bureau d'études Numérique Indépendant — Dakar, République du Sénégal.",
  "ChantierSur.com — Bureau d'études Numérique Indépendant — 16 Route de Mont-Rolland, Thiès, Sénégal."
);

// 3. Section I - Restaurer l'identification complète
src = src.replace(
  "const objText = data.identification?.objetDevis || 'Non fourni';",
  "const objText = data.identification?.objetDevis || 'Non fourni';\n    const clientNom = data.identification?.client?.nom || data.identification?.nom || 'Non fourni';"
);
src = src.replace(
  "const entNom = data.identification?.entrepriseNom || 'Non fourni';",
  "const entNom = data.identification?.entrepriseNom || data.identification?.entreprise?.nom || 'Non fourni';"
);
src = src.replace(
  "const ninea = data.identification?.ninea || 'Non fourni';",
  "const ninea = data.identification?.ninea || data.identification?.entreprise?.ninea || 'Non fourni';"
);
src = src.replace(
  "const rccm = data.identification?.rccm || 'Non fourni';",
  "const rccm = data.identification?.rccm || data.identification?.entreprise?.rccm || 'Non fourni';"
);
src = src.replace(
  "currentPage.drawText(`Devis audité : ${objText} | Émis le : ${devisDate} | Par : ${entNom}`, { x: 40, y: currentY, size: 8, font: regularFont });",
  "currentPage.drawText(`Client : ${clientNom} | Devis audité : ${objText} | Émis le : ${devisDate} | Par : ${entNom}`, { x: 40, y: currentY, size: 8, font: regularFont });"
);

// 4. Référence unique du dossier
src = src.replace(
  "const refStr = data.dossier || 'CS-AUDIT-' + new Date().getTime().toString().slice(-6);",
  "const refStr = data.dossier || data.reference || 'CS-' + new Date().getTime();"
);

// 5. Typographie française des pourcentages
// This is already done for some, but I will make sure we format them nicely
src = src.replace("toFixed(1).replace('.', ',')", "toFixed(1).replace('.', ',') + ' %'");
src = src.replace("${percNonVerifStr} %", "${percNonVerifStr}");
src = src.replace("({pct} %)", "({pct})");
src = src.replace("({topPctTotal} %)", "({topPctTotal})");

// 6. Accords grammaticaux singulier / pluriel
src = src.replace(
  "const sArith = anomaliesArith.length > 1 ? 's' : '';",
  "const sArith = anomaliesArith.length > 1 ? 's' : '';\n    const erreurPrefix = anomaliesArith.length === 1 ? 'l\\'' : 'les ';"
);
src = src.replace(
  "topActions.push(`Faire corriger la/les ${anomaliesArith.length} erreur${sArith} de calcul arithmétique.`);",
  "topActions.push(`Faire corriger ${erreurPrefix}${anomaliesArith.length} erreur${sArith} de calcul arithmétique.`);"
);
src = src.replace(
  "constat: `${forfaits.length} ligne(s) facturée(s) au \"Forfait\"",
  "constat: `${forfaits.length} ligne${forfaits.length > 1 ? 's' : ''} facturée${forfaits.length > 1 ? 's' : ''} au \"Forfait\""
);

src = src.replace(
  "const sAbs = absentes > 1 ? 's' : '';",
  "const sAbs = absentes > 1 ? 's' : '';\n      const clausePrefix = absentes === 1 ? 'la' : 'les';"
);
src = src.replace(
  "topActions.push(`Ajouter les ${absentes} clause${sAbs} de sécurité manquante${sAbs} (pénalités, retenue, etc).`);",
  "topActions.push(`Ajouter ${clausePrefix} ${absentes} clause${sAbs} de sécurité manquante${sAbs} (pénalités, retenue, etc).`);"
);


// 7. Périmètre — deux exclusions distinctes
src = src.replace(
  "currentPage.drawText(`L'audit ne couvre pas : l'analyse des prix du marché, l'existence légale de l'entreprise, les vérifications par visite de site.`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });\n    currentY -= 25;",
  "currentPage.drawText(`L'audit ne couvre pas : l'analyse des prix du marché.`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });\n    currentY -= 12;\n    currentPage.drawText(`• l'existence légale réelle de l'entreprise`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });\n    currentY -= 12;\n    currentPage.drawText(`• l'état du chantier (aucune visite de site)`, { x: 40, y: currentY, size: 8, font: regularFont, color: COLOR_SLATE });\n    currentY -= 25;"
);

// 8. Nettoyage cosmétique des lots et unités
src = src.replace(
  "let lotName = (l.lot && l.lot.trim() !== '' && l.lot !== '-') ? l.lot.toUpperCase() : 'SANS LOT PRÉCISÉ';",
  "let lotName = (l.lot && l.lot.trim() !== '' && l.lot !== '-') ? l.lot.toUpperCase().replace(/^[- ]+/, '') : 'SANS LOT PRÉCISÉ';\n    if (lotName === 'LOT GÉNÉRAL' && l.designation && l.designation.toLowerCase().includes('plomberie')) { lotName = 'PLOMBERIE SANITAIRE'; }"
);
src = src.replace(
  "l._isForfait = false;",
  "l._isForfait = false;\n      if (l.designation) l.designation = l.designation.replace(/kgm/g, 'kg/m³');"
);


// 9. Anti-régression
src = src.replace(
  "causesBloquantes.push('Incohérence massive du Total HT.');",
  "causesBloquantes.push(`Écart de ${fmtCfa(ecartGlobalHT)} non corrigé.`);"
);
src = src.replace(
  "if (totalEcartArith !== 0) parts.push(`Écart majeur de ${fmtCfa(Math.abs(totalEcartArith))} non corrigé`);",
  "if (ecartGlobalHT !== 0) parts.push(`Écart de ${fmtCfa(Math.abs(ecartGlobalHT))} non corrigé`);"
);
src = src.replace(
  "const sCl2 = missingClausesCount > 1 ? 's' : '';",
  "const sCl2 = missingClausesCount > 1 ? 's' : '';\n        const absentStr2 = missingClausesCount > 1 ? 'absentes' : 'absente';"
);
src = src.replace(
  "parts.push(`${missingClausesCount} clause${sCl2} bloquante${sCl2} absente${sCl2}`);",
  "parts.push(`${missingClausesCount} clause${sCl2} bloquante${sCl2} ${absentStr2}`);"
);


// Write out
fs.writeFileSync('netlify/functions/generer-audit-pdf/index.js.tmp', src);
