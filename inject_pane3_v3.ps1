$ErrorActionPreference = 'Stop'
$htmlPath = "app_privee.html"
$content = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

$start = $content.IndexOf('<form id="pane-3"')
if ($start -eq -1) { throw "start not found" }

$endForm = $content.IndexOf('</form>', $start)
if ($endForm -eq -1) { throw "end form not found" }

$end = $content.IndexOf('</script>', $endForm)
if ($end -eq -1) { throw "end not found" }
$end = $end + 9 # length of </script>

$newPane3 = [System.IO.File]::ReadAllText("new_pane3_v3.html", [System.Text.Encoding]::UTF8)

$content = $content.Substring(0, $start) + $newPane3 + $content.Substring($end)
[System.IO.File]::WriteAllText($htmlPath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Replaced pane-3 with new_pane3_v3.html"
