$content = [System.IO.File]::ReadAllText('app_privee.html', [System.Text.Encoding]::UTF8)

$content = $content -replace 'Aucune ligne validÃ©e â€“ retournez Ã  l''Ã©cran de validation', "Erreur : Aucune ligne validée – retournez à l'écran de validation"
$content = $content -replace 'âœ“ TÃ©lÃ©chargement \r?\nlancÃ© avec succÃ¨s !', "✓ Téléchargement lancé avec succès !"
$content = $content -replace 'âœ“ TÃ©lÃ©chargement lancÃ© avec succÃ¨s !', "✓ Téléchargement lancé avec succès !"
$content = $content -replace 'Retourner Ã  l''Ã©cran de validation', "Retourner à l'écran de validation"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('app_privee.html', $content, $utf8NoBom)
Write-Host "Fixed mojibake in app_privee.html"
