$f = "c:\users\germa\.gemini\antigravity-ide\scratch\ChantierSur\index.html"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$c = $c.Replace('Mﾃかthodologie', 'Mﾃｩthodologie').Replace('Dﾃかtection', 'Dﾃｩtection').Replace('matﾃかriaux', 'matﾃｩriaux').Replace('Gﾃかrmain', 'Germain')

# User requested to also make sure Gros ﾅ置vre and Second ﾅ置vre are correct
$c = $c.Replace('Gros ﾅ置vre', 'Gros ﾅ置vre').Replace('Second ﾅ置vre', 'Second ﾅ置vre')

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Fixed index.html"