$f = 'index.html'
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# 1. Update Tabs
$c = $c -replace '<button id="tab-btn-1" class="([^"]+)"', '<button id="tab-btn-1" class="$1 tab-card" onclick="switchTab(1)"'
$c = $c -replace '<button id="tab-btn-2" class="([^"]+)"', '<button id="tab-btn-2" class="$1 tab-card" onclick="switchTab(2)"'
$c = $c -replace '<button id="tab-btn-3" class="([^"]+)"', '<button id="tab-btn-3" class="$1 tab-card" onclick="switchTab(3)"'
$c = $c -replace '<button id="tab-btn-4" class="([^"]+)"', '<button id="tab-btn-4" class="$1 tab-card" onclick="switchTab(4)"'

# 2. Update Panes
$c = $c.Replace('id="service-pane-1"', 'id="pane-1"')
$c = $c.Replace('id="service-pane-2"', 'id="pane-2"')
$c = $c.Replace('id="service-pane-3"', 'id="pane-3"')
$c = $c.Replace('id="service-pane-4"', 'id="pane-4"')

# 3. Form Step and Buttons
$c = $c.Replace('class="step-container"', 'class="form-step"')
$c = $c.Replace('class="step-container ', 'class="form-step ')
$c = $c.Replace(' step-container"', ' form-step"')
$c = $c.Replace(' step-container ', ' form-step ')

$c = $c -replace '<button(?![^>]*onclick="nextStep\(this\)")[^>]*class="[^"]*btn-step-next[^"]*"[^>]*>Suivant.*?<\/button>', '<button type="button" class="btn-step-next px-6 py-2.5 bg-[#F59E0B] text-slate-950 font-bold rounded-lg hover:bg-amber-400" onclick="nextStep(this)">Suivant</button>'
$c = $c -replace '<button(?![^>]*onclick="prevStep\(this\)")[^>]*class="[^"]*btn-step-prev[^"]*"[^>]*>Précédent.*?<\/button>', '<button type="button" class="btn-step-prev px-6 py-2.5 bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-600 transition" onclick="prevStep(this)">Précédent</button>'

# 4. Remove old script logic for tabs and stepper, keep mobile menu and phone formatting
$cleanScript = @"
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu logic
  document.addEventListener('click', function(e) {
    const burgerBtn = e.target.closest('#mobile-menu-toggle');
    if (burgerBtn) {
      e.preventDefault();
      const drawer = document.getElementById('mobile-menu-drawer');
      if (drawer) drawer.classList.toggle('hidden');
      return;
    }
    if (e.target.closest('.mobile-nav-link')) {
      const drawer = document.getElementById('mobile-menu-drawer');
      if (drawer) drawer.classList.add('hidden');
    }
  });

  // Phone input logic
  document.querySelectorAll('input[name="client_phone"]').forEach(input => {
    input.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  });
});
</script>
"@

$c = $c -replace '(?s)<script>.*?// A\. GESTION DES 4 ONGLETS SERVICES.*?</script>', $cleanScript

# 5. Insert new script before </body>
$newScript = @"
<script>
// BASCULE DES 4 ONGLETS
window.switchTab = function(tabIndex) {
  // 1. Mise à jour de l'état visuel des 4 cartes
  const cards = document.querySelectorAll('.tab-card');
  cards.forEach((card, idx) => {
    if (idx === (tabIndex - 1)) {
      card.classList.add('ring-2', 'ring-[#F59E0B]', 'border-[#F59E0B]', 'bg-slate-800');
      card.classList.remove('border-slate-800', 'bg-slate-900/60');
    } else {
      card.classList.remove('ring-2', 'ring-[#F59E0B]', 'border-[#F59E0B]', 'bg-slate-800');
      card.classList.add('border-slate-800', 'bg-slate-900/60');
    }
  });

  // 2. Affichage du formulaire sélectionné
  for (let i = 1; i <= 4; i++) {
    const pane = document.getElementById('pane-' + i);
    if (pane) {
      if (i === tabIndex) {
        pane.classList.remove('hidden');
      } else {
        pane.classList.add('hidden');
      }
    }
  }
};

// PROGRESSION VERS L'ÉTAPE SUIVANTE
window.nextStep = function(btn) {
  const currentStep = btn.closest('.form-step');
  if (!currentStep) return;

  // Validation uniquement des champs visibles dans l'étape active
  const inputs = currentStep.querySelectorAll('input, select, textarea');
  for (let input of inputs) {
    if (!input.checkValidity()) {
      input.reportValidity();
      return; // Interrompt si un champ obligatoire n'est pas rempli
    }
  }

  // Affichage de l'étape suivante
  const nextStep = currentStep.nextElementSibling;
  if (nextStep && nextStep.classList.contains('form-step')) {
    currentStep.classList.add('hidden');
    nextStep.classList.remove('hidden');
  }
};

// RETOUR À L'ÉTAPE PRÉCÉDENTE
window.prevStep = function(btn) {
  const currentStep = btn.closest('.form-step');
  if (!currentStep) return;

  const prevStep = currentStep.previousElementSibling;
  if (prevStep && prevStep.classList.contains('form-step')) {
    currentStep.classList.add('hidden');
    prevStep.classList.remove('hidden');
  }
};
</script>
</body>
"@

$c = $c -replace '</body>', $newScript

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Updated with inline handlers"
