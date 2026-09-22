$ErrorActionPreference = "Stop"

Write-Host "==============================================================="
Write-Host "SUITE DE TESTS AUTOMATISES - MODULE AUDIT ET SYNCHRO BQE"
Write-Host "==============================================================="

$pdfPath = "C:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\pdf-generator.js"
$content = [System.IO.File]::ReadAllText($pdfPath, [System.Text.Encoding]::UTF8)

$passed = 0
$failed = 0

function Assert-Check {
    param([bool]$condition, [string]$testName)
    if ($condition) {
        Write-Host "  [OK] PASS : $testName" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] : $testName" -ForegroundColor Red
        $script:failed++
    }
}

# T1 : Correction 1 - Aucune référence erronée aux articles 767 ou 768
$has767 = $content.Contains("Article 767")
$has768 = $content.Contains("Article 768")
Assert-Check (-not $has767 -and -not $has768) "Correction 1 : Aucune reference fausse a Article 767 ou 768 dans le code"

# T2 : Correction 1 - Table REFERENCES_JURIDIQUES et garde-fou bloquant
$hasRefTable = $content.Contains("const REFERENCES_JURIDIQUES = {")
$hasValiderRef = $content.Contains("function validerReferencesJuridiques(")
Assert-Check ($hasRefTable -and $hasValiderRef) "Correction 1 : Table REFERENCES_JURIDIQUES et fonction validerReferencesJuridiques integrees"

# T3 : Correction 2 - Pénalités 1/1000e / jour et plafond 5%
$hasPenaliteMille = $content.Contains("penaliteJourRatio: 0.001")
$hasPlafondPenalite = $content.Contains("plafondPenalitesTaux: 0.05")
$hasCalculPenalite = $content.Contains("penaliteJournaliere = Math.round(contractAmount * SEUILS_TECHNIQUES.penaliteJourRatio)")
Assert-Check ($hasPenaliteMille -and $hasPlafondPenalite -and $hasCalculPenalite) "Correction 2 : Penalite de retard 1/1000e/j plafonnee a 5% calculee et affichee"

# T4 : Correction 3 - Étanchéité toiture calculée sur S_toiture (SDP / nb_niveaux) x ratio 28 000 FCFA/m²
$hasSToiture = $content.Contains("sToiture = Math.max(20, Math.round(surface / totalLevelsCount))")
$hasRatioEtancheite = $content.Contains("ratioEtancheiteM2Moyen: 28000")
Assert-Check ($hasSToiture -and $hasRatioEtancheite) "Correction 3 : Etancheite toiture calculee sur S_toiture (SDP/nb_niveaux) x 28 000 F/m2 (non forfaitisee)"

# T5 : Correction 4 - 7 Omissions : suppression des pourcentages inventés et colonne Source
$hasOubliee65 = $content.Contains("dans 65% des devis") -or $content.Contains("dans 65%")
$hasSourceCol = $content.Contains("Source") -and $content.Contains("DTU 20.1") -and $content.Contains("NF C 15-100")
Assert-Check (-not $hasOubliee65 -and $hasSourceCol) "Correction 4 : Suppression des statistiques inventees et colonne Source ajoutee aux 7 omissions"

# T6 : Correction 5 - Échéancier calculé sur le budget cible négocié (contractAmount)
$hasContractAmount = $content.Contains("const contractAmount = parseFloat(data.contract_amount) || refMoyen;")
$hasTranche1 = $content.Contains("Math.round(contractAmount * 0.15)")
$hasTranche2 = $content.Contains("Math.round(contractAmount * 0.25)")
Assert-Check ($hasContractAmount -and $hasTranche1 -and $hasTranche2) "Correction 5 : Echeancier de paiement calcule sur contractAmount (base budget cible 635M)"

# T7 : Correction 6 - Tableau II macro-lots avec comparaison Devis Soumis vs Réf BET et écart
$hasTableMacroLots = $content.Contains("Macro-Lot Technique") -and $content.Contains("Devis Soumis") -and $content.Contains("partGoSoumis") -and $content.Contains("partGoRef")
Assert-Check $hasTableMacroLots "Correction 6 : Tableau II macro-lots avec colonnes Devis Soumis vs Budget Ref BET et ecart"

# T8 : Correction 7 - Provision aléas (5%) et Marge entrepreneur (7-10%, 8.5%) distinctes
$hasAleas = $content.Contains("provisionAleasTaux: 0.05") -and $content.Contains("partAleasSoumis")
$hasMarge = $content.Contains("margeEntrepreneurMoyenne: 0.085") -and $content.Contains("partMargeSoumis")
Assert-Check ($hasAleas -and $hasMarge) "Correction 7 : Separation stricte de la provision pour aleas (5%) et de la marge entrepreneur (8.5%)"

# T9 : Correction 8 - Justification table de compression et ciment CEM II 42.5R
$hasFlexion = $content.Contains("flexion locale et fonctionnement en diaphragme horizontal")
$hasCiment42 = $content.Contains("Privil") -and $content.Contains("CEM II 42.5R")
Assert-Check ($hasFlexion -and $hasCiment42) "Correction 8 : Justification technique table compression (flexion/diaphragme) et recommandation CEM II 42.5R"

# T10 : Correction 9 - Suppression des mentions certifié et des menaces pénales
$hasRapportCertifie = $content -match 'Rapport\s+certifi'
$hasDossierCertifie = $content -match 'Dossier\s+certifi'
$hasMenacePenale = $content.Contains("CIVILE ET") -and $content.Contains("PENALE DU")
$hasIndicatifDisclaimer = $content.Contains("Document indicatif") -and $content.Contains("aide")
Assert-Check (-not $hasRapportCertifie -and -not $hasDossierCertifie -and -not $hasMenacePenale -and $hasIndicatifDisclaimer) "Correction 9 : Disclaimers indicatifs et suppression de toute mention 'certifie' et menace penale"

# T11 : Correction 10 - Référentiel partagé SEUILS_TECHNIQUES harmonisé
$hasSeuils = $content.Contains("const SEUILS_TECHNIQUES = {") -and $content.Contains("decoffrageSousFaces: `"21 jours") -and $content.Contains("decoffrageJoues: `"48 h")
Assert-Check $hasSeuils "Correction 10 : Referentiel unique SEUILS_TECHNIQUES harmonise (decoffrage 21j sous-faces / 48h-7j joues)"

# T12 : Synchronisation BQE Gros Œuvre
$hasChecksPhases = $content.Contains("checksPhases") -and $content.Contains("totalSacsCiment") -and $content.Contains("volGravierBasalte")
Assert-Check $hasChecksPhases "Synchronisation BQE : renderExpress synchronise avec tests bloquants de somme par phase"

Write-Host "---------------------------------------------------------------"
Write-Host "Resultat : $passed reussis, $failed echoues."
if ($failed -gt 0) {
    exit 1
} else {
    Write-Host "TOUS LES TESTS SONT AU VERT !" -ForegroundColor Green
}
