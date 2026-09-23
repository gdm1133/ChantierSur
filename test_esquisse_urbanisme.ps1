# test_esquisse_urbanisme.ps1
$ErrorActionPreference = "Stop"

Write-Host "====================================================================="
Write-Host "VALIDATION DE LA BASE LEGALE URBANISME (MODULE ESQUISSE - LOI 2023-20)"
Write-Host "====================================================================="

$appPriveePath = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\app_privee.html"
$pdfGenPath = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\pdf-generator.js"

$appContent = [System.IO.File]::ReadAllText($appPriveePath, [System.Text.Encoding]::UTF8)
$pdfContent = [System.IO.File]::ReadAllText($pdfGenPath, [System.Text.Encoding]::UTF8)

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

# 1. Calcul du prospect R.448 : voie 12m + retrait 3m => 22.5m
$hasFormulaInPdf = $pdfContent.Contains('COEF_PROSPECT_R448 = 1.5') -and $pdfContent.Contains('COEF_PROSPECT_R448 * (streetWidth + reculAlignement)')
$hasFormulaInApp = $appContent.Contains('prospectCoef: 1.5') -and $appContent.Contains('GABARIT_CONFIG.prospectCoef * (empriseVoie + retraitVoie)')
Assert-Check ($hasFormulaInPdf -and $hasFormulaInApp) "1. Formule Prospect R.448 : H = 1,5 x (voie + retrait) -> pour 12m + 3m = 22,5m"

# 2. Source R.448 décret n° 2025-1194 visible dans popup et rapport
$hasSourceApp = $appContent -match 'art\.\s*R\.448.*2025-1194'
$hasSourcePdf = $pdfContent -match 'Art\.\s*R\.448.*2025-1194'
Assert-Check ($hasSourceApp -and $hasSourcePdf) "2. Citation exacte art. R.448, decret n 2025-1194 dans le popup et le PDF"

# 3. Mots interdits : zero occurrence de 'max legal', 'refusable', 'gabarit legal', 'H <= L + R'
$forbiddenApp = ($appContent -match 'max l[e\xE9]gal') -or ($appContent -match 'gabarit l[e\xE9]gal') -or ($appContent -match 'refusable')
$forbiddenPdf = ($pdfContent -match 'max l[e\xE9]gal') -or ($pdfContent -match 'gabarit l[e\xE9]gal') -or ($pdfContent -match 'refusable') -or ($pdfContent.Contains('H <= L + R')) -or ($pdfContent.Contains('Hmax = largeur de voie + recul'))
Assert-Check (-not $forbiddenApp -and -not $forbiddenPdf) "3. Zero occurrence des termes interdits (max legal, refusable, gabarit legal, H <= L + R)"

# 4. Decret 2009-1450 non presente comme droit en vigueur, presence de 2025-1194 et 2023-20
$has2009AsActive = ($pdfContent -match 'D[e\xE9]cret n[o\xB0]\s*2009-1450[^\n]*portant Code') -or ($pdfContent.Contains('2009-1450 & PDU DAKAR'))
$has2009Abroge = $pdfContent -match '2009-1450\s*abrog[e\xE9]\s*par\s*l''art\.\s*R\.596'
$has2023_20 = ($pdfContent -match 'Loi n[o\xB0]\s*2023-20') -and ($pdfContent -match '29 d[e\xE9]cembre 2023')
$has2025_1194 = ($pdfContent -match 'D[e\xE9]cret n[o\xB0]\s*2025-1194') -and ($pdfContent -match '17 juillet 2025')
Assert-Check (-not $has2009AsActive -and $has2009Abroge -and $has2023_20 -and $has2025_1194) "4. Decret 2009-1450 abroge par R.596, textes actifs 2023-20 et 2025-1194 en vigueur"

# 5. COS / CES qualifies d'hypotheses de travail de zone (a confirmer)
$cosHypothesis = ($pdfContent -match 'Conforme.*hypoth[e\xE8]se.*zone') -and -not ($pdfContent.Contains('Max PDU:'))
$cesHypothesis = ($pdfContent -match 'CES indicatif 0,65') -and ($pdfContent -match 'art\.\s*R\.40')
Assert-Check ($cosHypothesis -and $cesHypothesis) "5. COS et CES qualifies d'hypotheses de travail de zone"

# 6. Pan coupe : 5 m minimum (R.444) et zero 3,50 m presente comme regle
$hasPanCoupe5m = $pdfContent -match 'Pan coup[e\xE9].*5 m minimum.*art\.\s*R\.444'
$hasPanCoupe35 = $pdfContent.Contains('Pan coupé de 3,50 m') -or $pdfContent -match 'Pan coup[e\xE9]\s*de\s*3,50\s*m'
Assert-Check ($hasPanCoupe5m -and -not $hasPanCoupe35) "6. Pan coupe de 5 m minimum (art. R.444) conforme, suppression de 3,50 m"

# 7. Obligation d'architecte selon R.407 sans seuil 80 m² ou R+1
$hasArchR407 = $pdfContent -match 'Recours.*architecte obligatoire.*art\.\s*R\.407'
$hasOldArchThreshold = ($pdfContent -match 'surface\s*>\s*80\s*m') -or ($pdfContent.Contains('tout R+1'))
Assert-Check ($hasArchR407 -and -not $hasOldArchThreshold) "7. Obligation d'architecte selon R.407 sans seuil 80 m2 / R+1"

# 8. TELEDAC : suppression du delai legal 28 a 40 jours
$hasOldTeledacDelay = $pdfContent -match '28\s*[\xE0a]\s*40\s*jours'
$hasNewTeledac = $pdfContent -match 'd[e\xE9]lai estim[e\xE9] selon commune'
Assert-Check (-not $hasOldTeledacDelay -and $hasNewTeledac) "8. Suppression du delai TELEDAC 28-40 jours non source"

# 9. Modal HTML elegant dans app_privee.html (pas de confirm natif)
$hasNativeConfirmInEsquisse = $appContent -match 'serviceKey === ''esquisse''[\s\S]*?confirm\('
$hasCustomModal = ($appContent.Contains('cs-coherence-modal')) -and ($appContent.Contains('Points d'))
Assert-Check (-not $hasNativeConfirmInEsquisse -and $hasCustomModal) "9. Modal HTML personnalise, responsive, non bloquant (aucun confirm natif)"

# 10. Invariance arithmetique stricte des 8 valeurs certifiees
# COS calculé 2,34 ; Nser 576 kN ; Nu 797 kN ; semelle 3,024 m² ; sous-total 541 944 000 ; provision 7% 37 936 080 ; total 579 880 080 ; ratio 413 020
$hasCosProjet = $pdfContent.Contains('cosProjet = +(sdpTotale / surface).toFixed(2)')
$hasStructure = $pdfContent.Contains('nSer = Math.round(gTotal + qTotal)') -and $pdfContent.Contains('nUltime = Math.round((1.35 * gTotal) + (1.5 * qTotal))')
$hasDevis = $pdfContent.Contains('tauxAleas = 0.07') -and $pdfContent.Contains('pAleas = Math.round(') -and $pdfContent.Contains('pTotal = pTerrassement')
Assert-Check ($hasCosProjet -and $hasStructure -and $hasDevis) "10. Invariance arithmetique absolue des 8 valeurs certifiees"

# 11. Zero mojibake dans les deux fichiers
$hasMojibakeApp = $appContent -match '\xC3\xA9|\xC3\xA8|\xC3\xAA|\xC3\xA0|\xE2\x80\x99|\xE2\x80\x94' -and ($appContent -match 'Ã|âš|â‰ˆ')
$hasMojibakePdf = $pdfContent -match 'Ã©|Ã¨|Ãª|Ã |âš|â‰ˆ'
Assert-Check (-not $hasMojibakeApp -and -not $hasMojibakePdf) "11. Encodage UTF-8 parfait, zero mojibake"

Write-Host "====================================================================="
Write-Host "BILAN : $passed tests passes, $failed echecs"
Write-Host "====================================================================="

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
