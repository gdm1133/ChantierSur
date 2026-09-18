$files = Get-ChildItem -Filter *.html

$new_button = @"
            <!-- Bouton Hamburger Mobile -->
            <button id="mobile-menu-toggle" type="button" class="lg:hidden p-2 rounded-lg text-slate-800 hover:bg-slate-100 focus:outline-none" aria-label="Menu de navigation">
              <svg id="burger-icon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              <svg id="close-icon" class="w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
"@

$new_drawer = @"
    <!-- Tiroir Latéral Déroulant Mobile -->
    <div id="mobile-menu-drawer" class="hidden fixed inset-x-0 top-[65px] bg-[#0B1325]/98 backdrop-blur-lg border-b border-slate-800 p-6 z-50 text-white shadow-2xl space-y-5">
      <nav class="flex flex-col space-y-4 text-base font-semibold">
        <a href="index.html#services-section" class="mobile-nav-link text-slate-200 hover:text-[#F59E0B] transition-colors py-1">Simulateur & Services</a>
        <a href="methodologie.html" class="mobile-nav-link text-slate-200 hover:text-[#F59E0B] transition-colors py-1">Méthodologie BAEL 91</a>
        <a href="cadre-juridique.html" class="mobile-nav-link text-slate-200 hover:text-[#F59E0B] transition-colors py-1">Cadre Juridique COCC</a>
        <a href="a-propos.html" class="mobile-nav-link text-slate-200 hover:text-[#F59E0B] transition-colors py-1">Qui Sommes-Nous</a>
        <a href="confidentialite.html" class="mobile-nav-link text-slate-200 hover:text-[#F59E0B] transition-colors py-1">Protection Données CDP</a>
        <a href="mentions-legales.html" class="mobile-nav-link text-slate-200 hover:text-[#F59E0B] transition-colors py-1">Mentions Légales</a>
      </nav>
      <div class="pt-4 border-t border-slate-800 flex flex-col space-y-2 text-xs text-slate-400">
        <div>Assistance technique : <a href="mailto:admin@chantiersur.com" class="text-[#F59E0B] font-bold">admin@chantiersur.com</a></div>
        <div class="text-[11px] text-slate-500">Conforme BAEL 91 R99 • Droit COCC Sénégal</div>
      </div>
    </div>
"@

$old_script = @"
            const mobileBtn = document.getElementById('mobile-menu-btn');
            const mobileDrawer = document.getElementById('mobile-drawer');
            const closeBtn = document.getElementById('close-drawer-btn');

            if (mobileBtn && mobileDrawer && closeBtn) {
                mobileBtn.addEventListener('click', () => {
                    mobileDrawer.classList.remove('translate-x-full');
                });
                closeBtn.addEventListener('click', () => {
                    mobileDrawer.classList.add('translate-x-full');
                });
            }
"@

$new_script = @"
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const menuDrawer = document.getElementById('mobile-menu-drawer');
            const burgerIcon = document.getElementById('burger-icon');
            const closeIcon = document.getElementById('close-icon');

            if (menuToggle && menuDrawer) {
              menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menuDrawer.classList.toggle('hidden');
                burgerIcon.classList.toggle('hidden', !isHidden);
                closeIcon.classList.toggle('hidden', isHidden);
              });

              // Fermer le menu lors d'un clic sur un lien
              document.querySelectorAll('.mobile-nav-link').forEach(link => {
                link.addEventListener('click', () => {
                  menuDrawer.classList.add('hidden');
                  burgerIcon.classList.remove('hidden');
                  closeIcon.classList.add('hidden');
                });
              });

              // Fermer lors d'un clic à l'extérieur
              document.addEventListener('click', (e) => {
                if (!menuDrawer.contains(e.target) && !menuToggle.contains(e.target) && !menuDrawer.classList.contains('hidden')) {
                  menuDrawer.classList.add('hidden');
                  burgerIcon.classList.remove('hidden');
                  closeIcon.classList.add('hidden');
                }
              });
            }
"@

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)

    $content = $content -replace '(?s)<!-- Mobile Menu Button -->.*?</button>', $new_button
    $content = $content -replace '(?s)<!-- Mobile Drawer -->.*?(?=<main)', "$new_drawer`r`n`r`n    "
    $content = $content.Replace($old_script, $new_script)

    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($f.Name)"
}
