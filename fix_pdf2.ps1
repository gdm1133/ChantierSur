$content = [System.IO.File]::ReadAllText('pdf-generator.js', [System.Text.Encoding]::UTF8)
$content = $content.Replace('18% (régime normal)', 'TVA (selon régime)')
$content = $content.Replace('18 %', 'selon régime')
$content = $content.Replace('références mercuriales', 'prix moyens')
$content = $content.Replace('mercuriales professionnelles', 'prix moyens')
$content = $content.Replace('mercuriales moyennes', 'prix moyens')
$content = $content.Replace('Code des Obligations Civiles et Commerciales', 'Code Civil')
$content = $content.Replace('Conforme aux calculs ligne  ligne', 'Cohérent avec le devis')
$content = $content.Replace('Conforme aux calculs ligne à ligne', 'Cohérent avec le devis')
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('pdf-generator.js', $content, $utf8NoBom)
Write-Host "Success!"
