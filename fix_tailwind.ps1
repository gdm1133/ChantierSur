$blogFiles = Get-ChildItem -Path "blog" -Filter "*.html"
foreach ($bf in $blogFiles) {
    $content = [System.IO.File]::ReadAllText($bf.FullName, [System.Text.Encoding]::UTF8)
    if ($content -notmatch "cdn.tailwindcss.com") {
        $content = $content.Replace('</head>', '    <script src="https://cdn.tailwindcss.com"></script>
</head>')
        [System.IO.File]::WriteAllText($bf.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}