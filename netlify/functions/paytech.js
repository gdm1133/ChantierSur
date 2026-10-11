// CANARY-UNIQUE-20261011
// netlify/functions/paytech.js
const { createDownloadToken } = require('./token-security');

function getGridPrice(service, surface) {
  const s = parseFloat(surface) || 150;
  if (service === 'audit') {
    if (s <= 150) return 249000;
    if (s <= 300) return 289000;
    if (s <= 600) return 329000;
    if (s <= 1000) return 369000;
    if (s <= 2000) return 409000;
    return 'SUR_DEVIS';
  } else {
    // esquisse
    if (s <= 150) return 149000;
    if (s <= 300) return 174000;
    if (s <= 600) return 199000;
    if (s <= 1000) return 224000;
    if (s <= 2000) return 249000;
    return 'SUR_DEVIS';
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const service = data.service === 'audit' ? 'audit' : 'esquisse';
    const surface = parseFloat(data.surface) || 150;
    const gridPrice = getGridPrice(service, surface);

    if (gridPrice === 'SUR_DEVIS') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Projet > 2 000 m² : Prestation sur devis uniquement. Veuillez nous contacter directement.' })
      };
    }

    // Garde anti-vide
    if (service === 'audit') {
      if (!data.devis?.lignes || !Array.isArray(data.devis.lignes) || data.devis.lignes.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Rapport d\'audit impossible : aucun poste chiffré n\'a été fourni.' })
        };
      }
    } else {
      if (!data.client_name || !data.project_location) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Données de projet incomplètes pour l\'étude d\'esquisse.' })
        };
      }
    }

    const isTestMode = (process.env.PAYTECH_ENV || 'test') === 'test';
    const hasApiKey = Boolean(process.env.PAYTECH_API_KEY && process.env.PAYTECH_API_SECRET);

    // Si action de simulation/test validé en mode test sans argent réel
    if (data.action === 'test-checkout' || (!hasApiKey && isTestMode)) {
      // Générer le jeton de téléchargement sécurisé immédiatement (mode test actif)
      const token = createDownloadToken(data, service);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: 1,
          mode: 'test',
          message: 'Paiement test PayTech validé avec succès.',
          token,
          redirect_url: `/${service === 'audit' ? 'audit-devis' : 'esquisse-faisabilite'}.html?download_token=${token}`
        })
      };
    }

    // Appel officiel PayTech.sn (test ou prod selon env)
    const refCommand = 'CS-' + Date.now();
    const payload = {
      item_name: `ChantierSur — Étude ${service === 'audit' ? 'Audit Devis' : 'Esquisse & Faisabilité'}`,
      item_price: gridPrice,
      currency: 'XOF',
      ref_command: refCommand,
      command_name: `Paiement ${service} (${surface} m²)`,
      env: process.env.PAYTECH_ENV || 'test',
      ipn_url: process.env.PAYTECH_IPN_URL || 'https://chantiersur.com/.netlify/functions/paytech-ipn',
      success_url: `https://chantiersur.com/${service === 'audit' ? 'audit-devis' : 'esquisse-faisabilite'}.html?ref=${refCommand}`,
      cancel_url: `https://chantiersur.com/${service === 'audit' ? 'audit-devis' : 'esquisse-faisabilite'}.html?payment=cancel`,
      custom_field: JSON.stringify({
        service,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        surface,
        sdp: data.sdp || 0,
        dossier: refCommand
      })
    };

    const response = await fetch('https://paytech.sn/api/payment/request-payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'API_KEY': process.env.PAYTECH_API_KEY,
        'API_SECRET': process.env.PAYTECH_API_SECRET
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};