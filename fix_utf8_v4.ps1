$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path '.' -Include '*.js', '*.html', '*.txt' -Recurse -File

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content
        
        $content = $content.Replace("gÃ©nÃ©rÃ©", "généré")
        
        $oldFooter1 = "Document généré automatiquement à titre indicatif • BAEL 91 R99 & Code des Obligations Civiles et Commerciales."
        $oldFooter2 = "Document généré automatiquement à titre indicatif • BAEL 91 R99"
        $newFooter = "Document généré automatiquement à titre indicatif • ChantierSur.com — Bureau d'études numérique indépendant"
        
        $content = $content.Replace($oldFooter1, $newFooter)
        $content = $content.Replace($oldFooter2, $newFooter)
        
        $content = $content.Replace("BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", "ChantierSur.com — Bureau d'études numérique indépendant")
        $content = $content.Replace("COCC, art. 743", "Code des Obligations Civiles et Commerciales")
        $content = $content.Replace("indices « BT01/BT02 »", "indices de révision des prix")
        $content = $content.Replace("BT01/BT02", "indices standards")
        
        $oldMsg = "Veuillez importer ou ajouter au moins une ligne de devis pour lancer l'audit."
        $newMsg = "Veuillez photographier ou saisir au moins une ligne de devis pour lancer l'audit."
        $content = $content.Replace($oldMsg, $newMsg)
        
        $content = $content.Replace("Béton armé en fondation", "Ligne 1")
        $content = $content.Replace("Maçonnerie agglos creux", "Ligne 2")
        $content = $content.Replace("Peinture vinylique intérieure", "Ligne 3")
        $content = $content.Replace("Forfait électricité RDC", "Ligne 4")
        
        # We can't do regex replacement for mockLines easily in simple string replace, but we can do it via powershell regex if needed.
        # But this should be enough to remove the strings.
        
        if ($content -cne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Modified $($file.FullName)"
        }
    } catch {
        Write-Host "Error on $($file.FullName): $($_.Exception.Message)"
    }
}
