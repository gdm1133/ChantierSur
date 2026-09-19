$files = "methodologie.html", "cadre-juridique.html", "a-propos.html", "confidentialite.html", "mentions-legales.html"
$headerStr = @"
  <!-- NAVIGATION HEADER -->
  <header class="sticky top-0 z-40 bg-[#0B1325]/95 backdrop-blur-md border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      
      <!-- LOGO SANS SOUS-TITRE -->
      <a href="index.html" class="flex items-center space-x-3 group">
        <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-2 border border-slate-700/80 shadow-md group-hover:border-[#F59E0B] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-[#F59E0B]" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <span class="text-2xl font-black tracking-tight text-white leading-none">
          Chantier<span class="text-[#F59E0B]">Sur.com</span>
        </span>
      </a>

      <!-- NAVIGATION DESKTOP SANS "LANCER MON DOSSIER" -->
      <nav class="hidden md:flex items-center space-x-8 text-sm font-semibold">
        <a href="index.html#services-section" class="text-slate-200 hover:text-[#F59E0B] transition-colors">Simulateur & Services</a>
        <a href="methodologie.html" class="text-slate-300 hover:text-[#F59E0B] transition-colors">Méthodologie BAEL 91</a>
        <a href="cadre-juridique.html" class="text-slate-300 hover:text-[#F59E0B] transition-colors">Cadre Juridique</a>
        <a href="a-propos.html" class="text-slate-300 hover:text-[#F59E0B] transition-colors">Qui Sommes-Nous</a>
      </nav>

      <!-- MENU BURGER MOBILE -->
      <button id="burger-btn" type="button" onclick="toggleMobileMenu()" class="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 focus:outline-none" aria-label="Menu Mobile">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>

    <!-- TIROIR DÉROULANT MOBILE -->
    <div id="mobile-drawer" class="hidden md:hidden bg-slate-950 border-b border-slate-800 px-6 py-5 space-y-4">
      <a href="index.html#services-section" onclick="toggleMobileMenu()" class="block text-slate-200 hover:text-[#F59E0B] font-semibold py-1">Simulateur & Services</a>
      <a href="methodologie.html" class="block text-slate-300 hover:text-[#F59E0B] font-semibold py-1">Méthodologie BAEL 91</a>
      <a href="cadre-juridique.html" class="block text-slate-300 hover:text-[#F59E0B] font-semibold py-1">Cadre Juridique</a>
      <a href="a-propos.html" class="block text-slate-300 hover:text-[#F59E0B] font-semibold py-1">Qui Sommes-Nous</a>
    </div>
  </header>
"@

foreach ($file in $files) {
    Write-Host "Traitement de $file..."
    
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    
    # 1. ENCODING TAGS
    $content = $content -replace '(?i)<meta charset=".*?">', ''
    $content = $content -replace '(?i)<meta http-equiv="Content-Type".*?>', ''
    $metaTags = "`n    <meta charset=`"UTF-8`">`n    <meta http-equiv=`"Content-Type`" content=`"text/html; charset=UTF-8`">"
    $content = $content -replace '(?i)<head>', "<head>$metaTags"
    
    # 2. HEADER REPLACEMENT
    $content = $content -replace "(?s)<header.*?</header>", $headerStr
    
    # 3. WRITE AS UTF-8 NO BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($file, $content, $utf8NoBom)
}
Write-Host "Terminé."
