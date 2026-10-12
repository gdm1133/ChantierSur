// CANARY-UNIQUE-20261011
// netlify/functions/paytech.js
const { createDownloadToken, getOrderToken, saveActiveDossier } = require('./token-security');

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
  // Support GET pour verification du statut d'une commande (polling du jeton apres validation IPN)
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    if (params.action === 'check-status' && params.ref) {
      const order = getOrderToken(params.ref);
      if (order && order.token) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: 1,
            status: 'paid',
            token: order.token,
            service: order.service
          })
        };
      } else {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: 0,
            status: 'pending',
            message: 'En attente de confirmation du paiement par IPN...'
          })
        };
      }
    }
    return { statusCode: 400, body: 'Bad Request' };
  }

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
        body: JSON.stringify({ error: 'Projet > 2 000 m² : Prestation sur devis uniquement. Le paiement en ligne est désactivé.' })
      };
    }

    // Garde anti-vide
    if (service === 'audit') {
      if (!data.devis?.lignes || !Array.isArray(data.devis.lignes) || data.devis.lignes.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "Rapport d'audit impossible : aucun poste chiffré n'a été fourni." })
        };
      }
      const hasPositiveLine = data.devis.lignes.some(l => (parseFloat(l.montantIndique) > 0 || parseFloat(l.pu) > 0));
      if (!hasPositiveLine) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "Rapport d'audit impossible : toutes les lignes ont un montant nul." })
        };
      }
    } else {
      if (!data.client_name || !data.project_location) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "Données de projet incomplètes pour l'étude d'esquisse." })
        };
      }
    }

    // Gestion de l'action 'test-checkout' (B6 : INTERDITE EN PRODUCTION, sous secret de test)
    if (data.action === 'test-checkout') {
      const isProduction = (process.env.PAYTECH_ENV === 'production') || (process.env.NODE_ENV === 'production');
      if (isProduction) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "L'action test-checkout est strictement interdite en environnement de production." })
        };
      }
      const testSecret = process.env.TEST_SECRET || process.env.TOKEN_SECRET;
      if (!data.test_secret || data.test_secret !== testSecret) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "Action test-checkout non autorisée : secret de test requis." })
        };
      }
      const token = createDownloadToken(data, service);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: 1,
          mode: 'test',
          token,
          redirect_url: `/${service === 'audit' ? 'audit-devis' : 'esquisse-faisabilite'}.html?download_token=${token}`
        })
      };
    }

    // FLUX OFFICIEL CHECKOUT PAYTECH.SN (mode test ou production)
    const hasApiKey = Boolean(process.env.PAYTECH_API_KEY && process.env.PAYTECH_API_SECRET);
    if (!hasApiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "PayTech non configuré : clés d'API manquantes (PAYTECH_API_KEY, PAYTECH_API_SECRET requises)." })
      };
    }

    const refCommand = data.ref_command || ('CS-' + Date.now());

    // Sauvegarde chiffrée immédiate du dossier complet côté serveur sous la référence
    saveActiveDossier(refCommand, data, service);

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