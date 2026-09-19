const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Replace Tabs Grid
const gridRegex = /<div class="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-4 gap-4 mb-8 pb-2 hide-scrollbar">[\s\S]*?<\/div>/;
const newGrid = `<!-- GRILLE DES 4 SERVICES -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <!-- CARTE 1 -->
  <div id="tab-card-1" onclick="window.switchTab(1)" class="tab-card cursor-pointer p-5 rounded-2xl bg-slate-800 border-2 border-[#F59E0B] ring-2 ring-[#F59E0B] transition-all">
    <h3 class="text-base font-bold text-white mb-1">1. Esquisse & Faisabilité</h3>
    <p class="text-xs text-slate-400">Phase Zéro</p>
  </div>

  <!-- CARTE 2 -->
  <div id="tab-card-2" onclick="window.switchTab(2)" class="tab-card cursor-pointer p-5 rounded-2xl bg-slate-900/60 border-2 border-slate-800 hover:border-slate-700 transition-all">
    <h3 class="text-base font-bold text-white mb-1">2. BQE Gros Œuvre Express</h3>
    <p class="text-xs text-slate-400">Phase Budget</p>
  </div>

  <!-- CARTE 3 -->
  <div id="tab-card-3" onclick="window.switchTab(3)" class="tab-card cursor-pointer p-5 rounded-2xl bg-slate-900/60 border-2 border-slate-800 hover:border-slate-700 transition-all">
    <h3 class="text-base font-bold text-white mb-1">3. Contre-Expertise Devis</h3>
    <p class="text-xs text-slate-400">Détection des surfacturations & ratios stricts</p>
  </div>

  <!-- CARTE 4 -->
  <div id="tab-card-4" onclick="window.switchTab(4)" class="tab-card cursor-pointer p-5 rounded-2xl bg-slate-900/60 border-2 border-slate-800 hover:border-slate-700 transition-all">
    <h3 class="text-base font-bold text-white mb-1">4. Finitions & Second Œuvre</h3>
    <p class="text-xs text-slate-400">Phase Post-Gros Œuvre</p>
  </div>
</div>`;
html = html.replace(gridRegex, newGrid);

// Replace Pane IDs
html = html.replace(/id="pane-1"/g, 'id="service-pane-1"');
html = html.replace(/id="pane-2"/g, 'id="service-pane-2"');
html = html.replace(/id="pane-3"/g, 'id="service-pane-3"');
html = html.replace(/id="pane-4"/g, 'id="service-pane-4"');

// Replace Suivant Buttons
const btnSuivantRegex = /<button type="button" class="btn-step-next[^>]*onclick="nextStep\(this\)"[^>]*>Suivant<\/button>/g;
const newBtnSuivant = `
<button type="button" onclick="window.goToNextStep(this)" class="px-6 py-2.5 bg-[#F59E0B] text-slate-950 font-bold rounded-lg hover:bg-amber-400 cursor-pointer">
  Suivant
</button>
`.trim();
html = html.replace(btnSuivantRegex, newBtnSuivant);

// Replace Retour Buttons
const btnRetourRegex = /<button type="button" class="[^"]*btn-prev"[^>]*>.*Retour<\/button>/g;
const newBtnRetour = `
<button type="button" onclick="window.goToPrevStep(this)" class="px-6 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg hover:bg-slate-700 cursor-pointer">
  Retour
</button>
`.trim();
html = html.replace(btnRetourRegex, newBtnRetour);

// Replace Script Block
const scriptRegex = /<script>[\s\S]*?<\/script>\s*<\/body>/;
const newScript = `<script>
// 1. BASCULE IMMÉDIATE DES ONGLETS
window.switchTab = function(serviceIndex) {
  // Mise à jour visuelle des 4 cartes
  for (let i = 1; i <= 4; i++) {
    const card = document.getElementById('tab-card-' + i);
    const pane = document.getElementById('service-pane-' + i);
    
    if (card) {
      if (i === serviceIndex) {
        card.className = 'tab-card cursor-pointer p-5 rounded-2xl bg-slate-800 border-2 border-[#F59E0B] ring-2 ring-[#F59E0B] transition-all';
      } else {
        card.className = 'tab-card cursor-pointer p-5 rounded-2xl bg-slate-900/60 border-2 border-slate-800 hover:border-slate-700 transition-all';
      }
    }
    
    if (pane) {
      if (i === serviceIndex) {
        pane.classList.remove('hidden');
        pane.style.display = 'block';
      } else {
        pane.classList.add('hidden');
        pane.style.display = 'none';
      }
    }
  }
};

// 2. PASSAGE À L'ÉTAPE SUIVANTE
window.goToNextStep = function(btn) {
  const currentStep = btn.closest('.form-step');
  if (!currentStep) return;

  // Validation sélective des seuls champs visibles dans l'étape active
  const inputs = currentStep.querySelectorAll('input, select, textarea');
  for (let field of inputs) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return; // Interrompt si un champ visible obligatoire n'est pas rempli
    }
  }

  // Masquer l'étape courante et afficher la suivante
  const nextStep = currentStep.nextElementSibling;
  if (nextStep && nextStep.classList.contains('form-step')) {
    currentStep.classList.add('hidden');
    currentStep.style.display = 'none';
    nextStep.classList.remove('hidden');
    nextStep.style.display = 'block';

    // Mise à jour de la puce numérotée active
    const form = currentStep.closest('form');
    if (form) {
      const stepIndex = Array.from(form.querySelectorAll('.form-step')).indexOf(nextStep) + 1;
      const bullets = form.querySelectorAll('.stepper-bullet, [data-step-bullet]');
      bullets.forEach((b, idx) => {
        if (idx < stepIndex) {
          b.classList.add('bg-[#F59E0B]', 'text-slate-950');
          b.classList.remove('bg-slate-800', 'text-slate-400');
        }
      });
    }
  }
};

// 3. RETOUR À L'ÉTAPE PRÉCÉDENTE
window.goToPrevStep = function(btn) {
  const currentStep = btn.closest('.form-step');
  if (!currentStep) return;

  const prevStep = currentStep.previousElementSibling;
  if (prevStep && prevStep.classList.contains('form-step')) {
    currentStep.classList.add('hidden');
    currentStep.style.display = 'none';
    prevStep.classList.remove('hidden');
    prevStep.style.display = 'block';
  }
};
</script>
</body>`;
html = html.replace(scriptRegex, newScript);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Update complete');
