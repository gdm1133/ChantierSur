// --- MODULE AUDIT V3.1 : OCR & VALIDATION REEL ---

// Inject OCR libraries
(function() {
  const tesseractScript = document.createElement('script');
  tesseractScript.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  document.head.appendChild(tesseractScript);

  const pdfScript = document.createElement('script');
  pdfScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  document.head.appendChild(pdfScript);
})();

window.auditOcrLines = [];
window.auditOcrMetadata = { pages: 0, totalExtrait: 0, totalDoc: 0 };

window.triggerFileInput = function(id) {
  document.getElementById(id).click();
};

window.openTextModal = function() {
  document.getElementById('ocr-text-modal').classList.remove('hidden');
};
window.closeTextModal = function() {
  document.getElementById('ocr-text-modal').classList.add('hidden');
};

window.processTextPaste = function() {
  const text = document.getElementById('ocr-paste-textarea').value;
  if (!text || text.trim().length === 0) return;
  closeTextModal();
  showLoadingScreen();
  
  // Simulate processing time for UX
  setTimeout(() => {
    processExtractedText(text, 1);
  }, 500);
};

window.handleImageUpload = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  showLoadingScreen();
  try {
    const result = await Tesseract.recognize(file, 'fra');
    processExtractedText(result.data.text, 1);
  } catch(e) {
    showError("Échec de la lecture de l'image. Veuillez réessayer avec une photo plus nette.");
  }
};

window.handlePDFUpload = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  showLoadingScreen();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    processExtractedText(fullText, pdf.numPages);
  } catch(e) {
    showError("Échec de la lecture du PDF. Le fichier est peut-être protégé ou illisible.");
  }
};

function showLoadingScreen() {
  document.getElementById('ocr-error-banner').classList.add('hidden');
  document.getElementById('ocr-screen-1').classList.add('hidden');
  document.getElementById('ocr-screen-2').classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('ocr-screen-2').classList.add('hidden');
  document.getElementById('ocr-screen-1').classList.remove('hidden');
  const banner = document.getElementById('ocr-error-banner');
  banner.classList.remove('hidden');
  banner.innerText = msg;
  // reset inputs
  document.getElementById('ocr-image-input').value = "";
  document.getElementById('ocr-pdf-input').value = "";
}

window.processExtractedText = function(text, numPages) {
  const lines = text.split('\n');
  const extractedLines = [];
  let currentLot = 'Gros œuvre';
  let totalExtracted = 0;
  
  lines.forEach((lineText, idx) => {
    lineText = lineText.trim();
    if (!lineText) return;
    
    if (lineText.length < 50 && (lineText.toUpperCase().includes('LOT') || lineText.toUpperCase() === lineText)) {
      if (lineText.length > 3) currentLot = lineText; 
    }
    
    const numRegex = /([\d\s,\.]+)/g;
    const matches = [...lineText.matchAll(numRegex)].map(m => m[0].replace(/\s/g, '').replace(',', '.')).filter(m => !isNaN(parseFloat(m)) && parseFloat(m) > 0);
    
    if (matches.length >= 2) {
      const total = parseFloat(matches[matches.length - 1]);
      const pu = parseFloat(matches[matches.length - 2]);
      let q = matches.length >= 3 ? parseFloat(matches[matches.length - 3]) : 1;
      
      if (Math.abs((q * pu) - total) < (total * 0.15)) {
        let des = lineText;
        matches.forEach(m => des = des.replace(m, ''));
        des = des.replace(/m2|m3|m²|m³|ml|u|ens|forfait/gi, '').replace(/[^a-zA-ZÀ-ÿ\s-]/g, '').trim(); 
        
        let u = 'u';
        if (/m2|m²/i.test(lineText)) u = 'm²';
        else if (/m3|m³/i.test(lineText)) u = 'm³';
        else if (/ml/i.test(lineText)) u = 'ml';
        else if (/ens|forfait/i.test(lineText)) u = 'forfait';
        
        let conf = (des.length > 5 && q > 0 && pu > 0) ? 'high' : 'low';
        if (des.length < 3) {
          des = 'illisible';
          conf = 'low';
        }
        
        extractedLines.push({
          id: Date.now() + idx,
          lot: currentLot,
          des: des,
          u: u,
          q: q,
          pu: pu,
          total: total,
          conf: conf,
          status: 'pending'
        });
        totalExtracted += total;
      }
    }
  });
  
  // Total doc heuristic
  const totalDocMatch = text.match(/(?:total|net\s*à\s*payer|montant)[\s\S]{0,50}?([\d\s,\.]+)/i);
  let totalDoc = totalExtracted; // fallback
  if (totalDocMatch) {
    const val = parseFloat(totalDocMatch[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) totalDoc = val;
  }

  if (extractedLines.length === 0) {
    showError("Aucune ligne détectée. Veuillez réessayer avec un document plus lisible ou saisir manuellement.");
    return;
  }

  window.auditOcrLines = extractedLines;
  window.auditOcrMetadata = { pages: numPages, totalExtrait: totalExtracted, totalDoc: totalDoc };
  
  renderOCRLines();
  document.getElementById('ocr-screen-2').classList.add('hidden');
  document.getElementById('ocr-screen-3').classList.remove('hidden');
};

window.skipAuditOCR = function() {
  document.getElementById('audit-v3-container').classList.add('hidden');
  document.getElementById('audit-manual-form').classList.remove('hidden');
};

window.resetAuditOCR = function() {
  document.getElementById('ocr-screen-3').classList.add('hidden');
  document.getElementById('ocr-screen-1').classList.remove('hidden');
  window.auditOcrLines = [];
  document.getElementById('ocr-image-input').value = "";
  document.getElementById('ocr-pdf-input').value = "";
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
  
  // Render Reconciliation Header
  const recEl = document.getElementById('ocr-reconciliation');
  if (recEl) {
    const formatF = num => new Intl.NumberFormat('fr-FR').format(num);
    const ecart = Math.abs(window.auditOcrMetadata.totalExtrait - window.auditOcrMetadata.totalDoc);
    recEl.innerHTML = `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="text-sm text-blue-900">
          <p class="font-bold">Réconciliation du document</p>
          <p>${window.auditOcrMetadata.pages} page(s) traitée(s) • ${window.auditOcrLines.length} ligne(s) détectée(s)</p>
        </div>
        <div class="text-sm text-right">
          <p class="text-blue-900">Total extrait : <span class="font-bold">${formatF(window.auditOcrMetadata.totalExtrait)} FCFA</span></p>
          ${ecart > (window.auditOcrMetadata.totalDoc * 0.05) ? `<p class="text-rose-600 font-bold">Écart avec le document : ${formatF(ecart)} FCFA</p>` : `<p class="text-emerald-600 font-bold">Total cohérent avec le document</p>`}
        </div>
      </div>
    `;
  }

  const btn = document.getElementById('btn-continue-audit');
  btn.disabled = !allValidated || !hasLines;
};

window.updateOCRLine = function(id, field, value) {
  const line = window.auditOcrLines.find(l => l.id === id);
  if (line) {
    line[field] = value;
    line.status = 'pending'; 
    if (line.des !== 'illisible' && line.u !== 'illisible') {
      line.conf = 'high'; 
    }
    
    if (field === 'q' || field === 'pu') {
       line.total = line.q * line.pu;
    }
    
    // update totalextrait
    window.auditOcrMetadata.totalExtrait = window.auditOcrLines.reduce((acc, curr) => acc + curr.total, 0);
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
  window.auditOcrMetadata.totalExtrait = window.auditOcrLines.reduce((acc, curr) => acc + curr.total, 0);
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
    total: 0,
    conf: 'high',
    status: 'pending'
  });
  renderOCRLines();
};

window.finishOCRValidation = function() {
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

  window.skipAuditOCR();
  window.goToStep(3, 1);
};
