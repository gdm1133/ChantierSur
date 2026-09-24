$path = ".\app_privee.html"
$content = [IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# UTF-8 Fixes
$content = $content.Replace("sǸnǸgal", "sénégal").Replace("SǸnǸgal", "Sénégal").Replace("d'%tudes", "d'Études")
$content = $content.Replace("GǸnǸral", "Général").Replace("NumǸrique", "Numérique").Replace("sǸcurisez", "sécurisez")
$content = $content.Replace("SǸcurisez", "Sécurisez").Replace("SǸcuritǸ", "Sécurité").Replace("conformitǸ", "conformité")
$content = $content.Replace("Bǽtissez", "Bâtissez").Replace("bǽtiment", "bâtiment").Replace("SpǸcificitǸs", "Spécificités")
$content = $content.Replace("LǸgales", "Légales").Replace("LǸgal", "Légal").Replace("indǸpendante", "indépendante")
$content = $content.Replace("ingǸnierie", "ingénierie").Replace("dǸcision", "décision").Replace("prǸdimensionnement", "prédimensionnement")
$content = $content.Replace("rǸgie", "régie").Replace("mǸtrǸs", "métrés").Replace("financires", "financières")
$content = $content.Replace("gǸnǸrǸs", "générés").Replace("dǸvolus", "dévolus").Replace("contrle", "contrôle")
$content = $content.Replace("agrǸǸs", "agréés").Replace("dǸpts", "dépôts").Replace("ǸditǸe", "éditée")
$content = $content.Replace("propulsǸe", "propulsée").Replace("tǸlǸchargement", "téléchargement").Replace("dǸmarre", "démarre")
$content = $content.Replace("arrire-plan", "arrière-plan").Replace("SǸlectionner", "Sélectionner").Replace("dǸtectǸes", "détectées")
$content = $content.Replace("prǸ-remplies", "pré-remplies").Replace("RǸsidentiel", "Résidentiel").Replace("privǸe", "privée")
$content = $content.Replace("ǸlǸvation", "élévation").Replace("Ǹtage", "étage").Replace("AnalysǸ", "Analysé")
$content = $content.Replace("BǸton", "Béton").Replace("armǸ", "armé").Replace("dosǸ", "dosé").Replace("Maonnerie", "Maçonnerie")
$content = $content.Replace("o", "✓").Replace("Y>", "🚀").Replace("?", "🛠")
$content = $content.Replace("d'`uvre", "d'œuvre").Replace("Gros 'uvre", "Gros Œuvre").Replace("DǸsignation", "Désignation")
$content = $content.Replace("m", "m²").Replace(" ", "à ")

# HTML changes (adding devis-total-display)
$buttonSearch = '<button type="button" onclick="addDevisLine()" class="px-6 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 font-bold text-sm">+ Ajouter une ligne</button>'
$buttonReplace = "$buttonSearch`n      <div class=`"text-right font-bold text-slate-800 text-lg`">TOTAL DEVIS : <span id=`"devis-total-display`" class=`"text-emerald-600`">0 FCFA</span></div>"
$content = $content.Replace($buttonSearch, $buttonReplace)

# UI simplifications on Step 2 button
$content = $content.Replace('<span>Suivant</span>', '<span>Valider les données et passer au chiffrage</span>')

$startIdx = $content.IndexOf("    window.addDevisLine = function() {")
$endIdx = $content.IndexOf("    window.getDevisLines = function() {", $startIdx)

$newCode = @"
    window.addDevisLine = function() {
      devisLineCount++;
      const container = document.getElementById('devis-lines-container');
      if (!container) return;
      
      const lineId = 'devis-line-' + devisLineCount;
      const html = `
        <div id="`${lineId}" class="devis-line-item relative bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col md:flex-row gap-3 items-center">
          <button type="button" onclick="deleteDevisLine('`${lineId}')" class="absolute top-1 right-1 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1 rounded transition-colors" title="Supprimer la ligne">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
          
          <div class="w-full md:w-5/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Désignation</label>
            <input type="text" class="dl-designation w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none">
          </div>
          <div class="w-full md:w-2/12 hidden">
             <input type="text" class="dl-lot" value="Lot Général">
             <input type="text" class="dl-num" value="">
             <input type="text" class="dl-nature" value="Fourniture et pose">
          </div>
          <div class="w-full md:w-1/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Unité</label>
            <input type="text" class="dl-unit w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none text-center">
          </div>
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Qté</label>
            <input type="number" step="0.01" class="dl-qty w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none" oninput="recalcDevisLine('`${lineId}')">
          </div>
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">PU HT</label>
            <input type="number" step="1" class="dl-pu w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none" oninput="recalcDevisLine('`${lineId}')">
          </div>
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Montant HT</label>
            <input type="number" step="1" class="dl-total w-full bg-amber-50 border border-amber-300 rounded px-2 py-1 text-sm font-bold outline-none" oninput="recalcDevisLine('`${lineId}', true)">
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', html);
      updateDevisTotal();
    };

    window.deleteDevisLine = function(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
      updateDevisTotal();
    };

    window.recalcDevisLine = function(id, manualTotal = false) {
      const el = document.getElementById(id);
      if (!el) return;
      
      const q = parseFloat(el.querySelector('.dl-qty').value) || 0;
      const pu = parseFloat(el.querySelector('.dl-pu').value) || 0;
      const tInput = el.querySelector('.dl-total');
      
      if (!manualTotal) {
        if (q > 0 && pu > 0) tInput.value = (q * pu).toFixed(0);
      }
      
      updateDevisTotal();
    };
    
    window.updateDevisTotal = function() {
      let total = 0;
      document.querySelectorAll('.dl-total').forEach(el => {
        total += parseFloat(el.value) || 0;
      });
      const disp = document.getElementById('devis-total-display');
      if (disp) {
          disp.innerText = total.toLocaleString('fr-FR') + ' FCFA';
      }
    };
"@

if ($startIdx -ne -1 -and $endIdx -ne -1) {
    $newContent = $content.Substring(0, $startIdx) + $newCode + "`r`n" + $content.Substring($endIdx)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [IO.File]::WriteAllText($path, $newContent, $utf8NoBom)
    Write-Output "UI Redesign and UTF-8 applied successfully."
} else {
    Write-Output "Could not find start or end index."
}
