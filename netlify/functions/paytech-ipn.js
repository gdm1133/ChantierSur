// CANARY-UNIQUE-20261011
// netlify/functions/paytech-ipn.js
const crypto = require('crypto');
const { createDownloadToken, recordOrderToken, getActiveDossier, getOrderToken } = require('./token-security');

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
    const refCommand = data.ref_command || customData.dossier || customData.ref_command || ('CS-' + Date.now());
    
    // Récupérer le jeton complet déjà pré-généré à la commande si disponible
    const existingOrder = getOrderToken(refCommand);
    let token = existingOrder?.token;

    if (!token) {
      const savedDossier = getActiveDossier(refCommand) || {};
      token = createDownloadToken({
        ...savedDossier,
        ...customData,
        dossier: refCommand,
        montant_paye: data.item_price
      }, service);
    }

    // Enregistrement persistant de l'association commande -> jeton pour le retour client
    recordOrderToken(refCommand, token, service);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'success',
        message: 'Paiement PayTech validé par IPN serveur',
        ref: refCommand,
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
