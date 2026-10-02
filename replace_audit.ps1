$content = [System.IO.File]::ReadAllText('pdf-generator.js', [System.Text.Encoding]::UTF8)
$newAudit = [System.IO.File]::ReadAllText('scratch\new_renderAudit.js', [System.Text.Encoding]::UTF8)

$startIndex = $content.IndexOf('function renderAudit(doc, data, refDoc, currentDate) {')
$endIndex = $content.IndexOf('function renderFinitions(doc, data, refDoc, currentDate) {')

if ($startIndex -ge 0 -and $endIndex -gt $startIndex) {
    $before = $content.Substring(0, $startIndex)
    $after = $content.Substring($endIndex)
    $finalContent = $before + $newAudit + "
  " + $after
    
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText('pdf-generator.js', $finalContent, $utf8NoBom)
    Write-Host "Replaced renderAudit successfully!"
} else {
    Write-Host "Could not find bounds!"
    Write-Host $startIndex
    Write-Host $endIndex
}
