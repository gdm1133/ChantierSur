// --- MODULE AUDIT V3 : OCR & VALIDATION ---
window.auditOcrLines = [];

window.startAuditOCR = function(type) {
  document.getElementById('ocr-screen-1').classList.add('hidden');
  document.getElementById('ocr-screen-2').classList.remove('hidden');
  
  // Simulate OCR extraction delay
  setTimeout(() => {
    // Generate mock data according to test cases
    window.auditOcrLines = [
      { id: Date.now()+1, lot: 'Gros œuvre', des: 'Béton armé en fondation', u: 'm³', q: 15, pu: 120000, conf: 'high', status: 'pending' },
      { id: Date.now()+2, lot: 'Gros œuvre', des: 'Maçonnerie agglos creux 15cm', u: 'm²', q: 120, pu: 6000, conf: 'high', status: 'pending' },
      { id: Date.now()+3, lot: 'Second œuvre', des: 'Peinture vinylique intérieure', u: 'm²', q: 350, pu: 2500, conf: 'low', status: 'pending' },
      { id: Date.now()+4, lot: 'Plomberie', des: 'illisible', u: 'illisible', q: 0, pu: 0, conf: 'low', status: 'pending' }
    ];
    
    if (type === 'pdf') {
      window.auditOcrLines.push({ id: Date.now()+5, lot: 'Électricité', des: 'Forfait électricité RDC', u: 'forfait', q: '-', pu: '-', total: 1500000, conf: 'high', status: 'pending' });
    }

    renderOCRLines();
    document.getElementById('ocr-screen-2').classList.add('hidden');
    document.getElementById('ocr-screen-3').classList.remove('hidden');
  }, 2500);
};

window.skipAuditOCR = function() {
  document.getElementById('audit-v3-container').classList.add('hidden');
  document.getElementById('audit-manual-form').classList.remove('hidden');
};

window.resetAuditOCR = function() {
  document.getElementById('ocr-screen-3').classList.add('hidden');
  document.getElementById('ocr-screen-1').classList.remove('hidden');
  window.auditOcrLines = [];
};

window.renderOCRLines = function() {
  const container = document.getElementById('ocr-lines-container');
  container.innerHTML = '';
  
  let allValidated = true;
  let hasLines = window.auditOcrLines.length > 0;

  if (!hasLines) {
    container.innerHTML = '<div class="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">Veuillez photographier ou saisir au moins une ligne de devis pour lancer l\'audit.</div>';
    allValidated = false;
  }

  window.auditOcrLines.forEach((line, index) => {
    if (line.status !== 'validated') allValidated = false;
    
    const isLowConf = line.conf === 'low' && line.status !== 'validated';
    const bgClass = line.status === 'validated' ? 'bg-emerald-50 border-emerald-200' : (isLowConf ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200');
    
    let html = `
      <div class="border rounded-xl p-4 transition-colors ${bgClass}" id="ocr-line-${line.id}">
        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">
          
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lot</label>
            <input type="text" class="w-full bg-white/50 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none" value="${line.lot}" onchange="updateOCRLine(${line.id}, 'lot', this.value)">
          </div>
          
          <div class="w-full md:w-3/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Désignation</label>
            <input type="text" class="w-full ${line.des === 'illisible' ? 'border-rose-400 text-rose-600' : 'border-slate-300'} bg-white/50 border rounded-lg px-2 py-1.5 text-sm outline-none" value="${line.des}" onchange="updateOCRLine(${line.id}, 'des', this.value)">
          </div>
          
          <div class="w-full md:w-2/12 flex gap-2">
            <div class="w-1/2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qté</label>
              <input type="text" class="w-full bg-white/50 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none" value="${line.q}" onchange="updateOCRLine(${line.id}, 'q', this.value)">
            </div>
            <div class="w-1/2">
              <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unité</label>
              <input type="text" class="w-full ${line.u === 'illisible' ? 'border-rose-400 text-rose-600' : 'border-slate-300'} bg-white/50 border rounded-lg px-2 py-1.5 text-sm outline-none" value="${line.u}" onchange="updateOCRLine(${line.id}, 'u', this.value)">
            </div>
          </div>
          
          <div class="w-full md:w-2/12">
            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">PU HT</label>
            <input type="text" class="w-full bg-white/50 border border-slate-300 rounded-lg px-2 py-1.5 text-sm outline-none" value="${line.pu}" onchange="updateOCRLine(${line.id}, 'pu', this.value)">
          </div>
          
          <div class="w-full md:w-3/12 flex items-center justify-end gap-2 mt-4 md:mt-0">
    `;

    if (line.status !== 'validated') {
      html += `
        <button type="button" onclick="validateOCRLine(${line.id})" class="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          Valider
        </button>
      `;
    } else {
      html += `
        <span class="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded flex items-center gap-1 mr-2">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          Validé
        </span>
      `;
    }

    html += `
            <button type="button" onclick="deleteOCRLine(${line.id})" class="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Supprimer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML += html;
  });

  const btn = document.getElementById('btn-continue-audit');
  btn.disabled = !allValidated || !hasLines;
};

window.updateOCRLine = function(id, field, value) {
  const line = window.auditOcrLines.find(l => l.id === id);
  if (line) {
    line[field] = value;
    line.status = 'pending'; // any edit requires re-validation
    if (line.des !== 'illisible' && line.u !== 'illisible') {
      line.conf = 'high'; // manual fix upgrades confidence
    }
    renderOCRLines();
  }
};

window.validateOCRLine = function(id) {
  const line = window.auditOcrLines.find(l => l.id === id);
  if (line) {
    if (line.des === 'illisible' || line.u === 'illisible') {
      alert("Vous devez corriger les champs illisibles avant de valider la ligne.");
      return;
    }
    line.status = 'validated';
    renderOCRLines();
  }
};

window.deleteOCRLine = function(id) {
  window.auditOcrLines = window.auditOcrLines.filter(l => l.id !== id);
  renderOCRLines();
};

window.addBlankOCRLine = function() {
  window.auditOcrLines.push({
    id: Date.now(),
    lot: '',
    des: '',
    u: 'm²',
    q: 0,
    pu: 0,
    conf: 'high',
    status: 'pending'
  });
  renderOCRLines();
};

window.finishOCRValidation = function() {
  // Transfer validated lines to the manual form container (for compatibility with existing engine)
  const manualContainer = document.getElementById('devis-lines-container');
  manualContainer.innerHTML = '';
  
  window.auditOcrLines.forEach(line => {
    window.addDevisLine();
    const rows = manualContainer.querySelectorAll('.devis-line-item');
    const lastRow = rows[rows.length - 1];
    lastRow.querySelector('.dl-lot').value = line.lot || 'Gros œuvre & structure';
    lastRow.querySelector('.dl-designation').value = line.des;
    lastRow.querySelector('.dl-unit').value = line.u === '-' ? 'forfait' : (line.u || 'm²');
    
    const isForfait = (line.u === 'forfait' || line.u === '-');
    lastRow.querySelector('.dl-qty').value = isForfait ? '' : line.q;
    lastRow.querySelector('.dl-pu').value = isForfait ? '' : line.pu;
    lastRow.querySelector('.dl-total').value = isForfait ? line.total : (line.q * line.pu);
    window.recalcDevisLine(lastRow.querySelector('.dl-qty'));
  });

  // Switch to the standard 6-step form
  window.skipAuditOCR();
  
  // Jump to step 1 (Client info)
  window.goToStep(3, 1);
};
