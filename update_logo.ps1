$files = Get-ChildItem -Filter *.html

$new_logo = @"
<a href="index.html" class="flex items-center space-x-2.5 group focus:outline-none">
  <div class="w-9 h-9 bg-[#0B1325] rounded-lg flex items-center justify-center p-1.5 border border-slate-700/80 shadow-sm shrink-0">
    <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-[#F59E0B]" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  </div>
  <div class="flex flex-col">
    <span class="text-lg font-black tracking-tight text-[#0B1325] dark:text-white leading-none">
      Chantier<span class="text-[#F59E0B]">Sur.com</span>
    </span>
    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase mt-0.5">Bureau d'Études Numérique</span>
  </div>
</a>
"@

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # 1. Supprimer le bouton Lancer mon Dossier
    $content = $content -replace '(?s)<a [^>]*>Lancer mon Dossier</a>', ''
    $content = $content -replace '(?s)<button [^>]*>Lancer mon Dossier</button>', ''
    
    # 2. Remplacer l'ancien logo par le nouveau SVG
    # In index.html, it might already be the SVG but missing dark:text-white. 
    # Let's match the old img or the old SVG block.
    # Pattern to match anything between <!-- LOGO OFFICIEL CHANTIERSUR.COM INLINE SVG --> and </a>
    $content = $content -replace '(?s)<!-- LOGO OFFICIEL CHANTIERSUR\.COM INLINE SVG -->\s*<a href="index\.html".*?</a>', $new_logo
    
    # Also match the broken img logo if it's still in the secondary pages
    $content = $content -replace '(?s)<a href="index\.html" class="flex items-center space-x-2\.5">\s*<div[^>]*>.*?<img[^>]*>.*?</div>.*?</a>', $new_logo
    
    # If the secondary pages have a different logo block, match Chantier<span class="text-[#F59E0B]">Sur.com</span> 
    $content = $content -replace '(?s)<a href="index\.html" class="flex items-center space-x-2\.5">\s*<div[^>]*>.*?</svg>.*?</a>', $new_logo

    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($f.Name)"
}
