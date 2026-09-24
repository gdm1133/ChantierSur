$ErrorActionPreference = 'Stop'

$htmlPath = "app_privee.html"
$content = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)

$start = $content.IndexOf('<form id="pane-3"')
if ($start -eq -1) { throw "pane-3 start not found" }
$end = $content.IndexOf('</form>', $start)
if ($end -eq -1) { throw "pane-3 end not found" }
$end = $end + 7

$newForm = @"
<form id="pane-3" class="service-pane hidden space-y-8" onsubmit="event.preventDefault();" novalidate>
  <!-- 2.1 Bloc Informations du client -->
  <div class="step-container space-y-6">
    <h4 class="text-lg font-bold text-[#0B1325]">Informations du client</h4>
    <input type="text" name="client_name" placeholder="Nom complet" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" required>
    <input type="email" name="client_email" placeholder="Email" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" required>
    <input type="tel" name="client_phone" placeholder="Téléphone" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" required>
    <input type="text" name="client_city" placeholder="Ville" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" required>
    <input type="text" name="project_type" placeholder="Type de projet" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" required>
    <input type="number" name="exact_levels" placeholder="Nombre de niveaux" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3" required>
  </div>

  <!-- 2.2 Bloc Lots du devis -->
  <div class="step-container space-y-6">
    <h4 class="text-lg font-bold text-[#0B1325]">Lots du devis</h4>
    <div id="v5-lots-container" class="space-y-4"></div>
    <button type="button" onclick="window.addV5Lot()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-lg transition-colors">+ Ajouter un lot</button>
  </div>

  <!-- 2.3 Bloc Totaux -->
  <div class="step-container space-y-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
    <h4 class="text-lg font-bold text-[#0B1325]">Totaux</h4>
    <div class="flex justify-between"><span>Total HT :</span><span id="v5-total-ht">0</span></div>
    <div class="flex justify-between items-center">
      <span>TVA (%) :</span>
      <input type="number" id="v5-tva-rate" value="18" oninput="window.calcV5Totals()" class="w-24 bg-white border border-slate-300 rounded-lg px-3 py-1 text-right">
    </div>
    <div class="flex justify-between font-bold text-lg border-t border-slate-300 pt-2 mt-2"><span>Total TTC :</span><span id="v5-total-ttc">0</span></div>
  </div>

  <!-- 2.4 Bloc Conditions contractuelles -->
  <div class="step-container space-y-6">
    <h4 class="text-lg font-bold text-[#0B1325]">Conditions contractuelles</h4>
    <input type="text" name="acompte" placeholder="Acompte" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
    <input type="text" name="echeancier" placeholder="Echéancier de paiement" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
    <input type="text" name="retenue" placeholder="Retenue de garantie" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
    <input type="text" name="penalites" placeholder="Pénalités de retard" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
    <input type="text" name="avenants" placeholder="Gestion des avenants" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
    <input type="text" name="assurances" placeholder="Assurances" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3">
  </div>

  <div id="v5-error-msg" class="text-rose-600 font-bold hidden">Veuillez saisir au moins un lot avec son montant pour lancer l'audit.</div>
  
  <div class="flex justify-end pt-4">
    <button type="button" id="v5-btn-audit" disabled onclick="initiatePayment(3, 'audit')" class="px-8 py-4 bg-[#0B1325] hover:bg-slate-800 text-white font-extrabold rounded-xl transition-all shadow-xl disabled:bg-slate-400">Lancer l'audit</button>
  </div>
</form>
<script>
window.addV5Lot = function() {
    const container = document.getElementById('v5-lots-container');
    const div = document.createElement('div');
    div.className = 'flex gap-4 items-center bg-white p-3 rounded-xl border border-slate-200 lot-row';
    div.innerHTML = `
        <input type="text" class="lot-desc flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2" placeholder="Description du lot (ex: Maçonnerie)" oninput="window.calcV5Totals()">
        <input type="number" min="0" class="lot-montant w-48 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2" placeholder="Montant FCFA" oninput="window.calcV5Totals()">
        <button type="button" onclick="this.parentElement.remove(); window.calcV5Totals()" class="text-rose-500 font-bold">X</button>
    `;
    container.appendChild(div);
    window.calcV5Totals();
};

window.calcV5Totals = function() {
    const rows = document.querySelectorAll('.lot-row');
    let totalHT = 0;
    let validLots = 0;
    
    rows.forEach(row => {
        const desc = row.querySelector('.lot-desc').value.trim();
        const montant = parseFloat(row.querySelector('.lot-montant').value) || 0;
        if (desc.length > 0 && montant >= 0 && row.querySelector('.lot-montant').value !== '') {
            validLots++;
            totalHT += montant;
        }
    });
    
    document.getElementById('v5-total-ht').innerText = totalHT.toLocaleString('fr-FR') + ' FCFA';
    const tvaRate = parseFloat(document.getElementById('v5-tva-rate').value) || 0;
    const totalTTC = totalHT * (1 + (tvaRate / 100));
    document.getElementById('v5-total-ttc').innerText = totalTTC.toLocaleString('fr-FR') + ' FCFA';
    
    const btn = document.getElementById('v5-btn-audit');
    const msg = document.getElementById('v5-error-msg');
    
    if (validLots > 0) {
        btn.disabled = false;
        msg.classList.add('hidden');
    } else {
        btn.disabled = true;
        msg.classList.remove('hidden');
    }
};
// Add initial lot
document.addEventListener('DOMContentLoaded', () => { window.addV5Lot(); });
</script>
"@

$content = $content.Substring(0, $start) + $newForm + $content.Substring($end)
[System.IO.File]::WriteAllText($htmlPath, $content, [System.Text.Encoding]::UTF8)
Write-Host "Patched successfully"
