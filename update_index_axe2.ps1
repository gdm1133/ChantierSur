$file = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\index.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# 1. Add <section id="services-section"> around the tabs
$content = $content -replace '(?s)<!-- Tabs Selection -->', '<section id="services-section" class="scroll-mt-24">
        <!-- Tabs Selection -->'

$content = $content -replace '(?s)<!-- Modale de Pré-Paiement -->', '</section>

    <!-- Modale de Pré-Paiement -->'

# 2. Rename the tab button title and subtitle
$old_tab_title = '<span class="font-bold text-white block">3. Audit IA & Contre-Expertise</span>
                <span class="text-xs text-slate-400">Phase Devis</span>'
$new_tab_title = '<span class="font-bold text-white block">3. Contre-Expertise Devis</span>
                <span class="text-xs text-slate-400">Détection des surfacturations & ratios matériaux stricts</span>'
$content = $content -replace [regex]::Escape($old_tab_title), $new_tab_title

# 3. Rename the h2 title inside the tab content
$old_h2 = '<h2 class="text-lg font-bold text-white mb-6">Audit IA & Contre-Expertise</h2>'
$new_h2 = '<h2 class="text-lg font-bold text-white mb-6">Contre-Expertise Devis</h2>'
$content = $content -replace [regex]::Escape($old_h2), $new_h2

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
