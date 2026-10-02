$files = Get-ChildItem -Path "." -Filter "*.html" | Select-Object -ExpandProperty FullName
$blogFiles = Get-ChildItem -Path "blog" -Filter "*.html" | Select-Object -ExpandProperty FullName
$allFiles = $files + $blogFiles

foreach ($f in $allFiles) {
    $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    
    # Header logo
    $content = $content.Replace('src="assets/img/logo-light.png"', 'src="assets/logo/logo-a-clair.png"')
    $content = $content.Replace('src="../assets/img/logo-light.png"', 'src="../assets/logo/logo-a-clair.png"')
    
    # Footer logo
    $content = $content.Replace('src="assets/img/logo-light.png"', 'src="assets/logo/logo-a-clair.png"')
    
    # Favicon
    $content = $content.Replace('href="assets/img/logo-light.png"', 'href="assets/logo/logo-a-favicon.png"')
    $content = $content.Replace('href="../assets/img/logo-light.png"', 'href="../assets/logo/logo-a-favicon.png"')
    
    [System.IO.File]::WriteAllText($f, $content, [System.Text.Encoding]::UTF8)
}