$text = [System.IO.File]::ReadAllText("C:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\pdf-generator-old.js", [System.Text.Encoding]::UTF8);
$replacements = @{
    "Ã©" = "é"; "Ã¨" = "è"; "Ã " = "à"; "Ãª" = "ê"; "â€™" = "'";
    "Ã§" = "ç"; "Ã‰" = "É"; "â€“" = "-"; "Ã´" = "ô"; "Ã»" = "û";
    "â‚¬" = "€"; "Ã¢" = "â"; "Ã®" = "î"; "Ã¯" = "ï"; "Ãoe" = "Œ";
    "Â°" = "°"; "â€œ" = '"'; "â€" = '"'; "Â²" = "²"
}
foreach ($key in $replacements.Keys) {
    $text = $text.Replace($key, $replacements[$key])
}
# Extra pass for A tilde
$text = $text.Replace("Ã", "à")
[System.IO.File]::WriteAllText("C:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\pdf-generator.js", $text, [System.Text.Encoding]::UTF8);
