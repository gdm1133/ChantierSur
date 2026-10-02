const fs = require('fs');

let html = fs.readFileSync('app_privee.html', 'utf8');

const confirmOcrOld = \window.confirmOCR = function() {
      const tbody = document.getElementById('ocr-validation-table-body');
      const rows = tbody.querySelectorAll('tr');
      
      if (rows.length === 0) {
          alert("Veuillez valider au moins une ligne.");
          return;
      }
      
      rows.forEach(row => {
          const lot = row.querySelector('.ocr-input-lot').value.trim();
          const des = row.querySelector('.ocr-input-des').value.trim();
          const total = parseFloat(row.querySelector('.ocr-input-total').value) || 0;
          
          if (des.length > 0 && total >= 0) {
              // Incorporate lot into designation for the simple form
              const finalDes = lot ? \\\[\\\\\] \\\\\\\\ : des;
              window.addV5Lot({ designation: finalDes, montant_indique: total });
          }
      });
      
      window.cancelOCR(); // Reset OCR UI
      window.calcV5Totals();
  };\;

const confirmOcrNew = \window.devisLinesState = [];
window.confirmOCR = function() {
      const tbody = document.getElementById('ocr-validation-table-body');
      const rows = tbody.querySelectorAll('tr');
      
      let validatedLines = [];
      let validCount = 0;
      
      rows.forEach(row => {
          const lot = row.querySelector('.ocr-input-lot').value.trim();
          const des = row.querySelector('.ocr-input-des').value.trim();
          const unit = row.querySelector('.ocr-input-unit').value.trim();
          const qte = parseFloat(row.querySelector('.ocr-input-qte').value) || 0;
          const pu = parseFloat(row.querySelector('.ocr-input-pu').value) || 0;
          const total = parseFloat(row.querySelector('.ocr-input-total').value) || 0;
          
          if (des.length > 0 && total >= 0) {
              const finalDes = lot ? \\\[\\\\\] \\\\\\\\ : des;
              validatedLines.push({ designation: finalDes, montant_indique: total, quantite: qte, pu: pu, unite: unit });
              validCount++;
          }
      });
      
      if (validCount === 0) {
          alert("Veuillez valider au moins une ligne.");
          return;
      }
      
      window.devisLinesState = validatedLines;
      console.log("validation: " + window.devisLinesState.length + " lignes");
      
      window.renderV5LotsState();
      window.cancelOCR(); // Reset OCR UI
  };\;

html = html.replace(confirmOcrOld, confirmOcrNew);

const addV5LotOld = \window.addV5Lot = function(data = null) {
      const container = document.getElementById('v5-lots-container');
      const div = document.createElement('div');
      div.className = 'flex gap-4 items-center bg-white p-3 rounded-xl border border-slate-200 lot-row';
      
      const defaultDesc = data && data.designation ? data.designation : '';
      const defaultMontant = data && data.montant_indique ? data.montant_indique : '';
  
      div.innerHTML = \\\
          <input type="text" class="lot-desc flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2" placeholder="Description du lot (ex: Maçonnerie)" value="\\\\\" oninput="window.calcV5Totals()">
          <input type="number" min="0" class="lot-montant w-48 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2" placeholder="Montant FCFA" value="\\\\\" oninput="window.calcV5Totals()">
          <button type="button" onclick="this.parentElement.remove(); window.calcV5Totals()" class="text-rose-500 font-bold">X</button>
      \\\;
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
      
      const tvaRate = parseFloat(document.getElementById('v5-tva-rate').value) || 18;
      const totalTTC = totalHT * (1 + (tvaRate / 100));
      
      document.getElementById('v5-total-ht').textContent = totalHT.toLocaleString('fr-FR');
      document.getElementById('v5-total-ttc').textContent = totalTTC.toLocaleString('fr-FR');
      
      const btn = document.getElementById('v5-btn-audit');
      const err = document.getElementById('v5-error-msg');
      if (validLots > 0) {
          btn.disabled = false;
          err.classList.add('hidden');
      } else {
          btn.disabled = true;
          err.classList.remove('hidden');
      }
  };\;

const addV5LotNew = \window.addV5Lot = function(data = null) {
      const defaultDesc = data && data.designation ? data.designation : '';
      const defaultMontant = data && data.montant_indique ? data.montant_indique : '';
      if (!window.devisLinesState) window.devisLinesState = [];
      window.devisLinesState.push({ designation: defaultDesc, montant_indique: defaultMontant });
      window.renderV5LotsState();
  };
  
  window.updateV5Lot = function(index, field, value) {
      if (window.devisLinesState && window.devisLinesState[index]) {
          window.devisLinesState[index][field] = field === 'montant_indique' ? (parseFloat(value) || 0) : value;
          window.calcV5TotalsState();
      }
  };
  
  window.removeV5Lot = function(index) {
      if (window.devisLinesState) {
          window.devisLinesState.splice(index, 1);
          window.renderV5LotsState();
      }
  };
  
  window.renderV5LotsState = function() {
      const container = document.getElementById('v5-lots-container');
      container.innerHTML = '';
      if (!window.devisLinesState) return;
      window.devisLinesState.forEach((lot, index) => {
          const div = document.createElement('div');
          div.className = 'flex gap-4 items-center bg-white p-3 rounded-xl border border-slate-200 lot-row';
          
          const safeDesc = (lot.designation || '').toString().replace(/"/g, '&quot;');
          const safeMontant = (lot.montant_indique || '').toString().replace(/"/g, '&quot;');
          
          div.innerHTML = \\\
              <input type="text" class="lot-desc flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2" placeholder="Description du lot (ex: Maçonnerie)" value="\\\ + safeDesc + \\\" oninput="window.updateV5Lot(\\\ + index + \\\, 'designation', this.value)">
              <input type="number" min="0" class="lot-montant w-48 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2" placeholder="Montant FCFA" value="\\\ + safeMontant + \\\" oninput="window.updateV5Lot(\\\ + index + \\\, 'montant_indique', this.value)">
              <button type="button" onclick="window.removeV5Lot(\\\ + index + \\\)" class="text-rose-500 font-bold">X</button>
          \\\;
          container.appendChild(div);
      });
      window.calcV5TotalsState();
  };
  
  window.calcV5TotalsState = function() {
      let totalHT = 0;
      let validLots = 0;
      
      if (window.devisLinesState) {
          window.devisLinesState.forEach(lot => {
              if (lot.designation.length > 0 && lot.montant_indique >= 0) {
                  validLots++;
                  totalHT += parseFloat(lot.montant_indique) || 0;
              }
          });
      }
      
      const tvaRate = parseFloat(document.getElementById('v5-tva-rate').value) || 18;
      const totalTTC = totalHT * (1 + (tvaRate / 100));
      
      document.getElementById('v5-total-ht').textContent = totalHT.toLocaleString('fr-FR');
      document.getElementById('v5-total-ttc').textContent = totalTTC.toLocaleString('fr-FR');
      
      const btn = document.getElementById('v5-btn-audit');
      const err = document.getElementById('v5-error-msg');
      if (validLots > 0) {
          btn.disabled = false;
          err.classList.add('hidden');
      } else {
          btn.disabled = true;
          err.classList.remove('hidden');
      }
  };\;

html = html.replace(addV5LotOld, addV5LotNew);

const getDevisOld = \window.getDevisLines = function() {
    const lines = [];
    const rows = document.querySelectorAll('.lot-row'); // Utiliser les lots validés de l'Audit
    
    rows.forEach(row => {
        const des = row.querySelector('.lot-desc').value.trim();
        const montant = parseFloat(row.querySelector('.lot-montant').value) || 0;
        
        if (des.length > 0 && montant >= 0) {
            lines.push({
                designation: des,
                montant_indique: montant
            });
        }
    });
    return lines;
  };\;

const getDevisNew = \window.getDevisLines = function() {
    return window.devisLinesState || [];
  };\;

html = html.replace(getDevisOld, getDevisNew);

const modalOld = \const modal = document.createElement('div');
        modal.id = 'pdf-success-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
        modal.innerHTML = \\\
          <div class="bg-slate-900 border-2 border-[#F59E0B] p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5">
            <div class="w-16 h-16 bg-amber-500/20 text-[#F59E0B] rounded-full flex items-center justify-center mx-auto text-3xl">📄</div>
            <h3 class="text-xl font-bold text-white">Paiement Validé & Livrable Prêt</h3>
            <p class="text-sm text-slate-300">Votre dossier officiel pour la formule <strong class="text-[#F59E0B] uppercase">\\\\\</strong> est prêt.</p>
            <button id="btn-force-download" class="w-full py-4 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg transition-all text-base cursor-pointer">
              📥 Télécharger mon Rapport PDF
            </button>
            <p id="pdf-status" class="text-xs text-slate-700 font-medium">Le téléchargement démarre également en arrière-plan...</p>
          </div>
        \\\;
        document.body.appendChild(modal);

        // Déclencheur
        function triggerPDF() {
          const statusEl = document.getElementById('pdf-status');
          const gen = window.generateProjectPDF || window.generatePDF;
          if (typeof gen === 'function') {
            try {
              gen(finalData);
              if (statusEl) statusEl.innerHTML = '<span class="text-emerald-400 font-bold">✓ Téléchargement lancé avec succès !</span>';
            } catch(err) {
              console.error("Erreur PDF:", err);
              if (statusEl) statusEl.innerHTML = '<span class="text-rose-400 font-bold">Erreur : ' + err.message + '</span>';
            }
          } else {
            if (statusEl) statusEl.innerHTML = '<span class="text-rose-400 font-bold">Erreur : moteur pdf-generator.js non détecté.</span>';
          }
        }\;

const modalNew = \const modal = document.createElement('div');
        modal.id = 'pdf-success-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
        modal.innerHTML = \\\
          <div class="bg-slate-900 border-2 border-[#F59E0B] p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5" id="pdf-modal-card">
            <div class="w-16 h-16 bg-amber-500/20 text-[#F59E0B] rounded-full flex items-center justify-center mx-auto text-3xl">📄</div>
            <h3 id="pdf-modal-title" class="text-xl font-bold text-white">Paiement Validé & Livrable Prêt</h3>
            <p id="pdf-modal-desc" class="text-sm text-slate-300">Votre dossier officiel pour la formule <strong class="text-[#F59E0B] uppercase">\\\ + s + \\\</strong> est prêt.</p>
            <button id="btn-force-download" class="w-full py-4 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg transition-all text-base cursor-pointer">
              📥 Télécharger mon Rapport PDF
            </button>
            <p id="pdf-status" class="text-xs text-slate-700 font-medium">Le téléchargement démarre également en arrière-plan...</p>
          </div>
        \\\;
        document.body.appendChild(modal);

        // Déclencheur
        function triggerPDF() {
          const statusEl = document.getElementById('pdf-status');
          const gen = window.generateProjectPDF || window.generatePDF;
          if (typeof gen === 'function') {
            try {
              gen(finalData);
              if (statusEl) statusEl.innerHTML = '<span class="text-emerald-400 font-bold">✓ Téléchargement lancé avec succès !</span>';
            } catch(err) {
              console.error("Erreur PDF:", err);
              document.getElementById('pdf-modal-title').innerText = "Validation requise";
              document.getElementById('pdf-modal-desc').style.display = 'none';
              document.getElementById('btn-force-download').style.display = 'none';
              if (statusEl) {
                statusEl.innerHTML = \\\
                  <div class="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-left">
                    <span class="text-rose-600 font-bold">\\\ + err.message + \\\</span>
                  </div>
                  <button id="btn-return-validation" class="mt-4 w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all text-base cursor-pointer">
                    Retourner à l'écran de validation
                  </button>
                \\\;
                document.getElementById('btn-return-validation').addEventListener('click', () => {
                  document.getElementById('pdf-success-modal').remove();
                });
              }
            }
          } else {
            if (statusEl) statusEl.innerHTML = '<span class="text-rose-400 font-bold">Erreur : moteur pdf-generator.js non détecté.</span>';
          }
        }\;

html = html.replace(modalOld, modalNew);

html = html.replace('finalData.service = s;', 'finalData.service = s;\\n        console.log("état au paiement: " + (window.devisLinesState ? window.devisLinesState.length : 0) + " lignes");');

fs.writeFileSync('app_privee.html', html, 'utf8');
