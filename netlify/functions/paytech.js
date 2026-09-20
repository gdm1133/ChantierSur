// netlify/functions/paytech.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');

    // Récupération stricte du montant dynamique envoyé par le simulateur
    const exactPrice = parseInt(data.item_price, 10);

    const payload = {
      item_name: data.item_name || 'ChantierSur - Prestation BTP',
      item_price: exactPrice, // Ne pas mettre 15000 ici
      currency: 'XOF',
      ref_command: data.ref_command || ('CS-' + Date.now()),
      command_name: `Paiement ${data.item_name}`,
      env: process.env.PAYTECH_ENV || 'test',
      ipn_url: process.env.PAYTECH_IPN_URL || 'https://www.chantiersur.com/.netlify/functions/paytech-ipn',
      success_url: `https://www.chantiersur.com/app_privee.html?payment=success&service=${data.service || 'express'}`,
      cancel_url: 'https://www.chantiersur.com/app_privee.html?payment=cancel',
      custom_field: JSON.stringify({
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone
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
      body: JSON.stringify({ error: error.message })
    };
  }
};