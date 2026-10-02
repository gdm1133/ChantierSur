$content = [System.IO.File]::ReadAllText('pdf-generator.js', [System.Text.Encoding]::UTF8)

$content = $content -replace '\bl\.des\b', 'l.designation'
$content = $content -replace '\bl\.total\b', 'l.montant'
$content = $content -replace '\bl\.q\b', 'l.quantite'
$content = $content -replace '\bl\.u\b', 'l.unite'

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('pdf-generator.js', $content, $utf8NoBom)
Write-Host "Replaced keys!"
