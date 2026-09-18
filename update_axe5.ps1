$file = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\index.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Replace phone inputs
$old_input = '<input type="tel" name="client_phone" required placeholder="77 123 45 67" class="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-r-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500">'
$new_input = '<input type="tel" name="client_phone" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" placeholder="771234567" class="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-r-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" required>'

$content = $content.Replace($old_input, $new_input)

# Add JS script block for phone numbers
$js_block = @"
        // Phone number input restriction
        document.querySelectorAll('input[name="client_phone"]').forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        });

    </script>
"@

$content = $content -replace '(?s)\s*</script>\s*<!-- Mobile Sticky Bottom Bar -->', "`n$js_block`n    <!-- Mobile Sticky Bottom Bar -->"

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated phone inputs and added JS in index.html"
