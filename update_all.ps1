$files = Get-ChildItem -Filter *.html

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)

    # 1. Desktop Nav
    $content = $content -replace '(?s)<nav class="hidden lg:flex items-center space-x-6">.*?</nav>', '<nav class="hidden lg:flex items-center space-x-6">
                <a href="index.html#services-section" class="text-sm font-medium text-slate-700 hover:text-[#F59E0B] transition-colors">Simulateur & Services</a>
                <a href="methodologie.html" class="text-sm font-medium text-slate-700 hover:text-[#F59E0B] transition-colors">Méthodologie BAEL 91</a>
                <a href="cadre-juridique.html" class="text-sm font-medium text-slate-700 hover:text-[#F59E0B] transition-colors">Cadre Juridique</a>
                <a href="a-propos.html" class="text-sm font-medium text-slate-700 hover:text-[#F59E0B] transition-colors">Qui Sommes-Nous</a>
            </nav>'

    # 2. Lancer mon Dossier
    $content = $content -replace '(?s)<div class="hidden lg:flex items-center">\s*<a[^>]*Lancer mon Dossier</a>\s*</div>', ''

    # 3. Mobile Nav
    $content = $content -replace '(?s)<nav class="flex flex-col space-y-4">.*?</nav>', '<nav class="flex flex-col space-y-4">
                <a href="index.html#services-section" class="text-lg font-bold hover:text-amber-500 transition">Simulateur & Services</a>
                <a href="methodologie.html" class="text-lg font-bold hover:text-amber-500 transition">Méthodologie BAEL 91</a>
                <a href="cadre-juridique.html" class="text-lg font-bold hover:text-amber-500 transition">Cadre Juridique</a>
                <a href="a-propos.html" class="text-lg font-bold hover:text-amber-500 transition">Qui Sommes-Nous</a>
                <a href="confidentialite.html" class="text-lg font-bold hover:text-amber-500 transition">Protection des Données (CDP)</a>
                <a href="mentions-legales.html" class="text-lg font-bold hover:text-amber-500 transition">Mentions Légales</a>
            </nav>'

    # 4. Footer "Les 6 Points d'Arrêt"
    $content = $content -replace '(?s)\s*<li><a href="/methodologie\.html" class="hover:text-amber-500 transition">Les 6 Points d''Arrêt</a></li>', ''

    # 5. Footer "Audit Devis IA" to "Contre-Expertise Devis"
    $content = $content -replace '<li><a href="/index\.html#simulateur" class="hover:text-amber-500 transition">Audit Devis IA</a></li>', '<li><a href="index.html#services-section" class="hover:text-amber-500 transition">Contre-Expertise Devis</a></li>'

    # Fix footer "Calculateur" / Simulateur links if any
    $content = $content -replace '<li><a href="/index\.html#simulateur" class="hover:text-amber-500 transition">Calculateur 100% IA</a></li>', '<li><a href="index.html#services-section" class="hover:text-amber-500 transition">Simulateur & Services</a></li>'
    
    # Actually just fix any remaining "#simulateur" links in the footer 
    $content = $content -replace 'href="/index\.html#simulateur"', 'href="index.html#services-section"'
    $content = $content -replace 'href="/methodologie\.html"', 'href="methodologie.html"'
    $content = $content -replace 'href="/a-propos\.html"', 'href="a-propos.html"'
    $content = $content -replace 'href="/cadre-juridique\.html"', 'href="cadre-juridique.html"'
    $content = $content -replace 'href="/mentions-legales\.html"', 'href="mentions-legales.html"'
    $content = $content -replace 'href="/confidentialite\.html"', 'href="confidentialite.html"'

    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
}
