$files = Get-ChildItem -Path '.' -Include '*.js', '*.html', '*.txt', '*.ps1' -Recurse -File
foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $modified = $false
        
        # 1. Fix Mojibake
        if ($content -match "gÃ©nÃ©rÃ©") {
            $content = $content -replace "gÃ©nÃ©rÃ©", "généré"
            $modified = $true
        }
        
        # 2. Fix BAEL and Footer
        $oldFooter = "Document généré automatiquement à titre indicatif • BAEL 91 R99 & Code des Obligations Civiles et Commerciales."
        $newFooter = "Document généré automatiquement à titre indicatif • ChantierSur.com — Bureau d'études numérique indépendant"
        if ($content.Contains($oldFooter)) {
            $content = $content.Replace($oldFooter, $newFooter)
            $modified = $true
        }
        
        $oldFooter2 = "Document généré automatiquement à titre indicatif • BAEL 91 R99"
        if ($content.Contains($oldFooter2)) {
            $content = $content.Replace($oldFooter2, $newFooter)
            $modified = $true
        }
        
        # 3. Fix 0-line validation message
        $oldMsg = "Veuillez importer ou ajouter au moins une ligne de devis pour lancer l'audit."
        $newMsg = "Veuillez photographier ou saisir au moins une ligne de devis pour lancer l'audit."
        if ($content.Contains($oldMsg)) {
            $content = $content.Replace($oldMsg, $newMsg)
            $modified = $true
        }

        # 4. Remove demo data
        $demo1 = "Béton armé en fondation"
        $demo2 = "Maçonnerie agglos creux"
        $demo3 = "Peinture vinylique intérieure"
        $demo4 = "Forfait électricité RDC"
        
        if ($content.Contains($demo1)) { $content = $content.Replace($demo1, "Ligne 1"); $modified = $true }
        if ($content.Contains($demo2)) { $content = $content.Replace($demo2, "Ligne 2"); $modified = $true }
        if ($content.Contains($demo3)) { $content = $content.Replace($demo3, "Ligne 3"); $modified = $true }
        if ($content.Contains($demo4)) { $content = $content.Replace($demo4, "Ligne 4"); $modified = $true }

        if ($modified) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Modified $($file.Name)"
        }
    } catch {}
}
