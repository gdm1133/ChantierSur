$ErrorActionPreference = 'Stop'
$htmlPath = "app_privee.html"
$content = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

$start = $content.IndexOf('    window.getDevisLines = function() {')
if ($start -eq -1) { throw "start not found" }
$end = $content.IndexOf('</script>', $start)
if ($end -eq -1) { throw "end not found" }

$content = $content.Substring(0, $start) + "`n" + $content.Substring($end)
[System.IO.File]::WriteAllText($htmlPath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Removed residual OCR logic"
