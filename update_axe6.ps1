$file = "c:\Users\germa\.gemini\antigravity-ide\scratch\ChantierSur\index.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Add data-service attribute to the forms
$content = $content -replace '<form id="form-esquisse" class="stepper-form space-y-4 relative">', '<form id="form-esquisse" data-service="esquisse" class="stepper-form space-y-4 relative">'
$content = $content -replace '<form id="form-express" class="stepper-form space-y-4 relative">', '<form id="form-express" data-service="express" class="stepper-form space-y-4 relative">'
$content = $content -replace '<form id="form-audit" class="stepper-form space-y-4 relative">', '<form id="form-audit" data-service="audit" class="stepper-form space-y-4 relative">'
$content = $content -replace '<form id="form-finitions" class="stepper-form space-y-4 relative">', '<form id="form-finitions" data-service="finitions" class="stepper-form space-y-4 relative">'

# New JS block
$new_js = @"
        // Forms submission logic
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
                        <span class="inline-flex items-center justify-center space-x-2">
                            <svg class="animate-spin h-4 w-4 text-slate-900" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Connexion PayTech...</span>
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
                let savedData = null;
                try {
                    const raw = sessionStorage.getItem('cs_project_data') || localStorage.getItem('cs_project_data');
                    if (raw) savedData = JSON.parse(raw);
                } catch (e) {
                    savedData = window.__memStorage;
                }

                if (savedData && typeof window.generateProjectPDF === 'function') {
                    window.generateProjectPDF(savedData);
                }
            }
        });
"@

$content = $content -replace '(?s)// Forms submission logic.*?document\.getElementById\(''form-finitions''\)\.addEventListener\(''submit'', e => handleSubmit\(e, ''finitions''\)\);', $new_js

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Updated JS logic and added data-service attributes in index.html"
