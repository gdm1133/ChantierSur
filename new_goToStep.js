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
