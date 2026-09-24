  window.addDevisLine = function() {
    const container = document.getElementById('devis-lines-container');
    if (!container) return;
    window.devisLineCount = (window.devisLineCount || 0) + 1;
    const idx = window.devisLineCount;

    const div = document.createElement('div');
    div.className = 'devis-line-item bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 relative';
    div.innerHTML = 
      <div class="absolute -top-3 -left-3 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm"> + idx + </div>
      
      <div class="w-full md:w-3/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lot / Macro-Lot</label>
        <select class="dl-lot w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0B1325] outline-none">
          <option value="Gros œuvre & structure">Gros œuvre & structure</option>
          <option value="Étanchéité & toiture">Étanchéité & toiture</option>
          <option value="Second œuvre & finitions">Second œuvre & finitions</option>
          <option value="Installation & travaux préparatoires">Installation & travaux préparatoires</option>
        </select>
      </div>
      
      <div class="w-full md:w-3/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Désignation</label>
        <input type="text" class="dl-designation w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0B1325] outline-none" placeholder="Ex: Béton armé en fondations..." required>
      </div>

      <div class="w-full md:w-2/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nature du prix</label>
        <select class="dl-nature w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0B1325] outline-none">
          <option value="Fourniture et pose">Fourniture et pose</option>
          <option value="Fourniture seule">Fourniture seule</option>
          <option value="Main d'œuvre seule">Main d'œuvre seule</option>
        </select>
      </div>

      <div class="w-full md:w-1/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unité</label>
        <select class="dl-unit w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0B1325] outline-none" onchange="window.recalcDevisLine(this)">
          <option value="m³">m³</option>
          <option value="m²">m²</option>
          <option value="ml">ml</option>
          <option value="U">U</option>
          <option value="kg">kg</option>
          <option value="T">T</option>
          <option value="sac">sac</option>
          <option value="paquet">paquet</option>
          <option value="voyage">voyage</option>
          <option value="jour">jour</option>
          <option value="forfait">forfait</option>
        </select>
      </div>

      <div class="w-full md:w-1/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qté</label>
        <input type="number" step="0.01" class="dl-qty w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0B1325] outline-none" value="0" oninput="window.recalcDevisLine(this)">
      </div>

      <div class="w-full md:w-2/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">PU HT</label>
        <input type="number" class="dl-pu w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0B1325] outline-none" value="0" oninput="window.recalcDevisLine(this)">
      </div>

      <div class="w-full md:w-2/12">
        <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total HT</label>
        <input type="number" class="dl-total w-full bg-slate-200 border border-slate-300 rounded-lg px-2 py-2 text-sm text-slate-900 font-bold outline-none" value="0" readonly>
      </div>

      <button type="button" onclick="this.closest('.devis-line-item').remove(); window.updateDevisTotal();" class="text-slate-400 hover:text-red-500 transition-colors mt-4 md:mt-0" title="Supprimer la ligne">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    ;
    container.appendChild(div);
  };

  window.recalcDevisLine = function(el) {
    const line = el.closest('.devis-line-item');
    const unit = line.querySelector('.dl-unit').value;
    const qtyInput = line.querySelector('.dl-qty');
    const puInput = line.querySelector('.dl-pu');
    const totalInput = line.querySelector('.dl-total');

    if (unit === 'forfait') {
      qtyInput.value = '';
      qtyInput.disabled = true;
      puInput.value = '';
      puInput.disabled = true;
      totalInput.readOnly = false;
      totalInput.classList.remove('bg-slate-200');
      totalInput.classList.add('bg-white');
    } else {
      qtyInput.disabled = false;
      puInput.disabled = false;
      totalInput.readOnly = true;
      totalInput.classList.add('bg-slate-200');
      totalInput.classList.remove('bg-white');
      const q = parseFloat(qtyInput.value) || 0;
      const p = parseFloat(puInput.value) || 0;
      totalInput.value = Math.round(q * p);
    }
    window.updateDevisTotal();
  };

  window.updateDevisTotal = function() {
    const lines = document.querySelectorAll('.devis-line-item');
    let total = 0;
    lines.forEach(line => {
      total += parseFloat(line.querySelector('.dl-total').value) || 0;
    });
    
    document.getElementById('devis-line-counter').textContent = lines.length + ' ligne(s)';
    document.getElementById('devis-total-provisoire').textContent = total.toLocaleString('fr-FR');
  };

  window.populateAuditRecap = function() {
    const tbody = document.getElementById('recap-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const lines = document.querySelectorAll('.devis-line-item');
    let totalHT = 0;

    lines.forEach(line => {
      const lot = line.querySelector('.dl-lot').value;
      const des = line.querySelector('.dl-designation').value || 'Sans nom';
      const u = line.querySelector('.dl-unit').value;
      const q = parseFloat(line.querySelector('.dl-qty').value) || 0;
      const p = parseFloat(line.querySelector('.dl-pu').value) || 0;
      const t = parseFloat(line.querySelector('.dl-total').value) || 0;
      totalHT += t;

      const tr = document.createElement('tr');
      tr.innerHTML = 
        <td class="px-4 py-2 border-b border-slate-100"> + lot + </td>
        <td class="px-4 py-2 border-b border-slate-100 font-medium"> + des + </td>
        <td class="px-4 py-2 border-b border-slate-100 text-right"> + (u === 'forfait' ? '-' : q) + </td>
        <td class="px-4 py-2 border-b border-slate-100 text-center"> + u + </td>
        <td class="px-4 py-2 border-b border-slate-100 text-right"> + (u === 'forfait' ? '-' : p.toLocaleString('fr-FR')) + </td>
        <td class="px-4 py-2 border-b border-slate-100 text-right font-bold"> + t.toLocaleString('fr-FR') + </td>
      ;
      tbody.appendChild(tr);
    });

    const pane = document.getElementById('pane-3');
    const tvaSelect = pane.querySelector('[name="tva_applicable"]').value;
    const tva = tvaSelect === 'oui' ? Math.round(totalHT * 0.18) : 0;
    const totalTTC = totalHT + tva;

    document.getElementById('recap-total-ht').textContent = totalHT.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('recap-total-tva').textContent = tva.toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('recap-total-ttc').textContent = totalTTC.toLocaleString('fr-FR') + ' FCFA';
  };
