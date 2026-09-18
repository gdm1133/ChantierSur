$f = 'index.html'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Replace classes
$c = $c.Replace('form-step', 'step-container')
$c = $c.Replace('btn-next-step', 'btn-step-next')
$c = $c.Replace('btn-prev-step', 'btn-step-prev')

# Ensure type="button" on all step buttons
$c = $c -replace '<button(?![^>]*type="button")[^>]*class="[^"]*btn-step-next[^"]*"', '<button type="button" class="btn-step-next px-6 py-2.5 bg-[#F59E0B] text-slate-950 font-bold rounded-lg hover:bg-amber-400"'
$c = $c -replace '<button(?![^>]*type="button")[^>]*class="[^"]*btn-step-prev[^"]*"', '<button type="button" class="btn-step-prev px-6 py-2.5 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition"'

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Updated buttons in index.html"
