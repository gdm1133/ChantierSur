$f = "app_privee.html"
$content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

$headerStart = $content.IndexOf('<!-- TOPBAR')
$headerEnd = $content.IndexOf('</header>') + 9
$header = $content.Substring($headerStart, $headerEnd - $headerStart)

$footerStart = $content.IndexOf('<footer')
$footerEnd = $content.IndexOf('</footer>') + 9
$footer = $content.Substring($footerStart, $footerEnd - $footerStart)

$newHeader = $header.Replace('href="index.html', 'href="../index.html').Replace('href="app_privee.html', 'href="../app_privee.html').Replace('href="a-propos.html', 'href="../a-propos.html').Replace('href="mentions-legales.html', 'href="../mentions-legales.html').Replace('href="guide-diaspora.html', 'href="../guide-diaspora.html').Replace('href="points-darret.html', 'href="../points-darret.html').Replace('src="assets/', 'src="../assets/').Replace('href="assets/', 'href="../assets/').Replace('href="blog/index.html', 'href="index.html')
$newFooter = $footer.Replace('href="index.html', 'href="../index.html').Replace('href="app_privee.html', 'href="../app_privee.html').Replace('href="a-propos.html', 'href="../a-propos.html').Replace('href="mentions-legales.html', 'href="../mentions-legales.html').Replace('href="guide-diaspora.html', 'href="../guide-diaspora.html').Replace('href="points-darret.html', 'href="../points-darret.html').Replace('src="assets/', 'src="../assets/').Replace('href="assets/', 'href="../assets/')

$blogFiles = @("blog/epi-chantier.html", "blog/securite-chantier-senegal-accidents.html", "blog/verifier-devis-construction.html", "blog/index.html")

foreach ($bf in $blogFiles) {
    $bfContent = [System.IO.File]::ReadAllText($bf, [System.Text.Encoding]::UTF8)
    
    # 1. Inject Tailwind in <head> if not exists
    if ($bfContent -notmatch "cdn.tailwindcss.com") {
        $bfContent = $bfContent.Replace('</head>', '    <script src="https://cdn.tailwindcss.com"></script>
</head>')
    }
    
    # 2. Inject Header after <body>
    if ($bfContent -notmatch '<!-- TOPBAR') {
        $bfContent = $bfContent.Replace('<body>', "<body>

$newHeader")
    }
    
    # 3. Inject Footer before scripts at end
    if ($bfContent -notmatch '<footer') {
        $bfContent = $bfContent.Replace('<script src="https://cdn.jsdelivr.net/npm/bootstrap', "$newFooter

    <script src="https://cdn.jsdelivr.net/npm/bootstrap")
    }
    
    # 4. Fix colors and images
    $bfContent = $bfContent.Replace('--primary-red: #BF382B;', '--primary-red: #0EA5E9;')
    $bfContent = $bfContent.Replace('assets/blog/hero-devis.jpg', 'assets/img/hero_devis_chantier_1790921202418.jpg')
    $bfContent = $bfContent.Replace('assets/blog/body-devis-1.jpg', 'assets/img/body_devis_1_1790921265069.jpg')
    $bfContent = $bfContent.Replace('assets/blog/body-devis-2.jpg', 'assets/img/body_devis_2_1790921274580.jpg')
    $bfContent = $bfContent.Replace('assets/blog/hero-accidents.jpg', 'assets/img/hero_accidents_chantier_1790921176621.jpg')
    $bfContent = $bfContent.Replace('assets/blog/hero-epi.jpg', 'assets/img/hero_epi_chantier_1790921192324.jpg')
    $bfContent = $bfContent.Replace('assets/blog/body-accidents-1.jpg', 'assets/img/body_accidents_1_1790921227935.jpg')
    $bfContent = $bfContent.Replace('assets/blog/body-accidents-2.jpg', 'assets/img/body_accidents_2_1790921236420.jpg')
    $bfContent = $bfContent.Replace('assets/blog/body-epi-1.jpg', 'assets/img/body_epi_1_1790921245642.jpg')
    $bfContent = $bfContent.Replace('assets/blog/body-epi-2.jpg', 'assets/img/body_epi_2_1790921254831.jpg')
    $bfContent = $bfContent.Replace('assets/logo.png', 'assets/logo/logo-a-clair.png')
    
    # 5. Share Button Replace
    $shareRegex = '(?s)<div class="share-buttons">.*?</div>'
    $newShare = '<div class="border-t border-[#1B4F72] pt-8 mt-12 flex items-center justify-center gap-4">
                <button onclick="if(navigator.share) navigator.share({title: document.title, url: window.location.href})" class="px-6 py-3 bg-[#0EA5E9] text-white font-bold rounded-xl hover:-translate-y-1 hover:shadow-lg transition-all flex items-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                    <span>Partager l''article</span>
                </button>
            </div>'
    $bfContent = [regex]::Replace($bfContent, $shareRegex, $newShare)
    
    [System.IO.File]::WriteAllText($bf, $bfContent, [System.Text.Encoding]::UTF8)
}