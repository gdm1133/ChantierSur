$desktop_old = @"
                <a href="/index.html#simulateur" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Calculateur</a>
                <a href="/index.html#services" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Nos Services</a>
                <a href="/methodologie.html" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Méthodologie</a>
                <a href="/cadre-juridique.html" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Cadre Juridique</a>
                <a href="/a-propos.html" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Qui Sommes-Nous</a>
"@

$desktop_new = @"
                <a href="index.html#services-section" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Simulateur & Services</a>
                <a href="methodologie.html" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Méthodologie</a>
                <a href="cadre-juridique.html" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Cadre Juridique</a>
                <a href="a-propos.html" class="text-sm font-semibold text-[#0B1325] hover:text-[#F59E0B] transition">Qui Sommes-Nous</a>
"@

$mobile_old = @"
                <a href="/index.html#simulateur" class="text-lg font-bold hover:text-amber-500 transition">Calculateur (Services)</a>
                <a href="/methodologie.html" class="text-lg font-bold hover:text-amber-500 transition">Méthodologie</a>
                <a href="/cadre-juridique.html" class="text-lg font-bold hover:text-amber-500 transition">Cadre Juridique</a>
                <a href="/a-propos.html" class="text-lg font-bold hover:text-amber-500 transition">Qui Sommes-Nous</a>
"@

$mobile_new = @"
                <a href="index.html#services-section" class="text-lg font-bold hover:text-amber-500 transition">Simulateur & Services</a>
                <a href="methodologie.html" class="text-lg font-bold hover:text-amber-500 transition">Méthodologie</a>
                <a href="cadre-juridique.html" class="text-lg font-bold hover:text-amber-500 transition">Cadre Juridique</a>
                <a href="a-propos.html" class="text-lg font-bold hover:text-amber-500 transition">Qui Sommes-Nous</a>
"@

$files = Get-ChildItem -Filter *.html

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    $content = $content.Replace($desktop_old, $desktop_new)
    $content = $content.Replace($mobile_old, $mobile_new)
    
    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($f.Name)"
}
