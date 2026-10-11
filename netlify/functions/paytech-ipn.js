// CANARY-UNIQUE-20261011
// netlify/functions/paytech-ipn.js
const crypto = require('crypto');
const { createDownloadToken } = require('./token-security');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    console.log('IPN PayTech reçu :', data);

    // Validation des identifiants PayTech en production si définis
    if (process.env.PAYTECH_API_KEY && process.env.PAYTECH_API_SECRET) {
      const apiKeyHash = crypto.createHash('sha256').update(process.env.PAYTECH_API_KEY).digest('hex');
      const apiSecretHash = crypto.createHash('sha256').update(process.env.PAYTECH_API_SECRET).digest('hex');

      if (data.api_key_sha256 && data.api_key_sha256 !== apiKeyHash) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Clé API PayTech invalide' }) };
      }
      if (data.api_secret_sha256 && data.api_secret_sha256 !== apiSecretHash) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Secret API PayTech invalide' }) };
      }
    }

    let customData = {};
    if (data.custom_field) {
      try {
        customData = typeof data.custom_field === 'string' ? JSON.parse(data.custom_field) : data.custom_field;
      } catch (e) {
        console.error('Erreur parsing custom_field:', e);
      }
    }

    const service = customData.service || 'audit';
    const token = createDownloadToken({
      ...customData,
      dossier: data.ref_command || customData.dossier,
      montant_paye: data.item_price
    }, service);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'success',
        message: 'Paiement PayTech validé par IPN serveur',
        token
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
