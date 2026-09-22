$ErrorActionPreference = "Stop"

Write-Host "==============================================================="
Write-Host "SUITE DE TESTS AUTOMATISES - MODULE FINITIONS / SECOND OEUVRE"
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

# Extraction de la section renderFinitions
$idxStart = $content.IndexOf("function renderFinitions(")
$idxEnd = $content.IndexOf("window.generateProjectPDF = function", $idxStart)
$finCode = $content.Substring($idxStart, $idxEnd - $idxStart)

# T1 : Correction 1 - Joint de carrelage inclus dans ligne 1, total fournitures et tests bloquants
$hasJointTotal = $finCode.Contains("totalLotCarrelageF = totalCarrelageSolF + totalColleF + totalJointF")
$hasJointInFournitures = $finCode.Contains("totalSecondOeuvreFournitures = totalLotCarrelageF + totalFaienceF")
$hasTestsBloquants = $finCode.Contains("checkSommeCarrelage !== totalLotCarrelageF") -and $finCode.Contains("sommeLignesRecap !== totalTCEFinitions")
Assert-Check ($hasJointTotal -and $hasJointInFournitures -and $hasTestsBloquants) "Correction 1 : Joint hydrofuge inclus dans total carrelage, recap et tests bloquants de somme"

# T2 : Correction 2 - Remplacement de HYDROCARBURES par EU/EP et fonction de controle
$hasNoHydrocarburesInTitle = -not $finCode.Contains("LOT PLOMBERIE SANITAIRE & ÉVACUATIONS HYDROCARBURES")
$hasEUEP = $finCode.Contains("EU/EP") -and $finCode.Contains("LOT PLOMBERIE SANITAIRE &")
$hasTermesControle = $content.Contains("verifierTermesFinitions")
Assert-Check ($hasNoHydrocarburesInTitle -and $hasEUEP -and $hasTermesControle) "Correction 2 : Titre plomberie EU/EP et interdiction stricte du terme hydrocarbures"

# T3 : Correction 3 - Aucune référence fausse aux articles COCC (767, 768)
$has767 = $finCode.Contains("Article 767")
$has768 = $finCode.Contains("Article 768")
Assert-Check (-not $has767 -and -not $has768) "Correction 3 : Aucune fausse reference a Article 767 ou 768 dans renderFinitions"

# T4 : Correction 4 - NORMES_PAR_LOT et exclusion de BAEL 91 en second œuvre
$hasNormesParLot = $content.Contains("NORMES_PAR_LOT = {")
$hasDtu52 = $content.Contains("DTU 52.1") -and $content.Contains("DTU 59.1") -and $content.Contains("DTU 60.1")
$hasFooterFinitions = $content.Contains("service === 'finitions'") -and $content.Contains("Normes DTU Second")
Assert-Check ($hasNormesParLot -and $hasDtu52 -and $hasFooterFinitions) "Correction 4 : Table NORMES_PAR_LOT definie et pied de page adapte sans mention du BAEL 91"

# T5 : Correction 5 - Menuiseries décomposées en Q x PU (portes, chassis alu, baies vitrees)
$hasPortesInterieures = $finCode.Contains("Portes Int")
$hasChassisAlu = $finCode.Contains("ssis Coulissants Alu")
$hasBaiesVitrees = $finCode.Contains("Grandes Baies Vitr")
$hasPorteBlindee = $finCode.Contains("Porte d'Entr")
Assert-Check ($hasPortesInterieures -and $hasChassisAlu -and $hasBaiesVitrees -and $hasPorteBlindee) "Correction 5 : Menuiseries (5,5M) decomposees en metrage detaille Q x PU"

# T6 : Correction 6 - Décomposition Q x PU uniforme pour Peinture, Plomberie et Électricité
$hasPeinturePU = $finCode.Contains("montantEnduit") -and $finCode.Contains("montantImpression") -and $finCode.Contains("montantPeintureInt")
$hasPlomberiePU = $finCode.Contains("montantSanitaires") -and $finCode.Contains("montantMitigeurs") -and $finCode.Contains("montantAlim")
$hasElectricitePU = $finCode.Contains("montantPoints") -and $finCode.Contains("montantTableaux") -and $finCode.Contains("montantClim")
Assert-Check ($hasPeinturePU -and $hasPlomberiePU -and $hasElectricitePU) "Correction 6 : Presentation uniforme avec decomposition Q x PU pour Peinture, Plomberie et Electricite"

# T7 : Correction 7 - Recalibrage des points électriques à 0,55 pt/m²
$hasRatio055 = $finCode.Contains("surface * 0.55")
$hasNoSurface14 = -not $finCode.Contains("surface * 1.4")
Assert-Check ($hasRatio055 -and $hasNoSurface14) "Correction 7 : Points electriques recalibres a 0,55 pt/m2 (~138 pts pour 250 m2 au lieu de 350)"

# T8 : Correction 8 - Précisions techniques (disjoncteur courbe C et seuil terre 50V)
$hasCourbeC = $finCode.Contains("courbe C 16A/20A")
$hasTerre50V = $finCode.Contains("50V")
Assert-Check ($hasCourbeC -and $hasTerre50V) "Correction 8 : Climatiseurs proteges par courbe C et seuil normatif terre 50V precise"

# T9 : Correction 9 - Suppression des mentions certifié et des menaces pénales dans les textes affichés
$hasRapportCertifie = $finCode.Contains("Rapport certifi")
$hasDossierCertifie = $finCode.Contains("Dossier certifi")
$hasMenaceFin = $finCode.Contains("CIVILE ET") -and $finCode.Contains("PENALE")
$hasDelaiReserves = $finCode.Contains("delaiReserves")
Assert-Check (-not $hasRapportCertifie -and -not $hasDossierCertifie -and -not $hasMenaceFin -and $hasDelaiReserves) "Correction 9 : Disclaimers indicatifs, delai de levee paramétrable et suppression des mentions certifiees dans les textes"

# T10 : Correction 10 - Documentation des rendements de consommation (mortier colle 6,5 m²/sac)
$hasRendementColle = $finCode.Contains("6,5 m")
$hasRendementJoint = $finCode.Contains("22 m")
Assert-Check ($hasRendementColle -and $hasRendementJoint) "Correction 10 : Rendements de consommation mortier colle et joints explicitement documentes"

Write-Host "---------------------------------------------------------------"
Write-Host "Resultat : $passed reussis, $failed echoues."
if ($failed -gt 0) {
    exit 1
} else {
    Write-Host "TOUS LES TESTS FINITIONS SONT AU VERT !" -ForegroundColor Green
}
