$content = [System.IO.File]::ReadAllText('app_privee.html', [System.Text.Encoding]::UTF8)

# In confirmOCR:
$content = $content.Replace('validatedLines.push({ designation: finalDes, montant_indique: total, quantite: qte, pu: pu, unite: unit });', 'validatedLines.push({ lot: lot, designation: des, unite: unit, quantite: qte, pu: pu, montant: total });')

# In addV5Lot:
$content = $content.Replace('const defaultMontant = data && data.montant_indique ? data.montant_indique : '''';', 'const defaultMontant = data && data.montant_indique ? data.montant_indique : '''';')
$content = $content.Replace('window.devisLinesState.push({ designation: defaultDesc, montant_indique: defaultMontant });', 'window.devisLinesState.push({ lot: '''', designation: defaultDesc, unite: ''u'', quantite: 1, pu: defaultMontant, montant: defaultMontant });')

# In updateV5Lot:
$content = $content.Replace('field === ''montant_indique'' ? (parseFloat(value) || 0) : value', 'field === ''montant'' ? (parseFloat(value) || 0) : value')

# In renderV5LotsState:
$content = $content.Replace('const safeMontant = (lot.montant_indique || '''').toString().replace(/"/g, ''&quot;'');', 'const safeMontant = (lot.montant || '''').toString().replace(/"/g, ''&quot;'');')
$content = $content.Replace('oninput="window.updateV5Lot(${index}, ''montant_indique'', this.value)"', 'oninput="window.updateV5Lot(${index}, ''montant'', this.value)"')

# In calcV5TotalsState:
$content = $content.Replace('lot.designation && lot.designation.length > 0 && lot.montant_indique >= 0', 'lot.designation && lot.designation.length > 0 && lot.montant >= 0')
$content = $content.Replace('totalHT += parseFloat(lot.montant_indique) || 0;', 'totalHT += parseFloat(lot.montant) || 0;')

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText('app_privee.html', $content, $utf8NoBom)
Write-Host "Success app_privee!"
