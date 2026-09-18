$files = Get-ChildItem -Filter *.html
$files += Get-Item "pdf-generator.js"

$replacements = @{
    "MÃ©thodologie" = "Méthodologie"
    "DÃ©tection" = "Détection"
    "matÃ©riaux" = "matériaux"
    "LÃ©gales" = "Légales"
    "DonnÃ©es" = "Données"
    "Ã©" = "é"
    "Ã‰" = "É"
    "Ã¨" = "è"
    "Ãˆ" = "È"
    "Ã " = "à"
    "Ã " = "À"
    "Ã¢" = "â"
    "Ãª" = "ê"
    "Ã®" = "î"
    "Ã´" = "ô"
    "Ã»" = "û"
    "Ã§" = "ç"
    "Ã‡" = "Ç"
    "â€™" = "’"
    "â€¢" = "•"
    "â€“" = "–"
    "â€”" = "—"
    "MaÃ®tre dâ€™Ouvrage" = "Maître d'Ouvrage"
    "GÃ©nÃ©ration" = "Génération"
    "tÃ©lÃ©charge" = "télécharge"
    "SÃ©nÃ©gal" = "Sénégal"
    "dÃ©monstration" = "démonstration"
    "ValidÃ©" = "Validé"
    "â ³" = "⏳"
    "PRÃ‰CÃ‰DENT" = "PRÉCÉDENT"
    "EMPÃŠCHE" = "EMPÊCHE"
    "chargÃ©" = "chargé"
}

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    foreach ($key in $replacements.Keys) {
        $content = $content.Replace($key, $replacements[$key])
    }
    # One more pass for lone 'Ã' which are usually 'à'
    $content = $content.Replace("Ã ", "à ")
    
    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
}

Write-Host "UTF-8 fixes applied"
