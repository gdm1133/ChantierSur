$content = [System.IO.File]::ReadAllText('app_privee.html', [System.Text.Encoding]::UTF8)

$content = $content.Replace('.ocr-input-unit', '.ocr-input-u')
$content = $content.Replace('.ocr-input-qte', '.ocr-input-q')
$content = $content.Replace('oninput="window.calcV5Totals()"', 'oninput="window.calcV5TotalsState()"')

$oldCard = '<div class="bg-slate-900 border-2 border-[#F59E0B] p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5" id="pdf-modal-card">'
$newCard = '<div class="bg-slate-900 border-2 border-[#F59E0B] p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5 relative" id="pdf-modal-card">
              <button id="pdf-modal-close" class="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl font-bold cursor-pointer leading-none">&times;</button>'
$content = $content.Replace($oldCard, $newCard)

$oldAppend = "document.body.appendChild(modal);"
$newAppend = "document.body.appendChild(modal);

          const closeModal = () => { modal.remove(); document.removeEventListener('keydown', escListener); };
          document.getElementById('pdf-modal-close').addEventListener('click', closeModal);
          modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
          const escListener = (e) => { if (e.key === 'Escape') closeModal(); };
          document.addEventListener('keydown', escListener);"
$content = $content.Replace($oldAppend, $newAppend)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('app_privee.html', $content, $utf8NoBom)
Write-Host "Success!"
