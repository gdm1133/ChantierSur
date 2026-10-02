$content = [System.IO.File]::ReadAllText('pdf-generator.js', [System.Text.Encoding]::UTF8)
$content = $content.Replace('BAEL 91 R99', 'Eurocode 2')
$content = $content.Replace('BAEL 91', 'Eurocode 2')
$content = $content.Replace('BAEL', 'Eurocode 2')
$content = $content.Replace('COCC', 'Code Civil')
$content = $content.Replace('mercuriales', 'prix moyens')
$content = $content.Replace('TVA 18 %', 'TVA (selon régime)')
$content = $content.Replace('Conforme aux calculs ligne à ligne', 'Cohérent avec le devis')
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('pdf-generator.js', $content, $utf8NoBom)
Write-Host "Success!"
