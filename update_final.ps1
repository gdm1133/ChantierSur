$files = Get-ChildItem -Filter *.html

$new_logo = @"
<!-- LOGO OFFICIEL CHANTIERSUR.COM INLINE SVG -->
<a href="index.html" class="flex items-center space-x-2.5 group focus:outline-none">
  <div class="w-9 h-9 bg-[#0B1325] rounded-lg flex items-center justify-center p-1.5 border border-slate-700/80 shadow-sm shrink-0 transition-transform group-hover:scale-105">
    <svg viewBox="0 0 24 24" fill="none" class="w-full h-full text-[#F59E0B]" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  </div>
  <div class="flex flex-col">
    <span class="text-lg font-black tracking-tight text-[#0B1325] leading-none">
      Chantier<span class="text-[#F59E0B]">Sur.com</span>
    </span>
    <span class="text-[9px] font-bold tracking-wider text-slate-500 uppercase mt-0.5">Bureau d'Études Numérique</span>
  </div>
</a>
"@

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    
    # Section 2: Logo Vectoriel Harmonisé (replace old a href="index.html" block in header)
    $content = $content -replace '(?s)<a href="index\.html" class="flex items-center space-x-2\.5">.*?</a>', $new_logo

    [System.IO.File]::WriteAllText($f.FullName, $content, [System.Text.Encoding]::UTF8)
}

# Now for index.html specific logic
$index_file = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\index.html"
$content = [System.IO.File]::ReadAllText($index_file, [System.Text.Encoding]::UTF8)

# Section 3: Reactivation des 4 cartes
$content = $content -replace 'data-target="tab-esquisse"', 'data-service-tab="esquisse"'
$content = $content -replace 'data-target="tab-express"', 'data-service-tab="express"'
$content = $content -replace 'data-target="tab-audit"', 'data-service-tab="audit"'
$content = $content -replace 'data-target="tab-finitions"', 'data-service-tab="finitions"'

$content = $content -replace 'id="tab-esquisse"', 'id="tab-esquisse" data-service-content="esquisse"'
$content = $content -replace 'id="tab-express"', 'id="tab-express" data-service-content="express"'
$content = $content -replace 'id="tab-audit"', 'id="tab-audit" data-service-content="audit"'
$content = $content -replace 'id="tab-finitions"', 'id="tab-finitions" data-service-content="finitions"'

$old_tabs_js = '(?s)// Tabs logic.*?btn\.classList\.remove\(''border-transparent'', ''bg-slate-800/60''\);.*?updatePrices\(\);\s*}\);\s*}\);'
$new_tabs_js = @"
        // Tabs logic
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => {
                    b.classList.remove('active', 'ring-2', 'ring-[#F59E0B]', 'border-[#F59E0B]', 'bg-slate-800', 'border-amber-500', 'bg-slate-800/90');
                    b.classList.add('border-slate-800', 'bg-slate-900/60');
                });
                btn.classList.add('active', 'ring-2', 'ring-[#F59E0B]', 'border-[#F59E0B]', 'bg-slate-800');
                btn.classList.remove('border-slate-800', 'bg-slate-900/60', 'border-transparent');
                
                tabContents.forEach(c => c.classList.add('hidden'));
                const targetService = btn.getAttribute('data-service-tab');
                const targetContent = document.querySelector(`[data-service-content="` + targetService + `"]`);
                if(targetContent) targetContent.classList.remove('hidden');
                
                updatePrices();
            });
        });
"@
$content = $content -replace $old_tabs_js, $new_tabs_js

# Section 4: Stepper logic
$content = $content -replace 'class="step-content step-1 block space-y-4"', 'class="form-step block space-y-4" data-step="1"'
$content = $content -replace 'class="step-content step-2 hidden space-y-4"', 'class="form-step hidden space-y-4" data-step="2"'
$content = $content -replace 'class="step-content step-3 hidden space-y-4"', 'class="form-step hidden space-y-4" data-step="3"'

$content = $content -replace 'step-indicator', 'stepper-bullet'
$content = $content -replace 'data-step="1"', 'data-bullet-step="1"'
$content = $content -replace 'data-step="2"', 'data-bullet-step="2"'
$content = $content -replace 'data-step="3"', 'data-bullet-step="3"'

# Replace onclick with classes
$content = $content -replace 'onclick="nextStep[^"]*"', 'class="btn-next-step px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition shadow-sm"'
$content = $content -replace 'onclick="prevStep[^"]*"', 'class="btn-prev-step px-6 py-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition"'
# Clean up duplicate classes if they existed alongside onclick
$content = $content -replace 'class="btn-next-step[^"]*"\s+class="[^"]*"', 'class="btn-next-step px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition shadow-sm"'
$content = $content -replace 'class="btn-prev-step[^"]*"\s+class="[^"]*"', 'class="btn-prev-step px-6 py-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition"'


# Remove old nextStep/prevStep functions
$content = $content -replace '(?s)function nextStep\(.*?\}', ''
$content = $content -replace '(?s)function prevStep\(.*?\}', ''

# Inject universal stepper logic
$stepper_js = @"
        // GESTIONNAIRE UNIVERSEL DES BOUTONS SUIVANT & PRÉCÉDENT
        document.querySelectorAll('.btn-next-step').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentStepContainer = this.closest('.form-step');
            if (!currentStepContainer) return;

            // 1. Validation stricte des champs de l'étape courante
            const inputs = currentStepContainer.querySelectorAll('input, select, textarea');
            let isValid = true;
            inputs.forEach(input => {
              if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
              }
            });
            if (!isValid) return;

            // 2. Passage à l'étape suivante
            const nextStepContainer = currentStepContainer.nextElementSibling;
            if (nextStepContainer && nextStepContainer.classList.contains('form-step')) {
              currentStepContainer.classList.add('hidden');
              nextStepContainer.classList.remove('hidden');

              // Mise à jour visuelle du stepper (puces 1, 2, 3)
              const stepNumber = nextStepContainer.getAttribute('data-step') || '2';
              updateStepperIndicators(currentStepContainer.closest('form'), stepNumber);
            }
          });
        });

        document.querySelectorAll('.btn-prev-step').forEach(btn => {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            const currentStepContainer = this.closest('.form-step');
            if (!currentStepContainer) return;

            const prevStepContainer = currentStepContainer.previousElementSibling;
            if (prevStepContainer && prevStepContainer.classList.contains('form-step')) {
              currentStepContainer.classList.add('hidden');
              prevStepContainer.classList.remove('hidden');

              const stepNumber = prevStepContainer.getAttribute('data-step') || '1';
              updateStepperIndicators(currentStepContainer.closest('form'), stepNumber);
            }
          });
        });

        function updateStepperIndicators(formElement, activeStep) {
          if (!formElement) return;
          const indicators = formElement.querySelectorAll('.stepper-bullet');
          indicators.forEach(bullet => {
            const step = bullet.getAttribute('data-bullet-step');
            if (step <= activeStep) {
              bullet.classList.add('bg-[#F59E0B]', 'text-slate-950', 'font-bold');
              bullet.classList.remove('bg-slate-800', 'text-slate-400');
            } else {
              bullet.classList.remove('bg-[#F59E0B]', 'text-slate-950');
              bullet.classList.add('bg-slate-800', 'text-slate-400');
            }
          });
        }
"@

# Section 5 & 6 logic
$paytech_js = @"
        // Section 5 & 6 Logic
        document.querySelectorAll('input[name="client_phone"]').forEach(input => {
          input.setAttribute('inputmode', 'numeric');
          input.setAttribute('pattern', '[0-9]{9}');
          input.setAttribute('maxlength', '9');
          input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
          });
        });

        const PRICING_TABLE = {
          esquisse: 35000,
          express: 25000,
          audit: 45000,
          finitions: 20000
        };

        document.querySelectorAll('form').forEach(form => {
          form.addEventListener('submit', async (e) => {
            e.preventDefault(); // EMPÊCHE LE RECHARGEMENT DE LA PAGE D'ACCUEIL

            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const fd = new FormData(form);
            const serviceKey = form.getAttribute('data-service') || 'express';
            const amount = PRICING_TABLE[serviceKey] || 25000;

            const locSelect = form.querySelector('[name="project_location"]');
            const selectedOption = locSelect ? locSelect.options[locSelect.selectedIndex] : null;
            const isAutoOcean = selectedOption ? selectedOption.getAttribute('data-salin') === 'true' : false;

            const projectData = {
              service: serviceKey,
              surface: parseFloat(fd.get('surface_dev') || fd.get('surface')) || 150,
              exact_levels: parseInt(fd.get('exact_levels'), 10) || 0,
              project_location: fd.get('project_location') || 'Dakar',
              parcel_config: fd.get('parcel_config') || 'standard',
              standing: fd.get('standing') || fd.get('finition_standing') || 'moyen',
              is_hivernage: Boolean(form.querySelector('[name="is_hivernage"]')?.checked),
              is_ocean: Boolean(form.querySelector('[name="is_ocean"]')?.checked || form.querySelector('[name="zone_cotiere"]')?.checked) || isAutoOcean,
              client_name: (fd.get('client_name') || '').trim() || 'Maître d’Ouvrage',
              client_email: (fd.get('client_email') || fd.get('customer_email') || '').trim() || 'client@chantiersur.com',
              phone_prefix: fd.get('phone_prefix') || '+221',
              client_phone: (fd.get('client_phone') || '').trim(),
              land_status: fd.get('land_status') || 'Titre Foncier (TF)',
              lot_number: (fd.get('lot_number') || '').trim(),
              timestamp: Date.now()
            };

            // Sauvegarde redondante pour le retour de transaction
            try {
              localStorage.setItem('cs_project_data', JSON.stringify(projectData));
              sessionStorage.setItem('cs_project_data', JSON.stringify(projectData));
            } catch (err) {
              window.__memStorage = projectData;
            }

            // Gestion de l'état visuel du bouton de validation
            const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('.submit-btn');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = `
                <span class="inline-flex items-center space-x-2">
                  <svg class="animate-spin h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Connexion PayTech (Wave / OM)...</span>
                </span>
              `;
            }

            try {
              const response = await fetch('/.netlify/functions/paytech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  item_name: `ChantierSur - Pack ${serviceKey.toUpperCase()}`,
                  item_price: amount,
                  currency: 'XOF',
                  ref_command: 'CS-' + Date.now(),
                  client_name: projectData.client_name,
                  client_email: projectData.client_email,
                  client_phone: projectData.client_phone
                })
              });

              const data = await response.json();

              if (data && data.redirect_url) {
                window.location.href = data.redirect_url;
              } else if (data && data.success === 1 && data.token) {
                window.location.href = `https://paytech.sn/payment/checkout/` + data.token;
              } else {
                alert("Erreur lors de l'initialisation du paiement PayTech. Vérifiez votre configuration.");
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = originalText;
                }
              }
            } catch (error) {
              console.error("Erreur PayTech:", error);
              alert("Impossible de joindre le serveur de paiement. Veuillez vérifier votre connexion.");
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
              }
            }
          });
        });

        // Écouteur de retour post-paiement réussi (?payment=success)
        window.addEventListener('DOMContentLoaded', () => {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('payment') === 'success') {
            const serviceRequested = urlParams.get('service') || 'express';

            let projectData = null;
            try {
              const saved = sessionStorage.getItem('cs_project_data') || localStorage.getItem('cs_project_data');
              if (saved) projectData = JSON.parse(saved);
            } catch (err) {}

            // Si aucune donnée en cache, charge un profil de démonstration complet
            if (!projectData) {
              projectData = {
                service: serviceRequested,
                surface: 260,
                exact_levels: 2,
                client_name: 'Germain Dieudonné Mané (Dossier Validé)',
                client_email: 'contact@chantiersur.com',
                phone_prefix: '+221',
                client_phone: '776543210',
                project_location: 'Almadies / Ngor / Ouakam (Sol Rocheux & Littoral)',
                land_status: 'Titre Foncier (TF)',
                lot_number: 'Parcelle 104 - Lot B',
                is_hivernage: true,
                is_ocean: true
              };
            } else {
              projectData.service = serviceRequested;
            }

            // Affichage d'un indicateur de génération temporaire
            const banner = document.createElement('div');
            banner.className = 'fixed top-4 right-4 z-50 bg-[#0B1325] text-white border border-[#F59E0B] p-4 rounded-xl shadow-2xl flex items-center space-x-3';
            banner.innerHTML = `<span class="animate-spin text-xl">⏳</span><div><p class="font-bold text-sm text-[#F59E0B]">Génération du Livrable Officiel</p><p class="text-xs text-slate-300">Votre document PDF se télécharge automatiquement...</p></div>`;
            document.body.appendChild(banner);

            setTimeout(() => {
              const generateFn = window.generateProjectPDF || window.generatePDF;
              if (typeof generateFn === 'function') {
                generateFn(projectData);
                setTimeout(() => banner.remove(), 4000);
              } else {
                banner.innerHTML = `<p class="text-xs text-red-400 font-bold">Erreur : pdf-generator.js introuvable ou non chargé.</p>`;
              }
            }, 1200);
          }
        });
"@

# Inject the new scripts before </script>
$content = $content -replace '(?s)// Forms submission logic.*?(?=\s*</script>\s*<!-- Mobile Sticky Bottom Bar)', "`n$stepper_js`n`n$paytech_js"

[System.IO.File]::WriteAllText($index_file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated index.html with Sections 2 to 6"
