$f = 'index.html'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Clean up next button
$c = $c -replace '<button[^>]*class="[^"]*btn-step-next[^"]*"[^>]*>Suivant.*?<\/button>', '<button type="button" class="btn-step-next px-6 py-2.5 bg-[#F59E0B] text-slate-950 font-bold rounded-lg hover:bg-amber-400">Suivant</button>'

# Clean up prev button
$c = $c -replace '<button[^>]*class="[^"]*btn-step-prev[^"]*"[^>]*>Précédent.*?<\/button>', '<button type="button" class="btn-step-prev px-6 py-2.5 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition">Précédent</button>'

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Fixed button classes"
