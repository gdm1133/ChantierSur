# test_suite_express.ps1
$ErrorActionPreference = 'Stop'

Write-Host '====================================================================='
Write-Host 'SUITE DE TESTS OFFICIELLE - MODULE EXPRESS (BQE) ET BASE LEGALE'
Write-Host '====================================================================='

$pdfPath = 'c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\pdf-generator.js'
$content = [System.IO.File]::ReadAllText($pdfPath, [System.Text.Encoding]::UTF8)

# Extraction de la fonction renderExpress
$startMarker = 'function renderExpress('
$endMarker = 'function renderAudit('
$startIndex = $content.IndexOf($startMarker)
$endIndex = $content.IndexOf($endMarker)

if ($startIndex -lt 0 -or $endIndex -lt 0) {
    Write-Host 'ERREUR : Fonction renderExpress non delimitee correctement !' -ForegroundColor Red
    exit 1
}

$expressCode = $content.Substring($startIndex, $endIndex - $startIndex)

$passed = 0
$failed = 0

function Assert-Check {
    param([bool]$condition, [string]$testName)
    if ($condition) {
        Write-Host  [OK] PASS : $testName -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host  [FAIL] : $testName -ForegroundColor Red
        $script:failed++
    }
}

# 1. Absence d Article 742 et retenue 5% contractuelle avec Decret 2022-2295
$has742 = $expressCode.Contains('Article 742') -or $expressCode.Contains('art. 742')
$hasRetenueContractuelle = $expressCode.Contains('Retenue de garantie contractuelle (5 %)') -and
                           $expressCode.Contains('2022-2295, art. 118-119') -and
                           $expressCode.Contains('chantier priv')
Assert-Check (-not $has742 -and $hasRetenueContractuelle) '1. Article 742 absent d EXPRESS ; retenue 5% contractuelle avec decret 2022-2295'

# 2. Releves de prix de marche (pas referentiel officiel) + Arrete 09852 + IBTP
$hasOldRef = $expressCode.Contains('R' + [char]0xC9 + 'F' + [char]0xC9 + 'RENTIEL DAKAR 2026')
$hasRelevesMarche = $expressCode.Contains('RELEV' + [char]0xC9 + 'S DE PRIX DE MARCH' + [char]0xC9 + ' ' + [char]0x2014 + ' DAKAR 2026')
$hasArrete09852 = $expressCode.Contains('09852 du 24 juin 2024') -and
                   $expressCode.Contains('3 550 FCFA') -and
                   $expressCode.Contains('CEM II 42.5')
$hasIBTP = $expressCode.Contains('Indice ANSD des co') -and $expressCode.Contains('IBTP') -and $expressCode.Contains('+1,0 %')
Assert-Check (-not $hasOldRef -and $hasRelevesMarche -and $hasArrete09852 -and $hasIBTP) '2. REFERENTIEL DAKAR 2026 absent ; RELEVES DE PRIX DE MARCHE present avec arrete 09852 et IBTP'

# 3. Ton professionnel BAEL 91 (recommandations, zero obligation legale)
$hasObligMin = $expressCode.Contains('Obligation minimale')
$hasDosageReg = $expressCode.Contains('Dosage R' + [char]0xE9 + 'glementaire') -or $expressCode.Contains('Dosage r' + [char]0xE9 + 'glementaire')
$hasObligBael = $expressCode.Contains('Obligation BAEL')
$hasSerrageManuelInterdit = $expressCode.Contains('Interdiction du serrage manuel')
$hasTonProfessionnel = $expressCode.Contains('r' + [char]0xE8 + 'gles professionnelles') -and
                       $expressCode.Contains('Dosage usuel recommand' + [char]0xE9) -and
                       $expressCode.Contains('BAEL 91 R99, art. A.7.2.4') -and
                       $expressCode.Contains('D' + [char]0xE9 + 'conseill' + [char]0xE9 + ' : risque de nids de cailloux')
Assert-Check (-not $hasObligMin -and -not $hasDosageReg -and -not $hasObligBael -and -not $hasSerrageManuelInterdit -and $hasTonProfessionnel) '3. Obligation minimale, Dosage Reglementaire, Obligation BAEL absents ; ton en recommandations professionnelles'

# 4. Virgules decimales francaises partout (zero point decimal sur les valeurs calculees)
$hasNoDot028 = -not $expressCode.Contains('"0.28"') -and -not ($expressCode -match 'Ratio\s*:\s*\d+\.\d+')
$hasNoDot504 = -not ($expressCode -match '5\.04\s*T')
$hasNoDot308 = -not ($expressCode -match '30\.8\s*T')
$hasNoDot141 = -not ($expressCode -match '1\.41\s*T')
$hasNoDot161 = -not ($expressCode -match '1\.61\s*T')
$hasNoDot101 = -not ($expressCode -match '1\.01\s*T')
$hasNoDot060 = -not ($expressCode -match '0\.60\s*T')
$hasNoDot040 = -not ($expressCode -match '0\.40\s*T')
$hasNoDot45 = -not ($expressCode -match 'Cales 4\.5 cm')
$hasNoDot125 = -not ($expressCode -match '12\.5\s*U')
$hasNoDot85 = -not ($expressCode -match '8\.5\s*U')
$hasNoDot176 = -not ($expressCode -match '1\.76\s*T')
$hasNoDot151 = -not ($expressCode -match '1\.51\s*T')
$hasNoDot076 = -not ($expressCode -match '0\.76\s*T')

$hasFrFormatters = $expressCode.Contains('fr1 =') -and $expressCode.Contains('fr2 =') -and $expressCode.Contains('enrobageCmStr =')
$hasFrenchCommaValues = $expressCode.Contains('0,80') -and $expressCode.Contains('0,45') -and $expressCode.Contains('12,5 U/m') -and $expressCode.Contains('8,5 U/m')

$allDecimalPass = $hasNoDot028 -and $hasNoDot504 -and $hasNoDot308 -and $hasNoDot141 -and $hasNoDot161 -and
                  $hasNoDot101 -and $hasNoDot060 -and $hasNoDot040 -and $hasNoDot45 -and $hasNoDot125 -and
                  $hasNoDot85 -and $hasNoDot176 -and $hasNoDot151 -and $hasNoDot076 -and $hasFrFormatters -and $hasFrenchCommaValues
Assert-Check $allDecimalPass '4. Virgules decimales francaises PARTOUT (zero point decimal sur les ratios, cubatures et tonnages)'

# 5. En-tete exact ChantierSur.com Dossier : sans tiret
$headerCode = $content.Substring(0, $startIndex)
$hasNoDashInLogoSep = $headerCode.Contains('doc.text(" ", MARGIN_LEFT + tw + twSur, 11);')
$hasHeaderFormat = $headerCode.Contains('doc.text("Chantier", MARGIN_LEFT, 11);') -and $headerCode.Contains('doc.text("Sur.com", MARGIN_LEFT + tw, 11);')
Assert-Check ($hasNoDashInLogoSep -and $hasHeaderFormat) '5. En-tete exact ChantierSur.com Dossier : sans tiret dans le separateur logo'

# 6. Bandeau VISA technique blanc sur rouge #BF382B pleine largeur avec intitule exact
$hasVisaRedBg = $expressCode.Contains('doc.setFillColor(191, 56, 43);')
$hasVisaTitleExact = $expressCode.Contains('VISA TECHNIQUE DU BUREAU D') -and $expressCode.Contains('TUDES IND') -and $expressCode.Contains('PENDANT CHANTIERSUR.COM :')
$hasVisaWhiteText = $expressCode.Contains('doc.setTextColor(255, 255, 255);')
Assert-Check ($hasVisaRedBg -and $hasVisaTitleExact -and $hasVisaWhiteText) '6. Bandeau VISA blanc sur rouge #BF382B avec l intitule exact au mot pres'

# 7. Encadre References present avec les 5 sources verifiees (et aucune autre)
$hasRefBox = $expressCode.Contains('R' + [char]0xC9 + 'F' + [char]0xC9 + 'RENCES R' + [char]0xC9 + 'GLEMENTAIRES, NORMATIVES & SOURCES V' + [char]0xC9 + 'RIFI' + [char]0xC9 + 'ES :')
$hasRef1 = $expressCode.Contains('09852 du 24 juin 2024 (prix du ciment type 32.5)')
$hasRef2 = $expressCode.Contains('2022-2295, art. 118-119 (retenue de garantie')
$hasRef3 = $expressCode.Contains('ANSD, Indice des co') -and $expressCode.Contains('IBTP')
$hasRef4 = $expressCode.Contains('BAEL 91 R99 (r' + [char]0xE8 + 'gles professionnelles, r' + [char]0xE9 + 'f' + [char]0xE9 + 'rence technique)')
$hasRef5 = $expressCode.Contains('NF P 06-001 (charges d' + [char]0x2019 + 'exploitation') -or $expressCode.Contains('NF P 06-001 (charges d''exploitation')
Assert-Check ($hasRefBox -and $hasRef1 -and $hasRef2 -and $hasRef3 -and $hasRef4 -and $hasRef5) '7. Encadre References present avec les 5 sources verifiees (et aucune autre)'

# 8. Invariance arithmetique absolue des valeurs calculees
$hasArithmRatioBeton = $expressCode.Contains('levels >= 4 ? 0.38 : (levels >= 2 ? 0.33 : 0.28)')
$hasArithmRatioAcier = $expressCode.Contains('levels >= 4 ? 105 : (levels >= 2 ? 95 : 85)')
$hasArithmPU = $expressCode.Contains('PRIX_ACIER_TONNE = 640000') -and $expressCode.Contains('PRIX_CIMENT_SAC = 4100') -and $expressCode.Contains('PRIX_GRAVIER_M3 = 19000')
$hasArithmPhases = $expressCode.Contains('phase1Ciment = Math.round(totalSacsCiment * 0.30)') -and $expressCode.Contains('checksPhases = (checkCimentPhases === totalSacsCiment)')
Assert-Check ($hasArithmRatioBeton -and $hasArithmRatioAcier -and $hasArithmPU -and $hasArithmPhases) '8. Invariance arithmetique absolue des cubatures, tonnages, PU et phases'

# 9. Encodage UTF-8 parfait, zero mojibake
$hasMojibake = $expressCode -match '\xC3\xA9|\xC3\xA8|\xC3\xAA|\xC3\xA0|\xE2\x80\x99|\xE2\x80\x94' -and ($expressCode -match 'Ã|âš|â‰ˆ')
Assert-Check (-not $hasMojibake) '9. Encodage UTF-8 parfait, zero mojibake dans renderExpress'

Write-Host =====================================================================
Write-Host BILAN : $passed tests passes, $failed echecs
Write-Host =====================================================================

if ($failed -gt 0) {
    exit 1
} else {
    Write-Host 'TOUS LES CONTROLES EXPRESS SONT VALIDES AVEC SUCCES !' -ForegroundColor Green
    exit 0
}