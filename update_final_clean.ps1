$files = @("methodologie.html", "cadre-juridique.html", "a-propos.html", "confidentialite.html", "mentions-legales.html")
$headerPath = "header_template.txt"
$headerStr = [System.IO.File]::ReadAllText($headerPath, [System.Text.Encoding]::UTF8)

foreach ($file in $files) {
    Write-Host "Traitement de $file..."
    
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    
    # Meta tags
    $content = $content -replace '(?i)<meta charset=".*?">', ''
    $content = $content -replace '(?i)<meta http-equiv="Content-Type".*?>', ''
    $metaTags = "`n    <meta charset=`"UTF-8`">`n    <meta http-equiv=`"Content-Type`" content=`"text/html; charset=UTF-8`">"
    $content = $content -replace '(?i)<head>', "<head>$metaTags"
    
    # Remove old mobile drawer that might be lingering
    $content = $content -replace '(?s)<header.*?</header>\s*<!--.*?-->\s*<div id="mobile-menu-drawer".*?</div>', "<header></header>"
    
    # Replace header block
    $content = $content -replace '(?s)<header.*?</header>', $headerStr
    
    # Remove Lancer mon Dossier button
    $content = $content -replace '(?i)<a[^>]*?>[^<]*?Lancer mon Dossier[^<]*?</a>', ''
    
    # Remove Bureau d'Études Numérique subtitle in footer or elsewhere
    $content = $content -replace '(?i)Bureau d''Études Numérique', ''
    $content = $content -replace '(?i)BUREAU D''ÉTUDES NUMÉRIQUE', ''
    
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
}
Write-Host "Terminé."
