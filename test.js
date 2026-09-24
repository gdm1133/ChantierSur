
        document.addEventListener('DOMContentLoaded', () => {
            const menuToggle = document.getElementById('mobile-menu-toggle');
            const menuDrawer = document.getElementById('mobile-menu-drawer');
            const burgerIcon = document.getElementById('burger-icon');
            const closeIcon = document.getElementById('close-icon');

            if (menuToggle && menuDrawer) {
              menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = menuDrawer.classList.toggle('hidden');
                burgerIcon.classList.toggle('hidden', !isHidden);
                closeIcon.classList.toggle('hidden', isHidden);
              });

              // Fermer le menu lors d'un clic sur un lien
              document.querySelectorAll('.mobile-nav-link').forEach(link => {
                link.addEventListener('click', () => {
                  menuDrawer.classList.add('hidden');
                  burgerIcon.classList.remove('hidden');
                  closeIcon.classList.add('hidden');
                });
              });

              // Fermer lors d'un clic à l'extérieur
              document.addEventListener('click', (e) => {
                if (!menuDrawer.contains(e.target) && !menuToggle.contains(e.target) && !menuDrawer.classList.contains('hidden')) {
                  menuDrawer.classList.add('hidden');
                  burgerIcon.classList.remove('hidden');
                  closeIcon.classList.add('hidden');
                }
              });
            }
        });
    

    window.handleParcelConfigChange = function(val) {
      const f2Container = document.getElementById('facade-2-container');
      if (f2Container) {
        if (val === 'angle' || val === 'traversante') {
          f2Container.classList.remove('hidden');
        } else {
          f2Container.classList.add('hidden');
        }
      }
    };

    // TAUX DE CONVERSION OFFICIELS (Valeurs par défaut, mises à jour via API)
    let CONVERSION_RATES = {
      XOF: 1,
      EUR: 655.957, // Le FCFA est arrimé à l'Euro avec un taux fixe
      USD: 600.0,
      CAD: 440.0
    };

    // Actualisation avec les taux du jour
    async function fetchLiveRates() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/XOF');
        const data = await res.json();
        if (data && data.rates) {
          if (data.rates.USD) CONVERSION_RATES.USD = 1 / data.rates.USD;
          if (data.rates.CAD) CONVERSION_RATES.CAD = 1 / data.rates.CAD;
          window.updateAllPrices(); // Rafraîchit l'affichage avec les taux du jour
        }
      } catch (err) {
        console.error("Impossible de récupérer les taux de change du jour :", err);
      }
    }
    
    // Lancement de l'actualisation au démarrage
    fetchLiveRates();

        // GRILLE TARIFAIRE "EXÉCUTIVE" CHANTIERSUR (Positionnement Bureau d'Études Premium)
        const PRICING_RULES = {
      1: { base: 149000, perLevelAbove1: 25000 }, // Esquisse
      2: { base: 199000, perLevelAbove1: 30000 }, // BQE Gros Œuvre
      3: { base: 249000, perLevelAbove1: 40000 }, // Audit Devis
      4: { base: 99000, perLevelAbove1: 15000 }   // Finitions
    };

    window.calculateServicePrice = function(paneId) {
      const rule = PRICING_RULES[paneId];
      if (!rule) return 199000;
      const pane = document.getElementById('pane-' + paneId);
      if (!pane) return rule.base;
      const fd = new FormData(pane);
      const levels = parseInt(fd.get('exact_levels') || '0', 10);
      const extraLevels = Math.max(0, levels);
      return rule.base + (extraLevels * rule.perLevelAbove1);
    };

    // MISE À JOUR DE L'AFFICHAGE DES PRIX ET CONVERSIONS
    window.updateAllPrices = function() {
      const currencySelect = document.getElementById('currency-select');
      const activeCurrency = currencySelect ? currencySelect.value : 'XOF';
      const rate = CONVERSION_RATES[activeCurrency] || 1;

      for (let i = 1; i <= 4; i++) {
        const priceXOF = window.calculateServicePrice(i);
        const priceValEl = document.getElementById('price-val-' + i);
        const priceConvEl = document.getElementById('price-converted-' + i);

        if (priceValEl) {
          priceValEl.textContent = priceXOF.toLocaleString('fr-FR') + ' FCFA';
        }

        if (priceConvEl) {
          if (activeCurrency === 'XOF') {
            const eurEquiv = (priceXOF / CONVERSION_RATES.EUR).toFixed(2);
            priceConvEl.textContent = `(≈ ${eurEquiv} €)`;
          } else {
            const converted = (priceXOF / rate).toFixed(2);
            const symbols = { EUR: '€', USD: '$US', CAD: '$ CAD' };
            priceConvEl.textContent = `(≈ ${converted} ${symbols[activeCurrency]})`;
          }
        }
      }
    };

    // APPEL AU CHARGEMENT INITIAL
    document.addEventListener('DOMContentLoaded', window.updateAllPrices);

    // 1. BASCULE DES ONGLETS
    window.switchTab = function(tabIndex) {
      for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById('tab-btn-' + i);
        const pane = document.getElementById('pane-' + i);

        if (btn) {
          const badge = btn.querySelector('span');
          if (i === tabIndex) {
            btn.className = 'tab-card flex-none w-[85vw] sm:w-auto snap-center text-left p-5 rounded-2xl bg-white border-2 border-[#0B1325] ring-2 ring-[#0B1325]/15 shadow-xl focus:outline-none cursor-pointer';
            if (badge) badge.className = 'text-xs font-black uppercase tracking-wider text-amber-800';
          } else {
            btn.className = 'tab-card flex-none w-[85vw] sm:w-auto snap-center text-left p-5 rounded-2xl bg-white/70 border-2 border-slate-200 hover:border-slate-300 shadow-sm focus:outline-none cursor-pointer';
            if (badge) badge.className = 'text-xs font-bold uppercase tracking-wider text-slate-700';
          }
        }

        if (pane) {
          if (i === tabIndex) {
            pane.classList.remove('hidden');
          } else {
            pane.classList.add('hidden');
          }
        }
      }
    };

    // 2. NAVIGATION DANS LES ÉTAPES (SUIVANT / RETOUR)
    window.goToStep = function(paneId, targetStep) {
      const pane = document.getElementById('pane-' + paneId);
      if (!pane) return;

      const activeStep = pane.querySelector('.step-container:not(.hidden)');
      if (activeStep) {
        let currentStepNum = 1;
        for (let i = 1; i <= 6; i++) {
          if (activeStep.classList.contains('step-' + i)) {
            currentStepNum = i;
            break;
          }
        }

        if (targetStep > currentStepNum) {
          // Hook for Audit Step 2 -> 3 (Sanitize lines)
          if (paneId === 3 && currentStepNum === 2) {
             const lines = activeStep.querySelectorAll('.devis-line-item');
             lines.forEach(line => {
                const des = (line.querySelector('.dl-designation').value || '').trim();
                const qte = parseFloat(line.querySelector('.dl-qty').value) || 0;
                const total = parseFloat(line.querySelector('.dl-total').value) || 0;
                // Supprimer les lignes vides
                if (!des && qte === 0 && total === 0) {
                    line.remove();
                }
             });
             if(window.updateDevisTotal) window.updateDevisTotal();
          }

          // Hook for Audit Step 4 -> 5 (Update Recapitulative Table before payment)
          if (paneId === 3 && currentStepNum === 3 && targetStep === 4) {
             if(window.populateAuditRecap) window.populateAuditRecap();
          }

          const fields = activeStep.querySelectorAll('input, select, textarea');
          let hasError = false;
          for (let field of fields) {
            // Prevent silent validation failure on hidden fields
            if (field.offsetParent === null || field.type === 'hidden' || field.closest('.hidden')) continue;
            
            if (!field.checkValidity()) {
              field.reportValidity();
              hasError = true;
              break;
            }
          }
          if (hasError) return;
        }
      }

      pane.querySelectorAll('.step-container').forEach(step => step.classList.add('hidden'));

      const nextStepEl = pane.querySelector('.step-' + targetStep);
      if (nextStepEl) nextStepEl.classList.remove('hidden');

      // Update bullets
      for (let i = 1; i <= 6; i++) {
        const bullet = pane.querySelector('.bullet-' + i);
        if (bullet) {
          if (i === targetStep) {
            bullet.className = 'bullet-' + i + ' w-8 h-8 rounded-full bg-[#0B1325] text-white font-bold flex items-center justify-center text-sm shadow';
          } else if (i < targetStep) {
            bullet.className = 'bullet-' + i + ' w-8 h-8 rounded-full bg-[#0B1325] text-white font-bold flex items-center justify-center text-sm shadow opacity-50';
          } else {
            bullet.className = 'bullet-' + i + ' w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-bold flex items-center justify-center text-sm';
          }
        }
      }

      window.scrollTo({ top: pane.offsetTop - 100, behavior: 'smooth' });
    };

    // 3. PAIEMENT PAYTECH & SAUVEGARDE PROJET
    window.initiatePayment = async function(paneId, serviceKey) {
      const pane = document.getElementById('pane-' + paneId);
      if (!pane) return;

      const fd = new FormData(pane);
      const clientName = (fd.get('client_name') || '').trim();
      const clientEmail = (fd.get('client_email') || '').trim();
      const rawPrefix = (fd.get('phone_prefix') || '+221').trim();
      let rawPhone = (fd.get('client_phone') || '').toString().trim();

      if (!clientName || !clientEmail || !rawPhone) {
        alert("Veuillez renseigner votre nom, votre adresse email et votre numéro de téléphone.");
        return;
      }

      // --- CONTRÔLE INDICATIF URBANISME (DÉCRET N° 2025-1194 & LOI N° 2023-20) ---
      if (serviceKey === 'esquisse') {
        const nivCheck = parseInt(fd.get('exact_levels'), 10) || 1;
        const surfCheck = parseFloat(fd.get('surface')) || 200;
        const usageCheck = fd.get('building_usage') || 'unifamilial';
        const streetWidthCheck = parseFloat(fd.get('street_width')) || 12;
        const reculCheck = streetWidthCheck >= 15 ? 4.0 : 3.0;
        const sdpEstimeeCheck = Math.round(surfCheck * 0.65 * (nivCheck + 1) * 0.90);
        const hauteurFaitageCheck = (nivCheck + 1) * 3.10 + 1.20;

        // Configuration paramétrable du prospect (art. R.448, décret n° 2025-1194)
        const GABARIT_CONFIG = {
          prospectCoef: 1.5, // H = 1,5L (emprise de la voie + retrait)
          tolerancePct: 10,   // Tolérance indicative (+10%) avant affichage informatif
          source: "art. R.448, décret n° 2025-1194"
        };

        const empriseVoie = streetWidthCheck;
        const retraitVoie = reculCheck;
        const hMaxCheck = GABARIT_CONFIG.prospectCoef * (empriseVoie + retraitVoie);

        let incoherences = [];

        if (usageCheck === 'unifamilial' && (sdpEstimeeCheck > 500 || nivCheck > 2)) {
          incoherences.push({
            type: 'usage',
            title: 'Destination du bâtiment',
            text: 'La destination « Résidentiel Unifamilial » semble atypique pour un bâtiment de R+' + nivCheck +
              ' (≈ ' + sdpEstimeeCheck.toLocaleString('fr-FR') + ' m² de SDP estimée). Vérifiez la destination réelle (habitat collectif, mixte ou bureaux).'
          });
        }

        if (hauteurFaitageCheck > hMaxCheck * (1 + GABARIT_CONFIG.tolerancePct / 100)) {
          const depM = (hauteurFaitageCheck - hMaxCheck).toFixed(1).replace('.', ',');
          const depPct = Math.round(((hauteurFaitageCheck - hMaxCheck) / hMaxCheck) * 100);
          incoherences.push({
            type: 'gabarit',
            title: 'Prospect volumétrique sur voie publique',
            hauteurProjet: hauteurFaitageCheck.toFixed(1).replace('.', ',') + ' m (R+' + nivCheck + ')',
            seuilRef: hMaxCheck.toFixed(1).replace('.', ',') + ' m',
            formuleCalcul: '1,5 × (' + empriseVoie.toFixed(1).replace('.', ',') + ' m voie + ' + retraitVoie.toFixed(1).replace('.', ',') + ' m retrait) = ' + hMaxCheck.toFixed(1).replace('.', ',') + ' m',
            depassement: '+' + depM + ' m (' + depPct + ' %)',
            legalNotice: 'Seuil de référence : H ≤ 1,5 × (voie + retrait) — ' + GABARIT_CONFIG.source + '. Valeur indicative calculée avec les données saisies ; le document d’urbanisme de la zone (SAUDAK / PCU / PAZ) peut fixer une autre valeur — à confirmer auprès de la Direction de l’Urbanisme.'
          });
        }

        if (incoherences.length > 0) {
          const continuer = await new Promise((resolve) => {
            let existing = document.getElementById('cs-coherence-modal');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'cs-coherence-modal';
            overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-opacity duration-200';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'coherence-modal-title');

            const cardsHtml = incoherences.map((item) => {
              if (item.type === 'gabarit') {
                return `
                  <div class="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
                    <div class="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>${item.title}</span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span class="text-slate-400">Hauteur estimée du projet :</span>
                        <span class="font-bold text-slate-100 ml-1">${item.hauteurProjet}</span>
                      </div>
                      <div>
                        <span class="text-slate-400">Seuil indicatif de référence :</span>
                        <span class="font-bold text-amber-300 ml-1">${item.seuilRef}</span>
                      </div>
                      <div class="sm:col-span-2">
                        <span class="text-slate-400">Base du calcul affichée :</span>
                        <span class="font-mono text-slate-200 ml-1">${item.formuleCalcul}</span>
                      </div>
                      <div class="sm:col-span-2">
                        <span class="text-slate-400">Écart constaté :</span>
                        <span class="font-semibold text-amber-400 ml-1">${item.depassement}</span>
                      </div>
                    </div>
                    <p class="text-[11px] leading-relaxed text-amber-200/90 bg-amber-950/30 border border-amber-500/20 p-2.5 rounded-lg">
                      ${item.legalNotice}
                    </p>
                  </div>
                `;
              } else {
                return `
                  <div class="bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 space-y-2">
                    <div class="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                      <svg class="w-4 h-4 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                      </svg>
                      <span>${item.title}</span>
                    </div>
                    <p class="text-xs text-slate-300 leading-relaxed">${item.text}</p>
                  </div>
                `;
              }
            }).join('');

            overlay.innerHTML = `
              <div class="relative w-full max-w-lg bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
                <div class="p-5 border-b border-slate-800 flex items-start gap-3 bg-gradient-to-r from-slate-900 to-[#0F172A]">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <h3 id="coherence-modal-title" class="text-base font-bold text-white leading-snug">
                      Points d'attention — Analyse indicative d'urbanisme
                    </h3>
                    <p class="text-xs text-slate-400 mt-0.5">
                      Vérification indicative basée sur le décret n° 2025-1194 (non bloquante)
                    </p>
                  </div>
                </div>

                <div class="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                  ${cardsHtml}
                </div>

                <div class="p-4 bg-slate-900/60 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                  <button type="button" id="btn-modal-cancel" class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors">
                    Modifier les données
                  </button>
                  <button type="button" id="btn-modal-continue" class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all">
                    Continuer vers le paiement
                  </button>
                </div>
              </div>
            `;

            function cleanup(result) {
              window.removeEventListener('keydown', handleKey);
              overlay.classList.add('opacity-0');
              setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
              }, 150);
              resolve(result);
            }

            function handleKey(e) {
              if (e.key === 'Escape') cleanup(false);
            }

            overlay.querySelector('#btn-modal-cancel').addEventListener('click', () => cleanup(false));
            overlay.querySelector('#btn-modal-continue').addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) cleanup(false);
            });
            window.addEventListener('keydown', handleKey);

            document.body.appendChild(overlay);
          });

          if (!continuer) return;
        }
      }
      // --- FIN CONTRÔLE INDICATIF URBANISME ---


      // Nettoyage téléphonique universel anti-dédoublement
      const prefixDigits = rawPrefix.replace(/\D/g, '');
      rawPhone = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
      if (prefixDigits && rawPhone.startsWith(prefixDigits)) {
        rawPhone = rawPhone.substring(prefixDigits.length).replace(/^0+/, '');
      }

      // Calcul dynamique du montant selon le niveau
      const exactAmount = window.calculateServicePrice ? window.calculateServicePrice(paneId) : 25000;

      // Données réelles complètes du projet
      const projectData = {
        service: serviceKey,
        surface: parseFloat(fd.get('surface')) || 250,
        exact_levels: parseInt(fd.get('exact_levels'), 10) || 1,
        slab_type: fd.get('slab_type') || 'hourdis16',
        has_basement: fd.get('has_basement') || 'non',
        concrete_method: fd.get('concrete_method') || 'betonniere',
        quoted_amount: parseFloat(fd.get('quoted_amount')) || 45000000,
        contract_scope: fd.get('contract_scope') || 'tce_clef_en_main',
        contractor_type: fd.get('contractor_type') || 'tacheron',
        advance_requested: parseInt(fd.get('advance_requested'), 10) || 30,
        has_guarantee: fd.get('has_guarantee') || 'aucune',
        ceiling_height: parseFloat(fd.get('ceiling_height')) || 3.0,
        project_location: fd.get('project_location') || '',
        land_status: fd.get('land_status') || '',
        lot_number: (fd.get('lot_number') || '').trim() || 'Non spécifié',
        // Spécifiques Finitions
        water_rooms: parseInt(fd.get('water_rooms'), 10) || 4,
        delai_reserves: parseInt(fd.get('delai_reserves'), 10) || 15,
        tile_type: fd.get('tile_type') || 'gres_cerame_60',
        joinery_type: fd.get('joinery_type') || 'alu_vitre',
        terrace_usage: fd.get('terrace_usage') || 'accessible_carrelee',
        ac_system: fd.get('ac_system') || 'split_individuel',
        standing: fd.get('standing') || 'moyen',
        building_usage: fd.get('building_usage') || 'unifamilial',
        parcel_config: fd.get('parcel_config') || 'bande',
        facade_width: parseFloat(fd.get('facade_width')) || 10,
        facade_width_2: parseFloat(fd.get('facade_width_2')) || 0,
        street_width: parseFloat(fd.get('street_width')) || 12,
        sanitation_type: fd.get('sanitation_type') || 'autonome',
        neighbor_status: fd.get('neighbor_status') || 'vide',
        energy_backup: fd.get('energy_backup') || 'standard',
        client_name: clientName,
        client_email: clientEmail,
        phone_prefix: rawPrefix,
        client_phone: rawPhone,
        exact_amount: exactAmount,
        timestamp: Date.now(),
        // Nouveaux champs pour Audit
        devis_number: (fd.get('devis_number') || '').trim(),
        devis_date: (fd.get('devis_date') || '').trim(),
        devis_company: (fd.get('devis_company') || '').trim(),
        devis_object: (fd.get('devis_object') || '').trim(),
        devis_total_ht: parseFloat(fd.get('devis_total_ht')) || 0,
        devis_acompte: parseInt(fd.get('devis_acompte'), 10) || 30,
        devis_lines: window.getDevisLines ? window.getDevisLines() : []
      };

      // 1. Sauvegarde immédiate dans les stockages du navigateur
      try {
        localStorage.setItem('cs_project_data', JSON.stringify(projectData));
        sessionStorage.setItem('cs_project_data', JSON.stringify(projectData));
      } catch(e) {}

      // Mise à jour visuelle du bouton
      const btn = document.getElementById('pay-btn-' + paneId);
      const originalText = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Édition du dossier en cours...';
      }

      // 2. Appel PayTech ou bascule directe
      try {
        const response = await fetch('/.netlify/functions/paytech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: `ChantierSur - Pack ${serviceKey.toUpperCase()}`,
            item_price: exactAmount, // Montant dynamique transmis (ex: 199000)
            currency: 'XOF',
            service: serviceKey,
            ref_command: 'CS-' + Date.now(),
            client_name: clientName,
            client_email: clientEmail,
            client_phone: `${prefixDigits}${rawPhone}`
          })
        });

        const data = await response.json();
        if (data && data.redirect_url) {
          window.location.href = data.redirect_url;
          return;
        }
      } catch (err) {
        console.warn("PayTech indisponible, bascule directe vers le livrable...");
      }

      // Redirection immédiate avec les données réelles sauvegardées
      window.location.href = window.location.origin + window.location.pathname + `?payment=success&service=${serviceKey}`;
    };

    // 4. MENU BURGER MOBILE
    window.toggleMobileMenu = function() {
      const drawer = document.getElementById('mobile-drawer');
      if (drawer) drawer.classList.toggle('hidden');
    };

    // 5. TEST DIRECT PDF PAR URL (?payment=success&service=...)
    window.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment') === 'success') {
        const s = urlParams.get('service') || 'esquisse';

        // 1. Recherche prioritaire des vraies données saisies par le client
        let realData = null;
        try {
          const saved = sessionStorage.getItem('cs_project_data') || localStorage.getItem('cs_project_data');
          if (saved) {
            realData = JSON.parse(saved);
          }
        } catch(e) {}

        // 2. Si aucune saisie préalable n'est trouvée (test direct de l'URL sans formulaire), utiliser le modèle de test
        const finalData = (realData && realData.client_name) ? realData : {
          service: s,
          surface: 240,
          facade_width: 10,
          facade_width_2: 0,
          street_width: 12,
          exact_levels: 2,
          client_name: 'Moussa Ndiaye (Dossier Test)',
          client_email: 'client@chantiersur.com',
          client_phone: '771234567',
          phone_prefix: '+221',
          project_location: 'Dakar - Almadies / Ngor / Ouakam',
          land_status: 'Titre Foncier (TF)',
          lot_number: 'Lot N° 45',
          parcel_config: 'bande',
          building_usage: 'unifamilial',
          standing: 'moyen',
          sanitation_type: 'autonome',
          neighbor_status: 'vide'
        };

        finalData.service = s;

        // Création d'une modale visible à l'écran
        const modal = document.createElement('div');
        modal.id = 'pdf-success-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4';
        modal.innerHTML = `
          <div class="bg-slate-900 border-2 border-[#F59E0B] p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-5">
            <div class="w-16 h-16 bg-amber-500/20 text-[#F59E0B] rounded-full flex items-center justify-center mx-auto text-3xl">📄</div>
            <h3 class="text-xl font-bold text-white">Paiement Validé & Livrable Prêt</h3>
            <p class="text-sm text-slate-300">Votre dossier officiel pour la formule <strong class="text-[#F59E0B] uppercase">${s}</strong> est prêt.</p>
            <button id="btn-force-download" class="w-full py-4 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg transition-all text-base cursor-pointer">
              📥 Télécharger mon Rapport PDF
            </button>
            <p id="pdf-status" class="text-xs text-slate-700 font-medium">Le téléchargement démarre également en arrière-plan...</p>
          </div>
        `;
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
        }

        document.getElementById('btn-force-download').addEventListener('click', triggerPDF);

        // Modal visuelle et téléchargement
        setTimeout(triggerPDF, 800);
      }
    });
    // 6. GESTION DES LIGNES DU DEVIS (MODULE AUDIT)
    let devisLineCount = 0;
    
  window.addDevisLine = function() {
    const container = document.getElementById('devis-lines-container');
    if (!container) return;
    window.devisLineCount = (window.devisLineCount || 0) + 1;
    const idx = window.devisLineCount;

    const div = document.createElement('div');
    div.className = 'devis-line-item bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 relative';
    div.innerHTML = `<div class="absolute -top-3 -left-3 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm"> ${idx} </div>
      
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
      </button>`;
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

    window.getDevisLines = function() {
    const lines = document.querySelectorAll('.devis-line-item');
    const result = [];
    lines.forEach(line => {
      const lot = line.querySelector('.dl-lot').value;
      const des = line.querySelector('.dl-designation').value || '';
      const nat = line.querySelector('.dl-nature').value;
      const u = line.querySelector('.dl-unit').value;
      const q = parseFloat(line.querySelector('.dl-qty').value) || 0;
      const pu = parseFloat(line.querySelector('.dl-pu').value) || 0;
      const total = parseFloat(line.querySelector('.dl-total').value) || 0;
      result.push({ lot, des, nat, u, q, pu, total });
    });
    return result;
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

  

