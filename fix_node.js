const fs = require('fs');

const path = 'app_privee.html';
let content = fs.readFileSync(path, 'utf8');

const replacements = {
    'SǸnǸgal': 'Sénégal',
    'sǸnǸgal': 'sénégal',
    'd\'%tudes': 'd\'Études',
    'GǸnǸral': 'Général',
    'NumǸrique': 'Numérique',
    'sǸcurisez': 'sécurisez',
    'SǸcurisez': 'Sécurisez',
    'SǸcuritǸ': 'Sécurité',
    'conformitǸ': 'conformité',
    'Bǽtissez': 'Bâtissez',
    'bǽtiment': 'bâtiment',
    'SpǸcificitǸs': 'Spécificités',
    'LǸgales': 'Légales',
    'LǸgal': 'Légal',
    'indǸpendante': 'indépendante',
    'ingǸnierie': 'ingénierie',
    'dǸcision': 'décision',
    'prǸdimensionnement': 'prédimensionnement',
    'rǸgie': 'régie',
    'mǸtrǸs': 'métrés',
    'financires': 'financières',
    'financires': 'financières',
    'gǸnǸrǸs': 'générés',
    'dǸvolus': 'dévolus',
    'contrle': 'contrôle',
    'contrle': 'contrôle',
    'agrǸǸs': 'agréés',
    'dǸpts': 'dépôts',
    'dǸpts': 'dépôts',
    'ǸditǸe': 'éditée',
    'propulsǸe': 'propulsée',
    'tǸlǸchargement': 'téléchargement',
    'dǸmarre': 'démarre',
    'arrire-plan': 'arrière-plan',
    'arrire-plan': 'arrière-plan',
    'SǸlectionner': 'Sélectionner',
    'dǸtectǸes': 'détectées',
    'prǸ-remplies': 'pré-remplies',
    'RǸsidentiel': 'Résidentiel',
    'privǸe': 'privée',
    'ǸlǸvation': 'élévation',
    'Ǹtage': 'étage',
    'AnalysǸ': 'Analysé',
    'BǸton': 'Béton',
    'armǸ': 'armé',
    'dosǸ': 'dosé',
    'Maonnerie': 'Maçonnerie',
    'd\'`uvre': 'd\'œuvre',
    'Gros \'uvre': 'Gros Œuvre',
    'DǸsignation': 'Désignation',
    'Ǹ': 'é',
    ' ': 'à ',
    'Y"?': '📍',
    '?': '•',
    '%': 'É',
    's': '⚠',
    '': '°',
    'ǽ': 'â',
    'ǩ': 'î',
    '': 'ô',
    '<span>Suivant</span>': '<span>Valider les données et passer au chiffrage</span>'
};

for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
}

// Add Total Devis display if not exists
const buttonSearch = '<button type="button" onclick="addDevisLine()" class="px-6 py-2 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 font-bold text-sm">+ Ajouter une ligne</button>';
if (!content.includes('devis-total-display')) {
    const buttonReplace = `${buttonSearch}\n      <div class="text-right font-bold text-slate-800 text-lg">TOTAL DEVIS : <span id="devis-total-display" class="text-emerald-600">0 FCFA</span></div>`;
    content = content.replace(buttonSearch, buttonReplace);
}

// Replace addDevisLine function
const startIdx = content.indexOf("    window.addDevisLine = function() {");
const endIdx = content.indexOf("    window.getDevisLines = function() {", startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const newCode = `
    window.addDevisLine = function() {
      devisLineCount++;
      const container = document.getElementById('devis-lines-container');
      if (!container) return;
      
      const lineId = 'devis-line-' + devisLineCount;
      const html = \`
        <div id="\${lineId}" class="devis-line-item relative bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col md:flex-row gap-3 items-center">
          <button type="button" onclick="deleteDevisLine('\${lineId}')" class="absolute top-1 right-1 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1 rounded transition-colors" title="Supprimer la ligne">
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
            <input type="number" step="0.01" class="dl-qty w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none" oninput="recalcDevisLine('\${lineId}')">
          </div>
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">PU HT</label>
            <input type="number" step="1" class="dl-pu w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-sm outline-none" oninput="recalcDevisLine('\${lineId}')">
          </div>
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase">Montant HT</label>
            <input type="number" step="1" class="dl-total w-full bg-amber-50 border border-amber-300 rounded px-2 py-1 text-sm font-bold outline-none" oninput="recalcDevisLine('\${lineId}', true)">
          </div>
        </div>
      \`;
      container.insertAdjacentHTML('beforeend', html);
      if(window.updateDevisTotal) updateDevisTotal();
    };

    window.deleteDevisLine = function(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
      if(window.updateDevisTotal) updateDevisTotal();
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
      
      if(window.updateDevisTotal) updateDevisTotal();
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
`;
    content = content.substring(0, startIdx) + newCode + "\n" + content.substring(endIdx);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Applied node.js fix successfully.");
} else {
    console.log("Could not find functions bounds");
}
