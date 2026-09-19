$f = 'index.html'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# Replace step container classes
$c = $c.Replace('class="step-container"', 'class="form-step"')
$c = $c.Replace('class="step-container ', 'class="form-step ')
$c = $c.Replace(' step-container"', ' form-step"')
$c = $c.Replace(' step-container ', ' form-step ')

# Add onclick to next step buttons if not present
$c = $c -replace '<button(?![^>]*onclick="nextStep\(this\)")[^>]*class="[^"]*btn-step-next[^"]*"[^>]*>Suivant.*?<\/button>', '<button type="button" class="btn-step-next px-6 py-2.5 bg-[#F59E0B] text-slate-950 font-bold rounded-lg hover:bg-amber-400" onclick="nextStep(this)">Suivant</button>'

# Add onclick to prev step buttons if not present
$c = $c -replace '<button(?![^>]*onclick="prevStep\(this\)")[^>]*class="[^"]*btn-step-prev[^"]*"[^>]*>Précédent.*?<\/button>', '<button type="button" class="btn-step-prev px-6 py-2.5 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition" onclick="prevStep(this)">Précédent</button>'

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Buttons updated"
