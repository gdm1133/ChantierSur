$content = [System.IO.File]::ReadAllText('pdf-generator.js', [System.Text.Encoding]::UTF8)

$content = $content -replace 'BUREAU D''TUDES NUMRIQUE INDPENDANT    AUDIT TECHNIQUE BTP  SNGAL', "BUREAU D'ÉTUDES NUMÉRIQUE INDÉPENDANT • AUDIT TECHNIQUE BTP SÉNÉGAL"
$content = $content -replace 'Matre d''Ouvrage :', "Maître d'Ouvrage :"
$content = $content -replace 'Tl :', "Tél :"
$content = $content -replace 'Dossier analys', "Dossier analysé"
$content = $content -replace 'Devis analys', "Devis analysé"
$content = $content -replace 'existence lgale', "existence légale"
$content = $content -replace 'Vrification arithmtique', "Vérification arithmétique"
$content = $content -replace 'Cohrence', "Cohérence"
$content = $content -replace 'rfrences', "références"
$content = $content -replace 'Synthse financire & leviers de ngociation', "Synthèse financière & leviers de négociation"
$content = $content -replace 'tat & Points de vigilance', "état & Points de vigilance"
$content = $content -replace 'Dsignation', "Désignation"
$content = $content -replace 'Dtail', "Détail"
$content = $content -replace 'Calcul par ChantierSur', "Calculé par ChantierSur"
$content = $content -replace 'rgime normal', "régime"
$content = $content -replace 'Non applique', "Non appliquée"
$content = $content -replace 'calcule', "calculée"
$content = $content -replace 'Vrifier si l''entreprise bnficie d''une exonration lgale', "Vérifier si l'entreprise bénéficie d'une exonération légale"
$content = $content -replace 'recalcul', "recalculé"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('pdf-generator.js', $content, $utf8NoBom)
Write-Host "Replaced broken chars!"
