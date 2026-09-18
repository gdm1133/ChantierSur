$old_str = @"
            <a href="index.html" class="flex items-center space-x-2.5">
                <div class="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center p-1.5 border border-slate-800 shadow-sm shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-amber-500" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-lg font-black tracking-tight text-[#0B1325] leading-none">Chantier<span class="text-[#F59E0B]">Sur.com</span></span>
                    <span class="text-[9px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">Bureau d'Études Numérique</span>
                </div>
            </a>
"@

$new_str = @"
            <a href="index.html" class="flex items-center space-x-2.5 group focus:outline-none">
                <div class="w-9 h-9 bg-[#0B1325] rounded-lg flex items-center justify-center p-1.5 border border-slate-700/80 shadow-sm shrink-0 transition-transform group-hover:scale-105">
                    <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-[#F59E0B]" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M9 12l2 2 4-4"/>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-lg font-black tracking-tight text-[#0B1325] leading-none">
                        Chantier<span class="text-[#F59E0B]">Sur.com</span>
                    </span>
                    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase mt-0.5">Bureau d'Études Numérique</span>
                </div>
            </a>
"@

$files = Get-ChildItem -Filter *.html

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # Do replacement handling line endings gracefully if necessary
    $content = $content.Replace($old_str.Replace("`r`n", "`n"), $new_str.Replace("`r`n", "`n"))
    $content = $content.Replace($old_str, $new_str)
    
    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Updated $($f.Name)"
}
