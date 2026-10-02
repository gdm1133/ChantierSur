$files = Get-ChildItem -Path '.' -Recurse -Include *.html, *.js, *.txt
foreach ($file in $files) {
    if ($file.FullName -match 'node_modules|\.git') { continue }
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content

    # Remove buttons/tabs
    $content = $content -replace '(?s)<button[^>]*onclick="switchServicePane\(2\)".*?</button>', ''
    $content = $content -replace '(?s)<button[^>]*onclick="switchServicePane\(4\)".*?</button>', ''
    
    # Remove forms
    $content = $content -replace '(?s)<form id="pane-2".*?</form>', ''
    $content = $content -replace '(?s)<form id="pane-4".*?</form>', ''

    # Remove links
    $content = $content -replace '(?im)<li><a href="[^"]*#services-section"[^>]*>BQE Express</a></li>', ''
    $content = $content -replace '(?im)<li><a href="[^"]*#services-section"[^>]*>Second Œuvre \(Finitions\)</a></li>', ''
    $content = $content -replace '(?im)<li><a href="[^"]*#services-section"[^>]*>Second œuvre \(Finitions\)</a></li>', ''
    $content = $content -replace '(?im)<li><a href="[^"]*#services-section"[^>]*>Second.*?Finitions.*?</a></li>', ''
    $content = $content -replace '(?im)<li><a href="[^"]*#services-section"[^>]*>BQE.*?</a></li>', ''
    
    # Remove pricing rules
    $content = $content -replace '(?im)2: \{ base: 199000, perLevelAbove1: 30000 \},? \/\/ BQE Gros Œuvre\r?\n?', ''
    $content = $content -replace '(?im)2: \{ base: 199000, perLevelAbove1: 30000 \},? \/\/ BQE Gros Ouvre\r?\n?', ''
    $content = $content -replace '(?im)4: \{ base: 99000, perLevelAbove1: 15000 \},?   \/\/ Finitions\r?\n?', ''
    $content = $content -replace '(?im)4: \{ base: 99000, perLevelAbove1: 15000 \},? \/\/ Finitions\r?\n?', ''
    
    $content = $content -replace '(?im)<option value="Second ouvre & finitions">.*?</option>', ''
    $content = $content -replace '(?im)<option value="Second Œuvre & finitions">.*?</option>', ''

    # Zero occurrences global replacements
    $content = $content -replace '(?i)BQE Express', ''
    $content = $content -replace '(?i)Second Œuvre', ''
    $content = $content -replace '(?i)Second œuvre', ''
    $content = $content -replace '(?i)Second Ouvre', ''
    $content = $content -replace '(?i)Finitions', ''

    if ($content -cne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    }
}
Remove-Item renderFinitions.js -ErrorAction SilentlyContinue
Remove-Item renderExpress.js -ErrorAction SilentlyContinue
