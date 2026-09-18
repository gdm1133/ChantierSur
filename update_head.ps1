$files = Get-ChildItem -Filter *.html

$new_meta = @"
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
"@

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)

    # First, let's remove any existing charset or viewport meta tags to avoid duplication
    $content = $content -replace '(?i)<meta\s+charset="UTF-8">\s*', ''
    $content = $content -replace '(?i)<meta\s+http-equiv="Content-Type"[^>]*>\s*', ''
    $content = $content -replace '(?i)<meta\s+name="viewport"[^>]*>\s*', ''
    $content = $content -replace '(?i)<meta\s+charset=''UTF-8''>\s*', ''

    # Now replace <head> with <head> and the new meta tags
    $content = $content -replace '<head>', $new_meta

    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($f.Name)"
}
