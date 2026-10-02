$path = 'pdf-generator.js'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$content = $content.Replace('BAEL', 'Eurocode 2')
$content = $content.Replace('COCC', 'Code Civil')
$content = $content.Replace('mercuriales', 'prix moyens')
$content = $content.Replace('TVA 18 %', 'TVA (selon rgime)')
$content = $content.Replace('Conforme aux calculs ligne  ligne', 'Cohrent avec le devis')
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
Write-Host "Success!"
