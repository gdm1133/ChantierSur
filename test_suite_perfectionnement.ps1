# test_suite_perfectionnement.ps1
$ErrorActionPreference = "Stop"

Write-Host "==============================================================="
Write-Host "SUITE DE TESTS OFFICIELLE - PERFECTIONNEMENT PDF ET 5 RELIQUATS"
Write-Host "==============================================================="

$pdfPath = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\pdf-generator.js"
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

# R1 : [ESQUISSE] Taux de provision affiché propre sans bogue flottant
$hasFloatBug = $content.Contains('7.000000000000001%') -or ($content -match '7\.0{4,}')
$hasFormatPercent = $content.Contains('function formatPercent(') -and $content.Contains('formatPercent(tauxAleas)')
Assert-Check (-not $hasFloatBug -and $hasFormatPercent) "Reliquat 1 [ESQUISSE] : Taux de provision 7 % formate propre sans bogue flottant"

# R2 : [AUDIT] Tableau II : Concordance stricte
$hasAuditTopDown = $content.Contains('facteurTotal = 1.0 + tauxAleas + tauxMarge')
$hasAuditVerif = $content.Contains('verifSommeSoumis !== quotedAmount') -and $content.Contains('verifSommeRef !== refMoyen') -and $content.Contains('verifSommeEcarts !== (quotedAmount - refMoyen)')
Assert-Check ($hasAuditTopDown -and $hasAuditVerif) "Reliquat 2 [AUDIT] : Tableau II avec concordance stricte et test bloquant de somme"

# R3 : [ESQUISSE] Bandeaux débarrassés de la mention pénale
$hasMenacePenale = $content.Contains('RESPONSABILITE CIVILE ET PENALE') -or $content.Contains('CIVILE ET PENALE DU DETENTEUR') -or $content.Contains('RESPONSABILITÉ CIVILE ET PÉNALE')
$hasEsquisseDisclaimer = $content.Contains('Faisabilite technique et urbaine') -or $content.Contains('Faisabilité technique et urbaine')
Assert-Check (-not $hasMenacePenale -and $hasEsquisseDisclaimer) "Reliquat 3 [ESQUISSE] : Remplacement du bandeau penal par le disclaimer indicatif conforme"

# R4 : [EXPRESS] Ratio acier 90 kg/m³ clarifié
$hasClarifiedRatio = $content.Contains('Ratio effectif :') -and $content.Contains('zone marine inclus')
$hasAmbiguousRatio = $content.Contains('Ratio : 90 kg/m³ de béton (zone marine +5 kg)')
Assert-Check ($hasClarifiedRatio -and -not $hasAmbiguousRatio) "Reliquat 4 [EXPRESS] : Clarification explicite du ratio acier (90 kg/m3 dont 5 kg zone marine)"

# R5 : [FINITIONS] Délai de levée des réserves paramétrable
$hasParamDelai = $content.Contains('const delaiReserves = parseInt(data.delai_reserves, 10) || 15;')
$hasDelaiInPV1 = $content.Contains('Les désordres consignés doivent être levés sous ${delaiReserves} jours.') -or $content.Contains('sous ${delaiReserves} jours.')
$hasDelaiInPV2 = $content.Contains('Délai impératif accordé à l''entrepreneur pour la levée intégrale des réserves : ${delaiReserves} jours calendaires.') -or $content.Contains('pour la levée intégrale des réserves : ${delaiReserves} jours')
Assert-Check ($hasParamDelai -and $hasDelaiInPV1 -and $hasDelaiInPV2) "Reliquat 5 [FINITIONS] : Delai de levee des reserves parametrable aux 2 endroits du PV"

# M1 : Marges de 2 cm (20 mm) sur les 4 côtés et largeur utile 170 mm
$hasMargins20 = $content.Contains('MARGIN_LEFT = 20;') -and $content.Contains('MARGIN_RIGHT = 20;') -and $content.Contains('USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;')
Assert-Check $hasMargins20 "Mise en page 1.3 : Marges strictes de 2 cm (20 mm) et largeur utile 170 mm"

# M2 : Word-wrap et padding interne 4-6 pt sur tous les tableaux
$hasWordWrap = $content.Contains("overflow: 'linebreak'")
$hasCellPadding = $content.Contains("cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 }")
Assert-Check ($hasWordWrap -and $hasCellPadding) "Mise en page 1.1 : Word-wrap automatique et cellPadding interne 5-6 pt"

# M3 : En-têtes répétées sur chaque page
$hasShowHead = $content.Contains("showHead: 'everyPage'")
$hasAvoidBreak = $content.Contains("rowPageBreak: 'avoid'")
Assert-Check ($hasShowHead -and $hasAvoidBreak) "Mise en page 1.4 : En-tete repetee si multi-page et prevention des lignes orphelines"

# M4 : Hiérarchie visuelle unifiée (drawUnifiedHeader & drawSectionTitle)
$hasUnifiedHeader = $content.Contains('function drawUnifiedHeader(')
$hasSectionTitle = $content.Contains('function drawSectionTitle(')
Assert-Check ($hasUnifiedHeader -and $hasSectionTitle) "Mise en page 1.5 : Systeme d'en-tete et repere de section unifie pour les 4 modules"

# M5 : Footer avec pagination X sur Y et mentions adaptées
$hasFooterPagination = $content.Contains('Page ${p} sur ${totalPages}')
$hasFooterDTU = $content.Contains('Normes DTU Second')
$hasFooterBAEL = $content.Contains('BAEL 91 R99')
Assert-Check ($hasFooterPagination -and $hasFooterDTU -and $hasFooterBAEL) "Mise en page 1.5 : Pied de page uniforme avec pagination dynamique et referentiels exacts"

# M6 : Absence totale de termes interdits
$hasCertifie = $content -match 'Rapport\s+certifi' -or $content -match 'Dossier\s+certifi'
$has767 = $content.Contains('Article 767')
$has768 = $content.Contains('Article 768')
Assert-Check (-not $hasCertifie -and -not $has767 -and -not $has768) "Garde-fous : Zero occurrence de certifie nominatif, Article 767 ou Article 768"

Write-Host "---------------------------------------------------------------"
Write-Host "Resultat : $passed reussis, $failed echoues."
if ($failed -gt 0) {
    exit 1
} else {
    Write-Host "TOUS LES CONTROLES SONT VALIDES AVEC SUCCES !" -ForegroundColor Green
}
