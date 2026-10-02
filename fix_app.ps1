$lines = [System.IO.File]::ReadAllLines('app_privee.html', [System.Text.Encoding]::UTF8)

$newAddV5 = [System.IO.File]::ReadAllLines('add_v5_lot_new.txt', [System.Text.Encoding]::UTF8)
$newConfirmOcr = [System.IO.File]::ReadAllLines('confirm_ocr_new.txt', [System.Text.Encoding]::UTF8)
$newModal = [System.IO.File]::ReadAllLines('modal_new.txt', [System.Text.Encoding]::UTF8)

$part1 = [string[]]$lines[0..808]
$part2 = [string[]]$lines[856..1009]
$part3 = [string[]]$lines[1034..1653]
$part4 = [string[]]$lines[1654..1982]
$part5 = [string[]]$lines[2018..($lines.Length - 1)]

$injection = [string[]]@(
    '  window.getDevisLines = function() { return window.devisLinesState || []; };',
    ''
)

$logInjection = [string[]]@(
    '        finalData.service = s;',
    '        console.log("etat au paiement: " + (window.devisLinesState ? window.devisLinesState.length : 0) + " lignes");'
)

$result = [System.Collections.Generic.List[string]]::new()
$result.AddRange($part1)
$result.AddRange($newAddV5)
$result.AddRange($part2)
$result.AddRange($newConfirmOcr)
$result.AddRange($part3)
$result.AddRange($injection)
$result.AddRange($part4)
$result.AddRange($logInjection)
$result.AddRange($newModal)
$result.AddRange($part5)

[System.IO.File]::WriteAllLines('app_privee.html', $result, [System.Text.Encoding]::UTF8)
Write-Host "Success!"
