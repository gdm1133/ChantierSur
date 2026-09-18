$old_str = '<span class="text-amber-500">Sur</span><span class="text-xs font-bold text-slate-400">.com</span>'
$new_str = '<span class="text-[#F59E0B]">Sur.com</span>'

$files = Get-ChildItem -Filter *.html

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $content = $content.Replace($old_str, $new_str)
    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($f.Name)"
}
