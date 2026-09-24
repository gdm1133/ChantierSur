$files = @("test_runner_validation.html", "test-reel.js", "test.js", "_tmp_check.js", "app_privee.html", "new_js_v2.js", "renderAudit_original.js", "renderExpress.js", "renderAudit_new.js", "pdf-generator.js", "renderAudit.js", "scratch/v3_js.js", "scratch/v3.2_js.js", "scratch/v3.1_ui.html")

foreach ($f in $files) {
    if (Test-Path $f) {
        $content = [System.IO.File]::ReadAllText((Resolve-Path $f).Path, [System.Text.Encoding]::UTF8)
        $orig = $content
        
        $content = $content.Replace("gÃ©nÃ©rÃ©", "généré")
        $content = $content.Replace("Document généré automatiquement à titre indicatif • BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", "Document généré automatiquement à titre indicatif • ChantierSur.com — Bureau d'études numérique indépendant")
        $content = $content.Replace("Document généré automatiquement à titre indicatif • BAEL 91 R99", "Document généré automatiquement à titre indicatif • ChantierSur.com — Bureau d'études numérique indépendant")
        $content = $content.Replace("BAEL 91 R99 & Code des Obligations Civiles et Commerciales.", "ChantierSur.com — Bureau d'études numérique indépendant")
        
        $content = $content.Replace("COCC, art. 743", "Code des Obligations Civiles et Commerciales")
        $content = $content.Replace("indices « BT01/BT02 »", "indices de révision des prix")
        $content = $content.Replace("BT01/BT02", "indices standards")
        
        $content = $content.Replace("Veuillez importer ou ajouter au moins une ligne de devis pour lancer l'audit.", "Veuillez photographier ou saisir au moins une ligne de devis pour lancer l'audit.")
        
        $content = $content.Replace("Béton armé en fondation", "Ligne A")
        $content = $content.Replace("Maçonnerie agglos creux", "Ligne B")
        $content = $content.Replace("Peinture vinylique intérieure", "Ligne C")
        $content = $content.Replace("Forfait électricité RDC", "Ligne D")

        if ($content -cne $orig) {
            [System.IO.File]::WriteAllText((Resolve-Path $f).Path, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Modified $f"
        }
    }
}
